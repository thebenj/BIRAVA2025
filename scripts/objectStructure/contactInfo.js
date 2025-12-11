/**
 * Info Classes for BIRAVA2025 Entity System
 *
 * Base Info class and specialized subclasses for managing different types of
 * entity information (contact, other, legacy data).
 */

// Note: IndicativeData class is loaded globally via script tags in index.html

/**
 * Info base class - provides common functionality for all Info subclasses
 * Base class for ContactInfo, OtherInfo, and LegacyInfo classes
 */
class Info {
    constructor() {
        // Base initialization - subclasses will extend with specific properties

        // Weighted comparison architecture properties
        this.comparisonWeights = null;                    // Object: {propName: weight, ...}
        this.comparisonCalculatorName = 'defaultWeightedComparison';  // Serializable string name
        this.comparisonCalculator = resolveComparisonCalculator(this.comparisonCalculatorName); // Resolved function
    }

    /**
     * Compare this Info to another Info of the same type
     * Uses the registered comparison calculator for matching
     * @param {Info} other - Info to compare against
     * @param {boolean} detailed - If true, returns detailed breakdown object instead of number
     * @returns {number|Object} Similarity score 0-1, or detailed breakdown object if detailed=true
     * @throws {Error} If comparing with incompatible object type
     */
    compareTo(other, detailed = false) {
        // Type checking - must be same class
        if (!other || other.constructor !== this.constructor) {
            throw new Error(`Cannot compare ${this.constructor.name} with ${other ? other.constructor.name : 'null'}`);
        }

        // Use the comparison calculator if available
        if (this.comparisonCalculator && typeof this.comparisonCalculator === 'function') {
            return this.comparisonCalculator.call(this, other, detailed);
        }

        // Fallback to generic comparison
        return genericObjectCompareTo(this, other, [], detailed);
    }

    /**
     * Generic method to set a property with IndicativeData
     * @param {string} propertyName - Name of the property to set
     * @param {IndicativeData} indicativeData - IndicativeData containing identifier
     */
    setProperty(propertyName, indicativeData) {
        if (this.hasOwnProperty(propertyName)) {
            this[propertyName] = indicativeData;
        } else {
            throw new Error(`Property '${propertyName}' does not exist on ${this.constructor.name}`);
        }
    }

    /**
     * Generic method to get the primary term from a property
     * @param {string} propertyName - Name of the property to get
     * @returns {string|null} Primary term value or null if not available
     */
    getPropertyTerm(propertyName) {
        if (this[propertyName] && this[propertyName].identifier && this[propertyName].identifier.primaryAlias) {
            return this[propertyName].identifier.primaryAlias.term;
        }
        return null;
    }

    /**
     * Get summary of all properties and their availability
     * @returns {Object} Summary of all properties with availability status
     */
    getPropertySummary() {
        const summary = {};
        const propertyNames = Object.getOwnPropertyNames(this);

        propertyNames.forEach(propertyName => {
            if (propertyName !== 'constructor') {
                summary[propertyName] = {
                    hasValue: this[propertyName] !== null,
                    term: this.getPropertyTerm(propertyName)
                };
            }
        });

        return summary;
    }

    /**
     * LEGACY: Generic serialize method for Info subclasses
     * NOTE: serializeWithTypes() handles serialization automatically - this method is not called
     * Iterates over properties automatically (no hardcoded property lists)
     * @returns {Object} Serialized representation
     */
    legacySerialize() {
        const serialized = {
            type: this.constructor.name
        };

        const propertyNames = Object.getOwnPropertyNames(this);
        propertyNames.forEach(propertyName => {
            if (propertyName !== 'constructor' && propertyName !== 'comparisonCalculator') {
                // Serialize all properties except constructor and comparisonCalculator (function)
                if (propertyName === 'comparisonWeights' || propertyName === 'comparisonCalculatorName') {
                    // Serialize these directly (plain values, not IndicativeData)
                    serialized[propertyName] = this[propertyName];
                } else if (propertyName === 'subdivision') {
                    // Subdivision is a plain object {pid: serializedEntityJSON, ...}
                    // Serialize directly (already contains JSON strings)
                    serialized[propertyName] = this[propertyName];
                } else if (Array.isArray(this[propertyName])) {
                    // Handle arrays (like secondaryAddress) - map each element through legacySerialize
                    serialized[propertyName] = this[propertyName].map(item =>
                        item && typeof item.legacySerialize === 'function' ? item.legacySerialize() : item
                    );
                } else {
                    serialized[propertyName] = this[propertyName] ? this[propertyName].legacySerialize() : null;
                }
            }
        });

        return serialized;
    }

    /**
     * Generic deserialize method for Info subclasses
     * Uses constructor (initialization logic runs) then copies additional properties
     * @param {Object} data - Serialized data
     * @param {Function} constructorClass - Constructor function for the specific subclass
     * @returns {Info} Reconstructed Info subclass instance
     */
    static deserializeBase(data, constructorClass) {
        if (data.type !== constructorClass.name) {
            throw new Error(`Invalid ${constructorClass.name} serialization format`);
        }

        // Create instance via constructor - initialization logic runs!
        const instance = new constructorClass();

        Object.keys(data).forEach(key => {
            if (key !== 'type' && data[key] !== null && data[key] !== undefined) {
                if (key === 'comparisonCalculator') {
                    // Skip - function reference, will be resolved from name
                } else if (key === 'comparisonCalculatorName') {
                    // Restore calculator name and resolve to function
                    instance.comparisonCalculatorName = data[key];
                    instance.comparisonCalculator = resolveComparisonCalculator(data[key]);
                } else if (key === 'comparisonWeights') {
                    // Restore weights directly (plain object)
                    instance.comparisonWeights = data[key];
                } else if (key === 'subdivision') {
                    // Subdivision is a plain object {pid: serializedEntityJSON, ...}
                    // Restore directly (contains JSON strings, not objects)
                    instance.subdivision = data[key];
                } else if (key === 'householdInformation') {
                    // HouseholdInformation object - deserialize to class instance
                    instance[key] = HouseholdInformation.deserialize(data[key]);
                } else if (key === 'primaryAddress') {
                    // Address object - handle already-transformed instances
                    instance[key] = ensureDeserialized(data[key], Address);
                } else if (key === 'secondaryAddress' || key === 'secondaryAddresses') {
                    // Array of Address objects - handle already-transformed instances
                    instance[key] = data[key].map(addr => addr ? ensureDeserialized(addr, Address) : null);
                } else {
                    // Other properties (email, phone, poBox, etc.) - pass through directly
                    // These are NOT wrapped in IndicativeData - they're direct values or already-deserialized objects
                    instance[key] = data[key];
                }
            }
        });

        return instance;
    }

    /**
     * Factory method for deserialization - creates instance via constructor
     * This is the preferred entry point for deserializeWithTypes to use
     * Uses 'this' for polymorphic dispatch so subclasses use their own deserialize
     * @param {Object} data - Serialized data object
     * @returns {Info} Reconstructed instance (Info or subclass)
     */
    static fromSerializedData(data) {
        // 'this' refers to the actual class called, enabling polymorphic deserialization
        return Info.deserializeBase(data, this);
    }
}

/**
 * ContactInfo class - holds contact-related IndicativeData objects
 * Used with Entity.addContactInfo() method
 * Extends Info base class for common functionality
 */
class ContactInfo extends Info {
    constructor() {
        super(); // Call parent constructor

        // Contact-related fields
        this.email = null;       // SimpleIdentifiers for email (no IndicativeData wrapper)
        this.phone = null;       // SimpleIdentifiers for phone (no IndicativeData wrapper)
        this.poBox = null;       // SimpleIdentifiers for PO Box (no IndicativeData wrapper)
        this.primaryAddress = null;      // Address object for primary mailing address
        this.secondaryAddress = [];      // Array of Address objects for secondary addresses (home, vacation, work, etc.)

        // Initialize weighted comparison
        this.initializeWeightedComparison();
    }

    /**
     * Initialize weighted comparison properties for ContactInfo
     * Uses contactInfoWeightedComparison calculator for sophisticated address matching logic
     */
    initializeWeightedComparison() {
        // Weights are handled conditionally by contactInfoWeightedComparison
        // Standard: primaryAddress 0.6, secondaryAddress 0.2, email 0.2
        // Perfect match override: winner 0.9, others 0.05 each
        this.comparisonWeights = {
            primaryAddress: 'conditional',
            secondaryAddress: 'conditional',
            email: 'conditional'
            // phone has no weight
        };
        this.comparisonCalculatorName = 'contactInfoWeightedComparison';
        this.comparisonCalculator = resolveComparisonCalculator(this.comparisonCalculatorName);
    }

    /**
     * Set email contact information
     * @param {SimpleIdentifiers} emailSimpleIdentifiers - SimpleIdentifiers containing email AttributedTerm
     */
    setEmail(emailSimpleIdentifiers) {
        this.email = emailSimpleIdentifiers;
    }

    /**
     * Set phone contact information
     * @param {SimpleIdentifiers} phoneSimpleIdentifiers - SimpleIdentifiers containing phone AttributedTerm
     */
    setPhone(phoneSimpleIdentifiers) {
        this.phone = phoneSimpleIdentifiers;
    }

    /**
     * Set PO Box contact information
     * @param {SimpleIdentifiers} poBoxSimpleIdentifiers - SimpleIdentifiers containing PO Box AttributedTerm
     */
    setPoBox(poBoxSimpleIdentifiers) {
        this.poBox = poBoxSimpleIdentifiers;
    }

    /**
     * Set primary address contact information
     * @param {Address} addressObject - Address object for primary mailing address
     */
    setPrimaryAddress(addressObject) {
        this.primaryAddress = addressObject;
    }

    /**
     * Add secondary address contact information
     * @param {Address} addressObject - Address object for secondary address
     */
    addSecondaryAddress(addressObject) {
        this.secondaryAddress.push(addressObject);
    }

    /**
     * Set secondary address contact information (replaces existing array)
     * @param {Array<Address>} addressObjectArray - Array of Address objects for secondary addresses
     */
    setSecondaryAddresses(addressObjectArray) {
        this.secondaryAddress = Array.isArray(addressObjectArray) ? addressObjectArray : [];
    }

    /**
     * Get all secondary addresses
     * @returns {Array<Address>} Array of secondary address Address objects
     */
    getSecondaryAddresses() {
        return this.secondaryAddress;
    }

    /**
     * Get the best email for communication (following Communications Hierarchy)
     * @returns {string|null} Email address string or null if no email available
     */
    getBestEmail() {
        return this.email ? this.email.identifier.primaryAlias.term : null;
    }

    /**
     * Get the best mailing address (following Communications Hierarchy)
     * Hierarchy: 1) Email, 2) Primary Address (off-island OR on-island PO Box only),
     * 3) Off-island address when primary is unusable on-island non-PO Box
     * @returns {string|null} Address string or null if no address available
     */
    getBestMailingAddress() {
        // Level 2: Primary Address - use if off-island OR if on-island PO Box
        if (this.primaryAddress) {
            const primaryAddr = this.primaryAddress.primaryAlias.term;
            if (this._isOffIslandAddress(primaryAddr) || this._isOnIslandPoBox(primaryAddr)) {
                return primaryAddr;
            }
        }

        // Level 3: Fallback to off-island secondary address when primary is unusable
        // Check all secondary addresses for usable off-island addresses
        for (const secondaryAddress of this.secondaryAddress) {
            if (secondaryAddress && secondaryAddress.primaryAlias) {
                const secondaryAddr = secondaryAddress.primaryAlias.term;
                if (this._isOffIslandAddress(secondaryAddr)) {
                    return secondaryAddr;
                }
            }
        }

        // Legacy PO Box support (if stored separately from primaryAddress)
        if (this.poBox) {
            return `PO Box ${this.poBox.identifier.primaryAlias.term}, Block Island, RI 02807`;
        }

        return null;
    }

    /**
     * Check if address is on Block Island (based on zip code, town name, state)
     * NOTE: PLACEHOLDER IMPLEMENTATION - will need sophisticated address parsing for real data
     * @param {string} address - Address string to check
     * @returns {boolean} True if address appears to be on Block Island
     * @private
     */
    _isOnIslandAddress(address) {
        if (!address || typeof address !== 'string') return false;

        const addr = address.toLowerCase().replace(/\s+/g, ''); // Remove spaces, convert to lowercase

        // Check for Block Island indicators (indifferent to capitalization, spaces)
        return addr.includes('02807') || // Zip code
               addr.includes('newshoreham') || // Town name (no spaces)
               addr.includes('new shoreham') || // Town name (with spaces - shouldn't happen after replace but safety)
               addr.includes('blockisland') || // Town name (no spaces)
               addr.includes('block island'); // Town name (with spaces - shouldn't happen after replace but safety)
    }

    /**
     * Check if address is off Block Island
     * NOTE: PLACEHOLDER IMPLEMENTATION - will need sophisticated address parsing for real data
     * @param {string} address - Address string to check
     * @returns {boolean} True if address appears to be off Block Island
     * @private
     */
    _isOffIslandAddress(address) {
        return !this._isOnIslandAddress(address);
    }

    /**
     * Check if address is a Block Island PO Box (deliverable on-island address)
     * NOTE: PLACEHOLDER IMPLEMENTATION - will need sophisticated address parsing for real data
     * @param {string} address - Address string to check
     * @returns {boolean} True if address is a Block Island PO Box
     * @private
     */
    _isOnIslandPoBox(address) {
        if (!address || typeof address !== 'string') return false;

        const addr = address.toLowerCase();

        // Must be on-island AND contain PO Box indicators
        return this._isOnIslandAddress(address) &&
               (addr.includes('po box') || addr.includes('p.o. box') || addr.includes('box '));
    }

    /**
     * Get contact summary for display/debugging
     * @returns {Object} Summary of all available contact methods
     */
    getContactSummary() {
        return {
            email: this.getBestEmail(),
            mailingAddress: this.getBestMailingAddress(),
            phone: this.phone ? this.phone.identifier.primaryAlias.term : null,
            hasPoBox: this.poBox !== null,
            hasPrimaryAddress: this.primaryAddress !== null,
            hasSecondaryAddress: this.secondaryAddress !== null
        };
    }

    // NOTE: ContactInfo inherits Info.legacySerialize() but it is not called.
    // serializeWithTypes() handles serialization automatically via JSON.stringify replacer.

    /**
     * Deserialize ContactInfo from JSON object
     * @param {Object} data - Serialized data
     * @returns {ContactInfo} Reconstructed ContactInfo instance
     */
    static deserialize(data) {
        return Info.deserializeBase(data, ContactInfo);
    }

    /**
     * Factory method for deserialization - creates instance via constructor
     * This is the preferred entry point for deserializeWithTypes to use
     * Uses 'this' for polymorphic dispatch so subclasses use their own deserialize
     * @param {Object} data - Serialized data object
     * @returns {ContactInfo} Reconstructed instance (ContactInfo or subclass)
     */
    static fromSerializedData(data) {
        // 'this' refers to the actual class called, enabling polymorphic deserialization
        return this.deserialize(data);
    }
}

/**
 * OtherInfo base class - holds non-contact IndicativeData objects
 * Used for additional entity information that isn't contact-related
 * Extends Info base class for common functionality
 */
class OtherInfo extends Info {
    constructor() {
        super(); // Call parent constructor

        // householdInformation: tracks household membership and role
        // Initialized with default values (isInHousehold=false)
        this.householdInformation = HouseholdInformation.createDefault();

        // Subdivision: holds PIDs of properties at same fire number with same owner
        // Structure: { pid: serializedEntityJSON, pid2: serializedEntityJSON, ... }
        // Used by fire number collision handler to consolidate multiple PIDs under one entity
        this.subdivision = null;
    }

    /**
     * Add a PID and its entity data to the subdivision
     * Called when fire number collision handler determines same owner for multiple PIDs
     * @param {string} pid - Property ID
     * @param {Entity} entity - The entity that would have been created for this PID
     */
    addSubdivisionEntry(pid, entity) {
        if (!this.subdivision) {
            this.subdivision = {};
        }
        // Store entity object directly - it will be serialized with type info
        // when the parent entity is serialized via serializeWithTypes
        this.subdivision[pid] = entity;
    }

    /**
     * Get all subdivision PIDs
     * @returns {string[]} Array of PIDs in the subdivision
     */
    getSubdivisionPids() {
        return this.subdivision ? Object.keys(this.subdivision) : [];
    }

    /**
     * Get a specific subdivision entity (deserialized)
     * @param {string} pid - Property ID
     * @returns {Object|null} Deserialized entity data or null
     */
    getSubdivisionEntity(pid) {
        if (!this.subdivision || !this.subdivision[pid]) {
            return null;
        }
        return JSON.parse(this.subdivision[pid]);
    }

    /**
     * Check if this OtherInfo has any subdivision entries
     * @returns {boolean} True if subdivision has entries
     */
    hasSubdivision() {
        return this.subdivision !== null && Object.keys(this.subdivision).length > 0;
    }

    /**
     * Get count of PIDs in subdivision
     * @returns {number} Number of PIDs in subdivision
     */
    getSubdivisionCount() {
        return this.subdivision ? Object.keys(this.subdivision).length : 0;
    }

    /**
     * Factory method for deserialization - creates instance via constructor
     * Uses 'this' for polymorphic dispatch so subclasses use their own deserialize
     * @param {Object} data - Serialized data object
     * @returns {OtherInfo} Reconstructed instance (OtherInfo or subclass)
     */
    static fromSerializedData(data) {
        // 'this' refers to the actual class called, enabling polymorphic deserialization
        return Info.deserializeBase(data, this);
    }
}

/**
 * HouseholdOtherInfo class - holds household-specific OtherInfo
 * Used for additional information specific to household entities
 * Extends OtherInfo base class
 */
class HouseholdOtherInfo extends OtherInfo {
    constructor() {
        super(); // Call parent constructor

        // Household-specific other information fields
        // These will be populated based on requirements specifications
    }

    /**
     * Deserialize HouseholdOtherInfo from JSON object
     * @param {Object} data - Serialized data
     * @returns {HouseholdOtherInfo} Reconstructed HouseholdOtherInfo instance
     */
    static deserialize(data) {
        return Info.deserializeBase(data, HouseholdOtherInfo);
    }

    /**
     * Factory method for deserialization - creates instance via constructor
     * Uses 'this' for polymorphic dispatch so subclasses use their own deserialize
     * @param {Object} data - Serialized data object
     * @returns {HouseholdOtherInfo} Reconstructed instance
     */
    static fromSerializedData(data) {
        return this.deserialize(data);
    }
}

/**
 * LegacyInfo class - holds VisionAppraisal legacy data for record preservation
 * Used for preserving original VisionAppraisal data fields as a matter of record
 * Extends Info base class for common functionality
 */
class LegacyInfo extends Info {
    constructor() {
        super(); // Call parent constructor

        // VisionAppraisal legacy data fields - all using SimpleIdentifier architecture
        // These fields preserve original VisionAppraisal data without processing
        this.ownerName = null;      // IndicativeData containing SimpleIdentifier for ownerName
        this.ownerName2 = null;     // IndicativeData containing SimpleIdentifier for ownerName2
        this.neighborhood = null;   // IndicativeData containing SimpleIdentifier for neighborhood
        this.userCode = null;       // IndicativeData containing SimpleIdentifier for userCode
        this.date = null;           // IndicativeData containing SimpleIdentifier for date
        this.sourceIndex = null;    // IndicativeData containing SimpleIdentifier for sourceIndex
    }

    /**
     * Set ownerName information
     * @param {IndicativeData} ownerNameIndicativeData - IndicativeData containing ownerName SimpleIdentifier
     */
    setOwnerName(ownerNameIndicativeData) {
        this.ownerName = ownerNameIndicativeData;
    }

    /**
     * Set ownerName2 information
     * @param {IndicativeData} ownerName2IndicativeData - IndicativeData containing ownerName2 SimpleIdentifier
     */
    setOwnerName2(ownerName2IndicativeData) {
        this.ownerName2 = ownerName2IndicativeData;
    }

    /**
     * Set neighborhood information
     * @param {IndicativeData} neighborhoodIndicativeData - IndicativeData containing neighborhood SimpleIdentifier
     */
    setNeighborhood(neighborhoodIndicativeData) {
        this.neighborhood = neighborhoodIndicativeData;
    }

    /**
     * Set userCode information
     * @param {IndicativeData} userCodeIndicativeData - IndicativeData containing userCode SimpleIdentifier
     */
    setUserCode(userCodeIndicativeData) {
        this.userCode = userCodeIndicativeData;
    }

    /**
     * Set date information
     * @param {IndicativeData} dateIndicativeData - IndicativeData containing date SimpleIdentifier
     */
    setDate(dateIndicativeData) {
        this.date = dateIndicativeData;
    }

    /**
     * Set sourceIndex information
     * @param {IndicativeData} sourceIndexIndicativeData - IndicativeData containing sourceIndex SimpleIdentifier
     */
    setSourceIndex(sourceIndexIndicativeData) {
        this.sourceIndex = sourceIndexIndicativeData;
    }

    /**
     * Get legacy data summary for display/debugging
     * @returns {Object} Summary of all available legacy data fields
     */
    getLegacyDataSummary() {
        return {
            ownerName: this.getPropertyTerm('ownerName'),
            ownerName2: this.getPropertyTerm('ownerName2'),
            neighborhood: this.getPropertyTerm('neighborhood'),
            userCode: this.getPropertyTerm('userCode'),
            date: this.getPropertyTerm('date'),
            sourceIndex: this.getPropertyTerm('sourceIndex'),
            hasOwnerName: this.ownerName !== null,
            hasOwnerName2: this.ownerName2 !== null,
            hasNeighborhood: this.neighborhood !== null,
            hasUserCode: this.userCode !== null,
            hasDate: this.date !== null,
            hasSourceIndex: this.sourceIndex !== null
        };
    }

    /**
     * Deserialize LegacyInfo from JSON object
     * @param {Object} data - Serialized data
     * @returns {LegacyInfo} Reconstructed LegacyInfo instance
     */
    static deserialize(data) {
        return Info.deserializeBase(data, LegacyInfo);
    }

    /**
     * Factory method for deserialization - creates instance via constructor
     * Uses 'this' for polymorphic dispatch so subclasses use their own deserialize
     * @param {Object} data - Serialized data object
     * @returns {LegacyInfo} Reconstructed instance
     */
    static fromSerializedData(data) {
        return this.deserialize(data);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Info, ContactInfo, OtherInfo, HouseholdOtherInfo, LegacyInfo };
}