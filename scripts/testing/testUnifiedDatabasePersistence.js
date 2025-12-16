/**
 * Test: Unified Database Persistence
 *
 * Tests the buildUnifiedEntityDatabase function and verifies:
 * 1. Unified database is built correctly from workingLoadedEntities
 * 2. Keys are unique and follow the expected format
 * 3. Serialization preserves class instances
 * 4. Deserialization restores class instances with methods
 *
 * PREREQUISITES:
 * - Entities must be loaded via "Load All Entities Into Memory"
 *
 * RUN IN BROWSER CONSOLE:
 * fetch('./scripts/testing/testUnifiedDatabasePersistence.js').then(r => r.text()).then(eval)
 */

(async function testUnifiedDatabasePersistence() {
    console.log('=== Testing Unified Database Persistence ===\n');

    const results = {
        buildTest: { passed: false, details: {} },
        keyFormatTest: { passed: false, details: {} },
        serializationTest: { passed: false, details: {} },
        roundTripTest: { passed: false, details: {} }
    };

    // Check prerequisites
    if (!window.workingLoadedEntities || workingLoadedEntities.status !== 'loaded') {
        console.error('PREREQUISITE FAILED: Entities not loaded.');
        console.error('Please click "Load All Entities Into Memory" first.');
        return results;
    }

    // Test 1: Build Unified Database
    console.log('TEST 1: Building Unified Database...');
    try {
        const database = buildUnifiedEntityDatabase();

        results.buildTest.details = {
            totalEntities: database.metadata.totalEntities,
            sources: database.metadata.sources,
            entityTypes: database.metadata.entityTypes,
            duplicatesFound: database.metadata.duplicateKeysFound
        };

        if (database.metadata.totalEntities > 0 && Object.keys(database.entities).length > 0) {
            results.buildTest.passed = true;
            console.log('  PASSED: Built database with', database.metadata.totalEntities, 'entities');
        } else {
            console.error('  FAILED: Database has no entities');
        }
    } catch (error) {
        console.error('  FAILED:', error.message);
        results.buildTest.details.error = error.message;
    }

    // Test 2: Key Format Validation
    console.log('\nTEST 2: Validating Key Formats...');
    try {
        const database = buildUnifiedEntityDatabase();
        const keys = Object.keys(database.entities);

        let visionAppraisalKeys = 0;
        let bloomerangKeys = 0;
        let invalidKeys = [];

        for (const key of keys) {
            if (key.startsWith('visionAppraisal:')) {
                visionAppraisalKeys++;
                // Format: visionAppraisal:<locationType>:<locationValue>
                const parts = key.split(':');
                if (parts.length < 3) {
                    invalidKeys.push({ key, reason: 'VisionAppraisal key has fewer than 3 parts' });
                }
            } else if (key.startsWith('bloomerang:')) {
                bloomerangKeys++;
                // Format: bloomerang:<accountNumber>:<locationType>:<locationValue>:<headStatus>
                const parts = key.split(':');
                if (parts.length < 5) {
                    invalidKeys.push({ key, reason: 'Bloomerang key has fewer than 5 parts' });
                }
            } else {
                invalidKeys.push({ key, reason: 'Key does not start with visionAppraisal: or bloomerang:' });
            }
        }

        results.keyFormatTest.details = {
            totalKeys: keys.length,
            visionAppraisalKeys,
            bloomerangKeys,
            invalidKeyCount: invalidKeys.length,
            sampleInvalidKeys: invalidKeys.slice(0, 5)
        };

        if (invalidKeys.length === 0) {
            results.keyFormatTest.passed = true;
            console.log('  PASSED: All', keys.length, 'keys have valid format');
            console.log('    VisionAppraisal:', visionAppraisalKeys);
            console.log('    Bloomerang:', bloomerangKeys);
        } else {
            console.warn('  WARNING:', invalidKeys.length, 'keys have invalid format');
            invalidKeys.slice(0, 3).forEach(ik => console.warn('    ', ik.key, '-', ik.reason));
        }
    } catch (error) {
        console.error('  FAILED:', error.message);
        results.keyFormatTest.details.error = error.message;
    }

    // Test 3: Serialization Test
    console.log('\nTEST 3: Testing Serialization...');
    try {
        const database = buildUnifiedEntityDatabase();

        // Check a sample entity before serialization
        const sampleKey = Object.keys(database.entities)[0];
        const sampleEntity = database.entities[sampleKey];
        const beforeType = sampleEntity.constructor?.name;
        const hasCompareToMethod = typeof sampleEntity.compareTo === 'function';

        console.log('  Before serialization:');
        console.log('    Sample key:', sampleKey);
        console.log('    Entity type:', beforeType);
        console.log('    Has compareTo method:', hasCompareToMethod);

        // Serialize
        const serialized = serializeWithTypes(database);
        const sizeKB = (serialized.length / 1024).toFixed(1);

        results.serializationTest.details = {
            serializedSizeKB: parseFloat(sizeKB),
            sampleEntityType: beforeType,
            hasCompareToBeforeSerialization: hasCompareToMethod
        };

        if (serialized.length > 0 && serialized.includes('"type":')) {
            results.serializationTest.passed = true;
            console.log('  PASSED: Serialized to', sizeKB, 'KB');
            console.log('    Contains type markers:', serialized.includes('"type":'));
        } else {
            console.error('  FAILED: Serialization produced invalid output');
        }
    } catch (error) {
        console.error('  FAILED:', error.message);
        results.serializationTest.details.error = error.message;
    }

    // Test 4: Round-Trip Test
    console.log('\nTEST 4: Testing Round-Trip (Serialize -> Deserialize)...');
    try {
        const database = buildUnifiedEntityDatabase();

        // Pick a few sample entities to verify
        const sampleKeys = Object.keys(database.entities).slice(0, 5);
        const beforeEntities = sampleKeys.map(key => ({
            key,
            type: database.entities[key].constructor?.name,
            hasCompareTo: typeof database.entities[key].compareTo === 'function'
        }));

        // Serialize and deserialize
        const serialized = serializeWithTypes(database);
        const restored = deserializeWithTypes(serialized);

        // Check restored entities
        const afterEntities = sampleKeys.map(key => ({
            key,
            type: restored.entities[key]?.constructor?.name,
            hasCompareTo: typeof restored.entities[key]?.compareTo === 'function'
        }));

        // Compare before and after
        let allMatch = true;
        const comparisons = [];
        for (let i = 0; i < sampleKeys.length; i++) {
            const before = beforeEntities[i];
            const after = afterEntities[i];
            const typeMatch = before.type === after.type;
            const methodMatch = before.hasCompareTo === after.hasCompareTo;

            comparisons.push({
                key: before.key,
                beforeType: before.type,
                afterType: after.type,
                typeMatch,
                methodMatch
            });

            if (!typeMatch || !methodMatch) {
                allMatch = false;
            }
        }

        results.roundTripTest.details = {
            samplesChecked: sampleKeys.length,
            comparisons,
            metadataPreserved: restored.metadata?.totalEntities === database.metadata.totalEntities
        };

        if (allMatch && restored.metadata?.totalEntities === database.metadata.totalEntities) {
            results.roundTripTest.passed = true;
            console.log('  PASSED: All', sampleKeys.length, 'sample entities preserved correctly');
            console.log('  Class types and methods restored');
        } else {
            console.warn('  WARNING: Some entities did not round-trip correctly');
            comparisons.forEach(c => {
                if (!c.typeMatch || !c.methodMatch) {
                    console.warn('    ', c.key, ':', c.beforeType, '->', c.afterType, 'methods:', c.methodMatch);
                }
            });
        }
    } catch (error) {
        console.error('  FAILED:', error.message);
        results.roundTripTest.details.error = error.message;
    }

    // Summary
    console.log('\n=== TEST SUMMARY ===');
    const passed = Object.values(results).filter(r => r.passed).length;
    const total = Object.keys(results).length;
    console.log(`Passed: ${passed}/${total}`);

    Object.entries(results).forEach(([name, result]) => {
        console.log(`  ${result.passed ? '✅' : '❌'} ${name}`);
    });

    if (passed === total) {
        console.log('\n✅ ALL TESTS PASSED');
        console.log('The unified database persistence is ready for testing with Google Drive.');
    } else {
        console.log('\n⚠️ SOME TESTS FAILED');
        console.log('Review the details above before proceeding.');
    }

    return results;
})();
