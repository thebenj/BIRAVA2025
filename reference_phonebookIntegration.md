# Supplemental Data Source Integration Plan

**Document Purpose**: Plan for integrating phonebook and email data with EntityGroups to augment existing contacts with phone numbers and email addresses.

**Document Status**: IN_PROGRESS (Section 7 USER_VERIFIED_COMPLETE, Section 4 REVISED AND PENDING)

**Last Updated**: February 3, 2026

---

## QUICK START

### Current State
- Phases 0-5 of StreetName architecture: COMPLETE
- Task 1 (Database Maintenance Box): COMPLETE
- Task 2 (AliasedTermDatabase): COMPLETE
- IndividualNameDatabase system: COMPLETE
- EntityGroup Collections: COMPLETE
- **Task 3 (Supplemental Data Integration)**: THIS DOCUMENT
  - Section 7 (IndividualName lookup): USER_VERIFIED_COMPLETE
  - Section 4 (Phonebook/Email Integration): PENDING - REVISED February 3, 2026

### Prerequisites Complete
- EntityGroup database with member collections (`individualNames{}`, `blockIslandAddresses{}`, etc.)
- IndividualNameDatabase with `lookupExisting()` pattern
- AliasedTermDatabase wrapper pattern established

---

## SECTION 1: OVERVIEW

### Goal
Integrate supplemental data sources (phonebook, email lists) with existing EntityGroups to:
1. Match source entities against existing EntityGroups
2. Augment matched groups with phone numbers and email addresses
3. Create new EntityGroups for unmatched entities
4. Log potential IndividualName database entries (without modifying the database)

### Key Principle: EntityGroups Are Primary

**EntityGroups built from VisionAppraisal + Bloomerang are the PRIMARY and AUTHORITATIVE representation of real-world persons/households.** Supplemental data sources augment these existing groups.

The supplemental data's role is to:
- Add **phone numbers** and **email addresses** to entities within existing groups
- Identify **new contacts** not present in VA or Bloomerang
- **NOT** to modify the fundamental entity structure or group membership

### Data Sources

| Source | Fields Available | Match Capabilities |
|--------|------------------|-------------------|
| Phonebook | Name, Address, Phone | Full match, Name-only, Address-only |
| Email List | Name, Email | Name-only (no address available) |

---

## SECTION 2: PROCESSING ARCHITECTURE

### When Processing Happens

```
VA + Bloomerang → EntityGroup Database (existing workflow)
                        ↓
              Phonebook Processing (new buttons) ← THIS DOCUMENT
                        ↓
              Email Processing (future, same pattern)
```

Processing is an **augmentation step** that runs AFTER EntityGroup construction is complete. It is triggered via UI buttons, not automatically.

### Data-Driven Matching Algorithm

The matching algorithm adapts based on what data the source entity has:

1. **If entity has name** → attempt name matching against EntityGroup name collections
2. **If entity has address** → attempt address matching against EntityGroup address collections
3. **Classify result** based on what matched:
   - Both matched same group → **Full match**
   - Name only matched → **Name match**
   - Address only matched → **Address match**
   - Neither matched → **No match**

This single algorithm handles all sources - phonebook entities (with name + address) can achieve any match type, while email entities (name only) can only achieve name matches.

---

## SECTION 3: MATCH SPECIFICATION

### Match Type Definitions

| Match Type | Condition |
|------------|-----------|
| **Full Match** | Entity's name matches a member of the EntityGroup's name collections AND entity's address matches a member of the EntityGroup's address collections |
| **Name Match** | Entity's name matches a member of an EntityGroup's name collections, BUT no address match to that group, AND there is no OTHER EntityGroup for which it has both a name and address match |
| **Address Match** | Entity's address matches a member of an EntityGroup's address collections, BUT no name match to that group, AND there is no OTHER EntityGroup for which it has both a name and address match |
| **No Match** | Entity matches no EntityGroup's name or address collections |

### Priority Rules

**Full matches supersede partial matches.** When a source entity has a full match to ANY EntityGroup:
- Ignore all name-only matches for that entity
- Ignore all address-only matches for that entity
- Process only the full match(es)

Name-only and address-only matches are only processed when the entity has NO full matches anywhere.

### Multiple Match Handling

A source entity CAN have multiple matches of the same type:
- Multiple full matches to different EntityGroups
- Multiple name-only matches (when no full match exists)
- Multiple address-only matches (when no full match exists)

The code takes action on ALL relevant matches (not just the first/best).

---

## SECTION 4: PHONE NUMBER ASSIGNMENT SPECIFICATION

### Phone Number Aliased Structure

Phone numbers use the Aliased pattern (like IndividualName):
- **Primary**: The main/preferred phone number
- **Candidates**: Additional known phone numbers

**Matching rule**: Phone numbers match as identical or not identical. Comparison normalizes:
- Remove all punctuation (dashes, parentheses, spaces)
- Handle 401-466 area code presence/absence (Block Island exchange)

**Addition rule**: Unless in a special data correction case, new phone numbers are added as **candidates**, not as primary.

### Assignment Logic

When a source entity matches an EntityGroup, determine which entity member(s) receive the phone number:

#### For Full Match
Find entity members that hold BOTH:
- The member of the name collection that the source matched to, AND
- The member of the address collection that the source matched to

#### For Name Match
Find entity members that hold the matched name.

#### For Address Match
Find entity members that hold the matched address.

### Entity Type Filtering

If multiple entities qualify for phone number assignment but are of **different entity types**, only assign to those matching the **source entity's type**.

Example: If a phonebook Individual matches an EntityGroup containing both an Individual and an AggregateHousehold, only the Individual receives the phone number.

### AggregateHousehold Propagation Rules

Phone numbers propagate bidirectionally between AggregateHouseholds and their members, with loop prevention:

| Trigger | Action |
|---------|--------|
| Phone assigned to household (NOT via member propagation) | Add as candidate to EACH member's phone alias (if not already present) |
| Phone assigned to household member (NOT via household propagation) | Add as candidate to household's phone alias |

**CRITICAL: Loop Prevention**
The propagation rules must track WHY a number is being added to prevent:
```
Household gets number → propagates to members →
member "gets" number → propagates back to household → INFINITE LOOP
```

Implementation must distinguish between:
- Direct assignment (triggers propagation)
- Propagated assignment (does NOT trigger further propagation)

---

## SECTION 5: UNMATCHED ENTITY HANDLING

When a source entity has no full match, no name match, and no address match to any EntityGroup:

1. **Create a new EntityGroup** for this entity
2. **Log** that this implies a potential new IndividualName database entry may be needed

### IndividualName Database Policy

During phonebook/email processing:
- **DO NOT** create new IndividualName entries on Google Drive
- **DO NOT** modify existing IndividualName entries
- **DO** log suggestions for potential new entries for later human review

This preserves the integrity of the IndividualName database while capturing information about potential additions.

---

## SECTION 6: IMPLEMENTATION TASKS (REVISED February 3, 2026)

### Phase A: Foundation

| # | Task | Description | Status |
|---|------|-------------|--------|
| 4.1 | Analyze phonebook data structure | Understand current phonebookParser.js, data format, existing entity creation | PENDING |
| 4.2 | Design matching algorithm | General algorithm using EntityGroup collections; data-driven match type determination | PENDING |
| 4.3 | Design phone number Aliased structure | If not already present, design primary/candidate structure for phone numbers | PENDING |
| 4.4 | **Test:** Verify phone Aliased structure | Create test instances, verify primary/candidate behavior | PENDING |

### Phase B: Matching Implementation

| # | Task | Description | Status |
|---|------|-------------|--------|
| 4.5 | Implement EntityGroup collection lookup | Efficient lookup against individualNames{}, blockIslandAddresses{}, etc. | PENDING |
| 4.6 | **Test:** Verify collection lookup | Test against known EntityGroups with various name/address combinations | PENDING |
| 4.7 | Implement match classification | Determine Full/Name-only/Address-only/None based on what matched | PENDING |
| 4.8 | **Test:** Verify match classification | Test each classification path with sample data | PENDING |
| 4.9 | Implement match priority logic | Full matches supersede partial; handle multiple matches | PENDING |
| 4.10 | **Test:** Verify priority and multiple match handling | Test scenarios with overlapping matches | PENDING |

### Phase C: Assignment Implementation

| # | Task | Description | Status |
|---|------|-------------|--------|
| 4.11 | Implement entity qualification logic | Find entities holding matched name AND/OR address | PENDING |
| 4.12 | Implement entity type filtering | Only assign to entities matching source entity type | PENDING |
| 4.13 | **Test:** Verify qualification and filtering | Test with mixed entity types in groups | PENDING |
| 4.14 | Implement phone number assignment | Add as candidate to qualifying entities' phone Aliased | PENDING |
| 4.15 | **Test:** Verify phone assignment | Confirm numbers added as candidates correctly | PENDING |
| 4.16 | Implement AggregateHousehold propagation | Bidirectional propagation with loop prevention | PENDING |
| 4.17 | **Test:** Verify propagation and loop prevention | Test household-member propagation, confirm no infinite loops | PENDING |

### Phase D: Edge Cases & Logging

| # | Task | Description | Status |
|---|------|-------------|--------|
| 4.18 | Handle unmatched entities | Create new EntityGroup for entities with no matches | PENDING |
| 4.19 | **Test:** Verify new EntityGroup creation | Confirm unmatched entities become new groups | PENDING |
| 4.20 | Implement IndividualName logging | Log potential new IndividualName entries (no DB modification) | PENDING |
| 4.21 | Implement processing log | Track all matches, assignments, new groups created | PENDING |
| 4.22 | **Test:** Verify logging output | Confirm logs capture expected information | PENDING |

### Phase E: UI & Integration

| # | Task | Description | Status |
|---|------|-------------|--------|
| 4.23 | Create phonebook processing button(s) | UI to trigger phonebook processing after EntityGroups built | PENDING |
| 4.24 | **Test:** End-to-end phonebook processing | Full workflow test with real phonebook data | PENDING |
| 4.25 | Design for email reusability | Ensure architecture supports email processing with same pattern | PENDING |
| 4.26 | **Test:** Verify email compatibility | Test matching algorithm with name-only data (no address) | PENDING |

### Deferred Items

- **Specific matching criteria** (thresholds, exact vs fuzzy) - to be specified during implementation
- **Logging format and storage location** - to be detailed later
- **UI button workflow specifics** - to be detailed later
- **VA Post-Process Button** - Originally Phase 8 of StreetName architecture; only needed when VA data is re-downloaded (infrequent)

---

## SECTION 7: INDIVIDUALNAME LOOKUP IMPLEMENTATION

**Status: USER_VERIFIED_COMPLETE (February 2, 2026)**

### Purpose
Before creating a new IndividualName object during entity parsing, check if a matching IndividualName already exists in the IndividualNameDatabase. If so, return the existing object instead of creating a new one.

### IndividualName Instantiation Points

**VisionAppraisal (visionAppraisalNameParser.js)** - 20 instantiation points in case processors

| Case | Type | Notes |
|------|------|-------|
| 1 | Individual | 2-word: LAST, FIRST |
| 2 | Individual | Trailing comma |
| 3 | Individual | 2-word: FIRST LAST |
| 5 | Individual | 3-word with middle |
| 6 | Individual | Middle comma |
| 7 | Individual | Case 7 pattern |
| 8 | Individual | 3-word variant |
| 9 | Individual | 3-word standard |
| 10 | Individual | 3-word standard |
| 18 | Individual | 4-word pattern |
| 33 | Individual | CATCH-ALL: entire name in lastName |

**Bloomerang (bloomerang.js)** - 1 instantiation point at line ~1226

**Excluded from lookup:**
- Deserialization (aliasClasses.js) - restores saved data
- Database building (individualNameDatabaseBuilder.js) - creates canonical names

### Lookup Specification

**Match Criteria**: Any four-score category >= 0.99
```javascript
function isMatch(compareToResult) {
    return compareToResult.primary >= 0.99 ||
           compareToResult.homonym >= 0.99 ||
           compareToResult.synonym >= 0.99 ||
           compareToResult.candidate >= 0.99;
}
```

**Action on Match**: Return the existing IndividualName object from the database (preserves Google Drive file ID linkage)

**Object Reuse**: Shared object identity is the desired behavior - multiple entities may reference the same IndividualName object.

### Implementation Architecture

**Option D was implemented**:
- `numericCompareTo()` returns single weighted score (0-1) for entity matching
- `compareTo()` returns four-score object `{ primary, homonym, synonym, candidate }` for database lookup
- `safeNumericCompare()` helper handles polymorphic comparison calls

**Key Files Modified:**
- `aliasClasses.js` - Added numericCompareTo() to Aliased, compareTo() override to IndividualName, safeNumericCompare() helper
- `individualNameDatabase.js` - Added lookupExisting() method with BYPASS flag
- `bloomerang.js` - Uses resolveIndividualName() in createNameObjects()
- `visionAppraisalNameParser.js` - Uses resolveIndividualName() in createIndividual()
- `utils.js` - Added resolveIndividualName() common function

---

## SECTION 7A: RECURSION FIX

### Problem
When `compareTo()` used `parsePhonebookNameWithCase31()` for parsing, it triggered full entity creation which called `resolveIndividualName()` which called `lookupExisting()` which called `compareTo()` - infinite recursion.

### Solution
Added `returnComponentsOnly` parameter to all case processors in visionAppraisalNameParser.js. When true, processors return `{entityType, firstName, lastName, otherNames, fullName}` BEFORE entity creation.

Created `getNameComponentsFromCase31()` in phonebookParser.js that calls processors with `returnComponentsOnly=true`.

Updated `getComponents()` in IndividualName.compareTo() to use `getNameComponentsFromCase31()` instead of `parsePhonebookNameWithCase31()`.

**Call chain after fix:**
```
compareTo() → getComponents() → getNameComponentsFromCase31()
    → processor(returnComponentsOnly=true)
    → returns {firstName, lastName, ...} [NO ENTITY CREATION]
```

---

## SECTION 7B: ENTITYTYPE FILTERING

### Problem
Database entries with business-like names (e.g., "LLC Sea") routed to Business case processors during `getComponents()`, causing null pointer errors (`record.pid` was null).

### Solution
1. All case processors now return `entityType` property when `returnComponentsOnly=true`
2. `getComponents()` filters out non-Individual types (returns null)
3. Names that parse as Business/Household use fallback simple string comparison

**EntityType Mapping:**
- **Individual**: Cases 1, 2, 3, 5, 6, 7, 8, 9, 10, 18, 33
- **Business**: Cases 0, 4, 4N, 12, 13, 14, 19, 20, 21N, 31
- **AggregateHousehold**: Cases 11, 15a, 15b, 16, 17, 25, 26, 27, 28, 29, 30, 32
- **LegalConstruct**: Case 34

---

## SECTION 7C: TESTING

### Test Scripts
`scripts/diagnostics/entitySourceAnalysis.js`

### Test Functions
```javascript
analyzeBloomerangFile(fileId)      // Entity counts, source distribution, alias counts
analyzeVisionAppraisalFile()       // Same metrics for VA
compareAnalysisResults(b, t, l1, l2) // Compare two runs
trackDatabaseUsage(entities)       // Database entry usage statistics
```

### Complete Test Plan

**Prerequisites:**
1. Application loaded at http://127.0.0.1:1337/
2. IndividualNameDatabase loaded
3. Browser console open (F12)

#### Part 1: Baseline (BYPASS = TRUE)
```javascript
window.BYPASS_INDIVIDUALNAME_LOOKUP = true;
```
Click "Process Bloomerang CSV", note file ID.

#### Part 2: Analyze Baseline Bloomerang
```javascript
const baselineBloomerang = await analyzeBloomerangFile('FILE_ID_HERE');
```
Click "Create Entities from Processed Data".

#### Part 3: Analyze Baseline VA
```javascript
const baselineVA = await analyzeVisionAppraisalFile();
```

#### Part 4: Test (BYPASS = FALSE)
```javascript
window.BYPASS_INDIVIDUALNAME_LOOKUP = false;
```
Click "Process Bloomerang CSV", note NEW file ID.

#### Part 5: Analyze Test Bloomerang
```javascript
const testBloomerang = await analyzeBloomerangFile('NEW_FILE_ID');
```
Click "Create Entities from Processed Data".

#### Part 6: Compare Results
```javascript
const testVA = await analyzeVisionAppraisalFile();
compareAnalysisResults(baselineBloomerang, testBloomerang, 'BYPASS=TRUE', 'BYPASS=FALSE');
compareAnalysisResults(baselineVA, testVA, 'BYPASS=TRUE', 'BYPASS=FALSE');
```

### Test Results (Session 89 - Combined Analysis)

| Metric | Bloomerang | VisionAppraisal |
|--------|------------|-----------------|
| Standalone individuals from DB | 1361 | 428 |
| Household members from DB | 0 | 838 |
| **Total from DB** | 1361 (100%) | 1266 (100%) |

**Database Usage:**
| Metric | Count |
|--------|-------|
| Total database entries | 2108 |
| Unused | 0 |
| Used once | 1719 |
| Used multiple times | 389 |

**Interpretation:** The lookup system is working correctly. All 2108 IndividualNameDatabase entries are being used. The 838 VA household members (individuals inside AggregateHouseholds) are correctly looked up from the database.

### Test Status: USER_VERIFIED_COMPLETE (February 2, 2026)

---

## APPENDIX A: COMPARISON TO ORIGINAL PLAN

The original Section 4 (written earlier) focused on **StreetName database enrichment** - integrating phonebook street variations into the StreetName alias system. This was the wrong focus.

| Original Focus | Revised Focus (February 3, 2026) |
|----------------|----------------------------------|
| StreetName database enrichment | EntityGroup augmentation |
| Street name variations as candidates | Phone numbers/emails to entities |
| Unrecognized streets | Unmatched entities → new EntityGroups |
| StreetName lookup | EntityGroup collection lookup |
| 7 tasks | 26 tasks (comprehensive with integrated testing) |

The actual goal is **entity-to-EntityGroup matching** - taking phonebook (and later email) data and matching it against the existing EntityGroup database to augment groups with phone numbers and email addresses.

---

## DOCUMENT END

**Document Version**: 3.0
**Last Updated**: February 3, 2026 (Section 4 completely revised; Sections 1-5 rewritten for new focus)
