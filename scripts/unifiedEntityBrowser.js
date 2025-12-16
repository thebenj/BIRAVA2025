// unifiedEntityBrowser.js - Unified Entity Browser Tool for BIRAVA2025
//
// ARCHITECTURAL PURPOSE: Single comprehensive interface for browsing entities from any data source
// (VisionAppraisal, Bloomerang, future sources) with superior HTML presentation capabilities
// adapted from the VisionAppraisal browser's sophisticated detail view system.
//
// DESIGN PRINCIPLES:
// - Multi-source architecture with easy extensibility for future data sources
// - Unified entity type management (Individual, AggregateHousehold, Business, etc.)
// - Preserve and generalize VisionAppraisal's superior HTML detail presentation
// - Superset functionality combining best features of both existing browsers

// =============================================================================
// GLOBAL STATE MANAGEMENT
// =============================================================================

const unifiedBrowser = {
    // Use existing workingLoadedEntities global instead of separate data management

    // Current state
    selectedDataSource: 'all',  // 'visionappraisal', 'bloomerang', 'all'
    selectedEntityType: 'all',  // specific type or 'all'
    currentResults: [],
    selectedEntity: null,

    // UI state
    searchQuery: '',
    activeFilter: null
};

// =============================================================================
// TRUE MATCH AND NEAR MATCH CRITERIA
// =============================================================================

/**
 * Match criteria thresholds configuration
 * True Match: Any ONE of these conditions makes it a true match
 * Near Match: Same conditions with reduced thresholds (applied when NOT a true match)
 */
const MATCH_CRITERIA = {
    trueMatch: {
        // Condition 1: overall > 0.80 AND name > 0.83
        overallAndName: { overall: 0.80, name: 0.83 },
        // Condition 2: contactInfo > 0.87 (alone)
        contactInfoAlone: 0.87,
        // Condition 3: overall > 0.905 (alone)
        overallAlone: 0.905,
        // Condition 4: name > 0.875 (alone)
        nameAlone: 0.875
    },
    nearMatch: {
        // Same conditions minus 0.03 (except contactInfo which is minus 0.02)
        overallAndName: { overall: 0.77, name: 0.80 },
        contactInfoAlone: 0.85,  // -0.02 per user specification
        overallAlone: 0.875,
        nameAlone: 0.845
    }
};

/**
 * Check if a match qualifies as a True Match
 * @param {number} overallScore - Overall similarity score (0-1)
 * @param {number|null} nameScore - Name similarity score (0-1), may be null
 * @param {number|null} contactInfoScore - ContactInfo similarity score (0-1), may be null
 * @returns {boolean} True if match meets True Match criteria
 */
function isTrueMatch(overallScore, nameScore, contactInfoScore) {
    const c = MATCH_CRITERIA.trueMatch;

    // Condition 1: overall > 0.80 AND name > 0.83
    if (overallScore > c.overallAndName.overall && nameScore !== null && nameScore > c.overallAndName.name) {
        return true;
    }

    // Condition 2: contactInfo > 0.87 (alone)
    if (contactInfoScore !== null && contactInfoScore > c.contactInfoAlone) {
        return true;
    }

    // Condition 3: overall > 0.905 (alone)
    if (overallScore > c.overallAlone) {
        return true;
    }

    // Condition 4: name > 0.875 (alone)
    if (nameScore !== null && nameScore > c.nameAlone) {
        return true;
    }

    return false;
}

/**
 * Check if a match qualifies as a Near Match (but NOT a True Match)
 * @param {number} overallScore - Overall similarity score (0-1)
 * @param {number|null} nameScore - Name similarity score (0-1), may be null
 * @param {number|null} contactInfoScore - ContactInfo similarity score (0-1), may be null
 * @returns {boolean} True if match meets Near Match criteria but NOT True Match criteria
 */
function isNearMatch(overallScore, nameScore, contactInfoScore) {
    // First check: if it's a true match, it's NOT a near match
    if (isTrueMatch(overallScore, nameScore, contactInfoScore)) {
        return false;
    }

    const c = MATCH_CRITERIA.nearMatch;

    // Condition 1: overall > 0.77 AND name > 0.80
    if (overallScore > c.overallAndName.overall && nameScore !== null && nameScore > c.overallAndName.name) {
        return true;
    }

    // Condition 2: contactInfo > 0.85 (alone)
    if (contactInfoScore !== null && contactInfoScore > c.contactInfoAlone) {
        return true;
    }

    // Condition 3: overall > 0.875 (alone)
    if (overallScore > c.overallAlone) {
        return true;
    }

    // Condition 4: name > 0.845 (alone)
    if (nameScore !== null && nameScore > c.nameAlone) {
        return true;
    }

    return false;
}

// =============================================================================
// INITIALIZATION & SETUP
// =============================================================================

/**
 * Initialize the unified entity browser
 * Sets up UI event handlers and prepares data source management
 */
function initializeUnifiedBrowser() {
    console.log("🚀 Initializing Unified Entity Browser");

    // Setup dropdown event handlers
    setupDataSourceSelector();
    setupEntityTypeSelector();

    // Setup search functionality
    setupSearchHandlers();

    // Setup action buttons
    setupActionButtons();

    // Initialize UI state
    updateUIState();

    console.log("✅ Unified Entity Browser initialized");
}

/**
 * Setup data source selector dropdown
 */
function setupDataSourceSelector() {
    const selector = document.getElementById('unifiedDataSourceSelector');
    if (!selector) return;

    selector.addEventListener('change', (event) => {
        unifiedBrowser.selectedDataSource = event.target.value;
        updateEntityTypeOptions();
        updateUIState();
        clearCurrentResults();
        if (hasLoadedData()) {
            applyCurrentFilters();
        }
    });
}

/**
 * Setup entity type selector dropdown
 */
function setupEntityTypeSelector() {
    const selector = document.getElementById('unifiedEntityTypeSelector');
    if (!selector) return;

    selector.addEventListener('change', (event) => {
        unifiedBrowser.selectedEntityType = event.target.value;
        updateUIState();
        if (hasLoadedData()) {
            applyCurrentFilters();
        }
    });
}

/**
 * Setup search input handlers
 */
function setupSearchHandlers() {
    const searchInput = document.getElementById('unifiedSearchInput');
    if (!searchInput) return;

    searchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            performUnifiedSearch();
        }
    });
}

/**
 * Setup action button event handlers
 */
function setupActionButtons() {
    // Load Data button
    const loadBtn = document.getElementById('unifiedLoadDataBtn');
    if (loadBtn) {
        loadBtn.addEventListener('click', loadSelectedData);
    }

    // Search button
    const searchBtn = document.getElementById('unifiedSearchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', performUnifiedSearch);
    }

    // Clear button
    const clearBtn = document.getElementById('unifiedClearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearSearchAndFilters);
    }

    // View Details button
    const detailsBtn = document.getElementById('unifiedViewDetailsBtn');
    if (detailsBtn) {
        detailsBtn.addEventListener('click', viewSelectedEntityDetails);
    }

    // Export button
    const exportBtn = document.getElementById('unifiedExportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportCurrentResults);
    }

    // Stats button - onclick handler already set in index.html
    // const statsBtn = document.getElementById('unifiedStatsBtn');
    // if (statsBtn) {
    //     statsBtn.addEventListener('click', showUnifiedStats);
    // }

    // Analyze Matches button
    const analyzeMatchesBtn = document.getElementById('unifiedAnalyzeMatchesBtn');
    if (analyzeMatchesBtn) {
        analyzeMatchesBtn.addEventListener('click', analyzeSelectedEntityMatches);
    }
}

// =============================================================================
// DATA SOURCE MANAGEMENT
// =============================================================================

/**
 * Load data from selected data source(s)
 * Uses individual loading functions based on dropdown selection to meet specification
 */
async function loadSelectedData() {
    const loadBtn = document.getElementById('unifiedLoadDataBtn');
    const originalText = loadBtn ? loadBtn.innerHTML : '';

    try {
        showUnifiedStatus('Loading data based on selection...', 'loading');
        if (loadBtn) {
            loadBtn.innerHTML = '⏳ Loading...';
            loadBtn.disabled = true;
        }

        // Initialize global storage if not exists
        if (!window.workingLoadedEntities) {
            window.workingLoadedEntities = {
                visionAppraisal: { entities: null, metadata: null, loaded: false },
                bloomerang: { individuals: null, households: null, nonhuman: null, loaded: false },
                status: 'not_loaded'
            };
        }

        // Load dependencies first
        const dependencies = [
            './scripts/objectStructure/aliasClasses.js',
            './scripts/objectStructure/contactInfo.js',
            './scripts/objectStructure/entityClasses.js',
            './scripts/utils/classSerializationUtils.js',
            './scripts/workingEntityLoader.js'
        ];

        console.log('📚 Loading dependencies...');
        for (const script of dependencies) {
            await loadScriptAsync(script);
        }

        // Load data based on dropdown selection
        switch (unifiedBrowser.selectedDataSource) {
            case 'visionappraisal':
                console.log('🏠 Loading VisionAppraisal only...');

                // Reset bloomerang data to ensure clean state
                workingLoadedEntities.bloomerang = { individuals: null, households: null, nonhuman: null, loaded: false };

                // Load only VisionAppraisal
                if (typeof loadVisionAppraisalEntitiesWorking === 'function') {
                    await loadVisionAppraisalEntitiesWorking();
                } else {
                    throw new Error('loadVisionAppraisalEntitiesWorking function not available');
                }
                break;

            case 'bloomerang':
                console.log('👥 Loading Bloomerang only...');

                // Reset VisionAppraisal data to ensure clean state
                workingLoadedEntities.visionAppraisal = { entities: null, metadata: null, loaded: false };

                // Load only Bloomerang
                let configFileId = null;
                if (typeof getBloomerangConfigFileId === 'function') {
                    try {
                        configFileId = getBloomerangConfigFileId();
                        if (configFileId) {
                            console.log('📄 Using config file ID from input:', configFileId);
                        }
                    } catch (error) {
                        console.log('⚠️ No config file ID provided, using default folder search');
                        configFileId = null;
                    }
                }

                if (typeof loadBloomerangCollectionsWorking === 'function') {
                    await loadBloomerangCollectionsWorking(configFileId);
                } else {
                    throw new Error('loadBloomerangCollectionsWorking function not available');
                }
                break;

            case 'all':
            default:
                console.log('🌐 Loading all data sources...');

                // Use existing loadAllEntitiesIntoMemory function for "All Sources"
                if (typeof loadAllEntitiesIntoMemory === 'function') {
                    await loadAllEntitiesIntoMemory();
                } else {
                    throw new Error('loadAllEntitiesIntoMemory function not available');
                }
                break;
        }

        showUnifiedStatus('Data loaded successfully!', 'success');

        // CRITICAL FIX: Ensure workingLoadedEntities.status is set to 'loaded'
        if (window.workingLoadedEntities) {
            workingLoadedEntities.status = 'loaded';
        }

        showAllEntities();

    } catch (error) {
        console.error('❌ Error loading data:', error);
        showUnifiedStatus(`Error loading data: ${error.message}`, 'error');
    } finally {
        if (loadBtn) {
            loadBtn.innerHTML = originalText;
            loadBtn.disabled = false;
        }
    }
}

// Remove old loading functions - use existing system instead

// =============================================================================
// ENTITY RETRIEVAL & MANAGEMENT
// =============================================================================

/**
 * Get all entities from currently selected data source(s) and entity type(s)
 * Uses compatibility layer to work with either unifiedEntityDatabase or workingLoadedEntities
 * @returns {Array} Array of entity wrapper objects with source metadata
 */
function getAllSelectedEntities() {
    // Use compatibility layer if available
    if (typeof getFilteredEntities === 'function' && typeof isEntityDatabaseLoaded === 'function') {
        if (!isEntityDatabaseLoaded()) {
            console.warn('Entity database not loaded');
            return [];
        }

        // Map dropdown values to filter values
        const sourceFilter = unifiedBrowser.selectedDataSource === 'all' ? 'all' :
            (unifiedBrowser.selectedDataSource === 'visionappraisal' ? 'visionAppraisal' : 'bloomerang');

        // Get filtered entities from compatibility layer
        const filteredEntities = getFilteredEntities(sourceFilter, unifiedBrowser.selectedEntityType);

        // Convert to entityWrapper format for browser display
        const entities = [];
        for (const [key, entity] of Object.entries(filteredEntities)) {
            const isVisionAppraisal = key.startsWith('visionAppraisal:');
            entities.push({
                source: isVisionAppraisal ? 'VisionAppraisal' : 'Bloomerang',
                sourceKey: isVisionAppraisal ? 'visionappraisal' : 'bloomerang',
                entityType: getEntityType(entity),
                index: key,  // Use unified key as index
                key: key,    // Use unified key directly (e.g., 'visionAppraisal:FireNumber:1510')
                entity: entity
            });
        }

        return entities;
    }

    // Keyed Database is required - no legacy fallback
    console.error('Keyed Database not loaded. Use "Load Unified Database" or "Load All Entities Into Memory" first.');
    return [];
}

/**
 * Get entity type from entity object
 * @param {Object} entity - Entity object
 * @returns {string} Entity type name
 */
function getEntityType(entity) {
    // For deserialized class instances, constructor.name is the correct type
    // entity.type is only present in serialized (raw) data
    return entity.constructor?.name || entity.type || 'Unknown';
}

/**
 * Check if any data is currently loaded
 * @returns {boolean} True if any data source has loaded data
 */
function hasLoadedData() {
    // Use compatibility layer if available
    if (typeof isEntityDatabaseLoaded === 'function') {
        return isEntityDatabaseLoaded();
    }
    // Fallback to legacy check
    return window.workingLoadedEntities && workingLoadedEntities.status === 'loaded';
}

// =============================================================================
// SEARCH & FILTERING
// =============================================================================

/**
 * Perform unified search across loaded data
 */
function performUnifiedSearch() {
    const query = document.getElementById('unifiedSearchInput')?.value?.trim()?.toLowerCase();
    unifiedBrowser.searchQuery = query || '';

    if (!query) {
        showAllEntities();
        return;
    }

    if (!hasLoadedData()) {
        showUnifiedStatus('Please load data first', 'error');
        return;
    }

    const allEntities = getAllSelectedEntities();
    const results = allEntities.filter(entityWrapper =>
        unifiedEntityMatchesQuery(entityWrapper, query)
    );

    displayUnifiedResults(results);
    updateResultsCount(`Found ${results.length} results for "${query}"`);
}

/**
 * Check if entity matches search query
 * @param {Object} entityWrapper - Entity wrapper with source metadata
 * @param {string} query - Search query
 * @returns {boolean} True if entity matches query
 */
function unifiedEntityMatchesQuery(entityWrapper, query) {
    // Search entity key
    if (entityWrapper.key.toLowerCase().includes(query)) return true;

    // Deep search across all entity data
    const entityStr = JSON.stringify(entityWrapper.entity).toLowerCase();
    return entityStr.includes(query);
}

/**
 * Apply quick filter
 * @param {string} filterType - Type of filter to apply
 */
function applyQuickFilter(filterType) {
    unifiedBrowser.activeFilter = filterType;

    if (!hasLoadedData()) {
        showUnifiedStatus('Please load data first', 'error');
        return;
    }

    const allEntities = getAllSelectedEntities();
    let results = allEntities;

    switch (filterType) {
        case 'account':
            results = allEntities.filter(ew =>
                ew.key.includes('account') ||
                JSON.stringify(ew.entity).toLowerCase().includes('account')
            );
            break;
        case 'fire':
            results = allEntities.filter(ew =>
                JSON.stringify(ew.entity).toLowerCase().includes('fire')
            );
            break;
        case 'pid':
            results = allEntities.filter(ew =>
                JSON.stringify(ew.entity).toLowerCase().includes('pid')
            );
            break;
        case 'name':
            results = allEntities.filter(ew =>
                ew.entity.name
            );
            break;
        case 'all':
        default:
            results = allEntities;
            break;
    }

    displayUnifiedResults(results);
    updateResultsCount(`Showing ${results.length} entities filtered by ${filterType}`);
}

/**
 * Show all entities (no filtering)
 */
function showAllEntities() {
    if (!hasLoadedData()) {
        showUnifiedStatus('Please load data first', 'error');
        return;
    }

    const allEntities = getAllSelectedEntities();
    displayUnifiedResults(allEntities);
    updateResultsCount(`Showing all ${allEntities.length} entities`);
}

/**
 * Apply current filters and search
 */
function applyCurrentFilters() {
    if (unifiedBrowser.searchQuery) {
        performUnifiedSearch();
    } else if (unifiedBrowser.activeFilter) {
        applyQuickFilter(unifiedBrowser.activeFilter);
    } else {
        showAllEntities();
    }
}

/**
 * Clear search and filters
 */
function clearSearchAndFilters() {
    // Clear search input
    const searchInput = document.getElementById('unifiedSearchInput');
    if (searchInput) {
        searchInput.value = '';
    }

    // Reset state
    unifiedBrowser.searchQuery = '';
    unifiedBrowser.activeFilter = null;
    unifiedBrowser.selectedEntity = null;

    // Show all entities if data is loaded
    if (hasLoadedData()) {
        showAllEntities();
    } else {
        clearCurrentResults();
    }
}

// =============================================================================
// UI MANAGEMENT
// =============================================================================

/**
 * Display unified search results
 * @param {Array} results - Array of entity wrappers
 */
function displayUnifiedResults(results) {
    const resultsList = document.getElementById('unifiedResultsList');
    if (!resultsList) return;

    unifiedBrowser.currentResults = results;

    if (results.length === 0) {
        resultsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No results found</div>';
        return;
    }

    const html = results.map((entityWrapper, displayIndex) => {
        const entityName = extractUnifiedEntityName(entityWrapper.entity);
        const entityDetails = extractUnifiedEntityDetails(entityWrapper);

        return `
            <div class="unified-result-item" onclick="selectUnifiedEntity(${displayIndex}, this)">
                <div class="unified-entity-header">
                    <span class="unified-source-badge unified-source-${entityWrapper.sourceKey}">
                        ${entityWrapper.source}
                    </span>
                    <span class="unified-entity-type">${entityWrapper.entityType}</span>
                </div>
                <div class="unified-entity-key">${entityWrapper.key}</div>
                <div class="unified-entity-name">${entityName}</div>
                <div class="unified-entity-details">${entityDetails}</div>
            </div>
        `;
    }).join('');

    resultsList.innerHTML = html;
}

/**
 * Extract display name from any entity
 * Based on actual entity structures from comprehensive analysis
 * @param {Object} entity - Entity object
 * @returns {string} Display name
 */
function extractUnifiedEntityName(entity) {
    if (!entity.name) return 'Unknown';

    // Handle primaryAlias pattern (most common based on analysis)
    // Examples: {"type":"HouseholdName","primaryAlias":{"type":"AttributedTerm","term":"LOPES HELDER & MARIA FATIMA"...
    if (entity.name.primaryAlias && entity.name.primaryAlias.term) {
        return entity.name.primaryAlias.term;
    }

    // Handle direct AttributedTerm names
    if (entity.name.term) {
        return entity.name.term;
    }

    // Handle IndividualName with specific structure
    if (entity.name.type === 'IndividualName') {
        if (entity.name.completeName) return entity.name.completeName;
        if (entity.name.firstName && entity.name.lastName) {
            return `${entity.name.firstName} ${entity.name.lastName}`;
        }
    }

    // Handle other structured names
    if (entity.name.completeName) return entity.name.completeName;
    if (entity.name.fullName) return entity.name.fullName;

    // Handle nested identifier pattern (fallback)
    if (entity.name.identifier) {
        if (entity.name.identifier.term) return entity.name.identifier.term;
        if (entity.name.identifier.primaryAlias && entity.name.identifier.primaryAlias.term) {
            return entity.name.identifier.primaryAlias.term;
        }
    }

    // Use extractNameWorking function if available (from existing system)
    if (typeof extractNameWorking === 'function') {
        try {
            const extractedName = extractNameWorking(entity);
            if (extractedName && typeof extractedName === 'string' && extractedName !== '[No name found]') {
                return extractedName;
            }
        } catch (error) {
            console.warn('extractNameWorking failed:', error);
        }
    }

    return 'Name available';
}

/**
 * Extract entity details for display
 * Based on actual entity structures from comprehensive analysis
 * @param {Object} entityWrapper - Entity wrapper with metadata
 * @returns {string} Details string
 */
function extractUnifiedEntityDetails(entityWrapper) {
    const entity = entityWrapper.entity;
    const details = [];

    // Add location identifier information (handle object and legacy raw value structures)
    if (entity.locationIdentifier) {
        if (entity.locationIdentifier.primaryAlias && entity.locationIdentifier.primaryAlias.term) {
            // Proper FireNumber/PID object structure (Cases 6-7 correct, Cases 4-5 after fix)
            const locType = entity.locationIdentifier.type || 'Location';
            details.push(`${locType}: ${entity.locationIdentifier.primaryAlias.term}`);
        } else if (typeof entity.locationIdentifier === 'number' || typeof entity.locationIdentifier === 'string') {
            // Legacy raw values (Cases 4-5 before fix)
            details.push(`Location: ${entity.locationIdentifier}`);
        } else if (entity.locationIdentifier.term) {
            // Direct AttributedTerm structure
            details.push(`Location: ${entity.locationIdentifier.term}`);
        }
    }

    // Add account number (handle multiple structures: SimpleIdentifiers, IndicativeData, or direct terms)
    if (entity.accountNumber) {
        if (entity.accountNumber.primaryAlias && entity.accountNumber.primaryAlias.term) {
            // SimpleIdentifiers structure (expected after Case 9 fix)
            details.push(`Account: ${entity.accountNumber.primaryAlias.term}`);
        } else if (entity.accountNumber.identifier && entity.accountNumber.identifier.primaryAlias && entity.accountNumber.identifier.primaryAlias.term) {
            // IndicativeData structure (Case 9 current problem structure)
            details.push(`Account: ${entity.accountNumber.identifier.primaryAlias.term}`);
        } else if (entity.accountNumber.term) {
            // Direct AttributedTerm structure
            details.push(`Account: ${entity.accountNumber.term}`);
        }
    }

    // Add contact info if available and has addresses
    if (entity.contactInfo && entity.contactInfo.primaryAddress) {
        const address = entity.contactInfo.primaryAddress;
        const addressParts = [];

        // Build address string from AttributedTerm components
        if (address.streetNumber && address.streetNumber.term) {
            addressParts.push(address.streetNumber.term);
        }
        if (address.streetName && address.streetName.term) {
            addressParts.push(address.streetName.term);
        }
        if (address.streetType && address.streetType.term) {
            addressParts.push(address.streetType.term);
        }
        if (address.city && address.city.term) {
            addressParts.push(address.city.term);
        }
        if (address.state && address.state.term) {
            addressParts.push(address.state.term);
        }
        if (address.zipCode && address.zipCode.term) {
            addressParts.push(address.zipCode.term);
        }

        if (addressParts.length > 0) {
            details.push(`Address: ${addressParts.join(' ')}`);
        } else if (address.originalAddress && address.originalAddress.term) {
            // Fallback to original address string if parsed components not available
            details.push(`Address: ${address.originalAddress.term}`);
        }
    }

    // Add additional identifiers for VisionAppraisal entities
    if (entityWrapper.source === 'VisionAppraisal') {
        // MBLU information
        if (entity.mblu && entity.mblu.term) {
            details.push(`MBLU: ${entity.mblu.term}`);
        }

        // Fire number (handle both legacy raw numbers and new object structure)
        if (entity.fireNumber) {
            if (typeof entity.fireNumber === 'number') {
                // Legacy raw number (should be rare after Cases 4-5 fix)
                details.push(`Fire #: ${entity.fireNumber}`);
            } else if (entity.fireNumber.primaryAlias && entity.fireNumber.primaryAlias.term) {
                // New FireNumber object structure (Cases 4-5 fix)
                details.push(`Fire #: ${entity.fireNumber.primaryAlias.term}`);
            } else if (entity.fireNumber.term) {
                // Direct AttributedTerm structure
                details.push(`Fire #: ${entity.fireNumber.term}`);
            }
        }
    }

    return details.join(' | ') || 'Details available';
}

/**
 * Select an entity for detailed viewing
 * @param {number} index - Index in current results
 * @param {Element} element - Clicked element
 */
function selectUnifiedEntity(index, element) {
    // Remove previous selection
    document.querySelectorAll('.unified-result-item').forEach(item => {
        item.classList.remove('unified-selected');
    });

    // Highlight selected item
    element.classList.add('unified-selected');

    // Store selected entity
    unifiedBrowser.selectedEntity = unifiedBrowser.currentResults[index];

    console.log('Selected entity:', unifiedBrowser.selectedEntity);
}

/**
 * Update entity type dropdown options based on selected data source
 */
function updateEntityTypeOptions() {
    const selector = document.getElementById('unifiedEntityTypeSelector');
    if (!selector) return;

    // Get available entity types for selected data source from loaded data
    let availableTypes = new Set(['All Types']);

    // Add common entity types that we know exist
    const commonTypes = ['Individual', 'AggregateHousehold', 'Business', 'LegalConstruct', 'NonHuman', 'CompositeHousehold'];
    commonTypes.forEach(type => availableTypes.add(type));

    // If data is loaded, get actual entity types from the data
    if (hasLoadedData()) {
        const allEntities = getAllSelectedEntities();
        allEntities.forEach(entityWrapper => {
            availableTypes.add(entityWrapper.entityType);
        });
    }

    // Update dropdown options
    const currentValue = selector.value;
    selector.innerHTML = '';

    Array.from(availableTypes).sort().forEach(type => {
        const option = document.createElement('option');
        option.value = type === 'All Types' ? 'all' : type;
        option.textContent = type;
        selector.appendChild(option);
    });

    // Restore selection if still valid
    if (Array.from(selector.options).some(opt => opt.value === currentValue)) {
        selector.value = currentValue;
        unifiedBrowser.selectedEntityType = currentValue;
    } else {
        selector.value = 'all';
        unifiedBrowser.selectedEntityType = 'all';
    }
}

/**
 * Update UI state based on current selections
 */
function updateUIState() {
    // Update load button text
    const loadBtn = document.getElementById('unifiedLoadDataBtn');
    if (loadBtn) {
        switch (unifiedBrowser.selectedDataSource) {
            case 'visionappraisal':
                loadBtn.textContent = '📁 Load VisionAppraisal Data';
                break;
            case 'bloomerang':
                loadBtn.textContent = '📁 Load Bloomerang Data';
                break;
            case 'all':
                loadBtn.textContent = '📁 Load All Data Sources';
                break;
        }
    }

    // Update status message
    if (!hasLoadedData()) {
        updateResultsCount('Select data source and click Load to begin');
    }
}

/**
 * Update results count display
 * @param {string} message - Message to display
 */
function updateResultsCount(message) {
    const countElement = document.getElementById('unifiedResultsCount');
    if (countElement) {
        countElement.textContent = message;
    }
}

/**
 * Clear current results display
 */
function clearCurrentResults() {
    const resultsList = document.getElementById('unifiedResultsList');
    if (resultsList) {
        resultsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Select data source and load data to begin browsing</div>';
    }

    unifiedBrowser.currentResults = [];
    unifiedBrowser.selectedEntity = null;
    updateResultsCount('No data loaded');
}

/**
 * Show status message to user
 * @param {string} message - Status message
 * @param {string} type - Message type ('loading', 'success', 'error')
 */
function showUnifiedStatus(message, type) {
    const statusElement = document.getElementById('unifiedStatusMessage');
    if (!statusElement) return;

    statusElement.textContent = message;
    statusElement.className = `unified-status-message unified-status-${type}`;
    statusElement.style.display = 'block';

    // Auto-hide success messages
    if (type === 'success') {
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 3000);
    }
}

// =============================================================================
// ACTION FUNCTIONS
// =============================================================================

/**
 * View selected entity details using enhanced HTML presentation
 */
function viewSelectedEntityDetails() {
    if (!unifiedBrowser.selectedEntity) {
        showUnifiedStatus('Please select an entity first', 'error');
        return;
    }

    // Use the sophisticated entityRenderer display
    if (typeof renderEntityDetailsWindow === 'function') {
        renderEntityDetailsWindow(unifiedBrowser.selectedEntity);
    } else {
        // Fallback to basic display
        basicEntityDetailsView(unifiedBrowser.selectedEntity);
    }
}

/**
 * Dynamic recursive entity details view
 * Renders entity properties with:
 * - Null properties: property name + null indicator
 * - Primitive properties: labeled values
 * - Object properties: one level shown + expand button for recursive exploration
 * @param {Object} entityWrapper - Selected entity wrapper
 */
function basicEntityDetailsView(entityWrapper) {
    const detailsWindow = window.open('', '_blank', 'width=1000,height=700,scrollbars=yes');

    // Generate the CSS styles
    const styles = generateEntityExplorerStyles();

    // Reset the data store for this render
    window._entityExplorerDataStore = {};
    window._entityExplorerIdCounter = 0;

    // Generate the initial entity content (this populates _entityExplorerDataStore)
    const entityContent = renderObjectProperties(entityWrapper.entity, 'entity');

    // Serialize the data store to pass to the new window
    const dataStoreJson = JSON.stringify(window._entityExplorerDataStore, (key, value) => {
        if (typeof value === 'function') return '[function]';
        return value;
    });

    // Generate the JavaScript functions for the window
    const scripts = generateEntityExplorerScripts(dataStoreJson);

    detailsWindow.document.write(`
        <html>
            <head>
                <title>Entity Explorer: ${entityWrapper.key}</title>
                <style>${styles}</style>
            </head>
            <body>
                <div class="explorer-header">
                    <h2>Entity Explorer</h2>
                    <div class="entity-meta">
                        <span class="meta-badge source-badge">${entityWrapper.source}</span>
                        <span class="meta-badge type-badge">${entityWrapper.entityType}</span>
                        <span class="meta-badge key-badge">${entityWrapper.key}</span>
                    </div>
                </div>
                <div class="explorer-content">
                    ${entityContent}
                </div>
                <script>${scripts}</script>
            </body>
        </html>
    `);
    detailsWindow.document.close();
}

/**
 * Generate CSS styles for the entity explorer
 * @returns {string} CSS styles
 */
function generateEntityExplorerStyles() {
    return `
        * { box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            padding: 20px;
            margin: 0;
            background: #f5f7fa;
            color: #333;
        }
        .explorer-header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .explorer-header h2 {
            margin: 0 0 15px 0;
            color: #2c3e50;
        }
        .entity-meta {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        .meta-badge {
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 500;
        }
        .source-badge { background: #3498db; color: white; }
        .type-badge { background: #27ae60; color: white; }
        .key-badge { background: #7f8c8d; color: white; }

        .explorer-content {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .property-row {
            padding: 8px 12px;
            border-bottom: 1px solid #eee;
            display: flex;
            align-items: flex-start;
            gap: 15px;
        }
        .property-row:last-child { border-bottom: none; }
        .property-row:hover { background: #f8f9fa; }

        .property-name {
            font-weight: 600;
            color: #2c3e50;
            min-width: 150px;
            flex-shrink: 0;
        }
        .property-value {
            flex-grow: 1;
            word-break: break-word;
        }

        /* Null values */
        .value-null {
            color: #95a5a6;
            font-style: italic;
        }

        /* Primitive values */
        .value-string { color: #27ae60; }
        .value-number { color: #2980b9; }
        .value-boolean { color: #8e44ad; }

        /* Object container */
        .object-container {
            background: #f8f9fa;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 10px;
            margin-top: 5px;
        }
        .object-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 8px;
        }
        .object-type-label {
            font-size: 12px;
            background: #e74c3c;
            color: white;
            padding: 3px 8px;
            border-radius: 3px;
        }
        .expand-btn {
            background: #3498db;
            color: white;
            border: none;
            padding: 5px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background 0.2s;
        }
        .expand-btn:hover { background: #2980b9; }

        .object-preview {
            font-size: 13px;
            color: #666;
        }
        .object-preview .preview-property {
            margin: 4px 0;
            padding-left: 10px;
            border-left: 2px solid #ddd;
        }

        /* Array styling */
        .array-container {
            background: #fff3e0;
            border: 1px solid #ffcc80;
        }
        .array-type-label {
            background: #ff9800;
        }
        .array-item {
            padding: 8px;
            border-bottom: 1px dashed #ffcc80;
        }
        .array-item:last-child { border-bottom: none; }
        .array-index {
            font-weight: 600;
            color: #e65100;
            margin-right: 10px;
        }

        /* Modal for expanded objects */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        .modal-content {
            background: white;
            padding: 20px;
            border-radius: 8px;
            max-width: 90%;
            max-height: 90%;
            overflow: auto;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            min-width: 500px;
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #eee;
        }
        .modal-title {
            font-size: 18px;
            font-weight: 600;
            color: #2c3e50;
        }
        .modal-close {
            background: #e74c3c;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        .modal-close:hover { background: #c0392b; }
    `;
}

/**
 * Generate JavaScript functions for the entity explorer window
 * @param {string} dataStoreJson - JSON string of the initial data store
 * @returns {string} JavaScript code
 */
function generateEntityExplorerScripts(dataStoreJson) {
    // Escape the JSON for embedding in a script tag
    const escapedJson = dataStoreJson
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/<\/script>/gi, '<\\/script>');

    return `
        // Initialize data store with pre-rendered data
        window.entityDataStore = JSON.parse('${escapedJson}');
        console.log('Entity data store initialized with', Object.keys(window.entityDataStore).length, 'items');

        // Expand an object into a modal
        function expandObject(dataId, propertyName) {
            const data = window.entityDataStore[dataId];
            if (!data) {
                console.error('Data not found for ID:', dataId, 'Available keys:', Object.keys(window.entityDataStore));
                return;
            }

            // Create modal overlay
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.onclick = function(e) {
                if (e.target === overlay) {
                    document.body.removeChild(overlay);
                }
            };

            // Create modal content
            const modal = document.createElement('div');
            modal.className = 'modal-content';

            // Determine type label
            const isArray = Array.isArray(data);
            const typeLabel = isArray ? 'Array[' + data.length + ']' : (data.constructor?.name || 'Object');

            modal.innerHTML = \`
                <div class="modal-header">
                    <span class="modal-title">\${propertyName} <span class="object-type-label">\${typeLabel}</span></span>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">Close</button>
                </div>
                <div class="modal-body">
                    \${renderObjectForModal(data)}
                </div>
            \`;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);
        }

        // Render object content for modal
        function renderObjectForModal(obj) {
            if (obj === null) return '<span class="value-null">null</span>';
            if (obj === undefined) return '<span class="value-null">undefined</span>';

            const type = typeof obj;

            // Primitives
            if (type === 'string') return '<span class="value-string">"' + escapeHtml(obj) + '"</span>';
            if (type === 'number') return '<span class="value-number">' + obj + '</span>';
            if (type === 'boolean') return '<span class="value-boolean">' + obj + '</span>';

            // Arrays
            if (Array.isArray(obj)) {
                if (obj.length === 0) return '<span class="value-null">[empty array]</span>';

                let html = '<div class="object-container array-container">';
                obj.forEach((item, index) => {
                    html += '<div class="array-item">';
                    html += '<span class="array-index">[' + index + ']</span>';
                    html += renderValueForModal(item, 'item_' + index);
                    html += '</div>';
                });
                html += '</div>';
                return html;
            }

            // Objects
            if (type === 'object') {
                const keys = Object.keys(obj);
                if (keys.length === 0) return '<span class="value-null">{empty object}</span>';

                let html = '<div class="object-container">';
                keys.forEach(key => {
                    html += '<div class="property-row">';
                    html += '<span class="property-name">' + escapeHtml(key) + '</span>';
                    html += '<span class="property-value">' + renderValueForModal(obj[key], key) + '</span>';
                    html += '</div>';
                });
                html += '</div>';
                return html;
            }

            return '<span class="value-null">[unknown type]</span>';
        }

        // Render a single value for modal (with recursive expansion support)
        function renderValueForModal(value, propName) {
            if (value === null) return '<span class="value-null">null</span>';
            if (value === undefined) return '<span class="value-null">undefined</span>';

            const type = typeof value;

            if (type === 'string') return '<span class="value-string">"' + escapeHtml(value) + '"</span>';
            if (type === 'number') return '<span class="value-number">' + value + '</span>';
            if (type === 'boolean') return '<span class="value-boolean">' + value + '</span>';

            // For objects and arrays, create expand button
            if (type === 'object') {
                const dataId = 'modal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                window.entityDataStore[dataId] = value;

                const isArray = Array.isArray(value);
                const typeLabel = isArray ? 'Array[' + value.length + ']' : (value.constructor?.name || 'Object');

                // Show preview of first level
                let preview = '';
                if (isArray && value.length > 0) {
                    preview = value.slice(0, 2).map((item, i) => {
                        const itemPreview = typeof item === 'object' && item !== null
                            ? (item.constructor?.name || 'Object')
                            : String(item).substring(0, 30);
                        return '[' + i + ']: ' + escapeHtml(itemPreview);
                    }).join(', ');
                    if (value.length > 2) preview += '...';
                } else if (!isArray) {
                    const keys = Object.keys(value).slice(0, 3);
                    preview = keys.map(k => k + ': ' + getValuePreview(value[k])).join(', ');
                    if (Object.keys(value).length > 3) preview += '...';
                }

                return \`
                    <div class="object-container \${isArray ? 'array-container' : ''}">
                        <div class="object-header">
                            <span class="object-type-label \${isArray ? 'array-type-label' : ''}">\${typeLabel}</span>
                            <button class="expand-btn" onclick="expandObject('\${dataId}', '\${escapeHtml(propName)}')">Expand</button>
                        </div>
                        <div class="object-preview">\${escapeHtml(preview)}</div>
                    </div>
                \`;
            }

            return '<span class="value-null">[unknown]</span>';
        }

        // Get a short preview of a value
        function getValuePreview(value) {
            if (value === null) return 'null';
            if (value === undefined) return 'undefined';
            const type = typeof value;
            if (type === 'string') return '"' + value.substring(0, 20) + (value.length > 20 ? '...' : '') + '"';
            if (type === 'number' || type === 'boolean') return String(value);
            if (Array.isArray(value)) return 'Array[' + value.length + ']';
            if (type === 'object') return value.constructor?.name || 'Object';
            return '[' + type + ']';
        }

        // Escape HTML to prevent XSS
        function escapeHtml(str) {
            if (typeof str !== 'string') return str;
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }
    `;
}

/**
 * Render object properties for initial display
 * @param {Object} obj - Object to render
 * @param {string} prefix - Prefix for unique IDs
 * @returns {string} HTML content
 */
function renderObjectProperties(obj, prefix) {
    if (obj === null || obj === undefined) {
        return '<div class="property-row"><span class="value-null">null</span></div>';
    }

    const keys = Object.keys(obj);
    if (keys.length === 0) {
        return '<div class="property-row"><span class="value-null">{empty object}</span></div>';
    }

    let html = '';

    keys.forEach((key, index) => {
        const value = obj[key];
        const dataId = `${prefix}_${index}_${Date.now()}`;

        html += '<div class="property-row">';
        html += `<span class="property-name">${escapeHtmlForBrowser(key)}</span>`;
        html += '<span class="property-value">';
        html += renderPropertyValue(value, key, dataId);
        html += '</span>';
        html += '</div>';
    });

    return html;
}

/**
 * Render a single property value
 * @param {*} value - Value to render
 * @param {string} propertyName - Name of the property
 * @param {string} dataId - Unique ID for this value
 * @returns {string} HTML content
 */
function renderPropertyValue(value, propertyName, dataId) {
    // Null/undefined
    if (value === null) {
        return '<span class="value-null">null</span>';
    }
    if (value === undefined) {
        return '<span class="value-null">undefined</span>';
    }

    const type = typeof value;

    // Primitives
    if (type === 'string') {
        return `<span class="value-string">"${escapeHtmlForBrowser(value)}"</span>`;
    }
    if (type === 'number') {
        return `<span class="value-number">${value}</span>`;
    }
    if (type === 'boolean') {
        return `<span class="value-boolean">${value}</span>`;
    }

    // Functions (show indicator, not expandable)
    if (type === 'function') {
        return '<span class="value-null">[function]</span>';
    }

    // Arrays
    if (Array.isArray(value)) {
        return renderArrayPreview(value, propertyName, dataId);
    }

    // Objects
    if (type === 'object') {
        return renderObjectPreview(value, propertyName, dataId);
    }

    return '<span class="value-null">[unknown type]</span>';
}

/**
 * Generate a unique ID for the data store
 * @returns {string} Unique ID
 */
function generateDataStoreId() {
    if (!window._entityExplorerIdCounter) {
        window._entityExplorerIdCounter = 0;
    }
    return `data_${window._entityExplorerIdCounter++}`;
}

/**
 * Render array with preview and expand button
 * @param {Array} arr - Array to render
 * @param {string} propertyName - Property name
 * @param {string} dataId - Unique ID (unused, we generate our own)
 * @returns {string} HTML content
 */
function renderArrayPreview(arr, propertyName, dataId) {
    if (arr.length === 0) {
        return '<span class="value-null">[empty array]</span>';
    }

    // Generate unique ID and store data
    const storeId = generateDataStoreId();
    if (!window._entityExplorerDataStore) {
        window._entityExplorerDataStore = {};
    }
    window._entityExplorerDataStore[storeId] = arr;

    // Generate preview of first few items
    let previewItems = [];
    const maxPreview = Math.min(3, arr.length);
    for (let i = 0; i < maxPreview; i++) {
        const item = arr[i];
        previewItems.push(`<div class="preview-property">[${i}]: ${getValuePreviewStatic(item)}</div>`);
    }
    if (arr.length > maxPreview) {
        previewItems.push(`<div class="preview-property">... and ${arr.length - maxPreview} more items</div>`);
    }

    return `
        <div class="object-container array-container">
            <div class="object-header">
                <span class="object-type-label array-type-label">Array[${arr.length}]</span>
                <button class="expand-btn" onclick="expandObject('${storeId}', '${escapeHtmlForBrowser(propertyName)}')">Expand</button>
            </div>
            <div class="object-preview">${previewItems.join('')}</div>
        </div>
    `;
}

/**
 * Render object with preview and expand button
 * @param {Object} obj - Object to render
 * @param {string} propertyName - Property name
 * @param {string} dataId - Unique ID (unused, we generate our own)
 * @returns {string} HTML content
 */
function renderObjectPreview(obj, propertyName, dataId) {
    const keys = Object.keys(obj);
    if (keys.length === 0) {
        return '<span class="value-null">{empty object}</span>';
    }

    // Get the constructor name for display
    const typeName = obj.constructor?.name || 'Object';

    // Generate unique ID and store data
    const storeId = generateDataStoreId();
    if (!window._entityExplorerDataStore) {
        window._entityExplorerDataStore = {};
    }
    window._entityExplorerDataStore[storeId] = obj;

    // Generate preview of first few properties
    let previewItems = [];
    const maxPreview = Math.min(4, keys.length);
    for (let i = 0; i < maxPreview; i++) {
        const key = keys[i];
        const value = obj[key];
        previewItems.push(`<div class="preview-property"><strong>${escapeHtmlForBrowser(key)}:</strong> ${getValuePreviewStatic(value)}</div>`);
    }
    if (keys.length > maxPreview) {
        previewItems.push(`<div class="preview-property">... and ${keys.length - maxPreview} more properties</div>`);
    }

    return `
        <div class="object-container">
            <div class="object-header">
                <span class="object-type-label">${escapeHtmlForBrowser(typeName)}</span>
                <button class="expand-btn" onclick="expandObject('${storeId}', '${escapeHtmlForBrowser(propertyName)}')">Expand</button>
            </div>
            <div class="object-preview">${previewItems.join('')}</div>
        </div>
    `;
}

/**
 * Get a short preview string for a value (static, no JS needed)
 * @param {*} value - Value to preview
 * @returns {string} Preview string
 */
function getValuePreviewStatic(value) {
    if (value === null) return '<span class="value-null">null</span>';
    if (value === undefined) return '<span class="value-null">undefined</span>';

    const type = typeof value;

    if (type === 'string') {
        const truncated = value.length > 40 ? value.substring(0, 40) + '...' : value;
        return `<span class="value-string">"${escapeHtmlForBrowser(truncated)}"</span>`;
    }
    if (type === 'number') {
        return `<span class="value-number">${value}</span>`;
    }
    if (type === 'boolean') {
        return `<span class="value-boolean">${value}</span>`;
    }
    if (type === 'function') {
        return '<span class="value-null">[function]</span>';
    }
    if (Array.isArray(value)) {
        return `<span class="value-null">Array[${value.length}]</span>`;
    }
    if (type === 'object') {
        const typeName = value.constructor?.name || 'Object';
        return `<span class="value-null">${escapeHtmlForBrowser(typeName)}</span>`;
    }

    return '<span class="value-null">[unknown]</span>';
}

/**
 * Escape HTML characters for safe display in browser
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtmlForBrowser(str) {
    if (typeof str !== 'string') return String(str);
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// =============================================================================
// MATCH ANALYSIS FUNCTIONS
// =============================================================================

/**
 * Analyze matching process for the selected entity
 * Shows all comparisons with detailed breakdowns
 */
async function analyzeSelectedEntityMatches() {
    if (!unifiedBrowser.selectedEntity) {
        showUnifiedStatus('Please select an entity first', 'error');
        return;
    }

    const entityWrapper = unifiedBrowser.selectedEntity;
    const entity = entityWrapper.entity;

    showUnifiedStatus('Analyzing matches... This may take a moment.', 'loading');

    try {
        // Load the universalEntityMatcher if not already loaded
        if (typeof findBestMatches !== 'function') {
            await loadScriptAsync('./scripts/matching/universalEntityMatcher.js');
        }

        // Also ensure utils.js is loaded for comparison functions
        if (typeof levenshteinSimilarity !== 'function') {
            await loadScriptAsync('./scripts/utils.js');
        }

        // Perform the match analysis
        // Pass the base entity's database key so it can be used for direct lookup during reconciliation
        let matchResults;
        if (typeof findBestMatches === 'function') {
            matchResults = findBestMatches(entity, { baseDatabaseKey: entityWrapper.key });
        } else {
            // Fallback - perform basic matching here
            console.log('  -> WARNING: Using performBasicMatchAnalysis FALLBACK (direct compareTo)');
            console.log('  -> This fallback is BROKEN for cross-type comparisons!');
            matchResults = performBasicMatchAnalysis(entity, entityWrapper);
        }
        console.log('=== END DIAGNOSTIC ===')

        // Display results in a new window
        displayMatchAnalysisResults(entityWrapper, matchResults);

        showUnifiedStatus('Match analysis complete!', 'success');

    } catch (error) {
        console.error('Match analysis error:', error);
        showUnifiedStatus(`Error analyzing matches: ${error.message}`, 'error');
    }
}

/**
 * Perform basic match analysis if universalEntityMatcher is not available
 * @param {Object} entity - The entity to analyze
 * @param {Object} entityWrapper - The entity wrapper with metadata
 * @returns {Object} Match results
 */
function performBasicMatchAnalysis(entity, entityWrapper) {
    const results = {
        baseEntity: {
            key: entityWrapper.key,
            source: entityWrapper.source,
            type: entityWrapper.entityType
        },
        comparisons: [],
        summary: {
            totalCompared: 0,
            byType: {}
        }
    };

    // Get all entities to compare against
    const allEntities = getAllSelectedEntities();

    // Compare against each entity (excluding self)
    for (const targetWrapper of allEntities) {
        if (targetWrapper.key === entityWrapper.key) continue; // Skip self

        try {
            let score = 0;
            let details = null;

            // Try to use compareTo if available
            if (typeof entity.compareTo === 'function') {
                const result = entity.compareTo(targetWrapper.entity, true);
                score = typeof result === 'number' ? result : (result?.overallSimilarity || 0);
                details = typeof result === 'object' ? result : null;
            }

            results.comparisons.push({
                targetKey: targetWrapper.key,
                targetSource: targetWrapper.source,
                targetType: targetWrapper.entityType,
                score: score,
                details: details
            });

            // Update summary
            results.summary.totalCompared++;
            const typeBucket = targetWrapper.entityType;
            if (!results.summary.byType[typeBucket]) {
                results.summary.byType[typeBucket] = { count: 0, scores: [] };
            }
            results.summary.byType[typeBucket].count++;
            results.summary.byType[typeBucket].scores.push(score);

        } catch (error) {
            console.warn(`Error comparing to ${targetWrapper.key}:`, error.message);
        }
    }

    // Sort comparisons by score (highest first)
    results.comparisons.sort((a, b) => b.score - a.score);

    // Calculate percentiles for each type
    for (const [type, data] of Object.entries(results.summary.byType)) {
        data.scores.sort((a, b) => b - a);
        data.p98 = data.scores[Math.floor(data.scores.length * 0.02)] || 0;
        data.max = data.scores[0] || 0;
        data.min = data.scores[data.scores.length - 1] || 0;
        data.avg = data.scores.reduce((a, b) => a + b, 0) / data.scores.length || 0;
    }

    return results;
}

/**
 * Display match analysis results in a new window
 * @param {Object} entityWrapper - The base entity wrapper
 * @param {Object} results - Match analysis results
 */
function displayMatchAnalysisResults(entityWrapper, results) {
    const analysisWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes');

    const styles = generateMatchAnalysisStyles();

    // Extract base entity info for reconciliation
    // From universalEntityMatcher results or from entityWrapper
    // Key format now includes type: { source, keyType, key, accountNumber, headStatus, databaseKey }
    let baseEntityInfo;
    if (results.baseEntity) {
        baseEntityInfo = {
            source: results.baseEntity.source,
            keyType: results.baseEntity.keyType,
            key: results.baseEntity.key,
            accountNumber: results.baseEntity.accountNumber || '',
            headStatus: results.baseEntity.headStatus || 'na',
            databaseKey: results.baseEntity.databaseKey || ''  // Actual database key for direct lookup
        };
    } else {
        const locIdInfo = getLocationIdentifierInfoFromWrapper(entityWrapper);
        baseEntityInfo = {
            source: entityWrapper.sourceKey || entityWrapper.source?.toLowerCase() || 'unknown',
            keyType: locIdInfo.type,
            key: locIdInfo.value,
            databaseKey: entityWrapper.key || ''  // Fallback: use entityWrapper.key if available
        };
    }

    // Generate content based on results structure
    let resultsHtml = '';

    if (results.bestMatchesByType) {
        // Results from universalEntityMatcher (grouped by type)
        resultsHtml = generateUniversalMatcherResultsHtml(results, baseEntityInfo);
    } else if (results.byType) {
        // Alternative property name for universalEntityMatcher results
        resultsHtml = generateUniversalMatcherResultsHtml(results, baseEntityInfo);
    } else if (results.comparisons) {
        // Results from basic analysis
        resultsHtml = generateBasicMatchResultsHtml(results);
    }

    const baseName = extractUnifiedEntityName(entityWrapper.entity);

    analysisWindow.document.write(`
        <html>
            <head>
                <title>Match Analysis: ${entityWrapper.key}</title>
                <style>${styles}</style>
            </head>
            <body>
                <div class="analysis-header">
                    <h1>Entity Match Analysis</h1>
                    <div class="base-entity-info">
                        <span class="label">Base Entity:</span>
                        <span class="entity-name">${escapeHtmlForBrowser(baseName)}</span>
                        <span class="meta-badge source-badge">${entityWrapper.source}</span>
                        <span class="meta-badge type-badge">${entityWrapper.entityType}</span>
                        <span class="meta-badge key-badge">${entityWrapper.key}</span>
                    </div>
                </div>
                <div class="analysis-content">
                    ${resultsHtml}
                </div>
                <script>
                    // Toggle detail visibility
                    function toggleDetails(id) {
                        const el = document.getElementById(id);
                        if (el) {
                            el.style.display = el.style.display === 'none' ? 'block' : 'none';
                        }
                    }

                    // Filter by score
                    function filterByScore(minScore) {
                        document.querySelectorAll('.match-row').forEach(row => {
                            const score = parseFloat(row.dataset.score || 0);
                            row.style.display = score >= minScore ? '' : 'none';
                        });
                    }

                    // Reconcile button handler - calls parent window's reconcileMatch
                    // Parameters: baseSource, baseKeyType, baseKeyValue, baseAccountNumber, baseHeadStatus, targetSource, targetKeyType, targetKeyValue, targetAccountNumber, targetHeadStatus, baseDatabaseKey, targetDatabaseKey
                    function doReconcile(baseSource, baseKeyType, baseKeyValue, baseAccountNumber, baseHeadStatus, targetSource, targetKeyType, targetKeyValue, targetAccountNumber, targetHeadStatus, baseDatabaseKey, targetDatabaseKey) {
                        if (window.opener && typeof window.opener.reconcileMatch === 'function') {
                            window.opener.reconcileMatch(baseSource, baseKeyType, baseKeyValue, baseAccountNumber, baseHeadStatus, targetSource, targetKeyType, targetKeyValue, targetAccountNumber, targetHeadStatus, baseDatabaseKey, targetDatabaseKey);
                        } else {
                            alert('Unable to reconcile: Parent window not available. Please ensure the main browser window is still open.');
                        }
                    }
                </script>
            </body>
        </html>
    `);
    analysisWindow.document.close();
}

/**
 * Generate CSS styles for match analysis window
 * @returns {string} CSS styles
 */
function generateMatchAnalysisStyles() {
    return `
        * { box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            padding: 20px;
            margin: 0;
            background: #f5f7fa;
            color: #333;
        }
        .analysis-header {
            background: linear-gradient(135deg, #2c3e50, #3498db);
            color: white;
            padding: 25px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .analysis-header h1 {
            margin: 0 0 15px 0;
            font-size: 24px;
        }
        .base-entity-info {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
        }
        .base-entity-info .label {
            font-weight: 600;
            opacity: 0.9;
        }
        .base-entity-info .entity-name {
            font-size: 18px;
            font-weight: 600;
        }
        .meta-badge {
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
        }
        .source-badge { background: rgba(255,255,255,0.2); }
        .type-badge { background: rgba(39,174,96,0.8); }
        .key-badge { background: rgba(127,140,141,0.6); }

        .analysis-content {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .summary-section {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
        }
        .summary-section h3 {
            margin: 0 0 10px 0;
            color: #2c3e50;
        }
        .summary-stats {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
        }
        .stat-item {
            padding: 10px 15px;
            background: white;
            border-radius: 4px;
            border: 1px solid #e0e0e0;
        }
        .stat-label { font-size: 12px; color: #666; }
        .stat-value { font-size: 18px; font-weight: 600; color: #2c3e50; }

        .filter-section {
            margin-bottom: 15px;
            padding: 10px;
            background: #e8f4f8;
            border-radius: 4px;
        }
        .filter-section label { margin-right: 10px; }
        .filter-btn {
            padding: 5px 12px;
            margin-right: 5px;
            background: #3498db;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        .filter-btn:hover { background: #2980b9; }

        .type-section {
            margin-top: 25px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            overflow: hidden;
        }
        .type-header {
            background: #34495e;
            color: white;
            padding: 12px 15px;
            font-weight: 600;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .type-stats {
            font-size: 12px;
            opacity: 0.9;
        }

        .match-row {
            padding: 12px 15px;
            border-bottom: 1px solid #eee;
            display: flex;
            align-items: center;
            gap: 15px;
            transition: background 0.2s;
        }
        .match-row:last-child { border-bottom: none; }
        .match-row:hover { background: #f8f9fa; }

        .score-badge {
            min-width: 60px;
            padding: 6px 10px;
            border-radius: 4px;
            font-weight: 600;
            text-align: center;
            color: white;
        }
        .score-excellent { background: #27ae60; }
        .score-good { background: #2ecc71; }
        .score-moderate { background: #f39c12; }
        .score-low { background: #e74c3c; }

        .match-info {
            flex-grow: 1;
        }
        .match-name { font-weight: 600; color: #2c3e50; }
        .match-key { font-size: 12px; color: #7f8c8d; }

        .match-source {
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 11px;
            background: #ecf0f1;
        }

        .toggle-btn {
            padding: 5px 10px;
            background: #95a5a6;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
        }
        .toggle-btn:hover { background: #7f8c8d; }

        .match-details {
            background: #f4f4f4;
            padding: 12px 15px;
            margin-top: 10px;
            border-radius: 4px;
            font-size: 13px;
            display: none;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            border-bottom: 1px dotted #ddd;
        }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: #666; }
        .detail-value { font-weight: 500; }

        .name-score-highlight {
            background: #fff3cd;
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: 600;
        }

        .reconcile-btn {
            padding: 5px 10px;
            background: #9b59b6;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            margin-right: 5px;
        }
        .reconcile-btn:hover { background: #8e44ad; }

        /* True Match and Near Match checkboxes */
        .match-checkbox {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            cursor: pointer;
            white-space: nowrap;
        }
        .match-checkbox input[type="checkbox"] {
            margin: 0;
            cursor: pointer;
        }
        .true-match-label {
            background: #d4edda;
            border: 1px solid #28a745;
            color: #155724;
        }
        .true-match-label:has(input:checked) {
            background: #28a745;
            color: white;
        }
        .near-match-label {
            background: #fff3cd;
            border: 1px solid #ffc107;
            color: #856404;
        }
        .near-match-label:has(input:checked) {
            background: #ffc107;
            color: #212529;
        }

        /* Top Matches Section */
        .top-matches-section {
            border: 2px solid #f39c12;
            border-radius: 8px;
            margin-bottom: 20px;
            overflow: hidden;
        }
        .top-matches-header {
            background: linear-gradient(135deg, #f39c12, #e67e22);
            color: white;
            padding: 12px 15px;
            font-weight: 600;
            font-size: 14px;
        }
        .top-matches-content {
            padding: 10px;
            background: #fffbf5;
        }
        .top-match-row {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 10px;
            background: white;
            border-radius: 4px;
            margin-bottom: 6px;
            border: 1px solid #fdebd0;
        }
        .top-match-row:last-child { margin-bottom: 0; }
        .top-match-score {
            min-width: 60px;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 12px;
            text-align: center;
        }
        .top-match-info {
            flex: 1;
            overflow: hidden;
        }
        .top-match-name {
            font-weight: 600;
            color: #2c3e50;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .top-match-meta {
            font-size: 11px;
            color: #666;
        }
        .selection-reason {
            padding: 3px 8px;
            background: #fff3cd;
            border-radius: 3px;
            font-size: 10px;
            color: #856404;
            white-space: nowrap;
        }
    `;
}

/**
 * Generate the Top Matches summary section
 * Shows top 2 from each entity type + top 6 overall not already included
 * @param {Object} matchesByType - Matches grouped by entity type
 * @param {Object} baseEntityInfo - Info about the base entity for reconciliation
 * @returns {string} HTML content
 */
function generateTopMatchesSection(matchesByType, baseEntityInfo) {
    const includedKeys = new Set();
    const topMatches = [];

    // Get top 2 from each type
    const entityTypes = ['Individual', 'AggregateHousehold', 'Business', 'LegalConstruct'];
    for (const type of entityTypes) {
        const typeData = matchesByType[type];
        const matches = typeData?.bestMatches || [];
        const top2 = matches.slice(0, 2);
        top2.forEach(match => {
            const key = `${match.targetSource}_${match.targetKey}`;
            if (!includedKeys.has(key)) {
                includedKeys.add(key);
                topMatches.push({ ...match, entityType: type, selectionReason: `Top from ${type}` });
            }
        });
    }

    // Collect all matches and sort by score descending
    const allMatches = [];
    for (const [type, typeData] of Object.entries(matchesByType)) {
        const matches = typeData?.bestMatches || [];
        matches.forEach(match => {
            allMatches.push({ ...match, entityType: type });
        });
    }
    const sortedAll = allMatches.sort((a, b) => (b.score || 0) - (a.score || 0));

    // Add up to 6 more top matches not already included
    let addedFromOverall = 0;
    for (const match of sortedAll) {
        if (addedFromOverall >= 6) break;
        const key = `${match.targetSource}_${match.targetKey}`;
        if (!includedKeys.has(key)) {
            includedKeys.add(key);
            topMatches.push({ ...match, selectionReason: 'Top Overall' });
            addedFromOverall++;
        }
    }

    if (topMatches.length === 0) {
        return '';
    }

    // Sort by similarity score descending
    topMatches.sort((a, b) => (b.score || 0) - (a.score || 0));

    // Generate HTML
    let html = `
        <div class="top-matches-section">
            <div class="top-matches-header">
                Top Matches Summary (${topMatches.length} highlighted)
            </div>
            <div class="top-matches-content">
    `;

    // Extract base entity info for reconciliation buttons
    const baseSource = baseEntityInfo?.source || 'unknown';
    const baseKeyType = baseEntityInfo?.keyType || 'Unknown';
    const baseKeyValue = baseEntityInfo?.key || 'unknown';
    const baseAccountNumber = baseEntityInfo?.accountNumber || '';
    const baseHeadStatus = baseEntityInfo?.headStatus || 'na';

    topMatches.forEach(match => {
        const score = match.score || 0;
        const scoreClass = score >= 0.95 ? 'score-excellent' :
                           score >= 0.8 ? 'score-good' :
                           score >= 0.5 ? 'score-moderate' : 'score-low';
        const entityName = match.entityName || match.targetKey || 'Unknown';

        // Extract scores for True/Near Match evaluation
        const nameScore = match.details?.components?.name?.similarity ?? null;
        const contactInfoScore = match.details?.components?.contactInfo?.similarity ?? null;
        const matchIsTrueMatch = isTrueMatch(score, nameScore, contactInfoScore);
        const matchIsNearMatch = isNearMatch(score, nameScore, contactInfoScore);

        // Build reconcile button onclick
        const targetKeyValue = match.targetKey || '';
        const targetKeyType = match.targetKeyType || 'Unknown';
        const targetAccountNumber = match.targetAccountNumber || '';
        const targetHeadStatus = match.targetHeadStatus || 'na';
        const targetSource = match.targetSource || '';
        const targetDatabaseKey = match.targetDatabaseKey || '';  // Actual database key for direct lookup
        const baseDatabaseKey = baseEntityInfo?.databaseKey || '';  // Will be empty until we track base entity key
        const reconcileOnclick = "doReconcile('" +
            escapeHtmlForBrowser(baseSource) + "','" +
            escapeHtmlForBrowser(baseKeyType) + "','" +
            escapeHtmlForBrowser(baseKeyValue) + "','" +
            escapeHtmlForBrowser(baseAccountNumber) + "','" +
            escapeHtmlForBrowser(baseHeadStatus) + "','" +
            escapeHtmlForBrowser(targetSource) + "','" +
            escapeHtmlForBrowser(targetKeyType) + "','" +
            escapeHtmlForBrowser(targetKeyValue) + "','" +
            escapeHtmlForBrowser(targetAccountNumber) + "','" +
            escapeHtmlForBrowser(targetHeadStatus) + "','" +
            escapeHtmlForBrowser(baseDatabaseKey) + "','" +
            escapeHtmlForBrowser(targetDatabaseKey) + "')";

        html += `
            <div class="top-match-row">
                <span class="top-match-score ${scoreClass}">${(score * 100).toFixed(1)}%</span>
                <div class="top-match-info">
                    <div class="top-match-name">${escapeHtmlForBrowser(entityName)}</div>
                    <div class="top-match-meta">${match.entityType || ''} | ${match.targetSource || ''} | ${match.targetKey || ''}</div>
                </div>
                <span class="selection-reason">${match.selectionReason}</span>
                <label class="match-checkbox true-match-label"><input type="checkbox" class="true-match-checkbox" ${matchIsTrueMatch ? 'checked' : ''}> True</label>
                <label class="match-checkbox near-match-label"><input type="checkbox" class="near-match-checkbox" ${matchIsNearMatch ? 'checked' : ''}> Near</label>
                <button class="reconcile-btn" onclick="${reconcileOnclick}">Reconcile</button>
            </div>
        `;
    });

    html += `
            </div>
        </div>
    `;

    return html;
}

/**
 * Generate HTML for results from universalEntityMatcher
 * @param {Object} results - Results grouped by type
 * @param {Object} baseEntityInfo - Info about the base entity for reconciliation
 * @returns {string} HTML content
 */
function generateUniversalMatcherResultsHtml(results, baseEntityInfo) {
    let html = '';

    // Get the match data - support both property names for compatibility
    const matchesByType = results.bestMatchesByType || results.byType || {};

    // Extract base entity key info for reconciliation
    // For Bloomerang: use accountNumber + headStatus to ensure unique lookup
    // For VisionAppraisal: use keyType + keyValue
    const baseSource = baseEntityInfo?.source || 'unknown';
    const baseKeyType = baseEntityInfo?.keyType || 'Unknown';
    const baseKeyValue = baseEntityInfo?.key || 'unknown';
    const baseAccountNumber = baseEntityInfo?.accountNumber || '';
    const baseHeadStatus = baseEntityInfo?.headStatus || 'na';

    // Summary section
    html += `
        <div class="summary-section">
            <h3>Match Summary</h3>
            <div class="summary-stats">
    `;

    // Count totals
    let totalMatches = 0;
    const typeCounts = {};
    for (const [type, matches] of Object.entries(matchesByType)) {
        const count = matches?.bestMatches?.length || 0;
        totalMatches += count;
        typeCounts[type] = count;
    }

    html += `<div class="stat-item"><div class="stat-label">Total Best Matches</div><div class="stat-value">${totalMatches}</div></div>`;

    for (const [type, count] of Object.entries(typeCounts)) {
        html += `<div class="stat-item"><div class="stat-label">${type}</div><div class="stat-value">${count}</div></div>`;
    }

    html += `</div></div>`;

    // Filter section
    html += `
        <div class="filter-section">
            <label>Filter by minimum score:</label>
            <button class="filter-btn" onclick="filterByScore(0)">All</button>
            <button class="filter-btn" onclick="filterByScore(0.5)">≥50%</button>
            <button class="filter-btn" onclick="filterByScore(0.7)">≥70%</button>
            <button class="filter-btn" onclick="filterByScore(0.9)">≥90%</button>
            <button class="filter-btn" onclick="filterByScore(0.95)">≥95%</button>
        </div>
    `;

    // Top Matches summary section (top 2 from each type + top 6 overall)
    html += generateTopMatchesSection(matchesByType, baseEntityInfo);

    // Results by type
    for (const [type, typeData] of Object.entries(matchesByType)) {
        const matches = typeData?.bestMatches || [];
        if (matches.length === 0) continue;

        const percentile = typeData?.percentile98 || 0;

        html += `
            <div class="type-section">
                <div class="type-header">
                    <span>${type} (${matches.length} matches)</span>
                    <span class="type-stats">98th percentile: ${(percentile * 100).toFixed(1)}%</span>
                </div>
        `;

        matches.forEach((match, idx) => {
            const score = match.score || 0;
            const scoreClass = score >= 0.95 ? 'score-excellent' :
                               score >= 0.8 ? 'score-good' :
                               score >= 0.5 ? 'score-moderate' : 'score-low';

            const detailId = `detail_${type}_${idx}`;
            const entityName = match.entityName || match.targetKey || 'Unknown';
            const nameScore = match.details?.components?.name?.similarity ?? null;
            const contactInfoScore = match.details?.components?.contactInfo?.similarity ?? null;
            const hasHighNameScore = nameScore && nameScore > 0.985;

            // Evaluate True Match and Near Match criteria
            const matchIsTrueMatch = isTrueMatch(score, nameScore, contactInfoScore);
            const matchIsNearMatch = isNearMatch(score, nameScore, contactInfoScore);

            // Build the Reconcile button onclick with properly escaped values
            // Parameters: baseSource, baseKeyType, baseKeyValue, baseAccountNumber, baseHeadStatus, targetSource, targetKeyType, targetKeyValue, targetAccountNumber, targetHeadStatus, baseDatabaseKey, targetDatabaseKey
            const targetKeyValue = match.targetKey || '';
            const targetKeyType = match.targetKeyType || 'Unknown';
            const targetAccountNumber = match.targetAccountNumber || '';
            const targetHeadStatus = match.targetHeadStatus || 'na';
            const targetSource = match.targetSource || '';
            const targetDatabaseKey = match.targetDatabaseKey || '';  // Actual database key for direct lookup
            const baseDatabaseKey = baseEntityInfo?.databaseKey || '';  // Will be empty until we track base entity key
            const reconcileOnclick = "doReconcile('" +
                escapeHtmlForBrowser(baseSource) + "','" +
                escapeHtmlForBrowser(baseKeyType) + "','" +
                escapeHtmlForBrowser(baseKeyValue) + "','" +
                escapeHtmlForBrowser(baseAccountNumber) + "','" +
                escapeHtmlForBrowser(baseHeadStatus) + "','" +
                escapeHtmlForBrowser(targetSource) + "','" +
                escapeHtmlForBrowser(targetKeyType) + "','" +
                escapeHtmlForBrowser(targetKeyValue) + "','" +
                escapeHtmlForBrowser(targetAccountNumber) + "','" +
                escapeHtmlForBrowser(targetHeadStatus) + "','" +
                escapeHtmlForBrowser(baseDatabaseKey) + "','" +
                escapeHtmlForBrowser(targetDatabaseKey) + "')";

            html += `
                <div class="match-row" data-score="${score}">
                    <span class="score-badge ${scoreClass}">${(score * 100).toFixed(1)}%</span>
                    <div class="match-info">
                        <div class="match-name">
                            ${escapeHtmlForBrowser(entityName)}
                            ${hasHighNameScore ? `<span class="name-score-highlight">Name: ${(nameScore * 100).toFixed(1)}%</span>` : ''}
                        </div>
                        <div class="match-key">${match.targetKey || ''}</div>
                    </div>
                    <span class="match-source">${match.targetSource || ''}</span>
                    <label class="match-checkbox true-match-label"><input type="checkbox" class="true-match-checkbox" ${matchIsTrueMatch ? 'checked' : ''}> True</label>
                    <label class="match-checkbox near-match-label"><input type="checkbox" class="near-match-checkbox" ${matchIsNearMatch ? 'checked' : ''}> Near</label>
                    <button class="reconcile-btn" onclick="${reconcileOnclick}">Reconcile</button>
                    ${match.details ? `<button class="toggle-btn" onclick="toggleDetails('${detailId}')">Details</button>` : ''}
                </div>
            `;

            if (match.details) {
                html += `<div class="match-details" id="${detailId}">`;
                html += renderMatchDetails(match.details);
                html += `</div>`;
            }
        });

        html += `</div>`;
    }

    return html;
}

/**
 * Generate HTML for results from basic match analysis
 * @param {Object} results - Basic analysis results
 * @returns {string} HTML content
 */
function generateBasicMatchResultsHtml(results) {
    let html = '';

    // Summary section
    html += `
        <div class="summary-section">
            <h3>Match Summary</h3>
            <div class="summary-stats">
                <div class="stat-item"><div class="stat-label">Total Compared</div><div class="stat-value">${results.summary?.totalCompared || 0}</div></div>
    `;

    for (const [type, data] of Object.entries(results.summary?.byType || {})) {
        html += `
            <div class="stat-item">
                <div class="stat-label">${type}</div>
                <div class="stat-value">${data.count}</div>
            </div>
        `;
    }

    html += `</div></div>`;

    // Filter section
    html += `
        <div class="filter-section">
            <label>Filter by minimum score:</label>
            <button class="filter-btn" onclick="filterByScore(0)">All</button>
            <button class="filter-btn" onclick="filterByScore(0.5)">≥50%</button>
            <button class="filter-btn" onclick="filterByScore(0.7)">≥70%</button>
            <button class="filter-btn" onclick="filterByScore(0.9)">≥90%</button>
        </div>
    `;

    // Group by type
    const byType = {};
    for (const comp of (results.comparisons || [])) {
        const type = comp.targetType || 'Unknown';
        if (!byType[type]) byType[type] = [];
        byType[type].push(comp);
    }

    // Render each type
    for (const [type, matches] of Object.entries(byType)) {
        // Only show top 20 per type to avoid overwhelming display
        const topMatches = matches.slice(0, 20);

        html += `
            <div class="type-section">
                <div class="type-header">
                    <span>${type} (${matches.length} total, showing top ${topMatches.length})</span>
                </div>
        `;

        topMatches.forEach((match, idx) => {
            const score = match.score || 0;
            const scoreClass = score >= 0.95 ? 'score-excellent' :
                               score >= 0.8 ? 'score-good' :
                               score >= 0.5 ? 'score-moderate' : 'score-low';

            const detailId = `detail_${type}_${idx}`;

            html += `
                <div class="match-row" data-score="${score}">
                    <span class="score-badge ${scoreClass}">${(score * 100).toFixed(1)}%</span>
                    <div class="match-info">
                        <div class="match-name">${match.targetKey}</div>
                        <div class="match-key">${match.targetType}</div>
                    </div>
                    <span class="match-source">${match.targetSource}</span>
                    ${match.details ? `<button class="toggle-btn" onclick="toggleDetails('${detailId}')">Details</button>` : ''}
                </div>
            `;

            if (match.details) {
                html += `<div class="match-details" id="${detailId}">`;
                html += renderMatchDetails(match.details);
                html += `</div>`;
            }
        });

        html += `</div>`;
    }

    return html;
}

/**
 * Render detailed match component breakdown
 * @param {Object} details - Match details object
 * @returns {string} HTML content
 */
function renderMatchDetails(details) {
    let html = '';

    if (details.overallSimilarity !== undefined) {
        html += `<div class="detail-row"><span class="detail-label">Overall Similarity</span><span class="detail-value">${(details.overallSimilarity * 100).toFixed(2)}%</span></div>`;
    }

    if (details.components) {
        html += `<div style="margin-top: 8px; font-weight: 600;">Component Breakdown:</div>`;
        for (const [compName, compData] of Object.entries(details.components)) {
            const similarity = compData.similarity || compData;
            const weight = compData.weight;
            const contribution = compData.contribution;

            html += `<div class="detail-row">`;
            html += `<span class="detail-label">${compName}</span>`;
            html += `<span class="detail-value">`;

            if (typeof similarity === 'number') {
                html += `${(similarity * 100).toFixed(2)}%`;
            }
            if (weight !== undefined) {
                html += ` (weight: ${(weight * 100).toFixed(1)}%)`;
            }
            if (contribution !== undefined) {
                html += ` → ${(contribution * 100).toFixed(2)}%`;
            }

            html += `</span></div>`;
        }
    }

    if (details.checkSum !== undefined) {
        html += `<div class="detail-row"><span class="detail-label">Checksum</span><span class="detail-value">${details.checkSum}</span></div>`;
    }

    return html;
}

// =============================================================================
// RECONCILIATION FUNCTIONS
// =============================================================================

/**
 * Entry point for Reconcile button - displays detailed breakdown of how similarity was calculated
 * @param {string} baseSource - Source of the base entity ('visionAppraisal' or 'bloomerang')
 * @param {string} baseKeyType - Type of the base entity's locationIdentifier (e.g., 'FireNumber', 'PID')
 * @param {string} baseKeyValue - Value of the base entity's locationIdentifier
 * @param {string} baseAccountNumber - Bloomerang account number for base (empty for VisionAppraisal)
 * @param {string} baseHeadStatus - Head status for base ('head', 'member', 'na')
 * @param {string} targetSource - Source of the target entity
 * @param {string} targetKeyType - Type of the target entity's locationIdentifier
 * @param {string} targetKeyValue - Value of the target entity's locationIdentifier
 * @param {string} targetAccountNumber - Bloomerang account number for target (empty for VisionAppraisal)
 * @param {string} targetHeadStatus - Head status for target ('head', 'member', 'na')
 * @param {string} baseDatabaseKey - Actual database key for base entity (preferred lookup method)
 * @param {string} targetDatabaseKey - Actual database key for target entity (preferred lookup method)
 */
function reconcileMatch(baseSource, baseKeyType, baseKeyValue, baseAccountNumber, baseHeadStatus, targetSource, targetKeyType, targetKeyValue, targetAccountNumber, targetHeadStatus, baseDatabaseKey, targetDatabaseKey) {
    console.log('reconcileMatch called:', { baseSource, baseKeyType, baseKeyValue, baseAccountNumber, baseHeadStatus, targetSource, targetKeyType, targetKeyValue, targetAccountNumber, targetHeadStatus, baseDatabaseKey, targetDatabaseKey });

    // Get the entity database for direct key lookup
    const db = window.unifiedEntityDatabase?.entities;

    // Look up both entities - PREFER direct database key lookup
    let baseEntity, targetEntity;

    // Try direct database key lookup first for target entity (we have this key from findBestMatches)
    if (targetDatabaseKey && db) {
        targetEntity = db[targetDatabaseKey];
        if (targetEntity) {
            console.log('Target entity found via database key:', targetDatabaseKey);
        }
    }

    // Try direct database key lookup for base entity (may be empty until we track base entity key)
    if (baseDatabaseKey && db) {
        baseEntity = db[baseDatabaseKey];
        if (baseEntity) {
            console.log('Base entity found via database key:', baseDatabaseKey);
        }
    }

    // Fallback to legacy lookup for base entity if database key lookup failed
    if (!baseEntity) {
        if (baseSource === 'bloomerang' && baseAccountNumber) {
            if (typeof getBloomerangEntityByAccountNumber !== 'function') {
                console.error('getBloomerangEntityByAccountNumber function not available');
                alert('Error: Entity lookup function not available. Please reload entities.');
                return;
            }
            baseEntity = getBloomerangEntityByAccountNumber(baseAccountNumber, baseKeyType, baseKeyValue, baseHeadStatus);
        } else {
            if (typeof getVisionAppraisalEntity !== 'function') {
                console.error('getVisionAppraisalEntity function not available');
                alert('Error: Entity lookup function not available. Please reload entities.');
                return;
            }
            baseEntity = getVisionAppraisalEntity(baseKeyType, baseKeyValue);
        }
    }

    if (!baseEntity) {
        const keyDesc = baseSource === 'bloomerang' ? `accountNumber:${baseAccountNumber}:${baseHeadStatus}` : `${baseKeyType}:${baseKeyValue}`;
        console.error('Base entity not found:', baseSource, keyDesc, 'databaseKey:', baseDatabaseKey);
        alert('Error: Base entity not found. Key: ' + keyDesc);
        return;
    }

    // Fallback to legacy lookup for target entity if database key lookup failed
    if (!targetEntity) {
        if (targetSource === 'bloomerang' && targetAccountNumber) {
            targetEntity = getBloomerangEntityByAccountNumber(targetAccountNumber, targetKeyType, targetKeyValue, targetHeadStatus);
        } else {
            targetEntity = getVisionAppraisalEntity(targetKeyType, targetKeyValue);
        }
    }

    if (!targetEntity) {
        const keyDesc = targetSource === 'bloomerang' ? `accountNumber:${targetAccountNumber}:${targetHeadStatus}` : `${targetKeyType}:${targetKeyValue}`;
        console.error('Target entity not found:', targetSource, keyDesc);
        alert('Error: Target entity not found. Key: ' + keyDesc);
        return;
    }

    console.log('Entities retrieved successfully:', {
        baseEntity: baseEntity.constructor?.name,
        targetEntity: targetEntity.constructor?.name
    });

    // Perform detailed reconciliation
    const reconciliationData = performDetailedReconciliation(baseEntity, targetEntity, {
        baseSource,
        baseKeyType,
        baseKeyValue,
        baseAccountNumber,
        baseHeadStatus,
        targetSource,
        targetKeyType,
        targetKeyValue,
        targetAccountNumber,
        targetHeadStatus
    });

    // Display the reconciliation modal
    displayReconciliationModal(reconciliationData);
}

/**
 * Perform detailed reconciliation by calling universalCompareTo and extracting all details
 * CRITICAL: This function does NOT recalculate - it extracts from universalCompareTo results
 * @param {Object} baseEntity - The base entity
 * @param {Object} targetEntity - The target entity to compare
 * @param {Object} metadata - Contains baseSource, baseLocationId, targetSource, targetKey
 * @returns {Object} Reconciliation data for display
 */
function performDetailedReconciliation(baseEntity, targetEntity, metadata) {
    // Call universalCompareTo to get the comparison result
    // This is the SINGLE SOURCE OF TRUTH - we extract, not recalculate
    let comparisonResult;

    if (typeof universalCompareTo === 'function') {
        comparisonResult = universalCompareTo(baseEntity, targetEntity);
    } else if (typeof baseEntity.compareTo === 'function') {
        // Fallback to direct compareTo with detailed=true
        comparisonResult = baseEntity.compareTo(targetEntity, true);
    } else {
        console.error('No comparison function available');
        return {
            error: 'No comparison function available',
            baseEntity,
            targetEntity,
            metadata
        };
    }

    console.log('Comparison result:', comparisonResult);

    // Extract the structured reconciliation data
    const reconciliationData = {
        metadata: metadata,
        baseEntityName: extractUnifiedEntityName(baseEntity),
        baseEntityType: baseEntity.constructor?.name || 'Unknown',
        targetEntityName: extractUnifiedEntityName(targetEntity),
        targetEntityType: targetEntity.constructor?.name || 'Unknown',
        overallScore: comparisonResult.score || comparisonResult.overallSimilarity || comparisonResult,
        comparisonMethod: comparisonResult.comparisonMethod || 'standard',
        details: comparisonResult.details || comparisonResult
    };

    // Extract name comparison details - merge top-level and subordinate
    if (comparisonResult.details?.components?.name) {
        // Start with top-level entity components
        reconciliationData.nameComparison = {
            similarity: comparisonResult.details.components.name.similarity,
            weight: comparisonResult.details.components.name.actualWeight || comparisonResult.details.components.name.weight,
            contribution: comparisonResult.details.components.name.weightedValue || comparisonResult.details.components.name.contribution
        };
        // Merge in subordinateDetails if available (contains method, components breakdown, etc.)
        if (comparisonResult.details.subordinateDetails?.name) {
            Object.assign(reconciliationData.nameComparison, comparisonResult.details.subordinateDetails.name);
        }
    } else if (comparisonResult.details?.subordinateDetails?.name) {
        reconciliationData.nameComparison = comparisonResult.details.subordinateDetails.name;
    }

    // Extract contactInfo comparison details - merge top-level and subordinate
    if (comparisonResult.details?.components?.contactInfo) {
        // Start with top-level entity components
        reconciliationData.contactInfoComparison = {
            similarity: comparisonResult.details.components.contactInfo.similarity,
            weight: comparisonResult.details.components.contactInfo.actualWeight || comparisonResult.details.components.contactInfo.weight,
            contribution: comparisonResult.details.components.contactInfo.weightedValue || comparisonResult.details.components.contactInfo.contribution
        };
        // Merge in subordinateDetails if available (contains method, components breakdown, addressMatch, etc.)
        if (comparisonResult.details.subordinateDetails?.contactInfo) {
            Object.assign(reconciliationData.contactInfoComparison, comparisonResult.details.subordinateDetails.contactInfo);
        }
        // Extract addressMatch to top level for dedicated display
        if (comparisonResult.details.subordinateDetails?.contactInfo?.addressMatch) {
            reconciliationData.addressMatch = comparisonResult.details.subordinateDetails.contactInfo.addressMatch;
        }
    } else if (comparisonResult.details?.subordinateDetails?.contactInfo) {
        reconciliationData.contactInfoComparison = comparisonResult.details.subordinateDetails.contactInfo;
        if (comparisonResult.details.subordinateDetails.contactInfo.addressMatch) {
            reconciliationData.addressMatch = comparisonResult.details.subordinateDetails.contactInfo.addressMatch;
        }
    }

    // For household-to-household comparisons, extract matched individuals
    if (comparisonResult.matchedIndividual1 !== undefined) {
        reconciliationData.householdMatch = {
            matchedIndividual1: comparisonResult.matchedIndividual1,
            matchedIndividual2: comparisonResult.matchedIndividual2,
            matchedIndividualIndex1: comparisonResult.matchedIndividualIndex1,
            matchedIndividualIndex2: comparisonResult.matchedIndividualIndex2,
            individual1Name: comparisonResult.matchedIndividual1 ?
                extractUnifiedEntityName(comparisonResult.matchedIndividual1) : null,
            individual2Name: comparisonResult.matchedIndividual2 ?
                extractUnifiedEntityName(comparisonResult.matchedIndividual2) : null
        };
    }

    return reconciliationData;
}

/**
 * Display the reconciliation modal with detailed breakdown
 * @param {Object} data - Reconciliation data from performDetailedReconciliation
 */
function displayReconciliationModal(data) {
    // Handle error case
    if (data.error) {
        alert('Reconciliation Error: ' + data.error);
        return;
    }

    const modalWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');

    const overallScore = typeof data.overallScore === 'number' ? data.overallScore : 0;
    const scorePercent = (overallScore * 100).toFixed(2);
    const scoreClass = overallScore >= 0.95 ? 'excellent' :
                       overallScore >= 0.8 ? 'good' :
                       overallScore >= 0.5 ? 'moderate' : 'low';

    // Build the HTML content - using string concatenation to avoid template literal issues
    let htmlContent = '';
    htmlContent += '<!DOCTYPE html><html><head>';
    htmlContent += '<title>Reconciliation: ' + escapeHtmlForBrowser(data.baseEntityName) + '</title>';
    htmlContent += '<style>' + generateReconciliationStyles() + '</style>';
    htmlContent += '</head><body>';

    // Header section
    htmlContent += '<div class="reconcile-header">';
    htmlContent += '<h1>Match Reconciliation</h1>';
    htmlContent += '<div class="score-display score-' + scoreClass + '">';
    htmlContent += '<span class="score-value">' + scorePercent + '%</span>';
    htmlContent += '<span class="score-label">Overall Similarity</span>';
    htmlContent += '</div>';
    htmlContent += '</div>';

    // Entity comparison section
    htmlContent += '<div class="entity-comparison">';
    // Format key badge with headStatus when not 'na'
    const baseKeyLabel = data.metadata.baseHeadStatus && data.metadata.baseHeadStatus !== 'na'
        ? data.metadata.baseKeyType + ':' + data.metadata.baseKeyValue + ' (' + data.metadata.baseHeadStatus + ')'
        : data.metadata.baseKeyType + ':' + data.metadata.baseKeyValue;
    const targetKeyLabel = data.metadata.targetHeadStatus && data.metadata.targetHeadStatus !== 'na'
        ? data.metadata.targetKeyType + ':' + data.metadata.targetKeyValue + ' (' + data.metadata.targetHeadStatus + ')'
        : data.metadata.targetKeyType + ':' + data.metadata.targetKeyValue;

    htmlContent += '<div class="entity-card base-entity">';
    htmlContent += '<div class="entity-label">Base Entity</div>';
    htmlContent += '<div class="entity-name">' + escapeHtmlForBrowser(data.baseEntityName) + '</div>';
    htmlContent += '<div class="entity-meta">';
    htmlContent += '<span class="badge type-badge">' + escapeHtmlForBrowser(data.baseEntityType) + '</span>';
    htmlContent += '<span class="badge source-badge">' + escapeHtmlForBrowser(data.metadata.baseSource) + '</span>';
    htmlContent += '<span class="badge key-badge">' + escapeHtmlForBrowser(baseKeyLabel) + '</span>';
    htmlContent += '</div>';
    htmlContent += '<button class="view-entity-btn" onclick="viewEntityDetails(\'base\')">View Details</button>';
    htmlContent += '</div>';

    htmlContent += '<div class="vs-indicator">VS</div>';

    htmlContent += '<div class="entity-card target-entity">';
    htmlContent += '<div class="entity-label">Target Entity</div>';
    htmlContent += '<div class="entity-name">' + escapeHtmlForBrowser(data.targetEntityName) + '</div>';
    htmlContent += '<div class="entity-meta">';
    htmlContent += '<span class="badge type-badge">' + escapeHtmlForBrowser(data.targetEntityType) + '</span>';
    htmlContent += '<span class="badge source-badge">' + escapeHtmlForBrowser(data.metadata.targetSource) + '</span>';
    htmlContent += '<span class="badge key-badge">' + escapeHtmlForBrowser(targetKeyLabel) + '</span>';
    htmlContent += '</div>';
    htmlContent += '<button class="view-entity-btn" onclick="viewEntityDetails(\'target\')">View Details</button>';
    htmlContent += '</div>';
    htmlContent += '</div>';

    // Household match section (if applicable)
    if (data.householdMatch) {
        htmlContent += '<div class="section household-section">';
        htmlContent += '<h2>Household-to-Household Match</h2>';
        htmlContent += '<p class="info-text">These households were compared by finding the best-matching individual pair:</p>';
        htmlContent += '<div class="individual-match">';
        htmlContent += '<div class="individual-card">';
        htmlContent += '<div class="individual-label">From Base Household (index ' + data.householdMatch.matchedIndividualIndex1 + ')</div>';
        htmlContent += '<div class="individual-name">' + escapeHtmlForBrowser(data.householdMatch.individual1Name || 'N/A') + '</div>';
        htmlContent += '</div>';
        htmlContent += '<div class="match-arrow">↔</div>';
        htmlContent += '<div class="individual-card">';
        htmlContent += '<div class="individual-label">From Target Household (index ' + data.householdMatch.matchedIndividualIndex2 + ')</div>';
        htmlContent += '<div class="individual-name">' + escapeHtmlForBrowser(data.householdMatch.individual2Name || 'N/A') + '</div>';
        htmlContent += '</div>';
        htmlContent += '</div></div>';
    }

    // Name comparison section with detailed breakdown
    if (data.nameComparison) {
        htmlContent += '<div class="section">';
        htmlContent += '<h2>Name Comparison</h2>';
        htmlContent += '<div class="comparison-grid">';
        htmlContent += '<div class="comparison-row">';
        htmlContent += '<span class="label">Similarity:</span>';
        htmlContent += '<span class="value">' + ((data.nameComparison.similarity || data.nameComparison.overallSimilarity || 0) * 100).toFixed(2) + '%</span>';
        htmlContent += '</div>';
        if (data.nameComparison.weight !== undefined) {
            htmlContent += '<div class="comparison-row">';
            htmlContent += '<span class="label">Weight:</span>';
            htmlContent += '<span class="value">' + ((data.nameComparison.weight || 0) * 100).toFixed(1) + '%</span>';
            htmlContent += '</div>';
        }
        if (data.nameComparison.contribution !== undefined) {
            htmlContent += '<div class="comparison-row">';
            htmlContent += '<span class="label">Contribution:</span>';
            htmlContent += '<span class="value">' + ((data.nameComparison.contribution || 0) * 100).toFixed(2) + '%</span>';
            htmlContent += '</div>';
        }
        // Show comparison method (weighted vs permutation)
        if (data.nameComparison.method) {
            htmlContent += '<div class="comparison-row">';
            htmlContent += '<span class="label">Method:</span>';
            htmlContent += '<span class="value">' + escapeHtmlForBrowser(data.nameComparison.method) + '</span>';
            htmlContent += '</div>';
        }
        // Show weighted vs permutation scores if available
        if (data.nameComparison.weightedScore !== undefined && data.nameComparison.permutationScore !== undefined) {
            htmlContent += '<div class="comparison-row">';
            htmlContent += '<span class="label">Weighted Score:</span>';
            htmlContent += '<span class="value">' + ((data.nameComparison.weightedScore || 0) * 100).toFixed(2) + '%</span>';
            htmlContent += '</div>';
            htmlContent += '<div class="comparison-row">';
            htmlContent += '<span class="label">Permutation Score:</span>';
            htmlContent += '<span class="value">' + ((data.nameComparison.permutationScore || 0) * 100).toFixed(2) + '%</span>';
            htmlContent += '</div>';
        }
        htmlContent += '</div>';

        // Name component breakdown (lastName, firstName, otherNames)
        if (data.nameComparison.components) {
            htmlContent += '<div class="sub-breakdown">';
            htmlContent += '<h3>Component Breakdown</h3>';
            htmlContent += '<table class="breakdown-table">';
            htmlContent += '<thead><tr><th>Component</th><th>Weight</th><th>Similarity</th><th>Contribution</th></tr></thead>';
            htmlContent += '<tbody>';
            var nameComponents = data.nameComparison.components;
            for (var compName in nameComponents) {
                if (nameComponents.hasOwnProperty(compName)) {
                    var comp = nameComponents[compName];
                    var weight = comp.weight || comp.actualWeight || 0;
                    var similarity = comp.similarity || 0;
                    var contribution = comp.weightedValue || comp.contribution || (weight * similarity);
                    htmlContent += '<tr>';
                    htmlContent += '<td>' + escapeHtmlForBrowser(compName) + '</td>';
                    htmlContent += '<td>' + (weight * 100).toFixed(1) + '%</td>';
                    htmlContent += '<td>' + (similarity * 100).toFixed(2) + '%</td>';
                    htmlContent += '<td>' + (contribution * 100).toFixed(2) + '%</td>';
                    htmlContent += '</tr>';
                }
            }
            htmlContent += '</tbody></table>';
            htmlContent += '</div>';
        }
        htmlContent += '</div>';
    }

    // ContactInfo comparison section with detailed breakdown
    if (data.contactInfoComparison) {
        htmlContent += '<div class="section">';
        htmlContent += '<h2>Contact Info Comparison</h2>';
        htmlContent += '<div class="comparison-grid">';
        htmlContent += '<div class="comparison-row">';
        htmlContent += '<span class="label">Similarity:</span>';
        htmlContent += '<span class="value">' + ((data.contactInfoComparison.similarity || data.contactInfoComparison.overallSimilarity || 0) * 100).toFixed(2) + '%</span>';
        htmlContent += '</div>';
        if (data.contactInfoComparison.weight !== undefined) {
            htmlContent += '<div class="comparison-row">';
            htmlContent += '<span class="label">Weight:</span>';
            htmlContent += '<span class="value">' + ((data.contactInfoComparison.weight || 0) * 100).toFixed(1) + '%</span>';
            htmlContent += '</div>';
        }
        if (data.contactInfoComparison.contribution !== undefined) {
            htmlContent += '<div class="comparison-row">';
            htmlContent += '<span class="label">Contribution:</span>';
            htmlContent += '<span class="value">' + ((data.contactInfoComparison.contribution || 0) * 100).toFixed(2) + '%</span>';
            htmlContent += '</div>';
        }
        // Show method if available
        if (data.contactInfoComparison.method) {
            htmlContent += '<div class="comparison-row">';
            htmlContent += '<span class="label">Method:</span>';
            htmlContent += '<span class="value">' + escapeHtmlForBrowser(data.contactInfoComparison.method) + '</span>';
            htmlContent += '</div>';
        }
        htmlContent += '</div>';

        // ContactInfo component breakdown (primaryAddress, secondaryAddress, email)
        if (data.contactInfoComparison.components) {
            htmlContent += '<div class="sub-breakdown">';
            htmlContent += '<h3>Component Breakdown</h3>';
            htmlContent += '<table class="breakdown-table">';
            htmlContent += '<thead><tr><th>Component</th><th>Weight</th><th>Similarity</th><th>Contribution</th></tr></thead>';
            htmlContent += '<tbody>';
            var ciComponents = data.contactInfoComparison.components;
            for (var compName in ciComponents) {
                if (ciComponents.hasOwnProperty(compName)) {
                    var comp = ciComponents[compName];
                    var weight = comp.weight || comp.actualWeight || 0;
                    var similarity = comp.similarity || 0;
                    var contribution = comp.weightedValue || comp.contribution || (weight * similarity);
                    htmlContent += '<tr>';
                    htmlContent += '<td>' + escapeHtmlForBrowser(compName) + '</td>';
                    htmlContent += '<td>' + (weight * 100).toFixed(1) + '%</td>';
                    htmlContent += '<td>' + (similarity * 100).toFixed(2) + '%</td>';
                    htmlContent += '<td>' + (contribution * 100).toFixed(2) + '%</td>';
                    htmlContent += '</tr>';
                }
            }
            htmlContent += '</tbody></table>';
            htmlContent += '</div>';
        }
        htmlContent += '</div>';
    }

    // Address match section with detailed breakdown
    if (data.addressMatch) {
        htmlContent += '<div class="section address-section">';
        htmlContent += '<h2>Address Match Details</h2>';

        // Show method (pobox, blockIsland, generalStreet)
        if (data.addressMatch.method) {
            htmlContent += '<p class="info-text">Match method: <strong>' + escapeHtmlForBrowser(data.addressMatch.method) + '</strong></p>';
        } else {
            htmlContent += '<p class="info-text">Addresses that were matched:</p>';
        }

        htmlContent += '<div class="address-comparison">';

        // Base address
        htmlContent += '<div class="address-card">';
        htmlContent += '<div class="address-label">Base Address</div>';
        htmlContent += '<div class="address-content">' + formatAddressForDisplay(data.addressMatch.baseAddress) + '</div>';
        htmlContent += '</div>';

        // Similarity indicator
        htmlContent += '<div class="similarity-indicator">';
        htmlContent += '<span class="similarity-value">' + ((data.addressMatch.similarity || data.addressMatch.overallSimilarity || 0) * 100).toFixed(1) + '%</span>';
        htmlContent += '<span class="direction-label">' + escapeHtmlForBrowser(data.addressMatch.direction || data.addressMatch.matchDirection || '') + '</span>';
        htmlContent += '</div>';

        // Target address
        htmlContent += '<div class="address-card">';
        htmlContent += '<div class="address-label">Target Address</div>';
        htmlContent += '<div class="address-content">' + formatAddressForDisplay(data.addressMatch.targetAddress) + '</div>';
        htmlContent += '</div>';

        htmlContent += '</div>';

        // Address field-by-field breakdown
        if (data.addressMatch.components || data.addressMatch.subordinateDetails) {
            var addrComponents = data.addressMatch.components || data.addressMatch.subordinateDetails;
            htmlContent += '<div class="sub-breakdown">';
            htmlContent += '<h3>Field-by-Field Comparison</h3>';
            htmlContent += '<table class="breakdown-table">';
            htmlContent += '<thead><tr><th>Field</th><th>Base Value</th><th>Target Value</th><th>Similarity</th></tr></thead>';
            htmlContent += '<tbody>';
            for (var fieldName in addrComponents) {
                if (addrComponents.hasOwnProperty(fieldName)) {
                    var field = addrComponents[fieldName];
                    var baseVal = field.baseValue || '';
                    var targetVal = field.targetValue || '';
                    var similarity = field.similarity || 0;
                    htmlContent += '<tr>';
                    htmlContent += '<td>' + escapeHtmlForBrowser(fieldName) + '</td>';
                    htmlContent += '<td>' + escapeHtmlForBrowser(String(baseVal)) + '</td>';
                    htmlContent += '<td>' + escapeHtmlForBrowser(String(targetVal)) + '</td>';
                    htmlContent += '<td>' + (similarity * 100).toFixed(1) + '%</td>';
                    htmlContent += '</tr>';
                }
            }
            htmlContent += '</tbody></table>';
            htmlContent += '</div>';
        }

        htmlContent += '</div>';
    }

    // Raw details section (collapsible)
    htmlContent += '<div class="section raw-details">';
    htmlContent += '<h2 onclick="toggleRawDetails()" style="cursor:pointer;">Raw Comparison Data ▼</h2>';
    htmlContent += '<pre id="rawDetailsContent" style="display:none;">';
    htmlContent += escapeHtmlForBrowser(JSON.stringify(data.details, null, 2));
    htmlContent += '</pre></div>';

    // Close button
    htmlContent += '<div class="actions">';
    htmlContent += '<button onclick="window.close()" class="close-btn">Close</button>';
    htmlContent += '</div>';

    // Script for toggle and view entity details
    htmlContent += '<script>';
    htmlContent += 'function toggleRawDetails() {';
    htmlContent += '  var el = document.getElementById("rawDetailsContent");';
    htmlContent += '  el.style.display = el.style.display === "none" ? "block" : "none";';
    htmlContent += '}';
    htmlContent += 'function viewEntityDetails(which) {';
    htmlContent += '  var metadata = window._reconcileMetadata;';
    htmlContent += '  if (!metadata) { alert("Metadata not available"); return; }';
    htmlContent += '  var source, keyType, keyValue, accountNumber, headStatus;';
    htmlContent += '  if (which === "base") {';
    htmlContent += '    source = metadata.baseSource;';
    htmlContent += '    keyType = metadata.baseKeyType;';
    htmlContent += '    keyValue = metadata.baseKeyValue;';
    htmlContent += '    accountNumber = metadata.baseAccountNumber;';
    htmlContent += '    headStatus = metadata.baseHeadStatus;';
    htmlContent += '  } else {';
    htmlContent += '    source = metadata.targetSource;';
    htmlContent += '    keyType = metadata.targetKeyType;';
    htmlContent += '    keyValue = metadata.targetKeyValue;';
    htmlContent += '    accountNumber = metadata.targetAccountNumber;';
    htmlContent += '    headStatus = metadata.targetHeadStatus;';
    htmlContent += '  }';
    htmlContent += '  if (!window.opener || (!window.opener.unifiedEntityDatabase && !window.opener.workingLoadedEntities)) {';
    htmlContent += '    alert("Parent window not available. Please keep the main browser window open.");';
    htmlContent += '    return;';
    htmlContent += '  }';
    htmlContent += '  var entity = null;';
    htmlContent += '  var entityKey = keyType + ":" + keyValue;';
    htmlContent += '  if (source === "bloomerang") {';
    htmlContent += '    if (window.opener.getBloomerangEntityByAccountNumber && accountNumber) {';
    htmlContent += '      entity = window.opener.getBloomerangEntityByAccountNumber(accountNumber, keyType, keyValue, headStatus);';
    htmlContent += '    }';
    htmlContent += '  } else if (source === "visionAppraisal") {';
    htmlContent += '    if (window.opener.getVisionAppraisalEntity) {';
    htmlContent += '      entity = window.opener.getVisionAppraisalEntity(keyType, keyValue);';
    htmlContent += '    }';
    htmlContent += '  }';
    htmlContent += '  if (!entity) {';
    htmlContent += '    alert("Entity not found: " + source + " " + entityKey);';
    htmlContent += '    return;';
    htmlContent += '  }';
    htmlContent += '  var entityType = entity.constructor ? entity.constructor.name : "Unknown";';
    htmlContent += '  var sourceName = source === "bloomerang" ? "Bloomerang" : "VisionAppraisal";';
    htmlContent += '  var entityWrapper = {';
    htmlContent += '    entity: entity,';
    htmlContent += '    key: entityKey,';
    htmlContent += '    source: sourceName,';
    htmlContent += '    sourceKey: source,';
    htmlContent += '    entityType: entityType';
    htmlContent += '  };';
    htmlContent += '  if (window.opener.renderEntityDetailsWindow) {';
    htmlContent += '    window.opener.renderEntityDetailsWindow(entityWrapper);';
    htmlContent += '  } else if (window.opener.basicEntityDetailsView) {';
    htmlContent += '    window.opener.basicEntityDetailsView(entityWrapper);';
    htmlContent += '  } else {';
    htmlContent += '    alert("Entity renderer not available");';
    htmlContent += '  }';
    htmlContent += '}';
    htmlContent += '</script>';

    htmlContent += '</body></html>';

    modalWindow.document.write(htmlContent);
    modalWindow.document.close();

    // Store metadata in the modal window for the viewEntityDetails function
    modalWindow._reconcileMetadata = data.metadata;
}

/**
 * Generate CSS styles for reconciliation modal
 * @returns {string} CSS styles
 */
function generateReconciliationStyles() {
    return '* { box-sizing: border-box; }' +
        'body { font-family: "Segoe UI", Arial, sans-serif; padding: 20px; margin: 0; background: #f0f2f5; color: #333; }' +
        '.reconcile-header { background: linear-gradient(135deg, #6c5ce7, #a29bfe); color: white; padding: 25px; border-radius: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }' +
        '.reconcile-header h1 { margin: 0; font-size: 24px; }' +
        '.score-display { text-align: center; background: rgba(255,255,255,0.2); padding: 15px 25px; border-radius: 8px; }' +
        '.score-value { font-size: 36px; font-weight: bold; display: block; }' +
        '.score-label { font-size: 12px; opacity: 0.9; }' +
        '.score-excellent { background: rgba(39,174,96,0.3); }' +
        '.score-good { background: rgba(46,204,113,0.3); }' +
        '.score-moderate { background: rgba(243,156,18,0.3); }' +
        '.score-low { background: rgba(231,76,60,0.3); }' +
        '.entity-comparison { display: flex; align-items: center; gap: 20px; margin-bottom: 20px; }' +
        '.entity-card { flex: 1; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }' +
        '.entity-label { font-size: 12px; color: #666; margin-bottom: 5px; text-transform: uppercase; }' +
        '.entity-name { font-size: 18px; font-weight: 600; color: #2c3e50; margin-bottom: 10px; }' +
        '.entity-meta { display: flex; gap: 8px; flex-wrap: wrap; }' +
        '.badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; }' +
        '.type-badge { background: #27ae60; color: white; }' +
        '.source-badge { background: #3498db; color: white; }' +
        '.key-badge { background: #7f8c8d; color: white; }' +
        '.vs-indicator { font-size: 24px; font-weight: bold; color: #95a5a6; }' +
        '.section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }' +
        '.section h2 { margin: 0 0 15px 0; font-size: 16px; color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 10px; }' +
        '.comparison-grid { display: grid; gap: 10px; }' +
        '.comparison-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dotted #eee; }' +
        '.comparison-row:last-child { border-bottom: none; }' +
        '.comparison-row .label { color: #666; }' +
        '.comparison-row .value { font-weight: 600; color: #2c3e50; }' +
        '.household-section { background: #fff3e0; }' +
        '.individual-match { display: flex; align-items: center; gap: 15px; }' +
        '.individual-card { flex: 1; background: white; padding: 15px; border-radius: 6px; text-align: center; }' +
        '.individual-label { font-size: 11px; color: #666; margin-bottom: 5px; }' +
        '.individual-name { font-weight: 600; color: #e65100; }' +
        '.match-arrow { font-size: 24px; color: #ff9800; }' +
        '.info-text { color: #666; font-size: 13px; margin-bottom: 15px; }' +
        '.address-section { background: #e3f2fd; }' +
        '.address-comparison { display: flex; align-items: center; gap: 15px; }' +
        '.address-card { flex: 1; background: white; padding: 15px; border-radius: 6px; }' +
        '.address-label { font-size: 11px; color: #666; margin-bottom: 8px; text-transform: uppercase; }' +
        '.address-content { font-size: 13px; line-height: 1.5; }' +
        '.similarity-indicator { text-align: center; padding: 10px; }' +
        '.similarity-value { font-size: 20px; font-weight: bold; color: #1976d2; display: block; }' +
        '.direction-label { font-size: 10px; color: #666; }' +
        '.raw-details { background: #fafafa; }' +
        '.raw-details pre { background: #263238; color: #aed581; padding: 15px; border-radius: 6px; overflow: auto; font-size: 12px; max-height: 300px; }' +
        '.actions { text-align: center; margin-top: 20px; }' +
        '.close-btn { background: #6c5ce7; color: white; border: none; padding: 12px 30px; border-radius: 6px; font-size: 14px; cursor: pointer; }' +
        '.close-btn:hover { background: #5b4cdb; }' +
        '.view-entity-btn { background: #3498db; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; margin-top: 10px; }' +
        '.view-entity-btn:hover { background: #2980b9; }' +
        // Step 5: Detailed breakdown styles
        '.sub-breakdown { margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee; }' +
        '.sub-breakdown h3 { margin: 0 0 10px 0; font-size: 13px; color: #666; font-weight: 600; }' +
        '.breakdown-table { width: 100%; border-collapse: collapse; font-size: 13px; }' +
        '.breakdown-table thead { background: #f8f9fa; }' +
        '.breakdown-table th { padding: 8px 10px; text-align: left; font-weight: 600; color: #495057; border-bottom: 2px solid #dee2e6; }' +
        '.breakdown-table td { padding: 8px 10px; border-bottom: 1px solid #eee; }' +
        '.breakdown-table tr:last-child td { border-bottom: none; }' +
        '.breakdown-table tr:hover { background: #f8f9fa; }';
}

/**
 * Format an Address object for display
 * @param {Object} address - Address object
 * @returns {string} Formatted HTML string
 */
function formatAddressForDisplay(address) {
    if (!address) return '<em>No address</em>';

    const parts = [];

    // Helper to extract term from AttributedTerm or direct value
    const getTerm = function(val) {
        if (!val) return null;
        if (typeof val === 'string') return val;
        if (val.term) return val.term;
        if (val.primaryAlias && val.primaryAlias.term) return val.primaryAlias.term;
        return null;
    };

    const streetNum = getTerm(address.streetNumber);
    const streetName = getTerm(address.streetName);
    const streetType = getTerm(address.streetType);
    const secUnitType = getTerm(address.secUnitType);
    const secUnitNum = getTerm(address.secUnitNum);
    const city = getTerm(address.city);
    const state = getTerm(address.state);
    const zipCode = getTerm(address.zipCode);

    // Build street line
    const streetParts = [];
    if (streetNum) streetParts.push(streetNum);
    if (streetName) streetParts.push(streetName);
    if (streetType) streetParts.push(streetType);
    if (streetParts.length > 0) parts.push(streetParts.join(' '));

    // Secondary unit
    if (secUnitType || secUnitNum) {
        const unitParts = [];
        if (secUnitType) unitParts.push(secUnitType);
        if (secUnitNum) unitParts.push(secUnitNum);
        parts.push(unitParts.join(' '));
    }

    // City, State, Zip
    const cityStateZip = [];
    if (city) cityStateZip.push(city);
    if (state) cityStateZip.push(state);
    if (zipCode) cityStateZip.push(zipCode);
    if (cityStateZip.length > 0) parts.push(cityStateZip.join(', '));

    if (parts.length === 0) {
        // Try original address as fallback
        const original = getTerm(address.originalAddress);
        if (original) return escapeHtmlForBrowser(original);
        return '<em>Address details not available</em>';
    }

    return escapeHtmlForBrowser(parts.join('<br>'));
}

// =============================================================================
// EXPORT FUNCTIONS
// =============================================================================

/**
 * Export current results
 */
function exportCurrentResults() {
    if (unifiedBrowser.currentResults.length === 0) {
        showUnifiedStatus('No results to export', 'error');
        return;
    }

    const exportData = {
        exportedAt: new Date().toISOString(),
        dataSource: unifiedBrowser.selectedDataSource,
        entityType: unifiedBrowser.selectedEntityType,
        searchQuery: unifiedBrowser.searchQuery,
        totalResults: unifiedBrowser.currentResults.length,
        results: unifiedBrowser.currentResults.map(entityWrapper => ({
            source: entityWrapper.source,
            entityType: entityWrapper.entityType,
            key: entityWrapper.key,
            entity: entityWrapper.entity
        }))
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `unified_entity_export_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showUnifiedStatus(`Exported ${unifiedBrowser.currentResults.length} results`, 'success');
}

/**
 * Show unified statistics
 */
function showUnifiedStats() {
    if (!hasLoadedData()) {
        showUnifiedStatus('Please load data first', 'error');
        return;
    }

    const stats = generateUnifiedStats();
    const statsWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');

    statsWindow.document.write(`
        <html>
            <head>
                <title>Unified Entity Browser - Statistics</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .stats-section { margin-bottom: 30px; }
                    .stats-table { border-collapse: collapse; width: 100%; }
                    .stats-table th, .stats-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    .stats-table th { background-color: #f2f2f2; }
                </style>
            </head>
            <body>
                <h1>Unified Entity Browser Statistics</h1>
                ${stats}
            </body>
        </html>
    `);
    statsWindow.document.close();
}

/**
 * Generate unified statistics HTML
 * @returns {string} HTML content for statistics
 */
function generateUnifiedStats() {
    const stats = [];
    let totalEntities = 0;
    let entityTypeCounts = {};
    let sourceCounts = {
        'VisionAppraisal': 0,
        'Bloomerang': 0
    };
    let dataSource = 'none';

    // Use compatibility layer if available
    if (typeof getEntityDatabaseMetadata === 'function' && typeof isEntityDatabaseLoaded === 'function') {
        if (isEntityDatabaseLoaded()) {
            const metadata = getEntityDatabaseMetadata();
            dataSource = metadata.source;
            totalEntities = metadata.totalEntities || 0;

            // Get counts from metadata
            if (metadata.entityTypes) {
                entityTypeCounts = metadata.entityTypes;
            }
            if (metadata.sources) {
                // Sources are objects with {count, originalCount} - extract the count
                const vaSource = metadata.sources.visionAppraisal;
                const blSource = metadata.sources.bloomerang;
                sourceCounts['VisionAppraisal'] = typeof vaSource === 'object' ? (vaSource?.count || 0) : (vaSource || 0);
                sourceCounts['Bloomerang'] = typeof blSource === 'object' ? (blSource?.count || 0) : (blSource || 0);
            }
        }
    }
    // Keyed Database is required - no legacy fallback

    // Determine status display
    const vaLoaded = sourceCounts['VisionAppraisal'] > 0;
    const blLoaded = sourceCounts['Bloomerang'] > 0;

    // Build statistics HTML
    stats.push(`
        <div class="stats-section">
            <h2>Data Source Summary</h2>
            <p style="font-size: 12px; color: #666;">Data source: ${dataSource}</p>
            <table class="stats-table">
                <tr><th>Data Source</th><th>Status</th><th>Entity Count</th></tr>
                <tr>
                    <td>VisionAppraisal</td>
                    <td>${vaLoaded ? '✅ Loaded' : '❌ Not Loaded'}</td>
                    <td>${sourceCounts['VisionAppraisal']}</td>
                </tr>
                <tr>
                    <td>Bloomerang</td>
                    <td>${blLoaded ? '✅ Loaded' : '❌ Not Loaded'}</td>
                    <td>${sourceCounts['Bloomerang']}</td>
                </tr>
                <tr style="font-weight: bold;">
                    <td>Total</td>
                    <td></td>
                    <td>${totalEntities}</td>
                </tr>
            </table>
        </div>
    `);

    if (Object.keys(entityTypeCounts).length > 0) {
        stats.push(`
            <div class="stats-section">
                <h2>Entity Type Breakdown</h2>
                <table class="stats-table">
                    <tr><th>Entity Type</th><th>Count</th><th>Percentage</th></tr>
                    ${Object.entries(entityTypeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => `
                        <tr>
                            <td>${type}</td>
                            <td>${count}</td>
                            <td>${totalEntities > 0 ? ((count / totalEntities) * 100).toFixed(1) : 0}%</td>
                        </tr>
                    `).join('')}
                </table>
            </div>
        `);
    }

    return stats.join('');
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Extract location identifier type and value from an entity wrapper
 * Used for reconciliation to get the canonical lookup key (source:type:value)
 * @param {Object} entityWrapper - Entity wrapper with source metadata
 * @returns {Object} { type: string, value: string }
 */
function getLocationIdentifierInfoFromWrapper(entityWrapper) {
    const entity = entityWrapper.entity;

    // Try to get locationIdentifier from entity
    if (entity.locationIdentifier) {
        const locId = entity.locationIdentifier;
        const type = locId.constructor?.name || 'Unknown';

        // Handle object structure (FireNumber, PID with primaryAlias)
        if (locId.primaryAlias && locId.primaryAlias.term) {
            return { type, value: String(locId.primaryAlias.term) };
        }
        // Handle direct term structure
        if (locId.term) {
            return { type, value: String(locId.term) };
        }
        // Handle raw value
        if (typeof locId === 'string' || typeof locId === 'number') {
            return { type: 'Unknown', value: String(locId) };
        }
    }

    // Fallback to account number for Bloomerang entities
    if (entity.accountNumber) {
        if (entity.accountNumber.primaryAlias && entity.accountNumber.primaryAlias.term) {
            return { type: 'AccountNumber', value: String(entity.accountNumber.primaryAlias.term) };
        }
        if (entity.accountNumber.term) {
            return { type: 'AccountNumber', value: String(entity.accountNumber.term) };
        }
    }

    // Last resort: use entity key from wrapper (strip prefix)
    if (entityWrapper.key) {
        const key = entityWrapper.key;
        if (key.startsWith('va_') || key.startsWith('bl_')) {
            return { type: 'Unknown', value: key.substring(3) };
        }
        return { type: 'Unknown', value: key };
    }

    return { type: 'Unknown', value: 'unknown' };
}

/**
 * Extract location identifier value from an entity wrapper (legacy compatibility)
 * @deprecated Use getLocationIdentifierInfoFromWrapper() instead
 */
function getLocationIdentifierFromWrapper(entityWrapper) {
    return getLocationIdentifierInfoFromWrapper(entityWrapper).value;
}

/**
 * Load script with promise-based waiting
 * @param {string} src - Script source path
 * @returns {Promise} Promise that resolves when script loads
 */
function loadScriptAsync(src) {
    return new Promise((resolve, reject) => {
        // Check if script already loaded
        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
    });
}

// =============================================================================
// INITIALIZATION
// =============================================================================

// Initialize the unified browser when the DOM is loaded
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeUnifiedBrowser);
    } else {
        initializeUnifiedBrowser();
    }
}

console.log("📚 Unified Entity Browser module loaded");

// =============================================================================
// EXPORTS FOR ENTITY GROUP BUILDER AND ENTITY GROUP BROWSER
// =============================================================================

// Export matching criteria and functions to window scope for use by entityGroupBuilder.js
// Export basicEntityDetailsView for drill-down style View Details in EntityGroup Browser
if (typeof window !== 'undefined') {
    window.MATCH_CRITERIA = MATCH_CRITERIA;
    window.isTrueMatch = isTrueMatch;
    window.isNearMatch = isNearMatch;
    window.basicEntityDetailsView = basicEntityDetailsView;
}