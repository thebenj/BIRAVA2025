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
    constructor(term, source, index, identifier, fieldName = null) {
        // The term/identifier value
        this.term = term;

        // Field name - specifies the entity property name where this term's data will be stored
        // Example: "email", "fireNumber", "completeName", etc.
        this.fieldName = fieldName;

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
     * Set or update the field name for this term
     * @param {string} fieldName - The entity property name where this term will be stored
     */
    setFieldName(fieldName) {
        this.fieldName = fieldName;
    }

    /**
     * Get the field name for this term
     * @returns {string|null} The field name or null if not set
     */
    getFieldName() {
        return this.fieldName;
    }

    /**
     * Serialize AttributedTerm to JSON-compatible object
     * @returns {Object} Serialized representation
     */
    serialize() {
        return {
            type: 'AttributedTerm',
            term: this.term,
            fieldName: this.fieldName,
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
        const term = new AttributedTerm(
            data.term,
            firstSource.source,
            firstSource.index,
            firstSource.identifier,
            data.fieldName || null  // Include fieldName in reconstruction
        );

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
     * @returns {string} The term value with fieldName context if available
     */
    toString() {
        if (this.fieldName) {
            return `${this.term} (field: ${this.fieldName})`;
        }
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
            case 'Address':
                return Address.deserialize(identifierData);
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
 * @param {string} fullHouseholdName - Full household name from Bloomerang Field 21
 */
class HouseholdName extends ComplexIdentifiers {
    constructor(primaryAlias, fullHouseholdName = "") {
        super(primaryAlias);

        // Household name properties
        this.fullHouseholdName = fullHouseholdName;  // Field 21: Household Name from CSV
        this.memberNames = [];                       // Array of IndividualName objects - populated during processing
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
            fullHouseholdName: this.fullHouseholdName,
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
            fullHouseholdName: this.fullHouseholdName,
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
        const householdName = new HouseholdName(primaryAlias, data.fullHouseholdName || data.fullName);  // Support both old and new format

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

/**
 * Address class - subclass of ComplexIdentifiers for address data
 * Contains multiple properties, each holding AttributedTerm for different address components
 * Supports Block Island specific functionality with fire number detection
 */
class Address extends ComplexIdentifiers {
    constructor(primaryAlias) {
        super(primaryAlias);

        // Original data preservation
        this.originalAddress = null;    // AttributedTerm for full unparsed address string
        this.recipientDetails = null;   // AttributedTerm for recipient info (C/O, business names, etc.)

        // Parsed components from parse-address library
        this.streetNumber = null;       // AttributedTerm for "123"
        this.streetName = null;         // AttributedTerm for "Main"
        this.streetType = null;         // AttributedTerm for "St"
        this.city = null;              // AttributedTerm for "Block Island"
        this.state = null;             // AttributedTerm for "RI"
        this.zipCode = null;           // AttributedTerm for "02807"

        // Special address components (when applicable)
        this.secUnitType = null;       // AttributedTerm for "PO Box", "Apt", etc.
        this.secUnitNum = null;        // AttributedTerm for unit numbers

        // Block Island specific metadata
        this.isBlockIslandAddress = null; // AttributedTerm for boolean flag
        this.cityNormalized = null;    // AttributedTerm for normalization flag

        // Processing metadata
        this.processingSource = null;   // AttributedTerm for "VisionAppraisal", "Bloomerang"
        this.processingTimestamp = null; // AttributedTerm for when parsed
    }

    /**
     * Get fire number if this is a Block Island address
     * Block Island street numbers ARE fire numbers
     * @returns {AttributedTerm|null} Fire number AttributedTerm or null if not BI address
     */
    getFireNumber() {
        if (this.isBlockIslandAddress &&
            this.isBlockIslandAddress.term === true &&
            this.streetNumber) {
            return this.streetNumber; // Same object reference
        }
        return null;
    }

    /**
     * Check if this address has a valid fire number
     * @returns {boolean} True if BI address with street number
     */
    hasFireNumber() {
        return this.getFireNumber() !== null;
    }

    /**
     * Get complete address summary for display and debugging
     * @returns {Object} Summary of all address components
     */
    getAddressSummary() {
        return {
            original: this.originalAddress ? this.originalAddress.term : null,
            street: this.getStreetDisplay(),
            city: this.city ? this.city.term : null,
            state: this.state ? this.state.term : null,
            zip: this.zipCode ? this.zipCode.term : null,
            isBlockIsland: this.isBlockIslandAddress ? this.isBlockIslandAddress.term : false,
            hasFireNumber: this.hasFireNumber(),
            fireNumber: this.hasFireNumber() ? this.getFireNumber().term : null,
            processingSource: this.processingSource ? this.processingSource.term : null
        };
    }

    /**
     * Get formatted street display
     * @returns {string} Formatted street address or null
     */
    getStreetDisplay() {
        const parts = [];
        if (this.streetNumber) parts.push(this.streetNumber.term);
        if (this.streetName) parts.push(this.streetName.term);
        if (this.streetType) parts.push(this.streetType.term);

        // Handle special units (PO Box, Apt, etc.)
        if (this.secUnitType) {
            parts.push(this.secUnitType.term);
            if (this.secUnitNum) parts.push(this.secUnitNum.term);
        }

        return parts.length > 0 ? parts.join(' ') : null;
    }

    /**
     * Create Address from processed address data
     * @param {Object} processedAddress - Output from processAddress() function
     * @param {string} fieldName - Field name for data lineage
     * @returns {Address} New Address instance
     */
    static fromProcessedAddress(processedAddress, fieldName) {
        if (!processedAddress || !processedAddress.original) {
            throw new Error('Invalid processed address data');
        }

        // Create primary alias from original address string
        const primaryAlias = new AttributedTerm(
            processedAddress.original,
            processedAddress.sourceType,
            fieldName,
            'original_address'
        );

        const address = new Address(primaryAlias);

        // Set original address (same as primaryAlias for consistency)
        address.originalAddress = primaryAlias;

        // Set recipient details if present
        if (processedAddress.recipientDetails) {
            address.recipientDetails = new AttributedTerm(
                processedAddress.recipientDetails,
                processedAddress.sourceType,
                fieldName,
                'recipient_details'
            );
        }

        // Create AttributedTerms for each component with proper data lineage
        if (processedAddress.number) {
            address.streetNumber = new AttributedTerm(
                processedAddress.number,
                processedAddress.sourceType,
                fieldName,
                'street_number'
            );
        }

        if (processedAddress.street) {
            address.streetName = new AttributedTerm(
                processedAddress.street,
                processedAddress.sourceType,
                fieldName,
                'street_name'
            );
        }

        if (processedAddress.type) {
            address.streetType = new AttributedTerm(
                processedAddress.type,
                processedAddress.sourceType,
                fieldName,
                'street_type'
            );
        }

        if (processedAddress.city) {
            address.city = new AttributedTerm(
                processedAddress.city,
                processedAddress.sourceType,
                fieldName,
                'city'
            );
        }

        if (processedAddress.state) {
            address.state = new AttributedTerm(
                processedAddress.state,
                processedAddress.sourceType,
                fieldName,
                'state'
            );
        }

        if (processedAddress.zip) {
            address.zipCode = new AttributedTerm(
                processedAddress.zip,
                processedAddress.sourceType,
                fieldName,
                'zip_code'
            );
        }

        if (processedAddress.secUnitType) {
            address.secUnitType = new AttributedTerm(
                processedAddress.secUnitType,
                processedAddress.sourceType,
                fieldName,
                'unit_type'
            );
        }

        if (processedAddress.secUnitNum) {
            address.secUnitNum = new AttributedTerm(
                processedAddress.secUnitNum,
                processedAddress.sourceType,
                fieldName,
                'unit_number'
            );
        }

        // Block Island metadata
        address.isBlockIslandAddress = new AttributedTerm(
            processedAddress.isBlockIslandAddress,
            processedAddress.sourceType,
            fieldName,
            'is_block_island'
        );

        address.cityNormalized = new AttributedTerm(
            processedAddress.cityNormalized || false,
            processedAddress.sourceType,
            fieldName,
            'city_normalized'
        );

        // Processing metadata
        address.processingSource = new AttributedTerm(
            processedAddress.sourceType,
            processedAddress.sourceType,
            fieldName,
            'processing_source'
        );

        address.processingTimestamp = new AttributedTerm(
            processedAddress.processedAt || new Date().toISOString(),
            processedAddress.sourceType,
            fieldName,
            'processing_timestamp'
        );

        return address;
    }

    /**
     * Serialize Address to JSON-compatible object
     * @returns {Object} Serialized representation
     */
    serialize() {
        return {
            type: 'Address',
            primaryAlias: this.primaryAlias.serialize(),
            alternatives: this.alternatives.serialize(),
            originalAddress: this.originalAddress ? this.originalAddress.serialize() : null,
            recipientDetails: this.recipientDetails ? this.recipientDetails.serialize() : null,
            streetNumber: this.streetNumber ? this.streetNumber.serialize() : null,
            streetName: this.streetName ? this.streetName.serialize() : null,
            streetType: this.streetType ? this.streetType.serialize() : null,
            city: this.city ? this.city.serialize() : null,
            state: this.state ? this.state.serialize() : null,
            zipCode: this.zipCode ? this.zipCode.serialize() : null,
            secUnitType: this.secUnitType ? this.secUnitType.serialize() : null,
            secUnitNum: this.secUnitNum ? this.secUnitNum.serialize() : null,
            isBlockIslandAddress: this.isBlockIslandAddress ? this.isBlockIslandAddress.serialize() : null,
            cityNormalized: this.cityNormalized ? this.cityNormalized.serialize() : null,
            processingSource: this.processingSource ? this.processingSource.serialize() : null,
            processingTimestamp: this.processingTimestamp ? this.processingTimestamp.serialize() : null
        };
    }

    /**
     * Deserialize Address from JSON object
     * @param {Object} data - Serialized data
     * @returns {Address} Reconstructed Address instance
     */
    static deserialize(data) {
        if (data.type !== 'Address') {
            throw new Error('Invalid Address serialization format');
        }

        const primaryAlias = AttributedTerm.deserialize(data.primaryAlias);
        const address = new Address(primaryAlias);

        address.alternatives = Aliases.deserialize(data.alternatives);

        // Deserialize all components
        if (data.originalAddress) address.originalAddress = AttributedTerm.deserialize(data.originalAddress);
        if (data.recipientDetails) address.recipientDetails = AttributedTerm.deserialize(data.recipientDetails);
        if (data.streetNumber) address.streetNumber = AttributedTerm.deserialize(data.streetNumber);
        if (data.streetName) address.streetName = AttributedTerm.deserialize(data.streetName);
        if (data.streetType) address.streetType = AttributedTerm.deserialize(data.streetType);
        if (data.city) address.city = AttributedTerm.deserialize(data.city);
        if (data.state) address.state = AttributedTerm.deserialize(data.state);
        if (data.zipCode) address.zipCode = AttributedTerm.deserialize(data.zipCode);
        if (data.secUnitType) address.secUnitType = AttributedTerm.deserialize(data.secUnitType);
        if (data.secUnitNum) address.secUnitNum = AttributedTerm.deserialize(data.secUnitNum);
        if (data.isBlockIslandAddress) address.isBlockIslandAddress = AttributedTerm.deserialize(data.isBlockIslandAddress);
        if (data.cityNormalized) address.cityNormalized = AttributedTerm.deserialize(data.cityNormalized);
        if (data.processingSource) address.processingSource = AttributedTerm.deserialize(data.processingSource);
        if (data.processingTimestamp) address.processingTimestamp = AttributedTerm.deserialize(data.processingTimestamp);

        return address;
    }

    /**
     * String representation for debugging
     * @returns {string} Formatted address string
     */
    toString() {
        const summary = this.getAddressSummary();
        const street = summary.street || 'No street';
        const location = [summary.city, summary.state, summary.zip].filter(Boolean).join(', ') || 'No location';
        const fireNum = summary.hasFireNumber ? ` (Fire #${summary.fireNumber})` : '';
        return `Address: ${street}, ${location}${fireNum}`;
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
        HouseholdName,
        Address
    };
}

// Also export to global scope for browser use
if (typeof window !== 'undefined') {
    window.DATA_SOURCES = DATA_SOURCES;
    window.AttributedTerm = AttributedTerm;
    window.FireNumberTerm = FireNumberTerm;
    window.AccountNumberTerm = AccountNumberTerm;
    window.EmailTerm = EmailTerm;
    window.Aliases = Aliases;
    window.Aliased = Aliased;
    window.SimpleIdentifiers = SimpleIdentifiers;
    window.IndicativeData = IndicativeData;
    window.IdentifyingData = IdentifyingData;
    window.FireNumber = FireNumber;
    window.PoBox = PoBox;
    window.PID = PID;
    window.ComplexIdentifiers = ComplexIdentifiers;
    window.IndividualName = IndividualName;
    window.HouseholdName = HouseholdName;
    window.Address = Address;
}