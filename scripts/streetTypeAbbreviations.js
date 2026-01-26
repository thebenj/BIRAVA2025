/**
 * =============================================================================
 * STREET TYPE ABBREVIATION TABLE MANAGER
 * =============================================================================
 *
 * PURPOSE:
 * Manages a table that maps street type abbreviations to their full forms.
 * Example: "RD" → "ROAD", "AVE" → "AVENUE"
 *
 * This table is used by the street name converter (streetNameDatabaseConverter.js)
 * to expand abbreviations BEFORE comparing two street names for similarity.
 * This ensures "CORN NECK RD" and "CORN NECK ROAD" are recognized as equivalent.
 *
 * WHY IT EXISTS:
 * When comparing streets from the streets.json database, we need consistent
 * comparison. Street names may appear with different abbreviations or full forms.
 * By expanding all abbreviations to full forms before comparison, we get
 * accurate similarity scores regardless of how the street type was written.
 *
 * STORAGE:
 * The table is stored as JSON on Google Drive (file ID below) so it persists
 * across browser sessions and can be edited over time as new abbreviations
 * are discovered.
 *
 * Format on Google Drive:
 * {
 *   "abbreviations": {
 *     "RD": "ROAD",
 *     "AVE": "AVENUE",
 *     ...
 *   },
 *   "metadata": {
 *     "lastUpdated": "2026-01-10T...",
 *     "version": 1
 *   }
 * }
 *
 * -----------------------------------------------------------------------------
 * USAGE PATTERNS:
 * -----------------------------------------------------------------------------
 *
 * FIRST-TIME SETUP (run once to populate the Google Drive file):
 *   StreetTypeAbbreviationManager.initializeDefaults()  // Create default table
 *   StreetTypeAbbreviationManager.display()             // Verify it looks right
 *   await StreetTypeAbbreviationManager.saveToDrive()   // Save to Google Drive
 *
 * NORMAL SESSION (load the saved table):
 *   await StreetTypeAbbreviationManager.loadFromDrive()
 *
 * VIEW THE TABLE:
 *   StreetTypeAbbreviationManager.display()      // Grouped: ROAD: RD, RD.
 *   StreetTypeAbbreviationManager.displayFlat()  // Flat: RD → ROAD
 *
 * ADD/MODIFY/DELETE (remember to save after changes):
 *   StreetTypeAbbreviationManager.addAbbreviation('BLVD', 'BOULEVARD')
 *   StreetTypeAbbreviationManager.addAbbreviationsForFullForm('ROAD', ['RD', 'RD.'])
 *   StreetTypeAbbreviationManager.deleteAbbreviation('RD.')
 *   StreetTypeAbbreviationManager.deleteAllForFullForm('ROAD')
 *   await StreetTypeAbbreviationManager.saveToDrive()  // Persist changes
 *
 * EXPANSION (used internally by converter):
 *   StreetTypeAbbreviationManager.expandStreetName('CORN NECK RD')
 *   // Returns: 'CORN NECK ROAD'
 *
 * -----------------------------------------------------------------------------
 * FUTURE: HTML INTERFACE
 * -----------------------------------------------------------------------------
 * This manager is designed to support a future HTML UI for table management.
 * Key methods for UI integration:
 *   - display() / displayFlat() / toFormattedString() for showing current state
 *   - addAbbreviation(), deleteAbbreviation(), updateAbbreviation() for editing
 *   - loadFromDrive(), saveToDrive() for persistence
 *   - getAbbreviationsFor() to show all abbreviations for a given full form
 *
 * Google Drive File ID: 1JAyj8bhJC3jL6wL8NvGGZsknyLos--XS
 * =============================================================================
 */

// Google Drive file ID for the street type abbreviation table
const STREET_TYPE_ABBREV_FILE_ID = '1JAyj8bhJC3jL6wL8NvGGZsknyLos--XS';

/**
 * Street Type Abbreviation Manager
 * Singleton object for managing street type abbreviations
 */
const StreetTypeAbbreviationManager = {
    // The abbreviation table: abbreviation (uppercase) → full form (uppercase)
    abbreviations: {},

    // Metadata about the table
    metadata: {
        lastUpdated: null,
        version: 1
    },

    // Flag to track if loaded from Drive
    isLoaded: false,

    // =========================================================================
    // INITIALIZATION WITH DEFAULT VALUES
    // =========================================================================

    /**
     * Initialize with default abbreviations
     * Call this to set up initial values before saving to Drive
     */
    initializeDefaults: function() {
        this.abbreviations = {
            // Road types
            'RD': 'ROAD',
            'RD.': 'ROAD',
            'AVE': 'AVENUE',
            'AVE.': 'AVENUE',
            'AV': 'AVENUE',
            'ST': 'STREET',
            'ST.': 'STREET',
            'DR': 'DRIVE',
            'DR.': 'DRIVE',
            'LN': 'LANE',
            'LN.': 'LANE',
            'CT': 'COURT',
            'CT.': 'COURT',
            'CIR': 'CIRCLE',
            'PL': 'PLACE',
            'PL.': 'PLACE',
            'TRL': 'TRAIL',
            'TR': 'TRAIL',
            'TER': 'TERRACE',
            'TERR': 'TERRACE',
            'BLVD': 'BOULEVARD',
            'HWY': 'HIGHWAY',
            'EXT': 'EXTENSION',
            'EXTN': 'EXTENSION',
            'WY': 'WAY',
            'PKY': 'PARKWAY',
            'PKWY': 'PARKWAY'
        };

        this.metadata = {
            lastUpdated: new Date().toISOString(),
            version: 1
        };

        this.isLoaded = true;
        console.log('[StreetTypeAbbrev] Initialized with default abbreviations');
        return this;
    },

    // =========================================================================
    // GOOGLE DRIVE LOAD/SAVE
    // =========================================================================

    /**
     * Load the abbreviation table from Google Drive
     * @returns {Promise<Object>} The loaded abbreviation manager
     */
    loadFromDrive: async function() {
        console.log('[StreetTypeAbbrev] Loading from Google Drive...');

        try {
            const response = await gapi.client.drive.files.get({
                fileId: STREET_TYPE_ABBREV_FILE_ID,
                alt: 'media'
            });

            const data = JSON.parse(response.body);

            if (data.abbreviations) {
                this.abbreviations = data.abbreviations;
            }
            if (data.metadata) {
                this.metadata = data.metadata;
            }

            this.isLoaded = true;
            console.log(`[StreetTypeAbbrev] Loaded ${Object.keys(this.abbreviations).length} abbreviations from Drive`);
            console.log(`[StreetTypeAbbrev] Last updated: ${this.metadata.lastUpdated}`);

            return this;
        } catch (error) {
            console.error('[StreetTypeAbbrev] Error loading from Drive:', error);

            // If file doesn't exist or is empty, initialize with defaults
            if (error.status === 404 || error.message?.includes('not found')) {
                console.log('[StreetTypeAbbrev] File not found, initializing with defaults...');
                return this.initializeDefaults();
            }

            throw error;
        }
    },

    /**
     * Save the abbreviation table to Google Drive
     * @returns {Promise<void>}
     */
    saveToDrive: async function() {
        console.log('[StreetTypeAbbrev] Saving to Google Drive...');

        // Update metadata
        this.metadata.lastUpdated = new Date().toISOString();
        this.metadata.version = (this.metadata.version || 0) + 1;

        const data = {
            abbreviations: this.abbreviations,
            metadata: this.metadata
        };

        const content = JSON.stringify(data, null, 2);
        const blob = new Blob([content], { type: 'application/json' });

        try {
            // Update existing file
            await gapi.client.request({
                path: `/upload/drive/v3/files/${STREET_TYPE_ABBREV_FILE_ID}`,
                method: 'PATCH',
                params: { uploadType: 'media' },
                body: content
            });

            console.log(`[StreetTypeAbbrev] Saved ${Object.keys(this.abbreviations).length} abbreviations to Drive`);
            console.log(`[StreetTypeAbbrev] Version: ${this.metadata.version}`);

        } catch (error) {
            console.error('[StreetTypeAbbrev] Error saving to Drive:', error);
            throw error;
        }
    },

    // =========================================================================
    // CRUD OPERATIONS
    // =========================================================================

    /**
     * Add a new abbreviation → full form mapping
     * @param {string} abbreviation - The abbreviation (e.g., "RD")
     * @param {string} fullForm - The full form (e.g., "ROAD")
     * @returns {Object} this (for chaining)
     */
    addAbbreviation: function(abbreviation, fullForm) {
        const abbrevUpper = abbreviation.toUpperCase().trim();
        const fullUpper = fullForm.toUpperCase().trim();

        if (!abbrevUpper || !fullUpper) {
            console.error('[StreetTypeAbbrev] Cannot add empty abbreviation or full form');
            return this;
        }

        if (this.abbreviations[abbrevUpper]) {
            console.warn(`[StreetTypeAbbrev] Abbreviation "${abbrevUpper}" already exists, mapping to "${this.abbreviations[abbrevUpper]}". Use updateAbbreviation() to change.`);
            return this;
        }

        this.abbreviations[abbrevUpper] = fullUpper;
        console.log(`[StreetTypeAbbrev] Added: "${abbrevUpper}" → "${fullUpper}"`);

        return this;
    },

    /**
     * Add multiple abbreviations that expand to the same full form
     * @param {string} fullForm - The full form (e.g., "ROAD")
     * @param {Array<string>} abbreviations - Array of abbreviations (e.g., ["RD", "RD."])
     * @returns {Object} this (for chaining)
     */
    addAbbreviationsForFullForm: function(fullForm, abbreviations) {
        const fullUpper = fullForm.toUpperCase().trim();

        if (!fullUpper) {
            console.error('[StreetTypeAbbrev] Cannot add abbreviations for empty full form');
            return this;
        }

        let added = 0;
        for (const abbrev of abbreviations) {
            const abbrevUpper = abbrev.toUpperCase().trim();
            if (abbrevUpper && !this.abbreviations[abbrevUpper]) {
                this.abbreviations[abbrevUpper] = fullUpper;
                added++;
            }
        }

        console.log(`[StreetTypeAbbrev] Added ${added} abbreviations for "${fullUpper}"`);
        return this;
    },

    /**
     * Update an existing abbreviation's full form
     * @param {string} abbreviation - The abbreviation to update
     * @param {string} newFullForm - The new full form
     * @returns {Object} this (for chaining)
     */
    updateAbbreviation: function(abbreviation, newFullForm) {
        const abbrevUpper = abbreviation.toUpperCase().trim();
        const fullUpper = newFullForm.toUpperCase().trim();

        if (!this.abbreviations[abbrevUpper]) {
            console.warn(`[StreetTypeAbbrev] Abbreviation "${abbrevUpper}" not found. Use addAbbreviation() to add.`);
            return this;
        }

        const oldFullForm = this.abbreviations[abbrevUpper];
        this.abbreviations[abbrevUpper] = fullUpper;
        console.log(`[StreetTypeAbbrev] Updated: "${abbrevUpper}" → "${fullUpper}" (was "${oldFullForm}")`);

        return this;
    },

    /**
     * Delete an abbreviation
     * @param {string} abbreviation - The abbreviation to delete
     * @returns {Object} this (for chaining)
     */
    deleteAbbreviation: function(abbreviation) {
        const abbrevUpper = abbreviation.toUpperCase().trim();

        if (!this.abbreviations[abbrevUpper]) {
            console.warn(`[StreetTypeAbbrev] Abbreviation "${abbrevUpper}" not found`);
            return this;
        }

        const oldFullForm = this.abbreviations[abbrevUpper];
        delete this.abbreviations[abbrevUpper];
        console.log(`[StreetTypeAbbrev] Deleted: "${abbrevUpper}" (was → "${oldFullForm}")`);

        return this;
    },

    /**
     * Delete all abbreviations that map to a specific full form
     * @param {string} fullForm - The full form whose abbreviations to delete
     * @returns {Object} this (for chaining)
     */
    deleteAllForFullForm: function(fullForm) {
        const fullUpper = fullForm.toUpperCase().trim();
        const toDelete = [];

        for (const [abbrev, full] of Object.entries(this.abbreviations)) {
            if (full === fullUpper) {
                toDelete.push(abbrev);
            }
        }

        for (const abbrev of toDelete) {
            delete this.abbreviations[abbrev];
        }

        console.log(`[StreetTypeAbbrev] Deleted ${toDelete.length} abbreviations for "${fullUpper}": ${toDelete.join(', ')}`);
        return this;
    },

    // =========================================================================
    // LOOKUP OPERATIONS
    // =========================================================================

    /**
     * Get the full form for an abbreviation
     * @param {string} abbreviation - The abbreviation to look up
     * @returns {string|null} The full form, or null if not found
     */
    getFullForm: function(abbreviation) {
        const abbrevUpper = abbreviation.toUpperCase().trim();
        return this.abbreviations[abbrevUpper] || null;
    },

    /**
     * Get all abbreviations that map to a specific full form
     * @param {string} fullForm - The full form to look up
     * @returns {Array<string>} Array of abbreviations
     */
    getAbbreviationsFor: function(fullForm) {
        const fullUpper = fullForm.toUpperCase().trim();
        const result = [];

        for (const [abbrev, full] of Object.entries(this.abbreviations)) {
            if (full === fullUpper) {
                result.push(abbrev);
            }
        }

        return result;
    },

    /**
     * Check if an abbreviation exists
     * @param {string} abbreviation - The abbreviation to check
     * @returns {boolean} True if abbreviation exists
     */
    hasAbbreviation: function(abbreviation) {
        const abbrevUpper = abbreviation.toUpperCase().trim();
        return abbrevUpper in this.abbreviations;
    },

    // =========================================================================
    // DISPLAY FUNCTIONS
    // =========================================================================

    /**
     * Display the full table in console
     * Grouped by full form for readability
     */
    display: function() {
        console.log('='.repeat(60));
        console.log('STREET TYPE ABBREVIATION TABLE');
        console.log('='.repeat(60));
        console.log(`Version: ${this.metadata.version}`);
        console.log(`Last Updated: ${this.metadata.lastUpdated}`);
        console.log(`Total Abbreviations: ${Object.keys(this.abbreviations).length}`);
        console.log('-'.repeat(60));

        // Group by full form
        const byFullForm = {};
        for (const [abbrev, full] of Object.entries(this.abbreviations)) {
            if (!byFullForm[full]) {
                byFullForm[full] = [];
            }
            byFullForm[full].push(abbrev);
        }

        // Sort full forms alphabetically
        const sortedFullForms = Object.keys(byFullForm).sort();

        for (const fullForm of sortedFullForms) {
            const abbrevs = byFullForm[fullForm].sort();
            console.log(`${fullForm}: ${abbrevs.join(', ')}`);
        }

        console.log('='.repeat(60));

        return this;
    },

    /**
     * Display as a simple list (abbreviation → full form)
     */
    displayFlat: function() {
        console.log('='.repeat(60));
        console.log('STREET TYPE ABBREVIATIONS (Flat List)');
        console.log('='.repeat(60));

        // Sort by abbreviation
        const sortedAbbrevs = Object.keys(this.abbreviations).sort();

        for (const abbrev of sortedAbbrevs) {
            console.log(`  ${abbrev.padEnd(8)} → ${this.abbreviations[abbrev]}`);
        }

        console.log('='.repeat(60));
        console.log(`Total: ${sortedAbbrevs.length} abbreviations`);

        return this;
    },

    /**
     * Get the table as a formatted string (for export/display)
     * @returns {string} Formatted table string
     */
    toFormattedString: function() {
        const lines = [];
        lines.push('STREET TYPE ABBREVIATION TABLE');
        lines.push(`Version: ${this.metadata.version}`);
        lines.push(`Last Updated: ${this.metadata.lastUpdated}`);
        lines.push('');

        // Group by full form
        const byFullForm = {};
        for (const [abbrev, full] of Object.entries(this.abbreviations)) {
            if (!byFullForm[full]) {
                byFullForm[full] = [];
            }
            byFullForm[full].push(abbrev);
        }

        const sortedFullForms = Object.keys(byFullForm).sort();

        for (const fullForm of sortedFullForms) {
            const abbrevs = byFullForm[fullForm].sort();
            lines.push(`${fullForm}: ${abbrevs.join(', ')}`);
        }

        return lines.join('\n');
    },

    // =========================================================================
    // STRIPPING UTILITY (Used by converter for comparison)
    // =========================================================================
    //
    // IMPORTANT: The stripped string is used ONLY for calculating similarity
    // scores during comparison. The ORIGINAL string is what gets stored as an
    // alias in the StreetName object.
    //
    // WHY STRIP (not expand or contract)?
    // By removing street types entirely, we compare only the core street name.
    // This ensures "CORN NECK ROAD" and "CORN NECK RD" both reduce to "CORN NECK"
    // and score 1.0 similarity. It also means streets with different types but
    // same base name will match (e.g., "BEACH ROAD" and "BEACH AVENUE" → "BEACH").
    //
    // COMPARISON RULES:
    //
    // 1. Strip street types (abbreviated or expanded) from the END of both strings
    //    "CORN NECK ROAD" → "CORN NECK"
    //    "CORN NECK RD" → "CORN NECK"
    //
    // 2. Strip "OFF " prefix when BOTH strings start with it
    //    "OFF CENTER ROAD" vs "OFF WATER STREET" → "CENTER" vs "WATER"
    //
    // 3. Compare the stripped strings using Levenshtein
    //
    // 4. Store ORIGINAL strings as aliases based on stripped string scores
    //
    // This ensures matching focuses on the core street name, not type variations.
    // =========================================================================

    /**
     * Check if a street name ends with a known street type.
     * Checks for both abbreviations (RD, AVE) and full forms (ROAD, AVENUE).
     *
     * @param {string} streetName - The street name to check
     * @returns {boolean} True if ends with a street type (abbreviation or full form)
     */
    endsWithStreetType: function(streetName) {
        if (!streetName) return false;

        const upper = streetName.toUpperCase().trim();
        const words = upper.split(/\s+/);

        if (words.length === 0) return false;

        const lastWord = words[words.length - 1];

        // Check if last word is a known abbreviation
        if (this.abbreviations[lastWord]) {
            return true;
        }

        // Check if last word is a known full form
        const fullForms = new Set(Object.values(this.abbreviations));
        if (fullForms.has(lastWord)) {
            return true;
        }

        return false;
    },

    /**
     * Get the canonical (shortest) abbreviation for a street type.
     * Given a street name with a type, returns the shortest abbreviation.
     * @param {string} streetName - Street name with a type (already uppercase)
     * @returns {string} The shortest abbreviation (e.g., "RD", "ST", "AVE")
     */
    getAbbreviatedStreetType: function(streetName) {
        const words = streetName.split(/\s+/);
        if (words.length === 0) return '';

        const lastWord = words[words.length - 1];

        // If it's already an abbreviation, find the shortest one for that full form
        if (this.abbreviations[lastWord]) {
            const fullForm = this.abbreviations[lastWord];
            return this._getShortestAbbreviation(fullForm);
        }

        // If it's a full form, find the shortest abbreviation for it
        const fullForms = new Set(Object.values(this.abbreviations));
        if (fullForms.has(lastWord)) {
            return this._getShortestAbbreviation(lastWord);
        }

        return '';
    },

    /**
     * Get the shortest abbreviation for a given full form.
     * @private
     * @param {string} fullForm - The full form (e.g., "ROAD")
     * @returns {string} The shortest abbreviation (e.g., "RD")
     */
    _getShortestAbbreviation: function(fullForm) {
        let shortest = fullForm; // Default to full form if no abbreviation found

        for (const [abbrev, full] of Object.entries(this.abbreviations)) {
            if (full === fullForm && abbrev.length < shortest.length) {
                // Skip abbreviations with periods - prefer clean ones
                if (!abbrev.includes('.')) {
                    shortest = abbrev;
                } else if (shortest === fullForm) {
                    // Use one with period if it's all we have
                    shortest = abbrev;
                }
            }
        }

        return shortest;
    },

    /**
     * Contract a street name by replacing the street type with its shortest abbreviation.
     * @param {string} streetName - The street name to contract (e.g., "CORN NECK ROAD")
     * @returns {string} Contracted street name (e.g., "CORN NECK RD")
     */
    contractStreetName: function(streetName) {
        if (!streetName) return streetName;

        const upper = streetName.toUpperCase().trim();
        const words = upper.split(/\s+/);

        if (words.length === 0) return upper;

        const lastWord = words[words.length - 1];
        const abbrev = this.getAbbreviatedStreetType(upper);

        if (abbrev && abbrev !== lastWord) {
            words[words.length - 1] = abbrev;
            return words.join(' ');
        }

        return upper;
    },

    /**
     * Strip street types entirely from a street name.
     * Repeatedly removes the last word while it's a known street type (abbreviated or full form).
     * This handles cases like "0LD TOWN ROAD RD" → "0LD TOWN" (both ROAD and RD are stripped).
     * @param {string} streetName - The street name (e.g., "CORN NECK ROAD" or "CORN NECK RD")
     * @returns {string} Street name without street types (e.g., "CORN NECK")
     */
    stripStreetType: function(streetName) {
        if (!streetName) return streetName;

        const upper = streetName.toUpperCase().trim();
        const words = upper.split(/\s+/);

        if (words.length <= 1) return upper; // Don't strip if only one word

        // Build set of full forms for lookup
        const fullForms = new Set(Object.values(this.abbreviations));

        // Keep stripping while the last word is a street type
        while (words.length > 1) {
            const lastWord = words[words.length - 1];

            // Check if last word is a known abbreviation or full form
            if (this.abbreviations[lastWord] || fullForms.has(lastWord)) {
                words.pop();
            } else {
                break; // Last word is not a street type, stop stripping
            }
        }

        return words.join(' ');
    },

    /**
     * Check if a street name starts with the standalone word "OFF"
     * @param {string} streetName - The street name (already uppercase)
     * @returns {boolean}
     */
    startsWithOff: function(streetName) {
        if (!streetName) return false;
        return streetName.startsWith('OFF ');
    },

    /**
     * Remove "OFF " prefix from a street name if present
     * @param {string} streetName - The street name (already uppercase)
     * @returns {string} Street name without "OFF " prefix
     */
    stripOffPrefix: function(streetName) {
        if (this.startsWithOff(streetName)) {
            return streetName.substring(4); // Remove "OFF "
        }
        return streetName;
    },

    /**
     * Prepare two street names for comparison by stripping street types.
     *
     * Rules:
     * 1. Strip street types (abbreviated or expanded) from the END of both strings
     * 2. Strip "OFF " prefix when BOTH strings start with it
     * 3. Return the stripped strings for Levenshtein comparison
     *
     * The ORIGINAL strings are stored as aliases; only the stripped strings
     * are used for scoring.
     *
     * @param {string} streetA - First street name
     * @param {string} streetB - Second street name
     * @returns {Object} { strippedA, strippedB, wasStripped }
     */
    prepareForComparison: function(streetA, streetB) {
        let upperA = (streetA || '').toUpperCase().trim();
        let upperB = (streetB || '').toUpperCase().trim();

        // Rule 2: If both start with "OFF ", remove it from both
        const aStartsWithOff = this.startsWithOff(upperA);
        const bStartsWithOff = this.startsWithOff(upperB);

        if (aStartsWithOff && bStartsWithOff) {
            upperA = this.stripOffPrefix(upperA);
            upperB = this.stripOffPrefix(upperB);
        }

        // Rule 1: Strip street types from both
        const strippedA = this.stripStreetType(upperA);
        const strippedB = this.stripStreetType(upperB);

        // Track if any stripping occurred
        const wasStripped = (strippedA !== upperA) || (strippedB !== upperB) ||
                           (aStartsWithOff && bStartsWithOff);

        return {
            strippedA: strippedA,
            strippedB: strippedB,
            wasStripped: wasStripped
        };
    },

    /**
     * Expand abbreviations at the end of a street name string.
     * Only expands standalone words at the END of the string.
     * Also removes consecutive duplicate expanded types (e.g., "ROAD ROAD" → "ROAD").
     *
     * NOTE: This is a low-level function. For comparing two streets, use
     * prepareForComparison() which handles the "both must have types" rule.
     *
     * @param {string} streetName - The street name to expand (e.g., "CORN NECK RD")
     * @returns {string} Expanded street name (e.g., "CORN NECK ROAD")
     */
    expandStreetName: function(streetName) {
        if (!streetName) return streetName;

        let result = streetName.toUpperCase().trim();

        // Split into words
        const words = result.split(/\s+/);

        if (words.length === 0) return result;

        // Check if the last word is an abbreviation and expand it
        const lastWord = words[words.length - 1];
        const expanded = this.getFullForm(lastWord);

        if (expanded) {
            words[words.length - 1] = expanded;
        }

        // Rejoin
        result = words.join(' ');

        // Remove consecutive duplicate types at the end
        // e.g., "BEACH ROAD ROAD" → "BEACH ROAD"
        result = this._removeConsecutiveDuplicateTypes(result);

        return result;
    },

    /**
     * Remove consecutive duplicate street types at the end of a string
     * @private
     * @param {string} streetName - The street name to clean
     * @returns {string} Cleaned street name
     */
    _removeConsecutiveDuplicateTypes: function(streetName) {
        const words = streetName.split(/\s+/);

        if (words.length < 2) return streetName;

        // Get all known full forms (street types)
        const fullForms = new Set(Object.values(this.abbreviations));

        // Check for consecutive duplicates at the end
        while (words.length >= 2) {
            const lastWord = words[words.length - 1];
            const secondLastWord = words[words.length - 2];

            // If both are the same AND are known street types, remove one
            if (lastWord === secondLastWord && fullForms.has(lastWord)) {
                words.pop();
            } else {
                break;
            }
        }

        return words.join(' ');
    },

    // =========================================================================
    // BATCH OPERATIONS
    // =========================================================================

    /**
     * Add multiple abbreviations from a list.
     * @param {Array} abbreviationList - Array of [abbreviation, fullForm] pairs
     *   e.g., [['HL', 'HILL'], ['RDG', 'RIDGE'], ...]
     * @returns {Object} { added: number, skipped: number, details: [] }
     */
    addAbbreviationsFromList: function(abbreviationList) {
        const results = { added: 0, skipped: 0, details: [] };

        for (const [abbrev, fullForm] of abbreviationList) {
            const abbrevUpper = abbrev.toUpperCase().trim();
            const fullUpper = fullForm.toUpperCase().trim();

            if (!abbrevUpper || !fullUpper) {
                results.details.push({ abbrev, fullForm, status: 'invalid' });
                results.skipped++;
                continue;
            }

            if (this.abbreviations[abbrevUpper]) {
                results.details.push({
                    abbrev: abbrevUpper,
                    fullForm: fullUpper,
                    status: 'exists',
                    existingFullForm: this.abbreviations[abbrevUpper]
                });
                results.skipped++;
                continue;
            }

            this.abbreviations[abbrevUpper] = fullUpper;
            results.details.push({ abbrev: abbrevUpper, fullForm: fullUpper, status: 'added' });
            results.added++;
        }

        console.log(`[StreetTypeAbbrev] Added ${results.added} abbreviations, skipped ${results.skipped}`);
        return results;
    },

    /**
     * Load from Drive, add abbreviations from list, and save back to Drive.
     * Complete workflow for adding new abbreviations.
     * @param {Array} abbreviationList - Array of [abbreviation, fullForm] pairs
     * @returns {Promise<Object>} Results of the operation
     */
    addAndSaveAbbreviations: async function(abbreviationList) {
        console.log('[StreetTypeAbbrev] Loading current abbreviations from Drive...');
        await this.loadFromDrive();

        console.log(`[StreetTypeAbbrev] Adding ${abbreviationList.length} abbreviations...`);
        const results = this.addAbbreviationsFromList(abbreviationList);

        if (results.added > 0) {
            console.log('[StreetTypeAbbrev] Saving updated abbreviations to Drive...');
            await this.saveToDrive();
            console.log('[StreetTypeAbbrev] Done!');
        } else {
            console.log('[StreetTypeAbbrev] No new abbreviations to add, skipping save.');
        }

        return results;
    }
};

// =========================================================================
// BROWSER EXPORTS
// =========================================================================

if (typeof window !== 'undefined') {
    window.StreetTypeAbbreviationManager = StreetTypeAbbreviationManager;
    window.STREET_TYPE_ABBREV_FILE_ID = STREET_TYPE_ABBREV_FILE_ID;
}

// =========================================================================
// NODE.JS EXPORTS
// =========================================================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        StreetTypeAbbreviationManager,
        STREET_TYPE_ABBREV_FILE_ID
    };
}
