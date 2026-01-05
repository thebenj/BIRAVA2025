// entityGroupBrowser.js - EntityGroup Browser Tool for BIRAVA2025
//
// ARCHITECTURAL PURPOSE: Browser interface for viewing and exploring EntityGroup databases
// that consolidate matched entities from multiple data sources into unified real-world
// person/household representations.
//
// DESIGN PRINCIPLES:
// - Follow same pattern as unifiedEntityBrowser.js (separate JS file, DOM manipulation via innerHTML)
// - No embedded script tags in template literals (lesson learned from failed approach)
// - State management via global object
// - Event handlers set up programmatically on initialization

// =============================================================================
// CONSTANTS
// =============================================================================

const ENTITYGROUP_FILE_ID_STORAGE_KEY = 'birava_entityGroupFileId';
const ENTITYGROUP_REFERENCE_FILE_ID_STORAGE_KEY = 'birava_entityGroupReferenceFileId';

// =============================================================================
// GLOBAL STATE MANAGEMENT
// =============================================================================

const entityGroupBrowser = {
    // Loaded EntityGroup database
    loadedDatabase: null,

    // Current state
    currentFilter: 'all',
    currentSort: 'index',
    currentResults: [],
    selectedGroup: null,
    selectedIndex: -1,

    // Search state
    searchQuery: ''
};

// =============================================================================
// INITIALIZATION & SETUP
// =============================================================================

/**
 * Initialize the EntityGroup browser
 * Sets up UI event handlers
 */
function initializeEntityGroupBrowser() {
    console.log("📊 Initializing EntityGroup Browser");

    // Restore file ID from localStorage
    restoreEntityGroupFileId();

    // Setup file ID persistence on change
    setupFileIdPersistence();

    // Setup button event handlers
    setupEntityGroupButtons();

    // Setup dropdown handlers
    setupEntityGroupDropdowns();

    // Setup search handlers
    setupEntityGroupSearch();

    console.log("✅ EntityGroup Browser initialized");
}

/**
 * Restore file IDs from localStorage (both database and reference)
 */
function restoreEntityGroupFileId() {
    // Restore database file ID
    const fileIdInput = document.getElementById('entityGroupFileId');
    if (fileIdInput) {
        const savedFileId = localStorage.getItem(ENTITYGROUP_FILE_ID_STORAGE_KEY);
        if (savedFileId) {
            fileIdInput.value = savedFileId;
            console.log("📂 Restored EntityGroup database file ID from localStorage");
        }
    }

    // Restore reference file ID
    const refFileIdInput = document.getElementById('entityGroupReferenceFileId');
    if (refFileIdInput) {
        const savedRefFileId = localStorage.getItem(ENTITYGROUP_REFERENCE_FILE_ID_STORAGE_KEY);
        if (savedRefFileId) {
            refFileIdInput.value = savedRefFileId;
            console.log("📂 Restored EntityGroup reference file ID from localStorage");
        }
    }
}

/**
 * Setup file ID persistence on change (both database and reference)
 */
function setupFileIdPersistence() {
    // Database file ID persistence
    const fileIdInput = document.getElementById('entityGroupFileId');
    if (fileIdInput) {
        fileIdInput.addEventListener('change', (event) => {
            const fileId = event.target.value.trim();
            if (fileId) {
                localStorage.setItem(ENTITYGROUP_FILE_ID_STORAGE_KEY, fileId);
                console.log("💾 Saved EntityGroup database file ID to localStorage");
            }
        });
        fileIdInput.addEventListener('blur', (event) => {
            const fileId = event.target.value.trim();
            if (fileId) {
                localStorage.setItem(ENTITYGROUP_FILE_ID_STORAGE_KEY, fileId);
            }
        });
    }

    // Reference file ID persistence
    const refFileIdInput = document.getElementById('entityGroupReferenceFileId');
    if (refFileIdInput) {
        refFileIdInput.addEventListener('change', (event) => {
            const fileId = event.target.value.trim();
            if (fileId) {
                localStorage.setItem(ENTITYGROUP_REFERENCE_FILE_ID_STORAGE_KEY, fileId);
                console.log("💾 Saved EntityGroup reference file ID to localStorage");
            }
        });
        refFileIdInput.addEventListener('blur', (event) => {
            const fileId = event.target.value.trim();
            if (fileId) {
                localStorage.setItem(ENTITYGROUP_REFERENCE_FILE_ID_STORAGE_KEY, fileId);
            }
        });
    }
}

/**
 * Setup button event handlers
 */
function setupEntityGroupButtons() {
    // Load button
    const loadBtn = document.getElementById('entityGroupLoadBtn');
    if (loadBtn) {
        loadBtn.addEventListener('click', loadEntityGroupDatabase);
    }

    // Build New button
    const buildBtn = document.getElementById('entityGroupBuildBtn');
    if (buildBtn) {
        buildBtn.addEventListener('click', buildNewEntityGroupDatabase);
    }

    // View Details button
    const detailsBtn = document.getElementById('entityGroupViewDetailsBtn');
    if (detailsBtn) {
        detailsBtn.addEventListener('click', viewSelectedGroupDetails);
    }

    // Export button
    const exportBtn = document.getElementById('entityGroupExportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportEntityGroups);
    }

    // Stats button
    const statsBtn = document.getElementById('entityGroupStatsBtn');
    if (statsBtn) {
        statsBtn.addEventListener('click', showEntityGroupStats);
    }

    // Clear button
    const clearBtn = document.getElementById('entityGroupClearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearEntityGroupSearch);
    }

    // Load Unified Database button - calls the existing loadUnifiedDatabase function
    const loadUnifiedDbBtn = document.getElementById('entityGroupLoadUnifiedDbBtn');
    if (loadUnifiedDbBtn) {
        loadUnifiedDbBtn.addEventListener('click', loadUnifiedDatabaseForEntityGroups);
    }

    // Save to File ID button - saves to existing file IDs in input boxes
    const saveToFileIdBtn = document.getElementById('entityGroupSaveToFileIdBtn');
    if (saveToFileIdBtn) {
        saveToFileIdBtn.addEventListener('click', saveEntityGroupToExistingFiles);
    }

    // Save as New File button - creates new files
    const saveAsNewBtn = document.getElementById('entityGroupSaveAsNewBtn');
    if (saveAsNewBtn) {
        saveAsNewBtn.addEventListener('click', saveEntityGroupToNewFiles);
    }
}

/**
 * Setup dropdown event handlers
 */
function setupEntityGroupDropdowns() {
    // Filter dropdown
    const filterSelect = document.getElementById('entityGroupFilter');
    if (filterSelect) {
        filterSelect.addEventListener('change', (event) => {
            entityGroupBrowser.currentFilter = event.target.value;
            applyEntityGroupFilters();
        });
    }

    // Sort dropdown
    const sortSelect = document.getElementById('entityGroupSort');
    if (sortSelect) {
        sortSelect.addEventListener('change', (event) => {
            entityGroupBrowser.currentSort = event.target.value;
            applyEntityGroupFilters();
        });
    }
}

/**
 * Setup search handlers
 */
function setupEntityGroupSearch() {
    const searchInput = document.getElementById('entityGroupSearchInput');
    const searchBtn = document.getElementById('entityGroupSearchBtn');

    if (searchInput) {
        searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                performEntityGroupSearch();
            }
        });
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', performEntityGroupSearch);
    }
}

// =============================================================================
// DATA LOADING
// =============================================================================

/**
 * Load EntityGroup database from Google Drive
 */
async function loadEntityGroupDatabase() {
    const fileIdInput = document.getElementById('entityGroupFileId');
    const fileId = fileIdInput ? fileIdInput.value.trim() : '';

    if (!fileId) {
        showEntityGroupStatus('Please enter a Google Drive file ID', 'error');
        return;
    }

    const loadBtn = document.getElementById('entityGroupLoadBtn');
    const originalText = loadBtn ? loadBtn.innerHTML : '';

    try {
        showEntityGroupStatus('Loading EntityGroup database from Google Drive...', 'loading');
        if (loadBtn) {
            loadBtn.innerHTML = '⏳ Loading...';
            loadBtn.disabled = true;
        }

        // Fetch from Google Drive
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });

        const data = JSON.parse(response.body);

        // Validate it's an EntityGroup database
        if (!data.groups || !data.stats) {
            throw new Error('Invalid EntityGroup database format - missing groups or stats');
        }

        // Deserialize to proper EntityGroupDatabase class instance (restores serialize() method)
        entityGroupBrowser.loadedDatabase = EntityGroupDatabase.deserialize(data);

        showEntityGroupStatus(`Loaded ${Object.keys(data.groups).length} EntityGroups successfully!`, 'success');

        // Display all groups
        applyEntityGroupFilters();

    } catch (error) {
        console.error('❌ Error loading EntityGroup database:', error);
        showEntityGroupStatus(`Error loading: ${error.message}`, 'error');
    } finally {
        if (loadBtn) {
            loadBtn.innerHTML = originalText;
            loadBtn.disabled = false;
        }
    }
}

/**
 * Load the Unified Entity Database to enable name/address display
 * This is required to look up founding member details for display in the browser
 * Uses the file ID from the existing unifiedDatabaseFileId input box
 */
async function loadUnifiedDatabaseForEntityGroups() {
    const loadBtn = document.getElementById('entityGroupLoadUnifiedDbBtn');
    const originalText = loadBtn ? loadBtn.innerHTML : '';

    try {
        // Check if loadUnifiedDatabase function exists
        if (typeof loadUnifiedDatabase !== 'function') {
            showEntityGroupStatus('loadUnifiedDatabase function not available. Make sure unifiedDatabasePersistence.js is loaded.', 'error');
            return;
        }

        // Get the file ID from the existing input box (uses getUnifiedDatabaseFileId helper from index.html)
        let fileId = null;
        if (typeof getUnifiedDatabaseFileId === 'function') {
            fileId = getUnifiedDatabaseFileId();
        } else {
            // Fallback: directly read from the input
            const input = document.getElementById('unifiedDatabaseFileId');
            if (input && input.value.trim()) {
                fileId = input.value.trim();
            }
        }

        if (!fileId) {
            showEntityGroupStatus('Please enter a Unified Database File ID in the "Entity Reconstruction" section above.', 'error');
            return;
        }

        showEntityGroupStatus('Loading Unified Entity Database...', 'loading');
        if (loadBtn) {
            loadBtn.innerHTML = '⏳ Loading...';
            loadBtn.disabled = true;
        }

        // Call the existing loadUnifiedDatabase function with the file ID
        await loadUnifiedDatabase(fileId);

        showEntityGroupStatus('Unified Entity Database loaded! Entity names will now display correctly.', 'success');

        // Refresh the display if EntityGroups are already loaded
        if (entityGroupBrowser.loadedDatabase) {
            applyEntityGroupFilters();
        }

    } catch (error) {
        console.error('❌ Error loading Unified Database:', error);
        showEntityGroupStatus(`Error loading Unified Database: ${error.message}`, 'error');
    } finally {
        if (loadBtn) {
            loadBtn.innerHTML = originalText;
            loadBtn.disabled = false;
        }
    }
}

/**
 * Build new EntityGroup database
 */
async function buildNewEntityGroupDatabase() {
    // Check if buildEntityGroupDatabase function exists
    if (typeof buildEntityGroupDatabase !== 'function') {
        showEntityGroupStatus('buildEntityGroupDatabase function not available. Make sure entityGroupBuilder.js is loaded.', 'error');
        return;
    }

    // Check if Keyed Database is loaded
    if (typeof isEntityDatabaseLoaded !== 'function' || !isEntityDatabaseLoaded()) {
        showEntityGroupStatus('Keyed Database not loaded. Please load entities first using "Load All Entities Into Memory".', 'error');
        return;
    }

    const buildBtn = document.getElementById('entityGroupBuildBtn');
    const originalText = buildBtn ? buildBtn.innerHTML : '';

    try {
        // Check if override rules should be loaded
        const loadOverrideRulesCheckbox = document.getElementById('loadOverrideRulesCheckbox');
        const shouldLoadOverrideRules = loadOverrideRulesCheckbox && loadOverrideRulesCheckbox.checked;

        if (shouldLoadOverrideRules) {
            showEntityGroupStatus('Loading override rules from Google Sheets...', 'loading');
            if (buildBtn) {
                buildBtn.innerHTML = '⏳ Loading rules...';
                buildBtn.disabled = true;
            }

            // Load override rules from Google Sheets
            if (window.matchOverrideManager && typeof window.matchOverrideManager.loadFromGoogleSheets === 'function') {
                try {
                    const loadResult = await window.matchOverrideManager.loadFromGoogleSheets();
                    console.log(`[EntityGroupBrowser] Loaded ${loadResult.forceMatchCount} force-match and ${loadResult.forceExcludeCount} force-exclude rules`);
                    if (loadResult.errors.length > 0) {
                        console.warn('[EntityGroupBrowser] Override rule loading warnings:', loadResult.errors);
                    }
                } catch (ruleError) {
                    console.warn('[EntityGroupBrowser] Could not load override rules:', ruleError.message);
                    // Continue with build even if rules fail to load
                }
            } else {
                console.log('[EntityGroupBrowser] matchOverrideManager not available, skipping override rules');
            }
        } else {
            // Clear any previously loaded rules if checkbox is unchecked
            if (window.matchOverrideManager) {
                window.matchOverrideManager.clear();
                console.log('[EntityGroupBrowser] Override rules cleared (checkbox unchecked)');
            }
        }

        // Check for sample size (for testing - blank means full build)
        const sampleSizeInput = document.getElementById('entityGroupSampleSize');
        const sampleSizeValue = sampleSizeInput ? parseInt(sampleSizeInput.value, 10) : null;
        const sampleSize = (sampleSizeValue && sampleSizeValue > 0) ? sampleSizeValue : null;

        if (sampleSize) {
            showEntityGroupStatus(`Building EntityGroup database with SAMPLE of ${sampleSize} entities (test mode)...`, 'loading');
            console.log(`[EntityGroupBrowser] SAMPLE MODE: Using ${sampleSize} entities for faster testing`);
        } else {
            showEntityGroupStatus('Building EntityGroup database... This may take several minutes.', 'loading');
        }

        if (buildBtn) {
            buildBtn.innerHTML = sampleSize ? `⏳ Building (${sampleSize})...` : '⏳ Building...';
            buildBtn.disabled = true;
        }

        // Build the database (auto-saves to new files to avoid token expiration issues)
        const result = await buildEntityGroupDatabase({
            verbose: true,
            buildConsensus: true,
            saveToGoogleDrive: true,  // Auto-save to new files - tokens expire after 1 hour
            sampleSize: sampleSize    // null = full build, number = stratified sample for testing
        });

        entityGroupBrowser.loadedDatabase = result;

        // Build status message with override summary
        let statusMsg = `Built ${Object.keys(result.groups).length} EntityGroups successfully!`;
        if (shouldLoadOverrideRules && window.matchOverrideManager) {
            const summary = window.matchOverrideManager.getSummary();
            if (summary.forceMatchCount > 0 || summary.forceExcludeCount > 0) {
                statusMsg += ` (Override rules: ${summary.forceMatchCount} FM, ${summary.forceExcludeCount} FE)`;
            }
        }
        showEntityGroupStatus(statusMsg, 'success');

        // Display all groups
        applyEntityGroupFilters();

    } catch (error) {
        console.error('❌ Error building EntityGroup database:', error);
        showEntityGroupStatus(`Error building: ${error.message}`, 'error');
    } finally {
        if (buildBtn) {
            buildBtn.innerHTML = originalText;
            buildBtn.disabled = false;
        }
    }
}

// =============================================================================
// SAVE FUNCTIONS
// =============================================================================

/**
 * Save EntityGroup database and reference file to existing Google Drive files
 * Uses the file IDs from the input boxes
 */
async function saveEntityGroupToExistingFiles() {
    // Check if database is loaded
    if (!entityGroupBrowser.loadedDatabase && !window.entityGroupDatabase) {
        showEntityGroupStatus('No EntityGroup database loaded. Please load or build one first.', 'error');
        return;
    }

    const groupDb = window.entityGroupDatabase || entityGroupBrowser.loadedDatabase;

    // Get file IDs from input boxes
    const dbFileIdInput = document.getElementById('entityGroupFileId');
    const refFileIdInput = document.getElementById('entityGroupReferenceFileId');

    const dbFileId = dbFileIdInput ? dbFileIdInput.value.trim() : '';
    const refFileId = refFileIdInput ? refFileIdInput.value.trim() : '';

    if (!dbFileId) {
        showEntityGroupStatus('Please enter an EntityGroup Database File ID', 'error');
        return;
    }
    if (!refFileId) {
        showEntityGroupStatus('Please enter a Reference File ID', 'error');
        return;
    }

    // Check if save functions exist
    if (typeof saveEntityGroupDatabaseAndReference !== 'function') {
        showEntityGroupStatus('Save function not available. Make sure entityGroupBuilder.js is loaded.', 'error');
        return;
    }

    const saveBtn = document.getElementById('entityGroupSaveToFileIdBtn');
    const originalText = saveBtn ? saveBtn.innerHTML : '';

    try {
        showEntityGroupStatus('Saving EntityGroup database and reference file...', 'loading');
        if (saveBtn) {
            saveBtn.innerHTML = '⏳ Saving...';
            saveBtn.disabled = true;
        }

        const result = await saveEntityGroupDatabaseAndReference(groupDb, dbFileId, refFileId);

        showEntityGroupStatus(`Saved successfully! Database: ${result.database.fileName}, Reference: ${result.reference.fileName}`, 'success');

    } catch (error) {
        console.error('❌ Error saving EntityGroup files:', error);
        showEntityGroupStatus(`Error saving: ${error.message}`, 'error');
    } finally {
        if (saveBtn) {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }
}

/**
 * Save EntityGroup database and reference file to NEW Google Drive files
 * Reports the new file IDs in the console and updates the input boxes
 */
async function saveEntityGroupToNewFiles() {
    // Check if database is loaded
    if (!entityGroupBrowser.loadedDatabase && !window.entityGroupDatabase) {
        showEntityGroupStatus('No EntityGroup database loaded. Please load or build one first.', 'error');
        return;
    }

    const groupDb = window.entityGroupDatabase || entityGroupBrowser.loadedDatabase;

    // Check if save function exists
    if (typeof saveEntityGroupDatabaseAndReferenceToNewFiles !== 'function') {
        showEntityGroupStatus('Save function not available. Make sure entityGroupBuilder.js is loaded.', 'error');
        return;
    }

    const saveBtn = document.getElementById('entityGroupSaveAsNewBtn');
    const originalText = saveBtn ? saveBtn.innerHTML : '';

    try {
        showEntityGroupStatus('Creating new files and saving EntityGroup database and reference...', 'loading');
        if (saveBtn) {
            saveBtn.innerHTML = '⏳ Saving...';
            saveBtn.disabled = true;
        }

        const result = await saveEntityGroupDatabaseAndReferenceToNewFiles(groupDb);

        // Update the input boxes with the new file IDs
        const dbFileIdInput = document.getElementById('entityGroupFileId');
        const refFileIdInput = document.getElementById('entityGroupReferenceFileId');

        if (dbFileIdInput && result.database.fileId) {
            dbFileIdInput.value = result.database.fileId;
            localStorage.setItem(ENTITYGROUP_FILE_ID_STORAGE_KEY, result.database.fileId);
        }
        if (refFileIdInput && result.reference.fileId) {
            refFileIdInput.value = result.reference.fileId;
            localStorage.setItem(ENTITYGROUP_REFERENCE_FILE_ID_STORAGE_KEY, result.reference.fileId);
        }

        showEntityGroupStatus(
            `Saved to NEW files! Database ID: ${result.database.fileId}, Reference ID: ${result.reference.fileId}`,
            'success'
        );

        // Also log prominently to console
        console.log('%c═══════════════════════════════════════════════════════════════', 'color: green;');
        console.log('%c NEW FILE IDs CREATED - COPY THESE FOR YOUR RECORDS', 'color: green; font-weight: bold; font-size: 14px;');
        console.log('%c═══════════════════════════════════════════════════════════════', 'color: green;');
        console.log(`%c Database File ID:  ${result.database.fileId}`, 'color: green; font-weight: bold;');
        console.log(`%c Reference File ID: ${result.reference.fileId}`, 'color: blue; font-weight: bold;');
        console.log('%c═══════════════════════════════════════════════════════════════', 'color: green;');

    } catch (error) {
        console.error('❌ Error saving EntityGroup files:', error);
        showEntityGroupStatus(`Error saving: ${error.message}`, 'error');
    } finally {
        if (saveBtn) {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }
}

// =============================================================================
// FILTERING & SORTING
// =============================================================================

/**
 * Apply current filters and sorting to display results
 */
function applyEntityGroupFilters() {
    if (!entityGroupBrowser.loadedDatabase) {
        return;
    }

    const db = entityGroupBrowser.loadedDatabase;
    let groups = Object.values(db.groups);

    // Apply filter
    switch (entityGroupBrowser.currentFilter) {
        case 'multi':
            groups = groups.filter(g => g.memberKeys && g.memberKeys.length > 1);
            break;
        case 'single':
            groups = groups.filter(g => !g.memberKeys || g.memberKeys.length <= 1);
            break;
        case 'prospects':
            groups = groups.filter(g => !g.hasBloomerangMember);
            break;
        case 'donors':
            groups = groups.filter(g => g.hasBloomerangMember);
            break;
        case 'nearMisses':
            groups = groups.filter(g => g.nearMissKeys && g.nearMissKeys.length > 0);
            break;
    }

    // Apply search filter if there's a query
    if (entityGroupBrowser.searchQuery) {
        const query = entityGroupBrowser.searchQuery.toLowerCase();
        groups = groups.filter(g => groupMatchesSearch(g, query));
    }

    // Apply sorting
    switch (entityGroupBrowser.currentSort) {
        case 'index':
            groups.sort((a, b) => a.index - b.index);
            break;
        case 'memberCount':
            groups.sort((a, b) => {
                const countA = a.memberKeys ? a.memberKeys.length : 0;
                const countB = b.memberKeys ? b.memberKeys.length : 0;
                return countB - countA;
            });
            break;
        case 'name':
            groups.sort((a, b) => {
                const nameA = extractGroupName(a);
                const nameB = extractGroupName(b);
                return nameA.localeCompare(nameB);
            });
            break;
    }

    entityGroupBrowser.currentResults = groups;
    displayEntityGroupResults(groups);
}

/**
 * Check if a group matches the search query
 */
function groupMatchesSearch(group, query) {
    // Check consensus name
    const name = extractGroupName(group);
    if (name && typeof name === 'string' && name.toLowerCase().includes(query)) {
        return true;
    }

    // Check consensus address
    const address = extractGroupAddress(group);
    if (address && typeof address === 'string' && address.toLowerCase().includes(query)) {
        return true;
    }

    // Check member keys
    if (group.memberKeys) {
        for (const key of group.memberKeys) {
            if (key && typeof key === 'string' && key.toLowerCase().includes(query)) {
                return true;
            }
        }
    }

    return false;
}

// =============================================================================
// SEARCH
// =============================================================================

/**
 * Perform search on EntityGroups
 */
function performEntityGroupSearch() {
    const searchInput = document.getElementById('entityGroupSearchInput');
    entityGroupBrowser.searchQuery = searchInput ? searchInput.value.trim() : '';
    applyEntityGroupFilters();
}

/**
 * Clear search and filters
 */
function clearEntityGroupSearch() {
    const searchInput = document.getElementById('entityGroupSearchInput');
    if (searchInput) {
        searchInput.value = '';
    }

    entityGroupBrowser.searchQuery = '';
    entityGroupBrowser.selectedGroup = null;
    entityGroupBrowser.selectedIndex = -1;

    applyEntityGroupFilters();
}

// =============================================================================
// DISPLAY FUNCTIONS
// =============================================================================

/**
 * Display EntityGroup results in the list
 */
function displayEntityGroupResults(groups) {
    const resultsList = document.getElementById('entityGroupResultsList');
    const resultsCount = document.getElementById('entityGroupResultsCount');

    if (!resultsList) return;

    // Update count
    if (resultsCount) {
        const total = entityGroupBrowser.loadedDatabase ? Object.keys(entityGroupBrowser.loadedDatabase.groups).length : 0;
        resultsCount.textContent = `Showing ${groups.length} of ${total} EntityGroups`;
    }

    if (groups.length === 0) {
        resultsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No groups match current filters</div>';
        return;
    }

    const html = groups.map((group, displayIndex) => {
        const name = extractGroupName(group);
        const address = extractGroupAddress(group);
        const memberCount = group.memberKeys ? group.memberKeys.length : 0;
        const nearMissCount = group.nearMissKeys ? group.nearMissKeys.length : 0;

        // Build badges
        let badges = '';
        if (group.hasBloomerangMember) {
            badges += '<span class="entitygroup-badge entitygroup-badge-donor">DONOR</span>';
        } else {
            badges += '<span class="entitygroup-badge entitygroup-badge-prospect">PROSPECT</span>';
        }
        if (nearMissCount > 0) {
            badges += `<span class="entitygroup-badge entitygroup-badge-nearmiss">${nearMissCount} Near</span>`;
        }

        // Member preview
        const memberPreview = group.memberKeys ?
            group.memberKeys.slice(0, 3).map(k => k.split(':')[0]).join(', ') +
            (group.memberKeys.length > 3 ? '...' : '') : '';

        return `
            <div class="entitygroup-result-item" onclick="selectEntityGroup(${displayIndex}, this)">
                <div class="entitygroup-header">
                    <span class="entitygroup-index">#${group.index}</span>
                    <span class="entitygroup-member-count">${memberCount} member${memberCount !== 1 ? 's' : ''}</span>
                    ${badges}
                </div>
                <div class="entitygroup-name">${escapeHtml(name)}</div>
                <div class="entitygroup-details">${escapeHtml(address)}</div>
                <div class="entitygroup-members-preview">Sources: ${memberPreview}</div>
            </div>
        `;
    }).join('');

    resultsList.innerHTML = html;
}

/**
 * Select an EntityGroup from the results list
 */
function selectEntityGroup(displayIndex, element) {
    // Remove selection from all items
    const items = document.querySelectorAll('.entitygroup-result-item');
    items.forEach(item => item.classList.remove('entitygroup-selected'));

    // Add selection to clicked item
    if (element) {
        element.classList.add('entitygroup-selected');
    }

    entityGroupBrowser.selectedIndex = displayIndex;
    entityGroupBrowser.selectedGroup = entityGroupBrowser.currentResults[displayIndex];
}

// =============================================================================
// DETAIL VIEW
// =============================================================================

/**
 * View details of selected EntityGroup
 */
function viewSelectedGroupDetails() {
    if (!entityGroupBrowser.selectedGroup) {
        showEntityGroupStatus('Please select an EntityGroup first', 'error');
        return;
    }

    const group = entityGroupBrowser.selectedGroup;
    const db = entityGroupBrowser.loadedDatabase;

    // Build detail HTML - get founding member info
    const name = extractGroupName(group);
    const address = extractGroupAddress(group);
    const foundingMemberKey = group.foundingMemberKey;
    const foundingMemberEntity = foundingMemberKey ? getEntityByKey(foundingMemberKey) : null;
    const foundingMemberSource = foundingMemberKey?.startsWith('bloomerang:') ? 'Bloomerang' : 'VisionAppraisal';
    const foundingMemberBtnColor = foundingMemberSource === 'Bloomerang' ? '#2196f3' : '#dc3545';

    // Build members HTML with View Details buttons
    let membersHtml = '';
    if (group.memberKeys && group.memberKeys.length > 0) {
        membersHtml = group.memberKeys.map((key, index) => {
            const source = key.startsWith('bloomerang:') ? 'Bloomerang' : 'VisionAppraisal';
            const entity = getEntityByKey(key);
            const memberName = entity ? extractEntityName(entity) : 'Entity not loaded';
            const memberAddress = entity ? extractEntityAddress(entity) : '';
            const bgColor = source === 'Bloomerang' ? '#e3f2fd' : '#ffebee';
            const btnColor = source === 'Bloomerang' ? '#2196f3' : '#dc3545';

            return `<div class="member-row" style="padding: 8px 12px; background: ${bgColor}; margin: 4px 0; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                <div style="flex: 1;">
                    <div style="font-size: 13px; font-weight: 600; color: #333;">${escapeHtml(memberName)}</div>
                    <div style="font-size: 11px; color: #666;">${escapeHtml(memberAddress)}</div>
                    <div style="font-size: 10px; color: #888; margin-top: 2px;"><strong>${source}</strong></div>
                </div>
                <button class="member-view-btn" data-key="${escapeHtml(key)}" data-index="${index}"
                    style="background: ${btnColor}; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; white-space: nowrap; margin-left: 10px;">
                    View Details
                </button>
            </div>`;
        }).join('');
    }

    let nearMissesHtml = '';
    if (group.nearMissKeys && group.nearMissKeys.length > 0) {
        nearMissesHtml = `
            <div style="margin-top: 15px;">
                <strong style="color: #ff9800;">Near Misses (${group.nearMissKeys.length}):</strong>
                ${group.nearMissKeys.map((key, index) => {
                    const source = key.startsWith('bloomerang:') ? 'Bloomerang' : 'VisionAppraisal';
                    const entity = getEntityByKey(key);
                    const nearMissName = entity ? extractEntityName(entity) : 'Entity not loaded';
                    return `<div style="padding: 5px 10px; background: #fff3e0; margin: 2px 0; border-radius: 4px; font-size: 11px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <span style="font-weight: 500;">${escapeHtml(nearMissName)}</span>
                            <span style="color: #888; margin-left: 8px;">(${source})</span>
                        </div>
                        <button class="nearmiss-view-btn" data-key="${escapeHtml(key)}"
                            style="background: #ff9800; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 10px;">
                            View
                        </button>
                    </div>`;
                }).join('')}
            </div>
        `;
    }

    // Consensus entity details with drill-down View Details button
    let consensusHtml = '';
    if (group.consensusEntity) {
        const ce = group.consensusEntity;
        const consensusName = ce.name?.primaryAlias?.term || ce.name?.term || 'Unknown';
        const consensusAddress = ce.contactInfo?.primaryAddress?.primaryAlias?.term ||
                                  ce.locationIdentifier?.primaryAlias?.term || '';
        consensusHtml = `
            <div id="consensusSection" style="margin-top: 15px; padding: 12px; background: linear-gradient(135deg, #f5f5f5, #e8e8e8); border-radius: 6px; border: 1px solid #ddd;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <strong style="color: #6c5ce7;">Consensus Entity:</strong>
                    <button id="consensusViewDetailsBtn"
                        style="background: #6c5ce7; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px;">
                        View Details (Drill-Down)
                    </button>
                </div>
                <div style="font-size: 12px;">
                    <div><strong>Type:</strong> ${ce.type || 'Unknown'}</div>
                    <div><strong>Name:</strong> ${escapeHtml(consensusName)}</div>
                    ${consensusAddress ? `<div><strong>Address:</strong> ${escapeHtml(consensusAddress)}</div>` : ''}
                </div>
            </div>
        `;
    }

    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'entityGroupDetailModal';
    modalOverlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; justify-content: center; align-items: center;';

    // Create modal content
    const modalBox = document.createElement('div');
    modalBox.style.cssText = 'background: white; padding: 25px; border-radius: 8px; max-width: 700px; max-height: 80vh; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';

    const donorBg = group.hasBloomerangMember ? '#2196f3' : '#4caf50';
    const donorText = group.hasBloomerangMember ? 'EXISTING DONOR' : 'PROSPECT';

    modalBox.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #9c27b0; padding-bottom: 10px;">
            <h2 style="margin: 0; color: #9c27b0;">EntityGroup #${group.index}</h2>
            <button id="entityGroupDetailCloseBtn" style="background: #9c27b0; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Close</button>
        </div>

        <div style="margin-bottom: 15px; padding: 12px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #9c27b0;">
            <div style="font-size: 11px; color: #9c27b0; font-weight: 600; margin-bottom: 4px; text-transform: uppercase;">Founding Member (${foundingMemberSource})</div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="flex: 1;">
                    <div style="font-size: 18px; font-weight: bold; color: #333;">${escapeHtml(name)}</div>
                    <div style="font-size: 14px; color: #666;">${escapeHtml(address)}</div>
                </div>
                ${foundingMemberKey ? `
                    <button id="foundingMemberViewBtn" data-key="${escapeHtml(foundingMemberKey)}"
                        style="background: ${foundingMemberBtnColor}; color: white; border: none; padding: 8px 14px; border-radius: 4px; cursor: pointer; font-size: 12px; white-space: nowrap; margin-left: 12px;">
                        View Details
                    </button>
                ` : ''}
            </div>
        </div>

        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
            <span style="padding: 5px 12px; background: ${donorBg}; color: white; border-radius: 15px; font-size: 12px; font-weight: 600;">
                ${donorText}
            </span>
            <span style="padding: 5px 12px; background: #9c27b0; color: white; border-radius: 15px; font-size: 12px;">
                Phase ${group.constructionPhase || '?'}
            </span>
        </div>

        <div style="margin-top: 15px;" id="membersSection">
            <strong>Members (${group.memberKeys ? group.memberKeys.length : 0}):</strong>
            ${membersHtml}
        </div>

        ${nearMissesHtml}
        ${consensusHtml}
    `;

    modalOverlay.appendChild(modalBox);
    document.body.appendChild(modalOverlay);

    // Add close button event listener
    document.getElementById('entityGroupDetailCloseBtn').addEventListener('click', () => {
        modalOverlay.remove();
    });

    // Close on overlay click (outside modal box)
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.remove();
        }
    });

    // Add View Details event listener for founding member button
    const foundingMemberBtn = document.getElementById('foundingMemberViewBtn');
    if (foundingMemberBtn) {
        foundingMemberBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const key = foundingMemberBtn.getAttribute('data-key');
            viewMemberEntityDetails(key);
        });
    }

    // Add View Details event listeners for member buttons
    modalBox.querySelectorAll('.member-view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const key = btn.getAttribute('data-key');
            viewMemberEntityDetails(key);
        });
    });

    // Add View Details event listeners for near miss buttons
    modalBox.querySelectorAll('.nearmiss-view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const key = btn.getAttribute('data-key');
            viewMemberEntityDetails(key);
        });
    });

    // Add View Details event listener for consensus entity (drill-down style)
    const consensusBtn = document.getElementById('consensusViewDetailsBtn');
    if (consensusBtn) {
        consensusBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            viewConsensusEntityDetails(group.consensusEntity, group.index);
        });
    }
}

/**
 * View details of a member entity using the Entity Browser's renderEntityDetailsWindow
 * This uses the same display as the Entity Browser View Details button
 * @param {string} key - Entity key
 */
function viewMemberEntityDetails(key) {
    const entity = getEntityByKey(key);

    if (!entity) {
        showEntityGroupStatus(`Entity not found. Make sure to load the Unified Database first. Key: ${key}`, 'error');
        return;
    }

    // Build entity wrapper in the format expected by renderEntityDetailsWindow
    const isVisionAppraisal = key.startsWith('visionAppraisal:');
    const entityType = entity.constructor?.name || entity.type || 'Unknown';

    const entityWrapper = {
        entity: entity,
        key: key,
        source: isVisionAppraisal ? 'VisionAppraisal' : 'Bloomerang',
        sourceKey: isVisionAppraisal ? 'visionappraisal' : 'bloomerang',
        entityType: entityType
    };

    // Use the same renderer as Entity Browser View Details
    if (typeof renderEntityDetailsWindow === 'function') {
        renderEntityDetailsWindow(entityWrapper);
    } else if (typeof basicEntityDetailsView === 'function') {
        basicEntityDetailsView(entityWrapper);
    } else {
        showEntityGroupStatus('Entity renderer not available. Make sure entityRenderer.js is loaded.', 'error');
    }
}

/**
 * View consensus entity details using drill-down style (like Reconcile View Details)
 * Opens a new window with interactive property explorer
 * @param {Object} consensusEntity - The consensus entity object
 * @param {number} groupIndex - EntityGroup index for title
 */
function viewConsensusEntityDetails(consensusEntity, groupIndex) {
    if (!consensusEntity) {
        showEntityGroupStatus('No consensus entity available', 'error');
        return;
    }

    // Use basicEntityDetailsView pattern for drill-down exploration
    // Build a wrapper for the consensus entity
    const entityWrapper = {
        entity: consensusEntity,
        key: `consensus_group_${groupIndex}`,
        source: 'EntityGroup',
        sourceKey: 'entitygroup',
        entityType: consensusEntity.type || 'ConsensusEntity'
    };

    // Prefer basicEntityDetailsView for drill-down style, fallback to renderEntityDetailsWindow
    if (typeof basicEntityDetailsView === 'function') {
        basicEntityDetailsView(entityWrapper);
    } else if (typeof renderEntityDetailsWindow === 'function') {
        renderEntityDetailsWindow(entityWrapper);
    } else {
        // Ultimate fallback: open raw JSON in new window
        const detailsWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
        detailsWindow.document.write(`
            <html>
            <head><title>Consensus Entity - Group #${groupIndex}</title></head>
            <body style="font-family: monospace; padding: 20px;">
                <h2>Consensus Entity (Group #${groupIndex})</h2>
                <pre>${JSON.stringify(consensusEntity, null, 2)}</pre>
            </body>
            </html>
        `);
        detailsWindow.document.close();
    }
}

// =============================================================================
// STATS & EXPORT
// =============================================================================

/**
 * Show EntityGroup statistics
 */
function showEntityGroupStats() {
    if (!entityGroupBrowser.loadedDatabase) {
        showEntityGroupStatus('Please load an EntityGroup database first', 'error');
        return;
    }

    const db = entityGroupBrowser.loadedDatabase;
    const stats = db.stats || {};

    const groups = Object.values(db.groups);
    const multiMember = groups.filter(g => g.memberKeys && g.memberKeys.length > 1).length;
    const singleMember = groups.filter(g => !g.memberKeys || g.memberKeys.length <= 1).length;
    const prospects = groups.filter(g => !g.hasBloomerangMember).length;
    const donors = groups.filter(g => g.hasBloomerangMember).length;
    const withNearMisses = groups.filter(g => g.nearMissKeys && g.nearMissKeys.length > 0).length;

    // Phase breakdown
    const phaseBreakdown = {};
    for (const group of groups) {
        const phase = group.constructionPhase || 'unknown';
        phaseBreakdown[phase] = (phaseBreakdown[phase] || 0) + 1;
    }

    const phaseHtml = Object.entries(phaseBreakdown)
        .sort((a, b) => a[0] - b[0])
        .map(([phase, count]) => `<div>Phase ${phase}: ${count} groups</div>`)
        .join('');

    // Sample mode HTML
    let sampleModeHtml = '';
    if (db.sampleMode && db.sampleMode.enabled) {
        sampleModeHtml = `
            <div style="margin-top: 15px; padding: 10px; background: #fff9c4; border-radius: 8px; font-size: 12px;">
                <strong>⚠️ Sample Mode:</strong> This is a sampled database (${db.sampleMode.actualSize || db.sampleMode.sampleSize} entities, seed ${db.sampleMode.seed})
            </div>
        `;
    }

    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'entityGroupStatsModal';
    modalOverlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; justify-content: center; align-items: center;';

    // Create modal content
    const modalBox = document.createElement('div');
    modalBox.style.cssText = 'background: white; padding: 25px; border-radius: 8px; max-width: 500px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';

    modalBox.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #9c27b0; padding-bottom: 10px;">
            <h2 style="margin: 0; color: #9c27b0;">📊 EntityGroup Statistics</h2>
            <button id="entityGroupStatsCloseBtn" style="background: #9c27b0; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Close</button>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div style="padding: 15px; background: #f5f5f5; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #9c27b0;">${groups.length}</div>
                <div style="font-size: 12px; color: #666;">Total Groups</div>
            </div>
            <div style="padding: 15px; background: #e8f5e9; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #4caf50;">${prospects}</div>
                <div style="font-size: 12px; color: #666;">Prospects</div>
            </div>
            <div style="padding: 15px; background: #e3f2fd; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #2196f3;">${donors}</div>
                <div style="font-size: 12px; color: #666;">Existing Donors</div>
            </div>
            <div style="padding: 15px; background: #fff3e0; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #ff9800;">${withNearMisses}</div>
                <div style="font-size: 12px; color: #666;">With Near Misses</div>
            </div>
        </div>

        <div style="margin-top: 20px; padding: 15px; background: #fafafa; border-radius: 8px;">
            <strong>Group Composition:</strong>
            <div style="margin-top: 10px; font-size: 13px;">
                <div>Multi-member groups: ${multiMember}</div>
                <div>Single-member groups: ${singleMember}</div>
            </div>
        </div>

        <div style="margin-top: 15px; padding: 15px; background: #fafafa; border-radius: 8px;">
            <strong>By Construction Phase:</strong>
            <div style="margin-top: 10px; font-size: 13px;">
                ${phaseHtml}
            </div>
        </div>

        ${sampleModeHtml}
    `;

    modalOverlay.appendChild(modalBox);
    document.body.appendChild(modalOverlay);

    // Add close button event listener
    document.getElementById('entityGroupStatsCloseBtn').addEventListener('click', () => {
        modalOverlay.remove();
    });

    // Close on overlay click (outside modal box)
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.remove();
        }
    });
}

/**
 * Export EntityGroups to CSV
 */
function exportEntityGroups() {
    if (!entityGroupBrowser.loadedDatabase) {
        showEntityGroupStatus('Please load an EntityGroup database first', 'error');
        return;
    }

    const groups = entityGroupBrowser.currentResults;

    // Build CSV
    const headers = ['Group Index', 'Consensus Name', 'Consensus Address', 'Member Count', 'Is Donor', 'Near Miss Count', 'Construction Phase', 'Member Keys'];
    const rows = groups.map(group => {
        return [
            group.index,
            `"${extractGroupName(group).replace(/"/g, '""')}"`,
            `"${extractGroupAddress(group).replace(/"/g, '""')}"`,
            group.memberKeys ? group.memberKeys.length : 0,
            group.hasBloomerangMember ? 'Yes' : 'No',
            group.nearMissKeys ? group.nearMissKeys.length : 0,
            group.constructionPhase || '',
            `"${(group.memberKeys || []).join('; ').replace(/"/g, '""')}"`
        ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `entitygroups_export_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showEntityGroupStatus(`Exported ${groups.length} EntityGroups to CSV`, 'success');
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract display name from an EntityGroup using the founding member
 */
function extractGroupName(group) {
    // Get founding member key
    const foundingMemberKey = group.foundingMemberKey;
    if (!foundingMemberKey) {
        return 'Unknown (no founding member)';
    }

    // Try to get the founding member entity
    const foundingMember = getEntityByKey(foundingMemberKey);
    if (foundingMember) {
        return extractEntityName(foundingMember);
    }

    // Fallback: extract source from key
    const source = foundingMemberKey.startsWith('bloomerang:') ? 'Bloomerang' : 'VisionAppraisal';
    return `${source} entity (not loaded)`;
}

/**
 * Get an entity by its key from the loaded databases
 */
function getEntityByKey(key) {
    // First try the unified entity database (if loaded)
    if (window.unifiedEntityDatabase && window.unifiedEntityDatabase.entities) {
        const entity = window.unifiedEntityDatabase.entities[key];
        if (entity) return entity;
    }

    // Could also try workingLoadedEntities as fallback, but unifiedEntityDatabase is preferred
    return null;
}

/**
 * Extract display name from an entity object
 */
function extractEntityName(entity) {
    if (!entity || !entity.name) return 'Unknown';

    // Handle primaryAlias pattern (most common)
    if (entity.name.primaryAlias && entity.name.primaryAlias.term) {
        return entity.name.primaryAlias.term;
    }

    // Handle direct term
    if (entity.name.term) {
        return entity.name.term;
    }

    // Handle IndividualName with firstName/lastName
    if (entity.name.firstName || entity.name.lastName) {
        const parts = [];
        if (entity.name.firstName) parts.push(entity.name.firstName);
        if (entity.name.lastName) parts.push(entity.name.lastName);
        return parts.join(' ');
    }

    // Handle completeName
    if (entity.name.completeName) {
        return entity.name.completeName;
    }

    return 'Unknown';
}

/**
 * Extract address from an EntityGroup using the founding member
 */
function extractGroupAddress(group) {
    // Get founding member key
    const foundingMemberKey = group.foundingMemberKey;
    if (!foundingMemberKey) {
        return '';
    }

    // Try to get the founding member entity
    const foundingMember = getEntityByKey(foundingMemberKey);
    if (foundingMember) {
        return extractEntityAddress(foundingMember);
    }

    return '';
}

/**
 * Extract address from an entity object
 * Always returns a string (empty string if address cannot be extracted)
 */
function extractEntityAddress(entity) {
    if (!entity) return '';

    // Try contactInfo.primaryAddress.primaryAlias.term
    if (entity.contactInfo && entity.contactInfo.primaryAddress) {
        const addr = entity.contactInfo.primaryAddress;
        if (addr.primaryAlias && addr.primaryAlias.term) {
            return String(addr.primaryAlias.term);
        }
        if (addr.term) {
            return String(addr.term);
        }
        // If address object exists but no term, try to build from components
        if (addr.streetNumber || addr.streetName) {
            const parts = [];
            if (addr.streetNumber?.term) parts.push(addr.streetNumber.term);
            if (addr.streetName?.term) parts.push(addr.streetName.term);
            if (addr.city?.term) parts.push(addr.city.term);
            if (addr.state?.term) parts.push(addr.state.term);
            if (parts.length > 0) return parts.join(' ');
        }
    }

    // Try locationIdentifier
    if (entity.locationIdentifier) {
        if (entity.locationIdentifier.primaryAlias && entity.locationIdentifier.primaryAlias.term) {
            return String(entity.locationIdentifier.primaryAlias.term);
        }
        if (entity.locationIdentifier.term) {
            return String(entity.locationIdentifier.term);
        }
    }

    return '';
}

/**
 * Show status message
 */
function showEntityGroupStatus(message, type) {
    const statusDiv = document.getElementById('entityGroupStatusMessage');
    if (!statusDiv) return;

    statusDiv.textContent = message;
    statusDiv.className = 'status-message';

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

    statusDiv.style.display = 'block';
    statusDiv.style.padding = '12px 15px';
    statusDiv.style.marginBottom = '15px';
    statusDiv.style.borderRadius = '4px';
    statusDiv.style.border = '1px solid';

    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
}

/**
 * Escape HTML entities
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =============================================================================
// COMPREHENSIVE CSV EXPORT (54-column format per spec)
// =============================================================================

/**
 * CSV Column Headers - 62 columns (expanded from 54 to add SecAddr1 components)
 */
const CSV_HEADERS = [
    // Section 1: Identification & Mail Merge Core (10 columns)
    'RowType', 'GroupIndex', 'Key', 'MailName', 'MailAddr1', 'MailAddr2',
    'MailCity', 'MailState', 'MailZip', 'Email',
    // Section 2: Additional Contact Info (14 columns - SecAddr1 expanded to 9 component columns)
    'Phone', 'POBox',
    'SecAddr1_primaryAlias', 'SecAddr1_streetNumber', 'SecAddr1_streetName', 'SecAddr1_streetType',
    'SecAddr1_city', 'SecAddr1_state', 'SecAddr1_zipCode', 'SecAddr1_secUnitType', 'SecAddr1_secUnitNum',
    'SecAddr2', 'SecAddr3', 'SecAddrMore',
    // Section 3: Entity Metadata (2 columns)
    'EntityType', 'Source',
    // Section 4: Name Alternatives (12 columns)
    'NameHom1', 'NameHom2', 'NameHom3', 'NameHomMore',
    'NameSyn1', 'NameSyn2', 'NameSyn3', 'NameSynMore',
    'NameCand1', 'NameCand2', 'NameCand3', 'NameCandMore',
    // Section 5: Address Alternatives (12 columns)
    'AddrHom1', 'AddrHom2', 'AddrHom3', 'AddrHomMore',
    'AddrSyn1', 'AddrSyn2', 'AddrSyn3', 'AddrSynMore',
    'AddrCand1', 'AddrCand2', 'AddrCand3', 'AddrCandMore',
    // Section 6: Email Alternatives (12 columns)
    'EmailHom1', 'EmailHom2', 'EmailHom3', 'EmailHomMore',
    'EmailSyn1', 'EmailSyn2', 'EmailSyn3', 'EmailSynMore',
    'EmailCand1', 'EmailCand2', 'EmailCand3', 'EmailCandMore'
];

/**
 * Clean VisionAppraisal tags from text
 * @param {string} text - Text with potential VA tags
 * @returns {string} Cleaned text
 */
function cleanVATags(text) {
    if (!text || typeof text !== 'string') return '';
    return text
        .replace(/::#\^#::/g, ', ')
        .replace(/:\^#\^:/g, ' ')
        .replace(/\^#\^/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/,\s*,/g, ',')
        .replace(/^\s*,\s*|\s*,\s*$/g, '')
        .trim();
}

/**
 * Escape a value for CSV (handle quotes and commas)
 * @param {*} value - Value to escape
 * @returns {string} CSV-safe string
 */
function csvEscape(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

/**
 * Assemble mailing name from entity based on entity type
 * Per spec:
 * - Individual: firstName lastName (or completeName)
 * - AggregateHousehold: Household name term
 * - Business/LegalConstruct: NonHumanName term
 * @param {Object} entity - Entity object
 * @returns {string} Assembled mailing name
 */
function assembleMailName(entity) {
    if (!entity || !entity.name) return '';

    const entityType = entity.__type || entity.constructor?.name || '';

    // Individual: use firstName + lastName or completeName
    if (entityType === 'Individual') {
        if (entity.name.firstName || entity.name.lastName) {
            const parts = [];
            if (entity.name.firstName) parts.push(cleanVATags(entity.name.firstName));
            if (entity.name.lastName) parts.push(cleanVATags(entity.name.lastName));
            return parts.join(' ');
        }
        if (entity.name.completeName) {
            return cleanVATags(entity.name.completeName);
        }
    }

    // AggregateHousehold, Business, LegalConstruct: use primaryAlias.term or term
    if (entity.name.primaryAlias && entity.name.primaryAlias.term) {
        return cleanVATags(entity.name.primaryAlias.term);
    }
    if (entity.name.term) {
        return cleanVATags(entity.name.term);
    }

    return '';
}

/**
 * Extract address components from an Address object
 * @param {Object} address - Address object
 * @returns {Object} {line1, line2, city, state, zip}
 */
function extractAddressComponents(address) {
    const result = { line1: '', line2: '', city: '', state: '', zip: '' };
    if (!address) return result;

    // Line 1: street address from primaryAlias or components
    if (address.primaryAlias && address.primaryAlias.term) {
        result.line1 = cleanVATags(address.primaryAlias.term);
    } else if (address.streetNumber || address.streetName) {
        const parts = [];
        if (address.streetNumber?.term) parts.push(address.streetNumber.term);
        if (address.streetName?.term) parts.push(address.streetName.term);
        if (address.streetType?.term) parts.push(address.streetType.term);
        result.line1 = cleanVATags(parts.join(' '));
    }

    // Line 2: secondary unit
    if (address.secUnitType || address.secUnitNum) {
        const parts = [];
        if (address.secUnitType) parts.push(address.secUnitType);
        if (address.secUnitNum) parts.push(address.secUnitNum);
        result.line2 = parts.join(' ');
    }

    // City, State, Zip
    if (address.city?.term) result.city = cleanVATags(address.city.term);
    if (address.state?.term) result.state = cleanVATags(address.state.term);
    if (address.zipCode?.term) result.zip = cleanVATags(address.zipCode.term);

    return result;
}

/**
 * Format a full address as a single string
 * @param {Object} address - Address object
 * @returns {string} Full address string
 */
function formatFullAddress(address) {
    if (!address) return '';
    const comp = extractAddressComponents(address);
    const parts = [];
    if (comp.line1) parts.push(comp.line1);
    if (comp.line2) parts.push(comp.line2);
    const cityStateZip = [];
    if (comp.city) cityStateZip.push(comp.city);
    if (comp.state) cityStateZip.push(comp.state);
    if (comp.zip) cityStateZip.push(comp.zip);
    if (cityStateZip.length > 0) parts.push(cityStateZip.join(' '));
    return parts.join(', ');
}

/**
 * Extract alternatives from an Aliased object
 * @param {Object} aliased - Aliased object with alternatives property
 * @param {string} category - 'homonyms', 'synonyms', or 'candidates'
 * @returns {Array<string>} Array of term strings
 */
function extractAlternatives(aliased, category) {
    if (!aliased || !aliased.alternatives) return [];
    const alts = aliased.alternatives;

    let items = [];
    if (category === 'homonyms' && alts.homonyms) {
        items = alts.homonyms;
    } else if (category === 'synonyms' && alts.synonyms) {
        items = alts.synonyms;
    } else if (category === 'candidates' && alts.candidates) {
        items = alts.candidates;
    }

    // Extract term from each AttributedTerm
    return items.map(item => {
        if (item && item.term) return cleanVATags(item.term);
        if (typeof item === 'string') return cleanVATags(item);
        return '';
    }).filter(t => t);
}

/**
 * Build alternative columns (first 3 individual, rest pipe-delimited in 4th)
 * @param {Array<string>} items - Array of alternative strings
 * @returns {Array<string>} Array of 4 column values
 */
function buildAlternativeColumns(items) {
    const result = ['', '', '', ''];
    if (!items || items.length === 0) return result;

    if (items.length >= 1) result[0] = items[0];
    if (items.length >= 2) result[1] = items[1];
    if (items.length >= 3) result[2] = items[2];
    if (items.length > 3) result[3] = items.slice(3).join('|');

    return result;
}

/**
 * Get entity type string for CSV
 * @param {Object} entity - Entity object
 * @returns {string} Entity type name
 */
function getEntityTypeString(entity) {
    if (!entity) return '';
    return entity.__type || entity.constructor?.name || 'Unknown';
}

/**
 * Get source string for an entity
 * @param {Object} entity - Entity object
 * @param {string} key - Entity database key (optional, for fallback)
 * @returns {string} 'visionAppraisal', 'bloomerang', or 'both'
 */
function getEntitySource(entity, key) {
    if (entity && entity.source) {
        if (entity.source.toLowerCase().includes('vision')) return 'visionAppraisal';
        if (entity.source.toLowerCase().includes('bloomerang')) return 'bloomerang';
    }
    // Fallback: infer from key
    if (key) {
        if (key.startsWith('visionAppraisal:')) return 'visionAppraisal';
        if (key.startsWith('bloomerang:')) return 'bloomerang';
    }
    return 'unknown';
}

/**
 * Get email from entity
 * @param {Object} entity - Entity object
 * @returns {string} Email address or empty string
 */
function getEntityEmail(entity) {
    if (!entity || !entity.contactInfo || !entity.contactInfo.email) return '';
    const email = entity.contactInfo.email;
    if (email.primaryAlias && email.primaryAlias.term) return cleanVATags(email.primaryAlias.term);
    if (email.term) return cleanVATags(email.term);
    return '';
}

/**
 * Get phone from entity
 * @param {Object} entity - Entity object
 * @returns {string} Phone number or empty string
 */
function getEntityPhone(entity) {
    if (!entity || !entity.contactInfo || !entity.contactInfo.phone) return '';
    const phone = entity.contactInfo.phone;
    if (phone.primaryAlias && phone.primaryAlias.term) return cleanVATags(phone.primaryAlias.term);
    if (phone.term) return cleanVATags(phone.term);
    return '';
}

/**
 * Get PO Box from entity
 * @param {Object} entity - Entity object
 * @returns {string} PO Box or empty string
 */
function getEntityPOBox(entity) {
    if (!entity || !entity.contactInfo || !entity.contactInfo.poBox) return '';
    const poBox = entity.contactInfo.poBox;
    if (poBox.primaryAlias && poBox.primaryAlias.term) return cleanVATags(poBox.primaryAlias.term);
    if (poBox.term) return cleanVATags(poBox.term);
    return '';
}

/**
 * Get secondary addresses from entity
 * @param {Object} entity - Entity object
 * @returns {Array<string>} Array of formatted secondary address strings
 */
function getSecondaryAddresses(entity) {
    if (!entity || !entity.contactInfo || !entity.contactInfo.secondaryAddress) return [];
    const secondaries = entity.contactInfo.secondaryAddress;
    if (!Array.isArray(secondaries)) return [];
    return secondaries.map(addr => formatFullAddress(addr)).filter(a => a);
}

/**
 * Build secondary address columns (first 3 individual, rest pipe-delimited in 4th)
 * @param {Array<string>} addresses - Array of formatted address strings
 * @returns {Array<string>} Array of 4 column values
 */
function buildSecondaryAddressColumns(addresses) {
    const result = ['', '', '', ''];
    if (!addresses || addresses.length === 0) return result;

    if (addresses.length >= 1) result[0] = addresses[0];
    if (addresses.length >= 2) result[1] = addresses[1];
    if (addresses.length >= 3) result[2] = addresses[2];
    if (addresses.length > 3) result[3] = addresses.slice(3).join('|');

    return result;
}

/**
 * Extract SecAddr1 component columns from the first secondary address
 * @param {Object} entity - Entity object
 * @returns {Array<string>} Array of 9 component values
 */
function extractSecAddr1Components(entity) {
    const result = ['', '', '', '', '', '', '', '', ''];
    if (!entity || !entity.contactInfo || !entity.contactInfo.secondaryAddress) return result;

    const secondaries = entity.contactInfo.secondaryAddress;
    if (!Array.isArray(secondaries) || secondaries.length === 0) return result;

    const addr = secondaries[0];
    if (!addr) return result;

    // Extract each component directly from the Address object properties
    result[0] = addr.primaryAlias?.term ? cleanVATags(addr.primaryAlias.term) : '';
    result[1] = addr.streetNumber?.term ? cleanVATags(String(addr.streetNumber.term)) : '';
    result[2] = addr.streetName?.term ? cleanVATags(addr.streetName.term) : '';
    result[3] = addr.streetType?.term ? cleanVATags(addr.streetType.term) : '';
    result[4] = addr.city?.term ? cleanVATags(addr.city.term) : '';
    result[5] = addr.state?.term ? cleanVATags(addr.state.term) : '';
    result[6] = addr.zipCode?.term ? cleanVATags(String(addr.zipCode.term)) : '';
    result[7] = addr.secUnitType?.term ? cleanVATags(addr.secUnitType.term) : '';
    result[8] = addr.secUnitNum?.term ? cleanVATags(String(addr.secUnitNum.term)) : '';

    return result;
}

/**
 * Generate a CSV row for an entity (consensus, founding, member, or nearmiss)
 * @param {string} rowType - 'consensus', 'founding', 'member', or 'nearmiss'
 * @param {Object} entity - Entity object
 * @param {string} key - Entity database key (empty for consensus)
 * @param {number|string} groupIndex - Group index (for consensus/founding only)
 * @param {boolean} includeAlternatives - Whether to populate alternatives columns
 * @returns {Array<string>} Array of 62 column values
 */
function generateCSVRow(rowType, entity, key, groupIndex, includeAlternatives) {
    const row = new Array(62).fill('');

    // Section 1: Identification & Mail Merge Core (columns 0-9)
    row[0] = rowType;                                    // RowType
    row[1] = (rowType === 'consensus' || rowType === 'founding' || rowType === 'consolidated') ? String(groupIndex) : ''; // GroupIndex
    row[2] = (rowType === 'consensus' || rowType === 'consolidated') ? '' : key;       // Key
    row[3] = assembleMailName(entity);                   // MailName

    // Primary address components
    const primaryAddr = entity?.contactInfo?.primaryAddress;
    const addrComp = extractAddressComponents(primaryAddr);
    row[4] = addrComp.line1;                             // MailAddr1
    row[5] = addrComp.line2;                             // MailAddr2
    row[6] = addrComp.city;                              // MailCity
    row[7] = addrComp.state;                             // MailState
    row[8] = addrComp.zip;                               // MailZip
    row[9] = getEntityEmail(entity);                     // Email

    // Section 2: Additional Contact Info (columns 10-23)
    row[10] = getEntityPhone(entity);                    // Phone
    row[11] = getEntityPOBox(entity);                    // POBox

    // SecAddr1 components (columns 12-20)
    const secAddr1Comps = extractSecAddr1Components(entity);
    row[12] = secAddr1Comps[0];                          // SecAddr1_primaryAlias
    row[13] = secAddr1Comps[1];                          // SecAddr1_streetNumber
    row[14] = secAddr1Comps[2];                          // SecAddr1_streetName
    row[15] = secAddr1Comps[3];                          // SecAddr1_streetType
    row[16] = secAddr1Comps[4];                          // SecAddr1_city
    row[17] = secAddr1Comps[5];                          // SecAddr1_state
    row[18] = secAddr1Comps[6];                          // SecAddr1_zipCode
    row[19] = secAddr1Comps[7];                          // SecAddr1_secUnitType
    row[20] = secAddr1Comps[8];                          // SecAddr1_secUnitNum

    // SecAddr2, SecAddr3, SecAddrMore (columns 21-23) - remaining secondary addresses as formatted strings
    const secAddrs = getSecondaryAddresses(entity);
    row[21] = secAddrs.length >= 2 ? secAddrs[1] : '';   // SecAddr2
    row[22] = secAddrs.length >= 3 ? secAddrs[2] : '';   // SecAddr3
    row[23] = secAddrs.length > 3 ? secAddrs.slice(3).join('|') : '';  // SecAddrMore

    // Section 3: Entity Metadata (columns 24-25)
    row[24] = getEntityTypeString(entity);               // EntityType
    row[25] = (rowType === 'consensus' || rowType === 'consolidated') ? rowType : getEntitySource(entity, key); // Source

    // Sections 4-6: Alternatives (only for consensus row)
    if (includeAlternatives && entity) {
        // Name alternatives (columns 26-37)
        const nameHom = extractAlternatives(entity.name, 'homonyms');
        const nameSyn = extractAlternatives(entity.name, 'synonyms');
        const nameCand = extractAlternatives(entity.name, 'candidates');

        const nameHomCols = buildAlternativeColumns(nameHom);
        row[26] = nameHomCols[0]; row[27] = nameHomCols[1]; row[28] = nameHomCols[2]; row[29] = nameHomCols[3];

        const nameSynCols = buildAlternativeColumns(nameSyn);
        row[30] = nameSynCols[0]; row[31] = nameSynCols[1]; row[32] = nameSynCols[2]; row[33] = nameSynCols[3];

        const nameCandCols = buildAlternativeColumns(nameCand);
        row[34] = nameCandCols[0]; row[35] = nameCandCols[1]; row[36] = nameCandCols[2]; row[37] = nameCandCols[3];

        // Address alternatives (columns 38-49) - from primaryAddress
        const addrHom = extractAlternatives(primaryAddr, 'homonyms');
        const addrSyn = extractAlternatives(primaryAddr, 'synonyms');
        const addrCand = extractAlternatives(primaryAddr, 'candidates');

        const addrHomCols = buildAlternativeColumns(addrHom);
        row[38] = addrHomCols[0]; row[39] = addrHomCols[1]; row[40] = addrHomCols[2]; row[41] = addrHomCols[3];

        const addrSynCols = buildAlternativeColumns(addrSyn);
        row[42] = addrSynCols[0]; row[43] = addrSynCols[1]; row[44] = addrSynCols[2]; row[45] = addrSynCols[3];

        const addrCandCols = buildAlternativeColumns(addrCand);
        row[46] = addrCandCols[0]; row[47] = addrCandCols[1]; row[48] = addrCandCols[2]; row[49] = addrCandCols[3];

        // Email alternatives (columns 50-61) - from email
        const emailObj = entity?.contactInfo?.email;
        const emailHom = extractAlternatives(emailObj, 'homonyms');
        const emailSyn = extractAlternatives(emailObj, 'synonyms');
        const emailCand = extractAlternatives(emailObj, 'candidates');

        const emailHomCols = buildAlternativeColumns(emailHom);
        row[50] = emailHomCols[0]; row[51] = emailHomCols[1]; row[52] = emailHomCols[2]; row[53] = emailHomCols[3];

        const emailSynCols = buildAlternativeColumns(emailSyn);
        row[54] = emailSynCols[0]; row[55] = emailSynCols[1]; row[56] = emailSynCols[2]; row[57] = emailSynCols[3];

        const emailCandCols = buildAlternativeColumns(emailCand);
        row[58] = emailCandCols[0]; row[59] = emailCandCols[1]; row[60] = emailCandCols[2]; row[61] = emailCandCols[3];
    }

    return row;
}

/**
 * Generate all CSV rows for a single EntityGroup
 * Per spec: consensus, founding, member(s), nearmiss(es)
 * @param {Object} group - EntityGroup object
 * @param {boolean} includeNearMisses - Whether to include near miss rows
 * @returns {Array<Array<string>>} Array of row arrays
 */
function generateEntityGroupRows(group, includeNearMisses) {
    const rows = [];

    // 1. Consensus row (if group has consensus entity, or use founding member data)
    const consensusEntity = group.consensusEntity || getEntityByKey(group.foundingMemberKey);
    if (consensusEntity) {
        rows.push(generateCSVRow('consensus', consensusEntity, '', group.index, true));
    }

    // 2. Founding member row
    const foundingEntity = getEntityByKey(group.foundingMemberKey);
    if (foundingEntity) {
        rows.push(generateCSVRow('founding', foundingEntity, group.foundingMemberKey, group.index, false));
    }

    // 3. Other member rows (excluding founding member)
    if (group.memberKeys && group.memberKeys.length > 1) {
        for (const memberKey of group.memberKeys) {
            if (memberKey !== group.foundingMemberKey) {
                const memberEntity = getEntityByKey(memberKey);
                if (memberEntity) {
                    rows.push(generateCSVRow('member', memberEntity, memberKey, '', false));
                }
            }
        }
    }

    // 4. Near miss rows (if enabled)
    if (includeNearMisses && group.nearMissKeys && group.nearMissKeys.length > 0) {
        for (const nearMissKey of group.nearMissKeys) {
            const nearMissEntity = getEntityByKey(nearMissKey);
            if (nearMissEntity) {
                rows.push(generateCSVRow('nearmiss', nearMissEntity, nearMissKey, '', false));
            }
        }
    }

    return rows;
}

/**
 * Export EntityGroups to CSV files (prospects and donors)
 * Main export function per reference_csvExportSpecification.md
 *
 * @param {Object} groupDatabase - EntityGroupDatabase (serialized format)
 * @param {Object} options - Export options
 * @param {boolean} options.includeNearMisses - Include near miss rows (default: true)
 * @returns {Object} {prospectsCSV, donorsCSV, stats}
 */
function exportEntityGroupsToCSV(groupDatabase, options = {}) {
    const includeNearMisses = options.includeNearMisses !== false; // default true

    const groups = Object.values(groupDatabase.groups || {});

    // Separate prospects (no Bloomerang members) from donors (has Bloomerang members)
    const prospectGroups = groups.filter(g => !g.hasBloomerangMember);
    const donorGroups = groups.filter(g => g.hasBloomerangMember);

    // Build CSV header row
    const headerRow = CSV_HEADERS.map(h => csvEscape(h)).join(',');

    // Generate prospect rows
    const prospectRows = [];
    for (const group of prospectGroups) {
        const groupRows = generateEntityGroupRows(group, includeNearMisses);
        prospectRows.push(...groupRows);
    }

    // Generate donor rows
    const donorRows = [];
    for (const group of donorGroups) {
        const groupRows = generateEntityGroupRows(group, includeNearMisses);
        donorRows.push(...groupRows);
    }

    // Build CSV strings
    const prospectDataRows = prospectRows.map(row => row.map(v => csvEscape(v)).join(','));
    const donorDataRows = donorRows.map(row => row.map(v => csvEscape(v)).join(','));

    const prospectsCSV = [headerRow, ...prospectDataRows].join('\n');
    const donorsCSV = [headerRow, ...donorDataRows].join('\n');

    return {
        prospectsCSV,
        donorsCSV,
        stats: {
            prospectGroups: prospectGroups.length,
            prospectRows: prospectRows.length,
            donorGroups: donorGroups.length,
            donorRows: donorRows.length
        }
    };
}

/**
 * Download CSV export files (triggered from UI)
 * Downloads both prospects.csv and donors.csv
 */
function downloadCSVExport() {
    const db = entityGroupBrowser.loadedDatabase || window.entityGroupDatabase;
    if (!db) {
        showEntityGroupStatus('Please load an EntityGroup database first', 'error');
        return;
    }

    // Check if unified database is loaded (needed for entity lookups)
    if (!window.unifiedEntityDatabase || !window.unifiedEntityDatabase.entities) {
        showEntityGroupStatus('Please load the Unified Entity Database first (needed for entity details)', 'error');
        return;
    }

    showEntityGroupStatus('Generating CSV export...', 'loading');

    try {
        // Get include near misses option from checkbox if present
        const nearMissCheckbox = document.getElementById('csvIncludeNearMisses');
        const includeNearMisses = nearMissCheckbox ? nearMissCheckbox.checked : true;

        const result = exportEntityGroupsToCSV(db, { includeNearMisses });

        const dateStr = new Date().toISOString().slice(0, 10);

        // Download prospects CSV
        const prospectsBlob = new Blob([result.prospectsCSV], { type: 'text/csv;charset=utf-8;' });
        const prospectsUrl = URL.createObjectURL(prospectsBlob);
        const prospectsLink = document.createElement('a');
        prospectsLink.href = prospectsUrl;
        prospectsLink.download = `prospects_${dateStr}.csv`;
        document.body.appendChild(prospectsLink);
        prospectsLink.click();
        document.body.removeChild(prospectsLink);
        URL.revokeObjectURL(prospectsUrl);

        // Small delay before second download
        setTimeout(() => {
            // Download donors CSV
            const donorsBlob = new Blob([result.donorsCSV], { type: 'text/csv;charset=utf-8;' });
            const donorsUrl = URL.createObjectURL(donorsBlob);
            const donorsLink = document.createElement('a');
            donorsLink.href = donorsUrl;
            donorsLink.download = `donors_${dateStr}.csv`;
            document.body.appendChild(donorsLink);
            donorsLink.click();
            document.body.removeChild(donorsLink);
            URL.revokeObjectURL(donorsUrl);

            showEntityGroupStatus(
                `Exported ${result.stats.prospectGroups} prospect groups (${result.stats.prospectRows} rows) ` +
                `and ${result.stats.donorGroups} donor groups (${result.stats.donorRows} rows)`,
                'success'
            );
        }, 500);

    } catch (error) {
        console.error('CSV export error:', error);
        showEntityGroupStatus(`Export error: ${error.message}`, 'error');
    }
}

// Export for global access
window.exportEntityGroupsToCSV = exportEntityGroupsToCSV;
window.downloadCSVExport = downloadCSVExport;

// =============================================================================
// ASSESSMENT VALUE REPORT
// =============================================================================

/**
 * Extract all names from an entity, including individual names from households.
 * @param {Object} entity - Entity object
 * @returns {string[]} - Array of formatted name strings
 */
function extractAllNamesFromEntity(entity) {
    const names = [];
    if (!entity) return names;

    // Extract entity's own name
    let entityName = entity.name?.primaryAlias?.term || entity.name?.term || '';
    if (typeof entityName === 'object' && entityName !== null) {
        entityName = formatNameObject(entityName);
    }
    if (entityName && !names.includes(entityName)) {
        names.push(entityName);
    }

    // If it's a household (AggregateHousehold), also extract individual names
    // Check by type property (from loaded JSON) or constructor name
    const entityType = entity.type || entity.constructor?.name;
    if (entityType === 'AggregateHousehold' && entity.individuals && Array.isArray(entity.individuals)) {
        for (const individual of entity.individuals) {
            let indivName = individual.name?.primaryAlias?.term || individual.name?.term || '';
            if (typeof indivName === 'object' && indivName !== null) {
                indivName = formatNameObject(indivName);
            }
            if (indivName && !names.includes(indivName)) {
                names.push(indivName);
            }
        }
    }

    return names;
}

/**
 * Deduplicate names by similarity - removes names that are too similar to earlier names.
 * Uses levenshteinSimilarity with the trueMatch.nameAlone threshold (0.875).
 * Keeps the first occurrence, removes subsequent similar names.
 * @param {string[]} names - Array of name strings
 * @returns {string[]} - Deduplicated array of names
 */
function deduplicateNamesBySimilarity(names) {
    if (!names || names.length <= 1) return names;

    // Get threshold from MATCH_CRITERIA - trueMatch.nameAlone = 0.875
    const threshold = window.MATCH_CRITERIA?.trueMatch?.nameAlone || 0.875;

    const deduplicated = [];
    for (const name of names) {
        // Check if this name is too similar to any already-kept name
        let isDuplicate = false;
        for (const keptName of deduplicated) {
            const similarity = window.levenshteinSimilarity(name, keptName);
            if (similarity >= threshold) {
                isDuplicate = true;
                break;
            }
        }
        if (!isDuplicate) {
            deduplicated.push(name);
        }
    }
    return deduplicated;
}

/**
 * Generate a CSV report of total assessed values per entity group.
 * Calculates total assessment value across all member entities (avoiding duplicates).
 * Includes:
 * - Consensus name and address
 * - Total assessed value
 * - Number of properties combined
 * - All names from member entities (including individuals within households)
 * Sorted by total value descending.
 *
 * @param {Object} groupDatabase - EntityGroupDatabase to export
 * @returns {Object} { csv: string, stats: { groupCount, groupsWithValues, totalValue, maxNamesPerGroup } }
 */
function generateAssessmentValueReport(groupDatabase) {
    const entityDb = window.unifiedEntityDatabase;
    if (!entityDb || !entityDb.entities) {
        throw new Error('Unified Entity Database not loaded');
    }

    const reportRows = [];
    let maxNamesPerGroup = 0;

    // EntityGroupDatabase.groups is always an Object keyed by index, never an Array
    for (const group of Object.values(groupDatabase.groups)) {
        // Track keys we've already processed to avoid duplicates
        const processedKeys = new Set();
        let totalAssessment = 0;
        let propertiesWithValue = 0;
        const allNames = [];

        // Process all member keys (includes founding member)
        for (const memberKey of group.memberKeys) {
            if (processedKeys.has(memberKey)) continue;
            processedKeys.add(memberKey);

            const entity = entityDb.entities[memberKey];
            if (!entity) continue;

            // Extract assessment value from entity's otherInfo
            const assessmentValue = entity.otherInfo?.assessmentValue;
            if (assessmentValue) {
                const numericValue = parseAssessmentValue(assessmentValue);
                if (!isNaN(numericValue) && numericValue > 0) {
                    totalAssessment += numericValue;
                    propertiesWithValue++;
                }
            }

            // Also extract assessment values from SUBDIVISION entities
            // Subdivisions are PIDs that were merged into this entity (same owner, same fire number)
            const subdivision = entity.otherInfo?.subdivision;
            if (subdivision && typeof subdivision === 'object') {
                for (const [pid, subdivEntity] of Object.entries(subdivision)) {
                    // subdivEntity can be a full entity object or a serialized string
                    let subdivOtherInfo = null;
                    if (typeof subdivEntity === 'string') {
                        try {
                            const parsed = JSON.parse(subdivEntity);
                            subdivOtherInfo = parsed.otherInfo;
                        } catch (e) {
                            // Ignore parse errors
                        }
                    } else if (subdivEntity && typeof subdivEntity === 'object') {
                        subdivOtherInfo = subdivEntity.otherInfo;
                    }

                    if (subdivOtherInfo?.assessmentValue) {
                        const subdivValue = parseAssessmentValue(subdivOtherInfo.assessmentValue);
                        if (!isNaN(subdivValue) && subdivValue > 0) {
                            totalAssessment += subdivValue;
                            propertiesWithValue++;
                        }
                    }
                }
            }

            // Extract all names from this entity (including individuals in households)
            const entityNames = extractAllNamesFromEntity(entity);
            for (const name of entityNames) {
                if (name && !allNames.includes(name)) {
                    allNames.push(name);
                }
            }
        }

        // Deduplicate names by similarity (removes names >= 0.875 similar to earlier names)
        const deduplicatedNames = deduplicateNamesBySimilarity(allNames);

        // Track maximum names for CSV column count
        if (deduplicatedNames.length > maxNamesPerGroup) {
            maxNamesPerGroup = deduplicatedNames.length;
        }

        // Extract consensus name and address
        let consensusName = '';
        let consensusAddress = '';

        if (group.consensusEntity) {
            const ce = group.consensusEntity;
            consensusName = ce.name?.primaryAlias?.term || ce.name?.term || '';
            if (typeof consensusName === 'object' && consensusName !== null) {
                consensusName = formatNameObject(consensusName);
            }
            consensusAddress = ce.contactInfo?.primaryAddress?.primaryAlias?.term ||
                               ce.contactInfo?.primaryAddress?.term ||
                               ce.locationIdentifier?.primaryAlias?.term || '';
            if (typeof consensusAddress === 'object' && consensusAddress !== null) {
                consensusAddress = formatAddressObject(consensusAddress);
            }
        } else if (group.memberKeys.length > 0) {
            // Singleton - use founding member
            const founder = entityDb.entities[group.foundingMemberKey];
            if (founder) {
                consensusName = founder.name?.primaryAlias?.term || founder.name?.term || '';
                if (typeof consensusName === 'object' && consensusName !== null) {
                    consensusName = formatNameObject(consensusName);
                }
                consensusAddress = founder.contactInfo?.primaryAddress?.primaryAlias?.term ||
                                   founder.contactInfo?.primaryAddress?.term ||
                                   founder.locationIdentifier?.primaryAlias?.term || '';
                if (typeof consensusAddress === 'object' && consensusAddress !== null) {
                    consensusAddress = formatAddressObject(consensusAddress);
                }
            }
        }

        reportRows.push({
            groupIndex: group.index,
            consensusName: consensusName,
            consensusAddress: consensusAddress,
            totalAssessment: totalAssessment,
            propertiesWithValue: propertiesWithValue,
            memberCount: group.memberKeys.length,
            allNames: deduplicatedNames
        });
    }

    // Sort by total assessment value descending
    reportRows.sort((a, b) => b.totalAssessment - a.totalAssessment);

    // Generate CSV header with dynamic name columns
    const nameColumnHeaders = [];
    for (let i = 1; i <= maxNamesPerGroup; i++) {
        nameColumnHeaders.push(`Name ${i}`);
    }
    const csvHeader = [
        'Group Index',
        'Consensus Name',
        'Consensus Address',
        'Total Assessed Value',
        'Properties Combined',
        'Member Count',
        ...nameColumnHeaders
    ].join(',');
    const csvLines = [csvHeader];

    let groupsWithValues = 0;
    let grandTotal = 0;

    for (const row of reportRows) {
        if (row.totalAssessment > 0) {
            groupsWithValues++;
            grandTotal += row.totalAssessment;
        }

        // Build name columns (pad with empty strings if fewer names than max)
        const nameColumns = [];
        for (let i = 0; i < maxNamesPerGroup; i++) {
            nameColumns.push(escapeCSVField(row.allNames[i] || ''));
        }

        csvLines.push([
            row.groupIndex,
            escapeCSVField(row.consensusName),
            escapeCSVField(row.consensusAddress),
            row.totalAssessment,
            row.propertiesWithValue,
            row.memberCount,
            ...nameColumns
        ].join(','));
    }

    return {
        csv: csvLines.join('\n'),
        stats: {
            groupCount: reportRows.length,
            groupsWithValues: groupsWithValues,
            totalValue: grandTotal,
            maxNamesPerGroup: maxNamesPerGroup
        }
    };
}

/**
 * Parse an assessment value string to a number.
 * Handles formats like "$454,500" or "454500"
 */
function parseAssessmentValue(value) {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return NaN;
    // Remove $ and commas, then parse
    const cleaned = value.replace(/[$,]/g, '');
    return parseFloat(cleaned);
}

/**
 * Format a structured name object to a string
 */
function formatNameObject(nameObj) {
    if (!nameObj) return '';
    if (typeof nameObj === 'string') return nameObj;
    // Handle IndividualName structure
    const parts = [];
    if (nameObj.firstName) parts.push(nameObj.firstName);
    if (nameObj.otherNames) parts.push(nameObj.otherNames);
    if (nameObj.lastName) parts.push(nameObj.lastName);
    if (parts.length > 0) return parts.join(' ');
    // Fallback: try term or primaryAlias
    if (nameObj.term) return typeof nameObj.term === 'string' ? nameObj.term : formatNameObject(nameObj.term);
    if (nameObj.primaryAlias?.term) return formatNameObject(nameObj.primaryAlias.term);
    return '';
}

/**
 * Format a structured address object to a string
 */
function formatAddressObject(addrObj) {
    if (!addrObj) return '';
    if (typeof addrObj === 'string') return addrObj;
    // Handle Address structure
    const parts = [];
    if (addrObj.streetAddress) parts.push(addrObj.streetAddress);
    if (addrObj.city) parts.push(addrObj.city);
    if (addrObj.state) parts.push(addrObj.state);
    if (addrObj.zip) parts.push(addrObj.zip);
    if (parts.length > 0) return parts.join(', ');
    // Fallback: try term or primaryAlias
    if (addrObj.term) return typeof addrObj.term === 'string' ? addrObj.term : formatAddressObject(addrObj.term);
    if (addrObj.primaryAlias?.term) return formatAddressObject(addrObj.primaryAlias.term);
    return '';
}

/**
 * Escape a field for CSV format
 */
function escapeCSVField(value) {
    if (value == null) return '';
    const str = String(value);
    // If contains comma, newline, or quote, wrap in quotes and escape internal quotes
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

/**
 * Download the assessment value report as CSV
 */
function downloadAssessmentValueReport() {
    const db = entityGroupBrowser.loadedDatabase || window.entityGroupDatabase;
    if (!db) {
        showEntityGroupStatus('Please load an EntityGroup database first', 'error');
        return;
    }

    if (!window.unifiedEntityDatabase || !window.unifiedEntityDatabase.entities) {
        showEntityGroupStatus('Please load the Unified Entity Database first (needed for entity details)', 'error');
        return;
    }

    showEntityGroupStatus('Generating Assessment Value Report...', 'loading');

    try {
        const result = generateAssessmentValueReport(db);
        const dateStr = new Date().toISOString().slice(0, 10);

        // Download CSV
        const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `assessment_values_${dateStr}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showEntityGroupStatus(
            `Assessment Report: ${result.stats.groupCount} groups, ` +
            `${result.stats.groupsWithValues} with values, ` +
            `Total: $${result.stats.totalValue.toLocaleString()}, ` +
            `Max names: ${result.stats.maxNamesPerGroup}`,
            'success'
        );

    } catch (error) {
        console.error('Assessment value report error:', error);
        showEntityGroupStatus(`Report error: ${error.message}`, 'error');
    }
}

// Export for global access
window.generateAssessmentValueReport = generateAssessmentValueReport;
window.downloadAssessmentValueReport = downloadAssessmentValueReport;

// =============================================================================
// ASSESSMENT VALUE CHECKSUM VERIFICATION
// =============================================================================

/**
 * Calculate assessment value totals from raw VisionAppraisal data (pre-entity stage).
 * This provides a checksum to verify the assessment value report is not omitting properties.
 *
 * Must be run AFTER VisionAppraisal data is loaded (after clicking "Load VA Data").
 *
 * @returns {Object} { totalValue, propertyCount, breakdown: { withValue, withZeroValue, withoutValue } }
 */
async function calculateRawAssessmentChecksum() {
    console.log('=== CALCULATING RAW ASSESSMENT CHECKSUM ===');

    // Try to load VisionAppraisal data fresh
    if (!window.VisionAppraisal) {
        throw new Error('VisionAppraisal data source not loaded. Load the app first.');
    }

    const rawData = await window.VisionAppraisal.loadData();
    console.log(`Loaded ${rawData.length} raw VisionAppraisal records`);

    let totalValue = 0;
    let withValue = 0;
    let withZeroValue = 0;
    let withoutValue = 0;

    for (const record of rawData) {
        const assessmentStr = record.assessmentValue;
        if (!assessmentStr || assessmentStr.trim() === '') {
            withoutValue++;
            continue;
        }

        const numericValue = parseAssessmentValue(assessmentStr);
        if (isNaN(numericValue)) {
            withoutValue++;
            continue;
        }

        if (numericValue === 0) {
            withZeroValue++;
        } else {
            withValue++;
            totalValue += numericValue;
        }
    }

    const result = {
        totalValue,
        propertyCount: rawData.length,
        breakdown: {
            withValue,
            withZeroValue,
            withoutValue
        }
    };

    console.log('=== RAW CHECKSUM RESULT ===');
    console.log(`Total Properties: ${result.propertyCount}`);
    console.log(`  With assessment value > 0: ${withValue}`);
    console.log(`  With assessment value = 0: ${withZeroValue}`);
    console.log(`  Without assessment value: ${withoutValue}`);
    console.log(`TOTAL ASSESSED VALUE: $${totalValue.toLocaleString()}`);

    return result;
}

/**
 * Run a full checksum verification comparing raw data to report output.
 * Loads raw data, generates report, and compares totals.
 */
async function verifyAssessmentChecksum() {
    const db = entityGroupBrowser.loadedDatabase || window.entityGroupDatabase;
    if (!db) {
        showEntityGroupStatus('Please load an EntityGroup database first', 'error');
        return null;
    }

    if (!window.unifiedEntityDatabase || !window.unifiedEntityDatabase.entities) {
        showEntityGroupStatus('Please load the Unified Entity Database first', 'error');
        return null;
    }

    showEntityGroupStatus('Calculating assessment checksums...', 'loading');

    try {
        // Get raw checksum
        const rawChecksum = await calculateRawAssessmentChecksum();

        // Get report checksum
        const reportResult = generateAssessmentValueReport(db);

        // Compare
        const reportTotal = reportResult.stats.totalValue;
        const rawTotal = rawChecksum.totalValue;
        const difference = rawTotal - reportTotal;
        const percentCaptured = rawTotal > 0 ? ((reportTotal / rawTotal) * 100).toFixed(2) : 0;

        const verification = {
            raw: {
                totalValue: rawTotal,
                propertyCount: rawChecksum.propertyCount,
                propertiesWithValue: rawChecksum.breakdown.withValue
            },
            report: {
                totalValue: reportTotal,
                groupCount: reportResult.stats.groupCount,
                groupsWithValues: reportResult.stats.groupsWithValues,
                propertiesCounted: reportResult.stats.groupsWithValues // approximate
            },
            comparison: {
                difference: difference,
                percentCaptured: parseFloat(percentCaptured),
                match: Math.abs(difference) < 1 // within $1 tolerance
            }
        };

        console.log('\n=== CHECKSUM VERIFICATION ===');
        console.log(`RAW VisionAppraisal Total:  $${rawTotal.toLocaleString()} (${rawChecksum.breakdown.withValue} properties)`);
        console.log(`Report Total:               $${reportTotal.toLocaleString()} (${reportResult.stats.groupsWithValues} groups with values)`);
        console.log(`Difference:                 $${difference.toLocaleString()}`);
        console.log(`Percent Captured:           ${percentCaptured}%`);
        console.log(`Match:                      ${verification.comparison.match ? '✓ YES' : '✗ NO'}`);

        if (verification.comparison.match) {
            showEntityGroupStatus(
                `✓ Checksum VERIFIED: Raw $${rawTotal.toLocaleString()} = Report $${reportTotal.toLocaleString()} (${rawChecksum.breakdown.withValue} properties)`,
                'success'
            );
        } else {
            showEntityGroupStatus(
                `⚠ Checksum MISMATCH: Raw $${rawTotal.toLocaleString()} vs Report $${reportTotal.toLocaleString()} (Δ $${difference.toLocaleString()}, ${percentCaptured}%)`,
                'error'
            );
        }

        return verification;

    } catch (error) {
        console.error('Checksum verification error:', error);
        showEntityGroupStatus(`Checksum error: ${error.message}`, 'error');
        return null;
    }
}

// Export checksum functions
window.calculateRawAssessmentChecksum = calculateRawAssessmentChecksum;
window.verifyAssessmentChecksum = verifyAssessmentChecksum;

// =============================================================================
// ENTITY COMPARISON UTILITY
// =============================================================================

/**
 * Compare two entities by their database keys and output full reconciliation to console
 * @param {string} key1 - First entity database key (e.g., 'visionAppraisal:FireNumber:1418')
 * @param {string} key2 - Second entity database key (e.g., 'visionAppraisal:FireNumber:423')
 */
function compareEntitiesByKey(key1, key2) {
    const db = window.unifiedEntityDatabase;
    if (!db || !db.entities) {
        console.log('ERROR: unifiedEntityDatabase not loaded');
        return { error: 'Database not loaded' };
    }

    const entity1 = db.entities[key1];
    const entity2 = db.entities[key2];

    if (!entity1) {
        console.log(`ERROR: Entity not found: ${key1}`);
        return { error: `Entity not found: ${key1}` };
    }
    if (!entity2) {
        console.log(`ERROR: Entity not found: ${key2}`);
        return { error: `Entity not found: ${key2}` };
    }

    // Extract names for display
    const getName = (entity) => {
        if (entity.name?.primaryAlias?.term) return entity.name.primaryAlias.term;
        if (entity.name?.completeName) return entity.name.completeName;
        if (entity.name?.firstName || entity.name?.lastName) {
            return [entity.name.firstName, entity.name.lastName].filter(Boolean).join(' ');
        }
        return entity.name?.toString?.() || 'Unknown';
    };

    console.log('════════════════════════════════════════════════════════════════');
    console.log('                    ENTITY COMPARISON REPORT                     ');
    console.log('════════════════════════════════════════════════════════════════');

    console.log('\n┌─── ENTITY 1 ───────────────────────────────────────────────────');
    console.log(`│ Key:  ${key1}`);
    console.log(`│ Type: ${entity1.constructor?.name || entity1.__type || 'Unknown'}`);
    console.log(`│ Name: ${getName(entity1)}`);
    console.log('└────────────────────────────────────────────────────────────────');

    console.log('\n┌─── ENTITY 2 ───────────────────────────────────────────────────');
    console.log(`│ Key:  ${key2}`);
    console.log(`│ Type: ${entity2.constructor?.name || entity2.__type || 'Unknown'}`);
    console.log(`│ Name: ${getName(entity2)}`);
    console.log('└────────────────────────────────────────────────────────────────');

    // Perform comparison
    let result;
    if (typeof universalCompareTo === 'function') {
        result = universalCompareTo(entity1, entity2);
    } else if (typeof entity1.compareTo === 'function') {
        result = entity1.compareTo(entity2, true);
    } else {
        console.log('ERROR: No comparison function available');
        return { error: 'No comparison function available' };
    }

    const score = result.score ?? result.overallSimilarity ?? result;
    const scorePercent = (typeof score === 'number' ? score * 100 : 0).toFixed(2);

    console.log('\n┌─── COMPARISON RESULT ──────────────────────────────────────────');
    console.log(`│ Overall Score: ${scorePercent}%`);
    if (result.comparisonType) {
        console.log(`│ Comparison Type: ${result.comparisonType}`);
    }
    console.log('└────────────────────────────────────────────────────────────────');

    // Output detailed breakdown
    if (result.details) {
        console.log('\n┌─── DETAILED BREAKDOWN ─────────────────────────────────────────');

        // Top-level components
        if (result.details.components) {
            console.log('│');
            console.log('│ Components:');
            for (const [compName, compData] of Object.entries(result.details.components)) {
                const sim = (compData.similarity ?? compData.score ?? 0) * 100;
                const weight = (compData.actualWeight ?? compData.weight ?? 0) * 100;
                const contrib = (compData.weightedValue ?? compData.contribution ?? 0) * 100;
                console.log(`│   ${compName}:`);
                console.log(`│     Similarity: ${sim.toFixed(2)}%  Weight: ${weight.toFixed(1)}%  Contribution: ${contrib.toFixed(2)}%`);
            }
        }

        // Subordinate details (nested comparison breakdowns)
        if (result.details.subordinateDetails) {
            console.log('│');
            console.log('│ Subordinate Details:');
            for (const [subName, subData] of Object.entries(result.details.subordinateDetails)) {
                console.log(`│   ${subName}:`);
                if (subData.components) {
                    for (const [subCompName, subCompData] of Object.entries(subData.components)) {
                        const sim = (subCompData.similarity ?? subCompData.score ?? 0) * 100;
                        const weight = (subCompData.actualWeight ?? subCompData.weight ?? 0) * 100;
                        console.log(`│     ${subCompName}: ${sim.toFixed(2)}% (weight: ${weight.toFixed(1)}%)`);
                    }
                }
                if (subData.addressMatch) {
                    console.log(`│     Address Match: ${subData.addressMatch.matchType || 'N/A'}`);
                    console.log(`│       Score: ${((subData.addressMatch.score ?? 0) * 100).toFixed(2)}%`);
                }
            }
        }

        console.log('└────────────────────────────────────────────────────────────────');
    }

    // Full JSON output for deep inspection
    console.log('\n┌─── FULL RESULT OBJECT (expandable) ───────────────────────────');
    console.log('Details:', result.details || result);
    console.log('└────────────────────────────────────────────────────────────────');

    return result;
}

/**
 * Run comparison from UI inputs
 */
function runEntityComparison() {
    const key1Input = document.getElementById('compareEntityKey1');
    const key2Input = document.getElementById('compareEntityKey2');

    if (!key1Input || !key2Input) {
        console.log('ERROR: Input elements not found');
        return;
    }

    const key1 = key1Input.value.trim();
    const key2 = key2Input.value.trim();

    if (!key1 || !key2) {
        alert('Please enter both entity keys');
        return;
    }

    console.clear();
    compareEntitiesByKey(key1, key2);
}

// Export for global access
window.compareEntitiesByKey = compareEntitiesByKey;
window.runEntityComparison = runEntityComparison;

// =============================================================================
// MULTI-VA PROPERTY REPORT
// =============================================================================

/**
 * Generate a CSV report of groups with more than 2 VisionAppraisal members
 * Uses the same format as the Prospects + Donors export (54 columns)
 * Groups are sorted by number of VA members (descending)
 * Near misses are NOT counted toward VA count, but are NOT included in output
 *
 * Usage from console:
 *   exportMultiVAPropertyReport()
 *   exportMultiVAPropertyReport(3)  // minimum 3 VA members (default is 3, i.e., "more than 2")
 *
 * @param {number} minVAMembers - Minimum number of VA members to include (default 3)
 */
function exportMultiVAPropertyReport(minVAMembers = 3) {
    // Use window.entityGroupDatabase if available, otherwise fall back to browser's loadedDatabase
    const groupDatabase = window.entityGroupDatabase || entityGroupBrowser.loadedDatabase;

    if (!groupDatabase || !groupDatabase.groups) {
        console.error('No EntityGroup database loaded. Build or load one first.');
        return;
    }

    // Check if unified database is loaded (needed for entity lookups)
    if (!window.unifiedEntityDatabase || !window.unifiedEntityDatabase.entities) {
        console.error('Please load the Unified Entity Database first (needed for entity details).');
        return;
    }

    console.log(`Generating Multi-VA Property Report (minimum ${minVAMembers} VA members)...`);

    // Analyze each group for VA member count
    const groupsWithVACount = [];

    // groups is an object keyed by index, not an array
    const allGroups = Object.values(groupDatabase.groups);
    for (const group of allGroups) {
        // Count VisionAppraisal members (NOT near misses)
        const memberKeys = group.memberKeys || [];
        const vaMembers = memberKeys.filter(key => key.startsWith('visionAppraisal:'));
        const vaCount = vaMembers.length;

        if (vaCount >= minVAMembers) {
            groupsWithVACount.push({
                group: group,
                vaCount: vaCount
            });
        }
    }

    // Sort by VA count descending
    groupsWithVACount.sort((a, b) => b.vaCount - a.vaCount);

    console.log(`Found ${groupsWithVACount.length} groups with ${minVAMembers}+ VA members`);

    if (groupsWithVACount.length === 0) {
        console.log('No groups match the criteria.');
        return;
    }

    // Build CSV using the same format as Prospects + Donors export
    const headerRow = CSV_HEADERS.map(h => csvEscape(h)).join(',');

    // Generate rows for each qualifying group (no near misses)
    const allRows = [];
    for (const item of groupsWithVACount) {
        const groupRows = generateEntityGroupRows(item.group, false); // false = no near misses
        allRows.push(...groupRows);
    }

    const dataRows = allRows.map(row => row.map(v => csvEscape(v)).join(','));
    const csv = [headerRow, ...dataRows].join('\n');

    // Download
    const dateStr = new Date().toISOString().slice(0, 10);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `multi_va_property_report_${minVAMembers}plus_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`Exported ${groupsWithVACount.length} groups (${allRows.length} rows) to CSV`);

    // Also return the data for inspection
    return {
        totalGroups: groupsWithVACount.length,
        totalRows: allRows.length,
        groups: groupsWithVACount
    };
}

// Export for global access
window.exportMultiVAPropertyReport = exportMultiVAPropertyReport;

// =============================================================================
// PROSPECT MAIL MERGE EXPORT
// =============================================================================

/**
 * Get the entity type of the founding member for an EntityGroup
 * @param {Object} group - EntityGroup object
 * @param {Object} entityDb - Unified entity database
 * @returns {string} Entity type name or 'Unknown'
 */
function getFoundingMemberType(group, entityDb) {
    if (!group || !group.foundingMemberKey || !entityDb?.entities) {
        return 'Unknown';
    }
    const founder = entityDb.entities[group.foundingMemberKey];
    if (!founder) return 'Unknown';
    return founder.__type || founder.type || founder.constructor?.name || 'Unknown';
}

/**
 * Get the first secondary address from an entity as a normalized string for comparison
 * Uses formatFullAddress() to get the same cleaned format as SecAddr1 in the CSV
 * @param {Object} entity - Entity object
 * @param {boolean} debug - If true, log diagnostic info
 * @returns {string} First secondary address (normalized) or empty string
 */
function getFirstSecondaryAddress(entity) {
    if (!entity?.contactInfo?.secondaryAddress) {
        return '';
    }
    const secondaries = entity.contactInfo.secondaryAddress;
    if (!Array.isArray(secondaries) || secondaries.length === 0) {
        return '';
    }

    const firstAddr = secondaries[0];
    if (!firstAddr) {
        return '';
    }

    // Use formatFullAddress - same function used to generate SecAddr1 in CSV
    const formattedAddr = formatFullAddress(firstAddr);

    // Normalize for comparison: lowercase, trim, collapse whitespace
    const normalized = normalizeAddressForComparison(formattedAddr);
    return normalized;
}

/**
 * Normalize an address string for comparison
 * @param {string} addr - Address string
 * @returns {string} Normalized address
 */
function normalizeAddressForComparison(addr) {
    if (!addr || typeof addr !== 'string') return '';
    return addr.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Storage for excluded mailing addresses (loaded from Google Sheet)
let mailMergeExcludedAddresses = new Set();

/**
 * Load excluded mailing addresses from Google Sheet
 * Sheet ID: 1SznUWxOrYZAHx_PdEI1jLWTB-n85optL_TET3BNRbvc
 * Reads first column of the sheet
 * @returns {Promise<{count: number, errors: string[]}>}
 */
async function loadMailMergeExcludedAddresses() {
    const SHEET_ID = '1SznUWxOrYZAHx_PdEI1jLWTB-n85optL_TET3BNRbvc';
    const errors = [];

    try {
        const params = {
            spreadsheetId: SHEET_ID,
            range: 'A:A',  // First column only
            valueRenderOption: 'UNFORMATTED_VALUE'
        };

        const response = await gapi.client.sheets.spreadsheets.values.get(params);
        const rows = response.result.values || [];

        // Clear existing and load new
        mailMergeExcludedAddresses.clear();

        for (const row of rows) {
            if (row && row[0]) {
                const rawAddr = String(row[0]);
                const addr = normalizeAddressForComparison(rawAddr);
                if (addr) {
                    mailMergeExcludedAddresses.add(addr);
                }
            }
        }

        console.log(`[MAIL MERGE] Loaded ${mailMergeExcludedAddresses.size} excluded addresses from sheet`);
        return { count: mailMergeExcludedAddresses.size, errors };

    } catch (err) {
        const error = `Failed to load excluded addresses: ${err.message || err}`;
        console.error('[MAIL MERGE] ' + error);
        errors.push(error);
        return { count: 0, errors };
    }
}

/**
 * Check if an entity's first secondary address is in the excluded list
 * @param {Object} entity - Entity object
 * @returns {boolean} True if address is excluded
 */
function isAddressExcluded(entity) {
    const firstSecondary = getFirstSecondaryAddress(entity);
    if (!firstSecondary) return false;
    return mailMergeExcludedAddresses.has(firstSecondary);
}

// Export for global access
window.loadMailMergeExcludedAddresses = loadMailMergeExcludedAddresses;
window.mailMergeExcludedAddresses = mailMergeExcludedAddresses;

/**
 * Check if all members of a group are connected via contactInfo similarity.
 * Uses flood-fill: starting from first member, find all members reachable
 * via edges where contactInfo score > threshold.
 *
 * Uses universalCompareTo (same as entity group building) to get contactInfo scores.
 *
 * @param {Object} group - EntityGroup object with memberKeys
 * @param {Object} entityDb - Entity database with .entities property
 * @returns {boolean} True if all members are connected via contactInfo edges
 */
function isGroupContactInfoConnected(group, entityDb) {
    const memberKeys = group.memberKeys || [];

    // Groups with 0 or 1 members are trivially connected
    if (memberKeys.length <= 1) {
        return true;
    }

    // Get threshold from MATCH_CRITERIA
    const threshold = window.MATCH_CRITERIA?.trueMatch?.contactInfoAlone || 0.87;

    // Get all member entities
    const memberEntities = {};
    for (const key of memberKeys) {
        const entity = entityDb.entities[key];
        if (entity) {
            memberEntities[key] = entity;
        }
    }

    const validKeys = Object.keys(memberEntities);

    // If we couldn't find all entities, cannot determine connectivity
    if (validKeys.length !== memberKeys.length) {
        return false;
    }

    // Flood-fill from the first member
    const reached = new Set();
    const toVisit = [validKeys[0]];
    reached.add(validKeys[0]);

    while (toVisit.length > 0 && reached.size < validKeys.length) {
        const currentKey = toVisit.pop();
        const currentEntity = memberEntities[currentKey];

        // Check current entity against all unreached entities
        for (const candidateKey of validKeys) {
            if (reached.has(candidateKey)) {
                continue;
            }

            const candidateEntity = memberEntities[candidateKey];

            // Use universalCompareTo (same as entity group building)
            const comparison = universalCompareTo(currentEntity, candidateEntity);
            const contactInfoScore = comparison.details?.components?.contactInfo?.similarity;

            // Check if contactInfo score passes threshold
            let passesThreshold = contactInfoScore !== null && contactInfoScore !== undefined && contactInfoScore > threshold;

            // MAIL MERGE FALLBACK: When BOTH entities have PO Box secondary addresses
            // AND BOTH have null/undefined secUnitNum (badly parsed PO Box number),
            // fall back to comparing primaryAlias.term strings directly.
            // This handles the specific case where PO Box addresses are identical but
            // component comparison returns 0 due to missing secUnitNum.
            if (!passesThreshold) {
                const curSecAddr = currentEntity?.contactInfo?.secondaryAddress?.[0];
                const candSecAddr = candidateEntity?.contactInfo?.secondaryAddress?.[0];

                if (curSecAddr && candSecAddr) {
                    const curIsPOBox = typeof isPOBoxAddress === 'function' && isPOBoxAddress(curSecAddr);
                    const candIsPOBox = typeof isPOBoxAddress === 'function' && isPOBoxAddress(candSecAddr);

                    // Only apply fallback when BOTH are PO Box AND BOTH have null secUnitNum
                    if (curIsPOBox && candIsPOBox && !curSecAddr.secUnitNum && !candSecAddr.secUnitNum) {
                        const curTerm = curSecAddr.primaryAlias?.term;
                        const candTerm = candSecAddr.primaryAlias?.term;

                        if (curTerm && candTerm) {
                            const overallAloneThreshold = window.MATCH_CRITERIA?.trueMatch?.overallAlone || 0.905;
                            const termSimilarity = levenshteinSimilarity(curTerm, candTerm);
                            if (termSimilarity > overallAloneThreshold) {
                                passesThreshold = true;
                            }
                        }
                    }
                }
            }

            if (passesThreshold) {
                reached.add(candidateKey);
                toVisit.push(candidateKey);

                // Early exit: if we've reached all members, we're done
                if (reached.size === validKeys.length) {
                    return true;
                }
            }
        }
    }

    // Return true only if we reached all members
    return reached.size === validKeys.length;
}

/**
 * Determine the name to use for a collapsed mail merge row.
 *
 * Rules:
 * 1. If exactly one member is type "Individual" → use that Individual's name
 * 2. If exactly two members are type "Individual" AND their names pass the
 *    true match threshold (nameAlone > 0.875) → use either name (first one)
 * 3. All other cases → use the consensus name
 *
 * Uses universalCompareTo (same as entity group building) to get name scores.
 *
 * @param {Object} group - EntityGroup object
 * @param {Object} entityDb - Entity database with .entities property
 * @returns {Object} The entity whose name should be used for the collapsed row
 */
function getCollapsedRowNameEntity(group, entityDb) {
    const memberKeys = group.memberKeys || [];
    const consensusEntity = group.consensusEntity || entityDb.entities[group.foundingMemberKey];

    // Find all Individual-type members
    const individuals = [];
    for (const key of memberKeys) {
        const entity = entityDb.entities[key];
        if (entity && entity.constructor.name === 'Individual') {
            individuals.push({ key, entity });
        }
    }

    // Rule 1: Exactly one Individual → use that Individual's name
    if (individuals.length === 1) {
        return individuals[0].entity;
    }

    // Rule 2: Exactly two Individuals → check if names pass threshold
    if (individuals.length === 2) {
        const nameThreshold = window.MATCH_CRITERIA?.trueMatch?.nameAlone || 0.875;

        // Use universalCompareTo to get name score
        const comparison = universalCompareTo(individuals[0].entity, individuals[1].entity);
        const nameScore = comparison.details?.components?.name?.similarity;

        if (nameScore !== null && nameScore !== undefined && nameScore > nameThreshold) {
            // Names match well enough, use the first one
            return individuals[0].entity;
        }
    }

    // Rule 3: All other cases → use consensus name
    return consensusEntity;
}

/**
 * Generate CSV rows for a single EntityGroup for mail merge export
 *
 * Differences from generateEntityGroupRows:
 * - Never includes nearmiss rows
 * - Single-member groups: only founding row (no consensus row)
 * - Multi-member groups that are contactInfo-connected: single collapsed row
 * - Other multi-member groups: consensus + founding + member rows
 *
 * @param {Object} group - EntityGroup object
 * @param {Object} entityDb - Entity database with .entities property
 * @returns {Object} { rows: Array<Array<string>>, collapsed: boolean }
 */
function generateMailMergeGroupRows(group, entityDb) {
    const rows = [];
    const memberCount = group.memberKeys?.length || 0;

    if (memberCount === 1) {
        // Single-member group: only show founding member row (no consensus)
        const foundingEntity = getEntityByKey(group.foundingMemberKey);
        if (foundingEntity) {
            rows.push(generateCSVRow('founding', foundingEntity, group.foundingMemberKey, group.index, false));
        }
        return { rows, collapsed: false };
    }

    // Multi-member group: check if contactInfo-connected
    if (isGroupContactInfoConnected(group, entityDb)) {
        // Collapse to single row: use consensus for all fields except name
        const consensusEntity = group.consensusEntity || getEntityByKey(group.foundingMemberKey);
        if (consensusEntity) {
            // Generate row from consensus entity
            const row = generateCSVRow('consolidated', consensusEntity, '', group.index, true);

            // Override Key (column 2) with label indicating consolidated group
            row[2] = 'CONSOLIDATED_GROUP';

            // Override name (column 3) with appropriate entity's name
            const nameEntity = getCollapsedRowNameEntity(group, entityDb);
            row[3] = assembleMailName(nameEntity);

            rows.push(row);
        }
        return { rows, collapsed: true };
    }

    // Not contactInfo-connected: CONSENSUS COLLAPSE fallback
    // Collapse to single row using consensus entity, mark as CONSENSUS_COLLAPSE
    const consensusEntity = group.consensusEntity || getEntityByKey(group.foundingMemberKey);
    if (consensusEntity) {
        const row = generateCSVRow('consolidated', consensusEntity, '', group.index, true);

        // Override Key (column 2) with label indicating consensus collapse
        row[2] = 'CONSENSUS_COLLAPSE';

        // Override name (column 3) with appropriate entity's name
        const nameEntity = getCollapsedRowNameEntity(group, entityDb);
        row[3] = assembleMailName(nameEntity);

        rows.push(row);
    }
    return { rows, collapsed: true };
}

// Simplified mail merge headers - just what's needed for address labels
const SIMPLE_MAIL_MERGE_HEADERS = [
    'Name',      // Recipient name
    'Address1',  // Street address line 1
    'Address2',  // Unit/Apt (optional)
    'City',
    'State',
    'ZIP'
];

/**
 * Generate a simplified mail merge row from an entity
 * Uses secondary address (mailing address) components
 * @param {Object} entity - Entity object
 * @returns {Array<string>} Array of 6 column values
 */
function generateSimpleMailMergeRow(entity) {
    const row = ['', '', '', '', '', ''];

    // Name
    row[0] = assembleMailName(entity);

    // Get secondary address components (the mailing address)
    const secAddr = entity?.contactInfo?.secondaryAddress?.[0];
    if (secAddr) {
        // Get unit type and number
        const unitType = secAddr.secUnitType?.term ? cleanVATags(secAddr.secUnitType.term) : '';
        const unitNum = secAddr.secUnitNum?.term ? cleanVATags(String(secAddr.secUnitNum.term)) : '';

        // Check if this is a PO BOX address
        if (unitType === 'PO BOX') {
            // PO BOX goes in Address1
            row[1] = [unitType, unitNum].filter(p => p).join(' ');
            // Address2 stays empty for PO BOX addresses
        } else {
            // Street address: build Address1 from street components
            const streetNum = secAddr.streetNumber?.term ? cleanVATags(String(secAddr.streetNumber.term)) : '';
            const streetName = secAddr.streetName?.term ? cleanVATags(secAddr.streetName.term) : '';
            const streetType = secAddr.streetType?.term ? cleanVATags(secAddr.streetType.term) : '';
            const parts = [streetNum, streetName, streetType].filter(p => p);
            row[1] = parts.join(' ');

            // Address2: unit type + unit number (APT, STE, etc.)
            if (unitType || unitNum) {
                row[2] = [unitType, unitNum].filter(p => p).join(' ');
            }
        }

        // City, State, ZIP
        row[3] = secAddr.city?.term ? cleanVATags(secAddr.city.term) : '';
        row[4] = secAddr.state?.term ? cleanVATags(secAddr.state.term) : '';
        // Pad 4-digit ZIP codes to 5-digit (user must import CSV with ZIP column as text)
        let zip = secAddr.zipCode?.term ? String(secAddr.zipCode.term) : '';
        if (/^\d{4}$/.test(zip)) {
            zip = '0' + zip;  // Pad 4-digit to 5-digit
        }
        row[5] = zip;
    }

    return row;
}

/**
 * Export prospect mail merge spreadsheet
 *
 * Based on exportEntityGroupsToCSV but with additional exclusion rules and sorting.
 * Generates TWO CSVs: full 62-column format and simplified 6-column format.
 *
 * Exclusion rules:
 * - No Bloomerang members (prospects only)
 * - Group size <= maxGroupSize
 * - Founding member's first secondary address not in excluded addresses list
 *
 * Row rules:
 * - No nearmiss rows
 * - Single-member groups: founding row only (no consensus)
 * - Multi-member groups: consensus + founding + member rows
 *
 * @param {Object} groupDatabase - EntityGroupDatabase
 * @param {Object} options - Export options
 * @param {number} options.maxGroupSize - Maximum group size to include (default: 23)
 * @returns {Object} {csv, simpleCsv, stats}
 */
function exportProspectMailMerge(groupDatabase, options = {}) {
    const maxGroupSize = options.maxGroupSize || 23;

    const entityDb = window.unifiedEntityDatabase;
    if (!entityDb || !entityDb.entities) {
        throw new Error('Unified Entity Database not loaded');
    }

    const allGroups = Object.values(groupDatabase.groups || {});

    // Start with prospect groups (no Bloomerang members) - same as existing export
    const prospectGroups = allGroups.filter(g => !g.hasBloomerangMember);

    // Exclusion 1: filter out groups with too many members
    let excludedForSize = 0;
    let excludedForAddress = 0;

    const eligibleGroups = prospectGroups.filter(group => {
        const memberCount = group.memberKeys?.length || 0;
        if (memberCount > maxGroupSize) {
            excludedForSize++;
            return false;
        }

        // Exclusion 2: filter out groups where founding member's first secondary address is excluded
        const founder = entityDb.entities[group.foundingMemberKey];
        if (founder && isAddressExcluded(founder)) {
            excludedForAddress++;
            return false;
        }

        return true;
    });

    // Sort: Primary by founding member type (custom order), Secondary by member count descending
    const typeOrder = ['Individual', 'AggregateHousehold', 'LegalConstruct', 'Business'];

    eligibleGroups.sort((a, b) => {
        const typeA = getFoundingMemberType(a, entityDb);
        const typeB = getFoundingMemberType(b, entityDb);

        // Primary sort: entity type by custom order
        const orderA = typeOrder.indexOf(typeA);
        const orderB = typeOrder.indexOf(typeB);
        // Put unknown types at the end
        const effectiveOrderA = orderA === -1 ? typeOrder.length : orderA;
        const effectiveOrderB = orderB === -1 ? typeOrder.length : orderB;

        if (effectiveOrderA !== effectiveOrderB) {
            return effectiveOrderA - effectiveOrderB;
        }

        // Secondary sort: member count descending
        const countA = a.memberKeys?.length || 0;
        const countB = b.memberKeys?.length || 0;
        return countB - countA;
    });

    // Build CSV header rows
    const headerRow = CSV_HEADERS.map(h => csvEscape(h)).join(',');
    const simpleHeaderRow = SIMPLE_MAIL_MERGE_HEADERS.map(h => csvEscape(h)).join(',');

    // Generate BOTH row sets in single pass through eligible groups
    const rows = [];           // Full 62-column rows
    const simpleRows = [];     // Simplified 6-column rows
    let collapsedGroupCount = 0;

    for (const group of eligibleGroups) {
        const result = generateMailMergeGroupRows(group, entityDb);
        rows.push(...result.rows);
        if (result.collapsed) {
            collapsedGroupCount++;
        }

        // For simplified CSV: one row per group using consensus entity
        // (mail merge only needs one address per household)
        const consensusEntity = group.consensusEntity || entityDb.entities[group.foundingMemberKey];
        if (consensusEntity) {
            // Get the name from the appropriate entity (same logic as collapsed rows)
            const nameEntity = getCollapsedRowNameEntity(group, entityDb);
            const simpleRow = generateSimpleMailMergeRow(consensusEntity);
            // Override name with the selected name entity
            simpleRow[0] = assembleMailName(nameEntity);
            simpleRows.push(simpleRow);
        }
    }

    // Build full CSV string
    const dataRows = rows.map(row => row.map(v => csvEscape(v)).join(','));
    const csv = [headerRow, ...dataRows].join('\n');

    // Build simplified CSV string
    const simpleDataRows = simpleRows.map(row => row.map(v => csvEscape(v)).join(','));
    const simpleCsv = [simpleHeaderRow, ...simpleDataRows].join('\n');

    return {
        csv,
        simpleCsv,
        stats: {
            totalGroups: allGroups.length,
            totalProspectGroups: prospectGroups.length,
            excludedForSize,
            excludedForAddress,
            maxGroupSize,
            eligibleGroups: eligibleGroups.length,
            collapsedGroups: collapsedGroupCount,
            rowCount: rows.length,
            simpleRowCount: simpleRows.length
        }
    };
}

/**
 * Download prospect mail merge spreadsheets (triggered from UI or console)
 * Automatically loads excluded addresses from Google Sheet before export.
 * Downloads TWO files:
 *   1. prospect_mailmerge_YYYY-MM-DD.csv - Full 62-column format
 *   2. prospect_mailmerge_simple_YYYY-MM-DD.csv - Simplified 6-column format for address labels
 * @param {Object} options - Export options
 * @param {number} options.maxGroupSize - Maximum group size to include (default: 23)
 */
async function downloadProspectMailMerge(options = {}) {
    const db = entityGroupBrowser.loadedDatabase || window.entityGroupDatabase;
    if (!db) {
        console.error('Please load an EntityGroup database first');
        showEntityGroupStatus('Please load an EntityGroup database first', 'error');
        return;
    }

    if (!window.unifiedEntityDatabase || !window.unifiedEntityDatabase.entities) {
        console.error('Please load the Unified Entity Database first');
        showEntityGroupStatus('Please load the Unified Entity Database first', 'error');
        return;
    }

    const maxGroupSize = options.maxGroupSize || 23;

    try {
        // Load excluded addresses from Google Sheet
        showEntityGroupStatus('Loading excluded addresses from Google Sheet...', 'loading');
        const addrResult = await loadMailMergeExcludedAddresses();
        if (addrResult.errors.length > 0) {
            console.warn('Errors loading excluded addresses:', addrResult.errors);
        }

        console.log(`Generating Prospect Mail Merge (max group size: ${maxGroupSize})...`);
        showEntityGroupStatus(`Generating Prospect Mail Merge (max group size: ${maxGroupSize})...`, 'loading');

        const result = exportProspectMailMerge(db, options);
        const dateStr = new Date().toISOString().slice(0, 10);

        // Download full CSV
        const blob1 = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
        const url1 = URL.createObjectURL(blob1);
        const link1 = document.createElement('a');
        link1.href = url1;
        link1.download = `prospect_mailmerge_${dateStr}.csv`;
        document.body.appendChild(link1);
        link1.click();
        document.body.removeChild(link1);
        URL.revokeObjectURL(url1);

        // Small delay between downloads to ensure both trigger
        await new Promise(resolve => setTimeout(resolve, 100));

        // Download simplified CSV
        const blob2 = new Blob([result.simpleCsv], { type: 'text/csv;charset=utf-8;' });
        const url2 = URL.createObjectURL(blob2);
        const link2 = document.createElement('a');
        link2.href = url2;
        link2.download = `prospect_mailmerge_simple_${dateStr}.csv`;
        document.body.appendChild(link2);
        link2.click();
        document.body.removeChild(link2);
        URL.revokeObjectURL(url2);

        const statusMsg = `Prospect Mail Merge: ${result.stats.eligibleGroups} groups. ` +
            `Full: ${result.stats.rowCount} rows. Simple: ${result.stats.simpleRowCount} rows. ` +
            `Excluded: ${result.stats.excludedForSize} (size), ${result.stats.excludedForAddress} (address)`;

        console.log(statusMsg);
        console.log('Full stats:', result.stats);
        showEntityGroupStatus(statusMsg, 'success');

        return result.stats;

    } catch (error) {
        console.error('Prospect mail merge export error:', error);
        showEntityGroupStatus(`Export error: ${error.message}`, 'error');
    }
}

// Export for global access
window.exportProspectMailMerge = exportProspectMailMerge;
window.downloadProspectMailMerge = downloadProspectMailMerge;

// =============================================================================
// BLOOMERANG-ONLY ENTITY GROUPS MATCH CANDIDATES REPORT
// =============================================================================

/**
 * Check if an entity group contains ONLY Bloomerang members (no VisionAppraisal members)
 * @param {Object} group - EntityGroup object
 * @returns {boolean} True if all members are from Bloomerang
 */
function isBloomerangOnlyGroup(group) {
    if (!group.memberKeys || group.memberKeys.length === 0) {
        return false;
    }
    // Check if ALL member keys start with 'bloomerang:'
    return group.memberKeys.every(key => key.startsWith('bloomerang:'));
}

/**
 * Find top N VisionAppraisal entities by name similarity score for a given Bloomerang entity.
 * Uses universalCompareTo() to get the name component score.
 * @param {Object} bloomerangEntity - The Bloomerang entity to find matches for
 * @param {Object} visionAppraisalEntities - Object keyed by database key {key: entity, ...}
 * @param {number} topN - Number of top matches to return (default: 5)
 * @param {number} minScore - Minimum name similarity score threshold (default: 0.35)
 * @returns {Array<{key: string, entity: Object, nameScore: number}>}
 */
function findTopVAMatchesByName(bloomerangEntity, visionAppraisalEntities, topN = 5, minScore = 0.35) {
    const results = [];

    for (const [vaKey, vaEntity] of Object.entries(visionAppraisalEntities)) {
        try {
            const comparison = universalCompareTo(bloomerangEntity, vaEntity);
            const nameScore = comparison.details?.components?.name?.similarity || 0;

            // Only include if above minimum threshold
            if (nameScore >= minScore) {
                results.push({
                    key: vaKey,
                    entity: vaEntity,
                    nameScore: nameScore
                });
            }
        } catch (e) {
            // Skip entities that fail comparison
        }
    }

    // Sort by nameScore descending
    results.sort((a, b) => b.nameScore - a.nameScore);

    return results.slice(0, topN);
}

/**
 * Export Bloomerang-Only Match Candidates Report
 *
 * This report identifies entity groups that contain ONLY Bloomerang entities (no VisionAppraisal
 * members), then for each group, finds the top VisionAppraisal entities with the highest name
 * similarity scores across all members of that group.
 *
 * Output structure for each Bloomerang-only group:
 * - Consensus row (first row of the set)
 * - VA candidate rows sorted by name score (deduplicated across all members, min 35% threshold)
 *
 * @param {Object} groupDatabase - EntityGroupDatabase
 * @param {Object} options - Export options
 * @param {number} options.candidatesPerMember - Number of VA candidates per member (default: 5)
 * @param {number} options.minNameScore - Minimum name similarity threshold (default: 0.35)
 * @returns {Object} {csv, stats}
 */
function exportBloomerangOnlyMatchCandidates(groupDatabase, options = {}) {
    const candidatesPerMember = options.candidatesPerMember || 5;
    const minNameScore = options.minNameScore || 0.35;

    const entityDb = window.unifiedEntityDatabase;
    if (!entityDb || !entityDb.entities) {
        throw new Error('Unified Entity Database not loaded');
    }

    // Get VisionAppraisal entities for comparison
    const vaEntities = getEntitiesBySource('visionAppraisal');
    const vaEntityCount = Object.keys(vaEntities).length;
    console.log(`[BLOOMERANG CANDIDATES] Found ${vaEntityCount} VisionAppraisal entities for comparison`);

    const allGroups = Object.values(groupDatabase.groups || {});

    // Filter to Bloomerang-only groups
    const bloomerangOnlyGroups = allGroups.filter(isBloomerangOnlyGroup);
    console.log(`[BLOOMERANG CANDIDATES] Found ${bloomerangOnlyGroups.length} Bloomerang-only groups out of ${allGroups.length} total`);

    // Sort by group index for consistent output
    bloomerangOnlyGroups.sort((a, b) => a.index - b.index);

    // Build CSV
    const headerRow = CSV_HEADERS.map(h => csvEscape(h)).join(',');
    const rows = [];
    let totalCandidatesGenerated = 0;
    let groupsProcessed = 0;

    for (const group of bloomerangOnlyGroups) {
        groupsProcessed++;

        // Log progress every 10 groups
        if (groupsProcessed % 10 === 0) {
            console.log(`[BLOOMERANG CANDIDATES] Processing group ${groupsProcessed}/${bloomerangOnlyGroups.length}...`);
        }

        // 1. Consensus row (or founding member if no consensus)
        const consensusEntity = group.consensusEntity || entityDb.entities[group.foundingMemberKey];
        if (consensusEntity) {
            rows.push(generateCSVRow('consensus', consensusEntity, '', group.index, true));
        }

        // 2. Collect candidates from all members, deduplicate, sort by score
        const allCandidates = []; // {key, entity, nameScore}
        const seenVAKeys = new Set();

        for (const memberKey of group.memberKeys) {
            const memberEntity = entityDb.entities[memberKey];
            if (!memberEntity) continue;

            // Find top N VisionAppraisal matches by name score for this member
            const topMatches = findTopVAMatchesByName(memberEntity, vaEntities, candidatesPerMember, minNameScore);

            // Add to collection, deduplicating by VA key
            for (const match of topMatches) {
                if (!seenVAKeys.has(match.key)) {
                    seenVAKeys.add(match.key);
                    allCandidates.push(match);
                }
            }
        }

        // Sort all candidates by nameScore descending
        allCandidates.sort((a, b) => b.nameScore - a.nameScore);

        // Generate candidate rows
        for (const candidate of allCandidates) {
            const row = generateCSVRow('candidate', candidate.entity, candidate.key, '', false);
            // Override RowType to include score
            row[0] = `candidate (name:${candidate.nameScore.toFixed(4)})`;
            rows.push(row);
            totalCandidatesGenerated++;
        }
    }

    // Build CSV string
    const dataRows = rows.map(row => row.map(v => csvEscape(v)).join(','));
    const csv = [headerRow, ...dataRows].join('\n');

    return {
        csv,
        stats: {
            totalGroups: allGroups.length,
            bloomerangOnlyGroups: bloomerangOnlyGroups.length,
            visionAppraisalEntities: vaEntityCount,
            candidatesPerMember,
            minNameScore,
            totalCandidatesGenerated,
            rowCount: rows.length
        }
    };
}

/**
 * Download Bloomerang-Only Match Candidates Report
 * @param {Object} options - Export options
 * @param {number} options.candidatesPerMember - Number of VA candidates per member (default: 5)
 * @param {number} options.minNameScore - Minimum name similarity threshold (default: 0.35)
 */
async function downloadBloomerangOnlyMatchCandidates(options = {}) {
    const db = entityGroupBrowser.loadedDatabase || window.entityGroupDatabase;
    if (!db) {
        console.error('Please load an EntityGroup database first');
        showEntityGroupStatus('Please load an EntityGroup database first', 'error');
        return;
    }

    if (!window.unifiedEntityDatabase || !window.unifiedEntityDatabase.entities) {
        console.error('Please load the Unified Entity Database first');
        showEntityGroupStatus('Please load the Unified Entity Database first', 'error');
        return;
    }

    try {
        const candidatesPerMember = options.candidatesPerMember || 5;
        const minNameScore = options.minNameScore || 0.35;

        console.log(`Generating Bloomerang-Only Match Candidates Report (${candidatesPerMember} candidates/member, min score: ${minNameScore})...`);
        showEntityGroupStatus(`Generating Bloomerang-Only Match Candidates Report...`, 'loading');

        const result = exportBloomerangOnlyMatchCandidates(db, options);
        const dateStr = new Date().toISOString().slice(0, 10);

        // Download CSV
        const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `bloomerang_only_match_candidates_${dateStr}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        const statusMsg = `Bloomerang-Only Match Candidates: ${result.stats.bloomerangOnlyGroups} groups, ` +
            `${result.stats.totalCandidatesGenerated} VA candidates generated, ` +
            `${result.stats.rowCount} total rows`;

        console.log(statusMsg);
        console.log('Full stats:', result.stats);
        showEntityGroupStatus(statusMsg, 'success');

        return result.stats;

    } catch (error) {
        console.error('Bloomerang-only match candidates export error:', error);
        showEntityGroupStatus(`Export error: ${error.message}`, 'error');
    }
}

/**
 * Run Bloomerang-Only Match Candidates Export - wrapper that loads databases if needed
 * Called from console. Loads databases from Google Drive if not already loaded.
 */
async function runBloomerangOnlyMatchCandidatesExport(options = {}) {
    try {
        // Step 1: Check if unified entity database is loaded, load if not
        if (!window.unifiedEntityDatabase || !window.unifiedEntityDatabase.entities) {
            showEntityGroupStatus('Loading Unified Entity Database...', 'loading');
            await loadUnifiedDatabaseForEntityGroups();

            if (!window.unifiedEntityDatabase || !window.unifiedEntityDatabase.entities) {
                showEntityGroupStatus('Failed to load Unified Entity Database', 'error');
                return;
            }
        }

        // Step 2: Check if EntityGroup database is loaded, load if not
        let db = entityGroupBrowser.loadedDatabase || window.entityGroupDatabase;

        if (!db) {
            showEntityGroupStatus('Loading EntityGroup database...', 'loading');
            await loadEntityGroupDatabase();

            db = entityGroupBrowser.loadedDatabase || window.entityGroupDatabase;
            if (!db) {
                showEntityGroupStatus('Failed to load EntityGroup database', 'error');
                return;
            }
        }

        // Step 3: Run the export
        await downloadBloomerangOnlyMatchCandidates(options);

    } catch (error) {
        console.error('Bloomerang-only match candidates error:', error);
        showEntityGroupStatus(`Error: ${error.message}`, 'error');
    }
}

// Export for global access
window.exportBloomerangOnlyMatchCandidates = exportBloomerangOnlyMatchCandidates;
window.downloadBloomerangOnlyMatchCandidates = downloadBloomerangOnlyMatchCandidates;
window.runBloomerangOnlyMatchCandidatesExport = runBloomerangOnlyMatchCandidatesExport;

/**
 * Run Prospect Mail Merge Export - wrapper that loads EntityGroup database if needed
 * Called from UI button. Loads database from Google Drive if not already loaded,
 * then runs downloadProspectMailMerge.
 */
async function runProspectMailMergeExport() {
    const btn = document.getElementById('prospectMailMergeBtn');
    const originalText = btn ? btn.innerHTML : '';

    try {
        // Step 1: Check if unified entity database is loaded, load if not
        if (!window.unifiedEntityDatabase || !window.unifiedEntityDatabase.entities) {
            if (btn) btn.innerHTML = 'Loading Unified DB...';
            showEntityGroupStatus('Loading Unified Entity Database...', 'loading');

            // Use the existing function to load unified database
            await loadUnifiedDatabaseForEntityGroups();

            // Check if load succeeded
            if (!window.unifiedEntityDatabase || !window.unifiedEntityDatabase.entities) {
                showEntityGroupStatus('Failed to load Unified Entity Database', 'error');
                if (btn) btn.innerHTML = originalText;
                return;
            }
        }

        // Step 2: Check if EntityGroup database is loaded, load if not
        let db = entityGroupBrowser.loadedDatabase || window.entityGroupDatabase;

        if (!db) {
            if (btn) btn.innerHTML = 'Loading EntityGroup DB...';
            showEntityGroupStatus('Loading EntityGroup database...', 'loading');

            await loadEntityGroupDatabase();

            // Check if load succeeded
            db = entityGroupBrowser.loadedDatabase || window.entityGroupDatabase;
            if (!db) {
                showEntityGroupStatus('Failed to load EntityGroup database', 'error');
                if (btn) btn.innerHTML = originalText;
                return;
            }
        }

        // Step 3: Run the mail merge export
        if (btn) btn.innerHTML = 'Generating...';
        await downloadProspectMailMerge();

    } catch (error) {
        console.error('Prospect mail merge error:', error);
        showEntityGroupStatus(`Error: ${error.message}`, 'error');
    } finally {
        if (btn) btn.innerHTML = originalText;
    }
}

window.runProspectMailMergeExport = runProspectMailMergeExport;

// =============================================================================
// INITIALIZATION ON DOM READY
// =============================================================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEntityGroupBrowser);
} else {
    // DOM is already ready
    initializeEntityGroupBrowser();
}

// Export functions for global access
window.selectEntityGroup = selectEntityGroup;
window.entityGroupBrowser = entityGroupBrowser;
