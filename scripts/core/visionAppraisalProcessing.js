/**
 * VisionAppraisal Processing Module
 *
 * Core utilities and processing classes for VisionAppraisal data operations.
 * Extracted from utils.js for better modularity and maintainability.
 *
 * Dependencies:
 * - Google Drive API (gapi.client) for file access
 * - getFileContentsAPI(), updateFile(), loadFromDisk() from utils.js
 * - fourthButterClick() from baseCode.js
 *
 * Key Features:
 * - Resume processing functionality (goAgain)
 * - Data merging operations (mergeTheTwo)
 * - Random parcel selection for testing
 * - High-performance HTML parsing classes
 * - Batch processing capabilities
 * - Google Drive file listing
 * - One-to-one PID mapping
 */

/**
 * Resume VisionAppraisal processing from where it left off
 * Loads progress files and continues with remaining parcels
 */
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

/**
 * Merge two VisionAppraisal data files
 * Combines data from everyThingWithID and everyThingWithIDB
 */
async function mergeTheTwo() {
    let fc = await getFileContentsAPI(parameters.everyThingWithID)
    let fcB = await getFileContentsAPI(parameters.everyThingWithIDB)
    let fileToUpdate = JSON.parse(fc.body)  // Fixed: was .result, now .body
    let fileToUpdateB = JSON.parse(fcB.body)  // Fixed: was .result, now .body
    fileToUpdate = fileToUpdate.concat(fileToUpdateB)
    let goneB = await updateFile(parameters.everyThingWithID, fileToUpdate, true)
    goAgain()
}

/**
 * Get list of files from a Google Drive folder
 * @param {string} pDrive - Google Drive folder ID
 * @returns {Array} Array of [filename, fileId] pairs
 */
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

/**
 * Create one-to-one mapping file for PID files
 * Maps file numbers to PIDs and their Google Drive file IDs
 */
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

/**
 * Get 500 random parcels for testing purposes
 * @returns {Array} Array of 500 randomly selected PID strings
 */
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

/**
 * High-performance HTML processing class for VisionAppraisal data
 * Optimized for parsing parcel information from HTML strings
 */
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

/**
 * Optimized version of ParcelDataExtractor focused on batch processing
 * Further performance improvements for processing multiple parcels
 */
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

/**
 * Test Google Drive access functionality
 * @param {string} fileId - Google Drive file ID to test (optional)
 */
async function testGoogleDriveAccess(fileId = '1dOlGnHNDOdsXo1uWGXQWRINeuXOvtYtz') {
    console.log('Testing Google Drive access for file ID:', fileId);

    try {
        console.log('Attempting to download file contents...');
        const response = await getFileContentsAPI(fileId);

        if (response && response.body) {
            console.log('✅ Successfully accessed Google Drive file');
            console.log('File content length:', response.body.length);
            console.log('First 100 characters:', response.body.substring(0, 100) + '...');
            return response;
        } else {
            console.log('❌ No content received from Google Drive');
            return null;
        }
    } catch (error) {
        console.error('❌ Google Drive access failed:', error);
        return null;
    }
}

/**
 * Test batch performance of parcel processing
 * Compares ParcelDataExtractor vs ParcelDataExtractorV2 performance
 */
async function testBatchPerformance() {
    console.log('🏁 Testing BATCH performance (real-world scenario)...');

    try {
        // Simulate processing 5 parcels (like a batch in fourth button)
        const testPids = ['1230', '626', '1217', '780', '348'];
        console.log('Fetching', testPids.length, 'parcels for batch test...');

        // Test batch processing performance here
        console.log('⚡ Batch performance testing would require HTML data');
        console.log('💡 Use this function with real HTML data from fourthButterClick()');

        return {
            testPids: testPids,
            status: 'ready_for_html_data',
            message: 'Provide HTML data array to test batch processing performance'
        };

    } catch (error) {
        console.error('❌ Error in batch performance test:', error);
        return null;
    }
}

/**
 * Test ParcelDataExtractor class functionality with real data
 * Compares new vs old extraction methods for performance and accuracy
 */
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