/**
 * entityComparison.js - Entity Comparison Diagnostic Tool
 *
 * Extracted from entityGroupBrowser.js.
 * Provides detailed comparison output for debugging entity matching.
 *
 * Dependencies:
 * - unifiedEntityDatabase (window.unifiedEntityDatabase)
 * - universalCompareTo() function from universalEntityMatcher.js
 */

// =============================================================================
// ENTITY COMPARISON UTILITY
// =============================================================================

/**
 * Compare two entities by their database keys and output full reconciliation to console
 * @param {string} key1 - First entity database key (e.g., 'visionAppraisal:FireNumber:1418')
 * @param {string} key2 - Second entity database key (e.g., 'visionAppraisal:FireNumber:423')
 */
function compareEntitiesByKey(key1, key2) {
    const db = window.unifiedEntityDatabase;
    if (!db || !db.entities) {
        console.log('ERROR: unifiedEntityDatabase not loaded');
        return { error: 'Database not loaded' };
    }

    const entity1 = db.entities[key1];
    const entity2 = db.entities[key2];

    if (!entity1) {
        console.log(`ERROR: Entity not found: ${key1}`);
        return { error: `Entity not found: ${key1}` };
    }
    if (!entity2) {
        console.log(`ERROR: Entity not found: ${key2}`);
        return { error: `Entity not found: ${key2}` };
    }

    // Extract names for display
    const getName = (entity) => {
        if (entity.name?.primaryAlias?.term) return entity.name.primaryAlias.term;
        if (entity.name?.completeName) return entity.name.completeName;
        if (entity.name?.firstName || entity.name?.lastName) {
            return [entity.name.firstName, entity.name.lastName].filter(Boolean).join(' ');
        }
        return entity.name?.toString?.() || 'Unknown';
    };

    console.log('════════════════════════════════════════════════════════════════');
    console.log('                    ENTITY COMPARISON REPORT                     ');
    console.log('════════════════════════════════════════════════════════════════');

    console.log('\n┌─── ENTITY 1 ───────────────────────────────────────────────────');
    console.log(`│ Key:  ${key1}`);
    console.log(`│ Type: ${entity1.constructor?.name || entity1.__type || 'Unknown'}`);
    console.log(`│ Name: ${getName(entity1)}`);
    console.log('└────────────────────────────────────────────────────────────────');

    console.log('\n┌─── ENTITY 2 ───────────────────────────────────────────────────');
    console.log(`│ Key:  ${key2}`);
    console.log(`│ Type: ${entity2.constructor?.name || entity2.__type || 'Unknown'}`);
    console.log(`│ Name: ${getName(entity2)}`);
    console.log('└────────────────────────────────────────────────────────────────');

    // Perform comparison
    let result;
    if (typeof universalCompareTo === 'function') {
        result = universalCompareTo(entity1, entity2);
    } else if (typeof entity1.compareTo === 'function') {
        result = entity1.compareTo(entity2, true);
    } else {
        console.log('ERROR: No comparison function available');
        return { error: 'No comparison function available' };
    }

    const score = result.score ?? result.overallSimilarity ?? result;
    const scorePercent = (typeof score === 'number' ? score * 100 : 0).toFixed(2);

    console.log('\n┌─── COMPARISON RESULT ──────────────────────────────────────────');
    console.log(`│ Overall Score: ${scorePercent}%`);
    if (result.comparisonType) {
        console.log(`│ Comparison Type: ${result.comparisonType}`);
    }
    console.log('└────────────────────────────────────────────────────────────────');

    // Output detailed breakdown
    if (result.details) {
        console.log('\n┌─── DETAILED BREAKDOWN ─────────────────────────────────────────');

        // Top-level components
        if (result.details.components) {
            console.log('│');
            console.log('│ Components:');
            for (const [compName, compData] of Object.entries(result.details.components)) {
                const sim = (compData.similarity ?? compData.score ?? 0) * 100;
                const weight = (compData.actualWeight ?? compData.weight ?? 0) * 100;
                const contrib = (compData.weightedValue ?? compData.contribution ?? 0) * 100;
                console.log(`│   ${compName}:`);
                console.log(`│     Similarity: ${sim.toFixed(2)}%  Weight: ${weight.toFixed(1)}%  Contribution: ${contrib.toFixed(2)}%`);
            }
        }

        // Subordinate details (nested comparison breakdowns)
        if (result.details.subordinateDetails) {
            console.log('│');
            console.log('│ Subordinate Details:');
            for (const [subName, subData] of Object.entries(result.details.subordinateDetails)) {
                console.log(`│   ${subName}:`);
                if (subData.components) {
                    for (const [subCompName, subCompData] of Object.entries(subData.components)) {
                        const sim = (subCompData.similarity ?? subCompData.score ?? 0) * 100;
                        const weight = (subCompData.actualWeight ?? subCompData.weight ?? 0) * 100;
                        console.log(`│     ${subCompName}: ${sim.toFixed(2)}% (weight: ${weight.toFixed(1)}%)`);
                    }
                }
                if (subData.addressMatch) {
                    console.log(`│     Address Match: ${subData.addressMatch.matchType || 'N/A'}`);
                    console.log(`│       Score: ${((subData.addressMatch.score ?? 0) * 100).toFixed(2)}%`);
                }
            }
        }

        console.log('└────────────────────────────────────────────────────────────────');
    }

    // Full JSON output for deep inspection
    console.log('\n┌─── FULL RESULT OBJECT (expandable) ───────────────────────────');
    console.log('Details:', result.details || result);
    console.log('└────────────────────────────────────────────────────────────────');

    return result;
}

/**
 * Run comparison from UI inputs
 */
function runEntityComparison() {
    const key1Input = document.getElementById('compareEntityKey1');
    const key2Input = document.getElementById('compareEntityKey2');

    if (!key1Input || !key2Input) {
        console.log('ERROR: Input elements not found');
        return;
    }

    const key1 = key1Input.value.trim();
    const key2 = key2Input.value.trim();

    if (!key1 || !key2) {
        alert('Please enter both entity keys');
        return;
    }

    console.clear();
    compareEntitiesByKey(key1, key2);
}

// Export for global access
window.compareEntitiesByKey = compareEntitiesByKey;
window.runEntityComparison = runEntityComparison;
