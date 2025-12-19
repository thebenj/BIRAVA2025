# Same-Location Entity Comparison Fix Specification

**Created**: December 18, 2025
**Purpose**: Fix incorrect grouping of VisionAppraisal entities that share the same physical location (same base fire number with different suffixes)

---

## Problem Statement

### The Bug
VisionAppraisal entities at the same physical location (e.g., condos at 72 West Side Road with fire numbers 72A, 72B, 72C, etc.) are being incorrectly grouped together in EntityGroups. These represent **different owners** at the same address who should NOT be grouped.

### Root Cause
The `universalCompareTo()` function routes comparisons to specialized functions based on entity types:

```
Individual-to-Individual       → compareIndividualToIndividual()
Individual-to-AggregateHousehold → compareIndividualToHousehold()
AggregateHousehold-to-Individual → compareHouseholdToIndividual()
AggregateHousehold-to-AggregateHousehold → compareHouseholdToHousehold()
Other combinations             → compareIndividualToEntityDirect()
```

**Only `compareIndividualToEntityDirect()` has same-location handling.**

The household comparison functions (`compareHouseholdToHousehold`, `compareHouseholdToIndividual`, `compareIndividualToHousehold`) iterate over **embedded individuals** within households. These embedded individuals don't have fire numbers, so the `areSameLocationEntities()` check fails.

### Evidence from Diagnostic Output
```
⚠️ SAME-LOCATION BUG DETECTED:
  Base: visionAppraisal:FireNumber:72G (AggregateHousehold, fire#: 72G)
  Target: visionAppraisal:FireNumber:72K (Individual, fire#: 72K)
  ComparisonType: AggregateHousehold-to-Individual
  Scores: overall=0.9167, name=0.8333, contactInfo=1.0000

⚠️ SAME-LOCATION BUG DETECTED:
  Base: visionAppraisal:FireNumber:72G (AggregateHousehold, fire#: 72G)
  Target: visionAppraisal:FireNumber:72O (AggregateHousehold, fire#: 72O)
  ComparisonType: AggregateHousehold-to-AggregateHousehold
  Scores: overall=0.9167, name=0.8333, contactInfo=1.0000
```

The `contactInfo=1.0000` score proves that primary address comparison is being used (same address = perfect match), NOT secondary-only comparison.

---

## Solution Overview

### Core Change
Add same-location detection at the **top** of `universalCompareTo()`, **before** routing to specialized comparison functions. When same-location entities are detected, modify how contactInfo comparison is performed to use **secondary addresses only**.

### Key Insight
The fire number information is available on the **top-level entities** passed to `universalCompareTo()`. We must check for same-location at this level, before any routing occurs that loses this context.

---

## Implementation Specification

### Location
File: `scripts/matching/universalEntityMatcher.js`
Function: `universalCompareTo(entity1, entity2)`

### Current Code Structure (lines ~269-302)
```javascript
function universalCompareTo(entity1, entity2) {
    const type1 = entity1.constructor.name;
    const type2 = entity2.constructor.name;

    let result;
    let comparisonType;

    if (type1 === 'Individual' && type2 === 'Individual') {
        result = compareIndividualToIndividual(entity1, entity2);
        comparisonType = 'Individual-to-Individual';
    }
    else if (type1 === 'Individual' && type2 === 'AggregateHousehold') {
        result = compareIndividualToHousehold(entity1, entity2);
        comparisonType = 'Individual-to-AggregateHousehold';
    }
    // ... etc
}
```

### Proposed Changes

#### Step 1: Add same-location check at top of universalCompareTo()

```javascript
function universalCompareTo(entity1, entity2) {
    const type1 = entity1.constructor.name;
    const type2 = entity2.constructor.name;

    // Check for same-location entities BEFORE routing
    // This catches cases where embedded individual comparisons would lose fire number context
    const isSameLocation = (typeof areSameLocationEntities === 'function')
        ? areSameLocationEntities(entity1, entity2)
        : false;

    let result;
    let comparisonType;

    // ... routing logic continues, passing isSameLocation flag
}
```

#### Step 2: Modify comparison function calls to pass same-location flag

Each specialized comparison function needs to receive the `isSameLocation` flag and use `compareSecondaryAddressesOnly()` when true.

**Option A: Pass flag to each function**
```javascript
if (type1 === 'Individual' && type2 === 'Individual') {
    result = compareIndividualToIndividual(entity1, entity2, isSameLocation);
    comparisonType = 'Individual-to-Individual';
}
else if (type1 === 'Individual' && type2 === 'AggregateHousehold') {
    result = compareIndividualToHousehold(entity1, entity2, isSameLocation);
    comparisonType = 'Individual-to-AggregateHousehold';
}
// ... etc for all cases
```

**Option B: Handle same-location entirely in universalCompareTo()** (Preferred)

If `isSameLocation` is true, use a unified comparison approach that:
1. Compares names normally
2. Uses `compareSecondaryAddressesOnly()` for contactInfo instead of standard contactInfo comparison
3. Returns a properly weighted result

This avoids modifying multiple specialized functions.

---

## Detailed Implementation (Option B - Preferred)

### New Helper Function
Add a function that performs same-location comparison:

```javascript
/**
 * Compare two entities known to be at the same physical location.
 * Uses secondary addresses only for contactInfo to avoid false positives
 * from matching primary addresses.
 */
function compareSameLocationEntities(entity1, entity2) {
    // Get name comparison
    let nameScore = 0;
    const name1 = extractNameFromEntity(entity1);
    const name2 = extractNameFromEntity(entity2);

    if (name1 && name2) {
        const nameResult = name1.compareTo(name2);
        nameScore = typeof nameResult === 'number' ? nameResult : (nameResult?.similarity || 0);
    }

    // Get contactInfo comparison using SECONDARY ADDRESSES ONLY
    let contactInfoScore = 0;
    const contactInfo1 = extractContactInfoFromEntity(entity1);
    const contactInfo2 = extractContactInfoFromEntity(entity2);

    if (contactInfo1 && contactInfo2) {
        contactInfoScore = (typeof compareSecondaryAddressesOnly === 'function')
            ? compareSecondaryAddressesOnly(contactInfo1, contactInfo2)
            : 0;
    }

    // Apply standard weighting
    const overallScore = (nameScore * 0.5) + (contactInfoScore * 0.5);

    return {
        score: overallScore,
        details: {
            components: {
                name: { similarity: nameScore },
                contactInfo: { similarity: contactInfoScore }
            },
            sameLocation: true
        }
    };
}
```

### Helper Functions Needed
```javascript
function extractNameFromEntity(entity) {
    const type = entity.constructor.name;
    if (type === 'Individual') {
        return entity.name;
    } else if (type === 'AggregateHousehold') {
        // Use household name or first member's name
        return entity.householdName || (entity.members?.[0]?.name);
    }
    return null;
}

function extractContactInfoFromEntity(entity) {
    const type = entity.constructor.name;
    if (type === 'Individual') {
        return entity.contactInfo;
    } else if (type === 'AggregateHousehold') {
        // Return first member's contactInfo or household-level contactInfo
        return entity.contactInfo || entity.members?.[0]?.contactInfo;
    }
    return null;
}
```

### Modified universalCompareTo()
```javascript
function universalCompareTo(entity1, entity2) {
    const type1 = entity1.constructor.name;
    const type2 = entity2.constructor.name;

    // Check for same-location entities BEFORE routing
    const isSameLocation = (typeof areSameLocationEntities === 'function')
        ? areSameLocationEntities(entity1, entity2)
        : false;

    // If same-location, use specialized comparison that excludes primary address
    if (isSameLocation) {
        const result = compareSameLocationEntities(entity1, entity2);
        return {
            ...result,
            comparisonType: `${type1}-to-${type2} (same-location)`
        };
    }

    // Normal routing for non-same-location entities
    let result;
    let comparisonType;

    if (type1 === 'Individual' && type2 === 'Individual') {
        result = compareIndividualToIndividual(entity1, entity2);
        comparisonType = 'Individual-to-Individual';
    }
    // ... rest of existing routing logic unchanged
}
```

---

## Scope of Impact

### Entity Type Combinations Affected

| Comparison Type | Current Behavior | After Fix |
|-----------------|------------------|-----------|
| Individual-to-Individual | Already handled in compareIndividualToEntityDirect | Handled earlier in universalCompareTo |
| AggregateHousehold-to-Individual | Uses full contactInfo (BUG) | Uses secondary-only |
| Individual-to-AggregateHousehold | Uses full contactInfo (BUG) | Uses secondary-only |
| AggregateHousehold-to-AggregateHousehold | Uses full contactInfo (BUG) | Uses secondary-only |

### VisionAppraisal-Specific
This fix specifically addresses VisionAppraisal entities because:
- Only VisionAppraisal addresses have altered fire numbers with letter suffixes
- Bloomerang addresses never have the PID-based fire number modifications
- The `areSameLocationEntities()` function only returns true when both entities have fire numbers with the same base but different full values

---

## Testing Plan

### Test Case 1: Fire Number 72 Condos
- Rebuild EntityGroup database
- Verify entities with fire numbers 72A, 72B, 72C, etc. are NOT grouped together
- Each should be in its own EntityGroup (or grouped only with matching Bloomerang records by name/secondary address)

### Test Case 2: EntityGroup #677 Equivalent
- After fix, the 14 VisionAppraisal entities from the original bad group should be in separate groups
- The founding member (72G) should not pull in 72K, 72O, etc.

### Test Case 3: Legitimate Matches Still Work
- Entities at different locations with similar names should still be evaluated normally
- True matches based on name AND address should still group correctly

### Diagnostic Verification
After implementation, the diagnostic code should show:
- `comparisonType: "AggregateHousehold-to-Individual (same-location)"`
- `contactInfo` score should be much lower than 1.0000 (since secondary addresses differ)
- `sameLocation: true` in details

---

## Files to Modify

1. **universalEntityMatcher.js** - Primary changes:
   - Add `compareSameLocationEntities()` function
   - Add `extractNameFromEntity()` helper
   - Add `extractContactInfoFromEntity()` helper
   - Modify `universalCompareTo()` to check same-location first

2. **No changes needed to**:
   - `compareIndividualToIndividual()`
   - `compareIndividualToHousehold()`
   - `compareHouseholdToIndividual()`
   - `compareHouseholdToHousehold()`
   - `entityGroupBuilder.js`

---

## Risk Assessment

### Low Risk
- Same-location check uses existing, tested `areSameLocationEntities()` function
- `compareSecondaryAddressesOnly()` already exists and is tested
- Change is isolated to one routing point

### Considerations
- Embedded individual comparisons will no longer occur for same-location entities
- This is intentional: we don't want to find matches within embedded members when the top-level entities are at the same location

---

**Document Version**: 1.1
**Status**: IMPLEMENTED_READY_FOR_VERIFICATION
**Implementation Date**: December 18, 2025
**Implementation Location**: scripts/matching/universalEntityMatcher.js (lines 263-400)
**Test Results**: Sampled database build - 0 problem groups detected
**Next Step**: Run full database build for final verification
