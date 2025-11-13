// ✅ VisionAppraisal processing function moved to scripts/core/visionAppraisalProcessing.js
// goAgain() - Resume VisionAppraisal processing from where it left off

// ✅ VisionAppraisal processing function moved to scripts/core/visionAppraisalProcessing.js
// mergeTheTwo() - Merge two VisionAppraisal data files


// ✅ VisionAppraisal processing function moved to scripts/core/visionAppraisalProcessing.js
// getFilesList() - Get list of files from a Google Drive folder

// ✅ VisionAppraisal processing function moved to scripts/core/visionAppraisalProcessing.js
// makeOneToOneFile() - Create one-to-one mapping file for PID files

// ✅ VisionAppraisal test function moved to scripts/core/visionAppraisalProcessing.js
// testGoogleDriveAccess() - Test Google Drive access functionality

// Test function to verify getFilesList works (or fails with same 502 error)
// ✅ Google Drive API function moved to scripts/core/googleDriveAPI.js
// testGetFilesList() - Test function to verify getFilesList works with Google Drive API

// ✅ Google Drive API function moved to scripts/core/googleDriveAPI.js
// testResponseFormats() - Test function to verify response format consistency

// ✅ Google Drive API function moved to scripts/core/googleDriveAPI.js
// testTrackingMechanism() - Test function to verify tracking mechanism

// Combined test function to run all tests
async function testRetrySystemHealth() {
    console.log('🔍 TESTING RETRY SYSTEM HEALTH 🔍');
    console.log('=====================================');

    const results = {
        getFilesList: await testGetFilesList(),
        responseFormat: await testResponseFormats(),
        tracking: await testTrackingMechanism()
    };

    console.log('\n📊 SUMMARY:');
    console.log('getFilesList works:', !!results.getFilesList);
    console.log('Response format consistent:', !!(results.responseFormat && results.responseFormat.body));
    console.log('Tracking files accessible:', !!(results.tracking && results.tracking.originalParcels > 0));
    console.log('Can verify uploads:', !!(results.tracking && results.tracking.canVerifyUploads));

    return results;
}

// Test the FIXED functions
async function testFixedFunctions() {
    console.log('🔧 TESTING FIXED FUNCTIONS 🔧');
    console.log('================================');

    try {
        // Test fixed getFilesList()
        console.log('Testing FIXED getFilesList()...');
        const filesList = await getFilesList(parameters.pidFilesParents);
        console.log('✅ getFilesList() SUCCESS! Found', filesList.length, 'files');
        console.log('Sample uploaded files:', filesList.slice(0, 5));

        // Test if fixDiscrepancies can now work
        console.log('\nTesting fixDiscrepancies capability...');
        const completedPids = await loadFromDisk('completed_pids.json') || [];
        const actualUploadedPids = filesList.map(file => file[0]);

        const missingPids = completedPids.filter(pid => !actualUploadedPids.includes(pid));
        console.log('✅ fixDiscrepancies() CAN NOW WORK!');
        console.log(`- Tracked completed: ${completedPids.length}`);
        console.log(`- Actually uploaded: ${actualUploadedPids.length}`);
        console.log(`- Missing (need retry): ${missingPids.length}`);

        return {
            success: true,
            filesFound: filesList.length,
            canVerifyUploads: true,
            missingCount: missingPids.length
        };

    } catch (error) {
        console.error('❌ Fixed functions still failing:', error);
        return { success: false, error: error.message };
    }
}

// Simple function to get 500 random parcels from the 2317 list
// ✅ VisionAppraisal processing function moved to scripts/core/visionAppraisalProcessing.js
// get500RandomParcels() - Get 500 random parcels for testing purposes

// ✅ VisionAppraisal processing class moved to scripts/core/visionAppraisalProcessing.js
// ParcelDataExtractor - High-performance HTML processing class for VisionAppraisal data

// ✅ VisionAppraisal processing class moved to scripts/core/visionAppraisalProcessing.js
// ParcelDataExtractorV2 - Optimized version focused on batch processing

// ✅ VisionAppraisal test function moved to scripts/core/visionAppraisalProcessing.js
// testBatchPerformance() - Test batch performance of parcel processing

// ✅ testParcelDataExtractor() function moved to scripts/core/visionAppraisalProcessing.js
// Test function to verify ParcelDataExtractor works with real data - now available in VisionAppraisal module

// Priority 1B: Google API Manager with token caching
// ✅ Google Drive API class moved to scripts/core/googleDriveAPI.js
// GoogleAPIManager - Advanced Google Drive API Manager with token caching and optimization

// ✅ Google Drive API function moved to scripts/core/googleDriveAPI.js
// testGoogleAPIManager() - Test Google API Manager performance and token caching

// ✅ Performance optimization class moved to scripts/performance/optimizedProcessing.js
// OptimizedParcelProcessor - High-performance parcel processing with targeted optimizations

// ✅ Performance optimization function moved to scripts/performance/optimizedProcessing.js
// testOptimizedProcessing() - Test optimized parcel processing system

/**
 * Test structural enhancements for Requirements 1, 4, 6, 12, 20, 21
 * Tests Info base class, AttributedTerm fieldName, OtherInfo/LegacyInfo systems, property updates
 * Protocol 2: Test code with regression testing value
 */
async function testStructuralEnhancements() {
    const results = {
        total: 0,
        passed: 0,
        failed: 0,
        tests: []
    };

    function runTest(name, testFunction) {
        results.total++;
        try {
            const result = testFunction();
            if (result) {
                results.passed++;
                results.tests.push(`✅ ${name}`);
                console.log(`✅ ${name}`);
            } else {
                results.failed++;
                results.tests.push(`❌ ${name}`);
                console.log(`❌ ${name}`);
            }
            return result;
        } catch (error) {
            results.failed++;
            results.tests.push(`❌ ${name} - Error: ${error.message}`);
            console.log(`❌ ${name} - Error: ${error.message}`);
            return false;
        }
    }

    console.log('🧪 Testing Structural Enhancements - Requirements 1, 4, 6, 12, 20, 21');
    console.log('='.repeat(60));

    // Phase 1: Info Base Class Testing (Requirement 20)
    console.log('\n📋 Phase 1: Info Base Class (Requirement 20)');

    runTest('Info base class exists and can be instantiated', () => {
        const info = new Info();
        return info instanceof Info;
    });

    runTest('ContactInfo extends Info', () => {
        const contactInfo = new ContactInfo();
        return contactInfo instanceof Info && contactInfo instanceof ContactInfo;
    });

    runTest('ContactInfo inherits Info methods', () => {
        const contactInfo = new ContactInfo();
        return typeof contactInfo.getPropertySummary === 'function' &&
               typeof contactInfo.setProperty === 'function';
    });

    runTest('Info serialization includes correct type', () => {
        const contactInfo = new ContactInfo();
        const serialized = contactInfo.serialize();
        return serialized.type === 'ContactInfo';
    });

    // Phase 2: AttributedTerm Enhancement Testing (Requirement 4)
    console.log('\n📋 Phase 2: AttributedTerm Enhancement (Requirement 4)');

    runTest('AttributedTerm accepts fieldName parameter', () => {
        const term = new AttributedTerm('test@email.com', 'BLOOMERANG_CSV', 1, 'ACC123', 'email');
        return term.fieldName === 'email';
    });

    runTest('AttributedTerm fieldName defaults to null', () => {
        const term = new AttributedTerm('test@email.com', 'BLOOMERANG_CSV', 1, 'ACC123');
        return term.fieldName === null;
    });

    runTest('AttributedTerm setFieldName/getFieldName work', () => {
        const term = new AttributedTerm('test@email.com', 'BLOOMERANG_CSV', 1, 'ACC123');
        term.setFieldName('email');
        return term.getFieldName() === 'email';
    });

    runTest('AttributedTerm serialization includes fieldName', () => {
        const term = new AttributedTerm('test@email.com', 'BLOOMERANG_CSV', 1, 'ACC123', 'email');
        const serialized = term.serialize();
        return serialized.fieldName === 'email';
    });

    runTest('AttributedTerm toString includes fieldName', () => {
        const term = new AttributedTerm('test@email.com', 'BLOOMERANG_CSV', 1, 'ACC123', 'email');
        return term.toString().includes('field: email');
    });

    // Phase 3: OtherInfo System Testing (Requirement 1)
    console.log('\n📋 Phase 3: OtherInfo System (Requirement 1)');

    runTest('OtherInfo base class exists and extends Info', () => {
        const otherInfo = new OtherInfo();
        return otherInfo instanceof Info && otherInfo instanceof OtherInfo;
    });

    runTest('HouseholdOtherInfo extends OtherInfo', () => {
        const householdOtherInfo = new HouseholdOtherInfo();
        return householdOtherInfo instanceof Info &&
               householdOtherInfo instanceof OtherInfo &&
               householdOtherInfo instanceof HouseholdOtherInfo;
    });

    runTest('IndividualOtherInfo extends OtherInfo', () => {
        const individualOtherInfo = new IndividualOtherInfo();
        return individualOtherInfo instanceof Info &&
               individualOtherInfo instanceof OtherInfo &&
               individualOtherInfo instanceof IndividualOtherInfo;
    });

    runTest('Entity has otherInfo property', () => {
        const entity = new Entity(null, null);
        return entity.hasOwnProperty('otherInfo') && entity.otherInfo === null;
    });

    runTest('Entity addOtherInfo method works', () => {
        const entity = new Entity(null, null);
        const otherInfo = new OtherInfo();
        entity.addOtherInfo(otherInfo);
        return entity.otherInfo === otherInfo;
    });

    // Phase 4: LegacyInfo System Testing (Requirement 21)
    console.log('\n📋 Phase 4: LegacyInfo System (Requirement 21)');

    runTest('LegacyInfo class exists and extends Info', () => {
        const legacyInfo = new LegacyInfo();
        return legacyInfo instanceof Info && legacyInfo instanceof LegacyInfo;
    });

    runTest('LegacyInfo has all 6 VisionAppraisal properties', () => {
        const legacyInfo = new LegacyInfo();
        return legacyInfo.hasOwnProperty('ownerName') &&
               legacyInfo.hasOwnProperty('ownerName2') &&
               legacyInfo.hasOwnProperty('neighborhood') &&
               legacyInfo.hasOwnProperty('userCode') &&
               legacyInfo.hasOwnProperty('date') &&
               legacyInfo.hasOwnProperty('sourceIndex');
    });

    runTest('LegacyInfo setter methods work', () => {
        const legacyInfo = new LegacyInfo();
        const testData = new IndicativeData(new SimpleIdentifiers(new AttributedTerm('TestOwner', 'VISION_APPRAISAL', 1, 'PID123')));
        legacyInfo.setOwnerName(testData);
        return legacyInfo.ownerName === testData;
    });

    runTest('Entity has legacyInfo property', () => {
        const entity = new Entity(null, null);
        return entity.hasOwnProperty('legacyInfo') && entity.legacyInfo === null;
    });

    runTest('Entity addLegacyInfo method works', () => {
        const entity = new Entity(null, null);
        const legacyInfo = new LegacyInfo();
        entity.addLegacyInfo(legacyInfo);
        return entity.legacyInfo === legacyInfo;
    });

    // Phase 5: Property Structure Updates Testing (Requirements 6, 12)
    console.log('\n📋 Phase 5: Property Structure Updates (Requirements 6, 12)');

    runTest('HouseholdName uses fullHouseholdName property', () => {
        const primaryAlias = new AttributedTerm('Smith Household', 'BLOOMERANG_CSV', 1, 'ACC123');
        const householdName = new HouseholdName(primaryAlias, 'The Smith Family');
        return householdName.fullHouseholdName === 'The Smith Family';
    });

    runTest('HouseholdName serialization uses fullHouseholdName', () => {
        const primaryAlias = new AttributedTerm('Smith Household', 'BLOOMERANG_CSV', 1, 'ACC123');
        const householdName = new HouseholdName(primaryAlias, 'The Smith Family');
        const serialized = householdName.serialize();
        return serialized.fullHouseholdName === 'The Smith Family';
    });

    runTest('ContactInfo secondaryAddress is array', () => {
        const contactInfo = new ContactInfo();
        return Array.isArray(contactInfo.secondaryAddress) && contactInfo.secondaryAddress.length === 0;
    });

    runTest('ContactInfo addSecondaryAddress method works', () => {
        const contactInfo = new ContactInfo();
        const addressData = new IndicativeData(new ComplexIdentifiers(new AttributedTerm('123 Main St', 'BLOOMERANG_CSV', 1, 'ACC123')));
        contactInfo.addSecondaryAddress(addressData);
        return contactInfo.secondaryAddress.length === 1 && contactInfo.secondaryAddress[0] === addressData;
    });

    // Phase 6: Regression Testing
    console.log('\n📋 Phase 6: Regression Testing - Existing Functionality');

    runTest('Basic Entity creation still works', () => {
        const locationId = new IdentifyingData(new SimpleIdentifiers(new AttributedTerm('1234', 'VISION_APPRAISAL', 1, 'PID123')));
        const name = new IdentifyingData(new IndividualName(new AttributedTerm('John Doe', 'BLOOMERANG_CSV', 1, 'ACC123'), '', 'John', '', 'Doe', ''));
        const entity = new Entity(locationId, name);
        return entity instanceof Entity && entity.locationIdentifier === locationId && entity.name === name;
    });

    runTest('AttributedTerm basic functionality still works', () => {
        const term = new AttributedTerm('test@email.com', 'BLOOMERANG_CSV', 1, 'ACC123');
        return term.term === 'test@email.com' && term.getSources().includes('BLOOMERANG_CSV');
    });

    runTest('SimpleIdentifiers still works with AttributedTerm', () => {
        const term = new AttributedTerm('test@email.com', 'BLOOMERANG_CSV', 1, 'ACC123');
        const identifier = new SimpleIdentifiers(term);
        return identifier.primaryAlias === term && identifier instanceof Aliased;
    });

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 STRUCTURAL ENHANCEMENTS TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${results.total}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Success Rate: ${(results.passed/results.total*100).toFixed(1)}%`);

    if (results.failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! Structural enhancements are working correctly.');
        console.log('✅ Ready to proceed to Phase 4: Address/Name Parsing Research');
    } else {
        console.log(`\n❌ ${results.failed} TESTS FAILED. Issues detected that need attention:`);
        results.tests.filter(test => test.startsWith('❌')).forEach(test => console.log(`   ${test}`));
    }

    return results;
}

// Address Parsing Testing Functions
function testAddressParsing() {
    console.log('🚀 Testing parse-address library...');

    // Test addresses for Block Island
    const testAddresses = [
        '123 Main St, Block Island, RI 02807',
        '456 Ocean Ave, New Shoreham, RI 02807',
        '789 Spring Street Block Island RI',
        'PO Box 100, Block Island, RI 02807',
        '321 Harbor Rd, New Shoreham, Rhode Island 02807-1234'
    ];

    const results = {
        total: testAddresses.length,
        passed: 0,
        failed: 0,
        tests: []
    };

    // Since we're in browser, we need to check if parse-address is available
    if (typeof parseAddress === 'undefined') {
        console.log('❌ parse-address library not loaded in browser');
        console.log('💡 Need to include parse-address in HTML or load via script tag');
        results.failed = results.total;
        results.tests.push('❌ parse-address library not available in browser');
        return results;
    }

    testAddresses.forEach((address, index) => {
        try {
            const parsed = parseAddress.parseLocation(address);
            console.log(`\nTest ${index + 1}: "${address}"`);
            console.log('Parsed result:', parsed);

            // Check if we got reasonable parsing results
            if (parsed && (parsed.city || parsed.zip)) {
                results.passed++;
                results.tests.push(`✅ Test ${index + 1}: Successfully parsed "${address}"`);

                // Check for Block Island specific normalization needs
                if (parsed.city === 'Block Island' || parsed.city === 'New Shoreham') {
                    console.log(`   🏝️ Block Island city detected: ${parsed.city}`);
                }
                if (parsed.zip === '02807') {
                    console.log(`   📮 Block Island ZIP detected: ${parsed.zip}`);
                }
            } else {
                results.failed++;
                results.tests.push(`❌ Test ${index + 1}: Failed to parse "${address}"`);
            }
        } catch (error) {
            console.log(`❌ Error parsing "${address}":`, error);
            results.failed++;
            results.tests.push(`❌ Test ${index + 1}: Exception parsing "${address}"`);
        }
    });

    console.log(`\n📊 Address Parsing Test Results:`);
    console.log(`Total: ${results.total}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Success Rate: ${(results.passed/results.total*100).toFixed(1)}%`);

    return results;
}

// ============================================================================
// ADDRESS PROCESSING FUNCTIONS MOVED TO MODULAR ARCHITECTURE
// ============================================================================
// The following functions have been extracted to: scripts/address/addressProcessing.js
// - normalizeBlockIslandCity()
// - processAddress()
// - loadBlockIslandStreetsFromDrive()
// - enhanceAddressWithBlockIslandLogic()
// - createAddressFromParsedData()
//
// To use these functions, include: <script src="./scripts/address/addressProcessing.js"></script>
// ============================================================================

// ============================================================================
// ADDRESS TESTING FUNCTIONS MOVED TO MODULAR ARCHITECTURE
// ============================================================================
// The following functions have been extracted to: scripts/testing/addressTesting.js
// - validateAddressProcessing()
// - addressProcessingTests()
// - quickAddressTest()
//
// To use these functions, include: <script src="./scripts/testing/addressTesting.js"></script>
// ============================================================================

// ============================================================================
// PHASE 3 DATA LOADING FUNCTIONS MOVED TO MODULAR ARCHITECTURE
// ============================================================================
// The following functions have been extracted to: scripts/data/sampleDataLoader.js
// - loadSampleData()
// - loadGoogleDriveFile()
// - extractAddressesFromSamples()
//
// To use these functions, include: <script src="./scripts/data/sampleDataLoader.js"></script>
// ============================================================================

