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
     * Generic serialize method for Info subclasses
     * @returns {Object} Serialized representation
     */
    serialize() {
        const serialized = {
            type: this.constructor.name
        };

        const propertyNames = Object.getOwnPropertyNames(this);
        propertyNames.forEach(propertyName => {
            if (propertyName !== 'constructor') {
                serialized[propertyName] = this[propertyName] ? this[propertyName].serialize() : null;
            }
        });

        return serialized;
    }

    /**
     * Generic deserialize method for Info subclasses
     * @param {Object} data - Serialized data
     * @param {Function} constructorClass - Constructor function for the specific subclass
     * @returns {Info} Reconstructed Info subclass instance
     */
    static deserializeBase(data, constructorClass) {
        if (data.type !== constructorClass.name) {
            throw new Error(`Invalid ${constructorClass.name} serialization format`);
        }

        const instance = new constructorClass();

        Object.keys(data).forEach(key => {
            if (key !== 'type' && data[key]) {
                instance[key] = IndicativeData.deserialize(data[key]);
            }
        });

        return instance;
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
        this.email = null;       // IndicativeData containing SimpleIdentifiers for email
        this.phone = null;       // IndicativeData containing SimpleIdentifiers for phone
        this.poBox = null;       // IndicativeData containing SimpleIdentifiers for PO Box
        this.primaryAddress = null;      // Address object for primary mailing address
        this.secondaryAddress = [];      // Array of Address objects for secondary addresses (home, vacation, work, etc.)
    }

    /**
     * Set email contact information
     * @param {IndicativeData} emailIndicativeData - IndicativeData containing email SimpleIdentifier
     */
    setEmail(emailIndicativeData) {
        this.email = emailIndicativeData;
    }

    /**
     * Set phone contact information
     * @param {IndicativeData} phoneIndicativeData - IndicativeData containing phone SimpleIdentifier
     */
    setPhone(phoneIndicativeData) {
        this.phone = phoneIndicativeData;
    }

    /**
     * Set PO Box contact information
     * @param {IndicativeData} poBoxIndicativeData - IndicativeData containing PO Box SimpleIdentifier
     */
    setPoBox(poBoxIndicativeData) {
        this.poBox = poBoxIndicativeData;
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

    /**
     * Serialize ContactInfo to JSON-compatible object
     * @returns {Object} Serialized representation
     */
    serialize() {
        return {
            type: 'ContactInfo',
            email: this.email ? this.email.serialize() : null,
            phone: this.phone ? this.phone.serialize() : null,
            poBox: this.poBox ? this.poBox.serialize() : null,
            primaryAddress: this.primaryAddress ? this.primaryAddress.serialize() : null,
            secondaryAddress: this.secondaryAddress ? this.secondaryAddress.map(addr => addr ? addr.serialize() : null) : []
        };
    }

    /**
     * Deserialize ContactInfo from JSON object
     * @param {Object} data - Serialized data
     * @returns {ContactInfo} Reconstructed ContactInfo instance
     */
    static deserialize(data) {
        return Info.deserializeBase(data, ContactInfo);
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

        // This base class can be extended by specific OtherInfo subclasses
        // Properties will be added by subclasses based on entity type
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
}

/**
 * IndividualOtherInfo class - holds individual-specific OtherInfo
 * Used for additional information specific to individual entities
 * Extends OtherInfo base class
 */
class IndividualOtherInfo extends OtherInfo {
    constructor() {
        super(); // Call parent constructor

        // Individual-specific other information fields
        // These will be populated based on requirements specifications
    }

    /**
     * Deserialize IndividualOtherInfo from JSON object
     * @param {Object} data - Serialized data
     * @returns {IndividualOtherInfo} Reconstructed IndividualOtherInfo instance
     */
    static deserialize(data) {
        return Info.deserializeBase(data, IndividualOtherInfo);
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
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Info, ContactInfo, OtherInfo, HouseholdOtherInfo, IndividualOtherInfo, LegacyInfo };
}