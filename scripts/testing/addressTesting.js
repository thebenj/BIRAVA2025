/**
 * Address Processing Test Suite Module
 *
 * Comprehensive testing and validation infrastructure for address processing functions.
 * Extracted from utils.js for better modularity and test organization.
 *
 * Dependencies:
 * - Address class from aliasClasses.js
 * - Address processing functions from address/addressProcessing.js
 * - parse-address library for address parsing
 *
 * Key Features:
 * - 6-step address validation system
 * - Comprehensive test suite with scalable test cases
 * - Quick testing tools for development/debugging
 * - Regression testing infrastructure (Protocol 2)
 */

/**
 * Validate Address processing by testing key functionality
 * Tests Address creation, fire number detection, and serialization
 * @param {Address} address - Address instance to validate
 * @param {Object} originalProcessed - Original processed address data for comparison
 * @returns {Object} Validation results
 */
function validateAddressProcessing(address, originalProcessed) {
    const results = {
        total: 0,
        passed: 0,
        failed: 0,
        tests: []
    };

    // Test 1: Address instance created successfully
    results.total++;
    if (address instanceof Address) {
        results.passed++;
        results.tests.push('✅ Address instance created successfully');
    } else {
        results.failed++;
        results.tests.push('❌ Address instance creation failed');
        return results; // Cannot continue without valid Address
    }

    // Test 2: Original address preservation
    results.total++;
    if (address.originalAddress && address.originalAddress.term === originalProcessed.original) {
        results.passed++;
        results.tests.push('✅ Original address preserved correctly');
    } else {
        results.failed++;
        results.tests.push('❌ Original address not preserved correctly');
    }

    // Test 3: Block Island detection accuracy
    results.total++;
    const expectedBI = originalProcessed.isBlockIslandAddress === true;
    const actualBI = address.isBlockIslandAddress && address.isBlockIslandAddress.term === true;
    if (expectedBI === actualBI) {
        results.passed++;
        results.tests.push(`✅ Block Island detection correct (${expectedBI})`);
    } else {
        results.failed++;
        results.tests.push(`❌ Block Island detection incorrect - expected: ${expectedBI}, got: ${actualBI}`);
    }

    // Test 4: Fire number detection (for Block Island addresses)
    results.total++;
    if (expectedBI && originalProcessed.number) {
        const fireNumber = address.getFireNumber();
        if (fireNumber && fireNumber.term === originalProcessed.number) {
            results.passed++;
            results.tests.push(`✅ Fire number detection correct (${originalProcessed.number})`);
        } else {
            results.failed++;
            results.tests.push(`❌ Fire number detection failed - expected: ${originalProcessed.number}, got: ${fireNumber ? fireNumber.term : 'null'}`);
        }
    } else if (!expectedBI) {
        const fireNumber = address.getFireNumber();
        if (!fireNumber) {
            results.passed++;
            results.tests.push('✅ Fire number correctly null for non-BI address');
        } else {
            results.failed++;
            results.tests.push(`❌ Fire number should be null for non-BI address, got: ${fireNumber.term}`);
        }
    } else {
        results.passed++;
        results.tests.push('✅ Fire number test skipped (no street number in BI address)');
    }

    // Test 5: Serialization/deserialization
    results.total++;
    try {
        const serialized = address.serialize();
        const deserialized = Address.deserialize(serialized);
        if (deserialized instanceof Address && deserialized.toString() === address.toString()) {
            results.passed++;
            results.tests.push('✅ Serialization/deserialization working correctly');
        } else {
            results.failed++;
            results.tests.push('❌ Serialization/deserialization failed');
        }
    } catch (error) {
        results.failed++;
        results.tests.push(`❌ Serialization/deserialization error: ${error.message}`);
    }

    // Test 6: Component extraction validation
    results.total++;
    let componentsPassed = 0;
    let componentsTotal = 0;

    const componentChecks = [
        { name: 'streetNumber', original: 'number' },
        { name: 'streetName', original: 'street' },
        { name: 'streetType', original: 'type' },
        { name: 'city', original: 'city' },
        { name: 'state', original: 'state' },
        { name: 'zipCode', original: 'zip' }
    ];

    componentChecks.forEach(check => {
        if (originalProcessed[check.original]) {
            componentsTotal++;
            if (address[check.name] && address[check.name].term === originalProcessed[check.original]) {
                componentsPassed++;
            }
        }
    });

    if (componentsTotal === 0 || componentsPassed === componentsTotal) {
        results.passed++;
        results.tests.push(`✅ Address components extracted correctly (${componentsPassed}/${componentsTotal})`);
    } else {
        results.failed++;
        results.tests.push(`❌ Address components incomplete - ${componentsPassed}/${componentsTotal} correct`);
    }

    return results;
}

/**
 * Comprehensive Address Processing Test Suite (Protocol 2 - Permanent)
 * Tests the complete address processing pipeline with various address types
 * Designed for regression testing and scalable validation
 * @param {Array} testAddresses - Array of test address objects {addr, source, field, description}
 * @param {boolean} verbose - Show detailed output for each test
 * @returns {Object} Comprehensive test results
 */
function addressProcessingTests(testAddresses = null, verbose = false) {
    console.log('🏗️ Address Processing Test Suite - Starting comprehensive validation...');

    // Default test addresses if none provided
    if (!testAddresses) {
        testAddresses = [
            {
                addr: '123 Main St, Block Island, RI 02807',
                source: 'VisionAppraisal',
                field: 'propertyLocation',
                description: 'Standard Block Island street address'
            },
            {
                addr: '456 Ocean Ave, New Shoreham, RI 02807',
                source: 'Bloomerang',
                field: 'primaryAddress',
                description: 'Block Island address with New Shoreham city name'
            },
            {
                addr: 'PO Box 100, Block Island, RI 02807',
                source: 'VisionAppraisal',
                field: 'mailingAddress',
                description: 'Block Island PO Box address'
            },
            {
                addr: '789 Spring Street Block Island RI',
                source: 'Bloomerang',
                field: 'homeAddress',
                description: 'Block Island address without commas or ZIP'
            },
            {
                addr: '1234 Broadway, New York, NY 10001',
                source: 'Bloomerang',
                field: 'vacationAddress',
                description: 'Non-Block Island address'
            },
            {
                addr: '321 Harbor Rd, New Shoreham, Rhode Island 02807-1234',
                source: 'VisionAppraisal',
                field: 'ownerAddress',
                description: 'Block Island address with ZIP+4'
            }
        ];
    }

    const overallResults = {
        total: testAddresses.length,
        passed: 0,
        failed: 0,
        addressesCreated: 0,
        blockIslandDetected: 0,
        fireNumbersFound: 0,
        tests: [],
        details: []
    };

    console.log(`Testing ${testAddresses.length} addresses...\n`);

    testAddresses.forEach((testCase, index) => {
        if (verbose) {
            console.log(`\n📍 Test ${index + 1}: ${testCase.description}`);
            console.log(`   Address: "${testCase.addr}"`);
        }

        try {
            // Step 1: Process address using existing processAddress function
            const processedAddress = processAddress(testCase.addr, testCase.source, testCase.field);

            if (!processedAddress) {
                overallResults.failed++;
                overallResults.tests.push(`❌ Test ${index + 1}: Failed to process address`);
                overallResults.details.push({
                    test: index + 1,
                    description: testCase.description,
                    address: testCase.addr,
                    error: 'Address processing returned null',
                    results: null
                });
                if (verbose) console.log('   ❌ Address processing failed');
                return;
            }

            // Step 2: Create Address ComplexIdentifier
            const address = createAddressFromParsedData(processedAddress, testCase.field);
            overallResults.addressesCreated++;

            // Step 3: Validate Address processing
            const validationResults = validateAddressProcessing(address, processedAddress);

            // Step 4: Record results
            if (validationResults.failed === 0) {
                overallResults.passed++;
                overallResults.tests.push(`✅ Test ${index + 1}: All validations passed (${validationResults.total}/${validationResults.total})`);
            } else {
                overallResults.failed++;
                overallResults.tests.push(`❌ Test ${index + 1}: ${validationResults.failed}/${validationResults.total} validations failed`);
            }

            // Track specific metrics
            if (processedAddress.isBlockIslandAddress) {
                overallResults.blockIslandDetected++;
            }
            if (address.hasFireNumber()) {
                overallResults.fireNumbersFound++;
            }

            overallResults.details.push({
                test: index + 1,
                description: testCase.description,
                address: testCase.addr,
                processedAddress: processedAddress,
                addressInstance: address,
                validationResults: validationResults,
                summary: address.getAddressSummary()
            });

            if (verbose) {
                console.log(`   ✅ Address created successfully`);
                console.log(`   🏝️ Block Island: ${processedAddress.isBlockIslandAddress}`);
                console.log(`   🔥 Fire Number: ${address.hasFireNumber() ? address.getFireNumber().term : 'N/A'}`);
                console.log(`   📊 Validation: ${validationResults.passed}/${validationResults.total} passed`);
            }

        } catch (error) {
            overallResults.failed++;
            overallResults.tests.push(`❌ Test ${index + 1}: Exception - ${error.message}`);
            overallResults.details.push({
                test: index + 1,
                description: testCase.description,
                address: testCase.addr,
                error: error.message,
                results: null
            });
            if (verbose) {
                console.log(`   ❌ Exception: ${error.message}`);
            }
        }
    });

    // Final summary
    console.log(`\n📊 Address Processing Test Results:`);
    console.log(`Total Tests: ${overallResults.total}`);
    console.log(`Passed: ${overallResults.passed}`);
    console.log(`Failed: ${overallResults.failed}`);
    console.log(`Success Rate: ${(overallResults.passed/overallResults.total*100).toFixed(1)}%`);
    console.log(`Addresses Created: ${overallResults.addressesCreated}/${overallResults.total}`);
    console.log(`Block Island Detected: ${overallResults.blockIslandDetected}`);
    console.log(`Fire Numbers Found: ${overallResults.fireNumbersFound}`);

    if (overallResults.failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! Address processing system working correctly.');
    } else {
        console.log(`\n⚠️  ${overallResults.failed} TESTS FAILED. Issues detected:`);
        overallResults.tests.filter(test => test.startsWith('❌')).forEach(test => console.log(`   ${test}`));
    }

    return overallResults;
}

/**
 * Quick Address Processing Test (for development and debugging)
 * @param {string} addressString - Address to test
 * @param {string} source - Data source name
 * @param {string} field - Field name
 */
function quickAddressTest(addressString, source = 'Test', field = 'testField') {
    console.log(`🧪 Quick Address Test: "${addressString}"`);

    try {
        const processed = processAddress(addressString, source, field);
        if (!processed) {
            console.log('❌ Address processing failed');
            return null;
        }

        const address = createAddressFromParsedData(processed, field);
        const summary = address.getAddressSummary();

        console.log('Results:');
        console.log(`  Street: ${summary.street}`);
        console.log(`  City: ${summary.city}`);
        console.log(`  State: ${summary.state}, ZIP: ${summary.zip}`);
        console.log(`  Block Island: ${summary.isBlockIsland}`);
        console.log(`  Fire Number: ${summary.hasFireNumber ? summary.fireNumber : 'N/A'}`);
        console.log(`  toString(): ${address.toString()}`);

        return address;
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        return null;
    }
}