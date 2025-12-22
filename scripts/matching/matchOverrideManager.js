/**
 * matchOverrideManager.js
 *
 * Manual Match Override System
 *
 * Provides data structures and logic for:
 * - FORCE_MATCH rules: Ensure specific entity pairs end up in the same group
 * - FORCE_EXCLUDE rules: Prevent specific entity pairs from being in the same group
 *
 * Implements the 8-step algorithm for group building with priority hierarchy:
 * - Founder-forced > Natural matches > Forced-from-naturals
 *
 * See reference_matchOverrideSystem.md for complete specification.
 *
 * Created: December 18, 2025
 * Updated: December 18, 2025 (Session 6) - 8-step algorithm helpers
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const ON_CONFLICT_OPTIONS = {
    DEFECTIVE_YIELDS: 'DEFECTIVE_YIELDS',  // Defective entity is blocked (default)
    OTHER_YIELDS: 'OTHER_YIELDS',           // Other entity is blocked
    USE_SIMILARITY: 'USE_SIMILARITY'        // Compare scores, lower score blocked
};

// ============================================================================
// FORCE_MATCH RULE CLASS
// ============================================================================

class ForceMatchRule {
    constructor(config) {
        this.ruleId = config.ruleId;
        this.ruleType = 'FORCE_MATCH';
        this.entityKey1 = config.entityKey1;
        this.entityKey2 = config.entityKey2;
        this.anchorOverride = config.anchorOverride || null;
        this.reason = config.reason || '';
        this.status = config.status || 'ACTIVE';
    }

    validate() {
        const errors = [];
        if (!this.entityKey1) errors.push('entityKey1 required');
        if (!this.entityKey2) errors.push('entityKey2 required');
        if (this.entityKey1 === this.entityKey2) errors.push('keys cannot be same');
        return { valid: errors.length === 0, errors };
    }

    involvesKey(key) {
        return this.entityKey1 === key || this.entityKey2 === key;
    }

    getPartnerKey(key) {
        if (this.entityKey1 === key) return this.entityKey2;
        if (this.entityKey2 === key) return this.entityKey1;
        return null;
    }

    toString() {
        return `ForceMatchRule[${this.ruleId}]: ${this.entityKey1} <-> ${this.entityKey2}`;
    }
}

// ============================================================================
// FORCE_EXCLUDE RULE CLASS
// ============================================================================

class ForceExcludeRule {
    static VALID_ON_CONFLICT = ['DEFECTIVE_YIELDS', 'OTHER_YIELDS', 'USE_SIMILARITY'];

    constructor(config) {
        this.ruleId = config.ruleId;
        this.ruleType = 'FORCE_EXCLUDE';
        this.defectiveKey = config.defectiveKey;
        this.otherKey = config.otherKey;
        this.onConflict = config.onConflict || 'DEFECTIVE_YIELDS';
        this.reason = config.reason || '';
        this.status = config.status || 'ACTIVE';
    }

    validate() {
        const errors = [];
        if (!this.defectiveKey) errors.push('defectiveKey required');
        if (!this.otherKey) errors.push('otherKey required');
        if (this.defectiveKey === this.otherKey) errors.push('keys cannot be same');
        if (!ForceExcludeRule.VALID_ON_CONFLICT.includes(this.onConflict)) {
            errors.push('invalid onConflict');
        }
        return { valid: errors.length === 0, errors };
    }

    involvesKey(key) {
        return this.defectiveKey === key || this.otherKey === key;
    }

    matchesPair(key1, key2) {
        return (this.defectiveKey === key1 && this.otherKey === key2) ||
               (this.defectiveKey === key2 && this.otherKey === key1);
    }

    /**
     * Determine which entity should yield (be removed) in a conflict.
     * @param {string} key1 - First entity key in conflict
     * @param {string} key2 - Second entity key in conflict
     * @param {number} [score1] - Score of key1 (for USE_SIMILARITY)
     * @param {number} [score2] - Score of key2 (for USE_SIMILARITY)
     * @returns {string} - The key that should yield (be removed)
     */
    determineLoser(key1, key2, score1 = null, score2 = null) {
        switch (this.onConflict) {
            case 'DEFECTIVE_YIELDS':
                return this.defectiveKey;

            case 'OTHER_YIELDS':
                return this.otherKey;

            case 'USE_SIMILARITY':
                if (score1 === null || score2 === null) {
                    console.warn(`[OVERRIDE] Rule ${this.ruleId}: USE_SIMILARITY but scores not provided, defaulting to DEFECTIVE_YIELDS`);
                    return this.defectiveKey;
                }
                // Lower score loses; tie goes to defective
                if (score1 < score2) return key1;
                if (score2 < score1) return key2;
                return this.defectiveKey; // Tie-breaker

            default:
                return this.defectiveKey;
        }
    }

    toString() {
        return `ForceExcludeRule[${this.ruleId}]: ${this.defectiveKey} ≠ ${this.otherKey} (${this.onConflict})`;
    }
}

// ============================================================================
// MATCH OVERRIDE MANAGER CLASS
// ============================================================================

class MatchOverrideManager {
    constructor() {
        this.forceMatchRules = [];
        this.forceExcludeRules = [];
        this.exclusionLookup = new Map();  // Key -> Map(partnerKey -> ruleMetadata)
        this.forceMatchSchedule = new Map();  // AnchorKey -> { dependents, anchorPhase, ruleIds }
        this.forceMatchByKey = new Map();  // Key -> [ForceMatchRule]

        // MUTUAL set data structures
        // Each mutual set is an array of keys that are all mutually related
        this.mutualExclusionSets = [];  // Array of { ruleId, keys: string[] }
        this.mutualInclusionSets = [];  // Array of { ruleId, keys: string[] }
        // Quick lookup: key -> array of set indices containing this key
        this.keyToMutualExclusionSetIndices = new Map();  // Key -> [setIndex, ...]
        this.keyToMutualInclusionSetIndices = new Map();  // Key -> [setIndex, ...]

        this.warnings = [];
        this.applicationLog = [];
        this.stats = {
            forceMatchesApplied: 0,
            exclusionsApplied: 0,
            orphanedRules: 0,
            errors: 0
        };
    }

    // -------------------------------------------------------------------------
    // Rule Loading
    // -------------------------------------------------------------------------

    addForceMatchRule(data) {
        const rule = data instanceof ForceMatchRule ? data : new ForceMatchRule(data);
        const validation = rule.validate();
        if (!validation.valid) {
            return { success: false, errors: validation.errors };
        }
        this.forceMatchRules.push(rule);

        // Index by both keys for fast lookup
        if (!this.forceMatchByKey.has(rule.entityKey1)) {
            this.forceMatchByKey.set(rule.entityKey1, []);
        }
        this.forceMatchByKey.get(rule.entityKey1).push(rule);

        if (!this.forceMatchByKey.has(rule.entityKey2)) {
            this.forceMatchByKey.set(rule.entityKey2, []);
        }
        this.forceMatchByKey.get(rule.entityKey2).push(rule);

        return { success: true, errors: [] };
    }

    addForceExcludeRule(data) {
        const rule = data instanceof ForceExcludeRule ? data : new ForceExcludeRule(data);
        const validation = rule.validate();
        if (!validation.valid) {
            return { success: false, errors: validation.errors };
        }
        this.forceExcludeRules.push(rule);
        this._addToExclusionLookup(rule);
        return { success: true, errors: [] };
    }

    _addToExclusionLookup(rule) {
        const metadata = {
            defectiveKey: rule.defectiveKey,
            otherKey: rule.otherKey,
            onConflict: rule.onConflict,
            ruleId: rule.ruleId,
            rule: rule  // Keep reference to full rule
        };

        // Bidirectional lookup
        if (!this.exclusionLookup.has(rule.defectiveKey)) {
            this.exclusionLookup.set(rule.defectiveKey, new Map());
        }
        this.exclusionLookup.get(rule.defectiveKey).set(rule.otherKey, metadata);

        if (!this.exclusionLookup.has(rule.otherKey)) {
            this.exclusionLookup.set(rule.otherKey, new Map());
        }
        this.exclusionLookup.get(rule.otherKey).set(rule.defectiveKey, metadata);
    }

    /**
     * Add a MUTUAL exclusion set.
     * All keys in the set are mutually excluded from each other.
     *
     * @param {Object} data - { ruleId, keys: string[] } or { ruleId, keysDelimited: string }
     * @returns {Object} { success, errors, keyCount }
     */
    addMutualExclusionSet(data) {
        const errors = [];
        let keys = data.keys;

        // Parse delimited string if provided
        if (!keys && data.keysDelimited) {
            keys = data.keysDelimited.split('::^::').map(k => k.trim()).filter(k => k);
        }

        if (!keys || keys.length < 2) {
            errors.push('MUTUAL exclusion set requires at least 2 keys');
            return { success: false, errors, keyCount: 0 };
        }

        const ruleId = data.ruleId || `MUTUAL-FE-${this.mutualExclusionSets.length + 1}`;
        const setIndex = this.mutualExclusionSets.length;

        // Store the set
        this.mutualExclusionSets.push({ ruleId, keys });

        // Index each key to this set
        for (const key of keys) {
            if (!this.keyToMutualExclusionSetIndices.has(key)) {
                this.keyToMutualExclusionSetIndices.set(key, []);
            }
            this.keyToMutualExclusionSetIndices.get(key).push(setIndex);
        }

        console.log(`[OVERRIDE] Added MUTUAL exclusion set ${ruleId} with ${keys.length} keys`);
        return { success: true, errors: [], keyCount: keys.length };
    }

    /**
     * Add a MUTUAL inclusion (force-match) set.
     * All keys in the set should be forced into the same group.
     *
     * @param {Object} data - { ruleId, keys: string[] } or { ruleId, keysDelimited: string }
     * @returns {Object} { success, errors, keyCount }
     */
    addMutualInclusionSet(data) {
        const errors = [];
        let keys = data.keys;

        // Parse delimited string if provided
        if (!keys && data.keysDelimited) {
            keys = data.keysDelimited.split('::^::').map(k => k.trim()).filter(k => k);
        }

        if (!keys || keys.length < 2) {
            errors.push('MUTUAL inclusion set requires at least 2 keys');
            return { success: false, errors, keyCount: 0 };
        }

        const ruleId = data.ruleId || `MUTUAL-FM-${this.mutualInclusionSets.length + 1}`;
        const setIndex = this.mutualInclusionSets.length;

        // Store the set
        this.mutualInclusionSets.push({ ruleId, keys });

        // Index each key to this set
        for (const key of keys) {
            if (!this.keyToMutualInclusionSetIndices.has(key)) {
                this.keyToMutualInclusionSetIndices.set(key, []);
            }
            this.keyToMutualInclusionSetIndices.get(key).push(setIndex);
        }

        console.log(`[OVERRIDE] Added MUTUAL inclusion set ${ruleId} with ${keys.length} keys`);
        return { success: true, errors: [], keyCount: keys.length };
    }

    loadRules(rules) {
        const errors = [];
        let loaded = 0;

        if (rules.forceMatches) {
            for (const data of rules.forceMatches) {
                const result = this.addForceMatchRule(data);
                if (result.success) {
                    loaded++;
                } else {
                    errors.push(`${data.ruleId}: ${result.errors.join(', ')}`);
                }
            }
        }

        if (rules.forceExcludes) {
            for (const data of rules.forceExcludes) {
                const result = this.addForceExcludeRule(data);
                if (result.success) {
                    loaded++;
                } else {
                    errors.push(`${data.ruleId}: ${result.errors.join(', ')}`);
                }
            }
        }

        console.log(`[OVERRIDE] Loaded ${loaded} rules`);
        return { loaded, errors };
    }

    clear() {
        this.forceMatchRules = [];
        this.forceExcludeRules = [];
        this.exclusionLookup.clear();
        this.forceMatchSchedule.clear();
        this.forceMatchByKey.clear();

        // Clear MUTUAL set structures
        this.mutualExclusionSets = [];
        this.mutualInclusionSets = [];
        this.keyToMutualExclusionSetIndices.clear();
        this.keyToMutualInclusionSetIndices.clear();

        this.warnings = [];
        this.applicationLog = [];
        this.stats = {
            forceMatchesApplied: 0,
            exclusionsApplied: 0,
            orphanedRules: 0,
            errors: 0
        };
    }

    // -------------------------------------------------------------------------
    // Lookup Methods (for 8-step algorithm)
    // -------------------------------------------------------------------------

    /**
     * Get all entity keys that should be force-matched to the given key.
     * Used in Steps 3 and 6 of the algorithm.
     * Checks both pairwise rules and MUTUAL inclusion sets.
     *
     * @param {string} key - Entity key
     * @returns {string[]} - Array of entity keys that should be forced into same group
     */
    getForceMatchesFor(key) {
        const result = [];

        // First get pairwise force-match rules
        const rules = this.forceMatchByKey.get(key) || [];
        for (const rule of rules) {
            if (rule.status !== 'ACTIVE') continue;
            const otherKey = rule.getPartnerKey(key);
            if (otherKey && !result.includes(otherKey)) {
                result.push(otherKey);
            }
        }

        // Then get MUTUAL inclusion set members
        const setIndices = this.keyToMutualInclusionSetIndices.get(key);
        if (setIndices && setIndices.length > 0) {
            for (const idx of setIndices) {
                const mutualSet = this.mutualInclusionSets[idx];
                for (const memberKey of mutualSet.keys) {
                    // Don't include self, and avoid duplicates
                    if (memberKey !== key && !result.includes(memberKey)) {
                        result.push(memberKey);
                    }
                }
            }
        }

        return result;
    }

    /**
     * Check if two keys have an exclusion between them.
     * Checks both pairwise rules and MUTUAL exclusion sets.
     * @param {string} key1
     * @param {string} key2
     * @returns {boolean}
     */
    isExcludedPair(key1, key2) {
        // First check pairwise exclusion rules
        const partners = this.exclusionLookup.get(key1);
        if (partners && partners.has(key2)) {
            return true;
        }

        // Then check MUTUAL exclusion sets
        const setIndices1 = this.keyToMutualExclusionSetIndices.get(key1);
        if (!setIndices1 || setIndices1.length === 0) {
            return false;  // key1 not in any mutual exclusion set
        }

        const setIndices2 = this.keyToMutualExclusionSetIndices.get(key2);
        if (!setIndices2 || setIndices2.length === 0) {
            return false;  // key2 not in any mutual exclusion set
        }

        // Check if they share any common set
        for (const idx of setIndices1) {
            if (setIndices2.includes(idx)) {
                return true;  // Both in same mutual exclusion set
            }
        }

        return false;
    }

    /**
     * Get the exclusion rule metadata between two keys.
     * Checks both pairwise rules and MUTUAL exclusion sets.
     * @param {string} key1
     * @param {string} key2
     * @returns {Object|null} - Rule metadata or null
     */
    getExclusionRule(key1, key2) {
        // First check pairwise exclusion rules
        const partners = this.exclusionLookup.get(key1);
        if (partners && partners.has(key2)) {
            return partners.get(key2);
        }

        // Then check MUTUAL exclusion sets
        const setIndices1 = this.keyToMutualExclusionSetIndices.get(key1);
        if (!setIndices1 || setIndices1.length === 0) {
            return null;
        }

        const setIndices2 = this.keyToMutualExclusionSetIndices.get(key2);
        if (!setIndices2 || setIndices2.length === 0) {
            return null;
        }

        // Find the common set and return synthetic metadata
        for (const idx of setIndices1) {
            if (setIndices2.includes(idx)) {
                const mutualSet = this.mutualExclusionSets[idx];
                // Return synthetic rule metadata for MUTUAL exclusion
                // For MUTUAL sets, both keys are symmetric - no defective/other distinction
                // Default to DEFECTIVE_YIELDS behavior (first key in pair yields)
                return {
                    defectiveKey: key1,
                    otherKey: key2,
                    onConflict: 'DEFECTIVE_YIELDS',
                    ruleId: mutualSet.ruleId,
                    isMutual: true,
                    mutualSetIndex: idx,
                    rule: {
                        ruleId: mutualSet.ruleId,
                        ruleType: 'MUTUAL_EXCLUDE',
                        onConflict: 'DEFECTIVE_YIELDS',
                        determineLoser: (k1, k2, score1, score2) => {
                            // For MUTUAL sets, use similarity scores if available
                            if (score1 !== null && score2 !== null) {
                                if (score1 < score2) return k1;
                                if (score2 < score1) return k2;
                            }
                            // Default: first key loses (arbitrary but consistent)
                            return k1;
                        }
                    }
                };
            }
        }

        return null;
    }

    /**
     * Get all keys that a given key is excluded from.
     * @param {string} key
     * @returns {string[]}
     */
    getExclusionPartners(key) {
        const partners = this.exclusionLookup.get(key);
        return partners ? Array.from(partners.keys()) : [];
    }

    // -------------------------------------------------------------------------
    // 8-Step Algorithm Helper Methods
    // -------------------------------------------------------------------------

    /**
     * Step 2: Resolve exclusions among a list of entities with priority consideration.
     * If one entity is in the priority list (founder-forced), it wins automatically.
     * Otherwise, OnConflict rules apply.
     *
     * @param {Array<{key: string, score?: number}>} entities - List with keys and optional scores
     * @param {string[]} priorityKeys - Keys that have priority (founder force-match list)
     * @returns {Array<{key: string, score?: number}>} - Filtered list with losers removed
     */
    resolveExclusionsWithPriority(entities, priorityKeys = []) {
        const toRemove = new Set();

        for (let i = 0; i < entities.length; i++) {
            if (toRemove.has(entities[i].key)) continue;

            for (let j = i + 1; j < entities.length; j++) {
                if (toRemove.has(entities[j].key)) continue;

                const key1 = entities[i].key;
                const key2 = entities[j].key;

                const ruleMeta = this.getExclusionRule(key1, key2);
                if (!ruleMeta) continue;

                // Check priority: if one is in priorityKeys, it wins
                const key1Priority = priorityKeys.includes(key1);
                const key2Priority = priorityKeys.includes(key2);

                let loser;
                let reason;

                if (key1Priority && !key2Priority) {
                    loser = key2;
                    reason = `${key1} has founder-forced priority`;
                } else if (key2Priority && !key1Priority) {
                    loser = key1;
                    reason = `${key2} has founder-forced priority`;
                } else {
                    // Same priority tier - use OnConflict rules
                    loser = ruleMeta.rule.determineLoser(
                        key1, key2,
                        entities[i].score,
                        entities[j].score
                    );
                    reason = ruleMeta.onConflict;
                }

                toRemove.add(loser);
                this.stats.exclusionsApplied++;
                console.log(`[OVERRIDE] Step 2 exclusion ${ruleMeta.ruleId}: ${loser} removed (${reason})`);
            }
        }

        return entities.filter(e => !toRemove.has(e.key));
    }

    /**
     * Steps 4 & 8: Resolve exclusions among a list of keys using OnConflict rules only.
     * All keys are same tier, so only OnConflict determines winner.
     *
     * @param {string[]} keys - List of entity keys
     * @param {Map<string, number>} [scores] - Optional map of key -> score for USE_SIMILARITY
     * @returns {string[]} - Filtered list with losers removed
     */
    resolveExclusionsOnConflict(keys, scores = new Map()) {
        const toRemove = new Set();

        for (let i = 0; i < keys.length; i++) {
            if (toRemove.has(keys[i])) continue;

            for (let j = i + 1; j < keys.length; j++) {
                if (toRemove.has(keys[j])) continue;

                const key1 = keys[i];
                const key2 = keys[j];

                const ruleMeta = this.getExclusionRule(key1, key2);
                if (!ruleMeta) continue;

                const loser = ruleMeta.rule.determineLoser(
                    key1, key2,
                    scores.get(key1),
                    scores.get(key2)
                );

                toRemove.add(loser);
                this.stats.exclusionsApplied++;
                console.log(`[OVERRIDE] OnConflict exclusion ${ruleMeta.ruleId}: ${loser} removed (${ruleMeta.onConflict})`);
            }
        }

        return keys.filter(k => !toRemove.has(k));
    }

    /**
     * Steps 5 & 7: Remove entities that have exclusions with any priority key.
     * Priority keys always win - the other entity is removed.
     *
     * @param {Array<{key: string}>} entities - Entities to filter
     * @param {string[]} priorityKeys - Keys with priority (founder-forced)
     * @returns {Array<{key: string}>} - Filtered list
     */
    removeExcludedByPriority(entities, priorityKeys) {
        const toRemove = new Set();

        for (const entity of entities) {
            for (const priorityKey of priorityKeys) {
                const ruleMeta = this.getExclusionRule(entity.key, priorityKey);
                if (ruleMeta) {
                    toRemove.add(entity.key);
                    this.stats.exclusionsApplied++;
                    console.log(`[OVERRIDE] Priority exclusion ${ruleMeta.ruleId}: ${entity.key} removed (priority ${priorityKey} wins)`);
                    break;
                }
            }
        }

        return entities.filter(e => !toRemove.has(e.key));
    }

    /**
     * Steps 5 & 7 variant: Filter string array of keys.
     *
     * @param {string[]} keys - Keys to filter
     * @param {string[]} priorityKeys - Keys with priority
     * @returns {string[]} - Filtered keys
     */
    removeExcludedKeysByPriority(keys, priorityKeys) {
        const toRemove = new Set();

        for (const key of keys) {
            for (const priorityKey of priorityKeys) {
                const ruleMeta = this.getExclusionRule(key, priorityKey);
                if (ruleMeta) {
                    toRemove.add(key);
                    this.stats.exclusionsApplied++;
                    console.log(`[OVERRIDE] Priority exclusion ${ruleMeta.ruleId}: ${key} removed (priority ${priorityKey} wins)`);
                    break;
                }
            }
        }

        return keys.filter(k => !toRemove.has(k));
    }

    /**
     * Remove entities that have any exclusion with a specific key (e.g., the founder).
     * The specified key always wins - entities excluded with it are removed.
     * Used for Step 0 and Step 7.5 (founder exclusion checks).
     *
     * @param {Array<{key: string}>} entities - Entities to filter
     * @param {string} founderKey - The founder key to check exclusions against
     * @returns {Array<{key: string}>} - Filtered list
     */
    removeExcludedWithFounder(entities, founderKey) {
        const toRemove = new Set();

        for (const entity of entities) {
            const ruleMeta = this.getExclusionRule(entity.key, founderKey);
            if (ruleMeta) {
                toRemove.add(entity.key);
                this.stats.exclusionsApplied++;
                // No log per spec - founder exclusions are silent
            }
        }

        return entities.filter(e => !toRemove.has(e.key));
    }

    /**
     * Remove keys that have any exclusion with a specific key (e.g., the founder).
     * String array variant of removeExcludedWithFounder.
     * Used for Step 7.5 (founder exclusion checks on forcedFromNaturals).
     *
     * @param {string[]} keys - Keys to filter
     * @param {string} founderKey - The founder key to check exclusions against
     * @returns {string[]} - Filtered keys
     */
    removeExcludedKeysWithFounder(keys, founderKey) {
        const toRemove = new Set();

        for (const key of keys) {
            const ruleMeta = this.getExclusionRule(key, founderKey);
            if (ruleMeta) {
                toRemove.add(key);
                this.stats.exclusionsApplied++;
                // No log per spec - founder exclusions are silent
            }
        }

        return keys.filter(k => !toRemove.has(k));
    }

    /**
     * Filter out keys that have an exclusion with the founder, logging a warning
     * for the contradiction (entity is both force-matched AND excluded with founder).
     * Used for Step 3.5.
     *
     * @param {string[]} founderForcedKeys - Keys that founder wants to force-match
     * @param {string} founderKey - The founder key
     * @returns {string[]} - Filtered keys (contradictions removed)
     */
    removeContradictoryFounderForced(founderForcedKeys, founderKey) {
        const toRemove = new Set();

        for (const key of founderForcedKeys) {
            const ruleMeta = this.getExclusionRule(key, founderKey);
            if (ruleMeta) {
                toRemove.add(key);
                this.stats.exclusionsApplied++;
                console.warn(`[OVERRIDE] Contradiction: ${founderKey} has both FORCE_MATCH and FORCE_EXCLUDE with ${key}. Exclusion wins (${ruleMeta.ruleId}).`);
            }
        }

        return founderForcedKeys.filter(k => !toRemove.has(k));
    }

    // -------------------------------------------------------------------------
    // Validation and Schedule Building
    // -------------------------------------------------------------------------

    validateRules(entityDb) {
        const errors = [];
        let valid = 0;
        let orphaned = 0;

        for (const rule of this.forceMatchRules) {
            const key1Exists = entityDb.entities && entityDb.entities[rule.entityKey1];
            const key2Exists = entityDb.entities && entityDb.entities[rule.entityKey2];

            if (!key1Exists || !key2Exists) {
                rule.status = 'ORPHANED';
                orphaned++;
                this.stats.orphanedRules++;
            } else {
                valid++;
            }
        }

        for (const rule of this.forceExcludeRules) {
            const defExists = entityDb.entities && entityDb.entities[rule.defectiveKey];
            const otherExists = entityDb.entities && entityDb.entities[rule.otherKey];

            if (!defExists || !otherExists) {
                rule.status = 'ORPHANED';
                orphaned++;
                this.stats.orphanedRules++;
            } else {
                valid++;
            }
        }

        // Check for contradictions
        for (const fmRule of this.forceMatchRules) {
            for (const feRule of this.forceExcludeRules) {
                if (feRule.matchesPair(fmRule.entityKey1, fmRule.entityKey2)) {
                    errors.push(`Contradiction: ${fmRule.ruleId} vs ${feRule.ruleId}`);
                    fmRule.status = 'ERROR';
                    feRule.status = 'ERROR';
                    this.stats.errors++;
                }
            }
        }

        console.log(`[OVERRIDE] Validation: ${valid} valid, ${orphaned} orphaned, ${errors.length} errors`);
        return { valid, orphaned, errors };
    }

    buildForceMatchSchedule(entityDb) {
        this.forceMatchSchedule.clear();

        for (const rule of this.forceMatchRules) {
            if (rule.status === 'ORPHANED' || rule.status === 'ERROR') continue;

            const { anchor, dependent, anchorPhase } = determineAnchor(
                rule.entityKey1,
                rule.entityKey2,
                rule.anchorOverride,
                entityDb
            );

            if (!this.forceMatchSchedule.has(anchor)) {
                this.forceMatchSchedule.set(anchor, {
                    dependents: [],
                    anchorPhase,
                    ruleIds: []
                });
            }

            const schedule = this.forceMatchSchedule.get(anchor);
            if (!schedule.dependents.includes(dependent)) {
                schedule.dependents.push(dependent);
            }
            schedule.ruleIds.push(rule.ruleId);
        }

        console.log(`[OVERRIDE] Built schedule: ${this.forceMatchSchedule.size} anchors`);
    }

    getScheduleForPhase(phaseNum) {
        const phaseSchedule = new Map();
        for (const [key, schedule] of this.forceMatchSchedule) {
            if (schedule.anchorPhase === phaseNum) {
                phaseSchedule.set(key, schedule.dependents);
            }
        }
        return phaseSchedule;
    }

    // -------------------------------------------------------------------------
    // Logging and Reporting
    // -------------------------------------------------------------------------

    logApplication(type, ruleId, details) {
        this.applicationLog.push({
            type,
            ruleId,
            details,
            timestamp: new Date()
        });
        console.log(`[OVERRIDE] ${type} ${ruleId}: ${details}`);
    }

    getSummary() {
        // Count total keys across all mutual sets
        const mutualExclusionKeyCount = this.mutualExclusionSets.reduce(
            (sum, set) => sum + set.keys.length, 0
        );
        const mutualInclusionKeyCount = this.mutualInclusionSets.reduce(
            (sum, set) => sum + set.keys.length, 0
        );

        return {
            forceMatchCount: this.forceMatchRules.length,
            forceExcludeCount: this.forceExcludeRules.length,
            activeForceMatch: this.forceMatchRules.filter(r => r.status === 'ACTIVE').length,
            activeForceExclude: this.forceExcludeRules.filter(r => r.status === 'ACTIVE').length,
            mutualExclusionSets: this.mutualExclusionSets.length,
            mutualExclusionKeys: mutualExclusionKeyCount,
            mutualInclusionSets: this.mutualInclusionSets.length,
            mutualInclusionKeys: mutualInclusionKeyCount,
            stats: { ...this.stats }
        };
    }

    printSummary() {
        const summary = this.getSummary();
        console.log('=== Override Summary ===');
        console.log(`  Force Match: ${summary.forceMatchCount} (${summary.activeForceMatch} active)`);
        console.log(`  Force Exclude: ${summary.forceExcludeCount} (${summary.activeForceExclude} active)`);
        if (summary.mutualInclusionSets > 0) {
            console.log(`  MUTUAL Inclusion Sets: ${summary.mutualInclusionSets} (${summary.mutualInclusionKeys} keys)`);
        }
        if (summary.mutualExclusionSets > 0) {
            console.log(`  MUTUAL Exclusion Sets: ${summary.mutualExclusionSets} (${summary.mutualExclusionKeys} keys)`);
        }
        console.log(`  Applied: FM=${summary.stats.forceMatchesApplied}, FE=${summary.stats.exclusionsApplied}`);
        console.log(`  Orphaned: ${summary.stats.orphanedRules}, Errors: ${summary.stats.errors}`);
    }
}

// ============================================================================
// PHASE DETERMINATION HELPERS
// ============================================================================

/**
 * Determine which construction phase an entity belongs to.
 * Phase order:
 * 1. Bloomerang Households
 * 2. VisionAppraisal Households
 * 3. VisionAppraisal Individuals
 * 4. Bloomerang Individuals
 * 5. Other/Remaining
 */
function getPhaseForEntity(entity) {
    if (!entity) return 5;

    const source = (entity.source || '').toLowerCase();
    const entityType = entity.entityType || entity.__type || '';

    if (source.includes('bloomerang') && entityType === 'AggregateHousehold') return 1;
    if (source.includes('visionappraisal') && entityType === 'AggregateHousehold') return 2;
    if (source.includes('visionappraisal') && entityType === 'Individual') return 3;
    if (source.includes('bloomerang') && entityType === 'Individual') return 4;

    return 5;
}

/**
 * Determine anchor and dependent for a force-match pair.
 */
function determineAnchor(key1, key2, anchorOverride, entityDb) {
    if (anchorOverride) {
        const anchor = anchorOverride;
        const dependent = (anchor === key1) ? key2 : key1;
        const anchorEntity = entityDb.entities ? entityDb.entities[anchor] : null;
        return {
            anchor,
            dependent,
            anchorPhase: getPhaseForEntity(anchorEntity)
        };
    }

    const entity1 = entityDb.entities ? entityDb.entities[key1] : null;
    const entity2 = entityDb.entities ? entityDb.entities[key2] : null;
    const phase1 = getPhaseForEntity(entity1);
    const phase2 = getPhaseForEntity(entity2);

    if (phase1 <= phase2) {
        return { anchor: key1, dependent: key2, anchorPhase: phase1 };
    } else {
        return { anchor: key2, dependent: key1, anchorPhase: phase2 };
    }
}

// ============================================================================
// GOOGLE SHEETS INTEGRATION (Phase D)
// ============================================================================

/**
 * Google Sheets IDs for override rules
 */
const OVERRIDE_SHEET_IDS = {
    FORCE_MATCH: '1WWq8rgVyIKgf3qhVpl5mBiVQllljum0JVm2e_h-WZo8',
    FORCE_EXCLUDE: '1nZIqcBa3LW1DcUKXVr1jNCGsZqq6JLTaxJSpXSZyulk'
};

/**
 * Load rules from Google Sheets.
 *
 * FORCE_MATCH sheet columns (A-F):
 *   A: RuleID, B: EntityKey1, C: EntityKey2, D: AnchorOverride, E: Reason, F: Status
 *   For MUTUAL rows: A: RuleID, B: "MUTUAL", C: keys delimited by "::^::", D-F: ignored
 *
 * FORCE_EXCLUDE sheet columns (A-F):
 *   A: RuleID, B: DefectiveKey, C: OtherKey, D: OnConflict, E: Reason, F: Status
 *   For MUTUAL rows: A: RuleID, B: "MUTUAL", C: keys delimited by "::^::", D-F: ignored
 *
 * @param {Object} [options] - Options
 * @param {string} [options.forceMatchSheetId] - Override force match sheet ID
 * @param {string} [options.forceExcludeSheetId] - Override force exclude sheet ID
 * @param {string} [options.forceMatchTab] - Tab name for force match (default: 'Sheet1')
 * @param {string} [options.forceExcludeTab] - Tab name for force exclude (default: 'Sheet1')
 * @returns {Promise<{forceMatches: Array, forceExcludes: Array, mutualInclusions: Array, mutualExclusions: Array, errors: Array}>}
 */
async function loadRulesFromGoogleSheets(options = {}) {
    const forceMatchSheetId = options.forceMatchSheetId || OVERRIDE_SHEET_IDS.FORCE_MATCH;
    const forceExcludeSheetId = options.forceExcludeSheetId || OVERRIDE_SHEET_IDS.FORCE_EXCLUDE;
    const forceMatchTab = options.forceMatchTab || 'Sheet1';
    const forceExcludeTab = options.forceExcludeTab || 'Sheet1';

    const result = {
        forceMatches: [],
        forceExcludes: [],
        mutualInclusions: [],
        mutualExclusions: [],
        errors: []
    };

    // Check if gapi is available
    if (typeof gapi === 'undefined' || !gapi.client || !gapi.client.sheets) {
        const error = 'Google Sheets API not initialized. Please authorize first.';
        console.error('[OVERRIDE] ' + error);
        result.errors.push(error);
        return result;
    }

    console.log('[OVERRIDE] Loading rules from Google Sheets...');

    // Load FORCE_MATCH rules
    try {
        const forceMatchData = await fetchSheetData(forceMatchSheetId, forceMatchTab);
        if (forceMatchData && forceMatchData.length > 1) {
            // Skip header row (row 0)
            for (let i = 1; i < forceMatchData.length; i++) {
                const row = forceMatchData[i];
                if (!row || row.length < 2) continue;  // Skip empty rows

                const ruleId = (row[0] || '').toString().trim();
                const col1 = (row[1] || '').toString().trim();
                const col2 = (row[2] || '').toString().trim();
                const status = (row[5] || 'ACTIVE').toString().trim().toUpperCase();

                // Skip disabled or empty rules
                if (!ruleId || !col1) continue;
                if (status === 'DISABLED' || status === 'SKIP') continue;

                // Check for MUTUAL row
                if (col1.toUpperCase() === 'MUTUAL') {
                    if (!col2) {
                        result.errors.push(`${ruleId}: MUTUAL row missing key list in column C`);
                        continue;
                    }
                    result.mutualInclusions.push({
                        ruleId,
                        keysDelimited: col2
                    });
                    continue;
                }

                // Regular pairwise rule
                const entityKey1 = col1;
                const entityKey2 = col2;
                const anchorOverride = (row[3] || '').toString().trim() || null;
                const reason = (row[4] || '').toString().trim();

                if (!entityKey2) continue;  // Need both keys for pairwise

                result.forceMatches.push({
                    ruleId,
                    entityKey1,
                    entityKey2,
                    anchorOverride,
                    reason,
                    status
                });
            }
        }
        console.log(`[OVERRIDE] Loaded ${result.forceMatches.length} FORCE_MATCH rules from sheet`);
        if (result.mutualInclusions.length > 0) {
            console.log(`[OVERRIDE] Loaded ${result.mutualInclusions.length} MUTUAL inclusion sets from sheet`);
        }
    } catch (err) {
        const error = `Failed to load FORCE_MATCH sheet: ${err.message || err}`;
        console.error('[OVERRIDE] ' + error);
        result.errors.push(error);
    }

    // Load FORCE_EXCLUDE rules
    try {
        const forceExcludeData = await fetchSheetData(forceExcludeSheetId, forceExcludeTab);
        if (forceExcludeData && forceExcludeData.length > 1) {
            // Skip header row (row 0)
            for (let i = 1; i < forceExcludeData.length; i++) {
                const row = forceExcludeData[i];
                if (!row || row.length < 2) continue;  // Skip empty rows

                const ruleId = (row[0] || '').toString().trim();
                const col1 = (row[1] || '').toString().trim();
                const col2 = (row[2] || '').toString().trim();
                const status = (row[5] || 'ACTIVE').toString().trim().toUpperCase();

                // Skip disabled or empty rules
                if (!ruleId || !col1) continue;
                if (status === 'DISABLED' || status === 'SKIP') continue;

                // Check for MUTUAL row
                if (col1.toUpperCase() === 'MUTUAL') {
                    if (!col2) {
                        result.errors.push(`${ruleId}: MUTUAL row missing key list in column C`);
                        continue;
                    }
                    result.mutualExclusions.push({
                        ruleId,
                        keysDelimited: col2
                    });
                    continue;
                }

                // Get common fields for pairwise rules
                const onConflict = (row[3] || 'DEFECTIVE_YIELDS').toString().trim().toUpperCase();
                const reason = (row[4] || '').toString().trim();

                // Validate onConflict value
                const validOnConflict = ['DEFECTIVE_YIELDS', 'OTHER_YIELDS', 'USE_SIMILARITY'];
                const finalOnConflict = validOnConflict.includes(onConflict) ? onConflict : 'DEFECTIVE_YIELDS';

                // Check for one-to-many expansion case:
                // Column B is a real key (not MUTUAL), and column C contains the delimiter
                if (col2 && col2.includes('::^::')) {
                    const defectiveKey = col1;
                    const otherKeys = col2.split('::^::').map(k => k.trim()).filter(k => k);

                    if (otherKeys.length === 0) {
                        result.errors.push(`${ruleId}: One-to-many row has empty key list after splitting`);
                        continue;
                    }

                    // Expand into multiple pairwise rules
                    for (let idx = 0; idx < otherKeys.length; idx++) {
                        const otherKey = otherKeys[idx];
                        // Generate sub-rule ID to distinguish expanded rules
                        const expandedRuleId = otherKeys.length > 1 ? `${ruleId}[${idx + 1}]` : ruleId;

                        result.forceExcludes.push({
                            ruleId: expandedRuleId,
                            defectiveKey,
                            otherKey,
                            onConflict: finalOnConflict,
                            reason,
                            status,
                            expandedFrom: ruleId  // Track original rule for debugging
                        });
                    }
                    console.log(`[OVERRIDE] Expanded ${ruleId} into ${otherKeys.length} pairwise exclusion rules`);
                    continue;
                }

                // Regular pairwise rule
                const defectiveKey = col1;
                const otherKey = col2;

                if (!otherKey) continue;  // Need both keys for pairwise

                result.forceExcludes.push({
                    ruleId,
                    defectiveKey,
                    otherKey,
                    onConflict: finalOnConflict,
                    reason,
                    status
                });
            }
        }
        console.log(`[OVERRIDE] Loaded ${result.forceExcludes.length} FORCE_EXCLUDE rules from sheet`);
        if (result.mutualExclusions.length > 0) {
            console.log(`[OVERRIDE] Loaded ${result.mutualExclusions.length} MUTUAL exclusion sets from sheet`);
        }
    } catch (err) {
        const error = `Failed to load FORCE_EXCLUDE sheet: ${err.message || err}`;
        console.error('[OVERRIDE] ' + error);
        result.errors.push(error);
    }

    return result;
}

/**
 * Fetch data from a Google Sheet.
 * @param {string} spreadsheetId - The spreadsheet ID
 * @param {string} sheetName - The sheet/tab name
 * @returns {Promise<Array<Array>>} - 2D array of cell values
 */
async function fetchSheetData(spreadsheetId, sheetName) {
    const params = {
        spreadsheetId: spreadsheetId,
        range: sheetName,
        valueRenderOption: 'UNFORMATTED_VALUE'
    };

    const response = await gapi.client.sheets.spreadsheets.values.get(params);
    return response.result.values || [];
}

/**
 * Convenience method on MatchOverrideManager to load rules from Google Sheets.
 * Clears existing rules and loads fresh from sheets.
 * Handles both pairwise rules and MUTUAL sets.
 *
 * Usage:
 *   await window.matchOverrideManager.loadFromGoogleSheets();
 *   await buildEntityGroupDatabase({ saveToGoogleDrive: false });
 */
MatchOverrideManager.prototype.loadFromGoogleSheets = async function(options = {}) {
    this.clear();

    const sheetData = await loadRulesFromGoogleSheets(options);

    if (sheetData.errors.length > 0) {
        console.warn('[OVERRIDE] Errors loading from sheets:', sheetData.errors);
    }

    // Load pairwise rules
    const result = this.loadRules(sheetData);

    // Load MUTUAL inclusion sets
    let mutualInclusionKeysTotal = 0;
    for (const mutualData of sheetData.mutualInclusions) {
        const addResult = this.addMutualInclusionSet(mutualData);
        if (!addResult.success) {
            result.errors.push(`${mutualData.ruleId}: ${addResult.errors.join(', ')}`);
        } else {
            mutualInclusionKeysTotal += addResult.keyCount;
        }
    }

    // Load MUTUAL exclusion sets
    let mutualExclusionKeysTotal = 0;
    for (const mutualData of sheetData.mutualExclusions) {
        const addResult = this.addMutualExclusionSet(mutualData);
        if (!addResult.success) {
            result.errors.push(`${mutualData.ruleId}: ${addResult.errors.join(', ')}`);
        } else {
            mutualExclusionKeysTotal += addResult.keyCount;
        }
    }

    return {
        loaded: result.loaded,
        errors: [...sheetData.errors, ...result.errors],
        forceMatchCount: sheetData.forceMatches.length,
        forceExcludeCount: sheetData.forceExcludes.length,
        mutualInclusionSets: sheetData.mutualInclusions.length,
        mutualInclusionKeys: mutualInclusionKeysTotal,
        mutualExclusionSets: sheetData.mutualExclusions.length,
        mutualExclusionKeys: mutualExclusionKeysTotal
    };
};

// ============================================================================
// TEST RULES (Phase A - for validation)
// ============================================================================

/**
 * Load hardcoded test rules for Phase B testing.
 * Replace with Google Sheets loading in Phase D.
 *
 * To use: After loading the unified entity database, call:
 *   window.matchOverrideManager.loadRules(loadTestRules())
 *
 * To find test entity keys, use browser console:
 *   Object.keys(unifiedEntityDatabase.entities).filter(k => k.includes('FireNumber:72'))
 */
function loadTestRules() {
    // Example test rules - replace with actual entity keys from your database
    // These are placeholders to demonstrate the system works
    return {
        forceMatches: [
            // Example: Force two entities to be in the same group
            // {
            //     ruleId: 'FM-TEST-001',
            //     entityKey1: 'visionAppraisal:FireNumber:100',
            //     entityKey2: 'bloomerang:12345:...:head',
            //     reason: 'Test force match'
            // }
        ],
        forceExcludes: [
            // Example: Prevent two entities from being grouped together
            // These would typically be same-location entities that algorithm might incorrectly match
            // {
            //     ruleId: 'FE-TEST-001',
            //     defectiveKey: 'visionAppraisal:FireNumber:72A',
            //     otherKey: 'visionAppraisal:FireNumber:72B',
            //     onConflict: 'DEFECTIVE_YIELDS',
            //     reason: 'Test exclusion - different owners at same location'
            // }
        ]
    };
}

/**
 * Utility to find potential test exclusion candidates.
 * Finds VisionAppraisal entities at same fire number base (e.g., 72A, 72B, 72C).
 * Run in browser console after loading entity database.
 */
function findSameLocationTestCandidates() {
    if (!window.unifiedEntityDatabase || !window.unifiedEntityDatabase.entities) {
        console.log('Entity database not loaded');
        return [];
    }

    const entities = window.unifiedEntityDatabase.entities;
    const vaKeys = Object.keys(entities).filter(k => k.startsWith('visionAppraisal:FireNumber:'));

    // Group by base fire number (strip suffix letter)
    const byBase = {};
    for (const key of vaKeys) {
        const match = key.match(/visionAppraisal:FireNumber:(\d+)/);
        if (match) {
            const base = match[1];
            if (!byBase[base]) byBase[base] = [];
            byBase[base].push(key);
        }
    }

    // Find bases with multiple entities
    const candidates = [];
    for (const [base, keys] of Object.entries(byBase)) {
        if (keys.length > 1) {
            candidates.push({ base, keys });
        }
    }

    console.log(`Found ${candidates.length} fire number bases with multiple entities:`);
    for (const c of candidates.slice(0, 10)) {
        console.log(`  Fire ${c.base}: ${c.keys.join(', ')}`);
    }

    return candidates;
}

window.findSameLocationTestCandidates = findSameLocationTestCandidates;

// ============================================================================
// EXPORTS
// ============================================================================

// Create global instance
window.matchOverrideManager = new MatchOverrideManager();

// Export classes and functions
window.ForceMatchRule = ForceMatchRule;
window.ForceExcludeRule = ForceExcludeRule;
window.MatchOverrideManager = MatchOverrideManager;
window.ON_CONFLICT_OPTIONS = ON_CONFLICT_OPTIONS;
window.OVERRIDE_SHEET_IDS = OVERRIDE_SHEET_IDS;
window.loadTestRules = loadTestRules;
window.loadRulesFromGoogleSheets = loadRulesFromGoogleSheets;
window.getPhaseForEntity = getPhaseForEntity;
window.determineAnchor = determineAnchor;

console.log('[matchOverrideManager.js] Loaded - Match Override System ready (Phase D - Google Sheets)');
