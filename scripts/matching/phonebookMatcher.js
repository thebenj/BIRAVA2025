/**
 * PhonebookMatcher - Matches parsed phonebook records against EntityGroup collections
 *
 * This module implements the collection lookup phase (Task 4.5) of phonebook integration.
 * Given parsed phonebook records (from phonebookParser.js), it searches all EntityGroup
 * collections to find name and address matches, returning raw hit data for downstream
 * classification (Task 4.7) and priority handling (Task 4.9).
 *
 * Dependencies:
 * - EntityGroupDatabase with populated member collections (individualNames, blockIslandAddresses, etc.)
 * - IndividualName.compareTo() from aliasClasses.js (accepts plain {firstName, lastName} objects)
 * - window.phonebookResults from phonebookParser.js
 *
 * @see reference_phonebookIntegration.md Phase B Design Decisions
 */

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Parse an EntityGroup blockIslandAddresses collection key and extract/normalize
 * the fire number portion. Collection keys have format "{fireNum}:{streetKey}".
 *
 * Fire number normalization strips letter suffixes (collision indicators):
 *   "123" → { raw: "123", normalized: "123", hasLetterSuffix: false }
 *   "123A" → { raw: "123A", normalized: "123", hasLetterSuffix: true }
 *
 * @param {string} collectionKey - Key from group.blockIslandAddresses (e.g., "123:OCEAN VIEW ROAD")
 * @returns {{ raw: string, normalized: string, hasLetterSuffix: boolean, streetKey: string }}
 */
function normalizeCollectionFireNumber(collectionKey) {
    const colonIndex = collectionKey.indexOf(':');
    if (colonIndex < 0) {
        // Malformed key — no colon separator
        return { raw: collectionKey, normalized: collectionKey.replace(/\D/g, ''), hasLetterSuffix: false, streetKey: '' };
    }

    const raw = collectionKey.substring(0, colonIndex);
    const streetKey = collectionKey.substring(colonIndex + 1);
    const normalized = raw.replace(/\D/g, '');  // digits only
    const hasLetterSuffix = raw !== normalized;

    return { raw, normalized, hasLetterSuffix, streetKey };
}

/**
 * Create plain name objects from a phonebook record for comparison.
 * Returns 1 object for individuals, 2 for couples (shared lastName, different firstName).
 *
 * @param {Object} record - Parsed phonebook record
 * @returns {Array<{firstName: string, lastName: string, otherNames: string}>}
 */
function createPhonebookNameObjects(record) {
    const names = [];

    if (record.name.firstName && record.name.lastName) {
        names.push({
            firstName: record.name.firstName,
            lastName: record.name.lastName,
            otherNames: record.name.otherNames || ''
        });
    } else if (record.name.lastName) {
        // Last name only (no first name)
        names.push({
            firstName: '',
            lastName: record.name.lastName,
            otherNames: ''
        });
    }

    // For couples: add second person (shared last name, different first name)
    if (record.name.isCouple && record.name.secondName && record.name.lastName) {
        names.push({
            firstName: record.name.secondName,
            lastName: record.name.lastName,
            otherNames: ''
        });
    }

    return names;
}

/**
 * Extract the best score from an IndividualName.compareTo() four-score result.
 * Scores of -1 mean "no entries in that category" and are excluded.
 * Synonym is always 0 and excluded by design.
 *
 * @param {{ primary: number, homonym: number, synonym: number, candidate: number }} fourScore
 * @returns {number} Best applicable score (0 if none)
 */
function bestScoreFromFourScore(fourScore) {
    let best = 0;
    if (fourScore.primary >= 0) best = Math.max(best, fourScore.primary);
    if (fourScore.homonym >= 0) best = Math.max(best, fourScore.homonym);
    if (fourScore.candidate >= 0) best = Math.max(best, fourScore.candidate);
    // synonym intentionally excluded (always 0, represents unverified relationship)
    return best;
}

// =============================================================================
// NAME LOOKUP
// =============================================================================

/**
 * Compare phonebook name objects against a single EntityGroup's name collections.
 * Checks both individualNames{} (database-recognized) and unrecognizedIndividualNames{}.
 *
 * @param {Array<{firstName: string, lastName: string, otherNames: string}>} phonebookNames
 *     Array of 1 or 2 name objects (2 for couples)
 * @param {EntityGroup} group - The EntityGroup to search
 * @returns {Array<{score: number, matchedGroupName: Object, matchedGroupNameKey: string,
 *                  phonebookName: Object, fromCollection: string}>}
 *     Array of hits above threshold (may be empty)
 */
function lookupNamesInGroup(phonebookNames, group) {
    const NAME_THRESHOLD = 0.80;
    const hits = [];

    // Check recognized names (individualNames{})
    const recognizedNames = group.individualNames || {};
    for (const [key, groupName] of Object.entries(recognizedNames)) {
        for (const pbName of phonebookNames) {
            const fourScore = groupName.compareTo(pbName);
            const score = bestScoreFromFourScore(fourScore);
            if (score >= NAME_THRESHOLD) {
                hits.push({
                    score,
                    fourScore,
                    matchedGroupName: groupName,
                    matchedGroupNameKey: key,
                    phonebookName: pbName,
                    fromCollection: 'individualNames'
                });
            }
        }
    }

    // Check unrecognized names (unrecognizedIndividualNames{})
    // These are names in the group not in the IndividualNameDatabase —
    // still real people, but with fewer aliases so matches rely more on primary score
    const unrecognizedNames = group.unrecognizedIndividualNames || {};
    for (const [key, groupName] of Object.entries(unrecognizedNames)) {
        for (const pbName of phonebookNames) {
            const fourScore = groupName.compareTo(pbName);
            const score = bestScoreFromFourScore(fourScore);
            if (score >= NAME_THRESHOLD) {
                hits.push({
                    score,
                    fourScore,
                    matchedGroupName: groupName,
                    matchedGroupNameKey: key,
                    phonebookName: pbName,
                    fromCollection: 'unrecognizedIndividualNames'
                });
            }
        }
    }

    return hits;
}

// =============================================================================
// ADDRESS LOOKUP
// =============================================================================

/**
 * Compare a phonebook record's address against a single EntityGroup's address collections.
 * Implements the fire-number-is-sufficient-on-BI principle.
 *
 * Gate: Only attempts matching if the phonebook address is a recognized BI address.
 *
 * @param {Object} record - Parsed phonebook record (needs record.address fields)
 * @param {EntityGroup} group - The EntityGroup to search
 * @returns {Array<{matchedGroupAddress: Object, matchedGroupAddressKey: string,
 *                  isCollision: boolean, matchType: string}>}
 *     Array of address hits (may be empty)
 */
function lookupAddressInGroup(record, group) {
    const hits = [];
    const addr = record.address;

    // Gate: must be a recognized BI address
    if (!addr || !addr.isValidBIStreet) return hits;

    const blockIslandAddresses = group.blockIslandAddresses || {};

    if (addr.fireNumber) {
        // --- CASE: Phonebook has fire number ---
        // Fire numbers are unique on Block Island. Fire number match = address match.
        // Street name is irrelevant when fire number matches.
        for (const [key, groupAddress] of Object.entries(blockIslandAddresses)) {
            const parsed = normalizeCollectionFireNumber(key);

            if (parsed.normalized === addr.fireNumber) {
                // Fire number match — this IS an address match
                const isCollision = addr.hasCollisionSuffix || parsed.hasLetterSuffix;
                hits.push({
                    matchedGroupAddress: groupAddress,
                    matchedGroupAddressKey: key,
                    isCollision,
                    matchType: 'fireNumber'
                });
            }
        }
    } else if (addr.streetNormalized) {
        // --- CASE: No fire number but has verified BI street ---
        // Match on street name only
        for (const [key, groupAddress] of Object.entries(blockIslandAddresses)) {
            const parsed = normalizeCollectionFireNumber(key);

            if (parsed.streetKey === addr.streetNormalized) {
                hits.push({
                    matchedGroupAddress: groupAddress,
                    matchedGroupAddressKey: key,
                    isCollision: false,
                    matchType: 'streetOnly'
                });
            }
        }
    }

    return hits;
}

// =============================================================================
// PO BOX LOOKUP
// =============================================================================

/**
 * Check if a phonebook record's PO box matches any entry in an EntityGroup's PO box collection.
 *
 * @param {Object} record - Parsed phonebook record (needs record.address.box)
 * @param {EntityGroup} group - The EntityGroup to search
 * @returns {Array<{matchedBox: Object, matchedBoxKey: string}>}
 *     Array of PO box hits (may be empty)
 */
function lookupPOBoxInGroup(record, group) {
    const hits = [];
    const box = record.address?.box;

    if (!box) return hits;

    const poBoxes = group.blockIslandPOBoxes || {};
    const normalizedBox = box.trim().toUpperCase();

    for (const [key, poBox] of Object.entries(poBoxes)) {
        if (key.trim().toUpperCase() === normalizedBox) {
            hits.push({
                matchedBox: poBox,
                matchedBoxKey: key
            });
        }
    }

    return hits;
}

// =============================================================================
// CORE MATCHING FUNCTION
// =============================================================================

/**
 * Match a single phonebook record against all EntityGroups.
 * Returns raw hit data — name hits, address hits, and PO box hits per group.
 * Downstream classification (Task 4.7) determines Full/Name/Address/None match types.
 *
 * @param {Object} record - Parsed phonebook record from window.phonebookResults.records[]
 * @param {EntityGroupDatabase} groupDb - The EntityGroup database
 * @param {Object} entityDb - The unified entity database (unifiedEntityDatabase.entities)
 * @returns {{ record: Object, nameHits: Array, addressHits: Array, poBoxHits: Array }}
 */
function matchPhonebookRecordToGroups(record, groupDb, entityDb) {
    const phonebookNames = createPhonebookNameObjects(record);
    const allNameHits = [];
    const allAddressHits = [];
    const allPoBoxHits = [];

    for (const group of groupDb.getAllGroups()) {
        // Name lookup: compare phonebook name(s) against group's name collections
        if (phonebookNames.length > 0) {
            const nameHits = lookupNamesInGroup(phonebookNames, group);
            for (const hit of nameHits) {
                allNameHits.push({ group, ...hit });
            }
        }

        // Address lookup: compare phonebook address against group's BI address collection
        const addressHits = lookupAddressInGroup(record, group);
        for (const hit of addressHits) {
            allAddressHits.push({ group, ...hit });
        }

        // PO Box lookup: check phonebook PO box against group's PO box collection
        const poBoxHits = lookupPOBoxInGroup(record, group);
        for (const hit of poBoxHits) {
            allPoBoxHits.push({ group, ...hit });
        }
    }

    return {
        record,
        nameHits: allNameHits,
        addressHits: allAddressHits,
        poBoxHits: allPoBoxHits
    };
}

// =============================================================================
// BATCH MATCHING FUNCTION
// =============================================================================

/**
 * Match all parsed phonebook records against the EntityGroup database.
 * Iterates window.phonebookResults.records, calls matchPhonebookRecordToGroups for each,
 * and stores results in window.phonebookMatchResults.
 *
 * @param {EntityGroupDatabase} groupDb - The EntityGroup database
 * @param {Object} entityDb - The unified entity database (unifiedEntityDatabase.entities)
 * @returns {Array<Object>} Array of match results (one per record)
 */
function matchAllPhonebookRecords(groupDb, entityDb) {
    if (!window.phonebookResults || !window.phonebookResults.records) {
        console.error('No phonebook results found. Run processPhonebookFile() first.');
        return [];
    }

    if (!groupDb) {
        console.error('No EntityGroup database provided.');
        return [];
    }

    const records = window.phonebookResults.records;
    const results = [];
    const startTime = Date.now();

    console.log(`=== PHONEBOOK MATCHING START ===`);
    console.log(`Records to match: ${records.length}`);
    console.log(`EntityGroups to search: ${groupDb.stats?.totalGroups || 'unknown'}`);

    for (let i = 0; i < records.length; i++) {
        const result = matchPhonebookRecordToGroups(records[i], groupDb, entityDb);
        results.push(result);

        // Progress logging every 100 records
        if ((i + 1) % 100 === 0) {
            console.log(`  Matched ${i + 1}/${records.length} records...`);
        }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Compute summary statistics
    const withNameHits = results.filter(r => r.nameHits.length > 0).length;
    const withAddressHits = results.filter(r => r.addressHits.length > 0).length;
    const withPoBoxHits = results.filter(r => r.poBoxHits.length > 0).length;
    const withBothNameAndAddress = results.filter(r => {
        if (r.nameHits.length === 0 || r.addressHits.length === 0) return false;
        // Check if any name hit and address hit share the same group
        const nameGroupIndices = new Set(r.nameHits.map(h => h.group.index));
        return r.addressHits.some(h => nameGroupIndices.has(h.group.index));
    }).length;
    const withNoHits = results.filter(r =>
        r.nameHits.length === 0 && r.addressHits.length === 0 && r.poBoxHits.length === 0
    ).length;
    const withCollisionHits = results.filter(r =>
        r.addressHits.some(h => h.isCollision)
    ).length;

    console.log(`\n=== PHONEBOOK MATCHING COMPLETE (${elapsed}s) ===`);
    console.log(`Total records matched: ${results.length}`);
    console.log(`  With name hits:           ${withNameHits}`);
    console.log(`  With address hits:        ${withAddressHits}`);
    console.log(`  With PO box hits:         ${withPoBoxHits}`);
    console.log(`  With name+address (same group): ${withBothNameAndAddress}`);
    console.log(`  With collision flag:      ${withCollisionHits}`);
    console.log(`  With NO hits at all:      ${withNoHits}`);

    // Store results globally
    window.phonebookMatchResults = results;
    console.log(`Results stored in window.phonebookMatchResults`);

    return results;
}

// =============================================================================
// MATCH CLASSIFICATION (Task 4.7)
// =============================================================================

/**
 * Classification thresholds for phonebook matching.
 *
 * Phonebook address matching is binary (fire number or street match), not scored.
 * The four MATCH_CRITERIA conditions (from unifiedEntityBrowser.js) collapse to:
 *
 *   With address (no collision): contactInfoAlone=1.0 > 0.85 → always passes
 *   With address + collision: contactInfoAlone disabled → need nameAlone >= 0.845
 *   Name only: only nameAlone condition applies → need >= 0.845
 *
 * See reference_phonebookIntegration.md Section 4.7 for derivation.
 */
const PHONEBOOK_CLASSIFICATION_THRESHOLDS = {
    nameWithAddress: 0.80,      // name threshold when address corroborates (matcher minimum)
    nameWithCollision: 0.845,   // name threshold when address has collision flag
    nameAlone: 0.845            // name threshold with no address evidence (nearMatch nameAlone)
};

/**
 * Classify a single phonebook record's raw match hits into Full/Name/Address matches.
 *
 * Algorithm:
 * 1. Group all hits by EntityGroup (by group.index)
 * 2. For each group, determine match type based on what hit types exist and scores
 * 3. Handle couple Condition 2 (both persons match different names + address)
 * 4. Apply priority: full matches supersede all partial matches
 *
 * @param {Object} matchResult - One entry from matchAllPhonebookRecords() output
 * @returns {{ record: Object, fullMatches: Array, nameMatches: Array, addressMatches: Array }}
 */
function classifyPhonebookMatch(matchResult) {
    const { record, nameHits, addressHits, poBoxHits } = matchResult;
    const T = PHONEBOOK_CLASSIFICATION_THRESHOLDS;
    const isCouple = record.name.isCouple && record.name.secondName;

    // --- Step 1: Group hits by EntityGroup ---
    const groupBuckets = new Map();  // group.index → { nameHits, addressHits, poBoxHits }

    for (const hit of nameHits) {
        const idx = hit.group.index;
        if (!groupBuckets.has(idx)) {
            groupBuckets.set(idx, { group: hit.group, nameHits: [], addressHits: [], poBoxHits: [] });
        }
        groupBuckets.get(idx).nameHits.push(hit);
    }
    for (const hit of addressHits) {
        const idx = hit.group.index;
        if (!groupBuckets.has(idx)) {
            groupBuckets.set(idx, { group: hit.group, nameHits: [], addressHits: [], poBoxHits: [] });
        }
        groupBuckets.get(idx).addressHits.push(hit);
    }
    for (const hit of poBoxHits) {
        const idx = hit.group.index;
        if (!groupBuckets.has(idx)) {
            groupBuckets.set(idx, { group: hit.group, nameHits: [], addressHits: [], poBoxHits: [] });
        }
        groupBuckets.get(idx).poBoxHits.push(hit);
    }

    // --- Step 2 & 3: Classify each group ---
    const fullMatches = [];
    const nameMatches = [];
    const addressMatches = [];

    for (const [groupIndex, bucket] of groupBuckets) {
        const hasAddress = bucket.addressHits.length > 0;
        const hasPoBox = bucket.poBoxHits.length > 0;
        const hasAddressEvidence = hasAddress || hasPoBox;
        const isCollision = bucket.addressHits.some(h => h.isCollision);
        const bestNameScore = bucket.nameHits.length > 0
            ? Math.max(...bucket.nameHits.map(h => h.score))
            : 0;
        const hasNameHits = bucket.nameHits.length > 0;

        // --- Couple Condition 2 check ---
        let isCoupleCondition2 = false;
        if (isCouple && hasAddressEvidence && bucket.nameHits.length >= 2) {
            isCoupleCondition2 = checkCoupleCondition2(bucket.nameHits, record, T);
        }

        // Address-only rule: streetOnly matches require name corroboration.
        // Only fire number or PO box matches can stand alone as Address-only.
        const hasFireNumberHit = bucket.addressHits.some(h => h.matchType === 'fireNumber');
        const hasStrongAddressEvidence = hasFireNumberHit || hasPoBox;

        // --- Classify this group ---
        if (hasNameHits && hasAddressEvidence) {
            // Name + address to same group → Full Match candidate
            // (streetOnly address is fine here — name corroborates it)
            const nameThreshold = isCollision ? T.nameWithCollision : T.nameWithAddress;
            if (bestNameScore >= nameThreshold || isCoupleCondition2) {
                fullMatches.push({
                    group: bucket.group,
                    nameHits: bucket.nameHits,
                    addressHits: bucket.addressHits,
                    poBoxHits: bucket.poBoxHits,
                    bestNameScore,
                    isCollision,
                    isCoupleCondition2
                });
                continue;
            }
            // Name present but below threshold with collision → falls through
            // Treat as address-only if strong address evidence and no collision
            if (hasStrongAddressEvidence && !isCollision) {
                addressMatches.push({
                    group: bucket.group,
                    addressHits: bucket.addressHits,
                    poBoxHits: bucket.poBoxHits,
                    isCollision: false
                });
            }
            // streetOnly + weak name, or collision + weak name → no match for this group
        } else if (hasNameHits && !hasAddressEvidence) {
            // Name only → Name Match if score meets threshold
            if (bestNameScore >= T.nameAlone) {
                nameMatches.push({
                    group: bucket.group,
                    nameHits: bucket.nameHits,
                    bestNameScore
                });
            }
        } else if (!hasNameHits && hasAddressEvidence) {
            // Address only → requires fire number or PO box (streetOnly too weak alone)
            if (hasStrongAddressEvidence && !isCollision) {
                addressMatches.push({
                    group: bucket.group,
                    addressHits: bucket.addressHits,
                    poBoxHits: bucket.poBoxHits,
                    isCollision: false
                });
            }
            // streetOnly with no name, or collision with no name → no match
        }
    }

    // --- Step 4: Apply priority rule ---
    // Full matches supersede all partial matches
    if (fullMatches.length > 0) {
        return { record, fullMatches, nameMatches: [], addressMatches: [] };
    }

    return { record, fullMatches: [], nameMatches, addressMatches };
}

/**
 * Check Couple Condition 2: both persons match different names in the group
 * with scores >= nameAlone threshold.
 *
 * Condition 2: Both members' nameAlone > 0.845, each matched to DIFFERENT
 * names in the group, AND the group has address evidence.
 * (Address evidence is checked by caller before invoking this.)
 *
 * @param {Array} nameHits - Name hits for this group
 * @param {Object} record - The phonebook record
 * @param {Object} thresholds - PHONEBOOK_CLASSIFICATION_THRESHOLDS
 * @returns {boolean}
 */
function checkCoupleCondition2(nameHits, record, thresholds) {
    // Partition name hits by which person in the couple produced them
    const person1Hits = [];  // firstName
    const person2Hits = [];  // secondName

    for (const hit of nameHits) {
        if (hit.phonebookName.firstName === record.name.firstName) {
            person1Hits.push(hit);
        } else if (hit.phonebookName.firstName === record.name.secondName) {
            person2Hits.push(hit);
        }
    }

    if (person1Hits.length === 0 || person2Hits.length === 0) return false;

    // Find best qualifying hit for each person
    const best1 = person1Hits.reduce((best, h) => h.score > best.score ? h : best);
    const best2 = person2Hits.reduce((best, h) => h.score > best.score ? h : best);

    // Both must meet the nameAlone threshold
    if (best1.score < thresholds.nameAlone || best2.score < thresholds.nameAlone) return false;

    // Must have matched DIFFERENT group names
    if (best1.matchedGroupNameKey === best2.matchedGroupNameKey) return false;

    return true;
}

/**
 * Classify all phonebook match results.
 * Iterates match results, classifies each, logs summary statistics,
 * and stores results in window.phonebookClassifiedResults.
 *
 * @param {Array} matchResults - Output from matchAllPhonebookRecords() (or window.phonebookMatchResults)
 * @returns {Array} Array of classified results
 */
function classifyAllPhonebookMatches(matchResults) {
    if (!matchResults || matchResults.length === 0) {
        console.error('No match results to classify. Run matchAllPhonebookRecords() first.');
        return [];
    }

    const startTime = Date.now();
    const classified = [];

    for (const result of matchResults) {
        classified.push(classifyPhonebookMatch(result));
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // --- Summary statistics ---
    let fullMatchRecords = 0, fullMatchGroups = 0;
    let nameMatchRecords = 0, nameMatchGroups = 0;
    let addressMatchRecords = 0, addressMatchGroups = 0;
    let bothPartialRecords = 0;
    let noMatchRecords = 0;
    let coupleCondition2Count = 0;
    let collisionInvolvedCount = 0;

    for (const c of classified) {
        const hasFull = c.fullMatches.length > 0;
        const hasName = c.nameMatches.length > 0;
        const hasAddress = c.addressMatches.length > 0;

        if (hasFull) {
            fullMatchRecords++;
            fullMatchGroups += c.fullMatches.length;
            if (c.fullMatches.some(m => m.isCoupleCondition2)) coupleCondition2Count++;
            if (c.fullMatches.some(m => m.isCollision)) collisionInvolvedCount++;
        } else if (hasName && hasAddress) {
            // Record has both name-only and address-only matches to different groups
            bothPartialRecords++;
            nameMatchGroups += c.nameMatches.length;
            addressMatchGroups += c.addressMatches.length;
        } else if (hasName) {
            nameMatchRecords++;
            nameMatchGroups += c.nameMatches.length;
        } else if (hasAddress) {
            addressMatchRecords++;
            addressMatchGroups += c.addressMatches.length;
        } else {
            noMatchRecords++;
        }
    }

    console.log(`\n=== PHONEBOOK CLASSIFICATION COMPLETE (${elapsed}s) ===`);
    console.log(`Total records: ${classified.length}`);
    console.log(`  Full match:       ${fullMatchRecords} records (${fullMatchGroups} group-level matches)`);
    console.log(`  Name-only:        ${nameMatchRecords} records (${nameMatchGroups} group-level matches)`);
    console.log(`  Address-only:     ${addressMatchRecords} records (${addressMatchGroups} group-level matches)`);
    console.log(`  Name + Address:   ${bothPartialRecords} records (partial matches to different groups)`);
    console.log(`  No match:         ${noMatchRecords} records`);
    console.log(`  ---`);
    console.log(`  Couple Cond. 2:   ${coupleCondition2Count} records`);
    console.log(`  Collision:        ${collisionInvolvedCount} records`);
    console.log(`  Sum check:        ${fullMatchRecords + nameMatchRecords + addressMatchRecords + bothPartialRecords + noMatchRecords} (should equal ${classified.length})`);
    console.log(`\nThresholds: nameWithAddress=${PHONEBOOK_CLASSIFICATION_THRESHOLDS.nameWithAddress}, nameWithCollision=${PHONEBOOK_CLASSIFICATION_THRESHOLDS.nameWithCollision}, nameAlone=${PHONEBOOK_CLASSIFICATION_THRESHOLDS.nameAlone}`);
    console.log(`Address-only rule: fire number or PO box required (streetOnly needs name corroboration)`);

    window.phonebookClassifiedResults = classified;
    console.log(`Results stored in window.phonebookClassifiedResults`);

    return classified;
}

// =============================================================================
// DIAGNOSTIC / INSPECTION UTILITIES
// =============================================================================

/**
 * Inspect match results for a specific phonebook record (by index).
 * Logs detailed hit information to the console.
 *
 * @param {number} recordIndex - Index into window.phonebookMatchResults
 */
function inspectPhonebookMatch(recordIndex) {
    if (!window.phonebookMatchResults) {
        console.error('No match results. Run matchAllPhonebookRecords() first.');
        return;
    }

    const result = window.phonebookMatchResults[recordIndex];
    if (!result) {
        console.error(`No result at index ${recordIndex}. Valid range: 0-${window.phonebookMatchResults.length - 1}`);
        return;
    }

    const rec = result.record;
    console.log(`\n=== PHONEBOOK MATCH INSPECTION: Record ${recordIndex} ===`);
    console.log(`Line ${rec.lineNumber}: ${rec.rawLine}`);
    console.log(`Name: ${rec.name.firstName || ''} ${rec.name.lastName || ''}${rec.name.isCouple ? ' & ' + rec.name.secondName : ''}`);
    console.log(`Address: ${rec.address.street || 'N/A'} (fire#: ${rec.address.fireNumber || 'none'}, BI: ${rec.address.isValidBIStreet}, box: ${rec.address.box || 'none'})`);
    console.log(`Phone: ${rec.phone || 'N/A'}`);

    console.log(`\nName Hits (${result.nameHits.length}):`);
    for (const hit of result.nameHits) {
        const groupName = hit.matchedGroupName?.primaryAlias?.term || hit.matchedGroupNameKey;
        console.log(`  Group ${hit.group.index}: score=${hit.score.toFixed(3)} matched="${groupName}" from=${hit.fromCollection} pb="${hit.phonebookName.firstName} ${hit.phonebookName.lastName}"`);
    }

    console.log(`\nAddress Hits (${result.addressHits.length}):`);
    for (const hit of result.addressHits) {
        console.log(`  Group ${hit.group.index}: key="${hit.matchedGroupAddressKey}" type=${hit.matchType} collision=${hit.isCollision}`);
    }

    console.log(`\nPO Box Hits (${result.poBoxHits.length}):`);
    for (const hit of result.poBoxHits) {
        console.log(`  Group ${hit.group.index}: box="${hit.matchedBoxKey}"`);
    }
}

/**
 * Inspect classified results for a specific phonebook record (by index).
 * Logs the classification and all match details to the console.
 *
 * @param {number} recordIndex - Index into window.phonebookClassifiedResults
 */
function inspectClassifiedMatch(recordIndex) {
    if (!window.phonebookClassifiedResults) {
        console.error('No classified results. Run classifyAllPhonebookMatches() first.');
        return;
    }

    const result = window.phonebookClassifiedResults[recordIndex];
    if (!result) {
        console.error(`No result at index ${recordIndex}. Valid range: 0-${window.phonebookClassifiedResults.length - 1}`);
        return;
    }

    const rec = result.record;
    const hasFull = result.fullMatches.length > 0;
    const hasName = result.nameMatches.length > 0;
    const hasAddress = result.addressMatches.length > 0;
    const classification = hasFull ? 'FULL MATCH' : (hasName || hasAddress) ? 'PARTIAL' : 'NO MATCH';

    console.log(`\n=== CLASSIFIED MATCH: Record ${recordIndex} — ${classification} ===`);
    console.log(`Line ${rec.lineNumber}: ${rec.name.firstName || ''} ${rec.name.lastName || ''}${rec.name.isCouple ? ' & ' + rec.name.secondName : ''}`);
    console.log(`Address: ${rec.address.street || 'N/A'} | Box: ${rec.address.box || 'none'} | Phone: ${rec.phone || 'N/A'}`);

    if (hasFull) {
        console.log(`\nFull Matches (${result.fullMatches.length}):`);
        for (const m of result.fullMatches) {
            const nameDesc = m.nameHits.map(h => {
                const gn = h.matchedGroupName?.primaryAlias?.term || h.matchedGroupNameKey;
                return `${h.phonebookName.firstName} ${h.phonebookName.lastName}→"${gn}" (${h.score.toFixed(3)})`;
            }).join('; ');
            const addrDesc = m.addressHits.map(h => `${h.matchedGroupAddressKey} [${h.matchType}]`).join('; ');
            const boxDesc = m.poBoxHits.map(h => `Box ${h.matchedBoxKey}`).join('; ');
            console.log(`  Group ${m.group.index}: bestName=${m.bestNameScore.toFixed(3)} collision=${m.isCollision} couple2=${m.isCoupleCondition2}`);
            console.log(`    Names: ${nameDesc}`);
            if (addrDesc) console.log(`    Addresses: ${addrDesc}`);
            if (boxDesc) console.log(`    PO Boxes: ${boxDesc}`);
        }
    }

    if (hasName) {
        console.log(`\nName Matches (${result.nameMatches.length}):`);
        for (const m of result.nameMatches) {
            const nameDesc = m.nameHits.map(h => {
                const gn = h.matchedGroupName?.primaryAlias?.term || h.matchedGroupNameKey;
                return `${h.phonebookName.firstName} ${h.phonebookName.lastName}→"${gn}" (${h.score.toFixed(3)})`;
            }).join('; ');
            console.log(`  Group ${m.group.index}: bestName=${m.bestNameScore.toFixed(3)}`);
            console.log(`    Names: ${nameDesc}`);
        }
    }

    if (hasAddress) {
        console.log(`\nAddress Matches (${result.addressMatches.length}):`);
        for (const m of result.addressMatches) {
            const addrDesc = m.addressHits.map(h => `${h.matchedGroupAddressKey} [${h.matchType}]`).join('; ');
            const boxDesc = m.poBoxHits.map(h => `Box ${h.matchedBoxKey}`).join('; ');
            console.log(`  Group ${m.group.index}: collision=${m.isCollision}`);
            if (addrDesc) console.log(`    Addresses: ${addrDesc}`);
            if (boxDesc) console.log(`    PO Boxes: ${boxDesc}`);
        }
    }

    if (!hasFull && !hasName && !hasAddress) {
        console.log(`\n  (No matches at any classification level)`);
    }
}

console.log('PhonebookMatcher (matching + classification) loaded.');
