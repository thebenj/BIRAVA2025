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

        entityGroupBrowser.loadedDatabase = data;

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

        showEntityGroupStatus('Building EntityGroup database... This may take several minutes.', 'loading');
        if (buildBtn) {
            buildBtn.innerHTML = '⏳ Building...';
            buildBtn.disabled = true;
        }

        // Build the database (auto-saves to new files to avoid token expiration issues)
        const result = await buildEntityGroupDatabase({
            verbose: true,
            buildConsensus: true,
            saveToGoogleDrive: true  // Auto-save to new files - tokens expire after 1 hour
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
 * CSV Column Headers - 54 columns per reference_csvExportSpecification.md
 */
const CSV_HEADERS = [
    // Section 1: Identification & Mail Merge Core (10 columns)
    'RowType', 'GroupIndex', 'Key', 'MailName', 'MailAddr1', 'MailAddr2',
    'MailCity', 'MailState', 'MailZip', 'Email',
    // Section 2: Additional Contact Info (6 columns)
    'Phone', 'POBox', 'SecAddr1', 'SecAddr2', 'SecAddr3', 'SecAddrMore',
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
 * Generate a CSV row for an entity (consensus, founding, member, or nearmiss)
 * @param {string} rowType - 'consensus', 'founding', 'member', or 'nearmiss'
 * @param {Object} entity - Entity object
 * @param {string} key - Entity database key (empty for consensus)
 * @param {number|string} groupIndex - Group index (for consensus/founding only)
 * @param {boolean} includeAlternatives - Whether to populate alternatives columns
 * @returns {Array<string>} Array of 54 column values
 */
function generateCSVRow(rowType, entity, key, groupIndex, includeAlternatives) {
    const row = new Array(54).fill('');

    // Section 1: Identification & Mail Merge Core
    row[0] = rowType;                                    // RowType
    row[1] = (rowType === 'consensus' || rowType === 'founding') ? String(groupIndex) : ''; // GroupIndex
    row[2] = (rowType === 'consensus') ? '' : key;       // Key
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

    // Section 2: Additional Contact Info
    row[10] = getEntityPhone(entity);                    // Phone
    row[11] = getEntityPOBox(entity);                    // POBox

    // Secondary addresses
    const secAddrs = getSecondaryAddresses(entity);
    const secAddrCols = buildSecondaryAddressColumns(secAddrs);
    row[12] = secAddrCols[0];                            // SecAddr1
    row[13] = secAddrCols[1];                            // SecAddr2
    row[14] = secAddrCols[2];                            // SecAddr3
    row[15] = secAddrCols[3];                            // SecAddrMore

    // Section 3: Entity Metadata
    row[16] = getEntityTypeString(entity);               // EntityType
    row[17] = (rowType === 'consensus') ? 'consensus' : getEntitySource(entity, key); // Source

    // Sections 4-6: Alternatives (only for consensus row)
    if (includeAlternatives && entity) {
        // Name alternatives (columns 18-29)
        const nameHom = extractAlternatives(entity.name, 'homonyms');
        const nameSyn = extractAlternatives(entity.name, 'synonyms');
        const nameCand = extractAlternatives(entity.name, 'candidates');

        const nameHomCols = buildAlternativeColumns(nameHom);
        row[18] = nameHomCols[0]; row[19] = nameHomCols[1]; row[20] = nameHomCols[2]; row[21] = nameHomCols[3];

        const nameSynCols = buildAlternativeColumns(nameSyn);
        row[22] = nameSynCols[0]; row[23] = nameSynCols[1]; row[24] = nameSynCols[2]; row[25] = nameSynCols[3];

        const nameCandCols = buildAlternativeColumns(nameCand);
        row[26] = nameCandCols[0]; row[27] = nameCandCols[1]; row[28] = nameCandCols[2]; row[29] = nameCandCols[3];

        // Address alternatives (columns 30-41) - from primaryAddress
        const addrHom = extractAlternatives(primaryAddr, 'homonyms');
        const addrSyn = extractAlternatives(primaryAddr, 'synonyms');
        const addrCand = extractAlternatives(primaryAddr, 'candidates');

        const addrHomCols = buildAlternativeColumns(addrHom);
        row[30] = addrHomCols[0]; row[31] = addrHomCols[1]; row[32] = addrHomCols[2]; row[33] = addrHomCols[3];

        const addrSynCols = buildAlternativeColumns(addrSyn);
        row[34] = addrSynCols[0]; row[35] = addrSynCols[1]; row[36] = addrSynCols[2]; row[37] = addrSynCols[3];

        const addrCandCols = buildAlternativeColumns(addrCand);
        row[38] = addrCandCols[0]; row[39] = addrCandCols[1]; row[40] = addrCandCols[2]; row[41] = addrCandCols[3];

        // Email alternatives (columns 42-53) - from email
        const emailObj = entity?.contactInfo?.email;
        const emailHom = extractAlternatives(emailObj, 'homonyms');
        const emailSyn = extractAlternatives(emailObj, 'synonyms');
        const emailCand = extractAlternatives(emailObj, 'candidates');

        const emailHomCols = buildAlternativeColumns(emailHom);
        row[42] = emailHomCols[0]; row[43] = emailHomCols[1]; row[44] = emailHomCols[2]; row[45] = emailHomCols[3];

        const emailSynCols = buildAlternativeColumns(emailSyn);
        row[46] = emailSynCols[0]; row[47] = emailSynCols[1]; row[48] = emailSynCols[2]; row[49] = emailSynCols[3];

        const emailCandCols = buildAlternativeColumns(emailCand);
        row[50] = emailCandCols[0]; row[51] = emailCandCols[1]; row[52] = emailCandCols[2]; row[53] = emailCandCols[3];
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
