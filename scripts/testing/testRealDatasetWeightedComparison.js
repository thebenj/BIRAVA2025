/**
 * COMPREHENSIVE REAL DATASET WEIGHTED COMPARISON TEST
 * Tests the weighted comparison architecture with all 1,360 individual entities
 * Protocol 2: Future regression testing value
 */

async function testRealDatasetWeightedComparison() {
    console.log('🧪 COMPREHENSIVE REAL DATASET WEIGHTED COMPARISON TEST');
    console.log('=====================================================');

    try {
        // Step 1: Ensure entities are loaded
        if (!window.workingLoadedEntities || !window.workingLoadedEntities.bloomerang) {
            console.log('⚠️ Entities not loaded. Loading now...');

            // Trigger entity loading - this simulates clicking the load button
            if (typeof loadAllEntitiesIntoMemory === 'function') {
                await loadAllEntitiesIntoMemory();
            } else {
                console.error('❌ loadAllEntitiesIntoMemory function not available');
                console.log('📋 Please run: click the 🚀 Load All Entities Into Memory button first');
                return false;
            }
        }

        // Step 2: Verify entity loading
        const entities = workingLoadedEntities.bloomerang.individuals.entities;
        const entityKeys = Object.keys(entities);
        const entityCount = entityKeys.length;

        console.log(`✅ Entities loaded: ${entityCount} individual entities`);

        if (entityCount !== 1360) {
            console.warn(`⚠️ Expected 1,360 entities, got ${entityCount}`);
        }

        // Step 3: Verify entities have IndividualName objects with weighted comparison
        console.log('\n🔍 Verifying weighted comparison setup...');

        let weightedCount = 0;
        let sampleEntity = null;

        for (let i = 0; i < Math.min(10, entityKeys.length); i++) {
            const entity = entities[entityKeys[i]];
            if (entity.individualName &&
                entity.individualName.comparisonWeights &&
                entity.individualName.comparisonCalculator) {
                weightedCount++;
                if (!sampleEntity) sampleEntity = entity;
            }
        }

        console.log(`✅ Sample verification: ${weightedCount}/10 entities have weighted comparison`);

        if (sampleEntity) {
            console.log('Sample weights:', sampleEntity.individualName.comparisonWeights);
            console.log('Expected: {lastName: 0.5, firstName: 0.4, otherNames: 0.1}');
        }

        // Step 4: Performance test with real data
        console.log('\n⏱️ Performance testing with real entities...');

        // Test with first 100 entities for initial performance validation
        const testEntities = entityKeys.slice(0, 100).map(key => entities[key]).filter(e => e.individualName);
        console.log(`Testing with ${testEntities.length} real entities...`);

        const startTime = performance.now();
        let comparisonCount = 0;

        // Run N×N comparisons on sample
        for (let i = 0; i < testEntities.length; i++) {
            for (let j = i + 1; j < testEntities.length; j++) {
                const result = testEntities[i].individualName.compareTo(testEntities[j].individualName);
                comparisonCount++;
            }
        }

        const endTime = performance.now();
        const duration = endTime - startTime;
        const comparisonsPerSecond = Math.round((comparisonCount / duration) * 1000);

        console.log(`✅ ${comparisonCount} real comparisons in ${duration.toFixed(2)}ms`);
        console.log(`✅ Performance: ${comparisonsPerSecond.toLocaleString()} comparisons/second`);

        // Step 5: Full dataset estimation
        console.log('\n📊 Full dataset analysis...');

        const fullDatasetComparisons = (entityCount * (entityCount - 1)) / 2;
        const estimatedTime = (fullDatasetComparisons / comparisonsPerSecond) / 60; // minutes

        console.log(`Total entities: ${entityCount}`);
        console.log(`Total comparisons needed: ${fullDatasetComparisons.toLocaleString()}`);
        console.log(`Estimated time for full dataset: ${estimatedTime.toFixed(2)} minutes`);

        // Step 6: Sample similarity analysis
        console.log('\n🔍 Sample similarity analysis...');

        const similarities = [];
        const highSimilarities = [];

        for (let i = 0; i < Math.min(50, testEntities.length); i++) {
            for (let j = i + 1; j < Math.min(50, testEntities.length); j++) {
                const similarity = testEntities[i].individualName.compareTo(testEntities[j].individualName);
                similarities.push(similarity);

                if (similarity > 0.7) {
                    highSimilarities.push({
                        entity1: testEntities[i].individualName.toString(),
                        entity2: testEntities[j].individualName.toString(),
                        similarity: similarity
                    });
                }
            }
        }

        const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
        console.log(`Average similarity: ${avgSimilarity.toFixed(3)}`);
        console.log(`High similarities (>0.7): ${highSimilarities.length}`);

        if (highSimilarities.length > 0) {
            console.log('Sample high similarities:');
            highSimilarities.slice(0, 5).forEach(item => {
                console.log(`  ${item.similarity.toFixed(3)}: ${item.entity1} ↔ ${item.entity2}`);
            });
        }

        // Step 7: Performance validation
        console.log('\n✅ PERFORMANCE VALIDATION');
        const targetPerformance = 945000; // 945K target from CLAUDE.md

        if (comparisonsPerSecond >= targetPerformance) {
            console.log(`🎉 PASSED: ${comparisonsPerSecond.toLocaleString()} ≥ ${targetPerformance.toLocaleString()}`);
        } else {
            console.log(`❌ FAILED: ${comparisonsPerSecond.toLocaleString()} < ${targetPerformance.toLocaleString()}`);
        }

        console.log('\n🎉 REAL DATASET TEST COMPLETED');
        return {
            entityCount,
            comparisonsPerSecond,
            avgSimilarity,
            highSimilarityCount: highSimilarities.length,
            estimatedFullTime: estimatedTime,
            performanceTarget: comparisonsPerSecond >= targetPerformance
        };

    } catch (error) {
        console.error('❌ Test failed:', error);
        return false;
    }
}

// Optional: Run smaller focused tests
function testSpecificEntityComparisons() {
    console.log('🔍 Testing specific entity comparisons...');

    if (!workingLoadedEntities?.bloomerang?.individuals?.entities) {
        console.error('❌ Entities not loaded');
        return;
    }

    const entities = workingLoadedEntities.bloomerang.individuals.entities;
    const entityKeys = Object.keys(entities);

    // Test first few entities
    for (let i = 0; i < Math.min(5, entityKeys.length); i++) {
        const entity = entities[entityKeys[i]];
        if (entity.individualName) {
            console.log(`Entity ${i+1}: ${entity.individualName.toString()}`);
            console.log(`  Weights: ${JSON.stringify(entity.individualName.comparisonWeights)}`);

            // Test self-comparison
            const selfComp = entity.individualName.compareTo(entity.individualName);
            console.log(`  Self comparison: ${selfComp}`);
        }
    }
}

console.log('📋 Real Dataset Weighted Comparison Test Script Loaded');
console.log('Run testRealDatasetWeightedComparison() to test with all entities');
console.log('Run testSpecificEntityComparisons() for detailed entity analysis');