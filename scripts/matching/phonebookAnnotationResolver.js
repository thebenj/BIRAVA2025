/**
 * phonebookAnnotationResolver.js
 *
 * One-time resolution of user phonebook annotations to entity keys.
 * Translates annotations (which reference entities by name + group index)
 * into resolved rules (with entity keys) for the inaugural database build.
 *
 * After the inaugural build, the resolved rules are stored permanently in
 * servers/progress/resolved_phonebook_rules.json. The PhonebookDatabase
 * entries themselves also store the user declarations permanently.
 *
 * Dependencies:
 *   - window.unifiedEntityDatabase (entity database)
 *   - entityGroupBrowser.loadedDatabase (entity group database)
 *   - levenshteinSimilarity() from utils.js
 *   - saveToDisk() / loadFromDisk() from baseCode.js
 *
 * Functions:
 *   - resolveAnnotationKeys() — main resolution function (one-time)
 *   - loadResolvedPhonebookRules() — load from permanent file
 *
 * Usage (browser console):
 *   var resolved = await resolveAnnotationKeys();
 *   // resolved rules saved to disk AND set on window.resolvedPhonebookRules
 *   // Then continue with processNoMatchRecords(db)
 *
 * For subsequent pipeline runs (without re-resolving):
 *   await loadResolvedPhonebookRules();
 *   // Then continue with processNoMatchRecords(db)
 */

// =============================================================================
// ENTITY NAME EXTRACTION
// =============================================================================

/**
 * Get entity name as uppercase string for comparison.
 * Tries multiple paths because entity structure varies by source and
 * deserialization path.
 *
 * @param {object} entity - Entity object from unifiedEntityDatabase
 * @returns {string} Uppercase name string, or empty string if unavailable
 */
function _resolverGetEntityNameStr(entity) {
    if (!entity || !entity.name) return '';

    // Direct ComplexIdentifier path (most common after generic deserialization)
    if (entity.name.primaryAlias && entity.name.primaryAlias.term) {
        return String(entity.name.primaryAlias.term).toUpperCase();
    }
    // IdentifyingData wrapper path
    if (entity.name.identifier && entity.name.identifier.primaryAlias &&
        entity.name.identifier.primaryAlias.term) {
        return String(entity.name.identifier.primaryAlias.term).toUpperCase();
    }
    // HouseholdName path
    if (entity.name.fullHouseholdName) {
        return String(entity.name.fullHouseholdName).toUpperCase();
    }
    return '';
}

// =============================================================================
// ENTITY KEY RESOLUTION
// =============================================================================

/**
 * Find the entityKey for a named entity, searching the specified group first.
 * Falls back to searching all groups if not found in the specified group,
 * since entity group indices can shift between builds.
 *
 * @param {string} targetName - The entity name to search for
 * @param {number} groupIndex - The group index to search first
 * @param {object} entityGroupDb - Entity group database
 * @param {object} entityDb - Entity database (key -> entity)
 * @param {string} context - Context string for logging
 * @returns {{ entityKey: string|null, method: string, score: number, groupIndex: number }}
 */
function _resolveEntityKey(targetName, groupIndex, entityGroupDb, entityDb, context) {
    var target = targetName.toUpperCase().trim();

    // Phase 1: Search within the specified group
    var group = entityGroupDb.groups[groupIndex];
    if (group) {
        var result = _searchGroupForEntity(target, group, entityDb);
        if (result) {
            return {
                entityKey: result.entityKey,
                method: result.method,
                score: result.score,
                groupIndex: groupIndex
            };
        }
    }

    // Phase 2: Group index may have shifted — search all groups
    var allGroups = Object.values(entityGroupDb.groups);
    var bestMatch = null;
    var bestScore = 0;

    for (var i = 0; i < allGroups.length; i++) {
        var g = allGroups[i];
        if (g.index === groupIndex) continue; // Already searched
        var gResult = _searchGroupForEntity(target, g, entityDb);
        if (gResult && gResult.score > bestScore) {
            bestMatch = {
                entityKey: gResult.entityKey,
                method: gResult.method,
                score: gResult.score,
                groupIndex: g.index
            };
            bestScore = gResult.score;
        }
    }

    if (bestMatch) {
        console.warn('resolveEntityKey: ' + context +
            ' — not found in group ' + groupIndex +
            ', found in group ' + bestMatch.groupIndex +
            ' (' + bestMatch.method + ', score=' + bestMatch.score.toFixed(3) + ')');
        bestMatch.method = bestMatch.method + '-shifted';
        return bestMatch;
    }

    console.error('resolveEntityKey FAILED: ' + context +
        ' — "' + targetName + '" not found in group ' + groupIndex + ' or any other group');
    return { entityKey: null, method: 'failed', score: 0, groupIndex: groupIndex };
}

/**
 * Search within a single group for an entity matching the target name.
 *
 * @param {string} target - Uppercase target name
 * @param {object} group - EntityGroup with memberKeys array
 * @param {object} entityDb - Entity database
 * @returns {{ entityKey: string, method: string, score: number }|null}
 */
function _searchGroupForEntity(target, group, entityDb) {
    var candidates = [];

    for (var i = 0; i < group.memberKeys.length; i++) {
        var key = group.memberKeys[i];
        var entity = entityDb[key];
        if (!entity) continue;

        var entityName = _resolverGetEntityNameStr(entity);
        if (!entityName) continue;

        // Exact match — return immediately
        if (entityName === target) {
            return { entityKey: key, method: 'exact', score: 1.0 };
        }

        // Collect Levenshtein candidates
        var score = levenshteinSimilarity(target, entityName);
        candidates.push({ entityKey: key, score: score, entityName: entityName });
    }

    // Find best Levenshtein match above threshold
    if (candidates.length > 0) {
        candidates.sort(function(a, b) { return b.score - a.score; });
        if (candidates[0].score >= 0.80) {
            return {
                entityKey: candidates[0].entityKey,
                method: 'levenshtein',
                score: candidates[0].score
            };
        }
    }

    return null;
}

// =============================================================================
// CSV EXCLUSION PARSING
// =============================================================================

/**
 * Parse the phonebook match CSV to extract exclusion records.
 * Exclusions are identified by first-column codes:
 *   n = wrong-match, g = government, b = business
 *
 * For each exclusion, extracts the PROG_MATCH_1 entity info (the entity
 * that was incorrectly matched by the algorithm).
 *
 * @param {string} csvText - Raw CSV text
 * @returns {Array<{phone: string, reason: string, matchEntityName: string,
 *           matchGroupIndex: number, lastName: string, firstName: string}>}
 */
function _parseExclusionsFromCSV(csvText) {
    var lines = csvText.split('\n');
    var exclusions = [];
    var currentExclusion = null;

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) {
            currentExclusion = null;
            continue;
        }

        var fields = _parseCSVLine(line);
        var code = fields[0];

        // Check for exclusion RECORD row (n/g/b code with RECORD marker)
        if ((code === 'n' || code === 'g' || code === 'b') && fields[3] === 'RECORD') {
            var reason;
            if (code === 'n') reason = 'wrong-match';
            else if (code === 'g') reason = 'government';
            else reason = 'business';

            currentExclusion = {
                phone: fields[12] || '',
                reason: reason,
                recordIndex: parseInt(fields[4]) || 0,
                lineNumber: parseInt(fields[5]) || 0,
                lastName: fields[6] || '',
                firstName: fields[7] || '',
                matchEntityName: null,
                matchGroupIndex: null
            };
            continue;
        }

        // Check for PROG_MATCH_1 row following an exclusion RECORD
        if (currentExclusion && fields[3] === 'PROG_MATCH_1') {
            currentExclusion.matchEntityName = fields[15] || '';
            currentExclusion.matchGroupIndex = parseInt(fields[17]) || 0;
            exclusions.push(currentExclusion);
            currentExclusion = null;
        }
    }

    return exclusions;
}

/**
 * Parse a single CSV line, handling quoted fields that may contain commas.
 *
 * @param {string} line - Raw CSV line
 * @returns {string[]} Array of field values
 */
function _parseCSVLine(line) {
    var fields = [];
    var current = '';
    var inQuotes = false;

    for (var i = 0; i < line.length; i++) {
        var ch = line[i];
        if (ch === '"') {
            if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === ',' && !inQuotes) {
            fields.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    fields.push(current);
    return fields;
}

// =============================================================================
// RESOLUTION STAT TRACKING
// =============================================================================

/**
 * Tally a resolution result method into stats counters.
 *
 * @param {string} method - Resolution method name
 * @param {object} stats - Stats object to update
 */
function _tallyResolutionStat(method, stats) {
    if (method === 'exact') stats.exact++;
    else if (method === 'levenshtein') stats.levenshtein++;
    else if (method.indexOf('-shifted') >= 0) stats.shifted++;
    else if (method === 'failed') stats.failed++;
}

// =============================================================================
// MAIN RESOLUTION FUNCTION
// =============================================================================

/**
 * Resolve all annotation keys: translate user annotations (name + group index)
 * into entity keys. Saves the resolved rules to permanent storage on disk.
 *
 * This is a ONE-TIME function for the inaugural PhonebookDatabase build.
 * After the database is built, user declarations live in the DB entries themselves.
 *
 * Source data:
 *   1. servers/progress/user_phonebook_annotations_2026-02-22.json
 *      — 165 match inclusions (matchEntityName + matchGroupIndex, no entityKey)
 *      — Also 125 nonhuman declarations and 410 confirmed no-match (not used here)
 *   2. servers/Results/phonebook match - Sheet1.csv
 *      — P-1 review: 10 exclusions identified by n/g/b codes in first column
 *
 * Output:
 *   - servers/progress/resolved_phonebook_rules.json (permanent file)
 *   - window.resolvedPhonebookRules (for immediate pipeline use)
 *
 * Prerequisites:
 *   - Entity group database loaded (entityGroupBrowser.loadedDatabase)
 *   - Unified entity database loaded (window.unifiedEntityDatabase)
 *
 * @returns {Promise<{inclusions: Array, exclusions: Array}|null>} Resolved rules
 */
async function resolveAnnotationKeys() {
    console.log('\n=== ANNOTATION RESOLUTION: Translating names to entity keys ===\n');

    // --- Validate prerequisites ---
    var groupDb = entityGroupBrowser.loadedDatabase;
    if (!groupDb) {
        console.error('resolveAnnotationKeys: No entity group database loaded.');
        return null;
    }

    var entityDb = window.unifiedEntityDatabase && window.unifiedEntityDatabase.entities;
    if (!entityDb) {
        console.error('resolveAnnotationKeys: No unified entity database loaded.');
        return null;
    }

    // --- Step 1: Load source data ---
    console.log('Loading annotation source data...');

    var annotations = await loadFromDisk('user_phonebook_annotations_2026-02-22.json');
    if (!annotations || !annotations.matchAssociations) {
        console.error('Failed to load annotations file.');
        return null;
    }
    console.log('  Annotations loaded: ' + annotations.matchAssociations.length +
        ' match associations');

    // Load CSV via the csv-file endpoint (load-progress only handles JSON)
    var csvResponse = await fetch(
        'http://127.0.0.99:3000/csv-file?file=' +
        encodeURIComponent('phonebook match - Sheet1.csv')
    );
    if (!csvResponse.ok) {
        console.error('Failed to load CSV file: HTTP ' + csvResponse.status);
        return null;
    }
    var csvText = await csvResponse.text();

    var csvExclusions = _parseExclusionsFromCSV(csvText);
    console.log('  CSV exclusions parsed: ' + csvExclusions.length + ' records');

    // --- Step 2: Resolve inclusions ---
    // Determine classification from annotation — isBusiness flag is unreliable,
    // so also check entityType and matchEntityType fields
    function _classifyAnnotation(ann) {
        if (ann.isBusiness) return 'nonhuman';
        if (ann.entityType === 'Business' || ann.entityType === 'NonHuman') return 'nonhuman';
        if (ann.matchEntityType === 'Business' || ann.matchEntityType === 'NonHuman') return 'nonhuman';
        return 'person';
    }

    console.log('\nResolving ' + annotations.matchAssociations.length + ' inclusions...');

    var inclusions = [];
    var inclusionStats = { exact: 0, levenshtein: 0, shifted: 0, failed: 0, bothCount: 0 };

    for (var i = 0; i < annotations.matchAssociations.length; i++) {
        var ann = annotations.matchAssociations[i];

        if (ann.matchTarget === 'both') {
            // Two targets — resolve each independently
            inclusionStats.bothCount++;

            var result1 = _resolveEntityKey(
                ann.match1EntityName, ann.match1GroupIndex, groupDb, entityDb,
                'inclusion #' + i + ' match1 (' + ann.lastName + ' ' +
                    (ann.firstName || '') + ')'
            );
            var result2 = _resolveEntityKey(
                ann.match2EntityName, ann.match2GroupIndex, groupDb, entityDb,
                'inclusion #' + i + ' match2 (' + ann.lastName + ' ' +
                    (ann.firstName || '') + ')'
            );

            _tallyResolutionStat(result1.method, inclusionStats);
            _tallyResolutionStat(result2.method, inclusionStats);

            if (result1.entityKey) {
                inclusions.push({
                    phone: ann.phone,
                    entityKey: result1.entityKey,
                    groupIndex: result1.groupIndex,
                    classification: _classifyAnnotation(ann),
                    designation: ann.designation || '',
                    matchEntityName: ann.match1EntityName,
                    matchComposite: 0,
                    sourceAnnotationIndex: i,
                    resolutionMethod: result1.method,
                    resolutionScore: result1.score
                });
            }
            if (result2.entityKey) {
                inclusions.push({
                    phone: ann.phone,
                    entityKey: result2.entityKey,
                    groupIndex: result2.groupIndex,
                    classification: _classifyAnnotation(ann),
                    designation: ann.designation || '',
                    matchEntityName: ann.match2EntityName,
                    matchComposite: 0,
                    sourceAnnotationIndex: i,
                    resolutionMethod: result2.method,
                    resolutionScore: result2.score
                });
            }
        } else {
            // Single target
            var result = _resolveEntityKey(
                ann.matchEntityName, ann.matchGroupIndex, groupDb, entityDb,
                'inclusion #' + i + ' (' + ann.lastName + ' ' +
                    (ann.firstName || '') + ', phone ' + ann.phone + ')'
            );

            _tallyResolutionStat(result.method, inclusionStats);

            if (result.entityKey) {
                inclusions.push({
                    phone: ann.phone,
                    entityKey: result.entityKey,
                    groupIndex: result.groupIndex,
                    classification: _classifyAnnotation(ann),
                    designation: ann.designation || '',
                    matchEntityName: ann.matchEntityName,
                    matchComposite: ann.matchComposite || 0,
                    sourceAnnotationIndex: i,
                    resolutionMethod: result.method,
                    resolutionScore: result.score
                });
            }
        }
    }

    console.log('\nInclusion resolution results:');
    console.log('  Total annotations: ' + annotations.matchAssociations.length +
        ' (including ' + inclusionStats.bothCount + ' "both" targets)');
    console.log('  Resolved inclusions: ' + inclusions.length);
    console.log('  Exact matches: ' + inclusionStats.exact);
    console.log('  Levenshtein matches: ' + inclusionStats.levenshtein);
    console.log('  Group-shifted matches: ' + inclusionStats.shifted);
    console.log('  FAILED resolutions: ' + inclusionStats.failed);

    // --- Step 3: Resolve exclusions ---
    console.log('\nResolving ' + csvExclusions.length + ' exclusions...');

    var exclusions = [];
    var exclusionStats = { exact: 0, levenshtein: 0, shifted: 0, failed: 0 };

    for (var j = 0; j < csvExclusions.length; j++) {
        var ex = csvExclusions[j];

        var exResult = _resolveEntityKey(
            ex.matchEntityName, ex.matchGroupIndex, groupDb, entityDb,
            'exclusion #' + j + ' (' + ex.lastName + ' ' +
                (ex.firstName || '') + ', phone ' + ex.phone +
                ', reason ' + ex.reason + ')'
        );

        _tallyResolutionStat(exResult.method, exclusionStats);

        if (exResult.entityKey) {
            exclusions.push({
                phone: ex.phone,
                entityKey: exResult.entityKey,
                groupIndex: exResult.groupIndex,
                reason: ex.reason,
                name: ex.matchEntityName,
                sourceRecordIndex: ex.recordIndex,
                resolutionMethod: exResult.method,
                resolutionScore: exResult.score
            });
        }
    }

    console.log('\nExclusion resolution results:');
    console.log('  Total CSV exclusions: ' + csvExclusions.length);
    console.log('  Resolved exclusions: ' + exclusions.length);
    console.log('  Exact matches: ' + exclusionStats.exact);
    console.log('  Levenshtein matches: ' + exclusionStats.levenshtein);
    console.log('  Group-shifted matches: ' + exclusionStats.shifted);
    console.log('  FAILED resolutions: ' + exclusionStats.failed);

    // --- Step 4: Build and save resolved rules ---
    var resolvedRules = {
        resolvedAt: new Date().toISOString(),
        version: '1.0',
        sourceAnnotations: 'user_phonebook_annotations_2026-02-22.json',
        sourceCSV: 'phonebook match - Sheet1.csv',
        stats: {
            annotationCount: annotations.matchAssociations.length,
            bothTargetCount: inclusionStats.bothCount,
            csvExclusionCount: csvExclusions.length,
            resolvedInclusions: inclusions.length,
            resolvedExclusions: exclusions.length,
            failedInclusions: inclusionStats.failed,
            failedExclusions: exclusionStats.failed
        },
        inclusions: inclusions,
        exclusions: exclusions
    };

    console.log('\nSaving resolved rules to permanent storage...');
    var saveResult = await saveToDisk('resolved_phonebook_rules.json', resolvedRules);
    if (saveResult && saveResult.success) {
        console.log('  Saved to servers/progress/resolved_phonebook_rules.json');
    } else {
        console.error('  FAILED to save resolved rules to disk.');
    }

    // Set window variable for immediate pipeline use
    window.resolvedPhonebookRules = resolvedRules;
    console.log('  Set window.resolvedPhonebookRules for immediate pipeline use.');

    console.log('\n=== ANNOTATION RESOLUTION COMPLETE ===');
    console.log('Inclusions: ' + inclusions.length + ' resolved, ' +
        inclusionStats.failed + ' failed');
    console.log('Exclusions: ' + exclusions.length + ' resolved, ' +
        exclusionStats.failed + ' failed');

    return resolvedRules;
}

// =============================================================================
// PERSISTENT LOAD FUNCTION
// =============================================================================

/**
 * Load resolved phonebook rules from permanent storage on disk.
 * Sets window.resolvedPhonebookRules for use by the pipeline functions
 * (applyManualInclusions, applyManualExclusions, processNoMatchRecords).
 *
 * Use this instead of resolveAnnotationKeys() when the rules have already
 * been resolved and saved in a prior session.
 *
 * @returns {Promise<object|null>} The resolved rules, or null if not found
 */
async function loadResolvedPhonebookRules() {
    console.log('Loading resolved phonebook rules from permanent storage...');

    var rules = await loadFromDisk('resolved_phonebook_rules.json');

    if (!rules || !rules.inclusions || !rules.exclusions) {
        console.error('loadResolvedPhonebookRules: No valid rules file found.');
        console.error('Run resolveAnnotationKeys() first to create the file.');
        return null;
    }

    window.resolvedPhonebookRules = rules;
    console.log('Loaded resolved rules:');
    console.log('  Inclusions: ' + rules.inclusions.length);
    console.log('  Exclusions: ' + rules.exclusions.length);
    console.log('  Resolved at: ' + rules.resolvedAt);
    console.log('  Version: ' + rules.version);
    console.log('  Set window.resolvedPhonebookRules');

    return rules;
}
