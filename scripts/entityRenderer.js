// entityRenderer.js - Universal Entity HTML Presentation Engine for BIRAVA2025
//
// ARCHITECTURAL PURPOSE: Provides sophisticated HTML presentation capabilities for entities
// from any data source (VisionAppraisal, Bloomerang, future sources). Adapted and generalized
// from the superior HTML presentation system originally built for VisionAppraisal entities.
//
// DESIGN PRINCIPLES:
// - Universal compatibility: Works with any entity structure from any data source
// - Intelligent field mapping: Automatically detects and displays relevant information
// - Source-aware presentation: Adapts styling and content based on data source
// - Extensible architecture: Easy to add new sections and presentation types
// - Preserve visual excellence: Maintains sophisticated styling and professional appearance

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

/**
 * Render entity details window with enhanced HTML presentation
 * Main entry point for displaying any entity from any data source
 *
 * @param {Object} entityWrapper - Entity wrapper with source metadata
 * @param {string} entityWrapper.source - Source name ('VisionAppraisal', 'Bloomerang')
 * @param {string} entityWrapper.sourceKey - Source key ('visionappraisal', 'bloomerang')
 * @param {string} entityWrapper.entityType - Entity type ('Individual', 'AggregateHousehold', etc.)
 * @param {string} entityWrapper.key - Unique entity key
 * @param {Object} entityWrapper.entity - Actual entity object
 */
function renderEntityDetailsWindow(entityWrapper) {
    console.log("🎨 Rendering entity details for:", entityWrapper);

    // Generate the comprehensive HTML content
    const htmlContent = generateUniversalEntityHTML(entityWrapper);

    // Create and populate the details window
    const detailsWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
    detailsWindow.document.write(htmlContent);
    detailsWindow.document.close();

    console.log("✅ Entity details window created successfully");
}

/**
 * Generate comprehensive HTML display for any entity from any data source
 * @param {Object} entityWrapper - Entity wrapper with source metadata
 * @returns {string} Complete HTML content for the details window
 */
function generateUniversalEntityHTML(entityWrapper) {
    const entity = entityWrapper.entity;
    const entityName = extractUniversalEntityName(entity);

    return `
        <!DOCTYPE html>
        <html>
            <head>
                <title>${entityWrapper.source} Entity: ${entityName}</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    ${getUniversalEntityStyles(entityWrapper.sourceKey)}
                </style>
            </head>
            <body>
                <div class="container">
                    ${generateUniversalHeaderSection(entityWrapper)}
                    ${generateUniversalIdentifiersSection(entityWrapper)}
                    ${generateUniversalContactInfoSection(entityWrapper)}
                    ${generateUniversalLocationSection(entityWrapper)}
                    <!-- ${generateHouseholdMembersSection(entityWrapper)} -->
                    ${generateSourceSpecificSection(entityWrapper)}
                    ${generateUniversalMetadataSection(entityWrapper)}
                    ${generateUniversalRawDataSection(entityWrapper)}
                </div>

                <script>
                    ${getUniversalEntityScripts()}
                </script>
            </body>
        </html>
    `;
}

// =============================================================================
// STYLING SYSTEM
// =============================================================================

/**
 * Generate comprehensive CSS styles for entity detail display
 * Adapted from VisionAppraisal's superior styling system
 * @param {string} sourceKey - Data source key for source-specific styling
 * @returns {string} Complete CSS styles
 */
function getUniversalEntityStyles(sourceKey) {
    return `
        /* =============================================================================
         * BASE STYLES
         * ============================================================================= */

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
            padding: 0;
            margin: 0;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        /* =============================================================================
         * HEADER SECTION STYLES
         * ============================================================================= */

        .header {
            background: ${getSourceGradient(sourceKey)};
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
            margin-right: 10px;
        }

        .source-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 10px;
            background-color: rgba(255, 255, 255, 0.3);
        }

        /* Entity type badge colors */
        .badge-individual { background-color: rgba(52, 152, 219, 0.3); }
        .badge-aggregatehousehold { background-color: rgba(46, 204, 113, 0.3); }
        .badge-business { background-color: rgba(230, 126, 34, 0.3); }
        .badge-legalconstruct { background-color: rgba(155, 89, 182, 0.3); }
        .badge-nonhuman { background-color: rgba(231, 76, 60, 0.3); }
        .badge-unknown { background-color: rgba(149, 165, 166, 0.3); }

        .entity-name {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 15px;
            line-height: 1.2;
            word-wrap: break-word;
        }

        .entity-key {
            font-size: 1rem;
            opacity: 0.9;
            font-family: 'Courier New', monospace;
            margin-bottom: 20px;
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
            word-wrap: break-word;
        }

        /* =============================================================================
         * CARD SECTION STYLES
         * ============================================================================= */

        .card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border: 1px solid #e1e5e9;
            transition: box-shadow 0.3s ease;
        }

        .card:hover {
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }

        .card-title {
            font-size: 1.4rem;
            font-weight: 700;
            margin-bottom: 20px;
            color: #2c3e50;
            border-bottom: 2px solid #ecf0f1;
            padding-bottom: 10px;
        }

        .card-subtitle {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 15px;
            color: #34495e;
        }

        /* =============================================================================
         * INFO GRID AND ITEM STYLES
         * ============================================================================= */

        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 15px;
        }

        .info-item {
            display: flex;
            flex-direction: column;
        }

        .info-label {
            font-size: 0.9rem;
            font-weight: 600;
            color: #7f8c8d;
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .info-value {
            font-size: 1rem;
            color: #2c3e50;
            word-wrap: break-word;
            line-height: 1.4;
        }

        .info-value.empty {
            color: #95a5a6;
            font-style: italic;
        }

        .info-value.monospace {
            font-family: 'Courier New', monospace;
            background-color: #f8f9fa;
            padding: 8px 12px;
            border-radius: 4px;
            border: 1px solid #e9ecef;
        }

        /* =============================================================================
         * ADDRESS STYLES
         * ============================================================================= */

        .address-display {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
        }

        .address-type {
            font-weight: 600;
            color: #495057;
            margin-bottom: 8px;
            font-size: 0.9rem;
        }

        .address-lines {
            color: #212529;
            line-height: 1.5;
        }

        .address-line {
            margin-bottom: 2px;
        }

        /* =============================================================================
         * RAW DATA SECTION STYLES
         * ============================================================================= */

        .raw-data-section {
            margin-top: 10px;
        }

        .raw-data-toggle {
            background: #6c757d;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
            font-weight: 500;
            transition: background-color 0.3s ease;
        }

        .raw-data-toggle:hover {
            background: #545b62;
        }

        .raw-data-content {
            display: none;
            margin-top: 15px;
        }

        .raw-data-content.visible {
            display: block;
        }

        .raw-json {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 20px;
            font-family: 'Courier New', monospace;
            font-size: 0.85rem;
            line-height: 1.4;
            overflow-x: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
            max-height: 500px;
            overflow-y: auto;
        }

        /* =============================================================================
         * RESPONSIVE DESIGN
         * ============================================================================= */

        @media (max-width: 768px) {
            .container {
                padding: 15px;
            }

            .header {
                padding: 20px;
            }

            .entity-name {
                font-size: 1.5rem;
            }

            .card {
                padding: 20px;
            }

            .quick-info {
                flex-direction: column;
                gap: 15px;
            }

            .info-grid {
                grid-template-columns: 1fr;
                gap: 15px;
            }
        }

        /* =============================================================================
         * UTILITY CLASSES
         * ============================================================================= */

        .text-muted {
            color: #6c757d !important;
        }

        .text-success {
            color: #28a745 !important;
        }

        .text-warning {
            color: #ffc107 !important;
        }

        .text-danger {
            color: #dc3545 !important;
        }

        .font-weight-bold {
            font-weight: bold !important;
        }

        .font-monospace {
            font-family: 'Courier New', monospace !important;
        }

        .mb-0 { margin-bottom: 0 !important; }
        .mb-1 { margin-bottom: 8px !important; }
        .mb-2 { margin-bottom: 16px !important; }
        .mb-3 { margin-bottom: 24px !important; }

        .mt-0 { margin-top: 0 !important; }
        .mt-1 { margin-top: 8px !important; }
        .mt-2 { margin-top: 16px !important; }
        .mt-3 { margin-top: 24px !important; }

        /* =============================================================================
         * HOUSEHOLD MEMBERS STYLES
         * ============================================================================= */

        .household-member {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            transition: all 0.2s ease;
        }

        .household-member:hover {
            background: #e9ecef;
            border-color: #ced4da;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .member-header {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
            gap: 12px;
        }

        .member-number {
            background: #6c757d;
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
            min-width: 24px;
            text-align: center;
        }

        .member-name {
            font-weight: 600;
            font-size: 1rem;
            color: #2c3e50;
            flex: 1;
        }

        .member-source {
            background: #17a2b8;
            color: white;
            padding: 3px 8px;
            border-radius: 10px;
            font-size: 0.75rem;
            font-weight: 500;
        }

        .member-source.visionappraisal {
            background: #dc3545;
        }

        .member-source.bloomerang {
            background: #007bff;
        }

        .member-details {
            font-size: 0.9rem;
            color: #6c757d;
            line-height: 1.4;
        }

        .entity-section {
            background: white;
            border-radius: 12px;
            margin-bottom: 25px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            overflow: hidden;
        }

        .section-title {
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
            padding: 20px 25px;
            font-weight: 700;
            font-size: 1.1rem;
            color: #495057;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .section-icon {
            font-size: 1.2rem;
        }

        .section-content {
            padding: 25px;
        }
    `;
}

/**
 * Get source-specific gradient for header
 * @param {string} sourceKey - Data source key
 * @returns {string} CSS gradient
 */
function getSourceGradient(sourceKey) {
    const gradients = {
        'visionappraisal': 'linear-gradient(135deg, #dc3545 0%, #a71e2a 100%)',
        'bloomerang': 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
        'default': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    };

    return gradients[sourceKey] || gradients.default;
}

// =============================================================================
// HEADER SECTION GENERATOR
// =============================================================================

/**
 * Generate header section for any entity
 * @param {Object} entityWrapper - Entity wrapper with metadata
 * @returns {string} HTML for header section
 */
function generateUniversalHeaderSection(entityWrapper) {
    const entity = entityWrapper.entity;
    const entityName = extractUniversalEntityName(entity);

    // Extract key identifiers for quick info display
    const quickInfo = extractQuickInfo(entityWrapper);

    // Determine badge class based on entity type
    const entityTypeLower = entityWrapper.entityType.toLowerCase();
    const badgeClass = `badge-${entityTypeLower}`;

    return `
        <div class="header">
            <div class="badges">
                <span class="source-badge">${entityWrapper.source}</span>
                <span class="entity-type-badge ${badgeClass}">${entityWrapper.entityType}</span>
            </div>
            <div class="entity-name">${entityName}</div>
            <div class="entity-key">${entityWrapper.key}</div>
            ${quickInfo.length > 0 ? `
                <div class="quick-info">
                    ${quickInfo.map(info => `
                        <div class="quick-info-item">
                            <div class="quick-info-label">${info.label}</div>
                            <div class="quick-info-value">${info.value}</div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Extract quick info items for header display
 * @param {Object} entityWrapper - Entity wrapper
 * @returns {Array} Array of {label, value} objects
 */
function extractQuickInfo(entityWrapper) {
    const entity = entityWrapper.entity;
    const quickInfo = [];

    // Location identifiers (Fire Number, PID)
    if (entity.locationIdentifier && entity.locationIdentifier.identifier && entity.locationIdentifier.identifier.primaryAlias) {
        const locType = entity.locationIdentifier.type || 'Location ID';
        quickInfo.push({
            label: locType,
            value: entity.locationIdentifier.identifier.primaryAlias.term
        });
    }

    // PID (VisionAppraisal specific)
    if (entity.pid && entity.pid.identifier && entity.pid.identifier.primaryAlias) {
        quickInfo.push({
            label: 'PID',
            value: entity.pid.identifier.primaryAlias.term
        });
    }

    // Fire Number (if separate from location identifier)
    if (entity.fireNumber && typeof entity.fireNumber === 'number') {
        quickInfo.push({
            label: 'Fire Number',
            value: entity.fireNumber
        });
    }

    // Account Number
    if (entity.accountNumber) {
        let accountValue = 'N/A';
        if (entity.accountNumber.identifier && entity.accountNumber.identifier.primaryAlias) {
            accountValue = entity.accountNumber.identifier.primaryAlias.term;
        } else if (entity.accountNumber.term) {
            accountValue = entity.accountNumber.term;
        }

        if (accountValue !== 'N/A') {
            quickInfo.push({
                label: 'Account',
                value: accountValue
            });
        }
    }

    return quickInfo;
}

// =============================================================================
// IDENTIFIERS SECTION GENERATOR
// =============================================================================

/**
 * Generate identifiers section for any entity
 * @param {Object} entityWrapper - Entity wrapper
 * @returns {string} HTML for identifiers section
 */
function generateUniversalIdentifiersSection(entityWrapper) {
    const entity = entityWrapper.entity;
    const identifiers = extractEntityIdentifiers(entity);

    if (identifiers.length === 0) {
        return `
            <div class="card">
                <div class="card-title">Core Identifiers</div>
                <div class="info-value empty">No core identifiers available</div>
            </div>
        `;
    }

    return `
        <div class="card">
            <div class="card-title">Core Identifiers</div>
            <div class="info-grid">
                ${identifiers.map(id => `
                    <div class="info-item">
                        <div class="info-label">${id.label}</div>
                        <div class="info-value ${id.monospace ? 'monospace' : ''}">${id.value}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * Extract identifier information from entity
 * @param {Object} entity - Entity object
 * @returns {Array} Array of identifier objects
 */
function extractEntityIdentifiers(entity) {
    const identifiers = [];

    // MBLU (VisionAppraisal specific)
    if (entity.mblu) {
        const mbluValue = entity.mblu.term || entity.mblu.identifier?.primaryAlias?.term || 'Not Available';
        identifiers.push({
            label: 'MBLU',
            value: mbluValue,
            monospace: true
        });
    }

    // Google File ID (if present)
    if (entity.googleFileId) {
        identifiers.push({
            label: 'Google File ID',
            value: entity.googleFileId,
            monospace: true
        });
    }

    // Source information
    if (entity.source) {
        identifiers.push({
            label: 'Original Source',
            value: entity.source,
            monospace: false
        });
    }

    // Entity type (internal)
    if (entity.type) {
        identifiers.push({
            label: 'Type Field',
            value: entity.type,
            monospace: false
        });
    }

    // Record index or row information
    if (entity.recordIndex !== undefined) {
        identifiers.push({
            label: 'Record Index',
            value: entity.recordIndex.toString(),
            monospace: true
        });
    }

    return identifiers;
}

// =============================================================================
// CONTACT INFO SECTION GENERATOR
// =============================================================================

/**
 * Generate contact information section
 * @param {Object} entityWrapper - Entity wrapper
 * @returns {string} HTML for contact info section
 */
function generateUniversalContactInfoSection(entityWrapper) {
    const entity = entityWrapper.entity;

    if (!entity.contactInfo) {
        return `
            <div class="card">
                <div class="card-title">Contact Information</div>
                <div class="info-value empty">No contact information available</div>
            </div>
        `;
    }

    const contactInfo = entity.contactInfo;
    const contactItems = [];

    // Email
    if (contactInfo.email) {
        const emailValue = extractContactValue(contactInfo.email);
        if (emailValue) {
            contactItems.push({
                label: 'Email',
                value: emailValue
            });
        }
    }

    // Phone
    if (contactInfo.phone) {
        const phoneValue = extractContactValue(contactInfo.phone);
        if (phoneValue) {
            contactItems.push({
                label: 'Phone',
                value: phoneValue
            });
        }
    }

    // PO Box
    if (contactInfo.poBox) {
        const poBoxValue = extractContactValue(contactInfo.poBox);
        if (poBoxValue) {
            contactItems.push({
                label: 'PO Box',
                value: poBoxValue
            });
        }
    }

    return `
        <div class="card">
            <div class="card-title">Contact Information</div>
            ${contactItems.length > 0 ? `
                <div class="info-grid">
                    ${contactItems.map(item => `
                        <div class="info-item">
                            <div class="info-label">${item.label}</div>
                            <div class="info-value">${item.value}</div>
                        </div>
                    `).join('')}
                </div>
            ` : '<div class="info-value empty">No contact details available</div>'}

            ${generateAddressesSection(contactInfo)}
        </div>
    `;
}

/**
 * Extract value from contact info field
 * @param {*} contactField - Contact field (could be various structures)
 * @returns {string|null} Extracted value or null
 */
function extractContactValue(contactField) {
    if (!contactField) return null;

    if (typeof contactField === 'string') return contactField;
    if (contactField.term) return contactField.term;
    if (contactField.identifier && contactField.identifier.term) return contactField.identifier.term;
    if (contactField.identifier && contactField.identifier.primaryAlias && contactField.identifier.primaryAlias.term) {
        return contactField.identifier.primaryAlias.term;
    }

    return null;
}

/**
 * Generate addresses section within contact info
 * @param {Object} contactInfo - Contact info object
 * @returns {string} HTML for addresses
 */
function generateAddressesSection(contactInfo) {
    const addresses = [];

    // Primary address
    if (contactInfo.primaryAddress) {
        addresses.push({
            type: 'Primary Address',
            address: contactInfo.primaryAddress
        });
    }

    // Secondary addresses
    if (contactInfo.secondaryAddresses && Array.isArray(contactInfo.secondaryAddresses)) {
        contactInfo.secondaryAddresses.forEach((addr, index) => {
            addresses.push({
                type: `Secondary Address ${index + 1}`,
                address: addr
            });
        });
    }

    if (addresses.length === 0) return '';

    return `
        <div class="mt-3">
            <div class="card-subtitle">Addresses</div>
            ${addresses.map(addressInfo => generateAddressDisplay(addressInfo.type, addressInfo.address)).join('')}
        </div>
    `;
}

/**
 * Generate display for a single address
 * @param {string} addressType - Type of address
 * @param {Object} address - Address object
 * @returns {string} HTML for address display
 */
function generateAddressDisplay(addressType, address) {
    if (!address) return '';

    const addressLines = [];

    // Build address string from AttributedTerm components (proper Address object structure)
    const streetParts = [];
    if (address.streetNumber && address.streetNumber.term) {
        streetParts.push(address.streetNumber.term);
    }
    if (address.streetName && address.streetName.term) {
        streetParts.push(address.streetName.term);
    }
    if (address.streetType && address.streetType.term) {
        streetParts.push(address.streetType.term);
    }
    if (streetParts.length > 0) {
        addressLines.push(streetParts.join(' '));
    }

    // Add unit information if available
    if (address.secUnitType && address.secUnitType.term && address.secUnitNum && address.secUnitNum.term) {
        addressLines.push(`${address.secUnitType.term} ${address.secUnitNum.term}`);
    }

    // City, state, zip line
    const cityStateZipParts = [];
    if (address.city && address.city.term) {
        cityStateZipParts.push(address.city.term);
    }
    if (address.state && address.state.term) {
        cityStateZipParts.push(address.state.term);
    }
    if (address.zipCode && address.zipCode.term) {
        cityStateZipParts.push(address.zipCode.term);
    }
    if (cityStateZipParts.length > 0) {
        addressLines.push(cityStateZipParts.join(' '));
    }

    // If no parsed components available, try original address
    if (addressLines.length === 0 && address.originalAddress && address.originalAddress.term) {
        addressLines.push(address.originalAddress.term);
    }

    // Include recipient details if available
    if (address.recipientDetails && address.recipientDetails.term) {
        addressLines.unshift(address.recipientDetails.term); // Add to beginning
    }

    if (addressLines.length === 0) {
        // Address object exists but no readable content
        return `
            <div class="address-display">
                <div class="address-type">${addressType}</div>
                <div class="address-lines">
                    <div class="info-value empty">Address data structure present but no extractable content</div>
                </div>
            </div>
        `;
    }

    return `
        <div class="address-display">
            <div class="address-type">${addressType}</div>
            <div class="address-lines">
                ${addressLines.map(line => `<div class="address-line">${line}</div>`).join('')}
            </div>
        </div>
    `;
}

// =============================================================================
// LOCATION SECTION GENERATOR
// =============================================================================

/**
 * Generate location-specific information section
 * @param {Object} entityWrapper - Entity wrapper
 * @returns {string} HTML for location section
 */
function generateUniversalLocationSection(entityWrapper) {
    const entity = entityWrapper.entity;
    const locationItems = [];

    // Property location address (VisionAppraisal specific)
    if (entity.propertyLocationAddress) {
        const propAddress = entity.propertyLocationAddress;
        let addressStr = '';

        if (propAddress.street) addressStr += propAddress.street;
        if (propAddress.city) addressStr += (addressStr ? ', ' : '') + propAddress.city;
        if (propAddress.state) addressStr += (addressStr ? ', ' : '') + propAddress.state;
        if (propAddress.zipCode) addressStr += (addressStr ? ' ' : '') + propAddress.zipCode;

        if (addressStr) {
            locationItems.push({
                label: 'Property Location',
                value: addressStr
            });
        }
    }

    // Owner address (VisionAppraisal specific)
    if (entity.ownerAddress) {
        const ownerAddr = entity.ownerAddress;
        let addressStr = '';

        if (ownerAddr.street) addressStr += ownerAddr.street;
        if (ownerAddr.city) addressStr += (addressStr ? ', ' : '') + ownerAddr.city;
        if (ownerAddr.state) addressStr += (addressStr ? ', ' : '') + ownerAddr.state;
        if (ownerAddr.zipCode) addressStr += (addressStr ? ' ' : '') + ownerAddr.zipCode;

        if (addressStr) {
            locationItems.push({
                label: 'Owner Address',
                value: addressStr
            });
        }
    }

    // Block Island specific fields (if present)
    if (entity.blockIslandData || entity.biAddress || entity.biCity || entity.biState) {
        const biFields = [];

        if (entity.biAddress) biFields.push(`Address: ${entity.biAddress}`);
        if (entity.biCity) biFields.push(`City: ${entity.biCity}`);
        if (entity.biState) biFields.push(`State: ${entity.biState}`);

        if (biFields.length > 0) {
            locationItems.push({
                label: 'Block Island Data',
                value: biFields.join(', ')
            });
        }
    }

    if (locationItems.length === 0) {
        return `
            <div class="card">
                <div class="card-title">Location Information</div>
                <div class="info-value empty">No location information available</div>
            </div>
        `;
    }

    return `
        <div class="card">
            <div class="card-title">Location Information</div>
            <div class="info-grid">
                ${locationItems.map(item => `
                    <div class="info-item">
                        <div class="info-label">${item.label}</div>
                        <div class="info-value">${item.value}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// =============================================================================
// HOUSEHOLD MEMBERS SECTION GENERATOR
// =============================================================================

/**
 * Generate household members section for AggregateHousehold entities
 * @param {Object} entityWrapper - Entity wrapper
 * @returns {string} HTML for household members section
 */
function generateHouseholdMembersSection(entityWrapper) {
    const entity = entityWrapper.entity;

    // Only show household members for household-type entities
    if (entityWrapper.entityType !== 'AggregateHousehold' &&
        entityWrapper.entityType !== 'CompositeHousehold') {
        return '';
    }

    console.log('🏠 Finding household members for:', entityWrapper.key);

    const householdMembers = findHouseholdMembers(entityWrapper);

    if (householdMembers.length === 0) {
        return `
            <div class="entity-section">
                <div class="section-title">
                    <span class="section-icon">👥</span>
                    Household Members
                </div>
                <div class="section-content">
                    <div class="info-item">
                        <div class="info-value empty">No individual members found for this household</div>
                    </div>
                </div>
            </div>
        `;
    }

    return `
        <div class="entity-section">
            <div class="section-title">
                <span class="section-icon">👥</span>
                Household Members (${householdMembers.length})
            </div>
            <div class="section-content">
                ${householdMembers.map((member, index) => `
                    <div class="household-member">
                        <div class="member-header">
                            <span class="member-number">${index + 1}.</span>
                            <span class="member-name">${extractUniversalEntityName(member.entity)}</span>
                            <span class="member-source">${member.source}</span>
                        </div>
                        <div class="member-details">
                            ${extractMemberDetails(member)}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * Find individual members that belong to the given household
 * @param {Object} householdWrapper - Household entity wrapper
 * @returns {Array} Array of individual entity wrappers
 */
function findHouseholdMembers(householdWrapper) {
    // Access the loaded entities from the global workingLoadedEntities
    if (!window.workingLoadedEntities || workingLoadedEntities.status !== 'loaded') {
        console.warn('⚠️ Cannot find household members - workingLoadedEntities not loaded');
        return [];
    }

    const members = [];
    const household = householdWrapper.entity;

    // Get household location identifier for matching
    const householdLocationId = getEntityLocationIdentifier(household);
    const householdAddress = getEntityPrimaryAddress(household);

    console.log('🏠 Looking for members with location:', householdLocationId);
    console.log('🏠 Looking for members with address:', householdAddress);

    // Search VisionAppraisal individuals
    if (workingLoadedEntities.visionAppraisal.loaded && workingLoadedEntities.visionAppraisal.entities) {
        workingLoadedEntities.visionAppraisal.entities.forEach((entity, index) => {
            if (getEntityType(entity) === 'Individual') {
                if (isEntityRelatedToHousehold(entity, household, householdLocationId, householdAddress)) {
                    members.push({
                        source: 'VisionAppraisal',
                        sourceKey: 'visionappraisal',
                        entityType: 'Individual',
                        index: index,
                        key: `va_${index}`,
                        entity: entity
                    });
                }
            }
        });
    }

    // Search Bloomerang individuals
    if (workingLoadedEntities.bloomerang && workingLoadedEntities.bloomerang.loaded &&
        workingLoadedEntities.bloomerang.individuals && workingLoadedEntities.bloomerang.individuals.entities) {

        Object.entries(workingLoadedEntities.bloomerang.individuals.entities).forEach(([key, entity]) => {
            if (isEntityRelatedToHousehold(entity, household, householdLocationId, householdAddress)) {
                members.push({
                    source: 'Bloomerang',
                    sourceKey: 'bloomerang',
                    entityType: 'Individual',
                    index: key,
                    key: `bl_${key}`,
                    entity: entity
                });
            }
        });
    }

    console.log(`🏠 Found ${members.length} household members`);
    return members;
}

/**
 * Check if an individual entity is related to a household
 * @param {Object} individual - Individual entity
 * @param {Object} household - Household entity
 * @param {string} householdLocationId - Household location identifier
 * @param {string} householdAddress - Household primary address string
 * @returns {boolean} True if individual belongs to household
 */
function isEntityRelatedToHousehold(individual, household, householdLocationId, householdAddress) {
    // Method 1: Match by location identifier (Fire Number, PID)
    const individualLocationId = getEntityLocationIdentifier(individual);
    if (householdLocationId && individualLocationId && householdLocationId === individualLocationId) {
        console.log('✅ Match by location ID:', individualLocationId);
        return true;
    }

    // Method 2: Match by primary address similarity
    const individualAddress = getEntityPrimaryAddress(individual);
    if (householdAddress && individualAddress && addressesSimilar(householdAddress, individualAddress)) {
        console.log('✅ Match by address similarity:', individualAddress);
        return true;
    }

    return false;
}

/**
 * Extract location identifier from entity (Fire Number, PID, etc.)
 * @param {Object} entity - Entity object
 * @returns {string|null} Location identifier or null
 */
function getEntityLocationIdentifier(entity) {
    if (!entity.locationIdentifier) return null;

    // Handle object structures
    if (entity.locationIdentifier.primaryAlias && entity.locationIdentifier.primaryAlias.term) {
        return entity.locationIdentifier.primaryAlias.term;
    }

    // Handle legacy raw values
    if (typeof entity.locationIdentifier === 'number' || typeof entity.locationIdentifier === 'string') {
        return String(entity.locationIdentifier);
    }

    // Handle direct AttributedTerm
    if (entity.locationIdentifier.term) {
        return entity.locationIdentifier.term;
    }

    return null;
}

/**
 * Extract primary address string from entity for comparison
 * @param {Object} entity - Entity object
 * @returns {string|null} Primary address string or null
 */
function getEntityPrimaryAddress(entity) {
    if (!entity.contactInfo || !entity.contactInfo.primaryAddress) return null;

    const address = entity.contactInfo.primaryAddress;
    const parts = [];

    // Build normalized address string
    if (address.streetNumber && address.streetNumber.term) parts.push(address.streetNumber.term);
    if (address.streetName && address.streetName.term) parts.push(address.streetName.term);
    if (address.streetType && address.streetType.term) parts.push(address.streetType.term);

    return parts.length > 0 ? parts.join(' ').toLowerCase().trim() : null;
}

/**
 * Check if two addresses are similar enough to be considered the same
 * @param {string} addr1 - First address
 * @param {string} addr2 - Second address
 * @returns {boolean} True if addresses are similar
 */
function addressesSimilar(addr1, addr2) {
    if (!addr1 || !addr2) return false;

    const clean1 = addr1.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const clean2 = addr2.toLowerCase().replace(/[^\w\s]/g, '').trim();

    // Exact match
    if (clean1 === clean2) return true;

    // Contains match (one is substring of other)
    if (clean1.includes(clean2) || clean2.includes(clean1)) return true;

    return false;
}

/**
 * Extract member details for display
 * @param {Object} memberWrapper - Member entity wrapper
 * @returns {string} HTML string with member details
 */
function extractMemberDetails(memberWrapper) {
    const entity = memberWrapper.entity;
    const details = [];

    // Add location identifier
    const locationId = getEntityLocationIdentifier(entity);
    if (locationId) {
        const locType = entity.locationIdentifier?.type || 'Location';
        details.push(`${locType}: ${locationId}`);
    }

    // Add primary address
    const address = getEntityPrimaryAddress(entity);
    if (address) {
        details.push(`Address: ${address}`);
    }

    // Add account number if available
    if (entity.accountNumber) {
        if (entity.accountNumber.primaryAlias && entity.accountNumber.primaryAlias.term) {
            details.push(`Account: ${entity.accountNumber.primaryAlias.term}`);
        } else if (entity.accountNumber.identifier && entity.accountNumber.identifier.primaryAlias && entity.accountNumber.identifier.primaryAlias.term) {
            details.push(`Account: ${entity.accountNumber.identifier.primaryAlias.term}`);
        }
    }

    return details.join(' | ') || 'Individual details available';
}

// Helper function to get entity type (reuse from other parts)
function getEntityType(entity) {
    return entity.type || entity.constructor?.name || 'Unknown';
}

// =============================================================================
// SOURCE-SPECIFIC SECTION GENERATOR
// =============================================================================

/**
 * Generate source-specific section based on data source
 * @param {Object} entityWrapper - Entity wrapper
 * @returns {string} HTML for source-specific section
 */
function generateSourceSpecificSection(entityWrapper) {
    switch (entityWrapper.sourceKey) {
        case 'visionappraisal':
            return generateVisionAppraisalSpecificSection(entityWrapper);
        case 'bloomerang':
            return generateBloomerangSpecificSection(entityWrapper);
        default:
            return generateGenericSpecificSection(entityWrapper);
    }
}

/**
 * Generate VisionAppraisal-specific section
 * @param {Object} entityWrapper - Entity wrapper
 * @returns {string} HTML for VisionAppraisal-specific content
 */
function generateVisionAppraisalSpecificSection(entityWrapper) {
    const entity = entityWrapper.entity;
    const vaItems = [];

    // MBLU components
    if (entity.mbluMap || entity.mbluBlock || entity.mbluLot || entity.mbluUnit) {
        const mbluParts = [];
        if (entity.mbluMap) mbluParts.push(`Map: ${entity.mbluMap}`);
        if (entity.mbluBlock) mbluParts.push(`Block: ${entity.mbluBlock}`);
        if (entity.mbluLot) mbluParts.push(`Lot: ${entity.mbluLot}`);
        if (entity.mbluUnit) mbluParts.push(`Unit: ${entity.mbluUnit}`);

        if (mbluParts.length > 0) {
            vaItems.push({
                label: 'MBLU Components',
                value: mbluParts.join(', ')
            });
        }
    }

    // Property valuation (if present)
    if (entity.assessedValue || entity.marketValue || entity.taxAmount) {
        const valuationParts = [];
        if (entity.assessedValue) valuationParts.push(`Assessed: $${entity.assessedValue}`);
        if (entity.marketValue) valuationParts.push(`Market: $${entity.marketValue}`);
        if (entity.taxAmount) valuationParts.push(`Tax: $${entity.taxAmount}`);

        if (valuationParts.length > 0) {
            vaItems.push({
                label: 'Valuation',
                value: valuationParts.join(', ')
            });
        }
    }

    // Property characteristics
    if (entity.propertyType || entity.landUse || entity.buildingClass) {
        const propParts = [];
        if (entity.propertyType) propParts.push(`Type: ${entity.propertyType}`);
        if (entity.landUse) propParts.push(`Land Use: ${entity.landUse}`);
        if (entity.buildingClass) propParts.push(`Building: ${entity.buildingClass}`);

        if (propParts.length > 0) {
            vaItems.push({
                label: 'Property Characteristics',
                value: propParts.join(', ')
            });
        }
    }

    if (vaItems.length === 0) return '';

    return `
        <div class="card">
            <div class="card-title">VisionAppraisal Property Data</div>
            <div class="info-grid">
                ${vaItems.map(item => `
                    <div class="info-item">
                        <div class="info-label">${item.label}</div>
                        <div class="info-value">${item.value}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * Generate Bloomerang-specific section
 * @param {Object} entityWrapper - Entity wrapper
 * @returns {string} HTML for Bloomerang-specific content
 */
function generateBloomerangSpecificSection(entityWrapper) {
    const entity = entityWrapper.entity;
    const blItems = [];

    // Donor/contact specific fields (if present)
    if (entity.donorId || entity.contactId) {
        if (entity.donorId) blItems.push({ label: 'Donor ID', value: entity.donorId });
        if (entity.contactId) blItems.push({ label: 'Contact ID', value: entity.contactId });
    }

    // Relationship information
    if (entity.relationship || entity.householdRole) {
        if (entity.relationship) blItems.push({ label: 'Relationship', value: entity.relationship });
        if (entity.householdRole) blItems.push({ label: 'Household Role', value: entity.householdRole });
    }

    // Transaction/gift information
    if (entity.totalGiving || entity.lastGiftDate || entity.firstGiftDate) {
        if (entity.totalGiving) blItems.push({ label: 'Total Giving', value: `$${entity.totalGiving}` });
        if (entity.lastGiftDate) blItems.push({ label: 'Last Gift', value: entity.lastGiftDate });
        if (entity.firstGiftDate) blItems.push({ label: 'First Gift', value: entity.firstGiftDate });
    }

    if (blItems.length === 0) return '';

    return `
        <div class="card">
            <div class="card-title">Bloomerang Contact Data</div>
            <div class="info-grid">
                ${blItems.map(item => `
                    <div class="info-item">
                        <div class="info-label">${item.label}</div>
                        <div class="info-value">${item.value}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * Generate generic source-specific section
 * @param {Object} entityWrapper - Entity wrapper
 * @returns {string} HTML for generic content
 */
function generateGenericSpecificSection(entityWrapper) {
    const entity = entityWrapper.entity;

    // Try to find interesting fields that aren't covered in other sections
    const excludedFields = new Set([
        'name', 'locationIdentifier', 'accountNumber', 'contactInfo',
        'type', 'constructor', 'otherInfo', 'legacyInfo'
    ]);

    const interestingFields = [];

    Object.entries(entity).forEach(([key, value]) => {
        if (excludedFields.has(key) || value === null || value === undefined) return;

        // Skip complex objects that are likely handled elsewhere
        if (typeof value === 'object' && value.type) return;

        interestingFields.push({
            label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
            value: typeof value === 'object' ? JSON.stringify(value) : String(value)
        });
    });

    if (interestingFields.length === 0) return '';

    return `
        <div class="card">
            <div class="card-title">Additional Information</div>
            <div class="info-grid">
                ${interestingFields.slice(0, 8).map(item => `
                    <div class="info-item">
                        <div class="info-label">${item.label}</div>
                        <div class="info-value">${item.value.length > 100 ? item.value.substring(0, 100) + '...' : item.value}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// =============================================================================
// METADATA SECTION GENERATOR
// =============================================================================

/**
 * Generate metadata section
 * @param {Object} entityWrapper - Entity wrapper
 * @returns {string} HTML for metadata section
 */
function generateUniversalMetadataSection(entityWrapper) {
    const metadata = [];

    // Source metadata
    metadata.push({
        label: 'Data Source',
        value: entityWrapper.source
    });

    metadata.push({
        label: 'Entity Type',
        value: entityWrapper.entityType
    });

    metadata.push({
        label: 'Entity Key',
        value: entityWrapper.key
    });

    // Additional metadata from entity if available
    const entity = entityWrapper.entity;

    if (entity.lastModified || entity.dateCreated || entity.version) {
        if (entity.lastModified) metadata.push({ label: 'Last Modified', value: entity.lastModified });
        if (entity.dateCreated) metadata.push({ label: 'Date Created', value: entity.dateCreated });
        if (entity.version) metadata.push({ label: 'Version', value: entity.version });
    }

    return `
        <div class="card">
            <div class="card-title">Metadata</div>
            <div class="info-grid">
                ${metadata.map(item => `
                    <div class="info-item">
                        <div class="info-label">${item.label}</div>
                        <div class="info-value">${item.value}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// =============================================================================
// RAW DATA SECTION GENERATOR
// =============================================================================

/**
 * Generate raw data section with collapsible JSON display
 * @param {Object} entityWrapper - Entity wrapper
 * @returns {string} HTML for raw data section
 */
function generateUniversalRawDataSection(entityWrapper) {
    return `
        <div class="card">
            <div class="card-title">Complete Entity Data</div>
            <div class="raw-data-section">
                <button class="raw-data-toggle" onclick="toggleRawData()">
                    Show/Hide Raw JSON Data
                </button>
                <div class="raw-data-content" id="rawDataContent">
                    <div class="raw-json">
${JSON.stringify(entityWrapper.entity, null, 2)}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Extract universal entity name from any entity structure
 * @param {Object} entity - Entity object
 * @returns {string} Display name
 */
function extractUniversalEntityName(entity) {
    if (!entity.name) return 'Unknown Entity';

    // Handle direct AttributedTerm names
    if (entity.name.term) {
        return entity.name.term;
    }

    // Handle structured name objects
    if (entity.name.type === 'IndividualName') {
        if (entity.name.completeName) return entity.name.completeName;
        if (entity.name.firstName && entity.name.lastName) {
            return `${entity.name.firstName} ${entity.name.lastName}`;
        }
    }

    // Handle HouseholdName and other name types
    if (entity.name.completeName) return entity.name.completeName;
    if (entity.name.fullName) return entity.name.fullName;

    // Handle nested identifier pattern
    if (entity.name.identifier) {
        if (entity.name.identifier.term) return entity.name.identifier.term;
        if (entity.name.identifier.completeName) return entity.name.identifier.completeName;
        if (entity.name.identifier.firstName && entity.name.identifier.lastName) {
            return `${entity.name.identifier.firstName} ${entity.name.identifier.lastName}`;
        }
    }

    // Handle primaryAlias pattern
    if (entity.name.primaryAlias && entity.name.primaryAlias.term) {
        return entity.name.primaryAlias.term;
    }

    return 'Entity Name Available';
}

// =============================================================================
// JAVASCRIPT FOR INTERACTIVE ELEMENTS
// =============================================================================

/**
 * Generate JavaScript for interactive elements in the detail window
 * @returns {string} JavaScript code
 */
function getUniversalEntityScripts() {
    return `
        function toggleRawData() {
            const content = document.getElementById('rawDataContent');
            if (content) {
                content.classList.toggle('visible');
            }
        }

        // Initialize any interactive elements
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Entity details window loaded');
        });
    `;
}

console.log("🎨 Universal Entity Renderer module loaded");