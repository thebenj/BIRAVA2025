// cleanup.js
// Base data cleanup utilities - separate from main CLAUDE.md plan
// This file contains cleanup functions for data quality issues

// Critical Google Drive data identifiers for cleanup
// NOTE: PIDS_FOLDER.id now reads from parameters.pidFilesParents (defined in baseCode.js)
// This ensures all code uses the same PID folder source
const CLEANUP_DATA_SOURCES = {
    PROCESSED_DATA: {
        name: "VisionAppraisal_ProcessedData.json",
        id: "1oIW1m1Qw2lyreU-uGMX3jUka9LwaBTAf"
    },
    get PIDS_FOLDER() {
        return {
            name: "pids",
            id: parameters.pidFilesParents  // Single source of truth from baseCode.js
        };
    },
    DUPLICATES_FOLDER: {
        name: "duplicates",
        id: "1UOIQ1_2TcAldgA-d8GqBel3csnzyqFwy"
    }
};

// Google Drive utility functions for deduplication
async function listFolderFiles(folderId, includeCreationDate = true) {
    const files = [];
    let nextPageToken = '';

    do {
        try {
            const fields = includeCreationDate
                ? 'nextPageToken, files(id, name, createdTime, parents)'
                : 'nextPageToken, files(id, name, parents)';

            const response = await gapi.client.drive.files.list({
                pageSize: 1000,
                pageToken: nextPageToken || '',
                fields: fields,
                q: `'${folderId}' in parents`
            });

            const pageFiles = response.result.files || [];
            files.push(...pageFiles);
            nextPageToken = response.result.nextPageToken;

        } catch (error) {
            console.error('Error listing folder files:', error);
            break;
        }
    } while (nextPageToken);

    return files;
}

async function moveFileToFolder(fileId, destinationFolderId, sourceFolderId) {
    try {
        // First get current parents
        const fileResponse = await gapi.client.drive.files.get({
            fileId: fileId,
            fields: 'parents'
        });

        const previousParents = fileResponse.result.parents.join(',');

        // Update file to move to new folder
        const response = await gapi.client.drive.files.update({
            fileId: fileId,
            addParents: destinationFolderId,
            removeParents: previousParents
        });

        return response.result;
    } catch (error) {
        console.error(`Error moving file ${fileId}:`, error);
        throw error;
    }
}

function identifyDuplicates(files) {
    const nameGroups = {};

    // Group files by name
    files.forEach(file => {
        if (!nameGroups[file.name]) {
            nameGroups[file.name] = [];
        }
        nameGroups[file.name].push(file);
    });

    // Find duplicates (groups with more than 1 file)
    const duplicates = {};
    Object.keys(nameGroups).forEach(name => {
        if (nameGroups[name].length > 1) {
            // Sort by creation date, newest first
            nameGroups[name].sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));
            duplicates[name] = nameGroups[name];
        }
    });

    return duplicates;
}

function generateDuplicationReport(duplicates) {
    let totalDuplicates = 0;
    let oldFilesToMove = [];

    Object.keys(duplicates).forEach(name => {
        const group = duplicates[name];
        console.log(`\nDuplicate group: ${name}`);
        console.log(`Total files: ${group.length}`);

        group.forEach((file, index) => {
            const status = index === 0 ? 'KEEP (newest)' : 'MOVE (older)';
            console.log(`  ${file.id} - ${file.createdTime} - ${status}`);

            if (index > 0) {
                oldFilesToMove.push(file);
                totalDuplicates++;
            }
        });
    });

    console.log(`\nSummary:`);
    console.log(`Total duplicate files to move: ${totalDuplicates}`);
    console.log(`Total unique file names with duplicates: ${Object.keys(duplicates).length}`);

    return oldFilesToMove;
}

// Main deduplication workflow functions
async function analyzePIDFolder() {
    console.log('=== ANALYZING PID FOLDER FOR DUPLICATES ===');
    console.log(`Folder ID: ${CLEANUP_DATA_SOURCES.PIDS_FOLDER.id}`);

    try {
        const files = await listFolderFiles(CLEANUP_DATA_SOURCES.PIDS_FOLDER.id, true);
        console.log(`Total files in PID folder: ${files.length}`);

        const duplicates = identifyDuplicates(files);
        const filesToMove = generateDuplicationReport(duplicates);

        console.log(`\n=== ANALYSIS COMPLETE ===`);
        console.log(`Current file count: ${files.length}`);
        console.log(`Files to move: ${filesToMove.length}`);
        console.log(`Final expected count: ${files.length - filesToMove.length}`);

        return { files, duplicates, filesToMove };
    } catch (error) {
        console.error('Error analyzing PID folder:', error);
        throw error;
    }
}

async function executeDuplicationCleanup(filesToMove) {
    console.log('=== EXECUTING DUPLICATION CLEANUP ===');
    console.log(`Moving ${filesToMove.length} duplicate files to duplicates folder...`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < filesToMove.length; i++) {
        const file = filesToMove[i];
        try {
            console.log(`Moving ${i + 1}/${filesToMove.length}: ${file.name}`);
            await moveFileToFolder(
                file.id,
                CLEANUP_DATA_SOURCES.DUPLICATES_FOLDER.id,
                CLEANUP_DATA_SOURCES.PIDS_FOLDER.id
            );
            successCount++;

            // Small delay to avoid rate limiting
            if (i % 10 === 0 && i > 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        } catch (error) {
            console.error(`Failed to move ${file.name}:`, error);
            errorCount++;
            errors.push({ file: file.name, error: error.message });
        }
    }

    console.log(`\n=== CLEANUP COMPLETE ===`);
    console.log(`Successfully moved: ${successCount} files`);
    console.log(`Errors: ${errorCount} files`);

    if (errors.length > 0) {
        console.log('\nErrors encountered:');
        errors.forEach(err => console.log(`  ${err.file}: ${err.error}`));
    }

    return { successCount, errorCount, errors };
}

async function validateFinalCount() {
    console.log('=== VALIDATING FINAL COUNT ===');

    try {
        const pidsFiles = await listFolderFiles(CLEANUP_DATA_SOURCES.PIDS_FOLDER.id, false);
        const duplicatesFiles = await listFolderFiles(CLEANUP_DATA_SOURCES.DUPLICATES_FOLDER.id, false);

        console.log(`Current PID folder count: ${pidsFiles.length}`);
        console.log(`Duplicates folder count: ${duplicatesFiles.length}`);
        console.log(`Total files: ${pidsFiles.length + duplicatesFiles.length}`);

        const expectedCount = 2317;
        const isCorrect = pidsFiles.length === expectedCount;

        console.log(`Expected final count: ${expectedCount}`);
        console.log(`Actual final count: ${pidsFiles.length}`);
        console.log(`Status: ${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);

        return {
            pidsCount: pidsFiles.length,
            duplicatesCount: duplicatesFiles.length,
            isCorrect,
            expectedCount
        };
    } catch (error) {
        console.error('Error validating final count:', error);
        throw error;
    }
}

// Master function to run complete deduplication process
async function runPIDDeduplication() {
    console.log('=== STARTING PID FOLDER DEDUPLICATION ===\n');

    try {
        // Step 1: Analyze
        const analysis = await analyzePIDFolder();

        // Step 2: Confirm before proceeding
        const proceed = confirm(
            `Found ${analysis.filesToMove.length} duplicate files to move.\n` +
            `This will reduce the folder from ${analysis.files.length} to ${analysis.files.length - analysis.filesToMove.length} files.\n\n` +
            `Do you want to proceed with moving duplicates?`
        );

        if (!proceed) {
            console.log('Operation cancelled by user.');
            return;
        }

        // Step 3: Execute cleanup
        const cleanup = await executeDuplicationCleanup(analysis.filesToMove);

        // Step 4: Validate
        const validation = await validateFinalCount();

        console.log('\n=== DEDUPLICATION SUMMARY ===');
        console.log(`Files moved: ${cleanup.successCount}`);
        console.log(`Errors: ${cleanup.errorCount}`);
        console.log(`Final PID count: ${validation.pidsCount} (expected: ${validation.expectedCount})`);
        console.log(`Status: ${validation.isCorrect ? '✅ SUCCESS' : '❌ NEEDS REVIEW'}`);

        return { analysis, cleanup, validation };
    } catch (error) {
        console.error('Deduplication failed:', error);
        throw error;
    }
}

console.log('Cleanup utilities loaded');
console.log('Data sources:', CLEANUP_DATA_SOURCES);
console.log('');
// Verification functions for VisionAppraisal data integrity
async function extractPIDsFromEverythingFile(filename) {
    console.log(`=== EXTRACTING PIDS FROM ${filename} ===`);

    try {
        const filePath = `/servers/Results/${filename}`;
        const response = await fetch(filePath);

        if (!response.ok) {
            throw new Error(`Failed to fetch ${filename}: ${response.status}`);
        }

        const text = await response.text();
        const dataArray = JSON.parse(text);

        console.log(`${filename} contains ${dataArray.length} records`);

        // Extract PIDs from each record (PID should be field 9 based on the CSV structure seen)
        const pids = dataArray.map((record, index) => {
            // Split CSV string and get PID field
            const fields = record.split(',');
            const pid = fields[9]; // Based on VisionAppraisal field mapping

            if (!pid || pid.trim() === '') {
                console.warn(`Record ${index} has empty PID:`, record.substring(0, 100) + '...');
                return null;
            }

            return pid.trim();
        }).filter(pid => pid !== null);

        console.log(`Extracted ${pids.length} valid PIDs from ${filename}`);
        console.log('Sample PIDs:', pids.slice(0, 5));

        return pids;
    } catch (error) {
        console.error(`Error processing ${filename}:`, error);
        throw error;
    }
}

async function quickVerifyDataMatch() {
    console.log('=== QUICK PID VERIFICATION ===');

    try {
        // Get counts only
        console.log('1. Checking PID folder count...');
        const pidFolderFiles = await listFolderFiles(CLEANUP_DATA_SOURCES.PIDS_FOLDER.id, false);

        console.log('2. Checking data file counts...');
        const pidsFileA = await extractPIDsFromEverythingFile('everyThingWithPid.json');
        const pidsFileB = await extractPIDsFromEverythingFile('everyThingWithPidB.json');

        const uniqueDataPIDs = [...new Set([...pidsFileA, ...pidsFileB])];

        console.log('\n=== SIMPLE COUNT COMPARISON ===');
        console.log(`PID Folder Files: ${pidFolderFiles.length}`);
        console.log(`File A Records: ${pidsFileA.length}`);
        console.log(`File B Records: ${pidsFileB.length}`);
        console.log(`Combined Records: ${pidsFileA.length + pidsFileB.length}`);
        console.log(`Unique PIDs in Data: ${uniqueDataPIDs.length}`);

        const countsMatch = pidFolderFiles.length === uniqueDataPIDs.length;
        console.log(`\nCounts Match: ${countsMatch ? '✅ YES' : '❌ NO'}`);

        if (countsMatch) {
            console.log('✅ ASSUMPTION VALIDATED: File A + File B likely contains all PID folder data');
        } else {
            console.log('⚠️  COUNTS DIFFER: May need deeper investigation');
        }

        return {
            folderCount: pidFolderFiles.length,
            fileACount: pidsFileA.length,
            fileBCount: pidsFileB.length,
            combinedCount: pidsFileA.length + pidsFileB.length,
            uniqueCount: uniqueDataPIDs.length,
            countsMatch
        };

    } catch (error) {
        console.error('Quick verification failed:', error);
        throw error;
    }
}

async function verifyGoogleFileIDsPointToPIDFolder() {
    console.log('=== VERIFYING GOOGLE FILE IDS POINT TO PID FOLDER ===');

    try {
        // Step 1: Get all file IDs currently in PID folder
        console.log('1. Getting PID folder file IDs...');
        const pidFolderFiles = await listFolderFiles(CLEANUP_DATA_SOURCES.PIDS_FOLDER.id, false);
        const pidFolderFileIds = new Set(pidFolderFiles.map(file => file.id));

        console.log(`PID folder contains ${pidFolderFiles.length} files`);
        console.log('Sample PID folder file IDs:', Array.from(pidFolderFileIds).slice(0, 3));

        // Step 2: Extract Google File IDs from data files
        console.log('\n2. Extracting Google File IDs from data files...');

        const extractFileIds = async (filename) => {
            const response = await fetch(`/servers/Results/${filename}`);
            const text = await response.text();
            const dataArray = JSON.parse(text);

            return dataArray.map((record, index) => {
                const fields = record.split(',');
                const pid = fields[9]?.trim(); // PID field
                const googleFileId = fields[10]?.trim(); // Google File ID field

                return { index, pid, googleFileId, filename };
            }).filter(item => item.googleFileId && item.googleFileId !== '');
        };

        const fileAIds = await extractFileIds('everyThingWithPid.json');
        const fileBIds = await extractFileIds('everyThingWithPidB.json');
        const allDataFileIds = [...fileAIds, ...fileBIds];

        console.log(`File A Google File IDs: ${fileAIds.length}`);
        console.log(`File B Google File IDs: ${fileBIds.length}`);
        console.log(`Total data file Google File IDs: ${allDataFileIds.length}`);

        // Step 3: Check which data file IDs are actually in the PID folder
        const idsInPidFolder = allDataFileIds.filter(item => pidFolderFileIds.has(item.googleFileId));
        const idsNotInPidFolder = allDataFileIds.filter(item => !pidFolderFileIds.has(item.googleFileId));

        console.log('\n=== GOOGLE FILE ID VERIFICATION ===');
        console.log(`Data file IDs that ARE in PID folder: ${idsInPidFolder.length}`);
        console.log(`Data file IDs that are NOT in PID folder: ${idsNotInPidFolder.length}`);

        const percentageInFolder = Math.round((idsInPidFolder.length / allDataFileIds.length) * 100);
        console.log(`Percentage pointing to PID folder: ${percentageInFolder}%`);

        if (idsNotInPidFolder.length > 0) {
            console.log('\n⚠️  FILES NOT IN PID FOLDER:');
            idsNotInPidFolder.slice(0, 5).forEach(item => {
                console.log(`  PID ${item.pid} (${item.filename}): ${item.googleFileId}`);
            });

            if (idsNotInPidFolder.length > 5) {
                console.log(`  ... and ${idsNotInPidFolder.length - 5} more`);
            }
        }

        // Step 4: Assessment
        const allPointToPidFolder = idsNotInPidFolder.length === 0;
        console.log(`\n=== ASSESSMENT ===`);
        console.log(`All Google File IDs point to PID folder: ${allPointToPidFolder ? '✅ YES' : '❌ NO'}`);

        if (allPointToPidFolder) {
            console.log('✅ VERIFIED: All data records reference files in the PID folder');
        } else {
            console.log('⚠️  ISSUE: Some records reference files outside the PID folder');
            console.log('This could indicate:');
            console.log('- Files moved or deleted from PID folder');
            console.log('- Data files contain references to external files');
            console.log('- PID folder cleanup may have moved referenced files');
        }

        return {
            pidFolderCount: pidFolderFiles.length,
            dataFileIdCount: allDataFileIds.length,
            idsInFolder: idsInPidFolder.length,
            idsNotInFolder: idsNotInPidFolder.length,
            percentageInFolder,
            allPointToPidFolder,
            problemFiles: idsNotInPidFolder.slice(0, 10) // First 10 problem cases
        };

    } catch (error) {
        console.error('Google File ID verification failed:', error);
        throw error;
    }
}

console.log('Available functions:');
console.log('- analyzePIDFolder() - Analyze duplicates without moving files');
console.log('- runPIDDeduplication() - Complete deduplication process with confirmation');
console.log('- quickVerifyDataMatch() - Simple count comparison between data files and PID folder');
console.log('- verifyGoogleFileIDsPointToPIDFolder() - Check if data file Google IDs reference PID folder files');