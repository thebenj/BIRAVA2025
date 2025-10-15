// Trace the exact Case 15a detection path to find the .length error

const Case15aTracer = {
    // Trace step by step through case detection for a known failing record
    traceCase15a() {
        console.log("=== TRACING CASE 15A DETECTION ===");

        const testName = "FARON, DOUGLAS & BARBARA";
        console.log(`Tracing: "${testName}"`);

        try {
            // Step 1: Initial processing (we know this works)
            const name = testName.trim().toUpperCase();
            const words = this.parseWords(name);
            const wordCount = words.length;
            const hasBusinessTerms = this.hasBusinessTerms(words);
            const punctuationInfo = this.analyzePunctuation(words);

            console.log(`1. Words: ${JSON.stringify(words)}`);
            console.log(`2. Word count: ${wordCount}`);
            console.log(`3. Has business terms: ${hasBusinessTerms}`);
            console.log(`4. Punctuation: ${JSON.stringify(punctuationInfo)}`);

            // Step 2: Follow the exact case detection logic
            console.log(`\n--- FOLLOWING CASE DETECTION LOGIC ---`);

            // Check if it hits the 4-word cases
            if (wordCount === 4) {
                console.log(`5. Entered 4-word cases`);

                if (!hasBusinessTerms) {
                    console.log(`6. No business terms - checking patterns`);

                    // This is the Case 15a path that should be taken
                    if (punctuationInfo.hasAmpersand && punctuationInfo.hasCommas) {
                        console.log(`7. Has ampersand AND commas - checking first word ends comma`);

                        console.log(`   About to call firstWordEndsWithComma...`);
                        const firstWordResult = this.firstWordEndsWithComma(words);
                        console.log(`8. First word ends comma: ${firstWordResult}`);

                        if (firstWordResult) {
                            console.log(`9. ✅ Should return 'case15a' - SUCCESS PATH`);
                            return 'case15a';
                        } else {
                            console.log(`9. First word doesn't end with comma - continuing...`);
                        }
                    } else {
                        console.log(`7. Missing ampersand or commas:`);
                        console.log(`   hasAmpersand: ${punctuationInfo.hasAmpersand}`);
                        console.log(`   hasCommas: ${punctuationInfo.hasCommas}`);
                    }

                    // Other 4-word cases would be checked here
                    console.log(`   Checking other 4-word patterns...`);

                    if (punctuationInfo.commasOnly) {
                        console.log(`   Has commas only - checking case15b/16 patterns`);

                        console.log(`   About to call firstAndThirdWordsMatch...`);
                        const matchResult = this.firstAndThirdWordsMatch(words);
                        console.log(`   First and third words match: ${matchResult}`);

                        if (matchResult) {
                            console.log(`   Would return case15b`);
                        } else {
                            console.log(`   Would return case16`);
                        }
                    }

                    if (punctuationInfo.ampersandOnly) {
                        console.log(`   Would return case17 (ampersand only)`);
                    }

                    if (!punctuationInfo.hasMajorPunctuation) {
                        console.log(`   Would return case18 (no major punctuation)`);
                    }
                }
            }

            // If we get here, something unexpected happened
            console.log(`❌ UNEXPECTED: Should have returned case15a but didn't`);
            return 'unexpected_result';

        } catch (error) {
            console.log(`❌ ERROR CAUGHT: ${error.message}`);
            console.log(`Error stack:`, error.stack);

            // Find the line that caused the error
            const stack = error.stack;
            if (stack.includes('length')) {
                console.log(`🎯 FOUND .length ERROR!`);
                console.log(`Stack trace shows where .length failed:`, stack);
            }

            return 'error';
        }
    },

    // Copy helper functions to match Case31Validator exactly
    parseWords(name) {
        if (!name || typeof name !== 'string') {
            console.log(`ERROR: parseWords received invalid input: ${name}`);
            return [];
        }
        return name.split(/\s+/).filter(word => word.length > 0);
    },

    hasBusinessTerms(words) {
        if (!words || !Array.isArray(words)) {
            console.log(`ERROR: hasBusinessTerms received invalid input: ${words}`);
            return false;
        }

        const businessTerms = [
            'LLC', 'INC', 'CORP', 'TRUST', 'TRUSTEE', 'ESTATE', 'FOUNDATION',
            'ASSOCIATION', 'SOCIETY', 'COMPANY', 'ENTERPRISES', 'PROPERTIES',
            'INVESTMENTS', 'HOLDINGS', 'MANAGEMENT', 'SERVICES', 'GROUP',
            'PARTNERS', 'PARTNERSHIP', 'CO', 'LTD', 'LIMITED', 'INCORPORATED'
        ];

        return words.some(word => {
            const cleanWord = word.replace(/[^\w]/g, '');
            return businessTerms.includes(cleanWord);
        });
    },

    analyzePunctuation(words) {
        if (!words || !Array.isArray(words)) {
            console.log(`ERROR: analyzePunctuation received invalid input: ${words}`);
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
        const hasCommas = joinedText.includes(',');
        const hasAmpersand = joinedText.includes('&');
        const hasSlash = joinedText.includes('/');

        return {
            hasCommas: hasCommas,
            hasAmpersand: hasAmpersand,
            hasSlash: hasSlash,
            hasMajorPunctuation: hasCommas || hasAmpersand || hasSlash,
            commasOnly: hasCommas && !hasAmpersand && !hasSlash,
            ampersandOnly: hasAmpersand && !hasCommas && !hasSlash,
            slashOnly: hasSlash && !hasCommas && !hasAmpersand
        };
    },

    firstWordEndsWithComma(words) {
        console.log(`   firstWordEndsWithComma called with:`, words);
        if (!words || !Array.isArray(words) || words.length === 0) {
            console.log(`   ERROR: Invalid words array`);
            return false;
        }
        console.log(`   words[0]: "${words[0]}"`);
        console.log(`   Calling endsWith(',') on: "${words[0]}"`);
        const result = words[0] && words[0].endsWith(',');
        console.log(`   Result: ${result}`);
        return result;
    },

    firstAndThirdWordsMatch(words) {
        console.log(`   firstAndThirdWordsMatch called with:`, words);
        if (!words || words.length < 4) {
            console.log(`   Not enough words for comparison`);
            return false;
        }
        const first = words[0].replace(/[^\w]/g, '');
        const third = words[2].replace(/[^\w]/g, '');
        console.log(`   Comparing "${first}" vs "${third}"`);
        return first === third;
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.Case15aTracer = Case15aTracer;
}