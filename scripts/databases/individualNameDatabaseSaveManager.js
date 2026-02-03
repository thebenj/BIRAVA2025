/**
 * =============================================================================
 * INDIVIDUALNAME DATABASE SAVE MANAGER
 * =============================================================================
 *
 * Robust save architecture for IndividualNameDatabase:
 * 1. Bulk save - Single JSON file with entire database (fast, reliable)
 * 2. Incremental file-out - Creates individual files with resume capability
 *
 * GOOGLE DRIVE RESOURCES:
 * - Bulk file: Stored in the Objects folder with name "BULK_DATABASE.json"
 * - Progress file: Stored in Objects folder with name "FILEOUT_PROGRESS.json"
 *
 * USAGE:
 *   // Step 1: Save bulk file (fast - single API call)
 *   await saveIndividualNameDatabaseBulk();
 *
 *   // Step 2: File out individually (can resume if interrupted)
 *   await fileOutIndividualNames({ parallel: 5 });  // 5 concurrent saves
 *   // OR
 *   await fileOutIndividualNames({ parallel: 1 });  // Sequential (safe)
 *
 *   // Check progress
 *   await checkFileOutProgress();
 *
 *   // Resume after interruption
 *   await fileOutIndividualNames({ resume: true, parallel: 5 });
 *
 * Created: January 28, 2026
 * =============================================================================
 */

// Use the same folder as IndividualNameDatabase
// These are imported from individualNameDatabase.js when loaded

const BULK_DATABASE_FILE_ID = '1r2G6Spg064KNbBzzKqIk131qAK0NDM9l';
const DEV_BULK_DATABASE_FILE_ID = '1K1q_nhOBHKiXD5UbKRkXZpkHKxgIdu1S';
const FILEOUT_PROGRESS_KEY = 'birava_individualName_fileout_progress';
const FETCH_TIMEOUT_MS = 30000;  // 30 second timeout for fetch requests

// Characters not allowed in Google Drive filenames
const GOOGLE_DRIVE_INVALID_CHARS = /[\/\\<>:"|?*]/g;

/**
 * Normalize a string for Google Drive filename comparison.
 * Replaces characters not allowed in Google Drive filenames with spaces.
 * Invalid chars: / \ < > : " | ? *
 *
 * @param {string} str - The string to normalize
 * @returns {string} The normalized string with invalid chars replaced by spaces
 */
function normalizeForGoogleDrive(str) {
    return str.replace(GOOGLE_DRIVE_INVALID_CHARS, ' ');
}

/**
 * Fetch with timeout - prevents hung requests from freezing the process
 */
async function fetchWithTimeout(url, options, timeoutMs = FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error(`Request timed out after ${timeoutMs}ms`);
        }
        throw error;
    }
}

// =============================================================================
// BULK SAVE - Single JSON file with entire database
// =============================================================================

/**
 * Save the entire IndividualNameDatabase as a single bulk JSON file
 * This is fast (single API call) and provides a reliable backup
 *
 * @param {IndividualNameDatabase} [db] - Database to save (defaults to window.individualNameDatabase)
 * @returns {Promise<Object>} Result with fileId and stats
 */
async function saveIndividualNameDatabaseBulk(db = null) {
    db = db || window.individualNameDatabase;

    if (!db || !db.entries || db.entries.size === 0) {
        throw new Error('No IndividualNameDatabase loaded or database is empty');
    }

    console.log('=== BULK SAVE: IndividualNameDatabase ===');
    console.log(`Entries to save: ${db.entries.size}`);

    // Serialize all entries
    const bulkData = {
        __format: 'IndividualNameDatabaseBulk',
        __version: '1.0',
        __created: new Date().toISOString(),
        __objectType: 'IndividualName',
        __count: db.entries.size,
        entries: {}
    };

    for (const [primaryKey, entry] of db.entries) {
        bulkData.entries[primaryKey] = {
            object: serializeWithTypes(entry.object),
            created: entry.created || new Date().toISOString(),
            lastModified: entry.lastModified || new Date().toISOString()
        };
    }

    const jsonContent = JSON.stringify(bulkData, null, 2);
    console.log(`JSON size: ${(jsonContent.length / 1024).toFixed(1)} KB`);

    // Save to hardcoded bulk file ID
    console.log(`Saving to bulk file: ${BULK_DATABASE_FILE_ID}`);
    const response = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${BULK_DATABASE_FILE_ID}?uploadType=media`,
        {
            method: 'PATCH',
            headers: new Headers({
                'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                'Content-Type': 'application/json'
            }),
            body: jsonContent
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to save bulk file: HTTP ${response.status}`);
    }

    console.log('=== BULK SAVE COMPLETE ===');
    console.log(`File ID: ${BULK_DATABASE_FILE_ID}`);
    console.log(`Entries saved: ${db.entries.size}`);

    return {
        success: true,
        fileId: BULK_DATABASE_FILE_ID,
        entriesSaved: db.entries.size,
        jsonSizeKB: (jsonContent.length / 1024).toFixed(1)
    };
}

/**
 * Save the IndividualNameDatabase to the DEV bulk file ONLY.
 * Used by the move alias feature to update the DEV bulk without touching the original.
 *
 * @param {IndividualNameDatabase} [db] - Database to save (defaults to window.individualNameDatabase)
 * @returns {Promise<Object>} Result with fileId and stats
 */
async function saveDevBulkFile(db = null) {
    db = db || window.individualNameDatabase;

    if (!db || !db.entries || db.entries.size === 0) {
        throw new Error('No IndividualNameDatabase loaded or database is empty');
    }

    console.log('=== DEV BULK SAVE: IndividualNameDatabase ===');
    console.log(`Entries to save: ${db.entries.size}`);

    // Serialize all entries
    const bulkData = {
        __format: 'IndividualNameDatabaseBulk',
        __version: '1.0',
        __created: new Date().toISOString(),
        __objectType: 'IndividualName',
        __count: db.entries.size,
        entries: {}
    };

    for (const [primaryKey, entry] of db.entries) {
        bulkData.entries[primaryKey] = {
            object: serializeWithTypes(entry.object),
            created: entry.created || new Date().toISOString(),
            lastModified: entry.lastModified || new Date().toISOString()
        };
    }

    const jsonContent = JSON.stringify(bulkData, null, 2);
    console.log(`JSON size: ${(jsonContent.length / 1024).toFixed(1)} KB`);

    // Save to DEV bulk file only
    console.log(`Saving to DEV bulk file: ${DEV_BULK_DATABASE_FILE_ID}`);
    const response = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${DEV_BULK_DATABASE_FILE_ID}?uploadType=media`,
        {
            method: 'PATCH',
            headers: new Headers({
                'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                'Content-Type': 'application/json'
            }),
            body: jsonContent
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to save DEV bulk file: HTTP ${response.status}`);
    }

    console.log('=== DEV BULK SAVE COMPLETE ===');
    console.log(`File ID: ${DEV_BULK_DATABASE_FILE_ID}`);
    console.log(`Entries saved: ${db.entries.size}`);

    return {
        success: true,
        fileId: DEV_BULK_DATABASE_FILE_ID,
        entriesSaved: db.entries.size,
        jsonSizeKB: (jsonContent.length / 1024).toFixed(1)
    };
}

/**
 * Load the IndividualNameDatabase from the bulk JSON file
 * Use this to restore the database after browser refresh before resuming file-out
 *
 * @returns {Promise<IndividualNameDatabase>} The loaded database
 */
async function loadIndividualNameDatabaseFromBulk() {
    console.log('[IndividualNameSaveManager] Loading database from bulk file...');

    // 1. Fetch bulk file from Google Drive
    const response = await gapi.client.drive.files.get({
        fileId: BULK_DATABASE_FILE_ID,
        alt: 'media'
    });

    const bulkData = JSON.parse(response.body);

    // 2. Validate format
    if (bulkData.__format !== 'IndividualNameDatabaseBulk') {
        throw new Error(`Invalid bulk file format: ${bulkData.__format}`);
    }

    console.log(`[IndividualNameSaveManager] Bulk file contains ${bulkData.__count} entries`);

    // 3. Get or create database instance
    const db = window.individualNameDatabase || new IndividualNameDatabase();
    db.entries.clear();

    // 4. Deserialize and populate entries
    let loaded = 0;
    for (const [primaryKey, entryData] of Object.entries(bulkData.entries)) {
        const object = deserializeWithTypes(entryData.object);
        db.entries.set(primaryKey, {
            object: object,
            fileId: null,  // Not yet filed out
            created: entryData.created,
            lastModified: entryData.lastModified
        });
        loaded++;
    }

    // 5. Build variation cache and mark loaded
    db._buildVariationCache();
    db._isLoaded = true;

    // 6. Ensure global reference
    window.individualNameDatabase = db;

    console.log(`[IndividualNameSaveManager] Loaded ${loaded} entries from bulk file`);
    db.printStats();

    return db;
}

// =============================================================================
// INCREMENTAL FILE-OUT - Create individual files with resume capability
// =============================================================================

/**
 * File out IndividualName entries to individual files
 * Supports parallel saves, resume capability, and batched processing
 *
 * @param {Object} options - Options
 * @param {number} [options.parallel=5] - Number of concurrent saves
 * @param {boolean} [options.resume=true] - Resume from last progress
 * @param {number} [options.maxBatch=400] - Maximum items to process per run (0 = no limit)
 * @param {string} [options.folderId] - Google Drive folder ID for objects
 * @param {string} [options.indexFileId] - Google Drive file ID for index
 * @param {IndividualNameDatabase} [options.db] - Database to use
 * @returns {Promise<Object>} Result with stats
 */
async function fileOutIndividualNames(options = {}) {
    const config = {
        parallel: 5,
        resume: true,
        maxBatch: 400,
        folderId: INDIVIDUALNAME_DATABASE_FOLDER_ID,
        indexFileId: INDIVIDUALNAME_DATABASE_INDEX_FILE_ID,
        db: null,
        ...options
    };

    const db = config.db || window.individualNameDatabase;

    if (!db || !db.entries || db.entries.size === 0) {
        throw new Error('No IndividualNameDatabase loaded or database is empty');
    }

    console.log('=== FILE-OUT: IndividualNameDatabase ===');
    console.log(`Total entries: ${db.entries.size}`);
    console.log(`Parallel saves: ${config.parallel}`);
    console.log(`Resume mode: ${config.resume}`);
    console.log(`Max batch: ${config.maxBatch}`);
    console.log(`Folder ID: ${config.folderId}`);

    // Get list of all primary keys
    const allKeys = Array.from(db.entries.keys());

    // Load or initialize progress
    let progress = { completed: [], failed: [], lastKey: null };

    if (config.resume) {
        progress = loadFileOutProgress();
        console.log(`Resuming: ${progress.completed.length} already completed, ${progress.failed.length} failed`);
    }

    // Determine which keys still need processing
    // Use inline normalization since progress keys may be in normalized format
    const completedSet = new Set(progress.completed);
    const keysToProcess = allKeys.filter(key =>
        !completedSet.has(key) && !completedSet.has(normalizeForGoogleDrive(key))
    );

    console.log(`Keys remaining to process: ${keysToProcess.length}`);

    if (keysToProcess.length === 0) {
        console.log('All entries already filed out!');
        return { success: true, processed: 0, failed: 0, total: allKeys.length, remaining: 0 };
    }

    // Limit to maxBatch items per run
    const batchKeys = config.maxBatch > 0 ? keysToProcess.slice(0, config.maxBatch) : keysToProcess;
    console.log(`Processing batch of ${batchKeys.length} (max: ${config.maxBatch})`);

    // Process in batches with parallelism
    const startTime = Date.now();
    let processed = 0;
    let failed = 0;

    // Index entries for updating
    const indexEntries = {};

    // Load existing index if available
    try {
        const indexResponse = await gapi.client.drive.files.get({
            fileId: config.indexFileId,
            alt: 'media'
        });
        const existingIndex = JSON.parse(indexResponse.body);
        if (existingIndex.entries) {
            Object.assign(indexEntries, existingIndex.entries);
        }
        console.log(`Loaded existing index with ${Object.keys(indexEntries).length} entries`);
    } catch (e) {
        console.log('No existing index found, starting fresh');
    }

    for (let i = 0; i < batchKeys.length; i += config.parallel) {
        const batch = batchKeys.slice(i, i + config.parallel);

        // Process batch in parallel
        const results = await Promise.allSettled(
            batch.map(key => saveIndividualEntry(key, db.entries.get(key), indexEntries, config.folderId))
        );

        // Track results
        for (let j = 0; j < results.length; j++) {
            const key = batch[j];
            if (results[j].status === 'fulfilled') {
                progress.completed.push(key);
                processed++;
            } else {
                progress.failed.push({ key, error: results[j].reason?.message });
                failed++;
                console.error(`Failed to save "${key}":`, results[j].reason);
            }
        }

        progress.lastKey = batch[batch.length - 1];

        // Save progress and index periodically (every 50 entries)
        const totalProcessed = processed + failed;
        if (totalProcessed % 50 === 0 || i + config.parallel >= batchKeys.length) {
            saveFileOutProgress(progress);

            // INCREMENTAL INDEX SAVE - prevents loss on crash
            await saveIndexFile(indexEntries, db.entries.size, config.indexFileId, config.folderId);

            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const rate = elapsed > 0 ? (processed / elapsed).toFixed(2) : '0';
            console.log(`Progress: ${processed}/${batchKeys.length} (${rate}/sec, ${failed} failed) - index saved`);
        }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const remaining = keysToProcess.length - batchKeys.length;

    console.log('=== BATCH COMPLETE ===');
    console.log(`Processed: ${processed}, Failed: ${failed}`);
    console.log(`Remaining after this batch: ${remaining}`);
    console.log(`Total time: ${totalTime}s`);

    return {
        success: failed === 0,
        processed,
        failed,
        total: allKeys.length,
        remaining,
        timeSeconds: parseFloat(totalTime)
    };
}

/**
 * Save a single IndividualName entry to Google Drive
 * @param {string} primaryKey - The primary key (name)
 * @param {Object} entry - The entry data from db.entries
 * @param {Object} indexEntries - Index entries object to update
 * @param {string} [folderId] - Google Drive folder ID
 */
async function saveIndividualEntry(primaryKey, entry, indexEntries, folderId = INDIVIDUALNAME_DATABASE_FOLDER_ID) {
    const fileName = primaryKey.replace(/\s+/g, '_').replace(/[<>:"/\\|?*]/g, '_') + '.json';
    const jsonContent = serializeWithTypes(entry.object);

    // Check if file already exists in index
    let fileId = indexEntries[primaryKey]?.fileId;

    if (fileId) {
        // Update existing file at its current location
        const response = await fetchWithTimeout(
            `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
            {
                method: 'PATCH',
                headers: new Headers({
                    'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                    'Content-Type': 'application/json'
                }),
                body: jsonContent
            }
        );

        if (!response.ok) {
            throw new Error(`Update failed: HTTP ${response.status}`);
        }
    } else {
        // Create new file in specified folder
        const createResponse = await gapi.client.drive.files.create({
            resource: {
                name: fileName,
                mimeType: 'application/json',
                parents: [folderId]
            },
            fields: 'id'
        });

        fileId = createResponse.result.id;

        // Upload content
        const uploadResponse = await fetchWithTimeout(
            `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
            {
                method: 'PATCH',
                headers: new Headers({
                    'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                    'Content-Type': 'application/json'
                }),
                body: jsonContent
            }
        );

        if (!uploadResponse.ok) {
            throw new Error(`Upload failed: HTTP ${uploadResponse.status}`);
        }
    }

    // Update index entry
    const now = new Date().toISOString();
    indexEntries[primaryKey] = {
        fileId: fileId,
        created: entry.created || now,
        lastModified: now
    };

    return fileId;
}

// =============================================================================
// PROGRESS TRACKING (localStorage - instant, no API calls)
// =============================================================================

/**
 * Load file-out progress from localStorage
 */
function loadFileOutProgress() {
    try {
        const stored = localStorage.getItem(FILEOUT_PROGRESS_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.log('Error reading progress from localStorage:', e);
    }
    return { completed: [], failed: [], lastKey: null };
}

/**
 * Save file-out progress to localStorage
 */
function saveFileOutProgress(progress) {
    localStorage.setItem(FILEOUT_PROGRESS_KEY, JSON.stringify(progress));
}

/**
 * Check current file-out progress
 */
function checkFileOutProgress() {
    const progress = loadFileOutProgress();

    console.log('=== FILE-OUT PROGRESS ===');
    console.log(`Completed: ${progress.completed.length}`);
    console.log(`Failed: ${progress.failed.length}`);
    console.log(`Last key: ${progress.lastKey || '(none)'}`);

    if (progress.failed.length > 0) {
        console.log('Failed entries:');
        progress.failed.slice(0, 10).forEach(f => console.log(`  - ${f.key}: ${f.error}`));
        if (progress.failed.length > 10) {
            console.log(`  ... and ${progress.failed.length - 10} more`);
        }
    }

    return progress;
}

/**
 * Clear progress (to restart from scratch)
 */
function clearFileOutProgress() {
    localStorage.removeItem(FILEOUT_PROGRESS_KEY);
    console.log('Progress cleared from localStorage');
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Find a file by name in a folder
 */
async function findFileInFolder(folderId, fileName) {
    try {
        const response = await gapi.client.drive.files.list({
            q: `'${folderId}' in parents and name = '${fileName}' and trashed = false`,
            fields: 'files(id, name)',
            pageSize: 1
        });

        if (response.result.files && response.result.files.length > 0) {
            return response.result.files[0].id;
        }

        return null;
    } catch (e) {
        console.error('Error finding file:', e);
        return null;
    }
}

/**
 * Save the index file
 * @param {Object} indexEntries - The index entries to save
 * @param {number} objectCount - Total object count for metadata
 * @param {string} [indexFileId] - Google Drive file ID for index
 * @param {string} [folderId] - Google Drive folder ID for objects
 */
async function saveIndexFile(indexEntries, objectCount, indexFileId = INDIVIDUALNAME_DATABASE_INDEX_FILE_ID, folderId = INDIVIDUALNAME_DATABASE_FOLDER_ID) {
    const indexData = {
        __format: 'AliasedTermDatabaseIndex',
        __version: '1.0',
        __created: new Date().toISOString(),
        __lastModified: new Date().toISOString(),
        __objectType: 'IndividualName',
        __folderFileId: folderId,
        __objectCount: objectCount,
        __indexedEntries: Object.keys(indexEntries).length,
        entries: indexEntries
    };

    const indexJson = JSON.stringify(indexData, null, 2);

    const response = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${indexFileId}?uploadType=media`,
        {
            method: 'PATCH',
            headers: new Headers({
                'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                'Content-Type': 'application/json'
            }),
            body: indexJson
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to save index: HTTP ${response.status}`);
    }
}

// =============================================================================
// VALIDATION AND RECONCILIATION
// =============================================================================

/**
 * Check if this is a fresh run (no prior progress)
 * @returns {boolean} True if no prior progress exists
 */
function isFirstRun() {
    const progress = loadFileOutProgress();
    return progress.completed.length === 0;
}

/**
 * CRITICAL: Reconcile index and localStorage to match bulk database.
 * This ensures consistency by removing any entries that don't exist in the bulk file.
 * Should be called at the START of every Build Run/Resume operation.
 *
 * @param {string} [folderId] - Google Drive folder ID
 * @param {string} [indexFileId] - Google Drive index file ID
 * @returns {Promise<Object>} Reconciliation results
 */
async function reconcileToMatchBulk(folderId = INDIVIDUALNAME_DATABASE_FOLDER_ID, indexFileId = INDIVIDUALNAME_DATABASE_INDEX_FILE_ID) {
    console.log('=== RECONCILING TO MATCH BULK ===');

    const db = window.individualNameDatabase;
    if (!db || !db.entries || db.entries.size === 0) {
        console.log('No bulk database loaded - skipping reconciliation');
        return { skipped: true, reason: 'no_bulk_database' };
    }

    const bulkKeys = new Set(db.entries.keys());
    console.log(`Bulk database has ${bulkKeys.size} entries (source of truth)`);

    // 1. Load and clean the index file
    let indexEntries = {};
    let indexCleaned = 0;
    try {
        const indexResponse = await gapi.client.drive.files.get({
            fileId: indexFileId,
            alt: 'media'
        });
        const existingIndex = JSON.parse(indexResponse.body);
        const oldEntries = existingIndex.entries || {};
        const oldCount = Object.keys(oldEntries).length;

        // Keep only entries that exist in bulk (use inline normalization)
        for (const [key, value] of Object.entries(oldEntries)) {
            if (bulkKeys.has(key) || bulkKeys.has(normalizeForGoogleDrive(key))) {
                indexEntries[key] = value;
            } else {
                indexCleaned++;
                console.log(`  Removing from index: ${key}`);
            }
        }

        console.log(`Index: ${oldCount} -> ${Object.keys(indexEntries).length} (removed ${indexCleaned} orphaned)`);

        // Save cleaned index if changes were made
        if (indexCleaned > 0) {
            await saveIndexFile(indexEntries, bulkKeys.size, indexFileId, folderId);
            console.log('Saved cleaned index');
        }
    } catch (e) {
        console.log('No existing index or error loading:', e.message);
    }

    // 2. Clean localStorage progress (use inline normalization)
    const progress = loadFileOutProgress();
    const oldCompleted = progress.completed.length;
    progress.completed = progress.completed.filter(k =>
        bulkKeys.has(k) || bulkKeys.has(normalizeForGoogleDrive(k))
    );
    const progressCleaned = oldCompleted - progress.completed.length;

    if (progressCleaned > 0) {
        saveFileOutProgress(progress);
        console.log(`Progress: ${oldCompleted} -> ${progress.completed.length} (removed ${progressCleaned} orphaned)`);
    }

    // 3. Sync progress with index (add any items in index that aren't in progress)
    // Use inline normalization since keys may differ by invalid Google Drive chars
    const indexKeys = new Set(Object.keys(indexEntries));
    const completedSet = new Set(progress.completed);
    let progressAdded = 0;

    for (const key of indexKeys) {
        if (!completedSet.has(key) && !completedSet.has(normalizeForGoogleDrive(key))) {
            progress.completed.push(key);
            progressAdded++;
        }
    }

    if (progressAdded > 0) {
        saveFileOutProgress(progress);
        console.log(`Progress: added ${progressAdded} items from index`);
    }

    console.log('=== RECONCILIATION COMPLETE ===');
    console.log(`Final state: Bulk=${bulkKeys.size}, Index=${Object.keys(indexEntries).length}, Progress=${progress.completed.length}`);

    return {
        bulkCount: bulkKeys.size,
        indexCount: Object.keys(indexEntries).length,
        indexCleaned,
        progressCleaned,
        progressAdded,
        finalCompleted: progress.completed.length,
        finalRemaining: bulkKeys.size - progress.completed.length
    };
}

/**
 * Full consistency check across all three data sources.
 * Use this diagnostic to verify data integrity.
 *
 * @param {string} [folderId] - Google Drive folder ID
 * @param {string} [indexFileId] - Google Drive index file ID
 * @returns {Promise<Object>} Consistency check results
 */
async function fullConsistencyCheck(folderId = null, indexFileId = INDIVIDUALNAME_DATABASE_INDEX_FILE_ID) {
    // Get folder ID from UI input if not provided
    if (!folderId) {
        folderId = document.getElementById('individualNameFolderId')?.value?.trim() || INDIVIDUALNAME_DATABASE_FOLDER_ID;
    }

    console.log('=== FULL CONSISTENCY CHECK ===');
    console.log(`Folder ID: ${folderId}`);
    console.log(`Index File ID: ${indexFileId}`);

    const results = {
        bulk: 0,
        index: 0,
        folder: 0,
        folderUnique: 0,
        localStorage: 0,
        inBulkNotIndex: [],
        inIndexNotBulk: [],
        inFolderNotIndex: [],
        inIndexNotFolder: [],
        inProgressNotBulk: [],
        consistent: false
    };

    // 1. Get bulk database keys
    if (window.individualNameDatabase && window.individualNameDatabase.entries) {
        results.bulk = window.individualNameDatabase.entries.size;
        console.log(`\n1. BULK FILE: ${results.bulk} entries`);
    } else {
        console.log('\n1. BULK FILE: Not loaded');
    }
    const bulkKeys = window.individualNameDatabase ?
        new Set(window.individualNameDatabase.entries.keys()) : new Set();

    // 2. Get index file
    let indexKeys = new Set();
    try {
        const indexResponse = await gapi.client.drive.files.get({
            fileId: indexFileId,
            alt: 'media'
        });
        const indexData = JSON.parse(indexResponse.body);
        indexKeys = new Set(Object.keys(indexData.entries || {}));
        results.index = indexKeys.size;
        console.log(`2. INDEX FILE: ${results.index} entries`);
    } catch (e) {
        console.log(`2. INDEX FILE: Error loading - ${e.message}`);
    }

    // 3. Get folder contents
    let folderNames = new Set();
    try {
        const allFiles = [];
        let pageToken = null;
        do {
            const response = await gapi.client.drive.files.list({
                q: `'${folderId}' in parents and trashed = false`,
                fields: 'nextPageToken, files(id, name)',
                pageSize: 1000,
                pageToken
            });
            allFiles.push(...response.result.files);
            pageToken = response.result.nextPageToken;
        } while (pageToken);

        folderNames = new Set(allFiles.map(f => f.name.replace('.json', '').replace(/_/g, ' ')));
        results.folder = allFiles.length;
        results.folderUnique = folderNames.size;
        console.log(`3. FOLDER: ${results.folder} files (${results.folderUnique} unique names)`);
    } catch (e) {
        console.log(`3. FOLDER: Error listing - ${e.message}`);
    }

    // 4. Get localStorage progress
    const progress = loadFileOutProgress();
    const progressKeys = new Set(progress.completed);
    results.localStorage = progress.completed.length;
    console.log(`4. LOCALSTORAGE: ${results.localStorage} completed`);

    // 5. Cross-reference comparisons
    // Note: Use inline normalization at each comparison point for keys that may contain
    // invalid Google Drive chars (/ \ < > : " | ? *). Folder names are already normalized.
    console.log('\n=== DISCREPANCIES ===');

    // In bulk but not in index (bulk keys may have invalid chars, try normalized match)
    results.inBulkNotIndex = [...bulkKeys].filter(k =>
        !indexKeys.has(k) && !indexKeys.has(normalizeForGoogleDrive(k))
    );
    console.log(`In BULK but not INDEX: ${results.inBulkNotIndex.length}`);
    if (results.inBulkNotIndex.length > 0 && results.inBulkNotIndex.length <= 10) {
        console.log('  ', results.inBulkNotIndex);
    }

    // In index but not in bulk (index keys may be normalized, try normalized match on bulk)
    results.inIndexNotBulk = [...indexKeys].filter(k =>
        !bulkKeys.has(k) && !bulkKeys.has(normalizeForGoogleDrive(k))
    );
    console.log(`In INDEX but not BULK: ${results.inIndexNotBulk.length}`);
    if (results.inIndexNotBulk.length > 0 && results.inIndexNotBulk.length <= 10) {
        console.log('  ', results.inIndexNotBulk);
    }

    // In folder but not in index (both should be normalized, try normalized match)
    results.inFolderNotIndex = [...folderNames].filter(k =>
        !indexKeys.has(k) && !indexKeys.has(normalizeForGoogleDrive(k))
    );
    console.log(`In FOLDER but not INDEX: ${results.inFolderNotIndex.length}`);
    if (results.inFolderNotIndex.length > 0 && results.inFolderNotIndex.length <= 10) {
        console.log('  ', results.inFolderNotIndex);
    }

    // In index but not in folder (index keys may differ, try normalized match)
    results.inIndexNotFolder = [...indexKeys].filter(k =>
        !folderNames.has(k) && !folderNames.has(normalizeForGoogleDrive(k))
    );
    console.log(`In INDEX but not FOLDER: ${results.inIndexNotFolder.length}`);
    if (results.inIndexNotFolder.length > 0 && results.inIndexNotFolder.length <= 10) {
        console.log('  ', results.inIndexNotFolder);
    }

    // In progress but not in bulk (progress keys may match either format)
    results.inProgressNotBulk = [...progressKeys].filter(k =>
        !bulkKeys.has(k) && !bulkKeys.has(normalizeForGoogleDrive(k))
    );
    console.log(`In PROGRESS but not BULK: ${results.inProgressNotBulk.length}`);
    if (results.inProgressNotBulk.length > 0 && results.inProgressNotBulk.length <= 10) {
        console.log('  ', results.inProgressNotBulk);
    }

    // Summary
    console.log('\n=== SUMMARY ===');
    results.consistent = results.inBulkNotIndex.length === 0 &&
        results.inIndexNotBulk.length === 0 &&
        results.inFolderNotIndex.length === 0 &&
        results.inIndexNotFolder.length === 0 &&
        results.inProgressNotBulk.length === 0;

    if (results.consistent) {
        console.log('✓ All sources are consistent!');
    } else {
        console.log('✗ Inconsistencies found - see above');
        console.log('\nTo fix, run: await reconcileToMatchBulk()');
    }

    return results;
}

/**
 * Validate and reconcile index with actual files in folder.
 * Scans the folder, compares with index, adds any missing entries.
 * Called automatically on resume before processing next batch.
 *
 * @param {string} [folderId] - Google Drive folder ID to scan
 * @param {string} [indexFileId] - Google Drive index file ID
 * @returns {Promise<Object>} Reconciliation results
 */
async function validateAndReconcileIndex(folderId = INDIVIDUALNAME_DATABASE_FOLDER_ID, indexFileId = INDIVIDUALNAME_DATABASE_INDEX_FILE_ID) {
    console.log('=== VALIDATING INDEX ===');
    console.log(`Folder ID: ${folderId}`);
    console.log(`Index File ID: ${indexFileId}`);

    // 1. Fetch all files from folder (paginated)
    const allFiles = [];
    let pageToken = null;
    do {
        const response = await gapi.client.drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            fields: 'nextPageToken, files(id, name, createdTime, modifiedTime)',
            pageSize: 1000,
            pageToken
        });
        allFiles.push(...response.result.files);
        pageToken = response.result.nextPageToken;
    } while (pageToken);

    console.log(`Files in folder: ${allFiles.length}`);

    // 2. Load existing index
    let indexEntries = {};
    try {
        const indexResponse = await gapi.client.drive.files.get({
            fileId: indexFileId,
            alt: 'media'
        });
        const existingIndex = JSON.parse(indexResponse.body);
        indexEntries = existingIndex.entries || {};
    } catch (e) {
        console.log('No existing index, starting fresh');
    }

    const originalIndexCount = Object.keys(indexEntries).length;
    console.log(`Entries in index: ${originalIndexCount}`);

    // 3. Build map of actual files (by normalized name, keep oldest if duplicates)
    const filesByName = new Map();
    const duplicates = [];

    for (const file of allFiles) {
        // Normalize: remove .json, replace underscores with spaces
        const name = file.name.replace('.json', '').replace(/_/g, ' ');
        if (!filesByName.has(name)) {
            filesByName.set(name, file);
        } else {
            // Keep the older file (original), track duplicate
            const existing = filesByName.get(name);
            const existingDate = new Date(existing.createdTime);
            const newDate = new Date(file.createdTime);
            if (newDate < existingDate) {
                duplicates.push({ name, duplicate: existing, kept: file });
                filesByName.set(name, file);
            } else {
                duplicates.push({ name, duplicate: file, kept: existing });
            }
        }
    }

    if (duplicates.length > 0) {
        console.log(`Found ${duplicates.length} duplicate files (same name)`);
    }

    // 4. Add missing entries to index
    let added = 0;
    for (const [name, file] of filesByName) {
        if (!indexEntries[name]) {
            indexEntries[name] = {
                fileId: file.id,
                created: file.createdTime,
                lastModified: file.modifiedTime
            };
            added++;
        }
    }

    console.log(`Added ${added} missing entries to index`);

    // 5. Update localStorage progress to include all indexed items
    // Use inline normalization since keys may differ by invalid Google Drive chars
    const progress = loadFileOutProgress();
    const indexKeys = new Set(Object.keys(indexEntries));
    const completedSet = new Set(progress.completed);

    // Add any items in index that aren't in completed list
    let progressUpdated = 0;
    for (const key of indexKeys) {
        if (!completedSet.has(key) && !completedSet.has(normalizeForGoogleDrive(key))) {
            progress.completed.push(key);
            progressUpdated++;
        }
    }

    if (progressUpdated > 0) {
        saveFileOutProgress(progress);
        console.log(`Updated progress: added ${progressUpdated} items from index`);
    }

    // 6. Save updated index if changes were made
    if (added > 0) {
        const db = window.individualNameDatabase;
        const objectCount = db ? db.entries.size : Object.keys(indexEntries).length;
        await saveIndexFile(indexEntries, objectCount, indexFileId, folderId);
        console.log('Saved updated index');
    }

    console.log('=== VALIDATION COMPLETE ===');

    return {
        filesInFolder: allFiles.length,
        uniqueNames: filesByName.size,
        duplicateFiles: duplicates.length,
        entriesInIndex: Object.keys(indexEntries).length,
        entriesAdded: added,
        progressUpdated: progressUpdated
    };
}

/**
 * Consistency check with automatic deduplication and index rebuild.
 *
 * Flow:
 * 1. Load bulk file and folder contents
 * 2. If duplicates in folder, delete older ones and re-fetch folder
 * 3. Compare folder to bulk:
 *    - If folder < bulk: STOP with "RERUN GOOGLE FILE CREATION"
 *    - If folder >= bulk: report any names in folder not in bulk
 * 4. If not stopped: check/rebuild index to match folder
 *
 * @param {string} [folderId] - Google Drive folder ID
 * @param {string} [indexFileId] - Google Drive index file ID
 * @returns {Promise<Object>} Consistency check results
 */
async function consistencyCheck(folderId = null, indexFileId = INDIVIDUALNAME_DATABASE_INDEX_FILE_ID) {
    // Get folder ID from UI input if not provided
    if (!folderId) {
        folderId = document.getElementById('individualNameFolderId')?.value?.trim() || INDIVIDUALNAME_DATABASE_FOLDER_ID;
    }

    console.log('=== CONSISTENCY CHECK ===');
    console.log(`Folder ID: ${folderId}`);
    console.log(`Index File ID: ${indexFileId}`);

    const results = {
        bulk: 0,
        index: 0,
        folder: 0,
        folderUnique: 0,
        inFolderNotBulk: [],
        duplicatesDeleted: 0,
        indexRebuilt: false,
        stopped: false,
        consistent: false
    };

    // === STEP 1: Load bulk file from Google Drive ===
    let bulkKeys = new Set();
    try {
        const BULK_FILE_ID = '1r2G6Spg064KNbBzzKqIk131qAK0NDM9l';
        const bulkResponse = await gapi.client.drive.files.get({
            fileId: BULK_FILE_ID,
            alt: 'media'
        });
        const bulkData = JSON.parse(bulkResponse.body);
        bulkKeys = new Set(Object.keys(bulkData.entries || {}));
        results.bulk = bulkKeys.size;
        console.log(`\n1. BULK FILE: ${results.bulk} entries`);
    } catch (e) {
        console.log(`\n1. BULK FILE: Error loading - ${e.message}`);
        return results;
    }

    // === STEP 2: Load folder contents and handle duplicates ===
    async function fetchFolderContents() {
        const folderFiles = [];
        let pageToken = null;
        do {
            const response = await gapi.client.drive.files.list({
                q: `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
                fields: 'nextPageToken, files(id, name, modifiedTime)',
                pageSize: 1000,
                pageToken
            });
            folderFiles.push(...response.result.files);
            pageToken = response.result.nextPageToken;
        } while (pageToken);

        // Group files by normalized name
        const filesByName = new Map();
        for (const file of folderFiles) {
            const normalizedName = file.name.replace('.json', '').replace(/_/g, ' ');
            if (!filesByName.has(normalizedName)) {
                filesByName.set(normalizedName, []);
            }
            filesByName.get(normalizedName).push({
                id: file.id,
                name: file.name,
                normalizedName: normalizedName,
                modifiedTime: file.modifiedTime
            });
        }

        return { folderFiles, filesByName };
    }

    let folderData = await fetchFolderContents();
    let { folderFiles, filesByName } = folderData;

    results.folder = folderFiles.length;
    results.folderUnique = filesByName.size;
    console.log(`2. FOLDER: ${results.folder} files (${results.folderUnique} unique names)`);

    // Check for duplicates
    const duplicateGroups = [...filesByName.entries()].filter(([name, files]) => files.length > 1);

    if (duplicateGroups.length > 0) {
        console.log(`\n=== DEDUPLICATING (${duplicateGroups.length} names with duplicates) ===`);

        let deletedCount = 0;
        for (const [name, files] of duplicateGroups) {
            // Sort by modifiedTime descending (newest first)
            files.sort((a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime));

            const keeper = files[0];
            const toDelete = files.slice(1);

            console.log(`  KEEP: ${name} | ${keeper.modifiedTime}`);

            for (const file of toDelete) {
                console.log(`  DELETE: ${name} | ${file.modifiedTime}`);
                try {
                    await gapi.client.drive.files.delete({ fileId: file.id });
                    deletedCount++;
                } catch (e) {
                    console.error(`    ERROR: ${e.message}`);
                }
            }
        }

        results.duplicatesDeleted = deletedCount;
        console.log(`\nDeleted ${deletedCount} duplicate files`);

        // Re-fetch folder contents after deduplication
        console.log('\n=== RE-FETCHING FOLDER AFTER DEDUPLICATION ===');
        folderData = await fetchFolderContents();
        folderFiles = folderData.folderFiles;
        filesByName = folderData.filesByName;

        results.folder = folderFiles.length;
        results.folderUnique = filesByName.size;
        console.log(`FOLDER (updated): ${results.folder} files (${results.folderUnique} unique names)`);
    }

    // === STEP 3: Compare folder to bulk ===
    // Use inline normalization at each comparison point (no pre-built normalized sets)
    console.log('\n=== COMPARING FOLDER TO BULK ===');
    const folderNames = new Set(filesByName.keys());

    // Report size comparison
    if (results.folderUnique < bulkKeys.size) {
        console.log(`⚠️ FOLDER (${results.folderUnique}) < BULK (${bulkKeys.size})`);
    } else if (results.folderUnique > bulkKeys.size) {
        console.log(`FOLDER (${results.folderUnique}) > BULK (${bulkKeys.size})`);
    } else {
        console.log(`FOLDER (${results.folderUnique}) == BULK (${bulkKeys.size}) ✓`);
    }

    // Find folder names not in bulk (normalize bulk keys inline for comparison)
    results.inFolderNotBulk = [...folderNames].filter(folderName => {
        // Check if any bulk key, when normalized, matches this folder name
        for (const bulkKey of bulkKeys) {
            if (bulkKey === folderName || normalizeForGoogleDrive(bulkKey) === folderName) {
                return false; // Found a match
            }
        }
        return true; // No match found
    });

    // Find bulk keys not in folder (normalize bulk key inline for comparison)
    results.inBulkNotFolder = [...bulkKeys].filter(bulkKey =>
        !folderNames.has(bulkKey) && !folderNames.has(normalizeForGoogleDrive(bulkKey))
    );

    console.log(`Names in FOLDER but not BULK: ${results.inFolderNotBulk.length}`);
    for (const name of results.inFolderNotBulk) {
        console.log(`  FOLDER only: "${name}"`);
    }

    console.log(`Names in BULK but not FOLDER: ${results.inBulkNotFolder.length}`);
    for (const bulkKey of results.inBulkNotFolder) {
        // Show both original and normalized if they differ
        const normalized = normalizeForGoogleDrive(bulkKey);
        if (normalized !== bulkKey) {
            console.log(`  BULK only: "${bulkKey}" (normalized: "${normalized}")`);
        } else {
            console.log(`  BULK only: "${bulkKey}"`);
        }
    }

    // STOP if folder has fewer files than bulk
    if (results.folderUnique < bulkKeys.size) {
        console.log('');
        console.log('*** RERUN GOOGLE FILE CREATION ***');
        console.log('');
        results.stopped = true;
        return results;
    }

    // === STEP 4: Check/rebuild index ===
    console.log('\n=== CHECKING INDEX ===');

    let indexSize = 0;
    let indexKeys = [];
    try {
        const indexResponse = await gapi.client.drive.files.get({
            fileId: indexFileId,
            alt: 'media'
        });
        const indexData = JSON.parse(indexResponse.body);
        indexKeys = Object.keys(indexData.entries || {});
        indexSize = indexKeys.length;
        results.index = indexSize;
        console.log(`INDEX FILE: ${indexSize} entries`);
    } catch (e) {
        console.log(`INDEX FILE: Error loading - ${e.message}`);
        indexSize = -1; // Force rebuild
    }

    if (indexSize !== results.folderUnique) {
        console.log(`\nIndex size (${indexSize}) != Folder size (${results.folderUnique})`);
        console.log('REBUILDING INDEX FROM FOLDER...');

        // Build new index from folder contents
        const newIndexEntries = {};
        for (const [normalizedName, files] of filesByName) {
            const file = files[0]; // Should only be one after dedup
            newIndexEntries[normalizedName] = {
                fileId: file.id,
                created: file.modifiedTime,
                lastModified: file.modifiedTime
            };
        }

        const newIndex = {
            __format: 'AliasedTermDatabaseIndex',
            __version: '1.0',
            __created: new Date().toISOString(),
            __lastModified: new Date().toISOString(),
            __objectType: 'IndividualName',
            __objectCount: Object.keys(newIndexEntries).length,
            __indexedEntries: Object.keys(newIndexEntries).length,
            entries: newIndexEntries
        };

        const indexJson = JSON.stringify(newIndex, null, 2);
        const response = await fetch(
            `https://www.googleapis.com/upload/drive/v3/files/${indexFileId}?uploadType=media`,
            {
                method: 'PATCH',
                headers: new Headers({
                    'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                    'Content-Type': 'application/json'
                }),
                body: indexJson
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to save index: HTTP ${response.status}`);
        }

        results.index = Object.keys(newIndexEntries).length;
        results.indexRebuilt = true;
        console.log(`INDEX REBUILT: ${results.index} entries`);
    } else {
        console.log('Index size matches folder ✓');
    }

    // === SUMMARY ===
    console.log('\n=== SUMMARY ===');
    results.consistent = results.folderUnique === results.bulk &&
                         results.index === results.folderUnique &&
                         results.inFolderNotBulk.length === 0;

    if (results.consistent) {
        console.log('✓ All sources are consistent!');
    } else {
        if (results.inFolderNotBulk.length > 0) {
            console.log(`Note: ${results.inFolderNotBulk.length} names in folder not in bulk`);
        }
        if (results.indexRebuilt) {
            console.log('Index was rebuilt to match folder');
        }
    }

    return results;
}

// =============================================================================
// BACKUP BULK FILE
// =============================================================================

const BULK_BACKUP_FILE_ID = '149_qzAUmeqRgg_p6T0WE3cooIopcQBHP';

/**
 * Backup the bulk database file to a separate backup file in Google Drive.
 * This is fast (single API call) and provides a reliable backup.
 *
 * @returns {Promise<Object>} Result with success status and message
 */
async function backupBulkFile() {
    console.log('\n=== BACKING UP BULK FILE ===');

    try {
        // Load bulk file content
        const bulkResponse = await gapi.client.drive.files.get({
            fileId: BULK_DATABASE_FILE_ID,
            alt: 'media'
        });
        const bulkContent = bulkResponse.body;

        // Write to backup file
        const backupResponse = await fetch(
            `https://www.googleapis.com/upload/drive/v3/files/${BULK_BACKUP_FILE_ID}?uploadType=media`,
            {
                method: 'PATCH',
                headers: new Headers({
                    'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                    'Content-Type': 'application/json'
                }),
                body: bulkContent
            }
        );

        if (backupResponse.ok) {
            console.log(`Bulk file backed up to ${BULK_BACKUP_FILE_ID}`);
            return { success: true, message: 'Bulk file backed up successfully' };
        } else {
            console.warn(`Backup failed: HTTP ${backupResponse.status}`);
            return { success: false, message: `Backup failed: HTTP ${backupResponse.status}` };
        }
    } catch (backupError) {
        console.error('Backup error:', backupError.message);
        return { success: false, message: `Backup error: ${backupError.message}` };
    }
}

// =============================================================================
// BUILD BULK FROM GOOGLE FILES (Incremental Change)
// =============================================================================

/**
 * Build bulk database file by reading all individual Google Drive files.
 * This is the REVERSE of fileOutIndividualNames() - it reads individual files
 * and consolidates them into the bulk file.
 *
 * During testing: stops on first file load failure.
 *
 * @param {Object} options - Options
 * @param {string} [options.indexFileId] - Google Drive index file ID
 * @param {boolean} [options.stopOnError=true] - Stop immediately on first error (for testing)
 * @returns {Promise<Object>} Result with stats
 */
async function buildBulkFromGoogleFiles(options = {}) {
    const config = {
        indexFileId: INDIVIDUALNAME_DATABASE_INDEX_FILE_ID,
        stopOnError: true,  // During testing, stop on first failure
        ...options
    };

    console.log('=== BUILD BULK FROM GOOGLE FILES ===');
    console.log(`Index File ID: ${config.indexFileId}`);
    console.log(`Stop on error: ${config.stopOnError}`);

    const results = {
        indexEntries: 0,
        filesLoaded: 0,
        filesFailed: 0,
        bulkEntriesCreated: 0,
        stopped: false,
        stopReason: null,
        success: false
    };

    // === STEP 1: Load the index file ===
    console.log('\n--- Step 1: Loading index file ---');
    let indexEntries = {};
    try {
        const indexResponse = await gapi.client.drive.files.get({
            fileId: config.indexFileId,
            alt: 'media'
        });
        const indexData = JSON.parse(indexResponse.body);
        indexEntries = indexData.entries || {};
        results.indexEntries = Object.keys(indexEntries).length;
        console.log(`Index loaded: ${results.indexEntries} entries`);
    } catch (e) {
        console.error('FAILED to load index file:', e.message);
        results.stopped = true;
        results.stopReason = `Index load failed: ${e.message}`;
        return results;
    }

    if (results.indexEntries === 0) {
        console.log('Index is empty - nothing to do');
        results.stopped = true;
        results.stopReason = 'Index is empty';
        return results;
    }

    // === STEP 2: Read each Google file and build bulk entries ===
    console.log('\n--- Step 2: Reading individual Google files ---');
    const bulkEntries = {};
    const indexKeys = Object.keys(indexEntries);

    for (let i = 0; i < indexKeys.length; i++) {
        const primaryKey = indexKeys[i];
        const indexEntry = indexEntries[primaryKey];
        const fileId = indexEntry.fileId;

        if (!fileId) {
            console.error(`Entry "${primaryKey}" has no fileId - STOPPING`);
            if (config.stopOnError) {
                results.stopped = true;
                results.stopReason = `Entry "${primaryKey}" has no fileId`;
                return results;
            }
            results.filesFailed++;
            continue;
        }

        // Load the individual file
        try {
            const fileResponse = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
            });

            // The file content is a serialized IndividualName object
            const fileContent = fileResponse.body;

            // Deserialize to verify it's valid, then store the serialized form
            const deserializedObject = deserializeWithTypes(fileContent);

            if (!deserializedObject) {
                throw new Error('Deserialization returned null/undefined');
            }

            // Build bulk entry (store serialized form, not object)
            bulkEntries[primaryKey] = {
                object: fileContent,  // Already serialized JSON string
                created: indexEntry.created || new Date().toISOString(),
                lastModified: indexEntry.lastModified || new Date().toISOString()
            };

            results.filesLoaded++;

            // Progress logging every 100 files
            if (results.filesLoaded % 100 === 0) {
                console.log(`Progress: ${results.filesLoaded}/${results.indexEntries} files loaded`);
            }

        } catch (e) {
            console.error(`FAILED to load file for "${primaryKey}" (fileId: ${fileId}): ${e.message}`);
            if (config.stopOnError) {
                results.stopped = true;
                results.stopReason = `File load failed for "${primaryKey}": ${e.message}`;
                return results;
            }
            results.filesFailed++;
        }
    }

    console.log(`\nFiles loaded: ${results.filesLoaded}/${results.indexEntries}`);
    if (results.filesFailed > 0) {
        console.log(`Files failed: ${results.filesFailed}`);
    }

    // === STEP 3: Build and save bulk file ===
    console.log('\n--- Step 3: Saving bulk file (DEV FILE) ---');

    const bulkData = {
        __format: 'IndividualNameDatabaseBulk',
        __version: '1.0',
        __created: new Date().toISOString(),
        __objectType: 'IndividualName',
        __count: Object.keys(bulkEntries).length,
        entries: bulkEntries
    };

    const jsonContent = JSON.stringify(bulkData, null, 2);
    console.log(`Bulk file size: ${(jsonContent.length / 1024).toFixed(1)} KB`);
    console.log(`Entries in bulk: ${bulkData.__count}`);

    // DEV: Writing to test file during development
    const DEV_OUTPUT_FILE_ID = '1K1q_nhOBHKiXD5UbKRkXZpkHKxgIdu1S';
    try {
        const response = await fetch(
            `https://www.googleapis.com/upload/drive/v3/files/${DEV_OUTPUT_FILE_ID}?uploadType=media`,
            {
                method: 'PATCH',
                headers: new Headers({
                    'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                    'Content-Type': 'application/json'
                }),
                body: jsonContent
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        results.bulkEntriesCreated = bulkData.__count;
        results.success = true;
        console.log('Bulk file saved successfully!');

    } catch (e) {
        console.error('FAILED to save bulk file:', e.message);
        results.stopped = true;
        results.stopReason = `Bulk save failed: ${e.message}`;
        return results;
    }

    // === SUMMARY ===
    console.log('\n=== BUILD BULK COMPLETE ===');
    console.log(`Index entries: ${results.indexEntries}`);
    console.log(`Files loaded: ${results.filesLoaded}`);
    console.log(`Files failed: ${results.filesFailed}`);
    console.log(`Bulk entries created: ${results.bulkEntriesCreated}`);

    return results;
}

// =============================================================================
// INDIVIDUAL NAME COMPARISON HELPER
// =============================================================================

/**
 * Collect all alias terms from an IndividualName object.
 * @param {Object} obj - IndividualName object (deserialized)
 * @returns {Set<string>} Set of all alias terms
 */
function getIndividualNameAliasTerms(obj) {
    const terms = new Set();
    if (obj.primaryAlias?.term) terms.add(obj.primaryAlias.term);
    if (obj.homonyms) obj.homonyms.forEach(a => terms.add(a.term));
    if (obj.synonyms) obj.synonyms.forEach(a => terms.add(a.term));
    if (obj.candidates) obj.candidates.forEach(a => terms.add(a.term));
    // Also check alternatives structure
    if (obj.alternatives?.homonyms) obj.alternatives.homonyms.forEach(a => terms.add(a.term));
    if (obj.alternatives?.synonyms) obj.alternatives.synonyms.forEach(a => terms.add(a.term));
    if (obj.alternatives?.candidates) obj.alternatives.candidates.forEach(a => terms.add(a.term));
    return terms;
}

/**
 * Compare two IndividualName objects and return differences.
 * Used by both compareBulkFiles() and selection comparison.
 *
 * @param {Object} obj1 - First IndividualName object (deserialized)
 * @param {Object} obj2 - Second IndividualName object (deserialized)
 * @param {string} [label1='obj1'] - Label for first object in results
 * @param {string} [label2='obj2'] - Label for second object in results
 * @returns {Object} Comparison result with:
 *   - identical: boolean
 *   - primaryMismatch: boolean
 *   - primary1, primary2: primary alias terms
 *   - inFirstNotSecond: array of terms in obj1 but not obj2
 *   - inSecondNotFirst: array of terms in obj2 but not obj1
 *   - aliasCount1, aliasCount2: total alias counts
 */
function compareIndividualNameObjects(obj1, obj2, label1 = 'obj1', label2 = 'obj2') {
    const primary1 = obj1.primaryAlias?.term || '';
    const primary2 = obj2.primaryAlias?.term || '';

    const terms1 = getIndividualNameAliasTerms(obj1);
    const terms2 = getIndividualNameAliasTerms(obj2);

    const inFirstNotSecond = [...terms1].filter(t => !terms2.has(t));
    const inSecondNotFirst = [...terms2].filter(t => !terms1.has(t));

    const primaryMismatch = primary1 !== primary2;
    const identical = !primaryMismatch && inFirstNotSecond.length === 0 && inSecondNotFirst.length === 0;

    return {
        identical,
        primaryMismatch,
        primary1,
        primary2,
        inFirstNotSecond,
        inSecondNotFirst,
        aliasCount1: terms1.size,
        aliasCount2: terms2.size,
        label1,
        label2
    };
}

// =============================================================================
// BULK FILE COMPARISON
// =============================================================================

// DEV: Test file ID for comparison
const DEV_BULK_OUTPUT_FILE_ID = '1K1q_nhOBHKiXD5UbKRkXZpkHKxgIdu1S';

/**
 * Compare the DEV bulk file (built from Google files) with the original bulk file.
 * Reports any differences in keys, entry counts, and object content.
 *
 * @returns {Promise<Object>} Comparison results
 */
async function compareBulkFiles() {
    console.log('=== COMPARING BULK FILES ===');
    console.log(`Original: ${BULK_DATABASE_FILE_ID}`);
    console.log(`DEV (from Google files): ${DEV_BULK_OUTPUT_FILE_ID}`);

    const results = {
        originalCount: 0,
        devCount: 0,
        inOriginalNotDev: [],
        inDevNotOriginal: [],
        contentMismatches: [],
        identical: false
    };

    // Load original bulk file
    console.log('\n--- Loading original bulk file ---');
    let originalEntries = {};
    try {
        const response = await gapi.client.drive.files.get({
            fileId: BULK_DATABASE_FILE_ID,
            alt: 'media'
        });
        const data = JSON.parse(response.body);
        originalEntries = data.entries || {};
        results.originalCount = Object.keys(originalEntries).length;
        console.log(`Original: ${results.originalCount} entries`);
    } catch (e) {
        console.error('Failed to load original bulk file:', e.message);
        return results;
    }

    // Load DEV bulk file
    console.log('\n--- Loading DEV bulk file ---');
    let devEntries = {};
    try {
        const response = await gapi.client.drive.files.get({
            fileId: DEV_BULK_OUTPUT_FILE_ID,
            alt: 'media'
        });
        const data = JSON.parse(response.body);
        devEntries = data.entries || {};
        results.devCount = Object.keys(devEntries).length;
        console.log(`DEV: ${results.devCount} entries`);
    } catch (e) {
        console.error('Failed to load DEV bulk file:', e.message);
        return results;
    }

    // Compare keys (using normalized comparison since DEV keys come from Google Drive index)
    console.log('\n--- Comparing keys (with normalization) ---');
    const originalKeys = Object.keys(originalEntries);
    const devKeys = new Set(Object.keys(devEntries));

    // Build a map from normalized original key -> original key
    const normalizedToOriginal = new Map();
    for (const key of originalKeys) {
        normalizedToOriginal.set(normalizeForGoogleDrive(key), key);
    }

    // Keys in original but not in DEV (check both exact and normalized)
    const matchedOriginalKeys = new Map(); // original key -> dev key it matched
    for (const origKey of originalKeys) {
        const normalizedOrigKey = normalizeForGoogleDrive(origKey);
        if (devKeys.has(origKey)) {
            matchedOriginalKeys.set(origKey, origKey);
        } else if (devKeys.has(normalizedOrigKey)) {
            matchedOriginalKeys.set(origKey, normalizedOrigKey);
        } else {
            results.inOriginalNotDev.push(origKey);
        }
    }

    // Keys in DEV but not in original (check both exact and normalized)
    const matchedDevKeys = new Set(matchedOriginalKeys.values());
    for (const devKey of devKeys) {
        if (!matchedDevKeys.has(devKey)) {
            results.inDevNotOriginal.push(devKey);
        }
    }

    console.log(`In ORIGINAL but not DEV: ${results.inOriginalNotDev.length}`);
    if (results.inOriginalNotDev.length > 0 && results.inOriginalNotDev.length <= 20) {
        results.inOriginalNotDev.forEach(k => console.log(`  - "${k}"`));
    }

    console.log(`In DEV but not ORIGINAL: ${results.inDevNotOriginal.length}`);
    if (results.inDevNotOriginal.length > 0 && results.inDevNotOriginal.length <= 20) {
        results.inDevNotOriginal.forEach(k => console.log(`  - "${k}"`));
    }

    // Compare content of matched keys - deserialize and compare aliases
    console.log('\n--- Comparing content (aliases) ---');
    console.log(`Matched keys to compare: ${matchedOriginalKeys.size}`);

    results.aliasMismatches = [];

    let compared = 0;
    for (const [origKey, devKey] of matchedOriginalKeys) {
        const origEntry = originalEntries[origKey];
        const devEntry = devEntries[devKey];

        try {
            // Deserialize both objects
            const origObjectStr = typeof origEntry.object === 'string' ? origEntry.object : JSON.stringify(origEntry.object);
            const devObjectStr = typeof devEntry.object === 'string' ? devEntry.object : JSON.stringify(devEntry.object);

            const origObj = deserializeWithTypes(origObjectStr);
            const devObj = deserializeWithTypes(devObjectStr);

            // Use helper function to compare
            const comparison = compareIndividualNameObjects(origObj, devObj, 'Original', 'DEV');

            if (!comparison.identical) {
                results.aliasMismatches.push({
                    key: origKey,
                    devKey: devKey,
                    origPrimary: comparison.primary1,
                    devPrimary: comparison.primary2,
                    origAliasCount: comparison.aliasCount1,
                    devAliasCount: comparison.aliasCount2,
                    inOrigNotDev: comparison.inFirstNotSecond,
                    inDevNotOrig: comparison.inSecondNotFirst
                });
            }

        } catch (e) {
            // If deserialization fails, fall back to string comparison
            const origObjectStr = typeof origEntry.object === 'string' ? origEntry.object : JSON.stringify(origEntry.object);
            const devObjectStr = typeof devEntry.object === 'string' ? devEntry.object : JSON.stringify(devEntry.object);

            if (origObjectStr !== devObjectStr) {
                results.contentMismatches.push({
                    key: origKey,
                    devKey: devKey,
                    origLength: origObjectStr.length,
                    devLength: devObjectStr.length,
                    error: e.message
                });
            }
        }

        compared++;
        if (compared % 500 === 0) {
            console.log(`Compared ${compared}/${matchedOriginalKeys.size}...`);
        }
    }

    console.log(`Alias mismatches: ${results.aliasMismatches.length}`);
    if (results.aliasMismatches.length > 0 && results.aliasMismatches.length <= 10) {
        results.aliasMismatches.forEach(m => {
            console.log(`  - "${m.key}": orig=${m.origAliasCount} aliases, dev=${m.devAliasCount} aliases`);
            if (m.origPrimary !== m.devPrimary) {
                console.log(`      Primary differs: "${m.origPrimary}" vs "${m.devPrimary}"`);
            }
            if (m.inOrigNotDev.length > 0) {
                console.log(`      In orig not dev: ${m.inOrigNotDev.join(', ')}`);
            }
            if (m.inDevNotOrig.length > 0) {
                console.log(`      In dev not orig: ${m.inDevNotOrig.join(', ')}`);
            }
        });
    }

    console.log(`Content mismatches (deserialization failed): ${results.contentMismatches.length}`);
    if (results.contentMismatches.length > 0 && results.contentMismatches.length <= 10) {
        results.contentMismatches.forEach(m => {
            console.log(`  - "${m.key}" (orig: ${m.origLength} chars, dev: ${m.devLength} chars) - ${m.error}`);
        });
    }

    // Summary
    console.log('\n=== COMPARISON SUMMARY ===');
    results.identical = results.inOriginalNotDev.length === 0 &&
                        results.inDevNotOriginal.length === 0 &&
                        results.aliasMismatches.length === 0 &&
                        results.contentMismatches.length === 0;

    console.log(`Keys matched: ${matchedOriginalKeys.size}/${results.originalCount}`);

    if (results.identical) {
        console.log('✓ Files are IDENTICAL! All keys matched and all aliases match.');
    } else {
        console.log('✗ Files have DIFFERENCES:');
        if (results.inOriginalNotDev.length > 0) {
            console.log(`  - ${results.inOriginalNotDev.length} keys in original but not DEV`);
        }
        if (results.inDevNotOriginal.length > 0) {
            console.log(`  - ${results.inDevNotOriginal.length} keys in DEV but not original`);
        }
        if (results.aliasMismatches.length > 0) {
            console.log(`  - ${results.aliasMismatches.length} alias mismatches`);
        }
        if (results.contentMismatches.length > 0) {
            console.log(`  - ${results.contentMismatches.length} content mismatches (deserialization failed)`);
        }
    }

    return results;
}

// =============================================================================
// REBUILD INDEX MAP - Fix null fileIds by looking up from folder
// =============================================================================

/**
 * Rebuild index map by populating fileIds from the Google Drive folder.
 * Use when index entries have null fileIds but individual files exist in folder.
 *
 * @param {string} [folderId] - Google Drive folder ID (from UI input if not provided)
 * @param {string} [indexFileId] - Google Drive index file ID
 * @returns {Promise<Object>} Results with counts of fixed/not found entries
 */
async function rebuildIndexMap(folderId = null, indexFileId = INDIVIDUALNAME_DATABASE_INDEX_FILE_ID) {
    // Get folder ID from UI input if not provided
    if (!folderId) {
        folderId = document.getElementById('individualNameFolderId')?.value?.trim();
    }

    if (!folderId) {
        throw new Error('Folder ID is required - enter it in the UI or pass as parameter');
    }

    console.log('=== REBUILDING INDEX MAP ===');
    console.log(`Folder ID: ${folderId}`);
    console.log(`Index File ID: ${indexFileId}`);

    // 1. Get all FILES from folder (excluding subdirectories)
    const allFiles = [];
    let pageToken = null;
    do {
        const response = await gapi.client.drive.files.list({
            q: `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
            fields: 'nextPageToken, files(id, name, createdTime, modifiedTime)',
            pageSize: 1000,
            pageToken
        });
        allFiles.push(...response.result.files);
        pageToken = response.result.nextPageToken;
    } while (pageToken);

    console.log(`Files in folder: ${allFiles.length}`);

    // 2. Build map: normalized name -> fileId
    const fileIdMap = new Map();
    for (const file of allFiles) {
        const name = file.name.replace('.json', '').replace(/_/g, ' ');
        fileIdMap.set(name, file.id);
    }

    // 3. Load current index
    const indexResponse = await gapi.client.drive.files.get({
        fileId: indexFileId,
        alt: 'media'
    });
    const indexData = JSON.parse(indexResponse.body);

    if (!indexData.entries) {
        throw new Error('Index file has no entries property');
    }

    // 4. Fix null fileIds
    let fixed = 0;
    let notFound = 0;
    let alreadyValid = 0;
    const notFoundKeys = [];

    for (const [key, entry] of Object.entries(indexData.entries)) {
        if (entry.fileId && entry.fileId !== null) {
            alreadyValid++;
        } else {
            const fileId = fileIdMap.get(key);
            if (fileId) {
                entry.fileId = fileId;
                fixed++;
            } else {
                notFound++;
                if (notFoundKeys.length < 10) notFoundKeys.push(key);
            }
        }
    }

    console.log(`Already valid: ${alreadyValid}`);
    console.log(`Fixed: ${fixed}`);
    console.log(`Not found in folder: ${notFound}`);
    if (notFoundKeys.length > 0) {
        console.log('Sample not found:', notFoundKeys);
    }

    // 5. Save updated index if changes were made
    if (fixed > 0) {
        indexData.__lastModified = new Date().toISOString();
        const content = JSON.stringify(indexData, null, 2);
        await gapi.client.request({
            path: `https://www.googleapis.com/upload/drive/v3/files/${indexFileId}`,
            method: 'PATCH',
            params: { uploadType: 'media' },
            body: content
        });
        console.log('Index saved to Google Drive!');
    } else {
        console.log('No changes needed.');
    }

    // 6. Also update in-memory loadedIndex if it exists
    if (window.individualNameBrowser?.loadedIndex) {
        for (const [key, entry] of Object.entries(indexData.entries)) {
            if (window.individualNameBrowser.loadedIndex[key]) {
                window.individualNameBrowser.loadedIndex[key].fileId = entry.fileId;
            }
        }
        console.log('Updated in-memory loadedIndex');
    }

    const results = {
        filesInFolder: allFiles.length,
        alreadyValid,
        fixed,
        notFound,
        notFoundKeys
    };

    console.log('=== REBUILD COMPLETE ===');
    return results;
}

// =============================================================================
// SYNC DEV TO ORIGINAL - Transfer DEV bulk content to Original bulk file
// =============================================================================

/**
 * Sync DEV bulk file to Original bulk file.
 *
 * CRITICAL: Restores original keys with special characters that were lost
 * during Google Drive file creation (since filenames can't contain / \ < > : " | ? *).
 *
 * Algorithm:
 * 1. Load DEV bulk file
 * 2. Load INDEX file and verify keys match DEV (if mismatch, stop with error)
 * 3. Add fileId from INDEX to each DEV entry
 * 4. Load Original bulk → build map: normalizedKey → originalKeyWithSpecialChars
 * 5. For each DEV entry:
 *    - If original had a key that normalizes to this DEV key: use original key
 *    - Otherwise (new entry): use DEV key as-is
 * 6. Copy complete object instance from DEV (including fileId)
 * 7. Save to Original bulk file
 *
 * @returns {Promise<Object>} Results with stats
 */
async function syncDevToOriginal() {
    console.log('=== SYNC DEV TO ORIGINAL ===');
    console.log(`DEV file: ${DEV_BULK_DATABASE_FILE_ID}`);
    console.log(`Index file: ${INDIVIDUALNAME_DATABASE_INDEX_FILE_ID}`);
    console.log(`Original file: ${BULK_DATABASE_FILE_ID}`);

    const results = {
        devCount: 0,
        indexCount: 0,
        originalCount: 0,
        keysRestored: 0,        // Keys where special chars were restored
        newKeys: 0,             // New entries (no original match)
        totalSynced: 0,
        success: false
    };

    // === STEP 1: Load DEV bulk file ===
    console.log('\n--- Step 1: Loading DEV bulk file ---');
    let devEntries = {};

    try {
        const response = await gapi.client.drive.files.get({
            fileId: DEV_BULK_DATABASE_FILE_ID,
            alt: 'media'
        });
        const data = JSON.parse(response.body);
        devEntries = data.entries || {};
        results.devCount = Object.keys(devEntries).length;
        console.log(`DEV: ${results.devCount} entries`);
    } catch (e) {
        console.error('Failed to load DEV bulk file:', e.message);
        results.error = `DEV load failed: ${e.message}`;
        return results;
    }

    // === STEP 2: Load INDEX file and verify keys match ===
    console.log('\n--- Step 2: Loading INDEX file and verifying keys ---');
    let indexEntries = {};

    try {
        const response = await gapi.client.drive.files.get({
            fileId: INDIVIDUALNAME_DATABASE_INDEX_FILE_ID,
            alt: 'media'
        });
        const indexData = JSON.parse(response.body);
        indexEntries = indexData.entries || {};
        results.indexCount = Object.keys(indexEntries).length;
        console.log(`INDEX: ${results.indexCount} entries`);
    } catch (e) {
        console.error('Failed to load INDEX file:', e.message);
        results.error = `INDEX load failed: ${e.message}`;
        return results;
    }

    // Compare key sets between DEV and INDEX, and check for missing fileIds
    const devKeys = new Set(Object.keys(devEntries));
    const indexKeys = new Set(Object.keys(indexEntries));

    const inDevNotIndex = [...devKeys].filter(k => !indexKeys.has(k));
    const inIndexNotDev = [...indexKeys].filter(k => !devKeys.has(k));

    // Check for missing fileIds in INDEX entries
    const missingFileIds = [];
    for (const [key, entry] of Object.entries(indexEntries)) {
        if (!entry.fileId) {
            missingFileIds.push(key);
        }
    }

    // Report all errors and return early if any issues found
    if (inDevNotIndex.length > 0 || inIndexNotDev.length > 0 || missingFileIds.length > 0) {
        console.error('\n*** Dev file and index map not synced. ***');

        if (inDevNotIndex.length > 0) {
            console.error(`\nKeys in DEV but not in INDEX (${inDevNotIndex.length}):`);
            inDevNotIndex.slice(0, 10).forEach(k => console.error(`  - "${k}"`));
            if (inDevNotIndex.length > 10) console.error(`  ... and ${inDevNotIndex.length - 10} more`);
        }
        if (inIndexNotDev.length > 0) {
            console.error(`\nKeys in INDEX but not in DEV (${inIndexNotDev.length}):`);
            inIndexNotDev.slice(0, 10).forEach(k => console.error(`  - "${k}"`));
            if (inIndexNotDev.length > 10) console.error(`  ... and ${inIndexNotDev.length - 10} more`);
        }
        if (missingFileIds.length > 0) {
            console.error(`\nINDEX entries missing fileId (${missingFileIds.length}):`);
            missingFileIds.slice(0, 10).forEach(k => console.error(`  - "${k}"`));
            if (missingFileIds.length > 10) console.error(`  ... and ${missingFileIds.length - 10} more`);
        }

        results.error = 'Dev file and index map not synced.';
        results.inDevNotIndex = inDevNotIndex;
        results.inIndexNotDev = inIndexNotDev;
        results.missingFileIds = missingFileIds;
        return results;
    }

    console.log(`Keys match: ${devKeys.size} entries in both DEV and INDEX`);
    console.log(`All INDEX entries have fileIds`);

    // === STEP 3: Add fileId from INDEX to each DEV entry ===
    console.log('\n--- Step 3: Adding fileIds from INDEX to DEV entries ---');

    for (const [key, devEntry] of Object.entries(devEntries)) {
        devEntry.fileId = indexEntries[key].fileId;
    }

    console.log(`FileIds added: ${Object.keys(devEntries).length}`)

    // === STEP 4: Load Original bulk file and build normalized key map ===
    console.log('\n--- Step 4: Loading Original bulk file ---');
    let originalEntries = {};
    const normalizedToOriginalKey = new Map();  // normalized key → original key with special chars

    try {
        const response = await gapi.client.drive.files.get({
            fileId: BULK_DATABASE_FILE_ID,
            alt: 'media'
        });
        const data = JSON.parse(response.body);
        originalEntries = data.entries || {};
        results.originalCount = Object.keys(originalEntries).length;
        console.log(`Original: ${results.originalCount} entries`);

        // Build map: normalizedKey → originalKey
        for (const originalKey of Object.keys(originalEntries)) {
            const normalizedKey = normalizeForGoogleDrive(originalKey);
            normalizedToOriginalKey.set(normalizedKey, originalKey);

            // Log keys that have special characters (will be restored)
            if (normalizedKey !== originalKey) {
                console.log(`  Special chars: "${originalKey}" → normalized: "${normalizedKey}"`);
            }
        }
        console.log(`Keys with special characters: ${[...normalizedToOriginalKey.entries()].filter(([n, o]) => n !== o).length}`);

    } catch (e) {
        console.error('Failed to load Original bulk file:', e.message);
        results.error = `Original load failed: ${e.message}`;
        return results;
    }

    // === STEP 5: Build new entries with restored keys ===
    console.log('\n--- Step 5: Building new bulk with restored keys and fileIds ---');
    const newEntries = {};

    for (const [devKey, devEntry] of Object.entries(devEntries)) {
        // Check if this DEV key matches an original key (after normalization)
        const normalizedDevKey = normalizeForGoogleDrive(devKey);

        let finalKey;
        if (normalizedToOriginalKey.has(normalizedDevKey)) {
            // Restore the original key (with special characters)
            finalKey = normalizedToOriginalKey.get(normalizedDevKey);
            if (finalKey !== devKey) {
                results.keysRestored++;
                console.log(`  Restored: "${devKey}" → "${finalKey}"`);
            }
        } else if (normalizedToOriginalKey.has(devKey)) {
            // Direct match (DEV key IS a normalized version)
            finalKey = normalizedToOriginalKey.get(devKey);
            if (finalKey !== devKey) {
                results.keysRestored++;
                console.log(`  Restored: "${devKey}" → "${finalKey}"`);
            }
        } else {
            // New entry - no original match, use DEV key as-is
            finalKey = devKey;
            results.newKeys++;
        }

        // Copy complete object instance from DEV, including fileId
        newEntries[finalKey] = {
            object: devEntry.object,  // Complete serialized object
            fileId: devEntry.fileId,  // FileId from INDEX
            created: devEntry.created || new Date().toISOString(),
            lastModified: devEntry.lastModified || new Date().toISOString()
        };
    }

    results.totalSynced = Object.keys(newEntries).length;
    console.log(`\nKeys restored: ${results.keysRestored}`);
    console.log(`New keys (no original match): ${results.newKeys}`);
    console.log(`Total entries: ${results.totalSynced}`);

    // === STEP 6: Save to Original bulk file ===
    console.log('\n--- Step 6: Saving to Original bulk file ---');

    const bulkData = {
        __format: 'IndividualNameDatabaseBulk',
        __version: '1.1',  // Bumped version - now includes fileId
        __created: new Date().toISOString(),
        __objectType: 'IndividualName',
        __count: results.totalSynced,
        entries: newEntries
    };

    const jsonContent = JSON.stringify(bulkData, null, 2);
    console.log(`Bulk file size: ${(jsonContent.length / 1024).toFixed(1)} KB`);

    try {
        const response = await fetch(
            `https://www.googleapis.com/upload/drive/v3/files/${BULK_DATABASE_FILE_ID}?uploadType=media`,
            {
                method: 'PATCH',
                headers: new Headers({
                    'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                    'Content-Type': 'application/json'
                }),
                body: jsonContent
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        results.success = true;
        console.log('Original bulk file updated successfully!');

    } catch (e) {
        console.error('Failed to save Original bulk file:', e.message);
        results.error = `Save failed: ${e.message}`;
        return results;
    }

    // === SUMMARY ===
    console.log('\n=== SYNC COMPLETE ===');
    console.log(`DEV entries: ${results.devCount}`);
    console.log(`INDEX entries: ${results.indexCount}`);
    console.log(`Original entries before: ${results.originalCount}`);
    console.log(`FileIds added from INDEX: ${results.devCount}`);
    console.log(`Keys with special chars restored: ${results.keysRestored}`);
    console.log(`New entries (no original counterpart): ${results.newKeys}`);
    console.log(`Total synced to Original: ${results.totalSynced}`);

    return results;
}

// =============================================================================
// COMPARE BACKUP TO ORIGINAL - Deep recursive comparison
// =============================================================================

/**
 * Recursively compare two values and return differences.
 * @param {*} val1 - First value
 * @param {*} val2 - Second value
 * @param {string} path - Current property path for reporting
 * @returns {Array} Array of difference objects {path, type, val1, val2}
 */
function deepCompare(val1, val2, path = '') {
    const differences = [];

    // Handle null/undefined
    if (val1 === null && val2 === null) return differences;
    if (val1 === undefined && val2 === undefined) return differences;
    if (val1 === null || val1 === undefined || val2 === null || val2 === undefined) {
        differences.push({ path, type: 'value', val1, val2 });
        return differences;
    }

    // Handle different types
    const type1 = typeof val1;
    const type2 = typeof val2;
    if (type1 !== type2) {
        differences.push({ path, type: 'type', val1: type1, val2: type2 });
        return differences;
    }

    // Handle arrays
    if (Array.isArray(val1) && Array.isArray(val2)) {
        if (val1.length !== val2.length) {
            differences.push({ path, type: 'arrayLength', val1: val1.length, val2: val2.length });
        }
        const maxLen = Math.max(val1.length, val2.length);
        for (let i = 0; i < maxLen; i++) {
            const itemPath = `${path}[${i}]`;
            if (i >= val1.length) {
                differences.push({ path: itemPath, type: 'missing_in_backup', val2: val2[i] });
            } else if (i >= val2.length) {
                differences.push({ path: itemPath, type: 'missing_in_original', val1: val1[i] });
            } else {
                differences.push(...deepCompare(val1[i], val2[i], itemPath));
            }
        }
        return differences;
    }

    // Handle objects
    if (type1 === 'object') {
        const keys1 = Object.keys(val1);
        const keys2 = Object.keys(val2);
        const allKeys = new Set([...keys1, ...keys2]);

        for (const key of allKeys) {
            const propPath = path ? `${path}.${key}` : key;
            if (!(key in val1)) {
                differences.push({ path: propPath, type: 'missing_in_backup', val2: val2[key] });
            } else if (!(key in val2)) {
                differences.push({ path: propPath, type: 'missing_in_original', val1: val1[key] });
            } else {
                differences.push(...deepCompare(val1[key], val2[key], propPath));
            }
        }
        return differences;
    }

    // Handle primitives
    if (val1 !== val2) {
        differences.push({ path, type: 'value', val1, val2 });
    }

    return differences;
}

/**
 * Format a value for console output (truncate if too long).
 * @param {*} val - Value to format
 * @param {number} maxLen - Maximum string length
 * @returns {string} Formatted string
 */
function formatValue(val, maxLen = 50) {
    if (val === null) return 'null';
    if (val === undefined) return 'undefined';
    if (typeof val === 'object') {
        const str = JSON.stringify(val);
        return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
    }
    const str = String(val);
    return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
}

/**
 * Compare the backup bulk file with the original bulk file.
 * Reports:
 * 1. Names that exist in backup but not original
 * 2. Names that exist in original but not backup
 * 3. For names in both: recursive property differences
 *
 * @returns {Promise<Object>} Comparison results
 */
async function compareBackupToOriginal() {
    console.log('=== COMPARE BACKUP TO ORIGINAL ===');
    console.log(`Backup file: ${BULK_BACKUP_FILE_ID}`);
    console.log(`Original file: ${BULK_DATABASE_FILE_ID}`);

    const results = {
        backupCount: 0,
        originalCount: 0,
        inBackupNotOriginal: [],
        inOriginalNotBackup: [],
        propertyDifferences: [],
        identical: false
    };

    // === STEP 1: Load backup bulk file ===
    console.log('\n--- Loading Backup bulk file ---');
    let backupEntries = {};
    try {
        const response = await gapi.client.drive.files.get({
            fileId: BULK_BACKUP_FILE_ID,
            alt: 'media'
        });
        const data = JSON.parse(response.body);
        backupEntries = data.entries || {};
        results.backupCount = Object.keys(backupEntries).length;
        console.log(`Backup: ${results.backupCount} entries`);
    } catch (e) {
        console.error('Failed to load Backup bulk file:', e.message);
        results.error = `Backup load failed: ${e.message}`;
        return results;
    }

    // === STEP 2: Load original bulk file ===
    console.log('\n--- Loading Original bulk file ---');
    let originalEntries = {};
    try {
        const response = await gapi.client.drive.files.get({
            fileId: BULK_DATABASE_FILE_ID,
            alt: 'media'
        });
        const data = JSON.parse(response.body);
        originalEntries = data.entries || {};
        results.originalCount = Object.keys(originalEntries).length;
        console.log(`Original: ${results.originalCount} entries`);
    } catch (e) {
        console.error('Failed to load Original bulk file:', e.message);
        results.error = `Original load failed: ${e.message}`;
        return results;
    }

    // === STEP 3: Find names only in backup ===
    console.log('\n--- Comparing entries ---');
    const backupKeys = new Set(Object.keys(backupEntries));
    const originalKeys = new Set(Object.keys(originalEntries));

    for (const key of backupKeys) {
        if (!originalKeys.has(key)) {
            results.inBackupNotOriginal.push(key);
        }
    }

    // === STEP 4: Find names only in original ===
    for (const key of originalKeys) {
        if (!backupKeys.has(key)) {
            results.inOriginalNotBackup.push(key);
        }
    }

    // === STEP 5: Deep compare entries that exist in both ===
    const commonKeys = [...backupKeys].filter(k => originalKeys.has(k));
    console.log(`Common entries to compare: ${commonKeys.length}`);

    let comparedCount = 0;
    for (const key of commonKeys) {
        const backupEntry = backupEntries[key];
        const originalEntry = originalEntries[key];

        // Deserialize objects for comparison
        let backupObj, originalObj;
        try {
            const backupObjStr = typeof backupEntry.object === 'string'
                ? backupEntry.object
                : JSON.stringify(backupEntry.object);
            const originalObjStr = typeof originalEntry.object === 'string'
                ? originalEntry.object
                : JSON.stringify(originalEntry.object);

            backupObj = deserializeWithTypes(backupObjStr);
            originalObj = deserializeWithTypes(originalObjStr);
        } catch (e) {
            // Fallback to raw comparison if deserialization fails
            backupObj = backupEntry.object;
            originalObj = originalEntry.object;
        }

        const diffs = deepCompare(backupObj, originalObj, '');

        if (diffs.length > 0) {
            results.propertyDifferences.push({
                name: key,
                differences: diffs
            });
        }

        comparedCount++;
        if (comparedCount % 500 === 0) {
            console.log(`Compared ${comparedCount}/${commonKeys.length}...`);
        }
    }

    // === STEP 6: Report results ===
    console.log('\n========================================');
    console.log('           COMPARISON RESULTS           ');
    console.log('========================================');

    console.log(`\nBackup entries: ${results.backupCount}`);
    console.log(`Original entries: ${results.originalCount}`);

    // Names only in backup
    if (results.inBackupNotOriginal.length > 0) {
        console.log(`\n--- IN BACKUP BUT NOT ORIGINAL (${results.inBackupNotOriginal.length}) ---`);
        for (const name of results.inBackupNotOriginal) {
            console.log(`  + BACKUP ONLY: "${name}"`);
        }
    } else {
        console.log('\n--- IN BACKUP BUT NOT ORIGINAL: None ---');
    }

    // Names only in original
    if (results.inOriginalNotBackup.length > 0) {
        console.log(`\n--- IN ORIGINAL BUT NOT BACKUP (${results.inOriginalNotBackup.length}) ---`);
        for (const name of results.inOriginalNotBackup) {
            console.log(`  + ORIGINAL ONLY: "${name}"`);
        }
    } else {
        console.log('\n--- IN ORIGINAL BUT NOT BACKUP: None ---');
    }

    // Property differences
    if (results.propertyDifferences.length > 0) {
        console.log(`\n--- PROPERTY DIFFERENCES (${results.propertyDifferences.length} entries) ---`);
        for (const entry of results.propertyDifferences) {
            console.log(`\n  "${entry.name}":`);
            for (const diff of entry.differences) {
                switch (diff.type) {
                    case 'value':
                        console.log(`    ${diff.path || '(root)'}: "${formatValue(diff.val1)}" → "${formatValue(diff.val2)}"`);
                        break;
                    case 'type':
                        console.log(`    ${diff.path}: type changed: ${diff.val1} → ${diff.val2}`);
                        break;
                    case 'arrayLength':
                        console.log(`    ${diff.path}: array length: ${diff.val1} → ${diff.val2}`);
                        break;
                    case 'missing_in_backup':
                        console.log(`    ${diff.path}: ADDED in original: ${formatValue(diff.val2)}`);
                        break;
                    case 'missing_in_original':
                        console.log(`    ${diff.path}: REMOVED from original: ${formatValue(diff.val1)}`);
                        break;
                }
            }
        }
    } else {
        console.log('\n--- PROPERTY DIFFERENCES: None ---');
    }

    // Summary
    console.log('\n========================================');
    results.identical = results.inBackupNotOriginal.length === 0 &&
                        results.inOriginalNotBackup.length === 0 &&
                        results.propertyDifferences.length === 0;

    if (results.identical) {
        console.log('✓ FILES ARE IDENTICAL');
    } else {
        console.log('✗ FILES HAVE DIFFERENCES:');
        if (results.inBackupNotOriginal.length > 0) {
            console.log(`  - ${results.inBackupNotOriginal.length} entries only in BACKUP`);
        }
        if (results.inOriginalNotBackup.length > 0) {
            console.log(`  - ${results.inOriginalNotBackup.length} entries only in ORIGINAL`);
        }
        if (results.propertyDifferences.length > 0) {
            console.log(`  - ${results.propertyDifferences.length} entries with property differences`);
        }
    }
    console.log('========================================');

    return results;
}

// =============================================================================
// EXPORTS
// =============================================================================

if (typeof window !== 'undefined') {
    window.saveIndividualNameDatabaseBulk = saveIndividualNameDatabaseBulk;
    window.saveDevBulkFile = saveDevBulkFile;  // For move alias feature (DEV bulk only)
    window.saveIndividualEntry = saveIndividualEntry;  // For move alias feature
    window.loadIndividualNameDatabaseFromBulk = loadIndividualNameDatabaseFromBulk;
    window.fileOutIndividualNames = fileOutIndividualNames;
    window.checkFileOutProgress = checkFileOutProgress;
    window.clearFileOutProgress = clearFileOutProgress;
    window.loadFileOutProgress = loadFileOutProgress;
    window.isFirstRun = isFirstRun;
    window.validateAndReconcileIndex = validateAndReconcileIndex;
    window.reconcileToMatchBulk = reconcileToMatchBulk;
    window.fullConsistencyCheck = fullConsistencyCheck;
    window.consistencyCheck = consistencyCheck;
    window.backupBulkFile = backupBulkFile;
    window.normalizeForGoogleDrive = normalizeForGoogleDrive;
    window.buildBulkFromGoogleFiles = buildBulkFromGoogleFiles;
    window.compareIndividualNameObjects = compareIndividualNameObjects;
    window.compareBulkFiles = compareBulkFiles;
    window.rebuildIndexMap = rebuildIndexMap;
    window.syncDevToOriginal = syncDevToOriginal;
    window.compareBackupToOriginal = compareBackupToOriginal;
}

console.log('[individualNameDatabaseSaveManager.js] Loaded.');
console.log('');
console.log('USAGE:');
console.log('  INTERACTIVE (via UI button - recommended):');
console.log('    Click "Build Run/Resume" button - handles all logic automatically');
console.log('');
console.log('  DIAGNOSTICS:');
console.log('    await fullConsistencyCheck()   - Check consistency across bulk/index/folder/progress');
console.log('    await reconcileToMatchBulk()   - Clean index and progress to match bulk (source of truth)');
console.log('    checkFileOutProgress()         - View current localStorage progress');
console.log('');
console.log('  INCREMENTAL CHANGE (Google files → bulk):');
console.log('    await buildBulkFromGoogleFiles()  - Rebuild bulk file from individual Google files');
console.log('    await compareBulkFiles()          - Compare DEV bulk with original bulk file');
console.log('    await syncDevToOriginal()         - Sync DEV bulk to Original (restores special chars)');
console.log('    await compareBackupToOriginal()   - Deep compare backup vs original bulk files');
console.log('');
console.log('  UTILITIES:');
console.log('    isFirstRun()                   - Check if this is a fresh start');
console.log('    clearFileOutProgress()         - Reset progress to start over');
console.log('    validateAndReconcileIndex()    - Add missing files to index (legacy)');
