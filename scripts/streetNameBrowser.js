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
    // Loaded street database (from blockIslandStreetDatabase)
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
// INITIALIZATION & SETUP
// =============================================================================

function initializeStreetNameBrowser() {
    console.log("Initializing Street Name Browser");

    // Restore file ID from localStorage
    restoreStreetNameBrowserFileId();

    // Setup file ID persistence
    setupStreetNameBrowserFileIdPersistence();

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

function restoreStreetNameBrowserFileId() {
    const fileIdInput = document.getElementById('streetNameDatabaseFileId');
    if (fileIdInput) {
        const savedFileId = localStorage.getItem(STREETNAME_BROWSER_FILE_ID_STORAGE_KEY);
        if (savedFileId) {
            fileIdInput.value = savedFileId;
        } else {
            fileIdInput.value = DEFAULT_STREETNAME_FILE_ID;
        }
    }
}

function setupStreetNameBrowserFileIdPersistence() {
    const fileIdInput = document.getElementById('streetNameDatabaseFileId');
    if (fileIdInput) {
        fileIdInput.addEventListener('change', (event) => {
            const fileId = event.target.value.trim();
            if (fileId) {
                localStorage.setItem(STREETNAME_BROWSER_FILE_ID_STORAGE_KEY, fileId);
            }
        });
    }
}

function setupStreetNameBrowserButtons() {
    const loadBtn = document.getElementById('streetNameLoadBtn');
    if (loadBtn) loadBtn.addEventListener('click', loadStreetNameBrowserDatabase);

    const saveBtn = document.getElementById('streetNameSaveBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveStreetNameBrowserDatabase);

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

        // Use existing loadBlockIslandStreetsFromDrive if database not already loaded
        if (!window.blockIslandStreetDatabase || !window.blockIslandStreetDatabase.streetNames) {
            await loadBlockIslandStreetsFromDrive();
        }

        // Store reference in browser state
        streetNameBrowser.loadedDatabase = window.blockIslandStreetDatabase;
        streetNameBrowser.hasUnsavedChanges = false;
        streetNameBrowser.manualEdits = { streetsAdded: [], aliasesAdded: [] };

        const count = streetNameBrowser.loadedDatabase.streetNames.length;
        const variationCount = streetNameBrowser.loadedDatabase.variationToStreetName ?
            streetNameBrowser.loadedDatabase.variationToStreetName.size : 'unknown';

        showStreetNameBrowserStatus(`Loaded ${count} streets (${variationCount} variations)`, 'success');

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
// DATA SAVING (with Phase 8 safeguards)
// =============================================================================

async function saveStreetNameBrowserDatabase() {
    if (!streetNameBrowser.loadedDatabase) {
        showStreetNameBrowserStatus('No database loaded to save', 'error');
        return;
    }

    const fileIdInput = document.getElementById('streetNameDatabaseFileId');
    const fileId = fileIdInput ? fileIdInput.value.trim() : DEFAULT_STREETNAME_FILE_ID;

    const saveBtn = document.getElementById('streetNameSaveBtn');
    const originalText = saveBtn ? saveBtn.innerHTML : '';

    try {
        showStreetNameBrowserStatus('Saving street database...', 'loading');
        if (saveBtn) {
            saveBtn.innerHTML = 'Saving...';
            saveBtn.disabled = true;
        }

        // Serialize the current database state with manual edits metadata
        const serializedDatabase = serializeStreetNameBrowserDatabase();

        // Upload to Google Drive
        await uploadStreetNameBrowserToDrive(serializedDatabase, fileId);

        streetNameBrowser.hasUnsavedChanges = false;
        showStreetNameBrowserStatus('Street database saved successfully!', 'success');

    } catch (error) {
        console.error('Error saving street database:', error);
        showStreetNameBrowserStatus(`Error saving: ${error.message}`, 'error');
    } finally {
        if (saveBtn) {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }
}

function serializeStreetNameBrowserDatabase() {
    const streetNames = streetNameBrowser.loadedDatabase.streetNames;

    const serializedStreets = streetNames.map(sn => ({
        type: 'StreetName',
        primaryAlias: serializeStreetNameAttributedTerm(sn.primaryAlias),
        alternatives: {
            type: 'Aliases',
            homonyms: (sn.alternatives?.homonyms || []).map(serializeStreetNameAttributedTerm),
            synonyms: (sn.alternatives?.synonyms || []).map(serializeStreetNameAttributedTerm),
            candidates: (sn.alternatives?.candidates || []).map(serializeStreetNameAttributedTerm)
        }
    }));

    return {
        __format: 'StreetNameAliasDatabase',
        __version: '1.2',
        __created: new Date().toISOString(),
        __sourceFileId: streetNameBrowser.loadedDatabase.sourceFileId || DEFAULT_STREETNAME_FILE_ID,
        __streetCount: serializedStreets.length,
        __modifiedBy: 'StreetNameBrowser',
        __manualEdits: streetNameBrowser.manualEdits,
        streets: serializedStreets
    };
}

function serializeStreetNameAttributedTerm(at) {
    if (!at) return null;
    const sourceMapObj = {};
    if (at.sourceMap instanceof Map) {
        for (const [key, value] of at.sourceMap) {
            sourceMapObj[key] = value;
        }
    } else if (at.sourceMap && typeof at.sourceMap === 'object') {
        Object.assign(sourceMapObj, at.sourceMap);
    }
    return {
        type: 'AttributedTerm',
        term: at.term,
        fieldName: at.fieldName,
        sourceMap: sourceMapObj
    };
}

async function uploadStreetNameBrowserToDrive(serializedDatabase, fileId) {
    const jsonContent = JSON.stringify(serializedDatabase, null, 2);

    const response = await fetch(
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

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    // Update filename with timestamp
    const fileName = `streetname_alias_database_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    await gapi.client.drive.files.update({
        fileId: fileId,
        resource: { name: fileName }
    });
}

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

    if (!streetNameBrowser.loadedDatabase) {
        showStreetNameBrowserStatus('Please load the database first', 'error');
        return;
    }

    // Filter streets matching query
    const results = streetNameBrowser.loadedDatabase.streetNames.filter(sn => {
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
    if (!streetNameBrowser.loadedDatabase) return;

    const allStreets = streetNameBrowser.loadedDatabase.streetNames;
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

    let html = '<div style="font-size: 18px; font-weight: bold; color: #00695c; margin-bottom: 10px;">' + escapeHtmlForStreetBrowser(primary) + '</div>';

    if (homonyms.length > 0) {
        html += '<div style="margin-top: 10px;"><strong style="color: #2e7d32;">Homonyms (' + homonyms.length + '):</strong></div>';
        html += '<ul style="margin: 5px 0; padding-left: 20px;">';
        for (const h of homonyms) {
            const sourceInfo = getSourceInfo(h);
            html += '<li style="font-size: 13px;">' + escapeHtmlForStreetBrowser(h.term) +
                    (sourceInfo ? ' <span style="color: #999; font-size: 11px;">(' + sourceInfo + ')</span>' : '') + '</li>';
        }
        html += '</ul>';
    }

    if (synonyms.length > 0) {
        html += '<div style="margin-top: 10px;"><strong style="color: #f57f17;">Synonyms (' + synonyms.length + '):</strong></div>';
        html += '<ul style="margin: 5px 0; padding-left: 20px;">';
        for (const s of synonyms) {
            const sourceInfo = getSourceInfo(s);
            html += '<li style="font-size: 13px;">' + escapeHtmlForStreetBrowser(s.term) +
                    (sourceInfo ? ' <span style="color: #999; font-size: 11px;">(' + sourceInfo + ')</span>' : '') + '</li>';
        }
        html += '</ul>';
    }

    if (candidates.length > 0) {
        html += '<div style="margin-top: 10px;"><strong style="color: #7b1fa2;">Candidates (' + candidates.length + '):</strong></div>';
        html += '<ul style="margin: 5px 0; padding-left: 20px;">';
        for (const c of candidates) {
            const sourceInfo = getSourceInfo(c);
            html += '<li style="font-size: 13px;">' + escapeHtmlForStreetBrowser(c.term) +
                    (sourceInfo ? ' <span style="color: #999; font-size: 11px;">(' + sourceInfo + ')</span>' : '') + '</li>';
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

function addAliasToSelectedStreetName() {
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

    // Update variation index
    const normalized = aliasString.toUpperCase().trim();
    if (streetNameBrowser.loadedDatabase.variationToStreetName &&
        !streetNameBrowser.loadedDatabase.variationToStreetName.has(normalized)) {
        streetNameBrowser.loadedDatabase.variationToStreetName.set(normalized, streetNameBrowser.selectedStreetName);
    }

    // Track manual edit for Phase 8
    streetNameBrowser.manualEdits.aliasesAdded.push({
        street: streetNameBrowser.selectedStreetName.primaryAlias?.term,
        alias: aliasString,
        category: category
    });

    // Mark as having unsaved changes
    streetNameBrowser.hasUnsavedChanges = true;

    // Clear input and refresh display
    aliasInput.value = '';
    displayStreetNameBrowserDetails(streetNameBrowser.selectedStreetName);
    displayStreetNameBrowserResults(streetNameBrowser.currentResults);

    showStreetNameBrowserStatus('Added "' + aliasString + '" as ' + category.slice(0, -1), 'success');
}

// =============================================================================
// CREATE NEW STREETNAME (with Phase 8 safeguards)
// =============================================================================

function showCreateStreetNameDialog() {
    if (!streetNameBrowser.loadedDatabase) {
        showStreetNameBrowserStatus('Please load the database first', 'error');
        return;
    }

    const streetName = prompt('Enter new street name (canonical form, e.g., "EXAMPLE ROAD"):');
    if (!streetName || !streetName.trim()) return;

    const normalized = streetName.trim().toUpperCase();

    // Check if already exists
    if (streetNameBrowser.loadedDatabase.variationToStreetName?.has(normalized)) {
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

    // Add to database
    streetNameBrowser.loadedDatabase.streetNames.push(newStreetName);
    if (streetNameBrowser.loadedDatabase.variationToStreetName) {
        streetNameBrowser.loadedDatabase.variationToStreetName.set(normalized, newStreetName);
    }

    // Track manual edit for Phase 8
    streetNameBrowser.manualEdits.streetsAdded.push(normalized);

    // Mark unsaved changes
    streetNameBrowser.hasUnsavedChanges = true;

    // Refresh display
    displayAllStreetNames();

    showStreetNameBrowserStatus('Created new street: "' + normalized + '"', 'success');
}

// =============================================================================
// STATS & EXPORT
// =============================================================================

function showStreetNameBrowserStats() {
    if (!streetNameBrowser.loadedDatabase) {
        showStreetNameBrowserStatus('Please load the database first', 'error');
        return;
    }

    const streets = streetNameBrowser.loadedDatabase.streetNames;
    const totalStreets = streets.length;
    const totalHomonyms = streets.reduce((sum, sn) => sum + (sn.alternatives?.homonyms?.length || 0), 0);
    const totalSynonyms = streets.reduce((sum, sn) => sum + (sn.alternatives?.synonyms?.length || 0), 0);
    const totalCandidates = streets.reduce((sum, sn) => sum + (sn.alternatives?.candidates?.length || 0), 0);
    const totalVariations = streetNameBrowser.loadedDatabase.variationToStreetName ?
        streetNameBrowser.loadedDatabase.variationToStreetName.size : 'unknown';
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
    if (!streetNameBrowser.loadedDatabase) {
        showStreetNameBrowserStatus('Please load the database first', 'error');
        return;
    }

    const serialized = serializeStreetNameBrowserDatabase();
    const jsonContent = JSON.stringify(serialized, null, 2);
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
