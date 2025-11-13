// Safe Parameterized Testing with Sample Data
// Temporarily overrides VisionAppraisal file ID for testing, with automatic restoration

const ORIGINAL_FILE_ID = "1oIW1m1Qw2lyreU-uGMX3jUka9LwaBTAf";
const SAMPLE_FILE_ID = "1kLOugasN3SgpZMYoOals1YPWfQxEtKGz";

// Safe temporary override system
const TemporaryDataOverride = {
    isActive: false,
    originalMethod: null,

    // Activate sample data (temporary override)
    activateSampleData() {
        if (this.isActive) {
            console.log('⚠️ Sample data already active');
            return;
        }

        console.log('=== ACTIVATING TEMPORARY SAMPLE DATA OVERRIDE ===');
        console.log(`🔄 Switching from: ${ORIGINAL_FILE_ID}`);
        console.log(`🔄 Switching to:   ${SAMPLE_FILE_ID}`);
        console.log('⚠️ This is TEMPORARY and will be automatically restored');

        // Store original method
        this.originalMethod = VisionAppraisal.loadProcessedDataFromGoogleDrive;

        // Override with sample data method
        VisionAppraisal.loadProcessedDataFromGoogleDrive = async function() {
            console.log("=== LOADING SAMPLE VISIONAPPRAISAL DATA FROM GOOGLE DRIVE ===");
            console.log(`Loading SAMPLE DATA from File ID: ${SAMPLE_FILE_ID}`);

            try {
                const response = await gapi.client.drive.files.get({
                    fileId: SAMPLE_FILE_ID,
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

        this.isActive = true;
        console.log('✅ Sample data override ACTIVE');
        console.log('📝 Use TemporaryDataOverride.restore() to return to original data');
    },

    // Restore original data source
    restore() {
        if (!this.isActive) {
            console.log('⚠️ No sample data override to restore');
            return;
        }

        console.log('=== RESTORING ORIGINAL DATA SOURCE ===');
        console.log(`🔄 Restoring original file ID: ${ORIGINAL_FILE_ID}`);

        // Restore original method
        VisionAppraisal.loadProcessedDataFromGoogleDrive = this.originalMethod;

        this.isActive = false;
        this.originalMethod = null;
        console.log('✅ Original data source RESTORED');
    },

    // Get current status
    getStatus() {
        return {
            isActive: this.isActive,
            currentFileId: this.isActive ? SAMPLE_FILE_ID : ORIGINAL_FILE_ID,
            dataType: this.isActive ? 'SAMPLE (40%)' : 'ORIGINAL (100%)'
        };
    },

    // Show current status
    showStatus() {
        const status = this.getStatus();
        console.log('=== DATA SOURCE STATUS ===');
        console.log(`Active Override: ${status.isActive ? 'YES' : 'NO'}`);
        console.log(`Current File ID: ${status.currentFileId}`);
        console.log(`Data Type: ${status.dataType}`);
    }
};

// Safe pipeline test with sample data
async function testPipelineComparisonWithSampleData() {
    console.log('=== PIPELINE COMPARISON TEST WITH SAMPLE DATA ===');
    console.log('This will run both parsers on 40% sample data (~926 records)');

    try {
        // Step 1: Activate sample data override
        TemporaryDataOverride.activateSampleData();

        // Step 2: Run the pipeline comparison test
        console.log('\n🔄 Running pipeline comparison with sample data...');
        const result = await testPipelineComparison();

        // Step 3: Always restore original data (even if test fails)
        console.log('\n🔄 Restoring original data source...');
        TemporaryDataOverride.restore();

        // Step 4: Return results
        if (result.success) {
            console.log('✅ Sample data pipeline comparison completed successfully');
        } else {
            console.log('❌ Sample data pipeline comparison had issues');
        }

        return {
            ...result,
            sampleData: true,
            recordCount: 926,
            originalRestored: true
        };

    } catch (error) {
        // Emergency restore if anything goes wrong
        console.error('❌ Error during sample data test:', error);
        console.log('🚨 Emergency restore of original data source...');
        TemporaryDataOverride.restore();

        return {
            success: false,
            error: error.message,
            sampleData: true,
            originalRestored: true,
            message: 'Sample data test failed, original data restored'
        };
    }
}

// Validation function to ensure we're back on original data
function validateOriginalDataRestored() {
    const status = TemporaryDataOverride.getStatus();

    console.log('=== VALIDATING DATA SOURCE RESTORATION ===');
    TemporaryDataOverride.showStatus();

    if (!status.isActive && status.currentFileId === ORIGINAL_FILE_ID) {
        console.log('✅ CONFIRMED: Original data source restored');
        return true;
    } else {
        console.log('🚨 WARNING: Still using sample data!');
        console.log('🔧 Run TemporaryDataOverride.restore() to fix');
        return false;
    }
}

// Make functions available globally
window.TemporaryDataOverride = TemporaryDataOverride;
window.testPipelineComparisonWithSampleData = testPipelineComparisonWithSampleData;
window.validateOriginalDataRestored = validateOriginalDataRestored;

console.log('Safe Sample Data Testing Script Loaded');
console.log('Functions available:');
console.log('- testPipelineComparisonWithSampleData() - Run pipeline test with 40% sample');
console.log('- TemporaryDataOverride.activateSampleData() - Switch to sample data');
console.log('- TemporaryDataOverride.restore() - Restore original data');
console.log('- TemporaryDataOverride.showStatus() - Check current data source');
console.log('- validateOriginalDataRestored() - Confirm original data restored');