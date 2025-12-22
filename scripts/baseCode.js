const reqBase = "http://127.0.0.99:3000";

// ===== INTEGRATION TESTING FUNCTIONS =====

/**
 * Minimal VisionAppraisal data loader for integration testing
 * Extracts Fire Numbers and PIDs from everyThingWithPid.json
 * Returns array of {fireNumber, pid, propertyLocation, ownerName} objects
 */
async function loadVisionAppraisalData() {
    console.log("=== LOADING VISIONAPPRAISAL DATA FOR INTEGRATION ===");

    try {
        // Load the VisionAppraisal data file via Express server route
        const response = await fetch('http://127.0.0.99:3000/visionappraisal-data');
        const rawData = await response.text();

        // Parse JSON array of CSV-like strings
        const dataArray = JSON.parse(rawData);
        console.log(`Loaded ${dataArray.length} VisionAppraisal records`);

        const parsedData = [];
        let fireNumberCount = 0;

        for (let i = 0; i < dataArray.length; i++) {
            const record = dataArray[i];

            // Split by comma to get fields (structure identified from analysis)
            const fields = record.split(',');

            if (fields.length < 11) {
                console.warn(`Record ${i}: Insufficient fields (${fields.length})`);
                continue;
            }

            const ownerName = fields[0].replace(/^["']|["']$/g, ''); // Remove quotes
            const propertyLocation = fields[3]; // Field 4 (0-indexed = 3)
            const pid = fields[9]; // Field 10 (0-indexed = 9)

            // Extract Fire Number from property location (numbers at start)
            const fireNumberMatch = propertyLocation.match(/^\s*(\d+)/);
            const fireNumber = fireNumberMatch ? parseInt(fireNumberMatch[1]) : null;

            // Only include valid fire numbers (4 digits or less, <3500 per CLAUDE.md)
            const isValidFireNumber = fireNumber && fireNumber < 3500;

            parsedData.push({
                index: i,
                ownerName: ownerName,
                propertyLocation: propertyLocation,
                fireNumber: isValidFireNumber ? fireNumber : null,
                pid: parseInt(pid),
                hasFireNumber: isValidFireNumber
            });

            if (isValidFireNumber) {
                fireNumberCount++;
            }
        }

        console.log(`Processed ${parsedData.length} records:`);
        console.log(`- ${fireNumberCount} with valid Fire Numbers`);
        console.log(`- ${parsedData.length - fireNumberCount} without Fire Numbers`);

        // Show sample of records with Fire Numbers
        const withFireNumbers = parsedData.filter(r => r.hasFireNumber).slice(0, 5);
        console.log("Sample records with Fire Numbers:", withFireNumbers);

        return parsedData;

    } catch (error) {
        console.error("Error loading VisionAppraisal data:", error);
        throw error;
    }
}

/**
 * Test Fire Number ↔ PID relationship validation
 * Returns analysis of whether Fire Numbers map 1:1 to PIDs
 */
async function testFireNumberPidRelationship() {
    console.log("=== TESTING FIRE NUMBER ↔ PID RELATIONSHIP ===");

    const data = await loadVisionAppraisalData();
    const withFireNumbers = data.filter(r => r.hasFireNumber);

    // Group by Fire Number to check for duplicates
    const fireNumberGroups = {};
    const pidGroups = {};

    withFireNumbers.forEach(record => {
        const fn = record.fireNumber;
        const pid = record.pid;

        if (!fireNumberGroups[fn]) fireNumberGroups[fn] = [];
        fireNumberGroups[fn].push(record);

        if (!pidGroups[pid]) pidGroups[pid] = [];
        pidGroups[pid].push(record);
    });

    // Check for conflicts
    const fireNumberConflicts = Object.entries(fireNumberGroups).filter(([fn, records]) => records.length > 1);
    const pidConflicts = Object.entries(pidGroups).filter(([pid, records]) => records.length > 1);

    console.log("=== FIRE NUMBER ↔ PID RELATIONSHIP ANALYSIS ===");
    console.log(`Total records with Fire Numbers: ${withFireNumbers.length}`);
    console.log(`Unique Fire Numbers: ${Object.keys(fireNumberGroups).length}`);
    console.log(`Unique PIDs: ${Object.keys(pidGroups).length}`);
    console.log(`Fire Number conflicts (1 Fire Number → multiple records): ${fireNumberConflicts.length}`);
    console.log(`PID conflicts (1 PID → multiple records): ${pidConflicts.length}`);

    if (fireNumberConflicts.length > 0) {
        console.warn("Fire Number conflicts found:", fireNumberConflicts.slice(0, 3));
    }

    if (pidConflicts.length > 0) {
        console.warn("PID conflicts found:", pidConflicts.slice(0, 3));
    }

    // Check if relationship is truly 1:1
    const is1to1 = fireNumberConflicts.length === 0 && pidConflicts.length === 0 &&
                   Object.keys(fireNumberGroups).length === Object.keys(pidGroups).length;

    console.log(`Is Fire Number ↔ PID relationship 1:1? ${is1to1 ? '✅ YES' : '❌ NO'}`);

    return {
        total: withFireNumbers.length,
        uniqueFireNumbers: Object.keys(fireNumberGroups).length,
        uniquePids: Object.keys(pidGroups).length,
        fireNumberConflicts: fireNumberConflicts.length,
        pidConflicts: pidConflicts.length,
        is1to1: is1to1,
        sampleData: withFireNumbers.slice(0, 10)
    };
}

/**
 * SESSION-RESILIENT: VisionAppraisal Field Analysis for Data Enrichment
 * Analyzes all VisionAppraisal fields to identify enrichment potential for Bloomerang contacts
 * Outputs comprehensive results for multi-stage matching pipeline design
 */
async function analyzeVisionAppraisalFields() {
    console.log("=== VISIONAPPRAISAL FIELD ANALYSIS FOR DATA ENRICHMENT ===");

    try {
        const data = await loadVisionAppraisalData();
        console.log(`Analyzing ${data.length} VisionAppraisal records for enrichment potential`);

        // Sample first 10 records to understand field structure
        const sampleRecords = data.slice(0, 10);

        console.log("=== RAW FIELD ANALYSIS ===");
        sampleRecords.forEach((record, i) => {
            if (i < 3) { // Show first 3 records in detail
                console.log(`\n--- RECORD ${i} ---`);
                console.log(`Owner Name: "${record.ownerName}"`);
                console.log(`Property Location: "${record.propertyLocation}"`);
                console.log(`Fire Number: ${record.fireNumber}`);
                console.log(`PID: ${record.pid}`);
                console.log(`Has Fire Number: ${record.hasFireNumber}`);
            }
        });

        // Analyze field patterns across all records
        console.log("\n=== FIELD COMPLETENESS ANALYSIS ===");

        const fieldStats = {
            totalRecords: data.length,
            withFireNumbers: data.filter(r => r.hasFireNumber).length,
            withoutFireNumbers: data.filter(r => !r.hasFireNumber).length,
            ownerNamePatterns: new Set(),
            propertyLocationPatterns: new Set(),
            uniqueFireNumbers: new Set(),
            uniquePids: new Set()
        };

        // Analyze patterns in first 50 records for performance
        data.slice(0, 50).forEach(record => {
            // Owner name patterns
            if (record.ownerName.includes('TRUST')) fieldStats.ownerNamePatterns.add('TRUST');
            if (record.ownerName.includes('LLC')) fieldStats.ownerNamePatterns.add('LLC');
            if (record.ownerName.includes('INC')) fieldStats.ownerNamePatterns.add('INC');
            if (record.ownerName.includes('&')) fieldStats.ownerNamePatterns.add('JOINT_OWNERSHIP');

            // Property location patterns
            if (record.propertyLocation.includes('STREET')) fieldStats.propertyLocationPatterns.add('STREET');
            if (record.propertyLocation.includes('AVENUE')) fieldStats.propertyLocationPatterns.add('AVENUE');
            if (record.propertyLocation.includes('ROAD')) fieldStats.propertyLocationPatterns.add('ROAD');
            if (record.propertyLocation.includes('BEACH')) fieldStats.propertyLocationPatterns.add('BEACH');

            if (record.hasFireNumber) fieldStats.uniqueFireNumbers.add(record.fireNumber);
            fieldStats.uniquePids.add(record.pid);
        });

        console.log("Field Completeness:");
        console.log(`- Total Records: ${fieldStats.totalRecords}`);
        console.log(`- With Fire Numbers: ${fieldStats.withFireNumbers} (${(fieldStats.withFireNumbers/fieldStats.totalRecords*100).toFixed(1)}%)`);
        console.log(`- Without Fire Numbers: ${fieldStats.withoutFireNumbers} (${(fieldStats.withoutFireNumbers/fieldStats.totalRecords*100).toFixed(1)}%)`);
        console.log(`- Unique Fire Numbers (sample): ${fieldStats.uniqueFireNumbers.size}`);
        console.log(`- Unique PIDs (sample): ${fieldStats.uniquePids.size}`);

        console.log("\nOwner Name Patterns:", Array.from(fieldStats.ownerNamePatterns));
        console.log("Property Location Patterns:", Array.from(fieldStats.propertyLocationPatterns));

        console.log("\n=== DATA ENRICHMENT POTENTIAL ===");
        console.log("Fields available for Bloomerang enrichment:");
        console.log("1. PROPERTY OWNERSHIP DATA:");
        console.log("   - Fire Number (building identifier)");
        console.log("   - PID (parcel identifier)");
        console.log("   - Property Location (Block Island address)");
        console.log("   - Owner Name (for matching validation)");

        console.log("\n2. MATCHING PIPELINE REQUIREMENTS:");
        console.log("   - Stage 1 (Fire Number): Direct lookup Bloomerang Fire# → VisionAppraisal records");
        console.log("   - Stage 2 (Name Matching): Fuzzy match VisionAppraisal owner → Bloomerang names");
        console.log("   - Stage 3 (Address Matching): Block Island address standardization required");

        console.log("\n3. OWNER CLUSTERING NEEDS:");
        console.log("   - Group multiple PIDs by owner similarity within Fire Numbers");
        console.log("   - Handle business entities (LLC, TRUST, INC patterns detected)");
        console.log("   - Joint ownership patterns (& detected in owner names)");

        return {
            fieldStats,
            enrichmentFields: ['fireNumber', 'pid', 'propertyLocation', 'ownerName'],
            matchingRequirements: ['fireNumberLookup', 'nameMatching', 'addressStandardization'],
            ownerPatterns: Array.from(fieldStats.ownerNamePatterns)
        };

    } catch (error) {
        console.error("Error in VisionAppraisal field analysis:", error);
        throw error;
    }
}

// Stage 1: Fire Number Direct Matching
async function matchByFireNumber(bloomerangContacts) {
    try {
        console.log("=== STAGE 1: FIRE NUMBER DIRECT MATCHING ===");

        // Load VisionAppraisal data
        const visionData = await loadVisionAppraisalData();
        if (!visionData || visionData.length === 0) {
            throw new Error("No VisionAppraisal data loaded");
        }

        // Build Fire Number index for fast lookup
        const fireNumberIndex = {};
        visionData.forEach(record => {
            if (record.fireNumber) {
                if (!fireNumberIndex[record.fireNumber]) {
                    fireNumberIndex[record.fireNumber] = [];
                }
                fireNumberIndex[record.fireNumber].push(record);
            }
        });

        const results = {
            directMatches: [],
            noMatches: [],
            multipleMatches: [],
            stats: {
                totalBloomerang: bloomerangContacts.length,
                withFireNumbers: 0,
                directMatched: 0,
                multipleMatched: 0,
                noMatched: 0
            }
        };

        // Process each Bloomerang contact
        bloomerangContacts.forEach(contact => {
            const fireNumber = contact.fireNumber || contact.fire_number || contact['Fire Number'];

            if (!fireNumber) {
                results.noMatches.push({
                    contact: contact,
                    reason: 'NO_FIRE_NUMBER'
                });
                return;
            }

            results.stats.withFireNumbers++;

            const visionMatches = fireNumberIndex[fireNumber];
            if (!visionMatches || visionMatches.length === 0) {
                results.noMatches.push({
                    contact: contact,
                    fireNumber: fireNumber,
                    reason: 'FIRE_NUMBER_NOT_FOUND'
                });
                results.stats.noMatched++;
            } else if (visionMatches.length === 1) {
                results.directMatches.push({
                    contact: contact,
                    visionRecord: visionMatches[0],
                    fireNumber: fireNumber,
                    confidence: 'HIGH'
                });
                results.stats.directMatched++;
            } else {
                results.multipleMatches.push({
                    contact: contact,
                    visionRecords: visionMatches,
                    fireNumber: fireNumber,
                    reason: 'MULTIPLE_PIDS_PER_FIRE_NUMBER',
                    requiresOwnerClustering: true
                });
                results.stats.multipleMatched++;
            }
        });

        // Display results
        console.log("\n=== FIRE NUMBER MATCHING RESULTS ===");
        console.log(`Total Bloomerang contacts: ${results.stats.totalBloomerang}`);
        console.log(`Contacts with Fire Numbers: ${results.stats.withFireNumbers}`);
        console.log(`Direct matches (1:1): ${results.stats.directMatched}`);
        console.log(`Multiple matches (1:many): ${results.stats.multipleMatched}`);
        console.log(`No matches: ${results.stats.noMatched}`);

        console.log("\n=== SAMPLE DIRECT MATCHES ===");
        results.directMatches.slice(0, 3).forEach(match => {
            console.log(`Fire# ${match.fireNumber}: ${match.contact.name || 'Unknown'} → ${match.visionRecord.ownerName}`);
        });

        console.log("\n=== SAMPLE MULTIPLE MATCHES (Need Owner Clustering) ===");
        results.multipleMatches.slice(0, 3).forEach(match => {
            console.log(`Fire# ${match.fireNumber}: ${match.contact.name || 'Unknown'} → ${match.visionRecords.length} PIDs`);
            match.visionRecords.forEach(record => {
                console.log(`  PID ${record.pid}: ${record.ownerName}`);
            });
        });

        return results;

    } catch (error) {
        console.error("Error in Fire Number matching:", error);
        throw error;
    }
}

// Test Fire Number Matching with Sample Data
async function testFireNumberMatching() {
    console.log("=== TESTING FIRE NUMBER MATCHING ===");

    // Sample Bloomerang contacts for testing
    const sampleContacts = [
        { name: "John Smith", fireNumber: 148 },
        { name: "Jane Doe", fireNumber: 472 },
        { name: "Test Trust", fireNumber: 1099 },
        { name: "No Match Person", fireNumber: 9999 },
        { name: "No Fire Number Person" }
    ];

    console.log("Testing with sample contacts:", sampleContacts);

    const results = await matchByFireNumber(sampleContacts);

    console.log("\n=== TEST COMPLETE ===");
    console.log("Run matchByFireNumber(yourBloomerangData) with real Bloomerang contacts");

    return results;
}

// Fix Discrepancies: Compare completed_pids.json vs actual uploaded files
async function fixDiscrepancies() {
    console.log("=== STARTING DISCREPANCY FIX ===");

    try {
        // 1. Load what we think was completed
        const completedPids = await loadFromDisk('completed_pids.json') || [];
        console.log(`Found ${completedPids.length} PIDs marked as completed`);

        // 2. Get actual uploaded files using the same pattern as makeOneToOneFile()
        console.log("Fetching actual uploaded files from Google Drive...");
        console.log("Parent folder ID:", parameters.pidFilesParents);

        const uploadedFiles = await getFilesList(parameters.pidFilesParents);
        const actualUploadedPids = uploadedFiles.map(file => file[0]); // file[0] contains the PID
        console.log(`Found ${actualUploadedPids.length} files actually uploaded to Drive`);
        console.log("Sample uploaded PIDs:", actualUploadedPids.slice(0, 10));

        // 3. Find discrepancies - PIDs marked completed but not actually uploaded
        const missingPids = completedPids.filter(pid => !actualUploadedPids.includes(pid));
        console.log(`Found ${missingPids.length} discrepancies (marked complete but not uploaded):`, missingPids);

        if (missingPids.length === 0) {
            console.log("✅ No discrepancies found! All completed PIDs are actually uploaded.");
            return;
        }

        // 4. Retry uploading missing PIDs
        console.log(`Retrying upload for ${missingPids.length} missing PIDs...`);
        await fourthButterClick(missingPids);

        console.log("=== DISCREPANCY FIX COMPLETE ===");

    } catch (error) {
        console.error("Error fixing discrepancies:", error);
    }
}
//        const reqURL = "/Streets.aspx?Letter=B";

// Simple disk save function - saves data to disk via server API
async function saveToDisk(filename, data) {
    console.log(`=== SAVING ${filename} TO DISK ===`);
    try {
        const response = await fetch('http://127.0.0.99:3000/api/save-progress', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: filename,
                data: data
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log(`=== Successfully saved ${filename} to disk ===`);
        return result;
    } catch (error) {
        console.error(`=== ERROR saving ${filename} to disk:`, error, `===`);
        return null;
    }
}

// Load from disk function
async function loadFromDisk(filename) {
    try {
        const response = await fetch(`http://127.0.0.99:3000/api/load-progress?filename=${filename}`);
        if (response.ok) {
            return await response.json();
        }
        return null;
    } catch (error) {
        console.error('Error loading from disk:', error);
        return null;
    }
}


const reqURL = "/Streets.aspx";
//        const reqURL = "/huh";

const parameters = {
    "streetFile": "1lsrd0alv9O01M_qlsiym3cB0TRIdgXI9",
    "parcelDataFile": "1LbdOEWWiW-RO42V2qDy7r5I4e9y58TLW",
    "pidFilesParents": "1qgnE1FW3F6UG7YS4vfGBm9KzX8TDuBCl",
//    "pidFilesParents": "1WS2Uwx3c96X_Kj-LvtQtpzUSAViHaBAG",
//    "pidFilesParents": "15vpT-gCfNzCGDXCBlf82elrZ3Ndt9tpU",
    "errorFile": "1szPM2Kw4ceGCaRlm_SB6_rhNfsety1vJ",
    "legacy": "1f-Ex3PpuddkHKzuJ_yjWJ-8pItnV-ouf",
    "legacyB": "1UqGlYgygQNJJIyo-fkIa2Qa_cxS-Ebv7",
    "lastDone": "1DWLBAoZ4uefp-IAhmOGATPqbOJ6X1UZ9",
    "listOfPIDFileDirFiles": "1dZJPaGTvY-6muO48pp65ilIkXxz486Mo",
    "everyThingWithID": "1ayejMSapX22_1KYZX4jiTGqtCcvnWOtc",
    "everyThingWithIDB": "1V7BOvd84KbiRYeOn6ok_vbL6GTPcfcuN"
}


async function axiosAway(pExtension) {
    let resp = axios.get(pExtension).then(response => {
        console.log("Axios response status:", response.status);
        console.log("Response data length:", response.data.length);
        return response;
    }).catch(error => {
        console.log("Axios error:", error);
        return error;
    });
    //            return resp.json();
    //            let retVal = resp.text()
    return resp;
}

let streetStarts = [];
async function firstButterClick(evt) {
    console.log("First Button clicked!");
    console.log("Making request to:", reqBase + reqURL);
    //                Promise.resolve(uploadWithFetch(passObj, dataPassed)).then((val) => {

    // Try direct fetch instead of axios
    let aaRes = await fetch(reqBase + reqURL).then(response => response.text()).then(data => ({data: data, status: 200}))

    //                let huh = this.document.getElementById("ressieH").innerHTML;
    console.log("Response received:", aaRes.status);
    let captVal = aaRes.data
    let parser = new DOMParser();
    let docCR = parser.parseFromString(captVal, "text/html");
    let buttonMeElements = docCR.getElementsByClassName("buttonMe");
    console.log("Found buttonMe elements:", buttonMeElements.length);
    if (buttonMeElements.length === 0) {
        console.log("No buttonMe elements found. Full response:", captVal.substring(0, 1000));
        return;
    }
    let strBase = buttonMeElements[0].childNodes;
    console.log("Found", strBase.length, "child nodes in buttonMe");
    for (let cB = 0; cB < strBase.length; cB++) {
        let disOne = strBase.item(cB);
        if (disOne.tagName === 'A') {
            let temp = {};
            temp.name = disOne.innerHTML;
            temp.href = disOne.href;
            let levSReqURL = temp.href;
            streetStarts.push(temp);
        }
    }
    console.log("Collected", streetStarts.length, "street starts:", streetStarts);
    let yyy = 5;

};


var streetSave = [];
var streetData = [];
var parcelData = [];

async function secondButterClick() {
    console.log("Second Button clicked!");
    console.log("Processing", streetStarts.length, "street starts");
    const requests = streetStarts.map((streetStart, index) => {
        let disser = streetStart.href;
        let splitRes = disser.split("/");
        let resURLL = splitRes[splitRes.length - 1];
        let fullURL = reqBase + '/' + resURLL;
        console.log("Making request", index + 1, "of", streetStarts.length, "to:", fullURL);
        return axios.get(fullURL);
    });
    let promCapt = await Promise.all(requests);
    console.log("Completed all", streetStarts.length, "requests");

    for (let cD = 0; cD < promCapt.length; cD++) {
        //        this.document.getElementById("ressieH").innerHTML = promCapt[cD].data;
        let captVal = promCapt[cD].data
        let parser = new DOMParser();
        let docCR = parser.parseFromString(captVal, "text/html");


        //            let streets = this.document.getElementsByClassName("fixedButton");
        let streets = docCR.getElementsByClassName("fixedButton")
        for (let cA = 0; cA < streets.length; cA++) {
            let disItem = streets.item(cA);
            let temp = {};
            if (disItem.tagName === "LI") {
                temp.name = disItem.firstChild.innerHTML;
                temp.href = disItem.firstChild.href;
                streetData.push(temp);
            }

        }
    }
    let actStreetNames = streetData.map(ite => Object.values(ite)[0])
    console.log("Collected", streetData.length, "total streets");
    console.log("Updating Google Sheets file with street data...");

    let gone = await updateFile(parameters.streetFile, actStreetNames, true)
    console.log("Second Button completed successfully!");
    /*
        let jarr = JSON.stringify(actStreetNames);
        const urlToGo = window.URL.createObjectURL(new Blob([jarr]));
        const fauxLinkObj = this.document.createElement('a');
        fauxLinkObj.href = urlToGo;
        fauxLinkObj.setAttribute('download', 'streetData.txt');
        document.body.appendChild(fauxLinkObj);
        fauxLinkObj.click();
        */
}

async function firstTwoClick() {
    let firster = await firstButterClick()
    console.log("onedone")
    let seconder = await secondButterClick()
    console.log("twodone")
}

async function firstThreeClick() {
    let firster = await firstButterClick()
    console.log("onedone")
    let seconder = await secondButterClick()
    console.log("twodone")
    let thirder = await thirdButterClick()
    console.log("threedone")

}

async function AllClick() {
    let firster = await firstButterClick()
    console.log("onedone")
    let seconder = await secondButterClick()
    console.log("twodone")
    let thirder = await thirdButterClick()
    console.log("threedone")
    let fourther = await fourthButterClick()
    console.log("fourthDone")

}


async function thirdButterClick() {
    console.log("Third Button clicked!");
    console.log("Processing", streetData.length, "streets for parcel data");
    //            this.document.getElementById("ressieH").innerHTML = streetData.reduce((cug, itg, ing, arrg) => cug += itg.name + ",", "")
    const requestsB = streetData.map((street, index) => {
        let disser = street.href;
        let splitRes = disser.split("/");
        let resURLL = splitRes[splitRes.length - 1];
        let fullURL = reqBase + '/' + resURLL;
        console.log("Fetching parcel data from street", index + 1, "of", streetData.length, ":", street.name);
        return axios.get(fullURL);
    });
    let promCaptB = await Promise.all(requestsB);
    console.log("Completed fetching data from all", streetData.length, "streets");
    for (let cE = 0; cE < promCaptB.length; cE++) {
        let captVal = promCaptB[cE].data
        let parser = new DOMParser();
        let docCR = parser.parseFromString(captVal, "text/html");

        //        this.document.getElementById("ressieH").innerHTML = promCaptB[cE].data;
        let uiWid = docCR.getElementsByClassName("ui-widget");
        if (uiWid.length > 0) {
            let uiWC = docCR.getElementsByClassName("ui-widget").item(0).childNodes;
            if (uiWC.length > 5) {
                let uiLister = uiWC.item(5).childNodes;
                if (uiLister.length > 3) {
                    let addressList = uiLister.item(3).childNodes;
                    for (let cA = 0; cA < addressList.length; cA++) {
                        let disItem = addressList.item(cA);
                        //                                    let temp = {};
                        if (disItem.tagName === "LI") {
                            let hrefT = disItem.firstChild.href;
                            if (hrefT) {
                                if (hrefT.indexOf("Parcel.aspx?pid=") > -1) {
                                    let putter = (new RegExp("pid=(\\d*)")).exec(disItem.firstChild.href)[1];
                                    parcelData.push(putter);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    parcelData = parcelData.filter((item,
        index, arr) => arr.indexOf(item) === index);
    console.log("Found", parcelData.length, "unique parcel IDs");
    console.log("Updating Google Sheets with parcel data...");
    let gone = await updateFile(parameters.parcelDataFile, parcelData, true)

    // Save the SAME parcelData to disk (no fetch needed - we have the data!)
    console.log("Saving parcel data to disk for Go Again functionality...");
    await saveToDisk('original_parcels.json', parcelData);
    await saveToDisk('completed_pids.json', []); // Reset completed list

    console.log("Third Button completed successfully!");
    /*
    let jarr = JSON.stringify(parcelData);
        const urlToGo = window.URL.createObjectURL(new Blob([jarr]));
        const fauxLinkObj = this.document.createElement('a');
        fauxLinkObj.href = urlToGo;
        fauxLinkObj.setAttribute('download', 'parcelData.txt');
        document.body.appendChild(fauxLinkObj);
        fauxLinkObj.click();*/
    //            Parcel.aspx ? pid = 419
}
var errors = [];
var firstError = null; // Track the first error that occurs
async function fourthButterClick(pParcelData) {
    console.log("Fourth Button clicked!");
    let bigFile = []
    let wParcelData = pParcelData || parcelData
    console.log("Processing", wParcelData.length, "parcels for detailed property data");
    let owners = "";

    const BATCH_SIZE = 8; // Process 8 parcels concurrently

    // Process parcels in batches for efficiency
    for (let startIndex = 0; startIndex < wParcelData.length; startIndex += BATCH_SIZE) {
        const endIndex = Math.min(startIndex + BATCH_SIZE, wParcelData.length);
        const batch = wParcelData.slice(startIndex, endIndex);

        console.log(`Processing batch ${Math.floor(startIndex/BATCH_SIZE) + 1} of ${Math.ceil(wParcelData.length/BATCH_SIZE)} (${batch.length} parcels)`);

        // Create promises for this batch
        const batchPromises = batch.map(async (disser, batchIndex) => {
            const cN = startIndex + batchIndex;
            const fullURLX = reqBase + '/Parcel.aspx?pid=' + disser;
            console.log("Fetching property details", cN + 1, "of", wParcelData.length, "- PID:", disser);

            try {
                const response = await fetch(fullURLX);
                let disPlat = await response.text();

                // Clean image URLs
                disPlat = disPlat.replaceAll(/http:\/\/images.vgsi.com\/.+\.jpg/g, "");
                disPlat = disPlat.replaceAll(/http:\/\/images.vgsi.com\/.+\.JPG/g, "");

                // Process HTML data
                const parser = new DOMParser();
                const docCR = parser.parseFromString(disPlat, "text/html");

                const ownName = ((docCR.getElementById("MainContent_lblOwner"))
                    ? docCR.getElementById("MainContent_lblOwner").innerHTML.replaceAll("<br>", "::#^#::").replaceAll("&amp;", "&").replaceAll(",", ":^#^:")
                    : "");
                const cownName = ((docCR.getElementById("MainContent_lblCoOwner"))
                    ? docCR.getElementById("MainContent_lblCoOwner").innerHTML.replaceAll("<br>", "::#^#::").replaceAll("&amp;", "&").replaceAll(",", ":^#^:")
                    : "");
                const addr = ((docCR.getElementById("MainContent_lblAddr1"))
                    ? docCR.getElementById("MainContent_lblAddr1").innerHTML.replaceAll("<br>", "::#^#::").replaceAll("&amp;", "&").replaceAll(",", ":^#^:")
                    : "");
                const location = ((docCR.getElementById("MainContent_lblLocation"))
                    ? docCR.getElementById("MainContent_lblLocation").innerHTML.replaceAll("<br>", "::#^#::").replaceAll(",", ":^#^:")
                    : "");
                const zone = ((docCR.getElementById("MainContent_lblZone"))
                    ? docCR.getElementById("MainContent_lblZone").innerHTML
                    : "");
                const use = ((docCR.getElementById("MainContent_lblUseCode"))
                    ? docCR.getElementById("MainContent_lblUseCode").innerHTML.replaceAll("<br>", "::#^#::")
                    : "");
                const nei = ((docCR.getElementById("MainContent_lblNbhd"))
                    ? docCR.getElementById("MainContent_lblNbhd").innerHTML
                    : "");
                const lastSD = ((docCR.getElementById("MainContent_lblSaleDate"))
                    ? docCR.getElementById("MainContent_lblSaleDate").innerHTML
                    : "");
                const platNumb = ((docCR.getElementById("MainContent_lblMblu"))
                    ? docCR.getElementById("MainContent_lblMblu").innerHTML
                    : "");
                const pid = ((docCR.getElementById("MainContent_lblPid"))
                    ? docCR.getElementById("MainContent_lblPid").innerHTML
                    : "");
                const assessmentValue = ((docCR.getElementById("MainContent_lblGenAssessment"))
                    ? docCR.getElementById("MainContent_lblGenAssessment").innerText.trim()
                    : "");
                const appraisalValue = ((docCR.getElementById("MainContent_lblGenAppraisal"))
                    ? docCR.getElementById("MainContent_lblGenAppraisal").innerText.trim()
                    : "");

                const disOwn = ownName + "," + cownName + "," + addr + "," + location + ',' + zone + ',' + use + ',' + nei + ',' + lastSD + ',' + platNumb + ',' + pid + ',' + assessmentValue + ',' + appraisalValue;

                // Save individual files to Google Drive
                const disOne = await saveAsJSON(disOwn, pid, parameters.pidFilesParents, true);

                // Verify upload was actually successful
                const uploadSuccessful = disOne &&
                                       typeof disOne === 'object' &&
                                       disOne.id &&
                                       typeof disOne.id === 'string' &&
                                       disOne.id.length > 0;

                if (uploadSuccessful) {
                    console.log(`✅ UPLOAD SUCCESS for PID ${disser} - File ID: ${disOne.id}`);
                    await updateFile(parameters.lastDone, pid, true);

                    // Only mark as completed AFTER verified successful upload
                    const completedPids = await loadFromDisk('completed_pids.json') || [];
                    if (!completedPids.includes(disser)) {
                        completedPids.push(disser);
                        await saveToDisk('completed_pids.json', completedPids);
                    }
                } else {
                    console.log(`❌ UPLOAD FAILED for PID ${disser} - Result:`, disOne);
                    errors.push([cN, disser]);
                    await updateFile(parameters.errorFile, errors, true);
                }

                return {
                    success: true,
                    disOwn,
                    fileId: disOne.id,
                    pid: disser
                };

            } catch (error) {
                console.log("Error fetching PID", disser, ":", error);
                errors.push([cN, disser]);
                await updateFile(parameters.errorFile, errors, true);

                // Capture the first error details and save to disk
                if (firstError === null) {
                    firstError = {
                        pid: disser,
                        parcelNumber: cN + 1,
                        url: fullURLX,
                        errorMessage: error.message,
                        errorStack: error.stack,
                        timestamp: new Date().toISOString()
                    };
                    await saveToDisk('first_error.json', firstError);
                    console.log("=== FIRST ERROR SAVED TO DISK ===", firstError);
                }

                return {
                    success: false,
                    pid: disser
                };
            }
        });

        // Wait for batch to complete
        const batchResults = await Promise.all(batchPromises);

        // Process successful results
        for (const result of batchResults) {
            if (result.success) {
                owners += result.disOwn + "\r\n";
                bigFile.push(result.disOwn + "," + result.fileId);
            }
        }

        // Update files after each batch
        await updateFile(
            (((typeof pParcelData === 'undefined') || (pParcelData === null)) ? parameters.everyThingWithID : parameters.everyThingWithIDB),
            bigFile, true
        );
        await updateFile(
            (((typeof pParcelData === 'undefined') || (pParcelData === null)) ? parameters.legacy : parameters.legacyB),
            owners, true
        );

        console.log(`Completed batch ${Math.floor(startIndex/BATCH_SIZE) + 1}. Progress: ${endIndex}/${wParcelData.length} parcels`);
    }

    console.log("Processed all parcels. Errors encountered:", errors.length);
    console.log("Fourth Button completed successfully!");

    if (Array.isArray(pParcelData)) {
        return bigFile;
    }

    /*
        const urlToGoA = window.URL.createObjectURL(new Blob([owners]));
        const fauxLinkObjA = this.document.createElement('a');
        fauxLinkObjA.href = urlToGoA;
        //            let fNam = 'owners' + ('0000' + cOO.toString()).slice(-4) + '.csv'
        fauxLinkObjA.setAttribute('download', 'owners.csv');
        document.body.appendChild(fauxLinkObjA);
        fauxLinkObjA.click();
        let errorStr = JSON.stringify(errors);
        const urlToGoER = window.URL.createObjectURL(new Blob([errorStr], { type: 'application/json' }));
        const fauxLinkObjER = this.document.createElement('a');
        fauxLinkObjER.href = urlToGoER;
        fauxLinkObjER.setAttribute('download', "errors.txt");
        document.body.appendChild(fauxLinkObjER);
        fauxLinkObjER.click();
        */
}

async function test() {
    let res = await fetchTry("/Streets.aspx")
    let xx = 5;
}


