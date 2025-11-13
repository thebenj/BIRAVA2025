// Simple Parser Test - No Entity Dependencies
// Tests core parsing logic without entity class requirements

async function testSimpleParserLogic() {
    console.log('=== TESTING SIMPLE PARSER LOGIC ===');

    try {
        // Load only the required validation system
        if (!window.Case31Validator) {
            console.log('Loading Case31Validator...');
            const script = document.createElement('script');
            script.src = './scripts/validation/case31Validator.js';
            document.head.appendChild(script);

            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('✓ Case31Validator loaded');
        }

        if (!window.VisionAppraisal) {
            console.log('Loading VisionAppraisal...');
            const script = document.createElement('script');
            script.src = './scripts/dataSources/visionAppraisal.js';
            document.head.appendChild(script);

            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('✓ VisionAppraisal loaded');
        }

        console.log('✓ Dependencies loaded');

        // Simple parser that creates plain objects
        const SimpleParser = {
            parseCase1: function(ownerName, record) {
                const words = ownerName.split(/\s+/);
                if (words.length !== 2 || !words[0].endsWith(',')) {
                    throw new Error(`Invalid Case 1 pattern: ${ownerName}`);
                }

                const lastName = words[0].replace(/,$/, '');
                const firstName = words[1];

                return {
                    entityType: 'Individual',
                    parsing: 'Case 1',
                    firstName: firstName,
                    lastName: lastName,
                    fullName: `${firstName} ${lastName}`,
                    originalName: ownerName,
                    pid: record.pid,
                    fireNumber: record.fireNumber,
                    propertyLocation: record.propertyLocation,
                    source: 'VISION_APPRAISAL'
                };
            },

            parseCase3: function(ownerName, record) {
                const words = ownerName.split(/\s+/);
                if (words.length !== 2) {
                    throw new Error(`Invalid Case 3 pattern: ${ownerName}`);
                }

                const firstName = words[0];
                const lastName = words[1];

                return {
                    entityType: 'Individual',
                    parsing: 'Case 3',
                    firstName: firstName,
                    lastName: lastName,
                    fullName: `${firstName} ${lastName}`,
                    originalName: ownerName,
                    pid: record.pid,
                    fireNumber: record.fireNumber,
                    propertyLocation: record.propertyLocation,
                    source: 'VISION_APPRAISAL'
                };
            },

            parseCase8: function(ownerName, record) {
                const words = ownerName.split(/\s+/);
                if (words.length !== 3) {
                    throw new Error(`Invalid Case 8 pattern: ${ownerName}`);
                }

                const lastName = words[0];
                const firstName = words[1];
                const middleInitial = words[2];

                return {
                    entityType: 'Individual',
                    parsing: 'Case 8',
                    firstName: firstName,
                    lastName: lastName,
                    middleName: middleInitial,
                    fullName: `${firstName} ${middleInitial} ${lastName}`,
                    originalName: ownerName,
                    pid: record.pid,
                    fireNumber: record.fireNumber,
                    propertyLocation: record.propertyLocation,
                    source: 'VISION_APPRAISAL'
                };
            },

            parseCase9: function(ownerName, record) {
                const words = ownerName.split(/\s+/);
                if (words.length !== 3) {
                    throw new Error(`Invalid Case 9 pattern: ${ownerName}`);
                }

                const firstName = words[0];
                const middleName = words[1];
                const lastName = words[2];

                return {
                    entityType: 'Individual',
                    parsing: 'Case 9',
                    firstName: firstName,
                    lastName: lastName,
                    middleName: middleName,
                    fullName: `${firstName} ${middleName} ${lastName}`,
                    originalName: ownerName,
                    pid: record.pid,
                    fireNumber: record.fireNumber,
                    propertyLocation: record.propertyLocation,
                    source: 'VISION_APPRAISAL'
                };
            },

            parseCase10: function(ownerName, record) {
                const words = ownerName.split(/\s+/);
                if (words.length !== 3) {
                    throw new Error(`Invalid Case 10 pattern: ${ownerName}`);
                }

                const firstName = words[0];
                const middleName = words[1];
                const lastName = words[2];

                return {
                    entityType: 'Individual',
                    parsing: 'Case 10',
                    firstName: firstName,
                    lastName: lastName,
                    middleName: middleName,
                    fullName: `${firstName} ${middleName} ${lastName}`,
                    originalName: ownerName,
                    pid: record.pid,
                    fireNumber: record.fireNumber,
                    propertyLocation: record.propertyLocation,
                    source: 'VISION_APPRAISAL'
                };
            }
        };

        // Load VisionAppraisal data
        console.log('\nLoading VisionAppraisal data...');
        const response = await VisionAppraisal.loadProcessedDataFromGoogleDrive();
        if (!response.success) {
            throw new Error('Failed to load VisionAppraisal data: ' + response.message);
        }

        const records = response.data;
        console.log(`✓ Loaded ${records.length} records`);

        // Find examples and test parsing
        const testCases = {
            case1: null,
            case3: null,
            case8: null,
            case9: null,
            case10: null
        };

        // Search for examples
        for (const record of records) {
            const ownerName = record.processedOwnerName || record.ownerName;
            if (!ownerName) continue;

            try {
                const detectedCase = Case31Validator.detectCase(ownerName);

                if (testCases.hasOwnProperty(detectedCase) && !testCases[detectedCase]) {
                    testCases[detectedCase] = record;
                }
            } catch (error) {
                continue;
            }
        }

        // Test parsing each case
        const results = {};
        console.log('\n=== PARSING TESTS ===');

        for (const [caseType, record] of Object.entries(testCases)) {
            if (record) {
                const ownerName = record.processedOwnerName || record.ownerName;
                console.log(`\nTesting ${caseType}: "${ownerName}"`);

                try {
                    const parsedEntity = SimpleParser[`parse${caseType.charAt(0).toUpperCase() + caseType.slice(1)}`](ownerName, record);
                    results[caseType] = { success: true, entity: parsedEntity };

                    console.log(`✓ SUCCESS - Created ${parsedEntity.entityType}:`);
                    console.log(`  Name: ${parsedEntity.fullName}`);
                    console.log(`  PID: ${parsedEntity.pid}`);
                    console.log(`  Fire Number: ${parsedEntity.fireNumber}`);

                } catch (error) {
                    results[caseType] = { success: false, error: error.message };
                    console.log(`✗ FAILED: ${error.message}`);
                }
            } else {
                results[caseType] = { success: false, error: 'No example found' };
                console.log(`\n${caseType}: No example found`);
            }
        }

        // Summary
        const successCount = Object.values(results).filter(r => r.success).length;
        const totalTests = Object.keys(results).length;

        console.log('\n=== SIMPLE PARSING TEST RESULTS ===');
        console.log(`✓ Tests passed: ${successCount}/${totalTests}`);

        Object.entries(results).forEach(([caseType, result]) => {
            const status = result.success ? '✓' : '✗';
            const message = result.success ? 'SUCCESS' : result.error;
            console.log(`${status} ${caseType}: ${message}`);
        });

        if (successCount === totalTests) {
            console.log('\n🎉 ALL PARSING TESTS PASSED!');
            console.log('Individual case parsing logic is working correctly');
            console.log('Ready to proceed with entity class integration');
        }

        return results;

    } catch (error) {
        console.error('❌ Test failed:', error);
        return { error: error.message };
    }
}

console.log('Simple Parser Test Script Loaded');
console.log('Run: testSimpleParserLogic()');