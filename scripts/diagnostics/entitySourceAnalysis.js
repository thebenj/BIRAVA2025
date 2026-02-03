/**
 * =============================================================================
 * ENTITY SOURCE ANALYSIS - Diagnostic scripts for analyzing IndividualName sources
 * =============================================================================
 *
 * These scripts analyze saved entity files to determine:
 * - Entity counts
 * - What data sources created IndividualName objects
 * - Whether IndividualName objects have aliases (synonyms, homonyms, candidates)
 *
 * Usage: Run in browser console after Google API is authenticated
 *
 * Primary test functions:
 *   analyzeBloomerangFile(fileId) - Complete analysis for Bloomerang entity file
 *   analyzeVisionAppraisalFile(fileId) - Complete analysis for VA entity file
 *
 * Created: January 31, 2026
 * =============================================================================
 */

/**
 * Complete analysis of a Bloomerang entities file
 * Returns: entity counts, source distribution, alias counts
 *
 * @param {string} fileId - Google Drive file ID (required - changes each run)
 * @returns {Object} Complete analysis results
 */
async function analyzeBloomerangFile(fileId) {
    if (!fileId) {
        console.error('ERROR: fileId is required. Bloomerang creates a new file each run.');
        return null;
    }

    console.log('='.repeat(60));
    console.log('BLOOMERANG FILE ANALYSIS');
    console.log('File ID:', fileId);
    console.log('='.repeat(60));

    // Load file
    console.log('\nLoading file from Google Drive...');
    const response = await gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media'
    });

    const data = JSON.parse(response.body);
    console.log('File loaded. Top-level keys:', Object.keys(data));

    const entities = data.entities || {};
    const entityKeys = Object.keys(entities);

    // === ENTITY COUNTS ===
    const entityCounts = {
        total: entityKeys.length,
        byType: {}
    };

    // Count by entity type
    for (const key of entityKeys) {
        const entity = entities[key];
        const type = entity?.type || 'unknown';
        entityCounts.byType[type] = (entityCounts.byType[type] || 0) + 1;
    }

    console.log('\n--- ENTITY COUNTS ---');
    console.log('Total entities:', entityCounts.total);
    console.table(entityCounts.byType);

    // === SOURCE DISTRIBUTION ===
    const sourceCounts = {};
    let fromDatabase = 0;
    let fromBloomerang = 0;
    let fromOther = 0;

    for (const key of entityKeys) {
        const entity = entities[key];
        const individualName = entity?.name;

        if (!individualName || !individualName.primaryAlias) continue;

        const sourceMap = individualName.primaryAlias.sourceMap;
        let source = 'undefined';

        if (sourceMap && sourceMap.__data && sourceMap.__data.length > 0) {
            source = sourceMap.__data[0][0];
        }

        sourceCounts[source] = (sourceCounts[source] || 0) + 1;

        if (source === 'INDIVIDUAL_NAME_DATABASE_BUILDER') {
            fromDatabase++;
        } else if (source.toLowerCase().includes('bloomerang')) {
            fromBloomerang++;
        } else {
            fromOther++;
        }
    }

    console.log('\n--- SOURCE DISTRIBUTION ---');
    console.table(sourceCounts);
    console.log('Summary: Database=' + fromDatabase + ', Bloomerang=' + fromBloomerang + ', Other=' + fromOther);

    // === ALIAS COUNTS ===
    let withSynonyms = 0;
    let withHomonyms = 0;
    let withCandidates = 0;
    let withAnyAlias = 0;

    for (const key of entityKeys) {
        const entity = entities[key];
        const individualName = entity?.name;

        if (!individualName) continue;

        const hasSynonyms = (individualName.synonyms?.length > 0) || (individualName.alternatives?.synonyms?.length > 0);
        const hasHomonyms = (individualName.homonyms?.length > 0) || (individualName.alternatives?.homonyms?.length > 0);
        const hasCandidates = (individualName.candidates?.length > 0) || (individualName.alternatives?.candidates?.length > 0);

        if (hasSynonyms) withSynonyms++;
        if (hasHomonyms) withHomonyms++;
        if (hasCandidates) withCandidates++;
        if (hasSynonyms || hasHomonyms || hasCandidates) withAnyAlias++;
    }

    console.log('\n--- ALIAS COUNTS ---');
    console.log('With synonyms:', withSynonyms);
    console.log('With homonyms:', withHomonyms);
    console.log('With candidates:', withCandidates);
    console.log('With ANY alias:', withAnyAlias);

    // === SUMMARY OBJECT ===
    const results = {
        fileId: fileId,
        fileType: 'bloomerang',
        entityCounts: entityCounts,
        sourceCounts: sourceCounts,
        sourcesSummary: {
            fromDatabase: fromDatabase,
            fromBloomerang: fromBloomerang,
            fromOther: fromOther
        },
        aliasCounts: {
            withSynonyms: withSynonyms,
            withHomonyms: withHomonyms,
            withCandidates: withCandidates,
            withAnyAlias: withAnyAlias
        }
    };

    console.log('\n--- COMPLETE RESULTS OBJECT ---');
    console.log(JSON.stringify(results, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log('BLOOMERANG ANALYSIS COMPLETE');
    console.log('='.repeat(60));

    return results;
}

/**
 * Complete analysis of a VisionAppraisal entities file
 * Returns: entity counts, source distribution, alias counts
 *
 * @param {string} fileId - Google Drive file ID (default provided but may need updating)
 * @returns {Object} Complete analysis results
 */
async function analyzeVisionAppraisalFile(fileId = '19cgccMYNBboL07CmMP-5hNNGwEUBXgCI') {
    console.log('='.repeat(60));
    console.log('VISIONAPPRAISAL FILE ANALYSIS');
    console.log('File ID:', fileId);
    console.log('='.repeat(60));

    // Load file
    console.log('\nLoading file from Google Drive...');
    const response = await gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media'
    });

    const data = JSON.parse(response.body);
    console.log('File loaded. Top-level keys:', Object.keys(data));

    // Get entities array (VA files store entities in an array, not numerically indexed)
    const entitiesArray = data.entities || [];
    console.log('Entities array length:', entitiesArray.length);
    if (data.metadata) {
        console.log('Metadata entityTypeCounts:', JSON.stringify(data.metadata.entityTypeCounts));
    }

    // === ENTITY COUNTS ===
    const entityCounts = {
        total: entitiesArray.length,
        byType: {}
    };

    // Count by entity type and collect Individual entities for further analysis
    const individuals = [];
    for (const entity of entitiesArray) {
        const type = entity?.type || 'unknown';
        entityCounts.byType[type] = (entityCounts.byType[type] || 0) + 1;

        if (type === 'Individual') {
            individuals.push(entity);
        }
    }

    console.log('\n--- ENTITY COUNTS ---');
    console.log('Total entities:', entityCounts.total);
    console.log('Individual entities:', individuals.length);
    console.table(entityCounts.byType);

    // === SOURCE DISTRIBUTION (Individual entities only) ===
    const sourceCounts = {};
    let fromDatabase = 0;
    let fromVisionAppraisal = 0;
    let fromOther = 0;

    for (const entity of individuals) {
        const individualName = entity?.name;

        if (!individualName || !individualName.primaryAlias) continue;

        const sourceMap = individualName.primaryAlias.sourceMap;
        let source = 'undefined';

        if (sourceMap && sourceMap.__data && sourceMap.__data.length > 0) {
            source = sourceMap.__data[0][0];
        }

        sourceCounts[source] = (sourceCounts[source] || 0) + 1;

        if (source === 'INDIVIDUAL_NAME_DATABASE_BUILDER') {
            fromDatabase++;
        } else if (source.toLowerCase().includes('vision') || source === 'VISION_APPRAISAL') {
            fromVisionAppraisal++;
        } else {
            fromOther++;
        }
    }

    console.log('\n--- SOURCE DISTRIBUTION (Individuals only) ---');
    console.table(sourceCounts);
    console.log('Summary: Database=' + fromDatabase + ', VisionAppraisal=' + fromVisionAppraisal + ', Other=' + fromOther);

    // === ALIAS COUNTS (Individual entities only) ===
    let withSynonyms = 0;
    let withHomonyms = 0;
    let withCandidates = 0;
    let withAnyAlias = 0;

    for (const entity of individuals) {
        const individualName = entity?.name;

        if (!individualName) continue;

        const hasSynonyms = (individualName.synonyms?.length > 0) || (individualName.alternatives?.synonyms?.length > 0);
        const hasHomonyms = (individualName.homonyms?.length > 0) || (individualName.alternatives?.homonyms?.length > 0);
        const hasCandidates = (individualName.candidates?.length > 0) || (individualName.alternatives?.candidates?.length > 0);

        if (hasSynonyms) withSynonyms++;
        if (hasHomonyms) withHomonyms++;
        if (hasCandidates) withCandidates++;
        if (hasSynonyms || hasHomonyms || hasCandidates) withAnyAlias++;
    }

    console.log('\n--- ALIAS COUNTS (Individuals only) ---');
    console.log('With synonyms:', withSynonyms);
    console.log('With homonyms:', withHomonyms);
    console.log('With candidates:', withCandidates);
    console.log('With ANY alias:', withAnyAlias);

    // === SUMMARY OBJECT ===
    const results = {
        fileId: fileId,
        fileType: 'visionappraisal',
        entityCounts: entityCounts,
        individualCount: individuals.length,
        sourceCounts: sourceCounts,
        sourcesSummary: {
            fromDatabase: fromDatabase,
            fromVisionAppraisal: fromVisionAppraisal,
            fromOther: fromOther
        },
        aliasCounts: {
            withSynonyms: withSynonyms,
            withHomonyms: withHomonyms,
            withCandidates: withCandidates,
            withAnyAlias: withAnyAlias
        }
    };

    console.log('\n--- COMPLETE RESULTS OBJECT ---');
    console.log(JSON.stringify(results, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log('VISIONAPPRAISAL ANALYSIS COMPLETE');
    console.log('='.repeat(60));

    return results;
}

/**
 * Compare two analysis results (e.g., bypass=true vs bypass=false)
 *
 * @param {Object} baseline - Results from bypass=true run
 * @param {Object} test - Results from bypass=false run
 * @param {string} baselineLabel - Label for baseline (e.g., "BYPASS=TRUE")
 * @param {string} testLabel - Label for test (e.g., "BYPASS=FALSE")
 */
function compareAnalysisResults(baseline, test, baselineLabel = 'BASELINE', testLabel = 'TEST') {
    console.log('='.repeat(60));
    console.log('COMPARISON: ' + baselineLabel + ' vs ' + testLabel);
    console.log('='.repeat(60));

    console.log('\n--- ENTITY COUNTS ---');
    console.log(baselineLabel + ' total:', baseline.entityCounts.total);
    console.log(testLabel + ' total:', test.entityCounts.total);
    console.log('Difference:', test.entityCounts.total - baseline.entityCounts.total);

    console.log('\n--- SOURCE DISTRIBUTION ---');
    console.log(baselineLabel + ':', JSON.stringify(baseline.sourcesSummary));
    console.log(testLabel + ':', JSON.stringify(test.sourcesSummary));

    const dbDiff = test.sourcesSummary.fromDatabase - baseline.sourcesSummary.fromDatabase;
    console.log('Database source change:', dbDiff > 0 ? '+' + dbDiff : dbDiff);

    console.log('\n--- ALIAS COUNTS ---');
    console.log(baselineLabel + ':', JSON.stringify(baseline.aliasCounts));
    console.log(testLabel + ':', JSON.stringify(test.aliasCounts));

    const aliasDiff = test.aliasCounts.withAnyAlias - baseline.aliasCounts.withAnyAlias;
    console.log('Entities with aliases change:', aliasDiff > 0 ? '+' + aliasDiff : aliasDiff);

    console.log('\n' + '='.repeat(60));
}

/**
 * Track usage of IndividualNameDatabase entries across entities
 * Reports how many times each database entry was matched/assigned
 *
 * @param {Array} entities - Array of entity objects (from Bloomerang or VA file)
 * @returns {Object} Usage statistics
 */
function trackDatabaseUsage(entities) {
    if (!window.individualNameDatabase || !window.individualNameDatabase.entries) {
        console.error('IndividualNameDatabase not loaded');
        return null;
    }

    // Initialize usage counts for all database entries
    const usageCounts = new Map();
    for (const [key, entry] of window.individualNameDatabase.entries) {
        usageCounts.set(key, { count: 0, name: entry.object?.primaryAlias?.term || key });
    }

    // Count how many times each database entry is used
    let entitiesChecked = 0;
    let entitiesFromDatabase = 0;

    for (const entity of entities) {
        // Check if entity has an IndividualName (via name property with primaryAlias)
        const individualName = entity?.name;
        if (!individualName || !individualName.primaryAlias) continue;

        entitiesChecked++;

        // Check if this name came from the database
        const sourceMap = individualName.primaryAlias.sourceMap;
        if (sourceMap && sourceMap.__data && sourceMap.__data.length > 0) {
            const source = sourceMap.__data[0][0];
            if (source === 'INDIVIDUAL_NAME_DATABASE_BUILDER') {
                entitiesFromDatabase++;

                // Find which database entry this is
                const term = individualName.primaryAlias.term;
                const normalizedTerm = term?.trim()?.toUpperCase();

                // Look for matching entry
                for (const [key, entry] of window.individualNameDatabase.entries) {
                    const entryTerm = entry.object?.primaryAlias?.term?.trim()?.toUpperCase();
                    if (entryTerm === normalizedTerm) {
                        const current = usageCounts.get(key);
                        usageCounts.set(key, { ...current, count: current.count + 1 });
                        break;
                    }
                }
            }
        }
    }

    // Categorize by usage count
    let unused = 0;      // 0 times
    let usedOnce = 0;    // 1 time
    let usedMultiple = 0; // 2+ times

    const unusedNames = [];
    const multipleUseNames = [];

    for (const [key, data] of usageCounts) {
        if (data.count === 0) {
            unused++;
            unusedNames.push(data.name);
        } else if (data.count === 1) {
            usedOnce++;
        } else {
            usedMultiple++;
            multipleUseNames.push({ name: data.name, count: data.count });
        }
    }

    // Sort multiple-use by count descending
    multipleUseNames.sort((a, b) => b.count - a.count);

    console.log('='.repeat(60));
    console.log('INDIVIDUALNAME DATABASE USAGE ANALYSIS');
    console.log('='.repeat(60));
    console.log('\n--- SUMMARY ---');
    console.log('Total database entries:', usageCounts.size);
    console.log('Entities checked (Individual type):', entitiesChecked);
    console.log('Entities from database:', entitiesFromDatabase);
    console.log('\n--- USAGE DISTRIBUTION ---');
    console.log('Unused (0 matches):', unused);
    console.log('Used once (1 match):', usedOnce);
    console.log('Used multiple times (2+ matches):', usedMultiple);

    if (multipleUseNames.length > 0) {
        console.log('\n--- TOP MULTIPLE-USE ENTRIES ---');
        const top10 = multipleUseNames.slice(0, 10);
        for (const item of top10) {
            console.log(`  ${item.count}x: ${item.name}`);
        }
    }

    console.log('\n' + '='.repeat(60));

    return {
        totalEntries: usageCounts.size,
        entitiesChecked,
        entitiesFromDatabase,
        unused,
        usedOnce,
        usedMultiple,
        unusedNames,
        multipleUseNames
    };
}

/**
 * Analyze database usage from a loaded entity file
 * @param {string} fileId - Google Drive file ID
 * @param {string} fileType - 'bloomerang' or 'visionappraisal'
 */
async function analyzeDbUsageFromFile(fileId, fileType = 'bloomerang') {
    console.log('Loading file:', fileId);

    const response = await gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media'
    });

    const data = JSON.parse(response.body);

    let entities;
    if (fileType === 'bloomerang') {
        entities = Object.values(data.entities || {});
    } else {
        entities = data.entities || [];
    }

    console.log('Loaded', entities.length, 'entities from file');

    return trackDatabaseUsage(entities);
}

/**
 * Combined database usage analysis across both Bloomerang and VisionAppraisal
 * Shows which database entries are used, unused, and details for multiple-use entries
 *
 * @param {string} bloomerangFileId - Google Drive file ID for Bloomerang entities
 * @param {string} vaFileId - Google Drive file ID for VisionAppraisal entities
 */
async function analyzeCombinedDbUsage(bloomerangFileId, vaFileId) {
    if (!window.individualNameDatabase || !window.individualNameDatabase.entries) {
        console.error('IndividualNameDatabase not loaded');
        return null;
    }

    console.log('='.repeat(60));
    console.log('COMBINED DATABASE USAGE ANALYSIS');
    console.log('='.repeat(60));

    // Debug: Check database state
    console.log('Database entries type:', typeof window.individualNameDatabase.entries);
    console.log('Database entries size:', window.individualNameDatabase.entries?.size);

    // Initialize tracking for all database entries
    const usageData = new Map();
    for (const [key, entry] of window.individualNameDatabase.entries) {
        const obj = entry.object;

        // Collect all aliases for this entry
        const aliases = {
            primary: obj?.primaryAlias?.term || key,
            homonyms: [],
            synonyms: [],
            candidates: []
        };

        if (obj?.homonymAliases) {
            for (const alias of obj.homonymAliases) {
                aliases.homonyms.push(alias.term);
            }
        }
        if (obj?.synonymAliases) {
            for (const alias of obj.synonymAliases) {
                aliases.synonyms.push(alias.term);
            }
        }
        if (obj?.candidateAliases) {
            for (const alias of obj.candidateAliases) {
                aliases.candidates.push(alias.term);
            }
        }

        usageData.set(key, {
            aliases: aliases,
            usedBy: []  // Will contain {source, entityName, entityKey}
        });
    }

    // Helper to check a single IndividualName and track its database usage
    function checkIndividualName(individualName, sourceName, entityKey, context) {
        if (!individualName || !individualName.primaryAlias) {
            return { checked: false, fromDb: false };
        }

        // Check if from database
        const sourceMap = individualName.primaryAlias.sourceMap;
        if (sourceMap && sourceMap.__data && sourceMap.__data.length > 0) {
            const source = sourceMap.__data[0][0];
            if (source === 'INDIVIDUAL_NAME_DATABASE_BUILDER') {
                // Find matching database entry
                const term = individualName.primaryAlias.term;
                const normalizedTerm = term?.trim()?.toUpperCase();

                for (const [key, entry] of window.individualNameDatabase.entries) {
                    const entryTerm = entry.object?.primaryAlias?.term?.trim()?.toUpperCase();
                    if (entryTerm === normalizedTerm) {
                        const data = usageData.get(key);
                        data.usedBy.push({
                            source: sourceName,
                            entityName: term,
                            entityKey: entityKey,
                            context: context
                        });
                        break;
                    }
                }
                return { checked: true, fromDb: true };
            }
        }
        return { checked: true, fromDb: false };
    }

    // Helper to process entities and track usage
    function processEntities(entities, sourceName) {
        let standaloneChecked = 0;
        let standaloneFromDb = 0;
        let householdMembersChecked = 0;
        let householdMembersFromDb = 0;

        for (const entity of entities) {
            // Check the entity's own name (for standalone Individual entities)
            const individualName = entity?.name;
            if (individualName && individualName.primaryAlias) {
                const result = checkIndividualName(
                    individualName,
                    sourceName,
                    entity.key || entity.pid || 'unknown',
                    'Standalone'
                );
                if (result.checked) standaloneChecked++;
                if (result.fromDb) standaloneFromDb++;
            }

            // Check individuals inside AggregateHousehold entities
            if (entity?.type === 'AggregateHousehold' && entity.individuals && Array.isArray(entity.individuals)) {
                for (let i = 0; i < entity.individuals.length; i++) {
                    const member = entity.individuals[i];
                    const memberName = member?.name;
                    if (memberName && memberName.primaryAlias) {
                        const result = checkIndividualName(
                            memberName,
                            sourceName,
                            `${entity.key || entity.pid || 'unknown'}[${i}]`,
                            'HouseholdMember'
                        );
                        if (result.checked) householdMembersChecked++;
                        if (result.fromDb) householdMembersFromDb++;
                    }
                }
            }
        }

        return {
            standaloneChecked,
            standaloneFromDb,
            householdMembersChecked,
            householdMembersFromDb,
            // Combined totals for backward compatibility
            checked: standaloneChecked + householdMembersChecked,
            fromDb: standaloneFromDb + householdMembersFromDb
        };
    }

    // Load and process Bloomerang
    console.log('\nLoading Bloomerang file:', bloomerangFileId);
    const bloomerangResponse = await gapi.client.drive.files.get({
        fileId: bloomerangFileId,
        alt: 'media'
    });
    const bloomerangData = JSON.parse(bloomerangResponse.body);
    const bloomerangEntities = Object.values(bloomerangData.entities || {});
    console.log('Loaded', bloomerangEntities.length, 'Bloomerang entities');
    const bloomerangStats = processEntities(bloomerangEntities, 'Bloomerang');

    // Load and process VisionAppraisal
    console.log('\nLoading VisionAppraisal file:', vaFileId);
    const vaResponse = await gapi.client.drive.files.get({
        fileId: vaFileId,
        alt: 'media'
    });
    const vaData = JSON.parse(vaResponse.body);
    const vaEntities = vaData.entities || [];
    console.log('Loaded', vaEntities.length, 'VA entities');
    const vaStats = processEntities(vaEntities, 'VisionAppraisal');

    // Categorize results
    let unused = 0;
    let usedOnce = 0;
    let usedMultiple = 0;
    const unusedEntries = [];
    const multipleUseEntries = [];

    for (const [key, data] of usageData) {
        const count = data.usedBy.length;
        if (count === 0) {
            unused++;
            unusedEntries.push(data.aliases.primary);
        } else if (count === 1) {
            usedOnce++;
        } else {
            usedMultiple++;
            multipleUseEntries.push({
                key: key,
                count: count,
                aliases: data.aliases,
                usedBy: data.usedBy
            });
        }
    }

    // Sort multiple-use by count descending
    multipleUseEntries.sort((a, b) => b.count - a.count);

    // Output results
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log('Total database entries:', usageData.size);
    console.log('\nBloomerang:');
    console.log('  Standalone individuals checked:', bloomerangStats.standaloneChecked);
    console.log('  Standalone from database:', bloomerangStats.standaloneFromDb);
    console.log('  Household members checked:', bloomerangStats.householdMembersChecked);
    console.log('  Household members from database:', bloomerangStats.householdMembersFromDb);
    console.log('  TOTAL checked:', bloomerangStats.checked);
    console.log('  TOTAL from database:', bloomerangStats.fromDb);
    console.log('\nVisionAppraisal:');
    console.log('  Standalone individuals checked:', vaStats.standaloneChecked);
    console.log('  Standalone from database:', vaStats.standaloneFromDb);
    console.log('  Household members checked:', vaStats.householdMembersChecked);
    console.log('  Household members from database:', vaStats.householdMembersFromDb);
    console.log('  TOTAL checked:', vaStats.checked);
    console.log('  TOTAL from database:', vaStats.fromDb);

    console.log('\n' + '='.repeat(60));
    console.log('USAGE DISTRIBUTION');
    console.log('='.repeat(60));
    console.log('Unused (0 matches):', unused);
    console.log('Used once (1 match):', usedOnce);
    console.log('Used multiple times (2+ matches):', usedMultiple);

    if (multipleUseEntries.length > 0) {
        console.log('\n' + '='.repeat(60));
        console.log('MULTIPLE-USE ENTRIES (detailed)');
        console.log('='.repeat(60));

        for (const entry of multipleUseEntries) {
            console.log('\n' + '-'.repeat(50));
            console.log(`[${entry.count}x] ${entry.aliases.primary}`);

            // Show aliases
            console.log('  ALIASES:');
            console.log('    Primary:', entry.aliases.primary);
            if (entry.aliases.homonyms.length > 0) {
                console.log('    Homonyms:', entry.aliases.homonyms.join(', '));
            }
            if (entry.aliases.synonyms.length > 0) {
                console.log('    Synonyms:', entry.aliases.synonyms.join(', '));
            }
            if (entry.aliases.candidates.length > 0) {
                console.log('    Candidates:', entry.aliases.candidates.join(', '));
            }

            // Show using entities
            console.log('  USED BY:');
            for (const use of entry.usedBy) {
                const contextLabel = use.context === 'HouseholdMember' ? ' (HH member)' : '';
                console.log(`    [${use.source}] ${use.entityName} (${use.entityKey})${contextLabel}`);
            }
        }
    }

    console.log('\n' + '='.repeat(60));

    return {
        totalEntries: usageData.size,
        bloomerangStats,
        vaStats,
        unused,
        usedOnce,
        usedMultiple,
        unusedEntries,
        multipleUseEntries
    };
}

// Expose functions globally
window.analyzeBloomerangFile = analyzeBloomerangFile;
window.analyzeVisionAppraisalFile = analyzeVisionAppraisalFile;
window.compareAnalysisResults = compareAnalysisResults;
window.trackDatabaseUsage = trackDatabaseUsage;
window.analyzeDbUsageFromFile = analyzeDbUsageFromFile;
window.analyzeCombinedDbUsage = analyzeCombinedDbUsage;

console.log('Entity Source Analysis scripts loaded.');
console.log('');
console.log('Primary test functions:');
console.log('  analyzeBloomerangFile(fileId) - Complete Bloomerang analysis (fileId REQUIRED)');
console.log('  analyzeVisionAppraisalFile(fileId?) - Complete VA analysis');
console.log('  compareAnalysisResults(baseline, test, label1, label2) - Compare two runs');
console.log('');
console.log('Example usage:');
console.log('  const baselineBloomerang = await analyzeBloomerangFile("file-id-here");');
console.log('  const testBloomerang = await analyzeBloomerangFile("different-file-id");');
console.log('  compareAnalysisResults(baselineBloomerang, testBloomerang, "BYPASS=TRUE", "BYPASS=FALSE");');
