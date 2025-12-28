/**
 * HouseholdInformation Class for BIRAVA2025 Entity System
 *
 * Stores household relationship data for Individual entities.
 * Used to track whether an individual belongs to a household and their role within it.
 *
 * This class supports:
 * - Bloomerang household relationships (via accountNumber in householdIdentifier)
 * - VisionAppraisal household relationships (via locationIdentifier in householdIdentifier)
 * - Serialization/deserialization for persistence
 * - compareTo for matching/comparison operations
 */

/**
 * HouseholdInformation class - holds household relationship data for individuals
 * Stored under otherInfo.householdInformation for Individual entities
 */
class HouseholdInformation {
    /**
     * Create a new HouseholdInformation instance
     * @param {boolean} isInHousehold - Whether the individual belongs to a household (default: false)
     * @param {string} householdName - Name of the household (default: '')
     * @param {boolean} isHeadOfHousehold - Whether individual is head of household (default: false)
     * @param {string} householdIdentifier - Identifier for the household entity:
     *                                       - For Bloomerang: accountNumber of household
     *                                       - For VisionAppraisal: locationIdentifier of household
     *                                       (default: '')
     */
    constructor(isInHousehold = false, householdName = '', isHeadOfHousehold = false, householdIdentifier = '') {
        this.isInHousehold = isInHousehold;
        this.householdName = householdName;
        this.isHeadOfHousehold = isHeadOfHousehold;
        this.householdIdentifier = householdIdentifier;

        // Cross-reference properties (populated during unified entity database and entity group construction)
        // parentKey: The database key of the household entity this individual belongs to
        // Populated during unified entity database construction when keys are generated
        this.parentKey = null;

        // siblingKeys: Array of database keys for other individuals in the same household
        // Populated during unified entity database construction when keys are generated
        this.siblingKeys = [];

        // entityGroupIndex: The index of the EntityGroup this individual's household belongs to
        // Populated during EntityGroupDatabase construction when group indices are assigned
        this.entityGroupIndex = null;

        // Weighted comparison architecture properties
        this.comparisonWeights = null;
        this.comparisonCalculatorName = 'householdInformationWeightedComparison';
        this.comparisonCalculator = null; // Will be resolved after registry is available

        // Initialize weighted comparison
        this.initializeWeightedComparison();
    }

    /**
     * Initialize weighted comparison properties for HouseholdInformation
     * Uses householdInformationWeightedComparison calculator
     *
     * Weight logic is CONDITIONAL (handled by calculator):
     * - isInHousehold=false: isInHousehold gets 100%
     * - isInHousehold=true + householdIdentifier present: householdIdentifier 70%, isHeadOfHousehold 30%
     * - isInHousehold=true + no householdIdentifier: householdName 70%, isHeadOfHousehold 30%
     */
    initializeWeightedComparison() {
        // Weights are conditional - see calculator for actual logic
        this.comparisonWeights = 'conditional';
        this.comparisonCalculatorName = 'householdInformationWeightedComparison';
        // Resolve calculator - may be null if registry not yet loaded
        if (typeof resolveComparisonCalculator === 'function') {
            this.comparisonCalculator = resolveComparisonCalculator(this.comparisonCalculatorName);
        }
    }

    /**
     * Compare this HouseholdInformation to another HouseholdInformation
     * @param {HouseholdInformation} other - HouseholdInformation to compare against
     * @param {boolean} detailed - If true, returns detailed breakdown object instead of number
     * @returns {number|Object} Similarity score 0-1, or detailed breakdown object if detailed=true
     * @throws {Error} If comparing with incompatible object type
     */
    compareTo(other, detailed = false) {
        // Type checking - must be HouseholdInformation
        if (!other || !(other instanceof HouseholdInformation)) {
            throw new Error(`Cannot compare HouseholdInformation with ${other ? other.constructor.name : 'null'}`);
        }

        // Use the comparison calculator if available
        if (this.comparisonCalculator && typeof this.comparisonCalculator === 'function') {
            return this.comparisonCalculator.call(this, other, detailed);
        }

        // Fallback to simple weighted comparison if calculator not available
        return this.fallbackComparison(other, detailed);
    }

    /**
     * Fallback comparison when calculator is not available
     * Uses conditional weight logic:
     * - isInHousehold=false: isInHousehold gets 100%
     * - isInHousehold=true + householdIdentifier present: householdIdentifier 70%, isHeadOfHousehold 30%
     * - isInHousehold=true + no householdIdentifier: householdName 70%, isHeadOfHousehold 30%
     *
     * @param {HouseholdInformation} other - HouseholdInformation to compare against
     * @param {boolean} detailed - If true, returns detailed breakdown
     * @returns {number|Object} Similarity score 0-1
     * @private
     */
    fallbackComparison(other, detailed = false) {
        let totalSimilarity = 0;
        const components = {};

        // Determine which weight mode to use based on THIS object's state
        const thisInHousehold = this.isInHousehold;
        const thisHasIdentifier = this.householdIdentifier && this.householdIdentifier.trim() !== '';

        if (!thisInHousehold) {
            // Mode 1: isInHousehold=false → isInHousehold gets 100%
            const inHouseholdSim = this.isInHousehold === other.isInHousehold ? 1 : 0;
            totalSimilarity = inHouseholdSim;
            components.isInHousehold = { similarity: inHouseholdSim, weight: 1.0, contribution: inHouseholdSim };
        } else if (thisHasIdentifier) {
            // Mode 2: isInHousehold=true + householdIdentifier present → identifier 70%, isHeadOfHousehold 30%
            let identifierSim = 0;
            if (this.householdIdentifier === other.householdIdentifier) {
                identifierSim = 1;
            } else if (other.householdIdentifier && typeof levenshteinSimilarity === 'function') {
                identifierSim = levenshteinSimilarity(this.householdIdentifier, other.householdIdentifier);
            }
            const identifierContribution = identifierSim * 0.7;
            totalSimilarity += identifierContribution;
            components.householdIdentifier = { similarity: identifierSim, weight: 0.7, contribution: identifierContribution };

            const headSim = this.isHeadOfHousehold === other.isHeadOfHousehold ? 1 : 0;
            const headContribution = headSim * 0.3;
            totalSimilarity += headContribution;
            components.isHeadOfHousehold = { similarity: headSim, weight: 0.3, contribution: headContribution };
        } else {
            // Mode 3: isInHousehold=true + no householdIdentifier → householdName 70%, isHeadOfHousehold 30%
            let nameSim = 0;
            if (this.householdName === other.householdName) {
                nameSim = 1;
            } else if (this.householdName && other.householdName && typeof levenshteinSimilarity === 'function') {
                nameSim = levenshteinSimilarity(this.householdName, other.householdName);
            }
            const nameContribution = nameSim * 0.7;
            totalSimilarity += nameContribution;
            components.householdName = { similarity: nameSim, weight: 0.7, contribution: nameContribution };

            const headSim = this.isHeadOfHousehold === other.isHeadOfHousehold ? 1 : 0;
            const headContribution = headSim * 0.3;
            totalSimilarity += headContribution;
            components.isHeadOfHousehold = { similarity: headSim, weight: 0.3, contribution: headContribution };
        }

        if (detailed) {
            return {
                overallSimilarity: totalSimilarity,
                components: components,
                checkSum: 0 // No checksum calculation in fallback
            };
        }

        return totalSimilarity;
    }

    /**
     * Set all properties at once from an object
     * @param {Object} data - Object containing household data properties
     */
    setFromObject(data) {
        if (data.isInHousehold !== undefined) {
            this.isInHousehold = Boolean(data.isInHousehold) || data.isInHousehold === 'true' || data.isInHousehold === 'Yes';
        }
        if (data.householdName !== undefined) {
            this.householdName = String(data.householdName || '').trim();
        }
        if (data.isHeadOfHousehold !== undefined) {
            this.isHeadOfHousehold = Boolean(data.isHeadOfHousehold) || data.isHeadOfHousehold === 'true' || data.isHeadOfHousehold === 'Yes';
        }
        if (data.householdIdentifier !== undefined) {
            this.householdIdentifier = String(data.householdIdentifier || '').trim();
        }
        // Cross-reference properties
        if (data.parentKey !== undefined) {
            this.parentKey = data.parentKey;
        }
        if (data.siblingKeys !== undefined) {
            this.siblingKeys = Array.isArray(data.siblingKeys) ? data.siblingKeys : [];
        }
        if (data.entityGroupIndex !== undefined) {
            this.entityGroupIndex = data.entityGroupIndex;
        }
    }

    /**
     * Check if this individual is associated with any household
     * @returns {boolean} True if individual has household association
     */
    hasHouseholdAssociation() {
        return this.isInHousehold || this.householdIdentifier !== '' || this.householdName !== '';
    }

    /**
     * Get a summary of household information
     * @returns {Object} Summary of household relationship
     */
    getSummary() {
        return {
            isInHousehold: this.isInHousehold,
            householdName: this.householdName,
            isHeadOfHousehold: this.isHeadOfHousehold,
            householdIdentifier: this.householdIdentifier,
            parentKey: this.parentKey,
            siblingKeys: this.siblingKeys,
            entityGroupIndex: this.entityGroupIndex,
            hasAssociation: this.hasHouseholdAssociation()
        };
    }

    /**
     * Deserialize a plain object back to HouseholdInformation instance
     * @param {Object} data - Serialized data
     * @returns {HouseholdInformation} Reconstructed HouseholdInformation instance
     */
    static deserialize(data) {
        // Handle null/undefined
        if (!data) {
            return HouseholdInformation.createDefault();
        }

        // Accept data with type='HouseholdInformation' OR plain objects with householdInformation fields
        // This supports both new serialized format and legacy data
        if (data.type && data.type !== 'HouseholdInformation') {
            throw new Error('Invalid HouseholdInformation serialization format');
        }

        const instance = new HouseholdInformation(
            data.isInHousehold || false,
            data.householdName || '',
            data.isHeadOfHousehold || false,
            data.householdIdentifier || ''
        );

        // Restore comparison properties if present
        if (data.comparisonWeights) {
            instance.comparisonWeights = data.comparisonWeights;
        }
        if (data.comparisonCalculatorName) {
            instance.comparisonCalculatorName = data.comparisonCalculatorName;
            if (typeof resolveComparisonCalculator === 'function') {
                instance.comparisonCalculator = resolveComparisonCalculator(data.comparisonCalculatorName);
            }
        }

        // Restore cross-reference properties if present
        if (data.parentKey !== undefined) {
            instance.parentKey = data.parentKey;
        }
        if (data.siblingKeys !== undefined) {
            instance.siblingKeys = Array.isArray(data.siblingKeys) ? data.siblingKeys : [];
        }
        if (data.entityGroupIndex !== undefined) {
            instance.entityGroupIndex = data.entityGroupIndex;
        }

        return instance;
    }

    /**
     * Factory method for deserialization - creates instance via deserialize
     * This is the preferred entry point for deserializeWithTypes to use
     * @param {Object} data - Serialized data object
     * @returns {HouseholdInformation} Reconstructed instance
     */
    static fromSerializedData(data) {
        return HouseholdInformation.deserialize(data);
    }

    /**
     * Create a default HouseholdInformation instance (not in household)
     * @returns {HouseholdInformation} Default instance with isInHousehold=false
     */
    static createDefault() {
        return new HouseholdInformation(false, '', false, '');
    }

    /**
     * Create a HouseholdInformation from Bloomerang householdData
     * @param {Object} bloomerangHouseholdData - Object with isInHousehold, householdName, isHeadOfHousehold
     * @param {string} householdAccountNumber - Account number of the Bloomerang household entity
     * @returns {HouseholdInformation} New instance populated from Bloomerang data
     */
    static fromBloomerangData(bloomerangHouseholdData, householdAccountNumber = '') {
        const instance = new HouseholdInformation();

        // Parse Bloomerang string values to proper types (CSV values are 'TRUE'/'FALSE')
        const inHouseholdVal = String(bloomerangHouseholdData.isInHousehold || '').toLowerCase();
        const isInHousehold = inHouseholdVal === 'true' || bloomerangHouseholdData.isInHousehold === true;

        const headVal = String(bloomerangHouseholdData.isHeadOfHousehold || '').toLowerCase();
        const isHeadOfHousehold = headVal === 'true' || bloomerangHouseholdData.isHeadOfHousehold === true;

        instance.isInHousehold = isInHousehold;
        instance.householdName = (bloomerangHouseholdData.householdName || '').trim();
        instance.isHeadOfHousehold = isHeadOfHousehold;
        instance.householdIdentifier = householdAccountNumber;

        return instance;
    }

    /**
     * Create a HouseholdInformation from VisionAppraisal household association
     * @param {string} householdLocationIdentifier - locationIdentifier of the VA AggregateHousehold entity
     * @param {string} householdName - Name of the household
     * @param {boolean} isHead - Whether this individual is head of household
     * @returns {HouseholdInformation} New instance populated from VA data
     */
    static fromVisionAppraisalData(householdLocationIdentifier, householdName = '', isHead = false) {
        return new HouseholdInformation(
            true,  // isInHousehold = true since we have a household association
            householdName,
            isHead,
            householdLocationIdentifier
        );
    }
}

// =============================================================================
// COMPARISON PARTICIPANT CLASSES
// Used to identify entities in comparison results for later retrieval
// =============================================================================

/**
 * ParentDescription - describes the parent entity when an item is held in an array
 * Used when an Individual is stored in an AggregateHousehold's individuals[] array
 */
class ParentDescription {
    /**
     * Create a new ParentDescription instance
     * @param {string} entityType - Type of parent entity (e.g., 'AggregateHousehold')
     * @param {string|number} entityKey - Key of parent (locationIdentifier or accountNumber)
     * @param {string} dataSource - 'visionAppraisal' or 'bloomerang'
     * @param {number} index - Index of the child item in the parent's array
     */
    constructor(entityType = null, entityKey = null, dataSource = null, index = null) {
        this.entityType = entityType;
        this.entityKey = entityKey;
        this.dataSource = dataSource;
        this.index = index;
    }

    /**
     * Factory method for deserialization - creates instance via constructor
     * Properties are iterated automatically by deserializeWithTypes
     * @param {Object} data - Serialized data object
     * @returns {ParentDescription} Reconstructed instance
     */
    static fromSerializedData(data) {
        if (!data) return null;
        return new ParentDescription(
            data.entityType,
            data.entityKey,
            data.dataSource,
            data.index
        );
    }
}

/**
 * ParticipantDescription - describes one side of a comparison
 * Contains identifying information to re-locate the entity later
 *
 * Entity Key Rules:
 * - Bloomerang Individual: accountNumber
 * - Bloomerang AggregateHousehold: accountNumber
 * - VisionAppraisal Individual (standalone): locationIdentifier
 * - VisionAppraisal Individual (in household): IndividualName object
 * - VisionAppraisal AggregateHousehold: locationIdentifier
 * - VisionAppraisal Business: locationIdentifier
 * - VisionAppraisal LegalConstruct: locationIdentifier
 */
class ParticipantDescription {
    /**
     * Create a new ParticipantDescription instance
     * @param {string} entityType - 'Individual', 'AggregateHousehold', 'Business', 'LegalConstruct'
     * @param {string|number|IndividualName} entityKey - Key per rules above
     * @param {string} dataSource - 'visionAppraisal' or 'bloomerang'
     * @param {ParentDescription|null} parentDescription - null if not in array, ParentDescription if in array
     */
    constructor(entityType = null, entityKey = null, dataSource = null, parentDescription = null) {
        this.entityType = entityType;
        this.entityKey = entityKey;
        this.dataSource = dataSource;
        this.parentDescription = parentDescription;
    }

    /**
     * Check if this participant is held in a parent's array
     * @returns {boolean} True if parentDescription is set
     */
    isInArray() {
        return this.parentDescription !== null;
    }

    /**
     * Set parent information for this participant (when extracting from an array)
     * Used by calling code when an individual is extracted from a household's array
     * @param {string} parentType - Type of parent entity (e.g., 'AggregateHousehold')
     * @param {string|number} parentKey - Key of parent (locationIdentifier or accountNumber)
     * @param {string} dataSource - 'visionAppraisal' or 'bloomerang'
     * @param {number} index - Index of this item in the parent's array
     * @returns {ParticipantDescription} This instance for chaining
     */
    setParent(parentType, parentKey, dataSource, index) {
        this.parentDescription = new ParentDescription(parentType, parentKey, dataSource, index);
        return this;
    }

    /**
     * Factory method for deserialization - creates instance via constructor
     * Properties are iterated automatically by deserializeWithTypes
     * Note: entityKey and parentDescription will be deserialized by deserializeWithTypes
     * before this method is called (they have their own fromSerializedData methods)
     * @param {Object} data - Serialized data object
     * @returns {ParticipantDescription} Reconstructed instance
     */
    static fromSerializedData(data) {
        if (!data) return null;
        return new ParticipantDescription(
            data.entityType,
            data.entityKey,         // Already deserialized by deserializeWithTypes if it's a class
            data.dataSource,
            data.parentDescription  // Already deserialized by deserializeWithTypes
        );
    }
}

/**
 * ComparisonParticipants - contains identifying information for both sides of a comparison
 * Returned as part of compareTo results to enable re-locating matched entities
 */
class ComparisonParticipants {
    /**
     * Create a new ComparisonParticipants instance
     * @param {ParticipantDescription} self - Description of the entity whose compareTo was called
     * @param {ParticipantDescription} other - Description of the entity that was compared to
     */
    constructor(self = null, other = null) {
        this.self = self || new ParticipantDescription();
        this.other = other || new ParticipantDescription();
    }

    /**
     * Factory method for deserialization - creates instance via constructor
     * Properties are iterated automatically by deserializeWithTypes
     * Note: self and other will be deserialized by deserializeWithTypes
     * before this method is called (they have their own fromSerializedData methods)
     * @param {Object} data - Serialized data object
     * @returns {ComparisonParticipants} Reconstructed instance
     */
    static fromSerializedData(data) {
        if (!data) return null;
        return new ComparisonParticipants(
            data.self,   // Already deserialized by deserializeWithTypes
            data.other   // Already deserialized by deserializeWithTypes
        );
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        HouseholdInformation,
        ParentDescription,
        ParticipantDescription,
        ComparisonParticipants
    };
}
