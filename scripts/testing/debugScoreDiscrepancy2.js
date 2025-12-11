/**
 * Debug script to compare the CORRECT entities from the CSV
 * PID:184108 (ROBERT ROHN) vs ROHN ROBERT entity
 *
 * Run in browser console after loading entities:
 * fetch('./scripts/testing/debugScoreDiscrepancy2.js').then(r => r.text()).then(eval)
 */

function findRohnRobertEntities() {
    console.log('='.repeat(60));
    console.log('Searching for ROHN ROBERT entities...');
    console.log('='.repeat(60));

    const matches = [];

    // Search VisionAppraisal
    if (workingLoadedEntities.visionAppraisal?.entities) {
        workingLoadedEntities.visionAppraisal.entities.forEach((entity, idx) => {
            const name = entity.name?.completeName ||
                (entity.name?.firstName + ' ' + entity.name?.lastName) || '';
            if (name.toUpperCase().includes('ROHN') && name.toUpperCase().includes('ROBERT')) {
                const pid = entity.locationIdentifier?.primaryAlias?.term || 'unknown';
                matches.push({
                    source: 'VisionAppraisal',
                    index: idx,
                    pid: pid,
                    name: name,
                    firstName: entity.name?.firstName,
                    lastName: entity.name?.lastName,
                    entity: entity
                });
            }
        });
    }

    // Search Bloomerang
    if (workingLoadedEntities.bloomerang?.individuals?.entities) {
        Object.entries(workingLoadedEntities.bloomerang.individuals.entities).forEach(([key, entity]) => {
            const name = entity.name?.completeName ||
                (entity.name?.firstName + ' ' + entity.name?.lastName) || '';
            if (name.toUpperCase().includes('ROHN') && name.toUpperCase().includes('ROBERT')) {
                matches.push({
                    source: 'Bloomerang',
                    key: key,
                    name: name,
                    firstName: entity.name?.firstName,
                    lastName: entity.name?.lastName,
                    accountNumber: entity.accountNumber,
                    entity: entity
                });
            }
        });
    }

    console.log(`Found ${matches.length} entities with ROHN and ROBERT:`);
    matches.forEach((m, i) => {
        console.log(`  ${i+1}. [${m.source}] ${m.name} (PID:${m.pid || m.key || m.accountNumber})`);
        console.log(`      firstName: "${m.firstName}", lastName: "${m.lastName}"`);
    });

    return matches;
}

function debugCorrectPair() {
    console.log('\n' + '='.repeat(60));
    console.log('DEBUG: Correct pair from CSV - PID:184108 vs ROHN ROBERT');
    console.log('='.repeat(60));

    // Get PID:184108
    const entity1 = getVisionAppraisalEntity('PID', '184108');
    if (!entity1) {
        console.error('Entity PID:184108 not found');
        return;
    }
    console.log('\nEntity 1 (PID:184108):');
    console.log(`  Name: ${entity1.name?.completeName}`);
    console.log(`  firstName: "${entity1.name?.firstName}"`);
    console.log(`  lastName: "${entity1.name?.lastName}"`);

    // Find ROHN ROBERT - search for it
    const rohnRobertMatches = findRohnRobertEntities();

    // Filter to find "ROHN ROBERT" specifically (firstName=ROHN, lastName=ROBERT or vice versa)
    const rohnRobertEntity = rohnRobertMatches.find(m =>
        m.source === 'VisionAppraisal' &&
        m.name.toUpperCase().startsWith('ROHN ROBERT') &&
        m.pid !== '184108'
    );

    if (!rohnRobertEntity) {
        console.error('Could not find ROHN ROBERT entity');

        // Try all potential matches
        console.log('\nTrying all ROHN/ROBERT matches against PID:184108:');
        rohnRobertMatches.forEach(m => {
            if (m.entity !== entity1) {
                const score = entity1.compareTo(m.entity, false);
                console.log(`  vs ${m.name} (${m.source}:${m.pid || m.accountNumber}): ${(score * 100).toFixed(2)}%`);
            }
        });
        return;
    }

    const entity2 = rohnRobertEntity.entity;
    console.log('\nEntity 2 (ROHN ROBERT):');
    console.log(`  Name: ${entity2.name?.completeName}`);
    console.log(`  firstName: "${entity2.name?.firstName}"`);
    console.log(`  lastName: "${entity2.name?.lastName}"`);
    console.log(`  PID: ${rohnRobertEntity.pid}`);

    // Compare
    console.log('\n--- Comparison ---');
    const score = entity1.compareTo(entity2, false);
    const detailed = entity1.compareTo(entity2, true);
    console.log(`Score: ${score}`);
    console.log(`Percentage: ${(score * 100).toFixed(2)}%`);
    console.log(`Detailed:`, detailed);

    // Name comparison
    console.log('\n--- Name Comparison ---');
    const nameScore = entity1.name.compareTo(entity2.name, true);
    console.log(`Name score: ${(nameScore.overallSimilarity * 100).toFixed(2)}%`);
    console.log(`Method: ${nameScore.method}`);
    console.log(`Weighted: ${nameScore.weightedScore}`);
    console.log(`Permutation: ${nameScore.permutationScore}`);
}

// Run immediately
findRohnRobertEntities();
debugCorrectPair();

window.findRohnRobertEntities = findRohnRobertEntities;
window.debugCorrectPair = debugCorrectPair;

console.log('\nFunctions available: findRohnRobertEntities(), debugCorrectPair()');
