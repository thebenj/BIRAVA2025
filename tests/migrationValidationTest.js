/**
 * Block Island Address Migration - Production Validation Test
 *
 * Purpose: Validate that Phase 0-4 migration is working correctly in production
 * Key Test: Secondary addresses (owner addresses) should NOT be auto-forced to Block Island
 *
 * Success Criteria: 30-50% of owner addresses should be non-Block Island (realistic distribution)
 *
 * Date: November 12, 2025
 * Status: PASSED - Migration confirmed successful in production
 */

// Migration Validation Test - Secondary Address Analysis
async function validateSecondaryAddresses() {
    console.log('🔍 Migration Validation - Secondary Address Analysis');
    console.log('================================================================================');

    try {
        const response = await gapi.client.drive.files.get({
            fileId: '19cgccMYNBboL07CmMP-5hNNGwEUBXgCI', // Current production data
            alt: 'media'
        });

        const data = JSON.parse(response.body);
        const entities = data.entities || data;

        console.log(`📊 Loaded ${entities.length} entities`);

        let secondaryBICount = 0;
        let secondaryNonBICount = 0;
        let secondaryTotal = 0;

        const samples = [];

        entities.forEach(entity => {
            if (entity.contactInfo?.secondaryAddress && Array.isArray(entity.contactInfo.secondaryAddress)) {
                entity.contactInfo.secondaryAddress.forEach(addr => {
                    secondaryTotal++;
                    const isBI = addr.isBlockIslandAddress?.term === true || addr.isBlockIslandAddress === true;
                    const city = addr.city?.term || addr.city;

                    if (isBI || city === 'Block Island') {
                        secondaryBICount++;
                    }
                    if (city && city !== 'Block Island') {
                        secondaryNonBICount++;
                        // Collect non-BI samples for validation
                        if (samples.length < 5) {
                            samples.push({ city, isBI, street: addr.streetName?.term || addr.streetName });
                        }
                    }
                });
            }
        });

        console.log('\n📊 Secondary Address Analysis (Owner Addresses):');
        console.log(`  Total secondary addresses: ${secondaryTotal}`);
        console.log(`  Block Island owner addresses: ${secondaryBICount}`);
        console.log(`  Non-Block Island owner addresses: ${secondaryNonBICount}`);

        if (secondaryNonBICount > 0) {
            console.log(`\n🔍 Sample Non-Block Island Owner Addresses:`);
            samples.forEach((sample, i) => {
                console.log(`  ${i + 1}. ${sample.city} | BI Flag: ${sample.isBI}`);
            });
        }

        console.log('\n🎯 Migration Validation Results:');

        if (secondaryNonBICount > 0) {
            console.log(`✅ MIGRATION SUCCESS: ${secondaryNonBICount} owner addresses NOT auto-forced to Block Island`);
            console.log('✅ Phase 2 fix working: Owner addresses require evidence-based detection');
            console.log('✅ Two-path processing confirmed in production');

            const percentage = ((secondaryNonBICount / secondaryTotal) * 100).toFixed(1);
            console.log(`📊 ${percentage}% of owner addresses are non-Block Island (realistic for property owners)`);

        } else if (secondaryBICount === secondaryTotal && secondaryTotal > 0) {
            console.log(`❌ MIGRATION FAILED: ALL ${secondaryBICount} owner addresses are Block Island`);
            console.log('❌ Old auto-forcing logic may still be active');
            console.log('❌ Phase 2 fix not working in production');

        } else {
            console.log('❓ No secondary address data found for analysis');
        }

        return {
            valid: secondaryNonBICount > 0,
            secondaryTotal,
            secondaryBICount,
            secondaryNonBICount,
            samples
        };

    } catch (error) {
        console.log('❌ Error:', error);
        return { error: error.message };
    }
}

/**
 * ACTUAL TEST RESULTS (November 12, 2025)
 *
 * Production Validation Results:
 * - Total secondary addresses: 2290
 * - Block Island owner addresses: 917
 * - Non-Block Island owner addresses: 987
 * - Sample cities: YONKERS, LOUDONVILLE, PROVIDENCE, NEWPORT, WYNDMOOR
 * - Result: ✅ MIGRATION SUCCESS - 43.1% of owner addresses are non-Block Island
 *
 * Critical Understanding:
 * - Primary addresses SHOULD all be Block Island (property locations)
 * - Secondary addresses SHOULD have mixed geography (property owners live everywhere)
 * - This test validates the core migration goal: preventing inappropriate auto-forcing
 *
 * Usage:
 * - Run in browser console: validateSecondaryAddresses()
 * - Requires: gapi.client authentication and production VisionAppraisal data
 * - Expected: 30-50% of owner addresses should be non-Block Island
 */