/**
 * Sample Data Loading Module
 *
 * Phase 3 data loading functions for VisionAppraisal and Bloomerang sample data.
 * Extracted from utils.js for better modularity and data access organization.
 *
 * Dependencies:
 * - Google Drive API (gapi.client) for file access
 * - readBloomerang() function from bloomerang.js
 * - Google Drive authentication for file access
 *
 * Key Features:
 * - Uses proven Method 1 from wisdomOfFileAccess.md
 * - Loads VisionAppraisal data from Google Drive processed JSON
 * - Loads Bloomerang data using existing readBloomerang() function
 * - Address extraction for pipeline testing
 * - Scalable sample size configuration
 */

/**
 * Load sample data using existing proven functions
 * Uses existing readBloomerang() and VisionAppraisal data loading
 * @param {number} sampleSize - Number of records to sample from each source (default: 50)
 * @returns {Object} Object containing sampled VisionAppraisal and Bloomerang data
 */
async function loadSampleData(sampleSize = 50) {
    console.log(`🚀 Loading sample data using existing proven functions (${sampleSize} records from each source)...`);

    const results = {
        visionAppraisal: null,
        bloomerang: null,
        sampleSize: sampleSize,
        status: 'loading'
    };

    try {
        // Load VisionAppraisal sample using existing file access
        console.log('Loading VisionAppraisal data from Google Drive...');
        const visionData = await loadGoogleDriveFile('1oIW1m1Qw2lyreU-uGMX3jUka9LwaBTAf'); // VisionAppraisal_ProcessedData.json
        if (visionData && visionData.records && Array.isArray(visionData.records)) {
            results.visionAppraisal = visionData.records.slice(0, sampleSize);
            console.log(`✅ VisionAppraisal: ${results.visionAppraisal.length} records loaded`);
        } else {
            throw new Error('VisionAppraisal data not in expected format');
        }

        // Load Bloomerang sample using existing readBloomerang() function
        console.log('Loading Bloomerang data using existing readBloomerang() function...');
        const bloomerangData = await readBloomerang();
        if (bloomerangData && Array.isArray(bloomerangData)) {
            results.bloomerang = bloomerangData.slice(0, sampleSize);
            console.log(`✅ Bloomerang: ${results.bloomerang.length} records loaded`);
        } else {
            throw new Error('Bloomerang data not in expected format');
        }

        results.status = 'success';

        // Summary
        const totalLoaded = results.visionAppraisal.length + results.bloomerang.length;
        console.log(`\n📊 Sample Data Loading Summary:`);
        console.log(`VisionAppraisal: ${results.visionAppraisal.length} records`);
        console.log(`Bloomerang: ${results.bloomerang.length} records`);
        console.log(`Total Loaded: ${totalLoaded} records`);
        console.log('✅ Sample data loading complete using existing functions!');

        return results;

    } catch (error) {
        console.error('❌ Sample data loading failed:', error);
        results.status = 'error';
        results.error = error.message;
        return results;
    }
}

/**
 * Load file from Google Drive using Method 1 (recommended)
 * Uses gapi.client.drive.files.get() as per wisdomOfFileAccess.md best practices
 * @param {string} fileId - Google Drive file ID
 * @returns {Object} Parsed JSON data from file
 */
async function loadGoogleDriveFile(fileId) {
    try {
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });

        const content = response.body;
        return JSON.parse(content);

    } catch (error) {
        console.error('File access failed:', error);
        throw error;
    }
}

/**
 * Extract addresses from sample data for pipeline testing
 * @param {Object} sampleData - Result from loadSampleData()
 * @returns {Array} Array of address objects with metadata
 */
function extractAddressesFromSamples(sampleData) {
    const addresses = [];

    if (!sampleData || sampleData.status !== 'success') {
        console.error('Invalid sample data provided');
        return addresses;
    }

    // Extract VisionAppraisal addresses (from raw data)
    if (sampleData.visionAppraisal) {
        sampleData.visionAppraisal.forEach((record, index) => {
            // Property location address
            if (record.propertyLocation) {
                addresses.push({
                    address: record.propertyLocation,
                    source: 'VisionAppraisal',
                    field: 'propertyLocation',
                    entityType: 'PropertyRecord',
                    index: index
                });
            }

            // Owner mailing address
            if (record.ownerAddress) {
                addresses.push({
                    address: record.ownerAddress,
                    source: 'VisionAppraisal',
                    field: 'ownerAddress',
                    entityType: 'PropertyRecord',
                    index: index
                });
            }
        });
    }

    // Extract Bloomerang addresses (from readBloomerang() results)
    if (sampleData.bloomerang) {
        sampleData.bloomerang.forEach((record, index) => {
            // readBloomerang() returns parsed CSV objects with address fields
            // Check what address fields are available and extract them
            Object.keys(record).forEach(key => {
                if (key.toLowerCase().includes('address') && record[key] && record[key].trim()) {
                    addresses.push({
                        address: record[key],
                        source: 'Bloomerang',
                        field: key,
                        entityType: 'CSVRecord',
                        index: index
                    });
                }
            });
        });
    }

    console.log(`📍 Extracted ${addresses.length} addresses from sample data`);
    return addresses;
}