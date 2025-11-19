/**
 * Single Command: Name Extraction Report
 * Loads all dependencies, waits for them to load, loads entities, then generates name report
 */

async function nameReportCommand() {
    console.log('📋 BIRAVA2025 Name Extraction Report Command');
    console.log('===========================================');
    console.log('Loading dependencies, entities, and generating name report...\n');

    try {
        // Step 1: Load all required dependencies
        const dependencies = [
            './scripts/objectStructure/aliasClasses.js',
            './scripts/objectStructure/contactInfo.js',
            './scripts/objectStructure/entityClasses.js',
            './scripts/utils/classSerializationUtils.js',
            './scripts/entityLoader.js',
            './scripts/nameExtractionReport.js'
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

        // Step 2: Load entities if not already loaded
        if (!window.loadedEntities || loadedEntities.status !== 'loaded') {
            console.log('\n📦 Loading entities from Google Drive...');
            const loadResults = await loadAllEntities();

            if (!loadResults.success) {
                throw new Error('Failed to load entities: ' + loadResults.errors.join(', '));
            }

            console.log('✅ Entities loaded successfully');
        } else {
            console.log('\n✅ Entities already loaded');
        }

        // Step 3: Generate and display name report
        console.log('\n📋 Generating name extraction report...');
        const report = await runNameExtractionTest();

        console.log('\n🎉 Name report generation complete!');
        console.log('💡 Full report is available in the returned object');

        return report;

    } catch (error) {
        console.error('❌ Name report command failed:', error);
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
    window.nameReportCommand = nameReportCommand;
}

console.log('📋 Name Report Command ready');
console.log('💡 Usage: nameReportCommand()');