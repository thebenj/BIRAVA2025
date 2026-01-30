// individualNameBrowser.js - Individual Name Browser Tool for BIRAVA2025
//
// PURPOSE: Browser interface for viewing, searching, testing, and managing IndividualName objects
// from the IndividualName database. Follows same pattern as streetNameBrowser.js.
//
// DESIGN PRINCIPLES:
// - Follow same pattern as streetNameBrowser.js
// - No embedded script tags in template literals
// - State management via global object
// - Event handlers set up programmatically on initialization
//
// KEY DIFFERENCES FROM STREETNAME BROWSER:
// - Displays name components (firstName, lastName, otherNames)
// - compareTo returns single numeric score (0-1), not category object
// - Different field display and search logic

// =============================================================================
// CONSTANTS
// =============================================================================

const INDIVIDUALNAME_BROWSER_FILE_ID_STORAGE_KEY = 'birava_individualNameBrowserFileId';
const INDIVIDUALNAME_MANUAL_EDIT_SOURCE = 'INDIVIDUAL_NAME_BROWSER_MANUAL';

// =============================================================================
// GLOBAL STATE MANAGEMENT
// =============================================================================

const individualNameBrowser = {
    // Loaded database (from window.individualNameDatabase)
    loadedDatabase: null,

    // Loaded index file (map of primaryKey -> {fileId, created, lastModified})
    loadedIndex: null,

    // Current state
    currentResults: [],
    selectedIndividualName: null,
    selectedIndex: -1,

    // Search state
    searchQuery: '',

    // Manual edits tracking
    manualEdits: {
        namesAdded: [],
        aliasesAdded: []
    },

    // Dirty flag for unsaved changes
    hasUnsavedChanges: false,

    // Session flag: consistency check must be run before other operations
    consistencyCheckRun: false,

    // Track which bulk file source was loaded: 'original' or 'dev'
    bulkSource: null
};

// =============================================================================
// CONSISTENCY CHECK GUARD
// =============================================================================

/**
 * Guard function that checks if consistency check has been run this session.
 * Must be called at the start of any operation that modifies data or relies on consistent state.
 * @param {string} operationName - Name of the operation for error message
 * @returns {boolean} True if consistency check has been run, false otherwise (with error message shown)
 */
function requireConsistencyCheck(operationName) {
    if (individualNameBrowser.consistencyCheckRun) {
        return true;
    }
    showIndividualNameBrowserStatus(
        `Cannot ${operationName}: Run Cross Check first`,
        'error'
    );
    console.warn(`[IndividualNameBrowser] Operation "${operationName}" blocked - Cross Check not run this session`);
    return false;
}

// =============================================================================
// DATABASE STATE HELPER
// =============================================================================

/**
 * Ensures the browser has a reference to the loaded database.
 * If another process loaded the database, syncs the browser's local reference.
 * @returns {boolean} True if database is available, false if needs loading
 */
function ensureIndividualNameBrowserDatabaseSynced() {
    // Already have local reference
    if (individualNameBrowser.loadedDatabase) {
        return true;
    }

    // Check if global database was loaded by another process
    if (window.individualNameDatabase && window.individualNameDatabase._isLoaded) {
        console.log('[INDIVIDUAL NAME BROWSER] Syncing with database loaded by another process');
        individualNameBrowser.loadedDatabase = window.individualNameDatabase;
        individualNameBrowser.hasUnsavedChanges = false;
        individualNameBrowser.manualEdits = { namesAdded: [], aliasesAdded: [] };
        return true;
    }

    // Database not loaded anywhere
    return false;
}

// =============================================================================
// INITIALIZATION & SETUP
// =============================================================================

function initializeIndividualNameBrowser() {
    console.log("Initializing Individual Name Browser");

    // Setup button event handlers
    setupIndividualNameBrowserButtons();

    // Setup search handlers
    setupIndividualNameBrowserSearch();

    // Setup test panel handlers
    setupIndividualNameBrowserTestPanel();

    // Setup alias panel handlers
    setupIndividualNameBrowserAliasPanel();

    console.log("Individual Name Browser initialized");
}

function setupIndividualNameBrowserButtons() {
    const loadBtn = document.getElementById('individualNameLoadBtn');
    if (loadBtn) loadBtn.addEventListener('click', loadIndividualNameBrowserDatabase);

    const newBtn = document.getElementById('individualNameNewBtn');
    if (newBtn) newBtn.addEventListener('click', showCreateIndividualNameDialog);

    const statsBtn = document.getElementById('individualNameStatsBtn');
    if (statsBtn) statsBtn.addEventListener('click', showIndividualNameBrowserStats);

    const exportBtn = document.getElementById('individualNameExportBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportIndividualNameBrowserDatabase);

    // Build Run/Resume button - Step 6 enhancement
    const buildResumeBtn = document.getElementById('individualNameBuildResumeBtn');
    if (buildResumeBtn) buildResumeBtn.addEventListener('click', handleBuildRunResume);

    // Reset button - clears progress to start fresh
    const resetBtn = document.getElementById('individualNameResetBtn');
    if (resetBtn) resetBtn.addEventListener('click', handleIndividualNameReset);

    // Consistency Check button
    const consistencyCheckBtn = document.getElementById('individualNameConsistencyCheckBtn');
    if (consistencyCheckBtn) consistencyCheckBtn.addEventListener('click', handleConsistencyCheck);

    // Backup Bulk button
    const backupBulkBtn = document.getElementById('individualNameBackupBulkBtn');
    if (backupBulkBtn) backupBulkBtn.addEventListener('click', handleBackupBulk);

    // Rebuild Bulk from Files button (Incremental Change)
    const rebuildBulkBtn = document.getElementById('individualNameRebuildBulkBtn');
    if (rebuildBulkBtn) rebuildBulkBtn.addEventListener('click', handleRebuildBulkFromFiles);

    // Cross Check button (compare DEV bulk with original)
    const crossCheckBtn = document.getElementById('individualNameCrossCheckBtn');
    if (crossCheckBtn) crossCheckBtn.addEventListener('click', handleCrossCheck);

    // Rebuild Map button (fix null fileIds in index)
    const rebuildMapBtn = document.getElementById('individualNameRebuildMapBtn');
    if (rebuildMapBtn) rebuildMapBtn.addEventListener('click', handleRebuildMap);

    // Sync DEV to Original button
    const syncDevToOriginalBtn = document.getElementById('individualNameSyncDevToOriginalBtn');
    if (syncDevToOriginalBtn) syncDevToOriginalBtn.addEventListener('click', handleSyncDevToOriginal);

    // Folder ID persistence
    setupFolderIdPersistence();
}

function setupIndividualNameBrowserSearch() {
    const searchInput = document.getElementById('individualNameSearchInput');
    const searchBtn = document.getElementById('individualNameSearchBtn');
    const clearBtn = document.getElementById('individualNameClearBtn');

    if (searchInput) {
        searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') performIndividualNameBrowserSearch();
        });
    }
    if (searchBtn) searchBtn.addEventListener('click', performIndividualNameBrowserSearch);
    if (clearBtn) clearBtn.addEventListener('click', clearIndividualNameBrowserSearch);
}

const FOLDER_ID_STORAGE_KEY = 'birava_individualName_folderIds';

function setupFolderIdPersistence() {
    const folderIdInput = document.getElementById('individualNameFolderId');
    const deletedFolderIdInput = document.getElementById('individualNameDeletedFolderId');

    // Load saved values
    const saved = loadFolderIds();
    if (folderIdInput && saved.folderId) {
        folderIdInput.value = saved.folderId;
    }
    if (deletedFolderIdInput && saved.deletedFolderId) {
        deletedFolderIdInput.value = saved.deletedFolderId;
    }

    // Save on change
    if (folderIdInput) {
        folderIdInput.addEventListener('change', saveFolderIds);
        folderIdInput.addEventListener('blur', saveFolderIds);
    }
    if (deletedFolderIdInput) {
        deletedFolderIdInput.addEventListener('change', saveFolderIds);
        deletedFolderIdInput.addEventListener('blur', saveFolderIds);
    }
}

function loadFolderIds() {
    try {
        const stored = localStorage.getItem(FOLDER_ID_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.warn('[IndividualNameBrowser] Error loading folder IDs:', e);
    }
    return {};
}

function saveFolderIds() {
    const folderIdInput = document.getElementById('individualNameFolderId');
    const deletedFolderIdInput = document.getElementById('individualNameDeletedFolderId');

    const data = {
        folderId: folderIdInput?.value?.trim() || '',
        deletedFolderId: deletedFolderIdInput?.value?.trim() || ''
    };

    localStorage.setItem(FOLDER_ID_STORAGE_KEY, JSON.stringify(data));
    console.log('[IndividualNameBrowser] Folder IDs saved');
}

function setupIndividualNameBrowserTestPanel() {
    const testBtn = document.getElementById('individualNameTestBtn');
    const testInput = document.getElementById('individualNameTestInput');

    if (testBtn) testBtn.addEventListener('click', performIndividualNameCompareToTest);
    if (testInput) {
        testInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') performIndividualNameCompareToTest();
        });
        // Auto-test on input change (with debounce)
        testInput.addEventListener('input', debounceIndividualNameTest);
    }
}

let individualNameTestDebounceTimer = null;
function debounceIndividualNameTest() {
    if (individualNameTestDebounceTimer) clearTimeout(individualNameTestDebounceTimer);
    individualNameTestDebounceTimer = setTimeout(performIndividualNameCompareToTest, 300);
}

function setupIndividualNameBrowserAliasPanel() {
    const addBtn = document.getElementById('individualNameAddAliasBtn');
    if (addBtn) addBtn.addEventListener('click', addAliasToSelectedIndividualName);
}

// =============================================================================
// DATA LOADING
// =============================================================================

// Bulk file IDs
const BULK_FILE_ID_ORIGINAL = '1r2G6Spg064KNbBzzKqIk131qAK0NDM9l';
const BULK_FILE_ID_DEV = '1K1q_nhOBHKiXD5UbKRkXZpkHKxgIdu1S';

// Index file ID
const INDEX_FILE_ID = '1IcC5MiDfw23kmNFlriaaFYY9mtDoqxSC';

/**
 * Add a single entry to the Google Drive index file.
 * This is a TARGETED update - reads current index, adds one entry, saves back.
 * Used when creating new IndividualName objects to avoid the _saveIndex() corruption issue.
 *
 * @param {string} key - The primary key for the new entry
 * @param {string} fileId - The Google Drive file ID for the new object
 * @returns {Promise<void>}
 */
async function addEntryToGoogleDriveIndex(key, fileId) {
    console.log(`[addEntryToGoogleDriveIndex] Adding "${key}" with fileId ${fileId}`);

    // 1. Load current index from Google Drive
    const response = await gapi.client.drive.files.get({
        fileId: INDEX_FILE_ID,
        alt: 'media'
    });
    const indexData = JSON.parse(response.body);

    if (!indexData.entries) {
        indexData.entries = {};
    }

    // 2. Add the new entry
    const now = new Date().toISOString();
    indexData.entries[key] = {
        fileId: fileId,
        created: now,
        lastModified: now
    };

    // 3. Update metadata
    indexData.__lastModified = now;
    indexData.__indexedEntries = Object.keys(indexData.entries).length;

    // 4. Save back to Google Drive
    const jsonContent = JSON.stringify(indexData, null, 2);
    const saveResponse = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${INDEX_FILE_ID}?uploadType=media`,
        {
            method: 'PATCH',
            headers: new Headers({
                'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                'Content-Type': 'application/json'
            }),
            body: jsonContent
        }
    );

    if (!saveResponse.ok) {
        const errorText = await saveResponse.text();
        throw new Error(`Failed to save index: HTTP ${saveResponse.status}: ${errorText}`);
    }

    console.log(`[addEntryToGoogleDriveIndex] Successfully added "${key}" to Drive index (now ${indexData.__indexedEntries} entries)`);
}

/**
 * Load DEV bulk file fresh for move alias search.
 * Always loads fresh - no caching to avoid stale data after move operations.
 * @returns {Promise<Object>} The parsed bulk file data with entries property
 */
async function loadDevBulkForSearch() {
    const response = await gapi.client.drive.files.get({
        fileId: BULK_FILE_ID_DEV,
        alt: 'media'
    });
    return JSON.parse(response.body);
}

/**
 * Find the most similar IndividualNames to a given alias term.
 * Compares against primary, homonyms, and candidates (NOT synonyms).
 * @param {string} aliasTermToMove - The alias term to find matches for
 * @param {string} excludeKey - Key to exclude (the source IndividualName)
 * @param {number} limit - Maximum number of results to return (default 5)
 * @returns {Promise<Array>} Array of {key, object, bestScore, scores} sorted by bestScore descending
 */
async function findSimilarIndividualNames(aliasTermToMove, excludeKey, limit = 5) {
    const bulkData = await loadDevBulkForSearch();
    const results = [];
    const normalizedAlias = aliasTermToMove.toUpperCase();

    for (const [key, entryData] of Object.entries(bulkData.entries)) {
        if (key.toUpperCase() === excludeKey.toUpperCase()) continue;

        // Deserialize the object - entryData.object may be string or object
        const obj = deserializeWithTypes(
            typeof entryData.object === 'string' ? entryData.object : JSON.stringify(entryData.object)
        );

        // Compare against primary
        const primaryScore = levenshteinSimilarity(normalizedAlias,
            (obj.primaryAlias?.term || '').toUpperCase());

        // Compare against homonyms - find best score
        let homonymScore = 0;
        for (const h of (obj.alternatives?.homonyms || [])) {
            const s = levenshteinSimilarity(normalizedAlias, (h.term || '').toUpperCase());
            if (s > homonymScore) homonymScore = s;
        }

        // Compare against candidates - find best score
        let candidateScore = 0;
        for (const c of (obj.alternatives?.candidates || [])) {
            const s = levenshteinSimilarity(normalizedAlias, (c.term || '').toUpperCase());
            if (s > candidateScore) candidateScore = s;
        }

        const bestScore = Math.max(primaryScore, homonymScore, candidateScore);
        results.push({ key, object: obj, bestScore, scores: { primaryScore, homonymScore, candidateScore } });
    }

    results.sort((a, b) => b.bestScore - a.bestScore);
    return results.slice(0, limit);
}

/**
 * Show dialog to let user choose where to move an alias.
 * @param {AttributedTerm} aliasToMove - The alias being moved
 * @param {string} category - The category it came from (homonyms, synonyms, candidates)
 * @param {string} sourceKey - The source IndividualName's key
 * @returns {Promise<Object>} Result object: {action: 'cancel'|'move'|'createNew', destination?, destinationObject?}
 */
async function showMoveAliasDialog(aliasToMove, category, sourceKey) {
    const term = aliasToMove.term;

    // Find similar names
    showIndividualNameBrowserStatus('Finding similar names...', 'loading');
    const matches = await findSimilarIndividualNames(term, sourceKey, 5);
    showIndividualNameBrowserStatus('', '');

    return new Promise((resolve) => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;';

        // Create popup
        const popup = document.createElement('div');
        popup.style.cssText = 'background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;';

        // Build match options HTML
        let matchOptionsHtml = '';
        matches.forEach((match, idx) => {
            const scorePercent = Math.round(match.bestScore * 100);
            const primaryName = match.object.primaryAlias?.term || match.key;
            matchOptionsHtml += `
                <label style="display: flex; align-items: center; padding: 12px; margin: 8px 0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#f5f5f5'" onmouseout="this.style.backgroundColor='white'">
                    <input type="radio" name="moveDestination" value="${idx}" style="margin-right: 12px; width: 18px; height: 18px;">
                    <span style="flex: 1;">
                        <strong style="color: #333;">${primaryName}</strong>
                        <span style="color: #666; margin-left: 10px;">(${scorePercent}% match)</span>
                    </span>
                </label>
            `;
        });

        popup.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: #333;">Move Alias: "${term}"</h3>
            <p style="margin: 0 0 5px 0; color: #666; font-size: 13px;">From: ${category}</p>
            <p style="margin: 0 0 20px 0; color: #666;">Select destination for this alias:</p>

            <div style="max-height: 300px; overflow-y: auto; margin-bottom: 15px;">
                ${matchOptionsHtml}

                <label style="display: flex; align-items: center; padding: 12px; margin: 8px 0; border: 2px dashed #4caf50; border-radius: 4px; cursor: pointer; background-color: #f9fff9;" onmouseover="this.style.backgroundColor='#f0fff0'" onmouseout="this.style.backgroundColor='#f9fff9'">
                    <input type="radio" name="moveDestination" value="createNew" style="margin-right: 12px; width: 18px; height: 18px;">
                    <span style="flex: 1; color: #4caf50; font-weight: 600;">
                        None of the above — create new IndividualName
                    </span>
                </label>
            </div>

            <div style="display: flex; gap: 15px; justify-content: flex-end; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
                <button id="moveAliasCancel" style="padding: 10px 20px; font-size: 14px; background-color: #ccc; color: #333; border: none; border-radius: 4px; cursor: pointer;">
                    Cancel
                </button>
                <button id="moveAliasOk" style="padding: 10px 20px; font-size: 14px; font-weight: 600; background-color: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Move Alias
                </button>
            </div>
        `;

        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        // Wire up cancel button
        document.getElementById('moveAliasCancel').addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve({ action: 'cancel' });
        });

        // Wire up OK button
        document.getElementById('moveAliasOk').addEventListener('click', () => {
            const selected = popup.querySelector('input[name="moveDestination"]:checked');
            if (!selected) {
                alert('Please select a destination');
                return;
            }

            document.body.removeChild(overlay);

            if (selected.value === 'createNew') {
                resolve({ action: 'createNew' });
            } else {
                const matchIdx = parseInt(selected.value);
                const match = matches[matchIdx];
                resolve({
                    action: 'move',
                    destination: match.key,
                    destinationObject: match.object
                });
            }
        });

        // Allow clicking overlay to cancel
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
                resolve({ action: 'cancel' });
            }
        });
    });
}

/**
 * Check if destination IndividualName already has the alias term.
 * @param {IndividualName} destObj - The destination object
 * @param {string} aliasTerm - The alias term to check
 * @returns {boolean} True if destination already has this alias
 */
function destinationHasAlias(destObj, aliasTerm) {
    const normalized = aliasTerm.toUpperCase().trim();

    // Check primary
    if ((destObj.primaryAlias?.term || '').toUpperCase().trim() === normalized) return true;

    // Check all alternative categories
    for (const cat of ['homonyms', 'synonyms', 'candidates']) {
        for (const a of (destObj.alternatives?.[cat] || [])) {
            if ((a.term || '').toUpperCase().trim() === normalized) return true;
        }
    }
    return false;
}

/**
 * Ensure VisionAppraisalNameParser and its dependencies are loaded.
 * Loads scripts dynamically if not already available.
 * @returns {Promise<void>}
 */
async function ensureNameParserLoaded() {
    if (typeof VisionAppraisalNameParser !== 'undefined') {
        return; // Already loaded
    }

    // Load Case31Validator first (dependency)
    if (typeof Case31Validator === 'undefined') {
        await new Promise((resolve, reject) => {
            const s1 = document.createElement('script');
            s1.src = 'scripts/validation/case31Validator.js';
            s1.onload = resolve;
            s1.onerror = () => reject(new Error('Failed to load Case31Validator'));
            document.head.appendChild(s1);
        });
    }

    // Load VisionAppraisalNameParser
    await new Promise((resolve, reject) => {
        const s2 = document.createElement('script');
        s2.src = 'scripts/dataSources/visionAppraisalNameParser.js';
        s2.onload = resolve;
        s2.onerror = () => reject(new Error('Failed to load VisionAppraisalNameParser'));
        document.head.appendChild(s2);
    });
}

/**
 * Create a new IndividualName with the alias as its primary.
 * Uses VisionAppraisalNameParser to parse name components from alias term.
 * @param {AttributedTerm} aliasToMove - The alias to become the primary (preserves AttributedTerm properties)
 * @param {IndividualName} sourceIndividualName - Not used, kept for API compatibility
 * @returns {Promise<IndividualName>} New IndividualName with alias as primary and parsed name components
 */
async function createNewIndividualNameFromAlias(aliasToMove, sourceIndividualName) {
    // Ensure parser is loaded
    await ensureNameParserLoaded();

    // Create mock record for parsing
    const mockRecord = {
        ownerName: aliasToMove.term,
        pid: 'MOVE_ALIAS_TEMP',
        propertyLocation: '',
        ownerAddress: '',
        mblu: '',
        fireNumber: ''
    };

    // Parse through VisionAppraisalNameParser to get name components
    const parsedEntity = VisionAppraisalNameParser.parseRecordToEntity(mockRecord, 0);
    const parsedName = parsedEntity?.name?.identifier || parsedEntity?.name;

    // Extract parsed components (fallback to empty string if parsing failed)
    const firstName = parsedName?.firstName || '';
    const otherNames = parsedName?.otherNames || '';
    const lastName = parsedName?.lastName || '';

    // Create new IndividualName with parsed components + original alias
    const newIndividualName = new IndividualName(
        aliasToMove,  // Original AttributedTerm (preserves sourceMap, fieldName, etc.)
        '',           // title
        firstName,
        otherNames,
        lastName,
        ''            // suffix
    );

    // Ensure alternatives is initialized
    if (!newIndividualName.alternatives) {
        newIndividualName.alternatives = new Aliases();
    }

    return newIndividualName;
}

/**
 * Show popup to ask user which bulk file source to load from.
 * @returns {Promise<string|null>} 'original', 'dev', or null if cancelled
 */
function showBulkSourcePopup() {
    return new Promise((resolve) => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;';

        // Create popup
        const popup = document.createElement('div');
        popup.style.cssText = 'background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); max-width: 400px; text-align: center;';

        popup.innerHTML = `
            <h3 style="margin: 0 0 20px 0; color: #333;">Select Bulk File Source</h3>
            <p style="margin: 0 0 25px 0; color: #666;">Which bulk file do you want to load?</p>
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button id="popupOriginalBtn" style="padding: 12px 24px; font-size: 14px; font-weight: 600; background-color: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Original
                </button>
                <button id="popupDevBtn" style="padding: 12px 24px; font-size: 14px; font-weight: 600; background-color: #ff9800; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    DEV (Reconstructed)
                </button>
            </div>
            <button id="popupCancelBtn" style="margin-top: 20px; padding: 8px 16px; font-size: 12px; background-color: #ccc; color: #333; border: none; border-radius: 4px; cursor: pointer;">
                Cancel
            </button>
        `;

        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        // Wire up buttons
        document.getElementById('popupOriginalBtn').addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve('original');
        });

        document.getElementById('popupDevBtn').addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve('dev');
        });

        document.getElementById('popupCancelBtn').addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve(null);
        });

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
                resolve(null);
            }
        });
    });
}

/**
 * Show popup reporting mismatch between Google Drive file and bulk file.
 * User dismisses with OK button.
 * @param {Object} comparison - Result from compareIndividualNameObjects()
 * @param {string} primaryKey - The primary key being compared
 */
function showMismatchPopup(comparison, primaryKey) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;';

    // Create popup
    const popup = document.createElement('div');
    popup.style.cssText = 'background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); max-width: 500px; text-align: left;';

    let html = `<h3 style="margin: 0 0 15px 0; color: #f44336;">⚠️ Mismatch Detected</h3>`;
    html += `<p style="margin: 0 0 15px 0; color: #333;"><strong>Key:</strong> ${escapeHtmlForIndividualNameBrowser(primaryKey)}</p>`;

    // Primary alias mismatch
    if (comparison.primaryMismatch) {
        html += `<div style="margin-bottom: 10px; padding: 10px; background: #fff3e0; border-radius: 4px;">`;
        html += `<strong>Primary Alias Differs:</strong><br>`;
        html += `&nbsp;&nbsp;Google Drive: "${escapeHtmlForIndividualNameBrowser(comparison.primary1)}"<br>`;
        html += `&nbsp;&nbsp;Bulk File: "${escapeHtmlForIndividualNameBrowser(comparison.primary2)}"`;
        html += `</div>`;
    }

    // Aliases in Drive but not Bulk
    if (comparison.inFirstNotSecond.length > 0) {
        html += `<div style="margin-bottom: 10px; padding: 10px; background: #e8f5e9; border-radius: 4px;">`;
        html += `<strong>In Google Drive but not Bulk (${comparison.inFirstNotSecond.length}):</strong><br>`;
        comparison.inFirstNotSecond.forEach(term => {
            html += `&nbsp;&nbsp;• ${escapeHtmlForIndividualNameBrowser(term)}<br>`;
        });
        html += `</div>`;
    }

    // Aliases in Bulk but not Drive
    if (comparison.inSecondNotFirst.length > 0) {
        html += `<div style="margin-bottom: 10px; padding: 10px; background: #ffebee; border-radius: 4px;">`;
        html += `<strong>In Bulk but not Google Drive (${comparison.inSecondNotFirst.length}):</strong><br>`;
        comparison.inSecondNotFirst.forEach(term => {
            html += `&nbsp;&nbsp;• ${escapeHtmlForIndividualNameBrowser(term)}<br>`;
        });
        html += `</div>`;
    }

    // Alias counts
    html += `<p style="margin: 15px 0 20px 0; color: #666; font-size: 12px;">`;
    html += `Total aliases - Google Drive: ${comparison.aliasCount1}, Bulk: ${comparison.aliasCount2}`;
    html += `</p>`;

    html += `<div style="text-align: center;">`;
    html += `<button id="mismatchOkBtn" style="padding: 10px 30px; font-size: 14px; font-weight: 600; background-color: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer;">OK</button>`;
    html += `</div>`;

    popup.innerHTML = html;
    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    // Wire up OK button
    document.getElementById('mismatchOkBtn').addEventListener('click', () => {
        document.body.removeChild(overlay);
    });
}

/**
 * Repopulate the browser window from the bulk database.
 *
 * PURPOSE: This function does three things:
 *   1. If bulk database is not in memory, load it from Google Drive
 *   2. If index file is not in memory, load it from Google Drive
 *   3. Populate the browser window with the database contents
 *
 * This function does NOT:
 *   - Modify the index file on Google Drive
 *   - Modify localStorage progress
 *   - Trigger any file-out operations
 *   - Affect any other processes
 *
 * VARIABLES AFFECTED:
 *   - individualNameBrowser.loadedDatabase (browser-local reference)
 *   - individualNameBrowser.loadedIndex (browser-local index cache)
 *   - individualNameBrowser.bulkSource (tracks which file was loaded)
 *   - window.individualNameDatabase (only if not already loaded)
 *
 * @param {string} source - Which bulk file to load: 'original' or 'dev'
 */
async function repopulateWindowFromBulk(source) {
    const btn = document.getElementById('individualNameLoadBtn');
    const originalText = btn ? btn.innerHTML : '';

    try {
        if (btn) {
            btn.innerHTML = 'Loading...';
            btn.disabled = true;
        }

        // === LOAD BULK DATABASE ===
        // Determine which file to load based on source parameter
        const bulkFileId = (source === 'dev') ? BULK_FILE_ID_DEV : BULK_FILE_ID_ORIGINAL;
        const sourceLabel = (source === 'dev') ? 'DEV (Reconstructed)' : 'Original';

        console.log(`[RepopulateWindow] Loading ${sourceLabel} bulk file from Google Drive...`);
        showIndividualNameBrowserStatus(`Loading ${sourceLabel} bulk database from Google Drive...`, 'loading');

        const response = await gapi.client.drive.files.get({
            fileId: bulkFileId,
            alt: 'media'
        });

        const bulkData = JSON.parse(response.body);

        if (bulkData.__format !== 'IndividualNameDatabaseBulk') {
            throw new Error(`Invalid bulk file format: ${bulkData.__format}`);
        }

        console.log(`[RepopulateWindow] ${sourceLabel} bulk file contains ${bulkData.__count} entries`);

        if (!window.individualNameDatabase) {
            window.individualNameDatabase = new IndividualNameDatabase();
        }

        window.individualNameDatabase.entries.clear();

        for (const [primaryKey, entryData] of Object.entries(bulkData.entries)) {
            const object = deserializeWithTypes(entryData.object);
            window.individualNameDatabase.entries.set(primaryKey, {
                object: object,
                fileId: null,
                created: entryData.created,
                lastModified: entryData.lastModified
            });
        }

        window.individualNameDatabase._buildVariationCache();
        window.individualNameDatabase._isLoaded = true;

        // Track which source was loaded
        individualNameBrowser.bulkSource = source;

        console.log(`[RepopulateWindow] Loaded ${window.individualNameDatabase.entries.size} entries from ${sourceLabel} bulk file`);

        // === LOAD INDEX FILE ===
        const indexAlreadyInMemory = individualNameBrowser.loadedIndex &&
                                     Object.keys(individualNameBrowser.loadedIndex).length > 0;

        if (indexAlreadyInMemory) {
            console.log('[RepopulateWindow] Index already in memory');
        } else {
            console.log('[RepopulateWindow] Loading index file from Google Drive...');
            showIndividualNameBrowserStatus('Loading index file from Google Drive...', 'loading');

            const INDEX_FILE_ID = '1IcC5MiDfw23kmNFlriaaFYY9mtDoqxSC';
            try {
                const indexResponse = await gapi.client.drive.files.get({
                    fileId: INDEX_FILE_ID,
                    alt: 'media'
                });

                const indexData = JSON.parse(indexResponse.body);
                individualNameBrowser.loadedIndex = indexData.entries || {};

                console.log(`[RepopulateWindow] Loaded index with ${Object.keys(individualNameBrowser.loadedIndex).length} entries`);
            } catch (indexError) {
                console.warn('[RepopulateWindow] Could not load index file:', indexError.message);
                individualNameBrowser.loadedIndex = {};
            }
        }

        // === UPDATE BROWSER STATE ===
        individualNameBrowser.loadedDatabase = window.individualNameDatabase;

        // === CONFIGURE DATABASE FOR GOOGLE DRIVE OPERATIONS ===
        // Read folder IDs from UI inputs and configure the database
        const folderId = document.getElementById('individualNameFolderId')?.value?.trim() || '1XdIipdWlRy7VKlOJiCt_G706JWqZZY4m';
        const indexFileId = '1IcC5MiDfw23kmNFlriaaFYY9mtDoqxSC';

        window.individualNameDatabase.folderFileId = folderId;
        window.individualNameDatabase.databaseFileId = indexFileId;
        console.log(`[RepopulateWindow] Configured database: folderFileId=${folderId}, databaseFileId=${indexFileId}`);

        // Get counts for status message
        const bulkCount = window.individualNameDatabase.entries.size;
        const indexCount = Object.keys(individualNameBrowser.loadedIndex).length;
        const variationCount = window.individualNameDatabase._variationCache ?
            window.individualNameDatabase._variationCache.size : 'unknown';

        // Populate the browser window
        displayAllIndividualNames();

        const sourceIndicator = (source === 'dev') ? '[DEV]' : '[Original]';
        const statusMsg = `${sourceIndicator} Loaded: ${bulkCount} names, ${indexCount} indexed (${variationCount} variations)`;
        showIndividualNameBrowserStatus(statusMsg, 'success');

    } catch (error) {
        console.error('[RepopulateWindow] Error:', error);
        showIndividualNameBrowserStatus(`Error: ${error.message}`, 'error');
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}

// Wire button to this function - checks guard first, then shows popup to select source
async function loadIndividualNameBrowserDatabase() {
    // Check guard BEFORE showing popup
    if (!requireConsistencyCheck('load database')) return;

    const source = await showBulkSourcePopup();
    if (source) {
        return repopulateWindowFromBulk(source);
    }
    // User cancelled - do nothing
}

// =============================================================================
// SEARCH & FILTERING
// =============================================================================

function performIndividualNameBrowserSearch() {
    const query = document.getElementById('individualNameSearchInput')?.value?.trim()?.toUpperCase();
    individualNameBrowser.searchQuery = query || '';

    if (!query) {
        displayAllIndividualNames();
        return;
    }

    if (!ensureIndividualNameBrowserDatabaseSynced()) {
        showIndividualNameBrowserStatus('Please load the database first', 'error');
        return;
    }

    // Filter names matching query
    const results = individualNameBrowser.loadedDatabase.getAllObjects().filter(name => {
        // Check primary
        if (name.primaryAlias?.term?.toUpperCase().includes(query)) return true;

        // Check name components
        if (name.firstName?.toUpperCase().includes(query)) return true;
        if (name.lastName?.toUpperCase().includes(query)) return true;
        if (name.otherNames?.toUpperCase().includes(query)) return true;

        // Check all alternatives
        const allTerms = name.getAllTermValues ? name.getAllTermValues() : [];
        return allTerms.some(term => term.toUpperCase().includes(query));
    });

    individualNameBrowser.currentResults = results;
    displayIndividualNameBrowserResults(results);
    updateIndividualNameBrowserResultsCount(`Found ${results.length} names matching "${query}"`);
}

function clearIndividualNameBrowserSearch() {
    const searchInput = document.getElementById('individualNameSearchInput');
    if (searchInput) searchInput.value = '';

    individualNameBrowser.searchQuery = '';
    individualNameBrowser.selectedIndividualName = null;
    individualNameBrowser.selectedIndex = -1;

    displayAllIndividualNames();
    clearIndividualNameBrowserDetails();
}

/**
 * HELPER: Sort individual names by total alias count (descending)
 * Names with more aliases appear first.
 * @param {Array} names - Array of IndividualName objects to sort IN PLACE
 * @returns {Array} The same array, sorted
 */
function sortIndividualNamesByAliasCount(names) {
    const getAliasCount = (name) => {
        const h = name.alternatives?.homonyms?.length || 0;
        const s = name.alternatives?.synonyms?.length || 0;
        const c = name.alternatives?.candidates?.length || 0;
        return h + s + c;
    };
    names.sort((a, b) => getAliasCount(b) - getAliasCount(a));
    return names;
}

function displayAllIndividualNames() {
    if (!ensureIndividualNameBrowserDatabaseSynced()) return;

    // DIAGNOSTIC: What database are we using?
    console.log('[DIAG displayAllIndividualNames] loadedDatabase.objectType:', individualNameBrowser.loadedDatabase?.objectType);
    console.log('[DIAG displayAllIndividualNames] loadedDatabase.constructor.name:', individualNameBrowser.loadedDatabase?.constructor?.name);

    const allNames = individualNameBrowser.loadedDatabase.getAllObjects();

    // DIAGNOSTIC: What type of objects are we getting?
    if (allNames.length > 0) {
        console.log('[DIAG displayAllIndividualNames] First object type:', allNames[0]?.constructor?.name);
        console.log('[DIAG displayAllIndividualNames] First object primaryAlias:', allNames[0]?.primaryAlias?.term);
    }
    console.log('[DIAG displayAllIndividualNames] Total objects:', allNames.length);

    // Sort by total alias count (descending)
    sortIndividualNamesByAliasCount(allNames);

    individualNameBrowser.currentResults = allNames;
    displayIndividualNameBrowserResults(allNames);
    updateIndividualNameBrowserResultsCount(`Showing all ${allNames.length} names (sorted by alias count)`);
}

// =============================================================================
// DISPLAY FUNCTIONS
// =============================================================================

function displayIndividualNameBrowserResults(names) {
    const resultsList = document.getElementById('individualNameResultsList');
    if (!resultsList) return;

    if (names.length === 0) {
        resultsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No names match current search</div>';
        return;
    }

    const html = names.map((name, index) => {
        const primary = name.primaryAlias?.term || 'Unknown';
        const homonymCount = name.alternatives?.homonyms?.length || 0;
        const synonymCount = name.alternatives?.synonyms?.length || 0;
        const candidateCount = name.alternatives?.candidates?.length || 0;
        const totalAliases = homonymCount + synonymCount + candidateCount;

        // Format name components for display
        const lastName = name.lastName || '';
        const firstName = name.firstName || '';
        const componentDisplay = lastName && firstName ? `${lastName}, ${firstName}` : (lastName || firstName || '');

        let badges = '';
        if (homonymCount > 0) badges += '<span class="individualname-alias-badge individualname-alias-homonym">' + homonymCount + ' H</span>';
        if (synonymCount > 0) badges += '<span class="individualname-alias-badge individualname-alias-synonym">' + synonymCount + ' S</span>';
        if (candidateCount > 0) badges += '<span class="individualname-alias-badge individualname-alias-candidate">' + candidateCount + ' C</span>';

        return '<div class="individualname-result-item" onclick="selectIndividualNameBrowserItem(' + index + ', this)">' +
            '<div class="individualname-primary">' + escapeHtmlForIndividualNameBrowser(primary) + '</div>' +
            (componentDisplay ? '<div class="individualname-components">' + escapeHtmlForIndividualNameBrowser(componentDisplay) + '</div>' : '') +
            '<div style="margin-top: 4px;">' +
                badges +
                (totalAliases > 0 ? '<span class="individualname-alias-count">' + totalAliases + ' alias' + (totalAliases !== 1 ? 'es' : '') + '</span>' : '') +
            '</div>' +
        '</div>';
    }).join('');

    resultsList.innerHTML = html;
}

/**
 * Load an individual IndividualName file from Google Drive by fileId
 * @param {string} fileId - The Google Drive file ID
 * @returns {Promise<IndividualName|null>} The deserialized IndividualName object, or null on error
 */
async function loadIndividualFileFromDrive(fileId) {
    try {
        console.log(`[loadIndividualFileFromDrive] Loading fileId: ${fileId}`);

        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });

        // deserializeWithTypes expects a JSON string (it does its own JSON.parse)
        const individualName = deserializeWithTypes(response.body);

        console.log(`[loadIndividualFileFromDrive] Loaded: ${individualName.primaryAlias?.term || 'unknown'}`);
        return individualName;

    } catch (error) {
        console.error(`[loadIndividualFileFromDrive] Error loading fileId ${fileId}:`, error);
        return null;
    }
}

/**
 * HELPER: Get database entry with fileId injection
 * Handles the common pattern of looking up a database entry by primaryKey,
 * trying uppercase fallback, and injecting the fileId from selection.
 * @param {string} primaryKey - The primary alias term to look up
 * @returns {{dbEntry: Object, resolvedKey: string}|null} Object with dbEntry and the key that was found, or null
 */
function getDbEntryWithFileId(primaryKey) {
    if (!primaryKey || !individualNameBrowser.loadedDatabase) {
        return null;
    }

    // Try exact key first
    let dbEntry = individualNameBrowser.loadedDatabase.entries.get(primaryKey);
    let resolvedKey = primaryKey;

    // Try uppercase if exact key not found (handles case mismatch)
    if (!dbEntry) {
        dbEntry = individualNameBrowser.loadedDatabase.entries.get(primaryKey.toUpperCase());
        resolvedKey = primaryKey.toUpperCase();
    }

    if (!dbEntry) {
        console.warn(`[getDbEntryWithFileId] Could not find database entry for "${primaryKey}"`);
        return null;
    }

    // Inject fileId from index if needed (look up in loadedIndex, not bulk file ID)
    if (!dbEntry.fileId && individualNameBrowser.loadedIndex) {
        const indexEntry = individualNameBrowser.loadedIndex[primaryKey] ||
                           individualNameBrowser.loadedIndex[primaryKey.toUpperCase()] ||
                           individualNameBrowser.loadedIndex[resolvedKey];
        if (indexEntry && indexEntry.fileId) {
            dbEntry.fileId = indexEntry.fileId;
            console.log(`[getDbEntryWithFileId] Injected fileId ${dbEntry.fileId} from index for key "${resolvedKey}"`);
        }
    }

    return { dbEntry, resolvedKey };
}

/**
 * HELPER: Load an IndividualName fresh from Google Drive and sync to db.entries
 * Follows the pattern: look up fileId from index → load from Google Drive → update db.entries
 *
 * In DRY RUN mode (MOVE_ALIAS_DRY_RUN = true):
 *   - Loads from Google Drive and compares to bulk version
 *   - Logs differences but does NOT update db.entries
 *
 * In LIVE mode:
 *   - Updates db.entries.object with the fresh Google Drive version
 *
 * @param {string} primaryKey - The primary alias term to look up
 * @returns {Promise<{dbEntry: Object, resolvedKey: string, freshObject: IndividualName}|null>}
 */
async function loadFreshAndSyncDbEntry(primaryKey) {
    // Step 1: Get the db entry and fileId
    const result = getDbEntryWithFileId(primaryKey);
    if (!result) {
        console.error(`[loadFreshAndSyncDbEntry] Could not find entry for "${primaryKey}"`);
        return null;
    }

    const { dbEntry, resolvedKey } = result;

    // Step 2: Verify we have a fileId
    if (!dbEntry.fileId) {
        console.error(`[loadFreshAndSyncDbEntry] No fileId found for "${resolvedKey}"`);
        return null;
    }

    // Step 3: Load fresh from Google Drive
    console.log(`[loadFreshAndSyncDbEntry] Loading "${resolvedKey}" from Google Drive (fileId: ${dbEntry.fileId})`);
    const freshObject = await loadIndividualFileFromDrive(dbEntry.fileId);

    if (!freshObject) {
        console.error(`[loadFreshAndSyncDbEntry] Failed to load from Google Drive for "${resolvedKey}"`);
        return null;
    }

    // Step 4: Compare bulk version vs Google Drive version (always log in dry run, brief log otherwise)
    const bulkObject = dbEntry.object;
    const bulkAliasCount = 1 +
        (bulkObject.alternatives?.homonyms?.length || 0) +
        (bulkObject.alternatives?.synonyms?.length || 0) +
        (bulkObject.alternatives?.candidates?.length || 0);
    const freshAliasCount = 1 +
        (freshObject.alternatives?.homonyms?.length || 0) +
        (freshObject.alternatives?.synonyms?.length || 0) +
        (freshObject.alternatives?.candidates?.length || 0);

    if (MOVE_ALIAS_DRY_RUN) {
        console.log(`[DRY RUN] loadFreshAndSyncDbEntry comparison for "${resolvedKey}":`);
        console.log(`  Bulk primary: "${bulkObject.primaryAlias?.term}"`);
        console.log(`  Drive primary: "${freshObject.primaryAlias?.term}"`);
        console.log(`  Bulk alias count: ${bulkAliasCount}`);
        console.log(`  Drive alias count: ${freshAliasCount}`);

        if (bulkAliasCount !== freshAliasCount) {
            console.log(`  ⚠️ DIFFERENCE DETECTED: alias counts don't match`);
        }

        // In dry run, return the fresh object but do NOT update db.entries
        console.log(`  [DRY RUN] Would update db.entries["${resolvedKey}"].object with Drive version`);
        return { dbEntry, resolvedKey, freshObject };
    }

    // Step 5: LIVE MODE - Update db.entries with fresh object
    console.log(`[loadFreshAndSyncDbEntry] Syncing db.entries["${resolvedKey}"] with Google Drive version`);
    dbEntry.object = freshObject;

    return { dbEntry, resolvedKey, freshObject };
}

async function selectIndividualNameBrowserItem(index, element) {
    if (!requireConsistencyCheck('select item')) return;

    // Remove selection from all items
    const items = document.querySelectorAll('.individualname-result-item');
    items.forEach(item => item.classList.remove('individualname-selected'));

    // Add selection to clicked item
    if (element) element.classList.add('individualname-selected');

    individualNameBrowser.selectedIndex = index;

    // Get the item from bulk-loaded results
    const selectedFromBulk = individualNameBrowser.currentResults[index];
    const primaryKey = selectedFromBulk.primaryAlias?.term;

    // Try to load from individual Drive file via index
    // Check multiple key formats (exact, uppercase, normalized) due to potential mismatch
    // Index keys may be normalized since Google Drive filenames can't contain / \ < > : " | ? *
    let loadedFromDrive = null;
    let indexEntry = individualNameBrowser.loadedIndex?.[primaryKey];
    if (!indexEntry && primaryKey) {
        // Try uppercase version
        indexEntry = individualNameBrowser.loadedIndex?.[primaryKey.toUpperCase()];
    }
    if (!indexEntry && primaryKey && window.normalizeForGoogleDrive) {
        // Try normalized version (inline normalization at point of lookup)
        indexEntry = individualNameBrowser.loadedIndex?.[window.normalizeForGoogleDrive(primaryKey)];
    }

    if (indexEntry?.fileId) {
        // Show loading indicator in details panel
        const detailsContent = document.getElementById('individualNameDetailsContent');
        if (detailsContent) {
            detailsContent.innerHTML = '<div style="padding: 20px; color: #666;">Loading from Google Drive...</div>';
        }

        loadedFromDrive = await loadIndividualFileFromDrive(indexEntry.fileId);

        if (loadedFromDrive) {
            console.log(`[selectIndividualNameBrowserItem] Loaded "${primaryKey}" from Drive (fileId: ${indexEntry.fileId})`);
            individualNameBrowser.loadedFromDrive = loadedFromDrive;
            individualNameBrowser.loadedFromDriveFileId = indexEntry.fileId;
            individualNameBrowser.selectedIndividualName = loadedFromDrive;

            // Compare Google Drive version against bulk version and show popup if mismatch
            if (window.compareIndividualNameObjects && selectedFromBulk) {
                const comparison = window.compareIndividualNameObjects(
                    loadedFromDrive,
                    selectedFromBulk,
                    'Google Drive',
                    'Bulk File'
                );
                if (!comparison.identical) {
                    console.warn(`[selectIndividualNameBrowserItem] Mismatch detected for "${primaryKey}":`, comparison);
                    showMismatchPopup(comparison, primaryKey);
                }
            }
        } else {
            console.warn(`[selectIndividualNameBrowserItem] Failed to load from Drive, using bulk version`);
            individualNameBrowser.loadedFromDrive = null;
            individualNameBrowser.loadedFromDriveFileId = null;
            individualNameBrowser.selectedIndividualName = selectedFromBulk;
        }
    } else {
        // No index entry - use bulk version
        console.log(`[selectIndividualNameBrowserItem] No index entry for "${primaryKey}", using bulk version`);
        individualNameBrowser.loadedFromDrive = null;
        individualNameBrowser.loadedFromDriveFileId = null;
        individualNameBrowser.selectedIndividualName = selectedFromBulk;
    }

    // Update details panel
    displayIndividualNameBrowserDetails(individualNameBrowser.selectedIndividualName);

    // Clear and re-run test if there's input
    const testInput = document.getElementById('individualNameTestInput');
    if (testInput && testInput.value.trim()) {
        performIndividualNameCompareToTest();
    } else {
        clearIndividualNameTestResult();
    }
}

function displayIndividualNameBrowserDetails(individualName) {
    const detailsContent = document.getElementById('individualNameDetailsContent');
    if (!detailsContent || !individualName) return;

    const primary = individualName.primaryAlias?.term || 'Unknown';
    const firstName = individualName.firstName || '';
    const lastName = individualName.lastName || '';
    const otherNames = individualName.otherNames || '';
    const homonyms = individualName.alternatives?.homonyms || [];
    const synonyms = individualName.alternatives?.synonyms || [];
    const candidates = individualName.alternatives?.candidates || [];

    // Build list of all alternatives for the "Change Primary" dropdown
    const allAlternatives = [
        ...homonyms.map(h => ({ term: h.term, category: 'homonyms' })),
        ...synonyms.map(s => ({ term: s.term, category: 'synonyms' })),
        ...candidates.map(c => ({ term: c.term, category: 'candidates' }))
    ];

    let html = '<div style="font-size: 18px; font-weight: bold; color: #1565c0; margin-bottom: 10px;">' + escapeHtmlForIndividualNameBrowser(primary) + '</div>';

    // Display name components
    html += '<div style="background: #e3f2fd; padding: 10px; border-radius: 4px; margin-bottom: 10px;">';
    html += '<table style="width: 100%; font-size: 13px;">';
    html += '<tr><td style="font-weight: bold; width: 100px;">First Name:</td><td>' + escapeHtmlForIndividualNameBrowser(firstName || '(none)') + '</td></tr>';
    html += '<tr><td style="font-weight: bold;">Last Name:</td><td>' + escapeHtmlForIndividualNameBrowser(lastName || '(none)') + '</td></tr>';
    if (otherNames) {
        html += '<tr><td style="font-weight: bold;">Other Names:</td><td>' + escapeHtmlForIndividualNameBrowser(otherNames) + '</td></tr>';
    }
    html += '</table>';
    html += '</div>';

    // Add "Change Primary Alias" UI if there are alternatives
    if (allAlternatives.length > 0) {
        html += '<div style="margin-bottom: 15px; padding: 10px; background: #e8f5e9; border-radius: 4px;">';
        html += '<label style="font-size: 12px; color: #2e7d32; font-weight: bold;">Change Primary Alias:</label><br>';
        html += '<select id="individualNameChangePrimarySelect" style="margin-top: 5px; padding: 4px; width: 70%;">';
        html += '<option value="">-- Select new primary --</option>';
        for (const alt of allAlternatives) {
            html += '<option value="' + escapeHtmlForIndividualNameBrowser(alt.term) + '">' + escapeHtmlForIndividualNameBrowser(alt.term) + ' (' + alt.category.slice(0, -1) + ')</option>';
        }
        html += '</select>';
        html += '<button onclick="changeIndividualNamePrimaryAlias()" style="margin-left: 5px; padding: 4px 10px; background: #4caf50; color: white; border: none; border-radius: 3px; cursor: pointer;">Change</button>';
        html += '</div>';
    }

    if (homonyms.length > 0) {
        html += '<div style="margin-top: 10px;"><strong style="color: #2e7d32;">Homonyms (' + homonyms.length + '):</strong></div>';
        html += '<ul style="margin: 5px 0; padding-left: 20px;">';
        for (const h of homonyms) {
            const escapedTerm = escapeHtmlForIndividualNameBrowser(h.term);
            html += '<li style="font-size: 13px;">' +
                    '<span onclick="deleteIndividualNameAlias(\'' + escapedTerm.replace(/'/g, "\\'") + '\', \'homonyms\')" ' +
                    'style="color: #d32f2f; cursor: pointer; margin-right: 5px; font-weight: bold;" title="Delete this alias">[X]</span>' +
                    escapedTerm + '</li>';
        }
        html += '</ul>';
    }

    if (synonyms.length > 0) {
        html += '<div style="margin-top: 10px;"><strong style="color: #f57f17;">Synonyms (' + synonyms.length + '):</strong></div>';
        html += '<ul style="margin: 5px 0; padding-left: 20px;">';
        for (const s of synonyms) {
            const escapedTerm = escapeHtmlForIndividualNameBrowser(s.term);
            html += '<li style="font-size: 13px;">' +
                    '<span onclick="deleteIndividualNameAlias(\'' + escapedTerm.replace(/'/g, "\\'") + '\', \'synonyms\')" ' +
                    'style="color: #d32f2f; cursor: pointer; margin-right: 5px; font-weight: bold;" title="Delete this alias">[X]</span>' +
                    escapedTerm + '</li>';
        }
        html += '</ul>';
    }

    if (candidates.length > 0) {
        html += '<div style="margin-top: 10px;"><strong style="color: #7b1fa2;">Candidates (' + candidates.length + '):</strong></div>';
        html += '<ul style="margin: 5px 0; padding-left: 20px;">';
        for (const c of candidates) {
            const escapedTerm = escapeHtmlForIndividualNameBrowser(c.term);
            html += '<li style="font-size: 13px;">' +
                    '<span onclick="deleteIndividualNameAlias(\'' + escapedTerm.replace(/'/g, "\\'") + '\', \'candidates\')" ' +
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

function clearIndividualNameBrowserDetails() {
    const detailsContent = document.getElementById('individualNameDetailsContent');
    if (detailsContent) {
        detailsContent.innerHTML = 'Select a name from the list to view details';
    }
}

// =============================================================================
// COMPARETO TESTING
// =============================================================================

function performIndividualNameCompareToTest() {
    const testInput = document.getElementById('individualNameTestInput');
    const resultDiv = document.getElementById('individualNameTestResult');

    if (!testInput || !resultDiv) return;

    const testString = testInput.value.trim();
    if (!testString) {
        resultDiv.innerHTML = 'Enter a name and press Enter or click Test to see compareTo() results';
        return;
    }

    if (!individualNameBrowser.selectedIndividualName) {
        resultDiv.innerHTML = '<span style="color: #d32f2f;">Please select a name first</span>';
        return;
    }

    // Call compareTo on selected individual name
    // IndividualName.compareTo returns a single numeric score (0-1)
    let score;
    try {
        score = individualNameBrowser.selectedIndividualName.compareTo(testString);
    } catch (e) {
        resultDiv.innerHTML = '<span style="color: #d32f2f;">Error calling compareTo: ' + escapeHtmlForIndividualNameBrowser(e.message) + '</span>';
        return;
    }

    const formatScore = (s) => {
        if (s === -1 || s === undefined || s === null) return '<span style="color: #999;">N/A</span>';
        const color = s >= 0.9 ? '#2e7d32' : s >= 0.8 ? '#f57f17' : '#d32f2f';
        return '<span style="color: ' + color + '; font-weight: bold;">' + s.toFixed(3) + '</span>';
    };

    // Get threshold info
    let thresholdInfo = '';
    if (typeof MATCH_CRITERIA !== 'undefined') {
        const trueMatchThreshold = MATCH_CRITERIA.trueMatch?.nameAlone || 'N/A';
        const nearMatchThreshold = MATCH_CRITERIA.nearMatch?.nameAlone || 'N/A';

        let verdict = '';
        if (score >= trueMatchThreshold) {
            verdict = '<span style="color: #2e7d32; font-weight: bold;">TRUE MATCH</span>';
        } else if (score >= nearMatchThreshold) {
            verdict = '<span style="color: #f57f17; font-weight: bold;">NEAR MATCH</span>';
        } else {
            verdict = '<span style="color: #d32f2f; font-weight: bold;">NO MATCH</span>';
        }

        thresholdInfo = '<div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #ddd;">' +
            '<strong>Verdict:</strong> ' + verdict + '<br>' +
            '<span style="font-size: 11px; color: #666;">(trueMatch: ' + trueMatchThreshold + ', nearMatch: ' + nearMatchThreshold + ')</span>' +
            '</div>';
    }

    resultDiv.innerHTML =
        '<div style="margin-bottom: 8px;"><strong>Testing:</strong> "' + escapeHtmlForIndividualNameBrowser(testString) + '"</div>' +
        '<div style="font-size: 16px; margin: 10px 0;"><strong>Similarity Score:</strong> ' + formatScore(score) + '</div>' +
        thresholdInfo;
}

function clearIndividualNameTestResult() {
    const resultDiv = document.getElementById('individualNameTestResult');
    if (resultDiv) {
        resultDiv.innerHTML = 'Enter a name and press Enter or click Test to see compareTo() results';
    }
}

// =============================================================================
// ALIAS MANAGEMENT
// =============================================================================

async function addAliasToSelectedIndividualName() {
    if (!requireConsistencyCheck('add alias')) return;

    if (!individualNameBrowser.selectedIndividualName) {
        showIndividualNameBrowserStatus('Please select a name first', 'error');
        return;
    }

    const aliasInput = document.getElementById('individualNameAliasInput');
    const categorySelect = document.getElementById('individualNameAliasCategory');

    if (!aliasInput || !categorySelect) return;

    const aliasString = aliasInput.value.trim().toUpperCase();
    const category = categorySelect.value;

    if (!aliasString) {
        showIndividualNameBrowserStatus('Please enter an alias string', 'error');
        return;
    }

    // Check if alias already exists
    const allTerms = individualNameBrowser.selectedIndividualName.getAllTermValues ?
        individualNameBrowser.selectedIndividualName.getAllTermValues() : [];
    if (allTerms.some(t => t.toUpperCase() === aliasString)) {
        showIndividualNameBrowserStatus('This alias already exists', 'error');
        return;
    }

    // Create AttributedTerm for the new alias with MANUAL source
    const newTerm = new AttributedTerm(
        aliasString,
        INDIVIDUALNAME_MANUAL_EDIT_SOURCE,
        -1,
        'manual_alias',
        'individualNameAlias'
    );

    // Add to the appropriate category
    if (!individualNameBrowser.selectedIndividualName.alternatives) {
        individualNameBrowser.selectedIndividualName.alternatives = new Aliases();
    }
    individualNameBrowser.selectedIndividualName.alternatives.add(newTerm, category);

    try {
        showIndividualNameBrowserStatus('Adding alias and saving...', 'loading');

        // Save the modified object to Google Drive
        const primaryKey = individualNameBrowser.selectedIndividualName.primaryAlias?.term;
        if (primaryKey) {
            await individualNameBrowser.loadedDatabase.saveObject(primaryKey);
            // Rebuild variation cache to include the new alias
            individualNameBrowser.loadedDatabase._buildVariationCache();
        }

        // Track manual edit
        individualNameBrowser.manualEdits.aliasesAdded.push({
            name: primaryKey,
            alias: aliasString,
            category: category
        });

        // Mark as having unsaved changes
        individualNameBrowser.hasUnsavedChanges = true;

        // Clear input and refresh display (re-sort since alias count changed)
        aliasInput.value = '';
        displayIndividualNameBrowserDetails(individualNameBrowser.selectedIndividualName);
        sortIndividualNamesByAliasCount(individualNameBrowser.currentResults);
        displayIndividualNameBrowserResults(individualNameBrowser.currentResults);

        showIndividualNameBrowserStatus('Added "' + aliasString + '" as ' + category.slice(0, -1), 'success');
    } catch (error) {
        console.error('[AddAlias] Error:', error);
        showIndividualNameBrowserStatus('Error adding alias: ' + error.message, 'error');
    }
}

// =============================================================================
// CHANGE PRIMARY ALIAS
// =============================================================================

/**
 * Change the primary alias of the selected individual name
 */
async function changeIndividualNamePrimaryAlias() {
    if (!requireConsistencyCheck('change primary alias')) return;

    if (!individualNameBrowser.selectedIndividualName) {
        showIndividualNameBrowserStatus('Please select a name first', 'error');
        return;
    }

    const selectElement = document.getElementById('individualNameChangePrimarySelect');
    if (!selectElement) return;

    const newPrimary = selectElement.value.trim();
    if (!newPrimary) {
        showIndividualNameBrowserStatus('Please select a new primary alias', 'error');
        return;
    }

    const oldPrimary = individualNameBrowser.selectedIndividualName.primaryAlias?.term;
    if (!oldPrimary) {
        showIndividualNameBrowserStatus('Current name has no primary alias', 'error');
        return;
    }

    if (newPrimary.toUpperCase() === oldPrimary.toUpperCase()) {
        showIndividualNameBrowserStatus('Selected alias is already the primary', 'error');
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
        showIndividualNameBrowserStatus('Changing primary alias...', 'loading');

        const db = individualNameBrowser.loadedDatabase;

        // Use helper to get dbEntry with fileId injected (handles case mismatch)
        const result = getDbEntryWithFileId(oldPrimary);
        if (!result) {
            throw new Error(`Database entry not found for "${oldPrimary}"`);
        }

        const { dbEntry, resolvedKey } = result;
        const normalizedOld = db._normalizeKey(resolvedKey);
        const normalizedNew = db._normalizeKey(newPrimary);

        // Check new primary doesn't already exist as a separate entry
        if (db.entries.has(normalizedNew)) {
            throw new Error(`Primary alias already exists: ${newPrimary}`);
        }

        // EMULATE db.changePrimaryAlias() without _saveIndex()
        const obj = dbEntry.object;
        const oldPrimaryAlias = obj.primaryAlias;

        // Find and remove the new primary from its current category in alternatives
        let newPrimaryTerm = null;
        if (obj.alternatives) {
            const categories = ['homonyms', 'synonyms', 'candidates'];
            for (const cat of categories) {
                const aliases = obj.alternatives[cat] || [];
                const idx = aliases.findIndex(a =>
                    a.term?.toUpperCase().trim() === normalizedNew
                );
                if (idx !== -1) {
                    // Found it - remove from this category and keep the AttributedTerm
                    newPrimaryTerm = aliases.splice(idx, 1)[0];
                    break;
                }
            }
        }

        // Use the found AttributedTerm as the new primary (preserves source history)
        // Or create a fresh one if not found in alternatives
        if (newPrimaryTerm) {
            obj.primaryAlias = newPrimaryTerm;
        } else {
            obj.primaryAlias = new AttributedTerm(
                newPrimary,
                'MANUAL_EDIT',
                -1,
                'primaryAliasChange',
                oldPrimaryAlias.fieldName
            );
        }

        // Move old primary to alternatives (if not discarding)
        if (moveToCategory && moveToCategory !== 'discard') {
            if (obj.alternatives && typeof obj.alternatives.add === 'function') {
                obj.alternatives.add(oldPrimaryAlias, moveToCategory);
            }
        }

        // Update the db.entries Map (remove old key, add new key)
        db.entries.delete(normalizedOld);
        db.entries.set(normalizedNew, dbEntry);

        // Rebuild variation cache
        db._buildVariationCache();

        // Save the object file (same fileId) - direct call skips _saveIndex
        await db._updateObjectFile(dbEntry.fileId, obj);

        // Update metadata
        dbEntry.lastModified = new Date().toISOString();

        // DO NOT call _saveIndex() - that would corrupt the Drive index

        console.log(`[changeIndividualNamePrimaryAlias] Changed "${normalizedOld}" → "${normalizedNew}" - index NOT saved to Drive`);

        // Get the updated object from the database (now indexed under newPrimary)
        const updatedName = db.get(newPrimary);
        if (updatedName) {
            individualNameBrowser.selectedIndividualName = updatedName;
        }

        // Track manual edit
        individualNameBrowser.manualEdits.aliasesAdded.push({
            name: newPrimary,
            action: 'primary_change',
            oldPrimary: oldPrimary,
            newPrimary: newPrimary
        });

        // Also update the loadedIndex (key changed from oldPrimary to newPrimary)
        // Check multiple key formats for the old entry
        let indexEntry = individualNameBrowser.loadedIndex?.[oldPrimary] ||
                         individualNameBrowser.loadedIndex?.[normalizedOld] ||
                         individualNameBrowser.loadedIndex?.[resolvedKey];
        if (indexEntry) {
            // Remove old key(s)
            delete individualNameBrowser.loadedIndex[oldPrimary];
            delete individualNameBrowser.loadedIndex[normalizedOld];
            delete individualNameBrowser.loadedIndex[resolvedKey];
            // Add new key
            individualNameBrowser.loadedIndex[normalizedNew] = indexEntry;
            individualNameBrowser.loadedFromDriveFileId = indexEntry.fileId;
        }

        // Sync DEV bulk file to keep it consistent with individual files
        showIndividualNameBrowserStatus('Syncing DEV bulk file...', 'loading');
        await saveDevBulkFile();

        individualNameBrowser.hasUnsavedChanges = false;  // Now synced

        // Refresh display with updated object and results
        displayIndividualNameBrowserDetails(individualNameBrowser.selectedIndividualName);
        // Re-fetch current results, sort, and display
        individualNameBrowser.currentResults = db.getAllObjects();
        sortIndividualNamesByAliasCount(individualNameBrowser.currentResults);
        displayIndividualNameBrowserResults(individualNameBrowser.currentResults);

        showIndividualNameBrowserStatus(
            'Primary alias changed: "' + oldPrimary + '" → "' + newPrimary + '" (synced to DEV bulk)',
            'success'
        );

    } catch (error) {
        console.error('[ChangePrimary] Error:', error);
        showIndividualNameBrowserStatus('Error changing primary: ' + error.message, 'error');
    }
}

// Export for onclick handler
window.changeIndividualNamePrimaryAlias = changeIndividualNamePrimaryAlias;

// =============================================================================
// MOVE ALIAS
// =============================================================================

// DRY_RUN flag for testing - set to true to log actions without saving
let MOVE_ALIAS_DRY_RUN = false;

/**
 * Move an alias from the selected individual name to another IndividualName.
 * Replaces the old "delete alias" functionality - aliases are never truly deleted,
 * they are moved to another IndividualName or become their own IndividualName.
 * @param {string} term - The alias term to move
 * @param {string} category - The category (homonyms, synonyms, candidates)
 */
async function moveIndividualNameAlias(term, category) {
    if (!requireConsistencyCheck('move alias')) return;

    if (!individualNameBrowser.selectedIndividualName) {
        showIndividualNameBrowserStatus('No name selected', 'error');
        return;
    }

    // Get key from selectedIndividualName (used for lookup)
    const sourceKey = individualNameBrowser.selectedIndividualName.primaryAlias?.term;

    // CRITICAL: Get the ACTUAL source object from db.entries to avoid Two-Object Reference Trap
    // selectedIndividualName may be a freshly-loaded copy from Google Drive, not the db.entries object
    const db = individualNameBrowser.loadedDatabase;
    let sourceDbEntry = null;
    let resolvedSourceKey = null;
    for (const [key, entry] of db.entries) {
        if (key.toUpperCase() === sourceKey.toUpperCase()) {
            sourceDbEntry = entry;
            resolvedSourceKey = key;
            break;
        }
    }

    if (!sourceDbEntry) {
        showIndividualNameBrowserStatus('Source not found in database: ' + sourceKey, 'error');
        return;
    }

    const sourceObj = sourceDbEntry.object;

    const aliases = sourceObj.alternatives?.[category];
    if (!aliases) {
        showIndividualNameBrowserStatus('Category not found: ' + category, 'error');
        return;
    }

    // Find the alias - preserve entire AttributedTerm object
    const aliasIdx = aliases.findIndex(a => a.term === term);
    if (aliasIdx === -1) {
        showIndividualNameBrowserStatus('Alias not found: ' + term, 'error');
        return;
    }

    const aliasToMove = aliases[aliasIdx];

    // Show move dialog
    const result = await showMoveAliasDialog(aliasToMove, category, sourceKey);

    if (result.action === 'cancel') {
        return;  // Do nothing
    }

    try {
        if (result.action === 'move') {
            // Load destination fresh from Google Drive (follows pattern: index → Google Drive → sync db.entries)
            // This replaces using result.destinationObject which came from DEV bulk
            showIndividualNameBrowserStatus('Loading destination from Google Drive...', 'loading');
            const destResult = await loadFreshAndSyncDbEntry(result.destination);

            if (!destResult) {
                showIndividualNameBrowserStatus('Failed to load destination from Google Drive', 'error');
                return;
            }

            const destObj = destResult.freshObject;

            // Check if destination already has this alias (using fresh Google Drive version)
            if (destinationHasAlias(destObj, term)) {
                showIndividualNameBrowserStatus('Destination already has this alias - likely systematic error', 'error');
                return;
            }

            // DRY RUN check - before any modifications
            if (MOVE_ALIAS_DRY_RUN) {
                console.log('[DRY RUN] Would move alias:', {
                    term: term,
                    fromSource: sourceKey,
                    toDestination: result.destination,
                    aliasObject: aliasToMove,
                    currentSourceAliasCount: aliases.length,
                    destAliasCountBeforeMove: 1 +
                        (destObj.alternatives?.homonyms?.length || 0) +
                        (destObj.alternatives?.synonyms?.length || 0) +
                        (destObj.alternatives?.candidates?.length || 0),
                    wouldRemoveFromSource: true,
                    wouldAddToDestCandidates: true,
                    note: 'Destination loaded fresh from Google Drive (see comparison above)'
                });
                showIndividualNameBrowserStatus('[DRY RUN] Would move "' + term + '" to ' + result.destination, 'success');
                return;
            }

            showIndividualNameBrowserStatus('Moving alias...', 'loading');

            // Remove from source (AFTER dry run check)
            aliases.splice(aliasIdx, 1);

            // Add to destination's candidates (using fresh Google Drive object now in db.entries)
            if (!destObj.alternatives) {
                destObj.alternatives = new Aliases();
            }
            if (!destObj.alternatives.candidates) {
                destObj.alternatives.candidates = [];
            }
            destObj.alternatives.candidates.push(aliasToMove);

            // Save both source and destination
            await saveSourceAndDestination(sourceKey, sourceObj, result.destination, destObj);

            showIndividualNameBrowserStatus('Moved "' + term + '" to ' + result.destination, 'success');

        } else if (result.action === 'createNew') {
            // Create new IndividualName with alias as primary (parses name via VisionAppraisalNameParser)
            const newObj = await createNewIndividualNameFromAlias(aliasToMove, sourceObj);
            const newKey = aliasToMove.term.toUpperCase();

            // DRY RUN check - before any modifications
            if (MOVE_ALIAS_DRY_RUN) {
                console.log('[DRY RUN] Would create new IndividualName:', {
                    term: term,
                    fromSource: sourceKey,
                    newKey: newKey,
                    newObject: newObj,
                    currentSourceAliasCount: aliases.length,
                    wouldRemoveFromSource: true
                });
                showIndividualNameBrowserStatus('[DRY RUN] Would create new: ' + newKey, 'success');
                return;
            }

            showIndividualNameBrowserStatus('Creating new IndividualName...', 'loading');

            // Remove from source (AFTER dry run check)
            aliases.splice(aliasIdx, 1);

            // Save source and create new entry
            await saveSourceAndCreateNew(sourceKey, sourceObj, newKey, newObj);

            showIndividualNameBrowserStatus('Created new IndividualName: ' + newKey, 'success');
        }

        individualNameBrowser.hasUnsavedChanges = false;

        // Refresh display by reloading from DEV bulk (ensures new entries appear)
        await repopulateWindowFromBulk('dev');

    } catch (error) {
        console.error('[MoveAlias] Error:', error);
        showIndividualNameBrowserStatus('Error moving alias: ' + error.message, 'error');
    }
}

// Export for onclick handler (keep old name for HTML onclick compatibility)
window.deleteIndividualNameAlias = moveIndividualNameAlias;

/**
 * Save both source and destination IndividualNames after a move operation.
 * Handles the Two-Object Reference Trap by updating loadedDatabase.entries.
 *
 * IMPORTANT: This function emulates db.saveObject() but SKIPS _saveIndex().
 * The index file on Google Drive is managed separately via loadedIndex.
 * Calling _saveIndex() would overwrite valid fileIds with nulls because
 * db.entries (populated from bulk) has fileId: null for most entries.
 *
 * @param {string} sourceKey - Key for the source IndividualName
 * @param {IndividualName} sourceObj - The modified source object
 * @param {string} destKey - Key for the destination IndividualName
 * @param {IndividualName} destObj - The modified destination object (from dialog)
 */
async function saveSourceAndDestination(sourceKey, sourceObj, destKey, destObj) {
    const db = individualNameBrowser.loadedDatabase;

    // CRITICAL: Two-Object Reference Trap
    // The destObj from the dialog is freshly deserialized from DEV bulk.
    // We must update the object in loadedDatabase.entries to match.
    // First, find the actual entry in the database using case-insensitive lookup.
    // Note: db.entries is a Map, so we iterate with Map's entries() method.
    let destDbEntry = null;
    let resolvedDestKey = null;
    for (const [key, entry] of db.entries) {
        if (key.toUpperCase() === destKey.toUpperCase()) {
            destDbEntry = entry;
            resolvedDestKey = key;
            break;
        }
    }

    if (!destDbEntry) {
        throw new Error(`Destination entry not found in database: "${destKey}"`);
    }

    // Update the database entry's object with the modified destObj
    destDbEntry.object = destObj;

    // Save source file - EMULATE db.saveObject() without _saveIndex()
    showIndividualNameBrowserStatus('Saving source...', 'loading');
    const sourceResult = getDbEntryWithFileId(sourceKey);
    if (!sourceResult) {
        throw new Error(`Source entry not found: "${sourceKey}"`);
    }
    // Direct call to _updateObjectFile (skips _saveIndex)
    await db._updateObjectFile(sourceResult.dbEntry.fileId, sourceResult.dbEntry.object);
    sourceResult.dbEntry.lastModified = new Date().toISOString();

    // Save destination file - EMULATE db.saveObject() without _saveIndex()
    showIndividualNameBrowserStatus('Saving destination...', 'loading');
    const destResult = getDbEntryWithFileId(resolvedDestKey);
    if (!destResult) {
        throw new Error(`Destination entry not found after update: "${resolvedDestKey}"`);
    }
    // Direct call to _updateObjectFile (skips _saveIndex)
    await db._updateObjectFile(destResult.dbEntry.fileId, destResult.dbEntry.object);
    destResult.dbEntry.lastModified = new Date().toISOString();

    // Rebuild variation cache
    db._buildVariationCache();

    // Sync DEV bulk file
    showIndividualNameBrowserStatus('Syncing DEV bulk file...', 'loading');
    await saveDevBulkFile();
}

/**
 * Save source IndividualName and create a new IndividualName entry.
 *
 * IMPORTANT: This function emulates db.saveObject() and db.add() but SKIPS _saveIndex().
 * The index file on Google Drive is managed separately via loadedIndex.
 * Calling _saveIndex() would overwrite valid fileIds with nulls because
 * db.entries (populated from bulk) has fileId: null for most entries.
 *
 * @param {string} sourceKey - Key for the source IndividualName
 * @param {IndividualName} sourceObj - The modified source object
 * @param {string} newKey - Key for the new IndividualName
 * @param {IndividualName} newObj - The new IndividualName object
 */
async function saveSourceAndCreateNew(sourceKey, sourceObj, newKey, newObj) {
    const db = individualNameBrowser.loadedDatabase;

    // Save source file - EMULATE db.saveObject() without _saveIndex()
    showIndividualNameBrowserStatus('Saving source...', 'loading');
    const sourceResult = getDbEntryWithFileId(sourceKey);
    if (!sourceResult) {
        throw new Error(`Source entry not found: "${sourceKey}"`);
    }
    // Direct call to _updateObjectFile (skips _saveIndex)
    await db._updateObjectFile(sourceResult.dbEntry.fileId, sourceResult.dbEntry.object);
    sourceResult.dbEntry.lastModified = new Date().toISOString();

    // EMULATE db.add() without _saveIndex()
    // Step 1: Create the object file on Google Drive
    showIndividualNameBrowserStatus('Creating new entry...', 'loading');
    const newFileId = await db._createObjectFile(newObj);
    const now = new Date().toISOString();

    // Step 2: Add to db.entries Map (with the actual fileId, not null)
    const normalizedNewKey = db._normalizeKey(newObj.primaryAlias.term);
    db.entries.set(normalizedNewKey, {
        object: newObj,
        fileId: newFileId,
        created: now,
        lastModified: now
    });

    // Step 3: Rebuild variation cache
    db._buildVariationCache();

    // Step 4: Update loadedIndex in memory
    if (individualNameBrowser.loadedIndex) {
        individualNameBrowser.loadedIndex[normalizedNewKey] = {
            fileId: newFileId,
            created: now,
            lastModified: now
        };
    }

    // Step 5: TARGETED update to Google Drive index - add just this one entry
    showIndividualNameBrowserStatus('Updating Drive index...', 'loading');
    await addEntryToGoogleDriveIndex(normalizedNewKey, newFileId);

    console.log(`[saveSourceAndCreateNew] Added "${normalizedNewKey}" (fileId: ${newFileId}) - index updated on Drive`);

    // Sync DEV bulk file
    showIndividualNameBrowserStatus('Syncing DEV bulk file...', 'loading');
    await saveDevBulkFile();
}

// =============================================================================
// CREATE NEW INDIVIDUAL NAME
// =============================================================================

async function showCreateIndividualNameDialog() {
    if (!requireConsistencyCheck('create new name')) return;

    if (!ensureIndividualNameBrowserDatabaseSynced()) {
        showIndividualNameBrowserStatus('Please load the database first', 'error');
        return;
    }

    const fullName = prompt('Enter new individual name (e.g., "JOHN DOE"):');
    if (!fullName || !fullName.trim()) return;

    const normalized = fullName.trim().toUpperCase();

    // Check if already exists
    if (individualNameBrowser.loadedDatabase.has(normalized)) {
        showIndividualNameBrowserStatus('This name already exists in the database', 'error');
        return;
    }

    // Ask for name components
    const lastName = prompt('Enter last name (or leave blank):', '') || '';
    const firstName = prompt('Enter first name (or leave blank):', '') || '';
    const otherNames = prompt('Enter other names/middle name (or leave blank):', '') || '';

    // Create new IndividualName object with MANUAL source
    const primaryAlias = new AttributedTerm(
        normalized,
        INDIVIDUALNAME_MANUAL_EDIT_SOURCE,
        -1,
        'manual_creation',
        'canonicalIndividualName'
    );

    const newIndividualName = new IndividualName(
        primaryAlias,
        '', // title
        firstName.toUpperCase(),
        otherNames.toUpperCase(),
        lastName.toUpperCase(),
        '' // suffix
    );

    try {
        showIndividualNameBrowserStatus('Creating new name...', 'loading');

        // Add to database (saves to Google Drive)
        await individualNameBrowser.loadedDatabase.add(newIndividualName);

        // Track manual edit
        individualNameBrowser.manualEdits.namesAdded.push(normalized);

        // Mark unsaved changes
        individualNameBrowser.hasUnsavedChanges = true;

        // Refresh display
        displayAllIndividualNames();

        showIndividualNameBrowserStatus('Created new name: "' + normalized + '"', 'success');
    } catch (error) {
        console.error('[CreateName] Error:', error);
        showIndividualNameBrowserStatus('Error creating name: ' + error.message, 'error');
    }
}

// =============================================================================
// STATS & EXPORT
// =============================================================================

function showIndividualNameBrowserStats() {
    if (!ensureIndividualNameBrowserDatabaseSynced()) {
        showIndividualNameBrowserStatus('Please load the database first', 'error');
        return;
    }

    const names = individualNameBrowser.loadedDatabase.getAllObjects();
    const totalNames = names.length;
    const totalHomonyms = names.reduce((sum, n) => sum + (n.alternatives?.homonyms?.length || 0), 0);
    const totalSynonyms = names.reduce((sum, n) => sum + (n.alternatives?.synonyms?.length || 0), 0);
    const totalCandidates = names.reduce((sum, n) => sum + (n.alternatives?.candidates?.length || 0), 0);
    const totalVariations = individualNameBrowser.loadedDatabase._variationCache ?
        individualNameBrowser.loadedDatabase._variationCache.size : 'unknown';
    const namesWithAliases = names.filter(n =>
        (n.alternatives?.homonyms?.length || 0) +
        (n.alternatives?.synonyms?.length || 0) +
        (n.alternatives?.candidates?.length || 0) > 0
    ).length;

    const manualNames = individualNameBrowser.manualEdits.namesAdded.length;
    const manualAliases = individualNameBrowser.manualEdits.aliasesAdded.length;

    alert('Individual Name Database Statistics\n\n' +
          'Total names: ' + totalNames + '\n' +
          'Names with aliases: ' + namesWithAliases + '\n' +
          'Total variations indexed: ' + totalVariations + '\n\n' +
          'Alias breakdown:\n' +
          '  Homonyms: ' + totalHomonyms + '\n' +
          '  Synonyms: ' + totalSynonyms + '\n' +
          '  Candidates: ' + totalCandidates + '\n\n' +
          'Manual edits (this session):\n' +
          '  Names added: ' + manualNames + '\n' +
          '  Aliases added: ' + manualAliases + '\n\n' +
          'Unsaved changes: ' + (individualNameBrowser.hasUnsavedChanges ? 'YES' : 'No'));
}

function exportIndividualNameBrowserDatabase() {
    if (!ensureIndividualNameBrowserDatabaseSynced()) {
        showIndividualNameBrowserStatus('Please load the database first', 'error');
        return;
    }

    // Export all name objects using standard serialization
    const names = individualNameBrowser.loadedDatabase.getAllObjects();
    const exportData = {
        __format: 'IndividualNameDatabaseExport',
        __version: '1.0',
        __exported: new Date().toISOString(),
        __count: names.length,
        names: names.map(n => serializeWithTypes(n))
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'individualname_database_export_' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showIndividualNameBrowserStatus('Database exported to JSON file', 'success');
}

// =============================================================================
// BUILD RUN/RESUME - Batched file-out with rate limit protection
// =============================================================================

/**
 * Handle Build Run/Resume button click
 * This function manages the entire build/resume workflow:
 * - First run: Build database, save bulk, reconcile, file out first batch
 * - Resume: Load from bulk, reconcile (ensures consistency), file out next batch
 *
 * CRITICAL: reconcileToMatchBulk() is called EVERY run to ensure index and
 * localStorage are consistent with the bulk file (source of truth).
 *
 * Processes up to 400 items per click to avoid Google Drive rate limits.
 */
async function handleBuildRunResume() {
    if (!requireConsistencyCheck('Build/Resume')) return;

    const buildResumeBtn = document.getElementById('individualNameBuildResumeBtn');
    const completedInput = document.getElementById('individualNameCompletedCount');
    const remainingInput = document.getElementById('individualNameRemainingCount');
    const folderId = document.getElementById('individualNameFolderId')?.value?.trim() || INDIVIDUALNAME_DATABASE_FOLDER_ID;
    const deletedFolderId = document.getElementById('individualNameDeletedFolderId')?.value?.trim() || INDIVIDUALNAME_DATABASE_DELETED_FOLDER_ID;

    const originalBtnText = buildResumeBtn ? buildResumeBtn.innerHTML : '';

    try {
        if (buildResumeBtn) {
            buildResumeBtn.innerHTML = 'Working...';
            buildResumeBtn.disabled = true;
        }

        showIndividualNameBrowserStatus('Checking prerequisites...', 'loading');

        // 1. Check if EntityGroups are loaded (required for first run)
        const entityGroupDb = entityGroupBrowser?.loadedDatabase || window.entityGroupDatabase;
        const hasEntityGroups = entityGroupDb &&
            entityGroupDb.groups &&
            Object.keys(entityGroupDb.groups).length > 0;

        // 2. Determine if first run or resume
        const firstRun = isFirstRun();
        console.log(`[BuildRunResume] First run: ${firstRun}, Has EntityGroups: ${hasEntityGroups}`);

        if (firstRun) {
            // === FIRST RUN ===
            if (!hasEntityGroups) {
                throw new Error('EntityGroupDatabase not loaded. Run buildEntityGroupDatabase() first, or load an existing bulk file.');
            }

            showIndividualNameBrowserStatus('First run: Building IndividualNameDatabase from EntityGroups...', 'loading');

            // Clear any stale progress
            clearFileOutProgress();

            // Build the database from EntityGroups
            await buildIndividualNameDatabase();

            if (!window.individualNameDatabase || window.individualNameDatabase.entries.size === 0) {
                throw new Error('buildIndividualNameDatabase() did not create a database');
            }

            showIndividualNameBrowserStatus('Saving bulk file (backup)...', 'loading');
            await saveIndividualNameDatabaseBulk();

        } else {
            // === RESUME ===
            showIndividualNameBrowserStatus('Resuming: Loading from bulk file...', 'loading');

            // Load database from bulk file
            await loadIndividualNameDatabaseFromBulk();

            if (!window.individualNameDatabase || window.individualNameDatabase.entries.size === 0) {
                throw new Error('Failed to load database from bulk file');
            }
        }

        // 3. CRITICAL: Reconcile index and localStorage to match bulk (source of truth)
        // This runs on EVERY operation (first run and resume) to ensure consistency
        showIndividualNameBrowserStatus('Reconciling index and progress to match bulk...', 'loading');
        const reconcileResult = await reconcileToMatchBulk(folderId, INDIVIDUALNAME_DATABASE_INDEX_FILE_ID);
        console.log('[BuildRunResume] Reconciliation result:', reconcileResult);

        // Update counts after reconciliation
        if (completedInput) completedInput.value = reconcileResult.finalCompleted;
        if (remainingInput) remainingInput.value = reconcileResult.finalRemaining;

        // Sync browser state
        individualNameBrowser.loadedDatabase = window.individualNameDatabase;

        // 4. Run file-out for up to 400 items
        showIndividualNameBrowserStatus('Filing out (max 400 items)...', 'loading');

        const result = await fileOutIndividualNames({
            resume: true,
            parallel: 5,
            maxBatch: 400,
            folderId: folderId
        });

        // 5. Update counts after processing
        const finalProgress = loadFileOutProgress();
        if (completedInput) completedInput.value = finalProgress.completed.length;
        if (remainingInput) remainingInput.value = window.individualNameDatabase.entries.size - finalProgress.completed.length;

        // 6. Show result
        if (result.processed === 0 && result.remaining === 0) {
            showIndividualNameBrowserStatus('All files already created! Database complete.', 'success');
            // Refresh display
            displayAllIndividualNames();
        } else if (result.processed === 0) {
            showIndividualNameBrowserStatus('No new items to process. Click again or check progress.', 'success');
        } else {
            const statusMsg = `Batch complete: ${result.processed} processed, ${result.failed} failed. ` +
                `Total: ${finalProgress.completed.length}/${window.individualNameDatabase.entries.size}` +
                (result.remaining > 0 ? ` (${result.remaining} remaining - click again)` : ' - DONE!');
            showIndividualNameBrowserStatus(statusMsg, result.failed === 0 ? 'success' : 'error');
        }

    } catch (error) {
        console.error('[BuildRunResume] Error:', error);
        showIndividualNameBrowserStatus(`Error: ${error.message}`, 'error');
    } finally {
        if (buildResumeBtn) {
            buildResumeBtn.innerHTML = originalBtnText;
            buildResumeBtn.disabled = false;
        }
    }
}

// Export for global access
window.handleBuildRunResume = handleBuildRunResume;

/**
 * Handle Reset button click - clears all progress so next Build Run/Resume starts fresh
 * Also clears the index file on Google Drive so all entries go through CREATE path
 */
async function handleIndividualNameReset() {
    if (!requireConsistencyCheck('Reset')) return;

    const resetBtn = document.getElementById('individualNameResetBtn');
    if (resetBtn) {
        resetBtn.innerHTML = 'Resetting...';
        resetBtn.disabled = true;
    }

    try {
        // Clear localStorage progress
        clearFileOutProgress();

        // Clear in-memory database reference
        window.individualNameDatabase = null;
        individualNameBrowser.loadedDatabase = null;

        // Clear the index file on Google Drive so all entries go through CREATE path
        showIndividualNameBrowserStatus('Clearing index file on Google Drive...', 'loading');
        const emptyIndex = {
            __format: 'AliasedTermDatabaseIndex',
            __version: '1.0',
            __created: new Date().toISOString(),
            __lastModified: new Date().toISOString(),
            __objectType: 'IndividualName',
            __objectCount: 0,
            __indexedEntries: 0,
            __resetAt: new Date().toISOString(),
            entries: {}
        };

        const indexJson = JSON.stringify(emptyIndex, null, 2);
        const response = await fetch(
            `https://www.googleapis.com/upload/drive/v3/files/${INDIVIDUALNAME_DATABASE_INDEX_FILE_ID}?uploadType=media`,
            {
                method: 'PATCH',
                headers: new Headers({
                    'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                    'Content-Type': 'application/json'
                }),
                body: indexJson
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to clear index: HTTP ${response.status}`);
        }

        console.log('[IndividualNameBrowser] Index file cleared on Google Drive');

        // Reset UI counters
        const completedInput = document.getElementById('individualNameCompletedCount');
        const remainingInput = document.getElementById('individualNameRemainingCount');
        if (completedInput) completedInput.value = '0';
        if (remainingInput) remainingInput.value = '--';

        // Clear the display list
        const listContainer = document.getElementById('individualNameList');
        if (listContainer) listContainer.innerHTML = '';

        // Clear details panel
        const detailsContainer = document.getElementById('individualNameDetails');
        if (detailsContainer) detailsContainer.innerHTML = '<p>Select an individual name from the list</p>';

        showIndividualNameBrowserStatus('Reset complete. Index cleared. Click Build Run/Resume to start fresh.', 'success');
        console.log('[IndividualNameBrowser] Reset complete - ready for fresh start');

    } catch (error) {
        console.error('[IndividualNameBrowser] Reset error:', error);
        showIndividualNameBrowserStatus(`Reset error: ${error.message}`, 'error');
    } finally {
        if (resetBtn) {
            resetBtn.innerHTML = 'Reset';
            resetBtn.disabled = false;
        }
    }
}

window.handleIndividualNameReset = handleIndividualNameReset;

/**
 * Handle Consistency Check button click - runs consistencyCheck() and displays results
 */
async function handleConsistencyCheck() {
    const btn = document.getElementById('individualNameConsistencyCheckBtn');
    if (btn) {
        btn.innerHTML = 'Checking...';
        btn.disabled = true;
    }

    try {
        showIndividualNameBrowserStatus('Running consistency check...', 'loading');

        const results = await consistencyCheck();

        if (results.stopped) {
            // Folder has fewer files than bulk - need to rerun file creation
            // Do NOT set consistencyCheckRun flag - system is not consistent
            showIndividualNameBrowserStatus(
                `⚠️ STOPPED: Folder (${results.folderUnique}) < Bulk (${results.bulk}). RERUN GOOGLE FILE CREATION`,
                'error'
            );
        } else if (results.consistent) {
            let msg = `✓ Consistent! Bulk: ${results.bulk}, Folder: ${results.folderUnique}, Index: ${results.index}`;
            if (results.duplicatesDeleted > 0) {
                msg += ` (deleted ${results.duplicatesDeleted} duplicates)`;
            }
            showIndividualNameBrowserStatus(msg, 'success');
        } else {
            const notes = [];
            if (results.duplicatesDeleted > 0) notes.push(`deleted ${results.duplicatesDeleted} duplicates`);
            if (results.indexRebuilt) notes.push('index rebuilt');
            if (results.inFolderNotBulk.length > 0) notes.push(`${results.inFolderNotBulk.length} in folder not bulk`);

            showIndividualNameBrowserStatus(
                `Done: Bulk=${results.bulk}, Folder=${results.folderUnique}, Index=${results.index}. ${notes.join(', ')}. See console.`,
                notes.length > 0 ? 'error' : 'success'
            );
        }

    } catch (error) {
        console.error('[IndividualNameBrowser] Consistency check error:', error);
        showIndividualNameBrowserStatus(`Error: ${error.message}`, 'error');
    } finally {
        if (btn) {
            btn.innerHTML = 'Constncy Chk';
            btn.disabled = false;
        }
    }
}

window.handleConsistencyCheck = handleConsistencyCheck;

/**
 * Handle Backup Bulk button click - backs up the bulk database file
 */
async function handleBackupBulk() {
    const btn = document.getElementById('individualNameBackupBulkBtn');
    if (btn) {
        btn.innerHTML = 'Backing up...';
        btn.disabled = true;
    }

    try {
        showIndividualNameBrowserStatus('Backing up bulk file...', 'loading');

        const result = await backupBulkFile();

        if (result.success) {
            showIndividualNameBrowserStatus('✓ Bulk file backed up successfully', 'success');
        } else {
            showIndividualNameBrowserStatus(`✗ ${result.message}`, 'error');
        }

    } catch (error) {
        console.error('[IndividualNameBrowser] Backup error:', error);
        showIndividualNameBrowserStatus(`Error: ${error.message}`, 'error');
    } finally {
        if (btn) {
            btn.innerHTML = 'Backup Bulk';
            btn.disabled = false;
        }
    }
}

window.handleBackupBulk = handleBackupBulk;

/**
 * Handle Rebuild Bulk from Files button click - runs buildBulkFromGoogleFiles()
 * This reads all individual Google Drive files and consolidates them into the bulk file.
 */
async function handleRebuildBulkFromFiles() {
    const btn = document.getElementById('individualNameRebuildBulkBtn');
    if (btn) {
        btn.innerHTML = 'Working...';
        btn.disabled = true;
    }

    try {
        showIndividualNameBrowserStatus('Rebuilding bulk file from Google Drive files...', 'loading');

        const results = await buildBulkFromGoogleFiles();

        if (results.stopped) {
            showIndividualNameBrowserStatus(
                `⚠️ STOPPED: ${results.stopReason}`,
                'error'
            );
        } else if (results.success) {
            showIndividualNameBrowserStatus(
                `✓ Complete! Loaded ${results.filesLoaded}/${results.indexEntries} files, created bulk with ${results.bulkEntriesCreated} entries (DEV FILE)`,
                'success'
            );
        } else {
            showIndividualNameBrowserStatus(
                `Done with issues: ${results.filesLoaded} loaded, ${results.filesFailed} failed. See console.`,
                'error'
            );
        }

    } catch (error) {
        console.error('[IndividualNameBrowser] Rebuild bulk error:', error);
        showIndividualNameBrowserStatus(`Error: ${error.message}`, 'error');
    } finally {
        if (btn) {
            btn.innerHTML = 'Rebuild Bulk from Files';
            btn.disabled = false;
        }
    }
}

window.handleRebuildBulkFromFiles = handleRebuildBulkFromFiles;

/**
 * Handle Cross Check button click - compares DEV bulk file with original bulk file
 */
async function handleCrossCheck() {
    const btn = document.getElementById('individualNameCrossCheckBtn');
    if (btn) {
        btn.innerHTML = 'Checking...';
        btn.disabled = true;
    }

    try {
        showIndividualNameBrowserStatus('Comparing DEV bulk with original...', 'loading');

        const results = await compareBulkFiles();

        if (results.identical) {
            showIndividualNameBrowserStatus(
                `✓ Files IDENTICAL! ${results.originalCount} keys, all aliases match.`,
                'success'
            );
        } else {
            const issues = [];
            if (results.inOriginalNotDev.length > 0) {
                issues.push(`${results.inOriginalNotDev.length} keys missing from DEV`);
            }
            if (results.inDevNotOriginal.length > 0) {
                issues.push(`${results.inDevNotOriginal.length} extra keys in DEV`);
            }
            if (results.aliasMismatches?.length > 0) {
                issues.push(`${results.aliasMismatches.length} alias mismatches`);
            }
            if (results.contentMismatches.length > 0) {
                issues.push(`${results.contentMismatches.length} content mismatches`);
            }
            showIndividualNameBrowserStatus(
                `✗ Differences found: ${issues.join(', ')}. See console.`,
                'error'
            );
        }

        // Cross Check was run - enable other operations
        individualNameBrowser.consistencyCheckRun = true;
        console.log('[IndividualNameBrowser] Cross Check completed - other operations now enabled');

    } catch (error) {
        console.error('[IndividualNameBrowser] Cross check error:', error);
        showIndividualNameBrowserStatus(`Error: ${error.message}`, 'error');
    } finally {
        if (btn) {
            btn.innerHTML = 'Cross Check';
            btn.disabled = false;
        }
    }
}

window.handleCrossCheck = handleCrossCheck;

/**
 * Handle Rebuild Map button click - fixes null fileIds in index by looking up from folder
 */
async function handleRebuildMap() {
    const btn = document.getElementById('individualNameRebuildMapBtn');
    if (btn) {
        btn.innerHTML = 'Rebuilding...';
        btn.disabled = true;
    }

    try {
        showIndividualNameBrowserStatus('Rebuilding index map from folder...', 'loading');

        const results = await rebuildIndexMap();

        if (results.fixed > 0) {
            showIndividualNameBrowserStatus(
                `✓ Fixed ${results.fixed} fileIds. ${results.alreadyValid} already valid. ${results.notFound} not found.`,
                'success'
            );
        } else if (results.alreadyValid > 0) {
            showIndividualNameBrowserStatus(
                `All ${results.alreadyValid} entries already have valid fileIds.`,
                'success'
            );
        } else {
            showIndividualNameBrowserStatus(
                `No entries to fix. ${results.notFound} not found in folder.`,
                'warning'
            );
        }

    } catch (error) {
        console.error('[IndividualNameBrowser] Rebuild map error:', error);
        showIndividualNameBrowserStatus(`Error: ${error.message}`, 'error');
    } finally {
        if (btn) {
            btn.innerHTML = 'Rebuild Map';
            btn.disabled = false;
        }
    }
}

window.handleRebuildMap = handleRebuildMap;

/**
 * Handle Sync DEV to Original button click - syncs DEV bulk to Original bulk file.
 * Restores special characters in keys that were lost during Google Drive file creation.
 */
async function handleSyncDevToOriginal() {
    const btn = document.getElementById('individualNameSyncDevToOriginalBtn');
    if (btn) {
        btn.innerHTML = 'Syncing...';
        btn.disabled = true;
    }

    try {
        showIndividualNameBrowserStatus('Syncing DEV bulk to Original (restoring special characters)...', 'loading');

        const results = await syncDevToOriginal();

        if (results.success) {
            showIndividualNameBrowserStatus(
                `✓ Synced ${results.totalSynced} entries. ${results.keysRestored} keys with special chars restored. ${results.newKeys} new entries.`,
                'success'
            );
        } else {
            showIndividualNameBrowserStatus(
                `Sync failed: ${results.error || 'Unknown error'}`,
                'error'
            );
        }

    } catch (error) {
        console.error('[IndividualNameBrowser] Sync DEV to Original error:', error);
        showIndividualNameBrowserStatus(`Error: ${error.message}`, 'error');
    } finally {
        if (btn) {
            btn.innerHTML = 'Sync DEV → Original';
            btn.disabled = false;
        }
    }
}

window.handleSyncDevToOriginal = handleSyncDevToOriginal;

// =============================================================================
// STATUS & HELPER FUNCTIONS
// =============================================================================

function showIndividualNameBrowserStatus(message, type) {
    const statusDiv = document.getElementById('individualNameStatusMessage');
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

function updateIndividualNameBrowserResultsCount(message) {
    const countSpan = document.getElementById('individualNameResultsCount');
    if (countSpan) countSpan.textContent = message;
}

function escapeHtmlForIndividualNameBrowser(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =============================================================================
// DISAMBIGUATION DIALOG
// =============================================================================

/**
 * Display a disambiguation dialog when multiple IndividualName records match a key.
 * Shows all aliases and source information for each duplicate, allowing user to choose.
 *
 * @param {string} keyName - The key name that had duplicates (displayed at top)
 * @param {Array<IndividualName>} duplicates - Array of IndividualName objects to choose from
 * @returns {Promise<IndividualName|null>} - Resolves to chosen IndividualName or null if cancelled
 */
function showIndividualNameDisambiguationDialog(keyName, duplicates) {
    return new Promise((resolve) => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'individualNameDisambiguationOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

        // Create dialog box
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            max-width: 90%;
            max-height: 80%;
            display: flex;
            flex-direction: column;
            min-width: 400px;
        `;

        // Header with key name and cancel button
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            border-bottom: 1px solid #ddd;
            background: #f5f5f5;
            border-radius: 8px 8px 0 0;
        `;
        header.innerHTML = `
            <div style="font-weight: 600; font-size: 16px;">
                Key: "<span style="color: #1976d2;">${escapeHtmlForIndividualNameBrowser(keyName)}</span>"
                <span style="color: #666; font-weight: normal; font-size: 14px; margin-left: 10px;">
                    (${duplicates.length} records found)
                </span>
            </div>
            <button id="disambigCancelBtn" style="
                background: #dc3545;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 600;
            ">Cancel</button>
        `;

        // Columns container with horizontal scroll
        const columnsContainer = document.createElement('div');
        columnsContainer.style.cssText = `
            display: flex;
            gap: 15px;
            padding: 20px;
            overflow-x: auto;
            flex: 1;
        `;

        // Build a column for each duplicate
        duplicates.forEach((individualName, index) => {
            const column = buildDisambiguationColumn(individualName, index, () => {
                cleanup();
                resolve(individualName);
            });
            columnsContainer.appendChild(column);
        });

        // Assemble dialog
        dialog.appendChild(header);
        dialog.appendChild(columnsContainer);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Event handlers
        const cancelBtn = document.getElementById('disambigCancelBtn');
        cancelBtn.addEventListener('click', () => {
            cleanup();
            resolve(null);
        });

        // Click outside to cancel
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                cleanup();
                resolve(null);
            }
        });

        // Escape key to cancel
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                resolve(null);
            }
        };
        document.addEventListener('keydown', escHandler);

        function cleanup() {
            document.removeEventListener('keydown', escHandler);
            overlay.remove();
        }
    });
}

/**
 * Build a single column for the disambiguation dialog
 * @param {IndividualName} individualName - The IndividualName to display
 * @param {number} index - Column index (for display)
 * @param {Function} onChoose - Callback when Choose button is clicked
 * @returns {HTMLElement} - The column element
 */
function buildDisambiguationColumn(individualName, index, onChoose) {
    const column = document.createElement('div');
    column.style.cssText = `
        min-width: 280px;
        max-width: 320px;
        border: 1px solid #ccc;
        border-radius: 6px;
        display: flex;
        flex-direction: column;
        background: #fafafa;
    `;

    // Column header
    const colHeader = document.createElement('div');
    colHeader.style.cssText = `
        padding: 10px;
        background: #e3f2fd;
        border-bottom: 1px solid #ccc;
        font-weight: 600;
        text-align: center;
        border-radius: 6px 6px 0 0;
    `;
    colHeader.textContent = `Option ${index + 1}`;

    // Scrollable alias list
    const aliasList = document.createElement('div');
    aliasList.style.cssText = `
        flex: 1;
        overflow-y: auto;
        max-height: 300px;
        min-height: 150px;
        padding: 10px;
    `;

    // Collect all aliases with their sources
    const allAliases = collectAllAliasesWithSources(individualName);

    allAliases.forEach((aliasInfo, aliasIndex) => {
        const aliasEntry = document.createElement('div');
        aliasEntry.style.cssText = `
            padding: 8px;
            margin-bottom: 8px;
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            font-size: 13px;
        `;

        // Name line
        const nameLine = document.createElement('div');
        nameLine.style.cssText = `font-weight: 600; color: #333; margin-bottom: 4px;`;
        nameLine.textContent = aliasInfo.term;

        // Category badge (if not primary)
        if (aliasInfo.category !== 'primary') {
            const badge = document.createElement('span');
            badge.style.cssText = `
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 3px;
                margin-left: 8px;
                font-weight: normal;
                ${aliasInfo.category === 'homonyms' ? 'background: #c8e6c9; color: #2e7d32;' : ''}
                ${aliasInfo.category === 'synonyms' ? 'background: #fff3e0; color: #ef6c00;' : ''}
                ${aliasInfo.category === 'candidates' ? 'background: #ffebee; color: #c62828;' : ''}
            `;
            badge.textContent = aliasInfo.category;
            nameLine.appendChild(badge);
        }

        aliasEntry.appendChild(nameLine);

        // Source lines
        aliasInfo.sources.forEach(source => {
            const sourceLine = document.createElement('div');
            sourceLine.style.cssText = `
                font-size: 11px;
                color: #666;
                padding-left: 10px;
                font-family: monospace;
                word-break: break-all;
            `;
            sourceLine.textContent = source;
            aliasEntry.appendChild(sourceLine);
        });

        aliasList.appendChild(aliasEntry);
    });

    // Choose button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        padding: 10px;
        border-top: 1px solid #ccc;
        text-align: center;
    `;

    const chooseBtn = document.createElement('button');
    chooseBtn.style.cssText = `
        background: #4caf50;
        color: white;
        border: none;
        padding: 10px 30px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 600;
        width: 100%;
    `;
    chooseBtn.textContent = 'Choose';
    chooseBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event from bubbling to overlay

        // Visual feedback: highlight the column and change button
        column.style.border = '3px solid #4caf50';
        column.style.background = '#e8f5e9';
        chooseBtn.textContent = '✓ Selected';
        chooseBtn.style.background = '#2e7d32';

        // Brief delay so user sees the selection before dialog closes
        setTimeout(() => {
            onChoose();
        }, 300);
    });
    chooseBtn.addEventListener('mouseover', () => { chooseBtn.style.background = '#43a047'; });
    chooseBtn.addEventListener('mouseout', () => { chooseBtn.style.background = '#4caf50'; });

    buttonContainer.appendChild(chooseBtn);

    // Assemble column
    column.appendChild(colHeader);
    column.appendChild(aliasList);
    column.appendChild(buttonContainer);

    return column;
}

/**
 * Collect all aliases from an IndividualName with their source information
 * @param {IndividualName} individualName - The IndividualName object
 * @returns {Array<{term: string, category: string, sources: string[], originalObject: Object}>}
 */
function collectAllAliasesWithSources(individualName) {
    const result = [];

    // Primary alias
    if (individualName.primaryAlias) {
        result.push({
            term: individualName.primaryAlias.term || '(no term)',
            category: 'primary',
            sources: extractSourceKeys(individualName.primaryAlias),
            originalObject: individualName.primaryAlias  // Keep reference to actual object
        });
    }

    // Alternatives (homonyms, synonyms, candidates)
    if (individualName.alternatives) {
        const categories = ['homonyms', 'synonyms', 'candidates'];
        for (const category of categories) {
            const aliases = individualName.alternatives[category];
            if (aliases && Array.isArray(aliases)) {
                for (const alias of aliases) {
                    result.push({
                        term: alias.term || '(no term)',
                        category: category,
                        sources: extractSourceKeys(alias),
                        originalObject: alias  // Keep reference to actual object
                    });
                }
            }
        }
    }

    return result;
}

/**
 * Extract source keys from an AttributedTerm's sourceMap
 * @param {AttributedTerm} attributedTerm - The term to extract sources from
 * @returns {string[]} - Array of source key strings
 */
function extractSourceKeys(attributedTerm) {
    const sources = [];

    if (attributedTerm && attributedTerm.sourceMap) {
        // Handle both Map and plain object (from deserialization)
        if (attributedTerm.sourceMap instanceof Map) {
            for (const [key, value] of attributedTerm.sourceMap) {
                sources.push(key);
            }
        } else if (typeof attributedTerm.sourceMap === 'object') {
            for (const key of Object.keys(attributedTerm.sourceMap)) {
                sources.push(key);
            }
        }
    }

    return sources.length > 0 ? sources : ['(no source)'];
}

// Export disambiguation function
window.showIndividualNameDisambiguationDialog = showIndividualNameDisambiguationDialog;

// =============================================================================
// DUPLICATE RESOLUTION DIALOG (for builder)
// =============================================================================

/**
 * Display a duplicate resolution dialog during the build process.
 * Shows existing record and the duplicate, requiring user to provide a new key.
 *
 * NOTE: This dialog cannot be cancelled. The user MUST resolve the duplicate
 * by providing a new key value before proceeding.
 *
 * @param {string} duplicateKey - The key that already exists (e.g., "JOHN SMITH")
 * @param {IndividualName} existingRecord - The record already in the database
 * @param {IndividualName} dupeRecord - The new record that would cause duplication
 * @returns {Promise<{resolved: boolean, modifiedRecord: IndividualName, newKey: string}|null>}
 *          Returns null if dialog was force-closed (build should stop)
 */
function showDuplicateResolutionDialog(duplicateKey, existingRecord, dupeRecord) {
    return new Promise((resolve) => {
        // Track if properly resolved (vs force-closed)
        let properlyResolved = false;

        // Create overlay (no click-to-close)
        const overlay = document.createElement('div');
        overlay.id = 'duplicateResolutionOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

        // Create dialog box
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            max-width: 700px;
            max-height: 80%;
            display: flex;
            flex-direction: column;
            min-width: 600px;
        `;

        // Header with mandatory warning
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 15px 20px;
            border-bottom: 1px solid #ddd;
            background: #ffebee;
            border-radius: 8px 8px 0 0;
        `;
        header.innerHTML = `
            <div style="font-weight: 700; font-size: 18px; color: #c62828; text-align: center; margin-bottom: 8px;">
                ⚠️ THIS ISSUE MUST BE RESOLVED ⚠️
            </div>
            <div style="font-size: 14px; color: #333; text-align: center;">
                Duplicate key detected: "<span style="font-weight: 600; color: #1976d2;">${escapeHtmlForIndividualNameBrowser(duplicateKey)}</span>"
            </div>
            <div style="font-size: 12px; color: #666; text-align: center; margin-top: 5px;">
                Enter a new unique key <b>OR</b> select a different alias from the Dupe column.
            </div>
        `;

        // Columns container
        const columnsContainer = document.createElement('div');
        columnsContainer.style.cssText = `
            display: flex;
            gap: 15px;
            padding: 20px;
            flex: 1;
            overflow-y: auto;
        `;

        // Build "Existing" column (read-only)
        const existingColumn = buildDupeResolutionColumn(existingRecord, 'Existing', true);

        // Handler for when user clicks an existing alias to use it as the new key
        const handleAliasSelect = (aliasInfo) => {
            const newKey = aliasInfo.term;
            const selectedAliasObject = aliasInfo.originalObject;  // The actual AttributedTerm object

            // Save reference to the current primary alias object
            const oldPrimaryObject = dupeRecord.primaryAlias;

            // Ensure alternatives structure exists
            if (!dupeRecord.alternatives) {
                dupeRecord.alternatives = { homonyms: [], synonyms: [], candidates: [] };
            }
            if (!dupeRecord.alternatives.homonyms) {
                dupeRecord.alternatives.homonyms = [];
            }

            // Remove the selected alias object from its category array
            if (dupeRecord.alternatives[aliasInfo.category]) {
                const idx = dupeRecord.alternatives[aliasInfo.category].indexOf(selectedAliasObject);
                if (idx >= 0) {
                    dupeRecord.alternatives[aliasInfo.category].splice(idx, 1);
                }
            }

            // Move the old primary object to homonyms (the actual object, not a copy)
            if (oldPrimaryObject) {
                dupeRecord.alternatives.homonyms.push(oldPrimaryObject);
            }

            // Set the selected alias object as the new primary (the actual object)
            dupeRecord.primaryAlias = selectedAliasObject;

            // Visual feedback
            dupeColumn.style.border = '3px solid #4caf50';
            dupeColumn.style.background = '#e8f5e9';

            properlyResolved = true;

            // Brief delay for visual feedback
            setTimeout(() => {
                overlay.remove();
                resolve({
                    resolved: true,
                    modifiedRecord: dupeRecord,
                    newKey: newKey
                });
            }, 300);
        };

        // Build "Dupe" column (with input and Use button)
        const { column: dupeColumn, inputBox, useButton } = buildDupeResolutionColumnWithInput(
            dupeRecord,
            'Dupe',
            duplicateKey,
            handleAliasSelect
        );

        columnsContainer.appendChild(existingColumn);
        columnsContainer.appendChild(dupeColumn);

        // Assemble dialog
        dialog.appendChild(header);
        dialog.appendChild(columnsContainer);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Handle "Use" button click
        useButton.addEventListener('click', () => {
            const newKey = inputBox.value.trim();

            // Verify value has changed
            if (newKey === duplicateKey) {
                alert('You must change the key value to something different from "' + duplicateKey + '"');
                inputBox.focus();
                return;
            }

            if (newKey === '') {
                alert('The key value cannot be empty.');
                inputBox.focus();
                return;
            }

            // Modify the dupe record:
            // 1. Move the actual old primaryAlias object to homonyms
            // 2. Create a new AttributedTerm object for the new key

            const oldPrimaryObject = dupeRecord.primaryAlias;

            // Ensure alternatives structure exists
            if (!dupeRecord.alternatives) {
                dupeRecord.alternatives = { homonyms: [], synonyms: [], candidates: [] };
            }
            if (!dupeRecord.alternatives.homonyms) {
                dupeRecord.alternatives.homonyms = [];
            }

            // Move the actual old primary object to homonyms
            if (oldPrimaryObject) {
                dupeRecord.alternatives.homonyms.push(oldPrimaryObject);
            }

            // Create a new AttributedTerm for the new key
            // Use the AttributedTerm constructor if available, otherwise create compatible structure
            if (typeof AttributedTerm !== 'undefined') {
                dupeRecord.primaryAlias = new AttributedTerm(
                    newKey,
                    'DUPLICATE_RESOLUTION_DIALOG',
                    0,
                    'primary',
                    'individualName'
                );
            } else {
                // Fallback: create compatible object structure
                dupeRecord.primaryAlias = {
                    term: newKey,
                    fieldName: 'individualName',
                    sourceMap: new Map([['DUPLICATE_RESOLUTION_DIALOG', { index: 0, identifier: 'primary' }]])
                };
            }

            // Visual feedback
            dupeColumn.style.border = '3px solid #4caf50';
            dupeColumn.style.background = '#e8f5e9';
            useButton.textContent = '✓ Resolved';
            useButton.style.background = '#2e7d32';

            properlyResolved = true;

            // Brief delay for visual feedback
            setTimeout(() => {
                overlay.remove();
                resolve({
                    resolved: true,
                    modifiedRecord: dupeRecord,
                    newKey: newKey
                });
            }, 300);
        });

        // NO escape key handler - cannot close
        // NO click-outside handler - cannot close

        // Handle unexpected removal (e.g., user closes browser tab during dialog)
        // This won't catch all cases but provides some safety
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const removed of mutation.removedNodes) {
                    if (removed === overlay && !properlyResolved) {
                        observer.disconnect();
                        resolve(null); // Signal that build should stop
                    }
                }
            }
        });
        observer.observe(document.body, { childList: true });
    });
}

/**
 * Build a read-only column for the duplicate resolution dialog
 */
function buildDupeResolutionColumn(individualName, label, isReadOnly) {
    const column = document.createElement('div');
    column.style.cssText = `
        min-width: 280px;
        max-width: 320px;
        border: 1px solid #ccc;
        border-radius: 6px;
        display: flex;
        flex-direction: column;
        background: ${isReadOnly ? '#f5f5f5' : '#fafafa'};
        ${isReadOnly ? 'opacity: 0.85;' : ''}
    `;

    // Column header
    const colHeader = document.createElement('div');
    colHeader.style.cssText = `
        padding: 10px;
        background: ${isReadOnly ? '#e0e0e0' : '#e3f2fd'};
        border-bottom: 1px solid #ccc;
        font-weight: 600;
        text-align: center;
        border-radius: 6px 6px 0 0;
    `;
    colHeader.textContent = label;

    // Scrollable alias list
    const aliasList = document.createElement('div');
    aliasList.style.cssText = `
        flex: 1;
        overflow-y: auto;
        max-height: 250px;
        min-height: 150px;
        padding: 10px;
    `;

    // Collect all aliases with their sources
    const allAliases = collectAllAliasesWithSources(individualName);

    allAliases.forEach((aliasInfo) => {
        const aliasEntry = document.createElement('div');
        aliasEntry.style.cssText = `
            padding: 8px;
            margin-bottom: 8px;
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            font-size: 13px;
            ${isReadOnly ? 'cursor: default;' : ''}
        `;

        // Name line
        const nameLine = document.createElement('div');
        nameLine.style.cssText = `font-weight: 600; color: #333; margin-bottom: 4px;`;
        nameLine.textContent = aliasInfo.term;

        // Category badge (if not primary)
        if (aliasInfo.category !== 'primary') {
            const badge = document.createElement('span');
            badge.style.cssText = `
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 3px;
                margin-left: 8px;
                font-weight: normal;
                ${aliasInfo.category === 'homonyms' ? 'background: #c8e6c9; color: #2e7d32;' : ''}
                ${aliasInfo.category === 'synonyms' ? 'background: #fff3e0; color: #ef6c00;' : ''}
                ${aliasInfo.category === 'candidates' ? 'background: #ffebee; color: #c62828;' : ''}
            `;
            badge.textContent = aliasInfo.category;
            nameLine.appendChild(badge);
        }

        aliasEntry.appendChild(nameLine);

        // Source lines
        aliasInfo.sources.forEach(source => {
            const sourceLine = document.createElement('div');
            sourceLine.style.cssText = `
                font-size: 11px;
                color: #666;
                padding-left: 10px;
                font-family: monospace;
                word-break: break-all;
            `;
            sourceLine.textContent = source;
            aliasEntry.appendChild(sourceLine);
        });

        aliasList.appendChild(aliasEntry);
    });

    // Assemble column
    column.appendChild(colHeader);
    column.appendChild(aliasList);

    return column;
}

/**
 * Build the "Dupe" column with input box and Use button
 * @param {Function} onAliasSelect - Callback when a non-primary alias is clicked: (aliasInfo) => void
 */
function buildDupeResolutionColumnWithInput(individualName, label, initialKey, onAliasSelect) {
    const column = document.createElement('div');
    column.style.cssText = `
        min-width: 280px;
        max-width: 320px;
        border: 1px solid #ccc;
        border-radius: 6px;
        display: flex;
        flex-direction: column;
        background: #fafafa;
    `;

    // Column header
    const colHeader = document.createElement('div');
    colHeader.style.cssText = `
        padding: 10px;
        background: #fff3e0;
        border-bottom: 1px solid #ccc;
        font-weight: 600;
        text-align: center;
        border-radius: 6px 6px 0 0;
        color: #e65100;
    `;
    colHeader.textContent = label + ' (needs new key)';

    // Scrollable alias list
    const aliasList = document.createElement('div');
    aliasList.style.cssText = `
        flex: 1;
        overflow-y: auto;
        max-height: 200px;
        min-height: 100px;
        padding: 10px;
    `;

    // Collect all aliases with their sources
    const allAliases = collectAllAliasesWithSources(individualName);

    allAliases.forEach((aliasInfo) => {
        const isClickable = aliasInfo.category !== 'primary';
        const aliasEntry = document.createElement('div');
        aliasEntry.style.cssText = `
            padding: 8px;
            margin-bottom: 8px;
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            font-size: 13px;
            ${isClickable ? 'cursor: pointer; transition: all 0.15s ease;' : ''}
        `;

        // Add hover and click behavior for non-primary aliases
        if (isClickable) {
            aliasEntry.addEventListener('mouseenter', () => {
                aliasEntry.style.background = '#e3f2fd';
                aliasEntry.style.borderColor = '#1976d2';
            });
            aliasEntry.addEventListener('mouseleave', () => {
                aliasEntry.style.background = 'white';
                aliasEntry.style.borderColor = '#e0e0e0';
            });
            aliasEntry.addEventListener('click', () => {
                if (onAliasSelect) {
                    onAliasSelect(aliasInfo);
                }
            });
        }

        // Name line
        const nameLine = document.createElement('div');
        nameLine.style.cssText = `font-weight: 600; color: #333; margin-bottom: 4px;`;
        nameLine.textContent = aliasInfo.term;

        // Category badge (if not primary) - add "click to select" hint
        if (aliasInfo.category !== 'primary') {
            const badge = document.createElement('span');
            badge.style.cssText = `
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 3px;
                margin-left: 8px;
                font-weight: normal;
                ${aliasInfo.category === 'homonyms' ? 'background: #c8e6c9; color: #2e7d32;' : ''}
                ${aliasInfo.category === 'synonyms' ? 'background: #fff3e0; color: #ef6c00;' : ''}
                ${aliasInfo.category === 'candidates' ? 'background: #ffebee; color: #c62828;' : ''}
            `;
            badge.textContent = aliasInfo.category;
            nameLine.appendChild(badge);

            // Add "click to use" hint
            const hint = document.createElement('span');
            hint.style.cssText = `font-size: 10px; color: #1976d2; margin-left: 8px; font-style: italic;`;
            hint.textContent = '(click to use)';
            nameLine.appendChild(hint);
        }

        aliasEntry.appendChild(nameLine);

        // Source lines
        aliasInfo.sources.forEach(source => {
            const sourceLine = document.createElement('div');
            sourceLine.style.cssText = `
                font-size: 11px;
                color: #666;
                padding-left: 10px;
                font-family: monospace;
                word-break: break-all;
            `;
            sourceLine.textContent = source;
            aliasEntry.appendChild(sourceLine);
        });

        aliasList.appendChild(aliasEntry);
    });

    // Input and Use button container
    const controlsContainer = document.createElement('div');
    controlsContainer.style.cssText = `
        padding: 10px;
        border-top: 1px solid #ccc;
        background: #fff8e1;
    `;

    // Label for input
    const inputLabel = document.createElement('div');
    inputLabel.style.cssText = `font-size: 12px; font-weight: 600; color: #555; margin-bottom: 5px;`;
    inputLabel.textContent = 'New unique key:';

    // Input box
    const inputBox = document.createElement('input');
    inputBox.type = 'text';
    inputBox.value = initialKey;
    inputBox.style.cssText = `
        width: 100%;
        padding: 8px;
        font-size: 14px;
        border: 2px solid #ff9800;
        border-radius: 4px;
        margin-bottom: 10px;
        box-sizing: border-box;
    `;
    inputBox.addEventListener('focus', () => {
        inputBox.select();
    });

    // Use button
    const useButton = document.createElement('button');
    useButton.style.cssText = `
        background: #ff9800;
        color: white;
        border: none;
        padding: 10px 30px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 600;
        width: 100%;
    `;
    useButton.textContent = 'Use';
    useButton.addEventListener('mouseover', () => { useButton.style.background = '#f57c00'; });
    useButton.addEventListener('mouseout', () => { useButton.style.background = '#ff9800'; });

    controlsContainer.appendChild(inputLabel);
    controlsContainer.appendChild(inputBox);
    controlsContainer.appendChild(useButton);

    // Assemble column
    column.appendChild(colHeader);
    column.appendChild(aliasList);
    column.appendChild(controlsContainer);

    return { column, inputBox, useButton };
}

// Export duplicate resolution function
window.showDuplicateResolutionDialog = showDuplicateResolutionDialog;

/**
 * Test function for duplicate resolution dialog
 * Call from console: testDuplicateResolutionDialog()
 */
async function testDuplicateResolutionDialog() {
    // Create mock existing record
    const existingRecord = {
        primaryAlias: {
            term: 'JOHN SMITH',
            sourceMap: new Map([['visionAppraisal:FireNumber:1234', { index: 0, identifier: 'primary' }]])
        },
        firstName: 'John',
        lastName: 'Smith',
        otherNames: '',
        alternatives: {
            homonyms: [],
            synonyms: [{ term: 'J SMITH', sourceMap: new Map([['visionAppraisal:FireNumber:1234', { index: 0, identifier: 'synonym' }]]) }],
            candidates: []
        }
    };

    // Create mock duplicate record with unique identifiers to verify object references
    const originalPrimaryAlias = {
        term: 'JOHN SMITH',
        sourceMap: new Map([['bloomerang:5678:SimpleIdentifiers', { index: 0, identifier: 'primary' }]]),
        _testId: 'ORIGINAL_PRIMARY'  // Unique identifier for verification
    };

    const homonymAlias = {
        term: 'JOHN A SMITH',
        sourceMap: new Map([['bloomerang:5678:SimpleIdentifiers', { index: 0, identifier: 'homonym' }]]),
        _testId: 'HOMONYM_ALIAS'  // Unique identifier for verification
    };

    const dupeRecord = {
        primaryAlias: originalPrimaryAlias,
        firstName: 'John',
        lastName: 'Smith',
        otherNames: 'Andrew',
        alternatives: {
            homonyms: [homonymAlias],
            synonyms: [],
            candidates: []
        }
    };

    console.log('=== BEFORE RESOLUTION ===');
    console.log('Dupe primaryAlias._testId:', dupeRecord.primaryAlias._testId);
    console.log('Dupe homonyms[0]._testId:', dupeRecord.alternatives.homonyms[0]?._testId);

    const result = await showDuplicateResolutionDialog('JOHN SMITH', existingRecord, dupeRecord);

    if (result) {
        console.log('=== RESOLUTION RESULT ===');
        console.log('resolved:', result.resolved);
        console.log('newKey:', result.newKey);
        console.log('');
        console.log('=== OBJECT VERIFICATION ===');
        console.log('New primaryAlias.term:', result.modifiedRecord.primaryAlias?.term);
        console.log('New primaryAlias._testId:', result.modifiedRecord.primaryAlias?._testId);
        console.log('');
        console.log('Homonyms after resolution:');
        result.modifiedRecord.alternatives?.homonyms?.forEach((h, i) => {
            console.log(`  [${i}] term: "${h.term}", _testId: ${h._testId || '(none - new object)'}`);
        });
        console.log('');

        // Verify object references
        if (result.modifiedRecord.primaryAlias === homonymAlias) {
            console.log('✓ VERIFIED: primaryAlias is the SAME object as the original homonymAlias');
        }
        if (result.modifiedRecord.alternatives?.homonyms?.includes(originalPrimaryAlias)) {
            console.log('✓ VERIFIED: Original primaryAlias object was MOVED to homonyms');
        }
    } else {
        console.log('Dialog was force-closed (result is null) - build should stop');
    }

    return result;
}

window.testDuplicateResolutionDialog = testDuplicateResolutionDialog;

// =============================================================================
// INITIALIZATION ON DOM READY
// =============================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeIndividualNameBrowser);
} else {
    // DOM already ready, but wait a tick for other scripts
    setTimeout(initializeIndividualNameBrowser, 100);
}

// Export functions for global access (onclick handlers)
window.selectIndividualNameBrowserItem = selectIndividualNameBrowserItem;
window.loadIndividualFileFromDrive = loadIndividualFileFromDrive;
window.individualNameBrowser = individualNameBrowser;

console.log('[individualNameBrowser.js] Loaded.');
