// Compare debug logic vs actual Case31Validator logic

const CompareLogic = {
    testBothLogics() {
        console.log("=== COMPARING DEBUG vs VALIDATOR LOGIC ===");

        const testName = "CONNELL JOHN & JILL";
        console.log(`Testing: "${testName}"`);

        // Common setup
        let name = testName.trim().toUpperCase();
        name = name.replace(/\s*,\s*/g, ', '); // Comma standardization
        name = name.replace(/,\s*$/, ',');

        const words = name.split(/\s+/).filter(word => word.length > 0);
        console.log(`Words: ${JSON.stringify(words)}`);

        // Business terms array (same as debug script)
        const businessTerms = [
            'LLC', 'INC', 'CORP', 'TRUST', 'TRUSTEE', 'ESTATE', 'FOUNDATION',
            'ASSOCIATION', 'SOCIETY', 'COMPANY', 'ENTERPRISES', 'PROPERTIES',
            'INVESTMENTS', 'HOLDINGS', 'MANAGEMENT', 'SERVICES', 'GROUP',
            'PARTNERS', 'PARTNERSHIP', 'CO', 'LTD', 'LIMITED', 'INCORPORATED'
        ];

        console.log("\n=== DEBUG SCRIPT LOGIC ===");

        // Debug script business term logic
        const debugResult = words.some(word => {
            const wordUpper = word.toUpperCase();
            const hasBusinessSubstring = businessTerms.some(term => wordUpper.includes(term));
            if (!hasBusinessSubstring) return false;
            const hasPunctuation = /[^\w\s]/.test(word);
            if (hasPunctuation) return true;
            const cleanWord = word.replace(/[^\w]/g, '');
            return businessTerms.includes(cleanWord);
        });

        console.log(`Debug hasBusinessTerms: ${debugResult}`);

        console.log("\n=== CASE31VALIDATOR LOGIC ===");

        // Case31Validator business term logic (simulated)
        const validatorResult = words.some(word => {
            console.log(`Testing word: "${word}"`);

            if (!word || typeof word !== 'string') return false;

            // Check if word contains any business term as substring
            const wordUpper = word.toUpperCase();
            const hasBusinessSubstring = businessTerms.some(term => {
                const contains = wordUpper.includes(term);
                if (contains) console.log(`  - Contains "${term}": ${contains}`);
                return contains;
            });

            console.log(`  - hasBusinessSubstring: ${hasBusinessSubstring}`);

            if (!hasBusinessSubstring) return false;

            // If word has punctuation AND contains business term, it's a business term word
            const hasPunctuation = /[^\w\s]/.test(word);
            console.log(`  - hasPunctuation: ${hasPunctuation}`);
            if (hasPunctuation) {
                console.log(`  - Returning true (punctuation + business substring)`);
                return true;
            }

            // Standard business term check (clean word)
            const cleanWord = word.replace(/[^\w]/g, '');
            const isExactMatch = businessTerms.includes(cleanWord);
            console.log(`  - cleanWord: "${cleanWord}", isExactMatch: ${isExactMatch}`);
            return isExactMatch;
        });

        console.log(`\nValidator hasBusinessTerms: ${validatorResult}`);

        // Compare results
        console.log("\n=== COMPARISON ===");
        console.log(`Debug result: ${debugResult}`);
        console.log(`Validator result: ${validatorResult}`);
        console.log(`Results match: ${debugResult === validatorResult}`);

        if (debugResult !== validatorResult) {
            console.log("❌ LOGIC MISMATCH FOUND!");
        } else {
            console.log("✅ Logic matches - issue must be elsewhere");
        }
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.CompareLogic = CompareLogic;
}