// ES5 Compatible PID Processing Functions
// Works in all browsers without modern JavaScript support

// Constants using var
var CLEANUP_DATA_SOURCES = {
    PROCESSED_DATA: {
        name: "VisionAppraisal_ProcessedData.json",
        id: "1oIW1m1Qw2lyreU-uGMX3jUka9LwaBTAf"
    },
    PIDS_FOLDER: {
        name: "pids",
        id: "1WS2Uwx3c96X_Kj-LvtQtpzUSAViHaBAG"
    },
    DUPLICATES_FOLDER: {
        name: "duplicates",
        id: "1UOIQ1_2TcAldgA-d8GqBel3csnzyqFwy"
    }
};

// Simple test function
function testFunctionES5() {
    console.log('ES5 test function works! Modern JS was the problem.');
    return 'SUCCESS';
}

// ES5 compatible PID folder processing
function processPIDFolderToCsvES5() {
    console.log('=== PROCESSING PID FOLDER TO FRESH CSV DATA (ES5) ===');

    // Step 1: Get all current PID folder files
    console.log('1. Loading all current PID folder files...');

    gapi.client.drive.files.list({
        pageSize: 1000,
        fields: 'files(id, name)',
        q: "'" + CLEANUP_DATA_SOURCES.PIDS_FOLDER.id + "' in parents"
    }).then(function(response) {
        var files = response.result.files || [];
        console.log('Found ' + files.length + ' PID files');

        if (files.length === 0) {
            console.error('No PID files found in folder');
            return;
        }

        // Process first few files as test
        var testFiles = files.slice(0, 5);
        console.log('Processing first 5 files as test...');

        processFilesBatch(testFiles, 0);

    }).catch(function(error) {
        console.error('Error listing PID folder files:', error);
    });
}

function processFilesBatch(files, index) {
    if (index >= files.length) {
        console.log('Batch processing complete');
        return;
    }

    var file = files[index];
    console.log('Processing ' + (index + 1) + '/' + files.length + ': ' + file.name);

    // Get file content
    gapi.client.drive.files.get({
        fileId: file.id,
        alt: 'media'
    }).then(function(response) {
        try {
            var jsonData = JSON.parse(response.body);
            console.log('File ' + file.name + ' loaded successfully');

            // Process next file after small delay
            setTimeout(function() {
                processFilesBatch(files, index + 1);
            }, 100);

        } catch (error) {
            console.error('Error parsing JSON for ' + file.name + ':', error);
            // Continue with next file even if this one fails
            setTimeout(function() {
                processFilesBatch(files, index + 1);
            }, 100);
        }
    }).catch(function(error) {
        console.error('Error reading file ' + file.name + ':', error);
        // Continue with next file even if this one fails
        setTimeout(function() {
            processFilesBatch(files, index + 1);
        }, 100);
    });
}

// Generate fresh data function - ES5 version
function generateFreshEveryThingWithPidES5() {
    console.log('=== GENERATING FRESH EVERYTHINGWITHPID.JSON (ES5) ===');
    console.log('Starting PID folder processing...');
    processPIDFolderToCsvES5();
}

console.log('ES5 Compatible functions loaded:');
console.log('- testFunctionES5() - Test function');
console.log('- processPIDFolderToCsvES5() - Process PID files with ES5 syntax');
console.log('- generateFreshEveryThingWithPidES5() - Generate fresh data with ES5 syntax');