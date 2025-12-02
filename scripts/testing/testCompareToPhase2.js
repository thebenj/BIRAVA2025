// =============================================================================
// Phase 2 Testing: Address.compareTo with Conditional Logic
// - PO Box addresses
// - Block Island addresses
// - General street addresses
// Run in browser console after loading entities
// =============================================================================

/**
 * Create an Address object from components for testing
 * @param {Object} components - Address components
 * @returns {Address} Address instance
 */
function createTestAddress(components) {
    const primaryAlias = new AttributedTerm(
        components.original || 'TEST ADDRESS',
        'TEST',
        0,
        'test'
    );
    const address = new Address(primaryAlias);

    // Set each component as AttributedTerm
    if (components.streetNumber) {
        address.streetNumber = new AttributedTerm(components.streetNumber, 'TEST', 0, 'street_number');
    }
    if (components.streetName) {
        address.streetName = new AttributedTerm(components.streetName, 'TEST', 0, 'street_name');
    }
    if (components.streetType) {
        address.streetType = new AttributedTerm(components.streetType, 'TEST', 0, 'street_type');
    }
    if (components.city) {
        address.city = new AttributedTerm(components.city, 'TEST', 0, 'city');
    }
    if (components.state) {
        address.state = new AttributedTerm(components.state, 'TEST', 0, 'state');
    }
    if (components.zipCode) {
        address.zipCode = new AttributedTerm(components.zipCode, 'TEST', 0, 'zip_code');
    }
    if (components.secUnitType) {
        address.secUnitType = new AttributedTerm(components.secUnitType, 'TEST', 0, 'unit_type');
    }
    if (components.secUnitNum) {
        address.secUnitNum = new AttributedTerm(components.secUnitNum, 'TEST', 0, 'unit_num');
    }
    if (components.isBlockIsland !== undefined) {
        address.isBlockIslandAddress = new AttributedTerm(components.isBlockIsland, 'TEST', 0, 'is_bi');
    }

    return address;
}

/**
 * Test Address.initializeWeightedComparison setup
 */
function testAddressWeightedComparisonSetup() {
    console.log('=== Testing Address.initializeWeightedComparison Setup ===\n');

    if (typeof Address === 'undefined') {
        console.error('❌ Address class not loaded. Make sure aliasClasses.js is loaded.');
        return false;
    }

    const addr = createTestAddress({ streetNumber: '123', streetName: 'Main', city: 'Block Island' });

    console.log('Address comparisonWeights:', addr.comparisonWeights);
    console.log('Address comparisonCalculatorName:', addr.comparisonCalculatorName);
    console.log('Address comparisonCalculator type:', typeof addr.comparisonCalculator);

    // Verify using new calculator
    if (addr.comparisonCalculatorName === 'addressWeightedComparison') {
        console.log('✅ Using addressWeightedComparison calculator');
    } else {
        console.error('❌ Not using addressWeightedComparison calculator');
        return false;
    }

    console.log('');
    return true;
}

/**
 * Test isPOBoxAddress detection
 */
function testPOBoxDetection() {
    console.log('=== Testing PO Box Detection ===\n');

    const testCases = [
        { secUnitType: 'PO Box', expected: true, desc: 'PO Box' },
        { secUnitType: 'P.O. Box', expected: true, desc: 'P.O. Box' },
        { secUnitType: 'po box', expected: true, desc: 'po box (lowercase)' },
        { secUnitType: 'POB', expected: true, desc: 'POB' },
        { secUnitType: 'Post Office Box', expected: true, desc: 'Post Office Box' },
        { secUnitType: 'pobox', expected: true, desc: 'pobox (no space)' },
        { streetName: 'PO Box 123', expected: true, desc: 'PO Box in streetName' },
        { secUnitType: 'Apt', expected: false, desc: 'Apt (not PO Box)' },
        { streetName: 'Main St', expected: false, desc: 'Regular street' },
    ];

    let passed = 0;
    testCases.forEach(test => {
        const addr = createTestAddress(test);
        const result = isPOBoxAddress(addr);
        const status = result === test.expected ? '✅' : '❌';
        if (result === test.expected) passed++;
        console.log(`${status} ${test.desc}: isPOBoxAddress = ${result} (expected ${test.expected})`);
    });

    console.log(`\nPO Box Detection: ${passed}/${testCases.length} passed\n`);
}

/**
 * Test PO Box vs PO Box comparison
 */
function testPOBoxComparison() {
    console.log('=== Testing PO Box vs PO Box Comparison ===\n');

    const testCases = [
        // Same PO Box, same zip
        {
            addr1: { secUnitType: 'PO Box', secUnitNum: '648', city: 'New Shoreham', state: 'RI', zipCode: '02807' },
            addr2: { secUnitType: 'PO Box', secUnitNum: '648', city: 'New Shoreham', state: 'RI', zipCode: '02807' },
            desc: 'Identical PO Boxes (same zip)',
            expectedMin: 0.95
        },
        // Different PO Box numbers, same zip
        {
            addr1: { secUnitType: 'PO Box', secUnitNum: '648', city: 'New Shoreham', state: 'RI', zipCode: '02807' },
            addr2: { secUnitType: 'PO Box', secUnitNum: '247', city: 'New Shoreham', state: 'RI', zipCode: '02807' },
            desc: 'Different PO Box numbers, same zip (should NOT be 100%)',
            expectedMax: 0.7
        },
        // Similar PO Box numbers (typo), same zip
        {
            addr1: { secUnitType: 'PO Box', secUnitNum: '648', city: 'New Shoreham', state: 'RI', zipCode: '02807' },
            addr2: { secUnitType: 'PO Box', secUnitNum: '649', city: 'New Shoreham', state: 'RI', zipCode: '02807' },
            desc: 'Similar PO Box numbers (648 vs 649), same zip',
            expectedMin: 0.5
        },
        // Same PO Box, different zip (should fail zip check)
        {
            addr1: { secUnitType: 'PO Box', secUnitNum: '648', city: 'New Shoreham', state: 'RI', zipCode: '02807' },
            addr2: { secUnitType: 'PO Box', secUnitNum: '648', city: 'Providence', state: 'RI', zipCode: '02903' },
            desc: 'Same PO Box number, different zip',
            expectedMax: 0.5
        },
        // PO Box without zip (city/state comparison)
        {
            addr1: { secUnitType: 'PO Box', secUnitNum: '648', city: 'New Shoreham', state: 'RI' },
            addr2: { secUnitType: 'PO Box', secUnitNum: '648', city: 'New Shoreham', state: 'RI' },
            desc: 'Same PO Box, no zip (uses city/state)',
            expectedMin: 0.9
        },
    ];

    testCases.forEach((test, index) => {
        const addr1 = createTestAddress(test.addr1);
        const addr2 = createTestAddress(test.addr2);

        try {
            const result = addr1.compareTo(addr2);
            const percentage = (result * 100).toFixed(1);

            console.log(`Test ${index + 1}: ${test.desc}`);
            console.log(`  PO Box ${test.addr1.secUnitNum} vs PO Box ${test.addr2.secUnitNum}`);
            console.log(`  Similarity: ${result} (${percentage}%)`);

            // Check expectations
            let status = '✅';
            if (test.expectedMin !== undefined && result < test.expectedMin) {
                status = '⚠️';
                console.log(`  ${status} Below expected minimum ${test.expectedMin}`);
            } else if (test.expectedMax !== undefined && result > test.expectedMax) {
                status = '⚠️';
                console.log(`  ${status} Above expected maximum ${test.expectedMax}`);
            } else {
                console.log(`  ${status} Within expected range`);
            }
        } catch (err) {
            console.error(`Test ${index + 1}: ${test.desc} - ERROR: ${err.message}`);
        }
        console.log('');
    });
}

/**
 * Test Block Island address comparison
 */
function testBlockIslandComparison() {
    console.log('=== Testing Block Island Address Comparison ===\n');

    const testCases = [
        // Same BI address
        {
            addr1: { streetNumber: '57', streetName: 'CORN NECK', city: 'Block Island', state: 'RI', zipCode: '02807' },
            addr2: { streetNumber: '57', streetName: 'CORN NECK', city: 'Block Island', state: 'RI', zipCode: '02807' },
            desc: 'Identical BI addresses',
            expectedMin: 0.95
        },
        // Same fire number, different street name spelling
        {
            addr1: { streetNumber: '57', streetName: 'CORN NECK', city: 'Block Island', state: 'RI', zipCode: '02807' },
            addr2: { streetNumber: '57', streetName: 'CORNNECK', city: 'Block Island', state: 'RI', zipCode: '02807' },
            desc: 'Same fire number, street name variation',
            expectedMin: 0.9
        },
        // Different fire numbers, same street
        {
            addr1: { streetNumber: '57', streetName: 'CORN NECK', city: 'Block Island', state: 'RI', zipCode: '02807' },
            addr2: { streetNumber: '123', streetName: 'CORN NECK', city: 'Block Island', state: 'RI', zipCode: '02807' },
            desc: 'Different fire numbers, same street',
            expectedMax: 0.5
        },
        // Fire number is most important for BI
        {
            addr1: { streetNumber: '57', streetName: 'CORN NECK', city: 'Block Island', state: 'RI', zipCode: '02807' },
            addr2: { streetNumber: '57', streetName: 'OLD TOWN', city: 'Block Island', state: 'RI', zipCode: '02807' },
            desc: 'Same fire number, different street (fire # dominates)',
            expectedMin: 0.7
        },
    ];

    testCases.forEach((test, index) => {
        const addr1 = createTestAddress(test.addr1);
        const addr2 = createTestAddress(test.addr2);

        try {
            const result = addr1.compareTo(addr2);
            const percentage = (result * 100).toFixed(1);

            console.log(`Test ${index + 1}: ${test.desc}`);
            console.log(`  ${test.addr1.streetNumber} ${test.addr1.streetName} vs ${test.addr2.streetNumber} ${test.addr2.streetName}`);
            console.log(`  Similarity: ${result} (${percentage}%)`);

            // Check expectations
            let status = '✅';
            if (test.expectedMin !== undefined && result < test.expectedMin) {
                status = '⚠️';
                console.log(`  ${status} Below expected minimum ${test.expectedMin}`);
            } else if (test.expectedMax !== undefined && result > test.expectedMax) {
                status = '⚠️';
                console.log(`  ${status} Above expected maximum ${test.expectedMax}`);
            } else {
                console.log(`  ${status} Within expected range`);
            }
        } catch (err) {
            console.error(`Test ${index + 1}: ${test.desc} - ERROR: ${err.message}`);
        }
        console.log('');
    });
}

/**
 * Test General street address comparison
 */
function testGeneralAddressComparison() {
    console.log('=== Testing General Street Address Comparison ===\n');

    const testCases = [
        // Identical addresses
        {
            addr1: { streetNumber: '123', streetName: 'MAIN', city: 'PROVIDENCE', state: 'RI', zipCode: '02903' },
            addr2: { streetNumber: '123', streetName: 'MAIN', city: 'PROVIDENCE', state: 'RI', zipCode: '02903' },
            desc: 'Identical addresses',
            expectedMin: 0.95
        },
        // Same street, different number
        {
            addr1: { streetNumber: '123', streetName: 'MAIN', city: 'PROVIDENCE', state: 'RI', zipCode: '02903' },
            addr2: { streetNumber: '456', streetName: 'MAIN', city: 'PROVIDENCE', state: 'RI', zipCode: '02903' },
            desc: 'Same street, different number',
            expectedMin: 0.5
        },
        // Different zip codes (should have big impact)
        {
            addr1: { streetNumber: '123', streetName: 'MAIN', city: 'PROVIDENCE', state: 'RI', zipCode: '02903' },
            addr2: { streetNumber: '123', streetName: 'MAIN', city: 'BOSTON', state: 'MA', zipCode: '02101' },
            desc: 'Different zip codes',
            expectedMax: 0.6
        },
        // No zip, use city/state
        {
            addr1: { streetNumber: '123', streetName: 'MAIN', city: 'PROVIDENCE', state: 'RI' },
            addr2: { streetNumber: '123', streetName: 'MAIN', city: 'PROVIDENCE', state: 'RI' },
            desc: 'Same address, no zip',
            expectedMin: 0.9
        },
    ];

    testCases.forEach((test, index) => {
        const addr1 = createTestAddress(test.addr1);
        const addr2 = createTestAddress(test.addr2);

        try {
            const result = addr1.compareTo(addr2);
            const percentage = (result * 100).toFixed(1);

            console.log(`Test ${index + 1}: ${test.desc}`);
            console.log(`  ${test.addr1.streetNumber} ${test.addr1.streetName}, ${test.addr1.city || 'N/A'}`);
            console.log(`  vs ${test.addr2.streetNumber} ${test.addr2.streetName}, ${test.addr2.city || 'N/A'}`);
            console.log(`  Similarity: ${result} (${percentage}%)`);

            // Check expectations
            let status = '✅';
            if (test.expectedMin !== undefined && result < test.expectedMin) {
                status = '⚠️';
                console.log(`  ${status} Below expected minimum ${test.expectedMin}`);
            } else if (test.expectedMax !== undefined && result > test.expectedMax) {
                status = '⚠️';
                console.log(`  ${status} Above expected maximum ${test.expectedMax}`);
            } else {
                console.log(`  ${status} Within expected range`);
            }
        } catch (err) {
            console.error(`Test ${index + 1}: ${test.desc} - ERROR: ${err.message}`);
        }
        console.log('');
    });
}

/**
 * Test with real addresses from loaded entities
 */
function testWithRealAddresses(sampleSize = 5) {
    console.log('=== Testing with Real Loaded Addresses ===\n');

    if (typeof workingLoadedEntities === 'undefined') {
        console.error('❌ No entities loaded. Click "🚀 Load All Entities Into Memory" first.');
        return;
    }

    // Collect addresses from entities
    const addresses = [];

    // From Bloomerang individuals
    if (workingLoadedEntities.bloomerang && workingLoadedEntities.bloomerang.individuals) {
        const individuals = workingLoadedEntities.bloomerang.individuals.entities;
        for (let key in individuals) {
            const entity = individuals[key];
            if (entity.contactInfo && entity.contactInfo.primaryAddress) {
                addresses.push({
                    address: entity.contactInfo.primaryAddress,
                    source: 'Bloomerang',
                    entityName: entity.name ? `${entity.name.firstName || ''} ${entity.name.lastName || ''}`.trim() : 'Unknown'
                });
            }
            if (addresses.length >= sampleSize * 2) break;
        }
    }

    console.log(`Found ${addresses.length} addresses with primaryAddress`);
    console.log(`Testing first ${Math.min(sampleSize, addresses.length)} addresses against each other...\n`);

    const sample = addresses.slice(0, sampleSize);

    // Compare each pair
    for (let i = 0; i < sample.length; i++) {
        for (let j = i + 1; j < sample.length; j++) {
            const a1 = sample[i];
            const a2 = sample[j];

            try {
                // Detect address types for display
                const type1 = isPOBoxAddress(a1.address) ? 'PO Box' :
                              isBlockIslandZip(a1.address.zipCode) ? 'BI' : 'General';
                const type2 = isPOBoxAddress(a2.address) ? 'PO Box' :
                              isBlockIslandZip(a2.address.zipCode) ? 'BI' : 'General';

                const result = a1.address.compareTo(a2.address);
                const street1 = a1.address.getStreetDisplay ? a1.address.getStreetDisplay() : 'N/A';
                const street2 = a2.address.getStreetDisplay ? a2.address.getStreetDisplay() : 'N/A';
                const city1 = a1.address.city ? a1.address.city.term : 'N/A';
                const city2 = a2.address.city ? a2.address.city.term : 'N/A';

                console.log(`[${type1}] ${a1.entityName}: "${street1}, ${city1}"`);
                console.log(`[${type2}] ${a2.entityName}: "${street2}, ${city2}"`);
                console.log(`  Similarity: ${result} (${(result * 100).toFixed(1)}%)`);
                console.log('');
            } catch (err) {
                console.error(`Error comparing addresses: ${err.message}`);
            }
        }
    }
}

/**
 * Run all Phase 2 tests
 */
function runPhase2Tests() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     PHASE 2: Address compareTo Testing                     ║');
    console.log('║     Conditional Logic: PO Box / Block Island / General     ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    testAddressWeightedComparisonSetup();
    testPOBoxDetection();
    testPOBoxComparison();
    testBlockIslandComparison();
    testGeneralAddressComparison();
    testWithRealAddresses(5);

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    Phase 2 Tests Complete                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
}

// Export for browser
if (typeof window !== 'undefined') {
    window.createTestAddress = createTestAddress;
    window.testAddressWeightedComparisonSetup = testAddressWeightedComparisonSetup;
    window.testPOBoxDetection = testPOBoxDetection;
    window.testPOBoxComparison = testPOBoxComparison;
    window.testBlockIslandComparison = testBlockIslandComparison;
    window.testGeneralAddressComparison = testGeneralAddressComparison;
    window.testWithRealAddresses = testWithRealAddresses;
    window.runPhase2Tests = runPhase2Tests;
}

console.log('Phase 2 test functions loaded. Run runPhase2Tests() to execute all tests.');
