/**
 * Entity Address Sampling Test
 *
 * Samples created entities from VisionAppraisal processing and shows
 * transparent details of how addresses are actually stored in the entities
 */

async function testEntityAddressSampling() {
    console.log('🧪 === ENTITY ADDRESS SAMPLING TEST ===');
    console.log('Sampling created entities to inspect actual address properties\n');

    try {
        // First, run a small batch of VisionAppraisal processing to get fresh entities
        console.log('📊 Loading VisionAppraisal data for sampling...');

        // Load the data - this function loads into visionAppraisalBrowser.entities
        await loadVisionAppraisalData();

        // Access the loaded entities from the visionAppraisalBrowser global
        let records;
        if (typeof visionAppraisalBrowser !== 'undefined' && visionAppraisalBrowser.entities) {
            records = visionAppraisalBrowser.entities;
            console.log(`✅ Processing ${records.length} entities from visionAppraisalBrowser`);
        } else {
            console.error('❌ visionAppraisalBrowser.entities not available');
            console.log('Available globals:', Object.keys(window).filter(k => k.includes('vision')));
            return;
        }

        // Sample the first 10 records for detailed analysis
        const sampleSize = 10;
        console.log(`\n🔍 Processing ${sampleSize} sample records with address analysis...`);

        const sampleEntities = [];

        for (let i = 0; i < Math.min(sampleSize, records.length); i++) {
            try {
                console.log(`\n📋 === SAMPLE ${i + 1}: Item ${i} ===`);
                const item = records[i];

                // Check if this is already an entity or a raw record
                let entity;
                if (item && item.constructor && item.constructor.name &&
                    ['Entity', 'Individual', 'AggregateHousehold', 'Business', 'LegalConstruct'].includes(item.constructor.name)) {

                    // This is already a processed entity
                    console.log('📦 ALREADY PROCESSED ENTITY:');
                    console.log('  Entity Type:', item.constructor.name);
                    console.log('  Name:', item.name?.identifier?.primaryAlias?.term || 'null');
                    console.log('  Location:', item.locationIdentifier?.identifier?.primaryAlias?.term || 'null');
                    entity = item;

                } else {
                    // This is a raw record, process it
                    console.log('🔤 RAW INPUT DATA:');
                    console.log('  ownerName:', item.ownerName || 'null');
                    console.log('  ownerName2:', item.ownerName2 || 'null');
                    console.log('  ownerAddress:', item.ownerAddress || 'null');
                    console.log('  propertyLocation:', item.propertyLocation || 'null');

                    // Create the entity
                    entity = parseRecordToEntity(item, i, true);
                }

                if (entity) {
                    console.log('✅ Entity created successfully');
                    console.log('  Entity Type:', entity.constructor.name);

                    // Analyze the ContactInfo object
                    console.log('\n📍 CONTACTINFO ANALYSIS:');
                    if (entity.contactInfo) {
                        console.log('  ContactInfo instantiated: YES');

                        // Primary Address Analysis
                        console.log('\n  📌 PRIMARY ADDRESS:');
                        const primaryAddr = entity.contactInfo.primaryAddress;
                        if (primaryAddr) {
                            console.log('    • Exists: YES');
                            console.log('    • Type:', primaryAddr.constructor.name);
                            console.log('    • All Properties:');

                            for (const [propName, propValue] of Object.entries(primaryAddr)) {
                                if (propValue !== null && propValue !== undefined) {
                                    if (propValue && typeof propValue === 'object' && propValue.term !== undefined) {
                                        console.log(`      ${propName}: "${propValue.term}" (AttributedTerm)`);
                                    } else {
                                        console.log(`      ${propName}: ${JSON.stringify(propValue)}`);
                                    }
                                } else {
                                    console.log(`      ${propName}: null`);
                                }
                            }
                        } else {
                            console.log('    • Exists: NO');
                        }

                        // Secondary Address Analysis
                        console.log('\n  📮 SECONDARY ADDRESSES:');
                        const secondaryAddrs = entity.contactInfo.secondaryAddress;
                        console.log('    • Count:', secondaryAddrs ? secondaryAddrs.length : 0);

                        if (secondaryAddrs && secondaryAddrs.length > 0) {
                            secondaryAddrs.forEach((addr, index) => {
                                console.log(`\n    📦 Secondary Address ${index + 1}:`);
                                if (addr) {
                                    console.log('      • Type:', addr.constructor.name);
                                    console.log('      • All Properties:');

                                    for (const [propName, propValue] of Object.entries(addr)) {
                                        if (propValue !== null && propValue !== undefined) {
                                            if (propValue && typeof propValue === 'object' && propValue.term !== undefined) {
                                                console.log(`        ${propName}: "${propValue.term}" (AttributedTerm)`);
                                            } else {
                                                console.log(`        ${propName}: ${JSON.stringify(propValue)}`);
                                            }
                                        } else {
                                            console.log(`        ${propName}: null`);
                                        }
                                    }
                                } else {
                                    console.log('      • NULL ADDRESS');
                                }
                            });
                        }

                    } else {
                        console.log('  ContactInfo instantiated: NO');
                    }

                    sampleEntities.push({
                        index: i,
                        entity: entity,
                        hasContactInfo: entity.contactInfo !== null,
                        hasPrimaryAddress: entity.contactInfo?.primaryAddress !== null,
                        secondaryAddressCount: entity.contactInfo?.secondaryAddress?.length || 0
                    });

                } else {
                    console.log('❌ Entity creation failed');
                }

            } catch (error) {
                console.error(`❌ Error processing record ${i}:`, error.message);
            }
        }

        // Summary Analysis
        console.log('\n\n📊 === SAMPLING SUMMARY ===');
        const totalSamples = sampleEntities.length;
        const withContactInfo = sampleEntities.filter(s => s.hasContactInfo).length;
        const withPrimaryAddress = sampleEntities.filter(s => s.hasPrimaryAddress).length;
        const withSecondaryAddress = sampleEntities.filter(s => s.secondaryAddressCount > 0).length;

        console.log(`Total Samples: ${totalSamples}`);
        console.log(`With ContactInfo: ${withContactInfo} (${Math.round(withContactInfo/totalSamples*100)}%)`);
        console.log(`With Primary Address: ${withPrimaryAddress} (${Math.round(withPrimaryAddress/totalSamples*100)}%)`);
        console.log(`With Secondary Address: ${withSecondaryAddress} (${Math.round(withSecondaryAddress/totalSamples*100)}%)`);

        console.log('\n🎯 Key Findings:');
        console.log('- This test shows exactly how VisionAppraisal addresses are processed');
        console.log('- Compare raw input data with final address object properties');
        console.log('- Verify address parsing and AttributedTerm storage');

    } catch (error) {
        console.error('❌ Sampling test failed:', error);
        console.error('Stack:', error.stack);
    }

    console.log('\n🎉 === ENTITY ADDRESS SAMPLING TEST COMPLETE ===');
    return 'Address sampling test completed';
}

console.log('Entity Address Sampling Test Script Loaded');
console.log('Run: testEntityAddressSampling()');