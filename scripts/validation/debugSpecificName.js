// Debug specific name classification

const DebugSpecificName = {
    testSpecificName() {
        console.log("=== DEBUGGING SPECIFIC NAME ===");

        const testName = "CONNELL JOHN & JILL";
        console.log(`Testing: "${testName}"`);

        try {
            // Copy the exact logic from Case31Validator
            let name = testName.trim().toUpperCase();
            name = name.replace(/\s*,\s*/g, ', '); // Comma standardization
            name = name.replace(/,\s*$/, ',');

            console.log(`1. Standardized: "${name}"`);

            const words = name.split(/\s+/).filter(word => word.length > 0);
            console.log(`2. Words: ${JSON.stringify(words)}`);
            console.log(`3. Word count: ${words.length}`);

            // Test business term detection step by step
            const businessTerms = [
                'LLC', 'INC', 'CORP', 'TRUST', 'TRUSTEE', 'ESTATE', 'FOUNDATION',
                'ASSOCIATION', 'SOCIETY', 'COMPANY', 'ENTERPRISES', 'PROPERTIES',
                'INVESTMENTS', 'HOLDINGS', 'MANAGEMENT', 'SERVICES', 'GROUP',
                'PARTNERS', 'PARTNERSHIP', 'CO', 'LTD', 'LIMITED', 'INCORPORATED'
            ];

            console.log(`4. Testing each word for business terms:`);
            words.forEach((word, index) => {
                const cleanWord = word.replace(/[^\w]/g, '');
                const isBusinessTerm = businessTerms.includes(cleanWord);
                const hasPunctuation = /[^\w\s]/.test(word);
                const containsBusinessSubstring = businessTerms.some(term => word.toUpperCase().includes(term));

                console.log(`   [${index}] "${word}"`);
                console.log(`       Clean: "${cleanWord}"`);
                console.log(`       Is business term: ${isBusinessTerm}`);
                console.log(`       Has punctuation: ${hasPunctuation}`);
                console.log(`       Contains business substring: ${containsBusinessSubstring}`);
            });

            // Test integer + business pattern
            console.log(`5. Testing integer + business pattern:`);
            let hasIntegerBusiness = false;
            for (let i = 0; i < words.length - 1; i++) {
                const currentWord = words[i].replace(/[^\w]/g, '');
                const nextWord = words[i + 1].replace(/[^\w]/g, '');
                const isCurrentInteger = /^\d+$/.test(currentWord);
                const isNextBusiness = businessTerms.includes(nextWord);

                console.log(`   "${currentWord}" + "${nextWord}": integer=${isCurrentInteger}, business=${isNextBusiness}`);
                if (isCurrentInteger && isNextBusiness) {
                    hasIntegerBusiness = true;
                }
            }

            const hasBusinessTermsResult = words.some(word => {
                const wordUpper = word.toUpperCase();
                const hasBusinessSubstring = businessTerms.some(term => wordUpper.includes(term));
                if (!hasBusinessSubstring) return false;
                const hasPunctuation = /[^\w\s]/.test(word);
                if (hasPunctuation) return true;
                const cleanWord = word.replace(/[^\w]/g, '');
                return businessTerms.includes(cleanWord);
            }) || hasIntegerBusiness;

            console.log(`6. Final hasBusinessTerms result: ${hasBusinessTermsResult}`);

            // Test punctuation
            const joinedText = words.join(' ');
            const hasCommas = joinedText.includes(',');
            const hasAmpersand = joinedText.includes('&');
            const hasSlash = joinedText.includes('/');

            console.log(`7. Punctuation analysis:`);
            console.log(`   Has commas: ${hasCommas}`);
            console.log(`   Has ampersand: ${hasAmpersand}`);
            console.log(`   Has slash: ${hasSlash}`);

            // Now trace through the case logic
            console.log(`8. Tracing case logic:`);

            if (words.length === 4) {
                console.log(`   - 4 words detected`);

                if (!hasBusinessTermsResult) {
                    console.log(`   - No business terms`);

                    if (!hasCommas && hasAmpersand && !hasSlash) {
                        console.log(`   - Ampersand only detected → Should be Case 17`);
                        return 'case17';
                    }
                }
            }

            console.log(`   - Did not match 4-word cases, checking catch-all`);

            if (!hasBusinessTermsResult && hasAmpersand) {
                console.log(`   - No business terms, has ampersand → Should be Case 32`);
                return 'case32';
            }

            if (hasBusinessTermsResult) {
                console.log(`   - Has business terms → Would be Case 34`);
                return 'case34';
            }

            return 'unmatched';

        } catch (error) {
            console.log(`❌ ERROR: ${error.message}`);
            console.log(`Stack:`, error.stack);
            return 'error';
        }
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.DebugSpecificName = DebugSpecificName;
}