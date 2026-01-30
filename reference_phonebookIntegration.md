# Phonebook Integration Plan

**Document Purpose**: Plan for integrating phonebook data with the StreetName alias system and generalizing the pattern.

**Document Status**: PLANNING

**Created**: January 30, 2026
**Last Updated**: January 30, 2026

---

## QUICK START

### Current State
- Phases 0-5 of StreetName architecture: COMPLETE
- Task 1 (Database Maintenance Box): COMPLETE
- Task 2 (AliasedTermDatabase): COMPLETE
- IndividualNameDatabase system: COMPLETE
- **Task 3 (Phonebook Integration)**: THIS DOCUMENT

### Prerequisites Complete
- StreetName class with alias support
- StreetNameDatabase loaded from Google Drive (116 StreetName objects, 208 variations)
- AliasedTermDatabase wrapper pattern established
- IndividualNameDatabase demonstrates the pattern for aliased term databases

---

## SECTION 1: OVERVIEW

### Goal
Incorporate phonebook street name variations into the StreetName database, enriching the alias system with real-world usage data from Block Island residents.

### Key Principle: Phonebook Augments, VA Is Primary

**VisionAppraisal is the PRIMARY and AUTHORITATIVE source for street names.** If a street is not in VA, it does not exist on Block Island (from our data model's perspective).

The phonebook's role is to:
- Add **candidate variations** for streets that already exist in the VA-based database
- Identify potential data quality issues when phonebook streets don't match any VA street

The phonebook does NOT add new canonical streets - it only adds alternative spellings for existing ones.

---

## SECTION 2: CURRENT PHONEBOOK HANDLING

### Location
`scripts/phonebookParser.js`

### Current Behavior
1. Extracts street names from phone book entries
2. Normalizes and looks up in `window.blockIslandStreets`
3. Reports unvalidated streets (streets not found in database)
4. Stores `streetNormalized` if a match is found

### Current Limitations
- Simple string matching (no alias awareness)
- Unrecognized streets are reported but not systematically tracked
- No mechanism to add discovered variations back to the database

---

## SECTION 3: PROPOSED ARCHITECTURE

### Phonebook Processing Flow

```
Phonebook Entry: "Corn Neck Rd."
    ↓
Lookup in StreetName database (VA-based)
    ↓
Similar match found: "CORN NECK ROAD" (canonical from VA)
    ↓
Add "Corn Neck Rd." as CANDIDATE to that existing StreetName
(phonebook context provides verification)
    ↓
Save updated database to Google Drive
```

### Match Categories

1. **Exact match found**: Use canonical StreetName (no action needed)
2. **Similar match found**: Add extracted string as new **candidate** to the EXISTING StreetName
3. **No match found**: Add as "unresolved" entry for human review

### Why Phonebook Entries Become Candidates (Not Synonyms)

Phonebook variations have **circumstantial verification**:
- The phonebook is a trusted source (real addresses used by real residents)
- If a variation appears in the phonebook, someone actually used that spelling for mail delivery
- This contextual evidence promotes the variation directly to candidate status

Synonyms are for **similarity-based captures** that need verification. Phonebook entries already have verification through their source.

---

## SECTION 4: IMPLEMENTATION TASKS

### Task List (Preliminary)

| # | Task | Status |
|---|------|--------|
| 1 | Analyze current phonebookParser.js structure | PENDING |
| 2 | Modify phonebook parsing to look up StreetName objects | PENDING |
| 3 | Collect new variations as candidates | PENDING |
| 4 | Handle unrecognized phonebook streets as "unresolved" entries | PENDING |
| 5 | Create mechanism to review and resolve unrecognized streets | PENDING |
| 6 | Save updated database back to Google Drive | PENDING |
| 7 | Testing and validation | PENDING |

### Deferred: VA Post-Process Button

**Note**: Originally Phase 8 of the StreetName architecture, now deferred.

**Purpose**: After a VA download completes, update the StreetName Alias Database to reflect any changes in VA's street data.

**Why deferred**: The core alias architecture can be developed using current VA data. The post-process button is only needed when VA data is re-downloaded (infrequent).

---

## SECTION 5: HANDLING UNRECOGNIZED STREETS

When a phonebook street doesn't match any VA street, it could be:
- A variation/misspelling of an existing street (most common)
- A data entry error in the phonebook
- A real street that VA doesn't have (rare, but possible if VA data is incomplete)

### Resolution Options

1. **Assign to existing street**: Add as candidate to a specific StreetName
2. **Mark as error**: Data entry mistake, do not add
3. **Flag for investigation**: Potential missing VA street

### Storage for Unresolved Streets

TBD - Options include:
- Separate Google Drive file for unresolved entries
- Section within the StreetName database file
- Browser UI for review and resolution

---

## SECTION 6: OPEN QUESTIONS

Questions to resolve during planning:

1. **Phonebook data source**: Where is the phonebook data stored? What format?
2. **Processing trigger**: When should phonebook processing run?
3. **Similarity threshold**: What threshold determines "similar match" vs "no match"?
4. **UI requirements**: Does the user need a browser interface for reviewing unresolved streets?
5. **Batch vs incremental**: Process entire phonebook at once or incrementally?

---

## SECTION 7: INDIVIDUALNAME INSTANTIATION STUDY

### Purpose
Before implementing IndividualName database lookups during entity creation, we need to understand where IndividualName objects are created and how they're constructed.

### IndividualName Class Structure

The `IndividualName` class has **redundant storage**:
- `primaryAlias.term` - complete name string (e.g., "JOHN MIDDLE SMITH")
- `firstName`, `lastName`, `otherNames`, `title`, `suffix` - parsed components

**Constructor signature:**
```javascript
constructor(primaryAlias, title = "", firstName = "", otherNames = "", lastName = "", suffix = "")
```

**Key finding:** The constructor does NOT parse `primaryAlias.term` into components. Consistency depends entirely on the caller providing matching values.

### Entity Creation Instantiation Points

#### VisionAppraisal (visionAppraisalNameParser.js) - 20 instantiation points

| Line | Case | Arguments Pattern | Notes |
|------|------|-------------------|-------|
| 51 | Case 1 | `(primaryAlias, "", firstName, "", lastName, "")` | 2-word: LAST, FIRST |
| 85 | Case 3 | `(primaryAlias, "", firstName, "", lastName, "")` | 2-word: FIRST LAST |
| 123 | Case 5 | `(primaryAlias, "", firstName, otherName, lastName, "")` | 3-word with middle |
| 160 | Case 8 | `(primaryAlias, "", firstName, otherName, lastName, "")` | 3-word variant |
| 230 | Household | `(primaryAlias, '', firstName1, otherNames1, sharedLastName, '')` | Ampersand pattern (1st) |
| 245 | Household | `(primaryAlias, '', firstName2, otherNames2, sharedLastName, '')` | Ampersand pattern (2nd) |
| 292 | Household | `(primaryAlias, '', firstName1, otherNames1, sharedLastName, '')` | Another ampersand (1st) |
| 324 | Household | `(primaryAlias, '', firstName2, otherNames2, lastName2, '')` | Another ampersand (2nd) |
| 338 | Edge case | `(primaryAlias, '', firstName, otherNames, '', '')` | No lastName parsed |
| 408 | Case 10 | `(primaryAlias, "", firstName, middleName, lastName, "")` | 3-word standard |
| 471 | Case 15a | `(primaryAlias, "", firstName1, "", sharedLastName, "")` | Shared lastName (1st) |
| 476 | Case 15a | `(primaryAlias, "", firstName2, "", sharedLastName, "")` | Shared lastName (2nd) |
| 511 | Case 9 | `(primaryAlias, "", firstName, middleName, lastName, "")` | 3-word standard |
| 535 | Case 18 | `(primaryAlias, "", firstName, otherNames, lastName, "")` | 4-word pattern |
| 566 | Household | `(primaryAlias, "", firstName1, "", sharedLastName, "")` | Household (1st) |
| 573 | Household | `(primaryAlias, "", firstName2, "", sharedLastName, "")` | Household (2nd) |
| 747 | Case 2 | `(primaryAlias, "", firstName, "", lastName, "")` | Trailing comma |
| 790 | Case 6 | `(primaryAlias, "", firstName, "", lastName, "")` | Middle comma |
| 828 | Comma case | `(primaryAlias, "", firstName, "", lastName, "")` | General comma |
| **912** | **Case 33** | `(primaryAlias, "", "", "", ownerName, "")` | **CATCH-ALL: entire name in lastName!** |

#### Bloomerang (bloomerang.js) - 1 instantiation point

| Line | Arguments Pattern | Notes |
|------|-------------------|-------|
| 1226 | `(individualNameTerm, title, firstName, middleName, lastName, suffix)` | Full CSV fields |

#### Other (non-entity-creation)

| File | Line | Purpose |
|------|------|---------|
| aliasClasses.js | 1299 | Deserialization (restores saved data) |
| individualNameDatabaseBuilder.js | 365, 565 | Building IndividualNameDatabase (post-EntityGroup) |
| utils.js | 2381 | Test code |

### Key Findings

1. **ALL production instantiations pass BOTH primaryAlias AND component strings**
   - No instantiation uses only primaryAlias with empty components (except Case 33)
   - Consistency is maintained by CONSTRUCTION

2. **Consistency mechanism**: The caller builds `primaryAlias.term` from the same parsed data used for components
   ```javascript
   const fullName = `${firstName} ${lastName}`;
   new IndividualName(
       new AttributedTerm(fullName, ...),  // Built from components
       "", firstName, "", lastName, ""      // Same data
   );
   ```

3. **Edge case - Case 33 (line 912)**: Catch-all puts entire name string in `lastName` field
   - `firstName` = ""
   - `lastName` = entire ownerName string
   - This is intentional for unparseable names

4. **No automatic enforcement**: The class trusts callers to provide consistent values

### Implications for IndividualName Database Lookup

To check if a name exists in the IndividualNameDatabase during entity creation:

1. **Lookup point**: Before calling `new IndividualName(...)` in each location above
2. **What to compare**: The `primaryAlias.term` (complete name string)
3. **Comparison method**: Need to modify `IndividualName.compareTo()` to return four-score object like `StreetName.compareTo()`
4. **Match criteria**: Score === 1.0 in primary, homonym, or candidate category

### Required Changes

1. **Modify IndividualName.compareTo()**: Return `{ primary, homonym, synonym, candidate }` scores instead of weighted component comparison
2. **Update AliasedTermDatabase.lookup()**: Already handles four-score objects correctly
3. **Add lookup calls**: Insert lookup before each `new IndividualName()` call listed above

---

## SECTION 7B: INDIVIDUALNAME.COMPARETO() USAGE STUDY

### Purpose
Before modifying `IndividualName.compareTo()` to return a four-score object, we must identify ALL places where it's called and understand what return type they expect.

### Current Behavior
`IndividualName` does NOT override `compareTo()`. It inherits from `Aliased.compareTo()` which returns a **single numeric score (0-1)** via `genericObjectCompareTo()`.

`StreetName` DOES override `compareTo()` and returns a **four-score object**: `{ primary, homonym, synonym, candidate }`.

### Definite IndividualName.compareTo() Calls

| File | Line | Code | Expects | Notes |
|------|------|------|---------|-------|
| individualNameBrowser.js | 1365 | `individualNameBrowser.selectedIndividualName.compareTo(testString)` | numeric | UI test tool |
| individualNameDatabaseBuilder.js | 386 | `name1.compareTo(name2)` | numeric | In `compareNames()` for clustering |
| individualIdentificationResearch.js | 429 | `name1.compareTo(name2)` | numeric | In `compareNames()` diagnostic |

### Polymorphic Calls - VERIFIED Analysis

**Verification method**: Traced call chains to determine what object types actually flow through each location.

| File | Line | Code | Involves IndividualName? | Currently Handles | Notes |
|------|------|------|-------------------------|-------------------|-------|
| aliasedTermDatabase.js | 310 | `obj.compareTo(term)` | **YES** (in IndividualNameDatabase) | **BOTH** (number or object) | Database lookup - already handles four-score |
| aliasClasses.js | 586 | `aliasedObjects[i].compareTo(aliasedObjects[j])` | **YES** (via entityGroup consensus) | numeric only | In `Aliased.createConsensus()`, called from entityGroup.js:248 for names |
| aliasClasses.js | 684 | `this.compareTo(otherObject)` | **NO** | numeric only | In `mergeAlternatives()` - **NEVER CALLED** in production code |
| entityGroup.js | 280 | `values[i].compareTo(values[j])` | **YES** (fallback path) | numeric only | In `_selectBestPrimary()`, fallback for `_createAliasedConsensus()` when `Aliased.createConsensus` unavailable |
| entityGroup.js | 637 | `individual.name.compareTo(existing.name)` | **YES** | numeric only | In `_deduplicateIndividuals()` - compares IndividualName objects directly |
| universalEntityMatcher.js | 142 | `individual.name.compareTo(entity.name)` | **YES** (when both are Individual) | **BOTH** | Only called when `name1Type === name2Type`; uses `.overallSimilarity` fallback |
| universalEntityMatcher.js | 323 | `name1.compareTo(name2)` | **YES** (when both are Individual) | **BOTH** | Only called when `name1Type === name2Type`; uses `.overallSimilarity` fallback |

### Verification Summary

**6 of 7 locations DO involve IndividualName:**
1. `aliasedTermDatabase.js:310` - Used by IndividualNameDatabase.lookup()
2. `aliasClasses.js:586` - Used when building EntityGroup consensus names
3. `entityGroup.js:280` - Fallback consensus path (rarely used)
4. `entityGroup.js:637` - Deduplicating individuals in consensus building
5. `universalEntityMatcher.js:142` - Comparing Individual entity names
6. `universalEntityMatcher.js:323` - Comparing entity names in general matcher

**1 location does NOT involve IndividualName:**
- `aliasClasses.js:684` - In `mergeAlternatives()` method which is **defined but never called**

### Entity-Level compareTo (NOT IndividualName directly)

These compare Entity objects (which internally compare name, contactInfo, etc.):

| File | Line | Code | Notes |
|------|------|------|-------|
| universalEntityMatcher.js | 72 | `individual1.compareTo(individual2, true)` | Individual entity comparison |
| universalEntityMatcher.js | 99 | `individual.compareTo(householdIndividual, true)` | Individual vs household member |
| universalEntityMatcher.js | 243 | `ind1.compareTo(ind2, true)` | Individual comparison |
| utils.js | 1590 | `thisEntity.name.compareTo(otherEntity.name, true)` | Entity weighted comparison |
| utils.js | 2076 | `value1.compareTo(value2)` | `genericObjectCompareTo()` - numeric only |
| utils.js | 2848 | `entity1.name.compareTo(entity2.name, true)` | Debug/diagnostic |
| entityComparison.js | 71 | `entity1.compareTo(entity2, true)` | Diagnostic tool |
| unifiedEntityBrowser.js | 1754 | `entity.compareTo(targetWrapper.entity, true)` | Browser comparison |
| unifiedEntityBrowser.js | 2735 | `baseEntity.compareTo(targetEntity, true)` | Browser comparison |

### Other Class compareTo Calls (NOT IndividualName)

**StreetName.compareTo()** - Already returns four-score object:
| File | Line | Code |
|------|------|------|
| aliasClasses.js | 1160 | `this.compareTo(streetString)` in `StreetName.matches()` |
| aliasClasses.js | 1935 | `street.compareTo(streetToLookup)` in Address processing |
| utils.js | 1077 | `addr1.biStreetName.compareTo(addr2.biStreetName)` |

**Address.compareTo()** - Returns numeric:
| File | Line | Code |
|------|------|------|
| utils.js | 1226 | `addr.compareTo(contactInfo.primaryAddress)` |
| utils.js | 1238 | `addr.compareTo(secondaries[i])` |
| utils.js | 1384 | `thisAddr.compareTo(otherAddr)` |
| utils.js | 1490 | `matchedBaseAddress.compareTo(matchedTargetAddress, true)` |
| utils.js | 2657 | `addr1.compareTo(addr2)` |
| entityGroup.js | 381, 412 | Address similarity checks |
| fireNumberCollisionHandler.js | 301, 551 | Address comparisons |

**ContactInfo.compareTo()** - Returns numeric:
| File | Line | Code |
|------|------|------|
| universalEntityMatcher.js | 177 | `individual.contactInfo.compareTo(entity.contactInfo, true)` |
| utils.js | 1630 | `thisEntity.contactInfo.compareTo(otherEntity.contactInfo, true)` |
| utils.js | 2901 | `entity1.contactInfo.compareTo(entity2.contactInfo, true)` |

### Impact Analysis (VERIFIED)

If we change `IndividualName.compareTo()` to return `{ primary, homonym, synonym, candidate }`:

**Will work without changes (already handle both types):**
- `aliasedTermDatabase.js:310` - has explicit type checking for number vs object
- `universalEntityMatcher.js:142, 323` - uses `?.overallSimilarity` fallback

**NOT AFFECTED (never called or doesn't involve IndividualName):**
- `aliasClasses.js:684` - in `mergeAlternatives()` which is **never called**

**WILL BREAK (expect numeric only):**
1. `individualNameBrowser.js:1365` - displays score directly
2. `individualNameDatabaseBuilder.js:386` - uses score for clustering
3. `individualIdentificationResearch.js:429` - uses score for comparison
4. `aliasClasses.js:586` - `Aliased.createConsensus()` sums scores (line 587-590 checks `typeof score === 'number'`)
5. `entityGroup.js:280` - `_selectBestPrimary()` sums scores (line 281 checks `typeof score === 'number'`)
6. `entityGroup.js:637` - `_deduplicateIndividuals()` compares score to threshold
7. `utils.js:2076` - `genericObjectCompareTo()` propagates non-zero (used in Entity.compareTo chain)

### Recommended Approach

**Option A: Add new method, keep existing compareTo**
- Add `IndividualName.compareToAliases(term)` returning four-score object
- Keep existing `compareTo()` for entity-level weighted comparison
- Database lookup calls the new method

**Option B: Modify compareTo to return both**
- Return `{ primary, homonym, synonym, candidate, overallSimilarity }`
- Existing code can use `.overallSimilarity` or treat as number via `typeof` check
- Update critical breakage points

**Option C: Full refactor**
- Change all `compareTo()` calls to handle four-score object
- Most invasive but most consistent

**Option D: Rename and Rebuild (SELECTED)**
- Rename current inherited behavior to `numericCompareTo()`
- Update all existing call sites to use `numericCompareTo()`
- New `compareTo()` returns four-score object `{ primary, homonym, synonym, candidate }`
- Achieves consistency with StreetName.compareTo()

---

## SECTION 7C: OPTION D IMPLEMENTATION PLAN

### Overview

**Approach**: Rename and Rebuild
1. Add `numericCompareTo()` to IndividualName - replicates current inherited weighted comparison
2. Add `compareTo()` override that throws an error (diagnostic phase)
3. Update 6 identified call sites to use `numericCompareTo()`
4. Test to verify all call sites found
5. Replace error-throwing `compareTo()` with real four-score implementation

**Why error-throwing diagnostic phase**: This ensures we detect ANY call sites we may have missed. If an undiscovered call site exists, it will throw an error rather than silently produce wrong results.

### Phase 1: Add Methods to IndividualName Class

**File**: `scripts/objectStructure/aliasClasses.js`
**Location**: Inside IndividualName class, after `initializeWeightedComparison()` method (after line 1330)

**Step 1.1**: Add `numericCompareTo()` method

This method replicates the current inherited behavior from `Aliased.compareTo()` which uses `genericObjectCompareTo()`:

```javascript
/**
 * Numeric comparison for IndividualName (weighted component comparison)
 * Returns a single weighted score (0-1) based on name component similarity.
 *
 * This method preserves the original compareTo() behavior for call sites
 * that need numeric scores (entity matching, consensus building, etc.)
 *
 * @param {IndividualName|string} other - IndividualName object or name string to compare
 * @param {boolean} [returnDetails=false] - If true, return detailed breakdown
 * @returns {number} Weighted similarity score (0-1)
 */
numericCompareTo(other, returnDetails = false) {
    // Delegate to the generic weighted comparison inherited from Aliased
    // This uses comparisonWeights (lastName: 0.5, firstName: 0.4, otherNames: 0.1)
    return genericObjectCompareTo(this, other, returnDetails);
}
```

**Step 1.2**: Add diagnostic `compareTo()` override

```javascript
/**
 * DIAGNOSTIC PHASE: compareTo override that throws error
 *
 * This temporary implementation helps identify any call sites we missed.
 * Once all call sites are confirmed to use numericCompareTo(), this will
 * be replaced with the four-score alias comparison.
 *
 * @throws {Error} Always throws to identify call sites
 */
compareTo(other, returnDetails = false) {
    throw new Error(
        `IndividualName.compareTo() called but should use numericCompareTo(). ` +
        `This: "${this.primaryAlias?.term}", Other: "${other?.primaryAlias?.term || other}". ` +
        `Stack trace will show the call site that needs updating.`
    );
}
```

### Phase 2: Update Call Sites to Use numericCompareTo()

**CRITICAL**: Do NOT use grep to find these locations. Use the documented line numbers from Section 7B. If the exact line has shifted, search within ±20 lines of the expected location for the documented code pattern.

#### Call Site 2.1: individualNameBrowser.js

**Expected Location**: Line 1365
**Code Pattern**: `individualNameBrowser.selectedIndividualName.compareTo(testString)`
**Context**: UI test tool for comparing names
**Change**: Replace `.compareTo(` with `.numericCompareTo(`

#### Call Site 2.2: individualNameDatabaseBuilder.js

**Expected Location**: Line 386
**Code Pattern**: `name1.compareTo(name2)`
**Context**: Inside `compareNames()` function used for clustering
**Change**: Replace `.compareTo(` with `.numericCompareTo(`

#### Call Site 2.3: individualIdentificationResearch.js

**Expected Location**: Line 429
**Code Pattern**: `name1.compareTo(name2)`
**Context**: Inside `compareNames()` diagnostic function
**Change**: Replace `.compareTo(` with `.numericCompareTo(`

#### Call Site 2.4: aliasClasses.js - Aliased.createConsensus()

**Expected Location**: Line 586
**Code Pattern**: `aliasedObjects[i].compareTo(aliasedObjects[j])`
**Context**: Static method `Aliased.createConsensus()` for building consensus from multiple aliased objects
**Special Consideration**: This is a polymorphic call that handles multiple Aliased subclasses
**Change**: Replace `.compareTo(` with `.numericCompareTo(`

**NOTE**: Since this is in the parent class and used by multiple subclasses, verify that StreetName also has `numericCompareTo()` or that this call only affects IndividualName objects.

#### Call Site 2.5: entityGroup.js - _selectBestPrimary()

**Expected Location**: Line 280
**Code Pattern**: `values[i].compareTo(values[j])`
**Context**: Fallback consensus path in `_selectBestPrimary()` method
**Change**: Replace `.compareTo(` with `.numericCompareTo(`

#### Call Site 2.6: entityGroup.js - _deduplicateIndividuals()

**Expected Location**: Line 637
**Code Pattern**: `individual.name.compareTo(existing.name)`
**Context**: Deduplicating individuals during consensus building
**Change**: Replace `.compareTo(` with `.numericCompareTo(`

### Phase 3: Verification Testing

After making all changes, perform the following tests to verify no call sites were missed:

**Test 3.1: Load Application**
1. Start server: `cd BIRAVA2025 && node servers/server.js`
2. Open browser to http://127.0.0.1:1337/
3. Open browser console (F12)
4. Watch for any errors mentioning "IndividualName.compareTo() called"

**Test 3.2: Load IndividualNameDatabase**
1. Click button to load IndividualNameDatabase
2. Verify no compareTo errors thrown

**Test 3.3: Entity Group Building**
1. Load unified entity database
2. Build entity groups (this exercises consensus building and deduplication)
3. Verify no compareTo errors thrown

**Test 3.4: Individual Name Browser**
1. Open Individual Name Browser
2. Select a name
3. Use the comparison test tool
4. Verify no compareTo errors (should use numericCompareTo now)

**Test 3.5: Entity Comparison**
1. Use unified entity browser
2. Compare two Individual entities
3. Verify no compareTo errors

### Phase 4: Implement Real compareTo()

**Only proceed after all Phase 3 tests pass with no errors.**

Replace the error-throwing `compareTo()` with the real four-score implementation:

```javascript
/**
 * Alias-based comparison for IndividualName
 * Returns four-score object like StreetName.compareTo() for consistency.
 *
 * @param {IndividualName|string} other - IndividualName object or name string to compare
 * @returns {Object} Four-score object { primary, homonym, synonym, candidate }
 */
compareTo(other) {
    // Extract comparison term
    let termToCompare;
    if (typeof other === 'string') {
        termToCompare = other.trim().toUpperCase();
    } else if (other?.primaryAlias?.term) {
        termToCompare = other.primaryAlias.term.trim().toUpperCase();
    } else {
        return { primary: 0, homonym: 0, synonym: 0, candidate: 0 };
    }

    const result = { primary: 0, homonym: 0, synonym: 0, candidate: 0 };

    // Check primary alias
    if (this.primaryAlias?.term) {
        const thisTerm = this.primaryAlias.term.trim().toUpperCase();
        result.primary = thisTerm === termToCompare ? 1.0 :
                         stringSimilarity(thisTerm, termToCompare);
    }

    // Check alternatives if available
    if (this.alternatives) {
        // Check homonyms
        if (this.alternatives.homonyms) {
            for (const h of this.alternatives.homonyms) {
                const hTerm = (h.term || h).toString().trim().toUpperCase();
                const sim = hTerm === termToCompare ? 1.0 : stringSimilarity(hTerm, termToCompare);
                result.homonym = Math.max(result.homonym, sim);
            }
        }

        // Check synonyms
        if (this.alternatives.synonyms) {
            for (const s of this.alternatives.synonyms) {
                const sTerm = (s.term || s).toString().trim().toUpperCase();
                const sim = sTerm === termToCompare ? 1.0 : stringSimilarity(sTerm, termToCompare);
                result.synonym = Math.max(result.synonym, sim);
            }
        }

        // Check candidates
        if (this.alternatives.candidates) {
            for (const c of this.alternatives.candidates) {
                const cTerm = (c.term || c).toString().trim().toUpperCase();
                const sim = cTerm === termToCompare ? 1.0 : stringSimilarity(cTerm, termToCompare);
                result.candidate = Math.max(result.candidate, sim);
            }
        }
    }

    return result;
}
```

### Phase 5: Final Verification

After implementing the real `compareTo()`:

1. Re-run all Phase 3 tests
2. Verify `IndividualNameDatabase.lookup()` returns correct results
3. Test that entity matching still works correctly (via entity group building)
4. Verify the comparison test tool in IndividualNameBrowser displays meaningful results

### Execution Checklist

| Step | Description | File | Line | Code Pattern | Status |
|------|-------------|------|------|--------------|--------|
| 1.1 | Add numericCompareTo() to Aliased base class | aliasClasses.js | ~782 | After `compareTo()`, before `}` closing Aliased | PENDING |
| 1.2 | Add error-throwing compareTo() to IndividualName | aliasClasses.js | ~1330 | After `initializeWeightedComparison()` | PENDING |
| 2.1 | Update individualNameBrowser.js | individualNameBrowser.js | ~1365 | `.compareTo(testString)` | PENDING |
| 2.2 | Update individualNameDatabaseBuilder.js | individualNameDatabaseBuilder.js | ~386 | `name1.compareTo(name2)` | PENDING |
| 2.3 | Update individualIdentificationResearch.js | individualIdentificationResearch.js | ~429 | `name1.compareTo(name2)` | PENDING |
| 2.4 | Update Aliased.createConsensus() | aliasClasses.js | ~586 | `aliasedObjects[i].compareTo(aliasedObjects[j])` | PENDING |
| 2.5 | Update _selectBestPrimary() | entityGroup.js | ~280 | `values[i].compareTo(values[j])` | PENDING |
| 2.6 | Update _deduplicateIndividuals() | entityGroup.js | ~637 | `individual.name.compareTo(existing.name)` | PENDING |
| 3.x | Verification testing | - | - | See Phase 3 test list | PENDING |
| 4 | Implement real compareTo() | aliasClasses.js | ~1330 | Replace error-throwing with four-score | PENDING |
| 5 | Final verification | - | - | Re-run all Phase 3 tests | PENDING |

### Key File Locations (Verified January 30, 2026)

| File | Class/Method | Line |
|------|--------------|------|
| aliasClasses.js | Aliased.compareTo() | 773-782 |
| aliasClasses.js | Aliased class closing brace | 783 |
| aliasClasses.js | Aliased.createConsensus() | 557-649 |
| aliasClasses.js | StreetName.compareTo() | 1078-1150 |
| aliasClasses.js | IndividualName.initializeWeightedComparison() | 1322-1330 |
| aliasClasses.js | IndividualName class closing brace | 1331 |

### Special Consideration: Aliased.createConsensus()

Call site 2.4 is in the parent class `Aliased` (line ~586) and is used polymorphically for all Aliased subclasses.

**Finding**: `numericCompareTo()` does not exist anywhere in the codebase yet.

**Solution**: Add `numericCompareTo()` to the **base Aliased class** so all subclasses inherit it:

```javascript
// In Aliased base class
numericCompareTo(other, returnDetails = false) {
    return genericObjectCompareTo(this, other, returnDetails);
}
```

This way:
- StreetName inherits `numericCompareTo()` and uses its comparisonWeights
- IndividualName inherits `numericCompareTo()` and uses its specific weights (lastName: 0.5, firstName: 0.4, otherNames: 0.1)
- All other Aliased subclasses get the method automatically

**Updated Step 1.1**: Add `numericCompareTo()` to **Aliased base class** (not IndividualName)

### Revised Phase 1: Add Methods

**Step 1.1**: Add `numericCompareTo()` to Aliased base class
- **File**: `scripts/objectStructure/aliasClasses.js`
- **Location**: Inside Aliased class, after the existing `compareTo()` method (around line 495)

```javascript
/**
 * Numeric comparison returning a single weighted score (0-1).
 * Uses genericObjectCompareTo with this object's comparisonWeights.
 *
 * This method provides consistent numeric comparison across all Aliased subclasses,
 * while allowing subclasses to override compareTo() for alias-based comparison.
 *
 * @param {Aliased|string} other - Object or string to compare
 * @param {boolean} [returnDetails=false] - If true, return detailed breakdown
 * @returns {number} Weighted similarity score (0-1)
 */
numericCompareTo(other, returnDetails = false) {
    return genericObjectCompareTo(this, other, returnDetails);
}
```

**Step 1.2**: Add error-throwing `compareTo()` override to IndividualName class
- **File**: `scripts/objectStructure/aliasClasses.js`
- **Location**: Inside IndividualName class, after `initializeWeightedComparison()` (after line 1330)

```javascript
/**
 * DIAGNOSTIC PHASE: compareTo override that throws error
 *
 * This temporary implementation helps identify any call sites we missed.
 * Once all call sites are confirmed to use numericCompareTo(), this will
 * be replaced with the four-score alias comparison.
 *
 * @throws {Error} Always throws to identify call sites
 */
compareTo(other, returnDetails = false) {
    throw new Error(
        `IndividualName.compareTo() called but should use numericCompareTo(). ` +
        `This: "${this.primaryAlias?.term}", Other: "${other?.primaryAlias?.term || other}". ` +
        `Stack trace will show the call site that needs updating.`
    );
}
```

---

## SECTION 8: SESSION NOTES

### Session 81 (January 30, 2026)

**Accomplished:**
1. Modified `syncDevToOriginal()` to validate DEV/INDEX key consistency and add fileIds
2. Studied IndividualName class structure - discovered redundant storage (primaryAlias vs components)
3. Catalogued all 22 IndividualName instantiation points in entity creation code
4. Identified that consistency is maintained by construction, not enforcement

**Next steps:**
- Modify `IndividualName.compareTo()` to return four-score object
- Implement lookup calls at entity creation points

---

## DOCUMENT END

**Document Version**: 1.0
**Last Updated**: January 30, 2026
