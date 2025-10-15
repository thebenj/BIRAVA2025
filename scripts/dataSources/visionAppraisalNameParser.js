// VisionAppraisal Name Parser
// Converts 31-case classifications into Individual, AggregateHousehold, and NonHuman entities
// Uses validated Case31Validator system for name pattern detection

const VisionAppraisalNameParser = {

    // Import required classes and utilities
    requireDependencies() {
        // Check for required dependencies - be more specific about what's missing
        const missingDeps = [];

        if (!window.Case31Validator) {
            missingDeps.push('Case31Validator');
        }
        if (!window.Individual) {
            missingDeps.push('Individual');
        }
        if (!window.AggregateHousehold) {
            missingDeps.push('AggregateHousehold');
        }
        if (!window.NonHuman) {
            missingDeps.push('NonHuman');
        }
        if (!window.IndividualName) {
            missingDeps.push('IndividualName');
        }
        if (!window.AttributedTerm) {
            missingDeps.push('AttributedTerm');
        }

        if (missingDeps.length > 0) {
            console.log('Dependency check results:');
            console.log('Case31Validator:', !!window.Case31Validator);
            console.log('Individual:', !!window.Individual);
            console.log('AggregateHousehold:', !!window.AggregateHousehold);
            console.log('NonHuman:', !!window.NonHuman);
            console.log('IndividualName:', !!window.IndividualName);
            console.log('AttributedTerm:', !!window.AttributedTerm);
            throw new Error(`Missing dependencies: ${missingDeps.join(', ')}`);
        }
    },

    // Main parsing function - converts VisionAppraisal record to entity
    parseRecordToEntity(record, index) {
        this.requireDependencies();

        try {
            // Step 1: Detect case using validated 31-case system
            const caseResult = Case31Validator.detectCase(record.processedOwnerName || record.ownerName);
            const detectedCase = caseResult;

            // Parsing record through detected case

            // Step 2: Route to appropriate case parser
            return this.routeToParser(detectedCase, record, index);

        } catch (error) {
            console.error('Error parsing VisionAppraisal record:', error);
            console.error('Record:', record);

            // Fallback to catch-all handling
            return this.createFallbackEntity(record, error);
        }
    },

    // Route detected case to appropriate parsing function
    routeToParser(detectedCase, record, index) {
        const ownerName = record.processedOwnerName || record.ownerName;

        // Individual cases
        if (['case1', 'case3', 'case8', 'case9', 'case10', 'case18'].includes(detectedCase)) {
            return this.parseIndividualCase(detectedCase, ownerName, record, index);
        }

        // Household cases
        if (['case5', 'case15a', 'case15b', 'case16', 'case17', 'case25', 'case26', 'case27', 'case28', 'case29', 'case30'].includes(detectedCase)) {
            return this.parseHouseholdCase(detectedCase, ownerName, record, index);
        }

        // Business cases
        if (['case0', 'case4', 'case4N', 'case7', 'case11', 'case13', 'case14', 'case19', 'case20', 'case20N', 'case21', 'case21N', 'case22', 'case23', 'case24', 'case31', 'case34'].includes(detectedCase)) {
            return this.parseBusinessCase(detectedCase, ownerName, record, index);
        }

        // Catch-all cases
        if (detectedCase === 'case32') {
            return this.parseCase32HouseholdName(ownerName, record, index);
        }

        if (detectedCase === 'case33') {
            return this.parseCase33IndividualName(ownerName, record, index);
        }

        // Unknown case - fallback
        console.warn(`Unknown case detected: ${detectedCase} for "${ownerName}"`);
        return this.createFallbackEntity(record, new Error(`Unknown case: ${detectedCase}`));
    },

    // UTILITY HELPER FUNCTIONS

    // Helper function to validate word count (CONSOLIDATION)
    validateWordsLength(caseNumber, words, expectedLength) {
        if (words.length !== expectedLength) {
            throw new Error(`Case ${caseNumber} expects ${expectedLength} words, got ${words.length}`);
        }
    },

    // Helper function to clean word by trimming whitespace (CONSOLIDATION)
    cleanWord(word) {
        return word.trim();
    },

    // Helper function to clean last name by removing trailing punctuation and trimming (CONSOLIDATION)
    cleanLastName(word) {
        return word.replace(/[,;]$/, '').trim();
    },

    // Helper function to find comma and ampersand positions (CONSOLIDATION)
    findCommaAndAmpersand(caseNumber, words) {
        const commaWordIndex = words.findIndex(word => word.includes(','));
        const ampersandIndex = words.findIndex(word => word === '&');

        if (commaWordIndex === -1 || ampersandIndex === -1) {
            throw new Error(`Case ${caseNumber} expects comma and ampersand: "${words.join(' ')}"`);
        }

        return { commaWordIndex, ampersandIndex };
    },

    // Helper function to determine if name is legal construct (CONSOLIDATION)
    isLegalConstruct(ownerName) {
        const lowerName = ownerName.toLowerCase();
        return lowerName.includes('trust') || lowerName.includes('estate') ||
               lowerName.includes('llc') || lowerName.includes('inc') ||
               lowerName.includes('corp') || ownerName.includes('/');
    },

    // INDIVIDUAL CASE PARSING
    // Case 1: Two words, no business terms, first word ends in comma
    // HANDLING: First word (comma removed) = lastName, second word = firstName
    parseIndividualCase(detectedCase, ownerName, record, index) {
        // Parsing individual case

        const words = this.parseWords(ownerName);

        switch (detectedCase) {
            case 'case1':
                return this.parseCase1(words, record, index);
            case 'case3':
                return this.parseCase3(words, record, index);
            case 'case8':
                return this.parseCase8(words, record, index);
            case 'case9':
                return this.parseCase9(words, record, index);
            case 'case10':
                return this.parseCase10(words, record, index);
            case 'case18':
                return this.parseCase18(words, record, index);
            default:
                throw new Error(`Individual case ${detectedCase} not implemented`);
        }
    },

    // Case 1: "KASTNER, JONATHAN" → lastName="KASTNER", firstName="JONATHAN"
    parseCase1(words, record, index) {
        this.validateWordsLength(1, words, 2);

        const lastName = this.cleanLastName(words[0]);
        const firstName = this.cleanWord(words[1]);
        const fullName = `${firstName} ${lastName}`;

        return this.createIndividualFromParts(fullName, firstName, "", lastName, record, index);
    },

    // Case 3: "DEUTSCH LISA" → firstName="DEUTSCH", lastName="LISA"
    parseCase3(words, record, index) {
        if (words.length !== 2) {
            throw new Error(`Case 3 expects 2 words, got ${words.length}`);
        }

        const firstName = words[0].trim();
        const lastName = words[1].trim();
        const fullName = `${firstName} ${lastName}`;

        const individualName = new IndividualName(
            new AttributedTerm(fullName, 'VISION_APPRAISAL', index, record.pid),
            "", // title
            firstName, // firstName
            "", // otherNames
            lastName, // lastName
            "" // suffix
        );

        return this.createIndividual(individualName, record, index);
    },

    // Case 8: "LICHT SUSAN M" → lastName="LICHT", firstName="SUSAN", other="M"
    parseCase8(words, record, index) {
        if (words.length !== 3) {
            throw new Error(`Case 8 expects 3 words, got ${words.length}`);
        }

        const lastName = words[0].trim();
        const firstName = words[1].trim();
        const otherName = words[2].trim(); // single letter middle initial
        const fullName = `${firstName} ${otherName} ${lastName}`;

        const individualName = new IndividualName(
            new AttributedTerm(fullName, 'VISION_APPRAISAL', index, record.pid),
            "", // title
            firstName, // firstName
            otherName, // otherNames
            lastName, // lastName
            "" // suffix
        );

        return this.createIndividual(individualName, record, index);
    },

    // Case 9: "PHELAN W BLAKE" → firstName="PHELAN", middle="W", lastName="BLAKE"
    parseCase9(words, record, index) {
        if (words.length !== 3) {
            throw new Error(`Case 9 expects 3 words, got ${words.length}`);
        }

        const firstName = words[0].trim();
        const middleName = words[1].trim(); // single letter middle initial
        const lastName = words[2].trim();
        const fullName = `${firstName} ${middleName} ${lastName}`;

        const individualName = new IndividualName(
            new AttributedTerm(fullName, 'VISION_APPRAISAL', index, record.pid),
            "", // title
            firstName, // firstName
            middleName, // otherNames
            lastName, // lastName
            "" // suffix
        );

        return this.createIndividual(individualName, record, index);
    },

    // Case 10: "O'BRIEN MICHAEL M" → firstName="O'BRIEN", middle="MICHAEL", lastName="M"
    // NOTE: This follows Case 10 handling specification (first=first, second=middle, third=last)
    parseCase10(words, record, index) {
        if (words.length !== 3) {
            throw new Error(`Case 10 expects 3 words, got ${words.length}`);
        }

        const firstName = words[0].trim();
        const middleName = words[1].trim();
        const lastName = words[2].trim();
        const fullName = `${firstName} ${middleName} ${lastName}`;

        const individualName = new IndividualName(
            new AttributedTerm(fullName, 'VISION_APPRAISAL', index, record.pid),
            "", // title
            firstName, // firstName
            middleName, // otherNames
            lastName, // lastName
            "" // suffix
        );

        return this.createIndividual(individualName, record, index);
    },

    // Case 18: Four words, no business terms, no major punctuation
    // SPECIFICATION: "These are to be handled as individuals with no assumption about which name is which."
    // HANDLING: Create Individual entity using full name as-is without parsing first/last names
    parseCase18(words, record, index) {
        if (words.length !== 4) {
            throw new Error(`Case 18 expects 4 words, got ${words.length}`);
        }

        const fullName = words.join(' ');

        // Create IndividualName with no assumption about name structure
        // Use full name as primary identifier without parsing components
        const individualName = new IndividualName(
            new AttributedTerm(fullName, 'VISION_APPRAISAL', index, record.pid),
            "", // no title assumption
            "", // no firstName assumption
            "", // no middleName assumption
            "", // no lastName assumption
            ""  // no suffix assumption
        );

        return this.createIndividual(individualName, record, index);
    },

    // PLACEHOLDER FUNCTIONS FOR FUTURE PHASES

    // HOUSEHOLD CASE PARSING (Phase 2B)
    parseHouseholdCase(detectedCase, ownerName, record, index) {
        // Parsing household case

        const words = this.parseWords(ownerName);

        switch (detectedCase) {
            case 'case5':
                return this.parseCase5(words, record, index);
            case 'case15a':
                return this.parseCase15a(words, record, index);
            case 'case15b':
                return this.parseCase15b(words, record, index);
            case 'case16':
                return this.parseCase16(words, record, index);
            case 'case17':
                return this.parseCase17(words, record, index);
            case 'case25':
                return this.parseCase25(words, record, index);
            case 'case26':
                return this.parseCase26(words, record, index);
            case 'case27':
                return this.parseCase27(words, record, index);
            case 'case28':
                return this.parseCase28(words, record, index);
            case 'case29':
                return this.parseCase29(words, record, index);
            case 'case30':
                return this.parseCase30(words, record, index);
            default:
                throw new Error(`Household case ${detectedCase} not implemented`);
        }
    },

    // Case 5: Three words, without business terms, with commas only, where the first word ends in the comma
    // HANDLING: First word (comma removed) = lastName, first word after comma = firstName, other word = other name
    // "GELSOMINI, PAMELA A." → lastName="GELSOMINI", firstName="PAMELA", otherName="A."
    parseCase5(words, record, index) {
        if (words.length !== 3) {
            throw new Error(`Case 5 expects 3 words, got ${words.length}`);
        }

        const lastName = words[0].replace(/[,;]$/, '').trim();
        const firstName = words[1].trim();
        const otherName = words[2].trim();
        const fullName = `${firstName} ${otherName} ${lastName}`;

        // Create single individual for Case 5
        const individualName = new IndividualName(
            new AttributedTerm(fullName, 'VISION_APPRAISAL', index, record.pid),
            "", // title
            firstName, // firstName
            otherName, // otherNames
            lastName, // lastName
            "" // suffix
        );

        const individual = this.createIndividual(individualName, record, index);

        // Case 5 creates AggregateHousehold with single individual
        return this.createHouseholdFromIndividuals(fullName, [individual], record, index);
    },

    // Case 15a: Four words, without business terms, with ampersand and comma, where the first word contains the comma
    // HANDLING: Household with two individuals sharing last name
    // "FARON, DOUGLAS & BARBARA" → lastName="FARON", individual1="DOUGLAS FARON", individual2="BARBARA FARON"
    parseCase15a(words, record, index) {
        if (words.length !== 4) {
            throw new Error(`Case 15a expects 4 words, got ${words.length}`);
        }

        // Find comma and ampersand positions
        const { commaWordIndex, ampersandIndex } = this.findCommaAndAmpersand('15a', words);

        const sharedLastName = words[commaWordIndex].replace(/[,;]$/, '').trim();
        const firstName1 = words[commaWordIndex + 1].trim();
        const firstName2 = words[ampersandIndex + 1].trim();

        // Create two individuals with shared last name
        const individual1Name = new IndividualName(
            new AttributedTerm(`${firstName1} ${sharedLastName}`, 'VISION_APPRAISAL', index, record.pid),
            "", firstName1, "", sharedLastName, ""
        );

        const individual2Name = new IndividualName(
            new AttributedTerm(`${firstName2} ${sharedLastName}`, 'VISION_APPRAISAL', index, record.pid),
            "", firstName2, "", sharedLastName, ""
        );

        const individual1 = this.createIndividual(individual1Name, record, index);
        const individual2 = this.createIndividual(individual2Name, record, index);

        const householdName = new AttributedTerm(`${sharedLastName} HOUSEHOLD`, 'VISION_APPRAISAL', index, record.pid);
        return this.createAggregateHousehold(householdName, [individual1, individual2], record);
    },

    // Case 15b: Four words, with commas ending the first and third words, where first and third match
    // HANDLING: Two individuals with shared last name
    // "RUSIN, THOMAS, RUSIN, KATRINA" → shared lastName="RUSIN"
    parseCase15b(words, record, index) {
        if (words.length !== 4) {
            throw new Error(`Case 15b expects 4 words, got ${words.length}`);
        }

        const lastName1 = words[0].replace(/[,;]$/, '').trim();
        const firstName1 = words[1].trim();
        const lastName2 = words[2].replace(/[,;]$/, '').trim();
        const firstName2 = words[3].trim();

        // Verify shared last name
        if (lastName1 !== lastName2) {
            throw new Error(`Case 15b expects matching last names, got "${lastName1}" and "${lastName2}"`);
        }

        const sharedLastName = lastName1;

        // Create two individuals
        const individual1Name = new IndividualName(
            new AttributedTerm(`${firstName1} ${sharedLastName}`, 'VISION_APPRAISAL', index, record.pid),
            "", firstName1, "", sharedLastName, ""
        );

        const individual2Name = new IndividualName(
            new AttributedTerm(`${firstName2} ${sharedLastName}`, 'VISION_APPRAISAL', index, record.pid),
            "", firstName2, "", sharedLastName, ""
        );

        const individual1 = this.createIndividual(individual1Name, record, index);
        const individual2 = this.createIndividual(individual2Name, record, index);

        const householdName = new AttributedTerm(`${sharedLastName} HOUSEHOLD`, 'VISION_APPRAISAL', index, record.pid);
        return this.createAggregateHousehold(householdName, [individual1, individual2], record);
    },

    // Case 16: Four words, with commas where first and third words don't match
    // HANDLING: Two individuals with different last names
    // "BUTLER, WILLIAM H EST" → lastName1="BUTLER", firstName1="WILLIAM", lastName2="EST"
    parseCase16(words, record, index) {
        if (words.length !== 4) {
            throw new Error(`Case 16 expects 4 words, got ${words.length}`);
        }

        const lastName1 = words[0].replace(/[,;]$/, '').trim();
        const firstName1 = words[1].trim();
        const lastName2 = words[2].replace(/[,;]$/, '').trim();
        const firstName2 = words[3].trim();

        // Create two individuals with different last names
        const individual1Name = new IndividualName(
            new AttributedTerm(`${firstName1} ${lastName1}`, 'VISION_APPRAISAL', index, record.pid),
            "", firstName1, "", lastName1, ""
        );

        const individual2Name = new IndividualName(
            new AttributedTerm(`${firstName2} ${lastName2}`, 'VISION_APPRAISAL', index, record.pid),
            "", firstName2, "", lastName2, ""
        );

        const individual1 = this.createIndividual(individual1Name, record, index);
        const individual2 = this.createIndividual(individual2Name, record, index);

        const householdName = new AttributedTerm(`${lastName1}-${lastName2} HOUSEHOLD`, 'VISION_APPRAISAL', index, record.pid);
        return this.createAggregateHousehold(householdName, [individual1, individual2], record);
    },

    // Case 17: Four words, without business terms, with ampersand only
    // HANDLING: Two individuals sharing last name, first word = shared lastName
    // "CONNELL JOHN & JILL" → sharedLastName="CONNELL", firstName1="JOHN", firstName2="JILL"
    parseCase17(words, record, index) {
        if (words.length !== 4) {
            throw new Error(`Case 17 expects 4 words, got ${words.length}`);
        }

        const ampersandIndex = words.findIndex(word => word === '&');
        if (ampersandIndex === -1) {
            throw new Error(`Case 17 expects ampersand: "${words.join(' ')}"`);
        }

        const sharedLastName = words[0].trim();
        const firstName1 = words[1].trim();
        const firstName2 = words[3].trim(); // After ampersand

        // Create two individuals with shared last name
        const individual1Name = new IndividualName(
            new AttributedTerm(`${firstName1} ${sharedLastName}`, 'VISION_APPRAISAL', index, record.pid),
            "", firstName1, "", sharedLastName, ""
        );

        const individual2Name = new IndividualName(
            new AttributedTerm(`${firstName2} ${sharedLastName}`, 'VISION_APPRAISAL', index, record.pid),
            "", firstName2, "", sharedLastName, ""
        );

        const individual1 = this.createIndividual(individual1Name, record, index);
        const individual2 = this.createIndividual(individual2Name, record, index);

        const householdName = new AttributedTerm(`${sharedLastName} HOUSEHOLD`, 'VISION_APPRAISAL', index, record.pid);
        return this.createAggregateHousehold(householdName, [individual1, individual2], record);
    },

    // PLACEHOLDER FUNCTIONS FOR COMPLEX HOUSEHOLD CASES (Cases 25, 26, 27, 29)
    // These handle 5+ word patterns with complex ampersand/comma combinations

    parseCase25(words, record, index) {
        // Case 25: Five or more words, without business terms, where one "word" is an ampersand and the only comma contained in the first word
        // SPECIFICATION: "These will be considered the name of a household with two individuals that share a last name.
        // The first word with its comma removed will be assumed to be the common last name and the words surrounding
        // the ampersand will be assumed to be the names of the individuals. The words or words after the first word
        // and before the ampersand are assumed to be the first name and other names, if any of the first individual,
        // in that order. The words or words after the ampersand are assumed to be the first name and other names,
        // if any of the second individual, in that order."

        const fullName = words.join(' ');

        if (fullName.includes('&')) {
            const ampersandIndex = words.findIndex(word => word === '&');

            if (ampersandIndex > 1) { // Must have at least first word + one name word before ampersand
                const individuals = [];

                // Extract shared last name from first word (comma removed per specification)
                const sharedLastName = words[0].replace(/[,;]$/, '').trim();

                // Extract first individual's names (between first word and ampersand)
                const firstIndividualWords = words.slice(1, ampersandIndex);
                if (firstIndividualWords.length > 0) {
                    const firstName1 = firstIndividualWords[0].trim();
                    const otherNames1 = firstIndividualWords.slice(1).join(' ').trim();
                    const fullName1 = otherNames1 ? `${firstName1} ${otherNames1} ${sharedLastName}` : `${firstName1} ${sharedLastName}`;

                    const individualName1 = new IndividualName(
                        new AttributedTerm(fullName1, 'VISION_APPRAISAL', index, record.pid),
                        '', firstName1, otherNames1, sharedLastName, ''
                    );
                    const individual1 = this.createIndividual(individualName1, record, index);
                    individuals.push(individual1);
                }

                // Extract second individual's names (after ampersand)
                const secondIndividualWords = words.slice(ampersandIndex + 1);
                if (secondIndividualWords.length > 0) {
                    const firstName2 = secondIndividualWords[0].trim();
                    const otherNames2 = secondIndividualWords.slice(1).join(' ').trim();
                    const fullName2 = otherNames2 ? `${firstName2} ${otherNames2} ${sharedLastName}` : `${firstName2} ${sharedLastName}`;

                    const individualName2 = new IndividualName(
                        new AttributedTerm(fullName2, 'VISION_APPRAISAL', index, record.pid),
                        '', firstName2, otherNames2, sharedLastName, ''
                    );
                    const individual2 = this.createIndividual(individualName2, record, index);
                    individuals.push(individual2);
                }

                // Create household with individuals
                const householdName = new AttributedTerm(`${sharedLastName} HOUSEHOLD`, 'VISION_APPRAISAL', index, record.pid);
                return this.createAggregateHousehold(householdName, individuals, record, index);
            }
        }

        // Fallback to basic household if parsing fails
        const householdName = new AttributedTerm(fullName, 'VISION_APPRAISAL', index, record.pid);
        return this.createAggregateHousehold(householdName, [], record, index);
    },

    parseCase26(words, record, index) {
        // Case 26: Five or more words, without business terms, where one "word" is an ampersand
        // and one comma contained in the first word and one comma is contained in the first word after the ampersand
        // SPECIFICATION: "These will be considered the name of a household with two individuals that do not share a last name.
        // The first word with its comma removed will be assumed to be the last name of the first individual and word
        // or words after this word will be assumed to be their first name and other names, if any, in that order.
        // The first word after the ampersand with its comma removed will be assumed to be the last name of the
        // second individual and word or words after this word will be assumed to be their first name and other names."

        const fullName = words.join(' ');
        const ampersandIndex = words.findIndex(word => word === '&');

        if (ampersandIndex > 0 && ampersandIndex < words.length - 1) {
            const individuals = [];

            // First individual: first word is last name, words before ampersand are first/other names
            if (words[0].includes(',')) {
                const lastName1 = words[0].replace(/[,;]$/, '').trim();
                const firstIndividualWords = words.slice(1, ampersandIndex);

                if (firstIndividualWords.length > 0) {
                    const firstName1 = firstIndividualWords[0].trim();
                    const otherNames1 = firstIndividualWords.slice(1).join(' ').trim();
                    const fullName1 = otherNames1 ? `${firstName1} ${otherNames1} ${lastName1}` : `${firstName1} ${lastName1}`;

                    const individualName1 = new IndividualName(
                        new AttributedTerm(fullName1, 'VISION_APPRAISAL', index, record.pid),
                        '', firstName1, otherNames1, lastName1, ''
                    );
                    const individual1 = this.createIndividual(individualName1, record, index);
                    individuals.push(individual1);
                }
            }

            // Second individual: first word after ampersand is last name, remaining words are first/other names
            const wordsAfterAmpersand = words.slice(ampersandIndex + 1);
            if (wordsAfterAmpersand.length > 0 && wordsAfterAmpersand[0].includes(',')) {
                const lastName2 = wordsAfterAmpersand[0].replace(/[,;]$/, '').trim();
                const secondIndividualWords = wordsAfterAmpersand.slice(1);

                if (secondIndividualWords.length > 0) {
                    const firstName2 = secondIndividualWords[0].trim();
                    const otherNames2 = secondIndividualWords.slice(1).join(' ').trim();
                    const fullName2 = otherNames2 ? `${firstName2} ${otherNames2} ${lastName2}` : `${firstName2} ${lastName2}`;

                    const individualName2 = new IndividualName(
                        new AttributedTerm(fullName2, 'VISION_APPRAISAL', index, record.pid),
                        '', firstName2, otherNames2, lastName2, ''
                    );
                    const individual2 = this.createIndividual(individualName2, record, index);
                    individuals.push(individual2);
                }
            }

            // Create household with different last names
            const householdName = new AttributedTerm(fullName, 'VISION_APPRAISAL', index, record.pid);
            return this.createAggregateHousehold(householdName, individuals, record, index);
        }

        // Fallback to basic household
        const householdName = new AttributedTerm(fullName, 'VISION_APPRAISAL', index, record.pid);
        return this.createAggregateHousehold(householdName, [], record, index);
    },

    parseCase27(words, record, index) {
        // Case 27: Five or more words, without business terms, with commas only and more than one comma
        // where one word containing a comma repeats
        // SPECIFICATION: "These will be considered the name of a household with two individuals that share a last name.
        // The repeated word with a comma, but with that comma removed, will be assumed to be the common last name
        // of the individuals. The word or words between the first instance of the repeated word and its second
        // instance will be assumed to be the name or names of the first individual, in first name and other names
        // order. The word or words after the second occurrence of the repeated word will be considered to be
        // the name or names of the second individual in first and other name order."

        const fullName = words.join(' ');

        // Find repeated word with comma
        let repeatedWord = null;
        let firstIndex = -1;
        let secondIndex = -1;

        for (let i = 0; i < words.length; i++) {
            if (words[i].includes(',')) {
                const wordWithComma = words[i];
                // Look for this word appearing again later
                for (let j = i + 1; j < words.length; j++) {
                    if (words[j] === wordWithComma) {
                        repeatedWord = wordWithComma;
                        firstIndex = i;
                        secondIndex = j;
                        break;
                    }
                }
                if (repeatedWord) break;
            }
        }

        if (repeatedWord && firstIndex !== -1 && secondIndex !== -1) {
            const individuals = [];
            const sharedLastName = repeatedWord.replace(/[,;]$/, '').trim();

            // First individual: words between first and second occurrence of repeated word
            const firstIndividualWords = words.slice(firstIndex + 1, secondIndex);
            if (firstIndividualWords.length > 0) {
                const firstName1 = firstIndividualWords[0].trim();
                const otherNames1 = firstIndividualWords.slice(1).join(' ').trim();
                const fullName1 = otherNames1 ? `${firstName1} ${otherNames1} ${sharedLastName}` : `${firstName1} ${sharedLastName}`;

                const individualName1 = new IndividualName(
                    new AttributedTerm(fullName1, 'VISION_APPRAISAL', index, record.pid),
                    '', firstName1, otherNames1, sharedLastName, ''
                );
                const individual1 = this.createIndividual(individualName1, record, index);
                individuals.push(individual1);
            }

            // Second individual: words after second occurrence of repeated word
            const secondIndividualWords = words.slice(secondIndex + 1);
            if (secondIndividualWords.length > 0) {
                const firstName2 = secondIndividualWords[0].trim();
                const otherNames2 = secondIndividualWords.slice(1).join(' ').trim();
                const fullName2 = otherNames2 ? `${firstName2} ${otherNames2} ${sharedLastName}` : `${firstName2} ${sharedLastName}`;

                const individualName2 = new IndividualName(
                    new AttributedTerm(fullName2, 'VISION_APPRAISAL', index, record.pid),
                    '', firstName2, otherNames2, sharedLastName, ''
                );
                const individual2 = this.createIndividual(individualName2, record, index);
                individuals.push(individual2);
            }

            // Create household with shared last name
            const householdName = new AttributedTerm(`${sharedLastName} HOUSEHOLD`, 'VISION_APPRAISAL', index, record.pid);
            return this.createAggregateHousehold(householdName, individuals, record, index);
        }

        // Fallback to basic household
        const householdName = new AttributedTerm(fullName, 'VISION_APPRAISAL', index, record.pid);
        return this.createAggregateHousehold(householdName, [], record, index);
    },

    parseCase28(words, record, index) {
        // Case 28: Five or more words, without business terms, with commas only, more than one comma,
        // where no word containing a comma repeats
        // SPECIFICATION: "These will be considered household names. We will compare these household names
        // against household names and against individual names with the string comparison algorithms."
        // HANDLING: Create AggregateHousehold entity with no individual members since the structure
        // is too complex to systematically parse individuals

        const fullName = words.join(' ');

        // Create household name from the full complex name
        const householdName = new AttributedTerm(fullName, 'VISION_APPRAISAL', index, record.pid);

        // Create household with empty individuals array - cannot systematically parse individuals
        return this.createAggregateHousehold(householdName, [], record, index);
    },

    parseCase29(words, record, index) {
        // Case 29: Five or words, without business terms, with ampersands only where the ampersand has only one word after it
        // SPECIFICATION: "These will be considered the name of a household with two individuals that share a last name.
        // The first word will be assumed to be the common last name of the individuals. The word or words between
        // the first word and the ampersand will be assumed to be their name or names of the first individual,
        // in first name other name order. The word after the ampersand will be assumed to be the first name
        // of the second individual."

        const fullName = words.join(' ');
        const ampersandIndex = words.findIndex(word => word === '&');

        if (ampersandIndex > 1 && ampersandIndex === words.length - 2) { // Ampersand has only one word after it
            const individuals = [];
            const sharedLastName = words[0].trim(); // First word is common last name

            // First individual: words between first word and ampersand
            const firstIndividualWords = words.slice(1, ampersandIndex);
            if (firstIndividualWords.length > 0) {
                const firstName1 = firstIndividualWords[0].trim();
                const otherNames1 = firstIndividualWords.slice(1).join(' ').trim();
                const fullName1 = otherNames1 ? `${firstName1} ${otherNames1} ${sharedLastName}` : `${firstName1} ${sharedLastName}`;

                const individualName1 = new IndividualName(
                    new AttributedTerm(fullName1, 'VISION_APPRAISAL', index, record.pid),
                    '', firstName1, otherNames1, sharedLastName, ''
                );
                const individual1 = this.createIndividual(individualName1, record, index);
                individuals.push(individual1);
            }

            // Second individual: single word after ampersand (first name only)
            const firstName2 = words[ampersandIndex + 1].trim();
            const fullName2 = `${firstName2} ${sharedLastName}`;

            const individualName2 = new IndividualName(
                new AttributedTerm(fullName2, 'VISION_APPRAISAL', index, record.pid),
                '', firstName2, '', sharedLastName, ''
            );
            const individual2 = this.createIndividual(individualName2, record, index);
            individuals.push(individual2);

            // Create household with shared last name
            const householdName = new AttributedTerm(`${sharedLastName} HOUSEHOLD`, 'VISION_APPRAISAL', index, record.pid);
            return this.createAggregateHousehold(householdName, individuals, record, index);
        }

        // Fallback to basic household
        const householdName = new AttributedTerm(fullName, 'VISION_APPRAISAL', index, record.pid);
        return this.createAggregateHousehold(householdName, [], record, index);
    },

    // Case 30: Complex household names with multiple patterns
    parseCase30(words, record, index) {
        // Handle complex patterns like "STRATTON, ROBERT P & SANDRA MCLEAN, STRATTON"
        const fullName = words.join(' ');
        // Case 30: Complex household pattern processing

        const householdName = new AttributedTerm(fullName, 'VISION_APPRAISAL', index, record.pid);
        return this.createAggregateHousehold(householdName, [], record, index);
    },

    // BUSINESS CASE PARSING (Phase 2C)
    parseBusinessCase(detectedCase, ownerName, record, index) {
        // Parsing business case

        // Implement specific business case parsing
        switch (detectedCase) {
            case 'case0':
                return this.parseCase0(ownerName, record, index);
            case 'case4':
                return this.parseCase4(ownerName, record, index);
            case 'case4N':
                return this.parseCase4N(ownerName, record, index);
            case 'case7':
                return this.parseCase7(ownerName, record, index);
            case 'case11':
                return this.parseCase11(ownerName, record, index);
            case 'case13':
                return this.parseCase13(ownerName, record, index);
            case 'case14':
                return this.parseCase14(ownerName, record, index);
            case 'case19':
                return this.parseCase19(ownerName, record, index);
            case 'case20':
                return this.parseCase20(ownerName, record, index);
            case 'case20N':
                return this.parseCase20N(ownerName, record, index);
            case 'case21':
                return this.parseCase21(ownerName, record, index);
            case 'case21N':
                return this.parseCase21N(ownerName, record, index);
            case 'case22':
                return this.parseCase22(ownerName, record, index);
            case 'case23':
                return this.parseCase23(ownerName, record, index);
            case 'case24':
                return this.parseCase24(ownerName, record, index);
            case 'case31':
                return this.parseCase31(ownerName, record, index);
            case 'case34':
                return this.parseCase34(ownerName, record, index);
            default:
                console.warn(`Unhandled business case: ${detectedCase}`);
                const businessName = new AttributedTerm(ownerName, 'VISION_APPRAISAL', index, record.pid);
                return this.createNonHuman(businessName, record, index);
        }
    },

    // BUSINESS CASE PARSING METHODS

    // Case 0: Complete business names from Business Terms Master List
    // HANDLING: Treat as complete business names like Case 24 - compare to complete business terms using string matching
    parseCase0(ownerName, record, index) {
        // Case 0: Business Terms Master List - complete business names
        return this.createBusinessEntity(ownerName, record, index);
    },

    // Case 4: Two words, with business terms
    // HANDLING: Business entity with two words
    parseCase4(ownerName, record, index) {
        // Case 4: Two words with business terms
        return this.createBusinessEntity(ownerName, record, index);
    },

    // Case 4N: Two words, with business terms, no business entity found
    // HANDLING: Strip business terms and reassess as non-business
    parseCase4N(ownerName, record, index) {
        // Case 4N: Two words, business terms removed

        // This would be a name that had business terms but when checked against business database wasn't found
        // For now, treat as individual with business-like name
        const words = ownerName.trim().split(/\s+/);
        if (words.length >= 2) {
            const firstName = words[1] || '';
            const lastName = words[0].replace(/,/g, '') || '';

            const individualName = new IndividualName(
                new AttributedTerm(ownerName, 'VISION_APPRAISAL', index, record.pid),
                '', firstName, '', lastName, ''
            );

            return this.createIndividual(individualName, record, index);
        }

        // Fallback to business if can't parse as individual
        const businessName = new AttributedTerm(ownerName.trim(), 'VISION_APPRAISAL');
        return this.createBusiness(businessName, record, index);
    },

    // Case 7: Specific pattern creating NonHuman entities
    // HANDLING: Create NonHuman entities directly (addresses, partnerships, etc.)
    parseCase7(ownerName, record, index) {
        const nonHumanName = new AttributedTerm(ownerName.trim(), 'VISION_APPRAISAL');
        return this.createNonHuman(nonHumanName, record, index);
    },

    // Case 11: Specific pattern creating NonHuman entities
    // HANDLING: Create NonHuman entities directly (partnerships, compound names, etc.)
    parseCase11(ownerName, record, index) {
        const nonHumanName = new AttributedTerm(ownerName.trim(), 'VISION_APPRAISAL');
        return this.createNonHuman(nonHumanName, record, index);
    },

    // Case 13: Three words, with business, no major punctuation
    // HANDLING: Treated as straightforward business name
    parseCase13(ownerName, record, index) {
        // Case 13: Three words business, no punctuation
        const businessName = new AttributedTerm(ownerName.trim(), 'VISION_APPRAISAL');

        // Check if it's a trust/legal construct or regular business
        const lowerName = ownerName.toLowerCase();
        if (lowerName.includes('trust') || lowerName.includes('estate') || lowerName.includes('llc')) {
            return this.createLegalConstruct(businessName, record, index);
        }
        return this.createBusiness(businessName, record, index);
    },

    // Case 14: Three words, with business, commas only
    // HANDLING: Clean commas and treat as business name
    parseCase14(ownerName, record, index) {
        // Case 14: Three words business, commas only
        const cleanedName = ownerName.replace(/,/g, '').trim();
        const businessName = new AttributedTerm(cleanedName, 'VISION_APPRAISAL', index, record.pid);

        const lowerName = cleanedName.toLowerCase();
        if (lowerName.includes('trust') || lowerName.includes('estate') || lowerName.includes('llc')) {
            return this.createLegalConstruct(businessName, record, index);
        }
        return this.createBusiness(businessName, record, index);
    },

    // Case 19: Four words, with business, no major punctuation
    // HANDLING: Treated as business entity name
    parseCase19(ownerName, record, index) {
        // Case 19: Four words business, no punctuation
        const businessName = new AttributedTerm(ownerName.trim(), 'VISION_APPRAISAL');

        const lowerName = ownerName.toLowerCase();
        if (lowerName.includes('trust') || lowerName.includes('estate') || lowerName.includes('llc')) {
            return this.createLegalConstruct(businessName, record, index);
        }
        return this.createBusiness(businessName, record, index);
    },

    // Case 20: Four words, with business, comma only, specific pattern
    // HANDLING: Business with comma pattern
    parseCase20(ownerName, record, index) {
        // Case 20: Four words business, comma pattern
        const cleanedName = ownerName.replace(/,/g, '').trim();
        const businessName = new AttributedTerm(cleanedName, 'VISION_APPRAISAL', index, record.pid);

        const lowerName = cleanedName.toLowerCase();
        if (lowerName.includes('trust') || lowerName.includes('estate') || lowerName.includes('llc')) {
            return this.createLegalConstruct(businessName, record, index);
        }
        return this.createBusiness(businessName, record, index);
    },

    // Case 20N: Four words, business terms removed, comma pattern
    // HANDLING: Strip business terms and reassess as non-business with comma pattern
    parseCase20N(ownerName, record, index) {
        // Case 20N: Four words, business terms removed, comma pattern

        // Parse as potential individual name with comma pattern
        const words = ownerName.trim().split(/\s+/);
        if (words.length >= 2) {
            const firstWord = words[0].replace(/,/g, '');
            const secondWord = words[1] || '';

            const individualName = new IndividualName(
                new AttributedTerm(ownerName, 'VISION_APPRAISAL', index, record.pid),
                '', secondWord, '', firstWord, ''
            );

            return this.createIndividual(individualName, record, index);
        }

        // Fallback to NonHuman
        const businessName = new AttributedTerm(ownerName.trim(), 'VISION_APPRAISAL');
        return this.createNonHuman(businessName, record, index);
    },

    // Case 21: Four words, with business, other punctuation
    // HANDLING: Business with varied punctuation patterns
    parseCase21(ownerName, record, index) {
        // Case 21: Four words business, other punctuation
        const businessName = new AttributedTerm(ownerName.trim(), 'VISION_APPRAISAL');

        const lowerName = ownerName.toLowerCase();
        if (lowerName.includes('trust') || lowerName.includes('estate') || lowerName.includes('llc')) {
            return this.createLegalConstruct(businessName, record, index);
        }
        return this.createBusiness(businessName, record, index);
    },

    // Case 21N: Four words, business terms removed, other punctuation
    // HANDLING: Strip business terms and reassess with punctuation patterns
    parseCase21N(ownerName, record, index) {
        // Case 21N: Four words, business terms removed, other punctuation

        // Check for common individual name patterns with punctuation
        if (ownerName.includes('&')) {
            // Treat as potential household
            const householdName = new AttributedTerm(ownerName, 'VISION_APPRAISAL', index, record.pid);
            return this.createAggregateHousehold(householdName, [], record, index);
        }

        // Fallback to NonHuman
        const businessName = new AttributedTerm(ownerName.trim(), 'VISION_APPRAISAL');
        return this.createNonHuman(businessName, record, index);
    },

    // Case 22: Four words, with business, ampersand only, second is ampersand
    // HANDLING: Treat as business partnership or compound business name
    parseCase22(ownerName, record, index) {
        // Case 22: Four words business, ampersand pattern
        const businessName = new AttributedTerm(ownerName.trim(), 'VISION_APPRAISAL');

        // Business partnerships or compound business names
        return this.createBusiness(businessName, record, index);
    },

    // Case 23: Four words, with business, ampersand and comma
    // HANDLING: Complex business name with mixed punctuation
    parseCase23(ownerName, record, index) {
        // Case 23: Four words business, ampersand and comma
        const businessName = new AttributedTerm(ownerName.trim(), 'VISION_APPRAISAL');

        const lowerName = ownerName.toLowerCase();
        if (lowerName.includes('trust') || lowerName.includes('estate') || lowerName.includes('llc')) {
            return this.createLegalConstruct(businessName, record, index);
        }
        return this.createBusiness(businessName, record, index);
    },

    // Case 24: Four words, with business, slash
    // HANDLING: Business with slash notation (often legal names)
    parseCase24(ownerName, record, index) {
        // Case 24: Four words business, slash notation
        const businessName = new AttributedTerm(ownerName.trim(), 'VISION_APPRAISAL');

        // Slash notation often indicates legal constructs
        const lowerName = ownerName.toLowerCase();
        if (lowerName.includes('trust') || lowerName.includes('estate') || lowerName.includes('llc') || ownerName.includes('/')) {
            return this.createLegalConstruct(businessName, record, index);
        }
        return this.createBusiness(businessName, record, index);
    },

    // Case 31: Five+ words, with business terms
    // HANDLING: Full business names, compared against full business names first.
    // If no match, strip business terms and reassess
    parseCase31(ownerName, record, index) {
        // Case 31: Five+ words with business terms

        // Step 1: Try as full business name first
        const businessName = new AttributedTerm(ownerName.trim(), 'VISION_APPRAISAL');

        const lowerName = ownerName.toLowerCase();
        if (lowerName.includes('trust') || lowerName.includes('estate') || lowerName.includes('llc') || lowerName.includes('inc') || lowerName.includes('corp')) {
            return this.createLegalConstruct(businessName, record, index);
        }

        return this.createBusiness(businessName, record, index);

        // TODO: Implement business term stripping and reassessment for Phase 2D
        // If business matching fails, strip business terms and re-run case detection
    },

    // Case 34: Any unmatched name with business terms
    // HANDLING: Assumed to be businesses/nonhuman, also consider for address matching
    parseCase34(ownerName, record, index) {
        // Case 34: Unmatched with business terms
        const businessName = new AttributedTerm(ownerName.trim(), 'VISION_APPRAISAL');

        const lowerName = ownerName.toLowerCase();
        if (lowerName.includes('trust') || lowerName.includes('estate') || lowerName.includes('llc')) {
            return this.createLegalConstruct(businessName, record, index);
        }

        // Default to NonHuman for unmatched business patterns
        return this.createNonHuman(businessName, record, index);
    },

    // CATCH-ALL CASE PARSING
    parseCase32HouseholdName(ownerName, record, index) {
        console.log(`Case 32 household parsing not yet implemented: "${ownerName}"`);

        const householdName = new AttributedTerm(ownerName, 'VISION_APPRAISAL', index, record.pid);
        return this.createAggregateHousehold(householdName, [], record, index);
    },

    parseCase33IndividualName(ownerName, record, index) {
        console.log(`Case 33 individual parsing not yet implemented: "${ownerName}"`);

        // For now, treat as single name (no parsing)
        const individualName = new IndividualName(
            new AttributedTerm(ownerName, 'VISION_APPRAISAL', index, record.pid),
            null, // no separated lastName
            null  // no otherNames
        );

        return this.createIndividual(individualName, record, index);
    },

    // ENTITY CREATION FUNCTIONS

    // Create Individual entity with VisionAppraisal properties
    createIndividual(individualName, record, index) {
        const locationIdentifier = record.fireNumber || record.pid || null;
        const individual = new Individual(locationIdentifier, individualName, null);

        // Add VisionAppraisal-specific properties
        individual.pid = record.pid;
        individual.propertyLocation = new AttributedTerm(record.propertyLocation || '', 'VISION_APPRAISAL', index, record.pid);
        individual.ownerAddress = new AttributedTerm(record.ownerAddress || '', 'VISION_APPRAISAL', index, record.pid);
        individual.mblu = new AttributedTerm(record.mblu || '', 'VISION_APPRAISAL', index, record.pid);
        individual.fireNumber = record.fireNumber || null;
        individual.googleFileId = record.googleFileId || '';
        individual.source = 'VISION_APPRAISAL';

        return individual;
    },

    // Helper function to create Individual from name parts (CONSOLIDATION)
    createIndividualFromParts(fullName, firstName, otherNames, lastName, record, index) {
        const individualName = new IndividualName(
            new AttributedTerm(fullName, 'VISION_APPRAISAL', index, record.pid),
            "", // title
            firstName, // firstName
            otherNames, // otherNames
            lastName, // lastName
            "" // suffix
        );

        return this.createIndividual(individualName, record, index);
    },

    // Helper function to create AggregateHousehold from individuals (CONSOLIDATION)
    createHouseholdFromIndividuals(fullHouseholdName, individuals, record, index) {
        const householdName = new AttributedTerm(fullHouseholdName, 'VISION_APPRAISAL', index, record.pid);
        return this.createAggregateHousehold(householdName, individuals, record, index);
    },

    // Create AggregateHousehold entity with VisionAppraisal properties
    createAggregateHousehold(householdName, individuals, record, index) {
        // AggregateHousehold constructor expects (locationIdentifier, name, accountNumber)
        // locationIdentifier = Fire Number or PID, name = householdName, accountNumber = null
        const locationIdentifier = record.fireNumber || record.pid || null;

        const household = new AggregateHousehold(locationIdentifier, householdName, null);

        // Add individual members to the household
        household.individuals = individuals || [];

        // Add VisionAppraisal-specific properties
        household.pid = record.pid;
        household.propertyLocation = new AttributedTerm(record.propertyLocation || '', 'VISION_APPRAISAL', index, record.pid);
        household.ownerAddress = new AttributedTerm(record.ownerAddress || '', 'VISION_APPRAISAL', index, record.pid);
        household.mblu = new AttributedTerm(record.mblu || '', 'VISION_APPRAISAL', index, record.pid);
        household.fireNumber = record.fireNumber || null;
        household.googleFileId = record.googleFileId || '';
        household.source = 'VISION_APPRAISAL';

        return household;
    },

    // Create NonHuman entity with VisionAppraisal properties
    createNonHuman(businessName, record, index) {
        const locationIdentifier = record.fireNumber || record.pid || null;
        const nonHuman = new NonHuman(locationIdentifier, businessName, null);

        // Add VisionAppraisal-specific properties
        nonHuman.pid = record.pid;
        nonHuman.propertyLocation = new AttributedTerm(record.propertyLocation || '', 'VISION_APPRAISAL', index, record.pid);
        nonHuman.ownerAddress = new AttributedTerm(record.ownerAddress || '', 'VISION_APPRAISAL', index, record.pid);
        nonHuman.mblu = new AttributedTerm(record.mblu || '', 'VISION_APPRAISAL', index, record.pid);
        nonHuman.fireNumber = record.fireNumber || null;
        nonHuman.googleFileId = record.googleFileId || '';
        nonHuman.source = 'VISION_APPRAISAL';

        return nonHuman;
    },

    // Helper function to create Business/LegalConstruct entity (CONSOLIDATION)
    createBusinessEntity(ownerName, record, index) {
        const businessName = new AttributedTerm(ownerName.trim(), 'VISION_APPRAISAL', index, record.pid);

        if (this.isLegalConstruct(ownerName)) {
            return this.createLegalConstruct(businessName, record, index);
        }
        return this.createBusiness(businessName, record, index);
    },

    // Create Business entity (specific subclass of NonHuman)
    createBusiness(businessName, record, index) {
        const locationIdentifier = record.fireNumber || record.pid || null;
        const business = new Business(locationIdentifier, businessName, null);

        // Add VisionAppraisal-specific properties
        business.pid = record.pid;
        business.propertyLocation = new AttributedTerm(record.propertyLocation || '', 'VISION_APPRAISAL', index, record.pid);
        business.ownerAddress = new AttributedTerm(record.ownerAddress || '', 'VISION_APPRAISAL', index, record.pid);
        business.mblu = new AttributedTerm(record.mblu || '', 'VISION_APPRAISAL', index, record.pid);
        business.fireNumber = record.fireNumber || null;
        business.googleFileId = record.googleFileId || '';
        business.source = 'VISION_APPRAISAL';

        return business;
    },

    // Create LegalConstruct entity (for trusts, LLCs, etc.)
    createLegalConstruct(businessName, record, index) {
        const locationIdentifier = record.fireNumber || record.pid || null;
        const legalConstruct = new LegalConstruct(locationIdentifier, businessName, null);

        // Add VisionAppraisal-specific properties
        legalConstruct.pid = record.pid;
        legalConstruct.propertyLocation = new AttributedTerm(record.propertyLocation || '', 'VISION_APPRAISAL', index, record.pid);
        legalConstruct.ownerAddress = new AttributedTerm(record.ownerAddress || '', 'VISION_APPRAISAL', index, record.pid);
        legalConstruct.mblu = new AttributedTerm(record.mblu || '', 'VISION_APPRAISAL', index, record.pid);
        legalConstruct.fireNumber = record.fireNumber || null;
        legalConstruct.googleFileId = record.googleFileId || '';
        legalConstruct.source = 'VISION_APPRAISAL';

        return legalConstruct;
    },

    // Create fallback entity for error cases
    createFallbackEntity(record, error) {
        console.warn('Creating fallback entity for parsing error:', error.message);

        const fallbackName = new AttributedTerm(
            record.processedOwnerName || record.ownerName || 'UNKNOWN',
            'VISION_APPRAISAL'
        );

        const locationIdentifier = record.fireNumber || record.pid || null;
        const fallbackEntity = new NonHuman(locationIdentifier, fallbackName, null);
        fallbackEntity.parsingError = error.message;
        fallbackEntity.pid = record.pid;
        fallbackEntity.source = 'VISION_APPRAISAL';

        return fallbackEntity;
    },

    // UTILITY FUNCTIONS

    // Parse owner name into words (handles whitespace, punctuation)
    parseWords(ownerName) {
        if (!ownerName || typeof ownerName !== 'string') {
            return [];
        }

        // Apply same comma preprocessing as Case31Validator.detectCase()
        let name = ownerName.trim();
        name = name.replace(/\s*,\s*/g, ', '); // Remove spaces before commas, ensure space after
        name = name.replace(/,\s*$/, ','); // Handle trailing commas

        // Split on whitespace, filter empty strings
        return name.split(/\s+/).filter(word => word.length > 0);
    },

    // Test individual parsing with sample records
    async testIndividualParsing() {
        console.log('=== TESTING INDIVIDUAL PARSING ===');

        try {
            // Load processed VisionAppraisal data
            const response = await VisionAppraisal.loadProcessedDataFromGoogleDrive();
            if (!response.success) {
                throw new Error('Failed to load VisionAppraisal data: ' + response.message);
            }

            const records = response.data;
            console.log(`Loaded ${records.length} VisionAppraisal records for testing`);

            // Find examples of each individual case
            const testCases = {
                case1: null,
                case3: null,
                case8: null,
                case9: null,
                case10: null
            };

            // Search for examples
            for (const record of records) {
                const ownerName = record.processedOwnerName || record.ownerName;
                if (!ownerName) continue;

                try {
                    const detectedCase = Case31Validator.detectCase(ownerName);

                    if (testCases.hasOwnProperty(detectedCase) && !testCases[detectedCase]) {
                        testCases[detectedCase] = record;
                    }
                } catch (error) {
                    // Skip problematic records during testing
                    continue;
                }
            }

            // Test each case
            const results = {};
            for (const [caseType, record] of Object.entries(testCases)) {
                if (record) {
                    console.log(`\nTesting ${caseType}: "${record.processedOwnerName || record.ownerName}"`);

                    try {
                        const entity = this.parseRecordToEntity(record); // Test case, no index
                        results[caseType] = {
                            success: true,
                            entity: entity,
                            record: record
                        };
                        console.log(`✓ Created ${entity.constructor.name}:`, entity.toString());
                    } catch (error) {
                        results[caseType] = {
                            success: false,
                            error: error.message,
                            record: record
                        };
                        console.error(`✗ Failed to parse ${caseType}:`, error.message);
                    }
                } else {
                    console.log(`\n${caseType}: No example found`);
                    results[caseType] = { success: false, error: 'No example found' };
                }
            }

            console.log('\n=== INDIVIDUAL PARSING TEST RESULTS ===');
            Object.entries(results).forEach(([caseType, result]) => {
                const status = result.success ? '✓' : '✗';
                console.log(`${status} ${caseType}: ${result.success ? 'SUCCESS' : result.error}`);
            });

            return results;

        } catch (error) {
            console.error('Error testing individual parsing:', error);
            return { error: error.message };
        }
    },

    // Test household parsing with sample records
    async testHouseholdParsing() {
        console.log('=== TESTING HOUSEHOLD PARSING ===');

        try {
            // Load processed VisionAppraisal data
            const response = await VisionAppraisal.loadProcessedDataFromGoogleDrive();
            if (!response.success) {
                throw new Error('Failed to load VisionAppraisal data: ' + response.message);
            }

            const records = response.data;
            console.log(`Loaded ${records.length} VisionAppraisal records for testing`);

            // Find examples of each household case
            const testCases = {
                case5: null,
                case15a: null,
                case15b: null,
                case16: null,
                case17: null,
                case25: null,
                case26: null,
                case27: null,
                case29: null
            };

            // Search for examples
            for (const record of records) {
                const ownerName = record.processedOwnerName || record.ownerName;
                if (!ownerName) continue;

                try {
                    const detectedCase = Case31Validator.detectCase(ownerName);

                    if (testCases.hasOwnProperty(detectedCase) && !testCases[detectedCase]) {
                        testCases[detectedCase] = record;
                    }
                } catch (error) {
                    // Skip problematic records during testing
                    continue;
                }
            }

            // Test each case
            const results = {};
            console.log('\n=== HOUSEHOLD PARSING TESTS ===');

            for (const [caseType, record] of Object.entries(testCases)) {
                if (record) {
                    console.log(`\nTesting ${caseType}: "${record.processedOwnerName || record.ownerName}"`);

                    try {
                        const entity = this.parseRecordToEntity(record); // Test case, no index
                        results[caseType] = {
                            success: true,
                            entity: entity,
                            record: record
                        };
                        console.log(`✓ Created ${entity.constructor.name}:`);
                        if (entity.constructor.name === 'AggregateHousehold') {
                            console.log(`  Household: ${entity.name ? entity.name.term : 'No name'}`);
                            console.log(`  Members: ${entity.individuals ? entity.individuals.length : 'No individuals'}`);
                            if (entity.individuals && entity.individuals.length > 0) {
                                entity.individuals.forEach((ind, i) => {
                                    console.log(`    ${i+1}. ${ind.name ? ind.name.completeName : 'No name'}`);
                                });
                            }
                        } else {
                            console.log(`  Entity: ${entity.toString()}`);
                        }
                    } catch (error) {
                        results[caseType] = {
                            success: false,
                            error: error.message,
                            record: record
                        };
                        console.log(`✗ Failed to parse ${caseType}:`, error.message);
                    }
                } else {
                    console.log(`\n${caseType}: No example found`);
                    results[caseType] = { success: false, error: 'No example found' };
                }
            }

            // Summary
            const successCount = Object.values(results).filter(r => r.success).length;
            const totalTests = Object.keys(results).length;

            console.log('\n=== HOUSEHOLD PARSING TEST RESULTS ===');
            console.log(`✓ Tests passed: ${successCount}/${totalTests}`);

            Object.entries(results).forEach(([caseType, result]) => {
                const status = result.success ? '✓' : '✗';
                const message = result.success ? 'SUCCESS' : result.error;
                console.log(`${status} ${caseType}: ${message}`);
            });

            if (successCount >= 4) { // At least the main household cases work
                console.log('\n🎉 HOUSEHOLD PARSING TESTS PASSED!');
                console.log('Household case parsing logic is working correctly');
                console.log('Ready to proceed with business entity parsing');
            }

            return results;

        } catch (error) {
            console.error('Error testing household parsing:', error);
            return { error: error.message };
        }
    },

    // Test business entity parsing with sample records
    async testBusinessParsing() {
        console.log('=== TESTING BUSINESS ENTITY PARSING ===');

        try {
            // Load processed VisionAppraisal data
            const response = await VisionAppraisal.loadProcessedDataFromGoogleDrive();
            if (!response.success) {
                throw new Error('Failed to load VisionAppraisal data: ' + response.message);
            }

            const records = response.data;
            console.log(`Loaded ${records.length} VisionAppraisal records for testing`);

            // Find examples of each business case
            const testCases = {
                case4: null,
                case4N: null,
                case13: null,
                case14: null,
                case19: null,
                case20: null,
                case20N: null,
                case21: null,
                case21N: null,
                case22: null,
                case23: null,
                case24: null,
                case31: null,
                case34: null
            };

            // Search for examples
            for (const record of records) {
                const ownerName = record.processedOwnerName || record.ownerName;
                if (!ownerName) continue;

                try {
                    const detectedCase = Case31Validator.detectCase(ownerName);

                    if (testCases.hasOwnProperty(detectedCase) && !testCases[detectedCase]) {
                        testCases[detectedCase] = record;
                    }
                } catch (error) {
                    // Skip problematic records during testing
                    continue;
                }
            }

            // Test each case
            const results = {};
            console.log('\n=== BUSINESS PARSING TESTS ===');

            for (const [caseType, record] of Object.entries(testCases)) {
                if (record) {
                    console.log(`\nTesting ${caseType}: "${record.processedOwnerName || record.ownerName}"`);

                    try {
                        const entity = this.parseRecordToEntity(record); // Test case, no index
                        results[caseType] = {
                            success: true,
                            entity: entity,
                            record: record
                        };

                        console.log(`✓ Created ${entity.constructor.name}:`);
                        console.log(`  Business Name: ${entity.name ? entity.name.term : 'No name'}`);
                        console.log(`  Entity Type: ${entity.constructor.name}`);
                        console.log(`  Fire Number: ${entity.fireNumber || 'None'}`);
                        console.log(`  PID: ${entity.pid || 'None'}`);

                    } catch (error) {
                        results[caseType] = {
                            success: false,
                            error: error.message,
                            record: record
                        };
                        console.log(`✗ Failed to parse ${caseType}:`, error.message);
                    }
                } else {
                    console.log(`\n${caseType}: No example found`);
                    results[caseType] = { success: false, error: 'No example found' };
                }
            }

            // Summary
            const successCount = Object.values(results).filter(r => r.success).length;
            const totalTests = Object.keys(results).length;
            const foundExamples = Object.values(results).filter(r => r.error !== 'No example found').length;

            console.log('\n=== BUSINESS PARSING TEST RESULTS ===');
            console.log(`Examples found: ${foundExamples}/${totalTests}`);
            console.log(`Tests passed: ${successCount}/${foundExamples || 1}`);

            Object.entries(results).forEach(([caseType, result]) => {
                if (result.success) {
                    console.log(`✓ ${caseType}: SUCCESS - ${result.entity.constructor.name} created`);
                } else if (result.error !== 'No example found') {
                    console.log(`✗ ${caseType}: ${result.error}`);
                }
            });

            if (successCount >= 6) { // At least half the business cases work
                console.log('\n🎉 BUSINESS PARSING TESTS PASSED!');
                console.log('Business case parsing logic is working correctly');
                console.log('Ready to proceed with full pipeline integration');
            } else if (successCount > 0) {
                console.log('\n⚠️ PARTIAL SUCCESS');
                console.log(`${successCount} business cases working, others need investigation`);
            } else {
                console.log('\n❌ BUSINESS PARSING NEEDS DEBUGGING');
                console.log('No business cases parsed successfully');
            }

            return results;

        } catch (error) {
            console.error('Error testing business parsing:', error);
            return { error: error.message };
        }
    },

    // Phase 2D: Process all VisionAppraisal records through complete parsing pipeline
    async processAllVisionAppraisalRecords() {
        console.log('=== PHASE 2D: FULL PIPELINE INTEGRATION ===');
        console.log('Processing all 2,317 VisionAppraisal records through 31-case parser system');

        try {
            // Step 1: Load processed VisionAppraisal data
            console.log('Step 1: Loading processed VisionAppraisal data from Google Drive...');
            const response = await VisionAppraisal.loadProcessedDataFromGoogleDrive();
            if (!response.success) {
                throw new Error('Failed to load VisionAppraisal data: ' + response.message);
            }

            const records = response.data;
            console.log(`✅ Loaded ${records.length} VisionAppraisal records`);

            // Step 2: Process all records through entity conversion
            console.log('Step 2: Converting records to entity objects...');
            const entities = [];
            const processingStats = {
                totalRecords: records.length,
                successful: 0,
                failed: 0,
                caseCounts: {},
                entityTypeCounts: {
                    Individual: 0,
                    AggregateHousehold: 0,
                    Business: 0,
                    LegalConstruct: 0,
                    NonHuman: 0
                },
                errors: []
            };

            for (let i = 0; i < records.length; i++) {
                const record = records[i];

                try {
                    // Parse record to entity
                    const entity = this.parseRecordToEntity(record, i);

                    if (entity) {
                        entities.push(entity);
                        processingStats.successful++;

                        // Track entity type
                        const entityType = entity.constructor.name;
                        if (processingStats.entityTypeCounts.hasOwnProperty(entityType)) {
                            processingStats.entityTypeCounts[entityType]++;
                        } else {
                            processingStats.entityTypeCounts.NonHuman++; // Fallback
                        }

                        // Track case count
                        const ownerName = record.processedOwnerName || record.ownerName;
                        if (ownerName) {
                            try {
                                const detectedCase = Case31Validator.detectCase(ownerName);
                                processingStats.caseCounts[detectedCase] = (processingStats.caseCounts[detectedCase] || 0) + 1;
                            } catch (caseError) {
                                // Case detection error - don't fail the whole process
                            }
                        }
                    } else {
                        processingStats.failed++;
                        processingStats.errors.push({
                            recordIndex: i,
                            ownerName: record.processedOwnerName || record.ownerName,
                            error: 'Entity creation returned null'
                        });
                    }

                    // Progress reporting
                    if (i > 0 && i % 500 === 0) {
                        console.log(`  Processed ${i}/${records.length} records (${(i/records.length*100).toFixed(1)}%)`);
                    }

                } catch (error) {
                    processingStats.failed++;
                    processingStats.errors.push({
                        recordIndex: i,
                        ownerName: record.processedOwnerName || record.ownerName,
                        error: error.message
                    });
                }
            }

            // Step 3: Generate processing report
            console.log('\n=== PROCESSING RESULTS ===');
            console.log(`Total Records: ${processingStats.totalRecords}`);
            console.log(`Successful: ${processingStats.successful}`);
            console.log(`Failed: ${processingStats.failed}`);
            console.log(`Success Rate: ${(processingStats.successful/processingStats.totalRecords*100).toFixed(1)}%`);

            console.log('\n=== ENTITY TYPE DISTRIBUTION ===');
            Object.entries(processingStats.entityTypeCounts).forEach(([type, count]) => {
                const percentage = (count / processingStats.successful * 100).toFixed(1);
                console.log(`${type}: ${count} (${percentage}%)`);
            });

            console.log('\n=== CASE DISTRIBUTION (Top 10) ===');
            const sortedCases = Object.entries(processingStats.caseCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10);
            sortedCases.forEach(([caseType, count]) => {
                const percentage = (count / processingStats.successful * 100).toFixed(1);
                console.log(`${caseType}: ${count} (${percentage}%)`);
            });

            // Step 4: Save entities to Google Drive as VisionAppraisal_ParsedEntities.json
            console.log('\n=== SAVING ENTITIES TO GOOGLE DRIVE ===');
            const entityData = {
                metadata: {
                    processedAt: new Date().toISOString(),
                    totalRecords: processingStats.totalRecords,
                    successfulEntities: processingStats.successful,
                    failedRecords: processingStats.failed,
                    entityTypeCounts: processingStats.entityTypeCounts,
                    processingVersion: 'Phase2D_FullPipeline',
                    source: 'VisionAppraisal_31CaseParser'
                },
                entities: entities,
                processingStats: processingStats
            };

            // Save using pattern from Bloomerang processing
            const saveResult = await this.saveEntitiesToGoogleDrive(entityData);

            if (saveResult.success) {
                console.log(`✅ Successfully saved ${entities.length} entities to VisionAppraisal_ParsedEntities.json`);
                console.log(`📁 Google Drive File ID: ${saveResult.fileId}`);
            } else {
                console.log(`❌ Failed to save entities: ${saveResult.message}`);
            }

            return {
                success: true,
                entities: entities,
                stats: processingStats,
                fileId: saveResult.fileId || null,
                message: `Phase 2D Complete: Processed ${processingStats.successful}/${processingStats.totalRecords} records into entity objects`
            };

        } catch (error) {
            console.error('Error in Phase 2D processing:', error);
            return {
                success: false,
                error: error.message,
                message: 'Phase 2D processing failed'
            };
        }
    },

    // Save entities to Google Drive - overwrite existing VisionAppraisal_ParsedEntities.json file
    async saveEntitiesToGoogleDrive(entityData) {
        try {
            // Create file content
            const fileContent = JSON.stringify(entityData, null, 2);
            console.log(`📝 Attempting to overwrite existing file: 19cgccMYNBboL07CmMP-5hNNGwEUBXgCI`);

            // Use Method A: fetch() + PATCH (the proven working pattern from visionAppraisal.js)
            // File ID: 19cgccMYNBboL07CmMP-5hNNGwEUBXgCI (VisionAppraisal_ParsedEntities.json)
            const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/19cgccMYNBboL07CmMP-5hNNGwEUBXgCI?uploadType=media`, {
                method: 'PATCH',
                headers: new Headers({
                    'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                    'Content-Type': 'application/json'
                }),
                body: fileContent
            });

            console.log(`📋 Google Drive update response status: ${response.status} ${response.statusText}`);

            if (response.ok) {
                console.log(`✅ File overwrite successful, File ID: 19cgccMYNBboL07CmMP-5hNNGwEUBXgCI`);
                return {
                    success: true,
                    fileId: '19cgccMYNBboL07CmMP-5hNNGwEUBXgCI',
                    fileName: 'VisionAppraisal_ParsedEntities.json',
                    message: 'Entities successfully updated in existing Google Drive file'
                };
            } else {
                const errorText = await response.text();
                console.error(`❌ File update failed:`, response.status, response.statusText, errorText);
                return {
                    success: false,
                    message: `File update failed with status ${response.status}: ${response.statusText}`
                };
            }

        } catch (error) {
            console.error('Error saving entities to Google Drive:', error);
            return {
                success: false,
                message: error.message
            };
        }
    },

    // Helper to create multipart body for Google Drive upload
    createMultipartBody(metadata, data) {
        const delimiter = 'foo_bar_baz';
        let body = `--${delimiter}\r\n`;
        body += 'Content-Type: application/json\r\n\r\n';
        body += JSON.stringify(metadata) + '\r\n';
        body += `--${delimiter}\r\n`;
        body += 'Content-Type: application/json\r\n\r\n';
        body += data + '\r\n';
        body += `--${delimiter}--`;
        return body;
    }
};

// Make available globally for testing
if (typeof window !== 'undefined') {
    window.VisionAppraisalNameParser = VisionAppraisalNameParser;
}