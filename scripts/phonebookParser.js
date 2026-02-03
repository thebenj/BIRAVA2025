// phonebookParser.js
// Parses scanned phone book data into structured records
// Uses modular case-based architecture (mirrors Case31Validator pattern)

/**
 * =============================================================================
 * CONFIGURATION
 * =============================================================================
 */
const PHONEBOOK_PARSER_CONFIG = {
    // Lines to skip (case-insensitive patterns)
    skipPatterns: [
        /^See ad/i,
        /^See page/i,
        /^[A-Z]$/,                    // Single letter section headers
        /^Shades.*Blinds/i,           // Advertisement fragments
        /^ISLAND SHADING/i,
        /^\d+[A-Z]$/,                 // Page numbers like "110W"
        /^- /,                        // Department listings starting with dash
        /^NEW SHOREHAM, TOWN OF$/i,
        /^UNITED STATES GOVERNMENT$/i,
        /^ORSTED U\.?S\.? OFFSHORE/i,
    ],

    // Phone number patterns (order matters - most specific first)
    phonePatterns: [
        /^(\d{3}-\d{3}-\d{4})/,       // Area code + number (XXX-XXX-XXXX)
        /^(\d{3}-\d{4})/,             // Local number (XXX-XXXX)
        /^(800-\d{3}-\d{4})/,         // Toll-free
        /^(0-\d{3}-\d{4})/,           // Operator-assisted
    ],

    // Street type normalization map (abbreviation → full form)
    // Used to normalize phonebook abbreviations before matching against BI street database
    streetTypeNormalization: {
        'RD.': 'ROAD', 'RD': 'ROAD',
        'TRL': 'TRAIL', 'TR': 'TRAIL',
        'AVE.': 'AVENUE', 'AVE': 'AVENUE', 'AV': 'AVENUE',
        'ST.': 'STREET', 'ST': 'STREET',
        'DR.': 'DRIVE', 'DR': 'DRIVE',
        'LN.': 'LANE', 'LN': 'LANE',
        'PT.': 'POINT', 'PT': 'POINT',
        'HWY': 'HIGHWAY'
    },

    // Off-island location indicators
    offIslandLocations: [
        'Wakefield', 'Westerly', 'Narragansett', 'Kingston', 'Exeter',
        'Pawtucket', 'Providence', 'Mystic', 'Conn.', 'Connecticut',
        'Jamestown', 'Wickford', 'Galilee', 'Pt. Judith', 'Point Judith',
        'Chepachet', 'Richmond', 'Saunderstown', 'New London', 'West Warwick',
        'West Kingston', 'Charlestown', 'Ridgefield', 'CT'
    ]
};

/**
 * =============================================================================
 * BLOCK ISLAND STREET DATABASE INTEGRATION
 * =============================================================================
 */

/**
 * Ensures Block Island street database is loaded
 * Uses Google Drive (same as addressProcessing.js) if not already loaded
 * @returns {Promise<Set>} Set of Block Island street names in uppercase
 */
async function ensurePhonebookStreetsLoaded() {
    // If already loaded by main application, use it
    if (window.blockIslandStreets && window.blockIslandStreets.size > 0) {
        console.log(`Using existing street database: ${window.blockIslandStreets.size} streets`);
        return window.blockIslandStreets;
    }

    // Try to load from Google Drive (same method as addressProcessing.js)
    try {
        const response = await gapi.client.drive.files.get({
            fileId: '1lsrd0alv9O01M_qlsiym3cB0TRIdgXI9',
            alt: 'media'
        });

        const content = response.body;
        const streets = JSON.parse(content);
        window.blockIslandStreets = new Set(streets.map(s => s.toUpperCase().trim()));
        console.log(`Loaded ${streets.length} Block Island streets from Google Drive`);
        return window.blockIslandStreets;
    } catch (error) {
        console.warn('Could not load Block Island streets database:', error.message);
        console.warn('Street validation will be skipped.');
        return null;
    }
}

/**
 * Normalizes a street string for comparison with the database
 * @param {string} streetStr - The street string to normalize
 * @returns {string} - Normalized uppercase street string
 */
function normalizeStreetForMatching(streetStr) {
    if (!streetStr) return '';

    let normalized = streetStr.toUpperCase().trim();
    normalized = normalized.replace(/\s+/g, ' ');

    for (const [abbrev, full] of Object.entries(PHONEBOOK_PARSER_CONFIG.streetTypeNormalization)) {
        const regex = new RegExp(`\\b${abbrev.replace('.', '\\.')}\\b`, 'g');
        normalized = normalized.replace(regex, full);
    }

    normalized = normalized.replace(/\.$/, '');
    return normalized;
}

/**
 * Finds the best matching Block Island street name
 * @param {string} streetStr - The street string from phone book
 * @returns {object} - { matched: boolean, canonicalName: string|null, confidence: 'exact'|'partial'|null }
 */
function findBIStreetMatch(streetStr) {
    if (!window.blockIslandStreets || window.blockIslandStreets.size === 0) {
        return { matched: false, canonicalName: null, confidence: null };
    }

    if (!streetStr) {
        return { matched: false, canonicalName: null, confidence: null };
    }

    const normalized = normalizeStreetForMatching(streetStr);
    const streetsArray = Array.from(window.blockIslandStreets);

    // Try exact match first
    for (const biStreet of streetsArray) {
        const biNormalized = normalizeStreetForMatching(biStreet);
        if (normalized === biNormalized) {
            return { matched: true, canonicalName: biStreet.trim(), confidence: 'exact' };
        }
    }

    // Try partial match - normalized contains a BI street name (longest match wins)
    let bestMatch = null;
    let bestLength = 0;

    for (const biStreet of streetsArray) {
        const biNormalized = normalizeStreetForMatching(biStreet);
        if (normalized.includes(biNormalized) && biNormalized.length > bestLength) {
            bestMatch = biStreet.trim();
            bestLength = biNormalized.length;
        }
    }

    if (bestMatch) {
        return { matched: true, canonicalName: bestMatch, confidence: 'partial' };
    }

    // Try reverse - BI street name contains our normalized string
    for (const biStreet of streetsArray) {
        const biNormalized = normalizeStreetForMatching(biStreet);
        if (normalized.length >= 5 && biNormalized.includes(normalized)) {
            return { matched: true, canonicalName: biStreet.trim(), confidence: 'partial' };
        }
    }

    return { matched: false, canonicalName: null, confidence: null };
}

/**
 * =============================================================================
 * PHONEBOOK LINE CLASSIFIER - MODULAR CASE ARCHITECTURE
 * =============================================================================
 * Mirrors the Case31Validator architecture:
 * - Reusable helper functions for analysis
 * - Pre-computed analysis data passed to all logicalTests
 * - Case definitions as data objects with priority, logicalTest, processor
 * - Engine iterates by priority, first match wins
 */

const PhonebookLineClassifier = {

    // =========================================================================
    // REUSABLE HELPER FUNCTIONS
    // =========================================================================

    /**
     * Extracts phone number from beginning of line
     */
    extractPhone(line) {
        const trimmed = line.trim();
        for (const pattern of PHONEBOOK_PARSER_CONFIG.phonePatterns) {
            const match = trimmed.match(pattern);
            if (match) {
                return {
                    phone: match[1],
                    afterPhone: trimmed.substring(match[0].length).trim()
                };
            }
        }
        return { phone: null, afterPhone: trimmed };
    },

    /**
     * Analyzes separator presence and position
     */
    analyzeSeparators(text) {
        const separators = [
            { pattern: ' – ', type: 'enDash' },
            { pattern: ' -- ', type: 'doubleDashSpaced' },
            { pattern: '--', type: 'doubleDash' },
            { pattern: ' - ', type: 'hyphen' }
        ];

        for (const sep of separators) {
            const index = text.indexOf(sep.pattern);
            if (index !== -1) {
                return {
                    found: true,
                    type: sep.type,
                    index: index,
                    before: text.substring(0, index),
                    after: text.substring(index + sep.pattern.length)
                };
            }
        }
        return { found: false, type: null, index: -1, before: text, after: '' };
    },

    /**
     * Extracts Box/PO Box pattern from text
     */
    extractBox(text) {
        const patterns = [
            /,?\s*P\.?O\.?\s*Box\s+([A-Z0-9-]+)/i,
            /,?\s*Box\s+([A-Z0-9-]+)/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return {
                    found: true,
                    box: match[1],
                    remaining: text.replace(match[0], '').trim()
                };
            }
        }
        return { found: false, box: null, remaining: text };
    },

    /**
     * Checks if text matches skip patterns
     */
    isSkipPattern(line) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.length === 0) return true;
        if (trimmed.length < 10) return true;
        return PHONEBOOK_PARSER_CONFIG.skipPatterns.some(p => p.test(trimmed));
    },

    /**
     * Checks if text indicates off-island location
     */
    isOffIslandLocation(text) {
        if (!text) return false;
        const upper = text.toUpperCase();
        return PHONEBOOK_PARSER_CONFIG.offIslandLocations.some(
            loc => upper.includes(loc.toUpperCase())
        );
    },

    /**
     * Removes "See ad, pg. XX" suffixes
     */
    removeSeeAdSuffix(text) {
        return text.replace(/\s*See ad.*$/i, '').trim();
    },

    /**
     * Cleans trailing punctuation from name string
     */
    cleanNameString(text) {
        if (!text) return '';
        return text.replace(/[,.\s]+$/, '').trim();
    },

    /**
     * Scans text for street database match (for lines without separator)
     * Returns position info to split name from address
     */
    scanForStreetInText(text) {
        if (!window.blockIslandStreets || !text) {
            return { found: false };
        }

        const normalizedText = normalizeStreetForMatching(text);

        // Sort streets by length descending to find longest match first
        const streetsArray = Array.from(window.blockIslandStreets)
            .sort((a, b) => b.length - a.length);

        for (const street of streetsArray) {
            const normalizedStreet = normalizeStreetForMatching(street);
            const index = normalizedText.indexOf(normalizedStreet);

            if (index !== -1) {
                // Find comma before street to get name boundary
                const textBeforeMatch = text.substring(0, index);
                const lastComma = textBeforeMatch.lastIndexOf(',');

                if (lastComma !== -1) {
                    const afterStreetStart = index + normalizedStreet.length;
                    // Map back to original text position (approximate)
                    return {
                        found: true,
                        beforeStreet: text.substring(0, lastComma),
                        street: text.substring(lastComma + 1, afterStreetStart).trim(),
                        canonicalName: street,
                        afterStreet: text.substring(afterStreetStart)
                    };
                }
            }
        }

        return { found: false };
    },

    // =========================================================================
    // PRE-COMPUTED ANALYSIS (passed to all logicalTests)
    // =========================================================================

    analyzeLineComponents(line) {
        const trimmed = line.trim();
        const phoneResult = this.extractPhone(trimmed);
        const afterPhone = phoneResult.afterPhone;
        const separatorResult = this.analyzeSeparators(afterPhone);

        // Analyze what's after separator
        let afterSeparator = this.removeSeeAdSuffix(separatorResult.after);
        const boxResultAfterSep = this.extractBox(afterSeparator);
        const afterBox = boxResultAfterSep.remaining;
        const streetResult = findBIStreetMatch(afterBox);

        // Also check for box in afterPhone (for no-separator cases)
        const boxResultAfterPhone = this.extractBox(afterPhone);

        // Check for street match in afterPhone (for no-separator cases)
        const streetScanResult = this.scanForStreetInText(afterPhone);

        return {
            // Raw line
            rawLine: line,
            trimmedLine: trimmed,

            // Phone analysis
            hasPhone: phoneResult.phone !== null,
            phone: phoneResult.phone,
            afterPhone: afterPhone,

            // Separator analysis
            hasSeparator: separatorResult.found,
            separatorType: separatorResult.type,
            beforeSeparator: separatorResult.before,
            afterSeparator: afterSeparator,

            // Box analysis (after separator)
            hasBoxAfterSep: boxResultAfterSep.found,
            boxAfterSep: boxResultAfterSep.box,
            afterBox: afterBox,

            // Box analysis (in afterPhone, for no-separator cases)
            hasBoxInAfterPhone: boxResultAfterPhone.found,
            boxInAfterPhone: boxResultAfterPhone.box,
            afterPhoneMinusBox: boxResultAfterPhone.remaining,

            // Street analysis (after separator)
            hasStreetMatch: streetResult.matched,
            streetCanonical: streetResult.canonicalName,
            streetConfidence: streetResult.confidence,

            // Street scan (for no-separator cases)
            hasStreetScan: streetScanResult.found,
            streetScanResult: streetScanResult,

            // Pattern flags
            isSkipLine: this.isSkipPattern(trimmed),
            isOffIsland: this.isOffIslandLocation(afterSeparator)
        };
    },

    // =========================================================================
    // LINE TYPE CASE DEFINITIONS (modular, priority-ordered)
    // =========================================================================

    lineTypeDefinitions: {

        // Priority 0: Skip lines (ads, section headers, page numbers)
        LineType0_Skip: {
            priority: 0,
            description: 'Skip line - ad reference, section header, or page number',
            logicalTest: function(data) {
                return data.isSkipLine;
            },
            processor: function(data) {
                return {
                    lineType: 'LineType0_Skip',
                    skip: true,
                    reason: 'skip_pattern',
                    rawLine: data.rawLine
                };
            }
        },

        // Priority 1: Phone + en-dash + Street + Box
        LineType1_PhoneEnDashStreetBox: {
            priority: 1,
            description: 'Phone + en-dash separator + validated street + box',
            logicalTest: function(data) {
                return data.hasPhone &&
                       data.hasSeparator &&
                       data.separatorType === 'enDash' &&
                       data.hasStreetMatch &&
                       data.hasBoxAfterSep &&
                       !data.isOffIsland;
            },
            processor: function(data) {
                return {
                    lineType: 'LineType1_PhoneEnDashStreetBox',
                    skip: false,
                    phone: data.phone,
                    nameString: PhonebookLineClassifier.cleanNameString(data.beforeSeparator),
                    street: data.afterBox,
                    streetNormalized: data.streetCanonical,
                    streetConfidence: data.streetConfidence,
                    isValidBIStreet: true,
                    box: data.boxAfterSep,
                    isOffIsland: false,
                    rawLine: data.rawLine
                };
            }
        },

        // Priority 2: Phone + en-dash + Street (no box)
        LineType2_PhoneEnDashStreet: {
            priority: 2,
            description: 'Phone + en-dash separator + validated street (no box)',
            logicalTest: function(data) {
                return data.hasPhone &&
                       data.hasSeparator &&
                       data.separatorType === 'enDash' &&
                       data.hasStreetMatch &&
                       !data.hasBoxAfterSep &&
                       !data.isOffIsland;
            },
            processor: function(data) {
                return {
                    lineType: 'LineType2_PhoneEnDashStreet',
                    skip: false,
                    phone: data.phone,
                    nameString: PhonebookLineClassifier.cleanNameString(data.beforeSeparator),
                    street: data.afterSeparator,
                    streetNormalized: data.streetCanonical,
                    streetConfidence: data.streetConfidence,
                    isValidBIStreet: true,
                    box: null,
                    isOffIsland: false,
                    rawLine: data.rawLine
                };
            }
        },

        // Priority 3: Phone + en-dash + Off-island location
        LineType3_PhoneEnDashOffIsland: {
            priority: 3,
            description: 'Phone + en-dash separator + off-island location',
            logicalTest: function(data) {
                return data.hasPhone &&
                       data.hasSeparator &&
                       data.separatorType === 'enDash' &&
                       data.isOffIsland;
            },
            processor: function(data) {
                return {
                    lineType: 'LineType3_PhoneEnDashOffIsland',
                    skip: false,
                    phone: data.phone,
                    nameString: PhonebookLineClassifier.cleanNameString(data.beforeSeparator),
                    street: null,
                    streetNormalized: null,
                    streetConfidence: null,
                    isValidBIStreet: false,
                    box: data.boxAfterSep,
                    town: data.afterBox || data.afterSeparator,
                    isOffIsland: true,
                    rawLine: data.rawLine
                };
            }
        },

        // Priority 4: Phone + en-dash + Unvalidated street
        LineType4_PhoneEnDashUnvalidated: {
            priority: 4,
            description: 'Phone + en-dash separator + unvalidated street',
            logicalTest: function(data) {
                return data.hasPhone &&
                       data.hasSeparator &&
                       data.separatorType === 'enDash' &&
                       !data.hasStreetMatch &&
                       !data.isOffIsland;
            },
            processor: function(data) {
                return {
                    lineType: 'LineType4_PhoneEnDashUnvalidated',
                    skip: false,
                    phone: data.phone,
                    nameString: PhonebookLineClassifier.cleanNameString(data.beforeSeparator),
                    street: data.afterBox || data.afterSeparator,
                    streetNormalized: null,
                    streetConfidence: null,
                    isValidBIStreet: false,
                    box: data.boxAfterSep,
                    isOffIsland: false,
                    rawLine: data.rawLine
                };
            }
        },

        // Priority 5: Phone + hyphen + Street + Box
        LineType5_PhoneHyphenStreetBox: {
            priority: 5,
            description: 'Phone + hyphen separator + validated street + box',
            logicalTest: function(data) {
                return data.hasPhone &&
                       data.hasSeparator &&
                       data.separatorType === 'hyphen' &&
                       data.hasStreetMatch &&
                       data.hasBoxAfterSep &&
                       !data.isOffIsland;
            },
            processor: function(data) {
                return {
                    lineType: 'LineType5_PhoneHyphenStreetBox',
                    skip: false,
                    phone: data.phone,
                    nameString: PhonebookLineClassifier.cleanNameString(data.beforeSeparator),
                    street: data.afterBox,
                    streetNormalized: data.streetCanonical,
                    streetConfidence: data.streetConfidence,
                    isValidBIStreet: true,
                    box: data.boxAfterSep,
                    isOffIsland: false,
                    rawLine: data.rawLine
                };
            }
        },

        // Priority 6: Phone + hyphen + Street (no box)
        LineType6_PhoneHyphenStreet: {
            priority: 6,
            description: 'Phone + hyphen separator + validated street (no box)',
            logicalTest: function(data) {
                return data.hasPhone &&
                       data.hasSeparator &&
                       data.separatorType === 'hyphen' &&
                       data.hasStreetMatch &&
                       !data.hasBoxAfterSep &&
                       !data.isOffIsland;
            },
            processor: function(data) {
                return {
                    lineType: 'LineType6_PhoneHyphenStreet',
                    skip: false,
                    phone: data.phone,
                    nameString: PhonebookLineClassifier.cleanNameString(data.beforeSeparator),
                    street: data.afterSeparator,
                    streetNormalized: data.streetCanonical,
                    streetConfidence: data.streetConfidence,
                    isValidBIStreet: true,
                    box: null,
                    isOffIsland: false,
                    rawLine: data.rawLine
                };
            }
        },

        // Priority 7: Phone + hyphen + Off-island or unvalidated
        LineType7_PhoneHyphenOther: {
            priority: 7,
            description: 'Phone + hyphen separator + off-island or unvalidated',
            logicalTest: function(data) {
                return data.hasPhone &&
                       data.hasSeparator &&
                       data.separatorType === 'hyphen' &&
                       (!data.hasStreetMatch || data.isOffIsland);
            },
            processor: function(data) {
                return {
                    lineType: 'LineType7_PhoneHyphenOther',
                    skip: false,
                    phone: data.phone,
                    nameString: PhonebookLineClassifier.cleanNameString(data.beforeSeparator),
                    street: data.isOffIsland ? null : (data.afterBox || data.afterSeparator),
                    streetNormalized: null,
                    streetConfidence: null,
                    isValidBIStreet: false,
                    box: data.boxAfterSep,
                    town: data.isOffIsland ? (data.afterBox || data.afterSeparator) : null,
                    isOffIsland: data.isOffIsland,
                    rawLine: data.rawLine
                };
            }
        },

        // Priority 8: Phone + double-dash + location
        LineType8_PhoneDoubleDash: {
            priority: 8,
            description: 'Phone + double-dash separator + location',
            logicalTest: function(data) {
                return data.hasPhone &&
                       data.hasSeparator &&
                       (data.separatorType === 'doubleDash' || data.separatorType === 'doubleDashSpaced');
            },
            processor: function(data) {
                return {
                    lineType: 'LineType8_PhoneDoubleDash',
                    skip: false,
                    phone: data.phone,
                    nameString: PhonebookLineClassifier.cleanNameString(data.beforeSeparator),
                    street: data.hasStreetMatch ? (data.afterBox || data.afterSeparator) : null,
                    streetNormalized: data.streetCanonical,
                    streetConfidence: data.streetConfidence,
                    isValidBIStreet: data.hasStreetMatch,
                    box: data.boxAfterSep,
                    isOffIsland: data.isOffIsland,
                    rawLine: data.rawLine
                };
            }
        },

        // Priority 9: Phone + Box only (no separator, no street)
        LineType9_PhoneBoxOnly: {
            priority: 9,
            description: 'Phone + box only (no separator, box pattern detected in afterPhone)',
            logicalTest: function(data) {
                return data.hasPhone &&
                       !data.hasSeparator &&
                       data.hasBoxInAfterPhone &&
                       !data.hasStreetScan;
            },
            processor: function(data) {
                return {
                    lineType: 'LineType9_PhoneBoxOnly',
                    skip: false,
                    phone: data.phone,
                    nameString: PhonebookLineClassifier.cleanNameString(data.afterPhoneMinusBox),
                    street: null,
                    streetNormalized: null,
                    streetConfidence: null,
                    isValidBIStreet: false,
                    box: data.boxInAfterPhone,
                    isOffIsland: false,
                    rawLine: data.rawLine
                };
            }
        },

        // Priority 10: Phone + Name + Street (no separator, street database match)
        LineType10_PhoneNameStreetNoSep: {
            priority: 10,
            description: 'Phone + name + street (no separator, found via street database scan)',
            logicalTest: function(data) {
                return data.hasPhone &&
                       !data.hasSeparator &&
                       data.hasStreetScan;
            },
            processor: function(data) {
                const scan = data.streetScanResult;
                const boxResult = PhonebookLineClassifier.extractBox(scan.afterStreet || '');
                return {
                    lineType: 'LineType10_PhoneNameStreetNoSep',
                    skip: false,
                    phone: data.phone,
                    nameString: PhonebookLineClassifier.cleanNameString(scan.beforeStreet),
                    street: scan.street,
                    streetNormalized: scan.canonicalName,
                    streetConfidence: 'partial',
                    isValidBIStreet: true,
                    box: boxResult.box,
                    isOffIsland: false,
                    rawLine: data.rawLine
                };
            }
        },

        // Priority 11: Phone + Name only (no location info)
        LineType11_PhoneNameOnly: {
            priority: 11,
            description: 'Phone + name only (no location information found)',
            logicalTest: function(data) {
                return data.hasPhone &&
                       !data.hasSeparator &&
                       !data.hasBoxInAfterPhone &&
                       !data.hasStreetScan;
            },
            processor: function(data) {
                return {
                    lineType: 'LineType11_PhoneNameOnly',
                    skip: false,
                    phone: data.phone,
                    nameString: PhonebookLineClassifier.cleanNameString(data.afterPhone),
                    street: null,
                    streetNormalized: null,
                    streetConfidence: null,
                    isValidBIStreet: false,
                    box: null,
                    isOffIsland: false,
                    rawLine: data.rawLine
                };
            }
        },

        // Priority 12: No phone + separator + location
        LineType12_NoPhoneWithSeparator: {
            priority: 12,
            description: 'No phone + separator + location',
            logicalTest: function(data) {
                return !data.hasPhone &&
                       data.hasSeparator;
            },
            processor: function(data) {
                return {
                    lineType: 'LineType12_NoPhoneWithSeparator',
                    skip: false,
                    phone: null,
                    nameString: PhonebookLineClassifier.cleanNameString(data.beforeSeparator),
                    street: data.hasStreetMatch ? (data.afterBox || data.afterSeparator) : null,
                    streetNormalized: data.streetCanonical,
                    streetConfidence: data.streetConfidence,
                    isValidBIStreet: data.hasStreetMatch,
                    box: data.boxAfterSep,
                    isOffIsland: data.isOffIsland,
                    rawLine: data.rawLine
                };
            }
        },

        // Priority 13: No phone + street database match (no separator)
        LineType13_NoPhoneStreetMatch: {
            priority: 13,
            description: 'No phone + street found via database scan (no separator)',
            logicalTest: function(data) {
                return !data.hasPhone &&
                       !data.hasSeparator &&
                       data.hasStreetScan;
            },
            processor: function(data) {
                const scan = data.streetScanResult;
                const boxResult = PhonebookLineClassifier.extractBox(scan.afterStreet || '');
                return {
                    lineType: 'LineType13_NoPhoneStreetMatch',
                    skip: false,
                    phone: null,
                    nameString: PhonebookLineClassifier.cleanNameString(scan.beforeStreet),
                    street: scan.street,
                    streetNormalized: scan.canonicalName,
                    streetConfidence: 'partial',
                    isValidBIStreet: true,
                    box: boxResult.box,
                    isOffIsland: false,
                    rawLine: data.rawLine
                };
            }
        },

        // Priority 99: Catch-all - unmatched line
        LineType99_Unmatched: {
            priority: 99,
            description: 'Catch-all for unmatched lines',
            logicalTest: function(data) {
                return true;
            },
            processor: function(data) {
                return {
                    lineType: 'LineType99_Unmatched',
                    skip: false,
                    phone: data.phone,
                    nameString: data.hasPhone ? data.afterPhone : data.trimmedLine,
                    street: null,
                    streetNormalized: null,
                    streetConfidence: null,
                    isValidBIStreet: false,
                    box: null,
                    isOffIsland: false,
                    rawLine: data.rawLine,
                    matchFailure: true
                };
            }
        }
    },

    // =========================================================================
    // CLASSIFICATION ENGINE (iterate by priority, first match wins)
    // =========================================================================

    classifyLine(line) {
        // Step 1: Pre-compute analysis data
        const data = this.analyzeLineComponents(line);

        // Step 2: Sort cases by priority
        const sortedCases = Object.entries(this.lineTypeDefinitions)
            .sort((a, b) => a[1].priority - b[1].priority);

        // Step 3: Find first matching case
        for (const [caseName, caseConfig] of sortedCases) {
            if (caseConfig.logicalTest(data)) {
                return caseConfig.processor.call(this, data);
            }
        }

        // Should never reach here due to catch-all
        return {
            lineType: 'ERROR_NO_MATCH',
            skip: false,
            rawLine: line,
            error: 'No case matched'
        };
    }
};

/**
 * =============================================================================
 * PHASE 2: NAME PARSING INTEGRATION WITH CASE31VALIDATOR
 * =============================================================================
 * After line classification extracts nameString ("what's left"),
 * pass to Case31Validator for name component extraction.
 */

/**
 * Parses a name string using Case31Validator and VisionAppraisalNameParser
 * @param {string} nameString - The "what's left" name portion
 * @returns {object} - Parsed name components
 */
function parsePhonebookNameWithCase31(nameString) {
    const result = {
        raw: nameString,
        caseType: null,
        lastName: null,
        firstName: null,
        secondName: null,
        otherNames: null,
        isBusiness: false,
        isCouple: false,
        entityType: null,
        parseError: null
    };

    if (!nameString || !nameString.trim()) {
        result.parseError = 'Empty name string';
        return result;
    }

    // Check if Case31Validator is available
    if (typeof Case31Validator === 'undefined') {
        // PRESERVED CODE - commented out as cautious step during recursion fix investigation
        // Previously fell back to simple parsing if Case31Validator not loaded:
        // return parseNameSimple(nameString);
        throw new Error('parsePhonebookNameWithCase31: Case31Validator is not defined - this dependency must be loaded');
    }

    try {
        // Use Case31Validator to detect case type
        const caseType = Case31Validator.detectCase(nameString);
        result.caseType = caseType;

        // Check if VisionAppraisalNameParser is available
        if (typeof VisionAppraisalNameParser === 'undefined' ||
            !VisionAppraisalNameParser.caseDefinitions ||
            !VisionAppraisalNameParser.caseDefinitions[caseType]) {
            // PRESERVED CODE - commented out as cautious step during recursion fix investigation
            // Previously fell back to simple parsing with case type info:
            // const simple = parseNameSimple(nameString);
            // simple.caseType = caseType;
            // return simple;
            throw new Error(`parsePhonebookNameWithCase31: VisionAppraisalNameParser missing or no case definition for case type "${caseType}"`);
        }

        // Build mock record for processor
        const mockRecord = {
            ownerName: nameString,
            processedOwnerName: nameString,
            pid: 'PHONEBOOK',
            propertyLocation: null,
            ownerAddress: null,
            mblu: null,
            fireNumber: null
        };

        // Get case definition and run processor
        const caseDefinition = VisionAppraisalNameParser.caseDefinitions[caseType];
        const words = Case31Validator.parseWords(nameString.trim().toUpperCase());
        const entity = caseDefinition.processor.call(VisionAppraisalNameParser, words, mockRecord, 0);

        // Extract name components from entity
        return extractNameComponentsFromEntity(entity, caseType, nameString);

    } catch (error) {
        // PRESERVED CODE - commented out as cautious step during recursion fix investigation
        // Previously fell back to simple parsing on error:
        // result.parseError = error.message;
        // const simple = parseNameSimple(nameString);
        // simple.parseError = error.message;
        // return simple;
        throw new Error(`parsePhonebookNameWithCase31: Error processing "${nameString}": ${error.message}`);
    }
}

/**
 * Get name components directly from Case31 system WITHOUT creating entities.
 * This function calls the case processor with returnComponentsOnly=true to get
 * parsed name components without triggering entity creation (avoiding recursion).
 *
 * @param {string} nameString - The name string to parse
 * @returns {Object|null} Object with {firstName, lastName, otherNames, fullName} or null if case doesn't support component return
 */
function getNameComponentsFromCase31(nameString) {
    if (!nameString || !nameString.trim()) {
        return null;
    }

    // Check dependencies
    if (typeof Case31Validator === 'undefined') {
        throw new Error('getNameComponentsFromCase31: Case31Validator is not defined');
    }
    if (typeof VisionAppraisalNameParser === 'undefined' || !VisionAppraisalNameParser.caseDefinitions) {
        throw new Error('getNameComponentsFromCase31: VisionAppraisalNameParser is not defined');
    }

    try {
        // Detect case type
        const caseType = Case31Validator.detectCase(nameString);
        const caseDefinition = VisionAppraisalNameParser.caseDefinitions[caseType];

        if (!caseDefinition || typeof caseDefinition.processor !== 'function') {
            return null; // No case definition found
        }

        // Parse words and call processor with returnComponentsOnly=true
        const words = Case31Validator.parseWords(nameString.trim().toUpperCase());
        const result = caseDefinition.processor.call(VisionAppraisalNameParser, words, null, 0, true);

        // result will be {firstName, lastName, otherNames, fullName} for Individual cases, or null for others
        return result;

    } catch (error) {
        console.warn(`getNameComponentsFromCase31: Error parsing "${nameString}": ${error.message}`);
        return null;
    }
}

/**
 * Extracts name components from a VisionAppraisalNameParser entity
 */
function extractNameComponentsFromEntity(entity, caseType, rawName) {
    const result = {
        raw: rawName,
        caseType: caseType,
        lastName: null,
        firstName: null,
        secondName: null,
        otherNames: null,
        isBusiness: false,
        isCouple: false,
        entityType: null,
        parseError: null
    };

    if (!entity) {
        result.parseError = 'No entity returned';
        return result;
    }

    result.entityType = entity.constructor.name;

    if (result.entityType === 'Individual') {
        const name = entity.name;
        if (name && name.constructor.name === 'IndividualName') {
            result.lastName = name.lastName || null;
            result.firstName = name.firstName || null;
            result.otherNames = name.otherNames || null;
        }
    } else if (result.entityType === 'AggregateHousehold') {
        result.isCouple = true;
        if (entity.individuals && entity.individuals.length > 0) {
            const first = entity.individuals[0];
            result.lastName = first?.name?.lastName || null;
            result.firstName = first?.name?.firstName || null;

            if (entity.individuals.length > 1) {
                result.secondName = entity.individuals[1]?.name?.firstName || null;
            }
        }
        // Fallback to household name if no individuals parsed
        if (!result.lastName && entity.name) {
            result.lastName = entity.name.primaryAlias?.term || rawName;
        }
    } else if (result.entityType === 'Business' || result.entityType === 'LegalConstruct') {
        result.isBusiness = true;
        result.lastName = entity.name?.primaryAlias?.term || rawName;
    } else {
        // Unknown entity type - use raw name
        result.lastName = rawName;
    }

    return result;
}

/**
 * Simple name parsing fallback (when Case31Validator not available)
 */
function parseNameSimple(nameStr) {
    const result = {
        raw: nameStr,
        caseType: 'simple_fallback',
        lastName: null,
        firstName: null,
        secondName: null,
        otherNames: null,
        isBusiness: false,
        isCouple: false,
        entityType: null,
        parseError: null
    };

    if (!nameStr) return result;

    const commaIndex = nameStr.indexOf(',');

    if (commaIndex === -1) {
        // No comma - likely a business or single-word name
        result.isBusiness = true;
        result.lastName = nameStr.trim();
        return result;
    }

    // Split on first comma
    result.lastName = nameStr.substring(0, commaIndex).trim();
    const firstPart = nameStr.substring(commaIndex + 1).trim();

    // Check for couple indicator (&)
    const ampIndex = firstPart.indexOf('&');
    if (ampIndex > 0) {
        result.isCouple = true;
        result.firstName = firstPart.substring(0, ampIndex).trim();
        result.secondName = firstPart.substring(ampIndex + 1).trim();
    } else {
        result.firstName = firstPart;
    }

    return result;
}

/**
 * =============================================================================
 * MAIN PARSING FUNCTIONS
 * =============================================================================
 */

/**
 * Parses a single phone book line into a structured record
 * Uses the modular PhonebookLineClassifier architecture
 */
function parsePhonebookLine(line, lineNumber = 0) {
    // Phase 1: Line classification and component extraction
    const lineResult = PhonebookLineClassifier.classifyLine(line);

    if (lineResult.skip) {
        return null;
    }

    // Phase 2: Name parsing using Case31Validator (or fallback)
    const nameResult = parsePhonebookNameWithCase31(lineResult.nameString);

    // Combine results
    return {
        lineNumber: lineNumber,
        lineType: lineResult.lineType,
        phone: lineResult.phone,

        // Name components
        name: {
            raw: nameResult.raw,
            lastName: nameResult.lastName,
            firstName: nameResult.firstName,
            secondName: nameResult.secondName,
            otherNames: nameResult.otherNames,
            isBusiness: nameResult.isBusiness,
            isCouple: nameResult.isCouple,
            caseType: nameResult.caseType,
            entityType: nameResult.entityType
        },

        // Address components
        address: {
            raw: lineResult.street || lineResult.town || null,
            street: lineResult.street,
            streetNormalized: lineResult.streetNormalized,
            streetMatchConfidence: lineResult.streetConfidence,
            isValidBIStreet: lineResult.isValidBIStreet,
            box: lineResult.box,
            town: lineResult.town || null,
            isOffIsland: lineResult.isOffIsland
        },

        rawLine: lineResult.rawLine
    };
}

/**
 * Parses an entire phone book text into structured records
 */
function parsePhonebook(text) {
    const lines = text.split('\n');
    const records = [];
    const skipped = [];

    const stats = {
        totalLines: lines.length,
        parsedRecords: 0,
        skippedLines: 0,
        noPhone: 0,
        withPhone: 0,
        couples: 0,
        businesses: 0,
        offIsland: 0,
        withBox: 0,
        // Street database stats
        validBIStreet: 0,
        exactStreetMatch: 0,
        partialStreetMatch: 0,
        unvalidatedStreet: 0,
        streetDbAvailable: window.blockIslandStreets ? window.blockIslandStreets.size : 0,
        // Line type distribution
        lineTypeCounts: {}
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Progress logging every 50 lines
        if (i % 50 === 0) {
            console.log(`Processing line ${i + 1} of ${lines.length}...`);
        }

        const record = parsePhonebookLine(line, i + 1);

        if (record) {
            records.push(record);
            stats.parsedRecords++;

            // Track line type distribution
            const lt = record.lineType;
            stats.lineTypeCounts[lt] = (stats.lineTypeCounts[lt] || 0) + 1;

            if (record.phone) stats.withPhone++;
            else stats.noPhone++;

            if (record.name.isCouple) stats.couples++;
            if (record.name.isBusiness) stats.businesses++;
            if (record.address.isOffIsland) stats.offIsland++;
            if (record.address.box) stats.withBox++;

            // Track street validation stats
            if (record.address.isValidBIStreet) {
                stats.validBIStreet++;
                if (record.address.streetMatchConfidence === 'exact') {
                    stats.exactStreetMatch++;
                } else if (record.address.streetMatchConfidence === 'partial') {
                    stats.partialStreetMatch++;
                }
            } else if (record.address.street && !record.address.isOffIsland) {
                stats.unvalidatedStreet++;
            }
        } else {
            skipped.push({ lineNumber: i + 1, line: line });
            stats.skippedLines++;
        }
    }

    return { records, skipped, stats };
}

/**
 * =============================================================================
 * CSV EXPORT
 * =============================================================================
 */

function phonebookToCSV(records) {
    const headers = [
        'LineNum', 'RawLine', 'LineType',
        'Phone', 'LastName', 'FirstName', 'SecondName',
        'IsBusiness', 'IsCouple', 'NameCaseType', 'EntityType',
        'Street', 'StreetNormalized', 'IsValidBIStreet', 'StreetMatchConfidence',
        'Box', 'Town', 'IsOffIsland'
    ];

    const rows = [headers.join(',')];

    for (const record of records) {
        const row = [
            record.lineNumber,
            csvEscapePhonebook(record.rawLine || ''),
            csvEscapePhonebook(record.lineType || ''),
            csvEscapePhonebook(record.phone || ''),
            csvEscapePhonebook(record.name.lastName || ''),
            csvEscapePhonebook(record.name.firstName || ''),
            csvEscapePhonebook(record.name.secondName || ''),
            record.name.isBusiness ? 'TRUE' : 'FALSE',
            record.name.isCouple ? 'TRUE' : 'FALSE',
            csvEscapePhonebook(record.name.caseType || ''),
            csvEscapePhonebook(record.name.entityType || ''),
            csvEscapePhonebook(record.address.street || ''),
            csvEscapePhonebook(record.address.streetNormalized || ''),
            record.address.isValidBIStreet ? 'TRUE' : 'FALSE',
            csvEscapePhonebook(record.address.streetMatchConfidence || ''),
            csvEscapePhonebook(record.address.box || ''),
            csvEscapePhonebook(record.address.town || ''),
            record.address.isOffIsland ? 'TRUE' : 'FALSE'
        ];
        rows.push(row.join(','));
    }

    return rows.join('\n');
}

function csvEscapePhonebook(value) {
    if (!value) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

/**
 * =============================================================================
 * MAIN PROCESSING FUNCTION
 * =============================================================================
 */

async function processPhonebookFile() {
    try {
        // Ensure Block Island streets database is loaded
        console.log('Loading Block Island street database...');
        await ensurePhonebookStreetsLoaded();
        console.log('Street database loaded');

        // Fetch the phone book file via csv-file server endpoint
        console.log('Fetching phone book file...');
        const reqBase = "http://127.0.0.99:3000";
        const response = await fetch(`${reqBase}/csv-file?file=PhoneBookBase.txt`);
        if (!response.ok) {
            throw new Error(`Failed to fetch phone book file: ${response.status}`);
        }

        const text = await response.text();
        console.log(`Loaded phone book file: ${text.length} characters`);

        // Parse the phone book
        console.log('Starting parse...');
        const result = parsePhonebook(text);
        console.log('Parse complete');

        // Log statistics
        console.log('=== Phone Book Parsing Statistics ===');
        console.log(`Total lines: ${result.stats.totalLines}`);
        console.log(`Parsed records: ${result.stats.parsedRecords}`);
        console.log(`Skipped lines: ${result.stats.skippedLines}`);
        console.log(`Records with phone: ${result.stats.withPhone}`);
        console.log(`Records without phone: ${result.stats.noPhone}`);
        console.log(`Couples: ${result.stats.couples}`);
        console.log(`Businesses: ${result.stats.businesses}`);
        console.log(`Off-island addresses: ${result.stats.offIsland}`);
        console.log(`With Box numbers: ${result.stats.withBox}`);

        // Street database validation stats
        console.log('--- Street Database Validation ---');
        console.log(`Street database size: ${result.stats.streetDbAvailable} streets`);
        console.log(`Validated BI streets: ${result.stats.validBIStreet}`);
        console.log(`  - Exact matches: ${result.stats.exactStreetMatch}`);
        console.log(`  - Partial matches: ${result.stats.partialStreetMatch}`);
        console.log(`Unvalidated streets: ${result.stats.unvalidatedStreet}`);

        // Line type distribution
        console.log('--- Line Type Distribution ---');
        for (const [lineType, count] of Object.entries(result.stats.lineTypeCounts)) {
            console.log(`  ${lineType}: ${count}`);
        }

        // Store results globally
        window.phonebookResults = result;
        console.log('Results stored in window.phonebookResults');

        // Generate and download CSV
        const csv = phonebookToCSV(result.records);
        downloadPhonebookCSV(csv);

        return result;

    } catch (error) {
        console.error('Error processing phone book:', error);
        throw error;
    }
}

function downloadPhonebookCSV(csvContent) {
    const date = new Date().toISOString().split('T')[0];
    const filename = `phonebook_parsed_${date}.csv`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log(`Downloaded: ${filename}`);
}

/**
 * =============================================================================
 * UTILITY FUNCTIONS
 * =============================================================================
 */

function viewSkippedLines() {
    if (!window.phonebookResults) {
        console.log('No results available. Run processPhonebookFile() first.');
        return;
    }

    console.log('=== Skipped Lines ===');
    for (const item of window.phonebookResults.skipped) {
        console.log(`Line ${item.lineNumber}: "${item.line}"`);
    }
}

function viewSampleRecords(count = 10) {
    if (!window.phonebookResults) {
        console.log('No results available. Run processPhonebookFile() first.');
        return;
    }

    console.log(`=== First ${count} Parsed Records ===`);
    const records = window.phonebookResults.records.slice(0, count);
    for (const record of records) {
        console.log(`Line ${record.lineNumber} [${record.lineType}]:`);
        console.log(`  Phone: ${record.phone}`);
        console.log(`  Name: ${record.name.lastName}, ${record.name.firstName || ''} ${record.name.secondName ? '& ' + record.name.secondName : ''}`);
        console.log(`  Case: ${record.name.caseType}`);
        console.log(`  Address: ${record.address.street || record.address.town || 'N/A'} ${record.address.box ? 'Box ' + record.address.box : ''}`);
        if (record.address.isValidBIStreet) {
            console.log(`  Street Validation: ${record.address.streetMatchConfidence} match → "${record.address.streetNormalized}"`);
        }
        console.log('');
    }
}

function viewUnvalidatedStreets(count = null) {
    if (!window.phonebookResults) {
        console.log('No results available. Run processPhonebookFile() first.');
        return;
    }

    const unvalidated = window.phonebookResults.records.filter(
        r => r.address.street && !r.address.isValidBIStreet && !r.address.isOffIsland
    );

    const toShow = count ? unvalidated.slice(0, count) : unvalidated;

    console.log(`=== Unvalidated Streets (${toShow.length} of ${unvalidated.length} total) ===`);
    for (const record of toShow) {
        console.log(`Line ${record.lineNumber}: "${record.address.street}"`);
        console.log(`  Name: ${record.name.lastName}, ${record.name.firstName || ''}`);
        console.log(`  Raw: ${record.rawLine.substring(0, 80)}...`);
        console.log('');
    }

    return unvalidated;
}

function searchPhonebookStreets(pattern) {
    if (!window.phonebookResults) {
        console.log('No results available. Run processPhonebookFile() first.');
        return;
    }

    const regex = new RegExp(pattern, 'i');
    const matches = window.phonebookResults.records.filter(
        r => r.address.street && regex.test(r.address.street)
    );

    console.log(`=== Records matching "${pattern}" (${matches.length} found) ===`);
    for (const record of matches) {
        console.log(`Line ${record.lineNumber}: "${record.address.street}"`);
        console.log(`  Validated: ${record.address.isValidBIStreet ? 'Yes → ' + record.address.streetNormalized : 'No'}`);
        console.log(`  Name: ${record.name.lastName}, ${record.name.firstName || ''}`);
        console.log('');
    }

    return matches;
}

/**
 * View line type distribution
 */
function viewLineTypeDistribution() {
    if (!window.phonebookResults) {
        console.log('No results available. Run processPhonebookFile() first.');
        return;
    }

    console.log('=== Line Type Distribution ===');
    const counts = window.phonebookResults.stats.lineTypeCounts;
    const sortedTypes = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    for (const [lineType, count] of sortedTypes) {
        const pct = ((count / window.phonebookResults.stats.parsedRecords) * 100).toFixed(1);
        console.log(`${lineType}: ${count} (${pct}%)`);
    }
}

/**
 * View records by line type
 */
function viewRecordsByLineType(lineType, count = 10) {
    if (!window.phonebookResults) {
        console.log('No results available. Run processPhonebookFile() first.');
        return;
    }

    const matches = window.phonebookResults.records.filter(r => r.lineType === lineType);
    const toShow = matches.slice(0, count);

    console.log(`=== ${lineType} Records (${toShow.length} of ${matches.length} total) ===`);
    for (const record of toShow) {
        console.log(`Line ${record.lineNumber}:`);
        console.log(`  Phone: ${record.phone}`);
        console.log(`  Name: ${record.name.lastName}, ${record.name.firstName || ''}`);
        console.log(`  Raw: ${record.rawLine}`);
        console.log('');
    }

    return matches;
}

// Export for use in browser
if (typeof window !== 'undefined') {
    window.processPhonebookFile = processPhonebookFile;
    window.parsePhonebook = parsePhonebook;
    window.parsePhonebookLine = parsePhonebookLine;
    window.viewSkippedLines = viewSkippedLines;
    window.viewSampleRecords = viewSampleRecords;
    window.viewUnvalidatedStreets = viewUnvalidatedStreets;
    window.searchPhonebookStreets = searchPhonebookStreets;
    window.ensurePhonebookStreetsLoaded = ensurePhonebookStreetsLoaded;
    window.findBIStreetMatch = findBIStreetMatch;
    window.PhonebookLineClassifier = PhonebookLineClassifier;
    window.viewLineTypeDistribution = viewLineTypeDistribution;
    window.viewRecordsByLineType = viewRecordsByLineType;
    window.getNameComponentsFromCase31 = getNameComponentsFromCase31;
}
