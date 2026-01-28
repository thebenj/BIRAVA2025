/**
 * workflowHandlers.js
 *
 * Workflow button handlers for the main application UI.
 * Extracted from inline <script> blocks in index.html for better code organization.
 *
 * Functions:
 * - UNIFIED_DB_FILE_ID_KEY (constant)
 * - saveUnifiedDatabaseFileId() - Save file ID to localStorage
 * - getUnifiedDatabaseFileId() - Get file ID from input or localStorage
 * - processAndSaveVisionAppraisal() - Step A4a: Process VA data
 * - runEntityProcessing() - Step A4b: Create entities from processed data
 * - recordUnifiedDatabase() - Step A6: Save unified database to Drive
 * - loadUnifiedDatabaseFromDrive() - Step B1: Load unified database from Drive
 *
 * Created: 2026-01-27
 */

// ============================================================================
// HELPER FUNCTIONS (migrated from index.html)
// ============================================================================

// Storage key for unified database file ID
const UNIFIED_DB_FILE_ID_KEY = 'birava_unifiedDatabaseFileId';

// Save file ID to localStorage
function saveUnifiedDatabaseFileId(fileId) {
    if (fileId && fileId.trim()) {
        localStorage.setItem(UNIFIED_DB_FILE_ID_KEY, fileId.trim());
        console.log('Unified database file ID saved:', fileId.trim());
    }
}

// Get file ID from localStorage or input
function getUnifiedDatabaseFileId() {
    const input = document.getElementById('unifiedDatabaseFileId');
    if (input && input.value.trim()) {
        return input.value.trim();
    }
    return localStorage.getItem(UNIFIED_DB_FILE_ID_KEY);
}

// ============================================================================
// MAIN WORKFLOW FUNCTIONS
// ============================================================================

// VisionAppraisal data processing function
async function processAndSaveVisionAppraisal() {
    const btn = document.getElementById('visionProcessBtn');
    const originalText = btn.innerHTML;

    try {
        // Update button to show processing
        btn.innerHTML = '⏳ Processing VisionAppraisal Data...';
        btn.disabled = true;

        console.log("=== STARTING VISIONAPPRAISAL DATA PROCESSING ===");

        // Call the VisionAppraisal processing function
        const result = await VisionAppraisal.processAndSaveToGoogleDrive();

        if (result.success) {
            console.log("✅ VisionAppraisal processing completed successfully!");
            console.log(`Records processed: ${result.recordCount}`);
            console.log(`Google Drive File ID: ${result.fileId}`);

            btn.innerHTML = '✅ Processing Complete!';

            // Show success message
            alert(`VisionAppraisal data processing completed successfully!\n\n` +
                  `• Records processed: ${result.recordCount}\n` +
                  `• File saved to Google Drive\n` +
                  `• File ID: ${result.fileId}\n` +
                  `• Enhanced fields: processedOwnerName, parsed addresses, MBLU components\n\n` +
                  `The processed data is now ready for enhanced name matching!`);

            // Reset button after 3 seconds
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }, 3000);

        } else {
            throw new Error(result.error || 'Processing failed');
        }

    } catch (error) {
        console.error("❌ VisionAppraisal processing failed:", error);

        btn.innerHTML = '❌ Processing Failed';

        alert(`VisionAppraisal data processing failed:\n\n${error.message}\n\nCheck console for details.`);

        // Reset button after 3 seconds
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 3000);
    }
}

// VisionAppraisal entity processing function
async function runEntityProcessing() {
    const btn = document.getElementById('entityProcessBtn');
    const originalText = btn.innerHTML;

    try {
        // Get parameters from form inputs
        const showDetailedResults = document.getElementById('showDetailedResults').value === 'true';
        const quietMode = document.getElementById('quietMode').value === 'true';

        // Update button to show processing
        btn.innerHTML = '⏳ Creating Entities...';
        btn.disabled = true;

        console.log("=== STARTING VISIONAPPRAISAL ENTITY CREATION ===");
        console.log(`Parameters: showDetailedResults=${showDetailedResults}, quietMode=${quietMode}`);

        // Call the entity creation function with parameters
        const result = await processAllVisionAppraisalRecordsWithAddresses(showDetailedResults, quietMode);

        console.log("✅ VisionAppraisal entity creation completed successfully!");
        btn.innerHTML = '✅ Entity Creation Complete!';

        // Show success message
        alert(`VisionAppraisal entity creation completed successfully!\n\n` +
              `• Entities created from processed data\n` +
              `• Saved to Google Drive (File ID: 19cgccMYNBboL07CmMP-5hNNGwEUBXgCI)\n` +
              `• Parameters: Detailed Results = ${showDetailedResults}, Quiet Mode = ${quietMode}\n\n` +
              `Entities are now ready for analysis and matching!`);

        // Reset button after 3 seconds
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 3000);

    } catch (error) {
        console.error("❌ VisionAppraisal entity creation failed:", error);

        btn.innerHTML = '❌ Entity Creation Failed';

        alert(`VisionAppraisal entity creation failed:\n\n${error.message}\n\nCheck console for details.`);

        // Reset button after 3 seconds
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 3000);
    }
}

// Record Unified Database button handler
async function recordUnifiedDatabase() {
    const fileId = getUnifiedDatabaseFileId();
    if (!fileId) {
        alert('Please enter a Google Drive file ID for the unified database.');
        return;
    }

    if (!window.workingLoadedEntities || workingLoadedEntities.status !== 'loaded') {
        alert('Entities not loaded!\n\nPlease click "Load All Entities Into Memory" first.');
        return;
    }

    const btn = document.getElementById('recordUnifiedBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Saving...';
    btn.disabled = true;

    try {
        const result = await saveUnifiedDatabase(fileId);
        alert(`Unified database saved successfully!\n\nEntities: ${result.metadata.totalEntities}\nFile: ${result.fileName}`);
    } catch (error) {
        console.error('Error recording unified database:', error);
        alert('Error saving unified database: ' + error.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Load Unified Database from Google Drive (no regeneration)
async function loadUnifiedDatabaseFromDrive() {
    const fileId = getUnifiedDatabaseFileId();
    if (!fileId) {
        alert('Please enter a Google Drive file ID for the unified database.');
        return;
    }

    const btn = document.getElementById('loadUnifiedBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Loading...';
    btn.disabled = true;

    try {
        // Clear any cached database from workingLoadedEntities path
        if (typeof clearEntityDatabaseCache === 'function') {
            clearEntityDatabaseCache();
        }

        const result = await loadUnifiedDatabase(fileId);

        // Auto-populate the unified browser with loaded data
        if (typeof showAllEntities === 'function') {
            showAllEntities();
        }

        const classStatus = result.classesRestored ? '✅ Class types restored' : '⚠️ Class restoration issue';
        alert(`Unified database loaded from Google Drive!\n\n` +
              `Entities: ${result.entityCount}\n` +
              `Created: ${result.metadata.createdAt}\n` +
              `${classStatus}`);
    } catch (error) {
        console.error('Error loading unified database:', error);
        alert('Error loading unified database: ' + error.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
