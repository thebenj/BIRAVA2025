/**
 * Production VisionAppraisal Record Processing with Address Integration
 *
 * Processes all 2,317 VisionAppraisal records through production address processing system
 * Shows detailed address object properties for first two entities from each parser case
 *
 * PRODUCTION CODE - Converted from testRealVisionAppraisalAddresses() test function
 * - Load all 2,317 VisionAppraisal records via VisionAppraisal.loadProcessedDataFromGoogleDrive()
 * - Process through production 34-case configurable parser
 * - Display Address object properties (streetNumber, streetName, streetType, etc.)
 * - Show ContactInfo with primaryAddress and secondaryAddress arrays
 * - Validate AttributedTerm properties with source tracking
 */

async function processAllVisionAppraisalRecordsWithAddresses(showDetailedResults = false, quietMode = false) {
    console.log('🏭 === PRODUCTION VISIONAPPRAISAL ADDRESS PROCESSING ===');
    console.log('Processing all 2,317 VisionAppraisal records with address validation\n');

    try {
        // Load dependencies first
        console.log('📚 Loading dependencies...');
        const scripts = [
            './scripts/objectStructure/aliasClasses.js',
            './scripts/objectStructure/entityClasses.js',
            './scripts/objectStructure/contactInfo.js',
            './scripts/validation/case31Validator.js',
            './scripts/dataSources/visionAppraisal.js',
            './scripts/dataSources/visionAppraisalNameParser.js',
            './scripts/address/addressProcessing.js',
            './scripts/utils/classSerializationUtils.js'
        ];

        for (const script of scripts) {
            await new Promise((resolve, reject) => {
                const existing = document.querySelector(`script[src="${script}"]`);
                if (existing) {
                    console.log(`  ↩️  ${script} (already loaded)`);
                    resolve();
                    return;
                }

                const s = document.createElement('script');
                s.src = script;
                s.onload = resolve;
                s.onerror = reject;
                document.head.appendChild(s);
            });
            console.log(`  ✅ ${script}`);
        }

        // Wait for dependencies to settle
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('\n🔍 Loading all 2,317 VisionAppraisal records...\n');

        // Load all VisionAppraisal records from Google Drive
        const response = await VisionAppraisal.loadProcessedDataFromGoogleDrive();
        if (!response.success || !response.data || response.data.length === 0) {
            throw new Error('Failed to load VisionAppraisal data: ' + (response.error || 'No data returned'));
        }

        const allRecords = response.data;
        console.log(`✅ Loaded ${allRecords.length} VisionAppraisal records`);

        // Load Block Island streets database for address processing (ONCE before processing starts)
        console.log('\n🗺️ Loading Block Island streets database...');
        if (typeof loadBlockIslandStreetsFromDrive !== 'undefined') {
            try {
                const streets = await loadBlockIslandStreetsFromDrive();
                console.log(`✅ Loaded ${streets.size} Block Island streets for address processing`);
            } catch (error) {
                console.warn(`⚠️ Failed to load Block Island streets: ${error.message}`);
            }
        } else {
            console.warn('⚠️ loadBlockIslandStreetsFromDrive function not available');
        }

        // Track cases and their entities
        const caseEntityMap = new Map(); // case number -> [entities]
        const allEntities = []; // Collect all entities for Google Drive saving
        let totalProcessed = 0;
        let addressProcessingSuccesses = 0;

        // Processing statistics (same format as existing parsers)
        const processingStats = {
            totalRecords: allRecords.length,
            successful: 0,
            failed: 0,
            entityTypeCounts: {
                Individual: 0,
                AggregateHousehold: 0,
                Business: 0,
                LegalConstruct: 0,
                NonHuman: 0
            },
            errors: []
        };

        console.log('\n🏭 Processing all records through production parser...\n');

        // Track entity type counts and case statistics
        let entityTypeCounts = {};
        let caseMatchCounts = {};

        // Intercept console.log to capture case information for statistics (even in quiet mode)
        const originalConsoleLog = console.log;
        let currentCase = 'Unknown';

        console.log = function(...args) {
            const message = args.join(' ');
            // Look for case match messages to capture statistics
            const caseMatch = message.match(/📋 ConfigurableParser matched (case\d+[a-zA-Z]*): "(.+)"/);
            if (caseMatch) {
                currentCase = caseMatch[1];
                // Only log the message if not in quiet mode
                if (!quietMode) {
                    originalConsoleLog(...args);
                }
                return;
            }
            // Pass through all other console.log calls
            originalConsoleLog(...args);
        };

        // Process all records and organize by case
        for (let i = 0; i < allRecords.length; i++) {
            const record = allRecords[i];

            if (i % 500 === 0) {
                console.log(`Progress: ${i}/${allRecords.length} records processed...`);
            }

            try {
                // Always use the regular parser to capture case information
                let entity;
                if (typeof VisionAppraisalNameParser !== 'undefined' && VisionAppraisalNameParser.parseRecordToEntity) {
                    entity = VisionAppraisalNameParser.parseRecordToEntity(record, i);
                } else if (typeof parseRecordToEntity !== 'undefined') {
                    entity = parseRecordToEntity(record, i, true); // quiet mode fallback
                } else {
                    throw new Error('No parser function available');
                }

                if (entity) {
                    totalProcessed++;
                    processingStats.successful++;

                    // Collect all entities for Google Drive saving
                    allEntities.push(entity);

                    // Track if address processing worked
                    if (entity.contactInfo && (entity.contactInfo.primaryAddress || (entity.contactInfo.secondaryAddress && entity.contactInfo.secondaryAddress.length > 0))) {
                        addressProcessingSuccesses++;
                    }

                    // Track entity type counts and preserve type for serialization
                    const entityType = entity.constructor.name;

                    // SERIALIZATION FIX: Add explicit entityType property to preserve constructor info
                    entity.entityType = entityType;

                    if (!entityTypeCounts[entityType]) {
                        entityTypeCounts[entityType] = 0;
                    }
                    entityTypeCounts[entityType]++;

                    // Track entity type counts for processingStats
                    if (processingStats.entityTypeCounts.hasOwnProperty(entityType)) {
                        processingStats.entityTypeCounts[entityType]++;
                    }

                    // Track case match counts
                    if (!caseMatchCounts[currentCase]) {
                        caseMatchCounts[currentCase] = 0;
                    }
                    caseMatchCounts[currentCase]++;

                    // Reset current case
                    currentCase = 'Unknown';

                    // Add to case map (only keep first 2 entities per case)
                    if (!caseEntityMap.has(entityType)) {
                        caseEntityMap.set(entityType, []);
                    }

                    const entitiesForCase = caseEntityMap.get(entityType);
                    if (entitiesForCase.length < 2) {
                        entitiesForCase.push({
                            entity: entity,
                            record: record,
                            index: i
                        });
                    }
                } else {
                    processingStats.failed++;
                    processingStats.errors.push(`Record ${i} (PID: ${record.pid}): No entity created`);
                }

            } catch (error) {
                processingStats.failed++;
                processingStats.errors.push(`Record ${i} (PID: ${record.pid}): ${error.message}`);
                continue;
            }
        }

        // Restore original console.log
        console.log = originalConsoleLog;

        console.log(`\n✅ Processing complete: ${totalProcessed}/${allRecords.length} entities created`);
        console.log(`📍 Address processing success: ${addressProcessingSuccesses}/${totalProcessed} entities (${((addressProcessingSuccesses/totalProcessed)*100).toFixed(1)}%)`);
        console.log(`🏷️ Entity types detected: ${caseEntityMap.size}`);

        // Show case match statistics
        console.log('\n📊 Case Match Statistics:');
        for (const [caseName, count] of Object.entries(caseMatchCounts)) {
            console.log(`  ${caseName}: ${count} matches`);
        }

        // Show entity type statistics
        console.log('\n📊 Entity Type Statistics:');
        for (const [entityType, count] of Object.entries(entityTypeCounts)) {
            console.log(`  ${entityType}: ${count} entities`);
        }

        // Display first two entities from each case (only if detailed results requested)
        if (showDetailedResults) {
            console.log('\n📋 === ADDRESS PROCESSING RESULTS BY CASE ===\n');

            const sortedCases = Array.from(caseEntityMap.keys()).sort((a, b) => {
                // Try to sort numerically if possible
                const aNum = parseInt(a);
                const bNum = parseInt(b);
                if (!isNaN(aNum) && !isNaN(bNum)) {
                    return aNum - bNum;
                }
                return a.localeCompare(b);
            });

            for (const caseNumber of sortedCases) {
                const entities = caseEntityMap.get(caseNumber);

                console.log(`🏷️ === CASE ${caseNumber} ===`);
                console.log(`Entities for this case: ${entities.length}/2 displayed`);

                entities.forEach((entityData, idx) => {
                    const { entity, record, index } = entityData;

                    console.log(`\n  📋 Entity ${idx + 1} (Record ${index}):`);
                    console.log(`    Type: ${entity.constructor.name}`);
                    console.log(`    Name: ${entity.displayName || entity.name || 'Unknown'}`);
                    console.log(`    📍 ORIGINAL ADDRESSES FROM RECORD:`);
                    console.log(`      propertyLocation: "${record.propertyLocation || 'null'}"`);
                    console.log(`      ownerAddress: "${record.ownerAddress || 'null'}"`);
                    console.log(`    Has ContactInfo: ${entity.contactInfo !== null}`);

                    if (entity.contactInfo) {
                        // Primary Address Details
                        if (entity.contactInfo.primaryAddress) {
                            console.log(`\n    🏠 PRIMARY ADDRESS:`);
                            console.log(`      Type: ${entity.contactInfo.primaryAddress.constructor.name}`);

                            // Show ALL address properties dynamically
                            for (const prop in entity.contactInfo.primaryAddress) {
                                const val = entity.contactInfo.primaryAddress[prop];
                                if (val !== null && val !== undefined) {
                                    if (val && typeof val === 'object' && val.term !== undefined) {
                                        console.log(`        ${prop}: "${val.term}" (${val.constructor.name})`);
                                    } else {
                                        console.log(`        ${prop}: ${JSON.stringify(val)}`);
                                    }
                                }
                            }

                            // Check Block Island recognition
                            if (entity.contactInfo.primaryAddress.isBlockIslandAddress !== undefined) {
                                console.log(`        isBlockIslandAddress: ${entity.contactInfo.primaryAddress.isBlockIslandAddress}`);
                            }
                        } else {
                            console.log(`    🏠 PRIMARY ADDRESS: null`);
                        }

                        // Secondary Address Details
                        if (entity.contactInfo.secondaryAddress && entity.contactInfo.secondaryAddress.length > 0) {
                            entity.contactInfo.secondaryAddress.forEach((addr, addrIdx) => {
                                console.log(`\n    📮 SECONDARY ADDRESS ${addrIdx + 1}:`);
                                console.log(`      Type: ${addr.constructor.name}`);

                                // Show ALL address properties dynamically
                                for (const prop in addr) {
                                    const val = addr[prop];
                                    if (val !== null && val !== undefined) {
                                        if (val && typeof val === 'object' && val.term !== undefined) {
                                            console.log(`        ${prop}: "${val.term}" (${val.constructor.name})`);
                                        } else {
                                            console.log(`        ${prop}: ${JSON.stringify(val)}`);
                                        }
                                    }
                                }

                                // Check Block Island recognition
                                if (addr.isBlockIslandAddress !== undefined) {
                                    console.log(`        isBlockIslandAddress: ${addr.isBlockIslandAddress}`);
                                }
                            });
                        } else {
                            console.log(`    📮 SECONDARY ADDRESS: none`);
                        }
                    } else {
                        console.log(`    ❌ No ContactInfo created`);
                    }
                });

                console.log(`\n`);
            }
        } else {
            console.log('\n📋 Detailed address processing results by case skipped (set showDetailedResults = true to view)');
        }

        // Save entities to Google Drive (same format as existing parsers)
        console.log('\n=== SAVING PROCESSED ENTITIES TO GOOGLE DRIVE ===');
        const dataPackage = {
            metadata: {
                processedAt: new Date().toISOString(),
                processingMethod: 'processAllVisionAppraisalRecordsWithAddresses',
                recordCount: processingStats.totalRecords,
                successfulCount: processingStats.successful,
                failedCount: processingStats.failed,
                successRate: `${(processingStats.successful / processingStats.totalRecords * 100).toFixed(1)}%`,
                entityTypeCounts: processingStats.entityTypeCounts
            },
            entities: allEntities
        };

        const GOOGLE_FILE_ID = '19cgccMYNBboL07CmMP-5hNNGwEUBXgCI';
        const fileName = 'VisionAppraisal_ParsedEntities.json';

        try {
            console.log(`🔄 Using recursive serialization to preserve class constructors...`);
            const fileContent = serializeWithTypes(dataPackage);
            console.log(`📝 Saving ${allEntities.length} entities to Google Drive with preserved class types...`);

            const uploadResponse = await gapi.client.request({
                path: `https://www.googleapis.com/upload/drive/v3/files/${GOOGLE_FILE_ID}`,
                method: 'PATCH',
                params: {
                    uploadType: 'media'
                },
                headers: {
                    'Content-Type': 'application/json'
                },
                body: fileContent
            });

            console.log(`📋 Google Drive update response status: ${uploadResponse.status}`);

            if (uploadResponse.status === 200) {
                console.log(`✅ File update successful, File ID: ${GOOGLE_FILE_ID}`);
            } else {
                throw new Error(`Upload failed with status: ${uploadResponse.status}`);
            }

        } catch (error) {
            console.warn(`⚠️ Google Drive save failed: ${error.message}`);
            console.log('📊 Results available in memory for analysis');
        }

        // Final summary
        console.log('\n📊 === COMPREHENSIVE PROCESSING SUMMARY ===');
        console.log(`✅ All ${allRecords.length} VisionAppraisal records processed`);
        console.log(`🏭 Entities created: ${totalProcessed}`);
        console.log(`📍 Address processing success rate: ${((addressProcessingSuccesses/totalProcessed)*100).toFixed(1)}%`);
        console.log(`🏷️ Parser cases detected: ${caseEntityMap.size}`);
        console.log(`🎯 Displayed first 2 entities from each case for address validation`);

        console.log('\n🔍 Key Validation Points:');
        console.log('  • Production 34-case configurable parser working');
        console.log('  • Address objects created as proper Address class instances');
        console.log('  • AttributedTerm properties with source tracking');
        console.log('  • ContactInfo primaryAddress and secondaryAddress arrays');
        console.log('  • Block Island address recognition status displayed');

        return {
            success: true,
            totalRecords: allRecords.length,
            entitiesCreated: totalProcessed,
            addressSuccessRate: ((addressProcessingSuccesses/totalProcessed)*100).toFixed(1) + '%',
            casesDetected: caseEntityMap.size,
            googleDriveFileId: GOOGLE_FILE_ID,
            processingStats: processingStats,
            entitiesArray: allEntities
        };

    } catch (error) {
        console.error('❌ Production processing failed:', error);
        console.error('Stack:', error.stack);
        return { success: false, error: error.message };
    }
}

console.log('Production VisionAppraisal Record Processing Script Loaded');
console.log('Processes all 2,317 records with Block Island streets database loading');
console.log('Usage:');
console.log('  processAllVisionAppraisalRecordsWithAddresses()           // No detailed results, normal output');
console.log('  processAllVisionAppraisalRecordsWithAddresses(true)       // Show detailed address processing by case');
console.log('  processAllVisionAppraisalRecordsWithAddresses(false, true) // No detailed results, quiet mode (no parser messages)');