# Entity Key Uniqueness Fix Plan

## Document Purpose
This specification documents the blocking issue preventing testing of the Reconcile feature and the plan to resolve it by using Bloomerang account numbers in entity keys.

## Problem Statement

### Current Situation
After implementing the Reconcile feature and updating the entity key format to include `headStatus`, we are still getting DUPLICATE errors during entity index building:

```
DUPLICATE locationIdentifier in Bloomerang: SimpleIdentifiers:PO Box 1382, Block Island, RI, 02807:na
{existing: Individual, duplicate: AggregateHousehold}
```

### Root Cause Analysis
The key format `source:locIdType:locIdValue:headStatus` fails because:

1. **Standalone Individuals** - Individual entities NOT in a household get `headStatus = 'na'`
2. **AggregateHouseholds** - Household entities get `headStatus = 'na'` (not Individual type)
3. **Both share the same address** as locationIdentifier

Result: `bloomerang:SimpleIdentifiers:PO Box 1382...:na` matches for both, causing collision.

### Why headStatus Doesn't Solve This
- `headStatus` only differentiates Individuals **within** a household (head vs member)
- It doesn't differentiate between entity types (Individual vs AggregateHousehold)
- Standalone Individuals and AggregateHouseholds both get 'na'

### Previous Attempts (Failed Approaches)
1. **headStatus approach** - Only helps for household members, not standalone vs household collision
2. **Detecting "standalone" status** - Problematic to identify reliably

---

## Solution: Use Bloomerang Account Number

### Key Insight
Every Bloomerang entity has a unique account number. This is the natural unique identifier.

### Proposed Key Format

**For Bloomerang:**
- `bloomerang:accountNumber`
- Example: `bloomerang:1917`, `bloomerang:1382`
- Simple, guaranteed unique, directly available on entity

**For VisionAppraisal:**
- `visionAppraisal:locIdType:locIdValue`
- Example: `visionAppraisal:FireNumber:222`, `visionAppraisal:PID:53`
- VisionAppraisal has no duplicate locationIdentifiers within the same type

### Why This Works
- Every Bloomerang entity has a unique account number (field index 0 in CSV)
- Account numbers are already stored on entities as `entity.accountNumber`
- No collision possible between Individuals and AggregateHouseholds
- Simpler key format for Bloomerang

### Where Account Number is Stored
Based on entity structure, account number is accessible via:
- `entity.accountNumber?.primaryAlias?.term` (SimpleIdentifiers pattern)
- Need to verify exact path in loaded entities

---

## Implementation Plan

### Files to Modify

1. **loadAllEntitiesButton.js**
   - `getLocationIdentifierTypeAndValue()` → Return different structure for Bloomerang
     - Bloomerang: `{ type: 'accountNumber', value: <accountNumber>, source: 'bloomerang' }`
     - VisionAppraisal: `{ type: <locIdType>, value: <locIdValue>, source: 'visionAppraisal' }`
   - `buildEntityLookupIndex()` → Use appropriate key format based on source
     - Bloomerang: `bloomerang:<accountNumber>`
     - VisionAppraisal: `visionAppraisal:<locIdType>:<locIdValue>`
   - `getEntityBySourceTypeAndValue()` → Simplify for Bloomerang (just needs accountNumber)

2. **universalEntityMatcher.js**
   - `getEntityKeyInfo()` → Return accountNumber for Bloomerang entities
   - Match result objects → Include accountNumber for Bloomerang

3. **unifiedEntityBrowser.js**
   - `reconcileMatch()` → Accept accountNumber for Bloomerang entities
   - `doReconcile()` → Pass accountNumber
   - UI display → Show accountNumber in badges for Bloomerang

### Helper Function to Extract Account Number
```javascript
function getBloomerangAccountNumber(entity) {
    // Account number stored in accountNumber property (SimpleIdentifiers)
    if (entity.accountNumber?.primaryAlias?.term) {
        return String(entity.accountNumber.primaryAlias.term);
    }
    return null;
}
```

### Detecting Source
```javascript
function isBloomerangEntity(entity) {
    // Bloomerang entities have accountNumber property
    // VisionAppraisal entities do not
    return entity.accountNumber !== undefined;
}
```

---

## Verification Steps

### After Implementation
1. Load entities - no DUPLICATE errors should appear
2. Verify entity count matches expected (4105 total)
3. Test Reconcile button with both Bloomerang and VisionAppraisal entities
4. Verify correct entity lookup in both directions

### Expected Outcomes
- `bloomerang:1917` → Unique Individual entity
- `bloomerang:1382` → Unique AggregateHousehold entity
- No collisions between entity types sharing same address
- Reconcile feature can be tested

---

## Context: What This Blocks

This issue is blocking testing of:
1. **Reconcile feature** - Re-implemented after autocompact code revert
2. **Match Analysis window** - Uses entity lookup for View and Reconcile buttons
3. **Full entity analysis** - Cannot run comprehensive tests with duplicate errors

The Reconcile feature code is written and syntax-checked but cannot be functionally tested until entity keys are unique.

---

## Session Notes

Created: December 7, 2025
Context: Continuation of recovery from autocompact-induced code revert
Status: PLAN_ONLY - No code changes made, awaiting user approval to proceed

Previous key format evolution:
1. `source:value` - Failed (FireNumber vs PID collision)
2. `source:type:value` - Failed (needed headStatus)
3. `source:type:value:headStatus` - Failed (standalone vs household collision)
4. **Proposed**: `bloomerang:accountNumber` and `visionAppraisal:type:value`
