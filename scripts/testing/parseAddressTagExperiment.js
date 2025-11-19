/**
 * parseAddress Library Tag Replacement Experiment
 *
 * PURPOSE: Test how the parse-address library handles different strategies
 * for replacing VisionAppraisal tags (:^#^: and ::#^#::) in addresses
 *
 * EXPERIMENT DESIGN:
 * - Use real VisionAppraisal address samples with tags
 * - Test multiple replacement strategies systematically
 * - Compare parsing results to identify optimal approach
 *
 * NO CHANGES TO PRODUCTION CODE - Pure experimental function
 */

function testParseAddressTagReplacements() {
    console.log('🧪 === PARSEADDRESS LIBRARY TAG REPLACEMENT EXPERIMENT ===\n');

    if (typeof parseAddress === 'undefined') {
        console.error('❌ parse-address library not loaded. Load address processing scripts first.');
        return;
    }

    // Test cases from real VisionAppraisal data
    const testCases = [
        "730 3RD AVE:^#^: 11TH FLOOR::#^#::NEW YORK:^#^: NY 10017",
        "1 FALMOUTH ROAD::#^#::YONKERS:^#^: NY 10710",
        "123 MAIN ST:^#^: APT 2::#^#::BLOCK ISLAND:^#^: RI 02807",
        "456 OCEAN DR::#^#::NEW SHOREHAM:^#^: RI 02807",
        "789 BEACH NECK:^#^: UNIT A::#^#::WESTERLY:^#^: RI 02891"
    ];

    // Replacement strategies to test - focused on differential tag replacement
    const strategies = [
        {
            name: "CURRENT",
            description: "Pass tags through as-is (baseline reference)",
            replacements: {
                ":^#^:": ":^#^:",  // No change
                "::#^#::": "::#^#::"  // No change
            }
        },
        {
            name: "COMMA_COMMA",
            description: ":^#^: → comma, ::#^#:: → comma",
            replacements: {
                ":^#^:": ",",
                "::#^#::": ","
            }
        },
        {
            name: "SPACE_SPACE",
            description: ":^#^: → space, ::#^#:: → space",
            replacements: {
                ":^#^:": " ",
                "::#^#::": " "
            }
        },
        {
            name: "NEWLINE_NEWLINE",
            description: ":^#^: → newline, ::#^#:: → newline",
            replacements: {
                ":^#^:": "\n",
                "::#^#::": "\n"
            }
        },
        {
            name: "COMMA_SPACE",
            description: ":^#^: → comma, ::#^#:: → space",
            replacements: {
                ":^#^:": ",",
                "::#^#::": " "
            }
        },
        {
            name: "COMMA_NEWLINE",
            description: ":^#^: → comma, ::#^#:: → newline",
            replacements: {
                ":^#^:": ",",
                "::#^#::": "\n"
            }
        },
        {
            name: "SPACE_COMMA",
            description: ":^#^: → space, ::#^#:: → comma",
            replacements: {
                ":^#^:": " ",
                "::#^#::": ","
            }
        },
        {
            name: "SPACE_NEWLINE",
            description: ":^#^: → space, ::#^#:: → newline",
            replacements: {
                ":^#^:": " ",
                "::#^#::": "\n"
            }
        },
        {
            name: "NEWLINE_COMMA",
            description: ":^#^: → newline, ::#^#:: → comma",
            replacements: {
                ":^#^:": "\n",
                "::#^#::": ","
            }
        },
        {
            name: "NEWLINE_SPACE",
            description: ":^#^: → newline, ::#^#:: → space",
            replacements: {
                ":^#^:": "\n",
                "::#^#::": " "
            }
        }
    ];

    const results = [];

    testCases.forEach((originalAddress, caseIndex) => {
        console.log(`\n📍 TEST CASE ${caseIndex + 1}: "${originalAddress}"`);
        console.log('=' .repeat(80));

        const caseResults = {
            originalAddress,
            strategyResults: []
        };

        strategies.forEach((strategy, strategyIndex) => {
            let processedAddress = originalAddress;
            let parseInput = originalAddress;

            // Apply standard replacement strategy
            Object.entries(strategy.replacements).forEach(([tag, replacement]) => {
                const regex = new RegExp(tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                parseInput = parseInput.replace(regex, replacement);
            });

            // Parse with the library
            let parseResult = null;
            let parseError = null;

            try {
                parseResult = parseAddress.parseLocation(parseInput.trim());
            } catch (error) {
                parseError = error.message;
            }

            // Analyze results
            const strategyResult = {
                strategyName: strategy.name,
                description: strategy.description,
                parseInput: parseInput,
                parseResult: parseResult,
                parseError: parseError,
                analysis: {
                    parsed: !!parseResult,
                    hasStreetNumber: parseResult?.number || null,
                    hasStreetName: parseResult?.street || null,
                    hasStreetType: parseResult?.type || null,
                    hasCity: parseResult?.city || null,
                    hasState: parseResult?.state || null,
                    hasZip: parseResult?.zip || null
                }
            };

            caseResults.strategyResults.push(strategyResult);

            // Display results
            console.log(`\n${strategyIndex + 1}. ${strategy.name}: ${strategy.description}`);
            console.log(`   Input: "${parseInput}"`);

            if (parseError) {
                console.log(`   ❌ Parse Error: ${parseError}`);
            } else if (parseResult) {
                console.log(`   ✅ Parsed Successfully:`);
                // Display ALL properties returned by the library
                Object.keys(parseResult).sort().forEach(key => {
                    const value = parseResult[key];
                    console.log(`      ${key}: "${value || '(none)'}"`);
                });
                // Also show raw object for completeness
                console.log(`      RAW: `, parseResult);
            } else {
                console.log(`   ⚠️ Parse returned null`);
            }
        });

        results.push(caseResults);
    });

    // Summary analysis
    console.log('\n\n📊 === EXPERIMENT SUMMARY ===');
    console.log('Strategy Performance Analysis:\n');

    strategies.forEach(strategy => {
        let successCount = 0;
        let totalTests = testCases.length;
        let streetTypeCount = 0;
        let cityCount = 0;

        results.forEach(caseResult => {
            const strategyResult = caseResult.strategyResults.find(s => s.strategyName === strategy.name);
            if (strategyResult?.analysis.parsed) {
                successCount++;
                if (strategyResult.analysis.hasStreetType) streetTypeCount++;
                if (strategyResult.analysis.hasCity) cityCount++;
            }
        });

        console.log(`${strategy.name}:`);
        console.log(`  Success Rate: ${successCount}/${totalTests} (${((successCount/totalTests)*100).toFixed(1)}%)`);
        console.log(`  Street Type Extraction: ${streetTypeCount}/${totalTests} (${((streetTypeCount/totalTests)*100).toFixed(1)}%)`);
        console.log(`  City Extraction: ${cityCount}/${totalTests} (${((cityCount/totalTests)*100).toFixed(1)}%)`);
        console.log('');
    });

    console.log('🔬 Experiment complete. Analyze results to determine optimal tag replacement strategy.');

    return results;
}

// Helper function to export results for further analysis
function exportTagExperimentResults(results) {
    const exportData = {
        timestamp: new Date().toISOString(),
        experimentType: 'parseAddress Tag Replacement',
        testCaseCount: results.length,
        strategyCount: results[0]?.strategyResults.length || 0,
        results: results
    };

    console.log('📁 Experiment results exported:');
    console.log(JSON.stringify(exportData, null, 2));

    return exportData;
}