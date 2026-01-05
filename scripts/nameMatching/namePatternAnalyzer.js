/**
 * Block Island Name Pattern Analyzer
 *
 * Comprehensive analysis of all 1,576 VisionAppraisal owner names to discover
 * structural patterns, naming conventions, and relationship indicators.
 *
 * Designed for complete dataset analysis (no sampling required).
 */

class NamePatternAnalyzer {
    constructor() {
        this.visionAppraisalData = null;
        this.initialized = false;
        this.patterns = {
            characterAnalysis: {},
            wordCountAnalysis: {},
            conjunctionAnalysis: {},
            structuralPatterns: {}
        };
    }

    /**
     * Initialize analyzer and load processed VisionAppraisal data from Google Drive
     * Uses the same pattern as visionAppraisal.js loadProcessedDataFromGoogleDrive()
     */
    async initialize() {
        if (this.initialized) return;

        const GOOGLE_FILE_ID = "1oIW1m1Qw2lyreU-uGMX3jUka9LwaBTAf";

        try {
            console.log("=== LOADING PROCESSED VISIONAPPRAISAL DATA FOR PATTERN ANALYSIS ===");
            console.log(`Loading from Google Drive File ID: ${GOOGLE_FILE_ID}`);

            // Use Google Drive API to load processed data (same pattern as existing code)
            const response = await gapi.client.drive.files.get({
                fileId: GOOGLE_FILE_ID,
                alt: 'media'
            });

            const dataPackage = JSON.parse(response.body);

            // Extract the processed records from the data package
            this.visionAppraisalData = dataPackage.processedRecords || dataPackage.records || dataPackage;

            console.log(`✓ Loaded processed data from ${dataPackage.metadata?.processedAt || 'Google Drive'}`);
            console.log(`✓ ${this.visionAppraisalData.length} VisionAppraisal records for pattern analysis`);
            console.log(`✓ Records should contain processedOwnerName fields`);

            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize NamePatternAnalyzer from Google Drive:', error);
            throw error;
        }
    }

    /**
     * Extract owner names from VisionAppraisal records
     * @returns {Array} - Array of owner name strings
     */
    extractOwnerNames() {
        if (!this.initialized) {
            throw new Error('NamePatternAnalyzer not initialized. Call initialize() first.');
        }

        // Extract and clean owner names from the records
        const names = [];
        let fieldStats = {
            processedOwnerName: 0,
            ownerName: 0,
            'Owner Name': 0,
            emptyFields: 0,
            nullFields: 0
        };

        // Debug: Check first few records for field analysis
        console.log('Debugging field access in first 3 records:');
        for (let i = 0; i < Math.min(3, this.visionAppraisalData.length); i++) {
            const record = this.visionAppraisalData[i];
            console.log(`Record ${i}:`, {
                processedOwnerName: record.processedOwnerName,
                ownerName: record.ownerName,
                'Owner Name': record['Owner Name'],
                pid: record.pid,
                allKeys: Object.keys(record)
            });
        }

        this.visionAppraisalData.forEach((record, index) => {
            // Try multiple field names for owner name
            let ownerName = record.processedOwnerName || record.ownerName || record['Owner Name'] || '';

            // Track field statistics
            if (record.processedOwnerName) fieldStats.processedOwnerName++;
            if (record.ownerName) fieldStats.ownerName++;
            if (record['Owner Name']) fieldStats['Owner Name']++;
            if (!ownerName || ownerName === '') fieldStats.emptyFields++;
            if (ownerName === null || ownerName === undefined) fieldStats.nullFields++;

            if (ownerName && typeof ownerName === 'string' && ownerName.trim().length > 0) {
                // Clean up any remaining VisionAppraisal tags
                ownerName = ownerName
                    .replace(/:\^#\^:/g, ', ')     // Line break markers to commas
                    .replace(/::#\^#::/g, ' ')   // Space markers to spaces
                    .replace(/\s+/g, ' ')       // Multiple spaces to single
                    .trim();

                if (ownerName.length > 0) {
                    names.push({
                        index: index,
                        name: ownerName,
                        pid: record.pid || record.PID || 'unknown'
                    });
                }
            }
        });

        console.log('Field extraction statistics:', fieldStats);
        console.log(`Extracted ${names.length} owner names from ${this.visionAppraisalData.length} records`);

        // Show first few extracted names for verification
        if (names.length > 0) {
            console.log('First 5 extracted names:');
            names.slice(0, 5).forEach(nameObj => {
                console.log(`  "${nameObj.name}" (PID: ${nameObj.pid})`);
            });
        }

        return names;
    }

    /**
     * Analyze character-level patterns across all names
     * @param {Array} names - Array of name objects
     * @returns {Object} - Character pattern analysis results
     */
    analyzeCharacterPatterns(names) {
        const analysis = {
            punctuation: {},
            specialCharacters: {},
            characterFrequency: {},
            nameLength: { min: Infinity, max: 0, average: 0, distribution: {} }
        };

        let totalLength = 0;

        names.forEach(nameObj => {
            const name = nameObj.name;
            totalLength += name.length;

            // Update length statistics
            analysis.nameLength.min = Math.min(analysis.nameLength.min, name.length);
            analysis.nameLength.max = Math.max(analysis.nameLength.max, name.length);

            const lengthBucket = Math.floor(name.length / 10) * 10; // Group by 10s
            analysis.nameLength.distribution[lengthBucket] = (analysis.nameLength.distribution[lengthBucket] || 0) + 1;

            // Analyze each character
            for (let char of name) {
                // Punctuation analysis
                if (',&.-;:()[]{}"\'/'.includes(char)) {
                    analysis.punctuation[char] = (analysis.punctuation[char] || 0) + 1;
                }

                // Special characters (numbers, symbols)
                if (!/[A-Za-z\s]/.test(char)) {
                    analysis.specialCharacters[char] = (analysis.specialCharacters[char] || 0) + 1;
                }

                // Overall character frequency
                analysis.characterFrequency[char] = (analysis.characterFrequency[char] || 0) + 1;
            }
        });

        analysis.nameLength.average = totalLength / names.length;

        return analysis;
    }

    /**
     * Analyze word count patterns across all names
     * @param {Array} names - Array of name objects
     * @returns {Object} - Word count analysis results
     */
    analyzeWordCounts(names) {
        const analysis = {
            distribution: {},
            examples: {},
            statistics: { min: Infinity, max: 0, average: 0 }
        };

        let totalWords = 0;

        names.forEach(nameObj => {
            const name = nameObj.name;
            const words = name.split(/\s+/).filter(word => word.length > 0);
            const wordCount = words.length;

            totalWords += wordCount;

            // Update statistics
            analysis.statistics.min = Math.min(analysis.statistics.min, wordCount);
            analysis.statistics.max = Math.max(analysis.statistics.max, wordCount);

            // Count distribution
            analysis.distribution[wordCount] = (analysis.distribution[wordCount] || 0) + 1;

            // Store examples (first 5 for each word count)
            if (!analysis.examples[wordCount]) {
                analysis.examples[wordCount] = [];
            }
            if (analysis.examples[wordCount].length < 5) {
                analysis.examples[wordCount].push({
                    name: name,
                    pid: nameObj.pid
                });
            }
        });

        analysis.statistics.average = totalWords / names.length;

        return analysis;
    }

    /**
     * Perform hierarchical grouping analysis as specified:
     * 1. Group by word count
     * 2. Within each word count, group by business terms presence
     * 3. Within each business term group, group by punctuation patterns
     */
    async analyzeHierarchicalGrouping(names) {
        console.log('\n=== HIERARCHICAL GROUPING ANALYSIS ===');

        // Load business terms for classification
        const businessTermsSet = await this.loadBusinessTerms();

        const hierarchy = {};

        names.forEach(nameObj => {
            const name = nameObj.name;
            const words = name.split(/\s+/).filter(word => word.length > 0);
            const wordCount = words.length;

            // Level 1: Word Count
            if (!hierarchy[wordCount]) {
                hierarchy[wordCount] = { total: 0, withBusinessTerms: 0, withoutBusinessTerms: 0, groups: {} };
            }
            hierarchy[wordCount].total++;

            // Level 2: Business Terms Presence
            const hasBusinessTerms = this.containsBusinessTerms(name, businessTermsSet);
            const businessTermCategory = hasBusinessTerms ? 'withBusinessTerms' : 'withoutBusinessTerms';
            hierarchy[wordCount][businessTermCategory]++;

            if (!hierarchy[wordCount].groups[businessTermCategory]) {
                hierarchy[wordCount].groups[businessTermCategory] = {
                    total: 0,
                    punctuationGroups: {},
                    examples: []
                };
            }
            hierarchy[wordCount].groups[businessTermCategory].total++;

            // Level 3: Punctuation Patterns
            const punctuationPattern = this.classifyPunctuationPattern(name);

            if (!hierarchy[wordCount].groups[businessTermCategory].punctuationGroups[punctuationPattern]) {
                hierarchy[wordCount].groups[businessTermCategory].punctuationGroups[punctuationPattern] = {
                    count: 0,
                    examples: []
                };
            }

            const group = hierarchy[wordCount].groups[businessTermCategory].punctuationGroups[punctuationPattern];
            group.count++;

            // Store examples (first 3 for each group)
            if (group.examples.length < 3) {
                group.examples.push({
                    name: name,
                    pid: nameObj.pid
                });
            }
        });

        // Display hierarchy
        this.displayHierarchy(hierarchy);

        return hierarchy;
    }

    /**
     * Load business terms from the CSV file (using browser endpoint)
     */
    async loadBusinessTerms() {
        try {
            const response = await fetch('http://127.0.0.99:3000/csv-file?file=BusinessTermsMaster - Nonnames.csv');
            const content = await response.text();

            const terms = content
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .map(line => {
                    const arrowIndex = line.indexOf('→');
                    return arrowIndex !== -1 ? line.substring(arrowIndex + 1).trim() : line;
                })
                .filter(value => value.length > 0);

            const businessTermsSet = new Set(terms.map(term => term.toUpperCase()));
            console.log(`Loaded ${businessTermsSet.size} business terms for classification`);
            return businessTermsSet;

        } catch (error) {
            console.error('Failed to load business terms:', error);
            return new Set(); // Return empty set on failure
        }
    }

    /**
     * Check if name contains any business terms
     */
    containsBusinessTerms(name, businessTermsSet) {
        const words = name.toUpperCase().split(/\s+/);
        return words.some(word => {
            const cleanWord = word.replace(/[^\w]/g, ''); // Remove punctuation
            return businessTermsSet.has(word) || businessTermsSet.has(cleanWord);
        });
    }

    /**
     * Classify punctuation patterns according to specified hierarchy:
     * a) "&" and "," and not "/"
     * b) "&" not "," and not "/"
     * c) "," and not "&" and not "/"
     * d) "/"
     */
    classifyPunctuationPattern(name) {
        const hasAmpersand = name.includes('&');
        const hasComma = name.includes(',');
        const hasSlash = name.includes('/');

        if (hasSlash) {
            return 'slash';
        } else if (hasAmpersand && hasComma) {
            return 'ampersand_and_comma';
        } else if (hasAmpersand && !hasComma) {
            return 'ampersand_only';
        } else if (hasComma && !hasAmpersand) {
            return 'comma_only';
        } else {
            return 'no_major_punctuation';
        }
    }

    /**
     * Display the hierarchical analysis results
     */
    displayHierarchy(hierarchy) {
        console.log('\nHIERARCHICAL GROUPING RESULTS:');
        console.log('=====================================');

        const sortedWordCounts = Object.keys(hierarchy).map(Number).sort((a, b) => a - b);

        sortedWordCounts.forEach(wordCount => {
            const wordData = hierarchy[wordCount];
            console.log(`\n📊 ${wordCount} WORDS (${wordData.total} names)`);
            console.log(`   With business terms: ${wordData.withBusinessTerms} names`);
            console.log(`   Without business terms: ${wordData.withoutBusinessTerms} names`);

            // Show business term groups
            ['withoutBusinessTerms', 'withBusinessTerms'].forEach(businessCategory => {
                if (wordData.groups[businessCategory] && wordData.groups[businessCategory].total > 0) {
                    const categoryData = wordData.groups[businessCategory];
                    const categoryLabel = businessCategory === 'withBusinessTerms' ? 'WITH BUSINESS TERMS' : 'WITHOUT BUSINESS TERMS';

                    console.log(`\n   📋 ${categoryLabel} (${categoryData.total} names):`);

                    const sortedPatterns = Object.entries(categoryData.punctuationGroups)
                        .sort((a, b) => b[1].count - a[1].count);

                    sortedPatterns.forEach(([pattern, data]) => {
                        console.log(`      • ${pattern}: ${data.count} names`);
                        if (data.examples.length > 0) {
                            console.log(`        Examples: ${data.examples.map(ex => `"${ex.name}"`).join(', ')}`);
                        }
                    });
                }
            });
        });
    }

    /**
     * Run comprehensive name pattern analysis
     */
    async analyzeAllPatterns() {
        await this.initialize();

        console.log('\n=== BLOCK ISLAND NAME PATTERN ANALYSIS ===');
        console.log('Analyzing complete VisionAppraisal dataset...\n');

        // Extract all owner names
        const names = this.extractOwnerNames();

        // Phase 1: Character-level analysis
        console.log('Phase 1: Character-level Analysis');
        const charAnalysis = this.analyzeCharacterPatterns(names);
        this.patterns.characterAnalysis = charAnalysis;

        console.log(`Name length range: ${charAnalysis.nameLength.min} - ${charAnalysis.nameLength.max} characters`);
        console.log(`Average name length: ${charAnalysis.nameLength.average.toFixed(1)} characters`);
        console.log('Most common punctuation:',
            Object.entries(charAnalysis.punctuation)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([char, count]) => `'${char}': ${count}`)
                .join(', ')
        );

        // Phase 2: Word count analysis
        console.log('\nPhase 2: Word Count Analysis');
        const wordAnalysis = this.analyzeWordCounts(names);
        this.patterns.wordCountAnalysis = wordAnalysis;

        console.log(`Word count range: ${wordAnalysis.statistics.min} - ${wordAnalysis.statistics.max} words`);
        console.log(`Average words per name: ${wordAnalysis.statistics.average.toFixed(1)}`);
        console.log('Word count distribution:');
        Object.entries(wordAnalysis.distribution)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
            .forEach(([wordCount, frequency]) => {
                const percentage = ((frequency / names.length) * 100).toFixed(1);
                console.log(`  ${wordCount} words: ${frequency} names (${percentage}%)`);
            });

        // Phase 3: Hierarchical grouping analysis
        console.log('\nPhase 3: Hierarchical Grouping Analysis');
        const hierarchicalAnalysis = await this.analyzeHierarchicalGrouping(names);
        this.patterns.hierarchicalAnalysis = hierarchicalAnalysis;

        return {
            totalNames: names.length,
            characterAnalysis: charAnalysis,
            wordCountAnalysis: wordAnalysis,
            hierarchicalAnalysis: hierarchicalAnalysis,
            sampleNames: names.slice(0, 10) // First 10 for review
        };
    }
}