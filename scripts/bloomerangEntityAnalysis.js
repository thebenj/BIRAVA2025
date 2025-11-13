/**
 * BLOOMERANG ENTITY ANALYSIS TOOL
 * ================================
 *
 * PURPOSE:
 * This tool analyzes the structure and data completeness of Bloomerang entity files
 * to understand their integration potential with VisionAppraisal entities for the
 * BIRAVA2025 contact discovery and data enrichment system.
 *
 * BUSINESS CONTEXT:
 * - Analyzes Individual and Household entity collections from Bloomerang CSV processing
 * - Provides field completeness percentages for VisionAppraisal integration planning
 * - Shows data quality metrics for 1,360 Individual entities and 426 Household entities
 * - Supports multi-stage matching algorithm development (Fire Number, Name, Address matching)
 *
 * FILE RESOURCES:
 * - Individual entities: "1s7VnmD4CZg09y-GKmfX4W6tZb2SDaJLy" (Google Drive file ID)
 * - Household entities: "1HhjM33856-jehR1xSypXyE0qFuRw26tx" (Google Drive file ID)
 *
 * USAGE:
 * 1. Load in browser console:
 *    const script = document.createElement('script');
 *    script.src = './scripts/bloomerangEntityAnalysis.js';
 *    document.head.appendChild(script);
 *
 * 2. Run analysis: runBloomerangAnalysis()
 *
 * OUTPUT:
 * - Wrapper structure analysis (metadata, entities, index)
 * - Field overlap comparison between Individual and Household entities
 * - Sample record structures with actual data
 * - Compressed field completeness templates showing percentages
 *
 * KEY FINDINGS EXAMPLE:
 * - Individual entities: 1,360 records with 100% firstName/lastName completeness
 * - Household entities: 426 records with Fire Number location identifiers
 * - Critical for VisionAppraisal matching: locationIdentifier.identifier.term field analysis
 *
 * TECHNICAL NOTES:
 * - Uses getFileContentsAPI() function (must be available in global scope)
 * - Requires Google Drive authentication via gapi.client
 * - Analyzes nested object structures with percentage compression
 * - Removes 0% completeness fields and marks empty objects as "Object empty"
 *
 * INTEGRATION CONTEXT:
 * This analysis directly supports the Fire Number matching strategy in BIRAVA2025
 * by identifying which Bloomerang entities have location identifiers for matching
 * with VisionAppraisal property records.
 *
 * @author: Generated through systematic codebase analysis for BIRAVA2025 integration
 * @date: 2025-10-14
 * @version: 2.0 (with compressed field completeness templates)
 */

async function analyzeBloomerangEntities() {
    console.log('🔍 Starting Bloomerang Entity Analysis...');

    // File IDs from the user's request (CORRECTED: Individual file not folder)
    const individualFileId = "1s7VnmD4CZg09y-GKmfX4W6tZb2SDaJLy";
    const householdFileId = "1HhjM33856-jehR1xSypXyE0qFuRw26tx";

    try {
        console.log('\n📄 Analyzing Individual Entities File...');
        const individualAnalysis = await analyzeEntityFile(individualFileId, "Individual");

        console.log('\n🏠 Analyzing Household Entities File...');
        const householdAnalysis = await analyzeEntityFile(householdFileId, "Household");

        console.log('\n📊 COMPREHENSIVE ANALYSIS REPORT');
        console.log('=====================================');

        generateComparisonReport(individualAnalysis, householdAnalysis);

        return {
            individual: individualAnalysis,
            household: householdAnalysis
        };

    } catch (error) {
        console.error('❌ Analysis failed:', error);
        throw error;
    }
}

async function analyzeEntityFile(fileId, entityType) {
    console.log(`\n🔄 Accessing ${entityType} file (ID: ${fileId})...`);

    try {
        // First attempt - expect potential failure as mentioned by user
        let response = await getFileContentsAPI(fileId);
        console.log(`✅ Successfully accessed ${entityType} file`);

        // Parse the JSON content
        const jsonData = JSON.parse(response.body);
        console.log(`📋 Parsing ${entityType} data...`);

        // Analyze the structure
        const analysis = analyzeStructure(jsonData, entityType);

        console.log(`\n📈 ${entityType} Analysis Results:`);
        console.log(`   📊 Record Count: ${analysis.recordCount}`);
        console.log(`   🔑 Field Count: ${analysis.fieldCount}`);
        console.log(`   📋 Fields: ${analysis.fields.join(', ')}`);

        return analysis;

    } catch (error) {
        console.warn(`⚠️  First attempt failed for ${entityType} file (expected), retrying...`);

        try {
            // Second attempt
            let response = await getFileContentsAPI(fileId);
            const jsonData = JSON.parse(response.body);
            const analysis = analyzeStructure(jsonData, entityType);

            console.log(`✅ ${entityType} file accessed successfully on retry`);
            return analysis;

        } catch (retryError) {
            console.error(`❌ Failed to access ${entityType} file:`, retryError);
            throw retryError;
        }
    }
}

function analyzeStructure(data, entityType) {
    console.log(`🔍 Analyzing structure of ${entityType} data...`);

    // Determine if data is array or object
    let records = [];
    if (Array.isArray(data)) {
        records = data;
    } else if (data && typeof data === 'object') {
        // Might be a single record or object with array property
        if (data.entities && Array.isArray(data.entities)) {
            records = data.entities;
        } else if (data.individuals && Array.isArray(data.individuals)) {
            records = data.individuals;
        } else if (data.households && Array.isArray(data.households)) {
            records = data.households;
        } else {
            // Single object - treat as array of one
            records = [data];
        }
    }

    const recordCount = records.length;
    console.log(`   📊 Found ${recordCount} records`);

    if (recordCount === 0) {
        return {
            entityType,
            recordCount: 0,
            fieldCount: 0,
            fields: [],
            fieldAnalysis: {},
            sampleRecords: []
        };
    }

    // Analyze field structure across all records
    const allFields = new Set();
    const fieldStats = {};

    records.forEach((record, index) => {
        if (record && typeof record === 'object') {
            Object.keys(record).forEach(field => {
                allFields.add(field);

                if (!fieldStats[field]) {
                    fieldStats[field] = {
                        nonNullCount: 0,
                        nullCount: 0,
                        types: new Set(),
                        sampleValues: []
                    };
                }

                const value = record[field];
                if (value !== null && value !== undefined && value !== '') {
                    fieldStats[field].nonNullCount++;
                    fieldStats[field].types.add(typeof value);

                    // Store sample values (first 3)
                    if (fieldStats[field].sampleValues.length < 3) {
                        fieldStats[field].sampleValues.push(value);
                    }
                } else {
                    fieldStats[field].nullCount++;
                }
            });
        }
    });

    // Calculate percentages
    const fieldAnalysis = {};
    allFields.forEach(field => {
        const stats = fieldStats[field];
        const total = stats.nonNullCount + stats.nullCount;
        fieldAnalysis[field] = {
            nonNullCount: stats.nonNullCount,
            nullCount: stats.nullCount,
            nonNullPercentage: total > 0 ? Math.round((stats.nonNullCount / total) * 100) : 0,
            types: Array.from(stats.types),
            sampleValues: stats.sampleValues
        };
    });

    return {
        entityType,
        recordCount,
        fieldCount: allFields.size,
        fields: Array.from(allFields).sort(),
        fieldAnalysis,
        sampleRecords: records.slice(0, 3) // First 3 records for inspection
    };
}

function generateComparisonReport(individualAnalysis, householdAnalysis) {
    console.log('\n📊 ENTITY COMPARISON REPORT');
    console.log('============================');

    console.log('\n📈 RECORD COUNTS:');
    console.log(`   👤 Individual Entities: ${individualAnalysis.recordCount}`);
    console.log(`   🏠 Household Entities: ${householdAnalysis.recordCount}`);
    console.log(`   📊 Total Entities: ${individualAnalysis.recordCount + householdAnalysis.recordCount}`);

    console.log('\n🔑 FIELD COUNTS:');
    console.log(`   👤 Individual Fields: ${individualAnalysis.fieldCount}`);
    console.log(`   🏠 Household Fields: ${householdAnalysis.fieldCount}`);

    // Find common fields
    const individualFields = new Set(individualAnalysis.fields);
    const householdFields = new Set(householdAnalysis.fields);
    const commonFields = Array.from(individualFields).filter(field => householdFields.has(field));
    const individualOnlyFields = Array.from(individualFields).filter(field => !householdFields.has(field));
    const householdOnlyFields = Array.from(householdFields).filter(field => !individualFields.has(field));

    console.log('\n🔗 FIELD OVERLAP ANALYSIS:');
    console.log(`   🤝 Common Fields (${commonFields.length}): ${commonFields.join(', ')}`);
    console.log(`   👤 Individual-Only Fields (${individualOnlyFields.length}): ${individualOnlyFields.join(', ')}`);
    console.log(`   🏠 Household-Only Fields (${householdOnlyFields.length}): ${householdOnlyFields.join(', ')}`);

    console.log('\n📊 DATA COMPLETENESS - INDIVIDUAL ENTITIES:');
    displayFieldCompleteness(individualAnalysis.fieldAnalysis);

    console.log('\n📊 DATA COMPLETENESS - HOUSEHOLD ENTITIES:');
    displayFieldCompleteness(householdAnalysis.fieldAnalysis);

    console.log('\n🔍 SAMPLE RECORD STRUCTURES:');
    console.log('\n👤 Sample Individual Record:');
    console.log(JSON.stringify(individualAnalysis.sampleRecords[0], null, 2));

    console.log('\n🏠 Sample Household Record:');
    console.log(JSON.stringify(householdAnalysis.sampleRecords[0], null, 2));

    // Additional detailed entity analysis
    console.log('\n🔬 DETAILED ENTITY FIELD COMPLETENESS ANALYSIS');
    console.log('='.repeat(60));

    analyzeEntityFieldCompleteness(individualAnalysis, "Individual");
    analyzeEntityFieldCompleteness(householdAnalysis, "Household");
}

function displayFieldCompleteness(fieldAnalysis) {
    // Sort fields by completeness percentage (highest first)
    const sortedFields = Object.entries(fieldAnalysis)
        .sort(([,a], [,b]) => b.nonNullPercentage - a.nonNullPercentage);

    sortedFields.forEach(([field, stats]) => {
        const completeness = stats.nonNullPercentage;
        const emoji = completeness >= 90 ? '🟢' : completeness >= 70 ? '🟡' : completeness >= 50 ? '🟠' : '🔴';
        console.log(`   ${emoji} ${field}: ${completeness}% (${stats.nonNullCount}/${stats.nonNullCount + stats.nullCount}) - ${stats.types.join('|')}`);
    });
}

/**
 * Analyzes field completeness for entity collections
 * Creates a template structure showing data completeness percentages
 *
 * @param {Object} analysisResult - Result from analyzeStructure() containing sample records
 * @param {string} entityTypeName - "Individual" or "Household" for display purposes
 *
 * OUTPUT EXAMPLE:
 * {
 *   "name": {
 *     "identifier": {
 *       "firstName": "100% (1356/1360)",
 *       "lastName": "100% (1356/1360)",
 *       "otherNames": "9% (125/1360)"  // Only 9% have middle names
 *     }
 *   },
 *   "contactInfo": "null values counted"  // Field exists but always null
 * }
 *
 * KEY FEATURES:
 * - Compresses out 0% completeness fields (removes empty fields entirely)
 * - Replaces fully-empty objects with "Object empty"
 * - Shows actual counts: "87% (1183/1360)" = 1183 records have data out of 1360 total
 * - Uses first entity as template structure, applies percentages to all fields
 */
function analyzeEntityFieldCompleteness(analysisResult, entityTypeName) {
    console.log(`\n📊 ${entityTypeName.toUpperCase()} ENTITY FIELD COMPLETENESS TEMPLATE:`);

    // Get the actual entities from the wrapper
    if (!analysisResult.sampleRecords[0] || !analysisResult.sampleRecords[0].entities) {
        console.log('   ⚠️  No entity data found for analysis');
        return;
    }

    const entitiesWrapper = analysisResult.sampleRecords[0];
    const actualEntities = Object.values(entitiesWrapper.entities);
    const totalEntities = actualEntities.length;

    console.log(`   📈 Analyzing ${totalEntities} ${entityTypeName} entities`);

    // Take the first entity as a template and replace all values with percentages
    const templateEntity = JSON.parse(JSON.stringify(actualEntities[0]));
    const completenessTemplate = createCompletenessTemplate(templateEntity, actualEntities);

    console.log(JSON.stringify(completenessTemplate, null, 2));
}

function calculateFieldCompleteness(entities, fieldPath) {
    let nonEmpty = 0;
    let total = 0;

    entities.forEach(entity => {
        const value = getNestedProperty(entity, fieldPath);
        if (value !== undefined) {
            total++;
            if (value !== null && value !== '' && value !== 0 &&
                !(Array.isArray(value) && value.length === 0) &&
                !(typeof value === 'object' && value !== null && Object.keys(value).length === 0)) {
                nonEmpty++;
            }
        }
    });

    return { nonEmpty, total };
}

function getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
}

function createCompletenessTemplate(templateEntity, allEntities) {
    return replaceValuesWithPercentages(templateEntity, allEntities, '');
}

function replaceValuesWithPercentages(obj, allEntities, currentPath) {
    if (obj === null) return "null values counted";

    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
        // Calculate percentage for this field path
        const completeness = calculateFieldCompletenessForPath(allEntities, currentPath);
        const percentage = completeness.total > 0 ?
            Math.round((completeness.nonEmpty / completeness.total) * 100) : 0;

        // Skip fields with 0% completeness (compress out empty fields)
        if (percentage === 0) {
            return undefined; // Will be removed in parent object
        }

        return `${percentage}% (${completeness.nonEmpty}/${completeness.total})`;
    }

    if (Array.isArray(obj)) {
        if (obj.length === 0) {
            const completeness = calculateFieldCompletenessForPath(allEntities, currentPath);
            const percentage = completeness.total > 0 ?
                Math.round((completeness.nonEmpty / completeness.total) * 100) : 0;

            if (percentage === 0) {
                return undefined; // Skip empty arrays
            }

            return `${percentage}% (${completeness.nonEmpty}/${completeness.total}) - array field`;
        }

        // For non-empty arrays, analyze the first element as a template
        // Fix: Use proper array indexing in path
        const arrayElementPath = currentPath ? `${currentPath}[0]` : '[0]';
        const processedElement = replaceValuesWithPercentages(obj[0], allEntities, arrayElementPath);

        if (processedElement === undefined || processedElement === "Object empty") {
            return undefined; // Skip arrays with empty elements
        }

        return [processedElement];
    }

    if (typeof obj === 'object') {
        const result = {};
        let hasAnyData = false;

        for (const key in obj) {
            const newPath = currentPath ? `${currentPath}.${key}` : key;
            const processed = replaceValuesWithPercentages(obj[key], allEntities, newPath);

            if (processed !== undefined) {
                result[key] = processed;
                hasAnyData = true;
            }
        }

        // If no fields had data, return "Object empty"
        if (!hasAnyData) {
            return "Object empty";
        }

        return result;
    }

    return obj;
}

function calculateFieldCompletenessForPath(entities, fieldPath) {
    let nonEmpty = 0;
    let total = entities.length;

    entities.forEach(entity => {
        const value = getNestedPropertyWithArraySupport(entity, fieldPath);
        if (value !== null && value !== undefined && value !== '' && value !== 0 &&
            !(Array.isArray(value) && value.length === 0) &&
            !(typeof value === 'object' && value !== null && Object.keys(value).length === 0)) {
            nonEmpty++;
        }
    });

    return { nonEmpty, total };
}

function getNestedPropertyWithArraySupport(obj, path) {
    if (!path) return obj;

    // Handle mixed paths like 'sourceMap[0].source' by processing step by step
    const parts = [];
    let currentPart = '';
    let inBracket = false;

    for (let i = 0; i < path.length; i++) {
        const char = path[i];
        if (char === '[') {
            if (currentPart) parts.push(currentPart);
            currentPart = '[';
            inBracket = true;
        } else if (char === ']') {
            currentPart += ']';
            parts.push(currentPart);
            currentPart = '';
            inBracket = false;
        } else if (char === '.' && !inBracket) {
            if (currentPart) parts.push(currentPart);
            currentPart = '';
        } else {
            currentPart += char;
        }
    }
    if (currentPart) parts.push(currentPart);

    return parts.reduce((current, part) => {
        if (current === null || current === undefined) return undefined;

        // Handle array index like '[0]'
        if (part.startsWith('[') && part.endsWith(']')) {
            const index = parseInt(part.slice(1, -1));
            return Array.isArray(current) && current[index] !== undefined ? current[index] : undefined;
        }

        // Handle regular property access
        return current[part];
    }, obj);
}

// Helper function to run the analysis
window.runBloomerangAnalysis = analyzeBloomerangEntities;

/**
 * ============================================================================
 * USAGE DOCUMENTATION & INTEGRATION NOTES
 * ============================================================================
 *
 * QUICK START:
 * 1. Authenticate with Google Drive (use VisionAppraisal buttons 1-3 to test auth)
 * 2. Load: const script = document.createElement('script');
 *          script.src = './scripts/bloomerangEntityAnalysis.js';
 *          document.head.appendChild(script);
 * 3. Run: runBloomerangAnalysis()
 *
 * INTEGRATION WITH BIRAVA2025:
 * - Use field completeness data to plan VisionAppraisal matching algorithms
 * - locationIdentifier.identifier.term completeness shows Fire Number availability
 * - name.identifier firstName/lastName completeness shows name matching potential
 * - contactInfo analysis reveals contact enrichment opportunities
 *
 * KEY INSIGHTS FROM ANALYSIS:
 * - Individual Entities: 1,360 records, 100% name completeness
 * - Household Entities: 426 records, includes nested individuals array
 * - Fire Number coverage: Use locationIdentifier.identifier.term field
 * - Contact Info: Mostly null, indicates enrichment opportunity from VisionAppraisal
 *
 * FIELD COMPLETENESS INTERPRETATION:
 * - "100% (1356/1360)" = 1356 records have data, 4 records missing this field
 * - "9% (125/1360)" = Only 125 records have otherNames (middle names), most don't
 * - "Object empty" = Structure exists but no nested fields have data
 * - "null values counted" = Field exists but is intentionally null in all records
 *
 * MAINTENANCE NOTES:
 * - File IDs may change if Bloomerang data is reprocessed
 * - Entity counts (1,360 Individual, 426 Household) reflect current dataset
 * - Analysis depends on getFileContentsAPI() and Google Drive authentication
 * - Template compression logic removes 0% fields to focus on available data
 *
 * VERSION HISTORY:
 * - v1.0: Basic structure analysis
 * - v2.0: Added compressed field completeness templates
 *
 * @created: 2025-10-14
 * @context: BIRAVA2025 VisionAppraisal integration planning
 */

console.log('🚀 Bloomerang Entity Analysis Tool Loaded');
console.log('📋 To run analysis, execute: runBloomerangAnalysis()');
console.log('⚡ Make sure you are authenticated with Google Drive first!');
console.log('📖 See file header documentation for detailed usage and integration notes');