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

        // Property value fields (added Dec 2025)
        // These store VisionAppraisal assessment and appraisal values
        // Will be null for old data or non-VisionAppraisal entities
        this.assessmentValue = null;
        this.appraisalValue = null;
    }

    /**
     * Set assessment value
     * @param {string} value - The assessment value string
     */
    setAssessmentValue(value) {
        this.assessmentValue = value || null;
    }

    /**
     * Set appraisal value
     * @param {string} value - The appraisal value string
     */
    setAppraisalValue(value) {
        this.appraisalValue = value || null;
    }

    /**
     * Get assessment value
     * @returns {string|null} The assessment value or null
     */
    getAssessmentValue() {
        return this.assessmentValue;
    }

    /**
     * Get appraisal value
     * @returns {string|null} The appraisal value or null
     */
    getAppraisalValue() {
        return this.appraisalValue;
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

}

/**
 * CollectiveContactInfo - Base class for EntityGroup contact pathway management
 *
 * Models a contact unit's (EntityGroup's) full inventory of contact options for
 * a single modality (mailing address, phone, PO box, or email). Holds a preferred
 * option and an array of alternatives, with support for manual overrides.
 *
 * Independent of the Info/ContactInfo hierarchy. ContactInfo models one source
 * record's contact data; CollectiveContactInfo models a contact unit's aggregated
 * contact pathways across all member entities.
 *
 * Subclasses: CollectiveMailingAddress, CollectivePhone, CollectivePOBox, CollectiveEmail
 */
class CollectiveContactInfo {
    constructor() {
        this.preferred = null;              // Aliased (or subclass): the chosen best contact option
        this.alternatives = [];             // Array of Aliased: other known contact options
        this.preferredSource = 'algorithmic'; // 'algorithmic' or 'manual'
        this.overrideAnchorKey = null;      // Entity key anchoring a manual override, or null
    }

    /**
     * Set the preferred contact option
     * @param {Aliased} aliasedObject - The contact option to set as preferred
     */
    setPreferred(aliasedObject) {
        this.preferred = aliasedObject;
    }

    /**
     * Add a contact option to alternatives (skips if duplicate of preferred)
     * @param {Aliased} aliasedObject - The contact option to add
     */
    addAlternative(aliasedObject) {
        if (this.preferred && aliasedObject.primaryAlias.term === this.preferred.primaryAlias.term) {
            return; // Don't add duplicate of preferred
        }
        this.alternatives.push(aliasedObject);
    }

    /**
     * Check whether this collective has any contact option
     * @returns {boolean} True if preferred is non-null
     */
    hasContact() {
        return this.preferred !== null;
    }

    /**
     * Get all contact options (preferred first, then alternatives)
     * @returns {Array<Aliased>} Array with preferred (if any) followed by alternatives
     */
    getAllOptions() {
        if (!this.preferred) {
            return [...this.alternatives];
        }
        return [this.preferred, ...this.alternatives];
    }

    /**
     * Get the term string of the preferred contact option
     * @returns {string|null} The preferred option's primaryAlias.term, or null
     */
    getPreferredTerm() {
        if (this.preferred && this.preferred.primaryAlias) {
            return this.preferred.primaryAlias.term;
        }
        return null;
    }

    /**
     * Populate preferred and alternatives from member entity contact items.
     * Base implementation: first item becomes preferred, rest become alternatives.
     * Subclasses override with type-specific comparison/deduplication logic.
     * @param {Array<Aliased>} memberItems - Contact items collected from member entities
     * @param {Object} thresholds - Match criteria thresholds for deduplication
     */
    populateFromMembers(memberItems, thresholds) {
        this.preferred = null;
        this.alternatives = [];
        this.preferredSource = 'algorithmic';
        this.overrideAnchorKey = null;

        if (!memberItems || memberItems.length === 0) {
            return;
        }

        // Base implementation: first item preferred, rest alternatives
        this.preferred = memberItems[0];
        for (let i = 1; i < memberItems.length; i++) {
            this.alternatives.push(memberItems[i]);
        }
    }

    /**
     * Apply a manual override: move current preferred to alternatives, install new preferred
     * @param {Aliased} newPreferred - The contact option to install as preferred
     * @param {string} anchorKey - Entity key to anchor this override to
     */
    applyOverride(newPreferred, anchorKey) {
        // Save the algorithmic state before overriding (for clearOverride restoration)
        if (this.preferredSource === 'algorithmic') {
            this._algorithmicPreferred = this.preferred;
            this._algorithmicAlternatives = [...this.alternatives];
        }

        // Move current preferred to alternatives if it exists
        if (this.preferred) {
            this.alternatives.push(this.preferred);
        }

        // Remove newPreferred from alternatives if it was there
        this.alternatives = this.alternatives.filter(
            alt => alt.primaryAlias.term !== newPreferred.primaryAlias.term
        );

        this.preferred = newPreferred;
        this.preferredSource = 'manual';
        this.overrideAnchorKey = anchorKey;
    }

    /**
     * Clear manual override and revert to algorithmic selection.
     * Restores the saved algorithmic preferred/alternatives from before the override was applied.
     */
    clearOverride() {
        if (this.preferredSource !== 'manual') {
            return; // Nothing to clear
        }

        // Restore saved algorithmic state if available
        if (this._algorithmicPreferred) {
            this.preferred = this._algorithmicPreferred;
            this.alternatives = this._algorithmicAlternatives || [];
        } else {
            // Fallback: no saved state, just pick first from all options
            const allOptions = this.getAllOptions();
            this.preferred = allOptions.length > 0 ? allOptions[0] : null;
            this.alternatives = allOptions.slice(1);
        }

        this.preferredSource = 'algorithmic';
        this.overrideAnchorKey = null;
        this._algorithmicPreferred = null;
        this._algorithmicAlternatives = null;
    }

}

/**
 * CollectiveMailingAddress - Address-specific CollectiveContactInfo subclass
 *
 * Holds Address objects (ComplexIdentifiers subclass) as preferred/alternatives.
 * Uses Address.compareTo() for deduplication and popularity-scored ranking
 * adapted from EntityGroup._deduplicateAddresses().
 */
class CollectiveMailingAddress extends CollectiveContactInfo {
    constructor() {
        super();
    }

    /**
     * Populate from member entity addresses. No synthetic objects created.
     * Clusters addresses by synonym threshold using Address.compareTo(),
     * then selects the representative (first member) from the largest cluster
     * as preferred. Remaining cluster representatives become alternatives.
     * @param {Array<Address>} memberItems - Address objects from member entities
     * @param {Object} thresholds - Must include thresholds.contactInfo.synonym
     */
    populateFromMembers(memberItems, thresholds) {
        this.preferred = null;
        this.alternatives = [];
        this.preferredSource = 'algorithmic';
        this.overrideAnchorKey = null;

        if (!memberItems || memberItems.length === 0) {
            return;
        }

        if (memberItems.length === 1) {
            this.preferred = memberItems[0];
            return;
        }

        // Thresholds required — no fallback
        if (!thresholds || !thresholds.contactInfo ||
            typeof thresholds.contactInfo.synonym !== 'number') {
            throw new Error('CollectiveMailingAddress.populateFromMembers requires thresholds.contactInfo.synonym');
        }
        const synonymThreshold = thresholds.contactInfo.synonym;

        // Cluster addresses by synonym threshold using Address.compareTo()
        const clusters = []; // Array of {representative: Address, members: Array<Address>}

        for (const address of memberItems) {
            if (!address) continue;

            let foundCluster = false;
            for (const cluster of clusters) {
                try {
                    if (typeof address.compareTo === 'function') {
                        const similarity = address.compareTo(cluster.representative);
                        if (similarity >= synonymThreshold) {
                            cluster.members.push(address);
                            foundCluster = true;
                            break;
                        }
                    }
                } catch (e) {
                    // Skip comparison errors — treat as non-matching
                }
            }

            if (!foundCluster) {
                clusters.push({ representative: address, members: [address] });
            }
        }

        // Largest cluster → preferred (representative), rest → alternatives (sorted by size descending)
        clusters.sort((a, b) => b.members.length - a.members.length);

        this.preferred = clusters[0].representative;
        for (let i = 1; i < clusters.length; i++) {
            this.alternatives.push(clusters[i].representative);
        }
    }
}

/**
 * CollectivePhone - Phone-specific CollectiveContactInfo subclass
 *
 * Holds SimpleIdentifiers objects for phone numbers as preferred/alternatives.
 * Deduplicates using normalized phone comparison: strips punctuation and
 * handles 401-466 area code presence/absence as equivalent.
 */
class CollectivePhone extends CollectiveContactInfo {
    constructor() {
        super();
    }

    /**
     * Normalize a phone number for comparison.
     * Strips all non-digit characters, then removes leading '1' country code,
     * then removes '401466' area code prefix if present (Block Island local).
     * @param {string} phone - Raw phone string
     * @returns {string} Normalized digit string for comparison
     * @static
     */
    static normalizePhone(phone) {
        if (!phone || typeof phone !== 'string') return '';

        // Strip all non-digit characters
        let digits = phone.replace(/\D/g, '');

        // Remove leading country code '1' if 11 digits
        if (digits.length === 11 && digits.startsWith('1')) {
            digits = digits.substring(1);
        }

        return digits;
    }

    /**
     * Check if two phone numbers are equivalent after normalization.
     * Also treats numbers with/without 401466 prefix as equivalent
     * (e.g., "466-1234" matches "401-466-1234").
     * @param {string} phoneA - First phone string
     * @param {string} phoneB - Second phone string
     * @returns {boolean} True if phones are equivalent
     * @static
     */
    static phonesAreEquivalent(phoneA, phoneB) {
        const a = CollectivePhone.normalizePhone(phoneA);
        const b = CollectivePhone.normalizePhone(phoneB);

        if (a === b) return true;
        if (!a || !b) return false;

        // Handle 401466 area code: 7-digit local vs 10-digit with area code
        // "4661234" (7 digits) should match "4014661234" (10 digits)
        if (a.length === 7 && b.length === 10 && b.startsWith('401') && b.substring(3) === a) return true;
        if (b.length === 7 && a.length === 10 && a.startsWith('401') && a.substring(3) === b) return true;

        return false;
    }

    /**
     * Populate from member entity phone SimpleIdentifiers. No synthetic objects created.
     * Groups by normalization equivalence, picks the most complete (longest normalized)
     * actual member object as representative. Ranks by frequency, tie-breaks by source priority.
     * @param {Array<SimpleIdentifiers>} memberItems - Phone SimpleIdentifiers from member entities
     * @param {Object} thresholds - Not used for phone comparison (normalization-based)
     */
    populateFromMembers(memberItems, thresholds) {
        this.preferred = null;
        this.alternatives = [];
        this.preferredSource = 'algorithmic';
        this.overrideAnchorKey = null;

        if (!memberItems || memberItems.length === 0) {
            return;
        }

        if (memberItems.length === 1) {
            this.preferred = memberItems[0];
            return;
        }

        // Group by normalized phone equivalence
        const groups = []; // Array of {representative: SimpleIdentifiers, members: Array<SimpleIdentifiers>}

        for (const item of memberItems) {
            if (!item || !item.primaryAlias) continue;

            const term = item.primaryAlias.term;
            let matched = false;

            for (const group of groups) {
                if (CollectivePhone.phonesAreEquivalent(term, group.representative.primaryAlias.term)) {
                    group.members.push(item);
                    // Update representative if this member has a more complete (longer) form
                    const currentNorm = CollectivePhone.normalizePhone(group.representative.primaryAlias.term);
                    const newNorm = CollectivePhone.normalizePhone(term);
                    if (newNorm.length > currentNorm.length) {
                        group.representative = item;
                    }
                    matched = true;
                    break;
                }
            }

            if (!matched) {
                groups.push({ representative: item, members: [item] });
            }
        }

        // Rank by frequency (group size), tie-break by source priority
        groups.sort((a, b) => {
            if (b.members.length !== a.members.length) {
                return b.members.length - a.members.length;
            }
            return CollectivePhone._sourcePriority(b.representative) -
                   CollectivePhone._sourcePriority(a.representative);
        });

        this.preferred = groups[0].representative;
        for (let i = 1; i < groups.length; i++) {
            this.alternatives.push(groups[i].representative);
        }
    }

    /**
     * Get source priority for tie-breaking: Bloomerang (3) > Phonebook (2) > other (1).
     * @param {SimpleIdentifiers} item - Phone SimpleIdentifiers to check
     * @returns {number} Priority value (higher = preferred)
     * @static
     * @private
     */
    static _sourcePriority(item) {
        if (!item || !item.primaryAlias || !item.primaryAlias.sourceMap || !item.primaryAlias.sourceMap[0]) return 0;
        const source = item.primaryAlias.sourceMap[0].source;
        if (typeof source === 'string') {
            if (source.includes('BLOOMERANG')) return 3;
            if (source.includes('PHONEBOOK')) return 2;
        }
        return 1;
    }
}

/**
 * CollectivePOBox - PO Box-specific CollectiveContactInfo subclass
 *
 * Holds SimpleIdentifiers objects for PO Box numbers as preferred/alternatives.
 * Uses exact identifier matching for deduplication (PO Box numbers are discrete values).
 */
class CollectivePOBox extends CollectiveContactInfo {
    constructor() {
        super();
    }

    /**
     * Populate from member entity PO Box SimpleIdentifiers with exact-match deduplication.
     * Most frequently occurring PO Box becomes preferred.
     * @param {Array<SimpleIdentifiers>} memberItems - PO Box SimpleIdentifiers from member entities
     * @param {Object} thresholds - Not used for PO Box comparison (exact matching)
     */
    populateFromMembers(memberItems, thresholds) {
        this.preferred = null;
        this.alternatives = [];
        this.preferredSource = 'algorithmic';
        this.overrideAnchorKey = null;

        if (!memberItems || memberItems.length === 0) {
            return;
        }

        if (memberItems.length === 1) {
            this.preferred = memberItems[0];
            return;
        }

        // Deduplicate by case-insensitive term match, tracking count
        const groups = []; // Array of {representative: SimpleIdentifiers, count: number}

        for (const item of memberItems) {
            if (!item || !item.primaryAlias) continue;

            const term = item.primaryAlias.term;
            const termLower = (typeof term === 'string') ? term.toLowerCase() : '';
            let matched = false;

            for (const group of groups) {
                const groupTerm = group.representative.primaryAlias.term;
                const groupLower = (typeof groupTerm === 'string') ? groupTerm.toLowerCase() : '';
                if (termLower === groupLower) {
                    group.count++;
                    matched = true;
                    break;
                }
            }

            if (!matched) {
                groups.push({ representative: item, count: 1 });
            }
        }

        // Sort by count descending
        groups.sort((a, b) => b.count - a.count);

        this.preferred = groups[0].representative;
        for (let i = 1; i < groups.length; i++) {
            this.alternatives.push(groups[i].representative);
        }
    }
}

/**
 * CollectiveEmail - Email-specific CollectiveContactInfo subclass
 *
 * Holds SimpleIdentifiers objects for email addresses as preferred/alternatives.
 * Uses EmailTerm.compareTo() (domain-aware) for clustering and Aliased.createConsensus()
 * for alias preservation within clusters.
 */
class CollectiveEmail extends CollectiveContactInfo {
    constructor() {
        super();
    }

    /**
     * Populate from member entity email SimpleIdentifiers. No synthetic objects created.
     * Clusters emails by synonym threshold using EmailTerm.compareTo() (domain-aware),
     * then selects the representative (first member) from the largest cluster as preferred.
     * Tie-breaks by source priority (Bloomerang > Phonebook > other).
     * @param {Array<SimpleIdentifiers>} memberItems - Email SimpleIdentifiers (primaryAlias is EmailTerm)
     * @param {Object} thresholds - Must include thresholds.contactInfo.synonym
     */
    populateFromMembers(memberItems, thresholds) {
        this.preferred = null;
        this.alternatives = [];
        this.preferredSource = 'algorithmic';
        this.overrideAnchorKey = null;

        if (!memberItems || memberItems.length === 0) {
            return;
        }

        if (memberItems.length === 1) {
            this.preferred = memberItems[0];
            return;
        }

        // Thresholds required — no fallback
        if (!thresholds || !thresholds.contactInfo ||
            typeof thresholds.contactInfo.synonym !== 'number') {
            throw new Error('CollectiveEmail.populateFromMembers requires thresholds.contactInfo.synonym');
        }
        const synonymThreshold = thresholds.contactInfo.synonym;

        // Cluster emails by synonym threshold using EmailTerm.compareTo()
        const clusters = []; // Array of {representative: SimpleIdentifiers, members: Array<SimpleIdentifiers>}

        for (const item of memberItems) {
            if (!item || !item.primaryAlias) continue;

            let foundCluster = false;
            for (const cluster of clusters) {
                try {
                    const similarity = item.primaryAlias.compareTo(cluster.representative.primaryAlias);
                    if (typeof similarity === 'number' && similarity >= synonymThreshold) {
                        cluster.members.push(item);
                        foundCluster = true;
                        break;
                    }
                } catch (e) {
                    // Skip comparison errors — treat as non-matching
                }
            }

            if (!foundCluster) {
                clusters.push({ representative: item, members: [item] });
            }
        }

        // Largest cluster → preferred, rest → alternatives
        // Tie-break by source priority (Bloomerang > Phonebook > other)
        clusters.sort((a, b) => {
            if (b.members.length !== a.members.length) {
                return b.members.length - a.members.length;
            }
            return CollectiveEmail._sourcePriority(b.representative) -
                   CollectiveEmail._sourcePriority(a.representative);
        });

        this.preferred = clusters[0].representative;
        for (let i = 1; i < clusters.length; i++) {
            this.alternatives.push(clusters[i].representative);
        }
    }

    /**
     * Get source priority for tie-breaking: Bloomerang (3) > Phonebook (2) > other (1).
     * @param {SimpleIdentifiers|Aliased} item - Email Aliased object to check
     * @returns {number} Priority value (higher = preferred)
     * @static
     * @private
     */
    static _sourcePriority(item) {
        if (!item || !item.primaryAlias || !item.primaryAlias.sourceMap || !item.primaryAlias.sourceMap[0]) return 0;
        const source = item.primaryAlias.sourceMap[0].source;
        if (typeof source === 'string') {
            if (source.includes('BLOOMERANG')) return 3;
            if (source.includes('PHONEBOOK')) return 2;
        }
        return 1;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Info, ContactInfo, OtherInfo, HouseholdOtherInfo, LegacyInfo,
        CollectiveContactInfo, CollectiveMailingAddress, CollectivePhone, CollectivePOBox, CollectiveEmail };
}