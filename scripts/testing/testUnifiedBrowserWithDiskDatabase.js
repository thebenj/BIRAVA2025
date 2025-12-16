/**
 * Test: Unified Browser with Disk-Loaded Database
 *
 * Tests that the unified browser functions work correctly when
 * the database is loaded from disk (unifiedEntityDatabase) instead
 * of built from workingLoadedEntities.
 *
 * PREREQUISITES:
 * - Database must be loaded via loadUnifiedDatabase() OR "Load All Entities Into Memory"
 *
 * RUN IN BROWSER CONSOLE:
 * fetch('./scripts/testing/testUnifiedBrowserWithDiskDatabase.js').then(r => r.text()).then(eval)
 */

(async function testUnifiedBrowserWithDiskDatabase() {
    console.log('=== Testing Unified Browser with Disk-Loaded Database ===\n');

    const results = {
        databaseLoadedTest: { passed: false, details: {} },
        getAllSelectedEntitiesTest: { passed: false, details: {} },
        hasLoadedDataTest: { passed: false, details: {} },
        generateUnifiedStatsTest: { passed: false, details: {} },
        filterBySourceTest: { passed: false, details: {} },
        filterByTypeTest: { passed: false, details: {} }
    };

    // Check prerequisites
    if (typeof isEntityDatabaseLoaded !== 'function') {
        console.error('PREREQUISITE FAILED: isEntityDatabaseLoaded function not available.');
        console.error('Please ensure unifiedDatabasePersistence.js is loaded.');
        return results;
    }

    // Test 1: Database Loaded Check
    console.log('TEST 1: Database Loaded Check...');
    try {
        const isLoaded = isEntityDatabaseLoaded();
        const metadata = getEntityDatabaseMetadata();

        results.databaseLoadedTest.details = {
            isLoaded,
            source: metadata?.source || 'unknown',
            totalEntities: metadata?.totalEntities || 0
        };

        if (isLoaded) {
            results.databaseLoadedTest.passed = true;
            console.log('  PASSED: Database is loaded');
            console.log('    Source:', metadata?.source);
            console.log('    Total entities:', metadata?.totalEntities);
        } else {
            console.error('  FAILED: Database not loaded');
            console.error('  Please load entities first using:');
            console.error('    loadUnifiedDatabase("FILE_ID") OR');
            console.error('    Click "Load All Entities Into Memory"');
            return results;
        }
    } catch (error) {
        console.error('  FAILED:', error.message);
        results.databaseLoadedTest.details.error = error.message;
        return results;
    }

    // Test 2: getAllSelectedEntities() function
    console.log('\nTEST 2: getAllSelectedEntities() function...');
    try {
        // Save current filter state
        const savedDataSource = unifiedBrowser?.selectedDataSource;
        const savedEntityType = unifiedBrowser?.selectedEntityType;

        // Set to 'all' for testing
        if (unifiedBrowser) {
            unifiedBrowser.selectedDataSource = 'all';
            unifiedBrowser.selectedEntityType = 'all';
        }

        const entities = getAllSelectedEntities();

        results.getAllSelectedEntitiesTest.details = {
            entitiesReturned: entities.length,
            hasSourceProperty: entities.length > 0 ? !!entities[0].source : false,
            hasKeyProperty: entities.length > 0 ? !!entities[0].key : false,
            hasEntityProperty: entities.length > 0 ? !!entities[0].entity : false
        };

        // Check entity structure
        if (entities.length > 0) {
            const sample = entities[0];
            const hasRequiredProps = sample.source && sample.key && sample.entity;
            const hasValidSource = ['VisionAppraisal', 'Bloomerang'].includes(sample.source);
            const hasValidKey = sample.key.startsWith('visionAppraisal:') || sample.key.startsWith('bloomerang:');

            results.getAllSelectedEntitiesTest.details.sampleEntity = {
                source: sample.source,
                key: sample.key.substring(0, 50) + '...',
                entityType: sample.entity?.constructor?.name
            };

            if (hasRequiredProps && hasValidSource && hasValidKey) {
                results.getAllSelectedEntitiesTest.passed = true;
                console.log('  PASSED: getAllSelectedEntities() works correctly');
                console.log('    Entities returned:', entities.length);
                console.log('    Sample key:', sample.key.substring(0, 60));
            } else {
                console.error('  FAILED: Entity structure incorrect');
            }
        } else {
            console.error('  FAILED: No entities returned');
        }

        // Restore filter state
        if (unifiedBrowser && savedDataSource !== undefined) {
            unifiedBrowser.selectedDataSource = savedDataSource;
            unifiedBrowser.selectedEntityType = savedEntityType;
        }
    } catch (error) {
        console.error('  FAILED:', error.message);
        results.getAllSelectedEntitiesTest.details.error = error.message;
    }

    // Test 3: hasLoadedData() function
    console.log('\nTEST 3: hasLoadedData() function...');
    try {
        const hasData = hasLoadedData();

        results.hasLoadedDataTest.details = { hasData };

        if (hasData === true) {
            results.hasLoadedDataTest.passed = true;
            console.log('  PASSED: hasLoadedData() returns true');
        } else {
            console.error('  FAILED: hasLoadedData() returned', hasData);
        }
    } catch (error) {
        console.error('  FAILED:', error.message);
        results.hasLoadedDataTest.details.error = error.message;
    }

    // Test 4: getUnifiedStatsData() function
    console.log('\nTEST 4: getUnifiedStatsData() function...');
    try {
        const stats = getUnifiedStatsData();

        results.generateUnifiedStatsTest.details = {
            totalEntities: stats?.totalEntities,
            hasSourceBreakdown: !!stats?.bySource,
            hasTypeBreakdown: !!stats?.byType,
            databaseSource: stats?.databaseSource
        };

        if (stats && stats.totalEntities > 0 && stats.bySource && stats.byType) {
            results.generateUnifiedStatsTest.passed = true;
            console.log('  PASSED: getUnifiedStatsData() works correctly');
            console.log('    Total entities:', stats.totalEntities);
            console.log('    Database source:', stats.databaseSource);
            console.log('    By source:', JSON.stringify(stats.bySource));
        } else {
            console.error('  FAILED: Stats missing or incomplete');
        }
    } catch (error) {
        console.error('  FAILED:', error.message);
        results.generateUnifiedStatsTest.details.error = error.message;
    }

    // Test 5: Filter by source
    console.log('\nTEST 5: Filter by source...');
    try {
        const visionAppraisalEntities = getFilteredEntities('visionAppraisal', 'all');
        const bloomerangEntities = getFilteredEntities('bloomerang', 'all');
        const allEntities = getFilteredEntities('all', 'all');

        const vaCount = Object.keys(visionAppraisalEntities).length;
        const bCount = Object.keys(bloomerangEntities).length;
        const totalCount = Object.keys(allEntities).length;

        results.filterBySourceTest.details = {
            visionAppraisalCount: vaCount,
            bloomerangCount: bCount,
            totalCount: totalCount,
            sumMatches: (vaCount + bCount) === totalCount
        };

        // Verify all VisionAppraisal keys start correctly
        const vaKeys = Object.keys(visionAppraisalEntities);
        const allVaKeysCorrect = vaKeys.every(k => k.startsWith('visionAppraisal:'));

        // Verify all Bloomerang keys start correctly
        const bKeys = Object.keys(bloomerangEntities);
        const allBKeysCorrect = bKeys.every(k => k.startsWith('bloomerang:'));

        if ((vaCount + bCount) === totalCount && allVaKeysCorrect && allBKeysCorrect) {
            results.filterBySourceTest.passed = true;
            console.log('  PASSED: Source filtering works correctly');
            console.log('    VisionAppraisal:', vaCount);
            console.log('    Bloomerang:', bCount);
            console.log('    Total:', totalCount);
        } else {
            console.error('  FAILED: Source filtering incorrect');
            console.error('    VA + B =', vaCount + bCount, 'but total =', totalCount);
        }
    } catch (error) {
        console.error('  FAILED:', error.message);
        results.filterBySourceTest.details.error = error.message;
    }

    // Test 6: Filter by entity type
    console.log('\nTEST 6: Filter by entity type...');
    try {
        const individualEntities = getFilteredEntities('all', 'Individual');
        const householdEntities = getFilteredEntities('all', 'AggregateHousehold');
        const businessEntities = getFilteredEntities('all', 'Business');

        const indCount = Object.keys(individualEntities).length;
        const hhCount = Object.keys(householdEntities).length;
        const bizCount = Object.keys(businessEntities).length;

        results.filterByTypeTest.details = {
            individualCount: indCount,
            householdCount: hhCount,
            businessCount: bizCount
        };

        // Verify types are correct
        const indTypes = Object.values(individualEntities).map(e => e.constructor?.name);
        const allIndCorrect = indTypes.every(t => t === 'Individual');

        if (indCount > 0 && allIndCorrect) {
            results.filterByTypeTest.passed = true;
            console.log('  PASSED: Entity type filtering works correctly');
            console.log('    Individuals:', indCount);
            console.log('    AggregateHouseholds:', hhCount);
            console.log('    Businesses:', bizCount);
        } else {
            console.error('  FAILED: Type filtering incorrect');
        }
    } catch (error) {
        console.error('  FAILED:', error.message);
        results.filterByTypeTest.details.error = error.message;
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
        console.log('The unified browser works correctly with the disk-loaded database.');
        console.log('\nYou can now test the UI:');
        console.log('  1. Open the Unified Entity Browser');
        console.log('  2. Click "Show All" or search for an entity');
        console.log('  3. Verify entities display correctly');
        console.log('  4. Test source/type filters');
        console.log('  5. Click "View Stats"');
    } else {
        console.log('\n⚠️ SOME TESTS FAILED');
        console.log('Review the details above before proceeding.');
    }

    return results;
})();
