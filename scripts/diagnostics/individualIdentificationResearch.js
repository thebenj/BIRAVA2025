/**
 * individualIdentificationResearch.js - Phase 2 Research for Consensus Building Enhancement
 *
 * PURPOSE: Analyze entity groups to understand individual identification patterns.
 * This research code examines how individuals are distributed within entity groups
 * and calculates similarity scores to understand when names should be considered
 * the same vs different individuals.
 *
 * PREREQUISITES:
 * - EntityGroup database must be loaded (entityGroupBrowser.loadedDatabase)
 * - Unified entity database must be loaded (window.unifiedEntityDatabase)
 *
 * USAGE:
 *   // Run full analysis
 *   const results = analyzeIndividualIdentification();
 *
 *   // Access specific parts
 *   results.summary           // High-level statistics
 *   results.multiNameGroups   // Groups with multiple distinct name clusters
 *   results.groupDetails      // Detailed analysis per group
 *
 * Created: 2026-01-28 (Session 66 - Phase 2 Research)
 * Reference: reference_consensusBuildingEnhancement.md
 */

// =============================================================================
// MAIN ANALYSIS FUNCTION
// =============================================================================

/**
 * Analyze individual identification across all entity groups
 * @returns {Object} Analysis results with summary, multiNameGroups, and groupDetails
 */
function analyzeIndividualIdentification() {
    console.log('=== INDIVIDUAL IDENTIFICATION RESEARCH ===');
    console.log(`Timestamp: ${new Date().toISOString()}`);

    // Check prerequisites
    const db = entityGroupBrowser?.loadedDatabase;
    if (!db) {
        console.error('No EntityGroup database loaded. Load one first.');
        return null;
    }

    const entityDb = window.unifiedEntityDatabase?.entities;
    if (!entityDb) {
        console.error('No unified entity database loaded. Load it first.');
        return null;
    }

    // Get true match threshold for names
    const nameThreshold = window.MATCH_CRITERIA?.trueMatch?.nameAlone || 0.875;
    console.log(`Using name true match threshold: ${nameThreshold}`);

    // Find all groups that contain individuals
    const groupsWithIndividuals = findGroupsWithIndividuals(db, entityDb);
    console.log(`Found ${groupsWithIndividuals.length} groups containing individuals`);

    // Analyze each group
    const groupDetails = [];
    const multiNameGroups = [];
    let singleIndividualGroups = 0;
    let singleNameClusterGroups = 0;

    for (const groupData of groupsWithIndividuals) {
        const { group, individuals } = groupData;

        if (individuals.length === 1) {
            singleIndividualGroups++;
            continue;
        }

        // Calculate pairwise similarities and cluster names
        const analysis = analyzeGroupIndividuals(individuals, nameThreshold);
        groupDetails.push({
            groupIndex: group.index,
            individualCount: individuals.length,
            ...analysis
        });

        if (analysis.nameClusters.length === 1) {
            singleNameClusterGroups++;
        } else if (analysis.nameClusters.length > 1) {
            multiNameGroups.push({
                groupIndex: group.index,
                individualCount: individuals.length,
                clusterCount: analysis.nameClusters.length,
                keyNames: analysis.nameClusters.map(c => c.keyName),
                interClusterScores: analysis.interClusterScores
            });
        }
    }

    // Build summary
    const summary = {
        totalGroupsAnalyzed: groupsWithIndividuals.length,
        singleIndividualGroups,
        multiIndividualGroups: groupsWithIndividuals.length - singleIndividualGroups,
        singleNameClusterGroups,
        multiNameClusterGroups: multiNameGroups.length,
        nameThresholdUsed: nameThreshold
    };

    console.log('\n=== SUMMARY ===');
    console.log(`Total groups with individuals: ${summary.totalGroupsAnalyzed}`);
    console.log(`  - Single individual (ignored): ${summary.singleIndividualGroups}`);
    console.log(`  - Multiple individuals: ${summary.multiIndividualGroups}`);
    console.log(`    - Collapsed to single name cluster: ${summary.singleNameClusterGroups}`);
    console.log(`    - Multiple distinct name clusters: ${summary.multiNameClusterGroups}`);

    if (multiNameGroups.length > 0) {
        console.log('\n=== GROUPS WITH MULTIPLE DISTINCT INDIVIDUALS ===');
        for (const mg of multiNameGroups.slice(0, 20)) { // Show first 20
            console.log(`Group ${mg.groupIndex}: ${mg.clusterCount} distinct individuals`);
            console.log(`  Key names: ${mg.keyNames.join(' | ')}`);
            if (mg.interClusterScores.length > 0) {
                console.log(`  Inter-cluster similarity scores:`);
                for (const score of mg.interClusterScores) {
                    console.log(`    "${score.name1}" vs "${score.name2}": ${score.similarity.toFixed(3)}`);
                }
            }
        }
        if (multiNameGroups.length > 20) {
            console.log(`... and ${multiNameGroups.length - 20} more groups`);
        }
    }

    const results = {
        summary,
        multiNameGroups,
        groupDetails
    };

    // Store globally for inspection
    window.individualIdentificationResults = results;
    console.log('\nResults stored in window.individualIdentificationResults');

    // Auto-export to CSV
    exportResultsToCSV(results);

    return results;
}

/**
 * Export analysis results to CSV with new group-per-section format
 *
 * Format:
 * - Each group has a header row: GroupIndex | AllKeyNames | KeyNameCount | Pair1Names | Pair1Score | Pair2Names | Pair2Score | ...
 * - Followed by data rows showing cluster members under each pair
 * - Max 4 key names = max 6 pairwise comparisons
 *
 * @param {Object} results - Results from analyzeIndividualIdentification()
 */
function exportResultsToCSV(results) {
    if (!results || !results.groupDetails) {
        console.error('No results to export');
        return;
    }

    const db = entityGroupBrowser?.loadedDatabase;
    const entityDb = window.unifiedEntityDatabase?.entities;

    if (!db || !entityDb) {
        console.error('Databases not loaded - cannot export detailed format');
        return;
    }

    const rows = [];

    // Filter to groups with multiple clusters and sort
    const multiClusterGroups = results.groupDetails
        .filter(g => g.nameClusters && g.nameClusters.length > 1)
        .sort((a, b) => {
            // Primary sort: number of key names (clusters) descending
            const clusterDiff = b.nameClusters.length - a.nameClusters.length;
            if (clusterDiff !== 0) return clusterDiff;

            // Secondary sort: max cluster size (determines row count) descending
            const maxSizeA = Math.max(...a.nameClusters.map(c => c.members.length));
            const maxSizeB = Math.max(...b.nameClusters.map(c => c.members.length));
            return maxSizeB - maxSizeA;
        });

    // Process each group with multiple name clusters
    for (const groupDetail of multiClusterGroups) {

        const group = db.groups[groupDetail.groupIndex];
        if (!group) continue;

        // Re-collect individuals to get full details
        const individuals = collectIndividualsFromGroup(group, entityDb);
        const nameClusters = groupDetail.nameClusters;
        const interClusterScores = groupDetail.interClusterScores || [];

        // Build header row
        const headerRow = [];
        headerRow.push(groupDetail.groupIndex); // Column 0: GroupIndex
        headerRow.push(escapeCSV(nameClusters.map(c => c.keyName).join(' | '))); // Column 1: AllKeyNames
        headerRow.push(nameClusters.length); // Column 2: KeyNameCount

        // Add pair columns (up to 6 pairs for 4 key names)
        for (const score of interClusterScores) {
            headerRow.push(escapeCSV(`${score.name1} | ${score.name2}`)); // Pair names
            headerRow.push(score.similarity.toFixed(4)); // Pair score
        }

        rows.push(headerRow.join(','));

        // Build data rows - show cluster members under each pair
        // Find the maximum cluster size to determine row count
        const maxClusterSize = Math.max(...nameClusters.map(c => c.members.length));

        for (let rowIdx = 0; rowIdx < maxClusterSize; rowIdx++) {
            const dataRow = [];
            dataRow.push(''); // Empty GroupIndex column
            dataRow.push(''); // Empty AllKeyNames column
            dataRow.push(''); // Empty KeyNameCount column

            // For each pairwise comparison, show members from both clusters
            for (const score of interClusterScores) {
                const cluster1 = nameClusters[score.cluster1];
                const cluster2 = nameClusters[score.cluster2];

                // Get member name for cluster1 at this row index
                const member1Idx = cluster1.members[rowIdx];
                const member1Name = member1Idx !== undefined ? getNameString(individuals[member1Idx].name) : '';

                // Get member name for cluster2 at this row index
                const member2Idx = cluster2.members[rowIdx];
                const member2Name = member2Idx !== undefined ? getNameString(individuals[member2Idx].name) : '';

                dataRow.push(escapeCSV(member1Name));
                dataRow.push(escapeCSV(member2Name));
            }

            rows.push(dataRow.join(','));
        }

        // Add empty row between groups for readability
        rows.push('');
    }

    const csvContent = rows.join('\n');

    // Download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `individual_identification_research_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const groupCount = results.groupDetails.filter(g => g.nameClusters && g.nameClusters.length > 1).length;
    console.log(`\nCSV exported: ${groupCount} groups with multiple distinct individuals`);
}

/**
 * Escape a value for CSV (handle commas, quotes, newlines)
 * @param {string} value - Value to escape
 * @returns {string} Escaped value
 */
function escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Find all entity groups that contain individuals
 * @param {EntityGroupDatabase} db - The entity group database
 * @param {Object} entityDb - The unified entity database
 * @returns {Array} Array of {group, individuals} objects
 */
function findGroupsWithIndividuals(db, entityDb) {
    const results = [];

    for (const group of Object.values(db.groups)) {
        const individuals = collectIndividualsFromGroup(group, entityDb);
        if (individuals.length > 0) {
            results.push({ group, individuals });
        }
    }

    return results;
}

/**
 * Collect all individuals from an entity group
 * Handles both standalone Individual entities and individuals within AggregateHouseholds
 * Creates keyed clones for VisionAppraisal household individuals that lack keys
 *
 * @param {EntityGroup} group - The entity group
 * @param {Object} entityDb - The unified entity database
 * @returns {Array} Array of individual objects with keys
 */
function collectIndividualsFromGroup(group, entityDb) {
    const individuals = [];

    for (const memberKey of group.memberKeys) {
        const entity = entityDb[memberKey];
        if (!entity) continue;

        const entityType = entity.type || entity.__type || entity.constructor?.name;

        if (entityType === 'Individual') {
            // Standalone individual entity - already has a key
            // Skip if no name (can't compare)
            if (entity.name) {
                individuals.push({
                    key: memberKey,
                    name: entity.name,
                    entity: entity,
                    source: 'standalone'
                });
            }
        } else if (entityType === 'AggregateHousehold') {
            // Check for individuals array within the household
            if (entity.individuals && Array.isArray(entity.individuals)) {
                entity.individuals.forEach((individual, index) => {
                    // Skip null/undefined individuals or those without names
                    if (!individual || !individual.name) return;

                    // Create a synthetic key for VA household individuals
                    // Pattern: parentKey:individual:index
                    const syntheticKey = `${memberKey}:individual:${index}`;

                    individuals.push({
                        key: syntheticKey,
                        name: individual.name,
                        entity: individual,
                        source: 'household',
                        parentKey: memberKey,
                        indexInParent: index
                    });
                });
            }
        }
    }

    return individuals;
}

/**
 * Analyze individuals within a group
 * Calculates pairwise name similarities and clusters matching names
 *
 * @param {Array} individuals - Array of individual objects from collectIndividualsFromGroup
 * @param {number} threshold - True match threshold for names
 * @returns {Object} Analysis results with nameClusters, pairwiseScores, interClusterScores
 */
function analyzeGroupIndividuals(individuals, threshold) {
    // Calculate all pairwise name similarity scores
    const pairwiseScores = [];

    for (let i = 0; i < individuals.length; i++) {
        for (let j = i + 1; j < individuals.length; j++) {
            const score = compareNames(individuals[i].name, individuals[j].name);
            pairwiseScores.push({
                i,
                j,
                keyI: individuals[i].key,
                keyJ: individuals[j].key,
                nameI: getNameString(individuals[i].name),
                nameJ: getNameString(individuals[j].name),
                similarity: score
            });
        }
    }

    // Cluster individuals whose names are true matches
    const nameClusters = clusterByNameSimilarity(individuals, pairwiseScores, threshold);

    // For each cluster, find the key name (highest average similarity)
    for (const cluster of nameClusters) {
        const result = selectKeyName(cluster.members, individuals, pairwiseScores);
        cluster.keyName = result.keyName;
        cluster.keyMemberIndex = result.keyMemberIndex;
    }

    // Calculate inter-cluster similarity scores (between key names of different clusters)
    const interClusterScores = [];
    if (nameClusters.length > 1) {
        for (let i = 0; i < nameClusters.length; i++) {
            for (let j = i + 1; j < nameClusters.length; j++) {
                const keyIndividualI = individuals[nameClusters[i].keyMemberIndex];
                const keyIndividualJ = individuals[nameClusters[j].keyMemberIndex];
                const score = compareNames(keyIndividualI.name, keyIndividualJ.name);

                interClusterScores.push({
                    cluster1: i,
                    cluster2: j,
                    name1: nameClusters[i].keyName,
                    name2: nameClusters[j].keyName,
                    similarity: score
                });
            }
        }
    }

    return {
        pairwiseScores,
        nameClusters,
        interClusterScores
    };
}

/**
 * Compare two names and return similarity score
 * @param {Object} name1 - First name (Aliased or has compareTo method)
 * @param {Object} name2 - Second name
 * @returns {number} Similarity score 0-1
 */
function compareNames(name1, name2) {
    if (!name1 || !name2) return 0;

    try {
        if (typeof name1.compareTo === 'function') {
            return name1.compareTo(name2);
        }
    } catch (e) {
        console.warn('Error comparing names:', e);
    }

    return 0;
}

/**
 * Get string representation of a name for display
 * @param {Object} name - Name object (Aliased or has primaryAlias)
 * @returns {string} Display string
 */
function getNameString(name) {
    if (!name) return '(no name)';

    // Try primaryAlias.term first
    if (name.primaryAlias?.term) {
        return name.primaryAlias.term;
    }

    // Try term directly
    if (name.term) {
        return name.term;
    }

    // Try toString
    if (typeof name.toString === 'function' && name.toString() !== '[object Object]') {
        return name.toString();
    }

    return '(unknown)';
}

/**
 * Cluster individuals by name similarity using union-find approach
 * Names that are true matches (>= threshold) are grouped together
 *
 * @param {Array} individuals - Array of individual objects
 * @param {Array} pairwiseScores - Pairwise similarity scores
 * @param {number} threshold - True match threshold
 * @returns {Array} Array of clusters, each with members array (indices into individuals)
 */
function clusterByNameSimilarity(individuals, pairwiseScores, threshold) {
    // Initialize each individual as its own cluster
    const parent = individuals.map((_, i) => i);

    // Find root with path compression
    function find(x) {
        if (parent[x] !== x) {
            parent[x] = find(parent[x]);
        }
        return parent[x];
    }

    // Union two clusters
    function union(x, y) {
        const rootX = find(x);
        const rootY = find(y);
        if (rootX !== rootY) {
            parent[rootX] = rootY;
        }
    }

    // Union individuals whose names are true matches
    for (const score of pairwiseScores) {
        if (score.similarity >= threshold) {
            union(score.i, score.j);
        }
    }

    // Collect clusters
    const clusterMap = new Map();
    for (let i = 0; i < individuals.length; i++) {
        const root = find(i);
        if (!clusterMap.has(root)) {
            clusterMap.set(root, []);
        }
        clusterMap.get(root).push(i);
    }

    // Convert to array format
    return Array.from(clusterMap.values()).map(members => ({
        members,
        keyMemberIndex: null,  // Will be set by selectKeyName
        keyName: null
    }));
}

/**
 * Select the key name for a cluster (the one with highest average similarity to others)
 * Based on EntityGroup._selectBestPrimary pattern
 *
 * @param {Array} memberIndices - Indices into individuals array
 * @param {Array} individuals - Array of individual objects
 * @param {Array} pairwiseScores - All pairwise scores
 * @returns {Object} { keyName: string, keyMemberIndex: number }
 */
function selectKeyName(memberIndices, individuals, pairwiseScores) {
    if (memberIndices.length === 1) {
        return {
            keyName: getNameString(individuals[memberIndices[0]].name),
            keyMemberIndex: memberIndices[0]
        };
    }

    // Build a map for quick score lookup
    const scoreMap = new Map();
    for (const score of pairwiseScores) {
        const key1 = `${score.i}-${score.j}`;
        const key2 = `${score.j}-${score.i}`;
        scoreMap.set(key1, score.similarity);
        scoreMap.set(key2, score.similarity);
    }

    // Calculate average similarity for each member within the cluster
    let bestIndex = memberIndices[0];
    let bestAvg = 0;

    for (const i of memberIndices) {
        let total = 0;
        let count = 0;

        for (const j of memberIndices) {
            if (i === j) continue;
            const score = scoreMap.get(`${i}-${j}`) || 0;
            total += score;
            count++;
        }

        const avg = count > 0 ? total / count : 0;
        if (avg > bestAvg) {
            bestAvg = avg;
            bestIndex = i;
        }
    }

    return {
        keyName: getNameString(individuals[bestIndex].name),
        keyMemberIndex: bestIndex
    };
}

// =============================================================================
// UTILITY FUNCTIONS FOR MANUAL INSPECTION
// =============================================================================

/**
 * Analyze a specific group by index
 * @param {number} groupIndex - The group index to analyze
 * @returns {Object} Detailed analysis of the group
 */
function analyzeGroupByIndex(groupIndex) {
    const db = entityGroupBrowser?.loadedDatabase;
    const entityDb = window.unifiedEntityDatabase?.entities;

    if (!db || !entityDb) {
        console.error('Databases not loaded');
        return null;
    }

    const group = db.groups[groupIndex];
    if (!group) {
        console.error(`Group ${groupIndex} not found`);
        return null;
    }

    const individuals = collectIndividualsFromGroup(group, entityDb);
    console.log(`Group ${groupIndex}: ${individuals.length} individuals found`);

    if (individuals.length === 0) {
        console.log('No individuals in this group');
        return { groupIndex, individuals: [] };
    }

    for (let i = 0; i < individuals.length; i++) {
        const ind = individuals[i];
        console.log(`  [${i}] ${getNameString(ind.name)} (${ind.source}, key: ${ind.key})`);
    }

    if (individuals.length > 1) {
        const threshold = window.MATCH_CRITERIA?.trueMatch?.nameAlone || 0.875;
        const analysis = analyzeGroupIndividuals(individuals, threshold);

        console.log(`\nPairwise scores (threshold: ${threshold}):`);
        for (const score of analysis.pairwiseScores) {
            const match = score.similarity >= threshold ? ' [TRUE MATCH]' : '';
            console.log(`  "${score.nameI}" vs "${score.nameJ}": ${score.similarity.toFixed(3)}${match}`);
        }

        console.log(`\nClusters: ${analysis.nameClusters.length}`);
        for (let i = 0; i < analysis.nameClusters.length; i++) {
            const cluster = analysis.nameClusters[i];
            const memberNames = cluster.members.map(m => getNameString(individuals[m].name));
            console.log(`  Cluster ${i + 1}: ${memberNames.join(', ')}`);
            console.log(`    Key name: ${cluster.keyName}`);
        }

        return { groupIndex, individuals, analysis };
    }

    return { groupIndex, individuals };
}

/**
 * Find groups with the most individuals for research
 * @param {number} limit - Maximum number of groups to return
 * @returns {Array} Groups sorted by individual count descending
 */
function findGroupsWithMostIndividuals(limit = 10) {
    const db = entityGroupBrowser?.loadedDatabase;
    const entityDb = window.unifiedEntityDatabase?.entities;

    if (!db || !entityDb) {
        console.error('Databases not loaded');
        return null;
    }

    const groupsWithCounts = [];

    for (const group of Object.values(db.groups)) {
        const individuals = collectIndividualsFromGroup(group, entityDb);
        if (individuals.length > 1) {
            groupsWithCounts.push({
                groupIndex: group.index,
                individualCount: individuals.length,
                memberCount: group.memberKeys.length
            });
        }
    }

    groupsWithCounts.sort((a, b) => b.individualCount - a.individualCount);

    console.log(`Groups with most individuals (showing top ${limit}):`);
    for (let i = 0; i < Math.min(limit, groupsWithCounts.length); i++) {
        const g = groupsWithCounts[i];
        console.log(`  Group ${g.groupIndex}: ${g.individualCount} individuals (${g.memberCount} members)`);
    }

    return groupsWithCounts.slice(0, limit);
}

// =============================================================================
// EXPORTS (for browser global scope)
// =============================================================================

if (typeof window !== 'undefined') {
    window.analyzeIndividualIdentification = analyzeIndividualIdentification;
    window.analyzeGroupByIndex = analyzeGroupByIndex;
    window.findGroupsWithMostIndividuals = findGroupsWithMostIndividuals;
    window.collectIndividualsFromGroup = collectIndividualsFromGroup;
}

console.log('[individualIdentificationResearch.js] Loaded. Use analyzeIndividualIdentification() to run analysis.');
