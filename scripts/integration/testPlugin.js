// Test the VisionAppraisal plugin architecture (cache-busted version)
async function testVisionAppraisalPluginV2() {
    console.log("=== TESTING VISIONAPPRAISAL PLUGIN ARCHITECTURE ===");

    try {
        // Test plugin metadata
        console.log("Plugin name:", VisionAppraisal.name);
        console.log("Plugin fields:", VisionAppraisal.fields);
        console.log("Plugin matching keys:", VisionAppraisal.matchingKeys);

        // Test data loading
        const data = await VisionAppraisal.loadData();
        console.log(`Loaded ${data.length} records`);

        // Show sample records with detailed Fire Number extraction
        console.log("Sample records:", data.slice(0, 3));
        console.log("Detailed Fire Number analysis:");
        data.slice(0, 5).forEach((record, i) => {
            console.log(`Record ${i}: "${record.propertyLocation}" → Fire Number: ${record.fireNumber}`);
        });

        // Test Fire Number index building
        const fireIndex = VisionAppraisal.buildFireNumberIndex(data);
        const fireNumbers = Object.keys(fireIndex);
        console.log(`Built index with ${fireNumbers.length} Fire Numbers`);
        console.log("Sample Fire Numbers:", fireNumbers.slice(0, 5));

        // Test specific Fire Number lookup
        const testFireNumber = 148;
        const matches = fireIndex[testFireNumber];
        console.log(`Fire Number ${testFireNumber} matches:`, matches);

        console.log("✅ VisionAppraisal plugin working correctly");
        return { data, fireIndex, stats: { totalRecords: data.length, fireNumbers: fireNumbers.length }};

    } catch (error) {
        console.error("❌ Plugin test failed:", error);
        throw error;
    }
}

/**
 * Comprehensive Fire Number Analysis - Cross-Source Match Rate Investigation
 *
 * Analyzes Fire Number overlap between VisionAppraisal and Bloomerang data sources
 * to determine realistic match rates for Stage 1 Fire Number matching.
 */
async function analyzeFireNumberMatching() {
    console.log("=== FIRE NUMBER MATCHING ANALYSIS ===");

    try {
        // Step 1: Load VisionAppraisal data with Fire Number index
        console.log("Step 1: Loading VisionAppraisal data...");
        const visionData = await VisionAppraisal.loadData();
        const visionFireIndex = VisionAppraisal.buildFireNumberIndex(visionData);
        const visionFireNumbers = Object.keys(visionFireIndex).map(fn => parseInt(fn));

        console.log(`✓ VisionAppraisal: ${visionData.length} records, ${visionFireNumbers.length} unique Fire Numbers`);
        console.log(`✓ Coverage: ${((visionFireNumbers.length / visionData.length) * 100).toFixed(1)}% of records have Fire Numbers`);

        // Step 2: Load Bloomerang data and extract Fire Numbers
        console.log("\nStep 2: Loading Bloomerang data and extracting Fire Numbers...");
        console.log("Using proper household processing via readBloomerangWithEntities()...");
        const bloomerangResult = await readBloomerangWithEntities(false); // Don't save to Google Drive
        const bloomerangData = bloomerangResult.allEntities || []; // Get all Individual entities

        const bloomerangFireNumbers = [];
        const bloomerangFireIndex = {};
        let bloomerangWithFireNumbers = 0;
        let bloomerangWithoutFireNumbers = 0;

        bloomerangData.forEach((entity, index) => {
            // Extract Fire Number from various possible locations
            let fireNumber = null;

            // Method 1: Check additionalData.blockIslandData.fireNumber
            if (entity.additionalData?.blockIslandData?.fireNumber) {
                const fnString = entity.additionalData.blockIslandData.fireNumber.trim();
                const fnNumber = parseInt(fnString);
                if (!isNaN(fnNumber) && fnNumber > 0) {
                    fireNumber = fnNumber;
                }
            }

            // Method 2: Check locationIdentifier if it's a Fire Number
            if (!fireNumber && entity.locationIdentifier) {
                // Use object-oriented approach instead of toString().match()
                // locationIdentifier might be IdentifyingData containing FireNumber
                if (entity.locationIdentifier.identifier) {
                    // If it's IdentifyingData, check the contained identifier
                    const identifier = entity.locationIdentifier.identifier;
                    if (identifier.extractFireNumber) {
                        // If it has extractFireNumber method, use it
                        fireNumber = identifier.extractFireNumber();
                    } else if (identifier.primaryAlias) {
                        // If it's a FireNumber or other identifier, check primaryAlias
                        const term = identifier.primaryAlias.term;
                        const numeric = typeof term === 'number' ? term : parseInt(term, 10);
                        if (!isNaN(numeric) && numeric > 0 && numeric < 3500) {
                            fireNumber = numeric;
                        }
                    }
                } else if (entity.locationIdentifier.primaryAlias) {
                    // If it's directly a FireNumber or other identifier
                    const term = entity.locationIdentifier.primaryAlias.term;
                    const numeric = typeof term === 'number' ? term : parseInt(term, 10);
                    if (!isNaN(numeric) && numeric > 0 && numeric < 3500) {
                        fireNumber = numeric;
                    }
                }
            }

            // Method 3: Check if Fire Number is in contactInfo.biStreet or other locations
            if (!fireNumber && entity.contactInfo?.biStreet) {
                // Use object-oriented approach for biStreet
                const biStreet = entity.contactInfo.biStreet;
                if (biStreet.primaryAlias && biStreet.primaryAlias.term) {
                    const streetTerm = biStreet.primaryAlias.term;
                    // Use generic match method instead of toString().match()
                    if (biStreet.match && typeof streetTerm === 'string') {
                        const fnMatch = biStreet.match(/^(\d+)\s/); // Fire Number at start of street
                        if (fnMatch && parseInt(fnMatch[1]) < 3500) {
                            fireNumber = parseInt(fnMatch[1]);
                        }
                    } else if (typeof streetTerm === 'string') {
                        // Fallback: direct string matching on term
                        const fnMatch = streetTerm.match(/^(\d+)\s/);
                        if (fnMatch && parseInt(fnMatch[1]) < 3500) {
                            fireNumber = parseInt(fnMatch[1]);
                        }
                    }
                }
            }

            if (fireNumber) {
                bloomerangWithFireNumbers++;
                bloomerangFireNumbers.push(fireNumber);

                if (!bloomerangFireIndex[fireNumber]) {
                    bloomerangFireIndex[fireNumber] = [];
                }
                bloomerangFireIndex[fireNumber].push({ entity, index });
            } else {
                bloomerangWithoutFireNumbers++;
            }
        });

        const uniqueBloomerangFireNumbers = [...new Set(bloomerangFireNumbers)];

        console.log(`✓ Bloomerang: ${bloomerangData.length} entities total`);
        console.log(`✓ Fire Numbers found: ${bloomerangWithFireNumbers} entities (${((bloomerangWithFireNumbers / bloomerangData.length) * 100).toFixed(1)}%)`);
        console.log(`✓ Unique Fire Numbers: ${uniqueBloomerangFireNumbers.length}`);
        console.log(`✓ Without Fire Numbers: ${bloomerangWithoutFireNumbers} entities`);

        // Step 3: Calculate Fire Number overlap
        console.log("\nStep 3: Calculating Fire Number overlap...");

        const visionFireSet = new Set(visionFireNumbers);
        const bloomerangFireSet = new Set(uniqueBloomerangFireNumbers);

        // Find intersection (Fire Numbers present in BOTH sources)
        const intersection = [...visionFireSet].filter(fn => bloomerangFireSet.has(fn));
        const visionOnly = [...visionFireSet].filter(fn => !bloomerangFireSet.has(fn));
        const bloomerangOnly = [...bloomerangFireSet].filter(fn => !visionFireSet.has(fn));

        console.log(`✓ Fire Numbers in BOTH sources: ${intersection.length}`);
        console.log(`✓ Fire Numbers only in VisionAppraisal: ${visionOnly.length}`);
        console.log(`✓ Fire Numbers only in Bloomerang: ${bloomerangOnly.length}`);

        // Step 4: Calculate realistic match rates
        console.log("\nStep 4: Match rate analysis...");

        // Count Bloomerang entities that could potentially match VisionAppraisal via Fire Number
        let potentialMatches = 0;
        let actualMatches = 0;

        intersection.forEach(fireNumber => {
            const bloomerangEntitiesWithFN = bloomerangFireIndex[fireNumber] || [];
            const visionRecordsWithFN = visionFireIndex[fireNumber] || [];

            potentialMatches += bloomerangEntitiesWithFN.length;
            actualMatches += Math.min(bloomerangEntitiesWithFN.length, visionRecordsWithFN.length);
        });

        const bloomerangMatchRate = ((potentialMatches / bloomerangData.length) * 100).toFixed(1);
        const overallMatchEfficiency = ((actualMatches / potentialMatches) * 100).toFixed(1);

        console.log(`✓ Bloomerang entities with matching Fire Numbers: ${potentialMatches} (${bloomerangMatchRate}%)`);
        console.log(`✓ Potential Fire Number matches: ${actualMatches}`);
        console.log(`✓ Match efficiency: ${overallMatchEfficiency}%`);

        // Step 5: Sample analysis of intersection Fire Numbers
        console.log("\nStep 5: Sample intersection analysis...");
        const sampleFireNumbers = intersection.slice(0, 5);

        sampleFireNumbers.forEach(fn => {
            const bloomerangCount = (bloomerangFireIndex[fn] || []).length;
            const visionCount = (visionFireIndex[fn] || []).length;
            console.log(`Fire Number ${fn}: ${bloomerangCount} Bloomerang entities, ${visionCount} VisionAppraisal records`);
        });

        // Step 6: Analysis summary and recommendations
        console.log("\nStep 6: Analysis Summary...");
        console.log("=" .repeat(50));

        const summary = {
            visionAppraisal: {
                totalRecords: visionData.length,
                withFireNumbers: visionFireNumbers.length,
                uniqueFireNumbers: visionFireNumbers.length,
                coverage: ((visionFireNumbers.length / visionData.length) * 100).toFixed(1) + '%'
            },
            bloomerang: {
                totalEntities: bloomerangData.length,
                withFireNumbers: bloomerangWithFireNumbers,
                uniqueFireNumbers: uniqueBloomerangFireNumbers.length,
                coverage: ((bloomerangWithFireNumbers / bloomerangData.length) * 100).toFixed(1) + '%'
            },
            matching: {
                fireNumbersInBothSources: intersection.length,
                bloomerangEntitiesMatchable: potentialMatches,
                matchRateOfBloomerang: bloomerangMatchRate + '%',
                stage1Effectiveness: overallMatchEfficiency + '%'
            },
            recommendations: {
                stage1Viability: intersection.length > 50 ? "HIGH" : intersection.length > 20 ? "MEDIUM" : "LOW",
                dataQualityNeedsWork: bloomerangOnly.length > intersection.length ? "YES" : "NO",
                stage2to5Importance: ((100 - parseFloat(bloomerangMatchRate)) > 50) ? "CRITICAL" : "MODERATE"
            }
        };

        console.log("FIRE NUMBER MATCHING ANALYSIS RESULTS:");
        console.log(JSON.stringify(summary, null, 2));

        return {
            summary,
            intersectionFireNumbers: intersection,
            visionOnlyFireNumbers: visionOnly,
            bloomerangOnlyFireNumbers: bloomerangOnly,
            bloomerangFireIndex,
            visionFireIndex
        };

    } catch (error) {
        console.error("❌ Fire Number analysis failed:", error);
        throw error;
    }
}

// NOTE: Removed broken loadBloomerangEntities() function that was creating
// duplicate households by using new Map() for each row. Now using proper
// readBloomerangWithEntities() function which maintains household relationships.

// Test the Matching Engine with sample data
async function testMatchingEngine() {
    console.log("=== TESTING MATCHING ENGINE ===");

    try {
        // Load VisionAppraisal data
        const visionData = await VisionAppraisal.loadData();
        console.log(`Loaded ${visionData.length} VisionAppraisal records`);

        // Create sample Bloomerang records for testing
        const sampleBloomerang = [
            { name: "LEGAULT NICOLE", fireNumber: 148, id: "B1" },
            { name: "ONEIL ERIN", fire_number: 472, id: "B2" },
            { name: "SABBIA TRUST", fireNumber: 1099, id: "B3" },
            { name: "UNKNOWN PERSON", fireNumber: 9999, id: "B4" }, // No match
            { name: "SMITH FAMILY", id: "B5" }, // No fire number - should try name matching
            { name: "JONES RESIDENCE", id: "B6" } // No fire number - should try name matching
        ];

        console.log("Sample Bloomerang records:", sampleBloomerang);

        // Run the multi-stage matcher
        const results = MatchingEngine.runMultiStageMatcher(sampleBloomerang, visionData);

        console.log("\n=== DETAILED RESULTS ===");

        // Show clear matches - ready for automatic processing
        console.log("\n✅ CLEAR MATCHES (Automatic Processing):");
        results.clearMatches.forEach(match => {
            if (match.matchType === 'FIRE_NUMBER_DIRECT') {
                console.log(`  ${match.sourceRecord.name} (Fire# ${match.fireNumber}) → ${match.targetRecord.ownerName}`);
            } else if (match.matchType === 'NAME_CLEAR_MATCH') {
                console.log(`  ${match.sourceRecord.name} → ${match.targetRecord.ownerName} (${(match.similarity * 100).toFixed(1)}% similarity)`);
            }
        });

        // Show near matches - need manual review
        console.log("\n⚠️  NEAR MATCHES (Manual Review Needed):");
        results.nearMatches.forEach(match => {
            if (match.matchType === 'MULTIPLE_TARGETS_PER_FIRE_NUMBER') {
                console.log(`  ${match.sourceRecord.name} (Fire# ${match.fireNumber}) → ${match.targetRecords.length} properties (owner clustering needed)`);
            } else if (match.matchType === 'NAME_NEAR_MATCH') {
                console.log(`  "${match.sourceName}" → "${match.targetName}" (${(match.similarity * 100).toFixed(1)}% similarity)`);
            }
        });

        // Show summary stats
        console.log(`\n📊 SUMMARY:`);
        console.log(`  Clear matches: ${results.summary.clearMatches}`);
        console.log(`  Near matches needing review: ${results.summary.nearMatchesNeedingReview}`);
        console.log(`  No viable matches: ${results.summary.noViableMatches}`);

        console.log("\n✅ Matching engine test complete!");
        return results;

    } catch (error) {
        console.error("❌ Matching engine test failed:", error);
        throw error;
    }
}

// Test name analysis function
async function testNameAnalysis() {
    console.log("=== TESTING NAME ANALYSIS ===");

    try {
        const results = await NameAnalysis.analyzeNameFieldWords();
        console.log("✅ Name analysis complete - files saved to servers/progress/");
        return results;
    } catch (error) {
        console.error("❌ Name analysis failed:", error);
        throw error;
    }
}

// Test Bloomerang name analysis function
async function testBloomerangNameAnalysis() {
    console.log("=== TESTING BLOOMERANG NAME ANALYSIS ===");

    try {
        const results = await NameAnalysis.analyzeBloomerangNameFieldWords();
        console.log("✅ Bloomerang name analysis complete - files saved to servers/progress/");
        return results;
    } catch (error) {
        console.error("❌ Bloomerang name analysis failed:", error);
        throw error;
    }
}

// Test filtered VisionAppraisal list generation
async function testFilteredVisionAppraisalList() {
    console.log("=== TESTING FILTERED VISIONAPPRAISAL LIST GENERATION ===");

    try {
        const results = await NameAnalysis.generateFilteredVisionAppraisalList();
        console.log("✅ Filtered VisionAppraisal list generation complete - files saved to servers/progress/");
        return results;
    } catch (error) {
        console.error("❌ Filtered VisionAppraisal list generation failed:", error);
        throw error;
    }
}

// Test business entity records identification
async function testBusinessEntityRecords() {
    console.log("=== TESTING BUSINESS ENTITY RECORDS IDENTIFICATION ===");

    try {
        const results = await NameAnalysis.findBusinessEntityRecords();
        console.log("✅ Business entity records identification complete - files saved to servers/progress/");
        return results;
    } catch (error) {
        console.error("❌ Business entity records identification failed:", error);
        throw error;
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.testVisionAppraisalPluginV2 = testVisionAppraisalPluginV2;
    window.testMatchingEngine = testMatchingEngine;
    window.testNameAnalysis = testNameAnalysis;
    window.testBloomerangNameAnalysis = testBloomerangNameAnalysis;
    window.testFilteredVisionAppraisalList = testFilteredVisionAppraisalList;
    window.testBusinessEntityRecords = testBusinessEntityRecords;
}