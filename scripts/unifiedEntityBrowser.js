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

    // Stats button
    const statsBtn = document.getElementById('unifiedStatsBtn');
    if (statsBtn) {
        statsBtn.addEventListener('click', showUnifiedStats);
    }

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
 * Uses existing workingLoadedEntities global structure
 * @returns {Array} Array of entity objects with source metadata
 */
function getAllSelectedEntities() {
    if (!window.workingLoadedEntities || workingLoadedEntities.status !== 'loaded') {
        console.warn('workingLoadedEntities not loaded');
        return [];
    }

    const entities = [];

    // Determine which data sources to include
    const sourcesToCheck = unifiedBrowser.selectedDataSource === 'all'
        ? ['visionappraisal', 'bloomerang']
        : [unifiedBrowser.selectedDataSource];

    for (const sourceKey of sourcesToCheck) {
        if (sourceKey === 'visionappraisal') {
            // VisionAppraisal: single array of entities
            if (workingLoadedEntities.visionAppraisal.loaded && workingLoadedEntities.visionAppraisal.entities) {
                const sourceEntities = workingLoadedEntities.visionAppraisal.entities.filter(entity =>
                    unifiedBrowser.selectedEntityType === 'all' ||
                    getEntityType(entity) === unifiedBrowser.selectedEntityType
                );

                sourceEntities.forEach((entity, index) => {
                    entities.push({
                        source: 'VisionAppraisal',
                        sourceKey: sourceKey,
                        entityType: getEntityType(entity),
                        index: index,
                        key: `va_${index}`,
                        entity: entity
                    });
                });
            }

        } else if (sourceKey === 'bloomerang') {
            // Bloomerang: collection-based structure
            if (workingLoadedEntities.bloomerang && workingLoadedEntities.bloomerang.loaded) {
                const collections = ['individuals', 'households', 'nonhuman'];

                for (const collectionType of collections) {
                    const collection = workingLoadedEntities.bloomerang[collectionType];
                    if (!collection || !collection.entities) continue;

                    const entityTypeMapping = {
                        'individuals': 'Individual',
                        'households': 'AggregateHousehold',
                        'nonhuman': 'NonHuman'
                    };

                    const collectionEntityType = entityTypeMapping[collectionType] || collectionType;

                    // Filter by entity type if specific type selected
                    if (unifiedBrowser.selectedEntityType !== 'all' &&
                        collectionEntityType !== unifiedBrowser.selectedEntityType) {
                        continue;
                    }

                    // Note: entities is an object, not array, with keys
                    for (const [key, entity] of Object.entries(collection.entities)) {
                        entities.push({
                            source: 'Bloomerang',
                            sourceKey: sourceKey,
                            entityType: collectionEntityType,
                            index: key,
                            key: `bl_${key}`,
                            entity: entity
                        });
                    }
                }
            }
        }
    }

    return entities;
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
        let matchResults;
        if (typeof findBestMatches === 'function') {
            matchResults = findBestMatches(entity);
        } else {
            // Fallback - perform basic matching here
            matchResults = performBasicMatchAnalysis(entity, entityWrapper);
        }

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

    // Generate content based on results structure
    let resultsHtml = '';

    if (results.bestMatchesByType) {
        // Results from universalEntityMatcher (grouped by type)
        resultsHtml = generateUniversalMatcherResultsHtml(results);
    } else if (results.byType) {
        // Alternative property name for universalEntityMatcher results
        resultsHtml = generateUniversalMatcherResultsHtml(results);
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
    `;
}

/**
 * Generate HTML for results from universalEntityMatcher
 * @param {Object} results - Results grouped by type
 * @returns {string} HTML content
 */
function generateUniversalMatcherResultsHtml(results) {
    let html = '';

    // Get the match data - support both property names for compatibility
    const matchesByType = results.bestMatchesByType || results.byType || {};

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
            const nameScore = match.details?.components?.name?.similarity;
            const hasHighNameScore = nameScore && nameScore > 0.985;

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
    const entityTypeCounts = {};
    const sourceCounts = {
        'VisionAppraisal': 0,
        'Bloomerang': 0
    };

    // Analyze loaded data from workingLoadedEntities
    if (window.workingLoadedEntities && workingLoadedEntities.status === 'loaded') {

        // VisionAppraisal data
        if (workingLoadedEntities.visionAppraisal.loaded && workingLoadedEntities.visionAppraisal.entities) {
            const vaCount = workingLoadedEntities.visionAppraisal.entities.length;
            sourceCounts['VisionAppraisal'] = vaCount;
            totalEntities += vaCount;

            workingLoadedEntities.visionAppraisal.entities.forEach(entity => {
                const type = getEntityType(entity);
                entityTypeCounts[type] = (entityTypeCounts[type] || 0) + 1;
            });
        }

        // Bloomerang data
        if (workingLoadedEntities.bloomerang && workingLoadedEntities.bloomerang.loaded) {
            let bloomerangTotal = 0;

            const collections = ['individuals', 'households', 'nonhuman'];
            const entityTypeMapping = {
                'individuals': 'Individual',
                'households': 'AggregateHousehold',
                'nonhuman': 'NonHuman'
            };

            collections.forEach(collectionType => {
                const collection = workingLoadedEntities.bloomerang[collectionType];
                if (collection && collection.entities) {
                    const count = Object.keys(collection.entities).length;
                    bloomerangTotal += count;

                    const mappedType = entityTypeMapping[collectionType] || collectionType;
                    entityTypeCounts[mappedType] = (entityTypeCounts[mappedType] || 0) + count;
                }
            });

            sourceCounts['Bloomerang'] = bloomerangTotal;
            totalEntities += bloomerangTotal;
        }
    }

    // Build statistics HTML
    stats.push(`
        <div class="stats-section">
            <h2>Data Source Summary</h2>
            <table class="stats-table">
                <tr><th>Data Source</th><th>Status</th><th>Entity Count</th></tr>
                <tr>
                    <td>VisionAppraisal</td>
                    <td>${workingLoadedEntities?.visionAppraisal?.loaded ? '✅ Loaded' : '❌ Not Loaded'}</td>
                    <td>${sourceCounts['VisionAppraisal']}</td>
                </tr>
                <tr>
                    <td>Bloomerang</td>
                    <td>${workingLoadedEntities?.bloomerang?.loaded ? '✅ Loaded' : '❌ Not Loaded'}</td>
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