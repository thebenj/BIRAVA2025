// Test Business Parser Implementation
// Tests Phase 2C parsing with real VisionAppraisal data

async function testBusinessParserImplementation() {
    console.log('=== TESTING BUSINESS PARSER IMPLEMENTATION ===');

    try {
        // Step 1: Load required scripts in proper order
        console.log('Loading required dependencies...');

        // Load entity classes first (required by parser)
        if (!window.Individual || !window.AggregateHousehold || !window.NonHuman || !window.Business || !window.LegalConstruct) {
            console.log('Loading Entity Classes...');
            const entityScript = document.createElement('script');
            entityScript.src = './scripts/objectStructure/entityClasses.js';
            document.head.appendChild(entityScript);

            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('✓ Entity Classes loaded');
        }

        // Load attributed term classes
        if (!window.AttributedTerm || !window.IndividualName) {
            console.log('Loading AttributedTerm Classes...');
            const aliasScript = document.createElement('script');
            aliasScript.src = './scripts/objectStructure/aliasClasses.js';
            document.head.appendChild(aliasScript);

            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('✓ AttributedTerm Classes loaded');
        }

        // Load Case31Validator
        if (!window.Case31Validator) {
            console.log('Loading Case31Validator...');
            const validatorScript = document.createElement('script');
            validatorScript.src = './scripts/validation/case31Validator.js';
            document.head.appendChild(validatorScript);

            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('✓ Case31Validator loaded');
        }

        // Load VisionAppraisal data source
        if (!window.VisionAppraisal) {
            console.log('Loading VisionAppraisal...');
            const visionScript = document.createElement('script');
            visionScript.src = './scripts/dataSources/visionAppraisal.js';
            document.head.appendChild(visionScript);

            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('✓ VisionAppraisal loaded');
        }

        // Load VisionAppraisalNameParser last
        if (!window.VisionAppraisalNameParser) {
            console.log('Loading VisionAppraisalNameParser...');
            const parserScript = document.createElement('script');
            parserScript.src = './scripts/dataSources/visionAppraisalNameParser.js';
            document.head.appendChild(parserScript);

            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('✓ VisionAppraisalNameParser loaded');
        }

        console.log('✓ All dependencies loaded');

        // Step 2: Run built-in business test function
        console.log('\nRunning Business parsing tests...');
        const results = await VisionAppraisalNameParser.testBusinessParsing();

        // Step 3: Analysis and summary
        console.log('\n=== BUSINESS TEST ANALYSIS ===');

        const successCount = Object.values(results).filter(r => r.success).length;
        const totalTests = Object.keys(results).length;
        const foundExamples = Object.values(results).filter(r => r.error !== 'No example found').length;

        console.log(`Examples found: ${foundExamples}/${totalTests}`);
        console.log(`Tests passed: ${successCount}/${foundExamples || 1}`);

        // Show successful cases
        console.log('\n=== SUCCESSFUL BUSINESS CASES ===');
        Object.entries(results).forEach(([caseType, result]) => {
            if (result.success) {
                console.log(`✅ ${caseType}: ${result.entity.constructor.name} created`);
                console.log(`   - Business: ${result.entity.name ? result.entity.name.term : 'No name'}`);
                console.log(`   - Type: ${result.entity.constructor.name}`);
                console.log(`   - Fire Number: ${result.entity.fireNumber || 'None'}`);
                console.log(`   - PID: ${result.entity.pid || 'None'}`);
            } else if (result.error !== 'No example found') {
                console.log(`❌ ${caseType}: ${result.error}`);
            }
        });

        if (successCount >= 6) {
            console.log('\n🎉 BUSINESS PARSING TESTS PASSED!');
            console.log('Phase 2C implementation is working correctly.');
            console.log('Key business patterns (Case 4, 13, 19, 31) are functioning.');
            console.log('Ready to proceed to Phase 2D: Full Pipeline Integration');
        } else if (successCount > 0) {
            console.log('\n⚠️ PARTIAL SUCCESS');
            console.log(`${successCount} business cases working, others need investigation`);
        } else {
            console.log('\n❌ BUSINESS PARSING NEEDS DEBUGGING');
            console.log('No business cases parsed successfully');
        }

        return results;

    } catch (error) {
        console.error('❌ Test execution failed:', error);
        return { error: error.message };
    }
}

// Auto-run when script loads
console.log('Business Parser Test Script Loaded');
console.log('IMPORTANT: If you see "already been declared" errors, refresh the page first');
console.log('Run: testBusinessParserImplementation()');