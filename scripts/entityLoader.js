/**
 * Entity Loader for BIRAVA2025
 * Loads all entities from Google Drive storage (VisionAppraisal + Bloomerang collections)
 */

// Global storage for loaded entities
window.loadedEntities = {
    visionAppraisal: {
        entities: null,
        metadata: null,
        loaded: false
    },
    bloomerang: {
        individuals: null,
        households: null,
        nonhuman: null,
        loaded: false
    },
    status: 'not_loaded'
};

/**
 * Main function to load all entities from Google Drive
 * @returns {Promise<Object>} Load results summary
 */
async function loadAllEntities() {
    console.log('🔄 Loading all entities from Google Drive...');
    loadedEntities.status = 'loading';

    const results = {
        success: true,
        visionAppraisal: { count: 0, loaded: false },
        bloomerang: { individuals: 0, households: 0, nonhuman: 0, loaded: false },
        errors: []
    };

    try {
        // Load VisionAppraisal entities
        console.log('📊 Loading VisionAppraisal entities...');
        await loadVisionAppraisalEntities();

        if (loadedEntities.visionAppraisal.loaded) {
            results.visionAppraisal.count = loadedEntities.visionAppraisal.entities.length;
            results.visionAppraisal.loaded = true;
            console.log(`✅ VisionAppraisal: ${results.visionAppraisal.count} entities loaded`);
        }

        // Load Bloomerang collections
        console.log('👥 Loading Bloomerang collections...');
        await loadBloomerangCollections();

        if (loadedEntities.bloomerang.loaded) {
            if (loadedEntities.bloomerang.individuals) {
                results.bloomerang.individuals = Object.keys(loadedEntities.bloomerang.individuals.entities).length;
            }
            if (loadedEntities.bloomerang.households) {
                results.bloomerang.households = Object.keys(loadedEntities.bloomerang.households.entities).length;
            }
            if (loadedEntities.bloomerang.nonhuman) {
                results.bloomerang.nonhuman = Object.keys(loadedEntities.bloomerang.nonhuman.entities).length;
            }
            results.bloomerang.loaded = true;
            console.log(`✅ Bloomerang: ${results.bloomerang.individuals} individuals, ${results.bloomerang.households} households, ${results.bloomerang.nonhuman} nonhuman`);
        }

        loadedEntities.status = 'loaded';
        console.log('🎉 All entities loaded successfully!');
        return results;

    } catch (error) {
        console.error('❌ Entity loading failed:', error);
        results.success = false;
        results.errors.push(error.message);
        loadedEntities.status = 'error';
        return results;
    }
}

/**
 * Load VisionAppraisal entities from Google Drive
 */
async function loadVisionAppraisalEntities() {
    const fileId = '19cgccMYNBboL07CmMP-5hNNGwEUBXgCI';

    try {
        console.log(`📁 Loading VisionAppraisal from file ID: ${fileId}`);

        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });

        // Use deserializeWithTypes if available, fallback to JSON.parse
        let fileData;
        if (typeof deserializeWithTypes === 'function') {
            console.log("🔄 Using deserializeWithTypes to restore class constructors...");
            fileData = deserializeWithTypes(response.body);
        } else {
            console.log("⚠️ Using JSON.parse (classes will be plain objects)");
            fileData = JSON.parse(response.body);
        }

        // Validate structure: { metadata: {...}, entities: [...] }
        if (fileData.entities && Array.isArray(fileData.entities)) {
            loadedEntities.visionAppraisal.entities = fileData.entities;
            loadedEntities.visionAppraisal.metadata = fileData.metadata;
            loadedEntities.visionAppraisal.loaded = true;
        } else {
            throw new Error('Invalid VisionAppraisal file structure - expected entities array');
        }

    } catch (error) {
        console.error('❌ Error loading VisionAppraisal entities:', error);
        loadedEntities.visionAppraisal.loaded = false;
        throw error;
    }
}

/**
 * Load Bloomerang collections from Google Drive
 */
async function loadBloomerangCollections() {
    try {
        // Load file IDs from configuration
        console.log('📄 Loading Bloomerang collection file IDs...');
        const fileIds = await loadBloomerangFileIds();

        if (!fileIds) {
            throw new Error('Could not load Bloomerang collection file IDs');
        }

        // Load each collection
        for (const [type, fileId] of Object.entries(fileIds)) {
            try {
                console.log(`📊 Loading ${type} collection from ${fileId}...`);

                const response = await gapi.client.drive.files.get({
                    fileId: fileId,
                    alt: 'media'
                });

                const collectionData = JSON.parse(response.body);
                loadedEntities.bloomerang[type] = collectionData;

                console.log(`✅ ${type}: ${collectionData.metadata.totalEntities} entities loaded`);

            } catch (error) {
                console.error(`❌ Failed to load ${type} collection:`, error);
                throw error;
            }
        }

        loadedEntities.bloomerang.loaded = true;

    } catch (error) {
        console.error('❌ Error loading Bloomerang collections:', error);
        loadedEntities.bloomerang.loaded = false;
        throw error;
    }
}

/**
 * Load Bloomerang file IDs from configuration file
 */
async function loadBloomerangFileIds() {
    try {
        const batchesFolderId = '1hcI8ZNKw9zfN5UMr7-LOfUldxuGF2V9e';

        // Search for the most recent config file
        const response = await gapi.client.drive.files.list({
            q: `'${batchesFolderId}' in parents and name contains 'BloomerangEntityBrowserConfig_' and trashed=false`,
            orderBy: 'modifiedTime desc',
            pageSize: 1,
            fields: 'files(id,name,modifiedTime)'
        });

        if (!response.result.files || response.result.files.length === 0) {
            console.warn('No Bloomerang config files found');
            return null;
        }

        const latestConfigFile = response.result.files[0];
        console.log(`📄 Using config: ${latestConfigFile.name}`);

        // Load config content
        const configResponse = await gapi.client.drive.files.get({
            fileId: latestConfigFile.id,
            alt: 'media'
        });

        const configData = JSON.parse(configResponse.body);

        return {
            individuals: configData.fileIds.individuals,
            households: configData.fileIds.households,
            nonhuman: configData.fileIds.nonhuman
        };

    } catch (error) {
        console.error('Error loading Bloomerang file IDs:', error);
        return null;
    }
}

// Export functions
if (typeof window !== 'undefined') {
    window.loadAllEntities = loadAllEntities;
    window.loadVisionAppraisalEntities = loadVisionAppraisalEntities;
    window.loadBloomerangCollections = loadBloomerangCollections;
}

console.log('📦 Entity Loader ready - call loadAllEntities() to load all entities from Google Drive');