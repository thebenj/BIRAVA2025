# Session History - January 2026

## Purpose
This document contains detailed session-by-session work logs offloaded from CLAUDE.md to maintain conciseness. CLAUDE.md references this document for historical context when needed.

## Reading Instructions
- Sessions are in reverse chronological order (most recent first)
- Each session includes: date, status, what was done, files modified
- For completed/verified features, this is the authoritative record

---

## Session 56 - Collision Integration User Verification (January 25, 2026)

### Status: USER_VERIFIED_WORKING

**Session Goal:** User verification of fire number collision integration (Step 6 of 6-step plan).

### Test Performed

User compared current EntityGroup database against baseline (1976 groups from Jan 9, 2026) using `compareGroupings()` function that checks whether entities that were together/separate in baseline are still together/separate now.

### Results

| Metric | Before Collision Fix | After Collision Fix |
|--------|---------------------|---------------------|
| New Merges | 798 pairs | 725 pairs |
| New Splits | N/A | 168 pairs |
| Fire# 72 collision merges | Dominant (72B, 72C, 72E, 72F + bloomerang:72) | **ELIMINATED** |

**Key Finding:** The fire number 72 collision cases that motivated this entire feature are now correctly excluded:
- `72B + bloomerang:1285:FireNumber:72:na` - NO LONGER MERGED
- `72C + bloomerang:1121:FireNumber:72:head` - NO LONGER MERGED
- `72E + bloomerang:1725:FireNumber:72:head` - NO LONGER MERGED
- etc.

### Additional Investigation

User asked about override rules audit system to identify obsolete FORCE_EXCLUDE rules:
- Found `matchOverrideManager.getUnusedRules()` exists
- Found `markExclusionApplied()` and `markForceMatchApplied()` methods exist
- **Problem identified:** These methods are NEVER CALLED from entityGroupBuilder.js
- `appliedCount` always remains 0, so tracking doesn't work
- Fix would require adding calls in entityGroupBuilder.js + `resetAppliedCounts()` at build start

### Diagnostic Code Location

Still present in:
- `entityGroup.js` (~lines 787, 817) - createGroup, addMemberToGroup diagnostics
- `entityGroupBuilder.js` (~line 1099) - build diagnostics

### Next Steps

1. Remove diagnostic code from entityGroup.js and entityGroupBuilder.js
2. Update override rules audit system (optional - wire up tracking calls)
3. Review FORCE_EXCLUDE rules for obsolete entries

---

## Session 52 - Phase 5 Regression Diagnosis Attempt (January 23, 2026)

### Status: IN_PROGRESS - Diagnostic logging needed

**Session Goal:** Understand why Phase 5 changes caused 124 false positive merges.

### Key Investigation

Investigated the false merge pattern where VA entities (e.g., FireNumber:72B at "72 WEST SIDE ROAD") were merging with Bloomerang entities (e.g., FireNumber:72 at "72 Shore" or "72 Side").

### Findings

1. **Unmatched Streets**: "Shore", "Side" and similar truncated street names don't match the BI street database (score < 0.80), so `biStreetName = null` for these addresses.

2. **Original Code Found**: In `reference_phase5_streetNameComparison.md` line 109, the pre-Phase 5 code was:
   ```javascript
   const streetNameSim = getComponentSimilarity(addr1.streetName, addr2.streetName);
   ```

3. **Fix Attempted**: Modified `compareBlockIslandAddresses()` fallback (utils.js lines 1064-1072) to combine `streetName + streetType` before comparing. Result: Still 1,851 groups - NO IMPROVEMENT.

4. **Implication**: The code path is likely NOT going through `compareBlockIslandAddresses()` at all. Suspected: `areSameLocationEntities()` returns TRUE for VA:72B vs Bloomerang:72 (same base fire number), which bypasses primary address comparison.

5. **User Caution**: Do not assume `areSameLocationEntities()` is the problem without diagnostic verification. It worked before Phase 5 changes.

### Code Change Made

**File**: `scripts/utils.js` lines 1060-1073
- Fallback now builds combined street string (streetName + streetType) before comparing
- Method tagged as `stringFallback_fullStreet`
- This change is in place but did not resolve the regression

### Next Session Action

Add diagnostic logging to trace:
1. What code path executes for problematic entity pairs
2. Whether `areSameLocationEntities()` returns TRUE for VA-to-Bloomerang comparisons
3. What comparison scores are being calculated

### Files Modified

- `scripts/utils.js` - Modified `compareBlockIslandAddresses()` fallback logic

---

## Session 51 - Phase 5 Regression Detected (January 23, 2026)

### Status: REGRESSION_DETECTED

**Session Goal:** Test Phase 5 comparison changes with rebuilt entities.

### What Was Found

EntityGroup comparison after Phase 5:
- **Current**: 1,851 groups
- **Baseline**: 1,975 groups
- **Delta**: -124 groups (124 more merges than expected)

141 "new merges" found - many are FALSE POSITIVES.

### False Merge Pattern

VA entities with suffixed fire numbers (72B, 72C, 72E) merging with Bloomerang entities with base fire number (72) on completely different streets:

- VA:72B "72 WEST SIDE ROAD" + Bloomerang:72 "28 Ward, RI"
- VA:72C "72 WEST SIDE ROAD" + Bloomerang:72 "72 Shore"
- VA:72E "72 WEST SIDE ROAD" + Bloomerang:72 "72 Side"

### Verification Performed

- Phase 5 code confirmed in place (all components via code review)
- biStreetName population verified: 2,549 BI addresses have it, 226 without

### Files Modified

- `servers/server.js` - Added 'json' to accExt for fetch support

---

## Session 50 - Street Name Browser Tool Created (January 23, 2026)

### Status: USER_VERIFIED_WORKING

**Session Goal:** Create a browser-based tool for viewing, searching, testing, and managing StreetName objects.

### What Was Built

**Street Name Browser** - A new tool for managing the StreetName alias database through a UI.

### Features Implemented

1. **Load/Save**: Load from Google Drive, save changes back with metadata
2. **Search**: Filter streets by primary name or any alias
3. **Two-Panel UI**:
   - Left: Street list with alias count badges (H=homonyms, S=synonyms, C=candidates)
   - Right: Details panel, compareTo() testing, add alias panel
4. **compareTo() Testing**: Enter string, see all four scores (primary, homonym, synonym, candidate), auto-updates on typing (300ms debounce)
5. **Add Aliases**: Add strings to homonyms, synonyms, or candidates categories
6. **Create Streets**: Add entirely new StreetName objects
7. **Export**: Download database as JSON file
8. **Stats**: View database statistics

### Phase 8 Compatibility Safeguards

Manual edits must be preserved when Phase 8 (VA Post-Process) is implemented:

1. All manual additions use source `STREET_NAME_BROWSER_MANUAL`
2. Saved JSON includes `__manualEdits` metadata section listing all manual changes
3. Phase 8 design requirement: read and preserve `__manualEdits` content

### Files Created/Modified

- **NEW**: `scripts/streetNameBrowser.js` (~650 lines)
- **MODIFIED**: `index.html`
  - Added CSS styles for streetname-specific classes
  - Added HTML section after EntityGroup Browser
  - Added script tag for streetNameBrowser.js

### Pattern for Future Tools

This browser establishes the pattern for managing any `Aliased` class:
- Load objects, display with alias badges
- Test compareTo() method
- Add aliases with manual edit tracking
- Save with preservation metadata

### Next Steps

1. User test the Street Name Browser tool
2. Continue with Bloomerang tracker testing
3. Verify Phase 5 baseline results

---

## Session 49 - Street Type Duplication Fix Verified (January 23, 2026)

### Status: VA_VERIFIED, BLOOMERANG_PENDING

**Session Goal:** Fix remaining street type duplications (CENTER ROAD RD, BEACON HILL HL, etc.) in unmatched street list.

### Problem Identified

Session 48 fix was inadequate. It only checked if street ENDS with the type, but parse-address sometimes:
- Returns full word in `street` (e.g., "CENTER ROAD") and abbreviation in `type` (e.g., "RD")
- Embeds the type in the middle of the street (e.g., "CRES.BEACH LOT" with type "BCH")

The simple `endsWith` check failed for cases like:
- "CENTER ROAD" + type "RD" → "CENTER ROAD RD" (ROAD ≠ RD)
- "CRES.BEACH LOT" + type "BCH" → "CRES.BEACH LOT BCH" (BEACH embedded, not at end)

### Solution Implemented

1. **Enhanced type detection logic** in `aliasClasses.js:1868`:
   - Split street on whitespace AND punctuation to get individual words
   - Check if street CONTAINS the type OR its full form (not just ends with)
   - Use `StreetTypeAbbreviationManager.getFullForm()` to map abbreviations

2. **Added 11 new abbreviations** to Google Drive file:
   - HL/HILL, RDG/RIDGE, CTR/CENTER, CV/COVE, ROW/ROW
   - SPG/SPRING, ML/MILL, HVN/HAVEN, BCH/BEACH, NCK/NECK, LAND/LAND

3. **Added batch methods** to `StreetTypeAbbreviationManager`:
   - `addAbbreviationsFromList(list)` - Add multiple abbreviations at once
   - `addAndSaveAbbreviations(list)` - Load, add, save workflow

4. **Added automatic loading** in `loadBlockIslandStreetsFromDrive()`:
   - Loads `StreetTypeAbbreviationManager` before loading street database
   - Ensures abbreviations are available during entity creation

5. **Removed diagnostic code** from aliasClasses.js and addressProcessing.js

### Files Modified

- `scripts/objectStructure/aliasClasses.js:1868` - Contains-based type check
- `scripts/streetTypeAbbreviations.js` - Batch methods added
- `scripts/address/addressProcessing.js:911` - Auto-load abbreviations
- `reference_streetNameAliasArchitecture.md` - Documentation updated

### Results

VA unmatched streets reduced from 44 (with duplications) to 5 legitimate unmatched:
- JENNIFER COURT, LEWIS FARM ROAD, MILL POND LANE (not in database)
- OCEAN AVE PLANT (parsing anomaly)
- PO BOX 1151 CHERRY HILL (PO Box address)

### Next Steps

1. Test Bloomerang entity creation with tracker
2. Verify Phase 5 baseline results

---

## Session 48 - VA Tracker Integration + BEACH AVE Bug (January 23, 2026)

### Status: SUPERSEDED_BY_SESSION_49

**Session Goal:** Integrate unmatched street tracker with VA entity creation, fix "BEACH AVE AVE" duplication.

### Tracker Integration

1. **Discovered tracker was in wrong file** - Was in visionAppraisalNameParser.js but VA entity creation happens in processAllVisionAppraisalRecords.js
2. **Added tracker to correct file** - processAllVisionAppraisalRecords.js now initializes and saves tracker
3. **Result:** 44 unmatched streets tracked

### BEACH AVE AVE Bug

**Root cause:** parse-address returns `street: "BEACH AVE"` and `type: "Ave"` - the type is already included in the street name.

**Initial fix:** Check if street ends with type before appending (aliasClasses.js:1868)

**Limitation discovered in Session 49:** This fix was too narrow - only handled exact suffix matches, not:
- Full word vs abbreviation (ROAD vs RD)
- Embedded types (CRES.BEACH)

This fix was enhanced in Session 49.

---

## Session 47 - Unmatched Street Tracker + Phase 5 Testing (January 23, 2026)

### Status: CODED_NOT_TESTED

**Session Goal:** Test Phase 5 fixes, add unmatched street tracking feature, fix biStreetName fallback logic.

### Phase 5 Testing Results

1. **Initial test failed:** `runBaselineCapture()` threw error for MILL POND LANE having no biStreetName
2. **Root cause:** MILL POND is NOT in the StreetName database (it's a mailing address street, not tax address)
3. **Fix applied:** Changed `compareBlockIslandAddresses()` in utils.js to fall back to string comparison when biStreetName is missing, instead of throwing error

After fix, baseline capture completed:
- **1,941 groups** (vs 1,975 expected - 34 fewer, likely from improved matching)
- 4,104 entities assigned
- Process slower due to best-match lookup O(n) slow path

### Unmatched Street Tracker Feature

**Purpose:** Track streets that fail to match in the BI StreetName database, for ongoing database maintenance.

**Google Drive Files:**
- JSON (persistent dataset): `1VopBti05Fkmn6baW2lbvWml6kbzHgp_5`
- CSV (regenerated from JSON): `12TapBBfwNk0_4rvOlaO1LYVW2kXI5YZR`

**Implementation:**

1. **Module:** `window.unmatchedStreetTracker` in addressProcessing.js
   - `initialize()`: Prompts user "Overwrite or Add?", loads existing JSON if Add mode
   - `record()`: Records unmatched street with best match info and scores
   - `save()`: Writes JSON and CSV to Google Drive

2. **Modified lookup():** Records unmatched streets when best score < 0.80 threshold
   - Captures: street name, best match primary alias, best matching alias, all compareTo scores

3. **Entry points:** Initialization and save added to:
   - `processAllVisionAppraisalRecords()` in visionAppraisalNameParser.js
   - `processAllVisionAppraisalRecordsQuiet()` in visionAppraisalNameParser.js
   - `readBloomerangWithEntities()` in bloomerang.js
   - `readBloomerangWithEntitiesQuiet()` in bloomerang.js

4. **Removed from (wrong locations):**
   - `buildNewEntityGroupDatabase()` in entityGroupBrowser.js
   - `runBaselineCapture()` in streetArchitectureBaseline.js

**CSV columns:** unmatchedStreet, bestMatchPrimary, bestMatchAlias, bestScore, primaryScore, homonymScore, synonymScore, candidateScore

### Files Modified
- scripts/address/addressProcessing.js - unmatchedStreetTracker module, modified lookup()
- scripts/utils.js - compareBlockIslandAddresses() fallback to string comparison
- scripts/dataSources/visionAppraisalNameParser.js - tracking init/save in both functions
- scripts/bloomerang.js - tracking init/save in both functions
- scripts/entityGroupBrowser.js - removed tracking (wrong location)
- scripts/diagnostics/streetArchitectureBaseline.js - removed tracking (wrong location)

### Next Session Testing Plan
1. Test VA entity creation - verify unmatched street prompt and file generation
2. Test Bloomerang entity creation - verify unmatched street tracking
3. Verify CSV file contains expected unmatched streets (MILL POND LANE, etc.)

---

## Session 46 - Address Deserialization Fix + Best-Match Street Lookup (January 23, 2026)

### Status: CODED_NOT_TESTED

**Session Goal:** Fix Address deserialization to preserve biStreetName, and improve street lookup from exact-match to best-match.

### Problem Diagnosed

Running `runBaselineCapture()` failed with error:
```
Error: BI address missing biStreetName - this is a bug. addr1.biStreetName: false, addr2.biStreetName: false
```

Investigation revealed TWO issues:
1. **Address.deserialize()** used manual itemization pattern - biStreetName wasn't in the list
2. **blockIslandStreetDatabase.lookup()** used exact-match only - variations like "MILL POND LANE" vs "MILL POND LN" failed

### Serialization/Deserialization Audit

Conducted comprehensive audit of all 32 classes with deserialize() methods:
- **11 classes** use dynamic iteration (safe - new properties auto-restored)
- **4 classes** use manual itemization (RISKY - Address was one of these)
- **17 classes** use constructor-based (safe - fixed property sets)

Serialization is universal (all properties captured automatically). The inconsistency was in deserialization.

### Fix 1: Address.deserialize() - Dynamic Iteration Pattern

**File:** scripts/objectStructure/aliasClasses.js

Converted from manual itemization to dynamic iteration matching Entity.deserialize() pattern:
- Uses `Object.keys(data).forEach()` to iterate all properties
- Type mapping for properties needing `ensureDeserialized()`:
  - AttributedTerm: streetNumber, streetName, city, state, etc.
  - StreetName: biStreetName
  - Aliases: alternatives
- Future-proofed: new properties automatically preserved

### Fix 2: Best-Match Street Lookup

**File:** scripts/address/addressProcessing.js

Changed `blockIslandStreetDatabase.lookup()` from exact-match to two-phase matching:
1. **Fast path:** Exact match against indexed variations (O(1) hash lookup)
2. **Slow path:** If no exact match, iterate all StreetName objects using `compareTo()` similarity

Best-match logic:
- Uses `StreetName.compareTo()` which has Levenshtein similarity + StreetTypeAbbreviationManager
- Takes max score from primary, homonym, candidate (excludes synonym - unverified)
- Returns match if score >= 0.80 threshold

### Cleanup

Removed diagnostic logging from:
- aliasClasses.js (fromProcessedAddress method)
- classSerializationUtils.js (serialize and deserialize diagnostics)

### Files Modified
- scripts/objectStructure/aliasClasses.js - Address.deserialize() rewrite, diagnostic removal
- scripts/utils/classSerializationUtils.js - diagnostic removal
- scripts/address/addressProcessing.js - lookup() best-match implementation

### Next Session Testing Plan
1. Hard refresh (Ctrl+Shift+R)
2. Regenerate entities from CSV (biStreetName should now populate via best-match)
3. Run `runBaselineCapture()` - should complete without biStreetName errors
4. Verify EntityGroup counts match expected (1,975 groups, 4,104 entities)

---

## Session 43 - Phase 5 Step 2 Implementation (January 22, 2026)

### Status: CODED_BLOCKED_ON_ENTITY_REBUILD

**Session Goal:** Implement Step 2 of Phase 5 - update compareBlockIslandAddresses() to use biStreetName for alias-aware matching.

### Documentation Updates (User-Requested Reframing)

User provided new alias category definitions requiring documentation updates across all files:

**New Alias Category Definitions:**
- **Homonyms**: Verified trivial variations (misspellings, case differences) - high similarity ≥0.875
- **Synonyms**: UNVERIFIED staging area - similarity-based matches captured automatically during initialization, may be false positives, pending review
- **Candidates**: VERIFIED alternatives - may have low similarity but verified through context, phonebook evidence, or manual review

**Key Principle:** For comparison, use primary/homonym/candidates (verified). EXCLUDE synonyms (unverified).

**Files Updated:**
- reference_streetNameAliasArchitecture.md - SECTION 5, 6, 9
- reference_phase5_streetNameComparison.md - code examples, decision log
- aliasClasses.js - Aliases and StreetName class comments
- CLAUDE.md - next_action field

### Step 2 Code Implementation

**File:** scripts/utils.js (lines 1035-1062)

**Change:** Replaced simple string comparison with biStreetName-based comparison:
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

### Testing Blocked - Root Cause Analysis

**Problem:** Testing revealed biStreetName is false/undefined on all loaded entities.

**Root Cause:**
- Entity files saved on Google Drive were created BEFORE StreetName database was loaded
- biStreetName is populated during Address.fromProcessedAddress(), which requires window.blockIslandStreetDatabase
- The saved entity files were created when this database wasn't loaded, so biStreetName was never set
- Deserialization correctly restores the null values that were saved

**User Correction:** Rejected suggestions to add property-specific deserialization or post-load enrichment as architecturally wrong. "We control the creation of the entities on disk and can recreate them."

**Solution:** Rebuild entities from source data (Phase A workflow) with correct loading order:
1. Load StreetName database FIRST: `await loadBlockIslandStreetsFromDrive()`
2. Then process/create entities from source data (VA + Bloomerang)
3. Save new entity files to Google Drive
4. Then test Phase 5 comparison logic

### Key Learnings

1. **Serialization architecture is inviolable:** NO property-specific code in deserialization
2. **biStreetName is runtime-computed:** Populated during entity creation, not deserialization
3. **Loading order matters:** StreetName database must be loaded before entity creation
4. **Test workflows thoroughly:** Should have traced data flow before assuming test approach

---

## Session 42 - Phase 5 Step 1 Implementation (January 18-22, 2026)

### Status: USER_VERIFIED_WORKING

**Session Goal:** Implement Step 1 of Phase 5 - update StreetName.compareTo() to return four-score object.

### Implementation

**File:** scripts/objectStructure/aliasClasses.js (lines 1071-1125)

**Change:** Replaced binary compareTo() with version returning similarity scores for each alias category:

```javascript
compareTo(other) {
    // Extract term to compare
    const compareValue = (other instanceof StreetName)
        ? other.primaryAlias?.term
        : String(other || '');

    // Strip street types for comparison
    const prepared1 = StreetTypeAbbreviationManager.prepareForComparison(this.primaryAlias?.term || '');
    const prepared2 = StreetTypeAbbreviationManager.prepareForComparison(compareValue);

    // Calculate scores for each category
    const result = {
        primary: levenshteinSimilarity(prepared1, prepared2),
        homonym: -1,
        synonym: -1,
        candidate: -1
    };

    // Best score across homonyms, synonyms, candidates...
    // Returns object with four scores
}
```

**Also updated:** matches() method to use new return format (checks if any verified category ≥ threshold)

### Test Results (Console Verification)

```javascript
const cornNeck = window.blockIslandStreetDatabase.lookup('CORN NECK ROAD');
cornNeck.compareTo('CORN NECK ROAD') → {primary: 0.64, homonym: 1, synonym: -1, candidate: -1}
cornNeck.compareTo('CORN NECK RD') → {primary: 0.75, homonym: 1, synonym: -1, candidate: -1}
cornNeck.matches('CORN NECK ROAD') → true
cornNeck.matches('CORN NECK RD') → true
```

**Note:** Primary alias is "CORN NECK" (stripped base), variations like "CORN NECK ROAD" stored as homonyms. This is correct per Phase 2 design.

---

## Session 41 - Phase 5 First Attempt (January 18, 2026)

### Status: FAILED - CODE REVERTED

**Session Goal:** Implement Phase 5 - Update comparison logic to use biStreetName for alias-aware matching.

### Work Completed Successfully (KEPT)

**1. Fixed hardcoded thresholds in streetNameDatabaseConverter.js:**
- Problem: Lines 65-66 had hardcoded `const HOMONYM_THRESHOLD = 0.875` and `const SYNONYM_THRESHOLD = 0.845`
- This violated CLAUDE.md instruction: "Always reference window.MATCH_CRITERIA, never hardcode thresholds"
- Fix: Replaced constants with getter functions that reference MATCH_CRITERIA:
  ```javascript
  function getHomonymThreshold() {
      if (typeof MATCH_CRITERIA !== 'undefined') {
          return MATCH_CRITERIA.trueMatch.nameAlone;  // 0.875
      }
      throw new Error('MATCH_CRITERIA not loaded...');
  }
  function getSynonymThreshold() {
      if (typeof MATCH_CRITERIA !== 'undefined') {
          return MATCH_CRITERIA.nearMatch.nameAlone;  // 0.845
      }
      throw new Error('MATCH_CRITERIA not loaded...');
  }
  ```
- Updated all 6 usages (lines 151, 153, 421, 566, 567, 752, 753)
- Verified with `await previewSimilarStreets()` - shows 0.875 and 0.845 correctly

**2. Added ANSWER_THE_QUESTION_RULE to CLAUDE.md:**
- New rule added after ROOT_CAUSE_DEBUGGING_RULE
- Core principle: "When the user asks a question, provide a direct answer to that question. Do not deflect, reframe, or pivot to proposing solutions."

**3. Updated reference_streetNameAliasArchitecture.md Phase 5 section:**
- Documented the four types of alias comparison (not four methods - can be implemented any way)
- Type 1: exactAliasMatch - Returns 1 if exact match to primary/homonym/synonym, 0 otherwise
- Type 2: similarityToPrimary - Returns 1.0 for exact match, else similarity to primary
- Type 3: bestSimilarityScore - Returns highest similarity across primary + homonyms + synonyms
- Type 4: isAliasCandidate - Returns 1/'homonym'/'synonym'/0 based on thresholds
- IMPORTANT clarification: These are comparison TYPES, not methods - implementation approach is flexible

**4. Updated CLAUDE_BACKUP.md section "diversion2_alias_comparison_types":**
- Changed from "Four comparison methods" to "Four types of comparison"
- Added IMPORTANT_CLARIFICATION that this does NOT specify four methods
- Updated exactAliasMatch to check primary + homonyms + synonyms (not just primary + aliases)
- Updated bestSimilarityScore to check primary + homonyms + synonyms
- Updated isAliasCandidate threshold references to use MATCH_CRITERIA

### Work Attempted and REVERTED (Phase 5 implementation)

**What was implemented:**

1. Extended `StreetName.compareTo()` in aliasClasses.js with mode parameter:
   - `compareTo(other, mode = 'exact')` - default maintains backward compatibility
   - Added modes: 'exact', 'primary', 'best', 'candidate'
   - Added helper methods: `_checkExactMatch()`, `_calculateSimilarity()`, `_calculateBestSimilarity()`, `_categorizeScore()`
   - `_calculateSimilarity()` used StreetTypeAbbreviationManager.prepareForComparison() for street-type-aware comparison

2. Modified `compareBlockIslandAddresses()` in utils.js:
   - Added logic to use biStreetName when available:
   ```javascript
   if (addr1.biStreetName && addr2.biStreetName) {
       streetNameSim = addr1.biStreetName.compareTo(addr2.biStreetName, 'best');
   } else if (addr1.biStreetName) {
       streetNameSim = addr1.biStreetName.compareTo(addr2.streetName, 'best');
   } else if (addr2.biStreetName) {
       streetNameSim = addr2.biStreetName.compareTo(addr1.streetName, 'best');
   } else {
       streetNameSim = getComponentSimilarity(addr1.streetName, addr2.streetName);
   }
   ```

**Why it failed:**
- When loading unified database, browser crashed with out-of-memory error
- Debug window showed gapi string decoder with "Paused before potential out of memory crash"
- Root cause: Likely an infinite loop in the comparison logic
- The crash occurred in gapi (Google API library) because the infinite loop exhausted memory before our code could throw an error

**Suspected infinite loop location:**
- Unknown - needs diagnostic logging to identify
- Possibilities:
  - `_calculateBestSimilarity()` iterating infinitely
  - `_calculateSimilarity()` calling something that calls back
  - Circular reference when comparing StreetName objects

**Revert actions taken:**
1. Reverted utils.js `compareBlockIslandAddresses()` to original (single line: `const streetNameSim = getComponentSimilarity(...)`)
2. Reverted aliasClasses.js `StreetName.compareTo()` to original (no mode parameter, no helper methods)
3. Verified revert by loading unified database - no crash

### Key Learnings

1. **The current StreetName.compareTo() already implements Type 1 (exactAliasMatch):**
   - It returns 1.0 if input matches primary, any homonym, or any synonym; 0 otherwise
   - This is the only comparison type currently implemented

2. **StreetName objects from the same street lookup are the same object:**
   - When loading addresses, if two addresses have "CORN NECK RD" and "CORN NECK ROAD", both get the SAME StreetName object reference
   - So `addr1.biStreetName === addr2.biStreetName` for same-street comparisons
   - This makes Type 1 comparison trivial for StreetName-to-StreetName

3. **Primary alias is NOT included in homonyms:**
   - The primary is stored in `streetName.primaryAlias`
   - Homonyms array only contains OTHER variations
   - Exception: if original string differs from normalized (e.g., "CORN NECK RD" → "CORN NECK ROAD"), original added as homonym

4. **The four comparison types need careful implementation:**
   - Type 1 (exact): Already works
   - Types 2-4 need similarity scoring, which requires calling levenshteinSimilarity
   - Must avoid infinite loops - perhaps the helper methods created circular calls

### Next Session Instructions

**DO NOT repeat the same implementation approach without diagnostics.**

Before writing any Phase 5 code:
1. Add diagnostic console.log statements to trace the comparison code path
2. Understand what calls what during address comparison
3. Verify there are no circular dependencies
4. Test incrementally - add one helper method at a time and test

The design is sound (documented in reference_streetNameAliasArchitecture.md). The implementation had a bug causing infinite loop.

---

## Session 40 - Phase 4 Implementation (January 17, 2026)

### Status: USER_VERIFIED_WORKING

**Phase 3 Invariant Test Completed:**
- Result: PASSED
- Methodology: Enhanced compareBaselines.js with membership set comparison
- Finding: 1,974/1,976 groups have identical membership (99.9%)
- Acceptable variance: 1 merge - FireNumber:259 VA entity + Bloomerang household
- Conclusion: Phase 3 USER_VERIFIED_WORKING

**Phase 4 Implementation:**
- Purpose: Add biStreetName property to Address class to link parsed addresses to canonical StreetName objects with alias awareness

- Files modified:
  - aliasClasses.js line 1609: Added biStreetName = null property to Address constructor
  - aliasClasses.js lines 1824-1850: Added StreetName lookup in Address.fromProcessedAddress()
  - classSerializationUtils.js line 45: Added StreetName to CLASS_REGISTRY

- Architectural note: User caught that I was about to add explicit property deserialization code for biStreetName. The project uses GENERIC serialization via serializeWithTypes()/deserializeWithTypes(). Adding StreetName to CLASS_REGISTRY is the only change needed.

**Phase 4 Invariant Test:**
- Status: PASSED
- Results: 1975 groups, 4104 entities, 19869031 address comparisons, 3577560 entity comparisons
- Comparison to Phase 3: IDENTICAL
- Verdict: Phase 4 does not affect comparison behavior - biStreetName populated but not used

---

## Session 39 - Invariant Test Ran (January 17, 2026)

### Status: COMPARISON_COMPLETED

**runBaselineCapture Results:**
- EntityGroup count: 1975 (vs Phase 0: 1976)
- Entity count: 4104 (identical)
- Address comparisons: 19869031 (vs 19884444)
- Entity comparisons: 3577560 (vs 3580144)

**Differences Found:**
- 1 group merged (FireNumber:259 VA entity + Bloomerang household)
- Verdict: NOT a regression - acceptable variance

**Baseline Files Saved:**
- Session 39: /servers/Results/baseline_entitygroup_membership_2026-01-17T21-22-14.json
- Phase 0: /servers/Results/baseline/ folder

**Lessons Learned:**
- Server does NOT serve /Results/ path via HTTP - use Node.js to read files
- Google Drive EntityGroup files (1866 groups) are NOT the Phase 0 baseline (1976 groups)

---

## Session 38 - Critical Bug Fix and Phase 3 Loading (January 11, 2026)

### Status: USER_VERIFIED_WORKING

**Critical Bug Discovered:**
- After Phase 3 loading implementation, user compared original streets.json (207 streets) against new database variations (190) and found **18 streets MISSING**

**Root Cause:**
- In buildStreetNameObjects(), using `primaryNormalized` as Map key caused overwrites when two different original strings normalized to the same thing

**Bug Fix Implemented:**
- File: scripts/streetNameDatabaseConverter.js (lines 413-439)
- Added collision detection: when normalized key exists, add new original as homonym alias to existing builder

**Verification Results:**
- Collision merges: 18 streets merged
- Unique StreetName objects: 116
- Total variations indexed: 208
- Original streets in source: 207
- Missing streets: 0 - SUCCESS

**Phase 3 Loading Implementation:**
- Modified loadBlockIslandStreetsFromDrive() to load from StreetName Alias Database
- Created window.blockIslandStreetDatabase with lookup methods
- Created backward-compatible window.blockIslandStreets Set for invariant testing
- Constants added: STREETNAME_ALIAS_DATABASE_ID = '1quMdB4qAcnR4oaepSbZEmVWUqYO5_nxK'

**Phase 2 Conversion:**
- Ran convertStreetDatabase() successfully
- Input streets: 219, output objects: 109, homonyms: 81
- File IDs: streetname_alias_database: '1quMdB4qAcnR4oaepSbZEmVWUqYO5_nxK'

---

## Session 37 - Phase 2 Implementation (January 10, 2026)

### Status: CODED_READY_FOR_CONVERSION

**Files Created:**
- scripts/streetTypeAbbreviations.js (~800 lines): Street type abbreviation manager
- scripts/streetNameDatabaseConverter.js (~850 lines): Conversion script

**Comparison Logic (finalized):**
1. Strip street types entirely from both strings
2. Strip "OFF " prefix when BOTH streets start with it
3. Compare stripped strings using levenshteinSimilarity()
4. Store BOTH original AND normalized versions as aliases

**Primary Alias Selection Rules:**
1. Expanded form wins (ROAD over RD)
2. Names starting with digits cannot be primary
3. Tiebreaker: first in file wins

**User Testing:** Ran previewSimilarStreets() - user confirmed "no disturbing results"

---

## Session 36 - Phase 0 Baseline and Phase 1 Class (January 10, 2026)

### Status: CODED_NOT_TESTED

**Phase 0 - Baseline Capture:**
- Script created: scripts/diagnostics/streetArchitectureBaseline.js (~1000 lines)
- Instrumentation hooks added to entityGroupBuilder.js, addressProcessing.js, utils.js

**Baseline Results Captured:**
- EntityGroup membership: 1976 groups, 4104 entities
- Address score distribution: 19,884,444 comparisons
- Entity score distribution: 3,580,144 comparisons
- Street lookups: 4,859 total, 2,953 matches (60.77%)

**Key Lesson:** Street lookups happen during entity CREATION (CSV processing), NOT during database building

**Phase 1 - StreetName Class:**
- Created StreetName class extending SimpleIdentifiers in aliasClasses.js
- Added deserialize() method, added to module exports

---

## Session 35 - StreetName Architecture Planning (January 9-10, 2026)

### Status: PLANNING_COMPLETE

**Created:** reference_streetNameAliasArchitecture.md (v1.2)
- 12 sections covering current architecture, proposed changes, implementation phases
- Statistical baseline testing protocol
- Phase 0-7 implementation plan with invariant requirements

**Key Architectural Decisions:**
- StreetName class extends SimpleIdentifiers
- Street database remains on Google Drive (same file ID, new format)
- New biStreetName property on Address class
- EXPANDS Tier 3 Block Island detection

---

## Session 34 - Phonebook Parser Refactor (January 9, 2026)

### Status: READY_FOR_TESTING

**Complete rewrite of phonebookParser.js (~1400 lines)**
- Modular case-based architecture mirroring Case31Validator
- "What's left" name extraction: phone first, location info, remainder = name

**14 Line Type Definitions:**
- LineType0_Skip through LineType13_NoPhoneNoStreet, plus LineType99_Unmatched

**Console Commands:**
- await processPhonebookFile()
- viewUnvalidatedStreets(20)
- searchPhonebookStreets('mohegan')

---

## Session 33 - Phonebook Street Database (January 8, 2026)

### Status: SUPERSEDED_BY_SESSION34_REFACTOR

---

## Session 32 - Bloomerang CSV and Mail Merge Enhancements (January 8, 2026)

### Status: READY_FOR_TESTING

**EntityGroup Browser Refresh:**
- "Load Unified Database" button now also refreshes Unified Entity Browser display
- Added refreshUnifiedBrowserDisplay() call in loadUnifiedDatabaseForEntityGroups()

**Mail Merge Group Exclusion System:**
- Google Sheet ID: '1ToSnPaEwjcbab_f9u2xwjWmNjJm1nH7B60MeS4Ek0r4'
- Functions: loadMailMergeExcludedGroups(), resolveGroupExclusions(), isGroupExcluded()

**Mail Merge Uppercase Addresses:**
- Simplified mail merge CSV now converts address columns to uppercase

**Bloomerang CSV Preprocessing Instructions:**
- Added yellow warning box: 1) Delete TOTAL row 2) Remove \n 3) Replace commas with ^#C#^

**Bloomerang ZIP Code Padding:**
- 4-digit ZIP codes automatically padded with leading zero

---

## Session 31 - Post-Build Override Rules Audit (January 8, 2026)

### Status: READY_FOR_TESTING

**Created:** scripts/diagnostics/auditOverrideRules.js (~820 lines)

**Key Functions:**
- auditInclusionRules(): Verify FORCE_MATCH rules result in same group
- auditExclusionRules(): Verify FORCE_EXCLUDE rules kept entities separate
- runOverrideRulesAudit(): Main entry point
- investigateExclusionFailure(ruleId): Deep investigation

**Test Results:**
- 202 rules checked (97 FORCE_MATCH + 105 FORCE_EXCLUDE)
- 3 failures identified (INCBG, EXCZ, EXCAH[3])

**Key Insight:** FORCE_EXCLUDE rules between individuals don't prevent matching to HOUSEHOLDS containing those individuals

---

## Session 30 - Code Reorganization (January 8, 2026)

### Status: READY_FOR_TESTING

**entityGroupBrowser.js Refactoring:**
- Reduced from 4,233 lines to 1,415 lines (67% reduction)
- Extracted to scripts/export/csvReports.js (~2,600 lines)
- Extracted to scripts/diagnostics/entityComparison.js (~150 lines)

**Bloomerang Name Match Enhancement:**
- VA entities already assigned to groups show "*" in GroupIndex column

**Unused Rules Tracking Removal:**
- Removed runtime calls to markForceMatchApplied(), markExclusionApplied()

---

## Session 29 - individuals[] Deprecation Migration (January 7, 2026)

### Status: USER_VERIFIED_WORKING (Categories 1-2)

**individualKeys UI Navigation:**
- Added clickable "View Entity" buttons for entity key properties
- Supported properties: individualKeys, parentKey, siblingKeys, memberKeys, foundingMemberKey, nearMissKeys

**Migration Categories:**
- Category 1 (easy): entityGroupBrowser.js - MIGRATED
- Category 2 (medium): entityGroupBuilder.js, entityRenderer.js - MIGRATED
- Category 3 (hard): NOT_NEEDED - keep individuals[] for architectural parallelism with VA
- Category 4 (testing): DEFERRED

**Redundancy Eliminated:**
- Removed parentKeyToChildren Map - now uses entity.individualKeys[] directly

---

## Session 28 - First Name Matching Enhancement (January 7, 2026)

### Status: USER_VERIFIED_WORKING

**Bloomerang Name Match Report Enhanced:**
- New function: extractGroupFirstNames()
- Modified findVAEntitiesByLastName() to accept optional firstNames parameter
- Sorting: First+last matches appear before last-name-only

**Bloomerang Household Investigation:**
- NO data mismatches found across 428 households and 768 nested individuals
- Added individualKeys[] on AggregateHousehold for key-based navigation

---

## Session 27 - Performance Optimizations (January 6, 2026)

### Status: USER_VERIFIED_WORKING

**Performance Optimization 1:**
- Move isEntityAssigned() check BEFORE universalCompareTo() in findMatchesForEntity()

**Performance Optimization 2:**
- Build parentKey→childKeys index once at start, use O(1) lookup instead of O(N) scan
- Eliminates ~500,000 iterations for Bloomerang household member lookup

**Household Pulling Bug Fix:**
- Carbone household (1674AH) now correctly pulls Carolyn (1674) and Frank (328)

---

## Session 26 - Bloomerang Name Match Report (January 5, 2026)

### Status: USER_VERIFIED_WORKING

**Report Purpose:** For Bloomerang-only entity groups, find VisionAppraisal entities whose MailName contains any last name from the Bloomerang group members

**Functions Created:**
- extractGroupLastNames(), lastNameAppearsAsWord(), findVAEntitiesByLastName()
- exportBloomerangLastNameMatches(), downloadBloomerangLastNameMatches()

**Word Boundary Logic:** Prevents false positives like "FORD" in "CLIFFORD"

---

## Session 25 - Mail Merge Enhancements (December 2025)

### Status: USER_VERIFIED_WORKING

**Dual CSV Export:**
- Full 62-column format + Simplified 6-column format generated in single pass

**Consensus Collapse Fallback:**
- Multi-member groups that fail contactInfo threshold now collapse to single consensus row

**One-Click Mail Merge Button:**
- Added "Prospect Mail Merge" button that auto-loads both databases

---

## Session 24 - Consensus Address Sorting + Combined Address Splitting (December 2025)

### Status: USER_VERIFIED_WORKING

**Consensus Secondary Address Sorting:**
- Modified _deduplicateAddresses() to sort by "popularity"

**Combined Address Splitting:**
- Integrated detection into Entity._processAddressParameters()
- When PO Box + street detected: creates TWO Address objects

---

## Session 23 - Address Comparison Fixes (December 2025)

### Status: USER_VERIFIED_WORKING
### Documentation: reference_session23_regexFix.md

**Fix 1 - Regex Tag Cleaning:**
- VisionAppraisal tag `:^#^:` was not being replaced (^ is regex metacharacter)
- Changed /:^#^:/g to /:\^#\^:/g

**Fix 2 - PO Box Error Report:**
- Added console.error when PO Box addresses have undefined secUnitNum

**Fix 3 - isPOBoxAddress False Positives:**
- Rewrote checkForPOBox() with precise regex patterns

**Fix 4 - Mail Merge PO Box Fallback:**
- Added fallback in isGroupContactInfoConnected() (MAIL MERGE ONLY)

---

## Sessions 21-22 - Mail Merge Foundation (December 2025)

### Status: USER_VERIFIED_WORKING

**Session 22:** Discovered Address.compareTo() returning 0 for identical secondary addresses
**Session 21:** Created downloadProspectMailMerge(), exportProspectMailMerge(), generateMailMergeGroupRows()

---

## For Earlier Sessions
See: reference_sessionHistory.md (December 2025 and earlier)
