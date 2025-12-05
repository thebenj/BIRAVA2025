/**
 * Comprehensive VisionAppraisal Parallel Method Validation
 *
 * This test validates the new _processTextToAddressNew method produces identical
 * results to the original _processTextToAddress method across ALL VisionAppraisal data.
 *
 * COMPREHENSIVE REGRESSION TEST:
 * - Tests all 2,317 VisionAppraisal records
 * - Tests both propertyLocation and ownerAddress fields
 * - Only reports records where methods produce DIFFERENT results
 * - Provides detailed statistics and failure analysis
 *
 * Usage: loadScript('./tests/test_visionappraisal_parallel_comprehensive.js');
 *
 * Created: 2024-11-21
 * Purpose: Phase 2 comprehensive validation before Phase 3 migration
 */

// Helper function to comprehensively compare ALL address object properties
function compareAllAddressProperties(addr1, addr2) {
    const differences = [];

    // Define all possible address properties to compare
    const propertiesToCompare = [
        'streetNumber', 'streetName', 'streetType', 'city', 'state', 'zipCode',
        'parsedNumber', 'parsedStreet', 'parsedCity', 'parsedState', 'parsedZip',
        'isBlockIslandAddress', 'needsBlockIslandForcing', 'blockIslandDetectionMethod',
        'matchedStreet', 'originalAddress', 'placeholderNumberRemoved', 'usedPlaceholderNumber',
        'cityNormalized', 'cityPostal', 'cityMunicipal', 'sec_unit_type', 'sec_unit_num',
        'plus4', 'delivery_line', 'last_line', 'delivery_line_2', 'components',
        'metadata', 'type', 'parsed', 'formatted', 'normalized'
    ];

    // Compare each property
    for (const prop of propertiesToCompare) {
        const val1 = getPropertyValue(addr1, prop);
        const val2 = getPropertyValue(addr2, prop);

        if (!deepEqual(val1, val2)) {
            differences.push({
                property: prop,
                original: formatValue(val1),
                new: formatValue(val2)
            });
        }
    }

    return differences;
}

// Helper to safely get property value (handles AttributedTerm objects)
function getPropertyValue(obj, prop) {
    if (!obj || !obj.hasOwnProperty(prop)) return undefined;
    const value = obj[prop];

    // Handle AttributedTerm objects
    if (value && typeof value === 'object' && value.hasOwnProperty('term')) {
        return value.term;
    }

    return value;
}

// Helper for deep equality comparison
function deepEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== typeof b) return false;
    if (typeof a !== 'object') return a === b;

    // Handle arrays
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!deepEqual(a[i], b[i])) return false;
        }
        return true;
    }

    // Handle objects
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!deepEqual(a[key], b[key])) return false;
    }

    return true;
}

// Helper to format values for display
function formatValue(value) {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

(async function testVisionAppraisalParallelMethodComprehensive() {
    console.log("🔍 COMPREHENSIVE VisionAppraisal Parallel Method Testing");
    console.log("Testing ALL VisionAppraisal data - Only reporting NON-MATCHING records\n");

    try {
        // Load dependencies like the main function does
        console.log('📚 Loading dependencies...');
        const scripts = [
            './scripts/objectStructure/aliasClasses.js',
            './scripts/objectStructure/entityClasses.js',
            './scripts/objectStructure/contactInfo.js',
            './scripts/dataSources/visionAppraisal.js',
            './scripts/dataSources/visionAppraisalNameParser.js',
            './scripts/address/addressProcessing.js',
            './scripts/utils.js',
            './scripts/matchingTools.js',
            './scripts/utils/classSerializationUtils.js'
        ];

        for (const script of scripts) {
            await new Promise((resolve, reject) => {
                const existing = document.querySelector(`script[src="${script}"]`);
                if (existing) {
                    resolve();
                    return;
                }
                const s = document.createElement('script');
                s.src = script;
                s.onload = resolve;
                s.onerror = reject;
                document.head.appendChild(s);
            });
        }

        // Wait for dependencies to settle
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('\n🔍 Loading all VisionAppraisal records...');

        // Load all VisionAppraisal records from Google Drive
        const response = await VisionAppraisal.loadProcessedDataFromGoogleDrive();
        if (!response.success || !response.data || response.data.length === 0) {
            throw new Error('Failed to load VisionAppraisal data: ' + (response.error || 'No data returned'));
        }

        const allRecords = response.data;
        console.log(`✅ Loaded ${allRecords.length} VisionAppraisal records`);

        // Load Block Island streets database
        console.log('\n🗺️ Loading Block Island streets database...');
        if (typeof loadBlockIslandStreetsFromDrive !== 'undefined') {
            await loadBlockIslandStreetsFromDrive();
            console.log('✅ Block Island streets loaded');
        }

        console.log('\n=== Testing Parallel Methods on ALL Records ===');
        console.log('🎯 Only showing records where methods produce DIFFERENT results\n');

        let totalTested = 0;
        let identicalResults = 0;
        let differentResults = 0;
        let bothNullResults = 0;
        let differentSuccessResults = 0;

        // Process each record
        for (let i = 0; i < allRecords.length; i++) {
            const record = allRecords[i];

            // Test both propertyLocation and ownerAddress if they exist
            const addressFields = [
                { field: 'propertyLocation', value: record.propertyLocation },
                { field: 'ownerAddress', value: record.ownerAddress }
            ];

            for (const { field, value } of addressFields) {
                if (value && value.trim()) {
                    totalTested++;

                    try {
                        // Create temporary entity for testing
                        const tempEntity = new Individual(
                            new SimpleIdentifiers(new AttributedTerm("test", "Test", 0, "TEST")),
                            new IndividualName("Test", "Person"),
                            null, null,
                            new IndicativeData(new AttributedTerm("TEST001", "Test", 0, "TEST"))
                        );

                        const orig = tempEntity._processTextToAddress(value, field);
                        const newRes = tempEntity._processTextToAddressNew(value, field);

                        if (orig && newRes) {
                            // Compare ALL address object properties comprehensively
                            const differences = compareAllAddressProperties(orig, newRes);

                            if (differences.length === 0) {
                                identicalResults++;
                            } else {
                                differentResults++;
                                console.log(`❌ DIFFERENCE - Record ${i+1} (${field}):`);
                                console.log(`   Address: "${value}"`);
                                differences.forEach(diff => {
                                    console.log(`   ${diff.property}: "${diff.original}" vs "${diff.new}" ❌`);
                                });
                                console.log('');
                            }
                        } else if (!orig && !newRes) {
                            bothNullResults++;
                        } else {
                            differentSuccessResults++;
                            console.log(`❌ SUCCESS/FAILURE DIFFERENCE - Record ${i+1} (${field}):`);
                            console.log(`   Address: "${value}"`);
                            console.log(`   Original: ${orig ? "✅ Success" : "❌ Failed"}`);
                            console.log(`   New: ${newRes ? "✅ Success" : "❌ Failed"}`);
                            console.log('');
                        }

                    } catch (error) {
                        console.log(`⚠️ ERROR - Record ${i+1} (${field}): ${error.message}`);
                    }
                }
            }

            // Progress indicator every 500 records
            if ((i + 1) % 500 === 0) {
                console.log(`📊 Progress: ${i + 1}/${allRecords.length} records processed...`);
            }
        }

        console.log('\n🎯 COMPREHENSIVE TEST COMPLETE');
        console.log('=====================================');
        console.log(`Total addresses tested: ${totalTested}`);
        console.log(`Identical results: ${identicalResults} (${(identicalResults/totalTested*100).toFixed(1)}%)`);
        console.log(`Both null results: ${bothNullResults} (${(bothNullResults/totalTested*100).toFixed(1)}%)`);
        console.log(`Different field values: ${differentResults} (${(differentResults/totalTested*100).toFixed(1)}%)`);
        console.log(`Different success/failure: ${differentSuccessResults} (${(differentSuccessResults/totalTested*100).toFixed(1)}%)`);

        if (differentResults === 0 && differentSuccessResults === 0) {
            console.log('\n✅ PERFECT MATCH: All methods produce identical results!');
        } else {
            console.log(`\n⚠️ Found ${differentResults + differentSuccessResults} discrepancies that need investigation`);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
})();

// To run this test:
// 1. Load the application at http://127.0.0.1:1337/
// 2. Ensure all dependencies are loaded (scripts should auto-load)
// 3. Run: loadScript('./tests/test_visionappraisal_parallel_comprehensive.js');
// 4. The test will load all 2,317 VisionAppraisal records and validate both methods