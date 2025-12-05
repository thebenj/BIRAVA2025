// =============================================================================
// Unit Tests: Fire Number Collision Handler
// Run in browser console after loading the fireNumberCollisionHandler.js
// =============================================================================

/**
 * Test helper: Create a mock entity for testing
 * @param {Object} options - Entity configuration
 * @returns {Object} Mock entity object
 */
function createMockEntity(options = {}) {
    const {
        firstName = 'JOHN',
        lastName = 'SMITH',
        middleName = '',
        pid = '12345',
        fireNumber = '100',
        primaryStreet = '123 OCEAN AVE',
        primaryCity = 'NEW SHOREHAM',
        primaryState = 'RI',
        primaryZip = '02807',
        secondaryStreet = '456 MAIN ST',
        secondaryCity = 'BOSTON',
        secondaryState = 'MA',
        secondaryZip = '02101'
    } = options;

    // Create name using real class if available, otherwise mock
    let name;
    if (typeof IndividualName !== 'undefined' && typeof AttributedTerm !== 'undefined') {
        const primaryAlias = new AttributedTerm(`${firstName} ${lastName}`, 'TEST', 0, 'test');
        name = new IndividualName(primaryAlias, '', firstName, middleName, lastName, '');
    } else {
        // Mock name object with compareTo
        name = {
            firstName,
            lastName,
            middleName,
            compareTo: function(other) {
                // Simple mock comparison
                const lastSim = this.lastName === other.lastName ? 1 : 0.5;
                const firstSim = this.firstName === other.firstName ? 1 : 0.5;
                return lastSim * 0.5 + firstSim * 0.4;
            },
            toString: function() {
                return `${this.firstName} ${this.lastName}`;
            }
        };
    }

    // Create addresses using real class if available
    let primaryAddress, secondaryAddress;
    if (typeof Address !== 'undefined') {
        primaryAddress = new Address();
        primaryAddress.streetNumber = primaryStreet.split(' ')[0];
        primaryAddress.streetName = primaryStreet.split(' ').slice(1).join(' ');
        primaryAddress.city = primaryCity;
        primaryAddress.state = primaryState;
        primaryAddress.zipCode = primaryZip;

        secondaryAddress = new Address();
        secondaryAddress.streetNumber = secondaryStreet.split(' ')[0];
        secondaryAddress.streetName = secondaryStreet.split(' ').slice(1).join(' ');
        secondaryAddress.city = secondaryCity;
        secondaryAddress.state = secondaryState;
        secondaryAddress.zipCode = secondaryZip;
    } else {
        // Mock addresses
        primaryAddress = {
            streetNumber: primaryStreet.split(' ')[0],
            streetName: primaryStreet.split(' ').slice(1).join(' '),
            city: primaryCity,
            state: primaryState,
            zipCode: primaryZip,
            compareTo: function(other) {
                if (this.zipCode === other.zipCode && this.streetName === other.streetName) return 1;
                if (this.zipCode === other.zipCode) return 0.7;
                return 0.3;
            }
        };
        secondaryAddress = {
            streetNumber: secondaryStreet.split(' ')[0],
            streetName: secondaryStreet.split(' ').slice(1).join(' '),
            city: secondaryCity,
            state: secondaryState,
            zipCode: secondaryZip,
            compareTo: function(other) {
                if (this.zipCode === other.zipCode && this.streetName === other.streetName) return 1;
                if (this.zipCode === other.zipCode) return 0.7;
                return 0.3;
            }
        };
    }

    // Create contactInfo
    let contactInfo;
    if (typeof ContactInfo !== 'undefined') {
        contactInfo = new ContactInfo();
        contactInfo.setPrimaryAddress(primaryAddress);
        contactInfo.addSecondaryAddress(secondaryAddress);
    } else {
        contactInfo = {
            primaryAddress,
            secondaryAddress: [secondaryAddress]
        };
    }

    // Create otherInfo
    let otherInfo;
    if (typeof OtherInfo !== 'undefined') {
        otherInfo = new OtherInfo();
    } else {
        otherInfo = {
            subdivision: null,
            addSubdivisionEntry: function(pid, entity) {
                if (!this.subdivision) this.subdivision = {};
                this.subdivision[pid] = JSON.stringify(entity);
            },
            getSubdivisionPids: function() {
                return this.subdivision ? Object.keys(this.subdivision) : [];
            },
            hasSubdivision: function() {
                return this.subdivision !== null && Object.keys(this.subdivision).length > 0;
            }
        };
    }

    // Create locationIdentifier
    const locationIdentifier = {
        pid: pid,
        fireNumber: fireNumber
    };

    // Return mock entity
    return {
        name,
        contactInfo,
        otherInfo,
        locationIdentifier,
        serialize: function() {
            return {
                type: 'Individual',
                name: { firstName, lastName },
                locationIdentifier: { pid, fireNumber }
            };
        }
    };
}

// =============================================================================
// Registry Function Tests
// =============================================================================

/**
 * Test: initializeRegistry and clearRegistry
 */
function testRegistryInitialization() {
    console.log('=== Test: Registry Initialization ===\n');
    let passed = 0, failed = 0;

    // Test 1: Initialize empty registry
    initializeRegistry();
    const stats1 = getRegistryStats();
    if (stats1.totalBaseFireNumbers === 0 && stats1.totalEntities === 0) {
        console.log('  ✅ PASS: initializeRegistry creates empty registry');
        passed++;
    } else {
        console.log('  ❌ FAIL: initializeRegistry should create empty registry');
        failed++;
    }

    // Test 2: Register then clear
    const mockEntity = createMockEntity({ fireNumber: '100' });
    registerFireNumber('100', mockEntity);
    clearRegistry();
    const stats2 = getRegistryStats();
    if (stats2.totalBaseFireNumbers === 0) {
        console.log('  ✅ PASS: clearRegistry empties the registry');
        passed++;
    } else {
        console.log('  ❌ FAIL: clearRegistry should empty the registry');
        failed++;
    }

    console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
    return { passed, failed };
}

/**
 * Test: registerFireNumber and isFireNumberUsed
 */
function testFireNumberRegistration() {
    console.log('=== Test: Fire Number Registration ===\n');
    let passed = 0, failed = 0;

    initializeRegistry();

    // Test 1: Register first fire number
    const entity1 = createMockEntity({ fireNumber: '100', pid: 'PID001' });
    registerFireNumber('100', entity1);
    if (isFireNumberUsed('100')) {
        console.log('  ✅ PASS: Fire number 100 is registered');
        passed++;
    } else {
        console.log('  ❌ FAIL: Fire number 100 should be registered');
        failed++;
    }

    // Test 2: Unregistered fire number
    if (!isFireNumberUsed('999')) {
        console.log('  ✅ PASS: Fire number 999 is not registered');
        passed++;
    } else {
        console.log('  ❌ FAIL: Fire number 999 should not be registered');
        failed++;
    }

    // Test 3: Register suffixed fire number
    const entity2 = createMockEntity({ fireNumber: '100A', pid: 'PID002' });
    registerFireNumber('100A', entity2);
    const entities = getAllEntitiesForFireNumber('100');
    if (entities.length === 2) {
        console.log('  ✅ PASS: Both 100 and 100A are tracked under base 100');
        passed++;
    } else {
        console.log(`  ❌ FAIL: Expected 2 entities under base 100, got ${entities.length}`);
        failed++;
    }

    // Test 4: Stats reflect multiple entities
    const stats = getRegistryStats();
    if (stats.totalEntities === 2 && stats.totalBaseFireNumbers === 1) {
        console.log('  ✅ PASS: Stats show 2 entities, 1 base fire number');
        passed++;
    } else {
        console.log(`  ❌ FAIL: Stats incorrect - got ${JSON.stringify(stats)}`);
        failed++;
    }

    clearRegistry();
    console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
    return { passed, failed };
}

/**
 * Test: getNextAvailableSuffix
 */
function testSuffixGeneration() {
    console.log('=== Test: Suffix Generation ===\n');
    let passed = 0, failed = 0;

    initializeRegistry();

    // Test 1: First suffix for new fire number
    const suffix1 = getNextAvailableSuffix('100');
    if (suffix1 === 'A') {
        console.log('  ✅ PASS: First available suffix is A');
        passed++;
    } else {
        console.log(`  ❌ FAIL: Expected A, got ${suffix1}`);
        failed++;
    }

    // Test 2: Register entity, next suffix should still be A (first entity has no suffix)
    const entity1 = createMockEntity({ fireNumber: '100' });
    registerFireNumber('100', entity1);
    const suffix2 = getNextAvailableSuffix('100');
    if (suffix2 === 'A') {
        console.log('  ✅ PASS: After registering base, next suffix is still A');
        passed++;
    } else {
        console.log(`  ❌ FAIL: Expected A, got ${suffix2}`);
        failed++;
    }

    // Test 3: Register 100A, next should be B
    const entity2 = createMockEntity({ fireNumber: '100A' });
    registerFireNumber('100A', entity2);
    const suffix3 = getNextAvailableSuffix('100');
    if (suffix3 === 'B') {
        console.log('  ✅ PASS: After using A, next suffix is B');
        passed++;
    } else {
        console.log(`  ❌ FAIL: Expected B, got ${suffix3}`);
        failed++;
    }

    // Test 4: Register 100B, next should be C
    const entity3 = createMockEntity({ fireNumber: '100B' });
    registerFireNumber('100B', entity3);
    const suffix4 = getNextAvailableSuffix('100');
    if (suffix4 === 'C') {
        console.log('  ✅ PASS: After using A,B, next suffix is C');
        passed++;
    } else {
        console.log(`  ❌ FAIL: Expected C, got ${suffix4}`);
        failed++;
    }

    clearRegistry();
    console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
    return { passed, failed };
}

// =============================================================================
// Fire Number Utility Tests
// =============================================================================

/**
 * Test: getBaseFireNumber and getSuffix
 */
function testFireNumberUtilities() {
    console.log('=== Test: Fire Number Utilities ===\n');
    let passed = 0, failed = 0;

    // Test getBaseFireNumber
    const testCases = [
        { input: '100', expected: '100', desc: 'No suffix' },
        { input: '100A', expected: '100', desc: 'With suffix A' },
        { input: '12345B', expected: '12345', desc: 'Longer number with B' },
        { input: '1Z', expected: '1', desc: 'Single digit with Z' },
        { input: '', expected: '', desc: 'Empty string' },
        { input: null, expected: '', desc: 'Null input' },
    ];

    console.log('  getBaseFireNumber tests:');
    testCases.forEach(test => {
        const result = getBaseFireNumber(test.input);
        if (result === test.expected) {
            console.log(`    ✅ ${test.desc}: "${test.input}" → "${result}"`);
            passed++;
        } else {
            console.log(`    ❌ ${test.desc}: "${test.input}" → "${result}" (expected "${test.expected}")`);
            failed++;
        }
    });

    // Test getSuffix
    console.log('\n  getSuffix tests:');
    const suffixTests = [
        { fn: '100A', base: '100', expected: 'A', desc: 'Suffix A' },
        { fn: '100B', base: '100', expected: 'B', desc: 'Suffix B' },
        { fn: '100', base: '100', expected: null, desc: 'No suffix' },
        { fn: null, base: '100', expected: null, desc: 'Null fire number' },
    ];

    suffixTests.forEach(test => {
        const result = getSuffix(test.fn, test.base);
        if (result === test.expected) {
            console.log(`    ✅ ${test.desc}: getSuffix("${test.fn}", "${test.base}") → ${result}`);
            passed++;
        } else {
            console.log(`    ❌ ${test.desc}: expected ${test.expected}, got ${result}`);
            failed++;
        }
    });

    console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
    return { passed, failed };
}

// =============================================================================
// Comparison Function Tests
// =============================================================================

/**
 * Test: compareSecondaryAddressesOnly
 */
function testSecondaryAddressComparison() {
    console.log('=== Test: Secondary Address Comparison ===\n');
    let passed = 0, failed = 0;

    // Test 1: Both have secondary addresses that match
    const entity1 = createMockEntity({
        secondaryStreet: '456 MAIN ST',
        secondaryCity: 'BOSTON',
        secondaryZip: '02101'
    });
    const entity2 = createMockEntity({
        secondaryStreet: '456 MAIN ST',
        secondaryCity: 'BOSTON',
        secondaryZip: '02101'
    });
    const sim1 = compareSecondaryAddressesOnly(entity1.contactInfo, entity2.contactInfo);
    if (sim1 > 0.9) {
        console.log(`  ✅ PASS: Matching secondary addresses: ${(sim1 * 100).toFixed(1)}%`);
        passed++;
    } else {
        console.log(`  ❌ FAIL: Expected high similarity for matching addresses, got ${(sim1 * 100).toFixed(1)}%`);
        failed++;
    }

    // Test 2: Neither has secondary addresses
    const entity3 = createMockEntity({});
    const entity4 = createMockEntity({});
    entity3.contactInfo.secondaryAddress = [];
    entity4.contactInfo.secondaryAddress = [];
    const sim2 = compareSecondaryAddressesOnly(entity3.contactInfo, entity4.contactInfo);
    if (sim2 === 0) {
        console.log('  ✅ PASS: No secondary addresses returns 0');
        passed++;
    } else {
        console.log(`  ❌ FAIL: Expected 0 for no secondary addresses, got ${sim2}`);
        failed++;
    }

    // Test 3: Only one has secondary address
    const entity5 = createMockEntity({});
    const entity6 = createMockEntity({});
    entity6.contactInfo.secondaryAddress = [];
    const sim3 = compareSecondaryAddressesOnly(entity5.contactInfo, entity6.contactInfo);
    if (sim3 === 0) {
        console.log('  ✅ PASS: One-sided secondary addresses returns 0');
        passed++;
    } else {
        console.log(`  ❌ FAIL: Expected 0 when only one has secondary, got ${sim3}`);
        failed++;
    }

    // Test 4: Different secondary addresses
    // Note: addressWeightedComparison gives partial credit for various components,
    // so even very different addresses may score higher than intuitively expected.
    // The key requirement is that they're well below the 95% same-owner threshold.
    const entity7 = createMockEntity({
        secondaryStreet: '100 FIRST ST',
        secondaryCity: 'NEW YORK',
        secondaryZip: '10001'
    });
    const entity8 = createMockEntity({
        secondaryStreet: '999 LAST AVE',
        secondaryCity: 'LOS ANGELES',
        secondaryZip: '90001'
    });
    const sim4 = compareSecondaryAddressesOnly(entity7.contactInfo, entity8.contactInfo);
    if (sim4 < 0.95) {
        console.log(`  ✅ PASS: Different secondary addresses below same-owner threshold: ${(sim4 * 100).toFixed(1)}%`);
        passed++;
    } else {
        console.log(`  ❌ FAIL: Different addresses should be below 95% threshold, got ${(sim4 * 100).toFixed(1)}%`);
        failed++;
    }

    console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
    return { passed, failed };
}

/**
 * Test: compareForFireNumberCollision
 */
function testCollisionComparison() {
    console.log('=== Test: Collision Comparison ===\n');
    let passed = 0, failed = 0;

    // Test 1: Identical entities should be same owner
    const entity1 = createMockEntity({ firstName: 'JOHN', lastName: 'SMITH' });
    const entity2 = createMockEntity({ firstName: 'JOHN', lastName: 'SMITH' });
    const result1 = compareForFireNumberCollision(entity1, entity2);
    if (result1.isSameOwner && result1.nameSimilarity > 0.9) {
        console.log(`  ✅ PASS: Identical entities are same owner (name: ${(result1.nameSimilarity * 100).toFixed(1)}%)`);
        passed++;
    } else {
        console.log(`  ❌ FAIL: Identical entities should be same owner, got ${JSON.stringify(result1)}`);
        failed++;
    }

    // Test 2: Completely different entities should be different owner
    const entity3 = createMockEntity({ firstName: 'JOHN', lastName: 'SMITH' });
    const entity4 = createMockEntity({ firstName: 'JANE', lastName: 'DOE' });
    // Clear secondary addresses to ensure low contactInfo similarity
    entity3.contactInfo.secondaryAddress = [];
    entity4.contactInfo.secondaryAddress = [];
    const result2 = compareForFireNumberCollision(entity3, entity4);
    if (!result2.isSameOwner) {
        console.log(`  ✅ PASS: Different entities are different owner (name: ${(result2.nameSimilarity * 100).toFixed(1)}%)`);
        passed++;
    } else {
        console.log(`  ❌ FAIL: Different entities should be different owner`);
        failed++;
    }

    // Test 3: Result includes reasoning
    if (result1.reasoning && result1.decision) {
        console.log(`  ✅ PASS: Result includes reasoning and decision`);
        passed++;
    } else {
        console.log(`  ❌ FAIL: Result should include reasoning and decision`);
        failed++;
    }

    console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
    return { passed, failed };
}

// =============================================================================
// Main Handler Tests
// =============================================================================

/**
 * Test: handleFireNumberCollision - Registration scenario
 */
function testCollisionHandlerRegistration() {
    console.log('=== Test: Collision Handler - Registration ===\n');
    let passed = 0, failed = 0;

    initializeRegistry();

    // Test 1: First entity registers successfully
    const entity1 = createMockEntity({ fireNumber: '100', pid: 'PID001' });
    const result1 = handleFireNumberCollision(entity1, '100');
    if (result1.action === 'REGISTERED') {
        console.log('  ✅ PASS: First entity action is REGISTERED');
        passed++;
    } else {
        console.log(`  ❌ FAIL: Expected REGISTERED, got ${result1.action}`);
        failed++;
    }

    // Test 2: No fire number case
    const entity2 = createMockEntity({});
    const result2 = handleFireNumberCollision(entity2, null);
    if (result2.action === 'NO_FIRE_NUMBER') {
        console.log('  ✅ PASS: Null fire number returns NO_FIRE_NUMBER');
        passed++;
    } else {
        console.log(`  ❌ FAIL: Expected NO_FIRE_NUMBER, got ${result2.action}`);
        failed++;
    }

    // Test 3: Empty fire number case
    const result3 = handleFireNumberCollision(entity2, '');
    if (result3.action === 'NO_FIRE_NUMBER') {
        console.log('  ✅ PASS: Empty fire number returns NO_FIRE_NUMBER');
        passed++;
    } else {
        console.log(`  ❌ FAIL: Expected NO_FIRE_NUMBER, got ${result3.action}`);
        failed++;
    }

    clearRegistry();
    console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
    return { passed, failed };
}

/**
 * Test: handleFireNumberCollision - Merge scenario (same owner)
 */
function testCollisionHandlerMerge() {
    console.log('=== Test: Collision Handler - Merge (Same Owner) ===\n');
    let passed = 0, failed = 0;

    initializeRegistry();

    // Register first entity
    const entity1 = createMockEntity({
        firstName: 'JOHN',
        lastName: 'SMITH',
        fireNumber: '100',
        pid: 'PID001'
    });
    handleFireNumberCollision(entity1, '100');

    // Second entity with same name (same owner) - should merge
    const entity2 = createMockEntity({
        firstName: 'JOHN',
        lastName: 'SMITH',
        fireNumber: '100',
        pid: 'PID002'
    });
    const result = handleFireNumberCollision(entity2, '100');

    // Test 1: Action should be MERGED
    if (result.action === 'MERGED') {
        console.log('  ✅ PASS: Same owner triggers MERGED action');
        passed++;
    } else {
        console.log(`  ❌ FAIL: Expected MERGED, got ${result.action}`);
        failed++;
    }

    // Test 2: Merged PID should be captured
    if (result.mergedPid === 'PID002') {
        console.log('  ✅ PASS: Merged PID is captured');
        passed++;
    } else {
        console.log(`  ❌ FAIL: Expected mergedPid=PID002, got ${result.mergedPid}`);
        failed++;
    }

    // Test 3: Subdivision should have the merged entity
    if (entity1.otherInfo.hasSubdivision && entity1.otherInfo.hasSubdivision()) {
        console.log('  ✅ PASS: Subdivision has entries');
        passed++;
    } else {
        console.log('  ❌ FAIL: Subdivision should have entries after merge');
        failed++;
    }

    // Test 4: Registry should still have only 1 entity (not 2)
    const stats = getRegistryStats();
    if (stats.totalEntities === 1) {
        console.log('  ✅ PASS: Registry has 1 entity (merged, not duplicated)');
        passed++;
    } else {
        console.log(`  ❌ FAIL: Expected 1 entity in registry, got ${stats.totalEntities}`);
        failed++;
    }

    clearRegistry();
    console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
    return { passed, failed };
}

/**
 * Test: handleFireNumberCollision - Suffix scenario (different owner)
 */
function testCollisionHandlerSuffix() {
    console.log('=== Test: Collision Handler - Suffix (Different Owner) ===\n');
    let passed = 0, failed = 0;

    initializeRegistry();

    // Register first entity
    const entity1 = createMockEntity({
        firstName: 'JOHN',
        lastName: 'SMITH',
        fireNumber: '100',
        pid: 'PID001'
    });
    entity1.contactInfo.secondaryAddress = []; // No secondary address
    handleFireNumberCollision(entity1, '100');

    // Second entity with different name (different owner) - should get suffix
    const entity2 = createMockEntity({
        firstName: 'JANE',
        lastName: 'DOE',
        fireNumber: '100',
        pid: 'PID002'
    });
    entity2.contactInfo.secondaryAddress = []; // No secondary address
    const result = handleFireNumberCollision(entity2, '100');

    // Test 1: Action should be CREATED_WITH_SUFFIX
    if (result.action === 'CREATED_WITH_SUFFIX') {
        console.log('  ✅ PASS: Different owner triggers CREATED_WITH_SUFFIX');
        passed++;
    } else {
        console.log(`  ❌ FAIL: Expected CREATED_WITH_SUFFIX, got ${result.action}`);
        failed++;
    }

    // Test 2: Suffix should be A
    if (result.suffix === 'A') {
        console.log('  ✅ PASS: First different owner gets suffix A');
        passed++;
    } else {
        console.log(`  ❌ FAIL: Expected suffix A, got ${result.suffix}`);
        failed++;
    }

    // Test 3: New fire number should be 100A
    if (result.newFireNumber === '100A') {
        console.log('  ✅ PASS: New fire number is 100A');
        passed++;
    } else {
        console.log(`  ❌ FAIL: Expected 100A, got ${result.newFireNumber}`);
        failed++;
    }

    // Test 4: Third different owner gets suffix B
    const entity3 = createMockEntity({
        firstName: 'BOB',
        lastName: 'JONES',
        fireNumber: '100',
        pid: 'PID003'
    });
    entity3.contactInfo.secondaryAddress = [];
    const result3 = handleFireNumberCollision(entity3, '100');
    if (result3.suffix === 'B') {
        console.log('  ✅ PASS: Second different owner gets suffix B');
        passed++;
    } else {
        console.log(`  ❌ FAIL: Expected suffix B, got ${result3.suffix}`);
        failed++;
    }

    // Test 5: Registry should have 3 entities
    const stats = getRegistryStats();
    if (stats.totalEntities === 3) {
        console.log('  ✅ PASS: Registry has 3 entities');
        passed++;
    } else {
        console.log(`  ❌ FAIL: Expected 3 entities, got ${stats.totalEntities}`);
        failed++;
    }

    clearRegistry();
    console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
    return { passed, failed };
}

/**
 * Test: Multiple owners with merge into correct owner
 * This tests the fix for comparing against ALL existing entities
 */
function testMultiOwnerMerge() {
    console.log('=== Test: Multi-Owner Merge (Compare All Entities) ===\n');
    let passed = 0, failed = 0;

    initializeRegistry();

    // Register Owner A (JOHN SMITH) with fire number 100
    const ownerA = createMockEntity({
        firstName: 'JOHN',
        lastName: 'SMITH',
        fireNumber: '100',
        pid: 'PID-A1'
    });
    ownerA.contactInfo.secondaryAddress = [];
    handleFireNumberCollision(ownerA, '100');

    // Register Owner B (JANE DOE) - gets suffix A (100A)
    const ownerB = createMockEntity({
        firstName: 'JANE',
        lastName: 'DOE',
        fireNumber: '100',
        pid: 'PID-B1'
    });
    ownerB.contactInfo.secondaryAddress = [];
    const resultB = handleFireNumberCollision(ownerB, '100');

    // Verify Owner B got suffix
    if (resultB.action === 'CREATED_WITH_SUFFIX' && resultB.suffix === 'A') {
        console.log('  ✅ PASS: Owner B (JANE DOE) got suffix A');
        passed++;
    } else {
        console.log(`  ❌ FAIL: Owner B should get suffix A, got ${resultB.action}/${resultB.suffix}`);
        failed++;
    }

    // Now a second record for Owner B (should merge with 100A, not create 100B)
    const ownerB2 = createMockEntity({
        firstName: 'JANE',
        lastName: 'DOE',
        fireNumber: '100',
        pid: 'PID-B2'
    });
    ownerB2.contactInfo.secondaryAddress = [];
    const resultB2 = handleFireNumberCollision(ownerB2, '100');

    // THIS IS THE KEY TEST: Should merge into Owner B (100A), not create 100B
    if (resultB2.action === 'MERGED') {
        console.log('  ✅ PASS: Second B record MERGED (not suffixed)');
        passed++;
    } else {
        console.log(`  ❌ FAIL: Expected MERGED for second B record, got ${resultB2.action}`);
        failed++;
    }

    if (resultB2.mergedIntoFireNumber === '100A') {
        console.log('  ✅ PASS: Merged into correct fire number (100A)');
        passed++;
    } else {
        console.log(`  ❌ FAIL: Should merge into 100A, got ${resultB2.mergedIntoFireNumber}`);
        failed++;
    }

    // Second record for Owner A (should merge with 100, not create suffix)
    const ownerA2 = createMockEntity({
        firstName: 'JOHN',
        lastName: 'SMITH',
        fireNumber: '100',
        pid: 'PID-A2'
    });
    ownerA2.contactInfo.secondaryAddress = [];
    const resultA2 = handleFireNumberCollision(ownerA2, '100');

    if (resultA2.action === 'MERGED' && resultA2.mergedIntoFireNumber === '100') {
        console.log('  ✅ PASS: Second A record merged into original 100');
        passed++;
    } else {
        console.log(`  ❌ FAIL: Second A should merge into 100, got ${resultA2.action}/${resultA2.mergedIntoFireNumber}`);
        failed++;
    }

    // Final state: should have 2 entities (100 and 100A), not 4
    const stats = getRegistryStats();
    if (stats.totalEntities === 2) {
        console.log(`  ✅ PASS: Final registry has 2 entities (not 4)`);
        passed++;
    } else {
        console.log(`  ❌ FAIL: Expected 2 entities, got ${stats.totalEntities}`);
        failed++;
    }

    clearRegistry();
    console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
    return { passed, failed };
}

// =============================================================================
// OtherInfo Subdivision Tests
// =============================================================================

/**
 * Test: OtherInfo subdivision methods
 */
function testOtherInfoSubdivision() {
    console.log('=== Test: OtherInfo Subdivision Methods ===\n');
    let passed = 0, failed = 0;

    // Check if OtherInfo class is available
    if (typeof OtherInfo === 'undefined') {
        console.log('  ⚠️  SKIP: OtherInfo class not loaded. Using mock tests only.');
        return { passed: 0, failed: 0, skipped: true };
    }

    const otherInfo = new OtherInfo();

    // Test 1: Initial state
    if (!otherInfo.hasSubdivision()) {
        console.log('  ✅ PASS: New OtherInfo has no subdivision');
        passed++;
    } else {
        console.log('  ❌ FAIL: New OtherInfo should have no subdivision');
        failed++;
    }

    // Test 2: Add entry
    const mockEntity = createMockEntity({ pid: 'TEST-PID' });
    otherInfo.addSubdivisionEntry('TEST-PID', mockEntity);
    if (otherInfo.hasSubdivision()) {
        console.log('  ✅ PASS: After addSubdivisionEntry, hasSubdivision is true');
        passed++;
    } else {
        console.log('  ❌ FAIL: Should have subdivision after adding entry');
        failed++;
    }

    // Test 3: Get PIDs
    const pids = otherInfo.getSubdivisionPids();
    if (pids.length === 1 && pids[0] === 'TEST-PID') {
        console.log('  ✅ PASS: getSubdivisionPids returns correct PID');
        passed++;
    } else {
        console.log(`  ❌ FAIL: Expected ['TEST-PID'], got ${JSON.stringify(pids)}`);
        failed++;
    }

    // Test 4: Get count
    if (otherInfo.getSubdivisionCount() === 1) {
        console.log('  ✅ PASS: getSubdivisionCount returns 1');
        passed++;
    } else {
        console.log(`  ❌ FAIL: Expected count 1, got ${otherInfo.getSubdivisionCount()}`);
        failed++;
    }

    // Test 5: Retrieve entity
    const retrieved = otherInfo.getSubdivisionEntity('TEST-PID');
    if (retrieved && retrieved.type === 'Individual') {
        console.log('  ✅ PASS: getSubdivisionEntity retrieves serialized data');
        passed++;
    } else {
        console.log('  ❌ FAIL: Could not retrieve subdivision entity');
        failed++;
    }

    // Test 6: Add multiple entries
    const mockEntity2 = createMockEntity({ pid: 'TEST-PID-2' });
    otherInfo.addSubdivisionEntry('TEST-PID-2', mockEntity2);
    if (otherInfo.getSubdivisionCount() === 2) {
        console.log('  ✅ PASS: Multiple entries tracked correctly');
        passed++;
    } else {
        console.log(`  ❌ FAIL: Expected count 2, got ${otherInfo.getSubdivisionCount()}`);
        failed++;
    }

    console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
    return { passed, failed };
}

// =============================================================================
// Run All Tests
// =============================================================================

/**
 * Run all fire number collision handler tests
 */
function runFireNumberCollisionTests() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     Fire Number Collision Handler Unit Tests               ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Check if required functions are available
    if (typeof initializeRegistry === 'undefined') {
        console.error('❌ ERROR: fireNumberCollisionHandler.js not loaded.');
        console.log('Load it with: fetch("./scripts/dataSources/fireNumberCollisionHandler.js").then(r => r.text()).then(eval)');
        return;
    }

    let totalPassed = 0;
    let totalFailed = 0;

    const tests = [
        testRegistryInitialization,
        testFireNumberRegistration,
        testSuffixGeneration,
        testFireNumberUtilities,
        testSecondaryAddressComparison,
        testCollisionComparison,
        testCollisionHandlerRegistration,
        testCollisionHandlerMerge,
        testCollisionHandlerSuffix,
        testMultiOwnerMerge,
        testOtherInfoSubdivision
    ];

    tests.forEach(test => {
        try {
            const result = test();
            if (result && !result.skipped) {
                totalPassed += result.passed;
                totalFailed += result.failed;
            }
        } catch (err) {
            console.error(`❌ ERROR in ${test.name}:`, err);
            totalFailed++;
        }
    });

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log(`║     TOTAL: ${totalPassed} passed, ${totalFailed} failed                           ║`);
    console.log('╚════════════════════════════════════════════════════════════╝');

    return { passed: totalPassed, failed: totalFailed };
}

// =============================================================================
// Export for browser
// =============================================================================

if (typeof window !== 'undefined') {
    window.createMockEntity = createMockEntity;
    window.testRegistryInitialization = testRegistryInitialization;
    window.testFireNumberRegistration = testFireNumberRegistration;
    window.testSuffixGeneration = testSuffixGeneration;
    window.testFireNumberUtilities = testFireNumberUtilities;
    window.testSecondaryAddressComparison = testSecondaryAddressComparison;
    window.testCollisionComparison = testCollisionComparison;
    window.testCollisionHandlerRegistration = testCollisionHandlerRegistration;
    window.testCollisionHandlerMerge = testCollisionHandlerMerge;
    window.testCollisionHandlerSuffix = testCollisionHandlerSuffix;
    window.testMultiOwnerMerge = testMultiOwnerMerge;
    window.testOtherInfoSubdivision = testOtherInfoSubdivision;
    window.runFireNumberCollisionTests = runFireNumberCollisionTests;
}

console.log('Fire Number Collision Handler test functions loaded.');
console.log('First load the handler: fetch("./scripts/dataSources/fireNumberCollisionHandler.js").then(r => r.text()).then(eval)');
console.log('Then run: runFireNumberCollisionTests()');
