/**
 * Debug script to examine Susan Kahn's household structure
 * Run: fetch('./scripts/testing/debugSusanKahnHousehold.js').then(r => r.text()).then(eval)
 */

console.log('=== DEBUG: Susan Kahn Household Structure ===');

const susan = getBloomerangEntityByAccountNumber('729', 'SimpleIdentifiers', '16 Tuxedo Rd., Rumson, NJ, 07760', 'na');

console.log('Entity type:', susan?.constructor?.name);
console.log('Entity name:', susan?.name?.toString?.());

if (susan?.individuals) {
    console.log('Has individuals array, length:', susan.individuals.length);
    susan.individuals.forEach((ind, idx) => {
        console.log(`  [${idx}] ${ind.constructor?.name}: ${ind.name?.toString?.()}`);
    });
} else {
    console.log('NO individuals array on this entity');
}

// Get Walter for comparison
const walter = getVisionAppraisalEntity('FireNumber', '782');
console.log('\nWalter entity type:', walter?.constructor?.name);
console.log('Walter has individuals:', walter?.individuals?.length);

// Now do the comparison and log what happens
console.log('\n=== Comparison Test ===');
if (typeof universalCompareTo === 'function') {
    const result = universalCompareTo(susan, walter);
    console.log('universalCompareTo result:');
    console.log('  comparisonType:', result.comparisonType);
    console.log('  score:', result.score);
    console.log('  matchedIndividual:', result.matchedIndividual?.name?.toString?.());
    console.log('  matchedIndividual1:', result.matchedIndividual1?.name?.toString?.());
} else {
    console.log('universalCompareTo not loaded - load it first');
}

// Check what type detection sees
console.log('\n=== Type Detection ===');
console.log('susan.constructor.name:', susan?.constructor?.name);
console.log('walter.constructor.name:', walter?.constructor?.name);
