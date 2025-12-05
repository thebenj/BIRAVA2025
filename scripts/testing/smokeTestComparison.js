/**
 * Smoke Test for Comparison Architecture After Bug Fixes
 *
 * Purpose: Verify that commenting out the problematic code doesn't break basic functionality
 *
 * Tests:
 * 1. IndividualName objects can be created
 * 2. compareTo method exists and doesn't throw
 * 3. genericObjectCompareTo works with fallback behavior
 * 4. Entity loading still works
 *
 * Run in browser console after loading entities:
 *   fetch('./scripts/testing/smokeTestComparison.js').then(r => r.text()).then(eval)
 */

function smokeTestComparisonArchitecture() {
    console.log('🔥 === SMOKE TEST: Comparison Architecture After Bug Fixes ===');
    console.log('Testing that core functionality still works after commenting out problematic code');
    console.log('');

    let passed = 0;
    let failed = 0;
    const results = [];

    // Test 1: Can create IndividualName objects
    console.log('📝 Test 1: Creating IndividualName objects...');
    try {
        const alias1 = new AttributedTerm("Test Person", "TEST", 0, "smoke1");
        const name1 = new IndividualName(alias1, "", "Test", "", "Person", "");

        if (name1 && name1.firstName === "Test" && name1.lastName === "Person") {
            console.log('   ✅ PASS: IndividualName created successfully');
            results.push({ test: 'Create IndividualName', status: 'PASS' });
            passed++;
        } else {
            console.log('   ❌ FAIL: IndividualName created but has wrong values');
            results.push({ test: 'Create IndividualName', status: 'FAIL', reason: 'Wrong values' });
            failed++;
        }
    } catch (e) {
        console.log('   ❌ FAIL: Error creating IndividualName:', e.message);
        results.push({ test: 'Create IndividualName', status: 'FAIL', reason: e.message });
        failed++;
    }

    // Test 2: compareTo method exists
    console.log('📝 Test 2: Checking compareTo method exists...');
    try {
        const alias1 = new AttributedTerm("John Smith", "TEST", 0, "smoke2a");
        const name1 = new IndividualName(alias1, "", "John", "", "Smith", "");

        if (typeof name1.compareTo === 'function') {
            console.log('   ✅ PASS: compareTo method exists on IndividualName');
            results.push({ test: 'compareTo exists', status: 'PASS' });
            passed++;
        } else {
            console.log('   ❌ FAIL: compareTo method not found');
            results.push({ test: 'compareTo exists', status: 'FAIL', reason: 'Method not found' });
            failed++;
        }
    } catch (e) {
        console.log('   ❌ FAIL: Error checking compareTo:', e.message);
        results.push({ test: 'compareTo exists', status: 'FAIL', reason: e.message });
        failed++;
    }

    // Test 3: compareTo doesn't throw on execution
    console.log('📝 Test 3: Calling compareTo (should not throw)...');
    try {
        const alias1 = new AttributedTerm("John Smith", "TEST", 0, "smoke3a");
        const alias2 = new AttributedTerm("John Smith", "TEST", 0, "smoke3b");
        const name1 = new IndividualName(alias1, "", "John", "", "Smith", "");
        const name2 = new IndividualName(alias2, "", "John", "", "Smith", "");

        const result = name1.compareTo(name2);
        console.log(`   compareTo result: ${result}`);

        if (typeof result === 'number') {
            console.log('   ✅ PASS: compareTo returned a number without throwing');
            results.push({ test: 'compareTo executes', status: 'PASS', value: result });
            passed++;
        } else {
            console.log('   ❌ FAIL: compareTo returned non-number:', typeof result);
            results.push({ test: 'compareTo executes', status: 'FAIL', reason: 'Non-number return' });
            failed++;
        }
    } catch (e) {
        console.log('   ❌ FAIL: compareTo threw error:', e.message);
        results.push({ test: 'compareTo executes', status: 'FAIL', reason: e.message });
        failed++;
    }

    // Test 4: genericObjectCompareTo fallback works
    console.log('📝 Test 4: Testing genericObjectCompareTo fallback...');
    try {
        const alias1 = new AttributedTerm("Test", "TEST", 0, "smoke4a");
        const alias2 = new AttributedTerm("Test", "TEST", 0, "smoke4b");

        // AttributedTerm doesn't have weighted comparison, should use fallback
        const result = genericObjectCompareTo(alias1, alias2, []);
        console.log(`   genericObjectCompareTo result: ${result}`);

        if (typeof result === 'number') {
            console.log('   ✅ PASS: genericObjectCompareTo returned a number');
            results.push({ test: 'genericObjectCompareTo fallback', status: 'PASS', value: result });
            passed++;
        } else {
            console.log('   ❌ FAIL: genericObjectCompareTo returned non-number');
            results.push({ test: 'genericObjectCompareTo fallback', status: 'FAIL', reason: 'Non-number return' });
            failed++;
        }
    } catch (e) {
        console.log('   ❌ FAIL: genericObjectCompareTo threw error:', e.message);
        results.push({ test: 'genericObjectCompareTo fallback', status: 'FAIL', reason: e.message });
        failed++;
    }

    // Test 5: comparisonWeights property exists
    console.log('📝 Test 5: Checking comparisonWeights property...');
    try {
        const alias1 = new AttributedTerm("John Smith", "TEST", 0, "smoke5");
        const name1 = new IndividualName(alias1, "", "John", "", "Smith", "");

        if (name1.comparisonWeights && typeof name1.comparisonWeights === 'object') {
            console.log('   comparisonWeights:', JSON.stringify(name1.comparisonWeights));
            console.log('   ✅ PASS: comparisonWeights property exists');
            results.push({ test: 'comparisonWeights exists', status: 'PASS' });
            passed++;
        } else {
            console.log('   ⚠️  WARNING: comparisonWeights is null/undefined (may be expected after changes)');
            results.push({ test: 'comparisonWeights exists', status: 'WARN', reason: 'null/undefined' });
            // Don't count as failure - this may be expected
            passed++;
        }
    } catch (e) {
        console.log('   ❌ FAIL: Error checking comparisonWeights:', e.message);
        results.push({ test: 'comparisonWeights exists', status: 'FAIL', reason: e.message });
        failed++;
    }

    // Test 6: Entity loading (if entities are loaded)
    console.log('📝 Test 6: Checking loaded entities...');
    try {
        if (typeof workingLoadedEntities !== 'undefined' && workingLoadedEntities) {
            const vaCount = Object.keys(workingLoadedEntities.visionAppraisal?.entities || {}).length;
            const bloomIndCount = Object.keys(workingLoadedEntities.bloomerang?.individuals?.entities || {}).length;

            console.log(`   VisionAppraisal entities: ${vaCount}`);
            console.log(`   Bloomerang individuals: ${bloomIndCount}`);

            if (vaCount > 0 || bloomIndCount > 0) {
                console.log('   ✅ PASS: Entities are loaded');
                results.push({ test: 'Entities loaded', status: 'PASS', va: vaCount, bloom: bloomIndCount });
                passed++;
            } else {
                console.log('   ⚠️  WARNING: No entities loaded (may need to load first)');
                results.push({ test: 'Entities loaded', status: 'WARN', reason: 'No entities' });
                passed++; // Not a failure, just not loaded yet
            }
        } else {
            console.log('   ⚠️  WARNING: workingLoadedEntities not defined (need to load entities first)');
            results.push({ test: 'Entities loaded', status: 'WARN', reason: 'Not loaded' });
            passed++; // Not a failure
        }
    } catch (e) {
        console.log('   ❌ FAIL: Error checking entities:', e.message);
        results.push({ test: 'Entities loaded', status: 'FAIL', reason: e.message });
        failed++;
    }

    // Summary
    console.log('');
    console.log('🔥 === SMOKE TEST SUMMARY ===');
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log('');

    if (failed === 0) {
        console.log('🎉 ALL TESTS PASSED - Core functionality still works after bug fix changes');
        console.log('   The commented-out code did not break basic operations.');
        console.log('   Ready to implement correct weighted Levenshtein algorithm.');
    } else {
        console.log('⚠️  SOME TESTS FAILED - Review the failures above');
        console.log('   May need to revert some changes.');
    }

    return { passed, failed, results };
}

// Auto-announce when loaded
console.log('🔥 Smoke Test loaded');
console.log('Run: smokeTestComparisonArchitecture()');
