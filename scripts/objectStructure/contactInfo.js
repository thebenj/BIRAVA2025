/**
 * ContactInfo Class for BIRAVA2025 Entity System
 *
 * Manages contact-related IndicativeData objects for entities.
 * Separate from general IndicativeData like account numbers.
 */

// Note: IndicativeData class is loaded globally via script tags in index.html

/**
 * ContactInfo class - holds contact-related IndicativeData objects
 * Used with Entity.addContactInfo() method
 */
class ContactInfo {
    constructor() {
        // Contact-related IndicativeData fields
        this.email = null;       // IndicativeData containing SimpleIdentifiers for email
        this.phone = null;       // IndicativeData containing SimpleIdentifiers for phone
        this.poBox = null;       // IndicativeData containing SimpleIdentifiers for PO Box
        this.primaryAddress = null;  // IndicativeData for primary mailing address
        this.secondaryAddress = null; // IndicativeData for secondary address
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
     * @param {IndicativeData} addressIndicativeData - IndicativeData containing address ComplexIdentifier
     */
    setPrimaryAddress(addressIndicativeData) {
        this.primaryAddress = addressIndicativeData;
    }

    /**
     * Set secondary address contact information
     * @param {IndicativeData} addressIndicativeData - IndicativeData containing address ComplexIdentifier
     */
    setSecondaryAddress(addressIndicativeData) {
        this.secondaryAddress = addressIndicativeData;
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
            const primaryAddr = this.primaryAddress.identifier.primaryAlias.term;
            if (this._isOffIslandAddress(primaryAddr) || this._isOnIslandPoBox(primaryAddr)) {
                return primaryAddr;
            }
        }

        // Level 3: Fallback to off-island secondary address when primary is unusable
        if (this.secondaryAddress) {
            const secondaryAddr = this.secondaryAddress.identifier.primaryAlias.term;
            if (this._isOffIslandAddress(secondaryAddr)) {
                return secondaryAddr;
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
            secondaryAddress: this.secondaryAddress ? this.secondaryAddress.serialize() : null
        };
    }

    /**
     * Deserialize ContactInfo from JSON object
     * @param {Object} data - Serialized data
     * @returns {ContactInfo} Reconstructed ContactInfo instance
     */
    static deserialize(data) {
        if (data.type !== 'ContactInfo') {
            throw new Error('Invalid ContactInfo serialization format');
        }

        const contactInfo = new ContactInfo();

        if (data.email) contactInfo.email = IndicativeData.deserialize(data.email);
        if (data.phone) contactInfo.phone = IndicativeData.deserialize(data.phone);
        if (data.poBox) contactInfo.poBox = IndicativeData.deserialize(data.poBox);
        if (data.primaryAddress) contactInfo.primaryAddress = IndicativeData.deserialize(data.primaryAddress);
        if (data.secondaryAddress) contactInfo.secondaryAddress = IndicativeData.deserialize(data.secondaryAddress);

        return contactInfo;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ContactInfo };
}