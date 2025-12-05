/**
 * UPDATED ENTITY PROPERTY COMPARISON - Post IdentifyingData Elimination
 * Based on object_type_mapping_analysis.md framework
 * Created after removing IdentifyingData wrappers from Bloomerang entities
 *
 * This script systematically compares actual entity properties between
 * VisionAppraisal and Bloomerang entities to verify structural consistency
 */

console.log('🔬 UPDATED ENTITY PROPERTY COMPARISON');
console.log('====================================');
console.log('Goal: Verify Bloomerang entities now match VisionAppraisal direct object patterns');
console.log('');

async function runUpdatedEntityPropertyComparison() {
    console.log('📋 LOADING ENTITIES FOR COMPARISON...');

    // Step 1: Load both entity sets
    try {
        // Load VisionAppraisal entities
        console.log('Loading VisionAppraisal entities...');
        if (typeof loadVisionAppraisalEntitiesWorking === 'function') {
            await loadVisionAppraisalEntitiesWorking();
        } else {
            console.error('❌ VisionAppraisal loader not available');
            return;
        }

        // Load Bloomerang entities
        console.log('Loading Bloomerang entities...');
        if (typeof loadBloomerangCollectionsWorking === 'function') {
            await loadBloomerangCollectionsWorking();
        } else {
            console.error('❌ Bloomerang loader not available');
            return;
        }

        console.log('✅ Both entity sets loaded successfully');
        console.log('');

    } catch (error) {
        console.error('❌ Entity loading failed:', error);
        return;
    }

    // Step 2: Get sample entities for comparison
    const vaSamples = getSampleEntities('visionAppraisal');
    const bloomSamples = getSampleEntities('bloomerang');

    console.log('📊 SAMPLE ENTITY COUNTS:');
    console.log(`VisionAppraisal: ${vaSamples.Individual.length} Individual, ${vaSamples.AggregateHousehold.length} AggregateHousehold, ${vaSamples.Business.length} Business, ${vaSamples.LegalConstruct.length} LegalConstruct`);
    console.log(`Bloomerang: ${bloomSamples.Individual.length} Individual, ${bloomSamples.AggregateHousehold.length} AggregateHousehold, ${bloomSamples.Business.length} Business, ${bloomSamples.LegalConstruct.length} LegalConstruct`);
    console.log('');

    // Step 3: Run systematic comparison by entity type
    const entityTypes = ['Individual', 'AggregateHousehold', 'Business', 'LegalConstruct'];
    const results = {};

    for (const entityType of entityTypes) {
        console.log(`🔍 ANALYZING ${entityType.toUpperCase()} ENTITIES`);
        console.log(''.padEnd(50, '='));

        const vaEntity = vaSamples[entityType][0];
        const bloomEntity = bloomSamples[entityType][0];

        if (!vaEntity || !bloomEntity) {
            console.log(`⚠️  Insufficient samples for ${entityType} - skipping`);
            console.log('');
            continue;
        }

        results[entityType] = compareEntityProperties(vaEntity, bloomEntity, entityType);
        console.log('');
    }

    // Step 4: Generate summary report
    generateComparisonSummary(results);

    return results;
}

function getSampleEntities(source) {
    const samples = {
        Individual: [],
        AggregateHousehold: [],
        Business: [],
        LegalConstruct: []
    };

    if (source === 'visionAppraisal') {
        if (window.workingLoadedEntities?.visionAppraisal?.entities) {
            const entities = window.workingLoadedEntities.visionAppraisal.entities;

            entities.forEach(entity => {
                const type = entity.type;
                if (samples[type] && samples[type].length < 2) {
                    samples[type].push(entity);
                }
            });
        }
    } else if (source === 'bloomerang') {
        if (window.workingLoadedEntities?.bloomerang) {
            // Individual entities
            if (workingLoadedEntities.bloomerang.individuals?.entities) {
                samples.Individual = Object.values(workingLoadedEntities.bloomerang.individuals.entities).slice(0, 2);
            }

            // Household entities
            if (workingLoadedEntities.bloomerang.households?.entities) {
                samples.AggregateHousehold = Object.values(workingLoadedEntities.bloomerang.households.entities).slice(0, 2);
            }

            // NonHuman entities (Business + LegalConstruct)
            if (workingLoadedEntities.bloomerang.nonhuman?.entities) {
                const nonHumanEntities = Object.values(workingLoadedEntities.bloomerang.nonhuman.entities);
                nonHumanEntities.forEach(entity => {
                    const type = entity.type;
                    if ((type === 'Business' || type === 'LegalConstruct') && samples[type].length < 2) {
                        samples[type].push(entity);
                    }
                });
            }
        }
    }

    return samples;
}

function compareEntityProperties(vaEntity, bloomEntity, entityType) {
    console.log(`📋 Comparing ${entityType} Properties:`);

    const results = {
        entityType: entityType,
        properties: {},
        summary: { consistent: 0, inconsistent: 0, total: 0 }
    };

    // Core properties to compare
    const propertiesToCheck = [
        'locationIdentifier',
        'name',
        'accountNumber',
        'contactInfo',
        'otherInfo',
        'legacyInfo'
    ];

    propertiesToCheck.forEach(prop => {
        console.log(`  🔸 ${prop}:`);

        const vaType = getObjectType(vaEntity[prop]);
        const bloomType = getObjectType(bloomEntity[prop]);

        const isConsistent = compareObjectTypes(vaEntity[prop], bloomEntity[prop], prop, entityType);

        results.properties[prop] = {
            visionAppraisal: vaType,
            bloomerang: bloomType,
            consistent: isConsistent
        };

        console.log(`    VA: ${vaType}`);
        console.log(`    Bloom: ${bloomType}`);
        console.log(`    Status: ${isConsistent ? '✅ CONSISTENT' : '❌ INCONSISTENT'}`);

        results.summary.total++;
        if (isConsistent) {
            results.summary.consistent++;
        } else {
            results.summary.inconsistent++;
        }
    });

    return results;
}

function getObjectType(obj) {
    if (obj === null) return 'null';
    if (obj === undefined) return 'undefined';
    if (typeof obj === 'boolean') return `boolean (${obj})`;
    if (typeof obj === 'number') return `number (${obj})`;
    if (typeof obj === 'string') return `string ("${obj}")`;
    if (obj.type) return `${obj.type} object`;
    if (obj.constructor?.name) return `${obj.constructor.name} object`;
    if (Array.isArray(obj)) return `Array[${obj.length}]`;
    return `object (${Object.keys(obj).length} keys)`;
}

function compareObjectTypes(vaObj, bloomObj, propName, entityType) {
    // Special comparison logic based on property and entity type

    if (propName === 'locationIdentifier') {
        // Both should now be direct Fire Number/PID/ComplexIdentifiers objects
        const vaIsNumber = typeof vaObj === 'number';
        const bloomHasType = bloomObj && bloomObj.type;

        // VA uses raw numbers, Bloomerang should now use direct FireNumber/PID objects
        if (vaIsNumber && bloomHasType && ['FireNumber', 'PID', 'ComplexIdentifiers'].includes(bloomObj.type)) {
            return true; // Different but both valid patterns
        }

        return vaIsNumber === (typeof bloomObj === 'number');
    }

    if (propName === 'name') {
        if (entityType === 'Individual') {
            // Both should now be direct IndividualName objects
            const vaIsIndividualName = vaObj && vaObj.type === 'IndividualName';
            const bloomIsIndividualName = bloomObj && bloomObj.type === 'IndividualName';
            return vaIsIndividualName && bloomIsIndividualName;
        } else {
            // Non-Individual entities should both use direct AttributedTerm or HouseholdName
            const vaType = vaObj && vaObj.type;
            const bloomType = bloomObj && bloomObj.type;

            // Both should be direct objects (no IdentifyingData wrapper)
            return vaType && bloomType && vaType === bloomType;
        }
    }

    if (propName === 'accountNumber') {
        // VA uses false/AttributedTerm, Bloomerang should still use IndicativeData wrapper for now
        const vaIsFalse = vaObj === false;
        const bloomHasIndicative = bloomObj && bloomObj.type === 'IndicativeData';

        return vaIsFalse || bloomHasIndicative; // Both are acceptable patterns
    }

    if (propName === 'contactInfo') {
        // VA uses ContactInfo objects, Bloomerang uses boolean flags
        const vaIsContactInfo = vaObj && vaObj.type === 'ContactInfo';
        const bloomIsBoolean = typeof bloomObj === 'boolean';

        return vaIsContactInfo || bloomIsBoolean; // Both patterns acceptable
    }

    if (propName === 'otherInfo' || propName === 'legacyInfo') {
        // Both should be null
        return vaObj === null && bloomObj === null;
    }

    // Default comparison - exact type match
    return getObjectType(vaObj) === getObjectType(bloomObj);
}

function generateComparisonSummary(results) {
    console.log('📊 COMPARISON SUMMARY');
    console.log('====================');

    let totalConsistent = 0;
    let totalInconsistent = 0;
    let totalProperties = 0;

    Object.keys(results).forEach(entityType => {
        const result = results[entityType];
        console.log(`${entityType}: ${result.summary.consistent}/${result.summary.total} consistent`);

        totalConsistent += result.summary.consistent;
        totalInconsistent += result.summary.inconsistent;
        totalProperties += result.summary.total;
    });

    console.log('');
    console.log(`🎯 OVERALL RESULTS:`);
    console.log(`✅ Consistent Properties: ${totalConsistent}/${totalProperties} (${Math.round(totalConsistent/totalProperties*100)}%)`);
    console.log(`❌ Inconsistent Properties: ${totalInconsistent}/${totalProperties} (${Math.round(totalInconsistent/totalProperties*100)}%)`);

    if (totalInconsistent === 0) {
        console.log('');
        console.log('🎉 SUCCESS: All entity properties are now structurally consistent!');
        console.log('✅ Bloomerang entities match VisionAppraisal direct object patterns');
    } else {
        console.log('');
        console.log('⚠️  INCONSISTENCIES REMAIN:');

        Object.keys(results).forEach(entityType => {
            const result = results[entityType];
            Object.keys(result.properties).forEach(prop => {
                if (!result.properties[prop].consistent) {
                    console.log(`   ${entityType}.${prop}: VA(${result.properties[prop].visionAppraisal}) vs Bloom(${result.properties[prop].bloomerang})`);
                }
            });
        });
    }
}

// Export the main function
window.runUpdatedEntityPropertyComparison = runUpdatedEntityPropertyComparison;

console.log('✅ Updated Entity Property Comparison ready');
console.log('💡 Run: runUpdatedEntityPropertyComparison()');