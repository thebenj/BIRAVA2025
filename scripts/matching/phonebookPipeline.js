/**
 * PhonebookPipeline - EntityKey extraction and database build pipeline
 *
 * Contains:
 * - Entity key extraction from name/address hits
 * - populatePrimaryMatches() - records entityKeys on primary match associations
 * - verifyEntityKey() - runtime entity key validation
 * - Phase 3.3 no-match record processing (modular steps):
 *   ingestNoMatchRecords, applyManualInclusions, applyManualExclusions,
 *   classifyNonHumanRecords, applyHeuristicMatches, handleUnmatchedPersons,
 *   processNoMatchRecords (orchestrator)
 *
 * Dependencies:
 * - phonebookDetection.js (detectNonHumanType, heuristic matching functions)
 * - phonebookDatabase.js (normalizePhoneNumber, PhonebookDatabase)
 * - levenshteinSimilarity() from utils.js
 * - window.resolvedPhonebookRules (from resolveAnnotationKeys() or loadResolvedPhonebookRules())
 * - entityGroupBrowser.loadedDatabase
 * - window.unifiedEntityDatabase
 *
 * Split from phonebookMatcher.js Session 126
 * @see reference_phonebookDatabasePlan.md
 */

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
 *   - window.resolvedPhonebookRules (from resolveAnnotationKeys() or loadResolvedPhonebookRules())
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
        console.error('Run resolveAnnotationKeys() or loadResolvedPhonebookRules() first.');
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


/**
 * Post-processing pass: tag matchAssociations that point to AggregateHouseholds
 * with empty individuals[]. These are cases where the phonebook provides a clean
 * individual name for a household that VisionAppraisal name parsing could not separate.
 * Phase 4.5 reads this tag to create new Individual objects instead of searching
 * for existing ones.
 *
 * Runs after the entire pipeline (populatePrimaryMatches + processNoMatchRecords)
 * so it catches all match types regardless of origin.
 */
function tagIndividualDiscovery(db, entityDb) {
    var tagged = 0;
    var totalAssociations = 0;

    db.entries.forEach(function(wrapper) {
        var entry = wrapper.entry;
        if (!entry.matchAssociations) return;
        entry.matchAssociations.forEach(function(assoc) {
            totalAssociations++;
            if (!assoc.entityKey) return;

            var entity = entityDb[assoc.entityKey];
            if (!entity) return;

            if (entity.constructor.name === 'AggregateHousehold' &&
                (!entity.individuals || entity.individuals.length === 0)) {
                assoc.individualDiscovery = true;
                tagged++;
            }
        });
    });

    console.log('--- Tag Individual Discovery ---');
    console.log('Associations scanned: ' + totalAssociations);
    console.log('Tagged individualDiscovery: ' + tagged);
    return tagged;
}


console.log('PhonebookPipeline (entityKey extraction + pipeline orchestration) loaded.');
