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

/**
 * Entity - Top level parent class
 * Base class for all entity types in the system
 */
class Entity {
    constructor(locationIdentifier, name, propertyLocation = null, ownerAddress = null, accountNumber = null) {
        // Location identifier: Fire Number (primary), PID (secondary), or Street Address (fallback)
        // Type: IdentifyingData containing Fire Number, PID, or ComplexIdentifiers for street address
        // Fire Numbers: integer 4 digits or less <3500, definitive for Block Island locations
        // PIDs: only when Fire Number unavailable, should have 1:1 relationship with Fire Numbers
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

        // Legacy properties - kept for backwards compatibility during transition
        this.label = null;    // Will be deprecated
        this.number = null;   // Will be deprecated
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
                propertyAddressObject = this._processTextToAddress(propertyLocation, 'propertyLocation');
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
        if (ownerAddress !== null) {
            const ownerType = this._detectParameterType(ownerAddress);

            if (ownerType === 'text') {
                // Case a) Text - pass through address parser
                ownerAddressObject = this._processTextToAddress(ownerAddress, 'ownerAddress');
            } else if (ownerType === 'address') {
                // Case b) Address object - direct use
                ownerAddressObject = ownerAddress;
            } else if (ownerType === 'complexIdentifier') {
                // Case c) Complex identifier - identification setup, no action yet
                console.log('Complex identifier detected for ownerAddress - no processing implemented yet');
            } else {
                // Case d) Other - identification setup, no action yet
                console.log(`Other type detected for ownerAddress: ${ownerType} - no processing implemented yet`);
            }
        }

        // If we have valid Address objects, instantiate ContactInfo and assign them
        if (propertyAddressObject || ownerAddressObject) {
            if (!this.contactInfo) {
                this.contactInfo = new ContactInfo();
            }

            if (propertyAddressObject) {
                this.contactInfo.setPrimaryAddress(propertyAddressObject);
            }

            if (ownerAddressObject) {
                this.contactInfo.addSecondaryAddress(ownerAddressObject);
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

    /**
     * Process text string through address parser to create Address object
     * @param {string} addressText - Address text to parse
     * @param {string} fieldName - Field name for data lineage
     * @returns {Address|null} Address object or null if parsing failed
     * @private
     */
    _processTextToAddress(addressText, fieldName) {
        try {
            // Use the address processing functions from addressProcessing.js
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
     * Serialize Entity to JSON-compatible object
     * @returns {Object} Serialized representation
     */
    serialize() {
        return {
            type: 'Entity',
            locationIdentifier: this.locationIdentifier ? this.locationIdentifier.serialize() : null,
            name: this.name ? this.name.serialize() : null,
            accountNumber: this.accountNumber ? this.accountNumber.serialize() : null,
            contactInfo: this.contactInfo ? this.contactInfo.serialize() : null,
            label: this.label,
            number: this.number
        };
    }

    /**
     * Deserialize Entity from JSON object
     * @param {Object} data - Serialized data
     * @returns {Entity} Reconstructed Entity instance
     */
    static deserialize(data) {
        if (data.type !== 'Entity') {
            throw new Error('Invalid Entity serialization format');
        }

        // Deserialize components
        const locationIdentifier = data.locationIdentifier ? IdentifyingData.deserialize(data.locationIdentifier) : null;
        const name = data.name ? IdentifyingData.deserialize(data.name) : null;
        const accountNumber = data.accountNumber ? IndicativeData.deserialize(data.accountNumber) : null;

        // Create entity
        const entity = new Entity(locationIdentifier, name, accountNumber);

        // Deserialize contact info
        if (data.contactInfo) {
            entity.contactInfo = ContactInfo.deserialize(data.contactInfo);
        }

        // Set legacy properties
        entity.label = data.label;
        entity.number = data.number;

        return entity;
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
    }

    /**
     * Serialize Individual to JSON-compatible object
     * @returns {Object} Serialized representation
     */
    serialize() {
        const baseData = super.serialize();
        baseData.type = 'Individual';
        return baseData;
    }

    /**
     * Deserialize Individual from JSON object
     * @param {Object} data - Serialized data
     * @returns {Individual} Reconstructed Individual instance
     */
    static deserialize(data) {
        if (data.type !== 'Individual') {
            throw new Error('Invalid Individual serialization format');
        }

        // Use parent deserialize logic but create Individual
        const entityData = { ...data, type: 'Entity' };
        const baseEntity = Entity.deserialize(entityData);

        const individual = new Individual(baseEntity.locationIdentifier, baseEntity.name, null, null, baseEntity.accountNumber);
        individual.contactInfo = baseEntity.contactInfo;
        individual.label = baseEntity.label;
        individual.number = baseEntity.number;

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
     * Serialize CompositeHousehold to JSON-compatible object
     * @returns {Object} Serialized representation
     */
    serialize() {
        const baseData = super.serialize();
        baseData.type = 'CompositeHousehold';
        return baseData;
    }

    /**
     * Deserialize CompositeHousehold from JSON object
     * @param {Object} data - Serialized data
     * @returns {CompositeHousehold} Reconstructed CompositeHousehold instance
     */
    static deserialize(data) {
        if (data.type !== 'CompositeHousehold') {
            throw new Error('Invalid CompositeHousehold serialization format');
        }

        // Use parent deserialize logic but create CompositeHousehold
        const entityData = { ...data, type: 'Entity' };
        const baseEntity = Entity.deserialize(entityData);

        const household = new CompositeHousehold(baseEntity.locationIdentifier, baseEntity.name, null, null, baseEntity.accountNumber);
        household.contactInfo = baseEntity.contactInfo;
        household.label = baseEntity.label;
        household.number = baseEntity.number;

        return household;
    }
}

/**
 * AggregateHousehold - Subclass of Entity
 * This class will collect individuals who are associated by household that are also
 * instantiated objects on their own. This class will have an array of individuals as a property.
 * name property should contain IdentifyingData with HouseholdName ComplexIdentifiers (synthesized)
 */
class AggregateHousehold extends Entity {
    constructor(locationIdentifier, name, propertyLocation = null, ownerAddress = null, accountNumber = null) {
        super(locationIdentifier, name, propertyLocation, ownerAddress, accountNumber);
        this.individuals = []; // Array of Individual objects
        // Inherited this.name should contain IdentifyingData(HouseholdName) - typically synthesized
    }

    /**
     * Serialize AggregateHousehold to JSON-compatible object
     * @returns {Object} Serialized representation
     */
    serialize() {
        const baseData = super.serialize();
        baseData.type = 'AggregateHousehold';
        baseData.individuals = this.individuals.map(individual => individual.serialize());
        return baseData;
    }

    /**
     * Deserialize AggregateHousehold from JSON object
     * @param {Object} data - Serialized data
     * @returns {AggregateHousehold} Reconstructed AggregateHousehold instance
     */
    static deserialize(data) {
        if (data.type !== 'AggregateHousehold') {
            throw new Error('Invalid AggregateHousehold serialization format');
        }

        // Use parent deserialize logic but create AggregateHousehold
        const entityData = { ...data, type: 'Entity' };
        const baseEntity = Entity.deserialize(entityData);

        const household = new AggregateHousehold(baseEntity.locationIdentifier, baseEntity.name, null, null, baseEntity.accountNumber);
        household.contactInfo = baseEntity.contactInfo;
        household.label = baseEntity.label;
        household.number = baseEntity.number;

        // Deserialize individuals array
        if (data.individuals) {
            household.individuals = data.individuals.map(individualData => {
                // Determine the specific entity type for proper deserialization
                switch (individualData.type) {
                    case 'Individual':
                        return Individual.deserialize(individualData);
                    default:
                        return Entity.deserialize(individualData);
                }
            });
        }

        return household;
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
     * Serialize NonHuman to JSON-compatible object
     * @returns {Object} Serialized representation
     */
    serialize() {
        const baseData = super.serialize();
        baseData.type = 'NonHuman';
        return baseData;
    }

    /**
     * Deserialize NonHuman from JSON object
     * @param {Object} data - Serialized data
     * @returns {NonHuman} Reconstructed NonHuman instance
     */
    static deserialize(data) {
        if (data.type !== 'NonHuman') {
            throw new Error('Invalid NonHuman serialization format');
        }

        // Use parent deserialize logic but create NonHuman
        const entityData = { ...data, type: 'Entity' };
        const baseEntity = Entity.deserialize(entityData);

        const nonHuman = new NonHuman(baseEntity.locationIdentifier, baseEntity.name, null, null, baseEntity.accountNumber);
        nonHuman.contactInfo = baseEntity.contactInfo;
        nonHuman.label = baseEntity.label;
        nonHuman.number = baseEntity.number;

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
     * Serialize Business to JSON-compatible object
     * @returns {Object} Serialized representation
     */
    serialize() {
        const baseData = super.serialize();
        baseData.type = 'Business';
        return baseData;
    }

    /**
     * Deserialize Business from JSON object
     * @param {Object} data - Serialized data
     * @returns {Business} Reconstructed Business instance
     */
    static deserialize(data) {
        if (data.type !== 'Business') {
            throw new Error('Invalid Business serialization format');
        }

        // Use parent deserialize logic but create Business
        const entityData = { ...data, type: 'Entity' };
        const baseEntity = Entity.deserialize(entityData);

        const business = new Business(baseEntity.locationIdentifier, baseEntity.name, null, null, baseEntity.accountNumber);
        business.contactInfo = baseEntity.contactInfo;
        business.label = baseEntity.label;
        business.number = baseEntity.number;

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
     * Serialize LegalConstruct to JSON-compatible object
     * @returns {Object} Serialized representation
     */
    serialize() {
        const baseData = super.serialize();
        baseData.type = 'LegalConstruct';
        return baseData;
    }

    /**
     * Deserialize LegalConstruct from JSON object
     * @param {Object} data - Serialized data
     * @returns {LegalConstruct} Reconstructed LegalConstruct instance
     */
    static deserialize(data) {
        if (data.type !== 'LegalConstruct') {
            throw new Error('Invalid LegalConstruct serialization format');
        }

        // Use parent deserialize logic but create LegalConstruct
        const entityData = { ...data, type: 'Entity' };
        const baseEntity = Entity.deserialize(entityData);

        const legalConstruct = new LegalConstruct(baseEntity.locationIdentifier, baseEntity.name, null, null, baseEntity.accountNumber);
        legalConstruct.contactInfo = baseEntity.contactInfo;
        legalConstruct.label = baseEntity.label;
        legalConstruct.number = baseEntity.number;

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