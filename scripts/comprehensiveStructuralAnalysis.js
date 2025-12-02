/**
 * COMPREHENSIVE STRUCTURAL ANALYSIS - ALL RECORDS
 * ==============================================
 *
 * PURPOSE: Thorough analysis of ALL entities to identify structural patterns
 * CREATED: 2025-11-23
 * AUTHOR: Claude Code AI
 *
 * This script analyzes EVERY entity, not just samples, to determine:
 * - Exact frequency patterns for each property type
 * - Whether properties are always/sometimes/never null
 * - What specific object types are used when properties are not null
 * - Detailed SimpleIdentifiers subclass usage patterns
 */

console.log('🔍 COMPREHENSIVE STRUCTURAL ANALYSIS - ALL RECORDS');
console.log('================================================');
console.log('Purpose: Thorough analysis of all entities for accurate structural assessment');
console.log('');

// Check if entities are loaded
if (!window.workingLoadedEntities || workingLoadedEntities.status !== 'loaded') {
    console.log('❌ Entities not loaded. Please click "🚀 Load All Entities Into Memory" button first');
    throw new Error('Entities must be loaded first');
}

console.log('✅ Entities loaded, starting comprehensive analysis of ALL records...\n');

/**
 * Analyze property patterns across ALL entities
 */
function analyzeAllEntities(source, entities, sourceName) {
    console.log(`\n📊 ANALYZING ALL ${sourceName} ENTITIES`);
    console.log('='.repeat(40 + sourceName.length));

    const propertyAnalysis = {};
    const coreProperties = ['name', 'locationIdentifier', 'accountNumber', 'contactInfo', 'otherInfo', 'legacyInfo'];

    // Initialize analysis structure
    coreProperties.forEach(prop => {
        propertyAnalysis[prop] = {
            totalEntities: 0,
            nullCount: 0,
            undefinedCount: 0,
            objectTypes: {},
            samples: []
        };
    });

    // Count entity types
    const entityTypeCounts = {};

    // Analyze each entity
    if (source === 'visionAppraisal') {
        entities.forEach(entity => {
            const entityType = entity.type || 'Unknown';
            entityTypeCounts[entityType] = (entityTypeCounts[entityType] || 0) + 1;

            coreProperties.forEach(prop => {
                const analysis = propertyAnalysis[prop];
                analysis.totalEntities++;

                const value = entity[prop];
                if (value === null) {
                    analysis.nullCount++;
                } else if (value === undefined) {
                    analysis.undefinedCount++;
                } else {
                    // Analyze object type
                    const objType = getDetailedObjectType(value);
                    analysis.objectTypes[objType] = (analysis.objectTypes[objType] || 0) + 1;

                    // Store sample if we have less than 5
                    if (analysis.samples.length < 5) {
                        analysis.samples.push({
                            entityType: entityType,
                            objectType: objType,
                            value: JSON.stringify(value).substring(0, 100)
                        });
                    }
                }
            });
        });
    } else if (source === 'bloomerang') {
        const collections = ['individuals', 'households', 'nonhuman'];

        collections.forEach(collectionName => {
            if (entities[collectionName] && entities[collectionName].entities) {
                const collectionEntities = Object.values(entities[collectionName].entities);

                collectionEntities.forEach(entity => {
                    const entityType = entity.type || collectionName;
                    entityTypeCounts[entityType] = (entityTypeCounts[entityType] || 0) + 1;

                    coreProperties.forEach(prop => {
                        const analysis = propertyAnalysis[prop];
                        analysis.totalEntities++;

                        const value = entity[prop];
                        if (value === null) {
                            analysis.nullCount++;
                        } else if (value === undefined) {
                            analysis.undefinedCount++;
                        } else {
                            // Analyze object type
                            const objType = getDetailedObjectType(value);
                            analysis.objectTypes[objType] = (analysis.objectTypes[objType] || 0) + 1;

                            // Store sample if we have less than 5
                            if (analysis.samples.length < 5) {
                                analysis.samples.push({
                                    entityType: entityType,
                                    objectType: objType,
                                    value: JSON.stringify(value).substring(0, 100)
                                });
                            }
                        }
                    });
                });
            }
        });
    }

    // Report entity type counts
    console.log(`\n📈 Entity Type Counts for ${sourceName}:`);
    Object.entries(entityTypeCounts).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} entities`);
    });

    // Report property analysis
    console.log(`\n📋 Property Analysis for ${sourceName}:`);
    coreProperties.forEach(prop => {
        const analysis = propertyAnalysis[prop];
        const total = analysis.totalEntities;

        console.log(`\n  ${prop.toUpperCase()}:`);
        console.log(`    Total entities: ${total}`);
        console.log(`    Null: ${analysis.nullCount} (${(analysis.nullCount/total*100).toFixed(1)}%)`);
        console.log(`    Undefined: ${analysis.undefinedCount} (${(analysis.undefinedCount/total*100).toFixed(1)}%)`);

        const objectTypeEntries = Object.entries(analysis.objectTypes);
        if (objectTypeEntries.length > 0) {
            console.log(`    Object types when not null/undefined:`);
            objectTypeEntries.forEach(([objType, count]) => {
                console.log(`      ${objType}: ${count} (${(count/total*100).toFixed(1)}%)`);
            });

            // Show samples
            if (analysis.samples.length > 0) {
                console.log(`    Sample values:`);
                analysis.samples.forEach((sample, i) => {
                    console.log(`      ${i+1}. [${sample.entityType}] ${sample.objectType}: ${sample.value}...`);
                });
            }
        }
    });

    return propertyAnalysis;
}

/**
 * Get detailed object type including SimpleIdentifiers subclass detection
 */
function getDetailedObjectType(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value !== 'object') return typeof value;

    // Check for class type first
    if (value.type) {
        return `${value.type} object`;
    }

    // Check for specific patterns
    const keys = Object.keys(value);

    // IdentifyingData wrapper
    if (keys.includes('type') && keys.includes('identifier')) {
        return 'IdentifyingData wrapper';
    }

    // IndicativeData wrapper
    if (keys.includes('type') && keys.includes('data')) {
        return 'IndicativeData wrapper';
    }

    // Name objects
    if (keys.includes('firstName') && keys.includes('lastName')) {
        return 'IndividualName object';
    }

    if (keys.includes('householdName')) {
        return 'HouseholdName object';
    }

    // AttributedTerm objects
    if (keys.includes('term') && keys.includes('fieldName')) {
        return 'AttributedTerm object';
    }

    // SimpleIdentifiers and subclasses
    if (keys.includes('identifier') || keys.includes('identifierType')) {
        if (keys.includes('fireNumber') || (typeof value.identifier === 'number' && value.identifier < 3500)) {
            return 'FireNumber (SimpleIdentifiers subclass)';
        }
        if (keys.includes('pid') || (typeof value.identifier === 'string' && value.identifier.includes('PID'))) {
            return 'PID (SimpleIdentifiers subclass)';
        }
        return 'SimpleIdentifiers object';
    }

    // ContactInfo
    if (keys.includes('primaryAddress') || keys.includes('secondaryAddresses') || keys.includes('emailAddresses')) {
        return 'ContactInfo object';
    }

    // Address objects
    if (keys.includes('streetNumber') || keys.includes('streetName') || keys.includes('city')) {
        return 'Address object';
    }

    // Generic object
    return `object (${keys.length} keys: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''})`;
}

// Run comprehensive analysis
const vaAnalysis = analyzeAllEntities('visionAppraisal', workingLoadedEntities.visionAppraisal.entities, 'VISIONAPPRAISAL');
const bloomAnalysis = analyzeAllEntities('bloomerang', workingLoadedEntities.bloomerang, 'BLOOMERANG');

console.log('\n🎯 STRUCTURAL INCONSISTENCY ASSESSMENT');
console.log('=====================================');

const coreProperties = ['name', 'locationIdentifier', 'accountNumber', 'contactInfo', 'otherInfo', 'legacyInfo'];

coreProperties.forEach(prop => {
    console.log(`\n🔍 ${prop.toUpperCase()} COMPARISON:`);

    const va = vaAnalysis[prop];
    const bloom = bloomAnalysis[prop];

    console.log(`  VisionAppraisal: ${va.nullCount} null, ${va.undefinedCount} undefined of ${va.totalEntities} total`);
    console.log(`  Bloomerang: ${bloom.nullCount} null, ${bloom.undefinedCount} undefined of ${bloom.totalEntities} total`);

    console.log(`  VisionAppraisal object types: ${JSON.stringify(va.objectTypes, null, 2)}`);
    console.log(`  Bloomerang object types: ${JSON.stringify(bloom.objectTypes, null, 2)}`);

    // Identify structural issues
    const vaTypes = Object.keys(va.objectTypes);
    const bloomTypes = Object.keys(bloom.objectTypes);

    if (vaTypes.length > 0 && bloomTypes.length > 0) {
        const commonTypes = vaTypes.filter(type => bloomTypes.includes(type));
        const vaOnlyTypes = vaTypes.filter(type => !bloomTypes.includes(type));
        const bloomOnlyTypes = bloomTypes.filter(type => !vaTypes.includes(type));

        if (vaOnlyTypes.length > 0 || bloomOnlyTypes.length > 0) {
            console.log(`  ⚠️  STRUCTURAL INCONSISTENCY DETECTED:`);
            if (vaOnlyTypes.length > 0) console.log(`    VisionAppraisal only: ${vaOnlyTypes.join(', ')}`);
            if (bloomOnlyTypes.length > 0) console.log(`    Bloomerang only: ${bloomOnlyTypes.join(', ')}`);
            if (commonTypes.length > 0) console.log(`    Shared types: ${commonTypes.join(', ')}`);
        } else {
            console.log(`  ✅ Object types consistent between sources`);
        }
    }
});

console.log('\n📝 COMPREHENSIVE ANALYSIS COMPLETE');
console.log('Next step: Use this detailed analysis to plan precise structural fixes');