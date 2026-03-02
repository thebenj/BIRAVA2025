/**
 * =============================================================================
 * SUPPLEMENTAL DATA DATABASE - Base Class
 * =============================================================================
 *
 * A general-purpose database system for managing supplemental data records
 * (phonebook entries, email records, etc.) with Google Drive persistence.
 *
 * KEY DIFFERENCES FROM AliasedTermDatabase:
 * - Entries are RECORDS with multiple fields, not Aliased objects with aliases
 * - No variation cache (entries are keyed by a single canonical key)
 * - Built-in bulk file support for fast loading
 * - Safe index update pattern to prevent null-fileId corruption
 *
 * PERSISTENCE LAYERS:
 * 1. Bulk file    -> fast loading (single API call), used during entity group builds
 * 2. Individual files -> targeted updates, used during maintenance
 * 3. Index file   -> maps entry keys to Google Drive file IDs
 *
 * USAGE:
 * Extend this class for specific data sources (e.g., PhonebookDatabase).
 *
 * Created: February 26, 2026
 * Reference: reference_phonebookDatabasePlan.md
 * =============================================================================
 */


// =============================================================================
// SUPPLEMENTAL DATA ENTRY - Base class for supplemental data records
// =============================================================================

/**
 * SupplementalDataEntry - Base class for supplemental data records
 *
 * Common fields shared across all supplemental data types.
 * Extend for specific data sources (e.g., PhonebookEntry).
 */
class SupplementalDataEntry {
    /**
     * @param {Object} [config]
     * @param {string} [config.entryKey] - Primary key for this entry
     * @param {string} [config.classification] - 'person', 'nonhuman', 'unclassified'
     * @param {Array}  [config.matchAssociations] - Array of match association objects
     * @param {Array}  [config.exclusions] - Array of explicit exclusion objects
     * @param {Object} [config.userDeclarations] - User declaration overrides
     * @param {Object} [config.sourceMetadata] - Source file metadata
     */
    constructor(config = {}) {
        // Primary key (set by subclass or during creation)
        this.entryKey = config.entryKey || null;

        // Classification: 'person', 'nonhuman', 'unclassified'
        this.classification = config.classification || 'unclassified';

        // Match associations to entity groups
        // Each: { groupIndex, entityKey, matchSource, matchConfidence, designation }
        this.matchAssociations = config.matchAssociations || [];

        // Explicit exclusions (records user declared should NOT match)
        // Each: { groupIndex, entityKey, reason, declaredDate }
        this.exclusions = config.exclusions || [];

        // User declarations that override algorithmic results
        // e.g., { classificationOverride: 'nonhuman', declaredDate: '...', reason: '...' }
        this.userDeclarations = config.userDeclarations || {};

        // Source metadata
        this.sourceMetadata = config.sourceMetadata || {};
    }

    /**
     * Add a match association
     * @param {Object} association - { groupIndex, entityKey, matchSource, matchConfidence, designation }
     */
    addMatchAssociation(association) {
        if (!association || association.groupIndex == null) {
            throw new Error('Match association requires at least groupIndex');
        }
        this.matchAssociations.push(association);
    }

    /**
     * Remove match associations for a specific group
     * @param {number} groupIndex
     * @returns {number} Number of associations removed
     */
    removeMatchAssociationsForGroup(groupIndex) {
        const before = this.matchAssociations.length;
        this.matchAssociations = this.matchAssociations.filter(a => a.groupIndex !== groupIndex);
        return before - this.matchAssociations.length;
    }

    /**
     * Add an explicit exclusion
     * @param {Object} exclusion - { groupIndex, entityKey, reason }
     */
    addExclusion(exclusion) {
        if (!exclusion || exclusion.groupIndex == null) {
            throw new Error('Exclusion requires at least groupIndex');
        }
        exclusion.declaredDate = exclusion.declaredDate || new Date().toISOString();
        this.exclusions.push(exclusion);
    }

    /**
     * Check if this entry has any match associations
     * @returns {boolean}
     */
    hasMatchAssociations() {
        return this.matchAssociations.length > 0;
    }

    /**
     * Check if a specific group is excluded
     * @param {number} groupIndex
     * @returns {boolean}
     */
    isGroupExcluded(groupIndex) {
        return this.exclusions.some(e => e.groupIndex === groupIndex);
    }

    /**
     * Get the effective classification (user declaration overrides algorithmic)
     * @returns {string}
     */
    getEffectiveClassification() {
        if (this.userDeclarations.classificationOverride) {
            return this.userDeclarations.classificationOverride;
        }
        return this.classification;
    }
}


// =============================================================================
// SUPPLEMENTAL DATA DATABASE - Base class for supplemental data source databases
// =============================================================================

/**
 * SupplementalDataDatabase - Base class for supplemental data source databases
 *
 * Manages a collection of SupplementalDataEntry objects with Google Drive persistence.
 * Follows AliasedTermDatabase patterns adapted for record-based (not alias-based) data.
 *
 * Entry storage: Map<key, { entry: SupplementalDataEntry, fileId: string|null, created: string, lastModified: string }>
 */
class SupplementalDataDatabase {
    /**
     * @param {Object} config
     * @param {string} config.objectType - Database type name (e.g., 'Phonebook')
     * @param {string} [config.databaseFileId] - Google Drive file ID for index file
     * @param {string} [config.folderFileId] - Google Drive folder ID for individual files
     * @param {string} [config.deletedFolderFileId] - Google Drive folder ID for deleted files
     * @param {string} [config.bulkFileId] - Google Drive file ID for bulk database file
     */
    constructor(config) {
        if (!config || !config.objectType) {
            throw new Error('SupplementalDataDatabase requires objectType in config');
        }

        // Configuration
        this.objectType = config.objectType;
        this.databaseFileId = config.databaseFileId || null;
        this.folderFileId = config.folderFileId || null;
        this.deletedFolderFileId = config.deletedFolderFileId || null;
        this.bulkFileId = config.bulkFileId || null;

        // Data storage
        // Map<key, { entry: SupplementalDataEntry, fileId: string|null, created: string, lastModified: string }>
        this.entries = new Map();

        // Metadata
        this.version = '1.0';
        this.created = null;
        this.lastModified = null;

        // Loading state
        this._isLoaded = false;
        this._loadedFrom = null;  // 'bulk', 'files', or null
    }

    // =========================================================================
    // CONFIGURATION VALIDATION
    // =========================================================================

    /**
     * Check if configured for individual file operations (index + folder)
     * @returns {boolean}
     */
    isConfiguredForFiles() {
        return !!(this.databaseFileId && this.folderFileId);
    }

    /**
     * Check if configured for bulk operations
     * @returns {boolean}
     */
    isConfiguredForBulk() {
        return !!this.bulkFileId;
    }

    _validateFileConfig() {
        if (!this.isConfiguredForFiles()) {
            throw new Error(`${this.objectType}Database: databaseFileId and folderFileId required for file operations`);
        }
    }

    _validateBulkConfig() {
        if (!this.isConfiguredForBulk()) {
            throw new Error(`${this.objectType}Database: bulkFileId required for bulk operations`);
        }
    }

    // =========================================================================
    // KEY MANAGEMENT (override in subclass)
    // =========================================================================

    /**
     * Normalize a key for storage/lookup.
     * Override in subclass for type-specific normalization.
     * @param {string} key
     * @returns {string}
     */
    _normalizeKey(key) {
        if (!key) return '';
        return String(key).trim();
    }

    /**
     * Extract the key from an entry object.
     * Override in subclass if key comes from a field other than entryKey.
     * @param {SupplementalDataEntry} entry
     * @returns {string}
     */
    _getEntryKey(entry) {
        if (entry.entryKey != null) return entry.entryKey;
        throw new Error('Entry has no entryKey. Override _getEntryKey() in subclass if using a different key field.');
    }

    // =========================================================================
    // LOADING - BULK FILE
    // =========================================================================

    /**
     * Load the entire database from a single bulk file.
     * Fast loading for entity group builds and normal operation.
     * Note: entries loaded from bulk have fileId=null (use index for file mapping).
     * @returns {Promise<void>}
     */
    async loadFromBulk() {
        this._validateBulkConfig();

        const startTime = Date.now();
        console.log(`[${this.objectType}Database] Loading from bulk file...`);

        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${this.bulkFileId}?alt=media`,
            { headers: { 'Authorization': `Bearer ${gapi.client.getToken().access_token}` } }
        );
        if (!response.ok) {
            throw new Error(`Failed to load bulk file: HTTP ${response.status}: ${await response.text()}`);
        }

        const bulkData = deserializeWithTypes(await response.text());

        this.entries.clear();

        if (bulkData && bulkData.entries) {
            for (const [key, wrapper] of Object.entries(bulkData.entries)) {
                this.entries.set(key, {
                    entry: wrapper.entry,
                    fileId: null,  // NOT available from bulk — only in index
                    created: wrapper.created,
                    lastModified: wrapper.lastModified
                });
            }
        }

        this.version = bulkData?.version || '1.0';
        this.created = bulkData?.created || null;
        this.lastModified = bulkData?.lastModified || null;

        this._isLoaded = true;
        this._loadedFrom = 'bulk';

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[${this.objectType}Database] Loaded ${this.entries.size} entries from bulk in ${elapsed}s`);
    }

    /**
     * After loadFromBulk(), merge fileIds from the index onto in-memory entries.
     * This enables incremental fileOutEntries() — only entries without fileIds get created.
     * @returns {Promise<{merged: number, missing: number}>}
     */
    async mergeIndexFileIds() {
        if (!this._isLoaded) {
            throw new Error(`[${this.objectType}Database] Must load entries before merging index`);
        }

        const indexData = await this._loadIndexFile();
        const indexEntries = indexData.entries || {};

        let merged = 0;
        let missing = 0;

        for (const [key, wrapper] of this.entries) {
            if (indexEntries[key] && indexEntries[key].fileId) {
                wrapper.fileId = indexEntries[key].fileId;
                merged++;
            } else {
                missing++;
            }
        }

        console.log(`[${this.objectType}Database] Merged index: ${merged} entries got fileIds, ${missing} still need file-out`);
        return { merged, missing };
    }

    // =========================================================================
    // LOADING - INDIVIDUAL FILES
    // =========================================================================

    /**
     * Load from Google Drive individual files via index.
     * Slower than bulk but entries have valid fileIds for targeted updates.
     * @param {number} [batchSize=15] - Parallel loading batch size
     * @returns {Promise<void>}
     */
    async loadFromDrive(batchSize = 15) {
        this._validateFileConfig();

        const startTime = Date.now();
        console.log(`[${this.objectType}Database] Loading from Google Drive (individual files)...`);

        // Step 1: Load index
        const indexData = await this._loadIndexFile();
        const indexEntries = Object.entries(indexData.entries || {});
        console.log(`[${this.objectType}Database] Loading ${indexEntries.length} entries in batches of ${batchSize}...`);

        this.entries.clear();
        let loaded = 0;
        let failed = 0;

        // Step 2: Load in parallel batches
        for (let i = 0; i < indexEntries.length; i += batchSize) {
            const batch = indexEntries.slice(i, i + batchSize);

            const results = await Promise.allSettled(
                batch.map(async ([key, meta]) => {
                    const fileData = await this._loadObjectFile(meta.fileId);
                    const entry = this._deserializeEntry(fileData);
                    return { key, entry, meta };
                })
            );

            for (const result of results) {
                if (result.status === 'fulfilled') {
                    const { key, entry, meta } = result.value;
                    this.entries.set(key, {
                        entry,
                        fileId: meta.fileId,
                        created: meta.created,
                        lastModified: meta.lastModified
                    });
                    loaded++;
                } else {
                    console.error(`[${this.objectType}Database] Failed to load:`, result.reason);
                    failed++;
                }
            }

            if (indexEntries.length > 50) {
                const batchNum = Math.floor(i / batchSize) + 1;
                const totalBatches = Math.ceil(indexEntries.length / batchSize);
                console.log(`[${this.objectType}Database] Batch ${batchNum}/${totalBatches} (${loaded} loaded)`);
            }
        }

        this.version = indexData.__version || '1.0';
        this.created = indexData.__created;
        this.lastModified = indexData.__lastModified;

        this._isLoaded = true;
        this._loadedFrom = 'files';

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[${this.objectType}Database] Loaded ${loaded} entries (${failed} failed) in ${elapsed}s`);
    }

    // =========================================================================
    // SAVING - BULK FILE
    // =========================================================================

    /**
     * Save entire database to a single bulk file.
     * @returns {Promise<void>}
     */
    async saveBulk() {
        this._validateBulkConfig();

        console.log(`[${this.objectType}Database] Saving bulk file (${this.entries.size} entries)...`);

        const bulkEntries = {};
        for (const [key, wrapper] of this.entries) {
            bulkEntries[key] = {
                entry: wrapper.entry,
                created: wrapper.created,
                lastModified: wrapper.lastModified
                // fileId intentionally excluded from bulk
            };
        }

        const bulkData = {
            __format: 'SupplementalDataDatabaseBulk',
            __objectType: this.objectType,
            version: this.version,
            created: this.created || new Date().toISOString(),
            lastModified: new Date().toISOString(),
            entryCount: this.entries.size,
            entries: bulkEntries
        };

        const jsonContent = serializeWithTypes(bulkData);

        const response = await fetch(
            `https://www.googleapis.com/upload/drive/v3/files/${this.bulkFileId}?uploadType=media`,
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
            const errorText = await response.text();
            throw new Error(`Failed to save bulk file: HTTP ${response.status}: ${errorText}`);
        }

        this.lastModified = bulkData.lastModified;
        console.log(`[${this.objectType}Database] Bulk file saved (${(jsonContent.length / 1024).toFixed(1)} KB)`);
    }

    // =========================================================================
    // INDEX FILE OPERATIONS
    // =========================================================================

    /**
     * Load the index file from Google Drive
     * @returns {Promise<Object>}
     */
    async _loadIndexFile() {
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${this.databaseFileId}?alt=media`,
            { headers: { 'Authorization': `Bearer ${gapi.client.getToken().access_token}` } }
        );
        if (!response.ok) {
            throw new Error(`Failed to load index file: HTTP ${response.status}: ${await response.text()}`);
        }
        return JSON.parse(await response.text());
    }

    /**
     * Build index data from current entries.
     * Skips entries with null fileIds (safety: never writes nulls to index).
     * @returns {Object}
     */
    _buildIndexData() {
        const entries = {};
        let nullCount = 0;

        for (const [key, wrapper] of this.entries) {
            if (!wrapper.fileId) {
                nullCount++;
                continue;
            }
            entries[key] = {
                fileId: wrapper.fileId,
                created: wrapper.created,
                lastModified: wrapper.lastModified
            };
        }

        if (nullCount > 0) {
            console.warn(`[${this.objectType}Database] _buildIndexData: ${nullCount} entries have null fileIds (excluded)`);
        }

        return {
            __format: 'SupplementalDataDatabaseIndex',
            __version: this.version,
            __created: this.created || new Date().toISOString(),
            __lastModified: new Date().toISOString(),
            __objectType: this.objectType,
            __folderFileId: this.folderFileId,
            __entryCount: Object.keys(entries).length,
            entries
        };
    }

    /**
     * Save the full index file.
     * SAFETY: Refuses to save if loaded from bulk (fileIds would be null).
     * Use _safeUpdateIndex() for targeted updates when loaded from bulk.
     * @returns {Promise<void>}
     */
    async _saveIndex() {
        this._validateFileConfig();

        if (this._loadedFrom === 'bulk') {
            throw new Error(
                `${this.objectType}Database: Cannot _saveIndex() when loaded from bulk (fileIds are null). ` +
                `Use _safeUpdateIndex() for targeted updates, or loadFromDrive() first.`
            );
        }

        const indexData = this._buildIndexData();
        const jsonContent = JSON.stringify(indexData, null, 2);

        const response = await fetch(
            `https://www.googleapis.com/upload/drive/v3/files/${this.databaseFileId}?uploadType=media`,
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
            const errorText = await response.text();
            throw new Error(`Failed to save index: HTTP ${response.status}: ${errorText}`);
        }
    }

    /**
     * Safely update a single entry in the index file.
     * Loads current index from Drive, merges the change, saves back.
     * Safe to use even when loaded from bulk (doesn't overwrite other fileIds).
     * @param {string} key
     * @param {string} fileId
     * @param {string} [created]
     * @param {string} [lastModified]
     * @returns {Promise<void>}
     */
    async _safeUpdateIndex(key, fileId, created, lastModified) {
        this._validateFileConfig();

        const currentIndex = await this._loadIndexFile();
        if (!currentIndex.entries) currentIndex.entries = {};

        currentIndex.entries[key] = {
            fileId,
            created: created || new Date().toISOString(),
            lastModified: lastModified || new Date().toISOString()
        };

        currentIndex.__lastModified = new Date().toISOString();
        currentIndex.__entryCount = Object.keys(currentIndex.entries).length;

        const jsonContent = JSON.stringify(currentIndex, null, 2);

        const response = await fetch(
            `https://www.googleapis.com/upload/drive/v3/files/${this.databaseFileId}?uploadType=media`,
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
            const errorText = await response.text();
            throw new Error(`Failed to update index: HTTP ${response.status}: ${errorText}`);
        }
    }

    /**
     * Safely remove a single entry from the index file.
     * @param {string} key
     * @returns {Promise<void>}
     */
    async _safeRemoveFromIndex(key) {
        this._validateFileConfig();

        const currentIndex = await this._loadIndexFile();

        if (currentIndex.entries && currentIndex.entries[key]) {
            delete currentIndex.entries[key];
            currentIndex.__lastModified = new Date().toISOString();
            currentIndex.__entryCount = Object.keys(currentIndex.entries).length;

            const jsonContent = JSON.stringify(currentIndex, null, 2);

            const response = await fetch(
                `https://www.googleapis.com/upload/drive/v3/files/${this.databaseFileId}?uploadType=media`,
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
                const errorText = await response.text();
                throw new Error(`Failed to remove from index: HTTP ${response.status}: ${errorText}`);
            }
        }
    }

    /**
     * Batch update multiple entries in the index file.
     * Loads index once, applies all updates, saves once. Efficient for fileOut.
     * @param {Array<{key: string, fileId: string, created: string, lastModified: string}>} updates
     * @returns {Promise<void>}
     */
    async _batchUpdateIndex(updates) {
        if (updates.length === 0) return;
        this._validateFileConfig();

        const currentIndex = await this._loadIndexFile();
        if (!currentIndex.entries) currentIndex.entries = {};

        for (const { key, fileId, created, lastModified } of updates) {
            currentIndex.entries[key] = { fileId, created, lastModified };
        }

        currentIndex.__lastModified = new Date().toISOString();
        currentIndex.__entryCount = Object.keys(currentIndex.entries).length;

        const jsonContent = JSON.stringify(currentIndex, null, 2);

        const response = await fetch(
            `https://www.googleapis.com/upload/drive/v3/files/${this.databaseFileId}?uploadType=media`,
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
            const errorText = await response.text();
            throw new Error(`Failed to batch update index: HTTP ${response.status}: ${errorText}`);
        }

        console.log(`[${this.objectType}Database] Batch updated ${updates.length} index entries`);
    }

    // =========================================================================
    // INDIVIDUAL FILE OPERATIONS
    // =========================================================================

    /**
     * Load an individual object file from Google Drive
     * @param {string} fileId
     * @returns {Promise<Object>}
     */
    async _loadObjectFile(fileId) {
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            { headers: { 'Authorization': `Bearer ${gapi.client.getToken().access_token}` } }
        );
        if (!response.ok) {
            throw new Error(`Failed to load object file ${fileId}: HTTP ${response.status}: ${await response.text()}`);
        }
        return JSON.parse(await response.text());
    }

    /**
     * Deserialize an entry from stored data.
     * Uses deserializeWithTypes for class restoration.
     * @param {Object|string} data
     * @returns {SupplementalDataEntry}
     */
    _deserializeEntry(data) {
        if (typeof data === 'string') {
            return deserializeWithTypes(data);
        }
        if (data.type || data.__type) {
            return deserializeWithTypes(JSON.stringify(data));
        }
        console.warn(`[${this.objectType}Database] Entry missing type marker, returning as-is`);
        return data;
    }

    /**
     * Generate a safe filename for a Google Drive file
     * @param {string} key
     * @returns {string}
     */
    _generateFileName(key) {
        const safeName = String(key)
            .replace(/\s+/g, '_')
            .replace(/[<>:"/\\|?*]/g, '_');
        return `${safeName}.json`;
    }

    /**
     * Create a new individual file in Google Drive
     * @param {SupplementalDataEntry} entry
     * @returns {Promise<string>} File ID of the created file
     */
    async _createObjectFile(entry) {
        this._validateFileConfig();

        const key = this._normalizeKey(this._getEntryKey(entry));
        const fileName = this._generateFileName(key);

        // Create file with content in a single multipart request
        const jsonContent = serializeWithTypes(entry);
        const boundary = '---supplementaldb_boundary';

        const metadata = JSON.stringify({
            name: fileName,
            mimeType: 'application/json',
            parents: [this.folderFileId]
        });

        const multipartBody =
            `--${boundary}\r\n` +
            `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
            `${metadata}\r\n` +
            `--${boundary}\r\n` +
            `Content-Type: application/json\r\n\r\n` +
            `${jsonContent}\r\n` +
            `--${boundary}--`;

        const response = await fetch(
            `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                    'Content-Type': `multipart/related; boundary=${boundary}`
                },
                body: multipartBody
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create entry file: HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        return result.id;
    }

    /**
     * Update an existing individual file
     * @param {string} fileId
     * @param {SupplementalDataEntry} entry
     * @returns {Promise<void>}
     */
    async _updateObjectFile(fileId, entry) {
        const jsonContent = serializeWithTypes(entry);

        const response = await fetch(
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
            const errorText = await response.text();
            throw new Error(`Failed to update entry file: HTTP ${response.status}: ${errorText}`);
        }

        // Update filename to match key
        const key = this._normalizeKey(this._getEntryKey(entry));
        const fileName = this._generateFileName(key);
        const renameResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: fileName })
            }
        );
        if (!renameResponse.ok) {
            const errorText = await renameResponse.text();
            throw new Error(`Failed to rename entry file: HTTP ${renameResponse.status}: ${errorText}`);
        }
    }

    /**
     * Move a file to the deleted folder (soft delete)
     * @param {string} fileId
     * @returns {Promise<void>}
     */
    async _moveToDeleted(fileId) {
        if (this.deletedFolderFileId) {
            const deletedName = `DELETED_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}_${fileId}.json`;
            const moveResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${this.deletedFolderFileId}&removeParents=${this.folderFileId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name: deletedName })
                }
            );
            if (!moveResponse.ok) {
                const errorText = await moveResponse.text();
                throw new Error(`Failed to move file to deleted: HTTP ${moveResponse.status}: ${errorText}`);
            }
            console.log(`[${this.objectType}Database] Moved ${fileId} to deleted folder`);
        } else {
            const trashResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files/${fileId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ trashed: true })
                }
            );
            if (!trashResponse.ok) {
                const errorText = await trashResponse.text();
                throw new Error(`Failed to trash file: HTTP ${trashResponse.status}: ${errorText}`);
            }
            console.log(`[${this.objectType}Database] Trashed ${fileId}`);
        }
    }

    // =========================================================================
    // IN-MEMORY OPERATIONS (synchronous, no Drive persistence)
    // =========================================================================

    /**
     * Add an entry to the in-memory database only (no Drive operations).
     * Use for bulk building (inaugural creation) before saveBulk().
     * @param {SupplementalDataEntry} entry
     * @returns {string} Normalized key
     */
    addEntry(entry) {
        const key = this._normalizeKey(this._getEntryKey(entry));

        if (this.entries.has(key)) {
            throw new Error(`Entry with key "${key}" already exists`);
        }

        const now = new Date().toISOString();
        this.entries.set(key, {
            entry,
            fileId: null,
            created: now,
            lastModified: now
        });

        return key;
    }

    /**
     * Remove an entry from in-memory database only (no Drive operations).
     * @param {string} key
     * @returns {boolean} True if found and removed
     */
    removeEntry(key) {
        const normalized = this._normalizeKey(key);
        return this.entries.delete(normalized);
    }

    // =========================================================================
    // PERSISTED OPERATIONS (async, includes Drive persistence)
    // =========================================================================

    /**
     * Add an entry with Drive persistence.
     * Creates individual file and updates index.
     * @param {SupplementalDataEntry} entry
     * @returns {Promise<string>} Normalized key
     */
    async add(entry) {
        const key = this._normalizeKey(this._getEntryKey(entry));

        if (this.entries.has(key)) {
            throw new Error(`Entry with key "${key}" already exists`);
        }

        const now = new Date().toISOString();
        let fileId = null;

        if (this.isConfiguredForFiles()) {
            fileId = await this._createObjectFile(entry);
            await this._safeUpdateIndex(key, fileId, now, now);
        }

        this.entries.set(key, {
            entry,
            fileId,
            created: now,
            lastModified: now
        });

        console.log(`[${this.objectType}Database] Added "${key}"${fileId ? ` (fileId: ${fileId})` : ''}`);
        return key;
    }

    /**
     * Replace an entry and persist to Drive.
     * @param {string} key
     * @param {SupplementalDataEntry} newEntry
     * @returns {Promise<void>}
     */
    async update(key, newEntry) {
        const normalized = this._normalizeKey(key);
        const wrapper = this.entries.get(normalized);

        if (!wrapper) {
            throw new Error(`Entry "${normalized}" not found`);
        }

        wrapper.entry = newEntry;
        wrapper.lastModified = new Date().toISOString();

        if (wrapper.fileId) {
            await this._updateObjectFile(wrapper.fileId, newEntry);
            await this._safeUpdateIndex(normalized, wrapper.fileId, wrapper.created, wrapper.lastModified);
        }

        console.log(`[${this.objectType}Database] Updated "${normalized}"`);
    }

    /**
     * Save the current in-memory state of an entry to its Drive file.
     * Use after modifying an entry in memory (e.g., adding a match association).
     * @param {string} key
     * @returns {Promise<void>}
     */
    async saveEntry(key) {
        const normalized = this._normalizeKey(key);
        const wrapper = this.entries.get(normalized);

        if (!wrapper) {
            throw new Error(`Entry "${normalized}" not found`);
        }

        wrapper.lastModified = new Date().toISOString();

        if (wrapper.fileId) {
            await this._updateObjectFile(wrapper.fileId, wrapper.entry);
            await this._safeUpdateIndex(normalized, wrapper.fileId, wrapper.created, wrapper.lastModified);
        } else {
            console.warn(`[${this.objectType}Database] "${normalized}" has no fileId — saved to memory only. Use saveBulk() or fileOutEntries().`);
        }
    }

    /**
     * Remove an entry with Drive persistence (soft delete).
     * @param {string} key
     * @returns {Promise<boolean>} True if found and removed
     */
    async remove(key) {
        const normalized = this._normalizeKey(key);
        const wrapper = this.entries.get(normalized);

        if (!wrapper) {
            console.warn(`[${this.objectType}Database] Cannot remove "${normalized}" — not found`);
            return false;
        }

        if (wrapper.fileId && this.isConfiguredForFiles()) {
            await this._moveToDeleted(wrapper.fileId);
            await this._safeRemoveFromIndex(normalized);
        }

        this.entries.delete(normalized);
        console.log(`[${this.objectType}Database] Removed "${normalized}"`);
        return true;
    }

    // =========================================================================
    // LOOKUP OPERATIONS
    // =========================================================================

    /**
     * Get an entry by key
     * @param {string} key
     * @returns {SupplementalDataEntry|null}
     */
    get(key) {
        const normalized = this._normalizeKey(key);
        return this.entries.get(normalized)?.entry || null;
    }

    /**
     * Check if a key exists
     * @param {string} key
     * @returns {boolean}
     */
    has(key) {
        const normalized = this._normalizeKey(key);
        return this.entries.has(normalized);
    }

    /**
     * Get the full wrapper for a key (includes fileId, timestamps)
     * @param {string} key
     * @returns {Object|null} { entry, fileId, created, lastModified }
     */
    getWrapper(key) {
        const normalized = this._normalizeKey(key);
        return this.entries.get(normalized) || null;
    }

    /**
     * Get all entries as an array
     * @returns {Array<SupplementalDataEntry>}
     */
    getAllEntries() {
        return Array.from(this.entries.values()).map(w => w.entry);
    }

    /**
     * Get all normalized keys
     * @returns {Array<string>}
     */
    getAllKeys() {
        return Array.from(this.entries.keys());
    }

    /**
     * Get entry count
     * @returns {number}
     */
    get size() {
        return this.entries.size;
    }

    // =========================================================================
    // QUERY OPERATIONS
    // =========================================================================

    /**
     * Get entries filtered by effective classification
     * @param {string} classification
     * @returns {Array<{key: string, entry: SupplementalDataEntry}>}
     */
    getEntriesByClassification(classification) {
        const results = [];
        for (const [key, wrapper] of this.entries) {
            if (wrapper.entry.getEffectiveClassification() === classification) {
                results.push({ key, entry: wrapper.entry });
            }
        }
        return results;
    }

    /**
     * Get all entries that have match associations
     * @returns {Array<{key: string, entry: SupplementalDataEntry}>}
     */
    getMatchedEntries() {
        const results = [];
        for (const [key, wrapper] of this.entries) {
            if (wrapper.entry.hasMatchAssociations()) {
                results.push({ key, entry: wrapper.entry });
            }
        }
        return results;
    }

    /**
     * Get all entries without match associations
     * @returns {Array<{key: string, entry: SupplementalDataEntry}>}
     */
    getUnmatchedEntries() {
        const results = [];
        for (const [key, wrapper] of this.entries) {
            if (!wrapper.entry.hasMatchAssociations()) {
                results.push({ key, entry: wrapper.entry });
            }
        }
        return results;
    }

    /**
     * Get all entries matched to a specific entity group
     * @param {number} groupIndex
     * @returns {Array<{key: string, entry: SupplementalDataEntry, associations: Array}>}
     */
    getEntriesForGroup(groupIndex) {
        const results = [];
        for (const [key, wrapper] of this.entries) {
            const associations = wrapper.entry.matchAssociations.filter(a => a.groupIndex === groupIndex);
            if (associations.length > 0) {
                results.push({ key, entry: wrapper.entry, associations });
            }
        }
        return results;
    }

    // =========================================================================
    // BATCH FILE-OUT
    // =========================================================================

    /**
     * Create individual Google Drive files for all entries that don't have one yet.
     * Used after inaugural dataset creation or bulk import.
     * Processes in batches to respect Google Drive rate limits.
     *
     * @param {Object} [options]
     * @param {number} [options.parallelism=3] - Concurrent file creations per batch
     * @param {number} [options.indexSaveInterval=50] - Save index every N files
     * @param {number} [options.maxEntries=Infinity] - Max entries to process (for resume/partial)
     * @returns {Promise<{created: number, failed: number, total: number}>}
     */
    async fileOutEntries(options = {}) {
        const {
            parallelism = 3,
            indexSaveInterval = 50,
            maxEntries = Infinity
        } = options;

        this._validateFileConfig();

        // Find entries without fileIds
        const needsFileOut = [];
        for (const [key, wrapper] of this.entries) {
            if (!wrapper.fileId) {
                needsFileOut.push({ key, wrapper });
            }
        }

        if (needsFileOut.length === 0) {
            console.log(`[${this.objectType}Database] All entries already have files`);
            return { created: 0, failed: 0, total: this.entries.size };
        }

        const toProcess = needsFileOut.slice(0, maxEntries);
        console.log(`[${this.objectType}Database] Filing out ${toProcess.length} entries (parallelism: ${parallelism})...`);

        let created = 0;
        let failed = 0;
        let pendingIndexUpdates = [];

        for (let i = 0; i < toProcess.length; i += parallelism) {
            const batch = toProcess.slice(i, i + parallelism);

            const results = await Promise.allSettled(
                batch.map(async ({ key, wrapper }) => {
                    const fileId = await this._createObjectFile(wrapper.entry);
                    return { key, wrapper, fileId };
                })
            );

            for (const result of results) {
                if (result.status === 'fulfilled') {
                    const { key, wrapper, fileId } = result.value;
                    wrapper.fileId = fileId;
                    pendingIndexUpdates.push({
                        key,
                        fileId,
                        created: wrapper.created,
                        lastModified: wrapper.lastModified
                    });
                    created++;
                } else {
                    console.error(`[${this.objectType}Database] File-out failed:`, result.reason);
                    failed++;
                }
            }

            // Periodically save index (batch update: one load + save per interval)
            if (pendingIndexUpdates.length >= indexSaveInterval || i + parallelism >= toProcess.length) {
                if (pendingIndexUpdates.length > 0) {
                    await this._batchUpdateIndex(pendingIndexUpdates);
                    pendingIndexUpdates = [];
                }
            }

            // Progress
            const processed = created + failed;
            if (processed % 50 === 0 || processed === toProcess.length) {
                console.log(`[${this.objectType}Database] File-out progress: ${processed}/${toProcess.length} (${created} created, ${failed} failed)`);
            }
        }

        // After successful file-out, all entries have fileIds
        if (failed === 0) {
            this._loadedFrom = 'files';
        }

        console.log(`[${this.objectType}Database] File-out complete: ${created} created, ${failed} failed`);
        return { created, failed, total: this.entries.size };
    }

    // =========================================================================
    // STATISTICS
    // =========================================================================

    /**
     * Get database statistics
     * @returns {Object}
     */
    getStats() {
        let matched = 0;
        let unmatched = 0;
        let withExclusions = 0;
        const classifications = {};

        for (const [, wrapper] of this.entries) {
            const entry = wrapper.entry;
            const cls = entry.getEffectiveClassification
                ? entry.getEffectiveClassification()
                : (entry.classification || 'unknown');

            classifications[cls] = (classifications[cls] || 0) + 1;

            if (entry.hasMatchAssociations ? entry.hasMatchAssociations() : (entry.matchAssociations?.length > 0)) {
                matched++;
            } else {
                unmatched++;
            }

            if (entry.exclusions?.length > 0) {
                withExclusions++;
            }
        }

        return {
            objectType: this.objectType,
            entryCount: this.entries.size,
            matched,
            unmatched,
            withExclusions,
            classifications,
            isLoaded: this._isLoaded,
            loadedFrom: this._loadedFrom,
            version: this.version,
            created: this.created,
            lastModified: this.lastModified
        };
    }

    /**
     * Print database statistics to console
     */
    printStats() {
        const stats = this.getStats();
        console.log(`\n=== ${this.objectType} Database Stats ===`);
        console.log(`Entries: ${stats.entryCount}`);
        console.log(`Matched: ${stats.matched}`);
        console.log(`Unmatched: ${stats.unmatched}`);
        console.log(`With exclusions: ${stats.withExclusions}`);
        console.log(`Classifications:`);
        for (const [cls, count] of Object.entries(stats.classifications)) {
            console.log(`  ${cls}: ${count}`);
        }
        console.log(`Loaded: ${stats.isLoaded} (from: ${stats.loadedFrom || 'n/a'})`);
        console.log(`Version: ${stats.version}`);
        console.log('================================\n');
    }

    // =========================================================================
    // ITERATION
    // =========================================================================

    /**
     * Iterate over all entries (for...of support)
     * Yields [key, entry] pairs
     */
    *[Symbol.iterator]() {
        for (const [key, wrapper] of this.entries) {
            yield [key, wrapper.entry];
        }
    }
}


// =============================================================================
// EXPORTS
// =============================================================================

if (typeof window !== 'undefined') {
    window.SupplementalDataEntry = SupplementalDataEntry;
    window.SupplementalDataDatabase = SupplementalDataDatabase;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SupplementalDataEntry, SupplementalDataDatabase };
}

console.log('SupplementalDataDatabase base class loaded.');
