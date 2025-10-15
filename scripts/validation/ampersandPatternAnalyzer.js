// Ampersand Pattern Analyzer - Phase 2
// Tests specific ampersand patterns that caused errors against all 31 cases

const AmpersandPatternAnalyzer = {

    // Test patterns from the error records
    testPatterns: [
        "FARON, DOUGLAS & BARBARA",
        "BREAULT, ROBERT & SUSAN",
        "KEARNEY, JAMES, KEARNEY, CHRISTINE",
        "BROWNELL, MICHAEL & BARBARA",
        "MAHER, ROBERT & KRISTIN"
    ],

    // Analyze why these patterns fail each case
    analyzeAmpersandPatterns() {
        console.log("=== AMPERSAND PATTERN ANALYSIS ===");

        const results = {
            testResults: [],
            summary: {
                totalPatterns: this.testPatterns.length,
                casesTestedPerPattern: 31,
                totalTests: this.testPatterns.length * 31
            }
        };

        this.testPatterns.forEach((pattern, patternIndex) => {
            console.log(`\nTesting Pattern ${patternIndex + 1}: "${pattern}"`);

            const patternResult = {
                pattern: pattern,
                caseResults: [],
                matchingCases: [],
                failingCases: []
            };

            // Test this pattern against all 31 cases
            for (let caseNum = 1; caseNum <= 31; caseNum++) {
                const caseResult = this.testPatternAgainstCase(pattern, caseNum);
                patternResult.caseResults.push(caseResult);

                if (caseResult.matches) {
                    patternResult.matchingCases.push(caseNum);
                } else {
                    patternResult.failingCases.push({
                        caseNum: caseNum,
                        reason: caseResult.failureReason
                    });
                }
            }

            console.log(`  Matching cases: ${patternResult.matchingCases.join(', ') || 'NONE'}`);
            console.log(`  Failing cases: ${patternResult.failingCases.length}`);

            results.testResults.push(patternResult);
        });

        // Generate summary report
        this.generateAnalysisReport(results);

        return results;
    },

    // Test a specific pattern against a specific case
    testPatternAgainstCase(pattern, caseNum) {
        try {
            // Parse the pattern
            const name = pattern.trim().toUpperCase();
            const words = this.parseWords(name);
            const wordCount = words.length;
            const hasBusinessTerms = this.hasBusinessTerms(words);
            const punctuationInfo = this.analyzePunctuation(words);

            let matches = false;
            let failureReason = '';

            // Test against specific case logic
            switch(caseNum) {
                case 1: // Two words, no business, comma, first word ends comma
                    if (wordCount === 2 && !hasBusinessTerms && punctuationInfo.hasCommas && this.firstWordEndsWithComma(words)) {
                        matches = true;
                    } else {
                        failureReason = `wordCount=${wordCount}, hasBusinessTerms=${hasBusinessTerms}, hasCommas=${punctuationInfo.hasCommas}, firstEndsComma=${this.firstWordEndsWithComma(words)}`;
                    }
                    break;

                case 2: // Two words, no business, comma, last word ends comma
                    if (wordCount === 2 && !hasBusinessTerms && punctuationInfo.hasCommas && this.lastWordEndsWithComma(words)) {
                        matches = true;
                    } else {
                        failureReason = `wordCount=${wordCount}, hasBusinessTerms=${hasBusinessTerms}, hasCommas=${punctuationInfo.hasCommas}, lastEndsComma=${this.lastWordEndsWithComma(words)}`;
                    }
                    break;

                case 3: // Two words, no business, no major punctuation
                    if (wordCount === 2 && !hasBusinessTerms && !punctuationInfo.hasMajorPunctuation) {
                        matches = true;
                    } else {
                        failureReason = `wordCount=${wordCount}, hasBusinessTerms=${hasBusinessTerms}, hasMajorPunctuation=${punctuationInfo.hasMajorPunctuation}`;
                    }
                    break;

                case 4: // Two words, with business, comma
                    if (wordCount === 2 && hasBusinessTerms && punctuationInfo.hasCommas) {
                        matches = true;
                    } else {
                        failureReason = `wordCount=${wordCount}, hasBusinessTerms=${hasBusinessTerms}, hasCommas=${punctuationInfo.hasCommas}`;
                    }
                    break;

                case 15: // Four words, no business, ampersand+comma, first ends comma (Case 15a)
                    if (wordCount === 4 && !hasBusinessTerms && punctuationInfo.hasAmpersand && punctuationInfo.hasCommas && this.firstWordEndsWithComma(words)) {
                        matches = true;
                    } else {
                        failureReason = `wordCount=${wordCount}, hasBusinessTerms=${hasBusinessTerms}, hasAmpersand=${punctuationInfo.hasAmpersand}, hasCommas=${punctuationInfo.hasCommas}, firstEndsComma=${this.firstWordEndsWithComma(words)}`;
                    }
                    break;

                case 17: // Four words, no business, ampersand only
                    if (wordCount === 4 && !hasBusinessTerms && punctuationInfo.ampersandOnly) {
                        matches = true;
                    } else {
                        failureReason = `wordCount=${wordCount}, hasBusinessTerms=${hasBusinessTerms}, ampersandOnly=${punctuationInfo.ampersandOnly}`;
                    }
                    break;

                case 25: // Five+, no business, ampersand, only comma in first word
                    if (wordCount >= 5 && !hasBusinessTerms && punctuationInfo.hasAmpersand && this.onlyCommaInFirstWord(words)) {
                        matches = true;
                    } else {
                        failureReason = `wordCount=${wordCount}, hasBusinessTerms=${hasBusinessTerms}, hasAmpersand=${punctuationInfo.hasAmpersand}, onlyCommaInFirst=${this.onlyCommaInFirstWord(words)}`;
                    }
                    break;

                case 30: // Five+, no business, not fitting other cases
                    if (wordCount >= 5 && !hasBusinessTerms) {
                        matches = true; // This is the catch-all case
                    } else {
                        failureReason = `wordCount=${wordCount}, hasBusinessTerms=${hasBusinessTerms}`;
                    }
                    break;

                default:
                    failureReason = `Case ${caseNum} logic not implemented in analyzer`;
                    break;
            }

            return {
                caseNum: caseNum,
                matches: matches,
                failureReason: failureReason,
                parsedData: {
                    wordCount: wordCount,
                    words: words,
                    hasBusinessTerms: hasBusinessTerms,
                    punctuationInfo: punctuationInfo
                }
            };

        } catch (error) {
            return {
                caseNum: caseNum,
                matches: false,
                failureReason: `ERROR: ${error.message}`,
                error: error
            };
        }
    },

    // Helper functions (copied from Case31Validator for consistency)
    parseWords(name) {
        return name.split(/\s+/).filter(word => word.length > 0);
    },

    hasBusinessTerms(words) {
        const businessTerms = ['LLC', 'INC', 'CORP', 'TRUST', 'TRUSTEE', 'ESTATE'];
        return words.some(word => {
            const cleanWord = word.replace(/[^\w]/g, '');
            return businessTerms.includes(cleanWord);
        });
    },

    analyzePunctuation(words) {
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
        return words[0] && words[0].endsWith(',');
    },

    lastWordEndsWithComma(words) {
        return words[words.length - 1] && words[words.length - 1].endsWith(',');
    },

    onlyCommaInFirstWord(words) {
        return words[0].includes(',') && !words.slice(1).some(word => word.includes(','));
    },

    // Generate analysis report
    generateAnalysisReport(results) {
        console.log("\n=== AMPERSAND PATTERN ANALYSIS REPORT ===");
        console.log(`Total patterns tested: ${results.summary.totalPatterns}`);
        console.log(`Total tests performed: ${results.summary.totalTests}`);

        console.log("\n=== PATTERN-BY-PATTERN RESULTS ===");
        results.testResults.forEach((patternResult, index) => {
            console.log(`\nPattern ${index + 1}: "${patternResult.pattern}"`);
            console.log(`Word count: ${patternResult.caseResults[0]?.parsedData?.wordCount || 'ERROR'}`);
            console.log(`Words: [${patternResult.caseResults[0]?.parsedData?.words?.join(', ') || 'ERROR'}]`);
            console.log(`Has business terms: ${patternResult.caseResults[0]?.parsedData?.hasBusinessTerms || 'ERROR'}`);
            console.log(`Punctuation: hasCommas=${patternResult.caseResults[0]?.parsedData?.punctuationInfo?.hasCommas}, hasAmpersand=${patternResult.caseResults[0]?.parsedData?.punctuationInfo?.hasAmpersand}, ampersandOnly=${patternResult.caseResults[0]?.parsedData?.punctuationInfo?.ampersandOnly}`);

            if (patternResult.matchingCases.length > 0) {
                console.log(`✅ MATCHES Cases: ${patternResult.matchingCases.join(', ')}`);
            } else {
                console.log(`❌ NO MATCHES - Should match one of: 15, 17, 25, or 30`);
            }

            // Show why key cases failed
            const keyFailures = patternResult.failingCases.filter(f => [15, 17, 25, 30].includes(f.caseNum));
            if (keyFailures.length > 0) {
                console.log(`Key case failures:`);
                keyFailures.forEach(failure => {
                    console.log(`  Case ${failure.caseNum}: ${failure.reason}`);
                });
            }
        });

        console.log("\n=== RECOMMENDATIONS ===");
        console.log("1. Check why ampersand patterns don't match expected cases");
        console.log("2. Verify helper function logic for ampersand detection");
        console.log("3. Fix undefined errors in case detection");
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.AmpersandPatternAnalyzer = AmpersandPatternAnalyzer;
}