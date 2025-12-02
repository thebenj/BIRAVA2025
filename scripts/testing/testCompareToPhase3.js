// =============================================================================
// Phase 3 Testing: ContactInfo.compareTo with Address Matching Logic
// Run in browser console after loading entities
// =============================================================================

/**
 * Helper to create an Address object for testing
 * Address constructor only accepts primaryAlias - other properties must be set directly
 */
function createTestAddress(streetNum, streetName, city, state, zip, secUnitType = null, secUnitNum = null) {
    const primaryAlias = new AttributedTerm(
        `${streetNum} ${streetName}, ${city}, ${state} ${zip}`,
        'TEST', 0, 'test'
    );
    const addr = new Address(primaryAlias);

    // Set parsed address components as AttributedTerm objects
    if (streetNum) addr.streetNumber = new AttributedTerm(streetNum, 'TEST', 0, 'test');
    if (streetName) addr.streetName = new AttributedTerm(streetName, 'TEST', 0, 'test');
    if (city) addr.city = new AttributedTerm(city, 'TEST', 0, 'test');
    if (state) addr.state = new AttributedTerm(state, 'TEST', 0, 'test');
    if (zip) addr.zipCode = new AttributedTerm(zip, 'TEST', 0, 'test');
    if (secUnitType) addr.secUnitType = new AttributedTerm(secUnitType, 'TEST', 0, 'test');
    if (secUnitNum) addr.secUnitNum = new AttributedTerm(secUnitNum, 'TEST', 0, 'test');

    return addr;
}

/**
 * Helper to create a ContactInfo object for testing
 */
function createTestContactInfo(primaryAddr, secondaryAddrs = [], email = null) {
    const ci = new ContactInfo();
    if (primaryAddr) {
        ci.setPrimaryAddress(primaryAddr);
    }
    if (secondaryAddrs && secondaryAddrs.length > 0) {
        ci.setSecondaryAddresses(secondaryAddrs);
    }
    if (email) {
        // Create email as SimpleIdentifiers (no IndicativeData wrapper)
        const emailAlias = new AttributedTerm(email, 'TEST', 0, 'test');
        ci.setEmail(new SimpleIdentifiers(emailAlias));
    }
    return ci;
}

/**
 * Test ContactInfo initialization
 */
function testContactInfoSetup() {
    console.log(' === Testing ContactInfo.initializeWeightedComparison Setup ===\n');

    const ci = new ContactInfo();

    console.log('ContactInfo comparisonWeights:', ci.comparisonWeights);
    console.log('ContactInfo comparisonCalculatorName:', ci.comparisonCalculatorName);
    console.log('ContactInfo comparisonCalculator type:', typeof ci.comparisonCalculator);

    if (ci.comparisonCalculatorName === 'contactInfoWeightedComparison') {
        console.log('✅ Using contactInfoWeightedComparison calculator');
    } else {
        console.log('❌ Wrong calculator:', ci.comparisonCalculatorName);
    }
    console.log('');
}

/**
 * Test basic primary address matching
 */
function testPrimaryAddressMatching() {
    console.log(' === Testing Primary Address Matching ===\n');

    let passed = 0;
    let total = 0;

    const testCases = [
        {
            name: 'Identical primary addresses',
            ci1: createTestContactInfo(
                createTestAddress('123', 'Main St', 'Providence', 'RI', '02903')
            ),
            ci2: createTestContactInfo(
                createTestAddress('123', 'Main St', 'Providence', 'RI', '02903')
            ),
            expectedMin: 0.95,
            expectedMax: 1.0
        },
        {
            name: 'Different primary addresses',
            ci1: createTestContactInfo(
                createTestAddress('123', 'Main St', 'Providence', 'RI', '02903')
            ),
            ci2: createTestContactInfo(
                createTestAddress('456', 'Oak Ave', 'Boston', 'MA', '02101')
            ),
            expectedMin: 0.0,
            expectedMax: 0.5
        },
        {
            name: 'Primary matches secondary (should find best match)',
            ci1: createTestContactInfo(
                createTestAddress('123', 'Main St', 'Providence', 'RI', '02903'),
                [createTestAddress('789', 'Elm Dr', 'Boston', 'MA', '02101')]
            ),
            ci2: createTestContactInfo(
                createTestAddress('789', 'Elm Dr', 'Boston', 'MA', '02101'),
                [createTestAddress('456', 'Oak Ave', 'Warwick', 'RI', '02886')]
            ),
            expectedMin: 0.55,  // Primary matches other's primary
            expectedMax: 1.0
        }
    ];

    testCases.forEach((test, idx) => {
        total++;
        const result = test.ci1.compareTo(test.ci2);

        console.log(`Test ${idx + 1}: ${test.name}`);
        console.log(`  Similarity: ${result} (${(result * 100).toFixed(1)}%)`);

        if (result >= test.expectedMin && result <= test.expectedMax) {
            console.log(`  ✅ Within expected range [${test.expectedMin}, ${test.expectedMax}]`);
            passed++;
        } else if (result > test.expectedMax) {
            console.log(`  ⚠️ Above expected maximum ${test.expectedMax}`);
        } else {
            console.log(`  ⚠️ Below expected minimum ${test.expectedMin}`);
        }
        console.log('');
    });

    console.log(`Primary Address Matching: ${passed}/${total} passed\n`);
    return { passed, total };
}

/**
 * Test secondary address matching
 */
function testSecondaryAddressMatching() {
    console.log(' === Testing Secondary Address Matching ===\n');

    let passed = 0;
    let total = 0;

    const testCases = [
        {
            name: 'Identical secondaries (primary different)',
            ci1: createTestContactInfo(
                createTestAddress('123', 'Main St', 'Providence', 'RI', '02903'),
                [createTestAddress('789', 'Elm Dr', 'Boston', 'MA', '02101')]
            ),
            ci2: createTestContactInfo(
                createTestAddress('456', 'Oak Ave', 'Warwick', 'RI', '02886'),
                [createTestAddress('789', 'Elm Dr', 'Boston', 'MA', '02101')]
            ),
            expectedMin: 0.2,  // Secondary match (0.2 weight) + partial primary
            expectedMax: 0.95  // Perfect secondary could trigger 0.9 override
        },
        {
            name: 'No secondary addresses',
            ci1: createTestContactInfo(
                createTestAddress('123', 'Main St', 'Providence', 'RI', '02903')
            ),
            ci2: createTestContactInfo(
                createTestAddress('456', 'Oak Ave', 'Warwick', 'RI', '02886')
            ),
            expectedMin: 0.0,
            expectedMax: 0.5
        }
    ];

    testCases.forEach((test, idx) => {
        total++;
        const result = test.ci1.compareTo(test.ci2);

        console.log(`Test ${idx + 1}: ${test.name}`);
        console.log(`  Similarity: ${result} (${(result * 100).toFixed(1)}%)`);

        if (result >= test.expectedMin && result <= test.expectedMax) {
            console.log(`  ✅ Within expected range [${test.expectedMin}, ${test.expectedMax}]`);
            passed++;
        } else if (result > test.expectedMax) {
            console.log(`  ⚠️ Above expected maximum ${test.expectedMax}`);
        } else {
            console.log(`  ⚠️ Below expected minimum ${test.expectedMin}`);
        }
        console.log('');
    });

    console.log(`Secondary Address Matching: ${passed}/${total} passed\n`);
    return { passed, total };
}

/**
 * Test email matching
 */
function testEmailMatching() {
    console.log(' === Testing Email Matching ===\n');

    let passed = 0;
    let total = 0;

    const testCases = [
        {
            name: 'Identical emails (different addresses)',
            ci1: createTestContactInfo(
                createTestAddress('123', 'Main St', 'Providence', 'RI', '02903'),
                [],
                'john@example.com'
            ),
            ci2: createTestContactInfo(
                createTestAddress('456', 'Oak Ave', 'Boston', 'MA', '02101'),
                [],
                'john@example.com'
            ),
            expectedMin: 0.9,  // Perfect email match should trigger 0.9 override
            expectedMax: 1.0
        },
        {
            name: 'Similar emails',
            ci1: createTestContactInfo(
                createTestAddress('123', 'Main St', 'Providence', 'RI', '02903'),
                [],
                'john.smith@example.com'
            ),
            ci2: createTestContactInfo(
                createTestAddress('123', 'Main St', 'Providence', 'RI', '02903'),
                [],
                'johnsmith@example.com'
            ),
            expectedMin: 0.8,
            expectedMax: 1.0
        },
        {
            name: 'Different emails',
            ci1: createTestContactInfo(
                createTestAddress('123', 'Main St', 'Providence', 'RI', '02903'),
                [],
                'john@example.com'
            ),
            ci2: createTestContactInfo(
                createTestAddress('456', 'Oak Ave', 'Boston', 'MA', '02101'),
                [],
                'mary@different.org'
            ),
            expectedMin: 0.0,
            expectedMax: 0.4
        },
        {
            name: 'One has email, one does not',
            ci1: createTestContactInfo(
                createTestAddress('123', 'Main St', 'Providence', 'RI', '02903'),
                [],
                'john@example.com'
            ),
            ci2: createTestContactInfo(
                createTestAddress('456', 'Oak Ave', 'Boston', 'MA', '02101')
            ),
            expectedMin: 0.0,
            expectedMax: 0.4
        }
    ];

    testCases.forEach((test, idx) => {
        total++;
        const result = test.ci1.compareTo(test.ci2);

        console.log(`Test ${idx + 1}: ${test.name}`);
        console.log(`  Similarity: ${result} (${(result * 100).toFixed(1)}%)`);

        if (result >= test.expectedMin && result <= test.expectedMax) {
            console.log(`  ✅ Within expected range [${test.expectedMin}, ${test.expectedMax}]`);
            passed++;
        } else if (result > test.expectedMax) {
            console.log(`  ⚠️ Above expected maximum ${test.expectedMax}`);
        } else {
            console.log(`  ⚠️ Below expected minimum ${test.expectedMin}`);
        }
        console.log('');
    });

    console.log(`Email Matching: ${passed}/${total} passed\n`);
    return { passed, total };
}

/**
 * Test perfect match override logic
 */
function testPerfectMatchOverride() {
    console.log(' === Testing Perfect Match Override (0.9 weight) ===\n');

    let passed = 0;
    let total = 0;

    const testCases = [
        {
            name: 'Perfect primary, poor secondary and email',
            ci1: createTestContactInfo(
                createTestAddress('123', 'Main St', 'Providence', 'RI', '02903'),
                [createTestAddress('789', 'Elm Dr', 'Boston', 'MA', '02101')],
                'john@example.com'
            ),
            ci2: createTestContactInfo(
                createTestAddress('123', 'Main St', 'Providence', 'RI', '02903'),
                [createTestAddress('456', 'Oak Ave', 'Warwick', 'RI', '02886')],
                'mary@different.org'
            ),
            expectedMin: 0.9,  // Perfect primary triggers 0.9 override
            expectedMax: 1.0
        },
        {
            name: 'Perfect email, poor addresses',
            ci1: createTestContactInfo(
                createTestAddress('123', 'Main St', 'Providence', 'RI', '02903'),
                [],
                'shared@company.com'
            ),
            ci2: createTestContactInfo(
                createTestAddress('456', 'Oak Ave', 'Boston', 'MA', '02101'),
                [],
                'shared@company.com'
            ),
            expectedMin: 0.9,  // Perfect email triggers 0.9 override
            expectedMax: 1.0
        }
    ];

    testCases.forEach((test, idx) => {
        total++;
        const result = test.ci1.compareTo(test.ci2);

        console.log(`Test ${idx + 1}: ${test.name}`);
        console.log(`  Similarity: ${result} (${(result * 100).toFixed(1)}%)`);

        if (result >= test.expectedMin && result <= test.expectedMax) {
            console.log(`  ✅ Within expected range [${test.expectedMin}, ${test.expectedMax}]`);
            passed++;
        } else if (result > test.expectedMax) {
            console.log(`  ⚠️ Above expected maximum ${test.expectedMax}`);
        } else {
            console.log(`  ⚠️ Below expected minimum ${test.expectedMin}`);
        }
        console.log('');
    });

    console.log(`Perfect Match Override: ${passed}/${total} passed\n`);
    return { passed, total };
}

/**
 * Test with real loaded entities
 */
function testWithRealEntities(sampleSize = 5) {
    console.log(' === Testing with Real Loaded Entities ===\n');

    if (typeof workingLoadedEntities === 'undefined' || !workingLoadedEntities.bloomerang) {
        console.log('❌ No entities loaded. Click "🚀 Load All Entities Into Memory" first.');
        return;
    }

    const individuals = workingLoadedEntities.bloomerang.individuals;
    if (!individuals || !individuals.entities) {
        console.log('❌ No individual entities found.');
        return;
    }

    // Find entities with contactInfo
    const entitiesWithContactInfo = [];
    Object.keys(individuals.entities).forEach(key => {
        const entity = individuals.entities[key];
        if (entity.contactInfo && entity.contactInfo.primaryAddress) {
            entitiesWithContactInfo.push(entity);
        }
    });

    console.log(`Found ${entitiesWithContactInfo.length} entities with contactInfo`);
    console.log(`Testing first ${sampleSize} entities against each other...\n`);

    const sample = entitiesWithContactInfo.slice(0, sampleSize);

    for (let i = 0; i < sample.length; i++) {
        for (let j = i + 1; j < sample.length; j++) {
            const e1 = sample[i];
            const e2 = sample[j];

            const ci1 = e1.contactInfo;
            const ci2 = e2.contactInfo;

            // Get display info - handle various entity name structures
            let name1 = 'Unknown';
            if (e1.name && e1.name.identifier) {
                const id = e1.name.identifier;
                name1 = `${id.firstName || ''} ${id.lastName || ''}`.trim() || (id.primaryAlias ? id.primaryAlias.term : 'Unknown');
            }
            let name2 = 'Unknown';
            if (e2.name && e2.name.identifier) {
                const id = e2.name.identifier;
                name2 = `${id.firstName || ''} ${id.lastName || ''}`.trim() || (id.primaryAlias ? id.primaryAlias.term : 'Unknown');
            }
            const addr1 = ci1.primaryAddress && ci1.primaryAddress.primaryAlias ? ci1.primaryAddress.primaryAlias.term : 'No address';
            const addr2 = ci2.primaryAddress && ci2.primaryAddress.primaryAlias ? ci2.primaryAddress.primaryAlias.term : 'No address';

            try {
                const result = ci1.compareTo(ci2);
                console.log(`${name1}: "${addr1}"`);
                console.log(`${name2}: "${addr2}"`);
                console.log(`  Similarity: ${result} (${(result * 100).toFixed(1)}%)`);
                console.log('');
            } catch (err) {
                console.log(`Error comparing: ${err.message}`);
            }
        }
    }
}

/**
 * Run all Phase 3 tests
 */
function runPhase3Tests() {
    console.log(' ╔════════════════════════════════════════════════════════════╗');
    console.log(' ║     PHASE 3: ContactInfo compareTo Testing                 ║');
    console.log(' ║     Address Matching with Perfect Match Override           ║');
    console.log(' ╚════════════════════════════════════════════════════════════╝\n');

    testContactInfoSetup();

    const results = {
        primaryAddress: testPrimaryAddressMatching(),
        secondaryAddress: testSecondaryAddressMatching(),
        email: testEmailMatching(),
        perfectMatchOverride: testPerfectMatchOverride()
    };

    testWithRealEntities(5);

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    Phase 3 Tests Complete                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    // Summary
    let totalPassed = 0;
    let totalTests = 0;
    Object.values(results).forEach(r => {
        totalPassed += r.passed;
        totalTests += r.total;
    });

    console.log(`\nOverall: ${totalPassed}/${totalTests} tests passed`);
}

// Export for browser
if (typeof window !== 'undefined') {
    window.createTestAddress = createTestAddress;
    window.createTestContactInfo = createTestContactInfo;
    window.testContactInfoSetup = testContactInfoSetup;
    window.testPrimaryAddressMatching = testPrimaryAddressMatching;
    window.testSecondaryAddressMatching = testSecondaryAddressMatching;
    window.testEmailMatching = testEmailMatching;
    window.testPerfectMatchOverride = testPerfectMatchOverride;
    window.testWithRealEntities = testWithRealEntities;
    window.runPhase3Tests = runPhase3Tests;
}

console.log('Phase 3 test functions loaded. Run runPhase3Tests() to execute all tests.');
