# Block Island Street Name Alias Architecture

**Document Purpose**: Plan for converting Block Island street names from simple strings to aliased objects with synonym support.

**Document Status**: PHASES 0-5 COMPLETE - Moving to 3-Task Expansion Roadmap

**Created**: January 9, 2026
**Last Updated**: January 26, 2026 (v3.0 - Phases 0-5 complete, 3-task roadmap defined)

---

## QUICK START - WHERE WE ARE (January 26, 2026)

### The Big Picture (Plain English)

We've upgraded how Block Island street names are stored. Instead of a simple list like:
```
["CORN NECK ROAD", "CORN NECK RD", "CORN NECK", ...]
```

We now have "smart" StreetName objects that know these are all the SAME street:
```
StreetName {
  primary: "CORN NECK",
  aliases: ["CORN NECK ROAD", "CORN NECK RD", "CORN NECK RD."]
}
```

This helps the system recognize the same street even when spelled differently in different data sources (VisionAppraisal, Bloomerang, Phonebook).

### Completed Phases (0-5)

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Baseline Capture | USER_VERIFIED_COMPLETE |
| 1 | Create StreetName Class | USER_VERIFIED_COMPLETE |
| 2 | Convert Street Database | USER_VERIFIED_COMPLETE |
| 3 | Update Loading | USER_VERIFIED_COMPLETE |
| 4 | Integrate with Address | USER_VERIFIED_COMPLETE |
| 5 | Update Comparison Logic | USER_VERIFIED_COMPLETE |

**Current System State**: 1,869 EntityGroups, 4,104 entities, 116 StreetName objects

### Upcoming Tasks (3-Task Roadmap)

| Task | Description | Status |
|------|-------------|--------|
| 1 | Database Maintenance Box in Browser | AWAITING_SPEC |
| 2 | Aliased Term Database Wrapper | AWAITING_SPEC |
| 3 | Phonebook Integration & Generalization | PLANNED |

See **SECTION 14: UPCOMING TASKS** for details.

### Phase 5 Design (Session 42)

**Detailed plan**: See **reference_phase5_streetNameComparison.md**

**Key decisions**:
1. `StreetName.compareTo()` returns four-score object (not single number)
2. Calling code interprets scores based on context
3. Single change point: `compareBlockIslandAddresses()` in utils.js line 1039

### Phase 5 Key Questions (ANSWERED)

1. **WHERE to integrate biStreetName comparison?**
   - ANSWER: `compareBlockIslandAddresses()` in utils.js only

2. **HOW should biStreetName affect scores?**
   - Same StreetName object = 1.0 (perfect match)
   - Different objects = use best score from compareTo() result
   - No biStreetName = fall back to string comparison

3. **EXPECTED outcome?**
   - More BI addresses should match (alias-aware)
   - Off-island addresses unaffected (no biStreetName)
   - Must NOT cause false positives

### Current System Metrics (Phase 4 verified)

| Metric | Value |
|--------|-------|
| EntityGroup count | 1,975 |
| Entity count | 4,104 |
| StreetName objects | 116 |
| Street variations indexed | 208 |
| Address comparisons | 19,869,031 |
| Entity comparisons | 3,577,560 |

### Invariant Test Results

- **Phase 3 vs Phase 0**: 1,974/1,976 groups identical (99.9%)
- **1 acceptable merge**: FireNumber:259 VA entity + Bloomerang household (both have FireNumber:259)
- **Phase 4 vs Phase 3**: IDENTICAL (biStreetName populated but not used in comparison)

### Key Numbers

- **116** unique StreetName objects
- **208** total variations indexed
- **207** original streets in source
- **18** collision merges performed
- **0** missing streets after bug fix

**Related Files**:
- VA Processing Street File: Google Drive file ID `1lsrd0alv9O01M_qlsiym3cB0TRIdgXI9` (simple JSON array, used ONLY for VA download chunking)
- StreetName Alias Database: Google Drive file ID `1quMdB4qAcnR4oaepSbZEmVWUqYO5_nxK` (serialized StreetName objects)
- Local copy: `/servers/Results/streets.json` (STALE BACKUP - not used by code)
- Alias classes: `scripts/objectStructure/aliasClasses.js` (StreetName class added Phase 1)
- Address processing: `scripts/address/addressProcessing.js`
- Phonebook parser: `scripts/phonebookParser.js`
- Baseline capture script: `scripts/diagnostics/streetArchitectureBaseline.js` (created Phase 0)
- VA download buttons: `scripts/baseCode.js` (Second Button generates VA Processing Street File)
- **Street type abbreviation manager**: `scripts/streetTypeAbbreviations.js` (created Phase 2)
- **Street database converter**: `scripts/streetNameDatabaseConverter.js` (created Phase 2)
- **Street Name Browser**: `scripts/streetNameBrowser.js` (created Session 50)

### Street Name Browser Tool (Session 50)

**Purpose**: Browser-based tool for viewing, searching, testing, and managing StreetName objects. This tool serves as the pattern for future alias management tools for other classes.

**Location**: `scripts/streetNameBrowser.js` + HTML section in `index.html` (after EntityGroup Browser)

**Features**:
- Load StreetName objects from Google Drive database
- Search/filter by primary name or any alias
- Two-panel UI: street list (left), details and testing (right)
- **compareTo() testing**: Enter a string, see all four scores (primary, homonym, synonym, candidate)
- **Add aliases**: Add strings to any alias category (homonym, synonym, candidate)
- **Create new streets**: Add entirely new StreetName objects
- Save changes back to Google Drive
- Export to JSON file

**Phase 8 Compatibility Safeguards**:

Manual edits made via the browser must be preserved when Phase 8 (VA Post-Process) updates the database:

1. **Source tracking**: All manually-added items use source `STREET_NAME_BROWSER_MANUAL`
2. **Metadata tracking**: Saved JSON includes `__manualEdits` section:
```json
{
  "__manualEdits": {
    "streetsAdded": ["NEW MANUAL STREET"],
    "aliasesAdded": [
      { "street": "CORN NECK ROAD", "alias": "CORN NCK", "category": "candidates" }
    ]
  }
}
```
3. **Phase 8 requirement**: When implemented, Phase 8 MUST read `__manualEdits` and preserve all manual changes.

**Pattern for Other Aliased Classes**:

This browser establishes the pattern for managing any class that extends `Aliased`:
- Load objects from database
- Display with alias category badges (H=homonyms, S=synonyms, C=candidates)
- Test comparison via `compareTo()` method
- Add aliases with manual edit tracking
- Save with metadata for preservation during automated updates

---

## SECTION 1: EXECUTIVE SUMMARY

### What This Document Describes

This document describes a plan to restructure how Block Island street names are stored and matched. Currently, street names are simple strings in a JSON array. The plan is to convert them to aliased objects that can recognize multiple variations of the same street name.

### Why This Change Is Needed

The Block Island phonebook and other data sources contain street name variations that the current system cannot match. For example:
- "CORN NECK ROAD" (canonical)
- "CORN NECK RD" (abbreviated)
- "CORN NECK" (type omitted)
- "Corn Neck Rd." (mixed case, punctuation)

All of these refer to the same street, but the current simple string matching does not recognize them as equivalent.

### Key Clarification

The existing Block Island address detection hierarchy remains authoritative. This plan EXPANDS the detection capability at Tier 3 (street database match). Currently, a street variation like "CORN NECK RD" may fail to match the database if only "CORN NECK ROAD" is stored. After implementation, the alias lookup will recognize variations, enabling more addresses to be correctly identified as Block Island through Tier 3 detection.

---

## SECTION 2: CURRENT ARCHITECTURE

This section describes how street names are currently stored and used. This is the baseline that will change.

### CRITICAL: Two-File Architecture

There are TWO distinct street-related files that must not be confused:

**1. VA Processing Street File** (`parameters.streetFile` = `1lsrd0alv9O01M_qlsiym3cB0TRIdgXI9`)
- **Purpose**: Chunking mechanism for VisionAppraisal download process
- **Format**: Simple JSON array of street name strings
- **Generated by**: Second Button in Step A0 (`secondButterClick()` in baseCode.js)
- **Consumed by**: Third and Fourth Buttons for organizing VA data download
- **Rule**: This file is NEVER modified by the StreetName alias project

**2. StreetName Alias Database** (NEW file, to be created)
- **Purpose**: Entity recognition and address processing
- **Format**: JSON with serialized StreetName objects containing aliases
- **Primary source**: VisionAppraisal (streets are authoritative because VA data is downloaded BY STREET)
- **Augmented by**: Phonebook variations (synonyms for existing streets)
- **Used by**: All entity recognition, address comparison, Block Island detection

### Why VA Is The Primary Source

VisionAppraisal data is downloaded BY STREET. This means every street that exists in VA data is guaranteed to exist in the VA Processing Street File. This creates a fundamental invariant: **every VA entity's street MUST exist in the StreetName Alias Database**.

The post-process button (to be added in Phase 8) will ensure this invariant is maintained after each VA download by:
- Adding any new streets that VA has added
- Flagging any streets that VA has removed for review

### Current Street Database Format

The VA Processing Street File is stored as a JSON array of 217 strings:

```json
[
  "CORN NECK",
  "CORN NECK ROAD",
  "OFF CORN NECK",
  "GRACE COVE ROAD",
  "OLD TOWN ROAD",
  "BEACH AVENUE",
  "MOHEGAN TRAIL"
]
```

### Current Street Database Loading

The function `loadBlockIslandStreetsFromDrive()` in `addressProcessing.js` currently loads the VA Processing Street File:

1. Fetches from Google Drive file ID `1lsrd0alv9O01M_qlsiym3cB0TRIdgXI9`
2. Parses the JSON content
3. Creates `window.blockIslandStreets` as a Set of uppercase, trimmed strings
4. The Set is used for simple membership testing with `has()`

**After this project**: This function will be modified to load from the NEW StreetName Alias Database file instead, parsing StreetName objects and building a lookup index.

### Local Copy Status

The file `/servers/Results/streets.json` is a STALE BACKUP. It is NOT used by any code. The file was created during initial development as a local reference copy. No loading function references this file path.

### Current Address Class Structure

In `aliasClasses.js`, the Address class stores street information as AttributedTerm objects:

```javascript
// Lines 1489-1491 of aliasClasses.js
this.streetName = null;    // AttributedTerm for "CORN NECK"
this.streetType = null;    // AttributedTerm for "Rd"
```

The `streetName` property holds a simple AttributedTerm. An AttributedTerm is a single text value with source tracking. It has no alias support.

### Current Street Matching Behavior

When `enhanceAddressWithBlockIslandLogic()` in `addressProcessing.js` processes an address:

1. It checks if the street name exists in `window.blockIslandStreets`
2. The check is a simple string equality test via `Set.has()`
3. If the street name is "CORN NECK RD" but the database only has "CORN NECK ROAD", the match fails

### The parse-address Library Problem

The system uses a third-party library called parse-address. This library is a black box. It splits addresses into components and normalizes street types:

- Input: "640 CORN NECK ROAD"
- Output: `{ number: "640", street: "CORN NECK", type: "Rd" }`

The library separates the street type and abbreviates it. This creates a mismatch with our canonical street names which include the full type.

---

## SECTION 3: PROPOSED ARCHITECTURE

This section describes the new architecture that will replace the current system.

### New StreetName Class Definition

A new class called `StreetName` will extend `SimpleIdentifiers`. This places it in the same category as `FireNumber`, `PID`, and `PoBox` in the class hierarchy.

```javascript
class StreetName extends SimpleIdentifiers {
    constructor(primaryAlias) {
        super(primaryAlias);
        // Inherited from Aliased via SimpleIdentifiers:
        // - this.primaryAlias = AttributedTerm with canonical name
        // - this.alternatives = Aliases object with homonyms/synonyms/candidates
    }
}
```

### Class Hierarchy Context

The existing class hierarchy in `aliasClasses.js` is:

```
AttributedTerm (base - single value with source tracking)

Aliased (base - wrapper for AttributedTerm primary + Aliases alternatives)
├── SimpleIdentifiers (simple matching)
│   ├── NonHumanName
│   ├── FireNumber
│   ├── PoBox
│   ├── PID
│   └── StreetName  <-- NEW CLASS
└── ComplexIdentifiers (fuzzy matching with components)
    ├── IndividualName
    ├── HouseholdName
    └── Address
```

### New Street Database Format

The street database will change from a JSON array to an array of StreetName objects:

```json
{
  "streets": [
    {
      "__type": "StreetName",
      "primaryAlias": {
        "__type": "AttributedTerm",
        "term": "CORN NECK ROAD",
        "fieldName": "canonicalStreetName",
        "sourceMap": {
          "BI_STREET_DATABASE": { "index": 0, "identifier": "canonical" }
        }
      },
      "alternatives": {
        "__type": "Aliases",
        "homonyms": [],
        "synonyms": [
          {
            "__type": "AttributedTerm",
            "term": "CORN NECK RD",
            "fieldName": "streetVariation",
            "sourceMap": {
              "TYPE_ABBREVIATION": { "index": 0, "identifier": "auto-generated" }
            }
          },
          {
            "__type": "AttributedTerm",
            "term": "CORN NECK",
            "fieldName": "streetVariation",
            "sourceMap": {
              "TYPE_OMITTED": { "index": 0, "identifier": "auto-generated" }
            }
          }
        ],
        "candidates": []
      }
    }
  ]
}
```

### New Street Database Loading

The loading function will change to:

1. Fetch from Google Drive (NEW file ID for StreetName Alias Database)
2. Deserialize into StreetName objects using `deserializeWithTypes()`
3. Build a lookup index: Map from all variations to canonical StreetName
4. Store as `window.blockIslandStreetDatabase` (object with lookup methods)

**Note**: The VA Processing Street File (`1lsrd0alv9O01M_qlsiym3cB0TRIdgXI9`) remains unchanged and continues to be used by the VA download buttons.

### New Street Matching Behavior

When processing a Block Island address:

1. Determine if address is Block Island (no city/state/zip present)
2. Extract the street string from parse-address output
3. Call `blockIslandStreetDatabase.lookup(streetString)`
4. The lookup checks the input against all primaryAlias terms AND all alternative terms
5. Return the matching StreetName object (or null if no match)

### Integration with Address Class

The Address class will gain a new optional property:

```javascript
// Existing properties
this.streetName = null;        // AttributedTerm from parse-address
this.streetType = null;        // AttributedTerm from parse-address

// New property
this.biStreetName = null;      // StreetName object (only for BI addresses)
```

When comparing two Block Island addresses, the comparison logic will use `biStreetName` if present. The `streetName` and `streetType` fields are retained for compatibility and off-island addresses.

---

## SECTION 4: BLOCK ISLAND ADDRESS DETECTION

This section describes how the system determines whether an address is on Block Island, and how this plan affects detection.

### Existing Detection Hierarchy

The existing code in `addressProcessing.js` uses a multi-tier detection system implemented in `detectBlockIslandAddress()` and `preParseBlockIslandCheck()`:

**Tier 1 - ZIP Code**:
- ZIP code equals "02807"
- Implemented in `detectBlockIslandAddress()` lines 237-240

**Tier 2 - City Name**:
- City matches "Block Island" (case-insensitive)
- City matches "New Shoreham" (case-insensitive)
- Implemented in `detectBlockIslandAddress()` lines 243-247

**Tier 3 - Street Name Database Match**:
- Street name matches an entry in `window.blockIslandStreets`
- For addresses WITH VisionAppraisal line tags (`::#^#::`): requires corroboration from geographic portion
- For addresses WITHOUT line tags: street match alone IS sufficient to determine BI status
- Implemented in `checkBlockIslandStreetMatch()` lines 156-182

**Tier 4 - VisionAppraisal Property Location**:
- sourceType === 'VisionAppraisal' AND fieldName === 'propertyLocation'
- Implemented in `preParseBlockIslandCheck()` lines 218-220

**Tier 5 - Deep Fallback (Last Resort)**:
- City, state, AND zip are all missing or empty
- In the context of BI-related data sources, assume Block Island

### CRITICAL: Street Database Match IS a Detection Method

The street database match (Tier 3) CAN and DOES determine that an address is Block Island. From `checkBlockIslandStreetMatch()` lines 178-180:

```javascript
} else {
    // No line tag - accept street match
    return { isMatch: true, matchedStreet: storedMatch };
}
```

This means: If an address has no line tags and its street matches the database, it IS classified as Block Island based on street match alone.

### How This Plan Affects Detection

The StreetName alias system will affect Tier 3 detection because:

1. Currently: Detection checks if street exists in `window.blockIslandStreets` (simple Set)
2. After this plan: Detection will check if street matches any StreetName primary OR alternative

This EXPANDS the detection capability. A street variation like "CORN NECK RD" that currently might NOT match the database (if only "CORN NECK ROAD" is stored) WILL match after aliases are implemented.

### Implications for This Plan

The StreetName alias architecture serves TWO purposes:

1. **Detection**: Improves Tier 3 detection by matching street variations
2. **Post-detection matching**: Enables semantic street comparison between addresses

The plan must ensure the alias lookup is available during the detection phase, not just after.

### No Ambiguity With Off-Island Streets

There is no risk of confusing a Block Island street with an off-island street because:

1. For addresses WITH line tags: geographic corroboration is required
2. For addresses WITHOUT line tags: the data sources (VA, Bloomerang, Phonebook) are all BI-related
3. Off-island addresses from these sources will have city/state/zip that triggers Tier 1 or 2 first

### No Ambiguity Between Block Island Streets

There are no two Block Island streets with the same base name but different types. For example, there is no "BEACH ROAD" and "BEACH AVENUE" on Block Island. This means the street base name alone is sufficient to identify the street uniquely.

---

## SECTION 5: ALIAS CATEGORIES

This section describes how street name variations will be categorized within the Aliases structure.

### The Three Categories

The `Aliases` class in `aliasClasses.js` has three categories for alternative terms:

1. **homonyms**: Accepted misspellings/trivial variations of the primary (verified)
2. **synonyms**: Temporary staging area for similarity-based matches (unverified, pending review)
3. **candidates**: Verified alternative identifiers determined through circumstance or review

### Category Definitions and Lifecycle

**Homonyms** (verified, high similarity):
- Simple misspellings or trivial variations that have been accepted as referencing the same value
- The similarity score between the variation and canonical form meets the homonym threshold (>= 0.875)
- These are considered verified alternatives - no review needed
- Example: "CORN NECK ROAD" vs "Corn Neck Road" (case difference only)

**Synonyms** (temporary staging, unverified):
- Terms with moderate-to-high similarity that MIGHT be legitimate variations, but have not been verified
- Automatically captured by code running correlations when initializing an aliased term
- Risk: May be false positives - a term that looks similar but actually refers to something else
- **Synonyms are a staging area**: Valid ones should be reviewed and promoted to candidates
- Example: "CORN NECK RD" appears similar to "CORN NECK ROAD" but needs verification

**Candidates** (verified alternatives, possibly low similarity):
- Verified alternative identifiers whose validity comes from circumstance rather than (or despite) similarity score
- May have very poor correlation to the primary, but have been determined to be accepted versions
- Analogy: In Harry Potter, "He who should not be named" precisely means "Voldemort" despite zero string similarity
- Sources of candidates:
  - Synonyms that pass review and are promoted to candidates
  - Automatic capture by code identifying alternatives based on circumstance (after initial object creation)
  - Manual updates by other processes (user assertion, phonebook context, etc.)
- Example: A phonebook entry "CORN NCK" that scores below threshold but has been verified as valid

### Category Comparison for Address Matching

When comparing addresses, the system uses scores from **primary, homonym, and candidates** (NOT synonyms):
- Primary and homonyms are verified by definition
- Candidates are verified through review or contextual evidence
- Synonyms are excluded because they are unverified and may be false positives

### Categorization Process

**At object initialization:**
1. Calculate similarity score between variation and canonical form
2. If score >= 0.875: Add as homonym (verified, trivial variation)
3. If score >= 0.845: Add as synonym (staging for review)
4. If score < 0.845: Reject or flag - insufficient similarity for automatic capture

**After initialization:**
1. Review synonyms periodically - promote valid ones to candidates, remove false positives
2. Add candidates directly when circumstantial evidence confirms validity (phonebook, user assertion)
3. Candidates may be added at any time by automated processes or manual updates

### Future Enhancement: Threshold Tuning

The categorization thresholds (0.875, 0.845) were designed for personal names. These may need adjustment based on testing with real street data. Street names may behave differently than personal names in similarity scoring.

---

## SECTION 6: PHONEBOOK INTEGRATION

This section describes how the phonebook parser will AUGMENT the VA-based StreetName database with candidate variations.

### Key Principle: Phonebook Augments, VA Is Primary

**VisionAppraisal is the PRIMARY and AUTHORITATIVE source for street names.** If a street is not in VA, it does not exist on Block Island (from our data model's perspective).

The phonebook's role is to:
- Add **candidate variations** for streets that already exist in the VA-based database
- Identify potential data quality issues when phonebook streets don't match any VA street

The phonebook does NOT add new canonical streets - it only adds alternative spellings for existing ones.

### Current Phonebook Street Handling

The phonebook parser in `phonebookParser.js` currently:

1. Extracts street names from phone book entries
2. Normalizes and looks up in `window.blockIslandStreets`
3. Reports unvalidated streets (streets not found in database)
4. Stores `streetNormalized` if a match is found

### Proposed Phonebook Integration

After the StreetName architecture is implemented:

1. Phonebook parser looks up extracted street in StreetName database
2. If exact match found: Use canonical StreetName
3. If similar match found: Add extracted string as new **candidate** to the EXISTING StreetName
   - Phonebook context provides the circumstantial evidence that validates the variation
   - This bypasses the synonym staging area because phonebook presence IS verification
4. If no match found: Add as "unresolved" entry for human review

### Why Phonebook Entries Become Candidates (Not Synonyms)

Phonebook variations have **circumstantial verification**:
- The phonebook is a trusted source (real addresses used by real residents)
- If a variation appears in the phonebook, someone actually used that spelling for mail delivery
- This contextual evidence promotes the variation directly to candidate status

Synonyms are for **similarity-based captures** that need verification. Phonebook entries already have verification through their source.

### Handling Unrecognized Phonebook Streets

When a phonebook street doesn't match any VA street, it could be:
- A variation/misspelling of an existing street (most common)
- A data entry error in the phonebook
- A real street that VA doesn't have (rare, but possible if VA data is incomplete)

The system will:
1. Store unrecognized streets as "unresolved" or "conditional" entries
2. Flag them for human review
3. Allow manual resolution: assign to existing street as candidate, or mark as error

This provides flexibility without violating the principle that VA is authoritative.

### Candidate Feedback Pipeline

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

### Human Review for Unrecognized Streets

Some phonebook entries may be:
- Misspellings that should NOT be added to any street
- Legitimate variations that SHOULD become candidates for an existing street
- Completely unrecognized streets that need investigation

Unrecognized streets (no similar match) require human review. Once resolved, they can be added as candidates to the appropriate street.

---

## SECTION 7: BASELINE CAPTURE AND REGRESSION TESTING

This section describes the testing protocol that ensures structural changes do not alter system behavior until we intentionally enable new functionality.

### Testing Philosophy

The goal of Phases 1-4 is to restructure street name storage WITHOUT changing any system outputs. We must be able to prove that the restructured system produces identical results to the current system before we enable any new matching behavior.

Statistical distribution analysis is preferred over spot-checking individual pairs because:
- Distributions reveal any shift in behavior across the entire dataset
- No selection bias from cherry-picking test cases
- Quantifiable thresholds for "identical" vs "regression detected"

### Baseline Artifacts to Capture (Phase 0)

Before making ANY code changes, capture and store these artifacts:

**Artifact 1: EntityGroup Membership Snapshot**
- Total group count
- Distribution of group sizes (count of 1-member groups, 2-member groups, etc.)
- Full membership mapping: entityKey → groupIndex for every entity
- File format: JSON, stored in `/servers/Results/baseline/`

**Artifact 2: Address Comparison Score Distribution**
- For ALL address pairs compared during EntityGroup build
- Distribution buckets in 5% increments: 0-5%, 5-10%, ..., 95-100%
- Separate distributions for:
  - BI-to-BI address pairs
  - BI-to-offisland address pairs
  - Offisland-to-offisland address pairs
- File format: JSON with bucket counts

**Artifact 3: Entity Comparison Score Distribution**
- For ALL entity pairs compared during EntityGroup build
- Same 5% increment buckets as address distribution
- Segmented by entity type pairs (Individual-Individual, Individual-Household, etc.)

**Artifact 4: Street Lookup Results**
- For every street string encountered during address processing
- Record: input string, matched (yes/no), matched canonical name (if matched)
- Summary statistics: total lookups, match count, failure count, failure list
- This directly measures what the change affects

### Invariant Requirements by Phase

| Phase | Expected Distribution Impact | Verification |
|-------|------------------------------|--------------|
| 0 | N/A - capture baseline | Store all artifacts |
| 1 | ZERO | No code paths executed yet |
| 2 | ZERO | New database file created, not yet loaded |
| 3 | ZERO | All 4 distributions must match baseline exactly |
| 4 | ZERO | All 4 distributions must match baseline exactly |
| 5 | PROVISIONAL | Design finalized after Phase 4 learnings |
| 6 | PROVISIONAL | Phonebook augmentation |
| 7 | PROVISIONAL | Full rebuild and validation |
| 8 | DEFERRED | VA post-process button (isolated task) |

**CRITICAL**: Phases 1-4 must produce IDENTICAL distributions to baseline. Any deviation indicates a regression that must be investigated and fixed before proceeding.

### Baseline Capture Script Requirements

Create `scripts/diagnostics/streetArchitectureBaseline.js` with functions:

```javascript
// Capture functions (run before changes)
captureEntityGroupMembership(groupDb) → JSON
captureAddressScoreDistribution(comparisons) → JSON
captureEntityScoreDistribution(comparisons) → JSON
captureStreetLookupResults(lookups) → JSON

// Comparison functions (run after each phase)
compareEntityGroupMembership(baseline, current) → { identical: boolean, differences: [] }
compareDistribution(baseline, current) → { identical: boolean, maxDelta: number, bucketDeltas: {} }

// Summary function
runRegressionCheck(baselineDir) → { phase1: pass/fail, phase2: pass/fail, ... }
```

### Instrumentation Requirements

To capture comparison scores, the EntityGroup build process must be instrumented to record:
- Every address.compareTo() call and its result
- Every entity.compareTo() call and its result
- Every street lookup and its result

This instrumentation should be toggleable (off by default in production).

---

## SECTION 8: IMPLEMENTATION PHASES

This section describes the order in which the changes should be implemented.

### Phase 0: Baseline Capture - USER_VERIFIED_WORKING

**Status**: USER_VERIFIED_WORKING (completed January 10, 2026)

Tasks completed:
1. Created baseline capture script (`scripts/diagnostics/streetArchitectureBaseline.js` - ~1000 lines)
2. Added instrumentation hooks to entityGroupBuilder.js, addressProcessing.js, utils.js
3. Ran full EntityGroup build with instrumentation (~20 minutes)
4. Captured all 4 baseline artifacts
5. Downloaded baseline files to user's machine

**Baseline Results**:
- EntityGroup membership: 1,976 groups, 4,104 entities
- Address score distribution: 19,884,444 comparisons
- Entity score distribution: 3,580,144 comparisons
- Street lookups: 4,859 total, 2,953 matches (60.77%), 1,906 failures, 1,096 unique failed inputs

**Key Implementation Notes**:
- Added `getTermString()` helper to handle AttributedTerm objects (city was AttributedTerm, not string)
- Street lookups happen during entity CREATION (CSV processing), NOT during database loading
- Solution: Scan existing entity addresses using `entity.contactInfo.primaryAddress` and `entity.contactInfo.secondaryAddress`

**Console Commands**:
- `await captureStreetLookupBaseline()` - Capture street lookups only
- `await runBaselineCapture()` - Full baseline capture with EntityGroup rebuild

### Phase 1: Create StreetName Class - USER_VERIFIED_WORKING

**Status**: USER_VERIFIED_WORKING (completed January 10, 2026)

**Files modified**: `scripts/objectStructure/aliasClasses.js`

Tasks completed:
1. Added `StreetName` class extending `SimpleIdentifiers` (lines 1036-1073)
2. Added `StreetName.deserialize()` method
3. Added case to `_deserializeIdentifier` helper (lines 891-892)
4. Exported `StreetName` to module.exports (line 1864) and window (line 1887)

**Invariant Check**: No code paths execute StreetName yet, so no distribution check needed

**Architectural Note**: The StreetName Alias Database will be a NEW file on Google Drive (separate from the VA Processing Street File). The VA Processing Street File remains unchanged.

### Phase 2: Create StreetName Alias Database - USER_VERIFIED_WORKING

**Status**: USER_VERIFIED_WORKING (conversion completed January 11, 2026)

**Output**: NEW Google Drive file containing StreetName objects

**Files Created**:
1. `scripts/streetTypeAbbreviations.js` - Street type abbreviation manager (~800 lines)
2. `scripts/streetNameDatabaseConverter.js` - Conversion script (~785 lines)

**Script tags added to index.html** (lines 1737-1738):
```html
<script src="scripts/streetTypeAbbreviations.js"></script>
<script src="scripts/streetNameDatabaseConverter.js"></script>
```

**Street Type Abbreviation Manager** (`streetTypeAbbreviations.js`):
- Manages abbreviation table (RD→ROAD, AVE→AVENUE, etc.)
- Stored on Google Drive: file ID `1JAyj8bhJC3jL6wL8NvGGZsknyLos--XS`
- Key functions:
  - `loadFromDrive()` / `saveToDrive()` - Persistence
  - `stripStreetType(streetName)` - Remove street type entirely for comparison
  - `prepareForComparison(streetA, streetB)` - Prepare two streets for similarity scoring
  - `expandStreetName(streetName)` - Expand abbreviations (for primary alias selection)
  - `endsWithStreetType(streetName)` - Check if street ends with any known type (abbrev OR full form)
  - `addAbbreviationsFromList(list)` - Batch add abbreviations from [[abbrev, fullForm], ...] array
  - `addAndSaveAbbreviations(list)` - Load from Drive, add abbreviations, save back (complete workflow)

**Comparison Logic** (finalized after multiple iterations):
1. **Strip street types entirely** - Both abbreviated (RD, AVE) and full forms (ROAD, AVENUE) are removed from the end for comparison
2. **Strip "OFF " prefix** when BOTH streets start with it
3. **Compare stripped strings** using `levenshteinSimilarity()` from utils.js
4. **Store original strings** as aliases based on stripped string scores

**Why STRIP (not expand or contract)?**
- Removes street type variations from similarity calculation
- "CORN NECK ROAD" and "CORN NECK RD" both become "CORN NECK" → score 1.0
- Prevents false positives like "OFF CENTER ROAD" matching "OFF WATER STREET"

**Street Name Database Converter** (`streetNameDatabaseConverter.js`):
- Loads VA Processing Street File (219 streets)
- Compares all pairs using stripped string similarity
- Thresholds: HOMONYM >= 0.875, SYNONYM >= 0.845
- Consolidates similar streets (one primary, others become aliases)
- Primary alias selection rules:
  1. Expanded form wins (ROAD over RD)
  2. Names starting with digits cannot be primary
  3. Tiebreaker: First in file wins
- Creates NEW Google Drive file for StreetName Alias Database

**Console Commands**:
```javascript
// Step 1: Initialize abbreviation table
StreetTypeAbbreviationManager.initializeDefaults()
// Or load from Drive: await StreetTypeAbbreviationManager.loadFromDrive()

// Step 2: Preview similar pairs
await previewSimilarStreets()

// Step 3: Preview full conversion
await previewStreetConversion()

// Step 4: Run actual conversion (creates new Drive file)
await convertStreetDatabase()

// Step 5: Verify uploaded database
await verifyStreetDatabase(fileId)

// Adding new abbreviations to the table (load, add, save in one step):
await StreetTypeAbbreviationManager.addAndSaveAbbreviations([
    ['HL', 'HILL'],
    ['RDG', 'RIDGE'],
    ['CTR', 'CENTER']
    // ... add more [abbreviation, fullForm] pairs as needed
])
```

**User Testing Completed**:
- User ran `previewSimilarStreets()` and reviewed results
- User confirmed "no disturbing results" with the stripping logic
- Ready to run `convertStreetDatabase()` to create the actual database file

**Important**: The VA Processing Street File (`1lsrd0alv9O01M_qlsiym3cB0TRIdgXI9`) is NOT modified. We are creating a SEPARATE file.

**Dependencies**: Phase 1 complete

**Invariant Check**: New database not yet loaded by any code, so no distribution check needed

**Next Step**: Run `await convertStreetDatabase()` to create the Google Drive file, record the new file ID

### Phase 3: Update Street Database Loading - USER_VERIFIED_WORKING

**Status**: USER_VERIFIED_WORKING (completed January 17, 2026, invariant test passed)

**Files modified**: `scripts/address/addressProcessing.js`

Tasks completed:
1. Added `STREETNAME_ALIAS_DATABASE_ID` constant with file ID `1quMdB4qAcnR4oaepSbZEmVWUqYO5_nxK`
2. Added deserialization functions: `deserializeStreetAttributedTerm()`, `deserializeStreetAliases()`, `deserializeStreetNameObject()`
3. Modified `loadBlockIslandStreetsFromDrive()` to:
   - Load from StreetName Alias Database file (not VA Processing Street File)
   - Deserialize StreetName objects from JSON
   - Build `window.blockIslandStreetDatabase` object with lookup methods:
     - `lookup(streetString)` - Returns StreetName object or null
     - `has(streetString)` - Returns boolean (for backward compatibility)
     - `streets` - Array of all StreetName objects
     - `variationCount` - Number of indexed variations
   - Build backward-compatible `window.blockIslandStreets` Set containing ALL variations (primary + homonyms + synonyms)

**User Testing Completed** (January 10, 2026):
- Loaded 109 StreetName objects successfully
- 190 variations indexed
- `window.blockIslandStreetDatabase.lookup('CORN NECK RD')` returns proper StreetName object
- `window.blockIslandStreets.has('CORN NECK RD')` returns true (backward compatible)

**CRITICAL BUG DISCOVERED**: Comparison of original streets.json (207 streets) vs new database (190 variations) revealed **18 streets MISSING**:
- CONNECTICUT AVE, CONNECTICUT AVENUE (duplicate with trailing space)
- COONEYMUS ROAD variants
- GRACE COVE ROAD variants
- OFF CHAPEL STREET, OFF WEST SIDE variants
- OLD MILL ROAD variants

**Root Cause**: In `buildStreetNameObjects()`, using `primaryNormalized` as Map key caused overwrites when two different original strings normalized to the same thing. The second one replaced the first, losing the first original string.

**Bug Fix Implemented**: Added collision detection in `streetNameDatabaseConverter.js` (lines 413-439). When a normalized key already exists:
1. Log the collision
2. Add the new original string as a homonym alias to the existing builder
3. Point the index to the existing builder
4. Count collision merges for reporting

**Next Steps**:
1. Refresh browser (to load fixed converter script)
2. Re-run `convertStreetDatabase()` to create corrected database
3. Run comparison to verify 0 missing streets
4. Proceed to invariant testing

**Dependencies**: Phase 2 complete (with bug fix)

**Invariant Check**: Run full EntityGroup build, compare ALL 4 distributions to baseline
- EntityGroup membership: MUST BE IDENTICAL
- Address score distribution: MUST BE IDENTICAL
- Entity score distribution: MUST BE IDENTICAL
- Street lookup results: MUST BE IDENTICAL (same match/no-match for every input)

**Testing**: If any distribution differs from baseline, STOP and investigate before proceeding

### Phase 4: Integrate with Address Processing - USER_VERIFIED_WORKING

**Status**: USER_VERIFIED_WORKING (completed January 17, 2026, invariant test passed)

**Files modified**:
- `scripts/objectStructure/aliasClasses.js` (line 1609: biStreetName property, lines 1824-1850: lookup)
- `scripts/utils/classSerializationUtils.js` (line 45: StreetName in CLASS_REGISTRY)

Tasks completed:
1. Added `biStreetName = null` property to Address constructor
2. Added StreetName lookup in Address.fromProcessedAddress() - checks if BI address and database loaded
3. Added StreetName to CLASS_REGISTRY for automatic serialization support
4. **CRITICAL**: biStreetName is populated but NOT used in comparison logic (that's Phase 5)

**Invariant Test Results**:
- EntityGroup count: 1,975 (identical to Phase 3)
- Address comparisons: 19,869,031 (identical to Phase 3)
- Entity comparisons: 3,577,560 (identical to Phase 3)
- Verdict: Phase 4 does NOT affect comparison behavior

**Architectural Note**: User caught that explicit property deserialization code was not needed. The project uses GENERIC serialization via serializeWithTypes()/deserializeWithTypes(). Adding StreetName to CLASS_REGISTRY is the only change needed.

### Phase 5: Update Address Comparison

**Status**: READY FOR IMPLEMENTATION (January 18, 2026)

**Dependencies**: Phase 4 complete with all invariants verified ✓

**Detailed Plan**: See **reference_phase5_streetNameComparison.md** for complete implementation details.

#### Summary of New Architecture (Session 42)

The Session 41 approach (mode parameter) was abandoned. New design:

1. **StreetName.compareTo() returns a FOUR-SCORE OBJECT**:
   ```javascript
   { primary: 0.95, homonym: 0.88, synonym: 0.75, candidate: -1 }
   ```
   - Each score is Levenshtein similarity to that alias category
   - -1 means category is empty (no aliases of that type)

2. **Calling code interprets scores based on context**:
   - `compareBlockIslandAddresses()` uses best score across primary/homonym/candidates
   - Synonyms are EXCLUDED (unverified, may be false positives)
   - Check object identity first: same StreetName object = 1.0 (skip calculation)

3. **Single change point**: `compareBlockIslandAddresses()` in utils.js line 1039

#### Implementation Steps

1. Update `StreetName.compareTo()` to return four-score object
2. Update `compareBlockIslandAddresses()` to use `biStreetName` when available
3. Test incrementally

#### Expected Outcome

Alias-aware matching should produce higher scores for street variations that previously scored less than 1.0 (e.g., "CORN NECK ROAD" vs "CORN NECK RD"). This is the intended improvement.

#### Historical Note

Session 41 attempted a mode-parameter approach that caused an infinite loop. That approach was abandoned in favor of the cleaner four-score object design documented in reference_phase5_streetNameComparison.md.

### Phases 6-8: Superseded by 3-Task Roadmap

**Note**: The original Phases 6-8 have been reorganized into a 3-Task roadmap. See **SECTION 14: UPCOMING TASKS** for the current plan.

---

## SECTION 9: TECHNICAL SPECIFICATIONS

This section provides detailed technical information for implementation.

### StreetName Class Specification

```javascript
/**
 * StreetName class - subclass of SimpleIdentifiers for Block Island street names
 * Used to match street name variations (abbreviations, case, punctuation)
 * @param {AttributedTerm} primaryAlias - AttributedTerm containing canonical street name
 */
class StreetName extends SimpleIdentifiers {
    constructor(primaryAlias) {
        super(primaryAlias);
    }

    /**
     * Deserialize StreetName from JSON object
     * @param {Object} data - Serialized data
     * @returns {StreetName} Reconstructed StreetName instance
     */
    static deserialize(data) {
        if (data.type !== 'StreetName') {
            throw new Error('Invalid StreetName serialization format');
        }

        const primaryAlias = ensureDeserialized(data.primaryAlias, AttributedTerm);
        const streetName = new StreetName(primaryAlias);
        streetName.alternatives = ensureDeserialized(data.alternatives, Aliases);

        return streetName;
    }
}
```

### Street Database Lookup Object Specification

```javascript
/**
 * BlockIslandStreetDatabase - manages StreetName objects and lookup
 */
class BlockIslandStreetDatabase {
    constructor() {
        this.streets = [];           // Array of StreetName objects
        this.lookupIndex = new Map(); // Map: variation string → StreetName
    }

    /**
     * Build lookup index from all streets and their aliases
     */
    buildIndex() {
        this.lookupIndex.clear();
        for (const street of this.streets) {
            // Index primary alias
            const primary = street.primaryAlias.term.toUpperCase().trim();
            this.lookupIndex.set(primary, street);

            // Index all alternatives
            for (const alt of street.alternatives.getAllAttributedTerms()) {
                const altKey = alt.term.toUpperCase().trim();
                this.lookupIndex.set(altKey, street);
            }
        }
    }

    /**
     * Look up a street string and return matching StreetName
     * @param {string} streetString - Street name to look up
     * @returns {StreetName|null} Matching StreetName or null
     */
    lookup(streetString) {
        if (!streetString) return null;
        const key = streetString.toUpperCase().trim();
        return this.lookupIndex.get(key) || null;
    }

    /**
     * Add a new synonym to an existing street
     * @param {StreetName} street - Street to add synonym to
     * @param {string} variation - New variation string
     * @param {string} source - Source of this variation
     */
    addSynonym(street, variation, source) {
        const term = new AttributedTerm(
            variation,
            source,
            -1,
            'variation',
            'streetVariation'
        );
        street.alternatives.add(term, 'synonyms');

        // Update index
        const key = variation.toUpperCase().trim();
        this.lookupIndex.set(key, street);
    }
}
```

### Type Variation Generation

When converting the existing street database, generate these variations for each street:

```javascript
function generateTypeVariations(canonicalName) {
    const variations = [];

    // Type mappings
    const typeMap = {
        'ROAD': ['RD', 'Rd', 'Rd.'],
        'AVENUE': ['AVE', 'Ave', 'Ave.'],
        'STREET': ['ST', 'St', 'St.'],
        'DRIVE': ['DR', 'Dr', 'Dr.'],
        'LANE': ['LN', 'Ln', 'Ln.'],
        'TRAIL': ['TRL', 'Trl', 'Tr'],
        'COURT': ['CT', 'Ct'],
        'CIRCLE': ['CIR', 'Cir'],
        'PLACE': ['PL', 'Pl'],
        'WAY': ['WY', 'Wy']
    };

    // Check if canonical name ends with a type
    for (const [fullType, abbreviations] of Object.entries(typeMap)) {
        if (canonicalName.endsWith(' ' + fullType)) {
            const baseName = canonicalName.slice(0, -fullType.length - 1);

            // Add abbreviated versions
            for (const abbrev of abbreviations) {
                variations.push(baseName + ' ' + abbrev);
            }

            // Add version without type
            variations.push(baseName);

            break;
        }
    }

    // Add lowercase version of canonical
    variations.push(canonicalName.toLowerCase());

    return variations;
}
```

### CLASS_REGISTRY Update

Add StreetName to the serialization class registry in `classSerializationUtils.js`:

```javascript
CLASS_REGISTRY['StreetName'] = typeof StreetName !== 'undefined' ? StreetName : null;
```

---

## SECTION 10: SUMMARY FOR HUMAN READERS

This section restates the key points in plain language for human review.

### What We Are Doing

We are creating a NEW file that stores Block Island street names as objects that know about alternative spellings. This is separate from the existing street file used by the VisionAppraisal download process.

### Two Different Files

1. **VA Processing File**: The simple list of streets used to organize VA downloads. The Second Button creates this. We do NOT change it.
2. **StreetName Alias Database**: A NEW file with smart street objects. Used for entity recognition and address matching.

### Why We Are Doing This

The phone book and other data sources have different ways of writing the same street. "CORN NECK ROAD" might appear as "Corn Neck Rd" or just "CORN NECK". The current system cannot match these as the same street. The new system will.

### VisionAppraisal Is The Authority

VisionAppraisal is the PRIMARY source for street names. The VA download process works BY STREET, so every street in VA is guaranteed to exist in the database. The phonebook only ADDS alternative spellings for streets that already exist - it cannot create new streets.

### How It Works

Each street will have a "canonical" (official) name from VA and a list of alternative spellings. When the system sees any of these spellings, it will recognize them as the same street.

### When Block Island Logic Applies

Block Island detection uses a priority hierarchy:
1. **ZIP code 02807**: Definitive BI indicator
2. **City = "Block Island" or "New Shoreham"**: Definitive BI indicator
3. **Street matches BI street database**: For addresses without VisionAppraisal line tags, a street match alone determines BI status
4. **VisionAppraisal property location**: Property addresses are assumed BI
5. **Missing city/state/zip (fallback only)**: If none of the above apply and location info is missing, assume BI

This new StreetName alias system will IMPROVE Tier 3 detection by matching more street variations.

### What About the Address Parser?

We use a third-party library that splits "CORN NECK ROAD" into "CORN NECK" (street) and "Rd" (type). This is a problem because our canonical names include the type. The solution is to include all the split variations in our synonyms, so "CORN NECK" alone will still match "CORN NECK ROAD".

### Phonebook Connection

When we parse the phone book and see a new way of writing a street, we can add it to the synonyms list for an EXISTING VA street. This makes the system smarter over time. The phonebook cannot add new streets - only new spellings.

### Implementation Order

0. **Capture baseline** - Record current system behavior (group memberships, score distributions) before any changes
1. Create the new StreetName class
2. Create the NEW StreetName Alias Database file (converted from current VA streets)
3. Update the loading code - **verify identical results to baseline**
4. Connect it to address processing - **verify identical results to baseline**
5. Update address comparison (design finalized after Phase 4 learnings)
6. Add the phonebook synonym pipeline
7. Rebuild and validate
8. Add VA post-process button (deferred - runs after VA download to sync the alias database)

**Key principle**: Phases 1-4 must produce IDENTICAL system outputs to the baseline. Any deviation is investigated before proceeding.

---

## SECTION 11: SUMMARY FOR AI READERS

This section restates the architecture in a format optimized for AI parsing.

### CRITICAL: Two-File Architecture

**File 1: VA Processing Street File**
- Google Drive ID: `1lsrd0alv9O01M_qlsiym3cB0TRIdgXI9`
- Format: Simple JSON array of strings
- Purpose: Chunking mechanism for VA download (Second Button → Third/Fourth Buttons)
- Rule: NEVER modified by this project

**File 2: StreetName Alias Database**
- Google Drive ID: NEW (to be created in Phase 2)
- Format: Serialized StreetName objects with aliases
- Purpose: Entity recognition, address comparison, BI detection
- Primary source: VisionAppraisal (authoritative)
- Augmented by: Phonebook (synonyms only, no new streets)

### Data Source Hierarchy

**VisionAppraisal is PRIMARY and AUTHORITATIVE**
- VA data is downloaded BY STREET
- Invariant: Every VA entity's street MUST exist in StreetName Alias Database
- New streets come ONLY from VA
- Phase 8 (VA post-process button) maintains this invariant after VA downloads

**Phonebook AUGMENTS, does not create**
- Phonebook adds synonym variations to EXISTING VA streets
- Unrecognized phonebook streets → "unresolved" entries for human review
- Phonebook CANNOT add new canonical streets

### Core Data Structures

**StreetName** extends SimpleIdentifiers extends Aliased.
- primaryAlias: AttributedTerm with canonical street name (from VA)
- alternatives: Aliases object containing homonyms, synonyms, candidates

**BlockIslandStreetDatabase** manages StreetName objects.
- streets: Array of StreetName objects
- lookupIndex: Map from variation strings to StreetName objects
- lookup(string): Returns matching StreetName or null

### Detection Logic (EXPANDED BY THIS PLAN)

The existing Block Island detection hierarchy remains authoritative. This plan EXPANDS Tier 3 detection by enabling street variation matching.

Existing detection hierarchy (implemented in addressProcessing.js):
- Tier 1: zip === "02807"
- Tier 2: city matches "Block Island" or "New Shoreham" (case-insensitive)
- Tier 3: Street matches window.blockIslandStreets database (FOR NON-LINE-TAG ADDRESSES: determines BI status alone)
- Tier 4: VisionAppraisal property location (sourceType + fieldName check)
- Tier 5 (FALLBACK ONLY): city/state/zip all missing → assume BI

**This plan affects Tier 3**: Currently, "CORN NECK RD" may not match if database only has "CORN NECK ROAD". After implementation, the alias lookup will match variations, EXPANDING detection capability.

### Matching Logic

For Block Island addresses:
1. Get streetName string from parse-address output
2. Call blockIslandStreetDatabase.lookup(streetName)
3. If match found, store StreetName reference on Address.biStreetName
4. Address comparison uses biStreetName.compareTo() which checks all aliases

For off-island addresses:
1. Use standard streetName and streetType AttributedTerm comparison
2. No StreetName lookup

### Integration Points

Files requiring modification:
- aliasClasses.js: Add StreetName class
- classSerializationUtils.js: Add StreetName to CLASS_REGISTRY
- addressProcessing.js: Update loading and lookup
- aliasClasses.js (Address class): Add biStreetName property
- utils.js: Update addressWeightedComparison
- universalEntityMatcher.js: Update address comparison paths
- phonebookParser.js: Add synonym collection pipeline

### Constraints

- No two Block Island streets share the same base name
- Off-island addresses always have city/state/zip
- parse-address output separates and abbreviates street types
- Synonyms must include type variations and type-omitted forms

---

## SECTION 12: OPEN QUESTIONS

These items require future discussion or decision.

### Alias Threshold Values

The thresholds for categorizing aliases (homonym: 0.875, synonym: 0.845) were designed for personal names. They may need adjustment for street names. This requires testing with real street data.

### Automatic vs Manual Synonym Addition

Should phonebook-discovered variations be automatically added as synonyms, or should they require human review? Current plan: Add as candidates, require human promotion to synonyms.

### Database Update Mechanism

How will the updated street database be saved back to Google Drive? This needs a save function and possibly a UI for reviewing/promoting candidates.

### Backward Compatibility Period

How long should we maintain backward compatibility with the old string-array format? This affects the complexity of the loading code.

---

## SECTION 13: PHASE 2 IMPLEMENTATION - RESOLVED

**Status**: RESOLVED - Implementation complete, ready for conversion

**Date**: January 10, 2026

### Resolution Summary

The Phase 2 implementation issues from earlier in Session 37 have been resolved. The key decisions made:

1. **Comparison approach**: Strip street types entirely for comparison (not expand, not contract)
2. **Use existing function**: The converter uses `levenshteinSimilarity()` from utils.js (the same function used by production code)
3. **StreetName.compareTo()**: Deferred to later phase - not needed for conversion

### Final Implementation

The converter script uses a three-step comparison approach:

1. **Strip street types** from both strings (RD, ROAD, AVE, AVENUE, etc. removed entirely)
2. **Strip "OFF " prefix** when both streets start with it
3. **Compare stripped strings** using `levenshteinSimilarity()`

This approach:
- Ensures "CORN NECK ROAD" and "CORN NECK RD" match (both strip to "CORN NECK")
- Prevents false positives between unrelated "OFF X" streets
- Uses the exact same similarity function as production code

### Files Created

| File | Purpose | Lines |
|------|---------|-------|
| `scripts/streetTypeAbbreviations.js` | Abbreviation table management, stripping logic | ~800 |
| `scripts/streetNameDatabaseConverter.js` | Conversion script, clustering, serialization | ~785 |

### Design Evolution

The comparison logic went through several iterations during Session 37:

1. **First attempt**: Expand abbreviations (RD → ROAD) before comparison
   - Problem: Made strings longer, inflated similarity scores, caused false positives

2. **Second attempt**: Contract to shortest abbreviation (ROAD → RD) before comparison
   - Problem: Still had issues with "OFF " prefix inflation

3. **Final approach**: Strip street types entirely, strip "OFF " when both have it
   - Works correctly: focuses comparison on core street name only

### User Testing

User ran `previewSimilarStreets()` and reviewed results. Confirmed "no disturbing results" with the final stripping logic.

---

## SECTION 14: UPCOMING TASKS (3-Task Roadmap)

This section describes the next phase of development after Phases 0-5 are complete. The original Phases 6-8 have been reorganized into this 3-task structure.

### Task 1: Create Database Maintenance Box in Browser

**Status**: AWAITING_USER_SPECIFICATION

**Description**: (User to provide details)

**Purpose**: TBD

**Implementation**: TBD

---

### Task 2: Create Aliased Term Database Wrapper

**Status**: AWAITING_USER_SPECIFICATION

**Description**: (User to provide details)

**Purpose**: TBD

**Implementation**: TBD

---

### Task 3: Integrate Phonebook Data and Generalize Model

**Status**: PLANNED

**Description**: Incorporate phonebook variations into the StreetName database, then generalize the pattern for other aliased term types.

#### Key Principle: Phonebook Augments, VA Is Primary

**VisionAppraisal is the PRIMARY and AUTHORITATIVE source for street names.** If a street is not in VA, it does not exist on Block Island (from our data model's perspective).

The phonebook's role is to:
- Add **candidate variations** for streets that already exist in the VA-based database
- Identify potential data quality issues when phonebook streets don't match any VA street

The phonebook does NOT add new canonical streets - it only adds alternative spellings for existing ones.

#### Current Phonebook Street Handling

The phonebook parser in `phonebookParser.js` currently:

1. Extracts street names from phone book entries
2. Normalizes and looks up in `window.blockIslandStreets`
3. Reports unvalidated streets (streets not found in database)
4. Stores `streetNormalized` if a match is found

#### Proposed Phonebook Integration

After Task 3 implementation:

1. Phonebook parser looks up extracted street in StreetName database
2. If exact match found: Use canonical StreetName
3. If similar match found: Add extracted string as new **candidate** to the EXISTING StreetName
   - Phonebook context provides the circumstantial evidence that validates the variation
   - This bypasses the synonym staging area because phonebook presence IS verification
4. If no match found: Add as "unresolved" entry for human review

#### Why Phonebook Entries Become Candidates (Not Synonyms)

Phonebook variations have **circumstantial verification**:
- The phonebook is a trusted source (real addresses used by real residents)
- If a variation appears in the phonebook, someone actually used that spelling for mail delivery
- This contextual evidence promotes the variation directly to candidate status

Synonyms are for **similarity-based captures** that need verification. Phonebook entries already have verification through their source.

#### Handling Unrecognized Phonebook Streets

When a phonebook street doesn't match any VA street, it could be:
- A variation/misspelling of an existing street (most common)
- A data entry error in the phonebook
- A real street that VA doesn't have (rare, but possible if VA data is incomplete)

The system will:
1. Store unrecognized streets as "unresolved" or "conditional" entries
2. Flag them for human review
3. Allow manual resolution: assign to existing street as candidate, or mark as error

This provides flexibility without violating the principle that VA is authoritative.

#### Candidate Feedback Pipeline

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

#### Human Review for Unrecognized Streets

Some phonebook entries may be:
- Misspellings that should NOT be added to any street
- Legitimate variations that SHOULD become candidates for an existing street
- Completely unrecognized streets that need investigation

Unrecognized streets (no similar match) require human review. Once resolved, they can be added as candidates to the appropriate street.

#### Subtasks (preliminary)

1. Modify phonebook parsing to look up StreetName objects in the alias database
2. Collect new variations as candidates (phonebook AUGMENTS, does not create new streets)
3. Handle unrecognized phonebook streets as "unresolved" entries for human review
4. Create mechanism to review and promote candidates to synonyms
5. Save updated database back to Google Drive
6. Rebuild unified entity database with updated street architecture
7. Full regression testing
8. Generalize pattern for other aliased term types

#### VA Post-Process Button (Deferred Component)

**Note**: This was originally Phase 8, now a deferred component of Task 3.

**Location**: Add button next to Fourth Button in Step A1 of index.html

**Purpose**: After a VA download completes, update the StreetName Alias Database to reflect any changes in VA's street data.

**Why this is deferred**: This button's implementation can be isolated from the rest of the project. The core alias architecture can be developed and tested using the CURRENT VA street data. The post-process button is only needed when VA data is re-downloaded, which is infrequent.

Tasks (preliminary):
1. Add UI button next to Fourth Button
2. Compare newly downloaded VA streets against StreetName Alias Database
3. Add any NEW streets from VA (creates new StreetName objects with auto-generated synonyms)
4. Flag any streets REMOVED from VA for human review
5. Maintain the invariant: every VA entity's street exists in the alias database

**Trigger condition**: Run after Fourth Button completes (or after "Go Again" completes all retries)

---

## DOCUMENT END

**Document Version**: 3.0

**Last Updated**: January 26, 2026

**Update History**:
- 3.0 (2026-01-26): **PHASES 0-5 COMPLETE, 3-TASK ROADMAP** - Marked all phases 0-5 as USER_VERIFIED_COMPLETE. Reorganized Phases 6-8 into new 3-task roadmap (Task 1: Database Maintenance Box, Task 2: Aliased Term Database Wrapper, Task 3: Phonebook Integration & Generalization). Added SECTION 14 for upcoming tasks. Current system state: 1,869 groups.
- 2.0 (2026-01-17): **PHASES 0-4 USER_VERIFIED_WORKING** - Updated QUICK START to show Phase 5 ready. Phase 3 invariant test: 1,974/1,976 groups identical (1 acceptable merge of FireNumber:259 entities). Phase 4 invariant test: identical to Phase 3 (biStreetName populated but not used). Updated all phase statuses in Section 8. Added Phase 5 key questions to QUICK START.
- 1.8 (2026-01-11): **BUG FIX VERIFIED - READY FOR INVARIANT TESTING** - Re-ran conversion after bug fix. Results: 116 StreetName objects, 208 variations indexed, 18 collision merges, **0 missing streets** (verified against original 207). Additional fix: removed duplicate `const STREETNAME_ALIAS_DATABASE_ID` declaration from streetNameDatabaseConverter.js (was also in addressProcessing.js, causing "Identifier already declared" error). Added QUICK START section at top of document for easier session resumption.
- 1.7 (2026-01-10): **PHASE 3 IMPLEMENTATION + BUG FIX** - Implemented Phase 3 loading. **CRITICAL BUG DISCOVERED**: 18 streets missing due to normalization collisions. Bug fix: collision detection now merges by adding new original as homonym alias.
- 1.6 (2026-01-10): **PHASE 2 COMPLETE** - Created streetTypeAbbreviations.js and streetNameDatabaseConverter.js. Final comparison logic: strip street types entirely.
- 1.5 (2026-01-10): BLOCKED STATUS - Phase 2 implementation issues needing user clarification.
- 1.4 (2026-01-10): **Two-File Architecture** clarification. VA Processing Street File vs StreetName Alias Database.
- 1.3 (2026-01-10): Phase 0 and Phase 1 CODED_NOT_TESTED. Baseline results captured.
- 1.2 (2026-01-09): Added baseline capture and regression testing protocol.
- 1.1 (2026-01-09): Corrected detection hierarchy.
- 1.0 (2026-01-09): Initial creation

**Sources consulted for AI-readable documentation best practices**:
- [Writing documentation for AI: best practices - kapa.ai](https://docs.kapa.ai/improving/writing-best-practices)
- [How to structure documentation for both AI and human readers - Mintlify](https://www.mintlify.com/blog/structure-documentation-AI-human-readers)
