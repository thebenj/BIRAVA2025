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
    return entity.type || entity.constructor?.name || 'Unknown';
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

    // This will use the generalized HTML presentation engine
    // which will be implemented in entityRenderer.js
    if (typeof renderEntityDetailsWindow === 'function') {
        renderEntityDetailsWindow(unifiedBrowser.selectedEntity);
    } else {
        // Fallback to basic display
        basicEntityDetailsView(unifiedBrowser.selectedEntity);
    }
}

/**
 * Basic entity details view (fallback)
 * @param {Object} entityWrapper - Selected entity wrapper
 */
function basicEntityDetailsView(entityWrapper) {
    const detailsWindow = window.open('', '_blank', 'width=1000,height=700,scrollbars=yes');
    detailsWindow.document.write(`
        <html>
            <head>
                <title>Entity Details: ${entityWrapper.key}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .source-info { background: #f0f0f0; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
                    pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow: auto; }
                </style>
            </head>
            <body>
                <div class="source-info">
                    <h2>Entity Information</h2>
                    <p><strong>Source:</strong> ${entityWrapper.source}</p>
                    <p><strong>Type:</strong> ${entityWrapper.entityType}</p>
                    <p><strong>Key:</strong> ${entityWrapper.key}</p>
                </div>
                <h3>Complete Entity Data:</h3>
                <pre>${JSON.stringify(entityWrapper.entity, null, 2)}</pre>
            </body>
        </html>
    `);
    detailsWindow.document.close();
}

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