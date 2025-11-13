// Test Business Term Detection Fix
// Verify "ERNST, KEVIN & BARNICOAT, NELL" routes to Case 26 instead of Case 31

console.log('=== BUSINESS TERM DETECTION FIX TEST ===');

// Load case31Validator
const script1 = document.createElement('script');
script1.src = './scripts/validation/case31Validator.js';
script1.onload = () => {
    console.log('✅ Case31Validator loaded');

    // Test cases
    const testCases = [
        {
            name: "ERNST, KEVIN & BARNICOAT, NELL",
            expected: "Case 26",
            description: "Should route to Case 26 (was routing to Case 31 due to 'CO' in BARNICOAT)"
        },
        {
            name: "TRUST/TRUSTEE",
            expected: "Business term detected",
            description: "Should still detect business term (slash in internal position)"
        },
        {
            name: "SUSAN-BURT",
            expected: "No business term",
            description: "Should not detect business term (hyphen excluded)"
        },
        {
            name: "BARNICOAT,",
            expected: "No business term",
            description: "Should not detect business term (comma in last position only)"
        }
    ];

    setTimeout(() => {
        console.log('\n=== TESTING BUSINESS TERM DETECTION ===');

        testCases.forEach((test, index) => {
            console.log(`\n${index + 1}. Testing: "${test.name}"`);
            console.log(`   Expected: ${test.expected}`);
            console.log(`   Description: ${test.description}`);

            const words = test.name.split(' ');
            const validator = Case31Validator;

            // Test business term detection
            const hasBusinessTerms = validator.hasBusinessTerms(words);
            console.log(`   hasBusinessTerms: ${hasBusinessTerms}`);

            // Test case detection for the main test case
            if (test.name === "ERNST, KEVIN & BARNICOAT, NELL") {
                const detectedCase = validator.detectCase(test.name);
                console.log(`   Detected Case: ${detectedCase}`);

                if (detectedCase === 'case26') {
                    console.log('   ✅ SUCCESS: Routes to Case 26!');
                } else {
                    console.log('   ❌ FAILED: Does not route to Case 26');
                }
            }

            // Test individual word detection for debugging
            words.forEach(word => {
                const isBusinessTerm = validator.isBusinessTermWord(word);
                if (isBusinessTerm) {
                    console.log(`     "${word}" → business term detected`);
                }
            });
        });

        console.log('\n=== TEST COMPLETE ===');
    }, 100);
};

document.head.appendChild(script1);

console.log('Business term fix test script loaded. Test will run automatically.');