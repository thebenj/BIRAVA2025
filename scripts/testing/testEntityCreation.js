/**
 * UNIFIED ENTITY CREATION TEST FUNCTION
 *
 * Tests both VisionAppraisal and Bloomerang Step 2 entity creation processes
 * to verify they run correctly and examine their address handling integration.
 */

/**
 * Test both Step 2 entity creation processes with actual execution
 */
async function testBothEntityCreationProcesses() {
    console.log('=== TESTING BOTH STEP 2 ENTITY CREATION PROCESSES ===');
    console.log('Running actual entity creation functions to verify they work correctly...');

    const results = {
        visionAppraisal: null,
        bloomerang: null,
        addressIntegration: null,
        timestamp: new Date().toISOString()
    };

    try {
        // Test VisionAppraisal Step 2 - ACTUAL EXECUTION
        console.log('\n1️⃣ Testing VisionAppraisal Step 2: Entity Creation');
        console.log('Function: VisionAppraisalNameParser.processAllVisionAppraisalRecords()');
        console.log('Source: 1oIW1m1Qw2lyreU-uGMX3jUka9LwaBTAf → Target: 19cgccMYNBboL07CmMP-5hNNGwEUBXgCI');

        try {
            const visionResult = await VisionAppraisalNameParser.processAllVisionAppraisalRecords();
            console.log('✅ VisionAppraisal Step 2 executed successfully');
            console.log('   Records processed:', visionResult.stats?.successful || 'Unknown');
            console.log('   Success rate:', visionResult.stats?.successRate || 'Unknown');
            console.log('   File ID:', visionResult.fileId || 'Unknown');

            results.visionAppraisal = {
                success: visionResult.success,
                stats: visionResult.stats,
                fileId: visionResult.fileId,
                message: visionResult.message
            };
        } catch (error) {
            console.log('❌ VisionAppraisal Step 2 failed:', error.message);
            results.visionAppraisal = {
                success: false,
                error: error.message
            };
        }

        // Test Bloomerang Step 2 - ACTUAL EXECUTION
        console.log('\n2️⃣ Testing Bloomerang Step 2: Entity Creation');
        console.log('Function: readBloomerangWithEntities(true, "entity_test_batch")');
        console.log('Will save entities to Google Drive collection files');

        try {
            const bloomerangResult = await readBloomerangWithEntities(true, "entity_test_batch");
            console.log('✅ Bloomerang Step 2 executed successfully');
            console.log('   Entities created:', bloomerangResult.statistics?.entitiesCreated || 'Unknown');
            console.log('   Households created:', bloomerangResult.statistics?.householdsCreated || 'Unknown');
            console.log('   Success rate:',
                bloomerangResult.statistics ?
                `${bloomerangResult.statistics.entitiesCreated}/${bloomerangResult.statistics.totalRows}` :
                'Unknown');

            results.bloomerang = {
                success: true,
                statistics: bloomerangResult.statistics,
                entityCount: bloomerangResult.entities?.length || 0,
                householdCount: bloomerangResult.households?.size || 0
            };
        } catch (error) {
            console.log('❌ Bloomerang Step 2 failed:', error.message);
            results.bloomerang = {
                success: false,
                error: error.message
            };
        }

        // Test Address Processing Integration
        console.log('\n3️⃣ Testing Address Processing Integration');

        const addressFunctions = {
            processAddress: typeof processAddress !== 'undefined',
            parseAddress: typeof parseAddress !== 'undefined',
            normalizeBlockIslandCity: typeof normalizeBlockIslandCity !== 'undefined',
            enhanceAddressWithBlockIslandLogic: typeof enhanceAddressWithBlockIslandLogic !== 'undefined',
            createAddressFromParsedData: typeof createAddressFromParsedData !== 'undefined'
        };

        console.log('Address processing functions:');
        Object.entries(addressFunctions).forEach(([name, available]) => {
            console.log(`   ${available ? '✅' : '❌'} ${name}: ${available}`);
        });

        // Check integration in entity creation code
        let visionUsesAddressProcessing = false;
        let bloomerangUsesAddressProcessing = false;

        if (typeof VisionAppraisalNameParser !== 'undefined') {
            const visionCode = VisionAppraisalNameParser.toString();
            visionUsesAddressProcessing = visionCode.includes('processAddress') ||
                                         visionCode.includes('createAddressFromParsedData');
        }

        if (typeof readBloomerangWithEntities !== 'undefined') {
            const bloomerangCode = readBloomerangWithEntities.toString();
            bloomerangUsesAddressProcessing = bloomerangCode.includes('processAddress') ||
                                            bloomerangCode.includes('createAddressFromParsedData');
        }

        console.log('\nAddress processing integration:');
        console.log(`   VisionAppraisal uses address processing: ${visionUsesAddressProcessing ? '✅' : '❌'}`);
        console.log(`   Bloomerang uses address processing: ${bloomerangUsesAddressProcessing ? '✅' : '❌'}`);

        results.addressIntegration = {
            functionsAvailable: addressFunctions,
            allFunctionsPresent: Object.values(addressFunctions).every(Boolean),
            visionIntegrated: visionUsesAddressProcessing,
            bloomerangIntegrated: bloomerangUsesAddressProcessing
        };

        // Final Summary
        console.log('\n📊 ENTITY CREATION TEST SUMMARY');
        console.log('=====================================');
        console.log(`VisionAppraisal Step 2: ${results.visionAppraisal?.success ? '✅ SUCCESS' : '❌ FAILED'}`);
        console.log(`Bloomerang Step 2: ${results.bloomerang?.success ? '✅ SUCCESS' : '❌ FAILED'}`);
        console.log(`Address Functions: ${results.addressIntegration?.allFunctionsPresent ? '✅ ALL PRESENT' : '❌ MISSING SOME'}`);
        console.log(`Address Integration: ${results.addressIntegration?.visionIntegrated && results.addressIntegration?.bloomerangIntegrated ? '✅ INTEGRATED' : '❌ NOT INTEGRATED'}`);

        if (results.visionAppraisal?.success && results.bloomerang?.success) {
            console.log('\n🎉 BOTH ENTITY CREATION PROCESSES WORKING!');
        } else {
            console.log('\n⚠️ ISSUES FOUND - CHECK RESULTS ABOVE');
        }

        return results;

    } catch (error) {
        console.error('❌ Test execution failed:', error);
        results.error = error.message;
        return results;
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.testBothEntityCreationProcesses = testBothEntityCreationProcesses;
}