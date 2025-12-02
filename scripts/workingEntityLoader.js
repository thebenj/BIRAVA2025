/**
 * Working Entity Loader - Based on Actual Testing Results
 * Uses correct data access patterns discovered through browser testing
 */

// Global storage for loaded entities
window.workingLoadedEntities = {
    visionAppraisal: {
        entities: null,
        metadata: null,
        loaded: false
    },
    status: 'not_loaded'
};

/**
 * Load VisionAppraisal entities using tested working pattern
 */
async function loadVisionAppraisalEntitiesWorking() {
    console.log('📊 Loading VisionAppraisal entities (working version)...');

    try {
        const response = await gapi.client.drive.files.get({
            fileId: '19cgccMYNBboL07CmMP-5hNNGwEUBXgCI',
            alt: 'media'
        });

        // CRITICAL: Use deserializeWithTypes to reconstruct class instances with methods
        let fileData;
        if (typeof deserializeWithTypes === 'function') {
            console.log('🔄 Using deserializeWithTypes for VisionAppraisal to restore class instances');
            fileData = deserializeWithTypes(response.body);
        } else {
            console.warn('⚠️  deserializeWithTypes not available - falling back to JSON.parse (methods will not be available)');
            fileData = JSON.parse(response.body);
        }

        // Validate structure based on testing
        if (fileData.entities && Array.isArray(fileData.entities)) {
            workingLoadedEntities.visionAppraisal.entities = fileData.entities;
            workingLoadedEntities.visionAppraisal.metadata = fileData.metadata;
            workingLoadedEntities.visionAppraisal.loaded = true;
            workingLoadedEntities.status = 'loaded';

            console.log(`✅ Loaded ${fileData.entities.length} VisionAppraisal entities`);
            console.log('📊 Metadata:', fileData.metadata);

            // Show entity type breakdown (use constructor.name for class instances)
            const typeCounts = {};
            fileData.entities.forEach(entity => {
                const type = entity.constructor?.name || entity.type || 'Unknown';
                typeCounts[type] = (typeCounts[type] || 0) + 1;
            });
            console.log('📊 Entity types:', typeCounts);

            return {
                success: true,
                count: fileData.entities.length,
                types: typeCounts
            };
        } else {
            throw new Error('Invalid file structure - no entities array found');
        }

    } catch (error) {
        console.error('❌ Error loading VisionAppraisal entities:', error);
        workingLoadedEntities.visionAppraisal.loaded = false;
        workingLoadedEntities.status = 'error';
        throw error;
    }
}

/**
 * Extract name from entity using correct tested pattern
 * ALWAYS returns object with completeName property - never strings
 */
function extractNameWorking(entity) {
    try {
        // Use constructor.name for deserialized class instances (type property is intentionally excluded during deserialization)
        const entityType = entity.constructor?.name || entity.type;

        // For Individual entities: MUST have IndividualName with completeName
        if (entityType === 'Individual') {
            if (!entity.name) {
                console.error('DATA INTEGRITY ERROR: Individual entity missing name property', entity);
                return { entityType: 'Individual', completeName: 'ERROR: Missing name property', error: true };
            }
            if (!entity.name.completeName) {
                console.error('DATA INTEGRITY ERROR: Individual entity name missing completeName', entity.name);
                return { entityType: 'Individual', completeName: 'ERROR: Missing completeName', error: true };
            }
            return {
                entityType: 'Individual',
                title: entity.name.title || '',
                firstName: entity.name.firstName || '',
                otherNames: entity.name.otherNames || '',
                lastName: entity.name.lastName || '',
                suffix: entity.name.suffix || '',
                completeName: entity.name.completeName,
                termOfAddress: entity.name.termOfAddress || ''
            };
        }

        // For non-Individual entities: return object with completeName from term or string
        if (entity.name && entity.name.term) {
            return { entityType: entityType, completeName: entity.name.term };
        }

        if (typeof entity.name === 'string') {
            return { entityType: entityType, completeName: entity.name };
        }

        console.error('DATA INTEGRITY ERROR: Entity missing valid name', entity);
        return { entityType: entityType, completeName: 'ERROR: No name found', error: true };

    } catch (error) {
        console.error('extractNameWorking error:', error, entity);
        return { entityType: 'Unknown', completeName: `ERROR: ${error.message}`, error: true };
    }
}

/**
 * Generate name report using working patterns
 */
function generateWorkingNameReport() {
    console.log('📋 Generating Working Name Report...');

    if (workingLoadedEntities.status !== 'loaded') {
        console.error('❌ Entities not loaded. Call loadVisionAppraisalEntitiesWorking() first.');
        return null;
    }

    const report = {
        byType: {},
        allNames: [],
        summary: {
            totalEntities: 0,
            namedEntities: 0,
            unnamedEntities: 0
        }
    };

    workingLoadedEntities.visionAppraisal.entities.forEach((entity, index) => {
        const entityType = entity.constructor?.name || entity.type || 'Unknown';
        const name = extractNameWorking(entity);

        // Initialize type array if needed
        if (!report.byType[entityType]) {
            report.byType[entityType] = [];
        }

        const nameEntry = {
            name: name,
            index: index,
            type: entityType
        };

        report.byType[entityType].push(nameEntry);
        report.allNames.push(nameEntry);

        report.summary.totalEntities++;
        if (name !== '[No name found]' && !name.includes('error')) {
            report.summary.namedEntities++;
        } else {
            report.summary.unnamedEntities++;
        }
    });

    return report;
}

/**
 * Display working name report
 */
function displayWorkingNameReport(report) {
    if (!report) return;

    console.log('📋 ========== WORKING NAME EXTRACTION REPORT ==========');
    console.log('');

    // Summary
    console.log('📊 SUMMARY:');
    console.log(`Total Entities: ${report.summary.totalEntities}`);
    console.log(`Named Entities: ${report.summary.namedEntities}`);
    console.log(`Unnamed Entities: ${report.summary.unnamedEntities}`);
    console.log('');

    // By entity type
    Object.entries(report.byType).forEach(([type, entities]) => {
        console.log(`${getTypeIcon(type)} ${type} (${entities.length}):`);

        // Show first 5 names for each type
        entities.slice(0, 5).forEach(entry => {
            console.log(`  • ${entry.name}`);
        });

        if (entities.length > 5) {
            console.log(`  ... and ${entities.length - 5} more`);
        }
        console.log('');
    });

    console.log('✅ Working name extraction report complete!');
}

/**
 * Get emoji icon for entity type
 */
function getTypeIcon(type) {
    const icons = {
        'Individual': '👤',
        'AggregateHousehold': '🏠',
        'CompositeHousehold': '🏡',
        'Business': '🏢',
        'LegalConstruct': '⚖️',
        'NonHuman': '🏛️'
    };
    return icons[type] || '❓';
}

/**
 * Complete working test - load entities and show name report
 */
async function runWorkingEntityTest() {
    console.log('🧪 Running Working Entity Loading and Name Extraction Test...');

    try {
        // Load entities
        const loadResult = await loadVisionAppraisalEntitiesWorking();

        // Generate name report
        const nameReport = generateWorkingNameReport();

        // Display report
        displayWorkingNameReport(nameReport);

        console.log('🎉 Working entity test completed successfully!');
        return {
            loadResult,
            nameReport
        };

    } catch (error) {
        console.error('❌ Working entity test failed:', error);
        throw error;
    }
}

/**
 * Load Bloomerang collections using tested working pattern
 * @param {string} configFileId - Optional Google Drive file ID for config file (defaults to folder search)
 */
async function loadBloomerangCollectionsWorking(configFileId = null) {
    console.log('👥 Loading Bloomerang collections...');

    try {
        let config;

        if (configFileId) {
            // Use specific config file ID provided
            console.log('📄 Using provided config file ID:', configFileId);
            console.log('🔍 DEBUG: This is the config file that tells us which entity files to load');
            const configResponse = await gapi.client.drive.files.get({
                fileId: configFileId,
                alt: 'media'
            });
            config = JSON.parse(configResponse.body);
            console.log('📄 Config loaded:', config.metadata?.description || 'Config file');
            console.log('🔍 DEBUG: Config entity file IDs:', config.entities || 'NO ENTITIES IN CONFIG');

        } else {
            // Fall back to original folder search method
            console.log('📄 Searching for config in default folder...');
            const batchesFolderId = '1hcI8ZNKw9zfN5UMr7-LOfUldxuGF2V9e';
            const configResponse = await gapi.client.drive.files.list({
                q: `'${batchesFolderId}' in parents and name contains 'BloomerangEntityBrowserConfig_' and trashed=false`,
                orderBy: 'modifiedTime desc',
                pageSize: 1,
                fields: 'files(id,name,modifiedTime)'
            });

            const configFile = configResponse.result.files[0];
            console.log('📄 Using config:', configFile.name);

            const configData = await gapi.client.drive.files.get({fileId: configFile.id, alt: 'media'});
            config = JSON.parse(configData.body);
        }

        // Process config data to load collections
        const fileIds = {
            individuals: config.fileIds.individuals,
            households: config.fileIds.households,
            nonhuman: config.fileIds.nonhuman
        };

        workingLoadedEntities.bloomerang = {};

        for (const [type, fileId] of Object.entries(fileIds)) {
            console.log(`🔍 DEBUG: Loading ${type} entities from file ID: ${fileId}`);
            console.log(`🔍 DEBUG: This file was created when? Check metadata...`);
            const response = await gapi.client.drive.files.get({fileId, alt: 'media'});

            // CRITICAL: Use deserializeWithTypes to reconstruct class instances with methods
            // This ensures IndividualName objects have compareTo() method and comparisonCalculator
            let collectionData;
            if (typeof deserializeWithTypes === 'function') {
                console.log(`🔄 Using deserializeWithTypes for ${type} to restore class instances`);
                collectionData = deserializeWithTypes(response.body);
            } else {
                console.warn(`⚠️  deserializeWithTypes not available for ${type} - falling back to JSON.parse (methods will not be available)`);
                collectionData = JSON.parse(response.body);
            }

            workingLoadedEntities.bloomerang[type] = collectionData;
            console.log(`✅ ${type}: ${collectionData.metadata.totalEntities} entities`);
            console.log(`🔍 DEBUG: ${type} entities created at:`, collectionData.metadata.created);
            console.log(`🔍 DEBUG: Are these the entities with secondary addresses we just processed?`);
        }

        workingLoadedEntities.bloomerang.loaded = true;
        console.log('✅ All Bloomerang collections loaded');

    } catch (error) {
        console.error('❌ Bloomerang loading failed:', error);
        workingLoadedEntities.bloomerang = { loaded: false };
        throw error;
    }
}

// Export functions
if (typeof window !== 'undefined') {
    window.loadVisionAppraisalEntitiesWorking = loadVisionAppraisalEntitiesWorking;
    window.loadBloomerangCollectionsWorking = loadBloomerangCollectionsWorking;
    window.extractNameWorking = extractNameWorking;
    window.generateWorkingNameReport = generateWorkingNameReport;
    window.displayWorkingNameReport = displayWorkingNameReport;
    window.runWorkingEntityTest = runWorkingEntityTest;
}

console.log('🔧 Working Entity Loader ready - call runWorkingEntityTest()');