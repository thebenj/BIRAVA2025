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
        showEntityGroupStatus('Building EntityGroup database... This may take several minutes.', 'loading');
        if (buildBtn) {
            buildBtn.innerHTML = '⏳ Building...';
            buildBtn.disabled = true;
        }

        // Build the database
        const result = await buildEntityGroupDatabase({
            verbose: true,
            buildConsensus: true,
            saveToGoogleDrive: false  // Don't auto-save, let user review first
        });

        entityGroupBrowser.loadedDatabase = result;

        showEntityGroupStatus(`Built ${Object.keys(result.groups).length} EntityGroups successfully!`, 'success');

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
