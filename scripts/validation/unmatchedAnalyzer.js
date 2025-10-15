// Analyze unmatched records to understand why they don't fit the 31-case system

const UnmatchedAnalyzer = {
    async analyzeUnmatched() {
        console.log("=== ANALYZING UNMATCHED RECORDS ===");

        try {
            // Load the data
            const dataResult = await VisionAppraisal.loadProcessedDataFromGoogleDrive();
            if (!dataResult.success || !dataResult.data) {
                throw new Error("Failed to load VisionAppraisal data");
            }

            const records = dataResult.data;
            const unmatched = [];

            // Find unmatched records
            records.forEach((record, index) => {
                const ownerName = record.processedOwnerName || record.ownerName || '';
                if (!ownerName.trim()) return;

                const detectedCase = this.detectCase(ownerName, index);
                if (detectedCase === 'unmatched') {
                    unmatched.push({
                        index: index,
                        ownerName: ownerName,
                        pid: record.pid || 'N/A'
                    });
                }
            });

            console.log(`Found ${unmatched.length} unmatched records`);

            // Analyze patterns in unmatched records
            this.analyzePatterns(unmatched);

        } catch (error) {
            console.error("Error analyzing unmatched:", error);
        }
    },

    analyzePatterns(unmatched) {
        console.log("\n=== PATTERN ANALYSIS ===");

        const patterns = {
            byWordCount: {},
            byPunctuation: {},
            byBusinessTerms: {},
            examples: {}
        };

        unmatched.forEach(record => {
            const name = record.ownerName.trim().toUpperCase();
            const words = this.parseWords(name);
            const wordCount = words.length;
            const hasBusinessTerms = this.hasBusinessTerms(words);
            const punctuationInfo = this.analyzePunctuation(words);

            // Count by word count
            patterns.byWordCount[wordCount] = (patterns.byWordCount[wordCount] || 0) + 1;

            // Count by business terms
            const businessKey = hasBusinessTerms ? 'with_business' : 'without_business';
            patterns.byBusinessTerms[businessKey] = (patterns.byBusinessTerms[businessKey] || 0) + 1;

            // Count by punctuation
            let punctKey = 'none';
            if (punctuationInfo.commasOnly) punctKey = 'commas_only';
            else if (punctuationInfo.ampersandOnly) punctKey = 'ampersand_only';
            else if (punctuationInfo.slashOnly) punctKey = 'slash_only';
            else if (punctuationInfo.hasMajorPunctuation) punctKey = 'mixed_punctuation';

            patterns.byPunctuation[punctKey] = (patterns.byPunctuation[punctKey] || 0) + 1;

            // Store examples by pattern
            const patternKey = `${wordCount}w_${businessKey}_${punctKey}`;
            if (!patterns.examples[patternKey]) {
                patterns.examples[patternKey] = [];
            }
            if (patterns.examples[patternKey].length < 3) {
                patterns.examples[patternKey].push(record);
            }
        });

        // Display analysis
        console.log("\nWORD COUNT BREAKDOWN:");
        Object.entries(patterns.byWordCount).sort(([a], [b]) => parseInt(a) - parseInt(b)).forEach(([count, num]) => {
            console.log(`  ${count} words: ${num} records`);
        });

        console.log("\nBUSINESS TERMS BREAKDOWN:");
        Object.entries(patterns.byBusinessTerms).forEach(([type, num]) => {
            console.log(`  ${type}: ${num} records`);
        });

        console.log("\nPUNCTUATION BREAKDOWN:");
        Object.entries(patterns.byPunctuation).forEach(([type, num]) => {
            console.log(`  ${type}: ${num} records`);
        });

        console.log("\nPATTERN EXAMPLES:");
        Object.entries(patterns.examples).forEach(([pattern, examples]) => {
            console.log(`\n${pattern}:`);
            examples.forEach((example, idx) => {
                console.log(`  ${idx + 1}. "${example.ownerName}" (PID: ${example.pid})`);
            });
        });

        // Specific analysis for potential new cases
        this.suggestNewCases(patterns);
    },

    suggestNewCases(patterns) {
        console.log("\n=== SUGGESTIONS FOR NEW CASES ===");

        // Look for common patterns that might need new cases
        const suggestions = [];

        Object.entries(patterns.examples).forEach(([pattern, examples]) => {
            if (examples.length >= 2) { // At least 2 examples to suggest a pattern
                const [wordCount, businessType, punctType] = pattern.split('_');
                suggestions.push({
                    pattern: pattern,
                    count: examples.length,
                    description: `${wordCount} ${businessType.replace('_', ' ')}, ${punctType.replace('_', ' ')}`,
                    examples: examples.slice(0, 2) // Show first 2 examples
                });
            }
        });

        suggestions.sort((a, b) => b.count - a.count);

        if (suggestions.length > 0) {
            console.log("Potential new case patterns (sorted by frequency):");
            suggestions.forEach((suggestion, idx) => {
                console.log(`\n${idx + 1}. ${suggestion.description} (${suggestion.count} records)`);
                suggestion.examples.forEach((example, exIdx) => {
                    console.log(`     "${example.ownerName}"`);
                });
            });
        } else {
            console.log("No clear patterns for new cases - unmatched records appear to be edge cases");
        }
    },

    // Copy helper functions from Case31Validator
    parseWords(name) {
        if (!name || typeof name !== 'string') return [];
        return name.split(/\s+/).filter(word => word.length > 0);
    },

    hasBusinessTerms(words) {
        if (!words || !Array.isArray(words)) return false;
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
        if (!words || !Array.isArray(words)) return {
            hasCommas: false, hasAmpersand: false, hasSlash: false,
            hasMajorPunctuation: false, commasOnly: false, ampersandOnly: false, slashOnly: false
        };

        const joinedText = words.join(' ');
        const hasCommas = joinedText.includes(',');
        const hasAmpersand = joinedText.includes('&');
        const hasSlash = joinedText.includes('/');

        return {
            hasCommas, hasAmpersand, hasSlash,
            hasMajorPunctuation: hasCommas || hasAmpersand || hasSlash,
            commasOnly: hasCommas && !hasAmpersand && !hasSlash,
            ampersandOnly: hasAmpersand && !hasCommas && !hasSlash,
            slashOnly: hasSlash && !hasCommas && !hasAmpersand
        };
    },

    // Use the exact same detectCase logic as Case31Validator
    detectCase(ownerName, recordIndex = -1) {
        try {
            const name = ownerName.trim().toUpperCase();
            const words = this.parseWords(name);
            const wordCount = words.length;
            const hasBusinessTerms = this.hasBusinessTerms(words);
            const punctuationInfo = this.analyzePunctuation(words);

            // Case detection logic based on 31-case specification (COPIED FROM Case31Validator)

            // Two words cases (1-4)
            if (wordCount === 2) {
                if (!hasBusinessTerms && punctuationInfo.hasCommas) {
                    if (words[0]?.endsWith(',')) {
                        return 'case1'; // Two words, no business, comma, first word ends comma
                    }
                    if (words[words.length - 1]?.endsWith(',')) {
                        return 'case2'; // Two words, no business, comma, last word ends comma
                    }
                }
                if (!hasBusinessTerms && !punctuationInfo.hasMajorPunctuation) {
                    return 'case3'; // Two words, no business, no major punctuation
                }
                if (hasBusinessTerms && punctuationInfo.hasCommas) {
                    return 'case4'; // Two words, with business, comma
                }
            }

            // Three words cases (5-14)
            if (wordCount === 3) {
                if (!hasBusinessTerms) {
                    if (punctuationInfo.commasOnly) {
                        if (words[0]?.endsWith(',')) {
                            return 'case5'; // Three words, no business, commas only, first ends comma
                        }
                        if (words[1] === ',') {
                            return 'case6'; // Three words, no business, commas only, middle is comma
                        }
                        return 'case7'; // Three words, no business, commas only, other pattern
                    }
                    if (!punctuationInfo.hasMajorPunctuation) {
                        const lastWordClean = words[words.length - 1]?.replace(/[^\w]/g, '');
                        const secondWordClean = words[1]?.replace(/[^\w]/g, '');
                        if (lastWordClean?.length === 1) {
                            return 'case8'; // Three words, no business, no punct, last is single letter
                        }
                        if (secondWordClean?.length === 1 && lastWordClean?.length !== 1) {
                            return 'case9'; // Three words, no business, no punct, second is single letter
                        }
                        if (lastWordClean?.length !== 1 && secondWordClean?.length !== 1) {
                            return 'case10'; // Three words, no business, no punct, neither second nor last single letter
                        }
                    }
                    if (punctuationInfo.ampersandOnly && words.includes('&')) {
                        return 'case11'; // Three words, no business, ampersand only, ampersand is word
                    }
                }
                if (hasBusinessTerms) {
                    if (!punctuationInfo.hasMajorPunctuation) {
                        return 'case13'; // Three words, with business, no major punctuation
                    }
                    if (punctuationInfo.commasOnly) {
                        return 'case14'; // Three words, with business, commas only
                    }
                }
            }

            // Four words cases (15-24)
            if (wordCount === 4) {
                if (!hasBusinessTerms) {
                    if (punctuationInfo.hasAmpersand && punctuationInfo.hasCommas && words[0]?.endsWith(',')) {
                        return 'case15a'; // Four words, no business, ampersand+comma, first ends comma
                    }
                    if (punctuationInfo.commasOnly) {
                        const first = words[0]?.replace(/[^\w]/g, '');
                        const third = words[2]?.replace(/[^\w]/g, '');
                        if (first === third) {
                            return 'case15b'; // Four words, no business, commas, first and third match
                        } else {
                            return 'case16'; // Four words, no business, commas, first and third don't match
                        }
                    }
                    if (punctuationInfo.ampersandOnly) {
                        return 'case17'; // Four words, no business, ampersand only
                    }
                    if (!punctuationInfo.hasMajorPunctuation) {
                        return 'case18'; // Four words, no business, no major punctuation
                    }
                }
                if (hasBusinessTerms) {
                    if (!punctuationInfo.hasMajorPunctuation) {
                        return 'case19'; // Four words, with business, no major punctuation
                    }
                    if (punctuationInfo.ampersandOnly && words[1] === '&') {
                        return 'case22'; // Four words, with business, ampersand only, second is ampersand
                    }
                    if (punctuationInfo.hasAmpersand && punctuationInfo.hasCommas) {
                        return 'case23'; // Four words, with business, ampersand and comma
                    }
                    if (punctuationInfo.hasSlash) {
                        return 'case24'; // Four words, with business, slash
                    }
                }
            }

            // Five or more words cases (25-31)
            if (wordCount >= 5) {
                if (!hasBusinessTerms) {
                    if (punctuationInfo.hasAmpersand && words[0]?.includes(',') && !words.slice(1).some(word => word.includes(','))) {
                        return 'case25'; // Five+, no business, ampersand, only comma in first word
                    }
                    return 'case30'; // Five+, no business, not fitting other cases (catch-all)
                }
                if (hasBusinessTerms) {
                    return 'case31'; // Five+, with business terms
                }
            }

            return 'unmatched';
        } catch (error) {
            console.log(`ERROR in detectCase at record ${recordIndex}: ${error.message} (name: "${ownerName}")`);
            return 'error_in_detect_case';
        }
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.UnmatchedAnalyzer = UnmatchedAnalyzer;
}