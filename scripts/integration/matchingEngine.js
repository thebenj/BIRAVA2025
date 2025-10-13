// Generic Matching Engine for Multi-Source Data Integration
// Supports Fire Number, name similarity, and address pattern matching

const MatchingEngine = {

    // Stage 1: Direct Fire Number Matching
    matchByFireNumber(sourceRecords, targetRecords) {
        console.log("=== FIRE NUMBER DIRECT MATCHING ===");

        // Build comprehensive Fire Number index from target records (VisionAppraisal)
        const indexResults = this.createVisionAppraisalFireNumberIndex(targetRecords);
        const targetIndex = indexResults.index;

        console.log(`VisionAppraisal Index Created: ${indexResults.stats.totalRecords} records, ${indexResults.stats.withFireNumbers} with Fire Numbers, ${indexResults.stats.uniqueFireNumbers} unique Fire Numbers`);

        const results = {
            directMatches: [],
            multipleMatches: [],
            noMatches: [],
            stats: {
                totalSource: sourceRecords.length,
                withFireNumbers: 0,
                directMatched: 0,
                multipleMatched: 0,
                noMatched: 0
            }
        };

        // Enhanced Bloomerang → VisionAppraisal Fire Number lookup
        sourceRecords.forEach(sourceRecord => {
            const fireNumber = this.extractFireNumber(sourceRecord);

            if (!fireNumber) {
                results.noMatches.push({
                    sourceRecord,
                    reason: 'NO_FIRE_NUMBER'
                });
                return;
            }

            results.stats.withFireNumbers++;
            const fireNumberEntry = targetIndex[fireNumber];

            if (!fireNumberEntry) {
                results.noMatches.push({
                    sourceRecord,
                    fireNumber,
                    reason: 'FIRE_NUMBER_NOT_FOUND'
                });
                results.stats.noMatched++;
                return;
            }

            // Enhanced matching using comprehensive index structure
            if (fireNumberEntry.records.length === 1) {
                // Single VisionAppraisal record - direct match
                results.directMatches.push({
                    sourceRecord,
                    targetRecord: fireNumberEntry.records[0].originalRecord,
                    fireNumber,
                    confidence: 'HIGH',
                    matchType: 'FIRE_NUMBER_DIRECT',
                    visionAppraisalMetadata: {
                        pid: fireNumberEntry.records[0].pid,
                        ownerName: fireNumberEntry.records[0].ownerName,
                        propertyLocation: fireNumberEntry.records[0].propertyLocation,
                        isMultiUnit: false,
                        ownerCount: 1
                    }
                });
                results.stats.directMatched++;
            } else {
                // Multiple VisionAppraisal records - requires owner clustering
                results.multipleMatches.push({
                    sourceRecord,
                    targetRecords: fireNumberEntry.records.map(r => r.originalRecord),
                    fireNumber,
                    reason: 'MULTIPLE_TARGETS_PER_FIRE_NUMBER',
                    requiresOwnerClustering: fireNumberEntry.needsOwnerClustering,
                    visionAppraisalMetadata: {
                        isMultiUnit: fireNumberEntry.isMultiUnit,
                        ownerCount: fireNumberEntry.ownerCount,
                        uniqueOwners: Array.from(fireNumberEntry.owners),
                        uniqueAddresses: Array.from(fireNumberEntry.addresses),
                        recordCount: fireNumberEntry.records.length,
                        allRecords: fireNumberEntry.records.map(r => ({
                            pid: r.pid,
                            ownerName: r.ownerName,
                            propertyLocation: r.propertyLocation
                        }))
                    }
                });
                results.stats.multipleMatched++;
            }
        });

        console.log(`Fire Number Matching Results:`);
        console.log(`- Direct matches: ${results.stats.directMatched}`);
        console.log(`- Multiple matches: ${results.stats.multipleMatched}`);
        console.log(`- No matches: ${results.stats.noMatched}`);

        return results;
    },

    // Stage 2: Name Similarity Matching with Clear/Near match categories
    matchByNameSimilarity(unmatched, targetRecords) {
        console.log("=== NAME SIMILARITY MATCHING ===");

        const results = {
            clearMatches: [],      // High confidence matches (>= 0.85)
            nearMatches: [],       // Manual review needed (0.5 - 0.84)
            stats: {
                processed: unmatched.length,
                clearMatched: 0,
                nearMatched: 0,
                noViableMatches: 0
            }
        };

        unmatched.forEach(sourceRecord => {
            const sourceName = this.extractName(sourceRecord);
            if (!sourceName) {
                results.stats.noViableMatches++;
                return;
            }

            let bestMatch = null;
            let bestScore = 0;

            // Find best match across all target records
            targetRecords.forEach(targetRecord => {
                const targetName = this.extractName(targetRecord);
                if (targetName) {
                    const similarity = this.calculateNameSimilarity(sourceName, targetName);
                    if (similarity > bestScore) {
                        bestScore = similarity;
                        bestMatch = targetRecord;
                    }
                }
            });

            if (bestMatch && bestScore >= 0.85) {
                // Clear match - high confidence
                results.clearMatches.push({
                    sourceRecord,
                    targetRecord: bestMatch,
                    similarity: bestScore,
                    confidence: 'HIGH',
                    matchType: 'NAME_CLEAR_MATCH'
                });
                results.stats.clearMatched++;
            } else if (bestMatch && bestScore >= 0.5) {
                // Near match - needs manual review
                results.nearMatches.push({
                    sourceRecord,
                    targetRecord: bestMatch,
                    similarity: bestScore,
                    confidence: 'REVIEW_NEEDED',
                    matchType: 'NAME_NEAR_MATCH',
                    sourceName: sourceName,
                    targetName: this.extractName(bestMatch)
                });
                results.stats.nearMatched++;
            } else {
                // No viable matches (< 0.5 similarity) - don't track these
                results.stats.noViableMatches++;
            }
        });

        console.log(`Name Similarity Results:`);
        console.log(`- Clear matches: ${results.stats.clearMatched}`);
        console.log(`- Near matches (need review): ${results.stats.nearMatched}`);
        console.log(`- No viable matches: ${results.stats.noViableMatches}`);

        return results;
    },

    // Stage 3: Address Pattern Matching (Block Island specific)
    matchByAddressPattern(unmatched, targetRecords) {
        console.log("=== ADDRESS PATTERN MATCHING ===");

        // This stage would implement Block Island address standardization
        // For now, return basic structure
        return {
            addressMatches: [],
            stillUnmatched: unmatched.map(record => ({
                sourceRecord: record,
                reason: 'ADDRESS_MATCHING_NOT_IMPLEMENTED'
            })),
            stats: {
                processed: unmatched.length,
                addressMatched: 0,
                finalUnmatched: unmatched.length
            }
        };
    },

    // Create comprehensive Fire Number index for VisionAppraisal records
    createVisionAppraisalFireNumberIndex(visionAppraisalRecords) {
        console.log("Creating VisionAppraisal Fire Number index...");

        const index = {};
        const stats = {
            totalRecords: visionAppraisalRecords.length,
            withFireNumbers: 0,
            withoutFireNumbers: 0,
            uniqueFireNumbers: 0,
            multiUnitFireNumbers: 0,
            recordsInMultiUnit: 0
        };

        // Build index with enhanced metadata
        visionAppraisalRecords.forEach((record, recordIndex) => {
            const fireNumber = this.extractFireNumber(record);

            if (fireNumber) {
                stats.withFireNumbers++;

                // Initialize Fire Number entry if not exists
                if (!index[fireNumber]) {
                    index[fireNumber] = {
                        fireNumber: fireNumber,
                        records: [],
                        owners: new Set(), // Track unique owners for clustering
                        addresses: new Set() // Track unique addresses
                    };
                    stats.uniqueFireNumbers++;
                }

                // Add record to index
                index[fireNumber].records.push({
                    originalRecord: record,
                    recordIndex: recordIndex,
                    pid: record.pid || record.PID || null,
                    ownerName: this.extractName(record) || "UNKNOWN",
                    propertyLocation: record.propertyLocation || record.property_location || ""
                });

                // Track unique owners and addresses for multi-unit detection
                const ownerName = this.extractName(record);
                if (ownerName) {
                    index[fireNumber].owners.add(ownerName.toUpperCase().trim());
                }

                const address = record.propertyLocation || record.property_location || "";
                if (address) {
                    index[fireNumber].addresses.add(address.trim());
                }
            } else {
                stats.withoutFireNumbers++;
            }
        });

        // Post-process to identify multi-unit properties
        Object.values(index).forEach(fireNumberEntry => {
            if (fireNumberEntry.records.length > 1) {
                stats.multiUnitFireNumbers++;
                stats.recordsInMultiUnit += fireNumberEntry.records.length;
                fireNumberEntry.isMultiUnit = true;
                fireNumberEntry.ownerCount = fireNumberEntry.owners.size;
                fireNumberEntry.needsOwnerClustering = fireNumberEntry.ownerCount > 1;
            } else {
                fireNumberEntry.isMultiUnit = false;
                fireNumberEntry.ownerCount = 1;
                fireNumberEntry.needsOwnerClustering = false;
            }
        });

        console.log(`Index Statistics:`);
        console.log(`- Records with Fire Numbers: ${stats.withFireNumbers}/${stats.totalRecords} (${(stats.withFireNumbers/stats.totalRecords*100).toFixed(1)}%)`);
        console.log(`- Unique Fire Numbers: ${stats.uniqueFireNumbers}`);
        console.log(`- Multi-unit Fire Numbers: ${stats.multiUnitFireNumbers} (${stats.recordsInMultiUnit} total records)`);

        return {
            index: index,
            stats: stats
        };
    },

    // Helper: Extract Fire Number from record using object-oriented approach
    extractFireNumber(record) {
        // Check if record is already a processed entity with locationIdentifier
        if (record.locationIdentifier && record.locationIdentifier.identifier) {
            const identifier = record.locationIdentifier.identifier;
            // If it's a FireNumber class instance
            if (identifier.constructor.name === 'FireNumber' && identifier.primaryAlias) {
                const fireNumberTerm = identifier.primaryAlias;
                if (fireNumberTerm.extractFireNumber) {
                    return fireNumberTerm.extractFireNumber();
                }
            }
        }

        // Enhanced extraction using FireNumberTerm for validation
        return this.extractFireNumberWithValidation(record);
    },

    // Enhanced Fire Number extraction using FireNumberTerm validation
    extractFireNumberWithValidation(record) {
        const candidates = [];

        // VisionAppraisal format
        if (record.fireNumber !== undefined) {
            candidates.push(record.fireNumber);
        }

        // Bloomerang format variations
        if (record.fire_number) candidates.push(record.fire_number);
        if (record['Fire Number']) candidates.push(record['Fire Number']);
        if (record.fireNum) candidates.push(record.fireNum);

        // Property location parsing (VisionAppraisal)
        if (record.propertyLocation) {
            const match = record.propertyLocation.match(/^\s*(\d+)/);
            if (match) {
                candidates.push(parseInt(match[1]));
            }
        }

        // Use FireNumberTerm to validate each candidate
        for (const candidate of candidates) {
            if (candidate !== null && candidate !== undefined && candidate !== '') {
                try {
                    // Create a temporary FireNumberTerm to use its validation logic
                    const fireNumberTerm = new FireNumberTerm(candidate, 'TEMP_VALIDATION', 0, 'validation');
                    const validFireNumber = fireNumberTerm.extractFireNumber();
                    if (validFireNumber !== null) {
                        return validFireNumber;
                    }
                } catch (error) {
                    // If FireNumberTerm is not available, fall back to basic validation
                    const numeric = typeof candidate === 'number' ? candidate : parseInt(candidate);
                    if (!isNaN(numeric) && numeric > 0 && numeric < 3500) {
                        return numeric;
                    }
                }
            }
        }

        return null;
    },

    // Helper: Extract name from record (works with multiple formats)
    extractName(record) {
        // Common name fields
        if (record.name) return record.name;
        if (record.ownerName) return record.ownerName;
        if (record.firstName && record.lastName) {
            return `${record.firstName} ${record.lastName}`.trim();
        }
        if (record.fullName) return record.fullName;

        return null;
    },

    // Helper: Calculate name similarity (BASIC IMPLEMENTATION - NEEDS MAJOR ENHANCEMENT)
    // TODO NEXT SESSION: Replace with Levenshtein distance algorithm
    // TODO NEXT SESSION: Add data cleaning for VisionAppraisal names (remove "^#^" tags)
    // TODO NEXT SESSION: Normalize business entities (Trust, LLC, Corp, etc.)
    // TODO NEXT SESSION: Implement alias management system
    calculateNameSimilarity(name1, name2) {
        if (!name1 || !name2) return 0;

        // TODO: Clean VisionAppraisal names - remove "^#^" line break markers
        // TODO: Normalize business entity suffixes before comparison
        const clean1 = name1.toUpperCase().replace(/[^A-Z\s]/g, '').trim();
        const clean2 = name2.toUpperCase().replace(/[^A-Z\s]/g, '').trim();

        if (clean1 === clean2) return 1.0;

        // Simple word overlap similarity
        const words1 = clean1.split(/\s+/);
        const words2 = clean2.split(/\s+/);

        let matches = 0;
        words1.forEach(word1 => {
            if (words2.some(word2 => word2 === word1 && word1.length > 2)) {
                matches++;
            }
        });

        const totalWords = Math.max(words1.length, words2.length);
        return totalWords > 0 ? matches / totalWords : 0;
    },

    // Multi-stage matching pipeline
    runMultiStageMatcher(sourceRecords, targetRecords) {
        console.log("=== MULTI-STAGE MATCHING PIPELINE ===");
        console.log(`Source records: ${sourceRecords.length}`);
        console.log(`Target records: ${targetRecords.length}`);

        // Stage 1: Fire Number matching
        const stage1Results = this.matchByFireNumber(sourceRecords, targetRecords);

        // Stage 2: Name similarity for unmatched records
        const unmatchedAfterStage1 = stage1Results.noMatches.map(item => item.sourceRecord);
        const stage2Results = this.matchByNameSimilarity(unmatchedAfterStage1, targetRecords);

        // Combine results into meaningful categories
        const finalResults = {
            // Clear automatic matches - no human review needed
            clearMatches: [
                ...stage1Results.directMatches,
                ...stage2Results.clearMatches
            ],

            // Near matches requiring manual review
            nearMatches: [
                ...stage1Results.multipleMatches, // Multi-unit properties need owner clustering
                ...stage2Results.nearMatches      // Names similar but not definitive
            ],

            // Stage results for detailed analysis
            stageResults: {
                stage1: stage1Results,
                stage2: stage2Results
            },

            // Business summary
            summary: {
                totalProcessed: sourceRecords.length,
                clearMatches: stage1Results.directMatches.length + stage2Results.clearMatches.length,
                nearMatchesNeedingReview: stage1Results.multipleMatches.length + stage2Results.nearMatches.length,
                noViableMatches: stage2Results.stats.noViableMatches || 0
            }
        };

        console.log("=== PIPELINE SUMMARY ===");
        console.log(`Clear matches: ${finalResults.summary.clearMatches}`);
        console.log(`Near matches needing review: ${finalResults.summary.nearMatchesNeedingReview}`);
        console.log(`No viable matches: ${finalResults.summary.noViableMatches}`);

        return finalResults;
    },

    // Test function to verify comprehensive Fire Number matching with index creation
    testFireNumberMatcher() {
        console.log("=== TESTING FIRE NUMBER MATCHER WITH INDEX CREATION ===");

        // Test sample data - Bloomerang-like source records
        const sampleSource = [
            { fireNumber: 1234, name: "John Smith" },
            { propertyLocation: "567 MAIN STREET", name: "Jane Doe" },
            { fire_number: 890, name: "Bob Wilson" },
            { fireNumber: 1234, name: "John Smith Household" } // Same Fire Number, different record
        ];

        // Test sample data - VisionAppraisal-like target records with multi-unit properties
        const sampleTarget = [
            { fireNumber: 1234, ownerName: "JOHN SMITH", propertyLocation: "1234 BEACH AVE", pid: "12345" },
            { fireNumber: 1234, ownerName: "MARY SMITH", propertyLocation: "1234 BEACH AVE UNIT B", pid: "12346" }, // Multi-unit
            { fireNumber: 567, ownerName: "JANE DOE", propertyLocation: "567 MAIN STREET", pid: "56789" },
            { fireNumber: 999, ownerName: "UNKNOWN OWNER", propertyLocation: "999 OCEAN DRIVE", pid: "99999" },
            { propertyLocation: "2000 HILL ROAD", ownerName: "PROPERTY WITHOUT FIRE NUMBER", pid: "20000" } // No Fire Number
        ];

        console.log(`Testing with ${sampleSource.length} source records, ${sampleTarget.length} target records`);

        // Test index creation first
        console.log("\n=== TESTING INDEX CREATION ===");
        const indexResults = this.createVisionAppraisalFireNumberIndex(sampleTarget);

        console.log(`Index created successfully:`);
        console.log(`- Total records: ${indexResults.stats.totalRecords}`);
        console.log(`- With Fire Numbers: ${indexResults.stats.withFireNumbers}`);
        console.log(`- Unique Fire Numbers: ${indexResults.stats.uniqueFireNumbers}`);
        console.log(`- Multi-unit properties: ${indexResults.stats.multiUnitFireNumbers}`);

        // Test the full matchByFireNumber function
        console.log("\n=== TESTING FULL MATCHING PIPELINE ===");
        const results = this.matchByFireNumber(sampleSource, sampleTarget);

        console.log("Final Matching Results:");
        console.log(`- Direct matches: ${results.stats.directMatched}`);
        console.log(`- Multiple matches: ${results.stats.multipleMatched}`);
        console.log(`- No matches: ${results.stats.noMatched}`);

        return {
            success: true,
            results: results,
            indexResults: indexResults,
            message: "Fire Number matcher with index creation test completed"
        };
    },

    // Test function to verify Bloomerang Fire Number extraction using FireNumberTerm validation
    testBloomerangFireNumberExtraction() {
        console.log("=== TESTING BLOOMERANG FIRE NUMBER EXTRACTION ===");

        // Test sample Bloomerang records with various Fire Number formats
        const sampleBloomerangRecords = [
            { fireNumber: 1234, name: "Direct fireNumber field" },
            { fire_number: "567", name: "String fire_number field" },
            { "Fire Number": 890, name: "Spaced Fire Number field" },
            { fireNum: "1500", name: "fireNum variant" },
            { propertyLocation: "2500 BEACH AVENUE", name: "Fire Number from address" },
            { fireNumber: 4000, name: "Invalid Fire Number (too high)" },
            { fireNumber: 0, name: "Invalid Fire Number (zero)" },
            { fireNumber: -100, name: "Invalid Fire Number (negative)" },
            { name: "No Fire Number field" },
            { fireNumber: "", name: "Empty Fire Number" },
            { fireNumber: "ABC123", name: "Non-numeric Fire Number" }
        ];

        console.log(`Testing Fire Number extraction on ${sampleBloomerangRecords.length} Bloomerang records`);

        const results = {
            validExtractions: [],
            invalidExtractions: [],
            stats: {
                total: sampleBloomerangRecords.length,
                valid: 0,
                invalid: 0,
                extracted: 0
            }
        };

        // Test each record
        sampleBloomerangRecords.forEach((record, index) => {
            const fireNumber = this.extractFireNumber(record);

            if (fireNumber !== null) {
                results.validExtractions.push({
                    index: index,
                    record: record,
                    extractedFireNumber: fireNumber,
                    reason: "VALID_EXTRACTION"
                });
                results.stats.valid++;
                results.stats.extracted++;
            } else {
                results.invalidExtractions.push({
                    index: index,
                    record: record,
                    extractedFireNumber: null,
                    reason: this._getExtractionFailureReason(record)
                });
                results.stats.invalid++;
            }
        });

        console.log("Fire Number Extraction Results:");
        console.log(`- Valid extractions: ${results.stats.valid}/${results.stats.total}`);
        console.log(`- Invalid/failed extractions: ${results.stats.invalid}/${results.stats.total}`);

        console.log("\nValid Extractions:");
        results.validExtractions.forEach(item => {
            console.log(`  Record ${item.index}: "${item.record.name}" → Fire Number ${item.extractedFireNumber}`);
        });

        console.log("\nInvalid Extractions:");
        results.invalidExtractions.forEach(item => {
            console.log(`  Record ${item.index}: "${item.record.name}" → ${item.reason}`);
        });

        return {
            success: true,
            results: results,
            message: "Bloomerang Fire Number extraction test completed"
        };
    },

    // Helper to determine why Fire Number extraction failed
    _getExtractionFailureReason(record) {
        if (!record.fireNumber && !record.fire_number && !record['Fire Number'] && !record.fireNum && !record.propertyLocation) {
            return "NO_FIRE_NUMBER_FIELD";
        }
        if (record.fireNumber === "" || record.fire_number === "" || record['Fire Number'] === "" || record.fireNum === "") {
            return "EMPTY_FIRE_NUMBER_FIELD";
        }
        if (record.fireNumber && (typeof record.fireNumber === 'string' && isNaN(parseInt(record.fireNumber)))) {
            return "NON_NUMERIC_FIRE_NUMBER";
        }
        const candidateValue = record.fireNumber || record.fire_number || record['Fire Number'] || record.fireNum;
        if (candidateValue && (candidateValue <= 0 || candidateValue >= 3500)) {
            return "FIRE_NUMBER_OUT_OF_RANGE";
        }
        return "UNKNOWN_VALIDATION_FAILURE";
    },

    // Test function to verify direct lookup matching logic with known pairs
    testDirectLookupMatching() {
        console.log("=== TESTING DIRECT LOOKUP BETWEEN DATASETS ===");

        // Test Bloomerang source records
        const bloomerangRecords = [
            { fireNumber: 1234, name: "John Smith", accountNumber: "ACC001" },
            { fireNumber: 567, name: "Jane Doe", accountNumber: "ACC002" },
            { fireNumber: 1234, name: "Mary Smith", accountNumber: "ACC003" }, // Same Fire Number as John
            { fireNumber: 999, name: "Bob Wilson", accountNumber: "ACC004" }, // No VisionAppraisal match
            { fire_number: "2500", name: "Sarah Johnson", accountNumber: "ACC005" }, // String format
            { name: "No Fire Number Person", accountNumber: "ACC006" } // No Fire Number
        ];

        // Test VisionAppraisal target records with realistic property data
        const visionAppraisalRecords = [
            { fireNumber: 1234, ownerName: "JOHN SMITH", propertyLocation: "1234 BEACH AVE", pid: "12345" },
            { fireNumber: 1234, ownerName: "MARY SMITH", propertyLocation: "1234 BEACH AVE UNIT B", pid: "12346" }, // Multi-unit
            { fireNumber: 567, ownerName: "JANE DOE", propertyLocation: "567 MAIN STREET", pid: "56789" },
            { fireNumber: 2500, ownerName: "SARAH JOHNSON", propertyLocation: "2500 HILL ROAD", pid: "25000" },
            { fireNumber: 3000, ownerName: "UNKNOWN RESIDENT", propertyLocation: "3000 OCEAN DRIVE", pid: "30000" } // No Bloomerang match
        ];

        console.log(`Testing lookup between ${bloomerangRecords.length} Bloomerang records and ${visionAppraisalRecords.length} VisionAppraisal records`);

        // Run the direct matching
        const matchResults = this.matchByFireNumber(bloomerangRecords, visionAppraisalRecords);

        console.log("\n=== DIRECT LOOKUP RESULTS ===");
        console.log(`Direct matches: ${matchResults.stats.directMatched}`);
        console.log(`Multiple matches: ${matchResults.stats.multipleMatched}`);
        console.log(`No matches: ${matchResults.stats.noMatched}`);

        console.log("\n=== DIRECT MATCHES DETAILS ===");
        matchResults.directMatches.forEach((match, index) => {
            console.log(`${index + 1}. Fire Number ${match.fireNumber}:`);
            console.log(`   Bloomerang: ${match.sourceRecord.name} (${match.sourceRecord.accountNumber})`);
            console.log(`   VisionAppraisal: ${match.visionAppraisalMetadata.ownerName} (PID: ${match.visionAppraisalMetadata.pid})`);
            console.log(`   Property: ${match.visionAppraisalMetadata.propertyLocation}`);
        });

        console.log("\n=== MULTIPLE MATCHES DETAILS (Multi-Unit Properties) ===");
        matchResults.multipleMatches.forEach((match, index) => {
            console.log(`${index + 1}. Fire Number ${match.fireNumber}:`);
            console.log(`   Bloomerang: ${match.sourceRecord.name} (${match.sourceRecord.accountNumber})`);
            console.log(`   VisionAppraisal owners: ${match.visionAppraisalMetadata.uniqueOwners.join(', ')}`);
            console.log(`   Property count: ${match.visionAppraisalMetadata.recordCount} units`);
            console.log(`   Needs owner clustering: ${match.requiresOwnerClustering}`);
            match.visionAppraisalMetadata.allRecords.forEach((record, recordIndex) => {
                console.log(`     Unit ${recordIndex + 1}: ${record.ownerName} (PID: ${record.pid}) at ${record.propertyLocation}`);
            });
        });

        console.log("\n=== NO MATCHES DETAILS ===");
        matchResults.noMatches.forEach((nomatch, index) => {
            console.log(`${index + 1}. ${nomatch.sourceRecord.name || 'Unknown'} (${nomatch.sourceRecord.accountNumber || 'No Account'}) - ${nomatch.reason}`);
        });

        return {
            success: true,
            matchResults: matchResults,
            summary: {
                bloomerangTotal: bloomerangRecords.length,
                visionAppraisalTotal: visionAppraisalRecords.length,
                directMatches: matchResults.stats.directMatched,
                multipleMatches: matchResults.stats.multipleMatched,
                noMatches: matchResults.stats.noMatched,
                matchRate: ((matchResults.stats.directMatched + matchResults.stats.multipleMatched) / bloomerangRecords.length * 100).toFixed(1)
            },
            message: "Direct lookup matching test completed"
        };
    },

    // PHASE 1: Fire Number → PID relationship investigation function
    analyzeFireNumberToPIDRelationships(visionAppraisalRecords) {
        console.log("=== FIRE NUMBER → PID RELATIONSHIP INVESTIGATION ===");
        console.log("Testing assumption: Multiple PIDs per Fire Number = Same Owner");

        const investigation = {
            singlePIDFireNumbers: {},
            multiPIDFireNumbers: {},
            statistics: {
                totalRecords: visionAppraisalRecords.length,
                recordsWithFireNumbers: 0,
                recordsWithoutFireNumbers: 0,
                uniqueFireNumbers: 0,
                singlePIDFireNumbers: 0,
                multiPIDFireNumbers: 0,
                totalPIDsInMultiPIDScenarios: 0,
                sameOwnerCases: 0,
                differentOwnerCases: 0,
                ambiguousCases: 0
            },
            sameOwnerExamples: [],
            differentOwnerExamples: [],
            ambiguousExamples: []
        };

        // Step 1: Group records by Fire Number and analyze PID patterns
        console.log("Step 1: Grouping records by Fire Number...");

        visionAppraisalRecords.forEach((record, index) => {
            const fireNumber = this.extractFireNumber(record);
            const pid = record.pid || record.PID || "UNKNOWN_PID";
            const ownerName = this.extractName(record) || "UNKNOWN_OWNER";

            if (fireNumber) {
                investigation.statistics.recordsWithFireNumbers++;

                // Initialize Fire Number entry
                if (!investigation.singlePIDFireNumbers[fireNumber]) {
                    investigation.singlePIDFireNumbers[fireNumber] = {
                        fireNumber: fireNumber,
                        pids: [],
                        owners: new Set(),
                        records: []
                    };
                    investigation.statistics.uniqueFireNumbers++;
                }

                const entry = investigation.singlePIDFireNumbers[fireNumber];
                entry.pids.push(pid);
                entry.owners.add(ownerName.toUpperCase().trim());
                entry.records.push({
                    index: index,
                    pid: pid,
                    ownerName: ownerName,
                    propertyLocation: record.propertyLocation || record.property_location || "UNKNOWN_LOCATION",
                    originalRecord: record
                });
            } else {
                investigation.statistics.recordsWithoutFireNumbers++;
            }
        });

        // Step 2: Classify Fire Numbers as single-PID vs multi-PID
        console.log("Step 2: Classifying single-PID vs multi-PID Fire Numbers...");

        Object.values(investigation.singlePIDFireNumbers).forEach(entry => {
            if (entry.pids.length === 1) {
                investigation.statistics.singlePIDFireNumbers++;
            } else {
                // Move to multi-PID analysis
                investigation.multiPIDFireNumbers[entry.fireNumber] = entry;
                delete investigation.singlePIDFireNumbers[entry.fireNumber];

                investigation.statistics.multiPIDFireNumbers++;
                investigation.statistics.totalPIDsInMultiPIDScenarios += entry.pids.length;
            }
        });

        // Step 3: Analyze multi-PID scenarios for owner relationships
        console.log("Step 3: Analyzing owner relationships in multi-PID scenarios...");

        Object.values(investigation.multiPIDFireNumbers).forEach(entry => {
            const uniqueOwners = Array.from(entry.owners);

            if (uniqueOwners.length === 1) {
                // Same owner assumption holds
                investigation.statistics.sameOwnerCases++;
                if (investigation.sameOwnerExamples.length < 5) {
                    investigation.sameOwnerExamples.push({
                        fireNumber: entry.fireNumber,
                        pidCount: entry.pids.length,
                        owner: uniqueOwners[0],
                        pids: entry.pids,
                        addresses: entry.records.map(r => r.propertyLocation)
                    });
                }
            } else if (uniqueOwners.length > 1) {
                // Different owners - assumption violated
                investigation.statistics.differentOwnerCases++;
                if (investigation.differentOwnerExamples.length < 5) {
                    investigation.differentOwnerExamples.push({
                        fireNumber: entry.fireNumber,
                        pidCount: entry.pids.length,
                        owners: uniqueOwners,
                        ownerPairs: entry.records.map(r => ({ pid: r.pid, owner: r.ownerName })),
                        addresses: entry.records.map(r => r.propertyLocation)
                    });
                }
            }
        });

        // Step 4: Calculate percentages and assess assumption validity
        const multiPIDScenarios = investigation.statistics.multiPIDFireNumbers;
        const sameOwnerPercentage = multiPIDScenarios > 0 ?
            (investigation.statistics.sameOwnerCases / multiPIDScenarios * 100).toFixed(1) : 0;
        const differentOwnerPercentage = multiPIDScenarios > 0 ?
            (investigation.statistics.differentOwnerCases / multiPIDScenarios * 100).toFixed(1) : 0;

        // Step 5: Generate investigation report
        console.log("\n=== INVESTIGATION RESULTS ===");
        console.log(`Total VisionAppraisal Records: ${investigation.statistics.totalRecords}`);
        console.log(`Records with Fire Numbers: ${investigation.statistics.recordsWithFireNumbers} (${(investigation.statistics.recordsWithFireNumbers/investigation.statistics.totalRecords*100).toFixed(1)}%)`);
        console.log(`Unique Fire Numbers: ${investigation.statistics.uniqueFireNumbers}`);
        console.log(`Single-PID Fire Numbers: ${investigation.statistics.singlePIDFireNumbers}`);
        console.log(`Multi-PID Fire Numbers: ${investigation.statistics.multiPIDFireNumbers}`);

        console.log("\n=== ASSUMPTION TEST RESULTS ===");
        console.log(`Same Owner Cases: ${investigation.statistics.sameOwnerCases}/${multiPIDScenarios} (${sameOwnerPercentage}%)`);
        console.log(`Different Owner Cases: ${investigation.statistics.differentOwnerCases}/${multiPIDScenarios} (${differentOwnerPercentage}%)`);

        if (sameOwnerPercentage >= 90) {
            console.log("✅ ASSUMPTION VALIDATED: Multi-PID Fire Numbers typically have same owner");
            console.log("RECOMMENDATION: Implement 'first PID only' rule for Fire Number matching");
        } else if (sameOwnerPercentage >= 70) {
            console.log("⚠️ ASSUMPTION PARTIALLY VALIDATED: Mixed scenarios exist");
            console.log("RECOMMENDATION: Implement pattern detection and systematic handling");
        } else {
            console.log("❌ ASSUMPTION VIOLATED: Significant different owner cases found");
            console.log("RECOMMENDATION: Build robust name/address matching earlier than planned");
        }

        // Display examples
        if (investigation.sameOwnerExamples.length > 0) {
            console.log("\n=== SAME OWNER EXAMPLES ===");
            investigation.sameOwnerExamples.forEach((example, i) => {
                console.log(`${i+1}. Fire Number ${example.fireNumber}: ${example.pidCount} PIDs, Owner: ${example.owner}`);
                console.log(`   PIDs: ${example.pids.join(', ')}`);
            });
        }

        if (investigation.differentOwnerExamples.length > 0) {
            console.log("\n=== DIFFERENT OWNER EXAMPLES ===");
            investigation.differentOwnerExamples.forEach((example, i) => {
                console.log(`${i+1}. Fire Number ${example.fireNumber}: ${example.pidCount} PIDs, ${example.owners.length} different owners`);
                example.ownerPairs.forEach(pair => {
                    console.log(`   PID ${pair.pid}: ${pair.owner}`);
                });
            });
        }

        return {
            success: true,
            investigation: investigation,
            recommendation: sameOwnerPercentage >= 90 ? "FIRST_PID_ONLY" :
                           sameOwnerPercentage >= 70 ? "PATTERN_DETECTION" : "EARLY_NAME_MATCHING",
            message: "Fire Number to PID relationship investigation completed"
        };
    },

    // Test function to run Fire Number → PID investigation with real VisionAppraisal data
    testRealDataInvestigation() {
        console.log("=== TESTING WITH REAL VISIONAPPRAISAL DATA ===");
        console.log("Loading VisionAppraisal data and running Fire Number → PID investigation...");

        try {
            // Check if VisionAppraisal data loading functions are available
            if (typeof testVisionAppraisalPluginV2 === 'function') {
                console.log("Using testVisionAppraisalPluginV2() to load data...");
                const visionAppraisalData = testVisionAppraisalPluginV2();

                if (visionAppraisalData && visionAppraisalData.records) {
                    console.log(`Loaded ${visionAppraisalData.records.length} VisionAppraisal records`);
                    return this.analyzeFireNumberToPIDRelationships(visionAppraisalData.records);
                } else {
                    console.log("VisionAppraisal data loading failed - trying alternative methods...");
                }
            }

            // Try alternative data loading approaches
            if (typeof window !== 'undefined' && window.loadVisionAppraisalData) {
                console.log("Using window.loadVisionAppraisalData()...");
                const visionAppraisalData = window.loadVisionAppraisalData();
                if (visionAppraisalData && visionAppraisalData.length > 0) {
                    console.log(`Loaded ${visionAppraisalData.length} VisionAppraisal records`);
                    return this.analyzeFireNumberToPIDRelationships(visionAppraisalData);
                }
            }

            // If no real data available, use expanded sample data based on CLAUDE.md findings
            console.log("Real data not available - using realistic sample based on documented findings...");
            return this.testWithRealisticSampleData();

        } catch (error) {
            console.error("Error loading VisionAppraisal data:", error);
            console.log("Falling back to realistic sample data...");
            return this.testWithRealisticSampleData();
        }
    },

    // Fallback function with realistic sample data based on CLAUDE.md documentation
    testWithRealisticSampleData() {
        console.log("=== USING REALISTIC SAMPLE DATA ===");
        console.log("Based on CLAUDE.md: 1,576 VisionAppraisal records, ~70% with Fire Numbers");

        // Create realistic sample data based on documented patterns
        const realisticSample = [
            // Single-PID Fire Numbers (majority case)
            { fireNumber: 1001, pid: "101001", ownerName: "SMITH, JOHN", propertyLocation: "1001 OCEAN AVE" },
            { fireNumber: 1002, pid: "101002", ownerName: "DOE, JANE", propertyLocation: "1002 BEACH ROAD" },
            { fireNumber: 1003, pid: "101003", ownerName: "WILSON, BOB", propertyLocation: "1003 MAIN STREET" },

            // Multi-PID, Same Owner (name variations) - test your assumption
            { fireNumber: 2001, pid: "201001", ownerName: "JOHNSON, ROBERT", propertyLocation: "2001 HARBOR VIEW" },
            { fireNumber: 2001, pid: "201002", ownerName: "JOHNSON, ROBERT & MARY", propertyLocation: "2001 HARBOR VIEW UNIT A" },

            { fireNumber: 2002, pid: "202001", ownerName: "BROWN FAMILY TRUST", propertyLocation: "2002 CLIFF DRIVE" },
            { fireNumber: 2002, pid: "202002", ownerName: "BROWN FAMILY TRUST", propertyLocation: "2002 CLIFF DRIVE UNIT B" },

            // Multi-PID, Different Owners (true multi-unit) - challenging cases
            { fireNumber: 3001, pid: "301001", ownerName: "DAVIS, SUSAN", propertyLocation: "3001 SEASIDE LANE UNIT 1" },
            { fireNumber: 3001, pid: "301002", ownerName: "MILLER, JAMES", propertyLocation: "3001 SEASIDE LANE UNIT 2" },

            { fireNumber: 3002, pid: "302001", ownerName: "CLARK, PATRICIA", propertyLocation: "3002 DUNES ROAD APT A" },
            { fireNumber: 3002, pid: "302002", ownerName: "LEWIS, MICHAEL", propertyLocation: "3002 DUNES ROAD APT B" },
            { fireNumber: 3002, pid: "302003", ownerName: "WALKER, LINDA", propertyLocation: "3002 DUNES ROAD APT C" },

            // Business entities (complex names)
            { fireNumber: 4001, pid: "401001", ownerName: "BLOCK ISLAND CONSERVANCY", propertyLocation: "4001 NATURE PRESERVE" },
            { fireNumber: 4002, pid: "401002", ownerName: "BI PROPERTIES LLC", propertyLocation: "4002 COMMERCIAL STREET" },

            // Records without Fire Numbers
            { pid: "501001", ownerName: "REMOTE PROPERTY OWNER", propertyLocation: "UNKNOWN LOCATION" },
            { pid: "501002", ownerName: "HISTORICAL SOCIETY", propertyLocation: "OLD TOWN ROAD" }
        ];

        console.log(`Created realistic sample with ${realisticSample.length} records`);
        console.log("Sample includes: single-PID, multi-PID same owner, multi-PID different owners, business entities");

        return this.analyzeFireNumberToPIDRelationships(realisticSample);
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.MatchingEngine = MatchingEngine;
}