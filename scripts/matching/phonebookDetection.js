/**
 * PhonebookDetection - Non-human detection and heuristic matching
 *
 * Contains:
 * - Non-human entity detection (NON_HUMAN_TERMS, KNOWN_NONHUMAN_NAMES, detectNonHumanType)
 * - Entity helper functions (getEntityNameStr, getEntityFireNum, etc.)
 * - Heuristic matching for unmatched phonebook records
 *
 * Dependencies:
 * - levenshteinSimilarity() from utils.js
 * - window.MATCH_CRITERIA from unifiedEntityBrowser.js
 *
 * Split from phonebookMatcher.js Session 126
 * @see reference_phonebookIntegration.md
 */

// =============================================================================
// NON-HUMAN DETECTION
// Validated Session 118 P-2: 98.6% detection rate, 0% false positive rate
// Single return type: 'NONHUMAN' or null (no sub-classification)
// =============================================================================

/**
 * Merged set of all non-human indicator terms.
 * Checked word-by-word against name parts (exact word match via Set.has).
 * Derived from Session 114 term lists, simplified in Session 118 P-2 review.
 */
const NON_HUMAN_TERMS = new Set([
    // Legal/corporate forms
    'LLC', 'INC', 'CORP', 'TRUST', 'TRUSTS', 'TRUSTEE', 'TRUSTEES',
    'ESTATE', 'FOUNDATION', 'ASSOCIATION', 'ASSOC', 'HOA', 'SOCIETY',
    'COMPANY', 'ENTERPRISES', 'PROPERTIES', 'INVESTMENTS', 'HOLDINGS',
    'MANAGEMENT', 'SERVICES', 'PARTNERS', 'PARTNERSHIP', 'CO', 'LTD',
    'LIMITED', 'INCORPORATED', 'CONSERVANCY', 'IRT', 'IRTRUST', 'QPRT',
    // Lodging/hospitality
    'HOTEL', 'MOTEL', 'INN', 'RESORT', 'SUITES', 'COTTAGE', 'COTTAGES',
    // Food/drink
    'RESTAURANT', 'RESTAURANTS', 'DELI', 'CAFE', 'COFFEE', 'PIZZA',
    'BAR', 'PUB', 'TAVERN', 'TAPROOM', 'BAKERY', 'CATERING',
    'SEAFOOD', 'TRATTORIA',
    // Retail
    'STORE', 'STORES', 'SHOP', 'SHOPS', 'MARKET', 'MARKETS',
    'GALLERY', 'GALLERIES', 'PHARMACY', 'FLORIST',
    'HARDWARE', 'LUMBER', 'NURSERY', 'SUPPLY', 'SUPPLIES',
    'APPLIANCE', 'APPLIANCES', 'CABINETS', 'EQUIPMENT',
    'LIQUORS', 'WAREHOUSE',
    // Real estate/finance
    'REALTY', 'REALTOR', 'INSURANCE', 'AGENCY', 'AGENCIES',
    'RENTAL', 'RENTALS',
    // Transportation
    'AIRLINE', 'AIRLINES', 'FERRY', 'FERRIES', 'TAXI', 'CAB',
    'EXPRESS', 'CHARTER', 'CHARTERS', 'MOVERS', 'MOVING', 'PARKING',
    // Construction/trades
    'CONSTRUCTION', 'CONTRACTOR', 'CONTRACTORS', 'CONTRACTING',
    'PLUMBING', 'HEATING', 'COOLING', 'ROOFING', 'PAINTING',
    'ELECTRIC', 'ELECTRICAL', 'EXCAVATION', 'EXCAVATING',
    'PAVING', 'MASONRY', 'CARPENTRY', 'BUILDERS',
    'REPAIR', 'IMPROVEMENT',
    // Professional services
    'ATTORNEY', 'ATTORNEYS', 'LAW', 'ACCOUNTING', 'CONSULTING',
    'ARCHITECTURE', 'DESIGN', 'DESIGNS', 'STUDIO', 'STUDIOS',
    'OPTOMETRIST',
    // Marine/outdoor
    'MARINA', 'BOAT', 'BOATS', 'DIVE', 'DOCK',
    // Other services
    'LANDSCAPING', 'LANDSCAPE', 'CLEANING', 'STORAGE',
    'DISPOSAL', 'SANITATION', 'REFUSE', 'RECYCLING',
    'SPA', 'SALON', 'FITNESS', 'GYM',
    'CLINIC', 'MEDICAL', 'DENTAL', 'VETERINARY', 'VET',
    'AUTO', 'AUTOMOTIVE',
    'GARDEN', 'GARDENS',
    'DIRECTORY',
    // Government
    'DEPT', 'DEPARTMENT',
    'OFFICE', 'CLERK', 'MANAGER',
    'ASSESSOR', 'COLLECTOR', 'TREASURER',
    'HARBORMASTER', 'DOCKMASTER',
    'DIRECTOR', 'SUPERINTENDENT',
    'LIBRARIAN', 'LIBRARY',
    'POLICE', 'FIRE',
    'HIGHWAY', 'ZONING', 'PLANNING',
    'INSPECTOR', 'CONSTABLE', 'WARDEN',
    'COUNCIL', 'COMMISSIONER', 'SELECTMAN',
    'COMMISSION', 'LICENSE', 'SECURITY',
    'OFFICIAL', 'PHYSICIAN', 'GARAGE', 'STATION',
    // Nonprofit/religious (PARISH removed — legitimate surname)
    'MEMORIAL', 'HOUSING', 'RESCUE', 'SQUAD',
    'VOLUNTEER', 'AMBULANCE',
    'RECTORY', 'CHURCH', 'DIOCESE',
    'SYNAGOGUE', 'TEMPLE', 'CEMETERY',
    'HISTORICAL', 'PRESERVATION',
    // From regex patterns (single-word, moved to terms in P-2)
    'NAVIGATION', 'ENGINEERING', 'INTERSTATE',
    'SUBARU', 'TOYOTA', 'HONDA', 'CHEVROLET',  // FORD removed — common surname
    'HIDEOUT', 'HIDEAWAY',
    // Added in Session 118 P-2 review
    'ASSOCIATES', 'SERVICE', 'CENTER', 'SYSTEMS', 'SOURCE', 'DAUGHTER',
    'VICTIMS', 'VIOLENCE'
]);

/**
 * Known non-human names (multi-word phrases and specific business names).
 * Checked via substring match against space-normalized full name string.
 * Input is normalized: multi-spaces collapsed, curly apostrophes converted to straight.
 */
const KNOWN_NONHUMAN_NAMES = new Set([
    'TINY COTTAGES', 'LIBERTY CEDAR', 'MR. KLEAN', 'ISLANDSCAPE',
    'CLASSIC CHIMNEY', 'LAZY FISH',
    "CREW'S HIDEOUT", "WINFIELD'S",
    "FARMER'S DAUGHTER", "PASQUALE'S NAPOLETANA", "DEAD EYE DICK'S",
    'INTERSTATE NAVIGATION', 'ENTECH ENGINEERING', 'VALENTI SUBARU/TOYOTA',
    'GREENLEAF LANDSCAPING', 'SEA BREEZE INN', 'OLD HARBOR BIKE SHOP',
    'DOVE & DISTAFF', 'WAVE', 'LOS GATTOS', 'GLOBALPARKING',
    // Added in Session 118 P-2 (from regex patterns → multi-word known names)
    'BLOCK ISLAND', 'SEE AD', 'SEE ADS', 'TAKE-OUT', 'TAKE OUT',
    // Acronym without generic term
    'F.I.S.H'
]);

/**
 * Detect whether a phonebook record represents a non-human entity.
 * 5-priority detection, single return type.
 *
 * @param {Object} record - Parsed phonebook record (from phonebookParser.js)
 * @returns {string|null} 'NONHUMAN' if detected, null if appears to be a person
 */
function detectNonHumanType(record) {
    const parts = [record.name.firstName, record.name.secondName,
                   record.name.lastName, record.name.otherNames].filter(Boolean);
    const fullName = parts.join(' ').toUpperCase().trim();
    const firstName = (record.name.firstName || '').trim();

    // --- PRIORITY 1: Dash-prefix pattern (structural) ---
    if (firstName === '-' || firstName === '\u2013' || firstName === '\u2014') {
        return 'NONHUMAN';
    }
    if (/^[\u2013\u2014-]\s/.test(fullName)) {
        return 'NONHUMAN';
    }

    // --- PRIORITY 2: Possessive apostrophe-s on any name part ---
    for (const part of parts) {
        const upper = part.toUpperCase();
        if (upper.length >= 4 && (upper.endsWith("'S") || upper.endsWith('\u2019S'))) {
            return 'NONHUMAN';
        }
    }

    // --- PRIORITY 3: Known non-human names (substring match) ---
    // Normalize: collapse multi-spaces, convert curly apostrophes to straight
    const naturalName = parts.join(' ').toUpperCase()
        .replace(/\s+/g, ' ').replace(/\u2019/g, "'").trim();
    const reversedName = [record.name.lastName, record.name.firstName,
                          record.name.secondName].filter(Boolean)
        .join(' ').toUpperCase().replace(/\s+/g, ' ').replace(/\u2019/g, "'").trim();
    for (const known of KNOWN_NONHUMAN_NAMES) {
        if (naturalName.includes(known) || reversedName.includes(known)) {
            return 'NONHUMAN';
        }
    }

    // --- PRIORITY 4: Single-word term check ---
    const allWords = fullName.split(/[\s/]+/).filter(w => w.length > 0);
    for (const word of allWords) {
        const clean = word.replace(/[^A-Z]/gi, '').toUpperCase();
        if (!clean || clean.length < 2) continue;
        if (NON_HUMAN_TERMS.has(clean)) return 'NONHUMAN';
    }

    // --- PRIORITY 5: Parser flags fallback ---
    if (record.name.isBusiness || record.name.entityType === 'Business' ||
        record.name.entityType === 'LegalConstruct' || record.name.caseType === 'case0') {
        return 'NONHUMAN';
    }

    return null;
}

// =============================================================================
// HEURISTIC MATCHING - HELPER FUNCTIONS
// =============================================================================

// NOTE: levenshteinSimilarity() is defined in utils.js (loaded before this file).
// It uses variable substitution costs tuned for name comparison:
//   vowel-vowel ~0.079, consonant-consonant 1.0, vowel-consonant ~0.632.
// All code in this file uses that existing function — no duplicate needed.

/**
 * Check if two name words are adjacent in a string.
 * @param {string} word1
 * @param {string} word2
 * @param {string} fullString
 * @returns {boolean}
 */
function areNamesProximate(word1, word2, fullString) {
    if (!word1 || !word2 || !fullString) return false;
    const upper = fullString.toUpperCase();
    const w1 = word1.toUpperCase();
    const w2 = word2.toUpperCase();
    const separators = [' ', ', ', ','];
    for (const sep of separators) {
        if (upper.includes(w1 + sep + w2)) return true;
        if (upper.includes(w2 + sep + w1)) return true;
    }
    return false;
}

/**
 * @param {string} str
 * @returns {boolean} True if str is a single letter A-Z
 */
function isInitial(str) {
    return str && str.length === 1 && /[A-Z]/i.test(str);
}

/**
 * Strip possessive suffix ('S or curly-'S) from a word.
 * Only strips if result is at least 2 chars.
 * @param {string} w
 * @returns {string}
 */
function stripPossessive(w) {
    if (w.length >= 4 && (w.endsWith("'S") || w.endsWith('\u2019S'))) {
        return w.slice(0, -2);
    }
    return w;
}

// =============================================================================
// ENTITY NAME/ADDRESS EXTRACTION
// For matching phonebook records against non-human entity name strings
// =============================================================================

/**
 * Extract the primary name string from any entity type.
 * @param {Object} entity
 * @returns {string}
 */
function getEntityNameStr(entity) {
    const n = entity.name;
    if (!n) return '';
    if (n.primaryAlias?.term) return String(n.primaryAlias.term);
    if (n.identifier?.primaryAlias?.term) return String(n.identifier.primaryAlias.term);
    if (n.fullHouseholdName) return String(n.fullHouseholdName);
    if (n.termOfAddress) return String(n.termOfAddress);
    if (n.completeName) return String(n.completeName);
    if (n.firstName || n.lastName) return [n.firstName, n.lastName].filter(Boolean).join(' ');
    return '';
}

/**
 * Extract and normalize fire number from an entity.
 * Strips non-digit characters; excludes PO Box indicator "3499".
 * @param {Object} entity
 * @returns {string|null}
 */
function getEntityFireNum(entity) {
    const locId = entity.locationIdentifier;
    if (locId?.primaryAlias?.term) {
        const raw = String(locId.primaryAlias.term);
        const digits = raw.replace(/\D/g, '');
        if (digits && digits !== '3499') return digits;
    }
    const streetNum = entity.contactInfo?.primaryAddress?.streetNumber;
    if (streetNum?.term) {
        const digits = String(streetNum.term).replace(/\D/g, '');
        if (digits) return digits;
    }
    return null;
}

/**
 * Extract normalized street name from an entity.
 * @param {Object} entity
 * @returns {string}
 */
function getEntityStreet(entity) {
    const streetName = entity.contactInfo?.primaryAddress?.streetName;
    if (streetName?.term) return String(streetName.term).toUpperCase().trim();
    return '';
}

/**
 * Extract PO box number from an entity.
 * @param {Object} entity
 * @returns {string|null}
 */
function getEntityPOBox(entity) {
    if (entity.contactInfo?.poBox?.primaryAlias?.term) {
        return String(entity.contactInfo.poBox.primaryAlias.term).trim().toUpperCase();
    }
    const addr = entity.contactInfo?.primaryAddress;
    if (addr?.secUnitType?.term) {
        const unitType = String(addr.secUnitType.term).toUpperCase();
        if (unitType.includes('PO') || unitType.includes('BOX')) {
            if (addr.secUnitNum?.term) {
                return String(addr.secUnitNum.term).trim().toUpperCase();
            }
        }
    }
    return null;
}

// =============================================================================
// LAST-NAME FREQUENCY & RARITY SCORING
// =============================================================================

/**
 * Build a frequency table of last names from EntityGroup name collections.
 * Counts distinct name entries (by key) per uppercase last name.
 *
 * @param {EntityGroupDatabase} groupDb
 * @returns {Object} frequencyTable - { LASTNAME: count, ... }
 */
function buildLastNameFrequencyTable(groupDb) {
    const lastNameByKey = {};
    for (const group of groupDb.getAllGroups()) {
        const collections = [group.individualNames, group.unrecognizedIndividualNames];
        for (const coll of collections) {
            if (!coll) continue;
            for (const [nameKey, nameObj] of Object.entries(coll)) {
                if (!nameObj || !nameObj.lastName) continue;
                const ln = String(nameObj.lastName).toUpperCase().trim();
                if (ln.length <= 1) continue;
                lastNameByKey[nameKey] = ln;
            }
        }
    }

    const frequencyTable = {};
    for (const ln of Object.values(lastNameByKey)) {
        frequencyTable[ln] = (frequencyTable[ln] || 0) + 1;
    }
    return frequencyTable;
}

/**
 * Score the rarity of a last name (0 = very common, 1 = very rare).
 * Rare names are stronger match signals.
 *
 * @param {string} lastName
 * @param {Object} frequencyTable - from buildLastNameFrequencyTable()
 * @returns {number}
 */
function nameRarityScore(lastName, frequencyTable) {
    const freq = frequencyTable[lastName.toUpperCase().trim()] || 0;
    if (freq === 0) return 1.0;
    if (freq === 1) return 0.95;
    if (freq === 2) return 0.85;
    if (freq <= 4) return 0.70;
    if (freq <= 8) return 0.50;
    if (freq <= 15) return 0.30;
    return 0.10;
}

// =============================================================================
// PHASE 2 HEURISTIC MATCHING
// Word-by-word matching of phonebook names against non-human entity name strings.
// Uses Levenshtein similarity, nickname prefix matching, rarity amplification,
// proximity bonus, and lastName mandatory penalty.
// =============================================================================

/**
 * Build the list of non-human entities from all EntityGroups.
 * Each entry has pre-extracted name words, fire number, street, and PO box.
 *
 * @param {EntityGroupDatabase} groupDb
 * @param {Object} entityDb - unifiedEntityDatabase.entities
 * @returns {Array<Object>}
 */
function buildNonHumanEntityList(groupDb, entityDb) {
    const NON_HUMAN_ENTITY_TYPES = new Set([
        'Business', 'NonHuman', 'LegalConstruct',
        'AggregateHousehold', 'CompositeHousehold'
    ]);
    const entities = [];

    for (const group of groupDb.getAllGroups()) {
        for (const key of group.memberKeys) {
            const entity = entityDb[key];
            if (!entity) continue;
            const typeName = entity.constructor.name;
            if (!NON_HUMAN_ENTITY_TYPES.has(typeName)) continue;

            const nameStr = getEntityNameStr(entity).toUpperCase().trim();
            if (!nameStr) continue;

            entities.push({
                key,
                typeName,
                groupIndex: group.index,
                nameStr,
                nameWords: nameStr.split(/\s+/)
                    .filter(w => w.length > 0 && /[A-Z]/i.test(w))
                    .map(stripPossessive),
                fireNum: getEntityFireNum(entity),
                street: getEntityStreet(entity),
                poBox: getEntityPOBox(entity)
            });
        }
    }

    return entities;
}

/**
 * Heuristic match a single phonebook record against all non-human entities.
 * Returns the top 2 matches by enhanced composite score.
 *
 * @param {Object} record - Parsed phonebook record
 * @param {Array} nonHumanEntities - from buildNonHumanEntityList()
 * @param {Object} frequencyTable - from buildLastNameFrequencyTable()
 * @returns {{ bestMatch: Object|null, secondMatch: Object|null }}
 */
function heuristicMatchRecord(record, nonHumanEntities, frequencyTable) {
    const WORD_THRESHOLD = (typeof window !== 'undefined' &&
        window.MATCH_CRITERIA?.nearMatch?.nameAlone) || 0.845;

    // Build name words from raw name string (bypass parser field designations
    // for firstName/secondName — unreliable for records that failed primary matching)
    const pbRawName = (record.name.raw || '').toUpperCase().trim();
    const pbNameWords = pbRawName.replace(/[,.]/g, ' ').split(/\s+/)
        .filter(w => w.length > 0 && /[A-Z]/i.test(w))
        .map(stripPossessive);

    // Track lastName words (parser designation kept for lastName only)
    const pbLastNameStr = (record.name.lastName || '').toUpperCase().trim();
    const pbLastNameWords = new Set(
        pbLastNameStr.split(/\s+/)
            .filter(w => w.length > 0 && /[A-Z]/i.test(w))
            .map(stripPossessive)
    );
    // All non-lastName words are potential firstName candidates
    const pbOtherWords = new Set(pbNameWords.filter(w => !pbLastNameWords.has(w)));

    // Address info
    const pbFireNum = record.address?.fireNumber || null;
    const pbStreet = (record.address?.streetNormalized ||
                      record.address?.streetWithoutFireNumber ||
                      record.address?.street || '').toUpperCase().trim();
    const pbBox = record.address?.box ? record.address.box.trim().toUpperCase() : null;

    // Rarity score for lastName
    const rarityScore = nameRarityScore(pbLastNameStr, frequencyTable);

    let comp1 = null, comp2 = null;

    for (const nh of nonHumanEntities) {
        let wordMatchTotal = 0;
        let wordMatchCount = 0;
        const wordDetails = [];
        let lastNameMatchedAny = false;
        let lastNameBestEntWord = '';
        let firstNameMatchedAny = false;
        let firstNameBestEntWord = '';
        let initialMatchedSafely = false;

        for (const pbWord of pbNameWords) {
            // Skip single-letter initials (handled in post-loop)
            if (isInitial(pbWord)) continue;

            let bestWordScore = 0;
            let bestEntWord = '';
            let nicknameMatch = false;

            for (const entWord of nh.nameWords) {
                let ws = levenshteinSimilarity(pbWord, entWord);
                let isNickname = false;

                // Nickname prefix rule: shorter word (3+ chars, has consonants and vowels)
                // is the exact beginning of the longer word
                if (ws < WORD_THRESHOLD) {
                    const shorter = pbWord.length <= entWord.length ? pbWord : entWord;
                    const longer = pbWord.length <= entWord.length ? entWord : pbWord;
                    if (shorter.length >= 3 &&
                        /[AEIOU]/.test(shorter) && /[^AEIOU]/.test(shorter) &&
                        longer.startsWith(shorter)) {
                        ws = WORD_THRESHOLD;
                        isNickname = true;
                    }
                }

                if (ws > bestWordScore) {
                    bestWordScore = ws;
                    bestEntWord = entWord;
                    nicknameMatch = isNickname;
                }
            }

            if (bestWordScore >= WORD_THRESHOLD) {
                wordMatchTotal += bestWordScore;
                wordMatchCount++;
                const nickTag = nicknameMatch ? '[nick]' : '';
                wordDetails.push(pbWord + '~' + bestEntWord + '=' +
                    bestWordScore.toFixed(2) + nickTag);

                if (pbLastNameWords.has(pbWord)) {
                    lastNameMatchedAny = true;
                    lastNameBestEntWord = bestEntWord;
                }
                if (pbOtherWords.has(pbWord)) {
                    firstNameMatchedAny = true;
                    firstNameBestEntWord = bestEntWord;
                }
            }
        }

        // Post-loop initial handling: if lastName matched and an initial is
        // adjacent to the lastName word in the entity name, count it
        if (lastNameMatchedAny && !initialMatchedSafely) {
            for (const otherWord of pbOtherWords) {
                if (!isInitial(otherWord)) continue;
                const initialLetter = otherWord.toUpperCase();
                for (let wi = 0; wi < nh.nameWords.length; wi++) {
                    const ew = nh.nameWords[wi];
                    if (levenshteinSimilarity(ew, lastNameBestEntWord) < 0.95) continue;
                    const checkAdj = (adjIdx) => {
                        if (adjIdx < 0 || adjIdx >= nh.nameWords.length) return false;
                        const adj = nh.nameWords[adjIdx];
                        return adj.length > 1 && adj[0] === initialLetter;
                    };
                    if (checkAdj(wi - 1) || checkAdj(wi + 1)) {
                        initialMatchedSafely = true;
                        wordMatchTotal += 0.5;
                        wordMatchCount++;
                        wordDetails.push(otherWord + '~initial(safe)=0.50');
                        firstNameMatchedAny = true;
                        break;
                    }
                }
                if (initialMatchedSafely) break;
            }
        }

        // Address evidence
        let fireNumMatch = 0;
        if (pbFireNum && nh.fireNum && pbFireNum === nh.fireNum) fireNumMatch = 1;
        let poBoxMatch = 0;
        if (pbBox && nh.poBox && pbBox === nh.poBox) poBoxMatch = 1;
        let streetScore = 0;
        if (pbStreet && nh.street) streetScore = levenshteinSimilarity(pbStreet, nh.street);

        // Base composite (original formula)
        const baseComposite = wordMatchTotal + fireNumMatch + poBoxMatch + streetScore;
        if (baseComposite <= 0) continue;

        // Enhanced composite: rarity amplifier + proximity bonus + lastName penalty
        let enhancedComposite = baseComposite;
        if (lastNameMatchedAny) {
            enhancedComposite *= (1 + 0.3 * rarityScore);
        }
        if (lastNameMatchedAny && firstNameMatchedAny) {
            if (areNamesProximate(lastNameBestEntWord, firstNameBestEntWord, nh.nameStr)) {
                enhancedComposite += 0.3;
            }
        }
        if (!lastNameMatchedAny && wordMatchCount > 0) {
            enhancedComposite *= 0.3;
        }

        const entry = {
            baseComposite,
            enhancedComposite,
            wordMatchTotal,
            wordMatchCount,
            wordDetails,
            fireNumMatch,
            poBoxMatch,
            streetScore,
            lastNameMatched: lastNameMatchedAny,
            firstNameMatched: firstNameMatchedAny,
            initialSafe: initialMatchedSafely,
            entityName: nh.nameStr,
            entityType: nh.typeName,
            groupIndex: nh.groupIndex,
            entityKey: nh.key
        };

        if (!comp1 || enhancedComposite > comp1.enhancedComposite) {
            comp2 = comp1;
            comp1 = entry;
        } else if (!comp2 || enhancedComposite > comp2.enhancedComposite) {
            comp2 = entry;
        }
    }

    return { bestMatch: comp1, secondMatch: comp2 };
}

/**
 * Classify the confidence level of a heuristic match.
 * HIGH: lastName + firstName matched, enhanced >= 3.0
 * MEDIUM: lastName + (firstName OR address evidence), enhanced >= 2.0
 *
 * @param {Object|null} match - A match entry from heuristicMatchRecord()
 * @returns {string|null} 'HIGH', 'MEDIUM', or null
 */
function classifyHeuristicConfidence(match) {
    if (!match) return null;
    if (match.lastNameMatched && match.firstNameMatched &&
        match.enhancedComposite >= 3.0) {
        return 'HIGH';
    }
    if (match.lastNameMatched &&
        (match.firstNameMatched || match.fireNumMatch || match.poBoxMatch) &&
        match.enhancedComposite >= 2.0) {
        return 'MEDIUM';
    }
    return null;
}

/**
 * Run heuristic matching on a batch of no-match phonebook records.
 * Builds required data structures once, then matches each record.
 *
 * @param {Array<Object>} records - Array of phonebook records to match
 * @param {EntityGroupDatabase} groupDb
 * @param {Object} entityDb - unifiedEntityDatabase.entities
 * @returns {Array<{ record: Object, detection: string|null, bestMatch: Object|null,
 *           secondMatch: Object|null, confidence: string|null }>}
 */
function heuristicMatchAllNoMatchRecords(records, groupDb, entityDb) {
    console.log('=== HEURISTIC MATCHING START ===');
    console.log('Records: ' + records.length);

    const frequencyTable = buildLastNameFrequencyTable(groupDb);
    console.log('Last-name frequency table: ' +
        Object.keys(frequencyTable).length + ' distinct names');

    const nonHumanEntities = buildNonHumanEntityList(groupDb, entityDb);
    console.log('Non-human entities: ' + nonHumanEntities.length);

    const results = [];
    let nonHumanCount = 0;
    let highCount = 0;
    let mediumCount = 0;

    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const detection = detectNonHumanType(record);

        if (detection) {
            nonHumanCount++;
            results.push({
                record, detection,
                bestMatch: null, secondMatch: null, confidence: null
            });
            continue;
        }

        const { bestMatch, secondMatch } = heuristicMatchRecord(
            record, nonHumanEntities, frequencyTable
        );
        const confidence = classifyHeuristicConfidence(bestMatch);

        if (confidence === 'HIGH') highCount++;
        else if (confidence === 'MEDIUM') mediumCount++;

        results.push({ record, detection: null, bestMatch, secondMatch, confidence });

        if ((i + 1) % 100 === 0) {
            console.log('  Progress: ' + (i + 1) + '/' + records.length);
        }
    }

    console.log('=== HEURISTIC MATCHING COMPLETE ===');
    console.log('  Non-human detected: ' + nonHumanCount);
    console.log('  Person HIGH confidence: ' + highCount);
    console.log('  Person MEDIUM confidence: ' + mediumCount);
    console.log('  Person unmatched: ' +
        (records.length - nonHumanCount - highCount - mediumCount));

    return results;
}

console.log('PhonebookDetection (non-human detection + heuristic matching) loaded.');
