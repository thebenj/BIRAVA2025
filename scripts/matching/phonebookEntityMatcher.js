/**
 * PhonebookEntityMatcher - Entity-level phonebook matching helpers (Phase 4.6)
 *
 * Compares phonebook records against INDIVIDUAL ENTITIES in the unified entity database.
 * This is the entity-level counterpart to the group-level lookups in phonebookMatcher.js.
 *
 * Group-level: lookupNamesInGroup() iterates group.individualNames{} collection
 * Entity-level: lookupNameOnEntity() compares against a single entity's name(s)
 *
 * Dependencies:
 * - bestScoreFromFourScore() from phonebookMatcher.js (loaded globally)
 * - createPhonebookNameObjects() from phonebookMatcher.js (loaded globally)
 * - window.unifiedEntityDatabase must be populated
 *
 * @see reference_phonebookDatabasePlan.md Phase 4.6
 */

// =============================================================================
// NAME LOOKUP ON ENTITY
// =============================================================================

/**
 * Compare phonebook name objects against a single entity's name(s).
 *
 * - Individual: compares against entity.name (single IndividualName)
 * - AggregateHousehold: compares against each entity.individuals[].name
 * - Other types (Business, NonHumanName, LegalConstruct, CompositeHousehold): skipped
 *
 * Returns hits in the same shape as lookupNamesInGroup() for consistency.
 *
 * @param {Array<{firstName: string, lastName: string, otherNames: string}>} phonebookNames
 *     Array of 1 or 2 name objects (2 for couples). Use createPhonebookNameObjects() to create.
 * @param {Object} entity - An entity from unifiedEntityDatabase.entities[key]
 * @returns {Array<{score: number, fourScore: Object, matchedName: Object, matchedNameLabel: string,
 *                  phonebookName: Object, source: string}>}
 *     Array of hits above threshold (may be empty)
 */
function lookupNameOnEntity(phonebookNames, entity) {
    const NAME_THRESHOLD = 0.80;  // Same threshold as lookupNamesInGroup
    const hits = [];

    if (!entity || !phonebookNames || phonebookNames.length === 0) return hits;

    const entityType = entity.constructor?.name;

    if (entityType === 'Individual') {
        // Single person — compare against entity.name
        if (!entity.name || typeof entity.name.compareTo !== 'function') return hits;

        for (const pbName of phonebookNames) {
            const fourScore = entity.name.compareTo(pbName);
            const score = bestScoreFromFourScore(fourScore);
            if (score >= NAME_THRESHOLD) {
                hits.push({
                    score,
                    fourScore,
                    matchedName: entity.name,
                    matchedNameLabel: entity.name.identifier?.primaryAlias?.term
                        || entity.name.toString?.() || '(unknown)',
                    phonebookName: pbName,
                    source: 'Individual.name'
                });
            }
        }
    } else if (entityType === 'AggregateHousehold') {
        // Multiple people — compare against each individual's name
        const individuals = entity.individuals || [];

        for (let i = 0; i < individuals.length; i++) {
            const indiv = individuals[i];
            if (!indiv?.name || typeof indiv.name.compareTo !== 'function') continue;

            for (const pbName of phonebookNames) {
                const fourScore = indiv.name.compareTo(pbName);
                const score = bestScoreFromFourScore(fourScore);
                if (score >= NAME_THRESHOLD) {
                    hits.push({
                        score,
                        fourScore,
                        matchedName: indiv.name,
                        matchedNameLabel: indiv.name.identifier?.primaryAlias?.term
                            || indiv.name.toString?.() || '(unknown)',
                        phonebookName: pbName,
                        source: `AggregateHousehold.individuals[${i}].name`
                    });
                }
            }
        }
    }
    // Other entity types (Business, NonHumanName, LegalConstruct, CompositeHousehold)
    // are not person-name comparable — return empty hits

    return hits;
}

// =============================================================================
// SHARED HELPERS
// =============================================================================

/**
 * Check if an Address object is a Block Island address.
 * Replicates the exact logic from entityGroup.js buildMemberCollections() lines 371-373.
 *
 * @param {Object} address - Address object from entity.contactInfo
 * @returns {boolean}
 */
function _isBlockIslandAddress(address) {
    return address.isBlockIslandAddress?.term === 'true' ||
           address.isBlockIslandAddress?.term === true ||
           address.zipCode?.term === '02807';
}

// =============================================================================
// ADDRESS LOOKUP ON ENTITY
// =============================================================================

/**
 * Compare a phonebook record's address against a single entity's address(es).
 * Checks primary address and all secondary addresses for fire number match.
 * Falls back to street-only match if no fire number in the phonebook record.
 *
 * Uses the same fire-number-is-sufficient-on-BI principle as lookupAddressInGroup().
 * Fire number normalization strips trailing letter suffixes (collision indicators):
 *   "123" → "123", "123A" → "123"
 *
 * @param {Object} record - Parsed phonebook record (needs record.address fields)
 * @param {Object} entity - An entity from unifiedEntityDatabase.entities[key]
 * @returns {Array<{matchedAddress: Object, addressSource: string,
 *                  isCollision: boolean, matchType: string}>}
 *     Array of address hits (may be empty)
 */
function lookupAddressOnEntity(record, entity) {
    const hits = [];
    const addr = record.address;

    // Gate: must be a recognized BI address in the phonebook record
    if (!addr || !addr.isValidBIStreet) return hits;
    if (!entity || !entity.contactInfo) return hits;

    // Collect all entity addresses that are on Block Island: primary + secondaries
    // (Group-level lookupAddressInGroup uses group.blockIslandAddresses{} which only
    // contains BI addresses by construction. At the entity level we must filter explicitly.)
    // BI detection logic matches entityGroup.js buildMemberCollections() lines 371-373.
    const entityAddresses = [];
    if (entity.contactInfo.primaryAddress && _isBlockIslandAddress(entity.contactInfo.primaryAddress)) {
        entityAddresses.push({ address: entity.contactInfo.primaryAddress, source: 'primary' });
    }
    if (Array.isArray(entity.contactInfo.secondaryAddress)) {
        for (let i = 0; i < entity.contactInfo.secondaryAddress.length; i++) {
            const secAddr = entity.contactInfo.secondaryAddress[i];
            if (_isBlockIslandAddress(secAddr)) {
                entityAddresses.push({ address: secAddr, source: `secondary[${i}]` });
            }
        }
    }

    if (entityAddresses.length === 0) return hits;

    if (addr.fireNumber) {
        // --- CASE: Phonebook has fire number ---
        for (const ea of entityAddresses) {
            const entityFireNum = ea.address.streetNumber?.term;
            if (!entityFireNum) continue;

            const normalizedEntityFireNum = String(entityFireNum).replace(/[A-Za-z]+$/, '');
            if (normalizedEntityFireNum === addr.fireNumber) {
                const hasLetterSuffix = String(entityFireNum) !== normalizedEntityFireNum;
                const isCollision = addr.hasCollisionSuffix || hasLetterSuffix;
                hits.push({
                    matchedAddress: ea.address,
                    addressSource: ea.source,
                    isCollision,
                    matchType: 'fireNumber'
                });
            }
        }
    } else if (addr.streetNormalized) {
        // --- CASE: No fire number but has verified BI street ---
        for (const ea of entityAddresses) {
            const entityStreet = ea.address.biStreetName?.primaryAlias?.term;
            if (entityStreet && entityStreet === addr.streetNormalized) {
                hits.push({
                    matchedAddress: ea.address,
                    addressSource: ea.source,
                    isCollision: false,
                    matchType: 'streetOnly'
                });
            }
        }
    }

    return hits;
}

// =============================================================================
// PO BOX LOOKUP ON ENTITY
// =============================================================================

/**
 * Compare a phonebook record's PO box against a single entity's PO box.
 *
 * @param {Object} record - Parsed phonebook record (needs record.address.box)
 * @param {Object} entity - An entity from unifiedEntityDatabase.entities[key]
 * @returns {Array<{matchedBox: Object, matchedBoxId: string}>}
 *     Array of PO box hits (0 or 1 elements)
 */
function lookupPOBoxOnEntity(record, entity) {
    const hits = [];
    const box = record.address?.box;

    if (!box) return hits;
    if (!entity || !entity.contactInfo) return hits;

    const poBox = entity.contactInfo.poBox;
    if (!poBox || !poBox.primaryAlias || !poBox.primaryAlias.term) return hits;

    const normalizedRecordBox = box.trim().toUpperCase();
    const normalizedEntityBox = poBox.primaryAlias.term.trim().toUpperCase();

    if (normalizedRecordBox === normalizedEntityBox) {
        hits.push({
            matchedBox: poBox,
            matchedBoxId: normalizedEntityBox
        });
    }

    return hits;
}

// =============================================================================
// ORCHESTRATION: Match a phonebook record against all entities
// =============================================================================

/**
 * Match a single phonebook record against all entities in the unified entity database.
 * This is the entity-level counterpart to matchPhonebookRecordToGroups().
 *
 * For each entity, runs name, address, and PO box lookups. Returns hits grouped
 * by entity key so downstream code can classify match quality per entity.
 *
 * @param {Object} record - Parsed phonebook record (from window.phonebookResults.records[])
 * @param {Object} entities - unifiedEntityDatabase.entities (key→entity map)
 * @returns {{ record: Object, entityHits: Object }}
 *     entityHits is keyed by entity key, each value has { entity, nameHits, addressHits, poBoxHits }
 *     Only entities with at least one hit are included.
 */
function matchPhonebookRecordToEntities(record, entities) {
    const phonebookNames = createPhonebookNameObjects(record);
    const entityHits = {};

    for (const [key, entity] of Object.entries(entities)) {
        const nameHits = phonebookNames.length > 0
            ? lookupNameOnEntity(phonebookNames, entity) : [];
        const addressHits = lookupAddressOnEntity(record, entity);
        const poBoxHits = lookupPOBoxOnEntity(record, entity);

        if (nameHits.length > 0 || addressHits.length > 0 || poBoxHits.length > 0) {
            entityHits[key] = { entity, nameHits, addressHits, poBoxHits };
        }
    }

    return { record, entityHits };
}

// =============================================================================
// CLASSIFICATION: Classify entity-level match results
// =============================================================================

/**
 * Classify a phonebook record's entity-level match results into Full/Name/Address matches.
 *
 * Entity-level counterpart to classifyPhonebookMatch() in phonebookMatcher.js.
 * Input is already bucketed by entity key (from matchPhonebookRecordToEntities()),
 * so no grouping step is needed — each entity's hit combination is classified independently.
 *
 * Classification rules (same as group-level):
 * 1. streetOnly address matches cannot stand alone — need name corroboration or fireNumber/PO box
 * 2. Variable name thresholds via PHONEBOOK_CLASSIFICATION_THRESHOLDS
 * 3. Address-alone requires fireNumber or PO box (not streetOnly, not collision)
 * 4. Full matches kill all partials across ALL entities for this record
 * 5. Couple Condition 2 — limited to AggregateHouseholds with populated individuals[]
 *
 * @param {Object} matchResult - Output from matchPhonebookRecordToEntities()
 *     { record, entityHits } where entityHits is keyed by entity key
 * @returns {{ record: Object, fullMatches: Array, nameMatches: Array, addressMatches: Array }}
 */
function classifyEntityMatchResult(matchResult) {
    const { record, entityHits } = matchResult;
    const T = PHONEBOOK_CLASSIFICATION_THRESHOLDS;
    const isCouple = record.name.isCouple && record.name.secondName;

    const fullMatches = [];
    const nameMatches = [];
    const addressMatches = [];

    for (const [entityKey, bucket] of Object.entries(entityHits)) {
        const hasAddress = bucket.addressHits.length > 0;
        const hasPoBox = bucket.poBoxHits.length > 0;
        const hasAddressEvidence = hasAddress || hasPoBox;
        const isCollision = bucket.addressHits.some(h => h.isCollision);
        const bestNameScore = bucket.nameHits.length > 0
            ? Math.max(...bucket.nameHits.map(h => h.score))
            : 0;
        const hasNameHits = bucket.nameHits.length > 0;

        // --- Couple Condition 2 check (AggregateHouseholds only) ---
        let isCoupleCondition2 = false;
        if (isCouple && hasAddressEvidence && bucket.nameHits.length >= 2) {
            const entityType = bucket.entity.constructor?.name;
            if (entityType === 'AggregateHousehold') {
                isCoupleCondition2 = _checkEntityCoupleCondition2(bucket.nameHits, record, T);
            }
        }

        // Address-only rule: streetOnly matches require name corroboration.
        // Only fire number or PO box matches can stand alone as Address-only.
        const hasFireNumberHit = bucket.addressHits.some(h => h.matchType === 'fireNumber');
        const hasStrongAddressEvidence = hasFireNumberHit || hasPoBox;

        // --- Classify this entity ---
        if (hasNameHits && hasAddressEvidence) {
            // Name + address on same entity → Full Match candidate
            // (streetOnly address is fine here — name corroborates it)
            const nameThreshold = isCollision ? T.nameWithCollision : T.nameWithAddress;
            if (bestNameScore >= nameThreshold || isCoupleCondition2) {
                fullMatches.push({
                    entityKey,
                    entity: bucket.entity,
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
                    entityKey,
                    entity: bucket.entity,
                    addressHits: bucket.addressHits,
                    poBoxHits: bucket.poBoxHits,
                    isCollision: false
                });
            }
            // streetOnly + weak name, or collision + weak name → no match for this entity
        } else if (hasNameHits && !hasAddressEvidence) {
            // Name only → Name Match if score meets nameAlone threshold
            if (bestNameScore >= T.nameAlone) {
                nameMatches.push({
                    entityKey,
                    entity: bucket.entity,
                    nameHits: bucket.nameHits,
                    bestNameScore
                });
            }
        } else if (!hasNameHits && hasAddressEvidence) {
            // Address only → requires fire number or PO box (streetOnly too weak alone)
            if (hasStrongAddressEvidence && !isCollision) {
                addressMatches.push({
                    entityKey,
                    entity: bucket.entity,
                    addressHits: bucket.addressHits,
                    poBoxHits: bucket.poBoxHits,
                    isCollision: false
                });
            }
            // streetOnly with no name, or collision with no name → no match
        }
    }

    // --- Priority rule: Full matches supersede all partial matches ---
    if (fullMatches.length > 0) {
        return { record, fullMatches, nameMatches: [], addressMatches: [] };
    }

    return { record, fullMatches: [], nameMatches, addressMatches };
}

/**
 * Check Couple Condition 2 at entity level: both persons match DIFFERENT
 * individual names on the same AggregateHousehold entity, both >= nameAlone threshold.
 *
 * At group level, "different names" is checked via matchedGroupNameKey.
 * At entity level, we use the source field (e.g., "AggregateHousehold.individuals[0].name"
 * vs "individuals[1].name") as the discriminator — each individual on the entity
 * has a unique source string.
 *
 * @param {Array} nameHits - Name hits for this entity
 * @param {Object} record - The phonebook record
 * @param {Object} thresholds - PHONEBOOK_CLASSIFICATION_THRESHOLDS
 * @returns {boolean}
 */
function _checkEntityCoupleCondition2(nameHits, record, thresholds) {
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

    // Must have matched DIFFERENT individuals on the entity (via source field)
    if (best1.source === best2.source) return false;

    return true;
}

/**
 * Diagnostic: match a manually-specified phonebook record against all entities.
 * Constructs a minimal record object from the arguments, runs the full entity scan,
 * and logs which entities matched and why.
 *
 * @param {string} firstName - Phonebook first name
 * @param {string} lastName - Phonebook last name
 * @param {string} [fireNumber] - Fire number (digits only, e.g. "335"). Optional.
 * @param {string} [poBox] - PO box identifier. Optional.
 */
function testEntityMatch(firstName, lastName, fireNumber, poBox) {
    if (!window.unifiedEntityDatabase?.entities) {
        console.error('Unified entity database not loaded.');
        return;
    }

    // Build a minimal phonebook record with the fields the helpers expect
    const record = {
        name: { firstName, lastName, otherNames: '', isCouple: false, secondName: null },
        address: {
            fireNumber: fireNumber || null,
            isValidBIStreet: !!fireNumber,  // treat as valid BI if fire number provided
            streetNormalized: null,
            hasCollisionSuffix: false,
            box: poBox || null
        },
        phone: null
    };

    const startTime = Date.now();
    const result = matchPhonebookRecordToEntities(record, window.unifiedEntityDatabase.entities);
    const elapsed = Date.now() - startTime;

    const hitKeys = Object.keys(result.entityHits);
    console.log(`\n=== testEntityMatch ===`);
    console.log(`Search: ${firstName} ${lastName}${fireNumber ? ', fire#' + fireNumber : ''}${poBox ? ', PO Box ' + poBox : ''}`);
    console.log(`Scanned ${Object.keys(window.unifiedEntityDatabase.entities).length} entities in ${elapsed}ms`);
    console.log(`Entities with hits: ${hitKeys.length}`);

    for (const key of hitKeys) {
        const h = result.entityHits[key];
        const type = h.entity.constructor?.name;
        const nameSummary = h.nameHits.length > 0
            ? h.nameHits.map(n => `${n.matchedNameLabel} (${n.score.toFixed(3)})`).join(', ')
            : '(none)';
        const addrSummary = h.addressHits.length > 0
            ? h.addressHits.map(a => `${a.addressSource} ${a.matchType}${a.isCollision ? ' COLLISION' : ''}`).join(', ')
            : '(none)';
        const boxSummary = h.poBoxHits.length > 0
            ? h.poBoxHits.map(b => `Box ${b.matchedBoxId}`).join(', ')
            : '(none)';

        console.log(`\n  ${key} (${type}):`);
        console.log(`    Name: ${nameSummary}`);
        console.log(`    Address: ${addrSummary}`);
        console.log(`    PO Box: ${boxSummary}`);
    }

    return result;
}

// =============================================================================
// DIAGNOSTIC: Test name lookup against a specific entity
// =============================================================================

/**
 * Diagnostic function: test lookupNameOnEntity against a specific entity key.
 * Paste in browser console after unified entity database is loaded.
 *
 * @param {string} entityKey - Key into unifiedEntityDatabase.entities
 * @param {string} firstName - Phonebook first name to compare
 * @param {string} lastName - Phonebook last name to compare
 */
function testEntityNameLookup(entityKey, firstName, lastName) {
    if (!window.unifiedEntityDatabase?.entities) {
        console.error('Unified entity database not loaded.');
        return;
    }

    const entity = window.unifiedEntityDatabase.entities[entityKey];
    if (!entity) {
        console.error('Entity not found:', entityKey);
        return;
    }

    const entityType = entity.constructor?.name;
    console.log(`\n=== testEntityNameLookup ===`);
    console.log(`Entity key: ${entityKey}`);
    console.log(`Entity type: ${entityType}`);
    console.log(`Entity name: ${entity.name}`);
    console.log(`Entity name type: ${entity.name?.constructor?.name}`);
    console.log(`Has compareTo: ${typeof entity.name?.compareTo === 'function'}`);

    if (entityType === 'AggregateHousehold') {
        console.log(`Individuals: ${(entity.individuals || []).length}`);
        for (let i = 0; i < (entity.individuals || []).length; i++) {
            const indiv = entity.individuals[i];
            console.log(`  [${i}] ${indiv?.name} (type: ${indiv?.name?.constructor?.name}, compareTo: ${typeof indiv?.name?.compareTo === 'function'})`);
        }
    }

    const phonebookNames = [{ firstName, lastName, otherNames: '' }];
    console.log(`\nComparing against: ${firstName} ${lastName}`);

    const hits = lookupNameOnEntity(phonebookNames, entity);

    if (hits.length === 0) {
        console.log('No hits above threshold (0.80).');
    } else {
        console.log(`\n${hits.length} hit(s):`);
        for (const hit of hits) {
            console.log(`  Score: ${hit.score.toFixed(3)} | Matched: "${hit.matchedNameLabel}" | Source: ${hit.source}`);
            console.log(`    fourScore: primary=${hit.fourScore.primary?.toFixed(3)}, homonym=${hit.fourScore.homonym?.toFixed(3)}, candidate=${hit.fourScore.candidate?.toFixed(3)}`);
        }
    }

    return hits;
}

// =============================================================================
// DIAGNOSTIC: Inspect an entity's address structure
// =============================================================================

/**
 * Show how an entity's address data is structured — verifies that
 * lookupAddressOnEntity() and lookupPOBoxOnEntity() can navigate to the
 * fire number, street name, and PO box fields correctly.
 *
 * @param {string} entityKey - Key into unifiedEntityDatabase.entities
 */
function inspectEntityAddress(entityKey) {
    if (!window.unifiedEntityDatabase?.entities) {
        console.error('Unified entity database not loaded.');
        return;
    }

    const entity = window.unifiedEntityDatabase.entities[entityKey];
    if (!entity) {
        console.error('Entity not found:', entityKey);
        return;
    }

    console.log(`\n=== inspectEntityAddress ===`);
    console.log(`Entity key: ${entityKey}`);
    console.log(`Entity type: ${entity.constructor?.name}`);
    console.log(`Has contactInfo: ${!!entity.contactInfo}`);

    if (!entity.contactInfo) return;

    // Primary address
    const pa = entity.contactInfo.primaryAddress;
    if (pa) {
        const fireNum = pa.streetNumber?.term || '(none)';
        const normalized = pa.streetNumber?.term ? String(pa.streetNumber.term).replace(/[A-Za-z]+$/, '') : '(none)';
        const street = pa.biStreetName?.primaryAlias?.term || '(none)';
        const isBI = pa.isBlockIslandAddress?.term;
        console.log(`Primary address:`);
        console.log(`  Fire number: ${fireNum} (normalized: ${normalized})`);
        console.log(`  Street: ${street}`);
        console.log(`  Block Island: ${isBI}`);
    } else {
        console.log(`Primary address: (none)`);
    }

    // Secondary addresses
    const secs = entity.contactInfo.secondaryAddress || [];
    console.log(`Secondary addresses: ${secs.length}`);
    for (let i = 0; i < secs.length; i++) {
        const sa = secs[i];
        const fireNum = sa.streetNumber?.term || '(none)';
        const street = sa.biStreetName?.primaryAlias?.term || '(none)';
        console.log(`  [${i}] Fire: ${fireNum}, Street: ${street}`);
    }

    // PO Box
    const poBox = entity.contactInfo.poBox;
    if (poBox && poBox.primaryAlias?.term) {
        console.log(`PO Box: ${poBox.primaryAlias.term}`);
    } else {
        console.log(`PO Box: (none)`);
    }
}

// =============================================================================
// BATCH DIAGNOSTIC: Run unmatched phonebook records through entity matcher
// =============================================================================

/**
 * Run all unmatched person records from a PhonebookDatabase through the entity-level
 * matcher WITH classification. Reports classified matches (full/name/address),
 * not raw hits — streetOnly false positives should be eliminated by classification.
 *
 * This answers the core Step 1 question: which unmatched phonebook records can be
 * matched to individual entities, and at what quality level?
 *
 * PhonebookDatabase must be loaded first (var db = new PhonebookDatabase(); await db.loadFromBulk();)
 * Unified entity database must be in memory.
 *
 * Uses for...of db iteration per MEMORY.md (yields fully-formed entries with classification).
 *
 * @param {PhonebookDatabase} db - Loaded PhonebookDatabase instance
 * @param {number} [limit] - Optional: only process first N unmatched entries (for quick testing)
 * @returns {Object} Summary statistics and detailed results
 */
function batchEntityMatch(db, limit) {
    if (!db) {
        console.error('PhonebookDatabase not provided. Usage: batchEntityMatch(db) or batchEntityMatch(db, 10)');
        return;
    }
    if (!window.unifiedEntityDatabase?.entities) {
        console.error('Unified entity database not loaded.');
        return;
    }

    const entities = window.unifiedEntityDatabase.entities;
    const startTime = Date.now();

    // Collect unmatched person entries using for...of (class iterator, fully-formed entries)
    const unmatchedEntries = [];
    for (const [key, entry] of db) {
        if (entry.classification === 'person' &&
            (!entry.matchAssociations || entry.matchAssociations.length === 0)) {
            unmatchedEntries.push({ key, entry });
        }
    }

    const toProcess = limit ? unmatchedEntries.slice(0, limit) : unmatchedEntries;
    console.log(`\n=== batchEntityMatch (with classification) ===`);
    console.log(`Unmatched person entries in PhonebookDatabase: ${unmatchedEntries.length}`);
    console.log(`Processing: ${toProcess.length}${limit ? ' (limited)' : ''}`);

    const results = {
        totalRecordsProcessed: 0,
        // Raw hit counts (before classification)
        rawHitRecords: 0,
        // Classified match counts
        recordsWithFullMatch: 0,
        recordsWithNameMatch: 0,
        recordsWithAddressMatch: 0,
        recordsNoClassifiedMatch: 0,
        // Entity counts within classified matches
        totalFullMatchEntities: 0,
        totalNameMatchEntities: 0,
        totalAddressMatchEntities: 0,
        // Couple Condition 2 count
        coupleCondition2Count: 0,
        // Per-entry results
        details: []
    };

    for (const { key, entry } of toProcess) {
        const rawRecords = entry.rawRecords || [];
        if (rawRecords.length === 0) continue;

        for (const record of rawRecords) {
            results.totalRecordsProcessed++;

            // Step 1: Get raw hits
            const matchResult = matchPhonebookRecordToEntities(record, entities);
            const rawHitCount = Object.keys(matchResult.entityHits).length;
            if (rawHitCount > 0) results.rawHitRecords++;

            // Step 2: Classify
            const classified = classifyEntityMatchResult(matchResult);

            const hasFull = classified.fullMatches.length > 0;
            const hasName = classified.nameMatches.length > 0;
            const hasAddr = classified.addressMatches.length > 0;
            const hasAnyClassified = hasFull || hasName || hasAddr;

            if (hasFull) results.recordsWithFullMatch++;
            if (hasName) results.recordsWithNameMatch++;
            if (hasAddr) results.recordsWithAddressMatch++;
            if (!hasAnyClassified) results.recordsNoClassifiedMatch++;

            results.totalFullMatchEntities += classified.fullMatches.length;
            results.totalNameMatchEntities += classified.nameMatches.length;
            results.totalAddressMatchEntities += classified.addressMatches.length;
            results.coupleCondition2Count += classified.fullMatches.filter(m => m.isCoupleCondition2).length;

            // Store detail for matched records
            if (hasAnyClassified) {
                const recordName = (record.name?.firstName || '') + ' ' + (record.name?.lastName || '');
                const recordAddr = record.address?.fireNumber
                    ? 'fire#' + record.address.fireNumber
                    : record.address?.streetNormalized || '(no address)';

                const detail = {
                    phoneKey: key,
                    recordName: recordName.trim(),
                    recordAddress: recordAddr,
                    isCouple: record.name?.isCouple || false,
                    rawEntityHits: rawHitCount,
                    fullMatches: classified.fullMatches.map(m => ({
                        entityKey: m.entityKey,
                        entityType: m.entity.constructor?.name,
                        bestNameScore: m.bestNameScore,
                        isCollision: m.isCollision,
                        isCoupleCondition2: m.isCoupleCondition2,
                        addressTypes: m.addressHits.map(a => a.matchType)
                    })),
                    nameMatches: classified.nameMatches.map(m => ({
                        entityKey: m.entityKey,
                        entityType: m.entity.constructor?.name,
                        bestNameScore: m.bestNameScore
                    })),
                    addressMatches: classified.addressMatches.map(m => ({
                        entityKey: m.entityKey,
                        entityType: m.entity.constructor?.name,
                        addressTypes: m.addressHits.map(a => a.matchType),
                        hasPoBox: m.poBoxHits.length > 0
                    }))
                };
                results.details.push(detail);
            }
        }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // --- Summary ---
    console.log(`\n=== CLASSIFIED RESULTS (${elapsed}s) ===`);
    console.log(`Total records processed:       ${results.totalRecordsProcessed}`);
    console.log(`Records with raw entity hits:  ${results.rawHitRecords}`);
    console.log(`Records with NO classified match: ${results.recordsNoClassifiedMatch}`);
    console.log('');
    console.log(`Records with FULL match:    ${results.recordsWithFullMatch} (${results.totalFullMatchEntities} entity matches)`);
    console.log(`Records with NAME match:    ${results.recordsWithNameMatch} (${results.totalNameMatchEntities} entity matches)`);
    console.log(`Records with ADDRESS match: ${results.recordsWithAddressMatch} (${results.totalAddressMatchEntities} entity matches)`);
    if (results.coupleCondition2Count > 0) {
        console.log(`Couple Condition 2 matches: ${results.coupleCondition2Count}`);
    }

    // Show first few classified details
    const showCount = Math.min(results.details.length, 15);
    if (showCount > 0) {
        console.log(`\n--- First ${showCount} classified matches ---`);
        for (let i = 0; i < showCount; i++) {
            const d = results.details[i];
            console.log(`\n  ${d.phoneKey}: ${d.recordName} (${d.recordAddress})${d.isCouple ? ' [COUPLE]' : ''} — ${d.rawEntityHits} raw hits`);
            for (const m of d.fullMatches) {
                const parts = ['FULL', 'name=' + m.bestNameScore.toFixed(3)];
                if (m.addressTypes.length > 0) parts.push('addr=' + m.addressTypes.join('+'));
                if (m.isCollision) parts.push('COLLISION');
                if (m.isCoupleCondition2) parts.push('CC2');
                console.log(`    → ${m.entityKey} (${m.entityType}) [${parts.join(', ')}]`);
            }
            for (const m of d.nameMatches) {
                console.log(`    → ${m.entityKey} (${m.entityType}) [NAME, name=${m.bestNameScore.toFixed(3)}]`);
            }
            for (const m of d.addressMatches) {
                const parts = ['ADDRESS'];
                if (m.addressTypes.length > 0) parts.push('addr=' + m.addressTypes.join('+'));
                if (m.hasPoBox) parts.push('poBox');
                console.log(`    → ${m.entityKey} (${m.entityType}) [${parts.join(', ')}]`);
            }
        }
    }

    return results;
}

// -----------------------------------------------------------------------------
// Phone Transfer Helper — Step 1 pre-group entity matching
// -----------------------------------------------------------------------------

/**
 * Transfer a phonebook phone number to a target entity's ContactInfo.
 * - If the entity already has this phone (by normalized 10-digit comparison), replaces
 *   the existing record with a PHONEBOOK_DATABASE-sourced PhoneTerm ('confirmed').
 * - If new and island number with no existing islandPhone, sets as islandPhone ('added-island').
 * - Otherwise adds as additionalPhone ('added-additional').
 *
 * @param {string} phoneNumberStr - The phone number string from the phonebook record
 * @param {Entity} targetEntity - The entity to receive the phone number
 * @returns {{ action: string, phoneTerm: PhoneTerm }} What happened: 'confirmed', 'added-island', or 'added-additional'
 */
function transferPhonebookPhone(phoneNumberStr, targetEntity) {
    var newPhone = new PhoneTerm(phoneNumberStr, 'PHONEBOOK_DATABASE', phoneNumberStr, 'phonebookStep1');
    var newNormalized = newPhone.normalizePhone();
    var newWrapped = new SimpleIdentifiers(newPhone);

    if (!targetEntity.contactInfo) {
        targetEntity.contactInfo = new ContactInfo();
    }
    var ci = targetEntity.contactInfo;

    // Check for duplicate against islandPhone (SimpleIdentifiers wrapping PhoneTerm)
    if (ci.islandPhone && ci.islandPhone.primaryAlias instanceof PhoneTerm) {
        if (ci.islandPhone.primaryAlias.normalizePhone() === newNormalized) {
            ci.islandPhone = newWrapped;
            return { action: 'confirmed', phoneTerm: newPhone };
        }
    }

    // Check for duplicate against additionalPhones (each is SimpleIdentifiers wrapping PhoneTerm)
    for (var i = 0; i < ci.additionalPhones.length; i++) {
        var existing = ci.additionalPhones[i];
        if (existing.primaryAlias instanceof PhoneTerm && existing.primaryAlias.normalizePhone() === newNormalized) {
            ci.additionalPhones[i] = newWrapped;
            return { action: 'confirmed', phoneTerm: newPhone };
        }
    }

    // Check for duplicate against phone (Phone A — SimpleIdentifiers wrapping PhoneTerm)
    if (ci.phone && ci.phone.primaryAlias instanceof PhoneTerm) {
        if (ci.phone.primaryAlias.normalizePhone() === newNormalized) {
            ci.phone = newWrapped;
            return { action: 'confirmed', phoneTerm: newPhone };
        }
    }

    // Not a duplicate — add as new, wrapped in SimpleIdentifiers
    if (newPhone.isIslandNumber() && !ci.islandPhone) {
        ci.setIslandPhone(newWrapped);
        return { action: 'added-island', phoneTerm: newPhone };
    } else {
        ci.addAdditionalPhone(newWrapped);
        return { action: 'added-additional', phoneTerm: newPhone };
    }
}

// -----------------------------------------------------------------------------
// Name Alias Transfer Helper — Step 1 pre-group entity matching
// -----------------------------------------------------------------------------

/**
 * Apply a phonebook name as an alias to a matched entity's IndividualName entry
 * in the IndividualNameDatabase. Reuses existing Phase 4 functions:
 * - extractIndividualNameFromEntity() to find the entity's IndividualName
 * - indNameDb.get()/lookup() to find the database entry
 * - addPhonebookAliasToIndividualName() to add the alias
 *
 * @param {Object} entity - The matched entity from classifyEntityMatchResult()
 * @param {string} entityKey - The entity's key in unifiedEntityDatabase
 * @param {string} phonebookNameStr - Uppercase phonebook name (e.g., "SMITH JOHN")
 * @param {string} phoneNumber - Phone number for provenance attribution
 * @param {IndividualNameDatabase} indNameDb - Loaded IndividualNameDatabase
 * @returns {{ action: string, detail: Object|null }} Result:
 *   'alias-added' — alias was added (detail has category, score, primaryKey)
 *   'alias-existed' — name already present, no change needed
 *   'no-individual-name' — entity has no IndividualName (non-person entity)
 *   'no-db-entry' — IndividualName not found in database (detail has entityNameTerm)
 */
function transferPhonebookNameAlias(entity, entityKey, phonebookNameStr, phoneNumber, indNameDb) {
    // Step 1: Extract IndividualName from entity (handles Individual + AggregateHousehold)
    var resolved = extractIndividualNameFromEntity(entity, entityKey, phonebookNameStr);
    if (!resolved) {
        return { action: 'no-individual-name', detail: null };
    }

    // Step 2: Look up in IndividualNameDatabase (exact match, then similarity)
    var entityNameTerm = resolved.individualName.primaryAlias.term;
    var dbEntry = indNameDb.get(entityNameTerm);
    if (!dbEntry) {
        dbEntry = indNameDb.lookup(entityNameTerm, 0.90);
    }
    if (!dbEntry) {
        return { action: 'no-db-entry', detail: { entityNameTerm: entityNameTerm, entityKey: entityKey } };
    }

    // Step 3: Add alias via existing Phase 4 function
    var result = addPhonebookAliasToIndividualName(dbEntry, phonebookNameStr, phoneNumber);
    if (result) {
        return { action: 'alias-added', detail: result };
    } else {
        return { action: 'alias-existed', detail: null };
    }
}

// -----------------------------------------------------------------------------
// Skip Optimization — Incremental run support
// -----------------------------------------------------------------------------

/**
 * Check whether a phonebook entry should skip re-matching in Step 1.
 * On incremental runs, records with valid existing matchAssociations (entityKey
 * still exists in the current unified DB) can be skipped. Stale associations
 * (entityKey no longer in DB) are cleared so the record gets re-matched.
 *
 * @param {PhonebookEntry} entry - PhonebookDatabase entry to check
 * @param {Object} entities - entity key → entity object map
 * @returns {boolean} true if record should be skipped (has valid association), false if it needs matching
 */
function shouldSkipPhonebookRecord(entry, entities) {
    if (!entry.matchAssociations || entry.matchAssociations.length === 0) {
        return false;
    }

    // Check each association — keep valid ones, clear stale ones
    // Synthetic individual keys (e.g. "visionAppraisal:FireNumber:1510:individual:0")
    // don't exist as top-level entries — resolve to parent key for existence check
    var validAssociations = [];
    var staleCount = 0;
    for (var i = 0; i < entry.matchAssociations.length; i++) {
        var assoc = entry.matchAssociations[i];
        var ek = assoc.entityKey;
        if (!ek) {
            staleCount++;
            continue;
        }
        if (entities[ek]) {
            validAssociations.push(assoc);
        } else if (ek.includes(':individual:')) {
            var parentKey = ek.substring(0, ek.indexOf(':individual:'));
            if (entities[parentKey]) {
                validAssociations.push(assoc);
            } else {
                staleCount++;
            }
        } else {
            staleCount++;
        }
    }

    if (staleCount > 0) {
        entry.matchAssociations = validAssociations;
        console.log('shouldSkipPhonebookRecord: cleared ' + staleCount +
            ' stale association(s) for ' + entry.phoneNumber +
            ', ' + validAssociations.length + ' valid remaining');
    }

    return validAssociations.length > 0;
}

// -----------------------------------------------------------------------------
// Phonebook Entity Key Generation (Phase 5.2)
// -----------------------------------------------------------------------------

/**
 * Build an entity key for a phonebook-sourced entity.
 *
 * Follows Bloomerang's structural pattern:
 *   phonebook:<phoneNumber>:SimpleIdentifiers:<disambiguator>:<headStatus>
 *
 * Key format by scenario:
 *   Single person:               phonebook:<phone>:SimpleIdentifiers:<firstName>:na
 *   Couple both unmatched — AH:  phonebook:<phone>AH:SimpleIdentifiers:<lastName>:na
 *   Couple both unmatched — head: phonebook:<phone>:SimpleIdentifiers:<headFirstName>:head
 *   Couple both unmatched — member: phonebook:<phone>:SimpleIdentifiers:<memberFirstName>:member
 *   Couple one unmatched:        phonebook:<phone>:SimpleIdentifiers:<firstName>:na
 *   No firstName:                phonebook:<phone>:SimpleIdentifiers:na:na
 *
 * @param {Object} config
 * @param {string} config.phoneNumber - Normalized 10-digit phone number
 * @param {string} config.entityType - 'individual' or 'aggregateHousehold'
 * @param {string} [config.firstName] - First name for disambiguator (individuals)
 * @param {string} [config.lastName] - Last name for disambiguator (AH only)
 * @param {string} [config.headStatus] - 'head', 'member', or 'na'
 * @param {Object} [config.existingKeys] - Map/object of existing keys for collision detection
 * @returns {string} Entity key string
 */
function buildPhonebookEntityKey(config) {
    var phoneNumber = config.phoneNumber;
    var entityType = config.entityType;
    var firstName = config.firstName || '';
    var lastName = config.lastName || '';
    var headStatus = config.headStatus || 'na';
    var existingKeys = config.existingKeys || null;

    if (!phoneNumber) {
        throw new Error('buildPhonebookEntityKey: phoneNumber is required');
    }

    // Build the primary identifier (phone number, with AH suffix for households)
    var primaryId;
    if (entityType === 'aggregateHousehold') {
        primaryId = phoneNumber + 'AH';
    } else {
        primaryId = phoneNumber;
    }

    // Build the disambiguator
    var disambiguator;
    if (entityType === 'aggregateHousehold') {
        disambiguator = lastName ? lastName.toUpperCase() : 'na';
    } else {
        disambiguator = firstName ? firstName.toUpperCase() : 'na';
    }

    var key = 'phonebook:' + primaryId + ':SimpleIdentifiers:' + disambiguator + ':' + headStatus;

    // Collision detection
    if (existingKeys) {
        var hasCollision = false;
        if (existingKeys instanceof Map) {
            hasCollision = existingKeys.has(key);
        } else if (typeof existingKeys === 'object') {
            hasCollision = key in existingKeys;
        }
        if (hasCollision) {
            console.error('buildPhonebookEntityKey: KEY COLLISION detected for "' + key + '" — skipping this record');
            throw new Error('Key collision: ' + key);
        }
    }

    return key;
}

// -----------------------------------------------------------------------------
// Phase 5.3a — Fill in groupIndex on Step 1 matchAssociations
// -----------------------------------------------------------------------------

/**
 * Build a reverse lookup map from entity key to group index.
 * Used by fillGroupIndex() for efficient lookups.
 *
 * @param {Object} groupDb - EntityGroupDatabase (with .groups object)
 * @returns {Object} Map of entityKey → groupIndex
 */
function buildEntityKeyToGroupIndexMap(groupDb) {
    var map = {};
    var groups = Object.values(groupDb.groups);
    for (var i = 0; i < groups.length; i++) {
        var group = groups[i];
        for (var j = 0; j < group.memberKeys.length; j++) {
            map[group.memberKeys[j]] = group.index;
        }
    }
    return map;
}

/**
 * Look up the group index for an entity key, handling synthetic individual keys.
 * Synthetic keys (e.g., "visionAppraisal:FireNumber:1510:individual:0") are not
 * stored directly in group memberKeys — the parent key is. This function resolves
 * the parent key and looks it up.
 *
 * @param {string} entityKey - Entity key (possibly synthetic)
 * @param {Object} reverseMap - entityKey → groupIndex from buildEntityKeyToGroupIndexMap()
 * @returns {number|null} Group index, or null if not found
 */
function lookupGroupIndex(entityKey, reverseMap) {
    // Direct lookup first
    if (entityKey in reverseMap) {
        return reverseMap[entityKey];
    }
    // Synthetic individual key resolution
    if (entityKey.includes(':individual:')) {
        var parentKey = entityKey.substring(0, entityKey.indexOf(':individual:'));
        if (parentKey in reverseMap) {
            return reverseMap[parentKey];
        }
    }
    return null;
}

/**
 * Phase 5.3a: Fill in groupIndex on Step 1 matchAssociations.
 *
 * After entity groups are built, each phonebook entry's matchAssociation from Step 1
 * has an entityKey but null groupIndex. This function looks up which group each
 * matched entity belongs to and fills in the groupIndex.
 *
 * @param {PhonebookDatabase} phonebookDb - PhonebookDatabase instance
 * @param {Object} groupDb - EntityGroupDatabase (with .groups object)
 * @returns {Object} Summary stats: { processed, filled, alreadyHadGroup, notFound, errors }
 */
function fillGroupIndex(phonebookDb, groupDb) {
    console.log('=== Phase 5.3a: Fill in groupIndex on Step 1 matchAssociations ===');

    // Build reverse map once
    var reverseMap = buildEntityKeyToGroupIndexMap(groupDb);
    var mapSize = Object.keys(reverseMap).length;
    console.log('Built reverse map: ' + mapSize + ' entity keys → group indices');

    var stats = { processed: 0, filled: 0, alreadyHadGroup: 0, notFound: 0, errors: 0 };
    var notFoundKeys = [];

    for (var ref of phonebookDb) {
        var key = ref[0];
        var entry = ref[1];

        // Only person-classified entries
        if (entry.classification !== 'person') continue;

        // Only entries with matchAssociations
        if (!entry.matchAssociations || entry.matchAssociations.length === 0) continue;

        for (var i = 0; i < entry.matchAssociations.length; i++) {
            var assoc = entry.matchAssociations[i];
            stats.processed++;

            // Skip if no entityKey (shouldn't happen per provenance rule, but defensive)
            if (!assoc.entityKey) {
                console.warn('fillGroupIndex: matchAssociation without entityKey on ' + key);
                stats.errors++;
                continue;
            }

            // Skip if groupIndex already filled
            if (assoc.groupIndex != null) {
                stats.alreadyHadGroup++;
                continue;
            }

            // Look up group index
            var groupIndex = lookupGroupIndex(assoc.entityKey, reverseMap);
            if (groupIndex != null) {
                assoc.groupIndex = groupIndex;
                stats.filled++;
            } else {
                stats.notFound++;
                notFoundKeys.push(assoc.entityKey);
            }
        }
    }

    // Report
    console.log('Results:');
    console.log('  matchAssociations processed: ' + stats.processed);
    console.log('  groupIndex filled: ' + stats.filled);
    console.log('  already had groupIndex: ' + stats.alreadyHadGroup);
    console.log('  entity not found in any group: ' + stats.notFound);
    console.log('  errors (missing entityKey): ' + stats.errors);

    if (notFoundKeys.length > 0) {
        console.warn('Entity keys not found in any group (' + notFoundKeys.length + '):');
        for (var k = 0; k < notFoundKeys.length; k++) {
            console.warn('  ' + notFoundKeys[k]);
        }
    }

    console.log('=== Phase 5.3a complete ===');
    return stats;
}

// =============================================================================
// Phase 5.3b — Create phonebook-sourced entities for unmatched records
// =============================================================================

// -----------------------------------------------------------------------------
// 5.3b Helper: Create a single Individual entity from phonebook data
// -----------------------------------------------------------------------------

/**
 * Create an Individual entity from phonebook name/address/phone data.
 *
 * Follows the same structural pattern as VA Individual creation
 * (visionAppraisalNameParser.js createIndividual()) but simplified:
 * no property record, no household cloning. Phonebook entities use
 * SimpleIdentifiers (not FireNumber) as locationIdentifier, with the
 * phone number as the canonical identifier.
 *
 * @param {Object} nameObj - {firstName, lastName} from phonebook record
 * @param {string} phoneNumber - Normalized 10-digit phone number
 * @param {Object} record - rawRecords[0] from PhonebookEntry (for address data)
 * @param {IndividualNameDatabase} indNameDb - For resolveIndividualName() lookup
 * @returns {Object} { entity: Individual, nameToUse: IndividualName, isNewName: boolean, fullName: string }
 */
function createPhonebookIndividual(nameObj, phoneNumber, record, indNameDb) {
    // --- Build name ---
    var fullName = constructPhonebookNameString(nameObj);
    var individualName = new IndividualName(
        new AttributedTerm(fullName, 'PHONEBOOK_DATABASE', phoneNumber, 'phonebookEntity'),
        '',                         // title
        nameObj.firstName || '',    // firstName
        '',                         // otherNames
        nameObj.lastName || '',     // lastName
        ''                          // suffix
    );

    // Resolve against IndividualNameDatabase (use existing entry if found)
    var nameToUse = resolveIndividualName(fullName, function() { return individualName; });
    var isNewName = (nameToUse === individualName); // true if resolveIndividualName didn't find existing

    // --- Build locationIdentifier (SimpleIdentifiers wrapping phone number) ---
    var locationIdentifier = new SimpleIdentifiers(
        new AttributedTerm(phoneNumber, 'PHONEBOOK_DATABASE', phoneNumber, 'phonebookEntity')
    );

    // --- Create Individual ---
    var entity = new Individual(locationIdentifier, nameToUse, null, null, null);
    entity.source = 'PHONEBOOK_DATABASE';

    // --- Build ContactInfo: phone ---
    // transferPhonebookPhone handles null contactInfo by creating new ContactInfo
    transferPhonebookPhone(phoneNumber, entity);

    // --- Build ContactInfo: address from phonebook data ---
    if (record && record.address) {
        var addr = record.address;
        var hasFireNumber = addr.fireNumber && String(addr.fireNumber).trim();
        var hasStreet = addr.streetNormalized || addr.street;
        var hasBox = addr.box && String(addr.box).trim();

        if (hasFireNumber && hasStreet) {
            // Street address with fire number
            var streetName = addr.streetNormalized || addr.street;
            var streetType = '';
            // Look up canonical street name from StreetNameDatabase
            if (window.streetNameDatabase && typeof window.streetNameDatabase.lookup === 'function') {
                var streetObj = window.streetNameDatabase.lookup(streetName);
                if (streetObj && streetObj.primaryAlias && streetObj.primaryAlias.term) {
                    var canonical = streetObj.primaryAlias.term;
                    var lastSpace = canonical.lastIndexOf(' ');
                    if (lastSpace > 0) {
                        streetName = canonical.substring(0, lastSpace);
                        streetType = canonical.substring(lastSpace + 1);
                    } else {
                        streetName = canonical;
                    }
                }
            }
            var streetAddr = createBlockIslandAddress({
                fireNumber: String(addr.fireNumber),
                streetName: streetName,
                streetType: streetType
            });
            if (!entity.contactInfo) entity.contactInfo = new ContactInfo();
            entity.contactInfo.setPrimaryAddress(streetAddr);
        } else if (hasBox) {
            // PO Box address
            var boxAddr = createBlockIslandAddress({ boxNumber: String(addr.box) });
            if (!entity.contactInfo) entity.contactInfo = new ContactInfo();
            entity.contactInfo.setPrimaryAddress(boxAddr);
        }
        // Case: street name only (no fire number, no PO box) → no address created
    }

    return { entity: entity, nameToUse: nameToUse, isNewName: isNewName, fullName: fullName };
}


// -----------------------------------------------------------------------------
// 5.3b Helper: Create AH + 2 Individuals for couple where both are unmatched
// -----------------------------------------------------------------------------

/**
 * Create an AggregateHousehold with two Individual members for a phonebook
 * couple record where both members are unmatched. Follows the Bloomerang
 * household model: AH entity + head Individual + member Individual.
 *
 * @param {Object} nameObj1 - {firstName, lastName} for person 1 (head)
 * @param {Object} nameObj2 - {firstName, lastName} for person 2 (member)
 * @param {string} phoneNumber - Normalized 10-digit phone number
 * @param {Object} record - rawRecords[0] from PhonebookEntry (for address data)
 * @param {IndividualNameDatabase} indNameDb - For resolveIndividualName() lookup
 * @param {Object} existingKeys - entities map for collision detection
 * @returns {Object} { household, individual1, individual2, keys: {ahKey, headKey, memberKey},
 *                     nameResults: [{fullName, nameToUse, isNewName}, ...] }
 */
function createPhonebookHousehold(nameObj1, nameObj2, phoneNumber, record, indNameDb, existingKeys) {
    // --- Create 2 Individual entities ---
    var head = createPhonebookIndividual(nameObj1, phoneNumber, record, indNameDb);
    var member = createPhonebookIndividual(nameObj2, phoneNumber, record, indNameDb);

    // --- Generate entity keys ---
    var lastName = nameObj1.lastName || nameObj2.lastName || '';
    var ahKey = buildPhonebookEntityKey({
        phoneNumber: phoneNumber,
        entityType: 'aggregateHousehold',
        lastName: lastName,
        headStatus: 'na',
        existingKeys: existingKeys
    });
    var headKey = buildPhonebookEntityKey({
        phoneNumber: phoneNumber,
        entityType: 'individual',
        firstName: nameObj1.firstName || '',
        headStatus: 'head',
        existingKeys: existingKeys
    });
    var memberKey = buildPhonebookEntityKey({
        phoneNumber: phoneNumber,
        entityType: 'individual',
        firstName: nameObj2.firstName || '',
        headStatus: 'member',
        existingKeys: existingKeys
    });

    // --- Build household name string: "LASTNAME, FIRSTNAME & SECONDNAME" ---
    var firstName1 = (nameObj1.firstName || '').toUpperCase();
    var firstName2 = (nameObj2.firstName || '').toUpperCase();
    var lastNameUpper = (lastName).toUpperCase();
    var fullHouseholdNameStr = lastNameUpper + ', ' + firstName1 + ' & ' + firstName2;

    // --- Create HouseholdName ---
    var householdName = new HouseholdName(
        new AttributedTerm(fullHouseholdNameStr, 'PHONEBOOK_DATABASE', phoneNumber, 'phonebookEntity'),
        fullHouseholdNameStr
    );
    // Add member IndividualNames to HouseholdName.memberNames
    householdName.addMember(head.nameToUse);
    householdName.addMember(member.nameToUse);

    // --- Create AH locationIdentifier (phone + AH suffix) ---
    var ahLocId = new SimpleIdentifiers(
        new AttributedTerm(phoneNumber + 'AH', 'PHONEBOOK_DATABASE', phoneNumber, 'phonebookEntity')
    );

    // --- Create AggregateHousehold ---
    var household = new AggregateHousehold(ahLocId, householdName, null, null, null);
    household.source = 'PHONEBOOK_DATABASE';

    // --- Set HouseholdInformation on each Individual ---
    var headInfo = HouseholdInformation.fromVisionAppraisalData(
        phoneNumber, fullHouseholdNameStr, true  // isHead = true
    );
    headInfo.parentKey = ahKey;
    if (!head.entity.otherInfo) head.entity.otherInfo = new OtherInfo();
    head.entity.otherInfo.householdInformation = headInfo;

    var memberInfo = HouseholdInformation.fromVisionAppraisalData(
        phoneNumber, fullHouseholdNameStr, false  // isHead = false
    );
    memberInfo.parentKey = ahKey;
    if (!member.entity.otherInfo) member.entity.otherInfo = new OtherInfo();
    member.entity.otherInfo.householdInformation = memberInfo;

    // --- Push individuals into household ---
    household.individuals.push(head.entity);
    household.individuals.push(member.entity);

    // --- Build ContactInfo on AH (same phone + address) ---
    transferPhonebookPhone(phoneNumber, household);
    // Clone address from head individual to household (if present)
    if (head.entity.contactInfo && head.entity.contactInfo.primaryAddress) {
        if (!household.contactInfo) household.contactInfo = new ContactInfo();
        var addrJson = serializeWithTypes(head.entity.contactInfo.primaryAddress);
        household.contactInfo.setPrimaryAddress(deserializeWithTypes(addrJson));
    }

    return {
        household: household,
        individual1: head.entity,
        individual2: member.entity,
        keys: { ahKey: ahKey, headKey: headKey, memberKey: memberKey },
        nameResults: [
            { fullName: head.fullName, nameToUse: head.nameToUse, isNewName: head.isNewName },
            { fullName: member.fullName, nameToUse: member.nameToUse, isNewName: member.isNewName }
        ]
    };
}


// -----------------------------------------------------------------------------
// 5.3b Helper: Identify unmatched couple member (Category 3)
// -----------------------------------------------------------------------------

/**
 * For a couple record with partial match, determine which couple member
 * is NOT consumed by existing matchAssociations.
 *
 * Reads the consumedMembers field written by phonebookStep1() on each
 * matchAssociation. A member with bestScore > 0 is considered consumed
 * (they had qualifying name hits on the matched entity at match time).
 *
 * Pre-existing associations (from original pipeline, no consumedMembers)
 * are treated conservatively as having both members consumed — we can't
 * determine which member matched, and the group-level match validated both.
 *
 * @param {PhonebookEntry} entry - PhonebookEntry with matchAssociations
 * @param {Object} entities - entity key → entity object map
 * @returns {Object|null} { unmatchedName: {firstName, lastName}, matchedEntityKey: string }
 *     or null if both members appear consumed or determination fails
 */
function identifyUnmatchedCoupleMember(entry, entities) {
    var record = entry.rawRecords[0];
    if (!record || !record.name || !record.name.isCouple) return null;

    var firstName1 = record.name.firstName || '';
    var lastName = record.name.lastName || '';
    var firstName2 = record.name.secondName || '';

    if (!firstName1 || !firstName2) return null; // Need both names to determine

    // Find person-entity matchAssociations (full or name matches to person entities)
    var NON_PERSON_TYPES = { 'Business': 1, 'LegalConstruct': 1, 'NonHumanName': 1, 'CompositeHousehold': 1 };
    var personMatches = [];

    for (var i = 0; i < (entry.matchAssociations || []).length; i++) {
        var assoc = entry.matchAssociations[i];
        if (!assoc.entityKey) continue;
        if (assoc.matchType === 'address-only') continue; // Address-only doesn't consume a name
        if (assoc.matchType === 'phonebook-created') continue; // Our own creations

        // Resolve entity (handle synthetic individual keys)
        var ek = assoc.entityKey;
        var entity = entities[ek];
        if (!entity && ek.indexOf(':individual:') >= 0) {
            var parentKey = ek.substring(0, ek.indexOf(':individual:'));
            entity = entities[parentKey];
        }
        if (!entity) continue;

        // Skip non-person entities
        var entityType = entity.constructor ? entity.constructor.name : '';
        if (NON_PERSON_TYPES[entityType]) continue;

        personMatches.push({ assoc: assoc, entity: entity });
    }

    if (personMatches.length === 0) return null; // No person matches to examine

    // Aggregate consumed status across all person matches using consumedMembers data
    var member1Consumed = false;
    var member2Consumed = false;
    var matchedEntityKey = null;
    var sawWithConsumed = false;
    var sawWithoutConsumed = false;

    for (var j = 0; j < personMatches.length; j++) {
        var pm = personMatches[j];

        if (pm.assoc.consumedMembers) {
            sawWithConsumed = true;
            // Step 1 association with per-member tracking
            for (var k = 0; k < pm.assoc.consumedMembers.length; k++) {
                var cm = pm.assoc.consumedMembers[k];
                if (cm.bestScore > 0 && cm.firstName === firstName1) {
                    member1Consumed = true;
                    if (!matchedEntityKey) matchedEntityKey = pm.assoc.entityKey;
                }
                if (cm.bestScore > 0 && cm.firstName === firstName2) {
                    member2Consumed = true;
                    if (!matchedEntityKey) matchedEntityKey = pm.assoc.entityKey;
                }
            }
        } else {
            sawWithoutConsumed = true;
            // Pre-existing association (from original pipeline). The couple was already
            // matched — both members are accounted for. No entity creation needed.
            member1Consumed = true;
            member2Consumed = true;
            matchedEntityKey = pm.assoc.entityKey;
        }
    }

    // Case 4: Mix of Step 1 and pre-existing associations — should never happen
    // (shouldSkipPhonebookRecord either skips entirely or doesn't)
    if (sawWithConsumed && sawWithoutConsumed) {
        console.error('identifyUnmatchedCoupleMember ERROR: Mix of associations with and without ' +
            'consumedMembers for phone ' + entry.phoneNumber +
            '. This means shouldSkipPhonebookRecord() allowed Step 1 to run on an entry that ' +
            'already had pre-existing associations. Associations: ' +
            JSON.stringify(personMatches.map(function(pm) { return pm.assoc; })));
        return null;
    }

    if (member1Consumed && member2Consumed) return null; // Both consumed — no entity needed
    if (!member1Consumed && !member2Consumed) {
        // Impossible state: person-entity full/name match exists with consumedMembers,
        // but neither member scored > 0. This means the classification data is inconsistent.
        var hasConsumedData = personMatches.some(function(pm) { return !!pm.assoc.consumedMembers; });
        if (hasConsumedData) {
            console.error('identifyUnmatchedCoupleMember ERROR: Neither member consumed despite ' +
                personMatches.length + ' person match(es) with consumedMembers for phone ' +
                entry.phoneNumber + '. firstName1=' + firstName1 + ', firstName2=' + firstName2 +
                '. Associations: ' + JSON.stringify(personMatches.map(function(pm) { return pm.assoc; })));
        }
        return null;
    }

    // Exactly one member consumed — the other needs an entity
    if (member1Consumed && !member2Consumed) {
        return {
            unmatchedName: { firstName: firstName2, lastName: lastName },
            matchedEntityKey: matchedEntityKey
        };
    } else {
        return {
            unmatchedName: { firstName: firstName1, lastName: lastName },
            matchedEntityKey: matchedEntityKey
        };
    }
}


// -----------------------------------------------------------------------------
// 5.3b Orchestrator: Create phonebook-sourced entities for unmatched records
// -----------------------------------------------------------------------------

/**
 * Phase 5.3b: Create phonebook-sourced entities for records that need them.
 *
 * Three categories of records get entities:
 * 1. Completely unmatched: no matchAssociations after Step 1
 * 2. Address-only to non-person entity: address match to Business/LegalConstruct/etc.
 * 3. Couple with partial match: one member consumed, other needs entity
 *
 * Created entities are registered in entities map and matchAssociations
 * are written on the PhonebookDatabase entries. Entities are NOT yet placed
 * in groups — that happens in 5.3c-couple and 5.3c.
 *
 * @param {PhonebookDatabase} phonebookDb - Loaded PhonebookDatabase (with Step 1 associations)
 * @param {Object} entities - entity key → entity object map
 * @param {IndividualNameDatabase} indNameDb - Loaded IndividualNameDatabase
 * @returns {Object} { createdKeys: string[], stats: Object }
 */
function createPhonebookEntities(phonebookDb, entities, indNameDb) {
    console.log('\n=== Phase 5.3b: Create Phonebook-Sourced Entities ===');
    var startTime = Date.now();

    // Validation
    if (!phonebookDb) { console.error('createPhonebookEntities: PhonebookDatabase not provided'); return null; }
    if (!entities) { console.error('createPhonebookEntities: entities not provided'); return null; }
    if (!indNameDb) { console.error('createPhonebookEntities: IndividualNameDatabase not provided'); return null; }

    var NON_PERSON_TYPES = { 'Business': 1, 'LegalConstruct': 1, 'NonHumanName': 1, 'CompositeHousehold': 1 };

    var stats = {
        personEntries: 0,
        // Category counts
        cat1_unmatched: 0,
        cat1_unmatchedCouples: 0,
        cat2_addressNonPerson: 0,
        cat2_addressNonPersonCouples: 0,
        cat3_partialCouple: 0,
        // Creation counts
        individualsCreated: 0,
        householdsCreated: 0,
        // IndividualNameDatabase
        newIndNameEntries: 0,
        aliasesAdded: 0,
        // Registration
        entitiesRegistered: 0,
        matchAssociationsWritten: 0,
        // Issues
        keyCollisions: 0,
        errors: []
    };

    var createdKeys = []; // All entity keys created (for subsequent phases)

    for (var ref of phonebookDb) {
        var phoneKey = ref[0];
        var entry = ref[1];

        // Skip non-person entries
        if (entry.classification !== 'person') continue;
        stats.personEntries++;

        var rawRecords = entry.rawRecords || [];
        if (rawRecords.length === 0) continue;
        var record = rawRecords[0];

        var isCouple = record.name && record.name.isCouple;

        try {
            // --- Categorize this entry ---

            var hasAssociations = entry.matchAssociations && entry.matchAssociations.length > 0;

            // Category 1: Completely unmatched (no matchAssociations)
            if (!hasAssociations) {
                stats.cat1_unmatched++;

                if (isCouple) {
                    // Both unmatched → AH + 2 Individuals
                    stats.cat1_unmatchedCouples++;
                    var nameObj1 = { firstName: (record.name.firstName || '').toUpperCase(), lastName: (record.name.lastName || '').toUpperCase() };
                    var nameObj2 = { firstName: (record.name.secondName || '').toUpperCase(), lastName: (record.name.lastName || '').toUpperCase() };

                    var hhResult = createPhonebookHousehold(nameObj1, nameObj2, phoneKey, record, indNameDb, entities);

                    // Register all 3 entities
                    entities[hhResult.keys.ahKey] = hhResult.household;
                    entities[hhResult.keys.headKey] = hhResult.individual1;
                    entities[hhResult.keys.memberKey] = hhResult.individual2;
                    createdKeys.push(hhResult.keys.ahKey, hhResult.keys.headKey, hhResult.keys.memberKey);
                    stats.householdsCreated++;
                    stats.individualsCreated += 2;
                    stats.entitiesRegistered += 3;

                    // Write matchAssociations for all 3
                    entry.addMatchAssociation({ entityKey: hhResult.keys.ahKey, matchType: 'phonebook-created', matchSource: 'step3-entity-creation' });
                    entry.addMatchAssociation({ entityKey: hhResult.keys.headKey, matchType: 'phonebook-created', matchSource: 'step3-entity-creation' });
                    entry.addMatchAssociation({ entityKey: hhResult.keys.memberKey, matchType: 'phonebook-created', matchSource: 'step3-entity-creation' });
                    stats.matchAssociationsWritten += 3;

                    // Register names in IndividualNameDatabase
                    for (var nr = 0; nr < hhResult.nameResults.length; nr++) {
                        var nameRes = hhResult.nameResults[nr];
                        _registerPhonebookName(nameRes, phoneKey, indNameDb, stats);
                    }

                } else {
                    // Single individual → 1 Individual
                    var nameObj = { firstName: (record.name.firstName || '').toUpperCase(), lastName: (record.name.lastName || '').toUpperCase() };
                    var indResult = createPhonebookIndividual(nameObj, phoneKey, record, indNameDb);

                    var entityKey = buildPhonebookEntityKey({
                        phoneNumber: phoneKey,
                        entityType: 'individual',
                        firstName: nameObj.firstName,
                        headStatus: 'na',
                        existingKeys: entities
                    });

                    entities[entityKey] = indResult.entity;
                    createdKeys.push(entityKey);
                    stats.individualsCreated++;
                    stats.entitiesRegistered++;

                    entry.addMatchAssociation({ entityKey: entityKey, matchType: 'phonebook-created', matchSource: 'step3-entity-creation' });
                    stats.matchAssociationsWritten++;

                    _registerPhonebookName(indResult, phoneKey, indNameDb, stats);
                }
                continue;
            }

            // Category 2: Address-only to non-person entity
            // All matchAssociations are address-type AND all matched entities are non-person
            var allAddressToNonPerson = true;
            for (var ai = 0; ai < entry.matchAssociations.length; ai++) {
                var assoc = entry.matchAssociations[ai];
                if (assoc.matchType === 'phonebook-created') {
                    allAddressToNonPerson = false;
                    break;
                }
                if (assoc.matchType !== 'address-only') {
                    allAddressToNonPerson = false;
                    break;
                }
                // Check if matched entity is non-person
                var matchedEntity = entities[assoc.entityKey];
                if (!matchedEntity) {
                    allAddressToNonPerson = false;
                    break;
                }
                var matchedType = matchedEntity.constructor ? matchedEntity.constructor.name : '';
                if (!NON_PERSON_TYPES[matchedType]) {
                    allAddressToNonPerson = false;
                    break;
                }
            }

            if (allAddressToNonPerson) {
                stats.cat2_addressNonPerson++;

                if (isCouple) {
                    stats.cat2_addressNonPersonCouples++;
                    var nameObj1b = { firstName: (record.name.firstName || '').toUpperCase(), lastName: (record.name.lastName || '').toUpperCase() };
                    var nameObj2b = { firstName: (record.name.secondName || '').toUpperCase(), lastName: (record.name.lastName || '').toUpperCase() };

                    var hhResult2 = createPhonebookHousehold(nameObj1b, nameObj2b, phoneKey, record, indNameDb, entities);

                    entities[hhResult2.keys.ahKey] = hhResult2.household;
                    entities[hhResult2.keys.headKey] = hhResult2.individual1;
                    entities[hhResult2.keys.memberKey] = hhResult2.individual2;
                    createdKeys.push(hhResult2.keys.ahKey, hhResult2.keys.headKey, hhResult2.keys.memberKey);
                    stats.householdsCreated++;
                    stats.individualsCreated += 2;
                    stats.entitiesRegistered += 3;

                    entry.addMatchAssociation({ entityKey: hhResult2.keys.ahKey, matchType: 'phonebook-created', matchSource: 'step3-entity-creation' });
                    entry.addMatchAssociation({ entityKey: hhResult2.keys.headKey, matchType: 'phonebook-created', matchSource: 'step3-entity-creation' });
                    entry.addMatchAssociation({ entityKey: hhResult2.keys.memberKey, matchType: 'phonebook-created', matchSource: 'step3-entity-creation' });
                    stats.matchAssociationsWritten += 3;

                    for (var nr2 = 0; nr2 < hhResult2.nameResults.length; nr2++) {
                        _registerPhonebookName(hhResult2.nameResults[nr2], phoneKey, indNameDb, stats);
                    }
                } else {
                    var nameObjC2 = { firstName: (record.name.firstName || '').toUpperCase(), lastName: (record.name.lastName || '').toUpperCase() };
                    var indResult2 = createPhonebookIndividual(nameObjC2, phoneKey, record, indNameDb);

                    var entityKey2 = buildPhonebookEntityKey({
                        phoneNumber: phoneKey,
                        entityType: 'individual',
                        firstName: nameObjC2.firstName,
                        headStatus: 'na',
                        existingKeys: entities
                    });

                    entities[entityKey2] = indResult2.entity;
                    createdKeys.push(entityKey2);
                    stats.individualsCreated++;
                    stats.entitiesRegistered++;

                    entry.addMatchAssociation({ entityKey: entityKey2, matchType: 'phonebook-created', matchSource: 'step3-entity-creation' });
                    stats.matchAssociationsWritten++;

                    _registerPhonebookName(indResult2, phoneKey, indNameDb, stats);
                }
                continue;
            }

            // Category 3: Couple with partial match
            if (isCouple) {
                var unmatchedInfo = identifyUnmatchedCoupleMember(entry, entities);
                if (unmatchedInfo) {
                    stats.cat3_partialCouple++;

                    var nameObjC3 = {
                        firstName: (unmatchedInfo.unmatchedName.firstName || '').toUpperCase(),
                        lastName: (unmatchedInfo.unmatchedName.lastName || '').toUpperCase()
                    };
                    var indResult3 = createPhonebookIndividual(nameObjC3, phoneKey, record, indNameDb);

                    var entityKey3 = buildPhonebookEntityKey({
                        phoneNumber: phoneKey,
                        entityType: 'individual',
                        firstName: nameObjC3.firstName,
                        headStatus: 'na',
                        existingKeys: entities
                    });

                    entities[entityKey3] = indResult3.entity;
                    createdKeys.push(entityKey3);
                    stats.individualsCreated++;
                    stats.entitiesRegistered++;

                    // Write matchAssociation — include matchedEntityKey for 5.3c-couple forced placement
                    entry.addMatchAssociation({
                        entityKey: entityKey3,
                        matchType: 'phonebook-created',
                        matchSource: 'step3-entity-creation',
                        coupleMatchedEntityKey: unmatchedInfo.matchedEntityKey
                    });
                    stats.matchAssociationsWritten++;

                    _registerPhonebookName(indResult3, phoneKey, indNameDb, stats);
                }
            }

        } catch (err) {
            if (err.message && err.message.indexOf('Key collision') >= 0) {
                stats.keyCollisions++;
                console.warn('5.3b: Key collision for phone ' + phoneKey + ': ' + err.message);
            } else {
                stats.errors.push({ phoneKey: phoneKey, error: err.message, stack: err.stack });
                console.error('5.3b ERROR for ' + phoneKey + ': ' + err.message);
            }
        }
    }

    // --- Rebuild IndividualNameDatabase variation cache if entries were added ---
    if (stats.newIndNameEntries > 0 || stats.aliasesAdded > 0) {
        indNameDb._buildVariationCache();
        console.log('IndividualNameDatabase variation cache rebuilt.');
    }

    // --- Report ---
    var elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n=== Phase 5.3b RESULTS (' + elapsed + 's) ===');
    console.log('Person entries scanned: ' + stats.personEntries);
    console.log('');
    console.log('Category 1 (completely unmatched): ' + stats.cat1_unmatched +
        ' (' + stats.cat1_unmatchedCouples + ' couples)');
    console.log('Category 2 (address-only to non-person): ' + stats.cat2_addressNonPerson +
        ' (' + stats.cat2_addressNonPersonCouples + ' couples)');
    console.log('Category 3 (partial couple match): ' + stats.cat3_partialCouple);
    console.log('');
    console.log('Individuals created: ' + stats.individualsCreated);
    console.log('Households created: ' + stats.householdsCreated);
    console.log('Entities registered in DB: ' + stats.entitiesRegistered);
    console.log('Match associations written: ' + stats.matchAssociationsWritten);
    console.log('');
    console.log('New IndividualName DB entries: ' + stats.newIndNameEntries);
    console.log('Aliases added to existing entries: ' + stats.aliasesAdded);
    console.log('');
    console.log('Key collisions (skipped): ' + stats.keyCollisions);
    console.log('Errors: ' + stats.errors.length);
    if (stats.errors.length > 0) {
        for (var e = 0; e < stats.errors.length; e++) {
            console.error('  ' + stats.errors[e].phoneKey + ': ' + stats.errors[e].error);
        }
    }

    console.log('\nTotal created entity keys: ' + createdKeys.length);
    console.log('=== Phase 5.3b complete ===');

    return { createdKeys: createdKeys, stats: stats };
}


/**
 * Internal helper: Register a phonebook-created name in IndividualNameDatabase.
 * Same pattern as Phase 4.5 processIndividualDiscovery() lines 1452-1474.
 *
 * @param {Object} nameResult - { fullName, nameToUse, isNewName } from createPhonebookIndividual
 * @param {string} phoneKey - Phone number for provenance
 * @param {IndividualNameDatabase} indNameDb
 * @param {Object} stats - Stats object to update
 * @private
 */
function _registerPhonebookName(nameResult, phoneKey, indNameDb, stats) {
    if (!nameResult.isNewName) return; // Name already existed in database

    var normalizedKey = nameResult.fullName.trim().toUpperCase();
    if (indNameDb.entries.has(normalizedKey)) return; // Already registered

    if (nameResult.nameToUse && nameResult.nameToUse instanceof IndividualName) {
        indNameDb.entries.set(normalizedKey, {
            object: nameResult.nameToUse,
            fileId: null,
            created: new Date().toISOString(),
            lastModified: new Date().toISOString()
        });
        stats.newIndNameEntries++;
    }
}


// -----------------------------------------------------------------------------
// 5.3c-couple: Couple-aware forced group placement
// -----------------------------------------------------------------------------

/**
 * Phase 5.3c-couple: Place newly-created couple member entities into the same
 * entity group as their matched sibling.
 *
 * When Phase 5.3b creates an Individual for an unmatched couple member (Category 3),
 * it records coupleMatchedEntityKey on the matchAssociation — the entity key of
 * the sibling that DID match in Step 1. This function uses that key to find the
 * sibling's group and place the new entity there.
 *
 * This is a deterministic placement (we know exactly where the entity belongs),
 * so it runs BEFORE general similarity matching (5.3c).
 *
 * @param {PhonebookDatabase} phonebookDb - Loaded PhonebookDatabase (with 5.3b matchAssociations)
 * @param {Object} groupDb - EntityGroupDatabase (with .groups object)
 * @param {Object} entities - entity key → entity object map
 * @returns {Object} Stats summary
 */
function placeCouplePhonebookEntities(phonebookDb, groupDb, entities) {
    console.log('\n=== Phase 5.3c-couple: Forced Group Placement for Couple Members ===');
    var startTime = Date.now();

    if (!phonebookDb) { console.error('placeCouplePhonebookEntities: PhonebookDatabase not provided'); return null; }
    if (!groupDb || !groupDb.groups) { console.error('placeCouplePhonebookEntities: EntityGroupDatabase not provided'); return null; }
    if (!entities) { console.error('placeCouplePhonebookEntities: entities not provided'); return null; }

    var reverseMap = buildEntityKeyToGroupIndexMap(groupDb);

    var stats = {
        entriesScanned: 0,
        coupleAssociationsFound: 0,
        placements: 0,
        alreadyAssigned: 0,
        groupNotFound: 0,
        errors: []
    };

    var modifiedGroupIndices = {};

    for (var ref of phonebookDb) {
        var entry = ref[1];
        if (entry.classification !== 'person') continue;
        stats.entriesScanned++;

        var associations = entry.matchAssociations || [];
        for (var i = 0; i < associations.length; i++) {
            var assoc = associations[i];
            if (!assoc.coupleMatchedEntityKey) continue;
            stats.coupleAssociationsFound++;

            // Look up which group the matched sibling is in
            var groupIndex = lookupGroupIndex(assoc.coupleMatchedEntityKey, reverseMap);
            if (groupIndex == null) {
                stats.groupNotFound++;
                console.error('5.3c-couple: Could not find group for matched sibling ' +
                    assoc.coupleMatchedEntityKey + ' (phone ' + entry.phoneNumber + ')');
                continue;
            }

            // Place the newly-created entity in that group
            var added = groupDb.addMemberToGroup(groupIndex, assoc.entityKey);
            if (!added) {
                stats.alreadyAssigned++;
                console.warn('5.3c-couple: Entity ' + assoc.entityKey +
                    ' already assigned to a group (phone ' + entry.phoneNumber + ')');
                continue;
            }

            // Update matchAssociation with group placement
            assoc.groupIndex = groupIndex;
            stats.placements++;
            modifiedGroupIndices[groupIndex] = true;

            console.log('5.3c-couple: Placed ' + assoc.entityKey +
                ' into group ' + groupIndex +
                ' (sibling: ' + assoc.coupleMatchedEntityKey + ')');
        }
    }

    // Rebuild collections on modified groups so they pick up the new member's data
    var modifiedCount = Object.keys(modifiedGroupIndices).length;
    for (var gIdx in modifiedGroupIndices) {
        var group = groupDb.groups[gIdx];
        if (group) {
            group.buildMemberCollections(entities);
        }
    }

    var elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n=== Phase 5.3c-couple RESULTS (' + elapsed + 's) ===');
    console.log('Person entries scanned: ' + stats.entriesScanned);
    console.log('Couple associations found: ' + stats.coupleAssociationsFound);
    console.log('Placements: ' + stats.placements);
    console.log('Groups modified: ' + modifiedCount);
    if (stats.alreadyAssigned > 0) console.log('Already assigned (skipped): ' + stats.alreadyAssigned);
    if (stats.groupNotFound > 0) console.log('Group not found (ERROR): ' + stats.groupNotFound);
    if (stats.errors.length > 0) {
        console.log('Errors: ' + stats.errors.length);
        for (var e = 0; e < stats.errors.length; e++) {
            console.error('  ' + stats.errors[e]);
        }
    }
    console.log('=== Phase 5.3c-couple complete ===');

    return stats;
}


// -----------------------------------------------------------------------------
// 5.3c / 5.3d / 5.3e: Group matching, single-entity groups, name aliases
// -----------------------------------------------------------------------------

/**
 * Compare one phonebook entity against all entities in all existing groups.
 * Returns the best trueMatch, or null if no match found.
 *
 * @param {string} entityKey - Key of the phonebook entity
 * @param {Object} entity - The phonebook entity object
 * @param {Object} groupDb - EntityGroupDatabase
 * @param {Object} entities - entity key → entity object map
 * @returns {Object|null} { groupIndex, matchedEntityKey, matchedEntity, scores } or null
 * @private
 */
function _findGroupMatchForEntity(entityKey, entity, groupDb, entities) {
    var bestMatch = null;
    var bestScore = 0;

    var groups = groupDb.groups;
    for (var gIdx in groups) {
        var group = groups[gIdx];
        var memberKeys = group.memberKeys;

        for (var mi = 0; mi < memberKeys.length; mi++) {
            var memberKey = memberKeys[mi];
            if (memberKey === entityKey) continue;

            var memberEntity = entities[memberKey];
            if (!memberEntity) continue;

            var comparison = universalCompareTo(entity, memberEntity);
            var overallScore = comparison.score || 0;
            var nameScore = 0;
            var contactInfoScore = 0;

            if (comparison.details && comparison.details.components) {
                if (comparison.details.components.name) {
                    nameScore = comparison.details.components.name.similarity || 0;
                }
                if (comparison.details.components.contactInfo) {
                    contactInfoScore = comparison.details.components.contactInfo.similarity || 0;
                }
            }

            if (isTrueMatch(overallScore, nameScore, contactInfoScore)) {
                if (overallScore > bestScore) {
                    bestScore = overallScore;
                    bestMatch = {
                        groupIndex: parseInt(gIdx),
                        matchedEntityKey: memberKey,
                        matchedEntity: memberEntity,
                        scores: { overall: overallScore, name: nameScore, contactInfo: contactInfoScore }
                    };
                }
            }
        }
    }

    return bestMatch;
}


/**
 * Phase 5.3c + 5.3d + 5.3e: Match phonebook entities to existing groups,
 * create single-entity groups for unmatched, apply name aliases for matches.
 *
 * Processes AH entities before individuals (household stays together).
 * Uses universalCompareTo() + isTrueMatch() — same as entityGroupBuilder.
 *
 * @param {PhonebookDatabase} phonebookDb - Loaded PhonebookDatabase (with 5.3b matchAssociations)
 * @param {Object} groupDb - EntityGroupDatabase
 * @param {Object} entities - entity key → entity object map
 * @param {Object} indNameDb - IndividualNameDatabase
 * @returns {Object} Stats summary
 */
function matchPhonebookEntitiesToGroups(phonebookDb, groupDb, entities, indNameDb) {
    console.log('\n=== Phase 5.3c/d/e: Group Matching for Phonebook Entities ===');
    var startTime = Date.now();

    if (!phonebookDb) { console.error('matchPhonebookEntitiesToGroups: PhonebookDatabase not provided'); return null; }
    if (!groupDb || !groupDb.groups) { console.error('matchPhonebookEntitiesToGroups: EntityGroupDatabase not provided'); return null; }
    if (!entities) { console.error('matchPhonebookEntitiesToGroups: entities not provided'); return null; }
    if (!indNameDb) { console.error('matchPhonebookEntitiesToGroups: IndividualNameDatabase not provided'); return null; }
    var stats = {
        // Collection
        coupleGroupsFound: 0,
        singlesFound: 0,
        // 5.3c matching
        ahMatched: 0,
        ahUnmatched: 0,
        individualsMatched: 0,
        individualsUnmatched: 0,
        entitiesPlacedInExistingGroups: 0,
        // 5.3d groups for unmatched
        householdGroupsCreated: 0,
        singleEntityGroupsCreated: 0,
        // 5.3e name aliases
        nameAliasesAdded: 0,
        nameAliasesExisted: 0,
        // Phone transfers
        phoneTransfers: 0,
        // Groups
        existingGroupsModified: 0,
        // Issues
        errors: []
    };

    var modifiedGroupIndices = {};

    // =========================================================================
    // STEP 1: Collect unplaced phonebook entities
    // =========================================================================

    var coupleGroups = []; // { ahAssoc, headAssoc, memberAssoc, phoneKey, entry, record }
    var singles = [];      // { assoc, phoneKey, entry, record }

    for (var ref of phonebookDb) {
        var phoneKey = ref[0];
        var entry = ref[1];
        if (entry.classification !== 'person') continue;

        var associations = entry.matchAssociations || [];
        var unplaced = [];
        for (var i = 0; i < associations.length; i++) {
            var assoc = associations[i];
            if (assoc.matchType === 'phonebook-created' && assoc.groupIndex == null) {
                unplaced.push(assoc);
            }
        }
        if (unplaced.length === 0) continue;

        var record = (entry.rawRecords || [])[0];
        var isCouple = record && record.name && record.name.isCouple;

        if (isCouple && unplaced.length === 3) {
            // Couple Cat1: identify AH + head + member
            var ahAssoc = null, headAssoc = null, memberAssoc = null;
            for (var j = 0; j < unplaced.length; j++) {
                var ek = unplaced[j].entityKey || '';
                if (ek.indexOf('AH:') >= 0) ahAssoc = unplaced[j];
                else if (ek.indexOf(':head') >= 0) headAssoc = unplaced[j];
                else if (ek.indexOf(':member') >= 0) memberAssoc = unplaced[j];
            }
            if (ahAssoc && headAssoc && memberAssoc) {
                coupleGroups.push({ ahAssoc: ahAssoc, headAssoc: headAssoc, memberAssoc: memberAssoc, phoneKey: phoneKey, entry: entry, record: record });
                stats.coupleGroupsFound++;
            } else {
                // Can't identify triple — treat as singles
                for (var k = 0; k < unplaced.length; k++) {
                    singles.push({ assoc: unplaced[k], phoneKey: phoneKey, entry: entry, record: record });
                }
                stats.singlesFound += unplaced.length;
            }
        } else {
            for (var k2 = 0; k2 < unplaced.length; k2++) {
                singles.push({ assoc: unplaced[k2], phoneKey: phoneKey, entry: entry, record: record });
            }
            stats.singlesFound += unplaced.length;
        }
    }

    console.log('Collected: ' + coupleGroups.length + ' couple groups (3 entities each), ' + stats.singlesFound + ' singles');

    // =========================================================================
    // STEP 2: Match AH entities first (couple households stay together)
    // =========================================================================

    for (var ci = 0; ci < coupleGroups.length; ci++) {
        var cg = coupleGroups[ci];
        var ahEntity = entities[cg.ahAssoc.entityKey];
        if (!ahEntity) {
            stats.errors.push('AH entity not found: ' + cg.ahAssoc.entityKey);
            continue;
        }

        var match = _findGroupMatchForEntity(cg.ahAssoc.entityKey, ahEntity, groupDb, entities);

        if (match) {
            stats.ahMatched++;
            // Place AH + head + member in matched group
            var allThree = [cg.ahAssoc, cg.headAssoc, cg.memberAssoc];
            for (var ti = 0; ti < allThree.length; ti++) {
                var added = groupDb.addMemberToGroup(match.groupIndex, allThree[ti].entityKey);
                if (added) {
                    allThree[ti].groupIndex = match.groupIndex;
                    stats.entitiesPlacedInExistingGroups++;
                }
            }
            modifiedGroupIndices[match.groupIndex] = true;

            // Transfer phone to matched entity
            var phoneResult = transferPhonebookPhone(cg.phoneKey, match.matchedEntity);
            if (phoneResult.action !== 'no-change') stats.phoneTransfers++;

            // Apply name alias (5.3e) on matched entity
            var phonebookNameStr = constructPhonebookNameString({
                firstName: cg.record.name ? cg.record.name.firstName || '' : '',
                lastName: cg.record.name ? cg.record.name.lastName || '' : ''
            });
            if (phonebookNameStr) {
                var aliasResult = transferPhonebookNameAlias(match.matchedEntity, match.matchedEntityKey, phonebookNameStr, cg.phoneKey, indNameDb);
                if (aliasResult.action === 'alias-added') stats.nameAliasesAdded++;
                else if (aliasResult.action === 'alias-existed') stats.nameAliasesExisted++;
            }
        } else {
            stats.ahUnmatched++;
            // AH didn't match any existing group — create a new household group
            // keeping all 3 entities together (phonebook says they're a couple)
            var ahGroup = groupDb.createGroup(cg.ahAssoc.entityKey, 6); // phase 6 = phonebook
            if (ahGroup) {
                cg.ahAssoc.groupIndex = ahGroup.index;
                groupDb.addMemberToGroup(ahGroup.index, cg.headAssoc.entityKey);
                cg.headAssoc.groupIndex = ahGroup.index;
                groupDb.addMemberToGroup(ahGroup.index, cg.memberAssoc.entityKey);
                cg.memberAssoc.groupIndex = ahGroup.index;
                ahGroup.buildMemberCollections(entities);
                stats.householdGroupsCreated++;
            } else {
                stats.errors.push('Failed to create household group for AH: ' + cg.ahAssoc.entityKey);
            }
        }
    }

    console.log('AH matching: ' + stats.ahMatched + ' matched, ' + stats.ahUnmatched + ' unmatched');

    // =========================================================================
    // STEP 3: Match individual entities
    // =========================================================================

    var unmatched = []; // For 5.3d

    for (var si = 0; si < singles.length; si++) {
        var s = singles[si];
        if (s.assoc.groupIndex != null) continue; // Already placed (e.g., by AH match above)

        var sEntity = entities[s.assoc.entityKey];
        if (!sEntity) {
            stats.errors.push('Entity not found: ' + s.assoc.entityKey);
            continue;
        }

        var sMatch = _findGroupMatchForEntity(s.assoc.entityKey, sEntity, groupDb, entities);

        if (sMatch) {
            stats.individualsMatched++;
            var sAdded = groupDb.addMemberToGroup(sMatch.groupIndex, s.assoc.entityKey);
            if (sAdded) {
                s.assoc.groupIndex = sMatch.groupIndex;
                stats.entitiesPlacedInExistingGroups++;
                modifiedGroupIndices[sMatch.groupIndex] = true;
            }

            // Transfer phone
            var sPhoneResult = transferPhonebookPhone(s.phoneKey, sMatch.matchedEntity);
            if (sPhoneResult.action !== 'no-change') stats.phoneTransfers++;

            // Apply name alias (5.3e)
            var sNameStr = constructPhonebookNameString({
                firstName: s.record && s.record.name ? s.record.name.firstName || '' : '',
                lastName: s.record && s.record.name ? s.record.name.lastName || '' : ''
            });
            if (sNameStr) {
                var sAliasResult = transferPhonebookNameAlias(sMatch.matchedEntity, sMatch.matchedEntityKey, sNameStr, s.phoneKey, indNameDb);
                if (sAliasResult.action === 'alias-added') stats.nameAliasesAdded++;
                else if (sAliasResult.action === 'alias-existed') stats.nameAliasesExisted++;
            }
        } else {
            stats.individualsUnmatched++;
            unmatched.push(s);
        }
    }

    console.log('Individual matching: ' + stats.individualsMatched + ' matched, ' + stats.individualsUnmatched + ' unmatched');

    // =========================================================================
    // STEP 4: Create single-entity groups for unmatched (5.3d)
    // =========================================================================

    for (var ui = 0; ui < unmatched.length; ui++) {
        var u = unmatched[ui];
        var newGroup = groupDb.createGroup(u.assoc.entityKey, 6); // phase 6 = phonebook
        if (newGroup) {
            u.assoc.groupIndex = newGroup.index;
            newGroup.buildMemberCollections(entities);
            stats.singleEntityGroupsCreated++;
        } else {
            stats.errors.push('Failed to create group for: ' + u.assoc.entityKey);
        }
    }

    // =========================================================================
    // STEP 5: Rebuild collections on modified existing groups
    // =========================================================================

    var modifiedCount = Object.keys(modifiedGroupIndices).length;
    for (var mIdx in modifiedGroupIndices) {
        var mGroup = groupDb.groups[mIdx];
        if (mGroup) {
            mGroup.buildMemberCollections(entities);
        }
    }

    stats.existingGroupsModified = modifiedCount;

    // =========================================================================
    // REPORT
    // =========================================================================

    var elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n=== Phase 5.3c/d/e RESULTS (' + elapsed + 's) ===');
    console.log('Couple groups found: ' + stats.coupleGroupsFound);
    console.log('Singles found: ' + stats.singlesFound);
    console.log('');
    console.log('5.3c — AH matched: ' + stats.ahMatched + ', AH unmatched: ' + stats.ahUnmatched);
    console.log('5.3c — Individuals matched: ' + stats.individualsMatched + ', unmatched: ' + stats.individualsUnmatched);
    console.log('5.3c — Total placed in existing groups: ' + stats.entitiesPlacedInExistingGroups);
    console.log('');
    console.log('5.3d — Household groups created (unmatched couples): ' + stats.householdGroupsCreated);
    console.log('5.3d — Single-entity groups created: ' + stats.singleEntityGroupsCreated);
    console.log('5.3e — Name aliases added: ' + stats.nameAliasesAdded + ', existed: ' + stats.nameAliasesExisted);
    console.log('Phone transfers: ' + stats.phoneTransfers);
    console.log('');
    console.log('Existing groups modified: ' + stats.existingGroupsModified);
    if (stats.errors.length > 0) {
        console.log('ERRORS: ' + stats.errors.length);
        for (var e = 0; e < stats.errors.length; e++) {
            console.error('  ' + stats.errors[e]);
        }
    }
    console.log('=== Phase 5.3c/d/e complete ===');

    return stats;
}


// -----------------------------------------------------------------------------
// Helper: Compute per-member name hit scores for couple records
// -----------------------------------------------------------------------------

/**
 * Compute which couple members produced qualifying name hits on a matched entity.
 * Returns per-member best scores from the nameHits array.
 *
 * Used by phonebookStep1() to record per-member match status in matchAssociations,
 * so Phase 5.3b can determine which couple member(s) were consumed vs. unmatched
 * without re-comparing names against entities.
 *
 * @param {Array} nameHits - Name hits from classified match (each has .phonebookName.firstName)
 * @param {Object} record - Phonebook rawRecord (with .name.firstName, .name.secondName)
 * @returns {Array<{firstName: string, bestScore: number}>} Always 2 entries for couple records
 */
function _computeConsumedMembers(nameHits, record) {
    var firstName1 = record.name.firstName || '';
    var firstName2 = record.name.secondName || '';
    var best1 = 0;
    var best2 = 0;

    for (var i = 0; i < (nameHits || []).length; i++) {
        var hit = nameHits[i];
        if (hit.phonebookName.firstName === firstName1) {
            if (hit.score > best1) best1 = hit.score;
        } else if (hit.phonebookName.firstName === firstName2) {
            if (hit.score > best2) best2 = hit.score;
        }
    }

    return [
        { firstName: firstName1, bestScore: best1 },
        { firstName: firstName2, bestScore: best2 }
    ];
}


// -----------------------------------------------------------------------------
// phonebookStep1() — Pre-group phonebook entity matching orchestrator
// -----------------------------------------------------------------------------

/**
 * Step 1 of phonebook integration: match phonebook records against individual entities
 * in the unified entity database BEFORE entity groups are created.
 *
 * For each person-classified phonebook record:
 * - Skip if already has a valid matchAssociation (incremental optimization)
 * - Run entity-level matching + classification
 * - Write matchAssociations (entityKey populated, groupIndex null)
 * - Transfer phone/contact info to matched entities
 * - Apply name aliases to matched entities' IndividualName database entries
 * - NO entity creation (deferred to Step 3)
 *
 * @param {PhonebookDatabase} phonebookDb - Loaded PhonebookDatabase
 * @param {Object} entities - entity key → entity object map
 * @param {IndividualNameDatabase} indNameDb - Loaded IndividualNameDatabase
 * @returns {Object} Stats summary
 */
function phonebookStep1(phonebookDb, entities, indNameDb) {
    console.log('\n=== PHONEBOOK STEP 1: Pre-Group Entity Matching ===');
    var startTime = Date.now();

    // Validation
    if (!phonebookDb) { console.error('phonebookStep1: PhonebookDatabase not provided'); return null; }
    if (!entities) { console.error('phonebookStep1: entities not provided'); return null; }
    if (!indNameDb) { console.error('phonebookStep1: IndividualNameDatabase not provided'); return null; }

    var stats = {
        personEntries: 0,
        skippedValid: 0,
        skippedNoRawRecords: 0,
        processed: 0,
        // Match classification counts
        fullMatches: 0,
        nameMatches: 0,
        addressMatches: 0,
        noClassifiedMatch: 0,
        // Action counts
        matchAssociationsWritten: 0,
        phoneTransfers: { confirmed: 0, addedIsland: 0, addedAdditional: 0 },
        nameAliases: { added: 0, existed: 0, noIndividualName: 0, noDbEntry: 0 },
        errors: []
    };

    for (var _ref of phonebookDb) {
        var phoneKey = _ref[0];
        var entry = _ref[1];

        // Skip non-person entries
        if (entry.classification !== 'person') continue;
        stats.personEntries++;

        // Skip optimization: valid existing matchAssociation
        if (shouldSkipPhonebookRecord(entry, entities)) {
            stats.skippedValid++;
            continue;
        }

        // Get the primary raw record
        var rawRecords = entry.rawRecords || [];
        if (rawRecords.length === 0) {
            stats.skippedNoRawRecords++;
            continue;
        }
        var record = rawRecords[0];
        var isCouple = record.name && record.name.isCouple && record.name.secondName;
        stats.processed++;

        try {
            // --- Match and classify ---
            var matchResult = matchPhonebookRecordToEntities(record, entities);
            var classified = classifyEntityMatchResult(matchResult);

            var hasFull = classified.fullMatches.length > 0;
            var hasName = classified.nameMatches.length > 0;
            var hasAddr = classified.addressMatches.length > 0;

            if (!hasFull && !hasName && !hasAddr) {
                stats.noClassifiedMatch++;
                continue;
            }

            // --- Construct phonebook name string for alias transfer ---
            var phonebookNameStr = constructPhonebookNameString({
                firstName: record.name ? record.name.firstName || '' : '',
                lastName: record.name ? record.name.lastName || '' : ''
            });

            // --- Process FULL matches ---
            for (var f = 0; f < classified.fullMatches.length; f++) {
                var fm = classified.fullMatches[f];
                stats.fullMatches++;

                // Write matchAssociation (with per-member tracking for couples)
                var fullAssocData = {
                    entityKey: fm.entityKey,
                    matchType: 'full',
                    matchSource: 'step1-entity-matcher',
                    bestNameScore: fm.bestNameScore,
                    isCollision: fm.isCollision,
                    isCoupleCondition2: fm.isCoupleCondition2 || false
                };
                if (isCouple && fm.nameHits) {
                    fullAssocData.consumedMembers = _computeConsumedMembers(fm.nameHits, record);
                }
                entry.addMatchAssociation(fullAssocData);
                stats.matchAssociationsWritten++;

                // Transfer phone
                var phoneResult = transferPhonebookPhone(phoneKey, fm.entity);
                if (phoneResult.action === 'confirmed') stats.phoneTransfers.confirmed++;
                else if (phoneResult.action === 'added-island') stats.phoneTransfers.addedIsland++;
                else if (phoneResult.action === 'added-additional') stats.phoneTransfers.addedAdditional++;

                // Transfer name alias
                if (phonebookNameStr) {
                    var aliasResult = transferPhonebookNameAlias(fm.entity, fm.entityKey, phonebookNameStr, phoneKey, indNameDb);
                    if (aliasResult.action === 'alias-added') stats.nameAliases.added++;
                    else if (aliasResult.action === 'alias-existed') stats.nameAliases.existed++;
                    else if (aliasResult.action === 'no-individual-name') stats.nameAliases.noIndividualName++;
                    else if (aliasResult.action === 'no-db-entry') stats.nameAliases.noDbEntry++;
                }
            }

            // --- Process NAME matches ---
            for (var n = 0; n < classified.nameMatches.length; n++) {
                var nm = classified.nameMatches[n];
                stats.nameMatches++;

                // Write matchAssociation (weaker evidence, no phone transfer)
                var nameAssocData = {
                    entityKey: nm.entityKey,
                    matchType: 'name-only',
                    matchSource: 'step1-entity-matcher',
                    bestNameScore: nm.bestNameScore,
                    isCollision: false,
                    isCoupleCondition2: false
                };
                if (isCouple && nm.nameHits) {
                    nameAssocData.consumedMembers = _computeConsumedMembers(nm.nameHits, record);
                }
                entry.addMatchAssociation(nameAssocData);
                stats.matchAssociationsWritten++;

                // Name alias for name matches too
                if (phonebookNameStr) {
                    var aliasResult2 = transferPhonebookNameAlias(nm.entity, nm.entityKey, phonebookNameStr, phoneKey, indNameDb);
                    if (aliasResult2.action === 'alias-added') stats.nameAliases.added++;
                    else if (aliasResult2.action === 'alias-existed') stats.nameAliases.existed++;
                    else if (aliasResult2.action === 'no-individual-name') stats.nameAliases.noIndividualName++;
                    else if (aliasResult2.action === 'no-db-entry') stats.nameAliases.noDbEntry++;
                }
            }

            // --- Process ADDRESS matches ---
            for (var a = 0; a < classified.addressMatches.length; a++) {
                var am = classified.addressMatches[a];
                stats.addressMatches++;

                // Write matchAssociation
                entry.addMatchAssociation({
                    entityKey: am.entityKey,
                    matchType: 'address-only',
                    matchSource: 'step1-entity-matcher',
                    bestNameScore: am.bestNameScore || 0,
                    isCollision: am.isCollision || false,
                    isCoupleCondition2: false
                });
                stats.matchAssociationsWritten++;

                // Transfer phone (address match means same location)
                var phoneResult2 = transferPhonebookPhone(phoneKey, am.entity);
                if (phoneResult2.action === 'confirmed') stats.phoneTransfers.confirmed++;
                else if (phoneResult2.action === 'added-island') stats.phoneTransfers.addedIsland++;
                else if (phoneResult2.action === 'added-additional') stats.phoneTransfers.addedAdditional++;

                // No name alias for address-only (name didn't match well enough)
            }

        } catch (err) {
            stats.errors.push({ phoneKey: phoneKey, error: err.message, stack: err.stack });
        }
    }

    // --- Report ---
    var elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n=== STEP 1 RESULTS (' + elapsed + 's) ===');
    console.log('Person entries: ' + stats.personEntries);
    console.log('Skipped (valid existing match): ' + stats.skippedValid);
    console.log('Skipped (no raw records): ' + stats.skippedNoRawRecords);
    console.log('Processed: ' + stats.processed);
    console.log('');
    console.log('Full matches: ' + stats.fullMatches);
    console.log('Name matches: ' + stats.nameMatches);
    console.log('Address matches: ' + stats.addressMatches);
    console.log('No classified match: ' + stats.noClassifiedMatch);
    console.log('Match associations written: ' + stats.matchAssociationsWritten);
    console.log('');
    console.log('Phone transfers — confirmed: ' + stats.phoneTransfers.confirmed +
        ', added island: ' + stats.phoneTransfers.addedIsland +
        ', added additional: ' + stats.phoneTransfers.addedAdditional);
    console.log('Name aliases — added: ' + stats.nameAliases.added +
        ', existed: ' + stats.nameAliases.existed +
        ', no IndividualName: ' + stats.nameAliases.noIndividualName +
        ', no DB entry: ' + stats.nameAliases.noDbEntry);
    if (stats.errors.length > 0) {
        console.log('ERRORS: ' + stats.errors.length);
        for (var e = 0; e < Math.min(stats.errors.length, 5); e++) {
            console.log('  ' + stats.errors[e].phoneKey + ': ' + stats.errors[e].error);
        }
    }

    return stats;
}

console.log('PhonebookEntityMatcher (entity-level matching helpers) loaded.');
