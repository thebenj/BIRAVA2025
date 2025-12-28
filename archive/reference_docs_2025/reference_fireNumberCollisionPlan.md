# Fire Number Collision Handler - Implementation Plan

## Overview

Fire numbers should be unique identifiers for VisionAppraisal entities. When multiple PIDs share the same fire number, we need to determine if they represent the same owner (consolidate) or different owners (distinguish with suffix).

## Problem Statement

- Fire numbers are extracted from `propertyLocation` field
- Some fire numbers appear on multiple PID records
- Need to determine: same owner (merge info) vs different owner (create separate entity with modified fire number)

## Architecture Decision

**Approach**: Create a new dedicated file `fireNumberCollisionHandler.js` with standalone utility functions.

**Rationale**:
- Specialized edge case, not a general comparison need
- Keeps main comparison functions clean and focused
- Can be integrated into VisionAppraisal processing pipeline
- No serialization concerns - functions operate on entities, don't modify comparison architecture

---

## Implementation Components

### 1. New File: `scripts/dataSources/fireNumberCollisionHandler.js`

#### 1.1 Fire Number Registry

```javascript
// Track used fire numbers during entity creation
// Structure: { fireNumber: { entity: Entity, suffixesUsed: ['A', 'B', ...] } }
const fireNumberRegistry = new Map();

function initializeRegistry() { ... }
function registerFireNumber(fireNumber, entity) { ... }
function isFireNumberUsed(fireNumber) { ... }
function getEntityForFireNumber(fireNumber) { ... }
function getNextAvailableSuffix(fireNumber) { ... }
function clearRegistry() { ... }
```

#### 1.2 Collision Comparison Function

```javascript
/**
 * Compare two entities for fire number collision resolution
 * Uses standard name comparison but modified contactInfo comparison
 * (secondary addresses only, excluding primary)
 *
 * @param {Entity} entity1 - Existing entity using the fire number
 * @param {Entity} entity2 - New entity attempting to use same fire number
 * @returns {Object} {
 *   isSameOwner: boolean,
 *   overallSimilarity: number,
 *   nameSimilarity: number,
 *   contactInfoSimilarity: number,
 *   details: object
 * }
 */
function compareForFireNumberCollision(entity1, entity2) {
    // 1. Get name similarity using standard compareTo with detailed=true
    const nameResult = entity1.name.compareTo(entity2.name, true);
    const nameSimilarity = nameResult.overallSimilarity;

    // 2. Get contactInfo similarity using SECONDARY ADDRESSES ONLY
    const contactInfoSimilarity = compareSecondaryAddressesOnly(
        entity1.contactInfo,
        entity2.contactInfo
    );

    // 3. Calculate overall similarity (replicating entity weights without primary address influence)
    // Use same weights as entityWeightedComparison but with modified contactInfo
    const overallSimilarity = calculateOverallSimilarity(nameSimilarity, contactInfoSimilarity);

    // 4. Apply same-owner rules
    const isSameOwner = (
        overallSimilarity > 0.92 ||
        nameSimilarity > 0.95 ||
        contactInfoSimilarity > 0.95
    );

    return {
        isSameOwner,
        overallSimilarity,
        nameSimilarity,
        contactInfoSimilarity,
        details: { nameResult, /* contactInfo details */ }
    };
}
```

#### 1.3 Secondary Address Comparison Function

```javascript
/**
 * Compare ContactInfo objects using ONLY secondary addresses
 * Excludes primary addresses from comparison
 *
 * @param {ContactInfo} contactInfo1
 * @param {ContactInfo} contactInfo2
 * @returns {number} Similarity score 0-1
 */
function compareSecondaryAddressesOnly(contactInfo1, contactInfo2) {
    // Get secondary addresses from both
    const secondary1 = contactInfo1?.secondaryAddresses || [];
    const secondary2 = contactInfo2?.secondaryAddresses || [];

    // If neither has secondary addresses, return 0 (can't determine similarity)
    if (secondary1.length === 0 && secondary2.length === 0) {
        return 0;
    }

    // If only one has secondary addresses, return 0
    if (secondary1.length === 0 || secondary2.length === 0) {
        return 0;
    }

    // Compare secondary addresses using existing Address.compareTo()
    // Find best match between secondary addresses
    let bestSimilarity = 0;
    for (const addr1 of secondary1) {
        for (const addr2 of secondary2) {
            const similarity = addr1.compareTo(addr2);
            if (similarity > bestSimilarity) {
                bestSimilarity = similarity;
            }
        }
    }

    return bestSimilarity;
}
```

#### 1.4 Collision Handler Main Function

```javascript
/**
 * Handle fire number collision during entity creation
 *
 * @param {Entity} newEntity - Newly created entity
 * @param {string} fireNumber - Fire number being used
 * @returns {Object} {
 *   action: 'MERGE' | 'CREATE_WITH_SUFFIX',
 *   entity: Entity (either existing entity to merge into, or new entity with suffix),
 *   suffix: string | null (e.g., 'A', 'B'),
 *   mergedPid: string | null (PID that was merged)
 * }
 */
function handleFireNumberCollision(newEntity, fireNumber) {
    if (!isFireNumberUsed(fireNumber)) {
        // First use of this fire number - register and return
        registerFireNumber(fireNumber, newEntity);
        return { action: 'REGISTER', entity: newEntity, suffix: null, mergedPid: null };
    }

    // Collision detected - compare entities
    const existingEntity = getEntityForFireNumber(fireNumber);
    const comparison = compareForFireNumberCollision(existingEntity, newEntity);

    if (comparison.isSameOwner) {
        // SAME OWNER: Merge new entity's PID into existing entity's otherInfo.subdivision
        const newPid = extractPidFromEntity(newEntity);
        addToSubdivision(existingEntity, newPid, newEntity);

        return {
            action: 'MERGE',
            entity: existingEntity,
            suffix: null,
            mergedPid: newPid,
            comparison
        };
    } else {
        // DIFFERENT OWNER: Create with suffix
        const suffix = getNextAvailableSuffix(fireNumber);
        const modifiedFireNumber = fireNumber + suffix;

        // Modify the locationIdentifier's fire number (display only)
        modifyEntityFireNumberDisplay(newEntity, modifiedFireNumber);

        // Register the suffixed fire number
        registerFireNumber(modifiedFireNumber, newEntity);

        return {
            action: 'CREATE_WITH_SUFFIX',
            entity: newEntity,
            suffix: suffix,
            mergedPid: null,
            comparison
        };
    }
}
```

---

### 2. Modifications to `OtherInfo` Class (`contactInfo.js`)

Add `subdivision` property to the base `OtherInfo` class:

```javascript
class OtherInfo extends Info {
    constructor() {
        super();

        // Subdivision: holds PIDs of properties at same fire number with same owner
        // Structure: { pid: serializedEntityJSON, pid2: serializedEntityJSON, ... }
        this.subdivision = null;
    }

    /**
     * Add a PID and its entity data to the subdivision
     * @param {string} pid - Property ID
     * @param {Entity} entity - The entity that would have been created for this PID
     */
    addSubdivisionEntry(pid, entity) {
        if (!this.subdivision) {
            this.subdivision = {};
        }
        // Serialize the entity to JSON string
        this.subdivision[pid] = JSON.stringify(entity.serialize());
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
}
```

---

### 3. Integration Point in `visionAppraisalNameParser.js`

The collision handler should be called after each entity is created in the `createEntity*` methods:

```javascript
// In createEntityFromIndividual, createEntityFromHousehold, etc.
// After: const individual = new Individual(locationIdentifier, individualName, ...);

// Import at top of file
// import { handleFireNumberCollision, initializeRegistry } from './fireNumberCollisionHandler.js';

// Before returning the entity:
const fireNumber = record.fireNumber || extractFireNumber(record.propertyLocation);
if (fireNumber) {
    const result = handleFireNumberCollision(individual, fireNumber);

    if (result.action === 'MERGE') {
        // Entity was merged - don't add to entity list
        console.log(`Merged PID ${result.mergedPid} into existing entity for fire number ${fireNumber}`);
        return null; // Signal to caller not to add this entity
    } else if (result.action === 'CREATE_WITH_SUFFIX') {
        console.log(`Created entity with suffix ${result.suffix} for fire number ${fireNumber}`);
        // Continue with modified entity
    }
}
return individual;
```

---

### 4. Same Owner Threshold Rules

```javascript
const SAME_OWNER_THRESHOLDS = {
    overall: 0.92,      // Overall similarity > 92%
    name: 0.95,         // OR name similarity > 95%
    contactInfo: 0.95   // OR contactInfo similarity > 95%
};

function isSameOwner(overallSimilarity, nameSimilarity, contactInfoSimilarity) {
    return (
        overallSimilarity > SAME_OWNER_THRESHOLDS.overall ||
        nameSimilarity > SAME_OWNER_THRESHOLDS.name ||
        contactInfoSimilarity > SAME_OWNER_THRESHOLDS.contactInfo
    );
}
```

---

## File Structure After Implementation

```
scripts/
  dataSources/
    fireNumberCollisionHandler.js  (NEW)
    visionAppraisalNameParser.js   (MODIFIED - integration)
  objectStructure/
    contactInfo.js                 (MODIFIED - OtherInfo.subdivision)
```

---

## Testing Strategy

### Unit Tests for `fireNumberCollisionHandler.js`

1. **Registry tests**: Initialize, register, check, get suffix
2. **Secondary address comparison tests**: Both have secondary, one has, neither has
3. **Collision handling tests**: Same owner merge, different owner suffix
4. **Suffix progression tests**: A, B, C... sequence

### Integration Tests

1. **Process VisionAppraisal records with known duplicates**
2. **Verify subdivision property populated correctly**
3. **Verify suffixed fire numbers created correctly**
4. **Verify serialization/deserialization of subdivision data**

---

## Questions Resolved

1. **Same owner info storage**: `otherInfo.subdivision` property - object with PID keys and serialized entity JSON values
2. **Threshold for same owner**: Overall > 92% OR name > 95% OR contactInfo > 95%
3. **New file location**: `scripts/dataSources/fireNumberCollisionHandler.js`
4. **Suffix tracking**: Registry tracks suffixes used per base fire number

---

## Implementation Order

1. Add `subdivision` property to `OtherInfo` class in `contactInfo.js`
2. Create `fireNumberCollisionHandler.js` with all utility functions
3. Write unit tests for collision handler
4. Integrate into `visionAppraisalNameParser.js`
5. Run full VisionAppraisal processing to test
6. Update CLAUDE.md with new architecture documentation

---

## Status

- [ ] Step 1: Modify OtherInfo class
- [ ] Step 2: Create fireNumberCollisionHandler.js
- [ ] Step 3: Write unit tests
- [ ] Step 4: Integrate into parser
- [ ] Step 5: Full integration test
- [ ] Step 6: Update documentation
