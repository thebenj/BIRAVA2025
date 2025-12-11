/**
 * Debug script to compare PID:184107 vs PID:184109
 * Analyze Matches shows 81.55%, need to verify CSV shows same
 *
 * Run in browser console:
 * fetch('./scripts/testing/debugScoreDiscrepancy3.js').then(r => r.text()).then(eval)
 */

function debugPair(pid1, pid2) {
    console.log('='.repeat(60));
    console.log(`DEBUG: PID:${pid1} vs PID:${pid2}`);
    console.log('='.repeat(60));

    const entity1 = getVisionAppraisalEntity('PID', String(pid1));
    const entity2 = getVisionAppraisalEntity('PID', String(pid2));

    if (!entity1) {
        console.error(`Entity PID:${pid1} not found`);
        return;
    }
    if (!entity2) {
        console.error(`Entity PID:${pid2} not found`);
        return;
    }

    console.log('\n--- Entity Info ---');
    console.log(`Entity 1 (PID:${pid1}): ${entity1.name?.completeName}`);
    console.log(`  firstName: "${entity1.name?.firstName}", lastName: "${entity1.name?.lastName}"`);
    console.log(`Entity 2 (PID:${pid2}): ${entity2.name?.completeName}`);
    console.log(`  firstName: "${entity2.name?.firstName}", lastName: "${entity2.name?.lastName}"`);

    // Direct comparison
    console.log('\n--- Direct entity.compareTo() ---');
    const score = entity1.compareTo(entity2, false);
    const detailed = entity1.compareTo(entity2, true);
    console.log(`Score: ${score}`);
    console.log(`Percentage: ${(score * 100).toFixed(2)}%`);

    // universalCompareTo
    console.log('\n--- universalCompareTo() ---');
    if (typeof universalCompareTo === 'function') {
        const result = universalCompareTo(entity1, entity2);
        console.log(`Score: ${result.score}`);
        console.log(`Percentage: ${(result.score * 100).toFixed(2)}%`);
    } else {
        console.warn('universalCompareTo not loaded');
    }

    // Component breakdown
    console.log('\n--- Component Breakdown ---');
    console.log('Detailed result:', detailed);

    if (detailed.components) {
        for (const [comp, data] of Object.entries(detailed.components)) {
            console.log(`  ${comp}: similarity=${(data.similarity * 100).toFixed(2)}%, weight=${(data.actualWeight * 100).toFixed(2)}%, contribution=${(data.weightedValue * 100).toFixed(2)}%`);
        }
    }

    // Name comparison details
    console.log('\n--- Name Comparison ---');
    if (entity1.name && entity2.name) {
        const nameDetailed = entity1.name.compareTo(entity2.name, true);
        console.log(`Name score: ${(nameDetailed.overallSimilarity * 100).toFixed(2)}%`);
        console.log(`Method: ${nameDetailed.method}`);
        console.log(`Weighted: ${nameDetailed.weightedScore}`);
        console.log(`Permutation: ${nameDetailed.permutationScore}`);
        if (nameDetailed.components) {
            console.log('Name components:');
            for (const [comp, data] of Object.entries(nameDetailed.components)) {
                console.log(`  ${comp}: similarity=${(data.similarity * 100).toFixed(2)}%, weight=${(data.weight * 100).toFixed(2)}%`);
            }
        }
    }

    // ContactInfo comparison details
    console.log('\n--- ContactInfo Comparison ---');
    if (entity1.contactInfo && entity2.contactInfo) {
        const contactScore = entity1.contactInfo.compareTo(entity2.contactInfo, false);
        const contactDetailed = entity1.contactInfo.compareTo(entity2.contactInfo, true);
        console.log(`ContactInfo score: ${(contactScore * 100).toFixed(2)}%`);
        console.log('ContactInfo detailed:', contactDetailed);
    } else {
        console.log('Missing contactInfo on one or both entities');
    }

    // Address comparison
    console.log('\n--- Address Comparison ---');
    const addr1 = entity1.contactInfo?.primaryAddress;
    const addr2 = entity2.contactInfo?.primaryAddress;
    if (addr1 && addr2) {
        console.log(`Entity 1 address: ${addr1.streetNumber?.term || ''} ${addr1.streetName?.term || ''}, ${addr1.city?.term || ''}`);
        console.log(`Entity 2 address: ${addr2.streetNumber?.term || ''} ${addr2.streetName?.term || ''}, ${addr2.city?.term || ''}`);
        if (typeof addr1.compareTo === 'function') {
            const addrScore = addr1.compareTo(addr2, false);
            console.log(`Address score: ${(addrScore * 100).toFixed(2)}%`);
        }
    }

    console.log('\n' + '='.repeat(60));

    return { entity1, entity2, score, detailed };
}

// Run the specific comparison
const result = debugPair(184107, 184109);

window.debugPair = debugPair;
console.log('\nFunction available: debugPair(pid1, pid2)');
