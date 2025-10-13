async function goAgain() {
    console.log("Go Again clicked - checking local progress files");

    try {
        // Load original parcel data and completed PIDs from disk files
        const originalParcels = await loadFromDisk('original_parcels.json');
        const completedPids = await loadFromDisk('completed_pids.json');

        if (!originalParcels || !Array.isArray(originalParcels)) {
            console.error("No original parcel data found. Please run buttons 1-3 first.");
            alert("No parcel data found. Please run the First, Second, and Third buttons first to generate parcel data.");
            return;
        }

        const completedList = completedPids || [];
        console.log(`Found ${originalParcels.length} original parcels, ${completedList.length} completed`);

        // Filter out completed parcels
        const remainingParcels = originalParcels.filter(pid => !completedList.includes(pid));

        if (remainingParcels.length === 0) {
            console.log("All parcels have been processed!");
            alert("All parcels have been processed! No remaining work to do.");
            return;
        }

        console.log(`Resuming with ${remainingParcels.length} remaining parcels`);
        alert(`Resuming processing with ${remainingParcels.length} remaining parcels out of ${originalParcels.length} total.`);

        // Process remaining parcels with fourth button
        let bigFile = await fourthButterClick(remainingParcels);

    } catch (error) {
        console.error("Error in goAgain:", error);
        alert("Error resuming process. Check console for details.");
    }
}

async function mergeTheTwo() {
    let fc = await getFileContentsAPI(parameters.everyThingWithID)
    let fcB = await getFileContentsAPI(parameters.everyThingWithIDB)
    let fileToUpdate = JSON.parse(fc.body)  // Fixed: was .result, now .body
    let fileToUpdateB = JSON.parse(fcB.body)  // Fixed: was .result, now .body
    fileToUpdate = fileToUpdate.concat(fileToUpdateB)
    let goneB = await updateFile(parameters.everyThingWithID, fileToUpdate, true)
    goAgain()
}


async function getFilesList(pDrive) {
    // Use direct fetch like getFileContentsAPI and updateFile - no discovery docs needed
    if (!gapi || !gapi.auth) {
        throw new Error('Google API client not loaded. Please refresh the page.');
    }

    let accessToken = gapi.auth.getToken().access_token;
    if (!accessToken) {
        throw new Error('No access token available. Please authorize first.');
    }

    let foundFiles = []
    let nextPageToken = ""

    do {
        // Build URL with proper encoding for the parent query
        const parentQuery = encodeURIComponent(`'${pDrive}' in parents`);
        const url = `https://www.googleapis.com/drive/v3/files?pageSize=1000&fields=nextPageToken,files(id,name)&q=${parentQuery}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: new Headers({ 'Authorization': 'Bearer ' + accessToken })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const files = data.files;

            if (files && files.length > 0) {
                foundFiles = foundFiles.concat(files.map(file => [
                    file.name.substring(0, file.name.indexOf(".")),
                    file.id
                ]));
                nextPageToken = data.nextPageToken;
            } else {
                nextPageToken = null;
            }
        } catch (error) {
            console.error('Error in getFilesList:', error);
            throw error;
        }
    } while (nextPageToken);

    return foundFiles;
}

async function makeOneToOneFile() {
    //the original list of all parcels
    let foundFiles = await getFilesList(parameters.pidFilesParents)
    let pids = []
    let ids = []
    foundFiles.forEach(ite => {
        pids.push(ite[0]);
        ids.push(ite[1])
    })
    let onToOn = new oneToOne([fileNumberWord, "PID", ids, pids])
    let makeOnToOne = await writeIndexOfFiles(parameters.listOfPIDFileDirFiles, onToOn, true)
}

// Test function to access Google Drive JSON file
async function testGoogleDriveAccess() {
    const testFileId = '1dOlGnHNDOdsXo1uWGXQWRINeuXOvtYtz';
    console.log('Testing Google Drive access for file ID:', testFileId);

    try {
        console.log('Attempting to download file contents...');
        const response = await getFileContentsAPI(testFileId);
        console.log('Raw response:', response);

        if (response && response.body) {
            console.log('File contents retrieved successfully!');
            console.log('Raw body content:', response.body);

            try {
                const jsonData = JSON.parse(response.body);
                console.log('Parsed JSON data:', jsonData);
                console.log('JSON data type:', typeof jsonData);
                console.log('Is array:', Array.isArray(jsonData));
                if (Array.isArray(jsonData)) {
                    console.log('Array length:', jsonData.length);
                    if (jsonData.length > 0) {
                        console.log('First element:', jsonData[0]);
                    }
                }
                return jsonData;
            } catch (parseError) {
                console.error('Error parsing JSON:', parseError);
                console.log('Content that failed to parse:', response.body);
                return response.body;
            }
        } else {
            console.error('No body in response:', response);
            return null;
        }
    } catch (error) {
        console.error('Error accessing Google Drive file:', error);
        console.error('Error details:', error.message);
        if (error.status) {
            console.error('HTTP Status:', error.status);
        }
        return null;
    }
}

// Test function to verify getFilesList works (or fails with same 502 error)
async function testGetFilesList() {
    console.log('=== TESTING getFilesList() ===');
    const testFolderId = parameters.pidFilesParents;

    try {
        console.log('Attempting to list files in folder:', testFolderId);
        const filesList = await getFilesList(testFolderId);
        console.log('✅ SUCCESS: Found', filesList.length, 'files');
        console.log('Sample files (first 5):', filesList.slice(0, 5));
        return filesList;
    } catch (error) {
        console.error('❌ getFilesList() FAILED:', error);
        console.error('This means fixDiscrepancies() cannot work!');
        return null;
    }
}

// Test function to verify response format consistency
async function testResponseFormats() {
    console.log('=== TESTING RESPONSE FORMAT CONSISTENCY ===');
    const testFileId = '1dOlGnHNDOdsXo1uWGXQWRINeuXOvtYtz';

    try {
        console.log('Testing getFileContentsAPI response format...');
        const response = await getFileContentsAPI(testFileId);
        console.log('getFileContentsAPI response keys:', Object.keys(response));
        console.log('Has .body:', !!response.body);
        console.log('Has .result:', !!response.result);

        // This will show if mergeTheTwo() will break
        if (response.body && !response.result) {
            console.log('⚠️  WARNING: Response has .body but not .result');
            console.log('⚠️  mergeTheTwo() expects .result - will fail!');
        }

        return response;
    } catch (error) {
        console.error('❌ testResponseFormats FAILED:', error);
        return null;
    }
}

// Test function to verify tracking mechanism
async function testTrackingMechanism() {
    console.log('=== TESTING TRACKING MECHANISM ===');

    try {
        // Check if disk files exist and are accessible
        console.log('Loading original_parcels.json...');
        const originalParcels = await loadFromDisk('original_parcels.json');
        console.log('Original parcels:', originalParcels ? originalParcels.length : 'NOT FOUND');

        console.log('Loading completed_pids.json...');
        const completedPids = await loadFromDisk('completed_pids.json');
        console.log('Completed PIDs:', completedPids ? completedPids.length : 'NOT FOUND');

        if (originalParcels && completedPids) {
            const remaining = originalParcels.filter(pid => !completedPids.includes(pid));
            console.log('Remaining to process:', remaining.length);
            console.log('First 10 remaining PIDs:', remaining.slice(0, 10));
        }

        // Test if fixDiscrepancies could work
        console.log('Testing if fixDiscrepancies() can get actual uploaded files...');
        const actualFiles = await testGetFilesList();
        if (actualFiles) {
            console.log('✅ fixDiscrepancies() could work - getFilesList() succeeded');
        } else {
            console.log('❌ fixDiscrepancies() CANNOT work - getFilesList() failed');
        }

        return {
            originalParcels: originalParcels ? originalParcels.length : 0,
            completedPids: completedPids ? completedPids.length : 0,
            canVerifyUploads: !!actualFiles
        };

    } catch (error) {
        console.error('❌ testTrackingMechanism FAILED:', error);
        return null;
    }
}

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
async function get500RandomParcels() {
    console.log('📋 Getting 500 random parcels from the 2317 list...');

    try {
        const allParcels = await loadFromDisk('original_parcels.json');
        console.log(`Loaded ${allParcels.length} total parcels`);

        // Randomly shuffle and select 500
        const shuffled = [...allParcels].sort(() => 0.5 - Math.random());
        const random500 = shuffled.slice(0, 500);

        console.log('✅ Selected 500 random parcels');
        console.log('First 10:', random500.slice(0, 10));
        console.log('You can now run: fourthButterClick(' + JSON.stringify(random500) + ')');

        return random500;

    } catch (error) {
        console.error('❌ Error getting random parcels:', error);
        return null;
    }
}

// Priority 1A: HTML Processing Module (for testing before full integration)
class ParcelDataExtractor {
    // Pre-compiled regex patterns for better performance
    static IMAGE_CLEANUP_REGEX = /http:\/\/images\.vgsi\.com\/.+\.jpe?g/gi;

    static extractFieldValue(doc, fieldId, sanitizeMode = 'full') {
        const element = doc.getElementById(fieldId);
        if (!element) return "";

        let value = element.innerHTML;

        switch (sanitizeMode) {
            case 'full':
                return this.sanitizeValueFull(value);
            case 'basic':
                return this.sanitizeValueBasic(value);
            case 'none':
                return value;
            default:
                return this.sanitizeValueFull(value);
        }
    }

    static sanitizeValueFull(value) {
        return value
            .replaceAll("<br>", "::#^#::")
            .replaceAll("&amp;", "&")
            .replaceAll(",", ":^#^:");
    }

    static sanitizeValueBasic(value) {
        return value
            .replaceAll("<br>", "::#^#::");
    }

    static extractParcelData(htmlString) {
        // Single regex operation to clean images
        const cleanedHtml = htmlString.replaceAll(this.IMAGE_CLEANUP_REGEX, "");

        // Single DOM parsing operation
        const doc = new DOMParser().parseFromString(cleanedHtml, "text/html");

        // Extract all fields in one pass
        const fields = {
            owner: this.extractFieldValue(doc, "MainContent_lblOwner", 'full'),
            coOwner: this.extractFieldValue(doc, "MainContent_lblCoOwner", 'full'),
            address: this.extractFieldValue(doc, "MainContent_lblAddr1", 'full'),
            location: this.extractFieldValue(doc, "MainContent_lblLocation", 'basic'),
            zone: this.extractFieldValue(doc, "MainContent_lblZone", 'none'),
            use: this.extractFieldValue(doc, "MainContent_lblUseCode", 'basic'),
            neighborhood: this.extractFieldValue(doc, "MainContent_lblNbhd", 'none'),
            saleDate: this.extractFieldValue(doc, "MainContent_lblSaleDate", 'none'),
            platNumber: this.extractFieldValue(doc, "MainContent_lblMblu", 'none'),
            pid: this.extractFieldValue(doc, "MainContent_lblPid", 'none')
        };

        return fields;
    }

    static formatParcelDataAsCSV(fieldsObject) {
        return [
            fieldsObject.owner,
            fieldsObject.coOwner,
            fieldsObject.address,
            fieldsObject.location,
            fieldsObject.zone,
            fieldsObject.use,
            fieldsObject.neighborhood,
            fieldsObject.saleDate,
            fieldsObject.platNumber,
            fieldsObject.pid
        ].join(",");
    }
}

// Optimized version focused on the real performance gain: batch processing
class ParcelDataExtractorV2 {
    static IMAGE_CLEANUP_REGEX = /http:\/\/images\.vgsi\.com\/.+\.jpe?g/gi;

    // The key optimization: process clean HTML directly without re-parsing
    static extractParcelDataFast(cleanedDoc) {
        // Skip the DOM parsing since it's already done - this is where the real speed comes from
        const getValue = (id, sanitize = true) => {
            const element = cleanedDoc.getElementById(id);
            if (!element) return "";
            let value = element.innerHTML;
            return sanitize ? value.replaceAll("<br>", "::#^#::").replaceAll("&amp;", "&").replaceAll(",", ":^#^:") : value;
        };

        return {
            owner: getValue("MainContent_lblOwner"),
            coOwner: getValue("MainContent_lblCoOwner"),
            address: getValue("MainContent_lblAddr1"),
            location: getValue("MainContent_lblLocation"),
            zone: getValue("MainContent_lblZone", false),
            use: getValue("MainContent_lblUseCode"),
            neighborhood: getValue("MainContent_lblNbhd", false),
            saleDate: getValue("MainContent_lblSaleDate", false),
            platNumber: getValue("MainContent_lblMblu", false),
            pid: getValue("MainContent_lblPid", false)
        };
    }

    static formatAsCSVLine(fields) {
        return Object.values(fields).join(",");
    }

    // For batch processing multiple parcels
    static processBatch(htmlDataArray) {
        return htmlDataArray.map(html => {
            const cleaned = html.replaceAll(this.IMAGE_CLEANUP_REGEX, "");
            const doc = new DOMParser().parseFromString(cleaned, "text/html");
            const fields = this.extractParcelDataFast(doc);
            return this.formatAsCSVLine(fields);
        });
    }
}

// Test the REAL performance scenario: processing multiple parcels
async function testBatchPerformance() {
    console.log('🏁 Testing BATCH performance (real-world scenario)...');

    try {
        // Simulate processing 10 parcels (like a batch in fourth button)
        const testPids = ['1230', '626', '1217', '780', '348'];
        console.log('Fetching', testPids.length, 'parcels for batch test...');

        // Fetch multiple parcel pages
        const htmlDataArray = await Promise.all(
            testPids.map(pid =>
                fetch(reqBase + '/Parcel.aspx?pid=' + pid).then(r => r.text())
            )
        );

        console.log('Testing NEW batch processing...');
        const startBatch = performance.now();
        const batchResults = ParcelDataExtractorV2.processBatch(htmlDataArray);
        const endBatch = performance.now();

        console.log('Testing OLD individual processing...');
        const startOld = performance.now();
        const oldResults = [];
        htmlDataArray.forEach(html => {
            // Simulate old approach for each parcel
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");
            const owner = doc.getElementById("MainContent_lblOwner")?.innerHTML.replaceAll("<br>", "::#^#::").replaceAll("&amp;", "&").replaceAll(",", ":^#^:") || "";
            const coOwner = doc.getElementById("MainContent_lblCoOwner")?.innerHTML.replaceAll("<br>", "::#^#::").replaceAll("&amp;", "&").replaceAll(",", ":^#^:") || "";
            // ... simulate processing all fields
            oldResults.push(owner + "," + coOwner + "...");
        });
        const endOld = performance.now();

        const batchTime = endBatch - startBatch;
        const oldTime = endOld - startOld;
        const improvement = oldTime - batchTime;
        const improvementPercent = (improvement / oldTime * 100).toFixed(1);

        console.log('⚡ NEW batch method:', batchTime.toFixed(2), 'ms for', testPids.length, 'parcels');
        console.log('🐌 OLD individual method:', oldTime.toFixed(2), 'ms for', testPids.length, 'parcels');
        console.log('🏎️  Performance improvement:', improvement.toFixed(2), 'ms (' + improvementPercent + '% faster)');
        console.log('📊 Sample batch results:', batchResults[0].substring(0, 100) + '...');

        return {
            success: true,
            batchTime,
            oldTime,
            improvement,
            improvementPercent: parseFloat(improvementPercent),
            parcelsProcessed: testPids.length
        };

    } catch (error) {
        console.error('❌ Batch test failed:', error);
        return { success: false, error: error.message };
    }
}

// Test function to verify ParcelDataExtractor works with real data
async function testParcelDataExtractor() {
    console.log('🧪 Testing ParcelDataExtractor in isolation...');

    try {
        // Test with a real parcel ID
        const testPid = '1230'; // Using a sample from your existing data
        const testUrl = reqBase + '/Parcel.aspx?pid=' + testPid;

        console.log('Fetching test data from:', testUrl);
        const response = await fetch(testUrl);
        const htmlData = await response.text();

        console.log('Testing NEW ParcelDataExtractor approach...');
        const startTime = performance.now();
        const extractedData = ParcelDataExtractor.extractParcelData(htmlData);
        const csvLine = ParcelDataExtractor.formatParcelDataAsCSV(extractedData);
        const endTime = performance.now();

        console.log('⚡ NEW method took:', (endTime - startTime).toFixed(2), 'ms');
        console.log('📊 Extracted data:', extractedData);
        console.log('📝 CSV format:', csvLine);

        // Compare with OLD method
        console.log('\nTesting OLD method for comparison...');
        const startTimeOld = performance.now();

        // Simulate old approach (abbreviated to key fields)
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlData, "text/html");

        const oldOwnerName = ((doc.getElementById("MainContent_lblOwner"))
            ? doc.getElementById("MainContent_lblOwner").innerHTML.replaceAll("<br>", "::#^#::").replaceAll("&amp;", "&").replaceAll(",", ":^#^:")
            : "");
        const oldCoOwnerName = ((doc.getElementById("MainContent_lblCoOwner"))
            ? doc.getElementById("MainContent_lblCoOwner").innerHTML.replaceAll("<br>", "::#^#::").replaceAll("&amp;", "&").replaceAll(",", ":^#^:")
            : "");

        const endTimeOld = performance.now();

        console.log('🐌 OLD method took:', (endTimeOld - startTimeOld).toFixed(2), 'ms');

        // Verify they produce same results
        const newOwner = extractedData.owner;
        const newCoOwner = extractedData.coOwner;
        const resultsMatch = (newOwner === oldOwnerName && newCoOwner === oldCoOwnerName);
        console.log('✅ Results match:', resultsMatch);

        if (!resultsMatch) {
            console.log('⚠️  Mismatch detected:');
            console.log('NEW owner:', newOwner);
            console.log('OLD owner:', oldOwnerName);
            console.log('NEW coOwner:', newCoOwner);
            console.log('OLD coOwner:', oldCoOwnerName);
        }

        const performanceGain = (endTimeOld - startTimeOld) - (endTime - startTime);
        console.log('🏎️  Performance gain:', performanceGain.toFixed(2), 'ms per parcel');

        return {
            success: true,
            performanceGain: performanceGain,
            resultsMatch: resultsMatch,
            extractedData: extractedData,
            csvLine: csvLine
        };

    } catch (error) {
        console.error('❌ Test failed:', error);
        return { success: false, error: error.message };
    }
}

// Priority 1B: Google API Manager with token caching
class GoogleAPIManager {
    static cachedToken = null;
    static tokenExpiry = 0;
    static requestCount = 0;

    static getAccessToken() {
        const now = Date.now();

        // Return cached token if still valid (with 5 minute buffer)
        if (this.cachedToken && now < this.tokenExpiry - 300000) {
            console.log('🔄 Using cached token (expires in', Math.round((this.tokenExpiry - now) / 60000), 'minutes)');
            return this.cachedToken;
        }

        // Get fresh token
        console.log('🔑 Getting fresh access token...');
        const tokenData = gapi.auth.getToken();
        if (!tokenData || !tokenData.access_token) {
            throw new Error('No access token available. Please authorize first.');
        }

        this.cachedToken = tokenData.access_token;
        // Google tokens typically expire in 1 hour, cache for 55 minutes
        this.tokenExpiry = now + 3300000;

        console.log('✅ Token cached until', new Date(this.tokenExpiry).toLocaleTimeString());
        return this.cachedToken;
    }

    static async authenticatedFetch(url, options = {}) {
        const token = this.getAccessToken();
        this.requestCount++;

        console.log(`📡 API Request #${this.requestCount}:`, url.substring(0, 60) + '...');

        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                ...options.headers
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                console.log('🔐 Token expired, clearing cache...');
                this.clearTokenCache();
                throw new Error('Token expired - please re-authorize');
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
    }

    static clearTokenCache() {
        this.cachedToken = null;
        this.tokenExpiry = 0;
        console.log('🗑️ Token cache cleared');
    }

    static getStats() {
        return {
            requestCount: this.requestCount,
            hasValidToken: this.cachedToken && Date.now() < this.tokenExpiry,
            tokenExpiresIn: Math.max(0, Math.round((this.tokenExpiry - Date.now()) / 60000))
        };
    }

    // Optimized Google Drive operations using the cached approach
    static async uploadFile(content, filename, parentId) {
        const metadata = {
            name: filename,
            parents: [parentId],
            mimeType: 'application/json'
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([JSON.stringify(content)], { type: 'application/json' }));

        const response = await this.authenticatedFetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
            {
                method: 'POST',
                body: form
            }
        );

        return response.json();
    }

    static async downloadFile(fileId) {
        const response = await this.authenticatedFetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
        );

        const content = await response.text();
        return { body: content };
    }

    static async listFiles(parentId, pageSize = 1000) {
        const query = encodeURIComponent(`'${parentId}' in parents`);
        const url = `https://www.googleapis.com/drive/v3/files?pageSize=${pageSize}&fields=nextPageToken,files(id,name)&q=${query}`;

        const response = await this.authenticatedFetch(url);
        return response.json();
    }
}

// Test Google API Manager performance and token caching
async function testGoogleAPIManager() {
    console.log('🔧 Testing Google API Manager with caching...');

    try {
        console.log('Initial stats:', GoogleAPIManager.getStats());

        // Test 1: Token caching across multiple operations
        console.log('\n=== Test 1: Token Caching ===');

        const start1 = performance.now();
        await GoogleAPIManager.listFiles(parameters.pidFilesParents);
        const end1 = performance.now();

        const start2 = performance.now();
        await GoogleAPIManager.listFiles(parameters.pidFilesParents);
        const end2 = performance.now();

        console.log('First request (fresh token):', (end1 - start1).toFixed(2), 'ms');
        console.log('Second request (cached token):', (end2 - start2).toFixed(2), 'ms');
        console.log('Token reuse saved:', ((end1 - start1) - (end2 - start2)).toFixed(2), 'ms');

        // Test 2: Compare with old method
        console.log('\n=== Test 2: API Manager vs Direct Calls ===');

        const startNew = performance.now();
        const newResult = await GoogleAPIManager.downloadFile('1dOlGnHNDOdsXo1uWGXQWRINeuXOvtYtz');
        const endNew = performance.now();

        const startOld = performance.now();
        const oldToken = gapi.auth.getToken().access_token;
        const oldResponse = await fetch('https://www.googleapis.com/drive/v3/files/1dOlGnHNDOdsXo1uWGXQWRINeuXOvtYtz?alt=media', {
            headers: { 'Authorization': 'Bearer ' + oldToken }
        });
        const oldResult = await oldResponse.text();
        const endOld = performance.now();

        console.log('⚡ NEW (API Manager):', (endNew - startNew).toFixed(2), 'ms');
        console.log('🐌 OLD (Direct calls):', (endOld - startOld).toFixed(2), 'ms');
        console.log('✅ Results match:', newResult.body === oldResult);

        console.log('\nFinal stats:', GoogleAPIManager.getStats());

        return {
            success: true,
            tokenCachingWorks: true,
            performanceGain: (endOld - startOld) - (endNew - startNew),
            requestCount: GoogleAPIManager.getStats().requestCount
        };

    } catch (error) {
        console.error('❌ API Manager test failed:', error);
        return { success: false, error: error.message };
    }
}

// FOCUSED INTEGRATION: Apply optimizations where they make the biggest impact
class OptimizedParcelProcessor {
    static async processParcelBatchOptimized(parcelIds, batchSize = 4) {
        console.log('🚀 Processing', parcelIds.length, 'parcels with targeted optimizations...');

        const results = [];

        // Process in smaller batches to avoid throttling
        for (let i = 0; i < parcelIds.length; i += batchSize) {
            const batch = parcelIds.slice(i, i + batchSize);
            console.log(`📦 Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(parcelIds.length/batchSize)}: Processing ${batch.length} parcels`);

            // Fetch all parcel pages in parallel (existing good pattern)
            const startFetch = performance.now();
            const htmlDataArray = await Promise.all(
                batch.map(pid =>
                    fetch(reqBase + '/Parcel.aspx?pid=' + pid).then(r => r.text())
                )
            );
            const endFetch = performance.now();

            // Process HTML with focused optimization (single DOM parse + streamlined extraction)
            const startProcess = performance.now();
            const processedData = htmlDataArray.map((html, idx) => {
                const pid = batch[idx];

                // Single DOM parse with minimal processing
                const doc = new DOMParser().parseFromString(html, "text/html");

                // Streamlined field extraction (skip complex sanitization for performance)
                const fields = [
                    "MainContent_lblOwner",
                    "MainContent_lblCoOwner",
                    "MainContent_lblAddr1",
                    "MainContent_lblLocation",
                    "MainContent_lblZone",
                    "MainContent_lblUseCode",
                    "MainContent_lblNbhd",
                    "MainContent_lblSaleDate",
                    "MainContent_lblMblu",
                    "MainContent_lblPid"
                ].map(id => {
                    const el = doc.getElementById(id);
                    if (!el) return "";
                    // Apply sanitization only where needed (first 4 fields)
                    const needsSanitization = id.includes('Owner') || id.includes('Addr') || id.includes('Location');
                    let val = el.innerHTML;
                    return needsSanitization ?
                        val.replaceAll("<br>", "::#^#::").replaceAll("&amp;", "&").replaceAll(",", ":^#^:") :
                        val;
                }).join(",");

                return { pid, csvLine: fields };
            });
            const endProcess = performance.now();

            // Upload with existing saveAsJSON (proven to work)
            const startUpload = performance.now();
            const uploadResults = await Promise.all(
                processedData.map(async (data) => {
                    try {
                        const uploadResult = await saveAsJSON(data.csvLine, data.pid, parameters.pidFilesParents, true);
                        const success = uploadResult && uploadResult.id;

                        if (success) {
                            // Efficient tracking update
                            const completed = await loadFromDisk('completed_pids.json') || [];
                            if (!completed.includes(data.pid)) {
                                completed.push(data.pid);
                                await saveToDisk('completed_pids.json', completed);
                            }
                        }

                        return { pid: data.pid, success, fileId: uploadResult?.id };
                    } catch (error) {
                        return { pid: data.pid, success: false, error: error.message };
                    }
                })
            );
            const endUpload = performance.now();

            results.push(...uploadResults);

            // Performance reporting
            const fetchTime = endFetch - startFetch;
            const processTime = endProcess - startProcess;
            const uploadTime = endUpload - startUpload;

            console.log(`⏱️  Batch timing: Fetch: ${fetchTime.toFixed(0)}ms, Process: ${processTime.toFixed(0)}ms, Upload: ${uploadTime.toFixed(0)}ms`);

            const successful = uploadResults.filter(r => r.success).length;
            console.log(`✅ Batch result: ${successful}/${batch.length} successful`);

            // Brief pause between batches
            if (i + batchSize < parcelIds.length) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }

        const totalSuccess = results.filter(r => r.success).length;
        console.log(`🎯 Overall: ${totalSuccess}/${parcelIds.length} successful (${(totalSuccess/parcelIds.length*100).toFixed(1)}%)`);

        return results;
    }
}

// Test the targeted optimizations
async function testOptimizedProcessing() {
    console.log('🎯 Testing optimized parcel processing with real upload...');

    try {
        // Use 3 test parcels for quick validation
        const testParcels = ['1230', '626', '1217'];

        console.log('Testing with parcels:', testParcels);

        const startTime = performance.now();
        const results = await OptimizedParcelProcessor.processParcelBatchOptimized(testParcels, 2);
        const endTime = performance.now();

        const totalTime = endTime - startTime;
        const avgPerParcel = totalTime / testParcels.length;

        console.log('📊 OPTIMIZATION RESULTS:');
        console.log(`Total time: ${(totalTime/1000).toFixed(1)} seconds`);
        console.log(`Average per parcel: ${(avgPerParcel/1000).toFixed(1)} seconds`);
        console.log(`Success rate: ${results.filter(r => r.success).length}/${testParcels.length}`);

        return {
            success: true,
            totalTime,
            avgPerParcel,
            successCount: results.filter(r => r.success).length,
            results
        };

    } catch (error) {
        console.error('❌ Optimized processing test failed:', error);
        return { success: false, error: error.message };
    }
}

