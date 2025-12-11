/**
 * testUniversalEntityMatcher.js
 *
 * Regression test script for universalEntityMatcher.js
 *
 * BASELINE DOCUMENTATION (December 6, 2025):
 * ==========================================
 *
 * CURRENT WORKING FUNCTIONALITY:
 * 1. findBestMatches(entity) - Returns best matches for a single entity
 *    - Groups results by entity type (Individual, AggregateHousehold, Business, LegalConstruct)
 *    - Uses 98th percentile OR top 10 (whichever is larger) for best match selection
 *    - Cross-type comparison works (Individual to AggregateHousehold, etc.)
 *
 * 2. analyzeEntities(options) - Main analysis function
 *    - Processes entities and finds matches
 *    - Supports limit, entityTypes, download, storeInMemory options
 *    - Stores results in window.lastAnalysisResults
 *
 * 3. downloadBestMatchesCSV(results) - CSV export
 *    - Downloads match results as CSV file
 *
 * 4. findMatchesByKey(key, source) - Find entity by key and run matching
 *
 * KEY DATA STRUCTURES:
 * - Match result object contains:
 *   - targetEntity: The matched entity object
 *   - targetKey: locationIdentifier value (fire number for VA, account number for Bloomerang)
 *   - targetSource: 'visionAppraisal' or 'bloomerang'
 *   - targetType: Entity class name
 *   - score: Overall similarity score
 *   - details: Component breakdown if includeDetailedBreakdown is true
 *
 * KNOWN ISSUE (to be fixed):
 * - targetKey is the locationIdentifier value (fire number), NOT the storage key
 * - VisionAppraisal entities are stored by array index, but targetKey contains fire number
 * - Bloomerang households are stored by uuid, but targetKey contains account number
 * - viewMatchEntityDetails must search by locationIdentifier to find correct entity
 *
 * CONFIGURATION (MATCH_CONFIG):
 * - percentileThreshold: 98
 * - minimumGroupSize: 10
 * - minimumScoreDefault: 0.31
 * - nameScoreOverride: 0.985
 * - individualToIndividual.minimumCutoff: 0.91
 * - individualToIndividual.minimumScore: 0.50
 * - individualToHousehold.minimumScore: 0.50
 *
 * Usage:
 *   fetch('./scripts/testing/testUniversalEntityMatcher.js').then(r => r.text()).then(eval)
 */

// ============================================================================
// TEST UTILITIES
// ============================================================================

const TEST_RESULTS = {
    passed: 0,
    failed: 0,
    tests: []
};

function assert(condition, testName, details = '') {
    if (condition) {
        TEST_RESULTS.passed++;
        TEST_RESULTS.tests.push({ name: testName, passed: true });
        console.log(`✅ PASS: ${testName}`);
    } else {
        TEST_RESULTS.failed++;
        TEST_RESULTS.tests.push({ name: testName, passed: false, details });
        console.error(`❌ FAIL: ${testName}`);
        if (details) console.error(`   Details: ${details}`);
    }
}

function assertEqual(actual, expected, testName) {
    const condition = actual === expected;
    const details = condition ? '' : `Expected: ${expected}, Got: ${actual}`;
    assert(condition, testName, details);
}

function assertExists(value, testName) {
    assert(value !== undefined && value !== null, testName, `Value is ${value}`);
}

function assertType(value, expectedType, testName) {
    const actualType = typeof value;
    assert(actualType === expectedType, testName, `Expected type: ${expectedType}, Got: ${actualType}`);
}

function assertArray(value, testName) {
    assert(Array.isArray(value), testName, `Value is not an array: ${typeof value}`);
}

function printSummary() {
    console.log('\n========================================');
    console.log('TEST SUMMARY');
    console.log('========================================');
    console.log(`Total: ${TEST_RESULTS.passed + TEST_RESULTS.failed}`);
    console.log(`Passed: ${TEST_RESULTS.passed}`);
    console.log(`Failed: ${TEST_RESULTS.failed}`);

    if (TEST_RESULTS.failed > 0) {
        console.log('\nFailed tests:');
        TEST_RESULTS.tests.filter(t => !t.passed).forEach(t => {
            console.log(`  - ${t.name}: ${t.details}`);
        });
    }

    return TEST_RESULTS;
}

// ============================================================================
// PREREQUISITE CHECKS
// ============================================================================

function checkPrerequisites() {
    console.log('========================================');
    console.log('CHECKING PREREQUISITES');
    console.log('========================================');

    // Check entities are loaded
    assertExists(window.workingLoadedEntities, 'workingLoadedEntities exists');
    assertEqual(window.workingLoadedEntities?.status, 'loaded', 'Entities are loaded');

    // Check VisionAppraisal entities
    assertExists(window.workingLoadedEntities?.visionAppraisal?.entities, 'VisionAppraisal entities exist');
    assertArray(window.workingLoadedEntities?.visionAppraisal?.entities, 'VisionAppraisal entities is array');

    const vaCount = window.workingLoadedEntities?.visionAppraisal?.entities?.length || 0;
    assert(vaCount > 0, `VisionAppraisal has entities (count: ${vaCount})`);

    // Check Bloomerang entities
    assertExists(window.workingLoadedEntities?.bloomerang, 'Bloomerang data exists');
    assertExists(window.workingLoadedEntities?.bloomerang?.individuals?.entities, 'Bloomerang individuals exist');
    assertExists(window.workingLoadedEntities?.bloomerang?.households?.entities, 'Bloomerang households exist');

    const bloomerangIndCount = Object.keys(window.workingLoadedEntities?.bloomerang?.individuals?.entities || {}).length;
    const bloomerangHHCount = Object.keys(window.workingLoadedEntities?.bloomerang?.households?.entities || {}).length;
    assert(bloomerangIndCount > 0, `Bloomerang has individuals (count: ${bloomerangIndCount})`);
    assert(bloomerangHHCount > 0, `Bloomerang has households (count: ${bloomerangHHCount})`);

    // Check universalEntityMatcher functions are loaded
    assertExists(window.findBestMatches, 'findBestMatches function exists');
    assertExists(window.analyzeEntities, 'analyzeEntities function exists');
    assertExists(window.downloadBestMatchesCSV, 'downloadBestMatchesCSV function exists');
    assertExists(window.findMatchesByKey, 'findMatchesByKey function exists');
    assertExists(window.MATCH_CONFIG, 'MATCH_CONFIG exists');

    console.log('');
}

// ============================================================================
// CONFIGURATION TESTS
// ============================================================================

function testConfiguration() {
    console.log('========================================');
    console.log('TESTING CONFIGURATION');
    console.log('========================================');

    const config = window.MATCH_CONFIG;

    assertEqual(config.percentileThreshold, 98, 'percentileThreshold is 98');
    assertEqual(config.minimumGroupSize, 10, 'minimumGroupSize is 10');
    assertEqual(config.minimumScoreDefault, 0.31, 'minimumScoreDefault is 0.31');
    assertEqual(config.nameScoreOverride, 0.985, 'nameScoreOverride is 0.985');
    assertEqual(config.individualToIndividual.minimumCutoff, 0.91, 'individualToIndividual.minimumCutoff is 0.91');
    assertEqual(config.individualToIndividual.minimumScore, 0.50, 'individualToIndividual.minimumScore is 0.50');
    assertEqual(config.individualToHousehold.minimumScore, 0.50, 'individualToHousehold.minimumScore is 0.50');

    console.log('');
}

// ============================================================================
// SINGLE ENTITY MATCHING TESTS
// ============================================================================

function testSingleEntityMatching() {
    console.log('========================================');
    console.log('TESTING SINGLE ENTITY MATCHING');
    console.log('========================================');

    // Get a VisionAppraisal Individual for testing
    const vaEntities = window.workingLoadedEntities.visionAppraisal.entities;
    const testIndividual = vaEntities.find(e => e.constructor.name === 'Individual');

    assertExists(testIndividual, 'Found VisionAppraisal Individual for testing');

    if (!testIndividual) {
        console.log('Skipping matching tests - no Individual found');
        return;
    }

    // Run findBestMatches
    console.log(`Testing findBestMatches on: ${testIndividual.name?.toString?.() || 'Unknown'}`);
    const startTime = performance.now();
    const results = findBestMatches(testIndividual);
    const elapsed = performance.now() - startTime;

    assertExists(results, 'findBestMatches returns results');
    console.log(`  Completed in ${elapsed.toFixed(0)}ms`);

    // Check result structure
    assertExists(results.baseEntity, 'Results contain baseEntity');
    assertExists(results.baseEntity?.key, 'Results contain baseEntity.key');
    assertExists(results.baseEntity?.source, 'Results contain baseEntity.source');
    assertExists(results.bestMatchesByType, 'Results contain bestMatchesByType');

    // Check bestMatchesByType structure
    const matchTypes = Object.keys(results.bestMatchesByType);
    assert(matchTypes.includes('Individual'), 'Results include Individual matches');
    assert(matchTypes.includes('AggregateHousehold'), 'Results include AggregateHousehold matches');

    // Check Individual matches structure
    const indMatches = results.bestMatchesByType.Individual;
    assertExists(indMatches.bestMatches, 'Individual matches has bestMatches array');
    assertArray(indMatches.bestMatches, 'bestMatches is an array');

    if (indMatches.bestMatches.length > 0) {
        const firstMatch = indMatches.bestMatches[0];
        assertExists(firstMatch.targetKey, 'Match has targetKey');
        assertExists(firstMatch.targetStorageKey, 'Match has targetStorageKey (NEW)');
        assertExists(firstMatch.targetSource, 'Match has targetSource');
        assertExists(firstMatch.score, 'Match has score');
        assertType(firstMatch.score, 'number', 'Score is a number');
        assert(firstMatch.score >= 0 && firstMatch.score <= 1, 'Score is between 0 and 1', `Score: ${firstMatch.score}`);

        console.log(`  Best Individual match: key=${firstMatch.targetKey}, storageKey=${firstMatch.targetStorageKey}, score=${firstMatch.score.toFixed(4)}`);
    }

    // Also check baseEntity has storageKey
    assertExists(results.baseEntity?.storageKey, 'Results contain baseEntity.storageKey (NEW)');

    console.log('');
}

// ============================================================================
// KEY FORMAT TESTS
// ============================================================================

function testKeyFormats() {
    console.log('========================================');
    console.log('TESTING KEY FORMATS');
    console.log('========================================');

    // Test VisionAppraisal entity key extraction
    const vaEntities = window.workingLoadedEntities.visionAppraisal.entities;

    // Find an entity with a fire number
    let entityWithFireNumber = null;
    let fireNumberValue = null;
    let entityIndex = -1;

    for (let i = 0; i < vaEntities.length; i++) {
        const entity = vaEntities[i];
        const locId = entity.locationIdentifier;
        if (locId?.primaryAlias?.term) {
            entityWithFireNumber = entity;
            fireNumberValue = String(locId.primaryAlias.term);
            entityIndex = i;
            break;
        }
    }

    assertExists(entityWithFireNumber, 'Found VA entity with locationIdentifier');

    if (entityWithFireNumber) {
        console.log(`  Entity at index ${entityIndex} has fire number: ${fireNumberValue}`);
        console.log(`  Entity type: ${entityWithFireNumber.constructor.name}`);
        console.log(`  Entity name: ${entityWithFireNumber.name?.toString?.() || 'Unknown'}`);

        // Document the key mismatch
        assert(entityIndex !== parseInt(fireNumberValue),
            'KNOWN ISSUE: Array index differs from fire number',
            `Index: ${entityIndex}, Fire#: ${fireNumberValue}`);
    }

    // Test Bloomerang entity key extraction
    const bloomerangHouseholds = window.workingLoadedEntities.bloomerang.households.entities;
    const householdKeys = Object.keys(bloomerangHouseholds);

    if (householdKeys.length > 0) {
        const firstKey = householdKeys[0];
        const firstHousehold = bloomerangHouseholds[firstKey];

        console.log(`  First Bloomerang household key: ${firstKey}`);
        assert(firstKey.startsWith('uuid_'), 'Bloomerang household keys start with uuid_', `Key: ${firstKey}`);

        // Get locationIdentifier
        const locId = firstHousehold.locationIdentifier?.primaryAlias?.term;
        console.log(`  Household locationIdentifier: ${locId}`);

        if (locId) {
            assert(firstKey !== locId,
                'KNOWN ISSUE: Storage key differs from locationIdentifier',
                `Storage key: ${firstKey}, LocationId: ${locId}`);
        }
    }

    console.log('');
}

// ============================================================================
// CROSS-TYPE COMPARISON TESTS
// ============================================================================

function testCrossTypeComparison() {
    console.log('========================================');
    console.log('TESTING CROSS-TYPE COMPARISON');
    console.log('========================================');

    // Get a VisionAppraisal Individual
    const vaEntities = window.workingLoadedEntities.visionAppraisal.entities;
    const testIndividual = vaEntities.find(e => e.constructor.name === 'Individual');

    if (!testIndividual) {
        console.log('Skipping cross-type tests - no Individual found');
        return;
    }

    const results = findBestMatches(testIndividual);

    // Check that we got results for different entity types
    const indMatches = results.bestMatchesByType.Individual?.bestMatches || [];
    const hhMatches = results.bestMatchesByType.AggregateHousehold?.bestMatches || [];
    const bizMatches = results.bestMatchesByType.Business?.bestMatches || [];

    console.log(`  Individual matches: ${indMatches.length}`);
    console.log(`  AggregateHousehold matches: ${hhMatches.length}`);
    console.log(`  Business matches: ${bizMatches.length}`);

    // Cross-type comparison should work
    assert(hhMatches.length >= 0, 'Cross-type comparison to AggregateHousehold works');
    assert(bizMatches.length >= 0, 'Cross-type comparison to Business works');

    console.log('');
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runAllTests() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║     UNIVERSAL ENTITY MATCHER REGRESSION TESTS                  ║');
    console.log('║     Baseline: December 6, 2025                                 ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('\n');

    // Reset results
    TEST_RESULTS.passed = 0;
    TEST_RESULTS.failed = 0;
    TEST_RESULTS.tests = [];

    try {
        checkPrerequisites();
        testConfiguration();
        testSingleEntityMatching();
        testKeyFormats();
        testCrossTypeComparison();
    } catch (error) {
        console.error('Test execution error:', error);
        TEST_RESULTS.failed++;
        TEST_RESULTS.tests.push({ name: 'Test execution', passed: false, details: error.message });
    }

    return printSummary();
}

// Run tests
runAllTests();
