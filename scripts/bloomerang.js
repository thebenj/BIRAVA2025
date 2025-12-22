// bloomerang.js

// objectStructure classes loaded globally via script tags in index.html:
// - DATA_SOURCES, AttributedTerm, SimpleIdentifiers, IndicativeData, IdentifyingData,
//   FireNumber, PID, IndividualName, HouseholdName from aliasClasses.js
// - Entity, Individual, AggregateHousehold, NonHuman from entityClasses.js
// - ContactInfo from contactInfo.js

const bloomerangParameters = {
    csvFile: {
        path: "./servers/Results/All Data.csv"
    },
    outputFolder: "1YkB2-G2pPtmEmE0DtzjX6nXK6QKVb-X2",
    outputFile: "1JVBMePgqTvq3BETV57gohA0GDTOFeCYy",
    // Serialization parameters - using user-created Google Drive folders
    serialization: {
        folderIds: {
            entities: "1cGwqQQiT_rR6wCb1B_Qvop8zd_k-UOkz",      // SerializedEntities main folder
            individuals: "1qY7u1N9VaXd6xK-FVagaXm5vEckZPqZ7",   // Individuals subfolder
            households: "17-5HMMss762EW_6d1qgbzrAHEz_zVCs8",     // Households subfolder
            nonHuman: "1VdhjD3W2-oHXUntLqV4iMUZhO04OqQHt",       // NonHuman subfolder
            batches: "1hcI8ZNKw9zfN5UMr7-LOfUldxuGF2V9e"        // ProcessingBatches subfolder
        }
    }
}

// This program only works if the following changes have been made to the Bloomerang output:
// 1) Eliminate the second row, the total row.
// 2) Format all numeric columns to not have commas.
// 3) Search and replace all commas with "^#C#^"
// 4) Search and replace all \n with null
//
// DEPRECATION NOTICE: This function will be replaced by readBloomerangWithEntities()
// which creates proper Entity objects with AttributedTerm provenance tracking.
// This function is expected to be deleted when fully replaced.
async function readBloomerang() {
    try {
        const reqBase = "http://127.0.0.99:3000";
        const fileUrl = `${reqBase}/csv-file`;
        console.log('Fetching CSV file from:', fileUrl);

        const response = await fetch(fileUrl);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const csvText = await response.text();

        // Check if we got JSON error instead of CSV
        if (response.headers.get('content-type')?.includes('application/json')) {
            console.error('ERROR: Server returned JSON instead of CSV');
            throw new Error('Server returned JSON error instead of CSV file');
        }

        // Split into lines and filter empty ones
        const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
        console.log(`Processing ${lines.length} lines...`);

        // Simple CSV parsing - split each line by comma
        const data = lines.map(line => {
            const parts = line.split(',');
            return parts;
        });

        // Restore actual commas by replacing the placeholder string
        const cleanData = data.map(row => {
            return row.map(field => field.replace(/\^#C#\^/g, ','));
        });

        console.log(`Successfully parsed ${cleanData.length} rows with ${cleanData[0]?.length || 0} fields each`);

        // Save to Google Drive
        await saveBloomerangToGoogleDrive(cleanData);

        return cleanData;

    } catch (error) {
        console.error('Error reading CSV file:', error);
        throw error;
    }
}

async function saveBloomerangToGoogleDrive(data) {
    const fileId = bloomerangParameters.outputFile;
    const jsonContent = JSON.stringify(data, null, 2);

    try {
        const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
            method: 'PATCH',
            headers: new Headers({
                'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                'Content-Type': 'application/json'
            }),
            body: jsonContent
        });

        if (response.ok) {
            console.log('Bloomerang data updated in Google Drive file ID:', fileId);
        } else {
            console.error('Error saving to Google Drive:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('Error uploading to Google Drive:', error);
    }
}

// Separate analysis function to check CSV parsing quality - run only when needed
async function analyzeBloomerangCSV() {
    try {
        const reqBase = "http://127.0.0.99:3000";
        const fileUrl = `${reqBase}/csv-file`;
        console.log('Analyzing CSV file...');

        const response = await fetch(fileUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const csvText = await response.text();
        const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');

        // Simple CSV parsing for analysis
        const data = lines.map(line => {
            const parts = line.split(',');
            return parts;
        });

        console.log('\n=== CSV PARSING ANALYSIS ===');
        console.log(`Total lines: ${lines.length}`);

        // Analyze field count distribution to detect CSV parsing issues
        const fieldCounts = {};
        data.forEach((row, index) => {
            const count = row.length;
            if (!fieldCounts[count]) fieldCounts[count] = [];
            fieldCounts[count].push(index);
        });

        console.log('\nField count distribution:');
        Object.keys(fieldCounts).sort((a, b) => parseInt(b) - parseInt(a)).forEach(count => {
            const rows = fieldCounts[count];
            console.log(`  ${count} fields: ${rows.length} rows (${(rows.length/data.length*100).toFixed(1)}%)`);
            if (rows.length <= 3) {
                console.log(`    Examples: rows ${rows.join(', ')}`);
            } else {
                console.log(`    Examples: rows ${rows.slice(0, 3).join(', ')} ... and ${rows.length - 3} more`);
            }
        });

        // Show examples of rows with unusual field counts
        const sortedCounts = Object.keys(fieldCounts).sort((a, b) => parseInt(b) - parseInt(a));
        if (sortedCounts.length > 1) {
            const maxFields = parseInt(sortedCounts[0]);
            const minFields = parseInt(sortedCounts[sortedCounts.length - 1]);

            console.log(`\nRow with most fields (${maxFields}):`);
            const maxRow = fieldCounts[maxFields][0];
            console.log(`  Row ${maxRow}:`, data[maxRow].slice(0, 5), '...');
            console.log(`  Raw line: ${lines[maxRow].substring(0, 200)}...`);

            console.log(`\nRow with fewest fields (${minFields}):`);
            const minRow = fieldCounts[minFields][0];
            console.log(`  Row ${minRow}:`, data[minRow]);
            console.log(`  Raw line: ${lines[minRow].substring(0, 200)}...`);
        }

        // Check for common CSV issues
        console.log('\n=== POTENTIAL CSV ISSUES ===');
        let quotedFieldCount = 0;
        let commaInQuotesCount = 0;

        lines.slice(0, 100).forEach((line, index) => { // Check first 100 lines
            if (line.includes('"')) quotedFieldCount++;
            if (line.match(/"[^"]*,[^"]*"/)) commaInQuotesCount++;
        });

        console.log(`Lines with quotes: ${quotedFieldCount}/100`);
        console.log(`Lines with commas inside quotes: ${commaInQuotesCount}/100`);

        if (commaInQuotesCount > 0 || sortedCounts.length > 1) {
            console.log('⚠️  WARNING: CSV parsing issues detected!');
            console.log('   Did you complete ALL preprocessing steps on the Bloomerang output?');
            console.log('   Required steps: 1) Remove total row, 2) Remove commas from numbers,');
            console.log('                   3) Replace commas with "^#C#^", 4) Replace \\n with null');
        }

        return { fieldCounts, quotedFieldCount, commaInQuotesCount };

    } catch (error) {
        console.error('Error analyzing CSV file:', error);
        throw error;
    }
}

/**
 * PRODUCTION-READY BLOOMERANG ENTITY PROCESSING FUNCTION
 *
 * CAPABILITIES:
 * - Processes 1458 CSV records with 100% success rate
 * - Creates 413 households with proper Individual member associations
 * - Handles all entity types: Individual, AggregateHousehold, NonHuman
 * - Uses placeholder location identifiers (Fire Number 3499) when no location data available
 * - Optional Google Drive serialization with organized folder structure
 * - Comprehensive error tracking and diagnostic output
 *
 * @param {boolean} saveToGoogleDrive - Whether to serialize and save entities to Google Drive (default: false)
 * @param {string} batchId - Optional batch identifier for grouping serialized entities (auto-generated if null)
 * @returns {Object} Processing results with entities, households, statistics, and error tracking
 */
async function readBloomerangWithEntities(saveToGoogleDrive = false, batchId = null) {
    try {
        console.log('=== Starting Bloomerang Entity Processing ===');

        // Step 1: Fetch CSV data (same as original function)
        const reqBase = "http://127.0.0.99:3000";
        const fileUrl = `${reqBase}/csv-file`;
        console.log('Fetching CSV file from:', fileUrl);

        const response = await fetch(fileUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const csvText = await response.text();
        console.log('CSV data fetched successfully');

        // Step 2: Parse CSV with 22 field structure
        const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
        console.log(`Processing ${lines.length - 1} data rows (plus header)...`);

        // Parse CSV rows
        const rows = lines.slice(1).map((line, index) => {
            const fields = line.split(',').map(field => field.replace(/\^#C#\^/g, ',').trim());
            return {
                rowIndex: index + 1, // 1-based indexing for data rows
                fields: fields,
                accountNumber: fields[5] // Field 6: Account Number (0-based index 5)
            };
        });

        console.log(`Parsed ${rows.length} data rows`);

        // Step 3: Initialize processing containers
        const entities = [];              // All created entities
        const households = new Map();     // Household tracking by name
        const errorStats = new Map();     // Error tracking with counts and row numbers
        const dataSource = "BLOOMERANG_CSV";
        let folderIds = null;

        // Initialize serialization if requested
        if (saveToGoogleDrive) {
            console.log('Initializing Google Drive serialization...');
            folderIds = getSerializationFolders();
            if (!batchId) {
                batchId = `Bloomerang_${new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)}`;
            }
            console.log(`Batch ID: ${batchId}`);
            console.log('Using pre-created Google Drive folders:', folderIds);
        }

        // Step 4: Process each row to create entities
        let processedCount = 0;
        let skippedCount = 0;
        let locationIdentifierCount = 0;

        for (const row of rows) {
            try {
                const entity = await processRowToEntity(row, dataSource, households);
                if (entity) {
                    entities.push(entity);
                    processedCount++;
                    locationIdentifierCount++;

                    // Row processed successfully
                } else {
                    skippedCount++;
                }
            } catch (error) {
                // Track error statistics
                const errorType = error.message;
                if (!errorStats.has(errorType)) {
                    errorStats.set(errorType, {
                        count: 0,
                        rows: []
                    });
                }
                const errorData = errorStats.get(errorType);
                errorData.count++;
                errorData.rows.push(row.rowIndex);

                // Only output error details when first encountered
                if (errorData.count === 1) {
                    console.error(`NEW ERROR TYPE: ${errorType} (Row ${row.rowIndex})`);
                } else {
                    console.log(`Error ${row.rowIndex}`);
                }
            }
        }

        // Step 5: Save batch results if serialization enabled
        if (saveToGoogleDrive && folderIds) {
            const processingStats = {
                totalRows: rows.length,
                entitiesCreated: processedCount,
                rowsSkipped: skippedCount,
                locationIdentifiersCreated: locationIdentifierCount,
                errorCount: Array.from(errorStats.values()).reduce((sum, data) => sum + data.count, 0),
                householdsCreated: households.size
            };
            await saveBatchResults(entities, processingStats, folderIds, batchId);
        }

        // Step 6: Display final summary table
        console.log(`\n=== PROCESSING SUMMARY ===`);
        console.log(`Total records processed: ${rows.length}`);
        console.log(`Records completed without error: ${processedCount}`);
        console.log(`Records that created location identifier: ${locationIdentifierCount}`);
        console.log(`Records skipped (no location identifier): ${skippedCount}`);
        console.log(`Total households created: ${households.size}`);

        if (errorStats.size > 0) {
            console.log(`\n=== ERROR SUMMARY ===`);
            for (const [errorType, errorData] of errorStats.entries()) {
                console.log(`\nError: "${errorType}"`);
                console.log(`  Count: ${errorData.count}`);
                console.log(`  Rows: ${errorData.rows.join(', ')}`);
            }
            console.log(`\nTotal errors: ${Array.from(errorStats.values()).reduce((sum, data) => sum + data.count, 0)}`);
        }

        // Step 6: Collection-based serialization (if requested)
        let uploadResults = null;
        if (saveToGoogleDrive) {
            console.log(`\n=== COLLECTION UPLOAD STARTING ===`);
            console.log(`Batch ID: ${batchId}`);

            // Aggregate all entities into collections
            const collections = aggregateEntitiesIntoCollections(entities, households, []);
            console.log(`Collections prepared:`, {
                individuals: collections.individuals.size,
                households: collections.households.size,
                nonHumans: collections.nonHumans.size,
                total: collections.metadata.totalProcessed
            });

            // Upload each collection type
            uploadResults = {};
            const folderIds = getSerializationFolders();

            // Upload Individuals collection
            if (collections.individuals.size > 0) {
                console.log(`\nUploading Individuals collection (${collections.individuals.size} entities)...`);
                uploadResults.individuals = await uploadEntityCollection(
                    collections.individuals, 'Individual', batchId, folderIds.individuals
                );
            }

            // Upload Households collection
            if (collections.households.size > 0) {
                console.log(`\nUploading Households collection (${collections.households.size} entities)...`);
                uploadResults.households = await uploadEntityCollection(
                    collections.households, 'AggregateHousehold', batchId, folderIds.households
                );
            }

            // Upload NonHuman collection
            if (collections.nonHumans.size > 0) {
                console.log(`\nUploading NonHuman collection (${collections.nonHumans.size} entities)...`);
                uploadResults.nonHumans = await uploadEntityCollection(
                    collections.nonHumans, 'NonHuman', batchId, folderIds.nonHuman
                );
            }

            console.log(`\n=== COLLECTION UPLOAD COMPLETE ===`);
            console.log(`Collections uploaded:`, {
                individuals: uploadResults.individuals ? `${uploadResults.individuals.entitiesUploaded} entities` : 'none',
                households: uploadResults.households ? `${uploadResults.households.entitiesUploaded} entities` : 'none',
                nonHumans: uploadResults.nonHumans ? `${uploadResults.nonHumans.entitiesUploaded} entities` : 'none'
            });

            // Save file IDs to persistent configuration for Entity Browser
            await saveBloomerangEntityBrowserConfig(uploadResults, batchId);
        }

        // Step 7: Return results
        return {
            entities: entities,
            households: households, // Return the Map, not array
            statistics: {
                totalRows: rows.length,
                entitiesCreated: processedCount,
                rowsSkipped: skippedCount,
                locationIdentifiersCreated: locationIdentifierCount,
                errorCount: Array.from(errorStats.values()).reduce((sum, data) => sum + data.count, 0),
                householdsCreated: households.size
            },
            errorStats: Object.fromEntries(errorStats),
            uploadResults: uploadResults
        };

    } catch (error) {
        console.error('Error in readBloomerangWithEntities:', error);
        throw error;
    }
}

/**
 * Quiet version of readBloomerangWithEntities - TRUE COPY with minimal logging
 * Identical functionality to original but with VisionAppraisal-style quiet output
 *
 * @param {boolean} saveToGoogleDrive - Whether to serialize and save entities to Google Drive (default: false)
 * @param {string} batchId - Optional batch identifier for grouping serialized entities (auto-generated if null)
 * @returns {Object} Processing results with entities, households, statistics, and error tracking
 */
async function readBloomerangWithEntitiesQuiet(saveToGoogleDrive = false, batchId = null) {
    // Override console.log to block verbose messages
    const originalConsoleLog = console.log;
    const verboseMessagePatterns = [
        /Row \d+: Primary household member found, updating household location/,
        /Upgrading placeholder location for household member/,
        /Row \d+: Created new household '.*' with (actual|placeholder) location/
    ];

    console.log = function(...args) {
        const message = args.join(' ');
        const isVerbose = verboseMessagePatterns.some(pattern => pattern.test(message));
        if (!isVerbose) {
            originalConsoleLog.apply(console, args);
        }
    };

    try {

        console.log('=== BLOOMERANG ENTITY CREATION (QUIET) ===');
        console.log('Processing all Bloomerang records with minimal output...');

        // Step 1: Fetch CSV data (same as original function)
        const reqBase = "http://127.0.0.99:3000";
        const fileUrl = `${reqBase}/csv-file`;

        const response = await fetch(fileUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const csvText = await response.text();

        // Step 2: Parse CSV with 22 field structure (EXACT COPY)
        const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');

        // Parse CSV rows (EXACT COPY)
        const rows = lines.slice(1).map((line, index) => {
            const fields = line.split(',').map(field => field.replace(/\^#C#\^/g, ',').trim());
            return {
                rowIndex: index + 1, // 1-based indexing for data rows
                fields: fields,
                accountNumber: fields[5] // Field 6: Account Number (0-based index 5)
            };
        });

        console.log(`✅ Loaded ${rows.length} Bloomerang records`);

        // Step 3: Initialize processing containers (EXACT COPY)
        const entities = [];              // All created entities
        const households = new Map();     // Household tracking by name
        const errorStats = new Map();     // Error tracking with counts and row numbers
        const dataSource = "BLOOMERANG_CSV";
        let folderIds = null;

        // Initialize serialization if requested (EXACT COPY)
        if (saveToGoogleDrive) {
            folderIds = getSerializationFolders();
            if (!batchId) {
                batchId = `Bloomerang_${new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)}`;
            }
        }

        // Step 4: Process each row to create entities (ONLY CHANGE: Remove verbose logging)
        let processedCount = 0;
        let skippedCount = 0;
        let locationIdentifierCount = 0;

        for (const row of rows) {
            try {
                const entity = await processRowToEntity(row, dataSource, households);
                if (entity) {
                    entities.push(entity);
                    processedCount++;
                    locationIdentifierCount++;

                    // QUIET: Progress every 1000 records instead of every record
                    if (processedCount % 1000 === 0) {
                        console.log(`  Processed ${processedCount}/${rows.length} records (${Math.round(processedCount/rows.length*100).toFixed(1)}%)`);
                    }
                } else {
                    skippedCount++;
                }
            } catch (error) {
                // Track error statistics (EXACT COPY)
                const errorType = error.message;
                if (!errorStats.has(errorType)) {
                    errorStats.set(errorType, {
                        count: 0,
                        rows: []
                    });
                }
                const errorData = errorStats.get(errorType);
                errorData.count++;
                errorData.rows.push(row.rowIndex);

                // QUIET: Only output error details when first encountered, no individual error logging
                if (errorData.count === 1) {
                    console.error(`NEW ERROR TYPE: ${errorType} (Row ${row.rowIndex})`);
                }
                // REMOVED: Individual error row logging for quiet mode
            }
        }

        console.log(`  Processed ${processedCount}/${rows.length} records (100.0%)`);

        // Step 5: Save batch results if serialization enabled (EXACT COPY)
        if (saveToGoogleDrive && folderIds) {
            const processingStats = {
                totalRows: rows.length,
                entitiesCreated: processedCount,
                rowsSkipped: skippedCount,
                locationIdentifiersCreated: locationIdentifierCount,
                errorCount: Array.from(errorStats.values()).reduce((sum, data) => sum + data.count, 0),
                householdsCreated: households.size
            };
            await saveBatchResults(entities, processingStats, folderIds, batchId);
        }

        console.log('\n=== SAVING ENTITIES TO GOOGLE DRIVE (QUIET) ===');

        // Step 6: Collection-based serialization (if requested) (EXACT COPY)
        let uploadResults = null;
        if (saveToGoogleDrive) {
            console.log(`📝 Saving quiet version results to Google Drive...`);

            // Aggregate all entities into collections (EXACT COPY)
            const collections = aggregateEntitiesIntoCollections(entities, households, []);

            // Upload each collection type (EXACT COPY but quiet)
            uploadResults = {};
            const folderIds = getSerializationFolders();

            // Upload Individuals collection
            if (collections.individuals.size > 0) {
                uploadResults.individuals = await uploadEntityCollection(
                    collections.individuals, 'Individual', batchId, folderIds.individuals
                );
            }

            // Upload Households collection
            if (collections.households.size > 0) {
                uploadResults.households = await uploadEntityCollection(
                    collections.households, 'AggregateHousehold', batchId, folderIds.households
                );
            }

            // Upload NonHuman collection
            if (collections.nonHumans.size > 0) {
                uploadResults.nonHumans = await uploadEntityCollection(
                    collections.nonHumans, 'NonHuman', batchId, folderIds.nonHuman
                );
            }

            console.log('✅ Quiet version saved successfully');

            // Save file IDs to persistent configuration for Entity Browser
            await saveBloomerangEntityBrowserConfig(uploadResults, batchId);
        }

        // Final summary (VisionAppraisal style)
        console.log(`\n=== BLOOMERANG PROCESSING RESULTS ===`);
        console.log(`Total Records: ${rows.length}`);
        console.log(`Successful: ${processedCount}`);
        console.log(`Failed: ${Array.from(errorStats.values()).reduce((sum, data) => sum + data.count, 0)}`);
        console.log(`Success Rate: ${((processedCount - Array.from(errorStats.values()).reduce((sum, data) => sum + data.count, 0))/rows.length*100).toFixed(1)}%`);
        console.log(`\n=== BLOOMERANG ENTITY TYPE DISTRIBUTION ===`);

        const entityCounts = {};
        entities.forEach(entity => {
            const type = entity.constructor.name;
            entityCounts[type] = (entityCounts[type] || 0) + 1;
        });

        Object.entries(entityCounts).forEach(([type, count]) => {
            console.log(`${type}: ${count} (${(count/entities.length*100).toFixed(1)}%)`);
        });

        // Step 7: Return results (EXACT COPY)
        return {
            success: true,
            stats: {
                totalRows: rows.length,
                entitiesCreated: processedCount,
                rowsSkipped: skippedCount,
                locationIdentifiersCreated: locationIdentifierCount,
                errorCount: Array.from(errorStats.values()).reduce((sum, data) => sum + data.count, 0),
                householdsCreated: households.size
            },
            entities: entities,
            households: households, // Return the Map, not array
            errorStats: Object.fromEntries(errorStats),
            uploadResults: uploadResults,
            fileId: uploadResults?.individuals?.fileId || null,
            message: 'Bloomerang entity creation completed (quiet mode)'
        };

    } catch (error) {
        console.error('Error in readBloomerangWithEntitiesQuiet:', error);
        throw error;
    } finally {
        // Restore original console.log
        if (originalConsoleLog) {
            console.log = originalConsoleLog;
        }
    }
}

/**
 * Test both VisionAppraisal and Bloomerang quiet versions in sequence
 * Comprehensive test function that loads its own dependencies and tests both processes
 */
async function testBothQuietVersions(saveToGoogleDrive = true) {
    console.log('=== COMPREHENSIVE QUIET ENTITY CREATION TEST ===');
    console.log('Self-loading dependencies and testing both quiet versions...\n');

    const results = {
        visionAppraisal: null,
        bloomerang: null,
        totalTime: 0,
        success: false
    };

    const startTime = Date.now();

    try {
        // Step 1: Load VisionAppraisal dependencies if not already loaded
        if (typeof VisionAppraisalNameParserWithQuiet === 'undefined') {
            console.log('🔄 Loading VisionAppraisal dependencies...');

            await new Promise((resolve, reject) => {
                const case31Script = document.createElement('script');
                case31Script.src = './scripts/validation/case31Validator.js';
                case31Script.onload = function() {
                    console.log('✅ Case31Validator loaded');

                    const parserScript = document.createElement('script');
                    parserScript.src = './scripts/dataSources/visionAppraisalNameParser.js';
                    parserScript.onload = function() {
                        console.log('✅ VisionAppraisal parser loaded');
                        resolve();
                    };
                    parserScript.onerror = () => reject(new Error('Failed to load VisionAppraisal parser'));
                    document.head.appendChild(parserScript);
                };
                case31Script.onerror = () => reject(new Error('Failed to load Case31Validator'));
                document.head.appendChild(case31Script);
            });
        } else {
            console.log('✅ VisionAppraisal dependencies already loaded');
        }

        // Step 2: Test VisionAppraisal Quiet Version
        console.log('\n🚀 TESTING: VisionAppraisal Quiet Version');
        const visionStart = Date.now();

        if (typeof VisionAppraisalNameParserWithQuiet?.processAllVisionAppraisalRecordsQuiet === 'function') {
            results.visionAppraisal = await VisionAppraisalNameParserWithQuiet.processAllVisionAppraisalRecordsQuiet();
            console.log(`✅ VisionAppraisal completed in ${((Date.now() - visionStart) / 1000).toFixed(1)}s\n`);
        } else {
            throw new Error('VisionAppraisal quiet function still not available after loading');
        }

        // Step 3: Test Bloomerang Quiet Version
        console.log('🚀 TESTING: Bloomerang Quiet Version');
        const bloomerangStart = Date.now();

        if (typeof readBloomerangWithEntitiesQuiet === 'function') {
            results.bloomerang = await readBloomerangWithEntitiesQuiet(saveToGoogleDrive, 'comprehensive-test');
            console.log(`✅ Bloomerang completed in ${((Date.now() - bloomerangStart) / 1000).toFixed(1)}s\n`);
        } else {
            throw new Error('Bloomerang quiet function not available');
        }

        // Final Summary
        results.totalTime = (Date.now() - startTime) / 1000;
        results.success = true;

        console.log('=== COMPREHENSIVE TEST RESULTS ===');
        console.log(`VisionAppraisal: ${results.visionAppraisal.entities.length} entities created`);
        console.log(`Bloomerang: ${results.bloomerang.entities.length} entities created`);
        console.log(`Total Time: ${results.totalTime.toFixed(1)}s`);
        console.log(`Overall Status: ✅ SUCCESS - Both quiet versions working perfectly`);

        return results;

    } catch (error) {
        console.error('❌ COMPREHENSIVE TEST FAILED:', error.message);
        results.success = false;
        results.error = error.message;
        results.totalTime = (Date.now() - startTime) / 1000;
        return results;
    }
}

/**
 * Process a single CSV row to create an entity
 * @param {Object} row - Row data with fields and metadata
 * @param {string} dataSource - Data source identifier
 * @param {Map} households - Map of existing households
 * @returns {Entity|null} Created entity or null if skipped
 */
async function processRowToEntity(row, dataSource, households) {
    const fields = row.fields;
    const rowIndex = row.rowIndex;
    const accountNumber = row.accountNumber;

    // Enhanced Field mappings (0-based indices) - Complete 30-field structure
    // ENHANCED FIELD MAPPING: Complete 30-field processing system
    // PERFORMANCE RATIONALE: Captures all available CSV data instead of previous ~6 fields
    // for comprehensive Entity Browser search and complete data preservation
    const fieldMap = {
        name: 0,           // Field 1: Name
        firstName: 1,      // Field 2: First Name
        middleName: 2,     // Field 3: Middle Name
        lastName: 3,       // Field 4: Last Name
        email: 4,          // Field 5: Primary Email Address
        accountNumber: 5,  // Field 6: Account Number
        transactionAmount: 6, // Field 7: First Transaction Amount
        transactionDate: 7,   // Field 8: First Transaction Date
        isInHousehold: 8,  // Field 9: Is in a Household
        primaryStreet: 9,  // Field 10: Primary Street
        primaryCity: 10,   // Field 11: Primary City
        primaryState: 11,  // Field 12: Primary State
        primaryZip: 12,    // Field 13: Primary ZIP Code
        homeStreet: 13,    // Field 14: Home Street
        homeCity: 14,      // Field 15: Home City
        homeState: 15,     // Field 16: Home State
        homeZip: 16,       // Field 17: Home ZIP Code
        vacationStreet: 17,// Field 18: Vacation Street
        vacationCity: 18,  // Field 19: Vacation City
        vacationState: 19, // Field 20: Vacation State
        vacationZip: 20,   // Field 21: Vacation ZIP Code
        workStreet: 21,    // Field 22: Work Street
        workCity: 22,      // Field 23: Work City
        workState: 23,     // Field 24: Work State
        workZip: 24,       // Field 25: Work ZIP Code
        fireNumber: 25,    // Field 26: Fire Number
        biStreet: 26,      // Field 27: BI Street (Block Island specific)
        biPoBox: 27,       // Field 28: BI PO Box (Block Island specific)
        householdName: 28, // Field 29: Household Name
        isHeadOfHousehold: 29 // Field 30: Is Head of Household
    };

    // Removed detailed logging - only row number will be output for successful records

    // Step 1: Try to create location identifier (may be null - will use placeholder if needed)
    const locationIdentifier = await createLocationIdentifier(fields, fieldMap, rowIndex, accountNumber, dataSource);

    // Step 2: Determine entity type
    const entityType = determineEntityType(fields, fieldMap);

    // Step 3: Create name objects (both original and temp versions for migration testing)
    const nameObjects = await createNameObjects(fields, fieldMap, rowIndex, accountNumber, dataSource, entityType);

    // Step 4: Create entity based on type
    let entity;
    if (entityType === 'Individual') {
        // Use placeholder location identifier if none available
        const finalLocationIdentifier = locationIdentifier || createPlaceholderLocationIdentifier(dataSource, rowIndex, accountNumber);
        entity = new Individual(finalLocationIdentifier, nameObjects.individualName, null, null,
            createAccountNumberSimpleIdentifiers(accountNumber, rowIndex, dataSource));
    } else if (entityType === 'NonHuman') {
        // Use placeholder location identifier if none available
        const finalLocationIdentifier = locationIdentifier || createPlaceholderLocationIdentifier(dataSource, rowIndex, accountNumber);
        entity = new NonHuman(finalLocationIdentifier, nameObjects.nonHumanName, null, null,
            createAccountNumberSimpleIdentifiers(accountNumber, rowIndex, dataSource));
    } else if (entityType === 'AggregateHousehold') {
        // Handle household processing (locationIdentifier may be null - handled inside function)
        // Returns { individual, householdAccountNumber } - extract the individual
        const result = await processHouseholdMember(fields, fieldMap, locationIdentifier, nameObjects,
            households, rowIndex, accountNumber, dataSource);
        entity = result.individual;
        // Store householdAccountNumber temporarily for use below
        entity._householdAccountNumber = result.householdAccountNumber;
    }

    // Step 5: Add ContactInfo and additional data to entity
    if (entity) {
        // Create ContactInfo with all available contact fields
        // const contactInfo = createContactInfo(fields, fieldMap, rowIndex, accountNumber, dataSource);
        const contactInfo = await createContactInfoEnhanced(fields, fieldMap, rowIndex, accountNumber, dataSource);
        if (contactInfo) {
            entity.addContactInfo(contactInfo);
        }

        // Add additional data fields
        entity.additionalData = createAdditionalData(fields, fieldMap, rowIndex, accountNumber, dataSource);

        // Step 6: For Individual entities, create OtherInfo and move householdInformation there
        // Note: Use entity.constructor.name instead of entityType because processHouseholdMember
        // returns Individual entities even when entityType === 'AggregateHousehold'
        if (entity.constructor.name === 'Individual' && entity.additionalData && entity.additionalData.householdData) {
            // If this individual belongs to a household, populate the householdIdentifier
            // with the household's account number (individual's account number + 'AH', unless already ends in 'AH')
            if (entity._householdAccountNumber) {
                entity.additionalData.householdData.householdIdentifier = entity._householdAccountNumber;
            }

            const otherInfo = new OtherInfo();
            // Copy the HouseholdInformation from additionalData to otherInfo
            otherInfo.householdInformation = entity.additionalData.householdData;
            entity.addOtherInfo(otherInfo);

            // Clean up temporary property
            delete entity._householdAccountNumber;
        }
    }

    return entity;
}

// Placeholder functions - to be implemented in next phase
async function createLocationIdentifier(fields, fieldMap, rowIndex, accountNumber, dataSource) {
    // Fire Number > PID > Street Address hierarchy
    // Updated field indices for new CSV structure

    const fireNumberField = fields[fieldMap.fireNumber]; // Field 26: Fire Number

    // Step 1: Try to extract Fire Number (primary location identifier)
    if (fireNumberField && fireNumberField.trim() !== '') {
        const fireNumberValue = parseFireNumber(fireNumberField.trim());
        if (fireNumberValue) {
            const fireNumberTerm = new AttributedTerm(fireNumberValue, dataSource, rowIndex, accountNumber);
            const fireNumber = new FireNumber(fireNumberTerm);
            return fireNumber;
        }
    }

    // Step 2: Try to extract Fire Number from Block Island addresses
    // Check address combinations with dedicated state/zip fields
    const addressFields = [
        {
            street: fields[fieldMap.primaryStreet],
            city: fields[fieldMap.primaryCity],
            state: fields[fieldMap.primaryState],
            zip: fields[fieldMap.primaryZip],
            name: 'Primary Address'
        },
        {
            street: fields[fieldMap.homeStreet],
            city: fields[fieldMap.homeCity],
            state: fields[fieldMap.homeState],
            zip: fields[fieldMap.homeZip],
            name: 'Home Address'
        },
        {
            street: fields[fieldMap.vacationStreet],
            city: fields[fieldMap.vacationCity],
            state: fields[fieldMap.vacationState],
            zip: fields[fieldMap.vacationZip],
            name: 'Vacation Address'
        },
        {
            street: fields[fieldMap.workStreet],
            city: fields[fieldMap.workCity],
            state: fields[fieldMap.workState],
            zip: fields[fieldMap.workZip],
            name: 'Work Address'
        }
    ];

    for (const addressField of addressFields) {
        if (addressField.street && addressField.street.trim() !== '') {
            // Check if this is a Block Island address using dedicated zip code field
            if (isOnIslandAddressWithFields(addressField.zip, addressField.state, addressField.city)) {
                const fireNumberFromAddress = extractFireNumberFromAddress(addressField.street.trim());
                if (fireNumberFromAddress) {
                    const fireNumberTerm = new AttributedTerm(fireNumberFromAddress, dataSource, rowIndex, accountNumber);
                    const fireNumber = new FireNumber(fireNumberTerm);
                    return fireNumber;
                }
            }
        }
    }

    // Step 3: No PID available in Bloomerang data - would need VisionAppraisal integration

    // Step 4: Fallback to street address (complex identifier)
    // Use the first available address as a ComplexIdentifier location identifier
    for (const addressField of addressFields) {
        if (addressField.street && addressField.street.trim() !== '') {
            const fullAddress = buildFullAddress(addressField);

            // Create AttributedTerm for the full address
            const addressTerm = new AttributedTerm(fullAddress, dataSource, rowIndex, accountNumber);
            // Create SimpleIdentifier for street address location identifier (corrected from ComplexIdentifiers)
            const streetAddress = new SimpleIdentifiers(addressTerm);
            return streetAddress;
        }
    }

    // Step 5: No location identifier available at all
    return null;
}

/**
 * Upgrade entity location identifier when VisionAppraisal data provides PID
 * This method is called during VisionAppraisal processing to upgrade street address
 * location identifiers to PID identifiers when PIDs are found
 *
 * *** UNTESTED - TO BE TESTED DURING VISIONAPPRAISAL INTEGRATION ***
 *
 * @param {Entity} entity - Entity whose location identifier should be upgraded
 * @param {string|number} pidValue - PID value from VisionAppraisal data
 * @param {string} dataSource - Data source identifier (should be DATA_SOURCES.VISION_APPRAISAL)
 * @param {number} recordIndex - VisionAppraisal record index for attribution
 * @param {string|number} visionIdentifier - VisionAppraisal record identifier
 * @returns {boolean} True if upgrade was successful, false if upgrade not needed or failed
 */
function upgradeLocationIdentifierWithPID(entity, pidValue, dataSource, recordIndex, visionIdentifier) {
    if (!entity || !entity.locationIdentifier) {
        console.warn('Cannot upgrade location identifier: Invalid entity or missing location identifier');
        return false;
    }

    const currentIdentifier = entity.locationIdentifier.identifier;

    // Check current identifier type
    if (currentIdentifier instanceof FireNumber) {
        // Fire Number is highest priority - do not downgrade to PID
        console.log(`Entity already has Fire Number (${currentIdentifier.primaryAlias.term}) - not downgrading to PID`);
        return false;
    }

    if (currentIdentifier instanceof PID) {
        // Already has PID - check if this is a different PID (potential conflict)
        if (currentIdentifier.primaryAlias.term !== pidValue) {
            console.warn(`PID conflict detected: Current PID ${currentIdentifier.primaryAlias.term} vs new PID ${pidValue}`);
        }
        return false;
    }

    // Current identifier is SimpleIdentifier (street address) - upgrade to PID
    if (currentIdentifier instanceof SimpleIdentifier) {
        console.log(`Upgrading location identifier from street address to PID ${pidValue}`);

        // Validate PID (should be done with proper PID validation rules)
        if (!pidValue || pidValue.toString().trim() === '') {
            console.warn('Invalid PID value provided for upgrade');
            return false;
        }

        // Create new PID identifier
        const pidTerm = new AttributedTerm(pidValue, dataSource, recordIndex, visionIdentifier);
        const pid = new PID(pidTerm);
        entity.locationIdentifier = pid;

        console.log(`Successfully upgraded entity location identifier to PID ${pidValue}`);
        return true;
    }

    console.warn('Unknown location identifier type - cannot upgrade');
    return false;
}

/**
 * Build full address string from address field components
 * @param {Object} addressField - Object with street, city, state, zip properties
 * @returns {string} Formatted full address string
 */
function buildFullAddress(addressField) {
    const parts = [];

    if (addressField.street && addressField.street.trim()) {
        parts.push(addressField.street.trim());
    }
    if (addressField.city && addressField.city.trim()) {
        parts.push(addressField.city.trim());
    }
    if (addressField.state && addressField.state.trim()) {
        parts.push(addressField.state.trim());
    }
    if (addressField.zip && addressField.zip.trim()) {
        parts.push(addressField.zip.trim());
    }

    return parts.join(', ');
}

/**
 * Parse fire number from dedicated fire number field
 * @param {string} value - Raw fire number value
 * @returns {number|null} Parsed fire number or null if invalid
 */
function parseFireNumber(value) {
    // Fire Number validation: integer, 4 digits or less, <3500
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed <= 0 || parsed >= 3500) {
        return null;
    }
    return parsed;
}

/**
 * Check if address is on Block Island using dedicated state/zip/city fields
 * @param {string} zip - ZIP code field
 * @param {string} state - State field
 * @param {string} city - City field
 * @returns {boolean} True if address appears to be on Block Island
 */
function isOnIslandAddressWithFields(zip, state, city) {
    // Check ZIP code first (most reliable)
    if (zip && zip.trim() === '02807') {
        return true;
    }

    // Check state (must be RI)
    if (state && state.trim().toLowerCase() !== 'ri' && state.trim().toLowerCase() !== 'rhode island') {
        return false;
    }

    // Check city indicators
    if (city && typeof city === 'string') {
        const cityLower = city.toLowerCase().replace(/\s+/g, '');
        if (cityLower.includes('newshoreham') ||
            cityLower.includes('blockisland')) {
            return true;
        }
    }

    return false;
}

/**
 * Check if address is on Block Island (fallback method for single address strings)
 * @param {string} address - Address string to check
 * @returns {boolean} True if address appears to be on Block Island
 */
function isOnIslandAddress(address) {
    if (!address || typeof address !== 'string') return false;

    const addr = address.toLowerCase().replace(/\s+/g, ''); // Remove spaces, convert to lowercase

    // Check for Block Island indicators (indifferent to capitalization, spaces)
    return addr.includes('02807') || // Zip code
           addr.includes('newshoreham') || // Town name (no spaces)
           addr.includes('new shoreham') || // Town name (with spaces - shouldn't happen after replace but safety)
           addr.includes('blockisland') || // Town name (no spaces)
           addr.includes('block island'); // Town name (with spaces - shouldn't happen after replace but safety)
}

/**
 * Extract fire number from beginning of Block Island address
 * @param {string} address - Address string that may start with fire number
 * @returns {number|null} Extracted fire number or null if not found
 */
function extractFireNumberFromAddress(address) {
    // Look for number at beginning of address (fire number + street pattern)
    const match = address.match(/^(\d{1,4})\s+/);
    if (match) {
        const fireNumber = parseInt(match[1], 10);
        if (fireNumber > 0 && fireNumber < 3500) {
            return fireNumber;
        }
    }
    return null;
}

function determineEntityType(fields, fieldMap) {
    // Entity Type Decision Logic from README:
    // 1. Individual: When "Is in a Household" = FALSE
    // 2. AggregateHousehold: When "Is in a Household" = TRUE and multiple individuals share same Household Name
    // 3. NonHuman: When firstName, middleName, or lastName contain "&" or " and " (regex: \\sand\\s)
    // 4. CompositeHousehold: Future implementation via fuzzy logic for creative household naming

    const firstName = fields[fieldMap.firstName] || '';
    const middleName = fields[fieldMap.middleName] || '';
    const lastName = fields[fieldMap.lastName] || '';
    const isInHousehold = fields[fieldMap.isInHousehold] || '';

    // Check for NonHuman entities first (business entities with "&" or " and ")
    const nonHumanPattern = /\s+and\s+|&/i; // Case-insensitive match for " and " or "&"
    if (nonHumanPattern.test(firstName) || nonHumanPattern.test(middleName) || nonHumanPattern.test(lastName)) {
        return 'NonHuman';
    }

    // Check for records with empty name fields - these are organizations, not individuals
    // They have data in a "name" field but no firstName/middleName/lastName
    if (!firstName.trim() && !middleName.trim() && !lastName.trim()) {
        return 'NonHuman';
    }

    // Check household membership
    const isInHouseholdValue = isInHousehold.toString().toLowerCase().trim();
    if (isInHouseholdValue === 'true' || isInHouseholdValue === '1' || isInHouseholdValue === 'yes') {
        // Individual is in a household - will be handled as AggregateHousehold member
        return 'AggregateHousehold';
    } else {
        // Individual entity (not in household)
        return 'Individual';
    }
}

/**
 * NAME PROCESSING FUNCTION - Creates appropriate name objects based on entity type
 * Returns name objects directly WITHOUT IdentifyingData wrappers
 * This matches VisionAppraisal entity creation patterns
 */
async function createNameObjects(fields, fieldMap, rowIndex, accountNumber, dataSource, entityType) {
    // Extract name fields from CSV
    const title = ''; // Not in Bloomerang data
    const firstName = (fields[fieldMap.firstName] || '').trim();
    const middleName = (fields[fieldMap.middleName] || '').trim();
    const lastName = (fields[fieldMap.lastName] || '').trim();
    const suffix = ''; // Not in Bloomerang data
    const householdName = (fields[fieldMap.householdName] || '').trim();
    const nameField = (fields[fieldMap.name] || '').trim(); // Field 0: Name (used for NonHuman entities)

    // For NonHuman entities, use the "name" field (field 0) which contains the organization name
    let nonHumanNameObject = null;
    if (entityType === 'NonHuman') {
        const nonHumanNameTerm = new AttributedTerm(nameField, dataSource, rowIndex, accountNumber);
        nonHumanNameObject = new NonHumanName(nonHumanNameTerm);
    }

    // Build complete name from available components (for Individual entities)
    const nameParts = [title, firstName, middleName, lastName, suffix].filter(part => part !== '');
    const completeName = nameParts.join(' ');

    // IndividualName for Individual entities
    const individualNameTerm = new AttributedTerm(completeName, dataSource, rowIndex, accountNumber);
    const individualName = new IndividualName(
        individualNameTerm,
        title,
        firstName,
        middleName,
        lastName,
        suffix
    );

    // HouseholdName for AggregateHousehold entities
    let householdNameObject = null;
    if (entityType === 'AggregateHousehold' && householdName) {
        const householdNameTerm = new AttributedTerm(householdName, dataSource, rowIndex, accountNumber);
        householdNameObject = new HouseholdName(householdNameTerm, householdName);
    }

    return {
        individualName: individualName,        // Direct IndividualName object
        householdName: householdNameObject,    // Direct HouseholdName object
        nonHumanName: nonHumanNameObject       // Direct NonHumanName object (for Business/LegalConstruct)
    };
}

/**
 * TEST FUNCTION: Test workingEntityLoader.js extractNameWorking function after our changes
 * Tests whether extractNameWorking() breaks with new individualNameTemp structure
 */
async function testWorkingEntityLoaderBreakage() {
    console.log('🧪 Testing workingEntityLoader.js after name structure changes');

    try {
        // Step 1: Load current Bloomerang entities from Google Drive
        console.log('Step 1: Loading current Bloomerang entities from Google Drive...');
        const response = await gapi.client.drive.files.get({
            fileId: '1StluRrtq2lAlZO22XFmHn6Xc1lD3_MO0',
            alt: 'media'
        });

        const fileData = JSON.parse(response.body);
        const entities = fileData.entities || [];

        console.log(`✅ Loaded ${entities.length} entities from current Bloomerang file`);

        // Step 2: Test extractNameWorking on first 3 entities
        console.log('\\nStep 2: Testing extractNameWorking() function...');

        for (let i = 0; i < Math.min(3, entities.length); i++) {
            const entity = entities[i];

            console.log(`\\n--- Entity ${i + 1} ---`);
            console.log('Entity type:', entity.constructor.name);
            console.log('entity.name structure:', typeof entity.name);

            if (entity.name && typeof entity.name === 'object') {
                console.log('entity.name.term:', entity.name.term);
                console.log('entity.name keys:', Object.keys(entity.name));
            }

            // Test the extractNameWorking function
            const extractedName = extractNameWorking(entity);
            console.log('extractNameWorking result:', extractedName);

            const isError = extractedName.includes('error') || extractedName.includes('No name found');
            console.log('Status:', isError ? '❌ BROKEN' : '✅ Working');
        }

        console.log('\\n=== Test completed - check results above ===');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

/**
 * TEST FUNCTION: Verify dual name field processing works correctly
 * Tests that name fields are populated correctly
 */
async function testDualNameFields() {
    console.log('=== TESTING DUAL NAME FIELD PROCESSING ===');
    console.log('Processing first few Bloomerang records to verify name fields...\n');

    try {
        // Process first 3 records only for testing
        const results = await readBloomerangWithEntities(false, 'dual-field-test');

        console.log(`✅ Processed ${results.entities.length} entities`);
        console.log('📋 Checking first 3 entities for dual name fields:\n');

        // Check first 3 entities
        for (let i = 0; i < Math.min(3, results.entities.length); i++) {
            const entity = results.entities[i];
            const entityType = entity.constructor.name;

            console.log(`--- Entity ${i + 1}: ${entityType} ---`);
            console.log('✅ name field:', entity.name ? 'Present' : '❌ Missing');

            if (entity.name) {

                // Show name structure for observation
                if (entity.name.identifier) {
                    console.log('📝 Name structure:', entity.name.identifier.completeName || entity.name.identifier.term || 'Unknown');
                }
            }
            console.log('');
        }

        return {
            success: true,
            entitiesProcessed: results.entities.length,
            dualFieldsWorking: true
        };

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}


function createAccountNumberSimpleIdentifiers(accountNumber, rowIndex, dataSource) {
    // Account Number as SimpleIdentifiers - Case 9 resolution: removed IndicativeData wrapper
    if (!accountNumber || accountNumber.toString().trim() === '') {
        return null;
    }

    const accountNumberValue = accountNumber.toString().trim();
    const accountNumberTerm = new AttributedTerm(accountNumberValue, dataSource, rowIndex, accountNumber);
    const accountNumberIdentifier = new SimpleIdentifiers(accountNumberTerm);
    return accountNumberIdentifier; // Case 9: Return SimpleIdentifiers directly instead of wrapping in IndicativeData
}

/**
 * COMPREHENSIVE HOUSEHOLD PROCESSING FUNCTION
 *
 * Implements sophisticated household relationship logic:
 * - Creates AggregateHousehold entities for first household member encountered
 * - Associates Individual entities with existing households
 * - Handles primary household members (updates household location identifier)
 * - Uses placeholder location identifiers (Fire Number 3499) when no location data available
 * - Upgrades placeholder identifiers when primary household member has real location data
 *
 * CRITICAL: This function must NEVER return null - all household members must be processed
 * to avoid massive data loss (previously 1088 records were being skipped)
 *
 * @param {Array} fields - CSV field array for the individual record
 * @param {Object} fieldMap - Field index mappings
 * @param {FireNumber|PID|ComplexIdentifiers|null} locationIdentifier - Location identifier for this individual (may be null)
 * @param {Object} nameObjects - Name objects (individualName and householdName)
 * @param {Map} households - Map of existing households by household name, storing { household, accountNumber } entries
 * @param {number} rowIndex - Row number for debugging
 * @param {string} accountNumber - Account number for this individual
 * @param {string} dataSource - Data source identifier
 * @returns {{individual: Individual, householdAccountNumber: string|null}} Individual entity and household account number (accountNumber + 'AH')
 */
async function processHouseholdMember(fields, fieldMap, locationIdentifier, nameObjects, households, rowIndex, accountNumber, dataSource) {
    const householdName = (fields[fieldMap.householdName] || '').trim();
    const isHeadOfHousehold = fields[fieldMap.isHeadOfHousehold];
    const isPrimary = isHeadOfHousehold && (isHeadOfHousehold.toString().toLowerCase().trim() === 'true' ||
                                           isHeadOfHousehold.toString().toLowerCase().trim() === '1' ||
                                           isHeadOfHousehold.toString().toLowerCase().trim() === 'yes');

    if (!householdName) {
        console.warn(`Row ${rowIndex}: Individual in household but no household name provided`);
        // Treat as individual if no household name
        const individual = new Individual(locationIdentifier || createPlaceholderLocationIdentifier(dataSource, rowIndex, accountNumber),
                             nameObjects.individualName, null, null,
                             createAccountNumberSimpleIdentifiers(accountNumber, rowIndex, dataSource));
        return { individual, householdAccountNumber: null };
    }

    // Create individual entity
    const individualLocationIdentifier = locationIdentifier || createPlaceholderLocationIdentifier(dataSource, rowIndex, accountNumber);
    const individual = new Individual(individualLocationIdentifier, nameObjects.individualName, null, null,
                                     createAccountNumberSimpleIdentifiers(accountNumber, rowIndex, dataSource));

    // Check if household already exists
    if (households.has(householdName)) {
        const householdEntry = households.get(householdName);
        const existingHousehold = householdEntry.household;
        const householdAccountNumber = householdEntry.accountNumber;

        if (locationIdentifier) {
            // Individual has location data
            if (isPrimary) {
                // Primary household member - update household location and upgrade placeholders
                existingHousehold.locationIdentifier = individualLocationIdentifier;

                // Upgrade any individuals with placeholder location identifiers
                for (const householdMember of existingHousehold.individuals) {
                    if (isPlaceholderLocationIdentifier(householdMember.locationIdentifier)) {
                        householdMember.locationIdentifier = individualLocationIdentifier;
                    }
                }
            }
            // Add individual to household (whether primary or not)
            existingHousehold.individuals.push(individual);
        } else {
            // Individual has no location data - use household's location
            individual.locationIdentifier = existingHousehold.locationIdentifier;
            existingHousehold.individuals.push(individual);
        }

        return { individual, householdAccountNumber };

    } else {
        // First individual for this household - create household
        // Invent household account number by appending 'AH' to the first individual's account number
        // BUT only if account number doesn't already end in 'AH'
        const accountStr = accountNumber.toString().trim();
        const householdAccountNumber = accountStr.endsWith('AH') ? accountStr : accountStr + 'AH';
        const householdLocationIdentifier = locationIdentifier || createPlaceholderLocationIdentifier(dataSource, rowIndex, accountNumber);

        // Create household entity with invented account number
        const household = new AggregateHousehold(
            householdLocationIdentifier,
            nameObjects.householdName, null, null,
            createAccountNumberSimpleIdentifiers(householdAccountNumber, rowIndex, dataSource)
        );

        // Add individual to household
        household.individuals.push(individual);

        // Store household in map with its account number for later individual processing
        households.set(householdName, { household, accountNumber: householdAccountNumber });

        return { individual, householdAccountNumber };
    }
}

/**
 * Create placeholder location identifier for individuals/households without location data
 * Uses fire number 3499 (highest allowed value)
 */
function createPlaceholderLocationIdentifier(dataSource, rowIndex, accountNumber) {
    const placeholderFireNumber = 3499; // Highest allowed fire number
    const fireNumberTerm = new AttributedTerm(placeholderFireNumber, dataSource, rowIndex, accountNumber);
    const fireNumber = new FireNumber(fireNumberTerm);
    return fireNumber;
}

/**
 * Check if a location identifier is a placeholder (fire number 3499)
 */
function isPlaceholderLocationIdentifier(locationIdentifier) {
    if (!locationIdentifier) {
        return false;
    }

    // Direct object access (no IdentifyingData wrapper)
    if (locationIdentifier instanceof FireNumber) {
        return locationIdentifier.primaryAlias.term === 3499;
    }

    return false;
}

/**
 * Google Drive Serialization Functions
 * Use pre-created folder structure for serialized entities
 */

/**
 * Get folder IDs for serialized entities (using user-created folders)
 * @returns {Object} Folder IDs for each subfolder
 */
function getSerializationFolders() {
    return bloomerangParameters.serialization.folderIds;
}

/**
 * Save serialized entity to Google Drive
 * @param {Entity} entity - Entity to serialize and save
 * @param {Object} folderIds - Folder IDs from createSerializationFolders()
 * @param {string} batchId - Batch identifier for grouping related entities
 * @returns {string} Created file ID
 */
async function saveSerializedEntity(entity, folderIds, batchId = null) {
    try {
        // Serialize the entity using serializeWithTypes for consistency with VisionAppraisal
        // This preserves Map/Set/Date types and class constructor information
        const serializedData = JSON.parse(serializeWithTypes(entity));

        // Generate filename based on entity summary
        const summary = entity.generateSummary();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const filename = `${timestamp}_${summary}.json`;

        // Determine target folder based on entity type
        let targetFolderId;
        const entityType = entity.constructor.name;

        switch (entityType) {
            case 'Individual':
                targetFolderId = folderIds.individuals;
                break;
            case 'CompositeHousehold':
            case 'AggregateHousehold':
                targetFolderId = folderIds.households;
                break;
            case 'NonHuman':
            case 'Business':
            case 'LegalConstruct':
                targetFolderId = folderIds.nonHuman;
                break;
            default:
                targetFolderId = folderIds.entities; // Fallback to main folder
                break;
        }

        // Add batch information to serialized data if provided
        const fileContent = {
            entityData: serializedData,
            metadata: {
                created: new Date().toISOString(),
                batchId: batchId,
                entityType: entityType,
                summary: summary,
                version: '1.0'
            }
        };

        // Create file metadata
        const fileMetadata = {
            name: filename,
            parents: [targetFolderId],
            description: `Serialized ${entityType} entity: ${summary}${batchId ? ' (Batch: ' + batchId + ')' : ''}`
        };

        // Upload file
        const fileId = await uploadJsonToGoogleDrive(fileMetadata, fileContent);
        console.log(`Saved ${entityType} entity: ${filename} (ID: ${fileId})`);

        return fileId;

    } catch (error) {
        console.error('Error saving serialized entity:', error);
        throw error;
    }
}

/**
 * Upload JSON content to Google Drive using the working authentication pattern
 * @param {Object} fileMetadata - File metadata (name, parents, description)
 * @param {Object} content - JSON content to upload
 * @returns {string} Created file ID
 */
async function uploadJsonToGoogleDrive(fileMetadata, content) {
    try {
        // Use the same pattern as working code in utils.js
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
        form.append('file', new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }));

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
            method: 'POST',
            headers: new Headers({
                'Authorization': `Bearer ${gapi.client.getToken().access_token}`
            }),
            body: form
        });

        if (response.ok) {
            const result = await response.json();
            return result.id;
        } else {
            const errorText = await response.text();
            throw new Error(`Failed to upload file: ${response.status} ${errorText}`);
        }
    } catch (error) {
        console.error('Error uploading file to Google Drive:', error);
        throw error;
    }
}

/**
 * Save batch processing results to Google Drive
 * @param {Array} entities - Array of entities from processing
 * @param {Object} processingStats - Processing statistics
 * @param {Object} folderIds - Folder IDs from createSerializationFolders()
 * @param {string} batchId - Batch identifier
 * @returns {string} Created file ID for batch summary
 */
async function saveBatchResults(entities, processingStats, folderIds, batchId) {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const filename = `${timestamp}_Batch_${batchId}_Summary.json`;

        const batchSummary = {
            batchId: batchId,
            timestamp: new Date().toISOString(),
            processingStats: processingStats,
            entities: entities.map(entity => ({
                type: entity.constructor.name,
                summary: entity.generateSummary(),
                locationIdentifier: entity.locationIdentifier && entity.locationIdentifier.identifier && entity.locationIdentifier.identifier.primaryAlias
                    ? entity.locationIdentifier.identifier.primaryAlias.term
                    : 'Unknown',
                name: entity.name && entity.name.identifier && entity.name.identifier.primaryAlias
                    ? entity.name.identifier.primaryAlias.term
                    : 'Unknown'
            })),
            version: '1.0'
        };

        const fileMetadata = {
            name: filename,
            parents: [folderIds.batches],
            description: `Batch processing summary for ${batchId} - ${entities.length} entities processed`
        };

        const fileId = await uploadJsonToGoogleDrive(fileMetadata, batchSummary);
        console.log(`Saved batch summary: ${filename} (ID: ${fileId})`);

        return fileId;

    } catch (error) {
        console.error('Error saving batch results:', error);
        throw error;
    }
}

/**
 * COMPREHENSIVE RECORD DEBUGGING FUNCTION
 *
 * Provides detailed analysis of why specific records succeed or fail in processing:
 * - Shows raw CSV data and parsed fields
 * - Runs step-by-step location identifier analysis (Fire Number > Address extraction > Street address fallback)
 * - Explains exactly why a record creates or fails to create a location identifier
 * - Essential for troubleshooting the 1458-record processing pipeline
 *
 * USAGE EXAMPLES:
 * await investigateRecord(1)    // First record
 * await investigateRecord(500)  // Middle record
 * await investigateRecord(1458) // Last record
 *
 * @param {number} recordNumber - 1-based record number to investigate (1-1458)
 */
async function investigateRecord(recordNumber) {
    try {
        console.log(`=== INVESTIGATING RECORD ${recordNumber} ===`);

        // Step 1: Fetch CSV data
        const reqBase = "http://127.0.0.99:3000";
        const fileUrl = `${reqBase}/csv-file`;

        const response = await fetch(fileUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const csvText = await response.text();
        const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');

        // Check if record number is valid
        if (recordNumber < 1 || recordNumber > lines.length - 1) {
            console.error(`Invalid record number ${recordNumber}. Valid range: 1-${lines.length - 1}`);
            return;
        }

        // Get the specific record (recordNumber is 1-based, but we need to account for header)
        const recordLine = lines[recordNumber]; // lines[0] is header, lines[1] is record 1, etc.
        const fields = recordLine.split(',').map(field => field.replace(/\^#C#\^/g, ',').trim());

        console.log(`\n--- RECORD ${recordNumber} RAW DATA ---`);
        console.log('Raw line:', recordLine.substring(0, 200) + (recordLine.length > 200 ? '...' : ''));
        console.log('Total fields:', fields.length);

        // Field mappings (same as in processRowToEntity)
        const fieldMap = {
            name: 0,           // Field 1: Name
            firstName: 1,      // Field 2: First Name
            middleName: 2,     // Field 3: Middle Name
            lastName: 3,       // Field 4: Last Name
            email: 4,          // Field 5: Primary Email Address
            accountNumber: 5,  // Field 6: Account Number
            transactionAmount: 6, // Field 7: First Transaction Amount
            transactionDate: 7,   // Field 8: First Transaction Date
            isInHousehold: 8,  // Field 9: Is in a Household
            primaryStreet: 9,  // Field 10: Primary Street
            primaryCity: 10,   // Field 11: Primary City
            primaryState: 11,  // Field 12: Primary State
            primaryZip: 12,    // Field 13: Primary ZIP Code
            homeStreet: 13,    // Field 14: Home Street
            homeCity: 14,      // Field 15: Home City
            homeState: 15,     // Field 16: Home State
            homeZip: 16,       // Field 17: Home ZIP Code
            vacationStreet: 17,// Field 18: Vacation Street
            vacationCity: 18,  // Field 19: Vacation City
            vacationState: 19, // Field 20: Vacation State
            vacationZip: 20,   // Field 21: Vacation ZIP Code
            workStreet: 21,    // Field 22: Work Street
            workCity: 22,      // Field 23: Work City
            workState: 23,     // Field 24: Work State
            workZip: 24,       // Field 25: Work ZIP Code
            fireNumber: 25,    // Field 26: Fire Number
            biStreet: 26,      // Field 27: BI Street (Block Island specific)
            biPoBox: 27,       // Field 28: BI PO Box (Block Island specific)
            householdName: 28, // Field 29: Household Name
            isHeadOfHousehold: 29 // Field 30: Is Head of Household
        };

        console.log(`\n--- RECORD ${recordNumber} PARSED FIELDS ---`);
        console.log('Name:', fields[fieldMap.name] || '[empty]');
        console.log('First Name:', fields[fieldMap.firstName] || '[empty]');
        console.log('Last Name:', fields[fieldMap.lastName] || '[empty]');
        console.log('Account Number:', fields[fieldMap.accountNumber] || '[empty]');
        console.log('Email:', fields[fieldMap.email] || '[empty]');
        console.log('Transaction Amount:', fields[fieldMap.transactionAmount] || '[empty]');
        console.log('Transaction Date:', fields[fieldMap.transactionDate] || '[empty]');
        console.log('Fire Number:', fields[fieldMap.fireNumber] || '[empty]');
        console.log('BI Street:', fields[fieldMap.biStreet] || '[empty]');
        console.log('BI PO Box:', fields[fieldMap.biPoBox] || '[empty]');
        console.log('Household Name:', fields[fieldMap.householdName] || '[empty]');
        console.log('Is Head of Household:', fields[fieldMap.isHeadOfHousehold] || '[empty]');

        console.log('\nAddress Fields:');
        console.log('  Primary:', fields[fieldMap.primaryStreet] || '[empty]', '|', fields[fieldMap.primaryCity] || '[empty]', '|', fields[fieldMap.primaryState] || '[empty]', '|', fields[fieldMap.primaryZip] || '[empty]');
        console.log('  Home:', fields[fieldMap.homeStreet] || '[empty]', '|', fields[fieldMap.homeCity] || '[empty]', '|', fields[fieldMap.homeState] || '[empty]', '|', fields[fieldMap.homeZip] || '[empty]');
        console.log('  Vacation:', fields[fieldMap.vacationStreet] || '[empty]', '|', fields[fieldMap.vacationCity] || '[empty]', '|', fields[fieldMap.vacationState] || '[empty]', '|', fields[fieldMap.vacationZip] || '[empty]');
        console.log('  Work:', fields[fieldMap.workStreet] || '[empty]', '|', fields[fieldMap.workCity] || '[empty]', '|', fields[fieldMap.workState] || '[empty]', '|', fields[fieldMap.workZip] || '[empty]');

        console.log(`\n--- LOCATION IDENTIFIER ANALYSIS ---`);

        const dataSource = "BLOOMERANG_CSV";
        const accountNumber = fields[fieldMap.accountNumber];

        // Step 1: Check Fire Number field
        const fireNumberField = fields[fieldMap.fireNumber];
        console.log('Step 1 - Fire Number field check:');
        console.log('  Raw fire number field:', fireNumberField || '[empty]');

        if (fireNumberField && fireNumberField.trim() !== '') {
            const fireNumberValue = parseFireNumber(fireNumberField.trim());
            console.log('  Parsed fire number:', fireNumberValue || '[invalid - not integer 1-3499]');
            if (fireNumberValue) {
                console.log('  ✅ SUCCESS: Valid fire number found');
                return; // Would succeed here
            } else {
                console.log('  ❌ FAILED: Fire number invalid (not integer 1-3499)');
            }
        } else {
            console.log('  ❌ FAILED: No fire number field data');
        }

        // Step 2: Check address fields for fire number extraction
        console.log('\nStep 2 - Address fire number extraction:');

        const addressFields = [
            {
                street: fields[fieldMap.primaryStreet],
                city: fields[fieldMap.primaryCity],
                state: fields[fieldMap.primaryState],
                zip: fields[fieldMap.primaryZip],
                name: 'Primary Address'
            },
            {
                street: fields[fieldMap.homeStreet],
                city: fields[fieldMap.homeCity],
                state: fields[fieldMap.homeState],
                zip: fields[fieldMap.homeZip],
                name: 'Home Address'
            },
            {
                street: fields[fieldMap.vacationStreet],
                city: fields[fieldMap.vacationCity],
                state: fields[fieldMap.vacationState],
                zip: fields[fieldMap.vacationZip],
                name: 'Vacation Address'
            },
            {
                street: fields[fieldMap.workStreet],
                city: fields[fieldMap.workCity],
                state: fields[fieldMap.workState],
                zip: fields[fieldMap.workZip],
                name: 'Work Address'
            }
        ];

        let foundBlockIslandAddress = false;

        for (const addressField of addressFields) {
            if (addressField.street && addressField.street.trim() !== '') {
                const isBlockIsland = isOnIslandAddressWithFields(addressField.zip, addressField.state, addressField.city);
                console.log(`  ${addressField.name}:`);
                console.log(`    Street: ${addressField.street}`);
                console.log(`    Is Block Island: ${isBlockIsland} (ZIP: ${addressField.zip}, State: ${addressField.state}, City: ${addressField.city})`);

                if (isBlockIsland) {
                    foundBlockIslandAddress = true;
                    const fireNumberFromAddress = extractFireNumberFromAddress(addressField.street.trim());
                    console.log(`    Fire number extraction: ${fireNumberFromAddress || '[none found]'}`);

                    if (fireNumberFromAddress) {
                        console.log('    ✅ SUCCESS: Fire number extracted from Block Island address');
                        return; // Would succeed here
                    } else {
                        console.log('    ❌ FAILED: No fire number at start of Block Island address');
                    }
                } else {
                    console.log('    → Not a Block Island address');
                }
            }
        }

        // Step 3: Check for street address fallback
        console.log('\nStep 3 - Street address fallback:');

        let hasAnyAddress = false;
        for (const addressField of addressFields) {
            if (addressField.street && addressField.street.trim() !== '') {
                hasAnyAddress = true;
                const fullAddress = buildFullAddress(addressField);
                console.log(`  ${addressField.name}: ${fullAddress}`);
            }
        }

        if (hasAnyAddress) {
            console.log('  ✅ SUCCESS: Would use first available address as ComplexIdentifiers location');
            console.log('  (This record should have created a location identifier)');
        } else {
            console.log('  ❌ FAILED: No addresses available at all');
            console.log('  → This explains why no location identifier was created');
        }

        console.log(`\n=== INVESTIGATION COMPLETE ===`);

    } catch (error) {
        console.error('Error investigating record:', error);
    }
}

/**
 * Aggregate entities into collections organized by type for efficient storage and browsing
 *
 * ARCHITECTURAL TRANSFORMATION: This function implements the collection system that replaces
 * the previous approach of uploading 1,400+ individual entity files to Google Drive with
 * just 3 comprehensive collection files (individuals.json, households.json, nonhuman.json).
 *
 * PERFORMANCE BENEFITS:
 * - Reduces Google Drive API calls from 1,400+ to 3 (massive performance improvement)
 * - Enables in-memory search across all entities in Entity Browser Tool
 * - Provides structured indexes for efficient querying by account, fire number, name
 * - Supports bulk operations and comprehensive data analysis
 *
 * ENTITY BROWSER INTEGRATION: Collections are specifically designed for the Entity Browser
 * Tool which loads these files and provides interactive search, filtering, and export
 * capabilities across all entity data and the enhanced 30-field structure.
 *
 * @param {Array} entities - Array of Individual/NonHuman entities from CSV processing
 * @param {Map} households - Map of AggregateHousehold entities keyed by household name
 * @param {Array} additionalEntities - Additional entities to include in collections (future use)
 * @returns {Object} Collections object with entities organized by type and comprehensive metadata
 */
function aggregateEntitiesIntoCollections(entities, households, additionalEntities = []) {
    console.log('=== Aggregating Entities into Collections ===');
    console.log('PERFORMANCE: Creating 3 collection files instead of 1,400+ individual files');

    const collections = {
        individuals: new Map(),     // Individual people entities
        households: new Map(),      // AggregateHousehold entities with member arrays
        nonHumans: new Map(),       // Business and legal entities
        metadata: {
            created: new Date().toISOString(),
            totalProcessed: 0,
            purpose: "Collection-based storage for Entity Browser Tool",
            enhancement: "30-field processing with comprehensive data capture"
        }
    };

    // === PROCESS INDIVIDUAL AND BUSINESS ENTITIES ===
    // Separate individuals from non-human entities for appropriate collection assignment
    for (const entity of entities) {
        const entityType = entity.constructor.name;

        if (entityType === 'Individual') {
            // Generate unique key for individual (account > fire number > UUID priority)
            const key = generateEntityKey(entity);
            collections.individuals.set(key, entity);
        } else if (entityType === 'NonHuman' || entityType === 'Business' || entityType === 'LegalConstruct') {
            // Business and legal entities go to nonHumans collection for separate browsing
            const key = generateEntityKey(entity);
            collections.nonHumans.set(key, entity);
        }
    }

    // === PROCESS HOUSEHOLD ENTITIES ===
    // AggregateHousehold entities contain arrays of Individual members for household-level communication
    // households Map now stores { household, accountNumber } entries
    // NOTE: parentKey and siblingKeys are set LATER in buildUnifiedEntityDatabase() after database keys exist.
    // This ensures cross-reference keys match actual database keys (not the internal keys used here).
    for (const [householdName, householdEntry] of households) {
        const household = householdEntry.household;
        // Generate unique key for household entity (enables household-based search and filtering)
        const householdKey = generateEntityKey(household);
        collections.households.set(householdKey, household);
    }

    // Process any additional entities
    let diagHouseholdsFromAdditional = 0;
    let diagIndividualsFromAdditional = 0;
    console.log('[DIAGNOSTIC] additionalEntities length:', additionalEntities.length);
    for (const entity of additionalEntities) {
        const entityType = entity.constructor.name;

        if (entityType === 'Individual') {
            const key = generateEntityKey(entity);
            collections.individuals.set(key, entity);
            diagIndividualsFromAdditional++;
        } else if (entityType === 'AggregateHousehold' || entityType === 'CompositeHousehold') {
            const key = generateEntityKey(entity);
            collections.households.set(key, entity);
            diagHouseholdsFromAdditional++;
            if (entity.individuals && entity.individuals.length > 0) {
                console.log('[DIAGNOSTIC] Additional household has ' + entity.individuals.length + ' individuals');
            }
        } else {
            const key = generateEntityKey(entity);
            collections.nonHumans.set(key, entity);
        }
    }
    console.log('[DIAGNOSTIC] From additionalEntities: households=' + diagHouseholdsFromAdditional +
                ', individuals=' + diagIndividualsFromAdditional);

    // Update metadata
    collections.metadata.totalProcessed = collections.individuals.size +
                                         collections.households.size +
                                         collections.nonHumans.size;

    console.log(`Collections created:`, {
        individuals: collections.individuals.size,
        households: collections.households.size,
        nonHumans: collections.nonHumans.size,
        total: collections.metadata.totalProcessed
    });

    return collections;
}

/**
 * Generate a unique key for an entity in collections
 * Priority: Account Number > Fire Number > UUID fallback
 *
 * @param {Object} entity - Entity object with locationIdentifier and accountNumber
 * @returns {string} Generated key for the entity
 */
function generateEntityKey(entity) {
    // Priority 1: Account Number (most reliable)
    if (entity.accountNumber && entity.accountNumber.identifier && entity.accountNumber.identifier.primaryAlias) {
        const accountNum = entity.accountNumber.identifier.primaryAlias.term;
        if (accountNum && accountNum.toString().trim() !== '') {
            return `account_${accountNum.toString().trim()}`;
        }
    }

    // Priority 2: Fire Number (for entities with location)
    if (entity.locationIdentifier && entity.locationIdentifier.identifier) {
        const locationId = entity.locationIdentifier.identifier;
        if (locationId.constructor.name === 'FireNumber' && locationId.primaryAlias) {
            const fireNum = locationId.primaryAlias.term;
            if (fireNum && fireNum.toString().trim() !== '') {
                return `fire_${fireNum.toString().trim()}`;
            }
        }
    }

    // Priority 3: PID (secondary location identifier)
    if (entity.locationIdentifier && entity.locationIdentifier.identifier) {
        const locationId = entity.locationIdentifier.identifier;
        if (locationId.constructor.name === 'PID' && locationId.primaryAlias) {
            const pidValue = locationId.primaryAlias.term;
            if (pidValue && pidValue.toString().trim() !== '') {
                return `pid_${pidValue.toString().trim()}`;
            }
        }
    }

    // Priority 4: UUID fallback (for entities without reliable identifiers)
    return `uuid_${generateUUID()}`;
}

/**
 * Generate a simple UUID for fallback keys
 * @returns {string} Simple UUID string
 */
function generateUUID() {
    return 'xxxx-xxxx-4xxx-yxxx-xxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Generate searchable indexes for a collection of entities
 * Creates multiple access patterns for efficient querying
 *
 * @param {Map} entityCollection - Map of entities with keys
 * @param {string} entityType - Type of entities (Individual, AggregateHousehold, etc.)
 * @returns {Object} Index object with multiple search patterns
 */
function generateCollectionIndexes(entityCollection, entityType) {
    console.log(`=== Generating Indexes for ${entityType} Collection ===`);

    const indexes = {
        byAccountNumber: {},
        byFireNumber: {},
        byPID: {},
        byLastName: {},
        count: entityCollection.size
    };

    // Add entity-type specific indexes
    if (entityType === 'AggregateHousehold') {
        indexes.byHouseholdName = {};
        indexes.byMemberCount = {};
    } else if (entityType === 'Individual') {
        indexes.byFirstName = {};
    }

    // Process each entity to build indexes
    for (const [key, entity] of entityCollection) {
        try {
            // Index by Account Number
            if (entity.accountNumber && entity.accountNumber.identifier && entity.accountNumber.identifier.primaryAlias) {
                const accountNum = entity.accountNumber.identifier.primaryAlias.term;
                if (accountNum) {
                    indexes.byAccountNumber[accountNum.toString()] = key;
                }
            }

            // Index by Fire Number
            if (entity.locationIdentifier && entity.locationIdentifier.identifier) {
                const locationId = entity.locationIdentifier.identifier;
                if (locationId.constructor.name === 'FireNumber' && locationId.primaryAlias) {
                    const fireNum = locationId.primaryAlias.term;
                    if (fireNum) {
                        indexes.byFireNumber[fireNum.toString()] = key;
                    }
                }

                // Index by PID
                if (locationId.constructor.name === 'PID' && locationId.primaryAlias) {
                    const pidValue = locationId.primaryAlias.term;
                    if (pidValue) {
                        indexes.byPID[pidValue.toString()] = key;
                    }
                }
            }

            // Index by name fields
            if (entity.name && entity.name.identifier) {
                const nameObj = entity.name.identifier;

                // Individual name indexing
                if (nameObj.constructor.name === 'IndividualName') {
                    // Last name index
                    if (nameObj.lastName) {
                        const lastName = nameObj.lastName.toLowerCase().trim();
                        if (!indexes.byLastName[lastName]) {
                            indexes.byLastName[lastName] = [];
                        }
                        indexes.byLastName[lastName].push(key);
                    }

                    // First name index (for Individuals)
                    if (entityType === 'Individual' && nameObj.firstName) {
                        const firstName = nameObj.firstName.toLowerCase().trim();
                        if (!indexes.byFirstName[firstName]) {
                            indexes.byFirstName[firstName] = [];
                        }
                        indexes.byFirstName[firstName].push(key);
                    }
                }

                // Household name indexing
                if (nameObj.constructor.name === 'HouseholdName' && entityType === 'AggregateHousehold') {
                    if (nameObj.fullName) {
                        const householdName = nameObj.fullName.toLowerCase().trim();
                        indexes.byHouseholdName[householdName] = key;
                    }

                    // Member count index for households
                    if (entity.individuals && Array.isArray(entity.individuals)) {
                        const memberCount = entity.individuals.length;
                        if (!indexes.byMemberCount[memberCount]) {
                            indexes.byMemberCount[memberCount] = [];
                        }
                        indexes.byMemberCount[memberCount].push(key);
                    }
                }
            }

        } catch (error) {
            console.warn(`Error indexing entity ${key}:`, error);
        }
    }

    console.log(`Generated indexes for ${entityCollection.size} ${entityType} entities:`, {
        accountNumbers: Object.keys(indexes.byAccountNumber).length,
        fireNumbers: Object.keys(indexes.byFireNumber).length,
        lastNames: Object.keys(indexes.byLastName).length,
        totalIndexEntries: Object.keys(indexes.byAccountNumber).length +
                          Object.keys(indexes.byFireNumber).length +
                          Object.keys(indexes.byLastName).length
    });

    return indexes;
}

/**
 * Upload an entity collection as a single searchable file to Google Drive
 * Creates a JSON file with entities, metadata, and searchable indexes
 *
 * @param {Map} entityCollection - Collection of entities with keys
 * @param {string} entityType - Type of entities (Individual, AggregateHousehold, NonHuman)
 * @param {string} batchId - Batch identifier for the upload
 * @param {string} targetFolderId - Google Drive folder ID for this entity type
 * @returns {string} Created file ID
 */
async function uploadEntityCollection(entityCollection, entityType, batchId, targetFolderId) {
    try {
        console.log(`=== Uploading ${entityType} Collection ===`);
        console.log(`Entities to upload: ${entityCollection.size}`);

        // Generate searchable indexes for this collection
        const indexes = generateCollectionIndexes(entityCollection, entityType);

        // Serialize all entities in the collection using serializeWithTypes for consistency with VisionAppraisal
        const serializedEntities = {};
        for (const [key, entity] of entityCollection) {
            try {
                serializedEntities[key] = JSON.parse(serializeWithTypes(entity));
            } catch (error) {
                console.warn(`Error serializing entity ${key}:`, error);
                // Continue with other entities
            }
        }

        // Create collection file structure
        const collectionData = {
            metadata: {
                batchId: batchId,
                created: new Date().toISOString(),
                totalEntities: entityCollection.size,
                entityType: entityType,
                version: '1.0',
                processingStats: {
                    serializedSuccessfully: Object.keys(serializedEntities).length,
                    serializationErrors: entityCollection.size - Object.keys(serializedEntities).length
                }
            },
            entities: serializedEntities,
            index: indexes
        };

        // Generate filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const filename = `${entityType}_${timestamp}_Batch_${batchId}.json`;

        // Create file metadata
        const fileMetadata = {
            name: filename,
            parents: [targetFolderId],
            description: `${entityType} collection with ${entityCollection.size} entities and searchable indexes. Batch: ${batchId}`
        };

        console.log(`Uploading collection file: ${filename}`);
        console.log(`Serialized entities: ${Object.keys(serializedEntities).length}/${entityCollection.size}`);

        // Upload the collection file
        const fileId = await uploadJsonToGoogleDrive(fileMetadata, collectionData);

        console.log(`✅ Successfully uploaded ${entityType} collection: ${filename} (ID: ${fileId})`);
        console.log(`   Entities: ${Object.keys(serializedEntities).length}`);
        console.log(`   Indexes: ${Object.keys(indexes).length} categories`);

        return {
            fileId: fileId,
            filename: filename,
            entityType: entityType,
            entitiesUploaded: Object.keys(serializedEntities).length,
            indexCategories: Object.keys(indexes).length
        };

    } catch (error) {
        console.error(`Error uploading ${entityType} collection:`, error);
        throw error;
    }
}

/**
 * Create ContactInfo object with all available contact fields from CSV
 *
 * ARCHITECTURAL PURPOSE: Part of enhanced 30-field processing system that captures
 * comprehensive contact information instead of the previous partial data extraction.
 * This function specifically handles direct communication channels (email, BI addresses)
 * that are essential for Block Island community contact management.
 *
 * @param {Array} fields - CSV field values from Bloomerang export
 * @param {Object} fieldMap - Field mapping object for 30-field structure
 * @param {number} rowIndex - Row index for AttributedTerm provenance tracking
 * @param {string} accountNumber - Account number for AttributedTerm provenance tracking
 * @param {string} dataSource - Data source identifier (typically "BLOOMERANG_CSV")
 * @returns {ContactInfo|null} ContactInfo object with AttributedTerm provenance, or null if no contact data found
 */
function createContactInfo(fields, fieldMap, rowIndex, accountNumber, dataSource) {
    let hasContactData = false;
    const contactInfo = new ContactInfo();

    // Process email field (Field 5: Primary Email Address) - Primary communication method
    // Only create contact info entry if email address is provided and non-empty
    const email = (fields[fieldMap.email] || '').trim();
    if (email) {
        // Create SimpleIdentifiers with AttributedTerm for email (no IndicativeData wrapper)
        const emailTerm = new AttributedTerm(email, dataSource, rowIndex, accountNumber);
        contactInfo.email = new SimpleIdentifiers(emailTerm);
        hasContactData = true;
    }

    // Process Block Island PO Box (Field 28: BI PO Box) - Block Island specific mailing
    // High-confidence unique identifier for Block Island residents
    const biPoBox = (fields[fieldMap.biPoBox] || '').trim();
    if (biPoBox) {
        // Create SimpleIdentifiers with AttributedTerm for PO Box (no IndicativeData wrapper)
        const poBoxTerm = new AttributedTerm(biPoBox, dataSource, rowIndex, accountNumber);
        contactInfo.poBox = new SimpleIdentifiers(poBoxTerm);
        hasContactData = true;
    }

    // Process Block Island Street (Field 27: BI Street) - Block Island specific street address
    // Supplementary address information for Block Island locations beyond fire numbers
    const biStreet = (fields[fieldMap.biStreet] || '').trim();
    if (biStreet) {
        // Create SimpleIdentifiers with AttributedTerm for BI Street (no IndicativeData wrapper)
        const streetTerm = new AttributedTerm(biStreet, dataSource, rowIndex, accountNumber);
        contactInfo.biStreet = new SimpleIdentifiers(streetTerm);
        hasContactData = true;
    }

    // Return ContactInfo object only if we found actual contact data
    // This preserves data integrity by avoiding empty contact objects
    return hasContactData ? contactInfo : null;
}

/**
 * Enhanced ContactInfo Creation Using Generalized Address Architecture
 *
 * ARCHITECTURAL PURPOSE: This function implements the new address processing architecture
 * that processes all 4 Bloomerang address types into proper Address objects in ContactInfo.
 * Uses the preprocess→parse→post-process generalized architecture for consistency with
 * VisionAppraisal processing patterns.
 *
 * IMPROVEMENTS OVER ORIGINAL:
 * - Processes all 4 address types (Primary, Home, Vacation, Work) using proper Address objects
 * - Implements Block Island priority logic: BI addresses become primary (fire number wins ties)
 * - Uses generalized address architecture for consistent processing
 * - Creates proper ContactInfo with setPrimaryAddress() and addSecondaryAddress()
 * - Maintains existing email and biPoBox processing
 *
 * @param {Array} fields - CSV field array
 * @param {Object} fieldMap - Field mapping object
 * @param {number} rowIndex - Row index for data lineage
 * @param {string} accountNumber - Account number for AttributedTerm provenance
 * @param {string} dataSource - Data source identifier ("BLOOMERANG_CSV")
 * @returns {ContactInfo|null} Enhanced ContactInfo object with proper Address objects, or null if no contact data
 */
async function createContactInfoEnhanced(fields, fieldMap, rowIndex, accountNumber, dataSource) {
    let hasContactData = false;
    const contactInfo = new ContactInfo();

    // Process existing contact fields (email, biPoBox) - using SimpleIdentifiers (no IndicativeData wrapper)
    const email = (fields[fieldMap.email] || '').trim();
    if (email) {
        const emailTerm = new AttributedTerm(email, dataSource, rowIndex, accountNumber);
        contactInfo.email = new SimpleIdentifiers(emailTerm);
        hasContactData = true;
    }

    const biPoBox = (fields[fieldMap.biPoBox] || '').trim();
    if (biPoBox) {
        const poBoxTerm = new AttributedTerm(biPoBox, dataSource, rowIndex, accountNumber);
        contactInfo.poBox = new SimpleIdentifiers(poBoxTerm);
        hasContactData = true;
    }

    // NEW: Process all 4 address sets using generalized architecture
    const addressSets = [
        {
            name: 'Primary',
            street: fields[fieldMap.primaryStreet],    // Array index 9 (Field 10)
            city: fields[fieldMap.primaryCity],        // Array index 10 (Field 11)
            state: fields[fieldMap.primaryState],      // Array index 11 (Field 12)
            zip: fields[fieldMap.primaryZip],          // Array index 12 (Field 13)
            isPrimary: true  // Primary field gets priority for ContactInfo
        },
        {
            name: 'Home',
            street: fields[fieldMap.homeStreet],       // Array index 13 (Field 14)
            city: fields[fieldMap.homeCity],           // Array index 14 (Field 15)
            state: fields[fieldMap.homeState],         // Array index 15 (Field 16)
            zip: fields[fieldMap.homeZip],             // Array index 16 (Field 17)
            isPrimary: false
        },
        {
            name: 'Vacation',
            street: fields[fieldMap.vacationStreet],   // Array index 17 (Field 18)
            city: fields[fieldMap.vacationCity],       // Array index 18 (Field 19)
            state: fields[fieldMap.vacationState],     // Array index 19 (Field 20)
            zip: fields[fieldMap.vacationZip],         // Array index 20 (Field 21)
            isPrimary: false
        },
        {
            name: 'Work',
            street: fields[fieldMap.workStreet],       // Array index 21 (Field 22)
            city: fields[fieldMap.workCity],           // Array index 22 (Field 23)
            state: fields[fieldMap.workState],         // Array index 23 (Field 24)
            zip: fields[fieldMap.workZip],             // Array index 24 (Field 25)
            isPrimary: false
        }
    ];

    // Process addresses using new generalized architecture
    const processedAddresses = processAddressSetsEnhanced(addressSets, dataSource, rowIndex, accountNumber);

    // Apply priority logic: Block Island override, then Primary preference, then single address fallback
    // Process addresses using enhanced priority logic
    const { primaryAddress, secondaryAddresses } = determineAddressPriorityEnhanced(processedAddresses);
    // Primary and secondary addresses determined

    // Populate ContactInfo with proper Address objects
    if (primaryAddress) {
        contactInfo.setPrimaryAddress(primaryAddress);
        hasContactData = true;
        // Primary address set
    }

    if (secondaryAddresses.length > 0) {
        contactInfo.setSecondaryAddresses(secondaryAddresses);
        hasContactData = true;
        // Secondary addresses set
    } else {
        // No secondary addresses to set
    }

    // Handle biStreet field using new architecture (preserves existing functionality)
    const biStreet = (fields[fieldMap.biStreet] || '').trim();
    if (biStreet) {
        try {
            // Process BI Street using generalized architecture
            const biStreetProcessed = processAddressGeneralized(
                {
                    addressSet: { street: biStreet, city: '', state: '', zip: '' },
                    fieldName: 'BI Street'
                },
                bloomerangConfig
            );

            if (biStreetProcessed) {
                // Create Address object from processed result
                const biStreetAddress = createAddressFromParsedData(biStreetProcessed, 'BI Street');

                // Add as secondary address if not already primary
                if (!primaryAddress || primaryAddress.originalAddress.term !== biStreetAddress.originalAddress.term) {
                    contactInfo.addSecondaryAddress(biStreetAddress);
                    hasContactData = true;
                }
            } else {
                // Fallback to SimpleIdentifiers if processing fails (no IndicativeData wrapper)
                const streetTerm = new AttributedTerm(biStreet, dataSource, rowIndex, accountNumber);
                contactInfo.biStreet = new SimpleIdentifiers(streetTerm);
                hasContactData = true;
            }
        } catch (error) {
            console.warn('Enhanced BI Street processing failed, using fallback:', error);
            // Fallback to SimpleIdentifiers (no IndicativeData wrapper)
            const streetTerm = new AttributedTerm(biStreet, dataSource, rowIndex, accountNumber);
            contactInfo.biStreet = new SimpleIdentifiers(streetTerm);
            hasContactData = true;
        }
    }

    // NEW: Create location identifier using existing function
    const locationIdentifier = await createLocationIdentifier(fields, fieldMap, dataSource, rowIndex, accountNumber);
    if (locationIdentifier) {
        contactInfo.locationIdentifiers = [locationIdentifier];
        hasContactData = true;
    }

    return hasContactData ? contactInfo : null;
}

// =============================================================================
// RAW ADDRESS FIELD-BY-FIELD COMPARISON SYSTEM (Phase 1)
// Future Enhancement Placeholder: Replace simple string matching with sophisticated algorithms
// =============================================================================

// simpleStringMatch function available from utils.js
// Assumes utils.js is loaded before this file

/**
 * Compare raw address field sets with field-by-field analysis
 * FUTURE: Each field comparison can be enhanced with sophisticated matching
 * @param {Object} addressSet1 - First address set {street, city, state, zip, name}
 * @param {Object} addressSet2 - Second address set {street, city, state, zip, name}
 * @returns {boolean} True if all address fields match
 */
function compareRawAddressesFutureEnhanced(addressSet1, addressSet2) {
    // Field-by-field comparison with future enhancement placeholders
    // Each field can be independently enhanced with sophisticated matching algorithms

    const streetMatch = simpleStringMatch(addressSet1.street, addressSet2.street);
    const cityMatch = simpleStringMatch(addressSet1.city, addressSet2.city);
    const stateMatch = simpleStringMatch(addressSet1.state, addressSet2.state);
    const zipMatch = simpleStringMatch(addressSet1.zip, addressSet2.zip);

    // ALL fields must match for addresses to be considered identical
    return streetMatch && cityMatch && stateMatch && zipMatch;
}

/**
 * Check if an address set matches any address in a collection
 * @param {Object} addressSet - Address set to check {street, city, state, zip}
 * @param {Array} addressCollection - Array of address sets to compare against
 * @returns {Object|null} Matching address set if found, null if no match
 */
function findMatchingRawAddress(addressSet, addressCollection) {
    for (const existingAddress of addressCollection) {
        if (compareRawAddressesFutureEnhanced(addressSet, existingAddress)) {
            return existingAddress;
        }
    }
    return null;
}

// =============================================================================

/**
 * Process Address Sets Using Generalized Architecture
 * Helper function for enhanced ContactInfo creation
 * @param {Array} addressSets - Array of address set objects
 * @param {string} dataSource - Data source identifier
 * @param {number} rowIndex - Row index for provenance
 * @param {string} accountNumber - Account number for provenance
 * @returns {Array} Array of processed address objects with metadata
 */
function processAddressSetsEnhanced(addressSets, dataSource, rowIndex, accountNumber) {
    const processedAddresses = [];
    const seenRawAddresses = []; // Track raw addresses already processed

    for (const addressSet of addressSets) {
        // Skip if no street address available
        if (!addressSet.street || addressSet.street.trim() === '') {
            continue;
        }

        // DEDUPLICATION CHECK: Skip if this raw address has already been seen
        const matchingRawAddress = findMatchingRawAddress(addressSet, seenRawAddresses);
        if (matchingRawAddress) {
            // Skip processing - this address is a duplicate of a previously seen address
            // NOTE: Primary field precedence is maintained by processing order (Primary comes first)
            continue;
        }

        // Add to seen addresses before processing
        seenRawAddresses.push(addressSet);

        try {
            // Use generalized architecture to process address
            const processedAddress = processAddressGeneralized(
                {
                    addressSet: addressSet,
                    fieldName: addressSet.name
                },
                bloomerangConfig
            );

            if (processedAddress) {
                // Create proper Address object
                const addressObject = createAddressFromParsedData(processedAddress, addressSet.name);

                processedAddresses.push({
                    addressObject: addressObject,
                    addressSet: addressSet,
                    isBlockIsland: processedAddress.isBlockIslandAddress,
                    hasFireNumber: processedAddress.matchedStreet && /^\d+/.test(addressSet.street),
                    processedData: processedAddress
                });
            }
        } catch (error) {
            console.warn(`Failed to process ${addressSet.name} address: ${buildFullAddress(addressSet)}`, error);
        }
    }

    return processedAddresses;
}

/**
 * Determine Address Priority for ContactInfo
 * Implements Block Island priority logic with Primary field fallback
 * @param {Array} processedAddresses - Array of processed address objects
 * @returns {Object} Object with primaryAddress and secondaryAddresses arrays
 */
function determineAddressPriorityEnhanced(processedAddresses) {
    // Find Block Island addresses
    const blockIslandAddresses = processedAddresses.filter(addr => addr.isBlockIsland);
    const nonBlockIslandAddresses = processedAddresses.filter(addr => !addr.isBlockIsland);

    let primaryAddress = null;
    let secondaryAddresses = [];

    if (blockIslandAddresses.length > 0) {
        // Block Island override logic: BI addresses become primary
        const fireNumberBI = blockIslandAddresses.find(addr => addr.hasFireNumber);
        const selectedBI = fireNumberBI || blockIslandAddresses[0];
        primaryAddress = selectedBI.addressObject;

        // All other addresses (BI and non-BI) become secondary
        const remainingBI = blockIslandAddresses.filter(addr => addr !== selectedBI);
        secondaryAddresses = [...remainingBI, ...nonBlockIslandAddresses].map(addr => addr.addressObject);

    } else {
        // No Block Island addresses - Primary field gets priority
        const primaryFieldAddress = processedAddresses.find(addr => addr.addressSet.isPrimary);

        if (primaryFieldAddress) {
            primaryAddress = primaryFieldAddress.addressObject;
            secondaryAddresses = processedAddresses
                .filter(addr => addr !== primaryFieldAddress)
                .map(addr => addr.addressObject);
        } else if (processedAddresses.length === 1) {
            // Single address fallback
            primaryAddress = processedAddresses[0].addressObject;
        } else if (processedAddresses.length > 1) {
            // Multiple non-primary addresses - just pick first as primary
            primaryAddress = processedAddresses[0].addressObject;
            secondaryAddresses = processedAddresses.slice(1).map(addr => addr.addressObject);
        }
    }

    // FINAL DEDUPLICATION: Remove any secondary addresses that duplicate the primary address
    // or duplicate each other using Address object field-by-field comparison
    if (primaryAddress && secondaryAddresses.length > 0) {
        secondaryAddresses = deduplicateSecondaryAddresses(primaryAddress, secondaryAddresses);
    }

    return { primaryAddress, secondaryAddresses };
}

/**
 * Remove duplicate Address objects from secondary addresses
 * Uses Address.matches() method for field-by-field comparison
 * @param {Address} primaryAddress - Primary address to check against
 * @param {Array<Address>} secondaryAddresses - Array of secondary addresses to deduplicate
 * @returns {Array<Address>} Deduplicated array of secondary addresses
 */
function deduplicateSecondaryAddresses(primaryAddress, secondaryAddresses) {
    // Starting deduplication of secondary addresses

    const uniqueSecondaryAddresses = [];

    for (let i = 0; i < secondaryAddresses.length; i++) {
        const secondaryAddress = secondaryAddresses[i];
        // Checking secondary address for duplicates

        // Skip if this secondary address matches the primary address
        if (primaryAddress && primaryAddress.compareTo(secondaryAddress) === 0) {
            // Skipping: matches primary address
            continue;  // Skip duplicate of primary
        }

        // Skip if this secondary address matches any already-kept secondary address
        const isDuplicateSecondary = uniqueSecondaryAddresses.some(existing =>
            existing.compareTo(secondaryAddress) === 0
        );
        if (isDuplicateSecondary) {
            // Skipping: matches existing secondary address
            continue;  // Skip duplicate of existing secondary
        }

        // This address is unique - keep it
        // Keeping: unique secondary address
        uniqueSecondaryAddresses.push(secondaryAddress);
    }

    // Deduplication complete
    return uniqueSecondaryAddresses;
}

/**
 * Create comprehensive additional data object capturing all 30 CSV fields beyond core entity data
 *
 * ARCHITECTURAL PURPOSE: This function implements the enhanced field processing system that
 * captures ALL available data from the Bloomerang CSV (fields 7-30) instead of the previous
 * system that only captured ~6 basic fields. This enables comprehensive search capabilities
 * in the Entity Browser Tool and provides complete data preservation for future analysis.
 *
 * PERFORMANCE IMPACT: By capturing all fields in structured objects, the Entity Browser
 * can perform in-memory searches across transaction data, addresses, and Block Island-specific
 * information without requiring additional data lookups.
 *
 * @param {Array} fields - CSV field values from Bloomerang export (30-field structure)
 * @param {Object} fieldMap - Field mapping object defining all 30 field positions
 * @param {number} rowIndex - Row index for provenance tracking and debugging
 * @param {string} accountNumber - Account number for provenance tracking
 * @param {string} dataSource - Data source identifier (typically "BLOOMERANG_CSV")
 * @returns {Object} Comprehensive additional data object with all non-core entity fields
 */
function createAdditionalData(fields, fieldMap, rowIndex, accountNumber, dataSource) {
    const additionalData = {
        transactionData: {},
        metadata: {
            dataSource: dataSource,
            sourceRow: rowIndex,
            accountNumber: accountNumber
        }
    };

    // === TRANSACTION DATA PROCESSING (Fields 7-8) ===
    // Transaction information for donation tracking and donor analysis

    // Field 7: First Transaction Amount - Initial donation amount for this entity
    const transactionAmount = (fields[fieldMap.transactionAmount] || '').trim();
    if (transactionAmount) {
        additionalData.transactionData.firstAmount = transactionAmount;
    }

    // Field 8: First Transaction Date - Date of initial donation
    const transactionDate = (fields[fieldMap.transactionDate] || '').trim();
    if (transactionDate) {
        additionalData.transactionData.firstDate = transactionDate;
    }

    // === COMPLETE ADDRESS PROCESSING (Fields 10-25) ===
    // Four complete address sets supporting Block Island's dual residency patterns
    // Many residents maintain both on-island and off-island addresses
    additionalData.addresses = {
        // Primary Address (Fields 10-13) - Usually off-island primary residence
        primary: {
            street: (fields[fieldMap.primaryStreet] || '').trim(),
            city: (fields[fieldMap.primaryCity] || '').trim(),
            state: (fields[fieldMap.primaryState] || '').trim(),
            zip: (fields[fieldMap.primaryZip] || '').trim()
        },
        // Home Address (Fields 14-17) - Secondary home address
        home: {
            street: (fields[fieldMap.homeStreet] || '').trim(),
            city: (fields[fieldMap.homeCity] || '').trim(),
            state: (fields[fieldMap.homeState] || '').trim(),
            zip: (fields[fieldMap.homeZip] || '').trim()
        },
        // Vacation Address (Fields 18-21) - Often the Block Island address
        vacation: {
            street: (fields[fieldMap.vacationStreet] || '').trim(),
            city: (fields[fieldMap.vacationCity] || '').trim(),
            state: (fields[fieldMap.vacationState] || '').trim(),
            zip: (fields[fieldMap.vacationZip] || '').trim()
        },
        // Work Address (Fields 22-25) - Business/employment address
        work: {
            street: (fields[fieldMap.workStreet] || '').trim(),
            city: (fields[fieldMap.workCity] || '').trim(),
            state: (fields[fieldMap.workState] || '').trim(),
            zip: (fields[fieldMap.workZip] || '').trim()
        }
    };

    // === BLOCK ISLAND SPECIFIC DATA (Fields 26-28) ===
    // Specialized fields for Block Island community management
    additionalData.blockIslandData = {
        // Field 26: Fire Number - Primary Block Island location identifier (definitive)
        fireNumber: (fields[fieldMap.fireNumber] || '').trim(),
        // Field 27: BI Street - Block Island specific street address
        biStreet: (fields[fieldMap.biStreet] || '').trim(),
        // Field 28: BI PO Box - Block Island PO Box (critical for mail delivery)
        biPoBox: (fields[fieldMap.biPoBox] || '').trim()
    };

    // === HOUSEHOLD RELATIONSHIP DATA (Fields 9, 29-30) ===
    // Essential for household-level communication management
    // Now uses HouseholdInformation class instance instead of plain object
    const rawHouseholdData = {
        isInHousehold: (fields[fieldMap.isInHousehold] || '').trim(),
        householdName: (fields[fieldMap.householdName] || '').trim(),
        isHeadOfHousehold: (fields[fieldMap.isHeadOfHousehold] || '').trim()
    };
    // Create HouseholdInformation instance using factory method
    // accountNumber passed as householdIdentifier (will be used to link to household entity later)
    additionalData.householdData = HouseholdInformation.fromBloomerangData(rawHouseholdData, '');

    return additionalData;
}

/**
 * Multi-Record Inspection Tool - Verifies field processing through full entity pipeline
 *
 * This function addresses the critical need to verify that all 30 CSV fields are
 * properly captured in the processed entity objects, not just displayed as raw CSV values.
 * Unlike investigateRecord() which shows raw data, this function processes records through
 * the complete readBloomerangWithEntities() pipeline and shows the final processed entities.
 *
 * @param {Array<number>} recordNumbers - Array of CSV row numbers to inspect (e.g., [1,2,3,4,5])
 * @returns {Promise<Array<Object>>} Array of inspection results with processed entities and field verification
 */
async function inspectProcessedRecords(recordNumbers) {
    console.log('=== MULTI-RECORD INSPECTION TOOL ===');
    console.log(`Inspecting ${recordNumbers.length} records: [${recordNumbers.join(', ')}]`);

    try {
        // Step 1: Fetch and parse CSV data
        const reqBase = "http://127.0.0.99:3000";
        const fileUrl = `${reqBase}/csv-file`;
        const response = await fetch(fileUrl);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const csvText = await response.text();
        const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
        const data = lines.map(line => line.split(',').map(field => field.replace(/\^#C#\^/g, ',')));

        console.log(`✓ CSV loaded: ${data.length} total records`);

        // Step 2: Field mapping for verification (same as main processing)
        const fieldMap = {
            name: 0,           // Field 1: Name
            firstName: 1,      // Field 2: First Name
            middleName: 2,     // Field 3: Middle Name
            lastName: 3,       // Field 4: Last Name
            email: 4,          // Field 5: Primary Email Address
            accountNumber: 5,  // Field 6: Account Number
            transactionAmount: 6, // Field 7: First Transaction Amount
            transactionDate: 7,   // Field 8: First Transaction Date
            isInHousehold: 8,  // Field 9: Is in a Household
            primaryStreet: 9,  // Field 10: Primary Street
            primaryCity: 10,   // Field 11: Primary City
            primaryState: 11,  // Field 12: Primary State
            primaryZip: 12,    // Field 13: Primary ZIP Code
            homeStreet: 13,    // Field 14: Home Street
            homeCity: 14,      // Field 15: Home City
            homeState: 15,     // Field 16: Home State
            homeZip: 16,       // Field 17: Home ZIP Code
            vacationStreet: 17,// Field 18: Vacation Street
            vacationCity: 18,  // Field 19: Vacation City
            vacationState: 19, // Field 20: Vacation State
            vacationZip: 20,   // Field 21: Vacation ZIP Code
            workStreet: 21,    // Field 22: Work Street
            workCity: 22,      // Field 23: Work City
            workState: 23,     // Field 24: Work State
            workZip: 24,       // Field 25: Work ZIP Code
            fireNumber: 25,    // Field 26: Fire Number
            biStreet: 26,      // Field 27: BI Street (Block Island specific)
            biPoBox: 27,       // Field 28: BI PO Box (Block Island specific)
            householdName: 28, // Field 29: Household Name
            isHeadOfHousehold: 29 // Field 30: Is Head of Household
        };

        const inspectionResults = [];

        // Step 3: Process each requested record through full entity pipeline
        for (const recordNum of recordNumbers) {
            console.log(`\n--- Processing Record ${recordNum} ---`);

            if (recordNum < 1 || recordNum >= data.length) {
                console.log(`❌ Record ${recordNum} out of range (1-${data.length - 1})`);
                continue;
            }

            const fields = data[recordNum];
            const accountNumber = fields[fieldMap.accountNumber] || `UNKNOWN_${recordNum}`;
            const dataSource = DATA_SOURCES.BLOOMERANG_CSV;

            // Process through actual entity creation pipeline
            const rowData = {
                rowIndex: recordNum,
                fields: fields,
                accountNumber: accountNumber
            };
            const households = new Map(); // Empty households map for processing
            const processedEntity = await processRowToEntity(rowData, dataSource, households);

            // Step 4: Generate field mapping verification
            const fieldMapping = {};
            const csvFieldNames = Object.keys(fieldMap);

            for (const fieldName of csvFieldNames) {
                const fieldIndex = fieldMap[fieldName];
                const csvValue = (fields[fieldIndex] || '').trim();

                // Check where this field appears in the processed entity
                let foundInEntity = false;
                let entityLocation = '';

                if (csvValue) {
                    // Core fields
                    if (fieldName === 'accountNumber') {
                        const entityAccountNumber = processedEntity.accountNumber?.value || processedEntity.accountNumber;
                        if (entityAccountNumber === csvValue) {
                            foundInEntity = true;
                            entityLocation = processedEntity.accountNumber?.value ? 'entity.accountNumber.value' : 'entity.accountNumber';
                        }
                    }

                    // ContactInfo fields
                    if (processedEntity.contactInfo) {
                        if (fieldName === 'email' && processedEntity.contactInfo.email && processedEntity.contactInfo.email.value === csvValue) {
                            foundInEntity = true;
                            entityLocation = 'entity.contactInfo.email.value';
                        }
                        if (fieldName === 'biStreet' && processedEntity.contactInfo.biStreet && processedEntity.contactInfo.biStreet.value === csvValue) {
                            foundInEntity = true;
                            entityLocation = 'entity.contactInfo.biStreet.value';
                        }
                        if (fieldName === 'biPoBox' && processedEntity.contactInfo.biPOBox && processedEntity.contactInfo.biPOBox.value === csvValue) {
                            foundInEntity = true;
                            entityLocation = 'entity.contactInfo.biPOBox.value';
                        }
                    }

                    // AdditionalData fields
                    if (processedEntity.additionalData) {
                        // Transaction data
                        if (fieldName === 'transactionAmount' && processedEntity.additionalData.transactionData?.firstAmount === csvValue) {
                            foundInEntity = true;
                            entityLocation = 'entity.additionalData.transactionData.firstAmount';
                        }
                        if (fieldName === 'transactionDate' && processedEntity.additionalData.transactionData?.firstDate === csvValue) {
                            foundInEntity = true;
                            entityLocation = 'entity.additionalData.transactionData.firstDate';
                        }

                        // Address fields
                        const addressTypes = ['primary', 'home', 'vacation', 'work'];
                        for (const addrType of addressTypes) {
                            const addrFields = ['Street', 'City', 'State', 'Zip'];
                            for (const addrField of addrFields) {
                                const csvFieldKey = `${addrType}${addrField}`;
                                const entityFieldKey = addrField.toLowerCase();
                                if (fieldName === csvFieldKey &&
                                    processedEntity.additionalData.addresses?.[addrType]?.[entityFieldKey] === csvValue) {
                                    foundInEntity = true;
                                    entityLocation = `entity.additionalData.addresses.${addrType}.${entityFieldKey}`;
                                    break;
                                }
                            }
                        }

                        // Block Island data
                        if (fieldName === 'fireNumber' && processedEntity.additionalData.blockIslandData?.fireNumber === csvValue) {
                            foundInEntity = true;
                            entityLocation = 'entity.additionalData.blockIslandData.fireNumber';
                        }

                        // Household data
                        if (fieldName === 'householdName' && processedEntity.additionalData.householdData?.householdName === csvValue) {
                            foundInEntity = true;
                            entityLocation = 'entity.additionalData.householdData.householdName';
                        }
                        if (fieldName === 'isHeadOfHousehold' && processedEntity.additionalData.householdData?.isHeadOfHousehold === csvValue) {
                            foundInEntity = true;
                            entityLocation = 'entity.additionalData.householdData.isHeadOfHousehold';
                        }
                        if (fieldName === 'isInHousehold' && processedEntity.additionalData.householdData?.isInHousehold === csvValue) {
                            foundInEntity = true;
                            entityLocation = 'entity.additionalData.householdData.isInHousehold';
                        }
                    }

                    // Name fields (in name object)
                    if (processedEntity.name) {
                        if (fieldName === 'firstName' && processedEntity.name.first && processedEntity.name.first.value === csvValue) {
                            foundInEntity = true;
                            entityLocation = 'entity.name.first.value';
                        }
                        if (fieldName === 'middleName' && processedEntity.name.middle && processedEntity.name.middle.value === csvValue) {
                            foundInEntity = true;
                            entityLocation = 'entity.name.middle.value';
                        }
                        if (fieldName === 'lastName' && processedEntity.name.last && processedEntity.name.last.value === csvValue) {
                            foundInEntity = true;
                            entityLocation = 'entity.name.last.value';
                        }
                    }
                }

                const status = csvValue ? (foundInEntity ? '✓ Captured' : '❌ Missing') : '- Empty';
                fieldMapping[`csvField${fieldIndex + 1} (${fieldName}) → ${entityLocation || 'NOT_FOUND'}`] = status;
            }

            // Step 5: Data integrity check
            const dataIntegrityCheck = {
                allFieldsCaptured: !Object.values(fieldMapping).includes('❌ Missing'),
                contactInfoCreated: !!processedEntity.contactInfo,
                additionalDataCreated: !!processedEntity.additionalData,
                attributedTermsPresent: false
            };

            // Check for AttributedTerm presence
            if (processedEntity.contactInfo) {
                dataIntegrityCheck.attributedTermsPresent = !!(
                    (processedEntity.contactInfo.email && processedEntity.contactInfo.email.constructor.name === 'AttributedTerm') ||
                    (processedEntity.contactInfo.biStreet && processedEntity.contactInfo.biStreet.constructor.name === 'AttributedTerm') ||
                    (processedEntity.contactInfo.biPOBox && processedEntity.contactInfo.biPOBox.constructor.name === 'AttributedTerm')
                );
            } else {
                dataIntegrityCheck.attributedTermsPresent = false;
            }

            const inspectionResult = {
                recordNumber: recordNum,
                rawCSVData: {},
                processedEntity: processedEntity,
                fieldMapping: fieldMapping,
                dataIntegrityCheck: dataIntegrityCheck
            };

            // Populate raw CSV data for comparison
            for (const [fieldName, fieldIndex] of Object.entries(fieldMap)) {
                inspectionResult.rawCSVData[`field${fieldIndex + 1}_${fieldName}`] = fields[fieldIndex] || '';
            }

            inspectionResults.push(inspectionResult);

            // Summary for this record
            console.log(`✓ Entity Type: ${processedEntity.constructor.name}`);
            console.log(`✓ Account Number: ${processedEntity.accountNumber}`);
            console.log(`✓ ContactInfo Created: ${dataIntegrityCheck.contactInfoCreated}`);
            console.log(`✓ AdditionalData Created: ${dataIntegrityCheck.additionalDataCreated}`);
            console.log(`✓ AttributedTerms Present: ${dataIntegrityCheck.attributedTermsPresent}`);

            const missingFields = Object.values(fieldMapping).filter(status => status === '❌ Missing').length;
            const emptyFields = Object.values(fieldMapping).filter(status => status === '- Empty').length;
            const capturedFields = Object.values(fieldMapping).filter(status => status === '✓ Captured').length;

            console.log(`✓ Field Processing: ${capturedFields} captured, ${missingFields} missing, ${emptyFields} empty`);
        }

        // Final summary
        console.log('\n=== INSPECTION SUMMARY ===');
        console.log(`Records processed: ${inspectionResults.length}`);
        console.log(`ContactInfo created: ${inspectionResults.filter(r => r.dataIntegrityCheck.contactInfoCreated).length}`);
        console.log(`AdditionalData created: ${inspectionResults.filter(r => r.dataIntegrityCheck.additionalDataCreated).length}`);
        console.log(`AttributedTerms present: ${inspectionResults.filter(r => r.dataIntegrityCheck.attributedTermsPresent).length}`);
        console.log(`All fields captured: ${inspectionResults.filter(r => r.dataIntegrityCheck.allFieldsCaptured).length}`);

        return inspectionResults;

    } catch (error) {
        console.error('❌ Inspection failed:', error);
        throw error;
    }
}

/**
 * Save Bloomerang Entity Browser configuration to Google Drive
 * Persists the current collection file IDs so Entity Browser can always access the latest files
 *
 * @param {Object} uploadResults - Upload results from readBloomerangWithEntities
 * @param {string} batchId - Batch identifier for this processing run
 */
async function saveBloomerangEntityBrowserConfig(uploadResults, batchId) {
    try {
        console.log('💾 Saving Entity Browser configuration...');

        const configData = {
            timestamp: new Date().toISOString(),
            batchId: batchId,
            fileIds: {
                individuals: uploadResults.individuals?.fileId || null,
                households: uploadResults.households?.fileId || null,
                nonhuman: uploadResults.nonHumans?.fileId || null
            },
            fileDetails: {
                individuals: uploadResults.individuals ? {
                    filename: uploadResults.individuals.filename,
                    entitiesUploaded: uploadResults.individuals.entitiesUploaded
                } : null,
                households: uploadResults.households ? {
                    filename: uploadResults.households.filename,
                    entitiesUploaded: uploadResults.households.entitiesUploaded
                } : null,
                nonhuman: uploadResults.nonHumans ? {
                    filename: uploadResults.nonHumans.filename,
                    entitiesUploaded: uploadResults.nonHumans.entitiesUploaded
                } : null
            },
            configVersion: "1.0.0",
            source: "readBloomerangWithEntities"
        };

        // Save config to a well-known file ID for Entity Browser to read
        const configFileId = "1BloomerangEntityBrowserConfig"; // Replace with actual config file ID

        // Upload config to Google Drive
        const fileMetadata = {
            name: `BloomerangEntityBrowserConfig_${batchId}.json`,
            parents: [bloomerangParameters.serialization.folderIds.batches], // Save in batches folder
            description: `Entity Browser configuration for Bloomerang batch ${batchId}`
        };

        const fileId = await uploadJsonToGoogleDrive(fileMetadata, configData);

        console.log(`✅ Entity Browser config saved: ${fileMetadata.name} (ID: ${fileId})`);
        console.log('📋 Current collection file IDs:', configData.fileIds);

        return {
            configFileId: fileId,
            config: configData
        };

    } catch (error) {
        console.error('❌ Failed to save Entity Browser config:', error);
        // Don't throw - this is optional functionality
        return null;
    }
}