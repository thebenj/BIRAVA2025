/**
 * COMPREHENSIVE ENTITY PROPERTY ANALYSIS
 * ======================================
 *
 * PURPOSE: Generate detailed property-by-entity-type tables for VisionAppraisal and Bloomerang entities
 * CREATED: 2025-11-23
 * AUTHOR: Claude Code AI
 *
 * USAGE:
 * 1. Load entities into memory using "🚀 Load All Entities Into Memory" button
 * 2. Copy and paste this entire file into browser console
 * 3. Results will be displayed as formatted tables
 *
 * WHAT THIS ANALYZES:
 * - Object types for each property (name, locationIdentifier, accountNumber, contactInfo, etc.)
 * - Property structure differences between VisionAppraisal and Bloomerang entities
 * - Entity-type specific variations (Individual vs AggregateHousehold vs Business vs LegalConstruct)
 *
 * OUTPUT:
 * - Detailed tables showing object types by entity type and data source
 * - Structural inconsistency identification
 * - Access pattern documentation
 */

console.log('🔬 COMPREHENSIVE ENTITY PROPERTY ANALYSIS');
console.log('==========================================');
console.log('Purpose: Generate property-by-entity-type tables for structural standardization');
console.log('');

// Check if entities are loaded
if (!window.workingLoadedEntities || workingLoadedEntities.status !== 'loaded') {
    console.log('❌ Entities not loaded. Please click "🚀 Load All Entities Into Memory" button first');
    throw new Error('Entities must be loaded first');
}

console.log('✅ Entities loaded, starting comprehensive analysis...\n');

/**
 * Get sample entities by type from each data source
 */
function getSampleEntitiesByType(source) {
    const samples = {};

    if (source === 'visionAppraisal') {
        const entities = workingLoadedEntities.visionAppraisal.entities;

        // Group by entity type using type property
        entities.forEach(entity => {
            const type = entity.type || 'Unknown';
            if (!samples[type]) samples[type] = [];
            if (samples[type].length < 3) samples[type].push(entity);
        });

    } else if (source === 'bloomerang') {
        // Bloomerang has separate collections, but we need to extract actual entity types within each collection
        const collections = ['individuals', 'households', 'nonhuman'];

        collections.forEach(collectionName => {
            if (workingLoadedEntities.bloomerang[collectionName] && workingLoadedEntities.bloomerang[collectionName].entities) {
                const entities = Object.values(workingLoadedEntities.bloomerang[collectionName].entities);

                entities.forEach(entity => {
                    // Use the entity's type property if available, otherwise use collection name as fallback
                    const entityType = entity.type || collectionName;

                    if (!samples[entityType]) samples[entityType] = [];
                    if (samples[entityType].length < 3) {
                        // Add collection info for debugging
                        const entityWithCollection = { ...entity, _sourceCollection: collectionName };
                        samples[entityType].push(entityWithCollection);
                    }
                });
            }
        });
    }

    return samples;
}

/**
 * Analyze object type for a property
 */
function analyzePropertyType(entity, propertyName) {
    const property = entity[propertyName];

    if (property === null) return 'null';
    if (property === undefined) return 'undefined';
    if (property === false) return 'false (boolean)';
    if (property === true) return 'true (boolean)';

    const type = typeof property;
    if (type !== 'object') return type;

    // For objects, get more details
    const keys = Object.keys(property);

    // Special handling for specific object patterns
    if (property.type) {
        return `${property.type} object`;
    } else if (keys.includes('type') && keys.includes('identifier')) {
        return 'IdentifyingData wrapper';
    } else if (keys.includes('firstName') && keys.includes('lastName')) {
        return 'IndividualName object';
    } else if (keys.includes('term') && keys.includes('fieldName')) {
        return 'AttributedTerm object';
    } else {
        return `object (${keys.length} keys: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''})`;
    }
}

/**
 * Get access patterns for a property
 */
function getAccessPatterns(entity, propertyName) {
    const property = entity[propertyName];
    const patterns = [];

    if (property && typeof property === 'object') {
        // Test common access patterns
        if (property.firstName !== undefined) patterns.push(`.firstName: "${property.firstName}"`);
        if (property.lastName !== undefined) patterns.push(`.lastName: "${property.lastName}"`);
        if (property.term !== undefined) patterns.push(`.term: "${String(property.term).substring(0, 30)}${String(property.term).length > 30 ? '...' : ''}"`);
        if (property.identifier !== undefined) {
            if (property.identifier.firstName) patterns.push(`.identifier.firstName: "${property.identifier.firstName}"`);
            if (property.identifier.term) patterns.push(`.identifier.term: "${String(property.identifier.term).substring(0, 30)}${String(property.identifier.term).length > 30 ? '...' : ''}"`);
        }
        if (property.primaryAlias !== undefined) patterns.push(`.primaryAlias: [object]`);

        // For simple wrapper objects
        if (Object.keys(property).length <= 3 && !patterns.length) {
            patterns.push(`direct value: ${JSON.stringify(property).substring(0, 50)}...`);
        }
    } else if (property !== null && property !== undefined) {
        patterns.push(`direct value: ${property}`);
    }

    return patterns.length ? patterns : ['no accessible patterns'];
}

/**
 * Get a sample value for CSV output
 */
function getSampleValue(entity, propertyName) {
    const property = entity[propertyName];

    if (property === null) return 'null';
    if (property === undefined) return 'undefined';
    if (property === false) return 'false';
    if (property === true) return 'true';

    if (typeof property === 'object') {
        return JSON.stringify(property).substring(0, 100) + (JSON.stringify(property).length > 100 ? '...' : '');
    }

    return String(property).substring(0, 100);
}

// Get samples from both sources
console.log('📊 GATHERING ENTITY SAMPLES BY TYPE...');
const vaSamples = getSampleEntitiesByType('visionAppraisal');
const bloomSamples = getSampleEntitiesByType('bloomerang');

console.log('\n🏢 VisionAppraisal Entity Types Found:');
Object.keys(vaSamples).forEach(type => {
    console.log(`  ${type}: ${vaSamples[type].length} samples`);
});

console.log('\n🏠 Bloomerang Entity Types Found:');
Object.keys(bloomSamples).forEach(type => {
    console.log(`  ${type}: ${bloomSamples[type].length} samples`);
});

// Core properties to analyze
const coreProperties = ['name', 'locationIdentifier', 'accountNumber', 'contactInfo', 'otherInfo', 'legacyInfo'];

console.log('\n📋 PROPERTY-BY-ENTITY-TYPE ANALYSIS TABLES');
console.log('==========================================\n');

// Collect all data for CSV output
const csvData = [];
csvData.push(['Property', 'Entity Type', 'Data Source', 'Source Collection', 'Object Type', 'Access Patterns', 'Sample Value']);

// Generate data for each property
coreProperties.forEach(propertyName => {
    console.log(`\n### ANALYZING ${propertyName.toUpperCase()} PROPERTY`);

    // Get all entity types from both sources
    const allEntityTypes = new Set([...Object.keys(vaSamples), ...Object.keys(bloomSamples)]);

    allEntityTypes.forEach(entityType => {
        // VisionAppraisal data
        const vaEntity = vaSamples[entityType] ? vaSamples[entityType][0] : null;
        if (vaEntity) {
            const vaType = analyzePropertyType(vaEntity, propertyName);
            const vaPatterns = getAccessPatterns(vaEntity, propertyName).join('; ');
            const vaSampleValue = getSampleValue(vaEntity, propertyName);
            csvData.push([propertyName, entityType, 'VisionAppraisal', 'single_collection', vaType, vaPatterns, vaSampleValue]);
        }

        // Bloomerang data
        const bloomEntity = bloomSamples[entityType] ? bloomSamples[entityType][0] : null;
        if (bloomEntity) {
            const bloomType = analyzePropertyType(bloomEntity, propertyName);
            const bloomPatterns = getAccessPatterns(bloomEntity, propertyName).join('; ');
            const bloomSampleValue = getSampleValue(bloomEntity, propertyName);
            const sourceCollection = bloomEntity._sourceCollection || 'unknown';
            csvData.push([propertyName, entityType, 'Bloomerang', sourceCollection, bloomType, bloomPatterns, bloomSampleValue]);
        }
    });
});

console.log('\n📊 GENERATING CSV FILE FOR DOWNLOAD...');
console.log('======================================');

// Convert to CSV format
const csvContent = csvData.map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
).join('\n');

console.log('✅ CSV data generated');
console.log(`📊 Total rows: ${csvData.length}`);
console.log(`📊 Total columns: ${csvData[0].length}`);

// Create and trigger download
const blob = new Blob([csvContent], { type: 'text/csv' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `entity_property_analysis_${new Date().toISOString().substring(0, 10)}.csv`;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);

console.log('💾 CSV file downloaded: entity_property_analysis_' + new Date().toISOString().substring(0, 10) + '.csv');

console.log('🔍 STRUCTURAL INCONSISTENCY SUMMARY');
console.log('===================================');

// Summary analysis
const inconsistencies = [];
const allEntityTypes = new Set([...Object.keys(vaSamples), ...Object.keys(bloomSamples)]);

coreProperties.forEach(propertyName => {
    allEntityTypes.forEach(entityType => {
        const vaEntity = vaSamples[entityType] ? vaSamples[entityType][0] : null;
        const bloomEntity = bloomSamples[entityType] ? bloomSamples[entityType][0] : null;

        if (vaEntity && bloomEntity) {
            const vaType = analyzePropertyType(vaEntity, propertyName);
            const bloomType = analyzePropertyType(bloomEntity, propertyName);

            if (vaType !== bloomType) {
                inconsistencies.push({
                    property: propertyName,
                    entityType: entityType,
                    vaType: vaType,
                    bloomType: bloomType
                });
            }
        }
    });
});

if (inconsistencies.length > 0) {
    console.log('❌ STRUCTURAL INCONSISTENCIES FOUND:');
    inconsistencies.forEach((issue, i) => {
        console.log(`${i + 1}. ${issue.entityType}.${issue.property}: VA(${issue.vaType}) ≠ Bloom(${issue.bloomType})`);
    });
} else {
    console.log('✅ All structural patterns are consistent between data sources');
}

console.log('\n📝 ANALYSIS COMPLETE');
console.log('Data saved to browser console - copy relevant tables to documentation');
console.log('Next step: Use this analysis to plan structural standardization changes');