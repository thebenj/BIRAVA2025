// Actual Error Finder - identifies records with undefined/null owner names
// Root cause of "Cannot read properties of undefined (reading 'split')" errors

const ActualErrorFinder = {

    // Find records that would cause the parseWords error
    async findActualErrorRecords() {
        console.log("=== ACTUAL ERROR RECORDS FINDER ===");

        try {
            // Load VisionAppraisal processed data
            console.log("Loading VisionAppraisal processed data...");
            const dataResult = await VisionAppraisal.loadProcessedDataFromGoogleDrive();

            if (!dataResult.success || !dataResult.data) {
                throw new Error("Failed to load VisionAppraisal data: " + (dataResult.error || "Unknown error"));
            }

            const records = dataResult.data;
            console.log(`✓ Loaded ${records.length} VisionAppraisal records`);

            // Find records with undefined/null owner names
            const problemRecords = [];

            records.forEach((record, index) => {
                const ownerName = record.processedOwnerName || record.ownerName || '';

                // Test if this would cause the parseWords error
                if (!ownerName || ownerName === null || ownerName === undefined) {
                    problemRecords.push({
                        index: index,
                        pid: record.pid || 'N/A',
                        processedOwnerName: record.processedOwnerName,
                        ownerName: record.ownerName,
                        finalOwnerName: ownerName,
                        errorType: 'NULL_OR_UNDEFINED_NAME'
                    });
                } else {
                    // Test if calling .split() would work
                    try {
                        ownerName.split(/\s+/);
                    } catch (error) {
                        problemRecords.push({
                            index: index,
                            pid: record.pid || 'N/A',
                            processedOwnerName: record.processedOwnerName,
                            ownerName: record.ownerName,
                            finalOwnerName: ownerName,
                            errorType: 'SPLIT_WOULD_FAIL',
                            splitError: error.message
                        });
                    }
                }
            });

            console.log(`✓ Found ${problemRecords.length} problem records`);

            // Generate report
            this.generateProblemReport(problemRecords, records.length);

            // Export for file creation
            this.exportProblemRecords(problemRecords);

            return {
                success: true,
                problemRecords: problemRecords,
                message: "Actual error records identification completed"
            };

        } catch (error) {
            console.error("Error finding actual error records:", error);
            return {
                success: false,
                error: error.message,
                message: "Actual error records identification failed"
            };
        }
    },

    // Generate problem records report
    generateProblemReport(problemRecords, totalRecords) {
        console.log("\n=== PROBLEM RECORDS REPORT ===");
        console.log(`Total records: ${totalRecords}`);
        console.log(`Problem records: ${problemRecords.length}`);

        // Group by error type
        const errorTypes = {};
        problemRecords.forEach(record => {
            if (!errorTypes[record.errorType]) {
                errorTypes[record.errorType] = 0;
            }
            errorTypes[record.errorType]++;
        });

        console.log("\nERROR TYPE BREAKDOWN:");
        Object.entries(errorTypes).forEach(([type, count]) => {
            console.log(`- ${type}: ${count} records`);
        });

        console.log("\nPROBLEM RECORDS (first 10):");
        problemRecords.slice(0, 10).forEach((record, idx) => {
            console.log(`${idx + 1}. Index ${record.index} (PID: ${record.pid}):`);
            console.log(`   Error Type: ${record.errorType}`);
            console.log(`   processedOwnerName: ${JSON.stringify(record.processedOwnerName)}`);
            console.log(`   ownerName: ${JSON.stringify(record.ownerName)}`);
            console.log(`   finalOwnerName: ${JSON.stringify(record.finalOwnerName)}`);
            if (record.splitError) {
                console.log(`   Split Error: ${record.splitError}`);
            }
            console.log('');
        });

        if (problemRecords.length > 10) {
            console.log(`... and ${problemRecords.length - 10} more problem records`);
        }
    },

    // Export problem records for file creation
    exportProblemRecords(problemRecords) {
        const exportData = {
            metadata: {
                exportedAt: new Date().toISOString(),
                problemRecordsCount: problemRecords.length,
                description: "Records causing parseWords errors in 31-case validation"
            },
            problemRecords: problemRecords
        };

        const exportString = JSON.stringify(exportData, null, 2);

        console.log("\n=== PROBLEM RECORDS EXPORT ===");
        console.log("Copy the following JSON data to create problem records file:");
        console.log("=" .repeat(50));
        console.log(exportString);
        console.log("=" .repeat(50));

        return exportString;
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.ActualErrorFinder = ActualErrorFinder;
}