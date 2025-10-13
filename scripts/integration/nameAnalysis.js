// VisionAppraisal Name Field Analysis
// Creates word frequency database from all owner name fields

const NameAnalysis = {

    // Analyze all words in VisionAppraisal name fields
    async analyzeNameFieldWords() {
        console.log("=== VISIONAPPRAISAL NAME FIELD WORD ANALYSIS ===");

        try {
            // Load VisionAppraisal data
            const visionData = await VisionAppraisal.loadData();
            console.log(`Analyzing names from ${visionData.length} VisionAppraisal records`);

            // Word frequency tracking
            const wordFrequency = new Map();
            const wordRecordCount = new Map(); // Count how many different records each word appears in
            const processedRecords = new Set(); // Track which records we've seen each word in

            // Process all owner names
            visionData.forEach((record, recordIndex) => {
                const ownerName = record.ownerName || '';
                if (!ownerName.trim()) return;

                // Clean and extract words
                const words = this.extractWordsFromName(ownerName);
                const recordWords = new Set(); // Track words in this specific record

                words.forEach(word => {
                    if (word.length < 2) return; // Skip single characters

                    // Count total word occurrences
                    wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);

                    // Count unique records this word appears in (only once per record)
                    if (!recordWords.has(word)) {
                        recordWords.add(word);
                        wordRecordCount.set(word, (wordRecordCount.get(word) || 0) + 1);
                    }
                });
            });

            console.log(`Found ${wordFrequency.size} unique words`);
            console.log(`Total word occurrences: ${Array.from(wordFrequency.values()).reduce((a, b) => a + b, 0)}`);

            // Create analysis results
            const results = {
                totalWords: wordFrequency.size,
                totalOccurrences: Array.from(wordFrequency.values()).reduce((a, b) => a + b, 0),
                totalRecords: visionData.length,
                wordData: []
            };

            // Build combined word data
            for (const [word, frequency] of wordFrequency.entries()) {
                const recordCount = wordRecordCount.get(word) || 0;
                results.wordData.push({
                    word: word,
                    totalOccurrences: frequency,
                    recordCount: recordCount,
                    firstLetter: word.charAt(0).toUpperCase()
                });
            }

            // Generate both sorted versions
            await this.saveWordAnalysisFiles(results);

            console.log("✅ Name field word analysis complete!");
            return results;

        } catch (error) {
            console.error("❌ Name field analysis failed:", error);
            throw error;
        }
    },

    // Extract clean words from owner name field
    extractWordsFromName(nameString) {
        // Clean the name string
        let cleaned = nameString
            .replace(/\^#\^/g, ' ')  // Remove line break markers
            .replace(/[^\w\s&]/g, ' ')  // Keep letters, numbers, spaces, and &
            .replace(/\s+/g, ' ')       // Normalize spaces
            .toUpperCase()
            .trim();

        // Split into words
        const words = cleaned.split(/\s+/);

        // Filter and clean words
        return words
            .filter(word => word.length >= 2)  // Minimum 2 characters
            .filter(word => !/^\d+$/.test(word))  // Skip pure numbers
            .map(word => word.trim())
            .filter(word => word.length > 0);
    },

    // Save word analysis in two sorted formats
    async saveWordAnalysisFiles(results) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        // Sort 1: By frequency (most common first)
        const frequencySorted = [...results.wordData]
            .sort((a, b) => b.recordCount - a.recordCount || b.totalOccurrences - a.totalOccurrences);

        // Sort 2: Alphabetically by first letter, then by frequency within each letter
        const alphabeticalSorted = [...results.wordData]
            .sort((a, b) => {
                // First sort by first letter
                if (a.firstLetter !== b.firstLetter) {
                    return a.firstLetter.localeCompare(b.firstLetter);
                }
                // Then by frequency (most common first within same letter)
                return b.recordCount - a.recordCount || b.totalOccurrences - a.totalOccurrences;
            });

        // Create detailed reports
        const frequencyReport = this.generateWordReport(results, frequencySorted, 'FREQUENCY');
        const alphabeticalReport = this.generateWordReport(results, alphabeticalSorted, 'ALPHABETICAL');

        // Save frequency-sorted file
        const frequencyFilename = `VisionAppraisal_WordFrequency_${timestamp}.txt`;
        await this.saveToProgressFile(frequencyFilename, frequencyReport);

        // Save alphabetically-sorted file
        const alphabeticalFilename = `VisionAppraisal_WordAlphabetical_${timestamp}.txt`;
        await this.saveToProgressFile(alphabeticalFilename, alphabeticalReport);

        // Generate CSV format reports for Excel analysis
        const frequencyCSV = this.generateWordReportCSV(results, frequencySorted, 'FREQUENCY');
        const alphabeticalCSV = this.generateWordReportCSV(results, alphabeticalSorted, 'ALPHABETICAL');

        // Save CSV files
        const frequencyCSVFilename = `VisionAppraisal_WordFrequency_${timestamp}.csv`;
        const alphabeticalCSVFilename = `VisionAppraisal_WordAlphabetical_${timestamp}.csv`;

        await this.saveToProgressFile(frequencyCSVFilename, frequencyCSV);
        await this.saveToProgressFile(alphabeticalCSVFilename, alphabeticalCSV);

        console.log(`\nFiles saved:`);
        console.log(`1. Frequency-sorted TXT: ${frequencyFilename}`);
        console.log(`2. Alphabetical-sorted TXT: ${alphabeticalFilename}`);
        console.log(`3. Frequency-sorted CSV: ${frequencyCSVFilename}`);
        console.log(`4. Alphabetical-sorted CSV: ${alphabeticalCSVFilename}`);

        return {
            frequencyFile: frequencyFilename,
            alphabeticalFile: alphabeticalFilename,
            wordCount: results.totalWords,
            recordCount: results.totalRecords
        };
    },

    // Generate formatted report (TEXT FORMAT)
    generateWordReport(results, sortedData, sortType, source = 'VISIONAPPRAISAL') {
        let report = `${source} NAME FIELD WORD ANALYSIS - ${sortType} SORT\n`;
        report += `Generated: ${new Date().toISOString()}\n\n`;
        report += `SUMMARY:\n`;
        report += `- Total unique words: ${results.totalWords}\n`;
        report += `- Total word occurrences: ${results.totalOccurrences}\n`;
        report += `- Total records analyzed: ${results.totalRecords}\n\n`;

        if (sortType === 'ALPHABETICAL') {
            report += `SORT ORDER: Alphabetical by first letter, then by frequency within each letter\n\n`;
        } else {
            report += `SORT ORDER: Most frequent words first (by record count)\n\n`;
        }

        report += `FORMAT: Word | Records Count | Total Occurrences\n`;
        report += `${'='.repeat(60)}\n\n`;

        let currentLetter = '';
        sortedData.forEach((item, index) => {
            // Add letter headers for alphabetical sort
            if (sortType === 'ALPHABETICAL' && item.firstLetter !== currentLetter) {
                currentLetter = item.firstLetter;
                if (index > 0) report += '\n';
                report += `--- ${currentLetter} ---\n`;
            }

            report += `${item.word.padEnd(25)} | ${item.recordCount.toString().padStart(6)} | ${item.totalOccurrences.toString().padStart(8)}\n`;
        });

        return report;
    },

    // Generate CSV format report for Excel analysis
    generateWordReportCSV(results, sortedData, sortType) {
        let csv = 'Word,RecordCount,TotalOccurrences,FirstLetter\n';
        sortedData.forEach(item => {
            csv += `"${item.word}",${item.recordCount},${item.totalOccurrences},"${item.firstLetter}"\n`;
        });
        return csv;
    },

    // Create sorted word array from frequency maps
    createSortedWordArray(wordFrequency, wordRecordCount, sortType) {
        const wordArray = Array.from(wordRecordCount.entries()).map(([word, recordCount]) => ({
            word: word,
            recordCount: recordCount,
            totalOccurrences: wordFrequency.get(word),
            firstLetter: word.charAt(0).toUpperCase()
        }));

        if (sortType === 'frequency') {
            // Sort by frequency (most common first)
            return wordArray.sort((a, b) => b.recordCount - a.recordCount || b.totalOccurrences - a.totalOccurrences);
        } else if (sortType === 'alphabetical') {
            // Sort alphabetically by first letter, then by frequency within each letter
            return wordArray.sort((a, b) => {
                if (a.firstLetter !== b.firstLetter) {
                    return a.firstLetter.localeCompare(b.firstLetter);
                }
                return b.recordCount - a.recordCount || b.totalOccurrences - a.totalOccurrences;
            });
        } else {
            throw new Error(`Unknown sort type: ${sortType}`);
        }
    },

    // Save file to progress directory (like existing progress functions)
    async saveToProgressFile(filename, content) {
        try {
            const response = await fetch('http://127.0.0.99:3000/api/save-progress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filename: filename,
                    data: content
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            console.log(`Saved: ${filename}`);
        } catch (error) {
            console.error(`Error saving ${filename}:`, error);
            throw error;
        }
    },

    // Quick test function to show top words
    async quickWordAnalysis() {
        console.log("=== QUICK WORD ANALYSIS TEST ===");

        const results = await this.analyzeNameFieldWords();

        console.log("\nTop 20 most common words (by record count):");
        const top20 = results.wordData
            .sort((a, b) => b.recordCount - a.recordCount)
            .slice(0, 20);

        top20.forEach((item, index) => {
            console.log(`${(index + 1).toString().padStart(2)}. ${item.word.padEnd(15)} - ${item.recordCount} records`);
        });

        return results;
    },

    // Analyze all words in Bloomerang name fields
    async analyzeBloomerangNameFieldWords() {
        console.log("=== BLOOMERANG NAME FIELD WORD ANALYSIS ===");

        try {
            // Load Bloomerang CSV data directly
            const bloomerangData = await this.loadBloomerangCSV();
            console.log(`Analyzing names from ${bloomerangData.length} Bloomerang records`);

            // Word frequency tracking
            const wordFrequency = new Map();
            const wordRecordCount = new Map();

            // Process all name fields: name, firstName, lastName, householdName
            bloomerangData.forEach((record, recordIndex) => {
                const nameFields = [
                    record.name || '',           // Field 0: Complete Name
                    record.firstName || '',      // Field 1: First Name
                    record.lastName || '',       // Field 3: Last Name
                    record.householdName || ''   // Field 28: Household Name
                ];

                const recordWords = new Set(); // Track words in this specific record

                nameFields.forEach(nameField => {
                    if (!nameField.trim()) return;

                    // Clean and extract words (same logic as VisionAppraisal)
                    const words = this.extractWordsFromName(nameField);

                    words.forEach(word => {
                        if (word.length < 2) return; // Skip single characters

                        // Count total word occurrences
                        wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);

                        // Count unique records this word appears in (only once per record)
                        if (!recordWords.has(word)) {
                            recordWords.add(word);
                            wordRecordCount.set(word, (wordRecordCount.get(word) || 0) + 1);
                        }
                    });
                });
            });

            console.log(`Found ${wordFrequency.size} unique words`);
            console.log(`Total word occurrences: ${Array.from(wordFrequency.values()).reduce((a, b) => a + b, 0)}`);

            // Create analysis results
            const results = {
                totalWords: wordFrequency.size,
                totalOccurrences: Array.from(wordFrequency.values()).reduce((a, b) => a + b, 0),
                totalRecords: bloomerangData.length,
                wordFrequency: wordFrequency,
                wordRecordCount: wordRecordCount
            };

            // Generate reports (both TXT and CSV)
            const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');

            // Create sorted data arrays
            const frequencySorted = this.createSortedWordArray(wordFrequency, wordRecordCount, 'frequency');
            const alphabeticalSorted = this.createSortedWordArray(wordFrequency, wordRecordCount, 'alphabetical');

            // Generate text reports
            const frequencyReport = this.generateWordReport(results, frequencySorted, 'FREQUENCY', 'BLOOMERANG');
            const alphabeticalReport = this.generateWordReport(results, alphabeticalSorted, 'ALPHABETICAL', 'BLOOMERANG');

            // Save text files
            const frequencyFilename = `Bloomerang_WordFrequency_${timestamp}.txt`;
            const alphabeticalFilename = `Bloomerang_WordAlphabetical_${timestamp}.txt`;

            await this.saveToProgressFile(frequencyFilename, frequencyReport);
            await this.saveToProgressFile(alphabeticalFilename, alphabeticalReport);

            // Generate CSV reports
            const frequencyCSV = this.generateWordReportCSV(results, frequencySorted, 'FREQUENCY');
            const alphabeticalCSV = this.generateWordReportCSV(results, alphabeticalSorted, 'ALPHABETICAL');

            // Save CSV files
            const frequencyCSVFilename = `Bloomerang_WordFrequency_${timestamp}.csv`;
            const alphabeticalCSVFilename = `Bloomerang_WordAlphabetical_${timestamp}.csv`;

            await this.saveToProgressFile(frequencyCSVFilename, frequencyCSV);
            await this.saveToProgressFile(alphabeticalCSVFilename, alphabeticalCSV);

            console.log(`\nFiles saved:`);
            console.log(`1. Frequency-sorted TXT: ${frequencyFilename}`);
            console.log(`2. Alphabetical-sorted TXT: ${alphabeticalFilename}`);
            console.log(`3. Frequency-sorted CSV: ${frequencyCSVFilename}`);
            console.log(`4. Alphabetical-sorted CSV: ${alphabeticalCSVFilename}`);

            // Show top 20 most common words
            console.log(`\n📊 TOP 20 MOST COMMON WORDS IN BLOOMERANG NAMES:`);
            const top20 = Array.from(wordRecordCount.entries())
                .map(([word, count]) => ({ word, recordCount: count, totalOccurrences: wordFrequency.get(word) }))
                .sort((a, b) => b.recordCount - a.recordCount || b.totalOccurrences - a.totalOccurrences)
                .slice(0, 20);

            top20.forEach((item, index) => {
                console.log(`${(index + 1).toString().padStart(2)}. ${item.word.padEnd(15)} - ${item.recordCount} records`);
            });

            console.log("✅ Bloomerang name field word analysis complete!");

            return {
                frequencyFile: frequencyFilename,
                alphabeticalFile: alphabeticalFilename,
                frequencyCSVFile: frequencyCSVFilename,
                alphabeticalCSVFile: alphabeticalCSVFilename,
                totalWords: results.totalWords,
                totalOccurrences: results.totalOccurrences,
                totalRecords: results.totalRecords
            };

        } catch (error) {
            console.error("Error analyzing Bloomerang name fields:", error);
            throw error;
        }
    },

    // Load Bloomerang CSV data for analysis
    async loadBloomerangCSV() {
        try {
            const response = await fetch('http://127.0.0.99:3000/csv-file');

            if (!response.ok) {
                throw new Error(`Failed to load Bloomerang CSV: ${response.status} ${response.statusText}`);
            }

            const csvText = await response.text();
            const lines = csvText.split('\n').filter(line => line.trim());

            // Skip header row, parse data rows
            const dataRows = lines.slice(1); // Skip header
            const records = [];

            dataRows.forEach((line, index) => {
                const fields = line.split(',');
                if (fields.length >= 29) { // Ensure we have enough fields
                    records.push({
                        name: (fields[0] || '').replace(/"/g, '').replace(/\^#C#\^/g, ',').trim(),
                        firstName: (fields[1] || '').replace(/"/g, '').replace(/\^#C#\^/g, ',').trim(),
                        lastName: (fields[3] || '').replace(/"/g, '').replace(/\^#C#\^/g, ',').trim(),
                        householdName: (fields[28] || '').replace(/"/g, '').replace(/\^#C#\^/g, ',').trim()
                    });
                }
            });

            return records;

        } catch (error) {
            console.error("Error loading Bloomerang CSV:", error);
            throw error;
        }
    },

    // Generate filtered VisionAppraisal word list with Bloomerang words removed
    async generateFilteredVisionAppraisalList() {
        console.log("=== GENERATING FILTERED VISIONAPPRAISAL WORD LIST ===");
        console.log("Removing all words that appear in Bloomerang names...");

        try {
            // Step 1: Get VisionAppraisal word analysis
            const visionResults = await this.analyzeNameFieldWords();
            console.log(`VisionAppraisal: ${visionResults.totalWords} unique words, ${visionResults.totalRecords} records`);

            // Step 2: Get Bloomerang word analysis
            const bloomerangResults = await this.analyzeBloomerangNameFieldWords();
            console.log(`Bloomerang: ${bloomerangResults.totalWords} unique words, ${bloomerangResults.totalRecords} records`);

            // Step 3: Create sets for efficient lookup
            const visionWords = new Map();
            const bloomerangWords = new Set();

            // Load VisionAppraisal words with their data
            const visionData = await VisionAppraisal.loadData();
            visionData.forEach((record, recordIndex) => {
                const ownerName = record.ownerName || '';
                if (!ownerName.trim()) return;

                const words = this.extractWordsFromName(ownerName);
                const recordWords = new Set();

                words.forEach(word => {
                    if (word.length < 2) return;

                    if (!visionWords.has(word)) {
                        visionWords.set(word, {
                            word: word,
                            recordCount: 0,
                            totalOccurrences: 0,
                            firstLetter: word.charAt(0).toUpperCase()
                        });
                    }

                    const wordData = visionWords.get(word);
                    wordData.totalOccurrences++;

                    if (!recordWords.has(word)) {
                        recordWords.add(word);
                        wordData.recordCount++;
                    }
                });
            });

            // Load Bloomerang words
            const bloomerangData = await this.loadBloomerangCSV();
            bloomerangData.forEach((record) => {
                const nameFields = [
                    record.name || '',
                    record.firstName || '',
                    record.lastName || '',
                    record.householdName || ''
                ];

                nameFields.forEach(nameField => {
                    if (!nameField.trim()) return;

                    const words = this.extractWordsFromName(nameField);
                    words.forEach(word => {
                        if (word.length >= 2) {
                            bloomerangWords.add(word);
                        }
                    });
                });
            });

            console.log(`\n📊 FILTERING ANALYSIS:`);
            console.log(`- VisionAppraisal words: ${visionWords.size}`);
            console.log(`- Bloomerang words: ${bloomerangWords.size}`);

            // Step 4: Filter VisionAppraisal words to exclude Bloomerang matches
            const filteredWords = new Map();
            let removedCount = 0;

            visionWords.forEach((wordData, word) => {
                if (!bloomerangWords.has(word)) {
                    filteredWords.set(word, wordData);
                } else {
                    removedCount++;
                }
            });

            console.log(`- Words removed: ${removedCount}`);
            console.log(`- Filtered VisionAppraisal words: ${filteredWords.size}`);

            // Step 5: Generate reports
            const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');

            // Create sorted arrays
            const frequencySorted = this.createSortedWordArray(
                new Map([...filteredWords.entries()].map(([word, data]) => [word, data.totalOccurrences])),
                new Map([...filteredWords.entries()].map(([word, data]) => [word, data.recordCount])),
                'frequency'
            );

            const alphabeticalSorted = this.createSortedWordArray(
                new Map([...filteredWords.entries()].map(([word, data]) => [word, data.totalOccurrences])),
                new Map([...filteredWords.entries()].map(([word, data]) => [word, data.recordCount])),
                'alphabetical'
            );

            // Create results object for report generation
            const results = {
                totalWords: filteredWords.size,
                totalOccurrences: Array.from(filteredWords.values()).reduce((sum, data) => sum + data.totalOccurrences, 0),
                totalRecords: visionData.length,
                wordFrequency: new Map([...filteredWords.entries()].map(([word, data]) => [word, data.totalOccurrences])),
                wordRecordCount: new Map([...filteredWords.entries()].map(([word, data]) => [word, data.recordCount]))
            };

            // Generate text reports
            const frequencyReport = this.generateWordReport(results, frequencySorted, 'FREQUENCY', 'FILTERED_VISIONAPPRAISAL');
            const alphabeticalReport = this.generateWordReport(results, alphabeticalSorted, 'ALPHABETICAL', 'FILTERED_VISIONAPPRAISAL');

            // Generate CSV reports
            const frequencyCSV = this.generateWordReportCSV(results, frequencySorted, 'FREQUENCY');
            const alphabeticalCSV = this.generateWordReportCSV(results, alphabeticalSorted, 'ALPHABETICAL');

            // Save files
            const frequencyFilename = `Filtered_VisionAppraisal_WordFrequency_${timestamp}.txt`;
            const alphabeticalFilename = `Filtered_VisionAppraisal_WordAlphabetical_${timestamp}.txt`;
            const frequencyCSVFilename = `Filtered_VisionAppraisal_WordFrequency_${timestamp}.csv`;
            const alphabeticalCSVFilename = `Filtered_VisionAppraisal_WordAlphabetical_${timestamp}.csv`;

            await this.saveToProgressFile(frequencyFilename, frequencyReport);
            await this.saveToProgressFile(alphabeticalFilename, alphabeticalReport);
            await this.saveToProgressFile(frequencyCSVFilename, frequencyCSV);
            await this.saveToProgressFile(alphabeticalCSVFilename, alphabeticalCSV);

            console.log(`\n📁 FILES SAVED:`);
            console.log(`1. Filtered TXT (Frequency): ${frequencyFilename}`);
            console.log(`2. Filtered TXT (Alphabetical): ${alphabeticalFilename}`);
            console.log(`3. Filtered CSV (Frequency): ${frequencyCSVFilename}`);
            console.log(`4. Filtered CSV (Alphabetical): ${alphabeticalCSVFilename}`);

            // Show top 20 unique VisionAppraisal words
            console.log(`\n🎯 TOP 20 UNIQUE VISIONAPPRAISAL WORDS (NOT IN BLOOMERANG):`);
            const top20 = frequencySorted.slice(0, 20);
            top20.forEach((item, index) => {
                console.log(`${(index + 1).toString().padStart(2)}. ${item.word.padEnd(15)} - ${item.recordCount} records`);
            });

            console.log("✅ Filtered VisionAppraisal word analysis complete!");
            console.log(`💡 These ${filteredWords.size} words represent potential NEW contacts not in your Bloomerang database!`);

            return {
                filteredWords: filteredWords.size,
                originalWords: visionWords.size,
                removedWords: removedCount,
                frequencyFile: frequencyFilename,
                alphabeticalFile: alphabeticalFilename,
                frequencyCSVFile: frequencyCSVFilename,
                alphabeticalCSVFile: alphabeticalCSVFilename
            };

        } catch (error) {
            console.error("Error generating filtered VisionAppraisal list:", error);
            throw error;
        }
    },

    // Find complete VisionAppraisal owner names with zero Bloomerang name overlap
    async findBusinessEntityRecords() {
        console.log("=== FINDING BUSINESS ENTITY RECORDS ===");
        console.log("Looking for complete owner names with zero overlap with Bloomerang names...");

        try {
            // Step 1: Load Bloomerang words as a lookup set
            console.log("Loading Bloomerang name words...");
            const bloomerangWords = new Set();
            const bloomerangData = await this.loadBloomerangCSV();

            bloomerangData.forEach((record) => {
                const nameFields = [
                    record.name || '',
                    record.firstName || '',
                    record.lastName || '',
                    record.householdName || ''
                ];

                nameFields.forEach(nameField => {
                    if (!nameField.trim()) return;
                    const words = this.extractWordsFromName(nameField);
                    words.forEach(word => {
                        if (word.length >= 2) {
                            bloomerangWords.add(word);
                        }
                    });
                });
            });

            console.log(`Loaded ${bloomerangWords.size} unique Bloomerang name words`);

            // Step 2: Load VisionAppraisal data and find records with zero overlap
            console.log("Analyzing VisionAppraisal owner names...");
            const visionData = await VisionAppraisal.loadData();
            const businessEntityRecords = [];

            visionData.forEach((record, recordIndex) => {
                const ownerName = record.ownerName || '';
                if (!ownerName.trim()) return;

                // Extract words from this owner name
                const ownerWords = this.extractWordsFromName(ownerName);
                if (ownerWords.length === 0) return;

                // Check if ANY word appears in Bloomerang names
                const hasPersonalName = ownerWords.some(word =>
                    word.length >= 2 && bloomerangWords.has(word)
                );

                // If NO words match Bloomerang, this is likely a business entity
                if (!hasPersonalName) {
                    businessEntityRecords.push({
                        recordNumber: recordIndex + 1,
                        pid: record.pid || 'N/A',
                        fireNumber: record.fireNumber || 'N/A',
                        ownerName: ownerName,
                        propertyLocation: record.propertyLocation || 'N/A',
                        wordCount: ownerWords.length,
                        words: ownerWords
                    });
                }
            });

            console.log(`\n📊 ANALYSIS RESULTS:`);
            console.log(`- Total VisionAppraisal records: ${visionData.length}`);
            console.log(`- Business entity records found: ${businessEntityRecords.length}`);
            console.log(`- Percentage: ${((businessEntityRecords.length / visionData.length) * 100).toFixed(1)}%`);

            // Step 3: Generate detailed CSV report
            const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
            const csvFilename = `Business_Entity_Records_${timestamp}.csv`;

            // Create CSV content with comprehensive data
            let csvContent = 'RecordNumber,PID,FireNumber,OwnerName,PropertyLocation,WordCount,Words\n';
            businessEntityRecords.forEach(record => {
                const words = record.words.join(' | ');
                csvContent += `${record.recordNumber},"${record.pid}","${record.fireNumber}","${record.ownerName}","${record.propertyLocation}",${record.wordCount},"${words}"\n`;
            });

            // Save CSV file
            await this.saveToProgressFile(csvFilename, csvContent);

            // Step 4: Generate summary text report
            const txtFilename = `Business_Entity_Summary_${timestamp}.txt`;
            let txtContent = `BUSINESS ENTITY RECORDS ANALYSIS\n`;
            txtContent += `Generated: ${new Date().toISOString()}\n\n`;
            txtContent += `SUMMARY:\n`;
            txtContent += `- Total VisionAppraisal records analyzed: ${visionData.length}\n`;
            txtContent += `- Business entity records identified: ${businessEntityRecords.length}\n`;
            txtContent += `- Percentage of total records: ${((businessEntityRecords.length / visionData.length) * 100).toFixed(1)}%\n`;
            txtContent += `- Bloomerang words used for filtering: ${bloomerangWords.size}\n\n`;

            txtContent += `METHODOLOGY:\n`;
            txtContent += `- Loaded all unique words from Bloomerang name fields\n`;
            txtContent += `- Analyzed each VisionAppraisal owner name\n`;
            txtContent += `- Identified records where NO words match Bloomerang names\n`;
            txtContent += `- These likely represent pure business entities, trusts, organizations\n\n`;

            txtContent += `TOP 20 BUSINESS ENTITY RECORDS:\n`;
            businessEntityRecords.slice(0, 20).forEach((record, index) => {
                txtContent += `${(index + 1).toString().padStart(2)}. Record ${record.recordNumber} (PID: ${record.pid})\n`;
                txtContent += `    Name: ${record.ownerName}\n`;
                txtContent += `    Location: ${record.propertyLocation}\n`;
                txtContent += `    Fire #: ${record.fireNumber}\n\n`;
            });

            await this.saveToProgressFile(txtFilename, txtContent);

            console.log(`\n📁 FILES SAVED:`);
            console.log(`1. Business Entity CSV: ${csvFilename}`);
            console.log(`2. Summary Report: ${txtFilename}`);

            // Show top 20 examples
            console.log(`\n🏢 TOP 20 BUSINESS ENTITY RECORDS:`);
            businessEntityRecords.slice(0, 20).forEach((record, index) => {
                console.log(`${(index + 1).toString().padStart(2)}. Record ${record.recordNumber} (PID: ${record.pid})`);
                console.log(`    ${record.ownerName}`);
            });

            console.log("✅ Business entity records analysis complete!");
            console.log(`💼 Found ${businessEntityRecords.length} records with zero personal name overlap!`);

            return {
                totalRecords: visionData.length,
                businessEntityRecords: businessEntityRecords.length,
                percentage: ((businessEntityRecords.length / visionData.length) * 100).toFixed(1),
                csvFile: csvFilename,
                summaryFile: txtFilename,
                records: businessEntityRecords
            };

        } catch (error) {
            console.error("Error finding business entity records:", error);
            throw error;
        }
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.NameAnalysis = NameAnalysis;
}