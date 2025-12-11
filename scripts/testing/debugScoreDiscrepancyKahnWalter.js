/**
 * Debug script to investigate the 56% vs 37.7% score discrepancy
 * for Susan Kahn vs WALTER household
 *
 * Run in browser console after loading entities:
 * fetch('./scripts/testing/debugScoreDiscrepancyKahnWalter.js').then(r => r.text()).then(eval)
 */

console.log('='.repeat(70));
console.log('DEBUG: Susan Kahn vs WALTER Household Score Discrepancy');
console.log('='.repeat(70));

// Get the entities
// Susan Kahn is Bloomerang account 729, Individual
// Walter is VisionAppraisal FireNumber 782, AggregateHousehold

console.log('\n--- Step 1: Verify entity lookup functions ---');
console.log('getBloomerangEntityByAccountNumber available:', typeof getBloomerangEntityByAccountNumber === 'function');
console.log('getVisionAppraisalEntity available:', typeof getVisionAppraisalEntity === 'function');
console.log('universalCompareTo available:', typeof universalCompareTo === 'function');
console.log('findBestMatches available:', typeof findBestMatches === 'function');

console.log('\n--- Step 2: Retrieve entities ---');
const susan = getBloomerangEntityByAccountNumber('729', 'SimpleIdentifiers', '16 Tuxedo Rd., Rumson, NJ, 07760', 'na');
const walter = getVisionAppraisalEntity('FireNumber', '782');

if (!susan) {
    console.error('ERROR: Susan Kahn entity not found!');
    console.log('Trying alternative lookups...');
}
if (!walter) {
    console.error('ERROR: Walter household not found!');
}

console.log('Susan entity type:', susan?.constructor?.name);
console.log('Susan name:', susan?.name?.toString?.() || susan?.name);
console.log('Walter entity type:', walter?.constructor?.name);
console.log('Walter name:', walter?.name?.toString?.() || walter?.name);

console.log('\n--- Step 3: Walter household individuals ---');
if (walter?.individuals) {
    console.log('Walter has', walter.individuals.length, 'individuals:');
    walter.individuals.forEach((ind, idx) => {
        console.log(`  [${idx}] ${ind.name?.toString?.() || ind.name}`);
    });
} else {
    console.log('Walter has NO individuals array!');
}

console.log('\n--- Step 4: Direct entity.compareTo (NO universalCompareTo) ---');
if (susan && walter) {
    const directScore = susan.compareTo(walter, false);
    const directDetailed = susan.compareTo(walter, true);
    console.log('Direct susan.compareTo(walter):', directScore);
    console.log('As percentage:', (directScore * 100).toFixed(2) + '%');
    console.log('Components:', directDetailed.components);

    // This is what performBasicMatchAnalysis would return!
    console.log('\n*** THIS IS THE SCORE THAT performBasicMatchAnalysis WOULD RETURN ***');
    console.log('*** If this is ~56%, that explains the discrepancy ***');
}

console.log('\n--- Step 5: universalCompareTo (should route through compareIndividualToHousehold) ---');
if (susan && walter && typeof universalCompareTo === 'function') {
    const uniResult = universalCompareTo(susan, walter);
    console.log('universalCompareTo result:', uniResult);
    console.log('Score:', uniResult.score);
    console.log('As percentage:', (uniResult.score * 100).toFixed(2) + '%');
    console.log('Comparison type:', uniResult.comparisonType);
    console.log('Matched individual:', uniResult.matchedIndividual?.name?.toString?.() || 'none');
    console.log('Matched individual index:', uniResult.matchedIndividualIndex);
}

console.log('\n--- Step 6: Individual-to-individual comparisons ---');
if (susan && walter?.individuals) {
    walter.individuals.forEach((ind, idx) => {
        const indScore = susan.compareTo(ind, false);
        console.log(`Susan vs ${ind.name?.toString?.()}: ${(indScore * 100).toFixed(2)}%`);
    });
}

console.log('\n--- Step 7: findBestMatches with Susan ---');
if (susan && typeof findBestMatches === 'function') {
    console.log('Running findBestMatches for Susan...');
    const results = findBestMatches(susan);

    // Find Walter in the results
    const householdMatches = results.bestMatchesByType?.AggregateHousehold?.bestMatches || [];
    const walterMatch = householdMatches.find(m =>
        m.targetKey === '782' ||
        m.entityName?.toLowerCase().includes('walter')
    );

    if (walterMatch) {
        console.log('Walter match found in findBestMatches results:');
        console.log('  Score:', walterMatch.score);
        console.log('  As percentage:', (walterMatch.score * 100).toFixed(2) + '%');
        console.log('  Entity name:', walterMatch.entityName);
        console.log('  Matched individual:', walterMatch.matchedIndividual?.name?.toString?.() || 'none');
    } else {
        console.log('Walter NOT FOUND in best matches!');
        console.log('All household matches:');
        householdMatches.slice(0, 5).forEach(m => {
            console.log(`  ${m.entityName}: ${(m.score * 100).toFixed(2)}%`);
        });
    }
}

console.log('\n--- SUMMARY ---');
console.log('If Step 4 (direct compareTo) shows ~56% and Step 5 (universalCompareTo) shows ~37.7%,');
console.log('the issue is that performBasicMatchAnalysis uses direct compareTo instead of universalCompareTo.');
console.log('');
console.log('The fix would be to make performBasicMatchAnalysis use universalCompareTo,');
console.log('or to ensure findBestMatches is always loaded before analyzeSelectedEntityMatches runs.');

console.log('\n' + '='.repeat(70));
