/**
 * Entity Address Processing Test
 *
 * Tests the new address processing functionality in Entity constructors
 * with transparent output showing exactly how addresses are stored
 */

// Comprehensive Entity Address Processing Test
async function testEntityAddressProcessing() {
    console.log('🧪 === ENTITY ADDRESS PROCESSING TEST ===');
    console.log('Testing address parameter processing with transparent output\n');

    // Load required dependencies
    const scripts = [
        './scripts/objectStructure/aliasClasses.js',
        './scripts/objectStructure/contactInfo.js',
        './scripts/objectStructure/entityClasses.js',
        './scripts/address/addressProcessing.js'
    ];

    console.log('📚 Loading dependencies...');
    for (const script of scripts) {
        try {
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = script;
                s.onload = resolve;
                s.onerror = reject;
                document.head.appendChild(s);
            });
            console.log(`  ✅ ${script}`);
        } catch (error) {
            console.error(`  ❌ Failed to load ${script}:`, error);
            return;
        }
    }

    console.log('\n🔍 === TEST CASES ===\n');

    // Test 1: Text addresses (Case a)
    console.log('📍 TEST 1: Text Address Processing (Case a)');
    console.log('Creating entity with text propertyLocation and ownerAddress...\n');

    try {
        const entity1 = new Entity(
            null, // locationIdentifier
            null, // name
            '123 Main Street, Block Island, RI 02807', // propertyLocation (text)
            '456 Ocean Ave, Newport, RI 02840', // ownerAddress (text)
            null // accountNumber
        );

        console.log('✅ Entity created successfully');
        console.log('\n🔎 DETAILED ADDRESS ANALYSIS:');
        console.log('  ContactInfo instantiated:', entity1.contactInfo !== null);

        if (entity1.contactInfo) {
            // Primary Address Analysis
            console.log('\n  📌 PRIMARY ADDRESS (from propertyLocation):');
            const primaryAddr = entity1.contactInfo.primaryAddress;
            if (primaryAddr) {
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
                console.log('    • PRIMARY ADDRESS IS NULL');
            }

            // Secondary Address Analysis
            console.log('\n  📮 SECONDARY ADDRESSES (from ownerAddress):');
            const secondaryAddrs = entity1.contactInfo.secondaryAddress;
            console.log('    • Count:', secondaryAddrs.length);

            if (secondaryAddrs.length > 0) {
                secondaryAddrs.forEach((addr, index) => {
                    console.log(`\n    📦 Secondary Address ${index + 1}:`);
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
                });
            }
        }

    } catch (error) {
        console.error('❌ Test 1 failed:', error);
        console.error('Stack:', error.stack);
    }

    // Test 2: Null addresses
    console.log('\n\n📍 TEST 2: Null Address Parameters');
    console.log('Creating entity with null address parameters...\n');

    try {
        const entity2 = new Entity(null, null, null, null, null);
        console.log('✅ Entity created successfully');
        console.log('  ContactInfo remains null:', entity2.contactInfo === null);

    } catch (error) {
        console.error('❌ Test 2 failed:', error);
    }

    // Test 3: Only propertyLocation
    console.log('\n\n📍 TEST 3: Single Address Processing');
    console.log('Creating entity with only propertyLocation...\n');

    try {
        const entity3 = new Entity(
            null, // locationIdentifier
            null, // name
            '789 Spring Street, Block Island, RI 02807', // propertyLocation only
            null, // ownerAddress null
            null // accountNumber
        );

        console.log('✅ Entity created successfully');
        console.log('\n🔎 SINGLE ADDRESS ANALYSIS:');
        console.log('  ContactInfo instantiated:', entity3.contactInfo !== null);

        if (entity3.contactInfo) {
            console.log('  Primary address set:', entity3.contactInfo.primaryAddress !== null);
            console.log('  Secondary addresses count:', entity3.contactInfo.secondaryAddress.length);

            if (entity3.contactInfo.primaryAddress) {
                const addr = entity3.contactInfo.primaryAddress;
                console.log('\n  📌 PRIMARY ADDRESS DETAILS:');
                console.log('    • Type:', addr.constructor.name);
                console.log('    • All Properties:');
                for (const [propName, propValue] of Object.entries(addr)) {
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
            }
        }

    } catch (error) {
        console.error('❌ Test 3 failed:', error);
    }

    // Test 4: Type detection validation
    console.log('\n\n📍 TEST 4: Type Detection Validation');
    console.log('Testing parameter type detection...\n');

    try {
        // Create a test entity to access the detection method
        const testEntity = new Entity(null, null, null, null, null);

        // Test different parameter types
        const testCases = [
            { value: "123 Main St", expected: "text" },
            { value: null, expected: "other" },
            { value: 42, expected: "other" },
            { value: {}, expected: "other" },
            { value: { primaryAlias: {} }, expected: "complexIdentifier" }
        ];

        console.log('  🔍 Type Detection Results:');
        testCases.forEach(testCase => {
            const detected = testEntity._detectParameterType(testCase.value);
            const status = detected === testCase.expected ? '✅' : '❌';
            console.log(`    ${status} ${JSON.stringify(testCase.value)} → "${detected}" (expected: "${testCase.expected}")`);
        });

    } catch (error) {
        console.error('❌ Test 4 failed:', error);
    }

    console.log('\n🎉 === ENTITY ADDRESS PROCESSING TEST COMPLETE ===');
    console.log('\nThis test shows exactly how addresses are stored in entity objects.');
    console.log('Check the detailed analysis above to verify correct address processing.');

    return 'Address processing test completed with detailed output';
}

console.log('Entity Address Processing Test Script Loaded');
console.log('Run: testEntityAddressProcessing()');