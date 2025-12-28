// Contact Discovery Workflow
// Orchestrates multi-source data integration for business outcomes
//
// CURRENT STATUS: Basic framework complete, but name matching needs major enhancement
//
// NEXT SESSION PRIORITIES:
// 1. Implement Levenshtein distance for name matching (user has preferred algorithm)
// 2. Add data cleaning for VisionAppraisal names (remove "^#^" tags)
// 3. Create business entity normalization (Trust, LLC, Corp handling)
// 4. Build alias management system for name variations
// 5. Expected result: ~50% Bloomerang contacts should match VisionAppraisal (not 99.7%)
// 6. Develop address matching capabilities for Block Island streets

const ContactDiscovery = {

    // Main workflow: Find new prospects and enrich existing contacts
    async runContactDiscoveryWorkflow() {
        console.log("=== CONTACT DISCOVERY WORKFLOW ===");

        try {
            // Step 1: Load both data sources
            console.log("Step 1: Loading data sources...");
            const visionData = await VisionAppraisal.loadData();
            const bloomerangData = await this.loadBloomerangData();

            console.log(`Loaded ${visionData.length} VisionAppraisal records`);
            console.log(`Loaded ${bloomerangData.length} Bloomerang contacts`);

            // Step 2: Run multi-stage matching
            console.log("\nStep 2: Running multi-stage matcher...");
            const matchResults = MatchingEngine.runMultiStageMatcher(bloomerangData, visionData);

            // Step 3: Analyze results for business outcomes
            console.log("\nStep 3: Analyzing results for business outcomes...");
            const businessResults = this.analyzeForBusinessOutcomes(matchResults, visionData, bloomerangData);

            // Step 4: Generate actionable reports
            console.log("\nStep 4: Generating actionable reports...");
            this.generateReports(businessResults);

            console.log("\n✅ Contact Discovery Workflow Complete!");
            return businessResults;

        } catch (error) {
            console.error("❌ Contact Discovery Workflow failed:", error);
            throw error;
        }
    },

    // Load Bloomerang data (using existing function)
    async loadBloomerangData() {
        try {
            // Use existing Bloomerang data loading
            const rawBloomerangData = await readBloomerang();

            // Parse Bloomerang CSV data into structured contacts
            const contacts = this.parseBloomerangContacts(rawBloomerangData);
            return contacts;

        } catch (error) {
            console.error("Error loading Bloomerang data:", error);
            throw error;
        }
    },

    // Parse raw Bloomerang CSV into structured contact records
    parseBloomerangContacts(rawData) {
        if (!rawData || rawData.length < 2) {
            return [];
        }

        // Skip header row, process data rows
        const contacts = rawData.slice(1).map((row, index) => {
            // Extract key fields from Bloomerang CSV structure
            const contact = {
                id: `bloomerang_${index}`,
                name: this.extractBloomerangName(row),
                fireNumber: this.extractBloomerangFireNumber(row),
                address: this.extractBloomerangAddress(row),
                email: row[15] || '', // Adjust index based on Bloomerang CSV structure
                phone: row[16] || '', // Adjust index based on Bloomerang CSV structure
                rawData: row // Keep original for reference
            };

            return contact;
        }).filter(contact => contact.name); // Only include contacts with names

        console.log(`Parsed ${contacts.length} Bloomerang contacts`);
        return contacts;
    },

    // Extract name from Bloomerang CSV row
    extractBloomerangName(row) {
        // Common Bloomerang name patterns - adjust indices as needed
        const firstName = row[1] || '';
        const lastName = row[2] || '';
        const fullName = row[0] || '';

        if (fullName.trim()) return fullName.trim();
        if (firstName && lastName) return `${firstName} ${lastName}`.trim();
        return firstName || lastName || '';
    },

    // Extract Fire Number from Bloomerang CSV row
    extractBloomerangFireNumber(row) {
        // Look for Fire Number in various possible columns
        for (let i = 0; i < row.length; i++) {
            const field = row[i] || '';
            if (typeof field === 'string') {
                // Check if field looks like a Fire Number
                const match = field.toString().match(/^\s*(\d{1,4})\s*$/);
                if (match) {
                    const num = parseInt(match[1]);
                    if (num > 0 && num < 3500) {
                        return num;
                    }
                }
            }
        }
        return null;
    },

    // Extract address from Bloomerang CSV row
    extractBloomerangAddress(row) {
        // Look for address fields - adjust indices based on Bloomerang structure
        const address1 = row[10] || '';
        const address2 = row[11] || '';
        const city = row[12] || '';
        const state = row[13] || '';
        const zip = row[14] || '';

        const fullAddress = [address1, address2, city, state, zip]
            .filter(part => part && part.trim())
            .join(', ');

        return fullAddress || '';
    },

    // Analyze matching results for business outcomes
    analyzeForBusinessOutcomes(matchResults, visionData, bloomerangData) {
        console.log("Analyzing for business outcomes...");

        // Find new prospects: VisionAppraisal owners NOT in Bloomerang
        const matchedVisionRecords = new Set();

        // Collect all VisionAppraisal records that matched Bloomerang contacts
        matchResults.clearMatches.forEach(match => {
            if (match.targetRecord) {
                matchedVisionRecords.add(match.targetRecord.sourceIndex);
            }
        });

        matchResults.nearMatches.forEach(match => {
            if (match.targetRecord) {
                matchedVisionRecords.add(match.targetRecord.sourceIndex);
            }
            if (match.targetRecords) {
                match.targetRecords.forEach(record => {
                    matchedVisionRecords.add(record.sourceIndex);
                });
            }
        });

        // New prospects = VisionAppraisal records that didn't match any Bloomerang contact
        const newProspects = visionData.filter((record, index) =>
            !matchedVisionRecords.has(index) &&
            record.fireNumber && // Has property data
            record.ownerName.trim() // Has owner name
        );

        // Enrichment opportunities = existing Bloomerang contacts with new property data
        const enrichmentOpportunities = matchResults.clearMatches.map(match => ({
            bloomerangContact: match.sourceRecord,
            propertyData: match.targetRecord,
            confidence: match.confidence,
            matchType: match.matchType
        }));

        // Manual review items = near matches that need human judgment
        const manualReviewItems = matchResults.nearMatches.map(match => ({
            bloomerangContact: match.sourceRecord,
            potentialMatches: match.targetRecords || [match.targetRecord],
            reason: match.reason || match.matchType,
            similarity: match.similarity
        }));

        return {
            newProspects: {
                count: newProspects.length,
                records: newProspects
            },
            enrichmentOpportunities: {
                count: enrichmentOpportunities.length,
                records: enrichmentOpportunities
            },
            manualReviewItems: {
                count: manualReviewItems.length,
                records: manualReviewItems
            },
            summary: {
                totalVisionAppraisal: visionData.length,
                totalBloomerang: bloomerangData.length,
                newProspects: newProspects.length,
                enrichmentOpportunities: enrichmentOpportunities.length,
                manualReviewNeeded: manualReviewItems.length
            }
        };
    },

    // Generate actionable business reports
    generateReports(businessResults) {
        console.log("\n=== CONTACT DISCOVERY RESULTS ===");

        // Business Summary
        console.log("\n📊 BUSINESS SUMMARY:");
        console.log(`Total VisionAppraisal records: ${businessResults.summary.totalVisionAppraisal}`);
        console.log(`Total Bloomerang contacts: ${businessResults.summary.totalBloomerang}`);
        console.log(`New prospects identified: ${businessResults.summary.newProspects}`);
        console.log(`Enrichment opportunities: ${businessResults.summary.enrichmentOpportunities}`);
        console.log(`Manual review items: ${businessResults.summary.manualReviewNeeded}`);

        // New Prospects Report
        console.log("\n🎯 NEW PROSPECTS (Not in Bloomerang):");
        if (businessResults.newProspects.count > 0) {
            console.log(`Found ${businessResults.newProspects.count} new property owners:`);
            businessResults.newProspects.records.slice(0, 10).forEach(prospect => {
                console.log(`  Fire# ${prospect.fireNumber}: ${prospect.ownerName} - ${prospect.propertyLocation}`);
            });
            if (businessResults.newProspects.count > 10) {
                console.log(`  ... and ${businessResults.newProspects.count - 10} more`);
            }
        } else {
            console.log("No new prospects found");
        }

        // Data Enrichment Report
        console.log("\n📈 DATA ENRICHMENT OPPORTUNITIES:");
        if (businessResults.enrichmentOpportunities.count > 0) {
            console.log(`Found ${businessResults.enrichmentOpportunities.count} contacts that can be enhanced:`);
            businessResults.enrichmentOpportunities.records.slice(0, 5).forEach(opportunity => {
                console.log(`  ${opportunity.bloomerangContact.name} → Fire# ${opportunity.propertyData.fireNumber} (${opportunity.confidence})`);
            });
            if (businessResults.enrichmentOpportunities.count > 5) {
                console.log(`  ... and ${businessResults.enrichmentOpportunities.count - 5} more`);
            }
        } else {
            console.log("No enrichment opportunities found");
        }

        // Manual Review Report
        console.log("\n⚠️  MANUAL REVIEW NEEDED:");
        if (businessResults.manualReviewItems.count > 0) {
            console.log(`Found ${businessResults.manualReviewItems.count} items needing human review:`);
            businessResults.manualReviewItems.records.slice(0, 5).forEach(item => {
                const similarity = item.similarity ? ` (${(item.similarity * 100).toFixed(1)}%)` : '';
                console.log(`  ${item.bloomerangContact.name} → ${item.potentialMatches.length} potential matches${similarity}`);
            });
        } else {
            console.log("No items need manual review");
        }

        console.log("\n✅ Reports generated successfully!");
    },

    // Test function with sample Bloomerang data
    async testContactDiscoveryWithSampleData() {
        console.log("=== TESTING CONTACT DISCOVERY WITH SAMPLE DATA ===");

        try {
            // Load VisionAppraisal data
            const visionData = await VisionAppraisal.loadData();

            // Create realistic sample Bloomerang data
            const sampleBloomerang = [
                { id: "B1", name: "LEGAULT NICOLE", fireNumber: 148, address: "29 Cedar St, East Greenwich, RI" },
                { id: "B2", name: "ONEIL ERIN", fireNumber: 472, address: "45 Hitching Post Ln, Milford, CT" },
                { id: "B3", name: "EXISTING DONOR", fireNumber: null, address: "Unknown" }, // No Fire Number
                { id: "B4", name: "ANOTHER DONOR", fireNumber: 999, address: "Off Island" }, // Fire Number not in VisionAppraisal
            ];

            console.log("Using sample Bloomerang data:", sampleBloomerang);

            // Run matching
            const matchResults = MatchingEngine.runMultiStageMatcher(sampleBloomerang, visionData);

            // Analyze for business outcomes
            const businessResults = this.analyzeForBusinessOutcomes(matchResults, visionData, sampleBloomerang);

            // Generate reports
            this.generateReports(businessResults);

            console.log("\n✅ Contact Discovery test complete!");
            return businessResults;

        } catch (error) {
            console.error("❌ Contact Discovery test failed:", error);
            throw error;
        }
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.ContactDiscovery = ContactDiscovery;
}