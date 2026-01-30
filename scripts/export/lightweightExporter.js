/**
 * Lightweight EntityGroupDatabase Exporter
 *
 * Purpose: Transform a full EntityGroupDatabase into a lightweight plain JSON format
 * suitable for consumption by simple environments like Google Apps Script.
 *
 * DESIGN PRINCIPLES:
 * 1. Generic property iteration - does NOT hardcode property names
 * 2. Reduction logic via reusable helpers - same logic applied across all properties
 * 3. Exclusions are the specified details, not the catalog of properties
 * 4. Outputs full group structure: foundingMember, members (non-duplicated), consensusEntity
 *
 * REDUCTION RULES (applied generically to all values):
 * - AttributedTerm objects -> just the term value (string/number)
 * - Aliased objects (with primaryAlias) -> recursively reduce the primaryAlias.term
 * - IdentifyingData/IndicativeData (with identifier) -> recursively reduce the identifier
 * - Structured objects (IndividualName, HouseholdName, Address) -> preserve structure, reduce nested values
 * - Arrays -> reduce each element
 * - Plain objects -> reduce each property value
 *
 * EXCLUDED PROPERTIES (stripped entirely):
 * - alternatives, homonyms, synonyms, candidates (alias classification data)
 * - sourceMap (attribution tracking)
 * - comparisonWeights, comparisonCalculator, comparisonCalculatorName (comparison machinery)
 * - type (serialization type marker - not needed in lightweight)
 *
 * @version 2.0
 * @date December 2025
 */

// Properties to exclude entirely from output
const EXCLUDED_PROPERTIES = new Set([
    'alternatives',
    'homonyms',
    'synonyms',
    'candidates',
    'sourceMap',
    'comparisonWeights',
    'comparisonCalculator',
    'comparisonCalculatorName',
    'type'  // serialization type marker
]);

/**
 * Core reduction function - applies lightweight transformation to any value
 * This is the single reusable helper that handles all reduction logic
 *
 * @param {*} value - Any value to reduce
 * @returns {*} Reduced value (primitive, plain object, or array)
 */
function reduceValue(value) {
    // Null/undefined pass through
    if (value === null || value === undefined) {
        return null;
    }

    // Primitives pass through unchanged
    if (typeof value !== 'object') {
        return value;
    }

    // Arrays - reduce each element
    if (Array.isArray(value)) {
        return value.map(item => reduceValue(item)).filter(item => item !== null);
    }

    // Object handling - check for unwrapping patterns first

    // Pattern 1: Aliased-like (has primaryAlias) -> unwrap and reduce the term
    if (value.primaryAlias !== undefined) {
        return reduceValue(value.primaryAlias);
    }

    // Pattern 2: Identifier wrapper (has identifier) -> unwrap and reduce
    if (value.identifier !== undefined) {
        return reduceValue(value.identifier);
    }

    // Pattern 3: Term-bearing (has term) -> extract term, recursively reduce if object
    if (value.term !== undefined) {
        const term = value.term;
        if (typeof term === 'object' && term !== null) {
            return reduceValue(term);
        }
        return term;
    }

    // Not a wrapper - reduce as structured object
    return reduceObject(value);
}

/**
 * Reduce a structured object by iterating its properties
 * Applies reduction to each property value, excludes specified properties
 *
 * @param {Object} obj - Object to reduce
 * @returns {Object} Reduced plain object
 */
function reduceObject(obj) {
    if (!obj || typeof obj !== 'object') {
        return null;
    }

    const reduced = {};
    let hasContent = false;

    // Iterate all own properties
    for (const key of Object.keys(obj)) {
        // Skip excluded properties
        if (EXCLUDED_PROPERTIES.has(key)) {
            continue;
        }

        const value = obj[key];

        // Skip null/undefined values
        if (value === null || value === undefined) {
            continue;
        }

        // Reduce the value
        const reducedValue = reduceValue(value);

        // Only include non-null reduced values
        if (reducedValue !== null && reducedValue !== undefined) {
            // Skip empty objects and empty arrays
            if (typeof reducedValue === 'object') {
                if (Array.isArray(reducedValue) && reducedValue.length === 0) {
                    continue;
                }
                if (!Array.isArray(reducedValue) && Object.keys(reducedValue).length === 0) {
                    continue;
                }
            }

            reduced[key] = reducedValue;
            hasContent = true;
        }
    }

    return hasContent ? reduced : null;
}

/**
 * Reduce an Entity to lightweight format
 * Uses generic property iteration - does not hardcode property names
 *
 * @param {Entity} entity - The entity to reduce
 * @returns {Object} Reduced plain object representation
 */
function reduceEntity(entity) {
    if (!entity) return null;

    // Get entity type for reference
    const entityType = entity.constructor?.name || entity.type || 'Entity';

    const reduced = {
        entityType: entityType
    };

    // Generic property iteration
    for (const key of Object.keys(entity)) {
        // Skip excluded properties
        if (EXCLUDED_PROPERTIES.has(key)) {
            continue;
        }

        // Skip type (we already captured entityType)
        if (key === 'type') {
            continue;
        }

        const value = entity[key];

        // Skip null/undefined
        if (value === null || value === undefined) {
            continue;
        }

        // Special handling for 'individuals' array in AggregateHousehold
        // These are nested entities that need full entity reduction
        if (key === 'individuals' && Array.isArray(value)) {
            const reducedIndividuals = value.map(ind => reduceEntity(ind)).filter(ind => ind !== null);
            if (reducedIndividuals.length > 0) {
                reduced[key] = reducedIndividuals;
            }
            continue;
        }

        // Standard reduction for all other properties
        const reducedValue = reduceValue(value);

        if (reducedValue !== null && reducedValue !== undefined) {
            // Skip empty objects/arrays
            if (typeof reducedValue === 'object') {
                if (Array.isArray(reducedValue) && reducedValue.length === 0) {
                    continue;
                }
                if (!Array.isArray(reducedValue) && Object.keys(reducedValue).length === 0) {
                    continue;
                }
            }

            reduced[key] = reducedValue;
        }
    }

    return reduced;
}

/**
 * Transform a single EntityGroup to lightweight format
 * Includes: foundingMember, members (non-duplicated), consensusEntity
 *
 * @param {EntityGroup} group - The group to transform
 * @param {Object} entityDatabase - The keyed entity database to look up members
 * @returns {Object} Plain object representation with full member data
 */
function transformEntityGroup(group, entityDatabase) {
    const result = {
        index: group.index,
        foundingMemberKey: group.foundingMemberKey,
        memberKeys: group.memberKeys ? group.memberKeys.slice() : [],
        nearMissKeys: group.nearMissKeys ? group.nearMissKeys.slice() : [],
        hasBloomerangMember: group.hasBloomerangMember,
        constructionPhase: group.constructionPhase
    };

    // Get founding member entity and reduce it
    if (group.foundingMemberKey && entityDatabase) {
        const foundingEntity = entityDatabase[group.foundingMemberKey];
        if (foundingEntity) {
            result.foundingMember = reduceEntity(foundingEntity);
        }
    }

    // Get all members EXCEPT founding member (to avoid duplication)
    if (group.memberKeys && group.memberKeys.length > 0 && entityDatabase) {
        const otherMembers = [];
        for (const key of group.memberKeys) {
            // Skip founding member - already included separately
            if (key === group.foundingMemberKey) {
                continue;
            }
            const memberEntity = entityDatabase[key];
            if (memberEntity) {
                const reducedMember = reduceEntity(memberEntity);
                if (reducedMember) {
                    // Include the key so we know which entity this is
                    reducedMember._key = key;
                    otherMembers.push(reducedMember);
                }
            }
        }
        if (otherMembers.length > 0) {
            result.members = otherMembers;
        }
    }

    // Reduce consensus entity if present
    if (group.consensusEntity) {
        result.consensusEntity = reduceEntity(group.consensusEntity);
    }

    return result;
}

/**
 * Transform an EntityGroupDatabase into lightweight plain JSON format
 *
 * @param {EntityGroupDatabase} entityGroupDatabase - The full database to transform
 * @param {Object} entityDatabase - The unified entity database (unifiedEntityDatabase.entities)
 * @returns {Object} Plain JSON object suitable for lightweight use
 */
function exportLightweightEntityGroupDatabase(entityGroupDatabase, entityDatabase = null) {
    if (!entityGroupDatabase) {
        console.error('[LightweightExporter] No EntityGroupDatabase provided');
        return null;
    }

    // Try to get entityDatabase from global if not provided
    if (!entityDatabase) {
        if (typeof window !== 'undefined' && window.unifiedEntityDatabase && window.unifiedEntityDatabase.entities) {
            entityDatabase = window.unifiedEntityDatabase.entities;
        } else {
            console.warn('[LightweightExporter] No entityDatabase provided - members will not be included');
        }
    }

    console.log('[LightweightExporter] Starting lightweight export...');
    const startTime = performance.now();

    const lightweight = {
        type: 'LightweightEntityGroupDatabase',
        version: '2.0',
        exportedAt: new Date().toISOString(),
        sourceVersion: entityGroupDatabase.constructionConfig?.version || 'unknown',

        // Metadata
        nextIndex: entityGroupDatabase.nextIndex,
        constructionTimestamp: entityGroupDatabase.constructionTimestamp,
        constructionComplete: entityGroupDatabase.constructionComplete,
        stats: entityGroupDatabase.stats,

        // Groups
        groups: {}
    };

    // Transform each group
    const groupKeys = Object.keys(entityGroupDatabase.groups);
    for (const key of groupKeys) {
        const group = entityGroupDatabase.groups[key];
        lightweight.groups[key] = transformEntityGroup(group, entityDatabase);
    }

    const endTime = performance.now();
    console.log(`[LightweightExporter] Export complete in ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`[LightweightExporter] Transformed ${groupKeys.length} groups`);

    return lightweight;
}

/**
 * Convenience function to export and get the JSON string
 *
 * @param {EntityGroupDatabase} entityGroupDatabase - The database to export
 * @param {Object} entityDatabase - The unified entity database (optional)
 * @returns {string} JSON string of the lightweight database
 */
function exportLightweightJSON(entityGroupDatabase, entityDatabase = null) {
    const lightweight = exportLightweightEntityGroupDatabase(entityGroupDatabase, entityDatabase);
    if (!lightweight) return null;

    return JSON.stringify(lightweight);
}

/**
 * Convenience function to export and download as file
 *
 * @param {EntityGroupDatabase} entityGroupDatabase - The database to export
 * @param {string} filename - Optional filename (default: 'entityGroups_lightweight.json')
 * @param {Object} entityDatabase - The unified entity database (optional)
 */
function downloadLightweightExport(entityGroupDatabase, filename = 'entityGroups_lightweight.json', entityDatabase = null) {
    // Ensure consensus entities are built (auto-builds if needed)
    const entDb = entityDatabase || window.unifiedEntityDatabase?.entities;
    if (typeof ensureConsensusBuilt === 'function' && entDb) {
        ensureConsensusBuilt(entityGroupDatabase, entDb);
    }

    const jsonString = exportLightweightJSON(entityGroupDatabase, entityDatabase);
    if (!jsonString) {
        console.error('[LightweightExporter] Export failed, nothing to download');
        return;
    }

    // Create download
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Report size
    const sizeKB = (jsonString.length / 1024).toFixed(2);
    const sizeMB = (jsonString.length / (1024 * 1024)).toFixed(2);
    console.log(`[LightweightExporter] Downloaded ${filename}: ${sizeKB} KB (${sizeMB} MB)`);
}

/**
 * Compare sizes between full serialization and lightweight export
 * Useful for measuring the size reduction
 *
 * @param {EntityGroupDatabase|Object} entityGroupDatabase - The database to compare
 * @param {Object} entityDatabase - The unified entity database (optional)
 * @returns {Object} Size comparison results
 */
function compareSizes(entityGroupDatabase, entityDatabase = null) {
    if (!entityGroupDatabase) {
        console.error('[LightweightExporter] No database provided for comparison');
        return null;
    }

    console.log('[LightweightExporter] Comparing full vs lightweight sizes...');

    // Full serialization size
    let fullSerialized;
    if (typeof entityGroupDatabase.serialize === 'function') {
        fullSerialized = JSON.stringify(entityGroupDatabase.serialize());
    } else {
        fullSerialized = JSON.stringify(entityGroupDatabase);
    }
    const fullSize = fullSerialized.length;

    // Lightweight export size
    const lightweightSerialized = exportLightweightJSON(entityGroupDatabase, entityDatabase);
    const lightweightSize = lightweightSerialized ? lightweightSerialized.length : 0;

    const reduction = fullSize > 0 ? ((1 - lightweightSize / fullSize) * 100).toFixed(1) : 0;

    const result = {
        fullSizeBytes: fullSize,
        fullSizeKB: (fullSize / 1024).toFixed(2),
        fullSizeMB: (fullSize / (1024 * 1024)).toFixed(2),
        lightweightSizeBytes: lightweightSize,
        lightweightSizeKB: (lightweightSize / 1024).toFixed(2),
        lightweightSizeMB: (lightweightSize / (1024 * 1024)).toFixed(2),
        reductionPercent: reduction
    };

    console.log(`[LightweightExporter] Full: ${result.fullSizeMB} MB, Lightweight: ${result.lightweightSizeMB} MB, Reduction: ${reduction}%`);

    return result;
}

/**
 * Debug utility: Show what a single entity looks like after reduction
 *
 * @param {Entity} entity - Entity to preview
 * @returns {Object} Reduced entity preview
 */
function previewEntityReduction(entity) {
    console.log('[LightweightExporter] Original entity:', entity);
    const reduced = reduceEntity(entity);
    console.log('[LightweightExporter] Reduced entity:', reduced);
    return reduced;
}

/**
 * Debug utility: Show what a single group looks like after transformation
 *
 * @param {EntityGroup} group - Group to preview
 * @param {Object} entityDatabase - Entity database for member lookup
 * @returns {Object} Transformed group preview
 */
function previewGroupTransformation(group, entityDatabase = null) {
    if (!entityDatabase && typeof window !== 'undefined' && window.unifiedEntityDatabase) {
        entityDatabase = window.unifiedEntityDatabase.entities;
    }
    console.log('[LightweightExporter] Original group:', group);
    const transformed = transformEntityGroup(group, entityDatabase);
    console.log('[LightweightExporter] Transformed group:', transformed);
    return transformed;
}


// Export to global scope for browser use
if (typeof window !== 'undefined') {
    window.exportLightweightEntityGroupDatabase = exportLightweightEntityGroupDatabase;
    window.exportLightweightJSON = exportLightweightJSON;
    window.downloadLightweightExport = downloadLightweightExport;
    window.compareSizes = compareSizes;
    window.previewEntityReduction = previewEntityReduction;
    window.previewGroupTransformation = previewGroupTransformation;
    // Also expose the core reduction functions for debugging
    window.reduceValue = reduceValue;
    window.reduceEntity = reduceEntity;
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        exportLightweightEntityGroupDatabase,
        exportLightweightJSON,
        downloadLightweightExport,
        compareSizes,
        previewEntityReduction,
        previewGroupTransformation,
        reduceValue,
        reduceEntity,
        EXCLUDED_PROPERTIES
    };
}
