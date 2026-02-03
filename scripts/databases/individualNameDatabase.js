/**
 * =============================================================================
 * INDIVIDUALNAME DATABASE - Implementation of AliasedTermDatabase
 * =============================================================================
 *
 * Manages the IndividualName Alias Database with individual file storage per name.
 * Extends AliasedTermDatabase to inherit all core functionality.
 *
 * GOOGLE DRIVE LOCATIONS:
 * - Index File ID: 1IcC5MiDfw23kmNFlriaaFYY9mtDoqxSC
 * - Object Folder ID: 1XdIipdWlRy7VKlOJiCt_G706JWqZZY4m
 * - Deleted Folder ID: 1Dk-hAeSEF96qsX-LoQyRZUHlYwOWKARt
 *
 * USAGE:
 *   // Create and load
 *   const db = new IndividualNameDatabase();
 *   await db.loadFromDrive();
 *
 *   // Lookup
 *   const name = db.lookupName('JOHN SMITH');  // Returns IndividualName object
 *
 *   // Check existence
 *   if (db.has('JOHN SMITH')) { ... }
 *
 *   // Get by exact primary key
 *   const name = db.get('JOHN SMITH');
 *
 *   // Add new individual name
 *   const individualName = new IndividualName(new AttributedTerm('JOHN SMITH', ...));
 *   await db.add(individualName);
 *
 *   // Change primary alias
 *   await db.changePrimaryAlias('OLD NAME', 'NEW NAME', 'homonyms');
 *
 *   // Statistics
 *   db.printStats();
 *
 * Created: January 28, 2026
 * Reference: reference_individualNameDatabasePlan.md
 * =============================================================================
 */

// Google Drive file IDs for IndividualName Database
const INDIVIDUALNAME_DATABASE_INDEX_FILE_ID = '1IcC5MiDfw23kmNFlriaaFYY9mtDoqxSC';
const INDIVIDUALNAME_DATABASE_FOLDER_ID = null;  // INTENTIONALLY NULL - use input box values
const INDIVIDUALNAME_DATABASE_DELETED_FOLDER_ID = null;  // INTENTIONALLY NULL - use input box values

/**
 * IndividualNameDatabase - Database for IndividualName Aliased objects
 * Extends AliasedTermDatabase with IndividualName-specific configuration
 */
class IndividualNameDatabase extends AliasedTermDatabase {
    /**
     * Create a new IndividualNameDatabase
     * @param {Object} [config] - Optional configuration override
     */
    constructor(config = {}) {
        super({
            objectType: 'IndividualName',
            databaseFileId: config.databaseFileId || INDIVIDUALNAME_DATABASE_INDEX_FILE_ID,
            folderFileId: config.folderFileId || INDIVIDUALNAME_DATABASE_FOLDER_ID,
            deletedFolderFileId: config.deletedFolderFileId || INDIVIDUALNAME_DATABASE_DELETED_FOLDER_ID
        });
    }

    // =========================================================================
    // KEY NORMALIZATION OVERRIDE
    // =========================================================================

    /**
     * Normalize a key for lookup/storage
     * For IndividualName, we use the primaryAlias.term as the key
     *
     * NOTE: This is a placeholder implementation. Key format may need
     * adjustment as we understand the data better during implementation.
     *
     * @param {string|IndividualName} term - Term to normalize
     * @returns {string} Normalized key
     * @override
     */
    _normalizeKey(term) {
        if (!term) return '';

        // If it's an IndividualName object, get its primaryAlias.term
        if (term.primaryAlias?.term) {
            return term.primaryAlias.term.trim().toUpperCase();
        }

        // If it's already a string
        return String(term).trim().toUpperCase();
    }

    // =========================================================================
    // INDIVIDUALNAME-SPECIFIC METHODS
    // =========================================================================

    /**
     * Look up an individual name with IndividualName-specific comparison
     * Uses parent lookup() which leverages IndividualName.compareTo() for similarity
     * @param {string} name - Name to look up
     * @param {number} [threshold=0.875] - Minimum similarity threshold (from MATCH_CRITERIA.trueMatch.nameAlone)
     * @returns {IndividualName|null}
     */
    lookupName(name, threshold = 0.875) {
        return this.lookup(name, threshold);
    }

    /**
     * Look up an existing IndividualName that matches with score >= 0.99
     * in any alias category (primary, homonym, synonym, candidate).
     *
     * Used during entity creation to reuse existing IndividualName objects
     * rather than creating duplicates.
     *
     * @param {string} term - Name to look up
     * @returns {IndividualName|null} Existing match if score >= 0.99, null otherwise
     * @throws {Error} If database is not properly loaded
     */
    lookupExisting(term) {
        // MIGRATION BYPASS: Control externally via window.BYPASS_INDIVIDUALNAME_LOOKUP
        // Set window.BYPASS_INDIVIDUALNAME_LOOKUP = true to force legacy code path
        // Set window.BYPASS_INDIVIDUALNAME_LOOKUP = false to enable actual lookup
        const CODE_DEFAULT = true;  // Default if window variable not set
        const bypassValue = (typeof window !== 'undefined' && typeof window.BYPASS_INDIVIDUALNAME_LOOKUP === 'boolean')
            ? window.BYPASS_INDIVIDUALNAME_LOOKUP
            : CODE_DEFAULT;

        // Check bypass FIRST - if bypassing, return null without checking database
        if (bypassValue) {
            return null; // Forces legacy code path for migration testing
        }

        if (!this.entries || this.entries.size === 0) {
            throw new Error('IndividualNameDatabase not loaded or empty');
        }

        const normalized = this._normalizeKey(term);

        // Fast path: exact match in variation cache
        if (this._variationCache.has(normalized)) {
            const primaryKey = this._variationCache.get(normalized);
            return this.entries.get(primaryKey)?.object || null;
        }

        // Slow path: similarity matching using compareTo()
        const MATCH_THRESHOLD = 0.99;

        for (const [, entry] of this.entries) {
            const obj = entry.object;

            if (typeof obj.compareTo === 'function') {
                const scores = obj.compareTo(term);

                if (typeof scores === 'object') {
                    if (scores.primary >= MATCH_THRESHOLD ||
                        scores.homonym >= MATCH_THRESHOLD ||
                        scores.synonym >= MATCH_THRESHOLD ||
                        scores.candidate >= MATCH_THRESHOLD) {
                        return obj;
                    }
                }
            }
        }

        return null;
    }

    /**
     * Find all individuals that match a last name
     * @param {string} lastName - Last name to search for
     * @returns {Array<IndividualName>} Matching IndividualName objects
     */
    findByLastName(lastName) {
        if (!lastName) return [];

        const normalizedLastName = lastName.trim().toUpperCase();
        const matches = [];

        for (const [, entry] of this.entries) {
            const individual = entry.object;

            // Check lastName component directly
            if (individual.lastName &&
                individual.lastName.trim().toUpperCase() === normalizedLastName) {
                matches.push(individual);
                continue;
            }

            // Also check if lastName appears in primaryAlias term
            if (individual.primaryAlias?.term &&
                individual.primaryAlias.term.toUpperCase().includes(normalizedLastName)) {
                matches.push(individual);
            }
        }

        return matches;
    }

    /**
     * Find all individuals that match a pattern
     * @param {RegExp|string} pattern - Pattern to match (string will be converted to case-insensitive regex)
     * @returns {Array<IndividualName>} Matching IndividualName objects
     */
    findByPattern(pattern) {
        const regex = typeof pattern === 'string'
            ? new RegExp(pattern, 'i')
            : pattern;

        const matches = [];

        for (const [, entry] of this.entries) {
            const individual = entry.object;

            // Check primary alias
            if (individual.primaryAlias?.term && regex.test(individual.primaryAlias.term)) {
                matches.push(individual);
                continue;
            }

            // Check name components
            if ((individual.firstName && regex.test(individual.firstName)) ||
                (individual.lastName && regex.test(individual.lastName)) ||
                (individual.otherNames && regex.test(individual.otherNames))) {
                matches.push(individual);
                continue;
            }

            // Check alternatives
            if (individual.alternatives) {
                const allTerms = [
                    ...(individual.alternatives.homonyms || []),
                    ...(individual.alternatives.synonyms || []),
                    ...(individual.alternatives.candidates || [])
                ];

                for (const alt of allTerms) {
                    if (alt?.term && regex.test(alt.term)) {
                        matches.push(individual);
                        break;
                    }
                }
            }
        }

        return matches;
    }

    /**
     * Get all individual names as a simple array of primary alias strings
     * Useful for autocomplete or dropdown lists
     * @returns {Array<string>}
     */
    getAllNames() {
        return Array.from(this.entries.values())
            .map(entry => entry.object.primaryAlias?.term)
            .filter(Boolean)
            .sort();
    }

    /**
     * Check if an individual name is known
     * @param {string} name - Name to check
     * @returns {boolean}
     */
    isKnownIndividual(name) {
        return this.has(name);
    }
}

// =============================================================================
// GLOBAL INSTANCE (for convenience)
// =============================================================================

/**
 * Global IndividualNameDatabase instance
 * Initialize with: await window.individualNameDatabase.loadFromDrive()
 */
if (typeof window !== 'undefined') {
    // Create global instance (not loaded yet)
    window.individualNameDatabase = new IndividualNameDatabase();

    // Convenience function to load the database
    window.loadIndividualNameDatabase = async function() {
        console.log('[IndividualNameDatabase] Loading from Google Drive...');
        await window.individualNameDatabase.loadFromDrive();
        console.log('[IndividualNameDatabase] Load complete.');
        window.individualNameDatabase.printStats();
        return window.individualNameDatabase;
    };
}

// =============================================================================
// EXPORTS
// =============================================================================

// Browser environment
if (typeof window !== 'undefined') {
    window.IndividualNameDatabase = IndividualNameDatabase;
    window.INDIVIDUALNAME_DATABASE_INDEX_FILE_ID = INDIVIDUALNAME_DATABASE_INDEX_FILE_ID;
    window.INDIVIDUALNAME_DATABASE_FOLDER_ID = INDIVIDUALNAME_DATABASE_FOLDER_ID;
    window.INDIVIDUALNAME_DATABASE_DELETED_FOLDER_ID = INDIVIDUALNAME_DATABASE_DELETED_FOLDER_ID;
}

// Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        IndividualNameDatabase,
        INDIVIDUALNAME_DATABASE_INDEX_FILE_ID,
        INDIVIDUALNAME_DATABASE_FOLDER_ID,
        INDIVIDUALNAME_DATABASE_DELETED_FOLDER_ID
    };
}

console.log('IndividualNameDatabase class loaded.');
console.log('');
console.log('USAGE:');
console.log('  await loadIndividualNameDatabase()              - Load from Google Drive');
console.log('  individualNameDatabase.lookupName("JOHN SMITH") - Look up a name');
console.log('  individualNameDatabase.findByLastName("SMITH")  - Find by last name');
console.log('  individualNameDatabase.getAllNames()            - Get all names');
console.log('  individualNameDatabase.printStats()             - Show statistics');
console.log('');
