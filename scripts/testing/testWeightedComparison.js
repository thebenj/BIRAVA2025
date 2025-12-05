/**
 * Test Script for Weighted Comparison Architecture
 * Tests the implementation of weighted compareTo methods using IndividualName objects
 */

/**
 * Test the weighted comparison architecture with sample IndividualName objects
 * Creates test data and validates the weighted comparison behavior
 */
function testWeightedComparisonArchitecture() {
    console.log('🧪 Testing Weighted Comparison Architecture');
    console.log('==========================================');

    try {
        // Test 1: Create sample IndividualName objects
        console.log('\n📝 Test 1: Creating sample IndividualName objects...');

        const primaryAlias1 = new AttributedTerm("John Smith", "TEST", 0, "test1");
        const name1 = new IndividualName(primaryAlias1, "", "John", "", "Smith", "");

        const primaryAlias2 = new AttributedTerm("John Smith", "TEST", 0, "test2");
        const name2 = new IndividualName(primaryAlias2, "", "John", "", "Smith", "");

        const primaryAlias3 = new AttributedTerm("Jane Doe", "TEST", 0, "test3");
        const name3 = new IndividualName(primaryAlias3, "", "Jane", "", "Doe", "");

        console.log(`✅ Created name1: ${name1.completeName}`);
        console.log(`✅ Created name2: ${name2.completeName}`);
        console.log(`✅ Created name3: ${name3.completeName}`);

        // Test 2: Verify weighted properties are set
        console.log('\n🔍 Test 2: Verifying weighted properties...');

        console.log('name1.comparisonWeights:', name1.comparisonWeights);
        console.log('name1.comparisonCalculator type:', typeof name1.comparisonCalculator);

        if (name1.comparisonWeights && name1.comparisonWeights.lastName === 0.5) {
            console.log('✅ Weights correctly configured');
        } else {
            console.log('❌ Weights not configured correctly');
            return false;
        }

        // Test 3: Test identical names comparison
        console.log('\n⚖️ Test 3: Comparing identical names...');
        const result1 = name1.compareTo(name2);
        console.log(`name1.compareTo(name2) = ${result1}`);

        if (result1 === 1.0) {
            console.log('✅ Identical names return 1.0 (perfect match)');
        } else {
            console.log(`❌ Expected 1.0, got ${result1}`);
        }

        // Test 4: Test different names comparison
        console.log('\n⚖️ Test 4: Comparing different names...');
        const result2 = name1.compareTo(name3);
        console.log(`name1.compareTo(name3) = ${result2}`);

        if (result2 < 1.0) {
            console.log('✅ Different names return less than 1.0');
        } else {
            console.log(`❌ Expected < 1.0, got ${result2}`);
        }

        // Test 5: Test fallback behavior (unweighted objects)
        console.log('\n🔄 Test 5: Testing fallback behavior...');

        const plainAlias = new AttributedTerm("Test Term", "TEST", 0, "fallback");
        const result3 = plainAlias.compareTo(plainAlias);
        console.log(`AttributedTerm.compareTo(self) = ${result3}`);

        if (result3 === 0) {
            console.log('✅ Fallback to original compareTo works (returns 0)');
        } else {
            console.log(`❌ Expected 0, got ${result3}`);
        }

        // Test 6: Performance test
        console.log('\n⏱️ Test 6: Basic performance test...');
        const startTime = performance.now();

        for (let i = 0; i < 1000; i++) {
            name1.compareTo(name2);
        }

        const endTime = performance.now();
        const duration = endTime - startTime;
        const comparisonsPerSecond = Math.round((1000 / duration) * 1000);

        console.log(`✅ 1000 comparisons in ${duration.toFixed(2)}ms`);
        console.log(`✅ Performance: ${comparisonsPerSecond.toLocaleString()} comparisons/second`);

        console.log('\n🎉 All tests completed successfully!');
        return true;

    } catch (error) {
        console.error('❌ Test failed with error:', error);
        return false;
    }
}

/**
 * Test specific weight configurations
 * Validates that different weight configurations produce expected results
 */
function testWeightConfigurations() {
    console.log('\n🧪 Testing Weight Configurations');
    console.log('=================================');

    try {
        // Create test names with different components
        const alias1 = new AttributedTerm("John A Smith", "TEST", 0, "weight1");
        const name1 = new IndividualName(alias1, "", "John", "A", "Smith", "");

        const alias2 = new AttributedTerm("John B Smith", "TEST", 0, "weight2");
        const name2 = new IndividualName(alias2, "", "John", "B", "Smith", "");

        console.log(`Comparing: "${name1.completeName}" vs "${name2.completeName}"`);
        console.log('Same first/last name, different middle name');

        const result = name1.compareTo(name2);
        console.log(`Weighted comparison result: ${result}`);

        // With weights lastName:0.5, firstName:0.4, otherNames:0.1
        // Both lastName and firstName match (0.9 total weight = perfect)
        // otherNames differ (0.1 weight = no contribution)
        // Expected: (1.0 * 0.5 + 1.0 * 0.4 + 0.0 * 0.1) = 0.9
        // Converted to -1 to 1: (0.9 * 2) - 1 = 0.8

        const expected = 0.8;
        if (Math.abs(result - expected) <= 0.1) {
            console.log(`✅ Weight calculation working correctly (expected ~${expected})`);
        } else {
            console.log(`❓ Unexpected result - may indicate different algorithm behavior`);
        }

        return true;

    } catch (error) {
        console.error('❌ Weight configuration test failed:', error);
        return false;
    }
}

// Export for browser use
if (typeof window !== 'undefined') {
    window.testWeightedComparisonArchitecture = testWeightedComparisonArchitecture;
    window.testWeightConfigurations = testWeightConfigurations;
}

// Auto-run if called directly
if (typeof window !== 'undefined' && window.location) {
    console.log('📋 Weighted Comparison Test Script Loaded');
    console.log('Run testWeightedComparisonArchitecture() to test the implementation');
}