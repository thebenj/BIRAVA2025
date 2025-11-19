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
        await loadBloomerangCollectionsWorking();

        // Step 5: Set up enhanced name extraction
        window.extractNameWorking = function(entity) {
            try {
                // For Individual entities: extract all name components
                if (entity.__type === 'Individual' && entity.name) {
                    return {
                        entityType: 'Individual',
                        title: entity.name.title || '',
                        firstName: entity.name.firstName || '',
                        otherNames: entity.name.otherNames || '',
                        lastName: entity.name.lastName || '',
                        suffix: entity.name.suffix || '',
                        completeName: entity.name.completeName || '',
                        termOfAddress: entity.name.termOfAddress || ''
                    };
                }

                // For other entities: return simple name string
                if (entity.name && entity.name.term) {
                    return entity.name.term;
                }

                if (typeof entity.name === 'string') {
                    return entity.name;
                }

                return '[No name found]';

            } catch (error) {
                return `[Name extraction error: ${error.message}]`;
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