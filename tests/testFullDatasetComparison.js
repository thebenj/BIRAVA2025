// Comprehensive Full Dataset Comparison Test
// Runs both parsers on complete 2,317 record dataset and compares every result

async function testFullDatasetComparison() {
    console.log('=== COMPREHENSIVE FULL DATASET COMPARISON ===');
    console.log('Testing both parsers on complete 2,317 VisionAppraisal records...\n');

    try {
        // Step 1: Load and validate all dependencies
        console.log('🔍 Checking dependencies...');
        if (!window.VisionAppraisal) throw new Error('VisionAppraisal not loaded');
        if (!window.VisionAppraisalNameParser) throw new Error('VisionAppraisalNameParser not loaded');
        if (!window.ConfigurableVisionAppraisalNameParser) throw new Error('ConfigurableVisionAppraisalNameParser not loaded');
        if (!window.Case31Validator) throw new Error('Case31Validator not loaded');
        console.log('✅ All dependencies validated');

        // Step 2: Load VisionAppraisal dataset
        console.log('\n📊 Loading VisionAppraisal dataset...');
        const records = await VisionAppraisal.loadData();
        console.log(`✅ Loaded ${records.length} records`);

        // Step 3: Initialize comparison tracking
        let totalTests = 0;
        let identicalResults = 0;
        let differences = [];
        let originalParserCases = {};
        let configurableParserCases = {};

        console.log('\n🔄 Running comprehensive comparison...');
        console.log('Progress indicators: . = identical, X = different\n');

        // Step 4: Process every record with both parsers
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            totalTests++;

            try {
                // Run original parser
                const originalResult = VisionAppraisalNameParser.parseRecordToEntity(record, i);
                const originalType = originalResult ? originalResult.constructor.name : 'null';
                const originalCase = originalResult ? (originalResult._debugCase || 'unknown') : 'no_match';

                // Track case usage
                originalParserCases[originalCase] = (originalParserCases[originalCase] || 0) + 1;

                // Run configurable parser
                const configurableResult = ConfigurableVisionAppraisalNameParser.parseRecordToEntity(record, i);
                const configurableType = configurableResult ? configurableResult.constructor.name : 'null';

                // For configurable parser, case detection is different - check the logs
                let configurableCase = 'no_match';
                if (configurableResult) {
                    // The configurable parser logs which case matched
                    configurableCase = 'matched'; // We'll need to enhance this
                }

                // Track configurable case usage
                configurableParserCases[configurableCase] = (configurableParserCases[configurableCase] || 0) + 1;

                // Compare results
                const resultsMatch = compareEntityResults(originalResult, configurableResult);

                if (resultsMatch) {
                    identicalResults++;
                    process.stdout.write('.');
                } else {
                    differences.push({
                        index: i,
                        ownerName: record.ownerName,
                        pid: record.pid,
                        original: {
                            type: originalType,
                            case: originalCase,
                            name: originalResult?.name?.fullName?.term || 'no name'
                        },
                        configurable: {
                            type: configurableType,
                            case: configurableCase,
                            name: configurableResult?.name?.fullName?.term || 'no name'
                        }
                    });
                    process.stdout.write('X');
                }

                // Progress update every 100 records
                if ((i + 1) % 100 === 0) {
                    console.log(`\n📊 Progress: ${i + 1}/${records.length} (${Math.round(((i + 1) / records.length) * 100)}%)`);
                    console.log(`✅ Identical: ${identicalResults}, ❌ Different: ${differences.length}`);
                }

            } catch (error) {
                differences.push({
                    index: i,
                    ownerName: record.ownerName,
                    pid: record.pid,
                    error: error.message
                });
                console.log('E', error.message);
            }
        }

        console.log('\n\n=== COMPREHENSIVE COMPARISON RESULTS ===');

        // Summary statistics
        const successRate = Math.round((identicalResults / totalTests) * 100);
        console.log(`📊 Total Records Tested: ${totalTests}`);
        console.log(`✅ Identical Results: ${identicalResults} (${successRate}%)`);
        console.log(`❌ Different Results: ${differences.length} (${Math.round((differences.length / totalTests) * 100)}%)`);

        // Case distribution comparison
        console.log('\n📋 CASE DISTRIBUTION COMPARISON:');
        console.log('Original Parser Cases:');
        Object.entries(originalParserCases).sort((a, b) => b[1] - a[1]).forEach(([caseType, count]) => {
            const percentage = Math.round((count / totalTests) * 100);
            console.log(`  ${caseType}: ${count} (${percentage}%)`);
        });

        console.log('\nConfigurable Parser Cases:');
        Object.entries(configurableParserCases).sort((a, b) => b[1] - a[1]).forEach(([caseType, count]) => {
            const percentage = Math.round((count / totalTests) * 100);
            console.log(`  ${caseType}: ${count} (${percentage}%)`);
        });

        // Detailed difference analysis
        if (differences.length > 0) {
            console.log('\n🔍 DETAILED DIFFERENCE ANALYSIS:');
            console.log(`First 10 differences (out of ${differences.length}):`);

            differences.slice(0, 10).forEach((diff, idx) => {
                console.log(`\n${idx + 1}. Record ${diff.index} (PID: ${diff.pid})`);
                console.log(`   Name: "${diff.ownerName}"`);
                if (diff.error) {
                    console.log(`   Error: ${diff.error}`);
                } else {
                    console.log(`   Original: ${diff.original.type} (${diff.original.case}) - "${diff.original.name}"`);
                    console.log(`   Configurable: ${diff.configurable.type} (${diff.configurable.case}) - "${diff.configurable.name}"`);
                }
            });

            if (differences.length > 10) {
                console.log(`\n... and ${differences.length - 10} more differences`);
            }
        }

        // Final assessment
        console.log('\n=== FINAL ASSESSMENT ===');
        if (differences.length === 0) {
            console.log('🎉 PERFECT MATCH!');
            console.log('✅ Both parsers produce 100% identical results');
            console.log('✅ ConfigurableVisionAppraisalNameParser is ready for production');
            console.log('✅ Safe to proceed with migration');
        } else if (differences.length < (totalTests * 0.01)) { // Less than 1% different
            console.log('🟡 MINIMAL DIFFERENCES DETECTED');
            console.log(`⚠️ ${differences.length} differences found (${Math.round((differences.length / totalTests) * 100)}%)`);
            console.log('🔍 Investigation recommended before migration');
        } else {
            console.log('🚨 SIGNIFICANT DIFFERENCES DETECTED');
            console.log(`❌ ${differences.length} differences found (${Math.round((differences.length / totalTests) * 100)}%)`);
            console.log('🛑 DO NOT MIGRATE until differences are resolved');
        }

        return {
            success: differences.length === 0,
            totalTests,
            identicalResults,
            differenceCount: differences.length,
            successRate,
            differences,
            originalParserCases,
            configurableParserCases
        };

    } catch (error) {
        console.error('❌ Full dataset comparison failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Helper function to compare entity results
function compareEntityResults(original, configurable) {
    // Both null = match
    if (!original && !configurable) return true;

    // One null, one not = no match
    if (!original || !configurable) return false;

    // Different entity types = no match
    if (original.constructor.name !== configurable.constructor.name) return false;

    // Compare basic properties
    if (original.pid !== configurable.pid) return false;

    // Compare name objects
    if (!compareNameObjects(original.name, configurable.name)) return false;

    // If we get here, they're essentially the same
    return true;
}

// Helper function to compare name objects
function compareNameObjects(originalName, configurableName) {
    // Both null = match
    if (!originalName && !configurableName) return true;

    // One null, one not = no match
    if (!originalName || !configurableName) return false;

    // Different name types = no match
    if (originalName.constructor.name !== configurableName.constructor.name) return false;

    // Compare fullName terms
    const originalTerm = originalName.fullName?.term || '';
    const configurableTerm = configurableName.fullName?.term || '';

    return originalTerm === configurableTerm;
}

// Auto-run instructions
console.log('Full Dataset Comparison Test Script Loaded');
console.log('IMPORTANT: This will run both parsers on all 2,317 records');
console.log('Expected runtime: 2-5 minutes depending on system performance');
console.log('Run: testFullDatasetComparison()');