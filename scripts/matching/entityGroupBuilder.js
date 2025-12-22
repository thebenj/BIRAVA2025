/**
 * EntityGroupBuilder - Orchestrates the 5-phase construction of EntityGroups
 *
 * This module implements the construction algorithm that builds EntityGroups
 * from the unified entity database. It processes entities in a specific order
 * (Bloomerang households first, then VisionAppraisal households, etc.) and
 * uses existing matching criteria (isTrueMatch, isNearMatch) to group entities.
 *
 * Dependencies:
 * - EntityGroup, EntityGroupDatabase from objectStructure/entityGroup.js
 * - isTrueMatch, isNearMatch from unifiedEntityBrowser.js
 * - getAllEntitiesWithKeys, getFilteredEntities from unifiedDatabasePersistence.js
 * - universalCompareTo from universalEntityMatcher.js
 * - serializeWithTypes from utils/classSerializationUtils.js (for Google Drive save)
 *
 * @see reference_projectRoadmap.md Section 4 for full specification
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

// Google Drive file ID for EntityGroupDatabase persistence
const ENTITYGROUP_DATABASE_FILE_ID = '18uVAvUBIwvqTKTOLCulgVyCtU_uqWFlr';

/**
 * Build EntityGroupDatabase from the unified entity database
 *
 * Executes the 5-phase construction process:
 * 1. Bloomerang Households - each becomes founding entity
 * 2. VisionAppraisal Households - remaining become founding entities
 * 3. Bloomerang Individuals - remaining form new groups
 * 4. VisionAppraisal Individuals - remaining form new groups
 * 5. Other entity types - remaining (Bloomerang first, then VisionAppraisal)
 *
 * @param {Object} options - Construction options
 * @param {boolean} [options.verbose=true] - Log progress to console
 * @param {boolean} [options.buildConsensus=true] - Build consensus entities after construction
 * @param {boolean} [options.saveToGoogleDrive=true] - Save to Google Drive after construction
 * @param {string} [options.googleDriveFileId] - Override default file ID for save
 * @param {number} [options.sampleSize] - If provided, use stratified sample of this size (for testing)
 * @param {number} [options.sampleSeed=12345] - Random seed for reproducible sampling
 * @returns {Promise<EntityGroupDatabase>} The constructed database
 */
async function buildEntityGroupDatabase(options = {}) {
    const config = {
        verbose: true,
        buildConsensus: true,
        saveToGoogleDrive: true,
        googleDriveFileId: ENTITYGROUP_DATABASE_FILE_ID,
        sampleSize: null,  // null = full database, number = stratified sample
        sampleSeed: 12345,
        ...options
    };

    const log = config.verbose ? console.log.bind(console) : () => {};

    log('=== ENTITY GROUP CONSTRUCTION STARTING ===');
    log(`Timestamp: ${new Date().toISOString()}`);

    // Verify entity database is loaded
    if (!window.unifiedEntityDatabase || !window.unifiedEntityDatabase.entities) {
        console.error('ERROR: Unified entity database not loaded. Please load entities first.');
        return null;
    }

    const fullEntityDb = window.unifiedEntityDatabase.entities;
    const totalEntities = Object.keys(fullEntityDb).length;
    log(`Total entities in full database: ${totalEntities}`);

    // Create sample if sampleSize is specified
    let entityDb;
    if (config.sampleSize && config.sampleSize < totalEntities) {
        log(`\n[SAMPLE MODE] Using stratified sample for testing`);
        entityDb = createStratifiedSample(fullEntityDb, config.sampleSize, config.sampleSeed);
        log(`[SAMPLE MODE] Sample created with ${Object.keys(entityDb).length} entities\n`);
    } else {
        entityDb = fullEntityDb;
        log(`Using full database (${totalEntities} entities)`);
    }

    // Create new EntityGroupDatabase
    const groupDb = new EntityGroupDatabase();
    groupDb.constructionTimestamp = new Date().toISOString();

    // Record sample mode info if applicable
    if (config.sampleSize && config.sampleSize < totalEntities) {
        groupDb.sampleMode = {
            enabled: true,
            requestedSize: config.sampleSize,
            actualSize: Object.keys(entityDb).length,
            seed: config.sampleSeed,
            fullDatabaseSize: totalEntities
        };
    } else {
        groupDb.sampleMode = { enabled: false };
    }

    // Execute each phase
    log('\n--- Phase 1: VisionAppraisal Households ---');
    executePhase2_VisionAppraisalHouseholds(groupDb, entityDb, log);

    log('\n--- Phase 2: Bloomerang Households ---');
    executePhase1_BloomerangHouseholds(groupDb, entityDb, log);

    log('\n--- Phase 3: Remaining VisionAppraisal Individuals ---');
    executePhase4_VisionAppraisalIndividuals(groupDb, entityDb, log);

    log('\n--- Phase 4: Remaining Bloomerang Individuals ---');
    executePhase3_BloomerangIndividuals(groupDb, entityDb, log);

    log('\n--- Phase 5: Remaining Entity Types ---');
    executePhase5_RemainingEntities(groupDb, entityDb, log);

    // Mark construction complete
    groupDb.constructionComplete = true;
    groupDb.updateStats();

    // Build consensus entities if requested
    if (config.buildConsensus) {
        log('\n--- Building Consensus Entities ---');
        groupDb.buildAllConsensusEntities(entityDb);
        log(`Built consensus for ${groupDb.stats.multiMemberGroups} multi-member groups`);
    }

    log('\n=== ENTITY GROUP CONSTRUCTION COMPLETE ===');
    log(groupDb.getSummary());

    // Save to Google Drive if requested - always creates NEW files
    if (config.saveToGoogleDrive) {
        log('\n--- Saving EntityGroupDatabase and Reference File to NEW Google Drive Files ---');
        try {
            const saveResult = await saveEntityGroupDatabaseAndReferenceToNewFiles(groupDb, null, log);
            log(`Database save complete: ${saveResult.database.fileName}`);
            log(`Reference save complete: ${saveResult.reference.fileName}`);
            log('');
            log('╔══════════════════════════════════════════════════════════════╗');
            log('║  NEW FILE IDs - COPY THESE FOR FUTURE USE                    ║');
            log('╠══════════════════════════════════════════════════════════════╣');
            log(`║  Database File ID:  ${saveResult.database.fileId}  ║`);
            log(`║  Reference File ID: ${saveResult.reference.fileId}  ║`);
            log('╚══════════════════════════════════════════════════════════════╝');
        } catch (error) {
            console.error('Error saving to Google Drive:', error);
            log('WARNING: EntityGroupDatabase was built but failed to save to Google Drive');
        }
    }

    // Store in global for access
    window.entityGroupDatabase = groupDb;

    return groupDb;
}

/**
 * Phase 1: Process Bloomerang Households
 * Each Bloomerang household becomes the founding entity of a new group.
 * Find true matches and near misses among ALL remaining entities.
 */
function executePhase1_BloomerangHouseholds(groupDb, entityDb, log) {
    const phase = 1;
    let groupsCreated = 0;
    let membersAdded = 0;
    let nearMissesAdded = 0;
    let forcedAdded = 0;
    let householdPulledAdded = 0;

    // Get all Bloomerang AggregateHouseholds
    const bloomerangHouseholds = getEntitiesBySourceAndType(entityDb, 'bloomerang', 'AggregateHousehold');
    log(`Found ${bloomerangHouseholds.length} Bloomerang households`);

    for (const [key, entity] of bloomerangHouseholds) {
        // Skip if already assigned
        if (groupDb.isEntityAssigned(key)) {
            continue;
        }

        // Create new group with this household as founding member
        const group = groupDb.createGroup(key, phase);
        if (!group) continue;

        group.updateBloomerangFlag(true);  // Bloomerang entity
        groupsCreated++;

        // Use 9-step algorithm to build group membership
        const groupMembers = buildGroupForFounder(key, entity, groupDb, entityDb);

        // Add natural matches as members
        for (const match of groupMembers.naturalMatches) {
            const matchEntity = match.entity || entityDb[match.key];
            if (groupDb.addMemberToGroup(group.index, match.key)) {
                group.updateBloomerangFlag(isBloomerangKey(match.key));
                membersAdded++;

                // If matched entity is a household, mark its individuals as assigned too
                if (matchEntity) {
                    markHouseholdIndividualsAsAssigned(match.key, matchEntity, groupDb, entityDb);
                }
            }
        }

        // Add founder forced matches
        for (const forcedKey of groupMembers.founderForced) {
            const forcedEntity = entityDb[forcedKey];
            if (groupDb.addMemberToGroup(group.index, forcedKey)) {
                group.updateBloomerangFlag(isBloomerangKey(forcedKey));
                forcedAdded++;
                if (forcedEntity) {
                    markHouseholdIndividualsAsAssigned(forcedKey, forcedEntity, groupDb, entityDb);
                }
            }
        }

        // Add forced-from-naturals
        for (const forcedKey of groupMembers.forcedFromNaturals) {
            const forcedEntity = entityDb[forcedKey];
            if (groupDb.addMemberToGroup(group.index, forcedKey)) {
                group.updateBloomerangFlag(isBloomerangKey(forcedKey));
                forcedAdded++;
                if (forcedEntity) {
                    markHouseholdIndividualsAsAssigned(forcedKey, forcedEntity, groupDb, entityDb);
                }
            }
        }

        // Add household-pulled members (Step 9)
        for (const pulledKey of groupMembers.householdPulled) {
            const pulledEntity = entityDb[pulledKey];
            if (groupDb.addMemberToGroup(group.index, pulledKey)) {
                group.updateBloomerangFlag(isBloomerangKey(pulledKey));
                householdPulledAdded++;
                if (pulledEntity) {
                    markHouseholdIndividualsAsAssigned(pulledKey, pulledEntity, groupDb, entityDb);
                }
            }
        }

        // Add near misses (not marked as assigned)
        for (const nearMiss of groupMembers.nearMisses) {
            groupDb.addNearMissToGroup(group.index, nearMiss.key);
            nearMissesAdded++;
        }
    }

    log(`Phase 1 complete: ${groupsCreated} groups, ${membersAdded} natural matches, ${forcedAdded} forced, ${householdPulledAdded} household-pulled, ${nearMissesAdded} near misses`);
}

/**
 * Phase 2: Process VisionAppraisal Households
 * Remaining VisionAppraisal households become founding entities of new groups.
 */
function executePhase2_VisionAppraisalHouseholds(groupDb, entityDb, log) {
    const phase = 2;
    let groupsCreated = 0;
    let membersAdded = 0;
    let nearMissesAdded = 0;
    let forcedAdded = 0;
    let householdPulledAdded = 0;

    // Get all VisionAppraisal AggregateHouseholds
    const vaHouseholds = getEntitiesBySourceAndType(entityDb, 'visionAppraisal', 'AggregateHousehold');
    log(`Found ${vaHouseholds.length} VisionAppraisal households`);

    for (const [key, entity] of vaHouseholds) {
        // Skip if already assigned
        if (groupDb.isEntityAssigned(key)) {
            continue;
        }

        // Create new group
        const group = groupDb.createGroup(key, phase);
        if (!group) continue;

        group.updateBloomerangFlag(false);  // VisionAppraisal entity
        groupsCreated++;

        // Use 9-step algorithm to build group membership
        const groupMembers = buildGroupForFounder(key, entity, groupDb, entityDb);

        // Add natural matches as members
        for (const match of groupMembers.naturalMatches) {
            const matchEntity = match.entity || entityDb[match.key];
            if (groupDb.addMemberToGroup(group.index, match.key)) {
                group.updateBloomerangFlag(isBloomerangKey(match.key));
                membersAdded++;
                if (matchEntity) {
                    markHouseholdIndividualsAsAssigned(match.key, matchEntity, groupDb, entityDb);
                }
            }
        }

        // Add founder forced matches
        for (const forcedKey of groupMembers.founderForced) {
            const forcedEntity = entityDb[forcedKey];
            if (groupDb.addMemberToGroup(group.index, forcedKey)) {
                group.updateBloomerangFlag(isBloomerangKey(forcedKey));
                forcedAdded++;
                if (forcedEntity) {
                    markHouseholdIndividualsAsAssigned(forcedKey, forcedEntity, groupDb, entityDb);
                }
            }
        }

        // Add forced-from-naturals
        for (const forcedKey of groupMembers.forcedFromNaturals) {
            const forcedEntity = entityDb[forcedKey];
            if (groupDb.addMemberToGroup(group.index, forcedKey)) {
                group.updateBloomerangFlag(isBloomerangKey(forcedKey));
                forcedAdded++;
                if (forcedEntity) {
                    markHouseholdIndividualsAsAssigned(forcedKey, forcedEntity, groupDb, entityDb);
                }
            }
        }

        // Add household-pulled members (Step 9)
        for (const pulledKey of groupMembers.householdPulled) {
            const pulledEntity = entityDb[pulledKey];
            if (groupDb.addMemberToGroup(group.index, pulledKey)) {
                group.updateBloomerangFlag(isBloomerangKey(pulledKey));
                householdPulledAdded++;
                if (pulledEntity) {
                    markHouseholdIndividualsAsAssigned(pulledKey, pulledEntity, groupDb, entityDb);
                }
            }
        }

        // Add near misses
        for (const nearMiss of groupMembers.nearMisses) {
            groupDb.addNearMissToGroup(group.index, nearMiss.key);
            nearMissesAdded++;
        }
    }

    log(`Phase 2 complete: ${groupsCreated} groups, ${membersAdded} natural matches, ${forcedAdded} forced, ${householdPulledAdded} household-pulled, ${nearMissesAdded} near misses`);
}

/**
 * Phase 3: Process Remaining Bloomerang Individuals
 */
function executePhase3_BloomerangIndividuals(groupDb, entityDb, log) {
    const phase = 3;
    let groupsCreated = 0;
    let membersAdded = 0;
    let nearMissesAdded = 0;
    let forcedAdded = 0;
    let householdPulledAdded = 0;

    // Get all Bloomerang Individuals
    const bloomerangIndividuals = getEntitiesBySourceAndType(entityDb, 'bloomerang', 'Individual');
    log(`Found ${bloomerangIndividuals.length} Bloomerang individuals`);

    for (const [key, entity] of bloomerangIndividuals) {
        // Skip if already assigned
        if (groupDb.isEntityAssigned(key)) {
            continue;
        }

        // Create new group
        const group = groupDb.createGroup(key, phase);
        if (!group) continue;

        group.updateBloomerangFlag(true);
        groupsCreated++;

        // Use 9-step algorithm to build group membership
        const groupMembers = buildGroupForFounder(key, entity, groupDb, entityDb);

        // Add natural matches
        for (const match of groupMembers.naturalMatches) {
            if (groupDb.addMemberToGroup(group.index, match.key)) {
                group.updateBloomerangFlag(isBloomerangKey(match.key));
                membersAdded++;
            }
        }

        // Add founder forced matches
        for (const forcedKey of groupMembers.founderForced) {
            if (groupDb.addMemberToGroup(group.index, forcedKey)) {
                group.updateBloomerangFlag(isBloomerangKey(forcedKey));
                forcedAdded++;
            }
        }

        // Add forced-from-naturals
        for (const forcedKey of groupMembers.forcedFromNaturals) {
            if (groupDb.addMemberToGroup(group.index, forcedKey)) {
                group.updateBloomerangFlag(isBloomerangKey(forcedKey));
                forcedAdded++;
            }
        }

        // Add household-pulled members (Step 9)
        for (const pulledKey of groupMembers.householdPulled) {
            if (groupDb.addMemberToGroup(group.index, pulledKey)) {
                group.updateBloomerangFlag(isBloomerangKey(pulledKey));
                householdPulledAdded++;
            }
        }

        // Add near misses
        for (const nearMiss of groupMembers.nearMisses) {
            groupDb.addNearMissToGroup(group.index, nearMiss.key);
            nearMissesAdded++;
        }
    }

    log(`Phase 3 complete: ${groupsCreated} groups, ${membersAdded} natural matches, ${forcedAdded} forced, ${householdPulledAdded} household-pulled, ${nearMissesAdded} near misses`);
}

/**
 * Phase 4: Process Remaining VisionAppraisal Individuals
 */
function executePhase4_VisionAppraisalIndividuals(groupDb, entityDb, log) {
    const phase = 4;
    let groupsCreated = 0;
    let membersAdded = 0;
    let nearMissesAdded = 0;
    let forcedAdded = 0;
    let householdPulledAdded = 0;

    // Get all VisionAppraisal Individuals
    const vaIndividuals = getEntitiesBySourceAndType(entityDb, 'visionAppraisal', 'Individual');
    log(`Found ${vaIndividuals.length} VisionAppraisal individuals`);

    for (const [key, entity] of vaIndividuals) {
        // Skip if already assigned
        if (groupDb.isEntityAssigned(key)) {
            continue;
        }

        // Create new group
        const group = groupDb.createGroup(key, phase);
        if (!group) continue;

        group.updateBloomerangFlag(false);
        groupsCreated++;

        // Use 9-step algorithm to build group membership
        const groupMembers = buildGroupForFounder(key, entity, groupDb, entityDb);

        // Add natural matches
        for (const match of groupMembers.naturalMatches) {
            if (groupDb.addMemberToGroup(group.index, match.key)) {
                group.updateBloomerangFlag(isBloomerangKey(match.key));
                membersAdded++;
            }
        }

        // Add founder forced matches
        for (const forcedKey of groupMembers.founderForced) {
            if (groupDb.addMemberToGroup(group.index, forcedKey)) {
                group.updateBloomerangFlag(isBloomerangKey(forcedKey));
                forcedAdded++;
            }
        }

        // Add forced-from-naturals
        for (const forcedKey of groupMembers.forcedFromNaturals) {
            if (groupDb.addMemberToGroup(group.index, forcedKey)) {
                group.updateBloomerangFlag(isBloomerangKey(forcedKey));
                forcedAdded++;
            }
        }

        // Add household-pulled members (Step 9)
        for (const pulledKey of groupMembers.householdPulled) {
            if (groupDb.addMemberToGroup(group.index, pulledKey)) {
                group.updateBloomerangFlag(isBloomerangKey(pulledKey));
                householdPulledAdded++;
            }
        }

        // Add near misses
        for (const nearMiss of groupMembers.nearMisses) {
            groupDb.addNearMissToGroup(group.index, nearMiss.key);
            nearMissesAdded++;
        }
    }

    log(`Phase 4 complete: ${groupsCreated} groups, ${membersAdded} natural matches, ${forcedAdded} forced, ${householdPulledAdded} household-pulled, ${nearMissesAdded} near misses`);
}

/**
 * Phase 5: Process Remaining Entity Types (Business, LegalConstruct, etc.)
 * Bloomerang first, then VisionAppraisal
 */
function executePhase5_RemainingEntities(groupDb, entityDb, log) {
    const phase = 5;
    let groupsCreated = 0;
    let membersAdded = 0;
    let nearMissesAdded = 0;
    let forcedAdded = 0;
    let householdPulledAdded = 0;

    const otherTypes = ['Business', 'LegalConstruct', 'CompositeHousehold', 'NonHuman'];

    // Process Bloomerang other types first
    for (const entityType of otherTypes) {
        const bloomerangEntities = getEntitiesBySourceAndType(entityDb, 'bloomerang', entityType);

        for (const [key, entity] of bloomerangEntities) {
            if (groupDb.isEntityAssigned(key)) continue;

            const group = groupDb.createGroup(key, phase);
            if (!group) continue;

            group.updateBloomerangFlag(true);
            groupsCreated++;

            // Use 9-step algorithm to build group membership
            const groupMembers = buildGroupForFounder(key, entity, groupDb, entityDb);

            for (const match of groupMembers.naturalMatches) {
                if (groupDb.addMemberToGroup(group.index, match.key)) {
                    group.updateBloomerangFlag(isBloomerangKey(match.key));
                    membersAdded++;
                }
            }

            for (const forcedKey of groupMembers.founderForced) {
                if (groupDb.addMemberToGroup(group.index, forcedKey)) {
                    group.updateBloomerangFlag(isBloomerangKey(forcedKey));
                    forcedAdded++;
                }
            }

            for (const forcedKey of groupMembers.forcedFromNaturals) {
                if (groupDb.addMemberToGroup(group.index, forcedKey)) {
                    group.updateBloomerangFlag(isBloomerangKey(forcedKey));
                    forcedAdded++;
                }
            }

            for (const pulledKey of groupMembers.householdPulled) {
                if (groupDb.addMemberToGroup(group.index, pulledKey)) {
                    group.updateBloomerangFlag(isBloomerangKey(pulledKey));
                    householdPulledAdded++;
                }
            }

            for (const nearMiss of groupMembers.nearMisses) {
                groupDb.addNearMissToGroup(group.index, nearMiss.key);
                nearMissesAdded++;
            }
        }
    }

    // Then process VisionAppraisal other types
    for (const entityType of otherTypes) {
        const vaEntities = getEntitiesBySourceAndType(entityDb, 'visionAppraisal', entityType);

        for (const [key, entity] of vaEntities) {
            if (groupDb.isEntityAssigned(key)) continue;

            const group = groupDb.createGroup(key, phase);
            if (!group) continue;

            group.updateBloomerangFlag(false);
            groupsCreated++;

            // Use 9-step algorithm to build group membership
            const groupMembers = buildGroupForFounder(key, entity, groupDb, entityDb);

            for (const match of groupMembers.naturalMatches) {
                if (groupDb.addMemberToGroup(group.index, match.key)) {
                    group.updateBloomerangFlag(isBloomerangKey(match.key));
                    membersAdded++;
                }
            }

            for (const forcedKey of groupMembers.founderForced) {
                if (groupDb.addMemberToGroup(group.index, forcedKey)) {
                    group.updateBloomerangFlag(isBloomerangKey(forcedKey));
                    forcedAdded++;
                }
            }

            for (const forcedKey of groupMembers.forcedFromNaturals) {
                if (groupDb.addMemberToGroup(group.index, forcedKey)) {
                    group.updateBloomerangFlag(isBloomerangKey(forcedKey));
                    forcedAdded++;
                }
            }

            for (const pulledKey of groupMembers.householdPulled) {
                if (groupDb.addMemberToGroup(group.index, pulledKey)) {
                    group.updateBloomerangFlag(isBloomerangKey(pulledKey));
                    householdPulledAdded++;
                }
            }

            for (const nearMiss of groupMembers.nearMisses) {
                groupDb.addNearMissToGroup(group.index, nearMiss.key);
                nearMissesAdded++;
            }
        }
    }

    log(`Phase 5 complete: ${groupsCreated} groups, ${membersAdded} natural matches, ${forcedAdded} forced, ${householdPulledAdded} household-pulled, ${nearMissesAdded} near misses`);
}

// =============================================================================
// SAMPLING FUNCTIONS
// =============================================================================

/**
 * Create a stratified random sample of entities from the database.
 * Samples proportionally from each (source, entityType) bucket to ensure coverage.
 *
 * @param {Object} entityDb - The full entity database (unifiedEntityDatabase.entities)
 * @param {number} sampleSize - Target total sample size
 * @param {number} [seed=12345] - Random seed for reproducibility
 * @returns {Object} A new object containing only the sampled entities (same structure as entityDb)
 */
function createStratifiedSample(entityDb, sampleSize, seed = 12345) {
    // Simple seeded random number generator (mulberry32)
    function mulberry32(a) {
        return function() {
            let t = a += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
    const random = mulberry32(seed);

    // Shuffle array using Fisher-Yates with seeded random
    function shuffleArray(arr) {
        const shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // Group entities by (source, entityType) bucket
    const buckets = {};
    const allEntries = Object.entries(entityDb);
    const totalEntities = allEntries.length;

    for (const [key, entity] of allEntries) {
        const source = key.startsWith('bloomerang:') ? 'bloomerang' : 'visionAppraisal';
        const entityType = entity.constructor.name;
        const bucketKey = `${source}:${entityType}`;

        if (!buckets[bucketKey]) {
            buckets[bucketKey] = [];
        }
        buckets[bucketKey].push([key, entity]);
    }

    // Calculate proportional sample size for each bucket
    const sampledDb = {};
    let totalSampled = 0;

    console.log(`[SAMPLE MODE] Creating stratified sample of ${sampleSize} from ${totalEntities} entities`);
    console.log(`[SAMPLE MODE] Buckets found: ${Object.keys(buckets).length}`);

    for (const [bucketKey, entries] of Object.entries(buckets)) {
        // Proportional allocation: (bucket size / total) * sampleSize
        const proportion = entries.length / totalEntities;
        let bucketSampleSize = Math.round(proportion * sampleSize);

        // Ensure at least 1 from each non-empty bucket (if sample size allows)
        if (bucketSampleSize === 0 && entries.length > 0 && totalSampled < sampleSize) {
            bucketSampleSize = 1;
        }

        // Don't exceed bucket size
        bucketSampleSize = Math.min(bucketSampleSize, entries.length);

        // Shuffle and take the sample
        const shuffled = shuffleArray(entries);
        const sampled = shuffled.slice(0, bucketSampleSize);

        for (const [key, entity] of sampled) {
            sampledDb[key] = entity;
        }

        console.log(`[SAMPLE MODE]   ${bucketKey}: ${sampled.length} of ${entries.length} (${(proportion * 100).toFixed(1)}%)`);
        totalSampled += sampled.length;
    }

    console.log(`[SAMPLE MODE] Total sampled: ${Object.keys(sampledDb).length} entities`);

    return sampledDb;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get entities filtered by source and type
 * @param {Object} entityDb - The entity database (unifiedEntityDatabase.entities)
 * @param {string} source - 'bloomerang' or 'visionAppraisal'
 * @param {string} entityType - Entity class name ('Individual', 'AggregateHousehold', etc.)
 * @returns {Array<[string, Entity]>} Array of [key, entity] pairs
 */
function getEntitiesBySourceAndType(entityDb, source, entityType) {
    const results = [];

    for (const [key, entity] of Object.entries(entityDb)) {
        // Check source from key
        const keySource = key.startsWith('bloomerang:') ? 'bloomerang' : 'visionAppraisal';
        if (keySource !== source) continue;

        // Check entity type
        if (entity.constructor.name !== entityType) continue;

        results.push([key, entity]);
    }

    return results;
}

/**
 * Check if a key is from Bloomerang source
 * @param {string} key - Entity database key
 * @returns {boolean} True if Bloomerang entity
 */
function isBloomerangKey(key) {
    return key.startsWith('bloomerang:');
}

/**
 * Find true matches and near misses for an entity
 * @param {string} baseKey - Database key of the base entity
 * @param {Entity} baseEntity - The base entity
 * @param {EntityGroupDatabase} groupDb - The group database (to check assigned status)
 * @param {Object} entityDb - The entity database
 * @returns {Object} { trueMatches: [{key, entity, scores}], nearMisses: [{key, entity, scores}] }
 */
function findMatchesForEntity(baseKey, baseEntity, groupDb, entityDb) {
    const trueMatches = [];
    const nearMisses = [];

    // Extract fire number from base entity once (for same-location detection)
    const baseFn = (typeof extractFireNumberFromEntity === 'function')
        ? extractFireNumberFromEntity(baseEntity) : null;

    for (const [targetKey, targetEntity] of Object.entries(entityDb)) {
        // Skip self
        if (targetKey === baseKey) continue;

        // Skip already assigned entities (for true matches only - near misses can be assigned)
        const isAssigned = groupDb.isEntityAssigned(targetKey);

        // Perform comparison
        const comparison = universalCompareTo(baseEntity, targetEntity);
        const overallScore = comparison.score;

        // Extract component scores from details if available
        let nameScore = null;
        let contactInfoScore = null;

        if (comparison.details && comparison.details.components) {
            if (comparison.details.components.name) {
                nameScore = comparison.details.components.name.similarity;
            }
            if (comparison.details.components.contactInfo) {
                contactInfoScore = comparison.details.components.contactInfo.similarity;
            }
        }

        // Check if true match
        if (isTrueMatch(overallScore, nameScore, contactInfoScore)) {
            if (!isAssigned) {
                trueMatches.push({
                    key: targetKey,
                    entity: targetEntity,
                    scores: { overall: overallScore, name: nameScore, contactInfo: contactInfoScore }
                });
            }
        }
        // Check if near miss (only if not a true match)
        else if (isNearMatch(overallScore, nameScore, contactInfoScore)) {
            nearMisses.push({
                key: targetKey,
                entity: targetEntity,
                scores: { overall: overallScore, name: nameScore, contactInfo: contactInfoScore }
            });
        }
    }

    return { trueMatches, nearMisses };
}

/**
 * Step 9: Collect household-related keys from all group members.
 * When any member is added to a group, pull in their parent household and siblings.
 *
 * For each member (founder + naturalMatches + founderForced + forcedFromNaturals):
 * - If member has parentKey → add parent to pull list
 * - If member has siblingKeys → add siblings to pull list
 * - If member is AggregateHousehold → add sibling keys from embedded individuals
 *
 * Only pulls entities that:
 * - Exist in entityDb
 * - Are not already assigned to a group
 * - Are not already in the current member set
 *
 * @param {string} founderKey - Database key of the founding entity
 * @param {Entity} founderEntity - The founding entity
 * @param {Array} naturalMatches - Array of {key, score, entity, scores}
 * @param {Array} founderForced - Array of keys
 * @param {Array} forcedFromNaturals - Array of keys
 * @param {EntityGroupDatabase} groupDb - The group database
 * @param {Object} entityDb - The entity database
 * @returns {Array} Array of keys to pull into the group
 */
function collectHouseholdRelatedKeys(founderKey, founderEntity, naturalMatches, founderForced, forcedFromNaturals, groupDb, entityDb) {
    const householdPulled = [];

    // Build set of all keys already in the group (to avoid duplicates)
    const alreadyInGroup = new Set([founderKey]);
    for (const match of naturalMatches) {
        alreadyInGroup.add(match.key);
    }
    for (const key of founderForced) {
        alreadyInGroup.add(key);
    }
    for (const key of forcedFromNaturals) {
        alreadyInGroup.add(key);
    }

    /**
     * Helper to add a key to householdPulled if it's valid and available
     */
    function tryAddKey(key) {
        if (!key) return;
        if (alreadyInGroup.has(key)) return;
        if (householdPulled.includes(key)) return;
        if (!entityDb[key]) return;  // Key doesn't exist in database
        if (groupDb.isEntityAssigned(key)) return;  // Already in another group

        householdPulled.push(key);
        alreadyInGroup.add(key);  // Prevent duplicates within this step
    }

    /**
     * Helper to extract household keys from an entity
     */
    function extractHouseholdKeys(entity) {
        if (!entity) return;

        // Check for householdInformation on the entity itself (Individual entities)
        const householdInfo = entity.otherInfo?.householdInformation;
        if (householdInfo) {
            // Add parent household
            if (householdInfo.parentKey) {
                tryAddKey(householdInfo.parentKey);
            }
            // Add siblings (only Bloomerang individuals have siblingKeys)
            if (householdInfo.siblingKeys && Array.isArray(householdInfo.siblingKeys)) {
                for (const siblingKey of householdInfo.siblingKeys) {
                    tryAddKey(siblingKey);
                }
            }
        }

        // If entity is an AggregateHousehold, check embedded individuals for sibling keys
        if (entity.constructor?.name === 'AggregateHousehold' && entity.individuals && Array.isArray(entity.individuals)) {
            for (const individual of entity.individuals) {
                const indivHouseholdInfo = individual.otherInfo?.householdInformation;
                if (indivHouseholdInfo && indivHouseholdInfo.siblingKeys && Array.isArray(indivHouseholdInfo.siblingKeys)) {
                    for (const siblingKey of indivHouseholdInfo.siblingKeys) {
                        tryAddKey(siblingKey);
                    }
                }
            }
        }
    }

    // Process founder
    extractHouseholdKeys(founderEntity);

    // Process natural matches
    for (const match of naturalMatches) {
        const entity = match.entity || entityDb[match.key];
        extractHouseholdKeys(entity);
    }

    // Process founder forced
    for (const key of founderForced) {
        const entity = entityDb[key];
        extractHouseholdKeys(entity);
    }

    // Process forced from naturals
    for (const key of forcedFromNaturals) {
        const entity = entityDb[key];
        extractHouseholdKeys(entity);
    }

    return householdPulled;
}

/**
 * Build group membership for a founding entity using the 9-step algorithm.
 * This implements the full match override system with priority hierarchy:
 * Founder-forced > Natural matches > Forced-from-naturals
 * Plus Step 9: Household member pulling
 *
 * @param {string} founderKey - Database key of the founding entity
 * @param {Entity} founderEntity - The founding entity
 * @param {EntityGroupDatabase} groupDb - The group database
 * @param {Object} entityDb - The entity database
 * @returns {Object} { naturalMatches, founderForced, forcedFromNaturals, householdPulled, nearMisses }
 */
function buildGroupForFounder(founderKey, founderEntity, groupDb, entityDb) {
    const overrideManager = window.matchOverrideManager;
    const hasOverrides = overrideManager &&
                         (overrideManager.forceMatchRules.length > 0 ||
                          overrideManager.forceExcludeRules.length > 0);

    // Step 1: Find natural matches from algorithmic comparison
    const { trueMatches: rawNaturalMatches, nearMisses } = findMatchesForEntity(
        founderKey, founderEntity, groupDb, entityDb
    );

    // If no override rules loaded, still run Step 9 for household pulling
    if (!hasOverrides) {
        // Step 9: Collect household-related keys even without override rules
        const householdPulled = collectHouseholdRelatedKeys(
            founderKey,
            founderEntity,
            rawNaturalMatches,
            [],  // no founderForced
            [],  // no forcedFromNaturals
            groupDb,
            entityDb
        );

        return {
            naturalMatches: rawNaturalMatches,
            founderForced: [],
            forcedFromNaturals: [],
            householdPulled: householdPulled,
            nearMisses: nearMisses
        };
    }

    // Convert trueMatches to format expected by override manager
    // (objects with .key and .score properties)
    let naturalMatches = rawNaturalMatches.map(m => ({
        key: m.key,
        score: m.scores?.overall || 0,
        entity: m.entity,
        scores: m.scores
    }));

    // Get founder's force-match list (needed for multiple steps)
    const founderForceList = overrideManager.getForceMatchesFor(founderKey);

    // Step 0: Remove natural matches that have exclusion with founder
    // Founder owns the group - any exclusion with founder means entity cannot join
    naturalMatches = overrideManager.removeExcludedWithFounder(naturalMatches, founderKey);

    // Step 2: Resolve exclusions among natural matches
    // Priority: if one is also in founder's force-match list, it wins
    naturalMatches = overrideManager.resolveExclusionsWithPriority(
        naturalMatches,
        founderForceList
    );

    // Step 3: Generate founder forced matches (not already in naturalMatches)
    const naturalMatchKeys = new Set(naturalMatches.map(m => m.key));
    let founderForced = founderForceList.filter(key =>
        !naturalMatchKeys.has(key) &&
        !groupDb.isEntityAssigned(key) &&
        entityDb[key]  // Key exists in database
    );

    // Step 3.5: Check for contradictions - entity both force-matched AND excluded with founder
    // This is a user configuration error. Exclusion wins, log warning.
    founderForced = overrideManager.removeContradictoryFounderForced(founderForced, founderKey);

    // Step 4: Resolve exclusions among founder forced matches (stupid case - user error)
    // Both are same tier, so use OnConflict rules
    founderForced = overrideManager.resolveExclusionsOnConflict(founderForced);

    // Step 5: Check founder forced vs natural matches (founder forced wins)
    naturalMatches = overrideManager.removeExcludedByPriority(naturalMatches, founderForced);

    // Step 6: Generate forced matches from surviving natural matches
    let forcedFromNaturals = [];
    const allCollectedKeys = new Set([
        ...naturalMatches.map(m => m.key),
        ...founderForced
    ]);

    for (const match of naturalMatches) {
        const forcedKeys = overrideManager.getForceMatchesFor(match.key);
        for (const key of forcedKeys) {
            if (!allCollectedKeys.has(key) &&
                !forcedFromNaturals.includes(key) &&
                !groupDb.isEntityAssigned(key) &&
                entityDb[key]) {
                forcedFromNaturals.push(key);
            }
        }
    }

    // Step 7: Check forced-from-naturals vs founder forced (founder wins)
    forcedFromNaturals = overrideManager.removeExcludedKeysByPriority(forcedFromNaturals, founderForced);

    // Step 7.5: Check forced-from-naturals for exclusions with founder
    // These entities came in via lineage (Step 6) and weren't checked against founder yet
    forcedFromNaturals = overrideManager.removeExcludedKeysWithFounder(forcedFromNaturals, founderKey);

    // Step 8: Resolve exclusions among forced-from-naturals
    forcedFromNaturals = overrideManager.resolveExclusionsOnConflict(forcedFromNaturals);

    // Step 9: Collect household-related keys from all members
    // When any member is added to the group, pull in their parent household and siblings
    const householdPulled = collectHouseholdRelatedKeys(
        founderKey,
        founderEntity,
        naturalMatches,
        founderForced,
        forcedFromNaturals,
        groupDb,
        entityDb
    );

    return {
        naturalMatches: naturalMatches,  // Array of {key, score, entity, scores}
        founderForced: founderForced,    // Array of keys
        forcedFromNaturals: forcedFromNaturals,  // Array of keys
        householdPulled: householdPulled,  // Array of keys (Step 9)
        nearMisses: nearMisses
    };
}

/**
 * When a household is matched, mark its individual members as assigned
 * This prevents individuals from forming separate groups when their household is already grouped
 * @param {string} householdKey - Database key of the household
 * @param {Entity} householdEntity - The household entity
 * @param {EntityGroupDatabase} groupDb - The group database
 * @param {Object} entityDb - The entity database
 */
function markHouseholdIndividualsAsAssigned(householdKey, householdEntity, groupDb, entityDb) {
    // Only applies to AggregateHousehold entities
    if (householdEntity.constructor.name !== 'AggregateHousehold') return;
    if (!householdEntity.individuals || householdEntity.individuals.length === 0) return;

    // For Bloomerang households, individuals are stored as separate entities
    // We need to find them by matching (they share accountNumber pattern or other identifiers)
    // For VisionAppraisal households, individuals are embedded and don't have separate keys

    // Check if this is a Bloomerang household
    if (isBloomerangKey(householdKey)) {
        // Bloomerang individuals have their own keys - find and mark them
        // They typically share the same account number base
        const accountNumberMatch = householdKey.match(/bloomerang:(\d+):/);
        if (accountNumberMatch) {
            const accountNumber = accountNumberMatch[1];
            // Find all entities with this account number
            for (const [key, entity] of Object.entries(entityDb)) {
                if (key.startsWith(`bloomerang:${accountNumber}:`) && key !== householdKey) {
                    // Mark as assigned (add to the assigned set directly since they're part of the household)
                    groupDb.assignedEntityKeys.add(key);
                }
            }
        }
    }
    // VisionAppraisal household individuals are embedded, not separate entities - no action needed
}


// =============================================================================
// REFERENCE FILE GENERATION
// =============================================================================

/**
 * Build a lightweight reference file from an EntityGroupDatabase.
 * This file provides quick lookup of group membership without loading the full database.
 *
 * Structure:
 * {
 *   metadata: { timestamp, totalGroups, totalMembers },
 *   groups: {
 *     "0||foundingMemberKey": ["memberKey1", "memberKey2", ...],
 *     "1||foundingMemberKey": [],
 *     ...
 *   }
 * }
 *
 * @param {EntityGroupDatabase} groupDb - The EntityGroupDatabase to create reference from
 * @returns {Object} Plain object suitable for JSON.stringify/parse round-trip
 */
function buildEntityGroupReferenceFile(groupDb) {
    // EntityGroupDatabase stores groups as an object keyed by index, not an array
    const groupsArray = Object.values(groupDb.groups);

    const reference = {
        metadata: {
            timestamp: new Date().toISOString(),
            totalGroups: groupsArray.length,
            totalMembers: groupDb.stats?.totalEntitiesAssigned || 0
        },
        groups: {}
    };

    for (const group of groupsArray) {
        // Key format: {index}||{foundingMemberKey}
        const key = `${group.index}||${group.foundingMemberKey}`;

        // Value: array of additional member keys (excluding founding member)
        const additionalMembers = group.memberKeys.filter(k => k !== group.foundingMemberKey);

        reference.groups[key] = additionalMembers;
    }

    return reference;
}

// =============================================================================
// GOOGLE DRIVE PERSISTENCE
// =============================================================================

/**
 * Save EntityGroupDatabase to Google Drive (updates existing file)
 * @param {EntityGroupDatabase} groupDb - The database to save
 * @param {string} fileId - Google Drive file ID
 * @param {Function} log - Logging function
 * @returns {Promise<Object>} Save result with success status
 */
async function saveEntityGroupDatabase(groupDb, fileId = ENTITYGROUP_DATABASE_FILE_ID, log = console.log) {
    if (!fileId) {
        throw new Error('No file ID provided for EntityGroupDatabase save.');
    }

    // Serialize the database
    log('Serializing EntityGroupDatabase...');
    const serializedData = groupDb.serialize();
    const jsonString = JSON.stringify(serializedData);
    const sizeKB = (jsonString.length / 1024).toFixed(1);
    const sizeMB = (jsonString.length / (1024 * 1024)).toFixed(2);
    log(`Serialized size: ${sizeKB} KB (${sizeMB} MB)`);
    log(`Groups: ${groupDb.stats.totalGroups}, Entities: ${groupDb.stats.totalEntitiesAssigned}`);

    // Upload to Google Drive
    log(`Uploading to Google Drive file: ${fileId}...`);

    const response = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
            method: 'PATCH',
            headers: new Headers({
                'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                'Content-Type': 'application/json'
            }),
            body: jsonString
        }
    );

    if (response.ok) {
        // Update file name with timestamp
        const fileName = `entity_group_database_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        await gapi.client.drive.files.update({
            fileId: fileId,
            resource: { name: fileName }
        });

        log('=== EntityGroupDatabase Saved Successfully ===');
        log(`File ID: ${fileId}`);
        log(`File name: ${fileName}`);

        return {
            success: true,
            fileId: fileId,
            fileName: fileName,
            stats: groupDb.stats,
            sizeBytes: jsonString.length
        };
    } else {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }
}

/**
 * Load EntityGroupDatabase from Google Drive
 * @param {string} fileId - Google Drive file ID
 * @returns {Promise<EntityGroupDatabase>} The loaded database
 */
async function loadEntityGroupDatabase(fileId = ENTITYGROUP_DATABASE_FILE_ID) {
    console.log('=== Loading EntityGroupDatabase from Google Drive ===');

    if (!fileId) {
        throw new Error('No file ID provided for EntityGroupDatabase load.');
    }

    console.log(`Loading from file: ${fileId}...`);

    const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
            method: 'GET',
            headers: new Headers({
                'Authorization': `Bearer ${gapi.client.getToken().access_token}`
            })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }

    const jsonString = await response.text();
    const sizeKB = (jsonString.length / 1024).toFixed(1);
    console.log(`Downloaded ${sizeKB} KB`);

    // Parse and deserialize
    const serializedData = JSON.parse(jsonString);
    const groupDb = EntityGroupDatabase.deserialize(serializedData);

    // Store in global
    window.entityGroupDatabase = groupDb;

    console.log('=== EntityGroupDatabase Loaded Successfully ===');
    console.log(groupDb.getSummary());

    return groupDb;
}

/**
 * Save EntityGroupDatabase to a NEW Google Drive file
 * @param {EntityGroupDatabase} groupDb - The database to save
 * @param {string} [folderId] - Optional folder ID to create file in
 * @param {Function} log - Logging function
 * @returns {Promise<Object>} Save result with new file ID
 */
async function saveEntityGroupDatabaseToNewFile(groupDb, folderId = null, log = console.log) {
    // Serialize the database
    log('Serializing EntityGroupDatabase for new file...');
    const serializedData = groupDb.serialize();
    const jsonString = JSON.stringify(serializedData);
    const sizeKB = (jsonString.length / 1024).toFixed(1);
    const sizeMB = (jsonString.length / (1024 * 1024)).toFixed(2);
    log(`Serialized size: ${sizeKB} KB (${sizeMB} MB)`);

    // Create file metadata
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const fileName = `entity_group_database_${timestamp}.json`;

    const metadata = {
        name: fileName,
        mimeType: 'application/json'
    };

    if (folderId) {
        metadata.parents = [folderId];
    }

    // Create new file using multipart upload
    log('Creating new Google Drive file...');

    const boundary = '-------EntityGroupDatabaseBoundary';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        jsonString +
        closeDelimiter;

    const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
            method: 'POST',
            headers: new Headers({
                'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                'Content-Type': `multipart/related; boundary=${boundary}`
            }),
            body: multipartBody
        }
    );

    if (response.ok) {
        const result = await response.json();
        const newFileId = result.id;

        log('=== EntityGroupDatabase Saved to NEW File ===');
        log(`NEW File ID: ${newFileId}`);
        log(`File name: ${fileName}`);
        console.log(`%c📁 NEW EntityGroupDatabase File ID: ${newFileId}`, 'color: green; font-weight: bold; font-size: 14px;');

        return {
            success: true,
            fileId: newFileId,
            fileName: fileName,
            stats: groupDb.stats,
            sizeBytes: jsonString.length,
            isNewFile: true
        };
    } else {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }
}

/**
 * Save Reference File to an existing Google Drive file
 * @param {Object} referenceData - The reference file data (from buildEntityGroupReferenceFile)
 * @param {string} fileId - Google Drive file ID to update
 * @param {Function} log - Logging function
 * @returns {Promise<Object>} Save result
 */
async function saveEntityGroupReference(referenceData, fileId, log = console.log) {
    if (!fileId) {
        throw new Error('No file ID provided for Reference File save.');
    }

    const jsonString = JSON.stringify(referenceData);
    const sizeKB = (jsonString.length / 1024).toFixed(1);
    log(`Reference file size: ${sizeKB} KB`);

    // Upload to Google Drive
    log(`Uploading Reference File to: ${fileId}...`);

    const response = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
            method: 'PATCH',
            headers: new Headers({
                'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                'Content-Type': 'application/json'
            }),
            body: jsonString
        }
    );

    if (response.ok) {
        // Update file name with timestamp
        const fileName = `entity_group_reference_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        await gapi.client.drive.files.update({
            fileId: fileId,
            resource: { name: fileName }
        });

        log('=== Reference File Saved Successfully ===');
        log(`File ID: ${fileId}`);

        return {
            success: true,
            fileId: fileId,
            fileName: fileName,
            sizeBytes: jsonString.length
        };
    } else {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }
}

/**
 * Save Reference File to a NEW Google Drive file
 * @param {Object} referenceData - The reference file data (from buildEntityGroupReferenceFile)
 * @param {string} [folderId] - Optional folder ID to create file in
 * @param {Function} log - Logging function
 * @returns {Promise<Object>} Save result with new file ID
 */
async function saveEntityGroupReferenceToNewFile(referenceData, folderId = null, log = console.log) {
    const jsonString = JSON.stringify(referenceData);
    const sizeKB = (jsonString.length / 1024).toFixed(1);
    log(`Reference file size: ${sizeKB} KB`);

    // Create file metadata
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const fileName = `entity_group_reference_${timestamp}.json`;

    const metadata = {
        name: fileName,
        mimeType: 'application/json'
    };

    if (folderId) {
        metadata.parents = [folderId];
    }

    // Create new file using multipart upload
    log('Creating new Reference File on Google Drive...');

    const boundary = '-------EntityGroupReferenceBoundary';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        jsonString +
        closeDelimiter;

    const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
            method: 'POST',
            headers: new Headers({
                'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                'Content-Type': `multipart/related; boundary=${boundary}`
            }),
            body: multipartBody
        }
    );

    if (response.ok) {
        const result = await response.json();
        const newFileId = result.id;

        log('=== Reference File Saved to NEW File ===');
        log(`NEW File ID: ${newFileId}`);
        log(`File name: ${fileName}`);
        console.log(`%c📄 NEW Reference File ID: ${newFileId}`, 'color: blue; font-weight: bold; font-size: 14px;');

        return {
            success: true,
            fileId: newFileId,
            fileName: fileName,
            sizeBytes: jsonString.length,
            isNewFile: true
        };
    } else {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }
}

/**
 * Save both EntityGroupDatabase and Reference File to existing files
 * @param {EntityGroupDatabase} groupDb - The database to save
 * @param {string} databaseFileId - Google Drive file ID for database
 * @param {string} referenceFileId - Google Drive file ID for reference
 * @param {Function} log - Logging function
 * @returns {Promise<Object>} Combined save result
 */
async function saveEntityGroupDatabaseAndReference(groupDb, databaseFileId, referenceFileId, log = console.log) {
    log('=== Saving EntityGroupDatabase and Reference File ===');

    // Build reference file
    const referenceData = buildEntityGroupReferenceFile(groupDb);

    // Save both
    const [dbResult, refResult] = await Promise.all([
        saveEntityGroupDatabase(groupDb, databaseFileId, log),
        saveEntityGroupReference(referenceData, referenceFileId, log)
    ]);

    return {
        database: dbResult,
        reference: refResult
    };
}

/**
 * Save both EntityGroupDatabase and Reference File to NEW files
 * @param {EntityGroupDatabase} groupDb - The database to save
 * @param {string} [folderId] - Optional folder ID to create files in
 * @param {Function} log - Logging function
 * @returns {Promise<Object>} Combined save result with new file IDs
 */
async function saveEntityGroupDatabaseAndReferenceToNewFiles(groupDb, folderId = null, log = console.log) {
    log('=== Saving EntityGroupDatabase and Reference File to NEW Files ===');

    // Build reference file
    const referenceData = buildEntityGroupReferenceFile(groupDb);

    // Save both to new files
    const [dbResult, refResult] = await Promise.all([
        saveEntityGroupDatabaseToNewFile(groupDb, folderId, log),
        saveEntityGroupReferenceToNewFile(referenceData, folderId, log)
    ]);

    log('');
    log('=== BOTH FILES SAVED TO NEW LOCATIONS ===');
    console.log(`%c📁 Database File ID: ${dbResult.fileId}`, 'color: green; font-weight: bold;');
    console.log(`%c📄 Reference File ID: ${refResult.fileId}`, 'color: blue; font-weight: bold;');

    return {
        database: dbResult,
        reference: refResult
    };
}


// =============================================================================
// EXPORTS
// =============================================================================

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        buildEntityGroupDatabase,
        saveEntityGroupDatabase,
        saveEntityGroupDatabaseToNewFile,
        loadEntityGroupDatabase,
        buildEntityGroupReferenceFile,
        saveEntityGroupReference,
        saveEntityGroupReferenceToNewFile,
        saveEntityGroupDatabaseAndReference,
        saveEntityGroupDatabaseAndReferenceToNewFiles,
        getEntitiesBySourceAndType,
        isBloomerangKey,
        findMatchesForEntity,
        buildGroupForFounder,
        createStratifiedSample,
        ENTITYGROUP_DATABASE_FILE_ID
    };
}

// Export to global scope for browser use
if (typeof window !== 'undefined') {
    window.buildEntityGroupDatabase = buildEntityGroupDatabase;
    window.saveEntityGroupDatabase = saveEntityGroupDatabase;
    window.saveEntityGroupDatabaseToNewFile = saveEntityGroupDatabaseToNewFile;
    window.loadEntityGroupDatabase = loadEntityGroupDatabase;
    window.buildEntityGroupReferenceFile = buildEntityGroupReferenceFile;
    window.saveEntityGroupReference = saveEntityGroupReference;
    window.saveEntityGroupReferenceToNewFile = saveEntityGroupReferenceToNewFile;
    window.saveEntityGroupDatabaseAndReference = saveEntityGroupDatabaseAndReference;
    window.saveEntityGroupDatabaseAndReferenceToNewFiles = saveEntityGroupDatabaseAndReferenceToNewFiles;
    window.getEntitiesBySourceAndType = getEntitiesBySourceAndType;
    window.isBloomerangKey = isBloomerangKey;
    window.findMatchesForEntity = findMatchesForEntity;
    window.buildGroupForFounder = buildGroupForFounder;
    window.createStratifiedSample = createStratifiedSample;
    window.ENTITYGROUP_DATABASE_FILE_ID = ENTITYGROUP_DATABASE_FILE_ID;
}
