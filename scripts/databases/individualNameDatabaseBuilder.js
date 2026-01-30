/**
 * =============================================================================
 * INDIVIDUALNAME DATABASE BUILDER
 * =============================================================================
 *
 * Builds an IndividualNameDatabase by:
 * 1. Collecting all individuals from EntityGroups
 * 2. Clustering similar names using union-find algorithm
 * 3. Creating IndividualName entries with proper alias categorization
 *
 * THRESHOLD LOGIC (by reference to MATCH_CRITERIA, not hardcoded):
 * - Homonyms: similarity >= MATCH_CRITERIA.trueMatch.nameAlone
 * - Synonyms: similarity >= MATCH_CRITERIA.nearMatch.nameAlone (but < homonym threshold)
 * - Candidates: similarity < synonym threshold
 *
 * PREREQUISITES:
 * - EntityGroup database must be loaded (entityGroupBrowser.loadedDatabase)
 * - Unified entity database must be loaded (window.unifiedEntityDatabase)
 * - IndividualNameDatabase class must be loaded
 *
 * USAGE:
 *   const result = await buildIndividualNameDatabase();
 *   // Database is now populated and available at window.individualNameDatabase
 *
 * Created: January 28, 2026
 * Reference: reference_individualNameDatabasePlan.md
 * =============================================================================
 */

// =============================================================================
// THRESHOLD FUNCTIONS (by reference to MATCH_CRITERIA parameters)
// =============================================================================

/**
 * Get the homonym threshold from MATCH_CRITERIA
 * Homonyms are high-similarity matches considered the same name
 * @returns {number} Threshold value
 */
function getIndividualNameHomonymThreshold() {
    if (typeof MATCH_CRITERIA !== 'undefined' && MATCH_CRITERIA.trueMatch?.nameAlone) {
        return MATCH_CRITERIA.trueMatch.nameAlone;
    }
    throw new Error('MATCH_CRITERIA not loaded - ensure unifiedEntityBrowser.js is loaded first');
}

/**
 * Get the synonym threshold from MATCH_CRITERIA
 * Synonyms are medium-similarity matches that may be the same name (staging for review)
 * @returns {number} Threshold value
 */
function getIndividualNameSynonymThreshold() {
    if (typeof MATCH_CRITERIA !== 'undefined' && MATCH_CRITERIA.nearMatch?.nameAlone) {
        return MATCH_CRITERIA.nearMatch.nameAlone;
    }
    throw new Error('MATCH_CRITERIA not loaded - ensure unifiedEntityBrowser.js is loaded first');
}

/**
 * Categorize a similarity score into alias category
 * @param {number} score - Similarity score (0-1)
 * @returns {string} 'homonyms', 'synonyms', or 'candidates'
 */
function categorizeNameScore(score) {
    if (score >= getIndividualNameHomonymThreshold()) {
        return 'homonyms';
    } else if (score >= getIndividualNameSynonymThreshold()) {
        return 'synonyms';
    } else {
        return 'candidates';
    }
}

// =============================================================================
// MAIN BUILD FUNCTION
// =============================================================================

/**
 * Build the IndividualName database from all EntityGroups
 *
 * @param {Object} options - Build options
 * @param {boolean} [options.verbose=true] - Log progress to console
 * @param {boolean} [options.saveToGoogleDrive=false] - Save to Google Drive after building
 * @returns {Promise<Object>} Build results with statistics
 */
async function buildIndividualNameDatabase(options = {}) {
    const config = {
        verbose: true,
        saveToGoogleDrive: false,
        ...options
    };

    const log = config.verbose ? console.log.bind(console) : () => {};

    log('=== BUILDING INDIVIDUALNAME DATABASE ===');
    log(`Timestamp: ${new Date().toISOString()}`);

    // Check prerequisites
    const entityGroupDb = entityGroupBrowser?.loadedDatabase || window.entityGroupDatabase;
    if (!entityGroupDb || !entityGroupDb.groups) {
        throw new Error('No EntityGroup database loaded. Load or build one first.');
    }

    const entityDb = window.unifiedEntityDatabase?.entities;
    if (!entityDb) {
        throw new Error('No unified entity database loaded. Load it first.');
    }

    if (!window.IndividualNameDatabase) {
        throw new Error('IndividualNameDatabase class not loaded.');
    }

    // Get thresholds
    const homonymThreshold = getIndividualNameHomonymThreshold();
    const synonymThreshold = getIndividualNameSynonymThreshold();
    log(`Thresholds: homonym >= ${homonymThreshold}, synonym >= ${synonymThreshold}`);

    // Step 1: Process each EntityGroup separately (like research code)
    // Clustering happens WITHIN each group, then results aggregated
    log('\nStep 1: Processing EntityGroups (per-group clustering)...');

    const allEntries = [];
    let totalIndividuals = 0;
    let totalClusters = 0;
    let groupsProcessed = 0;
    const groups = Object.values(entityGroupDb.groups);

    for (const group of groups) {
        // Collect individuals from THIS group only
        const individuals = collectIndividualsFromGroup(group, entityDb);

        if (individuals.length === 0) continue;

        totalIndividuals += individuals.length;
        groupsProcessed++;

        if (individuals.length === 1) {
            // Single individual - create entry directly
            const entry = createSingleIndividualEntry(individuals[0]);
            if (entry) {
                allEntries.push(entry);
                totalClusters++;
            }
            continue;
        }

        // Multiple individuals - do pairwise comparisons WITHIN this group
        const pairwiseScores = calculatePairwiseScoresForGroup(individuals);

        // Cluster within this group
        const clusters = clusterByNameSimilarity(individuals, pairwiseScores, homonymThreshold);
        totalClusters += clusters.length;

        // Create entries from this group's clusters
        const groupEntries = createEntriesFromClusters(
            clusters,
            individuals,
            pairwiseScores,
            homonymThreshold,
            synonymThreshold
        );

        allEntries.push(...groupEntries);

        // Progress logging
        if (groupsProcessed % 200 === 0) {
            log(`  Processed ${groupsProcessed}/${groups.length} groups...`);
        }
    }

    log(`  Processed ${groupsProcessed} groups with individuals`);
    log(`  Total individuals: ${totalIndividuals}`);
    log(`  Total clusters: ${totalClusters}`);
    log(`  Total entries: ${allEntries.length}`);

    const entries = allEntries;

    // Step 5: Populate the database
    log('\nStep 5: Populating IndividualNameDatabase...');

    // Create a fresh database instance
    const db = new IndividualNameDatabase();

    let duplicatesResolved = 0;

    for (let entryIndex = 0; entryIndex < entries.length; entryIndex++) {
        let entry = entries[entryIndex];
        // Add to in-memory database (not saving to Drive yet)
        let primaryKey = db._normalizeKey(entry);
        const now = new Date().toISOString();

        // Check for duplicate key BEFORE adding
        if (db.entries.has(primaryKey)) {
            const existingEntry = db.entries.get(primaryKey);
            log(`\n⚠️ DUPLICATE KEY DETECTED: "${primaryKey}" (entry ${entryIndex + 1}/${entries.length})`);

            // Call the duplicate resolution dialog
            if (typeof showDuplicateResolutionDialog === 'function') {
                const result = await showDuplicateResolutionDialog(primaryKey, existingEntry.object, entry);

                if (!result || !result.resolved) {
                    throw new Error(`Build cancelled: Duplicate key "${primaryKey}" requires resolution. Dialog was closed without resolving.`);
                }

                // Use the resolved entry and new key
                entry = result.modifiedRecord;
                primaryKey = result.newKey;
                duplicatesResolved++;

                log(`✓ Resolved: new key = "${primaryKey}"`);

                // Verify new key is also unique
                if (db.entries.has(primaryKey)) {
                    throw new Error(`Resolution failed: New key "${primaryKey}" also already exists in database.`);
                }
            } else {
                // No dialog available - throw error
                throw new Error(`Duplicate key "${primaryKey}" detected but showDuplicateResolutionDialog not available. Load individualNameBrowser.js first.`);
            }
        }

        db.entries.set(primaryKey, {
            object: entry,
            fileId: null, // Will be assigned when saved to Drive
            created: now,
            lastModified: now
        });
    }

    if (duplicatesResolved > 0) {
        log(`\n${duplicatesResolved} duplicate key(s) resolved during build.`);
    }

    // Rebuild variation cache
    db._buildVariationCache();
    db._isLoaded = true;

    log(`  Database populated with ${db.size} entries`);

    // Store globally
    window.individualNameDatabase = db;

    // Step 6: Optionally save to Google Drive
    if (config.saveToGoogleDrive) {
        log('\nStep 6: Saving to Google Drive...');
        await saveIndividualNameDatabaseToDrive(db, log);
    }

    // Print statistics
    log('\n=== BUILD COMPLETE ===');
    db.printStats();

    const result = {
        entriesCreated: entries.length,
        clustersFormed: totalClusters,
        individualsProcessed: totalIndividuals,
        groupsProcessed,
        duplicatesResolved,
        homonymThreshold,
        synonymThreshold,
        savedToGoogleDrive: config.saveToGoogleDrive
    };

    log('\nResults stored in window.individualNameDatabase');
    return result;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Collect individuals from a single EntityGroup
 * (Adapted from individualIdentificationResearch.js)
 *
 * @param {EntityGroup} group - The entity group
 * @param {Object} entityDb - The unified entity database
 * @returns {Array} Array of individual objects with keys and names
 */
function collectIndividualsFromGroup(group, entityDb) {
    const individuals = [];

    for (const memberKey of group.memberKeys) {
        const entity = entityDb[memberKey];
        if (!entity) continue;

        const entityType = entity.type || entity.__type || entity.constructor?.name;

        if (entityType === 'Individual') {
            // Standalone individual entity
            if (entity.name) {
                individuals.push({
                    key: memberKey,
                    name: entity.name,
                    entity: entity,
                    source: 'standalone',
                    groupIndex: group.index
                });
            }
        } else if (entityType === 'AggregateHousehold') {
            // Individuals within household
            if (entity.individuals && Array.isArray(entity.individuals)) {
                entity.individuals.forEach((individual, index) => {
                    if (!individual || !individual.name) return;

                    const syntheticKey = `${memberKey}:individual:${index}`;
                    individuals.push({
                        key: syntheticKey,
                        name: individual.name,
                        entity: individual,
                        source: 'household',
                        parentKey: memberKey,
                        indexInParent: index,
                        groupIndex: group.index
                    });
                });
            }
        }
    }

    return individuals;
}

/**
 * Calculate pairwise name similarity scores for individuals within a single group
 * (Small N, so no batching needed)
 *
 * @param {Array} individuals - Array of individual objects from one group
 * @returns {Array} Array of {i, j, similarity} objects
 */
function calculatePairwiseScoresForGroup(individuals) {
    const scores = [];

    for (let i = 0; i < individuals.length; i++) {
        for (let j = i + 1; j < individuals.length; j++) {
            const similarity = compareNames(individuals[i].name, individuals[j].name);
            scores.push({ i, j, similarity });
        }
    }

    return scores;
}

/**
 * Create an IndividualName entry for a single individual (no clustering needed)
 * @param {Object} individual - Individual object
 * @returns {IndividualName} The created IndividualName object
 */
function createSingleIndividualEntry(individual) {
    const name = individual.name;
    if (!name) return null;

    const primaryTerm = getNameString(name);
    const firstName = name.firstName || '';
    const lastName = name.lastName || '';
    const otherNames = name.otherNames || '';

    const primaryAlias = new AttributedTerm(
        primaryTerm,
        'INDIVIDUAL_NAME_DATABASE_BUILDER',
        individual.key,
        'primary',
        'individualName'
    );

    return new IndividualName(
        primaryAlias,
        '', // title
        firstName,
        otherNames,
        lastName,
        '' // suffix
    );
}

/**
 * Compare two names and return similarity score
 * @param {Object} name1 - First name object
 * @param {Object} name2 - Second name object
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
 * Cluster individuals by name similarity using union-find algorithm
 * @param {Array} individuals - Array of individual objects
 * @param {Array} pairwiseScores - Pairwise similarity scores
 * @param {number} threshold - Clustering threshold (homonym threshold)
 * @returns {Array} Array of clusters with member indices
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

    // Union individuals whose names meet the threshold
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

    return Array.from(clusterMap.values()).map(members => ({ members }));
}

/**
 * Create IndividualName entries from clusters
 * @param {Array} clusters - Array of clusters with member indices
 * @param {Array} individuals - Array of individual objects
 * @param {Array} pairwiseScores - Pairwise similarity scores
 * @param {number} homonymThreshold - Threshold for homonyms
 * @param {number} synonymThreshold - Threshold for synonyms
 * @returns {Array<IndividualName>} Array of IndividualName objects
 */
function createEntriesFromClusters(clusters, individuals, pairwiseScores, homonymThreshold, synonymThreshold) {
    const entries = [];

    // Build score lookup map
    const scoreMap = new Map();
    for (const score of pairwiseScores) {
        scoreMap.set(`${score.i}-${score.j}`, score.similarity);
        scoreMap.set(`${score.j}-${score.i}`, score.similarity);
    }

    for (let clusterIdx = 0; clusterIdx < clusters.length; clusterIdx++) {
        const cluster = clusters[clusterIdx];
        const members = cluster.members;

        // Select key name (member with highest average similarity to others in cluster)
        const keyResult = selectKeyName(members, individuals, scoreMap);
        const keyIndividual = individuals[keyResult.keyMemberIndex];

        // Create the IndividualName entry
        const entry = createIndividualNameEntry(
            keyIndividual,
            members,
            individuals,
            scoreMap,
            homonymThreshold,
            synonymThreshold
        );

        if (entry) {
            entries.push(entry);
        }
    }

    return entries;
}

/**
 * Select the key name for a cluster (highest average similarity to others)
 * @param {Array} memberIndices - Indices into individuals array
 * @param {Array} individuals - Array of individual objects
 * @param {Map} scoreMap - Map of pairwise scores
 * @returns {Object} { keyName, keyMemberIndex }
 */
function selectKeyName(memberIndices, individuals, scoreMap) {
    if (memberIndices.length === 1) {
        const ind = individuals[memberIndices[0]];
        return {
            keyName: getNameString(ind.name),
            keyMemberIndex: memberIndices[0]
        };
    }

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

/**
 * Create an IndividualName entry from a cluster
 * @param {Object} keyIndividual - The key individual for primary alias
 * @param {Array} memberIndices - All member indices in the cluster
 * @param {Array} individuals - Array of all individuals
 * @param {Map} scoreMap - Map of pairwise scores
 * @param {number} homonymThreshold - Threshold for homonyms
 * @param {number} synonymThreshold - Threshold for synonyms
 * @returns {IndividualName} The created IndividualName object
 */
function createIndividualNameEntry(keyIndividual, memberIndices, individuals, scoreMap, homonymThreshold, synonymThreshold) {
    const keyName = keyIndividual.name;

    if (!keyName) {
        console.warn('Key individual has no name, skipping');
        return null;
    }

    // Get name components from the key individual's name
    const primaryTerm = getNameString(keyName);
    const firstName = keyName.firstName || '';
    const lastName = keyName.lastName || '';
    const otherNames = keyName.otherNames || '';

    // Create primary alias AttributedTerm
    const primaryAlias = new AttributedTerm(
        primaryTerm,
        'INDIVIDUAL_NAME_DATABASE_BUILDER',
        keyIndividual.key,
        'primary',
        'individualName'
    );

    // Create IndividualName object
    const individualName = new IndividualName(
        primaryAlias,
        '', // title
        firstName,
        otherNames,
        lastName,
        '' // suffix
    );

    // Find the key index for score lookups
    const keyIndex = memberIndices.find(idx => individuals[idx] === keyIndividual);

    // Add other members as aliases, categorized by similarity score
    const addedTerms = new Set();
    addedTerms.add(primaryTerm.toUpperCase());

    for (const memberIdx of memberIndices) {
        if (memberIdx === keyIndex) continue;

        const memberIndividual = individuals[memberIdx];
        const memberName = memberIndividual.name;
        if (!memberName) continue;

        const memberTerm = getNameString(memberName);
        const memberTermUpper = memberTerm.toUpperCase();

        // Skip if already added
        if (addedTerms.has(memberTermUpper)) continue;
        addedTerms.add(memberTermUpper);

        // Get similarity score to key
        const similarity = scoreMap.get(`${keyIndex}-${memberIdx}`) || 0;

        // Categorize based on thresholds
        let category;
        if (similarity >= homonymThreshold) {
            category = 'homonyms';
        } else if (similarity >= synonymThreshold) {
            category = 'synonyms';
        } else {
            category = 'candidates';
        }

        // Create AttributedTerm for this alias
        const aliasTerm = new AttributedTerm(
            memberTerm,
            'INDIVIDUAL_NAME_DATABASE_BUILDER',
            memberIndividual.key,
            category === 'homonyms' ? 'homonym' : (category === 'synonyms' ? 'synonym' : 'candidate'),
            'individualNameVariation'
        );

        // Add to appropriate category
        individualName.alternatives.add(aliasTerm, category);
    }

    return individualName;
}

/**
 * Get string representation of a name
 * @param {Object} name - Name object
 * @returns {string} Display string
 */
function getNameString(name) {
    if (!name) return '';

    if (name.primaryAlias?.term) {
        return name.primaryAlias.term;
    }

    if (name.term) {
        return name.term;
    }

    if (name.completeName) {
        return name.completeName;
    }

    // Try building from components
    if (name.lastName || name.firstName) {
        const parts = [name.firstName, name.otherNames, name.lastName].filter(Boolean);
        return parts.join(' ');
    }

    return '';
}

// =============================================================================
// SAVE TO GOOGLE DRIVE
// =============================================================================

/**
 * Save the IndividualName database to Google Drive
 * Creates individual files for each entry
 *
 * @param {IndividualNameDatabase} db - The database to save
 * @param {Function} log - Logging function
 */
async function saveIndividualNameDatabaseToDrive(db, log) {
    log('Saving IndividualName database to Google Drive...');

    const indexEntries = {};
    let saved = 0;
    let failed = 0;
    const errors = [];

    for (const [primaryKey, entry] of db.entries) {
        try {
            // Generate filename
            const fileName = primaryKey.replace(/\s+/g, '_').replace(/[<>:"/\\|?*]/g, '_') + '.json';

            // Create file in Google Drive
            const createResponse = await gapi.client.drive.files.create({
                resource: {
                    name: fileName,
                    mimeType: 'application/json',
                    parents: [INDIVIDUALNAME_DATABASE_FOLDER_ID]
                },
                fields: 'id'
            });

            const fileId = createResponse.result.id;

            // Upload content
            const jsonContent = serializeWithTypes(entry.object);

            const uploadResponse = await fetch(
                `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
                {
                    method: 'PATCH',
                    headers: new Headers({
                        'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                        'Content-Type': 'application/json'
                    }),
                    body: jsonContent
                }
            );

            if (!uploadResponse.ok) {
                throw new Error(`Upload failed: HTTP ${uploadResponse.status}`);
            }

            // Update entry with file ID
            entry.fileId = fileId;

            // Record in index
            const now = new Date().toISOString();
            indexEntries[primaryKey] = {
                fileId: fileId,
                created: entry.created || now,
                lastModified: now
            };

            saved++;
            if (saved % 50 === 0) {
                log(`  Saved ${saved} entries...`);
            }

        } catch (error) {
            console.error(`Failed to save "${primaryKey}":`, error);
            failed++;
            errors.push({ primaryKey, error: error.message });
        }
    }

    // Save index file
    log('Saving index file...');

    const indexData = {
        __format: 'AliasedTermDatabaseIndex',
        __version: '1.0',
        __created: new Date().toISOString(),
        __lastModified: new Date().toISOString(),
        __objectType: 'IndividualName',
        __folderFileId: INDIVIDUALNAME_DATABASE_FOLDER_ID,
        __objectCount: saved,
        __buildInfo: {
            homonymThreshold: getIndividualNameHomonymThreshold(),
            synonymThreshold: getIndividualNameSynonymThreshold(),
            builtAt: new Date().toISOString()
        },
        entries: indexEntries
    };

    const indexJson = JSON.stringify(indexData, null, 2);

    const indexResponse = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${INDIVIDUALNAME_DATABASE_INDEX_FILE_ID}?uploadType=media`,
        {
            method: 'PATCH',
            headers: new Headers({
                'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                'Content-Type': 'application/json'
            }),
            body: indexJson
        }
    );

    if (!indexResponse.ok) {
        const errorText = await indexResponse.text();
        throw new Error(`Failed to save index: HTTP ${indexResponse.status}: ${errorText}`);
    }

    log(`Save complete: ${saved} entries saved, ${failed} failed`);

    if (errors.length > 0) {
        log('Errors:');
        for (const err of errors.slice(0, 10)) {
            log(`  - ${err.primaryKey}: ${err.error}`);
        }
        if (errors.length > 10) {
            log(`  ... and ${errors.length - 10} more errors`);
        }
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

if (typeof window !== 'undefined') {
    window.buildIndividualNameDatabase = buildIndividualNameDatabase;
    window.getIndividualNameHomonymThreshold = getIndividualNameHomonymThreshold;
    window.getIndividualNameSynonymThreshold = getIndividualNameSynonymThreshold;
    window.categorizeNameScore = categorizeNameScore;
}

console.log('[individualNameDatabaseBuilder.js] Loaded.');
console.log('');
console.log('USAGE:');
console.log('  const result = await buildIndividualNameDatabase()');
console.log('    - Builds database in memory from loaded EntityGroups');
console.log('');
console.log('  const result = await buildIndividualNameDatabase({ saveToGoogleDrive: true })');
console.log('    - Builds and saves to Google Drive');
console.log('');
console.log('THRESHOLDS (from MATCH_CRITERIA):');
console.log('  getIndividualNameHomonymThreshold()  - Returns homonym threshold');
console.log('  getIndividualNameSynonymThreshold()  - Returns synonym threshold');
console.log('');
