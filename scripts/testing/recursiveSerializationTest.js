/**
 * Recursive Serialization Testing Functions
 *
 * Phase 1 Testing: Verify recursive serialization preserves class constructors
 * throughout nested object hierarchies.
 *
 * USAGE: Load all required scripts, then call testRecursiveSerializationPhase1()
 */

/**
 * Phase 1 Test: Single Entity Serialization Round-Trip
 * Tests that serialization preserves all nested class constructors
 */
async function testRecursiveSerializationPhase1() {
    console.log("🧪 PHASE 1: Testing Recursive Serialization with Single Entity");
    console.log("=" .repeat(60));

    try {
        // Step 1: Load required dependencies
        console.log("Step 1: Loading class registry validation...");
        const registryReport = validateClassRegistry();
        console.log("📊 Class Registry Status:", registryReport);

        if (registryReport.missing.length > 0) {
            console.warn("⚠️  Missing classes:", registryReport.missing);
        }

        // Step 2: Load a single entity from existing data
        console.log("\nStep 2: Loading single VisionAppraisal entity...");
        const testData = await VisionAppraisal.loadProcessedDataFromGoogleDrive();

        if (!testData || !testData.data || testData.data.length === 0) {
            throw new Error("No entities available for testing");
        }

        // Get first entity for testing
        const originalEntity = testData.data[0];
        console.log("📝 Original entity type:", originalEntity.constructor.name);
        console.log("📝 Original entity structure:");
        console.log("  - locationIdentifier:", originalEntity.locationIdentifier?.constructor?.name || "null");
        console.log("  - name:", originalEntity.name?.constructor?.name || "null");
        console.log("  - contactInfo:", originalEntity.contactInfo?.constructor?.name || "null");

        // Step 3: Test serialization
        console.log("\nStep 3: Testing recursive serialization...");
        const serialized = serializeWithTypes(originalEntity);
        console.log("✅ Serialization successful, length:", serialized.length);

        // Step 4: Test deserialization
        console.log("\nStep 4: Testing recursive deserialization...");
        const deserialized = deserializeWithTypes(serialized);
        console.log("✅ Deserialization successful");

        // Step 5: Verify class constructors
        console.log("\nStep 5: Verifying class constructor preservation...");
        console.log("📊 Constructor Comparison:");
        console.log("  Root Entity:");
        console.log("    Original:", originalEntity.constructor.name);
        console.log("    Restored:", deserialized.constructor.name);
        console.log("    Match:", originalEntity.constructor.name === deserialized.constructor.name ? "✅" : "❌");

        if (originalEntity.locationIdentifier) {
            console.log("  LocationIdentifier:");
            console.log("    Original:", originalEntity.locationIdentifier.constructor.name);
            console.log("    Restored:", deserialized.locationIdentifier?.constructor?.name || "MISSING");
            console.log("    Match:", originalEntity.locationIdentifier.constructor.name === deserialized.locationIdentifier?.constructor?.name ? "✅" : "❌");
        }

        if (originalEntity.name) {
            console.log("  Name:");
            console.log("    Original:", originalEntity.name.constructor.name);
            console.log("    Restored:", deserialized.name?.constructor?.name || "MISSING");
            console.log("    Match:", originalEntity.name.constructor.name === deserialized.name?.constructor?.name ? "✅" : "❌");
        }

        if (originalEntity.contactInfo) {
            console.log("  ContactInfo:");
            console.log("    Original:", originalEntity.contactInfo.constructor.name);
            console.log("    Restored:", deserialized.contactInfo?.constructor?.name || "MISSING");
            console.log("    Match:", originalEntity.contactInfo.constructor.name === deserialized.contactInfo?.constructor?.name ? "✅" : "❌");
        }

        // Step 6: Deep nested class verification
        console.log("\nStep 6: Deep nested class verification...");
        let deepTestsPassed = 0;
        let deepTestsTotal = 0;

        // Test nested objects in locationIdentifier
        if (originalEntity.locationIdentifier && originalEntity.locationIdentifier.identifier) {
            deepTestsTotal++;
            const originalNested = originalEntity.locationIdentifier.identifier;
            const restoredNested = deserialized.locationIdentifier?.identifier;

            if (originalNested.constructor.name === restoredNested?.constructor?.name) {
                deepTestsPassed++;
                console.log("  ✅ LocationIdentifier.identifier:", originalNested.constructor.name);
            } else {
                console.log("  ❌ LocationIdentifier.identifier:", originalNested.constructor.name, "→", restoredNested?.constructor?.name || "MISSING");
            }
        }

        // Test AttributedTerm objects if present
        if (originalEntity.name && originalEntity.name.identifier && originalEntity.name.identifier.primaryAlias) {
            deepTestsTotal++;
            const originalAlias = originalEntity.name.identifier.primaryAlias;
            const restoredAlias = deserialized.name?.identifier?.primaryAlias;

            if (originalAlias.constructor.name === restoredAlias?.constructor?.name) {
                deepTestsPassed++;
                console.log("  ✅ Name.identifier.primaryAlias:", originalAlias.constructor.name);
            } else {
                console.log("  ❌ Name.identifier.primaryAlias:", originalAlias.constructor.name, "→", restoredAlias?.constructor?.name || "MISSING");
            }
        }

        // Step 7: Final assessment
        console.log("\n" + "=".repeat(60));
        console.log("🎯 PHASE 1 TEST RESULTS:");
        console.log(`📊 Deep nested tests: ${deepTestsPassed}/${deepTestsTotal} passed`);

        const rootMatch = originalEntity.constructor.name === deserialized.constructor.name;
        const hasNestedClasses = deepTestsTotal > 0;
        const allNestedPass = deepTestsPassed === deepTestsTotal;

        if (rootMatch && (!hasNestedClasses || allNestedPass)) {
            console.log("✅ PHASE 1 SUCCESSFUL: Recursive serialization working!");
            console.log("   Ready to proceed to Phase 2");
            return { success: true, rootMatch, deepTestsPassed, deepTestsTotal };
        } else {
            console.log("❌ PHASE 1 ISSUES FOUND:");
            if (!rootMatch) console.log("   - Root entity constructor not preserved");
            if (hasNestedClasses && !allNestedPass) console.log("   - Some nested class constructors not preserved");
            console.log("   🔧 Need to fix serialization before proceeding");
            return { success: false, rootMatch, deepTestsPassed, deepTestsTotal };
        }

    } catch (error) {
        console.error("❌ Phase 1 test failed:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Quick validation that serialization utilities are loaded and functional
 */
function validateSerializationSetup() {
    console.log("🔍 Validating Serialization Setup...");

    const requiredFunctions = ['serializeWithTypes', 'deserializeWithTypes', 'validateClassRegistry'];
    const missing = requiredFunctions.filter(fn => typeof window[fn] !== 'function');

    if (missing.length > 0) {
        console.error("❌ Missing functions:", missing);
        console.log("💡 Make sure classSerializationUtils.js is loaded");
        return false;
    }

    console.log("✅ All serialization functions available");
    return true;
}