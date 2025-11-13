/**
 * Diagnostic Test for Block Island Street Recognition Issues
 *
 * Investigates why OFF CORN NECK, OFF COONEYMUS ROAD, OFF CENTER ROAD, OFF BEACON HILL
 * are not being recognized as Block Island addresses
 */

async function diagnosticBlockIslandStreets() {
    console.log('🔍 === BLOCK ISLAND STREET RECOGNITION DIAGNOSTIC ===\n');

    try {
        // Step 1: Check if street database is loaded
        console.log('📚 Step 1: Check street database availability');
        if (typeof window === 'undefined') {
            console.log('❌ No window object - running in wrong context');
            return;
        }

        if (!window.blockIslandStreets) {
            console.log('❌ window.blockIslandStreets not loaded');
            console.log('🔧 Attempting to load from Google Drive...');

            // Try to load the streets database
            if (typeof loadBlockIslandStreetsFromDrive !== 'undefined') {
                try {
                    const streets = await loadBlockIslandStreetsFromDrive();
                    console.log(`✅ Loaded ${streets.size} streets from Google Drive`);
                } catch (error) {
                    console.log(`❌ Failed to load streets: ${error.message}`);
                    return;
                }
            } else {
                console.log('❌ loadBlockIslandStreetsFromDrive function not available');
                return;
            }
        } else {
            console.log(`✅ Street database available with ${window.blockIslandStreets.size} streets`);
        }

        // Step 2: Check specific problematic streets
        console.log('\n🔍 Step 2: Check specific problematic streets');
        const problemStreets = [
            'CORN NECK',
            'OFF CORN NECK',
            'COONEYMUS ROAD',
            'OFF COONEYMUS ROAD',
            'CENTER ROAD',
            'OFF CENTER ROAD',
            'BEACON HILL',
            'OFF BEACON HILL'
        ];

        for (const street of problemStreets) {
            const inDatabase = window.blockIslandStreets.has(street.toUpperCase());
            console.log(`${inDatabase ? '✅' : '❌'} "${street}" ${inDatabase ? 'FOUND' : 'NOT FOUND'} in database`);
        }

        // Step 3: Show sample of what IS in the database
        console.log('\n📋 Step 3: Sample of streets in database:');
        const streetArray = Array.from(window.blockIslandStreets);
        const sample = streetArray.slice(0, 20);
        sample.forEach(street => console.log(`  • ${street}`));

        if (streetArray.length > 20) {
            console.log(`  ... and ${streetArray.length - 20} more`);
        }

        // Step 4: Test address processing directly
        console.log('\n🧪 Step 4: Test address processing for problematic addresses');

        // Check if address processing functions are available
        if (typeof processAddress === 'undefined') {
            console.log('❌ processAddress function not available');
            return;
        }

        const testAddresses = [
            { addr: '1742 OFF CORN NECK', type: 'VisionAppraisal', field: 'propertyLocation' },
            { addr: '1499 OFF COONEYMUS ROAD', type: 'VisionAppraisal', field: 'propertyLocation' },
            { addr: 'OFF CENTER ROAD', type: 'VisionAppraisal', field: 'propertyLocation' },
            { addr: 'OFF BEACON HILL', type: 'VisionAppraisal', field: 'propertyLocation' }
        ];

        for (const test of testAddresses) {
            console.log(`\n🔍 Testing: "${test.addr}"`);
            try {
                const result = processAddress(test.addr, test.type, test.field);
                if (result) {
                    console.log(`  ✅ Processed successfully`);
                    console.log(`  📍 isBlockIslandAddress: ${result.isBlockIslandAddress}`);
                    console.log(`  🏠 Street: "${result.street}"`);
                    console.log(`  🏙️ City: "${result.city}"`);
                    if (result.blockIslandReason) {
                        console.log(`  💡 Reason: ${result.blockIslandReason}`);
                    }
                } else {
                    console.log(`  ❌ Processing failed (null result)`);
                }
            } catch (error) {
                console.log(`  ❌ Processing error: ${error.message}`);
            }
        }

        // Step 5: Test parse-address library behavior
        console.log('\n🔍 Step 5: Test parse-address library behavior');

        if (typeof parseAddress === 'undefined') {
            console.log('❌ parse-address library not available');
            return;
        }

        const parseTests = [
            '1742 OFF CORN NECK',
            '1742 OFF CORN NECK ROAD'
        ];

        for (const testAddr of parseTests) {
            console.log(`\n📋 Raw parse-address test: "${testAddr}"`);
            try {
                const parsed = parseAddress.parseLocation(testAddr);
                if (parsed) {
                    console.log(`  Street: "${parsed.street || 'null'}"`);
                    console.log(`  Type: "${parsed.type || 'null'}"`);
                    console.log(`  Number: "${parsed.number || 'null'}"`);
                    console.log(`  City: "${parsed.city || 'null'}"`);
                } else {
                    console.log(`  ❌ Parse failed`);
                }
            } catch (error) {
                console.log(`  ❌ Parse error: ${error.message}`);
            }
        }

    } catch (error) {
        console.error('❌ Diagnostic failed:', error);
        console.error('Stack:', error.stack);
    }

    console.log('\n🎉 === BLOCK ISLAND STREET DIAGNOSTIC COMPLETE ===');
}

console.log('Block Island Street Recognition Diagnostic Loaded');
console.log('Run: diagnosticBlockIslandStreets()');