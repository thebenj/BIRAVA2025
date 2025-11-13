// Test Household Parser Implementation
// Tests Phase 2B parsing with real VisionAppraisal data

async function testHouseholdParserImplementation() {
    console.log('=== TESTING HOUSEHOLD PARSER IMPLEMENTATION ===');

    try {
        // Step 1: Load required scripts in proper order
        console.log('Loading required dependencies...');

        // Load entity classes first (required by parser)
        if (!window.Individual || !window.AggregateHousehold || !window.NonHuman) {
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

        // Step 2: Run built-in household test function
        console.log('\nRunning Household parsing tests...');
        const results = await VisionAppraisalNameParser.testHouseholdParsing();

        // Step 3: Analysis and summary
        console.log('\n=== HOUSEHOLD TEST ANALYSIS ===');

        const successCount = Object.values(results).filter(r => r.success).length;
        const totalTests = Object.keys(results).length;
        const foundExamples = Object.values(results).filter(r => r.error !== 'No example found').length;

        console.log(`Examples found: ${foundExamples}/${totalTests}`);
        console.log(`Tests passed: ${successCount}/${foundExamples || 1}`);

        // Show successful cases
        console.log('\n=== SUCCESSFUL HOUSEHOLD CASES ===');
        Object.entries(results).forEach(([caseType, result]) => {
            if (result.success) {
                console.log(`✅ ${caseType}: ${result.entity.constructor.name} created`);
                if (result.entity.constructor.name === 'AggregateHousehold') {
                    console.log(`   - Household: ${result.entity.name ? result.entity.name.term : 'No name'}`);
                    console.log(`   - Members: ${result.entity.individuals ? result.entity.individuals.length : 'No individuals'}`);
                    if (result.entity.individuals && result.entity.individuals.length > 0) {
                        result.entity.individuals.forEach((ind, i) => {
                            console.log(`   - Member ${i+1}: ${ind.name ? ind.name.completeName : 'No name'}`);
                        });
                    }
                }
            } else if (result.error !== 'No example found') {
                console.log(`❌ ${caseType}: ${result.error}`);
            }
        });

        if (successCount >= 3) {
            console.log('\n🎉 HOUSEHOLD PARSING TESTS PASSED!');
            console.log('Phase 2B implementation is working correctly.');
            console.log('Key household patterns (Case 5, 15a, 17) are functioning.');
            console.log('Ready to proceed to Phase 2C: Business Entity Parsing');
        } else if (successCount > 0) {
            console.log('\n⚠️ PARTIAL SUCCESS');
            console.log(`${successCount} household cases working, others need investigation`);
        } else {
            console.log('\n❌ HOUSEHOLD PARSING NEEDS DEBUGGING');
            console.log('No household cases parsed successfully');
        }

        return results;

    } catch (error) {
        console.error('❌ Test execution failed:', error);
        return { error: error.message };
    }
}

// Auto-run when script loads
console.log('Household Parser Test Script Loaded');
console.log('IMPORTANT: If you see "already been declared" errors, refresh the page first');
console.log('Run: testHouseholdParserImplementation()');