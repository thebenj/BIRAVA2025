/**
 * Fire Number Collision Browser
 *
 * Browser interface for viewing and managing the fire number collision database.
 * Allows search, review, and manual editing of collision records.
 *
 * Similar pattern to streetNameBrowser.js
 */

// ============================================================================
// BROWSER STATE
// ============================================================================

const fireNumberCollisionBrowser = {
    currentResults: [],
    selectedRecord: null,
    selectedIndex: -1,
    searchQuery: '',
    hasUnsavedChanges: false
};

window.fireNumberCollisionBrowser = fireNumberCollisionBrowser;

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the browser interface
 */
function initializeFireNumberCollisionBrowser() {
    console.log('[FireNumberCollisionBrowser] Initializing...');

    restoreCollisionBrowserFileId();
    setupCollisionBrowserButtons();
    setupCollisionBrowserSearch();
    setupCollisionBrowserEditPanel();

    console.log('[FireNumberCollisionBrowser] Initialization complete');
}

/**
 * Restore file ID from localStorage
 */
function restoreCollisionBrowserFileId() {
    const savedFileId = localStorage.getItem(FIRE_NUMBER_COLLISION_STORAGE_KEY);
    const fileIdInput = document.getElementById('collisionDatabaseFileId');

    if (fileIdInput) {
        fileIdInput.value = savedFileId || FIRE_NUMBER_COLLISION_FILE_ID;

        fileIdInput.addEventListener('change', (event) => {
            const newId = event.target.value.trim();
            if (newId) {
                localStorage.setItem(FIRE_NUMBER_COLLISION_STORAGE_KEY, newId);
                console.log('[FireNumberCollisionBrowser] File ID updated:', newId);
            }
        });
    }
}

/**
 * Setup button event handlers
 */
function setupCollisionBrowserButtons() {
    const loadBtn = document.getElementById('collisionLoadBtn');
    const saveBtn = document.getElementById('collisionSaveBtn');
    const statsBtn = document.getElementById('collisionStatsBtn');

    if (loadBtn) {
        loadBtn.addEventListener('click', loadCollisionBrowserDatabase);
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', saveCollisionBrowserDatabase);
    }

    if (statsBtn) {
        statsBtn.addEventListener('click', showCollisionBrowserStats);
    }
}

/**
 * Setup search functionality
 */
function setupCollisionBrowserSearch() {
    const searchInput = document.getElementById('collisionSearchInput');
    const searchBtn = document.getElementById('collisionSearchBtn');
    const clearBtn = document.getElementById('collisionClearSearchBtn');

    if (searchInput) {
        searchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                performCollisionBrowserSearch();
            }
        });
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', performCollisionBrowserSearch);
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', clearCollisionBrowserSearch);
    }
}

/**
 * Setup edit panel functionality
 */
function setupCollisionBrowserEditPanel() {
    const addKeyBtn = document.getElementById('collisionAddKeyBtn');
    const removeKeyBtn = document.getElementById('collisionRemoveKeyBtn');
    const newRecordBtn = document.getElementById('collisionNewRecordBtn');
    const deleteRecordBtn = document.getElementById('collisionDeleteRecordBtn');

    if (addKeyBtn) {
        addKeyBtn.addEventListener('click', addEntityKeyFromBrowser);
    }

    if (removeKeyBtn) {
        removeKeyBtn.addEventListener('click', removeEntityKeyFromBrowser);
    }

    if (newRecordBtn) {
        newRecordBtn.addEventListener('click', createNewCollisionRecord);
    }

    if (deleteRecordBtn) {
        deleteRecordBtn.addEventListener('click', deleteSelectedCollisionRecord);
    }
}

// ============================================================================
// LOAD / SAVE
// ============================================================================

/**
 * Load database and display in browser
 */
async function loadCollisionBrowserDatabase() {
    showCollisionBrowserStatus('Loading collision database...', 'loading');

    try {
        await loadFireNumberCollisionDatabaseFromSheet();

        const records = getAllCollisionRecords();
        fireNumberCollisionBrowser.currentResults = records;

        displayCollisionBrowserResults(records);
        updateCollisionBrowserResultsCount(`Loaded ${records.length} collision records`);
        showCollisionBrowserStatus(`Loaded ${records.length} records`, 'success');

    } catch (error) {
        console.error('[FireNumberCollisionBrowser] Load error:', error);
        showCollisionBrowserStatus('Error loading database: ' + error.message, 'error');
    }
}

/**
 * Save database to Google Sheets
 */
async function saveCollisionBrowserDatabase() {
    showCollisionBrowserStatus('Saving collision database...', 'loading');

    try {
        await saveFireNumberCollisionDatabaseToSheet();

        fireNumberCollisionBrowser.hasUnsavedChanges = false;
        showCollisionBrowserStatus('Database saved successfully', 'success');

    } catch (error) {
        console.error('[FireNumberCollisionBrowser] Save error:', error);
        showCollisionBrowserStatus('Error saving database: ' + error.message, 'error');
    }
}

// ============================================================================
// SEARCH
// ============================================================================

/**
 * Perform search across fire numbers and entity keys
 */
function performCollisionBrowserSearch() {
    const searchInput = document.getElementById('collisionSearchInput');
    const query = (searchInput ? searchInput.value : '').toUpperCase().trim();

    fireNumberCollisionBrowser.searchQuery = query;

    if (!query) {
        // Show all records
        const records = getAllCollisionRecords();
        fireNumberCollisionBrowser.currentResults = records;
        displayCollisionBrowserResults(records);
        updateCollisionBrowserResultsCount(`Showing all ${records.length} records`);
        return;
    }

    // Search by fire number OR entity key
    const allRecords = getAllCollisionRecords();
    const matches = allRecords.filter(record => {
        // Match fire number
        if (record.fireNumber.includes(query)) {
            return true;
        }

        // Match any entity key
        for (const key of record.entityKeys) {
            if (key.toUpperCase().includes(query)) {
                return true;
            }
        }

        // Match any PID
        for (const pid of record.pids) {
            if (pid.toUpperCase().includes(query)) {
                return true;
            }
        }

        return false;
    });

    fireNumberCollisionBrowser.currentResults = matches;
    displayCollisionBrowserResults(matches);
    updateCollisionBrowserResultsCount(`Found ${matches.length} records matching "${query}"`);
}

/**
 * Clear search and show all records
 */
function clearCollisionBrowserSearch() {
    const searchInput = document.getElementById('collisionSearchInput');
    if (searchInput) {
        searchInput.value = '';
    }

    fireNumberCollisionBrowser.searchQuery = '';
    fireNumberCollisionBrowser.selectedRecord = null;
    fireNumberCollisionBrowser.selectedIndex = -1;

    const records = getAllCollisionRecords();
    fireNumberCollisionBrowser.currentResults = records;
    displayCollisionBrowserResults(records);
    updateCollisionBrowserResultsCount(`Showing all ${records.length} records`);

    clearCollisionDetailsPanel();
}

// ============================================================================
// DISPLAY
// ============================================================================

/**
 * Display search results in the list
 * @param {Array} records - CollisionRecord array
 */
function displayCollisionBrowserResults(records) {
    const resultsList = document.getElementById('collisionResultsList');
    if (!resultsList) return;

    if (records.length === 0) {
        resultsList.innerHTML = '<div style="padding: 20px; color: #666; text-align: center;">No collision records found</div>';
        return;
    }

    // Sort by fire number numerically
    const sorted = [...records].sort((a, b) => {
        const numA = parseInt(a.fireNumber, 10) || 0;
        const numB = parseInt(b.fireNumber, 10) || 0;
        return numA - numB;
    });

    const html = sorted.map((record, index) => {
        const entityCount = record.entityKeys.length;
        const manualBadge = record.manuallyAdded
            ? '<span style="background: #e1bee7; color: #7b1fa2; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-left: 8px;">MANUAL</span>'
            : '';

        return `
            <div class="collision-result-item" onclick="selectCollisionBrowserItem(${index}, this)"
                 style="padding: 10px; border-bottom: 1px solid #eee; cursor: pointer;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: bold; color: #1565c0; font-size: 16px;">
                        Fire #${escapeHtmlForCollisionBrowser(record.fireNumber)}
                    </span>
                    <span style="background: #bbdefb; color: #0d47a1; padding: 2px 8px; border-radius: 10px; font-size: 12px;">
                        ${entityCount} ${entityCount === 1 ? 'entity' : 'entities'}
                    </span>
                    ${manualBadge}
                </div>
                <div style="font-size: 11px; color: #666; margin-top: 4px;">
                    PIDs: ${record.pids.slice(0, 3).join(', ')}${record.pids.length > 3 ? '...' : ''}
                </div>
            </div>
        `;
    }).join('');

    resultsList.innerHTML = html;
}

/**
 * Select a record from the list
 * @param {number} index - Index in currentResults
 * @param {HTMLElement} element - Clicked element
 */
function selectCollisionBrowserItem(index, element) {
    // Remove selection from all items
    const items = document.querySelectorAll('.collision-result-item');
    items.forEach(item => item.style.background = '');

    // Highlight selected item
    if (element) {
        element.style.background = '#e3f2fd';
    }

    fireNumberCollisionBrowser.selectedIndex = index;
    fireNumberCollisionBrowser.selectedRecord = fireNumberCollisionBrowser.currentResults[index];

    displayCollisionDetails(fireNumberCollisionBrowser.selectedRecord);
}

/**
 * Display details of selected record
 * @param {Object} record - CollisionRecord
 */
function displayCollisionDetails(record) {
    const detailsContent = document.getElementById('collisionDetailsContent');
    if (!detailsContent || !record) {
        clearCollisionDetailsPanel();
        return;
    }

    let html = `
        <div style="margin-bottom: 16px;">
            <div style="font-size: 24px; font-weight: bold; color: #1565c0;">
                Fire Number: ${escapeHtmlForCollisionBrowser(record.fireNumber)}
            </div>
            <div style="font-size: 12px; color: #666; margin-top: 4px;">
                Last updated: ${record.lastUpdated}
                ${record.manuallyAdded ? ' | Manually added' : ''}
            </div>
        </div>
    `;

    // Entity Keys section
    html += `
        <div style="margin-bottom: 16px;">
            <h4 style="color: #2e7d32; margin-bottom: 8px;">Entity Keys (${record.entityKeys.length})</h4>
            <div style="background: #f5f5f5; padding: 10px; border-radius: 4px; max-height: 200px; overflow-y: auto;">
    `;

    if (record.entityKeys.length === 0) {
        html += '<div style="color: #999; font-style: italic;">No entity keys</div>';
    } else {
        for (const key of record.entityKeys) {
            html += `
                <div style="padding: 4px 0; border-bottom: 1px solid #e0e0e0; font-family: monospace; font-size: 12px;">
                    ${escapeHtmlForCollisionBrowser(key)}
                </div>
            `;
        }
    }

    html += '</div></div>';

    // PIDs section
    html += `
        <div style="margin-bottom: 16px;">
            <h4 style="color: #ef6c00; margin-bottom: 8px;">PIDs (${record.pids.length})</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
    `;

    if (record.pids.length === 0) {
        html += '<span style="color: #999; font-style: italic;">No PIDs</span>';
    } else {
        for (const pid of record.pids) {
            html += `
                <span style="background: #fff3e0; color: #e65100; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                    ${escapeHtmlForCollisionBrowser(pid)}
                </span>
            `;
        }
    }

    html += '</div></div>';

    detailsContent.innerHTML = html;
}

/**
 * Clear the details panel
 */
function clearCollisionDetailsPanel() {
    const detailsContent = document.getElementById('collisionDetailsContent');
    if (detailsContent) {
        detailsContent.innerHTML = '<div style="color: #999; font-style: italic;">Select a record to view details</div>';
    }
}

// ============================================================================
// EDITING
// ============================================================================

/**
 * Add entity key from browser input
 */
function addEntityKeyFromBrowser() {
    if (!fireNumberCollisionBrowser.selectedRecord) {
        alert('Please select a collision record first');
        return;
    }

    const keyInput = document.getElementById('collisionEntityKeyInput');
    const pidInput = document.getElementById('collisionPidInput');

    const entityKey = keyInput ? keyInput.value.trim() : '';
    const pid = pidInput ? pidInput.value.trim() : '';

    if (!entityKey) {
        alert('Please enter an entity key');
        return;
    }

    addEntityKeyToCollision(
        fireNumberCollisionBrowser.selectedRecord.fireNumber,
        entityKey,
        pid
    );

    // Refresh display
    displayCollisionDetails(fireNumberCollisionBrowser.selectedRecord);
    displayCollisionBrowserResults(fireNumberCollisionBrowser.currentResults);

    // Clear inputs
    if (keyInput) keyInput.value = '';
    if (pidInput) pidInput.value = '';

    fireNumberCollisionBrowser.hasUnsavedChanges = true;
    showCollisionBrowserStatus('Entity key added (unsaved)', 'success');
}

/**
 * Remove entity key from browser
 */
function removeEntityKeyFromBrowser() {
    if (!fireNumberCollisionBrowser.selectedRecord) {
        alert('Please select a collision record first');
        return;
    }

    const keyInput = document.getElementById('collisionEntityKeyInput');
    const entityKey = keyInput ? keyInput.value.trim() : '';

    if (!entityKey) {
        alert('Please enter an entity key to remove');
        return;
    }

    removeEntityKeyFromCollision(
        fireNumberCollisionBrowser.selectedRecord.fireNumber,
        entityKey
    );

    // Refresh display
    displayCollisionDetails(fireNumberCollisionBrowser.selectedRecord);
    displayCollisionBrowserResults(fireNumberCollisionBrowser.currentResults);

    if (keyInput) keyInput.value = '';

    fireNumberCollisionBrowser.hasUnsavedChanges = true;
    showCollisionBrowserStatus('Entity key removed (unsaved)', 'success');
}

/**
 * Create new collision record
 */
function createNewCollisionRecord() {
    const fireNumber = prompt('Enter fire number for new collision record:');

    if (!fireNumber || !fireNumber.trim()) {
        return;
    }

    const trimmed = fireNumber.trim();

    if (createCollisionRecord(trimmed)) {
        // Refresh list
        const records = getAllCollisionRecords();
        fireNumberCollisionBrowser.currentResults = records;
        displayCollisionBrowserResults(records);

        fireNumberCollisionBrowser.hasUnsavedChanges = true;
        showCollisionBrowserStatus(`Created record for fire number ${trimmed} (unsaved)`, 'success');
    } else {
        alert(`Record for fire number ${trimmed} already exists`);
    }
}

/**
 * Delete selected collision record
 */
function deleteSelectedCollisionRecord() {
    if (!fireNumberCollisionBrowser.selectedRecord) {
        alert('Please select a collision record first');
        return;
    }

    const fireNumber = fireNumberCollisionBrowser.selectedRecord.fireNumber;

    if (!confirm(`Delete collision record for fire number ${fireNumber}?`)) {
        return;
    }

    deleteCollisionRecord(fireNumber);

    // Refresh list
    const records = getAllCollisionRecords();
    fireNumberCollisionBrowser.currentResults = records;
    displayCollisionBrowserResults(records);

    fireNumberCollisionBrowser.selectedRecord = null;
    fireNumberCollisionBrowser.selectedIndex = -1;
    clearCollisionDetailsPanel();

    fireNumberCollisionBrowser.hasUnsavedChanges = true;
    showCollisionBrowserStatus(`Deleted record for fire number ${fireNumber} (unsaved)`, 'success');
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Show database statistics
 */
function showCollisionBrowserStats() {
    const stats = getFireNumberCollisionStats();

    const message = `
Fire Number Collision Database Statistics
==========================================
Total Fire Numbers: ${stats.totalFireNumbers}
Total Entity Keys: ${stats.totalEntityKeys}
Average Entities per Fire Number: ${stats.averageEntitiesPerFireNumber}
Max Entities at One Fire Number: ${stats.maxEntitiesPerFireNumber}
Manually Added Records: ${stats.manuallyAddedRecords}
Has Unsaved Changes: ${stats.hasUnsavedChanges}
Initialization Mode: ${stats.initializationMode || 'N/A'}
Last Load Time: ${stats.lastLoadTime || 'Never'}
    `.trim();

    alert(message);
}

// ============================================================================
// STATUS MESSAGES
// ============================================================================

/**
 * Show status message
 * @param {string} message - Message to display
 * @param {string} type - 'loading', 'error', or 'success'
 */
function showCollisionBrowserStatus(message, type) {
    const statusDiv = document.getElementById('collisionStatusMessage');
    if (!statusDiv) return;

    let backgroundColor, textColor;

    switch (type) {
        case 'loading':
            backgroundColor = '#e3f2fd';
            textColor = '#1565c0';
            break;
        case 'error':
            backgroundColor = '#ffebee';
            textColor = '#c62828';
            break;
        case 'success':
            backgroundColor = '#e8f5e9';
            textColor = '#2e7d32';
            break;
        default:
            backgroundColor = '#f5f5f5';
            textColor = '#333';
    }

    statusDiv.style.cssText = `
        padding: 10px;
        margin: 10px 0;
        border-radius: 4px;
        background: ${backgroundColor};
        color: ${textColor};
    `;
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';

    // Auto-hide success messages
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
}

/**
 * Update results count display
 * @param {string} message - Message to display
 */
function updateCollisionBrowserResultsCount(message) {
    const countSpan = document.getElementById('collisionResultsCount');
    if (countSpan) {
        countSpan.textContent = message;
    }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Escape HTML for safe display
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtmlForCollisionBrowser(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================================
// EXPORTS
// ============================================================================

window.initializeFireNumberCollisionBrowser = initializeFireNumberCollisionBrowser;
window.loadCollisionBrowserDatabase = loadCollisionBrowserDatabase;
window.saveCollisionBrowserDatabase = saveCollisionBrowserDatabase;
window.performCollisionBrowserSearch = performCollisionBrowserSearch;
window.clearCollisionBrowserSearch = clearCollisionBrowserSearch;
window.selectCollisionBrowserItem = selectCollisionBrowserItem;

console.log('[FireNumberCollisionBrowser] Module loaded');
