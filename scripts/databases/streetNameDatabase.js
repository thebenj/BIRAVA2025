/**
 * =============================================================================
 * STREETNAME DATABASE - Implementation of AliasedTermDatabase
 * =============================================================================
 *
 * Manages the StreetName Alias Database with individual file storage per street.
 * Extends AliasedTermDatabase to inherit all core functionality.
 *
 * GOOGLE DRIVE LOCATIONS:
 * - Index File ID: 1QXYBgemrQuFy_wyX1hb_4eLhb7B66J1S
 * - Object Folder ID: 1rHhgyxbiPOSw314kpo2MsFgSRQg5zQkC
 * - Deleted Folder ID: 1J7YFTy9zUW_SP1hbOeenTM2LhNmbgOUj
 *
 * USAGE:
 *   // Create and load
 *   const db = new StreetNameDatabase();
 *   await db.loadFromDrive();
 *
 *   // Lookup
 *   const street = db.lookup('CORN NECK RD');  // Returns StreetName object
 *
 *   // Check existence
 *   if (db.has('CORN NECK ROAD')) { ... }
 *
 *   // Get by exact primary key
 *   const street = db.get('CORN NECK ROAD');
 *
 *   // Add new street
 *   const streetName = new StreetName(new AttributedTerm('NEW STREET', ...));
 *   await db.add(streetName);
 *
 *   // Change primary alias
 *   await db.changePrimaryAlias('OLD NAME', 'NEW NAME', 'homonyms');
 *
 *   // Statistics
 *   db.printStats();
 *
 * Created: January 26, 2026
 * Reference: reference_aliasedTermDatabasePlan.md
 * =============================================================================
 */

// Google Drive file IDs for StreetName Database
const STREETNAME_DATABASE_INDEX_FILE_ID = '1QXYBgemrQuFy_wyX1hb_4eLhb7B66J1S';
const STREETNAME_DATABASE_FOLDER_ID = '1rHhgyxbiPOSw314kpo2MsFgSRQg5zQkC';
const STREETNAME_DATABASE_DELETED_FOLDER_ID = '1J7YFTy9zUW_SP1hbOeenTM2LhNmbgOUj';

// Legacy single-file database ID (for parallel operation during migration)
const STREETNAME_LEGACY_DATABASE_ID = '1quMdB4qAcnR4oaepSbZEmVWUqYO5_nxK';

/**
 * StreetNameDatabase - Database for StreetName Aliased objects
 * Extends AliasedTermDatabase with StreetName-specific configuration
 */
class StreetNameDatabase extends AliasedTermDatabase {
    /**
     * Create a new StreetNameDatabase
     * @param {Object} [config] - Optional configuration override
     */
    constructor(config = {}) {
        super({
            objectType: 'StreetName',
            databaseFileId: config.databaseFileId || STREETNAME_DATABASE_INDEX_FILE_ID,
            folderFileId: config.folderFileId || STREETNAME_DATABASE_FOLDER_ID,
            deletedFolderFileId: config.deletedFolderFileId || STREETNAME_DATABASE_DELETED_FOLDER_ID
        });
    }

    // =========================================================================
    // STREETNAME-SPECIFIC METHODS (if needed)
    // =========================================================================

    /**
     * Look up a street name with StreetName-specific comparison
     * Uses parent lookup() which leverages StreetName.compareTo() for similarity
     * @param {string} streetName - Street name to look up
     * @param {number} [threshold=0.80] - Minimum similarity threshold
     * @returns {StreetName|null}
     */
    lookupStreet(streetName, threshold = 0.80) {
        return this.lookup(streetName, threshold);
    }

    /**
     * Find all streets that match a pattern
     * @param {RegExp|string} pattern - Pattern to match (string will be converted to case-insensitive regex)
     * @returns {Array<StreetName>} Matching StreetName objects
     */
    findByPattern(pattern) {
        const regex = typeof pattern === 'string'
            ? new RegExp(pattern, 'i')
            : pattern;

        const matches = [];

        for (const [, entry] of this.entries) {
            const street = entry.object;

            // Check primary alias
            if (street.primaryAlias?.term && regex.test(street.primaryAlias.term)) {
                matches.push(street);
                continue;
            }

            // Check alternatives
            if (street.alternatives) {
                const allTerms = [
                    ...(street.alternatives.homonyms || []),
                    ...(street.alternatives.synonyms || []),
                    ...(street.alternatives.candidates || [])
                ];

                for (const alt of allTerms) {
                    if (alt?.term && regex.test(alt.term)) {
                        matches.push(street);
                        break;
                    }
                }
            }
        }

        return matches;
    }

    /**
     * Get all street names as a simple array of primary alias strings
     * Useful for autocomplete or dropdown lists
     * @returns {Array<string>}
     */
    getAllStreetNames() {
        return Array.from(this.entries.values())
            .map(entry => entry.object.primaryAlias?.term)
            .filter(Boolean)
            .sort();
    }

    /**
     * Check if a street name is a known Block Island street
     * @param {string} streetName - Street name to check
     * @returns {boolean}
     */
    isKnownStreet(streetName) {
        return this.has(streetName);
    }
}

// =============================================================================
// GLOBAL INSTANCE (for convenience)
// =============================================================================

/**
 * Global StreetNameDatabase instance
 * Initialize with: await window.streetNameDatabase.loadFromDrive()
 */
if (typeof window !== 'undefined') {
    // Create global instance (not loaded yet)
    window.streetNameDatabase = new StreetNameDatabase();

    // Convenience function to load the database
    window.loadStreetNameDatabase = async function() {
        console.log('[StreetNameDatabase] Loading from Google Drive...');
        await window.streetNameDatabase.loadFromDrive();
        console.log('[StreetNameDatabase] Load complete.');
        window.streetNameDatabase.printStats();
        return window.streetNameDatabase;
    };
}

// =============================================================================
// EXPORTS
// =============================================================================

// Browser environment
if (typeof window !== 'undefined') {
    window.StreetNameDatabase = StreetNameDatabase;
    window.STREETNAME_DATABASE_INDEX_FILE_ID = STREETNAME_DATABASE_INDEX_FILE_ID;
    window.STREETNAME_DATABASE_FOLDER_ID = STREETNAME_DATABASE_FOLDER_ID;
    window.STREETNAME_DATABASE_DELETED_FOLDER_ID = STREETNAME_DATABASE_DELETED_FOLDER_ID;
    window.STREETNAME_LEGACY_DATABASE_ID = STREETNAME_LEGACY_DATABASE_ID;
}

// Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        StreetNameDatabase,
        STREETNAME_DATABASE_INDEX_FILE_ID,
        STREETNAME_DATABASE_FOLDER_ID,
        STREETNAME_DATABASE_DELETED_FOLDER_ID,
        STREETNAME_LEGACY_DATABASE_ID
    };
}

// =============================================================================
// MIGRATION FUNCTIONS (Preserved for VA reconciliation workflow template)
// =============================================================================

/**
 * Preview the migration from legacy single-file database to individual files
 * Shows what would be migrated without making changes
 *
 * NOTE: This function requires the legacy database to be loaded with its original
 * structure (streetNames array, variationToStreetName map). After Phase 6 migration,
 * the legacy database is no longer loaded in that format.
 *
 * FUTURE USE: This can serve as a template for VA reconciliation workflow that
 * compares newly downloaded VA streets against the current individual-file database.
 *
 * @returns {Promise<Object>} Preview information
 */
async function previewStreetNameMigration() {
    console.log('\n=== STREETNAME DATABASE MIGRATION PREVIEW ===\n');

    // Check if legacy database is loaded with original structure
    if (!window.blockIslandStreetDatabase || !window.blockIslandStreetDatabase.streetNames) {
        console.log('[MIGRATION] Legacy database not loaded in original format.');
        console.log('[MIGRATION] After Phase 6, use previewVAReconciliation() instead.');
        return null;
    }

    const legacyDb = window.blockIslandStreetDatabase;
    const streetNames = legacyDb.streetNames;

    console.log(`[MIGRATION] Legacy database version: ${legacyDb.version}`);
    console.log(`[MIGRATION] Legacy database created: ${legacyDb.created}`);
    console.log(`[MIGRATION] Streets to migrate: ${streetNames.length}`);

    // Analyze the data
    let totalHomonyms = 0;
    let totalSynonyms = 0;
    let totalCandidates = 0;

    for (const street of streetNames) {
        totalHomonyms += street.alternatives?.homonyms?.length || 0;
        totalSynonyms += street.alternatives?.synonyms?.length || 0;
        totalCandidates += street.alternatives?.candidates?.length || 0;
    }

    console.log(`[MIGRATION] Total homonyms: ${totalHomonyms}`);
    console.log(`[MIGRATION] Total synonyms: ${totalSynonyms}`);
    console.log(`[MIGRATION] Total candidates: ${totalCandidates}`);

    // Show first 5 streets as sample
    console.log('\n--- Sample Streets (first 5) ---');
    for (let i = 0; i < Math.min(5, streetNames.length); i++) {
        const s = streetNames[i];
        const h = s.alternatives?.homonyms?.length || 0;
        const syn = s.alternatives?.synonyms?.length || 0;
        const c = s.alternatives?.candidates?.length || 0;
        console.log(`  ${i + 1}. "${s.primaryAlias?.term}" (${h} homonyms, ${syn} synonyms, ${c} candidates)`);
    }

    console.log('\n--- Migration Target ---');
    console.log(`Index file: ${STREETNAME_DATABASE_INDEX_FILE_ID}`);
    console.log(`Object folder: ${STREETNAME_DATABASE_FOLDER_ID}`);
    console.log(`Deleted folder: ${STREETNAME_DATABASE_DELETED_FOLDER_ID}`);

    console.log('\n=== To perform migration, run: await migrateStreetNameDatabase() ===\n');

    return {
        streetCount: streetNames.length,
        totalHomonyms,
        totalSynonyms,
        totalCandidates,
        legacyVersion: legacyDb.version,
        legacyCreated: legacyDb.created
    };
}

/**
 * Migrate from legacy single-file database to individual files
 * Creates individual files for each StreetName and updates the index
 *
 * NOTE: This was used for the one-time migration from legacy to individual files.
 * After Phase 6, the legacy database is no longer loaded.
 *
 * FUTURE USE: Template for VA reconciliation - creating new StreetName files
 * when VA download contains streets not in the current database.
 *
 * @returns {Promise<Object>} Migration results
 */
async function migrateStreetNameDatabase() {
    console.log('\n=== STREETNAME DATABASE MIGRATION ===\n');

    // Check if legacy database is loaded with original structure
    if (!window.blockIslandStreetDatabase || !window.blockIslandStreetDatabase.streetNames) {
        console.log('[MIGRATION] Legacy database not loaded in original format.');
        console.log('[MIGRATION] Migration already complete. Use VA reconciliation workflow instead.');
        return null;
    }

    const legacyDb = window.blockIslandStreetDatabase;
    const streetNames = legacyDb.streetNames;

    console.log(`[MIGRATION] Migrating ${streetNames.length} streets...`);

    // Track migration progress
    let created = 0;
    let failed = 0;
    const errors = [];
    const indexEntries = {};

    // Process each street
    for (let i = 0; i < streetNames.length; i++) {
        const street = streetNames[i];
        const primaryKey = street.primaryAlias?.term?.trim().toUpperCase();

        if (!primaryKey) {
            console.warn(`[MIGRATION] Skipping street ${i}: no primary alias`);
            failed++;
            errors.push({ index: i, error: 'No primary alias' });
            continue;
        }

        try {
            // Generate filename
            const fileName = primaryKey.replace(/\s+/g, '_').replace(/[<>:"/\\|?*]/g, '_') + '.json';

            // Create file in Google Drive
            console.log(`[MIGRATION] Creating file for "${primaryKey}"...`);

            const createResponse = await gapi.client.drive.files.create({
                resource: {
                    name: fileName,
                    mimeType: 'application/json',
                    parents: [STREETNAME_DATABASE_FOLDER_ID]
                },
                fields: 'id'
            });

            const fileId = createResponse.result.id;

            // Upload content using serializeWithTypes
            const jsonContent = serializeWithTypes(street);

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

            // Record in index
            const now = new Date().toISOString();
            indexEntries[primaryKey] = {
                fileId: fileId,
                created: now,
                lastModified: now
            };

            created++;
            console.log(`[MIGRATION] Created ${created}/${streetNames.length}: "${primaryKey}" → ${fileId}`);

        } catch (error) {
            console.error(`[MIGRATION] Failed to migrate "${primaryKey}":`, error);
            failed++;
            errors.push({ primaryKey, error: error.message });
        }
    }

    // Create the index file content
    console.log('\n[MIGRATION] Creating index file...');

    const indexData = {
        __format: 'AliasedTermDatabaseIndex',
        __version: '1.0',
        __created: new Date().toISOString(),
        __lastModified: new Date().toISOString(),
        __objectType: 'StreetName',
        __folderFileId: STREETNAME_DATABASE_FOLDER_ID,
        __objectCount: created,
        __migratedFrom: {
            fileId: STREETNAME_LEGACY_DATABASE_ID,
            version: legacyDb.version,
            created: legacyDb.created
        },
        entries: indexEntries
    };

    // Upload index file
    const indexJson = JSON.stringify(indexData, null, 2);

    const indexResponse = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${STREETNAME_DATABASE_INDEX_FILE_ID}?uploadType=media`,
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

    console.log('[MIGRATION] Index file saved.');

    // Summary
    console.log('\n=== MIGRATION COMPLETE ===');
    console.log(`Streets migrated: ${created}`);
    console.log(`Failed: ${failed}`);
    if (errors.length > 0) {
        console.log('Errors:');
        for (const err of errors) {
            console.log(`  - ${err.primaryKey || `Index ${err.index}`}: ${err.error}`);
        }
    }

    console.log('\nTo verify, run: await loadStreetNameDatabase()');

    return {
        created,
        failed,
        errors,
        indexFileId: STREETNAME_DATABASE_INDEX_FILE_ID
    };
}

/**
 * Verify migration by comparing legacy and new databases
 *
 * NOTE: After Phase 6, the legacy database is no longer loaded in original format.
 * This function will not work after full migration.
 *
 * @returns {Promise<Object>} Verification results
 */
async function verifyStreetNameMigration() {
    console.log('\n=== STREETNAME DATABASE MIGRATION VERIFICATION ===\n');

    // Check if legacy database has original structure
    if (!window.blockIslandStreetDatabase || !window.blockIslandStreetDatabase.streetNames) {
        console.log('[VERIFY] Legacy database not loaded in original format.');
        console.log('[VERIFY] After Phase 6, legacy verification is not available.');
        console.log('[VERIFY] The new database is now the authoritative source.');
        return null;
    }

    // Load new database
    console.log('[VERIFY] Loading new database...');
    await window.streetNameDatabase.loadFromDrive();

    const legacyDb = window.blockIslandStreetDatabase;
    const newDb = window.streetNameDatabase;

    console.log(`[VERIFY] Legacy streets: ${legacyDb.streetNames.length}`);
    console.log(`[VERIFY] New database entries: ${newDb.size}`);

    // Check each legacy street exists in new database
    let matched = 0;
    let missing = [];

    for (const legacyStreet of legacyDb.streetNames) {
        const primaryKey = legacyStreet.primaryAlias?.term?.trim().toUpperCase();
        if (!primaryKey) continue;

        const newStreet = newDb.get(primaryKey);
        if (newStreet) {
            matched++;
        } else {
            missing.push(primaryKey);
        }
    }

    console.log(`\n[VERIFY] Matched: ${matched}`);
    console.log(`[VERIFY] Missing: ${missing.length}`);

    if (missing.length > 0) {
        console.log('[VERIFY] Missing streets:');
        for (const m of missing) {
            console.log(`  - "${m}"`);
        }
    }

    // Compare lookup results
    console.log('\n--- Lookup Comparison (sample) ---');
    const testTerms = ['CORN NECK RD', 'OLD TOWN ROAD', 'BEACH AVE'];

    for (const term of testTerms) {
        const legacyResult = legacyDb.lookup(term);
        const newResult = newDb.lookup(term);

        const legacyPrimary = legacyResult?.primaryAlias?.term || 'NOT FOUND';
        const newPrimary = newResult?.primaryAlias?.term || 'NOT FOUND';

        const match = legacyPrimary === newPrimary ? '✓' : '✗';
        console.log(`  "${term}" → Legacy: "${legacyPrimary}", New: "${newPrimary}" ${match}`);
    }

    console.log('\n=== VERIFICATION COMPLETE ===\n');

    return {
        legacyCount: legacyDb.streetNames.length,
        newCount: newDb.size,
        matched,
        missing
    };
}

// Export migration functions
if (typeof window !== 'undefined') {
    window.previewStreetNameMigration = previewStreetNameMigration;
    window.migrateStreetNameDatabase = migrateStreetNameDatabase;
    window.verifyStreetNameMigration = verifyStreetNameMigration;
}

// =============================================================================
// PARALLEL OPERATION (Preserved for testing/debugging)
// =============================================================================

/**
 * Parallel operation state and logging
 *
 * NOTE: After Phase 6, the legacy database is aliased to the new database,
 * so parallel comparison is no longer meaningful. These tools are preserved
 * for potential future debugging needs.
 */
const parallelOperationState = {
    enabled: false,
    logDiscrepancies: true,
    discrepancies: [],
    lookupCount: 0,
    matchCount: 0
};

/**
 * Enable parallel operation mode
 * Both old and new databases will be queried on each lookup
 *
 * NOTE: After Phase 6, this requires manually loading the legacy database
 * from its original file to be meaningful.
 */
async function enableParallelOperation() {
    console.log('[PARALLEL] Enabling parallel operation mode...');

    // Check if legacy database has original structure
    if (!window.blockIslandStreetDatabase || !window.blockIslandStreetDatabase.streetNames) {
        console.log('[PARALLEL] WARNING: Legacy database not in original format.');
        console.log('[PARALLEL] After Phase 6, blockIslandStreetDatabase is aliased to streetNameDatabase.');
        console.log('[PARALLEL] Parallel comparison will show identical results.');
    }

    // Ensure new database is loaded
    if (!window.streetNameDatabase._isLoaded) {
        console.log('[PARALLEL] Loading new database...');
        await window.streetNameDatabase.loadFromDrive();
    }

    parallelOperationState.enabled = true;
    parallelOperationState.discrepancies = [];
    parallelOperationState.lookupCount = 0;
    parallelOperationState.matchCount = 0;

    console.log('[PARALLEL] Parallel operation enabled.');
    console.log('[PARALLEL] Use parallelLookup(term) to query both databases.');
    console.log('[PARALLEL] Use getParallelOperationReport() to see results.');
}

/**
 * Disable parallel operation mode
 */
function disableParallelOperation() {
    parallelOperationState.enabled = false;
    console.log('[PARALLEL] Parallel operation disabled.');
}

/**
 * Perform a lookup on both databases and compare results
 * @param {string} term - Street name to look up
 * @param {number} [threshold=0.80] - Similarity threshold
 * @returns {Object} Comparison result
 */
function parallelLookup(term, threshold = 0.80) {
    if (!parallelOperationState.enabled) {
        console.warn('[PARALLEL] Parallel operation not enabled. Call enableParallelOperation() first.');
        return null;
    }

    const legacyDb = window.blockIslandStreetDatabase;
    const newDb = window.streetNameDatabase;

    // Query both databases
    const legacyResult = legacyDb.lookup(term, threshold);
    const newResult = newDb.lookup(term, threshold);

    // Extract primary aliases
    const legacyPrimary = legacyResult?.primaryAlias?.term || null;
    const newPrimary = newResult?.primaryAlias?.term || null;

    // Check for match
    const isMatch = legacyPrimary === newPrimary;

    // Update statistics
    parallelOperationState.lookupCount++;
    if (isMatch) {
        parallelOperationState.matchCount++;
    }

    // Log and record discrepancy if different
    if (!isMatch && parallelOperationState.logDiscrepancies) {
        const discrepancy = {
            term: term,
            legacyResult: legacyPrimary,
            newResult: newPrimary,
            timestamp: new Date().toISOString()
        };
        parallelOperationState.discrepancies.push(discrepancy);

        console.warn(`[PARALLEL DISCREPANCY] "${term}" -> Legacy: "${legacyPrimary || 'NOT FOUND'}", New: "${newPrimary || 'NOT FOUND'}"`);
    }

    return {
        term: term,
        legacyResult: legacyResult,
        newResult: newResult,
        legacyPrimary: legacyPrimary,
        newPrimary: newPrimary,
        isMatch: isMatch
    };
}

/**
 * Run a comprehensive comparison of all streets
 * @returns {Object} Full comparison report
 */
function runFullParallelComparison() {
    if (!parallelOperationState.enabled) {
        console.warn('[PARALLEL] Parallel operation not enabled. Call enableParallelOperation() first.');
        return null;
    }

    console.log('\n=== FULL PARALLEL COMPARISON ===\n');

    const legacyDb = window.blockIslandStreetDatabase;

    // Check if legacy has original structure
    if (!legacyDb.streetNames) {
        console.log('[PARALLEL] Legacy database not in original format.');
        console.log('[PARALLEL] Testing with new database entries instead...');

        // Use new database entries
        for (const [, entry] of window.streetNameDatabase.entries) {
            parallelLookup(entry.object.primaryAlias?.term);
        }

        return getParallelOperationReport();
    }

    // Test all legacy primary aliases
    console.log('[PARALLEL] Testing all legacy primary aliases...');
    for (const street of legacyDb.streetNames) {
        const term = street.primaryAlias?.term;
        if (term) {
            parallelLookup(term);
        }
    }

    // Test all variations (homonyms)
    console.log('[PARALLEL] Testing all legacy variations (homonyms)...');
    for (const street of legacyDb.streetNames) {
        const homonyms = street.alternatives?.homonyms || [];
        for (const h of homonyms) {
            if (h?.term) {
                parallelLookup(h.term);
            }
        }
    }

    // Test some common abbreviations and variations
    console.log('[PARALLEL] Testing common variations...');
    const testCases = [
        'CORN NECK RD', 'CORN NECK ROAD', 'CORN NECK',
        'OLD TOWN RD', 'OLD TOWN ROAD',
        'BEACH AVE', 'BEACH AVENUE',
        'CENTER RD', 'CENTER ROAD',
        'SPRING ST', 'SPRING STREET'
    ];

    for (const term of testCases) {
        parallelLookup(term);
    }

    // Generate report
    const report = getParallelOperationReport();
    return report;
}

/**
 * Get parallel operation statistics and discrepancy report
 * @returns {Object} Report
 */
function getParallelOperationReport() {
    const state = parallelOperationState;

    console.log('\n=== PARALLEL OPERATION REPORT ===');
    console.log(`Enabled: ${state.enabled}`);
    console.log(`Total lookups: ${state.lookupCount}`);
    console.log(`Matches: ${state.matchCount}`);
    console.log(`Discrepancies: ${state.discrepancies.length}`);

    if (state.lookupCount > 0) {
        const matchRate = ((state.matchCount / state.lookupCount) * 100).toFixed(2);
        console.log(`Match rate: ${matchRate}%`);
    }

    if (state.discrepancies.length > 0) {
        console.log('\n--- Discrepancies ---');
        for (const d of state.discrepancies) {
            console.log(`  "${d.term}" -> Legacy: "${d.legacyResult || 'NOT FOUND'}", New: "${d.newResult || 'NOT FOUND'}"`);
        }
    }

    console.log('================================\n');

    return {
        enabled: state.enabled,
        lookupCount: state.lookupCount,
        matchCount: state.matchCount,
        discrepancyCount: state.discrepancies.length,
        matchRate: state.lookupCount > 0 ? (state.matchCount / state.lookupCount) : 1,
        discrepancies: [...state.discrepancies]
    };
}

/**
 * Clear parallel operation statistics
 */
function clearParallelStats() {
    parallelOperationState.discrepancies = [];
    parallelOperationState.lookupCount = 0;
    parallelOperationState.matchCount = 0;
    console.log('[PARALLEL] Statistics cleared.');
}

// Export parallel operation functions
if (typeof window !== 'undefined') {
    window.enableParallelOperation = enableParallelOperation;
    window.disableParallelOperation = disableParallelOperation;
    window.parallelLookup = parallelLookup;
    window.runFullParallelComparison = runFullParallelComparison;
    window.getParallelOperationReport = getParallelOperationReport;
    window.clearParallelStats = clearParallelStats;
}

console.log('StreetNameDatabase class loaded.');
console.log('');
console.log('USAGE:');
console.log('  await loadStreetNameDatabase()           - Load from Google Drive');
console.log('  streetNameDatabase.lookup("CORN NECK")   - Look up a street');
console.log('  streetNameDatabase.getAllStreetNames()   - Get all street names');
console.log('  streetNameDatabase.printStats()          - Show statistics');
console.log('');
console.log('MIGRATION (preserved as template for VA reconciliation):');
console.log('  await previewStreetNameMigration()       - Preview migration');
console.log('  await migrateStreetNameDatabase()        - Run migration');
console.log('  await verifyStreetNameMigration()        - Verify migration');
console.log('');
console.log('PARALLEL OPERATION (for testing/debugging):');
console.log('  await enableParallelOperation()          - Enable parallel mode');
console.log('  parallelLookup("CORN NECK")              - Query both databases');
console.log('  runFullParallelComparison()              - Test all streets');
console.log('  getParallelOperationReport()             - Show results');
