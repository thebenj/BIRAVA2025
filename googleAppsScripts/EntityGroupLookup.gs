/**
 * EntityGroup Lookup - Google Apps Script
 *
 * Provides functions for looking up EntityGroups by entity key and outputting
 * CSV report rows (54-column format) to Google Sheets.
 *
 * SETUP:
 * 1. In Google Sheets: Extensions > Apps Script > paste this code
 * 2. Run initializeAllDatabases() once to load data
 * 3. Enter entity keys in column A
 * 4. Run lookupAllEntities() or use menu: Entity Lookup > Lookup All Keys
 *
 * OUTPUT:
 * - Column A: Input entity key
 * - Column B: Empty (spacer)
 * - Column C onwards: CSV data rows (54 columns per reference_csvExportSpecification.md)
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

// CONFIG object - populated from "parameters" sheet by loadConfigFromSheet()
const CONFIG = {
  VISION_APPRAISAL_1_FILE_ID: '',   // B1: FireNumber < 800
  VISION_APPRAISAL_2_FILE_ID: '',   // B2: FireNumber >= 800
  BLOOMERANG_FILE_ID: '',           // B3: Bloomerang entities
  ENTITYGROUP_DATABASE_FILE_ID: '', // B4: EntityGroup database
  ENTITYGROUP_REFERENCE_FILE_ID: '' // B5: EntityGroup reference
};

/**
 * Load CONFIG values from the "parameters" sheet.
 * Reads file IDs from cells B1-B5.
 * @returns {boolean} true if config loaded successfully
 */
function loadConfigFromSheet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paramSheet = ss.getSheetByName('parameters');

    if (!paramSheet) {
      Logger.log('WARNING: "parameters" sheet not found. CONFIG not loaded.');
      return false;
    }

    // Read B1:B5 in one call for efficiency
    const values = paramSheet.getRange('B1:B5').getValues();

    CONFIG.VISION_APPRAISAL_1_FILE_ID = String(values[0][0] || '').trim();
    CONFIG.VISION_APPRAISAL_2_FILE_ID = String(values[1][0] || '').trim();
    CONFIG.BLOOMERANG_FILE_ID = String(values[2][0] || '').trim();
    CONFIG.ENTITYGROUP_DATABASE_FILE_ID = String(values[3][0] || '').trim();
    CONFIG.ENTITYGROUP_REFERENCE_FILE_ID = String(values[4][0] || '').trim();

    Logger.log('CONFIG loaded from parameters sheet:');
    Logger.log('  VA Part 1: ' + (CONFIG.VISION_APPRAISAL_1_FILE_ID ? 'Set' : 'Empty'));
    Logger.log('  VA Part 2: ' + (CONFIG.VISION_APPRAISAL_2_FILE_ID ? 'Set' : 'Empty'));
    Logger.log('  Bloomerang: ' + (CONFIG.BLOOMERANG_FILE_ID ? 'Set' : 'Empty'));
    Logger.log('  EntityGroup DB: ' + (CONFIG.ENTITYGROUP_DATABASE_FILE_ID ? 'Set' : 'Empty'));
    Logger.log('  EntityGroup Ref: ' + (CONFIG.ENTITYGROUP_REFERENCE_FILE_ID ? 'Set' : 'Empty'));

    return true;
  } catch (e) {
    Logger.log('ERROR loading config from sheet: ' + e.message);
    return false;
  }
}

// =============================================================================
// CSV COLUMN HEADERS (54 columns per spec)
// =============================================================================

const CSV_HEADERS = [
  // Section 1: Identification & Mail Merge Core (10 columns)
  'RowType', 'GroupIndex', 'Key', 'MailName', 'MailAddr1', 'MailAddr2',
  'MailCity', 'MailState', 'MailZip', 'Email',
  // Section 2: Additional Contact Info (6 columns)
  'Phone', 'POBox', 'SecAddr1', 'SecAddr2', 'SecAddr3', 'SecAddrMore',
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

// =============================================================================
// CACHE MANAGEMENT
// =============================================================================

let entityCache = null;           // Combined entity database (VA + Bloomerang)
let entityGroupCache = null;      // Full EntityGroup database
let entityToGroupIndex = null;    // Lookup: entity key -> array of group indices

/**
 * Initialize all databases (entities + groups).
 * Call this once before using lookup functions.
 */
function initializeAllDatabases() {
  Logger.log('=== Initializing All Databases ===');

  // Ensure CONFIG is loaded from parameters sheet
  loadConfigFromSheet();

  // Load entity databases
  initializeEntityDatabase();

  // Load EntityGroup database
  initializeEntityGroupDatabase();

  // Build lookup index
  buildEntityToGroupIndex();

  Logger.log('=== Initialization Complete ===');
  Logger.log('Entities loaded: ' + Object.keys(entityCache || {}).length);
  Logger.log('Groups loaded: ' + Object.keys(entityGroupCache?.groups || {}).length);
  Logger.log('Index entries: ' + Object.keys(entityToGroupIndex || {}).length);

  return {
    entityCount: Object.keys(entityCache || {}).length,
    groupCount: Object.keys(entityGroupCache?.groups || {}).length,
    indexEntries: Object.keys(entityToGroupIndex || {}).length
  };
}

/**
 * Initialize entity database by loading all split files (VA Part 1, VA Part 2, Bloomerang).
 */
function initializeEntityDatabase() {
  entityCache = {};
  let va1Count = 0;
  let va2Count = 0;
  let bloomerangCount = 0;

  // Load VisionAppraisal Part 1 (FireNumber < 800)
  if (CONFIG.VISION_APPRAISAL_1_FILE_ID) {
    try {
      Logger.log('Loading VisionAppraisal Part 1 (FireNumber < 800)...');
      const va1Data = loadDatabaseFile(CONFIG.VISION_APPRAISAL_1_FILE_ID);
      if (va1Data && va1Data.entities) {
        for (const key in va1Data.entities) {
          entityCache[key] = va1Data.entities[key];
          va1Count++;
        }
        Logger.log('Loaded ' + va1Count + ' VisionAppraisal Part 1 entities');
      }
    } catch (e) {
      Logger.log('Error loading VisionAppraisal Part 1: ' + e.message);
    }
  }

  // Load VisionAppraisal Part 2 (FireNumber >= 800)
  if (CONFIG.VISION_APPRAISAL_2_FILE_ID) {
    try {
      Logger.log('Loading VisionAppraisal Part 2 (FireNumber >= 800)...');
      const va2Data = loadDatabaseFile(CONFIG.VISION_APPRAISAL_2_FILE_ID);
      if (va2Data && va2Data.entities) {
        for (const key in va2Data.entities) {
          entityCache[key] = va2Data.entities[key];
          va2Count++;
        }
        Logger.log('Loaded ' + va2Count + ' VisionAppraisal Part 2 entities');
      }
    } catch (e) {
      Logger.log('Error loading VisionAppraisal Part 2: ' + e.message);
    }
  }

  // Load Bloomerang database
  if (CONFIG.BLOOMERANG_FILE_ID) {
    try {
      Logger.log('Loading Bloomerang database...');
      const bloomerangData = loadDatabaseFile(CONFIG.BLOOMERANG_FILE_ID);
      if (bloomerangData && bloomerangData.entities) {
        for (const key in bloomerangData.entities) {
          entityCache[key] = bloomerangData.entities[key];
          bloomerangCount++;
        }
        Logger.log('Loaded ' + bloomerangCount + ' Bloomerang entities');
      }
    } catch (e) {
      Logger.log('Error loading Bloomerang: ' + e.message);
    }
  }

  const totalCount = va1Count + va2Count + bloomerangCount;
  Logger.log('Total entities: ' + totalCount + ' (VA1: ' + va1Count + ', VA2: ' + va2Count + ', Bloomerang: ' + bloomerangCount + ')');
}

/**
 * Initialize EntityGroup database.
 */
function initializeEntityGroupDatabase() {
  if (!CONFIG.ENTITYGROUP_DATABASE_FILE_ID) {
    throw new Error('EntityGroup database file ID not configured');
  }

  Logger.log('Loading EntityGroup database...');
  entityGroupCache = loadDatabaseFile(CONFIG.ENTITYGROUP_DATABASE_FILE_ID);

  const groupCount = Object.keys(entityGroupCache?.groups || {}).length;
  Logger.log('Loaded ' + groupCount + ' EntityGroups');
}

/**
 * Build lookup index: entity key -> array of group indices.
 * An entity can appear as founding member, member, or near miss.
 */
function buildEntityToGroupIndex() {
  entityToGroupIndex = {};

  if (!entityGroupCache || !entityGroupCache.groups) {
    Logger.log('Warning: No groups to index');
    return;
  }

  const groups = entityGroupCache.groups;
  let indexCount = 0;

  for (const groupKey in groups) {
    const group = groups[groupKey];
    const groupIndex = group.index;

    // Index founding member
    if (group.foundingMemberKey) {
      addToIndex(group.foundingMemberKey, groupIndex, 'founding');
      indexCount++;
    }

    // Index all members
    if (group.memberKeys && Array.isArray(group.memberKeys)) {
      for (const memberKey of group.memberKeys) {
        if (memberKey !== group.foundingMemberKey) {
          addToIndex(memberKey, groupIndex, 'member');
          indexCount++;
        }
      }
    }

    // Index near misses
    if (group.nearMissKeys && Array.isArray(group.nearMissKeys)) {
      for (const nearMissKey of group.nearMissKeys) {
        addToIndex(nearMissKey, groupIndex, 'nearmiss');
        indexCount++;
      }
    }
  }

  Logger.log('Built index with ' + indexCount + ' entries for ' +
             Object.keys(entityToGroupIndex).length + ' unique keys');
}

/**
 * Add an entity key to the lookup index.
 */
function addToIndex(entityKey, groupIndex, role) {
  if (!entityToGroupIndex[entityKey]) {
    entityToGroupIndex[entityKey] = [];
  }
  entityToGroupIndex[entityKey].push({ groupIndex: groupIndex, role: role });
}

/**
 * Load a database file from Google Drive.
 */
function loadDatabaseFile(fileId) {
  const file = DriveApp.getFileById(fileId);
  const content = file.getBlob().getDataAsString();

  let data = JSON.parse(content);

  // If data uses serialization wrapper, unwrap it
  if (data.__serialized) {
    data = deserializeSimple(data);
  }

  return data;
}

/**
 * Simple deserializer for the type-wrapped format.
 */
function deserializeSimple(obj) {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => deserializeSimple(item));
  }

  if (typeof obj === 'object') {
    // Handle serialized object with __type
    if (obj.__type && obj.__data !== undefined) {
      // For Maps, convert to plain object
      if (obj.__type === 'Map' && Array.isArray(obj.__data)) {
        const result = {};
        for (const [key, value] of obj.__data) {
          result[key] = deserializeSimple(value);
        }
        return result;
      }
      // For other types, preserve __type for entity type detection, but unwrap __data
      const unwrapped = deserializeSimple(obj.__data);
      if (typeof unwrapped === 'object' && unwrapped !== null) {
        unwrapped.__type = obj.__type;
      }
      return unwrapped;
    }

    // Regular object - recurse into properties
    const result = {};
    for (const key in obj) {
      result[key] = deserializeSimple(obj[key]);
    }
    return result;
  }

  return obj;
}

// =============================================================================
// CSV HELPER FUNCTIONS (ported from entityGroupBrowser.js)
// =============================================================================

/**
 * Clean VisionAppraisal tags from text.
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
 * Get entity by database key.
 */
function getEntity(key) {
  if (!entityCache) return null;
  return entityCache[key] || null;
}

/**
 * Assemble mailing name from entity based on entity type.
 */
function assembleMailName(entity) {
  if (!entity || !entity.name) return '';

  const entityType = entity.__type || '';

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
 * Extract address components from an Address object.
 */
function extractAddressComponents(address) {
  const result = { line1: '', line2: '', city: '', state: '', zip: '' };
  if (!address) return result;

  // Line 1: street address from primaryAlias or components
  if (address.primaryAlias && address.primaryAlias.term) {
    result.line1 = cleanVATags(address.primaryAlias.term);
  } else if (address.streetNumber || address.streetName) {
    const parts = [];
    if (address.streetNumber && address.streetNumber.term) parts.push(address.streetNumber.term);
    if (address.streetName && address.streetName.term) parts.push(address.streetName.term);
    if (address.streetType && address.streetType.term) parts.push(address.streetType.term);
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
  if (address.city && address.city.term) result.city = cleanVATags(address.city.term);
  if (address.state && address.state.term) result.state = cleanVATags(address.state.term);
  if (address.zipCode && address.zipCode.term) result.zip = cleanVATags(address.zipCode.term);

  return result;
}

/**
 * Format a full address as a single string.
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
 * Extract alternatives from an Aliased object.
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
  return items.map(function(item) {
    if (item && item.term) return cleanVATags(item.term);
    if (typeof item === 'string') return cleanVATags(item);
    return '';
  }).filter(function(t) { return t; });
}

/**
 * Build alternative columns (first 3 individual, rest pipe-delimited in 4th).
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
 * Get entity type string.
 */
function getEntityTypeString(entity) {
  if (!entity) return '';
  return entity.__type || 'Unknown';
}

/**
 * Get source string for an entity.
 */
function getEntitySource(entity, key) {
  if (key) {
    if (key.indexOf('visionAppraisal:') === 0) return 'visionAppraisal';
    if (key.indexOf('bloomerang:') === 0) return 'bloomerang';
  }
  return 'unknown';
}

/**
 * Get email from entity.
 */
function getEntityEmail(entity) {
  if (!entity || !entity.contactInfo || !entity.contactInfo.email) return '';
  const email = entity.contactInfo.email;
  if (email.primaryAlias && email.primaryAlias.term) return cleanVATags(email.primaryAlias.term);
  if (email.term) return cleanVATags(email.term);
  return '';
}

/**
 * Get phone from entity.
 */
function getEntityPhone(entity) {
  if (!entity || !entity.contactInfo || !entity.contactInfo.phone) return '';
  const phone = entity.contactInfo.phone;
  if (phone.primaryAlias && phone.primaryAlias.term) return cleanVATags(phone.primaryAlias.term);
  if (phone.term) return cleanVATags(phone.term);
  return '';
}

/**
 * Get PO Box from entity.
 */
function getEntityPOBox(entity) {
  if (!entity || !entity.contactInfo || !entity.contactInfo.poBox) return '';
  const poBox = entity.contactInfo.poBox;
  if (poBox.primaryAlias && poBox.primaryAlias.term) return cleanVATags(poBox.primaryAlias.term);
  if (poBox.term) return cleanVATags(poBox.term);
  return '';
}

/**
 * Get secondary addresses from entity.
 */
function getSecondaryAddresses(entity) {
  if (!entity || !entity.contactInfo || !entity.contactInfo.secondaryAddress) return [];
  const secondaries = entity.contactInfo.secondaryAddress;
  if (!Array.isArray(secondaries)) return [];
  return secondaries.map(function(addr) { return formatFullAddress(addr); }).filter(function(a) { return a; });
}

/**
 * Build secondary address columns (first 3 individual, rest pipe-delimited in 4th).
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

// =============================================================================
// CSV ROW GENERATION
// =============================================================================

/**
 * Generate a CSV row for an entity (54 columns).
 * @param {string} rowType - 'consensus', 'founding', 'member', or 'nearmiss'
 * @param {Object} entity - Entity object
 * @param {string} key - Entity database key (empty for consensus)
 * @param {number|string} groupIndex - Group index
 * @param {boolean} includeAlternatives - Whether to populate alternatives columns
 * @returns {Array<string>} Array of 54 column values
 */
function generateCSVRow(rowType, entity, key, groupIndex, includeAlternatives) {
  const row = [];
  for (var i = 0; i < 54; i++) row.push('');

  // Section 1: Identification & Mail Merge Core
  row[0] = rowType;                                    // RowType
  row[1] = (rowType === 'consensus' || rowType === 'founding') ? String(groupIndex) : ''; // GroupIndex
  row[2] = (rowType === 'consensus') ? '' : key;       // Key
  row[3] = assembleMailName(entity);                   // MailName

  // Primary address components
  var primaryAddr = entity && entity.contactInfo ? entity.contactInfo.primaryAddress : null;
  var addrComp = extractAddressComponents(primaryAddr);
  row[4] = addrComp.line1;                             // MailAddr1
  row[5] = addrComp.line2;                             // MailAddr2
  row[6] = addrComp.city;                              // MailCity
  row[7] = addrComp.state;                             // MailState
  row[8] = addrComp.zip;                               // MailZip
  row[9] = getEntityEmail(entity);                     // Email

  // Section 2: Additional Contact Info
  row[10] = getEntityPhone(entity);                    // Phone
  row[11] = getEntityPOBox(entity);                    // POBox

  // Secondary addresses
  var secAddrs = getSecondaryAddresses(entity);
  var secAddrCols = buildSecondaryAddressColumns(secAddrs);
  row[12] = secAddrCols[0];                            // SecAddr1
  row[13] = secAddrCols[1];                            // SecAddr2
  row[14] = secAddrCols[2];                            // SecAddr3
  row[15] = secAddrCols[3];                            // SecAddrMore

  // Section 3: Entity Metadata
  row[16] = getEntityTypeString(entity);               // EntityType
  row[17] = (rowType === 'consensus') ? 'consensus' : getEntitySource(entity, key); // Source

  // Sections 4-6: Alternatives (only for consensus row)
  if (includeAlternatives && entity) {
    // Name alternatives (columns 18-29)
    var nameHom = extractAlternatives(entity.name, 'homonyms');
    var nameSyn = extractAlternatives(entity.name, 'synonyms');
    var nameCand = extractAlternatives(entity.name, 'candidates');

    var nameHomCols = buildAlternativeColumns(nameHom);
    row[18] = nameHomCols[0]; row[19] = nameHomCols[1]; row[20] = nameHomCols[2]; row[21] = nameHomCols[3];

    var nameSynCols = buildAlternativeColumns(nameSyn);
    row[22] = nameSynCols[0]; row[23] = nameSynCols[1]; row[24] = nameSynCols[2]; row[25] = nameSynCols[3];

    var nameCandCols = buildAlternativeColumns(nameCand);
    row[26] = nameCandCols[0]; row[27] = nameCandCols[1]; row[28] = nameCandCols[2]; row[29] = nameCandCols[3];

    // Address alternatives (columns 30-41)
    var addrHom = extractAlternatives(primaryAddr, 'homonyms');
    var addrSyn = extractAlternatives(primaryAddr, 'synonyms');
    var addrCand = extractAlternatives(primaryAddr, 'candidates');

    var addrHomCols = buildAlternativeColumns(addrHom);
    row[30] = addrHomCols[0]; row[31] = addrHomCols[1]; row[32] = addrHomCols[2]; row[33] = addrHomCols[3];

    var addrSynCols = buildAlternativeColumns(addrSyn);
    row[34] = addrSynCols[0]; row[35] = addrSynCols[1]; row[36] = addrSynCols[2]; row[37] = addrSynCols[3];

    var addrCandCols = buildAlternativeColumns(addrCand);
    row[38] = addrCandCols[0]; row[39] = addrCandCols[1]; row[40] = addrCandCols[2]; row[41] = addrCandCols[3];

    // Email alternatives (columns 42-53)
    var emailObj = entity && entity.contactInfo ? entity.contactInfo.email : null;
    var emailHom = extractAlternatives(emailObj, 'homonyms');
    var emailSyn = extractAlternatives(emailObj, 'synonyms');
    var emailCand = extractAlternatives(emailObj, 'candidates');

    var emailHomCols = buildAlternativeColumns(emailHom);
    row[42] = emailHomCols[0]; row[43] = emailHomCols[1]; row[44] = emailHomCols[2]; row[45] = emailHomCols[3];

    var emailSynCols = buildAlternativeColumns(emailSyn);
    row[46] = emailSynCols[0]; row[47] = emailSynCols[1]; row[48] = emailSynCols[2]; row[49] = emailSynCols[3];

    var emailCandCols = buildAlternativeColumns(emailCand);
    row[50] = emailCandCols[0]; row[51] = emailCandCols[1]; row[52] = emailCandCols[2]; row[53] = emailCandCols[3];
  }

  return row;
}

/**
 * Generate all CSV rows for a single EntityGroup.
 * @param {Object} group - EntityGroup object
 * @param {boolean} includeNearMisses - Whether to include near miss rows
 * @returns {Array<Array<string>>} Array of row arrays
 */
function generateEntityGroupRows(group, includeNearMisses) {
  const rows = [];

  // 1. Consensus row (use consensus entity or founding member)
  const consensusEntity = group.consensusEntity || getEntity(group.foundingMemberKey);
  if (consensusEntity) {
    rows.push(generateCSVRow('consensus', consensusEntity, '', group.index, true));
  }

  // 2. Founding member row
  const foundingEntity = getEntity(group.foundingMemberKey);
  if (foundingEntity) {
    rows.push(generateCSVRow('founding', foundingEntity, group.foundingMemberKey, group.index, false));
  }

  // 3. Other member rows (excluding founding member)
  if (group.memberKeys && group.memberKeys.length > 1) {
    for (var i = 0; i < group.memberKeys.length; i++) {
      var memberKey = group.memberKeys[i];
      if (memberKey !== group.foundingMemberKey) {
        var memberEntity = getEntity(memberKey);
        if (memberEntity) {
          rows.push(generateCSVRow('member', memberEntity, memberKey, '', false));
        }
      }
    }
  }

  // 4. Near miss rows (if enabled)
  if (includeNearMisses && group.nearMissKeys && group.nearMissKeys.length > 0) {
    for (var j = 0; j < group.nearMissKeys.length; j++) {
      var nearMissKey = group.nearMissKeys[j];
      var nearMissEntity = getEntity(nearMissKey);
      if (nearMissEntity) {
        rows.push(generateCSVRow('nearmiss', nearMissEntity, nearMissKey, '', false));
      }
    }
  }

  return rows;
}

// =============================================================================
// GROUP LOOKUP BY ENTITY KEY
// =============================================================================

/**
 * Find all EntityGroups containing a given entity key.
 * @param {string} entityKey - Entity database key
 * @returns {Array<Object>} Array of {group, role} objects
 */
function findGroupsForEntity(entityKey) {
  if (!entityToGroupIndex || !entityToGroupIndex[entityKey]) {
    return [];
  }

  const results = [];
  const indexEntries = entityToGroupIndex[entityKey];

  for (var i = 0; i < indexEntries.length; i++) {
    var entry = indexEntries[i];
    var group = getGroupByIndex(entry.groupIndex);
    if (group) {
      results.push({ group: group, role: entry.role });
    }
  }

  return results;
}

/**
 * Get EntityGroup by index.
 */
function getGroupByIndex(groupIndex) {
  if (!entityGroupCache || !entityGroupCache.groups) return null;

  // Groups are stored with composite keys like "{index}||{foundingMemberKey}"
  // We need to find the group with matching index
  const groups = entityGroupCache.groups;
  for (const groupKey in groups) {
    if (groups[groupKey].index === groupIndex) {
      return groups[groupKey];
    }
  }
  return null;
}

/**
 * Generate CSV rows for all groups containing an entity.
 * @param {string} entityKey - Entity database key
 * @param {boolean} includeNearMisses - Include near miss rows
 * @returns {Array<Array<string>>} All CSV rows for matching groups
 */
function generateRowsForEntityKey(entityKey, includeNearMisses) {
  const groupResults = findGroupsForEntity(entityKey);

  if (groupResults.length === 0) {
    // Return a single row indicating not found
    const notFoundRow = [];
    for (var i = 0; i < 54; i++) notFoundRow.push('');
    notFoundRow[0] = 'NOT_FOUND';
    notFoundRow[2] = entityKey;
    return [notFoundRow];
  }

  const allRows = [];

  // Track which groups we've already output to avoid duplicates
  const outputGroupIndices = {};

  for (var j = 0; j < groupResults.length; j++) {
    var result = groupResults[j];
    var group = result.group;

    // Skip if we already output this group
    if (outputGroupIndices[group.index]) continue;
    outputGroupIndices[group.index] = true;

    var groupRows = generateEntityGroupRows(group, includeNearMisses);
    for (var k = 0; k < groupRows.length; k++) {
      allRows.push(groupRows[k]);
    }
  }

  return allRows;
}

// =============================================================================
// SHEET OUTPUT FUNCTIONS
// =============================================================================

/**
 * Look up all entity keys in column A and output CSV rows starting at column C.
 * Each input key produces multiple output rows (consensus, founding, members, near misses).
 * Output rows are written sequentially, with empty rows separating different input keys.
 */
function lookupAllEntities() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const ui = SpreadsheetApp.getUi();

  // Ensure databases are loaded
  if (!entityCache || !entityGroupCache || !entityToGroupIndex) {
    ui.alert('Initializing databases... This may take up to 60 seconds.');
    initializeAllDatabases();
  }

  // Get all values in column A
  const lastRow = sheet.getLastRow();
  if (lastRow < 1) {
    ui.alert('No data in column A');
    return;
  }

  const entityKeys = sheet.getRange(1, 1, lastRow, 1).getValues();

  // Collect all output rows first, then write in batch
  const allOutputRows = [];
  let processedCount = 0;
  let foundCount = 0;

  for (var i = 0; i < entityKeys.length; i++) {
    var entityKey = entityKeys[i][0];
    if (!entityKey || entityKey === '') continue;

    entityKey = String(entityKey).trim();
    processedCount++;

    // Generate CSV rows for this entity
    var csvRows = generateRowsForEntityKey(entityKey, true);

    if (csvRows.length > 0 && csvRows[0][0] !== 'NOT_FOUND') {
      foundCount++;
    }

    // Add all rows for this entity to output
    for (var j = 0; j < csvRows.length; j++) {
      allOutputRows.push(csvRows[j]);
    }

    // Add a blank separator row between different input keys
    if (i < entityKeys.length - 1) {
      var blankRow = [];
      for (var k = 0; k < 54; k++) blankRow.push('');
      allOutputRows.push(blankRow);
    }
  }

  // Write all rows at once starting at C1
  if (allOutputRows.length > 0) {
    sheet.getRange(1, 3, allOutputRows.length, 54).setValues(allOutputRows);
  }

  ui.alert('Lookup complete!\n\nProcessed: ' + processedCount + ' keys\nFound in groups: ' + foundCount + '\nTotal rows output: ' + allOutputRows.length);
}

/**
 * Look up a single entity key from the current selection in column A.
 * Writes all output rows (multiple per group) starting at column C on the same row.
 */
function lookupSelectedEntity() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const ui = SpreadsheetApp.getUi();
  const selection = sheet.getActiveCell();

  // Ensure databases are loaded
  if (!entityCache || !entityGroupCache || !entityToGroupIndex) {
    ui.alert('Initializing databases... This may take up to 60 seconds.');
    initializeAllDatabases();
  }

  // Get the entity key from the selected cell (should be in column A)
  const selectedRow = selection.getRow();
  const entityKey = sheet.getRange(selectedRow, 1).getValue();

  if (!entityKey || entityKey === '') {
    ui.alert('No entity key in column A of the selected row');
    return;
  }

  const key = String(entityKey).trim();

  // Generate CSV rows for this entity
  const csvRows = generateRowsForEntityKey(key, true);

  if (csvRows.length === 0) {
    ui.alert('No results for key: ' + key);
    return;
  }

  // Write all rows starting at the selected row, column C
  sheet.getRange(selectedRow, 3, csvRows.length, 54).setValues(csvRows);

  const rowType = csvRows[0][0];
  if (rowType === 'NOT_FOUND') {
    ui.alert('Entity not found in any group: ' + key);
  } else {
    ui.alert('Found! Wrote ' + csvRows.length + ' rows for group containing: ' + key);
  }
}

/**
 * Custom function to look up an entity and return ALL rows for its group(s).
 * Use this in a cell: =LOOKUP_ENTITY_GROUP("visionAppraisal:FireNumber:123")
 * The output will span multiple rows automatically.
 *
 * @param {string} entityKey - Entity database key
 * @returns {Array<Array<string>>} All CSV rows for the group(s)
 * @customfunction
 */
function LOOKUP_ENTITY_GROUP(entityKey) {
  if (!entityKey) return [['']];

  // Ensure databases are loaded
  if (!entityCache || !entityGroupCache || !entityToGroupIndex) {
    try {
      initializeAllDatabases();
    } catch (e) {
      return [['ERROR: ' + e.message]];
    }
  }

  entityKey = String(entityKey).trim();
  const csvRows = generateRowsForEntityKey(entityKey, true);

  // Return ALL rows - custom functions can return 2D arrays that span multiple rows
  if (csvRows.length > 0) {
    return csvRows;
  }

  return [['NOT_FOUND']];
}

/**
 * Write CSV headers to row 1 starting at column C.
 */
function writeCSVHeaders() {
  const sheet = SpreadsheetApp.getActiveSheet();
  sheet.getRange(1, 3, 1, 54).setValues([CSV_HEADERS]);
  SpreadsheetApp.getUi().alert('Headers written to row 1, columns C-BD');
}

/**
 * Clear all output (columns C onwards).
 */
function clearOutput() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastCol >= 3 && lastRow >= 1) {
    sheet.getRange(1, 3, lastRow, lastCol - 2).clear();
  }

  SpreadsheetApp.getUi().alert('Output cleared');
}

// =============================================================================
// MENU AND UI
// =============================================================================

/**
 * Create custom menu when spreadsheet opens.
 * Also loads CONFIG from "parameters" sheet.
 */
function onOpen() {
  // Load file IDs from parameters sheet
  loadConfigFromSheet();

  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Entity Lookup')
    .addItem('Initialize All Databases', 'initializeAllDatabases')
    .addItem('Reload Config from Parameters', 'loadConfigFromSheet')
    .addSeparator()
    .addItem('Lookup Selected Key', 'lookupSelectedEntity')
    .addItem('Lookup All Keys (Column A)', 'lookupAllEntities')
    .addSeparator()
    .addItem('Write CSV Headers', 'writeCSVHeaders')
    .addItem('Clear Output', 'clearOutput')
    .addSeparator()
    .addItem('Show Database Status', 'showDatabaseStatus')
    .addToUi();
}

/**
 * Show current database status.
 */
function showDatabaseStatus() {
  const ui = SpreadsheetApp.getUi();

  let status = 'Database Status:\n\n';

  if (entityCache) {
    status += 'Entities loaded: ' + Object.keys(entityCache).length + '\n';
  } else {
    status += 'Entity database: NOT LOADED\n';
  }

  if (entityGroupCache) {
    var groupCount = Object.keys(entityGroupCache.groups || {}).length;
    status += 'EntityGroups loaded: ' + groupCount + '\n';
  } else {
    status += 'EntityGroup database: NOT LOADED\n';
  }

  if (entityToGroupIndex) {
    status += 'Index entries: ' + Object.keys(entityToGroupIndex).length + '\n';
  } else {
    status += 'Lookup index: NOT BUILT\n';
  }

  status += '\nFile IDs configured:\n';
  status += 'VA Part 1: ' + (CONFIG.VISION_APPRAISAL_1_FILE_ID ? 'Yes' : 'No') + '\n';
  status += 'VA Part 2: ' + (CONFIG.VISION_APPRAISAL_2_FILE_ID ? 'Yes' : 'No') + '\n';
  status += 'Bloomerang: ' + (CONFIG.BLOOMERANG_FILE_ID ? 'Yes' : 'No') + '\n';
  status += 'EntityGroup DB: ' + (CONFIG.ENTITYGROUP_DATABASE_FILE_ID ? 'Yes' : 'No') + '\n';

  ui.alert('Database Status', status, ui.ButtonSet.OK);
}

// =============================================================================
// TEST FUNCTIONS
// =============================================================================

/**
 * Test the lookup with a sample key.
 */
function testLookup() {
  Logger.log('=== Testing Entity Lookup ===');

  // Initialize if needed
  if (!entityCache || !entityGroupCache) {
    initializeAllDatabases();
  }

  // Get a sample entity key from the index
  const sampleKeys = Object.keys(entityToGroupIndex || {}).slice(0, 3);

  for (var i = 0; i < sampleKeys.length; i++) {
    var key = sampleKeys[i];
    Logger.log('\nLooking up: ' + key);

    var groups = findGroupsForEntity(key);
    Logger.log('Found in ' + groups.length + ' group(s)');

    for (var j = 0; j < groups.length; j++) {
      var result = groups[j];
      Logger.log('  Group ' + result.group.index + ' as ' + result.role);
    }

    var csvRows = generateRowsForEntityKey(key, false);
    Logger.log('Generated ' + csvRows.length + ' CSV rows');
  }

  Logger.log('\n=== Test Complete ===');
}

/**
 * Diagnostic function to debug why only one row is returned.
 * Run this from Apps Script editor and check the Logs.
 */
function debugLookup() {
  Logger.log('=== DEBUG LOOKUP ===');

  // Initialize if needed
  if (!entityCache || !entityGroupCache || !entityToGroupIndex) {
    Logger.log('Initializing databases...');
    initializeAllDatabases();
  }

  // Get a sample key that's in the index
  const sampleKey = Object.keys(entityToGroupIndex || {})[0];
  if (!sampleKey) {
    Logger.log('ERROR: No keys in entityToGroupIndex');
    return;
  }

  Logger.log('Sample key: ' + sampleKey);
  Logger.log('Entity cache has ' + Object.keys(entityCache || {}).length + ' entries');
  Logger.log('Group cache has ' + Object.keys(entityGroupCache?.groups || {}).length + ' groups');
  Logger.log('Index has ' + Object.keys(entityToGroupIndex || {}).length + ' entries');

  // Check if entity exists in cache
  const entity = getEntity(sampleKey);
  Logger.log('getEntity result: ' + (entity ? 'FOUND' : 'NULL'));

  // Find groups
  const indexEntries = entityToGroupIndex[sampleKey];
  Logger.log('Index entries for key: ' + JSON.stringify(indexEntries));

  if (indexEntries && indexEntries.length > 0) {
    const groupIndex = indexEntries[0].groupIndex;
    Logger.log('First group index: ' + groupIndex);

    const group = getGroupByIndex(groupIndex);
    Logger.log('Group found: ' + (group ? 'YES' : 'NO'));

    if (group) {
      Logger.log('Group.index: ' + group.index);
      Logger.log('Group.foundingMemberKey: ' + group.foundingMemberKey);
      Logger.log('Group.memberKeys: ' + JSON.stringify(group.memberKeys));
      Logger.log('Group.nearMissKeys: ' + JSON.stringify(group.nearMissKeys));
      Logger.log('Group.consensusEntity: ' + (group.consensusEntity ? 'EXISTS' : 'NULL'));

      // Check if we can get the founding member
      const foundingEntity = getEntity(group.foundingMemberKey);
      Logger.log('Founding entity lookup: ' + (foundingEntity ? 'FOUND' : 'NULL'));

      // Check member lookups
      if (group.memberKeys) {
        for (var i = 0; i < group.memberKeys.length; i++) {
          var mk = group.memberKeys[i];
          var me = getEntity(mk);
          Logger.log('Member ' + i + ' (' + mk + '): ' + (me ? 'FOUND' : 'NULL'));
        }
      }

      // Generate rows
      const rows = generateEntityGroupRows(group, true);
      Logger.log('Generated ' + rows.length + ' rows');
      for (var j = 0; j < rows.length; j++) {
        Logger.log('Row ' + j + ' type: ' + rows[j][0]);
      }
    }
  }

  Logger.log('=== DEBUG COMPLETE ===');
}
