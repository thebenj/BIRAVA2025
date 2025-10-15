// Error Records Analyzer for 31-Case Validation
// Extracts and analyzes the 107 error records that caused "Cannot read properties of undefined" errors

const ErrorRecordsAnalyzer = {

    // Extract error records from VisionAppraisal data
    async extractErrorRecords() {
        console.log("=== ERROR RECORDS EXTRACTION ===");

        try {
            // Step 1: Load VisionAppraisal processed data
            console.log("Step 1: Loading VisionAppraisal processed data...");
            const dataResult = await VisionAppraisal.loadProcessedDataFromGoogleDrive();

            if (!dataResult.success || !dataResult.data) {
                throw new Error("Failed to load VisionAppraisal data: " + (dataResult.error || "Unknown error"));
            }

            const records = dataResult.data;
            console.log(`✓ Loaded ${records.length} VisionAppraisal records`);

            // Step 2: Identify error records
            console.log("Step 2: Identifying error records...");
            const errorAnalysis = {
                totalRecords: records.length,
                errorRecords: [],
                missingProcessedOwnerName: 0,
                missingOwnerName: 0,
                emptyProcessedOwnerName: 0,
                emptyOwnerName: 0,
                bothMissing: 0
            };

            records.forEach((record, index) => {
                try {
                    // Try to access the same fields the validator accesses
                    const processedOwnerName = record.processedOwnerName;
                    const ownerName = record.ownerName;
                    const finalOwnerName = processedOwnerName || ownerName || '';

                    // Check for various error conditions
                    let errorType = null;
                    let errorDetails = {};

                    if (!processedOwnerName && !ownerName) {
                        errorType = 'BOTH_MISSING';
                        errorAnalysis.bothMissing++;
                    } else if (!processedOwnerName) {
                        errorType = 'MISSING_PROCESSED_OWNER_NAME';
                        errorAnalysis.missingProcessedOwnerName++;
                    } else if (!ownerName) {
                        errorType = 'MISSING_OWNER_NAME';
                        errorAnalysis.missingOwnerName++;
                    } else if (processedOwnerName.trim() === '') {
                        errorType = 'EMPTY_PROCESSED_OWNER_NAME';
                        errorAnalysis.emptyProcessedOwnerName++;
                    } else if (ownerName.trim() === '') {
                        errorType = 'EMPTY_OWNER_NAME';
                        errorAnalysis.emptyOwnerName++;
                    }

                    // Also try to simulate the word parsing that caused the error
                    if (finalOwnerName) {
                        try {
                            const words = finalOwnerName.trim().toUpperCase().split(/\s+/).filter(word => word.length > 0);
                            // This is where the error likely occurred - accessing .length on undefined
                        } catch (parseError) {
                            errorType = 'WORD_PARSING_ERROR';
                            errorDetails.parseError = parseError.message;
                        }
                    }

                    if (errorType) {
                        errorAnalysis.errorRecords.push({
                            index: index,
                            pid: record.pid || 'N/A',
                            errorType: errorType,
                            processedOwnerName: processedOwnerName,
                            ownerName: ownerName,
                            finalOwnerName: finalOwnerName,
                            errorDetails: errorDetails,
                            record: record
                        });
                    }

                } catch (error) {
                    // This simulates the actual error from the validator
                    errorAnalysis.errorRecords.push({
                        index: index,
                        pid: record.pid || 'N/A',
                        errorType: 'VALIDATION_ERROR',
                        processedOwnerName: record.processedOwnerName,
                        ownerName: record.ownerName,
                        finalOwnerName: record.processedOwnerName || record.ownerName || '',
                        errorDetails: {
                            errorMessage: error.message,
                            errorStack: error.stack
                        },
                        record: record
                    });
                }
            });

            console.log(`✓ Found ${errorAnalysis.errorRecords.length} error records`);

            // Step 3: Generate analysis report
            this.generateErrorReport(errorAnalysis);

            return {
                success: true,
                errorAnalysis: errorAnalysis,
                message: "Error records extraction completed"
            };

        } catch (error) {
            console.error("Error in error records extraction:", error);
            return {
                success: false,
                error: error.message,
                message: "Error records extraction failed"
            };
        }
    },

    // Generate error analysis report
    generateErrorReport(errorAnalysis) {
        console.log("\n=== ERROR RECORDS ANALYSIS REPORT ===");
        console.log(`Total records: ${errorAnalysis.totalRecords}`);
        console.log(`Error records found: ${errorAnalysis.errorRecords.length}`);

        console.log("\nERROR TYPE BREAKDOWN:");
        console.log(`- Both owner name fields missing: ${errorAnalysis.bothMissing}`);
        console.log(`- Missing processedOwnerName: ${errorAnalysis.missingProcessedOwnerName}`);
        console.log(`- Missing ownerName: ${errorAnalysis.missingOwnerName}`);
        console.log(`- Empty processedOwnerName: ${errorAnalysis.emptyProcessedOwnerName}`);
        console.log(`- Empty ownerName: ${errorAnalysis.emptyOwnerName}`);

        console.log("\nERROR RECORDS DETAILS (first 10):");
        errorAnalysis.errorRecords.slice(0, 10).forEach((errorRecord, idx) => {
            console.log(`${idx + 1}. Index ${errorRecord.index} (PID: ${errorRecord.pid}):`);
            console.log(`   Error Type: ${errorRecord.errorType}`);
            console.log(`   processedOwnerName: "${errorRecord.processedOwnerName}"`);
            console.log(`   ownerName: "${errorRecord.ownerName}"`);
            console.log(`   finalOwnerName: "${errorRecord.finalOwnerName}"`);
            if (errorRecord.errorDetails.errorMessage) {
                console.log(`   Error Message: ${errorRecord.errorDetails.errorMessage}`);
            }
            console.log('');
        });

        if (errorAnalysis.errorRecords.length > 10) {
            console.log(`... and ${errorAnalysis.errorRecords.length - 10} more error records`);
        }

        console.log("\nRECOMMENDATIONS:");
        console.log("1. Add null/undefined checks before accessing string methods");
        console.log("2. Implement fallback logic for missing owner name fields");
        console.log("3. Add data validation before processing records");
    },

    // Export error records to a file for review
    exportErrorRecordsToFile(errorAnalysis) {
        const exportData = {
            metadata: {
                exportedAt: new Date().toISOString(),
                totalRecords: errorAnalysis.totalRecords,
                errorRecordsCount: errorAnalysis.errorRecords.length,
                description: "Error records from 31-case validation system"
            },
            errorSummary: {
                bothMissing: errorAnalysis.bothMissing,
                missingProcessedOwnerName: errorAnalysis.missingProcessedOwnerName,
                missingOwnerName: errorAnalysis.missingOwnerName,
                emptyProcessedOwnerName: errorAnalysis.emptyProcessedOwnerName,
                emptyOwnerName: errorAnalysis.emptyOwnerName
            },
            errorRecords: errorAnalysis.errorRecords.map(error => ({
                index: error.index,
                pid: error.pid,
                errorType: error.errorType,
                processedOwnerName: error.processedOwnerName,
                ownerName: error.ownerName,
                finalOwnerName: error.finalOwnerName,
                errorDetails: error.errorDetails
                // Note: Excluding full record object to keep file size manageable
            }))
        };

        const exportString = JSON.stringify(exportData, null, 2);
        console.log("\nERROR RECORDS EXPORT:");
        console.log("Copy the following JSON data to create error records file:");
        console.log("=" .repeat(50));
        console.log(exportString);
        console.log("=" .repeat(50));

        return exportString;
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.ErrorRecordsAnalyzer = ErrorRecordsAnalyzer;
}