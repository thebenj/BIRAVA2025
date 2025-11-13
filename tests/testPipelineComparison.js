// Production-Level Pipeline Comparison Test
// Compares complete testPhase2DPipeline() results between both parsers
// This tests the actual production standard for parser replacement

async function testPipelineComparison(quiet = true) {
    console.log('=== PRODUCTION PIPELINE COMPARISON TEST ===');
    console.log('Testing both parsers through complete processAllVisionAppraisalRecords pipeline');
    console.log('This is the real production standard for parser replacement\n');

    try {
        // Step 1: Validate dependencies
        console.log('🔍 Validating all dependencies...');
        if (!window.VisionAppraisalNameParser) throw new Error('VisionAppraisalNameParser not loaded');
        if (!window.ConfigurableVisionAppraisalNameParser) throw new Error('ConfigurableVisionAppraisalNameParser not loaded');
        if (!window.testPhase2DPipeline) throw new Error('testPhase2DPipeline function not loaded');

        // Check if processAllVisionAppraisalRecords exists on original parser
        if (!VisionAppraisalNameParser.processAllVisionAppraisalRecords) {
            throw new Error('VisionAppraisalNameParser.processAllVisionAppraisalRecords not found');
        }
        console.log('✅ All dependencies validated');

        // Step 2: Run original parser pipeline (baseline)
        console.log('\n📊 PHASE 1: Running Original Parser Pipeline...');
        console.log('This establishes the baseline results that must be matched');

        const originalStartTime = Date.now();
        const originalResult = await testPhase2DPipeline();
        const originalEndTime = Date.now();
        const originalTime = ((originalEndTime - originalStartTime) / 1000).toFixed(1);

        if (!originalResult.success) {
            throw new Error(`Original parser pipeline failed: ${originalResult.error}`);
        }

        console.log(`✅ Original parser completed in ${originalTime} seconds`);
        console.log(`📊 Baseline Results:`);
        console.log(`   Success Rate: ${originalResult.stats.successful}/${originalResult.stats.totalRecords} (${(originalResult.stats.successful/originalResult.stats.totalRecords*100).toFixed(1)}%)`);
        console.log(`   Entity Distribution:`);
        Object.entries(originalResult.stats.entityTypeCounts).forEach(([type, count]) => {
            const percentage = (count / originalResult.stats.successful * 100).toFixed(1);
            console.log(`     ${type}: ${count} (${percentage}%)`);
        });

        // Step 3: Check if configurable parser has the same method
        console.log('\n🔧 PHASE 2: Preparing Configurable Parser Pipeline...');

        if (!ConfigurableVisionAppraisalNameParser.processAllVisionAppraisalRecords) {
            console.log('⚠️ ConfigurableVisionAppraisalNameParser.processAllVisionAppraisalRecords not found');
            console.log('📝 Need to create equivalent pipeline method for configurable parser');

            // For now, return results showing this needs to be implemented
            return {
                success: false,
                needsImplementation: true,
                message: 'ConfigurableVisionAppraisalNameParser needs processAllVisionAppraisalRecords method',
                baselineResults: originalResult,
                nextSteps: [
                    'Create processAllVisionAppraisalRecords method for ConfigurableVisionAppraisalNameParser',
                    'Mirror the exact same pipeline flow as original parser',
                    'Re-run this comparison test'
                ]
            };
        }

        // Step 4: Run configurable parser pipeline
        console.log('🔄 Running Configurable Parser Pipeline...');

        const configurableStartTime = Date.now();
        // Call configurable parser directly with quiet parameter
        const configurableResult = await ConfigurableVisionAppraisalNameParser.processAllVisionAppraisalRecords(quiet);

        const configurableEndTime = Date.now();
        const configurableTime = ((configurableEndTime - configurableStartTime) / 1000).toFixed(1);

        if (!configurableResult.success) {
            throw new Error(`Configurable parser pipeline failed: ${configurableResult.error}`);
        }

        console.log(`✅ Configurable parser completed in ${configurableTime} seconds`);

        // Step 5: Compare pipeline results
        console.log('\n🔍 PHASE 3: PIPELINE RESULTS COMPARISON');

        const resultsMatch = comparePipelineResults(originalResult, configurableResult);

        console.log('\n=== FINAL PIPELINE COMPARISON ===');
        if (resultsMatch.identical) {
            console.log('🎉 PERFECT PIPELINE MATCH!');
            console.log('✅ Both parsers produce identical pipeline results');
            console.log('✅ ConfigurableVisionAppraisalNameParser ready for production');
            console.log('✅ Safe to proceed with migration');
        } else {
            console.log('🚨 PIPELINE DIFFERENCES DETECTED');
            console.log('❌ Parsers produce different pipeline results');
            console.log('🛑 DO NOT MIGRATE until differences are resolved');

            console.log('\n📊 Detailed Differences:');
            resultsMatch.differences.forEach(diff => {
                console.log(`  ${diff}`);
            });
        }

        return {
            success: resultsMatch.identical,
            originalResults: originalResult,
            configurableResults: configurableResult,
            comparison: resultsMatch,
            processingTimes: {
                original: originalTime,
                configurable: configurableTime
            }
        };

    } catch (error) {
        console.error('❌ Pipeline comparison failed:', error);
        return {
            success: false,
            error: error.message,
            message: 'Pipeline comparison test failed'
        };
    }
}

// Compare complete pipeline results (not individual records)
function comparePipelineResults(original, configurable) {
    const differences = [];

    // Compare success rates
    if (original.stats.successful !== configurable.stats.successful) {
        differences.push(`Success count: ${original.stats.successful} vs ${configurable.stats.successful}`);
    }

    if (original.stats.totalRecords !== configurable.stats.totalRecords) {
        differences.push(`Total records: ${original.stats.totalRecords} vs ${configurable.stats.totalRecords}`);
    }

    // Compare entity type distributions
    const originalTypes = original.stats.entityTypeCounts;
    const configurableTypes = configurable.stats.entityTypeCounts;

    const allTypes = new Set([...Object.keys(originalTypes), ...Object.keys(configurableTypes)]);

    for (const type of allTypes) {
        const originalCount = originalTypes[type] || 0;
        const configurableCount = configurableTypes[type] || 0;

        if (originalCount !== configurableCount) {
            differences.push(`${type} count: ${originalCount} vs ${configurableCount}`);
        }
    }

    return {
        identical: differences.length === 0,
        differences: differences
    };
}

// Quick test to check if both parsers are loaded and ready
function validatePipelineTestReady() {
    console.log('=== PIPELINE TEST READINESS CHECK ===');

    const checks = [
        { name: 'VisionAppraisalNameParser', available: !!window.VisionAppraisalNameParser },
        { name: 'ConfigurableVisionAppraisalNameParser', available: !!window.ConfigurableVisionAppraisalNameParser },
        { name: 'testPhase2DPipeline', available: !!window.testPhase2DPipeline },
        { name: 'VisionAppraisalNameParser.processAllVisionAppraisalRecords',
          available: !!(window.VisionAppraisalNameParser && window.VisionAppraisalNameParser.processAllVisionAppraisalRecords) }
    ];

    let allReady = true;
    checks.forEach(check => {
        const status = check.available ? '✅' : '❌';
        console.log(`${status} ${check.name}`);
        if (!check.available) allReady = false;
    });

    console.log(`\n${allReady ? '🎯' : '⚠️'} Pipeline test ${allReady ? 'READY' : 'NOT READY'}`);

    return allReady;
}

// Make functions available globally
window.testPipelineComparison = testPipelineComparison;
window.validatePipelineTestReady = validatePipelineTestReady;

console.log('Pipeline Comparison Test Script Loaded');
console.log('This tests the actual production standard for parser replacement');
console.log('Functions available:');
console.log('- validatePipelineTestReady() - Check if ready for testing');
console.log('- testPipelineComparison() - Run the complete pipeline comparison');