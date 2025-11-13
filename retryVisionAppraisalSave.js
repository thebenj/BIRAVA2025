// Retry VisionAppraisal Entity Save with Corrected Folder ID
// Simple retry using the fixed save function

console.log('=== VISIONAPPRAISAL ENTITY SAVE RETRY ===');

async function retryVisionAppraisalSave() {
    try {
        console.log('🔄 Re-running pipeline with corrected folder ID...');

        // Re-run the pipeline (it's fast - only 2.3 seconds)
        const result = await testPhase2DPipeline();

        if (result && result.success) {
            console.log('✅ Pipeline completed successfully with corrected save!');
            return result;
        } else {
            console.log('❌ Pipeline failed:', result);
            return result;
        }

    } catch (error) {
        console.error('Error in retry:', error);
        return { success: false, error: error.message };
    }
}

// Make function available globally
window.retryVisionAppraisalSave = retryVisionAppraisalSave;

console.log('🚀 Retry script loaded!');
console.log('Run: retryVisionAppraisalSave()');