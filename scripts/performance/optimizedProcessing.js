/**
 * Performance Optimization Module
 *
 * High-performance parcel processing classes and testing utilities.
 * Extracted from utils.js for better modularity and performance management.
 *
 * Dependencies:
 * - saveAsJSON(), loadFromDisk(), saveToDisk() from utils.js
 * - parameters object for configuration
 * - reqBase for VisionAppraisal API calls
 *
 * Key Features:
 * - Batch processing with configurable batch sizes
 * - Streamlined HTML parsing and field extraction
 * - Optimized Google Drive upload operations
 * - Performance monitoring and reporting
 * - Progress tracking with disk persistence
 */

/**
 * Optimized parcel processor with targeted performance improvements
 * Focuses on the most impactful optimizations for real-world batch processing
 */
class OptimizedParcelProcessor {
    static async processParcelBatchOptimized(parcelIds, batchSize = 4) {
        console.log('🚀 Processing', parcelIds.length, 'parcels with targeted optimizations...');

        const results = [];

        // Process in smaller batches to avoid throttling
        for (let i = 0; i < parcelIds.length; i += batchSize) {
            const batch = parcelIds.slice(i, i + batchSize);
            console.log(`📦 Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(parcelIds.length/batchSize)}: Processing ${batch.length} parcels`);

            // Fetch all parcel pages in parallel (existing good pattern)
            const startFetch = performance.now();
            const htmlDataArray = await Promise.all(
                batch.map(pid =>
                    fetch(reqBase + '/Parcel.aspx?pid=' + pid).then(r => r.text())
                )
            );
            const endFetch = performance.now();

            // Process HTML with focused optimization (single DOM parse + streamlined extraction)
            const startProcess = performance.now();
            const processedData = htmlDataArray.map((html, idx) => {
                const pid = batch[idx];

                // Single DOM parse with minimal processing
                const doc = new DOMParser().parseFromString(html, "text/html");

                // Streamlined field extraction (skip complex sanitization for performance)
                const fields = [
                    "MainContent_lblOwner",
                    "MainContent_lblCoOwner",
                    "MainContent_lblAddr1",
                    "MainContent_lblLocation",
                    "MainContent_lblZone",
                    "MainContent_lblUseCode",
                    "MainContent_lblNbhd",
                    "MainContent_lblSaleDate",
                    "MainContent_lblMblu",
                    "MainContent_lblPid"
                ].map(id => {
                    const el = doc.getElementById(id);
                    if (!el) return "";
                    // Apply sanitization only where needed (first 4 fields)
                    const needsSanitization = id.includes('Owner') || id.includes('Addr') || id.includes('Location');
                    let val = el.innerHTML;
                    return needsSanitization ?
                        val.replaceAll("<br>", "::#^#::").replaceAll("&amp;", "&").replaceAll(",", ":^#^:") :
                        val;
                }).join(",");

                return { pid, csvLine: fields };
            });
            const endProcess = performance.now();

            // Upload with existing saveAsJSON (proven to work)
            const startUpload = performance.now();
            const uploadResults = await Promise.all(
                processedData.map(async (data) => {
                    try {
                        const uploadResult = await saveAsJSON(data.csvLine, data.pid, parameters.pidFilesParents, true);
                        const success = uploadResult && uploadResult.id;

                        if (success) {
                            // Efficient tracking update
                            const completed = await loadFromDisk('completed_pids.json') || [];
                            if (!completed.includes(data.pid)) {
                                completed.push(data.pid);
                                await saveToDisk('completed_pids.json', completed);
                            }
                        }

                        return { pid: data.pid, success, fileId: uploadResult?.id };
                    } catch (error) {
                        return { pid: data.pid, success: false, error: error.message };
                    }
                })
            );
            const endUpload = performance.now();

            results.push(...uploadResults);

            // Performance reporting
            const fetchTime = endFetch - startFetch;
            const processTime = endProcess - startProcess;
            const uploadTime = endUpload - startUpload;

            console.log(`⏱️  Batch timing: Fetch: ${fetchTime.toFixed(0)}ms, Process: ${processTime.toFixed(0)}ms, Upload: ${uploadTime.toFixed(0)}ms`);

            const successful = uploadResults.filter(r => r.success).length;
            console.log(`✅ Batch result: ${successful}/${batch.length} successful`);

            // Brief pause between batches
            if (i + batchSize < parcelIds.length) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }

        const totalSuccess = results.filter(r => r.success).length;
        console.log(`🎯 Overall: ${totalSuccess}/${parcelIds.length} successful (${(totalSuccess/parcelIds.length*100).toFixed(1)}%)`);

        return results;
    }
}

/**
 * Test the optimized parcel processing system with real upload validation
 * Measures performance improvements and success rates
 */
async function testOptimizedProcessing() {
    console.log('🎯 Testing optimized parcel processing with real upload...');

    try {
        // Use 3 test parcels for quick validation
        const testParcels = ['1230', '626', '1217'];

        console.log('Testing with parcels:', testParcels);

        const startTime = performance.now();
        const results = await OptimizedParcelProcessor.processParcelBatchOptimized(testParcels, 2);
        const endTime = performance.now();

        const totalTime = endTime - startTime;
        const avgPerParcel = totalTime / testParcels.length;

        console.log('📊 OPTIMIZATION RESULTS:');
        console.log(`Total time: ${(totalTime/1000).toFixed(1)} seconds`);
        console.log(`Average per parcel: ${(avgPerParcel/1000).toFixed(1)} seconds`);
        console.log(`Success rate: ${results.filter(r => r.success).length}/${testParcels.length}`);

        return {
            success: true,
            totalTime,
            avgPerParcel,
            successCount: results.filter(r => r.success).length,
            results
        };

    } catch (error) {
        console.error('❌ Optimized processing test failed:', error);
        return { success: false, error: error.message };
    }
}