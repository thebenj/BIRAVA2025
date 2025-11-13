// ===================================================================
// COMPREHENSIVE GOOGLE DRIVE READING METHOD TESTING FRAMEWORK
// ===================================================================

// Test file IDs - using known working VisionAppraisal files and target Bloomerang files
const TEST_FILE_IDS = {
    // Known working VisionAppraisal parameter files
    VISION_EVERYTHING_WITH_ID: "1ayejMSapX22_1KYZX4jiTGqtCcvnWOtc",
    VISION_EVERYTHING_WITH_IDB: "1V7BOvd84KbiRYeOn6ok_vbL6GTPcfcuN",

    // Target Bloomerang entity files (corrected file IDs)
    BLOOMERANG_INDIVIDUAL: "1s7VnmD4CZg09y-GKmfX4W6tZb2SDaJLy",  // CORRECTED: Individual file (not folder)
    BLOOMERANG_HOUSEHOLD: "1HhjM33856-jehR1xSypXyE0qFuRw26tx",

    // Additional test file
    TEST_HARDCODED: "1dOlGnHNDOdsXo1uWGXQWRINeuXOvtYtz", // From utils.js

    // File writing test resources (provided by user)
    DUMMY_FOLDER: "1Fj_GsqHqDjAPU6J2cvDsO13t7c6yKNbj",     // For testing new file creation
    OVERWRITEABLE_FILE: "1ZWwsGz775Pm8PT9Pq8Wqg14kVl98Ndm3" // "Copy of parcelData.json" for overwrite testing
};

// Test results storage
const testResults = {
    methods: {},
    summary: {
        totalTests: 0,
        successfulTests: 0,
        failedTests: 0
    }
};

// ===================================================================
// GOOGLE DRIVE READING METHOD IMPLEMENTATIONS
// ===================================================================

/**
 * Method 1: Modern gapi.client.drive.files.get() approach
 * Used in: entityBrowser.js, namePatternAnalyzer.js, obsolete/obsFileLogistics.js
 */
async function testMethod1_GapiClientDriveGet(fileId, methodName = "Method 1") {
    console.log(`🔄 Testing ${methodName}: gapi.client.drive.files.get()`);

    try {
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });

        const content = response.body;
        const success = !!(content && content.length > 0);

        console.log(`✅ ${methodName} SUCCESS:`, {
            fileId: fileId,
            contentLength: content.length,
            contentType: typeof content,
            contentPreview: content.substring(0, 100) + '...'
        });

        return { success: true, content, method: methodName };

    } catch (error) {
        console.log(`❌ ${methodName} FAILED:`, {
            fileId: fileId,
            error: error.message || error,
            errorType: typeof error,
            errorStack: error.stack
        });

        return { success: false, error, method: methodName };
    }
}

/**
 * Method 2: fetch() with gapi.auth.getToken() approach
 * Used in: fileLogistics.js (current implementation)
 */
async function testMethod2_FetchWithGapiAuth(fileId, methodName = "Method 2") {
    console.log(`🔄 Testing ${methodName}: fetch() with gapi.auth.getToken()`);

    try {
        // Check authentication
        if (!gapi || !gapi.auth) {
            throw new Error('gapi.auth not available');
        }

        const accessToken = gapi.auth.getToken().access_token;
        if (!accessToken) {
            throw new Error('No access token available from gapi.auth');
        }

        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            method: 'GET',
            headers: new Headers({ 'Authorization': 'Bearer ' + accessToken })
        });

        if (response.ok) {
            const content = await response.text();
            console.log(`✅ ${methodName} SUCCESS:`, {
                fileId: fileId,
                status: response.status,
                contentLength: content.length,
                contentPreview: content.substring(0, 100) + '...'
            });

            return { success: true, content, method: methodName };
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

    } catch (error) {
        console.log(`❌ ${methodName} FAILED:`, {
            fileId: fileId,
            error: error.message || error,
            errorType: typeof error
        });

        return { success: false, error, method: methodName };
    }
}

/**
 * Method 3: fetch() with gapi.client.getToken() approach
 * Used in: bloomerang.js, phonebook.js, visionAppraisal.js (WORKING files)
 */
async function testMethod3_FetchWithGapiClient(fileId, methodName = "Method 3") {
    console.log(`🔄 Testing ${methodName}: fetch() with gapi.client.getToken()`);

    try {
        // Check authentication
        if (!gapi || !gapi.client) {
            throw new Error('gapi.client not available');
        }

        const accessToken = gapi.client.getToken().access_token;
        if (!accessToken) {
            throw new Error('No access token available from gapi.client');
        }

        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            method: 'GET',
            headers: new Headers({ 'Authorization': 'Bearer ' + accessToken })
        });

        if (response.ok) {
            const content = await response.text();
            console.log(`✅ ${methodName} SUCCESS:`, {
                fileId: fileId,
                status: response.status,
                contentLength: content.length,
                contentPreview: content.substring(0, 100) + '...'
            });

            return { success: true, content, method: methodName };
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

    } catch (error) {
        console.log(`❌ ${methodName} FAILED:`, {
            fileId: fileId,
            error: error.message || error,
            errorType: typeof error
        });

        return { success: false, error, method: methodName };
    }
}

/**
 * Method 4: Legacy Drive.Files.get() approach
 * Used in: fileLogistics.js (fallback path) - Apps Script style
 */
async function testMethod4_LegacyDriveFiles(fileId, methodName = "Method 4") {
    console.log(`🔄 Testing ${methodName}: Legacy Drive.Files.get()`);

    try {
        // Check if Drive object exists (likely won't in browser)
        if (typeof Drive === 'undefined') {
            throw new Error('Drive object not available (expected in browser environment)');
        }

        const content = JSON.parse(Drive.Files.get(fileId, { 'alt': 'media' }).toString());

        console.log(`✅ ${methodName} SUCCESS:`, {
            fileId: fileId,
            contentType: typeof content,
            contentPreview: JSON.stringify(content).substring(0, 100) + '...'
        });

        return { success: true, content, method: methodName };

    } catch (error) {
        console.log(`❌ ${methodName} FAILED (EXPECTED):`, {
            fileId: fileId,
            error: error.message || error,
            note: 'Legacy Apps Script API not available in browser'
        });

        return { success: false, error, method: methodName, expectedFailure: true };
    }
}

/**
 * Method 5: Direct fetch variations from utils.js and postProcessing.js
 */
async function testMethod5_DirectFetchVariations(fileId, methodName = "Method 5") {
    console.log(`🔄 Testing ${methodName}: Direct fetch variations`);

    const variations = [
        // Variation A: Direct token access from cached auth
        async () => {
            const tokenData = gapi.auth.getToken();
            if (!tokenData || !tokenData.access_token) {
                throw new Error('No cached token available');
            }

            return await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
            });
        },

        // Variation B: Metadata + content fetch (postProcessing.js style)
        async () => {
            const accessToken = gapi.client.getToken().access_token;

            // First get metadata
            const metadataResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!metadataResponse.ok) {
                throw new Error(`Metadata fetch failed: ${metadataResponse.status}`);
            }

            // Then get content
            return await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
        }
    ];

    let successCount = 0;
    let lastError = null;

    for (let i = 0; i < variations.length; i++) {
        try {
            const response = await variations[i]();

            if (response.ok) {
                const content = await response.text();
                successCount++;

                console.log(`✅ ${methodName}.${i + 1} SUCCESS:`, {
                    fileId: fileId,
                    variation: i + 1,
                    status: response.status,
                    contentLength: content.length
                });

                if (successCount === 1) {
                    // Return first successful result
                    return { success: true, content, method: methodName, variation: i + 1 };
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

        } catch (error) {
            console.log(`❌ ${methodName}.${i + 1} FAILED:`, {
                fileId: fileId,
                variation: i + 1,
                error: error.message || error
            });
            lastError = error;
        }
    }

    // If we get here, all variations failed
    return { success: false, error: lastError, method: methodName };
}

// ===================================================================
// GOOGLE DRIVE FILE WRITING METHOD IMPLEMENTATIONS
// ===================================================================

/**
 * Writing Method A: PATCH with uploadType=media (File Overwrite)
 * Used in: bloomerang.js, visionAppraisal.js, phonebook.js
 */
async function testWritingMethodA_PatchOverwrite(fileId, testData, methodName = "Writing Method A") {
    console.log(`🔄 Testing ${methodName}: PATCH file overwrite`);

    try {
        const jsonContent = JSON.stringify(testData, null, 2);

        const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
            method: 'PATCH',
            headers: new Headers({
                'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                'Content-Type': 'application/json'
            }),
            body: jsonContent
        });

        if (response.ok) {
            console.log(`✅ ${methodName} SUCCESS:`, {
                fileId: fileId,
                status: response.status,
                operation: 'File Overwritten',
                dataSize: jsonContent.length
            });

            return { success: true, operation: 'overwrite', method: methodName, fileId };
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

    } catch (error) {
        console.log(`❌ ${methodName} FAILED:`, {
            fileId: fileId,
            error: error.message || error,
            operation: 'overwrite'
        });

        return { success: false, error, method: methodName, operation: 'overwrite' };
    }
}

/**
 * Writing Method B: POST with uploadType=multipart (New File Creation)
 * Used in: bloomerang.js, fileLogistics.js, utils.js
 */
async function testWritingMethodB_PostCreate(folderId, fileName, testData, methodName = "Writing Method B") {
    console.log(`🔄 Testing ${methodName}: POST new file creation`);

    try {
        const fileMetadata = {
            name: fileName,
            parents: [folderId],
            mimeType: 'application/json'
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
        form.append('file', new Blob([JSON.stringify(testData, null, 2)], { type: 'application/json' }));

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name', {
            method: 'POST',
            headers: new Headers({
                'Authorization': `Bearer ${gapi.client.getToken().access_token}`
            }),
            body: form
        });

        if (response.ok) {
            const result = await response.json();
            console.log(`✅ ${methodName} SUCCESS:`, {
                folderId: folderId,
                newFileId: result.id,
                fileName: result.name,
                status: response.status,
                operation: 'File Created'
            });

            return { success: true, operation: 'create', method: methodName, newFileId: result.id, fileName: result.name };
        } else {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

    } catch (error) {
        console.log(`❌ ${methodName} FAILED:`, {
            folderId: folderId,
            fileName: fileName,
            error: error.message || error,
            operation: 'create'
        });

        return { success: false, error, method: methodName, operation: 'create' };
    }
}

/**
 * Writing Method C: Legacy updateFile with gapi.auth (Alternative Auth Pattern)
 * Used in: fileLogistics.js, baseCode.js
 */
async function testWritingMethodC_LegacyUpdate(fileId, testData, methodName = "Writing Method C") {
    console.log(`🔄 Testing ${methodName}: Legacy updateFile with gapi.auth`);

    try {
        // Test the older authentication pattern
        if (!gapi || !gapi.auth) {
            throw new Error('gapi.auth not available');
        }

        const accessToken = gapi.auth.getToken().access_token;
        if (!accessToken) {
            throw new Error('No access token available from gapi.auth');
        }

        const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
            method: 'PATCH',
            headers: new Headers({
                'Authorization': 'Bearer ' + accessToken,
                'Content-Type': 'application/json'
            }),
            body: JSON.stringify(testData, null, 2)
        });

        if (response.ok) {
            console.log(`✅ ${methodName} SUCCESS:`, {
                fileId: fileId,
                status: response.status,
                authPattern: 'gapi.auth (legacy)',
                operation: 'File Updated'
            });

            return { success: true, operation: 'update', method: methodName, authPattern: 'gapi.auth' };
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

    } catch (error) {
        console.log(`❌ ${methodName} FAILED:`, {
            fileId: fileId,
            error: error.message || error,
            authPattern: 'gapi.auth (legacy)',
            operation: 'update'
        });

        return { success: false, error, method: methodName, operation: 'update' };
    }
}

/**
 * Writing Method D: gapi.client.drive.files.update() (Modern API Approach)
 * Uses the native Google Drive client library for file updates
 */
async function testWritingMethodD_GapiClientUpdate(fileId, data) {
    const methodName = 'Method D: gapi.client Update';
    console.log(`🔄 Testing ${methodName}: gapi.client.drive.files.update()`);

    try {
        const response = await gapi.client.drive.files.update({
            fileId: fileId,
            uploadType: 'media',
            resource: {},
            body: JSON.stringify(data)
        });

        console.log(`✅ ${methodName} SUCCESS:`, {
            fileId: fileId,
            status: 'success',
            responseId: response.result.id,
            operation: 'update'
        });

        return {
            success: true,
            method: methodName,
            result: response.result,
            operation: 'update'
        };

    } catch (error) {
        console.error(`❌ ${methodName} FAILED:`, {
            fileId: fileId,
            error: error.message || error,
            operation: 'update'
        });

        return { success: false, error, method: methodName, operation: 'update' };
    }
}

/**
 * Comprehensive File Writing Test Suite
 */
async function runComprehensiveFileWritingTest() {
    console.log('\n🚀 STARTING COMPREHENSIVE GOOGLE DRIVE WRITING TEST SUITE');
    console.log('=' .repeat(80));

    const testData = {
        testTimestamp: new Date().toISOString(),
        testType: 'Google Drive File Writing Test',
        testData: {
            message: 'This is test data for file writing operations',
            randomValue: Math.random(),
            testArray: [1, 2, 3, 'test']
        }
    };

    const results = [];

    // Test 1: File Overwrite (Method A)
    console.log('\n📝 Testing File Overwrite Operations');
    const overwriteResult = await testWritingMethodA_PatchOverwrite(
        TEST_FILE_IDS.OVERWRITEABLE_FILE,
        { ...testData, operation: 'overwrite' },
        "Method A: PATCH Overwrite"
    );
    results.push(overwriteResult);

    // Test 2: New File Creation (Method B)
    console.log('\n📁 Testing New File Creation Operations');
    const createResult = await testWritingMethodB_PostCreate(
        TEST_FILE_IDS.DUMMY_FOLDER,
        `test_file_${Date.now()}.json`,
        { ...testData, operation: 'create' },
        "Method B: POST Create"
    );
    results.push(createResult);

    // Test 3: Legacy Authentication Pattern (Method C)
    console.log('\n🔄 Testing Legacy Authentication Pattern');
    const legacyResult = await testWritingMethodC_LegacyUpdate(
        TEST_FILE_IDS.OVERWRITEABLE_FILE,
        { ...testData, operation: 'legacy_update', authTest: true },
        "Method C: Legacy Auth"
    );
    results.push(legacyResult);

    // Test 4: Modern gapi.client API (Method D)
    console.log('\n🔄 Testing Modern gapi.client API');
    const gapiClientResult = await testWritingMethodD_GapiClientUpdate(
        TEST_FILE_IDS.OVERWRITEABLE_FILE,
        { ...testData, operation: 'gapi_client_update', modern: true }
    );
    results.push(gapiClientResult);

    // Generate results report
    generateFileWritingReport(results);

    return results;
}

function generateFileWritingReport(results) {
    console.log('\n📊 COMPREHENSIVE FILE WRITING RESULTS REPORT');
    console.log('=' .repeat(80));

    const successCount = results.filter(r => r.success).length;
    const totalTests = results.length;

    console.log('\n📈 SUMMARY:');
    console.log(`   Total Writing Tests: ${totalTests}`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${totalTests - successCount}`);
    console.log(`   📊 Success Rate: ${Math.round((successCount / totalTests) * 100)}%`);

    console.log('\n🔍 METHOD PERFORMANCE ANALYSIS:');
    results.forEach(result => {
        const emoji = result.success ? '✅' : '❌';
        const status = result.success ? 'SUCCESS' : `FAILED: ${result.error?.message || 'Unknown error'}`;
        console.log(`   ${emoji} ${result.method} (${result.operation}): ${status}`);
    });

    console.log('\n💡 FILE WRITING RECOMMENDATIONS:');
    if (successCount === totalTests) {
        console.log('   🏆 ALL WRITING METHODS WORK: Choose based on use case');
        console.log('   📋 Use PATCH for file updates, POST for new file creation');
        console.log('   🔧 Both authentication patterns work identically');
    } else {
        console.log('   ⚠️  SOME WRITING METHODS FAILED: Check error details above');
        console.log('   🔍 Focus on successful methods for production use');
    }
}

// ===================================================================
// TEST EXECUTION FRAMEWORK
// ===================================================================

async function runSingleMethodTest(methodFunc, fileId, methodName) {
    testResults.summary.totalTests++;

    try {
        const result = await methodFunc(fileId, methodName);
        testResults.methods[methodName] = testResults.methods[methodName] || {};
        testResults.methods[methodName][fileId] = result;

        if (result.success) {
            testResults.summary.successfulTests++;
        } else {
            testResults.summary.failedTests++;
        }

        return result;

    } catch (error) {
        testResults.summary.failedTests++;
        const errorResult = { success: false, error, method: methodName };
        testResults.methods[methodName] = testResults.methods[methodName] || {};
        testResults.methods[methodName][fileId] = errorResult;

        console.log(`❌ ${methodName} CRASHED:`, error);
        return errorResult;
    }
}

async function runAllMethodsOnFile(fileId, fileName) {
    console.log(`\n🔍 TESTING ALL METHODS ON: ${fileName} (${fileId})`);
    console.log('=' .repeat(60));

    const methods = [
        { func: testMethod1_GapiClientDriveGet, name: "Method 1: gapi.client.drive.files.get()" },
        { func: testMethod2_FetchWithGapiAuth, name: "Method 2: fetch() + gapi.auth" },
        { func: testMethod3_FetchWithGapiClient, name: "Method 3: fetch() + gapi.client" },
        { func: testMethod4_LegacyDriveFiles, name: "Method 4: Legacy Drive.Files" },
        { func: testMethod5_DirectFetchVariations, name: "Method 5: Direct fetch variations" }
    ];

    const results = [];

    for (const method of methods) {
        const result = await runSingleMethodTest(method.func, fileId, method.name);
        results.push(result);

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    return results;
}

// ===================================================================
// COMPREHENSIVE TEST SUITE AND REPORTING
// ===================================================================

async function runComprehensiveGoogleDriveTest() {
    console.log('\n🚀 STARTING COMPREHENSIVE GOOGLE DRIVE READING TEST SUITE');
    console.log('=' .repeat(80));

    // Reset results
    testResults.methods = {};
    testResults.summary = { totalTests: 0, successfulTests: 0, failedTests: 0 };

    const testFiles = [
        { id: TEST_FILE_IDS.VISION_EVERYTHING_WITH_ID, name: "VisionAppraisal everyThingWithID" },
        { id: TEST_FILE_IDS.VISION_EVERYTHING_WITH_IDB, name: "VisionAppraisal everyThingWithIDB" },
        { id: TEST_FILE_IDS.BLOOMERANG_INDIVIDUAL, name: "Bloomerang Individual Entities" },
        { id: TEST_FILE_IDS.BLOOMERANG_HOUSEHOLD, name: "Bloomerang Household Entities" }
    ];

    // Test each file with all methods
    for (const testFile of testFiles) {
        await runAllMethodsOnFile(testFile.id, testFile.name);
    }

    // Generate comprehensive report
    generateTestReport();

    return testResults;
}

function generateTestReport() {
    console.log('\n📊 COMPREHENSIVE TEST RESULTS REPORT');
    console.log('=' .repeat(80));

    console.log('\n📈 SUMMARY:');
    console.log(`   Total Tests: ${testResults.summary.totalTests}`);
    console.log(`   ✅ Successful: ${testResults.summary.successfulTests}`);
    console.log(`   ❌ Failed: ${testResults.summary.failedTests}`);
    console.log(`   📊 Success Rate: ${Math.round((testResults.summary.successfulTests / testResults.summary.totalTests) * 100)}%`);

    console.log('\n🔍 METHOD PERFORMANCE ANALYSIS:');

    Object.keys(testResults.methods).forEach(methodName => {
        const methodResults = testResults.methods[methodName];
        const methodTests = Object.keys(methodResults);
        const methodSuccesses = methodTests.filter(fileId => methodResults[fileId].success).length;
        const successRate = Math.round((methodSuccesses / methodTests.length) * 100);

        const emoji = successRate >= 75 ? '🟢' : successRate >= 50 ? '🟡' : successRate >= 25 ? '🟠' : '🔴';
        console.log(`   ${emoji} ${methodName}: ${successRate}% (${methodSuccesses}/${methodTests.length})`);

        // Show per-file results
        methodTests.forEach(fileId => {
            const result = methodResults[fileId];
            const fileName = Object.entries(TEST_FILE_IDS).find(([,id]) => id === fileId)?.[0] || fileId;
            const status = result.success ? '✅' : '❌';
            console.log(`      ${status} ${fileName}: ${result.success ? 'SUCCESS' : result.error?.message || 'FAILED'}`);
        });
    });

    console.log('\n💡 RECOMMENDATIONS:');

    // Find best performing method
    const methodPerformance = Object.keys(testResults.methods).map(methodName => {
        const methodResults = testResults.methods[methodName];
        const methodTests = Object.keys(methodResults);
        const methodSuccesses = methodTests.filter(fileId => methodResults[fileId].success).length;
        return {
            method: methodName,
            successRate: methodSuccesses / methodTests.length,
            successes: methodSuccesses,
            total: methodTests.length
        };
    }).sort((a, b) => b.successRate - a.successRate);

    if (methodPerformance.length > 0) {
        const best = methodPerformance[0];
        if (best.successRate > 0) {
            console.log(`   🏆 BEST METHOD: ${best.method} (${Math.round(best.successRate * 100)}% success rate)`);
            console.log(`   📋 RECOMMENDATION: Use ${best.method} as the standard Google Drive reading method`);
        } else {
            console.log(`   ⚠️  ALL METHODS FAILED: Server configuration or authentication issue needs resolution`);
        }
    }

    console.log('\n🔗 ACCESS PATTERNS DISCOVERED:');

    // Analyze which file types/sources work
    const visionAppraisalSuccess = testResults.methods && Object.values(testResults.methods).some(method =>
        method[TEST_FILE_IDS.VISION_EVERYTHING_WITH_ID]?.success || method[TEST_FILE_IDS.VISION_EVERYTHING_WITH_IDB]?.success
    );

    const bloomerangSuccess = testResults.methods && Object.values(testResults.methods).some(method =>
        method[TEST_FILE_IDS.BLOOMERANG_INDIVIDUAL]?.success || method[TEST_FILE_IDS.BLOOMERANG_HOUSEHOLD]?.success
    );

    console.log(`   📁 VisionAppraisal files: ${visionAppraisalSuccess ? '✅ ACCESSIBLE' : '❌ BLOCKED'}`);
    console.log(`   📁 Bloomerang files: ${bloomerangSuccess ? '✅ ACCESSIBLE' : '❌ BLOCKED'}`);

    if (visionAppraisalSuccess && !bloomerangSuccess) {
        console.log(`   💡 FINDING: VisionAppraisal files work but Bloomerang files are blocked - permission/scope issue`);
    } else if (!visionAppraisalSuccess && !bloomerangSuccess) {
        console.log(`   💡 FINDING: All files blocked - authentication or server configuration issue`);
    } else if (visionAppraisalSuccess && bloomerangSuccess) {
        console.log(`   💡 FINDING: All files accessible - method compatibility issue resolved`);
    }
}

// ===================================================================
// SIMPLIFIED TEST INTERFACE
// ===================================================================

function simpleTest() {
    console.log('🧪 Google Drive File Access Test Framework loaded!');
    console.log('📋 Available test functions:');
    console.log('');
    console.log('🔍 FILE READING TESTS:');
    console.log('   • runComprehensiveGoogleDriveTest() - Full reading test suite');
    console.log('   • testMethod1_GapiClientDriveGet(fileId) - Test modern gapi method');
    console.log('   • runAllMethodsOnFile(fileId, name) - Test all methods on one file');
    console.log('');
    console.log('📝 FILE WRITING TESTS:');
    console.log('   • runComprehensiveFileWritingTest() - Full writing test suite');
    console.log('   • testWritingMethodA_PatchOverwrite(fileId, data) - Test PATCH overwrite');
    console.log('   • testWritingMethodB_PostCreate(folderId, fileName, data) - Test POST create');
    console.log('   • testWritingMethodC_LegacyUpdate(fileId, data) - Test legacy auth');
    console.log('   • testWritingMethodD_GapiClientUpdate(fileId, data) - Test gapi.client method');
    console.log('');
    console.log('🗂️  TEST RESOURCES:');
    console.log('   • TEST_FILE_IDS.DUMMY_FOLDER - For file creation tests');
    console.log('   • TEST_FILE_IDS.OVERWRITEABLE_FILE - For overwrite tests');

    return 'Google Drive File Access Test Framework Loaded - Reading & Writing';
}

// ===================================================================
// FOLDER VS FILE ID TESTING (Based on server parameterization discovery)
// ===================================================================

async function testFolderVsFileHypothesis() {
    console.log('\n🔍 TESTING FOLDER VS FILE ID HYPOTHESIS');
    console.log('=' .repeat(60));

    const suspectedFolderId = "1qY7u1N9VaXd6xK-FVagaXm5vEckZPqZ7"; // Individual FOLDER (confirmed)
    const knownFileId = "1HhjM33856-jehR1xSypXyE0qFuRw26tx";     // Household file that works

    // Test 1: Try to get metadata (works for both files and folders)
    console.log('\n📋 Test 1: Getting metadata (should work for both files and folders)');

    try {
        const suspectedResponse = await gapi.client.drive.files.get({
            fileId: suspectedFolderId,
            fields: 'id,name,mimeType,parents'
        });

        console.log('✅ Suspected folder metadata:', {
            id: suspectedResponse.result.id,
            name: suspectedResponse.result.name,
            mimeType: suspectedResponse.result.mimeType,
            isFolder: suspectedResponse.result.mimeType === 'application/vnd.google-apps.folder'
        });

    } catch (error) {
        console.log('❌ Failed to get suspected folder metadata:', error);
    }

    try {
        const knownResponse = await gapi.client.drive.files.get({
            fileId: knownFileId,
            fields: 'id,name,mimeType,parents'
        });

        console.log('✅ Known file metadata:', {
            id: knownResponse.result.id,
            name: knownResponse.result.name,
            mimeType: knownResponse.result.mimeType,
            isFolder: knownResponse.result.mimeType === 'application/vnd.google-apps.folder'
        });

    } catch (error) {
        console.log('❌ Failed to get known file metadata:', error);
    }

    // Test 2: Try to list contents (only works for folders)
    console.log('\n📁 Test 2: Trying to list folder contents');

    try {
        const folderContents = await gapi.client.drive.files.list({
            q: `'${suspectedFolderId}' in parents`,
            fields: 'files(id,name,mimeType)'
        });

        console.log('✅ Folder contents found:', {
            fileCount: folderContents.result.files.length,
            files: folderContents.result.files.map(f => ({
                name: f.name,
                id: f.id,
                type: f.mimeType
            }))
        });

        return {
            hypothesis: 'CONFIRMED',
            reason: 'Successfully listed folder contents',
            suspectedIdType: 'FOLDER',
            contents: folderContents.result.files
        };

    } catch (error) {
        console.log('❌ Cannot list folder contents:', error);

        return {
            hypothesis: 'UNCONFIRMED',
            reason: 'Could not list folder contents',
            suspectedIdType: 'UNKNOWN'
        };
    }
}

// Make functions globally available
window.testFolderVsFileHypothesis = testFolderVsFileHypothesis;
window.runComprehensiveGoogleDriveTest = runComprehensiveGoogleDriveTest;
window.runComprehensiveFileWritingTest = runComprehensiveFileWritingTest;
window.testWritingMethodA_PatchOverwrite = testWritingMethodA_PatchOverwrite;
window.testWritingMethodB_PostCreate = testWritingMethodB_PostCreate;
window.testWritingMethodC_LegacyUpdate = testWritingMethodC_LegacyUpdate;
window.testMethod1_GapiClientDriveGet = testMethod1_GapiClientDriveGet;
window.testMethod2_FetchWithGapiAuth = testMethod2_FetchWithGapiAuth;
window.testMethod3_FetchWithGapiClient = testMethod3_FetchWithGapiClient;
window.testMethod4_LegacyDriveFiles = testMethod4_LegacyDriveFiles;
window.testMethod5_DirectFetchVariations = testMethod5_DirectFetchVariations;
window.runAllMethodsOnFile = runAllMethodsOnFile;
window.TEST_FILE_IDS = TEST_FILE_IDS;

console.log('🧪 Google Drive Reading Test Framework loaded successfully');
console.log('📋 Run simpleTest() to see available commands');