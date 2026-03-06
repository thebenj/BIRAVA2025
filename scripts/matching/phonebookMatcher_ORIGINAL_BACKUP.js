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

// =============================================================================
// NON-HUMAN DETECTION
// Validated Session 118 P-2: 98.6% detection rate, 0% false positive rate
// Single return type: 'NONHUMAN' or null (no sub-classification)
// =============================================================================

/**
 * Merged set of all non-human indicator terms.
 * Checked word-by-word against name parts (exact word match via Set.has).
 * Derived from Session 114 term lists, simplified in Session 118 P-2 review.
 */
const NON_HUMAN_TERMS = new Set([
    // Legal/corporate forms
    'LLC', 'INC', 'CORP', 'TRUST', 'TRUSTS', 'TRUSTEE', 'TRUSTEES',
    'ESTATE', 'FOUNDATION', 'ASSOCIATION', 'ASSOC', 'HOA', 'SOCIETY',
    'COMPANY', 'ENTERPRISES', 'PROPERTIES', 'INVESTMENTS', 'HOLDINGS',
    'MANAGEMENT', 'SERVICES', 'PARTNERS', 'PARTNERSHIP', 'CO', 'LTD',
    'LIMITED', 'INCORPORATED', 'CONSERVANCY', 'IRT', 'IRTRUST', 'QPRT',
    // Lodging/hospitality
    'HOTEL', 'MOTEL', 'INN', 'RESORT', 'SUITES', 'COTTAGE', 'COTTAGES',
    // Food/drink
    'RESTAURANT', 'RESTAURANTS', 'DELI', 'CAFE', 'COFFEE', 'PIZZA',
    'BAR', 'PUB', 'TAVERN', 'TAPROOM', 'BAKERY', 'CATERING',
    'SEAFOOD', 'TRATTORIA',
    // Retail
    'STORE', 'STORES', 'SHOP', 'SHOPS', 'MARKET', 'MARKETS',
    'GALLERY', 'GALLERIES', 'PHARMACY', 'FLORIST',
    'HARDWARE', 'LUMBER', 'NURSERY', 'SUPPLY', 'SUPPLIES',
    'APPLIANCE', 'APPLIANCES', 'CABINETS', 'EQUIPMENT',
    'LIQUORS', 'WAREHOUSE',
    // Real estate/finance
    'REALTY', 'REALTOR', 'INSURANCE', 'AGENCY', 'AGENCIES',
    'RENTAL', 'RENTALS',
    // Transportation
    'AIRLINE', 'AIRLINES', 'FERRY', 'FERRIES', 'TAXI', 'CAB',
    'EXPRESS', 'CHARTER', 'CHARTERS', 'MOVERS', 'MOVING', 'PARKING',
    // Construction/trades
    'CONSTRUCTION', 'CONTRACTOR', 'CONTRACTORS', 'CONTRACTING',
    'PLUMBING', 'HEATING', 'COOLING', 'ROOFING', 'PAINTING',
    'ELECTRIC', 'ELECTRICAL', 'EXCAVATION', 'EXCAVATING',
    'PAVING', 'MASONRY', 'CARPENTRY', 'BUILDERS',
    'REPAIR', 'IMPROVEMENT',
    // Professional services
    'ATTORNEY', 'ATTORNEYS', 'LAW', 'ACCOUNTING', 'CONSULTING',
    'ARCHITECTURE', 'DESIGN', 'DESIGNS', 'STUDIO', 'STUDIOS',
    'OPTOMETRIST',
    // Marine/outdoor
    'MARINA', 'BOAT', 'BOATS', 'DIVE', 'DOCK',
    // Other services
    'LANDSCAPING', 'LANDSCAPE', 'CLEANING', 'STORAGE',
    'DISPOSAL', 'SANITATION', 'REFUSE', 'RECYCLING',
    'SPA', 'SALON', 'FITNESS', 'GYM',
    'CLINIC', 'MEDICAL', 'DENTAL', 'VETERINARY', 'VET',
    'AUTO', 'AUTOMOTIVE',
    'GARDEN', 'GARDENS',
    'DIRECTORY',
    // Government
    'DEPT', 'DEPARTMENT',
    'OFFICE', 'CLERK', 'MANAGER',
    'ASSESSOR', 'COLLECTOR', 'TREASURER',
    'HARBORMASTER', 'DOCKMASTER',
    'DIRECTOR', 'SUPERINTENDENT',
    'LIBRARIAN', 'LIBRARY',
    'POLICE', 'FIRE',
    'HIGHWAY', 'ZONING', 'PLANNING',
    'INSPECTOR', 'CONSTABLE', 'WARDEN',
    'COUNCIL', 'COMMISSIONER', 'SELECTMAN',
    'COMMISSION', 'LICENSE', 'SECURITY',
    'OFFICIAL', 'PHYSICIAN', 'GARAGE', 'STATION',
    // Nonprofit/religious (PARISH removed — legitimate surname)
    'MEMORIAL', 'HOUSING', 'RESCUE', 'SQUAD',
    'VOLUNTEER', 'AMBULANCE',
    'RECTORY', 'CHURCH', 'DIOCESE',
    'SYNAGOGUE', 'TEMPLE', 'CEMETERY',
    'HISTORICAL', 'PRESERVATION',
    // From regex patterns (single-word, moved to terms in P-2)
    'NAVIGATION', 'ENGINEERING', 'INTERSTATE',
    'SUBARU', 'TOYOTA', 'HONDA', 'CHEVROLET',  // FORD removed — common surname
    'HIDEOUT', 'HIDEAWAY',
    // Added in Session 118 P-2 review
    'ASSOCIATES', 'SERVICE', 'CENTER', 'SYSTEMS', 'SOURCE', 'DAUGHTER',
    'VICTIMS', 'VIOLENCE'
]);

/**
 * Known non-human names (multi-word phrases and specific business names).
 * Checked via substring match against space-normalized full name string.
 * Input is normalized: multi-spaces collapsed, curly apostrophes converted to straight.
 */
const KNOWN_NONHUMAN_NAMES = new Set([
    'TINY COTTAGES', 'LIBERTY CEDAR', 'MR. KLEAN', 'ISLANDSCAPE',
    'CLASSIC CHIMNEY', 'LAZY FISH',
    "CREW'S HIDEOUT", "WINFIELD'S",
    "FARMER'S DAUGHTER", "PASQUALE'S NAPOLETANA", "DEAD EYE DICK'S",
    'INTERSTATE NAVIGATION', 'ENTECH ENGINEERING', 'VALENTI SUBARU/TOYOTA',
    'GREENLEAF LANDSCAPING', 'SEA BREEZE INN', 'OLD HARBOR BIKE SHOP',
    'DOVE & DISTAFF', 'WAVE', 'LOS GATTOS', 'GLOBALPARKING',
    // Added in Session 118 P-2 (from regex patterns → multi-word known names)
    'BLOCK ISLAND', 'SEE AD', 'SEE ADS', 'TAKE-OUT', 'TAKE OUT',
    // Acronym without generic term
    'F.I.S.H'
]);

/**
 * Detect whether a phonebook record represents a non-human entity.
 * 5-priority detection, single return type.
 *
 * @param {Object} record - Parsed phonebook record (from phonebookParser.js)
 * @returns {string|null} 'NONHUMAN' if detected, null if appears to be a person
 */
function detectNonHumanType(record) {
    const parts = [record.name.firstName, record.name.secondName,
                   record.name.lastName, record.name.otherNames].filter(Boolean);
    const fullName = parts.join(' ').toUpperCase().trim();
    const firstName = (record.name.firstName || '').trim();

    // --- PRIORITY 1: Dash-prefix pattern (structural) ---
    if (firstName === '-' || firstName === '\u2013' || firstName === '\u2014') {
        return 'NONHUMAN';
    }
    if (/^[\u2013\u2014-]\s/.test(fullName)) {
        return 'NONHUMAN';
    }

    // --- PRIORITY 2: Possessive apostrophe-s on any name part ---
    for (const part of parts) {
        const upper = part.toUpperCase();
        if (upper.length >= 4 && (upper.endsWith("'S") || upper.endsWith('\u2019S'))) {
            return 'NONHUMAN';
        }
    }

    // --- PRIORITY 3: Known non-human names (substring match) ---
    // Normalize: collapse multi-spaces, convert curly apostrophes to straight
    const naturalName = parts.join(' ').toUpperCase()
        .replace(/\s+/g, ' ').replace(/\u2019/g, "'").trim();
    const reversedName = [record.name.lastName, record.name.firstName,
                          record.name.secondName].filter(Boolean)
        .join(' ').toUpperCase().replace(/\s+/g, ' ').replace(/\u2019/g, "'").trim();
    for (const known of KNOWN_NONHUMAN_NAMES) {
        if (naturalName.includes(known) || reversedName.includes(known)) {
            return 'NONHUMAN';
        }
    }

    // --- PRIORITY 4: Single-word term check ---
    const allWords = fullName.split(/[\s/]+/).filter(w => w.length > 0);
    for (const word of allWords) {
        const clean = word.replace(/[^A-Z]/gi, '').toUpperCase();
        if (!clean || clean.length < 2) continue;
        if (NON_HUMAN_TERMS.has(clean)) return 'NONHUMAN';
    }

    // --- PRIORITY 5: Parser flags fallback ---
    if (record.name.isBusiness || record.name.entityType === 'Business' ||
        record.name.entityType === 'LegalConstruct' || record.name.caseType === 'case0') {
        return 'NONHUMAN';
    }

    return null;
}

// =============================================================================
// HEURISTIC MATCHING - HELPER FUNCTIONS
// =============================================================================

// NOTE: levenshteinSimilarity() is defined in utils.js (loaded before this file).
// It uses variable substitution costs tuned for name comparison:
//   vowel-vowel ~0.079, consonant-consonant 1.0, vowel-consonant ~0.632.
// All code in this file uses that existing function — no duplicate needed.

/**
 * Check if two name words are adjacent in a string.
 * @param {string} word1
 * @param {string} word2
 * @param {string} fullString
 * @returns {boolean}
 */
function areNamesProximate(word1, word2, fullString) {
    if (!word1 || !word2 || !fullString) return false;
    const upper = fullString.toUpperCase();
    const w1 = word1.toUpperCase();
    const w2 = word2.toUpperCase();
    const separators = [' ', ', ', ','];
    for (const sep of separators) {
        if (upper.includes(w1 + sep + w2)) return true;
        if (upper.includes(w2 + sep + w1)) return true;
    }
    return false;
}

/**
 * @param {string} str
 * @returns {boolean} True if str is a single letter A-Z
 */
function isInitial(str) {
    return str && str.length === 1 && /[A-Z]/i.test(str);
}

/**
 * Strip possessive suffix ('S or curly-'S) from a word.
 * Only strips if result is at least 2 chars.
 * @param {string} w
 * @returns {string}
 */
function stripPossessive(w) {
    if (w.length >= 4 && (w.endsWith("'S") || w.endsWith('\u2019S'))) {
        return w.slice(0, -2);
    }
    return w;
}

// =============================================================================
// ENTITY NAME/ADDRESS EXTRACTION
// For matching phonebook records against non-human entity name strings
// =============================================================================

/**
 * Extract the primary name string from any entity type.
 * @param {Object} entity
 * @returns {string}
 */
function getEntityNameStr(entity) {
    const n = entity.name;
    if (!n) return '';
    if (n.primaryAlias?.term) return String(n.primaryAlias.term);
    if (n.identifier?.primaryAlias?.term) return String(n.identifier.primaryAlias.term);
    if (n.fullHouseholdName) return String(n.fullHouseholdName);
    if (n.termOfAddress) return String(n.termOfAddress);
    if (n.completeName) return String(n.completeName);
    if (n.firstName || n.lastName) return [n.firstName, n.lastName].filter(Boolean).join(' ');
    return '';
}

/**
 * Extract and normalize fire number from an entity.
 * Strips non-digit characters; excludes PO Box indicator "3499".
 * @param {Object} entity
 * @returns {string|null}
 */
function getEntityFireNum(entity) {
    const locId = entity.locationIdentifier;
    if (locId?.primaryAlias?.term) {
        const raw = String(locId.primaryAlias.term);
        const digits = raw.replace(/\D/g, '');
        if (digits && digits !== '3499') return digits;
    }
    const streetNum = entity.contactInfo?.primaryAddress?.streetNumber;
    if (streetNum?.term) {
        const digits = String(streetNum.term).replace(/\D/g, '');
        if (digits) return digits;
    }
    return null;
}

/**
 * Extract normalized street name from an entity.
 * @param {Object} entity
 * @returns {string}
 */
function getEntityStreet(entity) {
    const streetName = entity.contactInfo?.primaryAddress?.streetName;
    if (streetName?.term) return String(streetName.term).toUpperCase().trim();
    return '';
}

/**
 * Extract PO box number from an entity.
 * @param {Object} entity
 * @returns {string|null}
 */
function getEntityPOBox(entity) {
    if (entity.contactInfo?.poBox?.primaryAlias?.term) {
        return String(entity.contactInfo.poBox.primaryAlias.term).trim().toUpperCase();
    }
    const addr = entity.contactInfo?.primaryAddress;
    if (addr?.secUnitType?.term) {
        const unitType = String(addr.secUnitType.term).toUpperCase();
        if (unitType.includes('PO') || unitType.includes('BOX')) {
            if (addr.secUnitNum?.term) {
                return String(addr.secUnitNum.term).trim().toUpperCase();
            }
        }
    }
    return null;
}

// =============================================================================
// LAST-NAME FREQUENCY & RARITY SCORING
// =============================================================================

/**
 * Build a frequency table of last names from EntityGroup name collections.
 * Counts distinct name entries (by key) per uppercase last name.
 *
 * @param {EntityGroupDatabase} groupDb
 * @returns {Object} frequencyTable - { LASTNAME: count, ... }
 */
function buildLastNameFrequencyTable(groupDb) {
    const lastNameByKey = {};
    for (const group of groupDb.getAllGroups()) {
        const collections = [group.individualNames, group.unrecognizedIndividualNames];
        for (const coll of collections) {
            if (!coll) continue;
            for (const [nameKey, nameObj] of Object.entries(coll)) {
                if (!nameObj || !nameObj.lastName) continue;
                const ln = String(nameObj.lastName).toUpperCase().trim();
                if (ln.length <= 1) continue;
                lastNameByKey[nameKey] = ln;
            }
        }
    }

    const frequencyTable = {};
    for (const ln of Object.values(lastNameByKey)) {
        frequencyTable[ln] = (frequencyTable[ln] || 0) + 1;
    }
    return frequencyTable;
}

/**
 * Score the rarity of a last name (0 = very common, 1 = very rare).
 * Rare names are stronger match signals.
 *
 * @param {string} lastName
 * @param {Object} frequencyTable - from buildLastNameFrequencyTable()
 * @returns {number}
 */
function nameRarityScore(lastName, frequencyTable) {
    const freq = frequencyTable[lastName.toUpperCase().trim()] || 0;
    if (freq === 0) return 1.0;
    if (freq === 1) return 0.95;
    if (freq === 2) return 0.85;
    if (freq <= 4) return 0.70;
    if (freq <= 8) return 0.50;
    if (freq <= 15) return 0.30;
    return 0.10;
}

// =============================================================================
// PHASE 2 HEURISTIC MATCHING
// Word-by-word matching of phonebook names against non-human entity name strings.
// Uses Levenshtein similarity, nickname prefix matching, rarity amplification,
// proximity bonus, and lastName mandatory penalty.
// =============================================================================

/**
 * Build the list of non-human entities from all EntityGroups.
 * Each entry has pre-extracted name words, fire number, street, and PO box.
 *
 * @param {EntityGroupDatabase} groupDb
 * @param {Object} entityDb - unifiedEntityDatabase.entities
 * @returns {Array<Object>}
 */
function buildNonHumanEntityList(groupDb, entityDb) {
    const NON_HUMAN_ENTITY_TYPES = new Set([
        'Business', 'NonHuman', 'LegalConstruct',
        'AggregateHousehold', 'CompositeHousehold'
    ]);
    const entities = [];

    for (const group of groupDb.getAllGroups()) {
        for (const key of group.memberKeys) {
            const entity = entityDb[key];
            if (!entity) continue;
            const typeName = entity.constructor.name;
            if (!NON_HUMAN_ENTITY_TYPES.has(typeName)) continue;

            const nameStr = getEntityNameStr(entity).toUpperCase().trim();
            if (!nameStr) continue;

            entities.push({
                key,
                typeName,
                groupIndex: group.index,
                nameStr,
                nameWords: nameStr.split(/\s+/)
                    .filter(w => w.length > 0 && /[A-Z]/i.test(w))
                    .map(stripPossessive),
                fireNum: getEntityFireNum(entity),
                street: getEntityStreet(entity),
                poBox: getEntityPOBox(entity)
            });
        }
    }

    return entities;
}

/**
 * Heuristic match a single phonebook record against all non-human entities.
 * Returns the top 2 matches by enhanced composite score.
 *
 * @param {Object} record - Parsed phonebook record
 * @param {Array} nonHumanEntities - from buildNonHumanEntityList()
 * @param {Object} frequencyTable - from buildLastNameFrequencyTable()
 * @returns {{ bestMatch: Object|null, secondMatch: Object|null }}
 */
function heuristicMatchRecord(record, nonHumanEntities, frequencyTable) {
    const WORD_THRESHOLD = (typeof window !== 'undefined' &&
        window.MATCH_CRITERIA?.nearMatch?.nameAlone) || 0.845;

    // Build name words from raw name string (bypass parser field designations
    // for firstName/secondName — unreliable for records that failed primary matching)
    const pbRawName = (record.name.raw || '').toUpperCase().trim();
    const pbNameWords = pbRawName.replace(/[,.]/g, ' ').split(/\s+/)
        .filter(w => w.length > 0 && /[A-Z]/i.test(w))
        .map(stripPossessive);

    // Track lastName words (parser designation kept for lastName only)
    const pbLastNameStr = (record.name.lastName || '').toUpperCase().trim();
    const pbLastNameWords = new Set(
        pbLastNameStr.split(/\s+/)
            .filter(w => w.length > 0 && /[A-Z]/i.test(w))
            .map(stripPossessive)
    );
    // All non-lastName words are potential firstName candidates
    const pbOtherWords = new Set(pbNameWords.filter(w => !pbLastNameWords.has(w)));

    // Address info
    const pbFireNum = record.address?.fireNumber || null;
    const pbStreet = (record.address?.streetNormalized ||
                      record.address?.streetWithoutFireNumber ||
                      record.address?.street || '').toUpperCase().trim();
    const pbBox = record.address?.box ? record.address.box.trim().toUpperCase() : null;

    // Rarity score for lastName
    const rarityScore = nameRarityScore(pbLastNameStr, frequencyTable);

    let comp1 = null, comp2 = null;

    for (const nh of nonHumanEntities) {
        let wordMatchTotal = 0;
        let wordMatchCount = 0;
        const wordDetails = [];
        let lastNameMatchedAny = false;
        let lastNameBestEntWord = '';
        let firstNameMatchedAny = false;
        let firstNameBestEntWord = '';
        let initialMatchedSafely = false;

        for (const pbWord of pbNameWords) {
            // Skip single-letter initials (handled in post-loop)
            if (isInitial(pbWord)) continue;

            let bestWordScore = 0;
            let bestEntWord = '';
            let nicknameMatch = false;

            for (const entWord of nh.nameWords) {
                let ws = levenshteinSimilarity(pbWord, entWord);
                let isNickname = false;

                // Nickname prefix rule: shorter word (3+ chars, has consonants and vowels)
                // is the exact beginning of the longer word
                if (ws < WORD_THRESHOLD) {
                    const shorter = pbWord.length <= entWord.length ? pbWord : entWord;
                    const longer = pbWord.length <= entWord.length ? entWord : pbWord;
                    if (shorter.length >= 3 &&
                        /[AEIOU]/.test(shorter) && /[^AEIOU]/.test(shorter) &&
                        longer.startsWith(shorter)) {
                        ws = WORD_THRESHOLD;
                        isNickname = true;
                    }
                }

                if (ws > bestWordScore) {
                    bestWordScore = ws;
                    bestEntWord = entWord;
                    nicknameMatch = isNickname;
                }
            }

            if (bestWordScore >= WORD_THRESHOLD) {
                wordMatchTotal += bestWordScore;
                wordMatchCount++;
                const nickTag = nicknameMatch ? '[nick]' : '';
                wordDetails.push(pbWord + '~' + bestEntWord + '=' +
                    bestWordScore.toFixed(2) + nickTag);

                if (pbLastNameWords.has(pbWord)) {
                    lastNameMatchedAny = true;
                    lastNameBestEntWord = bestEntWord;
                }
                if (pbOtherWords.has(pbWord)) {
                    firstNameMatchedAny = true;
                    firstNameBestEntWord = bestEntWord;
                }
            }
        }

        // Post-loop initial handling: if lastName matched and an initial is
        // adjacent to the lastName word in the entity name, count it
        if (lastNameMatchedAny && !initialMatchedSafely) {
            for (const otherWord of pbOtherWords) {
                if (!isInitial(otherWord)) continue;
                const initialLetter = otherWord.toUpperCase();
                for (let wi = 0; wi < nh.nameWords.length; wi++) {
                    const ew = nh.nameWords[wi];
                    if (levenshteinSimilarity(ew, lastNameBestEntWord) < 0.95) continue;
                    const checkAdj = (adjIdx) => {
                        if (adjIdx < 0 || adjIdx >= nh.nameWords.length) return false;
                        const adj = nh.nameWords[adjIdx];
                        return adj.length > 1 && adj[0] === initialLetter;
                    };
                    if (checkAdj(wi - 1) || checkAdj(wi + 1)) {
                        initialMatchedSafely = true;
                        wordMatchTotal += 0.5;
                        wordMatchCount++;
                        wordDetails.push(otherWord + '~initial(safe)=0.50');
                        firstNameMatchedAny = true;
                        break;
                    }
                }
                if (initialMatchedSafely) break;
            }
        }

        // Address evidence
        let fireNumMatch = 0;
        if (pbFireNum && nh.fireNum && pbFireNum === nh.fireNum) fireNumMatch = 1;
        let poBoxMatch = 0;
        if (pbBox && nh.poBox && pbBox === nh.poBox) poBoxMatch = 1;
        let streetScore = 0;
        if (pbStreet && nh.street) streetScore = levenshteinSimilarity(pbStreet, nh.street);

        // Base composite (original formula)
        const baseComposite = wordMatchTotal + fireNumMatch + poBoxMatch + streetScore;
        if (baseComposite <= 0) continue;

        // Enhanced composite: rarity amplifier + proximity bonus + lastName penalty
        let enhancedComposite = baseComposite;
        if (lastNameMatchedAny) {
            enhancedComposite *= (1 + 0.3 * rarityScore);
        }
        if (lastNameMatchedAny && firstNameMatchedAny) {
            if (areNamesProximate(lastNameBestEntWord, firstNameBestEntWord, nh.nameStr)) {
                enhancedComposite += 0.3;
            }
        }
        if (!lastNameMatchedAny && wordMatchCount > 0) {
            enhancedComposite *= 0.3;
        }

        const entry = {
            baseComposite,
            enhancedComposite,
            wordMatchTotal,
            wordMatchCount,
            wordDetails,
            fireNumMatch,
            poBoxMatch,
            streetScore,
            lastNameMatched: lastNameMatchedAny,
            firstNameMatched: firstNameMatchedAny,
            initialSafe: initialMatchedSafely,
            entityName: nh.nameStr,
            entityType: nh.typeName,
            groupIndex: nh.groupIndex,
            entityKey: nh.key
        };

        if (!comp1 || enhancedComposite > comp1.enhancedComposite) {
            comp2 = comp1;
            comp1 = entry;
        } else if (!comp2 || enhancedComposite > comp2.enhancedComposite) {
            comp2 = entry;
        }
    }

    return { bestMatch: comp1, secondMatch: comp2 };
}

/**
 * Classify the confidence level of a heuristic match.
 * HIGH: lastName + firstName matched, enhanced >= 3.0
 * MEDIUM: lastName + (firstName OR address evidence), enhanced >= 2.0
 *
 * @param {Object|null} match - A match entry from heuristicMatchRecord()
 * @returns {string|null} 'HIGH', 'MEDIUM', or null
 */
function classifyHeuristicConfidence(match) {
    if (!match) return null;
    if (match.lastNameMatched && match.firstNameMatched &&
        match.enhancedComposite >= 3.0) {
        return 'HIGH';
    }
    if (match.lastNameMatched &&
        (match.firstNameMatched || match.fireNumMatch || match.poBoxMatch) &&
        match.enhancedComposite >= 2.0) {
        return 'MEDIUM';
    }
    return null;
}

/**
 * Run heuristic matching on a batch of no-match phonebook records.
 * Builds required data structures once, then matches each record.
 *
 * @param {Array<Object>} records - Array of phonebook records to match
 * @param {EntityGroupDatabase} groupDb
 * @param {Object} entityDb - unifiedEntityDatabase.entities
 * @returns {Array<{ record: Object, detection: string|null, bestMatch: Object|null,
 *           secondMatch: Object|null, confidence: string|null }>}
 */
function heuristicMatchAllNoMatchRecords(records, groupDb, entityDb) {
    console.log('=== HEURISTIC MATCHING START ===');
    console.log('Records: ' + records.length);

    const frequencyTable = buildLastNameFrequencyTable(groupDb);
    console.log('Last-name frequency table: ' +
        Object.keys(frequencyTable).length + ' distinct names');

    const nonHumanEntities = buildNonHumanEntityList(groupDb, entityDb);
    console.log('Non-human entities: ' + nonHumanEntities.length);

    const results = [];
    let nonHumanCount = 0;
    let highCount = 0;
    let mediumCount = 0;

    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const detection = detectNonHumanType(record);

        if (detection) {
            nonHumanCount++;
            results.push({
                record, detection,
                bestMatch: null, secondMatch: null, confidence: null
            });
            continue;
        }

        const { bestMatch, secondMatch } = heuristicMatchRecord(
            record, nonHumanEntities, frequencyTable
        );
        const confidence = classifyHeuristicConfidence(bestMatch);

        if (confidence === 'HIGH') highCount++;
        else if (confidence === 'MEDIUM') mediumCount++;

        results.push({ record, detection: null, bestMatch, secondMatch, confidence });

        if ((i + 1) % 100 === 0) {
            console.log('  Progress: ' + (i + 1) + '/' + records.length);
        }
    }

    console.log('=== HEURISTIC MATCHING COMPLETE ===');
    console.log('  Non-human detected: ' + nonHumanCount);
    console.log('  Person HIGH confidence: ' + highCount);
    console.log('  Person MEDIUM confidence: ' + mediumCount);
    console.log('  Person unmatched: ' +
        (records.length - nonHumanCount - highCount - mediumCount));

    return results;
}

// =============================================================================
// ENTITY KEY EXTRACTION FROM NAME HITS
// =============================================================================

/**
 * Extract the entity key from the best name hit in a match result.
 *
 * Strategy:
 * 1. Find the best-scoring nameHit
 * 2. Try sourceMap: IndividualName.primaryAlias.sourceMap may contain
 *    'INDIVIDUAL_NAME_DATABASE_BUILDER' with the entity key as index
 * 3. If sourceMap fails (unrecognized names), iterate group.memberKeys
 *    to find the entity whose name is the same object (identity match)
 *
 * @param {Array} nameHits - Name hits from classifyPhonebookMatch
 * @param {EntityGroup} group - The matched entity group
 * @param {Object} [entityDb] - unifiedEntityDatabase.entities (for fallback)
 * @returns {string|null} Entity database key, or null if unresolvable
 */
/**
 * Extract entity key from address-only match hits by searching group members.
 *
 * For fire number hits: searches member entities for one whose primary or secondary
 * address has a matching fire number (streetNumber.term).
 *
 * For PO box hits: searches member entities for one whose contactInfo.poBox
 * has a matching primaryAlias.term.
 *
 * If multiple members match the same fire number or PO box, picks the one with
 * the best Levenshtein name similarity to the phonebook name (tiebreaker).
 *
 * @param {Object} addressMatch - Classified address match: { group, addressHits, poBoxHits }
 * @param {Object} group - The EntityGroup
 * @param {Object} entityDb - unifiedEntityDatabase.entities
 * @param {string} [phonebookNameStr] - Uppercase phonebook name for tiebreaker (optional)
 * @returns {string|null} Entity key, or null if no member found
 */
function extractEntityKeyFromAddressHits(addressMatch, group, entityDb, phonebookNameStr) {
    if (!group || !group.memberKeys || !entityDb) return null;

    // Collect target fire numbers from addressHits
    var targetFireNums = [];
    if (addressMatch.addressHits) {
        for (var i = 0; i < addressMatch.addressHits.length; i++) {
            var hit = addressMatch.addressHits[i];
            if (hit.matchType === 'fireNumber' && hit.matchedGroupAddressKey) {
                var colonIdx = hit.matchedGroupAddressKey.indexOf(':');
                var fireNum = colonIdx >= 0 ? hit.matchedGroupAddressKey.substring(0, colonIdx) : hit.matchedGroupAddressKey;
                // Strip letter suffixes for comparison
                targetFireNums.push(fireNum.replace(/[A-Za-z]+$/, ''));
            }
        }
    }

    // Collect target PO box IDs from poBoxHits
    var targetBoxIds = [];
    if (addressMatch.poBoxHits) {
        for (var j = 0; j < addressMatch.poBoxHits.length; j++) {
            var boxHit = addressMatch.poBoxHits[j];
            if (boxHit.matchedBoxKey) {
                targetBoxIds.push(boxHit.matchedBoxKey.trim().toUpperCase());
            }
        }
    }

    if (targetFireNums.length === 0 && targetBoxIds.length === 0) return null;

    // Search group members for matching fire number or PO box
    var candidates = [];  // { key, entity }

    for (var m = 0; m < group.memberKeys.length; m++) {
        var key = group.memberKeys[m];
        var entity = entityDb[key];
        if (!entity || !entity.contactInfo) continue;

        // Check fire number on primary address
        if (targetFireNums.length > 0) {
            var primaryFireNum = entity.contactInfo.primaryAddress &&
                                 entity.contactInfo.primaryAddress.streetNumber &&
                                 entity.contactInfo.primaryAddress.streetNumber.term;
            if (primaryFireNum) {
                var normalizedPrimary = String(primaryFireNum).replace(/[A-Za-z]+$/, '');
                if (targetFireNums.indexOf(normalizedPrimary) >= 0) {
                    candidates.push({ key: key, entity: entity });
                    continue;
                }
            }

            // Check secondary addresses
            if (entity.contactInfo.secondaryAddress && Array.isArray(entity.contactInfo.secondaryAddress)) {
                var foundInSecondary = false;
                for (var s = 0; s < entity.contactInfo.secondaryAddress.length; s++) {
                    var secAddr = entity.contactInfo.secondaryAddress[s];
                    var secFireNum = secAddr.streetNumber && secAddr.streetNumber.term;
                    if (secFireNum) {
                        var normalizedSec = String(secFireNum).replace(/[A-Za-z]+$/, '');
                        if (targetFireNums.indexOf(normalizedSec) >= 0) {
                            candidates.push({ key: key, entity: entity });
                            foundInSecondary = true;
                            break;
                        }
                    }
                }
                if (foundInSecondary) continue;
            }
        }

        // Check PO box
        if (targetBoxIds.length > 0) {
            var poBox = entity.contactInfo.poBox;
            if (poBox && poBox.primaryAlias && poBox.primaryAlias.term) {
                var entityBoxId = poBox.primaryAlias.term.trim().toUpperCase();
                if (targetBoxIds.indexOf(entityBoxId) >= 0) {
                    candidates.push({ key: key, entity: entity });
                }
            }
        }
    }

    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0].key;

    // Multiple candidates: pick the one with best name similarity to phonebook name
    if (phonebookNameStr && typeof levenshteinSimilarity === 'function') {
        var bestKey = candidates[0].key;
        var bestScore = -1;
        for (var c = 0; c < candidates.length; c++) {
            var ent = candidates[c].entity;
            var entityNameStr = '';
            if (ent.name && ent.name.primaryAlias && ent.name.primaryAlias.term) {
                entityNameStr = ent.name.primaryAlias.term.toUpperCase();
            }
            if (entityNameStr) {
                var score = levenshteinSimilarity(phonebookNameStr, entityNameStr);
                if (score > bestScore) {
                    bestScore = score;
                    bestKey = candidates[c].key;
                }
            }
        }
        return bestKey;
    }

    // No name to compare — return first candidate
    return candidates[0].key;
}


function extractEntityKeyFromNameHits(nameHits, group, entityDb) {
    if (!nameHits || nameHits.length === 0) return null;

    // Find the best-scoring name hit
    var bestHit = nameHits[0];
    for (var i = 1; i < nameHits.length; i++) {
        if (nameHits[i].score > bestHit.score) {
            bestHit = nameHits[i];
        }
    }

    // Strategy 1: sourceMap (recognized names from IndividualNameDatabase)
    var sourceMap = bestHit.matchedGroupName &&
                    bestHit.matchedGroupName.primaryAlias &&
                    bestHit.matchedGroupName.primaryAlias.sourceMap;
    if (sourceMap instanceof Map) {
        var builderInfo = sourceMap.get('INDIVIDUAL_NAME_DATABASE_BUILDER');
        if (builderInfo && builderInfo.index) {
            return builderInfo.index;
        }
    }

    // Strategy 2: object identity match against group members (unrecognized names)
    if (entityDb && group && group.memberKeys) {
        var targetName = bestHit.matchedGroupName;
        for (var m = 0; m < group.memberKeys.length; m++) {
            var key = group.memberKeys[m];
            var entity = entityDb[key];
            if (!entity) continue;

            // Direct identity: entity.name IS the IndividualName
            if (entity.name === targetName) return key;

            // AggregateHousehold individuals
            if (entity.individuals && Array.isArray(entity.individuals)) {
                for (var j = 0; j < entity.individuals.length; j++) {
                    if (entity.individuals[j].name === targetName) return key;
                }
            }
        }
    }

    return null;
}

// =============================================================================
// PHASE 3.2: POPULATE PRIMARY-MATCHED RECORDS INTO PHONEBOOK DATABASE
// =============================================================================

/**
 * Populate a PhonebookDatabase with all primary-matched phonebook records.
 *
 * Prerequisite: window.phonebookClassifiedResults must exist (from classifyAllPhonebookMatches).
 *
 * For each classified result that has any match (full, name, or address):
 *   1. Create/append PhonebookEntry (keyed by normalized phone)
 *   2. Set classification via detectNonHumanType()
 *   3. Add match associations with matchSource 'primary-matcher' and entityKey
 *
 * Records without a phone number are counted but skipped.
 * Shared phone numbers accumulate rawRecords and matchAssociations.
 *
 * @param {PhonebookDatabase} db - The PhonebookDatabase to populate
 * @param {Object} [entityDb] - unifiedEntityDatabase.entities (for entity key resolution)
 * @returns {PhonebookDatabase} The same database (for chaining)
 */
function populatePrimaryMatches(db, entityDb) {
    const classified = window.phonebookClassifiedResults;
    if (!classified || classified.length === 0) {
        console.error('populatePrimaryMatches: No classified results found.');
        console.error('Run classifyAllPhonebookMatches() first.');
        return db;
    }

    console.log('=== PHASE 3.2: POPULATE PRIMARY MATCHES ===');
    console.log('Classified results to scan: ' + classified.length);

    let primaryCount = 0;
    let noMatchCount = 0;
    let noPhoneCount = 0;
    let sharedPhoneRecords = 0;
    let nonHumanDetected = 0;
    let assocAdded = 0;
    let assocDeduped = 0;
    let entityKeysResolved = 0;
    let entityKeysNull = 0;

    for (const result of classified) {
        const hasMatch = result.fullMatches.length > 0 ||
                         result.nameMatches.length > 0 ||
                         result.addressMatches.length > 0;

        if (!hasMatch) {
            noMatchCount++;
            continue;
        }

        const record = result.record;

        // Skip records without phone numbers
        if (!record.phone) {
            noPhoneCount++;
            continue;
        }

        // Determine classification
        const detection = detectNonHumanType(record);
        const classification = detection ? 'nonhuman' : 'person';
        if (detection) nonHumanDetected++;

        // Add record to database (creates new entry or appends to existing)
        const phoneKey = db.addRecord(record, classification);
        const entry = db.get(phoneKey);

        // Track shared phone numbers
        if (entry.rawRecords.length > 1) {
            sharedPhoneRecords++;
        }

        // Build set of existing association group indices for dedup
        const existingGroups = new Set(
            entry.matchAssociations.map(a => a.groupIndex)
        );

        // Add match associations from classified results
        for (const fm of result.fullMatches) {
            if (existingGroups.has(fm.group.index)) {
                assocDeduped++;
                continue;
            }
            entry.addMatchAssociation({
                groupIndex: fm.group.index,
                entityKey: extractEntityKeyFromNameHits(fm.nameHits, fm.group, entityDb),
                matchSource: 'primary-matcher',
                matchType: 'full',
                bestNameScore: fm.bestNameScore,
                isCollision: fm.isCollision,
                isCoupleCondition2: fm.isCoupleCondition2 || false
            });
            existingGroups.add(fm.group.index);
            assocAdded++;
        }

        for (const nm of result.nameMatches) {
            if (existingGroups.has(nm.group.index)) {
                assocDeduped++;
                continue;
            }
            entry.addMatchAssociation({
                groupIndex: nm.group.index,
                entityKey: extractEntityKeyFromNameHits(nm.nameHits, nm.group, entityDb),
                matchSource: 'primary-matcher',
                matchType: 'name-only',
                bestNameScore: nm.bestNameScore
            });
            existingGroups.add(nm.group.index);
            assocAdded++;
        }

        for (const am of result.addressMatches) {
            if (existingGroups.has(am.group.index)) {
                assocDeduped++;
                continue;
            }
            // Extract phonebook name for tiebreaker
            var pbNameStr = '';
            if (record.name) {
                pbNameStr = ((record.name.firstName || '') + ' ' + (record.name.lastName || '')).trim().toUpperCase();
            }
            entry.addMatchAssociation({
                groupIndex: am.group.index,
                entityKey: extractEntityKeyFromAddressHits(am, am.group, entityDb, pbNameStr),
                matchSource: 'primary-matcher',
                matchType: 'address-only',
                isCollision: am.isCollision || false
            });
            existingGroups.add(am.group.index);
            assocAdded++;
        }

        primaryCount++;
    }

    // Count entity key resolution stats across all entries
    for (var _ref of db) {
        var _entry = _ref[1];
        for (var _a = 0; _a < _entry.matchAssociations.length; _a++) {
            if (_entry.matchAssociations[_a].entityKey) entityKeysResolved++;
            else entityKeysNull++;
        }
    }

    console.log('\n=== PHASE 3.2 COMPLETE ===');
    console.log('Primary-matched records processed: ' + primaryCount);
    console.log('  No-match records (skipped): ' + noMatchCount);
    console.log('  No-phone records (skipped): ' + noPhoneCount);
    console.log('  Non-human detected: ' + nonHumanDetected);
    console.log('  Shared phone (appended to existing): ' + sharedPhoneRecords);
    console.log('  Match associations added: ' + assocAdded);
    console.log('  Match associations deduped: ' + assocDeduped);
    console.log('  Entity keys resolved: ' + entityKeysResolved + ' / ' + (entityKeysResolved + entityKeysNull));
    console.log('Database entries after Phase 3.2: ' + db.size);

    return db;
}

// =============================================================================
// PHASE 3.3: NO-MATCH RECORD PROCESSING (MODULAR)
// =============================================================================

// --- Shared Utility: Entity Key Verification ---

/**
 * Verify that an entity key still exists in the entity group database and
 * return its current group index. If the entity has moved to a different
 * group than expected, logs a warning and returns the current group index.
 * If the entity is not found at all, logs an error and returns null.
 *
 * @param {string} entityKey - Entity database key (e.g. "visionAppraisal:FireNumber:1510")
 * @param {number} expectedGroupIndex - The group index recorded at annotation time
 * @param {string} context - Descriptive string for log messages
 * @returns {number|null} Current group index, or null if entity not found
 */
function verifyEntityKey(entityKey, expectedGroupIndex, context) {
    const groupDb = entityGroupBrowser.loadedDatabase;
    const currentGroup = groupDb.findGroupByEntityKey(entityKey);
    if (!currentGroup) {
        console.error('ENTITY KEY NOT FOUND: ' + entityKey + ' (' + context + ')');
        return null;
    }
    if (currentGroup.index !== expectedGroupIndex) {
        console.warn('GROUP INDEX SHIFTED: ' + entityKey + ' (' + context +
            ') — expected group ' + expectedGroupIndex +
            ', now in group ' + currentGroup.index);
    }
    return currentGroup.index;
}

// --- Hardcoded Non-Human Phone List ---

/**
 * Phone numbers classified as non-human by user annotation.
 * Source: user_phonebook_annotations_2026-02-22.json categories:
 *   businesses (83 unique), governmentEntities (25), nonprofitEntities (3), legalEntities (1)
 * Total: 111 unique phones after deduplication.
 * Hardcoded because annotation file is historical after Phase 3.5 (Session 122).
 */
var ANNOTATED_NONHUMAN_PHONES = [
    '0-243-8623', '203-431-6001', '203-623-6771', '294-2667', '295-0505',
    '322-7200', '349-4850', '364-6114', '397-8484', '423-2590',
    '432-5502', '438-2850', '439-1539', '466-2000', '466-2020',
    '466-2048', '466-2122', '466-2124', '466-2137', '466-2212',
    '466-2244', '466-2323', '466-2378', '466-2441', '466-2549',
    '466-2631', '466-2901', '466-2949', '466-2974', '466-3000',
    '466-3200', '466-3203', '466-3204', '466-3205', '466-3206',
    '466-3207', '466-3208', '466-3209', '466-3210', '466-3213',
    '466-3216', '466-3217', '466-3220', '466-3223', '466-3230',
    '466-3231', '466-3233', '466-3234', '466-3235', '466-5009',
    '466-5190', '466-5230', '466-5331', '466-5411', '466-5469',
    '466-5470', '466-5519', '466-5521', '466-5600', '466-5831',
    '466-5851', '466-5855', '466-5856', '466-5871', '466-5876',
    '466-5881', '466-5998', '466-7732', '466-7733', '466-7737',
    '466-7754', '466-8600', '466-8978', '497-2628', '497-3526',
    '584-7900', '596-0277', '596-1926', '596-2460', '596-2525',
    '596-6160', '596-7070', '728-3200', '739-0284', '741-1410',
    '741-4987', '782-8150', '783-2266', '783-3272', '783-3482',
    '783-7770', '783-7996', '789-3071', '789-9339', '789-9375',
    '792-1340', '792-4933', '800-463-3339', '800-494-8100', '800-772-1213',
    '800-874-9500', '800-882-3327', '800-922-8381', '802-379-0336',
    '802-747-8248', '827-0000', '860-444-4624', '860-608-2590',
    '932-7979', '935-3887', '973-222-0170'
].map(normalizePhoneNumber);

var HARDCODED_NONHUMAN_PHONES = new Set(
    ANNOTATED_NONHUMAN_PHONES.filter(function(p) { return p.length === 10; })
);

// --- Step 0: Intake ---

/**
 * Add all no-match phonebook records to the PhonebookDatabase as 'unclassified'.
 * Records without a valid phone number are counted but skipped.
 * Shared phone numbers accumulate rawRecords on the same PhonebookEntry.
 *
 * Prerequisites:
 *   - window.phonebookClassifiedResults must exist (from classifyAllPhonebookMatches)
 *   - PhonebookDatabase should already contain Phase 3.2 primary matches
 *
 * @param {PhonebookDatabase} db - The PhonebookDatabase to populate
 * @returns {{ ingested: number, noPhone: number, shared: number, dbSizeBefore: number, dbSizeAfter: number }}
 */
function ingestNoMatchRecords(db) {
    var classified = window.phonebookClassifiedResults;
    if (!classified || classified.length === 0) {
        console.error('ingestNoMatchRecords: No classified results found.');
        console.error('Run classifyAllPhonebookMatches() first.');
        return { ingested: 0, noPhone: 0, shared: 0, dbSizeBefore: db.size, dbSizeAfter: db.size };
    }

    var dbSizeBefore = db.size;
    var ingested = 0;
    var noPhone = 0;
    var shared = 0;

    for (var i = 0; i < classified.length; i++) {
        var result = classified[i];
        var hasMatch = result.fullMatches.length > 0 ||
                       result.nameMatches.length > 0 ||
                       result.addressMatches.length > 0;
        if (hasMatch) continue;

        var record = result.record;
        if (!record.phone) {
            noPhone++;
            continue;
        }

        var phoneKey = normalizePhoneNumber(record.phone);
        if (!phoneKey || phoneKey.length !== 10) {
            noPhone++;
            continue;
        }

        var existedBefore = db.has(phoneKey);
        db.addRecord(record, 'unclassified');
        if (existedBefore) {
            shared++;
        }
        ingested++;
    }

    var stats = {
        ingested: ingested,
        noPhone: noPhone,
        shared: shared,
        dbSizeBefore: dbSizeBefore,
        dbSizeAfter: db.size
    };

    console.log('--- Ingest No-Match Records ---');
    console.log('Records ingested: ' + ingested);
    console.log('No-phone skipped: ' + noPhone);
    console.log('Shared phone (appended to existing entry): ' + shared);
    console.log('DB size: ' + dbSizeBefore + ' → ' + db.size);

    return stats;
}

// --- Module 1: Manual Inclusions ---

/**
 * Apply resolved manual inclusion rules to unclassified PhonebookDatabase entries.
 * For each inclusion, verifies the entity key at runtime, then sets classification
 * and adds a match association to the entry.
 *
 * A single phone may have multiple inclusions (4 phones have 2-3 annotations).
 * Classification is 'person' if ANY inclusion is person-classified, else 'nonhuman'.
 *
 * Only processes entries where entry.classification === 'unclassified'.
 *
 * Prerequisites:
 *   - window.resolvedPhonebookRules.inclusions must exist
 *   - Entity group database loaded (entityGroupBrowser.loadedDatabase)
 *
 * @param {PhonebookDatabase} db - The PhonebookDatabase
 * @returns {{ applied: number, personMatches: number, nonhumanMatches: number,
 *             entityKeysFailed: number, entityKeysShifted: number, skippedNotInDB: number }}
 */
function applyManualInclusions(db) {
    var rules = window.resolvedPhonebookRules;
    if (!rules || !rules.inclusions) {
        console.error('applyManualInclusions: No resolved rules found.');
        return { applied: 0, personMatches: 0, nonhumanMatches: 0,
                 entityKeysFailed: 0, entityKeysShifted: 0, skippedNotInDB: 0 };
    }

    // Build inclusion map: normalized phone → Array of verified inclusions
    var inclusionByPhone = new Map();
    var entityKeysFailed = 0;
    var entityKeysShifted = 0;

    for (var i = 0; i < rules.inclusions.length; i++) {
        var inc = rules.inclusions[i];
        var normalizedPhone = normalizePhoneNumber(inc.phone);
        if (!normalizedPhone || normalizedPhone.length !== 10) continue;

        var currentGroupIndex = verifyEntityKey(
            inc.entityKey, inc.groupIndex, inc.phone + ' manual inclusion'
        );
        if (currentGroupIndex === null) {
            entityKeysFailed++;
            continue;
        }
        if (currentGroupIndex !== inc.groupIndex) entityKeysShifted++;

        var verified = {
            groupIndex: currentGroupIndex,
            entityKey: inc.entityKey,
            classification: inc.classification,
            designation: inc.designation,
            matchEntityName: inc.matchEntityName,
            matchComposite: inc.matchComposite
        };

        if (!inclusionByPhone.has(normalizedPhone)) {
            inclusionByPhone.set(normalizedPhone, [verified]);
        } else {
            inclusionByPhone.get(normalizedPhone).push(verified);
        }
    }

    // Apply inclusions to DB entries
    var applied = 0;
    var personMatches = 0;
    var nonhumanMatches = 0;
    var skippedNotInDB = 0;

    for (var _ref of inclusionByPhone) {
        var phoneKey = _ref[0];
        var incList = _ref[1];
        var entry = db.get(phoneKey);
        if (!entry) {
            skippedNotInDB++;
            continue;
        }
        if (entry.classification !== 'unclassified') continue;

        var hasPersonMatch = incList.some(function(m) { return m.classification === 'person'; });
        entry.classification = hasPersonMatch ? 'person' : 'nonhuman';

        for (var j = 0; j < incList.length; j++) {
            var incEntry = incList[j];
            entry.addMatchAssociation({
                groupIndex: incEntry.groupIndex,
                entityKey: incEntry.entityKey,
                matchSource: 'manual',
                matchType: 'user-annotated',
                matchEntityName: incEntry.matchEntityName,
                matchComposite: incEntry.matchComposite,
                designation: incEntry.designation
            });
        }

        applied++;
        if (hasPersonMatch) personMatches++;
        else nonhumanMatches++;
    }

    var stats = {
        applied: applied,
        personMatches: personMatches,
        nonhumanMatches: nonhumanMatches,
        entityKeysFailed: entityKeysFailed,
        entityKeysShifted: entityKeysShifted,
        skippedNotInDB: skippedNotInDB
    };

    console.log('--- Apply Manual Inclusions ---');
    console.log('Phones with inclusions applied: ' + applied +
        ' (person: ' + personMatches + ', nonhuman: ' + nonhumanMatches + ')');
    if (entityKeysShifted > 0) console.log('Entity keys with group shifts: ' + entityKeysShifted);
    if (entityKeysFailed > 0) console.log('Entity keys FAILED: ' + entityKeysFailed);
    if (skippedNotInDB > 0) console.log('Inclusion phones not in DB: ' + skippedNotInDB);

    return stats;
}

// --- Module 2: Manual Exclusions ---

/**
 * Apply resolved exclusion rules to unclassified PhonebookDatabase entries.
 * For each exclusion, verifies the entity key at runtime, then sets classification
 * based on the exclusion reason and records the exclusion on the entry.
 *
 * Classification logic:
 *   - reason 'government' or 'business' → 'nonhuman'
 *   - reason 'wrong-match' → 'person'
 *
 * Only processes entries where entry.classification === 'unclassified'.
 *
 * Prerequisites:
 *   - window.resolvedPhonebookRules.exclusions must exist
 *   - Entity group database loaded (entityGroupBrowser.loadedDatabase)
 *
 * @param {PhonebookDatabase} db - The PhonebookDatabase
 * @returns {{ applied: number, nonhumanClassified: number, personClassified: number,
 *             entityKeysFailed: number, skippedNotInDB: number }}
 */
function applyManualExclusions(db) {
    var rules = window.resolvedPhonebookRules;
    if (!rules || !rules.exclusions) {
        console.error('applyManualExclusions: No resolved rules found.');
        return { applied: 0, nonhumanClassified: 0, personClassified: 0,
                 entityKeysFailed: 0, skippedNotInDB: 0 };
    }

    // Build exclusion map: normalized phone → verified exclusion
    var exclusionByPhone = new Map();
    var entityKeysFailed = 0;

    for (var i = 0; i < rules.exclusions.length; i++) {
        var ex = rules.exclusions[i];
        var normalizedPhone = normalizePhoneNumber(ex.phone);
        if (!normalizedPhone || normalizedPhone.length !== 10) continue;

        var currentGroupIndex = verifyEntityKey(
            ex.entityKey, ex.groupIndex, ex.phone + ' exclusion'
        );
        if (currentGroupIndex === null) {
            entityKeysFailed++;
            continue;
        }

        exclusionByPhone.set(normalizedPhone, {
            groupIndex: currentGroupIndex,
            entityKey: ex.entityKey,
            reason: ex.reason,
            name: ex.name
        });
    }

    // Apply exclusions to DB entries
    var applied = 0;
    var nonhumanClassified = 0;
    var personClassified = 0;
    var skippedNotInDB = 0;

    for (var _ref of exclusionByPhone) {
        var phoneKey = _ref[0];
        var exData = _ref[1];
        var entry = db.get(phoneKey);
        if (!entry) {
            skippedNotInDB++;
            continue;
        }
        if (entry.classification !== 'unclassified') continue;

        if (exData.reason === 'government' || exData.reason === 'business') {
            entry.classification = 'nonhuman';
            nonhumanClassified++;
        } else {
            entry.classification = 'person';
            personClassified++;
        }

        entry.addExclusion({
            groupIndex: exData.groupIndex,
            entityKey: exData.entityKey,
            reason: 'session118-p1-review: ' + exData.reason
        });
        applied++;
    }

    var stats = {
        applied: applied,
        nonhumanClassified: nonhumanClassified,
        personClassified: personClassified,
        entityKeysFailed: entityKeysFailed,
        skippedNotInDB: skippedNotInDB
    };

    console.log('--- Apply Manual Exclusions ---');
    console.log('Exclusions applied: ' + applied +
        ' (nonhuman: ' + nonhumanClassified + ', person: ' + personClassified + ')');
    if (entityKeysFailed > 0) console.log('Entity keys FAILED: ' + entityKeysFailed);
    if (skippedNotInDB > 0) console.log('Exclusion phones not in DB: ' + skippedNotInDB);

    return stats;
}

// --- Module 3: Non-Human Classification ---

/**
 * Classify non-human phonebook records in the database. Two detection methods:
 *
 * 1. HARDCODED USER-DECLARED: 111 phone numbers from annotation file categories
 *    (businesses, governmentEntities, nonprofitEntities, legalEntities).
 *
 * 2. ALGORITHMIC DETECTION: detectNonHumanType(record) applied to rawRecords.
 *    For entries with multiple rawRecords, detection runs on each; if ANY record
 *    triggers detection, the entry is classified as nonhuman.
 *
 * Only processes entries where entry.classification === 'unclassified'.
 *
 * @param {PhonebookDatabase} db - The PhonebookDatabase
 * @returns {{ userDeclared: number, algorithmicDetected: number }}
 */
function classifyNonHumanRecords(db) {
    var userDeclared = 0;
    var algorithmicDetected = 0;

    for (var _ref of db) {
        var phoneKey = _ref[0];
        var entry = _ref[1];
        if (entry.classification !== 'unclassified') continue;

        // Check hardcoded user-declared list first
        if (HARDCODED_NONHUMAN_PHONES.has(phoneKey)) {
            entry.classification = 'nonhuman';
            userDeclared++;
            continue;
        }

        // Algorithmic detection: check each rawRecord
        var detected = false;
        for (var i = 0; i < entry.rawRecords.length; i++) {
            if (detectNonHumanType(entry.rawRecords[i])) {
                detected = true;
                break;
            }
        }
        if (detected) {
            entry.classification = 'nonhuman';
            algorithmicDetected++;
        }
    }

    var stats = {
        userDeclared: userDeclared,
        algorithmicDetected: algorithmicDetected
    };

    console.log('--- Classify Non-Human Records ---');
    console.log('User-declared non-human: ' + userDeclared);
    console.log('Algorithmic non-human: ' + algorithmicDetected);

    return stats;
}

// --- Module 4: Heuristic Matching ---

/**
 * Apply heuristic matching to remaining unclassified person records.
 * All unclassified entries at this point are presumed to be persons (non-human
 * detection has already run in Module 3).
 *
 * For each unclassified entry:
 *   1. Set classification to 'person'
 *   2. Run heuristicMatchRecord() against rawRecords[0]
 *   3. If confidence is HIGH or MEDIUM, add matchAssociation
 *   4. If no match, entry remains person-classified with empty matchAssociations
 *
 * Builds required data structures (frequency table, non-human entity list) once.
 *
 * Only processes entries where entry.classification === 'unclassified'.
 *
 * Prerequisites:
 *   - Entity group database loaded (entityGroupBrowser.loadedDatabase)
 *   - Unified entity database loaded (window.unifiedEntityDatabase)
 *
 * @param {PhonebookDatabase} db - The PhonebookDatabase
 * @returns {{ processed: number, highMatches: number, mediumMatches: number, unmatched: number }}
 */
function applyHeuristicMatches(db) {
    var groupDb = entityGroupBrowser.loadedDatabase;
    if (!groupDb) {
        console.error('applyHeuristicMatches: No entity group database loaded.');
        return { processed: 0, highMatches: 0, mediumMatches: 0, unmatched: 0 };
    }

    var entityDb = window.unifiedEntityDatabase?.entities;
    if (!entityDb) {
        console.error('applyHeuristicMatches: No unified entity database loaded.');
        return { processed: 0, highMatches: 0, mediumMatches: 0, unmatched: 0 };
    }

    // Build data structures once
    var frequencyTable = buildLastNameFrequencyTable(groupDb);
    console.log('--- Apply Heuristic Matches ---');
    console.log('Last-name frequency table: ' + Object.keys(frequencyTable).length + ' names');

    var nonHumanEntities = buildNonHumanEntityList(groupDb, entityDb);
    console.log('Non-human entities for matching: ' + nonHumanEntities.length);

    var processed = 0;
    var highMatches = 0;
    var mediumMatches = 0;
    var unmatched = 0;

    for (var _ref of db) {
        var phoneKey = _ref[0];
        var entry = _ref[1];
        if (entry.classification !== 'unclassified') continue;

        entry.classification = 'person';
        processed++;

        // Use first raw record for matching
        var record = entry.rawRecords[0];
        if (!record) {
            unmatched++;
            continue;
        }

        var result = heuristicMatchRecord(record, nonHumanEntities, frequencyTable);
        var confidence = classifyHeuristicConfidence(result.bestMatch);

        if (confidence === 'HIGH' || confidence === 'MEDIUM') {
            entry.addMatchAssociation({
                groupIndex: result.bestMatch.groupIndex,
                entityKey: result.bestMatch.entityKey,
                matchSource: 'algorithmic',
                matchType: 'heuristic-' + confidence.toLowerCase(),
                bestNameScore: result.bestMatch.enhancedComposite,
                confidence: confidence
            });
            if (confidence === 'HIGH') highMatches++;
            else mediumMatches++;
        } else {
            unmatched++;
        }

        if (processed % 100 === 0) {
            console.log('  Progress: ' + processed + ' entries processed...');
        }
    }

    var stats = {
        processed: processed,
        highMatches: highMatches,
        mediumMatches: mediumMatches,
        unmatched: unmatched
    };

    console.log('Heuristic results: ' + (highMatches + mediumMatches) + ' matched' +
        ' (HIGH: ' + highMatches + ', MEDIUM: ' + mediumMatches + ')' +
        ', ' + unmatched + ' unmatched');

    return stats;
}

// --- Module 5: Unmatched Persons (Placeholder) ---

/**
 * Handle remaining person-classified entries with no match associations.
 * PLACEHOLDER — full implementation deferred.
 *
 * Future behavior: create new Entity + standalone EntityGroup for each
 * unmatched person record. Current behavior: log count only.
 *
 * Specification (Session 122): Unmatched person records establish new entities
 * in standalone single-member entity groups. Coded LAST after modules 1-4 are
 * verified, because workflow implications may prompt reconsideration.
 *
 * @param {PhonebookDatabase} db - The PhonebookDatabase
 * @returns {{ count: number }}
 */
function handleUnmatchedPersons(db) {
    var count = 0;

    for (var _ref of db) {
        var phoneKey = _ref[0];
        var entry = _ref[1];
        if (entry.classification === 'person' && !entry.hasMatchAssociations()) {
            count++;
        }
    }

    console.log('--- Unmatched Persons (Placeholder) ---');
    console.log('Person entries with no match: ' + count);
    console.log('(Future: each will create a new standalone entity group)');

    return { count: count };
}

// --- Orchestrator ---

/**
 * Process all no-match phonebook records through the modular pipeline.
 * Calls each module in priority order with logging.
 *
 * Pipeline:
 *   0. Ingest: Add all no-match records to DB as 'unclassified'
 *   1. Manual inclusions: Apply resolved annotation match associations
 *   2. Manual exclusions: Apply resolved annotation exclusion rules
 *   3. Non-human classification: Hardcoded phones + algorithmic detection
 *   4. Heuristic matching: Auto-accept MEDIUM+ confidence for remaining persons
 *   5. Unmatched persons: Log count (placeholder)
 *
 * Each module can also be called independently from the browser console.
 *
 * Prerequisites:
 *   - window.phonebookClassifiedResults (from classifyAllPhonebookMatches)
 *   - window.resolvedPhonebookRules (from console_resolveAnnotationKeys.js)
 *   - Entity group database loaded
 *   - Unified entity database loaded
 *   - PhonebookDatabase with Phase 3.2 data
 *
 * @param {PhonebookDatabase} db - The PhonebookDatabase (should already have Phase 3.2 data)
 * @returns {PhonebookDatabase} The same database
 */
function processNoMatchRecords(db) {
    var classified = window.phonebookClassifiedResults;
    if (!classified || classified.length === 0) {
        console.error('processNoMatchRecords: No classified results found.');
        console.error('Run classifyAllPhonebookMatches() first.');
        return db;
    }

    var groupDb = entityGroupBrowser.loadedDatabase;
    if (!groupDb) {
        console.error('processNoMatchRecords: No entity group database loaded.');
        return db;
    }

    var entityDb = window.unifiedEntityDatabase?.entities;
    if (!entityDb) {
        console.error('processNoMatchRecords: No unified entity database loaded.');
        return db;
    }

    var rules = window.resolvedPhonebookRules;
    if (!rules || !rules.inclusions || !rules.exclusions) {
        console.error('processNoMatchRecords: No resolved rules found.');
        console.error('Run console_resolveAnnotationKeys.js first.');
        return db;
    }

    console.log('\n=== PHASE 3.3: PROCESS NO-MATCH RECORDS (MODULAR) ===\n');

    var ingestStats = ingestNoMatchRecords(db);
    console.log('');
    var inclusionStats = applyManualInclusions(db);
    console.log('');
    var exclusionStats = applyManualExclusions(db);
    console.log('');
    var nonhumanStats = classifyNonHumanRecords(db);
    console.log('');
    var heuristicStats = applyHeuristicMatches(db);
    console.log('');
    var unmatchedStats = handleUnmatchedPersons(db);

    console.log('\n=== PHASE 3.3 SUMMARY ===');
    console.log('Records ingested: ' + ingestStats.ingested +
        ' (no-phone skipped: ' + ingestStats.noPhone +
        ', shared: ' + ingestStats.shared + ')');
    console.log('Manual inclusions applied: ' + inclusionStats.applied +
        ' (person: ' + inclusionStats.personMatches +
        ', nonhuman: ' + inclusionStats.nonhumanMatches + ')');
    console.log('Manual exclusions applied: ' + exclusionStats.applied);
    console.log('Non-human classified: ' + nonhumanStats.userDeclared +
        ' user-declared + ' + nonhumanStats.algorithmicDetected + ' algorithmic');
    console.log('Heuristic matches: ' + heuristicStats.highMatches + ' HIGH + ' +
        heuristicStats.mediumMatches + ' MEDIUM');
    console.log('Unmatched persons: ' + unmatchedStats.count);
    console.log('Database entries after Phase 3.3: ' + db.size);

    return db;
}


// =============================================================================
// PHASE 4: NAME VARIATION PROCESSING
// =============================================================================
//
// Takes matched phonebook entries and registers their name forms as aliases
// on corresponding IndividualName entries (persons) or NonHumanName objects
// (nonhumans) in their respective databases.
//
// Reference: reference_phonebookDatabasePlan.md Phase 4
// =============================================================================


// -----------------------------------------------------------------------------
// 4.1a: Utility Functions
// -----------------------------------------------------------------------------

/**
 * Get distinct person names from a PhonebookEntry, preserving the isCouple flag.
 * Like PhonebookEntry.getDistinctNames() but includes isCouple from source rawRecord.
 *
 * @param {PhonebookEntry} entry
 * @returns {Array<{lastName: string, firstName: string, secondName: string|null, isCouple: boolean}>}
 */
function getDistinctPersonNames(entry) {
    var seen = new Set();
    var names = [];

    for (var i = 0; i < entry.rawRecords.length; i++) {
        var record = entry.rawRecords[i];
        if (!record.name) continue;

        var key = (record.name.lastName || '') + '|' +
                  (record.name.firstName || '') + '|' +
                  (record.name.secondName || '');

        if (!seen.has(key)) {
            seen.add(key);
            names.push({
                lastName: record.name.lastName || '',
                firstName: record.name.firstName || '',
                secondName: record.name.secondName || null,
                isCouple: !!(record.name.isCouple)
            });
        }
    }

    return names;
}

/**
 * Construct an uppercase name string from phonebook name components.
 * Format: "FIRSTNAME [SECONDNAME] LASTNAME" — matches IndividualName primaryAlias format.
 *
 * @param {Object} nameObj - {lastName, firstName, secondName} from getDistinctPersonNames
 * @returns {string} Uppercase name string, e.g., "MATT ARNOLD" or "MATT J ARNOLD"
 */
function constructPhonebookNameString(nameObj) {
    var parts = [nameObj.firstName, nameObj.secondName, nameObj.lastName]
        .filter(function(p) { return p && p.trim(); });
    return parts.join(' ').trim().toUpperCase();
}

/**
 * Resolve the target entity for a match association.
 *
 * All match types carry entityKey (set during Phase 3.2/3.3 matching):
 * - Primary full/name matches: entityKey from name hit sourceMap or identity match
 * - Address-only matches: entityKey from extractEntityKeyFromAddressHits()
 * - Heuristic matches: entityKey from the heuristic matcher
 * - Manual inclusions: entityKey from user annotations
 *
 * A null entityKey is a bug — per the Entity Key Provenance Principle, every
 * matchAssociation must record the entity that drove it.
 *
 * @param {Object} assoc - matchAssociation from PhonebookEntry
 * @param {string} phonebookNameStr - Uppercase name string
 * @param {Object} groupDb - entity group database (with .groups object)
 * @param {Object} entityDb - unifiedEntityDatabase.entities
 * @returns {{entityKey: string, entity: Object, individualName: IndividualName, score: number}|null}
 */
function resolveEntityForAssociation(assoc, phonebookNameStr, groupDb, entityDb) {
    if (!assoc.entityKey) {
        console.error('resolveEntityForAssociation: null entityKey on association for group #' +
            assoc.groupIndex + ' (matchType: ' + (assoc.matchType || 'unknown') +
            ', matchSource: ' + (assoc.matchSource || 'unknown') + ').' +
            ' This violates the Entity Key Provenance Principle. Rebuild the PhonebookDatabase.');
        return null;
    }

    var entity = entityDb[assoc.entityKey];
    if (!entity) {
        console.warn('resolveEntityForAssociation: entityKey "' + assoc.entityKey +
            '" not found in entity database (group #' + assoc.groupIndex + ').');
        return null;
    }

    var resolved = extractIndividualNameFromEntity(entity, assoc.entityKey, phonebookNameStr);
    if (!resolved) {
        console.warn('resolveEntityForAssociation: entity "' + assoc.entityKey +
            '" has no IndividualName (group #' + assoc.groupIndex + ').');
    }
    return resolved;
}

/**
 * Extract the best-matching IndividualName from a specific entity.
 * Handles both direct Individual entities and AggregateHousehold entities
 * (which contain an individuals[] array).
 *
 * @param {Object} entity - Entity object from the database
 * @param {string} entityKey - Database key for this entity
 * @param {string} phonebookNameStr - Name string to compare against
 * @returns {{entityKey: string, entity: Object, individualName: IndividualName, score: number}|null}
 */
function extractIndividualNameFromEntity(entity, entityKey, phonebookNameStr) {
    // Direct: entity.name IS the IndividualName
    if (entity.name && entity.name instanceof IndividualName) {
        return {
            entityKey: entityKey,
            entity: entity,
            individualName: entity.name,
            score: entity.name.numericCompareTo(phonebookNameStr)
        };
    }

    // AggregateHousehold: check individuals[] array, return best match
    if (entity.individuals && Array.isArray(entity.individuals)) {
        var bestIndiv = null;
        var bestScore = -1;
        for (var i = 0; i < entity.individuals.length; i++) {
            var indiv = entity.individuals[i];
            if (indiv.name && indiv.name instanceof IndividualName) {
                var score = indiv.name.numericCompareTo(phonebookNameStr);
                if (score > bestScore) {
                    bestScore = score;
                    bestIndiv = {
                        entityKey: entityKey,
                        entity: entity,
                        individualName: indiv.name,
                        score: score
                    };
                }
            }
        }
        if (bestIndiv) return bestIndiv;
    }

    return null;
}

/**
 * Categorize a name comparison score into alias category for phonebook-sourced names.
 * Phonebook names are from a verified external source, so we use homonyms or candidates
 * (never synonyms — those are the unverified staging area per alias architecture).
 *
 * @param {number} score - Similarity score 0-1
 * @returns {string} 'homonyms' or 'candidates'
 */
function categorizePhonebookNameScore(score) {
    if (score >= getIndividualNameHomonymThreshold()) {
        return 'homonyms';
    }
    return 'candidates';
}

/**
 * Create an AttributedTerm for a phonebook-sourced name alias.
 *
 * @param {string} nameString - The phonebook name form (uppercase)
 * @param {string} phoneNumber - Source phone number for provenance
 * @param {string} category - 'homonyms' or 'candidates'
 * @returns {AttributedTerm}
 */
function createPhonebookAliasAttributedTerm(nameString, phoneNumber, category) {
    var identifier = category === 'homonyms' ? 'phonebook-homonym' : 'phonebook-candidate';
    return new AttributedTerm(
        nameString,
        'PHONEBOOK_DATABASE',
        phoneNumber,
        identifier,
        'individualNameVariation'
    );
}

/**
 * Add a phonebook name form as an alias to an IndividualName database entry.
 * Checks for duplicates using getAllTermValues() (includes all categories).
 *
 * CRITICAL: indNameDbEntry must be the object from the IndividualNameDatabase,
 * NOT the entity's copy (two-object-reference trap).
 *
 * @param {IndividualName} indNameDbEntry - IndividualName FROM THE DATABASE
 * @param {string} nameString - Phonebook name string to add (uppercase)
 * @param {string} phoneNumber - Source phone number for provenance
 * @returns {{action: string, category: string, score: number, primaryKey: string}|null} null if already exists
 */
function addPhonebookAliasToIndividualName(indNameDbEntry, nameString, phoneNumber) {
    // Duplicate check — includes primary + homonyms + synonyms + candidates
    var existingTerms = indNameDbEntry.getAllTermValues();
    var upperName = nameString.toUpperCase();
    for (var i = 0; i < existingTerms.length; i++) {
        if (existingTerms[i] === upperName) {
            return null; // Already exists
        }
    }

    // Compute similarity score
    var score = indNameDbEntry.numericCompareTo(nameString);

    // Categorize
    var category = categorizePhonebookNameScore(score);

    // Create and add
    var attributedTerm = createPhonebookAliasAttributedTerm(nameString, phoneNumber, category);
    indNameDbEntry.alternatives.add(attributedTerm, category);

    return {
        action: 'added',
        category: category,
        score: score,
        primaryKey: indNameDbEntry.primaryAlias.term
    };
}


// -----------------------------------------------------------------------------
// 4.1b: Main Person Name Variation Processing
// -----------------------------------------------------------------------------

/**
 * Process all person-classified matched phonebook entries and add their name forms
 * as aliases on corresponding IndividualName database entries.
 *
 * @param {PhonebookDatabase} phonebookDb - Loaded PhonebookDatabase
 * @param {Object} groupDb - Entity group database (with .groups object)
 * @param {Object} entityDb - unifiedEntityDatabase.entities
 * @param {IndividualNameDatabase} indNameDb - Loaded IndividualNameDatabase
 * @returns {{aliasesAdded: number, alreadyExisted: number, noIndividualNameEntry: Array, noEntityResolution: number, couplesSkipped: number, modifiedPrimaryKeys: Set, errors: Array}}
 */
function processPersonNameVariations(phonebookDb, groupDb, entityDb, indNameDb) {
    console.log('\n=== PHASE 4.1: Person Name Variation Processing ===');

    var aliasesAdded = 0;
    var alreadyExisted = 0;
    var noEntityResolution = 0;
    var couplesSkipped = 0;
    var noIndividualNameEntry = [];
    var modifiedPrimaryKeys = new Set();
    var errors = [];
    var entriesProcessed = 0;

    for (var _ref of phonebookDb) {
        var phoneKey = _ref[0];
        var entry = _ref[1];

        // Skip non-person entries
        if (entry.classification !== 'person') continue;

        // Skip unmatched entries
        if (!entry.matchAssociations || entry.matchAssociations.length === 0) continue;

        entriesProcessed++;

        // Get distinct person names from this entry
        var distinctNames = getDistinctPersonNames(entry);

        for (var n = 0; n < distinctNames.length; n++) {
            var nameObj = distinctNames[n];

            // Skip couples (deferred to Phase 4.4)
            if (nameObj.isCouple) {
                couplesSkipped++;
                continue;
            }

            // Construct the phonebook name string
            var phonebookNameStr = constructPhonebookNameString(nameObj);
            if (!phonebookNameStr) continue;

            // Process each match association for this entry
            for (var a = 0; a < entry.matchAssociations.length; a++) {
                var assoc = entry.matchAssociations[a];

                try {
                    // Resolve which entity this name maps to
                    var resolved = resolveEntityForAssociation(assoc, phonebookNameStr, groupDb, entityDb);
                    if (!resolved) {
                        noEntityResolution++;
                        continue;
                    }

                    // Find the IndividualName in the database (the DATABASE copy, not entity copy)
                    // Use the resolved entity's IndividualName primary term to look up in the DB
                    var entityNameTerm = resolved.individualName.primaryAlias.term;
                    var dbIndividualName = indNameDb.get(entityNameTerm);

                    // If exact primary key lookup fails, try the lookup method (handles variations)
                    if (!dbIndividualName) {
                        dbIndividualName = indNameDb.lookup(entityNameTerm, 0.90);
                    }

                    if (!dbIndividualName) {
                        // No corresponding IndividualName entry in the database
                        noIndividualNameEntry.push({
                            phonebookName: phonebookNameStr,
                            phoneNumber: phoneKey,
                            groupIndex: assoc.groupIndex,
                            entityKey: resolved.entityKey,
                            entityNameTerm: entityNameTerm
                        });
                        continue;
                    }

                    // Add the phonebook name as an alias on the database copy
                    var result = addPhonebookAliasToIndividualName(dbIndividualName, phonebookNameStr, phoneKey);
                    if (result) {
                        aliasesAdded++;
                        modifiedPrimaryKeys.add(result.primaryKey);
                    } else {
                        alreadyExisted++;
                    }
                } catch (err) {
                    errors.push({ phone: phoneKey, name: phonebookNameStr, error: err.message });
                }
            }
        }
    }

    console.log('Entries processed: ' + entriesProcessed);
    console.log('Aliases added: ' + aliasesAdded);
    console.log('Already existed (skipped): ' + alreadyExisted);
    console.log('Couples skipped (deferred): ' + couplesSkipped);
    console.log('No entity resolution: ' + noEntityResolution);
    console.log('No IndividualName DB entry: ' + noIndividualNameEntry.length);
    console.log('Modified IndividualName entries: ' + modifiedPrimaryKeys.size);
    if (errors.length > 0) {
        console.log('Errors: ' + errors.length);
    }

    return {
        aliasesAdded: aliasesAdded,
        alreadyExisted: alreadyExisted,
        noEntityResolution: noEntityResolution,
        couplesSkipped: couplesSkipped,
        noIndividualNameEntry: noIndividualNameEntry,
        modifiedPrimaryKeys: modifiedPrimaryKeys,
        errors: errors
    };
}


// -----------------------------------------------------------------------------
// 4.2: Proposed New IndividualName Report
// -----------------------------------------------------------------------------

/**
 * Generate a formatted report of phonebook names that have no corresponding
 * IndividualName database entry. Groups by last name for easier review.
 *
 * @param {Array<{phonebookName, phoneNumber, groupIndex, entityKey, entityNameTerm}>} entries
 * @returns {string} Formatted report text
 */
function generateNewIndividualNameReport(entries) {
    if (!entries || entries.length === 0) {
        return 'No proposed new IndividualName entries.';
    }

    console.log('\n=== PHASE 4.2: Proposed New IndividualName Entries ===');
    console.log('Total: ' + entries.length + ' phonebook names without IndividualName DB entry\n');

    // Group by last name (last word in the phonebook name string)
    var byLastName = {};
    for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        var words = e.phonebookName.split(' ');
        var lastName = words[words.length - 1] || '(unknown)';
        if (!byLastName[lastName]) byLastName[lastName] = [];
        byLastName[lastName].push(e);
    }

    // Sort last names alphabetically
    var lastNames = Object.keys(byLastName).sort();
    var lines = [];

    for (var ln = 0; ln < lastNames.length; ln++) {
        var name = lastNames[ln];
        var group = byLastName[name];
        lines.push(name + ' (' + group.length + '):');
        for (var g = 0; g < group.length; g++) {
            var item = group[g];
            lines.push('  ' + item.phonebookName +
                ' | phone: ' + item.phoneNumber +
                ' | group: ' + item.groupIndex +
                ' | entity: ' + (item.entityKey || 'n/a') +
                ' | entityName: ' + (item.entityNameTerm || 'n/a'));
        }
    }

    var report = lines.join('\n');
    console.log(report);
    return report;
}


// -----------------------------------------------------------------------------
// 4.3: NonHuman Name Variation Processing
// -----------------------------------------------------------------------------

/**
 * Process nonhuman-classified matched phonebook entries and add their name forms
 * as alternatives on the corresponding NonHumanName objects.
 *
 * Note: NonHumanName changes live on entities (no separate database).
 * Persisted via entity group save cycle.
 *
 * @param {PhonebookDatabase} phonebookDb - Loaded PhonebookDatabase
 * @param {Object} groupDb - Entity group database (with .groups object)
 * @param {Object} entityDb - unifiedEntityDatabase.entities
 * @returns {{aliasesAdded: number, alreadyExisted: number, noEntityResolution: number, errors: Array}}
 */
function processNonHumanNameVariations(phonebookDb, groupDb, entityDb) {
    console.log('\n=== PHASE 4.3: NonHuman Name Variation Processing ===');

    var aliasesAdded = 0;
    var alreadyExisted = 0;
    var noEntityResolution = 0;
    var entriesProcessed = 0;
    var errors = [];

    for (var _ref of phonebookDb) {
        var phoneKey = _ref[0];
        var entry = _ref[1];

        // Skip non-nonhuman entries
        if (entry.classification !== 'nonhuman') continue;

        // Skip unmatched entries
        if (!entry.matchAssociations || entry.matchAssociations.length === 0) continue;

        entriesProcessed++;

        // Use the raw name from the first rawRecord
        var rawName = (entry.rawRecords[0] && entry.rawRecords[0].name)
            ? (entry.rawRecords[0].name.raw || '').trim().toUpperCase()
            : '';
        if (!rawName) continue;

        for (var a = 0; a < entry.matchAssociations.length; a++) {
            var assoc = entry.matchAssociations[a];

            try {
                // Get the matched group
                var group = groupDb.groups[assoc.groupIndex];
                if (!group) {
                    noEntityResolution++;
                    continue;
                }

                // Find the NonHumanName entity in the group
                var nonHumanName = null;
                for (var m = 0; m < group.memberKeys.length; m++) {
                    var entity = entityDb[group.memberKeys[m]];
                    if (!entity) continue;

                    // Check if entity.name is a NonHumanName (not IndividualName, not HouseholdName)
                    if (entity.name &&
                        !(entity.name instanceof IndividualName) &&
                        entity.name.primaryAlias) {
                        nonHumanName = entity.name;
                        break;
                    }
                }

                if (!nonHumanName) {
                    noEntityResolution++;
                    continue;
                }

                // Check if phonebook name already exists on this NonHumanName
                var existingTerms = nonHumanName.getAllTermValues();
                var alreadyPresent = false;
                for (var t = 0; t < existingTerms.length; t++) {
                    if (existingTerms[t] === rawName) {
                        alreadyPresent = true;
                        break;
                    }
                }

                if (alreadyPresent) {
                    alreadyExisted++;
                    continue;
                }

                // Add as alternative
                var attributedTerm = new AttributedTerm(
                    rawName,
                    'PHONEBOOK_DATABASE',
                    phoneKey,
                    'phonebook-nonhuman',
                    'nonHumanNameVariation'
                );
                nonHumanName.alternatives.add(attributedTerm, 'candidates');
                aliasesAdded++;

            } catch (err) {
                errors.push({ phone: phoneKey, name: rawName, error: err.message });
            }
        }
    }

    console.log('Entries processed: ' + entriesProcessed);
    console.log('Aliases added: ' + aliasesAdded);
    console.log('Already existed (skipped): ' + alreadyExisted);
    console.log('No entity resolution: ' + noEntityResolution);
    if (errors.length > 0) {
        console.log('Errors: ' + errors.length);
    }

    return {
        aliasesAdded: aliasesAdded,
        alreadyExisted: alreadyExisted,
        noEntityResolution: noEntityResolution,
        errors: errors
    };
}


// -----------------------------------------------------------------------------
// 4.1c/4.3b: Top-Level Orchestrator
// -----------------------------------------------------------------------------

/**
 * Run all Phase 4 name variation processing.
 * Validates prerequisites, runs person and nonhuman processing, generates reports.
 *
 * @param {PhonebookDatabase} phonebookDb - Loaded PhonebookDatabase
 * @param {Object} [options] - { groupDb, entityDb, indNameDb } (auto-detected if omitted)
 * @returns {{personResults: Object, nonhumanResults: Object, report: string}}
 */
function processPhase4NameVariations(phonebookDb, options) {
    options = options || {};

    // Resolve databases — use provided or auto-detect from window globals
    var groupDb = options.groupDb || (window.entityGroupBrowser && window.entityGroupBrowser.loadedDatabase);
    var entityDb = options.entityDb || (window.unifiedEntityDatabase && window.unifiedEntityDatabase.entities);
    var indNameDb = options.indNameDb || window.individualNameDatabase;

    // Validate prerequisites
    if (!phonebookDb || phonebookDb.size === 0) {
        throw new Error('Phase 4: PhonebookDatabase not loaded or empty.');
    }
    if (!groupDb || !groupDb.groups) {
        throw new Error('Phase 4: Entity group database not loaded. Load via entity group browser first.');
    }
    if (!entityDb) {
        throw new Error('Phase 4: Unified entity database not loaded.');
    }
    if (!indNameDb) {
        throw new Error('Phase 4: IndividualNameDatabase not loaded. Load via "Load Name Database" button first.');
    }

    console.log('\n========================================');
    console.log('PHASE 4: NAME VARIATION PROCESSING');
    console.log('========================================');
    console.log('PhonebookDatabase: ' + phonebookDb.size + ' entries');
    console.log('Entity groups: ' + Object.keys(groupDb.groups).length);
    console.log('IndividualName entries: ' + indNameDb.size);

    // Phase 4.1: Person name variations
    var personResults = processPersonNameVariations(phonebookDb, groupDb, entityDb, indNameDb);

    // Phase 4.2: Report for proposed new entries
    var report = '';
    if (personResults.noIndividualNameEntry.length > 0) {
        report = generateNewIndividualNameReport(personResults.noIndividualNameEntry);
    }

    // Phase 4.3: NonHuman name variations
    var nonhumanResults = processNonHumanNameVariations(phonebookDb, groupDb, entityDb);

    // Combined summary
    console.log('\n========================================');
    console.log('PHASE 4 SUMMARY');
    console.log('========================================');
    console.log('Person aliases added: ' + personResults.aliasesAdded);
    console.log('Person already existed: ' + personResults.alreadyExisted);
    console.log('Couples deferred: ' + personResults.couplesSkipped);
    console.log('No entity resolution: ' + personResults.noEntityResolution);
    console.log('No IndividualName DB entry: ' + personResults.noIndividualNameEntry.length);
    console.log('NonHuman aliases added: ' + nonhumanResults.aliasesAdded);
    console.log('NonHuman already existed: ' + nonhumanResults.alreadyExisted);
    console.log('Modified IndividualName entries: ' + personResults.modifiedPrimaryKeys.size);
    var totalErrors = personResults.errors.length + nonhumanResults.errors.length;
    if (totalErrors > 0) {
        console.log('Total errors: ' + totalErrors);
    }

    return {
        personResults: personResults,
        nonhumanResults: nonhumanResults,
        report: report
    };
}


// -----------------------------------------------------------------------------
// Persistence: Save Modified IndividualNames
// -----------------------------------------------------------------------------

/**
 * Save the IndividualNameDatabase after Phase 4 modifications.
 *
 * Uses saveIndividualNameDatabaseBulk() to save the entire database as a single
 * bulk file. This avoids the _saveIndex corruption issue that occurs when the
 * database was loaded from bulk (fileIds are null in memory).
 *
 * After saving bulk, individual files can be updated later via
 * fileOutIndividualNames() if needed.
 *
 * @param {IndividualNameDatabase} indNameDb - The IndividualNameDatabase
 * @param {Set<string>} modifiedPrimaryKeys - Set of primary keys that were modified (for reporting)
 * @returns {Promise<void>}
 */
async function saveModifiedIndividualNames(indNameDb, modifiedPrimaryKeys) {
    if (!modifiedPrimaryKeys || modifiedPrimaryKeys.size === 0) {
        console.log('No modified IndividualName entries to save.');
        return;
    }

    console.log('\n=== Saving IndividualNameDatabase (' + modifiedPrimaryKeys.size + ' entries modified) ===');

    // Rebuild variation cache to include new aliases
    indNameDb._buildVariationCache();
    console.log('Variation cache rebuilt with new aliases.');

    // Save entire database as bulk file (single API call, avoids _saveIndex corruption)
    await saveIndividualNameDatabaseBulk(indNameDb);

    console.log('Bulk save complete. Individual files can be updated later via fileOutIndividualNames().');
}

