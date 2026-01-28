// streetNameBrowser.js - Street Name Browser Tool for BIRAVA2025
//
// PURPOSE: Browser interface for viewing, searching, testing, and managing StreetName objects
// from the Block Island street database. Includes Phase 8 compatibility safeguards.
//
// DESIGN PRINCIPLES:
// - Follow same pattern as entityGroupBrowser.js
// - No embedded script tags in template literals
// - State management via global object
// - Event handlers set up programmatically on initialization
// - Track manual edits for Phase 8 preservation

// =============================================================================
// CONSTANTS
// =============================================================================

const STREETNAME_BROWSER_FILE_ID_STORAGE_KEY = 'birava_streetNameBrowserFileId';
const DEFAULT_STREETNAME_FILE_ID = '1quMdB4qAcnR4oaepSbZEmVWUqYO5_nxK';
const MANUAL_EDIT_SOURCE = 'STREET_NAME_BROWSER_MANUAL';

// =============================================================================
// GLOBAL STATE MANAGEMENT
// =============================================================================

const streetNameBrowser = {
    // Loaded street database (from window.streetNameDatabase - individual files per street)
    loadedDatabase: null,

    // Current state
    currentResults: [],
    selectedStreetName: null,
    selectedIndex: -1,

    // Search state
    searchQuery: '',

    // Manual edits tracking (for Phase 8 compatibility)
    manualEdits: {
        streetsAdded: [],
        aliasesAdded: []
    },

    // Dirty flag for unsaved changes
    hasUnsavedChanges: false
};

// =============================================================================
// DATABASE STATE HELPER
// =============================================================================

/**
 * Ensures the browser has a reference to the loaded database.
 * If another process loaded the database, syncs the browser's local reference.
 * @returns {boolean} True if database is available, false if needs loading
 */
function ensureBrowserDatabaseSynced() {
    // Already have local reference
    if (streetNameBrowser.loadedDatabase) {
        return true;
    }

    // Check if global database was loaded by another process
    if (window.streetNameDatabase && window.streetNameDatabase._isLoaded) {
        console.log('[STREET BROWSER] Syncing with database loaded by another process');
        streetNameBrowser.loadedDatabase = window.streetNameDatabase;
        streetNameBrowser.hasUnsavedChanges = false;
        streetNameBrowser.manualEdits = { streetsAdded: [], aliasesAdded: [] };
        return true;
    }

    // Database not loaded anywhere
    return false;
}

// =============================================================================
// INITIALIZATION & SETUP
// =============================================================================

function initializeStreetNameBrowser() {
    console.log("Initializing Street Name Browser");

    // Restore file ID from localStorage
    // Setup button event handlers
    setupStreetNameBrowserButtons();

    // Setup search handlers
    setupStreetNameBrowserSearch();

    // Setup test panel handlers
    setupStreetNameBrowserTestPanel();

    // Setup alias panel handlers
    setupStreetNameBrowserAliasPanel();

    console.log("Street Name Browser initialized");
}

function setupStreetNameBrowserButtons() {
    const loadBtn = document.getElementById('streetNameLoadBtn');
    if (loadBtn) loadBtn.addEventListener('click', loadStreetNameBrowserDatabase);

    const newBtn = document.getElementById('streetNameNewBtn');
    if (newBtn) newBtn.addEventListener('click', showCreateStreetNameDialog);

    const statsBtn = document.getElementById('streetNameStatsBtn');
    if (statsBtn) statsBtn.addEventListener('click', showStreetNameBrowserStats);

    const exportBtn = document.getElementById('streetNameExportBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportStreetNameBrowserDatabase);
}

function setupStreetNameBrowserSearch() {
    const searchInput = document.getElementById('streetNameSearchInput');
    const searchBtn = document.getElementById('streetNameSearchBtn');
    const clearBtn = document.getElementById('streetNameClearBtn');

    if (searchInput) {
        searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') performStreetNameBrowserSearch();
        });
    }
    if (searchBtn) searchBtn.addEventListener('click', performStreetNameBrowserSearch);
    if (clearBtn) clearBtn.addEventListener('click', clearStreetNameBrowserSearch);
}

function setupStreetNameBrowserTestPanel() {
    const testBtn = document.getElementById('streetNameTestBtn');
    const testInput = document.getElementById('streetNameTestInput');

    if (testBtn) testBtn.addEventListener('click', performStreetNameCompareToTest);
    if (testInput) {
        testInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') performStreetNameCompareToTest();
        });
        // Auto-test on input change (with debounce)
        testInput.addEventListener('input', debounceStreetNameTest);
    }
}

let streetNameTestDebounceTimer = null;
function debounceStreetNameTest() {
    if (streetNameTestDebounceTimer) clearTimeout(streetNameTestDebounceTimer);
    streetNameTestDebounceTimer = setTimeout(performStreetNameCompareToTest, 300);
}

function setupStreetNameBrowserAliasPanel() {
    const addBtn = document.getElementById('streetNameAddAliasBtn');
    if (addBtn) addBtn.addEventListener('click', addAliasToSelectedStreetName);
}

// =============================================================================
// DATA LOADING
// =============================================================================

async function loadStreetNameBrowserDatabase() {
    const loadBtn = document.getElementById('streetNameLoadBtn');
    const originalText = loadBtn ? loadBtn.innerHTML : '';

    try {
        showStreetNameBrowserStatus('Loading street database...', 'loading');
        if (loadBtn) {
            loadBtn.innerHTML = 'Loading...';
            loadBtn.disabled = true;
        }

        // Load the new StreetNameDatabase (individual files per street)
        let wasAlreadyLoaded = false;
        if (window.streetNameDatabase && window.streetNameDatabase._isLoaded) {
            console.log('[STREET BROWSER] Database already loaded, syncing browser state');
            wasAlreadyLoaded = true;
        } else {
            await window.streetNameDatabase.loadFromDrive();
        }

        // Set up backward compatibility aliases (same as loadBlockIslandStreetsFromDrive)
        window.blockIslandStreetDatabase = window.streetNameDatabase;
        const variations = new Set();
        for (const key of window.streetNameDatabase._variationCache.keys()) {
            variations.add(key);
        }
        window.blockIslandStreets = variations;

        // Store reference in browser state
        streetNameBrowser.loadedDatabase = window.streetNameDatabase;
        streetNameBrowser.hasUnsavedChanges = false;
        streetNameBrowser.manualEdits = { streetsAdded: [], aliasesAdded: [] };

        const count = streetNameBrowser.loadedDatabase.entries.size;
        const variationCount = streetNameBrowser.loadedDatabase._variationCache ?
            streetNameBrowser.loadedDatabase._variationCache.size : 'unknown';

        const statusMsg = wasAlreadyLoaded
            ? `Synced ${count} streets (${variationCount} variations) - already loaded`
            : `Loaded ${count} streets (${variationCount} variations)`;
        showStreetNameBrowserStatus(statusMsg, 'success');

        // Display all streets
        displayAllStreetNames();

    } catch (error) {
        console.error('Error loading street database:', error);
        showStreetNameBrowserStatus(`Error loading: ${error.message}`, 'error');
    } finally {
        if (loadBtn) {
            loadBtn.innerHTML = originalText;
            loadBtn.disabled = false;
        }
    }
}

// =============================================================================
// NOTE: Manual save functions removed - all changes now save automatically
// to Google Drive via the StreetNameDatabase class
// =============================================================================

// =============================================================================
// SEARCH & FILTERING
// =============================================================================

function performStreetNameBrowserSearch() {
    const query = document.getElementById('streetNameSearchInput')?.value?.trim()?.toUpperCase();
    streetNameBrowser.searchQuery = query || '';

    if (!query) {
        displayAllStreetNames();
        return;
    }

    if (!ensureBrowserDatabaseSynced()) {
        showStreetNameBrowserStatus('Please load the database first', 'error');
        return;
    }

    // Filter streets matching query
    const results = streetNameBrowser.loadedDatabase.getAllObjects().filter(sn => {
        // Check primary
        if (sn.primaryAlias?.term?.toUpperCase().includes(query)) return true;

        // Check all alternatives
        const allTerms = sn.getAllTermValues ? sn.getAllTermValues() : [];
        return allTerms.some(term => term.toUpperCase().includes(query));
    });

    streetNameBrowser.currentResults = results;
    displayStreetNameBrowserResults(results);
    updateStreetNameBrowserResultsCount(`Found ${results.length} streets matching "${query}"`);
}

function clearStreetNameBrowserSearch() {
    const searchInput = document.getElementById('streetNameSearchInput');
    if (searchInput) searchInput.value = '';

    streetNameBrowser.searchQuery = '';
    streetNameBrowser.selectedStreetName = null;
    streetNameBrowser.selectedIndex = -1;

    displayAllStreetNames();
    clearStreetNameBrowserDetails();
}

function displayAllStreetNames() {
    if (!ensureBrowserDatabaseSynced()) return;

    const allStreets = streetNameBrowser.loadedDatabase.getAllObjects();
    streetNameBrowser.currentResults = allStreets;
    displayStreetNameBrowserResults(allStreets);
    updateStreetNameBrowserResultsCount(`Showing all ${allStreets.length} streets`);
}

// =============================================================================
// DISPLAY FUNCTIONS
// =============================================================================

function displayStreetNameBrowserResults(streets) {
    const resultsList = document.getElementById('streetNameResultsList');
    if (!resultsList) return;

    if (streets.length === 0) {
        resultsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No streets match current search</div>';
        return;
    }

    const html = streets.map((sn, index) => {
        const primary = sn.primaryAlias?.term || 'Unknown';
        const homonymCount = sn.alternatives?.homonyms?.length || 0;
        const synonymCount = sn.alternatives?.synonyms?.length || 0;
        const candidateCount = sn.alternatives?.candidates?.length || 0;
        const totalAliases = homonymCount + synonymCount + candidateCount;

        let badges = '';
        if (homonymCount > 0) badges += '<span class="streetname-alias-badge streetname-alias-homonym">' + homonymCount + ' H</span>';
        if (synonymCount > 0) badges += '<span class="streetname-alias-badge streetname-alias-synonym">' + synonymCount + ' S</span>';
        if (candidateCount > 0) badges += '<span class="streetname-alias-badge streetname-alias-candidate">' + candidateCount + ' C</span>';

        return '<div class="streetname-result-item" onclick="selectStreetNameBrowserItem(' + index + ', this)">' +
            '<div class="streetname-primary">' + escapeHtmlForStreetBrowser(primary) + '</div>' +
            '<div style="margin-top: 4px;">' +
                badges +
                (totalAliases > 0 ? '<span class="streetname-alias-count">' + totalAliases + ' alias' + (totalAliases !== 1 ? 'es' : '') + '</span>' : '') +
            '</div>' +
        '</div>';
    }).join('');

    resultsList.innerHTML = html;
}

function selectStreetNameBrowserItem(index, element) {
    // Remove selection from all items
    const items = document.querySelectorAll('.streetname-result-item');
    items.forEach(item => item.classList.remove('streetname-selected'));

    // Add selection to clicked item
    if (element) element.classList.add('streetname-selected');

    streetNameBrowser.selectedIndex = index;
    streetNameBrowser.selectedStreetName = streetNameBrowser.currentResults[index];

    // Update details panel
    displayStreetNameBrowserDetails(streetNameBrowser.selectedStreetName);

    // Clear and re-run test if there's input
    const testInput = document.getElementById('streetNameTestInput');
    if (testInput && testInput.value.trim()) {
        performStreetNameCompareToTest();
    } else {
        clearStreetNameTestResult();
    }
}

function displayStreetNameBrowserDetails(streetName) {
    const detailsContent = document.getElementById('streetNameDetailsContent');
    if (!detailsContent || !streetName) return;

    const primary = streetName.primaryAlias?.term || 'Unknown';
    const homonyms = streetName.alternatives?.homonyms || [];
    const synonyms = streetName.alternatives?.synonyms || [];
    const candidates = streetName.alternatives?.candidates || [];

    // Build list of all alternatives for the "Change Primary" dropdown
    const allAlternatives = [
        ...homonyms.map(h => ({ term: h.term, category: 'homonyms' })),
        ...synonyms.map(s => ({ term: s.term, category: 'synonyms' })),
        ...candidates.map(c => ({ term: c.term, category: 'candidates' }))
    ];

    let html = '<div style="font-size: 18px; font-weight: bold; color: #00695c; margin-bottom: 10px;">' + escapeHtmlForStreetBrowser(primary) + '</div>';

    // Add "Change Primary Alias" UI if there are alternatives
    if (allAlternatives.length > 0) {
        html += '<div style="margin-bottom: 15px; padding: 10px; background: #e8f5e9; border-radius: 4px;">';
        html += '<label style="font-size: 12px; color: #2e7d32; font-weight: bold;">Change Primary Alias:</label><br>';
        html += '<select id="streetNameChangePrimarySelect" style="margin-top: 5px; padding: 4px; width: 70%;">';
        html += '<option value="">-- Select new primary --</option>';
        for (const alt of allAlternatives) {
            html += '<option value="' + escapeHtmlForStreetBrowser(alt.term) + '">' + escapeHtmlForStreetBrowser(alt.term) + ' (' + alt.category.slice(0, -1) + ')</option>';
        }
        html += '</select>';
        html += '<button onclick="changeStreetNamePrimaryAlias()" style="margin-left: 5px; padding: 4px 10px; background: #4caf50; color: white; border: none; border-radius: 3px; cursor: pointer;">Change</button>';
        html += '</div>';
    }

    if (homonyms.length > 0) {
        html += '<div style="margin-top: 10px;"><strong style="color: #2e7d32;">Homonyms (' + homonyms.length + '):</strong></div>';
        html += '<ul style="margin: 5px 0; padding-left: 20px;">';
        for (const h of homonyms) {
            const escapedTerm = escapeHtmlForStreetBrowser(h.term);
            html += '<li style="font-size: 13px;">' +
                    '<span onclick="deleteStreetNameAlias(\'' + escapedTerm.replace(/'/g, "\\'") + '\', \'homonyms\')" ' +
                    'style="color: #d32f2f; cursor: pointer; margin-right: 5px; font-weight: bold;" title="Delete this alias">[X]</span>' +
                    escapedTerm + '</li>';
        }
        html += '</ul>';
    }

    if (synonyms.length > 0) {
        html += '<div style="margin-top: 10px;"><strong style="color: #f57f17;">Synonyms (' + synonyms.length + '):</strong></div>';
        html += '<ul style="margin: 5px 0; padding-left: 20px;">';
        for (const s of synonyms) {
            const escapedTerm = escapeHtmlForStreetBrowser(s.term);
            html += '<li style="font-size: 13px;">' +
                    '<span onclick="deleteStreetNameAlias(\'' + escapedTerm.replace(/'/g, "\\'") + '\', \'synonyms\')" ' +
                    'style="color: #d32f2f; cursor: pointer; margin-right: 5px; font-weight: bold;" title="Delete this alias">[X]</span>' +
                    escapedTerm + '</li>';
        }
        html += '</ul>';
    }

    if (candidates.length > 0) {
        html += '<div style="margin-top: 10px;"><strong style="color: #7b1fa2;">Candidates (' + candidates.length + '):</strong></div>';
        html += '<ul style="margin: 5px 0; padding-left: 20px;">';
        for (const c of candidates) {
            const escapedTerm = escapeHtmlForStreetBrowser(c.term);
            html += '<li style="font-size: 13px;">' +
                    '<span onclick="deleteStreetNameAlias(\'' + escapedTerm.replace(/'/g, "\\'") + '\', \'candidates\')" ' +
                    'style="color: #d32f2f; cursor: pointer; margin-right: 5px; font-weight: bold;" title="Delete this alias">[X]</span>' +
                    escapedTerm + '</li>';
        }
        html += '</ul>';
    }

    if (homonyms.length === 0 && synonyms.length === 0 && candidates.length === 0) {
        html += '<div style="color: #666; font-style: italic;">No aliases defined</div>';
    }

    detailsContent.innerHTML = html;
}

function getSourceInfo(attributedTerm) {
    if (!attributedTerm || !attributedTerm.sourceMap) return null;

    let sources = [];
    if (attributedTerm.sourceMap instanceof Map) {
        sources = Array.from(attributedTerm.sourceMap.keys());
    } else if (typeof attributedTerm.sourceMap === 'object') {
        sources = Object.keys(attributedTerm.sourceMap);
    }

    if (sources.length === 0) return null;
    if (sources.includes(MANUAL_EDIT_SOURCE)) return 'manual';
    return sources[0];
}

function clearStreetNameBrowserDetails() {
    const detailsContent = document.getElementById('streetNameDetailsContent');
    if (detailsContent) {
        detailsContent.innerHTML = 'Select a street from the list to view details';
    }
}

// =============================================================================
// COMPARETO TESTING
// =============================================================================

function performStreetNameCompareToTest() {
    const testInput = document.getElementById('streetNameTestInput');
    const resultDiv = document.getElementById('streetNameTestResult');

    if (!testInput || !resultDiv) return;

    const testString = testInput.value.trim();
    if (!testString) {
        resultDiv.innerHTML = 'Enter a string and press Enter or click Test to see compareTo() results';
        return;
    }

    if (!streetNameBrowser.selectedStreetName) {
        resultDiv.innerHTML = '<span style="color: #d32f2f;">Please select a street first</span>';
        return;
    }

    // Call compareTo on selected street
    const scores = streetNameBrowser.selectedStreetName.compareTo(testString);

    const formatScore = (score) => {
        if (score === -1) return '<span style="color: #999;">N/A (empty)</span>';
        const color = score >= 0.9 ? '#2e7d32' : score >= 0.8 ? '#f57f17' : '#d32f2f';
        return '<span style="color: ' + color + '; font-weight: bold;">' + score.toFixed(3) + '</span>';
    };

    // Calculate best match (excluding synonyms per project rules)
    const bestMatch = Math.max(
        scores.primary,
        scores.homonym >= 0 ? scores.homonym : 0,
        scores.candidate >= 0 ? scores.candidate : 0
    );

    resultDiv.innerHTML =
        '<div style="margin-bottom: 8px;"><strong>Testing:</strong> "' + escapeHtmlForStreetBrowser(testString) + '"</div>' +
        '<table style="width: 100%; font-size: 12px; border-collapse: collapse;">' +
            '<tr><td style="padding: 2px 0;">Primary:</td><td>' + formatScore(scores.primary) + '</td></tr>' +
            '<tr><td style="padding: 2px 0;">Homonym:</td><td>' + formatScore(scores.homonym) + '</td></tr>' +
            '<tr><td style="padding: 2px 0; color: #999;">Synonym (excluded):</td><td>' + formatScore(scores.synonym) + '</td></tr>' +
            '<tr><td style="padding: 2px 0;">Candidate:</td><td>' + formatScore(scores.candidate) + '</td></tr>' +
        '</table>' +
        '<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">' +
            '<strong>Best match (for address matching):</strong> ' + formatScore(bestMatch) +
        '</div>';
}

function clearStreetNameTestResult() {
    const resultDiv = document.getElementById('streetNameTestResult');
    if (resultDiv) {
        resultDiv.innerHTML = 'Enter a string and press Enter or click Test to see compareTo() results';
    }
}

// =============================================================================
// ALIAS MANAGEMENT (with Phase 8 safeguards)
// =============================================================================

async function addAliasToSelectedStreetName() {
    if (!streetNameBrowser.selectedStreetName) {
        showStreetNameBrowserStatus('Please select a street first', 'error');
        return;
    }

    const aliasInput = document.getElementById('streetNameAliasInput');
    const categorySelect = document.getElementById('streetNameAliasCategory');

    if (!aliasInput || !categorySelect) return;

    const aliasString = aliasInput.value.trim().toUpperCase();
    const category = categorySelect.value;

    if (!aliasString) {
        showStreetNameBrowserStatus('Please enter an alias string', 'error');
        return;
    }

    // Check if alias already exists
    const allTerms = streetNameBrowser.selectedStreetName.getAllTermValues ?
        streetNameBrowser.selectedStreetName.getAllTermValues() : [];
    if (allTerms.some(t => t.toUpperCase() === aliasString)) {
        showStreetNameBrowserStatus('This alias already exists', 'error');
        return;
    }

    // Create AttributedTerm for the new alias with MANUAL source
    const newTerm = new AttributedTerm(
        aliasString,
        MANUAL_EDIT_SOURCE,
        -1,
        'manual_alias',
        'streetAlias'
    );

    // Add to the appropriate category
    if (!streetNameBrowser.selectedStreetName.alternatives) {
        streetNameBrowser.selectedStreetName.alternatives = new Aliases();
    }
    streetNameBrowser.selectedStreetName.alternatives.add(newTerm, category);

    try {
        showStreetNameBrowserStatus('Adding alias and saving...', 'loading');

        // Save the modified object to Google Drive
        const primaryKey = streetNameBrowser.selectedStreetName.primaryAlias?.term;
        if (primaryKey) {
            await streetNameBrowser.loadedDatabase.saveObject(primaryKey);
            // Rebuild variation cache to include the new alias
            streetNameBrowser.loadedDatabase._buildVariationCache();
        }

        // Track manual edit for Phase 8
        streetNameBrowser.manualEdits.aliasesAdded.push({
            street: primaryKey,
            alias: aliasString,
            category: category
        });

        // Mark as having unsaved changes (for legacy compatibility)
        streetNameBrowser.hasUnsavedChanges = true;

        // Clear input and refresh display
        aliasInput.value = '';
        displayStreetNameBrowserDetails(streetNameBrowser.selectedStreetName);
        displayStreetNameBrowserResults(streetNameBrowser.currentResults);

        showStreetNameBrowserStatus('Added "' + aliasString + '" as ' + category.slice(0, -1), 'success');
    } catch (error) {
        console.error('[AddAlias] Error:', error);
        showStreetNameBrowserStatus('Error adding alias: ' + error.message, 'error');
    }
}

// =============================================================================
// CHANGE PRIMARY ALIAS (uses new StreetNameDatabase)
// =============================================================================

/**
 * Change the primary alias of the selected street
 * Uses the new StreetNameDatabase for individual file updates
 */
async function changeStreetNamePrimaryAlias() {
    if (!streetNameBrowser.selectedStreetName) {
        showStreetNameBrowserStatus('Please select a street first', 'error');
        return;
    }

    const selectElement = document.getElementById('streetNameChangePrimarySelect');
    if (!selectElement) return;

    const newPrimary = selectElement.value.trim();
    if (!newPrimary) {
        showStreetNameBrowserStatus('Please select a new primary alias', 'error');
        return;
    }

    const oldPrimary = streetNameBrowser.selectedStreetName.primaryAlias?.term;
    if (!oldPrimary) {
        showStreetNameBrowserStatus('Current street has no primary alias', 'error');
        return;
    }

    if (newPrimary.toUpperCase() === oldPrimary.toUpperCase()) {
        showStreetNameBrowserStatus('Selected alias is already the primary', 'error');
        return;
    }

    // Ask where to move the old primary
    const choice = prompt(
        '"' + oldPrimary + '" → "' + newPrimary + '"\n\n' +
        'Move "' + oldPrimary + '" to:\n\n' +
        '  1 = Homonyms\n' +
        '  2 = Candidates\n' +
        '  3 = Synonyms\n' +
        '  4 = Discard\n\n' +
        'Enter 1, 2, 3, or 4:',
        '1'
    );

    if (choice === null) return; // User cancelled

    const moveToCategory = { '1': 'homonyms', '2': 'candidates', '3': 'synonyms', '4': 'discard' }[choice.trim()] || 'homonyms';

    try {
        showStreetNameBrowserStatus('Changing primary alias...', 'loading');

        // Use the loaded database's changePrimaryAlias method (saves to Google Drive)
        await streetNameBrowser.loadedDatabase.changePrimaryAlias(
            oldPrimary,
            newPrimary,
            moveToCategory
        );

        // Get the updated object from the database (now indexed under newPrimary)
        const updatedStreet = streetNameBrowser.loadedDatabase.get(newPrimary);
        if (updatedStreet) {
            streetNameBrowser.selectedStreetName = updatedStreet;
        }

        // Track manual edit
        streetNameBrowser.manualEdits.aliasesAdded.push({
            street: newPrimary,
            action: 'primary_change',
            oldPrimary: oldPrimary,
            newPrimary: newPrimary
        });

        streetNameBrowser.hasUnsavedChanges = true;

        // Refresh display with updated object and results
        displayStreetNameBrowserDetails(streetNameBrowser.selectedStreetName);
        // Re-fetch current results to reflect the change
        streetNameBrowser.currentResults = streetNameBrowser.loadedDatabase.getAllObjects();
        displayStreetNameBrowserResults(streetNameBrowser.currentResults);

        showStreetNameBrowserStatus(
            'Primary alias changed: "' + oldPrimary + '" → "' + newPrimary + '"',
            'success'
        );

    } catch (error) {
        console.error('[ChangePrimary] Error:', error);
        showStreetNameBrowserStatus('Error changing primary: ' + error.message, 'error');
    }
}

// Export for onclick handler
window.changeStreetNamePrimaryAlias = changeStreetNamePrimaryAlias;

// =============================================================================
// DELETE ALIAS
// =============================================================================

/**
 * Delete an alias from the selected street
 * @param {string} term - The alias term to delete
 * @param {string} category - The category (homonyms, synonyms, candidates)
 */
async function deleteStreetNameAlias(term, category) {
    if (!streetNameBrowser.selectedStreetName) {
        showStreetNameBrowserStatus('No street selected', 'error');
        return;
    }

    if (!confirm('Delete "' + term + '" from ' + category + '?')) {
        return;
    }

    const aliases = streetNameBrowser.selectedStreetName.alternatives?.[category];
    if (!aliases) {
        showStreetNameBrowserStatus('Category not found: ' + category, 'error');
        return;
    }

    // Find and remove the alias
    const idx = aliases.findIndex(a => a.term === term);
    if (idx === -1) {
        showStreetNameBrowserStatus('Alias not found: ' + term, 'error');
        return;
    }

    // Remove it
    aliases.splice(idx, 1);

    try {
        showStreetNameBrowserStatus('Deleting alias...', 'loading');

        // Save the modified object to Google Drive
        const primaryKey = streetNameBrowser.selectedStreetName.primaryAlias?.term;
        if (primaryKey) {
            await streetNameBrowser.loadedDatabase.saveObject(primaryKey);
            // Rebuild variation cache
            streetNameBrowser.loadedDatabase._buildVariationCache();
        }

        // Mark as having unsaved changes
        streetNameBrowser.hasUnsavedChanges = true;

        // Refresh display
        displayStreetNameBrowserDetails(streetNameBrowser.selectedStreetName);
        displayStreetNameBrowserResults(streetNameBrowser.currentResults);

        showStreetNameBrowserStatus('Deleted "' + term + '" from ' + category, 'success');
    } catch (error) {
        console.error('[DeleteAlias] Error:', error);
        showStreetNameBrowserStatus('Error deleting alias: ' + error.message, 'error');
    }
}

// Export for onclick handler
window.deleteStreetNameAlias = deleteStreetNameAlias;

// =============================================================================
// CREATE NEW STREETNAME (with Phase 8 safeguards)
// =============================================================================

async function showCreateStreetNameDialog() {
    if (!ensureBrowserDatabaseSynced()) {
        showStreetNameBrowserStatus('Please load the database first', 'error');
        return;
    }

    const streetName = prompt('Enter new street name (canonical form, e.g., "EXAMPLE ROAD"):');
    if (!streetName || !streetName.trim()) return;

    const normalized = streetName.trim().toUpperCase();

    // Check if already exists using the new database's has() method
    if (streetNameBrowser.loadedDatabase.has(normalized)) {
        showStreetNameBrowserStatus('This street already exists in the database', 'error');
        return;
    }

    // Create new StreetName object with MANUAL source
    const primaryAlias = new AttributedTerm(
        normalized,
        MANUAL_EDIT_SOURCE,
        -1,
        'manual_creation',
        'canonicalStreetName'
    );

    const newStreetName = new StreetName(primaryAlias);

    try {
        showStreetNameBrowserStatus('Creating new street...', 'loading');

        // Add to database (saves to Google Drive)
        await streetNameBrowser.loadedDatabase.add(newStreetName);

        // Track manual edit for Phase 8
        streetNameBrowser.manualEdits.streetsAdded.push(normalized);

        // Mark unsaved changes (for legacy serialization if needed)
        streetNameBrowser.hasUnsavedChanges = true;

        // Refresh display
        displayAllStreetNames();

        showStreetNameBrowserStatus('Created new street: "' + normalized + '"', 'success');
    } catch (error) {
        console.error('[CreateStreet] Error:', error);
        showStreetNameBrowserStatus('Error creating street: ' + error.message, 'error');
    }
}

// =============================================================================
// STATS & EXPORT
// =============================================================================

function showStreetNameBrowserStats() {
    if (!ensureBrowserDatabaseSynced()) {
        showStreetNameBrowserStatus('Please load the database first', 'error');
        return;
    }

    const streets = streetNameBrowser.loadedDatabase.getAllObjects();
    const totalStreets = streets.length;
    const totalHomonyms = streets.reduce((sum, sn) => sum + (sn.alternatives?.homonyms?.length || 0), 0);
    const totalSynonyms = streets.reduce((sum, sn) => sum + (sn.alternatives?.synonyms?.length || 0), 0);
    const totalCandidates = streets.reduce((sum, sn) => sum + (sn.alternatives?.candidates?.length || 0), 0);
    const totalVariations = streetNameBrowser.loadedDatabase._variationCache ?
        streetNameBrowser.loadedDatabase._variationCache.size : 'unknown';
    const streetsWithAliases = streets.filter(sn =>
        (sn.alternatives?.homonyms?.length || 0) +
        (sn.alternatives?.synonyms?.length || 0) +
        (sn.alternatives?.candidates?.length || 0) > 0
    ).length;

    const manualStreets = streetNameBrowser.manualEdits.streetsAdded.length;
    const manualAliases = streetNameBrowser.manualEdits.aliasesAdded.length;

    alert('Street Name Database Statistics\n\n' +
          'Total streets: ' + totalStreets + '\n' +
          'Streets with aliases: ' + streetsWithAliases + '\n' +
          'Total variations indexed: ' + totalVariations + '\n\n' +
          'Alias breakdown:\n' +
          '  Homonyms: ' + totalHomonyms + '\n' +
          '  Synonyms: ' + totalSynonyms + '\n' +
          '  Candidates: ' + totalCandidates + '\n\n' +
          'Manual edits (this session):\n' +
          '  Streets added: ' + manualStreets + '\n' +
          '  Aliases added: ' + manualAliases + '\n\n' +
          'Version: ' + (streetNameBrowser.loadedDatabase.version || 'unknown') + '\n' +
          'Unsaved changes: ' + (streetNameBrowser.hasUnsavedChanges ? 'YES' : 'No'));
}

function exportStreetNameBrowserDatabase() {
    if (!ensureBrowserDatabaseSynced()) {
        showStreetNameBrowserStatus('Please load the database first', 'error');
        return;
    }

    // Export all street objects using standard serialization
    const streets = streetNameBrowser.loadedDatabase.getAllObjects();
    const exportData = {
        __format: 'StreetNameDatabaseExport',
        __version: '2.0',
        __exported: new Date().toISOString(),
        __count: streets.length,
        streets: streets.map(s => serializeWithTypes(s))
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'streetname_database_export_' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showStreetNameBrowserStatus('Database exported to JSON file', 'success');
}

// =============================================================================
// STATUS & HELPER FUNCTIONS
// =============================================================================

function showStreetNameBrowserStatus(message, type) {
    const statusDiv = document.getElementById('streetNameStatusMessage');
    if (!statusDiv) return;

    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
    statusDiv.style.padding = '12px 15px';
    statusDiv.style.borderRadius = '4px';
    statusDiv.style.marginBottom = '15px';

    switch (type) {
        case 'loading':
            statusDiv.style.backgroundColor = '#cce5ff';
            statusDiv.style.borderColor = '#007bff';
            statusDiv.style.color = '#004085';
            break;
        case 'error':
            statusDiv.style.backgroundColor = '#f8d7da';
            statusDiv.style.borderColor = '#dc3545';
            statusDiv.style.color = '#721c24';
            break;
        case 'success':
            statusDiv.style.backgroundColor = '#d4edda';
            statusDiv.style.borderColor = '#28a745';
            statusDiv.style.color = '#155724';
            break;
    }

    if (type === 'success') {
        setTimeout(() => { statusDiv.style.display = 'none'; }, 5000);
    }
}

function updateStreetNameBrowserResultsCount(message) {
    const countSpan = document.getElementById('streetNameResultsCount');
    if (countSpan) countSpan.textContent = message;
}

function escapeHtmlForStreetBrowser(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =============================================================================
// INITIALIZATION ON DOM READY
// =============================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeStreetNameBrowser);
} else {
    // DOM already ready, but wait a tick for other scripts
    setTimeout(initializeStreetNameBrowser, 100);
}

// Export functions for global access (onclick handlers)
window.selectStreetNameBrowserItem = selectStreetNameBrowserItem;
window.streetNameBrowser = streetNameBrowser;
