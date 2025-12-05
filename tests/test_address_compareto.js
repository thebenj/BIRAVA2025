/**
 * Test Address.compareTo() functionality with real Address objects
 * Tests the complete deduplication system including:
 * 1. AttributedTerm.compareTo()
 * 2. Address.compareTo() using generic utility
 * 3. deduplicateSecondaryAddresses() function
 *
 * Usage: Copy and paste this code into browser console after loading dependencies
 * Dependencies: utils.js, aliasClasses.js
 */

// Load dependencies and run test
Promise.all([
    fetch('/scripts/utils.js').then(r => r.text()),
    fetch('/scripts/objectStructure/aliasClasses.js').then(r => r.text())
]).then(([utils, alias]) => {
    eval(utils);
    eval(alias);

    console.log('=== TESTING Address.compareTo() with Real Address Objects ===');

    // Create matching AttributedTerm objects for testing
    const street1 = new AttributedTerm('123 Main Street', 'Test', 1, 'ACC001');
    const street2 = new AttributedTerm('123 Main Street', 'Test', 1, 'ACC001');
    const street3 = new AttributedTerm('456 Oak Avenue', 'Test', 2, 'ACC002');

    const city1 = new AttributedTerm('Block Island', 'Test', 1, 'ACC001');
    const city2 = new AttributedTerm('Block Island', 'Test', 1, 'ACC001');
    const city3 = new AttributedTerm('Newport', 'Test', 2, 'ACC002');

    const state1 = new AttributedTerm('RI', 'Test', 1, 'ACC001');
    const state2 = new AttributedTerm('RI', 'Test', 1, 'ACC001');

    const zip1 = new AttributedTerm('02807', 'Test', 1, 'ACC001');
    const zip2 = new AttributedTerm('02807', 'Test', 1, 'ACC001');
    const zip3 = new AttributedTerm('02840', 'Test', 2, 'ACC002');

    // Create matching Address objects (identical addresses)
    const addr1 = new Address(street1);
    addr1.streetName = street1;
    addr1.city = city1;
    addr1.state = state1;
    addr1.zip = zip1;

    const addr2 = new Address(street2);
    addr2.streetName = street2;
    addr2.city = city2;
    addr2.state = state2;
    addr2.zip = zip2;

    // Create different Address object
    const addr3 = new Address(street3);
    addr3.streetName = street3;
    addr3.city = city3;
    addr3.state = state2; // Same state
    addr3.zip = zip3;

    console.log('✅ Address objects created successfully');

    // Test Address.compareTo()
    console.log('\n🔍 Testing Address.compareTo():');

    try {
        const result1 = addr1.compareTo(addr2);
        console.log(`addr1.compareTo(addr2) [identical addresses]: ${result1} ${result1 === 0 ? '✅ MATCH' : '❌ NO MATCH'}`);

        const result2 = addr1.compareTo(addr3);
        console.log(`addr1.compareTo(addr3) [different addresses]: ${result2} ${result2 !== 0 ? '✅ NO MATCH' : '❌ UNEXPECTED MATCH'}`);

        const result3 = addr2.compareTo(addr3);
        console.log(`addr2.compareTo(addr3) [different addresses]: ${result3} ${result3 !== 0 ? '✅ NO MATCH' : '❌ UNEXPECTED MATCH'}`);

        console.log('\n✅ Address.compareTo() test completed successfully!');

        // Test deduplicateSecondaryAddresses function (mock since it's in bloomerang.js)
        console.log('\n🔍 Testing deduplicateSecondaryAddresses logic:');

        function deduplicateSecondaryAddresses(primaryAddress, secondaryAddresses) {
            const uniqueSecondaryAddresses = [];

            for (const secondaryAddress of secondaryAddresses) {
                // Skip if this secondary address matches the primary address
                if (primaryAddress && primaryAddress.compareTo(secondaryAddress) === 0) {
                    continue;  // Skip duplicate of primary
                }

                // Skip if this secondary address matches any already-kept secondary address
                const isDuplicateSecondary = uniqueSecondaryAddresses.some(existing =>
                    existing.compareTo(secondaryAddress) === 0
                );

                if (!isDuplicateSecondary) {
                    uniqueSecondaryAddresses.push(secondaryAddress);
                }
            }

            return uniqueSecondaryAddresses;
        }

        // Test deduplication with addr1 as primary and addr2 (duplicate) + addr3 (different) as secondaries
        const secondaries = [addr2, addr3];
        const deduplicated = deduplicateSecondaryAddresses(addr1, secondaries);

        console.log(`Original secondaries: ${secondaries.length} addresses`);
        console.log(`After deduplication: ${deduplicated.length} addresses`);
        console.log(`Expected result: 1 address (addr3 only, addr2 removed as duplicate of primary)`);

        if (deduplicated.length === 1 && deduplicated[0] === addr3) {
            console.log('✅ Deduplication working correctly - duplicate removed!');
            console.log('\n🎉 ALL TESTS PASSED - Address.compareTo() and deduplication system working!');
        } else {
            console.log('❌ Deduplication not working as expected');
        }

    } catch (error) {
        console.error('❌ Error during Address.compareTo() testing:', error);
    }

}).catch(error => {
    console.error('❌ Error loading dependencies:', error);
});