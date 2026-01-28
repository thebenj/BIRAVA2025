/**
 * Alias Management Classes for BIRAVA2025 Object Model
 *
 * These classes handle the Alias Problem - resolving multiple text representations
 * of the same entities across different data sources (VisionAppraisal, Phonebook, Bloomerang)
 *
 * ARCHITECTURE:
 * - Container Classes (IndicativeData, IdentifyingData): Hold and categorize identifier reliability
 * - Identifier Classes (SimpleIdentifiers, ComplexIdentifiers): Handle aliasing and matching logic
 * - Simple vs Complex: Simple = direct matching, Complex = fuzzy matching with normalization
 * - Manual Override Support: All automated decisions can be manually corrected via override files
 */

/**
 * Data Source Constants for AttributedTerm source tracking
 * Used to identify the origin of data across the three data sources
 */
const DATA_SOURCES = Object.freeze({
    BLOOMERANG_CSV: "BLOOMERANG_CSV",
    VISION_APPRAISAL: "VISION_APPRAISAL",
    PHONEBOOK: "PHONEBOOK"
});

/**
 * Helper function for deserialize methods to handle both raw data and already-transformed instances
 * JSON.parse reviver (used by deserializeWithTypes) processes bottom-up, so nested objects
 * may already be class instances when parent's deserialize is called.
 *
 * @param {*} value - The value to deserialize (may already be an instance)
 * @param {Function} TargetClass - The expected class type
 * @param {Function} deserializeFn - Function to deserialize raw data (defaults to TargetClass.deserialize)
 * @returns {*} The class instance (either passed through or deserialized)
 */
function ensureDeserialized(value, TargetClass, deserializeFn = null) {
    if (value === null || value === undefined) {
        return value;
    }
    if (value instanceof TargetClass) {
        return value; // Already transformed by reviver
    }
    // Raw data - needs deserialization
    return deserializeFn ? deserializeFn(value) : TargetClass.deserialize(value);
}

/**
 * AttributedTerm class - represents a term with source attribution information
 * All terms require source attribution for data lineage and conflict resolution
 */
class AttributedTerm {
    constructor(term, source, index, identifier, fieldName = null) {
        // The term/identifier value
        this.term = term;

        // Field name - specifies the entity property name where this term's data will be stored
        // Example: "email", "fireNumber", "completeName", etc.
        this.fieldName = fieldName;

        // Map where key is source (text) and value is an object with index and identifier properties
        this.sourceMap = new Map();

        // Set the initial source information (required)
        this.sourceMap.set(source, {
            index: index,
            identifier: identifier
        });

        // Weighted comparison architecture properties
        this.comparisonWeights = null;                    // Object: {propName: weight, ...}
        this.comparisonCalculatorName = 'defaultWeightedComparison';  // Serializable string name
        this.comparisonCalculator = window.resolveComparisonCalculator(this.comparisonCalculatorName); // Resolved function
    }

    /**
     * Add additional source attribution for this term (for multi-source terms)
     * @param {string} source - The source identifier (text)
     * @param {number} index - Index value (integer >= -1)
     * @param {string|number} identifier - Identifier value (text or number)
     */
    addAdditionalSource(source, index, identifier) {
        this.sourceMap.set(source, {
            index: index,
            identifier: identifier
        });
    }

    /**
     * Get source information for a specific source
     * @param {string} source - The source to look up
     * @returns {object|undefined} Object with index and identifier properties, or undefined if not found
     */
    getSource(source) {
        return this.sourceMap.get(source);
    }

    /**
     * Get all sources for this term
     * @returns {Array} Array of source names
     */
    getSources() {
        return Array.from(this.sourceMap.keys());
    }

    /**
     * Check if this term has a specific source
     * @param {string} source - Source to check for
     * @returns {boolean} True if source exists
     */
    hasSource(source) {
        return this.sourceMap.has(source);
    }

    /**
     * Set or update the field name for this term
     * @param {string} fieldName - The entity property name where this term will be stored
     */
    setFieldName(fieldName) {
        this.fieldName = fieldName;
    }

    /**
     * Get the field name for this term
     * @returns {string|null} The field name or null if not set
     */
    getFieldName() {
        return this.fieldName;
    }

    /**
     * Deserialize AttributedTerm from JSON object
     * Uses constructor (initialization logic runs)
     * Expects sourceMap to be a Map (restored by deserializeWithTypes)
     * @param {Object} data - Serialized data with sourceMap as Map
     * @returns {AttributedTerm} Reconstructed AttributedTerm instance
     */
    static deserialize(data) {
        if (data.type !== 'AttributedTerm') {
            throw new Error('Invalid AttributedTerm serialization format');
        }

        // sourceMap should be a Map (restored by deserializeWithTypes)
        if (!(data.sourceMap instanceof Map)) {
            throw new Error('AttributedTerm.deserialize expects sourceMap to be a Map (use deserializeWithTypes)');
        }

        // Get first entry from Map to create instance
        const entries = Array.from(data.sourceMap.entries());
        if (entries.length === 0) {
            throw new Error('AttributedTerm has no source entries');
        }

        const [firstSource, firstInfo] = entries[0];

        // Recreate with first source entry - constructor runs!
        const term = new AttributedTerm(
            data.term,
            firstSource,
            firstInfo.index,
            firstInfo.identifier,
            data.fieldName || null
        );

        // Add remaining source entries
        for (let i = 1; i < entries.length; i++) {
            const [source, info] = entries[i];
            term.addAdditionalSource(source, info.index, info.identifier);
        }

        // Restore comparison properties from serialized data if present
        if (data.comparisonCalculatorName) {
            term.comparisonCalculatorName = data.comparisonCalculatorName;
            term.comparisonCalculator = window.resolveComparisonCalculator(data.comparisonCalculatorName);
        }
        if (data.comparisonWeights) {
            term.comparisonWeights = data.comparisonWeights;
        }

        return term;
    }

    /**
     * Factory method for deserialization - creates instance via constructor
     * This is the preferred entry point for deserializeWithTypes to use
     * Uses 'this' for polymorphic dispatch so subclasses use their own deserialize
     * @param {Object} data - Serialized data object
     * @returns {AttributedTerm} Reconstructed instance (AttributedTerm or subclass)
     */
    static fromSerializedData(data) {
        // 'this' refers to the actual class called (FireNumberTerm, EmailTerm, etc.)
        // not necessarily AttributedTerm, enabling polymorphic deserialization
        return this.deserialize(data);
    }

    /**
     * Generic pattern matching against the term value
     * @param {string|RegExp} pattern - Pattern to match against
     * @returns {Array|null} Match results or null if no match
     */
    match(pattern) {
        if (typeof this.term === 'string') {
            return this.term.match(pattern);
        }
        return null;
    }

    /**
     * Generic regex testing against the term value
     * @param {RegExp} regex - Regular expression to test
     * @returns {boolean} True if pattern matches
     */
    matchesPattern(regex) {
        if (typeof this.term === 'string') {
            return regex.test(this.term);
        }
        return false;
    }

    /**
     * Extract numeric value from the term
     * @returns {number|null} Extracted number or null if no valid number found
     */
    extractNumeric() {
        if (typeof this.term === 'number') {
            return this.term;
        }
        if (typeof this.term === 'string') {
            const parsed = parseInt(this.term, 10);
            return isNaN(parsed) ? null : parsed;
        }
        return null;
    }

    /**
     * Returns the string representation of this AttributedTerm
     * @returns {string} The term value with fieldName context if available
     */
    toString() {
        if (this.fieldName) {
            return `${this.term} (field: ${this.fieldName})`;
        }
        return this.term;
    }

    /**
     * Compare this AttributedTerm with another AttributedTerm
     * Uses compareTo convention: returns 0 for match, non-zero for non-match
     * FUTURE: Can be enhanced with sophisticated string matching algorithms
     * @param {AttributedTerm} other - Other AttributedTerm to compare
     * @returns {number} Similarity score 0-1 (1 = identical, 0 = completely different)
     * @throws {Error} If comparing with non-AttributedTerm object
     */
    compareTo(other) {
        // Type checking - throw error for invalid comparison
        if (!other || !(other instanceof AttributedTerm)) {
            throw new Error('Cannot compare AttributedTerm with non-AttributedTerm object');
        }

        // Both null/undefined - perfect match
        if (!this.term && !other.term) {
            return 1.0;
        }

        // One null, one not null - no match
        if (!this.term || !other.term) {
            return 0.0;
        }

        // Compare using vowel-weighted Levenshtein similarity
        // Returns 0-1 similarity score (1 = identical, 0 = completely different)
        if (typeof levenshteinSimilarity === 'function') {
            return levenshteinSimilarity(this.term, other.term);
        }

        // Fallback to simple equality if levenshteinSimilarity not available
        var normalized1 = (this.term || '').toString().trim().toUpperCase();
        var normalized2 = (other.term || '').toString().trim().toUpperCase();
        return normalized1 === normalized2 ? 1.0 : 0.0;
    }
}

/**
 * Aliases class - manages alternative versions of identifiers
 *
 * Three categories with distinct verification status:
 * - homonyms: Verified trivial variations (misspellings, case differences) - high similarity
 * - synonyms: UNVERIFIED staging area for similarity-based matches - may be false positives
 * - candidates: Verified alternatives despite possibly low similarity (contextual evidence)
 *
 * For matching: Use homonyms and candidates (verified). Exclude synonyms (unverified).
 */
class Aliases {
    constructor() {
        // Array of AttributedTerm objects representing homonyms (verified, high similarity)
        this.homonyms = [];

        // Array of AttributedTerm objects representing synonyms (UNVERIFIED staging area)
        this.synonyms = [];

        // Array of AttributedTerm objects representing candidates (verified via context/review)
        this.candidates = [];
    }

    /**
     * Add an AttributedTerm to the appropriate category
     * @param {AttributedTerm} attributedTerm - The AttributedTerm to add
     * @param {string} category - Category: 'homonyms', 'synonyms', or 'candidates'
     */
    add(attributedTerm, category = 'synonyms') {
        if (category === 'homonyms') {
            this.homonyms.push(attributedTerm);
        } else if (category === 'candidates') {
            this.candidates.push(attributedTerm);
        } else {
            this.synonyms.push(attributedTerm);
        }
    }

    /**
     * Remove an AttributedTerm from all categories
     * @param {AttributedTerm} attributedTerm - The AttributedTerm to remove
     */
    remove(attributedTerm) {
        this.homonyms = this.homonyms.filter(term => term.term !== attributedTerm.term);
        this.synonyms = this.synonyms.filter(term => term.term !== attributedTerm.term);
        this.candidates = this.candidates.filter(term => term.term !== attributedTerm.term);
    }

    /**
     * Check if a term value exists in any category
     * @param {string|number} termValue - The term value to check for
     * @returns {boolean} True if term value found in homonyms or synonyms
     */
    contains(termValue) {
        return this.homonyms.some(term => term.term === termValue) ||
               this.synonyms.some(term => term.term === termValue);
    }

    /**
     * Get all term values from all categories
     * @returns {Array} Array of term values
     */
    getAllTermValues() {
        return [
            ...this.homonyms.map(term => term.term),
            ...this.synonyms.map(term => term.term),
            ...this.candidates.map(term => term.term)
        ];
    }

    /**
     * Get all AttributedTerm objects from all categories
     * @returns {Array} Array of AttributedTerm objects
     */
    getAllAttributedTerms() {
        return [...this.homonyms, ...this.synonyms, ...this.candidates];
    }

    /**
     * Deduplicate each category by removing identical entries.
     * Two entries are considered identical if their trimmed term values match exactly (case-sensitive).
     * Each category (homonyms, synonyms, candidates) is deduplicated independently.
     */
    deduplicate() {
        // Helper to deduplicate an array of AttributedTerms by trimmed term value
        const dedupeArray = (arr) => {
            const seen = new Set();
            return arr.filter(item => {
                const key = (item.term || '').toString().trim();
                if (seen.has(key)) {
                    return false;
                }
                seen.add(key);
                return true;
            });
        };

        this.homonyms = dedupeArray(this.homonyms);
        this.synonyms = dedupeArray(this.synonyms);
        this.candidates = dedupeArray(this.candidates);
    }

    /**
     * Deserialize Aliases from JSON object
     * @param {Object} data - Serialized data
     * @returns {Aliases} Reconstructed Aliases instance
     */
    static deserialize(data) {
        if (data.type !== 'Aliases') {
            throw new Error('Invalid Aliases serialization format');
        }

        const aliases = new Aliases();
        aliases.homonyms = data.homonyms.map(termData => AttributedTerm.deserialize(termData));
        aliases.synonyms = data.synonyms.map(termData => AttributedTerm.deserialize(termData));
        aliases.candidates = data.candidates.map(termData => AttributedTerm.deserialize(termData));

        return aliases;
    }
}

/**
 * Aliased class - top-level class for entities that can have multiple representations
 * Addresses the core Alias Problem in the BIRAVA2025 system
 */
class Aliased {
    /**
     * Create an Aliased entity
     * @param {AttributedTerm} primaryAlias - The primary/canonical representation with source attribution
     */
    constructor(primaryAlias) {
        // The primary/canonical representation of this entity (AttributedTerm object)
        this.primaryAlias = primaryAlias;

        // Collection of alternative representations
        this.alternatives = new Aliases();

        // Weighted comparison architecture properties
        this.comparisonWeights = null;                    // Object: {propName: weight, ...}
        this.comparisonCalculatorName = 'defaultWeightedComparison';  // Serializable string name
        this.comparisonCalculator = window.resolveComparisonCalculator(this.comparisonCalculatorName); // Resolved function
    }

    /**
     * Add an alternative representation
     * @param {AttributedTerm} aliasAttributedTerm - Alternative representation to add
     */
    addAlternative(aliasAttributedTerm) {
        // Don't add the primary alias as an alternative
        if (aliasAttributedTerm.term !== this.primaryAlias.term) {
            this.alternatives.add(aliasAttributedTerm);
        }
    }

    /**
     * Remove an alternative representation
     * @param {AttributedTerm} aliasAttributedTerm - Alternative representation to remove
     */
    removeAlternative(aliasAttributedTerm) {
        this.alternatives.remove(aliasAttributedTerm);
    }

    /**
     * Check if this entity matches a given representation
     * @param {string|number} termValue - Term value to check against
     * @returns {boolean} True if the term value matches this entity
     */
    matches(termValue) {
        return termValue === this.primaryAlias.term || this.alternatives.contains(termValue);
    }

    /**
     * Get all term values (primary + alternatives)
     * @returns {Array} Array containing primary term value and all alternative term values
     */
    getAllTermValues() {
        return [this.primaryAlias.term, ...this.alternatives.getAllTermValues()];
    }

    /**
     * Get all AttributedTerm objects (primary + alternatives)
     * @returns {Array} Array containing primary AttributedTerm and all alternative AttributedTerms
     */
    getAllAttributedTerms() {
        return [this.primaryAlias, ...this.alternatives.getAllAttributedTerms()];
    }

    /**
     * Set a new primary alias, moving the current primary to alternatives if needed
     * @param {AttributedTerm} newPrimary - New primary AttributedTerm
     */
    setPrimaryAlias(newPrimary) {
        // Add current primary to alternatives if it's not the same as the new one
        if (this.primaryAlias.term !== newPrimary.term) {
            this.alternatives.add(this.primaryAlias);
            this.primaryAlias = newPrimary;
            // Remove the new primary from alternatives if it was there
            this.alternatives.remove(newPrimary);
        }
    }

    // COMMENTED OUT: Duplicate compareTo definition - this was dead code being overwritten by later definition
    // Left here for reference in case revert needed. See line ~573 for the active compareTo method.
    // /**
    //  * Compare this Aliased object to another using genericObjectCompareTo
    //  * @param {Aliased} other - Other Aliased object to compare against
    //  * @returns {number} Comparison result (-1 to 1 for weighted, 0 for match, non-zero for non-match otherwise)
    //  */
    // compareTo(other) {
    //     // DIAGNOSTIC: Log when compareTo is called (first 3 times only)
    //     if (typeof window !== 'undefined') {
    //         if (!window._compareTo_count) window._compareTo_count = 0;
    //         if (window._compareTo_count < 3) {
    //             console.log(`[Aliased.compareTo #${window._compareTo_count + 1}] Called on:`, this.constructor.name);
    //             console.log(`[Aliased.compareTo #${window._compareTo_count + 1}] this.comparisonWeights:`, this.comparisonWeights);
    //             console.log(`[Aliased.compareTo #${window._compareTo_count + 1}] this.comparisonCalculator:`, typeof this.comparisonCalculator);
    //             console.trace(`[Aliased.compareTo #${window._compareTo_count + 1}] Call stack`);
    //             window._compareTo_count++;
    //         }
    //     }
    //     return genericObjectCompareTo(this, other, ['alternatives']);
    // }

    /**
     * Deserialize Aliased from JSON object
     * Uses constructor (initialization logic runs)
     * Handles both raw data and already-transformed instances (from deserializeWithTypes)
     * @param {Object} data - Serialized data
     * @returns {Aliased} Reconstructed Aliased instance
     */
    static deserialize(data) {
        if (data.type !== 'Aliased') {
            throw new Error('Invalid Aliased serialization format');
        }

        // Constructor runs! Handle already-transformed instances from bottom-up reviver
        const primaryAlias = ensureDeserialized(data.primaryAlias, AttributedTerm);
        const aliased = new Aliased(primaryAlias);
        aliased.alternatives = ensureDeserialized(data.alternatives, Aliases);

        // Restore comparison properties from serialized data if present
        if (data.comparisonCalculatorName) {
            aliased.comparisonCalculatorName = data.comparisonCalculatorName;
            aliased.comparisonCalculator = window.resolveComparisonCalculator(data.comparisonCalculatorName);
        }
        if (data.comparisonWeights) {
            aliased.comparisonWeights = data.comparisonWeights;
        }

        return aliased;
    }

    /**
     * Factory method for deserialization - creates instance via constructor
     * This is the preferred entry point for deserializeWithTypes to use
     * Uses 'this' for polymorphic dispatch so subclasses use their own deserialize
     * @param {Object} data - Serialized data object
     * @returns {Aliased} Reconstructed instance (Aliased or subclass)
     */
    static fromSerializedData(data) {
        // 'this' refers to the actual class called (FireNumber, PID, etc.)
        // not necessarily Aliased, enabling polymorphic deserialization
        return this.deserialize(data);
    }

    /**
     * Static factory method: create a consensus Aliased from multiple Aliased objects
     * Selects the best primary (highest average similarity to others) and categorizes
     * the remaining primaries into homonyms, synonyms, or candidates based on thresholds.
     * Also merges existing alternatives from source objects.
     *
     * @param {Array<Aliased>} aliasedObjects - Array of Aliased objects to merge
     * @param {Object} thresholds - Categorization thresholds
     * @param {number} thresholds.homonym - Minimum similarity for homonym (e.g., 0.875)
     * @param {number} thresholds.synonym - Minimum similarity for synonym (e.g., 0.845)
     * @param {number} thresholds.candidate - (Unused) No minimum for candidates - all variants below synonym become candidates
     * @returns {Aliased|null} New Aliased instance with populated alternatives, or null if empty input
     */
    static createConsensus(aliasedObjects, thresholds) {
        if (!aliasedObjects || aliasedObjects.length === 0) return null;
        if (aliasedObjects.length === 1) return aliasedObjects[0];

        // Default thresholds if not provided
        const t = {
            homonym: thresholds?.homonym ?? 0.875,
            synonym: thresholds?.synonym ?? 0.845,
            candidate: thresholds?.candidate ?? 0.5
        };

        // Step 1: Find the best primary (highest average similarity to all others)
        let bestIndex = 0;
        let bestAvgScore = 0;
        const similarityScores = []; // Store [i][j] scores

        for (let i = 0; i < aliasedObjects.length; i++) {
            let totalScore = 0;
            let comparisons = 0;
            similarityScores[i] = [];

            for (let j = 0; j < aliasedObjects.length; j++) {
                if (i === j) {
                    similarityScores[i][j] = 1.0;
                    continue;
                }

                try {
                    if (typeof aliasedObjects[i].compareTo === 'function') {
                        const score = aliasedObjects[i].compareTo(aliasedObjects[j]);
                        if (typeof score === 'number') {
                            totalScore += score;
                            comparisons++;
                            similarityScores[i][j] = score;
                        } else {
                            similarityScores[i][j] = 0;
                        }
                    } else {
                        similarityScores[i][j] = 0;
                    }
                } catch (e) {
                    similarityScores[i][j] = 0;
                }
            }

            const avgScore = comparisons > 0 ? totalScore / comparisons : 0;
            if (avgScore > bestAvgScore) {
                bestAvgScore = avgScore;
                bestIndex = i;
            }
        }

        // Step 2: Create new consensus Aliased using the best primary
        const bestObject = aliasedObjects[bestIndex];
        const consensus = new Aliased(bestObject.primaryAlias);

        // Copy comparison properties from best object
        if (bestObject.comparisonWeights) {
            consensus.comparisonWeights = bestObject.comparisonWeights;
        }
        if (bestObject.comparisonCalculatorName) {
            consensus.comparisonCalculatorName = bestObject.comparisonCalculatorName;
            consensus.comparisonCalculator = window.resolveComparisonCalculator(bestObject.comparisonCalculatorName);
        }

        // Step 3: Categorize other primaries into alternatives
        for (let i = 0; i < aliasedObjects.length; i++) {
            if (i === bestIndex) continue;

            const otherObject = aliasedObjects[i];
            const similarity = similarityScores[bestIndex][i];

            // Add other's primary to appropriate category
            // Note: No minimum threshold for candidates - all non-homonym/synonym variants are captured
            if (otherObject.primaryAlias) {
                if (similarity >= t.homonym) {
                    consensus.alternatives.add(otherObject.primaryAlias, 'homonyms');
                } else if (similarity >= t.synonym) {
                    consensus.alternatives.add(otherObject.primaryAlias, 'synonyms');
                } else {
                    // All other variants become candidates (no minimum threshold)
                    consensus.alternatives.add(otherObject.primaryAlias, 'candidates');
                }
            }

            // Step 4: Merge existing alternatives from other objects
            if (otherObject.alternatives) {
                consensus._mergeSourceAlternatives(otherObject.alternatives, similarity, t);
            }
        }

        // Also merge alternatives from the best object itself
        if (bestObject.alternatives) {
            consensus._mergeSourceAlternatives(bestObject.alternatives, 1.0, t);
        }

        // Step 5: Deduplicate each alternatives category
        consensus.alternatives.deduplicate();

        return consensus;
    }

    /**
     * Merge other Aliased objects into this instance, categorizing their primaries
     * and alternatives based on similarity thresholds.
     *
     * @param {Array<Aliased>} otherObjects - Other Aliased objects to merge
     * @param {Object} thresholds - Categorization thresholds
     * @param {number} thresholds.homonym - Minimum similarity for homonym (e.g., 0.875)
     * @param {number} thresholds.synonym - Minimum similarity for synonym (e.g., 0.845)
     * @param {number} thresholds.candidate - (Unused) No minimum for candidates - all variants below synonym become candidates
     */
    mergeAlternatives(otherObjects, thresholds) {
        if (!otherObjects || otherObjects.length === 0) return;

        // Default thresholds if not provided
        const t = {
            homonym: thresholds?.homonym ?? 0.875,
            synonym: thresholds?.synonym ?? 0.845,
            candidate: thresholds?.candidate ?? 0.5
        };

        for (const otherObject of otherObjects) {
            // Compare this object to the other
            let similarity = 0;
            try {
                if (typeof this.compareTo === 'function') {
                    const score = this.compareTo(otherObject);
                    if (typeof score === 'number') {
                        similarity = score;
                    }
                }
            } catch (e) {
                // Skip comparison errors
            }

            // Add other's primary to appropriate category
            // Note: No minimum threshold for candidates - all non-homonym/synonym variants are captured
            if (otherObject.primaryAlias) {
                // Don't add if it matches our primary
                if (otherObject.primaryAlias.term !== this.primaryAlias.term) {
                    if (similarity >= t.homonym) {
                        this.alternatives.add(otherObject.primaryAlias, 'homonyms');
                    } else if (similarity >= t.synonym) {
                        this.alternatives.add(otherObject.primaryAlias, 'synonyms');
                    } else {
                        // All other variants become candidates (no minimum threshold)
                        this.alternatives.add(otherObject.primaryAlias, 'candidates');
                    }
                }
            }

            // Merge existing alternatives from other object
            if (otherObject.alternatives) {
                this._mergeSourceAlternatives(otherObject.alternatives, similarity, t);
            }
        }
    }

    /**
     * Helper: merge alternatives from a source Aliases object into this instance
     * Categorization depends on how similar the source was to this object
     * @param {Aliases} sourceAlternatives - Source alternatives to merge
     * @param {number} sourceSimilarity - Similarity of source to this primary (0-1)
     * @param {Object} t - Thresholds object {homonym, synonym, candidate}
     * @private
     */
    _mergeSourceAlternatives(sourceAlternatives, sourceSimilarity, t) {
        // If source is highly similar (homonym-level), its alternatives get promoted
        // If source is moderately similar or dissimilar, its alternatives become candidates
        // No minimum threshold - all alternatives are captured

        const allSourceTerms = sourceAlternatives.getAllAttributedTerms();

        for (const term of allSourceTerms) {
            // Don't add if it matches our primary
            if (term.term === this.primaryAlias.term) continue;

            // Determine category based on source similarity
            if (sourceSimilarity >= t.homonym) {
                // Source is basically same entity - its homonyms become our synonyms,
                // its synonyms become our synonyms, its candidates stay candidates
                if (sourceAlternatives.homonyms.some(h => h.term === term.term)) {
                    this.alternatives.add(term, 'synonyms');
                } else if (sourceAlternatives.synonyms.some(s => s.term === term.term)) {
                    this.alternatives.add(term, 'synonyms');
                } else {
                    this.alternatives.add(term, 'candidates');
                }
            } else if (sourceSimilarity >= t.synonym) {
                // Source is a synonym - demote all its alternatives to candidates
                this.alternatives.add(term, 'candidates');
            } else {
                // Source is dissimilar - all its alternatives become candidates
                this.alternatives.add(term, 'candidates');
            }
        }
    }

    /**
     * Returns the string representation of this Aliased object
     * @returns {string} The primary alias value
     */
    toString() {
        return this.primaryAlias.toString();
    }

    /**
     * Base compareTo implementation for all Aliased subclasses using generic utility
     * Uses genericObjectCompareTo for dynamic property iteration with automatic compareTo detection
     * Subclasses can override for more sophisticated comparison logic
     * @param {Aliased} other - Other Aliased object to compare
     * @param {boolean} detailed - If true, return detailed breakdown object instead of just similarity score
     * @returns {number|Object} Similarity score 0-1, or detailed breakdown object if detailed=true
     * @throws {Error} If comparing with non-Aliased object or if utility not available
     */
    compareTo(other, detailed = false) {
        // Check if generic utility is available
        if (typeof genericObjectCompareTo === 'function') {
            // Use generic utility with 'alternatives' excluded (aliases handled separately in most cases)
            return genericObjectCompareTo(this, other, ['alternatives'], detailed);
        } else {
            // Clear error message if dependency missing
            throw new Error('genericObjectCompareTo utility not available - ensure utils.js is loaded first');
        }
    }
}

/**
 * SimpleIdentifiers class - subclass of Aliased for simple identifier types
 * @param {AttributedTerm} primaryAlias - AttributedTerm containing the primary identifier value
 */
class SimpleIdentifiers extends Aliased {
    constructor(primaryAlias) {
        super(primaryAlias);
    }

    /**
     * Deserialize SimpleIdentifiers from JSON object
     * Handles both raw data and already-transformed instances (from deserializeWithTypes)
     * @param {Object} data - Serialized data
     * @returns {SimpleIdentifiers} Reconstructed SimpleIdentifiers instance
     */
    static deserialize(data) {
        if (data.type !== 'SimpleIdentifiers') {
            throw new Error('Invalid SimpleIdentifiers serialization format');
        }

        const primaryAlias = ensureDeserialized(data.primaryAlias, AttributedTerm);
        const identifier = new SimpleIdentifiers(primaryAlias);
        identifier.alternatives = ensureDeserialized(data.alternatives, Aliases);

        return identifier;
    }
}

/**
 * NonHumanName class - subclass of SimpleIdentifiers for non-human entity names
 * Used for Business and LegalConstruct entities where name is a simple identifier
 * (not a complex individual name with firstName/lastName/etc.)
 * @param {AttributedTerm} primaryAlias - AttributedTerm containing the organization/business name
 */
class NonHumanName extends SimpleIdentifiers {
    constructor(primaryAlias) {
        super(primaryAlias);
    }

    /**
     * Deserialize NonHumanName from JSON object
     * @param {Object} data - Serialized data
     * @returns {NonHumanName} Reconstructed NonHumanName instance
     */
    static deserialize(data) {
        if (data.type !== 'NonHumanName') {
            throw new Error('Invalid NonHumanName serialization format');
        }

        const primaryAlias = ensureDeserialized(data.primaryAlias, AttributedTerm);
        const identifier = new NonHumanName(primaryAlias);
        identifier.alternatives = ensureDeserialized(data.alternatives, Aliases);

        return identifier;
    }
}

/**
 * IndicativeData class - container that holds identifier fields of moderate reliability
 * Used for data that suggests identity but isn't definitive (contact info, account numbers)
 * Contains either SimpleIdentifiers or ComplexIdentifiers instance
 */
class IndicativeData {
    constructor(identifier) {
        // identifier should be either SimpleIdentifiers or ComplexIdentifiers instance
        this.identifier = identifier;
    }

    /**
     * Deserialize IndicativeData from JSON object
     * Handles both raw data and already-transformed instances (from deserializeWithTypes)
     * @param {Object} data - Serialized data
     * @returns {IndicativeData} Reconstructed IndicativeData instance
     */
    static deserialize(data) {
        if (data.type !== 'IndicativeData') {
            throw new Error('Invalid IndicativeData serialization format');
        }

        // Determine identifier type and deserialize appropriately
        const identifier = this._deserializeIdentifier(data.identifier);
        return new IndicativeData(identifier);
    }

    /**
     * Helper method to deserialize identifier based on type
     * Handles both raw data and already-transformed instances (from deserializeWithTypes)
     * @param {Object} identifierData - Serialized identifier data or already-transformed instance
     * @returns {SimpleIdentifiers|ComplexIdentifiers} Reconstructed identifier
     * @private
     */
    static _deserializeIdentifier(identifierData) {
        // Handle already-transformed instances (from deserializeWithTypes bottom-up processing)
        // Check if it's already one of the identifier types
        if (identifierData instanceof SimpleIdentifiers ||
            identifierData instanceof ComplexIdentifiers ||
            identifierData instanceof Aliased) {
            return identifierData;
        }

        // Raw data - needs deserialization based on type
        switch (identifierData.type) {
            case 'SimpleIdentifiers':
                return SimpleIdentifiers.deserialize(identifierData);
            case 'FireNumber':
                return FireNumber.deserialize(identifierData);
            case 'PID':
                return PID.deserialize(identifierData);
            case 'PoBox':
                return PoBox.deserialize(identifierData);
            case 'StreetName':
                return StreetName.deserialize(identifierData);
            case 'ComplexIdentifiers':
                return ComplexIdentifiers.deserialize(identifierData);
            case 'IndividualName':
                return IndividualName.deserialize(identifierData);
            case 'HouseholdName':
                return HouseholdName.deserialize(identifierData);
            case 'Address':
                return Address.deserialize(identifierData);
            default:
                throw new Error(`Unknown identifier type: ${identifierData.type}`);
        }
    }

    /**
     * Returns the string representation of this IndicativeData
     * @returns {string} The contained identifier's string representation
     */
    toString() {
        return this.identifier.toString();
    }
}

/**
 * IdentifyingData class - container that holds identifier fields of high reliability
 * Used for data that provides definitive identification (Fire Numbers, PIDs, names)
 * Contains either SimpleIdentifiers or ComplexIdentifiers instance
 */
class IdentifyingData {
    constructor(identifier) {
        // identifier should be either SimpleIdentifiers or ComplexIdentifiers instance
        this.identifier = identifier;
    }

    /**
     * Deserialize IdentifyingData from JSON object
     * @param {Object} data - Serialized data
     * @returns {IdentifyingData} Reconstructed IdentifyingData instance
     */
    static deserialize(data) {
        if (data.type !== 'IdentifyingData') {
            throw new Error('Invalid IdentifyingData serialization format');
        }

        // Use the same helper method as IndicativeData
        const identifier = IndicativeData._deserializeIdentifier(data.identifier);
        return new IdentifyingData(identifier);
    }

    /**
     * Returns the string representation of this IdentifyingData
     * @returns {string} The contained identifier's string representation
     */
    toString() {
        return this.identifier.toString();
    }
}

/**
 * FireNumber class - subclass of SimpleIdentifiers for Block Island fire numbers
 * PRIMARY location identifier: integer, 4 digits or less, <3500
 * Found as standalone field or extracted from beginning of Block Island street addresses
 * @param {AttributedTerm} primaryAlias - AttributedTerm containing the fire number value
 */
class FireNumber extends SimpleIdentifiers {
    constructor(primaryAlias) {
        super(primaryAlias);
    }

    /**
     * Deserialize FireNumber from JSON object
     * Handles both raw data and already-transformed instances (from deserializeWithTypes)
     * @param {Object} data - Serialized data
     * @returns {FireNumber} Reconstructed FireNumber instance
     */
    static deserialize(data) {
        if (data.type !== 'FireNumber') {
            throw new Error('Invalid FireNumber serialization format');
        }

        const primaryAlias = ensureDeserialized(data.primaryAlias, AttributedTerm);
        const fireNumber = new FireNumber(primaryAlias);
        fireNumber.alternatives = ensureDeserialized(data.alternatives, Aliases);

        return fireNumber;
    }
}

/**
 * PoBox class - subclass of SimpleIdentifiers for PO Box identifiers
 * @param {AttributedTerm} primaryAlias - AttributedTerm containing the PO Box number
 */
class PoBox extends SimpleIdentifiers {
    constructor(primaryAlias) {
        super(primaryAlias);
    }

    /**
     * Deserialize PoBox from JSON object
     * Handles both raw data and already-transformed instances (from deserializeWithTypes)
     * @param {Object} data - Serialized data
     * @returns {PoBox} Reconstructed PoBox instance
     */
    static deserialize(data) {
        if (data.type !== 'PoBox') {
            throw new Error('Invalid PoBox serialization format');
        }

        const primaryAlias = ensureDeserialized(data.primaryAlias, AttributedTerm);
        const poBox = new PoBox(primaryAlias);
        poBox.alternatives = ensureDeserialized(data.alternatives, Aliases);

        return poBox;
    }
}

/**
 * PID class - subclass of SimpleIdentifiers for Parcel ID identifiers
 * SECONDARY location identifier: used only when Fire Number unavailable
 * Should have 1:1 relationship with Fire Numbers (conflicts indicate data errors)
 * @param {AttributedTerm} primaryAlias - AttributedTerm containing the PID value
 */
class PID extends SimpleIdentifiers {
    constructor(primaryAlias) {
        super(primaryAlias);
    }

    /**
     * Deserialize PID from JSON object
     * Handles both raw data and already-transformed instances (from deserializeWithTypes)
     * @param {Object} data - Serialized data
     * @returns {PID} Reconstructed PID instance
     */
    static deserialize(data) {
        if (data.type !== 'PID') {
            throw new Error('Invalid PID serialization format');
        }

        const primaryAlias = ensureDeserialized(data.primaryAlias, AttributedTerm);
        const pid = new PID(primaryAlias);
        pid.alternatives = ensureDeserialized(data.alternatives, Aliases);

        return pid;
    }
}

/**
 * StreetName class - subclass of SimpleIdentifiers for Block Island street names
 * Used to represent canonical street names with aliases for variations.
 *
 * The primaryAlias contains the canonical street name (e.g., "CORN NECK ROAD").
 * The alternatives (inherited from Aliased via SimpleIdentifiers) can contain:
 * - homonyms: Verified trivial variations (misspellings, case differences)
 * - synonyms: UNVERIFIED staging area - similarity-based matches pending review
 * - candidates: Verified alternatives (via context like phonebook, or human review)
 *
 * For address comparison, use primary/homonym/candidates (verified categories).
 * Exclude synonyms - they are unverified and may be false positives.
 *
 * This class enables semantic street name matching for Block Island addresses,
 * allowing "CORN NECK RD" to match "CORN NECK ROAD" during address comparison.
 *
 * @param {AttributedTerm} primaryAlias - AttributedTerm containing the canonical street name
 */
class StreetName extends SimpleIdentifiers {
    constructor(primaryAlias) {
        super(primaryAlias);
    }

    /**
     * Compare this StreetName to another StreetName or a string.
     * Returns an object with the highest Levenshtein similarity score
     * for each category of alias.
     *
     * @param {StreetName|string} other - StreetName to compare, or string to look up
     * @returns {Object} {
     *   primary: number,    // similarity to primaryAlias (0-1)
     *   homonym: number,    // highest similarity among homonyms (0-1, or -1 if none)
     *   synonym: number,    // highest similarity among synonyms (0-1, or -1 if none)
     *   candidate: number   // highest similarity among candidates (0-1, or -1 if none)
     * }
     */
    compareTo(other) {
        // Extract the term to compare
        let termToCheck = null;

        if (typeof other === 'string') {
            termToCheck = other.toUpperCase().trim();
        } else if (other instanceof StreetName) {
            termToCheck = other.primaryAlias?.term?.toUpperCase()?.trim();
        } else if (other?.primaryAlias?.term) {
            // Duck typing for StreetName-like objects
            termToCheck = other.primaryAlias.term.toUpperCase().trim();
        }

        // Default result for invalid input
        if (!termToCheck) {
            return { primary: 0, homonym: -1, synonym: -1, candidate: -1 };
        }

        // Helper to calculate similarity
        // First normalizes street names to expand abbreviations and remove duplicate types
        // (e.g., "ROAD Rd" → "ROAD"), then compares complete street names with Levenshtein
        const calcSimilarity = (term1, term2) => {
            if (!term1 || !term2) return 0;

            // Normalize to handle duplicate street types (e.g., "ROAD Rd" → "ROAD")
            // expandStreetName: expands "RD" → "ROAD", then removes "ROAD ROAD" → "ROAD"
            let normalized1 = term1.toUpperCase();
            let normalized2 = term2.toUpperCase();

            if (typeof StreetTypeAbbreviationManager !== 'undefined' &&
                StreetTypeAbbreviationManager.isLoaded) {
                normalized1 = StreetTypeAbbreviationManager.expandStreetName(term1);
                normalized2 = StreetTypeAbbreviationManager.expandStreetName(term2);
            }

            return levenshteinSimilarity(normalized1, normalized2);
        };

        // Calculate similarity to primary alias
        const thisPrimary = this.primaryAlias?.term;
        const primaryScore = calcSimilarity(thisPrimary, termToCheck);

        // Calculate best similarity among homonyms
        const homonyms = this.alternatives?.homonyms || [];
        let homonymScore = homonyms.length === 0 ? -1 : 0;
        for (const alt of homonyms) {
            const score = calcSimilarity(alt?.term, termToCheck);
            if (score > homonymScore) homonymScore = score;
        }

        // Calculate best similarity among synonyms
        const synonyms = this.alternatives?.synonyms || [];
        let synonymScore = synonyms.length === 0 ? -1 : 0;
        for (const alt of synonyms) {
            const score = calcSimilarity(alt?.term, termToCheck);
            if (score > synonymScore) synonymScore = score;
        }

        // Calculate best similarity among candidates
        const candidates = this.alternatives?.candidates || [];
        let candidateScore = candidates.length === 0 ? -1 : 0;
        for (const alt of candidates) {
            const score = calcSimilarity(alt?.term, termToCheck);
            if (score > candidateScore) candidateScore = score;
        }

        return {
            primary: primaryScore,
            homonym: homonymScore,
            synonym: synonymScore,
            candidate: candidateScore
        };
    }

    /**
     * Check if a string matches this StreetName (primary or any alternative).
     * Convenience method that checks if any category has a perfect match.
     *
     * @param {string} streetString - Street name string to check
     * @returns {boolean} True if the string matches this StreetName
     */
    matches(streetString) {
        const scores = this.compareTo(streetString);
        // Check if any category has a perfect match (1.0)
        return scores.primary === 1.0 ||
               scores.homonym === 1.0 ||
               scores.synonym === 1.0 ||
               scores.candidate === 1.0;
    }

    /**
     * Deserialize StreetName from JSON object
     * Handles both raw data and already-transformed instances (from deserializeWithTypes)
     * @param {Object} data - Serialized data
     * @returns {StreetName} Reconstructed StreetName instance
     */
    static deserialize(data) {
        if (data.type !== 'StreetName') {
            throw new Error('Invalid StreetName serialization format');
        }

        const primaryAlias = ensureDeserialized(data.primaryAlias, AttributedTerm);
        const streetName = new StreetName(primaryAlias);
        streetName.alternatives = ensureDeserialized(data.alternatives, Aliases);

        return streetName;
    }
}

/**
 * ComplexIdentifiers class - subclass of Aliased for complex identifier types
 * @param {AttributedTerm} primaryAlias - AttributedTerm containing the primary identifier value
 */
class ComplexIdentifiers extends Aliased {
    constructor(primaryAlias) {
        super(primaryAlias);
    }

    /**
     * Deserialize ComplexIdentifiers from JSON object
     * Handles both raw data and already-transformed instances (from deserializeWithTypes)
     * @param {Object} data - Serialized data
     * @returns {ComplexIdentifiers} Reconstructed ComplexIdentifiers instance
     */
    static deserialize(data) {
        if (data.type !== 'ComplexIdentifiers') {
            throw new Error('Invalid ComplexIdentifiers serialization format');
        }

        const primaryAlias = ensureDeserialized(data.primaryAlias, AttributedTerm);
        const identifier = new ComplexIdentifiers(primaryAlias);
        identifier.alternatives = ensureDeserialized(data.alternatives, Aliases);

        return identifier;
    }

    // compareTo() method inherited from Aliased class
    // Subclasses like Address can override for more sophisticated comparison
}

/**
 * IndividualName class - subclass of ComplexIdentifiers for individual names
 * This is a complex identifier that will be held within IdentifyingData
 * @param {AttributedTerm} primaryAlias - AttributedTerm containing the complete individual name
 * @param {string} title - Title (not in Bloomerang data - will be empty)
 * @param {string} firstName - First name from Bloomerang Field 2
 * @param {string} otherNames - Middle name(s) from Bloomerang Field 3
 * @param {string} lastName - Last name from Bloomerang Field 4
 * @param {string} suffix - Suffix (not in Bloomerang data - will be empty)
 */
class IndividualName extends ComplexIdentifiers {
    constructor(primaryAlias, title = "", firstName = "", otherNames = "", lastName = "", suffix = "") {
        super(primaryAlias);

        // Individual name components
        this.title = title;           // Not in Bloomerang data - empty
        this.firstName = firstName;   // Field 2: First Name
        this.otherNames = otherNames; // Field 3: Middle Name
        this.lastName = lastName;     // Field 4: Last Name
        this.suffix = suffix;         // Not in Bloomerang data - empty

        // Derived properties
        this.completeName = this._buildCompleteName();
        this.termOfAddress = this.completeName; // Initially matches completeName

        // Initialize weighted comparison with proven weights
        this.initializeWeightedComparison();
    }

    /**
     * Build complete name from components, skipping empty fields
     * @returns {string} Concatenated complete name
     * @private
     */
    _buildCompleteName() {
        const parts = [this.title, this.firstName, this.otherNames, this.lastName, this.suffix]
            .filter(part => part && part.trim() !== "");
        return parts.join(" ");
    }

    /**
     * Update term of address (can be different from completeName)
     * @param {string} termOfAddress - Preferred term of address
     */
    setTermOfAddress(termOfAddress) {
        this.termOfAddress = termOfAddress;
    }

    /**
     * Get formatted name for display
     * @param {string} format - Format type: 'full', 'lastFirst', 'firstLast'
     * @returns {string} Formatted name
     */
    getFormattedName(format = 'full') {
        switch (format) {
            case 'lastFirst':
                return this.lastName && this.firstName ?
                    `${this.lastName}, ${this.firstName}${this.otherNames ? ' ' + this.otherNames : ''}` :
                    this.completeName;
            case 'firstLast':
                return this.firstName && this.lastName ?
                    `${this.firstName}${this.otherNames ? ' ' + this.otherNames : ''} ${this.lastName}` :
                    this.completeName;
            case 'full':
            default:
                return this.completeName;
        }
    }

    /**
     * Deserialize IndividualName from JSON object
     * Handles both raw data and already-transformed instances (from deserializeWithTypes)
     * @param {Object} data - Serialized data
     * @returns {IndividualName} Reconstructed IndividualName instance
     */
    static deserialize(data) {
        if (data.type !== 'IndividualName') {
            throw new Error('Invalid IndividualName serialization format');
        }

        const primaryAlias = ensureDeserialized(data.primaryAlias, AttributedTerm);
        const individualName = new IndividualName(
            primaryAlias,
            data.title,
            data.firstName,
            data.otherNames,
            data.lastName,
            data.suffix
        );

        individualName.alternatives = ensureDeserialized(data.alternatives, Aliases);
        individualName.termOfAddress = data.termOfAddress;

        // comparisonWeights already set by constructor calling initializeWeightedComparison()
        // comparisonCalculator already set by Aliased constructor
        // Do NOT overwrite with values from disk

        return individualName;
    }

    /**
     * Initialize weighted comparison for IndividualName with proven algorithm weights
     * Sets proven weights from nameMatchingAnalysis insights
     */
    initializeWeightedComparison() {
        // Set proven weights from nameMatchingAnalysis (lastName: 0.5, firstName: 0.4, otherNames: 0.1)
        this.comparisonWeights = {
            lastName: 0.5,      // Most important component (proven effective)
            firstName: 0.4,     // Secondary importance (proven effective)
            otherNames: 0.1     // Least important (proven effective)
        };
        // comparisonCalculator already set to defaultWeightedComparison in constructor inheritance
    }
}

// Weighted comparison initialization is now handled directly in the IndividualName constructor above

/**
 * HouseholdName class - subclass of ComplexIdentifiers for household names
 * Used for compound names found in records and synthesized household names
 * This is a complex identifier that will be held within IdentifyingData
 * @param {AttributedTerm} primaryAlias - AttributedTerm containing the household name
 * @param {string} fullHouseholdName - Full household name from Bloomerang Field 21
 */
class HouseholdName extends ComplexIdentifiers {
    constructor(primaryAlias, fullHouseholdName = "") {
        super(primaryAlias);

        // Household name properties
        this.fullHouseholdName = fullHouseholdName;  // Field 21: Household Name from CSV
        this.memberNames = [];                       // Array of IndividualName objects - populated during processing
    }

    /**
     * Add an individual name to this household's member list
     * @param {IndividualName} individualName - IndividualName object to add to household
     */
    addMember(individualName) {
        // Check if individual is already in the household (by completeName)
        const existingMember = this.memberNames.find(
            member => member.completeName === individualName.completeName
        );

        if (!existingMember) {
            this.memberNames.push(individualName);
        }
    }

    /**
     * Remove an individual name from this household's member list
     * @param {IndividualName} individualName - IndividualName object to remove
     */
    removeMember(individualName) {
        this.memberNames = this.memberNames.filter(
            member => member.completeName !== individualName.completeName
        );
    }

    /**
     * Get list of all member names as strings
     * @returns {Array<string>} Array of complete names of household members
     */
    getMemberNameStrings() {
        return this.memberNames.map(member => member.completeName);
    }

    /**
     * Get household summary for display/debugging
     * @returns {Object} Summary of household information
     */
    getHouseholdSummary() {
        return {
            fullHouseholdName: this.fullHouseholdName,
            memberCount: this.memberNames.length,
            memberNames: this.getMemberNameStrings(),
            primaryAlias: this.primaryAlias.term
        };
    }

    /**
     * Check if this household has a specific member
     * @param {string} completeName - Complete name to check for
     * @returns {boolean} True if member found in household
     */
    hasMember(completeName) {
        return this.memberNames.some(member => member.completeName === completeName);
    }

    /**
     * Deserialize HouseholdName from JSON object
     * Handles both raw data and already-transformed instances (from deserializeWithTypes)
     * @param {Object} data - Serialized data
     * @returns {HouseholdName} Reconstructed HouseholdName instance
     */
    static deserialize(data) {
        if (data.type !== 'HouseholdName') {
            throw new Error('Invalid HouseholdName serialization format');
        }

        const primaryAlias = ensureDeserialized(data.primaryAlias, AttributedTerm);
        const householdName = new HouseholdName(primaryAlias, data.fullHouseholdName || data.fullName);  // Support both old and new format

        householdName.alternatives = ensureDeserialized(data.alternatives, Aliases);
        householdName.memberNames = data.memberNames.map(memberData =>
            ensureDeserialized(memberData, IndividualName)
        );

        return householdName;
    }
}

/**
 * FireNumberTerm class - specialized AttributedTerm for Block Island Fire Numbers
 * Extends AttributedTerm with Fire Number-specific validation and extraction methods
 */
class FireNumberTerm extends AttributedTerm {
    constructor(term, source, index, identifier) {
        super(term, source, index, identifier);
    }

    /**
     * Extract and validate Fire Number from the term
     * Fire Numbers are integers, 4 digits or less, < 3500
     * @returns {number|null} Valid Fire Number or null if invalid
     */
    extractFireNumber() {
        const numeric = this.extractNumeric();
        if (numeric !== null && this.isValidFireNumber()) {
            return numeric;
        }
        return null;
    }

    /**
     * Check if the term represents a valid Block Island Fire Number
     * @returns {boolean} True if valid Fire Number
     */
    isValidFireNumber() {
        const numeric = this.extractNumeric();
        if (numeric === null) return false;

        // Block Island Fire Number business rules:
        // - Must be positive integer
        // - Must be less than 3500
        // - Must be 4 digits or less
        return numeric > 0 && numeric < 3500 && numeric.toString().length <= 4;
    }

    /**
     * Deserialize FireNumberTerm from JSON object
     * @param {Object} data - Serialized data
     * @returns {FireNumberTerm} Reconstructed FireNumberTerm instance
     */
    static deserialize(data) {
        if (data.type !== 'FireNumberTerm') {
            throw new Error('Invalid FireNumberTerm serialization format');
        }

        const firstSource = data.sourceMap[0];
        const term = new FireNumberTerm(data.term, firstSource.source, firstSource.index, firstSource.identifier);

        for (let i = 1; i < data.sourceMap.length; i++) {
            const sourceData = data.sourceMap[i];
            term.addAdditionalSource(sourceData.source, sourceData.index, sourceData.identifier);
        }

        return term;
    }
}

/**
 * AccountNumberTerm class - specialized AttributedTerm for account numbers
 * Extends AttributedTerm with account-specific validation and extraction methods
 */
class AccountNumberTerm extends AttributedTerm {
    constructor(term, source, index, identifier) {
        super(term, source, index, identifier);
    }

    /**
     * Extract account number from the term
     * @returns {string|number|null} Account number or null if invalid
     */
    extractAccountNumber() {
        if (this.isValidAccount()) {
            return this.term;
        }
        return null;
    }

    /**
     * Check if the term represents a valid account number
     * @returns {boolean} True if valid account number
     */
    isValidAccount() {
        // Account number validation rules:
        // - Must not be empty/null/undefined
        // - Can be string or number
        // - Must contain at least one alphanumeric character
        if (this.term === null || this.term === undefined || this.term === '') {
            return false;
        }

        const termStr = this.term.toString();
        return /[a-zA-Z0-9]/.test(termStr);
    }

    /**
     * Deserialize AccountNumberTerm from JSON object
     * @param {Object} data - Serialized data
     * @returns {AccountNumberTerm} Reconstructed AccountNumberTerm instance
     */
    static deserialize(data) {
        if (data.type !== 'AccountNumberTerm') {
            throw new Error('Invalid AccountNumberTerm serialization format');
        }

        const firstSource = data.sourceMap[0];
        const term = new AccountNumberTerm(data.term, firstSource.source, firstSource.index, firstSource.identifier);

        for (let i = 1; i < data.sourceMap.length; i++) {
            const sourceData = data.sourceMap[i];
            term.addAdditionalSource(sourceData.source, sourceData.index, sourceData.identifier);
        }

        return term;
    }
}

/**
 * EmailTerm class - specialized AttributedTerm for email addresses
 * Extends AttributedTerm with email-specific validation and parsing methods
 */
class EmailTerm extends AttributedTerm {
    constructor(term, source, index, identifier) {
        super(term, source, index, identifier);
    }

    /**
     * Check if the term represents a valid email address
     * @returns {boolean} True if valid email format
     */
    isValidEmail() {
        if (typeof this.term !== 'string' || this.term === '') {
            return false;
        }

        // Basic email validation regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(this.term);
    }

    /**
     * Extract domain from email address
     * @returns {string|null} Domain portion of email or null if invalid
     */
    extractDomain() {
        if (!this.isValidEmail()) {
            return null;
        }

        const atIndex = this.term.indexOf('@');
        if (atIndex === -1) {
            return null;
        }

        return this.term.substring(atIndex + 1);
    }

    /**
     * Extract username from email address
     * @returns {string|null} Username portion of email or null if invalid
     */
    extractUsername() {
        if (!this.isValidEmail()) {
            return null;
        }

        const atIndex = this.term.indexOf('@');
        if (atIndex === -1) {
            return null;
        }

        return this.term.substring(0, atIndex);
    }

    /**
     * Deserialize EmailTerm from JSON object
     * @param {Object} data - Serialized data
     * @returns {EmailTerm} Reconstructed EmailTerm instance
     */
    static deserialize(data) {
        if (data.type !== 'EmailTerm') {
            throw new Error('Invalid EmailTerm serialization format');
        }

        const firstSource = data.sourceMap[0];
        const term = new EmailTerm(data.term, firstSource.source, firstSource.index, firstSource.identifier);

        for (let i = 1; i < data.sourceMap.length; i++) {
            const sourceData = data.sourceMap[i];
            term.addAdditionalSource(sourceData.source, sourceData.index, sourceData.identifier);
        }

        return term;
    }
}

/**
 * Address class - subclass of ComplexIdentifiers for address data
 * Contains multiple properties, each holding AttributedTerm for different address components
 * Supports Block Island specific functionality with fire number detection
 */
class Address extends ComplexIdentifiers {
    constructor(primaryAlias) {
        super(primaryAlias);

        // Original data preservation
        this.originalAddress = null;    // AttributedTerm for full unparsed address string
        this.recipientDetails = null;   // AttributedTerm for recipient info (C/O, business names, etc.)

        // Parsed components from parse-address library
        this.streetNumber = null;       // AttributedTerm for "123"
        this.streetName = null;         // AttributedTerm for "Main"
        this.streetType = null;         // AttributedTerm for "St"
        this.city = null;              // AttributedTerm for "Block Island"
        this.state = null;             // AttributedTerm for "RI"
        this.zipCode = null;           // AttributedTerm for "02807"

        // Special address components (when applicable)
        this.secUnitType = null;       // AttributedTerm for "PO Box", "Apt", etc.
        this.secUnitNum = null;        // AttributedTerm for unit numbers

        // Block Island specific metadata
        this.isBlockIslandAddress = null; // AttributedTerm for boolean flag
        this.cityNormalized = null;    // AttributedTerm for normalization flag
        this.biStreetName = null;      // StreetName object (only for BI addresses, Phase 4)

        // Processing metadata
        this.processingSource = null;   // AttributedTerm for "VisionAppraisal", "Bloomerang"
        this.processingTimestamp = null; // AttributedTerm for when parsed

        // Initialize weighted comparison with address component weights
        this.initializeWeightedComparison();
    }

    /**
     * Initialize weighted comparison configuration for Address matching
     * Uses addressWeightedComparison calculator which handles:
     * - PO Box addresses (conditional logic based on zip/secUnitNum)
     * - Block Island addresses (fire number-based comparison)
     * - General street addresses (standard weighted comparison)
     * Called from constructor to enable weighted Address.compareTo()
     */
    initializeWeightedComparison() {
        // Note: comparisonWeights is not used by addressWeightedComparison
        // The calculator implements its own conditional weighting logic
        // We set it here for documentation/inspection purposes
        this.comparisonWeights = {
            streetNumber: 'conditional',
            streetName: 'conditional',
            secUnitNum: 'conditional',
            city: 'conditional',
            state: 'conditional',
            zipCode: 'conditional'
        };
        this.comparisonCalculatorName = 'addressWeightedComparison';
        this.comparisonCalculator = window.resolveComparisonCalculator(this.comparisonCalculatorName);
    }

    /**
     * Get fire number if this is a Block Island address
     * Block Island street numbers ARE fire numbers
     * @returns {AttributedTerm|null} Fire number AttributedTerm or null if not BI address
     */
    getFireNumber() {
        if (this.isBlockIslandAddress &&
            this.isBlockIslandAddress.term === true &&
            this.streetNumber) {
            return this.streetNumber; // Same object reference
        }
        return null;
    }

    /**
     * Check if this address has a valid fire number
     * @returns {boolean} True if BI address with street number
     */
    hasFireNumber() {
        return this.getFireNumber() !== null;
    }

    /**
     * Get complete address summary for display and debugging
     * @returns {Object} Summary of all address components
     */
    getAddressSummary() {
        return {
            original: this.originalAddress ? this.originalAddress.term : null,
            street: this.getStreetDisplay(),
            city: this.city ? this.city.term : null,
            state: this.state ? this.state.term : null,
            zip: this.zipCode ? this.zipCode.term : null,
            isBlockIsland: this.isBlockIslandAddress ? this.isBlockIslandAddress.term : false,
            hasFireNumber: this.hasFireNumber(),
            fireNumber: this.hasFireNumber() ? this.getFireNumber().term : null,
            processingSource: this.processingSource ? this.processingSource.term : null
        };
    }

    /**
     * Get formatted street display
     * @returns {string} Formatted street address or null
     */
    getStreetDisplay() {
        const parts = [];
        if (this.streetNumber) parts.push(this.streetNumber.term);
        if (this.streetName) parts.push(this.streetName.term);
        if (this.streetType) parts.push(this.streetType.term);

        // Handle special units (PO Box, Apt, etc.)
        if (this.secUnitType) {
            parts.push(this.secUnitType.term);
            if (this.secUnitNum) parts.push(this.secUnitNum.term);
        }

        return parts.length > 0 ? parts.join(' ') : null;
    }

    /**
     * Create Address from processed address data
     * @param {Object} processedAddress - Output from processAddress() function
     * @param {string} fieldName - Field name for data lineage
     * @returns {Address} New Address instance
     */
    static fromProcessedAddress(processedAddress, fieldName) {
        if (!processedAddress || !processedAddress.original) {
            throw new Error('Invalid processed address data');
        }

        // Create primary alias from original address string
        const primaryAlias = new AttributedTerm(
            processedAddress.original,
            processedAddress.sourceType,
            fieldName,
            'original_address'
        );

        const address = new Address(primaryAlias);

        // Set original address (same as primaryAlias for consistency)
        address.originalAddress = primaryAlias;

        // Set recipient details if present
        if (processedAddress.recipientDetails) {
            address.recipientDetails = new AttributedTerm(
                processedAddress.recipientDetails,
                processedAddress.sourceType,
                fieldName,
                'recipient_details'
            );
        }

        // Create AttributedTerms for each component with proper data lineage
        if (processedAddress.number) {
            address.streetNumber = new AttributedTerm(
                processedAddress.number,
                processedAddress.sourceType,
                fieldName,
                'street_number'
            );
        }

        if (processedAddress.street) {
            address.streetName = new AttributedTerm(
                processedAddress.street,
                processedAddress.sourceType,
                fieldName,
                'street_name'
            );
        }

        if (processedAddress.type) {
            address.streetType = new AttributedTerm(
                processedAddress.type,
                processedAddress.sourceType,
                fieldName,
                'street_type'
            );
        }

        if (processedAddress.city) {
            address.city = new AttributedTerm(
                processedAddress.city,
                processedAddress.sourceType,
                fieldName,
                'city'
            );
        }

        if (processedAddress.state) {
            address.state = new AttributedTerm(
                processedAddress.state,
                processedAddress.sourceType,
                fieldName,
                'state'
            );
        }

        if (processedAddress.zip) {
            address.zipCode = new AttributedTerm(
                processedAddress.zip,
                processedAddress.sourceType,
                fieldName,
                'zip_code'
            );
        }

        if (processedAddress.secUnitType) {
            address.secUnitType = new AttributedTerm(
                processedAddress.secUnitType,
                processedAddress.sourceType,
                fieldName,
                'unit_type'
            );
        }

        if (processedAddress.secUnitNum) {
            address.secUnitNum = new AttributedTerm(
                processedAddress.secUnitNum,
                processedAddress.sourceType,
                fieldName,
                'unit_number'
            );
        }

        // Block Island metadata
        address.isBlockIslandAddress = new AttributedTerm(
            processedAddress.isBlockIslandAddress,
            processedAddress.sourceType,
            fieldName,
            'is_block_island'
        );

        address.cityNormalized = new AttributedTerm(
            processedAddress.cityNormalized || false,
            processedAddress.sourceType,
            fieldName,
            'city_normalized'
        );

        // Phase 4: Look up StreetName object for Block Island addresses
        // biStreetName links the parsed street to the canonical StreetName with alias awareness
        // Phase 6: Now uses the new individual-file StreetNameDatabase system
        if (processedAddress.isBlockIslandAddress &&
            window.streetNameDatabase &&
            typeof window.streetNameDatabase.lookup === 'function') {

            // Build street string to look up (combine street name + type if available)
            let streetToLookup = processedAddress.street || '';
            if (processedAddress.type) {
                // Only append type if street doesn't already contain it (handles parse-address quirk)
                // parse-address sometimes returns full word in street (e.g., "CENTER ROAD")
                // and abbreviation in type (e.g., "RD"), causing duplication if we blindly append
                const streetUpper = streetToLookup.toUpperCase();
                const typeUpper = processedAddress.type.toUpperCase();

                // Get the full form for this type (e.g., BCH → BEACH, RD → ROAD)
                const fullForm = (typeof StreetTypeAbbreviationManager !== 'undefined' &&
                                  StreetTypeAbbreviationManager.isLoaded)
                    ? (StreetTypeAbbreviationManager.getFullForm(typeUpper) || typeUpper)
                    : typeUpper;

                // Split street on whitespace AND punctuation to get individual words
                const streetWords = streetUpper.split(/[\s.,;:!?'"-]+/).filter(w => w.length > 0);

                // Check if street already contains this type (as abbreviation or full form)
                const alreadyHasType =
                    streetWords.includes(typeUpper) ||      // Contains the abbreviation (e.g., "BCH")
                    streetWords.includes(fullForm) ||       // Contains the full form (e.g., "BEACH")
                    (typeof StreetTypeAbbreviationManager !== 'undefined' &&
                     StreetTypeAbbreviationManager.isLoaded &&
                     StreetTypeAbbreviationManager.endsWithStreetType(streetToLookup));  // Ends with any known type

                if (!alreadyHasType) {
                    streetToLookup = `${streetToLookup} ${processedAddress.type}`.trim();
                }
            }

            if (streetToLookup) {
                // Try lookup with full street + type first
                let matchedStreetName = window.streetNameDatabase.lookup(streetToLookup);

                // If no match, try just the street name without type
                if (!matchedStreetName && processedAddress.street) {
                    matchedStreetName = window.streetNameDatabase.lookup(processedAddress.street);
                }

                if (matchedStreetName) {
                    address.biStreetName = matchedStreetName;
                } else if (address.streetName) {
                    // No match in BI database - create fallback StreetName using raw street name
                    // This preserves pre-Phase 5 comparison behavior for unmatched streets
                    address.biStreetName = new StreetName(address.streetName);

                    // Record unmatched street with best-match information for analysis
                    if (window.unmatchedStreetTracker && window.unmatchedStreetTracker.isActive &&
                        window.streetNameDatabase && typeof window.streetNameDatabase.getAllObjects === 'function') {

                        let bestMatch = null;
                        let bestScores = null;
                        let bestOverallScore = 0;
                        let bestAlias = '';

                        // Search all streets for the closest match
                        const allStreets = window.streetNameDatabase.getAllObjects();
                        for (const street of allStreets) {
                            const scores = street.compareTo(streetToLookup);

                            // Find best score across categories (exclude synonym - unverified)
                            const candidateScores = [
                                { score: scores.primary, alias: street.primaryAlias?.term || '' },
                                { score: scores.homonym, alias: 'homonym' },
                                { score: scores.candidate, alias: 'candidate' }
                            ].filter(s => s.score >= 0);

                            for (const candidate of candidateScores) {
                                if (candidate.score > bestOverallScore) {
                                    bestOverallScore = candidate.score;
                                    bestMatch = street;
                                    bestScores = scores;
                                    // Get the actual alias term that matched best
                                    if (candidate.alias === 'homonym' && street.alternatives?.homonyms?.length > 0) {
                                        bestAlias = street.alternatives.homonyms[0]?.term || street.primaryAlias?.term || '';
                                    } else if (candidate.alias === 'candidate' && street.alternatives?.candidates?.length > 0) {
                                        bestAlias = street.alternatives.candidates[0]?.term || street.primaryAlias?.term || '';
                                    } else {
                                        bestAlias = street.primaryAlias?.term || '';
                                    }
                                }
                            }
                        }

                        // Record the unmatched street
                        window.unmatchedStreetTracker.record(
                            streetToLookup,
                            bestMatch,
                            bestScores,
                            bestOverallScore,
                            bestAlias
                        );
                    }
                }
            }
        }

        // Processing metadata
        address.processingSource = new AttributedTerm(
            processedAddress.sourceType,
            processedAddress.sourceType,
            fieldName,
            'processing_source'
        );

        address.processingTimestamp = new AttributedTerm(
            processedAddress.processedAt || new Date().toISOString(),
            processedAddress.sourceType,
            fieldName,
            'processing_timestamp'
        );

        return address;
    }

    /**
     * Deserialize Address from JSON object
     * Uses dynamic property iteration (like Entity.deserialize) to automatically
     * handle new properties without requiring manual updates to this method.
     * @param {Object} data - Serialized data
     * @returns {Address} Reconstructed Address instance
     */
    static deserialize(data) {
        if (data.type !== 'Address') {
            throw new Error('Invalid Address serialization format');
        }

        const primaryAlias = ensureDeserialized(data.primaryAlias, AttributedTerm);
        const address = new Address(primaryAlias);

        // Type mappings for properties that need ensureDeserialized with specific types
        const attributedTermProps = new Set([
            'originalAddress', 'recipientDetails', 'streetNumber', 'streetName',
            'streetType', 'city', 'state', 'zipCode', 'secUnitType', 'secUnitNum',
            'isBlockIslandAddress', 'cityNormalized', 'processingSource', 'processingTimestamp'
        ]);

        // Iterate over all properties in serialized data
        Object.keys(data).forEach(key => {
            // Skip type marker and constructor param (already handled)
            if (key === 'type' || key === 'primaryAlias') {
                return;
            }
            // Skip function references that cannot be serialized
            if (key === 'comparisonCalculator') {
                return;
            }
            // Handle null/undefined
            if (data[key] === null || data[key] === undefined) {
                address[key] = null;
                return;
            }

            // Handle comparison calculator name - resolve to function
            if (key === 'comparisonCalculatorName') {
                address.comparisonCalculatorName = data[key];
                address.comparisonCalculator = window.resolveComparisonCalculator(data[key]);
            }
            // Handle alternatives (Aliases type)
            else if (key === 'alternatives') {
                address.alternatives = ensureDeserialized(data[key], Aliases);
            }
            // Handle biStreetName (StreetName type)
            else if (key === 'biStreetName') {
                address.biStreetName = ensureDeserialized(data[key], StreetName);
            }
            // Handle AttributedTerm properties
            else if (attributedTermProps.has(key)) {
                address[key] = ensureDeserialized(data[key], AttributedTerm);
            }
            // Handle comparisonWeights (plain object)
            else if (key === 'comparisonWeights') {
                address.comparisonWeights = data[key];
            }
            // All other properties - direct assignment (future-proofing)
            else {
                address[key] = data[key];
            }
        });

        return address;
    }

    /**
     * String representation for debugging
     * @returns {string} Formatted address string
     */
    toString() {
        const summary = this.getAddressSummary();
        const street = summary.street || 'No street';
        const location = [summary.city, summary.state, summary.zip].filter(Boolean).join(', ') || 'No location';
        const fireNum = summary.hasFireNumber ? ` (Fire #${summary.fireNumber})` : '';
        return `Address: ${street}, ${location}${fireNum}`;
    }

    /**
     * Address-specific compareTo override using generic utility with exclusions
     * Uses dynamic property iteration with automatic compareTo detection
     * @param {Address} other - Other Address to compare
     * @returns {number} 0 if addresses match, non-zero if different
     * @throws {Error} If comparing with non-Address object or if utility not available
     */
    compareTo(other) {
        // Check if generic utility is available
        if (typeof genericObjectCompareTo === 'function') {
            // Address-specific exclusions (properties that shouldn't affect address matching)
            var addressExclusions = [
                'processingTimestamp',  // Processing metadata shouldn't affect matching
                'processingSource',     // Processing metadata shouldn't affect matching
                'recipientDetails'      // Recipient info shouldn't affect address matching
            ];

            // Use generic utility with Address-specific exclusions
            // This will automatically compare all Address properties using their compareTo methods
            return genericObjectCompareTo(this, other, addressExclusions);
        } else {
            // Clear error message if dependency missing
            throw new Error('genericObjectCompareTo utility not available - ensure utils.js is loaded first');
        }
    }
}

// Export classes and constants for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DATA_SOURCES,
        AttributedTerm,
        FireNumberTerm,
        AccountNumberTerm,
        EmailTerm,
        Aliases,
        Aliased,
        SimpleIdentifiers,
        IndicativeData,
        IdentifyingData,
        FireNumber,
        PoBox,
        PID,
        StreetName,
        ComplexIdentifiers,
        IndividualName,
        HouseholdName,
        Address
    };
}

// Also export to global scope for browser use
if (typeof window !== 'undefined') {
    window.DATA_SOURCES = DATA_SOURCES;
    window.AttributedTerm = AttributedTerm;
    window.FireNumberTerm = FireNumberTerm;
    window.AccountNumberTerm = AccountNumberTerm;
    window.EmailTerm = EmailTerm;
    window.Aliases = Aliases;
    window.Aliased = Aliased;
    window.SimpleIdentifiers = SimpleIdentifiers;
    window.IndicativeData = IndicativeData;
    window.IdentifyingData = IdentifyingData;
    window.FireNumber = FireNumber;
    window.PoBox = PoBox;
    window.PID = PID;
    window.StreetName = StreetName;
    window.ComplexIdentifiers = ComplexIdentifiers;
    window.IndividualName = IndividualName;
    window.HouseholdName = HouseholdName;
    window.Address = Address;
}