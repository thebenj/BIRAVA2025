// ✅ VisionAppraisal processing function moved to scripts/core/visionAppraisalProcessing.js
// goAgain() - Resume VisionAppraisal processing from where it left off

// ✅ VisionAppraisal processing function moved to scripts/core/visionAppraisalProcessing.js
// mergeTheTwo() - Merge two VisionAppraisal data files


// ✅ VisionAppraisal processing function moved to scripts/core/visionAppraisalProcessing.js
// getFilesList() - Get list of files from a Google Drive folder

// ✅ VisionAppraisal processing function moved to scripts/core/visionAppraisalProcessing.js
// makeOneToOneFile() - Create one-to-one mapping file for PID files

// ✅ VisionAppraisal test function moved to scripts/core/visionAppraisalProcessing.js
// testGoogleDriveAccess() - Test Google Drive access functionality

// Test function to verify getFilesList works (or fails with same 502 error)
// ✅ Google Drive API function moved to scripts/core/googleDriveAPI.js
// testGetFilesList() - Test function to verify getFilesList works with Google Drive API

// =============================================================================
// STRING MATCHING UTILITIES
// Future Enhancement Placeholder: Replace simple string matching with sophisticated algorithms
// =============================================================================

/**
 * Simple string matching with future enhancement placeholder
 * FUTURE: Replace with sophisticated matching algorithms (fuzzy matching, normalization, etc.)
 * @param {string} field1 - First field to compare
 * @param {string} field2 - Second field to compare
 * @returns {boolean} True if fields match
 */
function simpleStringMatch(field1, field2) {
    // TODO FUTURE ENHANCEMENT: Replace simple equality with sophisticated matching
    // - Fuzzy string matching (Levenshtein distance, soundex, etc.)
    // - Address normalization (St vs Street, N vs North, etc.)
    // - Whitespace and punctuation handling
    // - Case insensitive comparison with proper locale handling

    const normalized1 = (field1 || '').toString().trim();
    const normalized2 = (field2 || '').toString().trim();

    // Simple equality comparison - PLACEHOLDER for future enhancement
    return normalized1 === normalized2;
}

// =============================================================================
// WEIGHTED COMPARISON ARCHITECTURE
// Shared utilities for configurable weighted object comparison
// =============================================================================

// COMMENTED OUT: Algorithm mismatch - compareStringsFuzzy uses simple substring/word overlap
// instead of sophisticated weighted Levenshtein from matchingTools.js
// Preserved for potential revert. See matchingTools.js levenshteinDistance() for correct algorithm.
// /**
//  * Fuzzy string comparison helper - matches logic from nameMatchingAnalysis.js compareComponent()
//  * @param {string} str1 - First string
//  * @param {string} str2 - Second string
//  * @returns {number} Similarity score 0-1
//  */
// function compareStringsFuzzy(str1, str2) {
//     if (!str1 && !str2) return 1.0;  // Both empty = perfect match
//     if (!str1 || !str2) return 0.0;  // One empty = no match
//
//     const s1 = str1.toUpperCase().trim();
//     const s2 = str2.toUpperCase().trim();
//
//     if (s1 === s2) return 1.0;  // Exact match
//
//     // Check for substring matches (handles initials, shortened names)
//     if (s1.includes(s2) || s2.includes(s1)) return 0.7;
//
//     // Basic word overlap for compound names
//     const words1 = s1.split(/\s+/);
//     const words2 = s2.split(/\s+/);
//     const overlap = words1.filter(w => words2.includes(w)).length;
//     const maxWords = Math.max(words1.length, words2.length);
//
//     return maxWords > 0 ? overlap / maxWords : 0.0;
// }

// COMMENTED OUT: defaultWeightedComparison uses wrong algorithm (compareStringsFuzzy)
// Should use weighted Levenshtein from matchingTools.js to match compareNames() results
// This causes algorithm mismatch preventing parallel test validation (correlation < 0.95)
// Preserved for potential revert.
// /**
//  * Default weighted comparison calculator
//  * Used by genericObjectCompareTo when comparisonWeights are configured
//  * Operates in 'this' context of the calling object
//  * @param {Object} otherObject - Object to compare against
//  * @returns {number} Comparison result from -1 to 1, rounded to 10th place, or null for fallback
//  */
// function defaultWeightedComparison(otherObject) {
//     // Check if weights are configured
//     if (!this.comparisonWeights) {
//         return null; // Fall back to standard property-by-property comparison
//     }
//
//     let totalWeightedScore = 0;
//     let totalWeight = 0;
//
//     // DIAGNOSTIC: Log what we're comparing
//     const diagnosticLog = [];
//     diagnosticLog.push('=== defaultWeightedComparison DIAGNOSTIC ===');
//
//     // Iterate through configured weights only (exclusion approach)
//     for (let propName in this.comparisonWeights) {
//         const weight = this.comparisonWeights[propName];
//         const thisValue = this[propName];
//         const otherValue = otherObject[propName];
//
//         diagnosticLog.push(`\nProperty: ${propName} (weight: ${weight})`);
//         diagnosticLog.push(`  thisValue: ${thisValue}`);
//         diagnosticLog.push(`  otherValue: ${otherValue}`);
//
//         // Skip if either value is missing (exclusion approach for robustness)
//         if (!thisValue || !otherValue) {
//             diagnosticLog.push(`  SKIPPED: Missing value`);
//             continue;
//         }
//
//         // Calculate property similarity score using fuzzy matching
//         let propScore = 0;
//         if (typeof thisValue.compareTo === 'function') {
//             // For objects with compareTo methods, use fuzzy string comparison
//             // Extract string representations for comparison
//             const str1 = thisValue.toString ? thisValue.toString() : String(thisValue);
//             const str2 = otherValue.toString ? otherValue.toString() : String(otherValue);
//             propScore = compareStringsFuzzy(str1, str2);
//             diagnosticLog.push(`  Using fuzzy match: "${str1}" vs "${str2}" = ${propScore}`);
//         } else {
//             // Direct comparison fallback for primitive values
//             propScore = thisValue === otherValue ? 1.0 : 0.0;
//             diagnosticLog.push(`  Using exact match: ${propScore}`);
//         }
//
//         totalWeightedScore += propScore * weight;
//         totalWeight += weight;
//         diagnosticLog.push(`  Weighted contribution: ${propScore} * ${weight} = ${propScore * weight}`);
//     }
//
//     // Calculate final weighted similarity
//     const similarity = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
//
//     diagnosticLog.push(`\nTotal weighted score: ${totalWeightedScore}`);
//     diagnosticLog.push(`Total weight: ${totalWeight}`);
//     diagnosticLog.push(`Final similarity: ${similarity}`);
//
//     // Log only for first comparison (to avoid spam)
//     if (!window._defaultWeightedComparison_logged) {
//         console.log(diagnosticLog.join('\n'));
//         window._defaultWeightedComparison_logged = true;
//     }
//
//     // Convert to compareTo convention (-1 to 1 range, rounded to 10th place)
//     const compareToResult = (similarity * 2) - 1; // Convert 0-1 to -1 to +1
//     return Math.round(compareToResult * 10) / 10;
// }

// =============================================================================
// VOWEL-WEIGHTED LEVENSHTEIN DISTANCE
// Copied from matchingTools.js - sophisticated string comparison for names
// Lower penalty for vowel-vowel mismatches (common in name variations like Smith/Smyth)
// =============================================================================

/**
 * Calculate vowel-weighted Levenshtein distance between two strings
 * @param {string} str1 - First string to compare
 * @param {string} str2 - Second string to compare
 * @returns {number} Distance value (lower = more similar)
 */
const levenshteinDistance = (str1 = '', str2 = '') => {
    const vow = ["a", "e", "i", "o", "u", "y"];
    const cons = ["b", "c", "d", "f", "g", "h", "j", "k", "l", "m", "n", "p", "q", "r", "s", "t", "v", "w", "x", "z"];

    // Convert to lowercase for comparison
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    const track = Array(s2.length + 1).fill(null).map(() =>
        Array(s1.length + 1).fill(null));

    for (let i = 0; i <= s1.length; i += 1) {
        track[0][i] = i;
    }
    for (let j = 0; j <= s2.length; j += 1) {
        track[j][0] = j;
    }

    for (let j = 1; j <= s2.length; j += 1) {
        for (let i = 1; i <= s1.length; i += 1) {
            // Substitution penalty varies by character type:
            // - Exact match: 0
            // - Vowel-vowel mismatch: ~0.079 (low - common in name variations)
            // - Consonant-consonant mismatch: 1 (high)
            // - Vowel-consonant mismatch: ~0.632 (medium)
            const indicator = ((s1[i - 1] === s2[j - 1]) ? 0 :
                (((vow.indexOf(s1[i - 1]) > -1) && (vow.indexOf(s2[j - 1]) > -1)) ? (6 * 5) / (20 * 19) :
                    (((cons.indexOf(s1[i - 1]) > -1) && (cons.indexOf(s2[j - 1]) > -1) ? 1 : (6 + 6) / 19))));

            track[j][i] = Math.min(
                track[j][i - 1] + 1,           // deletion
                track[j - 1][i] + 1,           // insertion
                track[j - 1][i - 1] + indicator // substitution
            );
        }
    }
    return track[s2.length][s1.length];
};

/**
 * Convert Levenshtein distance to similarity score (0-1 range)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score (1 = identical, 0 = completely different)
 */
function levenshteinSimilarity(str1, str2) {
    if (!str1 && !str2) return 1.0;  // Both empty = perfect match
    if (!str1 || !str2) return 0.0;  // One empty = no match

    const distance = levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength > 0 ? 1 - (distance / maxLength) : 1.0;
}

// =============================================================================
// DEFAULT WEIGHTED COMPARISON - Real Implementation
// Uses vowel-weighted Levenshtein for sophisticated name/string comparison
// =============================================================================

/**
 * Default weighted comparison calculator using vowel-weighted Levenshtein
 * Used by genericObjectCompareTo when comparisonWeights are configured
 * Operates in 'this' context of the calling object
 * @param {Object} otherObject - Object to compare against
 * @returns {number} Similarity score 0-1, or null for fallback to property-by-property
 */
function defaultWeightedComparison(otherObject) {
    // Check if weights are configured
    if (!this.comparisonWeights) {
        return null; // Fall back to standard property-by-property comparison
    }

    let totalWeightedScore = 0;
    let totalWeight = 0;

    // Iterate through configured weights only
    for (let propName in this.comparisonWeights) {
        const weight = this.comparisonWeights[propName];
        const thisValue = this[propName];
        const otherValue = otherObject[propName];

        // Skip if either value is missing (exclusion approach for robustness)
        if (!thisValue || !otherValue) {
            continue;
        }

        // Calculate similarity using the component's native compareTo method
        // ARCHITECTURE REQUIREMENT: All objects use their own compareTo for comparison
        let similarity = 0;

        if (typeof thisValue.compareTo === 'function') {
            // Use the object's native compareTo method (returns 0-1 similarity)
            similarity = thisValue.compareTo(otherValue);
        } else if (typeof thisValue === 'string') {
            // For plain strings, use levenshteinSimilarity directly
            const str2 = typeof otherValue === 'string' ? otherValue : String(otherValue);
            similarity = levenshteinSimilarity(thisValue, str2);
        } else {
            // Fallback for primitives - exact match only
            similarity = thisValue === otherValue ? 1.0 : 0.0;
        }

        totalWeightedScore += similarity * weight;
        totalWeight += weight;
    }

    // Calculate final weighted similarity (0-1 range)
    const finalSimilarity = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

    // Round to 10 decimal places for precision
    return Math.round(finalSimilarity * 10000000000) / 10000000000;
}

// =============================================================================
// ADDRESS-SPECIFIC WEIGHTED COMPARISON
// Handles conditional logic for PO Box vs Street Address comparisons
// With special handling for Block Island addresses
// =============================================================================

/**
 * Determine if an Address object represents a PO Box address
 * @param {Address} addr - Address object to check
 * @returns {boolean} True if this is a PO Box address
 */
function isPOBoxAddress(addr) {
    if (!addr) return false;

    // Helper to normalize and check a string value
    const checkForPOBox = (value) => {
        if (!value) return false;
        const term = value.term !== undefined ? value.term : value;
        // Normalize: uppercase, remove periods and spaces
        const normalized = String(term).toUpperCase().replace(/\./g, '').replace(/\s+/g, '');
        // Check for various PO Box indicators
        return normalized.includes('BOX') ||
               normalized.includes('PO') ||
               normalized.includes('POSTOFFICE') ||
               normalized === 'POB';
    };

    // Check secUnitType
    if (checkForPOBox(addr.secUnitType)) {
        return true;
    }

    // Also check streetName (some parsers put "PO Box" there)
    if (checkForPOBox(addr.streetName)) {
        return true;
    }

    return false;
}

/**
 * Check if a city name is a Block Island variant
 * @param {string|AttributedTerm} cityValue - City to check
 * @returns {boolean} True if city is a Block Island variant
 */
function isBlockIslandCity(cityValue) {
    if (!cityValue) return false;
    const term = cityValue.term !== undefined ? cityValue.term : cityValue;
    const normalized = String(term).toUpperCase().replace(/\s+/g, '');
    return normalized.includes('BLOCKISLAND') ||
           normalized.includes('NEWSHOREHAM') ||
           normalized === 'BI';
}

/**
 * Check if a street name exists in the Block Island streets database
 * @param {string|AttributedTerm} streetValue - Street name to check
 * @returns {boolean} True if street is in BI database
 */
function isBlockIslandStreet(streetValue) {
    if (!streetValue) return false;
    if (typeof window === 'undefined' || !window.blockIslandStreets) return false;

    const term = streetValue.term !== undefined ? streetValue.term : streetValue;
    const normalized = String(term).toUpperCase().trim();

    return window.blockIslandStreets.has(normalized);
}

/**
 * Get similarity between two AttributedTerm or string values
 * @param {AttributedTerm|string} val1 - First value
 * @param {AttributedTerm|string} val2 - Second value
 * @returns {number} Similarity 0-1
 */
function getComponentSimilarity(val1, val2) {
    if (!val1 || !val2) return 0;

    // Use compareTo if available (AttributedTerm)
    if (typeof val1.compareTo === 'function') {
        return val1.compareTo(val2);
    }

    // Fall back to levenshteinSimilarity for strings
    const str1 = val1.term !== undefined ? String(val1.term) : String(val1);
    const str2 = val2.term !== undefined ? String(val2.term) : String(val2);
    return levenshteinSimilarity(str1, str2);
}

/**
 * Get similarity between two state values
 * For 2-letter state codes: exact match only (1.0 or 0.0)
 * For longer state names: use levenshteinSimilarity
 * @param {AttributedTerm|string} state1 - First state value
 * @param {AttributedTerm|string} state2 - Second state value
 * @returns {number} Similarity 0-1
 */
function getStateSimilarity(state1, state2) {
    if (!state1 || !state2) return 0;

    const str1 = state1.term !== undefined ? String(state1.term).trim().toUpperCase() : String(state1).trim().toUpperCase();
    const str2 = state2.term !== undefined ? String(state2.term).trim().toUpperCase() : String(state2).trim().toUpperCase();

    // For 2-letter state codes, use exact match only
    if (str1.length === 2 && str2.length === 2) {
        return str1 === str2 ? 1.0 : 0.0;
    }

    // For longer state names, use levenshteinSimilarity
    return levenshteinSimilarity(str1, str2);
}

/**
 * Check if zip code is 02807 (Block Island)
 * @param {AttributedTerm|string} zipValue - Zip code to check
 * @returns {boolean} True if zip is 02807
 */
function isBlockIslandZip(zipValue) {
    if (!zipValue) return false;
    const term = zipValue.term !== undefined ? zipValue.term : zipValue;
    return String(term).trim() === '02807';
}

/**
 * Address-specific weighted comparison calculator
 * Uses different logic for:
 * - PO Box addresses
 * - Block Island street addresses
 * - General street addresses
 *
 * @param {Address} otherObject - The other Address to compare against
 * @returns {number} Similarity score 0-1
 */
function addressWeightedComparison(otherObject) {
    const thisAddr = this;
    const otherAddr = otherObject;

    // Determine address types
    const thisIsPOBox = isPOBoxAddress(thisAddr);
    const otherIsPOBox = isPOBoxAddress(otherAddr);

    // If either is a PO Box, use PO Box comparison for both
    if (thisIsPOBox || otherIsPOBox) {
        return comparePOBoxAddresses(thisAddr, otherAddr);
    }

    // Check for Block Island addresses
    const thisIsBI = isBlockIslandZip(thisAddr.zipCode) ||
                     (isBlockIslandStreet(thisAddr.streetName) && isBlockIslandCity(thisAddr.city));
    const otherIsBI = isBlockIslandZip(otherAddr.zipCode) ||
                      (isBlockIslandStreet(otherAddr.streetName) && isBlockIslandCity(otherAddr.city));

    if (thisIsBI || otherIsBI) {
        return compareBlockIslandAddresses(thisAddr, otherAddr);
    }

    // General street address comparison
    return compareGeneralStreetAddresses(thisAddr, otherAddr);
}

/**
 * Compare PO Box addresses
 * Logic:
 * - When zip present: zip < 0.74 → 0; zip == 1 → secUnitNum; 0.74-1 → weighted with city/state
 * - When zip absent: secUnitNum < 0.8 → 0; secUnitNum == 1 → 50/50 city/state; 0.8-1 → weighted
 */
function comparePOBoxAddresses(addr1, addr2) {
    const hasZip = addr1.zipCode && addr2.zipCode;

    if (hasZip) {
        const zipSim = getComponentSimilarity(addr1.zipCode, addr2.zipCode);

        if (zipSim < 0.74) {
            return 0;
        }

        const secUnitSim = getComponentSimilarity(addr1.secUnitNum, addr2.secUnitNum);

        if (zipSim === 1) {
            return Math.round(secUnitSim * 10000000000) / 10000000000;
        }

        // Zip between 0.74 and 1: weighted calculation including city/state
        const citySim = getComponentSimilarity(addr1.city, addr2.city);
        const stateSim = getStateSimilarity(addr1.state, addr2.state);
        const result = 0.3 * zipSim + 0.3 * secUnitSim + 0.2 * citySim + 0.2 * stateSim;
        return Math.round(result * 10000000000) / 10000000000;
    } else {
        // No zip code - use secUnitNum, city, state
        const secUnitSim = getComponentSimilarity(addr1.secUnitNum, addr2.secUnitNum);

        if (secUnitSim < 0.8) {
            return 0;
        }

        const citySim = getComponentSimilarity(addr1.city, addr2.city);
        const stateSim = getStateSimilarity(addr1.state, addr2.state);

        if (secUnitSim === 1) {
            // Return 50/50 city/state
            const result = 0.5 * citySim + 0.5 * stateSim;
            return Math.round(result * 10000000000) / 10000000000;
        }

        // secUnitNum between 0.8 and 1: weighted calculation
        const result = 0.6 * secUnitSim + 0.2 * citySim + 0.2 * stateSim;
        return Math.round(result * 10000000000) / 10000000000;
    }
}

/**
 * Compare Block Island addresses
 * Logic:
 * - When zip = 02807: streetNumber 0.85, streetName 0.15
 * - When zip absent but streetName in BI database + city is BI: streetNumber only
 */
function compareBlockIslandAddresses(addr1, addr2) {
    const hasZip02807 = isBlockIslandZip(addr1.zipCode) || isBlockIslandZip(addr2.zipCode);

    if (hasZip02807) {
        // Weights: streetNumber 0.85, streetName 0.15
        const streetNumSim = getComponentSimilarity(addr1.streetNumber, addr2.streetNumber);
        const streetNameSim = getComponentSimilarity(addr1.streetName, addr2.streetName);

        const result = 0.85 * streetNumSim + 0.15 * streetNameSim;
        return Math.round(result * 10000000000) / 10000000000;
    } else {
        // No zip but confirmed BI via street database + city
        // Only compare street number
        const streetNumSim = getComponentSimilarity(addr1.streetNumber, addr2.streetNumber);
        return Math.round(streetNumSim * 10000000000) / 10000000000;
    }
}

/**
 * Compare general street addresses (not BI, not PO Box)
 * Logic:
 * - When zip present (either side): streetNumber 0.3, streetName 0.2, zipCode 0.4, state 0.1 (city: 0)
 * - When zip absent (both sides): streetNumber 0.3, streetName 0.2, city 0.25, state 0.25
 *
 * IMPORTANT: All categories always contribute to the score with their fixed weights.
 * If either side has undefined/empty/null for a field, that field contributes 0 similarity
 * but the weight is NOT skipped or renormalized.
 *
 * Note: State uses exact match for 2-letter codes
 */
function compareGeneralStreetAddresses(addr1, addr2) {
    // Check if EITHER side has a zip code - if so, use zip-based weighting
    const hasZip = addr1.zipCode || addr2.zipCode;

    // Helper to get similarity, returning 0 if either value is missing
    const getSimilarityOrZero = (val1, val2) => {
        if (!val1 || !val2) return 0;
        return getComponentSimilarity(val1, val2);
    };

    const getStateSimilarityOrZero = (val1, val2) => {
        if (!val1 || !val2) return 0;
        return getStateSimilarity(val1, val2);
    };

    if (hasZip) {
        // With zip: streetNumber 0.3, streetName 0.2, zipCode 0.4, state 0.1
        // All weights always applied - missing fields contribute 0 similarity
        const streetNumSim = getSimilarityOrZero(addr1.streetNumber, addr2.streetNumber);
        const streetNameSim = getSimilarityOrZero(addr1.streetName, addr2.streetName);
        const zipSim = getSimilarityOrZero(addr1.zipCode, addr2.zipCode);
        const stateSim = getStateSimilarityOrZero(addr1.state, addr2.state);

        const totalScore = (streetNumSim * 0.3) + (streetNameSim * 0.2) + (zipSim * 0.4) + (stateSim * 0.1);
        return Math.round(totalScore * 10000000000) / 10000000000;
    } else {
        // Without zip (both sides): streetNumber 0.3, streetName 0.2, city 0.25, state 0.25
        // All weights always applied - missing fields contribute 0 similarity
        const streetNumSim = getSimilarityOrZero(addr1.streetNumber, addr2.streetNumber);
        const streetNameSim = getSimilarityOrZero(addr1.streetName, addr2.streetName);
        const citySim = getSimilarityOrZero(addr1.city, addr2.city);
        const stateSim = getStateSimilarityOrZero(addr1.state, addr2.state);

        const totalScore = (streetNumSim * 0.3) + (streetNameSim * 0.2) + (citySim * 0.25) + (stateSim * 0.25);
        return Math.round(totalScore * 10000000000) / 10000000000;
    }
}

// =============================================================================
// CONTACTINFO-SPECIFIC WEIGHTED COMPARISON
// Sophisticated logic for comparing contact information with address matching
// =============================================================================

/**
 * Compare an address against all addresses in a ContactInfo (primary + secondary)
 * Returns the best match found and which address it matched
 * @param {Address} addr - Address to compare
 * @param {ContactInfo} contactInfo - ContactInfo to compare against
 * @returns {Object} { bestScore: number, matchedAddress: Address|null, matchedIndex: number }
 */
function findBestAddressMatch(addr, contactInfo) {
    if (!addr) return { bestScore: 0, matchedAddress: null, matchedIndex: -1 };

    let bestScore = 0;
    let matchedAddress = null;
    let matchedIndex = -1;

    // Check primary address
    if (contactInfo.primaryAddress) {
        const score = addr.compareTo(contactInfo.primaryAddress);
        if (score > bestScore) {
            bestScore = score;
            matchedAddress = contactInfo.primaryAddress;
            matchedIndex = -1; // -1 means primary
        }
    }

    // Check secondary addresses
    const secondaries = contactInfo.secondaryAddress || [];
    for (let i = 0; i < secondaries.length; i++) {
        if (secondaries[i]) {
            const score = addr.compareTo(secondaries[i]);
            if (score > bestScore) {
                bestScore = score;
                matchedAddress = secondaries[i];
                matchedIndex = i;
            }
        }
    }

    return { bestScore, matchedAddress, matchedIndex };
}

/**
 * Get email value as string for comparison
 * @param {SimpleIdentifiers|AttributedTerm|string} emailValue - Email value from ContactInfo
 * @returns {string|null} Email string or null
 */
function getEmailString(emailValue) {
    if (!emailValue) return null;

    // Handle SimpleIdentifiers structure (has primaryAlias which is an AttributedTerm)
    if (emailValue.primaryAlias && emailValue.primaryAlias.term !== undefined) {
        return emailValue.primaryAlias.term;
    }
    // Handle direct string
    if (typeof emailValue === 'string') {
        return emailValue;
    }
    // Handle AttributedTerm directly
    if (emailValue.term !== undefined) {
        return emailValue.term;
    }
    return null;
}

/**
 * ContactInfo-specific weighted comparison calculator
 *
 * Logic:
 * 1. Primary address similarity: Best match comparing each primary to any address in other (0.6 weight)
 * 2. Secondary address similarity: Best match of remaining secondaries (0.2 weight)
 * 3. Email similarity: (0.2 weight)
 * 4. Phone: no weight
 * 5. Perfect match override: If any category is perfect (non-null match),
 *    that category gets 0.9 weight, others get 0.05 each
 *
 * @param {ContactInfo} otherObject - The other ContactInfo to compare against
 * @param {boolean} detailed - If true, returns detailed breakdown object instead of number
 * @returns {number|Object} Similarity score 0-1, or detailed breakdown object if detailed=true
 */
function contactInfoWeightedComparison(otherObject, detailed = false) {
    const thisCI = this;
    const otherCI = otherObject;

    // Step 1: Find best primary address match
    // Compare this.primaryAddress to all addresses in otherCI
    // AND compare otherCI.primaryAddress to all addresses in thisCI
    // Take the best of these
    let primarySimilarity = 0;
    let thisPrimaryMatchedIndex = -2; // -2 means no match, -1 means primary, 0+ means secondary index
    let otherPrimaryMatchedIndex = -2;

    if (thisCI.primaryAddress) {
        const result = findBestAddressMatch(thisCI.primaryAddress, otherCI);
        primarySimilarity = result.bestScore;
        otherPrimaryMatchedIndex = result.matchedIndex;
    }

    if (otherCI.primaryAddress) {
        const result = findBestAddressMatch(otherCI.primaryAddress, thisCI);
        if (result.bestScore > primarySimilarity) {
            primarySimilarity = result.bestScore;
            thisPrimaryMatchedIndex = result.matchedIndex;
            otherPrimaryMatchedIndex = -2; // Reset since we're using other's primary match
        }
    }

    // Step 2: Find best secondary address match, excluding addresses used in primary match
    let secondarySimilarity = 0;

    // Get secondary addresses, excluding any used in primary match
    const thisSecondaries = (thisCI.secondaryAddress || []).filter((addr, idx) => {
        return addr && idx !== thisPrimaryMatchedIndex;
    });
    const otherSecondaries = (otherCI.secondaryAddress || []).filter((addr, idx) => {
        return addr && idx !== otherPrimaryMatchedIndex;
    });

    // Also exclude primaryAddress if it was the matched one
    const thisAllSecondaries = thisPrimaryMatchedIndex === -1 ?
        thisSecondaries :
        (thisCI.primaryAddress ? [thisCI.primaryAddress, ...thisSecondaries] : thisSecondaries);

    const otherAllSecondaries = otherPrimaryMatchedIndex === -1 ?
        otherSecondaries :
        (otherCI.primaryAddress ? [otherCI.primaryAddress, ...otherSecondaries] : otherSecondaries);

    // Actually, let's be more precise:
    // - If thisPrimaryMatchedIndex === -1, it means this.primaryAddress matched other.primaryAddress (exclude other.primaryAddress from secondary comparison)
    // - If otherPrimaryMatchedIndex >= 0, it means this.primaryAddress matched other.secondaryAddress[otherPrimaryMatchedIndex]
    // For secondary comparison, we compare this.secondaries against other.secondaries,
    // but exclude the one used in primary match

    // Collect available addresses for secondary comparison
    let thisAvailableForSecondary = [...thisSecondaries];
    let otherAvailableForSecondary = [...otherSecondaries];

    // If this.primaryAddress matched other.primaryAddress, exclude other.primaryAddress from secondary pool
    if (thisPrimaryMatchedIndex === -2 && otherPrimaryMatchedIndex === -1) {
        // this.primaryAddress matched other.primaryAddress - don't add other.primary to pool
    } else if (otherCI.primaryAddress && otherPrimaryMatchedIndex !== -1) {
        // this.primaryAddress matched a secondary OR other.primaryAddress is still available
        // If other.primaryAddress wasn't matched, add it to available pool
        if (otherPrimaryMatchedIndex === -2 || otherPrimaryMatchedIndex >= 0) {
            // other.primaryAddress can be used in secondary comparison if it wasn't the primary match
            // Actually only add if it wasn't the match
            if (otherPrimaryMatchedIndex >= 0 || otherPrimaryMatchedIndex === -2) {
                // other's primary wasn't used - but wait, we need to track which was matched
            }
        }
    }

    // Simplify: compare all secondaries from this to all secondaries from other
    // (the primary match exclusion is already handled by checking against each)
    for (const thisAddr of thisSecondaries) {
        for (const otherAddr of otherSecondaries) {
            const score = thisAddr.compareTo(otherAddr);
            if (score > secondarySimilarity) {
                secondarySimilarity = score;
            }
        }
    }

    // Step 3: Email comparison
    let emailSimilarity = 0;
    const thisEmail = getEmailString(thisCI.email);
    const otherEmail = getEmailString(otherCI.email);

    if (thisEmail && otherEmail) {
        // Use levenshteinSimilarity for email comparison
        emailSimilarity = levenshteinSimilarity(thisEmail.toLowerCase(), otherEmail.toLowerCase());
    }

    // Step 4: Determine which components have data to compare
    // Only weight components where BOTH sides have data (don't penalize for missing data)
    const hasPrimaryData = thisCI.primaryAddress && otherCI.primaryAddress;
    const hasSecondaryData = thisSecondaries.length > 0 && otherSecondaries.length > 0;
    const hasEmailData = thisEmail && otherEmail;

    // Step 5: Apply weighting only to components with data
    // Base weights: primary 0.6, secondary 0.2, email 0.2
    const baseWeights = { primaryAddress: 0.6, secondaryAddress: 0.2, email: 0.2 };
    let totalWeight = 0;
    let weightedSum = 0;

    if (hasPrimaryData) {
        weightedSum += baseWeights.primaryAddress * primarySimilarity;
        totalWeight += baseWeights.primaryAddress;
    }
    if (hasSecondaryData) {
        weightedSum += baseWeights.secondaryAddress * secondarySimilarity;
        totalWeight += baseWeights.secondaryAddress;
    }
    if (hasEmailData) {
        weightedSum += baseWeights.email * emailSimilarity;
        totalWeight += baseWeights.email;
    }

    // If no components have data, return 0
    if (totalWeight === 0) {
        return detailed ? { overallSimilarity: 0, components: {}, checkSum: 0 } : 0;
    }

    // Precision: 10 decimal places
    const PRECISION = 10000000000; // 10^10
    const round10 = (val) => Math.round(val * PRECISION) / PRECISION;

    // Normalize by total weight (so missing data doesn't penalize)
    const overallSimilarity = round10(weightedSum / totalWeight);

    if (!detailed) {
        return overallSimilarity;
    }

    // Build detailed breakdown - only include components with weight
    const components = {};
    let weightedValueSum = 0;

    if (hasPrimaryData) {
        const actualWeight = round10(baseWeights.primaryAddress / totalWeight);
        const similarity = round10(primarySimilarity);
        const weightedValue = round10(actualWeight * similarity);
        components.primaryAddress = {
            actualWeight: actualWeight,
            similarity: similarity,
            weightedValue: weightedValue
        };
        weightedValueSum += weightedValue;
    }

    if (hasSecondaryData) {
        const actualWeight = round10(baseWeights.secondaryAddress / totalWeight);
        const similarity = round10(secondarySimilarity);
        const weightedValue = round10(actualWeight * similarity);
        components.secondaryAddress = {
            actualWeight: actualWeight,
            similarity: similarity,
            weightedValue: weightedValue
        };
        weightedValueSum += weightedValue;
    }

    if (hasEmailData) {
        const actualWeight = round10(baseWeights.email / totalWeight);
        const similarity = round10(emailSimilarity);
        const weightedValue = round10(actualWeight * similarity);
        components.email = {
            actualWeight: actualWeight,
            similarity: similarity,
            weightedValue: weightedValue
        };
        weightedValueSum += weightedValue;
    }

    // checkSum: overallSimilarity minus sum of weightedValues (should be 0 for validation)
    const checkSum = round10(overallSimilarity - weightedValueSum);

    return {
        overallSimilarity: overallSimilarity,
        components: components,
        checkSum: checkSum
    };
}

/**
 * Entity-level weighted comparison calculator
 * Compares Individual or AggregateHousehold entities using:
 * - name (IndividualName.compareTo)
 * - contactInfo (ContactInfo.compareTo)
 * - otherInfo (if both have it)
 * - legacyInfo (if both have it)
 *
 * Following the "don't penalize for missing data" principle:
 * Only weights components where BOTH sides have data, then normalizes.
 *
 * @param {Entity} otherObject - The other entity to compare against
 * @param {boolean} detailed - If true, returns detailed breakdown object instead of number
 * @returns {number|Object} Similarity score 0-1, or detailed breakdown object if detailed=true
 */
function entityWeightedComparison(otherObject, detailed = false) {
    const thisEntity = this;
    const otherEntity = otherObject;

    // Base weights from CLAUDE.md:
    // Individual: {name: 0.5, contactInfo: 0.3, otherInfo: 0.15, legacyInfo: 0.05}
    // We use the weights from comparisonWeights if set, otherwise defaults
    const baseWeights = thisEntity.comparisonWeights || {
        name: 0.5,
        contactInfo: 0.3,
        otherInfo: 0.15,
        legacyInfo: 0.05
    };

    // First pass: calculate raw similarities for name and contactInfo
    let nameSimilarity = null;
    let contactInfoSimilarity = null;

    const hasNameData = thisEntity.name && otherEntity.name &&
                        typeof thisEntity.name.compareTo === 'function';
    if (hasNameData) {
        nameSimilarity = thisEntity.name.compareTo(otherEntity.name);
    }

    const hasContactInfoData = thisEntity.contactInfo && otherEntity.contactInfo &&
                               typeof thisEntity.contactInfo.compareTo === 'function';
    if (hasContactInfoData) {
        contactInfoSimilarity = thisEntity.contactInfo.compareTo(otherEntity.contactInfo);
    }

    // Apply weight boost logic (NAME ONLY):
    // - If name is 100%: +12% to name weight
    // - If name is >95% (but <100%): +6% to name weight
    // Boost is taken proportionally from other categories
    let weights = { ...baseWeights };
    let boostAmount = 0;

    if (nameSimilarity !== null) {
        // Check for 100% perfect name match boost (12%)
        if (nameSimilarity === 1.0) {
            boostAmount = 0.12;
        }
        // Check for >95% high name match boost (6%)
        else if (nameSimilarity > 0.95) {
            boostAmount = 0.06;
        }
    }

    // Apply boost by redistributing from other categories proportionally
    if (boostAmount > 0) {
        // All non-name categories contribute to the boost
        const nonBoostCategories = ['contactInfo', 'otherInfo', 'legacyInfo'];
        const totalNonBoostWeight = nonBoostCategories.reduce((sum, cat) => sum + weights[cat], 0);

        if (totalNonBoostWeight > 0) {
            // Reduce each non-boost category proportionally
            nonBoostCategories.forEach(cat => {
                const proportion = weights[cat] / totalNonBoostWeight;
                weights[cat] -= boostAmount * proportion;
            });
            // Add boost to name
            weights.name += boostAmount;
        }
    }

    // Second pass: calculate weighted sum with adjusted weights
    let totalWeight = 0;
    let weightedSum = 0;

    if (hasNameData) {
        weightedSum += weights.name * nameSimilarity;
        totalWeight += weights.name;
    }

    if (hasContactInfoData) {
        weightedSum += weights.contactInfo * contactInfoSimilarity;
        totalWeight += weights.contactInfo;
    }

    // Compare otherInfo (if both have it and it has compareTo)
    const hasOtherInfoData = thisEntity.otherInfo && otherEntity.otherInfo &&
                             typeof thisEntity.otherInfo.compareTo === 'function';
    if (hasOtherInfoData) {
        const otherInfoSimilarity = thisEntity.otherInfo.compareTo(otherEntity.otherInfo);
        weightedSum += weights.otherInfo * otherInfoSimilarity;
        totalWeight += weights.otherInfo;
    }

    // Compare legacyInfo (if both have it and it has compareTo)
    const hasLegacyInfoData = thisEntity.legacyInfo && otherEntity.legacyInfo &&
                              typeof thisEntity.legacyInfo.compareTo === 'function';
    if (hasLegacyInfoData) {
        const legacyInfoSimilarity = thisEntity.legacyInfo.compareTo(otherEntity.legacyInfo);
        weightedSum += weights.legacyInfo * legacyInfoSimilarity;
        totalWeight += weights.legacyInfo;
    }

    // If no components have data, return 0
    if (totalWeight === 0) {
        return detailed ? { overallSimilarity: 0, components: {}, checkSum: 0 } : 0;
    }

    // Precision: 10 decimal places
    const PRECISION = 10000000000; // 10^10
    const round10 = (val) => Math.round(val * PRECISION) / PRECISION;

    // Normalize by total weight (so missing data doesn't penalize)
    const overallSimilarity = round10(weightedSum / totalWeight);

    if (!detailed) {
        return overallSimilarity;
    }

    // Build detailed breakdown - only include components with weight
    const components = {};
    let weightedValueSum = 0;

    if (hasNameData) {
        const actualWeight = round10(weights.name / totalWeight);
        const similarity = round10(nameSimilarity);
        const weightedValue = round10(actualWeight * similarity);
        components.name = {
            actualWeight: actualWeight,
            similarity: similarity,
            weightedValue: weightedValue
        };
        weightedValueSum += weightedValue;
    }

    if (hasContactInfoData) {
        const actualWeight = round10(weights.contactInfo / totalWeight);
        const similarity = round10(contactInfoSimilarity);
        const weightedValue = round10(actualWeight * similarity);
        components.contactInfo = {
            actualWeight: actualWeight,
            similarity: similarity,
            weightedValue: weightedValue
        };
        weightedValueSum += weightedValue;
    }

    if (hasOtherInfoData) {
        const otherInfoSimilarity = thisEntity.otherInfo.compareTo(otherEntity.otherInfo);
        const actualWeight = round10(weights.otherInfo / totalWeight);
        const similarity = round10(otherInfoSimilarity);
        const weightedValue = round10(actualWeight * similarity);
        components.otherInfo = {
            actualWeight: actualWeight,
            similarity: similarity,
            weightedValue: weightedValue
        };
        weightedValueSum += weightedValue;
    }

    if (hasLegacyInfoData) {
        const legacyInfoSimilarity = thisEntity.legacyInfo.compareTo(otherEntity.legacyInfo);
        const actualWeight = round10(weights.legacyInfo / totalWeight);
        const similarity = round10(legacyInfoSimilarity);
        const weightedValue = round10(actualWeight * similarity);
        components.legacyInfo = {
            actualWeight: actualWeight,
            similarity: similarity,
            weightedValue: weightedValue
        };
        weightedValueSum += weightedValue;
    }

    // checkSum: overallSimilarity minus sum of weightedValues (should be 0 for validation)
    const checkSum = round10(overallSimilarity - weightedValueSum);

    return {
        overallSimilarity: overallSimilarity,
        components: components,
        checkSum: checkSum
    };
}

// =============================================================================
// HOUSEHOLD INFORMATION WEIGHTED COMPARISON
// Compares HouseholdInformation objects for individual entity matching
// =============================================================================

/**
 * HouseholdInformation weighted comparison calculator
 * Compares household relationship data between two HouseholdInformation instances
 *
 * CONDITIONAL Weight Logic (based on THIS object's state):
 * - isInHousehold=false: isInHousehold gets 100%
 * - isInHousehold=true + householdIdentifier present: householdIdentifier 70%, isHeadOfHousehold 30%
 * - isInHousehold=true + no householdIdentifier: householdName 70%, isHeadOfHousehold 30%
 *
 * @param {HouseholdInformation} otherObject - The other HouseholdInformation to compare against
 * @param {boolean} detailed - If true, returns detailed breakdown object instead of number
 * @returns {number|Object} Similarity score 0-1, or detailed breakdown object if detailed=true
 */
function householdInformationWeightedComparison(otherObject, detailed = false) {
    const thisInfo = this;
    const otherInfo = otherObject;

    // Precision: 10 decimal places
    const PRECISION = 10000000000; // 10^10
    const round10 = (val) => Math.round(val * PRECISION) / PRECISION;

    let totalSimilarity = 0;
    const components = {};

    // Determine which weight mode to use based on THIS object's state
    const thisInHousehold = thisInfo.isInHousehold;
    const thisHasIdentifier = thisInfo.householdIdentifier && thisInfo.householdIdentifier.trim() !== '';

    if (!thisInHousehold) {
        // Mode 1: isInHousehold=false → isInHousehold gets 100%
        const inHouseholdSim = thisInfo.isInHousehold === otherInfo.isInHousehold ? 1 : 0;
        totalSimilarity = inHouseholdSim;
        components.isInHousehold = {
            similarity: inHouseholdSim,
            weight: 1.0,
            contribution: round10(inHouseholdSim)
        };
    } else if (thisHasIdentifier) {
        // Mode 2: isInHousehold=true + householdIdentifier present → identifier 70%, isHeadOfHousehold 30%
        let identifierSim = 0;
        if (thisInfo.householdIdentifier === otherInfo.householdIdentifier) {
            identifierSim = 1;
        } else if (otherInfo.householdIdentifier) {
            identifierSim = levenshteinSimilarity(thisInfo.householdIdentifier, otherInfo.householdIdentifier);
        }
        const identifierContribution = round10(identifierSim * 0.7);
        totalSimilarity += identifierContribution;
        components.householdIdentifier = {
            similarity: round10(identifierSim),
            weight: 0.7,
            contribution: identifierContribution
        };

        const headSim = thisInfo.isHeadOfHousehold === otherInfo.isHeadOfHousehold ? 1 : 0;
        const headContribution = round10(headSim * 0.3);
        totalSimilarity += headContribution;
        components.isHeadOfHousehold = {
            similarity: headSim,
            weight: 0.3,
            contribution: headContribution
        };
    } else {
        // Mode 3: isInHousehold=true + no householdIdentifier → householdName 70%, isHeadOfHousehold 30%
        let nameSim = 0;
        if (thisInfo.householdName === otherInfo.householdName) {
            nameSim = 1;
        } else if (thisInfo.householdName && otherInfo.householdName) {
            nameSim = levenshteinSimilarity(thisInfo.householdName, otherInfo.householdName);
        }
        const nameContribution = round10(nameSim * 0.7);
        totalSimilarity += nameContribution;
        components.householdName = {
            similarity: round10(nameSim),
            weight: 0.7,
            contribution: nameContribution
        };

        const headSim = thisInfo.isHeadOfHousehold === otherInfo.isHeadOfHousehold ? 1 : 0;
        const headContribution = round10(headSim * 0.3);
        totalSimilarity += headContribution;
        components.isHeadOfHousehold = {
            similarity: headSim,
            weight: 0.3,
            contribution: headContribution
        };
    }

    const overallSimilarity = round10(totalSimilarity);

    if (!detailed) {
        return overallSimilarity;
    }

    // Calculate checksum for validation
    let weightedValueSum = 0;
    Object.values(components).forEach(comp => {
        weightedValueSum += comp.contribution;
    });
    const checkSum = round10(overallSimilarity - weightedValueSum);

    return {
        overallSimilarity: overallSimilarity,
        components: components,
        checkSum: checkSum
    };
}

// =============================================================================
// COMPARISON CALCULATOR REGISTRY
// Maps string names to calculator functions for serializable references
// Enables constructor-based deserialization by avoiding function serialization
// =============================================================================

/**
 * Registry mapping calculator names to their function implementations
 * Used by resolveComparisonCalculator() to restore function references after deserialization
 *
 * To add a new calculator:
 * 1. Define the calculator function (must accept otherObject, operate in 'this' context)
 * 2. Add entry to this registry: 'calculatorName': calculatorFunction
 * 3. Use the name in class constructors: this.comparisonCalculatorName = 'calculatorName'
 */
const COMPARISON_CALCULATOR_REGISTRY = Object.freeze({
    'defaultWeightedComparison': defaultWeightedComparison,
    'addressWeightedComparison': addressWeightedComparison,
    'contactInfoWeightedComparison': contactInfoWeightedComparison,
    'entityWeightedComparison': entityWeightedComparison,
    'householdInformationWeightedComparison': householdInformationWeightedComparison
});

/**
 * Resolve a calculator name to its function reference
 * Used during deserialization to restore function references from serialized string names
 *
 * @param {string} calculatorName - Name of the calculator to resolve
 * @param {Function} fallback - Optional fallback function if name not found (defaults to defaultWeightedComparison)
 * @returns {Function|null} The calculator function, fallback, or null if no fallback provided
 */
function resolveComparisonCalculator(calculatorName, fallback = defaultWeightedComparison) {
    if (!calculatorName) {
        return fallback;
    }

    const calculator = COMPARISON_CALCULATOR_REGISTRY[calculatorName];
    if (calculator) {
        return calculator;
    }

    console.warn(`[resolveComparisonCalculator] Calculator '${calculatorName}' not found in registry, using fallback`);
    return fallback;
}

/**
 * Check if a calculator name is valid (exists in registry)
 * @param {string} calculatorName - Name to validate
 * @returns {boolean} True if name exists in registry
 */
function isValidCalculatorName(calculatorName) {
    return calculatorName && COMPARISON_CALCULATOR_REGISTRY.hasOwnProperty(calculatorName);
}

/**
 * Get list of all available calculator names
 * @returns {Array<string>} Array of registered calculator names
 */
function getAvailableCalculators() {
    return Object.keys(COMPARISON_CALCULATOR_REGISTRY);
}

// =============================================================================
// GENERIC OBJECT COMPARISON UTILITY (compareTo convention)
// Core comparison logic for all classes with dynamic property iteration
// Enhanced with weighted comparison support
// Returns 0 for match, non-zero for non-match (following Java compareTo convention)
// =============================================================================

/**
 * Generic object comparison utility that dynamically iterates through properties
 * Auto-detects and calls .compareTo() methods on object properties
 * @param {Object} obj1 - First object to compare
 * @param {Object} obj2 - Second object to compare
 * @param {Array} excludedProperties - Array of additional property names to skip
 * @returns {number} 0 if objects match, non-zero if different
 * @throws {Error} If objects are different types (invalid comparison)
 */
function genericObjectCompareTo(obj1, obj2, excludedProperties) {
    // Basic null/undefined checks
    if (!obj1 && !obj2) return 0; // Both null = match
    if (!obj1 || !obj2) return 1; // One null, one not = no match

    // Different types should throw error - invalid comparison
    if (obj1.constructor !== obj2.constructor) {
        throw new Error('Cannot compare objects of different types: ' +
                       obj1.constructor.name + ' vs ' + obj2.constructor.name);
    }

    // Check if object has weighted comparison capability
    // COMMENTED OUT: Diagnostic logging - preserved for debugging if needed
    // console.log('[genericObjectCompareTo] Checking weighted comparison...');
    // console.log('  obj1.comparisonCalculator:', typeof obj1.comparisonCalculator);
    // console.log('  obj1.comparisonWeights:', obj1.comparisonWeights);

    if (obj1.comparisonCalculator && typeof obj1.comparisonCalculator === 'function') {
        // console.log('[genericObjectCompareTo] Calling comparisonCalculator...');
        const weightedResult = obj1.comparisonCalculator.call(obj1, obj2);
        // console.log('[genericObjectCompareTo] weightedResult:', weightedResult);
        if (weightedResult !== null) {
            // console.log('[genericObjectCompareTo] Returning weighted result');
            return weightedResult; // Return weighted comparison result (already rounded)
        }
    }
    // console.log('[genericObjectCompareTo] Falling back to property-by-property comparison');

    // Get all enumerable properties from obj1
    var allProperties = Object.keys(obj1);

    // Default exclusions (internal/metadata properties that shouldn't affect matching)
    var defaultExclusions = [
        '__type', 'constructor', 'prototype',
        'sourceMap', 'processingTimestamp', 'processingSource',
        'alternatives', // Aliases are handled separately in most cases
        'comparisonWeights', 'comparisonCalculator' // Weighted comparison architecture properties
    ];

    // Combine default exclusions with provided exclusions
    var skipProperties = defaultExclusions.concat(excludedProperties || []);

    // Check each property
    for (var i = 0; i < allProperties.length; i++) {
        var propName = allProperties[i];

        // Skip excluded properties
        if (skipProperties.indexOf(propName) !== -1) {
            continue;
        }

        var value1 = obj1[propName];
        var value2 = obj2[propName];

        // Both null/undefined = match for this property
        if (!value1 && !value2) {
            continue;
        }

        // One null, one not null = no match
        if (!value1 || !value2) {
            return 1;
        }

        // Check if the value has a compareTo() method
        if (typeof value1.compareTo === 'function') {
            var result = value1.compareTo(value2);
            if (result !== 0) {
                return result; // Propagate non-zero result
            }
            continue;
        }

        // For primitive values, use simple equality
        // FUTURE ENHANCEMENT: Could use simpleStringMatch for strings
        if (value1 !== value2) {
            return 1; // Different primitive values
        }
    }

    return 0; // All properties matched
}


// ✅ Google Drive API function moved to scripts/core/googleDriveAPI.js
// testResponseFormats() - Test function to verify response format consistency

// ✅ Google Drive API function moved to scripts/core/googleDriveAPI.js
// testTrackingMechanism() - Test function to verify tracking mechanism

// Combined test function to run all tests
async function testRetrySystemHealth() {
    console.log('🔍 TESTING RETRY SYSTEM HEALTH 🔍');
    console.log('=====================================');

    const results = {
        getFilesList: await testGetFilesList(),
        responseFormat: await testResponseFormats(),
        tracking: await testTrackingMechanism()
    };

    console.log('\n📊 SUMMARY:');
    console.log('getFilesList works:', !!results.getFilesList);
    console.log('Response format consistent:', !!(results.responseFormat && results.responseFormat.body));
    console.log('Tracking files accessible:', !!(results.tracking && results.tracking.originalParcels > 0));
    console.log('Can verify uploads:', !!(results.tracking && results.tracking.canVerifyUploads));

    return results;
}

// Test the FIXED functions
async function testFixedFunctions() {
    console.log('🔧 TESTING FIXED FUNCTIONS 🔧');
    console.log('================================');

    try {
        // Test fixed getFilesList()
        console.log('Testing FIXED getFilesList()...');
        const filesList = await getFilesList(parameters.pidFilesParents);
        console.log('✅ getFilesList() SUCCESS! Found', filesList.length, 'files');
        console.log('Sample uploaded files:', filesList.slice(0, 5));

        // Test if fixDiscrepancies can now work
        console.log('\nTesting fixDiscrepancies capability...');
        const completedPids = await loadFromDisk('completed_pids.json') || [];
        const actualUploadedPids = filesList.map(file => file[0]);

        const missingPids = completedPids.filter(pid => !actualUploadedPids.includes(pid));
        console.log('✅ fixDiscrepancies() CAN NOW WORK!');
        console.log(`- Tracked completed: ${completedPids.length}`);
        console.log(`- Actually uploaded: ${actualUploadedPids.length}`);
        console.log(`- Missing (need retry): ${missingPids.length}`);

        return {
            success: true,
            filesFound: filesList.length,
            canVerifyUploads: true,
            missingCount: missingPids.length
        };

    } catch (error) {
        console.error('❌ Fixed functions still failing:', error);
        return { success: false, error: error.message };
    }
}

// Simple function to get 500 random parcels from the 2317 list
// ✅ VisionAppraisal processing function moved to scripts/core/visionAppraisalProcessing.js
// get500RandomParcels() - Get 500 random parcels for testing purposes

// ✅ VisionAppraisal processing class moved to scripts/core/visionAppraisalProcessing.js
// ParcelDataExtractor - High-performance HTML processing class for VisionAppraisal data

// ✅ VisionAppraisal processing class moved to scripts/core/visionAppraisalProcessing.js
// ParcelDataExtractorV2 - Optimized version focused on batch processing

// ✅ VisionAppraisal test function moved to scripts/core/visionAppraisalProcessing.js
// testBatchPerformance() - Test batch performance of parcel processing

// ✅ testParcelDataExtractor() function moved to scripts/core/visionAppraisalProcessing.js
// Test function to verify ParcelDataExtractor works with real data - now available in VisionAppraisal module

// Priority 1B: Google API Manager with token caching
// ✅ Google Drive API class moved to scripts/core/googleDriveAPI.js
// GoogleAPIManager - Advanced Google Drive API Manager with token caching and optimization

// ✅ Google Drive API function moved to scripts/core/googleDriveAPI.js
// testGoogleAPIManager() - Test Google API Manager performance and token caching

// ✅ Performance optimization class moved to scripts/performance/optimizedProcessing.js
// OptimizedParcelProcessor - High-performance parcel processing with targeted optimizations

// ✅ Performance optimization function moved to scripts/performance/optimizedProcessing.js
// testOptimizedProcessing() - Test optimized parcel processing system

/**
 * Test structural enhancements for Requirements 1, 4, 6, 12, 20, 21
 * Tests Info base class, AttributedTerm fieldName, OtherInfo/LegacyInfo systems, property updates
 * Protocol 2: Test code with regression testing value
 */
async function testStructuralEnhancements() {
    const results = {
        total: 0,
        passed: 0,
        failed: 0,
        tests: []
    };

    function runTest(name, testFunction) {
        results.total++;
        try {
            const result = testFunction();
            if (result) {
                results.passed++;
                results.tests.push(`✅ ${name}`);
                console.log(`✅ ${name}`);
            } else {
                results.failed++;
                results.tests.push(`❌ ${name}`);
                console.log(`❌ ${name}`);
            }
            return result;
        } catch (error) {
            results.failed++;
            results.tests.push(`❌ ${name} - Error: ${error.message}`);
            console.log(`❌ ${name} - Error: ${error.message}`);
            return false;
        }
    }

    console.log('🧪 Testing Structural Enhancements - Requirements 1, 4, 6, 12, 20, 21');
    console.log('='.repeat(60));

    // Phase 1: Info Base Class Testing (Requirement 20)
    console.log('\n📋 Phase 1: Info Base Class (Requirement 20)');

    runTest('Info base class exists and can be instantiated', () => {
        const info = new Info();
        return info instanceof Info;
    });

    runTest('ContactInfo extends Info', () => {
        const contactInfo = new ContactInfo();
        return contactInfo instanceof Info && contactInfo instanceof ContactInfo;
    });

    runTest('ContactInfo inherits Info methods', () => {
        const contactInfo = new ContactInfo();
        return typeof contactInfo.getPropertySummary === 'function' &&
               typeof contactInfo.setProperty === 'function';
    });

    runTest('Info serialization includes correct type', () => {
        const contactInfo = new ContactInfo();
        const serialized = contactInfo.serialize();
        return serialized.type === 'ContactInfo';
    });

    // Phase 2: AttributedTerm Enhancement Testing (Requirement 4)
    console.log('\n📋 Phase 2: AttributedTerm Enhancement (Requirement 4)');

    runTest('AttributedTerm accepts fieldName parameter', () => {
        const term = new AttributedTerm('test@email.com', 'BLOOMERANG_CSV', 1, 'ACC123', 'email');
        return term.fieldName === 'email';
    });

    runTest('AttributedTerm fieldName defaults to null', () => {
        const term = new AttributedTerm('test@email.com', 'BLOOMERANG_CSV', 1, 'ACC123');
        return term.fieldName === null;
    });

    runTest('AttributedTerm setFieldName/getFieldName work', () => {
        const term = new AttributedTerm('test@email.com', 'BLOOMERANG_CSV', 1, 'ACC123');
        term.setFieldName('email');
        return term.getFieldName() === 'email';
    });

    runTest('AttributedTerm serialization includes fieldName', () => {
        const term = new AttributedTerm('test@email.com', 'BLOOMERANG_CSV', 1, 'ACC123', 'email');
        const serialized = term.serialize();
        return serialized.fieldName === 'email';
    });

    runTest('AttributedTerm toString includes fieldName', () => {
        const term = new AttributedTerm('test@email.com', 'BLOOMERANG_CSV', 1, 'ACC123', 'email');
        return term.toString().includes('field: email');
    });

    // Phase 3: OtherInfo System Testing (Requirement 1)
    console.log('\n📋 Phase 3: OtherInfo System (Requirement 1)');

    runTest('OtherInfo base class exists and extends Info', () => {
        const otherInfo = new OtherInfo();
        return otherInfo instanceof Info && otherInfo instanceof OtherInfo;
    });

    runTest('HouseholdOtherInfo extends OtherInfo', () => {
        const householdOtherInfo = new HouseholdOtherInfo();
        return householdOtherInfo instanceof Info &&
               householdOtherInfo instanceof OtherInfo &&
               householdOtherInfo instanceof HouseholdOtherInfo;
    });

    runTest('OtherInfo has householdInformation', () => {
        const otherInfo = new OtherInfo();
        return otherInfo.hasOwnProperty('householdInformation') &&
               otherInfo.householdInformation instanceof HouseholdInformation;
    });

    runTest('Entity has otherInfo property', () => {
        const entity = new Entity(null, null);
        return entity.hasOwnProperty('otherInfo') && entity.otherInfo === null;
    });

    runTest('Entity addOtherInfo method works', () => {
        const entity = new Entity(null, null);
        const otherInfo = new OtherInfo();
        entity.addOtherInfo(otherInfo);
        return entity.otherInfo === otherInfo;
    });

    // Phase 4: LegacyInfo System Testing (Requirement 21)
    console.log('\n📋 Phase 4: LegacyInfo System (Requirement 21)');

    runTest('LegacyInfo class exists and extends Info', () => {
        const legacyInfo = new LegacyInfo();
        return legacyInfo instanceof Info && legacyInfo instanceof LegacyInfo;
    });

    runTest('LegacyInfo has all 6 VisionAppraisal properties', () => {
        const legacyInfo = new LegacyInfo();
        return legacyInfo.hasOwnProperty('ownerName') &&
               legacyInfo.hasOwnProperty('ownerName2') &&
               legacyInfo.hasOwnProperty('neighborhood') &&
               legacyInfo.hasOwnProperty('userCode') &&
               legacyInfo.hasOwnProperty('date') &&
               legacyInfo.hasOwnProperty('sourceIndex');
    });

    runTest('LegacyInfo setter methods work', () => {
        const legacyInfo = new LegacyInfo();
        const testData = new IndicativeData(new SimpleIdentifiers(new AttributedTerm('TestOwner', 'VISION_APPRAISAL', 1, 'PID123')));
        legacyInfo.setOwnerName(testData);
        return legacyInfo.ownerName === testData;
    });

    runTest('Entity has legacyInfo property', () => {
        const entity = new Entity(null, null);
        return entity.hasOwnProperty('legacyInfo') && entity.legacyInfo === null;
    });

    runTest('Entity addLegacyInfo method works', () => {
        const entity = new Entity(null, null);
        const legacyInfo = new LegacyInfo();
        entity.addLegacyInfo(legacyInfo);
        return entity.legacyInfo === legacyInfo;
    });

    // Phase 5: Property Structure Updates Testing (Requirements 6, 12)
    console.log('\n📋 Phase 5: Property Structure Updates (Requirements 6, 12)');

    runTest('HouseholdName uses fullHouseholdName property', () => {
        const primaryAlias = new AttributedTerm('Smith Household', 'BLOOMERANG_CSV', 1, 'ACC123');
        const householdName = new HouseholdName(primaryAlias, 'The Smith Family');
        return householdName.fullHouseholdName === 'The Smith Family';
    });

    runTest('HouseholdName serialization uses fullHouseholdName', () => {
        const primaryAlias = new AttributedTerm('Smith Household', 'BLOOMERANG_CSV', 1, 'ACC123');
        const householdName = new HouseholdName(primaryAlias, 'The Smith Family');
        const serialized = householdName.serialize();
        return serialized.fullHouseholdName === 'The Smith Family';
    });

    runTest('ContactInfo secondaryAddress is array', () => {
        const contactInfo = new ContactInfo();
        return Array.isArray(contactInfo.secondaryAddress) && contactInfo.secondaryAddress.length === 0;
    });

    runTest('ContactInfo addSecondaryAddress method works', () => {
        const contactInfo = new ContactInfo();
        const addressData = new IndicativeData(new ComplexIdentifiers(new AttributedTerm('123 Main St', 'BLOOMERANG_CSV', 1, 'ACC123')));
        contactInfo.addSecondaryAddress(addressData);
        return contactInfo.secondaryAddress.length === 1 && contactInfo.secondaryAddress[0] === addressData;
    });

    // Phase 6: Regression Testing
    console.log('\n📋 Phase 6: Regression Testing - Existing Functionality');

    runTest('Basic Entity creation still works', () => {
        const locationId = new IdentifyingData(new SimpleIdentifiers(new AttributedTerm('1234', 'VISION_APPRAISAL', 1, 'PID123')));
        const name = new IdentifyingData(new IndividualName(new AttributedTerm('John Doe', 'BLOOMERANG_CSV', 1, 'ACC123'), '', 'John', '', 'Doe', ''));
        const entity = new Entity(locationId, name);
        return entity instanceof Entity && entity.locationIdentifier === locationId && entity.name === name;
    });

    runTest('AttributedTerm basic functionality still works', () => {
        const term = new AttributedTerm('test@email.com', 'BLOOMERANG_CSV', 1, 'ACC123');
        return term.term === 'test@email.com' && term.getSources().includes('BLOOMERANG_CSV');
    });

    runTest('SimpleIdentifiers still works with AttributedTerm', () => {
        const term = new AttributedTerm('test@email.com', 'BLOOMERANG_CSV', 1, 'ACC123');
        const identifier = new SimpleIdentifiers(term);
        return identifier.primaryAlias === term && identifier instanceof Aliased;
    });

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 STRUCTURAL ENHANCEMENTS TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${results.total}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Success Rate: ${(results.passed/results.total*100).toFixed(1)}%`);

    if (results.failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! Structural enhancements are working correctly.');
        console.log('✅ Ready to proceed to Phase 4: Address/Name Parsing Research');
    } else {
        console.log(`\n❌ ${results.failed} TESTS FAILED. Issues detected that need attention:`);
        results.tests.filter(test => test.startsWith('❌')).forEach(test => console.log(`   ${test}`));
    }

    return results;
}

// Address Parsing Testing Functions
function testAddressParsing() {
    console.log('🚀 Testing parse-address library...');

    // Test addresses for Block Island
    const testAddresses = [
        '123 Main St, Block Island, RI 02807',
        '456 Ocean Ave, New Shoreham, RI 02807',
        '789 Spring Street Block Island RI',
        'PO Box 100, Block Island, RI 02807',
        '321 Harbor Rd, New Shoreham, Rhode Island 02807-1234'
    ];

    const results = {
        total: testAddresses.length,
        passed: 0,
        failed: 0,
        tests: []
    };

    // Since we're in browser, we need to check if parse-address is available
    if (typeof parseAddress === 'undefined') {
        console.log('❌ parse-address library not loaded in browser');
        console.log('💡 Need to include parse-address in HTML or load via script tag');
        results.failed = results.total;
        results.tests.push('❌ parse-address library not available in browser');
        return results;
    }

    testAddresses.forEach((address, index) => {
        try {
            const parsed = parseAddress.parseLocation(address);
            console.log(`\nTest ${index + 1}: "${address}"`);
            console.log('Parsed result:', parsed);

            // Check if we got reasonable parsing results
            if (parsed && (parsed.city || parsed.zip)) {
                results.passed++;
                results.tests.push(`✅ Test ${index + 1}: Successfully parsed "${address}"`);

                // Check for Block Island specific normalization needs
                if (parsed.city === 'Block Island' || parsed.city === 'New Shoreham') {
                    console.log(`   🏝️ Block Island city detected: ${parsed.city}`);
                }
                if (parsed.zip === '02807') {
                    console.log(`   📮 Block Island ZIP detected: ${parsed.zip}`);
                }
            } else {
                results.failed++;
                results.tests.push(`❌ Test ${index + 1}: Failed to parse "${address}"`);
            }
        } catch (error) {
            console.log(`❌ Error parsing "${address}":`, error);
            results.failed++;
            results.tests.push(`❌ Test ${index + 1}: Exception parsing "${address}"`);
        }
    });

    console.log(`\n📊 Address Parsing Test Results:`);
    console.log(`Total: ${results.total}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Success Rate: ${(results.passed/results.total*100).toFixed(1)}%`);

    return results;
}

// ============================================================================
// ADDRESS PROCESSING FUNCTIONS MOVED TO MODULAR ARCHITECTURE
// ============================================================================
// The following functions have been extracted to: scripts/address/addressProcessing.js
// - normalizeBlockIslandCity()
// - processAddress()
// - loadBlockIslandStreetsFromDrive()
// - enhanceAddressWithBlockIslandLogic()
// - createAddressFromParsedData()
//
// To use these functions, include: <script src="./scripts/address/addressProcessing.js"></script>
// ============================================================================

// ============================================================================
// ADDRESS TESTING FUNCTIONS MOVED TO MODULAR ARCHITECTURE
// ============================================================================
// The following functions have been extracted to: scripts/testing/addressTesting.js
// - validateAddressProcessing()
// - addressProcessingTests()
// - quickAddressTest()
//
// To use these functions, include: <script src="./scripts/testing/addressTesting.js"></script>
// ============================================================================

// ============================================================================
// PHASE 3 DATA LOADING FUNCTIONS MOVED TO MODULAR ARCHITECTURE
// ============================================================================
// The following functions have been extracted to: scripts/data/sampleDataLoader.js
// - loadSampleData()
// - loadGoogleDriveFile()
// - extractAddressesFromSamples()
//
// To use these functions, include: <script src="./scripts/data/sampleDataLoader.js"></script>
// ============================================================================

// ============================================================================
// BROWSER AND NODE.JS EXPORTS
// ============================================================================

// Export for browser
if (typeof window !== 'undefined') {
    window.levenshteinDistance = levenshteinDistance;
    window.levenshteinSimilarity = levenshteinSimilarity;
    window.defaultWeightedComparison = defaultWeightedComparison;
    window.addressWeightedComparison = addressWeightedComparison;
    window.contactInfoWeightedComparison = contactInfoWeightedComparison;
    window.entityWeightedComparison = entityWeightedComparison;
    window.findBestAddressMatch = findBestAddressMatch;
    window.getEmailString = getEmailString;
    window.isPOBoxAddress = isPOBoxAddress;
    window.isBlockIslandCity = isBlockIslandCity;
    window.isBlockIslandStreet = isBlockIslandStreet;
    window.isBlockIslandZip = isBlockIslandZip;
    window.getComponentSimilarity = getComponentSimilarity;
    window.getStateSimilarity = getStateSimilarity;
    window.genericObjectCompareTo = genericObjectCompareTo;
    window.simpleStringMatch = simpleStringMatch;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports.levenshteinDistance = levenshteinDistance;
    module.exports.levenshteinSimilarity = levenshteinSimilarity;
    module.exports.defaultWeightedComparison = defaultWeightedComparison;
    module.exports.addressWeightedComparison = addressWeightedComparison;
    module.exports.contactInfoWeightedComparison = contactInfoWeightedComparison;
    module.exports.entityWeightedComparison = entityWeightedComparison;
    module.exports.findBestAddressMatch = findBestAddressMatch;
    module.exports.getEmailString = getEmailString;
    module.exports.isPOBoxAddress = isPOBoxAddress;
    module.exports.isBlockIslandCity = isBlockIslandCity;
    module.exports.isBlockIslandStreet = isBlockIslandStreet;
    module.exports.isBlockIslandZip = isBlockIslandZip;
    module.exports.getComponentSimilarity = getComponentSimilarity;
    module.exports.getStateSimilarity = getStateSimilarity;
    module.exports.genericObjectCompareTo = genericObjectCompareTo;
    module.exports.simpleStringMatch = simpleStringMatch;
}

