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
// DATA QUALITY WARNING TRACKING
// Track warnings that have already been logged to avoid repetitive output
// =============================================================================
const _loggedPOBoxWarnings = new Set();

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
 * Case-insensitive comparison (converts both strings to uppercase)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score (1 = identical, 0 = completely different)
 */
function levenshteinSimilarity(str1, str2) {
    if (!str1 && !str2) return 1.0;  // Both empty = perfect match
    if (!str1 || !str2) return 0.0;  // One empty = no match

    // Normalize to uppercase for case-insensitive comparison
    const normalized1 = str1.toUpperCase();
    const normalized2 = str2.toUpperCase();

    const distance = levenshteinDistance(normalized1, normalized2);
    const maxLength = Math.max(normalized1.length, normalized2.length);
    return maxLength > 0 ? 1 - (distance / maxLength) : 1.0;
}

// =============================================================================
// CROSS-TYPE NAME EXTRACTION
// Extract comparable name strings from any name type (IndividualName, HouseholdName, SimpleIdentifiers)
// Used by universalEntityMatcher.js and fireNumberCollisionHandler.js
// =============================================================================

/**
 * Extract a displayable/comparable name string from any name type.
 * Handles IndividualName, HouseholdName, SimpleIdentifiers, and generic fallbacks.
 *
 * @param {object} nameObj - Name object (IndividualName, SimpleIdentifiers, HouseholdName, etc.)
 * @returns {string} Best string representation for comparison
 */
function extractNameString(nameObj) {
    if (!nameObj) return '';

    const nameType = nameObj.constructor?.name;

    // IndividualName - use completeName or build from components
    if (nameType === 'IndividualName') {
        if (nameObj.completeName) return nameObj.completeName;
        const parts = [nameObj.firstName, nameObj.otherNames, nameObj.lastName].filter(p => p);
        return parts.join(' ').trim();
    }

    // HouseholdName - use termOfAddress or primaryAlias
    if (nameType === 'HouseholdName') {
        if (nameObj.termOfAddress) return nameObj.termOfAddress;
        if (nameObj.primaryAlias?.term) return nameObj.primaryAlias.term;
        return '';
    }

    // SimpleIdentifiers - use primaryAlias term
    if (nameType === 'SimpleIdentifiers') {
        if (nameObj.primaryAlias?.term) return nameObj.primaryAlias.term;
        return '';
    }

    // Generic fallback - try common properties
    if (nameObj.completeName) return nameObj.completeName;
    if (nameObj.termOfAddress) return nameObj.termOfAddress;
    if (nameObj.primaryAlias?.term) return nameObj.primaryAlias.term;
    if (typeof nameObj.toString === 'function') return nameObj.toString();

    return '';
}

/**
 * Compare two names of potentially different types using string comparison.
 * Uses extractNameString to normalize both names to strings, then compares with levenshteinSimilarity.
 *
 * @param {object} name1 - First name object (any name type)
 * @param {object} name2 - Second name object (any name type)
 * @returns {number} Similarity score 0-1
 */
function crossTypeNameComparison(name1, name2) {
    const str1 = extractNameString(name1).toLowerCase().trim();
    const str2 = extractNameString(name2).toLowerCase().trim();

    if (!str1 || !str2) return 0;

    // Use levenshteinSimilarity (defined above in this file)
    return levenshteinSimilarity(str1, str2);
}

// =============================================================================
// PERMUTATION-BASED NAME COMPARISON
// Alternative name comparison that finds optimal word-to-word pairings
// Handles cases where names may be in different fields (firstName vs otherNames, etc.)
// =============================================================================

/**
 * Permutation-based name comparison for IndividualName objects.
 * Compares name words across all fields to find optimal pairings.
 *
 * Handles special cases:
 * - Short words (<=2 chars): Treated specially or ignored depending on count
 * - Long words (contain space): Split into component words
 *
 * @param {IndividualName} name1 - First name to compare
 * @param {IndividualName} name2 - Second name to compare
 * @returns {number} Similarity score 0-1
 */
function permutationBasedNameComparison(name1, name2) {
    // Extract name words from both comparators, filtering empty strings
    const extractNameWords = (name) => {
        const words = [];
        if (name.firstName && name.firstName.trim()) words.push(name.firstName.trim());
        if (name.lastName && name.lastName.trim()) words.push(name.lastName.trim());
        if (name.otherNames && name.otherNames.trim()) words.push(name.otherNames.trim());
        return words;
    };

    let words1 = extractNameWords(name1);
    let words2 = extractNameWords(name2);

    // If either has no words, return 0
    if (words1.length === 0 || words2.length === 0) {
        return 0;
    }

    // Detect special cases
    const isShortWord = (word) => word.length <= 2;
    const isLongWord = (word) => word.includes(' ');
    const stripPunctuation = (word) => word.replace(/[^a-zA-Z0-9]/g, '');

    const shortWords1 = words1.filter(isShortWord);
    const shortWords2 = words2.filter(isShortWord);
    const longWords1 = words1.filter(isLongWord);
    const longWords2 = words2.filter(isLongWord);

    const hasShortWord1 = shortWords1.length === 1;
    const hasShortWord2 = shortWords2.length === 1;
    const hasMultipleShortWords1 = shortWords1.length > 1;
    const hasMultipleShortWords2 = shortWords2.length > 1;
    const hasLongWord1 = longWords1.length > 0;
    const hasLongWord2 = longWords2.length > 0;

    // If multiple short words on either side, ignore short word handling entirely
    const ignoreShortWords = hasMultipleShortWords1 || hasMultipleShortWords2;

    // Determine the case and process accordingly
    let shortWordScore = null;
    let shortWordWeight = 0;

    // Process short words if exactly one on each side and not ignoring
    if (!ignoreShortWords && hasShortWord1 && hasShortWord2) {
        // Cases d, e, j: Both have exactly one short word
        shortWordScore = levenshteinSimilarity(
            stripPunctuation(shortWords1[0].toUpperCase()),
            stripPunctuation(shortWords2[0].toUpperCase())
        );
        shortWordWeight = 0.1;

        // Remove short words from the word lists for remaining comparison
        words1 = words1.filter(w => !isShortWord(w));
        words2 = words2.filter(w => !isShortWord(w));
    } else if (!ignoreShortWords && (hasShortWord1 || hasShortWord2)) {
        // Cases b, f, h, i: Only one side has a short word - ignore it
        if (hasShortWord1) {
            words1 = words1.filter(w => !isShortWord(w));
        }
        if (hasShortWord2) {
            words2 = words2.filter(w => !isShortWord(w));
        }
    }

    // Process long words - split them and replace in word lists
    const processLongWords = (words) => {
        const result = [];
        for (const word of words) {
            if (isLongWord(word)) {
                // Split on spaces, filter single-char results, strip punctuation
                const splitWords = word.split(/\s+/)
                    .map(w => stripPunctuation(w))
                    .filter(w => w.length > 1); // Ignore single-char words from splits
                result.push(...splitWords);
            } else {
                result.push(stripPunctuation(word));
            }
        }
        return result;
    };

    // If either side has long words, process them
    if (hasLongWord1 || hasLongWord2) {
        words1 = processLongWords(words1);
        words2 = processLongWords(words2);
    } else {
        // Strip punctuation from all words even without long words
        words1 = words1.map(stripPunctuation);
        words2 = words2.map(stripPunctuation);
    }

    // Filter any remaining empty strings after processing
    words1 = words1.filter(w => w.length > 0);
    words2 = words2.filter(w => w.length > 0);

    // If no words left to compare after processing, handle edge case
    if (words1.length === 0 && words2.length === 0) {
        // Only had short words which were compared
        return shortWordScore !== null ? shortWordScore : 0;
    }
    if (words1.length === 0 || words2.length === 0) {
        // One side has no remaining words
        if (shortWordScore !== null) {
            return shortWordScore * shortWordWeight;
        }
        return 0;
    }

    // Skip permutation comparison for names with 8+ words to prevent explosion
    // generatePermutations(n, k) creates n!/(n-k)! results which explodes with large n
    // 7! = 5,040 (acceptable), 8! = 40,320 (too many)
    const MAX_WORDS_FOR_PERMUTATION = 7;
    if (words1.length > MAX_WORDS_FOR_PERMUTATION || words2.length > MAX_WORDS_FOR_PERMUTATION) {
        // Too many words - return 0 for this comparison path
        if (shortWordScore !== null) {
            return shortWordScore * shortWordWeight;
        }
        return 0;
    }

    // Calculate best score from unique pairwise comparisons
    const bestPairwiseScore = calculateBestPairwiseScore(words1, words2);

    // Apply haircut factor when word counts differ
    // Haircut = (1 - (1 - smaller/larger)^2.5)
    const smallerCount = Math.min(words1.length, words2.length);
    const largerCount = Math.max(words1.length, words2.length);
    const haircutFactor = (smallerCount === largerCount) ? 1.0 : (1 - Math.pow(1 - smallerCount / largerCount, 2.5));
    const adjustedPairwiseScore = bestPairwiseScore * haircutFactor;

    // Combine scores if we have a short word component
    let finalScore;
    if (shortWordScore !== null) {
        // 10% short word, 90% remaining (with haircut applied to remaining)
        finalScore = (shortWordScore * 0.1) + (adjustedPairwiseScore * 0.9);
    } else {
        finalScore = adjustedPairwiseScore;
    }

    // Apply final adjustment: subtract 0.01
    finalScore = finalScore - 0.01;

    // Ensure score doesn't go below 0
    return Math.max(0, finalScore);
}

/**
 * Calculate the best score from all unique pairwise comparisons.
 * For each permutation of pairing words from list1 to words from list2,
 * calculates the average similarity and returns the best.
 *
 * @param {string[]} words1 - First list of words
 * @param {string[]} words2 - Second list of words
 * @returns {number} Best average similarity score from all pairings
 */
function calculateBestPairwiseScore(words1, words2) {
    // Ensure words1 is the smaller or equal list (for permutation generation)
    const smaller = words1.length <= words2.length ? words1 : words2;
    const larger = words1.length <= words2.length ? words2 : words1;

    // Generate all permutations of selecting smaller.length items from larger
    // and pairing them with smaller
    const permutations = generatePermutations(larger.length, smaller.length);

    let bestScore = 0;

    for (const perm of permutations) {
        let totalSimilarity = 0;
        for (let i = 0; i < smaller.length; i++) {
            const word1 = smaller[i].toUpperCase();
            const word2 = larger[perm[i]].toUpperCase();
            totalSimilarity += levenshteinSimilarity(word1, word2);
        }
        const avgSimilarity = totalSimilarity / smaller.length;
        if (avgSimilarity > bestScore) {
            bestScore = avgSimilarity;
        }
    }

    return bestScore;
}

/**
 * Generate all permutations of selecting k items from n items.
 * Returns arrays of indices representing which items from the larger set
 * are paired with each item from the smaller set.
 *
 * @param {number} n - Size of larger set
 * @param {number} k - Size of smaller set (number to select)
 * @returns {number[][]} Array of permutations, each an array of k indices
 */
function generatePermutations(n, k) {
    const results = [];

    // Generate all k-permutations of indices 0 to n-1
    const permute = (current, used) => {
        if (current.length === k) {
            results.push([...current]);
            return;
        }

        for (let i = 0; i < n; i++) {
            if (!used[i]) {
                used[i] = true;
                current.push(i);
                permute(current, used);
                current.pop();
                used[i] = false;
            }
        }
    };

    permute([], new Array(n).fill(false));
    return results;
}

// =============================================================================
// DEFAULT WEIGHTED COMPARISON - Real Implementation
// Uses vowel-weighted Levenshtein for sophisticated name/string comparison
// =============================================================================

/**
 * Default weighted comparison calculator using vowel-weighted Levenshtein
 * Used by genericObjectCompareTo when comparisonWeights are configured
 * Operates in 'this' context of the calling object
 *
 * For IndividualName objects, also calculates permutation-based comparison
 * and returns the better of the two scores.
 *
 * @param {Object} otherObject - Object to compare against
 * @returns {number} Similarity score 0-1, or null for fallback to property-by-property
 */
function defaultWeightedComparison(otherObject, detailed = false) {
    // Precision helper
    const round10 = (val) => Math.round(val * 10000000000) / 10000000000;

    // Check if weights are configured
    if (!this.comparisonWeights) {
        return detailed ? { overallSimilarity: null, error: 'No comparisonWeights configured' } : null;
    }

    let totalWeightedScore = 0;
    let totalWeight = 0;
    const components = {};

    // Iterate through configured weights only
    for (let propName in this.comparisonWeights) {
        const weight = this.comparisonWeights[propName];
        const thisValue = this[propName];
        const otherValue = otherObject[propName];

        // Handle missing values - still record in components for detailed mode
        if (!thisValue || !otherValue) {
            if (detailed) {
                components[propName] = {
                    baseValue: thisValue || '',
                    targetValue: otherValue || '',
                    similarity: 0,
                    weight: weight,
                    contribution: 0,
                    skipped: true,
                    skipReason: !thisValue ? 'base value missing' : 'target value missing'
                };
            }
            continue;
        }

        // Calculate similarity using the component's native compareTo method
        // ARCHITECTURE REQUIREMENT: All objects use their own compareTo for comparison
        let similarity = 0;
        let comparisonMethod = 'unknown';

        if (typeof thisValue.compareTo === 'function') {
            // Use the object's native compareTo method (returns 0-1 similarity)
            similarity = thisValue.compareTo(otherValue);
            comparisonMethod = 'compareTo';
        } else if (typeof thisValue === 'string') {
            // For plain strings, use levenshteinSimilarity directly
            const str2 = typeof otherValue === 'string' ? otherValue : String(otherValue);
            similarity = levenshteinSimilarity(thisValue, str2);
            comparisonMethod = 'levenshtein';
        } else {
            // Fallback for primitives - exact match only
            similarity = thisValue === otherValue ? 1.0 : 0.0;
            comparisonMethod = 'exactMatch';
        }

        const contribution = round10(similarity * weight);
        totalWeightedScore += contribution;
        totalWeight += weight;

        if (detailed) {
            // Get string representation for display
            const baseStr = typeof thisValue === 'string' ? thisValue :
                           (thisValue.toString ? thisValue.toString() : String(thisValue));
            const targetStr = typeof otherValue === 'string' ? otherValue :
                             (otherValue.toString ? otherValue.toString() : String(otherValue));

            components[propName] = {
                baseValue: baseStr,
                targetValue: targetStr,
                similarity: round10(similarity),
                weight: weight,
                contribution: contribution,
                method: comparisonMethod
            };
        }
    }

    // Calculate final weighted similarity (0-1 range)
    // SPECIAL RULE: For IndividualName, if both sides have exactly 2 of 3 fields
    // but are missing DIFFERENT fields, do NOT normalize - use full weight sum (1.0)
    let effectiveTotalWeight = totalWeight;

    const isIndividualNameComparison = this.comparisonWeights &&
        'firstName' in this.comparisonWeights &&
        'lastName' in this.comparisonWeights &&
        'otherNames' in this.comparisonWeights;

    if (isIndividualNameComparison) {
        // Check which fields each side has populated
        const nameFields = ['firstName', 'lastName', 'otherNames'];
        const thisHas = nameFields.filter(f => this[f] && String(this[f]).trim() !== '');
        const otherHas = nameFields.filter(f => otherObject[f] && String(otherObject[f]).trim() !== '');

        // Both have exactly 2 fields populated?
        if (thisHas.length === 2 && otherHas.length === 2) {
            // Find which field each is missing
            const thisMissing = nameFields.find(f => !thisHas.includes(f));
            const otherMissing = nameFields.find(f => !otherHas.includes(f));

            // If they're missing DIFFERENT fields, don't normalize
            if (thisMissing !== otherMissing) {
                // Use full weight (sum of all configured weights) instead of just compared fields
                effectiveTotalWeight = Object.values(this.comparisonWeights).reduce((a, b) => a + b, 0);
            }
        }
    }

    const weightedSimilarity = effectiveTotalWeight > 0 ? totalWeightedScore / effectiveTotalWeight : 0;

    // For IndividualName objects, also calculate permutation-based score
    // and return the better of the two
    let finalSimilarity = weightedSimilarity;
    let winningMethod = 'weighted';

    // Check if this is an IndividualName (has firstName, lastName, and comparisonWeights with those keys)
    const isIndividualName = this.comparisonWeights &&
        'firstName' in this.comparisonWeights &&
        'lastName' in this.comparisonWeights &&
        (this.firstName !== undefined || this.lastName !== undefined);

    let permutationScore = null;
    if (isIndividualName) {
        permutationScore = permutationBasedNameComparison(this, otherObject);
        if (permutationScore > weightedSimilarity) {
            finalSimilarity = permutationScore;
            winningMethod = 'permutation';
        }
    }

    // Round final similarity
    finalSimilarity = round10(finalSimilarity);

    // Return detailed breakdown or just the number
    if (detailed) {
        return {
            overallSimilarity: finalSimilarity,
            method: winningMethod,
            weightedScore: round10(weightedSimilarity),
            permutationScore: permutationScore !== null ? round10(permutationScore) : null,
            isIndividualName: isIndividualName,
            components: components,
            totalWeight: totalWeight
        };
    }

    return finalSimilarity;
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

    // Helper to check a string value for PO Box indicators
    const checkForPOBox = (value) => {
        if (!value) return false;
        const term = value.term !== undefined ? value.term : value;
        // Normalize: uppercase, collapse multiple spaces to single space
        const upperTerm = String(term).toUpperCase().replace(/\s+/g, ' ');

        // Test for PO Box patterns:
        // PO, P.O., P.O, PO. - each followed by space or B (with optional space before B)
        // Covers: "PO BOX", "P.O. BOX", "P.O BOX", "PO. BOX", "POBOX", "P.O.BOX", etc.
        if (/P\.?O\.?[\sB]/.test(upperTerm)) {
            return true;
        }

        // Test for BOX preceded by O, space, or period
        // Covers: "OBOX", "O BOX", ".BOX", ". BOX", " BOX"
        // This catches cases like "P.O. BOX" and standalone "BOX 123" when preceded by valid char
        if (/[O\.\s]BOX/.test(upperTerm)) {
            return true;
        }

        // Test for POST OFFICE (with or without space)
        if (/POST\s?OFFICE/.test(upperTerm)) {
            return true;
        }

        return false;
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
 * Get exact match (1 or 0) for street numbers
 * Used for Block Island fire numbers where partial matches are not meaningful
 * @param {AttributedTerm|string} num1 - First street number
 * @param {AttributedTerm|string} num2 - Second street number
 * @returns {number} 1 for exact match, 0 otherwise
 */
function getExactStreetNumberMatch(num1, num2) {
    if (!num1 || !num2) return 0;
    const str1 = num1.term !== undefined ? String(num1.term) : String(num1);
    const str2 = num2.term !== undefined ? String(num2.term) : String(num2);
    return str1.toLowerCase() === str2.toLowerCase() ? 1 : 0;
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
 * @param {boolean} detailed - If true, return detailed breakdown object
 * @returns {number|Object} Similarity score 0-1, or detailed breakdown object if detailed=true
 */
function addressWeightedComparison(otherObject, detailed = false) {
    const thisAddr = this;
    const otherAddr = otherObject;

    // Determine address types
    const thisIsPOBox = isPOBoxAddress(thisAddr);
    const otherIsPOBox = isPOBoxAddress(otherAddr);

    let result;
    let comparisonType;

    // If one is PO Box and one is NOT, compare only city/state/zip
    // (A PO Box and a street address are different location types - can't compare specifics)
    // Create stripped copies with only location data and pass to general comparison
    if (thisIsPOBox !== otherIsPOBox) {
        const strippedThis = { city: thisAddr.city, state: thisAddr.state, zipCode: thisAddr.zipCode };
        const strippedOther = { city: otherAddr.city, state: otherAddr.state, zipCode: otherAddr.zipCode };
        result = compareGeneralStreetAddresses(strippedThis, strippedOther, detailed);
        comparisonType = 'POBox-vs-Street';
    }
    // If BOTH are PO Box, use PO Box comparison
    else if (thisIsPOBox && otherIsPOBox) {
        result = comparePOBoxAddresses(thisAddr, otherAddr, detailed);
        comparisonType = 'POBox';
    }
    else {
        // Check for Block Island addresses
        // CRITICAL: Only use Block Island comparison when BOTH addresses are Block Island
        // Otherwise a BI address with street number "8" would match any address with "8" at 90%+
        const thisIsBI = isBlockIslandZip(thisAddr.zipCode) ||
                         (isBlockIslandStreet(thisAddr.streetName) && isBlockIslandCity(thisAddr.city));
        const otherIsBI = isBlockIslandZip(otherAddr.zipCode) ||
                          (isBlockIslandStreet(otherAddr.streetName) && isBlockIslandCity(otherAddr.city));

        if (thisIsBI && otherIsBI) {
            result = compareBlockIslandAddresses(thisAddr, otherAddr, detailed);
            comparisonType = 'BlockIsland';
        } else {
            // General street address comparison
            result = compareGeneralStreetAddresses(thisAddr, otherAddr, detailed);
            comparisonType = 'General';
        }
    }

    // BASELINE INSTRUMENTATION: Record address comparison if enabled
    if (typeof recordAddressComparison === 'function') {
        const score = (typeof result === 'number') ? result : (result.similarity || result.score || 0);
        recordAddressComparison(score, thisAddr, otherAddr, comparisonType);
    }

    return result;
}

/**
 * Compare PO Box addresses
 * Logic:
 * - When zip present: zip < 0.74 → 0; zip == 1 → secUnitNum; 0.74-1 → weighted with city/state
 * - When zip absent: secUnitNum < 0.8 → 0; secUnitNum == 1 → 50/50 city/state; 0.8-1 → weighted
 * @param {boolean} detailed - If true, return detailed breakdown
 */
function comparePOBoxAddresses(addr1, addr2, detailed = false) {
    const round10 = (val) => Math.round(val * 10000000000) / 10000000000;
    const hasZip = addr1.zipCode && addr2.zipCode;
    let result, components = {}, method = 'POBox';

    if (hasZip) {
        const zipSim = getComponentSimilarity(addr1.zipCode, addr2.zipCode);

        if (zipSim < 0.74) {
            result = 0;
            if (detailed) {
                components = {
                    zipCode: { baseValue: addr1.zipCode || '', targetValue: addr2.zipCode || '', similarity: round10(zipSim), weight: 1.0, contribution: 0, method: 'levenshtein', note: 'Below 0.74 threshold - returned 0' }
                };
                method = 'POBox_zipBelowThreshold';
            }
        } else {
            const secUnitSim = getComponentSimilarity(addr1.secUnitNum, addr2.secUnitNum);

            if (zipSim === 1) {
                result = round10(secUnitSim);

                // ERROR REPORT: Both addresses are PO Box with identical zip but both have undefined secUnitNum
                // This indicates bad data - PO Box number was not parsed correctly
                // Log once per unique address pair to avoid flooding the console
                if (!addr1.secUnitNum && !addr2.secUnitNum) {
                    const addr1Term = addr1.primaryAlias?.term || addr1.originalAddress?.term || 'unknown';
                    const addr2Term = addr2.primaryAlias?.term || addr2.originalAddress?.term || 'unknown';
                    const warningKey = `${addr1Term}|||${addr2Term}`;
                    if (!_loggedPOBoxWarnings.has(warningKey)) {
                        _loggedPOBoxWarnings.add(warningKey);
                        console.warn(`[comparePOBoxAddresses] DATA QUALITY: PO Box without parsed secUnitNum - "${addr1Term}" vs "${addr2Term}"`);
                    }
                }

                if (detailed) {
                    components = {
                        zipCode: { baseValue: addr1.zipCode || '', targetValue: addr2.zipCode || '', similarity: 1.0, weight: 0, contribution: 0, method: 'levenshtein', note: 'Perfect match - secUnitNum only' },
                        secUnitNum: { baseValue: addr1.secUnitNum || '', targetValue: addr2.secUnitNum || '', similarity: round10(secUnitSim), weight: 1.0, contribution: round10(secUnitSim), method: 'levenshtein' }
                    };
                    method = 'POBox_perfectZip';
                }
            } else {
                // Zip between 0.74 and 1: weighted calculation including city/state
                const citySim = getComponentSimilarity(addr1.city, addr2.city);
                const stateSim = getStateSimilarity(addr1.state, addr2.state);
                result = round10(0.3 * zipSim + 0.3 * secUnitSim + 0.2 * citySim + 0.2 * stateSim);
                if (detailed) {
                    components = {
                        zipCode: { baseValue: addr1.zipCode || '', targetValue: addr2.zipCode || '', similarity: round10(zipSim), weight: 0.3, contribution: round10(0.3 * zipSim), method: 'levenshtein' },
                        secUnitNum: { baseValue: addr1.secUnitNum || '', targetValue: addr2.secUnitNum || '', similarity: round10(secUnitSim), weight: 0.3, contribution: round10(0.3 * secUnitSim), method: 'levenshtein' },
                        city: { baseValue: addr1.city || '', targetValue: addr2.city || '', similarity: round10(citySim), weight: 0.2, contribution: round10(0.2 * citySim), method: 'levenshtein' },
                        state: { baseValue: addr1.state || '', targetValue: addr2.state || '', similarity: round10(stateSim), weight: 0.2, contribution: round10(0.2 * stateSim), method: 'exactMatch' }
                    };
                    method = 'POBox_partialZip';
                }
            }
        }
    } else {
        // No zip code - use secUnitNum, city, state
        const secUnitSim = getComponentSimilarity(addr1.secUnitNum, addr2.secUnitNum);

        if (secUnitSim < 0.8) {
            result = 0;
            if (detailed) {
                components = {
                    secUnitNum: { baseValue: addr1.secUnitNum || '', targetValue: addr2.secUnitNum || '', similarity: round10(secUnitSim), weight: 1.0, contribution: 0, method: 'levenshtein', note: 'Below 0.8 threshold - returned 0' }
                };
                method = 'POBox_noZip_secUnitBelowThreshold';
            }
        } else {
            const citySim = getComponentSimilarity(addr1.city, addr2.city);
            const stateSim = getStateSimilarity(addr1.state, addr2.state);

            if (secUnitSim === 1) {
                // Return 50/50 city/state
                result = round10(0.5 * citySim + 0.5 * stateSim);
                if (detailed) {
                    components = {
                        secUnitNum: { baseValue: addr1.secUnitNum || '', targetValue: addr2.secUnitNum || '', similarity: 1.0, weight: 0, contribution: 0, method: 'levenshtein', note: 'Perfect match - city/state only' },
                        city: { baseValue: addr1.city || '', targetValue: addr2.city || '', similarity: round10(citySim), weight: 0.5, contribution: round10(0.5 * citySim), method: 'levenshtein' },
                        state: { baseValue: addr1.state || '', targetValue: addr2.state || '', similarity: round10(stateSim), weight: 0.5, contribution: round10(0.5 * stateSim), method: 'exactMatch' }
                    };
                    method = 'POBox_noZip_perfectSecUnit';
                }
            } else {
                // secUnitNum between 0.8 and 1: weighted calculation
                result = round10(0.6 * secUnitSim + 0.2 * citySim + 0.2 * stateSim);
                if (detailed) {
                    components = {
                        secUnitNum: { baseValue: addr1.secUnitNum || '', targetValue: addr2.secUnitNum || '', similarity: round10(secUnitSim), weight: 0.6, contribution: round10(0.6 * secUnitSim), method: 'levenshtein' },
                        city: { baseValue: addr1.city || '', targetValue: addr2.city || '', similarity: round10(citySim), weight: 0.2, contribution: round10(0.2 * citySim), method: 'levenshtein' },
                        state: { baseValue: addr1.state || '', targetValue: addr2.state || '', similarity: round10(stateSim), weight: 0.2, contribution: round10(0.2 * stateSim), method: 'exactMatch' }
                    };
                    method = 'POBox_noZip_partialSecUnit';
                }
            }
        }
    }

    if (detailed) {
        return { overallSimilarity: result, method: method, components: components };
    }
    return result;
}

/**
 * Compare Block Island addresses
 * Logic:
 * - When zip = 02807: streetNumber 0.85, streetName 0.15
 * - When zip absent but streetName in BI database + city is BI: streetNumber only
 * @param {boolean} detailed - If true, return detailed breakdown
 */
function compareBlockIslandAddresses(addr1, addr2, detailed = false) {
    const round10 = (val) => Math.round(val * 10000000000) / 10000000000;
    const hasZip02807 = isBlockIslandZip(addr1.zipCode) || isBlockIslandZip(addr2.zipCode);
    let result, components = {}, method = 'BlockIsland';

    // CASE E CHECK: Both addresses at same collision fire number
    // Per spec: "Compare addresses as if fire numbers were blank"
    // This means fire number similarity = 0, so only street name contributes
    let collisionCaseE = false;
    if (typeof isFireNumberCollisionAddress === 'function' &&
        window.fireNumberCollisionDatabase?.metadata?.loaded) {
        const isCollision1 = isFireNumberCollisionAddress(addr1);
        const isCollision2 = isFireNumberCollisionAddress(addr2);

        if (isCollision1 && isCollision2) {
            const fn1 = typeof getAddressFireNumber === 'function' ? getAddressFireNumber(addr1) : null;
            const fn2 = typeof getAddressFireNumber === 'function' ? getAddressFireNumber(addr2) : null;

            if (fn1 && fn2 && fn1 === fn2) {
                collisionCaseE = true;
            }
        }
    }

    if (hasZip02807) {
        // Weights: streetNumber 0.85, streetName 0.15
        // Street number uses exact match (fire numbers must match exactly)
        // CASE E: Treat fire number as blank (similarity = 0)
        const streetNumSim = collisionCaseE ? 0 : getExactStreetNumberMatch(addr1.streetNumber, addr2.streetNumber);

        // Street name comparison using biStreetName objects (alias-aware)
        let streetNameSim;
        let streetNameMethod;
        if (addr1.biStreetName && addr2.biStreetName) {
            if (addr1.biStreetName === addr2.biStreetName) {
                // Same StreetName object = perfect match
                streetNameSim = 1.0;
                streetNameMethod = 'biStreetName_sameObject';
            } else {
                // Different objects - compare using compareTo
                const scores = addr1.biStreetName.compareTo(addr2.biStreetName);
                // Use verified categories only: primary, homonym, candidates
                // Exclude synonyms (unverified, may be false positives)
                streetNameSim = Math.max(
                    scores.primary,
                    scores.homonym >= 0 ? scores.homonym : 0,
                    scores.candidate >= 0 ? scores.candidate : 0
                );
                streetNameMethod = 'biStreetName_compareTo';
            }
        } else {
            // Fall back to string comparison when biStreetName not available
            // (e.g., mailing addresses not in the official BI street database)
            // Build combined street strings (streetName + streetType) to match what biStreetName lookup uses
            const getFullStreetName = (addr) => {
                const namePart = addr.streetName?.term || '';
                const typePart = addr.streetType?.term || '';
                return typePart ? `${namePart} ${typePart}`.trim() : namePart;
            };
            const fullStreet1 = getFullStreetName(addr1);
            const fullStreet2 = getFullStreetName(addr2);
            streetNameSim = levenshteinSimilarity(fullStreet1, fullStreet2);
            streetNameMethod = 'stringFallback_fullStreet';
        }

        result = round10(0.85 * streetNumSim + 0.15 * streetNameSim);
        if (detailed) {
            components = {
                streetNumber: { baseValue: addr1.streetNumber || '', targetValue: addr2.streetNumber || '', similarity: round10(streetNumSim), weight: 0.85, contribution: round10(0.85 * streetNumSim), method: collisionCaseE ? 'collisionCaseE_blank' : 'exactMatch' },
                streetName: { baseValue: addr1.streetName || '', targetValue: addr2.streetName || '', similarity: round10(streetNameSim), weight: 0.15, contribution: round10(0.15 * streetNameSim), method: streetNameMethod }
            };
            method = collisionCaseE ? 'BlockIsland_collisionCaseE' : 'BlockIsland_withZip';
        }
    } else {
        // No zip but confirmed BI via street database + city
        // Only compare street number (exact match for fire numbers)
        // CASE E: Treat fire number as blank (similarity = 0)
        const streetNumSim = collisionCaseE ? 0 : getExactStreetNumberMatch(addr1.streetNumber, addr2.streetNumber);
        result = round10(streetNumSim);
        if (detailed) {
            components = {
                streetNumber: { baseValue: addr1.streetNumber || '', targetValue: addr2.streetNumber || '', similarity: round10(streetNumSim), weight: 1.0, contribution: round10(streetNumSim), method: collisionCaseE ? 'collisionCaseE_blank' : 'exactMatch' }
            };
            method = collisionCaseE ? 'BlockIsland_collisionCaseE_noZip' : 'BlockIsland_noZip';
        }
    }

    if (detailed) {
        return { overallSimilarity: result, method: method, components: components };
    }
    return result;
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
 * @param {boolean} detailed - If true, return detailed breakdown
 */
function compareGeneralStreetAddresses(addr1, addr2, detailed = false) {
    const round10 = (val) => Math.round(val * 10000000000) / 10000000000;
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

    let result, components = {}, method = 'GeneralStreet';

    if (hasZip) {
        // With zip: streetNumber 0.3, streetName 0.2, zipCode 0.4, state 0.1
        // All weights always applied - missing fields contribute 0 similarity
        const streetNumSim = getSimilarityOrZero(addr1.streetNumber, addr2.streetNumber);
        const streetNameSim = getSimilarityOrZero(addr1.streetName, addr2.streetName);
        const zipSim = getSimilarityOrZero(addr1.zipCode, addr2.zipCode);
        const stateSim = getStateSimilarityOrZero(addr1.state, addr2.state);

        result = round10((streetNumSim * 0.3) + (streetNameSim * 0.2) + (zipSim * 0.4) + (stateSim * 0.1));
        if (detailed) {
            components = {
                streetNumber: { baseValue: addr1.streetNumber || '', targetValue: addr2.streetNumber || '', similarity: round10(streetNumSim), weight: 0.3, contribution: round10(streetNumSim * 0.3), method: 'levenshtein' },
                streetName: { baseValue: addr1.streetName || '', targetValue: addr2.streetName || '', similarity: round10(streetNameSim), weight: 0.2, contribution: round10(streetNameSim * 0.2), method: 'levenshtein' },
                zipCode: { baseValue: addr1.zipCode || '', targetValue: addr2.zipCode || '', similarity: round10(zipSim), weight: 0.4, contribution: round10(zipSim * 0.4), method: 'levenshtein' },
                state: { baseValue: addr1.state || '', targetValue: addr2.state || '', similarity: round10(stateSim), weight: 0.1, contribution: round10(stateSim * 0.1), method: 'exactMatch' }
            };
            method = 'GeneralStreet_withZip';
        }
    } else {
        // Without zip (both sides): streetNumber 0.3, streetName 0.2, city 0.25, state 0.25
        // All weights always applied - missing fields contribute 0 similarity
        const streetNumSim = getSimilarityOrZero(addr1.streetNumber, addr2.streetNumber);
        const streetNameSim = getSimilarityOrZero(addr1.streetName, addr2.streetName);
        const citySim = getSimilarityOrZero(addr1.city, addr2.city);
        const stateSim = getStateSimilarityOrZero(addr1.state, addr2.state);

        result = round10((streetNumSim * 0.3) + (streetNameSim * 0.2) + (citySim * 0.25) + (stateSim * 0.25));
        if (detailed) {
            components = {
                streetNumber: { baseValue: addr1.streetNumber || '', targetValue: addr2.streetNumber || '', similarity: round10(streetNumSim), weight: 0.3, contribution: round10(streetNumSim * 0.3), method: 'levenshtein' },
                streetName: { baseValue: addr1.streetName || '', targetValue: addr2.streetName || '', similarity: round10(streetNameSim), weight: 0.2, contribution: round10(streetNameSim * 0.2), method: 'levenshtein' },
                city: { baseValue: addr1.city || '', targetValue: addr2.city || '', similarity: round10(citySim), weight: 0.25, contribution: round10(citySim * 0.25), method: 'levenshtein' },
                state: { baseValue: addr1.state || '', targetValue: addr2.state || '', similarity: round10(stateSim), weight: 0.25, contribution: round10(stateSim * 0.25), method: 'exactMatch' }
            };
            method = 'GeneralStreet_noZip';
        }
    }

    if (detailed) {
        return { overallSimilarity: result, method: method, components: components };
    }
    return result;
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

    // Track the actual matched addresses for detailed return
    let matchedBaseAddress = null;
    let matchedTargetAddress = null;
    let matchDirection = null; // 'base-to-target' or 'target-to-base'

    if (thisCI.primaryAddress) {
        const result = findBestAddressMatch(thisCI.primaryAddress, otherCI);
        primarySimilarity = result.bestScore;
        otherPrimaryMatchedIndex = result.matchedIndex;
        matchedBaseAddress = thisCI.primaryAddress;
        matchedTargetAddress = result.matchedAddress;
        matchDirection = 'base-to-target';
    }

    if (otherCI.primaryAddress) {
        const result = findBestAddressMatch(otherCI.primaryAddress, thisCI);
        if (result.bestScore > primarySimilarity) {
            primarySimilarity = result.bestScore;
            thisPrimaryMatchedIndex = result.matchedIndex;
            otherPrimaryMatchedIndex = -2; // Reset since we're using other's primary match
            matchedBaseAddress = result.matchedAddress;
            matchedTargetAddress = otherCI.primaryAddress;
            matchDirection = 'target-to-base';
        }
    }

    // Step 2: Find best secondary address match, excluding addresses used in primary match
    // ONLY if the primary match was a true match (score >= MATCH_CRITERIA.trueMatch.contactInfoAlone)
    let secondarySimilarity = 0;

    // Get the address exclusion threshold from MATCH_CRITERIA (default 0.87 if not available)
    const addressExclusionThreshold = (typeof window !== 'undefined' && window.MATCH_CRITERIA)
        ? window.MATCH_CRITERIA.trueMatch.contactInfoAlone
        : 0.87;

    // Only exclude secondary addresses from pool if primary match score meets true match threshold
    const shouldExcludeFromPool = primarySimilarity >= addressExclusionThreshold;

    // Get secondary addresses, excluding any used in primary match ONLY if match was strong enough
    const thisSecondaries = (thisCI.secondaryAddress || []).filter((addr, idx) => {
        return addr && (!shouldExcludeFromPool || idx !== thisPrimaryMatchedIndex);
    });
    const otherSecondaries = (otherCI.secondaryAddress || []).filter((addr, idx) => {
        return addr && (!shouldExcludeFromPool || idx !== otherPrimaryMatchedIndex);
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

    // Step 3: Email comparison (split into local part and domain)
    let emailSimilarity = 0;
    const thisEmail = getEmailString(thisCI.email);
    const otherEmail = getEmailString(otherCI.email);

    if (thisEmail && otherEmail) {
        const thisLower = thisEmail.toLowerCase();
        const otherLower = otherEmail.toLowerCase();

        const thisAtIndex = thisLower.lastIndexOf('@');
        const otherAtIndex = otherLower.lastIndexOf('@');

        if (thisAtIndex > 0 && otherAtIndex > 0) {
            // Split into local part and domain
            const thisLocal = thisLower.substring(0, thisAtIndex);
            const thisDomain = thisLower.substring(thisAtIndex + 1);
            const otherLocal = otherLower.substring(0, otherAtIndex);
            const otherDomain = otherLower.substring(otherAtIndex + 1);

            // Local part: fuzzy match (0.8 weight)
            const localSimilarity = levenshteinSimilarity(thisLocal, otherLocal);
            // Domain: exact match only (0.2 weight)
            const domainSimilarity = (thisDomain === otherDomain) ? 1.0 : 0.0;

            emailSimilarity = (localSimilarity * 0.8) + (domainSimilarity * 0.2);
        } else {
            // Malformed email (no @), fall back to full string comparison
            emailSimilarity = levenshteinSimilarity(thisLower, otherLower);
        }
    }

    // Step 4: Determine best address match and match type
    // Find the single best address match across all comparisons
    const hasAnyPrimaryMatch = primarySimilarity > 0;
    const hasSecondaryMatch = secondarySimilarity > 0;
    const hasAddressData = hasAnyPrimaryMatch || hasSecondaryMatch;
    const hasEmailData = thisEmail && otherEmail;

    // Determine best address similarity and whether it involved a primary address
    let bestAddressSimilarity = 0;
    let bestMatchType = null; // 'primary' or 'secondary'

    if (hasAddressData) {
        if (primarySimilarity >= secondarySimilarity) {
            bestAddressSimilarity = primarySimilarity;
            bestMatchType = 'primary'; // primary-to-primary or primary-to-secondary
        } else {
            bestAddressSimilarity = secondarySimilarity;
            bestMatchType = 'secondary'; // secondary-to-secondary only
        }
    }

    // Step 5: Apply weighting based on match type
    // Primary involved (primary vs primary OR primary vs secondary): address 0.75, email 0.25
    // Secondary to secondary only: address 0.65, email 0.35
    // Weights are normalized if either component is missing
    const baseWeights = bestMatchType === 'secondary'
        ? { address: 0.65, email: 0.35 }
        : { address: 0.75, email: 0.25 };

    let totalWeight = 0;
    let weightedSum = 0;

    if (hasAddressData) {
        weightedSum += baseWeights.address * bestAddressSimilarity;
        totalWeight += baseWeights.address;
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

    if (hasAddressData) {
        const actualWeight = round10(baseWeights.address / totalWeight);
        const similarity = round10(bestAddressSimilarity);
        const weightedValue = round10(actualWeight * similarity);
        // Get subordinate address comparison details if primary match was best
        let subordinateDetails = null;
        if (bestMatchType === 'primary' && matchedBaseAddress && matchedTargetAddress && typeof matchedBaseAddress.compareTo === 'function') {
            subordinateDetails = matchedBaseAddress.compareTo(matchedTargetAddress, true);
        }
        components.bestAddress = {
            actualWeight: actualWeight,
            similarity: similarity,
            weightedValue: weightedValue,
            matchType: bestMatchType, // 'primary' or 'secondary'
            primarySimilarity: round10(primarySimilarity),
            secondarySimilarity: round10(secondarySimilarity),
            baseValue: bestMatchType === 'primary' && matchedBaseAddress
                ? (matchedBaseAddress.toString ? matchedBaseAddress.toString() : String(matchedBaseAddress))
                : (thisSecondaries.length > 0 ? 'secondary addresses' : ''),
            targetValue: bestMatchType === 'primary' && matchedTargetAddress
                ? (matchedTargetAddress.toString ? matchedTargetAddress.toString() : String(matchedTargetAddress))
                : (otherSecondaries.length > 0 ? 'secondary addresses' : ''),
            matchDirection: bestMatchType === 'primary' ? matchDirection : 'secondary-to-secondary',
            subordinateDetails: subordinateDetails
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
            weightedValue: weightedValue,
            baseValue: thisEmail,
            targetValue: otherEmail,
            method: 'levenshtein'
        };
        weightedValueSum += weightedValue;
    }

    // checkSum: overallSimilarity minus sum of weightedValues (should be 0 for validation)
    const checkSum = round10(overallSimilarity - weightedValueSum);

    // Include matched address details for reconciliation
    const addressMatch = {
        bestAddressSimilarity: bestAddressSimilarity,
        matchType: bestMatchType,
        primaryMatch: {
            baseAddress: matchedBaseAddress,
            targetAddress: matchedTargetAddress,
            matchDirection: matchDirection,
            similarity: primarySimilarity
        },
        secondarySimilarity: secondarySimilarity
    };

    return {
        overallSimilarity: overallSimilarity,
        components: components,
        checkSum: checkSum,
        addressMatch: addressMatch
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
    let nameDetailedResult = null;
    let contactInfoDetailedResult = null;

    const hasNameData = thisEntity.name && otherEntity.name &&
                        typeof thisEntity.name.compareTo === 'function';
    if (hasNameData) {
        try {
            // Always get detailed result for name, extract score
            const nameResult = thisEntity.name.compareTo(otherEntity.name, true);
            if (typeof nameResult === 'number') {
                nameSimilarity = nameResult;
                nameDetailedResult = { overallSimilarity: nameResult };
            } else {
                nameSimilarity = nameResult.overallSimilarity;
                nameDetailedResult = nameResult;
            }
        } catch (nameError) {
            // nameSimilarity remains null - will be treated as missing data
        }
    }

    const hasContactInfoData = thisEntity.contactInfo && otherEntity.contactInfo &&
                               typeof thisEntity.contactInfo.compareTo === 'function';

    // Check for same-location scenario: when two Block Island entities have suffixed
    // fire numbers with the same base (e.g., 72J vs 72W), they are different owners
    // at the same physical property. Primary address comparison would be meaningless.
    const isSameLocation = areSameLocationEntities(thisEntity, otherEntity);

    // DIAGNOSTIC: Log when isSameLocation triggers for cross-source comparisons
    const source1 = thisEntity.sourceDatabase || 'unknown';
    const source2 = otherEntity.sourceDatabase || 'unknown';
    const isCrossSource = source1 !== source2;
    // Diagnostic removed - was too verbose

    if (hasContactInfoData) {
        if (isSameLocation) {
            // Same location: use secondary addresses only (primary addresses would match trivially)
            contactInfoSimilarity = compareSecondaryAddressesOnly(thisEntity.contactInfo, otherEntity.contactInfo);
            const fn1 = extractFireNumberFromEntity(thisEntity);
            const fn2 = extractFireNumberFromEntity(otherEntity);
            contactInfoDetailedResult = {
                overallSimilarity: contactInfoSimilarity,
                method: 'sameLocation_secondaryAddressesOnly',
                note: `Same location (${fn1} vs ${fn2}): primary address excluded from comparison`
            };
        } else {
            // Different locations: use full contactInfo comparison
            const contactResult = thisEntity.contactInfo.compareTo(otherEntity.contactInfo, true);
            if (typeof contactResult === 'number') {
                contactInfoSimilarity = contactResult;
                contactInfoDetailedResult = { overallSimilarity: contactResult };
            } else {
                contactInfoSimilarity = contactResult.overallSimilarity;
                contactInfoDetailedResult = contactResult;
            }
        }
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

    if (hasNameData && nameSimilarity !== null) {
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
    let overallSimilarity = round10(weightedSum / totalWeight);

    // Apply penalties for missing critical data
    // These penalties are applied AFTER the weighted calculation
    const MISSING_NAME_PENALTY = 0.04;
    const MISSING_CONTACTINFO_PENALTY = 0.03;
    let totalPenalty = 0;

    // Check if name data is truly missing (either no compareTo method or comparison threw error)
    const nameDataMissing = !hasNameData || nameSimilarity === null;
    if (nameDataMissing) {
        totalPenalty += MISSING_NAME_PENALTY;
    }
    if (!hasContactInfoData) {
        totalPenalty += MISSING_CONTACTINFO_PENALTY;
    }

    // Apply penalty and ensure score doesn't go below 0
    if (totalPenalty > 0) {
        overallSimilarity = round10(Math.max(0, overallSimilarity - totalPenalty));
    }

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

    // checkSum: overallSimilarity minus sum of weightedValues minus penalty (should be 0 for validation)
    const checkSum = round10(overallSimilarity - weightedValueSum + totalPenalty);

    return {
        overallSimilarity: overallSimilarity,
        components: components,
        checkSum: checkSum,
        // Include penalty information
        penalties: {
            missingName: !hasNameData ? MISSING_NAME_PENALTY : 0,
            missingContactInfo: !hasContactInfoData ? MISSING_CONTACTINFO_PENALTY : 0,
            totalPenalty: totalPenalty
        },
        // Include subordinate detailed results for reconciliation
        subordinateDetails: {
            name: nameDetailedResult,
            contactInfo: contactInfoDetailedResult
        }
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
 * @param {boolean} detailed - If true, return detailed breakdown object instead of just similarity score
 * @returns {number|Object} Similarity score 0-1, or detailed breakdown object if detailed=true
 * @throws {Error} If objects are different types (invalid comparison)
 */
function genericObjectCompareTo(obj1, obj2, excludedProperties, detailed = false) {
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
        const weightedResult = obj1.comparisonCalculator.call(obj1, obj2, detailed);
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
// PHASE 3 DATA LOADING FUNCTIONS - ARCHIVED
// ============================================================================
// The following functions were archived Dec 26, 2025 (Phase 2 cleanup):
// - loadSampleData(), loadGoogleDriveFile(), extractAddressesFromSamples()
// - Archived to: archive/deprecated_2025/sampleDataLoader.js
// - Reason: Only used deprecated readBloomerang() function, superseded by unified database
// ============================================================================

// ============================================================================
// SAME-LOCATION ENTITY COMPARISON (SUFFIXED FIRE NUMBERS)
// When two Block Island entities have suffixed fire numbers with the same base
// (e.g., 72J vs 72W), they are different owners at the same physical location.
// Primary address comparison would be meaningless, so we use secondary addresses only.
// ============================================================================

/**
 * Extract fire number from an entity
 * ONLY returns a value if the entity's locationIdentifier is actually a FireNumber type.
 * Returns null for PID or other identifier types.
 *
 * @param {Entity} entity - Entity to extract fire number from
 * @returns {string|null} Fire number as string, or null if not found or not a FireNumber type
 */
function extractFireNumberFromEntity(entity) {
    if (!entity) return null;

    // Direct fireNumber property (explicit fire number)
    if (entity.fireNumber) {
        return String(entity.fireNumber);
    }

    // Check locationIdentifier - but ONLY if it's actually a FireNumber type
    if (entity.locationIdentifier) {
        const locIdType = entity.locationIdentifier.constructor?.name;

        // Only proceed if this is a FireNumber identifier, not PID or other types
        if (locIdType === 'FireNumber') {
            if (entity.locationIdentifier.primaryAlias?.term) {
                return String(entity.locationIdentifier.primaryAlias.term);
            }
        }

        // Check for nested fireNumber property (may exist on some entity structures)
        if (entity.locationIdentifier.fireNumber) {
            if (typeof entity.locationIdentifier.fireNumber === 'string' ||
                typeof entity.locationIdentifier.fireNumber === 'number') {
                return String(entity.locationIdentifier.fireNumber);
            }
            if (entity.locationIdentifier.fireNumber.primaryAlias?.term) {
                return String(entity.locationIdentifier.fireNumber.primaryAlias.term);
            }
        }
    }

    return null;
}

/**
 * Check if a fire number has a letter suffix (indicating collision-resolved entity)
 * Examples: "72J", "1510A", "234B" → true
 * Examples: "72", "1510", "234" → false
 * @param {string} fireNumber - Fire number to check
 * @returns {boolean} True if has letter suffix
 */
function hasFireNumberSuffix(fireNumber) {
    if (!fireNumber) return false;
    // Fire number with suffix: digits followed by one or more letters at the end
    return /^\d+[A-Za-z]+$/.test(String(fireNumber).trim());
}

/**
 * Extract the base fire number (without letter suffix)
 * Examples: "72J" → "72", "1510A" → "1510", "234" → "234"
 * @param {string} fireNumber - Fire number (possibly with suffix)
 * @returns {string} Base fire number without suffix
 */
function getBaseFireNumber(fireNumber) {
    if (!fireNumber) return '';
    const str = String(fireNumber).trim();
    // Remove trailing letters
    const match = str.match(/^(\d+)/);
    return match ? match[1] : str;
}

/**
 * Check if two entities are at the same Block Island location (same base fire number, different suffixes)
 * This indicates different owners at the same physical property.
 * @param {Entity} entity1 - First entity
 * @param {Entity} entity2 - Second entity
 * @returns {boolean} True if same location (should use secondary-only comparison)
 */
function areSameLocationEntities(entity1, entity2) {
    const fn1 = extractFireNumberFromEntity(entity1);
    const fn2 = extractFireNumberFromEntity(entity2);

    // Both must have fire numbers
    if (!fn1 || !fn2) return false;

    // If fire numbers are identical, not a collision case
    if (fn1 === fn2) return false;

    // At least one must have a suffix (collision-resolved)
    const hasSuffix1 = hasFireNumberSuffix(fn1);
    const hasSuffix2 = hasFireNumberSuffix(fn2);
    if (!hasSuffix1 && !hasSuffix2) return false;

    // Base fire numbers must match
    const base1 = getBaseFireNumber(fn1);
    const base2 = getBaseFireNumber(fn2);

    const result = base1 === base2;

    // Diagnostic removed - was too verbose

    return result;
}

/**
 * Compare secondary addresses only (excluding primary addresses)
 * Used when entities share the same primary location (e.g., same base fire number)
 * and primary address comparison would be meaningless.
 *
 * @param {ContactInfo} contactInfo1 - First ContactInfo
 * @param {ContactInfo} contactInfo2 - Second ContactInfo
 * @returns {number} Similarity score 0-1
 */
function compareSecondaryAddressesOnly(contactInfo1, contactInfo2) {
    // Get secondary addresses from both
    // Note: property is named "secondaryAddress" (singular) but holds array
    const secondary1 = contactInfo1?.secondaryAddress || [];
    const secondary2 = contactInfo2?.secondaryAddress || [];

    // If neither has secondary addresses, return 0 (can't determine similarity)
    if (secondary1.length === 0 && secondary2.length === 0) {
        return 0;
    }

    // If only one has secondary addresses, return 0
    if (secondary1.length === 0 || secondary2.length === 0) {
        return 0;
    }

    // Compare secondary addresses using existing Address.compareTo()
    // Find best match between secondary addresses
    let bestSimilarity = 0;
    for (const addr1 of secondary1) {
        for (const addr2 of secondary2) {
            if (addr1 && addr2 && typeof addr1.compareTo === 'function') {
                const similarity = addr1.compareTo(addr2);
                if (similarity > bestSimilarity) {
                    bestSimilarity = similarity;
                }
            }
        }
    }

    return bestSimilarity;
}

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
    // Same-location entity comparison utilities
    window.extractFireNumberFromEntity = extractFireNumberFromEntity;
    window.hasFireNumberSuffix = hasFireNumberSuffix;
    window.getBaseFireNumber = getBaseFireNumber;
    window.areSameLocationEntities = areSameLocationEntities;
    window.compareSecondaryAddressesOnly = compareSecondaryAddressesOnly;
    // Comparison calculator registry and resolver
    window.COMPARISON_CALCULATOR_REGISTRY = COMPARISON_CALCULATOR_REGISTRY;
    window.resolveComparisonCalculator = resolveComparisonCalculator;
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
    // Same-location entity comparison utilities
    module.exports.extractFireNumberFromEntity = extractFireNumberFromEntity;
    module.exports.hasFireNumberSuffix = hasFireNumberSuffix;
    module.exports.getBaseFireNumber = getBaseFireNumber;
    module.exports.areSameLocationEntities = areSameLocationEntities;
    module.exports.compareSecondaryAddressesOnly = compareSecondaryAddressesOnly;
}

// ============================================================================
// DIAGNOSTIC TRACING FUNCTION (COMMENTED OUT - Dec 18, 2025)
// Uncomment to debug entity comparison issues
// ============================================================================

/*
// Trace the complete similarity calculation between two entities.
// Outputs every step of the logical path and all calculation results.
//
// Usage: traceEntityComparison('visionAppraisal:PID:364', 'visionAppraisal:PID:363')
//
// @param {string} key1 - Database key for first entity
// @param {string} key2 - Database key for second entity
function traceEntityComparison(key1, key2) {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('ENTITY COMPARISON TRACE');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log(`Entity 1 Key: ${key1}`);
    console.log(`Entity 2 Key: ${key2}`);
    console.log('');

    // Step 1: Retrieve entities
    console.log('───────────────────────────────────────────────────────────────────');
    console.log('STEP 1: ENTITY RETRIEVAL');
    console.log('───────────────────────────────────────────────────────────────────');

    if (!window.unifiedEntityDatabase || !window.unifiedEntityDatabase.entities) {
        console.error('ERROR: unifiedEntityDatabase not loaded');
        return null;
    }

    const entity1 = window.unifiedEntityDatabase.entities[key1];
    const entity2 = window.unifiedEntityDatabase.entities[key2];

    if (!entity1) {
        console.error(`ERROR: Entity not found for key: ${key1}`);
        return null;
    }
    if (!entity2) {
        console.error(`ERROR: Entity not found for key: ${key2}`);
        return null;
    }

    console.log(`Entity 1 Type: ${entity1.constructor?.name}`);
    console.log(`Entity 1 Name: ${entity1.name?.toString?.() || 'N/A'}`);
    console.log(`Entity 2 Type: ${entity2.constructor?.name}`);
    console.log(`Entity 2 Name: ${entity2.name?.toString?.() || 'N/A'}`);
    console.log('');

    // Step 2: Same-location check
    console.log('───────────────────────────────────────────────────────────────────');
    console.log('STEP 2: SAME-LOCATION CHECK (areSameLocationEntities)');
    console.log('───────────────────────────────────────────────────────────────────');

    const fn1 = extractFireNumberFromEntity(entity1);
    const fn2 = extractFireNumberFromEntity(entity2);
    console.log(`extractFireNumberFromEntity(entity1): "${fn1}"`);
    console.log(`extractFireNumberFromEntity(entity2): "${fn2}"`);

    const bothHaveFireNumbers = fn1 && fn2;
    console.log(`Both have fire numbers? ${bothHaveFireNumbers}`);

    if (bothHaveFireNumbers) {
        const areIdentical = fn1 === fn2;
        console.log(`Fire numbers identical? ${areIdentical} (${fn1} === ${fn2})`);

        const hasSuffix1 = hasFireNumberSuffix(fn1);
        const hasSuffix2 = hasFireNumberSuffix(fn2);
        console.log(`hasFireNumberSuffix("${fn1}"): ${hasSuffix1}`);
        console.log(`hasFireNumberSuffix("${fn2}"): ${hasSuffix2}`);
        console.log(`At least one has suffix? ${hasSuffix1 || hasSuffix2}`);

        if (hasSuffix1 || hasSuffix2) {
            const base1 = getBaseFireNumber(fn1);
            const base2 = getBaseFireNumber(fn2);
            console.log(`getBaseFireNumber("${fn1}"): "${base1}"`);
            console.log(`getBaseFireNumber("${fn2}"): "${base2}"`);
            console.log(`Base fire numbers match? ${base1 === base2}`);
        }
    }

    const isSameLocation = areSameLocationEntities(entity1, entity2);
    console.log(`\n>>> areSameLocationEntities RESULT: ${isSameLocation}`);
    console.log('');

    // Step 3: Component data availability
    console.log('───────────────────────────────────────────────────────────────────');
    console.log('STEP 3: COMPONENT DATA AVAILABILITY');
    console.log('───────────────────────────────────────────────────────────────────');

    const hasNameData = entity1.name && entity2.name && typeof entity1.name.compareTo === 'function';
    const hasContactInfoData = entity1.contactInfo && entity2.contactInfo && typeof entity1.contactInfo.compareTo === 'function';
    const hasOtherInfoData = entity1.otherInfo && entity2.otherInfo && typeof entity1.otherInfo.compareTo === 'function';
    const hasLegacyInfoData = entity1.legacyInfo && entity2.legacyInfo && typeof entity1.legacyInfo.compareTo === 'function';

    console.log(`hasNameData: ${hasNameData}`);
    console.log(`  - entity1.name exists: ${!!entity1.name}`);
    console.log(`  - entity2.name exists: ${!!entity2.name}`);
    console.log(`  - entity1.name.compareTo is function: ${typeof entity1.name?.compareTo === 'function'}`);
    console.log(`hasContactInfoData: ${hasContactInfoData}`);
    console.log(`  - entity1.contactInfo exists: ${!!entity1.contactInfo}`);
    console.log(`  - entity2.contactInfo exists: ${!!entity2.contactInfo}`);
    console.log(`  - entity1.contactInfo.compareTo is function: ${typeof entity1.contactInfo?.compareTo === 'function'}`);
    console.log(`hasOtherInfoData: ${hasOtherInfoData}`);
    console.log(`hasLegacyInfoData: ${hasLegacyInfoData}`);
    console.log('');

    // Step 4: Name comparison
    console.log('───────────────────────────────────────────────────────────────────');
    console.log('STEP 4: NAME COMPARISON');
    console.log('───────────────────────────────────────────────────────────────────');

    let nameSimilarity = null;
    let nameDetailedResult = null;

    if (hasNameData) {
        console.log(`Entity 1 Name Type: ${entity1.name.constructor?.name}`);
        console.log(`Entity 1 Name Value: ${entity1.name.toString?.()}`);
        console.log(`Entity 2 Name Type: ${entity2.name.constructor?.name}`);
        console.log(`Entity 2 Name Value: ${entity2.name.toString?.()}`);

        const nameResult = entity1.name.compareTo(entity2.name, true);
        if (typeof nameResult === 'number') {
            nameSimilarity = nameResult;
            nameDetailedResult = { overallSimilarity: nameResult };
        } else {
            nameSimilarity = nameResult.overallSimilarity;
            nameDetailedResult = nameResult;
        }

        console.log(`\n>>> NAME SIMILARITY: ${nameSimilarity}`);
        console.log('>>> NAME DETAILED RESULT:');
        console.log(JSON.stringify(nameDetailedResult, null, 2));
    } else {
        console.log('Name comparison SKIPPED (missing data)');
    }
    console.log('');

    // Step 5: ContactInfo comparison
    console.log('───────────────────────────────────────────────────────────────────');
    console.log('STEP 5: CONTACTINFO COMPARISON');
    console.log('───────────────────────────────────────────────────────────────────');

    let contactInfoSimilarity = null;
    let contactInfoDetailedResult = null;
    let contactInfoMethod = 'none';

    if (hasContactInfoData) {
        if (isSameLocation) {
            contactInfoMethod = 'sameLocation_secondaryAddressesOnly';
            console.log(`>>> BRANCH TAKEN: Same location - using compareSecondaryAddressesOnly()`);

            // Show secondary addresses
            const secondary1 = entity1.contactInfo?.secondaryAddress || [];
            const secondary2 = entity2.contactInfo?.secondaryAddress || [];
            console.log(`Entity 1 secondary addresses count: ${secondary1.length}`);
            secondary1.forEach((addr, i) => console.log(`  [${i}]: ${addr?.toString?.() || JSON.stringify(addr)}`));
            console.log(`Entity 2 secondary addresses count: ${secondary2.length}`);
            secondary2.forEach((addr, i) => console.log(`  [${i}]: ${addr?.toString?.() || JSON.stringify(addr)}`));

            contactInfoSimilarity = compareSecondaryAddressesOnly(entity1.contactInfo, entity2.contactInfo);
            contactInfoDetailedResult = {
                overallSimilarity: contactInfoSimilarity,
                method: contactInfoMethod,
                note: `Same location (${fn1} vs ${fn2}): primary address excluded`
            };
        } else {
            contactInfoMethod = 'standard_compareTo';
            console.log(`>>> BRANCH TAKEN: Different locations - using full contactInfo.compareTo()`);

            // Show primary addresses
            console.log(`Entity 1 primary address: ${entity1.contactInfo?.primaryAddress?.toString?.() || 'N/A'}`);
            console.log(`Entity 2 primary address: ${entity2.contactInfo?.primaryAddress?.toString?.() || 'N/A'}`);

            const contactResult = entity1.contactInfo.compareTo(entity2.contactInfo, true);
            if (typeof contactResult === 'number') {
                contactInfoSimilarity = contactResult;
                contactInfoDetailedResult = { overallSimilarity: contactResult };
            } else {
                contactInfoSimilarity = contactResult.overallSimilarity;
                contactInfoDetailedResult = contactResult;
            }
        }

        console.log(`\n>>> CONTACTINFO SIMILARITY: ${contactInfoSimilarity}`);
        console.log(`>>> CONTACTINFO METHOD: ${contactInfoMethod}`);
        console.log('>>> CONTACTINFO DETAILED RESULT:');
        console.log(JSON.stringify(contactInfoDetailedResult, null, 2));
    } else {
        console.log('ContactInfo comparison SKIPPED (missing data)');
    }
    console.log('');

    // Step 6: OtherInfo comparison
    console.log('───────────────────────────────────────────────────────────────────');
    console.log('STEP 6: OTHERINFO COMPARISON');
    console.log('───────────────────────────────────────────────────────────────────');

    let otherInfoSimilarity = null;
    if (hasOtherInfoData) {
        otherInfoSimilarity = entity1.otherInfo.compareTo(entity2.otherInfo);
        console.log(`>>> OTHERINFO SIMILARITY: ${otherInfoSimilarity}`);
    } else {
        console.log('OtherInfo comparison SKIPPED (missing data)');
    }
    console.log('');

    // Step 7: LegacyInfo comparison
    console.log('───────────────────────────────────────────────────────────────────');
    console.log('STEP 7: LEGACYINFO COMPARISON');
    console.log('───────────────────────────────────────────────────────────────────');

    let legacyInfoSimilarity = null;
    if (hasLegacyInfoData) {
        legacyInfoSimilarity = entity1.legacyInfo.compareTo(entity2.legacyInfo);
        console.log(`>>> LEGACYINFO SIMILARITY: ${legacyInfoSimilarity}`);
    } else {
        console.log('LegacyInfo comparison SKIPPED (missing data)');
    }
    console.log('');

    // Step 8: Weight calculation
    console.log('───────────────────────────────────────────────────────────────────');
    console.log('STEP 8: WEIGHT CALCULATION');
    console.log('───────────────────────────────────────────────────────────────────');

    const baseWeights = entity1.comparisonWeights || {
        name: 0.5,
        contactInfo: 0.3,
        otherInfo: 0.15,
        legacyInfo: 0.05
    };

    console.log('Base Weights:');
    console.log(`  name: ${baseWeights.name}`);
    console.log(`  contactInfo: ${baseWeights.contactInfo}`);
    console.log(`  otherInfo: ${baseWeights.otherInfo}`);
    console.log(`  legacyInfo: ${baseWeights.legacyInfo}`);

    let weights = { ...baseWeights };
    let boostAmount = 0;

    if (nameSimilarity !== null) {
        if (nameSimilarity === 1.0) {
            boostAmount = 0.12;
            console.log(`\nName boost: +12% (name similarity = 1.0 perfect match)`);
        } else if (nameSimilarity > 0.95) {
            boostAmount = 0.06;
            console.log(`\nName boost: +6% (name similarity > 0.95)`);
        } else {
            console.log(`\nName boost: 0% (name similarity ${nameSimilarity} <= 0.95)`);
        }
    } else {
        console.log(`\nName boost: 0% (no name data)`);
    }

    if (boostAmount > 0) {
        const nonBoostCategories = ['contactInfo', 'otherInfo', 'legacyInfo'];
        const totalNonBoostWeight = nonBoostCategories.reduce((sum, cat) => sum + weights[cat], 0);

        console.log(`Redistributing ${boostAmount} from non-name categories (total: ${totalNonBoostWeight})`);

        nonBoostCategories.forEach(cat => {
            const proportion = weights[cat] / totalNonBoostWeight;
            const reduction = boostAmount * proportion;
            console.log(`  ${cat}: ${weights[cat]} - ${reduction.toFixed(4)} = ${(weights[cat] - reduction).toFixed(4)}`);
            weights[cat] -= reduction;
        });
        weights.name += boostAmount;
        console.log(`  name: ${baseWeights.name} + ${boostAmount} = ${weights.name}`);
    }

    console.log('\nAdjusted Weights:');
    console.log(`  name: ${weights.name}`);
    console.log(`  contactInfo: ${weights.contactInfo}`);
    console.log(`  otherInfo: ${weights.otherInfo}`);
    console.log(`  legacyInfo: ${weights.legacyInfo}`);
    console.log('');

    // Step 9: Weighted sum calculation
    console.log('───────────────────────────────────────────────────────────────────');
    console.log('STEP 9: WEIGHTED SUM CALCULATION');
    console.log('───────────────────────────────────────────────────────────────────');

    let totalWeight = 0;
    let weightedSum = 0;

    console.log('Components contributing to weighted sum:');

    if (hasNameData) {
        const contribution = weights.name * nameSimilarity;
        console.log(`  name: ${weights.name} × ${nameSimilarity} = ${contribution}`);
        weightedSum += contribution;
        totalWeight += weights.name;
    }

    if (hasContactInfoData) {
        const contribution = weights.contactInfo * contactInfoSimilarity;
        console.log(`  contactInfo: ${weights.contactInfo} × ${contactInfoSimilarity} = ${contribution}`);
        weightedSum += contribution;
        totalWeight += weights.contactInfo;
    }

    if (hasOtherInfoData) {
        const contribution = weights.otherInfo * otherInfoSimilarity;
        console.log(`  otherInfo: ${weights.otherInfo} × ${otherInfoSimilarity} = ${contribution}`);
        weightedSum += contribution;
        totalWeight += weights.otherInfo;
    }

    if (hasLegacyInfoData) {
        const contribution = weights.legacyInfo * legacyInfoSimilarity;
        console.log(`  legacyInfo: ${weights.legacyInfo} × ${legacyInfoSimilarity} = ${contribution}`);
        weightedSum += contribution;
        totalWeight += weights.legacyInfo;
    }

    console.log(`\nWeighted Sum: ${weightedSum}`);
    console.log(`Total Weight: ${totalWeight}`);
    console.log('');

    // Step 10: Normalization and penalties
    console.log('───────────────────────────────────────────────────────────────────');
    console.log('STEP 10: NORMALIZATION AND PENALTIES');
    console.log('───────────────────────────────────────────────────────────────────');

    const PRECISION = 10000000000;
    const round10 = (val) => Math.round(val * PRECISION) / PRECISION;

    let overallSimilarity = round10(weightedSum / totalWeight);
    console.log(`Normalized Score: ${weightedSum} / ${totalWeight} = ${overallSimilarity}`);

    const MISSING_NAME_PENALTY = 0.04;
    const MISSING_CONTACTINFO_PENALTY = 0.03;
    let totalPenalty = 0;

    if (!hasNameData) {
        totalPenalty += MISSING_NAME_PENALTY;
        console.log(`Missing name penalty: -${MISSING_NAME_PENALTY}`);
    }
    if (!hasContactInfoData) {
        totalPenalty += MISSING_CONTACTINFO_PENALTY;
        console.log(`Missing contactInfo penalty: -${MISSING_CONTACTINFO_PENALTY}`);
    }

    if (totalPenalty > 0) {
        const beforePenalty = overallSimilarity;
        overallSimilarity = round10(Math.max(0, overallSimilarity - totalPenalty));
        console.log(`Total penalty: ${totalPenalty}`);
        console.log(`Score after penalty: ${beforePenalty} - ${totalPenalty} = ${overallSimilarity}`);
    } else {
        console.log('No penalties applied');
    }
    console.log('');

    // Step 11: Final result
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('FINAL RESULT');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log(`>>> OVERALL SIMILARITY: ${overallSimilarity}`);
    console.log('');

    // Also call the actual compareTo to verify
    console.log('───────────────────────────────────────────────────────────────────');
    console.log('VERIFICATION: Calling entity1.compareTo(entity2, true)');
    console.log('───────────────────────────────────────────────────────────────────');
    const actualResult = entity1.compareTo(entity2, true);
    console.log('Actual compareTo result:');
    console.log(JSON.stringify(actualResult, null, 2));

    return {
        tracedScore: overallSimilarity,
        actualResult: actualResult,
        components: {
            name: { similarity: nameSimilarity, weight: weights.name },
            contactInfo: { similarity: contactInfoSimilarity, weight: weights.contactInfo, method: contactInfoMethod },
            otherInfo: { similarity: otherInfoSimilarity, weight: weights.otherInfo },
            legacyInfo: { similarity: legacyInfoSimilarity, weight: weights.legacyInfo }
        },
        isSameLocation: isSameLocation
    };
}

// Export for browser
if (typeof window !== 'undefined') {
    window.traceEntityComparison = traceEntityComparison;
}
*/

