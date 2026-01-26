/**
 * compareBaselines.js
 *
 * Compares Phase 0 baseline to Session 39 capture to identify differences.
 *
 * Usage: cd /home/robert-benjamin/RPBprojects/VisionAppraisal/BIRAVA2025/BIRAVA2025/servers/Results
 *        node compareBaselines.js
 *
 * Created: January 17, 2026 (Session 39)
 */

const fs = require('fs');
const path = require('path');

// File paths
const PHASE0_MEMBERSHIP = path.join(__dirname, 'baseline/baseline_entitygroup_membership_2026-01-09T23-20-25.json');
const SESSION39_MEMBERSHIP = path.join(__dirname, 'baseline_entitygroup_membership_2026-01-17T21-22-14.json');

function compareBaselines() {
    console.log('=== BASELINE COMPARISON ===\n');

    // Load files
    console.log('Loading Phase 0 baseline...');
    const phase0 = JSON.parse(fs.readFileSync(PHASE0_MEMBERSHIP, 'utf8'));

    console.log('Loading Session 39 capture...');
    const session39 = JSON.parse(fs.readFileSync(SESSION39_MEMBERSHIP, 'utf8'));

    // Basic counts
    console.log('\n--- SUMMARY ---');
    console.log(`Phase 0 groups: ${phase0.totalGroups}`);
    console.log(`Session 39 groups: ${session39.totalGroups}`);
    console.log(`Difference: ${session39.totalGroups - phase0.totalGroups}`);

    // Entity counts
    const phase0Keys = new Set(Object.keys(phase0.membershipMapping));
    const session39Keys = new Set(Object.keys(session39.membershipMapping));

    console.log(`\nPhase 0 entities: ${phase0Keys.size}`);
    console.log(`Session 39 entities: ${session39Keys.size}`);

    // Entities missing or added
    const missingInSession39 = [...phase0Keys].filter(k => !session39Keys.has(k));
    const newInSession39 = [...session39Keys].filter(k => !phase0Keys.has(k));

    console.log(`\nEntities in Phase 0 but not Session 39: ${missingInSession39.length}`);
    if (missingInSession39.length > 0 && missingInSession39.length <= 20) {
        missingInSession39.forEach(k => console.log(`  - ${k}`));
    }

    console.log(`Entities in Session 39 but not Phase 0: ${newInSession39.length}`);
    if (newInSession39.length > 0 && newInSession39.length <= 20) {
        newInSession39.forEach(k => console.log(`  - ${k}`));
    }

    // Entities that changed groups
    console.log('\n--- ENTITIES THAT CHANGED GROUPS ---');
    const changedGroups = [];
    for (const key of phase0Keys) {
        if (session39Keys.has(key)) {
            const oldGroup = phase0.membershipMapping[key];
            const newGroup = session39.membershipMapping[key];
            if (oldGroup !== newGroup) {
                changedGroups.push({ key, oldGroup, newGroup });
            }
        }
    }
    console.log(`Total entities that changed groups: ${changedGroups.length}`);

    if (changedGroups.length > 0 && changedGroups.length <= 50) {
        changedGroups.forEach(c => {
            console.log(`  ${c.key}: group ${c.oldGroup} → group ${c.newGroup}`);
        });
    }

    // Size distribution comparison
    console.log('\n--- SIZE DISTRIBUTION CHANGES ---');
    const allSizes = new Set([
        ...Object.keys(phase0.sizeDistribution),
        ...Object.keys(session39.sizeDistribution)
    ]);

    let distributionDifferences = 0;
    for (const size of [...allSizes].sort((a, b) => Number(a) - Number(b))) {
        const p0 = phase0.sizeDistribution[size] || 0;
        const s39 = session39.sizeDistribution[size] || 0;
        if (p0 !== s39) {
            console.log(`  Size ${size}: ${p0} → ${s39} (${s39 - p0 >= 0 ? '+' : ''}${s39 - p0})`);
            distributionDifferences++;
        }
    }

    if (distributionDifferences === 0) {
        console.log('  No differences in size distribution');
    }

    // Find group indices that exist in one but not other
    console.log('\n--- GROUP INDEX ANALYSIS ---');
    const phase0GroupIndices = new Set(Object.values(phase0.membershipMapping));
    const session39GroupIndices = new Set(Object.values(session39.membershipMapping));

    console.log(`Unique group indices in Phase 0: ${phase0GroupIndices.size}`);
    console.log(`Unique group indices in Session 39: ${session39GroupIndices.size}`);

    // Build reverse mapping: groupIndex -> [entityKeys]
    const phase0Groups = {};
    for (const [key, groupIdx] of Object.entries(phase0.membershipMapping)) {
        if (!phase0Groups[groupIdx]) phase0Groups[groupIdx] = [];
        phase0Groups[groupIdx].push(key);
    }

    const session39Groups = {};
    for (const [key, groupIdx] of Object.entries(session39.membershipMapping)) {
        if (!session39Groups[groupIdx]) session39Groups[groupIdx] = [];
        session39Groups[groupIdx].push(key);
    }

    // Find groups that merged (2+ Phase 0 groups → 1 Session 39 group)
    console.log('\n--- POTENTIAL MERGES ---');
    const mergeAnalysis = new Map(); // session39GroupIdx -> Set of phase0GroupIndices

    for (const key of phase0Keys) {
        if (session39Keys.has(key)) {
            const p0Group = phase0.membershipMapping[key];
            const s39Group = session39.membershipMapping[key];

            if (!mergeAnalysis.has(s39Group)) {
                mergeAnalysis.set(s39Group, new Set());
            }
            mergeAnalysis.get(s39Group).add(p0Group);
        }
    }

    let mergesFound = 0;
    for (const [s39Group, p0Groups] of mergeAnalysis) {
        if (p0Groups.size > 1) {
            mergesFound++;
            console.log(`\n  Session 39 group ${s39Group} contains entities from Phase 0 groups: ${[...p0Groups].join(', ')}`);

            // Show members of each Phase 0 group
            for (const p0Group of p0Groups) {
                const members = phase0Groups[p0Group] || [];
                console.log(`    Phase 0 group ${p0Group} (${members.length} members):`);
                members.slice(0, 5).forEach(m => console.log(`      - ${m}`));
                if (members.length > 5) console.log(`      ... and ${members.length - 5} more`);
            }
        }
    }

    if (mergesFound === 0) {
        console.log('  No group merges detected');
    } else {
        console.log(`\n  Total merges found: ${mergesFound}`);
    }

    // Find groups that split (1 Phase 0 group → 2+ Session 39 groups)
    console.log('\n--- POTENTIAL SPLITS ---');
    const splitAnalysis = new Map(); // phase0GroupIdx -> Set of session39GroupIndices

    for (const key of phase0Keys) {
        if (session39Keys.has(key)) {
            const p0Group = phase0.membershipMapping[key];
            const s39Group = session39.membershipMapping[key];

            if (!splitAnalysis.has(p0Group)) {
                splitAnalysis.set(p0Group, new Set());
            }
            splitAnalysis.get(p0Group).add(s39Group);
        }
    }

    let splitsFound = 0;
    for (const [p0Group, s39Groups] of splitAnalysis) {
        if (s39Groups.size > 1) {
            splitsFound++;
            console.log(`\n  Phase 0 group ${p0Group} split into Session 39 groups: ${[...s39Groups].join(', ')}`);

            const members = phase0Groups[p0Group] || [];
            console.log(`    Original members (${members.length}):`);
            members.slice(0, 10).forEach(m => {
                const newGroup = session39.membershipMapping[m];
                console.log(`      - ${m} → group ${newGroup}`);
            });
            if (members.length > 10) console.log(`      ... and ${members.length - 10} more`);
        }
    }

    if (splitsFound === 0) {
        console.log('  No group splits detected');
    } else {
        console.log(`\n  Total splits found: ${splitsFound}`);
    }

    // =======================================================================
    // MEMBERSHIP SET COMPARISON (ignores group index numbers)
    // =======================================================================
    console.log('\n--- MEMBERSHIP SET COMPARISON (index-independent) ---');

    // Create canonical signature for each group: sorted member keys joined
    // This allows comparison regardless of what index number the group has

    function createGroupSignature(memberKeys) {
        return [...memberKeys].sort().join('|');
    }

    // Build signature -> members mapping for Phase 0
    const phase0Signatures = new Map(); // signature -> [memberKeys]
    for (const [groupIdx, members] of Object.entries(phase0Groups)) {
        const sig = createGroupSignature(members);
        phase0Signatures.set(sig, members);
    }

    // Build signature -> members mapping for Session 39
    const session39Signatures = new Map(); // signature -> [memberKeys]
    for (const [groupIdx, members] of Object.entries(session39Groups)) {
        const sig = createGroupSignature(members);
        session39Signatures.set(sig, members);
    }

    console.log(`Phase 0 unique group signatures: ${phase0Signatures.size}`);
    console.log(`Session 39 unique group signatures: ${session39Signatures.size}`);

    // Find groups that exist in Phase 0 but not Session 39 (by membership)
    const groupsOnlyInPhase0 = [];
    for (const [sig, members] of phase0Signatures) {
        if (!session39Signatures.has(sig)) {
            groupsOnlyInPhase0.push(members);
        }
    }

    // Find groups that exist in Session 39 but not Phase 0 (by membership)
    const groupsOnlyInSession39 = [];
    for (const [sig, members] of session39Signatures) {
        if (!phase0Signatures.has(sig)) {
            groupsOnlyInSession39.push(members);
        }
    }

    // Find groups that exist in both (identical membership)
    let identicalGroups = 0;
    for (const sig of phase0Signatures.keys()) {
        if (session39Signatures.has(sig)) {
            identicalGroups++;
        }
    }

    console.log(`\nGroups with IDENTICAL membership in both: ${identicalGroups}`);
    console.log(`Groups only in Phase 0 (disbanded/merged): ${groupsOnlyInPhase0.length}`);
    console.log(`Groups only in Session 39 (new/merged): ${groupsOnlyInSession39.length}`);

    // Show details of groups that differ
    if (groupsOnlyInPhase0.length > 0) {
        console.log('\n  Groups that existed in Phase 0 but NOT in Session 39:');
        groupsOnlyInPhase0.forEach((members, i) => {
            const p0Idx = phase0.membershipMapping[members[0]];
            console.log(`\n    Phase 0 group ${p0Idx} (${members.length} members):`);
            members.slice(0, 8).forEach(m => {
                const s39Idx = session39.membershipMapping[m];
                console.log(`      - ${m}`);
                console.log(`        (now in Session 39 group ${s39Idx})`);
            });
            if (members.length > 8) console.log(`      ... and ${members.length - 8} more`);
        });
    }

    if (groupsOnlyInSession39.length > 0) {
        console.log('\n  Groups that exist in Session 39 but NOT in Phase 0:');
        groupsOnlyInSession39.forEach((members, i) => {
            const s39Idx = session39.membershipMapping[members[0]];
            console.log(`\n    Session 39 group ${s39Idx} (${members.length} members):`);
            members.slice(0, 8).forEach(m => {
                const p0Idx = phase0.membershipMapping[m];
                console.log(`      - ${m}`);
                console.log(`        (was in Phase 0 group ${p0Idx})`);
            });
            if (members.length > 8) console.log(`      ... and ${members.length - 8} more`);
        });
    }

    // Final verdict
    console.log('\n--- VERDICT ---');
    if (groupsOnlyInPhase0.length === 0 && groupsOnlyInSession39.length === 0) {
        console.log('✓ ALL group memberships are IDENTICAL (only index numbers differ)');
        console.log('  The 669 "changed groups" were just index renumbering, not actual changes.');
    } else {
        console.log(`✗ Found ${groupsOnlyInPhase0.length + groupsOnlyInSession39.length} actual membership differences`);
        console.log('  These represent real changes in how entities are grouped.');
    }

    console.log('\n=== COMPARISON COMPLETE ===');
}

// Run comparison
compareBaselines();
