/**
 * Fire Number Collision Handler
 *
 * Handles cases where multiple PIDs share the same fire number during VisionAppraisal
 * entity creation. Determines if records represent the same owner (merge) or different
 * owners (create separate entity with suffix).
 *
 * Key Design Decisions:
 * - Uses SECONDARY ADDRESSES ONLY for contactInfo comparison (primary addresses are
 *   Block Island property locations which will be identical/similar for same fire number)
 * - Same owner determined by: overall>92% OR name>95% OR contactInfo>95%
 * - Same owner records are merged into one entity with subdivision tracking
 * - Different owner records get suffixed fire numbers (A, B, C...)
 *
 * IMPORTANT: When a collision is detected, the new entity is compared against ALL
 * existing entities for that fire number (not just the first one). This ensures
 * that if owners A, B exist and a new record matches B, it merges with B correctly.
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const SAME_OWNER_THRESHOLDS = {
    overall: 0.92,      // Overall similarity > 92%
    name: 0.95,         // OR name similarity > 95%
    contactInfo: 0.95   // OR contactInfo similarity > 95%
};

// Suffix sequence for different owners at same fire number
const SUFFIX_SEQUENCE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// ============================================================================
// FIRE NUMBER REGISTRY
// ============================================================================

/**
 * Registry to track used fire numbers during entity creation session
 * Structure: Map<baseFireNumber, {
 *   entities: Array<{ entity: Entity, suffix: string|null, fireNumber: string }>,
 *   suffixesUsed: string[]
 * }>
 *
 * Each base fire number tracks ALL entities that use it (with or without suffix)
 */
let fireNumberRegistry = new Map();

/**
 * Initialize/reset the fire number registry
 * Call at the start of each VisionAppraisal processing session
 */
function initializeRegistry() {
    fireNumberRegistry = new Map();
}

/**
 * Register a fire number with its associated entity
 * @param {string} fireNumber - The fire number (may include suffix)
 * @param {Entity} entity - The entity using this fire number
 */
function registerFireNumber(fireNumber, entity) {
    // Extract base fire number (without suffix) for tracking
    const baseFireNumber = getBaseFireNumber(fireNumber);

    // Reject blank/null/undefined fire numbers - do not register them
    if (!baseFireNumber) {
        return;
    }

    const suffix = getSuffix(fireNumber, baseFireNumber);

    if (!fireNumberRegistry.has(baseFireNumber)) {
        fireNumberRegistry.set(baseFireNumber, {
            entities: [],
            suffixesUsed: []
        });
    }

    const entry = fireNumberRegistry.get(baseFireNumber);

    // Add entity to the list
    entry.entities.push({
        entity: entity,
        suffix: suffix,
        fireNumber: fireNumber
    });

    // Track suffix if present
    if (suffix && !entry.suffixesUsed.includes(suffix)) {
        entry.suffixesUsed.push(suffix);
    }
}

/**
 * Check if a fire number is already in use
 * @param {string} fireNumber - The fire number to check
 * @returns {boolean} True if fire number is registered
 */
function isFireNumberUsed(fireNumber) {
    const baseFireNumber = getBaseFireNumber(fireNumber);
    return fireNumberRegistry.has(baseFireNumber);
}

/**
 * Get ALL entities registered for a base fire number
 * @param {string} fireNumber - The fire number to look up
 * @returns {Array<{entity: Entity, suffix: string|null, fireNumber: string}>} Array of entity records
 */
function getAllEntitiesForFireNumber(fireNumber) {
    const baseFireNumber = getBaseFireNumber(fireNumber);
    const entry = fireNumberRegistry.get(baseFireNumber);
    return entry ? entry.entities : [];
}

/**
 * Get the first entity registered for a fire number (for backward compatibility)
 * @param {string} fireNumber - The fire number to look up
 * @returns {Entity|null} The first registered entity or null
 */
function getEntityForFireNumber(fireNumber) {
    const entities = getAllEntitiesForFireNumber(fireNumber);
    return entities.length > 0 ? entities[0].entity : null;
}

/**
 * Get the next available suffix for a fire number
 * @param {string} fireNumber - The base fire number
 * @returns {string} Next available suffix (A, B, C, etc.)
 */
function getNextAvailableSuffix(fireNumber) {
    const baseFireNumber = getBaseFireNumber(fireNumber);
    const entry = fireNumberRegistry.get(baseFireNumber);

    if (!entry) {
        return SUFFIX_SEQUENCE[0]; // 'A'
    }

    const usedSuffixes = entry.suffixesUsed;
    for (const suffix of SUFFIX_SEQUENCE) {
        if (!usedSuffixes.includes(suffix)) {
            return suffix;
        }
    }

    // Fallback if all 26 suffixes used (very unlikely)
    return `${SUFFIX_SEQUENCE.length + 1}`;
}

/**
 * Clear the registry (for testing or session reset)
 */
function clearRegistry() {
    fireNumberRegistry = new Map();
}

/**
 * Get registry stats for debugging
 * @returns {Object} Statistics about the registry
 */
function getRegistryStats() {
    let totalEntities = 0;
    let fireNumbersWithMultipleOwners = 0;

    fireNumberRegistry.forEach((entry) => {
        totalEntities += entry.entities.length;
        if (entry.suffixesUsed.length > 0) {
            fireNumbersWithMultipleOwners++;
        }
    });

    return {
        totalBaseFireNumbers: fireNumberRegistry.size,
        totalEntities: totalEntities,
        fireNumbersWithMultipleOwners: fireNumbersWithMultipleOwners
    };
}

/**
 * Get detailed registry contents for debugging
 * @returns {Array} Array of fire number entries with details
 */
function getRegistryDetails() {
    const details = [];
    fireNumberRegistry.forEach((entry, baseFireNumber) => {
        details.push({
            baseFireNumber,
            entityCount: entry.entities.length,
            suffixesUsed: [...entry.suffixesUsed],
            entities: entry.entities.map(e => ({
                fireNumber: e.fireNumber,
                suffix: e.suffix,
                pid: extractPidFromEntity(e.entity),
                name: e.entity?.name?.toString?.() || 'unknown'
            }))
        });
    });
    return details;
}

// ============================================================================
// FIRE NUMBER UTILITIES
// ============================================================================

/**
 * Extract base fire number (remove any suffix)
 * @param {string} fireNumber - Fire number possibly with suffix
 * @returns {string} Base fire number without suffix
 */
function getBaseFireNumber(fireNumber) {
    if (!fireNumber && fireNumber !== 0) return '';

    // Convert to string to handle numeric fire numbers (e.g., 247 vs "247")
    const fireNumberStr = String(fireNumber).trim();

    // Reject empty strings after conversion
    if (!fireNumberStr) return '';

    // Fire numbers are typically numeric; suffix is a trailing letter
    // e.g., "1234A" -> "1234", "1234" -> "1234"
    const match = fireNumberStr.match(/^(\d+)([A-Z])?$/);
    if (match) {
        return match[1];
    }
    return fireNumberStr;
}

/**
 * Get suffix from a fire number
 * @param {string} fireNumber - Full fire number
 * @param {string} baseFireNumber - Base fire number
 * @returns {string|null} Suffix letter or null
 */
function getSuffix(fireNumber, baseFireNumber) {
    if (!fireNumber || !baseFireNumber) return null;

    // Convert to strings for consistent comparison
    const fireNumberStr = String(fireNumber);
    const baseFireNumberStr = String(baseFireNumber);

    if (fireNumberStr === baseFireNumberStr) return null;

    const suffix = fireNumberStr.slice(baseFireNumberStr.length);
    return suffix.length === 1 && /[A-Z]/.test(suffix) ? suffix : null;
}

// ============================================================================
// COMPARISON FUNCTIONS
// ============================================================================

/**
 * Compare two ContactInfo objects using ONLY secondary addresses
 * Primary addresses are excluded because they are Block Island property locations
 * which will be identical or very similar for records sharing the same fire number.
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
            if (addr1 && addr2) {
                const similarity = addr1.compareTo(addr2);
                if (similarity > bestSimilarity) {
                    bestSimilarity = similarity;
                }
            }
        }
    }

    return bestSimilarity;
}

/**
 * Compare two entities for fire number collision resolution
 * Uses standard name comparison but modified contactInfo comparison
 * (secondary addresses only, excluding primary)
 *
 * @param {Entity} entity1 - Existing entity using the fire number
 * @param {Entity} entity2 - New entity attempting to use same fire number
 * @returns {Object} Comparison result with similarity scores and decision
 */
function compareForFireNumberCollision(entity1, entity2) {
    // 1. Get name similarity using standard compareTo
    let nameSimilarity = 0;
    try {
        if (entity1.name && entity2.name) {
            nameSimilarity = entity1.name.compareTo(entity2.name);
        }
    } catch (e) {
        console.warn('Name comparison failed:', e.message);
    }

    // 2. Get contactInfo similarity using SECONDARY ADDRESSES ONLY
    let contactInfoSimilarity = 0;
    try {
        if (entity1.contactInfo && entity2.contactInfo) {
            contactInfoSimilarity = compareSecondaryAddressesOnly(
                entity1.contactInfo,
                entity2.contactInfo
            );
        }
    } catch (e) {
        console.warn('ContactInfo comparison failed:', e.message);
    }

    // 3. Calculate overall similarity
    // Use modified weights since we're only using secondary addresses for contactInfo
    // Name becomes more important since contactInfo comparison is limited
    const nameWeight = 0.7;
    const contactInfoWeight = 0.3;

    const overallSimilarity = (nameSimilarity * nameWeight) +
                              (contactInfoSimilarity * contactInfoWeight);

    // 4. Determine if same owner
    const isSameOwner = (
        overallSimilarity > SAME_OWNER_THRESHOLDS.overall ||
        nameSimilarity > SAME_OWNER_THRESHOLDS.name ||
        contactInfoSimilarity > SAME_OWNER_THRESHOLDS.contactInfo
    );

    return {
        isSameOwner,
        overallSimilarity: Number(overallSimilarity.toFixed(10)),
        nameSimilarity: Number(nameSimilarity.toFixed(10)),
        contactInfoSimilarity: Number(contactInfoSimilarity.toFixed(10)),
        thresholds: SAME_OWNER_THRESHOLDS,
        decision: isSameOwner ? 'SAME_OWNER' : 'DIFFERENT_OWNER',
        reasoning: buildReasoningString(overallSimilarity, nameSimilarity, contactInfoSimilarity, isSameOwner)
    };
}

/**
 * Find best matching entity from a list of existing entities
 * Compares new entity against ALL existing entities and returns the best match
 *
 * @param {Entity} newEntity - New entity to compare
 * @param {Array<{entity: Entity, suffix: string|null, fireNumber: string}>} existingEntities - List of existing entities
 * @returns {Object} Best match result with matched entity and comparison details
 */
function findBestMatchingEntity(newEntity, existingEntities) {
    let bestMatch = null;
    let bestComparison = null;
    let bestScore = -1;

    for (const existingRecord of existingEntities) {
        const comparison = compareForFireNumberCollision(existingRecord.entity, newEntity);

        // If this is a same-owner match, track the best one
        if (comparison.isSameOwner) {
            // Use overall similarity as the score for ranking matches
            if (comparison.overallSimilarity > bestScore) {
                bestScore = comparison.overallSimilarity;
                bestMatch = existingRecord;
                bestComparison = comparison;
            }
        }
    }

    return {
        found: bestMatch !== null,
        matchedRecord: bestMatch,
        comparison: bestComparison,
        allComparisons: existingEntities.map(rec => ({
            fireNumber: rec.fireNumber,
            suffix: rec.suffix,
            comparison: compareForFireNumberCollision(rec.entity, newEntity)
        }))
    };
}

/**
 * Build a human-readable reasoning string for the decision
 */
function buildReasoningString(overall, name, contactInfo, isSameOwner) {
    const parts = [];

    if (overall > SAME_OWNER_THRESHOLDS.overall) {
        parts.push(`overall ${(overall * 100).toFixed(1)}% > ${SAME_OWNER_THRESHOLDS.overall * 100}%`);
    }
    if (name > SAME_OWNER_THRESHOLDS.name) {
        parts.push(`name ${(name * 100).toFixed(1)}% > ${SAME_OWNER_THRESHOLDS.name * 100}%`);
    }
    if (contactInfo > SAME_OWNER_THRESHOLDS.contactInfo) {
        parts.push(`contactInfo ${(contactInfo * 100).toFixed(1)}% > ${SAME_OWNER_THRESHOLDS.contactInfo * 100}%`);
    }

    if (isSameOwner) {
        return `SAME OWNER: ${parts.join(' OR ')}`;
    } else {
        return `DIFFERENT OWNER: overall=${(overall * 100).toFixed(1)}%, name=${(name * 100).toFixed(1)}%, contactInfo=${(contactInfo * 100).toFixed(1)}% (all below thresholds)`;
    }
}

// ============================================================================
// MAIN COLLISION HANDLER
// ============================================================================

/**
 * Handle fire number collision during entity creation
 *
 * IMPORTANT: When a collision is detected, the new entity is compared against ALL
 * existing entities for that fire number. If ANY existing entity matches (same owner),
 * the new entity is merged into that matching entity. Only if NO existing entities
 * match is a new suffixed entity created.
 *
 * @param {Entity} newEntity - Newly created entity
 * @param {string} fireNumber - Fire number being used
 * @returns {Object} Result object with action and details
 */
function handleFireNumberCollision(newEntity, fireNumber) {
    // TEMPORARY: Disable collision handler while we analyze cross-type comparison issue
    // Set to false to re-enable collision detection
    const COLLISION_HANDLER_DISABLED = true;
    if (COLLISION_HANDLER_DISABLED) {
        return {
            action: 'REGISTERED',
            entity: newEntity,
            suffix: null,
            mergedPid: null,
            message: 'Collision handler temporarily disabled'
        };
    }

    if (!fireNumber) {
        return {
            action: 'NO_FIRE_NUMBER',
            entity: newEntity,
            suffix: null,
            mergedPid: null,
            message: 'No fire number provided'
        };
    }

    const baseFireNumber = getBaseFireNumber(fireNumber);

    if (!isFireNumberUsed(baseFireNumber)) {
        // First use of this fire number - register and return
        registerFireNumber(baseFireNumber, newEntity);
        return {
            action: 'REGISTERED',
            entity: newEntity,
            suffix: null,
            mergedPid: null,
            message: `Fire number ${baseFireNumber} registered`
        };
    }

    // Collision detected - compare against ALL existing entities for this fire number
    const existingEntities = getAllEntitiesForFireNumber(baseFireNumber);
    const matchResult = findBestMatchingEntity(newEntity, existingEntities);

    if (matchResult.found) {
        // SAME OWNER FOUND: Merge new entity's PID into the matching entity's otherInfo.subdivision
        const matchedEntity = matchResult.matchedRecord.entity;
        const newPid = extractPidFromEntity(newEntity);

        // Add to subdivision
        if (matchedEntity.otherInfo) {
            matchedEntity.otherInfo.addSubdivisionEntry(newPid, newEntity);
        }

        return {
            action: 'MERGED',
            entity: matchedEntity,
            mergedIntoFireNumber: matchResult.matchedRecord.fireNumber,
            suffix: null,
            mergedPid: newPid,
            comparison: matchResult.comparison,
            allComparisons: matchResult.allComparisons,
            message: `Merged PID ${newPid} into entity with fire number ${matchResult.matchedRecord.fireNumber}`
        };
    } else {
        // NO MATCHING OWNER: Create with suffix
        const suffix = getNextAvailableSuffix(baseFireNumber);
        const modifiedFireNumber = baseFireNumber + suffix;

        // Modify the entity's fire number display (in locationIdentifier)
        modifyEntityFireNumberDisplay(newEntity, modifiedFireNumber);

        // Register the suffixed fire number
        registerFireNumber(modifiedFireNumber, newEntity);

        return {
            action: 'CREATED_WITH_SUFFIX',
            entity: newEntity,
            suffix: suffix,
            originalFireNumber: baseFireNumber,
            newFireNumber: modifiedFireNumber,
            mergedPid: null,
            allComparisons: matchResult.allComparisons,
            message: `Created entity with suffixed fire number ${modifiedFireNumber} (no matching owner among ${existingEntities.length} existing entities)`
        };
    }
}

// ============================================================================
// ENTITY UTILITIES
// ============================================================================

/**
 * Extract PID from an entity
 * @param {Entity} entity - Entity to extract PID from
 * @returns {string|null} PID or null
 */
function extractPidFromEntity(entity) {
    // PID is typically in locationIdentifier
    if (entity.locationIdentifier) {
        // Check for pid property
        if (entity.locationIdentifier.pid) {
            // Could be IndicativeData or SimpleIdentifier structure
            if (entity.locationIdentifier.pid.identifier?.primaryAlias?.term) {
                return entity.locationIdentifier.pid.identifier.primaryAlias.term;
            }
            if (typeof entity.locationIdentifier.pid === 'string') {
                return entity.locationIdentifier.pid;
            }
        }

        // Check for propertyId
        if (entity.locationIdentifier.propertyId) {
            if (entity.locationIdentifier.propertyId.identifier?.primaryAlias?.term) {
                return entity.locationIdentifier.propertyId.identifier.primaryAlias.term;
            }
            if (typeof entity.locationIdentifier.propertyId === 'string') {
                return entity.locationIdentifier.propertyId;
            }
        }
    }

    return null;
}

/**
 * Modify entity's fire number display to include suffix
 * This only modifies the display value, not the underlying data
 * @param {Entity} entity - Entity to modify
 * @param {string} newFireNumber - New fire number with suffix
 */
function modifyEntityFireNumberDisplay(entity, newFireNumber) {
    if (entity.locationIdentifier?.fireNumber) {
        // Check structure and modify appropriately
        if (entity.locationIdentifier.fireNumber.identifier?.primaryAlias?.term) {
            entity.locationIdentifier.fireNumber.identifier.primaryAlias.term = newFireNumber;
        } else if (typeof entity.locationIdentifier.fireNumber === 'string') {
            entity.locationIdentifier.fireNumber = newFireNumber;
        }
    }
}

/**
 * Extract fire number from an entity
 * @param {Entity} entity - Entity to extract fire number from
 * @returns {string|null} Fire number or null
 */
function extractFireNumberFromEntity(entity) {
    if (entity.locationIdentifier?.fireNumber) {
        if (entity.locationIdentifier.fireNumber.identifier?.primaryAlias?.term) {
            return entity.locationIdentifier.fireNumber.identifier.primaryAlias.term;
        }
        if (typeof entity.locationIdentifier.fireNumber === 'string') {
            return entity.locationIdentifier.fireNumber;
        }
    }
    return null;
}

// ============================================================================
// EXPORTS
// ============================================================================

// Export for use in other modules (browser environment uses globals)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // Constants
        SAME_OWNER_THRESHOLDS,
        SUFFIX_SEQUENCE,

        // Registry functions
        initializeRegistry,
        registerFireNumber,
        isFireNumberUsed,
        getEntityForFireNumber,
        getAllEntitiesForFireNumber,
        getNextAvailableSuffix,
        clearRegistry,
        getRegistryStats,
        getRegistryDetails,

        // Fire number utilities
        getBaseFireNumber,
        getSuffix,

        // Comparison functions
        compareSecondaryAddressesOnly,
        compareForFireNumberCollision,
        findBestMatchingEntity,

        // Main handler
        handleFireNumberCollision,

        // Entity utilities
        extractPidFromEntity,
        modifyEntityFireNumberDisplay,
        extractFireNumberFromEntity
    };
}
