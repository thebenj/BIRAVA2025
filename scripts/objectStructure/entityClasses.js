/**
 * Entity Classes for BIRAVA2025 Individual and Household Records
 *
 * This file contains the class definitions for Individual and Household entities
 * used in the entity resolution system.
 *
 * ARCHITECTURE:
 * - Entity base class contains locationIdentifier (Fire Number > PID > Street Address)
 * - Entity name property holds IndividualName or HouseholdName in IdentifyingData containers
 * - Contact information stored as IndicativeData fields
 * - Communications Hierarchy: Email > (BI PO Box OR Off-island primary) > Off-island only
 */

// ============================================================================
// COMBINED ADDRESS DETECTION AND SPLITTING
// Handles VisionAppraisal addresses containing both PO Box and street address
// ============================================================================

const COMBINED_ADDRESS_PATTERNS = {
    PO_BOX: [
        /^P\.?\s*O\.?\s*BOX\s+[A-Z0-9]+/i,  // PO BOX 123, P.O. BOX 123
        /^POST\s*OFFICE\s*BOX\s+[A-Z0-9]+/i, // POST OFFICE BOX 123
        /^PO\s*BO\s*X\s*[A-Z0-9]+/i,        // PO BO X302 (typo)
        /^BOX\s+[A-Z0-9]+/i                  // BOX 123
    ],
    STREET: /^\d+\s+[A-Z]/i  // Starts with number followed by letter
};

/**
 * Clean VisionAppraisal tags from a string for pattern matching
 */
function cleanTagsForPatternMatching(str) {
    if (!str) return '';
    return str
        .replace(/:\^#\^:/g, ', ')      // :^#^: → comma+space
        .replace(/::#\^#::/g, ', ')     // ::#^#:: → comma+space
        .trim();
}

/**
 * Check if a line looks like a PO Box address
 */
function isPOBoxLine(line) {
    const cleaned = cleanTagsForPatternMatching(line);
    return COMBINED_ADDRESS_PATTERNS.PO_BOX.some(pattern => pattern.test(cleaned));
}

/**
 * Check if a line looks like a street address (starts with number + letter)
 */
function isStreetAddressLine(line) {
    const cleaned = cleanTagsForPatternMatching(line);
    return COMBINED_ADDRESS_PATTERNS.STREET.test(cleaned);
}

/**
 * Clean up empty segments after removing text from address
 */
function cleanupEmptySegments(str, delimiter) {
    if (!str) return '';

    let result = str;
    const delimEscaped = delimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const doubleDelimPattern = new RegExp(delimEscaped + '\\s*' + delimEscaped, 'g');

    // Keep replacing until no more double delimiters
    let previousResult;
    do {
        previousResult = result;
        result = result.replace(doubleDelimPattern, delimiter);
    } while (result !== previousResult);

    // Remove leading and trailing delimiters
    const leadingPattern = new RegExp('^\\s*' + delimEscaped + '\\s*');
    const trailingPattern = new RegExp('\\s*' + delimEscaped + '\\s*$');
    result = result.replace(leadingPattern, '').replace(trailingPattern, '').trim();

    return result;
}

/**
 * Analyze an address string to detect if it contains both PO Box and street address
 * @param {string} rawAddress - Raw address with VisionAppraisal tags
 * @returns {Object} Analysis result with shouldSplit flag and split addresses if applicable
 */
function analyzeCombinedAddress(rawAddress) {
    const result = {
        original: rawAddress,
        shouldSplit: false,
        poBoxLine: null,
        streetLine: null,
        splitAddresses: null
    };

    if (!rawAddress || typeof rawAddress !== 'string') {
        return result;
    }

    // Split on VisionAppraisal tags to get lines
    const lines = rawAddress
        .split(/::#\^#::|:\^#\^:/)
        .map(l => l.trim())
        .filter(l => l.length > 0);

    // Analyze each line
    for (const line of lines) {
        if (isPOBoxLine(line)) result.poBoxLine = line;
        if (isStreetAddressLine(line) && !isPOBoxLine(line)) result.streetLine = line;
    }

    // If both PO Box and street address found, build split versions
    if (result.poBoxLine && result.streetLine) {
        result.shouldSplit = true;

        // VisionAppraisal delimiter patterns
        const DELIMITERS = ['::#^#::', ':^#^:'];

        // Version 1: Remove street address, keep PO Box + city/state/zip
        let poBoxVersion = rawAddress.replace(result.streetLine, '');
        for (const delim of DELIMITERS) {
            poBoxVersion = cleanupEmptySegments(poBoxVersion, delim);
        }

        // Version 2: Remove PO Box, keep street + city/state/zip
        let streetVersion = rawAddress.replace(result.poBoxLine, '');
        for (const delim of DELIMITERS) {
            streetVersion = cleanupEmptySegments(streetVersion, delim);
        }

        result.splitAddresses = {
            poBoxAddress: poBoxVersion,
            streetAddress: streetVersion
        };
    }

    return result;
}

/**
 * Entity - Top level parent class
 * Base class for all entity types in the system
 */
class Entity {
    constructor(locationIdentifier, name, propertyLocation = null, ownerAddress = null, accountNumber = null) {
        // Location identifier: Fire Number (primary) or PID (secondary)
        // Type: FireNumber or PID (both SimpleIdentifier subclasses)
        // Fire Numbers: integer 4 digits or less <3500, definitive for Block Island locations
        // PIDs: only when Fire Number unavailable, should have 1:1 relationship with Fire Numbers
        // Note: Bloomerang entities without location data use placeholder FireNumber 3499
        this.locationIdentifier = locationIdentifier;

        // Entity name: IndividualName or HouseholdName
        // Type: IdentifyingData containing ComplexIdentifiers (IndividualName or HouseholdName)
        this.name = name;

        // Account Number (IndicativeData - not contact info but available for every Bloomerang record)
        this.accountNumber = accountNumber;

        // Contact information - will be instantiated if address processing occurs
        this.contactInfo = null;

        // Other information (OtherInfo object added separately)
        // Holds non-contact IndicativeData objects (account numbers, transaction data, etc.)
        this.otherInfo = null;

        // Legacy information (LegacyInfo object added separately)
        // Holds legacy data fields for historical/reference purposes
        this.legacyInfo = null;

        // Process address parameters if provided
        this._processAddressParameters(propertyLocation, ownerAddress);

        // Weighted comparison architecture properties
        this.comparisonWeights = null;                    // Object: {propName: weight, ...}
        this.comparisonCalculatorName = 'defaultWeightedComparison';  // Serializable string name
        this.comparisonCalculator = resolveComparisonCalculator(this.comparisonCalculatorName); // Resolved function

    }

    /**
     * Process propertyLocation and ownerAddress parameters
     * Handles four cases: a) text b) Address object c) complex identifier d) other
     * @param {*} propertyLocation - Property location parameter (various types)
     * @param {*} ownerAddress - Owner address parameter (various types)
     * @private
     */
    _processAddressParameters(propertyLocation, ownerAddress) {
        let propertyAddressObject = null;
        let ownerAddressObject = null;

        // Process propertyLocation parameter
        if (propertyLocation !== null) {
            const propertyType = this._detectParameterType(propertyLocation);

            if (propertyType === 'text') {
                // Case a) Text - pass through address parser
                propertyAddressObject = this._processTextToAddressNew(propertyLocation, 'propertyLocation');
            } else if (propertyType === 'address') {
                // Case b) Address object - direct use
                propertyAddressObject = propertyLocation;
            } else if (propertyType === 'complexIdentifier') {
                // Case c) Complex identifier - identification setup, no action yet
                console.log('Complex identifier detected for propertyLocation - no processing implemented yet');
            } else {
                // Case d) Other - identification setup, no action yet
                console.log(`Other type detected for propertyLocation: ${propertyType} - no processing implemented yet`);
            }
        }

        // Process ownerAddress parameter
        // Track multiple owner address objects for combined address case
        let ownerAddressObjects = [];

        if (ownerAddress !== null) {
            const ownerType = this._detectParameterType(ownerAddress);

            if (ownerType === 'text') {
                // Case a) Text - check for combined PO Box + street address first
                const combinedAnalysis = analyzeCombinedAddress(ownerAddress);

                if (combinedAnalysis.shouldSplit) {
                    // Combined address detected - create two Address objects
                    // PO Box is added FIRST (index 0), street address SECOND (index 1)
                    const poBoxAddressObj = this._processTextToAddressNew(
                        combinedAnalysis.splitAddresses.poBoxAddress,
                        'ownerAddress'
                    );
                    const streetAddressObj = this._processTextToAddressNew(
                        combinedAnalysis.splitAddresses.streetAddress,
                        'ownerAddress'
                    );

                    // Order matters: PO Box first, street second
                    if (poBoxAddressObj) ownerAddressObjects.push(poBoxAddressObj);
                    if (streetAddressObj) ownerAddressObjects.push(streetAddressObj);
                } else {
                    // Normal single address - pass through address parser
                    ownerAddressObject = this._processTextToAddressNew(ownerAddress, 'ownerAddress');
                    if (ownerAddressObject) ownerAddressObjects.push(ownerAddressObject);
                }
            } else if (ownerType === 'address') {
                // Case b) Address object - direct use
                ownerAddressObject = ownerAddress;
                ownerAddressObjects.push(ownerAddressObject);
            } else if (ownerType === 'complexIdentifier') {
                // Case c) Complex identifier - identification setup, no action yet
                console.log('Complex identifier detected for ownerAddress - no processing implemented yet');
            } else {
                // Case d) Other - identification setup, no action yet
                console.log(`Other type detected for ownerAddress: ${ownerType} - no processing implemented yet`);
            }
        }

        // If we have valid Address objects, instantiate ContactInfo and assign them
        if (propertyAddressObject || ownerAddressObjects.length > 0) {
            if (!this.contactInfo) {
                this.contactInfo = new ContactInfo();
            }

            if (propertyAddressObject) {
                this.contactInfo.setPrimaryAddress(propertyAddressObject);
            }

            // Add all owner address objects as secondary addresses
            for (const addrObj of ownerAddressObjects) {
                this.contactInfo.addSecondaryAddress(addrObj);
            }
        }
    }

    /**
     * Detect the type of a parameter
     * @param {*} parameter - Parameter to analyze
     * @returns {string} Type identifier: 'text', 'address', 'complexIdentifier', 'other'
     * @private
     */
    _detectParameterType(parameter) {
        if (typeof parameter === 'string') {
            return 'text';
        } else if (parameter && typeof parameter === 'object') {
            // Check if it's an Address object
            if (parameter.constructor && parameter.constructor.name === 'Address') {
                return 'address';
            }
            // Check if it's a ComplexIdentifier (would have primaryAlias property)
            else if (parameter.primaryAlias !== undefined) {
                return 'complexIdentifier';
            }
            // Check if it's any other ComplexIdentifier subclass
            else if (parameter.constructor &&
                     typeof parameter.constructor.name === 'string' &&
                     parameter.constructor.name.includes('Identifiers')) {
                return 'complexIdentifier';
            }
        }
        return 'other';
    }

    // RETIRED: Phase 3 migration complete - replaced by _processTextToAddressNew
    /*
    _processTextToAddress(addressText, fieldName) {
        try {
            if (typeof processAddress === 'function' && typeof createAddressFromParsedData === 'function') {
                const processedAddress = processAddress(addressText, 'VisionAppraisal', fieldName);
                if (processedAddress) {
                    return createAddressFromParsedData(processedAddress, fieldName);
                }
            } else {
                console.warn('Address processing functions not available - processAddress or createAddressFromParsedData not found');
            }
        } catch (error) {
            console.error('Error processing text address:', error);
        }
        return null;
    }
    */

    /**
     * PHASE 2 PARALLEL: Process text to address using generalized architecture
     *
     * This method implements the new generalized address processing architecture
     * alongside the original _processTextToAddress for validation purposes.
     *
     * PARALLEL IMPLEMENTATION STRATEGY:
     * - Uses processAddressGeneralized with VisionAppraisal configuration
     * - Runs in parallel with original method for comparison testing
     * - Ensures new architecture produces identical results to original
     *
     * @param {string} addressText - Raw address text to process
     * @param {string} fieldName - Field name for data lineage
     * @returns {Address|null} Address object using new architecture, or null if processing failed
     * @private
     */
    _processTextToAddressNew(addressText, fieldName) {
        try {
            // Use the NEW generalized address processing architecture
            if (typeof processAddressGeneralized === 'function' && typeof createAddressFromParsedData === 'function') {
                // VisionAppraisal configuration for generalized architecture
                const visionAppraisalConfig = {
                    sourceType: 'VisionAppraisal',
                    preprocess: preprocessAddress,
                    postProcess: postProcessAddress
                };

                const processedAddress = processAddressGeneralized(addressText, visionAppraisalConfig);
                if (processedAddress) {
                    return createAddressFromParsedData(processedAddress, fieldName);
                }
            } else {
                console.warn('Generalized address processing functions not available - processAddressGeneralized or createAddressFromParsedData not found');
            }
        } catch (error) {
            console.error('Error processing text address with new architecture:', error);
        }
        return null;
    }

    /**
     * Add contact information to this entity
     * @param {ContactInfo} contactInfoObject - ContactInfo instance containing contact-related IndicativeData
     */
    addContactInfo(contactInfoObject) {
        this.contactInfo = contactInfoObject;
    }

    /**
     * Add other information to this entity
     * @param {OtherInfo} otherInfoObject - OtherInfo instance containing non-contact IndicativeData
     */
    addOtherInfo(otherInfoObject) {
        this.otherInfo = otherInfoObject;
    }

    /**
     * Add legacy information to this entity
     * @param {LegacyInfo} legacyInfoObject - LegacyInfo instance containing legacy data fields
     */
    addLegacyInfo(legacyInfoObject) {
        this.legacyInfo = legacyInfoObject;
    }

    /**
     * Add or update account number for this entity
     * @param {IndicativeData} accountNumberIndicativeData - IndicativeData containing account number
     */
    addAccountNumber(accountNumberIndicativeData) {
        this.accountNumber = accountNumberIndicativeData;
    }

    /**
     * Create a ParticipantDescription for this entity
     * Used to identify this entity in comparison results for later retrieval
     *
     * Entity Key Rules:
     * - Bloomerang Individual: accountNumber
     * - Bloomerang AggregateHousehold: accountNumber
     * - VisionAppraisal Individual (standalone): locationIdentifier
     * - VisionAppraisal Individual (in household): IndividualName object
     * - VisionAppraisal AggregateHousehold/Business/LegalConstruct: locationIdentifier
     *
     * @returns {ParticipantDescription} Description of this entity for comparison tracking
     */
    getParticipantDescription() {
        const entityType = this.constructor.name;
        const dataSource = this._normalizeDataSource();

        // Determine entity key based on data source and entity type
        let entityKey;
        if (dataSource === 'bloomerang') {
            // Bloomerang entities use accountNumber
            entityKey = this.accountNumber?.term || this.accountNumber || this.locationIdentifier;
        } else {
            // VisionAppraisal entities use locationIdentifier
            entityKey = this.locationIdentifier;
        }

        return new ParticipantDescription(entityType, entityKey, dataSource, null);
    }

    /**
     * Normalize the source property to standard format
     * @returns {string} 'visionAppraisal' or 'bloomerang'
     * @private
     */
    _normalizeDataSource() {
        const source = this.source || '';
        if (source.toLowerCase().includes('vision') || source === 'VISION_APPRAISAL') {
            return 'visionAppraisal';
        }
        if (source.toLowerCase().includes('bloomerang')) {
            return 'bloomerang';
        }
        // Default based on presence of accountNumber (Bloomerang has it)
        if (this.accountNumber) {
            return 'bloomerang';
        }
        return 'visionAppraisal';
    }

    /**
     * Compare this entity to another entity using weighted comparison
     * Uses the comparisonCalculator function set by initializeWeightedComparison()
     * Follows the compareTo architecture: each class handles its own comparison logic
     *
     * @param {Entity} otherEntity - The entity to compare against
     * @param {boolean} detailed - If true, returns detailed breakdown object instead of number
     * @returns {number|Object} Similarity score 0-1, or if detailed=true: {overallSimilarity, components, checkSum, participants}
     */
    compareTo(otherEntity, detailed = false) {
        if (!otherEntity) {
            if (!detailed) return 0;
            return { overallSimilarity: 0, components: {}, checkSum: 0, participants: null };
        }

        // Use the comparison calculator if available
        if (this.comparisonCalculator && typeof this.comparisonCalculator === 'function') {
            const result = this.comparisonCalculator.call(this, otherEntity, detailed);

            // If not detailed, calculator returns number - pass through directly
            if (!detailed) {
                return result;
            }

            // If detailed, calculator returns {overallSimilarity, components, checkSum}
            // Add participants to the result
            const participants = new ComparisonParticipants(
                this.getParticipantDescription(),
                otherEntity.getParticipantDescription()
            );

            return {
                overallSimilarity: result.overallSimilarity,
                components: result.components,
                checkSum: result.checkSum,
                penalties: result.penalties,
                subordinateDetails: result.subordinateDetails,
                participants: participants
            };
        }

        // Fallback to generic comparison if no calculator set
        const result = genericObjectCompareTo(this, otherEntity, [], detailed);
        if (!detailed) {
            return result;
        }

        // For detailed fallback, create participants
        const participants = new ComparisonParticipants(
            this.getParticipantDescription(),
            otherEntity.getParticipantDescription()
        );
        // If genericObjectCompareTo returned an object (detailed mode), use it; otherwise wrap the number
        const similarity = typeof result === 'object' ? result.overallSimilarity : result;
        const components = typeof result === 'object' ? result.components : {};
        return { overallSimilarity: similarity, components: components, checkSum: 0, participants: participants };
    }

    /**
     * Deserialize Entity from JSON object
     * Uses constructor (initialization logic runs) then iterates over properties
     * @param {Object} data - Serialized data
     * @returns {Entity} Reconstructed Entity instance
     */
    static deserialize(data) {
        if (data.type !== 'Entity') {
            throw new Error('Invalid Entity serialization format');
        }

        // Create entity via constructor with core identifying properties
        // Constructor runs initialization logic
        const entity = new Entity(data.locationIdentifier, data.name, null, null, data.accountNumber);

        // Iterate over all properties in serialized data and assign to entity
        Object.keys(data).forEach(key => {
            if (key === 'type' || key === 'locationIdentifier' || key === 'name' || key === 'accountNumber') {
                // Skip - already handled by constructor or metadata only
                return;
            }
            if (key === 'comparisonCalculator') {
                // Skip - function reference, resolve from name instead
                return;
            }
            if (data[key] === null || data[key] === undefined) {
                entity[key] = null;
                return;
            }

            // Special handling for known complex types
            if (key === 'comparisonCalculatorName') {
                entity.comparisonCalculatorName = data[key];
                entity.comparisonCalculator = resolveComparisonCalculator(data[key]);
            } else if (key === 'contactInfo') {
                // ContactInfo - already deserialized by bottom-up reviver or needs deserialization
                entity.contactInfo = data[key];
            } else if (key === 'otherInfo') {
                // OtherInfo - already deserialized by bottom-up reviver or needs deserialization
                entity.otherInfo = data[key];
            } else if (key === 'legacyInfo') {
                // LegacyInfo - already deserialized by bottom-up reviver or needs deserialization
                entity.legacyInfo = data[key];
            } else {
                // All other properties - direct assignment
                entity[key] = data[key];
            }
        });

        return entity;
    }

    /**
     * Factory method for deserialization - creates instance via constructor
     * This is the preferred entry point for deserializeWithTypes to use
     * Uses 'this' for polymorphic dispatch so subclasses use their own deserialize
     * @param {Object} data - Serialized data object
     * @returns {Entity} Reconstructed instance (Entity or subclass)
     */
    static fromSerializedData(data) {
        // 'this' refers to the actual class called (Individual, AggregateHousehold, etc.)
        // not necessarily Entity, enabling polymorphic deserialization
        return this.deserialize(data);
    }

    /**
     * Generate summary string for file naming
     * @returns {string} Summary suitable for filenames
     */
    generateSummary() {
        const nameStr = this.name && this.name.identifier && this.name.identifier.primaryAlias
            ? this.name.identifier.primaryAlias.term.replace(/[^a-zA-Z0-9]/g, '_')
            : 'UnknownName';

        const locationStr = this.locationIdentifier && this.locationIdentifier.identifier && this.locationIdentifier.identifier.primaryAlias
            ? this.locationIdentifier.identifier.primaryAlias.term.toString().replace(/[^a-zA-Z0-9]/g, '_')
            : 'UnknownLocation';

        const entityType = this.constructor.name;

        return `${entityType}_${nameStr}_${locationStr}`.substring(0, 100); // Limit length for filesystem
    }

    /**
     * Universal entity deserializer - determines type and calls appropriate deserializer
     * @param {Object} data - Serialized entity data
     * @returns {Entity} Reconstructed entity instance of appropriate type
     */
    static deserializeAny(data) {
        if (!data || !data.type) {
            throw new Error('Invalid entity data: missing type information');
        }

        switch (data.type) {
            case 'Entity':
                return Entity.deserialize(data);
            case 'Individual':
                return Individual.deserialize(data);
            case 'CompositeHousehold':
                return CompositeHousehold.deserialize(data);
            case 'AggregateHousehold':
                return AggregateHousehold.deserialize(data);
            case 'NonHuman':
                return NonHuman.deserialize(data);
            case 'Business':
                return Business.deserialize(data);
            case 'LegalConstruct':
                return LegalConstruct.deserialize(data);
            default:
                throw new Error(`Unknown entity type: ${data.type}`);
        }
    }
}

/**
 * Individual - Subclass of Entity
 * Represents individual persons
 * name property should contain IdentifyingData with IndividualName ComplexIdentifiers
 */
class Individual extends Entity {
    constructor(locationIdentifier, name, propertyLocation = null, ownerAddress = null, accountNumber = null) {
        super(locationIdentifier, name, propertyLocation, ownerAddress, accountNumber);
        // Inherited this.name should contain IdentifyingData(IndividualName)
        this.initializeWeightedComparison();
    }

    /**
     * Initialize weighted comparison properties for Individual entities
     * Uses entityWeightedComparison calculator which compares:
     * - name (IndividualName) with highest weight
     * - contactInfo (addresses + email)
     * - otherInfo and legacyInfo if present
     * Called from constructor to enable weighted Entity.compareTo()
     */
    initializeWeightedComparison() {
        // Individual entities weight name heavily since it's the primary identifier
        this.comparisonWeights = {
            name: 0.5,
            contactInfo: 0.3,
            otherInfo: 0.15,
            legacyInfo: 0.05
        };
        this.comparisonCalculatorName = 'entityWeightedComparison';
        this.comparisonCalculator = resolveComparisonCalculator(this.comparisonCalculatorName);
    }

    /**
     * Deserialize Individual from JSON object
     * Iterates over all properties in serialized data (no hardcoded property list)
     * @param {Object} data - Serialized data
     * @returns {Individual} Reconstructed Individual instance
     */
    static deserialize(data) {
        if (data.type !== 'Individual') {
            throw new Error('Invalid Individual serialization format');
        }

        // Create Individual with constructor parameters
        const individual = new Individual(data.locationIdentifier, data.name, null, null, data.accountNumber);

        // Iterate over all properties in serialized data
        Object.keys(data).forEach(key => {
            // Skip type marker and constructor parameters (already handled)
            if (key === 'type' || key === 'locationIdentifier' || key === 'name' || key === 'accountNumber') {
                return;
            }
            // Skip function references that cannot be serialized
            if (key === 'comparisonCalculator') {
                return;
            }

            // Handle null/undefined
            if (data[key] === null || data[key] === undefined) {
                individual[key] = null;
                return;
            }

            // Handle comparison calculator name - resolve to function
            if (key === 'comparisonCalculatorName') {
                individual.comparisonCalculatorName = data[key];
                individual.comparisonCalculator = resolveComparisonCalculator(data[key]);
            } else {
                // All other properties - already deserialized by deserializeWithTypes bottom-up processing
                individual[key] = data[key];
            }
        });

        return individual;
    }
}

/**
 * CompositeHousehold - Subclass of Entity
 * This class is for recognized households for which we do not have instantiated individuals
 * name property should contain IdentifyingData with HouseholdName ComplexIdentifiers
 */
class CompositeHousehold extends Entity {
    constructor(locationIdentifier, name, propertyLocation = null, ownerAddress = null, accountNumber = null) {
        super(locationIdentifier, name, propertyLocation, ownerAddress, accountNumber);
        // Inherited this.name should contain IdentifyingData(HouseholdName)
    }

    /**
     * Deserialize CompositeHousehold from JSON object
     * Iterates over all properties in serialized data (no hardcoded property list)
     * @param {Object} data - Serialized data
     * @returns {CompositeHousehold} Reconstructed CompositeHousehold instance
     */
    static deserialize(data) {
        if (data.type !== 'CompositeHousehold') {
            throw new Error('Invalid CompositeHousehold serialization format');
        }

        // Create CompositeHousehold with constructor parameters
        const household = new CompositeHousehold(data.locationIdentifier, data.name, null, null, data.accountNumber);

        // Iterate over all properties in serialized data
        Object.keys(data).forEach(key => {
            // Skip type marker and constructor parameters (already handled)
            if (key === 'type' || key === 'locationIdentifier' || key === 'name' || key === 'accountNumber') {
                return;
            }
            // Skip function references that cannot be serialized
            if (key === 'comparisonCalculator') {
                return;
            }

            // Handle null/undefined
            if (data[key] === null || data[key] === undefined) {
                household[key] = null;
                return;
            }

            // Handle comparison calculator name - resolve to function
            if (key === 'comparisonCalculatorName') {
                household.comparisonCalculatorName = data[key];
                household.comparisonCalculator = resolveComparisonCalculator(data[key]);
            } else {
                // All other properties - already deserialized by deserializeWithTypes bottom-up processing
                household[key] = data[key];
            }
        });

        return household;
    }
}

/**
 * AggregateHousehold - Subclass of Entity
 * This class will collect individuals who are associated by household that are also
 * instantiated objects on their own. This class will have an array of individuals as a property.
 * name property should contain IdentifyingData with HouseholdName ComplexIdentifiers (synthesized)
 *
 * MEMBER ACCESS GUIDANCE (Session 29):
 * Two properties provide access to household members:
 *
 * 1. this.individuals[] - Array of Individual OBJECTS
 *    - VisionAppraisal: ONLY option (VA individuals are not standalone keyed entities)
 *    - Bloomerang: Contains SNAPSHOT copies (may drift from canonical data after serialization)
 *    - Use when: Uniform access across data sources is needed, or database not available
 *
 * 2. this.individualKeys[] - Array of database KEY STRINGS (Bloomerang only)
 *    - Set during unifiedDatabasePersistence.js buildUnifiedEntityDatabase() Pass 4
 *    - Look up canonical entities via: unifiedEntityDatabase.entities[key]
 *    - Use when: Canonical/current data is needed and database is loaded
 *
 * Future data sources may follow either pattern. Check for individualKeys[] availability
 * before deciding which approach to use.
 */
class AggregateHousehold extends Entity {
    constructor(locationIdentifier, name, propertyLocation = null, ownerAddress = null, accountNumber = null) {
        super(locationIdentifier, name, propertyLocation, ownerAddress, accountNumber);
        this.individuals = []; // Array of Individual objects (see guidance above)
        // Inherited this.name should contain IdentifyingData(HouseholdName) - typically synthesized
        this.initializeWeightedComparison();
    }

    /**
     * Initialize weighted comparison properties for AggregateHousehold entities
     * Uses entityWeightedComparison calculator which compares:
     * - name (HouseholdName) - weighted less than Individual since household names are synthesized
     * - contactInfo (addresses + email) - weighted more since address is key identifier for households
     * - otherInfo and legacyInfo if present
     * Called from constructor to enable weighted Entity.compareTo()
     */
    initializeWeightedComparison() {
        // Household entities weight contactInfo more heavily since address is key identifier
        // Name is weighted less since household names are often synthesized/approximate
        this.comparisonWeights = {
            name: 0.4,
            contactInfo: 0.4,
            otherInfo: 0.15,
            legacyInfo: 0.05
        };
        this.comparisonCalculatorName = 'entityWeightedComparison';
        this.comparisonCalculator = resolveComparisonCalculator(this.comparisonCalculatorName);
    }

    /**
     * Deserialize AggregateHousehold from JSON object
     * Iterates over all properties in serialized data (no hardcoded property list)
     * @param {Object} data - Serialized data
     * @returns {AggregateHousehold} Reconstructed AggregateHousehold instance
     */
    static deserialize(data) {
        if (data.type !== 'AggregateHousehold') {
            throw new Error('Invalid AggregateHousehold serialization format');
        }

        // Create AggregateHousehold with constructor parameters
        const household = new AggregateHousehold(data.locationIdentifier, data.name, null, null, data.accountNumber);

        // Iterate over all properties in serialized data
        Object.keys(data).forEach(key => {
            // Skip type marker and constructor parameters (already handled)
            if (key === 'type' || key === 'locationIdentifier' || key === 'name' || key === 'accountNumber') {
                return;
            }
            // Skip function references that cannot be serialized
            if (key === 'comparisonCalculator') {
                return;
            }

            // Handle null/undefined
            if (data[key] === null || data[key] === undefined) {
                household[key] = null;
                return;
            }

            // Handle comparison calculator name - resolve to function
            if (key === 'comparisonCalculatorName') {
                household.comparisonCalculatorName = data[key];
                household.comparisonCalculator = resolveComparisonCalculator(data[key]);
            } else if (key === 'individuals') {
                // Special handling for individuals array - may already be deserialized instances
                household.individuals = data.individuals.map(individualData => {
                    // Check if already deserialized by JSON.parse reviver (bottom-up processing)
                    if (individualData instanceof Individual) {
                        return individualData; // Already an instance, pass through
                    }
                    if (individualData instanceof Entity) {
                        return individualData; // Already an Entity subclass instance
                    }
                    // Raw data - deserialize based on type
                    switch (individualData.type) {
                        case 'Individual':
                            return Individual.deserialize(individualData);
                        default:
                            return Entity.deserialize(individualData);
                    }
                });
            } else {
                // All other properties - already deserialized by deserializeWithTypes bottom-up processing
                household[key] = data[key];
            }
        });

        return household;
    }

    /**
     * Retrieve an individual from the individuals array by identifier
     * Used to re-locate a specific individual after a comparison operation
     *
     * Algorithm:
     * 1. If passed just an index (number), return the individual at that index
     * 2. If passed a ParticipantDescription:
     *    a. First try the index from parentDescription
     *    b. Verify the key matches the individual at that index
     *    c. If no match, search through all individuals for matching key
     *    d. Return null if no match found
     *
     * @param {number|ParticipantDescription} indexOrParticipantDescription - Index or ParticipantDescription
     * @returns {Individual|null} The matching individual, or null if not found
     */
    getIndividualByIdentifier(indexOrParticipantDescription) {
        // Handle empty individuals array
        if (!this.individuals || this.individuals.length === 0) {
            return null;
        }

        // If passed a simple number, treat as index
        if (typeof indexOrParticipantDescription === 'number') {
            const index = indexOrParticipantDescription;
            if (index >= 0 && index < this.individuals.length) {
                return this.individuals[index];
            }
            return null;
        }

        // Otherwise, expect a ParticipantDescription
        const participantDesc = indexOrParticipantDescription;
        if (!participantDesc || !participantDesc.parentDescription) {
            return null;
        }

        const index = participantDesc.parentDescription.index;
        const keyToMatch = participantDesc.entityKey; // IndividualName for VA individuals in household

        // First, try the index
        if (index !== null && index >= 0 && index < this.individuals.length) {
            const itemAtIndex = this.individuals[index];
            if (this._keyMatchesIndividual(itemAtIndex, keyToMatch)) {
                return itemAtIndex;
            }
        }

        // If key doesn't match at index, search the array
        for (const individual of this.individuals) {
            if (this._keyMatchesIndividual(individual, keyToMatch)) {
                return individual;
            }
        }

        // No match found
        return null;
    }

    /**
     * Check if an individual's key matches the provided key
     * For VisionAppraisal individuals in households, the key is an IndividualName
     *
     * @param {Individual} individual - The individual to check
     * @param {IndividualName|string|number} key - The key to match against
     * @returns {boolean} True if the key matches
     * @private
     */
    _keyMatchesIndividual(individual, key) {
        if (!individual || !key) {
            return false;
        }

        // If key is an IndividualName, compare the name objects
        if (key.constructor && key.constructor.name === 'IndividualName') {
            // Compare IndividualName objects
            const individualName = individual.name;
            if (!individualName) {
                return false;
            }

            // If the individual's name is also an IndividualName, compare key fields
            if (individualName.constructor && individualName.constructor.name === 'IndividualName') {
                // Compare firstName, lastName, otherNames
                return (
                    individualName.firstName === key.firstName &&
                    individualName.lastName === key.lastName &&
                    JSON.stringify(individualName.otherNames) === JSON.stringify(key.otherNames)
                );
            }
            return false;
        }

        // If key is a string or number (locationIdentifier or accountNumber)
        if (typeof key === 'string' || typeof key === 'number') {
            // Check locationIdentifier
            if (individual.locationIdentifier === key) {
                return true;
            }
            // Check accountNumber
            if (individual.accountNumber && individual.accountNumber.term === key) {
                return true;
            }
            if (individual.accountNumber === key) {
                return true;
            }
        }

        return false;
    }
}

/**
 * NonHuman - Subclass of Entity, parent to Business and LegalConstruct
 * Base class for non-human entities
 */
class NonHuman extends Entity {
    constructor(locationIdentifier, name, propertyLocation = null, ownerAddress = null, accountNumber = null) {
        super(locationIdentifier, name, propertyLocation, ownerAddress, accountNumber);
    }

    /**
     * Deserialize NonHuman from JSON object
     * Iterates over all properties in serialized data (no hardcoded property list)
     * @param {Object} data - Serialized data
     * @returns {NonHuman} Reconstructed NonHuman instance
     */
    static deserialize(data) {
        if (data.type !== 'NonHuman') {
            throw new Error('Invalid NonHuman serialization format');
        }

        // Create NonHuman with constructor parameters
        const nonHuman = new NonHuman(data.locationIdentifier, data.name, null, null, data.accountNumber);

        // Iterate over all properties in serialized data
        Object.keys(data).forEach(key => {
            // Skip type marker and constructor parameters (already handled)
            if (key === 'type' || key === 'locationIdentifier' || key === 'name' || key === 'accountNumber') {
                return;
            }
            // Skip function references that cannot be serialized
            if (key === 'comparisonCalculator') {
                return;
            }

            // Handle null/undefined
            if (data[key] === null || data[key] === undefined) {
                nonHuman[key] = null;
                return;
            }

            // Handle comparison calculator name - resolve to function
            if (key === 'comparisonCalculatorName') {
                nonHuman.comparisonCalculatorName = data[key];
                nonHuman.comparisonCalculator = resolveComparisonCalculator(data[key]);
            } else {
                // All other properties - already deserialized by deserializeWithTypes bottom-up processing
                nonHuman[key] = data[key];
            }
        });

        return nonHuman;
    }
}

/**
 * Business - Subclass of NonHuman
 * Represents business entities
 */
class Business extends NonHuman {
    constructor(locationIdentifier, name, propertyLocation = null, ownerAddress = null, accountNumber = null) {
        super(locationIdentifier, name, propertyLocation, ownerAddress, accountNumber);
    }

    /**
     * Deserialize Business from JSON object
     * Iterates over all properties in serialized data (no hardcoded property list)
     * @param {Object} data - Serialized data
     * @returns {Business} Reconstructed Business instance
     */
    static deserialize(data) {
        if (data.type !== 'Business') {
            throw new Error('Invalid Business serialization format');
        }

        // Create Business with constructor parameters
        const business = new Business(data.locationIdentifier, data.name, null, null, data.accountNumber);

        // Iterate over all properties in serialized data
        Object.keys(data).forEach(key => {
            // Skip type marker and constructor parameters (already handled)
            if (key === 'type' || key === 'locationIdentifier' || key === 'name' || key === 'accountNumber') {
                return;
            }
            // Skip function references that cannot be serialized
            if (key === 'comparisonCalculator') {
                return;
            }

            // Handle null/undefined
            if (data[key] === null || data[key] === undefined) {
                business[key] = null;
                return;
            }

            // Handle comparison calculator name - resolve to function
            if (key === 'comparisonCalculatorName') {
                business.comparisonCalculatorName = data[key];
                business.comparisonCalculator = resolveComparisonCalculator(data[key]);
            } else {
                // All other properties - already deserialized by deserializeWithTypes bottom-up processing
                business[key] = data[key];
            }
        });

        return business;
    }
}

/**
 * LegalConstruct - Subclass of NonHuman
 * Represents legal constructs (trusts, LLCs, etc.)
 */
class LegalConstruct extends NonHuman {
    constructor(locationIdentifier, name, propertyLocation = null, ownerAddress = null, accountNumber = null) {
        super(locationIdentifier, name, propertyLocation, ownerAddress, accountNumber);
    }

    /**
     * Deserialize LegalConstruct from JSON object
     * Iterates over all properties in serialized data (no hardcoded property list)
     * @param {Object} data - Serialized data
     * @returns {LegalConstruct} Reconstructed LegalConstruct instance
     */
    static deserialize(data) {
        if (data.type !== 'LegalConstruct') {
            throw new Error('Invalid LegalConstruct serialization format');
        }

        // Create LegalConstruct with constructor parameters
        const legalConstruct = new LegalConstruct(data.locationIdentifier, data.name, null, null, data.accountNumber);

        // Iterate over all properties in serialized data
        Object.keys(data).forEach(key => {
            // Skip type marker and constructor parameters (already handled)
            if (key === 'type' || key === 'locationIdentifier' || key === 'name' || key === 'accountNumber') {
                return;
            }
            // Skip function references that cannot be serialized
            if (key === 'comparisonCalculator') {
                return;
            }

            // Handle null/undefined
            if (data[key] === null || data[key] === undefined) {
                legalConstruct[key] = null;
                return;
            }

            // Handle comparison calculator name - resolve to function
            if (key === 'comparisonCalculatorName') {
                legalConstruct.comparisonCalculatorName = data[key];
                legalConstruct.comparisonCalculator = resolveComparisonCalculator(data[key]);
            } else {
                // All other properties - already deserialized by deserializeWithTypes bottom-up processing
                legalConstruct[key] = data[key];
            }
        });

        return legalConstruct;
    }
}

// Export classes for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Entity,
        Individual,
        CompositeHousehold,
        AggregateHousehold,
        NonHuman,
        Business,
        LegalConstruct
    };
}

// Also export to global scope for browser use
if (typeof window !== 'undefined') {
    window.Entity = Entity;
    window.Individual = Individual;
    window.CompositeHousehold = CompositeHousehold;
    window.AggregateHousehold = AggregateHousehold;
    window.NonHuman = NonHuman;
    window.Business = Business;
    window.LegalConstruct = LegalConstruct;
}