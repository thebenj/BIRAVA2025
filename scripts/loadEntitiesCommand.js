/**
 * Single Command: Load All Entities
 * Loads all dependencies, waits for them to load, then loads entities from Google Drive
 */

async function loadEntitiesCommand() {
    console.log('🚀 BIRAVA2025 Entity Loading Command');
    console.log('=====================================');
    console.log('Loading dependencies and entities from Google Drive...\n');

    try {
        // Step 1: Load all required dependencies
        const dependencies = [
            './scripts/objectStructure/aliasClasses.js',
            './scripts/objectStructure/contactInfo.js',
            './scripts/objectStructure/entityClasses.js',
            './scripts/utils/classSerializationUtils.js',
            './scripts/entityLoader.js'
        ];

        console.log('📚 Loading dependencies...');
        for (const script of dependencies) {
            await loadScript(script);
            console.log(`  ✅ ${script}`);
        }

        console.log('\n🔍 Checking Google Drive authentication...');
        if (!window.gapi || !gapi.client) {
            throw new Error('Google Drive API not available. Please authenticate first.');
        }

        console.log('✅ Google Drive API available');

        // Step 2: Load entities
        console.log('\n📦 Loading all entities from Google Drive...');
        const results = await loadAllEntities();

        // Step 3: Display results
        console.log('\n📊 LOADING RESULTS:');
        console.log('===================');
        if (results.success) {
            console.log('✅ Entity loading SUCCESS!');
            console.log(`📊 VisionAppraisal: ${results.visionAppraisal.count} entities`);
            console.log(`👥 Bloomerang: ${results.bloomerang.individuals + results.bloomerang.households + results.bloomerang.nonhuman} entities`);
            console.log('   - Individuals: ' + results.bloomerang.individuals);
            console.log('   - Households: ' + results.bloomerang.households);
            console.log('   - NonHuman: ' + results.bloomerang.nonhuman);
        } else {
            console.log('❌ Entity loading FAILED!');
            results.errors.forEach(error => console.log('   Error: ' + error));
        }

        console.log('\n💡 Entities are now available in the global loadedEntities object');
        console.log('💡 Use runNameExtractionTest() to see all names');

        return results;

    } catch (error) {
        console.error('❌ Command failed:', error);
        throw error;
    }
}

/**
 * Load script with promise-based waiting
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
    });
}

// Export function
if (typeof window !== 'undefined') {
    window.loadEntitiesCommand = loadEntitiesCommand;
}

console.log('🚀 Load Entities Command ready');
console.log('💡 Usage: loadEntitiesCommand()');