/**
 * Street Architecture Baseline Capture Script
 *
 * Purpose: Capture baseline artifacts BEFORE implementing StreetName alias architecture.
 * These artifacts enable regression testing - Phases 1-4 must produce IDENTICAL distributions.
 *
 * Reference: reference_streetNameAliasArchitecture.md Section 7
 *
 * Artifacts Captured:
 * 1. EntityGroup Membership Snapshot - group count, size distribution, full membership mapping
 * 2. Address Comparison Score Distribution - 5% buckets, segmented by BI/off-island pairs
 * 3. Entity Comparison Score Distribution - 5% buckets, segmented by entity type pairs
 * 4. Street Lookup Results - every lookup with match/no-match result
 *
 * Usage:
 *   // Enable instrumentation before building
 *   enableBaselineInstrumentation();
 *
 *   // Build EntityGroup database (instrumentation captures data automatically)
 *   await buildEntityGroupDatabase({ saveToGoogleDrive: false });
 *
 *   // Capture and save all baseline artifacts
 *   await captureAndSaveBaseline();
 *
 *   // Disable instrumentation when done
 *   disableBaselineInstrumentation();
 *
 * @created January 9, 2026
 * @version 1.0
 */

// =============================================================================
// GLOBAL INSTRUMENTATION STATE
// =============================================================================

/**
 * Global collector object for instrumentation data.
 * When enabled, comparison functions record their scores here.
 */
window.baselineInstrumentation = {
    enabled: false,

    // Artifact 2: Address comparison scores
    // Format: { score, addr1IsBI, addr2IsBI, comparisonType }
    addressComparisons: [],

    // Artifact 3: Entity comparison scores
    // Format: { score, nameScore, contactInfoScore, type1, type2, comparisonType }
    entityComparisons: [],

    // Artifact 4: Street lookup results
    // Format: { inputString, matched, matchedCanonical }
    streetLookups: [],

    // Metadata
    captureStartTime: null,
    captureEndTime: null
};

// =============================================================================
// INSTRUMENTATION CONTROL
// =============================================================================

/**
 * Enable baseline instrumentation.
 * Call this BEFORE running buildEntityGroupDatabase().
 */
function enableBaselineInstrumentation() {
    const inst = window.baselineInstrumentation;

    // Clear any previous data
    inst.addressComparisons = [];
    inst.entityComparisons = [];
    inst.streetLookups = [];
    inst.captureStartTime = new Date().toISOString();
    inst.captureEndTime = null;

    // Enable collection
    inst.enabled = true;

    console.log('[BASELINE] Instrumentation ENABLED');
    console.log('[BASELINE] Address comparisons, entity comparisons, and street lookups will be recorded.');
}

/**
 * Disable baseline instrumentation.
 * Call this AFTER capturing baseline.
 */
function disableBaselineInstrumentation() {
    const inst = window.baselineInstrumentation;
    inst.enabled = false;
    inst.captureEndTime = new Date().toISOString();

    console.log('[BASELINE] Instrumentation DISABLED');
    console.log(`[BASELINE] Captured: ${inst.addressComparisons.length} address comparisons`);
    console.log(`[BASELINE] Captured: ${inst.entityComparisons.length} entity comparisons`);
    console.log(`[BASELINE] Captured: ${inst.streetLookups.length} street lookups`);
}

/**
 * Check if instrumentation is enabled.
 * @returns {boolean}
 */
function isBaselineInstrumentationEnabled() {
    return window.baselineInstrumentation && window.baselineInstrumentation.enabled;
}

// =============================================================================
// INSTRUMENTATION RECORDING FUNCTIONS
// (Called by patched comparison functions)
// =============================================================================

/**
 * Record an address comparison for baseline capture.
 * Called from patched addressWeightedComparison().
 *
 * @param {number} score - Comparison score 0-1
 * @param {Object} addr1 - First address object
 * @param {Object} addr2 - Second address object
 * @param {string} comparisonType - Type of comparison (POBox, BI, General)
 */
function recordAddressComparison(score, addr1, addr2, comparisonType) {
    if (!isBaselineInstrumentationEnabled()) return;

    // Determine if addresses are Block Island
    const addr1IsBI = isAddressBlockIsland(addr1);
    const addr2IsBI = isAddressBlockIsland(addr2);

    window.baselineInstrumentation.addressComparisons.push({
        score: score,
        addr1IsBI: addr1IsBI,
        addr2IsBI: addr2IsBI,
        comparisonType: comparisonType
    });
}

/**
 * Record an entity comparison for baseline capture.
 * Called from patched findMatchesForEntity() or universalCompareTo().
 *
 * @param {number} overallScore - Overall comparison score 0-1
 * @param {number|null} nameScore - Name component score
 * @param {number|null} contactInfoScore - ContactInfo component score
 * @param {string} type1 - Entity1 type (Individual, AggregateHousehold, etc.)
 * @param {string} type2 - Entity2 type
 * @param {string} comparisonType - Full comparison type string
 */
function recordEntityComparison(overallScore, nameScore, contactInfoScore, type1, type2, comparisonType) {
    if (!isBaselineInstrumentationEnabled()) return;

    window.baselineInstrumentation.entityComparisons.push({
        score: overallScore,
        nameScore: nameScore,
        contactInfoScore: contactInfoScore,
        type1: type1,
        type2: type2,
        comparisonType: comparisonType
    });
}

/**
 * Record a street lookup for baseline capture.
 * Called from patched findBlockIslandStreetMatch().
 *
 * @param {string} inputString - Street string being looked up
 * @param {boolean} matched - Whether a match was found
 * @param {string|null} matchedCanonical - Canonical name if matched
 */
function recordStreetLookup(inputString, matched, matchedCanonical) {
    if (!isBaselineInstrumentationEnabled()) return;

    window.baselineInstrumentation.streetLookups.push({
        inputString: inputString,
        matched: matched,
        matchedCanonical: matchedCanonical || null
    });
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Determine if an address is Block Island based on its properties.
 * @param {Object} addr - Address object
 * @returns {boolean}
 */
function isAddressBlockIsland(addr) {
    if (!addr) return false;

    // Helper to extract string value from AttributedTerm or plain string
    function getTermString(value) {
        if (!value) return null;
        if (typeof value === 'string') return value;
        if (value.primaryAlias?.term) return value.primaryAlias.term;
        if (value.term) return value.term;
        return null;
    }

    // Check ZIP
    const zip = getTermString(addr.zipCode);
    if (zip === '02807') return true;

    // Check city
    const city = getTermString(addr.city);
    if (city && typeof city === 'string') {
        const cityLower = city.toLowerCase();
        if (cityLower === 'block island' || cityLower === 'new shoreham') {
            return true;
        }
    }

    // Check if street is in BI database
    const streetName = getTermString(addr.streetName);
    if (streetName && typeof streetName === 'string' && window.blockIslandStreets) {
        const streetUpper = streetName.toUpperCase().trim();
        if (window.blockIslandStreets.has(streetUpper)) {
            return true;
        }
    }

    return false;
}

/**
 * Categorize a score into 5% bucket.
 * @param {number} score - Score 0-1
 * @returns {string} Bucket label like "0-5", "5-10", etc.
 */
function scoreToBucket(score) {
    if (score === null || score === undefined || isNaN(score)) return 'null';

    // Clamp to 0-1
    const clamped = Math.max(0, Math.min(1, score));

    // Calculate bucket (0-5, 5-10, ..., 95-100)
    const bucketIndex = Math.min(Math.floor(clamped * 20), 19);
    const bucketStart = bucketIndex * 5;
    const bucketEnd = bucketStart + 5;

    return `${bucketStart}-${bucketEnd}`;
}

/**
 * Build distribution from array of scores.
 * @param {number[]} scores - Array of scores
 * @returns {Object} Distribution with bucket counts
 */
function buildDistribution(scores) {
    const buckets = {};

    // Initialize all buckets
    for (let i = 0; i < 20; i++) {
        const label = `${i * 5}-${(i + 1) * 5}`;
        buckets[label] = 0;
    }
    buckets['null'] = 0;

    // Count scores into buckets
    for (const score of scores) {
        const bucket = scoreToBucket(score);
        buckets[bucket]++;
    }

    return buckets;
}

// =============================================================================
// ARTIFACT 1: ENTITYGROUP MEMBERSHIP SNAPSHOT
// =============================================================================

/**
 * Capture EntityGroup membership snapshot.
 * @param {EntityGroupDatabase} groupDb - The built group database
 * @returns {Object} Membership snapshot
 */
function captureEntityGroupMembership(groupDb) {
    if (!groupDb || !groupDb.groups) {
        console.error('[BASELINE] Cannot capture membership: groupDb not provided or invalid');
        return null;
    }

    const snapshot = {
        captureTimestamp: new Date().toISOString(),
        totalGroups: 0,
        sizeDistribution: {},  // size → count
        membershipMapping: {}  // entityKey → groupIndex
    };

    // Iterate through all groups
    for (const group of Object.values(groupDb.groups)) {
        snapshot.totalGroups++;

        const size = group.memberKeys.length;
        snapshot.sizeDistribution[size] = (snapshot.sizeDistribution[size] || 0) + 1;

        // Map each member to this group
        for (const memberKey of group.memberKeys) {
            snapshot.membershipMapping[memberKey] = group.index;
        }
    }

    console.log(`[BASELINE] EntityGroup membership captured:`);
    console.log(`  Total groups: ${snapshot.totalGroups}`);
    console.log(`  Total entities mapped: ${Object.keys(snapshot.membershipMapping).length}`);

    return snapshot;
}

// =============================================================================
// ARTIFACT 2: ADDRESS COMPARISON SCORE DISTRIBUTION
// =============================================================================

/**
 * Build address comparison score distribution from captured data.
 * @returns {Object} Distribution with segments for BI-BI, BI-offisland, offisland-offisland
 */
function captureAddressScoreDistribution() {
    const comparisons = window.baselineInstrumentation.addressComparisons;

    if (!comparisons || comparisons.length === 0) {
        console.warn('[BASELINE] No address comparisons captured. Was instrumentation enabled?');
        return null;
    }

    // Segment comparisons
    const biToBi = [];
    const biToOffisland = [];
    const offislandToOffisland = [];

    for (const comp of comparisons) {
        if (comp.addr1IsBI && comp.addr2IsBI) {
            biToBi.push(comp.score);
        } else if (comp.addr1IsBI || comp.addr2IsBI) {
            biToOffisland.push(comp.score);
        } else {
            offislandToOffisland.push(comp.score);
        }
    }

    const distribution = {
        captureTimestamp: new Date().toISOString(),
        totalComparisons: comparisons.length,
        segments: {
            biToBi: {
                count: biToBi.length,
                distribution: buildDistribution(biToBi)
            },
            biToOffisland: {
                count: biToOffisland.length,
                distribution: buildDistribution(biToOffisland)
            },
            offislandToOffisland: {
                count: offislandToOffisland.length,
                distribution: buildDistribution(offislandToOffisland)
            }
        },
        overall: {
            count: comparisons.length,
            distribution: buildDistribution(comparisons.map(c => c.score))
        }
    };

    console.log(`[BASELINE] Address score distribution captured:`);
    console.log(`  Total comparisons: ${distribution.totalComparisons}`);
    console.log(`  BI-to-BI: ${biToBi.length}`);
    console.log(`  BI-to-offisland: ${biToOffisland.length}`);
    console.log(`  Offisland-to-offisland: ${offislandToOffisland.length}`);

    return distribution;
}

// =============================================================================
// ARTIFACT 3: ENTITY COMPARISON SCORE DISTRIBUTION
// =============================================================================

/**
 * Build entity comparison score distribution from captured data.
 * @returns {Object} Distribution segmented by entity type pairs
 */
function captureEntityScoreDistribution() {
    const comparisons = window.baselineInstrumentation.entityComparisons;

    if (!comparisons || comparisons.length === 0) {
        console.warn('[BASELINE] No entity comparisons captured. Was instrumentation enabled?');
        return null;
    }

    // Group by comparison type
    const byType = {};

    for (const comp of comparisons) {
        const typeKey = comp.comparisonType || `${comp.type1}-to-${comp.type2}`;

        if (!byType[typeKey]) {
            byType[typeKey] = {
                overall: [],
                name: [],
                contactInfo: []
            };
        }

        byType[typeKey].overall.push(comp.score);
        if (comp.nameScore !== null && comp.nameScore !== undefined) {
            byType[typeKey].name.push(comp.nameScore);
        }
        if (comp.contactInfoScore !== null && comp.contactInfoScore !== undefined) {
            byType[typeKey].contactInfo.push(comp.contactInfoScore);
        }
    }

    // Build distributions for each type
    const segments = {};
    for (const [typeKey, scores] of Object.entries(byType)) {
        segments[typeKey] = {
            count: scores.overall.length,
            overall: buildDistribution(scores.overall),
            name: buildDistribution(scores.name),
            contactInfo: buildDistribution(scores.contactInfo)
        };
    }

    const distribution = {
        captureTimestamp: new Date().toISOString(),
        totalComparisons: comparisons.length,
        segments: segments,
        overall: {
            count: comparisons.length,
            distribution: buildDistribution(comparisons.map(c => c.score))
        }
    };

    console.log(`[BASELINE] Entity score distribution captured:`);
    console.log(`  Total comparisons: ${distribution.totalComparisons}`);
    console.log(`  Comparison types: ${Object.keys(segments).join(', ')}`);

    return distribution;
}

// =============================================================================
// ARTIFACT 4: STREET LOOKUP RESULTS
// =============================================================================

/**
 * Build street lookup results summary from captured data.
 * @returns {Object} Street lookup results with statistics
 */
function captureStreetLookupResults() {
    const lookups = window.baselineInstrumentation.streetLookups;

    if (!lookups || lookups.length === 0) {
        console.warn('[BASELINE] No street lookups captured. Was instrumentation enabled?');
        return null;
    }

    // Calculate statistics
    const matched = lookups.filter(l => l.matched);
    const unmatched = lookups.filter(l => !l.matched);

    // Get unique input strings that failed to match
    const failedInputs = [...new Set(unmatched.map(l => l.inputString))];

    // Get unique canonical names that were matched
    const matchedCanonicals = [...new Set(matched.map(l => l.matchedCanonical))];

    const results = {
        captureTimestamp: new Date().toISOString(),
        totalLookups: lookups.length,
        matchCount: matched.length,
        failureCount: unmatched.length,
        matchRate: lookups.length > 0 ? (matched.length / lookups.length * 100).toFixed(2) + '%' : 'N/A',
        uniqueFailedInputs: failedInputs.length,
        uniqueMatchedCanonicals: matchedCanonicals.length,

        // Full lookup log for exact regression comparison
        lookupLog: lookups,

        // Summary lists
        failedInputsList: failedInputs.sort(),
        matchedCanonicalsList: matchedCanonicals.sort()
    };

    console.log(`[BASELINE] Street lookup results captured:`);
    console.log(`  Total lookups: ${results.totalLookups}`);
    console.log(`  Matches: ${results.matchCount} (${results.matchRate})`);
    console.log(`  Failures: ${results.failureCount}`);
    console.log(`  Unique failed inputs: ${results.uniqueFailedInputs}`);

    return results;
}

// =============================================================================
// BASELINE SAVE/LOAD FUNCTIONS
// =============================================================================

/**
 * Save baseline artifact to file (triggers download).
 * @param {Object} data - Data to save
 * @param {string} filename - Filename for download
 */
function downloadBaselineArtifact(data, filename) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`[BASELINE] Downloaded: ${filename}`);
}

/**
 * Capture and save all baseline artifacts.
 * Call this AFTER buildEntityGroupDatabase() completes with instrumentation enabled.
 *
 * @param {EntityGroupDatabase} groupDb - Optional, uses window.entityGroupDatabase if not provided
 */
async function captureAndSaveBaseline(groupDb = null) {
    const db = groupDb || window.entityGroupDatabase;

    if (!db) {
        console.error('[BASELINE] Cannot capture baseline: EntityGroupDatabase not available');
        console.error('[BASELINE] Please run buildEntityGroupDatabase() first');
        return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    console.log('[BASELINE] ===== CAPTURING BASELINE ARTIFACTS =====');

    // Artifact 1: EntityGroup Membership
    const membership = captureEntityGroupMembership(db);
    if (membership) {
        downloadBaselineArtifact(membership, `baseline_entitygroup_membership_${timestamp}.json`);
    }

    // Artifact 2: Address Score Distribution
    const addressDist = captureAddressScoreDistribution();
    if (addressDist) {
        downloadBaselineArtifact(addressDist, `baseline_address_scores_${timestamp}.json`);
    }

    // Artifact 3: Entity Score Distribution
    const entityDist = captureEntityScoreDistribution();
    if (entityDist) {
        downloadBaselineArtifact(entityDist, `baseline_entity_scores_${timestamp}.json`);
    }

    // Artifact 4: Street Lookup Results
    const streetLookups = captureStreetLookupResults();
    if (streetLookups) {
        downloadBaselineArtifact(streetLookups, `baseline_street_lookups_${timestamp}.json`);
    }

    console.log('[BASELINE] ===== BASELINE CAPTURE COMPLETE =====');
    console.log(`[BASELINE] Artifacts saved with timestamp: ${timestamp}`);

    // Return all artifacts for programmatic use
    return {
        timestamp,
        membership,
        addressDistribution: addressDist,
        entityDistribution: entityDist,
        streetLookups
    };
}

// =============================================================================
// BASELINE COMPARISON FUNCTIONS
// =============================================================================

/**
 * Compare two EntityGroup membership snapshots.
 * @param {Object} baseline - Baseline membership snapshot
 * @param {Object} current - Current membership snapshot
 * @returns {Object} { identical, differences }
 */
function compareEntityGroupMembership(baseline, current) {
    const differences = [];

    // Compare total groups
    if (baseline.totalGroups !== current.totalGroups) {
        differences.push({
            type: 'totalGroups',
            baseline: baseline.totalGroups,
            current: current.totalGroups
        });
    }

    // Compare size distribution
    const allSizes = new Set([
        ...Object.keys(baseline.sizeDistribution),
        ...Object.keys(current.sizeDistribution)
    ]);

    for (const size of allSizes) {
        const baseCount = baseline.sizeDistribution[size] || 0;
        const currCount = current.sizeDistribution[size] || 0;

        if (baseCount !== currCount) {
            differences.push({
                type: 'sizeDistribution',
                size: parseInt(size),
                baseline: baseCount,
                current: currCount
            });
        }
    }

    // Compare membership mapping
    const allKeys = new Set([
        ...Object.keys(baseline.membershipMapping),
        ...Object.keys(current.membershipMapping)
    ]);

    for (const key of allKeys) {
        const baseGroup = baseline.membershipMapping[key];
        const currGroup = current.membershipMapping[key];

        if (baseGroup !== currGroup) {
            differences.push({
                type: 'membershipMapping',
                entityKey: key,
                baselineGroup: baseGroup,
                currentGroup: currGroup
            });
        }
    }

    return {
        identical: differences.length === 0,
        differenceCount: differences.length,
        differences: differences.slice(0, 100)  // Limit to first 100
    };
}

/**
 * Compare two score distributions.
 * @param {Object} baseline - Baseline distribution
 * @param {Object} current - Current distribution
 * @returns {Object} { identical, maxDelta, bucketDeltas }
 */
function compareDistribution(baseline, current) {
    const bucketDeltas = {};
    let maxDelta = 0;
    let identical = true;

    // Compare overall distribution
    const baseOverall = baseline.overall?.distribution || {};
    const currOverall = current.overall?.distribution || {};

    const allBuckets = new Set([
        ...Object.keys(baseOverall),
        ...Object.keys(currOverall)
    ]);

    for (const bucket of allBuckets) {
        const baseCount = baseOverall[bucket] || 0;
        const currCount = currOverall[bucket] || 0;
        const delta = currCount - baseCount;

        if (delta !== 0) {
            identical = false;
            bucketDeltas[bucket] = {
                baseline: baseCount,
                current: currCount,
                delta: delta
            };
            maxDelta = Math.max(maxDelta, Math.abs(delta));
        }
    }

    // Compare total counts
    const totalDelta = (current.totalComparisons || 0) - (baseline.totalComparisons || 0);

    return {
        identical,
        totalBaseline: baseline.totalComparisons,
        totalCurrent: current.totalComparisons,
        totalDelta,
        maxBucketDelta: maxDelta,
        bucketDeltas
    };
}

/**
 * Run full regression check against stored baseline.
 * @param {Object} baseline - Object containing all baseline artifacts
 * @param {Object} current - Object containing all current artifacts
 * @returns {Object} Regression check results
 */
function runRegressionCheck(baseline, current) {
    console.log('[BASELINE] ===== RUNNING REGRESSION CHECK =====');

    const results = {
        timestamp: new Date().toISOString(),
        allPassed: true,
        checks: {}
    };

    // Check 1: EntityGroup Membership
    if (baseline.membership && current.membership) {
        const membershipCheck = compareEntityGroupMembership(baseline.membership, current.membership);
        results.checks.entityGroupMembership = {
            passed: membershipCheck.identical,
            differenceCount: membershipCheck.differenceCount,
            sample: membershipCheck.differences.slice(0, 5)
        };
        if (!membershipCheck.identical) results.allPassed = false;
        console.log(`[BASELINE] EntityGroup membership: ${membershipCheck.identical ? 'PASS' : 'FAIL'}`);
    }

    // Check 2: Address Score Distribution
    if (baseline.addressDistribution && current.addressDistribution) {
        const addressCheck = compareDistribution(baseline.addressDistribution, current.addressDistribution);
        results.checks.addressScoreDistribution = {
            passed: addressCheck.identical,
            totalDelta: addressCheck.totalDelta,
            maxBucketDelta: addressCheck.maxBucketDelta
        };
        if (!addressCheck.identical) results.allPassed = false;
        console.log(`[BASELINE] Address score distribution: ${addressCheck.identical ? 'PASS' : 'FAIL'}`);
    }

    // Check 3: Entity Score Distribution
    if (baseline.entityDistribution && current.entityDistribution) {
        const entityCheck = compareDistribution(baseline.entityDistribution, current.entityDistribution);
        results.checks.entityScoreDistribution = {
            passed: entityCheck.identical,
            totalDelta: entityCheck.totalDelta,
            maxBucketDelta: entityCheck.maxBucketDelta
        };
        if (!entityCheck.identical) results.allPassed = false;
        console.log(`[BASELINE] Entity score distribution: ${entityCheck.identical ? 'PASS' : 'FAIL'}`);
    }

    // Check 4: Street Lookup Results
    if (baseline.streetLookups && current.streetLookups) {
        const baseLog = baseline.streetLookups.lookupLog || [];
        const currLog = current.streetLookups.lookupLog || [];

        // Compare lookup-by-lookup if same count
        let streetPassed = baseLog.length === currLog.length;
        let mismatchCount = 0;

        if (streetPassed) {
            for (let i = 0; i < baseLog.length; i++) {
                if (baseLog[i].matched !== currLog[i].matched ||
                    baseLog[i].inputString !== currLog[i].inputString) {
                    streetPassed = false;
                    mismatchCount++;
                }
            }
        }

        results.checks.streetLookups = {
            passed: streetPassed,
            baselineCount: baseLog.length,
            currentCount: currLog.length,
            mismatchCount
        };
        if (!streetPassed) results.allPassed = false;
        console.log(`[BASELINE] Street lookups: ${streetPassed ? 'PASS' : 'FAIL'}`);
    }

    console.log('[BASELINE] ===== REGRESSION CHECK COMPLETE =====');
    console.log(`[BASELINE] Overall result: ${results.allPassed ? 'ALL PASSED' : 'FAILURES DETECTED'}`);

    return results;
}

// =============================================================================
// ONE-CLICK BASELINE CAPTURE (Main Entry Point)
// =============================================================================

/**
 * One-click baseline capture.
 * Enables instrumentation, builds EntityGroup database, captures and saves baseline.
 *
 * @param {Object} options - Options for buildEntityGroupDatabase
 * @returns {Object} Baseline artifacts
 */
async function runBaselineCapture(options = {}) {
    console.log('[BASELINE] ===== STARTING ONE-CLICK BASELINE CAPTURE =====');
    console.log('[BASELINE] This process takes ~20 minutes to build EntityGroups and capture comparison scores.');

    // Check prerequisites
    if (!window.unifiedEntityDatabase || !window.unifiedEntityDatabase.entities) {
        console.error('[BASELINE] ERROR: Unified Entity Database not loaded.');
        console.error('[BASELINE] Please load entities first using "Load Unified Database" button.');
        return null;
    }

    // Load Block Island streets database if not already loaded
    if (!window.blockIslandStreets) {
        console.log('[BASELINE] Block Island streets database not loaded. Loading now...');
        if (typeof loadBlockIslandStreetsFromDrive === 'function') {
            try {
                await loadBlockIslandStreetsFromDrive();
                console.log('[BASELINE] Block Island streets database loaded successfully.');
                console.log(`[BASELINE] Streets count: ${window.blockIslandStreets ? window.blockIslandStreets.size : 0}`);
            } catch (error) {
                console.error('[BASELINE] ERROR: Failed to load Block Island streets database:', error);
                console.error('[BASELINE] Street lookup capture will be incomplete.');
            }
        } else {
            console.error('[BASELINE] ERROR: loadBlockIslandStreetsFromDrive function not available.');
            console.error('[BASELINE] Street lookup capture will be incomplete.');
        }
    } else {
        console.log(`[BASELINE] Block Island streets database already loaded (${window.blockIslandStreets.size} streets).`);
    }

    // Enable instrumentation
    enableBaselineInstrumentation();

    // Build EntityGroup database with instrumentation active
    // Don't save to Google Drive - this is just for baseline capture
    const buildOptions = {
        verbose: true,
        buildConsensus: true,
        saveToGoogleDrive: false,
        ...options
    };

    console.log('[BASELINE] Building EntityGroupDatabase with instrumentation...');
    const groupDb = await buildEntityGroupDatabase(buildOptions);

    if (!groupDb) {
        console.error('[BASELINE] ERROR: EntityGroupDatabase build failed.');
        disableBaselineInstrumentation();
        return null;
    }

    // Disable instrumentation
    disableBaselineInstrumentation();

    // Capture and save baseline
    const baseline = await captureAndSaveBaseline(groupDb);

    console.log('[BASELINE] ===== ONE-CLICK BASELINE CAPTURE COMPLETE =====');

    return baseline;
}

// =============================================================================
// STREET LOOKUP BASELINE CAPTURE
// =============================================================================

/**
 * Capture street lookup baseline by analyzing existing entities.
 *
 * IMPORTANT ARCHITECTURE NOTE:
 * Street lookups occur during entity CREATION (CSV processing), NOT during
 * Unified DB or EntityGroup building. Saved entities already have parsed
 * addresses - no street lookups happen when loading them.
 *
 * This function simulates street lookups by extracting street names from
 * all entity addresses and checking them against the BI street database.
 * This produces the same baseline data as if we captured during CSV processing.
 *
 * @returns {Object} Street lookup baseline artifact
 */
async function captureStreetLookupBaseline() {
    console.log('[BASELINE] ===== CAPTURING STREET LOOKUP BASELINE =====');
    console.log('[BASELINE] Analyzing street names from existing entity addresses.');
    console.log('[BASELINE] (Street lookups originally occur during CSV processing, not DB loading)');

    // Check if Unified Entity Database is loaded
    if (!window.unifiedEntityDatabase || !window.unifiedEntityDatabase.entities) {
        console.error('[BASELINE] ERROR: Unified Entity Database not loaded.');
        console.error('[BASELINE] Please click "Load Unified Database" button first.');
        return null;
    }

    // Load Block Island streets database if not already loaded
    if (!window.blockIslandStreets) {
        console.log('[BASELINE] Block Island streets database not loaded. Loading now...');
        if (typeof loadBlockIslandStreetsFromDrive === 'function') {
            try {
                await loadBlockIslandStreetsFromDrive();
                console.log('[BASELINE] Block Island streets database loaded successfully.');
                console.log(`[BASELINE] Streets count: ${window.blockIslandStreets ? window.blockIslandStreets.size : 0}`);
            } catch (error) {
                console.error('[BASELINE] ERROR: Failed to load Block Island streets database:', error);
                return null;
            }
        } else {
            console.error('[BASELINE] ERROR: loadBlockIslandStreetsFromDrive function not available.');
            return null;
        }
    } else {
        console.log(`[BASELINE] Block Island streets database already loaded (${window.blockIslandStreets.size} streets).`);
    }

    // Helper to extract string from AttributedTerm or plain string
    function getTermString(value) {
        if (!value) return null;
        if (typeof value === 'string') return value;
        if (value.primaryAlias?.term) return value.primaryAlias.term;
        if (value.term) return value.term;
        return null;
    }

    // Collect all street names from all entity addresses
    const streetLookups = [];
    const entities = Object.values(window.unifiedEntityDatabase.entities);
    let addressesChecked = 0;

    console.log(`[BASELINE] Scanning ${entities.length} entities for street names...`);

    for (const entity of entities) {
        // Get all addresses from entity
        // ContactInfo has: primaryAddress (single) and secondaryAddress (array)
        const addresses = [];
        if (entity.contactInfo?.primaryAddress) {
            addresses.push(entity.contactInfo.primaryAddress);
        }
        if (entity.contactInfo?.secondaryAddress && Array.isArray(entity.contactInfo.secondaryAddress)) {
            addresses.push(...entity.contactInfo.secondaryAddress);
        }

        for (const addr of addresses) {
            const streetName = getTermString(addr.streetName);
            if (!streetName) continue;

            addressesChecked++;
            const streetUpper = streetName.toUpperCase().trim();

            // Simulate the street lookup
            let matched = false;
            let matchedCanonical = null;

            // Check against BI street database (same logic as findBlockIslandStreetMatch)
            for (const biStreet of window.blockIslandStreets) {
                if (streetUpper.includes(biStreet.trim())) {
                    if (!matchedCanonical || biStreet.includes(matchedCanonical)) {
                        matchedCanonical = biStreet.trim();
                        matched = true;
                    }
                }
            }

            streetLookups.push({
                inputString: streetUpper,
                matched: matched,
                matchedCanonical: matchedCanonical
            });
        }
    }

    console.log(`[BASELINE] Checked ${addressesChecked} addresses with street names.`);
    console.log(`[BASELINE] Recorded ${streetLookups.length} street lookups.`);

    // Build the results object (same format as captureStreetLookupResults)
    const matched = streetLookups.filter(l => l.matched);
    const unmatched = streetLookups.filter(l => !l.matched);
    const failedInputs = [...new Set(unmatched.map(l => l.inputString))];
    const matchedCanonicals = [...new Set(matched.map(l => l.matchedCanonical))];

    const results = {
        captureTimestamp: new Date().toISOString(),
        captureMethod: 'entity_address_scan',  // Distinguish from runtime capture
        totalLookups: streetLookups.length,
        matchCount: matched.length,
        failureCount: unmatched.length,
        matchRate: streetLookups.length > 0 ? (matched.length / streetLookups.length * 100).toFixed(2) + '%' : 'N/A',
        uniqueFailedInputs: failedInputs.length,
        uniqueMatchedCanonicals: matchedCanonicals.length,
        lookupLog: streetLookups,
        failedInputsList: failedInputs.sort(),
        matchedCanonicalsList: matchedCanonicals.sort()
    };

    // Download the artifact
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    downloadBaselineArtifact(results, `baseline_street_lookups_${timestamp}.json`);

    console.log('[BASELINE] ===== STREET LOOKUP BASELINE CAPTURE COMPLETE =====');
    console.log(`[BASELINE] Total lookups: ${results.totalLookups}`);
    console.log(`[BASELINE] Matches: ${results.matchCount} (${results.matchRate})`);
    console.log(`[BASELINE] Failures: ${results.failureCount}`);
    console.log(`[BASELINE] Unique failed inputs: ${results.uniqueFailedInputs}`);
    if (results.uniqueFailedInputs > 0 && results.uniqueFailedInputs <= 20) {
        console.log(`[BASELINE] Failed inputs: ${results.failedInputsList.join(', ')}`);
    }

    return results;
}

// =============================================================================
// EXPORTS
// =============================================================================

// Export to window for console access
window.enableBaselineInstrumentation = enableBaselineInstrumentation;
window.disableBaselineInstrumentation = disableBaselineInstrumentation;
window.isBaselineInstrumentationEnabled = isBaselineInstrumentationEnabled;
window.recordAddressComparison = recordAddressComparison;
window.recordEntityComparison = recordEntityComparison;
window.recordStreetLookup = recordStreetLookup;
window.captureEntityGroupMembership = captureEntityGroupMembership;
window.captureAddressScoreDistribution = captureAddressScoreDistribution;
window.captureEntityScoreDistribution = captureEntityScoreDistribution;
window.captureStreetLookupResults = captureStreetLookupResults;
window.captureAndSaveBaseline = captureAndSaveBaseline;
window.compareEntityGroupMembership = compareEntityGroupMembership;
window.compareDistribution = compareDistribution;
window.runRegressionCheck = runRegressionCheck;
window.runBaselineCapture = runBaselineCapture;
window.captureStreetLookupBaseline = captureStreetLookupBaseline;

console.log('[streetArchitectureBaseline.js] Loaded.');
console.log('  - runBaselineCapture() - Capture EntityGroup + comparison baselines (~20 min)');
console.log('  - captureStreetLookupBaseline() - Capture street lookup baseline (scans entity addresses)');
