# ContactInfo Comparison Issue - December 17, 2025

**Status**: USER_VERIFIED_RESOLVED (December 18, 2025)

## Summary

Investigation into why `visionAppraisal:PID:364` vs `visionAppraisal:PID:363` produces a contactInfo similarity of only 0.5 when both entities share **identical** secondary addresses (PO BOX 5, Block Island, RI, 02807).

## The Entities

**Entity 1: visionAppraisal:PID:364**
- Type: Individual
- Name: ADRIAN J MITCHELL (IndividualName)
- Primary Address: MITCHELL, Block Island, RI, 02807
- Secondary Address[0]: PO BOX 5, Block Island, RI, 02807

**Entity 2: visionAppraisal:PID:363**
- Type: LegalConstruct
- Name: MITCHELL, ADRIAN J LV TRUST 50, BLOCK ISLAND LAND TRUST 50 (NonHumanName)
- Primary Address: MITCHELL FARM-CONS., Block Island, RI, 02807
- Secondary Address[0]: PO BOX 5, Block Island, RI, 02807

## The Problem

Both entities have **identical** secondary addresses (PO BOX 5), but `contactInfo.compareTo()` returns only 0.5 similarity.

## Root Cause Analysis

### Code Path Traced

```
universalCompareTo(e1, e2)
  → compareIndividualToEntityDirect() [universalEntityMatcher.js]
    → individual.contactInfo.compareTo(entity.contactInfo)
      → contactInfoWeightedComparison() [utils.js]
```

### What contactInfoWeightedComparison Does

1. **Step 1 - Primary Address Match**: Calls `findBestAddressMatch()` to find the best match for ci1's primary address against ALL addresses in ci2 (primary + secondaries)

2. **Step 2 - Secondary Address Match**: Compares remaining secondaries after excluding addresses used in Step 1

3. **Weighting**: Base weights are primary=0.6, secondary=0.2, email=0.2

### What Actually Happened

The `findBestAddressMatch()` function compared:
- ci1.primaryAddress ("MITCHELL") against ci2.primaryAddress ("MITCHELL FARM-CONS.")
- ci1.primaryAddress ("MITCHELL") against ci2.secondaryAddress[0] ("PO BOX 5")

It found that ci1's primary matched ci2's secondary (PO BOX 5) with score 0.5, which was better than matching ci2's primary.

**Critical Issue**: Because ci2's PO BOX 5 was "used" as the primary match target, it was excluded from the secondary comparison pool via this filter:

```javascript
const otherSecondaries = (otherCI.secondaryAddress || []).filter((addr, idx) => {
    return addr && idx !== otherPrimaryMatchedIndex;
});
```

Since `otherPrimaryMatchedIndex = 0` (ci2's secondary[0] was matched), and ci2 only has one secondary address, `otherSecondaries` became empty.

**Result**:
- `hasSecondaryData = false` (because otherSecondaries.length = 0)
- Secondary comparison was skipped entirely
- Only the primary match (0.5) was used with weight 1.0
- Final score: 0.5

### The Identical Secondary Addresses Were Never Compared

ci1.secondary[0] ("PO BOX 5") was never compared to ci2.secondary[0] ("PO BOX 5") because ci2's PO BOX 5 was already "claimed" by the primary address matching logic.

## Detailed Diagnostic Output

```
ci1.primaryAddress = Address: MITCHELL, Block Island, RI, 02807
ci2.primaryAddress = Address: MITCHELL FARM-CONS., Block Island, RI, 02807
ci1.secondaryAddress count = 1
  ci1.secondary[0] = Address: PO BOX 5, Block Island, RI, 02807
ci2.secondaryAddress count = 1
  ci2.secondary[0] = Address: PO BOX 5, Block Island, RI, 02807

contactInfo.compareTo detailed result: {
  "overallSimilarity": 0.5,
  "components": {
    "primaryAddress": {
      "actualWeight": 1,
      "similarity": 0.5,
      "weightedValue": 0.5,
      "baseValue": "Address: MITCHELL, Block Island, RI, 02807",
      "targetValue": "Address: PO BOX 5, Block Island, RI, 02807",  <-- ci2's SECONDARY was matched!
      "matchDirection": "base-to-target",
      "subordinateDetails": 0.5
    }
  },
  // NOTE: No "secondaryAddress" component in result!
  "checkSum": 0
}
```

## The Design Question

The current logic assumes an address can only be "used once" - either as a primary match or a secondary match. This prevents double-counting the same address.

**However**, this creates a problem when:
1. Primary addresses are different (e.g., street address vs farm name)
2. Secondary addresses are identical (e.g., same PO Box)
3. The "best" primary match happens to be the secondary address

In this case, the identical secondary addresses should contribute to the similarity score, but they don't because one was "consumed" by the primary matching logic.

## Potential Solutions (Not Yet Implemented)

### Option A: Always Compare Secondary-to-Secondary First
Compare ci1.secondaries to ci2.secondaries BEFORE the primary matching, so identical secondaries get credit regardless of what the primary match finds.

### Option B: Don't Exclude From Secondary Pool If Match Was Cross-Category
Only exclude an address from the secondary pool if it was matched against the same category (primary-to-primary or secondary-to-secondary), not if it was matched cross-category (primary-to-secondary).

### Option C: Separate "Best Primary" and "Best Secondary" Scoring
Score primary-to-primary and secondary-to-secondary independently, then combine. This ensures identical secondaries always get compared.

### Option D: Allow Address Reuse With Diminished Weight
Allow the same address to contribute to both primary and secondary scores, but with reduced weight in the secondary comparison.

## Considerations Before Implementing

1. **Why the current design exists**: The exclusion logic was likely added to prevent artificially inflating scores when the same address appears in both primary and secondary slots.

2. **Edge cases to consider**:
   - What if ci1.primary = ci2.secondary AND ci1.secondary = ci2.primary? (Swapped addresses)
   - What if both entities have multiple secondaries?
   - What about the `same-location` scenario we previously implemented for fire numbers?

3. **Testing needed**: Any fix should be tested against:
   - Entities with identical primary addresses
   - Entities with identical secondary addresses
   - Entities with swapped primary/secondary
   - Fire number collision cases (72J vs 72W)
   - Entities with no secondary addresses

## Related Code Locations

- `contactInfoWeightedComparison()`: [utils.js](scripts/utils.js) ~line 1153
- `findBestAddressMatch()`: [utils.js](scripts/utils.js) - searches for best address match
- `compareIndividualToEntityDirect()`: [universalEntityMatcher.js](scripts/matching/universalEntityMatcher.js) ~line 125
- `areSameLocationEntities()`: [utils.js](scripts/utils.js) ~line 2540
- `extractFireNumberFromEntity()`: [utils.js](scripts/utils.js) ~line 2481 (fixed Dec 17 to check for FireNumber type)

## Related Fix Made This Session

Fixed `extractFireNumberFromEntity()` to only return a value if the entity's `locationIdentifier` is actually a `FireNumber` type (checked via `constructor.name === 'FireNumber'`). Previously, it was returning PID values for PID-keyed entities, which could cause incorrect behavior if a PID happened to look like a fire number with a suffix.

## Diagnostic Code Still In Place

There are diagnostic console.logs in:
- `compareIndividualToEntityDirect()` in universalEntityMatcher.js (triggered for PID 364 vs 363)
- `entityWeightedComparison()` in utils.js (triggered for PID 364 vs 363)

These can be removed once the fix is implemented and verified.

## Next Steps

1. Review the potential solutions above
2. Decide on the correct approach (may need user input on business logic)
3. Implement the fix
4. Test with the 364 vs 363 case
5. Test with fire number collision cases (72J vs 72W)
6. Remove diagnostic code
