/**
 * auditOverrideRules.js
 *
 * Post-build audit to verify that override rules were respected in the
 * EntityGroup database. This runs AFTER the database is built and saved,
 * checking the final result against the rules.
 *
 * Checks:
 * - FORCE_MATCH (inclusion) rules: Did specified entities end up in the same group?
 * - FORCE_EXCLUDE (exclusion) rules: Did specified entities remain in separate groups?
 * - MUTUAL inclusion sets: Are all keys in each set in the same group?
 * - MUTUAL exclusion sets: Are keys in each set NOT in the same group?
 *
 * Output: Console summary + downloadable CSV with detailed results
 *
 * Created: January 8, 2026 (Session 30)
 */

// =============================================================================
// INCLUSION RULES AUDIT
// =============================================================================

/**
 * Audit FORCE_MATCH (inclusion) rules against the EntityGroup database.
 * For each rule, checks if both entities ended up in the same group.
 *
 * @param {MatchOverrideManager} overrideManager - The override manager with loaded rules
 * @param {EntityGroupDatabase} groupDb - The built EntityGroup database
 * @returns {Object} { results: [], passCount, failCount, skipCount }
 */
function auditInclusionRules(overrideManager, groupDb) {
    const results = [];
    let passCount = 0;
    let failCount = 0;
    let skipCount = 0;

    // Check pairwise FORCE_MATCH rules
    for (const rule of overrideManager.forceMatchRules) {
        if (rule.status !== 'ACTIVE') {
            results.push({
                ruleType: 'FORCE_MATCH',
                ruleId: rule.ruleId,
                key1: rule.entityKey1,
                key2: rule.entityKey2,
                status: 'SKIPPED',
                reason: `Rule status: ${rule.status}`,
                group1Index: null,
                group2Index: null
            });
            skipCount++;
            continue;
        }

        // Find which group each entity is in
        const group1 = groupDb.findGroupByEntityKey(rule.entityKey1);
        const group2 = groupDb.findGroupByEntityKey(rule.entityKey2);

        const group1Index = group1 ? group1.index : null;
        const group2Index = group2 ? group2.index : null;

        // Check if entities are missing from database entirely
        if (!group1 && !group2) {
            results.push({
                ruleType: 'FORCE_MATCH',
                ruleId: rule.ruleId,
                key1: rule.entityKey1,
                key2: rule.entityKey2,
                status: 'SKIPPED',
                reason: 'Both entities not in any group (may be orphaned)',
                group1Index,
                group2Index
            });
            skipCount++;
            continue;
        }

        if (!group1) {
            results.push({
                ruleType: 'FORCE_MATCH',
                ruleId: rule.ruleId,
                key1: rule.entityKey1,
                key2: rule.entityKey2,
                status: 'FAIL',
                reason: `Entity 1 not in any group`,
                group1Index,
                group2Index
            });
            failCount++;
            continue;
        }

        if (!group2) {
            results.push({
                ruleType: 'FORCE_MATCH',
                ruleId: rule.ruleId,
                key1: rule.entityKey1,
                key2: rule.entityKey2,
                status: 'FAIL',
                reason: `Entity 2 not in any group`,
                group1Index,
                group2Index
            });
            failCount++;
            continue;
        }

        // Check if they're in the same group
        if (group1.index === group2.index) {
            results.push({
                ruleType: 'FORCE_MATCH',
                ruleId: rule.ruleId,
                key1: rule.entityKey1,
                key2: rule.entityKey2,
                status: 'PASS',
                reason: `Both in group ${group1.index}`,
                group1Index,
                group2Index
            });
            passCount++;
        } else {
            results.push({
                ruleType: 'FORCE_MATCH',
                ruleId: rule.ruleId,
                key1: rule.entityKey1,
                key2: rule.entityKey2,
                status: 'FAIL',
                reason: `Different groups: ${group1Index} vs ${group2Index}`,
                group1Index,
                group2Index
            });
            failCount++;
        }
    }

    // Check MUTUAL inclusion sets
    for (const mutualSet of overrideManager.mutualInclusionSets) {
        const keys = mutualSet.keys;
        if (keys.length < 2) continue;

        // Find which group each key is in
        const keyGroups = keys.map(key => {
            const group = groupDb.findGroupByEntityKey(key);
            return { key, groupIndex: group ? group.index : null };
        });

        // Check if all are in the same group
        const groupIndices = [...new Set(keyGroups.map(kg => kg.groupIndex).filter(idx => idx !== null))];
        const missingKeys = keyGroups.filter(kg => kg.groupIndex === null);

        if (missingKeys.length === keys.length) {
            results.push({
                ruleType: 'MUTUAL_INCLUDE',
                ruleId: mutualSet.ruleId,
                key1: keys.join(' | '),
                key2: '',
                status: 'SKIPPED',
                reason: 'All keys not in any group (may be orphaned)',
                group1Index: null,
                group2Index: null
            });
            skipCount++;
            continue;
        }

        if (missingKeys.length > 0) {
            results.push({
                ruleType: 'MUTUAL_INCLUDE',
                ruleId: mutualSet.ruleId,
                key1: keys.join(' | '),
                key2: '',
                status: 'FAIL',
                reason: `${missingKeys.length} keys not in any group: ${missingKeys.map(m => m.key).join(', ')}`,
                group1Index: groupIndices[0] || null,
                group2Index: null
            });
            failCount++;
            continue;
        }

        if (groupIndices.length === 1) {
            results.push({
                ruleType: 'MUTUAL_INCLUDE',
                ruleId: mutualSet.ruleId,
                key1: keys.join(' | '),
                key2: '',
                status: 'PASS',
                reason: `All ${keys.length} keys in group ${groupIndices[0]}`,
                group1Index: groupIndices[0],
                group2Index: groupIndices[0]
            });
            passCount++;
        } else {
            results.push({
                ruleType: 'MUTUAL_INCLUDE',
                ruleId: mutualSet.ruleId,
                key1: keys.join(' | '),
                key2: '',
                status: 'FAIL',
                reason: `Keys spread across ${groupIndices.length} groups: ${groupIndices.join(', ')}`,
                group1Index: groupIndices[0],
                group2Index: groupIndices[1] || null
            });
            failCount++;
        }
    }

    return { results, passCount, failCount, skipCount };
}

// =============================================================================
// EXCLUSION RULES AUDIT
// =============================================================================

/**
 * Audit FORCE_EXCLUDE (exclusion) rules against the EntityGroup database.
 * For each rule, checks if the specified entities ended up in DIFFERENT groups.
 *
 * @param {MatchOverrideManager} overrideManager - The override manager with loaded rules
 * @param {EntityGroupDatabase} groupDb - The built EntityGroup database
 * @returns {Object} { results: [], passCount, failCount, skipCount }
 */
function auditExclusionRules(overrideManager, groupDb) {
    const results = [];
    let passCount = 0;
    let failCount = 0;
    let skipCount = 0;

    // Check pairwise FORCE_EXCLUDE rules
    for (const rule of overrideManager.forceExcludeRules) {
        if (rule.status !== 'ACTIVE') {
            results.push({
                ruleType: 'FORCE_EXCLUDE',
                ruleId: rule.ruleId,
                key1: rule.defectiveKey,
                key2: rule.otherKey,
                status: 'SKIPPED',
                reason: `Rule status: ${rule.status}`,
                group1Index: null,
                group2Index: null
            });
            skipCount++;
            continue;
        }

        // Find which group each entity is in
        const group1 = groupDb.findGroupByEntityKey(rule.defectiveKey);
        const group2 = groupDb.findGroupByEntityKey(rule.otherKey);

        const group1Index = group1 ? group1.index : null;
        const group2Index = group2 ? group2.index : null;

        // If either entity is not in any group, the exclusion is inherently satisfied
        if (!group1 || !group2) {
            results.push({
                ruleType: 'FORCE_EXCLUDE',
                ruleId: rule.ruleId,
                key1: rule.defectiveKey,
                key2: rule.otherKey,
                status: 'PASS',
                reason: !group1 && !group2 ? 'Neither entity in any group' :
                        !group1 ? 'Defective entity not in any group' : 'Other entity not in any group',
                group1Index,
                group2Index
            });
            passCount++;
            continue;
        }

        // Check if they're in DIFFERENT groups
        if (group1.index !== group2.index) {
            results.push({
                ruleType: 'FORCE_EXCLUDE',
                ruleId: rule.ruleId,
                key1: rule.defectiveKey,
                key2: rule.otherKey,
                status: 'PASS',
                reason: `Correctly separated: groups ${group1Index} and ${group2Index}`,
                group1Index,
                group2Index
            });
            passCount++;
        } else {
            results.push({
                ruleType: 'FORCE_EXCLUDE',
                ruleId: rule.ruleId,
                key1: rule.defectiveKey,
                key2: rule.otherKey,
                status: 'FAIL',
                reason: `VIOLATION: Both in group ${group1.index}!`,
                group1Index,
                group2Index
            });
            failCount++;
        }
    }

    // Check MUTUAL exclusion sets
    // For these, we need to verify that no two keys in the same set ended up in the same group
    for (const mutualSet of overrideManager.mutualExclusionSets) {
        const keys = mutualSet.keys;
        if (keys.length < 2) continue;

        // Find which group each key is in
        const keyGroups = keys.map(key => {
            const group = groupDb.findGroupByEntityKey(key);
            return { key, groupIndex: group ? group.index : null };
        });

        // Find any violations (two keys in the same group)
        const violations = [];
        for (let i = 0; i < keyGroups.length; i++) {
            for (let j = i + 1; j < keyGroups.length; j++) {
                const kg1 = keyGroups[i];
                const kg2 = keyGroups[j];

                // If both have a group and it's the SAME group, that's a violation
                if (kg1.groupIndex !== null && kg2.groupIndex !== null &&
                    kg1.groupIndex === kg2.groupIndex) {
                    violations.push({
                        key1: kg1.key,
                        key2: kg2.key,
                        groupIndex: kg1.groupIndex
                    });
                }
            }
        }

        if (violations.length === 0) {
            results.push({
                ruleType: 'MUTUAL_EXCLUDE',
                ruleId: mutualSet.ruleId,
                key1: keys.join(' | '),
                key2: '',
                status: 'PASS',
                reason: `All ${keys.length} keys in separate groups (or not grouped)`,
                group1Index: null,
                group2Index: null
            });
            passCount++;
        } else {
            // Report violations
            const violationDetails = violations.map(v =>
                `${truncateKey(v.key1)} & ${truncateKey(v.key2)} both in group ${v.groupIndex}`
            ).join('; ');

            results.push({
                ruleType: 'MUTUAL_EXCLUDE',
                ruleId: mutualSet.ruleId,
                key1: keys.join(' | '),
                key2: '',
                status: 'FAIL',
                reason: `${violations.length} violation(s): ${violationDetails}`,
                group1Index: violations[0].groupIndex,
                group2Index: violations[0].groupIndex
            });
            failCount++;
        }
    }

    return { results, passCount, failCount, skipCount };
}

/**
 * Helper to truncate long entity keys for display
 */
function truncateKey(key, maxLen = 40) {
    if (!key || key.length <= maxLen) return key;
    return key.substring(0, maxLen - 3) + '...';
}

// =============================================================================
// CONFLICT ANALYSIS
// =============================================================================

/**
 * Analyze failing rules for conflicts with other rules.
 * For failing exclusion rules: check if any of their keys appear in inclusion rules
 * For failing inclusion rules: check if any of their keys appear in exclusion rules
 *
 * @param {Array} failedInclusionResults - Failed inclusion audit results
 * @param {Array} failedExclusionResults - Failed exclusion audit results
 * @param {MatchOverrideManager} overrideManager - The override manager with loaded rules
 * @returns {Object} { inclusionConflicts: [], exclusionConflicts: [] }
 */
function analyzeRuleConflicts(failedInclusionResults, failedExclusionResults, overrideManager) {
    const inclusionConflicts = [];
    const exclusionConflicts = [];

    // Build lookup sets for quick searching
    // All keys involved in inclusion rules (both pairwise and MUTUAL)
    const inclusionKeyToRules = new Map(); // key -> [ruleIds]
    for (const rule of overrideManager.forceMatchRules) {
        if (rule.status !== 'ACTIVE') continue;
        addKeyToRuleMap(inclusionKeyToRules, rule.entityKey1, rule.ruleId);
        addKeyToRuleMap(inclusionKeyToRules, rule.entityKey2, rule.ruleId);
    }
    for (const mutualSet of overrideManager.mutualInclusionSets) {
        for (const key of mutualSet.keys) {
            addKeyToRuleMap(inclusionKeyToRules, key, mutualSet.ruleId);
        }
    }

    // All keys involved in exclusion rules (both pairwise and MUTUAL)
    const exclusionKeyToRules = new Map(); // key -> [ruleIds]
    for (const rule of overrideManager.forceExcludeRules) {
        if (rule.status !== 'ACTIVE') continue;
        addKeyToRuleMap(exclusionKeyToRules, rule.defectiveKey, rule.ruleId);
        addKeyToRuleMap(exclusionKeyToRules, rule.otherKey, rule.ruleId);
    }
    for (const mutualSet of overrideManager.mutualExclusionSets) {
        for (const key of mutualSet.keys) {
            addKeyToRuleMap(exclusionKeyToRules, key, mutualSet.ruleId);
        }
    }

    // Check each failed EXCLUSION rule for overlaps with INCLUSION rules
    for (const failedResult of failedExclusionResults) {
        const keysToCheck = extractKeysFromResult(failedResult);
        const conflicts = [];

        for (const key of keysToCheck) {
            const inclusionRules = inclusionKeyToRules.get(key);
            if (inclusionRules && inclusionRules.length > 0) {
                conflicts.push({
                    key,
                    conflictingInclusionRules: inclusionRules
                });
            }
        }

        if (conflicts.length > 0) {
            exclusionConflicts.push({
                failedRule: failedResult.ruleId,
                failedRuleType: failedResult.ruleType,
                reason: failedResult.reason,
                conflicts
            });
        }
    }

    // Check each failed INCLUSION rule for overlaps with EXCLUSION rules
    for (const failedResult of failedInclusionResults) {
        const keysToCheck = extractKeysFromResult(failedResult);
        const conflicts = [];

        for (const key of keysToCheck) {
            const exclusionRules = exclusionKeyToRules.get(key);
            if (exclusionRules && exclusionRules.length > 0) {
                conflicts.push({
                    key,
                    conflictingExclusionRules: exclusionRules
                });
            }
        }

        if (conflicts.length > 0) {
            inclusionConflicts.push({
                failedRule: failedResult.ruleId,
                failedRuleType: failedResult.ruleType,
                reason: failedResult.reason,
                conflicts
            });
        }
    }

    return { inclusionConflicts, exclusionConflicts };
}

/**
 * Helper to add a key to a rule map
 */
function addKeyToRuleMap(map, key, ruleId) {
    if (!map.has(key)) {
        map.set(key, []);
    }
    if (!map.get(key).includes(ruleId)) {
        map.get(key).push(ruleId);
    }
}

/**
 * Extract entity keys from an audit result
 */
function extractKeysFromResult(result) {
    const keys = [];

    // For MUTUAL rules, key1 contains pipe-separated keys
    if (result.key1 && result.key1.includes(' | ')) {
        keys.push(...result.key1.split(' | ').map(k => k.trim()));
    } else if (result.key1) {
        keys.push(result.key1);
    }

    if (result.key2 && result.key2.trim()) {
        keys.push(result.key2);
    }

    return keys;
}

/**
 * Print conflict analysis to console
 */
function printConflictAnalysis(conflicts) {
    const { inclusionConflicts, exclusionConflicts } = conflicts;

    if (exclusionConflicts.length === 0 && inclusionConflicts.length === 0) {
        console.log('\n--- CONFLICT ANALYSIS ---');
        console.log('  No conflicts found between failing rules and other rules.');
        return;
    }

    console.log('\n--- CONFLICT ANALYSIS ---');

    if (exclusionConflicts.length > 0) {
        console.log('\n  FAILED EXCLUSION RULES with keys in INCLUSION RULES:');
        for (const conflict of exclusionConflicts) {
            console.log(`\n    ${conflict.failedRule} (${conflict.failedRuleType})`);
            console.log(`      Failure reason: ${conflict.reason}`);
            for (const c of conflict.conflicts) {
                console.log(`      Key: ${truncateKey(c.key, 60)}`);
                console.log(`        Also in inclusion rules: ${c.conflictingInclusionRules.join(', ')}`);
            }
        }
    }

    if (inclusionConflicts.length > 0) {
        console.log('\n  FAILED INCLUSION RULES with keys in EXCLUSION RULES:');
        for (const conflict of inclusionConflicts) {
            console.log(`\n    ${conflict.failedRule} (${conflict.failedRuleType})`);
            console.log(`      Failure reason: ${conflict.reason}`);
            for (const c of conflict.conflicts) {
                console.log(`      Key: ${truncateKey(c.key, 60)}`);
                console.log(`        Also in exclusion rules: ${c.conflictingExclusionRules.join(', ')}`);
            }
        }
    }
}

/**
 * Generate conflict analysis section for CSV
 */
function generateConflictCSVLines(conflicts) {
    const lines = [];
    const { inclusionConflicts, exclusionConflicts } = conflicts;

    if (exclusionConflicts.length === 0 && inclusionConflicts.length === 0) {
        lines.push('');
        lines.push('Conflict Analysis:');
        lines.push('No conflicts found between failing rules and other rules.');
        return lines;
    }

    lines.push('');
    lines.push('Conflict Analysis:');
    lines.push('FailedRuleId,FailedRuleType,FailureReason,ConflictingKey,ConflictsWith');

    for (const conflict of exclusionConflicts) {
        for (const c of conflict.conflicts) {
            lines.push([
                csvEscapeAudit(conflict.failedRule),
                conflict.failedRuleType,
                csvEscapeAudit(conflict.reason),
                csvEscapeAudit(c.key),
                csvEscapeAudit('INCLUSION: ' + c.conflictingInclusionRules.join('; '))
            ].join(','));
        }
    }

    for (const conflict of inclusionConflicts) {
        for (const c of conflict.conflicts) {
            lines.push([
                csvEscapeAudit(conflict.failedRule),
                conflict.failedRuleType,
                csvEscapeAudit(conflict.reason),
                csvEscapeAudit(c.key),
                csvEscapeAudit('EXCLUSION: ' + c.conflictingExclusionRules.join('; '))
            ].join(','));
        }
    }

    return lines;
}

// =============================================================================
// MAIN AUDIT FUNCTION
// =============================================================================

/**
 * Run the full override rules audit.
 * Outputs summary to console and downloads a CSV with details.
 *
 * Prerequisites:
 * - EntityGroup database must be loaded
 * - Override rules must be loaded from Google Sheets
 *
 * @returns {Object} Audit results summary
 */
async function runOverrideRulesAudit() {
    console.log('='.repeat(60));
    console.log('OVERRIDE RULES AUDIT');
    console.log('='.repeat(60));

    // Check prerequisites
    if (!entityGroupBrowser.loadedDatabase) {
        console.error('ERROR: EntityGroup database not loaded. Load it first.');
        alert('EntityGroup database not loaded. Please load it first.');
        return null;
    }

    if (!window.matchOverrideManager) {
        console.error('ERROR: Match override manager not available.');
        alert('Match override manager not available.');
        return null;
    }

    const overrideManager = window.matchOverrideManager;
    const groupDb = entityGroupBrowser.loadedDatabase;

    // Check if rules are loaded
    const ruleCount = overrideManager.forceMatchRules.length +
                      overrideManager.forceExcludeRules.length +
                      overrideManager.mutualInclusionSets.length +
                      overrideManager.mutualExclusionSets.length;

    if (ruleCount === 0) {
        console.log('No override rules loaded. Loading from Google Sheets...');
        try {
            await overrideManager.loadFromGoogleSheets();
        } catch (err) {
            console.error('Failed to load rules from Google Sheets:', err);
            alert('Failed to load override rules from Google Sheets. Make sure you are authorized.');
            return null;
        }
    }

    // Show what we're auditing
    console.log(`\nAuditing against EntityGroup database with ${Object.keys(groupDb.groups).length} groups`);
    console.log(`Rules to check:`);
    console.log(`  - FORCE_MATCH (pairwise): ${overrideManager.forceMatchRules.length}`);
    console.log(`  - FORCE_EXCLUDE (pairwise): ${overrideManager.forceExcludeRules.length}`);
    console.log(`  - MUTUAL inclusion sets: ${overrideManager.mutualInclusionSets.length}`);
    console.log(`  - MUTUAL exclusion sets: ${overrideManager.mutualExclusionSets.length}`);
    console.log('');

    // Run inclusion audit
    console.log('--- INCLUSION RULES AUDIT ---');
    const inclusionResults = auditInclusionRules(overrideManager, groupDb);
    console.log(`  PASS: ${inclusionResults.passCount}`);
    console.log(`  FAIL: ${inclusionResults.failCount}`);
    console.log(`  SKIPPED: ${inclusionResults.skipCount}`);

    // Log failures
    const inclusionFailures = inclusionResults.results.filter(r => r.status === 'FAIL');
    if (inclusionFailures.length > 0) {
        console.log('\n  INCLUSION FAILURES:');
        for (const fail of inclusionFailures) {
            console.log(`    ${fail.ruleId}: ${fail.reason}`);
        }
    }

    // Run exclusion audit
    console.log('\n--- EXCLUSION RULES AUDIT ---');
    const exclusionResults = auditExclusionRules(overrideManager, groupDb);
    console.log(`  PASS: ${exclusionResults.passCount}`);
    console.log(`  FAIL: ${exclusionResults.failCount}`);
    console.log(`  SKIPPED: ${exclusionResults.skipCount}`);

    // Log failures
    const exclusionFailures = exclusionResults.results.filter(r => r.status === 'FAIL');
    if (exclusionFailures.length > 0) {
        console.log('\n  EXCLUSION FAILURES:');
        for (const fail of exclusionFailures) {
            console.log(`    ${fail.ruleId}: ${fail.reason}`);
        }
    }

    // Run conflict analysis on failures
    let conflictAnalysis = null;
    if (inclusionFailures.length > 0 || exclusionFailures.length > 0) {
        conflictAnalysis = analyzeRuleConflicts(inclusionFailures, exclusionFailures, overrideManager);
        printConflictAnalysis(conflictAnalysis);
    }

    // Summary
    const totalPass = inclusionResults.passCount + exclusionResults.passCount;
    const totalFail = inclusionResults.failCount + exclusionResults.failCount;
    const totalSkip = inclusionResults.skipCount + exclusionResults.skipCount;
    const total = totalPass + totalFail + totalSkip;

    console.log('\n' + '='.repeat(60));
    console.log('AUDIT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total rules checked: ${total}`);
    console.log(`  PASS: ${totalPass} (${((totalPass / total) * 100).toFixed(1)}%)`);
    console.log(`  FAIL: ${totalFail} (${((totalFail / total) * 100).toFixed(1)}%)`);
    console.log(`  SKIPPED: ${totalSkip}`);

    if (totalFail === 0) {
        console.log('\n✅ ALL RULES PASSED - Override rules correctly applied!');
    } else {
        console.log(`\n⚠️ ${totalFail} RULE(S) FAILED - Review failures above`);
    }
    console.log('='.repeat(60));

    // Generate and download CSV
    const allResults = [...inclusionResults.results, ...exclusionResults.results];
    downloadAuditCSV(allResults, {
        inclusionPass: inclusionResults.passCount,
        inclusionFail: inclusionResults.failCount,
        inclusionSkip: inclusionResults.skipCount,
        exclusionPass: exclusionResults.passCount,
        exclusionFail: exclusionResults.failCount,
        exclusionSkip: exclusionResults.skipCount
    }, conflictAnalysis);

    return {
        inclusionResults,
        exclusionResults,
        conflictAnalysis,
        summary: { totalPass, totalFail, totalSkip, total }
    };
}

// =============================================================================
// CSV EXPORT
// =============================================================================

/**
 * Generate and download the audit results as a CSV file
 */
function downloadAuditCSV(results, stats, conflictAnalysis) {
    const lines = [];

    // Header with summary
    lines.push('Override Rules Audit Report');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');
    lines.push('Summary:');
    lines.push(`Inclusion - Pass: ${stats.inclusionPass}, Fail: ${stats.inclusionFail}, Skip: ${stats.inclusionSkip}`);
    lines.push(`Exclusion - Pass: ${stats.exclusionPass}, Fail: ${stats.exclusionFail}, Skip: ${stats.exclusionSkip}`);
    lines.push('');

    // CSV data
    lines.push('RuleType,RuleId,Status,Key1,Key2,Group1Index,Group2Index,Reason');

    for (const result of results) {
        const row = [
            result.ruleType,
            csvEscapeAudit(result.ruleId),
            result.status,
            csvEscapeAudit(result.key1),
            csvEscapeAudit(result.key2),
            result.group1Index !== null ? result.group1Index : '',
            result.group2Index !== null ? result.group2Index : '',
            csvEscapeAudit(result.reason)
        ];
        lines.push(row.join(','));
    }

    // Add conflict analysis section if there are failures
    if (conflictAnalysis) {
        const conflictLines = generateConflictCSVLines(conflictAnalysis);
        lines.push(...conflictLines);
    }

    // Create and download
    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    const date = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `override_rules_audit_${date}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(`\n📥 CSV downloaded: override_rules_audit_${date}.csv`);
}

/**
 * Escape a value for CSV (local version to avoid dependency on csvReports.js)
 */
function csvEscapeAudit(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

// =============================================================================
// EXCLUSION FAILURE INVESTIGATION
// =============================================================================

/**
 * Investigate why a specific exclusion rule failed.
 * Shows group details, all members, and checks for inclusion rules that may have caused this.
 *
 * @param {string} ruleId - The exclusion rule ID (e.g., 'EXCZ')
 */
function investigateExclusionFailure(ruleId) {
    console.log('='.repeat(70));
    console.log(`INVESTIGATING EXCLUSION FAILURE: ${ruleId}`);
    console.log('='.repeat(70));

    // Check prerequisites
    if (!entityGroupBrowser.loadedDatabase) {
        console.error('ERROR: EntityGroup database not loaded.');
        return null;
    }

    if (!window.matchOverrideManager) {
        console.error('ERROR: Match override manager not available.');
        return null;
    }

    if (!window.unifiedEntityDatabase) {
        console.error('ERROR: Unified entity database not loaded.');
        return null;
    }

    const overrideManager = window.matchOverrideManager;
    const groupDb = entityGroupBrowser.loadedDatabase;
    const entityDb = window.unifiedEntityDatabase;

    // Find the rule
    const rule = overrideManager.forceExcludeRules.find(r =>
        r.ruleId === ruleId || r.ruleId.startsWith(ruleId + '[')
    );

    if (!rule) {
        console.error(`ERROR: Rule ${ruleId} not found in forceExcludeRules.`);
        console.log('Available rule IDs:', overrideManager.forceExcludeRules.map(r => r.ruleId).join(', '));
        return null;
    }

    console.log('\n--- RULE DETAILS ---');
    console.log(`  Rule ID: ${rule.ruleId}`);
    console.log(`  Defective Key: ${rule.defectiveKey}`);
    console.log(`  Other Key: ${rule.otherKey}`);
    console.log(`  On Conflict: ${rule.onConflict}`);
    console.log(`  Reason: ${rule.reason || '(none)'}`);
    console.log(`  Status: ${rule.status}`);

    // Find the entities
    const entity1 = entityDb.entities[rule.defectiveKey];
    const entity2 = entityDb.entities[rule.otherKey];

    console.log('\n--- ENTITY DETAILS ---');
    if (entity1) {
        console.log(`\n  Entity 1 (defective): ${rule.defectiveKey}`);
        console.log(`    Type: ${entity1.__type || entity1.constructor?.name}`);
        console.log(`    Name: ${getEntityDisplayName(entity1)}`);
        console.log(`    Source: ${entity1.source || 'unknown'}`);
    } else {
        console.log(`\n  Entity 1 (defective): NOT FOUND in database`);
    }

    if (entity2) {
        console.log(`\n  Entity 2 (other): ${rule.otherKey}`);
        console.log(`    Type: ${entity2.__type || entity2.constructor?.name}`);
        console.log(`    Name: ${getEntityDisplayName(entity2)}`);
        console.log(`    Source: ${entity2.source || 'unknown'}`);
    } else {
        console.log(`\n  Entity 2 (other): NOT FOUND in database`);
    }

    // Find which groups they're in
    const group1 = groupDb.findGroupByEntityKey(rule.defectiveKey);
    const group2 = groupDb.findGroupByEntityKey(rule.otherKey);

    console.log('\n--- GROUP MEMBERSHIP ---');
    console.log(`  Entity 1 group: ${group1 ? group1.index : 'NOT IN ANY GROUP'}`);
    console.log(`  Entity 2 group: ${group2 ? group2.index : 'NOT IN ANY GROUP'}`);

    if (group1 && group2 && group1.index === group2.index) {
        console.log(`\n  ⚠️ VIOLATION: Both entities are in the SAME group (${group1.index})!`);

        // Show all members of this group
        console.log('\n--- GROUP DETAILS ---');
        console.log(`  Group Index: ${group1.index}`);
        console.log(`  Founding Member: ${group1.foundingMemberKey}`);
        console.log(`  Construction Phase: ${group1.constructionPhase}`);
        console.log(`  Has Bloomerang Member: ${group1.hasBloomerangMember}`);
        console.log(`  Member Count: ${group1.memberKeys.length}`);

        console.log('\n  All Members:');
        for (const memberKey of group1.memberKeys) {
            const memberEntity = entityDb.entities[memberKey];
            const memberName = memberEntity ? getEntityDisplayName(memberEntity) : '(entity not found)';
            const isDefective = memberKey === rule.defectiveKey ? ' [DEFECTIVE]' : '';
            const isOther = memberKey === rule.otherKey ? ' [OTHER]' : '';
            console.log(`    - ${memberKey}${isDefective}${isOther}`);
            console.log(`      Name: ${memberName}`);
        }

        // Check for any inclusion rules involving these entities
        console.log('\n--- CHECKING FOR CONFLICTING INCLUSION RULES ---');
        const conflictingInclusions = [];

        for (const incRule of overrideManager.forceMatchRules) {
            if (incRule.status !== 'ACTIVE') continue;
            if (incRule.entityKey1 === rule.defectiveKey || incRule.entityKey2 === rule.defectiveKey ||
                incRule.entityKey1 === rule.otherKey || incRule.entityKey2 === rule.otherKey) {
                conflictingInclusions.push({
                    type: 'FORCE_MATCH',
                    ruleId: incRule.ruleId,
                    keys: [incRule.entityKey1, incRule.entityKey2]
                });
            }
        }

        for (const mutualSet of overrideManager.mutualInclusionSets) {
            if (mutualSet.keys.includes(rule.defectiveKey) || mutualSet.keys.includes(rule.otherKey)) {
                conflictingInclusions.push({
                    type: 'MUTUAL_INCLUDE',
                    ruleId: mutualSet.ruleId,
                    keys: mutualSet.keys
                });
            }
        }

        if (conflictingInclusions.length > 0) {
            console.log('  Found conflicting inclusion rules:');
            for (const conflict of conflictingInclusions) {
                console.log(`    ${conflict.ruleId} (${conflict.type})`);
                console.log(`      Keys: ${conflict.keys.join(', ')}`);
            }
        } else {
            console.log('  No conflicting inclusion rules found for these specific keys.');
        }

        // Check if any OTHER member of the group has an inclusion rule with either entity
        console.log('\n--- CHECKING TRANSITIVE INCLUSION (via other group members) ---');
        const transitiveInclusions = [];

        for (const memberKey of group1.memberKeys) {
            if (memberKey === rule.defectiveKey || memberKey === rule.otherKey) continue;

            // Check if this member has inclusion rules with defective or other
            for (const incRule of overrideManager.forceMatchRules) {
                if (incRule.status !== 'ACTIVE') continue;
                const involvesDefective = incRule.entityKey1 === rule.defectiveKey || incRule.entityKey2 === rule.defectiveKey;
                const involvesOther = incRule.entityKey1 === rule.otherKey || incRule.entityKey2 === rule.otherKey;
                const involvesMember = incRule.entityKey1 === memberKey || incRule.entityKey2 === memberKey;

                if (involvesMember && (involvesDefective || involvesOther)) {
                    transitiveInclusions.push({
                        memberKey,
                        ruleId: incRule.ruleId,
                        type: 'FORCE_MATCH',
                        connectsTo: involvesDefective ? 'defective' : 'other'
                    });
                }
            }

            for (const mutualSet of overrideManager.mutualInclusionSets) {
                const hasMember = mutualSet.keys.includes(memberKey);
                const hasDefective = mutualSet.keys.includes(rule.defectiveKey);
                const hasOther = mutualSet.keys.includes(rule.otherKey);

                if (hasMember && (hasDefective || hasOther)) {
                    transitiveInclusions.push({
                        memberKey,
                        ruleId: mutualSet.ruleId,
                        type: 'MUTUAL_INCLUDE',
                        connectsTo: hasDefective ? 'defective' : 'other'
                    });
                }
            }
        }

        if (transitiveInclusions.length > 0) {
            console.log('  Found transitive inclusions (via intermediate members):');
            for (const trans of transitiveInclusions) {
                console.log(`    Member: ${truncateKey(trans.memberKey, 50)}`);
                console.log(`      Rule: ${trans.ruleId} (${trans.type})`);
                console.log(`      Connects to: ${trans.connectsTo} entity`);
            }
            console.log('\n  ⚠️ This suggests the entities may have been grouped together');
            console.log('     through a chain of inclusion rules via intermediate members.');
        } else {
            console.log('  No transitive inclusions found.');
            console.log('\n  The entities may have been grouped together due to algorithmic matching');
            console.log('  (high similarity score) rather than inclusion rules.');

            // Run comparison to show similarity
            if (entity1 && entity2 && typeof universalCompareTo === 'function') {
                console.log('\n--- SIMILARITY COMPARISON ---');
                try {
                    const result = universalCompareTo(entity1, entity2);
                    const score = result.score ?? result.overallSimilarity ?? result;
                    console.log(`  Similarity Score: ${(score * 100).toFixed(2)}%`);
                    if (result.comparisonType) {
                        console.log(`  Comparison Type: ${result.comparisonType}`);
                    }
                } catch (err) {
                    console.log(`  Could not compute similarity: ${err.message}`);
                }
            }
        }
    } else {
        console.log('\n  ✅ Entities are in different groups - exclusion is working correctly.');
    }

    console.log('\n' + '='.repeat(70));

    return {
        rule,
        entity1,
        entity2,
        group1,
        group2,
        sameGroup: group1 && group2 && group1.index === group2.index
    };
}

/**
 * Helper to get a display name for an entity
 */
function getEntityDisplayName(entity) {
    if (!entity) return 'Unknown';
    if (entity.name?.primaryAlias?.term) return entity.name.primaryAlias.term;
    if (entity.name?.completeName) return entity.name.completeName;
    if (entity.name?.firstName || entity.name?.lastName) {
        return [entity.name.firstName, entity.name.lastName].filter(Boolean).join(' ');
    }
    return entity.name?.toString?.() || 'Unknown';
}

// =============================================================================
// EXPORTS
// =============================================================================

window.runOverrideRulesAudit = runOverrideRulesAudit;
window.auditInclusionRules = auditInclusionRules;
window.auditExclusionRules = auditExclusionRules;
window.analyzeRuleConflicts = analyzeRuleConflicts;
window.investigateExclusionFailure = investigateExclusionFailure;

console.log('[auditOverrideRules.js] Loaded - Override rules audit ready');
