/**
 * =============================================================================
 * STREETNAME ALIAS DATABASE CONVERTER
 * =============================================================================
 *
 * Phase 2 of StreetName Alias Architecture Implementation
 *
 * PURPOSE:
 * Converts the VA Processing Street File (simple JSON array of strings) into
 * the StreetName Alias Database format (consolidated StreetName objects with
 * aliases for similar/variant street names).
 *
 * WHAT THIS SCRIPT DOES:
 * 1. Loads the VA Processing Street File (219 street strings)
 * 2. Compares all pairs of streets using Levenshtein similarity
 *    - Uses StreetTypeAbbreviationManager for consistent comparison
 *    - Only expands abbreviations if BOTH streets end with street types
 * 3. Consolidates similar streets into single StreetName objects
 *    - One becomes the primary alias
 *    - Others become homonyms (>=0.875) or synonyms (>=0.845)
 * 4. Creates a NEW Google Drive file for the StreetName Alias Database
 *
 * PRIMARY ALIAS SELECTION RULES:
 * 1. Expanded form wins (if one is the expansion of the other)
 * 2. Names starting with digits cannot be primary
 * 3. Tiebreaker: First in file wins
 *
 * IMPORTANT: The VA Processing Street File is NOT modified.
 *
 * DEPENDENCIES:
 * - streetTypeAbbreviations.js must be loaded first (provides expansion)
 * - aliasClasses.js must be loaded (provides StreetName, AttributedTerm, Aliases)
 * - utils.js must be loaded (provides levenshteinSimilarity)
 *
 * USAGE (in browser console):
 *   // First, load the abbreviation table
 *   await StreetTypeAbbreviationManager.loadFromDrive()
 *   // Or initialize defaults if first time:
 *   StreetTypeAbbreviationManager.initializeDefaults()
 *   await StreetTypeAbbreviationManager.saveToDrive()
 *
 *   // Then run conversion
 *   await previewSimilarStreets()           // Preview clusters without converting
 *   await previewStreetConversion()         // Preview full conversion
 *   await convertStreetDatabase()           // Convert and upload
 *
 * Created: January 10, 2026
 * Reference: reference_streetNameAliasArchitecture.md (Section 8, Phase 2)
 * =============================================================================
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

// VA Processing Street File - source of street names (NOT modified)
const VA_STREET_FILE_ID = '1lsrd0alv9O01M_qlsiym3cB0TRIdgXI9';

// StreetName Alias Database - output file (default destination for conversion)
// NOTE: STREETNAME_ALIAS_DATABASE_ID is defined in addressProcessing.js (loaded earlier)
// const STREETNAME_ALIAS_DATABASE_ID = '1quMdB4qAcnR4oaepSbZEmVWUqYO5_nxK';

// Similarity thresholds for categorizing aliases
// Reference global MATCH_CRITERIA thresholds - never hardcode these values
function getHomonymThreshold() {
    if (typeof MATCH_CRITERIA !== 'undefined') {
        return MATCH_CRITERIA.trueMatch.nameAlone;  // 0.875
    }
    throw new Error('MATCH_CRITERIA not loaded - ensure unifiedEntityBrowser.js is loaded first');
}

function getSynonymThreshold() {
    if (typeof MATCH_CRITERIA !== 'undefined') {
        return MATCH_CRITERIA.nearMatch.nameAlone;  // 0.845
    }
    throw new Error('MATCH_CRITERIA not loaded - ensure unifiedEntityBrowser.js is loaded first');
}

// =============================================================================
// STRING NORMALIZATION FUNCTIONS
// =============================================================================

/**
 * Normalize whitespace in a string:
 * - Trim leading and trailing spaces
 * - Reduce consecutive spaces to single space
 *
 * This normalization is applied:
 * 1. Before comparison (to ensure "MAIN  STREET" matches "MAIN STREET")
 * 2. When storing aliases (both original AND normalized versions stored)
 *
 * @param {string} str - String to normalize
 * @returns {string} Normalized string
 */
function normalizeSpaces(str) {
    if (!str || typeof str !== 'string') {
        return str || '';
    }
    // Trim leading/trailing spaces and collapse consecutive spaces to single space
    return str.trim().replace(/\s+/g, ' ');
}

// =============================================================================
// COMPARISON FUNCTIONS
// =============================================================================

/**
 * Compare two street name strings and return a similarity score.
 * Uses StreetTypeAbbreviationManager to strip street types before comparison.
 *
 * IMPORTANT: Space normalization is applied BEFORE any other manipulation:
 * - Trim leading/trailing spaces
 * - Reduce consecutive spaces to single space
 * This ensures "MAIN  STREET" compares identically to "MAIN STREET".
 *
 * CRITICAL: Uses the SAME levenshteinSimilarity() function that is used
 * in production when comparing Block Island addresses.
 *
 * @param {string} streetA - First street name
 * @param {string} streetB - Second street name
 * @returns {Object} { score: number, strippedA: string, strippedB: string, wasStripped: boolean, normalizedA: string, normalizedB: string }
 */
function compareStreetNames(streetA, streetB) {
    // Step 1: Normalize spaces FIRST (before any other manipulation)
    const normalizedA = normalizeSpaces(streetA);
    const normalizedB = normalizeSpaces(streetB);

    // Step 2: Use StreetTypeAbbreviationManager to strip street types for comparison
    // This removes street types entirely and handles "OFF " prefix
    const prepared = StreetTypeAbbreviationManager.prepareForComparison(normalizedA, normalizedB);

    // Calculate similarity using the SAME function as production code
    const score = levenshteinSimilarity(prepared.strippedA, prepared.strippedB);

    return {
        score: score,
        strippedA: prepared.strippedA,
        strippedB: prepared.strippedB,
        wasStripped: prepared.wasStripped,
        normalizedA: normalizedA,  // Space-normalized versions (for storage)
        normalizedB: normalizedB
    };
}

/**
 * Categorize a similarity score into alias category
 * @param {number} score - Similarity score (0-1)
 * @returns {string|null} 'homonyms', 'synonyms', or null if below threshold
 */
function categorizeScore(score) {
    if (score >= getHomonymThreshold()) {
        return 'homonyms';
    } else if (score >= getSynonymThreshold()) {
        return 'synonyms';
    } else {
        return null; // Not similar enough
    }
}

// =============================================================================
// PRIMARY ALIAS SELECTION
// =============================================================================

/**
 * Determine which of two street names should be the primary alias.
 * Returns the index (0 or 1) of the winner.
 *
 * Rules (in order):
 * 1. If one is the expanded form of the other, the expanded form wins
 * 2. Names starting with a digit cannot be primary
 * 3. Tiebreaker: Lower file index (first in file) wins
 *
 * @param {string} streetA - First street name (original)
 * @param {string} streetB - Second street name (original)
 * @param {number} indexA - File index of streetA
 * @param {number} indexB - File index of streetB
 * @returns {number} 0 if streetA wins, 1 if streetB wins
 */
function selectPrimaryAlias(streetA, streetB, indexA, indexB) {
    const upperA = streetA.toUpperCase().trim();
    const upperB = streetB.toUpperCase().trim();

    // Get expanded forms
    const expandedA = StreetTypeAbbreviationManager.expandStreetName(upperA);
    const expandedB = StreetTypeAbbreviationManager.expandStreetName(upperB);

    // Rule 1: Expanded form wins
    // If A is the expanded form of B (B expands to A), then A wins
    // If B is the expanded form of A (A expands to B), then B wins
    const aIsExpansionOfB = (upperA === expandedB && upperA !== upperB);
    const bIsExpansionOfA = (upperB === expandedA && upperA !== upperB);

    if (aIsExpansionOfB && !bIsExpansionOfA) {
        // A is the fuller form - but check digit rule first
        if (!startsWithDigit(upperA)) {
            return 0; // A wins
        }
    }

    if (bIsExpansionOfA && !aIsExpansionOfB) {
        // B is the fuller form - but check digit rule first
        if (!startsWithDigit(upperB)) {
            return 1; // B wins
        }
    }

    // Rule 2: Names starting with digit cannot be primary
    const aStartsWithDigit = startsWithDigit(upperA);
    const bStartsWithDigit = startsWithDigit(upperB);

    if (aStartsWithDigit && !bStartsWithDigit) {
        return 1; // B wins (A starts with digit)
    }
    if (bStartsWithDigit && !aStartsWithDigit) {
        return 0; // A wins (B starts with digit)
    }

    // Rule 3: Tiebreaker - first in file wins
    return indexA <= indexB ? 0 : 1;
}

/**
 * Check if a string starts with a digit
 * @param {string} str - String to check
 * @returns {boolean}
 */
function startsWithDigit(str) {
    return /^\d/.test(str);
}

// =============================================================================
// STREET NAME OBJECT MANAGEMENT
// =============================================================================

/**
 * Internal storage during conversion.
 * Maps original street string (uppercase) to its StreetNameBuilder object.
 *
 * DUAL STORAGE ARCHITECTURE:
 * Each alias stores BOTH:
 * - originalString: The exact string from the source file (uppercase, trimmed only)
 * - normalizedString: Space-normalized version (consecutive spaces → single space)
 *
 * This allows the StreetName object to match input strings regardless of
 * whitespace variations while preserving the original data for reference.
 */
class StreetNameBuilder {
    constructor(originalString, fileIndex) {
        // Store both original (uppercase, trimmed) and normalized versions
        this.primaryOriginal = originalString.toUpperCase().trim();
        this.primaryNormalized = normalizeSpaces(this.primaryOriginal);
        this.primaryFileIndex = fileIndex;
        // Array of { originalString, normalizedString, fileIndex, category, score }
        this.aliases = [];
    }

    /**
     * Add an alias to this street
     * Stores BOTH original and normalized versions of the alias string.
     *
     * @param {string} aliasString - The alias street name
     * @param {number} fileIndex - File index of the alias
     * @param {string} category - 'homonyms' or 'synonyms'
     * @param {number} score - Similarity score
     */
    addAlias(aliasString, fileIndex, category, score) {
        const original = aliasString.toUpperCase().trim();
        const normalized = normalizeSpaces(original);

        this.aliases.push({
            originalString: original,
            normalizedString: normalized,
            fileIndex: fileIndex,
            category: category,
            score: score
        });
    }

    /**
     * Get the primary string for comparison and logging.
     * Returns the normalized version (used for most operations).
     * @returns {string}
     */
    get primaryString() {
        return this.primaryNormalized;
    }

    /**
     * Merge another StreetNameBuilder into this one.
     * The other's primary and all its aliases become aliases of this one.
     * All aliases are re-scored against the new primary and re-categorized.
     *
     * @param {StreetNameBuilder} other - The builder to merge in
     */
    merge(other) {
        // Collect all strings from other (primary + aliases)
        // Use original strings to preserve exact source data
        const stringsToMerge = [
            { string: other.primaryOriginal, fileIndex: other.primaryFileIndex }
        ];
        for (const alias of other.aliases) {
            stringsToMerge.push({ string: alias.originalString, fileIndex: alias.fileIndex });
        }

        // Re-score each against our primary and add as alias
        for (const item of stringsToMerge) {
            const comparison = compareStreetNames(this.primaryString, item.string);
            const category = categorizeScore(comparison.score);

            if (category) {
                this.addAlias(item.string, item.fileIndex, category, comparison.score);
            } else {
                // Score fell below threshold - this shouldn't normally happen
                // but if it does, add as synonym (lowest category)
                console.warn(`[MERGE] Score dropped below threshold: "${item.string}" vs "${this.primaryString}" = ${comparison.score.toFixed(3)}`);
                this.addAlias(item.string, item.fileIndex, 'synonyms', comparison.score);
            }
        }
    }

    /**
     * Convert to a StreetName object
     *
     * DUAL STORAGE: Each alias category contains BOTH original and normalized versions.
     * - Original version: Preserves exact source data (may have consecutive spaces)
     * - Normalized version: Space-normalized for matching (consecutive spaces → single)
     *
     * The normalized version is added ONLY if it differs from the original.
     * This allows lookups to match regardless of whitespace variations.
     *
     * @returns {StreetName}
     */
    toStreetNameObject() {
        // Create primary alias AttributedTerm using NORMALIZED version
        // (Primary should be the clean, canonical form)
        const primaryAlias = new AttributedTerm(
            this.primaryNormalized,
            'VA_STREET_DATABASE',
            this.primaryFileIndex,
            'canonical',
            'canonicalStreetName'
        );

        // Create StreetName object
        const streetName = new StreetName(primaryAlias);

        // If the original primary differs from normalized, add original as homonym
        if (this.primaryOriginal !== this.primaryNormalized) {
            const originalPrimaryTerm = new AttributedTerm(
                this.primaryOriginal,
                'VA_STREET_DATABASE',
                this.primaryFileIndex,
                'homonym',
                'originalStreetName'
            );
            streetName.alternatives.add(originalPrimaryTerm, 'homonyms');
        }

        // Add aliases, sorted by score descending within each category
        const sortedAliases = [...this.aliases].sort((a, b) => b.score - a.score);

        // Track which strings we've already added to avoid duplicates
        const addedStrings = new Set();
        addedStrings.add(this.primaryNormalized.toUpperCase());
        if (this.primaryOriginal !== this.primaryNormalized) {
            addedStrings.add(this.primaryOriginal.toUpperCase());
        }

        for (const alias of sortedAliases) {
            // Add the ORIGINAL version (preserves source data)
            const originalKey = alias.originalString.toUpperCase();
            if (!addedStrings.has(originalKey)) {
                const originalTerm = new AttributedTerm(
                    alias.originalString,
                    'VA_STREET_DATABASE',
                    alias.fileIndex,
                    alias.category === 'homonyms' ? 'homonym' : 'synonym',
                    'streetVariation'
                );
                streetName.alternatives.add(originalTerm, alias.category);
                addedStrings.add(originalKey);
            }

            // Add the NORMALIZED version if different from original
            const normalizedKey = alias.normalizedString.toUpperCase();
            if (alias.normalizedString !== alias.originalString && !addedStrings.has(normalizedKey)) {
                const normalizedTerm = new AttributedTerm(
                    alias.normalizedString,
                    'VA_STREET_DATABASE',
                    alias.fileIndex,
                    alias.category === 'homonyms' ? 'homonym' : 'synonym',
                    'streetVariationNormalized'
                );
                streetName.alternatives.add(normalizedTerm, alias.category);
                addedStrings.add(normalizedKey);
            }
        }

        return streetName;
    }
}

// =============================================================================
// MAIN CONVERSION LOGIC
// =============================================================================

/**
 * Find all pairs of similar streets and build consolidated StreetName objects.
 *
 * Algorithm:
 * 1. Create a StreetNameBuilder for each street
 * 2. Compare all pairs of streets
 * 3. When similar pair found, merge using primary selection rules
 * 4. Re-score all aliases when merges happen
 *
 * @param {Array<string>} streets - Array of street name strings
 * @returns {Array<StreetNameBuilder>} Array of consolidated builders
 */
function buildStreetNameObjects(streets) {
    console.log(`[CONVERTER] Building StreetName objects from ${streets.length} streets...`);
    console.log(`[CONVERTER] Thresholds: homonym >= ${getHomonymThreshold()}, synonym >= ${getSynonymThreshold()}`);

    // Step 1: Create builders for each street
    // Map from NORMALIZED street string to builder (for consistent lookup/delete)
    const builders = new Map();
    const indexToBuilder = new Map(); // Map from original index to current builder

    let collisionMerges = 0;
    for (let i = 0; i < streets.length; i++) {
        const builder = new StreetNameBuilder(streets[i], i);
        const normalizedKey = builder.primaryNormalized;

        // Check if a builder with this normalized key already exists
        // If so, this is a collision (two different original strings normalize to same thing)
        // We need to merge them to preserve BOTH original strings
        if (builders.has(normalizedKey)) {
            const existingBuilder = builders.get(normalizedKey);
            // Add the new original string as an alias of the existing builder
            // Since they normalize to the same thing, they're definitely homonyms (score 1.0)
            existingBuilder.addAlias(builder.primaryOriginal, builder.primaryFileIndex, 'homonyms', 1.0);
            // Point this index to the existing builder
            indexToBuilder.set(i, existingBuilder);
            collisionMerges++;
            console.log(`[CONVERTER] Collision merge: "${builder.primaryOriginal}" → "${existingBuilder.primaryOriginal}" (both normalize to "${normalizedKey}")`);
        } else {
            // No collision - add new builder
            builders.set(normalizedKey, builder);
            indexToBuilder.set(i, builder);
        }
    }

    if (collisionMerges > 0) {
        console.log(`[CONVERTER] Merged ${collisionMerges} streets that normalized to same string`);
    }

    // Step 2: Compare all pairs
    let pairsCompared = 0;
    let similarPairsFound = 0;
    let mergesPerformed = 0;

    for (let i = 0; i < streets.length; i++) {
        for (let j = i + 1; j < streets.length; j++) {
            pairsCompared++;

            // Get current builders for these indices (may have changed due to merges)
            const builderI = indexToBuilder.get(i);
            const builderJ = indexToBuilder.get(j);

            // Skip if already in same builder (already merged)
            if (builderI === builderJ) {
                continue;
            }

            // Compare
            const comparison = compareStreetNames(streets[i], streets[j]);
            const category = categorizeScore(comparison.score);

            if (category) {
                similarPairsFound++;

                console.log(`[CONVERTER] Similar pair (${comparison.score.toFixed(3)} → ${category}): "${streets[i]}" ↔ "${streets[j]}"${comparison.wasStripped ? ' [stripped]' : ''}`);

                // Determine which becomes primary
                const winnerIdx = selectPrimaryAlias(
                    builderI.primaryString, builderJ.primaryString,
                    builderI.primaryFileIndex, builderJ.primaryFileIndex
                );

                const winner = winnerIdx === 0 ? builderI : builderJ;
                const loser = winnerIdx === 0 ? builderJ : builderI;

                // Merge loser into winner
                winner.merge(loser);
                mergesPerformed++;

                // Update index mappings - all indices that pointed to loser now point to winner
                for (const [idx, builder] of indexToBuilder) {
                    if (builder === loser) {
                        indexToBuilder.set(idx, winner);
                    }
                }

                // Remove loser from builders map (using normalized version as key)
                builders.delete(loser.primaryNormalized);

                console.log(`[CONVERTER]   → Primary: "${winner.primaryString}" (now has ${winner.aliases.length} aliases)`);
            }
        }
    }

    console.log(`[CONVERTER] Compared ${pairsCompared} pairs`);
    console.log(`[CONVERTER] Found ${similarPairsFound} similar pairs`);
    console.log(`[CONVERTER] Performed ${mergesPerformed} merges`);
    console.log(`[CONVERTER] Resulting in ${builders.size} unique StreetName objects`);

    return Array.from(builders.values());
}

// =============================================================================
// GOOGLE DRIVE OPERATIONS
// =============================================================================

/**
 * Load the VA Processing Street File from Google Drive
 * @returns {Promise<Array<string>>} Array of street name strings
 */
async function loadVAStreetFile() {
    console.log('[CONVERTER] Loading VA Processing Street File...');

    const response = await gapi.client.drive.files.get({
        fileId: VA_STREET_FILE_ID,
        alt: 'media'
    });

    const streets = JSON.parse(response.body);
    console.log(`[CONVERTER] Loaded ${streets.length} streets from VA Processing Street File`);

    return streets;
}

/**
 * Serialize StreetName objects for storage
 * @param {Array<StreetName>} streetNameObjects - Array of StreetName objects
 * @returns {Object} Serialized database object
 */
function serializeStreetDatabase(streetNameObjects) {
    const serializedStreets = streetNameObjects.map(sn => {
        if (typeof sn.serialize === 'function') {
            return sn.serialize();
        }

        // Manual serialization
        return {
            type: 'StreetName',
            primaryAlias: serializeAttributedTerm(sn.primaryAlias),
            alternatives: serializeAliases(sn.alternatives)
        };
    });

    return {
        __format: 'StreetNameAliasDatabase',
        __version: '1.0',
        __created: new Date().toISOString(),
        __sourceFileId: VA_STREET_FILE_ID,
        __streetCount: serializedStreets.length,
        __homonymThreshold: getHomonymThreshold(),
        __synonymThreshold: getSynonymThreshold(),
        streets: serializedStreets
    };
}

/**
 * Serialize an AttributedTerm
 */
function serializeAttributedTerm(at) {
    const sourceMapObj = {};
    if (at.sourceMap instanceof Map) {
        for (const [key, value] of at.sourceMap) {
            sourceMapObj[key] = value;
        }
    } else if (at.sourceMap && typeof at.sourceMap === 'object') {
        Object.assign(sourceMapObj, at.sourceMap);
    }

    return {
        type: 'AttributedTerm',
        term: at.term,
        fieldName: at.fieldName,
        sourceMap: sourceMapObj
    };
}

/**
 * Serialize an Aliases object
 */
function serializeAliases(aliases) {
    return {
        type: 'Aliases',
        homonyms: aliases.homonyms.map(serializeAttributedTerm),
        synonyms: aliases.synonyms.map(serializeAttributedTerm),
        candidates: aliases.candidates.map(serializeAttributedTerm)
    };
}

/**
 * Update an existing Google Drive file with the database
 * Uses the same pattern as entityGroupBuilder.js saveEntityGroupDatabase()
 * @param {Object} serializedDatabase - The serialized database object
 * @param {string} fileId - The file ID to update
 * @returns {Promise<string>} The file ID
 */
async function uploadToExistingDriveFile(serializedDatabase, fileId) {
    console.log(`[CONVERTER] Updating existing Google Drive file: ${fileId}`);

    const jsonContent = JSON.stringify(serializedDatabase, null, 2);

    console.log(`[CONVERTER] Uploading ${jsonContent.length} bytes...`);

    const response = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
            method: 'PATCH',
            headers: new Headers({
                'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                'Content-Type': 'application/json'
            }),
            body: jsonContent
        }
    );

    if (response.ok) {
        // Update file name with timestamp (consistent with other database saves)
        const fileName = `streetname_alias_database_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        await gapi.client.drive.files.update({
            fileId: fileId,
            resource: { name: fileName }
        });

        console.log(`[CONVERTER] Upload complete!`);
        console.log(`[CONVERTER] File name updated to: ${fileName}`);
        return fileId;
    } else {
        const errorText = await response.text();
        throw new Error(`Upload failed: HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }
}

/**
 * Create a new Google Drive file and upload the database
 * Uses the same pattern as entityGroupBuilder.js saveEntityGroupDatabase()
 * @param {Object} serializedDatabase - The serialized database object
 * @returns {Promise<string>} The new file ID
 */
async function uploadToNewDriveFile(serializedDatabase) {
    const fileName = `streetname_alias_database_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;

    console.log(`[CONVERTER] Creating new Google Drive file: ${fileName}`);

    const createResponse = await gapi.client.drive.files.create({
        resource: {
            name: fileName,
            mimeType: 'application/json'
        },
        fields: 'id'
    });

    const fileId = createResponse.result.id;
    console.log(`[CONVERTER] Created file with ID: ${fileId}`);

    const jsonContent = JSON.stringify(serializedDatabase, null, 2);

    console.log(`[CONVERTER] Uploading ${jsonContent.length} bytes...`);

    const response = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
            method: 'PATCH',
            headers: new Headers({
                'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                'Content-Type': 'application/json'
            }),
            body: jsonContent
        }
    );

    if (response.ok) {
        console.log(`[CONVERTER] Upload complete!`);
        return fileId;
    } else {
        const errorText = await response.text();
        throw new Error(`Upload failed: HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }
}

// =============================================================================
// USER-FACING FUNCTIONS
// =============================================================================

/**
 * Preview similar street clusters without converting
 */
async function previewSimilarStreets() {
    console.log('=== SIMILAR STREET CLUSTER PREVIEW ===\n');

    // Check if abbreviation manager is loaded
    if (!StreetTypeAbbreviationManager.isLoaded) {
        console.log('[CONVERTER] Loading StreetTypeAbbreviationManager...');
        await StreetTypeAbbreviationManager.loadFromDrive();
    }

    const streets = await loadVAStreetFile();

    console.log(`\nComparing ${streets.length} streets (${streets.length * (streets.length - 1) / 2} pairs)...\n`);

    // Find all similar pairs (without building full objects)
    const similarPairs = [];

    for (let i = 0; i < streets.length; i++) {
        for (let j = i + 1; j < streets.length; j++) {
            const comparison = compareStreetNames(streets[i], streets[j]);
            const category = categorizeScore(comparison.score);

            if (category) {
                similarPairs.push({
                    streetA: streets[i],
                    streetB: streets[j],
                    indexA: i,
                    indexB: j,
                    score: comparison.score,
                    category: category,
                    wasStripped: comparison.wasStripped,
                    strippedA: comparison.strippedA,
                    strippedB: comparison.strippedB
                });
            }
        }
    }

    console.log(`\n--- Similar Pairs Found: ${similarPairs.length} ---\n`);

    // Sort by score descending
    similarPairs.sort((a, b) => b.score - a.score);

    for (const pair of similarPairs) {
        const strippedNote = pair.wasStripped ? ` [compared: "${pair.strippedA}" ↔ "${pair.strippedB}"]` : '';
        console.log(`${pair.score.toFixed(3)} (${pair.category}): "${pair.streetA}" ↔ "${pair.streetB}"${strippedNote}`);
    }

    console.log(`\n--- Summary ---`);
    console.log(`Total streets: ${streets.length}`);
    console.log(`Similar pairs: ${similarPairs.length}`);
    console.log(`Homonym pairs (>=${getHomonymThreshold()}): ${similarPairs.filter(p => p.category === 'homonyms').length}`);
    console.log(`Synonym pairs (>=${getSynonymThreshold()}): ${similarPairs.filter(p => p.category === 'synonyms').length}`);

    return similarPairs;
}

/**
 * Preview the full conversion without uploading
 * @param {number} limit - Optional limit on streets to show
 */
async function previewStreetConversion(limit = null) {
    console.log('=== STREET DATABASE CONVERSION PREVIEW ===\n');

    // Check if abbreviation manager is loaded
    if (!StreetTypeAbbreviationManager.isLoaded) {
        console.log('[CONVERTER] Loading StreetTypeAbbreviationManager...');
        await StreetTypeAbbreviationManager.loadFromDrive();
    }

    const streets = await loadVAStreetFile();
    const builders = buildStreetNameObjects(streets);

    // Convert to StreetName objects
    const streetNameObjects = builders.map(b => b.toStreetNameObject());

    // Display
    const displayCount = limit ? Math.min(limit, streetNameObjects.length) : streetNameObjects.length;

    console.log(`\n--- Showing ${displayCount} of ${streetNameObjects.length} StreetName objects ---\n`);

    for (let i = 0; i < displayCount; i++) {
        const sn = streetNameObjects[i];
        const homonyms = sn.alternatives?.homonyms || [];
        const synonyms = sn.alternatives?.synonyms || [];
        const totalAliases = homonyms.length + synonyms.length;

        if (totalAliases > 0) {
            console.log(`[${i}] "${sn.primaryAlias.term}" (${totalAliases} aliases)`);
            for (const h of homonyms) {
                console.log(`       ↳ [homonym] "${h.term}"`);
            }
            for (const s of synonyms) {
                console.log(`       ↳ [synonym] "${s.term}"`);
            }
        } else {
            console.log(`[${i}] "${sn.primaryAlias.term}"`);
        }
    }

    // Statistics
    const streetsWithAliases = streetNameObjects.filter(sn =>
        (sn.alternatives?.homonyms?.length || 0) + (sn.alternatives?.synonyms?.length || 0) > 0
    ).length;
    const totalHomonyms = streetNameObjects.reduce((sum, sn) => sum + (sn.alternatives?.homonyms?.length || 0), 0);
    const totalSynonyms = streetNameObjects.reduce((sum, sn) => sum + (sn.alternatives?.synonyms?.length || 0), 0);

    const serialized = serializeStreetDatabase(streetNameObjects);
    const jsonSize = JSON.stringify(serialized).length;

    console.log(`\n--- Summary ---`);
    console.log(`Source streets: ${streets.length}`);
    console.log(`StreetName objects: ${streetNameObjects.length}`);
    console.log(`Streets with aliases: ${streetsWithAliases}`);
    console.log(`Total homonyms: ${totalHomonyms}`);
    console.log(`Total synonyms: ${totalSynonyms}`);
    console.log(`Serialized size: ${(jsonSize / 1024).toFixed(2)} KB`);
    console.log(`\nTo perform actual conversion and upload, run: await convertStreetDatabase()`);

    return streetNameObjects;
}

/**
 * Main conversion function - converts and uploads the database
 * @param {boolean} createNewFile - If true, creates a new Google Drive file.
 *                                  If false/undefined, updates the default file (STREETNAME_ALIAS_DATABASE_ID).
 * @returns {Promise<{fileId: string, streetCount: number}>}
 */
async function convertStreetDatabase(createNewFile = false) {
    console.log('=== STREET DATABASE CONVERSION ===\n');
    console.log('Phase 2: Create StreetName Alias Database\n');

    try {
        // Check if abbreviation manager is loaded
        if (!StreetTypeAbbreviationManager.isLoaded) {
            console.log('[CONVERTER] Loading StreetTypeAbbreviationManager...');
            await StreetTypeAbbreviationManager.loadFromDrive();
        }

        // Step 1: Load source data
        const streets = await loadVAStreetFile();

        // Step 2: Build StreetName objects
        const builders = buildStreetNameObjects(streets);
        const streetNameObjects = builders.map(b => b.toStreetNameObject());

        // Step 3: Serialize
        console.log('\n[CONVERTER] Serializing database...');
        const serializedDatabase = serializeStreetDatabase(streetNameObjects);

        // Step 4: Upload - either to new file or existing default file
        console.log('\n[CONVERTER] Uploading to Google Drive...');
        let fileId;
        if (createNewFile) {
            fileId = await uploadToNewDriveFile(serializedDatabase);
            console.log('\n=== CONVERSION COMPLETE ===');
            console.log(`NEW StreetName Alias Database file ID: ${fileId}`);
        } else {
            fileId = await uploadToExistingDriveFile(serializedDatabase, STREETNAME_ALIAS_DATABASE_ID);
            console.log('\n=== CONVERSION COMPLETE ===');
            console.log(`Updated StreetName Alias Database file ID: ${fileId}`);
        }
        console.log(`Streets converted: ${streetNameObjects.length}`);

        return {
            fileId: fileId,
            streetCount: streetNameObjects.length
        };

    } catch (error) {
        console.error('[CONVERTER] Conversion failed:', error);
        throw error;
    }
}

/**
 * Verify an uploaded database
 * @param {string} [fileId] - The Google Drive file ID to verify. Defaults to STREETNAME_ALIAS_DATABASE_ID.
 */
async function verifyStreetDatabase(fileId) {
    // Use default if no fileId provided or if not a string
    const targetFileId = (typeof fileId === 'string' && fileId) ? fileId : STREETNAME_ALIAS_DATABASE_ID;
    console.log(`\n=== VERIFYING STREET DATABASE: ${targetFileId} ===\n`);

    try {
        const response = await gapi.client.drive.files.get({
            fileId: targetFileId,
            alt: 'media'
        });

        const database = JSON.parse(response.body);

        console.log(`Format: ${database.__format}`);
        console.log(`Version: ${database.__version}`);
        console.log(`Created: ${database.__created}`);
        console.log(`Source file: ${database.__sourceFileId}`);
        console.log(`Street count: ${database.__streetCount}`);
        console.log(`Homonym threshold: ${database.__homonymThreshold}`);
        console.log(`Synonym threshold: ${database.__synonymThreshold}`);

        // Count aliases
        let totalHomonyms = 0;
        let totalSynonyms = 0;
        for (const street of database.streets) {
            totalHomonyms += street.alternatives?.homonyms?.length || 0;
            totalSynonyms += street.alternatives?.synonyms?.length || 0;
        }

        console.log(`Total homonyms: ${totalHomonyms}`);
        console.log(`Total synonyms: ${totalSynonyms}`);

        console.log('\n--- Sample entries ---');
        for (let i = 0; i < Math.min(5, database.streets.length); i++) {
            const s = database.streets[i];
            const h = s.alternatives?.homonyms?.length || 0;
            const syn = s.alternatives?.synonyms?.length || 0;
            console.log(`[${i}] "${s.primaryAlias?.term}" (${h} homonyms, ${syn} synonyms)`);
        }

        console.log('\n=== VERIFICATION COMPLETE ===');
        return database;

    } catch (error) {
        console.error('[VERIFY] Verification failed:', error);
        throw error;
    }
}

/**
 * Download the converted database locally for backup
 */
async function downloadStreetDatabaseLocally() {
    // Check if abbreviation manager is loaded
    if (!StreetTypeAbbreviationManager.isLoaded) {
        await StreetTypeAbbreviationManager.loadFromDrive();
    }

    const streets = await loadVAStreetFile();
    const builders = buildStreetNameObjects(streets);
    const streetNameObjects = builders.map(b => b.toStreetNameObject());
    const serializedDatabase = serializeStreetDatabase(streetNameObjects);

    const jsonContent = JSON.stringify(serializedDatabase, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `streetname_alias_database_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('Database downloaded locally.');
}

// =============================================================================
// EXPORTS
// =============================================================================

window.convertStreetDatabase = convertStreetDatabase;
window.previewStreetConversion = previewStreetConversion;
window.previewSimilarStreets = previewSimilarStreets;
window.verifyStreetDatabase = verifyStreetDatabase;
window.downloadStreetDatabaseLocally = downloadStreetDatabaseLocally;
window.compareStreetNames = compareStreetNames; // Exposed for testing

console.log('StreetName Database Converter loaded.');
console.log('');
console.log('PREREQUISITE: Load abbreviation table first:');
console.log('  await StreetTypeAbbreviationManager.loadFromDrive()');
console.log('  OR: StreetTypeAbbreviationManager.initializeDefaults()');
console.log('');
console.log('COMMANDS:');
console.log('  await previewSimilarStreets()         - Preview similar pairs');
console.log('  await previewStreetConversion()       - Preview full conversion');
console.log('  await previewStreetConversion(10)     - Preview first 10 entries');
console.log('  await convertStreetDatabase()         - Convert and update default file');
console.log('  await convertStreetDatabase(true)     - Convert and create NEW file');
console.log('  await verifyStreetDatabase()          - Verify default database');
console.log('  await verifyStreetDatabase(fileId)    - Verify specific file');
console.log('  await downloadStreetDatabaseLocally() - Download as local file');
