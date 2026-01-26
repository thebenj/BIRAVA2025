# Phase 5: StreetName Comparison Implementation

**Document Purpose**: Detailed implementation plan for Phase 5 of the StreetName Alias Architecture project.

**Document Status**: STEP 1 COMPLETE, STEP 2 CODED (blocked on entity rebuild)

**Created**: January 18, 2026
**Last Updated**: January 22, 2026 (Step 2 coded, blocked on entity rebuild)

**Parent Document**: reference_streetNameAliasArchitecture.md

---

## 1. OVERVIEW

### What Phase 5 Does

Phase 5 replaces string-based street comparison with object-based street comparison for Block Island addresses. When two BI addresses both have `biStreetName` populated, comparison uses `StreetName.compareTo()` instead of Levenshtein similarity on raw strings.

### Why This Matters

Currently, "CORN NECK ROAD" vs "CORN NECK RD" scores ~0.9 via Levenshtein. After Phase 5, they score 1.0 because both resolve to the same StreetName object (or are known aliases).

### Architectural Principle

**Separation of concerns**:
- `StreetName.compareTo()` returns RAW DATA (four similarity scores by alias category)
- CALLING CODE decides how to interpret those scores based on context

This keeps the StreetName class simple and puts decision logic where it belongs - in the comparison functions that understand the broader context.

---

## 2. STREETNAME.COMPARETO() SPECIFICATION

### Current Behavior (to be replaced)

```javascript
compareTo(other) {
    // Returns 1.0 if exact match in primary/homonyms/synonyms, 0 otherwise
}
```

### New Specification

```javascript
/**
 * Compare this StreetName to another StreetName or string.
 * Returns an object with the highest Levenshtein similarity score
 * for each category of alias.
 *
 * @param {StreetName|string} other - StreetName to compare, or string to look up
 * @returns {Object} {
 *   primary: number,    // similarity to primaryAlias (0-1)
 *   homonym: number,    // highest similarity among homonyms (0-1, or -1 if none)
 *   synonym: number,    // highest similarity among synonyms (0-1, or -1 if none)
 *   candidate: number   // highest similarity among candidates (0-1, or -1 if none)
 * }
 */
compareTo(other) {
    // Extract term to compare
    // Calculate Levenshtein similarity to primary
    // Calculate best similarity across each alias category
    // Return object with four scores
}
```

### Return Value Details

| Key | Value | Meaning |
|-----|-------|---------|
| `primary` | 0.0 - 1.0 | Levenshtein similarity to `this.primaryAlias.term` |
| `homonym` | 0.0 - 1.0 or -1 | Best similarity among `this.alternatives.homonyms`, -1 if empty |
| `synonym` | 0.0 - 1.0 or -1 | Best similarity among `this.alternatives.synonyms`, -1 if empty |
| `candidate` | 0.0 - 1.0 or -1 | Best similarity among `this.alternatives.candidates`, -1 if empty |

### Why -1 for Empty Categories

Using -1 (not 0) for empty categories allows calling code to distinguish between:
- "No homonyms exist" (-1)
- "Homonyms exist but none match well" (0.0 - low score)

### Street Type Handling

The comparison should use `StreetTypeAbbreviationManager.prepareForComparison()` to strip street types before calculating Levenshtein similarity. This ensures "CORN NECK ROAD" and "CORN NECK RD" compare as "CORN NECK" vs "CORN NECK" = 1.0.

---

## 3. CALLING CODE ANALYSIS

### The Comparison Chain

```
Entity.compareTo()
  → ContactInfo.compareTo()
    → Address.compareTo()
      → genericObjectCompareTo()
        → addressWeightedComparison()
          → compareBlockIslandAddresses()  <-- CHANGE HERE
```

### Primary Target: compareBlockIslandAddresses()

**File**: `scripts/utils.js`
**Lines**: 1030-1066

**Current code** (line 1039):
```javascript
const streetNameSim = getComponentSimilarity(addr1.streetName, addr2.streetName);
```

**New logic**:
```javascript
let streetNameSim;

// Check if both addresses have biStreetName objects
if (addr1.biStreetName && addr2.biStreetName) {
    // Same object reference = perfect match
    if (addr1.biStreetName === addr2.biStreetName) {
        streetNameSim = 1.0;
    } else {
        // Different objects - compare using new compareTo
        const scores = addr1.biStreetName.compareTo(addr2.biStreetName);
        // Use best score across verified categories (primary, homonym, candidates)
        // Exclude synonyms (they're unverified, may be false positives)
        streetNameSim = Math.max(
            scores.primary,
            scores.homonym >= 0 ? scores.homonym : 0,
            scores.candidate >= 0 ? scores.candidate : 0
        );
    }
} else {
    // Missing biStreetName is a bug for BI addresses
    throw new Error('BI address missing biStreetName - this is a bug');
}
```

### Secondary Location: compareGeneralStreetAddresses()

**File**: `scripts/utils.js`
**Lines**: 1081-1141

**No changes needed**: This function handles off-island addresses which don't have `biStreetName`. The existing string comparison is correct for these.

### Why No Changes to universalEntityMatcher.js

The `compareIndividualToEntityDirect()` function calls `contactInfo.compareTo()`, which flows through the same `addressWeightedComparison()` → `compareBlockIslandAddresses()` path. No direct changes needed there.

---

## 4. IMPLEMENTATION STEPS

### Step 1: Update StreetName.compareTo() - COMPLETE

**File**: `scripts/objectStructure/aliasClasses.js`
**Location**: Lines 1071-1125 (replaced existing method)

**STATUS**: IMPLEMENTED AND TESTED (Session 42, January 22, 2026)

**Test Results**:
```javascript
const cornNeck = window.blockIslandStreetDatabase.lookup('CORN NECK ROAD');
cornNeck.compareTo('CORN NECK ROAD') → {primary: 0.64, homonym: 1, synonym: -1, candidate: -1}
cornNeck.compareTo('CORN NECK RD') → {primary: 0.75, homonym: 1, synonym: -1, candidate: -1}
cornNeck.matches('CORN NECK ROAD') → true
cornNeck.matches('CORN NECK RD') → true
```

**Note**: Primary alias is "CORN NECK" (stripped base), variations like "CORN NECK ROAD" stored as homonyms. This is correct per Phase 2 design.

### Step 2: Update compareBlockIslandAddresses() - CODED, BLOCKED ON ENTITY REBUILD

**File**: `scripts/utils.js`
**Location**: Lines 1035-1062

**STATUS**: CODED (Session 43, January 22, 2026) - BLOCKED ON TESTING

**Code Implementation**: The code has been written in utils.js. It replaces the simple
`getComponentSimilarity(addr1.streetName, addr2.streetName)` with biStreetName-based comparison.

**BLOCKER**: Testing cannot proceed because saved entity files on Google Drive were created
BEFORE the StreetName database was loaded during entity creation. biStreetName is null on
all loaded addresses.

**ROOT CAUSE**: biStreetName is populated during Address.fromProcessedAddress() which requires
window.blockIslandStreetDatabase to already be loaded. The saved entity files were created
when this database wasn't loaded, so biStreetName was never set.

**SOLUTION**: Rebuild entities from source data (Phase A workflow) with correct loading order:
1. Load StreetName database FIRST: `await loadBlockIslandStreetsFromDrive()`
2. Then process/create entities from source data (VA + Bloomerang)
3. Save new entity files to Google Drive
4. Then test Phase 5 comparison logic

**DO NOT** add property-specific code to deserialization - that violates the project's
serialization architecture principles.

Tasks completed in code:
1. Check if both addresses have `biStreetName` ✓
2. If same object reference → score = 1.0 ✓
3. If different objects → call `compareTo()`, use best score from primary/homonym/candidates ✓
4. If either missing `biStreetName` → throw descriptive error ✓

**Implemented code** (in utils.js lines 1035-1062):
```javascript
let streetNameSim;
let streetNameMethod;
if (addr1.biStreetName && addr2.biStreetName) {
    if (addr1.biStreetName === addr2.biStreetName) {
        streetNameSim = 1.0;
        streetNameMethod = 'biStreetName_sameObject';
    } else {
        const scores = addr1.biStreetName.compareTo(addr2.biStreetName);
        // Use verified categories only: primary, homonym, candidates
        // Exclude synonyms (unverified, may be false positives)
        streetNameSim = Math.max(
            scores.primary,
            scores.homonym >= 0 ? scores.homonym : 0,
            scores.candidate >= 0 ? scores.candidate : 0
        );
        streetNameMethod = 'biStreetName_compareTo';
    }
} else {
    throw new Error(`BI address missing biStreetName - this is a bug...`);
}
```

### Step 3: Test Incrementally

1. After Step 1: Test `StreetName.compareTo()` in console with known street pairs
2. After Step 2: Run EntityGroup build and compare to Phase 4 baseline
3. Document any score changes (these are expected improvements, not regressions)

---

## 5. EXPECTED OUTCOMES

### Score Changes (Intended)

| Comparison | Before Phase 5 | After Phase 5 |
|------------|----------------|---------------|
| CORN NECK ROAD vs CORN NECK RD | ~0.88 (Levenshtein) | 1.0 (same StreetName) |
| OLD TOWN ROAD vs OLD TOWN RD | ~0.88 (Levenshtein) | 1.0 (same StreetName) |
| CORN NECK vs CORN NECK ROAD | ~0.76 (Levenshtein) | 1.0 (alias match) |

### EntityGroup Impact

Higher street name scores may cause:
- More BI entity pairs to exceed match thresholds
- Some groups that were near-misses to become matches
- This is the **intended improvement**

### Off-Island Addresses

No change - they don't have `biStreetName`, so fallback to string comparison applies.

---

## 6. RISK MITIGATION

### Infinite Loop Prevention (Lesson from Session 41)

The failed first attempt caused an infinite loop. To prevent this:

1. **No circular calls**: `StreetName.compareTo()` must NOT call any function that might call back to it
2. **Simple implementation**: The new `compareTo()` only calculates Levenshtein scores - no complex logic
3. **Diagnostic logging**: Add console.log statements during development to trace execution

### Backward Compatibility

- If `biStreetName` is missing, fall back to string comparison
- Off-island addresses continue to work unchanged
- No changes to Address class structure

### Testing Protocol

1. Test `StreetName.compareTo()` in isolation first
2. Test `compareBlockIslandAddresses()` with known address pairs
3. Run full EntityGroup build and compare to Phase 4 metrics
4. Document all score changes

---

## 7. CODE LOCATIONS REFERENCE

| Component | File | Line(s) |
|-----------|------|---------|
| StreetName class | scripts/objectStructure/aliasClasses.js | 1053-1140 |
| StreetName.compareTo() | scripts/objectStructure/aliasClasses.js | 1071-1110 |
| compareBlockIslandAddresses() | scripts/utils.js | 1030-1066 |
| addressWeightedComparison() | scripts/utils.js | 858-909 |
| compareGeneralStreetAddresses() | scripts/utils.js | 1081-1141 |
| levenshteinSimilarity() | scripts/utils.js | (search for function) |
| StreetTypeAbbreviationManager | scripts/streetTypeAbbreviations.js | entire file |
| Address.biStreetName property | scripts/objectStructure/aliasClasses.js | 1609 |
| biStreetName population | scripts/objectStructure/aliasClasses.js | 1824-1849 |

---

## 8. DECISION LOG

| Decision | Rationale |
|----------|-----------|
| Return object with four scores | Keeps compareTo simple; calling code interprets based on context |
| Use -1 for empty categories | Distinguishes "no aliases" from "no match" |
| Check object identity first | Same StreetName object = perfect match, skip calculation |
| Exclude synonyms from best score | Synonyms are unverified (staging area); may be false positives |
| Include candidates in best score | Candidates are verified through review or circumstantial evidence |
| Strip street types for comparison | "ROAD" vs "RD" shouldn't affect similarity |
| No changes to compareGeneralStreetAddresses() | Off-island addresses don't have biStreetName |

---

## DOCUMENT VERSION

**Version**: 1.0
**Created**: January 18, 2026
**Author**: Session 42 (Claude + User collaboration)
