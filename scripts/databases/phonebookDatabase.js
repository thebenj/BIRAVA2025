/**
 * =============================================================================
 * PHONEBOOK DATABASE - Phonebook-specific implementation
 * =============================================================================
 *
 * Manages phonebook records as a persistent database. Extends SupplementalDataDatabase
 * with phone-specific entry structure, normalization, and query methods.
 *
 * ENTRY KEY: Normalized 10-digit phone number (using PhoneTerm normalization logic).
 * Multiple phonebook records sharing the same phone number are grouped into a single
 * PhonebookEntry with an array of rawRecords.
 *
 * GOOGLE DRIVE RESOURCES:
 * - Index File ID:   (to be created during Phase 3 inaugural dataset creation)
 * - Object Folder ID: (to be created)
 * - Deleted Folder ID: (to be created)
 * - Bulk File ID:    (to be created)
 *
 * Created: February 26, 2026
 * Reference: reference_phonebookDatabasePlan.md (Phase 2)
 * =============================================================================
 */


// Google Drive file IDs — Session 126 clean rebuild
const PHONEBOOK_DATABASE_INDEX_FILE_ID = '1XsNlKJzASCk5CvZpt5IYNTSwqiWoZdjm';
const PHONEBOOK_DATABASE_FOLDER_ID = '1IYfQMgX6wf6GVHC7DRHNux6cz8orL_QM';
const PHONEBOOK_DATABASE_DELETED_FOLDER_ID = '1AGGOKozMdffjH6cp6g3nfyijLGq5X93P';
const PHONEBOOK_DATABASE_BULK_FILE_ID = '1T9ni8lCuhMnuZ8LxusLv4VNCwmlriTMs';

// OLD IDs from Session 123 inaugural build — preserved as validation reference
// Old Index:   1_JduEoBt95fyqSFDUPWHlUzA3F0P1fWz
// Old Folder:  1kPhC9hReeSNDH4pwHdD2uZ1b9r95Y8kf
// Old Deleted: 1YhqPWIAQEozfGLV2Zhp0PLnL0afl_bvf
// Old Bulk:    1nSX8OBnc_ievf4NPsAMO04rm7oQZ09nC


// =============================================================================
// PHONEBOOK ENTRY
// =============================================================================

/**
 * PhonebookEntry - A phonebook database entry keyed by normalized phone number.
 *
 * Extends SupplementalDataEntry with phone-specific fields.
 * Multiple parsed phonebook records sharing the same phone number are grouped
 * into a single entry's rawRecords array.
 */
class PhonebookEntry extends SupplementalDataEntry {
    /**
     * @param {Object} [config]
     * @param {string} [config.phoneNumber] - Normalized 10-digit phone number (the key)
     * @param {Array}  [config.rawRecords] - Parsed phonebook records sharing this number
     * @param {boolean} [config.isIslandNumber] - True if 401-466 exchange
     * @param {Array}  [config.nameVariations] - Aliased name forms found across rawRecords
     * @param {string} [config.classification] - 'person', 'nonhuman', 'unclassified'
     * @param {Array}  [config.matchAssociations] - Match associations to entity groups
     * @param {Array}  [config.exclusions] - Explicit exclusions
     * @param {Object} [config.userDeclarations] - User declaration overrides
     * @param {Object} [config.sourceMetadata] - Source file metadata
     */
    constructor(config = {}) {
        super(config);

        // Phone-specific fields
        this.phoneNumber = config.phoneNumber || null;
        this.rawRecords = config.rawRecords || [];
        this.isIslandNumber = config.isIslandNumber || false;
        this.nameVariations = config.nameVariations || [];

        // entryKey is the normalized phone number
        this.entryKey = this.phoneNumber;
    }

    /**
     * Add a parsed phonebook record to this entry
     * @param {Object} record - Parsed phonebook record from phonebookParser
     */
    addRawRecord(record) {
        this.rawRecords.push(record);
    }

    /**
     * Get all distinct name forms across rawRecords
     * @returns {Array<{lastName: string, firstName: string, secondName: string|null}>}
     */
    getDistinctNames() {
        const seen = new Set();
        const names = [];

        for (const record of this.rawRecords) {
            if (!record.name) continue;
            const key = `${record.name.lastName || ''}|${record.name.firstName || ''}|${record.name.secondName || ''}`;
            if (!seen.has(key)) {
                seen.add(key);
                names.push({
                    lastName: record.name.lastName || '',
                    firstName: record.name.firstName || '',
                    secondName: record.name.secondName || null
                });
            }
        }

        return names;
    }

    /**
     * Get all distinct addresses across rawRecords
     * @returns {Array<Object>} Address objects from records
     */
    getDistinctAddresses() {
        const seen = new Set();
        const addresses = [];

        for (const record of this.rawRecords) {
            if (!record.address) continue;
            const key = `${record.address.street || ''}|${record.address.box || ''}`;
            if (!seen.has(key)) {
                seen.add(key);
                addresses.push(record.address);
            }
        }

        return addresses;
    }
}


// =============================================================================
// PHONE NUMBER NORMALIZATION (standalone, mirrors PhoneTerm.normalizePhone)
// =============================================================================

/**
 * Normalize a phone number string to 10 digits.
 * Standalone version of PhoneTerm.normalizePhone() for use without
 * instantiating a PhoneTerm object.
 *
 * Algorithm:
 * 1. Strip all non-digit characters
 * 2. If 11 digits starting with "1", remove the leading "1"
 * 3. If 7 digits starting with "466", prepend "401" (Block Island exchange)
 * 4. If 7 digits not starting with "466", prepend "000" (off-island 7-digit)
 * 5. Result: 10-digit string
 *
 * @param {string} phone - Raw phone number string (e.g., "466-2481", "401-466-2481")
 * @returns {string} Normalized 10-digit string, or empty string if invalid
 */
function normalizePhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') return '';

    let digits = phone.replace(/\D/g, '');

    // Remove country code
    if (digits.length === 11 && digits.startsWith('1')) {
        digits = digits.substring(1);
    }

    // Expand 7-digit numbers
    if (digits.length === 7) {
        if (digits.startsWith('466')) {
            digits = '401' + digits;
        } else {
            digits = '000' + digits;
        }
    }

    return digits;
}

/**
 * Check if a normalized phone number is a Block Island number (401-466 exchange)
 * @param {string} normalized - 10-digit normalized phone string
 * @returns {boolean}
 */
function isIslandPhoneNumber(normalized) {
    return normalized.length >= 10
        && normalized.substring(0, 3) === '401'
        && normalized.substring(3, 6) === '466';
}


// =============================================================================
// PHONEBOOK DATABASE
// =============================================================================

/**
 * PhonebookDatabase - Persistent database for phonebook records.
 *
 * Extends SupplementalDataDatabase with phone-specific key normalization
 * and convenience methods.
 */
class PhonebookDatabase extends SupplementalDataDatabase {
    /**
     * @param {Object} [config] - Optional configuration override
     */
    constructor(config = {}) {
        super({
            objectType: 'Phonebook',
            databaseFileId: config.databaseFileId || PHONEBOOK_DATABASE_INDEX_FILE_ID,
            folderFileId: config.folderFileId || PHONEBOOK_DATABASE_FOLDER_ID,
            deletedFolderFileId: config.deletedFolderFileId || PHONEBOOK_DATABASE_DELETED_FOLDER_ID,
            bulkFileId: config.bulkFileId || PHONEBOOK_DATABASE_BULK_FILE_ID
        });
    }

    // =========================================================================
    // KEY MANAGEMENT OVERRIDES
    // =========================================================================

    /**
     * Normalize a phone number key.
     * @param {string} key - Raw or normalized phone number
     * @returns {string} 10-digit normalized phone string
     * @override
     */
    _normalizeKey(key) {
        if (!key) return '';
        // If already 10 digits, return as-is
        const digits = String(key).replace(/\D/g, '');
        if (digits.length === 10) return digits;
        // Otherwise run full normalization
        return normalizePhoneNumber(String(key));
    }

    /**
     * Extract the key from a PhonebookEntry.
     * @param {PhonebookEntry} entry
     * @returns {string} The phoneNumber field
     * @override
     */
    _getEntryKey(entry) {
        if (entry.phoneNumber) return entry.phoneNumber;
        if (entry.entryKey) return entry.entryKey;
        throw new Error('PhonebookEntry has no phoneNumber or entryKey');
    }

    // =========================================================================
    // ENTRY CREATION HELPERS
    // =========================================================================

    /**
     * Create a PhonebookEntry from a parsed phonebook record.
     * Normalizes the phone number and sets isIslandNumber.
     *
     * @param {Object} record - Parsed record from phonebookParser
     * @param {string} [classification='unclassified'] - Initial classification
     * @returns {PhonebookEntry}
     */
    createEntryFromRecord(record, classification = 'unclassified') {
        if (!record.phone) {
            throw new Error(`Cannot create PhonebookEntry: record has no phone (line ${record.lineNumber})`);
        }

        const normalized = normalizePhoneNumber(record.phone);
        if (normalized.length !== 10) {
            throw new Error(`Cannot normalize phone "${record.phone}" to 10 digits (got "${normalized}", line ${record.lineNumber})`);
        }

        return new PhonebookEntry({
            phoneNumber: normalized,
            rawRecords: [record],
            isIslandNumber: isIslandPhoneNumber(normalized),
            classification,
            sourceMetadata: {
                sourceFile: 'phonebook',
                parseDate: new Date().toISOString()
            }
        });
    }

    /**
     * Add a parsed record to the database.
     * If a PhonebookEntry already exists for this phone number, the record is
     * appended to its rawRecords array. Otherwise a new entry is created.
     *
     * @param {Object} record - Parsed record from phonebookParser
     * @param {string} [classification='unclassified'] - Classification for new entries
     * @returns {string} Normalized phone key
     */
    addRecord(record, classification = 'unclassified') {
        if (!record.phone) {
            throw new Error(`Cannot add record: no phone (line ${record.lineNumber})`);
        }

        const normalized = normalizePhoneNumber(record.phone);
        if (normalized.length !== 10) {
            throw new Error(`Cannot normalize phone "${record.phone}" (line ${record.lineNumber})`);
        }

        if (this.has(normalized)) {
            // Append to existing entry
            const entry = this.get(normalized);
            entry.addRawRecord(record);
            return normalized;
        } else {
            // Create new entry
            const entry = this.createEntryFromRecord(record, classification);
            return this.addEntry(entry);
        }
    }

    // =========================================================================
    // PHONE-SPECIFIC QUERIES
    // =========================================================================

    /**
     * Get all island phone entries (401-466 exchange)
     * @returns {Array<{key: string, entry: PhonebookEntry}>}
     */
    getIslandEntries() {
        const results = [];
        for (const [key, wrapper] of this.entries) {
            if (wrapper.entry.isIslandNumber) {
                results.push({ key, entry: wrapper.entry });
            }
        }
        return results;
    }

    /**
     * Get all off-island phone entries
     * @returns {Array<{key: string, entry: PhonebookEntry}>}
     */
    getOffIslandEntries() {
        const results = [];
        for (const [key, wrapper] of this.entries) {
            if (!wrapper.entry.isIslandNumber) {
                results.push({ key, entry: wrapper.entry });
            }
        }
        return results;
    }

    /**
     * Get entries that have multiple raw records (shared phone numbers)
     * @returns {Array<{key: string, entry: PhonebookEntry, recordCount: number}>}
     */
    getSharedNumberEntries() {
        const results = [];
        for (const [key, wrapper] of this.entries) {
            if (wrapper.entry.rawRecords.length > 1) {
                results.push({
                    key,
                    entry: wrapper.entry,
                    recordCount: wrapper.entry.rawRecords.length
                });
            }
        }
        return results;
    }

    /**
     * Search entries by name substring (case-insensitive)
     * @param {string} nameFragment
     * @returns {Array<{key: string, entry: PhonebookEntry}>}
     */
    searchByName(nameFragment) {
        const upper = nameFragment.toUpperCase();
        const results = [];

        for (const [key, wrapper] of this.entries) {
            for (const record of wrapper.entry.rawRecords) {
                if (record.name) {
                    const raw = (record.name.raw || '').toUpperCase();
                    const last = (record.name.lastName || '').toUpperCase();
                    const first = (record.name.firstName || '').toUpperCase();

                    if (raw.includes(upper) || last.includes(upper) || first.includes(upper)) {
                        results.push({ key, entry: wrapper.entry });
                        break; // One match per entry is enough
                    }
                }
            }
        }

        return results;
    }

    // =========================================================================
    // STATISTICS OVERRIDE
    // =========================================================================

    /**
     * Get phone-specific statistics
     * @returns {Object}
     * @override
     */
    getStats() {
        const baseStats = super.getStats();

        let islandCount = 0;
        let offIslandCount = 0;
        let totalRawRecords = 0;
        let sharedNumbers = 0;
        let couplesCount = 0;

        for (const [, wrapper] of this.entries) {
            const entry = wrapper.entry;

            if (entry.isIslandNumber) islandCount++;
            else offIslandCount++;

            totalRawRecords += entry.rawRecords.length;

            if (entry.rawRecords.length > 1) sharedNumbers++;

            for (const record of entry.rawRecords) {
                if (record.name?.isCouple) couplesCount++;
            }
        }

        return {
            ...baseStats,
            islandNumbers: islandCount,
            offIslandNumbers: offIslandCount,
            totalRawRecords,
            sharedNumbers,
            couplesCount
        };
    }

    /**
     * Print phone-specific statistics
     * @override
     */
    printStats() {
        const stats = this.getStats();
        console.log(`\n=== ${this.objectType} Database Stats ===`);
        console.log(`Entries (unique phones): ${stats.entryCount}`);
        console.log(`Total raw records: ${stats.totalRawRecords}`);
        console.log(`  Island numbers: ${stats.islandNumbers}`);
        console.log(`  Off-island numbers: ${stats.offIslandNumbers}`);
        console.log(`  Shared numbers: ${stats.sharedNumbers}`);
        console.log(`  Couples: ${stats.couplesCount}`);
        console.log(`Matched: ${stats.matched}`);
        console.log(`Unmatched: ${stats.unmatched}`);
        console.log(`With exclusions: ${stats.withExclusions}`);
        console.log(`Classifications:`);
        for (const [cls, count] of Object.entries(stats.classifications)) {
            console.log(`  ${cls}: ${count}`);
        }
        console.log(`Loaded: ${stats.isLoaded} (from: ${stats.loadedFrom || 'n/a'})`);
        console.log('================================\n');
    }
}


// =============================================================================
// EXPORTS
// =============================================================================

if (typeof window !== 'undefined') {
    window.PhonebookEntry = PhonebookEntry;
    window.PhonebookDatabase = PhonebookDatabase;
    window.normalizePhoneNumber = normalizePhoneNumber;
    window.isIslandPhoneNumber = isIslandPhoneNumber;

    window.PHONEBOOK_DATABASE_INDEX_FILE_ID = PHONEBOOK_DATABASE_INDEX_FILE_ID;
    window.PHONEBOOK_DATABASE_FOLDER_ID = PHONEBOOK_DATABASE_FOLDER_ID;
    window.PHONEBOOK_DATABASE_DELETED_FOLDER_ID = PHONEBOOK_DATABASE_DELETED_FOLDER_ID;
    window.PHONEBOOK_DATABASE_BULK_FILE_ID = PHONEBOOK_DATABASE_BULK_FILE_ID;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PhonebookEntry, PhonebookDatabase,
        normalizePhoneNumber, isIslandPhoneNumber,
        PHONEBOOK_DATABASE_INDEX_FILE_ID, PHONEBOOK_DATABASE_FOLDER_ID,
        PHONEBOOK_DATABASE_DELETED_FOLDER_ID, PHONEBOOK_DATABASE_BULK_FILE_ID
    };
}

console.log('PhonebookDatabase class loaded.');
