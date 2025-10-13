// Browser-compatible utility functions for post-processing data

// Note: The Node.js file system functions (countRecords, collectAllPidFiles)
// are not available in browser context and should be run server-side

// Node.js functions for analyzing local files (when running server-side)
if (typeof require !== 'undefined') {
    const fs = require('fs');
    const path = require('path');

    // Recreate the countRecords function that was mentioned
    function countRecords(filename) {
        try {
            const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
            return Array.isArray(data) ? data.length : Object.keys(data).length;
        } catch (error) {
            console.error(`Error reading ${filename}:`, error.message);
            return 0;
        }
    }

    // Analyze the everyThingWithPid.json files
    function analyzeEveryThingFiles() {
        const resultsDir = './servers/Results';
        const files = ['everyThingWithPid.json', 'everyThingWithPidB.json'];

        console.log('=== ANALYZING EVERYTHINGWITHPID FILES ===\n');

        files.forEach(filename => {
            const filepath = path.join(resultsDir, filename);

            if (!fs.existsSync(filepath)) {
                console.log(`❌ ${filename}: File not found`);
                return;
            }

            console.log(`📁 Analyzing: ${filename}`);
            console.log(`   Path: ${filepath}`);

            try {
                const content = fs.readFileSync(filepath, 'utf8');
                const data = JSON.parse(content);

                console.log(`   File size: ${content.length} bytes`);
                console.log(`   Record count: ${Array.isArray(data) ? data.length : Object.keys(data).length}`);
                console.log(`   Data type: ${Array.isArray(data) ? 'Array' : typeof data}`);

                if (Array.isArray(data)) {
                    console.log(`   First record preview: ${JSON.stringify(data[0] || 'N/A').substring(0, 100)}...`);
                    console.log(`   Last record preview: ${JSON.stringify(data[data.length - 1] || 'N/A').substring(0, 100)}...`);

                    // Analyze structure of first few records
                    if (data.length > 0) {
                        const sample = data.slice(0, 5);
                        console.log(`   Sample record structures:`);
                        sample.forEach((record, index) => {
                            if (typeof record === 'string') {
                                const parts = record.split(',');
                                console.log(`     Record ${index}: ${parts.length} comma-separated fields`);
                            } else if (typeof record === 'object') {
                                console.log(`     Record ${index}: Object with keys: ${Object.keys(record).join(', ')}`);
                            } else {
                                console.log(`     Record ${index}: ${typeof record}`);
                            }
                        });
                    }
                }

            } catch (error) {
                console.log(`   ❌ Error reading file: ${error.message}`);
            }

            console.log('');
        });

        console.log('=== ANALYSIS COMPLETE ===');
    }

    // Export for Node.js usage
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            countRecords,
            analyzeEveryThingFiles
        };
    }
}

/*
================================================================================
GOOGLE DRIVE FILE MERGE AND DEDUPLICATION ANALYSIS SUITE
================================================================================

This collection of functions provides comprehensive tools for merging, analyzing,
and deduplicating the everyThingWithID files from Google Drive parameters.

FUNCTIONS INCLUDED:

1. analyzeEveryThingFilesFromDrive()
   - PURPOSE: Analyze Google Drive versions of everyThingWithID files
   - KEYWORDS: analyze, google drive, everyThingWithID, file analysis, drive API
   - FUNCTIONALITY: Downloads and examines both everyThingWithID files from Drive

2. findDuplicatesInMergedFile()
   - PURPOSE: Find duplicate records in merged everyThingWithID file
   - KEYWORDS: duplicates, find duplicates, merged file, PID comparison
   - FUNCTIONALITY: Identifies duplicates by comparing all fields except file ID

3. mergeAndFindDuplicates()
   - PURPOSE: Complete workflow to merge files and analyze duplicates
   - KEYWORDS: merge, find duplicates, workflow, complete analysis
   - FUNCTIONALITY: Runs mergeTheTwo() then analyzes the result for duplicates

4. checkFileExistsAndNotTrashed() [HELPER]
   - PURPOSE: Check if Google Drive file exists and is not in trash
   - KEYWORDS: file exists, trash check, google drive validation
   - FUNCTIONALITY: Validates Google Drive file IDs for deduplication logic

5. removeDuplicatesFromMergedFile()
   - PURPOSE: Remove duplicates from merged file using advanced logic
   - KEYWORDS: remove duplicates, deduplication, clean data, file ID logic
   - FUNCTIONALITY: Removes duplicates based on blank fields and file existence

6. checkUndefinedFileIDs()
   - PURPOSE: Analyze how many records have undefined/blank file IDs
   - KEYWORDS: undefined file IDs, blank files, data quality, file ID analysis
   - FUNCTIONALITY: Reports on data quality after deduplication

USAGE WORKFLOW:
- Run analyzeEveryThingFilesFromDrive() to see current state
- Run mergeAndFindDuplicates() to merge and identify issues
- Run removeDuplicatesFromMergedFile() to clean the data
- Run checkUndefinedFileIDs() to verify final data quality

================================================================================
*/

// Google Drive file analysis - analyzes both everyThingWithID files from Drive
// Keywords: analyze google drive files, everyThingWithID, drive API, file analysis
async function analyzeEveryThingFilesFromDrive() {
    console.log('=== ANALYZING EVERYTHINGWITHID FILES FROM GOOGLE DRIVE ===\n');

    try {
        // Use the exact same pattern as mergeTheTwo() function
        console.log('📁 Fetching everyThingWithID from Google Drive...');
        let fc = await getFileContentsAPI(parameters.everyThingWithID);
        let fileToUpdate = JSON.parse(fc.body);

        console.log('📁 Fetching everyThingWithIDB from Google Drive...');
        let fcB = await getFileContentsAPI(parameters.everyThingWithIDB);
        let fileToUpdateB = JSON.parse(fcB.body);

        console.log('\n=== ANALYSIS RESULTS ===');

        console.log(`📊 everyThingWithID (${parameters.everyThingWithID}):`);
        console.log(`   Record count: ${Array.isArray(fileToUpdate) ? fileToUpdate.length : Object.keys(fileToUpdate).length}`);
        console.log(`   Data type: ${Array.isArray(fileToUpdate) ? 'Array' : typeof fileToUpdate}`);
        console.log(`   Raw data size: ${fc.body.length} characters`);

        if (Array.isArray(fileToUpdate) && fileToUpdate.length > 0) {
            console.log(`   First record preview: ${JSON.stringify(fileToUpdate[0]).substring(0, 100)}...`);
            console.log(`   Last record preview: ${JSON.stringify(fileToUpdate[fileToUpdate.length - 1]).substring(0, 100)}...`);
        }

        console.log(`\n📊 everyThingWithIDB (${parameters.everyThingWithIDB}):`);
        console.log(`   Record count: ${Array.isArray(fileToUpdateB) ? fileToUpdateB.length : Object.keys(fileToUpdateB).length}`);
        console.log(`   Data type: ${Array.isArray(fileToUpdateB) ? 'Array' : typeof fileToUpdateB}`);
        console.log(`   Raw data size: ${fcB.body.length} characters`);

        if (Array.isArray(fileToUpdateB) && fileToUpdateB.length > 0) {
            console.log(`   First record preview: ${JSON.stringify(fileToUpdateB[0]).substring(0, 100)}...`);
            console.log(`   Last record preview: ${JSON.stringify(fileToUpdateB[fileToUpdateB.length - 1]).substring(0, 100)}...`);
        }

        const totalRecords = (Array.isArray(fileToUpdate) ? fileToUpdate.length : 0) +
                           (Array.isArray(fileToUpdateB) ? fileToUpdateB.length : 0);

        console.log(`\n📈 COMBINED TOTALS:`);
        console.log(`   Total records across both files: ${totalRecords}`);

        return {
            everyThingWithID: {
                count: Array.isArray(fileToUpdate) ? fileToUpdate.length : 0,
                data: fileToUpdate
            },
            everyThingWithIDB: {
                count: Array.isArray(fileToUpdateB) ? fileToUpdateB.length : 0,
                data: fileToUpdateB
            },
            totalRecords: totalRecords
        };

    } catch (error) {
        console.error('❌ Error analyzing Google Drive files:', error.message);
        return null;
    }
}

// Duplicate detection - finds duplicate records in merged everyThingWithID file
// Keywords: find duplicates, duplicate detection, merged file, PID comparison, record analysis
async function findDuplicatesInMergedFile() {
    console.log('=== FINDING DUPLICATES IN MERGED FILE ===\n');

    try {
        // Get the merged file (should be in everyThingWithID after mergeTheTwo())
        console.log('📁 Fetching merged everyThingWithID from Google Drive...');
        let fc = await getFileContentsAPI(parameters.everyThingWithID);
        let records = JSON.parse(fc.body);

        if (!Array.isArray(records)) {
            console.error('❌ Expected array of records, got:', typeof records);
            return null;
        }

        console.log(`📊 Analyzing ${records.length} records for duplicates...`);

        // Parse each record and extract fields
        const parsedRecords = records.map((record, index) => {
            if (typeof record === 'string') {
                const fields = record.split(',');
                return {
                    originalIndex: index,
                    fields: fields,
                    pid: fields[fields.length - 2] || '', // Second-to-last field (PID)
                    lastField: fields[fields.length - 1] || '', // Last field (file ID)
                    recordWithoutLastField: fields.slice(0, -1).join(',') // All fields except last
                };
            }
            return null;
        }).filter(r => r !== null);

        console.log(`📊 Successfully parsed ${parsedRecords.length} records`);

        // Group by PID (second-to-last field)
        const pidGroups = {};
        parsedRecords.forEach(record => {
            const pid = record.pid;
            if (!pidGroups[pid]) {
                pidGroups[pid] = [];
            }
            pidGroups[pid].push(record);
        });

        // Find PIDs with multiple records
        const potentialDuplicates = Object.entries(pidGroups)
            .filter(([pid, records]) => records.length > 1)
            .map(([pid, records]) => ({ pid, records }));

        console.log(`🔍 Found ${potentialDuplicates.length} PIDs with multiple records`);

        const duplicates = [];
        let totalDuplicateRecords = 0;

        // For each PID with multiple records, compare the records (excluding last field)
        potentialDuplicates.forEach(({ pid, records }) => {
            console.log(`\n🔎 Checking PID: ${pid} (${records.length} records)`);

            // Group by record content (excluding last field)
            const contentGroups = {};
            records.forEach(record => {
                const content = record.recordWithoutLastField;
                if (!contentGroups[content]) {
                    contentGroups[content] = [];
                }
                contentGroups[content].push(record);
            });

            // Find content groups with multiple records (true duplicates)
            Object.entries(contentGroups).forEach(([content, matchingRecords]) => {
                if (matchingRecords.length > 1) {
                    console.log(`   ✅ DUPLICATE FOUND: ${matchingRecords.length} identical records`);
                    console.log(`      Content preview: ${content.substring(0, 100)}...`);
                    console.log(`      Different file IDs: ${matchingRecords.map(r => r.lastField).join(', ')}`);

                    duplicates.push({
                        pid: pid,
                        content: content,
                        count: matchingRecords.length,
                        records: matchingRecords
                    });

                    totalDuplicateRecords += matchingRecords.length;
                }
            });
        });

        console.log(`\n📈 DUPLICATE ANALYSIS SUMMARY:`);
        console.log(`   Total records analyzed: ${records.length}`);
        console.log(`   PIDs with multiple records: ${potentialDuplicates.length}`);
        console.log(`   True duplicate groups found: ${duplicates.length}`);
        console.log(`   Total duplicate records: ${totalDuplicateRecords}`);
        console.log(`   Unique records: ${records.length - totalDuplicateRecords + duplicates.length}`);

        if (duplicates.length > 0) {
            console.log(`\n📋 DETAILED DUPLICATE REPORT:`);
            duplicates.forEach((dup, index) => {
                console.log(`   ${index + 1}. PID ${dup.pid}: ${dup.count} identical records`);
            });
        }

        return {
            totalRecords: records.length,
            duplicateGroups: duplicates,
            totalDuplicateRecords: totalDuplicateRecords,
            uniqueRecords: records.length - totalDuplicateRecords + duplicates.length
        };

    } catch (error) {
        console.error('❌ Error finding duplicates:', error.message);
        return null;
    }
}

// Complete merge and analysis workflow - runs mergeTheTwo() then analyzes duplicates
// Keywords: merge and find duplicates, complete workflow, merge analysis, full process
async function mergeAndFindDuplicates() {
    console.log('=== MERGE THE TWO FILES AND FIND DUPLICATES ===\n');

    try {
        console.log('🔄 Step 1: Running mergeTheTwo()...');
        await mergeTheTwo();

        console.log('✅ Merge completed successfully\n');

        console.log('🔄 Step 2: Analyzing merged file for duplicates...');
        const duplicateResults = await findDuplicatesInMergedFile();

        if (duplicateResults) {
            console.log('\n🎉 Process completed successfully!');
            return duplicateResults;
        } else {
            console.log('\n❌ Duplicate analysis failed');
            return null;
        }

    } catch (error) {
        console.error('❌ Error in mergeAndFindDuplicates:', error.message);
        return null;
    }
}

// Google Drive file validation helper - checks if file exists and is not in trash
// Keywords: file exists, trash check, google drive validation, file ID verification
async function checkFileExistsAndNotTrashed(fileId) {
    if (!fileId || fileId.trim() === '') {
        return false;
    }

    try {
        let accessToken = gapi.auth.getToken().access_token;
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,trashed`, {
            method: 'GET',
            headers: new Headers({ 'Authorization': 'Bearer ' + accessToken })
        });

        if (!response.ok) {
            return false; // File doesn't exist or can't be accessed
        }

        const fileInfo = await response.json();
        return !fileInfo.trashed; // Return true if file exists and is not trashed

    } catch (error) {
        console.log(`   Warning: Could not check file ${fileId}: ${error.message}`);
        return false;
    }
}

// Advanced duplicate removal - removes duplicates using sophisticated file ID logic
// Keywords: remove duplicates, deduplication, clean data, advanced logic, file ID processing
async function removeDuplicatesFromMergedFile() {
    console.log('=== REMOVING DUPLICATES FROM MERGED FILE ===\n');

    try {
        // Get the merged file
        console.log('📁 Fetching merged everyThingWithID from Google Drive...');
        let fc = await getFileContentsAPI(parameters.everyThingWithID);
        let records = JSON.parse(fc.body);

        if (!Array.isArray(records)) {
            console.error('❌ Expected array of records, got:', typeof records);
            return null;
        }

        console.log(`📊 Starting with ${records.length} records`);

        // Parse each record and extract fields
        const parsedRecords = records.map((record, index) => {
            if (typeof record === 'string') {
                const fields = record.split(',');
                return {
                    originalIndex: index,
                    originalRecord: record,
                    fields: fields,
                    pid: fields[fields.length - 2] || '', // Second-to-last field (PID)
                    lastField: fields[fields.length - 1] || '', // Last field (file ID)
                    recordWithoutLastField: fields.slice(0, -1).join(',') // All fields except last
                };
            }
            return null;
        }).filter(r => r !== null);

        console.log(`📊 Successfully parsed ${parsedRecords.length} records`);

        // Group records by content (excluding last field)
        const recordGroups = {};
        parsedRecords.forEach(record => {
            const key = record.recordWithoutLastField;
            if (!recordGroups[key]) {
                recordGroups[key] = [];
            }
            recordGroups[key].push(record);
        });

        // Process duplicates and keep records to preserve
        const recordsToKeep = [];
        let duplicatesRemoved = 0;

        for (const [key, groupRecords] of Object.entries(recordGroups)) {
            if (groupRecords.length === 1) {
                // No duplicates, keep the record
                recordsToKeep.push(groupRecords[0]);
                continue;
            }

            // Handle duplicates
            console.log(`\n🔍 Processing ${groupRecords.length} duplicate records for PID ${groupRecords[0].pid}`);

            if (groupRecords.length === 2) {
                const [record1, record2] = groupRecords;

                // Check if both last fields are identical (complete duplicates)
                if (record1.lastField === record2.lastField) {
                    console.log(`   Complete duplicates: keeping first, removing second`);
                    recordsToKeep.push(record1);
                    duplicatesRemoved += 1;
                    continue;
                }

                // Check for blank/undefined last fields
                const record1HasBlankLastField = !record1.lastField || record1.lastField.trim() === '';
                const record2HasBlankLastField = !record2.lastField || record2.lastField.trim() === '';

                if (record1HasBlankLastField && !record2HasBlankLastField) {
                    console.log(`   Record 1 has blank file ID, keeping record 2`);
                    recordsToKeep.push(record2);
                    duplicatesRemoved += 1;
                    continue;
                } else if (!record1HasBlankLastField && record2HasBlankLastField) {
                    console.log(`   Record 2 has blank file ID, keeping record 1`);
                    recordsToKeep.push(record1);
                    duplicatesRemoved += 1;
                    continue;
                }

                // Both have non-blank file IDs, check if files exist in Google Drive
                if (!record1HasBlankLastField && !record2HasBlankLastField) {
                    console.log(`   Both have file IDs, checking Google Drive...`);
                    const file1Exists = await checkFileExistsAndNotTrashed(record1.lastField);
                    const file2Exists = await checkFileExistsAndNotTrashed(record2.lastField);

                    if (file1Exists && file2Exists) {
                        console.log(`   Both files exist: keeping second, removing first`);
                        recordsToKeep.push(record2);
                        duplicatesRemoved += 1;
                    } else if (file1Exists && !file2Exists) {
                        console.log(`   Only file 1 exists: keeping record 1`);
                        recordsToKeep.push(record1);
                        duplicatesRemoved += 1;
                    } else if (!file1Exists && file2Exists) {
                        console.log(`   Only file 2 exists: keeping record 2`);
                        recordsToKeep.push(record2);
                        duplicatesRemoved += 1;
                    } else {
                        console.log(`   Neither file exists: keeping first record by default`);
                        recordsToKeep.push(record1);
                        duplicatesRemoved += 1;
                    }
                    continue;
                }

                // If both have blank last fields, keep first
                console.log(`   Both have blank file IDs: keeping first`);
                recordsToKeep.push(record1);
                duplicatesRemoved += 1;

            } else {
                // More than 2 duplicates - apply logic pairwise or use simplified approach
                console.log(`   ${groupRecords.length} duplicates found: using simplified first-wins approach`);
                recordsToKeep.push(groupRecords[0]);
                duplicatesRemoved += groupRecords.length - 1;
            }
        }

        // Convert back to original string format
        const deduplicatedRecords = recordsToKeep.map(record => record.originalRecord);

        // Update the Google Drive file with deduplicated records
        console.log('\n💾 Saving deduplicated records to Google Drive...');
        await updateFile(parameters.everyThingWithID, deduplicatedRecords, true);
        console.log('✅ Successfully saved deduplicated file to Google Drive');

        // Final summary table
        console.log('\n' + '='.repeat(50));
        console.log('📊 FINAL DEDUPLICATION SUMMARY TABLE');
        console.log('='.repeat(50));
        console.log(`Initial Records:     ${records.length.toString().padStart(8)}`);
        console.log(`Duplicates Removed:  ${duplicatesRemoved.toString().padStart(8)}`);
        console.log(`Final Records:       ${deduplicatedRecords.length.toString().padStart(8)}`);
        console.log('='.repeat(50));
        console.log(`Records Saved:       ${((deduplicatedRecords.length / records.length) * 100).toFixed(1)}%`);
        console.log(`Space Reduction:     ${((duplicatesRemoved / records.length) * 100).toFixed(1)}%`);
        console.log('='.repeat(50));

        return {
            originalCount: records.length,
            duplicatesRemoved: duplicatesRemoved,
            finalCount: deduplicatedRecords.length
        };

    } catch (error) {
        console.error('❌ Error removing duplicates:', error.message);
        return null;
    }
}

// Data quality analysis - checks for undefined/blank file IDs in records
// Keywords: undefined file IDs, blank files, data quality, file ID analysis, quality check
async function checkUndefinedFileIDs() {
    console.log('=== CHECKING FOR UNDEFINED/BLANK FILE IDs ===\n');

    try {
        // Get the current file
        console.log('📁 Fetching current everyThingWithID from Google Drive...');
        let fc = await getFileContentsAPI(parameters.everyThingWithID);
        let records = JSON.parse(fc.body);

        if (!Array.isArray(records)) {
            console.error('❌ Expected array of records, got:', typeof records);
            return null;
        }

        console.log(`📊 Analyzing ${records.length} records for undefined file IDs...`);

        // Check each record for undefined/blank file IDs
        const undefinedRecords = records.filter((record, index) => {
            if (typeof record === 'string') {
                const fields = record.split(',');
                const lastField = fields[fields.length - 1] || '';
                return !lastField || lastField.trim() === '' || lastField === 'undefined';
            }
            return false;
        });

        const validRecords = records.length - undefinedRecords.length;

        console.log('\n' + '='.repeat(50));
        console.log('📊 FILE ID ANALYSIS SUMMARY');
        console.log('='.repeat(50));
        console.log(`Total Records:            ${records.length.toString().padStart(8)}`);
        console.log(`Records with Valid IDs:   ${validRecords.toString().padStart(8)}`);
        console.log(`Records with Blank IDs:   ${undefinedRecords.length.toString().padStart(8)}`);
        console.log('='.repeat(50));
        console.log(`Valid File IDs:           ${((validRecords / records.length) * 100).toFixed(1)}%`);
        console.log(`Blank File IDs:           ${((undefinedRecords.length / records.length) * 100).toFixed(1)}%`);
        console.log('='.repeat(50));

        if (undefinedRecords.length > 0) {
            console.log('\n📋 SAMPLE RECORDS WITH BLANK FILE IDs:');
            undefinedRecords.slice(0, 5).forEach((record, index) => {
                const fields = record.split(',');
                const pid = fields[fields.length - 2] || 'Unknown PID';
                console.log(`   ${index + 1}. PID ${pid}: "${record.substring(0, 80)}..."`);
            });
            if (undefinedRecords.length > 5) {
                console.log(`   ... and ${undefinedRecords.length - 5} more records with blank file IDs`);
            }
        }

        return {
            totalRecords: records.length,
            validFileIDs: validRecords,
            blankFileIDs: undefinedRecords.length,
            blankRecords: undefinedRecords
        };

    } catch (error) {
        console.error('❌ Error checking undefined file IDs:', error.message);
        return null;
    }
}

/*
================================================================================
END OF GOOGLE DRIVE FILE MERGE AND DEDUPLICATION ANALYSIS SUITE
================================================================================
The above collection of functions provides complete merge and deduplication
capabilities for everyThingWithID Google Drive files. All functions are
browser-compatible and use the same Google Drive API patterns as the existing
working codebase (getFileContentsAPI, updateFile, etc.).
================================================================================
*/

// Function to inspect Google Drive files/folders from parameters object
async function inspectParameters() {
    console.log("=== INSPECTING PARAMETERS GOOGLE DRIVE FILES ===");

    const results = {};

    for (const [paramName, driveId] of Object.entries(parameters)) {
        console.log(`\n--- Inspecting ${paramName}: ${driveId} ---`);

        try {
            // Use the same fetch pattern as your existing code in fileLogistics.js
            let accessToken = gapi.auth.getToken().access_token;
            if (!accessToken) {
                throw new Error('No access token available. Please authorize first.');
            }

            // Get file metadata using direct fetch like getFileContentsAPI does
            const metadataResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${driveId}?fields=id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink`, {
                method: 'GET',
                headers: new Headers({ 'Authorization': 'Bearer ' + accessToken })
            });

            if (!metadataResponse.ok) {
                throw new Error(`HTTP ${metadataResponse.status}: ${metadataResponse.statusText}`);
            }

            const fileInfo = { result: await metadataResponse.json() };

            if (fileInfo && fileInfo.result) {
                const file = fileInfo.result;
                const isFolder = file.mimeType === 'application/vnd.google-apps.folder';

                results[paramName] = {
                    driveId: driveId,
                    name: file.name,
                    mimeType: file.mimeType,
                    size: file.size || 'N/A (folder)',
                    createdTime: file.createdTime,
                    modifiedTime: file.modifiedTime,
                    parents: file.parents,
                    isFolder: isFolder,
                    webViewLink: file.webViewLink
                };

                // Get full directory path by walking up parent chain
                let directoryPath = '';
                try {
                    directoryPath = await buildDirectoryPath(driveId, accessToken);
                } catch (pathError) {
                    console.log(`   ⚠️  Could not build directory path: ${pathError.message}`);
                    directoryPath = 'Unknown path';
                }
                results[paramName].directoryPath = directoryPath;

                console.log(`✅ ${paramName}:`);
                console.log(`   Name: ${file.name}`);
                console.log(`   Path: ${directoryPath}`);
                console.log(`   Type: ${file.mimeType}`);
                console.log(`   Size: ${file.size || 'N/A (folder)'}`);
                console.log(`   Created: ${file.createdTime}`);
                console.log(`   Modified: ${file.modifiedTime}`);
                console.log(`   Is Folder: ${isFolder}`);

                // If it's a folder, list its contents using the same getFilesList function that works
                if (isFolder) {
                    console.log(`   Checking folder contents...`);
                    try {
                        const files = await getFilesList(driveId);
                        console.log(`   Contains ${files.length} items`);
                        results[paramName].folderContents = files.length;
                        results[paramName].folderFiles = files;

                        // Show first few items as sample
                        if (files.length > 0) {
                            console.log(`   Sample contents:`);
                            files.slice(0, 5).forEach((item, index) => {
                                // item structure: [filename, fileId] based on your existing code
                                console.log(`     ${index + 1}. ${item[0] || item.name || 'Unknown'}`);
                            });
                            if (files.length > 5) {
                                console.log(`     ... and ${files.length - 5} more items`);
                            }
                        }
                    } catch (folderError) {
                        console.log(`   ⚠️  Could not list folder contents: ${folderError.message}`);
                        results[paramName].folderError = folderError.message;
                    }
                } else {
                    // For files, try to get a sample of the content using your existing getFileContentsAPI
                    console.log(`   Attempting to preview file contents...`);
                    try {
                        const contentResponse = await getFileContentsAPI(driveId);
                        if (contentResponse && contentResponse.body) {
                            const content = contentResponse.body;
                            const preview = content.substring(0, 200);
                            console.log(`   Content preview: ${preview}${content.length > 200 ? '...' : ''}`);
                            results[paramName].contentLength = content.length;
                            results[paramName].contentPreview = preview;
                        }
                    } catch (contentError) {
                        console.log(`   ⚠️  Could not read file contents: ${contentError.message}`);
                        results[paramName].contentError = contentError.message;
                    }
                }

            } else {
                results[paramName] = {
                    driveId: driveId,
                    error: 'Could not retrieve file properties - empty response'
                };
                console.log(`❌ ${paramName}: Could not retrieve properties - empty response`);
            }

        } catch (error) {
            results[paramName] = {
                driveId: driveId,
                error: error.message
            };
            console.log(`❌ ${paramName}: Error - ${error.message}`);
        }
    }

    console.log("\n=== INSPECTION COMPLETE ===");
    console.log("Summary of all parameters:");

    for (const [paramName, info] of Object.entries(results)) {
        if (info.error) {
            console.log(`${paramName}: ERROR - ${info.error}`);
        } else {
            const type = info.isFolder ? `Folder (${info.folderContents} items)` : 'File';
            console.log(`${paramName}: ${info.name} (${type})`);
        }
    }

    return results;
}

// Helper function to build full directory path by walking up parent chain
async function buildDirectoryPath(fileId, accessToken) {
    const pathSegments = [];
    let currentId = fileId;
    const maxDepth = 10; // Prevent infinite loops
    let depth = 0;

    while (currentId && depth < maxDepth) {
        try {
            // Get current file/folder info
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${currentId}?fields=id,name,parents`, {
                method: 'GET',
                headers: new Headers({ 'Authorization': 'Bearer ' + accessToken })
            });

            if (!response.ok) {
                break;
            }

            const fileInfo = await response.json();
            pathSegments.unshift(fileInfo.name); // Add to beginning of array

            // Move to parent
            if (fileInfo.parents && fileInfo.parents.length > 0) {
                currentId = fileInfo.parents[0];
            } else {
                // No more parents - we've reached the root
                break;
            }

            depth++;
        } catch (error) {
            console.log(`   Warning: Could not get parent info for ${currentId}: ${error.message}`);
            break;
        }
    }

    // Build path string
    if (pathSegments.length === 0) {
        return '/';
    } else if (pathSegments[0] === 'My Drive' || pathSegments[0] === 'Google Drive') {
        // Start from root
        return '/' + pathSegments.slice(1).join('/');
    } else {
        return '/' + pathSegments.join('/');
    }
}

// Console command to run the inspection
console.log("To inspect parameters, run: inspectParameters()");

// Browser environment - functions are available globally