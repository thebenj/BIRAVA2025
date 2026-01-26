/**
 * Fire Number Collision Database
 *
 * Tracks VisionAppraisal entities where multiple PIDs share the same fire number
 * (same physical property, different owners/parcels).
 *
 * Data is persisted to Google Sheets for cross-session persistence.
 *
 * Usage:
 *   // Initialize at start of process
 *   await initializeFireNumberCollisionDatabase();
 *
 *   // Register a collision (called from fireNumberCollisionHandler.js)
 *   registerFireNumberCollision(baseFireNumber, entityKeys, pids);
 *
 *   // Lookup
 *   const record = getCollisionByFireNumber('72');
 *   const fireNum = getFireNumberForEntityKey('visionAppraisal:FireNumber:72A');
 *
 *   // Save changes
 *   await saveFireNumberCollisionDatabase();
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const FIRE_NUMBER_COLLISION_FILE_ID = '1exdeASVuntM6b_nyJUNUO0_EqRX8Jjz0';
const FIRE_NUMBER_COLLISION_STORAGE_KEY = 'birava_fireNumberCollisionFileId';

// Initialization modes
const COLLISION_DB_MODES = {
    REINITIALIZE: 'reinitialize',    // Clear all, repopulate from scratch
    CLEAR_KEYS: 'clear_keys',         // Keep fire numbers, clear entity keys
    INCREMENTAL: 'incremental'        // Add new keys to existing records
};

// ============================================================================
// DATABASE STATE
// ============================================================================

const fireNumberCollisionDatabase = {
    // Primary index: fire number -> CollisionRecord
    byFireNumber: new Map(),

    // Secondary index: entity key -> fire number
    byEntityKey: new Map(),

    // Metadata
    metadata: {
        loaded: false,
        lastLoadTime: null,
        sourceFileId: FIRE_NUMBER_COLLISION_FILE_ID,
        hasUnsavedChanges: false,
        initializationMode: null,
        recordCount: 0
    }
};

// Make globally accessible
window.fireNumberCollisionDatabase = fireNumberCollisionDatabase;
window.COLLISION_DB_MODES = COLLISION_DB_MODES;

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Prompt user for initialization mode
 * @returns {Promise<string>} The selected mode
 */
async function promptFireNumberCollisionDatabaseMode() {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); display: flex; align-items: center;
            justify-content: center; z-index: 10000;
        `;

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white; padding: 24px; border-radius: 8px;
            max-width: 500px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;

        dialog.innerHTML = `
            <h3 style="margin-top: 0; color: #1565c0;">Fire Number Collision Database</h3>
            <p>How should the collision database be handled for this run?</p>
            <div style="margin: 16px 0;">
                <button id="collisionModeReinit" style="display: block; width: 100%; padding: 12px; margin: 8px 0;
                    background: #e3f2fd; border: 1px solid #1565c0; border-radius: 4px; cursor: pointer; text-align: left;">
                    <strong>A) Reinitialize</strong><br>
                    <small>Clear all data and repopulate from scratch</small>
                </button>
                <button id="collisionModeClearKeys" style="display: block; width: 100%; padding: 12px; margin: 8px 0;
                    background: #fff3e0; border: 1px solid #ef6c00; border-radius: 4px; cursor: pointer; text-align: left;">
                    <strong>B) Clear Keys Only</strong><br>
                    <small>Keep fire number records, clear entity keys, then repopulate</small>
                </button>
                <button id="collisionModeIncremental" style="display: block; width: 100%; padding: 12px; margin: 8px 0;
                    background: #e8f5e9; border: 1px solid #2e7d32; border-radius: 4px; cursor: pointer; text-align: left;">
                    <strong>C) Incremental</strong><br>
                    <small>Keep existing data, only add new keys not already present</small>
                </button>
            </div>
        `;

        modal.appendChild(dialog);
        document.body.appendChild(modal);

        document.getElementById('collisionModeReinit').onclick = () => {
            document.body.removeChild(modal);
            resolve(COLLISION_DB_MODES.REINITIALIZE);
        };

        document.getElementById('collisionModeClearKeys').onclick = () => {
            document.body.removeChild(modal);
            resolve(COLLISION_DB_MODES.CLEAR_KEYS);
        };

        document.getElementById('collisionModeIncremental').onclick = () => {
            document.body.removeChild(modal);
            resolve(COLLISION_DB_MODES.INCREMENTAL);
        };
    });
}

/**
 * Initialize the collision database with the selected mode
 * @param {string} mode - One of COLLISION_DB_MODES
 */
async function initializeFireNumberCollisionDatabase(mode) {
    console.log(`[FireNumberCollisionDB] Initializing with mode: ${mode}`);

    // Clear in-memory state
    fireNumberCollisionDatabase.byFireNumber.clear();
    fireNumberCollisionDatabase.byEntityKey.clear();
    fireNumberCollisionDatabase.metadata.initializationMode = mode;
    fireNumberCollisionDatabase.metadata.hasUnsavedChanges = false;

    if (mode === COLLISION_DB_MODES.REINITIALIZE) {
        // Start completely fresh - don't load anything
        console.log('[FireNumberCollisionDB] Reinitialize mode - starting fresh');
        fireNumberCollisionDatabase.metadata.loaded = true;
        fireNumberCollisionDatabase.metadata.lastLoadTime = new Date();
        fireNumberCollisionDatabase.metadata.recordCount = 0;

    } else if (mode === COLLISION_DB_MODES.CLEAR_KEYS) {
        // Load existing records but clear their keys
        console.log('[FireNumberCollisionDB] Clear keys mode - loading then clearing keys');
        await loadFireNumberCollisionDatabaseFromSheet();

        // Clear keys from all records but keep fire numbers
        for (const [fireNumber, record] of fireNumberCollisionDatabase.byFireNumber) {
            record.entityKeys = [];
            record.pids = [];
            record.lastUpdated = new Date().toISOString();
        }

        // Clear the secondary index
        fireNumberCollisionDatabase.byEntityKey.clear();
        fireNumberCollisionDatabase.metadata.hasUnsavedChanges = true;

    } else if (mode === COLLISION_DB_MODES.INCREMENTAL) {
        // Load existing records and keep them
        console.log('[FireNumberCollisionDB] Incremental mode - loading existing data');
        await loadFireNumberCollisionDatabaseFromSheet();
    }

    console.log(`[FireNumberCollisionDB] Initialization complete. Records: ${fireNumberCollisionDatabase.byFireNumber.size}`);
    return fireNumberCollisionDatabase;
}

// ============================================================================
// GOOGLE DRIVE JSON FILE INTEGRATION
// ============================================================================

/**
 * Load collision database from Google Drive JSON file
 */
async function loadFireNumberCollisionDatabaseFromFile() {
    const fileId = localStorage.getItem(FIRE_NUMBER_COLLISION_STORAGE_KEY) || FIRE_NUMBER_COLLISION_FILE_ID;

    console.log(`[FireNumberCollisionDB] Loading from file: ${fileId}`);

    try {
        // Download JSON file from Google Drive
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });

        const data = response.result;

        // Clear existing data
        fireNumberCollisionDatabase.byFireNumber.clear();
        fireNumberCollisionDatabase.byEntityKey.clear();

        // Load records from JSON
        const records = data.records || [];

        for (const record of records) {
            if (!record.fireNumber) continue;

            const collisionRecord = {
                fireNumber: String(record.fireNumber),
                entityKeys: record.entityKeys || [],
                pids: record.pids || [],
                lastUpdated: record.lastUpdated || new Date().toISOString(),
                manuallyAdded: record.manuallyAdded || false
            };

            // Add to primary index
            fireNumberCollisionDatabase.byFireNumber.set(collisionRecord.fireNumber, collisionRecord);

            // Add to secondary index
            for (const key of collisionRecord.entityKeys) {
                fireNumberCollisionDatabase.byEntityKey.set(key, collisionRecord.fireNumber);
            }
        }

        fireNumberCollisionDatabase.metadata.loaded = true;
        fireNumberCollisionDatabase.metadata.lastLoadTime = new Date();
        fireNumberCollisionDatabase.metadata.sourceFileId = fileId;
        fireNumberCollisionDatabase.metadata.recordCount = fireNumberCollisionDatabase.byFireNumber.size;
        fireNumberCollisionDatabase.metadata.hasUnsavedChanges = false;

        console.log(`[FireNumberCollisionDB] Loaded ${fireNumberCollisionDatabase.byFireNumber.size} collision records`);

    } catch (error) {
        console.error('[FireNumberCollisionDB] Error loading from file:', error);

        // If file doesn't exist or is empty, start fresh
        fireNumberCollisionDatabase.metadata.loaded = true;
        fireNumberCollisionDatabase.metadata.lastLoadTime = new Date();
        fireNumberCollisionDatabase.metadata.recordCount = 0;
    }
}

/**
 * Save collision database to Google Drive JSON file
 */
async function saveFireNumberCollisionDatabaseToFile() {
    const fileId = localStorage.getItem(FIRE_NUMBER_COLLISION_STORAGE_KEY) || FIRE_NUMBER_COLLISION_FILE_ID;

    console.log(`[FireNumberCollisionDB] Saving to file: ${fileId}`);

    // Build JSON structure
    const records = [];
    for (const [fireNumber, record] of fireNumberCollisionDatabase.byFireNumber) {
        records.push({
            fireNumber: record.fireNumber,
            entityKeys: record.entityKeys,
            pids: record.pids,
            entityCount: record.entityKeys.length,
            lastUpdated: record.lastUpdated,
            manuallyAdded: record.manuallyAdded
        });
    }

    const data = {
        __format: 'FireNumberCollisionDatabase',
        __version: '1.0',
        __created: new Date().toISOString(),
        __recordCount: records.length,
        records: records
    };

    try {
        // Upload JSON to Google Drive (update existing file)
        const boundary = '-------314159265358979323846';
        const delimiter = '\r\n--' + boundary + '\r\n';
        const closeDelimiter = '\r\n--' + boundary + '--';

        const metadata = {
            mimeType: 'application/json'
        };

        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(data, null, 2) +
            closeDelimiter;

        const response = await fetch(
            `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                    'Content-Type': `multipart/related; boundary="${boundary}"`
                },
                body: multipartRequestBody
            }
        );

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }

        fireNumberCollisionDatabase.metadata.hasUnsavedChanges = false;
        console.log(`[FireNumberCollisionDB] Saved ${records.length} records to file`);

        return true;

    } catch (error) {
        console.error('[FireNumberCollisionDB] Error saving to file:', error);
        throw error;
    }
}

// Aliases for backward compatibility
const loadFireNumberCollisionDatabaseFromSheet = loadFireNumberCollisionDatabaseFromFile;
const saveFireNumberCollisionDatabaseToSheet = saveFireNumberCollisionDatabaseToFile;

// ============================================================================
// COLLISION REGISTRATION
// ============================================================================

/**
 * Register a fire number collision
 * Called from fireNumberCollisionHandler.js when collision is detected
 *
 * @param {string} fireNumber - Base fire number (no suffix)
 * @param {string[]} entityKeys - All entity keys at this fire number
 * @param {string[]} pids - All PIDs at this fire number
 */
function registerFireNumberCollision(fireNumber, entityKeys, pids) {
    if (!fireNumberCollisionDatabase.metadata.loaded) {
        console.warn('[FireNumberCollisionDB] Database not loaded, skipping registration');
        return;
    }

    const mode = fireNumberCollisionDatabase.metadata.initializationMode;
    const existingRecord = fireNumberCollisionDatabase.byFireNumber.get(fireNumber);

    if (existingRecord) {
        if (mode === COLLISION_DB_MODES.INCREMENTAL) {
            // Only add keys not already present
            let added = false;
            for (const key of entityKeys) {
                if (!existingRecord.entityKeys.includes(key)) {
                    existingRecord.entityKeys.push(key);
                    fireNumberCollisionDatabase.byEntityKey.set(key, fireNumber);
                    added = true;
                }
            }
            for (const pid of pids) {
                if (!existingRecord.pids.includes(pid)) {
                    existingRecord.pids.push(pid);
                    added = true;
                }
            }
            if (added) {
                existingRecord.lastUpdated = new Date().toISOString();
                fireNumberCollisionDatabase.metadata.hasUnsavedChanges = true;
            }
        } else {
            // REINITIALIZE or CLEAR_KEYS mode - replace keys
            existingRecord.entityKeys = [...new Set(entityKeys)];
            existingRecord.pids = [...new Set(pids)];
            existingRecord.lastUpdated = new Date().toISOString();

            // Update secondary index
            for (const key of entityKeys) {
                fireNumberCollisionDatabase.byEntityKey.set(key, fireNumber);
            }
            fireNumberCollisionDatabase.metadata.hasUnsavedChanges = true;
        }
    } else {
        // New record
        const record = {
            fireNumber: fireNumber,
            entityKeys: [...new Set(entityKeys)],
            pids: [...new Set(pids)],
            lastUpdated: new Date().toISOString(),
            manuallyAdded: false
        };

        fireNumberCollisionDatabase.byFireNumber.set(fireNumber, record);

        // Update secondary index
        for (const key of entityKeys) {
            fireNumberCollisionDatabase.byEntityKey.set(key, fireNumber);
        }

        fireNumberCollisionDatabase.metadata.recordCount++;
        fireNumberCollisionDatabase.metadata.hasUnsavedChanges = true;
    }
}

// ============================================================================
// LOOKUP FUNCTIONS
// ============================================================================

/**
 * Get collision record by fire number
 * @param {string} fireNumber - Base fire number
 * @returns {Object|null} CollisionRecord or null
 */
function getCollisionByFireNumber(fireNumber) {
    return fireNumberCollisionDatabase.byFireNumber.get(String(fireNumber)) || null;
}

/**
 * Get fire number for an entity key
 * @param {string} entityKey - Entity key
 * @returns {string|null} Fire number or null
 */
function getFireNumberForEntityKey(entityKey) {
    return fireNumberCollisionDatabase.byEntityKey.get(entityKey) || null;
}

/**
 * Check if an entity key is in a known collision
 * @param {string} entityKey - Entity key to check
 * @returns {boolean}
 */
function isEntityInCollision(entityKey) {
    return fireNumberCollisionDatabase.byEntityKey.has(entityKey);
}

/**
 * Get all collision records
 * @returns {Array} Array of CollisionRecord objects
 */
function getAllCollisionRecords() {
    return Array.from(fireNumberCollisionDatabase.byFireNumber.values());
}

/**
 * Get all fire numbers with collisions
 * @returns {string[]}
 */
function getAllCollisionFireNumbers() {
    return Array.from(fireNumberCollisionDatabase.byFireNumber.keys());
}

// ============================================================================
// COLLISION ADDRESS DETECTION (Step 1 & 2 of Matching Integration)
// ============================================================================

/**
 * Extract base fire number from an Address object
 * Handles suffixed fire numbers (e.g., 72A -> 72)
 *
 * @param {Address} address - Address object
 * @returns {string|null} Base fire number (without suffix) or null if no fire number
 */
function getAddressFireNumber(address) {
    if (!address) return null;

    // Check if address has a fire number (BI address with street number)
    if (!address.hasFireNumber || !address.hasFireNumber()) {
        return null;
    }

    // Get fire number term (could be "72" or "72A")
    const fireNumberTerm = address.getFireNumber();
    if (!fireNumberTerm || !fireNumberTerm.term) {
        return null;
    }

    const fireNumberStr = String(fireNumberTerm.term).trim();
    if (!fireNumberStr) return null;

    // Extract base fire number (remove suffix)
    // Fire numbers are typically numeric; suffix is one or two trailing letters
    // e.g., "72A" -> "72", "72AA" -> "72", "72" -> "72"
    const match = fireNumberStr.match(/^(\d+)([A-Z]{1,2})?$/);
    if (match) {
        return match[1];
    }

    // Return as-is if doesn't match expected pattern
    return fireNumberStr;
}

/**
 * Check if an address is at a known fire number collision location
 *
 * An address is a "fire number collision address" when ALL of these are true:
 * 1. It is a Block Island address
 * 2. It has a fire number
 * 3. That fire number exists in the fire number collision database
 *
 * @param {Address} address - Address object to check
 * @returns {boolean} True if address is at a known collision fire number
 */
function isFireNumberCollisionAddress(address) {
    if (!address) return false;

    // Check 1: Must be a Block Island address
    if (!address.isBlockIslandAddress || address.isBlockIslandAddress.term !== true) {
        return false;
    }

    // Check 2 & 3: Must have a fire number that exists in collision database
    const baseFireNumber = getAddressFireNumber(address);
    if (!baseFireNumber) {
        return false;
    }

    // Check if this fire number is in the collision database
    return fireNumberCollisionDatabase.byFireNumber.has(baseFireNumber);
}

/**
 * Detect the collision case for two addresses being compared
 *
 * Cases (from reference_fireNumberCollisionArchitecture.md Section 9.2):
 *   a) Neither address is a collision address → No change to existing behavior
 *   b) One is a collision address, other is not → No change to existing behavior
 *   c) Both are collision addresses, different fire numbers → No change to existing behavior
 *   d) Both VA entities, both PRIMARY addresses are collision addresses with SAME fire number → EXCLUDED
 *   e) Not any other case, but both addresses are collision addresses with SAME fire number → Compare without fire numbers
 *
 * @param {Address} address1 - First address being compared
 * @param {Address} address2 - Second address being compared
 * @param {Entity} entity1 - Entity that address1 belongs to (optional, needed for case d)
 * @param {Entity} entity2 - Entity that address2 belongs to (optional, needed for case d)
 * @param {string} entityKey1 - Entity key for entity1 (optional, used to determine source)
 * @param {string} entityKey2 - Entity key for entity2 (optional, used to determine source)
 * @returns {string} Case identifier: 'a', 'b', 'c', 'd', or 'e'
 */
function detectCollisionCase(address1, address2, entity1, entity2, entityKey1, entityKey2) {
    const isCollision1 = isFireNumberCollisionAddress(address1);
    const isCollision2 = isFireNumberCollisionAddress(address2);

    // Case a: Neither is collision address
    if (!isCollision1 && !isCollision2) {
        return 'a';
    }

    // Case b: Only one is collision address
    if (!isCollision1 || !isCollision2) {
        return 'b';
    }

    // Both are collision addresses - check fire numbers
    const fn1 = getAddressFireNumber(address1);
    const fn2 = getAddressFireNumber(address2);

    // Case c: Different fire numbers
    if (fn1 !== fn2) {
        return 'c';
    }

    // Same fire number - check for case d
    // Case d: Both VA entities with primary addresses at same collision fire number
    if (entity1 && entity2) {
        // Determine source from entity key prefix (more reliable than sourceDatabase property)
        const isVA1 = entityKey1?.startsWith('visionAppraisal:') ||
                      entity1.sourceDatabase === 'visionAppraisal';
        const isVA2 = entityKey2?.startsWith('visionAppraisal:') ||
                      entity2.sourceDatabase === 'visionAppraisal';

        // Check if addresses are the primary addresses of their respective entities
        const isPrimary1 = address1 === entity1.contactInfo?.primaryAddress;
        const isPrimary2 = address2 === entity2.contactInfo?.primaryAddress;

        if (isVA1 && isVA2 && isPrimary1 && isPrimary2) {
            return 'd';
        }
    }

    // Case e: All other cases with same collision fire number
    return 'e';
}

// ============================================================================
// MANUAL EDITING
// ============================================================================

/**
 * Manually add an entity key to a fire number
 * @param {string} fireNumber - Fire number
 * @param {string} entityKey - Entity key to add
 * @param {string} pid - PID (optional)
 */
function addEntityKeyToCollision(fireNumber, entityKey, pid = '') {
    let record = fireNumberCollisionDatabase.byFireNumber.get(fireNumber);

    if (!record) {
        // Create new record
        record = {
            fireNumber: fireNumber,
            entityKeys: [],
            pids: [],
            lastUpdated: new Date().toISOString(),
            manuallyAdded: true
        };
        fireNumberCollisionDatabase.byFireNumber.set(fireNumber, record);
        fireNumberCollisionDatabase.metadata.recordCount++;
    }

    if (!record.entityKeys.includes(entityKey)) {
        record.entityKeys.push(entityKey);
        fireNumberCollisionDatabase.byEntityKey.set(entityKey, fireNumber);
    }

    if (pid && !record.pids.includes(pid)) {
        record.pids.push(pid);
    }

    record.lastUpdated = new Date().toISOString();
    fireNumberCollisionDatabase.metadata.hasUnsavedChanges = true;
}

/**
 * Remove an entity key from a fire number
 * @param {string} fireNumber - Fire number
 * @param {string} entityKey - Entity key to remove
 */
function removeEntityKeyFromCollision(fireNumber, entityKey) {
    const record = fireNumberCollisionDatabase.byFireNumber.get(fireNumber);
    if (!record) return;

    const index = record.entityKeys.indexOf(entityKey);
    if (index > -1) {
        record.entityKeys.splice(index, 1);
        fireNumberCollisionDatabase.byEntityKey.delete(entityKey);
        record.lastUpdated = new Date().toISOString();
        fireNumberCollisionDatabase.metadata.hasUnsavedChanges = true;
    }
}

/**
 * Create a new collision record manually
 * @param {string} fireNumber - Fire number
 */
function createCollisionRecord(fireNumber) {
    if (fireNumberCollisionDatabase.byFireNumber.has(fireNumber)) {
        console.warn(`[FireNumberCollisionDB] Record for fire number ${fireNumber} already exists`);
        return false;
    }

    const record = {
        fireNumber: fireNumber,
        entityKeys: [],
        pids: [],
        lastUpdated: new Date().toISOString(),
        manuallyAdded: true
    };

    fireNumberCollisionDatabase.byFireNumber.set(fireNumber, record);
    fireNumberCollisionDatabase.metadata.recordCount++;
    fireNumberCollisionDatabase.metadata.hasUnsavedChanges = true;

    return true;
}

/**
 * Delete a collision record
 * @param {string} fireNumber - Fire number to delete
 */
function deleteCollisionRecord(fireNumber) {
    const record = fireNumberCollisionDatabase.byFireNumber.get(fireNumber);
    if (!record) return false;

    // Remove from secondary index
    for (const key of record.entityKeys) {
        fireNumberCollisionDatabase.byEntityKey.delete(key);
    }

    fireNumberCollisionDatabase.byFireNumber.delete(fireNumber);
    fireNumberCollisionDatabase.metadata.recordCount--;
    fireNumberCollisionDatabase.metadata.hasUnsavedChanges = true;

    return true;
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get database statistics
 * @returns {Object}
 */
function getFireNumberCollisionStats() {
    const records = getAllCollisionRecords();

    let totalEntityKeys = 0;
    let maxEntitiesPerFireNumber = 0;
    let manuallyAddedCount = 0;

    for (const record of records) {
        totalEntityKeys += record.entityKeys.length;
        if (record.entityKeys.length > maxEntitiesPerFireNumber) {
            maxEntitiesPerFireNumber = record.entityKeys.length;
        }
        if (record.manuallyAdded) {
            manuallyAddedCount++;
        }
    }

    return {
        totalFireNumbers: records.length,
        totalEntityKeys: totalEntityKeys,
        averageEntitiesPerFireNumber: records.length > 0 ? (totalEntityKeys / records.length).toFixed(2) : 0,
        maxEntitiesPerFireNumber: maxEntitiesPerFireNumber,
        manuallyAddedRecords: manuallyAddedCount,
        hasUnsavedChanges: fireNumberCollisionDatabase.metadata.hasUnsavedChanges,
        initializationMode: fireNumberCollisionDatabase.metadata.initializationMode,
        lastLoadTime: fireNumberCollisionDatabase.metadata.lastLoadTime
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

// Make functions globally accessible
window.promptFireNumberCollisionDatabaseMode = promptFireNumberCollisionDatabaseMode;
window.initializeFireNumberCollisionDatabase = initializeFireNumberCollisionDatabase;
window.loadFireNumberCollisionDatabaseFromFile = loadFireNumberCollisionDatabaseFromFile;
window.saveFireNumberCollisionDatabaseToFile = saveFireNumberCollisionDatabaseToFile;
window.loadFireNumberCollisionDatabaseFromSheet = loadFireNumberCollisionDatabaseFromSheet; // alias
window.saveFireNumberCollisionDatabaseToSheet = saveFireNumberCollisionDatabaseToSheet; // alias
window.registerFireNumberCollision = registerFireNumberCollision;
window.getCollisionByFireNumber = getCollisionByFireNumber;
window.getFireNumberForEntityKey = getFireNumberForEntityKey;
window.isEntityInCollision = isEntityInCollision;
window.getAllCollisionRecords = getAllCollisionRecords;
window.getAllCollisionFireNumbers = getAllCollisionFireNumbers;
window.addEntityKeyToCollision = addEntityKeyToCollision;
window.removeEntityKeyFromCollision = removeEntityKeyFromCollision;
window.createCollisionRecord = createCollisionRecord;
window.deleteCollisionRecord = deleteCollisionRecord;
window.getFireNumberCollisionStats = getFireNumberCollisionStats;

// Step 1 & 2: Collision address detection
window.getAddressFireNumber = getAddressFireNumber;
window.isFireNumberCollisionAddress = isFireNumberCollisionAddress;

// Step 3: Collision case detection
window.detectCollisionCase = detectCollisionCase;

console.log('[FireNumberCollisionDatabase] Module loaded');
