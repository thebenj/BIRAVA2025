// Test Individual Parser Implementation
// Tests Phase 2A parsing with real VisionAppraisal data

async function testIndividualParserImplementation() {
    console.log('=== TESTING INDIVIDUAL PARSER IMPLEMENTATION ===');

    try {
        // Step 1: Load required scripts in proper order
        console.log('Loading required dependencies...');

        // Load entity classes first (required by parser)
        if (!window.Individual || !window.AggregateHousehold || !window.NonHuman) {
            console.log('Loading Entity Classes...');
            const entityScript = document.createElement('script');
            entityScript.src = './scripts/objectStructure/entityClasses.js';
            document.head.appendChild(entityScript);

            await new Promise((resolve) => {
                setTimeout(() => {
                    console.log('✓ Entity Classes loaded');
                    resolve();
                }, 1000);
            });
        }

        // Load attributed term classes
        if (!window.AttributedTerm || !window.IndividualName) {
            console.log('Loading AttributedTerm Classes...');
            const aliasScript = document.createElement('script');
            aliasScript.src = './scripts/objectStructure/aliasClasses.js';
            document.head.appendChild(aliasScript);

            await new Promise((resolve) => {
                setTimeout(() => {
                    console.log('✓ AttributedTerm Classes loaded');
                    resolve();
                }, 1000);
            });
        }

        // Load Case31Validator
        if (!window.Case31Validator) {
            console.log('Loading Case31Validator...');
            const validatorScript = document.createElement('script');
            validatorScript.src = './scripts/validation/case31Validator.js';
            document.head.appendChild(validatorScript);

            await new Promise((resolve) => {
                setTimeout(() => {
                    console.log('✓ Case31Validator loaded');
                    resolve();
                }, 1000);
            });
        }

        // Load VisionAppraisal data source
        if (!window.VisionAppraisal) {
            console.log('Loading VisionAppraisal...');
            const visionScript = document.createElement('script');
            visionScript.src = './scripts/dataSources/visionAppraisal.js';
            document.head.appendChild(visionScript);

            await new Promise((resolve) => {
                setTimeout(() => {
                    console.log('✓ VisionAppraisal loaded');
                    resolve();
                }, 1000);
            });
        }

        // Load ConfigurableVisionAppraisalNameParser last
        if (!window.ConfigurableVisionAppraisalNameParser) {
            console.log('Loading ConfigurableVisionAppraisalNameParser...');
            const parserScript = document.createElement('script');
            parserScript.src = './scripts/dataSources/configurableVisionAppraisalNameParser.js';
            document.head.appendChild(parserScript);

            await new Promise((resolve) => {
                setTimeout(() => {
                    console.log('✓ ConfigurableVisionAppraisalNameParser loaded');
                    resolve();
                }, 1000);
            });
        }

        console.log('✓ All dependencies loaded');

        // Step 2: Run built-in test function
        console.log('\nRunning Individual parsing tests...');
        const results = await ConfigurableVisionAppraisalNameParser.testConfigurationEngine();

        // Step 3: Analysis and summary
        console.log('\n=== TEST ANALYSIS ===');

        const successCount = Object.values(results).filter(r => r.success).length;
        const totalTests = Object.keys(results).length;

        console.log(`Tests passed: ${successCount}/${totalTests}`);

        if (successCount === totalTests) {
            console.log('🎉 ALL INDIVIDUAL PARSING TESTS PASSED!');
            console.log('Phase 2A implementation is working correctly.');
            console.log('Ready to proceed to Phase 2B: Household Parsing');
        } else {
            console.log('⚠️ Some tests failed - debugging required');

            // Show failed tests
            Object.entries(results).forEach(([caseType, result]) => {
                if (!result.success) {
                    console.error(`❌ ${caseType}: ${result.error}`);
                }
            });
        }

        return results;

    } catch (error) {
        console.error('❌ Test execution failed:', error);
        return { error: error.message };
    }
}

// Auto-run when script loads
console.log('Individual Parser Test Script Loaded');
console.log('IMPORTANT: If you see "already been declared" errors, refresh the page first');
console.log('Run: testIndividualParserImplementation()');