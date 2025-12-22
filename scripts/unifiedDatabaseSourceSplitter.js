/**
 * Unified Database Source Splitter
 *
 * Splits the unified entity database into separate files by data source.
 * This is needed because Google Apps Script has a 50 MB file size limit,
 * and the combined unified database exceeds that limit (~91 MB).
 *
 * USAGE:
 *   1. Load unified database (via "Load Unified Database" or "Load All Entities Into Memory")
 *   2. Call splitUnifiedDatabaseBySource() to create two files on Google Drive
 *
 * OUTPUT FILES:
 *   - VisionAppraisal entities file: ~40 MB
 *   - Bloomerang entities file: ~51 MB (may still be tight, but should work)
 *
 * IMPORTANT: This exports from window.unifiedEntityDatabase.entities to ensure
 * exact object structure consistency (furthest down the processing chain).
 */

// =============================================================================
// SPLIT BY SOURCE
// =============================================================================

/**
 * Split the unified entity database into two databases by source.
 * Works from window.unifiedEntityDatabase.entities to ensure exact object structure.
 *
 * @returns {Object} Two databases: { visionAppraisal: {...}, bloomerang: {...} }
 */
function splitDatabaseBySource() {
    console.log('=== Splitting Unified Database by Source ===');

    if (!window.unifiedEntityDatabase?.entities) {
        throw new Error('Unified entity database not loaded. Load it first via "Load Unified Database" or "Load All Entities Into Memory".');
    }

    const sourceEntities = window.unifiedEntityDatabase.entities;
    const totalCount = Object.keys(sourceEntities).length;
    console.log(`Source database has ${totalCount} entities`);

    // Initialize the two split databases
    const visionAppraisalDb = {
        metadata: {
            createdAt: new Date().toISOString(),
            version: '1.0',
            source: 'visionAppraisal',
            splitFrom: 'unifiedEntityDatabase',
            originalMetadata: window.unifiedEntityDatabase.metadata,
            totalEntities: 0,
            entityTypes: {}
        },
        entities: {}
    };

    const bloomerangDb = {
        metadata: {
            createdAt: new Date().toISOString(),
            version: '1.0',
            source: 'bloomerang',
            splitFrom: 'unifiedEntityDatabase',
            originalMetadata: window.unifiedEntityDatabase.metadata,
            totalEntities: 0,
            entityTypes: {}
        },
        entities: {}
    };

    // Iterate over all entities and route by key prefix
    let vaCount = 0;
    let bloomerangCount = 0;
    let unknownCount = 0;

    for (const [key, entity] of Object.entries(sourceEntities)) {
        const entityType = entity.constructor?.name || 'Unknown';

        if (key.startsWith('visionAppraisal:')) {
            visionAppraisalDb.entities[key] = entity;
            visionAppraisalDb.metadata.entityTypes[entityType] =
                (visionAppraisalDb.metadata.entityTypes[entityType] || 0) + 1;
            vaCount++;
        } else if (key.startsWith('bloomerang:')) {
            bloomerangDb.entities[key] = entity;
            bloomerangDb.metadata.entityTypes[entityType] =
                (bloomerangDb.metadata.entityTypes[entityType] || 0) + 1;
            bloomerangCount++;
        } else {
            console.warn(`Unknown key prefix: ${key}`);
            unknownCount++;
        }
    }

    // Update totals
    visionAppraisalDb.metadata.totalEntities = vaCount;
    bloomerangDb.metadata.totalEntities = bloomerangCount;

    console.log(`Split complete:`);
    console.log(`  VisionAppraisal: ${vaCount} entities`);
    console.log(`  Bloomerang: ${bloomerangCount} entities`);
    if (unknownCount > 0) {
        console.warn(`  Unknown prefix (skipped): ${unknownCount} entities`);
    }
    console.log(`  Total processed: ${vaCount + bloomerangCount + unknownCount}`);

    return {
        visionAppraisal: visionAppraisalDb,
        bloomerang: bloomerangDb
    };
}

// =============================================================================
// SAVE TO GOOGLE DRIVE
// =============================================================================

/**
 * Save a single split database to a new Google Drive file.
 *
 * @param {Object} database - The split database to save
 * @param {string} sourceName - 'visionAppraisal' or 'bloomerang'
 * @returns {Promise<Object>} Result with fileId and stats
 */
async function saveSplitDatabaseToNewFile(database, sourceName) {
    console.log(`Saving ${sourceName} database to new Google Drive file...`);

    // Serialize with type preservation
    const serializedData = serializeWithTypes(database);
    const sizeKB = (serializedData.length / 1024).toFixed(1);
    const sizeMB = (serializedData.length / (1024 * 1024)).toFixed(2);
    console.log(`  Serialized size: ${sizeKB} KB (${sizeMB} MB)`);

    // Create filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const fileName = `unified_database_${sourceName}_${timestamp}.json`;

    // Create new file on Google Drive
    const createResponse = await gapi.client.drive.files.create({
        resource: {
            name: fileName,
            mimeType: 'application/json'
        },
        fields: 'id'
    });

    const fileId = createResponse.result.id;
    console.log(`  Created file with ID: ${fileId}`);

    // Upload content
    const uploadResponse = await fetch(
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

    if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: HTTP ${uploadResponse.status}: ${errorText}`);
    }

    console.log(`  ✓ ${sourceName} database saved successfully`);

    return {
        source: sourceName,
        fileId: fileId,
        fileName: fileName,
        entityCount: database.metadata.totalEntities,
        sizeBytes: serializedData.length,
        sizeMB: parseFloat(sizeMB)
    };
}

/**
 * Save a single split database to an existing Google Drive file.
 *
 * @param {Object} database - The split database to save
 * @param {string} sourceName - 'visionAppraisal' or 'bloomerang'
 * @param {string} fileId - Existing Google Drive file ID
 * @returns {Promise<Object>} Result with fileId and stats
 */
async function saveSplitDatabaseToExistingFile(database, sourceName, fileId) {
    console.log(`Saving ${sourceName} database to existing file: ${fileId}...`);

    // Serialize with type preservation
    const serializedData = serializeWithTypes(database);
    const sizeKB = (serializedData.length / 1024).toFixed(1);
    const sizeMB = (serializedData.length / (1024 * 1024)).toFixed(2);
    console.log(`  Serialized size: ${sizeKB} KB (${sizeMB} MB)`);

    // Update filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const fileName = `unified_database_${sourceName}_${timestamp}.json`;

    // Upload content
    const uploadResponse = await fetch(
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

    if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: HTTP ${uploadResponse.status}: ${errorText}`);
    }

    // Update file name
    await gapi.client.drive.files.update({
        fileId: fileId,
        resource: { name: fileName }
    });

    console.log(`  ✓ ${sourceName} database saved successfully`);

    return {
        source: sourceName,
        fileId: fileId,
        fileName: fileName,
        entityCount: database.metadata.totalEntities,
        sizeBytes: serializedData.length,
        sizeMB: parseFloat(sizeMB)
    };
}

// =============================================================================
// MAIN EXPORT FUNCTION
// =============================================================================

/**
 * Split the unified database by source and save to Google Drive.
 * Creates two new files (one for VisionAppraisal, one for Bloomerang).
 *
 * @param {Object} options - Optional configuration
 * @param {string} options.visionAppraisalFileId - Existing file ID for VA (null = create new)
 * @param {string} options.bloomerangFileId - Existing file ID for Bloomerang (null = create new)
 * @returns {Promise<Object>} Results for both saves
 */
async function splitUnifiedDatabaseBySource(options = {}) {
    console.log('=== Split Unified Database by Source ===');

    // Split the database
    const { visionAppraisal, bloomerang } = splitDatabaseBySource();

    // Save VisionAppraisal
    let vaResult;
    if (options.visionAppraisalFileId) {
        vaResult = await saveSplitDatabaseToExistingFile(
            visionAppraisal,
            'visionAppraisal',
            options.visionAppraisalFileId
        );
    } else {
        vaResult = await saveSplitDatabaseToNewFile(visionAppraisal, 'visionAppraisal');
    }

    // Save Bloomerang
    let bloomerangResult;
    if (options.bloomerangFileId) {
        bloomerangResult = await saveSplitDatabaseToExistingFile(
            bloomerang,
            'bloomerang',
            options.bloomerangFileId
        );
    } else {
        bloomerangResult = await saveSplitDatabaseToNewFile(bloomerang, 'bloomerang');
    }

    // Report results
    console.log('\n=== Split and Save Complete ===');
    console.log(`VisionAppraisal:`);
    console.log(`  File ID: ${vaResult.fileId}`);
    console.log(`  Entities: ${vaResult.entityCount}`);
    console.log(`  Size: ${vaResult.sizeMB} MB`);
    console.log(`Bloomerang:`);
    console.log(`  File ID: ${bloomerangResult.fileId}`);
    console.log(`  Entities: ${bloomerangResult.entityCount}`);
    console.log(`  Size: ${bloomerangResult.sizeMB} MB`);

    const results = {
        success: true,
        visionAppraisal: vaResult,
        bloomerang: bloomerangResult,
        totalEntities: vaResult.entityCount + bloomerangResult.entityCount,
        totalSizeMB: vaResult.sizeMB + bloomerangResult.sizeMB
    };

    // Store file IDs in localStorage for easy reference
    localStorage.setItem('splitDb_visionAppraisal_fileId', vaResult.fileId);
    localStorage.setItem('splitDb_bloomerang_fileId', bloomerangResult.fileId);
    console.log('File IDs saved to localStorage (splitDb_visionAppraisal_fileId, splitDb_bloomerang_fileId)');

    return results;
}

// =============================================================================
// LOAD SPLIT DATABASE
// =============================================================================

/**
 * Load a split database from Google Drive.
 *
 * @param {string} fileId - Google Drive file ID
 * @param {string} sourceName - 'visionAppraisal' or 'bloomerang' (for logging)
 * @returns {Promise<Object>} Loaded database
 */
async function loadSplitDatabase(fileId, sourceName = 'unknown') {
    console.log(`Loading ${sourceName} split database from file: ${fileId}...`);

    const response = await gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media'
    });

    const sizeKB = (response.body.length / 1024).toFixed(1);
    const sizeMB = (response.body.length / (1024 * 1024)).toFixed(2);
    console.log(`  Downloaded ${sizeKB} KB (${sizeMB} MB)`);

    // Deserialize with type restoration
    const database = deserializeWithTypes(response.body);

    console.log(`  ✓ Loaded ${database.metadata.totalEntities} ${sourceName} entities`);

    return database;
}

/**
 * Load both split databases from Google Drive.
 * Uses localStorage file IDs if not provided.
 *
 * @param {Object} options - Optional configuration
 * @param {string} options.visionAppraisalFileId - File ID for VA
 * @param {string} options.bloomerangFileId - File ID for Bloomerang
 * @returns {Promise<Object>} Both loaded databases
 */
async function loadSplitDatabases(options = {}) {
    console.log('=== Loading Split Databases ===');

    const vaFileId = options.visionAppraisalFileId ||
                     localStorage.getItem('splitDb_visionAppraisal_fileId');
    const bloomerangFileId = options.bloomerangFileId ||
                              localStorage.getItem('splitDb_bloomerang_fileId');

    if (!vaFileId || !bloomerangFileId) {
        throw new Error('Missing file IDs. Provide them in options or run splitUnifiedDatabaseBySource() first.');
    }

    const visionAppraisal = await loadSplitDatabase(vaFileId, 'visionAppraisal');
    const bloomerang = await loadSplitDatabase(bloomerangFileId, 'bloomerang');

    console.log('\n=== Split Databases Loaded ===');
    console.log(`VisionAppraisal: ${visionAppraisal.metadata.totalEntities} entities`);
    console.log(`Bloomerang: ${bloomerang.metadata.totalEntities} entities`);

    return {
        visionAppraisal,
        bloomerang,
        totalEntities: visionAppraisal.metadata.totalEntities + bloomerang.metadata.totalEntities
    };
}

// =============================================================================
// SPLIT VISIONAPPRAISAL INTO TWO FILES (for 50MB limit)
// =============================================================================

/**
 * Split VisionAppraisal entities into two files by fire number range.
 * This is needed because the single VA file exceeds Google Apps Script's 50MB limit.
 *
 * @returns {Object} Three databases: { visionAppraisal1, visionAppraisal2, bloomerang }
 */
function splitDatabaseBySourceThreeWay() {
    console.log('=== Splitting Unified Database (3-way split for VA) ===');

    if (!window.unifiedEntityDatabase?.entities) {
        throw new Error('Unified entity database not loaded. Load it first.');
    }

    const sourceEntities = window.unifiedEntityDatabase.entities;
    const totalCount = Object.keys(sourceEntities).length;
    console.log(`Source database has ${totalCount} entities`);

    // Initialize the three split databases
    const va1Db = {
        metadata: {
            createdAt: new Date().toISOString(),
            version: '1.0',
            source: 'visionAppraisal_part1',
            splitFrom: 'unifiedEntityDatabase',
            description: 'VisionAppraisal entities with FireNumber < 800',
            totalEntities: 0,
            entityTypes: {}
        },
        entities: {}
    };

    const va2Db = {
        metadata: {
            createdAt: new Date().toISOString(),
            version: '1.0',
            source: 'visionAppraisal_part2',
            splitFrom: 'unifiedEntityDatabase',
            description: 'VisionAppraisal entities with FireNumber >= 800',
            totalEntities: 0,
            entityTypes: {}
        },
        entities: {}
    };

    const bloomerangDb = {
        metadata: {
            createdAt: new Date().toISOString(),
            version: '1.0',
            source: 'bloomerang',
            splitFrom: 'unifiedEntityDatabase',
            totalEntities: 0,
            entityTypes: {}
        },
        entities: {}
    };

    let va1Count = 0;
    let va2Count = 0;
    let bloomerangCount = 0;
    let unknownCount = 0;

    for (const [key, entity] of Object.entries(sourceEntities)) {
        const entityType = entity.constructor?.name || 'Unknown';

        if (key.startsWith('visionAppraisal:')) {
            // Extract fire number from key like "visionAppraisal:FireNumber:1234"
            const match = key.match(/FireNumber:(\d+)/);
            const fireNum = match ? parseInt(match[1], 10) : 0;

            if (fireNum < 800) {
                va1Db.entities[key] = entity;
                va1Db.metadata.entityTypes[entityType] =
                    (va1Db.metadata.entityTypes[entityType] || 0) + 1;
                va1Count++;
            } else {
                va2Db.entities[key] = entity;
                va2Db.metadata.entityTypes[entityType] =
                    (va2Db.metadata.entityTypes[entityType] || 0) + 1;
                va2Count++;
            }
        } else if (key.startsWith('bloomerang:')) {
            bloomerangDb.entities[key] = entity;
            bloomerangDb.metadata.entityTypes[entityType] =
                (bloomerangDb.metadata.entityTypes[entityType] || 0) + 1;
            bloomerangCount++;
        } else {
            console.warn(`Unknown key prefix: ${key}`);
            unknownCount++;
        }
    }

    va1Db.metadata.totalEntities = va1Count;
    va2Db.metadata.totalEntities = va2Count;
    bloomerangDb.metadata.totalEntities = bloomerangCount;

    console.log(`Split complete:`);
    console.log(`  VisionAppraisal Part 1 (FireNumber < 800): ${va1Count} entities`);
    console.log(`  VisionAppraisal Part 2 (FireNumber >= 800): ${va2Count} entities`);
    console.log(`  Bloomerang: ${bloomerangCount} entities`);
    if (unknownCount > 0) {
        console.warn(`  Unknown prefix (skipped): ${unknownCount} entities`);
    }

    return {
        visionAppraisal1: va1Db,
        visionAppraisal2: va2Db,
        bloomerang: bloomerangDb
    };
}

/**
 * Split the unified database 3-way and save all to Google Drive.
 * Creates three files: VA Part 1, VA Part 2, Bloomerang.
 */
async function splitUnifiedDatabaseThreeWay() {
    console.log('=== Split Unified Database (3-way) ===');

    const { visionAppraisal1, visionAppraisal2, bloomerang } = splitDatabaseBySourceThreeWay();

    // Save VA Part 1
    const va1Result = await saveSplitDatabaseToNewFile(visionAppraisal1, 'visionAppraisal_part1');

    // Save VA Part 2
    const va2Result = await saveSplitDatabaseToNewFile(visionAppraisal2, 'visionAppraisal_part2');

    // Save Bloomerang
    const bloomerangResult = await saveSplitDatabaseToNewFile(bloomerang, 'bloomerang');

    console.log('\n=== 3-Way Split and Save Complete ===');
    console.log(`VisionAppraisal Part 1:`);
    console.log(`  File ID: ${va1Result.fileId}`);
    console.log(`  Entities: ${va1Result.entityCount}`);
    console.log(`  Size: ${va1Result.sizeMB} MB`);
    console.log(`VisionAppraisal Part 2:`);
    console.log(`  File ID: ${va2Result.fileId}`);
    console.log(`  Entities: ${va2Result.entityCount}`);
    console.log(`  Size: ${va2Result.sizeMB} MB`);
    console.log(`Bloomerang:`);
    console.log(`  File ID: ${bloomerangResult.fileId}`);
    console.log(`  Entities: ${bloomerangResult.entityCount}`);
    console.log(`  Size: ${bloomerangResult.sizeMB} MB`);

    const results = {
        success: true,
        visionAppraisal1: va1Result,
        visionAppraisal2: va2Result,
        bloomerang: bloomerangResult,
        totalEntities: va1Result.entityCount + va2Result.entityCount + bloomerangResult.entityCount,
        totalSizeMB: va1Result.sizeMB + va2Result.sizeMB + bloomerangResult.sizeMB
    };

    // Store file IDs in localStorage
    localStorage.setItem('splitDb_visionAppraisal1_fileId', va1Result.fileId);
    localStorage.setItem('splitDb_visionAppraisal2_fileId', va2Result.fileId);
    localStorage.setItem('splitDb_bloomerang_fileId', bloomerangResult.fileId);
    console.log('File IDs saved to localStorage (splitDb_visionAppraisal1_fileId, splitDb_visionAppraisal2_fileId, splitDb_bloomerang_fileId)');

    return results;
}

// =============================================================================
// EXPORTS
// =============================================================================

window.splitDatabaseBySource = splitDatabaseBySource;
window.splitUnifiedDatabaseBySource = splitUnifiedDatabaseBySource;
window.splitDatabaseBySourceThreeWay = splitDatabaseBySourceThreeWay;
window.splitUnifiedDatabaseThreeWay = splitUnifiedDatabaseThreeWay;
window.saveSplitDatabaseToNewFile = saveSplitDatabaseToNewFile;
window.saveSplitDatabaseToExistingFile = saveSplitDatabaseToExistingFile;
window.loadSplitDatabase = loadSplitDatabase;
window.loadSplitDatabases = loadSplitDatabases;

console.log('Unified Database Source Splitter module loaded');
console.log('  Use splitUnifiedDatabaseBySource() to split 2-way (VA + Bloomerang)');
console.log('  Use splitUnifiedDatabaseThreeWay() to split 3-way (VA1 + VA2 + Bloomerang) - for 50MB limit');
