/**
 * Contact Preference Override Manager
 *
 * Manages manual overrides for CollectiveContactInfo preferred selections.
 * When a user disagrees with the algorithmic preferred contact (address, phone,
 * PO box, or email), they can manually override it. Overrides are anchored to
 * stable entity keys (not fragile EntityGroup indices).
 *
 * Storage: Google Drive JSON file (same pattern as fireNumberCollisionDatabase.js)
 *
 * Usage:
 *   await loadContactPreferenceOverrides();
 *   const overrides = getOverridesForEntityKeys(['visionAppraisal:FireNumber:1510']);
 *   addContactPreferenceOverride(anchorKey, contactType, preferredValue);
 *   await saveContactPreferenceOverrides();
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const CONTACT_PREFERENCE_OVERRIDE_FILE_ID = '';  // Will be set after first save creates the file
const CONTACT_PREFERENCE_OVERRIDE_STORAGE_KEY = 'birava_contactPreferenceOverrideFileId';

const CONTACT_TYPES = {
    MAILING_ADDRESS: 'mailingAddress',
    PHONE: 'phone',
    PO_BOX: 'poBox',
    EMAIL: 'email'
};

// ============================================================================
// DATABASE STATE
// ============================================================================

const contactPreferenceOverrideDatabase = {
    // Primary storage: array of override records
    overrides: [],

    // Secondary index: anchorEntityKey -> array of override records
    byAnchorKey: new Map(),

    // Metadata
    metadata: {
        loaded: false,
        lastLoadTime: null,
        sourceFileId: null,
        hasUnsavedChanges: false,
        recordCount: 0
    }
};

window.contactPreferenceOverrideDatabase = contactPreferenceOverrideDatabase;
window.CONTACT_TYPES = CONTACT_TYPES;

// ============================================================================
// OVERRIDE RECORD STRUCTURE
// ============================================================================

/**
 * Create a new override record
 * @param {string} anchorEntityKey - Entity key anchoring this override
 * @param {string} contactType - One of CONTACT_TYPES values
 * @param {Object} preferredValue - Serialized form of the preferred contact (via serializeWithTypes)
 * @param {string} preferredDisplayTerm - Human-readable term for the preferred value
 * @returns {Object} Override record
 */
function createOverrideRecord(anchorEntityKey, contactType, preferredValue, preferredDisplayTerm) {
    return {
        anchorEntityKey: anchorEntityKey,
        contactType: contactType,
        preferredValue: preferredValue,
        preferredDisplayTerm: preferredDisplayTerm || '',
        dateSet: new Date().toISOString()
    };
}

// ============================================================================
// GOOGLE DRIVE JSON FILE INTEGRATION
// ============================================================================

/**
 * Load override database from Google Drive JSON file
 */
async function loadContactPreferenceOverrides() {
    const fileId = localStorage.getItem(CONTACT_PREFERENCE_OVERRIDE_STORAGE_KEY) || CONTACT_PREFERENCE_OVERRIDE_FILE_ID;

    if (!fileId) {
        console.log('[ContactPreferenceOverrides] No file ID configured — starting with empty database');
        contactPreferenceOverrideDatabase.metadata.loaded = true;
        contactPreferenceOverrideDatabase.metadata.lastLoadTime = new Date();
        contactPreferenceOverrideDatabase.metadata.recordCount = 0;
        return;
    }

    console.log(`[ContactPreferenceOverrides] Loading from file: ${fileId}`);

    try {
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });

        const data = response.result;

        // Clear existing data
        contactPreferenceOverrideDatabase.overrides = [];
        contactPreferenceOverrideDatabase.byAnchorKey.clear();

        // Load records from JSON
        const records = data.overrides || [];

        for (const record of records) {
            if (!record.anchorEntityKey || !record.contactType) continue;

            const overrideRecord = {
                anchorEntityKey: record.anchorEntityKey,
                contactType: record.contactType,
                preferredValue: record.preferredValue || null,
                preferredDisplayTerm: record.preferredDisplayTerm || '',
                dateSet: record.dateSet || new Date().toISOString()
            };

            contactPreferenceOverrideDatabase.overrides.push(overrideRecord);

            // Add to secondary index
            if (!contactPreferenceOverrideDatabase.byAnchorKey.has(overrideRecord.anchorEntityKey)) {
                contactPreferenceOverrideDatabase.byAnchorKey.set(overrideRecord.anchorEntityKey, []);
            }
            contactPreferenceOverrideDatabase.byAnchorKey.get(overrideRecord.anchorEntityKey).push(overrideRecord);
        }

        contactPreferenceOverrideDatabase.metadata.loaded = true;
        contactPreferenceOverrideDatabase.metadata.lastLoadTime = new Date();
        contactPreferenceOverrideDatabase.metadata.sourceFileId = fileId;
        contactPreferenceOverrideDatabase.metadata.recordCount = contactPreferenceOverrideDatabase.overrides.length;
        contactPreferenceOverrideDatabase.metadata.hasUnsavedChanges = false;

        console.log(`[ContactPreferenceOverrides] Loaded ${contactPreferenceOverrideDatabase.overrides.length} override records`);

    } catch (error) {
        console.error('[ContactPreferenceOverrides] Error loading from file:', error);

        // Start fresh if file doesn't exist or is empty
        contactPreferenceOverrideDatabase.metadata.loaded = true;
        contactPreferenceOverrideDatabase.metadata.lastLoadTime = new Date();
        contactPreferenceOverrideDatabase.metadata.recordCount = 0;
    }
}

/**
 * Save override database to Google Drive JSON file
 */
async function saveContactPreferenceOverrides() {
    let fileId = localStorage.getItem(CONTACT_PREFERENCE_OVERRIDE_STORAGE_KEY) || CONTACT_PREFERENCE_OVERRIDE_FILE_ID;

    const data = {
        __format: 'ContactPreferenceOverrideDatabase',
        __version: '1.0',
        __created: new Date().toISOString(),
        __recordCount: contactPreferenceOverrideDatabase.overrides.length,
        overrides: contactPreferenceOverrideDatabase.overrides
    };

    const boundary = '-------314159265358979323846';
    const delimiter = '\r\n--' + boundary + '\r\n';
    const closeDelimiter = '\r\n--' + boundary + '--';

    try {
        if (!fileId) {
            // Create new file on Google Drive
            console.log('[ContactPreferenceOverrides] Creating new file on Google Drive...');

            const metadata = {
                name: 'BIRAVA_ContactPreferenceOverrides.json',
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
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                        'Content-Type': `multipart/related; boundary="${boundary}"`
                    },
                    body: multipartRequestBody
                }
            );

            if (!response.ok) {
                throw new Error(`Create failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            fileId = result.id;
            localStorage.setItem(CONTACT_PREFERENCE_OVERRIDE_STORAGE_KEY, fileId);
            contactPreferenceOverrideDatabase.metadata.sourceFileId = fileId;
            console.log(`[ContactPreferenceOverrides] Created new file with ID: ${fileId}`);

        } else {
            // Update existing file
            console.log(`[ContactPreferenceOverrides] Saving to file: ${fileId}`);

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
        }

        contactPreferenceOverrideDatabase.metadata.hasUnsavedChanges = false;
        console.log(`[ContactPreferenceOverrides] Saved ${contactPreferenceOverrideDatabase.overrides.length} records`);

        return true;

    } catch (error) {
        console.error('[ContactPreferenceOverrides] Error saving:', error);
        throw error;
    }
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Add a contact preference override
 * @param {string} anchorEntityKey - Entity key to anchor the override to
 * @param {string} contactType - One of CONTACT_TYPES values
 * @param {Object} preferredValue - Serialized form of the preferred contact
 * @param {string} preferredDisplayTerm - Human-readable display term
 * @returns {Object} The created override record
 */
function addContactPreferenceOverride(anchorEntityKey, contactType, preferredValue, preferredDisplayTerm) {
    // Remove any existing override for same anchor + contact type
    removeContactPreferenceOverride(anchorEntityKey, contactType);

    const record = createOverrideRecord(anchorEntityKey, contactType, preferredValue, preferredDisplayTerm);

    contactPreferenceOverrideDatabase.overrides.push(record);

    // Update secondary index
    if (!contactPreferenceOverrideDatabase.byAnchorKey.has(anchorEntityKey)) {
        contactPreferenceOverrideDatabase.byAnchorKey.set(anchorEntityKey, []);
    }
    contactPreferenceOverrideDatabase.byAnchorKey.get(anchorEntityKey).push(record);

    contactPreferenceOverrideDatabase.metadata.recordCount = contactPreferenceOverrideDatabase.overrides.length;
    contactPreferenceOverrideDatabase.metadata.hasUnsavedChanges = true;

    console.log(`[ContactPreferenceOverrides] Added override: ${contactType} anchored to ${anchorEntityKey}`);

    return record;
}

/**
 * Remove a contact preference override
 * @param {string} anchorEntityKey - The anchor entity key
 * @param {string} contactType - The contact type to remove
 * @returns {boolean} True if an override was removed
 */
function removeContactPreferenceOverride(anchorEntityKey, contactType) {
    const initialLength = contactPreferenceOverrideDatabase.overrides.length;

    contactPreferenceOverrideDatabase.overrides = contactPreferenceOverrideDatabase.overrides.filter(
        record => !(record.anchorEntityKey === anchorEntityKey && record.contactType === contactType)
    );

    // Rebuild secondary index for this key
    const remaining = contactPreferenceOverrideDatabase.overrides.filter(
        record => record.anchorEntityKey === anchorEntityKey
    );

    if (remaining.length > 0) {
        contactPreferenceOverrideDatabase.byAnchorKey.set(anchorEntityKey, remaining);
    } else {
        contactPreferenceOverrideDatabase.byAnchorKey.delete(anchorEntityKey);
    }

    const removed = contactPreferenceOverrideDatabase.overrides.length < initialLength;

    if (removed) {
        contactPreferenceOverrideDatabase.metadata.recordCount = contactPreferenceOverrideDatabase.overrides.length;
        contactPreferenceOverrideDatabase.metadata.hasUnsavedChanges = true;
        console.log(`[ContactPreferenceOverrides] Removed override: ${contactType} from ${anchorEntityKey}`);
    }

    return removed;
}

/**
 * Reassign anchor key for all overrides from one key to another
 * @param {string} oldAnchorKey - Current anchor key
 * @param {string} newAnchorKey - New anchor key to use
 * @returns {number} Number of overrides reassigned
 */
function reassignOverrideAnchorKey(oldAnchorKey, newAnchorKey) {
    let count = 0;

    for (const record of contactPreferenceOverrideDatabase.overrides) {
        if (record.anchorEntityKey === oldAnchorKey) {
            record.anchorEntityKey = newAnchorKey;
            record.dateSet = new Date().toISOString();
            count++;
        }
    }

    if (count > 0) {
        // Rebuild secondary index
        _rebuildOverrideSecondaryIndex();
        contactPreferenceOverrideDatabase.metadata.hasUnsavedChanges = true;
        console.log(`[ContactPreferenceOverrides] Reassigned ${count} overrides from ${oldAnchorKey} to ${newAnchorKey}`);
    }

    return count;
}

/**
 * Reassign ALL overrides in a group to a single anchor key.
 * Finds all overrides whose anchor key is in the provided set of member keys,
 * and changes them all to the specified new anchor key.
 * @param {string[]} memberKeys - All member keys in the EntityGroup
 * @param {string} newAnchorKey - The key to reassign all overrides to
 * @returns {number} Number of overrides reassigned
 */
function reassignAllGroupOverrides(memberKeys, newAnchorKey) {
    const memberKeySet = new Set(memberKeys);
    let count = 0;

    for (const record of contactPreferenceOverrideDatabase.overrides) {
        if (memberKeySet.has(record.anchorEntityKey) && record.anchorEntityKey !== newAnchorKey) {
            record.anchorEntityKey = newAnchorKey;
            record.dateSet = new Date().toISOString();
            count++;
        }
    }

    if (count > 0) {
        _rebuildOverrideSecondaryIndex();
        contactPreferenceOverrideDatabase.metadata.hasUnsavedChanges = true;
        console.log(`[ContactPreferenceOverrides] Reassigned ${count} group overrides to ${newAnchorKey}`);
    }

    return count;
}

// ============================================================================
// LOOKUP FUNCTIONS
// ============================================================================

/**
 * Get all overrides for an array of entity keys (typically a group's memberKeys).
 * Returns overrides where the anchorEntityKey is in the provided set.
 * @param {string[]} entityKeys - Array of entity keys to check
 * @returns {Object[]} Array of override records matching any of the keys
 */
function getOverridesForEntityKeys(entityKeys) {
    const results = [];
    for (const key of entityKeys) {
        const records = contactPreferenceOverrideDatabase.byAnchorKey.get(key);
        if (records) {
            results.push(...records);
        }
    }
    return results;
}

/**
 * Get override for a specific anchor key and contact type
 * @param {string} anchorEntityKey - The anchor key
 * @param {string} contactType - The contact type
 * @returns {Object|null} The override record or null
 */
function getOverrideForKeyAndType(anchorEntityKey, contactType) {
    const records = contactPreferenceOverrideDatabase.byAnchorKey.get(anchorEntityKey);
    if (!records) return null;
    return records.find(r => r.contactType === contactType) || null;
}

/**
 * Get all override records
 * @returns {Object[]} All override records
 */
function getAllContactPreferenceOverrides() {
    return contactPreferenceOverrideDatabase.overrides;
}

/**
 * Get all unique anchor keys that have overrides
 * @returns {string[]} Array of anchor entity keys
 */
function getAllOverrideAnchorKeys() {
    return Array.from(contactPreferenceOverrideDatabase.byAnchorKey.keys());
}

/**
 * Check if any override exists for a set of entity keys
 * @param {string[]} entityKeys - Array of entity keys
 * @returns {boolean}
 */
function hasOverridesForEntityKeys(entityKeys) {
    for (const key of entityKeys) {
        if (contactPreferenceOverrideDatabase.byAnchorKey.has(key)) {
            return true;
        }
    }
    return false;
}

// ============================================================================
// KEY ABBREVIATION (presentation only)
// ============================================================================

/**
 * Abbreviate an entity key for display purposes.
 * visionAppraisal:FireNumber:1510 → VA:1510
 * bloomerang:12345:SimpleIdentifiers:...:head → BL:12345
 * @param {string} key - Full entity key
 * @returns {string} Abbreviated key
 */
function abbreviateEntityKey(key) {
    if (!key) return '';

    if (key.startsWith('visionAppraisal:')) {
        // Extract the location value (last segment typically)
        const parts = key.split(':');
        // visionAppraisal:FireNumber:1510 → VA:1510
        const locationValue = parts.length >= 3 ? parts[2] : parts[parts.length - 1];
        return 'VA:' + locationValue;
    }

    if (key.startsWith('bloomerang:')) {
        // Extract the account number (second segment)
        const parts = key.split(':');
        // bloomerang:12345:... → BL:12345
        const accountNumber = parts.length >= 2 ? parts[1] : parts[parts.length - 1];
        return 'BL:' + accountNumber;
    }

    // Unknown format — return as-is truncated
    return key.length > 20 ? key.substring(0, 20) + '...' : key;
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get override database statistics
 * @returns {Object}
 */
function getContactPreferenceOverrideStats() {
    const overrides = contactPreferenceOverrideDatabase.overrides;

    const byType = {};
    for (const type of Object.values(CONTACT_TYPES)) {
        byType[type] = overrides.filter(r => r.contactType === type).length;
    }

    return {
        totalOverrides: overrides.length,
        uniqueAnchorKeys: contactPreferenceOverrideDatabase.byAnchorKey.size,
        byContactType: byType,
        hasUnsavedChanges: contactPreferenceOverrideDatabase.metadata.hasUnsavedChanges,
        lastLoadTime: contactPreferenceOverrideDatabase.metadata.lastLoadTime
    };
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Rebuild the secondary index from the overrides array
 */
function _rebuildOverrideSecondaryIndex() {
    contactPreferenceOverrideDatabase.byAnchorKey.clear();

    for (const record of contactPreferenceOverrideDatabase.overrides) {
        if (!contactPreferenceOverrideDatabase.byAnchorKey.has(record.anchorEntityKey)) {
            contactPreferenceOverrideDatabase.byAnchorKey.set(record.anchorEntityKey, []);
        }
        contactPreferenceOverrideDatabase.byAnchorKey.get(record.anchorEntityKey).push(record);
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

window.loadContactPreferenceOverrides = loadContactPreferenceOverrides;
window.saveContactPreferenceOverrides = saveContactPreferenceOverrides;
window.addContactPreferenceOverride = addContactPreferenceOverride;
window.removeContactPreferenceOverride = removeContactPreferenceOverride;
window.reassignOverrideAnchorKey = reassignOverrideAnchorKey;
window.reassignAllGroupOverrides = reassignAllGroupOverrides;
window.getOverridesForEntityKeys = getOverridesForEntityKeys;
window.getOverrideForKeyAndType = getOverrideForKeyAndType;
window.getAllContactPreferenceOverrides = getAllContactPreferenceOverrides;
window.getAllOverrideAnchorKeys = getAllOverrideAnchorKeys;
window.hasOverridesForEntityKeys = hasOverridesForEntityKeys;
window.abbreviateEntityKey = abbreviateEntityKey;
window.getContactPreferenceOverrideStats = getContactPreferenceOverrideStats;
window.createOverrideRecord = createOverrideRecord;
window.CONTACT_PREFERENCE_OVERRIDE_STORAGE_KEY = CONTACT_PREFERENCE_OVERRIDE_STORAGE_KEY;

console.log('[ContactPreferenceOverrideManager] Module loaded');
