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

        // Use recursive deserialization if available, fallback to JSON.parse
        let fileData;
        if (typeof deserializeWithTypes === 'function') {
            console.log("🔄 Browser tool using recursive deserialization to restore class constructors...");
            fileData = deserializeWithTypes(response.body);
        } else {
            console.log("⚠️ Browser tool falling back to JSON.parse (classes will be plain objects)");
            fileData = JSON.parse(response.body);
        }

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
        const entityType = entity.entityType || entity.constructor?.name || 'Unknown';

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
    if (!entity.name) return 'Unknown';

    // Handle AttributedTerm names (households, businesses, legal constructs)
    if (entity.name.term) {
        return entity.name.term;
    }

    // Handle IndividualName structures
    if (entity.name.type === 'IndividualName') {
        // Try completeName first
        if (entity.name.completeName) {
            return entity.name.completeName;
        }

        // Build name from parts
        const nameParts = [];
        if (entity.name.firstName) nameParts.push(entity.name.firstName);
        if (entity.name.lastName) nameParts.push(entity.name.lastName);

        if (nameParts.length > 0) {
            return nameParts.join(' ');
        }
    }

    // Handle HouseholdName or other name types
    if (entity.name.completeName) {
        return entity.name.completeName;
    }

    // Handle nested identifier pattern
    if (entity.name.identifier) {
        if (entity.name.identifier.term) {
            return entity.name.identifier.term;
        }
        if (entity.name.identifier.completeName) {
            return entity.name.identifier.completeName;
        }
        if (entity.name.identifier.firstName && entity.name.identifier.lastName) {
            return `${entity.name.identifier.firstName} ${entity.name.identifier.lastName}`;
        }
    }

    return 'Unknown';
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
 * View selected VisionAppraisal entity details with enhanced HTML display
 */
function viewSelectedVAEntity() {
    if (!visionAppraisalBrowser.selectedEntity) {
        showVAStatus('Please select an entity first', 'error');
        return;
    }

    const { index, entity } = visionAppraisalBrowser.selectedEntity;

    // Generate the enhanced HTML display
    const htmlContent = generateEntityDetailHTML(entity, index);

    // Create detailed view window
    const detailsWindow = window.open('', '_blank', 'width=1000,height=700,scrollbars=yes');
    detailsWindow.document.write(htmlContent);
    detailsWindow.document.close();
}

/**
 * Generate comprehensive HTML display for VisionAppraisal entity
 */
function generateEntityDetailHTML(entity, index) {
    const entityType = entity.type || 'Unknown';
    const entityName = extractVAEntityName(entity);

    return `
        <html>
            <head>
                <title>VisionAppraisal Entity: ${entityName}</title>
                <style>
                    ${getEntityDetailStyles()}
                </style>
            </head>
            <body>
                <div class="container">
                    ${generateHeaderSection(entity, index)}
                    ${generateIdentifiersSection(entity)}
                    ${generateContactInfoSection(entity)}
                    ${generateEntitySpecificSection(entity)}
                    ${generateMetadataSection(entity)}
                    ${generateRawDataSection(entity)}
                </div>

                <script>
                    ${getEntityDetailScripts()}
                </script>
            </body>
        </html>
    `;
}

/**
 * Generate CSS styles for entity detail display
 */
function getEntityDetailStyles() {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f7fa;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 25px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        .entity-type-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .badge-individual { background-color: rgba(52, 152, 219, 0.2); }
        .badge-household { background-color: rgba(46, 204, 113, 0.2); }
        .badge-business { background-color: rgba(230, 126, 34, 0.2); }
        .badge-legal { background-color: rgba(155, 89, 182, 0.2); }

        .entity-name {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 15px;
            line-height: 1.2;
        }

        .quick-info {
            display: flex;
            gap: 30px;
            flex-wrap: wrap;
        }

        .quick-info-item {
            display: flex;
            flex-direction: column;
        }

        .quick-info-label {
            font-size: 0.9rem;
            opacity: 0.8;
            margin-bottom: 2px;
        }

        .quick-info-value {
            font-size: 1.1rem;
            font-weight: 600;
        }

        .card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border: 1px solid #e1e5e9;
        }

        .card-title {
            font-size: 1.3rem;
            font-weight: 600;
            margin-bottom: 20px;
            color: #2c3e50;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .card-title::before {
            content: '';
            width: 4px;
            height: 24px;
            background: #3498db;
            border-radius: 2px;
        }

        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }

        .info-item {
            display: flex;
            flex-direction: column;
        }

        .info-label {
            font-size: 0.9rem;
            color: #7f8c8d;
            margin-bottom: 5px;
            font-weight: 500;
        }

        .info-value {
            font-size: 1rem;
            color: #2c3e50;
            padding: 8px 12px;
            background-color: #f8f9fa;
            border-radius: 6px;
            border-left: 3px solid #3498db;
            min-height: 20px;
        }

        .info-value.empty {
            color: #95a5a6;
            font-style: italic;
        }

        .address-block {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
        }

        .address-title {
            font-weight: 600;
            color: #495057;
            margin-bottom: 10px;
            font-size: 1rem;
        }

        .address-line {
            margin-bottom: 5px;
            color: #6c757d;
        }

        .collapsible {
            background-color: #e9ecef;
            color: #495057;
            cursor: pointer;
            padding: 15px;
            border: none;
            text-align: left;
            outline: none;
            font-size: 1rem;
            font-weight: 600;
            border-radius: 8px;
            margin-bottom: 10px;
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .collapsible:hover {
            background-color: #dee2e6;
        }

        .collapsible::after {
            content: '+';
            font-weight: bold;
            font-size: 1.2rem;
        }

        .collapsible.active::after {
            content: '−';
        }

        .content {
            padding: 0 15px;
            background-color: white;
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease-out;
            border-radius: 0 0 8px 8px;
        }

        .content.active {
            padding: 15px;
            max-height: 1000px;
            transition: max-height 0.3s ease-in;
        }

        .raw-json {
            background-color: #2c3e50;
            color: #ecf0f1;
            padding: 20px;
            border-radius: 8px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.9rem;
            line-height: 1.4;
            overflow-x: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        .metadata-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }

        .individuals-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .individual-item {
            background-color: #f8f9fa;
            padding: 12px;
            border-radius: 6px;
            border-left: 3px solid #28a745;
        }

        @media (max-width: 768px) {
            .container {
                padding: 15px;
            }

            .entity-name {
                font-size: 1.5rem;
            }

            .quick-info {
                flex-direction: column;
                gap: 15px;
            }

            .info-grid {
                grid-template-columns: 1fr;
            }
        }
    `;
}

/**
 * Generate header section HTML
 */
function generateHeaderSection(entity, index) {
    const entityType = entity.type || 'Unknown';
    const entityName = extractVAEntityName(entity);
    const pid = entity.pid || 'Not Available';
    const locationId = entity.locationIdentifier || 'Not Available';
    const accountNumber = entity.accountNumber?.term || 'Not Available';

    // Determine badge class based on entity type
    const badgeClass = {
        'Individual': 'badge-individual',
        'AggregateHousehold': 'badge-household',
        'Business': 'badge-business',
        'LegalConstruct': 'badge-legal'
    }[entityType] || 'badge-individual';

    return `
        <div class="header">
            <div class="entity-type-badge ${badgeClass}">${entityType}</div>
            <div class="entity-name">${entityName}</div>
            <div class="quick-info">
                <div class="quick-info-item">
                    <div class="quick-info-label">Entity Index</div>
                    <div class="quick-info-value">#${index}</div>
                </div>
                <div class="quick-info-item">
                    <div class="quick-info-label">PID</div>
                    <div class="quick-info-value">${pid}</div>
                </div>
                <div class="quick-info-item">
                    <div class="quick-info-label">Location ID</div>
                    <div class="quick-info-value">${locationId}</div>
                </div>
                <div class="quick-info-item">
                    <div class="quick-info-label">Account Number</div>
                    <div class="quick-info-value">${accountNumber}</div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Generate identifiers section HTML
 */
function generateIdentifiersSection(entity) {
    const mbluTerm = entity.mblu?.term || 'Not Available';
    const fireNumber = entity.fireNumber || 'Not Available';
    const googleFileId = entity.googleFileId || 'Not Available';
    const source = entity.source || 'Not Available';

    return `
        <div class="card">
            <div class="card-title">Core Identifiers</div>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">MBLU (Map/Block/Lot/Unit)</div>
                    <div class="info-value">${mbluTerm}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Fire Number</div>
                    <div class="info-value">${fireNumber}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Google File ID</div>
                    <div class="info-value">${googleFileId}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Data Source</div>
                    <div class="info-value">${source}</div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Generate contact information section HTML
 */
function generateContactInfoSection(entity) {
    if (!entity.contactInfo) {
        return `
            <div class="card">
                <div class="card-title">Contact Information</div>
                <div class="info-value empty">No contact information available</div>
            </div>
        `;
    }

    const contactInfo = entity.contactInfo;
    let addressesHTML = '';

    // Primary Address
    if (contactInfo.primaryAddress) {
        addressesHTML += generateAddressHTML('Primary Address', contactInfo.primaryAddress);
    }

    // Secondary Addresses
    if (contactInfo.secondaryAddress && Array.isArray(contactInfo.secondaryAddress)) {
        contactInfo.secondaryAddress.forEach((addr, index) => {
            addressesHTML += generateAddressHTML(`Secondary Address ${index + 1}`, addr);
        });
    }

    const email = contactInfo.email || 'Not Available';
    const phone = contactInfo.phone || 'Not Available';
    const poBox = contactInfo.poBox || 'Not Available';

    return `
        <div class="card">
            <div class="card-title">Contact Information</div>

            ${addressesHTML}

            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Email</div>
                    <div class="info-value ${email === 'Not Available' ? 'empty' : ''}">${email}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Phone</div>
                    <div class="info-value ${phone === 'Not Available' ? 'empty' : ''}">${phone}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">PO Box</div>
                    <div class="info-value ${poBox === 'Not Available' ? 'empty' : ''}">${poBox}</div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Generate address HTML block
 */
function generateAddressHTML(title, address) {
    if (!address) return '';

    // Handle different address structures
    let addressLines = [];

    // For primary addresses - handle complex Address objects
    if (address.primaryAlias?.term) {
        // Clean VisionAppraisal tags from address text
        const cleanedAddress = cleanVisionAppraisalTags(address.primaryAlias.term);
        addressLines.push(cleanedAddress);
    } else if (address.street) {
        // Handle direct street property
        const cleanedStreet = cleanVisionAppraisalTags(address.street);
        addressLines.push(cleanedStreet);
    }

    // Handle city, state, zip (which may be AttributedTerm objects)
    const cityStateZipParts = [];

    // Extract city - handle both AttributedTerm objects and strings
    if (address.city) {
        const cityText = address.city.term || address.city.toString();
        if (cityText && cityText !== '[object Object]') {
            cityStateZipParts.push(cleanVisionAppraisalTags(cityText));
        }
    }

    // Extract state - handle both AttributedTerm objects and strings
    if (address.state) {
        const stateText = address.state.term || address.state.toString();
        if (stateText && stateText !== '[object Object]') {
            cityStateZipParts.push(cleanVisionAppraisalTags(stateText));
        }
    }

    // Extract zip - check both 'zip' and 'zipCode' properties
    const zipValue = address.zip || address.zipCode;
    if (zipValue) {
        const zipText = zipValue.term || zipValue.toString();
        if (zipText && zipText !== '[object Object]') {
            cityStateZipParts.push(cleanVisionAppraisalTags(zipText));
        }
    }

    // Combine city, state, zip with proper formatting
    if (cityStateZipParts.length > 0) {
        // Format as "City, State ZIP" or "State ZIP" or "City ZIP" etc.
        let cityStateZip = '';
        if (cityStateZipParts.length >= 2) {
            // Has at least city and state/zip
            cityStateZip = cityStateZipParts.slice(0, -1).join(', ') + ' ' + cityStateZipParts[cityStateZipParts.length - 1];
        } else {
            // Just one component
            cityStateZip = cityStateZipParts[0];
        }
        addressLines.push(cityStateZip);
    }

    // Handle string addresses (legacy/fallback case)
    if (typeof address === 'string') {
        const cleanedAddress = cleanVisionAppraisalTags(address);
        if (cleanedAddress) {
            addressLines = [cleanedAddress];
        }
    }

    // Handle originalAddress fallback (may be AttributedTerm object)
    if (addressLines.length === 0 && address.originalAddress) {
        const originalText = address.originalAddress.term || address.originalAddress.toString();
        const cleanedOriginal = cleanVisionAppraisalTags(originalText);
        addressLines.push(cleanedOriginal);
    }

    // Final fallback
    if (addressLines.length === 0) {
        addressLines.push('Address information not available');
    }

    const addressHTML = addressLines.map(line => `<div class="address-line">${line}</div>`).join('');

    return `
        <div class="address-block">
            <div class="address-title">${title}</div>
            ${addressHTML}
        </div>
    `;
}

/**
 * Clean VisionAppraisal tags from address text
 */
function cleanVisionAppraisalTags(text) {
    if (!text || typeof text !== 'string') return 'Not Available';

    return text
        // Remove VisionAppraisal specific tags
        .replace(/::#\^#::/g, ', ')    // Replace city separator with comma-space
        .replace(/:\^#\^:/g, ' ')      // Replace state separator with space
        .replace(/\^#\^/g, ' ')        // Replace any remaining tags with space
        // Clean up extra spaces and formatting
        .replace(/\s+/g, ' ')          // Multiple spaces to single space
        .replace(/,\s*,/g, ',')        // Remove double commas
        .replace(/^\s*,\s*|\s*,\s*$/g, '') // Remove leading/trailing commas
        .trim();
}

/**
 * Generate entity-specific section HTML
 */
function generateEntitySpecificSection(entity) {
    const entityType = entity.type || 'Unknown';

    switch (entityType) {
        case 'AggregateHousehold':
            return generateHouseholdSection(entity);
        case 'Business':
            return generateBusinessSection(entity);
        case 'LegalConstruct':
            return generateLegalConstructSection(entity);
        case 'Individual':
            return generateIndividualSection(entity);
        default:
            return '';
    }
}

/**
 * Generate household-specific section
 */
function generateHouseholdSection(entity) {
    if (!entity.individuals || !Array.isArray(entity.individuals) || entity.individuals.length === 0) {
        return `
            <div class="card">
                <div class="card-title">Household Members</div>
                <div class="info-value empty">No individual members listed</div>
            </div>
        `;
    }

    const individualsHTML = entity.individuals.map((individual, index) => {
        const name = individual.name?.term || `Individual ${index + 1}`;
        return `<div class="individual-item">${name}</div>`;
    }).join('');

    return `
        <div class="card">
            <div class="card-title">Household Members (${entity.individuals.length})</div>
            <div class="individuals-list">
                ${individualsHTML}
            </div>
        </div>
    `;
}

/**
 * Generate business-specific section
 */
function generateBusinessSection(entity) {
    // Business entities may have specific business-related fields
    const label = entity.label || 'Not Available';
    const number = entity.number || 'Not Available';

    return `
        <div class="card">
            <div class="card-title">Business Information</div>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Business Label</div>
                    <div class="info-value">${label}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Business Number</div>
                    <div class="info-value">${number}</div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Generate legal construct section
 */
function generateLegalConstructSection(entity) {
    const label = entity.label || 'Not Available';
    const number = entity.number || 'Not Available';

    return `
        <div class="card">
            <div class="card-title">Legal Construct Information</div>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Legal Label</div>
                    <div class="info-value">${label}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Legal Number</div>
                    <div class="info-value">${number}</div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Generate individual-specific section
 */
function generateIndividualSection(entity) {
    const label = entity.label || 'Not Available';
    const number = entity.number || 'Not Available';

    return `
        <div class="card">
            <div class="card-title">Individual Information</div>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Individual Label</div>
                    <div class="info-value">${label}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Individual Number</div>
                    <div class="info-value">${number}</div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Generate metadata section HTML
 */
function generateMetadataSection(entity) {
    return `
        <div class="card">
            <div class="card-title">Processing Metadata</div>
            <div class="metadata-grid">
                <div class="info-item">
                    <div class="info-label">Entity Type</div>
                    <div class="info-value">${entity.entityType || entity.type || 'Unknown'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Source System</div>
                    <div class="info-value">${entity.source || 'VisionAppraisal'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Google File ID</div>
                    <div class="info-value">${entity.googleFileId || 'Not Available'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Has Other Info</div>
                    <div class="info-value">${entity.otherInfo ? 'Yes' : 'No'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Has Legacy Info</div>
                    <div class="info-value">${entity.legacyInfo ? 'Yes' : 'No'}</div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Generate raw data section HTML
 */
function generateRawDataSection(entity) {
    return `
        <button class="collapsible">Technical Details & Raw Data</button>
        <div class="content">
            <div class="raw-json">${JSON.stringify(entity, null, 2)}</div>
        </div>
    `;
}

/**
 * Get JavaScript code for entity detail window
 */
function getEntityDetailScripts() {
    return `
        // Collapsible section functionality
        document.addEventListener('DOMContentLoaded', function() {
            const collapsibles = document.querySelectorAll('.collapsible');

            collapsibles.forEach(function(collapsible) {
                collapsible.addEventListener('click', function() {
                    this.classList.toggle('active');
                    const content = this.nextElementSibling;

                    if (content.style.maxHeight) {
                        content.style.maxHeight = null;
                        content.classList.remove('active');
                    } else {
                        content.style.maxHeight = content.scrollHeight + "px";
                        content.classList.add('active');
                    }
                });
            });
        });
    `;
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

/**
 * Analyze street type patterns in VisionAppraisal data
 *
 * TESTING FUNCTION: Preserved for regression testing and analysis
 * Purpose: Understand street type extraction patterns and parser behavior
 *
 * Key Findings from Analysis:
 * - Most street types extracted from NON-END words (58 types vs 1 end-only type)
 * - State abbreviations misinterpreted as street types ("CT" → "Ct" for Court)
 * - Block Island addresses show "NECK" → "Nck" pattern
 * - Parser aggressively extracts types from anywhere in address string
 */
function analyzeStreetTypePatterns() {
    if (!visionAppraisalBrowser.entities) {
        showVAStatus('VisionAppraisal data not loaded. Click "Load VisionAppraisal Data" first.', 'error');
        return;
    }

    console.log('🔍 Starting Street Type Pattern Analysis...');

    const analysis = {
        totalAddresses: 0,
        addressesWithStreetType: 0,
        streetTypeFromEndWord: new Map(),
        streetTypeFromNonEndWord: new Map(),
        nonEndWordCases: [],
        allStreetTypes: new Set(),
        noStreetTypeCases: 0
    };

    // Helper function to extract string from AttributedTerm or return direct string
    function extractString(obj) {
        if (obj === null || obj === undefined) return null;
        if (typeof obj === 'string') return obj;
        if (typeof obj === 'object' && obj.term) return obj.term;
        return null;
    }

    // Helper function to analyze a single address
    function analyzeAddress(addressObj, source) {
        if (!addressObj || !addressObj.originalAddress) return;

        analysis.totalAddresses++;

        const originalAddress = extractString(addressObj.originalAddress);
        if (!originalAddress) return;

        // Clean VisionAppraisal tags
        let cleanAddress = originalAddress
            .replace(/::#\^#::/g, ', ')
            .replace(/:\^#\^:/g, ' ')
            .replace(/\^#\^/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (!cleanAddress) return;

        const streetType = extractString(addressObj.streetType);

        if (streetType) {
            analysis.addressesWithStreetType++;
            analysis.allStreetTypes.add(streetType);

            // Analyze position of street type in original address
            const addressWords = cleanAddress.split(/\s+/);
            const lastWord = addressWords[addressWords.length - 1];

            // Check if street type came from the last word
            const typeFromLastWord = lastWord.toLowerCase().includes(streetType.toLowerCase()) ||
                                   streetType.toLowerCase().includes(lastWord.toLowerCase());

            if (typeFromLastWord) {
                const count = analysis.streetTypeFromEndWord.get(streetType) || 0;
                analysis.streetTypeFromEndWord.set(streetType, count + 1);
            } else {
                const count = analysis.streetTypeFromNonEndWord.get(streetType) || 0;
                analysis.streetTypeFromNonEndWord.set(streetType, count + 1);

                analysis.nonEndWordCases.push({
                    source: source,
                    originalAddress: originalAddress,
                    cleanedAddress: cleanAddress,
                    parsedType: streetType,
                    addressWords: addressWords,
                    lastWord: lastWord,
                    parsedStreet: extractString(addressObj.streetName) || 'N/A',
                    streetNumber: extractString(addressObj.streetNumber) || 'N/A',
                    fullAddressObj: addressObj
                });
            }
        } else {
            analysis.noStreetTypeCases++;
        }
    }

    // Process all entities
    visionAppraisalBrowser.entities.forEach((entity, index) => {
        if (entity.contactInfo) {
            if (entity.contactInfo.primaryAddress) {
                analyzeAddress(entity.contactInfo.primaryAddress, `Entity #${index} Primary`);
            }

            if (entity.contactInfo.secondaryAddress && Array.isArray(entity.contactInfo.secondaryAddress)) {
                entity.contactInfo.secondaryAddress.forEach((addr, addrIndex) => {
                    analyzeAddress(addr, `Entity #${index} Secondary[${addrIndex}]`);
                });
            }
        }
    });

    // Generate report
    console.log('\n📊 STREET TYPE PATTERN ANALYSIS COMPLETE');
    console.log('='.repeat(60));
    console.log(`\n📈 SUMMARY STATISTICS:`);
    console.log(`Total Addresses Found: ${analysis.totalAddresses}`);
    console.log(`Addresses with Street Type: ${analysis.addressesWithStreetType}`);
    console.log(`Addresses without Street Type: ${analysis.noStreetTypeCases}`);
    console.log(`Unique Street Types: ${analysis.allStreetTypes.size}`);

    // Show all unique street types found
    if (analysis.allStreetTypes.size > 0) {
        console.log(`\n📋 ALL STREET TYPES FOUND:`);
        Array.from(analysis.allStreetTypes).sort().forEach(type => {
            const endCount = analysis.streetTypeFromEndWord.get(type) || 0;
            const nonEndCount = analysis.streetTypeFromNonEndWord.get(type) || 0;
            console.log(`   "${type}": ${endCount + nonEndCount} total (${endCount} end-word, ${nonEndCount} non-end)`);
        });
    }

    // Categorize street types by position pattern
    const endWordOnly = new Set();
    const nonEndWordOnly = new Set();
    const bothPositions = new Set();

    analysis.allStreetTypes.forEach(streetType => {
        const hasEndWord = analysis.streetTypeFromEndWord.has(streetType);
        const hasNonEndWord = analysis.streetTypeFromNonEndWord.has(streetType);

        if (hasEndWord && hasNonEndWord) {
            bothPositions.add(streetType);
        } else if (hasEndWord) {
            endWordOnly.add(streetType);
        } else if (hasNonEndWord) {
            nonEndWordOnly.add(streetType);
        }
    });

    console.log(`\n🎯 STREET TYPE CATEGORIZATION BY POSITION:`);
    console.log(`a) Only from END words: ${endWordOnly.size} types`);
    console.log(`b) Only from NON-END words: ${nonEndWordOnly.size} types`);
    console.log(`c) From BOTH positions: ${bothPositions.size} types`);

    // Show non-end word cases in detail (limited sample)
    if (analysis.nonEndWordCases.length > 0) {
        console.log(`\n🔍 NON-END WORD CASES (${analysis.nonEndWordCases.length} total):`);
        console.log('Sample cases where street type came from non-end words:');

        analysis.nonEndWordCases.slice(0, 15).forEach((caseData, index) => {
            console.log(`\n${index + 1}. ${caseData.source}`);
            console.log(`   Original: "${caseData.originalAddress}"`);
            console.log(`   Cleaned:  "${caseData.cleanedAddress}"`);
            console.log(`   Parsed Type: "${caseData.parsedType}"`);
            console.log(`   Parsed Street: "${caseData.parsedStreet}"`);
        });

        if (analysis.nonEndWordCases.length > 15) {
            console.log(`\n... and ${analysis.nonEndWordCases.length - 15} more cases`);
        }
    }

    console.log(`\n✅ Street Type Pattern Analysis Complete!`);
    showVAStatus(`Analysis Complete: ${analysis.allStreetTypes.size} unique types, ${analysis.nonEndWordCases.length} non-end cases`, 'success');

    return analysis;
}

/**
 * Corrected street type pattern analysis using parsed data structure
 *
 * TESTING FUNCTION: Preserved for regression testing and Block Island Migration Plan
 * Purpose: Properly analyze street type extraction by tracing from original to parsed fields
 *
 * Key Improvements:
 * - Uses existing parsed data (no re-parsing)
 * - Isolates street portion using VisionAppraisal delimiters
 * - Traces word transformations (ROAD → Rd, etc.)
 * - Identifies position within street portion (not entire address)
 */
function analyzeStreetTypePatternsCorrect() {
    if (!visionAppraisalBrowser.entities) {
        showVAStatus('VisionAppraisal data not loaded. Click "Load VisionAppraisal Data" first.', 'error');
        return;
    }

    console.log('🔍 Starting CORRECTED Street Type Pattern Analysis...');

    const analysis = {
        totalAddresses: 0,
        addressesWithStreetType: 0,
        endWordExtractions: [],       // Cases where streetType came from end of street portion
        nonEndWordExtractions: [],    // Cases where streetType came from middle of street portion
        ambiguousExtractions: [],     // Cases where we can't determine the position
        streetTypeMap: new Map(),     // Track all street type transformations
        commonTransformations: new Map() // Track word -> streetType transformations
    };

    function extractString(obj) {
        if (obj === null || obj === undefined) return null;
        if (typeof obj === 'string') return obj;
        if (typeof obj === 'object' && obj.term) return obj.term;
        return null;
    }

    function analyzeAddress(addressObj, source) {
        if (!addressObj) return;

        analysis.totalAddresses++;

        const originalAddress = extractString(addressObj.originalAddress);
        const streetNumber = extractString(addressObj.streetNumber);
        const streetName = extractString(addressObj.streetName);
        const streetType = extractString(addressObj.streetType);

        if (!originalAddress || !streetType) return;

        analysis.addressesWithStreetType++;

        // Step 1: Find the portion of originalAddress that contains the streetName
        let streetPortion = null;

        // Split originalAddress by ::^:: tags to get segments
        const segments = originalAddress.split(/::(?:\^|:#\^#)::/);

        // Find which segment contains the streetName (take earliest if multiple)
        for (let i = 0; i < segments.length; i++) {
            if (streetName && segments[i].includes(streetName)) {
                streetPortion = segments[i].trim();
                break;
            }
        }

        // If no streetName found in segments, fallback to entire string
        if (!streetPortion) {
            streetPortion = originalAddress;
        }

        // Step 2: Remove streetNumber and streetName from the street portion
        let remainingPortion = streetPortion;

        // Remove streetNumber if it exists
        if (streetNumber) {
            remainingPortion = remainingPortion.replace(new RegExp(`\\b${streetNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`), '').trim();
        }

        // Remove streetName if it exists (as complete unit)
        if (streetName) {
            remainingPortion = remainingPortion.replace(new RegExp(`\\b${streetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`), '').trim();
        }

        // Step 3: Find the first word in remaining portion (potentially the type word)
        // Split on spaces or tags
        const remainingWords = remainingPortion.split(/[\s:]+/).filter(word => word.length > 0);
        let originalTypeWord = remainingWords.length > 0 ? remainingWords[0] : null;
        let typeWordPosition = -1;

        if (originalTypeWord) {
            // Find position of this word in the original street portion
            const allWords = streetPortion.split(/[\s:]+/).filter(word => word.length > 0);
            typeWordPosition = allWords.indexOf(originalTypeWord);

            // Track transformation
            const transformation = `${originalTypeWord} → ${streetType}`;
            analysis.commonTransformations.set(transformation,
                (analysis.commonTransformations.get(transformation) || 0) + 1);
        }

        analysis.streetTypeMap.set(streetType, (analysis.streetTypeMap.get(streetType) || 0) + 1);

        // Step 4: Check if the type word is an end-word
        let isLogicalEndWord = false;
        let endWordReason = '';

        if (originalTypeWord) {
            // Create word list from street portion (split on spaces or tags)
            const allWords = streetPortion.split(/[\s:]+/).filter(word => word.length > 0);
            const wordIndex = allWords.indexOf(originalTypeWord);

            // Check if it's the last word in the street portion
            if (wordIndex === allWords.length - 1) {
                isLogicalEndWord = true;
                endWordReason = 'last word in street portion';
            } else {
                // Check if the word is immediately before a VisionAppraisal tag in original address
                const wordPattern = new RegExp(`\\b${originalTypeWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                const match = wordPattern.exec(originalAddress);

                if (match) {
                    const wordEndPosition = match.index + match[0].length;
                    const remainingText = originalAddress.substring(wordEndPosition);

                    // Check if immediately followed by VisionAppraisal tags
                    if (remainingText.match(/^\s*:(\^#\^|:#\^#)::/)) {
                        isLogicalEndWord = true;
                        if (remainingText.match(/^\s*:\^#\^:/)) {
                            endWordReason = 'before :^#^: tag (line break)';
                        } else {
                            endWordReason = 'before ::#^#:: tag (field delimiter)';
                        }
                    }
                }
            }
        }

        const caseData = {
            source: source,
            originalAddress: originalAddress,
            streetPortion: streetPortion,
            remainingPortion: remainingPortion,
            streetNumber: streetNumber,
            streetName: streetName,
            streetType: streetType,
            typeWordPosition: typeWordPosition,
            originalTypeWord: originalTypeWord,
            isLogicalEndWord: isLogicalEndWord,
            endWordReason: endWordReason
        };

        if (typeWordPosition === -1) {
            analysis.ambiguousExtractions.push(caseData);
        } else if (isLogicalEndWord) {
            analysis.endWordExtractions.push(caseData);
        } else {
            analysis.nonEndWordExtractions.push(caseData);
        }
    }

    // Process all entities
    visionAppraisalBrowser.entities.forEach((entity, index) => {
        if (entity.contactInfo) {
            if (entity.contactInfo.primaryAddress) {
                analyzeAddress(entity.contactInfo.primaryAddress, `Entity #${index} Primary`);
            }
            if (entity.contactInfo.secondaryAddress && Array.isArray(entity.contactInfo.secondaryAddress)) {
                entity.contactInfo.secondaryAddress.forEach((addr, addrIndex) => {
                    analyzeAddress(addr, `Entity #${index} Secondary[${addrIndex}]`);
                });
            }
        }
    });

    // Generate corrected report
    console.log('\n📊 CORRECTED STREET TYPE PATTERN ANALYSIS');
    console.log('='.repeat(60));
    console.log(`\n📈 SUMMARY STATISTICS:`);
    console.log(`Total Addresses Found: ${analysis.totalAddresses}`);
    console.log(`Addresses with Street Type: ${analysis.addressesWithStreetType}`);
    console.log(`End-word extractions: ${analysis.endWordExtractions.length} (${((analysis.endWordExtractions.length/analysis.addressesWithStreetType)*100).toFixed(1)}%)`);
    console.log(`Non-end-word extractions: ${analysis.nonEndWordExtractions.length} (${((analysis.nonEndWordExtractions.length/analysis.addressesWithStreetType)*100).toFixed(1)}%)`);
    console.log(`Ambiguous extractions: ${analysis.ambiguousExtractions.length} (${((analysis.ambiguousExtractions.length/analysis.addressesWithStreetType)*100).toFixed(1)}%)`);

    // Show most common transformations
    console.log(`\n🔄 TOP WORD → STREETTYPE TRANSFORMATIONS:`);
    Array.from(analysis.commonTransformations.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .forEach(([transformation, count]) => {
            console.log(`   ${transformation}: ${count} occurrences`);
        });

    // Show all street types by frequency
    console.log(`\n📋 ALL STREET TYPES BY FREQUENCY:`);
    Array.from(analysis.streetTypeMap.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
            console.log(`   "${type}": ${count} occurrences`);
        });

    // Show sample proper extractions (end-word)
    if (analysis.endWordExtractions.length > 0) {
        console.log('\n✅ PROPER END-WORD EXTRACTIONS (sample):');
        analysis.endWordExtractions.slice(0, 8).forEach((c, i) => {
            console.log(`${i+1}. "${c.originalAddress}"`);
            console.log(`   Street: "${c.streetPortion}" → Number:"${c.streetNumber}" Name:"${c.streetName}" Type:"${c.streetType}"`);
            console.log(`   Word "${c.originalTypeWord}" (first remaining after removing number/name) → "${c.streetType}"`);
            console.log(`   ✅ END WORD: ${c.endWordReason}`);
        });
    }

    // Show problematic extractions (non-end-word)
    if (analysis.nonEndWordExtractions.length > 0) {
        console.log('\n⚠️ PROBLEMATIC NON-END-WORD EXTRACTIONS (sample):');
        analysis.nonEndWordExtractions.slice(0, 8).forEach((c, i) => {
            console.log(`${i+1}. "${c.originalAddress}"`);
            console.log(`   Street: "${c.streetPortion}" → Number:"${c.streetNumber}" Name:"${c.streetName}" Type:"${c.streetType}"`);
            console.log(`   Word "${c.originalTypeWord}" (first remaining after removing number/name) → "${c.streetType}"`);
        });
    }

    // Show ambiguous cases
    if (analysis.ambiguousExtractions.length > 0) {
        console.log('\n❓ AMBIGUOUS EXTRACTIONS (sample):');
        analysis.ambiguousExtractions.slice(0, 5).forEach((c, i) => {
            console.log(`${i+1}. "${c.originalAddress}"`);
            console.log(`   Street: "${c.streetPortion}" → Type:"${c.streetType}" (origin unclear)`);
        });
    }

    console.log(`\n✅ Corrected Street Type Pattern Analysis Complete!`);
    showVAStatus(`Corrected Analysis Complete: ${analysis.endWordExtractions.length} proper, ${analysis.nonEndWordExtractions.length} problematic`, 'success');

    return analysis;
}