// dataSourceManager.js - Data Source Management Abstraction Layer for BIRAVA2025
//
// ARCHITECTURAL PURPOSE: Provides unified interface for managing and loading data from
// different sources (VisionAppraisal, Bloomerang, future sources) while abstracting away
// the specific loading patterns and file structures of each source.
//
// DESIGN PRINCIPLES:
// - Abstract different loading patterns (fixed file IDs vs dynamic config)
// - Provide unified error handling and status reporting
// - Enable easy addition of new data sources
// - Manage data caching and refresh logic
// - Standardize data structure regardless of source complexity

// =============================================================================
// DATA SOURCE REGISTRY
// =============================================================================

/**
 * Registry of all supported data sources with their configurations
 * This is the central place to add new data sources
 */
const DATA_SOURCE_REGISTRY = {
    'visionappraisal': {
        name: 'VisionAppraisal',
        displayName: 'VisionAppraisal Property Data',
        loadingType: 'fixed',
        fileId: '19cgccMYNBboL07CmMP-5hNNGwEUBXgCI',
        fileName: 'VisionAppraisal_ParsedEntities.json',
        entityTypes: ['Individual', 'AggregateHousehold', 'Business', 'LegalConstruct'],
        dataStructure: 'array', // Single array of entities
        supportsDeserialization: true,
        color: '#dc3545',
        icon: '🏠'
    },

    'bloomerang': {
        name: 'Bloomerang',
        displayName: 'Bloomerang Contact Database',
        loadingType: 'dynamic',
        configRequired: true,
        entityTypes: ['Individual', 'AggregateHousehold', 'NonHuman'],
        dataStructure: 'collections', // Multiple collections
        supportsDeserialization: false,
        color: '#007bff',
        icon: '👥'
    }

    // Future data sources can be added here following the same pattern
    // Example:
    // 'mailchimp': {
    //     name: 'MailChimp',
    //     displayName: 'MailChimp Subscriber Data',
    //     loadingType: 'api',
    //     apiEndpoint: 'https://api.mailchimp.com/3.0/',
    //     entityTypes: ['Individual'],
    //     dataStructure: 'api',
    //     supportsDeserialization: false,
    //     color: '#ffe01b',
    //     icon: '📧'
    // }
};

// =============================================================================
// DATA SOURCE MANAGER CLASS
// =============================================================================

/**
 * Main data source management class
 * Handles loading, caching, and managing data from multiple sources
 */
class DataSourceManager {
    constructor() {
        this.loadedSources = new Map();
        this.loadingPromises = new Map(); // Prevent duplicate loading
        this.statusCallbacks = new Set();
    }

    /**
     * Register a status callback for loading updates
     * @param {Function} callback - Function to call with status updates
     */
    onStatusUpdate(callback) {
        this.statusCallbacks.add(callback);
    }

    /**
     * Remove a status callback
     * @param {Function} callback - Callback to remove
     */
    offStatusUpdate(callback) {
        this.statusCallbacks.delete(callback);
    }

    /**
     * Send status update to all registered callbacks
     * @param {string} sourceKey - Data source key
     * @param {string} message - Status message
     * @param {string} type - Status type ('loading', 'success', 'error', 'warning')
     * @param {Object} details - Additional details
     */
    _emitStatus(sourceKey, message, type, details = {}) {
        const status = {
            source: sourceKey,
            message,
            type,
            timestamp: new Date().toISOString(),
            ...details
        };

        this.statusCallbacks.forEach(callback => {
            try {
                callback(status);
            } catch (error) {
                console.warn('Status callback error:', error);
            }
        });
    }

    /**
     * Get information about all available data sources
     * @returns {Object} Registry of data sources with their configurations
     */
    getAvailableDataSources() {
        return { ...DATA_SOURCE_REGISTRY };
    }

    /**
     * Get information about a specific data source
     * @param {string} sourceKey - Data source key
     * @returns {Object|null} Data source configuration or null if not found
     */
    getDataSourceInfo(sourceKey) {
        return DATA_SOURCE_REGISTRY[sourceKey] || null;
    }

    /**
     * Check if a data source is currently loaded
     * @param {string} sourceKey - Data source key
     * @returns {boolean} True if loaded
     */
    isSourceLoaded(sourceKey) {
        const sourceData = this.loadedSources.get(sourceKey);
        return sourceData && sourceData.loaded && sourceData.data;
    }

    /**
     * Get loaded data for a source
     * @param {string} sourceKey - Data source key
     * @returns {Object|null} Loaded data or null if not available
     */
    getSourceData(sourceKey) {
        const sourceData = this.loadedSources.get(sourceKey);
        return sourceData && sourceData.loaded ? sourceData.data : null;
    }

    /**
     * Get metadata for a loaded source
     * @param {string} sourceKey - Data source key
     * @returns {Object|null} Metadata or null if not available
     */
    getSourceMetadata(sourceKey) {
        const sourceData = this.loadedSources.get(sourceKey);
        return sourceData && sourceData.loaded ? sourceData.metadata : null;
    }

    /**
     * Load a specific data source
     * @param {string} sourceKey - Data source key
     * @param {Object} options - Loading options
     * @returns {Promise<Object>} Promise resolving to loaded data
     */
    async loadDataSource(sourceKey, options = {}) {
        // Check if already loading
        if (this.loadingPromises.has(sourceKey)) {
            console.log(`⏳ ${sourceKey} already loading, waiting for existing operation...`);
            return this.loadingPromises.get(sourceKey);
        }

        // Check if already loaded and not forcing refresh
        if (this.isSourceLoaded(sourceKey) && !options.forceRefresh) {
            console.log(`✅ ${sourceKey} already loaded`);
            return this.getSourceData(sourceKey);
        }

        const sourceConfig = this.getDataSourceInfo(sourceKey);
        if (!sourceConfig) {
            throw new Error(`Unknown data source: ${sourceKey}`);
        }

        // Create loading promise
        const loadingPromise = this._performDataSourceLoad(sourceKey, sourceConfig, options);
        this.loadingPromises.set(sourceKey, loadingPromise);

        try {
            const result = await loadingPromise;
            return result;
        } finally {
            // Clean up loading promise
            this.loadingPromises.delete(sourceKey);
        }
    }

    /**
     * Load multiple data sources
     * @param {Array<string>} sourceKeys - Array of data source keys
     * @param {Object} options - Loading options
     * @returns {Promise<Object>} Promise resolving to map of loaded data
     */
    async loadMultipleDataSources(sourceKeys, options = {}) {
        console.log(`📄 Loading multiple data sources:`, sourceKeys);

        const loadingPromises = sourceKeys.map(async sourceKey => {
            try {
                const data = await this.loadDataSource(sourceKey, options);
                return { sourceKey, data, error: null };
            } catch (error) {
                console.warn(`Failed to load ${sourceKey}:`, error);
                return { sourceKey, data: null, error };
            }
        });

        const results = await Promise.all(loadingPromises);

        // Build result map
        const resultMap = {};
        let successCount = 0;
        let errorCount = 0;

        results.forEach(result => {
            resultMap[result.sourceKey] = {
                data: result.data,
                error: result.error,
                success: result.error === null
            };

            if (result.error === null) {
                successCount++;
            } else {
                errorCount++;
            }
        });

        console.log(`📊 Multiple data source loading complete: ${successCount} successful, ${errorCount} failed`);

        return {
            results: resultMap,
            successCount,
            errorCount,
            totalCount: sourceKeys.length
        };
    }

    /**
     * Load all available data sources
     * @param {Object} options - Loading options
     * @returns {Promise<Object>} Promise resolving to map of loaded data
     */
    async loadAllDataSources(options = {}) {
        const sourceKeys = Object.keys(DATA_SOURCE_REGISTRY);
        return this.loadMultipleDataSources(sourceKeys, options);
    }

    /**
     * Perform the actual data source loading
     * @private
     * @param {string} sourceKey - Data source key
     * @param {Object} sourceConfig - Data source configuration
     * @param {Object} options - Loading options
     * @returns {Promise<Object>} Loaded data
     */
    async _performDataSourceLoad(sourceKey, sourceConfig, options) {
        this._emitStatus(sourceKey, `Loading ${sourceConfig.displayName}...`, 'loading');

        try {
            let loadedData;
            let metadata = {};

            switch (sourceConfig.loadingType) {
                case 'fixed':
                    loadedData = await this._loadFixedFileSource(sourceKey, sourceConfig, options);
                    break;
                case 'dynamic':
                    loadedData = await this._loadDynamicConfigSource(sourceKey, sourceConfig, options);
                    break;
                case 'api':
                    loadedData = await this._loadAPISource(sourceKey, sourceConfig, options);
                    break;
                default:
                    throw new Error(`Unsupported loading type: ${sourceConfig.loadingType}`);
            }

            // Store loaded data
            this.loadedSources.set(sourceKey, {
                loaded: true,
                data: loadedData.data,
                metadata: loadedData.metadata || metadata,
                loadedAt: new Date().toISOString(),
                sourceConfig
            });

            const entityCount = this._getEntityCount(loadedData.data, sourceConfig);

            this._emitStatus(
                sourceKey,
                `${sourceConfig.displayName} loaded successfully!`,
                'success',
                { entityCount }
            );

            console.log(`✅ ${sourceKey} loaded successfully - ${entityCount} entities`);

            return loadedData.data;

        } catch (error) {
            console.error(`❌ Failed to load ${sourceKey}:`, error);

            // Store error state
            this.loadedSources.set(sourceKey, {
                loaded: false,
                error: error.message,
                errorAt: new Date().toISOString(),
                sourceConfig
            });

            this._emitStatus(sourceKey, `Failed to load ${sourceConfig.displayName}: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Load data source with fixed file ID
     * @private
     */
    async _loadFixedFileSource(sourceKey, sourceConfig, options) {
        console.log(`📄 Loading fixed file source: ${sourceConfig.fileName}`);

        const response = await gapi.client.drive.files.get({
            fileId: sourceConfig.fileId,
            alt: 'media'
        });

        let fileData;

        // Use deserialization if supported and available
        if (sourceConfig.supportsDeserialization && typeof deserializeWithTypes === 'function') {
            console.log("🔄 Using recursive deserialization to restore class constructors...");
            fileData = deserializeWithTypes(response.body);
        } else {
            console.log("⚠️ Using JSON.parse (classes will be plain objects)");
            fileData = JSON.parse(response.body);
        }

        // Validate file structure
        if (sourceConfig.dataStructure === 'array') {
            if (!fileData.entities || !Array.isArray(fileData.entities)) {
                throw new Error('Invalid file structure - expected entities array');
            }
            return {
                data: fileData.entities,
                metadata: fileData.metadata || {}
            };
        } else {
            return {
                data: fileData,
                metadata: fileData.metadata || {}
            };
        }
    }

    /**
     * Load data source with dynamic configuration
     * @private
     */
    async _loadDynamicConfigSource(sourceKey, sourceConfig, options) {
        console.log(`📄 Loading dynamic config source: ${sourceConfig.displayName}`);

        if (sourceKey === 'bloomerang') {
            return this._loadBloomerangData(sourceConfig, options);
        }

        throw new Error(`Dynamic loading not implemented for ${sourceKey}`);
    }

    /**
     * Load Bloomerang data with collection-based structure
     * @private
     */
    async _loadBloomerangData(sourceConfig, options) {
        // Load current file IDs from configuration
        const fileIds = await loadCurrentBloomerangFileIds();
        if (!fileIds) {
            throw new Error('Could not load Bloomerang file configuration');
        }

        console.log('✅ Bloomerang file IDs loaded:', fileIds);

        // Load each collection
        const collections = {};
        const collectionMetadata = {};
        let totalEntities = 0;

        for (const [type, fileId] of Object.entries(fileIds)) {
            try {
                console.log(`Loading ${type} collection...`);

                const response = await gapi.client.drive.files.get({
                    fileId: fileId,
                    alt: 'media'
                });

                const collectionData = JSON.parse(response.body);
                collections[type] = collectionData;
                collectionMetadata[type] = collectionData.metadata;

                const entityCount = collectionData.metadata?.totalEntities ||
                    (collectionData.entities ? Object.keys(collectionData.entities).length : 0);
                totalEntities += entityCount;

                console.log(`✅ Loaded ${type}:`, entityCount, 'entities');

            } catch (error) {
                console.warn(`Failed to load ${type} collection:`, error);
                // Continue loading other collections
            }
        }

        return {
            data: collections,
            metadata: {
                totalEntities,
                collectionMetadata,
                fileIds,
                loadedCollections: Object.keys(collections)
            }
        };
    }

    /**
     * Load data source via API
     * @private
     */
    async _loadAPISource(sourceKey, sourceConfig, options) {
        console.log(`🌐 Loading API source: ${sourceConfig.displayName}`);

        // This is a placeholder for future API-based data sources
        throw new Error(`API loading not yet implemented for ${sourceKey}`);
    }

    /**
     * Get entity count from loaded data
     * @private
     */
    _getEntityCount(data, sourceConfig) {
        if (sourceConfig.dataStructure === 'array') {
            return Array.isArray(data) ? data.length : 0;
        } else if (sourceConfig.dataStructure === 'collections') {
            let total = 0;
            Object.values(data).forEach(collection => {
                if (collection.entities) {
                    total += Object.keys(collection.entities).length;
                }
            });
            return total;
        }

        return 0;
    }

    /**
     * Clear loaded data for a specific source
     * @param {string} sourceKey - Data source key
     */
    clearSourceData(sourceKey) {
        this.loadedSources.delete(sourceKey);
        console.log(`🗑️ Cleared data for ${sourceKey}`);
    }

    /**
     * Clear all loaded data
     */
    clearAllData() {
        this.loadedSources.clear();
        console.log('🗑️ Cleared all loaded data');
    }

    /**
     * Get loading statistics
     * @returns {Object} Statistics about loaded data sources
     */
    getLoadingStats() {
        const stats = {
            totalSources: Object.keys(DATA_SOURCE_REGISTRY).length,
            loadedSources: 0,
            failedSources: 0,
            totalEntities: 0,
            sourceDetails: {}
        };

        this.loadedSources.forEach((sourceData, sourceKey) => {
            const sourceInfo = DATA_SOURCE_REGISTRY[sourceKey];

            stats.sourceDetails[sourceKey] = {
                name: sourceInfo.displayName,
                loaded: sourceData.loaded,
                entityCount: 0,
                loadedAt: sourceData.loadedAt,
                error: sourceData.error
            };

            if (sourceData.loaded) {
                stats.loadedSources++;
                const entityCount = this._getEntityCount(sourceData.data, sourceInfo);
                stats.totalEntities += entityCount;
                stats.sourceDetails[sourceKey].entityCount = entityCount;
            } else {
                stats.failedSources++;
            }
        });

        return stats;
    }
}

// =============================================================================
// GLOBAL INSTANCE AND HELPER FUNCTIONS
// =============================================================================

// Create global instance
const dataSourceManager = new DataSourceManager();

/**
 * Get the global data source manager instance
 * @returns {DataSourceManager} The data source manager
 */
function getDataSourceManager() {
    return dataSourceManager;
}

/**
 * Quick function to load a data source
 * @param {string} sourceKey - Data source key
 * @param {Object} options - Loading options
 * @returns {Promise<Object>} Promise resolving to loaded data
 */
async function loadDataSource(sourceKey, options = {}) {
    return dataSourceManager.loadDataSource(sourceKey, options);
}

/**
 * Quick function to check if a data source is loaded
 * @param {string} sourceKey - Data source key
 * @returns {boolean} True if loaded
 */
function isDataSourceLoaded(sourceKey) {
    return dataSourceManager.isSourceLoaded(sourceKey);
}

/**
 * Quick function to get data from a loaded source
 * @param {string} sourceKey - Data source key
 * @returns {Object|null} Loaded data or null
 */
function getLoadedData(sourceKey) {
    return dataSourceManager.getSourceData(sourceKey);
}

/**
 * Get available data sources for dropdown population
 * @returns {Array} Array of data source options
 */
function getDataSourceOptions() {
    const sources = Object.entries(DATA_SOURCE_REGISTRY).map(([key, config]) => ({
        value: key,
        label: config.displayName,
        icon: config.icon,
        color: config.color,
        entityTypes: config.entityTypes
    }));

    // Add "All Sources" option
    sources.unshift({
        value: 'all',
        label: 'All Data Sources',
        icon: '🌐',
        color: '#6c757d',
        entityTypes: [...new Set(Object.values(DATA_SOURCE_REGISTRY).flatMap(s => s.entityTypes))]
    });

    return sources;
}

/**
 * Get entity type options based on selected data sources
 * @param {string|Array} selectedSources - Selected data source key(s)
 * @returns {Array} Array of entity type options
 */
function getEntityTypeOptions(selectedSources) {
    const sourceKeys = selectedSources === 'all'
        ? Object.keys(DATA_SOURCE_REGISTRY)
        : Array.isArray(selectedSources)
        ? selectedSources
        : [selectedSources];

    // Get unique entity types from selected sources
    const entityTypes = new Set();
    sourceKeys.forEach(sourceKey => {
        const config = DATA_SOURCE_REGISTRY[sourceKey];
        if (config) {
            config.entityTypes.forEach(type => entityTypes.add(type));
        }
    });

    const options = Array.from(entityTypes).sort().map(type => ({
        value: type,
        label: type
    }));

    // Add "All Types" option
    options.unshift({
        value: 'all',
        label: 'All Types'
    });

    return options;
}

// =============================================================================
// LEGACY COMPATIBILITY FUNCTIONS
// =============================================================================

// Note: loadCurrentBloomerangFileIds function already exists in entityBrowser.js
// It has the proper implementation that searches Google Drive for latest config files
// The unified browser should use the existing implementation

console.log("📊 Data Source Manager module loaded");