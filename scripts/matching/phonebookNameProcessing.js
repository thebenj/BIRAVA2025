/**
 * PhonebookNameProcessing - Phase 4 name variation processing
 *
 * Takes matched phonebook entries and registers their name forms as aliases
 * on corresponding IndividualName entries (persons) or NonHumanName objects
 * (nonhumans) in their respective databases.
 *
 * Dependencies:
 * - IndividualName, NonHumanName, AttributedTerm from aliasClasses.js
 * - IndividualNameDatabase (window.individualNameDatabase)
 * - getIndividualNameHomonymThreshold() from aliasClasses.js
 * - saveIndividualNameDatabaseBulk() from IndividualNameDatabase infrastructure
 * - entityGroupBrowser.loadedDatabase
 * - window.unifiedEntityDatabase
 *
 * Split from phonebookMatcher.js Session 126
 * @see reference_phonebookDatabasePlan.md Phase 4
 */

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
 * Extract a single numeric similarity score from a compareTo() result.
 * IndividualName.compareTo() returns {primary, homonym, synonym, candidate} when
 * given a string; this extracts the primary score as a single number.
 *
 * @param {number|Object} compareResult - Result from compareTo()
 * @returns {number} Numeric similarity score 0-1
 */
function extractNumericScore(compareResult) {
    if (typeof compareResult === 'number') return compareResult;
    if (typeof compareResult === 'object' && compareResult !== null) {
        return compareResult.primary || 0;
    }
    return 0;
}

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
                isCouple: !!(record.name.isCouple),
                entityType: record.name.entityType || null
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

    // If direct lookup fails, check for :individual:N synthetic key pattern
    // (used by IndividualNameDatabase builder for individuals within VA AggregateHouseholds)
    if (!entity) {
        var indivMatch = assoc.entityKey.match(/:individual:(\d+)$/);
        if (indivMatch) {
            var parentKey = assoc.entityKey.substring(0, assoc.entityKey.lastIndexOf(':individual:'));
            var indivIndex = parseInt(indivMatch[1], 10);
            var parentEntity = entityDb[parentKey];

            if (parentEntity && parentEntity.individuals && Array.isArray(parentEntity.individuals)) {
                var targetIndiv = parentEntity.individuals[indivIndex];
                if (targetIndiv && targetIndiv.name && targetIndiv.name instanceof IndividualName) {
                    return {
                        entityKey: assoc.entityKey,
                        entity: parentEntity,
                        individualName: targetIndiv.name,
                        score: extractNumericScore(targetIndiv.name.compareTo(phonebookNameStr))
                    };
                }
            }

            console.warn('resolveEntityForAssociation: synthetic key "' + assoc.entityKey +
                '" — parent "' + parentKey + '" ' +
                (!parentEntity ? 'not found' : 'has no individual at index ' + indivIndex) +
                ' (group #' + assoc.groupIndex + ').');
            return null;
        }

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
            score: extractNumericScore(entity.name.compareTo(phonebookNameStr))
        };
    }

    // AggregateHousehold: check individuals[] array, return best match
    if (entity.individuals && Array.isArray(entity.individuals)) {
        var bestIndiv = null;
        var bestScore = -1;
        for (var i = 0; i < entity.individuals.length; i++) {
            var indiv = entity.individuals[i];
            if (indiv.name && indiv.name instanceof IndividualName) {
                var score = extractNumericScore(indiv.name.compareTo(phonebookNameStr));
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
    var score = extractNumericScore(indNameDbEntry.compareTo(nameString));

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
// 4.1a-2: Core Name-to-Association Processing (shared by 4.1 and 4.4)
// -----------------------------------------------------------------------------

/**
 * Process a single name string against all match associations for a phonebook entry.
 * Core inner loop extracted for reuse by both individual (4.1) and couple (4.4)
 * name processing.
 *
 * @param {string} phonebookNameStr - Uppercase name string to process
 * @param {string} phoneKey - Phone number key for provenance
 * @param {PhonebookEntry} entry - PhonebookEntry with matchAssociations
 * @param {Object} groupDb - Entity group database (with .groups object)
 * @param {Object} entityDb - unifiedEntityDatabase.entities
 * @param {IndividualNameDatabase} indNameDb - Loaded IndividualNameDatabase
 * @param {Object} stats - Mutable stats object: {aliasesAdded, alreadyExisted, noEntityResolution, noIndividualNameEntry[], modifiedPrimaryKeys Set, errors[]}
 */
function processOneNameAgainstAssociations(phonebookNameStr, phoneKey, entry, groupDb, entityDb, indNameDb, stats) {
    for (var a = 0; a < entry.matchAssociations.length; a++) {
        var assoc = entry.matchAssociations[a];

        try {
            var resolved = resolveEntityForAssociation(assoc, phonebookNameStr, groupDb, entityDb);
            if (!resolved) {
                stats.noEntityResolution++;
                continue;
            }

            var entityNameTerm = resolved.individualName.primaryAlias.term;
            var dbIndividualName = indNameDb.get(entityNameTerm);

            if (!dbIndividualName) {
                dbIndividualName = indNameDb.lookup(entityNameTerm, 0.90);
            }

            if (!dbIndividualName) {
                stats.noIndividualNameEntry.push({
                    phonebookName: phonebookNameStr,
                    phoneNumber: phoneKey,
                    groupIndex: assoc.groupIndex,
                    entityKey: resolved.entityKey,
                    entityNameTerm: entityNameTerm
                });
                continue;
            }

            var result = addPhonebookAliasToIndividualName(dbIndividualName, phonebookNameStr, phoneKey);
            if (result) {
                stats.aliasesAdded++;
                stats.modifiedPrimaryKeys.add(result.primaryKey);
            } else {
                stats.alreadyExisted++;
            }
        } catch (err) {
            stats.errors.push({ phone: phoneKey, name: phonebookNameStr, error: err.message });
        }
    }
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
 * @returns {{aliasesAdded: number, alreadyExisted: number, noIndividualNameEntry: Array, noEntityResolution: number, couplesProcessed: number, coupleNamesProcessed: number, individualsProcessed: number, modifiedPrimaryKeys: Set, errors: Array}}
 */
function processPersonNameVariations(phonebookDb, groupDb, entityDb, indNameDb) {
    console.log('\n=== PHASE 4.1/4.4: Person Name Variation Processing ===');

    var stats = {
        aliasesAdded: 0,
        alreadyExisted: 0,
        noEntityResolution: 0,
        noIndividualNameEntry: [],
        modifiedPrimaryKeys: new Set(),
        errors: []
    };
    var individualsProcessed = 0;
    var couplesProcessed = 0;
    var coupleNamesProcessed = 0;
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

            if (nameObj.isCouple) {
                // Phase 4.4: Split couple into two individual names
                couplesProcessed++;

                // Person 1: firstName + lastName
                var name1Str = constructPhonebookNameString({
                    firstName: nameObj.firstName,
                    lastName: nameObj.lastName
                });
                if (name1Str) {
                    coupleNamesProcessed++;
                    processOneNameAgainstAssociations(name1Str, phoneKey, entry, groupDb, entityDb, indNameDb, stats);
                }

                // Person 2: secondName + lastName
                if (nameObj.secondName) {
                    var name2Str = constructPhonebookNameString({
                        firstName: nameObj.secondName,
                        lastName: nameObj.lastName
                    });
                    if (name2Str) {
                        coupleNamesProcessed++;
                        processOneNameAgainstAssociations(name2Str, phoneKey, entry, groupDb, entityDb, indNameDb, stats);
                    }
                }
            } else {
                // Phase 4.1: Individual name
                var phonebookNameStr = constructPhonebookNameString(nameObj);
                if (!phonebookNameStr) continue;

                individualsProcessed++;
                processOneNameAgainstAssociations(phonebookNameStr, phoneKey, entry, groupDb, entityDb, indNameDb, stats);
            }
        }
    }

    console.log('Entries processed: ' + entriesProcessed);
    console.log('Individual names processed: ' + individualsProcessed);
    console.log('Couples processed: ' + couplesProcessed + ' (' + coupleNamesProcessed + ' individual names)');
    console.log('Aliases added: ' + stats.aliasesAdded);
    console.log('Already existed (skipped): ' + stats.alreadyExisted);
    console.log('No entity resolution: ' + stats.noEntityResolution);
    console.log('No IndividualName DB entry: ' + stats.noIndividualNameEntry.length);
    console.log('Modified IndividualName entries: ' + stats.modifiedPrimaryKeys.size);
    if (stats.errors.length > 0) {
        console.log('Errors: ' + stats.errors.length);
    }

    return {
        aliasesAdded: stats.aliasesAdded,
        alreadyExisted: stats.alreadyExisted,
        noEntityResolution: stats.noEntityResolution,
        couplesProcessed: couplesProcessed,
        coupleNamesProcessed: coupleNamesProcessed,
        individualsProcessed: individualsProcessed,
        noIndividualNameEntry: stats.noIndividualNameEntry,
        modifiedPrimaryKeys: stats.modifiedPrimaryKeys,
        errors: stats.errors
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
    console.log('Couples processed: ' + personResults.couplesProcessed + ' (' + personResults.coupleNamesProcessed + ' names)');
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

    // Pre-save verification: log stats so user can confirm before save commits to disk
    console.log('Pre-save verification:');
    console.log('  Total entries: ' + indNameDb.entries.size);
    console.log('  Modified keys count: ' + modifiedPrimaryKeys.size);
    indNameDb.printStats();

    // Save entire database as bulk file (auto-backs up existing bulk first)
    await saveIndividualNameDatabaseBulk(indNameDb);

    console.log('Bulk save complete. Individual files can be updated later via fileOutIndividualNames().');
}


// =============================================================================
// PHASE 4.5: INDIVIDUAL DISCOVERY IN EMPTY AGGREGATEHOUSEHOLDS
// =============================================================================
//
// For 39 VA AggregateHouseholds with empty individuals[] arrays, use phonebook
// data to identify household members and instantiate Individual objects —
// consistent with how the VA name parser originally creates individuals.
//
// Reference: reference_phase4_5_individualDiscoveryPlan.md
// =============================================================================


// -----------------------------------------------------------------------------
// 4.5a: Name Collection
// -----------------------------------------------------------------------------

/**
 * Collect all person names from phonebook entries pointing to one household.
 * Splits couples into individual name components. Tracks which phone numbers
 * contributed each name.
 *
 * @param {Array<{phoneKey: string, entry: PhonebookEntry}>} entryRefs - All phonebook entries for this household
 * @returns {Array<{firstName: string, lastName: string, phoneNumbers: string[]}>}
 */
function collectNamesForHousehold(entryRefs) {
    var nameMap = {}; // key: "FIRSTNAME|LASTNAME" → {firstName, lastName, phoneNumbers[]}

    for (var e = 0; e < entryRefs.length; e++) {
        var phoneKey = entryRefs[e].phoneKey;
        var entry = entryRefs[e].entry;

        var distinctNames = getDistinctPersonNames(entry);

        for (var n = 0; n < distinctNames.length; n++) {
            var nameObj = distinctNames[n];

            // Erroneous name tagging: when the phonebook parser produced an
            // AggregateHousehold (e.g., suffix like "III" inflated word count)
            // with no parseable firstName, tag it with a synthetic ERRONEOUS
            // firstName so it flows through normal individual creation and is
            // discoverable by database management tools.
            if (nameObj.entityType === 'AggregateHousehold' && !nameObj.firstName && nameObj.lastName) {
                var vowels = 'AEIOU';
                var consonants = 'BCDFGHJKLMNPQRSTVWXYZ';
                var suffix = '';
                for (var v = 0; v < 3; v++) {
                    suffix += vowels.charAt(Math.floor(Math.random() * vowels.length));
                }
                for (var c = 0; c < 4; c++) {
                    suffix += consonants.charAt(Math.floor(Math.random() * consonants.length));
                }
                nameObj.firstName = 'ERRONEOUS' + suffix;
                nameObj.isCouple = false;
                console.warn('Phase 4.5: Erroneous name tag applied — phonebook name "' +
                    nameObj.lastName + '" parsed as AggregateHousehold with no firstName. ' +
                    'Tagged as: ' + nameObj.firstName + ' ' + nameObj.lastName);
            }

            if (nameObj.isCouple) {
                // Split couple into two individual names
                // Person 1: firstName + lastName
                if (nameObj.firstName && nameObj.lastName) {
                    var key1 = (nameObj.firstName + '|' + nameObj.lastName).toUpperCase();
                    if (!nameMap[key1]) {
                        nameMap[key1] = {
                            firstName: nameObj.firstName.toUpperCase(),
                            lastName: nameObj.lastName.toUpperCase(),
                            phoneNumbers: []
                        };
                    }
                    if (nameMap[key1].phoneNumbers.indexOf(phoneKey) === -1) {
                        nameMap[key1].phoneNumbers.push(phoneKey);
                    }
                }

                // Person 2: secondName + lastName
                if (nameObj.secondName && nameObj.lastName) {
                    var key2 = (nameObj.secondName + '|' + nameObj.lastName).toUpperCase();
                    if (!nameMap[key2]) {
                        nameMap[key2] = {
                            firstName: nameObj.secondName.toUpperCase(),
                            lastName: nameObj.lastName.toUpperCase(),
                            phoneNumbers: []
                        };
                    }
                    if (nameMap[key2].phoneNumbers.indexOf(phoneKey) === -1) {
                        nameMap[key2].phoneNumbers.push(phoneKey);
                    }
                }
            } else {
                // Single individual
                if (nameObj.firstName && nameObj.lastName) {
                    var key = (nameObj.firstName + '|' + nameObj.lastName).toUpperCase();
                    if (!nameMap[key]) {
                        nameMap[key] = {
                            firstName: nameObj.firstName.toUpperCase(),
                            lastName: nameObj.lastName.toUpperCase(),
                            phoneNumbers: []
                        };
                    }
                    if (nameMap[key].phoneNumbers.indexOf(phoneKey) === -1) {
                        nameMap[key].phoneNumbers.push(phoneKey);
                    }
                }
            }
        }
    }

    return Object.values(nameMap);
}


// -----------------------------------------------------------------------------
// 4.5b: Name Reconciliation
// -----------------------------------------------------------------------------

/**
 * Reconcile a list of phonebook-derived names into distinct individuals.
 * Uses the same comparison standard as EntityGroup._tryMatchToExistingName():
 *   - IndividualName.compareTo() four-score, take Math.max()
 *   - Homonym threshold (>= getIndividualNameHomonymThreshold, 0.875): same person, homonym alias
 *   - Synonym threshold (>= getIndividualNameSynonymThreshold, 0.845): same person, candidate alias
 *     (promoted per Alias Promotion Rule — same household = corroborating evidence)
 *   - Below synonym: distinct individual
 *
 * Builds anchor set incrementally: first name becomes anchor, subsequent names
 * compare against all existing anchors, consolidating or creating new.
 *
 * @param {Array<{firstName: string, lastName: string, phoneNumbers: string[]}>} nameObjects
 *     From collectNamesForHousehold()
 * @returns {Array<{primaryName: {firstName, lastName}, aliasForms: Array<{firstName, lastName, category}>, phoneNumbers: string[]}>}
 *     Each element = one distinct individual to create
 */
function reconcileNames(nameObjects) {
    if (!nameObjects || nameObjects.length === 0) return [];

    var homonymThreshold = window.getIndividualNameHomonymThreshold();
    var synonymThreshold = window.getIndividualNameSynonymThreshold();

    // Build temporary IndividualName objects for comparison
    var withTempNames = [];
    for (var i = 0; i < nameObjects.length; i++) {
        var obj = nameObjects[i];
        var fullName = constructPhonebookNameString(obj);
        var tempName = new IndividualName(
            new AttributedTerm(fullName, 'PHONEBOOK_DATABASE', '', 'individualDiscovery'),
            '', obj.firstName, '', obj.lastName, ''
        );
        withTempNames.push({
            nameObj: obj,
            fullName: fullName,
            tempIndividualName: tempName,
            phoneNumbers: obj.phoneNumbers.slice() // copy
        });
    }

    // Anchor set: each anchor = one distinct individual
    var anchors = [];

    for (var n = 0; n < withTempNames.length; n++) {
        var current = withTempNames[n];

        // Compare against all existing anchors, find best match
        var bestAnchor = null;
        var bestScore = 0;

        for (var a = 0; a < anchors.length; a++) {
            var scores = current.tempIndividualName.compareTo(anchors[a].tempIndividualName);
            var maxScore = Math.max(scores.primary, scores.homonym, scores.synonym, scores.candidate);

            if (maxScore > bestScore) {
                bestScore = maxScore;
                bestAnchor = anchors[a];
            }
        }

        if (bestAnchor && bestScore >= synonymThreshold) {
            // Consolidate: same person
            var category = bestScore >= homonymThreshold ? 'homonyms' : 'candidates';
            bestAnchor.aliasForms.push({
                firstName: current.nameObj.firstName,
                lastName: current.nameObj.lastName,
                fullName: current.fullName,
                category: category,
                score: bestScore
            });

            // Merge phone numbers
            for (var p = 0; p < current.phoneNumbers.length; p++) {
                if (bestAnchor.phoneNumbers.indexOf(current.phoneNumbers[p]) === -1) {
                    bestAnchor.phoneNumbers.push(current.phoneNumbers[p]);
                }
            }
        } else {
            // Distinct individual — new anchor
            anchors.push({
                primaryName: { firstName: current.nameObj.firstName, lastName: current.nameObj.lastName },
                fullName: current.fullName,
                tempIndividualName: current.tempIndividualName,
                aliasForms: [],
                phoneNumbers: current.phoneNumbers.slice()
            });
        }
    }

    return anchors;
}


// -----------------------------------------------------------------------------
// 4.5c: Individual Creation
// -----------------------------------------------------------------------------

/**
 * Create one Individual entity for an empty AggregateHousehold, consistent
 * with how VisionAppraisalNameParser.createIndividual() + createAggregateHousehold()
 * produce individuals in the original VA pipeline.
 *
 * Consistency checklist (see reference_phase4_5_individualDiscoveryPlan.md Section 1):
 *   - locationIdentifier: SAME as household
 *   - name: IndividualName (resolved via IndividualNameDatabase)
 *   - contactInfo: deep copy of household's (via serialize/deserialize)
 *   - pid, fireNumber, mblu, googleFileId, source: SAME as household
 *   - otherInfo: assessment/appraisal values from household + HouseholdInformation
 *   - comparisonWeights: set by Individual constructor (name: 0.5)
 *
 * @param {Object} anchor - From reconcileNames(): {primaryName, fullName, aliasForms[], phoneNumbers[]}
 * @param {AggregateHousehold} household - The parent AggregateHousehold entity
 * @param {number} idx - Index of this individual within the household (0 = head)
 * @param {string[]} allPhoneNumbers - ALL phone numbers from all phonebook entries for this household
 * @returns {Individual} The created Individual entity
 */
function createIndividualForHousehold(anchor, household, idx, allPhoneNumbers) {
    // --- Step 1: Create IndividualName ---
    var individualName = new IndividualName(
        new AttributedTerm(anchor.fullName, 'PHONEBOOK_DATABASE', anchor.phoneNumbers[0] || '', 'individualDiscovery'),
        '',                         // title
        anchor.primaryName.firstName,  // firstName
        '',                         // otherNames (phonebook doesn't provide middle names)
        anchor.primaryName.lastName,   // lastName
        ''                          // suffix
    );

    // --- Step 2: Resolve against IndividualNameDatabase ---
    var nameToUse = resolveIndividualName(anchor.fullName, function() { return individualName; });

    // --- Step 3: Create Individual entity ---
    // Pass null for address parameters — we clone ContactInfo from household instead
    var individual = new Individual(
        household.locationIdentifier,  // SAME fire number / PID
        nameToUse,                     // IndividualName
        null,                          // propertyLocation (cloned below)
        null,                          // ownerAddress (cloned below)
        null                           // accountNumber
    );

    // --- Step 4: Clone household's ContactInfo ---
    if (household.contactInfo) {
        var contactInfoJson = serializeWithTypes(household.contactInfo);
        individual.contactInfo = deserializeWithTypes(contactInfoJson);
    }

    // --- Step 5: Copy VA-specific properties ---
    individual.pid = household.pid;
    individual.fireNumber = household.fireNumber || null;
    individual.mblu = new AttributedTerm(
        household.mblu && household.mblu.term ? household.mblu.term : '',
        'VISION_APPRAISAL',
        household.mblu && household.mblu.index ? household.mblu.index : 0,
        household.mblu && household.mblu.identifier ? household.mblu.identifier : (household.pid || '')
    );
    individual.googleFileId = household.googleFileId || '';
    individual.source = household.source || 'VISION_APPRAISAL';

    // --- Step 6: Set OtherInfo with assessment values + HouseholdInformation ---
    var otherInfo = new OtherInfo();

    // Copy assessment/appraisal values from household
    if (household.otherInfo) {
        if (typeof household.otherInfo.getAssessmentValue === 'function' && household.otherInfo.getAssessmentValue()) {
            otherInfo.setAssessmentValue(household.otherInfo.getAssessmentValue());
        } else if (household.otherInfo.assessmentValue) {
            otherInfo.setAssessmentValue(household.otherInfo.assessmentValue);
        }
        if (typeof household.otherInfo.getAppraisalValue === 'function' && household.otherInfo.getAppraisalValue()) {
            otherInfo.setAppraisalValue(household.otherInfo.getAppraisalValue());
        } else if (household.otherInfo.appraisalValue) {
            otherInfo.setAppraisalValue(household.otherInfo.appraisalValue);
        }
    }

    // Add HouseholdInformation
    var householdIdentifierStr = household.fireNumber
        ? String(household.fireNumber)
        : (household.pid || '');
    var householdNameStr = '';
    if (household.name && household.name.primaryAlias && household.name.primaryAlias.term) {
        householdNameStr = household.name.primaryAlias.term;
    } else if (household.name && household.name.fullHouseholdName) {
        householdNameStr = household.name.fullHouseholdName;
    }

    otherInfo.householdInformation = HouseholdInformation.fromVisionAppraisalData(
        householdIdentifierStr,
        householdNameStr,
        idx === 0  // first individual is head of household
    );

    individual.otherInfo = otherInfo;

    // --- Step 7: Add phone numbers ---
    // All phone numbers from all phonebook entries go on every individual
    if (individual.contactInfo === null) {
        individual.contactInfo = new ContactInfo();
    }
    for (var p = 0; p < allPhoneNumbers.length; p++) {
        var phoneStr = allPhoneNumbers[p];
        var phoneTerm = new PhoneTerm(phoneStr, 'PHONEBOOK_DATABASE', phoneStr, 'individualDiscovery');
        var isIsland = phoneStr.length >= 6 && phoneStr.substring(0, 6) === '401466';

        if (isIsland && !individual.contactInfo.islandPhone) {
            individual.contactInfo.setIslandPhone(phoneTerm);
        } else {
            individual.contactInfo.addAdditionalPhone(phoneTerm);
        }
    }

    return individual;
}


// -----------------------------------------------------------------------------
// 4.5d: Address Handling — Five Cases
// -----------------------------------------------------------------------------

/**
 * Create a complete Block Island Address object from phonebook-derived components.
 *
 * @param {Object} params - { fireNumber, streetName, streetType, boxNumber }
 *     Provide fireNumber+streetName+streetType for street addresses,
 *     or boxNumber for PO Box addresses.
 * @returns {Address} A complete BI Address
 */
function createBlockIslandAddress(params) {
    var source = 'PHONEBOOK_DATABASE';
    var field = 'phonebookAddress';
    var displayParts = [];

    if (params.boxNumber) {
        displayParts.push('PO BOX ' + params.boxNumber);
    } else {
        if (params.fireNumber) displayParts.push(params.fireNumber);
        if (params.streetName) displayParts.push(params.streetName);
        if (params.streetType) displayParts.push(params.streetType);
    }
    displayParts.push('BLOCK ISLAND');
    displayParts.push('RI');
    displayParts.push('02807');

    var displayStr = displayParts.join(' ');

    var address = new Address(new AttributedTerm(displayStr, source, field, 'phonebook_address'));
    address.originalAddress = new AttributedTerm(displayStr, source, field, 'original_address');

    if (params.boxNumber) {
        // PO Box address
        address.secUnitType = new AttributedTerm('PO BOX', source, field, 'unit_type');
        address.secUnitNum = new AttributedTerm(params.boxNumber, source, field, 'unit_number');
    } else {
        // Street address
        if (params.fireNumber) {
            address.streetNumber = new AttributedTerm(params.fireNumber, source, field, 'street_number');
        }
        if (params.streetName) {
            address.streetName = new AttributedTerm(params.streetName, source, field, 'street_name');
        }
        if (params.streetType) {
            address.streetType = new AttributedTerm(params.streetType, source, field, 'street_type');
        }
    }

    address.city = new AttributedTerm('Block Island', source, field, 'city');
    address.state = new AttributedTerm('RI', source, field, 'state');
    address.zipCode = new AttributedTerm('02807', source, field, 'zip_code');
    address.isBlockIslandAddress = new AttributedTerm(true, source, field, 'is_block_island');
    address.cityNormalized = new AttributedTerm(true, source, field, 'city_normalized');

    // Look up biStreetName from StreetNameDatabase if available (street addresses only)
    if (!params.boxNumber && params.streetName && window.streetNameDatabase &&
        typeof window.streetNameDatabase.lookup === 'function') {
        var lookupStr = params.streetName;
        if (params.streetType) lookupStr += ' ' + params.streetType;
        var streetNameObj = window.streetNameDatabase.lookup(lookupStr);
        if (streetNameObj) {
            address.biStreetName = streetNameObj;
        }
    }

    return address;
}

/**
 * Check phonebook address data for new addresses not already on the household.
 * Implements the five cases from reference_phase4_5_individualDiscoveryPlan.md Section 3:
 *   Case 1: Street name only → do nothing
 *   Case 2: Fire number already in VA data → do nothing
 *   Case 3: PO box already in VA data → do nothing
 *   Case 4: New fire number + street → create BI address, add to household secondaryAddress
 *   Case 5: New PO box → create BI address, add to household secondaryAddress
 *
 * @param {AggregateHousehold} household - The parent household entity
 * @param {Array<{phoneKey: string, entry: PhonebookEntry}>} entryRefs - Phonebook entries for this household
 * @returns {Address[]} Array of new Address objects that were added to the household
 *     (caller must also add these to each individual's secondaryAddress)
 */
function checkAndAddNewAddresses(household, entryRefs) {
    var newAddresses = [];

    // Build set of existing fire numbers and PO boxes on the household
    var existingFireNums = new Set();
    var existingBoxes = new Set();

    if (household.contactInfo) {
        var allAddresses = [];
        if (household.contactInfo.primaryAddress) allAddresses.push(household.contactInfo.primaryAddress);
        if (household.contactInfo.secondaryAddress && Array.isArray(household.contactInfo.secondaryAddress)) {
            allAddresses = allAddresses.concat(household.contactInfo.secondaryAddress);
        }

        for (var i = 0; i < allAddresses.length; i++) {
            var addr = allAddresses[i];
            if (addr.streetNumber && addr.streetNumber.term) {
                existingFireNums.add(String(addr.streetNumber.term));
            }
            if (addr.secUnitType && addr.secUnitNum && addr.secUnitNum.term) {
                var unitType = (addr.secUnitType.term || '').toUpperCase();
                if (unitType.indexOf('PO') >= 0 || unitType === 'BOX') {
                    existingBoxes.add(String(addr.secUnitNum.term));
                }
            }
        }

        // Also check dedicated poBox property
        if (household.contactInfo.poBox && household.contactInfo.poBox.primaryAlias) {
            existingBoxes.add(String(household.contactInfo.poBox.primaryAlias.term));
        }
    }

    // Track what we've already added to avoid duplicates
    var addedFireNums = new Set();
    var addedBoxes = new Set();

    // Scan all phonebook records for address data
    for (var e = 0; e < entryRefs.length; e++) {
        var entry = entryRefs[e].entry;

        for (var r = 0; r < entry.rawRecords.length; r++) {
            var record = entry.rawRecords[r];
            if (!record.address) continue;

            var pbFireNum = record.address.fireNumber ? String(record.address.fireNumber) : null;
            var pbStreet = record.address.streetNormalized || record.address.street || null;
            var pbBox = record.address.box ? String(record.address.box) : null;

            // Case 4: New fire number + street combination
            if (pbFireNum && pbStreet) {
                if (!existingFireNums.has(pbFireNum) && !addedFireNums.has(pbFireNum)) {
                    // Look up street in StreetNameDatabase for canonical name + type
                    var streetName = pbStreet;
                    var streetType = '';
                    if (window.streetNameDatabase && typeof window.streetNameDatabase.lookup === 'function') {
                        var streetObj = window.streetNameDatabase.lookup(pbStreet);
                        if (streetObj && streetObj.primaryAlias && streetObj.primaryAlias.term) {
                            // Use canonical street name from database
                            var canonical = streetObj.primaryAlias.term;
                            // Parse into name + type (e.g., "CENTER ROAD" → "CENTER" + "ROAD")
                            var lastSpace = canonical.lastIndexOf(' ');
                            if (lastSpace > 0) {
                                streetName = canonical.substring(0, lastSpace);
                                streetType = canonical.substring(lastSpace + 1);
                            } else {
                                streetName = canonical;
                            }
                        }
                    }

                    var newAddr = createBlockIslandAddress({
                        fireNumber: pbFireNum,
                        streetName: streetName,
                        streetType: streetType
                    });
                    newAddresses.push(newAddr);
                    addedFireNums.add(pbFireNum);

                    // Add to household
                    if (!household.contactInfo) household.contactInfo = new ContactInfo();
                    household.contactInfo.addSecondaryAddress(newAddr);
                }
            }

            // Case 5: New PO box
            if (pbBox) {
                if (!existingBoxes.has(pbBox) && !addedBoxes.has(pbBox)) {
                    var newBoxAddr = createBlockIslandAddress({ boxNumber: pbBox });
                    newAddresses.push(newBoxAddr);
                    addedBoxes.add(pbBox);

                    // Add to household
                    if (!household.contactInfo) household.contactInfo = new ContactInfo();
                    household.contactInfo.addSecondaryAddress(newBoxAddr);
                }
            }

            // Cases 1, 2, 3: do nothing (street only, existing fire number, existing PO box)
        }
    }

    return newAddresses;
}


// -----------------------------------------------------------------------------
// 4.5e: Top-Level Orchestrator
// -----------------------------------------------------------------------------

/**
 * Process individual discovery for all empty AggregateHouseholds tagged with
 * individualDiscovery. Creates Individual objects from phonebook name data
 * and populates the household's individuals[] array.
 *
 * Prerequisites (same as Phase 4.1-4.4):
 *   - PhonebookDatabase loaded (with tagIndividualDiscovery already run)
 *   - Entity group database loaded
 *   - Unified entity database loaded
 *   - IndividualNameDatabase loaded
 *   - getIndividualNameHomonymThreshold() / getIndividualNameSynonymThreshold() available
 *
 * @param {PhonebookDatabase} phonebookDb - Loaded PhonebookDatabase
 * @param {Object} [options] - { groupDb, entityDb, indNameDb } (auto-detected if omitted)
 * @returns {Object} Results summary
 */
function processIndividualDiscovery(phonebookDb, options) {
    options = options || {};

    // Resolve databases
    var entityDb = options.entityDb || (window.unifiedEntityDatabase && window.unifiedEntityDatabase.entities);
    var indNameDb = options.indNameDb || window.individualNameDatabase;

    // Validate prerequisites
    if (!phonebookDb || phonebookDb.size === 0) {
        throw new Error('Phase 4.5: PhonebookDatabase not loaded or empty.');
    }
    if (!entityDb) {
        throw new Error('Phase 4.5: Unified entity database not loaded.');
    }
    if (!indNameDb) {
        throw new Error('Phase 4.5: IndividualNameDatabase not loaded.');
    }
    if (!window.getIndividualNameHomonymThreshold || !window.getIndividualNameSynonymThreshold) {
        throw new Error('Phase 4.5: Name threshold functions not available.');
    }

    console.log('\n========================================');
    console.log('PHASE 4.5: INDIVIDUAL DISCOVERY');
    console.log('========================================');

    // --- Step 1: Collect tagged matchAssociations, group by entityKey ---
    var householdMap = {}; // entityKey → { household, entryRefs: [{phoneKey, entry}] }

    for (var _ref of phonebookDb) {
        var phoneKey = _ref[0];
        var entry = _ref[1];
        if (!entry.matchAssociations) continue;

        for (var a = 0; a < entry.matchAssociations.length; a++) {
            var assoc = entry.matchAssociations[a];
            if (!assoc.individualDiscovery) continue;
            if (!assoc.entityKey) continue;

            var entity = entityDb[assoc.entityKey];
            if (!entity) {
                console.warn('Phase 4.5: entityKey "' + assoc.entityKey + '" not found in database.');
                continue;
            }

            // Verify it's still an empty AggregateHousehold
            if (entity.constructor.name !== 'AggregateHousehold') continue;
            if (entity.individuals && entity.individuals.length > 0) continue;

            if (!householdMap[assoc.entityKey]) {
                householdMap[assoc.entityKey] = {
                    household: entity,
                    entityKey: assoc.entityKey,
                    entryRefs: []
                };
            }

            // Avoid duplicate entry refs (same phone may have multiple tagged assocs)
            var refs = householdMap[assoc.entityKey].entryRefs;
            var alreadyHasEntry = false;
            for (var r = 0; r < refs.length; r++) {
                if (refs[r].phoneKey === phoneKey) { alreadyHasEntry = true; break; }
            }
            if (!alreadyHasEntry) {
                refs.push({ phoneKey: phoneKey, entry: entry });
            }
        }
    }

    var householdKeys = Object.keys(householdMap);
    console.log('Empty AggregateHouseholds with tagged associations: ' + householdKeys.length);

    // --- Step 2: Process each household ---
    var stats = {
        householdsProcessed: 0,
        individualsCreated: 0,
        namesReconciled: 0,
        couplesFound: 0,
        newAddressesAdded: 0,
        newIndNameEntries: 0,
        aliasesAdded: 0,
        phoneNumbersTotal: 0,
        errors: []
    };

    for (var h = 0; h < householdKeys.length; h++) {
        var hKey = householdKeys[h];
        var hData = householdMap[hKey];
        var household = hData.household;

        try {
            console.log('\n--- Household: ' + hKey + ' ---');
            var householdNameStr = '';
            if (household.name && household.name.primaryAlias) {
                householdNameStr = household.name.primaryAlias.term || '';
            }
            console.log('  Name: ' + householdNameStr);
            console.log('  Phonebook entries: ' + hData.entryRefs.length);

            // Step 2a: Collect names
            var rawNames = collectNamesForHousehold(hData.entryRefs);
            console.log('  Raw names collected: ' + rawNames.length);

            if (rawNames.length === 0) {
                console.log('  SKIP: No valid names found.');
                continue;
            }

            // Step 2b: Reconcile names
            var anchors = reconcileNames(rawNames);
            console.log('  Distinct individuals after reconciliation: ' + anchors.length);

            var reconciledCount = rawNames.length - anchors.length;
            if (reconciledCount > 0) {
                stats.namesReconciled += reconciledCount;
                console.log('  Names consolidated: ' + reconciledCount);
            }

            // Step 2c: Check for new addresses (Cases 4-5)
            var newAddresses = checkAndAddNewAddresses(household, hData.entryRefs);
            if (newAddresses.length > 0) {
                stats.newAddressesAdded += newAddresses.length;
                console.log('  New addresses added to household: ' + newAddresses.length);
            }

            // Step 2d: Collect ALL phone numbers across all entries for this household
            var allPhoneNumbers = [];
            for (var ep = 0; ep < hData.entryRefs.length; ep++) {
                var pk = hData.entryRefs[ep].phoneKey;
                if (allPhoneNumbers.indexOf(pk) === -1) {
                    allPhoneNumbers.push(pk);
                }
            }
            stats.phoneNumbersTotal += allPhoneNumbers.length;

            // Step 2e: Create individuals
            // NOTE: checkAndAddNewAddresses (step 2c) already added new addresses to the
            // household's contactInfo. createIndividualForHousehold clones the household's
            // contactInfo, so individuals automatically get the new addresses from the clone.
            // No explicit address addition to individuals is needed here.
            for (var idx = 0; idx < anchors.length; idx++) {
                var anchor = anchors[idx];

                var individual = createIndividualForHousehold(anchor, household, idx, allPhoneNumbers);

                // Push to household
                household.individuals.push(individual);
                stats.individualsCreated++;

                console.log('  Created: ' + anchor.fullName +
                    (anchor.aliasForms.length > 0
                        ? ' (+ ' + anchor.aliasForms.length + ' alias(es))'
                        : '') +
                    (idx === 0 ? ' [HEAD]' : ''));

                // Step 2f: Register in IndividualNameDatabase
                // Check if this name is already in the database
                var existingEntry = indNameDb.get(anchor.fullName) || indNameDb.lookup(anchor.fullName, 0.99);

                if (!existingEntry) {
                    // New name — add to IndividualNameDatabase (memory only, save bulk later)
                    // Uses entries.set() directly to avoid async Drive persistence.
                    // Same pattern as Phase 4.1 which modifies in memory then saves bulk.
                    if (individual.name && individual.name instanceof IndividualName) {
                        var normalizedKey = anchor.fullName.trim().toUpperCase();
                        if (!indNameDb.entries.has(normalizedKey)) {
                            indNameDb.entries.set(normalizedKey, {
                                object: individual.name,
                                fileId: null,
                                created: new Date().toISOString(),
                                lastModified: new Date().toISOString()
                            });
                            stats.newIndNameEntries++;
                            console.log('    Registered new IndividualName: ' + anchor.fullName);
                        }
                        existingEntry = indNameDb.get(anchor.fullName);
                    }
                }

                // Add alias variations from reconciliation
                if (existingEntry && anchor.aliasForms.length > 0) {
                    for (var af = 0; af < anchor.aliasForms.length; af++) {
                        var aliasForm = anchor.aliasForms[af];
                        var aliasResult = addPhonebookAliasToIndividualName(
                            existingEntry, aliasForm.fullName, anchor.phoneNumbers[0] || ''
                        );
                        if (aliasResult) {
                            stats.aliasesAdded++;
                            console.log('    Added alias: ' + aliasForm.fullName +
                                ' (' + aliasForm.category + ', score: ' + aliasForm.score.toFixed(3) + ')');
                        }
                    }
                }
            }

            stats.householdsProcessed++;

        } catch (err) {
            console.error('Phase 4.5 ERROR for ' + hKey + ': ' + err.message);
            stats.errors.push({ entityKey: hKey, error: err.message });
        }
    }

    // --- Rebuild variation cache if new entries were added ---
    if (stats.newIndNameEntries > 0 || stats.aliasesAdded > 0) {
        indNameDb._buildVariationCache();
        console.log('\nIndividualNameDatabase variation cache rebuilt.');
    }

    // --- Summary ---
    console.log('\n========================================');
    console.log('PHASE 4.5 SUMMARY');
    console.log('========================================');
    console.log('Households processed: ' + stats.householdsProcessed + ' / ' + householdKeys.length);
    console.log('Individuals created: ' + stats.individualsCreated);
    console.log('Names reconciled (consolidated): ' + stats.namesReconciled);
    console.log('New addresses added (Cases 4-5): ' + stats.newAddressesAdded);
    console.log('Phone numbers distributed: ' + stats.phoneNumbersTotal);
    console.log('New IndividualName DB entries: ' + stats.newIndNameEntries);
    console.log('Alias variations added: ' + stats.aliasesAdded);
    if (stats.errors.length > 0) {
        console.log('Errors: ' + stats.errors.length);
        for (var ei = 0; ei < stats.errors.length; ei++) {
            console.log('  ' + stats.errors[ei].entityKey + ': ' + stats.errors[ei].error);
        }
    }

    if (stats.newIndNameEntries > 0 || stats.aliasesAdded > 0) {
        console.log('\nIndividualNameDatabase modified in memory. Save with:');
        console.log('  await saveModifiedIndividualNames(window.individualNameDatabase, new Set(["phase4.5"]))');
    }

    return stats;
}


console.log('PhonebookNameProcessing (Phase 4 name variation processing) loaded.');
