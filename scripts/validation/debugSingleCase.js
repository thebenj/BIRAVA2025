// Debug Single Case - Focus on one error record to find the exact .length issue

const DebugSingleCase = {
    // Test with just one problematic name from the error log
    testSingleCase() {
        console.log("=== DEBUGGING SINGLE CASE ===");

        const testName = "FARON, DOUGLAS & BARBARA";
        console.log(`Testing: "${testName}"`);

        try {
            // Manually run through the detection steps with logging
            const name = testName.trim().toUpperCase();
            console.log(`1. Normalized name: "${name}"`);

            const words = this.parseWords(name);
            console.log(`2. Parsed words:`, words);
            console.log(`   - words type:`, typeof words);
            console.log(`   - words.length:`, words?.length);

            const wordCount = words.length;
            console.log(`3. Word count: ${wordCount}`);

            const hasBusinessTerms = this.hasBusinessTerms(words);
            console.log(`4. Has business terms: ${hasBusinessTerms}`);

            const punctuationInfo = this.analyzePunctuation(words);
            console.log(`5. Punctuation info:`, punctuationInfo);

            // Now test the 4-word case logic that should apply
            if (wordCount === 4) {
                console.log(`6. Testing 4-word cases...`);

                if (!hasBusinessTerms) {
                    console.log(`7. No business terms, checking ampersand+comma patterns...`);

                    if (punctuationInfo.hasAmpersand && punctuationInfo.hasCommas) {
                        console.log(`8. Has ampersand and commas, checking first word ends with comma...`);

                        console.log(`   - About to call firstWordEndsWithComma(words)`);
                        console.log(`   - words parameter:`, words);
                        console.log(`   - words[0]:`, words[0]);

                        const firstWordResult = this.firstWordEndsWithComma(words);
                        console.log(`9. First word ends with comma: ${firstWordResult}`);

                        if (firstWordResult) {
                            console.log(`10. Should return 'case15a'`);
                            return 'case15a';
                        }
                    }
                }
            }

            console.log(`No matching case found - this shouldn't happen`);
            return 'unmatched';

        } catch (error) {
            console.log(`ERROR CAUGHT: ${error.message}`);
            console.log(`Error stack:`, error.stack);
            return 'error';
        }
    },

    // Copy the helper functions from Case31Validator for testing
    parseWords(name) {
        console.log(`   parseWords called with: "${name}" (type: ${typeof name})`);

        if (!name || typeof name !== 'string') {
            console.log(`   ERROR: parseWords received invalid input: ${name}`);
            return [];
        }

        const result = name.split(/\s+/).filter(word => word.length > 0);
        console.log(`   parseWords result:`, result);
        return result;
    },

    hasBusinessTerms(words) {
        console.log(`   hasBusinessTerms called with:`, words, `(type: ${typeof words})`);

        if (!words || !Array.isArray(words)) {
            console.log(`   ERROR: hasBusinessTerms received invalid input: ${words}`);
            return false;
        }

        const businessTerms = [
            'LLC', 'INC', 'CORP', 'TRUST', 'TRUSTEE', 'ESTATE', 'FOUNDATION',
            'ASSOCIATION', 'SOCIETY', 'COMPANY', 'ENTERPRISES', 'PROPERTIES',
            'INVESTMENTS', 'HOLDINGS', 'MANAGEMENT', 'SERVICES', 'GROUP',
            'PARTNERS', 'PARTNERSHIP', 'CO', 'LTD', 'LIMITED', 'INCORPORATED'
        ];

        const result = words.some(word => {
            const cleanWord = word.replace(/[^\w]/g, '');
            return businessTerms.includes(cleanWord);
        });

        console.log(`   hasBusinessTerms result: ${result}`);
        return result;
    },

    analyzePunctuation(words) {
        console.log(`   analyzePunctuation called with:`, words, `(type: ${typeof words})`);

        if (!words || !Array.isArray(words)) {
            console.log(`   ERROR: analyzePunctuation received invalid input: ${words}`);
            return {
                hasCommas: false,
                hasAmpersand: false,
                hasSlash: false,
                hasMajorPunctuation: false,
                commasOnly: false,
                ampersandOnly: false,
                slashOnly: false
            };
        }

        const joinedText = words.join(' ');
        console.log(`   joinedText: "${joinedText}"`);

        const hasCommas = joinedText.includes(',');
        const hasAmpersand = joinedText.includes('&');
        const hasSlash = joinedText.includes('/');

        const result = {
            hasCommas: hasCommas,
            hasAmpersand: hasAmpersand,
            hasSlash: hasSlash,
            hasMajorPunctuation: hasCommas || hasAmpersand || hasSlash,
            commasOnly: hasCommas && !hasAmpersand && !hasSlash,
            ampersandOnly: hasAmpersand && !hasCommas && !hasSlash,
            slashOnly: hasSlash && !hasCommas && !hasAmpersand
        };

        console.log(`   analyzePunctuation result:`, result);
        return result;
    },

    firstWordEndsWithComma(words) {
        console.log(`   firstWordEndsWithComma called with:`, words, `(type: ${typeof words})`);

        if (!words || !Array.isArray(words) || words.length === 0) {
            console.log(`   ERROR: firstWordEndsWithComma received invalid words: ${words}`);
            return false;
        }

        console.log(`   words[0]: "${words[0]}" (type: ${typeof words[0]})`);

        if (!words[0]) {
            console.log(`   ERROR: words[0] is falsy: ${words[0]}`);
            return false;
        }

        // THIS IS WHERE THE .length ERROR MIGHT BE HAPPENING
        console.log(`   About to check words[0].endsWith(',') on: "${words[0]}"`);
        console.log(`   words[0] type: ${typeof words[0]}`);
        console.log(`   words[0].length:`, words[0].length);

        const result = words[0].endsWith(',');
        console.log(`   firstWordEndsWithComma result: ${result}`);
        return result;
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.DebugSingleCase = DebugSingleCase;
}