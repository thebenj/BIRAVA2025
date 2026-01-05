/**
 * Mail Merge Collapsing Diagnostic
 *
 * Investigates why certain entity groups aren't collapsing in mail merge
 * when their secondary addresses appear similar.
 *
 * Usage: Run in browser console after loading unified entity database
 */

function diagnoseMailMergeCollapsing(groupIndex) {
    const db = window.entityGroupDatabase;
    const entityDb = window.unifiedEntityDatabase;

    if (!db || !entityDb) {
        console.error("Databases not loaded");
        return;
    }

    const group = Object.values(db.groups).find(g => g.index === groupIndex);
    if (!group) {
        console.error(`Group ${groupIndex} not found`);
        return;
    }

    console.log("=".repeat(80));
    console.log(`DIAGNOSING GROUP ${groupIndex}`);
    console.log("=".repeat(80));

    const memberKeys = group.memberKeys || [];
    console.log(`\nMember count: ${memberKeys.length}`);

    // Get threshold
    const threshold = window.MATCH_CRITERIA?.trueMatch?.contactInfoAlone || 0.87;
    console.log(`Contact info threshold: ${threshold}`);

    // Show all members and their secondary addresses
    console.log("\n--- MEMBERS AND SECONDARY ADDRESSES ---");
    for (const key of memberKeys) {
        const entity = entityDb.entities[key];
        if (!entity) {
            console.log(`  ${key}: NOT FOUND`);
            continue;
        }

        const name = entity.name?.primaryAlias?.term || entity.name?.term || 'Unknown';
        const secAddr = entity.contactInfo?.secondaryAddress?.[0];

        console.log(`\n  KEY: ${key}`);
        console.log(`  NAME: ${name}`);

        if (secAddr) {
            console.log(`  SECONDARY ADDRESS:`);
            console.log(`    primaryAlias.term: "${secAddr.primaryAlias?.term || 'null'}"`);
            console.log(`    streetNum: "${secAddr.streetNum || 'null'}"`);
            console.log(`    streetName: "${secAddr.streetName || 'null'}"`);
            console.log(`    city: "${secAddr.city || 'null'}"`);
            console.log(`    state: "${secAddr.state || 'null'}"`);
            console.log(`    zip: "${secAddr.zip || 'null'}"`);
            console.log(`    secUnitNum: "${secAddr.secUnitNum || 'null'}"`);
            console.log(`    isPOBox: ${typeof isPOBoxAddress === 'function' ? isPOBoxAddress(secAddr) : 'function not available'}`);
        } else {
            console.log(`  SECONDARY ADDRESS: NONE`);
        }
    }

    // Compare all pairs
    console.log("\n--- PAIRWISE COMPARISONS ---");
    for (let i = 0; i < memberKeys.length; i++) {
        for (let j = i + 1; j < memberKeys.length; j++) {
            const key1 = memberKeys[i];
            const key2 = memberKeys[j];
            const entity1 = entityDb.entities[key1];
            const entity2 = entityDb.entities[key2];

            if (!entity1 || !entity2) continue;

            console.log(`\n  COMPARING: ${key1} vs ${key2}`);

            // Use universalCompareTo
            const comparison = universalCompareTo(entity1, entity2);
            const contactInfoScore = comparison.details?.components?.contactInfo?.similarity;
            const nameScore = comparison.details?.components?.name?.similarity;

            console.log(`    Overall score: ${comparison.score?.toFixed(4) || 'null'}`);
            console.log(`    Name score: ${nameScore?.toFixed(4) || 'null'}`);
            console.log(`    ContactInfo score: ${contactInfoScore?.toFixed(4) || 'null'}`);
            console.log(`    Passes threshold (${threshold}): ${contactInfoScore > threshold}`);

            // Also compare secondary addresses directly if both exist
            const sec1 = entity1.contactInfo?.secondaryAddress?.[0];
            const sec2 = entity2.contactInfo?.secondaryAddress?.[0];

            if (sec1 && sec2) {
                console.log(`\n    DIRECT SECONDARY ADDRESS COMPARISON:`);

                // Try Address.compareTo if available
                if (typeof sec1.compareTo === 'function') {
                    const addrScore = sec1.compareTo(sec2);
                    console.log(`      Address.compareTo(): ${addrScore?.toFixed(4) || 'null'}`);
                }

                // Compare primaryAlias.term strings
                const term1 = sec1.primaryAlias?.term;
                const term2 = sec2.primaryAlias?.term;
                if (term1 && term2) {
                    const termSim = levenshteinSimilarity(term1, term2);
                    console.log(`      primaryAlias.term similarity: ${termSim.toFixed(4)}`);
                    console.log(`        term1: "${term1}"`);
                    console.log(`        term2: "${term2}"`);
                }

                // Compare individual components
                console.log(`\n    COMPONENT-BY-COMPONENT:`);
                console.log(`      streetNum: "${sec1.streetNum}" vs "${sec2.streetNum}"`);
                console.log(`      streetName: "${sec1.streetName}" vs "${sec2.streetName}"`);
                console.log(`      city: "${sec1.city}" vs "${sec2.city}"`);
                console.log(`      state: "${sec1.state}" vs "${sec2.state}"`);
                console.log(`      zip: "${sec1.zip}" vs "${sec2.zip}"`);
            }
        }
    }

    console.log("\n" + "=".repeat(80));
}

// Also expose a function to find groups by fire number
function findGroupByFireNumber(fireNum) {
    const key = `visionAppraisal:FireNumber:${fireNum}`;
    const db = window.entityGroupDatabase;

    for (const group of Object.values(db.groups)) {
        if (group.memberKeys?.includes(key) || group.foundingMemberKey === key) {
            return group;
        }
    }
    return null;
}

console.log("Mail Merge Collapsing Diagnostic loaded.");
console.log("Usage: diagnoseMailMergeCollapsing(groupIndex)");
console.log("       findGroupByFireNumber(fireNum)");
