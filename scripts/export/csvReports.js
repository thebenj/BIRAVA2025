/**
 * csvReports.js - CSV Export Utilities and Report Functions
 *
 * Extracted from entityGroupBrowser.js to reduce file size and improve organization.
 * Contains all CSV export utilities and report generation functions.
 *
 * Dependencies:
 * - entityGroupBrowser.js (for getEntityByKey, showEntityGroupStatus, entityGroupBrowser object)
 * - utils.js (for levenshteinSimilarity, isPOBoxAddress)
 * - universalEntityMatcher.js (for universalCompareTo)
 * - unifiedEntityBrowser.js (for getEntitiesBySource, MATCH_CRITERIA)
 */

// =============================================================================
// CSV UTILITIES
// =============================================================================

/**
 * Escape HTML entities
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * CSV Column Headers - 62 columns (expanded from 54 to add SecAddr1 components)
 */
const CSV_HEADERS = [
    // Section 1: Identification & Mail Merge Core (10 columns)
    'RowType', 'GroupIndex', 'Key', 'MailName', 'MailAddr1', 'MailAddr2',
    'MailCity', 'MailState', 'MailZip', 'Email',
    // Section 2: Additional Contact Info (14 columns - SecAddr1 expanded to 9 component columns)
    'Phone', 'POBox',
    'SecAddr1_primaryAlias', 'SecAddr1_streetNumber', 'SecAddr1_streetName', 'SecAddr1_streetType',
    'SecAddr1_city', 'SecAddr1_state', 'SecAddr1_zipCode', 'SecAddr1_secUnitType', 'SecAddr1_secUnitNum',
    'SecAddr2', 'SecAddr3', 'SecAddrMore',
    // Section 3: Entity Metadata (2 columns)
    'EntityType', 'Source',
    // Section 4: Name Alternatives (12 columns)
    'NameHom1', 'NameHom2', 'NameHom3', 'NameHomMore',
    'NameSyn1', 'NameSyn2', 'NameSyn3', 'NameSynMore',
    'NameCand1', 'NameCand2', 'NameCand3', 'NameCandMore',
    // Section 5: Address Alternatives (12 columns)
    'AddrHom1', 'AddrHom2', 'AddrHom3', 'AddrHomMore',
    'AddrSyn1', 'AddrSyn2', 'AddrSyn3', 'AddrSynMore',
    'AddrCand1', 'AddrCand2', 'AddrCand3', 'AddrCandMore',
    // Section 6: Email Alternatives (12 columns)
    'EmailHom1', 'EmailHom2', 'EmailHom3', 'EmailHomMore',
    'EmailSyn1', 'EmailSyn2', 'EmailSyn3', 'EmailSynMore',
    'EmailCand1', 'EmailCand2', 'EmailCand3', 'EmailCandMore'
];

/**
 * Clean VisionAppraisal tags from text
 * @param {string} text - Text with potential VA tags
 * @returns {string} Cleaned text
 */
function cleanVATags(text) {
    if (!text || typeof text !== 'string') return '';
    return text
        .replace(/::#\^#::/g, ', ')
        .replace(/:\^#\^:/g, ' ')
        .replace(/\^#\^/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/,\s*,/g, ',')
        .replace(/^\s*,\s*|\s*,\s*$/g, '')
        .trim();
}

/**
 * Escape a value for CSV (handle quotes and commas)
 * @param {*} value - Value to escape
 * @returns {string} CSV-safe string
 */
function csvEscape(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

/**
 * Assemble mailing name from entity based on entity type
 * Per spec:
 * - Individual: firstName lastName (or completeName)
 * - AggregateHousehold: Household name term
 * - Business/LegalConstruct: NonHumanName term
 * @param {Object} entity - Entity object
 * @returns {string} Assembled mailing name
 */
function assembleMailName(entity) {
    if (!entity || !entity.name) return '';

    const entityType = entity.__type || entity.constructor?.name || '';

    // Individual: use firstName + lastName or completeName
    if (entityType === 'Individual') {
        if (entity.name.firstName || entity.name.lastName) {
            const parts = [];
            if (entity.name.firstName) parts.push(cleanVATags(entity.name.firstName));
            if (entity.name.lastName) parts.push(cleanVATags(entity.name.lastName));
            return parts.join(' ');
        }
        if (entity.name.completeName) {
            return cleanVATags(entity.name.completeName);
        }
    }

    // AggregateHousehold, Business, LegalConstruct: use primaryAlias.term or term
    if (entity.name.primaryAlias && entity.name.primaryAlias.term) {
        return cleanVATags(entity.name.primaryAlias.term);
    }
    if (entity.name.term) {
        return cleanVATags(entity.name.term);
    }

    return '';
}

/**
 * Extract address components from an Address object
 * @param {Object} address - Address object
 * @returns {Object} {line1, line2, city, state, zip}
 */
function extractAddressComponents(address) {
    const result = { line1: '', line2: '', city: '', state: '', zip: '' };
    if (!address) return result;

    // Line 1: street address from primaryAlias or components
    if (address.primaryAlias && address.primaryAlias.term) {
        result.line1 = cleanVATags(address.primaryAlias.term);
    } else if (address.streetNumber || address.streetName) {
        const parts = [];
        if (address.streetNumber?.term) parts.push(address.streetNumber.term);
        if (address.streetName?.term) parts.push(address.streetName.term);
        if (address.streetType?.term) parts.push(address.streetType.term);
        result.line1 = cleanVATags(parts.join(' '));
    }

    // Line 2: secondary unit
    if (address.secUnitType || address.secUnitNum) {
        const parts = [];
        if (address.secUnitType) parts.push(address.secUnitType);
        if (address.secUnitNum) parts.push(address.secUnitNum);
        result.line2 = parts.join(' ');
    }

    // City, State, Zip
    if (address.city?.term) result.city = cleanVATags(address.city.term);
    if (address.state?.term) result.state = cleanVATags(address.state.term);
    if (address.zipCode?.term) result.zip = cleanVATags(address.zipCode.term);

    return result;
}

/**
 * Format a full address as a single string
 * @param {Object} address - Address object
 * @returns {string} Full address string
 */
function formatFullAddress(address) {
    if (!address) return '';
    const comp = extractAddressComponents(address);
    const parts = [];
    if (comp.line1) parts.push(comp.line1);
    if (comp.line2) parts.push(comp.line2);
    const cityStateZip = [];
    if (comp.city) cityStateZip.push(comp.city);
    if (comp.state) cityStateZip.push(comp.state);
    if (comp.zip) cityStateZip.push(comp.zip);
    if (cityStateZip.length > 0) parts.push(cityStateZip.join(' '));
    return parts.join(', ');
}

/**
 * Extract alternatives from an Aliased object
 * @param {Object} aliased - Aliased object with alternatives property
 * @param {string} category - 'homonyms', 'synonyms', or 'candidates'
 * @returns {Array<string>} Array of term strings
 */
function extractAlternatives(aliased, category) {
    if (!aliased || !aliased.alternatives) return [];
    const alts = aliased.alternatives;

    let items = [];
    if (category === 'homonyms' && alts.homonyms) {
        items = alts.homonyms;
    } else if (category === 'synonyms' && alts.synonyms) {
        items = alts.synonyms;
    } else if (category === 'candidates' && alts.candidates) {
        items = alts.candidates;
    }

    // Extract term from each AttributedTerm
    return items.map(item => {
        if (item && item.term) return cleanVATags(item.term);
        if (typeof item === 'string') return cleanVATags(item);
        return '';
    }).filter(t => t);
}

/**
 * Build alternative columns (first 3 individual, rest pipe-delimited in 4th)
 * @param {Array<string>} items - Array of alternative strings
 * @returns {Array<string>} Array of 4 column values
 */
function buildAlternativeColumns(items) {
    const result = ['', '', '', ''];
    if (!items || items.length === 0) return result;

    if (items.length >= 1) result[0] = items[0];
    if (items.length >= 2) result[1] = items[1];
    if (items.length >= 3) result[2] = items[2];
    if (items.length > 3) result[3] = items.slice(3).join('|');

    return result;
}

/**
 * Get entity type string for CSV
 * @param {Object} entity - Entity object
 * @returns {string} Entity type name
 */
function getEntityTypeString(entity) {
    if (!entity) return '';
    return entity.__type || entity.constructor?.name || 'Unknown';
}

/**
 * Get source string for an entity
 * @param {Object} entity - Entity object
 * @param {string} key - Entity database key (optional, for fallback)
 * @returns {string} 'visionAppraisal', 'bloomerang', or 'both'
 */
function getEntitySource(entity, key) {
    if (entity && entity.source) {
        if (entity.source.toLowerCase().includes('vision')) return 'visionAppraisal';
        if (entity.source.toLowerCase().includes('bloomerang')) return 'bloomerang';
    }
    // Fallback: infer from key
    if (key) {
        if (key.startsWith('visionAppraisal:')) return 'visionAppraisal';
        if (key.startsWith('bloomerang:')) return 'bloomerang';
    }
    return 'unknown';
}

/**
 * Get email from entity
 * @param {Object} entity - Entity object
 * @returns {string} Email address or empty string
 */
function getEntityEmail(entity) {
    if (!entity || !entity.contactInfo || !entity.contactInfo.email) return '';
    const email = entity.contactInfo.email;
    if (email.primaryAlias && email.primaryAlias.term) return cleanVATags(email.primaryAlias.term);
    if (email.term) return cleanVATags(email.term);
    return '';
}

/**
 * Get phone from entity
 * @param {Object} entity - Entity object
 * @returns {string} Phone number or empty string
 */
function getEntityPhone(entity) {
    if (!entity || !entity.contactInfo || !entity.contactInfo.phone) return '';
    const phone = entity.contactInfo.phone;
    if (phone.primaryAlias && phone.primaryAlias.term) return cleanVATags(phone.primaryAlias.term);
    if (phone.term) return cleanVATags(phone.term);
    return '';
}

/**
 * Get PO Box from entity
 * @param {Object} entity - Entity object
 * @returns {string} PO Box or empty string
 */
function getEntityPOBox(entity) {
    if (!entity || !entity.contactInfo || !entity.contactInfo.poBox) return '';
    const poBox = entity.contactInfo.poBox;
    if (poBox.primaryAlias && poBox.primaryAlias.term) return cleanVATags(poBox.primaryAlias.term);
    if (poBox.term) return cleanVATags(poBox.term);
    return '';
}

/**
 * Get secondary addresses from entity
 * @param {Object} entity - Entity object
 * @returns {Array<string>} Array of formatted secondary address strings
 */
function getSecondaryAddresses(entity) {
    if (!entity || !entity.contactInfo || !entity.contactInfo.secondaryAddress) return [];
    const secondaries = entity.contactInfo.secondaryAddress;
    if (!Array.isArray(secondaries)) return [];
    return secondaries.map(addr => formatFullAddress(addr)).filter(a => a);
}

/**
 * Build secondary address columns (first 3 individual, rest pipe-delimited in 4th)
 * @param {Array<string>} addresses - Array of formatted address strings
 * @returns {Array<string>} Array of 4 column values
 */
function buildSecondaryAddressColumns(addresses) {
    const result = ['', '', '', ''];
    if (!addresses || addresses.length === 0) return result;

    if (addresses.length >= 1) result[0] = addresses[0];
    if (addresses.length >= 2) result[1] = addresses[1];
    if (addresses.length >= 3) result[2] = addresses[2];
    if (addresses.length > 3) result[3] = addresses.slice(3).join('|');

    return result;
}

/**
 * Extract SecAddr1 component columns from the first secondary address
 * @param {Object} entity - Entity object
 * @returns {Array<string>} Array of 9 component values
 */
function extractSecAddr1Components(entity) {
    const result = ['', '', '', '', '', '', '', '', ''];
    if (!entity || !entity.contactInfo || !entity.contactInfo.secondaryAddress) return result;

    const secondaries = entity.contactInfo.secondaryAddress;
    if (!Array.isArray(secondaries) || secondaries.length === 0) return result;

    const addr = secondaries[0];
    if (!addr) return result;

    // Extract each component directly from the Address object properties
    result[0] = addr.primaryAlias?.term ? cleanVATags(addr.primaryAlias.term) : '';
    result[1] = addr.streetNumber?.term ? cleanVATags(String(addr.streetNumber.term)) : '';
    result[2] = addr.streetName?.term ? cleanVATags(addr.streetName.term) : '';
    result[3] = addr.streetType?.term ? cleanVATags(addr.streetType.term) : '';
    result[4] = addr.city?.term ? cleanVATags(addr.city.term) : '';
    result[5] = addr.state?.term ? cleanVATags(addr.state.term) : '';
    result[6] = addr.zipCode?.term ? cleanVATags(String(addr.zipCode.term)) : '';
    result[7] = addr.secUnitType?.term ? cleanVATags(addr.secUnitType.term) : '';
    result[8] = addr.secUnitNum?.term ? cleanVATags(String(addr.secUnitNum.term)) : '';

    return result;
}

/**
 * Generate a CSV row for an entity (consensus, founding, member, or nearmiss)
 * @param {string} rowType - 'consensus', 'founding', 'member', or 'nearmiss'
 * @param {Object} entity - Entity object
 * @param {string} key - Entity database key (empty for consensus)
 * @param {number|string} groupIndex - Group index (for consensus/founding only)
 * @param {boolean} includeAlternatives - Whether to populate alternatives columns
 * @returns {Array<string>} Array of 62 column values
 */
function generateCSVRow(rowType, entity, key, groupIndex, includeAlternatives) {
    const row = new Array(62).fill('');

    // Section 1: Identification & Mail Merge Core (columns 0-9)
    row[0] = rowType;                                    // RowType
    row[1] = (rowType === 'consensus' || rowType === 'founding' || rowType === 'consolidated' || rowType === 'member' || rowType === 'candidate') ? String(groupIndex) : ''; // GroupIndex
    row[2] = (rowType === 'consensus' || rowType === 'consolidated') ? '' : key;       // Key
    row[3] = assembleMailName(entity);                   // MailName

    // Primary address components
    const primaryAddr = entity?.contactInfo?.primaryAddress;
    const addrComp = extractAddressComponents(primaryAddr);
    row[4] = addrComp.line1;                             // MailAddr1
    row[5] = addrComp.line2;                             // MailAddr2
    row[6] = addrComp.city;                              // MailCity
    row[7] = addrComp.state;                             // MailState
    row[8] = addrComp.zip;                               // MailZip
    row[9] = getEntityEmail(entity);                     // Email

    // Section 2: Additional Contact Info (columns 10-23)
    row[10] = getEntityPhone(entity);                    // Phone
    row[11] = getEntityPOBox(entity);                    // POBox

    // SecAddr1 components (columns 12-20)
    const secAddr1Comps = extractSecAddr1Components(entity);
    row[12] = secAddr1Comps[0];                          // SecAddr1_primaryAlias
    row[13] = secAddr1Comps[1];                          // SecAddr1_streetNumber
    row[14] = secAddr1Comps[2];                          // SecAddr1_streetName
    row[15] = secAddr1Comps[3];                          // SecAddr1_streetType
    row[16] = secAddr1Comps[4];                          // SecAddr1_city
    row[17] = secAddr1Comps[5];                          // SecAddr1_state
    row[18] = secAddr1Comps[6];                          // SecAddr1_zipCode
    row[19] = secAddr1Comps[7];                          // SecAddr1_secUnitType
    row[20] = secAddr1Comps[8];                          // SecAddr1_secUnitNum

    // SecAddr2, SecAddr3, SecAddrMore (columns 21-23) - remaining secondary addresses as formatted strings
    const secAddrs = getSecondaryAddresses(entity);
    row[21] = secAddrs.length >= 2 ? secAddrs[1] : '';   // SecAddr2
    row[22] = secAddrs.length >= 3 ? secAddrs[2] : '';   // SecAddr3
    row[23] = secAddrs.length > 3 ? secAddrs.slice(3).join('|') : '';  // SecAddrMore

    // Section 3: Entity Metadata (columns 24-25)
    row[24] = getEntityTypeString(entity);               // EntityType
    row[25] = (rowType === 'consensus' || rowType === 'consolidated') ? rowType : getEntitySource(entity, key); // Source

    // Sections 4-6: Alternatives (only for consensus row)
    if (includeAlternatives && entity) {
        // Name alternatives (columns 26-37)
        const nameHom = extractAlternatives(entity.name, 'homonyms');
        const nameSyn = extractAlternatives(entity.name, 'synonyms');
        const nameCand = extractAlternatives(entity.name, 'candidates');

        const nameHomCols = buildAlternativeColumns(nameHom);
        row[26] = nameHomCols[0]; row[27] = nameHomCols[1]; row[28] = nameHomCols[2]; row[29] = nameHomCols[3];

        const nameSynCols = buildAlternativeColumns(nameSyn);
        row[30] = nameSynCols[0]; row[31] = nameSynCols[1]; row[32] = nameSynCols[2]; row[33] = nameSynCols[3];

        const nameCandCols = buildAlternativeColumns(nameCand);
        row[34] = nameCandCols[0]; row[35] = nameCandCols[1]; row[36] = nameCandCols[2]; row[37] = nameCandCols[3];

        // Address alternatives (columns 38-49) - from primaryAddress
        const addrHom = extractAlternatives(primaryAddr, 'homonyms');
        const addrSyn = extractAlternatives(primaryAddr, 'synonyms');
        const addrCand = extractAlternatives(primaryAddr, 'candidates');

        const addrHomCols = buildAlternativeColumns(addrHom);
        row[38] = addrHomCols[0]; row[39] = addrHomCols[1]; row[40] = addrHomCols[2]; row[41] = addrHomCols[3];

        const addrSynCols = buildAlternativeColumns(addrSyn);
        row[42] = addrSynCols[0]; row[43] = addrSynCols[1]; row[44] = addrSynCols[2]; row[45] = addrSynCols[3];

        const addrCandCols = buildAlternativeColumns(addrCand);
        row[46] = addrCandCols[0]; row[47] = addrCandCols[1]; row[48] = addrCandCols[2]; row[49] = addrCandCols[3];

        // Email alternatives (columns 50-61) - from email
        const emailObj = entity?.contactInfo?.email;
        const emailHom = extractAlternatives(emailObj, 'homonyms');
        const emailSyn = extractAlternatives(emailObj, 'synonyms');
        const emailCand = extractAlternatives(emailObj, 'candidates');

        const emailHomCols = buildAlternativeColumns(emailHom);
        row[50] = emailHomCols[0]; row[51] = emailHomCols[1]; row[52] = emailHomCols[2]; row[53] = emailHomCols[3];

        const emailSynCols = buildAlternativeColumns(emailSyn);
        row[54] = emailSynCols[0]; row[55] = emailSynCols[1]; row[56] = emailSynCols[2]; row[57] = emailSynCols[3];

        const emailCandCols = buildAlternativeColumns(emailCand);
        row[58] = emailCandCols[0]; row[59] = emailCandCols[1]; row[60] = emailCandCols[2]; row[61] = emailCandCols[3];
    }

    return row;
}

// =============================================================================
// ENTITY GROUP CSV EXPORT
// =============================================================================

/**
 * Generate all CSV rows for a single EntityGroup
 * Per spec: consensus, founding, member(s), nearmiss(es)
 * @param {Object} group - EntityGroup object
 * @param {boolean} includeNearMisses - Whether to include near miss rows
 * @returns {Array<Array<string>>} Array of row arrays
 */
function generateEntityGroupRows(group, includeNearMisses) {
    const rows = [];

    // 1. Consensus row (if group has consensus entity, or use founding member data)
    const consensusEntity = group.consensusEntity || getEntityByKey(group.foundingMemberKey);
    if (consensusEntity) {
        rows.push(generateCSVRow('consensus', consensusEntity, '', group.index, true));
    }

    // 2. Founding member row
    const foundingEntity = getEntityByKey(group.foundingMemberKey);
    if (foundingEntity) {
        rows.push(generateCSVRow('founding', foundingEntity, group.foundingMemberKey, group.index, false));
    }

    // 3. Other member rows (excluding founding member)
    if (group.memberKeys && group.memberKeys.length > 1) {
        for (const memberKey of group.memberKeys) {
            if (memberKey !== group.foundingMemberKey) {
                const memberEntity = getEntityByKey(memberKey);
                if (memberEntity) {
                    rows.push(generateCSVRow('member', memberEntity, memberKey, '', false));
                }
            }
        }
    }

    // 4. Near miss rows (if enabled)
    if (includeNearMisses && group.nearMissKeys && group.nearMissKeys.length > 0) {
        for (const nearMissKey of group.nearMissKeys) {
            const nearMissEntity = getEntityByKey(nearMissKey);
            if (nearMissEntity) {
                rows.push(generateCSVRow('nearmiss', nearMissEntity, nearMissKey, '', false));
            }
        }
    }

    return rows;
}

/**
 * Export EntityGroups to CSV files (prospects and donors)
 * Main export function per reference_csvExportSpecification.md
 *
 * @param {Object} groupDatabase - EntityGroupDatabase (serialized format)
 * @param {Object} options - Export options
 * @param {boolean} options.includeNearMisses - Include near miss rows (default: true)
 * @returns {Object} {prospectsCSV, donorsCSV, stats}
 */
function exportEntityGroupsToCSV(groupDatabase, options = {}) {
    const includeNearMisses = options.includeNearMisses !== false; // default true

    const groups = Object.values(groupDatabase.groups || {});

    // Separate prospects (no Bloomerang members) from donors (has Bloomerang members)
    const prospectGroups = groups.filter(g => !g.hasBloomerangMember);
    const donorGroups = groups.filter(g => g.hasBloomerangMember);

    // Build CSV header row
    const headerRow = CSV_HEADERS.map(h => csvEscape(h)).join(',');

    // Generate prospect rows
    const prospectRows = [];
    for (const group of prospectGroups) {
        const groupRows = generateEntityGroupRows(group, includeNearMisses);
        prospectRows.push(...groupRows);
    }

    // Generate donor rows
    const donorRows = [];
    for (const group of donorGroups) {
        const groupRows = generateEntityGroupRows(group, includeNearMisses);
        donorRows.push(...groupRows);
    }

    // Build CSV strings
    const prospectDataRows = prospectRows.map(row => row.map(v => csvEscape(v)).join(','));
    const donorDataRows = donorRows.map(row => row.map(v => csvEscape(v)).join(','));

    const prospectsCSV = [headerRow, ...prospectDataRows].join('\n');
    const donorsCSV = [headerRow, ...donorDataRows].join('\n');

    return {
        prospectsCSV,
        donorsCSV,
        stats: {
            prospectGroups: prospectGroups.length,
            prospectRows: prospectRows.length,
            donorGroups: donorGroups.length,
            donorRows: donorRows.length
        }
    };
}

/**
 * Download CSV export files (triggered from UI)
 * Downloads both prospects.csv and donors.csv
 */
function downloadCSVExport() {
    const db = entityGroupBrowser.loadedDatabase || window.entityGroupDatabase;
    if (!db) {
        showEntityGroupStatus('Please load an EntityGroup database first', 'error');
        return;
    }

    // Check if unified database is loaded (needed for entity lookups)
    if (!window.unifiedEntityDatabase || !window.unifiedEntityDatabase.entities) {
        showEntityGroupStatus('Please load the Unified Entity Database first (needed for entity details)', 'error');
        return;
    }

    showEntityGroupStatus('Generating CSV export...', 'loading');

    try {
        // Get include near misses option from checkbox if present
        const nearMissCheckbox = document.getElementById('csvIncludeNearMisses');
        const includeNearMisses = nearMissCheckbox ? nearMissCheckbox.checked : true;

        const result = exportEntityGroupsToCSV(db, { includeNearMisses });

        const dateStr = new Date().toISOString().slice(0, 10);

        // Download prospects CSV
        const prospectsBlob = new Blob([result.prospectsCSV], { type: 'text/csv;charset=utf-8;' });
        const prospectsUrl = URL.createObjectURL(prospectsBlob);
        const prospectsLink = document.createElement('a');
        prospectsLink.href = prospectsUrl;
        prospectsLink.download = `prospects_${dateStr}.csv`;
        document.body.appendChild(prospectsLink);
        prospectsLink.click();
        document.body.removeChild(prospectsLink);
        URL.revokeObjectURL(prospectsUrl);

        // Small delay before second download
        setTimeout(() => {
            // Download donors CSV
            const donorsBlob = new Blob([result.donorsCSV], { type: 'text/csv;charset=utf-8;' });
            const donorsUrl = URL.createObjectURL(donorsBlob);
            const donorsLink = document.createElement('a');
            donorsLink.href = donorsUrl;
            donorsLink.download = `donors_${dateStr}.csv`;
            document.body.appendChild(donorsLink);
            donorsLink.click();
            document.body.removeChild(donorsLink);
            URL.revokeObjectURL(donorsUrl);

            showEntityGroupStatus(
                `Exported ${result.stats.prospectGroups} prospect groups (${result.stats.prospectRows} rows) ` +
                `and ${result.stats.donorGroups} donor groups (${result.stats.donorRows} rows)`,
                'success'
            );
        }, 500);

    } catch (error) {
        console.error('CSV export error:', error);
        showEntityGroupStatus(`Export error: ${error.message}`, 'error');
    }
}

// Export for global access
window.exportEntityGroupsToCSV = exportEntityGroupsToCSV;
window.downloadCSVExport = downloadCSVExport;

// =============================================================================
// ASSESSMENT VALUE REPORT
// =============================================================================

/**
 * Extract all names from an entity, including individual names from households.
 * For AggregateHouseholds, uses individualKeys[] if entityDb is provided (preferred),
 * otherwise falls back to individuals[] for legacy compatibility.
 * @param {Object} entity - Entity object
 * @param {Object} [entityDb=null] - Unified entity database (optional, enables individualKeys navigation)
 * @returns {string[]} - Array of formatted name strings
 */
function extractAllNamesFromEntity(entity, entityDb = null) {
    const names = [];
    if (!entity) return names;

    // Extract entity's own name
    let entityName = entity.name?.primaryAlias?.term || entity.name?.term || '';
    if (typeof entityName === 'object' && entityName !== null) {
        entityName = formatNameObject(entityName);
    }
    if (entityName && !names.includes(entityName)) {
        names.push(entityName);
    }

    // If it's a household (AggregateHousehold), also extract individual names
    // Check by type property (from loaded JSON) or constructor name
    const entityType = entity.type || entity.constructor?.name;
    if (entityType === 'AggregateHousehold') {
        // Prefer individualKeys (key-based navigation) if entityDb is available
        if (entityDb && entity.individualKeys && Array.isArray(entity.individualKeys)) {
            for (const individualKey of entity.individualKeys) {
                const individual = entityDb.entities[individualKey];
                if (!individual) continue;
                let indivName = individual.name?.primaryAlias?.term || individual.name?.term || '';
                if (typeof indivName === 'object' && indivName !== null) {
                    indivName = formatNameObject(indivName);
                }
                if (indivName && !names.includes(indivName)) {
                    names.push(indivName);
                }
            }
        }
        // Fallback to individuals[] if entityDb not provided (legacy support)
        else if (entity.individuals && Array.isArray(entity.individuals)) {
            for (const individual of entity.individuals) {
                let indivName = individual.name?.primaryAlias?.term || individual.name?.term || '';
                if (typeof indivName === 'object' && indivName !== null) {
                    indivName = formatNameObject(indivName);
                }
                if (indivName && !names.includes(indivName)) {
                    names.push(indivName);
                }
            }
        }
    }

    return names;
}

/**
 * Deduplicate names by similarity - removes names that are too similar to earlier names.
 * Uses levenshteinSimilarity with the trueMatch.nameAlone threshold (0.875).
 * Keeps the first occurrence, removes subsequent similar names.
 * @param {string[]} names - Array of name strings
 * @returns {string[]} - Deduplicated array of names
 */
function deduplicateNamesBySimilarity(names) {
    if (!names || names.length <= 1) return names;

    // Get threshold from MATCH_CRITERIA - trueMatch.nameAlone = 0.875
    const threshold = window.MATCH_CRITERIA?.trueMatch?.nameAlone || 0.875;

    const deduplicated = [];
    for (const name of names) {
        // Check if this name is too similar to any already-kept name
        let isDuplicate = false;
        for (const keptName of deduplicated) {
            const similarity = window.levenshteinSimilarity(name, keptName);
            if (similarity >= threshold) {
                isDuplicate = true;
                break;
            }
        }
        if (!isDuplicate) {
            deduplicated.push(name);
        }
    }
    return deduplicated;
}

/**
 * Generate a CSV report of total assessed values per entity group.
 * Calculates total assessment value across all member entities (avoiding duplicates).
 * Includes:
 * - Consensus name and address
 * - Total assessed value
 * - Number of properties combined
 * - All names from member entities (including individuals within households)
 * Sorted by total value descending.
 *
 * @param {Object} groupDatabase - EntityGroupDatabase to export
 * @returns {Object} { csv: string, stats: { groupCount, groupsWithValues, totalValue, maxNamesPerGroup } }
 */
function generateAssessmentValueReport(groupDatabase) {
    const entityDb = window.unifiedEntityDatabase;
    if (!entityDb || !entityDb.entities) {
        throw new Error('Unified Entity Database not loaded');
    }

    const reportRows = [];
    let maxNamesPerGroup = 0;

    // EntityGroupDatabase.groups is always an Object keyed by index, never an Array
    for (const group of Object.values(groupDatabase.groups)) {
        // Track keys we've already processed to avoid duplicates
        const processedKeys = new Set();
        let totalAssessment = 0;
        let propertiesWithValue = 0;
        const allNames = [];

        // Process all member keys (includes founding member)
        for (const memberKey of group.memberKeys) {
            if (processedKeys.has(memberKey)) continue;
            processedKeys.add(memberKey);

            const entity = entityDb.entities[memberKey];
            if (!entity) continue;

            // Extract assessment value from entity's otherInfo
            const assessmentValue = entity.otherInfo?.assessmentValue;
            if (assessmentValue) {
                const numericValue = parseAssessmentValue(assessmentValue);
                if (!isNaN(numericValue) && numericValue > 0) {
                    totalAssessment += numericValue;
                    propertiesWithValue++;
                }
            }

            // Also extract assessment values from SUBDIVISION entities
            // Subdivisions are PIDs that were merged into this entity (same owner, same fire number)
            const subdivision = entity.otherInfo?.subdivision;
            if (subdivision && typeof subdivision === 'object') {
                for (const [pid, subdivEntity] of Object.entries(subdivision)) {
                    // subdivEntity can be a full entity object or a serialized string
                    let subdivOtherInfo = null;
                    if (typeof subdivEntity === 'string') {
                        try {
                            const parsed = JSON.parse(subdivEntity);
                            subdivOtherInfo = parsed.otherInfo;
                        } catch (e) {
                            // Ignore parse errors
                        }
                    } else if (subdivEntity && typeof subdivEntity === 'object') {
                        subdivOtherInfo = subdivEntity.otherInfo;
                    }

                    if (subdivOtherInfo?.assessmentValue) {
                        const subdivValue = parseAssessmentValue(subdivOtherInfo.assessmentValue);
                        if (!isNaN(subdivValue) && subdivValue > 0) {
                            totalAssessment += subdivValue;
                            propertiesWithValue++;
                        }
                    }
                }
            }

            // Extract all names from this entity (including individuals in households)
            const entityNames = extractAllNamesFromEntity(entity, entityDb);
            for (const name of entityNames) {
                if (name && !allNames.includes(name)) {
                    allNames.push(name);
                }
            }
        }

        // Deduplicate names by similarity (removes names >= 0.875 similar to earlier names)
        const deduplicatedNames = deduplicateNamesBySimilarity(allNames);

        // Track maximum names for CSV column count
        if (deduplicatedNames.length > maxNamesPerGroup) {
            maxNamesPerGroup = deduplicatedNames.length;
        }

        // Extract consensus name and address
        let consensusName = '';
        let consensusAddress = '';

        if (group.consensusEntity) {
            const ce = group.consensusEntity;
            consensusName = ce.name?.primaryAlias?.term || ce.name?.term || '';
            if (typeof consensusName === 'object' && consensusName !== null) {
                consensusName = formatNameObject(consensusName);
            }
            consensusAddress = ce.contactInfo?.primaryAddress?.primaryAlias?.term ||
                               ce.contactInfo?.primaryAddress?.term ||
                               ce.locationIdentifier?.primaryAlias?.term || '';
            if (typeof consensusAddress === 'object' && consensusAddress !== null) {
                consensusAddress = formatAddressObject(consensusAddress);
            }
        } else if (group.memberKeys.length > 0) {
            // Singleton - use founding member
            const founder = entityDb.entities[group.foundingMemberKey];
            if (founder) {
                consensusName = founder.name?.primaryAlias?.term || founder.name?.term || '';
                if (typeof consensusName === 'object' && consensusName !== null) {
                    consensusName = formatNameObject(consensusName);
                }
                consensusAddress = founder.contactInfo?.primaryAddress?.primaryAlias?.term ||
                                   founder.contactInfo?.primaryAddress?.term ||
                                   founder.locationIdentifier?.primaryAlias?.term || '';
                if (typeof consensusAddress === 'object' && consensusAddress !== null) {
                    consensusAddress = formatAddressObject(consensusAddress);
                }
            }
        }

        reportRows.push({
            groupIndex: group.index,
            consensusName: consensusName,
            consensusAddress: consensusAddress,
            totalAssessment: totalAssessment,
            propertiesWithValue: propertiesWithValue,
            memberCount: group.memberKeys.length,
            allNames: deduplicatedNames
        });
    }

    // Sort by total assessment value descending
    reportRows.sort((a, b) => b.totalAssessment - a.totalAssessment);

    // Generate CSV header with dynamic name columns
    const nameColumnHeaders = [];
    for (let i = 1; i <= maxNamesPerGroup; i++) {
        nameColumnHeaders.push(`Name ${i}`);
    }
    const csvHeader = [
        'Group Index',
        'Consensus Name',
        'Consensus Address',
        'Total Assessed Value',
        'Properties Combined',
        'Member Count',
        ...nameColumnHeaders
    ].join(',');
    const csvLines = [csvHeader];

    let groupsWithValues = 0;
    let grandTotal = 0;

    for (const row of reportRows) {
        if (row.totalAssessment > 0) {
            groupsWithValues++;
            grandTotal += row.totalAssessment;
        }

        // Build name columns (pad with empty strings if fewer names than max)
        const nameColumns = [];
        for (let i = 0; i < maxNamesPerGroup; i++) {
            nameColumns.push(escapeCSVField(row.allNames[i] || ''));
        }

        csvLines.push([
            row.groupIndex,
            escapeCSVField(row.consensusName),
            escapeCSVField(row.consensusAddress),
            row.totalAssessment,
            row.propertiesWithValue,
            row.memberCount,
            ...nameColumns
        ].join(','));
    }

    return {
        csv: csvLines.join('\n'),
        stats: {
            groupCount: reportRows.length,
            groupsWithValues: groupsWithValues,
            totalValue: grandTotal,
            maxNamesPerGroup: maxNamesPerGroup
        }
    };
}

/**
 * Parse an assessment value string to a number.
 * Handles formats like "$454,500" or "454500"
 */
function parseAssessmentValue(value) {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return NaN;
    // Remove $ and commas, then parse
    const cleaned = value.replace(/[$,]/g, '');
    return parseFloat(cleaned);
}

/**
 * Format a structured name object to a string
 */
function formatNameObject(nameObj) {
    if (!nameObj) return '';
    if (typeof nameObj === 'string') return nameObj;
    // Handle IndividualName structure
    const parts = [];
    if (nameObj.firstName) parts.push(nameObj.firstName);
    if (nameObj.otherNames) parts.push(nameObj.otherNames);
    if (nameObj.lastName) parts.push(nameObj.lastName);
    if (parts.length > 0) return parts.join(' ');
    // Fallback: try term or primaryAlias
    if (nameObj.term) return typeof nameObj.term === 'string' ? nameObj.term : formatNameObject(nameObj.term);
    if (nameObj.primaryAlias?.term) return formatNameObject(nameObj.primaryAlias.term);
    return '';
}

/**
 * Format a structured address object to a string
 */
function formatAddressObject(addrObj) {
    if (!addrObj) return '';
    if (typeof addrObj === 'string') return addrObj;
    // Handle Address structure
    const parts = [];
    if (addrObj.streetAddress) parts.push(addrObj.streetAddress);
    if (addrObj.city) parts.push(addrObj.city);
    if (addrObj.state) parts.push(addrObj.state);
    if (addrObj.zip) parts.push(addrObj.zip);
    if (parts.length > 0) return parts.join(', ');
    // Fallback: try term or primaryAlias
    if (addrObj.term) return typeof addrObj.term === 'string' ? addrObj.term : formatAddressObject(addrObj.term);
    if (addrObj.primaryAlias?.term) return formatAddressObject(addrObj.primaryAlias.term);
    return '';
}

/**
 * Escape a field for CSV format
 */
function escapeCSVField(value) {
    if (value == null) return '';
    const str = String(value);
    // If contains comma, newline, or quote, wrap in quotes and escape internal quotes
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

/**
 * Download the assessment value report as CSV
 */
function downloadAssessmentValueReport() {
    const db = entityGroupBrowser.loadedDatabase || window.entityGroupDatabase;
    if (!db) {
        showEntityGroupStatus('Please load an EntityGroup database first', 'error');
        return;
    }

    if (!window.unifiedEntityDatabase || !window.unifiedEntityDatabase.entities) {
        showEntityGroupStatus('Please load the Unified Entity Database first (needed for entity details)', 'error');
        return;
    }

    showEntityGroupStatus('Generating Assessment Value Report...', 'loading');

    try {
        const result = generateAssessmentValueReport(db);
        const dateStr = new Date().toISOString().slice(0, 10);

        // Download CSV
        const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `assessment_values_${dateStr}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showEntityGroupStatus(
            `Assessment Report: ${result.stats.groupCount} groups, ` +
            `${result.stats.groupsWithValues} with values, ` +
            `Total: $${result.stats.totalValue.toLocaleString()}, ` +
            `Max names: ${result.stats.maxNamesPerGroup}`,
            'success'
        );

    } catch (error) {
        console.error('Assessment value report error:', error);
        showEntityGroupStatus(`Report error: ${error.message}`, 'error');
    }
}

// Export for global access
window.generateAssessmentValueReport = generateAssessmentValueReport;
window.downloadAssessmentValueReport = downloadAssessmentValueReport;

// =============================================================================
// ASSESSMENT VALUE CHECKSUM VERIFICATION
// =============================================================================

/**
 * Calculate assessment value totals from raw VisionAppraisal data (pre-entity stage).
 * This provides a checksum to verify the assessment value report is not omitting properties.
 *
 * Must be run AFTER VisionAppraisal data is loaded (after clicking "Load VA Data").
 *
 * @returns {Object} { totalValue, propertyCount, breakdown: { withValue, withZeroValue, withoutValue } }
 */
async function calculateRawAssessmentChecksum() {
    console.log('=== CALCULATING RAW ASSESSMENT CHECKSUM ===');

    // Try to load VisionAppraisal data fresh
    if (!window.VisionAppraisal) {
        throw new Error('VisionAppraisal data source not loaded. Load the app first.');
    }

    const rawData = await window.VisionAppraisal.loadData();
    console.log(`Loaded ${rawData.length} raw VisionAppraisal records`);

    let totalValue = 0;
    let withValue = 0;
    let withZeroValue = 0;
    let withoutValue = 0;

    for (const record of rawData) {
        const assessmentStr = record.assessmentValue;
        if (!assessmentStr || assessmentStr.trim() === '') {
            withoutValue++;
            continue;
        }

        const numericValue = parseAssessmentValue(assessmentStr);
        if (isNaN(numericValue)) {
            withoutValue++;
            continue;
        }

        if (numericValue === 0) {
            withZeroValue++;
        } else {
            withValue++;
            totalValue += numericValue;
        }
    }

    const result = {
        totalValue,
        propertyCount: rawData.length,
        breakdown: {
            withValue,
            withZeroValue,
            withoutValue
        }
    };

    console.log('=== RAW CHECKSUM RESULT ===');
    console.log(`Total Properties: ${result.propertyCount}`);
    console.log(`  With assessment value > 0: ${withValue}`);
    console.log(`  With assessment value = 0: ${withZeroValue}`);
    console.log(`  Without assessment value: ${withoutValue}`);
    console.log(`TOTAL ASSESSED VALUE: $${totalValue.toLocaleString()}`);

    return result;
}

/**
 * Run a full checksum verification comparing raw data to report output.
 * Loads raw data, generates report, and compares totals.
 */
async function verifyAssessmentChecksum() {
    const db = entityGroupBrowser.loadedDatabase || window.entityGroupDatabase;
    if (!db) {
        showEntityGroupStatus('Please load an EntityGroup database first', 'error');
        return null;
    }

    if (!window.unifiedEntityDatabase || !window.unifiedEntityDatabase.entities) {
        showEntityGroupStatus('Please load the Unified Entity Database first', 'error');
        return null;
    }

    showEntityGroupStatus('Calculating assessment checksums...', 'loading');

    try {
        // Get raw checksum
        const rawChecksum = await calculateRawAssessmentChecksum();

        // Get report checksum
        const reportResult = generateAssessmentValueReport(db);

        // Compare
        const reportTotal = reportResult.stats.totalValue;
        const rawTotal = rawChecksum.totalValue;
        const difference = rawTotal - reportTotal;
        const percentCaptured = rawTotal > 0 ? ((reportTotal / rawTotal) * 100).toFixed(2) : 0;

        const verification = {
            raw: {
                totalValue: rawTotal,
                propertyCount: rawChecksum.propertyCount,
                propertiesWithValue: rawChecksum.breakdown.withValue
            },
            report: {
                totalValue: reportTotal,
                groupCount: reportResult.stats.groupCount,
                groupsWithValues: reportResult.stats.groupsWithValues,
                propertiesCounted: reportResult.stats.groupsWithValues // approximate
            },
            comparison: {
                difference: difference,
                percentCaptured: parseFloat(percentCaptured),
                match: Math.abs(difference) < 1 // within $1 tolerance
            }
        };

        console.log('\n=== CHECKSUM VERIFICATION ===');
        console.log(`RAW VisionAppraisal Total:  $${rawTotal.toLocaleString()} (${rawChecksum.breakdown.withValue} properties)`);
        console.log(`Report Total:               $${reportTotal.toLocaleString()} (${reportResult.stats.groupsWithValues} groups with values)`);
        console.log(`Difference:                 $${difference.toLocaleString()}`);
        console.log(`Percent Captured:           ${percentCaptured}%`);
        console.log(`Match:                      ${verification.comparison.match ? '✓ YES' : '✗ NO'}`);

        if (verification.comparison.match) {
            showEntityGroupStatus(
                `✓ Checksum VERIFIED: Raw $${rawTotal.toLocaleString()} = Report $${reportTotal.toLocaleString()} (${rawChecksum.breakdown.withValue} properties)`,
                'success'
            );
        } else {
            showEntityGroupStatus(
                `⚠ Checksum MISMATCH: Raw $${rawTotal.toLocaleString()} vs Report $${reportTotal.toLocaleString()} (Δ $${difference.toLocaleString()}, ${percentCaptured}%)`,
                'error'
            );
        }

        return verification;

    } catch (error) {
        console.error('Checksum verification error:', error);
        showEntityGroupStatus(`Checksum error: ${error.message}`, 'error');
        return null;
    }
}

// Export checksum functions
window.calculateRawAssessmentChecksum = calculateRawAssessmentChecksum;
window.verifyAssessmentChecksum = verifyAssessmentChecksum;

// =============================================================================
// MULTI-VA PROPERTY REPORT
// =============================================================================

/**
 * Generate a CSV report of groups with more than 2 VisionAppraisal members
 * Uses the same format as the Prospects + Donors export (54 columns)
 * Groups are sorted by number of VA members (descending)
 * Near misses are NOT counted toward VA count, but are NOT included in output
 *
 * Usage from console:
 *   exportMultiVAPropertyReport()
 *   exportMultiVAPropertyReport(3)  // minimum 3 VA members (default is 3, i.e., "more than 2")
 *
 * @param {number} minVAMembers - Minimum number of VA members to include (default 3)
 */
function exportMultiVAPropertyReport(minVAMembers = 3) {
    // Use window.entityGroupDatabase if available, otherwise fall back to browser's loadedDatabase
    const groupDatabase = window.entityGroupDatabase || entityGroupBrowser.loadedDatabase;

    if (!groupDatabase || !groupDatabase.groups) {
        console.error('No EntityGroup database loaded. Build or load one first.');
        return;
    }

    // Check if unified database is loaded (needed for entity lookups)
    if (!window.unifiedEntityDatabase || !window.unifiedEntityDatabase.entities) {
        console.error('Please load the Unified Entity Database first (needed for entity details).');
        return;
    }

    console.log(`Generating Multi-VA Property Report (minimum ${minVAMembers} VA members)...`);

    // Analyze each group for VA member count
    const groupsWithVACount = [];

    // groups is an object keyed by index, not an array
    const allGroups = Object.values(groupDatabase.groups);
    for (const group of allGroups) {
        // Count VisionAppraisal members (NOT near misses)
        const memberKeys = group.memberKeys || [];
        const vaMembers = memberKeys.filter(key => key.startsWith('visionAppraisal:'));
        const vaCount = vaMembers.length;

        if (vaCount >= minVAMembers) {
            groupsWithVACount.push({
                group: group,
                vaCount: vaCount
            });
        }
    }

    // Sort by VA count descending
    groupsWithVACount.sort((a, b) => b.vaCount - a.vaCount);

    console.log(`Found ${groupsWithVACount.length} groups with ${minVAMembers}+ VA members`);

    if (groupsWithVACount.length === 0) {
        console.log('No groups match the criteria.');
        return;
    }

    // Build CSV using the same format as Prospects + Donors export
    const headerRow = CSV_HEADERS.map(h => csvEscape(h)).join(',');

    // Generate rows for each qualifying group (no near misses)
    const allRows = [];
    for (const item of groupsWithVACount) {
        const groupRows = generateEntityGroupRows(item.group, false); // false = no near misses
        allRows.push(...groupRows);
    }

    const dataRows = allRows.map(row => row.map(v => csvEscape(v)).join(','));
    const csv = [headerRow, ...dataRows].join('\n');

    // Download
    const dateStr = new Date().toISOString().slice(0, 10);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `multi_va_property_report_${minVAMembers}plus_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`Exported ${groupsWithVACount.length} groups (${allRows.length} rows) to CSV`);

    // Also return the data for inspection
    return {
        totalGroups: groupsWithVACount.length,
        totalRows: allRows.length,
        groups: groupsWithVACount
    };
}

// Export for global access
window.exportMultiVAPropertyReport = exportMultiVAPropertyReport;

// =============================================================================
// PROSPECT MAIL MERGE EXPORT
// =============================================================================

/**
 * Get the entity type of the founding member for an EntityGroup
 * @param {Object} group - EntityGroup object
 * @param {Object} entityDb - Unified entity database
 * @returns {string} Entity type name or 'Unknown'
 */
function getFoundingMemberType(group, entityDb) {
    if (!group || !group.foundingMemberKey || !entityDb?.entities) {
        return 'Unknown';
    }
    const founder = entityDb.entities[group.foundingMemberKey];
    if (!founder) return 'Unknown';
    return founder.__type || founder.type || founder.constructor?.name || 'Unknown';
}

/**
 * Get the first secondary address from an entity as a normalized string for comparison
 * Uses formatFullAddress() to get the same cleaned format as SecAddr1 in the CSV
 * @param {Object} entity - Entity object
 * @returns {string} First secondary address (normalized) or empty string
 */
function getFirstSecondaryAddress(entity) {
    if (!entity?.contactInfo?.secondaryAddress) {
        return '';
    }
    const secondaries = entity.contactInfo.secondaryAddress;
    if (!Array.isArray(secondaries) || secondaries.length === 0) {
        return '';
    }

    const firstAddr = secondaries[0];
    if (!firstAddr) {
        return '';
    }

    // Use formatFullAddress - same function used to generate SecAddr1 in CSV
    const formattedAddr = formatFullAddress(firstAddr);

    // Normalize for comparison: lowercase, trim, collapse whitespace
    const normalized = normalizeAddressForComparison(formattedAddr);
    return normalized;
}

/**
 * Normalize an address string for comparison
 * @param {string} addr - Address string
 * @returns {string} Normalized address
 */
function normalizeAddressForComparison(addr) {
    if (!addr || typeof addr !== 'string') return '';
    return addr.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Storage for excluded mailing addresses (loaded from Google Sheet)
let mailMergeExcludedAddresses = new Set();

/**
 * Load excluded mailing addresses from Google Sheet
 * Sheet ID: 1SznUWxOrYZAHx_PdEI1jLWTB-n85optL_TET3BNRbvc
 * Reads first column of the sheet
 * @returns {Promise<{count: number, errors: string[]}>}
 */
async function loadMailMergeExcludedAddresses() {
    const SHEET_ID = '1SznUWxOrYZAHx_PdEI1jLWTB-n85optL_TET3BNRbvc';
    const errors = [];

    try {
        const params = {
            spreadsheetId: SHEET_ID,
            range: 'A:A',  // First column only
            valueRenderOption: 'UNFORMATTED_VALUE'
        };

        const response = await gapi.client.sheets.spreadsheets.values.get(params);
        const rows = response.result.values || [];

        // Clear existing and load new
        mailMergeExcludedAddresses.clear();

        for (const row of rows) {
            if (row && row[0]) {
                const rawAddr = String(row[0]);
                const addr = normalizeAddressForComparison(rawAddr);
                if (addr) {
                    mailMergeExcludedAddresses.add(addr);
                }
            }
        }

        console.log(`[MAIL MERGE] Loaded ${mailMergeExcludedAddresses.size} excluded addresses from sheet`);
        return { count: mailMergeExcludedAddresses.size, errors };

    } catch (err) {
        const error = `Failed to load excluded addresses: ${err.message || err}`;
        console.error('[MAIL MERGE] ' + error);
        errors.push(error);
        return { count: 0, errors };
    }
}

/**
 * Check if an entity's first secondary address is in the excluded list
 * @param {Object} entity - Entity object
 * @returns {boolean} True if address is excluded
 */
function isAddressExcluded(entity) {
    const firstSecondary = getFirstSecondaryAddress(entity);
    if (!firstSecondary) return false;
    return mailMergeExcludedAddresses.has(firstSecondary);
}

// Export for global access
window.loadMailMergeExcludedAddresses = loadMailMergeExcludedAddresses;
window.mailMergeExcludedAddresses = mailMergeExcludedAddresses;

// =============================================================================
// ENTITY GROUP EXCLUSION (by group index + member key verification)
// =============================================================================

// Storage for exclusion rules loaded from Google Sheet
// Each rule: { groupIndex: string, memberKey: string }
let mailMergeExclusionRules = [];

// Set of verified excluded group indices (populated by resolveGroupExclusions)
let mailMergeExcludedGroups = new Set();

/**
 * Load excluded entity group rules from Google Sheet
 * Sheet ID: 1ToSnPaEwjcbab_f9u2xwjWmNjJm1nH7B60MeS4Ek0r4
 * Column A: Group index (may be stale)
 * Column B: Member entity key (used to verify/find correct group)
 * @returns {Promise<{count: number, errors: string[]}>}
 */
async function loadMailMergeExcludedGroups() {
    const SHEET_ID = '1ToSnPaEwjcbab_f9u2xwjWmNjJm1nH7B60MeS4Ek0r4';
    const errors = [];

    try {
        const params = {
            spreadsheetId: SHEET_ID,
            range: 'A:B',  // Both columns
            valueRenderOption: 'UNFORMATTED_VALUE'
        };

        const response = await gapi.client.sheets.spreadsheets.values.get(params);
        const rows = response.result.values || [];

        // Clear existing rules
        mailMergeExclusionRules = [];

        for (const row of rows) {
            // Need both group index (col A) and member key (col B)
            const groupIndex = row && row[0] !== undefined && row[0] !== null && row[0] !== ''
                ? String(row[0]).trim()
                : null;
            const memberKey = row && row[1] !== undefined && row[1] !== null && row[1] !== ''
                ? String(row[1]).trim()
                : null;

            // Must have member key; group index is optional (can be empty if unknown)
            if (memberKey) {
                mailMergeExclusionRules.push({ groupIndex, memberKey });
            }
        }

        console.log(`[MAIL MERGE] Loaded ${mailMergeExclusionRules.length} group exclusion rules from sheet`);
        return { count: mailMergeExclusionRules.length, errors };

    } catch (err) {
        const error = `Failed to load excluded groups: ${err.message || err}`;
        console.error('[MAIL MERGE] ' + error);
        errors.push(error);
        return { count: 0, errors };
    }
}

/**
 * Resolve exclusion rules against the actual group database.
 * For each rule, verify the member key is in the specified group.
 * If not, find the correct group containing that member and use that instead.
 * Must be called AFTER group database is loaded, BEFORE filtering groups.
 *
 * @param {Object} groupDatabase - The EntityGroup database
 * @returns {Object} { resolved: number, corrected: number, notFound: number }
 */
function resolveGroupExclusions(groupDatabase) {
    mailMergeExcludedGroups.clear();

    if (!groupDatabase || !groupDatabase.groups) {
        console.warn('[MAIL MERGE] No group database available for exclusion resolution');
        return { resolved: 0, corrected: 0, notFound: 0 };
    }

    // Build memberKey → groupIndex lookup
    const memberKeyToGroupIndex = new Map();
    for (const group of Object.values(groupDatabase.groups)) {
        const groupIndex = String(group.index);
        for (const memberKey of (group.memberKeys || [])) {
            memberKeyToGroupIndex.set(memberKey, groupIndex);
        }
    }

    let resolved = 0;
    let corrected = 0;
    let notFound = 0;

    for (const rule of mailMergeExclusionRules) {
        const { groupIndex, memberKey } = rule;

        // Find which group actually contains this member
        const actualGroupIndex = memberKeyToGroupIndex.get(memberKey);

        if (!actualGroupIndex) {
            // Member not found in any group
            console.warn(`[MAIL MERGE] Exclusion rule member key not found in any group: ${memberKey}`);
            notFound++;
            continue;
        }

        if (groupIndex && groupIndex === actualGroupIndex) {
            // Group index matches - rule is correct
            mailMergeExcludedGroups.add(actualGroupIndex);
            resolved++;
        } else {
            // Group index doesn't match (or was empty) - use the actual group
            console.log(`[MAIL MERGE] Group exclusion corrected: Rule specified group ${groupIndex || '(none)'}, ` +
                `but member ${memberKey} is in group ${actualGroupIndex}. Using group ${actualGroupIndex}.`);
            mailMergeExcludedGroups.add(actualGroupIndex);
            corrected++;
        }
    }

    console.log(`[MAIL MERGE] Group exclusions resolved: ${resolved} verified, ${corrected} corrected, ${notFound} not found`);
    return { resolved, corrected, notFound };
}

/**
 * Check if an entity group is in the excluded list
 * @param {Object} group - EntityGroup object with index property
 * @returns {boolean} True if group is excluded
 */
function isGroupExcluded(group) {
    if (!group || group.index === undefined) return false;
    // Group index is typically a number, convert to string for comparison
    return mailMergeExcludedGroups.has(String(group.index));
}

// Export for global access
window.loadMailMergeExcludedGroups = loadMailMergeExcludedGroups;
window.resolveGroupExclusions = resolveGroupExclusions;
window.mailMergeExcludedGroups = mailMergeExcludedGroups;
window.isGroupExcluded = isGroupExcluded;

/**
 * Check if all members of a group are connected via contactInfo similarity.
 * Uses flood-fill: starting from first member, find all members reachable
 * via edges where contactInfo score > threshold.
 *
 * Uses universalCompareTo (same as entity group building) to get contactInfo scores.
 *
 * @param {Object} group - EntityGroup object with memberKeys
 * @param {Object} entityDb - Entity database with .entities property
 * @returns {boolean} True if all members are connected via contactInfo edges
 */
function isGroupContactInfoConnected(group, entityDb) {
    const memberKeys = group.memberKeys || [];

    // Groups with 0 or 1 members are trivially connected
    if (memberKeys.length <= 1) {
        return true;
    }

    // Get threshold from MATCH_CRITERIA
    const threshold = window.MATCH_CRITERIA?.trueMatch?.contactInfoAlone || 0.87;

    // Get all member entities
    const memberEntities = {};
    for (const key of memberKeys) {
        const entity = entityDb.entities[key];
        if (entity) {
            memberEntities[key] = entity;
        }
    }

    const validKeys = Object.keys(memberEntities);

    // If we couldn't find all entities, cannot determine connectivity
    if (validKeys.length !== memberKeys.length) {
        return false;
    }

    // Flood-fill from the first member
    const reached = new Set();
    const toVisit = [validKeys[0]];
    reached.add(validKeys[0]);

    while (toVisit.length > 0 && reached.size < validKeys.length) {
        const currentKey = toVisit.pop();
        const currentEntity = memberEntities[currentKey];

        // Check current entity against all unreached entities
        for (const candidateKey of validKeys) {
            if (reached.has(candidateKey)) {
                continue;
            }

            const candidateEntity = memberEntities[candidateKey];

            // Use universalCompareTo (same as entity group building)
            const comparison = universalCompareTo(currentEntity, candidateEntity);
            const contactInfoScore = comparison.details?.components?.contactInfo?.similarity;

            // Check if contactInfo score passes threshold
            let passesThreshold = contactInfoScore !== null && contactInfoScore !== undefined && contactInfoScore > threshold;

            // MAIL MERGE FALLBACK: When BOTH entities have PO Box secondary addresses
            // AND BOTH have null/undefined secUnitNum (badly parsed PO Box number),
            // fall back to comparing primaryAlias.term strings directly.
            // This handles the specific case where PO Box addresses are identical but
            // component comparison returns 0 due to missing secUnitNum.
            if (!passesThreshold) {
                const curSecAddr = currentEntity?.contactInfo?.secondaryAddress?.[0];
                const candSecAddr = candidateEntity?.contactInfo?.secondaryAddress?.[0];

                if (curSecAddr && candSecAddr) {
                    const curIsPOBox = typeof isPOBoxAddress === 'function' && isPOBoxAddress(curSecAddr);
                    const candIsPOBox = typeof isPOBoxAddress === 'function' && isPOBoxAddress(candSecAddr);

                    // Only apply fallback when BOTH are PO Box AND BOTH have null secUnitNum
                    if (curIsPOBox && candIsPOBox && !curSecAddr.secUnitNum && !candSecAddr.secUnitNum) {
                        const curTerm = curSecAddr.primaryAlias?.term;
                        const candTerm = candSecAddr.primaryAlias?.term;

                        if (curTerm && candTerm) {
                            const overallAloneThreshold = window.MATCH_CRITERIA?.trueMatch?.overallAlone || 0.905;
                            const termSimilarity = levenshteinSimilarity(curTerm, candTerm);
                            if (termSimilarity > overallAloneThreshold) {
                                passesThreshold = true;
                            }
                        }
                    }
                }
            }

            if (passesThreshold) {
                reached.add(candidateKey);
                toVisit.push(candidateKey);

                // Early exit: if we've reached all members, we're done
                if (reached.size === validKeys.length) {
                    return true;
                }
            }
        }
    }

    // Return true only if we reached all members
    return reached.size === validKeys.length;
}

/**
 * Determine the name to use for a collapsed mail merge row.
 *
 * Rules:
 * 1. If exactly one member is type "Individual" → use that Individual's name
 * 2. If exactly two members are type "Individual" AND their names pass the
 *    true match threshold (nameAlone > 0.875) → use either name (first one)
 * 3. All other cases → use the consensus name
 *
 * Uses universalCompareTo (same as entity group building) to get name scores.
 *
 * @param {Object} group - EntityGroup object
 * @param {Object} entityDb - Entity database with .entities property
 * @returns {Object} The entity whose name should be used for the collapsed row
 */
function getCollapsedRowNameEntity(group, entityDb) {
    const memberKeys = group.memberKeys || [];
    const consensusEntity = group.consensusEntity || entityDb.entities[group.foundingMemberKey];

    // Find all Individual-type members
    const individuals = [];
    for (const key of memberKeys) {
        const entity = entityDb.entities[key];
        if (entity && entity.constructor.name === 'Individual') {
            individuals.push({ key, entity });
        }
    }

    // Rule 1: Exactly one Individual → use that Individual's name
    if (individuals.length === 1) {
        return individuals[0].entity;
    }

    // Rule 2: Exactly two Individuals → check if names pass threshold
    if (individuals.length === 2) {
        const nameThreshold = window.MATCH_CRITERIA?.trueMatch?.nameAlone || 0.875;

        // Use universalCompareTo to get name score
        const comparison = universalCompareTo(individuals[0].entity, individuals[1].entity);
        const nameScore = comparison.details?.components?.name?.similarity;

        if (nameScore !== null && nameScore !== undefined && nameScore > nameThreshold) {
            // Names match well enough, use the first one
            return individuals[0].entity;
        }
    }

    // Rule 3: All other cases → use consensus name
    return consensusEntity;
}

/**
 * Generate CSV rows for a single EntityGroup for mail merge export
 *
 * Differences from generateEntityGroupRows:
 * - Never includes nearmiss rows
 * - Single-member groups: only founding row (no consensus row)
 * - Multi-member groups that are contactInfo-connected: single collapsed row
 * - Other multi-member groups: consensus + founding + member rows
 *
 * @param {Object} group - EntityGroup object
 * @param {Object} entityDb - Entity database with .entities property
 * @returns {Object} { rows: Array<Array<string>>, collapsed: boolean }
 */
function generateMailMergeGroupRows(group, entityDb) {
    const rows = [];
    const memberCount = group.memberKeys?.length || 0;

    if (memberCount === 1) {
        // Single-member group: only show founding member row (no consensus)
        const foundingEntity = getEntityByKey(group.foundingMemberKey);
        if (foundingEntity) {
            rows.push(generateCSVRow('founding', foundingEntity, group.foundingMemberKey, group.index, false));
        }
        return { rows, collapsed: false };
    }

    // Multi-member group: check if contactInfo-connected
    if (isGroupContactInfoConnected(group, entityDb)) {
        // Collapse to single row: use consensus for all fields except name
        const consensusEntity = group.consensusEntity || getEntityByKey(group.foundingMemberKey);
        if (consensusEntity) {
            // Generate row from consensus entity
            const row = generateCSVRow('consolidated', consensusEntity, '', group.index, true);

            // Override Key (column 2) with label indicating consolidated group
            row[2] = 'CONSOLIDATED_GROUP';

            // Override name (column 3) with appropriate entity's name
            const nameEntity = getCollapsedRowNameEntity(group, entityDb);
            row[3] = assembleMailName(nameEntity);

            rows.push(row);
        }
        return { rows, collapsed: true };
    }

    // Not contactInfo-connected: CONSENSUS COLLAPSE fallback
    // Collapse to single row using consensus entity, mark as CONSENSUS_COLLAPSE
    const consensusEntity = group.consensusEntity || getEntityByKey(group.foundingMemberKey);
    if (consensusEntity) {
        const row = generateCSVRow('consolidated', consensusEntity, '', group.index, true);

        // Override Key (column 2) with label indicating consensus collapse
        row[2] = 'CONSENSUS_COLLAPSE';

        // Override name (column 3) with appropriate entity's name
        const nameEntity = getCollapsedRowNameEntity(group, entityDb);
        row[3] = assembleMailName(nameEntity);

        rows.push(row);
    }
    return { rows, collapsed: true };
}

// Simplified mail merge headers - just what's needed for address labels
const SIMPLE_MAIL_MERGE_HEADERS = [
    'Name',      // Recipient name
    'Address1',  // Street address line 1
    'Address2',  // Unit/Apt (optional)
    'City',
    'State',
    'ZIP'
];

/**
 * Generate a simplified mail merge row from an entity
 * Uses secondary address (mailing address) components
 * @param {Object} entity - Entity object
 * @returns {Array<string>} Array of 6 column values
 */
function generateSimpleMailMergeRow(entity) {
    const row = ['', '', '', '', '', ''];

    // Name
    row[0] = assembleMailName(entity);

    // Get secondary address components (the mailing address)
    const secAddr = entity?.contactInfo?.secondaryAddress?.[0];
    if (secAddr) {
        // Get unit type and number
        const unitType = secAddr.secUnitType?.term ? cleanVATags(secAddr.secUnitType.term) : '';
        const unitNum = secAddr.secUnitNum?.term ? cleanVATags(String(secAddr.secUnitNum.term)) : '';

        // Check if this is a PO BOX address
        if (unitType === 'PO BOX') {
            // PO BOX goes in Address1
            row[1] = [unitType, unitNum].filter(p => p).join(' ');
            // Address2 stays empty for PO BOX addresses
        } else {
            // Street address: build Address1 from street components
            const streetNum = secAddr.streetNumber?.term ? cleanVATags(String(secAddr.streetNumber.term)) : '';
            const streetName = secAddr.streetName?.term ? cleanVATags(secAddr.streetName.term) : '';
            const streetType = secAddr.streetType?.term ? cleanVATags(secAddr.streetType.term) : '';
            const parts = [streetNum, streetName, streetType].filter(p => p);
            row[1] = parts.join(' ');

            // Address2: unit type + unit number (APT, STE, etc.)
            if (unitType || unitNum) {
                row[2] = [unitType, unitNum].filter(p => p).join(' ');
            }
        }

        // City, State, ZIP
        row[3] = secAddr.city?.term ? cleanVATags(secAddr.city.term) : '';
        row[4] = secAddr.state?.term ? cleanVATags(secAddr.state.term) : '';
        // Pad 4-digit ZIP codes to 5-digit (user must import CSV with ZIP column as text)
        let zip = secAddr.zipCode?.term ? String(secAddr.zipCode.term) : '';
        if (/^\d{4}$/.test(zip)) {
            zip = '0' + zip;  // Pad 4-digit to 5-digit
        }
        row[5] = zip;
    }

    // Convert address columns (1-5) to uppercase for mailing standards
    // Column 0 (Name) stays as-is
    for (let i = 1; i <= 5; i++) {
        if (row[i]) {
            row[i] = row[i].toUpperCase();
        }
    }

    return row;
}

/**
 * Export prospect mail merge spreadsheet
 *
 * Based on exportEntityGroupsToCSV but with additional exclusion rules and sorting.
 * Generates TWO CSVs: full 62-column format and simplified 6-column format.
 *
 * Exclusion rules:
 * - No Bloomerang members (prospects only)
 * - Group size <= maxGroupSize
 * - Founding member's first secondary address not in excluded addresses list
 *
 * Row rules:
 * - No nearmiss rows
 * - Single-member groups: founding row only (no consensus)
 * - Multi-member groups: consensus + founding + member rows
 *
 * @param {Object} groupDatabase - EntityGroupDatabase
 * @param {Object} options - Export options
 * @param {number} options.maxGroupSize - Maximum group size to include (default: 23)
 * @returns {Object} {csv, simpleCsv, stats}
 */
function exportProspectMailMerge(groupDatabase, options = {}) {
    const maxGroupSize = options.maxGroupSize || 23;

    const entityDb = window.unifiedEntityDatabase;
    if (!entityDb || !entityDb.entities) {
        throw new Error('Unified Entity Database not loaded');
    }

    const allGroups = Object.values(groupDatabase.groups || {});

    // Start with prospect groups (no Bloomerang members) - same as existing export
    const prospectGroups = allGroups.filter(g => !g.hasBloomerangMember);

    // Exclusion counters
    let excludedForSize = 0;
    let excludedForAddress = 0;
    let excludedForGroup = 0;

    const eligibleGroups = prospectGroups.filter(group => {
        // Exclusion 1: filter out groups with too many members
        const memberCount = group.memberKeys?.length || 0;
        if (memberCount > maxGroupSize) {
            excludedForSize++;
            return false;
        }

        // Exclusion 2: filter out groups where founding member's first secondary address is excluded
        const founder = entityDb.entities[group.foundingMemberKey];
        if (founder && isAddressExcluded(founder)) {
            excludedForAddress++;
            return false;
        }

        // Exclusion 3: filter out groups that are explicitly excluded by group key
        if (isGroupExcluded(group)) {
            excludedForGroup++;
            return false;
        }

        return true;
    });

    // Sort: Primary by founding member type (custom order), Secondary by member count descending
    const typeOrder = ['Individual', 'AggregateHousehold', 'LegalConstruct', 'Business'];

    eligibleGroups.sort((a, b) => {
        const typeA = getFoundingMemberType(a, entityDb);
        const typeB = getFoundingMemberType(b, entityDb);

        // Primary sort: entity type by custom order
        const orderA = typeOrder.indexOf(typeA);
        const orderB = typeOrder.indexOf(typeB);
        // Put unknown types at the end
        const effectiveOrderA = orderA === -1 ? typeOrder.length : orderA;
        const effectiveOrderB = orderB === -1 ? typeOrder.length : orderB;

        if (effectiveOrderA !== effectiveOrderB) {
            return effectiveOrderA - effectiveOrderB;
        }

        // Secondary sort: member count descending
        const countA = a.memberKeys?.length || 0;
        const countB = b.memberKeys?.length || 0;
        return countB - countA;
    });

    // Build CSV header rows
    const headerRow = CSV_HEADERS.map(h => csvEscape(h)).join(',');
    const simpleHeaderRow = SIMPLE_MAIL_MERGE_HEADERS.map(h => csvEscape(h)).join(',');

    // Generate BOTH row sets in single pass through eligible groups
    const rows = [];           // Full 62-column rows
    const simpleRows = [];     // Simplified 6-column rows
    let collapsedGroupCount = 0;

    for (const group of eligibleGroups) {
        const result = generateMailMergeGroupRows(group, entityDb);
        rows.push(...result.rows);
        if (result.collapsed) {
            collapsedGroupCount++;
        }

        // For simplified CSV: one row per group using consensus entity
        // (mail merge only needs one address per household)
        const consensusEntity = group.consensusEntity || entityDb.entities[group.foundingMemberKey];
        if (consensusEntity) {
            // Get the name from the appropriate entity (same logic as collapsed rows)
            const nameEntity = getCollapsedRowNameEntity(group, entityDb);
            const simpleRow = generateSimpleMailMergeRow(consensusEntity);
            // Override name with the selected name entity
            simpleRow[0] = assembleMailName(nameEntity);
            simpleRows.push(simpleRow);
        }
    }

    // Build full CSV string
    const dataRows = rows.map(row => row.map(v => csvEscape(v)).join(','));
    const csv = [headerRow, ...dataRows].join('\n');

    // Build simplified CSV string
    const simpleDataRows = simpleRows.map(row => row.map(v => csvEscape(v)).join(','));
    const simpleCsv = [simpleHeaderRow, ...simpleDataRows].join('\n');

    return {
        csv,
        simpleCsv,
        stats: {
            totalGroups: allGroups.length,
            totalProspectGroups: prospectGroups.length,
            excludedForSize,
            excludedForAddress,
            excludedForGroup,
            maxGroupSize,
            eligibleGroups: eligibleGroups.length,
            collapsedGroups: collapsedGroupCount,
            rowCount: rows.length,
            simpleRowCount: simpleRows.length
        }
    };
}

/**
 * Download prospect mail merge spreadsheets (triggered from UI or console)
 * Automatically loads excluded addresses from Google Sheet before export.
 * Downloads TWO files:
 *   1. prospect_mailmerge_YYYY-MM-DD.csv - Full 62-column format
 *   2. prospect_mailmerge_simple_YYYY-MM-DD.csv - Simplified 6-column format for address labels
 * @param {Object} options - Export options
 * @param {number} options.maxGroupSize - Maximum group size to include (default: 23)
 */
async function downloadProspectMailMerge(options = {}) {
    const db = entityGroupBrowser.loadedDatabase || window.entityGroupDatabase;
    if (!db) {
        console.error('Please load an EntityGroup database first');
        showEntityGroupStatus('Please load an EntityGroup database first', 'error');
        return;
    }

    if (!window.unifiedEntityDatabase || !window.unifiedEntityDatabase.entities) {
        console.error('Please load the Unified Entity Database first');
        showEntityGroupStatus('Please load the Unified Entity Database first', 'error');
        return;
    }

    const maxGroupSize = options.maxGroupSize || 23;

    try {
        // Load excluded addresses from Google Sheet
        showEntityGroupStatus('Loading exclusion lists from Google Sheets...', 'loading');
        const addrResult = await loadMailMergeExcludedAddresses();
        if (addrResult.errors.length > 0) {
            console.warn('Errors loading excluded addresses:', addrResult.errors);
        }

        // Load excluded groups from Google Sheet
        const groupResult = await loadMailMergeExcludedGroups();
        if (groupResult.errors.length > 0) {
            console.warn('Errors loading excluded groups:', groupResult.errors);
        }

        // Resolve group exclusions against actual group database
        // This verifies member keys are in the expected groups, correcting if needed
        const exclusionResolution = resolveGroupExclusions(db);

        console.log(`Generating Prospect Mail Merge (max group size: ${maxGroupSize})...`);
        showEntityGroupStatus(`Generating Prospect Mail Merge (max group size: ${maxGroupSize})...`, 'loading');

        const result = exportProspectMailMerge(db, options);
        const dateStr = new Date().toISOString().slice(0, 10);

        // Download full CSV
        const blob1 = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
        const url1 = URL.createObjectURL(blob1);
        const link1 = document.createElement('a');
        link1.href = url1;
        link1.download = `prospect_mailmerge_${dateStr}.csv`;
        document.body.appendChild(link1);
        link1.click();
        document.body.removeChild(link1);
        URL.revokeObjectURL(url1);

        // Small delay between downloads to ensure both trigger
        await new Promise(resolve => setTimeout(resolve, 100));

        // Download simplified CSV
        const blob2 = new Blob([result.simpleCsv], { type: 'text/csv;charset=utf-8;' });
        const url2 = URL.createObjectURL(blob2);
        const link2 = document.createElement('a');
        link2.href = url2;
        link2.download = `prospect_mailmerge_simple_${dateStr}.csv`;
        document.body.appendChild(link2);
        link2.click();
        document.body.removeChild(link2);
        URL.revokeObjectURL(url2);

        const statusMsg = `Prospect Mail Merge: ${result.stats.eligibleGroups} groups. ` +
            `Full: ${result.stats.rowCount} rows. Simple: ${result.stats.simpleRowCount} rows. ` +
            `Excluded: ${result.stats.excludedForSize} (size), ${result.stats.excludedForAddress} (address), ${result.stats.excludedForGroup} (group)`;

        console.log(statusMsg);
        console.log('Full stats:', result.stats);
        showEntityGroupStatus(statusMsg, 'success');

        return result.stats;

    } catch (error) {
        console.error('Prospect mail merge export error:', error);
        showEntityGroupStatus(`Export error: ${error.message}`, 'error');
    }
}

// Export for global access
window.exportProspectMailMerge = exportProspectMailMerge;
window.downloadProspectMailMerge = downloadProspectMailMerge;

/**
 * Run Prospect Mail Merge Export - wrapper that loads EntityGroup database if needed
 * Called from UI button. Loads database from Google Drive if not already loaded.
 */
async function runProspectMailMergeExport() {
    const button = document.getElementById('prospectMailMergeBtn');
    const originalText = button ? button.textContent : '';

    try {
        // Step 1: Check if unified entity database is loaded, load if not
        if (!window.unifiedEntityDatabase || !window.unifiedEntityDatabase.entities) {
            if (button) button.textContent = 'Loading Unified DB...';
            showEntityGroupStatus('Loading Unified Entity Database...', 'loading');
            await loadUnifiedDatabaseForEntityGroups();

            if (!window.unifiedEntityDatabase || !window.unifiedEntityDatabase.entities) {
                showEntityGroupStatus('Failed to load Unified Entity Database', 'error');
                if (button) button.textContent = originalText;
                return;
            }
        }

        // Step 2: Check if EntityGroup database is loaded, load if not
        let db = entityGroupBrowser.loadedDatabase || window.entityGroupDatabase;

        if (!db) {
            if (button) button.textContent = 'Loading EntityGroup DB...';
            showEntityGroupStatus('Loading EntityGroup database...', 'loading');
            await loadEntityGroupDatabase();

            db = entityGroupBrowser.loadedDatabase || window.entityGroupDatabase;
            if (!db) {
                showEntityGroupStatus('Failed to load EntityGroup database', 'error');
                if (button) button.textContent = originalText;
                return;
            }
        }

        // Step 3: Run the mail merge export
        if (button) button.textContent = 'Generating...';
        await downloadProspectMailMerge();

    } catch (error) {
        console.error('Prospect mail merge error:', error);
        showEntityGroupStatus(`Error: ${error.message}`, 'error');
    } finally {
        if (button) button.textContent = originalText;
    }
}

// Export for global access
window.runProspectMailMergeExport = runProspectMailMergeExport;

// =============================================================================
// BLOOMERANG-ONLY ENTITY GROUPS MATCH CANDIDATES REPORT
// =============================================================================

/**
 * Check if an entity group contains ONLY Bloomerang members (no VisionAppraisal members)
 * @param {Object} group - EntityGroup object
 * @returns {boolean} True if all members are from Bloomerang
 */
function isBloomerangOnlyGroup(group) {
    if (!group.memberKeys || group.memberKeys.length === 0) {
        return false;
    }
    // Check if ALL member keys start with 'bloomerang:'
    return group.memberKeys.every(key => key.startsWith('bloomerang:'));
}

/**
 * Extract all last names from members of a Bloomerang-only group.
 * @param {Object} group - EntityGroup object
 * @param {Object} entityDb - Entity database with .entities property
 * @returns {Set<string>} Set of last names (uppercase for case-insensitive matching)
 */
function extractGroupLastNames(group, entityDb) {
    const lastNames = new Set();

    for (const memberKey of group.memberKeys) {
        const entity = entityDb.entities[memberKey];
        if (!entity) continue;

        // Get lastName from IndividualName if available
        if (entity.name?.lastName) {
            const lastName = entity.name.lastName.trim().toUpperCase();
            if (lastName.length > 0) {
                lastNames.add(lastName);
            }
        }

        // For AggregateHousehold, check individual members via individualKeys
        if (entity.individualKeys && Array.isArray(entity.individualKeys)) {
            for (const individualKey of entity.individualKeys) {
                const individual = entityDb.entities[individualKey];
                if (individual?.name?.lastName) {
                    const lastName = individual.name.lastName.trim().toUpperCase();
                    if (lastName.length > 0) {
                        lastNames.add(lastName);
                    }
                }
            }
        }
    }

    return lastNames;
}

/**
 * Extract all first names from members of an entity group.
 * Checks both direct entity names and embedded individuals in AggregateHouseholds.
 * @param {EntityGroup} group - The entity group
 * @param {Object} entityDb - The unified entity database
 * @returns {Set<string>} Set of unique first names (uppercase)
 */
function extractGroupFirstNames(group, entityDb) {
    const firstNames = new Set();

    for (const memberKey of group.memberKeys) {
        const entity = entityDb.entities[memberKey];
        if (!entity) continue;

        // Get firstName from IndividualName if available
        if (entity.name?.firstName) {
            const firstName = entity.name.firstName.trim().toUpperCase();
            if (firstName.length > 0) {
                firstNames.add(firstName);
            }
        }

        // For AggregateHousehold, check individual members via individualKeys
        if (entity.individualKeys && Array.isArray(entity.individualKeys)) {
            for (const individualKey of entity.individualKeys) {
                const individual = entityDb.entities[individualKey];
                if (individual?.name?.firstName) {
                    const firstName = individual.name.firstName.trim().toUpperCase();
                    if (firstName.length > 0) {
                        firstNames.add(firstName);
                    }
                }
            }
        }
    }

    return firstNames;
}

/**
 * Find top N VisionAppraisal entities by name similarity score for a given Bloomerang entity.
 * Uses universalCompareTo() to get the name component score.
 * @param {Object} bloomerangEntity - The Bloomerang entity to find matches for
 * @param {Object} visionAppraisalEntities - Object keyed by database key {key: entity, ...}
 * @param {number} topN - Number of top matches to return (default: 5)
 * @param {number} minScore - Minimum name similarity score threshold (default: 0.70)
 * @returns {Array<{key: string, entity: Object, nameScore: number}>}
 */
function findTopVAMatchesByName(bloomerangEntity, visionAppraisalEntities, topN = 5, minScore = 0.70) {
    const results = [];

    for (const [vaKey, vaEntity] of Object.entries(visionAppraisalEntities)) {
        try {
            const comparison = universalCompareTo(bloomerangEntity, vaEntity);
            const nameScore = comparison.details?.components?.name?.similarity || 0;

            // Only include if above minimum threshold
            if (nameScore >= minScore) {
                results.push({
                    key: vaKey,
                    entity: vaEntity,
                    nameScore: nameScore
                });
            }
        } catch (e) {
            // Skip entities that fail comparison
        }
    }

    // Sort by nameScore descending
    results.sort((a, b) => b.nameScore - a.nameScore);

    return results.slice(0, topN);
}

/**
 * Check if a last name appears as a distinct word in a string.
 *
 * Before the lastName must be: start of string, space, or punctuation
 * After the lastName must be: end of string, space, or punctuation
 *
 * This prevents matching "FORD" within "CLIFFORD" or "OFF" within "OFFSHORE".
 *
 * @param {string} text - The text to search in (uppercase)
 * @param {string} lastName - The last name to find (uppercase)
 * @returns {boolean} True if lastName appears as a distinct word
 */
function lastNameAppearsAsWord(text, lastName) {
    // Check all occurrences
    let searchStart = 0;
    while (true) {
        const pos = text.indexOf(lastName, searchStart);
        if (pos === -1) return false;

        // Check character BEFORE the match
        let validBefore = false;
        if (pos === 0) {
            // At start of string
            validBefore = true;
        } else {
            const charBefore = text[pos - 1];
            // Space or punctuation (anything that's not a letter or digit)
            validBefore = (charBefore === ' ' || /[^A-Z0-9]/.test(charBefore));
        }

        // Check character AFTER the match
        let validAfter = false;
        const endPos = pos + lastName.length;
        if (endPos >= text.length) {
            // At end of string
            validAfter = true;
        } else {
            const charAfter = text[endPos];
            // Space or punctuation (anything that's not a letter or digit)
            validAfter = (charAfter === ' ' || /[^A-Z0-9]/.test(charAfter));
        }

        // Valid only if both before and after are valid word boundaries
        if (validBefore && validAfter) {
            return true;
        }

        // Move past this occurrence and keep searching
        searchStart = pos + 1;
    }
}

/**
 * Find VisionAppraisal entities whose MailName contains any of the given last names as distinct words.
 * Optionally also checks for first name matches.
 * @param {Object} visionAppraisalEntities - Object keyed by database key {key: entity, ...}
 * @param {Set<string>} lastNames - Set of last names to search for (uppercase)
 * @param {Set<string>} [firstNames] - Optional set of first names to search for (uppercase)
 * @returns {Array<{key: string, entity: Object, nameScore: number, matchedLastName: string, matchedFirstName: string|null, hasFirstNameMatch: boolean}>}
 */
function findVAEntitiesByLastName(visionAppraisalEntities, lastNames, firstNames = null) {
    const results = [];

    if (lastNames.size === 0) return results;

    for (const [vaKey, vaEntity] of Object.entries(visionAppraisalEntities)) {
        const mailName = assembleMailName(vaEntity).toUpperCase();

        // Check if mailName contains any of the last names as a distinct word
        for (const lastName of lastNames) {
            if (lastNameAppearsAsWord(mailName, lastName)) {
                // Check for first name match if firstNames provided
                let matchedFirstName = null;
                let hasFirstNameMatch = false;

                if (firstNames && firstNames.size > 0) {
                    for (const firstName of firstNames) {
                        if (lastNameAppearsAsWord(mailName, firstName)) {
                            matchedFirstName = firstName;
                            hasFirstNameMatch = true;
                            break;  // Only need one first name match
                        }
                    }
                }

                results.push({
                    key: vaKey,
                    entity: vaEntity,
                    nameScore: 0,  // No similarity score - matched by last name
                    matchedLastName: lastName,
                    matchedFirstName: matchedFirstName,
                    hasFirstNameMatch: hasFirstNameMatch
                });
                break;  // Only add once even if multiple last names match
            }
        }
    }

    return results;
}

/**
 * Export Bloomerang-Only Match Candidates Report
 *
 * This report identifies entity groups that contain ONLY Bloomerang entities (no VisionAppraisal
 * members), then for each group, finds VisionAppraisal entities that are potential matches.
 *
 * Two criteria for including VA entities:
 * 1. Name similarity score >= threshold (default 0.70) via universalCompareTo()
 * 2. VA entity's MailName contains any last name from the Bloomerang group members
 *
 * Output structure for each Bloomerang-only group:
 * - Consensus row (first row of the set)
 * - VA candidate rows sorted by name score (deduplicated, combines both criteria)
 *
 * @param {Object} groupDatabase - EntityGroupDatabase
 * @param {Object} options - Export options
 * @param {number} options.candidatesPerMember - Number of VA candidates per member for similarity (default: 5)
 * @param {number} options.minNameScore - Minimum name similarity threshold (default: 0.70)
 * @returns {Object} {csv, stats}
 */
function exportBloomerangOnlyMatchCandidates(groupDatabase, options = {}) {
    const candidatesPerMember = options.candidatesPerMember || 5;
    const minNameScore = options.minNameScore || 0.70;

    const entityDb = window.unifiedEntityDatabase;
    if (!entityDb || !entityDb.entities) {
        throw new Error('Unified Entity Database not loaded');
    }

    // Get VisionAppraisal entities for comparison
    const vaEntities = getEntitiesBySource('visionAppraisal');
    const vaEntityCount = Object.keys(vaEntities).length;
    console.log(`[BLOOMERANG CANDIDATES] Found ${vaEntityCount} VisionAppraisal entities for comparison`);

    const allGroups = Object.values(groupDatabase.groups || {});

    // Filter to Bloomerang-only groups
    const bloomerangOnlyGroups = allGroups.filter(isBloomerangOnlyGroup);
    console.log(`[BLOOMERANG CANDIDATES] Found ${bloomerangOnlyGroups.length} Bloomerang-only groups out of ${allGroups.length} total`);

    // Sort by group index for consistent output
    bloomerangOnlyGroups.sort((a, b) => a.index - b.index);

    // Build CSV with custom headers - insert NameScore column after Key (position 3)
    // Standard headers: RowType(0), GroupIndex(1), Key(2), MailName(3)...
    // New headers: RowType(0), GroupIndex(1), Key(2), NameScore(3), MailName(4)...
    const customHeaders = [...CSV_HEADERS];
    customHeaders.splice(3, 0, 'NameScore');  // Insert NameScore at position 3
    const headerRow = customHeaders.map(h => csvEscape(h)).join(',');

    const rows = [];
    let totalCandidatesGenerated = 0;
    let lastNameMatchCount = 0;
    let similarityMatchCount = 0;
    let groupsProcessed = 0;

    for (const group of bloomerangOnlyGroups) {
        groupsProcessed++;

        // Log progress every 10 groups
        if (groupsProcessed % 10 === 0) {
            console.log(`[BLOOMERANG CANDIDATES] Processing group ${groupsProcessed}/${bloomerangOnlyGroups.length}...`);
        }

        // 1. Consensus row (or founding member if no consensus)
        const consensusEntity = group.consensusEntity || entityDb.entities[group.foundingMemberKey];
        if (consensusEntity) {
            const consensusRow = generateCSVRow('consensus', consensusEntity, '', group.index, true);
            // Insert empty NameScore at position 3 (consensus rows don't have a match score)
            consensusRow.splice(3, 0, '');
            rows.push(consensusRow);
        }

        // 2. Extract last names from all Bloomerang group members
        const groupLastNames = extractGroupLastNames(group, entityDb);

        // 3. Collect candidates from BOTH criteria, deduplicate
        const allCandidates = []; // {key, entity, nameScore, matchReason}
        const seenVAKeys = new Set();

        // Criteria 1: Name similarity matches from each member
        for (const memberKey of group.memberKeys) {
            const memberEntity = entityDb.entities[memberKey];
            if (!memberEntity) continue;

            // Find top N VisionAppraisal matches by name score for this member
            const topMatches = findTopVAMatchesByName(memberEntity, vaEntities, candidatesPerMember, minNameScore);

            // Add to collection, deduplicating by VA key
            for (const match of topMatches) {
                if (!seenVAKeys.has(match.key)) {
                    seenVAKeys.add(match.key);
                    allCandidates.push({
                        ...match,
                        matchReason: 'similarity'
                    });
                    similarityMatchCount++;
                }
            }
        }

        // Criteria 2: Last name substring matches
        const lastNameMatches = findVAEntitiesByLastName(vaEntities, groupLastNames);
        for (const match of lastNameMatches) {
            if (!seenVAKeys.has(match.key)) {
                seenVAKeys.add(match.key);
                allCandidates.push({
                    ...match,
                    matchReason: `lastName:${match.matchedLastName}`
                });
                lastNameMatchCount++;
            }
        }

        // Sort: lastName matches first, then by nameScore descending
        // lastName matches have matchReason starting with "lastName:", similarity matches have "similarity"
        allCandidates.sort((a, b) => {
            const aIsLastName = a.matchReason.startsWith('lastName:');
            const bIsLastName = b.matchReason.startsWith('lastName:');

            // lastName matches come first
            if (aIsLastName && !bIsLastName) return -1;
            if (!aIsLastName && bIsLastName) return 1;

            // Within same category, sort by nameScore descending
            return b.nameScore - a.nameScore;
        });

        // Generate candidate rows
        for (const candidate of allCandidates) {
            const row = generateCSVRow('candidate', candidate.entity, candidate.key, '', false);
            // Insert NameScore at position 3
            row.splice(3, 0, candidate.nameScore.toFixed(4));
            rows.push(row);
            totalCandidatesGenerated++;
        }
    }

    // Build CSV string
    const dataRows = rows.map(row => row.map(v => csvEscape(v)).join(','));
    const csv = [headerRow, ...dataRows].join('\n');

    return {
        csv,
        stats: {
            totalGroups: allGroups.length,
            bloomerangOnlyGroups: bloomerangOnlyGroups.length,
            visionAppraisalEntities: vaEntityCount,
            candidatesPerMember,
            minNameScore,
            totalCandidatesGenerated,
            similarityMatchCount,
            lastNameMatchCount,
            rowCount: rows.length
        }
    };
}

/**
 * Download Bloomerang-Only Match Candidates Report
 * @param {Object} options - Export options
 * @param {number} options.candidatesPerMember - Number of VA candidates per member (default: 5)
 * @param {number} options.minNameScore - Minimum name similarity threshold (default: 0.70)
 */
async function downloadBloomerangOnlyMatchCandidates(options = {}) {
    const db = entityGroupBrowser.loadedDatabase || window.entityGroupDatabase;
    if (!db) {
        console.error('Please load an EntityGroup database first');
        showEntityGroupStatus('Please load an EntityGroup database first', 'error');
        return;
    }

    if (!window.unifiedEntityDatabase || !window.unifiedEntityDatabase.entities) {
        console.error('Please load the Unified Entity Database first');
        showEntityGroupStatus('Please load the Unified Entity Database first', 'error');
        return;
    }

    try {
        const candidatesPerMember = options.candidatesPerMember || 5;
        const minNameScore = options.minNameScore || 0.70;

        console.log(`Generating Bloomerang-Only Match Candidates Report (${candidatesPerMember} candidates/member, min score: ${minNameScore})...`);
        showEntityGroupStatus(`Generating Bloomerang-Only Match Candidates Report...`, 'loading');

        const result = exportBloomerangOnlyMatchCandidates(db, options);
        const dateStr = new Date().toISOString().slice(0, 10);

        // Download CSV
        const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `bloomerang_only_match_candidates_${dateStr}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        const statusMsg = `Bloomerang-Only Match Candidates: ${result.stats.bloomerangOnlyGroups} groups, ` +
            `${result.stats.totalCandidatesGenerated} VA candidates (${result.stats.similarityMatchCount} similarity, ${result.stats.lastNameMatchCount} lastName), ` +
            `${result.stats.rowCount} total rows`;

        console.log(statusMsg);
        console.log('Full stats:', result.stats);
        showEntityGroupStatus(statusMsg, 'success');

        return result.stats;

    } catch (error) {
        console.error('Bloomerang-only match candidates export error:', error);
        showEntityGroupStatus(`Export error: ${error.message}`, 'error');
    }
}

/**
 * Run Bloomerang-Only Match Candidates Export - wrapper that loads databases if needed
 * Called from console. Loads databases from Google Drive if not already loaded.
 */
async function runBloomerangOnlyMatchCandidatesExport(options = {}) {
    try {
        // Step 1: Check if unified entity database is loaded, load if not
        if (!window.unifiedEntityDatabase || !window.unifiedEntityDatabase.entities) {
            showEntityGroupStatus('Loading Unified Entity Database...', 'loading');
            await loadUnifiedDatabaseForEntityGroups();

            if (!window.unifiedEntityDatabase || !window.unifiedEntityDatabase.entities) {
                showEntityGroupStatus('Failed to load Unified Entity Database', 'error');
                return;
            }
        }

        // Step 2: Check if EntityGroup database is loaded, load if not
        let db = entityGroupBrowser.loadedDatabase || window.entityGroupDatabase;

        if (!db) {
            showEntityGroupStatus('Loading EntityGroup database...', 'loading');
            await loadEntityGroupDatabase();

            db = entityGroupBrowser.loadedDatabase || window.entityGroupDatabase;
            if (!db) {
                showEntityGroupStatus('Failed to load EntityGroup database', 'error');
                return;
            }
        }

        // Step 3: Run the export
        await downloadBloomerangOnlyMatchCandidates(options);

    } catch (error) {
        console.error('Bloomerang-only match candidates error:', error);
        showEntityGroupStatus(`Error: ${error.message}`, 'error');
    }
}

// Export for global access
window.exportBloomerangOnlyMatchCandidates = exportBloomerangOnlyMatchCandidates;
window.downloadBloomerangOnlyMatchCandidates = downloadBloomerangOnlyMatchCandidates;
window.runBloomerangOnlyMatchCandidatesExport = runBloomerangOnlyMatchCandidatesExport;

// =============================================================================
// BLOOMERANG-ONLY LAST NAME MATCH REPORT (SIMPLIFIED VERSION)
// =============================================================================

/**
 * Export Bloomerang-Only Last Name Match Report (Simplified)
 *
 * For each Bloomerang-only entity group:
 * - Output consensus row
 * - Output VA entities whose MailName contains any last name from the Bloomerang group
 *
 * No similarity scoring - purely substring matching on last names.
 *
 * @param {Object} groupDatabase - EntityGroupDatabase
 * @returns {Object} {csv, stats}
 */
function exportBloomerangLastNameMatches(groupDatabase) {
    const entityDb = window.unifiedEntityDatabase;
    if (!entityDb || !entityDb.entities) {
        throw new Error('Unified Entity Database not loaded');
    }

    // Get VisionAppraisal entities
    const vaEntities = getEntitiesBySource('visionAppraisal');
    const vaEntityCount = Object.keys(vaEntities).length;
    console.log(`[LASTNAME MATCH] Found ${vaEntityCount} VisionAppraisal entities`);

    const allGroups = Object.values(groupDatabase.groups || {});

    // Filter to Bloomerang-only groups
    const bloomerangOnlyGroups = allGroups.filter(isBloomerangOnlyGroup);
    console.log(`[LASTNAME MATCH] Found ${bloomerangOnlyGroups.length} Bloomerang-only groups`);

    // Use standard CSV headers (no NameScore column needed)
    const headerRow = CSV_HEADERS.map(h => csvEscape(h)).join(',');

    // First pass: collect all groups with their matches and metadata
    const groupsWithMatchData = [];
    let totalMatches = 0;

    for (const group of bloomerangOnlyGroups) {
        // Extract last names and first names from group members
        const groupLastNames = extractGroupLastNames(group, entityDb);
        const groupFirstNames = extractGroupFirstNames(group, entityDb);

        if (groupLastNames.size === 0) continue;

        // Find VA entities with matching last names (also checking first names)
        const matches = findVAEntitiesByLastName(vaEntities, groupLastNames, groupFirstNames);

        if (matches.length === 0) continue;

        // Sort matches: first+last name matches first, then last-name-only
        matches.sort((a, b) => {
            if (a.hasFirstNameMatch && !b.hasFirstNameMatch) return -1;
            if (!a.hasFirstNameMatch && b.hasFirstNameMatch) return 1;
            return 0;  // Maintain relative order otherwise
        });

        // Check if this group has any first+last matches
        const hasAnyFirstNameMatch = matches.some(m => m.hasFirstNameMatch);

        // Determine if this is a single-member group
        const memberCount = (group.memberKeys || []).length;
        const isSingleMember = memberCount === 1;

        // For single-member groups, use the actual entity with its key
        // For multi-member groups, use the consensus entity
        let rowEntity;
        let rowKey;
        let rowType;

        if (isSingleMember) {
            // Single member: use the founding member entity and its key
            rowKey = group.foundingMemberKey;
            rowEntity = entityDb.entities[rowKey];
            rowType = 'member';  // Use 'member' so the key is included in output
        } else {
            // Multi-member: use consensus entity (no key)
            rowEntity = group.consensusEntity || entityDb.entities[group.foundingMemberKey];
            rowKey = '';
            rowType = 'consensus';
        }

        groupsWithMatchData.push({
            group,
            matches,
            hasAnyFirstNameMatch,
            isSingleMember,
            rowEntity,
            rowKey,
            rowType
        });

        totalMatches += matches.length;
    }

    // Sort groups: those with first+last matches first, then by group index within each category
    groupsWithMatchData.sort((a, b) => {
        // First sort by hasAnyFirstNameMatch (true first)
        if (a.hasAnyFirstNameMatch && !b.hasAnyFirstNameMatch) return -1;
        if (!a.hasAnyFirstNameMatch && b.hasAnyFirstNameMatch) return 1;
        // Within same category, sort by group index
        return a.group.index - b.group.index;
    });

    // Second pass: generate rows in sorted order
    const rows = [];
    let groupsWithFirstNameMatches = 0;

    for (const data of groupsWithMatchData) {
        if (data.hasAnyFirstNameMatch) {
            groupsWithFirstNameMatches++;
        }

        if (data.rowEntity) {
            // For single-member groups, use "SINGLE" as the group index
            const groupIndexValue = data.isSingleMember ? 'SINGLE' : data.group.index;
            rows.push(generateCSVRow(data.rowType, data.rowEntity, data.rowKey, groupIndexValue, true));
        }

        // VA match rows (already sorted: first+last first, then last-only)
        for (const match of data.matches) {
            // Mark with "*" if this VA entity is already assigned to an entity group
            const assignedMarker = groupDatabase.isEntityAssigned(match.key) ? '*' : '';
            rows.push(generateCSVRow('candidate', match.entity, match.key, assignedMarker, false));
        }
    }

    // Build CSV
    const dataRows = rows.map(row => row.map(v => csvEscape(v)).join(','));
    const csv = [headerRow, ...dataRows].join('\n');

    return {
        csv,
        stats: {
            totalGroups: allGroups.length,
            bloomerangOnlyGroups: bloomerangOnlyGroups.length,
            groupsWithMatches: groupsWithMatchData.length,
            groupsWithFirstNameMatches,
            totalMatches,
            rowCount: rows.length
        }
    };
}

/**
 * Download Bloomerang Last Name Match Report
 */
async function downloadBloomerangLastNameMatches() {
    const db = entityGroupBrowser.loadedDatabase || window.entityGroupDatabase;
    if (!db) {
        console.error('Please load an EntityGroup database first');
        showEntityGroupStatus('Please load an EntityGroup database first', 'error');
        return;
    }

    if (!window.unifiedEntityDatabase || !window.unifiedEntityDatabase.entities) {
        console.error('Please load the Unified Entity Database first');
        showEntityGroupStatus('Please load the Unified Entity Database first', 'error');
        return;
    }

    try {
        console.log('Generating Bloomerang Last Name Match Report...');
        showEntityGroupStatus('Generating Bloomerang Last Name Match Report...', 'loading');

        const result = exportBloomerangLastNameMatches(db);
        const dateStr = new Date().toISOString().slice(0, 10);

        // Download CSV
        const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `bloomerang_lastname_matches_${dateStr}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        const statusMsg = `Bloomerang Name Matches: ${result.stats.groupsWithMatches} groups with matches ` +
            `(${result.stats.groupsWithFirstNameMatches} with first+last), ` +
            `${result.stats.totalMatches} VA matches, ${result.stats.rowCount} total rows`;

        console.log(statusMsg);
        console.log('Full stats:', result.stats);
        showEntityGroupStatus(statusMsg, 'success');

        return result.stats;

    } catch (error) {
        console.error('Bloomerang last name match export error:', error);
        showEntityGroupStatus(`Export error: ${error.message}`, 'error');
    }
}

/**
 * Run Bloomerang Last Name Match Export - auto-loads databases if needed
 */
async function runBloomerangLastNameMatchExport() {
    try {
        // Load unified entity database if needed
        if (!window.unifiedEntityDatabase || !window.unifiedEntityDatabase.entities) {
            showEntityGroupStatus('Loading Unified Entity Database...', 'loading');
            await loadUnifiedDatabaseForEntityGroups();

            if (!window.unifiedEntityDatabase || !window.unifiedEntityDatabase.entities) {
                showEntityGroupStatus('Failed to load Unified Entity Database', 'error');
                return;
            }
        }

        // Load EntityGroup database if needed
        let db = entityGroupBrowser.loadedDatabase || window.entityGroupDatabase;
        if (!db) {
            showEntityGroupStatus('Loading EntityGroup database...', 'loading');
            await loadEntityGroupDatabase();

            db = entityGroupBrowser.loadedDatabase || window.entityGroupDatabase;
            if (!db) {
                showEntityGroupStatus('Failed to load EntityGroup database', 'error');
                return;
            }
        }

        // Run export
        await downloadBloomerangLastNameMatches();

    } catch (error) {
        console.error('Bloomerang last name match error:', error);
        showEntityGroupStatus(`Error: ${error.message}`, 'error');
    }
}

// Export for global access
window.exportBloomerangLastNameMatches = exportBloomerangLastNameMatches;
window.downloadBloomerangLastNameMatches = downloadBloomerangLastNameMatches;
window.runBloomerangLastNameMatchExport = runBloomerangLastNameMatchExport;

// Make utilities available globally for other scripts
window.CSV_HEADERS = CSV_HEADERS;
window.csvEscape = csvEscape;
window.cleanVATags = cleanVATags;
window.assembleMailName = assembleMailName;
window.extractAddressComponents = extractAddressComponents;
window.formatFullAddress = formatFullAddress;
window.generateCSVRow = generateCSVRow;
window.generateEntityGroupRows = generateEntityGroupRows;
window.extractAllNamesFromEntity = extractAllNamesFromEntity;
window.extractGroupLastNames = extractGroupLastNames;
window.extractGroupFirstNames = extractGroupFirstNames;
