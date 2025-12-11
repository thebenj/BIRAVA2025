/**
 * Debug script to investigate score discrepancy between:
 * - Reconcile modal (via universalCompareTo)
 * - compareToStudy (via direct entity.compareTo)
 *
 * Run in browser console after loading entities:
 * fetch('./scripts/testing/debugScoreDiscrepancy.js').then(r => r.text()).then(eval)
 */

function debugScoreDiscrepancy(pid1, pid2) {
    console.log('='.repeat(60));
    console.log(`DEBUG: Score Discrepancy for PID:${pid1} vs PID:${pid2}`);
    console.log('='.repeat(60));

    // Get entities by PID
    const entity1 = getVisionAppraisalEntity('PID', String(pid1));
    const entity2 = getVisionAppraisalEntity('PID', String(pid2));

    if (!entity1) {
        console.error(`Entity with PID ${pid1} not found`);
        return;
    }
    if (!entity2) {
        console.error(`Entity with PID ${pid2} not found`);
        return;
    }

    console.log('\n--- Entity Info ---');
    console.log(`Entity 1 (PID:${pid1}):`, entity1.name?.completeName || entity1.name?.firstName + ' ' + entity1.name?.lastName);
    console.log(`Entity 2 (PID:${pid2}):`, entity2.name?.completeName || entity2.name?.firstName + ' ' + entity2.name?.lastName);
    console.log(`Entity 1 type:`, entity1.constructor?.name);
    console.log(`Entity 2 type:`, entity2.constructor?.name);

    // Method 1: Direct Entity.compareTo (what compareToStudy uses)
    console.log('\n--- Method 1: Direct entity.compareTo() [compareToStudy path] ---');
    const score1_detailed_false = entity1.compareTo(entity2, false);
    const score1_detailed_true = entity1.compareTo(entity2, true);
    console.log(`entity1.compareTo(entity2, false) = ${score1_detailed_false}`);
    console.log(`entity1.compareTo(entity2, true).overallSimilarity = ${score1_detailed_true.overallSimilarity}`);
    console.log(`Percentage (false): ${(score1_detailed_false * 100).toFixed(2)}%`);
    console.log(`Percentage (true):  ${(score1_detailed_true.overallSimilarity * 100).toFixed(2)}%`);

    // Method 2: universalCompareTo (what Reconcile modal uses)
    console.log('\n--- Method 2: universalCompareTo() [Reconcile modal path] ---');
    if (typeof universalCompareTo === 'function') {
        const result2 = universalCompareTo(entity1, entity2);
        console.log(`universalCompareTo result:`, result2);
        console.log(`Score from universalCompareTo: ${result2.score}`);
        console.log(`Percentage: ${(result2.score * 100).toFixed(2)}%`);
    } else {
        console.error('universalCompareTo not loaded. Run: fetch("./scripts/matching/universalEntityMatcher.js").then(r => r.text()).then(eval)');
    }

    // Check both directions
    console.log('\n--- Direction Check (A->B vs B->A) ---');
    const scoreAtoB = entity1.compareTo(entity2, false);
    const scoreBtoA = entity2.compareTo(entity1, false);
    console.log(`A->B: ${(scoreAtoB * 100).toFixed(4)}%`);
    console.log(`B->A: ${(scoreBtoA * 100).toFixed(4)}%`);
    console.log(`Symmetric: ${scoreAtoB === scoreBtoA ? 'YES' : 'NO - ASYMMETRIC!'}`);

    // Check name comparison directly
    console.log('\n--- Name Comparison Details ---');
    if (entity1.name && entity2.name) {
        const nameScore_false = entity1.name.compareTo(entity2.name, false);
        const nameScore_true = entity1.name.compareTo(entity2.name, true);
        console.log(`Name compareTo (false): ${nameScore_false}`);
        console.log(`Name compareTo (true):`, nameScore_true);
        console.log(`Name percentage: ${(nameScore_false * 100).toFixed(2)}%`);
        console.log(`Method used: ${nameScore_true.method}`);
        console.log(`Weighted score: ${nameScore_true.weightedScore}`);
        console.log(`Permutation score: ${nameScore_true.permutationScore}`);
    }

    // Check contactInfo comparison
    console.log('\n--- ContactInfo Comparison Details ---');
    if (entity1.contactInfo && entity2.contactInfo) {
        const contactScore_false = entity1.contactInfo.compareTo(entity2.contactInfo, false);
        const contactScore_true = entity1.contactInfo.compareTo(entity2.contactInfo, true);
        console.log(`ContactInfo compareTo (false): ${contactScore_false}`);
        console.log(`ContactInfo percentage: ${(contactScore_false * 100).toFixed(2)}%`);
    } else {
        console.log('One or both entities missing contactInfo');
        console.log(`Entity 1 contactInfo:`, entity1.contactInfo);
        console.log(`Entity 2 contactInfo:`, entity2.contactInfo);
    }

    // Check calculator being used
    console.log('\n--- Calculator Info ---');
    console.log(`Entity 1 calculator name: ${entity1.comparisonCalculatorName}`);
    console.log(`Entity 1 calculator: ${entity1.comparisonCalculator?.name || typeof entity1.comparisonCalculator}`);
    console.log(`Entity 2 calculator name: ${entity2.comparisonCalculatorName}`);

    console.log('\n' + '='.repeat(60));
    console.log('DEBUG COMPLETE');
    console.log('='.repeat(60));

    return {
        entity1, entity2,
        directScore: score1_detailed_false,
        detailedResult: score1_detailed_true
    };
}

// Expose to global scope
window.debugScoreDiscrepancy = debugScoreDiscrepancy;

console.log('Debug script loaded. Run: debugScoreDiscrepancy(184107, 184433)');
