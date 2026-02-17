/**
 * Contact Preference Override Browser
 *
 * UI for viewing and managing contact preference overrides.
 * Lives in the Database Maintenance box alongside StreetName, IndividualName,
 * and Fire Number Collision browsers.
 *
 * Depends on:
 *   - contactPreferenceOverrideManager.js (database CRUD)
 *   - entityGroupBrowser.js (extractEntityName, extractEntityAddress, getEntityByKey)
 *   - classSerializationUtils.js (serializeWithTypes)
 */

// ============================================================================
// BROWSER STATE
// ============================================================================

const overrideBrowser = {
    currentResults: [],        // Array of groups or override records (depending on view mode)
    selectedGroup: null,       // Currently selected EntityGroup
    selectedGroupIndex: -1,    // Index in currentResults
    searchQuery: '',
    viewMode: 'search',         // 'search' (search groups) or 'existing' (show overrides)
    pendingOverride: null,     // { contactType, preferredOption } — set when user clicks "Set as Preferred"
    hasUnsavedChanges: false
};

window.overrideBrowser = overrideBrowser;

// ============================================================================
// INITIALIZATION
// ============================================================================

function initializeOverrideBrowser() {
    console.log('[OverrideBrowser] Initializing...');

    setupOverrideBrowserButtons();
    setupOverrideBrowserSearch();

    // Override database loads on demand — triggered when EntityGroups are loaded or built
    // (see entityGroupBrowser.js hooks)

    console.log('[OverrideBrowser] Initialization complete');
}

function setupOverrideBrowserButtons() {
    const saveBtn = document.getElementById('overrideSaveBtn');
    const statsBtn = document.getElementById('overrideStatsBtn');
    const saveOverrideBtn = document.getElementById('overrideSaveOverrideBtn');
    const cancelOverrideBtn = document.getElementById('overrideCancelOverrideBtn');
    const reassignAllBtn = document.getElementById('overrideReassignAllBtn');

    if (saveBtn) saveBtn.addEventListener('click', saveOverrideBrowserDatabase);
    if (statsBtn) statsBtn.addEventListener('click', showOverrideBrowserStats);
    if (saveOverrideBtn) saveOverrideBtn.addEventListener('click', commitPendingOverride);
    if (cancelOverrideBtn) cancelOverrideBtn.addEventListener('click', cancelPendingOverride);
    if (reassignAllBtn) reassignAllBtn.addEventListener('click', reassignAllAnchorsToSelected);
}

function setupOverrideBrowserSearch() {
    const searchInput = document.getElementById('overrideSearchInput');
    const searchBtn = document.getElementById('overrideSearchBtn');
    const clearBtn = document.getElementById('overrideClearSearchBtn');
    const viewModeSelect = document.getElementById('overrideViewMode');

    if (searchInput) {
        searchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                performOverrideBrowserSearch();
            }
        });
    }

    if (searchBtn) searchBtn.addEventListener('click', performOverrideBrowserSearch);
    if (clearBtn) clearBtn.addEventListener('click', clearOverrideBrowserSearch);

    if (viewModeSelect) {
        viewModeSelect.addEventListener('change', (event) => {
            overrideBrowser.viewMode = event.target.value;
            if (overrideBrowser.viewMode === 'existing') {
                displayExistingOverrides();
            } else {
                clearOverrideBrowserResults();
                updateOverrideResultsCount('Search for groups by name, key, or index');
            }
        });
    }
}

// ============================================================================
// LOAD / SAVE
// ============================================================================

async function loadOverrideBrowserDatabase() {
    showOverrideStatus('Loading override database...', 'loading');

    try {
        await loadContactPreferenceOverrides();

        const overrides = getAllContactPreferenceOverrides();
        showOverrideStatus(`Loaded ${overrides.length} override records`, 'success');

        if (overrideBrowser.viewMode === 'existing') {
            displayExistingOverrides();
        }

    } catch (error) {
        console.error('[OverrideBrowser] Load error:', error);
        showOverrideStatus('Error loading database: ' + error.message, 'error');
    }
}

async function saveOverrideBrowserDatabase() {
    showOverrideStatus('Saving override database and EntityGroup database...', 'loading');

    try {
        // 1. Save the override database (for rebuild persistence)
        await saveContactPreferenceOverrides();

        // 2. Save the EntityGroup database (so overrides are baked into the loaded data)
        const groupDb = entityGroupBrowser.loadedDatabase || window.entityGroupDatabase;

        if (groupDb) {
            const dbFileIdInput = document.getElementById('entityGroupFileId');
            const refFileIdInput = document.getElementById('entityGroupReferenceFileId');
            const dbFileId = dbFileIdInput ? dbFileIdInput.value.trim() : '';
            const refFileId = refFileIdInput ? refFileIdInput.value.trim() : '';

            if (dbFileId && typeof saveEntityGroupDatabaseAndReference === 'function') {
                showOverrideStatus('Override database saved. Now saving EntityGroup database...', 'loading');
                await saveEntityGroupDatabaseAndReference(groupDb, dbFileId, refFileId || undefined);
                showOverrideStatus('Both databases saved successfully', 'success');
            } else if (dbFileId && typeof saveEntityGroupDatabase === 'function') {
                showOverrideStatus('Override database saved. Now saving EntityGroup database...', 'loading');
                await saveEntityGroupDatabase(groupDb, dbFileId);
                showOverrideStatus('Both databases saved successfully', 'success');
            } else {
                showOverrideStatus('Override database saved. EntityGroup database NOT saved (no file ID configured in EntityGroup Browser).', 'success');
            }
        } else {
            showOverrideStatus('Override database saved. No EntityGroup database loaded to save.', 'success');
        }

        overrideBrowser.hasUnsavedChanges = false;
        updateSavePanelVisibility();

    } catch (error) {
        console.error('[OverrideBrowser] Save error:', error);
        showOverrideStatus('Error saving: ' + error.message, 'error');
    }
}

// ============================================================================
// VIEW: EXISTING OVERRIDES
// ============================================================================

function displayExistingOverrides() {
    const overrides = getAllContactPreferenceOverrides();
    const resultsList = document.getElementById('overrideResultsList');
    if (!resultsList) return;

    if (overrides.length === 0) {
        resultsList.innerHTML = '<div style="padding: 20px; color: #666; text-align: center;">No overrides found. Switch to "Search Groups" to create overrides.</div>';
        updateOverrideResultsCount('No overrides');
        return;
    }

    // Group overrides by anchor key for display
    const byAnchor = new Map();
    for (const override of overrides) {
        if (!byAnchor.has(override.anchorEntityKey)) {
            byAnchor.set(override.anchorEntityKey, []);
        }
        byAnchor.get(override.anchorEntityKey).push(override);
    }

    const html = Array.from(byAnchor.entries()).map(([anchorKey, records], index) => {
        const abbrevKey = abbreviateEntityKey(anchorKey);
        const entity = getEntityByKey(anchorKey);
        const entityName = entity ? extractEntityName(entity) : '(entity not loaded)';
        const source = anchorKey.startsWith('bloomerang:') ? 'Bloomerang' : 'VisionAppraisal';
        const sourceColor = source === 'Bloomerang' ? '#2196f3' : '#dc3545';

        const typeBadges = records.map(r => {
            const label = _contactTypeLabel(r.contactType);
            return `<span style="background: #e8eaf6; color: #3949ab; padding: 1px 6px; border-radius: 3px; font-size: 10px; margin-right: 4px;">${_escapeHtml(label)}</span>`;
        }).join('');

        // Find the group containing this anchor key to pass to selection
        return `
            <div class="override-result-item" onclick="selectOverrideByAnchorKey('${_escapeHtml(anchorKey)}', this)"
                 style="padding: 10px; border-bottom: 1px solid #eee; cursor: pointer;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: bold; font-family: 'Courier New', monospace; font-size: 13px; color: ${sourceColor};">
                        ${_escapeHtml(abbrevKey)}
                    </span>
                    <span style="font-size: 12px; color: #666;">${records.length} override${records.length !== 1 ? 's' : ''}</span>
                </div>
                <div style="font-size: 12px; color: #333; margin-top: 3px; font-weight: 500;">${_escapeHtml(entityName)}</div>
                <div style="margin-top: 4px;">${typeBadges}</div>
            </div>
        `;
    }).join('');

    resultsList.innerHTML = html;
    updateOverrideResultsCount(`${overrides.length} overrides (${byAnchor.size} anchor keys)`);
}

// ============================================================================
// VIEW: SEARCH GROUPS
// ============================================================================

function performOverrideBrowserSearch() {
    const searchInput = document.getElementById('overrideSearchInput');
    const query = (searchInput ? searchInput.value : '').trim();

    overrideBrowser.searchQuery = query;

    if (overrideBrowser.viewMode === 'existing') {
        // Filter existing overrides by search
        filterExistingOverrides(query);
        return;
    }

    // Search Groups mode — find EntityGroups matching the query
    if (!query) {
        clearOverrideBrowserResults();
        updateOverrideResultsCount('Enter a search term to find groups');
        return;
    }

    const db = entityGroupBrowser.loadedDatabase || window.entityGroupDatabase;
    if (!db) {
        showOverrideStatus('EntityGroup database not loaded. Load it from the EntityGroup Browser first.', 'error');
        return;
    }

    const groups = Object.values(db.groups);
    const queryLower = query.toLowerCase();

    // Check if query is a group index number
    const indexQuery = parseInt(query, 10);

    const matches = groups.filter(g => {
        // Match by index
        if (!isNaN(indexQuery) && g.index === indexQuery) return true;

        // Match by name (founding member)
        const name = extractGroupName(g);
        if (name && name.toLowerCase().includes(queryLower)) return true;

        // Match by address
        const address = extractGroupAddress(g);
        if (address && address.toLowerCase().includes(queryLower)) return true;

        // Match by member key
        if (g.memberKeys) {
            for (const key of g.memberKeys) {
                if (key.toLowerCase().includes(queryLower)) return true;
            }
        }

        return false;
    });

    overrideBrowser.currentResults = matches;
    displayGroupSearchResults(matches);
}

function filterExistingOverrides(query) {
    const overrides = getAllContactPreferenceOverrides();

    if (!query) {
        displayExistingOverrides();
        return;
    }

    const queryLower = query.toLowerCase();

    const filtered = overrides.filter(record => {
        // Match anchor key
        if (record.anchorEntityKey.toLowerCase().includes(queryLower)) return true;

        // Match display term
        if (record.preferredDisplayTerm && record.preferredDisplayTerm.toLowerCase().includes(queryLower)) return true;

        // Match contact type
        if (_contactTypeLabel(record.contactType).toLowerCase().includes(queryLower)) return true;

        // Match entity name
        const entity = getEntityByKey(record.anchorEntityKey);
        if (entity) {
            const name = extractEntityName(entity);
            if (name.toLowerCase().includes(queryLower)) return true;
        }

        return false;
    });

    // Re-display with filtered results
    const resultsList = document.getElementById('overrideResultsList');
    if (!resultsList) return;

    if (filtered.length === 0) {
        resultsList.innerHTML = `<div style="padding: 20px; color: #666; text-align: center;">No overrides matching "${_escapeHtml(query)}"</div>`;
        updateOverrideResultsCount('No matches');
        return;
    }

    // Group by anchor key
    const byAnchor = new Map();
    for (const override of filtered) {
        if (!byAnchor.has(override.anchorEntityKey)) {
            byAnchor.set(override.anchorEntityKey, []);
        }
        byAnchor.get(override.anchorEntityKey).push(override);
    }

    const html = Array.from(byAnchor.entries()).map(([anchorKey, records]) => {
        const abbrevKey = abbreviateEntityKey(anchorKey);
        const entity = getEntityByKey(anchorKey);
        const entityName = entity ? extractEntityName(entity) : '(entity not loaded)';
        const sourceColor = anchorKey.startsWith('bloomerang:') ? '#2196f3' : '#dc3545';

        const typeBadges = records.map(r => {
            const label = _contactTypeLabel(r.contactType);
            return `<span style="background: #e8eaf6; color: #3949ab; padding: 1px 6px; border-radius: 3px; font-size: 10px; margin-right: 4px;">${_escapeHtml(label)}</span>`;
        }).join('');

        return `
            <div class="override-result-item" onclick="selectOverrideByAnchorKey('${_escapeHtml(anchorKey)}', this)"
                 style="padding: 10px; border-bottom: 1px solid #eee; cursor: pointer;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: bold; font-family: 'Courier New', monospace; font-size: 13px; color: ${sourceColor};">
                        ${_escapeHtml(abbrevKey)}
                    </span>
                </div>
                <div style="font-size: 12px; color: #333; margin-top: 3px; font-weight: 500;">${_escapeHtml(entityName)}</div>
                <div style="margin-top: 4px;">${typeBadges}</div>
            </div>
        `;
    }).join('');

    resultsList.innerHTML = html;
    updateOverrideResultsCount(`${filtered.length} overrides matching "${query}"`);
}

function displayGroupSearchResults(groups) {
    const resultsList = document.getElementById('overrideResultsList');
    if (!resultsList) return;

    if (groups.length === 0) {
        resultsList.innerHTML = '<div style="padding: 20px; color: #666; text-align: center;">No groups found matching search</div>';
        updateOverrideResultsCount('No matches');
        return;
    }

    // Sort by index
    const sorted = [...groups].sort((a, b) => a.index - b.index);

    const html = sorted.map((group, index) => {
        const name = extractGroupName(group);
        const address = extractGroupAddress(group);
        const memberCount = group.memberKeys ? group.memberKeys.length : 0;
        const hasOverrides = hasOverridesForEntityKeys(group.memberKeys || []);

        const overrideBadge = hasOverrides
            ? '<span style="background: #fff3e0; color: #ef6c00; padding: 1px 6px; border-radius: 3px; font-size: 10px; margin-left: 8px;">HAS OVERRIDES</span>'
            : '';

        return `
            <div class="override-result-item" onclick="selectOverrideGroup(${group.index}, this)"
                 style="padding: 10px; border-bottom: 1px solid #eee; cursor: pointer;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: bold; color: #3949ab; font-size: 14px;">
                        Group ${group.index}
                    </span>
                    <span>
                        <span style="background: #e8eaf6; color: #3949ab; padding: 2px 8px; border-radius: 10px; font-size: 12px;">
                            ${memberCount} member${memberCount !== 1 ? 's' : ''}
                        </span>
                        ${overrideBadge}
                    </span>
                </div>
                <div style="font-size: 13px; color: #333; margin-top: 3px; font-weight: 500;">${_escapeHtml(name)}</div>
                ${address ? `<div style="font-size: 11px; color: #666; margin-top: 2px;">${_escapeHtml(address)}</div>` : ''}
            </div>
        `;
    }).join('');

    resultsList.innerHTML = html;
    updateOverrideResultsCount(`Found ${groups.length} groups`);
}

// ============================================================================
// GROUP SELECTION — DISPLAY CONTACT PREFERENCES
// ============================================================================

/**
 * Select a group by its index (from group search results)
 */
function selectOverrideGroup(groupIndex, element) {
    // Highlight selected item
    const items = document.querySelectorAll('.override-result-item');
    items.forEach(item => item.style.backgroundColor = '');
    if (element) element.style.backgroundColor = '#e8eaf6';

    const db = entityGroupBrowser.loadedDatabase || window.entityGroupDatabase;
    if (!db) return;

    const group = db.groups[groupIndex];
    if (!group) {
        showOverrideStatus(`Group ${groupIndex} not found`, 'error');
        return;
    }

    overrideBrowser.selectedGroup = group;
    overrideBrowser.selectedGroupIndex = groupIndex;
    overrideBrowser.pendingOverride = null;

    displayGroupInfo(group);
    displayContactPreferences(group);
    hideAnchorPanel();
    displayOverrideActions(group);
}

/**
 * Select by anchor key (from existing overrides list) — finds the containing group
 */
function selectOverrideByAnchorKey(anchorKey, element) {
    // Highlight selected item
    const items = document.querySelectorAll('.override-result-item');
    items.forEach(item => item.style.backgroundColor = '');
    if (element) element.style.backgroundColor = '#e8eaf6';

    const db = entityGroupBrowser.loadedDatabase || window.entityGroupDatabase;
    if (!db) {
        showOverrideStatus('EntityGroup database not loaded', 'error');
        return;
    }

    // Find group containing this anchor key
    const groups = Object.values(db.groups);
    const group = groups.find(g => g.memberKeys && g.memberKeys.includes(anchorKey));

    if (!group) {
        showOverrideStatus(`No group found containing key: ${anchorKey}`, 'error');
        return;
    }

    overrideBrowser.selectedGroup = group;
    overrideBrowser.selectedGroupIndex = group.index;
    overrideBrowser.pendingOverride = null;

    displayGroupInfo(group);
    displayContactPreferences(group);
    hideAnchorPanel();
    displayOverrideActions(group);
}

/**
 * Display group info panel (members, basic info)
 */
function displayGroupInfo(group) {
    const content = document.getElementById('overrideGroupInfoContent');
    if (!content) return;

    const memberCount = group.memberKeys ? group.memberKeys.length : 0;
    const name = extractGroupName(group);
    const address = extractGroupAddress(group);

    let html = `
        <div style="font-size: 14px; font-weight: 600; color: #3949ab; margin-bottom: 8px;">
            Group ${group.index} — ${_escapeHtml(name)}
        </div>
        ${address ? `<div style="font-size: 12px; color: #666; margin-bottom: 8px;">${_escapeHtml(address)}</div>` : ''}
        <div style="font-size: 12px; color: #495057; margin-bottom: 6px;"><strong>Members (${memberCount}):</strong></div>
    `;

    if (group.memberKeys) {
        for (const key of group.memberKeys) {
            const entity = getEntityByKey(key);
            const memberName = entity ? extractEntityName(entity) : '(not loaded)';
            const abbrevKey = abbreviateEntityKey(key);
            const sourceColor = key.startsWith('bloomerang:') ? '#2196f3' : '#dc3545';

            html += `
                <div style="display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 12px;">
                    <span style="font-family: 'Courier New', monospace; color: ${sourceColor}; font-weight: 600; min-width: 80px;">${_escapeHtml(abbrevKey)}</span>
                    <span style="color: #333;">${_escapeHtml(memberName)}</span>
                </div>
            `;
        }
    }

    content.innerHTML = html;
}

/**
 * Display all four contact preference types for the selected group
 */
function displayContactPreferences(group) {
    const panel = document.getElementById('overrideContactPanel');
    const content = document.getElementById('overrideContactContent');
    if (!panel || !content) return;

    panel.style.display = 'block';

    const types = [
        { property: 'collectiveMailingAddress', type: CONTACT_TYPES.MAILING_ADDRESS, label: 'Mailing Address' },
        { property: 'collectivePhone', type: CONTACT_TYPES.PHONE, label: 'Phone' },
        { property: 'collectivePOBox', type: CONTACT_TYPES.PO_BOX, label: 'PO Box' },
        { property: 'collectiveEmail', type: CONTACT_TYPES.EMAIL, label: 'Email' }
    ];

    let html = '';

    for (const { property, type, label } of types) {
        const collective = group[property];

        html += `<div style="margin-bottom: 12px; padding: 8px; background: white; border-radius: 4px; border: 1px solid #e0e0e0;">`;
        html += `<div style="font-size: 12px; font-weight: 600; color: #3949ab; margin-bottom: 4px;">${label}</div>`;

        if (!collective || !collective.hasContact()) {
            html += `<div style="font-size: 12px; color: #999; font-style: italic;">No data</div>`;
        } else {
            const isManual = collective.preferredSource === 'manual';
            const sourceBadge = isManual
                ? '<span style="background: #fff3e0; color: #ef6c00; padding: 1px 5px; border-radius: 3px; font-size: 10px; margin-left: 6px;">MANUAL</span>'
                : '<span style="background: #e8f5e9; color: #2e7d32; padding: 1px 5px; border-radius: 3px; font-size: 10px; margin-left: 6px;">AUTO</span>';

            const preferredTerm = collective.getPreferredTerm() || '(unknown)';

            html += `
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                    <div style="font-size: 13px; color: #333;">
                        <strong>Preferred:</strong> ${_escapeHtml(preferredTerm)} ${sourceBadge}
                    </div>
                </div>
            `;

            // Alternatives
            if (collective.alternatives && collective.alternatives.length > 0) {
                html += `<div style="font-size: 11px; color: #666; margin-top: 4px;">Alternatives:</div>`;
                for (let i = 0; i < collective.alternatives.length; i++) {
                    const alt = collective.alternatives[i];
                    const altTerm = alt.primaryAlias ? alt.primaryAlias.term : '(unknown)';

                    html += `
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 2px 0; padding-left: 12px;">
                            <span style="font-size: 12px; color: #555;">${_escapeHtml(altTerm)}</span>
                            <button onclick="startOverrideCreation('${type}', ${i})"
                                    style="background: #3949ab; color: white; border: none; padding: 2px 8px; border-radius: 3px; font-size: 10px; cursor: pointer;">
                                Set as Preferred
                            </button>
                        </div>
                    `;
                }
            } else {
                html += `<div style="font-size: 11px; color: #999; font-style: italic; margin-top: 4px;">No alternatives</div>`;
            }

            // Delete override button if manual
            if (isManual) {
                html += `
                    <div style="margin-top: 6px; border-top: 1px solid #e0e0e0; padding-top: 6px;">
                        <button onclick="deleteOverrideForType('${type}')"
                                style="background: #c62828; color: white; border: none; padding: 3px 10px; border-radius: 3px; font-size: 11px; cursor: pointer;">
                            Revert to Algorithmic
                        </button>
                    </div>
                `;
            }
        }

        html += `</div>`;
    }

    content.innerHTML = html;
}

// ============================================================================
// OVERRIDE CREATION FLOW
// ============================================================================

/**
 * Step 1: User clicked "Set as Preferred" on an alternative
 * Show the anchor key selector panel
 */
function startOverrideCreation(contactType, alternativeIndex) {
    const group = overrideBrowser.selectedGroup;
    if (!group) return;

    // Get the collective and the selected alternative
    const propertyMap = {
        [CONTACT_TYPES.MAILING_ADDRESS]: 'collectiveMailingAddress',
        [CONTACT_TYPES.PHONE]: 'collectivePhone',
        [CONTACT_TYPES.PO_BOX]: 'collectivePOBox',
        [CONTACT_TYPES.EMAIL]: 'collectiveEmail'
    };

    const collective = group[propertyMap[contactType]];
    if (!collective || !collective.alternatives[alternativeIndex]) {
        showOverrideStatus('Invalid selection', 'error');
        return;
    }

    const selectedOption = collective.alternatives[alternativeIndex];

    // Store pending override
    overrideBrowser.pendingOverride = {
        contactType: contactType,
        preferredOption: selectedOption,
        preferredDisplayTerm: selectedOption.primaryAlias ? selectedOption.primaryAlias.term : ''
    };

    // Show anchor key selector
    showAnchorKeyPanel(group);
}

/**
 * Show the anchor key radio list for the selected group
 */
function showAnchorKeyPanel(group) {
    const panel = document.getElementById('overrideAnchorPanel');
    const keyList = document.getElementById('overrideAnchorKeyList');
    const reassignBtn = document.getElementById('overrideReassignAllBtn');
    if (!panel || !keyList) return;

    panel.style.display = 'block';

    // Get all anchor keys currently in use for this group
    const existingOverrides = getOverridesForEntityKeys(group.memberKeys || []);
    const usedAnchorKeys = new Set(existingOverrides.map(o => o.anchorEntityKey));

    // Show reassign button only if there are existing overrides with different anchor keys
    if (reassignBtn) {
        reassignBtn.style.display = usedAnchorKeys.size > 0 ? 'inline-block' : 'none';
    }

    let html = '';

    if (group.memberKeys) {
        for (let i = 0; i < group.memberKeys.length; i++) {
            const key = group.memberKeys[i];
            const entity = getEntityByKey(key);
            const memberName = entity ? extractEntityName(entity) : '(not loaded)';
            const abbrevKey = abbreviateEntityKey(key);
            const sourceColor = key.startsWith('bloomerang:') ? '#2196f3' : '#dc3545';
            const isUsed = usedAnchorKeys.has(key);

            const usedBadge = isUsed
                ? '<span style="background: #fff3e0; color: #ef6c00; padding: 1px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; margin-left: 8px;">★ in use</span>'
                : '';

            const bgColor = isUsed ? '#fffde7' : (i % 2 === 0 ? '#fafafa' : 'white');

            html += `
                <label style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #f0f0f0; background: ${bgColor};"
                       title="${_escapeHtml(key)}">
                    <input type="radio" name="overrideAnchorKey" value="${_escapeHtml(key)}"
                           ${i === 0 ? 'checked' : ''}
                           style="cursor: pointer; flex-shrink: 0;">
                    <span style="font-family: 'Courier New', monospace; font-size: 12px; color: ${sourceColor}; font-weight: 600; min-width: 80px;">
                        ${_escapeHtml(abbrevKey)}
                    </span>
                    <span style="font-size: 12px; color: #333; flex: 1;">${_escapeHtml(memberName)}</span>
                    ${usedBadge}
                </label>
            `;
        }
    }

    keyList.innerHTML = html;
}

/**
 * Step 2: User clicked "Confirm Override" — apply override in memory, then offer to save
 */
function commitPendingOverride() {
    const group = overrideBrowser.selectedGroup;
    const pending = overrideBrowser.pendingOverride;
    if (!group || !pending) {
        showOverrideStatus('No pending override to confirm', 'error');
        return;
    }

    // Get selected anchor key
    const selectedRadio = document.querySelector('input[name="overrideAnchorKey"]:checked');
    if (!selectedRadio) {
        showOverrideStatus('Please select an anchor key', 'error');
        return;
    }

    const anchorKey = selectedRadio.value;

    // Serialize the preferred option for storage
    const serializedPreferred = serializeWithTypes(pending.preferredOption);

    // Add the override to in-memory override database
    addContactPreferenceOverride(
        anchorKey,
        pending.contactType,
        serializedPreferred,
        pending.preferredDisplayTerm
    );

    // Apply the override to the in-memory CollectiveContactInfo object
    const propertyMap = {
        [CONTACT_TYPES.MAILING_ADDRESS]: 'collectiveMailingAddress',
        [CONTACT_TYPES.PHONE]: 'collectivePhone',
        [CONTACT_TYPES.PO_BOX]: 'collectivePOBox',
        [CONTACT_TYPES.EMAIL]: 'collectiveEmail'
    };

    const collective = group[propertyMap[pending.contactType]];
    if (collective) {
        collective.applyOverride(pending.preferredOption, anchorKey);
    }

    overrideBrowser.pendingOverride = null;
    overrideBrowser.hasUnsavedChanges = true;

    const typeLabel = _contactTypeLabel(pending.contactType);

    // Refresh displays
    hideAnchorPanel();
    displayContactPreferences(group);
    displayOverrideActions(group);
    updateSavePanelVisibility();

    // Show popup asking whether to save now or continue
    showSaveOrContinuePopup(typeLabel, pending.preferredDisplayTerm);
}

/**
 * Show popup asking user to save now or continue making changes
 */
function showSaveOrContinuePopup(typeLabel, displayTerm) {
    const confirmed = confirm(
        `Override confirmed: ${typeLabel} → ${displayTerm}\n\n` +
        `Save to EntityGroup database now?\n\n` +
        `OK = Save both databases now\n` +
        `Cancel = Continue making changes (save later)`
    );

    if (confirmed) {
        saveOverrideBrowserDatabase();
    } else {
        showOverrideStatus(`Override applied in memory. Use "Save All Changes" when ready to persist.`, 'info');
    }
}

/**
 * Show or hide the Save All Changes panel based on unsaved changes state
 */
function updateSavePanelVisibility() {
    const panel = document.getElementById('overrideSavePanel');
    if (panel) {
        panel.style.display = overrideBrowser.hasUnsavedChanges ? 'block' : 'none';
    }
}

function cancelPendingOverride() {
    overrideBrowser.pendingOverride = null;
    hideAnchorPanel();
}

/**
 * Reassign all overrides in this group to the selected anchor key
 */
function reassignAllAnchorsToSelected() {
    const group = overrideBrowser.selectedGroup;
    if (!group) return;

    const selectedRadio = document.querySelector('input[name="overrideAnchorKey"]:checked');
    if (!selectedRadio) {
        showOverrideStatus('Please select an anchor key first', 'error');
        return;
    }

    const newAnchorKey = selectedRadio.value;
    const count = reassignAllGroupOverrides(group.memberKeys || [], newAnchorKey);

    if (count > 0) {
        overrideBrowser.hasUnsavedChanges = true;

        // Update the in-memory collective objects
        _updateCollectiveAnchorKeys(group, newAnchorKey);

        // Refresh displays
        displayContactPreferences(group);
        displayOverrideActions(group);
        showAnchorKeyPanel(group);
        updateSavePanelVisibility();

        // Show popup asking whether to save now or continue
        showSaveOrContinuePopup('Anchor reassignment', abbreviateEntityKey(newAnchorKey));
    } else {
        showOverrideStatus('No overrides to reassign', 'info');
    }
}

// ============================================================================
// OVERRIDE DELETION
// ============================================================================

/**
 * Delete an override for a specific contact type on the selected group
 */
function deleteOverrideForType(contactType) {
    const group = overrideBrowser.selectedGroup;
    if (!group) return;

    // Find the override for this group and type
    const overrides = getOverridesForEntityKeys(group.memberKeys || []);
    const match = overrides.find(o => o.contactType === contactType);

    if (!match) {
        showOverrideStatus('No override found for this type', 'error');
        return;
    }

    removeContactPreferenceOverride(match.anchorEntityKey, contactType);

    // Clear the override on the in-memory object
    const propertyMap = {
        [CONTACT_TYPES.MAILING_ADDRESS]: 'collectiveMailingAddress',
        [CONTACT_TYPES.PHONE]: 'collectivePhone',
        [CONTACT_TYPES.PO_BOX]: 'collectivePOBox',
        [CONTACT_TYPES.EMAIL]: 'collectiveEmail'
    };

    const collective = group[propertyMap[contactType]];
    if (collective) {
        collective.clearOverride();
    }

    overrideBrowser.hasUnsavedChanges = true;

    const typeLabel = _contactTypeLabel(contactType);

    // Refresh displays
    displayContactPreferences(group);
    displayOverrideActions(group);
    updateSavePanelVisibility();

    // Show popup asking whether to save now or continue
    showSaveOrContinuePopup(typeLabel, 'algorithmic selection');
}

// ============================================================================
// OVERRIDE ACTIONS PANEL
// ============================================================================

function displayOverrideActions(group) {
    const panel = document.getElementById('overrideActionsPanel');
    const content = document.getElementById('overrideActionsContent');
    if (!panel || !content) return;

    const overrides = getOverridesForEntityKeys(group.memberKeys || []);

    if (overrides.length === 0) {
        panel.style.display = 'none';
        return;
    }

    panel.style.display = 'block';

    let html = `<div style="font-size: 12px; color: #666; margin-bottom: 8px;">
        This group has ${overrides.length} active override(s):
    </div>`;

    for (const override of overrides) {
        const abbrevKey = abbreviateEntityKey(override.anchorEntityKey);
        const label = _contactTypeLabel(override.contactType);
        const date = override.dateSet ? new Date(override.dateSet).toLocaleDateString() : '';

        html += `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #fce4ec;">
                <div>
                    <span style="font-weight: 600; color: #c62828; font-size: 12px;">${_escapeHtml(label)}</span>
                    <span style="font-size: 11px; color: #666;"> → ${_escapeHtml(override.preferredDisplayTerm || '(value)')}</span>
                    <span style="font-size: 10px; color: #999; margin-left: 6px;">anchor: ${_escapeHtml(abbrevKey)}</span>
                    ${date ? `<span style="font-size: 10px; color: #999; margin-left: 6px;">${date}</span>` : ''}
                </div>
                <button onclick="deleteOverrideForType('${override.contactType}')"
                        style="background: #c62828; color: white; border: none; padding: 2px 8px; border-radius: 3px; font-size: 10px; cursor: pointer;">
                    Delete
                </button>
            </div>
        `;
    }

    content.innerHTML = html;
}

// ============================================================================
// SEARCH HELPERS
// ============================================================================

function clearOverrideBrowserSearch() {
    const searchInput = document.getElementById('overrideSearchInput');
    if (searchInput) searchInput.value = '';

    overrideBrowser.searchQuery = '';
    overrideBrowser.selectedGroup = null;
    overrideBrowser.selectedGroupIndex = -1;
    overrideBrowser.pendingOverride = null;

    if (overrideBrowser.viewMode === 'existing') {
        displayExistingOverrides();
    } else {
        clearOverrideBrowserResults();
        updateOverrideResultsCount('Search for groups to create overrides');
    }

    clearOverrideRightPanels();
}

function clearOverrideBrowserResults() {
    const resultsList = document.getElementById('overrideResultsList');
    if (resultsList) {
        resultsList.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #999;">
                <div style="font-size: 48px; margin-bottom: 15px;">&#128269;</div>
                <div>Search by entity name, key, or group index</div>
            </div>
        `;
    }
}

function clearOverrideRightPanels() {
    const groupContent = document.getElementById('overrideGroupInfoContent');
    if (groupContent) groupContent.innerHTML = 'Select a group from the list to view contact preferences';

    const contactPanel = document.getElementById('overrideContactPanel');
    if (contactPanel) contactPanel.style.display = 'none';

    hideAnchorPanel();

    const actionsPanel = document.getElementById('overrideActionsPanel');
    if (actionsPanel) actionsPanel.style.display = 'none';
}

// ============================================================================
// STATS
// ============================================================================

function showOverrideBrowserStats() {
    const stats = getContactPreferenceOverrideStats();

    let html = '<div style="padding: 10px; font-size: 13px;">';
    html += `<p><strong>Total Overrides:</strong> ${stats.totalOverrides}</p>`;
    html += `<p><strong>Unique Anchor Keys:</strong> ${stats.uniqueAnchorKeys}</p>`;
    html += '<p><strong>By Contact Type:</strong></p>';
    html += '<ul style="margin: 4px 0;">';

    for (const [type, count] of Object.entries(stats.byContactType)) {
        html += `<li>${_contactTypeLabel(type)}: ${count}</li>`;
    }

    html += '</ul>';
    html += `<p><strong>Unsaved Changes:</strong> ${stats.hasUnsavedChanges ? 'Yes' : 'No'}</p>`;
    html += `<p><strong>Last Load:</strong> ${stats.lastLoadTime ? new Date(stats.lastLoadTime).toLocaleString() : 'Never'}</p>`;
    html += '</div>';

    const detailsContent = document.getElementById('overrideGroupInfoContent');
    if (detailsContent) {
        detailsContent.innerHTML = html;
    }
}

// ============================================================================
// UI HELPERS
// ============================================================================

function hideAnchorPanel() {
    const panel = document.getElementById('overrideAnchorPanel');
    if (panel) panel.style.display = 'none';
}

function showOverrideStatus(message, type) {
    const statusDiv = document.getElementById('overrideStatusMessage');
    if (!statusDiv) return;

    statusDiv.textContent = message;
    statusDiv.className = 'status-message';

    switch (type) {
        case 'loading':
            statusDiv.style.cssText = 'display: block; background-color: #fff3e0; color: #ef6c00; padding: 10px; border-radius: 4px; margin-bottom: 10px;';
            break;
        case 'success':
            statusDiv.style.cssText = 'display: block; background-color: #e8f5e9; color: #2e7d32; padding: 10px; border-radius: 4px; margin-bottom: 10px;';
            break;
        case 'error':
            statusDiv.style.cssText = 'display: block; background-color: #ffebee; color: #c62828; padding: 10px; border-radius: 4px; margin-bottom: 10px;';
            break;
        case 'info':
            statusDiv.style.cssText = 'display: block; background-color: #e3f2fd; color: #1565c0; padding: 10px; border-radius: 4px; margin-bottom: 10px;';
            break;
        default:
            statusDiv.style.cssText = 'display: block; padding: 10px; border-radius: 4px; margin-bottom: 10px;';
    }

    // Auto-hide after 5 seconds for success/info
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
}

function updateOverrideResultsCount(text) {
    const el = document.getElementById('overrideResultsCount');
    if (el) el.textContent = text;
}

function _contactTypeLabel(contactType) {
    switch (contactType) {
        case CONTACT_TYPES.MAILING_ADDRESS: return 'Mailing Address';
        case CONTACT_TYPES.PHONE: return 'Phone';
        case CONTACT_TYPES.PO_BOX: return 'PO Box';
        case CONTACT_TYPES.EMAIL: return 'Email';
        default: return contactType;
    }
}

function _escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Update in-memory collective anchor keys after reassignment
 */
function _updateCollectiveAnchorKeys(group, newAnchorKey) {
    const properties = ['collectiveMailingAddress', 'collectivePhone', 'collectivePOBox', 'collectiveEmail'];
    for (const prop of properties) {
        if (group[prop] && group[prop].preferredSource === 'manual') {
            group[prop].overrideAnchorKey = newAnchorKey;
        }
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

window.initializeOverrideBrowser = initializeOverrideBrowser;
window.selectOverrideGroup = selectOverrideGroup;
window.selectOverrideByAnchorKey = selectOverrideByAnchorKey;
window.startOverrideCreation = startOverrideCreation;
window.commitPendingOverride = commitPendingOverride;
window.cancelPendingOverride = cancelPendingOverride;
window.reassignAllAnchorsToSelected = reassignAllAnchorsToSelected;
window.deleteOverrideForType = deleteOverrideForType;

console.log('[ContactPreferenceOverrideBrowser] Module loaded');
