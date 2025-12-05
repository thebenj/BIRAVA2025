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
        minimumCutoff: 0.91,      // Floor cutoff - use MAX(98th percentile, this value)
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

/**
 * Extract a displayable/comparable name string from any name type
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
 * Compare two names of potentially different types using string comparison
 * @param {object} name1 - First name object
 * @param {object} name2 - Second name object
 * @returns {number} Similarity score 0-1
 */
function crossTypeNameComparison(name1, name2) {
    const str1 = extractNameString(name1).toLowerCase().trim();
    const str2 = extractNameString(name2).toLowerCase().trim();

    if (!str1 || !str2) return 0;

    // Use levenshteinSimilarity from utils.js
    if (typeof levenshteinSimilarity === 'function') {
        return levenshteinSimilarity(str1, str2);
    }

    // Fallback if levenshteinSimilarity not available
    console.warn('levenshteinSimilarity not available, using exact match');
    return str1 === str2 ? 1 : 0;
}

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
        matchedIndividual: bestMatch?.individual2,
        matchedIndividualIndex: bestMatch?.individual2Index,
        matchedIndividual1: bestMatch?.individual1,
        matchedIndividual1Index: bestMatch?.individual1Index,
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
    const baseKey = getEntityKey(baseEntity);
    const baseSource = getEntitySource(baseEntity);

    console.log(`Finding best matches for ${baseType} (${baseKey}) from ${baseSource}...`);

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
        const targetKey = getEntityKey(targetEntity);
        const targetSource = getEntitySource(targetEntity);

        // Skip self-comparison
        if (baseKey === targetKey && baseSource === targetSource) {
            return;
        }

        const comparison = universalCompareTo(baseEntity, targetEntity);
        comparisonCount++;

        const targetType = targetEntity.constructor.name;

        if (resultsByType[targetType]) {
            resultsByType[targetType].push({
                targetEntity,
                targetKey,
                targetSource,
                targetType,
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
        const primaryKeys = new Set(primaryMatches.map(r => r.targetKey + '|' + r.targetSource));
        const highNameScore = typeResults.filter(r => {
            const nameScore = r.details?.components?.name?.similarity || 0;
            const key = r.targetKey + '|' + r.targetSource;
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
            key: baseKey,
            source: baseSource,
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
                baseSource: base.source,
                baseName: base.name,

                // Target entity info
                targetType: match.targetType,
                targetKey: match.targetKey,
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
        'baseType', 'baseKey', 'baseSource', 'baseName',
        'targetType', 'targetKey', 'targetSource', 'targetName',
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
 * Get a unique key for an entity
 * @param {Entity} entity
 * @returns {string}
 */
function getEntityKey(entity) {
    if (entity.locationIdentifier?.primaryAlias?.term) {
        return String(entity.locationIdentifier.primaryAlias.term);
    }
    if (entity.locationIdentifier?.toString) {
        return entity.locationIdentifier.toString();
    }
    return 'unknown';
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
window.universalCompareTo = universalCompareTo;
window.generateBestMatchesCSV = generateBestMatchesCSV;
