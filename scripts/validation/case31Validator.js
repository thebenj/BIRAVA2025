// 31-Case Validation System for VisionAppraisal Names
// Tests the 31-case system against all VisionAppraisal_ProcessedData records
// to validate coverage and identify gaps

const Case31Validator = {

    // Business terms list for case detection (from prior analysis)
    businessTerms: [
        'LLC', 'INC', 'CORP', 'TRUST', 'TRUSTEE', 'ESTATE', 'FOUNDATION',
        'ASSOCIATION', 'SOCIETY', 'COMPANY', 'ENTERPRISES', 'PROPERTIES',
        'INVESTMENTS', 'HOLDINGS', 'MANAGEMENT', 'SERVICES', 'GROUP',
        'PARTNERS', 'PARTNERSHIP', 'CO', 'LTD', 'LIMITED', 'INCORPORATED',
        'CONSERVANCY'
    ],

    // Business Terms Master List - complete business names that should be treated as Case 0
    businessTermsMaster: [
        'TOWN OF NEW SHOREHAM', '584 BEACH AVE', 'BI PARTNERSHIP', 'STATE OF RI AIRPORT',
        'ST ANDREWS CHURCH', 'SWAIN ASSOCIATES', 'CORMORANT COVE ASSOCIATION',
        'WINDHOVER ASSOCIATES ET AL', 'LTM 2019 FAMILYTRUST', 'PRESS/G FLP', 'BI SALES CORP',
        'TOWN OF NEW SHOREHAM ETAL', 'US GOVERNMENT', 'BI UTILITY DISTRICT',
        'SERF HEAVY INDUSTRIES', 'STATE OF RI', 'SOUTHEAST LIGHTHOUSE FDN', 'BI MARITIME INSTITUTE',
        'STATE OF RI HIGHWAY DEPT', 'NARRAGANSETT ELECTRIC CO.', 'DEEPWATER WIND',
        'FEDERAL PROPERTIES OF RI', 'BI ECONOMIC DEVELOPMENT FDN', 'RI BOY SCOUTS OF AMERICA',
        'SHEEPS MEADOW HOMEOWNERS ASSOC', 'BI CLUB', 'WBI PARTNERSHIP', 'STATE OF RI ACTING BY/THRU',
        'BLOCK ISLAND HOUSING BOARD', 'BLOCK ISLAND UTILITY DISTRICT', 'STATE OF RHODE ISLAND',
        'THE NATURE CONSERVANCY ETAL', 'US FISH AND WILDLIFE'
    ],

    // Major punctuation patterns
    majorPunctuation: [',', '&', '/'],

    // Main validation function
    async validate31CaseSystem() {
        console.log("=== 31-CASE SYSTEM VALIDATION ===");

        try {
            // Step 1: Load VisionAppraisal processed data
            console.log("Step 1: Loading VisionAppraisal processed data...");
            const dataResult = await VisionAppraisal.loadProcessedDataFromGoogleDrive();

            if (!dataResult.success || !dataResult.data) {
                throw new Error("Failed to load VisionAppraisal data: " + (dataResult.error || "Unknown error"));
            }

            const records = dataResult.data;
            console.log(`✓ Loaded ${records.length} VisionAppraisal records`);

            // Step 2: Initialize validation tracking
            const validation = {
                totalRecords: records.length,
                processedRecords: 0,
                caseCounts: {},
                caseExamples: {},
                unmatchedRecords: [],
                errors: []
            };

            // Initialize case counts
            for (let i = 1; i <= 31; i++) {
                validation.caseCounts[`case${i}`] = 0;
                validation.caseExamples[`case${i}`] = [];
            }
            // Initialize subcases
            validation.caseCounts['case15a'] = 0;
            validation.caseExamples['case15a'] = [];
            validation.caseCounts['case15b'] = 0;
            validation.caseExamples['case15b'] = [];
            // Initialize new cases
            validation.caseCounts['case4N'] = 0;
            validation.caseExamples['case4N'] = [];
            validation.caseCounts['case21N'] = 0;
            validation.caseExamples['case21N'] = [];
            validation.caseCounts['case20N'] = 0;
            validation.caseExamples['case20N'] = [];
            // Initialize catch-all cases
            validation.caseCounts['case32'] = 0;
            validation.caseExamples['case32'] = [];
            validation.caseCounts['case33'] = 0;
            validation.caseExamples['case33'] = [];
            validation.caseCounts['case34'] = 0;
            validation.caseExamples['case34'] = [];
            validation.caseCounts['unmatched'] = 0;

            // Step 3: Process each record
            console.log("Step 2: Processing records through 31-case detection...");

            records.forEach((record, index) => {
                try {
                    const ownerName = record.processedOwnerName || record.ownerName || '';

                    if (!ownerName.trim()) {
                        validation.errors.push({
                            index: index,
                            error: 'Empty owner name',
                            record: record,
                            errorStep: 'empty_owner_name'
                        });
                        return;
                    }

                    const detectedCase = this.detectCase(ownerName, index);
                    validation.processedRecords++;

                    if (detectedCase === 'unmatched') {
                        validation.unmatchedRecords.push({
                            index: index,
                            ownerName: ownerName,
                            record: record
                        });
                        validation.caseCounts['unmatched']++;
                    } else {
                        validation.caseCounts[detectedCase]++;

                        // Store examples (max 3 per case)
                        if (validation.caseExamples[detectedCase] && validation.caseExamples[detectedCase].length < 3) {
                            validation.caseExamples[detectedCase].push({
                                index: index,
                                ownerName: ownerName,
                                pid: record.pid || 'N/A'
                            });
                        } else if (!validation.caseExamples[detectedCase]) {
                            console.log(`WARNING: Unknown case '${detectedCase}' - initializing`);
                            validation.caseCounts[detectedCase] = 0;
                            validation.caseExamples[detectedCase] = [];
                        }
                    }

                    // Progress logging
                    if ((index + 1) % 500 === 0) {
                        console.log(`  Processed ${index + 1}/${records.length} records...`);
                    }

                } catch (error) {
                    validation.errors.push({
                        index: index,
                        error: error.message,
                        record: record,
                        errorStep: 'main_loop_catch',
                        ownerName: record.processedOwnerName || record.ownerName || 'UNKNOWN'
                    });
                    console.log(`ERROR at record ${index}: ${error.message} (name: "${record.processedOwnerName || record.ownerName || 'UNKNOWN'}")`);
                }
            });

            // Step 4: Generate validation report
            console.log("Step 3: Generating validation report...");
            this.generateValidationReport(validation);

            return {
                success: true,
                validation: validation,
                message: "31-case validation completed successfully"
            };

        } catch (error) {
            console.error("Error in 31-case validation:", error);
            return {
                success: false,
                error: error.message,
                message: "31-case validation failed"
            };
        }
    },

    // Detect which case a name belongs to
    detectCase(ownerName, recordIndex = -1) {
        try {
            // Step 1: Standardize comma spacing (no space before, always space after)
            let name = ownerName.trim().toUpperCase();
            name = name.replace(/\s*,\s*/g, ', '); // Remove spaces before commas, ensure space after
            name = name.replace(/,\s*$/, ','); // Handle trailing commas

            // Case 0: Check Business Terms Master List FIRST (before all other processing)
            if (this.isBusinessTermsMasterMatch(name)) {
                return 'case0';
            }

            const words = this.parseWords(name);
            const wordCount = words.length;
            const hasBusinessTerms = this.hasBusinessTerms(words);
            const punctuationInfo = this.analyzePunctuation(words);

            // Case detection logic based on 31-case specification

        // Two words cases (1-4)
        if (wordCount === 2) {
            if (!hasBusinessTerms && punctuationInfo.hasCommas) {
                if (this.firstWordEndsWithComma(words)) {
                    return 'case1'; // Two words, no business, comma, first word ends comma
                    // HANDLING: The first word with its comma removed will be assumed to be a last name.
                    // The other word will be assumed to be a first name. In our processing we will retain
                    // the last name and the first name, while also creating a full name in first name
                    // last name order. The names individually and the full name will all be consider in
                    // string comparisons to other names.
                }
                if (this.lastWordEndsWithComma(words)) {
                    return 'case2'; // Two words, no business, comma, last word ends comma
                    // HANDLING: I think there should not be any of these cases, but we will need to
                    // review them if they exist. They will be compared to Bloomerang when we are
                    // comparing addresses.
                }
            }
            if (!hasBusinessTerms && !punctuationInfo.hasMajorPunctuation) {
                return 'case3'; // Two words, no business, no major punctuation
                // HANDLING: The first word will be assumed to be a first name and the second name
                // will be assumed to be a last name. In our processing we will retain the last name
                // and the first name, while also creating a full name in first name last name order.
                // These three will all be consider in string comparisons to other names.
            }
            if (hasBusinessTerms && punctuationInfo.hasCommas) {
                return 'case4'; // Two words, with business, comma
                // HANDLING: These will be assumed to be businesses or nonhuman, however, we will
                // also consider them when address matching and they will be compared to Bloomerang
                // when we are comparing addresses.
            }
            if (hasBusinessTerms && !punctuationInfo.hasMajorPunctuation) {
                return 'case4N'; // Two words, with business, no major punctuation (NEW CASE)
            }
        }

        // Three words cases (5-14)
        if (wordCount === 3) {
            if (!hasBusinessTerms) {
                if (punctuationInfo.commasOnly) {
                    if (this.firstWordEndsWithComma(words)) {
                        return 'case5'; // Three words, no business, commas only, first ends comma
                        // HANDLING: The one word ending in the comma with its comma removed will be assumed
                        // to be a last name. The first word after the comma will be assumed to be a first
                        // name. The other word will be considered an other or middle name. In our processing
                        // we will retain the last name, the first name, and other name, while also creating
                        // a full name in first name other name last name order. The names individually and
                        // the full name will all be consider in string comparisons to other names.
                    }
                    if (this.middleWordIsComma(words)) {
                        return 'case6'; // Three words, no business, commas only, middle is comma
                        // HANDLING: The one word before the comma will be assumed to be a last name.
                        // The first word after the comma will be assumed to be a first name. The other
                        // word will be considered an other or middle name. In our processing we will retain
                        // the last name, the first name, and other name, while also creating a full name
                        // in first name other name last name order. The names individually and the full
                        // name will all be consider in string comparisons to other names.
                    }
                    if (this.hasWordsBeforeCommaContainingWord(words)) {
                        return 'case7'; // Three words, no business, commas only, words before comma-containing word
                    }
                }
                if (!punctuationInfo.hasMajorPunctuation) {
                    if (this.lastWordIsSingleLetter(words)) {
                        return 'case8'; // Three words, no business, no punct, last is single letter
                    }
                    if (this.secondWordIsSingleLetter(words) && !this.lastWordIsSingleLetter(words)) {
                        return 'case9'; // Three words, no business, no punct, second is single letter
                    }
                    if (!this.lastWordIsSingleLetter(words) && !this.secondWordIsSingleLetter(words)) {
                        return 'case10'; // Three words, no business, no punct, neither second nor last single letter
                    }
                }
                if (punctuationInfo.ampersandOnly && this.ampersandIsOneOfWords(words)) {
                    return 'case11'; // Three words, no business, ampersand only, ampersand is word
                }
                if (punctuationInfo.slashOnly && this.wordsAroundSlashAreBusinessTerms(words)) {
                    return 'case12'; // Three words, no business, slash only, words around slash are business terms
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
                if (punctuationInfo.hasAmpersand && punctuationInfo.hasCommas && this.firstWordEndsWithComma(words)) {
                    return 'case15a'; // Four words, no business, ampersand+comma, first ends comma
                    // HANDLING: These will be considered the name of a household with two individuals
                    // that share a last name. The first word with the comma removed will be assumed
                    // to be the common last name, the two names separated by the ampersand would be
                    // the first names of the individuals. In our processing we will retain the last
                    // name and the first name of each individual, while also creating a full name in
                    // first name last name order for each individual.
                }
                if (punctuationInfo.commasOnly && this.firstAndThirdWordsMatch(words)) {
                    return 'case15b'; // Four words, no business, commas, first and third match
                }
                if (punctuationInfo.commasOnly && !this.firstAndThirdWordsMatch(words)) {
                    return 'case16'; // Four words, no business, commas, first and third don't match
                }
                if (punctuationInfo.ampersandOnly) {
                    return 'case17'; // Four words, no business, ampersand only
                    // HANDLING: These will be considered the name of a household with two individuals
                    // that share a last name. The first word will be assumed to be the common last name
                    // and the words surrounding the ampersand will be assumed to be the first names of
                    // the individuals. In our processing we will retain the last name and the first name
                    // of each individual, while also creating a full name in first name last name order
                    // for each individual. The names individually and their full names along with the
                    // original string will all be consider in string comparisons to other names.
                }
                if (!punctuationInfo.hasMajorPunctuation) {
                    return 'case18'; // Four words, no business, no major punctuation
                }
            }
            if (hasBusinessTerms) {
                if (!punctuationInfo.hasMajorPunctuation) {
                    return 'case19'; // Four words, with business, no major punctuation
                }
                if (punctuationInfo.commasOnly && this.case20Pattern(words)) {
                    return 'case20'; // Four words, with business, comma only, specific pattern
                }
                if (punctuationInfo.commasOnly && this.case21Pattern(words)) {
                    return 'case21'; // Four words, with business, comma only, second word is comma
                }
                if (punctuationInfo.commasOnly && this.hasMultipleCommas(words)) {
                    return 'case21N'; // Four words, with business, multiple commas only (NEW CASE)
                    // HANDLING: Businesses/nonhuman - business term removal and case reassessment
                }
                if (punctuationInfo.commasOnly && this.case20NPattern(words)) {
                    return 'case20N'; // Four words, with business, comma NOT in first word, last word before business term has comma
                    // HANDLING: Businesses/nonhuman - address matching and Bloomerang comparison
                }
                if (punctuationInfo.ampersandOnly && this.secondWordIsAmpersand(words)) {
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
                if (punctuationInfo.hasAmpersand && this.onlyCommaInFirstWord(words)) {
                    return 'case25'; // Five+, no business, ampersand, only comma in first word
                }
                if (punctuationInfo.hasAmpersand && this.commasInFirstAndFirstAfterAmpersand(words)) {
                    return 'case26'; // Five+, no business, ampersand, commas in first and first after ampersand
                }
                if (punctuationInfo.commasOnly && this.moreThanOneCommaWithRepeatingWord(words)) {
                    return 'case27'; // Five+, no business, commas only, >1 comma, repeating word
                }
                if (punctuationInfo.commasOnly && this.moreThanOneCommaNoRepeatingWord(words)) {
                    return 'case28'; // Five+, no business, commas only, >1 comma, no repeating word
                }
                if (punctuationInfo.ampersandOnly && this.ampersandHasOnlyOneWordAfter(words)) {
                    return 'case29'; // Five+, no business, ampersand only, one word after ampersand
                }
                if (!this.fitsIdentifiedCases(words, punctuationInfo)) {
                    return 'case30'; // Five+, no business, not fitting other cases
                }
            }
            if (hasBusinessTerms) {
                return 'case31'; // Five+, with business terms
                // HANDLING: These will be considered full business names and compared against
                // full business names. However, if they are found not to match full business names,
                // they will have all business terms stripped out of them, with any punctuation
                // immediately proceeding or contained within or between business terms also being
                // removed. These reduced strings will then have their case reassessed to see if
                // they fit one of the other cases.
            }
        }

            // Catch-all cases for any remaining unmatched names
            if (!hasBusinessTerms && punctuationInfo.hasAmpersand) {
                return 'case32'; // Any unmatched name, no business terms, has ampersand
                // HANDLING: This will be considered to be a full household name and will compared
                // to full household names
            }
            if (!hasBusinessTerms && !punctuationInfo.hasAmpersand) {
                return 'case33'; // Any unmatched name, no business terms, no ampersand
                // HANDLING: This will be assumed to be an individual's full name and will only
                // be compared against individual fullnames.
            }
            if (hasBusinessTerms) {
                return 'case34'; // Any unmatched name, has business terms
                // HANDLING: These will be assumed to be businesses or nonhuman, however, we will
                // also consider them when address matching and they will be compared to Bloomerang
                // when we are comparing addresses.
            }

            return 'unmatched';
        } catch (error) {
            console.log(`ERROR in detectCase at record ${recordIndex}: ${error.message} (name: "${ownerName}")`);
            return 'error_in_detect_case';
        }
    },

    // COMMENTED OUT FOR CONFIGURATION-DRIVEN PARSER DEVELOPMENT
    // detectCaseRetVal function removed to prevent syntax errors
    // Preserved in separate reference file for configuration extraction

    // Test method to compare detectCase and detectCaseRetVal results
    compareDetectCaseMethods(testNames = null) {
        console.log('🔍 Comparing detectCase vs detectCaseRetVal methods...');

        // Use provided test names or default test cases
        const namesToTest = testNames || [
            'SMITH, JOHN',           // case1
            'SMITH JOHN',            // case3
            'SMITH, JOHN ROBERT',    // case5
            'SMITH, JOHN & MARY',    // case15a
            'SMITH JOHN & MARY',     // case17
            'LLC',                   // case0
            'TRUST',                 // case0
            'SMITH FAMILY TRUST',    // case31
            'SMITH, JOHN, TRUSTEE',  // case27/28
            '',                      // error case
            'A',                     // single word
            'A B C D E F G'          // many words
        ];

        let matches = 0;
        let mismatches = 0;
        const mismatchDetails = [];

        namesToTest.forEach((name, index) => {
            try {
                const originalResult = this.detectCase(name, index);
                const retValResult = this.detectCaseRetVal(name, index);

                if (originalResult === retValResult) {
                    matches++;
                    console.log(`✅ "${name}" -> ${originalResult}`);
                } else {
                    mismatches++;
                    console.log(`❌ "${name}" -> Original: ${originalResult}, RetVal: ${retValResult}`);
                    mismatchDetails.push({
                        name: name,
                        original: originalResult,
                        retVal: retValResult
                    });
                }
            } catch (error) {
                console.log(`💥 Error testing "${name}": ${error.message}`);
                mismatches++;
            }
        });

        console.log(`\n📊 Comparison Results:`);
        console.log(`✅ Matches: ${matches}`);
        console.log(`❌ Mismatches: ${mismatches}`);
        console.log(`📈 Success Rate: ${((matches / (matches + mismatches)) * 100).toFixed(1)}%`);

        if (mismatchDetails.length > 0) {
            console.log('\n🔍 Mismatch Details:');
            mismatchDetails.forEach(detail => {
                console.log(`  "${detail.name}": ${detail.original} vs ${detail.retVal}`);
            });
        }

        return {
            matches,
            mismatches,
            successRate: (matches / (matches + mismatches)) * 100,
            details: mismatchDetails
        };
    },

    // Helper functions for case detection

    // Case 0: Check if name exactly matches Business Terms Master List
    isBusinessTermsMasterMatch(name) {
        if (!name || typeof name !== 'string') return false;
        return this.businessTermsMaster.includes(name.trim().toUpperCase());
    },

    parseWords(name) {
        // Split by spaces and filter empty strings
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
        return words.some(word => this.isBusinessTermWord(word)) || this.hasIntegerBusinessPattern(words);
    },

    // Enhanced business term detection with refined punctuation specification
    isBusinessTermWord(word) {
        if (!word || typeof word !== 'string') return false;

        // Check if word contains any business term as substring
        const wordUpper = word.toUpperCase();
        const hasBusinessSubstring = this.businessTerms.some(term => {
            return wordUpper.includes(term);
        });

        if (!hasBusinessSubstring) return false;

        // Refined punctuation rule: exclude apostrophes AND hyphens
        const punctuationRegex = /[^\w\s'-]/g;
        const punctuationMatches = word.match(punctuationRegex);

        if (punctuationMatches && punctuationMatches.length > 0) {
            // Only search for business substrings if punctuation is in internal positions
            // (not first or last position)
            let hasInternalPunctuation = false;

            punctuationMatches.forEach(punct => {
                const punctIndex = word.indexOf(punct);
                const lastIndex = word.lastIndexOf(punct);

                // Check if this punctuation mark appears in internal position
                if (punctIndex > 0 && lastIndex < word.length - 1) {
                    hasInternalPunctuation = true;
                }
            });

            if (hasInternalPunctuation) {
                return true;
            }
        }

        // Standard business term check (clean word)
        const cleanWord = word.replace(/[^\w]/g, '');
        return this.businessTerms.includes(cleanWord);
    },

    // Check for integer preceding business terms
    hasIntegerBusinessPattern(words) {
        if (!words || words.length < 2) return false;

        for (let i = 0; i < words.length - 1; i++) {
            const currentWord = words[i].replace(/[^\w]/g, '');
            const nextWord = words[i + 1].replace(/[^\w]/g, '');

            // Check if current word is integer and next word is business term
            if (/^\d+$/.test(currentWord) && this.businessTerms.includes(nextWord)) {
                return true;
            }
        }
        return false;
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
        return words[0] && words[0].endsWith(',');
    },

    lastWordEndsWithComma(words) {
        return words[words.length - 1] && words[words.length - 1].endsWith(',');
    },

    middleWordIsComma(words) {
        return words.length === 3 && words[1] === ',';
    },

    lastWordIsSingleLetter(words) {
        const lastWord = words[words.length - 1];
        return lastWord && lastWord.replace(/[^\w]/g, '').length === 1;
    },

    secondWordIsSingleLetter(words) {
        const secondWord = words[1];
        return secondWord && secondWord.replace(/[^\w]/g, '').length === 1;
    },

    ampersandIsOneOfWords(words) {
        return words.includes('&');
    },

    firstAndThirdWordsMatch(words) {
        if (words.length < 4) return false;
        const first = words[0].replace(/[^\w]/g, '');
        const third = words[2].replace(/[^\w]/g, '');
        return first === third;
    },

    secondWordIsAmpersand(words) {
        return words[1] === '&';
    },

    onlyCommaInFirstWord(words) {
        return words[0].includes(',') && !words.slice(1).some(word => word.includes(','));
    },

    // Helper functions for complex patterns
    hasWordsBeforeCommaContainingWord(words) {
        // Case 7: Three words, no business, commas only, at least one word before comma-containing word
        if (!words || words.length !== 3) return false;

        // Find words that contain commas
        for (let i = 0; i < words.length; i++) {
            if (words[i].includes(',')) {
                // If this comma-containing word has at least one word before it
                if (i > 0) {
                    return true;
                }
            }
        }
        return false;
    },
    wordsAroundSlashAreBusinessTerms(words) {
        // Case 12: Three words, no business, slash only, words around slash are business terms
        if (!words || words.length !== 3) return false;

        // Find word containing slash
        for (let word of words) {
            if (word.includes('/')) {
                // Split on slash and check if both parts are business terms
                const parts = word.split('/');
                if (parts.length === 2) {
                    const leftPart = parts[0].trim().toUpperCase();
                    const rightPart = parts[1].trim().toUpperCase();

                    // Check if both parts are in business terms list
                    const leftIsBusiness = this.businessTerms.includes(leftPart);
                    const rightIsBusiness = this.businessTerms.includes(rightPart);

                    return leftIsBusiness && rightIsBusiness;
                }
            }
        }
        return false;
    },
    case20Pattern(words) {
        // Four words, with business, comma only, first word has comma and last word is business term
        if (!words || words.length !== 4) return false;
        const firstHasComma = words[0].includes(',');
        const lastIsBusiness = this.isBusinessTermWord(words[3]);
        return firstHasComma && lastIsBusiness;
    },
    case21Pattern(words) {
        // Four words, with business, comma only, second word is comma
        if (!words || words.length !== 4) return false;
        return words[1] === ',';
    },
    hasMultipleCommas(words) {
        // Check if there are multiple commas in the word array
        if (!words || !Array.isArray(words)) return false;
        const joinedText = words.join(' ');
        const commaCount = (joinedText.match(/,/g) || []).length;
        return commaCount > 1;
    },
    case20NPattern(words) {
        // Four words, with business, comma NOT in first word, last word before business term has comma
        if (!words || words.length !== 4) return false;

        // Comma must NOT be in first word
        const firstHasComma = words[0].includes(',');
        if (firstHasComma) return false;

        // Find the last business term
        let lastBusinessTermIndex = -1;
        for (let i = words.length - 1; i >= 0; i--) {
            if (this.isBusinessTermWord(words[i])) {
                lastBusinessTermIndex = i;
                break;
            }
        }

        // Must have a business term
        if (lastBusinessTermIndex === -1) return false;

        // The word immediately before the last business term must contain a comma
        if (lastBusinessTermIndex === 0) return false; // No word before business term
        const wordBeforeBusinessTerm = words[lastBusinessTermIndex - 1];
        return wordBeforeBusinessTerm.includes(',');
    },
    commasInFirstAndFirstAfterAmpersand(words) {
        // Case 26: ampersand with comma in first word AND comma in first word after ampersand
        if (!words || !Array.isArray(words)) return false;

        const ampersandIndex = words.findIndex(word => word === '&');
        if (ampersandIndex === -1 || ampersandIndex === 0) return false;

        // First word must have comma
        const firstWordHasComma = words[0].includes(',');
        if (!firstWordHasComma) return false;

        // First word after ampersand must have comma
        const wordsAfterAmpersand = words.slice(ampersandIndex + 1);
        const firstWordAfterAmpersandHasComma = wordsAfterAmpersand.length > 0 && wordsAfterAmpersand[0].includes(',');

        return firstWordAfterAmpersandHasComma;
    },
    moreThanOneCommaWithRepeatingWord(words) {
        // Case 27: More than one comma where one word containing a comma repeats
        if (!words || !Array.isArray(words)) return false;

        const joinedText = words.join(' ');
        const commaCount = (joinedText.match(/,/g) || []).length;
        if (commaCount <= 1) return false;

        // Find repeated word with comma
        for (let i = 0; i < words.length; i++) {
            if (words[i].includes(',')) {
                const wordWithComma = words[i];
                // Look for this word appearing again later
                for (let j = i + 1; j < words.length; j++) {
                    if (words[j] === wordWithComma) {
                        return true; // Found repeated word with comma
                    }
                }
            }
        }
        return false;
    },
    moreThanOneCommaNoRepeatingWord(words) {
        // Case 28: More than one comma where NO word containing a comma repeats
        if (!words || !Array.isArray(words)) return false;

        const joinedText = words.join(' ');
        const commaCount = (joinedText.match(/,/g) || []).length;
        if (commaCount <= 1) return false;

        // Check that NO word with comma repeats
        const wordsWithCommas = [];
        for (let i = 0; i < words.length; i++) {
            if (words[i].includes(',')) {
                if (wordsWithCommas.includes(words[i])) {
                    return false; // Found repeated word with comma
                }
                wordsWithCommas.push(words[i]);
            }
        }
        return true; // Multiple commas, no repeating words with commas
    },
    ampersandHasOnlyOneWordAfter(words) {
        // Case 29: Ampersand has only one word after it
        if (!words || !Array.isArray(words)) return false;

        const ampersandIndex = words.findIndex(word => word === '&');
        if (ampersandIndex === -1) return false;

        // Check if ampersand is exactly at second-to-last position (one word after)
        return ampersandIndex === words.length - 2;
    },
    fitsIdentifiedCases(words, punctuationInfo) {
        // Case 30: Five+ words, no business, not fitting other identified cases
        // This function checks if the name fits Cases 25-29
        // If it returns false, then Case 30 applies as the catch-all
        if (!words || words.length < 5) return true; // Not Case 30 territory

        // Check if it fits any of the specific 5+ word cases (25-29)
        if (punctuationInfo.hasAmpersand && this.onlyCommaInFirstWord(words)) {
            return true; // Fits Case 25
        }
        if (punctuationInfo.hasAmpersand && this.commasInFirstAndFirstAfterAmpersand(words)) {
            return true; // Fits Case 26
        }
        if (punctuationInfo.commasOnly && this.moreThanOneCommaWithRepeatingWord(words)) {
            return true; // Fits Case 27
        }
        if (punctuationInfo.commasOnly && this.moreThanOneCommaNoRepeatingWord(words)) {
            return true; // Fits Case 28
        }
        if (punctuationInfo.ampersandOnly && this.ampersandHasOnlyOneWordAfter(words)) {
            return true; // Fits Case 29
        }

        // If none of Cases 25-29 fit, then this should be Case 30
        return false;
    },

    // Generate validation report
    generateValidationReport(validation) {
        console.log("\n=== 31-CASE VALIDATION REPORT ===");
        console.log(`Total records: ${validation.totalRecords}`);
        console.log(`Processed records: ${validation.processedRecords}`);
        console.log(`Error records: ${validation.errors.length}`);

        // Calculate coverage
        const matchedRecords = validation.processedRecords - validation.caseCounts['unmatched'];
        const coveragePercentage = validation.processedRecords > 0 ?
            ((matchedRecords / validation.processedRecords) * 100).toFixed(1) : 0;

        console.log(`\nCOVERAGE ANALYSIS:`);
        console.log(`Matched records: ${matchedRecords}/${validation.processedRecords} (${coveragePercentage}%)`);
        console.log(`Unmatched records: ${validation.caseCounts['unmatched']}`);

        // Case-by-case breakdown
        console.log(`\nCASE BREAKDOWN:`);
        for (let i = 1; i <= 31; i++) {
            const caseKey = `case${i}`;
            const count = validation.caseCounts[caseKey];
            if (count > 0) {
                console.log(`Case ${i}: ${count} records`);
                validation.caseExamples[caseKey].forEach((example, idx) => {
                    console.log(`  ${idx + 1}. "${example.ownerName}" (PID: ${example.pid})`);
                });
            }
        }

        // Show subcases and new cases
        const subcases = ['case15a', 'case15b', 'case4N', 'case21N', 'case20N', 'case32', 'case33', 'case34'];
        subcases.forEach(subcaseKey => {
            const count = validation.caseCounts[subcaseKey];
            if (count > 0) {
                console.log(`${subcaseKey}: ${count} records`);
                validation.caseExamples[subcaseKey].forEach((example, idx) => {
                    console.log(`  ${idx + 1}. "${example.ownerName}" (PID: ${example.pid})`);
                });
            }
        });

        // Unmatched records analysis
        if (validation.unmatchedRecords.length > 0) {
            console.log(`\nUNMATCHED RECORDS (first 10):`);
            validation.unmatchedRecords.slice(0, 10).forEach((unmatched, idx) => {
                console.log(`${idx + 1}. "${unmatched.ownerName}" (Index: ${unmatched.index})`);
            });

            if (validation.unmatchedRecords.length > 10) {
                console.log(`... and ${validation.unmatchedRecords.length - 10} more unmatched records`);
            }
        }

        // Errors
        if (validation.errors.length > 0) {
            console.log(`\nERRORS (first 5):`);
            validation.errors.slice(0, 5).forEach((error, idx) => {
                console.log(`${idx + 1}. Index ${error.index}: ${error.error}`);
            });
        }

        // Recommendations
        console.log(`\nRECOMMENDATIONS:`);
        if (parseFloat(coveragePercentage) >= 95) {
            console.log("✅ Excellent coverage - 31-case system is comprehensive");
        } else if (parseFloat(coveragePercentage) >= 90) {
            console.log("⚠️ Good coverage - review unmatched cases for potential new patterns");
        } else {
            console.log("❌ Poor coverage - significant gaps in 31-case system, needs enhancement");
        }
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.Case31Validator = Case31Validator;
}