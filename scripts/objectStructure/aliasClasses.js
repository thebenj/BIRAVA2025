/**
 * Alias Management Classes for BIRAVA2025 Object Model
 *
 * These classes handle the Alias Problem - resolving multiple text representations
 * of the same entities across different data sources (VisionAppraisal, Phonebook, Bloomerang)
 *
 * ARCHITECTURE:
 * - Container Classes (IndicativeData, IdentifyingData): Hold and categorize identifier reliability
 * - Identifier Classes (SimpleIdentifiers, ComplexIdentifiers): Handle aliasing and matching logic
 * - Simple vs Complex: Simple = direct matching, Complex = fuzzy matching with normalization
 * - Manual Override Support: All automated decisions can be manually corrected via override files
 */

/**
 * Data Source Constants for AttributedTerm source tracking
 * Used to identify the origin of data across the three data sources
 */
const DATA_SOURCES = Object.freeze({
    BLOOMERANG_CSV: "BLOOMERANG_CSV",
    VISION_APPRAISAL: "VISION_APPRAISAL",
    PHONEBOOK: "PHONEBOOK"
});

/**
 * AttributedTerm class - represents a term with source attribution information
 * All terms require source attribution for data lineage and conflict resolution
 */
class AttributedTerm {
    constructor(term, source, index, identifier) {
        // The term/identifier value
        this.term = term;

        // Map where key is source (text) and value is an object with index and identifier properties
        this.sourceMap = new Map();

        // Set the initial source information (required)
        this.sourceMap.set(source, {
            index: index,
            identifier: identifier
        });
    }

    /**
     * Add additional source attribution for this term (for multi-source terms)
     * @param {string} source - The source identifier (text)
     * @param {number} index - Index value (integer >= -1)
     * @param {string|number} identifier - Identifier value (text or number)
     */
    addAdditionalSource(source, index, identifier) {
        this.sourceMap.set(source, {
            index: index,
            identifier: identifier
        });
    }

    /**
     * Get source information for a specific source
     * @param {string} source - The source to look up
     * @returns {object|undefined} Object with index and identifier properties, or undefined if not found
     */
    getSource(source) {
        return this.sourceMap.get(source);
    }

    /**
     * Get all sources for this term
     * @returns {Array} Array of source names
     */
    getSources() {
        return Array.from(this.sourceMap.keys());
    }

    /**
     * Check if this term has a specific source
     * @param {string} source - Source to check for
     * @returns {boolean} True if source exists
     */
    hasSource(source) {
        return this.sourceMap.has(source);
    }

    /**
     * Serialize AttributedTerm to JSON-compatible object
     * @returns {Object} Serialized representation
     */
    serialize() {
        return {
            type: 'AttributedTerm',
            term: this.term,
            sourceMap: Array.from(this.sourceMap.entries()).map(([source, data]) => ({
                source: source,
                index: data.index,
                identifier: data.identifier
            }))
        };
    }

    /**
     * Deserialize AttributedTerm from JSON object
     * @param {Object} data - Serialized data
     * @returns {AttributedTerm} Reconstructed AttributedTerm instance
     */
    static deserialize(data) {
        if (data.type !== 'AttributedTerm') {
            throw new Error('Invalid AttributedTerm serialization format');
        }

        // Recreate with first source entry
        const firstSource = data.sourceMap[0];
        const term = new AttributedTerm(data.term, firstSource.source, firstSource.index, firstSource.identifier);

        // Add remaining source entries
        for (let i = 1; i < data.sourceMap.length; i++) {
            const sourceData = data.sourceMap[i];
            term.addAdditionalSource(sourceData.source, sourceData.index, sourceData.identifier);
        }

        return term;
    }

    /**
     * Generic pattern matching against the term value
     * @param {string|RegExp} pattern - Pattern to match against
     * @returns {Array|null} Match results or null if no match
     */
    match(pattern) {
        if (typeof this.term === 'string') {
            return this.term.match(pattern);
        }
        return null;
    }

    /**
     * Generic regex testing against the term value
     * @param {RegExp} regex - Regular expression to test
     * @returns {boolean} True if pattern matches
     */
    matchesPattern(regex) {
        if (typeof this.term === 'string') {
            return regex.test(this.term);
        }
        return false;
    }

    /**
     * Extract numeric value from the term
     * @returns {number|null} Extracted number or null if no valid number found
     */
    extractNumeric() {
        if (typeof this.term === 'number') {
            return this.term;
        }
        if (typeof this.term === 'string') {
            const parsed = parseInt(this.term, 10);
            return isNaN(parsed) ? null : parsed;
        }
        return null;
    }

    /**
     * Returns the string representation of this AttributedTerm
     * @returns {string} The term value
     */
    toString() {
        return this.term;
    }
}

/**
 * Aliases class - manages alternative versions of identifiers
 * The primary function of this class is to support recognizing alternative versions of various
 * identifiers as being legitimate substitutes for that identifier. Any tested value will be
 * considered a legitimate substitute if it is found in the set of homonyms or the set of synonyms.
 */
class Aliases {
    constructor() {
        // Array of AttributedTerm objects representing homonyms
        this.homonyms = [];

        // Array of AttributedTerm objects representing synonyms
        this.synonyms = [];

        // Array of AttributedTerm objects representing candidates
        this.candidates = [];
    }

    /**
     * Add an AttributedTerm to the appropriate category
     * @param {AttributedTerm} attributedTerm - The AttributedTerm to add
     * @param {string} category - Category: 'homonyms', 'synonyms', or 'candidates'
     */
    add(attributedTerm, category = 'synonyms') {
        if (category === 'homonyms') {
            this.homonyms.push(attributedTerm);
        } else if (category === 'candidates') {
            this.candidates.push(attributedTerm);
        } else {
            this.synonyms.push(attributedTerm);
        }
    }

    /**
     * Remove an AttributedTerm from all categories
     * @param {AttributedTerm} attributedTerm - The AttributedTerm to remove
     */
    remove(attributedTerm) {
        this.homonyms = this.homonyms.filter(term => term.term !== attributedTerm.term);
        this.synonyms = this.synonyms.filter(term => term.term !== attributedTerm.term);
        this.candidates = this.candidates.filter(term => term.term !== attributedTerm.term);
    }

    /**
     * Check if a term value exists in any category
     * @param {string|number} termValue - The term value to check for
     * @returns {boolean} True if term value found in homonyms or synonyms
     */
    contains(termValue) {
        return this.homonyms.some(term => term.term === termValue) ||
               this.synonyms.some(term => term.term === termValue);
    }

    /**
     * Get all term values from all categories
     * @returns {Array} Array of term values
     */
    getAllTermValues() {
        return [
            ...this.homonyms.map(term => term.term),
            ...this.synonyms.map(term => term.term),
            ...this.candidates.map(term => term.term)
        ];
    }

    /**
     * Get all AttributedTerm objects from all categories
     * @returns {Array} Array of AttributedTerm objects
     */
    getAllAttributedTerms() {
        return [...this.homonyms, ...this.synonyms, ...this.candidates];
    }

    /**
     * Serialize Aliases to JSON-compatible object
     * @returns {Object} Serialized representation
     */
    serialize() {
        return {
            type: 'Aliases',
            homonyms: this.homonyms.map(term => term.serialize()),
            synonyms: this.synonyms.map(term => term.serialize()),
            candidates: this.candidates.map(term => term.serialize())
        };
    }

    /**
     * Deserialize Aliases from JSON object
     * @param {Object} data - Serialized data
     * @returns {Aliases} Reconstructed Aliases instance
     */
    static deserialize(data) {
        if (data.type !== 'Aliases') {
            throw new Error('Invalid Aliases serialization format');
        }

        const aliases = new Aliases();
        aliases.homonyms = data.homonyms.map(termData => AttributedTerm.deserialize(termData));
        aliases.synonyms = data.synonyms.map(termData => AttributedTerm.deserialize(termData));
        aliases.candidates = data.candidates.map(termData => AttributedTerm.deserialize(termData));

        return aliases;
    }
}

/**
 * Aliased class - top-level class for entities that can have multiple representations
 * Addresses the core Alias Problem in the BIRAVA2025 system
 */
class Aliased {
    /**
     * Create an Aliased entity
     * @param {AttributedTerm} primaryAlias - The primary/canonical representation with source attribution
     */
    constructor(primaryAlias) {
        // The primary/canonical representation of this entity (AttributedTerm object)
        this.primaryAlias = primaryAlias;

        // Collection of alternative representations
        this.alternatives = new Aliases();
    }

    /**
     * Add an alternative representation
     * @param {AttributedTerm} aliasAttributedTerm - Alternative representation to add
     */
    addAlternative(aliasAttributedTerm) {
        // Don't add the primary alias as an alternative
        if (aliasAttributedTerm.term !== this.primaryAlias.term) {
            this.alternatives.add(aliasAttributedTerm);
        }
    }

    /**
     * Remove an alternative representation
     * @param {AttributedTerm} aliasAttributedTerm - Alternative representation to remove
     */
    removeAlternative(aliasAttributedTerm) {
        this.alternatives.remove(aliasAttributedTerm);
    }

    /**
     * Check if this entity matches a given representation
     * @param {string|number} termValue - Term value to check against
     * @returns {boolean} True if the term value matches this entity
     */
    matches(termValue) {
        return termValue === this.primaryAlias.term || this.alternatives.contains(termValue);
    }

    /**
     * Get all term values (primary + alternatives)
     * @returns {Array} Array containing primary term value and all alternative term values
     */
    getAllTermValues() {
        return [this.primaryAlias.term, ...this.alternatives.getAllTermValues()];
    }

    /**
     * Get all AttributedTerm objects (primary + alternatives)
     * @returns {Array} Array containing primary AttributedTerm and all alternative AttributedTerms
     */
    getAllAttributedTerms() {
        return [this.primaryAlias, ...this.alternatives.getAllAttributedTerms()];
    }

    /**
     * Set a new primary alias, moving the current primary to alternatives if needed
     * @param {AttributedTerm} newPrimary - New primary AttributedTerm
     */
    setPrimaryAlias(newPrimary) {
        // Add current primary to alternatives if it's not the same as the new one
        if (this.primaryAlias.term !== newPrimary.term) {
            this.alternatives.add(this.primaryAlias);
            this.primaryAlias = newPrimary;
            // Remove the new primary from alternatives if it was there
            this.alternatives.remove(newPrimary);
        }
    }

    /**
     * Serialize Aliased to JSON-compatible object
     * @returns {Object} Serialized representation
     */
    serialize() {
        return {
            type: 'Aliased',
            primaryAlias: this.primaryAlias.serialize(),
            alternatives: this.alternatives.serialize()
        };
    }

    /**
     * Deserialize Aliased from JSON object
     * @param {Object} data - Serialized data
     * @returns {Aliased} Reconstructed Aliased instance
     */
    static deserialize(data) {
        if (data.type !== 'Aliased') {
            throw new Error('Invalid Aliased serialization format');
        }

        const primaryAlias = AttributedTerm.deserialize(data.primaryAlias);
        const aliased = new Aliased(primaryAlias);
        aliased.alternatives = Aliases.deserialize(data.alternatives);

        return aliased;
    }

    /**
     * Returns the string representation of this Aliased object
     * @returns {string} The primary alias value
     */
    toString() {
        return this.primaryAlias.toString();
    }
}

/**
 * SimpleIdentifiers class - subclass of Aliased for simple identifier types
 * @param {AttributedTerm} primaryAlias - AttributedTerm containing the primary identifier value
 */
class SimpleIdentifiers extends Aliased {
    constructor(primaryAlias) {
        super(primaryAlias);
    }

    /**
     * Serialize SimpleIdentifiers to JSON-compatible object
     * @returns {Object} Serialized representation
     */
    serialize() {
        return {
            type: 'SimpleIdentifiers',
            primaryAlias: this.primaryAlias.serialize(),
            alternatives: this.alternatives.serialize()
        };
    }

    /**
     * Deserialize SimpleIdentifiers from JSON object
     * @param {Object} data - Serialized data
     * @returns {SimpleIdentifiers} Reconstructed SimpleIdentifiers instance
     */
    static deserialize(data) {
        if (data.type !== 'SimpleIdentifiers') {
            throw new Error('Invalid SimpleIdentifiers serialization format');
        }

        const primaryAlias = AttributedTerm.deserialize(data.primaryAlias);
        const identifier = new SimpleIdentifiers(primaryAlias);
        identifier.alternatives = Aliases.deserialize(data.alternatives);

        return identifier;
    }
}

/**
 * IndicativeData class - container that holds identifier fields of moderate reliability
 * Used for data that suggests identity but isn't definitive (contact info, account numbers)
 * Contains either SimpleIdentifiers or ComplexIdentifiers instance
 */
class IndicativeData {
    constructor(identifier) {
        // identifier should be either SimpleIdentifiers or ComplexIdentifiers instance
        this.identifier = identifier;
    }

    /**
     * Serialize IndicativeData to JSON-compatible object
     * @returns {Object} Serialized representation
     */
    serialize() {
        return {
            type: 'IndicativeData',
            identifier: this.identifier.serialize()
        };
    }

    /**
     * Deserialize IndicativeData from JSON object
     * @param {Object} data - Serialized data
     * @returns {IndicativeData} Reconstructed IndicativeData instance
     */
    static deserialize(data) {
        if (data.type !== 'IndicativeData') {
            throw new Error('Invalid IndicativeData serialization format');
        }

        // Determine identifier type and deserialize appropriately
        const identifier = this._deserializeIdentifier(data.identifier);
        return new IndicativeData(identifier);
    }

    /**
     * Helper method to deserialize identifier based on type
     * @param {Object} identifierData - Serialized identifier data
     * @returns {SimpleIdentifiers|ComplexIdentifiers} Reconstructed identifier
     * @private
     */
    static _deserializeIdentifier(identifierData) {
        switch (identifierData.type) {
            case 'SimpleIdentifiers':
                return SimpleIdentifiers.deserialize(identifierData);
            case 'FireNumber':
                return FireNumber.deserialize(identifierData);
            case 'PID':
                return PID.deserialize(identifierData);
            case 'PoBox':
                return PoBox.deserialize(identifierData);
            case 'ComplexIdentifiers':
                return ComplexIdentifiers.deserialize(identifierData);
            case 'IndividualName':
                return IndividualName.deserialize(identifierData);
            case 'HouseholdName':
                return HouseholdName.deserialize(identifierData);
            default:
                throw new Error(`Unknown identifier type: ${identifierData.type}`);
        }
    }

    /**
     * Returns the string representation of this IndicativeData
     * @returns {string} The contained identifier's string representation
     */
    toString() {
        return this.identifier.toString();
    }
}

/**
 * IdentifyingData class - container that holds identifier fields of high reliability
 * Used for data that provides definitive identification (Fire Numbers, PIDs, names)
 * Contains either SimpleIdentifiers or ComplexIdentifiers instance
 */
class IdentifyingData {
    constructor(identifier) {
        // identifier should be either SimpleIdentifiers or ComplexIdentifiers instance
        this.identifier = identifier;
    }

    /**
     * Serialize IdentifyingData to JSON-compatible object
     * @returns {Object} Serialized representation
     */
    serialize() {
        return {
            type: 'IdentifyingData',
            identifier: this.identifier.serialize()
        };
    }

    /**
     * Deserialize IdentifyingData from JSON object
     * @param {Object} data - Serialized data
     * @returns {IdentifyingData} Reconstructed IdentifyingData instance
     */
    static deserialize(data) {
        if (data.type !== 'IdentifyingData') {
            throw new Error('Invalid IdentifyingData serialization format');
        }

        // Use the same helper method as IndicativeData
        const identifier = IndicativeData._deserializeIdentifier(data.identifier);
        return new IdentifyingData(identifier);
    }

    /**
     * Returns the string representation of this IdentifyingData
     * @returns {string} The contained identifier's string representation
     */
    toString() {
        return this.identifier.toString();
    }
}

/**
 * FireNumber class - subclass of SimpleIdentifiers for Block Island fire numbers
 * PRIMARY location identifier: integer, 4 digits or less, <3500
 * Found as standalone field or extracted from beginning of Block Island street addresses
 * @param {AttributedTerm} primaryAlias - AttributedTerm containing the fire number value
 */
class FireNumber extends SimpleIdentifiers {
    constructor(primaryAlias) {
        super(primaryAlias);
    }

    /**
     * Serialize FireNumber to JSON-compatible object
     * @returns {Object} Serialized representation
     */
    serialize() {
        return {
            type: 'FireNumber',
            primaryAlias: this.primaryAlias.serialize(),
            alternatives: this.alternatives.serialize()
        };
    }

    /**
     * Deserialize FireNumber from JSON object
     * @param {Object} data - Serialized data
     * @returns {FireNumber} Reconstructed FireNumber instance
     */
    static deserialize(data) {
        if (data.type !== 'FireNumber') {
            throw new Error('Invalid FireNumber serialization format');
        }

        const primaryAlias = AttributedTerm.deserialize(data.primaryAlias);
        const fireNumber = new FireNumber(primaryAlias);
        fireNumber.alternatives = Aliases.deserialize(data.alternatives);

        return fireNumber;
    }
}

/**
 * PoBox class - subclass of SimpleIdentifiers for PO Box identifiers
 * @param {AttributedTerm} primaryAlias - AttributedTerm containing the PO Box number
 */
class PoBox extends SimpleIdentifiers {
    constructor(primaryAlias) {
        super(primaryAlias);
    }

    /**
     * Serialize PoBox to JSON-compatible object
     * @returns {Object} Serialized representation
     */
    serialize() {
        return {
            type: 'PoBox',
            primaryAlias: this.primaryAlias.serialize(),
            alternatives: this.alternatives.serialize()
        };
    }

    /**
     * Deserialize PoBox from JSON object
     * @param {Object} data - Serialized data
     * @returns {PoBox} Reconstructed PoBox instance
     */
    static deserialize(data) {
        if (data.type !== 'PoBox') {
            throw new Error('Invalid PoBox serialization format');
        }

        const primaryAlias = AttributedTerm.deserialize(data.primaryAlias);
        const poBox = new PoBox(primaryAlias);
        poBox.alternatives = Aliases.deserialize(data.alternatives);

        return poBox;
    }
}

/**
 * PID class - subclass of SimpleIdentifiers for Parcel ID identifiers
 * SECONDARY location identifier: used only when Fire Number unavailable
 * Should have 1:1 relationship with Fire Numbers (conflicts indicate data errors)
 * @param {AttributedTerm} primaryAlias - AttributedTerm containing the PID value
 */
class PID extends SimpleIdentifiers {
    constructor(primaryAlias) {
        super(primaryAlias);
    }

    /**
     * Serialize PID to JSON-compatible object
     * @returns {Object} Serialized representation
     */
    serialize() {
        return {
            type: 'PID',
            primaryAlias: this.primaryAlias.serialize(),
            alternatives: this.alternatives.serialize()
        };
    }

    /**
     * Deserialize PID from JSON object
     * @param {Object} data - Serialized data
     * @returns {PID} Reconstructed PID instance
     */
    static deserialize(data) {
        if (data.type !== 'PID') {
            throw new Error('Invalid PID serialization format');
        }

        const primaryAlias = AttributedTerm.deserialize(data.primaryAlias);
        const pid = new PID(primaryAlias);
        pid.alternatives = Aliases.deserialize(data.alternatives);

        return pid;
    }
}

/**
 * ComplexIdentifiers class - subclass of Aliased for complex identifier types
 * @param {AttributedTerm} primaryAlias - AttributedTerm containing the primary identifier value
 */
class ComplexIdentifiers extends Aliased {
    constructor(primaryAlias) {
        super(primaryAlias);
    }

    /**
     * Serialize ComplexIdentifiers to JSON-compatible object
     * @returns {Object} Serialized representation
     */
    serialize() {
        return {
            type: 'ComplexIdentifiers',
            primaryAlias: this.primaryAlias.serialize(),
            alternatives: this.alternatives.serialize()
        };
    }

    /**
     * Deserialize ComplexIdentifiers from JSON object
     * @param {Object} data - Serialized data
     * @returns {ComplexIdentifiers} Reconstructed ComplexIdentifiers instance
     */
    static deserialize(data) {
        if (data.type !== 'ComplexIdentifiers') {
            throw new Error('Invalid ComplexIdentifiers serialization format');
        }

        const primaryAlias = AttributedTerm.deserialize(data.primaryAlias);
        const identifier = new ComplexIdentifiers(primaryAlias);
        identifier.alternatives = Aliases.deserialize(data.alternatives);

        return identifier;
    }
}

/**
 * IndividualName class - subclass of ComplexIdentifiers for individual names
 * This is a complex identifier that will be held within IdentifyingData
 * @param {AttributedTerm} primaryAlias - AttributedTerm containing the complete individual name
 * @param {string} title - Title (not in Bloomerang data - will be empty)
 * @param {string} firstName - First name from Bloomerang Field 2
 * @param {string} otherNames - Middle name(s) from Bloomerang Field 3
 * @param {string} lastName - Last name from Bloomerang Field 4
 * @param {string} suffix - Suffix (not in Bloomerang data - will be empty)
 */
class IndividualName extends ComplexIdentifiers {
    constructor(primaryAlias, title = "", firstName = "", otherNames = "", lastName = "", suffix = "") {
        super(primaryAlias);

        // Individual name components
        this.title = title;           // Not in Bloomerang data - empty
        this.firstName = firstName;   // Field 2: First Name
        this.otherNames = otherNames; // Field 3: Middle Name
        this.lastName = lastName;     // Field 4: Last Name
        this.suffix = suffix;         // Not in Bloomerang data - empty

        // Derived properties
        this.completeName = this._buildCompleteName();
        this.termOfAddress = this.completeName; // Initially matches completeName
    }

    /**
     * Build complete name from components, skipping empty fields
     * @returns {string} Concatenated complete name
     * @private
     */
    _buildCompleteName() {
        const parts = [this.title, this.firstName, this.otherNames, this.lastName, this.suffix]
            .filter(part => part && part.trim() !== "");
        return parts.join(" ");
    }

    /**
     * Update term of address (can be different from completeName)
     * @param {string} termOfAddress - Preferred term of address
     */
    setTermOfAddress(termOfAddress) {
        this.termOfAddress = termOfAddress;
    }

    /**
     * Get formatted name for display
     * @param {string} format - Format type: 'full', 'lastFirst', 'firstLast'
     * @returns {string} Formatted name
     */
    getFormattedName(format = 'full') {
        switch (format) {
            case 'lastFirst':
                return this.lastName && this.firstName ?
                    `${this.lastName}, ${this.firstName}${this.otherNames ? ' ' + this.otherNames : ''}` :
                    this.completeName;
            case 'firstLast':
                return this.firstName && this.lastName ?
                    `${this.firstName}${this.otherNames ? ' ' + this.otherNames : ''} ${this.lastName}` :
                    this.completeName;
            case 'full':
            default:
                return this.completeName;
        }
    }

    /**
     * Serialize IndividualName to JSON-compatible object
     * @returns {Object} Serialized representation
     */
    serialize() {
        return {
            type: 'IndividualName',
            primaryAlias: this.primaryAlias.serialize(),
            alternatives: this.alternatives.serialize(),
            title: this.title,
            firstName: this.firstName,
            otherNames: this.otherNames,
            lastName: this.lastName,
            suffix: this.suffix,
            completeName: this.completeName,
            termOfAddress: this.termOfAddress
        };
    }

    /**
     * Deserialize IndividualName from JSON object
     * @param {Object} data - Serialized data
     * @returns {IndividualName} Reconstructed IndividualName instance
     */
    static deserialize(data) {
        if (data.type !== 'IndividualName') {
            throw new Error('Invalid IndividualName serialization format');
        }

        const primaryAlias = AttributedTerm.deserialize(data.primaryAlias);
        const individualName = new IndividualName(
            primaryAlias,
            data.title,
            data.firstName,
            data.otherNames,
            data.lastName,
            data.suffix
        );

        individualName.alternatives = Aliases.deserialize(data.alternatives);
        individualName.termOfAddress = data.termOfAddress;

        return individualName;
    }
}

/**
 * HouseholdName class - subclass of ComplexIdentifiers for household names
 * Used for compound names found in records and synthesized household names
 * This is a complex identifier that will be held within IdentifyingData
 * @param {AttributedTerm} primaryAlias - AttributedTerm containing the household name
 * @param {string} fullName - Full household name from Bloomerang Field 21
 */
class HouseholdName extends ComplexIdentifiers {
    constructor(primaryAlias, fullName = "") {
        super(primaryAlias);

        // Household name properties
        this.fullName = fullName;           // Field 21: Household Name from CSV
        this.memberNames = [];              // Array of IndividualName objects - populated during processing
    }

    /**
     * Add an individual name to this household's member list
     * @param {IndividualName} individualName - IndividualName object to add to household
     */
    addMember(individualName) {
        // Check if individual is already in the household (by completeName)
        const existingMember = this.memberNames.find(
            member => member.completeName === individualName.completeName
        );

        if (!existingMember) {
            this.memberNames.push(individualName);
        }
    }

    /**
     * Remove an individual name from this household's member list
     * @param {IndividualName} individualName - IndividualName object to remove
     */
    removeMember(individualName) {
        this.memberNames = this.memberNames.filter(
            member => member.completeName !== individualName.completeName
        );
    }

    /**
     * Get list of all member names as strings
     * @returns {Array<string>} Array of complete names of household members
     */
    getMemberNameStrings() {
        return this.memberNames.map(member => member.completeName);
    }

    /**
     * Get household summary for display/debugging
     * @returns {Object} Summary of household information
     */
    getHouseholdSummary() {
        return {
            fullName: this.fullName,
            memberCount: this.memberNames.length,
            memberNames: this.getMemberNameStrings(),
            primaryAlias: this.primaryAlias.term
        };
    }

    /**
     * Check if this household has a specific member
     * @param {string} completeName - Complete name to check for
     * @returns {boolean} True if member found in household
     */
    hasMember(completeName) {
        return this.memberNames.some(member => member.completeName === completeName);
    }

    /**
     * Serialize HouseholdName to JSON-compatible object
     * @returns {Object} Serialized representation
     */
    serialize() {
        return {
            type: 'HouseholdName',
            primaryAlias: this.primaryAlias.serialize(),
            alternatives: this.alternatives.serialize(),
            fullName: this.fullName,
            memberNames: this.memberNames.map(member => member.serialize())
        };
    }

    /**
     * Deserialize HouseholdName from JSON object
     * @param {Object} data - Serialized data
     * @returns {HouseholdName} Reconstructed HouseholdName instance
     */
    static deserialize(data) {
        if (data.type !== 'HouseholdName') {
            throw new Error('Invalid HouseholdName serialization format');
        }

        const primaryAlias = AttributedTerm.deserialize(data.primaryAlias);
        const householdName = new HouseholdName(primaryAlias, data.fullName);

        householdName.alternatives = Aliases.deserialize(data.alternatives);
        householdName.memberNames = data.memberNames.map(memberData =>
            IndividualName.deserialize(memberData)
        );

        return householdName;
    }
}

/**
 * FireNumberTerm class - specialized AttributedTerm for Block Island Fire Numbers
 * Extends AttributedTerm with Fire Number-specific validation and extraction methods
 */
class FireNumberTerm extends AttributedTerm {
    constructor(term, source, index, identifier) {
        super(term, source, index, identifier);
    }

    /**
     * Extract and validate Fire Number from the term
     * Fire Numbers are integers, 4 digits or less, < 3500
     * @returns {number|null} Valid Fire Number or null if invalid
     */
    extractFireNumber() {
        const numeric = this.extractNumeric();
        if (numeric !== null && this.isValidFireNumber()) {
            return numeric;
        }
        return null;
    }

    /**
     * Check if the term represents a valid Block Island Fire Number
     * @returns {boolean} True if valid Fire Number
     */
    isValidFireNumber() {
        const numeric = this.extractNumeric();
        if (numeric === null) return false;

        // Block Island Fire Number business rules:
        // - Must be positive integer
        // - Must be less than 3500
        // - Must be 4 digits or less
        return numeric > 0 && numeric < 3500 && numeric.toString().length <= 4;
    }

    /**
     * Serialize FireNumberTerm to JSON-compatible object
     * @returns {Object} Serialized representation
     */
    serialize() {
        return {
            type: 'FireNumberTerm',
            term: this.term,
            sourceMap: Array.from(this.sourceMap.entries()).map(([source, data]) => ({
                source: source,
                index: data.index,
                identifier: data.identifier
            }))
        };
    }

    /**
     * Deserialize FireNumberTerm from JSON object
     * @param {Object} data - Serialized data
     * @returns {FireNumberTerm} Reconstructed FireNumberTerm instance
     */
    static deserialize(data) {
        if (data.type !== 'FireNumberTerm') {
            throw new Error('Invalid FireNumberTerm serialization format');
        }

        const firstSource = data.sourceMap[0];
        const term = new FireNumberTerm(data.term, firstSource.source, firstSource.index, firstSource.identifier);

        for (let i = 1; i < data.sourceMap.length; i++) {
            const sourceData = data.sourceMap[i];
            term.addAdditionalSource(sourceData.source, sourceData.index, sourceData.identifier);
        }

        return term;
    }
}

/**
 * AccountNumberTerm class - specialized AttributedTerm for account numbers
 * Extends AttributedTerm with account-specific validation and extraction methods
 */
class AccountNumberTerm extends AttributedTerm {
    constructor(term, source, index, identifier) {
        super(term, source, index, identifier);
    }

    /**
     * Extract account number from the term
     * @returns {string|number|null} Account number or null if invalid
     */
    extractAccountNumber() {
        if (this.isValidAccount()) {
            return this.term;
        }
        return null;
    }

    /**
     * Check if the term represents a valid account number
     * @returns {boolean} True if valid account number
     */
    isValidAccount() {
        // Account number validation rules:
        // - Must not be empty/null/undefined
        // - Can be string or number
        // - Must contain at least one alphanumeric character
        if (this.term === null || this.term === undefined || this.term === '') {
            return false;
        }

        const termStr = this.term.toString();
        return /[a-zA-Z0-9]/.test(termStr);
    }

    /**
     * Serialize AccountNumberTerm to JSON-compatible object
     * @returns {Object} Serialized representation
     */
    serialize() {
        return {
            type: 'AccountNumberTerm',
            term: this.term,
            sourceMap: Array.from(this.sourceMap.entries()).map(([source, data]) => ({
                source: source,
                index: data.index,
                identifier: data.identifier
            }))
        };
    }

    /**
     * Deserialize AccountNumberTerm from JSON object
     * @param {Object} data - Serialized data
     * @returns {AccountNumberTerm} Reconstructed AccountNumberTerm instance
     */
    static deserialize(data) {
        if (data.type !== 'AccountNumberTerm') {
            throw new Error('Invalid AccountNumberTerm serialization format');
        }

        const firstSource = data.sourceMap[0];
        const term = new AccountNumberTerm(data.term, firstSource.source, firstSource.index, firstSource.identifier);

        for (let i = 1; i < data.sourceMap.length; i++) {
            const sourceData = data.sourceMap[i];
            term.addAdditionalSource(sourceData.source, sourceData.index, sourceData.identifier);
        }

        return term;
    }
}

/**
 * EmailTerm class - specialized AttributedTerm for email addresses
 * Extends AttributedTerm with email-specific validation and parsing methods
 */
class EmailTerm extends AttributedTerm {
    constructor(term, source, index, identifier) {
        super(term, source, index, identifier);
    }

    /**
     * Check if the term represents a valid email address
     * @returns {boolean} True if valid email format
     */
    isValidEmail() {
        if (typeof this.term !== 'string' || this.term === '') {
            return false;
        }

        // Basic email validation regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(this.term);
    }

    /**
     * Extract domain from email address
     * @returns {string|null} Domain portion of email or null if invalid
     */
    extractDomain() {
        if (!this.isValidEmail()) {
            return null;
        }

        const atIndex = this.term.indexOf('@');
        if (atIndex === -1) {
            return null;
        }

        return this.term.substring(atIndex + 1);
    }

    /**
     * Extract username from email address
     * @returns {string|null} Username portion of email or null if invalid
     */
    extractUsername() {
        if (!this.isValidEmail()) {
            return null;
        }

        const atIndex = this.term.indexOf('@');
        if (atIndex === -1) {
            return null;
        }

        return this.term.substring(0, atIndex);
    }

    /**
     * Serialize EmailTerm to JSON-compatible object
     * @returns {Object} Serialized representation
     */
    serialize() {
        return {
            type: 'EmailTerm',
            term: this.term,
            sourceMap: Array.from(this.sourceMap.entries()).map(([source, data]) => ({
                source: source,
                index: data.index,
                identifier: data.identifier
            }))
        };
    }

    /**
     * Deserialize EmailTerm from JSON object
     * @param {Object} data - Serialized data
     * @returns {EmailTerm} Reconstructed EmailTerm instance
     */
    static deserialize(data) {
        if (data.type !== 'EmailTerm') {
            throw new Error('Invalid EmailTerm serialization format');
        }

        const firstSource = data.sourceMap[0];
        const term = new EmailTerm(data.term, firstSource.source, firstSource.index, firstSource.identifier);

        for (let i = 1; i < data.sourceMap.length; i++) {
            const sourceData = data.sourceMap[i];
            term.addAdditionalSource(sourceData.source, sourceData.index, sourceData.identifier);
        }

        return term;
    }
}

// Export classes and constants for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DATA_SOURCES,
        AttributedTerm,
        FireNumberTerm,
        AccountNumberTerm,
        EmailTerm,
        Aliases,
        Aliased,
        SimpleIdentifiers,
        IndicativeData,
        IdentifyingData,
        FireNumber,
        PoBox,
        PID,
        ComplexIdentifiers,
        IndividualName,
        HouseholdName
    };
}