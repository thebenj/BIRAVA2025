/**
 * Load All Entities Button Function
 * Button-triggered function to load all entities from Google Drive into memory
 */

/**
 * Main function called by the "Load All Entities Into Memory" button
 * Loads dependencies, then loads all VisionAppraisal and Bloomerang entities
 */
async function loadAllEntitiesIntoMemory() {
    console.log('🚀 Loading All Entities Into Memory...');
    console.log('=====================================');

    try {
        // Step 1: Load required dependencies
        const dependencies = [
            './scripts/objectStructure/aliasClasses.js',
            './scripts/objectStructure/contactInfo.js',
            './scripts/objectStructure/entityClasses.js',
            './scripts/utils/classSerializationUtils.js',
            './scripts/workingEntityLoader.js'
        ];

        console.log('📚 Loading dependencies...');
        for (const script of dependencies) {
            await loadScriptAsync(script);
            console.log(`  ✅ ${script}`);
        }

        // Step 2: Initialize global storage
        if (!window.workingLoadedEntities) {
            window.workingLoadedEntities = {
                visionAppraisal: { entities: null, metadata: null, loaded: false },
                bloomerang: { individuals: null, households: null, nonhuman: null, loaded: false },
                status: 'not_loaded'
            };
        }

        // Step 3: Load VisionAppraisal entities
        console.log('\n📊 Loading VisionAppraisal entities...');
        await loadVisionAppraisalEntitiesWorking();

        // Step 4: Load Bloomerang collections
        console.log('\n👥 Loading Bloomerang collections...');

        // CRITICAL: Get config file ID from input box (if available)
        // WARNING: If testing newly saved entities, you MUST manually enter the new config file ID
        // from the console output "✅ Entity Browser config saved: filename (ID: FILE_ID_HERE)"
        // into the config input box BEFORE clicking this button, otherwise old entity files will be loaded
        let configFileId = null;
        if (typeof getBloomerangConfigFileId === 'function') {
            try {
                configFileId = getBloomerangConfigFileId();
                if (configFileId) {
                    console.log('📄 Using config file ID from input:', configFileId);
                    console.log('🔍 TESTING NOTE: If this is a test, verify this is the NEW config file ID from recent processing');
                }
            } catch (error) {
                console.log('⚠️ No config file ID provided, using default folder search');
                console.log('🚨 WARNING: This will load OLD entity files, not newly saved ones!');
                configFileId = null;
            }
        }

        await loadBloomerangCollectionsWorking(configFileId);

        // Step 5: Set up enhanced name extraction
        window.extractNameWorking = function(entity) {
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
                        console.error('DATA INTEGRITY ERROR: Individual entity name missing completeName', {
                            // Entity identifying info - CRITICAL for tracking source
                            // SimpleIdentifiers stores value in primaryAlias.term
                            accountNumber: entity.accountNumber?.primaryAlias?.term || 'NO_ACCOUNT',
                            locationId: entity.locationIdentifier?.primaryAlias?.term || 'NO_LOCATION',
                            // Name's primaryAlias has source and rowIndex for tracking origin
                            nameSource: entity.name.primaryAlias?.source || 'NO_SOURCE',
                            nameRowIndex: entity.name.primaryAlias?.rowIndex,
                            nameAliasTerm: entity.name.primaryAlias?.term || 'NO_ALIAS_TERM',
                            // All name fields to see what's missing
                            completeName: entity.name.completeName,
                            firstName: entity.name.firstName,
                            lastName: entity.name.lastName,
                            otherNames: entity.name.otherNames,
                            title: entity.name.title,
                            suffix: entity.name.suffix,
                            termOfAddress: entity.name.termOfAddress,
                            nameConstructor: entity.name.constructor?.name
                        });
                        // Also log the full entity for inspection
                        console.error('Full entity object:', entity);
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
        };

        // Step 6: Final summary
        const vaCount = workingLoadedEntities.visionAppraisal.entities?.length || 0;
        const bloomerangCount =
            (workingLoadedEntities.bloomerang.individuals?.metadata?.totalEntities || 0) +
            (workingLoadedEntities.bloomerang.households?.metadata?.totalEntities || 0) +
            (workingLoadedEntities.bloomerang.nonhuman?.metadata?.totalEntities || 0);

        console.log('\n🎉 ENTITY LOADING COMPLETE!');
        console.log('============================');
        console.log(`📊 VisionAppraisal: ${vaCount} entities`);
        console.log(`👥 Bloomerang: ${bloomerangCount} entities`);
        console.log(`🔢 Grand Total: ${vaCount + bloomerangCount} entities`);
        console.log('');
        console.log('💡 Entities available in global workingLoadedEntities object');
        console.log('💡 Use extractNameWorking(entity) to extract names');
        console.log('💡 Individual entities return full name structure');

        workingLoadedEntities.status = 'loaded';

        return {
            success: true,
            visionAppraisal: vaCount,
            bloomerang: bloomerangCount,
            total: vaCount + bloomerangCount
        };

    } catch (error) {
        console.error('❌ Entity loading failed:', error);
        workingLoadedEntities.status = 'error';
        throw error;
    }
}

/**
 * Load script with promise-based waiting
 * @param {string} src - Script source path
 * @returns {Promise} Promise that resolves when script loads
 */
function loadScriptAsync(src) {
    return new Promise((resolve, reject) => {
        // Check if script already loaded
        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
    });
}

// Export for global use
if (typeof window !== 'undefined') {
    window.loadAllEntitiesIntoMemory = loadAllEntitiesIntoMemory;
}

console.log('🚀 Load All Entities button function ready');