/**
 * =============================================================================
 * ALIASED TERM DATABASE - Base Class
 * =============================================================================
 *
 * A general-purpose database system for managing collections of Aliased objects
 * (objects with a primaryAlias AttributedTerm and alternatives). Each object is
 * stored as an individual Google Drive file, enabling:
 *
 * - Asynchronous updates from different data sources
 * - Manual editing and maintenance
 * - Stable file IDs that persist across primary alias changes
 * - Fine-grained version control per object
 *
 * ARCHITECTURE:
 * - Index File: Contains { primaryAlias → fileId } mappings + metadata
 * - Object Folder: Contains individual JSON files per Aliased object
 * - Uses serializeWithTypes() / deserializeWithTypes() for class preservation
 *
 * USAGE:
 * Extend this class for specific Aliased types (e.g., StreetNameDatabase)
 *
 * Created: January 26, 2026
 * Reference: reference_aliasedTermDatabasePlan.md
 * =============================================================================
 */

/**
 * AliasedTermDatabase - Base class for Aliased object databases
 *
 * This is designed to be extended by specific implementations like StreetNameDatabase.
 * The class handles all common operations while subclasses define objectType and
 * can override methods as needed.
 */
class AliasedTermDatabase {
    /**
     * Create a new AliasedTermDatabase
     * @param {Object} config - Configuration object
     * @param {string} config.objectType - The type of Aliased objects (e.g., 'StreetName')
     * @param {string} config.databaseFileId - Google Drive file ID for the index file
     * @param {string} config.folderFileId - Google Drive folder ID for individual object files
     * @param {string} [config.deletedFolderFileId] - Google Drive folder ID for deleted files (optional)
     */
    constructor(config) {
        if (!config || !config.objectType) {
            throw new Error('AliasedTermDatabase requires objectType in config');
        }

        // Configuration
        this.objectType = config.objectType;
        this.databaseFileId = config.databaseFileId || null;
        this.folderFileId = config.folderFileId || null;
        this.deletedFolderFileId = config.deletedFolderFileId || null;

        // Metadata
        this.version = '1.0';
        this.created = null;
        this.lastModified = null;

        // Data storage
        // Map: primaryKey (normalized) → { object: Aliased, fileId: string, created: string, lastModified: string }
        this.entries = new Map();

        // Computed cache: variation → primaryKey (built on load, not stored)
        this._variationCache = new Map();

        // Loading state
        this._isLoaded = false;
    }

    // =========================================================================
    // CONFIGURATION VALIDATION
    // =========================================================================

    /**
     * Check if the database is configured for Google Drive operations
     * @returns {boolean}
     */
    isConfigured() {
        return !!(this.databaseFileId && this.folderFileId);
    }

    /**
     * Validate configuration before Drive operations
     * @throws {Error} If not configured
     */
    _validateConfig() {
        if (!this.isConfigured()) {
            throw new Error(`AliasedTermDatabase (${this.objectType}): databaseFileId and folderFileId must be set for Google Drive operations`);
        }
    }

    // =========================================================================
    // KEY NORMALIZATION
    // =========================================================================

    /**
     * Normalize a term to use as a key
     * Override in subclasses for type-specific normalization
     * @param {string} term - Term to normalize
     * @returns {string} Normalized key
     */
    _normalizeKey(term) {
        if (!term) return '';
        return String(term).trim().toUpperCase();
    }

    // =========================================================================
    // VARIATION CACHE
    // =========================================================================

    /**
     * Build the variation cache from all entries
     * Maps all variations (primary + alternatives) to their primary key
     */
    _buildVariationCache() {
        this._variationCache.clear();

        for (const [primaryKey, entry] of this.entries) {
            const obj = entry.object;

            // Add primary alias
            if (obj.primaryAlias?.term) {
                const normalized = this._normalizeKey(obj.primaryAlias.term);
                this._variationCache.set(normalized, primaryKey);
            }

            // Add alternatives (homonyms, synonyms, candidates)
            if (obj.alternatives) {
                const allAlternatives = [
                    ...(obj.alternatives.homonyms || []),
                    ...(obj.alternatives.synonyms || []),
                    ...(obj.alternatives.candidates || [])
                ];

                for (const alt of allAlternatives) {
                    if (alt?.term) {
                        const normalized = this._normalizeKey(alt.term);
                        // Don't overwrite if already mapped (keeps first mapping)
                        if (!this._variationCache.has(normalized)) {
                            this._variationCache.set(normalized, primaryKey);
                        }
                    }
                }
            }
        }

        console.log(`[${this.objectType}Database] Built variation cache: ${this._variationCache.size} variations → ${this.entries.size} primaries`);
    }

    // =========================================================================
    // LOADING
    // =========================================================================

    /**
     * Load the database from Google Drive (eager loading with parallel batches)
     * @param {number} batchSize - Number of objects to load in parallel (default: 15)
     * @returns {Promise<void>}
     */
    async loadFromDrive(batchSize = 15) {
        this._validateConfig();

        const startTime = Date.now();
        console.log(`[${this.objectType}Database] Loading from Google Drive...`);
        console.log(`[${this.objectType}Database] Index file: ${this.databaseFileId}`);
        console.log(`[${this.objectType}Database] Object folder: ${this.folderFileId}`);

        // Step 1: Load index file
        const indexData = await this._loadIndexFile();

        // Step 2: Prepare entries for parallel loading
        const entries = Object.entries(indexData.entries || {});
        const entryCount = entries.length;
        console.log(`[${this.objectType}Database] Loading ${entryCount} objects in batches of ${batchSize}...`);

        let loaded = 0;
        let failed = 0;

        // Step 3: Load in parallel batches
        for (let i = 0; i < entries.length; i += batchSize) {
            const batch = entries.slice(i, i + batchSize);
            const batchNum = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(entries.length / batchSize);

            // Load batch in parallel
            const results = await Promise.allSettled(
                batch.map(async ([primaryKey, entryMeta]) => {
                    const objectData = await this._loadObjectFile(entryMeta.fileId);
                    const object = this._deserializeObject(objectData);
                    return { primaryKey, object, entryMeta };
                })
            );

            // Process results
            for (const result of results) {
                if (result.status === 'fulfilled') {
                    const { primaryKey, object, entryMeta } = result.value;
                    this.entries.set(primaryKey, {
                        object: object,
                        fileId: entryMeta.fileId,
                        created: entryMeta.created,
                        lastModified: entryMeta.lastModified
                    });
                    loaded++;
                } else {
                    console.error(`[${this.objectType}Database] Failed to load object:`, result.reason);
                    failed++;
                }
            }

            // Progress update for large databases
            if (entryCount > 50) {
                console.log(`[${this.objectType}Database] Batch ${batchNum}/${totalBatches} complete (${loaded} loaded)`);
            }
        }

        // Step 4: Build variation cache
        this._buildVariationCache();

        // Update metadata
        this.version = indexData.__version || '1.0';
        this.created = indexData.__created;
        this.lastModified = indexData.__lastModified;
        this._isLoaded = true;

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[${this.objectType}Database] Loaded ${loaded} objects (${failed} failed) in ${elapsed}s`);
    }

    /**
     * Load the index file from Google Drive
     * @returns {Promise<Object>} Index data
     */
    async _loadIndexFile() {
        const response = await gapi.client.drive.files.get({
            fileId: this.databaseFileId,
            alt: 'media'
        });

        return JSON.parse(response.body);
    }

    /**
     * Load an individual object file from Google Drive
     * @param {string} fileId - Google Drive file ID
     * @returns {Promise<Object>} Object data (raw JSON)
     */
    async _loadObjectFile(fileId) {
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });

        return JSON.parse(response.body);
    }

    /**
     * Deserialize an object from stored data
     * Uses deserializeWithTypes for automatic class restoration
     * @param {Object} data - Stored object data
     * @returns {Aliased} Reconstructed Aliased instance
     */
    _deserializeObject(data) {
        // If data is a string, parse it first
        if (typeof data === 'string') {
            return deserializeWithTypes(data);
        }

        // If data has __type marker, it was serialized with serializeWithTypes
        // Re-serialize and deserialize to restore class instances
        if (data.type || data.__type) {
            const jsonString = JSON.stringify(data);
            return deserializeWithTypes(jsonString);
        }

        // Fallback: return as-is (shouldn't happen with proper serialization)
        console.warn(`[${this.objectType}Database] Object missing type marker, returning as-is`);
        return data;
    }

    // =========================================================================
    // LOOKUP OPERATIONS
    // =========================================================================

    /**
     * Look up an object by term (with variation matching and similarity fallback)
     * @param {string} term - Term to look up
     * @param {number} [threshold=0.80] - Minimum similarity threshold for fallback
     * @returns {Aliased|null} Found object or null
     */
    lookup(term, threshold = 0.80) {
        const normalized = this._normalizeKey(term);

        // Fast path: exact match in variation cache
        if (this._variationCache.has(normalized)) {
            const primaryKey = this._variationCache.get(normalized);
            return this.entries.get(primaryKey)?.object || null;
        }

        // Slow path: similarity matching using compareTo()
        let bestMatch = null;
        let bestScore = threshold;

        for (const [primaryKey, entry] of this.entries) {
            const obj = entry.object;

            // Use the object's compareTo method if available
            if (typeof obj.compareTo === 'function') {
                try {
                    const scores = obj.compareTo(term);

                    // Handle different return types (number or object with scores)
                    let maxScore = 0;
                    if (typeof scores === 'number') {
                        maxScore = scores;
                    } else if (typeof scores === 'object') {
                        // StreetName.compareTo returns { primary, homonym, synonym, candidate }
                        maxScore = Math.max(
                            scores.primary || 0,
                            scores.homonym > 0 ? scores.homonym : 0,
                            scores.candidate > 0 ? scores.candidate : 0
                            // Note: synonyms excluded (unverified)
                        );
                    }

                    if (maxScore > bestScore) {
                        bestScore = maxScore;
                        bestMatch = obj;
                    }
                } catch (e) {
                    // Skip comparison errors
                }
            }
        }

        return bestMatch;
    }

    /**
     * Check if a term exists in the database (exact match only)
     * @param {string} term - Term to check
     * @returns {boolean}
     */
    has(term) {
        const normalized = this._normalizeKey(term);
        return this._variationCache.has(normalized);
    }

    /**
     * Get an object by its exact primary key
     * @param {string} primaryKey - Primary key (will be normalized)
     * @returns {Aliased|null}
     */
    get(primaryKey) {
        const normalized = this._normalizeKey(primaryKey);
        return this.entries.get(normalized)?.object || null;
    }

    /**
     * Get the file ID for a primary key
     * @param {string} primaryKey - Primary key (will be normalized)
     * @returns {string|null}
     */
    getFileId(primaryKey) {
        const normalized = this._normalizeKey(primaryKey);
        return this.entries.get(normalized)?.fileId || null;
    }

    /**
     * Get all primary keys
     * @returns {Array<string>}
     */
    getAllPrimaryKeys() {
        return Array.from(this.entries.keys());
    }

    /**
     * Get all objects
     * @returns {Array<Aliased>}
     */
    getAllObjects() {
        return Array.from(this.entries.values()).map(entry => entry.object);
    }

    /**
     * Get the number of entries
     * @returns {number}
     */
    get size() {
        return this.entries.size;
    }

    // =========================================================================
    // MODIFICATION OPERATIONS
    // =========================================================================

    /**
     * Add a new object to the database
     * @param {Aliased} object - Object to add
     * @returns {Promise<string>} File ID of the created file
     */
    async add(object) {
        this._validateConfig();

        if (!object || !object.primaryAlias?.term) {
            throw new Error('Object must have a primaryAlias with a term');
        }

        const primaryKey = this._normalizeKey(object.primaryAlias.term);

        // Check if already exists
        if (this.entries.has(primaryKey)) {
            throw new Error(`Object with primary key "${primaryKey}" already exists`);
        }

        // Create the object file
        const fileId = await this._createObjectFile(object);
        const now = new Date().toISOString();

        // Add to entries
        this.entries.set(primaryKey, {
            object: object,
            fileId: fileId,
            created: now,
            lastModified: now
        });

        // Rebuild variation cache
        this._buildVariationCache();

        // Save the index
        await this._saveIndex();

        console.log(`[${this.objectType}Database] Added "${primaryKey}" (fileId: ${fileId})`);
        return fileId;
    }

    /**
     * Remove an object from the database
     * @param {string} primaryKey - Primary key to remove
     * @returns {Promise<boolean>} True if removed, false if not found
     */
    async remove(primaryKey) {
        this._validateConfig();

        const normalized = this._normalizeKey(primaryKey);
        const entry = this.entries.get(normalized);

        if (!entry) {
            console.warn(`[${this.objectType}Database] Cannot remove "${normalized}" - not found`);
            return false;
        }

        // Move file to deleted folder (if configured) or delete
        await this._moveToDeleted(entry.fileId);

        // Remove from entries
        this.entries.delete(normalized);

        // Rebuild variation cache
        this._buildVariationCache();

        // Save the index
        await this._saveIndex();

        console.log(`[${this.objectType}Database] Removed "${normalized}"`);
        return true;
    }

    /**
     * Save changes to a specific object
     * @param {string} primaryKey - Primary key of object to save
     * @returns {Promise<void>}
     */
    async saveObject(primaryKey) {
        this._validateConfig();

        const normalized = this._normalizeKey(primaryKey);
        const entry = this.entries.get(normalized);

        if (!entry) {
            throw new Error(`Cannot save "${normalized}" - not found`);
        }

        // Update the object file
        await this._updateObjectFile(entry.fileId, entry.object);

        // Update metadata
        entry.lastModified = new Date().toISOString();

        // Save the index
        await this._saveIndex();

        console.log(`[${this.objectType}Database] Saved "${normalized}"`);
    }

    /**
     * Change the primary alias of an object
     * @param {string} oldPrimary - Current primary key
     * @param {string} newPrimary - New primary key
     * @param {string} [moveOldTo='homonyms'] - Where to move old primary ('homonyms', 'synonyms', 'candidates', 'discard')
     * @returns {Promise<string>} File ID
     */
    async changePrimaryAlias(oldPrimary, newPrimary, moveOldTo = 'homonyms') {
        this._validateConfig();

        const normalizedOld = this._normalizeKey(oldPrimary);
        const normalizedNew = this._normalizeKey(newPrimary);

        // Get the entry
        const entry = this.entries.get(normalizedOld);
        if (!entry) {
            throw new Error(`Primary alias not found: ${oldPrimary}`);
        }

        // Check new primary doesn't already exist
        if (this.entries.has(normalizedNew)) {
            throw new Error(`Primary alias already exists: ${newPrimary}`);
        }

        const obj = entry.object;
        const oldPrimaryAlias = obj.primaryAlias;

        // Find and remove the new primary from its current category in alternatives
        let newPrimaryTerm = null;
        if (obj.alternatives) {
            const categories = ['homonyms', 'synonyms', 'candidates'];
            for (const cat of categories) {
                const aliases = obj.alternatives[cat] || [];
                const idx = aliases.findIndex(a =>
                    a.term?.toUpperCase().trim() === normalizedNew
                );
                if (idx !== -1) {
                    // Found it - remove from this category and keep the AttributedTerm
                    newPrimaryTerm = aliases.splice(idx, 1)[0];
                    break;
                }
            }
        }

        // Use the found AttributedTerm as the new primary (preserves source history)
        // Or create a fresh one if not found in alternatives
        if (newPrimaryTerm) {
            obj.primaryAlias = newPrimaryTerm;
        } else {
            obj.primaryAlias = new AttributedTerm(
                newPrimary,
                'MANUAL_EDIT',
                -1,
                'primaryAliasChange',
                oldPrimaryAlias.fieldName
            );
        }

        // Move old primary to alternatives (if not discarding)
        if (moveOldTo && moveOldTo !== 'discard') {
            if (obj.alternatives && typeof obj.alternatives.add === 'function') {
                obj.alternatives.add(oldPrimaryAlias, moveOldTo);
            }
        }

        // Update the index (remove old key, add new key)
        this.entries.delete(normalizedOld);
        this.entries.set(normalizedNew, entry);

        // Rebuild variation cache
        this._buildVariationCache();

        // Save the object file (same fileId)
        await this._updateObjectFile(entry.fileId, obj);

        // Update metadata
        entry.lastModified = new Date().toISOString();

        // Save the index
        await this._saveIndex();

        console.log(`[${this.objectType}Database] Changed primary "${normalizedOld}" → "${normalizedNew}"`);
        return entry.fileId;
    }

    // =========================================================================
    // SAVE OPERATIONS
    // =========================================================================

    /**
     * Save the entire database (index + all objects)
     * @returns {Promise<void>}
     */
    async save() {
        this._validateConfig();

        console.log(`[${this.objectType}Database] Saving entire database...`);

        // Save all objects
        for (const [primaryKey, entry] of this.entries) {
            await this._updateObjectFile(entry.fileId, entry.object);
            entry.lastModified = new Date().toISOString();
        }

        // Save index
        await this._saveIndex();

        console.log(`[${this.objectType}Database] Save complete`);
    }

    /**
     * Save the index file
     * @returns {Promise<void>}
     */
    async _saveIndex() {
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
     * Build the index data object for saving
     * @returns {Object}
     */
    _buildIndexData() {
        const entries = {};

        for (const [primaryKey, entry] of this.entries) {
            entries[primaryKey] = {
                fileId: entry.fileId,
                created: entry.created,
                lastModified: entry.lastModified
            };
        }

        return {
            __format: 'AliasedTermDatabaseIndex',
            __version: this.version,
            __created: this.created || new Date().toISOString(),
            __lastModified: new Date().toISOString(),
            __objectType: this.objectType,
            __folderFileId: this.folderFileId,
            __objectCount: this.entries.size,
            entries: entries
        };
    }

    // =========================================================================
    // FILE OPERATIONS
    // =========================================================================

    /**
     * Generate a filename for an object
     * @param {string} primaryKey - Primary key
     * @returns {string} Filename
     */
    _generateFileName(primaryKey) {
        // Replace spaces with underscores, encode special characters
        const safeName = primaryKey
            .replace(/\s+/g, '_')
            .replace(/[<>:"/\\|?*]/g, '_');
        return `${safeName}.json`;
    }

    /**
     * Create a new object file in Google Drive
     * @param {Aliased} object - Object to save
     * @returns {Promise<string>} File ID of created file
     */
    async _createObjectFile(object) {
        const fileName = this._generateFileName(this._normalizeKey(object.primaryAlias.term));

        // Create the file metadata
        const createResponse = await gapi.client.drive.files.create({
            resource: {
                name: fileName,
                mimeType: 'application/json',
                parents: [this.folderFileId]
            },
            fields: 'id'
        });

        const fileId = createResponse.result.id;

        // Upload the content
        const jsonContent = serializeWithTypes(object);

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
            throw new Error(`Failed to create object file: HTTP ${response.status}: ${errorText}`);
        }

        return fileId;
    }

    /**
     * Update an existing object file
     * @param {string} fileId - File ID to update
     * @param {Aliased} object - Updated object
     * @returns {Promise<void>}
     */
    async _updateObjectFile(fileId, object) {
        const jsonContent = serializeWithTypes(object);

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
            throw new Error(`Failed to update object file: HTTP ${response.status}: ${errorText}`);
        }

        // Update the filename to match current primary (in case it changed)
        const fileName = this._generateFileName(this._normalizeKey(object.primaryAlias.term));
        await gapi.client.drive.files.update({
            fileId: fileId,
            resource: { name: fileName }
        });
    }

    /**
     * Move a file to the deleted folder (or permanently delete if no folder configured)
     * @param {string} fileId - File ID to delete/move
     * @returns {Promise<void>}
     */
    async _moveToDeleted(fileId) {
        if (this.deletedFolderFileId) {
            // Move to deleted folder
            await gapi.client.drive.files.update({
                fileId: fileId,
                addParents: this.deletedFolderFileId,
                removeParents: this.folderFileId,
                resource: {
                    name: `DELETED_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}_${fileId}.json`
                }
            });
            console.log(`[${this.objectType}Database] Moved ${fileId} to deleted folder`);
        } else {
            // Permanently delete (move to trash)
            await gapi.client.drive.files.update({
                fileId: fileId,
                resource: { trashed: true }
            });
            console.log(`[${this.objectType}Database] Trashed ${fileId}`);
        }
    }

    // =========================================================================
    // UTILITY METHODS
    // =========================================================================

    /**
     * Get database statistics
     * @returns {Object}
     */
    getStats() {
        let totalHomonyms = 0;
        let totalSynonyms = 0;
        let totalCandidates = 0;

        for (const entry of this.entries.values()) {
            const obj = entry.object;
            if (obj.alternatives) {
                totalHomonyms += obj.alternatives.homonyms?.length || 0;
                totalSynonyms += obj.alternatives.synonyms?.length || 0;
                totalCandidates += obj.alternatives.candidates?.length || 0;
            }
        }

        return {
            objectType: this.objectType,
            objectCount: this.entries.size,
            variationCount: this._variationCache.size,
            totalHomonyms: totalHomonyms,
            totalSynonyms: totalSynonyms,
            totalCandidates: totalCandidates,
            isLoaded: this._isLoaded,
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
        console.log(`Objects: ${stats.objectCount}`);
        console.log(`Variations: ${stats.variationCount}`);
        console.log(`Homonyms: ${stats.totalHomonyms}`);
        console.log(`Synonyms: ${stats.totalSynonyms}`);
        console.log(`Candidates: ${stats.totalCandidates}`);
        console.log(`Version: ${stats.version}`);
        console.log(`Created: ${stats.created}`);
        console.log(`Last Modified: ${stats.lastModified}`);
        console.log(`Is Loaded: ${stats.isLoaded}`);
        console.log('================================\n');
    }

    /**
     * Iterate over all entries (for...of support)
     */
    *[Symbol.iterator]() {
        for (const [key, entry] of this.entries) {
            yield [key, entry.object];
        }
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

// Browser environment
if (typeof window !== 'undefined') {
    window.AliasedTermDatabase = AliasedTermDatabase;
}

// Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AliasedTermDatabase };
}

console.log('AliasedTermDatabase base class loaded.');
