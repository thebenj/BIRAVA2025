/**
 * Name Analysis for Entity Matching
 *
 * Functions to analyze and study Individual entity names from both VisionAppraisal and Bloomerang
 * to understand name structures before building the fundamental name-to-name matching algorithm.
 */

/**
 * Analyze Individual entity names from VisionAppraisal entities
 * Loads data from Google Drive file and extracts name patterns
 */
async function analyzeVisionAppraisalEntityNames() {
    console.log("=== ANALYZING VISIONAPPRAISAL INDIVIDUAL ENTITY NAMES ===");

    try {
        // Load VisionAppraisal entities from Google Drive (File ID: 19cgccMYNBboL07CmMP-5hNNGwEUBXgCI)
        const response = await gapi.client.drive.files.get({
            fileId: '19cgccMYNBboL07CmMP-5hNNGwEUBXgCI',
            alt: 'media'
        });

        // Use recursive deserialization if available
        let fileData;
        if (typeof deserializeWithTypes === 'function') {
            console.log("🔄 Using recursive deserialization to restore class constructors...");
            fileData = deserializeWithTypes(response.body);
        } else {
            console.log("⚠️ Falling back to JSON.parse (classes will be plain objects)");
            fileData = JSON.parse(response.body);
        }

        console.log(`✅ Loaded ${fileData.entities ? fileData.entities.length : 'unknown'} VisionAppraisal entities`);

        // Extract Individual entities and analyze their names
        const entities = fileData.entities || fileData || [];

        console.log(`📋 Sample entity structure:`, entities[0]);

        const individualEntities = entities.filter(entity =>
            entity.type === 'Individual' ||
            (entity.constructor && entity.constructor.name === 'Individual') ||
            (typeof entity === 'object' && entity !== null &&
             ((entity.type && entity.type === 'Individual') ||
              (entity.constructor && typeof entity.constructor === 'object' && entity.constructor.name === 'Individual')))
        );

        console.log(`📊 Found ${individualEntities.length} Individual entities out of ${entities.length} total entities`);

        const nameAnalysis = {
            totalIndividuals: individualEntities.length,
            namePatterns: {},
            nameStructures: [],
            sampleNames: []
        };

        // Analyze first 50 Individual entities
        const sampleSize = Math.min(50, individualEntities.length);
        console.log(`🔍 Analyzing first ${sampleSize} Individual entities...`);

        for (let i = 0; i < sampleSize; i++) {
            const entity = individualEntities[i];
            const nameInfo = extractNameFromEntity(entity);

            nameAnalysis.nameStructures.push({
                index: i,
                rawName: nameInfo.rawName,
                cleanedName: nameInfo.cleanedName,
                nameSource: nameInfo.source,
                entityType: entity.type || entity.constructor?.name || 'Unknown'
            });

            // Keep first 10 as samples
            if (nameAnalysis.sampleNames.length < 10) {
                nameAnalysis.sampleNames.push(nameInfo.cleanedName || nameInfo.rawName || 'UNNAMED');
            }

            // Analyze name patterns
            const name = nameInfo.cleanedName || nameInfo.rawName || '';
            if (name) {
                // Detect common patterns
                if (name.includes(',')) {
                    nameAnalysis.namePatterns['comma_separated'] = (nameAnalysis.namePatterns['comma_separated'] || 0) + 1;
                }
                if (name.includes('&')) {
                    nameAnalysis.namePatterns['ampersand_multiple'] = (nameAnalysis.namePatterns['ampersand_multiple'] || 0) + 1;
                }
                if (name.includes('TRUST')) {
                    nameAnalysis.namePatterns['trust_entity'] = (nameAnalysis.namePatterns['trust_entity'] || 0) + 1;
                }
                if (name.includes('LLC') || name.includes('CORP') || name.includes('INC')) {
                    nameAnalysis.namePatterns['business_entity'] = (nameAnalysis.namePatterns['business_entity'] || 0) + 1;
                }
                if (/^[A-Z]+,\s*[A-Z\s]+$/.test(name)) {
                    nameAnalysis.namePatterns['lastname_firstname'] = (nameAnalysis.namePatterns['lastname_firstname'] || 0) + 1;
                }
            }
        }

        console.log("📈 VisionAppraisal Individual Name Analysis Results:");
        console.log(`   Total Individual entities: ${nameAnalysis.totalIndividuals}`);
        console.log(`   Analyzed sample: ${sampleSize}`);
        console.log(`   Name patterns found:`, nameAnalysis.namePatterns);
        console.log(`   Sample names:`, nameAnalysis.sampleNames);
        console.log(`   Full structures:`, nameAnalysis.nameStructures.slice(0, 5)); // Show first 5

        return nameAnalysis;

    } catch (error) {
        console.error("❌ Error analyzing VisionAppraisal entity names:", error);
        return null;
    }
}

/**
 * Analyze Individual entity names from Bloomerang entities
 * Loads data from Google Drive file and extracts name patterns
 */
async function analyzeBloomerangEntityNames() {
    console.log("=== ANALYZING BLOOMERANG INDIVIDUAL ENTITY NAMES ===");

    try {
        // Load Bloomerang entities from Google Drive (File ID: 1yaH623Iyfyzbga18DsSG_deOGPaenxVS)
        const response = await gapi.client.drive.files.get({
            fileId: '1yaH623Iyfyzbga18DsSG_deOGPaenxVS',
            alt: 'media'
        });

        // Use recursive deserialization if available
        let fileData;
        if (typeof deserializeWithTypes === 'function') {
            console.log("🔄 Using recursive deserialization to restore class constructors...");
            fileData = deserializeWithTypes(response.body);
        } else {
            console.log("⚠️ Falling back to JSON.parse (classes will be plain objects)");
            fileData = JSON.parse(response.body);
        }

        console.log(`✅ Loaded Bloomerang entities`);

        // Extract Individual entities and analyze their names
        const entities = fileData.allEntities || fileData.entities || fileData || [];

        console.log(`📋 Bloomerang data structure:`, typeof entities, Array.isArray(entities) ? 'is array' : 'not array');
        if (Array.isArray(entities) && entities.length > 0) {
            console.log(`📋 Sample Bloomerang entity:`, entities[0]);
        }

        // Handle case where entities might not be an array
        if (!Array.isArray(entities)) {
            console.log(`🔍 Entities is not an array, attempting to extract array...`);
            console.log(`📋 Available properties:`, Object.keys(entities));
            return null;
        }

        const individualEntities = entities.filter(entity =>
            entity.type === 'Individual' ||
            (entity.constructor && entity.constructor.name === 'Individual') ||
            (typeof entity === 'object' && entity !== null &&
             ((entity.type && entity.type === 'Individual') ||
              (entity.constructor && typeof entity.constructor === 'object' && entity.constructor.name === 'Individual')))
        );

        console.log(`📊 Found ${individualEntities.length} Individual entities out of ${entities.length} total entities`);

        const nameAnalysis = {
            totalIndividuals: individualEntities.length,
            namePatterns: {},
            nameStructures: [],
            sampleNames: []
        };

        // Analyze first 50 Individual entities
        const sampleSize = Math.min(50, individualEntities.length);
        console.log(`🔍 Analyzing first ${sampleSize} Individual entities...`);

        for (let i = 0; i < sampleSize; i++) {
            const entity = individualEntities[i];
            const nameInfo = extractNameFromEntity(entity);

            nameAnalysis.nameStructures.push({
                index: i,
                rawName: nameInfo.rawName,
                cleanedName: nameInfo.cleanedName,
                nameSource: nameInfo.source,
                entityType: entity.type || entity.constructor?.name || 'Unknown'
            });

            // Keep first 10 as samples
            if (nameAnalysis.sampleNames.length < 10) {
                nameAnalysis.sampleNames.push(nameInfo.cleanedName || nameInfo.rawName || 'UNNAMED');
            }

            // Analyze name patterns
            const name = nameInfo.cleanedName || nameInfo.rawName || '';
            if (name) {
                // Detect common patterns
                if (name.includes(',')) {
                    nameAnalysis.namePatterns['comma_separated'] = (nameAnalysis.namePatterns['comma_separated'] || 0) + 1;
                }
                if (name.includes('&')) {
                    nameAnalysis.namePatterns['ampersand_multiple'] = (nameAnalysis.namePatterns['ampersand_multiple'] || 0) + 1;
                }
                if (name.includes('TRUST')) {
                    nameAnalysis.namePatterns['trust_entity'] = (nameAnalysis.namePatterns['trust_entity'] || 0) + 1;
                }
                if (name.includes('LLC') || name.includes('CORP') || name.includes('INC')) {
                    nameAnalysis.namePatterns['business_entity'] = (nameAnalysis.namePatterns['business_entity'] || 0) + 1;
                }
                if (/^[A-Z\s]+$/.test(name) && !name.includes(',')) {
                    nameAnalysis.namePatterns['firstname_lastname'] = (nameAnalysis.namePatterns['firstname_lastname'] || 0) + 1;
                }
            }
        }

        console.log("📈 Bloomerang Individual Name Analysis Results:");
        console.log(`   Total Individual entities: ${nameAnalysis.totalIndividuals}`);
        console.log(`   Analyzed sample: ${sampleSize}`);
        console.log(`   Name patterns found:`, nameAnalysis.namePatterns);
        console.log(`   Sample names:`, nameAnalysis.sampleNames);
        console.log(`   Full structures:`, nameAnalysis.nameStructures.slice(0, 5)); // Show first 5

        return nameAnalysis;

    } catch (error) {
        console.error("❌ Error analyzing Bloomerang entity names:", error);
        return null;
    }
}

/**
 * Extract name information from an entity object
 * Handles the complex entity.name structure (IdentifyingData -> ComplexIdentifiers -> AttributedTerm)
 */
function extractNameFromEntity(entity) {
    const nameInfo = {
        rawName: null,
        cleanedName: null,
        source: 'unknown'
    };

    // Method 1: entity.name.identifier.primaryAlias.term (full structure)
    if (entity.name && entity.name.identifier && entity.name.identifier.primaryAlias && entity.name.identifier.primaryAlias.term) {
        nameInfo.rawName = entity.name.identifier.primaryAlias.term;
        nameInfo.source = 'primaryAlias.term';
    }
    // Method 2: entity.name.identifier.term (simplified structure)
    else if (entity.name && entity.name.identifier && entity.name.identifier.term) {
        nameInfo.rawName = entity.name.identifier.term;
        nameInfo.source = 'identifier.term';
    }
    // Method 3: Direct name field (fallback)
    else if (entity.name && typeof entity.name === 'string') {
        nameInfo.rawName = entity.name;
        nameInfo.source = 'direct_string';
    }
    // Method 4: Check if name is direct AttributedTerm
    else if (entity.name && entity.name.term) {
        nameInfo.rawName = entity.name.term;
        nameInfo.source = 'attributed_term';
    }

    // Clean VisionAppraisal tags if present
    if (nameInfo.rawName && typeof cleanVisionAppraisalTags === 'function') {
        nameInfo.cleanedName = cleanVisionAppraisalTags(nameInfo.rawName);
    } else {
        nameInfo.cleanedName = nameInfo.rawName;
    }

    return nameInfo;
}

/**
 * Compare both VisionAppraisal and Bloomerang Individual entity names
 * Run both analyses and compare patterns
 */
async function compareEntityNamePatterns() {
    console.log("=== COMPARING ENTITY NAME PATTERNS ACROSS SOURCES ===");

    const visionAnalysis = await analyzeVisionAppraisalEntityNames();
    const bloomerangAnalysis = await analyzeBloomerangEntityNames();

    if (!visionAnalysis || !bloomerangAnalysis) {
        console.error("❌ Could not complete both analyses");
        return;
    }

    console.log("\n📊 COMPARISON SUMMARY:");
    console.log(`VisionAppraisal Individuals: ${visionAnalysis.totalIndividuals}`);
    console.log(`Bloomerang Individuals: ${bloomerangAnalysis.totalIndividuals}`);

    console.log("\n🔍 PATTERN COMPARISON:");
    const allPatterns = new Set([...Object.keys(visionAnalysis.namePatterns), ...Object.keys(bloomerangAnalysis.namePatterns)]);

    allPatterns.forEach(pattern => {
        const visionCount = visionAnalysis.namePatterns[pattern] || 0;
        const bloomerangCount = bloomerangAnalysis.namePatterns[pattern] || 0;
        console.log(`   ${pattern}: VisionAppraisal=${visionCount}, Bloomerang=${bloomerangCount}`);
    });

    return {
        visionAppraisal: visionAnalysis,
        bloomerang: bloomerangAnalysis
    };
}

/**
 * Test function to run complete entity name analysis
 */
async function testEntityNameAnalysis() {
    console.log("=== ENTITY NAME ANALYSIS TEST ===");

    try {
        const results = await compareEntityNamePatterns();
        console.log("✅ Entity name analysis complete");
        return results;
    } catch (error) {
        console.error("❌ Entity name analysis failed:", error);
        return null;
    }
}

// Make functions available globally
if (typeof window !== 'undefined') {
    window.analyzeVisionAppraisalEntityNames = analyzeVisionAppraisalEntityNames;
    window.analyzeBloomerangEntityNames = analyzeBloomerangEntityNames;
    window.compareEntityNamePatterns = compareEntityNamePatterns;
    window.testEntityNameAnalysis = testEntityNameAnalysis;
    window.extractNameFromEntity = extractNameFromEntity;
}