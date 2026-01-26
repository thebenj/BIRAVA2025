/**
 * Address Processing Module
 *
 * Core address parsing, normalization, and Block Island enhancement functionality.
 * Extracted from utils.js for better modularity and maintenance.
 *
 * Dependencies:
 * - parse-address library (parseAddress global)
 * - Address class from aliasClasses.js
 * - StreetName class from aliasClasses.js
 * - Google Drive API (gapi.client) for Block Island streets loading
 *
 * Key Features:
 * - Block Island city normalization
 * - Enhanced Block Island address completion (dual logic rules)
 * - Street name preservation (prevents parse-address abbreviations)
 * - AttributedTerm integration for complete data lineage
 * - StreetName Alias Database for street variation matching
 */

// =============================================================================
// STREET DATABASE CONFIGURATION
// =============================================================================

// StreetName Alias Database - contains StreetName objects with aliases
const STREETNAME_ALIAS_DATABASE_ID = '1quMdB4qAcnR4oaepSbZEmVWUqYO5_nxK';

// Legacy VA Processing Street File (kept for reference, no longer used for loading)
// const VA_STREET_FILE_ID = '1lsrd0alv9O01M_qlsiym3cB0TRIdgXI9';

// =============================================================================
// UNMATCHED STREET TRACKER
// =============================================================================

/**
 * Tracks street names that fail to match in the StreetName database.
 * Used to identify streets that should be added to the database.
 *
 * Google Drive Files:
 * - JSON: 1VopBti05Fkmn6baW2lbvWml6kbzHgp_5 (persistent dataset)
 * - CSV: 12TapBBfwNk0_4rvOlaO1LYVW2kXI5YZR (regenerated from JSON)
 */
window.unmatchedStreetTracker = {
    // Google Drive file IDs
    JSON_FILE_ID: '1VopBti05Fkmn6baW2lbvWml6kbzHgp_5',
    CSV_FILE_ID: '12TapBBfwNk0_4rvOlaO1LYVW2kXI5YZR',

    // Current dataset: Map from normalized street string to record object
    dataset: new Map(),

    // Mode: 'overwrite' or 'add'
    mode: null,

    // Whether tracking is active
    isActive: false,

    /**
     * Initialize tracking - prompts user and loads JSON if needed
     * @returns {Promise<boolean>} True if initialization successful
     */
    async initialize() {
        // Prompt user for mode
        const choice = confirm(
            'Unmatched Street Tracking\n\n' +
            'Click OK to ADD to existing unmatched streets file.\n' +
            'Click Cancel to OVERWRITE with fresh data.\n\n' +
            '(This tracks streets not found in the BI database)'
        );

        this.mode = choice ? 'add' : 'overwrite';
        this.dataset = new Map();

        if (this.mode === 'add') {
            // Load existing JSON file
            try {
                console.log('[UNMATCHED STREETS] Loading existing dataset from Google Drive...');
                const response = await gapi.client.drive.files.get({
                    fileId: this.JSON_FILE_ID,
                    alt: 'media'
                });

                const data = response.result;
                if (data && data.records && Array.isArray(data.records)) {
                    // Build map from records
                    for (const record of data.records) {
                        if (record.unmatchedStreet) {
                            const normalized = record.unmatchedStreet.toUpperCase().trim();
                            this.dataset.set(normalized, record);
                        }
                    }
                    console.log(`[UNMATCHED STREETS] Loaded ${this.dataset.size} existing records (ADD mode)`);
                } else {
                    console.log('[UNMATCHED STREETS] No existing records found, starting fresh');
                }
            } catch (error) {
                console.warn('[UNMATCHED STREETS] Could not load existing file, starting fresh:', error.message);
            }
        } else {
            console.log('[UNMATCHED STREETS] Starting fresh dataset (OVERWRITE mode)');
        }

        this.isActive = true;
        return true;
    },

    /**
     * Record an unmatched street with best match information
     * @param {string} streetName - The street name that wasn't found
     * @param {StreetName|null} bestMatch - The best matching StreetName object (or null)
     * @param {Object} bestScores - The compareTo output for best match
     * @param {number} bestOverallScore - The highest score across categories
     * @param {string} bestAlias - The alias that had the highest score
     */
    record(streetName, bestMatch, bestScores, bestOverallScore, bestAlias) {
        if (!this.isActive) return;
        if (!streetName) return;

        const normalized = streetName.toUpperCase().trim();

        // Skip if already in dataset
        if (this.dataset.has(normalized)) return;

        // Create record
        const record = {
            unmatchedStreet: normalized,
            bestMatchPrimary: bestMatch?.primaryAlias?.term || '',
            bestMatchAlias: bestAlias || '',
            bestScore: bestOverallScore || 0,
            primaryScore: bestScores?.primary || 0,
            homonymScore: bestScores?.homonym || -1,
            synonymScore: bestScores?.synonym || -1,
            candidateScore: bestScores?.candidate || -1
        };

        this.dataset.set(normalized, record);
    },

    /**
     * Save to Google Drive (both JSON and CSV)
     * @returns {Promise<Object>} Result with JSON and CSV file IDs
     */
    async save() {
        if (!this.isActive) {
            console.log('[UNMATCHED STREETS] Tracker not active, skipping save');
            return null;
        }

        const records = Array.from(this.dataset.values());
        console.log(`[UNMATCHED STREETS] Saving ${records.length} unmatched street records...`);

        // Sort records alphabetically by street name
        records.sort((a, b) => a.unmatchedStreet.localeCompare(b.unmatchedStreet));

        // Build JSON structure
        const jsonData = {
            __format: 'UnmatchedStreetDatabase',
            __version: '1.0',
            __lastUpdated: new Date().toISOString(),
            __recordCount: records.length,
            records: records
        };

        // Build CSV content
        const csvHeaders = [
            'unmatchedStreet',
            'bestMatchPrimary',
            'bestMatchAlias',
            'bestScore',
            'primaryScore',
            'homonymScore',
            'synonymScore',
            'candidateScore'
        ];

        const csvRows = records.map(r => [
            this._csvEscape(r.unmatchedStreet),
            this._csvEscape(r.bestMatchPrimary),
            this._csvEscape(r.bestMatchAlias),
            r.bestScore,
            r.primaryScore,
            r.homonymScore,
            r.synonymScore,
            r.candidateScore
        ].join(','));

        const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

        try {
            // Upload JSON
            console.log('[UNMATCHED STREETS] Uploading JSON...');
            const jsonContent = JSON.stringify(jsonData, null, 2);
            await fetch(
                `https://www.googleapis.com/upload/drive/v3/files/${this.JSON_FILE_ID}?uploadType=media`,
                {
                    method: 'PATCH',
                    headers: new Headers({
                        'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                        'Content-Type': 'application/json'
                    }),
                    body: jsonContent
                }
            );

            // Upload CSV
            console.log('[UNMATCHED STREETS] Uploading CSV...');
            await fetch(
                `https://www.googleapis.com/upload/drive/v3/files/${this.CSV_FILE_ID}?uploadType=media`,
                {
                    method: 'PATCH',
                    headers: new Headers({
                        'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                        'Content-Type': 'text/csv'
                    }),
                    body: csvContent
                }
            );

            console.log(`[UNMATCHED STREETS] ✅ Saved ${records.length} records to Google Drive`);
            console.log(`[UNMATCHED STREETS]   JSON: ${this.JSON_FILE_ID}`);
            console.log(`[UNMATCHED STREETS]   CSV: ${this.CSV_FILE_ID}`);

            // Deactivate after save
            this.isActive = false;

            return {
                jsonFileId: this.JSON_FILE_ID,
                csvFileId: this.CSV_FILE_ID,
                recordCount: records.length
            };

        } catch (error) {
            console.error('[UNMATCHED STREETS] ❌ Error saving:', error);
            throw error;
        }
    },

    /**
     * Helper to escape CSV values
     */
    _csvEscape(value) {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    },

    /**
     * Get summary of current tracking state
     */
    getSummary() {
        return {
            isActive: this.isActive,
            mode: this.mode,
            recordCount: this.dataset.size
        };
    }
};

// City name normalization function for Block Island
function normalizeBlockIslandCity(parsedAddress) {
    if (!parsedAddress || !parsedAddress.city) return parsedAddress;

    const city = parsedAddress.city.toLowerCase();

    // Normalize Block Island variations
    if (city === 'block island' || city === 'new shoreham') {
        // Use postal name "Block Island" as canonical form
        parsedAddress.city = 'Block Island';
        parsedAddress.cityNormalized = true;

        // Store both forms for reference
        parsedAddress.cityPostal = 'Block Island';
        parsedAddress.cityMunicipal = 'New Shoreham';
    }

    return parsedAddress;
}

/**
 * VisionAppraisal Tag Cleaner Class
 * Processes VisionAppraisal address tags and provides multiple representations
 */
class VisionAppraisalTagCleaner {
    constructor(addressString) {
        this.originalString = addressString;

        if (!addressString || typeof addressString !== 'string') {
            this.cleanedString = addressString;
            this.splitLines = [];
            return;
        }

        // Apply COMMA_NEWLINE strategy:
        // :^#^: (line break substitute) → comma
        // ::#^#:: (field delimiter) → newline
        this.cleanedString = addressString
            .replace(/:\^#\^:/g, ',')       // :^#^: → ,
            .replace(/::#\^#::/g, '\n');     // ::#^#:: → \n

        // Split on ::#^#:: to get original field structure
        this.splitLines = addressString.split('::#^#::');
    }
}

/**
 * Legacy function for backward compatibility
 * @param {string} addressString - Raw VisionAppraisal address with tags
 * @returns {string} - Clean address string ready for parsing
 */
function cleanVisionAppraisalTags(addressString) {
    const cleaner = new VisionAppraisalTagCleaner(addressString);
    return cleaner.cleanedString;
}

// Helper function to create consistent processed address objects
function createProcessedAddressObject(normalized, originalString, sourceType, fieldName, usedPlaceholderNumber = false, recipientDetails = null) {
    return {
        // Original data
        original: originalString,
        recipientDetails: recipientDetails,
        sourceType: sourceType, // 'VisionAppraisal', 'Bloomerang', etc.
        fieldName: fieldName,   // For AttributedTerm integration

        // Parsed components
        number: normalized.number || null,
        street: normalized.street || null,
        type: normalized.type || null, // St, Ave, Rd, etc.

        // City handling (Block Island specific)
        city: normalized.city || null,
        cityPostal: normalized.cityPostal || normalized.city,
        cityMunicipal: normalized.cityMunicipal || null,
        cityNormalized: normalized.cityNormalized || false,

        // State & ZIP
        state: normalized.state || null,
        zip: normalized.zip || null,

        // Special units (PO Box, Apt, etc.)
        secUnitType: normalized.sec_unit_type || null,
        secUnitNum: normalized.sec_unit_num || null,

        // Metadata
        processedAt: new Date().toISOString(),
        isBlockIslandAddress: false,  // Will be set by detection function
        needsBlockIslandForcing: false,  // Will be set by detection function
        blockIslandDetectionMethod: null,  // Will be set by detection function

        // Placeholder number tracking
        usedPlaceholderNumber: usedPlaceholderNumber
    };
}

/**
 * Find longest Block Island street match from streetChecks array
 * Utility function for street matching logic
 * @param {Array} streetChecks - Array of address variations to check
 * @returns {string|null} - Matched street name or null if no match
 */
function findBlockIslandStreetMatch(streetChecks) {
    if (!window.blockIslandStreets) {
        return null;
    }

    let storedMatch = null;

    // Check all Block Island street names to find longest match
    for (const biStreetName of window.blockIslandStreets) {
        for (const checkStreet of streetChecks) {
            // Trim database entry to handle trailing spaces
            if (checkStreet.includes(biStreetName.trim())) {

                if (!storedMatch) {
                    // First match found - store trimmed version
                    storedMatch = biStreetName.trim();
                } else {
                    // Check if new match contains the stored match (is longer/more specific)
                    if (biStreetName.includes(storedMatch)) {
                        storedMatch = biStreetName.trim();  // Replace with longer match
                    }
                }
                break; // Move to next biStreetName
            }
        }
    }

    // BASELINE INSTRUMENTATION: Record street lookup if enabled
    // Record each unique input string that was checked
    if (typeof recordStreetLookup === 'function') {
        for (const checkStreet of streetChecks) {
            recordStreetLookup(checkStreet, !!storedMatch, storedMatch);
        }
    }

    return storedMatch;
}

/**
 * Shared helper function for Block Island street matching with geographic corroboration
 * @param {string} addressString - Raw address string
 * @param {Array} streetChecks - Array of address variations to check
 * @returns {Object} {isMatch: boolean, matchedStreet: string|null}
 */
function checkBlockIslandStreetMatch(addressString, streetChecks) {
    const storedMatch = findBlockIslandStreetMatch(streetChecks);

    if (!storedMatch) {
        return { isMatch: false, matchedStreet: null };
    }

    // Apply corroboration logic with the longest match found
    if (addressString.includes('::#^#::')) {
        // Extract geographic portion (everything after first line tag)
        const firstTagIndex = addressString.indexOf('::#^#::');
        const geographicPortion = addressString.substring(firstTagIndex + 7);

        // Check if geographic portion corroborates Block Island specifically
        const confirmsBI = /BLOCK ISLAND|NEW SHOREHAM|02807/i.test(geographicPortion);

        if (confirmsBI) {
            return { isMatch: true, matchedStreet: storedMatch };
        } else {
            // NOT corroborated - address with line tags is definitively NOT Block Island
            return { isMatch: false, matchedStreet: null };
        }
    } else {
        // No line tag - accept street match
        return { isMatch: true, matchedStreet: storedMatch };
    }
}

/**
 * Pre-parsing Block Island detection using only methods that don't require parsed components
 * Used to determine if placeholder number insertion is needed before parsing
 * @param {string} addressString - Raw address string
 * @param {string} sourceType - Source type ('VisionAppraisal', 'Bloomerang', etc.)
 * @param {string} fieldName - Field name ('propertyLocation', 'ownerAddress', etc.)
 * @returns {Object} {isBlockIsland: boolean, matchedStreet: string|null}
 */
function preParseBlockIslandCheck(addressString, sourceType, fieldName) {
    let isBI = false;
    let matchedStreet = null;

    // Method 3: Street database matching with geographic corroboration
    if (!isBI) {
        // Clean address for street matching while keeping original for line tag checking
        const cleanedAddress = cleanVisionAppraisalTags(addressString);
        const addressUpper = cleanedAddress.toUpperCase().trim();

        // Build comprehensive street check list using cleaned address
        const streetChecks = [
            addressUpper,
            addressUpper.replace(/^\d+\s+/, ''), // Remove leading house number
            addressUpper.replace(/\s+/g, ' ')    // Normalize spaces
        ];

        // Use shared helper function - pass original address for line tag check
        const streetMatchResult = checkBlockIslandStreetMatch(addressString, streetChecks);
        if (streetMatchResult.isMatch) {
            isBI = true;
            matchedStreet = streetMatchResult.matchedStreet;
        }
    }

    // Method 4: VisionAppraisal property location assumption (from existing detectBlockIslandAddress)
    if (!isBI && sourceType === 'VisionAppraisal' && fieldName === 'propertyLocation') {
        isBI = true;
        // No matchedStreet for this method
    }

    return {
        isBlockIsland: isBI,
        matchedStreet: matchedStreet
    };
}

// Comprehensive Block Island detection function (Phase 1.2)
// Consolidates all detection methods and returns structured result
function detectBlockIslandAddress(parsed, addressString, sourceType, fieldName) {
    let isBI = false;
    let method = null;
    let matchedStreet = null;

    // Method 1: ZIP detection
    if (parsed.zip === '02807') {
        isBI = true;
        method = 'zip';
    }

    // Method 2: City detection
    if (!isBI && parsed.city &&
        (parsed.city === 'Block Island' || parsed.city === 'New Shoreham')) {
        isBI = true;
        method = 'city';
    }

    // Methods 3 & 4: Use preParseBlockIslandCheck for street database and VisionAppraisal detection
    if (!isBI) {
        const preParseResult = preParseBlockIslandCheck(addressString, sourceType, fieldName);
        if (preParseResult.isBlockIsland) {
            isBI = true;
            matchedStreet = preParseResult.matchedStreet;
            // Determine method based on what triggered the match
            method = preParseResult.matchedStreet ? 'street' : 'visionappraisal';
        }
    }

    // Determine if forcing is needed (is Block Island AND missing address components)
    const needsForcing = isBI && (!parsed.city || !parsed.state || !parsed.zip);

    return {
        isBI: isBI,
        needsForcing: needsForcing,
        method: method,
        matchedStreet: matchedStreet
    };
}

// Block Island Address Builder Function (Phase 3, Step 3.1)
// Creates Block Island address with proper completion and street preservation
function createBlockIslandAddress(parsed, originalString, sourceType, fieldName, matchedStreet, usedPlaceholderNumber = false) {
    // Create base processed address object
    const processedAddress = createProcessedAddressObject(parsed, originalString, sourceType, fieldName, usedPlaceholderNumber);

    // Set Block Island identification
    processedAddress.isBlockIslandAddress = true;
    processedAddress.cityNormalized = true;

    // Force Block Island completion
    processedAddress.city = 'Block Island';
    processedAddress.state = 'RI';
    processedAddress.zip = '02807';

    // Set metadata
    processedAddress.blockIslandReason = 'Block Island address builder (two-path processing)';

    // Street preservation logic (adapted from enhanceAddressWithBlockIslandLogic)
    if (originalString && sourceType === 'VisionAppraisal') {
        // Preserve original VisionAppraisal street name by reconstructing from original address
        const originalMatch = originalString.match(/(\d+)\s+(.*?)(?:\s*::#\^#::|$)/i);
        if (originalMatch) {
            const fullStreet = originalMatch[2].trim();
            processedAddress.street = fullStreet;
            processedAddress.type = null; // Don't abbreviate
        }
    }

    // Branch 2: Use matched street from database detection (either as fallback or primary)
    // Check if the matched street (or its untrimmed version) exists in database
    const hasMatch = matchedStreet && window.blockIslandStreets && (
        window.blockIslandStreets.has(matchedStreet) ||
        Array.from(window.blockIslandStreets).some(street => street.trim() === matchedStreet)
    );

    if (hasMatch) {
        // Use matched street from database detection
        processedAddress.street = matchedStreet;
        processedAddress.matchedStreet = matchedStreet;
        processedAddress.blockIslandReason = `Matched BI street: ${matchedStreet}`;
    }

    // Restore street number to null if placeholder was used
    if (usedPlaceholderNumber && processedAddress.number === "9999") {
        processedAddress.number = null;
        processedAddress.placeholderNumberRemoved = true;
    }

    return processedAddress;
}


/**
 * Extract recipient details from address string if it matches our criteria
 * Based on secondary address analysis logic for Groups A, C, and three-part group
 * @param {string} addressString - Raw address string
 * @returns {Object} {recipientDetails: string|null, addressString: string}
 */
function extractRecipientDetails(addressString) {
    if (!addressString || typeof addressString !== 'string') {
        return { recipientDetails: null, addressString: addressString };
    }

    // Business terms for detection (from secondaryAddressAnalysis.js)
    const businessTerms = [
        'LLC', 'INC', 'CORP', 'TRUST', 'COMPANY', 'CO', 'LTD', 'PARTNERSHIP',
        'ASSOCIATES', 'GROUP', 'ENTERPRISES', 'FOUNDATION', 'ORGANIZATION',
        'TRUSTEE', 'ESTATE', 'PROPERTIES', 'MANAGEMENT', 'HOLDINGS', 'REALTY',
        'FINANCIAL', 'SERVICES', 'INVESTMENTS', 'DEVELOPMENT', 'BUILDERS'
    ];

    // Helper functions (from secondaryAddressAnalysis.js)
    function hasBusinessTerm(text) {
        const upperText = text.toUpperCase();
        return businessTerms.some(term => new RegExp(`\\b${term}\\b`).test(upperText));
    }

    function containsCO(text) {
        // Match C/O, C\O, C-O, CARE OF - all must be complete words with trailing space
        return /\b(C[\/\\-]O\b|CARE\s+OF)\s/i.test(text);
    }

    function beginsWithNumberOrPO(text) {
        const trimmed = text.trim().toUpperCase();

        // Check if starts with number
        if (/^\d/.test(trimmed)) return true;

        // Check if starts with spelled-out numbers 1-10 as complete words
        const spelledNumbers = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN'];
        if (spelledNumbers.some(num => new RegExp(`^${num}\\s`).test(trimmed))) return true;

        // Check if starts with PO or P.O. variations including BOX, POBOX
        if (trimmed.startsWith('PO ') || trimmed.startsWith('P.O.') || trimmed.startsWith('P.O ') ||
            trimmed.startsWith('PO.') || trimmed.startsWith('P O ') ||
            trimmed.startsWith('BOX ') || trimmed.startsWith('POBOX ')) return true;

        // Check if starts with Block Island street name using existing utility function
        if (typeof findBlockIslandStreetMatch !== 'undefined') {
            const matchedStreet = findBlockIslandStreetMatch([trimmed]);
            if (matchedStreet) return true; // Treat as "starts with address" = passes neither
        }

        return false;
    }

    // Split using same logic as secondaryAddressAnalysis.js
    const primaryParts = addressString.split('::#^#::');
    const parts = primaryParts.flatMap(part => part.split(':^#^:'));

    if (parts.length < 3) {
        // Not enough parts for our criteria
        return { recipientDetails: null, addressString: addressString };
    }

    const firstPart = parts[0].trim();

    // Test criteria for Groups A, C, and three-part group
    const hasBusinessOrCO = hasBusinessTerm(firstPart) || containsCO(firstPart);
    const doesNotBeginWithNumOrPO = !beginsWithNumberOrPO(firstPart);

    let shouldExtract = false;

    if (parts.length === 4) {
        // Four-part analysis: Group A (both criteria) or Group C (only second criteria)
        if ((hasBusinessOrCO && doesNotBeginWithNumOrPO) || // Group A
            (!hasBusinessOrCO && doesNotBeginWithNumOrPO)) { // Group C
            shouldExtract = true;
        }
    } else if (parts.length === 3) {
        // Three-part analysis: Has Business/C-O OR does not begin with Number/PO
        if (hasBusinessOrCO || doesNotBeginWithNumOrPO) {
            shouldExtract = true;
        }
    }

    if (shouldExtract) {
        // Extract first part as recipient details and remove from address string
        const firstTagIndex = addressString.indexOf('::#^#::');
        if (firstTagIndex !== -1) {
            const recipientDetails = addressString.substring(0, firstTagIndex).trim();
            const remainingAddress = addressString.substring(firstTagIndex + 7).trim(); // Remove "::#^#::" too
            return { recipientDetails, addressString: remainingAddress };
        }
    }

    return { recipientDetails: null, addressString: addressString };
}

// Unified address processing function for Requirements 10,11,14,16,17,18
function processAddress(addressString, sourceType = 'unknown', fieldName = null) {
    if (!addressString || typeof addressString !== 'string') {
        console.log(`❌ PROCESSADDRESS: Invalid input`);
        return null;
    }

    // Check if parse-address is available
    if (typeof parseAddress === 'undefined') {
        console.error('parse-address library not loaded');
        return null;
    }

    // Requirement 11: BI PO Box special handling
    if (fieldName === 'BI PO Box') {
        const poBoxNum = addressString.trim();
        // Generate full PO Box address
        const fullAddress = `PO Box ${poBoxNum}, New Shoreham, RI 02807`;
        const parsed = parseAddress.parseLocation(fullAddress);

        if (parsed) {
            const processedAddress = createProcessedAddressObject(parsed, addressString, sourceType, fieldName);
            processedAddress.isBlockIslandAddress = true;
            processedAddress.blockIslandReason = 'BI PO Box generated address';
            processedAddress.generatedAddress = fullAddress;
            return processedAddress;
        }
    }

    // Requirement 14: BI Street special handling
    if (fieldName === 'BI Street') {
        const streetData = addressString.trim();
        // Check if starts with number (Fire Number detection)
        const hasFireNumber = /^\d+/.test(streetData);

        if (hasFireNumber) {
            // Generate full Block Island address
            const fullAddress = `${streetData}, Block Island, RI 02807`;
            const parsed = parseAddress.parseLocation(fullAddress);

            if (parsed) {
                const processedAddress = createProcessedAddressObject(parsed, addressString, sourceType, fieldName);
                processedAddress.isBlockIslandAddress = true;
                processedAddress.blockIslandReason = 'BI Street generated address with Fire Number';
                processedAddress.generatedAddress = fullAddress;
                return processedAddress;
            }
        }
    }

    // Standard address parsing
    // Extract recipient details before VisionAppraisal tag cleaning
    const recipientExtractionResult = extractRecipientDetails(addressString.trim());
    const finalAddressString = recipientExtractionResult.addressString;
    const recipientDetails = recipientExtractionResult.recipientDetails;

    // Apply VisionAppraisal tag cleaning immediately before parsing
    const cleanedAddressString = cleanVisionAppraisalTags(finalAddressString);

    // Block Island placeholder number logic - check BEFORE parsing
    const preParseCheck = preParseBlockIslandCheck(finalAddressString.trim(), sourceType, fieldName);
    let addressForParsing = cleanedAddressString;
    let usedPlaceholderNumber = false;

    // If Block Island address + matched street + no leading number, insert placeholder
    if (preParseCheck.isBlockIsland && preParseCheck.matchedStreet) {
        const startsWithNumber = /^\d+\s/.test(cleanedAddressString.trim());
        if (!startsWithNumber) {
            addressForParsing = "9999 " + cleanedAddressString;
            usedPlaceholderNumber = true;
        }
    }

    const parsed = parseAddress.parseLocation(addressForParsing);

    /* COMMENTED OUT: No longer needed with two-path system (Phase 3)
    // BLOCK ISLAND STREET PRECHECK - Check against street database BEFORE parsing
    let blockIslandPrecheckResult = null;
    if (window.blockIslandStreets) {
        const addressUpper = addressString.toUpperCase().trim();

        // Build comprehensive street check list (same logic as enhanceAddressWithBlockIslandLogic)
        const streetChecks = [
            addressUpper,
            addressUpper.replace(/^\d+\s+/, ''), // Remove leading house number
            addressUpper.replace(/\s+/g, ' ')    // Normalize spaces
        ];

        for (const checkStreet of streetChecks) {
            if (window.blockIslandStreets.has(checkStreet)) {
                blockIslandPrecheckResult = checkStreet;
                break;
            }
        }
    }
    */

    if (!parsed || (!parsed.city && !parsed.zip && !parsed.street)) {
        return null; // Failed to parse meaningfully
    }

    // Apply Block Island city normalization
    const normalized = normalizeBlockIslandCity(parsed);

    // Use new detection function to determine Block Island status (Step 1.3)
    const detectionResult = detectBlockIslandAddress(normalized, addressString, sourceType, fieldName);

    // Create comprehensive address object using helper function
    const processedAddress = createProcessedAddressObject(normalized, addressString, sourceType, fieldName, usedPlaceholderNumber, recipientDetails);

    // Apply detection results to address object (new two-variable system)
    processedAddress.isBlockIslandAddress = detectionResult.isBI;
    processedAddress.needsBlockIslandForcing = detectionResult.needsForcing;
    processedAddress.blockIslandDetectionMethod = detectionResult.method;
    if (detectionResult.matchedStreet) {
        processedAddress.matchedStreet = detectionResult.matchedStreet;
    }

    // Restore street number to null if placeholder was used (applies to both paths)
    if (usedPlaceholderNumber && processedAddress.number === "9999") {
        processedAddress.number = null;
        processedAddress.placeholderNumberRemoved = true;

        // Log unexpected restoration in non-Block Island path
        if (!detectionResult.isBI) {
            console.warn('Unexpected: Restored placeholder in non-Block Island address', {
                address: addressString,
                preParseBI: preParseCheck.isBlockIsland,
                fullDetectionBI: detectionResult.isBI,
                preParseMethod: preParseCheck.matchedStreet ? 'street' : 'visionappraisal',
                fullDetectionMethod: detectionResult.method
            });
        }
    }

    // Phase 3 Step 3.2: Two-Path Processing Decision Logic
    if (detectionResult.isBI) {
        // Path A: Block Island addresses → specialized processing
        return createBlockIslandAddress(normalized, addressString, sourceType, fieldName, detectionResult.matchedStreet, usedPlaceholderNumber);
    } else {
        // Path B: Non-Block Island addresses → apply suffix processing if needed
        if (normalized.street && normalized.suffix) {
            const addressPart = addressString.split('::#^#::')[0];
            const streetWithoutNumber = normalized.number
                ? addressPart.replace(new RegExp(`^\\s*${normalized.number}\\s+`), '')
                : addressPart;


            processedAddress.street = streetWithoutNumber;
        }

        return processedAddress;
    }
}

/**
 * Deserialize an AttributedTerm from the StreetName Alias Database format.
 * Converts plain object sourceMap to Map instance.
 * @param {Object} data - Serialized AttributedTerm data
 * @returns {AttributedTerm} Reconstructed AttributedTerm instance
 */
function deserializeStreetAttributedTerm(data) {
    if (!data || data.type !== 'AttributedTerm') {
        throw new Error('Invalid AttributedTerm data');
    }

    // Convert sourceMap from plain object to Map
    const sourceMap = new Map();
    if (data.sourceMap && typeof data.sourceMap === 'object') {
        for (const [key, value] of Object.entries(data.sourceMap)) {
            sourceMap.set(key, value);
        }
    }

    // Get first entry to create the AttributedTerm
    const entries = Array.from(sourceMap.entries());
    if (entries.length === 0) {
        // Create with minimal data if no source entries
        const at = new AttributedTerm(data.term, 'StreetDatabase', 0, 'street', data.fieldName || 'streetName');
        return at;
    }

    const [source, sourceInfo] = entries[0];
    const at = new AttributedTerm(
        data.term,
        source,
        sourceInfo.index || 0,
        sourceInfo.identifier || 'street',
        data.fieldName || 'streetName'
    );

    // Add additional sources
    for (let i = 1; i < entries.length; i++) {
        const [addSource, addInfo] = entries[i];
        at.addAdditionalSource(addSource, addInfo.index || 0, addInfo.identifier || 'street');
    }

    return at;
}

/**
 * Deserialize an Aliases object from the StreetName Alias Database format.
 * @param {Object} data - Serialized Aliases data
 * @returns {Aliases} Reconstructed Aliases instance
 */
function deserializeStreetAliases(data) {
    if (!data || data.type !== 'Aliases') {
        throw new Error('Invalid Aliases data');
    }

    const aliases = new Aliases();
    aliases.homonyms = (data.homonyms || []).map(deserializeStreetAttributedTerm);
    aliases.synonyms = (data.synonyms || []).map(deserializeStreetAttributedTerm);
    aliases.candidates = (data.candidates || []).map(deserializeStreetAttributedTerm);

    return aliases;
}

/**
 * Deserialize a StreetName object from the StreetName Alias Database format.
 * @param {Object} data - Serialized StreetName data
 * @returns {StreetName} Reconstructed StreetName instance
 */
function deserializeStreetNameObject(data) {
    if (!data || data.type !== 'StreetName') {
        throw new Error('Invalid StreetName data');
    }

    const primaryAlias = deserializeStreetAttributedTerm(data.primaryAlias);
    const streetName = new StreetName(primaryAlias);
    streetName.alternatives = deserializeStreetAliases(data.alternatives);

    return streetName;
}

/**
 * Load Block Island streets database from Google Drive (StreetName Alias Database)
 * Phase 3: Loads StreetName objects and builds lookup structures
 * @returns {Promise<Set>} Set of Block Island street names (for backward compatibility)
 */
async function loadBlockIslandStreetsFromDrive() {
    try {
        // Load street type abbreviation table first (needed for address processing)
        if (typeof StreetTypeAbbreviationManager !== 'undefined' && !StreetTypeAbbreviationManager.isLoaded) {
            console.log('[STREET DB] Loading StreetTypeAbbreviationManager...');
            await StreetTypeAbbreviationManager.loadFromDrive();
        }

        console.log('[STREET DB] Loading StreetName Alias Database...');

        const response = await gapi.client.drive.files.get({
            fileId: STREETNAME_ALIAS_DATABASE_ID,
            alt: 'media'
        });

        const content = response.body;
        const database = JSON.parse(content);

        // Validate database format
        if (database.__format !== 'StreetNameAliasDatabase') {
            throw new Error(`Unexpected database format: ${database.__format}`);
        }

        console.log(`[STREET DB] Database version: ${database.__version}, created: ${database.__created}`);
        console.log(`[STREET DB] Street count: ${database.__streetCount}`);

        // Deserialize StreetName objects
        const streetNameObjects = database.streets.map(deserializeStreetNameObject);
        console.log(`[STREET DB] Deserialized ${streetNameObjects.length} StreetName objects`);

        // Build the street database object with lookup methods
        const streetDatabase = {
            // Array of all StreetName objects
            streetNames: streetNameObjects,

            // Map from any variation (uppercase, trimmed) to its StreetName object
            variationToStreetName: new Map(),

            // Metadata from the database file
            version: database.__version,
            created: database.__created,
            sourceFileId: database.__sourceFileId,

            /**
             * Look up a StreetName object by any variation.
             * Uses two-phase matching:
             * 1. Fast path: exact match against indexed variations
             * 2. Slow path: best-match using StreetName.compareTo() similarity
             *
             * @param {string} input - Street name variation to look up
             * @param {number} threshold - Minimum similarity score for best-match (default 0.80)
             * @returns {StreetName|null} The StreetName object, or null if not found
             */
            lookup: function(input, threshold = 0.80) {
                if (!input || typeof input !== 'string') return null;
                const normalized = input.toUpperCase().trim();

                // Fast path: exact match against indexed variations
                const exactMatch = this.variationToStreetName.get(normalized);
                if (exactMatch) return exactMatch;

                // Slow path: find best match using StreetName.compareTo()
                let bestMatch = null;
                let bestScore = 0;
                let bestScores = null;
                let bestAlias = '';

                for (const streetName of this.streetNames) {
                    const scores = streetName.compareTo(normalized);
                    // Take the maximum score across primary, homonym, and candidate
                    // (exclude synonym - unverified)
                    const maxScore = Math.max(
                        scores.primary,
                        scores.homonym >= 0 ? scores.homonym : 0,
                        scores.candidate >= 0 ? scores.candidate : 0
                    );

                    if (maxScore > bestScore) {
                        bestScore = maxScore;
                        bestMatch = streetName;
                        bestScores = scores;

                        // Determine which alias had the best score
                        if (maxScore === scores.primary) {
                            bestAlias = streetName.primaryAlias?.term || '';
                        } else if (scores.homonym >= 0 && maxScore === scores.homonym) {
                            // Find the homonym that matched best
                            bestAlias = this._findBestAlias(streetName.alternatives?.homonyms, normalized) || '';
                        } else if (scores.candidate >= 0 && maxScore === scores.candidate) {
                            // Find the candidate that matched best
                            bestAlias = this._findBestAlias(streetName.alternatives?.candidates, normalized) || '';
                        }
                    }
                }

                // If below threshold, record as unmatched street
                if (bestScore < threshold) {
                    if (window.unmatchedStreetTracker && window.unmatchedStreetTracker.isActive) {
                        window.unmatchedStreetTracker.record(
                            normalized,
                            bestMatch,
                            bestScores,
                            bestScore,
                            bestAlias
                        );
                    }
                    return null;
                }

                return bestMatch;
            },

            /**
             * Helper to find which alias in an array best matches the input
             * @private
             */
            _findBestAlias: function(aliases, input) {
                if (!aliases || !Array.isArray(aliases)) return null;
                let best = null;
                let bestSim = 0;
                for (const alias of aliases) {
                    const term = alias?.term;
                    if (term) {
                        const sim = typeof levenshteinSimilarity === 'function'
                            ? levenshteinSimilarity(term.toUpperCase(), input.toUpperCase())
                            : 0;
                        if (sim > bestSim) {
                            bestSim = sim;
                            best = term;
                        }
                    }
                }
                return best;
            },

            /**
             * Check if a street variation exists in the database
             * @param {string} input - Street name variation to check
             * @returns {boolean} True if the variation exists
             */
            has: function(input) {
                if (!input || typeof input !== 'string') return false;
                const normalized = input.toUpperCase().trim();
                return this.variationToStreetName.has(normalized);
            }
        };

        // Build the variationToStreetName index
        // Each StreetName's primary alias AND all alternatives map to the same StreetName object
        let totalVariations = 0;
        for (const streetName of streetNameObjects) {
            // Primary alias
            const primaryTerm = streetName.primaryAlias?.term;
            if (primaryTerm) {
                const normalized = primaryTerm.toUpperCase().trim();
                streetDatabase.variationToStreetName.set(normalized, streetName);
                totalVariations++;
            }

            // All alternatives (homonyms, synonyms, candidates)
            const alternatives = streetName.alternatives;
            if (alternatives) {
                for (const homonym of alternatives.homonyms || []) {
                    const term = homonym.term;
                    if (term) {
                        const normalized = term.toUpperCase().trim();
                        if (!streetDatabase.variationToStreetName.has(normalized)) {
                            streetDatabase.variationToStreetName.set(normalized, streetName);
                            totalVariations++;
                        }
                    }
                }
                for (const synonym of alternatives.synonyms || []) {
                    const term = synonym.term;
                    if (term) {
                        const normalized = term.toUpperCase().trim();
                        if (!streetDatabase.variationToStreetName.has(normalized)) {
                            streetDatabase.variationToStreetName.set(normalized, streetName);
                            totalVariations++;
                        }
                    }
                }
                for (const candidate of alternatives.candidates || []) {
                    const term = candidate.term;
                    if (term) {
                        const normalized = term.toUpperCase().trim();
                        if (!streetDatabase.variationToStreetName.has(normalized)) {
                            streetDatabase.variationToStreetName.set(normalized, streetName);
                            totalVariations++;
                        }
                    }
                }
            }
        }

        // Store the database object globally
        window.blockIslandStreetDatabase = streetDatabase;
        console.log(`[STREET DB] Built variation index with ${totalVariations} entries`);

        // Build backward-compatible Set from all variations
        // This ensures code using window.blockIslandStreets.has() continues to work
        window.blockIslandStreets = new Set(streetDatabase.variationToStreetName.keys());

        console.log(`✅ Loaded ${streetNameObjects.length} Block Island streets with ${totalVariations} variations`);

        return window.blockIslandStreets;

    } catch (error) {
        console.error('❌ Failed to load Block Island streets:', error);
        throw error;
    }
}

/**
 * Enhanced Block Island address processing with street name matching and preservation
 * Applies Block Island completion logic and preserves original street names (no abbreviation)
 * @param {Object} processedAddress - Address object from processAddress()
 * @param {string} sourceType - Data source type ('VisionAppraisal', 'Bloomerang', etc.)
 * @param {string} fieldName - Field name for data lineage
 * @returns {Object} Enhanced address with Block Island completion and preserved street names
 */
function enhanceAddressWithBlockIslandLogic(processedAddress, sourceType, fieldName) {
    // Rule 1: VisionAppraisal property location addresses - complete missing fields if already detected as BI
    if (sourceType === 'VisionAppraisal' && fieldName === 'propertyLocation' &&
        processedAddress.isBlockIslandAddress && processedAddress.needsBlockIslandForcing) {
        processedAddress.city = 'Block Island';
        processedAddress.state = 'RI';
        processedAddress.zip = '02807';
        // Keep existing blockIslandDetectionMethod from detection function

        // Preserve original street name by reconstructing from original address
        if (processedAddress.original) {
            const originalMatch = processedAddress.original.match(/(\d+)\s+(.*?)(?:\s*::#\^#::|$)/i);
            if (originalMatch) {
                const fullStreet = originalMatch[2].trim();
                processedAddress.street = fullStreet;
                processedAddress.type = null; // Don't abbreviate
            }
        }

        return processedAddress;
    }

    // Rule 2: Complete missing fields if street database detected Block Island
    if (processedAddress.isBlockIslandAddress && processedAddress.needsBlockIslandForcing &&
        processedAddress.blockIslandDetectionMethod === 'street' && window.blockIslandStreets && processedAddress.street) {
        const streetToCheck = processedAddress.street.toUpperCase().trim();

        // Build comprehensive street check list
        const streetChecks = [
            streetToCheck,                           // "CORN NECK"
            `OFF ${streetToCheck}`,                  // "OFF CORN NECK"
            streetToCheck.replace(/\s+/g, ' ')       // Normalize spaces
        ];

        // Add numbered variations if we have a street number
        if (processedAddress.number) {
            streetChecks.push(`${processedAddress.number} ${streetToCheck}`);
            streetChecks.push(`${processedAddress.number} OFF ${streetToCheck}`);
        }

        // Use shared helper function for street matching with corroboration
        const streetMatchResult = checkBlockIslandStreetMatch(processedAddress.original || '', streetChecks);
        if (streetMatchResult.isMatch) {
            processedAddress.city = 'Block Island';
            processedAddress.state = 'RI';
            processedAddress.zip = '02807';
            processedAddress.isBlockIslandAddress = true;
            processedAddress.blockIslandReason = `Matched BI street: ${streetMatchResult.matchedStreet}`;

            // Preserve original street name
            if (processedAddress.original) {
                const originalMatch = processedAddress.original.match(/(\d+)\s+(.*?)(?:\s*::#\^#::|$)/i);
                if (originalMatch) {
                    const fullStreet = originalMatch[2].trim();
                    processedAddress.street = fullStreet;
                    processedAddress.type = null;
                }
            }

            return processedAddress;
        }
    }

    // Rule 3: Complete any Block Island address that needs forcing (regardless of source)
    if (processedAddress.isBlockIslandAddress && processedAddress.needsBlockIslandForcing) {
        if (!processedAddress.city) processedAddress.city = 'Block Island';
        if (!processedAddress.state) processedAddress.state = 'RI';
        if (!processedAddress.zip) processedAddress.zip = '02807';
    }

    return processedAddress;
}

/**
 * Create Address ComplexIdentifier from processed address data
 * Converts output from processAddress() function to Address instance
 * @param {Object} processedAddress - Output from processAddress() function
 * @param {string} fieldName - Field name for data lineage
 * @returns {Address} New Address instance
 */
function createAddressFromParsedData(processedAddress, fieldName) {
    if (!processedAddress || !processedAddress.original) {
        throw new Error('Invalid processed address data - missing original address');
    }

    try {
        return Address.fromProcessedAddress(processedAddress, fieldName);
    } catch (error) {
        console.error('Error creating Address from processed data:', error);
        console.error('Processed address data:', processedAddress);
        throw error;
    }
}

/**
 * =============================================================================
 * GENERALIZED ADDRESS PROCESSING ARCHITECTURE
 * =============================================================================
 *
 * New generalized architecture that decomposes processAddress() into configurable
 * preprocess→parse→post-process phases. Supports both VisionAppraisal and Bloomerang
 * data sources with parallel implementation for safety.
 *
 * IMPORTANT: Original processAddress() function preserved above - do not modify
 * until migration is complete and tested.
 */

/**
 * Phase 1: Preprocessing - VisionAppraisal Logic (Extracted from processAddress)
 * Handles recipient extraction, tag cleaning, and placeholder number logic
 * @param {string} addressString - Raw address string
 * @param {string} sourceType - Data source type ('VisionAppraisal', 'Bloomerang', etc.)
 * @param {string} fieldName - Field name for data lineage
 * @returns {Object} Preprocessing result with finalAddressString and metadata
 */
function preprocessAddress(addressString, sourceType, fieldName) {
    // Special field handling first (BI PO Box, BI Street)
    if (fieldName === 'BI PO Box') {
        return {
            finalAddressString: `PO Box ${addressString.trim()}, New Shoreham, RI 02807`,
            originalString: addressString,
            recipientDetails: null,
            usedPlaceholderNumber: false,
            specialHandling: 'BI_PO_BOX'
        };
    }

    if (fieldName === 'BI Street') {
        const streetData = addressString.trim();
        if (/^\d+/.test(streetData)) {
            return {
                finalAddressString: `${streetData}, Block Island, RI 02807`,
                originalString: addressString,
                recipientDetails: null,
                usedPlaceholderNumber: false,
                specialHandling: 'BI_STREET'
            };
        }
    }

    // Standard preprocessing - extracted from processAddress lines 472-492
    // 1. Extract recipient details before tag cleaning
    const recipientExtractionResult = extractRecipientDetails(addressString.trim());
    const addressAfterRecipientExtraction = recipientExtractionResult.addressString;
    const recipientDetails = recipientExtractionResult.recipientDetails;

    // 2. Apply VisionAppraisal tag cleaning
    const cleanedAddressString = cleanVisionAppraisalTags(addressAfterRecipientExtraction);

    // 3. Block Island placeholder number logic
    const preParseCheck = preParseBlockIslandCheck(addressAfterRecipientExtraction.trim(), sourceType, fieldName);
    let addressForParsing = cleanedAddressString;
    let usedPlaceholderNumber = false;

    if (preParseCheck.isBlockIsland && preParseCheck.matchedStreet) {
        const startsWithNumber = /^\d+\s/.test(cleanedAddressString.trim());
        if (!startsWithNumber) {
            addressForParsing = "9999 " + cleanedAddressString;
            usedPlaceholderNumber = true;
        }
    }

    return {
        finalAddressString: addressForParsing,
        originalString: addressString,
        recipientDetails: recipientDetails,
        usedPlaceholderNumber: usedPlaceholderNumber,
        preParseBlockIslandCheck: preParseCheck,
        specialHandling: null
    };
}

/**
 * Phase 1: Preprocessing - Bloomerang Logic
 * Builds full address from component fields and extracts reliable components
 * @param {Object} inputData - Object with addressSet and fieldName
 * @param {string} sourceType - Data source type ('Bloomerang')
 * @param {string} fieldName - Field name for data lineage
 * @returns {Object} Preprocessing result with finalAddressString and reliable components
 */
function preprocessBloomerangAddress(inputData, sourceType, fieldName) {
    const addressSet = inputData.addressSet;

    // Build full address from component fields using existing buildFullAddress
    const fullAddress = buildFullAddress(addressSet);

    // Extract reliable components for post-processing override
    const reliableComponents = {
        city: (addressSet.city || '').trim(),
        state: (addressSet.state || '').trim(),
        zip: (addressSet.zip || '').trim()
    };

    return {
        finalAddressString: fullAddress,
        originalString: fullAddress,  // For Bloomerang, these are the same
        recipientDetails: null,       // Bloomerang doesn't have recipient extraction
        usedPlaceholderNumber: false, // Bloomerang doesn't use placeholder logic
        reliableComponents: reliableComponents,
        specialHandling: null
    };
}

/**
 * Phase 2: Parsing - Common for All Sources (Extracted from processAddress)
 * Handles core address parsing using parseAddress.parseLocation library
 * @param {Object} preprocessResult - Result from preprocessing phase
 * @returns {Object|null} Parsed address object or null if parsing failed
 */
function parseAddressPhase(preprocessResult) {
    // Handle special cases that bypass normal parsing
    if (preprocessResult.specialHandling === 'BI_PO_BOX' ||
        preprocessResult.specialHandling === 'BI_STREET') {
        // These already have generated full addresses, just parse them
        return parseAddress.parseLocation(preprocessResult.finalAddressString);
    }

    // Standard parsing - extracted from processAddress line 494
    const parsed = parseAddress.parseLocation(preprocessResult.finalAddressString);

    // Validation - extracted from processAddress lines 518-520
    if (!parsed || (!parsed.city && !parsed.zip && !parsed.street)) {
        return null; // Failed to parse meaningfully
    }

    return parsed;
}

/**
 * Phase 3: Post-Processing - VisionAppraisal Logic (Extracted from processAddress)
 * Handles Block Island detection, normalization, and two-path processing
 * @param {Object} parsed - Parsed address object from parsing phase
 * @param {Object} preprocessResult - Result from preprocessing phase
 * @param {string} sourceType - Data source type
 * @param {string} fieldName - Field name for data lineage
 * @returns {Object} Final processed address object
 */
function postProcessAddress(parsed, preprocessResult, sourceType, fieldName) {
    // Handle special cases first - extracted from processAddress lines 441-448, 461-468
    if (preprocessResult.specialHandling === 'BI_PO_BOX') {
        const processedAddress = createProcessedAddressObject(
            parsed, preprocessResult.originalString, sourceType, fieldName
        );
        processedAddress.isBlockIslandAddress = true;
        processedAddress.blockIslandReason = 'BI PO Box generated address';
        processedAddress.generatedAddress = preprocessResult.finalAddressString;
        return processedAddress;
    }

    if (preprocessResult.specialHandling === 'BI_STREET') {
        const processedAddress = createProcessedAddressObject(
            parsed, preprocessResult.originalString, sourceType, fieldName
        );
        processedAddress.isBlockIslandAddress = true;
        processedAddress.blockIslandReason = 'BI Street generated address with Fire Number';
        processedAddress.generatedAddress = preprocessResult.finalAddressString;
        return processedAddress;
    }

    // Standard post-processing - extracted from processAddress lines 522-573
    // 1. Apply Block Island city normalization
    const normalized = normalizeBlockIslandCity(parsed);

    // 2. Block Island detection
    const detectionResult = detectBlockIslandAddress(
        normalized, preprocessResult.originalString, sourceType, fieldName
    );

    // 3. Create base address object
    const processedAddress = createProcessedAddressObject(
        normalized,
        preprocessResult.originalString,
        sourceType,
        fieldName,
        preprocessResult.usedPlaceholderNumber,
        preprocessResult.recipientDetails
    );

    // 4. Apply detection results
    processedAddress.isBlockIslandAddress = detectionResult.isBI;
    processedAddress.needsBlockIslandForcing = detectionResult.needsForcing;
    processedAddress.blockIslandDetectionMethod = detectionResult.method;
    if (detectionResult.matchedStreet) {
        processedAddress.matchedStreet = detectionResult.matchedStreet;
    }

    // 5. Restore street number if placeholder was used
    if (preprocessResult.usedPlaceholderNumber && processedAddress.number === "9999") {
        processedAddress.number = null;
        processedAddress.placeholderNumberRemoved = true;

        if (!detectionResult.isBI) {
            console.warn('Unexpected: Restored placeholder in non-Block Island address', {
                address: preprocessResult.originalString,
                preParseBI: preprocessResult.preParseBlockIslandCheck?.isBlockIsland,
                fullDetectionBI: detectionResult.isBI,
                preParseMethod: preprocessResult.preParseBlockIslandCheck?.matchedStreet ? 'street' : 'visionappraisal',
                fullDetectionMethod: detectionResult.method
            });
        }
    }

    // 6. Two-path processing decision - extracted from processAddress lines 556-573
    if (detectionResult.isBI) {
        // Block Island specialized processing
        return createBlockIslandAddress(
            normalized,
            preprocessResult.originalString,
            sourceType,
            fieldName,
            detectionResult.matchedStreet,
            preprocessResult.usedPlaceholderNumber
        );
    } else {
        // Non-Block Island processing
        if (normalized.street && normalized.suffix) {
            const addressPart = preprocessResult.originalString.split('::#^#::')[0];
            const streetWithoutNumber = normalized.number
                ? addressPart.replace(new RegExp(`^\\s*${normalized.number}\\s+`), '')
                : addressPart;
            processedAddress.street = streetWithoutNumber;
        }
        return processedAddress;
    }
}

/**
 * Phase 3: Post-Processing - Bloomerang Logic (Extends VisionAppraisal Logic)
 * Runs standard post-processing then overrides with reliable field data
 * @param {Object} parsed - Parsed address object from parsing phase
 * @param {Object} preprocessResult - Result from preprocessing phase
 * @param {string} sourceType - Data source type
 * @param {string} fieldName - Field name for data lineage
 * @returns {Object} Final processed address object with Bloomerang overrides
 */
function postProcessBloomerangAddress(parsed, preprocessResult, sourceType, fieldName) {
    // Run standard post-processing first (VisionAppraisal logic)
    const standardResult = postProcessAddress(parsed, preprocessResult, sourceType, fieldName);

    // Override with reliable field data from Bloomerang CSV
    if (preprocessResult.reliableComponents) {
        if (preprocessResult.reliableComponents.city) {
            standardResult.city = preprocessResult.reliableComponents.city;
        }
        if (preprocessResult.reliableComponents.state) {
            standardResult.state = preprocessResult.reliableComponents.state;
        }
        if (preprocessResult.reliableComponents.zip) {
            standardResult.zip = preprocessResult.reliableComponents.zip;
        }
    }

    return standardResult;
}

/**
 * Generalized Address Processing Function
 * Main entry point for new architecture - supports multiple data sources via configuration
 * @param {Object} inputData - Input data structure (varies by data source)
 * @param {Object} dataSourceConfig - Configuration object defining preprocess/postprocess functions
 * @returns {Object|null} Processed address object or null if processing failed
 */
function processAddressGeneralized(inputData, dataSourceConfig) {
    // Validation
    if (!inputData || !dataSourceConfig) {
        console.log('❌ PROCESSADDRESSGENERALIZED: Invalid input - missing inputData or dataSourceConfig');
        return null;
    }

    if (!dataSourceConfig.preprocess || !dataSourceConfig.postProcess) {
        console.log('❌ PROCESSADDRESSGENERALIZED: Invalid configuration - missing preprocess or postProcess functions');
        return null;
    }

    try {
        // Phase 1: PREPROCESS - source-specific input preparation
        const preprocessResult = dataSourceConfig.preprocess(inputData, dataSourceConfig.sourceType, inputData.fieldName);

        if (!preprocessResult || !preprocessResult.finalAddressString) {
            console.log('❌ PROCESSADDRESSGENERALIZED: Preprocessing failed or returned invalid result');
            return null;
        }

        // Phase 2: PARSE - common parsing via existing library
        const parsed = parseAddressPhase(preprocessResult);
        if (!parsed) {
            console.log(`❌ PROCESSADDRESSGENERALIZED: Parsing failed for address: ${preprocessResult.finalAddressString}`);
            return null;
        }

        // Phase 3: POST-PROCESS - source-specific enhancement
        const result = dataSourceConfig.postProcess(parsed, preprocessResult, dataSourceConfig.sourceType, inputData.fieldName);

        return result;

    } catch (error) {
        console.error('❌ PROCESSADDRESSGENERALIZED: Error in generalized processing:', error);
        console.error('Input data:', inputData);
        console.error('Config:', dataSourceConfig);
        return null;
    }
}

/**
 * Data Source Configurations
 * Define preprocessing and post-processing behavior for different data sources
 */

// VisionAppraisal configuration (preserves existing processAddress behavior exactly)
const visionAppraisalConfig = {
    sourceType: 'VisionAppraisal',
    preprocess: preprocessAddress,        // Uses existing VisionAppraisal preprocessing logic
    postProcess: postProcessAddress       // Uses existing VisionAppraisal post-processing logic
};

// Bloomerang configuration (new functionality for component field override)
const bloomerangConfig = {
    sourceType: 'Bloomerang',
    preprocess: preprocessBloomerangAddress,  // Builds full address from component fields
    postProcess: postProcessBloomerangAddress // Overrides with reliable field data
};