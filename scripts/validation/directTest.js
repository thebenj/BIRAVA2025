// Direct test of "CONNELL JOHN & JILL" with full Case31Validator

const DirectTest = {
    async runTest() {
        console.log("=== DIRECT TEST: CONNELL JOHN & JILL ===");

        const testName = "CONNELL JOHN & JILL";
        console.log(`Testing: "${testName}"`);

        try {
            // Test with actual Case31Validator
            console.log("\n=== USING ACTUAL CASE31VALIDATOR ===");

            // Check if Case31Validator is loaded
            if (typeof Case31Validator === 'undefined') {
                console.log("Case31Validator not loaded, loading now...");
                const script = document.createElement('script');
                script.src = './scripts/validation/case31Validator.js';
                document.head.appendChild(script);

                // Wait for load
                await new Promise(resolve => {
                    script.onload = resolve;
                });
                console.log("Case31Validator loaded");
            }

            // Run detection
            const detectedCase = Case31Validator.detectCase(testName, 9999);
            console.log(`Case31Validator.detectCase result: "${detectedCase}"`);

            // Manual step-by-step analysis
            console.log("\n=== MANUAL STEP-BY-STEP ANALYSIS ===");

            // Step 1: Name processing
            let name = testName.trim().toUpperCase();
            name = name.replace(/\s*,\s*/g, ', ');
            name = name.replace(/,\s*$/, ',');
            console.log(`1. Processed name: "${name}"`);

            // Step 2: Parse words
            const words = Case31Validator.parseWords(name);
            console.log(`2. Words: ${JSON.stringify(words)} (count: ${words.length})`);

            // Step 3: Business terms check
            const hasBusinessTerms = Case31Validator.hasBusinessTerms(words);
            console.log(`3. hasBusinessTerms: ${hasBusinessTerms}`);

            // Step 4: Punctuation analysis
            const punctuationInfo = Case31Validator.analyzePunctuation(words);
            console.log(`4. Punctuation info:`, punctuationInfo);

            // Step 5: Case logic trace
            console.log(`\n5. Case logic trace:`);
            console.log(`   wordCount: ${words.length}`);
            console.log(`   hasBusinessTerms: ${hasBusinessTerms}`);
            console.log(`   ampersandOnly: ${punctuationInfo.ampersandOnly}`);

            if (words.length === 4) {
                console.log(`   → 4 words detected`);
                if (!hasBusinessTerms) {
                    console.log(`   → No business terms`);
                    if (punctuationInfo.ampersandOnly) {
                        console.log(`   → Ampersand only → Should be Case 17`);
                    }
                }
            }

            // Detailed business term analysis
            console.log(`\n6. Detailed business term analysis:`);
            words.forEach((word, idx) => {
                const isBusinessWord = Case31Validator.isBusinessTermWord(word);
                console.log(`   [${idx}] "${word}" → isBusinessTermWord: ${isBusinessWord}`);
            });

            const hasIntegerPattern = Case31Validator.hasIntegerBusinessPattern(words);
            console.log(`   hasIntegerBusinessPattern: ${hasIntegerPattern}`);

        } catch (error) {
            console.error("Test error:", error);
        }
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.DirectTest = DirectTest;
}