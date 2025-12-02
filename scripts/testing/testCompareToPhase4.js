// =============================================================================
// Phase 4 Test: Entity-level compareTo
// Tests Individual and AggregateHousehold entity comparison using entityWeightedComparison
// =============================================================================

/**
 * Test Phase 4: Entity-level compareTo implementation
 * Run in browser console after loading entities
 */
function testCompareToPhase4() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     Phase 4 Test: Entity-level compareTo                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    let passed = 0;
    let failed = 0;

    // Test 1: Check Individual has initializeWeightedComparison
    console.log('TEST 1: Individual class setup');
    try {
        const individual = new Individual(null, null);
        if (individual.comparisonCalculatorName === 'entityWeightedComparison') {
            console.log('✅ Individual uses entityWeightedComparison calculator');
            passed++;
        } else {
            console.error('❌ Individual not using entityWeightedComparison:', individual.comparisonCalculatorName);
            failed++;
        }
        if (individual.comparisonWeights && individual.comparisonWeights.name === 0.5) {
            console.log('✅ Individual has correct name weight (0.5)');
            passed++;
        } else {
            console.error('❌ Individual weights incorrect:', individual.comparisonWeights);
            failed++;
        }
        if (typeof individual.compareTo === 'function') {
            console.log('✅ Individual has compareTo method');
            passed++;
        } else {
            console.error('❌ Individual missing compareTo method');
            failed++;
        }
    } catch (err) {
        console.error('❌ Individual setup test failed:', err.message);
        failed++;
    }

    // Test 2: Check AggregateHousehold has initializeWeightedComparison
    console.log('\nTEST 2: AggregateHousehold class setup');
    try {
        const household = new AggregateHousehold(null, null);
        if (household.comparisonCalculatorName === 'entityWeightedComparison') {
            console.log('✅ AggregateHousehold uses entityWeightedComparison calculator');
            passed++;
        } else {
            console.error('❌ AggregateHousehold not using entityWeightedComparison:', household.comparisonCalculatorName);
            failed++;
        }
        if (household.comparisonWeights && household.comparisonWeights.name === 0.4 && household.comparisonWeights.contactInfo === 0.4) {
            console.log('✅ AggregateHousehold has correct weights (name: 0.4, contactInfo: 0.4)');
            passed++;
        } else {
            console.error('❌ AggregateHousehold weights incorrect:', household.comparisonWeights);
            failed++;
        }
        if (typeof household.compareTo === 'function') {
            console.log('✅ AggregateHousehold has compareTo method');
            passed++;
        } else {
            console.error('❌ AggregateHousehold missing compareTo method');
            failed++;
        }
    } catch (err) {
        console.error('❌ AggregateHousehold setup test failed:', err.message);
        failed++;
    }

    // Test 3: Create two identical Individuals and compare
    console.log('\nTEST 3: Identical Individual comparison');
    try {
        const name1 = new IndividualName();
        name1.firstName = 'John';
        name1.lastName = 'Smith';
        name1.initializeWeightedComparison();

        const name2 = new IndividualName();
        name2.firstName = 'John';
        name2.lastName = 'Smith';
        name2.initializeWeightedComparison();

        const individual1 = new Individual(null, name1);
        const individual2 = new Individual(null, name2);

        const score = individual1.compareTo(individual2);
        console.log(`  Score: ${(score * 100).toFixed(1)}%`);

        if (score === 1) {
            console.log('✅ Identical individuals return 100%');
            passed++;
        } else {
            console.error(`❌ Identical individuals should return 100%, got ${(score * 100).toFixed(1)}%`);
            failed++;
        }
    } catch (err) {
        console.error('❌ Identical Individual comparison failed:', err.message);
        failed++;
    }

    // Test 4: Create two different Individuals and compare
    console.log('\nTEST 4: Different Individual comparison');
    try {
        const name1 = new IndividualName();
        name1.firstName = 'John';
        name1.lastName = 'Smith';
        name1.initializeWeightedComparison();

        const name2 = new IndividualName();
        name2.firstName = 'Jane';
        name2.lastName = 'Doe';
        name2.initializeWeightedComparison();

        const individual1 = new Individual(null, name1);
        const individual2 = new Individual(null, name2);

        const score = individual1.compareTo(individual2);
        console.log(`  Score: ${(score * 100).toFixed(1)}%`);

        if (score < 0.5) {
            console.log('✅ Different individuals return low similarity');
            passed++;
        } else {
            console.error(`❌ Different individuals should have low similarity, got ${(score * 100).toFixed(1)}%`);
            failed++;
        }
    } catch (err) {
        console.error('❌ Different Individual comparison failed:', err.message);
        failed++;
    }

    // Test 5: Individual with name AND contactInfo
    console.log('\nTEST 5: Individual with name and contactInfo');
    try {
        // Create first individual with name and address
        const name1 = new IndividualName();
        name1.firstName = 'John';
        name1.lastName = 'Smith';
        name1.initializeWeightedComparison();

        const addr1 = new Address();
        addr1.streetNumber = '123';
        addr1.streetName = 'Main Street';
        addr1.city = 'Block Island';
        addr1.state = 'RI';
        addr1.zipCode = '02807';

        const ci1 = new ContactInfo();
        ci1.setPrimaryAddress(addr1);

        const individual1 = new Individual(null, name1);
        individual1.contactInfo = ci1;

        // Create second individual with same name and address
        const name2 = new IndividualName();
        name2.firstName = 'John';
        name2.lastName = 'Smith';
        name2.initializeWeightedComparison();

        const addr2 = new Address();
        addr2.streetNumber = '123';
        addr2.streetName = 'Main Street';
        addr2.city = 'Block Island';
        addr2.state = 'RI';
        addr2.zipCode = '02807';

        const ci2 = new ContactInfo();
        ci2.setPrimaryAddress(addr2);

        const individual2 = new Individual(null, name2);
        individual2.contactInfo = ci2;

        const score = individual1.compareTo(individual2);
        console.log(`  Score: ${(score * 100).toFixed(1)}%`);
        console.log(`  (name weight: 0.5, contactInfo weight: 0.3)`);

        if (score === 1) {
            console.log('✅ Identical name + contactInfo returns 100%');
            passed++;
        } else {
            console.error(`❌ Identical name + contactInfo should return 100%, got ${(score * 100).toFixed(1)}%`);
            failed++;
        }
    } catch (err) {
        console.error('❌ Individual with contactInfo comparison failed:', err.message);
        failed++;
    }

    // Test 6: Test with real loaded entities (if available)
    console.log('\nTEST 6: Real entity comparison (from loaded data)');
    if (window.workingLoadedEntities && workingLoadedEntities.status === 'loaded') {
        try {
            const bloomerangIndividuals = Object.values(workingLoadedEntities.bloomerang.individuals.entities);
            if (bloomerangIndividuals.length >= 2) {
                const e1 = bloomerangIndividuals[0];
                const e2 = bloomerangIndividuals[1];

                console.log(`  Entity 1: ${e1.name?.completeName || e1.name?.firstName + ' ' + e1.name?.lastName}`);
                console.log(`  Entity 2: ${e2.name?.completeName || e2.name?.firstName + ' ' + e2.name?.lastName}`);

                if (typeof e1.compareTo === 'function') {
                    const score = e1.compareTo(e2);
                    console.log(`  Score: ${(score * 100).toFixed(1)}%`);
                    console.log('✅ Real entity comparison works');
                    passed++;
                } else {
                    console.error('❌ Loaded entity does not have compareTo method');
                    console.log('  Note: Entities need to be reloaded after code changes');
                    failed++;
                }
            } else {
                console.log('⚠️ Not enough Bloomerang individuals loaded for test');
            }
        } catch (err) {
            console.error('❌ Real entity comparison failed:', err.message);
            failed++;
        }
    } else {
        console.log('⚠️ Entities not loaded - skipping real entity test');
        console.log('  Click "🚀 Load All Entities Into Memory" to run this test');
    }

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    Test Summary                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`  ✅ Passed: ${passed}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  Total: ${passed + failed}`);

    return { passed, failed };
}

// Export for browser
if (typeof window !== 'undefined') {
    window.testCompareToPhase4 = testCompareToPhase4;
}

console.log('Phase 4 test loaded. Run: testCompareToPhase4()');
