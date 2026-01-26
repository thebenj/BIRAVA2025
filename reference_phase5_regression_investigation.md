# Phase 5 Regression Investigation - Session 52-53

## Problem Statement

Phase 5 of the StreetName Alias Architecture introduced a regression causing false positive entity merges:
- **Baseline:** 1,975 groups
- **Current:** 1,851 groups
- **Delta:** 124 fewer groups (too many merges)

### Symptom Pattern
VA entities with suffixed fire numbers (72B, 72C, 72E, etc.) incorrectly merging with Bloomerang entities having unsuffixed fire numbers (72) on completely different streets.

Example false merge:
- VA:72B "72 WEST SIDE ROAD" merged with Bloomerang:72 "72 Shore"

---

## Investigation Findings

### Finding 1: areSameLocationEntities() ONE-SUFFIX Case

Diagnostic logging revealed `areSameLocationEntities()` returns TRUE for cases where only ONE entity has a fire number suffix:

```
[DIAGNOSTIC] areSameLocationEntities: ONE-SUFFIX case returning TRUE - unknown:72B (suffix:true) vs unknown:72 (suffix:false), bases: 72==72
```

The function was designed for collision-resolved addresses where BOTH have suffixes (e.g., 72J vs 72W at the same property). But the code only requires "at least one" to have a suffix, allowing 72B vs 72 to pass.

**Impact:** When `areSameLocationEntities()` returns TRUE, the code bypasses `compareBlockIslandAddresses()` and uses `compareSecondaryAddressesOnly()` instead, which returns 0 if neither entity has secondary addresses. This means street name comparison is completely skipped.

**Decision:** We chose NOT to fix this directly. Instead, we want to ensure proper street name comparison happens in `compareBlockIslandAddresses()` so that even if `areSameLocationEntities()` returns TRUE inappropriately, the overall matching logic still works correctly.

### Finding 2: Unmatched Streets Have biStreetName = null

Addresses with street names not in the Block Island street database (e.g., "Shore", "Side") have `biStreetName = null`. This causes `compareBlockIslandAddresses()` to fall back to string comparison instead of using `StreetName.compareTo()`.

### Finding 3: StreetName.compareTo() Strips ALL Street Types (DRIFT FROM SPEC)

**Critical Discovery:** The `StreetName.compareTo()` method uses `StreetTypeAbbreviationManager.prepareForComparison()` which calls `stripStreetType()`. This function strips ALL trailing street types, not just duplicates:

```javascript
// In streetTypeAbbreviations.js lines 638-648
// Keep stripping while the last word is a street type
while (words.length > 1) {
    const lastWord = words[words.length - 1];
    if (this.abbreviations[lastWord] || fullForms.has(lastWord)) {
        words.pop();  // removes the street type
    } else {
        break;
    }
}
```

**Effect:** "CENTER ROAD" vs "WEST SIDE ROAD" becomes "CENTER" vs "WEST SIDE"

**Original Behavior (Pre-Phase 5):** `AttributedTerm.compareTo()` used direct Levenshtein similarity on raw strings:
```javascript
return levenshteinSimilarity(this.term, other.term);
```

This is a significant behavioral difference that was NOT intended.

**Note:** There is a SEPARATE function `_removeConsecutiveDuplicateTypes()` that only removes duplicates like "ROAD ROAD" → "ROAD". This is the intended duplicate-removal behavior. The `stripStreetType()` function is different and more aggressive.

---

## Resolution Plan

### Step 1: Fix StreetName.compareTo() to NOT Strip Street Types
Modify `StreetName.compareTo()` in aliasClasses.js to use direct Levenshtein similarity instead of `prepareForComparison()`. This restores behavior consistent with the original `AttributedTerm.compareTo()`.

### Step 2: Test Impact on Group Formation
Rebuild EntityGroup database and verify group count. This isolates the impact of the compareTo fix.

### Step 3: Implement Fallback StreetName for null biStreetName
When a Block Island address doesn't match the BI street database, instead of leaving `biStreetName = null`, create a new `StreetName` instance using `address.streetName` (the AttributedTerm) as its primaryAlias. This ensures all BI addresses have a biStreetName object for comparison.

### Step 4: Test Impact on Group Formation
Rebuild EntityGroup database and verify group count approaches baseline (1,975).

---

## Code Locations

| Component | File | Lines |
|-----------|------|-------|
| StreetName.compareTo() | scripts/objectStructure/aliasClasses.js | ~1078-1140 |
| stripStreetType() | scripts/streetTypeAbbreviations.js | 627-651 |
| prepareForComparison() | scripts/streetTypeAbbreviations.js | 690-716 |
| biStreetName assignment | scripts/objectStructure/aliasClasses.js | ~1908-1910 |
| compareBlockIslandAddresses() | scripts/utils.js | ~1030-1100 |
| areSameLocationEntities() | scripts/utils.js | ~2580-2608 |

---

## Git Reference

Pre-Phase 5 code can be viewed at commit `c95465c`:
```bash
git show c95465c:scripts/utils.js | grep -A 15 "function getComponentSimilarity"
git show c95465c:scripts/objectStructure/aliasClasses.js | sed -n '251,277p'
```

---

## Session History

- **Session 52:** Added diagnostic logging, discovered ONE-SUFFIX case, attempted fallback fix (no effect)
- **Session 53:** Verified via git that original used `AttributedTerm.compareTo()` with direct Levenshtein. Discovered `StreetName.compareTo()` strips all street types (drift from spec). Created this reference document. Implemented Steps 1 and 3. Ran case-by-case comparison - discovered the REAL root cause (see Finding 4 below).

---

## Finding 4: Secondary Address Matching is the REAL Cause (Session 53)

**Critical Discovery:** After implementing the planned fixes (Steps 1 and 3), group count remained at 1,851. Case-by-case comparison to baseline revealed the actual mechanism causing false merges.

### Example: Group 0 False Merge
- **Entity 1:** `visionAppraisal:FireNumber:72B` (ARIEL HOUSEHOLD)
  - Primary Address: 72 WEST SIDE ROAD (Block Island)
  - isBlockIslandAddress: true

- **Entity 2:** `bloomerang:1285:FireNumber:72:na` (William Corcoran)
  - Primary Address: 28 Ward Ave (NOT Block Island)
  - **Secondary Address: 72 WEST SIDE ROAD Rd** (Block Island)
  - isBlockIslandAddress: false (on primary)

### Why They Matched
```
Overall Similarity: 0.687 (below 0.875 threshold)
Name Score: 0 (completely different names)
ContactInfo Score: 1.0 (PERFECT MATCH!)

isTrueMatch Condition 2: contactInfo > 0.87 → TRUE
```

The contactInfo comparison found Entity 2's **secondary address** matches Entity 1's **primary address**. This gives contactInfo = 1.0, which triggers `isTrueMatch` even though:
- Names are completely different (score = 0)
- It's a secondary-to-primary address match

### Implications
1. **This is NOT caused by Phase 5 biStreetName changes** - the matching happens via secondary address similarity
2. The match criteria policy (contactInfo > 0.87 alone = trueMatch) may be too aggressive
3. Secondary addresses are being compared to primary addresses without additional verification

### Open Questions
- Did this behavior exist before Phase 5, or did something change?
- Should contactInfo alone be sufficient when names don't match at all?
- Should secondary-to-primary address matches have different thresholds?

---

## Code Changes Made (Session 53)

### Step 1: Fixed StreetName.compareTo() (aliasClasses.js ~line 1096)
Changed from:
```javascript
const prepared = StreetTypeAbbreviationManager.prepareForComparison(term1, term2);
return levenshteinSimilarity(prepared.strippedA, prepared.strippedB);
```
To:
```javascript
return levenshteinSimilarity(term1.toUpperCase(), term2.toUpperCase());
```

### Step 3: Added Fallback StreetName (aliasClasses.js ~line 1908)
```javascript
if (matchedStreetName) {
    address.biStreetName = matchedStreetName;
} else if (address.streetName) {
    // No match in BI database - create fallback StreetName using raw street name
    address.biStreetName = new StreetName(address.streetName);
}
```

---

## Key Lesson

When implementing new comparison methods for alias-aware classes, ensure the comparison behavior matches the original when no aliases are involved. The `StreetName.compareTo()` method was written to strip street types for canonical database lookups, but this changes comparison semantics when used as a drop-in replacement for `AttributedTerm.compareTo()`.
