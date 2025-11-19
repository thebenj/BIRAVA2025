/**
 * Secondary Address Analysis Test
 * Analyzes VisionAppraisal entity secondary addresses for C/O and business term patterns
 *
 * Created: 2025-11-18
 * Purpose: Identify and categorize secondary address patterns to resolve legal construct name contamination
 */

async function analyzeSecondaryAddressPatterns() {
    console.log("🔍 Starting VisionAppraisal Secondary Address Analysis...");

    try {
        // Load VisionAppraisal entities from Google Drive
        console.log("📥 Loading VisionAppraisal entities...");
        const response = await gapi.client.drive.files.get({
            fileId: '19cgccMYNBboL07CmMP-5hNNGwEUBXgCI', // VisionAppraisal_ParsedEntities.json
            alt: 'media'
        });

        const data = JSON.parse(response.body);
        const entities = data.entities || data;
        console.log(`📊 Loaded ${entities.length} entities`);

        // Business terms for detection
        const businessTerms = [
            'LLC', 'INC', 'CORP', 'TRUST', 'COMPANY', 'CO', 'LTD', 'PARTNERSHIP',
            'ASSOCIATES', 'GROUP', 'ENTERPRISES', 'FOUNDATION', 'ORGANIZATION',
            'TRUSTEE', 'ESTATE', 'PROPERTIES', 'MANAGEMENT', 'HOLDINGS', 'REALTY',
            'FINANCIAL', 'SERVICES', 'INVESTMENTS', 'DEVELOPMENT', 'BUILDERS'
        ];

        // Helper functions
        function hasBusinessTerm(text) {
            const upperText = text.toUpperCase();
            return businessTerms.some(term => new RegExp(`\\b${term}\\b`).test(upperText));
        }

        function containsCO(text) {
            // Match C/O, C\O, C-O, CARE OF - all must be complete words with trailing space
            return /\b(C[\/\\-]O\b|CARE\s+OF)\s/i.test(text);
        }

        function beginsWithNumberOrPO(text) {
            const trimmed = text.trim().toUpperCase();
            // Check if starts with number
            if (/^\d/.test(trimmed)) return true;

            // NEW: Check if starts with spelled-out numbers 1-10 as complete words
            const spelledNumbers = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN'];
            if (spelledNumbers.some(num => new RegExp(`^${num}\\s`).test(trimmed))) return true;

            // ORIGINAL: Check if starts with PO or P.O. variations
            // NEW: Added 'P.O' (missing second period) and 'BOX ', 'POBOX ' to PO variations
            if (trimmed.startsWith('PO ') || trimmed.startsWith('P.O.') || trimmed.startsWith('P.O ') ||
                trimmed.startsWith('PO.') || trimmed.startsWith('P O ') ||
                trimmed.startsWith('BOX ') || trimmed.startsWith('POBOX ')) return true;

            // NEW: Check if starts with Block Island street name using existing utility function
            // If it's a Block Island street, treat as passing neither criteria
            if (typeof findBlockIslandStreetMatch !== 'undefined') {
                const matchedStreet = findBlockIslandStreetMatch([trimmed]);
                if (matchedStreet) return true; // Treat as "starts with address" = passes neither
            }

            return false;
        }

        // Analysis containers
        const fourPartAnalysis = {
            groupA: [], // passes both a) and b)
            groupB: [], // passes a) but not b)
            groupC: [], // passes b) but not a)
            groupD: []  // passes neither
        };

        const threePartAnalysis = [];

        // Process each entity
        entities.forEach((entity, index) => {
            // Get secondary addresses - note: it's 'secondaryAddress' (singular) not 'secondaryAddresses'
            const secondaryAddresses = entity.contactInfo?.secondaryAddress || [];

            secondaryAddresses.forEach((secAddr, secIndex) => {
                // Get original string from the Address object structure
                // Based on documentation: Address has originalAddress property
                let originalString = '';

                // Try different ways to get the original string
                if (secAddr.originalAddress?.term) {
                    originalString = secAddr.originalAddress.term;
                } else if (secAddr.primaryAlias?.term) {
                    originalString = secAddr.primaryAlias.term;
                } else if (secAddr.street?.term) {
                    originalString = secAddr.street.term;
                } else if (typeof secAddr.street === 'string') {
                    originalString = secAddr.street;
                }

                if (!originalString) return;

                // Split on "::#^#::" then on ":^#^:" to get all parts in flat array
                // ORIGINAL: const parts = originalString.split('::#^#::');
                const primaryParts = originalString.split('::#^#::');
                const parts = primaryParts.flatMap(part => part.split(':^#^:'));

                // ORIGINAL: if (parts.length === 4) {
                if (parts.length === 4) {
                    // Four part analysis
                    const firstPart = parts[0].trim();

                    // Test criteria
                    const passesA = hasBusinessTerm(firstPart) || containsCO(firstPart);
                    const passesB = !beginsWithNumberOrPO(firstPart);

                    const entityInfo = {
                        entityIndex: index,
                        entityType: entity.__type,
                        entityName: entity.name?.completeName || entity.name?.term || 'Unknown',
                        secAddressIndex: secIndex,
                        originalString,
                        firstPart,
                        allParts: parts,
                        passesA,
                        passesB
                    };

                    if (passesA && passesB) {
                        fourPartAnalysis.groupA.push(entityInfo);
                    } else if (passesA && !passesB) {
                        fourPartAnalysis.groupB.push(entityInfo);
                    } else if (!passesA && passesB) {
                        fourPartAnalysis.groupC.push(entityInfo);
                    } else {
                        fourPartAnalysis.groupD.push(entityInfo);
                    }
                // ORIGINAL: } else if (parts.length === 3) {
                } else if (parts.length === 3) {
                    // Three part analysis
                    const firstPart = parts[0].trim();
                    const hasBusinessOrCO = hasBusinessTerm(firstPart) || containsCO(firstPart);
                    const doesNotBeginWithNumOrPO = !beginsWithNumberOrPO(firstPart);

                    if (hasBusinessOrCO || doesNotBeginWithNumOrPO) {
                        threePartAnalysis.push({
                            entityIndex: index,
                            entityType: entity.__type,
                            entityName: entity.name?.completeName || entity.name?.term || 'Unknown',
                            secAddressIndex: secIndex,
                            originalString,
                            firstPart,
                            allParts: parts,
                            hasBusinessOrCO,
                            doesNotBeginWithNumOrPO
                        });
                    }
                }
            });
        });

        // Display results
        console.log("\n" + "=".repeat(80));
        console.log("📊 FOUR-PART SECONDARY ADDRESS ANALYSIS RESULTS");
        console.log("=".repeat(80));

        console.log(`\n🟢 GROUP A: Has Business/C-O AND does NOT begin with Number/PO - ${fourPartAnalysis.groupA.length} items`);
        console.log("First parts:");
        fourPartAnalysis.groupA.forEach((item, i) => {
            console.log(`  ${i+1}. "${item.firstPart}" (Entity: ${item.entityName})`);
        });

        console.log(`\n🟡 GROUP B: Has Business/C-O BUT begins with Number/PO - ${fourPartAnalysis.groupB.length} items`);
        console.log("First parts:");
        fourPartAnalysis.groupB.forEach((item, i) => {
            console.log(`  ${i+1}. "${item.firstPart}" (Entity: ${item.entityName})`);
        });

        console.log(`\n🔵 GROUP C: No Business/C-O BUT does NOT begin with Number/PO - ${fourPartAnalysis.groupC.length} items`);
        console.log("First parts:");
        fourPartAnalysis.groupC.forEach((item, i) => {
            console.log(`  ${i+1}. "${item.firstPart}" (Entity: ${item.entityName})`);
        });

        console.log(`\n🔴 GROUP D: Passes neither criteria - ${fourPartAnalysis.groupD.length} items`);
        console.log("First parts:");
        fourPartAnalysis.groupD.forEach((item, i) => {
            console.log(`  ${i+1}. "${item.firstPart}" (Entity: ${item.entityName})`);
        });

        console.log("\n" + "=".repeat(80));
        console.log("📊 THREE-PART SECONDARY ADDRESS ANALYSIS RESULTS");
        console.log("=".repeat(80));

        console.log(`\n🟦 THREE-PART GROUP: Has Business/C-O OR does not begin with Number/PO - ${threePartAnalysis.length} items`);
        console.log("First parts:");
        threePartAnalysis.forEach((item, i) => {
            console.log(`  ${i+1}. "${item.firstPart}" (Business/C-O: ${item.hasBusinessOrCO}, Not Num/PO: ${item.doesNotBeginWithNumOrPO}) (Entity: ${item.entityName})`);
        });

        // Summary statistics
        const totalFourPart = fourPartAnalysis.groupA.length + fourPartAnalysis.groupB.length +
                             fourPartAnalysis.groupC.length + fourPartAnalysis.groupD.length;

        console.log("\n" + "=".repeat(80));
        console.log("📈 SUMMARY STATISTICS");
        console.log("=".repeat(80));
        console.log(`Total entities analyzed: ${entities.length}`);
        console.log(`Four-part secondary addresses: ${totalFourPart}`);
        console.log(`Three-part secondary addresses: ${threePartAnalysis.length}`);
        console.log(`\nFour-part breakdown:`);
        console.log(`  Group A (Business+Valid): ${fourPartAnalysis.groupA.length}`);
        console.log(`  Group B (Business+Invalid): ${fourPartAnalysis.groupB.length}`);
        console.log(`  Group C (Valid+NoBusiness): ${fourPartAnalysis.groupC.length}`);
        console.log(`  Group D (Invalid+NoBusiness): ${fourPartAnalysis.groupD.length}`);

        // Return data for further analysis if needed
        return {
            fourPart: fourPartAnalysis,
            threePart: threePartAnalysis,
            summary: {
                totalEntities: entities.length,
                fourPartTotal: totalFourPart,
                threePartTotal: threePartAnalysis.length
            }
        };

    } catch (error) {
        console.error("❌ Error in secondary address analysis:", error);
        return null;
    }
}

// Make function globally available
if (typeof window !== 'undefined') {
    window.analyzeSecondaryAddressPatterns = analyzeSecondaryAddressPatterns;
}