/**
 * Address Processing Module
 *
 * Core address parsing, normalization, and Block Island enhancement functionality.
 * Extracted from utils.js for better modularity and maintenance.
 *
 * Dependencies:
 * - parse-address library (parseAddress global)
 * - Address class from aliasClasses.js
 * - Google Drive API (gapi.client) for Block Island streets loading
 *
 * Key Features:
 * - Block Island city normalization
 * - Enhanced Block Island address completion (dual logic rules)
 * - Street name preservation (prevents parse-address abbreviations)
 * - AttributedTerm integration for complete data lineage
 */

// City name normalization function for Block Island
function normalizeBlockIslandCity(parsedAddress) {
    if (!parsedAddress || !parsedAddress.city) return parsedAddress;

    const city = parsedAddress.city.toLowerCase();

    // Normalize Block Island variations
    if (city === 'block island' || city === 'new shoreham') {
        // Use postal name "Block Island" as canonical form
        parsedAddress.city = 'Block Island';
        parsedAddress.cityNormalized = true;

        // Store both forms for reference
        parsedAddress.cityPostal = 'Block Island';
        parsedAddress.cityMunicipal = 'New Shoreham';
    }

    return parsedAddress;
}

// Helper function to create consistent processed address objects
function createProcessedAddressObject(normalized, originalString, sourceType, fieldName) {
    return {
        // Original data
        original: originalString,
        sourceType: sourceType, // 'VisionAppraisal', 'Bloomerang', etc.
        fieldName: fieldName,   // For AttributedTerm integration

        // Parsed components
        number: normalized.number || null,
        street: normalized.street || null,
        type: normalized.type || null, // St, Ave, Rd, etc.

        // City handling (Block Island specific)
        city: normalized.city || null,
        cityPostal: normalized.cityPostal || normalized.city,
        cityMunicipal: normalized.cityMunicipal || null,
        cityNormalized: normalized.cityNormalized || false,

        // State & ZIP
        state: normalized.state || null,
        zip: normalized.zip || null,

        // Special units (PO Box, Apt, etc.)
        secUnitType: normalized.sec_unit_type || null,
        secUnitNum: normalized.sec_unit_num || null,

        // Metadata
        processedAt: new Date().toISOString(),
        isBlockIslandAddress: false,  // Will be set by detection function
        needsBlockIslandForcing: false,  // Will be set by detection function
        blockIslandDetectionMethod: null  // Will be set by detection function
    };
}

// Comprehensive Block Island detection function (Phase 1.2)
// Consolidates all detection methods and returns structured result
function detectBlockIslandAddress(parsed, addressString, sourceType, fieldName) {
    let isBI = false;
    let method = null;
    let matchedStreet = null;

    // Method 1: ZIP detection
    if (parsed.zip === '02807') {
        isBI = true;
        method = 'zip';
    }

    // Method 2: City detection
    if (!isBI && parsed.city &&
        (parsed.city === 'Block Island' || parsed.city === 'New Shoreham')) {
        isBI = true;
        method = 'city';
    }

    // Method 3: Street database matching (reuse existing precheck logic)
    if (!isBI && window.blockIslandStreets) {
        const addressUpper = addressString.toUpperCase().trim();

        // Build comprehensive street check list (from existing precheck logic)
        const streetChecks = [
            addressUpper,
            addressUpper.replace(/^\d+\s+/, ''), // Remove leading house number
            addressUpper.replace(/\s+/g, ' ')    // Normalize spaces
        ];

        for (const checkStreet of streetChecks) {
            if (window.blockIslandStreets.has(checkStreet)) {
                isBI = true;
                method = 'street';
                matchedStreet = checkStreet;
                break;
            }
        }
    }

    // Method 4: VisionAppraisal property location assumption
    // (Only for propertyLocation, NOT ownerAddress - this is the key fix)
    if (!isBI && sourceType === 'VisionAppraisal' && fieldName === 'propertyLocation') {
        isBI = true;
        method = 'visionappraisal';
    }

    // Determine if forcing is needed (is Block Island AND missing address components)
    const needsForcing = isBI && (!parsed.city || !parsed.state || !parsed.zip);

    return {
        isBI: isBI,
        needsForcing: needsForcing,
        method: method,
        matchedStreet: matchedStreet
    };
}

// Block Island Address Builder Function (Phase 3, Step 3.1)
// Creates Block Island address with proper completion and street preservation
function createBlockIslandAddress(parsed, originalString, sourceType, fieldName, matchedStreet) {
    // Create base processed address object
    const processedAddress = createProcessedAddressObject(parsed, originalString, sourceType, fieldName);

    // Set Block Island identification
    processedAddress.isBlockIslandAddress = true;
    processedAddress.cityNormalized = true;

    // Force Block Island completion
    processedAddress.city = 'Block Island';
    processedAddress.state = 'RI';
    processedAddress.zip = '02807';

    // Set metadata
    processedAddress.blockIslandReason = 'Block Island address builder (two-path processing)';

    // Street preservation logic (adapted from enhanceAddressWithBlockIslandLogic)
    if (originalString && sourceType === 'VisionAppraisal') {
        // Preserve original VisionAppraisal street name by reconstructing from original address
        const originalMatch = originalString.match(/(\d+)\s+(.*?)(?:\s*::#\^#::|$)/i);
        if (originalMatch) {
            const fullStreet = originalMatch[2].trim();
            processedAddress.street = fullStreet;
            processedAddress.type = null; // Don't abbreviate
        }
    } else if (matchedStreet && window.blockIslandStreets && window.blockIslandStreets.has(matchedStreet)) {
        // Use matched street from database detection
        processedAddress.matchedStreet = matchedStreet;
        processedAddress.blockIslandReason = `Matched BI street: ${matchedStreet}`;
    }

    return processedAddress;
}

// Unified address processing function for Requirements 10,11,14,16,17,18
function processAddress(addressString, sourceType = 'unknown', fieldName = null) {
    if (!addressString || typeof addressString !== 'string') {
        console.log(`❌ PROCESSADDRESS: Invalid input`);
        return null;
    }

    // Check if parse-address is available
    if (typeof parseAddress === 'undefined') {
        console.error('parse-address library not loaded');
        return null;
    }

    // Requirement 11: BI PO Box special handling
    if (fieldName === 'BI PO Box') {
        const poBoxNum = addressString.trim();
        // Generate full PO Box address
        const fullAddress = `PO Box ${poBoxNum}, New Shoreham, RI 02807`;
        const parsed = parseAddress.parseLocation(fullAddress);

        if (parsed) {
            const processedAddress = createProcessedAddressObject(parsed, addressString, sourceType, fieldName);
            processedAddress.isBlockIslandAddress = true;
            processedAddress.blockIslandReason = 'BI PO Box generated address';
            processedAddress.generatedAddress = fullAddress;
            return processedAddress;
        }
    }

    // Requirement 14: BI Street special handling
    if (fieldName === 'BI Street') {
        const streetData = addressString.trim();
        // Check if starts with number (Fire Number detection)
        const hasFireNumber = /^\d+/.test(streetData);

        if (hasFireNumber) {
            // Generate full Block Island address
            const fullAddress = `${streetData}, Block Island, RI 02807`;
            const parsed = parseAddress.parseLocation(fullAddress);

            if (parsed) {
                const processedAddress = createProcessedAddressObject(parsed, addressString, sourceType, fieldName);
                processedAddress.isBlockIslandAddress = true;
                processedAddress.blockIslandReason = 'BI Street generated address with Fire Number';
                processedAddress.generatedAddress = fullAddress;
                return processedAddress;
            }
        }
    }

    // Standard address parsing
    const parsed = parseAddress.parseLocation(addressString.trim());

    /* COMMENTED OUT: No longer needed with two-path system (Phase 3)
    // BLOCK ISLAND STREET PRECHECK - Check against street database BEFORE parsing
    let blockIslandPrecheckResult = null;
    if (window.blockIslandStreets) {
        const addressUpper = addressString.toUpperCase().trim();

        // Build comprehensive street check list (same logic as enhanceAddressWithBlockIslandLogic)
        const streetChecks = [
            addressUpper,
            addressUpper.replace(/^\d+\s+/, ''), // Remove leading house number
            addressUpper.replace(/\s+/g, ' ')    // Normalize spaces
        ];

        for (const checkStreet of streetChecks) {
            if (window.blockIslandStreets.has(checkStreet)) {
                blockIslandPrecheckResult = checkStreet;
                break;
            }
        }
    }
    */

    if (!parsed || (!parsed.city && !parsed.zip && !parsed.street)) {
        return null; // Failed to parse meaningfully
    }

    // Apply Block Island city normalization
    const normalized = normalizeBlockIslandCity(parsed);

    // Use new detection function to determine Block Island status (Step 1.3)
    const detectionResult = detectBlockIslandAddress(normalized, addressString, sourceType, fieldName);

    // Create comprehensive address object using helper function
    const processedAddress = createProcessedAddressObject(normalized, addressString, sourceType, fieldName);

    // Apply detection results to address object (new two-variable system)
    processedAddress.isBlockIslandAddress = detectionResult.isBI;
    processedAddress.needsBlockIslandForcing = detectionResult.needsForcing;
    processedAddress.blockIslandDetectionMethod = detectionResult.method;
    if (detectionResult.matchedStreet) {
        processedAddress.matchedStreet = detectionResult.matchedStreet;
    }

    // Phase 3 Step 3.2: Two-Path Processing Decision Logic
    if (detectionResult.isBI) {
        // Path A: Block Island addresses → specialized processing
        return createBlockIslandAddress(normalized, addressString, sourceType, fieldName, detectionResult.matchedStreet);
    } else {
        // Path B: Non-Block Island addresses → direct return
        return processedAddress;
    }
}

/**
 * Load Block Island streets database from Google Drive
 * Uses proven Method 1 from wisdomOfFileAccess.md
 * @returns {Promise<Set>} Set of Block Island street names in uppercase
 */
async function loadBlockIslandStreetsFromDrive() {
    try {
        const response = await gapi.client.drive.files.get({
            fileId: '1lsrd0alv9O01M_qlsiym3cB0TRIdgXI9',
            alt: 'media'
        });

        const content = response.body;
        const streets = JSON.parse(content);
        window.blockIslandStreets = new Set(streets.map(s => s.toUpperCase()));

        // Add trimmed versions for any streets with trailing spaces
        let trailingSpaceCount = 0;
        const originalStreets = Array.from(window.blockIslandStreets);

        for (const street of originalStreets) {
            // Check if original raw street (before our trim) had trailing spaces
            const rawStreet = streets.find(s => s.toUpperCase().trim() === street);
            if (rawStreet && rawStreet !== rawStreet.trim()) {
                const trimmedVersion = rawStreet.toUpperCase().trim();
                if (!window.blockIslandStreets.has(trimmedVersion)) {
                    window.blockIslandStreets.add(trimmedVersion);
                    trailingSpaceCount++;
                }
            }
        }

        console.log(`✅ Loaded ${streets.length} Block Island streets from Google Drive`);
        if (trailingSpaceCount > 0) {
            console.log(`🔧 Added ${trailingSpaceCount} trimmed versions for streets with trailing spaces`);
        }
        return window.blockIslandStreets;

    } catch (error) {
        console.error('❌ Failed to load Block Island streets:', error);
        throw error;
    }
}

/**
 * Enhanced Block Island address processing with street name matching and preservation
 * Applies Block Island completion logic and preserves original street names (no abbreviation)
 * @param {Object} processedAddress - Address object from processAddress()
 * @param {string} sourceType - Data source type ('VisionAppraisal', 'Bloomerang', etc.)
 * @param {string} fieldName - Field name for data lineage
 * @returns {Object} Enhanced address with Block Island completion and preserved street names
 */
function enhanceAddressWithBlockIslandLogic(processedAddress, sourceType, fieldName) {
    // Rule 1: VisionAppraisal property location addresses - complete missing fields if already detected as BI
    if (sourceType === 'VisionAppraisal' && fieldName === 'propertyLocation' &&
        processedAddress.isBlockIslandAddress && processedAddress.needsBlockIslandForcing) {
        processedAddress.city = 'Block Island';
        processedAddress.state = 'RI';
        processedAddress.zip = '02807';
        // Keep existing blockIslandDetectionMethod from detection function

        // Preserve original street name by reconstructing from original address
        if (processedAddress.original) {
            const originalMatch = processedAddress.original.match(/(\d+)\s+(.*?)(?:\s*::#\^#::|$)/i);
            if (originalMatch) {
                const fullStreet = originalMatch[2].trim();
                processedAddress.street = fullStreet;
                processedAddress.type = null; // Don't abbreviate
            }
        }

        return processedAddress;
    }

    // Rule 2: Complete missing fields if street database detected Block Island
    if (processedAddress.isBlockIslandAddress && processedAddress.needsBlockIslandForcing &&
        processedAddress.blockIslandDetectionMethod === 'street' && window.blockIslandStreets && processedAddress.street) {
        const streetToCheck = processedAddress.street.toUpperCase().trim();

        // Build comprehensive street check list
        const streetChecks = [
            streetToCheck,                           // "CORN NECK"
            `OFF ${streetToCheck}`,                  // "OFF CORN NECK"
            streetToCheck.replace(/\s+/g, ' ')       // Normalize spaces
        ];

        // Add numbered variations if we have a street number
        if (processedAddress.number) {
            streetChecks.push(`${processedAddress.number} ${streetToCheck}`);
            streetChecks.push(`${processedAddress.number} OFF ${streetToCheck}`);
        }

        for (const checkStreet of streetChecks) {
            if (window.blockIslandStreets.has(checkStreet)) {
                processedAddress.city = 'Block Island';
                processedAddress.state = 'RI';
                processedAddress.zip = '02807';
                processedAddress.isBlockIslandAddress = true;
                processedAddress.blockIslandReason = `Matched BI street: ${checkStreet}`;

                // Preserve original street name
                if (processedAddress.original) {
                    const originalMatch = processedAddress.original.match(/(\d+)\s+(.*?)(?:\s*::#\^#::|$)/i);
                    if (originalMatch) {
                        const fullStreet = originalMatch[2].trim();
                        processedAddress.street = fullStreet;
                        processedAddress.type = null;
                    }
                }

                return processedAddress;
            }
        }
    }

    // Rule 3: Complete any Block Island address that needs forcing (regardless of source)
    if (processedAddress.isBlockIslandAddress && processedAddress.needsBlockIslandForcing) {
        if (!processedAddress.city) processedAddress.city = 'Block Island';
        if (!processedAddress.state) processedAddress.state = 'RI';
        if (!processedAddress.zip) processedAddress.zip = '02807';
    }

    return processedAddress;
}

/**
 * Create Address ComplexIdentifier from processed address data
 * Converts output from processAddress() function to Address instance
 * @param {Object} processedAddress - Output from processAddress() function
 * @param {string} fieldName - Field name for data lineage
 * @returns {Address} New Address instance
 */
function createAddressFromParsedData(processedAddress, fieldName) {
    if (!processedAddress || !processedAddress.original) {
        throw new Error('Invalid processed address data - missing original address');
    }

    try {
        return Address.fromProcessedAddress(processedAddress, fieldName);
    } catch (error) {
        console.error('Error creating Address from processed data:', error);
        console.error('Processed address data:', processedAddress);
        throw error;
    }
}