/**
 * Unified Database Persistence
 *
 * Provides save/load functionality for the unified entity database.
 * Creates a single keyed structure from all data sources (VisionAppraisal, Bloomerang)
 * using serializeWithTypes/deserializeWithTypes to preserve class instances.
 *
 * KEY FORMAT:
 *   Bloomerang: bloomerang:<accountNumber>:<locationType>:<locationValue>:<headStatus>
 *   VisionAppraisal: visionAppraisal:<locationType>:<locationValue>
 *
 * ARCHITECTURE:
 *   - buildUnifiedEntityDatabase(): Creates unified keyed structure from workingLoadedEntities
 *   - saveUnifiedDatabase(): Serializes and uploads to Google Drive
 *   - loadUnifiedDatabase(): Downloads and deserializes into unifiedEntityDatabase global
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

// Google Drive file ID for unified database persistence
// This file will be overwritten on each save
const UNIFIED_DATABASE_FILE_ID = null;  // TODO: Create file and set ID

// Global storage for loaded unified database
window.unifiedEntityDatabase = null;

// =============================================================================
// KEY GENERATION
// =============================================================================

/**
 * Generate a unique key for an entity using the established format.
 * Key format matches universalEntityMatcher.js getEntityKeyInfo() output.
 *
 * @param {Entity} entity - The entity to generate a key for
 * @returns {string} Unique key string
 */
function generateUnifiedEntityKey(entity) {
    // Get locationIdentifier info
    let locationType = 'Unknown';
    let locationValue = 'unknown';

    if (entity.locationIdentifier) {
        const locId = entity.locationIdentifier;
        locationType = locId.constructor?.name || 'Unknown';

        if (locId.primaryAlias?.term) {
            locationValue = String(locId.primaryAlias.term);
        } else if (locId.toString && typeof locId.toString === 'function') {
            const str = locId.toString();
            // Avoid [object Object]
            if (str !== '[object Object]') {
                locationValue = str;
            }
        }
    }

    // Determine source by checking sourceMap for 'bloomerang'
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
            isBloomerang = sourceMap.__data.some(entry =>
                String(entry[0]).toLowerCase().includes('bloomerang')
            );
        }
    }

    if (isBloomerang) {
        // Bloomerang key format: bloomerang:<accountNumber>:<locationType>:<locationValue>:<headStatus>
        let accountNumber = 'unknown';
        if (entity.accountNumber?.primaryAlias?.term) {
            accountNumber = String(entity.accountNumber.primaryAlias.term);
        } else if (entity.accountNumber?.term) {
            accountNumber = String(entity.accountNumber.term);
        }

        // Append 'AH' for AggregateHousehold to distinguish from Individual
        // BUT only if it doesn't already end in 'AH'
        const entityType = entity.constructor?.name;
        if (entityType === 'AggregateHousehold' && accountNumber !== 'unknown') {
            if (!accountNumber.endsWith('AH')) {
                accountNumber = accountNumber + 'AH';
            }
        }

        // Determine household head status
        let headStatus = 'na';
        if (entityType === 'Individual') {
            const householdInfo = entity.otherInfo?.householdInformation;
            if (householdInfo && householdInfo.isInHousehold) {
                headStatus = householdInfo.isHeadOfHousehold ? 'head' : 'member';
            }
        }

        return `bloomerang:${accountNumber}:${locationType}:${locationValue}:${headStatus}`;
    } else {
        // VisionAppraisal key format: visionAppraisal:<locationType>:<locationValue>
        return `visionAppraisal:${locationType}:${locationValue}`;
    }
}

// =============================================================================
// BUILD UNIFIED DATABASE
// =============================================================================

/**
 * Build a unified keyed entity database from workingLoadedEntities.
 * Creates a single object with all entities keyed by their unique identifier.
 *
 * @returns {Object} Unified database with metadata and entities
 */
function buildUnifiedEntityDatabase() {
    console.log('=== Building Unified Entity Database ===');

    if (!window.workingLoadedEntities || workingLoadedEntities.status !== 'loaded') {
        throw new Error('workingLoadedEntities not loaded. Please load entities first.');
    }

    const database = {
        metadata: {
            createdAt: new Date().toISOString(),
            version: '1.0',
            sources: {},
            entityTypes: {},
            totalEntities: 0,
            duplicateKeysFound: 0
        },
        entities: {}
    };

    const duplicateKeys = [];

    // Process VisionAppraisal entities
    if (workingLoadedEntities.visionAppraisal?.loaded && workingLoadedEntities.visionAppraisal?.entities) {
        const vaEntities = workingLoadedEntities.visionAppraisal.entities;
        let vaCount = 0;

        console.log(`Processing ${vaEntities.length} VisionAppraisal entities...`);

        for (const entity of vaEntities) {
            const key = generateUnifiedEntityKey(entity);
            const entityType = entity.constructor?.name || 'Unknown';

            if (database.entities[key]) {
                duplicateKeys.push({ key, source: 'visionAppraisal', type: entityType });
                database.metadata.duplicateKeysFound++;
            } else {
                database.entities[key] = entity;
                vaCount++;

                // Track entity type counts
                database.metadata.entityTypes[entityType] = (database.metadata.entityTypes[entityType] || 0) + 1;

                // For VisionAppraisal AggregateHouseholds, set parentKey on embedded individuals
                // NOTE: VA individuals are NOT standalone keyed entities - they exist only
                // inside their parent household's individuals[] array. siblingKeys makes no
                // sense for them since they don't have keys. Only parentKey is useful.
                if (entityType === 'AggregateHousehold' && entity.individuals && Array.isArray(entity.individuals)) {
                    for (const individual of entity.individuals) {
                        if (individual.otherInfo && individual.otherInfo.householdInformation) {
                            individual.otherInfo.householdInformation.parentKey = key;
                        }
                    }
                }
            }
        }

        database.metadata.sources.visionAppraisal = {
            count: vaCount,
            originalCount: vaEntities.length
        };
        console.log(`  Added ${vaCount} VisionAppraisal entities`);
    }

    // Process Bloomerang entities
    if (workingLoadedEntities.bloomerang?.loaded) {
        const collections = ['individuals', 'households', 'nonhuman'];
        let bloomerangTotal = 0;
        let bloomerangOriginalTotal = 0;

        for (const collectionName of collections) {
            const collection = workingLoadedEntities.bloomerang[collectionName];
            if (!collection?.entities) continue;

            const collectionEntities = Object.values(collection.entities);
            bloomerangOriginalTotal += collectionEntities.length;

            console.log(`Processing ${collectionEntities.length} Bloomerang ${collectionName}...`);

            for (const entity of collectionEntities) {
                const key = generateUnifiedEntityKey(entity);
                const entityType = entity.constructor?.name || 'Unknown';

                if (database.entities[key]) {
                    duplicateKeys.push({ key, source: 'bloomerang', type: entityType, collection: collectionName });
                    database.metadata.duplicateKeysFound++;
                } else {
                    database.entities[key] = entity;
                    bloomerangTotal++;

                    // Track entity type counts
                    database.metadata.entityTypes[entityType] = (database.metadata.entityTypes[entityType] || 0) + 1;
                }
            }
        }

        database.metadata.sources.bloomerang = {
            count: bloomerangTotal,
            originalCount: bloomerangOriginalTotal
        };
        console.log(`  Added ${bloomerangTotal} Bloomerang entities`);
    }

    // =========================================================================
    // SECOND PASS: Set Bloomerang parentKey and siblingKeys using actual database keys
    // =========================================================================
    // Bloomerang Individuals and AggregateHouseholds are standalone keyed entities.
    // Cross-reference keys (parentKey, siblingKeys) must use the actual database keys
    // that were just generated, NOT internal keys from bloomerang.js.
    //
    // Strategy:
    // 1. Build map: householdIdentifier string → householdDatabaseKey
    // 2. Build map: householdIdentifier string → [individualDatabaseKeys]
    // 3. For each Individual with isInHousehold, set parentKey and siblingKeys
    //
    // householdIdentifier is derived from householdInformation.householdIdentifier or
    // from the individual's account number (which should match household account number).
    console.log('Setting Bloomerang parentKey and siblingKeys...');

    // Map householdIdentifier → database key for that household
    const householdIdentifierToKey = new Map();
    // Map householdIdentifier → array of individual database keys in that household
    const householdIdentifierToIndividualKeys = new Map();
    // Map individual database key → their householdIdentifier (for lookup during siblingKeys assignment)
    const individualKeyToHouseholdId = new Map();

    // First pass: identify all Bloomerang households and their keys
    for (const [key, entity] of Object.entries(database.entities)) {
        if (!key.startsWith('bloomerang:')) continue;

        const entityType = entity.constructor?.name;
        if (entityType === 'AggregateHousehold') {
            // Extract household identifier (use account number as unique identifier)
            let householdId = null;
            if (entity.accountNumber?.primaryAlias?.term) {
                householdId = String(entity.accountNumber.primaryAlias.term);
            } else if (entity.accountNumber?.term) {
                householdId = String(entity.accountNumber.term);
            }

            if (householdId) {
                householdIdentifierToKey.set(householdId, key);
            }
        }
    }

    // Second pass: identify all Bloomerang individuals with household membership
    for (const [key, entity] of Object.entries(database.entities)) {
        if (!key.startsWith('bloomerang:')) continue;

        const entityType = entity.constructor?.name;
        if (entityType === 'Individual') {
            const householdInfo = entity.otherInfo?.householdInformation;
            if (householdInfo && householdInfo.isInHousehold) {
                // Determine household identifier
                // Option 1: Use householdInformation.householdIdentifier if set
                // Option 2: Use individual's account number (matches household)
                let householdId = null;

                if (householdInfo.householdIdentifier) {
                    householdId = String(householdInfo.householdIdentifier);
                } else if (entity.accountNumber?.primaryAlias?.term) {
                    householdId = String(entity.accountNumber.primaryAlias.term);
                } else if (entity.accountNumber?.term) {
                    householdId = String(entity.accountNumber.term);
                }

                if (householdId) {
                    // Add to household's individual list
                    if (!householdIdentifierToIndividualKeys.has(householdId)) {
                        householdIdentifierToIndividualKeys.set(householdId, []);
                    }
                    householdIdentifierToIndividualKeys.get(householdId).push(key);
                    individualKeyToHouseholdId.set(key, householdId);
                }
            }
        }
    }

    // Third pass: set parentKey and siblingKeys on each individual
    let parentKeysSet = 0;
    let siblingKeysSet = 0;
    for (const [individualKey, householdId] of individualKeyToHouseholdId) {
        const entity = database.entities[individualKey];
        const householdInfo = entity.otherInfo?.householdInformation;
        if (!householdInfo) continue;

        // Set parentKey to the household's database key
        const householdKey = householdIdentifierToKey.get(householdId);
        if (householdKey) {
            householdInfo.parentKey = householdKey;
            parentKeysSet++;
        }

        // Set siblingKeys to all OTHER individuals in the same household
        const siblingsInHousehold = householdIdentifierToIndividualKeys.get(householdId) || [];
        const siblingKeys = siblingsInHousehold.filter(k => k !== individualKey);
        if (siblingKeys.length > 0) {
            householdInfo.siblingKeys = siblingKeys;
            siblingKeysSet++;
        }
    }

    console.log(`  Bloomerang cross-references: ${parentKeysSet} parentKeys, ${siblingKeysSet} siblingKeys set`);
    console.log(`  Households found: ${householdIdentifierToKey.size}, Individuals in households: ${individualKeyToHouseholdId.size}`);

    database.metadata.totalEntities = Object.keys(database.entities).length;

    // Report results
    console.log('\n=== Unified Database Built ===');
    console.log(`Total entities: ${database.metadata.totalEntities}`);
    console.log('By source:', database.metadata.sources);
    console.log('By type:', database.metadata.entityTypes);

    if (duplicateKeys.length > 0) {
        console.warn(`WARNING: ${duplicateKeys.length} duplicate keys found (skipped):`);
        duplicateKeys.slice(0, 10).forEach(dk => {
            console.warn(`  ${dk.key} (${dk.source}/${dk.type})`);
        });
        if (duplicateKeys.length > 10) {
            console.warn(`  ... and ${duplicateKeys.length - 10} more`);
        }
    }

    return database;
}

// =============================================================================
// SAVE TO GOOGLE DRIVE
// =============================================================================

/**
 * Save the unified entity database to Google Drive.
 * Uses serializeWithTypes to preserve class instances.
 *
 * @param {string} fileId - Google Drive file ID to save to
 * @returns {Promise<Object>} Save result with success status
 */
async function saveUnifiedDatabase(fileId = UNIFIED_DATABASE_FILE_ID) {
    console.log('=== Saving Unified Database to Google Drive ===');

    if (!fileId) {
        throw new Error('No file ID provided. Please set UNIFIED_DATABASE_FILE_ID or pass a fileId parameter.');
    }

    // Build the unified database
    const database = buildUnifiedEntityDatabase();

    // Serialize with type preservation
    console.log('Serializing database with type preservation...');
    const serializedData = serializeWithTypes(database);
    const sizeKB = (serializedData.length / 1024).toFixed(1);
    const sizeMB = (serializedData.length / (1024 * 1024)).toFixed(2);
    console.log(`Serialized size: ${sizeKB} KB (${sizeMB} MB)`);

    // Upload to Google Drive
    console.log(`Uploading to Google Drive file: ${fileId}...`);

    try {
        const response = await fetch(
            `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
            {
                method: 'PATCH',
                headers: new Headers({
                    'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                    'Content-Type': 'application/json'
                }),
                body: serializedData
            }
        );

        if (response.ok) {
            // Update file name with timestamp
            const fileName = `unified_entity_database_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
            await gapi.client.drive.files.update({
                fileId: fileId,
                resource: { name: fileName }
            });

            console.log('=== Unified Database Saved Successfully ===');
            console.log(`File ID: ${fileId}`);
            console.log(`File name: ${fileName}`);
            console.log(`Entities saved: ${database.metadata.totalEntities}`);

            return {
                success: true,
                fileId: fileId,
                fileName: fileName,
                metadata: database.metadata,
                sizeBytes: serializedData.length
            };
        } else {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }
    } catch (error) {
        console.error('Error saving unified database:', error);
        throw error;
    }
}

// =============================================================================
// LOAD FROM GOOGLE DRIVE
// =============================================================================

/**
 * Load the unified entity database from Google Drive.
 * Uses deserializeWithTypes to restore class instances.
 * Populates window.unifiedEntityDatabase global.
 *
 * @param {string} fileId - Google Drive file ID to load from
 * @returns {Promise<Object>} Load result with success status and metadata
 */
async function loadUnifiedDatabase(fileId = UNIFIED_DATABASE_FILE_ID) {
    console.log('=== Loading Unified Database from Google Drive ===');

    if (!fileId) {
        throw new Error('No file ID provided. Please set UNIFIED_DATABASE_FILE_ID or pass a fileId parameter.');
    }

    try {
        console.log(`Fetching file: ${fileId}...`);

        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });

        const sizeKB = (response.body.length / 1024).toFixed(1);
        console.log(`Downloaded ${sizeKB} KB`);

        // Deserialize with type restoration
        console.log('Deserializing with type restoration...');
        const database = deserializeWithTypes(response.body);

        // Validate structure
        if (!database.entities || !database.metadata) {
            throw new Error('Invalid database structure - missing entities or metadata');
        }

        // Store in global
        window.unifiedEntityDatabase = database;

        // Verify class instances were restored
        const sampleKeys = Object.keys(database.entities).slice(0, 3);
        let classesRestored = 0;
        for (const key of sampleKeys) {
            const entity = database.entities[key];
            if (entity.constructor?.name !== 'Object') {
                classesRestored++;
            }
        }

        console.log('=== Unified Database Loaded Successfully ===');
        console.log(`Total entities: ${database.metadata.totalEntities}`);
        console.log(`Created at: ${database.metadata.createdAt}`);
        console.log('By source:', database.metadata.sources);
        console.log('By type:', database.metadata.entityTypes);
        console.log(`Class restoration check: ${classesRestored}/${sampleKeys.length} sample entities have class constructors`);

        return {
            success: true,
            fileId: fileId,
            metadata: database.metadata,
            entityCount: Object.keys(database.entities).length,
            classesRestored: classesRestored === sampleKeys.length
        };
    } catch (error) {
        console.error('Error loading unified database:', error);
        window.unifiedEntityDatabase = null;
        throw error;
    }
}

// =============================================================================
// COMBINED OPERATION: LOAD SOURCES AND SAVE UNIFIED
// =============================================================================

/**
 * Load entities from source files (VisionAppraisal + Bloomerang) AND save unified database.
 * This is a convenience function that combines the two-step process.
 *
 * @param {string} unifiedFileId - Google Drive file ID for unified database
 * @returns {Promise<Object>} Result with load and save status
 */
async function loadSourcesAndSaveUnified(unifiedFileId = UNIFIED_DATABASE_FILE_ID) {
    console.log('=== Load Sources and Save Unified Database ===');

    if (!unifiedFileId) {
        throw new Error('No unified database file ID provided.');
    }

    // First, ensure entities are loaded using existing loadAllEntitiesIntoMemory
    if (!window.workingLoadedEntities || workingLoadedEntities.status !== 'loaded') {
        console.log('Entities not loaded. Loading now...');

        if (typeof loadAllEntitiesIntoMemory === 'function') {
            await loadAllEntitiesIntoMemory();
        } else {
            throw new Error('loadAllEntitiesIntoMemory function not available. Please load entities first.');
        }
    }

    // Verify entities are loaded
    if (!window.workingLoadedEntities || workingLoadedEntities.status !== 'loaded') {
        throw new Error('Failed to load entities from source files.');
    }

    // Save unified database
    const saveResult = await saveUnifiedDatabase(unifiedFileId);

    return {
        success: true,
        loadStatus: 'Entities loaded from source files',
        saveResult: saveResult
    };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get entity from unified database by key
 * @param {string} key - Entity key
 * @returns {Entity|null} Entity or null if not found
 */
function getUnifiedEntity(key) {
    if (!window.unifiedEntityDatabase?.entities) {
        console.warn('Unified database not loaded');
        return null;
    }
    return window.unifiedEntityDatabase.entities[key] || null;
}

/**
 * Check if unified database is loaded
 * @returns {boolean} True if loaded
 */
function isUnifiedDatabaseLoaded() {
    return window.unifiedEntityDatabase !== null &&
           window.unifiedEntityDatabase.entities !== undefined;
}

/**
 * Get all entity keys from unified database
 * @returns {string[]} Array of keys
 */
function getUnifiedEntityKeys() {
    if (!window.unifiedEntityDatabase?.entities) {
        return [];
    }
    return Object.keys(window.unifiedEntityDatabase.entities);
}

/**
 * Get unified database statistics
 * @returns {Object|null} Metadata or null if not loaded
 */
function getUnifiedDatabaseStats() {
    if (!window.unifiedEntityDatabase?.metadata) {
        return null;
    }
    return window.unifiedEntityDatabase.metadata;
}

// =============================================================================
// COMPATIBILITY LAYER
// =============================================================================
// These functions provide a unified interface that works with either:
// - unifiedEntityDatabase (preferred, loaded from disk)
// - workingLoadedEntities (legacy, loaded from source files)
// This allows incremental migration of code from the old structure to the new.

// Cache for built database (when using workingLoadedEntities fallback)
let cachedBuiltDatabase = null;

/**
 * Get the entity database as a keyed object.
 * Works with either unifiedEntityDatabase (preferred) or workingLoadedEntities (legacy).
 *
 * @returns {Object|null} Keyed entities { key: entity, ... } or null if nothing loaded
 */
function getEntityDatabase() {
    // Prefer unified database if loaded (it's already keyed)
    if (window.unifiedEntityDatabase?.entities) {
        return window.unifiedEntityDatabase.entities;
    }

    // Fall back to building from workingLoadedEntities (with caching)
    if (window.workingLoadedEntities?.status === 'loaded') {
        // Use cached version if available
        if (cachedBuiltDatabase) {
            return cachedBuiltDatabase.entities;
        }
        // Build and cache the unified structure
        const database = buildUnifiedEntityDatabase();
        cachedBuiltDatabase = database;
        return database.entities;
    }

    return null;
}

/**
 * Clear the cached built database.
 * Call this when workingLoadedEntities is reloaded or changed.
 */
function clearEntityDatabaseCache() {
    cachedBuiltDatabase = null;
    console.log('Entity database cache cleared');
}

/**
 * Check if any entity database is available (either unified or legacy)
 * @returns {boolean} True if entities are available
 */
function isEntityDatabaseLoaded() {
    return (window.unifiedEntityDatabase?.entities != null) ||
           (window.workingLoadedEntities?.status === 'loaded');
}

/**
 * Get all entities as an array (for code that expects arrays)
 * Works with either data source.
 *
 * @returns {Entity[]} Array of all entities
 */
function getAllEntitiesArray() {
    const db = getEntityDatabase();
    if (!db) return [];
    return Object.values(db);
}

/**
 * Get all entities WITH their database keys as [key, entity] pairs
 * This is the PREFERRED method - preserves the actual database keys for lookup
 * @returns {Array<[string, Entity]>} Array of [databaseKey, entity] tuples
 */
function getAllEntitiesWithKeys() {
    const db = getEntityDatabase();
    if (!db) return [];
    return Object.entries(db);
}

/**
 * Get all entities filtered by source
 * @param {string} source - 'visionAppraisal', 'bloomerang', or 'all'
 * @returns {Object} Keyed entities filtered by source
 */
function getEntitiesBySource(source = 'all') {
    const db = getEntityDatabase();
    if (!db) return {};

    if (source === 'all') {
        return db;
    }

    const prefix = source.toLowerCase() === 'visionappraisal' ? 'visionAppraisal:' : 'bloomerang:';
    const filtered = {};

    for (const [key, entity] of Object.entries(db)) {
        if (key.startsWith(prefix)) {
            filtered[key] = entity;
        }
    }

    return filtered;
}

/**
 * Get all entities filtered by entity type
 * @param {string} entityType - 'Individual', 'AggregateHousehold', 'Business', 'LegalConstruct', 'NonHuman', or 'all'
 * @returns {Object} Keyed entities filtered by type
 */
function getEntitiesByType(entityType = 'all') {
    const db = getEntityDatabase();
    if (!db) return {};

    if (entityType === 'all') {
        return db;
    }

    const filtered = {};

    for (const [key, entity] of Object.entries(db)) {
        const type = entity.constructor?.name || 'Unknown';
        if (type === entityType) {
            filtered[key] = entity;
        }
    }

    return filtered;
}

/**
 * Get entities filtered by both source and type
 * @param {string} source - 'visionAppraisal', 'bloomerang', or 'all'
 * @param {string} entityType - Entity type or 'all'
 * @returns {Object} Keyed entities matching both filters
 */
function getFilteredEntities(source = 'all', entityType = 'all') {
    let db = getEntityDatabase();
    if (!db) return {};

    // Apply source filter
    if (source !== 'all') {
        db = getEntitiesBySource(source);
    }

    // Apply type filter
    if (entityType !== 'all') {
        const filtered = {};
        for (const [key, entity] of Object.entries(db)) {
            const type = entity.constructor?.name || 'Unknown';
            if (type === entityType) {
                filtered[key] = entity;
            }
        }
        return filtered;
    }

    return db;
}

/**
 * Get database metadata (works with either source)
 * @returns {Object} Metadata about loaded database
 */
function getEntityDatabaseMetadata() {
    // Prefer unified database metadata
    if (window.unifiedEntityDatabase?.metadata) {
        return {
            source: 'unifiedEntityDatabase',
            ...window.unifiedEntityDatabase.metadata
        };
    }

    // Build metadata from workingLoadedEntities
    if (window.workingLoadedEntities?.status === 'loaded') {
        const db = getEntityDatabase();
        const entityTypes = {};
        const sources = { visionAppraisal: 0, bloomerang: 0 };

        for (const [key, entity] of Object.entries(db)) {
            const type = entity.constructor?.name || 'Unknown';
            entityTypes[type] = (entityTypes[type] || 0) + 1;

            if (key.startsWith('visionAppraisal:')) {
                sources.visionAppraisal++;
            } else if (key.startsWith('bloomerang:')) {
                sources.bloomerang++;
            }
        }

        return {
            source: 'workingLoadedEntities',
            totalEntities: Object.keys(db).length,
            entityTypes,
            sources
        };
    }

    return null;
}

/**
 * Get unified statistics data object for the entity database.
 * Returns raw data object (NOT HTML) for programmatic use.
 * Note: generateUnifiedStats() in unifiedEntityBrowser.js returns HTML for display.
 *
 * @returns {Object|null} Statistics object with totalEntities, bySource, byType, databaseSource
 */
function getUnifiedStatsData() {
    const metadata = getEntityDatabaseMetadata();
    if (!metadata) return null;

    // Transform to expected format
    return {
        totalEntities: metadata.totalEntities,
        bySource: metadata.sources,
        byType: metadata.entityTypes,
        databaseSource: metadata.source
    };
}

/**
 * Check if any data is loaded (entities available)
 * @returns {boolean} True if entities are available
 */
function hasLoadedData() {
    return isEntityDatabaseLoaded();
}

// NOTE: getAllSelectedEntities() is NOT exported from this module.
// The browser module (unifiedEntityBrowser.js) owns that function because it
// returns complete entityWrapper objects with all required properties
// (source, sourceKey, entityType, index, key, entity).
// See reference_keyedDatabaseMigration.md Phase 1 for details.

// =============================================================================
// EXPORTS
// =============================================================================

// Make functions available globally
window.generateUnifiedEntityKey = generateUnifiedEntityKey;
window.buildUnifiedEntityDatabase = buildUnifiedEntityDatabase;
window.saveUnifiedDatabase = saveUnifiedDatabase;
window.loadUnifiedDatabase = loadUnifiedDatabase;
window.loadSourcesAndSaveUnified = loadSourcesAndSaveUnified;
window.getUnifiedEntity = getUnifiedEntity;
window.isUnifiedDatabaseLoaded = isUnifiedDatabaseLoaded;
window.getUnifiedEntityKeys = getUnifiedEntityKeys;
window.getUnifiedDatabaseStats = getUnifiedDatabaseStats;

// Compatibility layer functions
window.getEntityDatabase = getEntityDatabase;
window.clearEntityDatabaseCache = clearEntityDatabaseCache;
window.isEntityDatabaseLoaded = isEntityDatabaseLoaded;
window.getAllEntitiesArray = getAllEntitiesArray;
window.getAllEntitiesWithKeys = getAllEntitiesWithKeys;
window.getEntitiesBySource = getEntitiesBySource;
window.getEntitiesByType = getEntitiesByType;
window.getFilteredEntities = getFilteredEntities;
window.getEntityDatabaseMetadata = getEntityDatabaseMetadata;
window.getUnifiedStatsData = getUnifiedStatsData;
window.hasLoadedData = hasLoadedData;
// NOTE: getAllSelectedEntities is NOT exported - owned by unifiedEntityBrowser.js

console.log('Unified Database Persistence module loaded (with compatibility layer)');
