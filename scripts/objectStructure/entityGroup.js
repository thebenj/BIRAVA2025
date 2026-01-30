/**
 * EntityGroup Class for BIRAVA2025
 *
 * Purpose: Consolidates entities from multiple data sources (VisionAppraisal, Bloomerang)
 * into unified groups representing the same real-world person/household.
 *
 * Key Design Principles:
 * - Key-based references only (not full entity objects) for serialization
 * - Uses existing isTrueMatch() and isNearMatch() criteria
 * - ConsensusEntity uses existing entity types (typically AggregateHousehold as superset)
 * - Construction order determines founding member and group index
 *
 * @see reference_projectRoadmap.md Section 4 for full specification
 */

/**
 * EntityGroup - Represents a group of matched entities
 *
 * A group contains:
 * - One founding member (first entity that started the group)
 * - Zero or more additional true-match members
 * - Zero or more near-miss references (for review, not used in consensus)
 * - A consensus entity synthesizing data from all true-match members (when >1 member)
 */
class EntityGroup {
    /**
     * Create a new EntityGroup
     * @param {number} index - Unique index based on construction order
     * @param {string} foundingMemberKey - Database key of the founding entity
     */
    constructor(index, foundingMemberKey) {
        // Unique index assigned during construction (simple sequential number)
        this.index = index;

        // Key of the entity that founded this group
        // When only one member, this is also the only member
        this.foundingMemberKey = foundingMemberKey;

        // Keys of all true-match members (includes founding member)
        this.memberKeys = [foundingMemberKey];

        // Keys of near-miss entities
        // NOT used in consensus calculation, recorded for reference/review only
        this.nearMissKeys = [];

        // Flag indicating if any member originates from Bloomerang
        // Critical for determining prospect (false) vs existing donor (true)
        this.hasBloomerangMember = false;

        // Consensus entity synthesizing data from all members
        // null when group has only one member
        // Uses appropriate entity type based on group composition (typically AggregateHousehold)
        this.consensusEntity = null;

        // Construction metadata
        this.constructionPhase = null;  // Which phase created this group (1-5)
        this.constructionTimestamp = null;  // When this group was created
    }

    /**
     * Add a true-match member to this group
     * @param {string} memberKey - Database key of the matching entity
     */
    addMember(memberKey) {
        if (!this.memberKeys.includes(memberKey)) {
            this.memberKeys.push(memberKey);
        }
    }

    /**
     * Add a near-miss reference to this group
     * @param {string} nearMissKey - Database key of the near-miss entity
     */
    addNearMiss(nearMissKey) {
        if (!this.nearMissKeys.includes(nearMissKey)) {
            this.nearMissKeys.push(nearMissKey);
        }
    }

    /**
     * Get count of true-match members
     * @returns {number} Number of members in this group
     */
    getMemberCount() {
        return this.memberKeys.length;
    }

    /**
     * Check if this group has multiple members (requires consensus)
     * @returns {boolean} True if group has more than one member
     */
    hasMultipleMembers() {
        return this.memberKeys.length > 1;
    }

    /**
     * Check if this group represents a prospect (no Bloomerang members)
     * @returns {boolean} True if this is a prospect group
     */
    isProspect() {
        return !this.hasBloomerangMember;
    }

    /**
     * Set the Bloomerang flag based on a member's source
     * Should be called when adding members
     * @param {boolean} isBloomerang - Whether the member is from Bloomerang
     */
    updateBloomerangFlag(isBloomerang) {
        if (isBloomerang) {
            this.hasBloomerangMember = true;
        }
    }

    /**
     * Build consensus entity from all members
     * Called after all members have been added to the group
     * @param {Object} entityDatabase - The keyed entity database (unifiedEntityDatabase.entities)
     */
    buildConsensusEntity(entityDatabase) {
        // Only build consensus when there are multiple members
        if (!this.hasMultipleMembers()) {
            this.consensusEntity = null;
            return;
        }

        // Retrieve all member entities from database
        const members = this.memberKeys
            .map(key => entityDatabase[key])
            .filter(entity => entity != null);

        if (members.length < 2) {
            console.warn(`EntityGroup ${this.index}: Expected multiple members but found ${members.length}`);
            this.consensusEntity = null;
            return;
        }

        // Determine appropriate entity type for consensus
        // Use AggregateHousehold as it's the superset of all entity properties
        this.consensusEntity = this._synthesizeConsensus(members);
    }

    /**
     * Synthesize consensus entity from member entities
     * @param {Array<Entity>} members - Array of member entity objects
     * @returns {Entity} Synthesized consensus entity
     * @private
     */
    _synthesizeConsensus(members) {
        // Per spec:
        // - Consensus holds value for any property where at least one member has a value
        // - Primary alias: highest total similarity score when compared across members
        // - Uses AggregateHousehold as container type (superset of all properties)
        // - Aliased properties use createConsensus() to populate homonyms/synonyms/candidates
        // - Nested properties (within contactInfo, otherInfo, legacyInfo) get property-level consensus

        const consensus = new AggregateHousehold(null, null);
        consensus.constructedFrom = this.memberKeys.slice(); // Track source members

        // Build thresholds from MATCH_CRITERIA (referencing global, not hardcoded)
        const thresholds = this._buildAliasThresholds();

        // Collect all non-null values for each property
        const locationIdentifiers = members.map(m => m.locationIdentifier).filter(v => v != null);
        const names = members.map(m => m.name).filter(v => v != null);
        const contactInfos = members.map(m => m.contactInfo).filter(v => v != null);
        const otherInfos = members.map(m => m.otherInfo).filter(v => v != null);
        const legacyInfos = members.map(m => m.legacyInfo).filter(v => v != null);

        // Collect individuals from AggregateHousehold members
        const allIndividuals = [];
        for (const member of members) {
            if (member.individuals && Array.isArray(member.individuals)) {
                allIndividuals.push(...member.individuals);
            }
        }

        // Use Aliased.createConsensus for top-level Aliased properties
        // This selects best primary and categorizes others into homonyms/synonyms/candidates
        consensus.locationIdentifier = this._createAliasedConsensus(locationIdentifiers, thresholds.contactInfo);
        consensus.name = this._createAliasedConsensus(names, thresholds.name);

        // Use deep property-level consensus for nested objects
        // Each method collects and merges the properties WITHIN the object, not just the whole object
        consensus.contactInfo = this._buildContactInfoConsensus(contactInfos, thresholds.contactInfo);
        consensus.otherInfo = this._buildOtherInfoConsensus(otherInfos);
        consensus.legacyInfo = this._buildLegacyInfoConsensus(legacyInfos, thresholds.name);

        // For individuals: deduplicate by comparing names
        consensus.individuals = this._deduplicateIndividuals(allIndividuals);

        // Set accountNumber from first member that has one (Bloomerang entities have this)
        for (const member of members) {
            if (member.accountNumber) {
                consensus.accountNumber = member.accountNumber;
                break;
            }
        }

        return consensus;
    }

    /**
     * Build alias categorization thresholds from MATCH_CRITERIA
     * @returns {Object} Thresholds for name and contactInfo properties
     * @private
     */
    _buildAliasThresholds() {
        // Reference MATCH_CRITERIA from window (set by unifiedEntityBrowser.js)
        const mc = (typeof window !== 'undefined' && window.MATCH_CRITERIA) ? window.MATCH_CRITERIA : null;

        if (mc) {
            return {
                name: {
                    homonym: mc.trueMatch.nameAlone,        // 0.875
                    synonym: mc.nearMatch.nameAlone,        // 0.845
                    candidate: 0.5                          // Floor
                },
                contactInfo: {
                    homonym: mc.trueMatch.contactInfoAlone, // 0.87
                    synonym: mc.nearMatch.contactInfoAlone, // 0.85
                    candidate: 0.5                          // Floor
                }
            };
        }

        // Fallback defaults if MATCH_CRITERIA not available
        return {
            name: { homonym: 0.875, synonym: 0.845, candidate: 0.5 },
            contactInfo: { homonym: 0.87, synonym: 0.85, candidate: 0.5 }
        };
    }

    /**
     * Create consensus for Aliased properties using Aliased.createConsensus if available
     * Falls back to _selectBestPrimary if createConsensus not available
     * @param {Array<Aliased>} aliasedObjects - Array of Aliased objects
     * @param {Object} thresholds - {homonym, synonym, candidate} thresholds
     * @returns {Aliased|null} Consensus Aliased with populated alternatives
     * @private
     */
    _createAliasedConsensus(aliasedObjects, thresholds) {
        if (!aliasedObjects || aliasedObjects.length === 0) return null;
        if (aliasedObjects.length === 1) return aliasedObjects[0];

        // Use Aliased.createConsensus if available (defined in aliasClasses.js)
        if (typeof Aliased !== 'undefined' && typeof Aliased.createConsensus === 'function') {
            return Aliased.createConsensus(aliasedObjects, thresholds);
        }

        // Fallback to simple best-primary selection
        return this._selectBestPrimary(aliasedObjects);
    }

    /**
     * Select the best primary value from a list using similarity scoring
     * The "best" is the one with highest average similarity to all others
     * @param {Array} values - Array of values with compareTo method
     * @returns {*} The best value, or null if array is empty
     * @private
     */
    _selectBestPrimary(values) {
        if (!values || values.length === 0) return null;
        if (values.length === 1) return values[0];

        // Calculate average similarity for each value
        let bestValue = values[0];
        let bestAvgScore = 0;

        for (let i = 0; i < values.length; i++) {
            let totalScore = 0;
            let comparisons = 0;

            for (let j = 0; j < values.length; j++) {
                if (i === j) continue;

                try {
                    // Use compareTo if available
                    if (typeof values[i].compareTo === 'function') {
                        const score = values[i].compareTo(values[j]);
                        if (typeof score === 'number') {
                            totalScore += score;
                            comparisons++;
                        }
                    }
                } catch (e) {
                    // Skip comparison errors
                }
            }

            const avgScore = comparisons > 0 ? totalScore / comparisons : 0;
            if (avgScore > bestAvgScore) {
                bestAvgScore = avgScore;
                bestValue = values[i];
            }
        }

        return bestValue;
    }

    /**
     * Build consensus ContactInfo with property-level merging
     * Merges email, phone, poBox, primaryAddress, and secondaryAddresses from all members
     * @param {Array<ContactInfo>} contactInfos - Array of ContactInfo objects
     * @param {Object} thresholds - Alias categorization thresholds
     * @returns {ContactInfo|null} Merged ContactInfo with consensus properties
     * @private
     */
    _buildContactInfoConsensus(contactInfos, thresholds) {
        if (!contactInfos || contactInfos.length === 0) return null;
        if (contactInfos.length === 1) return contactInfos[0];

        // Create new ContactInfo to hold consensus values
        const consensus = new ContactInfo();

        // 1. Collect and merge emails using Aliased.createConsensus()
        const emails = contactInfos.map(ci => ci.email).filter(v => v != null);
        if (emails.length > 0) {
            consensus.email = this._createAliasedConsensus(emails, thresholds);
        }

        // 2. Collect and merge phones using Aliased.createConsensus()
        const phones = contactInfos.map(ci => ci.phone).filter(v => v != null);
        if (phones.length > 0) {
            consensus.phone = this._createAliasedConsensus(phones, thresholds);
        }

        // 3. Collect and merge poBoxes using Aliased.createConsensus()
        const poBoxes = contactInfos.map(ci => ci.poBox).filter(v => v != null);
        if (poBoxes.length > 0) {
            consensus.poBox = this._createAliasedConsensus(poBoxes, thresholds);
        }

        // 4. Collect and merge primaryAddresses using Aliased.createConsensus()
        const primaryAddresses = contactInfos.map(ci => ci.primaryAddress).filter(v => v != null);
        if (primaryAddresses.length > 0) {
            consensus.primaryAddress = this._createAliasedConsensus(primaryAddresses, thresholds);
        }

        // 5. Collect ALL secondary addresses from all members, then deduplicate
        const allSecondaries = [];
        for (const ci of contactInfos) {
            if (ci.secondaryAddress && Array.isArray(ci.secondaryAddress)) {
                allSecondaries.push(...ci.secondaryAddress);
            }
        }
        if (allSecondaries.length > 0) {
            consensus.secondaryAddress = this._deduplicateAddresses(allSecondaries);
        }

        return consensus;
    }

    /**
     * Deduplicate addresses by comparing them, then sort by popularity.
     *
     * Popularity is determined by summing similarity scores when comparing
     * each deduplicated address against ALL original addresses (with duplicates).
     * Addresses appearing in more members' records will score higher.
     *
     * @param {Array<Address>} addresses - Array of Address objects (may contain duplicates)
     * @returns {Array<Address>} Deduplicated array sorted by popularity (highest first)
     * @private
     */
    _deduplicateAddresses(addresses) {
        if (!addresses || addresses.length === 0) return [];
        if (addresses.length === 1) return addresses;

        const unique = [];
        const ADDRESS_SIMILARITY_THRESHOLD = 0.85; // Consider addresses similar if >85%

        // Step 1: Build deduplicated list (same logic as before)
        for (const address of addresses) {
            if (!address) continue;

            let isDuplicate = false;

            for (const existing of unique) {
                try {
                    if (typeof address.compareTo === 'function') {
                        const similarity = address.compareTo(existing);
                        if (similarity >= ADDRESS_SIMILARITY_THRESHOLD) {
                            isDuplicate = true;
                            break;
                        }
                    }
                } catch (e) {
                    // Skip comparison errors
                }
            }

            if (!isDuplicate) {
                unique.push(address);
            }
        }

        // Step 2: If only one unique address, no need to sort
        if (unique.length <= 1) {
            return unique;
        }

        // Step 3: Score each unique address by popularity
        // Sum similarity scores against ALL original addresses (including duplicates)
        const scored = unique.map(uniqueAddr => {
            let totalScore = 0;

            for (const origAddr of addresses) {
                if (!origAddr) continue;

                try {
                    if (typeof uniqueAddr.compareTo === 'function') {
                        const similarity = uniqueAddr.compareTo(origAddr);
                        if (typeof similarity === 'number') {
                            totalScore += similarity;
                        }
                    }
                } catch (e) {
                    // Skip comparison errors
                }
            }

            return { address: uniqueAddr, score: totalScore };
        });

        // Step 4: Sort by score descending (most popular first)
        scored.sort((a, b) => b.score - a.score);

        // Step 5: Return just the addresses in sorted order
        return scored.map(item => item.address);
    }

    /**
     * Build consensus OtherInfo with property-level merging
     * Merges householdInformation and subdivision entries from all members
     * @param {Array<OtherInfo>} otherInfos - Array of OtherInfo objects
     * @returns {OtherInfo|null} Merged OtherInfo with consensus properties
     * @private
     */
    _buildOtherInfoConsensus(otherInfos) {
        if (!otherInfos || otherInfos.length === 0) return null;
        if (otherInfos.length === 1) return otherInfos[0];

        // Create new OtherInfo to hold consensus values
        const consensus = new OtherInfo();

        // 1. Merge subdivision entries from all members
        // Collect all PIDs and their entities - later PIDs with same key don't overwrite
        for (const oi of otherInfos) {
            if (oi.subdivision) {
                for (const [pid, entity] of Object.entries(oi.subdivision)) {
                    if (!consensus.subdivision) {
                        consensus.subdivision = {};
                    }
                    // Only add if not already present (first occurrence wins)
                    if (!consensus.subdivision[pid]) {
                        consensus.subdivision[pid] = entity;
                    }
                }
            }
        }

        // 2. Merge householdInformation
        // Strategy: Use the first one that indicates membership in a household
        // or the first non-default one
        for (const oi of otherInfos) {
            if (oi.householdInformation) {
                // Check if this is a meaningful householdInformation (not just default)
                if (oi.householdInformation.isInHousehold === true) {
                    consensus.householdInformation = oi.householdInformation;
                    break;
                }
            }
        }
        // If no meaningful householdInformation found, use first available
        if (!consensus.householdInformation || consensus.householdInformation.isInHousehold === false) {
            for (const oi of otherInfos) {
                if (oi.householdInformation) {
                    consensus.householdInformation = oi.householdInformation;
                    break;
                }
            }
        }

        // 3. Merge assessmentValue - use first non-null value found
        for (const oi of otherInfos) {
            if (oi.assessmentValue) {
                consensus.assessmentValue = oi.assessmentValue;
                break;
            }
        }

        // 4. Merge appraisalValue - use first non-null value found
        for (const oi of otherInfos) {
            if (oi.appraisalValue) {
                consensus.appraisalValue = oi.appraisalValue;
                break;
            }
        }

        return consensus;
    }

    /**
     * Build consensus LegacyInfo with field-level merging
     * Each field gets Aliased.createConsensus() treatment where applicable
     * @param {Array<LegacyInfo>} legacyInfos - Array of LegacyInfo objects
     * @param {Object} thresholds - Alias categorization thresholds
     * @returns {LegacyInfo|null} Merged LegacyInfo with consensus properties
     * @private
     */
    _buildLegacyInfoConsensus(legacyInfos, thresholds) {
        if (!legacyInfos || legacyInfos.length === 0) return null;
        if (legacyInfos.length === 1) return legacyInfos[0];

        // Create new LegacyInfo to hold consensus values
        const consensus = new LegacyInfo();

        // 1. ownerName - use Aliased.createConsensus() on the identifiers
        const ownerNames = legacyInfos
            .map(li => li.ownerName)
            .filter(v => v != null)
            .map(ind => ind.identifier || ind); // Extract identifier if wrapped in IndicativeData
        if (ownerNames.length > 0) {
            const consensusOwnerName = this._createAliasedConsensus(ownerNames, thresholds);
            if (consensusOwnerName) {
                consensus.ownerName = new IndicativeData(consensusOwnerName);
            }
        }

        // 2. ownerName2 - use Aliased.createConsensus()
        const ownerNames2 = legacyInfos
            .map(li => li.ownerName2)
            .filter(v => v != null)
            .map(ind => ind.identifier || ind);
        if (ownerNames2.length > 0) {
            const consensusOwnerName2 = this._createAliasedConsensus(ownerNames2, thresholds);
            if (consensusOwnerName2) {
                consensus.ownerName2 = new IndicativeData(consensusOwnerName2);
            }
        }

        // 3. neighborhood - use Aliased.createConsensus()
        const neighborhoods = legacyInfos
            .map(li => li.neighborhood)
            .filter(v => v != null)
            .map(ind => ind.identifier || ind);
        if (neighborhoods.length > 0) {
            const consensusNeighborhood = this._createAliasedConsensus(neighborhoods, thresholds);
            if (consensusNeighborhood) {
                consensus.neighborhood = new IndicativeData(consensusNeighborhood);
            }
        }

        // 4. userCode - use Aliased.createConsensus()
        const userCodes = legacyInfos
            .map(li => li.userCode)
            .filter(v => v != null)
            .map(ind => ind.identifier || ind);
        if (userCodes.length > 0) {
            const consensusUserCode = this._createAliasedConsensus(userCodes, thresholds);
            if (consensusUserCode) {
                consensus.userCode = new IndicativeData(consensusUserCode);
            }
        }

        // 5. date - pick the most recent date
        const dates = legacyInfos
            .map(li => li.date)
            .filter(v => v != null);
        if (dates.length > 0) {
            // Try to find most recent date by parsing
            let mostRecent = dates[0];
            for (const dateInd of dates) {
                try {
                    const dateVal = dateInd.identifier?.primaryAlias?.term || dateInd.term;
                    const mostRecentVal = mostRecent.identifier?.primaryAlias?.term || mostRecent.term;
                    if (dateVal && mostRecentVal) {
                        const d1 = new Date(dateVal);
                        const d2 = new Date(mostRecentVal);
                        if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d1 > d2) {
                            mostRecent = dateInd;
                        }
                    }
                } catch (e) {
                    // Skip date parsing errors
                }
            }
            consensus.date = mostRecent;
        }

        // 6. sourceIndex - collect all unique source indices
        // For now, keep the first one (could be enhanced to track all sources)
        const sourceIndices = legacyInfos
            .map(li => li.sourceIndex)
            .filter(v => v != null);
        if (sourceIndices.length > 0) {
            consensus.sourceIndex = sourceIndices[0];
        }

        return consensus;
    }

    // Legacy method aliases for backwards compatibility
    _selectBestContactInfo(contactInfos) {
        return this._buildContactInfoConsensus(contactInfos, this._buildAliasThresholds().contactInfo);
    }

    _mergeOtherInfo(otherInfos) {
        return this._buildOtherInfoConsensus(otherInfos);
    }

    _mergeLegacyInfo(legacyInfos) {
        return this._buildLegacyInfoConsensus(legacyInfos, this._buildAliasThresholds().name);
    }

    /**
     * Deduplicate individuals by comparing names
     * @param {Array<Individual>} individuals - Array of Individual entities
     * @returns {Array<Individual>} Deduplicated array
     * @private
     */
    _deduplicateIndividuals(individuals) {
        if (!individuals || individuals.length === 0) return [];
        if (individuals.length === 1) return individuals;

        const unique = [];
        const NAME_SIMILARITY_THRESHOLD = 0.85; // Consider names similar if >85%

        for (const individual of individuals) {
            let isDuplicate = false;

            for (const existing of unique) {
                try {
                    // Compare names if both have compareTo
                    if (individual.name && existing.name &&
                        typeof individual.name.compareTo === 'function') {
                        const similarity = individual.name.compareTo(existing.name);
                        if (similarity >= NAME_SIMILARITY_THRESHOLD) {
                            isDuplicate = true;
                            break;
                        }
                    }
                } catch (e) {
                    // Skip comparison errors
                }
            }

            if (!isDuplicate) {
                unique.push(individual);
            }
        }

        return unique;
    }

    /**
     * Serialize EntityGroup for storage
     * @returns {Object} JSON-serializable object
     */
    serialize() {
        // Note: serializeWithTypes returns a STRING, but we need an OBJECT for proper nesting
        // Parse it back to an object to avoid double-serialization when the parent is JSON.stringify'd
        let consensusEntityObj = null;
        if (this.consensusEntity) {
            const serializedString = serializeWithTypes(this.consensusEntity);
            consensusEntityObj = JSON.parse(serializedString);
        }

        return {
            type: 'EntityGroup',
            index: this.index,
            foundingMemberKey: this.foundingMemberKey,
            memberKeys: this.memberKeys.slice(),
            nearMissKeys: this.nearMissKeys.slice(),
            hasBloomerangMember: this.hasBloomerangMember,
            consensusEntity: consensusEntityObj,
            constructionPhase: this.constructionPhase,
            constructionTimestamp: this.constructionTimestamp
        };
    }

    /**
     * Deserialize EntityGroup from stored data
     * @param {Object} data - Serialized EntityGroup data
     * @returns {EntityGroup} Reconstructed EntityGroup instance
     */
    static deserialize(data) {
        if (data.type !== 'EntityGroup') {
            throw new Error('Invalid EntityGroup serialization format');
        }

        const group = new EntityGroup(data.index, data.foundingMemberKey);

        // Restore member keys (founding member already added in constructor)
        group.memberKeys = data.memberKeys.slice();
        group.nearMissKeys = data.nearMissKeys.slice();
        group.hasBloomerangMember = data.hasBloomerangMember;
        group.constructionPhase = data.constructionPhase;
        group.constructionTimestamp = data.constructionTimestamp;

        // Deserialize consensus entity if present
        if (data.consensusEntity) {
            group.consensusEntity = deserializeWithTypes(JSON.stringify(data.consensusEntity));
        }

        return group;
    }

    /**
     * Factory method for deserialization
     * @param {Object} data - Serialized data object
     * @returns {EntityGroup} Reconstructed instance
     */
    static fromSerializedData(data) {
        return EntityGroup.deserialize(data);
    }
}


/**
 * EntityGroupDatabase - Container for all EntityGroups
 *
 * Manages the collection of EntityGroups and provides:
 * - Construction orchestration (5-phase process)
 * - Tracking of which entities have been assigned to groups
 * - Persistence (save/load to Google Drive)
 * - Query and access methods
 */
class EntityGroupDatabase {
    constructor() {
        // All EntityGroups indexed by their numeric index
        this.groups = {};

        // Next available index for new groups
        this.nextIndex = 0;

        // Set of entity keys that have been assigned to a group
        // Once assigned, an entity cannot be in another group
        this.assignedEntityKeys = new Set();

        // Construction configuration
        // Order matters and is recorded for reproducibility and future data sources
        this.constructionConfig = {
            phaseOrder: [
                { phase: 1, source: 'bloomerang', entityType: 'AggregateHousehold', description: 'Bloomerang Households' },
                { phase: 2, source: 'visionAppraisal', entityType: 'AggregateHousehold', description: 'VisionAppraisal Households' },
                { phase: 3, source: 'bloomerang', entityType: 'Individual', description: 'Remaining Bloomerang Individuals' },
                { phase: 4, source: 'visionAppraisal', entityType: 'Individual', description: 'Remaining VisionAppraisal Individuals' },
                { phase: 5, source: 'all', entityType: 'other', description: 'Remaining Entity Types (Bloomerang first, then VisionAppraisal)' }
            ],
            version: '1.0'
        };

        // Construction metadata
        this.constructionTimestamp = null;
        this.constructionComplete = false;
        this.consensusBuiltTimestamp = null;  // Set when consensus entities are built

        // Statistics
        this.stats = {
            totalGroups: 0,
            singleMemberGroups: 0,
            multiMemberGroups: 0,
            prospectGroups: 0,
            existingDonorGroups: 0,
            totalEntitiesAssigned: 0,
            nearMissCount: 0,
            byPhase: {
                1: { groups: 0, entities: 0 },
                2: { groups: 0, entities: 0 },
                3: { groups: 0, entities: 0 },
                4: { groups: 0, entities: 0 },
                5: { groups: 0, entities: 0 }
            }
        };
    }

    /**
     * Create a new EntityGroup with the next available index
     * @param {string} foundingMemberKey - Database key of the founding entity
     * @param {number} phase - Construction phase (1-5)
     * @returns {EntityGroup} The newly created group
     */
    createGroup(foundingMemberKey, phase) {
        // Check if entity is already assigned
        if (this.assignedEntityKeys.has(foundingMemberKey)) {
            console.warn(`Entity ${foundingMemberKey} is already assigned to a group`);
            return null;
        }

        const group = new EntityGroup(this.nextIndex, foundingMemberKey);
        group.constructionPhase = phase;
        group.constructionTimestamp = new Date().toISOString();

        // Add to database
        this.groups[this.nextIndex] = group;
        this.nextIndex++;

        // Mark founding member as assigned
        this.assignedEntityKeys.add(foundingMemberKey);

        return group;
    }

    /**
     * Add a member to an existing group
     * @param {number} groupIndex - Index of the group
     * @param {string} memberKey - Database key of the entity to add
     * @returns {boolean} True if member was added successfully
     */
    addMemberToGroup(groupIndex, memberKey) {
        // Check if entity is already assigned
        if (this.assignedEntityKeys.has(memberKey)) {
            console.warn(`Entity ${memberKey} is already assigned to a group`);
            return false;
        }

        const group = this.groups[groupIndex];
        if (!group) {
            console.warn(`Group ${groupIndex} not found`);
            return false;
        }

        group.addMember(memberKey);
        this.assignedEntityKeys.add(memberKey);
        return true;
    }

    /**
     * Add a near-miss reference to an existing group
     * Near misses are NOT marked as assigned (can still form their own groups)
     * @param {number} groupIndex - Index of the group
     * @param {string} nearMissKey - Database key of the near-miss entity
     * @returns {boolean} True if near-miss was added successfully
     */
    addNearMissToGroup(groupIndex, nearMissKey) {
        const group = this.groups[groupIndex];
        if (!group) {
            console.warn(`Group ${groupIndex} not found`);
            return false;
        }

        group.addNearMiss(nearMissKey);
        return true;
    }

    /**
     * Check if an entity has been assigned to any group
     * @param {string} entityKey - Database key to check
     * @returns {boolean} True if entity is already in a group
     */
    isEntityAssigned(entityKey) {
        return this.assignedEntityKeys.has(entityKey);
    }

    /**
     * Get a group by its index
     * @param {number} index - Group index
     * @returns {EntityGroup|null} The group, or null if not found
     */
    getGroup(index) {
        return this.groups[index] || null;
    }

    /**
     * Get all groups as an array
     * @returns {Array<EntityGroup>} Array of all groups
     */
    getAllGroups() {
        return Object.values(this.groups);
    }

    /**
     * Get groups filtered by criteria
     * @param {Object} criteria - Filter criteria
     * @param {boolean} [criteria.prospectsOnly] - Only return prospect groups
     * @param {boolean} [criteria.multiMemberOnly] - Only return groups with >1 member
     * @param {number} [criteria.phase] - Only return groups from specific phase
     * @returns {Array<EntityGroup>} Filtered array of groups
     */
    getFilteredGroups(criteria = {}) {
        let groups = this.getAllGroups();

        if (criteria.prospectsOnly) {
            groups = groups.filter(g => g.isProspect());
        }

        if (criteria.multiMemberOnly) {
            groups = groups.filter(g => g.hasMultipleMembers());
        }

        if (criteria.phase !== undefined) {
            groups = groups.filter(g => g.constructionPhase === criteria.phase);
        }

        return groups;
    }

    /**
     * Find which group contains a specific entity
     * @param {string} entityKey - Database key to search for
     * @returns {EntityGroup|null} The group containing the entity, or null
     */
    findGroupByEntityKey(entityKey) {
        for (const group of this.getAllGroups()) {
            if (group.memberKeys.includes(entityKey)) {
                return group;
            }
        }
        return null;
    }

    /**
     * Update statistics after construction
     */
    updateStats() {
        const groups = this.getAllGroups();

        this.stats.totalGroups = groups.length;
        this.stats.singleMemberGroups = groups.filter(g => !g.hasMultipleMembers()).length;
        this.stats.multiMemberGroups = groups.filter(g => g.hasMultipleMembers()).length;
        this.stats.prospectGroups = groups.filter(g => g.isProspect()).length;
        this.stats.existingDonorGroups = groups.filter(g => !g.isProspect()).length;
        this.stats.totalEntitiesAssigned = this.assignedEntityKeys.size;
        this.stats.nearMissCount = groups.reduce((sum, g) => sum + g.nearMissKeys.length, 0);

        // Reset phase stats
        for (let phase = 1; phase <= 5; phase++) {
            this.stats.byPhase[phase] = { groups: 0, entities: 0 };
        }

        // Calculate per-phase stats
        for (const group of groups) {
            const phase = group.constructionPhase;
            if (phase >= 1 && phase <= 5) {
                this.stats.byPhase[phase].groups++;
                this.stats.byPhase[phase].entities += group.getMemberCount();
            }
        }
    }

    /**
     * Build all consensus entities for groups with multiple members
     * @param {Object} entityDatabase - The keyed entity database (unifiedEntityDatabase.entities)
     */
    buildAllConsensusEntities(entityDatabase) {
        for (const group of this.getAllGroups()) {
            if (group.hasMultipleMembers()) {
                group.buildConsensusEntity(entityDatabase);
            }
        }
    }

    /**
     * Serialize EntityGroupDatabase for storage
     * @returns {Object} JSON-serializable object
     */
    serialize() {
        const serializedGroups = {};
        for (const [index, group] of Object.entries(this.groups)) {
            serializedGroups[index] = group.serialize();
        }

        return {
            type: 'EntityGroupDatabase',
            version: '1.0',
            groups: serializedGroups,
            nextIndex: this.nextIndex,
            assignedEntityKeys: Array.from(this.assignedEntityKeys),
            constructionConfig: this.constructionConfig,
            constructionTimestamp: this.constructionTimestamp,
            constructionComplete: this.constructionComplete,
            consensusBuiltTimestamp: this.consensusBuiltTimestamp || null,
            stats: this.stats
        };
    }

    /**
     * Deserialize EntityGroupDatabase from stored data
     * @param {Object} data - Serialized EntityGroupDatabase data
     * @returns {EntityGroupDatabase} Reconstructed instance
     */
    static deserialize(data) {
        if (data.type !== 'EntityGroupDatabase') {
            throw new Error('Invalid EntityGroupDatabase serialization format');
        }

        const db = new EntityGroupDatabase();

        // Restore groups
        for (const [index, groupData] of Object.entries(data.groups)) {
            db.groups[index] = EntityGroup.deserialize(groupData);
        }

        db.nextIndex = data.nextIndex;
        db.assignedEntityKeys = new Set(data.assignedEntityKeys);
        db.constructionConfig = data.constructionConfig;
        db.constructionTimestamp = data.constructionTimestamp;
        db.constructionComplete = data.constructionComplete;
        db.consensusBuiltTimestamp = data.consensusBuiltTimestamp || null;
        db.stats = data.stats;

        return db;
    }

    /**
     * Factory method for deserialization
     * @param {Object} data - Serialized data object
     * @returns {EntityGroupDatabase} Reconstructed instance
     */
    static fromSerializedData(data) {
        return EntityGroupDatabase.deserialize(data);
    }

    /**
     * Get summary string for display
     * @returns {string} Human-readable summary
     */
    getSummary() {
        this.updateStats();
        return `EntityGroupDatabase: ${this.stats.totalGroups} groups ` +
               `(${this.stats.multiMemberGroups} multi-member, ${this.stats.singleMemberGroups} single-member), ` +
               `${this.stats.prospectGroups} prospects, ${this.stats.existingDonorGroups} existing donors, ` +
               `${this.stats.totalEntitiesAssigned} entities assigned, ${this.stats.nearMissCount} near-misses recorded`;
    }
}


// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EntityGroup, EntityGroupDatabase };
}

// Export to global scope for browser use
if (typeof window !== 'undefined') {
    window.EntityGroup = EntityGroup;
    window.EntityGroupDatabase = EntityGroupDatabase;
}
