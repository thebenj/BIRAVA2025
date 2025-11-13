// Create 40% Random Sample of VisionAppraisal Dataset
// Downloads original file, creates random sample, uploads new file to Google Drive

async function createSampleDataset() {
    console.log('=== CREATING 40% RANDOM SAMPLE DATASET ===');
    console.log('This will create a new VisionAppraisal sample file for testing');

    try {
        const ORIGINAL_FILE_ID = "1oIW1m1Qw2lyreU-uGMX3jUka9LwaBTAf";
        const SAMPLE_PERCENTAGE = 0.4; // 40%

        // Step 1: Download original VisionAppraisal_ProcessedData.json
        console.log('Step 1: Downloading original VisionAppraisal_ProcessedData.json...');
        console.log(`File ID: ${ORIGINAL_FILE_ID}`);

        const response = await gapi.client.drive.files.get({
            fileId: ORIGINAL_FILE_ID,
            alt: 'media'
        });

        const originalData = JSON.parse(response.body);
        console.log(`✅ Downloaded original data successfully`);
        console.log(`📊 Original dataset: ${originalData.records.length} records`);

        // Step 2: Create 40% random sample
        console.log('\nStep 2: Creating 40% random sample...');
        const originalRecords = originalData.records;
        const sampleSize = Math.floor(originalRecords.length * SAMPLE_PERCENTAGE);

        console.log(`📊 Sample size: ${sampleSize} records (${(SAMPLE_PERCENTAGE * 100)}%)`);

        // Create random sample using Fisher-Yates shuffle algorithm
        const shuffledIndexes = Array.from({length: originalRecords.length}, (_, i) => i);

        // Fisher-Yates shuffle
        for (let i = shuffledIndexes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledIndexes[i], shuffledIndexes[j]] = [shuffledIndexes[j], shuffledIndexes[i]];
        }

        // Take first sampleSize records after shuffle
        const sampleIndexes = shuffledIndexes.slice(0, sampleSize).sort((a, b) => a - b);
        const sampleRecords = sampleIndexes.map(index => originalRecords[index]);

        console.log(`✅ Created random sample of ${sampleRecords.length} records`);

        // Step 3: Create new data package with same structure
        const sampleData = {
            metadata: {
                processedAt: new Date().toISOString(),
                originalFile: ORIGINAL_FILE_ID,
                samplePercentage: SAMPLE_PERCENTAGE,
                originalRecordCount: originalRecords.length,
                recordCount: sampleRecords.length,
                withFireNumbers: sampleRecords.filter(r => r.fireNumber).length,
                samplingMethod: 'Fisher-Yates random shuffle',
                note: '40% random sample for parser comparison testing'
            },
            records: sampleRecords
        };

        console.log(`📊 Sample metadata:`);
        console.log(`   Total records: ${sampleData.metadata.recordCount}`);
        console.log(`   With Fire Numbers: ${sampleData.metadata.withFireNumbers}`);
        console.log(`   Sampling percentage: ${sampleData.metadata.samplePercentage * 100}%`);

        // Step 4: Upload new file to Google Drive
        console.log('\nStep 3: Creating new file on Google Drive...');

        const fileContent = JSON.stringify(sampleData, null, 2);
        const fileName = 'VisionAppraisal_ProcessedData_40pct_Sample.json';

        console.log(`📝 Uploading ${fileName}...`);
        console.log(`📊 File size: ${fileContent.length} characters`);

        // Use Method B (POST + multipart) for new file creation
        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        const metadata = {
            'name': fileName,
            'parents': ['1qY7u1N9VaXd6xK-FVagaXm5vEckZPqZ7'] // Correct parent folder from bloomerang.js
        };

        let multipartRequestBody =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            fileContent +
            close_delim;

        const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                'Content-Type': 'multipart/related; boundary="' + boundary + '"'
            },
            body: multipartRequestBody
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`);
        }

        const uploadResult = await uploadResponse.json();
        console.log(`✅ File uploaded successfully!`);
        console.log(`📁 File Name: ${uploadResult.name}`);
        console.log(`🆔 New File ID: ${uploadResult.id}`);

        // Step 5: Update VisionAppraisal object to use new file
        console.log('\nStep 4: Ready to update VisionAppraisal configuration...');
        console.log('⚠️ To use this sample file, you would need to update:');
        console.log(`   VisionAppraisal.loadProcessedDataFromGoogleDrive() method`);
        console.log(`   Change GOOGLE_FILE_ID from: ${ORIGINAL_FILE_ID}`);
        console.log(`   Change GOOGLE_FILE_ID to:   ${uploadResult.id}`);

        return {
            success: true,
            originalFileId: ORIGINAL_FILE_ID,
            sampleFileId: uploadResult.id,
            originalRecordCount: originalRecords.length,
            sampleRecordCount: sampleRecords.length,
            samplePercentage: SAMPLE_PERCENTAGE,
            fileName: fileName,
            message: '40% random sample dataset created successfully'
        };

    } catch (error) {
        console.error('❌ Sample dataset creation failed:', error);
        return {
            success: false,
            error: error.message,
            message: 'Sample dataset creation failed'
        };
    }
}

// Helper function to update VisionAppraisal to use sample data
function switchToSampleData(sampleFileId) {
    console.log('=== SWITCHING VISIONAPPRAISAL TO USE SAMPLE DATA ===');
    console.log(`⚠️ This will temporarily modify VisionAppraisal.loadProcessedDataFromGoogleDrive()`);
    console.log(`New File ID: ${sampleFileId}`);

    // Store original file ID
    if (!window.ORIGINAL_VISION_APPRAISAL_FILE_ID) {
        window.ORIGINAL_VISION_APPRAISAL_FILE_ID = "1oIW1m1Qw2lyreU-uGMX3jUka9LwaBTAf";
    }

    // Temporarily override the method
    const originalMethod = VisionAppraisal.loadProcessedDataFromGoogleDrive;

    VisionAppraisal.loadProcessedDataFromGoogleDrive = async function() {
        console.log("=== LOADING SAMPLE VISIONAPPRAISAL DATA FROM GOOGLE DRIVE ===");
        console.log(`Loading SAMPLE DATA from File ID: ${sampleFileId}`);

        try {
            const response = await gapi.client.drive.files.get({
                fileId: sampleFileId,
                alt: 'media'
            });

            const dataPackage = JSON.parse(response.body);

            console.log(`✓ Loaded SAMPLE data from ${dataPackage.metadata.processedAt}`);
            console.log(`✓ ${dataPackage.metadata.recordCount} records (${dataPackage.metadata.samplePercentage * 100}% sample)`);
            console.log(`✓ ${dataPackage.metadata.withFireNumbers} with Fire Numbers`);

            return {
                success: true,
                data: dataPackage.records,
                metadata: dataPackage.metadata,
                message: "SAMPLE VisionAppraisal data loaded successfully"
            };

        } catch (error) {
            console.error("Error loading SAMPLE VisionAppraisal data:", error);
            return {
                success: false,
                error: error.message,
                message: "Failed to load SAMPLE VisionAppraisal data"
            };
        }
    };

    // Store restoration method
    VisionAppraisal.restoreOriginalData = function() {
        console.log('🔄 Restoring original VisionAppraisal data source...');
        VisionAppraisal.loadProcessedDataFromGoogleDrive = originalMethod;
        console.log('✅ Restored to original data source');
    };

    console.log('✅ VisionAppraisal switched to sample data');
    console.log('📝 Use VisionAppraisal.restoreOriginalData() to switch back');
}

// Make functions available globally
window.createSampleDataset = createSampleDataset;
window.switchToSampleData = switchToSampleData;

console.log('Sample Dataset Creation Script Loaded');
console.log('Functions available:');
console.log('- createSampleDataset() - Create 40% random sample and upload to Google Drive');
console.log('- switchToSampleData(fileId) - Switch VisionAppraisal to use sample data');