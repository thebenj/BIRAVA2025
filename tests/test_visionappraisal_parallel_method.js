/**
 * Test VisionAppraisal Parallel Method Implementation
 *
 * This test validates the new _processTextToAddressNew method runs alongside
 * the original _processTextToAddress method for comparison validation.
 *
 * PHASE 2 PARALLEL IMPLEMENTATION TESTING:
 * - Tests _processTextToAddressNew using generalized architecture
 * - Compares results with original _processTextToAddress
 * - Validates identical functionality before migration
 *
 * Created: 2024-11-21
 * Purpose: Phase 2 parallel validation for VisionAppraisal generalized architecture
 */

// Test VisionAppraisal Parallel Method - Copy/paste into browser console
(function testVisionAppraisalParallelMethod() {
    console.log("Testing VisionAppraisal Parallel Method Implementation");

    // Test addresses - various VisionAppraisal patterns
    const testAddresses = [
        "123 Main Street Block Island RI 02807",
        "PO Box 123, New Shoreham, RI 02807",
        "456 Ocean View Drive, Block Island, RI 02807",
        "789 Spring Street, Block Island RI",
        "101 Center Road Block Island 02807"
    ];

    console.log("\n=== Testing Both Methods in Parallel ===");

    testAddresses.forEach((addressText, index) => {
        console.log(`\nTest ${index + 1}: "${addressText}"`);

        try {
            // Create temporary Individual to test methods
            const tempEntity = new Individual(
                new SimpleIdentifiers(new AttributedTerm("test", "Test", 0, "TEST")),
                new IndividualName(
                    new AttributedTerm("Test", "Test", 0, "TEST"),
                    new AttributedTerm("Person", "Test", 0, "TEST")
                ),
                null, null,
                new IndicativeData(new AttributedTerm("TEST001", "Test", 0, "TEST"))
            );

            // Test original method
            console.log("  Testing ORIGINAL _processTextToAddress:");
            const originalResult = tempEntity._processTextToAddress(addressText, 'propertyLocation');
            console.log("  Original result:", originalResult ? "✅ Address created" : "❌ No address");
            if (originalResult) {
                console.log(`    City: "${originalResult.city?.term}", State: "${originalResult.state?.term}"`);
                console.log(`    Block Island: ${originalResult.isBlockIslandAddress?.term || false}`);
            }

            // Test new parallel method
            console.log("  Testing NEW _processTextToAddressNew:");
            const newResult = tempEntity._processTextToAddressNew(addressText, 'propertyLocation');
            console.log("  New result:", newResult ? "✅ Address created" : "❌ No address");
            if (newResult) {
                console.log(`    City: "${newResult.city?.term}", State: "${newResult.state?.term}"`);
                console.log(`    Block Island: ${newResult.isBlockIslandAddress?.term || false}`);
            }

            // Compare results
            if (originalResult && newResult) {
                const cityMatch = originalResult.city?.term === newResult.city?.term;
                const stateMatch = originalResult.state?.term === newResult.state?.term;
                const blockIslandMatch = originalResult.isBlockIslandAddress?.term === newResult.isBlockIslandAddress?.term;

                console.log("  COMPARISON:");
                console.log(`    City match: ${cityMatch ? "✅" : "❌"}`);
                console.log(`    State match: ${stateMatch ? "✅" : "❌"}`);
                console.log(`    Block Island match: ${blockIslandMatch ? "✅" : "❌"}`);
                console.log(`    Overall: ${cityMatch && stateMatch && blockIslandMatch ? "✅ IDENTICAL" : "❌ DIFFERENT"}`);
            } else if (!originalResult && !newResult) {
                console.log("  COMPARISON: ✅ Both methods returned null (consistent)");
            } else {
                console.log("  COMPARISON: ❌ Methods returned different success/failure results");
            }

        } catch (error) {
            console.log(`  ❌ Error testing address: ${error.message}`);
            console.log('  ERROR STACK:', error.stack);
        }
    });

    console.log(`\n🎯 PARALLEL METHOD TESTING COMPLETE`);
    console.log("Next step: Run extensive validation on VisionAppraisal data to ensure identical results");
})();

// To run this test:
// 1. Load the application at http://127.0.0.1:1337/
// 2. Ensure all dependencies are loaded (scripts should auto-load)
// 3. Copy and paste this function into the browser console
// 4. The test will compare both methods on sample VisionAppraisal addresses