/**
 * Load All Entities Button Function
 * Button-triggered function to load all entities from Google Drive into memory
 */

/**
 * Main function called by the "Load All Entities Into Memory" button
 * Loads dependencies, then loads all VisionAppraisal and Bloomerang entities
 */
async function loadAllEntitiesIntoMemory() {
    console.log('🚀 Loading All Entities Into Memory...');
    console.log('=====================================');

    try {
        // Step 1: Load required dependencies
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
            console.log(`  ✅ ${script}`);
        }

        // Step 2: Initialize global storage
        if (!window.workingLoadedEntities) {
            window.workingLoadedEntities = {
                visionAppraisal: { entities: null, metadata: null, loaded: false },
                bloomerang: { individuals: null, households: null, nonhuman: null, loaded: false },
                status: 'not_loaded'
            };
        }

        // Step 3: Load VisionAppraisal entities
        console.log('\n📊 Loading VisionAppraisal entities...');
        await loadVisionAppraisalEntitiesWorking();

        // Step 4: Load Bloomerang collections
        console.log('\n👥 Loading Bloomerang collections...');

        // CRITICAL: Get config file ID from input box (if available)
        // WARNING: If testing newly saved entities, you MUST manually enter the new config file ID
        // from the console output "✅ Entity Browser config saved: filename (ID: FILE_ID_HERE)"
        // into the config input box BEFORE clicking this button, otherwise old entity files will be loaded
        let configFileId = null;
        if (typeof getBloomerangConfigFileId === 'function') {
            try {
                configFileId = getBloomerangConfigFileId();
                if (configFileId) {
                    console.log('📄 Using config file ID from input:', configFileId);
                    console.log('🔍 TESTING NOTE: If this is a test, verify this is the NEW config file ID from recent processing');
                }
            } catch (error) {
                console.log('⚠️ No config file ID provided, using default folder search');
                console.log('🚨 WARNING: This will load OLD entity files, not newly saved ones!');
                configFileId = null;
            }
        }

        await loadBloomerangCollectionsWorking(configFileId);

        // Step 5: Set up enhanced name extraction
        window.extractNameWorking = function(entity) {
            try {
                // Use constructor.name for deserialized class instances (type property is intentionally excluded during deserialization)
                const entityType = entity.constructor?.name || entity.type;

                // For Individual entities: MUST have IndividualName with completeName
                if (entityType === 'Individual') {
                    if (!entity.name) {
                        console.error('DATA INTEGRITY ERROR: Individual entity missing name property', entity);
                        return { entityType: 'Individual', completeName: 'ERROR: Missing name property', error: true };
                    }
                    if (!entity.name.completeName) {
                        console.error('DATA INTEGRITY ERROR: Individual entity name missing completeName', {
                            // Entity identifying info - CRITICAL for tracking source
                            // SimpleIdentifiers stores value in primaryAlias.term
                            accountNumber: entity.accountNumber?.primaryAlias?.term || 'NO_ACCOUNT',
                            locationId: entity.locationIdentifier?.primaryAlias?.term || 'NO_LOCATION',
                            // Name's primaryAlias has source and rowIndex for tracking origin
                            nameSource: entity.name.primaryAlias?.source || 'NO_SOURCE',
                            nameRowIndex: entity.name.primaryAlias?.rowIndex,
                            nameAliasTerm: entity.name.primaryAlias?.term || 'NO_ALIAS_TERM',
                            // All name fields to see what's missing
                            completeName: entity.name.completeName,
                            firstName: entity.name.firstName,
                            lastName: entity.name.lastName,
                            otherNames: entity.name.otherNames,
                            title: entity.name.title,
                            suffix: entity.name.suffix,
                            termOfAddress: entity.name.termOfAddress,
                            nameConstructor: entity.name.constructor?.name
                        });
                        // Also log the full entity for inspection
                        console.error('Full entity object:', entity);
                        return { entityType: 'Individual', completeName: 'ERROR: Missing completeName', error: true };
                    }
                    return {
                        entityType: 'Individual',
                        title: entity.name.title || '',
                        firstName: entity.name.firstName || '',
                        otherNames: entity.name.otherNames || '',
                        lastName: entity.name.lastName || '',
                        suffix: entity.name.suffix || '',
                        completeName: entity.name.completeName,
                        termOfAddress: entity.name.termOfAddress || ''
                    };
                }

                // For non-Individual entities: return object with completeName from term or string
                if (entity.name && entity.name.term) {
                    return { entityType: entityType, completeName: entity.name.term };
                }

                if (typeof entity.name === 'string') {
                    return { entityType: entityType, completeName: entity.name };
                }

                console.error('DATA INTEGRITY ERROR: Entity missing valid name', entity);
                return { entityType: entityType, completeName: 'ERROR: No name found', error: true };

            } catch (error) {
                console.error('extractNameWorking error:', error, entity);
                return { entityType: 'Unknown', completeName: `ERROR: ${error.message}`, error: true };
            }
        };

        workingLoadedEntities.status = 'loaded';

        // Step 6: Build Keyed Database from loaded entities
        console.log('\n🔑 Building Keyed Database...');
        if (typeof buildUnifiedEntityDatabase === 'function') {
            buildUnifiedEntityDatabase();
        } else {
            console.error('❌ buildUnifiedEntityDatabase not available - Keyed Database not built');
        }

        // Step 7: Final summary using Keyed Database metadata
        const metadata = window.unifiedEntityDatabase?.metadata;
        const vaCount = metadata?.sources?.visionAppraisal?.count || 0;
        const bloomerangCount = metadata?.sources?.bloomerang?.count || 0;
        const totalCount = metadata?.totalEntities || (vaCount + bloomerangCount);

        console.log('\n🎉 ENTITY LOADING COMPLETE!');
        console.log('============================');
        console.log(`📊 VisionAppraisal: ${vaCount} entities`);
        console.log(`👥 Bloomerang: ${bloomerangCount} entities`);
        console.log(`🔢 Grand Total: ${totalCount} entities`);
        console.log('');
        console.log('💡 Entities available in unifiedEntityDatabase.entities');
        console.log('💡 Use extractNameWorking(entity) to extract names');
        console.log('💡 Individual entities return full name structure');

        return {
            success: true,
            visionAppraisal: vaCount,
            bloomerang: bloomerangCount,
            total: totalCount
        };

    } catch (error) {
        console.error('❌ Entity loading failed:', error);
        workingLoadedEntities.status = 'error';
        throw error;
    }
}

/**
 * Check if an entity is from Bloomerang by looking at the sourceMap in locationIdentifier
 * @param {Entity} entity
 * @returns {boolean}
 */
function isBloomerangEntity(entity) {
    const sourceMap = entity.locationIdentifier?.primaryAlias?.sourceMap;
    if (!sourceMap) {
        return false;
    }
    // sourceMap is a Map - check if any key contains "bloomerang" (case insensitive)
    if (sourceMap instanceof Map) {
        for (const key of sourceMap.keys()) {
            if (String(key).toLowerCase().includes('bloomerang')) {
                return true;
            }
        }
    }
    // Handle deserialized Map (has __data array)
    if (sourceMap.__data) {
        return sourceMap.__data.some(entry => String(entry[0]).toLowerCase().includes('bloomerang'));
    }
    return false;
}

/**
 * Extract Bloomerang account number from an entity
 * @param {Entity} entity
 * @returns {string|null} The account number or null if not found
 */
function getBloomerangAccountNumber(entity) {
    if (!entity.accountNumber) {
        return null;
    }
    // Account number stored in SimpleIdentifiers pattern: primaryAlias.term
    if (entity.accountNumber.primaryAlias?.term) {
        return String(entity.accountNumber.primaryAlias.term);
    }
    // Alternative: direct term property
    if (entity.accountNumber.term) {
        return String(entity.accountNumber.term);
    }
    return null;
}

/**
 * Extract entity key information from an entity
 * For Bloomerang: includes accountNumber AND headStatus to ensure uniqueness
 * For VisionAppraisal: uses locationIdentifier type and value (no collisions within same type)
 *
 * @param {Entity} entity
 * @returns {Object|null} Object with source-appropriate key info, or null if key cannot be determined
 *   Bloomerang: { source: 'bloomerang', accountNumber: string, locationType: string, locationValue: string, headStatus: string }
 *   VisionAppraisal: { source: 'visionAppraisal', locationType: string, locationValue: string }
 */
function getEntityKeyInfo(entity) {
    // Get locationIdentifier info (needed for both sources)
    let locationType = null;
    let locationValue = null;

    if (entity.locationIdentifier) {
        const locId = entity.locationIdentifier;
        locationType = locId.constructor?.name || 'Unknown';

        if (locId.primaryAlias?.term) {
            locationValue = String(locId.primaryAlias.term);
        } else if (locId.toString && typeof locId.toString === 'function') {
            locationValue = locId.toString();
        }
    }

    // Determine household head status
    // Only applies to Individual entities in Bloomerang that are in a household
    let headStatus = 'na';
    const entityType = entity.constructor?.name;
    if (entityType === 'Individual') {
        const householdInfo = entity.contactInfo?.householdInformation;
        if (householdInfo && householdInfo.isInHousehold) {
            headStatus = householdInfo.isHeadOfHousehold ? 'head' : 'member';
        }
    }

    // Bloomerang entities: include accountNumber AND headStatus to ensure uniqueness
    if (isBloomerangEntity(entity)) {
        let accountNumber = getBloomerangAccountNumber(entity);
        if (!accountNumber) {
            console.warn('⚠️ Bloomerang entity missing accountNumber:', entity);
            return null;
        }
        // Append "AH" to accountNumber for AggregateHousehold entities to prevent collision
        // with Individual entities that share the same account number
        if (entityType === 'AggregateHousehold') {
            accountNumber = accountNumber + 'AH';
        }
        return {
            source: 'bloomerang',
            accountNumber,
            locationType: locationType || 'NoLocation',
            locationValue: locationValue || 'NoValue',
            headStatus
        };
    }

    // VisionAppraisal entities: use locationIdentifier type + value
    if (!locationValue) {
        return null;
    }

    return { source: 'visionAppraisal', locationType, locationValue };
}

/**
 * Build entity index key from key info
 * Key formats:
 *   Bloomerang: bloomerang:<accountNumber>:<locationType>:<locationValue>:<headStatus>
 *   VisionAppraisal: visionAppraisal:<locationType>:<locationValue>
 * @param {Object} keyInfo - Result from getEntityKeyInfo()
 * @returns {string} The index key
 */
function buildEntityIndexKey(keyInfo) {
    if (keyInfo.source === 'bloomerang') {
        return `bloomerang:${keyInfo.accountNumber}:${keyInfo.locationType}:${keyInfo.locationValue}:${keyInfo.headStatus}`;
    } else {
        return `visionAppraisal:${keyInfo.locationType}:${keyInfo.locationValue}`;
    }
}

/**
 * Extract locationIdentifier type, value, and household head status from an entity
 * @param {Entity} entity
 * @returns {Object|null} Object with { type, value, headStatus } or null if no locationIdentifier
 * @deprecated Use getEntityKeyInfo() instead - this function is kept for backwards compatibility
 */
function getLocationIdentifierTypeAndValue(entity) {
    if (!entity.locationIdentifier) {
        return null;
    }

    // Get the type from the constructor name
    const locId = entity.locationIdentifier;
    const type = locId.constructor?.name || 'Unknown';

    // Get the value
    let value = null;
    if (locId.primaryAlias?.term) {
        value = String(locId.primaryAlias.term);
    } else if (locId.toString && typeof locId.toString === 'function') {
        value = locId.toString();
    }

    if (!value) {
        return null;
    }

    // Determine household head status
    // Only applies to Individual entities in Bloomerang that are in a household
    let headStatus = 'na';
    const entityType = entity.constructor?.name;
    if (entityType === 'Individual') {
        const householdInfo = entity.contactInfo?.householdInformation;
        if (householdInfo && householdInfo.isInHousehold) {
            headStatus = householdInfo.isHeadOfHousehold ? 'head' : 'member';
        }
    }

    return { type, value, headStatus };
}

/**
 * Extract locationIdentifier value from an entity (legacy compatibility)
 * @param {Entity} entity
 * @returns {string} The locationIdentifier value
 * @deprecated Use getLocationIdentifierTypeAndValue() instead
 */
function getLocationIdentifierValue(entity) {
    const result = getLocationIdentifierTypeAndValue(entity);
    return result ? result.value : null;
}

// NOTE: buildEntityLookupIndex() was removed in Keyed Database migration.
// Entity lookup now uses unifiedEntityDatabase.entities directly.
// See reference_keyedDatabaseMigration.md Phase 5.

/**
 * Look up an entity by its key info object
 * This is the RECOMMENDED way to look up entities - no fallbacks, no searching
 *
 * @param {Object} keyInfo - Key info object from getEntityKeyInfo()
 *   Bloomerang: { source: 'bloomerang', accountNumber, locationType, locationValue }
 *   VisionAppraisal: { source: 'visionAppraisal', locationType, locationValue }
 * @returns {Entity|null} The entity, or null if not found
 */
function getEntityByKeyInfo(keyInfo) {
    if (!workingLoadedEntities.entityIndex) {
        console.error('❌ Entity index not built. Call loadAllEntitiesIntoMemory() first.');
        return null;
    }

    const key = buildEntityIndexKey(keyInfo);
    const entity = workingLoadedEntities.entityIndex[key];

    if (!entity) {
        console.error(`❌ Entity not found for key: ${key}`, keyInfo);
    }

    return entity;
}

/**
 * Look up a Bloomerang entity by account number and headStatus
 * @param {string} accountNumber - The Bloomerang account number
 * @param {string} locationType - Optional location type
 * @param {string} locationValue - Optional location value
 * @param {string} headStatus - Optional head status ('head', 'member', or 'na')
 * @returns {Entity|null} The entity, or null if not found
 */
function getBloomerangEntityByAccountNumber(accountNumber, locationType, locationValue, headStatus) {
    // Use Keyed Database (preferred) or fall back to legacy entityIndex
    const db = window.unifiedEntityDatabase?.entities || workingLoadedEntities?.entityIndex;
    if (!db) {
        console.error('❌ No entity database available. Load entities first.');
        return null;
    }

    // If we have full key info, use direct lookup
    if (locationType && locationValue && headStatus) {
        const key = `bloomerang:${accountNumber}:${locationType}:${locationValue}:${headStatus}`;
        return db[key] || null;
    }

    // Otherwise, search for any key starting with bloomerang:<accountNumber>:
    const prefix = `bloomerang:${accountNumber}:`;
    for (const key of Object.keys(db)) {
        if (key.startsWith(prefix)) {
            return db[key];
        }
    }

    console.error(`❌ Bloomerang entity not found for accountNumber: ${accountNumber}`);
    return null;
}

/**
 * Look up a VisionAppraisal entity by location type and value
 * @param {string} locationType - The locationIdentifier type (e.g., 'FireNumber', 'PID')
 * @param {string} locationValue - The locationIdentifier value
 * @returns {Entity|null} The entity, or null if not found
 */
function getVisionAppraisalEntity(locationType, locationValue) {
    // NOTE: This function is now a FALLBACK only.
    // Primary lookup should use direct database key via reconcileMatch() in unifiedEntityBrowser.js
    // The database key is preserved through the flow from findBestMatches() → Reconcile button → reconcileMatch()

    // Use Keyed Database (preferred) or fall back to legacy entityIndex
    const db = window.unifiedEntityDatabase?.entities || workingLoadedEntities?.entityIndex;
    if (!db) {
        console.error('❌ No entity database available. Load entities first.');
        return null;
    }

    // Try direct key lookup
    const key = `visionAppraisal:${locationType}:${locationValue}`;
    let entity = db[key];
    if (entity) return entity;

    // Try alternate key format (FireNumber if we searched PID, or vice versa)
    // This handles the case where key format differs from what was expected
    const altType = locationType === 'PID' ? 'FireNumber' : 'PID';
    const altKey = `visionAppraisal:${altType}:${locationValue}`;
    entity = db[altKey];
    if (entity) return entity;

    console.error(`❌ VisionAppraisal entity not found: type=${locationType}, value=${locationValue}`);
    return null;
}

/**
 * Look up an entity by source, locationIdentifier type, value, and head status
 * @deprecated Use getEntityByKeyInfo() or source-specific functions instead
 */
function getEntityBySourceTypeAndValue(source, locationType, locationValue, headStatus) {
    console.warn('⚠️ DEPRECATED: getEntityBySourceTypeAndValue() - use getEntityByKeyInfo() instead');
    // This old signature doesn't work with the new key format
    // Attempt backwards compatibility for VisionAppraisal
    const normalizedSource = source.toLowerCase().includes('vision') ? 'visionAppraisal' : 'bloomerang';
    if (normalizedSource === 'visionAppraisal') {
        return getVisionAppraisalEntity(locationType, locationValue);
    }
    // For Bloomerang, we can't look up without accountNumber
    console.error('❌ Cannot look up Bloomerang entity without accountNumber. Use getBloomerangEntityByAccountNumber() instead.');
    return null;
}

/**
 * Look up an entity by source and locationIdentifier (legacy - DEPRECATED)
 * @deprecated Use getEntityBySourceTypeAndValue() instead - this function cannot distinguish FireNumber vs PID
 */
function getEntityBySourceAndLocationId(source, locationId) {
    console.warn('⚠️ DEPRECATED: getEntityBySourceAndLocationId() cannot distinguish FireNumber vs PID. Use getEntityBySourceTypeAndValue() instead.');
    // This will not work correctly with the new index format
    // Keeping for backwards compatibility during transition
    return null;
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

// Export for global use
if (typeof window !== 'undefined') {
    window.loadAllEntitiesIntoMemory = loadAllEntitiesIntoMemory;
    // New key-based functions
    window.getEntityKeyInfo = getEntityKeyInfo;
    window.buildEntityIndexKey = buildEntityIndexKey;
    window.getEntityByKeyInfo = getEntityByKeyInfo;
    window.getBloomerangEntityByAccountNumber = getBloomerangEntityByAccountNumber;
    window.getVisionAppraisalEntity = getVisionAppraisalEntity;
    window.isBloomerangEntity = isBloomerangEntity;
    window.getBloomerangAccountNumber = getBloomerangAccountNumber;
    // Legacy/deprecated functions (kept for backwards compatibility)
    window.getEntityBySourceAndLocationId = getEntityBySourceAndLocationId;
    window.getEntityBySourceTypeAndValue = getEntityBySourceTypeAndValue;
    window.getLocationIdentifierValue = getLocationIdentifierValue;
    window.getLocationIdentifierTypeAndValue = getLocationIdentifierTypeAndValue;
}

console.log('🚀 Load All Entities button function ready');