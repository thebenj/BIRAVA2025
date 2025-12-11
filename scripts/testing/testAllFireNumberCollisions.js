// Comprehensive Fire Number Collision Test
// Tests ALL fire numbers from console log that have duplicate entities
// Created: December 8, 2025

console.log('=== Comprehensive Fire Number Collision Test ===\n');
console.log('Loading fireNumberCollisionHandler.js...');

// Load the handler first, then run the test
fetch('./scripts/dataSources/fireNumberCollisionHandler.js').then(r => r.text()).then(eval).then(() => {
    console.log('Handler loaded successfully.\n');
    runComprehensiveTest();
});

// All fire numbers with collisions from console log (67 duplicate entries total)
const COLLISION_FIRE_NUMBERS = [
    631, 207, 206, 205, 204, 155, 154, 153, 152, 100,
    33, 351, 27, 7, 460, 72, 225, 472, 808, 1740
];

function runComprehensiveTest() {
    // Get all VA entities
    const vaEntities = Object.values(workingLoadedEntities.visionAppraisal.entities);
    console.log(`Total VA entities: ${vaEntities.length}`);

    // Helper function to find entities by fire number
    // Key insight from diagnostic: primaryAlias.term is a NUMBER (e.g., 631), not a string
    // The "FireNumber:" prefix in DUPLICATE errors comes from the class name (locationType)
    const findByFireNumber = (fireNum) => vaEntities.filter(e => {
        const locId = e.locationIdentifier;
        if (!locId?.primaryAlias?.term) return false;
        // Compare as numbers for exact match
        return Number(locId.primaryAlias.term) === Number(fireNum);
    });

    // Quick stats
    let multiEntityCount = 0;
    for (const fn of COLLISION_FIRE_NUMBERS) {
        const entities = findByFireNumber(fn);
        if (entities.length > 1) multiEntityCount++;
    }
    console.log(`\nFire numbers with multiple entities: ${multiEntityCount} of ${COLLISION_FIRE_NUMBERS.length}\n`);

    // Results tracking
    const results = {
        sameOwner: [],
        differentOwner: [],
        noEntities: [],
        singleEntity: [],
        errors: []
    };

    // Test each collision fire number
    console.log('=== Testing Each Fire Number ===\n');

    for (const fireNum of COLLISION_FIRE_NUMBERS) {
        const entities = findByFireNumber(fireNum);

        if (entities.length === 0) {
            results.noEntities.push(fireNum);
            continue;
        }

        if (entities.length === 1) {
            results.singleEntity.push({ fireNum, type: entities[0].constructor.name });
            continue;
        }

        console.log(`\n--- Fire Number ${fireNum}: ${entities.length} entities ---`);

        // Show all entities at this fire number
        entities.forEach((e, i) => {
            const nameStr = extractNameString(e.name);
            console.log(`  [${i}] ${e.constructor.name}: "${nameStr}"`);
        });

        // Compare all pairs
        console.log(`  Pairwise comparisons:`);
        for (let i = 0; i < entities.length; i++) {
            for (let j = i + 1; j < entities.length; j++) {
                try {
                    const e1 = entities[i];
                    const e2 = entities[j];

                    const comparison = compareForFireNumberCollision(e1, e2);

                    const name1 = extractNameString(e1.name);
                    const name2 = extractNameString(e2.name);

                    const result = {
                        fireNum,
                        entity1: { type: e1.constructor.name, name: name1 },
                        entity2: { type: e2.constructor.name, name: name2 },
                        nameSimilarity: comparison.nameSimilarity,
                        contactInfoSimilarity: comparison.contactInfoSimilarity,
                        overallSimilarity: comparison.overallSimilarity,
                        decision: comparison.decision,
                        reasoning: comparison.reasoning
                    };

                    if (comparison.decision === 'SAME_OWNER') {
                        results.sameOwner.push(result);
                        console.log(`    [${i}] vs [${j}]: SAME_OWNER (overall=${(comparison.overallSimilarity*100).toFixed(1)}%, name=${(comparison.nameSimilarity*100).toFixed(1)}%)`);
                    } else {
                        results.differentOwner.push(result);
                        console.log(`    [${i}] vs [${j}]: DIFFERENT_OWNER (overall=${(comparison.overallSimilarity*100).toFixed(1)}%, name=${(comparison.nameSimilarity*100).toFixed(1)}%)`);
                    }
                } catch (err) {
                    results.errors.push({ fireNum, i, j, error: err.message });
                    console.log(`    [${i}] vs [${j}]: ERROR - ${err.message}`);
                }
            }
        }
    }

    // Summary
    console.log('\n\n========================================');
    console.log('=== COMPREHENSIVE TEST SUMMARY ===');
    console.log('========================================\n');

    console.log(`Fire numbers tested: ${COLLISION_FIRE_NUMBERS.length}`);
    console.log(`Fire numbers with no entities found: ${results.noEntities.length}`);
    if (results.noEntities.length > 0) {
        console.log(`  (${results.noEntities.join(', ')})`);
    }
    console.log(`Fire numbers with single entity: ${results.singleEntity.length}`);

    console.log(`\nTotal pairwise comparisons: ${results.sameOwner.length + results.differentOwner.length}`);
    console.log(`  SAME_OWNER decisions: ${results.sameOwner.length}`);
    console.log(`  DIFFERENT_OWNER decisions: ${results.differentOwner.length}`);
    console.log(`  Errors: ${results.errors.length}`);

    // Show SAME_OWNER cases in detail (these are the important ones!)
    if (results.sameOwner.length > 0) {
        console.log('\n=== SAME_OWNER CASES (potential merges) ===');
        results.sameOwner.forEach((r, i) => {
            console.log(`\n[${i+1}] Fire Number ${r.fireNum}:`);
            console.log(`    Entity 1: ${r.entity1.type} "${r.entity1.name}"`);
            console.log(`    Entity 2: ${r.entity2.type} "${r.entity2.name}"`);
            console.log(`    Name Similarity: ${(r.nameSimilarity*100).toFixed(1)}%`);
            console.log(`    ContactInfo Similarity: ${(r.contactInfoSimilarity*100).toFixed(1)}%`);
            console.log(`    Overall Similarity: ${(r.overallSimilarity*100).toFixed(1)}%`);
            console.log(`    Reasoning: ${r.reasoning}`);
        });
    } else {
        console.log('\n=== No SAME_OWNER cases found ===');
        console.log('All entities at collision fire numbers appear to be different owners.');
    }

    // Show highest similarity DIFFERENT_OWNER cases (might be worth reviewing)
    const highSimilarityDifferent = results.differentOwner
        .filter(r => r.overallSimilarity > 0.5 || r.nameSimilarity > 0.6)
        .sort((a, b) => b.overallSimilarity - a.overallSimilarity);

    if (highSimilarityDifferent.length > 0) {
        console.log('\n=== HIGH SIMILARITY DIFFERENT_OWNER (review recommended) ===');
        highSimilarityDifferent.slice(0, 10).forEach((r, i) => {
            console.log(`\n[${i+1}] Fire Number ${r.fireNum}:`);
            console.log(`    ${r.entity1.type} "${r.entity1.name}"`);
            console.log(`    ${r.entity2.type} "${r.entity2.name}"`);
            console.log(`    Overall: ${(r.overallSimilarity*100).toFixed(1)}%, Name: ${(r.nameSimilarity*100).toFixed(1)}%`);
        });
    }

    // Store results globally for further analysis
    window.fireNumberCollisionTestResults = results;
    console.log('\n\nResults stored in window.fireNumberCollisionTestResults for further analysis.');
    console.log('=== Test Complete ===');
}
