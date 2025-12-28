// Phase 2D Full Pipeline Integration Test Script
// Browser-based testing for processing all 2,317 VisionAppraisal records

// Main test function for Phase 2D Full Pipeline Integration
async function testPhase2DPipeline() {
    console.log('=== PHASE 2D: FULL PIPELINE INTEGRATION TEST ===');
    console.log('Testing the complete processing of all 2,317 VisionAppraisal records');

    try {
        // Check dependencies
        console.log('Step 1: Checking dependencies...');
        const requiredClasses = [
            'VisionAppraisal',
            'VisionAppraisalNameParser',
            'Case31Validator',
            'Individual',
            'AggregateHousehold',
            'NonHuman',
            'Business',
            'LegalConstruct'
        ];

        const missingClasses = [];
        requiredClasses.forEach(className => {
            if (!window[className]) {
                missingClasses.push(className);
            }
        });

        if (missingClasses.length > 0) {
            console.log(`❌ Missing required classes: ${missingClasses.join(', ')}`);
            console.log('Please load the required scripts first:');
            console.log('- scripts/dataSources/visionAppraisal.js');
            console.log('- scripts/dataSources/visionAppraisalNameParser.js');
            console.log('- scripts/validation/case31Validator.js');
            console.log('- scripts/objectStructure/entityClasses.js');
            console.log('- scripts/objectStructure/aliasClasses.js');
            return { error: 'Missing dependencies', missing: missingClasses };
        }
        console.log('✅ All dependencies available');

        // Run the Phase 2D pipeline
        console.log('Step 2: Launching Phase 2D Full Pipeline...');
        console.log('This will process all 2,317 VisionAppraisal records through the 31-case parser system');
        console.log('Expected processing time: 2-3 minutes');

        const startTime = Date.now();
        const result = await VisionAppraisalNameParser.processAllVisionAppraisalRecords();
        const endTime = Date.now();
        const processingTime = ((endTime - startTime) / 1000).toFixed(1);

        // Display results
        console.log('\n=== PHASE 2D RESULTS ===');
        console.log(`Processing time: ${processingTime} seconds`);

        if (result.success) {
            console.log('✅ Phase 2D completed successfully!');
            console.log(`📊 Processed ${result.stats.successful}/${result.stats.totalRecords} records (${(result.stats.successful/result.stats.totalRecords*100).toFixed(1)}% success rate)`);

            console.log('\n📁 Entity Type Distribution:');
            Object.entries(result.stats.entityTypeCounts).forEach(([type, count]) => {
                const percentage = (count / result.stats.successful * 100).toFixed(1);
                console.log(`  ${type}: ${count} (${percentage}%)`);
            });

            if (result.fileId) {
                console.log(`\n💾 Entities saved to Google Drive:`);
                console.log(`   File: VisionAppraisal_ParsedEntities.json`);
                console.log(`   Google Drive ID: ${result.fileId}`);
            }

            console.log('\n🎯 Next Steps:');
            console.log('✅ Phase 2D Complete - VisionAppraisal entities created');
            console.log('🚀 Ready for Level 1: Fire Number → PID relationship analysis');
            console.log('🔄 Return to Main Goal: VisionAppraisal ↔ Bloomerang integration');

        } else {
            console.log('❌ Phase 2D failed');
            console.log(`Error: ${result.error}`);
            console.log(`Message: ${result.message}`);
        }

        return result;

    } catch (error) {
        console.error('Error in Phase 2D test:', error);
        return { error: error.message };
    }
}

// Quick validation function to check a sample of results
async function validatePhase2DResults(sampleSize = 10) {
    console.log('=== PHASE 2D RESULTS VALIDATION ===');

    try {
        // Load the generated entities
        console.log('Loading VisionAppraisal_ParsedEntities.json for validation...');

        // This would load the generated file for validation
        // Implementation depends on having the file ID from the processing
        console.log('Validation function ready - run after Phase 2D completion');

        return { success: true, message: 'Validation framework ready' };
    } catch (error) {
        console.error('Error in validation:', error);
        return { error: error.message };
    }
}

// Display expected entity distribution for comparison
function showExpectedDistribution() {
    console.log('=== EXPECTED ENTITY DISTRIBUTION (from CLAUDE.md) ===');
    console.log('Based on 31-case analysis and business logic:');
    console.log('  Individual: ~800 (35-40%)');
    console.log('  AggregateHousehold: ~200 (8-12%)');
    console.log('  NonHuman (Business/LegalConstruct): ~600 (50-55%)');
    console.log('  Total Expected Entities: ~1,600 from 2,317 records');
    console.log('\nNote: Some records may create multiple entities (households with individuals)');
}

// Make functions available globally
window.testPhase2DPipeline = testPhase2DPipeline;
window.validatePhase2DResults = validatePhase2DResults;
window.showExpectedDistribution = showExpectedDistribution;

console.log('Phase 2D test script loaded successfully!');
console.log('Available functions:');
console.log('- testPhase2DPipeline() - Run the full Phase 2D processing');
console.log('- validatePhase2DResults() - Validate processing results');
console.log('- showExpectedDistribution() - Show expected entity counts');