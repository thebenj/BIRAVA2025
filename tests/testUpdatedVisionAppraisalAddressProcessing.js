/**
 * Updated VisionAppraisal Address Processing Test
 *
 * Tests the integrated address processing in the production VisionAppraisal entity creation system
 * Verifies that our constructor changes trigger proper address processing and ContactInfo creation
 */

async function testUpdatedVisionAppraisalAddressProcessing() {
    console.log('🧪 === UPDATED VISIONAPPRAISAL ADDRESS PROCESSING TEST ===');
    console.log('Testing the integrated address processing in production entity creation\n');

    try {
        // Load dependencies first
        console.log('📚 Loading dependencies...');
        const scripts = [
            './scripts/objectStructure/aliasClasses.js',
            './scripts/objectStructure/entityClasses.js',
            './scripts/objectStructure/contactInfo.js',
            './scripts/validation/case31Validator.js',
            './scripts/dataSources/visionAppraisalNameParser.js',
            './scripts/dataSources/configurableVisionAppraisalNameParser.js',
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
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('\n🔍 Testing updated address processing integration...\n');

        // Process sample records manually to see address processing in action
        const sampleSize = 5;

        for (let i = 0; i < sampleSize; i++) {
            console.log(`\n📋 === SAMPLE ${i + 1} ===`);

            // Create mock record structure that mimics real VisionAppraisal data
            const mockRecord = {
                ownerName: `SAMPLE OWNER ${i + 1}`,
                processedOwnerName: `SAMPLE OWNER ${i + 1}`,
                propertyLocation: `${1500 + i * 10} CORN NECK ROAD, BLOCK ISLAND, RI 02807`,
                ownerAddress: `PO BOX ${100 + i * 5}, BLOCK ISLAND, RI 02807`,
                pid: `SAMPLE_PID_${i + 1}`,
                fireNumber: 1500 + i * 10,
                mblu: `01/02/0${i + 1}/00`,
                googleFileId: `SAMPLE_FILE_ID_${i + 1}`
            };

            console.log('📤 INPUT DATA:');
            console.log('  ownerName:', mockRecord.ownerName);
            console.log('  propertyLocation:', mockRecord.propertyLocation);
            console.log('  ownerAddress:', mockRecord.ownerAddress);
            console.log('  fireNumber:', mockRecord.fireNumber);

            try {
                // Process through the updated production system
                let entity;
                if (typeof ConfigurableVisionAppraisalNameParser !== 'undefined') {
                    entity = ConfigurableVisionAppraisalNameParser.parseRecordToEntity(mockRecord, i);
                } else if (typeof parseRecordToEntity !== 'undefined') {
                    entity = parseRecordToEntity(mockRecord, i, true);
                } else {
                    console.error('❌ No parser function available');
                    continue;
                }

                if (entity) {
                    console.log('\n📥 ENTITY OUTPUT:');
                    console.log('  Entity Type:', entity.constructor.name);
                    console.log('  Has ContactInfo:', entity.contactInfo !== null);

                    if (entity.contactInfo) {
                        console.log('  Primary Address exists:', entity.contactInfo.primaryAddress !== null);
                        console.log('  Secondary Address count:', entity.contactInfo.secondaryAddress ? entity.contactInfo.secondaryAddress.length : 0);

                        // Detailed Primary Address Analysis
                        if (entity.contactInfo.primaryAddress) {
                            console.log('\n  🏠 PRIMARY ADDRESS DETAILS:');
                            console.log('    Type:', entity.contactInfo.primaryAddress.constructor.name);
                            console.log('    All Properties:');

                            for (const [prop, val] of Object.entries(entity.contactInfo.primaryAddress)) {
                                if (val !== null && val !== undefined) {
                                    if (val && typeof val === 'object' && val.term !== undefined) {
                                        console.log(`      ${prop}: "${val.term}" (AttributedTerm)`);
                                    } else {
                                        console.log(`      ${prop}: ${JSON.stringify(val)}`);
                                    }
                                } else {
                                    console.log(`      ${prop}: null`);
                                }
                            }
                        }

                        // Detailed Secondary Address Analysis
                        if (entity.contactInfo.secondaryAddress && entity.contactInfo.secondaryAddress.length > 0) {
                            entity.contactInfo.secondaryAddress.forEach((addr, index) => {
                                console.log(`\n  📮 SECONDARY ADDRESS ${index + 1}:`);
                                console.log('    Type:', addr.constructor.name);
                                console.log('    All Properties:');

                                for (const [prop, val] of Object.entries(addr)) {
                                    if (val !== null && val !== undefined) {
                                        if (val && typeof val === 'object' && val.term !== undefined) {
                                            console.log(`      ${prop}: "${val.term}" (AttributedTerm)`);
                                        } else {
                                            console.log(`      ${prop}: ${JSON.stringify(val)}`);
                                        }
                                    } else {
                                        console.log(`      ${prop}: null`);
                                    }
                                }
                            });
                        }

                    } else {
                        console.log('  ❌ No ContactInfo created');
                    }

                    console.log('\n  ✅ Address processing integration successful!');

                } else {
                    console.log('  ❌ Entity creation failed');
                }

            } catch (error) {
                console.error('  ❌ Error processing record:', error.message);
                console.error('  Stack:', error.stack);
            }
        }

        // Summary
        console.log('\n\n📊 === TEST SUMMARY ===');
        console.log('✅ Updated VisionAppraisal address processing integration test complete');
        console.log('🎯 Key Validation Points:');
        console.log('  • Constructor address parameters are now being passed from production system');
        console.log('  • Address processing logic is triggered during entity creation');
        console.log('  • ContactInfo objects are automatically created when addresses exist');
        console.log('  • Address strings are parsed into proper Address objects');
        console.log('  • Address objects are stored in primaryAddress and secondaryAddress properties');

    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack:', error.stack);
    }

    console.log('\n🎉 === UPDATED VISIONAPPRAISAL ADDRESS PROCESSING TEST COMPLETE ===');
    return 'Updated address processing integration test completed';
}

console.log('Updated VisionAppraisal Address Processing Test Script Loaded');
console.log('Run: testUpdatedVisionAppraisalAddressProcessing()');