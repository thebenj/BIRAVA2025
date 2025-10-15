// Test ampersand splitting behavior

const AmpersandSplitTest = {
    testSplitting() {
        console.log("=== AMPERSAND SPLIT TEST ===");

        const testNames = [
            "FARON, DOUGLAS & BARBARA",
            "BREAULT, ROBERT & SUSAN",
            "BROWNELL, MICHAEL & BARBARA",
            "MAHER, ROBERT & KRISTIN",
            "GILMOUR, WILLIAM & MARLENE"
        ];

        testNames.forEach(name => {
            console.log(`\nTesting: "${name}"`);

            try {
                // Test the exact same splitting logic
                const normalized = name.trim().toUpperCase();
                console.log(`  Normalized: "${normalized}"`);

                // This is the exact line from parseWords
                const splitResult = normalized.split(/\s+/);
                console.log(`  Split result:`, splitResult);
                console.log(`  Split result length: ${splitResult.length}`);

                // Check each element in split result
                splitResult.forEach((word, index) => {
                    console.log(`    [${index}]: "${word}" (type: ${typeof word}, length: ${word?.length})`);
                    if (word === undefined || word === null) {
                        console.log(`    ❌ FOUND UNDEFINED/NULL AT INDEX ${index}`);
                    }
                });

                // Test the filter operation
                console.log(`  About to filter...`);
                const filtered = splitResult.filter((word, index) => {
                    console.log(`    Filtering [${index}]: "${word}" (length: ${word?.length})`);
                    if (word === undefined || word === null) {
                        console.log(`    ❌ UNDEFINED/NULL WORD FOUND IN FILTER`);
                        return false;
                    }
                    return word.length > 0;
                });

                console.log(`  Filtered result:`, filtered);
                console.log(`  ✅ Success - no errors`);

            } catch (error) {
                console.log(`  ❌ ERROR: ${error.message}`);
                console.log(`  Error stack:`, error.stack);
            }
        });
    },

    // Test alternative splitting approaches
    testAlternatives() {
        console.log("\n=== TESTING ALTERNATIVE SPLIT APPROACHES ===");

        const testName = "FARON, DOUGLAS & BARBARA";

        console.log(`Testing alternatives for: "${testName}"`);

        // Method 1: Simple space split
        try {
            const method1 = testName.split(' ').filter(word => word && word.trim().length > 0);
            console.log(`Method 1 (simple space): `, method1);
        } catch (e) {
            console.log(`Method 1 ERROR: ${e.message}`);
        }

        // Method 2: Multiple whitespace with safety checks
        try {
            const method2 = testName.split(/\s+/).filter(word => word != null && word !== undefined && word.length > 0);
            console.log(`Method 2 (safe filter): `, method2);
        } catch (e) {
            console.log(`Method 2 ERROR: ${e.message}`);
        }

        // Method 3: More explicit filtering
        try {
            const splitParts = testName.split(/\s+/);
            const method3 = [];
            for (let i = 0; i < splitParts.length; i++) {
                const word = splitParts[i];
                if (word && typeof word === 'string' && word.length > 0) {
                    method3.push(word);
                }
            }
            console.log(`Method 3 (explicit loop): `, method3);
        } catch (e) {
            console.log(`Method 3 ERROR: ${e.message}`);
        }
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.AmpersandSplitTest = AmpersandSplitTest;
}