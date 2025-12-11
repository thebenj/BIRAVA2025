/**
 * universalEntityMatcher.js
 *
 * Purpose: Universal entity comparison system that can compare any entity to all other entities,
 * group results by entity type, and identify best matches using percentile-based criteria.
 *
 * Key Features:
 * - Cross-type comparison (Individual to AggregateHousehold, etc.)
 * - Results grouped by entity type
 * - Best matches: 98th percentile OR top 10 (whichever is larger)
 * - CSV export for spreadsheet analysis
 *
 * Minimum Score Rules:
 * - Individual-to-Individual: 0.50 minimum
 * - Individual-to-AggregateHousehold: 0.50 minimum
 * - All other comparisons: 0.25 minimum
 *
 * Name Score Override (ALL comparison types):
 * - Include if nameScore > 98.5% regardless of overall score (must still meet minimum)
 *
 * Individual-to-Individual Additional Rules:
 * - Cutoff: MAX(98th percentile, 0.91) - whichever is higher
 *
 * Usage:
 *   fetch('./scripts/matching/universalEntityMatcher.js').then(r => r.text()).then(eval)
 *   const results = findBestMatches(baseEntity);
 *   downloadBestMatchesCSV(results);
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const MATCH_CONFIG = {
    percentileThreshold: 98,      // Include if score >= 98th percentile
    minimumGroupSize: 10,         // Ensure at least this many matches per type
    minimumScoreDefault: 0.31,    // Default minimum for most comparison types
    nameScoreOverride: 0.985,     // Include if nameScore > this, regardless of overall score (all types)
    includeDetailedBreakdown: true, // Include component scores in results

    // Special rules for Individual-to-Individual comparisons
    individualToIndividual: {
        minimumCutoff: 0.75,      // Floor cutoff - use MAX(98th percentile, this value)
        minimumScore: 0.50        // Higher minimum for Individual-to-Individual
    },

    // Special rules for Individual-to-AggregateHousehold comparisons
    individualToHousehold: {
        minimumScore: 0.50        // Higher minimum for Individual-to-AggregateHousehold
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// extractNameString() and crossTypeNameComparison() are now in utils.js
// for shared use by universalEntityMatcher.js and fireNumberCollisionHandler.js
// (Moved December 8, 2025)

// ============================================================================
// CORE COMPARISON FUNCTIONS
// ============================================================================

/**
 * Compare an Individual to another Individual directly
 * @param {Individual} individual1
 * @param {Individual} individual2
 * @returns {object} { score, matchedIndividual, details }
 */
function compareIndividualToIndividual(individual1, individual2) {
    const result = individual1.compareTo(individual2, true); // detailed mode
    return {
        score: typeof result === 'number' ? result : result.overallSimilarity,
        matchedIndividual: null, // Direct comparison, no intermediate individual
        matchedIndividualIndex: null,
        details: typeof result === 'object' ? result : null
    };
}

/**
 * Compare an Individual to an AggregateHousehold by finding the best-matching individual in the array
 * @param {Individual} individual
 * @param {AggregateHousehold} household
 * @returns {object} { score, matchedIndividual, matchedIndividualIndex, details }
 */
function compareIndividualToHousehold(individual, household) {
    if (!household.individuals || household.individuals.length === 0) {
        // No individuals in household - compare directly to household's name/address
        return compareIndividualToEntityDirect(individual, household);
    }

    let bestScore = -1;
    let bestMatchedIndividual = null;
    let bestMatchedIndex = -1;
    let bestDetails = null;

    household.individuals.forEach((householdIndividual, idx) => {
        const result = individual.compareTo(householdIndividual, true);
        const score = typeof result === 'number' ? result : result.overallSimilarity;

        if (score > bestScore) {
            bestScore = score;
            bestMatchedIndividual = householdIndividual;
            bestMatchedIndex = idx;
            bestDetails = typeof result === 'object' ? result : null;
        }
    });

    return {
        score: bestScore,
        matchedIndividual: bestMatchedIndividual,
        matchedIndividualIndex: bestMatchedIndex,
        details: bestDetails
    };
}

/**
 * Compare an Individual directly to an entity (for Business, LegalConstruct, or empty households)
 * Uses name and contactInfo comparison only
 * @param {Individual} individual
 * @param {Entity} entity
 * @returns {object} { score, matchedIndividual, details }
 */
function compareIndividualToEntityDirect(individual, entity) {
    // For entities without individuals array, we do a limited comparison
    // Compare name (if available) and contactInfo
    let nameScore = 0;
    let contactInfoScore = 0;
    let nameWeight = 0.5;
    let contactInfoWeight = 0.5;
    let nameComparisonMethod = 'none';

    // Try name comparison if both have names
    if (individual.name && entity.name) {
        const name1Type = individual.name.constructor?.name;
        const name2Type = entity.name.constructor?.name;

        if (name1Type === name2Type) {
            // Same type - use native compareTo
            try {
                const nameResult = individual.name.compareTo(entity.name);
                nameScore = typeof nameResult === 'number' ? nameResult : (nameResult?.overallSimilarity || 0);
                nameComparisonMethod = 'native';
            } catch (e) {
                // Fallback to cross-type comparison
                nameScore = crossTypeNameComparison(individual.name, entity.name);
                nameComparisonMethod = 'cross-type-fallback';
            }
        } else {
            // Different types - use cross-type string comparison
            nameScore = crossTypeNameComparison(individual.name, entity.name);
            nameComparisonMethod = 'cross-type';
        }
    }

    // Compare contactInfo if both have it
    if (individual.contactInfo && entity.contactInfo) {
        try {
            const contactResult = individual.contactInfo.compareTo(entity.contactInfo);
            contactInfoScore = typeof contactResult === 'number' ? contactResult : (contactResult?.overallSimilarity || 0);
        } catch (e) {
            contactInfoScore = 0;
        }
    }

    const overallScore = (nameScore * nameWeight) + (contactInfoScore * contactInfoWeight);

    return {
        score: overallScore,
        matchedIndividual: null,
        matchedIndividualIndex: null,
        details: {
            overallSimilarity: overallScore,
            components: {
                name: { similarity: nameScore, weight: nameWeight, method: nameComparisonMethod },
                contactInfo: { similarity: contactInfoScore, weight: contactInfoWeight }
            },
            comparisonType: 'direct'
        }
    };
}

/**
 * Compare an AggregateHousehold to an Individual by finding best match among household's individuals
 * @param {AggregateHousehold} household
 * @param {Individual} individual
 * @returns {object} { score, matchedIndividual, matchedIndividualIndex, details }
 */
function compareHouseholdToIndividual(household, individual) {
    // Same logic as compareIndividualToHousehold but from household's perspective
    return compareIndividualToHousehold(individual, household);
}

/**
 * Compare two AggregateHouseholds by finding the best-matching pair of individuals
 * @param {AggregateHousehold} household1
 * @param {AggregateHousehold} household2
 * @returns {object} { score, matchedIndividual, matchedIndividualIndex, details }
 */
function compareHouseholdToHousehold(household1, household2) {
    const individuals1 = household1.individuals || [];
    const individuals2 = household2.individuals || [];

    if (individuals1.length === 0 && individuals2.length === 0) {
        // Both empty - compare directly
        return compareIndividualToEntityDirect(household1, household2);
    }

    if (individuals1.length === 0 || individuals2.length === 0) {
        // One is empty - limited comparison
        return {
            score: 0,
            matchedIndividual: null,
            matchedIndividualIndex: null,
            details: { comparisonType: 'one_household_empty' }
        };
    }

    let bestScore = -1;
    let bestMatch = null;

    individuals1.forEach((ind1, idx1) => {
        individuals2.forEach((ind2, idx2) => {
            const result = ind1.compareTo(ind2, true);
            const score = typeof result === 'number' ? result : result.overallSimilarity;

            if (score > bestScore) {
                bestScore = score;
                bestMatch = {
                    individual1: ind1,
                    individual1Index: idx1,
                    individual2: ind2,
                    individual2Index: idx2,
                    details: typeof result === 'object' ? result : null
                };
            }
        });
    });

    return {
        score: bestScore,
        matchedIndividual1: bestMatch?.individual1,
        matchedIndividualIndex1: bestMatch?.individual1Index,
        matchedIndividual2: bestMatch?.individual2,
        matchedIndividualIndex2: bestMatch?.individual2Index,
        details: bestMatch?.details
    };
}

/**
 * Universal comparison function - handles all entity type combinations
 * @param {Entity} entity1 - Base entity
 * @param {Entity} entity2 - Target entity to compare against
 * @returns {object} { score, matchedIndividual, matchedIndividualIndex, details, comparisonType }
 */
function universalCompareTo(entity1, entity2) {
    const type1 = entity1.constructor.name;
    const type2 = entity2.constructor.name;

    let result;
    let comparisonType;

    if (type1 === 'Individual' && type2 === 'Individual') {
        result = compareIndividualToIndividual(entity1, entity2);
        comparisonType = 'Individual-to-Individual';
    }
    else if (type1 === 'Individual' && type2 === 'AggregateHousehold') {
        result = compareIndividualToHousehold(entity1, entity2);
        comparisonType = 'Individual-to-AggregateHousehold';
    }
    else if (type1 === 'AggregateHousehold' && type2 === 'Individual') {
        result = compareHouseholdToIndividual(entity1, entity2);
        comparisonType = 'AggregateHousehold-to-Individual';
    }
    else if (type1 === 'AggregateHousehold' && type2 === 'AggregateHousehold') {
        result = compareHouseholdToHousehold(entity1, entity2);
        comparisonType = 'AggregateHousehold-to-AggregateHousehold';
    }
    else {
        // All other combinations: direct comparison
        result = compareIndividualToEntityDirect(entity1, entity2);
        comparisonType = `${type1}-to-${type2}`;
    }

    return {
        ...result,
        comparisonType
    };
}

// ============================================================================
// BEST MATCH FINDING
// ============================================================================

/**
 * Find best matches for a base entity across all other entities
 * @param {Entity} baseEntity - The entity to find matches for
 * @param {object} options - Optional configuration overrides
 * @returns {object} Structured results with matches grouped by entity type
 */
function findBestMatches(baseEntity, options = {}) {
    const config = { ...MATCH_CONFIG, ...options };

    if (!window.workingLoadedEntities || workingLoadedEntities.status !== 'loaded') {
        console.error('ERROR: Please load entities first');
        return null;
    }

    const baseType = baseEntity.constructor.name;
    const baseKeyInfo = getEntityKeyInfo(baseEntity);  // { type, value, accountNumber, source }

    console.log(`Finding best matches for ${baseType} (${baseKeyInfo.source}:${baseKeyInfo.accountNumber || ''}:${baseKeyInfo.type}:${baseKeyInfo.value})...`);

    // Collect all entities to compare against
    const allTargetEntities = getAllEntities();

    // Group results by entity type
    const resultsByType = {
        Individual: [],
        AggregateHousehold: [],
        Business: [],
        LegalConstruct: []
    };

    let comparisonCount = 0;
    const startTime = performance.now();

    allTargetEntities.forEach(targetEntity => {
        const targetKeyInfo = getEntityKeyInfo(targetEntity);  // { type, value, accountNumber, source }

        // Skip self-comparison
        // For Bloomerang: same accountNumber means same entity
        // For VisionAppraisal: same type + value means same entity
        const isSameEntity = (baseKeyInfo.source === targetKeyInfo.source) && (
            (baseKeyInfo.source === 'bloomerang' && baseKeyInfo.accountNumber === targetKeyInfo.accountNumber) ||
            (baseKeyInfo.source === 'visionAppraisal' && baseKeyInfo.type === targetKeyInfo.type && baseKeyInfo.value === targetKeyInfo.value)
        );
        if (isSameEntity) {
            return;
        }

        const comparison = universalCompareTo(baseEntity, targetEntity);
        comparisonCount++;

        const targetType = targetEntity.constructor.name;

        if (resultsByType[targetType]) {
            resultsByType[targetType].push({
                targetEntity,
                targetKey: targetKeyInfo.value,  // locationIdentifier value (for display)
                targetKeyType: targetKeyInfo.type,  // locationIdentifier type (for lookup)
                targetAccountNumber: targetKeyInfo.accountNumber,  // Bloomerang account number (for lookup)
                targetHeadStatus: targetKeyInfo.headStatus,  // head status for Bloomerang lookup
                targetSource: targetKeyInfo.source,
                targetType,
                entityName: getEntityDisplayName(targetEntity),  // Display name for UI
                score: comparison.score,
                matchedIndividual: comparison.matchedIndividual,
                matchedIndividualIndex: comparison.matchedIndividualIndex,
                comparisonType: comparison.comparisonType,
                details: config.includeDetailedBreakdown ? comparison.details : null
            });
        }
    });

    const endTime = performance.now();

    // Process each type group to find best matches
    const bestMatchesByType = {};

    Object.keys(resultsByType).forEach(entityType => {
        const typeResults = resultsByType[entityType];

        if (typeResults.length === 0) {
            bestMatchesByType[entityType] = {
                allScores: [],
                bestMatches: [],
                percentile98Value: null,
                totalCount: 0
            };
            return;
        }

        // Sort by score descending
        typeResults.sort((a, b) => b.score - a.score);

        // Calculate 98th percentile value
        const percentileIndex = Math.floor(typeResults.length * (1 - config.percentileThreshold / 100));
        const percentile98Value = typeResults[percentileIndex]?.score || 0;

        // Check if this is Individual-to-Individual comparison
        const isIndividualToIndividual = baseType === 'Individual' && entityType === 'Individual';

        let bestMatches;
        let selectionMethod;
        let effectiveCutoff;

        // Determine minimum score based on comparison type
        const isIndividualToHousehold =
            (baseType === 'Individual' && entityType === 'AggregateHousehold') ||
            (baseType === 'AggregateHousehold' && entityType === 'Individual');

        let minimumScore;
        if (isIndividualToIndividual) {
            minimumScore = config.individualToIndividual.minimumScore;
        } else if (isIndividualToHousehold) {
            minimumScore = config.individualToHousehold.minimumScore;
        } else {
            minimumScore = config.minimumScoreDefault;
        }

        let primaryMatches;

        if (isIndividualToIndividual) {
            // Special rules for Individual-to-Individual
            const i2iConfig = config.individualToIndividual;

            // Primary cutoff: MAX of (98th percentile, minimumCutoff)
            effectiveCutoff = Math.max(percentile98Value, i2iConfig.minimumCutoff);

            // Get matches above the effective cutoff (and above minimum score)
            primaryMatches = typeResults.filter(r =>
                r.score >= effectiveCutoff && r.score >= minimumScore
            );

            // Determine selection method description
            if (percentile98Value >= i2iConfig.minimumCutoff) {
                selectionMethod = `98th_percentile (${percentile98Value.toFixed(4)})`;
            } else {
                selectionMethod = `floor_cutoff (${i2iConfig.minimumCutoff})`;
            }
        } else {
            // Standard rules for other comparison types
            const above98th = typeResults.filter(r => r.score >= percentile98Value);

            if (above98th.length >= config.minimumGroupSize) {
                // Use 98th percentile
                primaryMatches = above98th.filter(r => r.score >= minimumScore);
                selectionMethod = '98th_percentile';
            } else {
                // Use top minimumGroupSize
                primaryMatches = typeResults.slice(0, config.minimumGroupSize).filter(r => r.score >= minimumScore);
                selectionMethod = 'top_N';
            }
            effectiveCutoff = percentile98Value;
        }

        // Get matches with high name score (override inclusion) - applies to ALL comparison types
        // These must still meet minimum score requirement
        // Use accountNumber for Bloomerang uniqueness, type+value for VisionAppraisal
        const getUniqueKey = (r) => r.targetSource === 'bloomerang'
            ? `bloomerang:${r.targetAccountNumber}`
            : `visionAppraisal:${r.targetKeyType}:${r.targetKey}`;
        const primaryKeys = new Set(primaryMatches.map(getUniqueKey));
        const highNameScore = typeResults.filter(r => {
            const nameScore = r.details?.components?.name?.similarity || 0;
            const key = getUniqueKey(r);
            return nameScore > config.nameScoreOverride &&
                   r.score >= minimumScore &&
                   !primaryKeys.has(key); // Only add if not already included
        });

        // Combine primary matches with high name score overrides
        bestMatches = [...primaryMatches, ...highNameScore];

        if (highNameScore.length > 0) {
            selectionMethod += ` +${highNameScore.length} name_override`;
        }

        bestMatchesByType[entityType] = {
            allScores: typeResults.map(r => r.score),
            bestMatches,
            percentile98Value,
            effectiveCutoff,
            totalCount: typeResults.length,
            selectionMethod
        };
    });

    const result = {
        baseEntity: {
            type: baseType,
            key: baseKeyInfo.value,  // locationIdentifier value (for display)
            keyType: baseKeyInfo.type,  // locationIdentifier type (e.g., FireNumber, PID)
            accountNumber: baseKeyInfo.accountNumber,  // Bloomerang account number (for lookup) or null
            headStatus: baseKeyInfo.headStatus,  // head status for Bloomerang lookup or null
            source: baseKeyInfo.source,  // 'bloomerang' or 'visionAppraisal'
            name: getEntityDisplayName(baseEntity)
        },
        bestMatchesByType,
        metadata: {
            totalComparisons: comparisonCount,
            processingTimeMs: endTime - startTime,
            timestamp: new Date().toISOString(),
            config
        }
    };

    console.log(`Completed ${comparisonCount} comparisons in ${(endTime - startTime).toFixed(2)}ms`);

    return result;
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

/**
 * Find best matches for multiple base entities
 * @param {Entity[]} baseEntities - Array of entities to find matches for
 * @param {object} options - Optional configuration
 * @returns {object[]} Array of results
 */
function findBestMatchesBatch(baseEntities, options = {}) {
    const results = [];
    const totalCount = baseEntities.length;

    console.log(`Processing ${totalCount} entities...`);

    baseEntities.forEach((entity, idx) => {
        if (idx % 100 === 0) {
            console.log(`  Progress: ${idx}/${totalCount}`);
        }
        results.push(findBestMatches(entity, options));
    });

    console.log(`Batch processing complete: ${results.length} entities processed`);
    return results;
}

// ============================================================================
// CSV EXPORT
// ============================================================================

/**
 * Convert best matches results to CSV rows
 * One row per best match, with base entity info repeated
 * @param {object} results - Results from findBestMatches
 * @returns {string[]} Array of CSV rows
 */
function resultToCSVRows(results) {
    const rows = [];
    const base = results.baseEntity;

    Object.keys(results.bestMatchesByType).forEach(entityType => {
        const typeData = results.bestMatchesByType[entityType];

        typeData.bestMatches.forEach((match, rank) => {
            const matchedIndName = match.matchedIndividual ?
                getEntityDisplayName(match.matchedIndividual) : '';

            // Extract component scores if available
            let nameScore = '';
            let contactInfoScore = '';
            if (match.details?.components) {
                nameScore = match.details.components.name?.similarity?.toFixed(4) || '';
                contactInfoScore = match.details.components.contactInfo?.similarity?.toFixed(4) || '';
            }

            rows.push({
                // Base entity info
                baseType: base.type,
                baseKey: base.key,
                baseAccountNumber: base.accountNumber || '',
                baseSource: base.source,
                baseName: base.name,

                // Target entity info
                targetType: match.targetType,
                targetKey: match.targetKey,
                targetAccountNumber: match.targetAccountNumber || '',
                targetSource: match.targetSource,
                targetName: getEntityDisplayName(match.targetEntity),

                // Match info
                rank: rank + 1,
                score: match.score.toFixed(6),
                comparisonType: match.comparisonType,
                matchedIndividualName: matchedIndName,
                matchedIndividualIndex: match.matchedIndividualIndex ?? '',

                // Component scores
                nameScore,
                contactInfoScore,

                // Type group stats
                typeTotal: typeData.totalCount,
                type98thPercentile: typeData.percentile98Value?.toFixed(4) || '',
                effectiveCutoff: typeData.effectiveCutoff?.toFixed(4) || '',
                selectionMethod: typeData.selectionMethod
            });
        });
    });

    return rows;
}

/**
 * Generate CSV string from results
 * @param {object|object[]} results - Single result or array of results from findBestMatches
 * @returns {string} CSV content
 */
function generateBestMatchesCSV(results) {
    const resultsArray = Array.isArray(results) ? results : [results];

    const headers = [
        'baseType', 'baseKey', 'baseAccountNumber', 'baseSource', 'baseName',
        'targetType', 'targetKey', 'targetAccountNumber', 'targetSource', 'targetName',
        'rank', 'score', 'comparisonType',
        'matchedIndividualName', 'matchedIndividualIndex',
        'nameScore', 'contactInfoScore',
        'typeTotal', 'type98thPercentile', 'effectiveCutoff', 'selectionMethod'
    ];

    const allRows = [];
    resultsArray.forEach(result => {
        if (result) {
            allRows.push(...resultToCSVRows(result));
        }
    });

    // Build CSV
    const csvLines = [headers.join(',')];

    allRows.forEach(row => {
        const values = headers.map(h => {
            const val = row[h] ?? '';
            // Escape quotes and wrap in quotes if contains comma or quote
            const strVal = String(val);
            if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
                return `"${strVal.replace(/"/g, '""')}"`;
            }
            return strVal;
        });
        csvLines.push(values.join(','));
    });

    return csvLines.join('\n');
}

/**
 * Download best matches results as CSV
 * @param {object|object[]} results - Results from findBestMatches or findBestMatchesBatch
 * @param {string} filename - Optional filename
 */
function downloadBestMatchesCSV(results, filename = null) {
    const csvContent = generateBestMatchesCSV(results);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const defaultFilename = `best_matches_${timestamp}.csv`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || defaultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`Downloaded: ${filename || defaultFilename}`);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all entities from workingLoadedEntities
 * @returns {Entity[]} Array of all entities
 */
function getAllEntities() {
    const entities = [];

    // VisionAppraisal entities
    if (workingLoadedEntities.visionAppraisal?.entities) {
        Object.values(workingLoadedEntities.visionAppraisal.entities).forEach(e => {
            entities.push(e);
        });
    }

    // Bloomerang entities
    if (workingLoadedEntities.bloomerang) {
        ['individuals', 'households', 'nonhuman'].forEach(collection => {
            if (workingLoadedEntities.bloomerang[collection]?.entities) {
                Object.values(workingLoadedEntities.bloomerang[collection].entities).forEach(e => {
                    entities.push(e);
                });
            }
        });
    }

    return entities;
}

/**
 * Get key info for an entity - returns location type, value, accountNumber, and headStatus
 * This is the canonical identifier used for entity lookup via the entityIndex.
 * Key format in entityIndex:
 *   Bloomerang: bloomerang:<accountNumber>:<locationType>:<locationValue>:<headStatus>
 *   VisionAppraisal: visionAppraisal:<locationType>:<locationValue>
 * @param {Entity} entity
 * @returns {Object} Key info object:
 *   For Bloomerang: { type: string, value: string, accountNumber: string, headStatus: string, source: 'bloomerang' }
 *   For VisionAppraisal: { type: string, value: string, accountNumber: null, headStatus: null, source: 'visionAppraisal' }
 *   type = locationIdentifier type (e.g., 'FireNumber', 'SimpleIdentifiers')
 *   value = locationIdentifier value (e.g., '222', 'PO Box 1382, Block Island, RI, 02807')
 *   accountNumber = Bloomerang account number (e.g., '1917') or null for VisionAppraisal
 *   headStatus = 'head', 'member', or 'na' for Bloomerang; null for VisionAppraisal
 */
function getEntityKeyInfo(entity) {
    // Get locationIdentifier info
    let type = 'Unknown';
    let value = 'unknown';

    if (entity.locationIdentifier) {
        const locId = entity.locationIdentifier;
        type = locId.constructor?.name || 'Unknown';

        if (locId.primaryAlias?.term) {
            value = String(locId.primaryAlias.term);
        } else if (locId.toString && typeof locId.toString === 'function') {
            value = locId.toString();
        }
    }

    // Check if this is a Bloomerang entity by examining the locationIdentifier sourceMap
    // This is the authoritative test - NOT the accountNumber property (VisionAppraisal entities have accountNumber: null)
    let accountNumber = null;
    let headStatus = null;
    let source = 'visionAppraisal';

    // Check sourceMap for 'bloomerang' (case insensitive)
    const sourceMap = entity.locationIdentifier?.primaryAlias?.sourceMap;
    let isBloomerang = false;
    if (sourceMap) {
        if (sourceMap instanceof Map) {
            for (const key of sourceMap.keys()) {
                if (String(key).toLowerCase().includes('bloomerang')) {
                    isBloomerang = true;
                    break;
                }
            }
        } else if (sourceMap.__data) {
            // Handle deserialized Map (has __data array)
            isBloomerang = sourceMap.__data.some(entry => String(entry[0]).toLowerCase().includes('bloomerang'));
        }
    }

    if (isBloomerang) {
        source = 'bloomerang';
        // Extract account number from SimpleIdentifiers pattern
        if (entity.accountNumber?.primaryAlias?.term) {
            accountNumber = String(entity.accountNumber.primaryAlias.term);
        } else if (entity.accountNumber?.term) {
            accountNumber = String(entity.accountNumber.term);
        }

        // For AggregateHousehold entities, append 'AH' to distinguish from Individual
        // This matches the entityIndex key format: bloomerang:729AH:... vs bloomerang:729:...
        const entityType = entity.constructor?.name;
        if (entityType === 'AggregateHousehold' && accountNumber) {
            accountNumber = accountNumber + 'AH';
        }

        // Determine household head status for Bloomerang entities
        headStatus = 'na';
        if (entityType === 'Individual') {
            const householdInfo = entity.contactInfo?.householdInformation;
            if (householdInfo && householdInfo.isInHousehold) {
                headStatus = householdInfo.isHeadOfHousehold ? 'head' : 'member';
            }
        }
    }

    return { type, value, accountNumber, headStatus, source };
}

/**
 * Get a unique key for an entity (locationIdentifier value only - for display/comparison)
 * @deprecated For entity lookup, use getEntityKeyInfo() which returns both type and value
 * @param {Entity} entity
 * @returns {string} The locationIdentifier value
 */
function getEntityKey(entity) {
    return getEntityKeyInfo(entity).value;
}

/**
 * Determine the data source of an entity
 * @param {Entity} entity
 * @returns {string} 'visionAppraisal' or 'bloomerang'
 */
function getEntitySource(entity) {
    // Check if entity has source property
    if (entity.source) {
        return entity.source.toLowerCase().includes('vision') ? 'visionAppraisal' : 'bloomerang';
    }

    // Check locationIdentifier for source hints
    const key = getEntityKey(entity);

    // Bloomerang uses numeric account numbers, VA uses fire numbers/PIDs
    if (/^\d{4}$/.test(key)) {
        return 'bloomerang'; // 4-digit account numbers
    }

    return 'visionAppraisal'; // Default assumption
}

/**
 * Get display name for an entity
 * @param {Entity} entity
 * @returns {string}
 */
function getEntityDisplayName(entity) {
    if (!entity) return '';

    if (entity.name) {
        if (entity.name.toString) {
            return entity.name.toString();
        }
        if (entity.name.firstName || entity.name.lastName) {
            return `${entity.name.firstName || ''} ${entity.name.lastName || ''}`.trim();
        }
        if (entity.name.fullHouseholdName) {
            return entity.name.fullHouseholdName;
        }
    }

    return getEntityKey(entity);
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick test: Find best matches for a single entity by key
 * @param {string} entityKey - Key to look up
 * @param {string} source - 'visionAppraisal' or 'bloomerang'
 * @returns {object} Results
 */
function findMatchesByKey(entityKey, source = 'bloomerang') {
    const allEntities = getAllEntities();
    const entity = allEntities.find(e => getEntityKey(e) === entityKey);

    if (!entity) {
        console.error(`Entity not found: ${entityKey}`);
        return null;
    }

    return findBestMatches(entity);
}

/**
 * Run analysis on entities
 * @param {object} options - Configuration options
 * @param {number} options.limit - Optional limit on number of entities to process
 * @param {string|string[]} options.entityTypes - Entity type(s) to analyze: 'all', 'Individual', 'AggregateHousehold', 'Business', 'LegalConstruct', or array of types
 * @param {boolean} options.download - Whether to download CSV (default: true)
 * @param {boolean} options.storeInMemory - Whether to store results in window.lastAnalysisResults (default: true)
 * @returns {object[]} Array of results
 */
function analyzeEntities(options = {}) {
    const config = {
        limit: null,
        entityTypes: 'all',  // 'all', single type string, or array of types
        download: true,
        storeInMemory: true,
        ...options
    };

    const allEntities = getAllEntities();

    // Filter by entity type(s)
    let entitiesToProcess;
    if (config.entityTypes === 'all') {
        entitiesToProcess = allEntities;
    } else if (Array.isArray(config.entityTypes)) {
        entitiesToProcess = allEntities.filter(e => config.entityTypes.includes(e.constructor.name));
    } else {
        entitiesToProcess = allEntities.filter(e => e.constructor.name === config.entityTypes);
    }

    // Apply limit
    const toProcess = config.limit ? entitiesToProcess.slice(0, config.limit) : entitiesToProcess;

    // Count by type for logging
    const typeCounts = {};
    toProcess.forEach(e => {
        const type = e.constructor.name;
        typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    console.log(`Analyzing ${toProcess.length} entities...`);
    console.log(`  Types: ${JSON.stringify(typeCounts)}`);

    const results = findBestMatchesBatch(toProcess);

    if (config.storeInMemory) {
        window.lastAnalysisResults = results;
        console.log(`Results stored in window.lastAnalysisResults (${results.length} entries)`);
    }

    if (config.download) {
        const typeLabel = config.entityTypes === 'all' ? 'all_entities' :
            (Array.isArray(config.entityTypes) ? config.entityTypes.join('_') : config.entityTypes);
        downloadBestMatchesCSV(results, `matches_${typeLabel}_${toProcess.length}.csv`);
    }

    return results;
}

/**
 * Run analysis on all individuals (legacy function - calls analyzeEntities)
 * @param {number} limit - Optional limit on number of entities to process
 * @param {object} options - Optional configuration
 * @returns {object[]} Array of results
 */
function analyzeAllIndividuals(limit = null, options = {}) {
    return analyzeEntities({
        limit,
        entityTypes: 'Individual',
        ...options
    });
}

// Backward compatible alias
function analyzeAllIndividualsAndDownload(limit = null) {
    return analyzeAllIndividuals(limit, { download: true, storeInMemory: true });
}

/**
 * Analyze ALL entities of ALL types
 * @param {number} limit - Optional limit
 * @param {object} options - Optional configuration
 * @returns {object[]} Array of results
 */
function analyzeAllEntities(limit = null, options = {}) {
    return analyzeEntities({
        limit,
        entityTypes: 'all',
        ...options
    });
}

// ============================================================================
// CHUNKED CSV EXPORT (Memory-Efficient)
// ============================================================================

/**
 * Analyze entities and download CSV in chunks to avoid memory exhaustion.
 * Each chunk is processed, written to a file, and then memory is freed.
 *
 * @param {object} options - Configuration options
 * @param {number} options.chunkSize - Entities per chunk (default: 100)
 * @param {string|string[]} options.entityTypes - Entity type(s) to analyze (default: 'all')
 * @param {number} options.limit - Optional total limit on entities
 * @param {number} options.startChunk - Start from this chunk number (default: 0, for resuming)
 * @param {number} options.delayBetweenChunks - Milliseconds to wait between chunks (default: 100)
 */
/**
 * Memory-optimized function to find best matches and return ONLY CSV-ready data
 * Does not store full entity objects - extracts strings immediately
 * @param {Entity} baseEntity - The entity to find matches for
 * @returns {object} Lightweight result with only CSV-ready string data
 */
function findBestMatchesLightweight(baseEntity) {
    if (!window.workingLoadedEntities || workingLoadedEntities.status !== 'loaded') {
        console.error('ERROR: Please load entities first');
        return null;
    }

    const baseType = baseEntity.constructor.name;
    const baseKeyInfo = getEntityKeyInfo(baseEntity);
    const baseName = getEntityDisplayName(baseEntity);

    // Collect all entities to compare against
    const allTargetEntities = getAllEntities();

    // Group results by entity type - store ONLY scores and minimal identifiers
    const resultsByType = {
        Individual: [],
        AggregateHousehold: [],
        Business: [],
        LegalConstruct: []
    };

    allTargetEntities.forEach(targetEntity => {
        const targetKeyInfo = getEntityKeyInfo(targetEntity);

        // Skip self-comparison
        const isSameEntity = (baseKeyInfo.source === targetKeyInfo.source) && (
            (baseKeyInfo.source === 'bloomerang' && baseKeyInfo.accountNumber === targetKeyInfo.accountNumber) ||
            (baseKeyInfo.source === 'visionAppraisal' && baseKeyInfo.type === targetKeyInfo.type && baseKeyInfo.value === targetKeyInfo.value)
        );
        if (isSameEntity) return;

        const comparison = universalCompareTo(baseEntity, targetEntity);
        const targetType = targetEntity.constructor.name;

        if (resultsByType[targetType]) {
            // Store ONLY primitive data needed for CSV - NO entity object references
            resultsByType[targetType].push({
                targetKey: targetKeyInfo.value,
                targetAccountNumber: targetKeyInfo.accountNumber || '',
                targetSource: targetKeyInfo.source,
                targetType,
                targetName: getEntityDisplayName(targetEntity),  // Extract string NOW
                score: comparison.score,
                matchedIndividualName: comparison.matchedIndividual ? getEntityDisplayName(comparison.matchedIndividual) : '',
                matchedIndividualIndex: comparison.matchedIndividualIndex ?? '',
                comparisonType: comparison.comparisonType,
                nameScore: comparison.details?.components?.name?.similarity ?? null,
                contactInfoScore: comparison.details?.components?.contactInfo?.similarity ?? null
            });
        }
    });

    // Process each type group to find best matches
    const csvRows = [];

    Object.keys(resultsByType).forEach(entityType => {
        const typeResults = resultsByType[entityType];
        if (typeResults.length === 0) return;

        // Sort by score descending
        typeResults.sort((a, b) => b.score - a.score);

        // Calculate 98th percentile value
        const percentileIndex = Math.floor(typeResults.length * (1 - MATCH_CONFIG.percentileThreshold / 100));
        const percentile98Value = typeResults[percentileIndex]?.score || 0;

        // Determine comparison type rules
        const isIndividualToIndividual = baseType === 'Individual' && entityType === 'Individual';
        const isIndividualToHousehold =
            (baseType === 'Individual' && entityType === 'AggregateHousehold') ||
            (baseType === 'AggregateHousehold' && entityType === 'Individual');

        let minimumScore;
        if (isIndividualToIndividual) {
            minimumScore = MATCH_CONFIG.individualToIndividual.minimumScore;
        } else if (isIndividualToHousehold) {
            minimumScore = MATCH_CONFIG.individualToHousehold.minimumScore;
        } else {
            minimumScore = MATCH_CONFIG.minimumScoreDefault;
        }

        let effectiveCutoff, selectionMethod, primaryMatches;

        if (isIndividualToIndividual) {
            const i2iConfig = MATCH_CONFIG.individualToIndividual;
            effectiveCutoff = Math.max(percentile98Value, i2iConfig.minimumCutoff);
            primaryMatches = typeResults.filter(r => r.score >= effectiveCutoff && r.score >= minimumScore);
            selectionMethod = percentile98Value >= i2iConfig.minimumCutoff
                ? `98th_percentile (${percentile98Value.toFixed(4)})`
                : `floor_cutoff (${i2iConfig.minimumCutoff})`;
        } else {
            const above98th = typeResults.filter(r => r.score >= percentile98Value);
            if (above98th.length >= MATCH_CONFIG.minimumGroupSize) {
                primaryMatches = above98th.filter(r => r.score >= minimumScore);
                selectionMethod = '98th_percentile';
            } else {
                primaryMatches = typeResults.slice(0, MATCH_CONFIG.minimumGroupSize).filter(r => r.score >= minimumScore);
                selectionMethod = 'top_N';
            }
            effectiveCutoff = percentile98Value;
        }

        // Name score override matches
        const getUniqueKey = (r) => r.targetSource === 'bloomerang'
            ? `${r.targetSource}:${r.targetAccountNumber}`
            : `${r.targetSource}:${r.targetKey}`;
        const primaryKeys = new Set(primaryMatches.map(getUniqueKey));

        const nameOverrideMatches = typeResults.filter(r =>
            !primaryKeys.has(getUniqueKey(r)) &&
            r.nameScore !== null &&
            r.nameScore >= MATCH_CONFIG.nameScoreOverride &&
            r.score >= minimumScore
        );

        const bestMatches = [...primaryMatches, ...nameOverrideMatches];

        // Convert to CSV rows immediately - no intermediate storage
        bestMatches.forEach((match, rank) => {
            csvRows.push({
                baseType,
                baseKey: baseKeyInfo.value,
                baseAccountNumber: baseKeyInfo.accountNumber || '',
                baseSource: baseKeyInfo.source,
                baseName,
                targetType: match.targetType,
                targetKey: match.targetKey,
                targetAccountNumber: match.targetAccountNumber,
                targetSource: match.targetSource,
                targetName: match.targetName,
                rank: rank + 1,
                score: match.score.toFixed(6),
                comparisonType: match.comparisonType,
                matchedIndividualName: match.matchedIndividualName,
                matchedIndividualIndex: match.matchedIndividualIndex,
                nameScore: match.nameScore?.toFixed(4) || '',
                contactInfoScore: match.contactInfoScore?.toFixed(4) || '',
                typeTotal: typeResults.length,
                type98thPercentile: percentile98Value.toFixed(4),
                effectiveCutoff: effectiveCutoff.toFixed(4),
                selectionMethod
            });
        });

        // Clear type results immediately after processing
        typeResults.length = 0;
    });

    return csvRows;
}

async function analyzeEntitiesChunked(options = {}) {
    const config = {
        chunkSize: 100,
        entityTypes: 'all',
        limit: null,
        startChunk: 0,
        delayBetweenChunks: 100,
        ...options
    };

    const allEntities = getAllEntities();

    // Filter by entity type(s)
    let entitiesToProcess;
    if (config.entityTypes === 'all') {
        entitiesToProcess = allEntities;
    } else if (Array.isArray(config.entityTypes)) {
        entitiesToProcess = allEntities.filter(e => config.entityTypes.includes(e.constructor.name));
    } else {
        entitiesToProcess = allEntities.filter(e => e.constructor.name === config.entityTypes);
    }

    // Apply limit
    if (config.limit) {
        entitiesToProcess = entitiesToProcess.slice(0, config.limit);
    }

    const totalCount = entitiesToProcess.length;
    const totalChunks = Math.ceil(totalCount / config.chunkSize);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const typeLabel = config.entityTypes === 'all' ? 'all' :
        (Array.isArray(config.entityTypes) ? config.entityTypes.join('_') : config.entityTypes);

    console.log(`=== CHUNKED ANALYSIS (MEMORY-OPTIMIZED) ===`);
    console.log(`Total entities: ${totalCount}`);
    console.log(`Chunk size: ${config.chunkSize}`);
    console.log(`Total chunks: ${totalChunks}`);
    console.log(`Starting from chunk: ${config.startChunk}`);
    console.log(`Output files: matches_${typeLabel}_chunk_N_of_${totalChunks}_${timestamp}.csv`);
    console.log(`============================================`);

    // CSV headers
    const headers = [
        'baseType', 'baseKey', 'baseAccountNumber', 'baseSource', 'baseName',
        'targetType', 'targetKey', 'targetAccountNumber', 'targetSource', 'targetName',
        'rank', 'score', 'comparisonType',
        'matchedIndividualName', 'matchedIndividualIndex',
        'nameScore', 'contactInfoScore',
        'typeTotal', 'type98thPercentile', 'effectiveCutoff', 'selectionMethod'
    ];

    let totalRowsWritten = 0;

    for (let chunkIdx = config.startChunk; chunkIdx < totalChunks; chunkIdx++) {
        const startIdx = chunkIdx * config.chunkSize;
        const endIdx = Math.min(startIdx + config.chunkSize, totalCount);

        console.log(`\nProcessing chunk ${chunkIdx + 1}/${totalChunks} (entities ${startIdx + 1}-${endIdx})...`);

        // Build CSV directly - process one entity at a time
        const csvLines = [headers.join(',')];
        let chunkRowCount = 0;

        for (let i = startIdx; i < endIdx; i++) {
            if ((i - startIdx) % 25 === 0) {
                console.log(`  Chunk progress: ${i - startIdx}/${endIdx - startIdx}`);
            }

            // Get CSV rows for this single entity (lightweight - no entity object storage)
            const rows = findBestMatchesLightweight(entitiesToProcess[i]);

            if (rows && rows.length > 0) {
                rows.forEach(row => {
                    const values = headers.map(h => {
                        const val = row[h] ?? '';
                        const strVal = String(val);
                        if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
                            return `"${strVal.replace(/"/g, '""')}"`;
                        }
                        return strVal;
                    });
                    csvLines.push(values.join(','));
                });
                chunkRowCount += rows.length;
            }
        }

        const csvContent = csvLines.join('\n');

        // Download this chunk
        const chunkFilename = `matches_${typeLabel}_chunk_${chunkIdx + 1}_of_${totalChunks}_${timestamp}.csv`;
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = chunkFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        totalRowsWritten += chunkRowCount;
        console.log(`  ✓ Downloaded ${chunkFilename} (${chunkRowCount} rows)`);

        // Explicit cleanup - help garbage collector
        csvLines.length = 0;

        // Allow garbage collection and browser breathing room
        if (chunkIdx < totalChunks - 1 && config.delayBetweenChunks > 0) {
            await new Promise(resolve => setTimeout(resolve, config.delayBetweenChunks));
        }
    }

    console.log(`\n=== COMPLETE ===`);
    console.log(`Total files: ${totalChunks - config.startChunk}`);
    console.log(`Total rows: ${totalRowsWritten}`);
    console.log(`================`);

    return {
        totalEntities: totalCount,
        totalChunks: totalChunks - config.startChunk,
        totalRows: totalRowsWritten,
        timestamp
    };
}

// ============================================================================
// INITIALIZATION
// ============================================================================

console.log('Universal Entity Matcher loaded');
console.log('Available functions:');
console.log('  - findBestMatches(entity) - Find best matches for one entity');
console.log('  - findBestMatchesBatch(entities) - Process multiple entities');
console.log('  - downloadBestMatchesCSV(results) - Download results as CSV');
console.log('  - findMatchesByKey(key, source) - Quick lookup and match by entity key');
console.log('');
console.log('  - analyzeEntities(options) - THE MAIN FUNCTION - Process any entity types');
console.log('      options: { limit, entityTypes, download, storeInMemory }');
console.log('      entityTypes: "all", "Individual", "AggregateHousehold", "Business", "LegalConstruct"');
console.log('                   or array like ["Individual", "AggregateHousehold"]');
console.log('');
console.log('  - analyzeAllEntities(limit, options) - Shortcut for all entity types');
console.log('  - analyzeAllIndividuals(limit, options) - Shortcut for Individuals only');
console.log('');
console.log('  - analyzeEntitiesChunked(options) - MEMORY-SAFE: Download CSV in chunks');
console.log('      options: { chunkSize, entityTypes, limit, startChunk, delayBetweenChunks }');
console.log('      chunkSize: entities per file (default: 100)');
console.log('      startChunk: resume from chunk N (default: 0)');
console.log('');
console.log('Example usage:');
console.log('  // Analyze ALL entities (no download, store in memory):');
console.log('  analyzeAllEntities(null, { download: false });');
console.log('');
console.log('  // Analyze 100 entities of all types:');
console.log('  analyzeEntities({ limit: 100, entityTypes: "all", download: false });');
console.log('');
console.log('  // Analyze only Individuals and AggregateHouseholds:');
console.log('  analyzeEntities({ entityTypes: ["Individual", "AggregateHousehold"], download: false });');
console.log('');
console.log('  // MEMORY-SAFE: Analyze all entities in chunks of 100:');
console.log('  await analyzeEntitiesChunked({ chunkSize: 100 });');
console.log('');
console.log('  // Resume from chunk 15 if interrupted:');
console.log('  await analyzeEntitiesChunked({ chunkSize: 100, startChunk: 14 });');
console.log('');
console.log('  // Results available in window.lastAnalysisResults');

// Store config globally for inspection
window.MATCH_CONFIG = MATCH_CONFIG;
window.findBestMatches = findBestMatches;
window.findBestMatchesBatch = findBestMatchesBatch;
window.downloadBestMatchesCSV = downloadBestMatchesCSV;
window.findMatchesByKey = findMatchesByKey;
window.analyzeEntities = analyzeEntities;
window.analyzeAllEntities = analyzeAllEntities;
window.analyzeAllIndividuals = analyzeAllIndividuals;
window.analyzeAllIndividualsAndDownload = analyzeAllIndividualsAndDownload;
window.analyzeEntitiesChunked = analyzeEntitiesChunked;
window.universalCompareTo = universalCompareTo;
window.generateBestMatchesCSV = generateBestMatchesCSV;
