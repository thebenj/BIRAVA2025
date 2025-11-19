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

/**
 * VisionAppraisal Tag Cleaner Class
 * Processes VisionAppraisal address tags and provides multiple representations
 */
class VisionAppraisalTagCleaner {
    constructor(addressString) {
        this.originalString = addressString;

        if (!addressString || typeof addressString !== 'string') {
            this.cleanedString = addressString;
            this.splitLines = [];
            return;
        }

        // Apply COMMA_NEWLINE strategy:
        // :^#^: (line break substitute) → comma
        // ::#^#:: (field delimiter) → newline
        this.cleanedString = addressString
            .replace(/:^#^:/g, ',')       // :^#^: → ,
            .replace(/::#\^#::/g, '\n');     // ::#^#:: → \n

        // Split on ::#^#:: to get original field structure
        this.splitLines = addressString.split('::#^#::');
    }
}

/**
 * Legacy function for backward compatibility
 * @param {string} addressString - Raw VisionAppraisal address with tags
 * @returns {string} - Clean address string ready for parsing
 */
function cleanVisionAppraisalTags(addressString) {
    const cleaner = new VisionAppraisalTagCleaner(addressString);
    return cleaner.cleanedString;
}

// Helper function to create consistent processed address objects
function createProcessedAddressObject(normalized, originalString, sourceType, fieldName, usedPlaceholderNumber = false, recipientDetails = null) {
    return {
        // Original data
        original: originalString,
        recipientDetails: recipientDetails,
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
        blockIslandDetectionMethod: null,  // Will be set by detection function

        // Placeholder number tracking
        usedPlaceholderNumber: usedPlaceholderNumber
    };
}

/**
 * Find longest Block Island street match from streetChecks array
 * Utility function for street matching logic
 * @param {Array} streetChecks - Array of address variations to check
 * @returns {string|null} - Matched street name or null if no match
 */
function findBlockIslandStreetMatch(streetChecks) {
    if (!window.blockIslandStreets) {
        return null;
    }

    let storedMatch = null;

    // Check all Block Island street names to find longest match
    for (const biStreetName of window.blockIslandStreets) {
        for (const checkStreet of streetChecks) {
            // Trim database entry to handle trailing spaces
            if (checkStreet.includes(biStreetName.trim())) {

                if (!storedMatch) {
                    // First match found - store trimmed version
                    storedMatch = biStreetName.trim();
                } else {
                    // Check if new match contains the stored match (is longer/more specific)
                    if (biStreetName.includes(storedMatch)) {
                        storedMatch = biStreetName.trim();  // Replace with longer match
                    }
                }
                break; // Move to next biStreetName
            }
        }
    }

    return storedMatch;
}

/**
 * Shared helper function for Block Island street matching with geographic corroboration
 * @param {string} addressString - Raw address string
 * @param {Array} streetChecks - Array of address variations to check
 * @returns {Object} {isMatch: boolean, matchedStreet: string|null}
 */
function checkBlockIslandStreetMatch(addressString, streetChecks) {
    const storedMatch = findBlockIslandStreetMatch(streetChecks);

    if (!storedMatch) {
        return { isMatch: false, matchedStreet: null };
    }

    // Apply corroboration logic with the longest match found
    if (addressString.includes('::#^#::')) {
        // Extract geographic portion (everything after first line tag)
        const firstTagIndex = addressString.indexOf('::#^#::');
        const geographicPortion = addressString.substring(firstTagIndex + 7);

        // Check if geographic portion corroborates Block Island specifically
        const confirmsBI = /BLOCK ISLAND|NEW SHOREHAM|02807/i.test(geographicPortion);

        if (confirmsBI) {
            return { isMatch: true, matchedStreet: storedMatch };
        } else {
            // NOT corroborated - address with line tags is definitively NOT Block Island
            return { isMatch: false, matchedStreet: null };
        }
    } else {
        // No line tag - accept street match
        return { isMatch: true, matchedStreet: storedMatch };
    }
}

/**
 * Pre-parsing Block Island detection using only methods that don't require parsed components
 * Used to determine if placeholder number insertion is needed before parsing
 * @param {string} addressString - Raw address string
 * @param {string} sourceType - Source type ('VisionAppraisal', 'Bloomerang', etc.)
 * @param {string} fieldName - Field name ('propertyLocation', 'ownerAddress', etc.)
 * @returns {Object} {isBlockIsland: boolean, matchedStreet: string|null}
 */
function preParseBlockIslandCheck(addressString, sourceType, fieldName) {
    let isBI = false;
    let matchedStreet = null;

    // Method 3: Street database matching with geographic corroboration
    if (!isBI) {
        // Clean address for street matching while keeping original for line tag checking
        const cleanedAddress = cleanVisionAppraisalTags(addressString);
        const addressUpper = cleanedAddress.toUpperCase().trim();

        // Build comprehensive street check list using cleaned address
        const streetChecks = [
            addressUpper,
            addressUpper.replace(/^\d+\s+/, ''), // Remove leading house number
            addressUpper.replace(/\s+/g, ' ')    // Normalize spaces
        ];

        // Use shared helper function - pass original address for line tag check
        const streetMatchResult = checkBlockIslandStreetMatch(addressString, streetChecks);
        if (streetMatchResult.isMatch) {
            isBI = true;
            matchedStreet = streetMatchResult.matchedStreet;
        }
    }

    // Method 4: VisionAppraisal property location assumption (from existing detectBlockIslandAddress)
    if (!isBI && sourceType === 'VisionAppraisal' && fieldName === 'propertyLocation') {
        isBI = true;
        // No matchedStreet for this method
    }

    return {
        isBlockIsland: isBI,
        matchedStreet: matchedStreet
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

    // Methods 3 & 4: Use preParseBlockIslandCheck for street database and VisionAppraisal detection
    if (!isBI) {
        const preParseResult = preParseBlockIslandCheck(addressString, sourceType, fieldName);
        if (preParseResult.isBlockIsland) {
            isBI = true;
            matchedStreet = preParseResult.matchedStreet;
            // Determine method based on what triggered the match
            method = preParseResult.matchedStreet ? 'street' : 'visionappraisal';
        }
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
function createBlockIslandAddress(parsed, originalString, sourceType, fieldName, matchedStreet, usedPlaceholderNumber = false) {
    // Create base processed address object
    const processedAddress = createProcessedAddressObject(parsed, originalString, sourceType, fieldName, usedPlaceholderNumber);

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
    }

    // Branch 2: Use matched street from database detection (either as fallback or primary)
    // Check if the matched street (or its untrimmed version) exists in database
    const hasMatch = matchedStreet && window.blockIslandStreets && (
        window.blockIslandStreets.has(matchedStreet) ||
        Array.from(window.blockIslandStreets).some(street => street.trim() === matchedStreet)
    );

    if (hasMatch) {
        // Use matched street from database detection
        processedAddress.street = matchedStreet;
        processedAddress.matchedStreet = matchedStreet;
        processedAddress.blockIslandReason = `Matched BI street: ${matchedStreet}`;
    }

    // Restore street number to null if placeholder was used
    if (usedPlaceholderNumber && processedAddress.number === "9999") {
        processedAddress.number = null;
        processedAddress.placeholderNumberRemoved = true;
    }

    return processedAddress;
}


/**
 * Extract recipient details from address string if it matches our criteria
 * Based on secondary address analysis logic for Groups A, C, and three-part group
 * @param {string} addressString - Raw address string
 * @returns {Object} {recipientDetails: string|null, addressString: string}
 */
function extractRecipientDetails(addressString) {
    if (!addressString || typeof addressString !== 'string') {
        return { recipientDetails: null, addressString: addressString };
    }

    // Business terms for detection (from secondaryAddressAnalysis.js)
    const businessTerms = [
        'LLC', 'INC', 'CORP', 'TRUST', 'COMPANY', 'CO', 'LTD', 'PARTNERSHIP',
        'ASSOCIATES', 'GROUP', 'ENTERPRISES', 'FOUNDATION', 'ORGANIZATION',
        'TRUSTEE', 'ESTATE', 'PROPERTIES', 'MANAGEMENT', 'HOLDINGS', 'REALTY',
        'FINANCIAL', 'SERVICES', 'INVESTMENTS', 'DEVELOPMENT', 'BUILDERS'
    ];

    // Helper functions (from secondaryAddressAnalysis.js)
    function hasBusinessTerm(text) {
        const upperText = text.toUpperCase();
        return businessTerms.some(term => new RegExp(`\\b${term}\\b`).test(upperText));
    }

    function containsCO(text) {
        // Match C/O, C\O, C-O, CARE OF - all must be complete words with trailing space
        return /\b(C[\/\\-]O\b|CARE\s+OF)\s/i.test(text);
    }

    function beginsWithNumberOrPO(text) {
        const trimmed = text.trim().toUpperCase();

        // Check if starts with number
        if (/^\d/.test(trimmed)) return true;

        // Check if starts with spelled-out numbers 1-10 as complete words
        const spelledNumbers = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN'];
        if (spelledNumbers.some(num => new RegExp(`^${num}\\s`).test(trimmed))) return true;

        // Check if starts with PO or P.O. variations including BOX, POBOX
        if (trimmed.startsWith('PO ') || trimmed.startsWith('P.O.') || trimmed.startsWith('P.O ') ||
            trimmed.startsWith('PO.') || trimmed.startsWith('P O ') ||
            trimmed.startsWith('BOX ') || trimmed.startsWith('POBOX ')) return true;

        // Check if starts with Block Island street name using existing utility function
        if (typeof findBlockIslandStreetMatch !== 'undefined') {
            const matchedStreet = findBlockIslandStreetMatch([trimmed]);
            if (matchedStreet) return true; // Treat as "starts with address" = passes neither
        }

        return false;
    }

    // Split using same logic as secondaryAddressAnalysis.js
    const primaryParts = addressString.split('::#^#::');
    const parts = primaryParts.flatMap(part => part.split(':^#^:'));

    if (parts.length < 3) {
        // Not enough parts for our criteria
        return { recipientDetails: null, addressString: addressString };
    }

    const firstPart = parts[0].trim();

    // Test criteria for Groups A, C, and three-part group
    const hasBusinessOrCO = hasBusinessTerm(firstPart) || containsCO(firstPart);
    const doesNotBeginWithNumOrPO = !beginsWithNumberOrPO(firstPart);

    let shouldExtract = false;

    if (parts.length === 4) {
        // Four-part analysis: Group A (both criteria) or Group C (only second criteria)
        if ((hasBusinessOrCO && doesNotBeginWithNumOrPO) || // Group A
            (!hasBusinessOrCO && doesNotBeginWithNumOrPO)) { // Group C
            shouldExtract = true;
        }
    } else if (parts.length === 3) {
        // Three-part analysis: Has Business/C-O OR does not begin with Number/PO
        if (hasBusinessOrCO || doesNotBeginWithNumOrPO) {
            shouldExtract = true;
        }
    }

    if (shouldExtract) {
        // Extract first part as recipient details and remove from address string
        const firstTagIndex = addressString.indexOf('::#^#::');
        if (firstTagIndex !== -1) {
            const recipientDetails = addressString.substring(0, firstTagIndex).trim();
            const remainingAddress = addressString.substring(firstTagIndex + 7).trim(); // Remove "::#^#::" too
            return { recipientDetails, addressString: remainingAddress };
        }
    }

    return { recipientDetails: null, addressString: addressString };
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
    // Extract recipient details before VisionAppraisal tag cleaning
    const recipientExtractionResult = extractRecipientDetails(addressString.trim());
    const finalAddressString = recipientExtractionResult.addressString;
    const recipientDetails = recipientExtractionResult.recipientDetails;

    // Apply VisionAppraisal tag cleaning immediately before parsing
    const cleanedAddressString = cleanVisionAppraisalTags(finalAddressString);

    // Block Island placeholder number logic - check BEFORE parsing
    const preParseCheck = preParseBlockIslandCheck(finalAddressString.trim(), sourceType, fieldName);
    let addressForParsing = cleanedAddressString;
    let usedPlaceholderNumber = false;

    // If Block Island address + matched street + no leading number, insert placeholder
    if (preParseCheck.isBlockIsland && preParseCheck.matchedStreet) {
        const startsWithNumber = /^\d+\s/.test(cleanedAddressString.trim());
        if (!startsWithNumber) {
            addressForParsing = "9999 " + cleanedAddressString;
            usedPlaceholderNumber = true;
        }
    }

    const parsed = parseAddress.parseLocation(addressForParsing);

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
    const processedAddress = createProcessedAddressObject(normalized, addressString, sourceType, fieldName, usedPlaceholderNumber, recipientDetails);

    // Apply detection results to address object (new two-variable system)
    processedAddress.isBlockIslandAddress = detectionResult.isBI;
    processedAddress.needsBlockIslandForcing = detectionResult.needsForcing;
    processedAddress.blockIslandDetectionMethod = detectionResult.method;
    if (detectionResult.matchedStreet) {
        processedAddress.matchedStreet = detectionResult.matchedStreet;
    }

    // Restore street number to null if placeholder was used (applies to both paths)
    if (usedPlaceholderNumber && processedAddress.number === "9999") {
        processedAddress.number = null;
        processedAddress.placeholderNumberRemoved = true;

        // Log unexpected restoration in non-Block Island path
        if (!detectionResult.isBI) {
            console.warn('Unexpected: Restored placeholder in non-Block Island address', {
                address: addressString,
                preParseBI: preParseCheck.isBlockIsland,
                fullDetectionBI: detectionResult.isBI,
                preParseMethod: preParseCheck.matchedStreet ? 'street' : 'visionappraisal',
                fullDetectionMethod: detectionResult.method
            });
        }
    }

    // Phase 3 Step 3.2: Two-Path Processing Decision Logic
    if (detectionResult.isBI) {
        // Path A: Block Island addresses → specialized processing
        return createBlockIslandAddress(normalized, addressString, sourceType, fieldName, detectionResult.matchedStreet, usedPlaceholderNumber);
    } else {
        // Path B: Non-Block Island addresses → apply suffix processing if needed
        if (normalized.street && normalized.suffix) {
            const addressPart = addressString.split('::#^#::')[0];
            const streetWithoutNumber = normalized.number
                ? addressPart.replace(new RegExp(`^\\s*${normalized.number}\\s+`), '')
                : addressPart;


            processedAddress.street = streetWithoutNumber;
        }

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

        // Use shared helper function for street matching with corroboration
        const streetMatchResult = checkBlockIslandStreetMatch(processedAddress.original || '', streetChecks);
        if (streetMatchResult.isMatch) {
            processedAddress.city = 'Block Island';
            processedAddress.state = 'RI';
            processedAddress.zip = '02807';
            processedAddress.isBlockIslandAddress = true;
            processedAddress.blockIslandReason = `Matched BI street: ${streetMatchResult.matchedStreet}`;

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