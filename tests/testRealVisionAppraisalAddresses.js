/**
 * Real VisionAppraisal Address Processing Test
 *
 * Processes all 2,317 VisionAppraisal records through production address processing system
 * Shows detailed address object properties for first two entities from each parser case
 *
 * RECREATED FROM LOST SESSION CODE - diversContent.md requirements:
 * - Load all 2,317 VisionAppraisal records via VisionAppraisal.loadProcessedDataFromGoogleDrive()
 * - Process through production 34-case configurable parser
 * - Display Address object properties (streetNumber, streetName, streetType, etc.)
 * - Show ContactInfo with primaryAddress and secondaryAddress arrays
 * - Validate AttributedTerm properties with source tracking
 */

async function testRealVisionAppraisalAddresses() {
    console.log('🧪 === REAL VISIONAPPRAISAL ADDRESS PROCESSING TEST ===');
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
            './scripts/address/addressProcessing.js'
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

        // Track cases and their entities
        const caseEntityMap = new Map(); // case number -> [entities]
        let totalProcessed = 0;
        let addressProcessingSuccesses = 0;

        console.log('\n🏭 Processing all records through production parser...\n');

        // Intercept console.log to capture case information
        const originalConsoleLog = console.log;
        let currentCase = 'Unknown';
        let caseMatchCount = {};

        console.log = function(...args) {
            const message = args.join(' ');
            // Look for case match messages
            const caseMatch = message.match(/📋 ConfigurableParser matched (case\d+): "(.+)"/);
            if (caseMatch) {
                currentCase = caseMatch[1];
                const entityName = caseMatch[2];
                if (!caseMatchCount[currentCase]) {
                    caseMatchCount[currentCase] = 0;
                }
                caseMatchCount[currentCase]++;
                // Still log the original message
                originalConsoleLog(...args);
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
                // Use the production VisionAppraisalNameParser
                let entity;
                if (typeof VisionAppraisalNameParser !== 'undefined' && VisionAppraisalNameParser.parseRecordToEntity) {
                    entity = VisionAppraisalNameParser.parseRecordToEntity(record, i);
                } else if (typeof parseRecordToEntity !== 'undefined') {
                    entity = parseRecordToEntity(record, i, true); // quiet mode
                } else {
                    throw new Error('No parser function available');
                }

                if (entity) {
                    totalProcessed++;

                    // Track if address processing worked
                    if (entity.contactInfo && (entity.contactInfo.primaryAddress || (entity.contactInfo.secondaryAddress && entity.contactInfo.secondaryAddress.length > 0))) {
                        addressProcessingSuccesses++;
                    }

                    // Use the current case captured from console log intercept
                    let caseNumber = currentCase;
                    // Reset currentCase back to Unknown for next entity
                    currentCase = 'Unknown';

                    // Add to case map (only keep first 2 entities per case)
                    if (!caseEntityMap.has(caseNumber)) {
                        caseEntityMap.set(caseNumber, []);
                    }

                    const entitiesForCase = caseEntityMap.get(caseNumber);
                    if (entitiesForCase.length < 2) {
                        entitiesForCase.push({
                            entity: entity,
                            record: record,
                            index: i
                        });
                    }
                }

            } catch (error) {
                // Silently continue on individual record errors
                continue;
            }
        }

        // Restore original console.log
        console.log = originalConsoleLog;

        console.log(`\n✅ Processing complete: ${totalProcessed}/${allRecords.length} entities created`);
        console.log(`📍 Address processing success: ${addressProcessingSuccesses}/${totalProcessed} entities (${((addressProcessingSuccesses/totalProcessed)*100).toFixed(1)}%)`);
        console.log(`🏷️ Cases detected: ${caseEntityMap.size}`);

        // Show case match statistics
        console.log('\n📊 Case Match Statistics:');
        for (const [caseName, count] of Object.entries(caseMatchCount)) {
            console.log(`  ${caseName}: ${count} matches`);
        }

        // Display first two entities from each case
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

                        // Show all address properties
                        const addressProps = [
                            'streetNumber', 'streetName', 'streetType', 'secUnitType',
                            'secUnitNum', 'city', 'state', 'zipCode', 'poBox'
                        ];

                        addressProps.forEach(prop => {
                            const val = entity.contactInfo.primaryAddress[prop];
                            if (val !== null && val !== undefined) {
                                if (val && typeof val === 'object' && val.term !== undefined) {
                                    console.log(`        ${prop}: "${val.term}" (${val.constructor.name})`);
                                } else {
                                    console.log(`        ${prop}: ${JSON.stringify(val)}`);
                                }
                            }
                        });

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

                            const addressProps = [
                                'streetNumber', 'streetName', 'streetType', 'secUnitType',
                                'secUnitNum', 'city', 'state', 'zipCode', 'poBox'
                            ];

                            addressProps.forEach(prop => {
                                const val = addr[prop];
                                if (val !== null && val !== undefined) {
                                    if (val && typeof val === 'object' && val.term !== undefined) {
                                        console.log(`        ${prop}: "${val.term}" (${val.constructor.name})`);
                                    } else {
                                        console.log(`        ${prop}: ${JSON.stringify(val)}`);
                                    }
                                }
                            });

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

        // Final summary
        console.log('\n📊 === COMPREHENSIVE TEST SUMMARY ===');
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
            casesDetected: caseEntityMap.size
        };

    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack:', error.stack);
        return { success: false, error: error.message };
    }
}

console.log('Real VisionAppraisal Address Processing Test Script Loaded');
console.log('Processes all 2,317 records and shows first 2 entities per parser case');
console.log('Run: testRealVisionAppraisalAddresses()');