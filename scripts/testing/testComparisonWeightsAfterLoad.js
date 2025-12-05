/**
 * Test Comparison Weights After Entity Loading
 *
 * PURPOSE: Verify that IndividualName objects have proper comparisonWeights after loading from disk
 *
 * This test checks:
 * 1. VisionAppraisal individual entities have proper weights
 * 2. Bloomerang individual entities have proper weights
 * 3. Both have comparisonCalculator function set
 * 4. Sample detailed inspection of weights structure
 *
 * USAGE:
 * 1. Refresh browser
 * 2. Click "🚀 Load All Entities Into Memory" button
 * 3. Wait for loading to complete
 * 4. Run: testComparisonWeightsAfterLoad()
 */

function testComparisonWeightsAfterLoad() {
    console.log('🧪 === TEST: Comparison Weights After Entity Loading ===');
    console.log();

    // Step 1: Verify entities are loaded
    console.log('Step 1: Verifying entities are loaded...');

    if (!window.workingLoadedEntities || workingLoadedEntities.status !== 'loaded') {
        console.error('❌ Entities not loaded. Click "🚀 Load All Entities Into Memory" button first.');
        return null;
    }

    console.log('✅ Entities loaded');
    console.log();

    // Step 2: Test VisionAppraisal individual entities
    console.log('Step 2: Testing VisionAppraisal individual entities...');

    if (!workingLoadedEntities.visionAppraisal?.loaded || !workingLoadedEntities.visionAppraisal?.entities) {
        console.error('❌ VisionAppraisal entities not loaded');
        return null;
    }

    // VisionAppraisal entities are stored as an array, filter for Individual type
    // Use same logic as getEntityType() function: check entity.type OR entity.constructor.name
    const vaIndividuals = workingLoadedEntities.visionAppraisal.entities.filter(e => {
        const entityType = e.type || e.constructor?.name || 'Unknown';
        return entityType === 'Individual';
    });

    if (vaIndividuals.length === 0) {
        console.error('❌ No VisionAppraisal individual entities found');
        return null;
    }

    console.log(`Found ${vaIndividuals.length} VisionAppraisal individual entities`);

    // Sample first 3 VisionAppraisal entities
    let vaCorrect = 0;
    let vaNull = 0;
    let vaMissingCalculator = 0;

    console.log('\nSampling first 3 VisionAppraisal entities:');
    for (let i = 0; i < Math.min(3, vaIndividuals.length); i++) {
        const entity = vaIndividuals[i];
        const name = entity.name;

        console.log(`\n--- VisionAppraisal Entity ${i + 1} ---`);
        console.log('Entity type:', entity.constructor.name);
        console.log('Name type:', name?.constructor?.name);
        console.log('Name completeName:', name?.completeName);
        console.log('comparisonWeights:', name?.comparisonWeights);
        console.log('comparisonCalculator:', typeof name?.comparisonCalculator);

        if (name?.comparisonWeights && typeof name.comparisonWeights === 'object') {
            console.log('  ✅ Has comparisonWeights object');
            console.log('  Weights:', JSON.stringify(name.comparisonWeights));
            vaCorrect++;
        } else if (name?.comparisonWeights === null) {
            console.log('  ❌ comparisonWeights is null');
            vaNull++;
        } else {
            console.log('  ⚠️  comparisonWeights is undefined or wrong type');
        }

        if (typeof name?.comparisonCalculator === 'function') {
            console.log('  ✅ Has comparisonCalculator function');
        } else {
            console.log('  ❌ Missing comparisonCalculator function');
            vaMissingCalculator++;
        }
    }

    // Count all VisionAppraisal entities
    console.log('\n\nCounting all VisionAppraisal entities...');
    vaCorrect = 0;
    vaNull = 0;
    vaMissingCalculator = 0;

    vaIndividuals.forEach(entity => {
        const name = entity.name;
        if (name?.comparisonWeights && typeof name.comparisonWeights === 'object') {
            vaCorrect++;
        } else if (name?.comparisonWeights === null) {
            vaNull++;
        }
        if (typeof name?.comparisonCalculator !== 'function') {
            vaMissingCalculator++;
        }
    });

    console.log(`VisionAppraisal Results (${vaIndividuals.length} total):`);
    console.log(`  ✅ Proper weights: ${vaCorrect}`);
    console.log(`  ❌ Null weights: ${vaNull}`);
    console.log(`  ❌ Missing calculator: ${vaMissingCalculator}`);
    console.log();

    // Step 3: Test Bloomerang individual entities
    console.log('Step 3: Testing Bloomerang individual entities...');

    const bloomIndividuals = workingLoadedEntities.bloomerang?.individuals?.entities;

    if (!bloomIndividuals) {
        console.error('❌ No Bloomerang individual entities found');
        return null;
    }

    const bloomKeys = Object.keys(bloomIndividuals);
    console.log(`Found ${bloomKeys.length} Bloomerang individual entities`);

    // Sample first 3 Bloomerang entities
    let bloomCorrect = 0;
    let bloomNull = 0;
    let bloomMissingCalculator = 0;

    console.log('\nSampling first 3 Bloomerang entities:');
    for (let i = 0; i < Math.min(3, bloomKeys.length); i++) {
        const entity = bloomIndividuals[bloomKeys[i]];
        const name = entity.name;

        console.log(`\n--- Bloomerang Entity ${i + 1} ---`);
        console.log('Entity type:', entity.constructor.name);
        console.log('Name type:', name?.constructor?.name);
        console.log('Name completeName:', name?.completeName);
        console.log('comparisonWeights:', name?.comparisonWeights);
        console.log('comparisonCalculator:', typeof name?.comparisonCalculator);

        if (name?.comparisonWeights && typeof name.comparisonWeights === 'object') {
            console.log('  ✅ Has comparisonWeights object');
            console.log('  Weights:', JSON.stringify(name.comparisonWeights));
            bloomCorrect++;
        } else if (name?.comparisonWeights === null) {
            console.log('  ❌ comparisonWeights is null');
            bloomNull++;
        } else {
            console.log('  ⚠️  comparisonWeights is undefined or wrong type');
        }

        if (typeof name?.comparisonCalculator === 'function') {
            console.log('  ✅ Has comparisonCalculator function');
        } else {
            console.log('  ❌ Missing comparisonCalculator function');
            bloomMissingCalculator++;
        }
    }

    // Count all Bloomerang entities
    console.log('\n\nCounting all Bloomerang entities...');
    bloomCorrect = 0;
    bloomNull = 0;
    bloomMissingCalculator = 0;

    bloomKeys.forEach(key => {
        const name = bloomIndividuals[key].name;
        if (name?.comparisonWeights && typeof name.comparisonWeights === 'object') {
            bloomCorrect++;
        } else if (name?.comparisonWeights === null) {
            bloomNull++;
        }
        if (typeof name?.comparisonCalculator !== 'function') {
            bloomMissingCalculator++;
        }
    });

    console.log(`Bloomerang Results (${bloomKeys.length} total):`);
    console.log(`  ✅ Proper weights: ${bloomCorrect}`);
    console.log(`  ❌ Null weights: ${bloomNull}`);
    console.log(`  ❌ Missing calculator: ${bloomMissingCalculator}`);
    console.log();

    // Step 4: Summary
    console.log('=== SUMMARY ===');
    console.log();
    console.log('VisionAppraisal Individuals:');
    console.log(`  Total: ${vaIndividuals.length}`);
    console.log(`  With proper weights: ${vaCorrect} (${(vaCorrect / vaIndividuals.length * 100).toFixed(1)}%)`);
    console.log(`  With null weights: ${vaNull} (${(vaNull / vaIndividuals.length * 100).toFixed(1)}%)`);
    console.log(`  Missing calculator: ${vaMissingCalculator}`);
    console.log();
    console.log('Bloomerang Individuals:');
    console.log(`  Total: ${bloomKeys.length}`);
    console.log(`  With proper weights: ${bloomCorrect} (${(bloomCorrect / bloomKeys.length * 100).toFixed(1)}%)`);
    console.log(`  With null weights: ${bloomNull} (${(bloomNull / bloomKeys.length * 100).toFixed(1)}%)`);
    console.log(`  Missing calculator: ${bloomMissingCalculator}`);
    console.log();

    const allCorrect = vaCorrect === vaIndividuals.length && bloomCorrect === bloomKeys.length;
    const allHaveCalculator = vaMissingCalculator === 0 && bloomMissingCalculator === 0;

    if (allCorrect && allHaveCalculator) {
        console.log('🎉 ✅ SUCCESS: All entities have proper comparisonWeights and comparisonCalculator!');
    } else {
        console.log('⚠️  ISSUES DETECTED:');
        if (!allCorrect) {
            console.log('   - Some entities have null or missing comparisonWeights');
        }
        if (!allHaveCalculator) {
            console.log('   - Some entities missing comparisonCalculator function');
        }
    }

    return {
        visionAppraisal: {
            total: vaIndividuals.length,
            properWeights: vaCorrect,
            nullWeights: vaNull,
            missingCalculator: vaMissingCalculator
        },
        bloomerang: {
            total: bloomKeys.length,
            properWeights: bloomCorrect,
            nullWeights: bloomNull,
            missingCalculator: bloomMissingCalculator
        }
    };
}

// Export for browser use
if (typeof window !== 'undefined') {
    window.testComparisonWeightsAfterLoad = testComparisonWeightsAfterLoad;
    console.log('✅ testComparisonWeightsAfterLoad() loaded');
    console.log('📖 Usage:');
    console.log('   1. Refresh browser');
    console.log('   2. Click "🚀 Load All Entities Into Memory" button');
    console.log('   3. Wait for loading to complete');
    console.log('   4. Run: testComparisonWeightsAfterLoad()');
}
