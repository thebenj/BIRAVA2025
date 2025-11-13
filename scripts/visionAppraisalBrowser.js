// visionAppraisalBrowser.js - VisionAppraisal Entity Browser Tool for BIRAVA2025
//
// ARCHITECTURAL PURPOSE: Provides comprehensive web interface for querying and managing
// VisionAppraisal entity data from the single processed entities file. This tool enables
// interactive search across all VisionAppraisal fields and property data.
//
// KEY DIFFERENCES FROM BLOOMERANG BROWSER:
// - Single file architecture (not collection-based)
// - Fixed file ID (overwrites same file, no dynamic configuration needed)
// - VisionAppraisal-specific entity structure (Individual, AggregateHousehold, Business, LegalConstruct)
// - Property-focused search (PID, Fire Numbers, addresses, owner names)

// Global state management for VisionAppraisal Entity Browser
const visionAppraisalBrowser = {
    entities: null,              // Single array of all VisionAppraisal entities
    currentResults: [],          // Filtered search results for display
    selectedEntity: null,        // Currently selected entity for detailed viewing

    // VisionAppraisal file configuration
    fileId: '19cgccMYNBboL07CmMP-5hNNGwEUBXgCI', // Fixed file ID for VisionAppraisal_ParsedEntities.json
    fileName: 'VisionAppraisal_ParsedEntities.json'
};

/**
 * Load VisionAppraisal entities from Google Drive
 * Uses the fixed file ID for VisionAppraisal_ParsedEntities.json
 *
 * @returns {Promise<void>} Resolves when entities are loaded into visionAppraisalBrowser.entities
 */
async function loadVisionAppraisalData() {
    showVAStatus('Loading VisionAppraisal entities from Google Drive...', 'loading');

    try {
        console.log(`Loading VisionAppraisal entities from: ${visionAppraisalBrowser.fileName}`);

        const response = await gapi.client.drive.files.get({
            fileId: visionAppraisalBrowser.fileId,
            alt: 'media'
        });

        const fileData = JSON.parse(response.body);

        // The file has structure: { metadata: {...}, entities: [...] }
        if (fileData.entities && Array.isArray(fileData.entities)) {
            visionAppraisalBrowser.entities = fileData.entities;
            visionAppraisalBrowser.metadata = fileData.metadata;

            console.log(`✅ Loaded ${fileData.entities.length} VisionAppraisal entities`);
            console.log(`Metadata:`, fileData.metadata);

            // Analyze entity types for stats
            const entityTypes = {};
            fileData.entities.forEach(entity => {
                const type = entity.constructor?.name || 'Unknown';
                entityTypes[type] = (entityTypes[type] || 0) + 1;
            });

            console.log('Entity type breakdown:', entityTypes);

            showVAStatus('VisionAppraisal data loaded successfully!', 'success');

            // Show all entities initially
            showAllVA();
        } else {
            throw new Error('Invalid file structure - expected entities array');
        }

    } catch (error) {
        console.error('❌ Error loading VisionAppraisal data:', error);
        showVAStatus('Error loading VisionAppraisal data. Make sure you\'re authenticated with Google Drive.', 'error');
    }
}

/**
 * Show all VisionAppraisal entities
 */
function showAllVA() {
    if (!visionAppraisalBrowser.entities) {
        showVAStatus('VisionAppraisal data not loaded. Click "Load VisionAppraisal Data" first.', 'error');
        return;
    }

    // Convert entities array to [index, entity] pairs for consistency with Bloomerang browser
    const entityPairs = visionAppraisalBrowser.entities.map((entity, index) => [index, entity]);
    displayVAResults(entityPairs);

    document.getElementById('vaResultsCount').textContent =
        `Showing all ${visionAppraisalBrowser.entities.length} VisionAppraisal entities`;
}

/**
 * Perform search across VisionAppraisal entities
 */
function performVASearch() {
    const query = document.getElementById('vaSearchInput').value.trim().toLowerCase();

    if (!query) {
        showAllVA();
        return;
    }

    if (!visionAppraisalBrowser.entities) {
        showVAStatus('VisionAppraisal data not loaded. Click "Load VisionAppraisal Data" first.', 'error');
        return;
    }

    const results = [];

    // Search through entities
    visionAppraisalBrowser.entities.forEach((entity, index) => {
        if (vaEntityMatchesQuery(entity, query)) {
            results.push([index, entity]);
        }
    });

    displayVAResults(results);
    document.getElementById('vaResultsCount').textContent =
        `Found ${results.length} results for "${query}"`;
}

/**
 * Check if VisionAppraisal entity matches search query
 * Searches across VisionAppraisal-specific fields like PID, Fire Numbers, owner names, addresses
 *
 * @param {Object} entity - VisionAppraisal entity object
 * @param {string} query - Search query string (case-insensitive)
 * @returns {boolean} True if entity matches query
 */
function vaEntityMatchesQuery(entity, query) {
    // Convert entity to searchable string - covers all nested properties
    const entityStr = JSON.stringify(entity).toLowerCase();
    return entityStr.includes(query);
}

/**
 * Quick filter functions for VisionAppraisal data
 */
function quickVAFilter(filterType) {
    if (!visionAppraisalBrowser.entities) {
        showVAStatus('VisionAppraisal data not loaded. Click "Load VisionAppraisal Data" first.', 'error');
        return;
    }

    let results = [];

    switch (filterType) {
        case 'pid':
            // Filter entities with PID information
            results = visionAppraisalBrowser.entities
                .map((entity, index) => [index, entity])
                .filter(([index, entity]) => {
                    const entityStr = JSON.stringify(entity).toLowerCase();
                    return entityStr.includes('pid');
                });
            break;
        case 'fire':
            // Filter entities with Fire Number information
            results = visionAppraisalBrowser.entities
                .map((entity, index) => [index, entity])
                .filter(([index, entity]) => {
                    const entityStr = JSON.stringify(entity).toLowerCase();
                    return entityStr.includes('firenumber') || entityStr.includes('fire');
                });
            break;
        case 'owner':
            // Filter entities with owner name information
            results = visionAppraisalBrowser.entities
                .map((entity, index) => [index, entity])
                .filter(([index, entity]) => {
                    return entity.name && entity.name.identifier;
                });
            break;
        default:
            results = visionAppraisalBrowser.entities.map((entity, index) => [index, entity]);
    }

    displayVAResults(results);
    document.getElementById('vaResultsCount').textContent =
        `Showing ${results.length} entities filtered by ${filterType}`;
}

/**
 * Display VisionAppraisal search results in the UI
 */
function displayVAResults(results) {
    const resultsList = document.getElementById('vaResultsList');

    if (results.length === 0) {
        resultsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No results found</div>';
        return;
    }

    const html = results.map(([index, entity]) => {
        const entityName = extractVAEntityName(entity);
        const entityDetails = extractVAEntityDetails(entity);
        const entityType = entity.constructor?.name || 'Unknown';

        return `
            <div class="result-item" onclick="selectVAEntity(${index}, this)">
                <div class="entity-key">${entityType} #${index}</div>
                <div class="entity-name">${entityName}</div>
                <div class="entity-details">${entityDetails}</div>
            </div>
        `;
    }).join('');

    resultsList.innerHTML = html;
    visionAppraisalBrowser.currentResults = results;
}

/**
 * Extract display name from VisionAppraisal entity
 */
function extractVAEntityName(entity) {
    if (!entity.name || !entity.name.identifier) return 'Unknown';

    const nameObj = entity.name.identifier;

    if (nameObj.completeName) {
        return nameObj.completeName;
    }

    if (nameObj.fullName) {
        return nameObj.fullName;
    }

    if (nameObj.firstName && nameObj.lastName) {
        return `${nameObj.firstName} ${nameObj.lastName}`;
    }

    return 'Name available';
}

/**
 * Extract VisionAppraisal entity details for display
 */
function extractVAEntityDetails(entity) {
    const details = [];

    // Add PID if available
    if (entity.pid && entity.pid.identifier && entity.pid.identifier.primaryAlias) {
        details.push(`PID: ${entity.pid.identifier.primaryAlias.term}`);
    }

    // Add Fire Number if available
    if (entity.locationIdentifier && entity.locationIdentifier.identifier) {
        const locId = entity.locationIdentifier.identifier;
        if (locId.primaryAlias) {
            details.push(`Fire #: ${locId.primaryAlias.term}`);
        }
    }

    // Add property location if available
    if (entity.propertyLocationAddress && entity.propertyLocationAddress.street) {
        details.push(`Address: ${entity.propertyLocationAddress.street}`);
    }

    return details.join(' | ') || 'Details available';
}

/**
 * Select a VisionAppraisal entity for detailed viewing
 */
function selectVAEntity(index, element) {
    // Remove previous selection
    document.querySelectorAll('#vaResultsList .result-item').forEach(item => {
        item.style.backgroundColor = '';
    });

    // Highlight selected item
    element.style.backgroundColor = '#e3f2fd';

    // Store selected entity
    const entity = visionAppraisalBrowser.entities[index];
    visionAppraisalBrowser.selectedEntity = { index, entity };
}

/**
 * View selected VisionAppraisal entity details
 */
function viewSelectedVAEntity() {
    if (!visionAppraisalBrowser.selectedEntity) {
        showVAStatus('Please select an entity first', 'error');
        return;
    }

    const { index, entity } = visionAppraisalBrowser.selectedEntity;

    // Create detailed view
    const detailsWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
    detailsWindow.document.write(`
        <html>
            <head><title>VisionAppraisal Entity Details: #${index}</title></head>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>VisionAppraisal Entity Details</h2>
                <p><strong>Entity Index:</strong> ${index}</p>
                <p><strong>Entity Type:</strong> ${entity.constructor?.name || 'Unknown'}</p>
                <h3>Full Entity Data:</h3>
                <pre style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; overflow: auto;">
${JSON.stringify(entity, null, 2)}
                </pre>
            </body>
        </html>
    `);
    detailsWindow.document.close();
}

/**
 * Export current VisionAppraisal results
 */
function exportVAResults() {
    if (visionAppraisalBrowser.currentResults.length === 0) {
        showVAStatus('No results to export', 'error');
        return;
    }

    const exportData = {
        source: 'VisionAppraisal',
        fileId: visionAppraisalBrowser.fileId,
        fileName: visionAppraisalBrowser.fileName,
        exportedAt: new Date().toISOString(),
        totalResults: visionAppraisalBrowser.currentResults.length,
        results: visionAppraisalBrowser.currentResults.map(([index, entity]) => ({
            index,
            entity
        }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)],
                         { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `visionappraisal_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
    showVAStatus(`Exported ${visionAppraisalBrowser.currentResults.length} results`, 'success');
}

/**
 * Show VisionAppraisal data statistics
 */
function showVAStats() {
    if (!visionAppraisalBrowser.entities) {
        showVAStatus('VisionAppraisal data not loaded. Click "Load VisionAppraisal Data" first.', 'error');
        return;
    }

    // Analyze entity types
    const entityTypes = {};
    let totalEntities = 0;

    visionAppraisalBrowser.entities.forEach(entity => {
        totalEntities++;
        const type = entity.constructor?.name || 'Unknown';
        entityTypes[type] = (entityTypes[type] || 0) + 1;
    });

    let statsHtml = `
        <h3>VisionAppraisal Data Statistics</h3>
        <p><strong>Total Entities:</strong> ${totalEntities}</p>
        <h4>Entity Types:</h4>
        <ul>
    `;

    for (const [type, count] of Object.entries(entityTypes)) {
        const percentage = ((count / totalEntities) * 100).toFixed(1);
        statsHtml += `<li><strong>${type}:</strong> ${count} entities (${percentage}%)</li>`;
    }

    statsHtml += '</ul>';

    const statsWindow = window.open('', '_blank', 'width=600,height=400,scrollbars=yes');
    statsWindow.document.write(`
        <html>
            <head><title>VisionAppraisal Statistics</title></head>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                ${statsHtml}
            </body>
        </html>
    `);
    statsWindow.document.close();
}

/**
 * Clear VisionAppraisal search input and show all
 */
function clearVASearch() {
    document.getElementById('vaSearchInput').value = '';
    showAllVA();
}

/**
 * Handle Enter key in VisionAppraisal search input
 */
function handleVASearchKeyPress(event) {
    if (event.key === 'Enter') {
        performVASearch();
    }
}

/**
 * Show VisionAppraisal status message
 */
function showVAStatus(message, type) {
    const statusElement = document.getElementById('vaStatusMessage');
    statusElement.textContent = message;
    statusElement.className = `status-message status-${type}`;
    statusElement.style.display = 'block';

    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 3000);
    }
}