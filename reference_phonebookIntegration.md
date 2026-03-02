# Supplemental Data Source Integration Plan

**Document Purpose**: Plan for integrating phonebook and email data with EntityGroups to augment existing contacts with phone numbers and email addresses.

**Document Status**: IN_PROGRESS (Section 7 USER_VERIFIED_COMPLETE, Phase B heuristics calibrated — recall 91.2%, precision 94.3% after Session 118 review. Non-human detection finalized at 98.6% / 0% false positive. Architecture revised Session 117: persistent PhonebookDatabase with automatic integration replaces runtime augmentation approach. Prerequisites P-1 and P-2 COMPLETE.)

**Last Updated**: February 25, 2026 (v5.2 — P-1/P-2 complete, Session 118)

---

## QUICK START

### Current State
- Phases 0-5 of StreetName architecture: COMPLETE
- Task 1 (Database Maintenance Box): COMPLETE
- Task 2 (AliasedTermDatabase): COMPLETE
- IndividualNameDatabase system: COMPLETE
- EntityGroup Collections: COMPLETE
- Phone Intake from Bloomerang CSV: COMPLETE
- **Task 3 (Supplemental Data Integration)**: THIS DOCUMENT
  - Section 7 (IndividualName lookup): USER_VERIFIED_COMPLETE
  - Phase A (Analysis): COMPLETE
  - Phase B (Matching heuristics): CALIBRATED (recall 91.2%, precision 94.3% — Sessions 106-118)
  - **Prerequisites P-1 and P-2**: COMPLETE (Session 118)
  - **Phases C-E SUPERSEDED** by persistent database architecture (Session 117)
  - **Revised Phases 1-8**: See **reference_phonebookDatabasePlan.md** for full plan; Section 6 "ARCHITECTURAL REVISION" for key decisions

### Prerequisites Complete
- EntityGroup database with member collections (`individualNames{}`, `blockIslandAddresses{}`, etc.)
- IndividualNameDatabase with `lookupExisting()` pattern
- AliasedTermDatabase wrapper pattern established
- PhoneTerm class with normalization and Island detection
- ContactInfo phone slots (islandPhone, phone, additionalPhones)
- CollectivePhone pipeline

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

Processing is an **augmentation step** that runs during EntityGroup construction. Per the Session 117 architectural revision, phonebook data is automatically applied from the persistent PhonebookDatabase during `buildEntityGroupDatabase()`, after member collections are built. See **reference_phonebookDatabasePlan.md** Phase 6 for integration details.

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

> **Architectural note (Session 118)**: This section specifies the logic for APPLYING phone numbers to entities — which members receive the number, type filtering, and propagation rules. With the Session 117 database revision, the matching decision (which phonebook record maps to which group) is stored in PhonebookDatabase matchAssociations during Phase 3 (inaugural dataset creation). This section's logic executes during Phase 5/6 (application/integration), consuming those stored associations. See reference_phonebookDatabasePlan.md "Conceptual Issues" for details.

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

> **Architectural note (Session 118)**: With the Session 117 database revision, unmatched phonebook records are stored in PhonebookDatabase with empty matchAssociations (Phase 3.3). The "create a new EntityGroup" action described below is **deferred** — it would be a separate operation via PhonebookBrowser (Phase 7) or a future batch tool, not automatic during entity group integration. See reference_phonebookDatabasePlan.md "Conceptual Issues" for details.

When a source entity has no full match, no name match, and no address match to any EntityGroup:

1. **Store in PhonebookDatabase** with classification but empty matchAssociations
2. **Optionally create a new EntityGroup** for this entity (via maintenance tool, not automatic)
3. **Log** that this implies a potential new IndividualName database entry may be needed

### IndividualName Database Policy

During phonebook/email processing:
- **DO NOT** create new IndividualName entries on Google Drive
- **DO NOT** modify existing IndividualName entries
- **DO** log suggestions for potential new entries for later human review

This preserves the integrity of the IndividualName database while capturing information about potential additions.

---

## SECTION 6: IMPLEMENTATION TASKS (REVISED February 3, 2026)

### Phase A: Foundation (COMPLETE — Session 104)

Tasks 4.1-4.4 complete: phonebook data analysis, matching algorithm design, phone Aliased structure (pre-existing from phone intake work).

### Phase A Design Decisions (Session 104)

#### Address Matching
- **Gate**: Street must be a verified BI street for any street-based matching
- **Fire number present** (and verified BI street): Match on fire number alone (unique on island)
- **No fire number** (but verified BI street): Match on street name
- **PO Box**: Check `blockIslandPOBoxes{}` separately; when record has both street and box, check both
- **Existing Address.compareTo()** applies as-is — 0.85/0.15 fire-number/street weighting intentionally penalizes street-only matches

#### Name Matching
- Create temporary IndividualName(s) from phonebook record (two for couples)
- Compare against all names in EntityGroup members via `safeNumericCompare`
- Retain best scores and which names produced them

#### Overall Scoring
- **nameScore** = best name score across all group members (independent)
- **contactInfoScore** = best contactInfo score across all group members (independent)
- **overallScore** = entityWeightedComparison(bestNameScore, bestContactInfoScore)
- Apply four-condition MATCH_CRITERIA: overallAndName, contactInfoAlone, overallAlone, nameAlone

#### Individual Match: Standard four-condition MATCH_CRITERIA test

#### Couple Match:
- **Condition 1**: Either member passes four-condition test individually
- **Condition 2**: Both members' nameAlone > 0.845 (nearMatch), each matched to DIFFERENT names in group, AND contactInfoAlone > 0.85 (nearMatch)

#### If Matched — Integration:
- **Name**: `_tryMatchToExistingName` logic (homonym ≥0.875, candidate ≥0.845, else unrecognized)
- **Phone**: Check if already in group's phone collections; add if not
- **Address**: Check if matches/aliases existing address; integrate using alias threshold logic

#### If Never Matched: Create new EntityGroup, log potential IndividualName entry

#### contactInfoWeightedComparison Weight Change (Session 104 — CODED, ready for testing):
- Phone comparison added with same weight as email
- Primary involved: address 0.60, email 0.20, phone 0.20
- Secondary only: address 0.48148, email 0.25926, phone 0.25926
- Missing components renormalize automatically
- Implementation: `findBestPhoneMatch()` helper in utils.js (follows `findBestAddressMatch()` pattern)
- Files: utils.js (helper + Step 3b + weights + detailed), contactInfo.js (comment update)

### Phase B Design Decisions (Session 106)

#### Prerequisite 1: Build Collections for All Groups

Collections (`individualNames{}`, `blockIslandAddresses{}`, etc.) were previously only built for multi-member groups. Single-member groups (~1100 of 1879) had empty collections and would be invisible to phonebook lookup.

**Fix**: Remove the `hasMultipleMembers()` guard in `entityGroupBuilder.js` — build collections for every group unconditionally. A single-member group gets its one entity's name/address data in the collections. This makes the lookup code uniform with no branching on group size.

**Also**: `buildMemberCollections()` was previously called only inside `buildAllConsensusEntities()` (gated behind `buildConsensus` flag, which defaults to false). Moved to its own unconditional step in the build flow, running after construction and before `buildCollectiveContactInfo()`. (This fix was coded in Session 106.)

#### Prerequisite 2: Fire Number Extraction in Phonebook Parser

The phonebook parser currently stores the full street string (e.g., "123 Ocean View Road") without extracting the fire number separately. Since fire numbers are central to BI address matching, this extraction belongs in the parser — not downstream in the matcher.

**Parser change**: Add fire number fields to the address object during parsing:

| Field | Example | Description |
|-------|---------|-------------|
| `fireNumber` | `"123"` | Digits only (letter suffix stripped) |
| `fireNumberRaw` | `"123A"` | Original leading token as extracted |
| `hasCollisionSuffix` | `true` | True if raw contains non-digit characters (letter suffix) |
| `streetWithoutFireNumber` | `"Ocean View Road"` | Street field with leading fire number token removed |

**Extraction logic**: If the street field starts with digit(s), extract the leading token (up to first space). Strip non-digit characters for `fireNumber` (normalized). If the street does NOT start with a digit, all fire number fields are null.

**File**: `scripts/phonebookParser.js`

#### Architecture: New File for Matching Logic

**File**: `scripts/matching/phonebookMatcher.js` (NEW)

The parser (`phonebookParser.js`) handles parsing text into structured records. The matcher handles comparing those records against EntityGroups. These are separate concerns.

#### Phonebook Record Structure (After Parser Update)

```
record: {
  lineNumber, lineType, phone,
  name: { raw, lastName, firstName, secondName, otherNames,
          isBusiness, isCouple, caseType, entityType },
  address: { raw, street, streetNormalized, streetMatchConfidence,
             isValidBIStreet, box, town, isOffIsland,
             fireNumber, fireNumberRaw, hasCollisionSuffix,
             streetWithoutFireNumber }
}
```

Records stored in `window.phonebookResults.records[]` after parsing.

#### Core Function: `matchPhonebookRecordToGroups(record, groupDb, entityDb)`

For each EntityGroup in `groupDb.getAllGroups()`, perform name lookup, address lookup, and PO box lookup. Return raw match results per group for downstream classification.

**Iteration pattern**: The outer loop iterates all ~1879 EntityGroups. For each group, the inner loops iterate that group's collection entries — `Object.entries(group.individualNames)` for names, `Object.entries(group.blockIslandAddresses)` for addresses, etc. Each phonebook record is compared against every collection entry in every group. A hit is recorded whenever a comparison exceeds the relevant threshold. A single phonebook record may produce hits against multiple groups (multiple name hits, multiple address hits), and may hit the same group via both name and address (which downstream classification would identify as a Full Match).

**Output structure**:
```
{
  record,
  nameHits:    [{group, score, matchedGroupName, phonebookName}, ...],
  addressHits: [{group, matchedGroupAddress, isCollision}, ...],
  poBoxHits:   [{group, matchedBox}, ...]
}
```

#### Name Lookup

- Compare phonebook name against every entry in `group.individualNames{}` using `IndividualName.compareTo()`
- **How compareTo() handles plain objects**: The `IndividualName.compareTo()` method internally calls `getComponents()` to extract `{firstName, lastName, otherNames}` from whatever is passed in. `getComponents()` handles multiple input types via duck typing: full IndividualName objects (extracts alias data), plain objects with `{firstName, lastName, otherNames}` properties (uses them directly), raw strings (parsed via `getNameComponentsFromCase31()`), and objects with a `primaryAlias` property. For phonebook matching, we pass plain objects — `getComponents()` recognizes the `{firstName, lastName}` properties and uses them directly for comparison. No need to construct full IndividualName objects.
- Returns four-score `{primary, homonym, synonym, candidate}`; take max of primary, homonym, candidate (synonym is always 0). Each score represents the best match found when comparing the phonebook name against the group name's primary alias (primary score), verified variations stored in `alternatives.homonyms` (homonym score), and contextual alternatives in `alternatives.candidates` (candidate score).
- **Couples** (`record.name.isCouple`): Create TWO name objects — one per person (shared lastName, different firstName from `firstName` and `secondName`). Score each independently against the group's names. Each person in the couple may hit different groups or the same group (matching different names within it).
- Retain hits above minimum threshold (0.80) for downstream classification
- **Also check `group.unrecognizedIndividualNames{}`**: These are names found in the group's member entities that were NOT in the IndividualName database — they couldn't be resolved to a canonical database entry during collection building. They still represent real people in the group and a phonebook name might match them. The same `compareTo()` approach applies, though these names will typically have fewer aliases (no database-enriched homonyms/candidates), so matches against them will rely more heavily on the primary score.

#### Address Lookup — Block Island Street Addresses

**Core principle: Fire numbers are unique on Block Island. A fire number match on a recognized BI address IS an address match.**

**Gate**: Only attempt if the address is a recognized BI address (`isValidBIStreet === true`).

**Collection structure**: `group.blockIslandAddresses{}` keys are `{fireNum}:{streetKey}` (e.g., `"123:OCEAN VIEW ROAD"`). The streetKey is the canonical BI street database primary alias term.

**Lookup logic**:

| Phonebook has | Match condition | Rationale |
|---------------|----------------|-----------|
| Fire number + verified BI street | Normalized fire numbers match | Fire number alone is sufficient on BI. Street name is irrelevant when fire number matches — even if the phonebook street is a variation or unrecognized, as long as the address is known to be BI. |
| No fire number + verified BI street | Street name matches | Compare `record.address.streetNormalized` (canonical BI form) against streetKey portion of collection key (also canonical form). |
| Fire number + unvalidated street | Fire number match (if address confirmed BI by other means) | Edge case: address is known BI (e.g., zipcode 02807) but street name unrecognized. Fire number still unique on BI. |
| No fire number + no verified street | No address match possible | Cannot match without either a fire number or verified street. |

**Fire number normalization**: Strip trailing letter suffixes before comparison. "123A" and "123B" and "123" all normalize to "123". Letter suffixes indicate fire number collisions — multiple residences at the same base fire number.

**Collision flag (`isCollision`)**: When EITHER side of the fire number comparison has a letter suffix (the original raw value differs from the normalized digits-only value), flag the address hit as `isCollision: true`.

**Collision effect on MATCH_CRITERIA** (consumed by Task 4.7 classification): When `isCollision` is true, the `contactInfoAlone` condition of MATCH_CRITERIA is **disabled** for that match. The address alone is ambiguous at a collision fire number (could be residence A or B), so the match must have name corroboration — it must meet one of the other three MATCH_CRITERIA conditions (overallAndName, overallAlone, nameAlone), all of which incorporate the name score.

#### PO Box Lookup

- If `record.address.box` exists, check `group.blockIslandPOBoxes{}` for exact key match
- PO Box keys are the box identifier (e.g., "237", "A")
- Normalize box values before comparison (trim, uppercase)
- Per Section 3: when record has both street and box, check both independently

#### Off-Island Addresses (Deferred)

- Phonebook is primarily Block Island — off-island entries are rare
- Can iterate `group.offIslandAddresses[]` and compare town names if needed
- Defer unless testing reveals meaningful off-island phonebook entries

#### Batch Function: `matchAllPhonebookRecords(groupDb, entityDb)`

- Iterates `window.phonebookResults.records`
- Calls `matchPhonebookRecordToGroups()` for each record
- Returns array of all match results
- Logs progress every 100 records
- Stores results in `window.phonebookMatchResults`

#### Helper Functions

| Function | Purpose |
|----------|---------|
| `normalizeCollectionFireNumber(key)` | Parse collection key `"{fireNum}:{streetKey}"`, extract and normalize fire number (strip non-digit chars), return `{raw, normalized, hasLetterSuffix, streetKey}` |
| `createPhonebookNameObjects(record)` | Return array of 1 or 2 plain name objects: `[{firstName, lastName, otherNames}]` for individuals; add second entry for couples using `secondName` |

### Phase B Testing Results (Session 107)

#### Key Findings

1. **Phonebook data rarely contains fire numbers.** Only 2 of 1433 records have extractable fire numbers. Street-name-only matching is the dominant address matching mechanism.

2. **Street database gaps initially limited address matching.** 231 records (108 unique streets) failed the `isValidBIStreet` gate. These fell into four categories — existing-entry variations (apostrophe/abbreviation mismatches), new BI streets not yet in database, non-street locations (Town Hall, State Airport, etc.), and PO boxes mis-parsed into street field. **All resolved** in Sessions 108-110: database expanded from 123→152 entries, 285 variations; parser box detection improved; `Special::^::Cases` entry created for non-street BI locations.

#### Design Principle (from street resolution)

Expand the street name database with new entries/variations rather than building complex parser normalization. See reference_unvalidatedStreetGroupings.md for remaining status.

### Phase B: Infrastructure Fixes (Sessions 108-110)

**Flat file retirement:** All code converted from `window.blockIslandStreets` (flat Set) to `window.streetNameDatabase` (AliasedTermDatabase) native API. Files: phonebookParser.js, utils.js, addressProcessing.js, streetNameBrowser.js, streetArchitectureBaseline.js.

**Synonym exclusion fix (aliasedTermDatabase.js):** `_buildVariationCache()` was incorrectly including synonyms. Now only homonyms and candidates participate in `has()`/`lookup()`. Synonyms are unverified staging — excluded from matching. (Also in CLAUDE.md CRITICAL_LESSONS.)

**Special::^::Cases pattern:** Non-street BI locations (Town Hall, State Airport, Old Harbor Dock, etc.) stored as candidates on a StreetName entry with primary alias `Special::^::Cases` (never matches organically). Recognized as Island addresses for phonebook matching; screened out of street comparisons in entity matching.

**Street database expansion (Session 109):** Grew from 123→152 entries, 285 variations. See reference_unvalidatedStreetGroupings.md for remaining status.

### Phase B: Matching Implementation (Sessions 106-112)

All matching tasks coded and tested: EntityGroup collection lookup (4.5-4.6), match classification (4.7-4.8), match priority logic (4.9-4.10). See reference_sessionHistory_2026_February.md Sessions 106-112 for details.

### Section 4.7 Classification Implementation (Session 112)

**Location:** `scripts/matching/phonebookMatcher.js` (lines ~402-771)

#### Classification Thresholds (adapted from MATCH_CRITERIA)

Phonebook matching uses binary address (match/no match) rather than scored contactInfo. The four MATCH_CRITERIA conditions collapse to:

| Situation | Rule | Threshold | Rationale |
|---|---|---|---|
| Name + address (no collision) | Full Match | name >= 0.80 | Condition 2 passes (contactInfo=1.0 > 0.85), so name bar is lower |
| Name + address (collision) | Full Match | name >= 0.845 | Collision disables Condition 2; need Condition 4 (nameAlone) |
| Name only (no address) | Name Match | name >= 0.845 | Only Condition 4 can pass |
| Address only (no collision) | Address Match | — | Requires hasStrongAddressEvidence (fire number or PO box) |
| Address only (collision) | No Match | — | Collision disables Condition 2; no name for other conditions |
| Couple condition 2 | Full Match | both persons >= 0.845 to different group names + address | High confidence: both halves match |

**Address-only rule:** streetOnly matches cannot stand alone as address-only matches — they produce too much fan-out (59,655 group matches in first run). Only fire number hits or PO box hits qualify as "strong address evidence" for address-only classification. streetOnly matches can still contribute to Full Matches when combined with a name hit.

#### Classification Results (Session 112 baseline)

| Category | Records | Group-level matches |
|---|---|---|
| Full match | 392 | — |
| Name-only | 315 | — |
| Address-only | 17 | 26 |
| Name + address (partial, both types) | 9 | — |
| No match | 700 | — |
| **Total** | **1433** | — |
| Couple condition 2 | 82 | (subset of full matches) |

#### Functions Added

- `classifyPhonebookMatch(matchResult)` — classify single record's raw hits
- `checkCoupleCondition2(nameHits, record, thresholds)` — couple special case
- `classifyAllPhonebookMatches(matchResults)` — batch classifier, stores in `window.phonebookClassifiedResults`
- `inspectClassifiedMatch(recordIndex)` — diagnostic inspector

*Verification tests (6/6 passed Session 112) — see session history for details.*

### Non-Human Entity Analysis (Session 113)

**Purpose:** Analysis tooling for user to manually review and annotate 700 no-match phonebook records. Many are businesses/legal entities with no Bloomerang/VisionAppraisal presence.

**TEMPORARY Script:** `servers/Results/console_nonhumanAnalysis.js` — COMPOSITE word-by-word scoring (Levenshtein match per word, +1 for fire number/PO box match). Reports top 2 non-human entity matches per record. Output: CSV with annotation columns for user review.

**Business section assignment:** `isBusiness===true` OR `entityType==='Business'` OR `entityType==='LegalConstruct'` OR `caseType==='case0'`

**Result:** User annotated all 700 records. Annotations stored in `servers/progress/user_phonebook_annotations_2026-02-22.json` (PERMANENT).

### ARCHITECTURAL REVISION — Session 117 (February 24, 2026)

**Phases C, D, E SUPERSEDED** by persistent database architecture. The original plan assumed runtime augmentation via UI buttons. Session 117 dialog established a persistent PhonebookDatabase model with automatic integration during entity group building, consistent with IndividualNameDatabase and StreetNameDatabase patterns.

**Key decisions from Session 117 dialog:**
1. PhonebookDatabase as subclass of SupplementalDataDatabase (new base class). EmailDatabase will later extend the same base.
2. ALL records stored (persons, businesses, government, nonprofit, legal) — keyed by normalized phone number.
3. Two deliverables per matched record: phone number assignment + name variation assignment.
4. Name variations use EXISTING alias infrastructure: IndividualName aliases for persons (via AliasedTermDatabase), NonHumanName alternatives for businesses (via Aliased.addAlternative). New IndividualName entries created when needed, with user approval phase.
5. 733 primary-matched records auto-accepted without user review.
6. Within-group matching after group membership established uses relaxed but MATCH_CRITERIA-consistent thresholds.
7. Couples deferred until individual processing fully working.
8. Error reporting over fallbacks (especially avoiding phone-specific fallbacks that would cause issues adapting for email).
9. Documentation supports later email source adaptation.

**Session 117 heuristic improvements:**
- `&` and non-letter tokens filtered from all word lists (both phonebook and entity sides)
- Validation script updated: annotation-based exclusion (not Phase 1), corrected recall denominator
- Results after fixes: recall 88.7% (134/151), precision 76.1% (134/176)

### Revised Phases 1-8 (replacing C, D, E)

**Full implementation plan**: See **reference_phonebookDatabasePlan.md** for detailed 8-phase plan including sub-steps, entry structures, file lists, verification plan, and email reuse rationale.

**Phase summary**: (1) SupplementalDataDatabase base class, (2) PhonebookDatabase subclass, (3) Inaugural dataset creation + temporary script harvest, (4) Name variation processing, (5) Phone number assignment, (6) Automatic integration during entity group build, (7) PhonebookBrowser maintenance tool, (8) Future update workflow.

### P-1 and P-2 Results — Session 118 (February 25, 2026)

#### P-1: Heuristic Calibration Finalized

**Section 1** (17 user-matched, program missed): Authoritative matches, no heuristic changes needed. One correction: record 1398 (MOTT, THEORAN → SKY BLUE PINK, LLC group 959) was a user error — removed from authoritative matches. Leaves 16 true recall misses.

**Section 2a** (28 MEDIUM confidence, program matched, user didn't): User reviewed all 28. Results: 19 keep ("k"), 6 reject ("n"), 2 government ("g"), 1 business ("b"). The 19+13=32 "keep" records across 2a and 2b are added to authoritative matches. The 10 rejects (6n+2g+2b) are the first explicit phonebook exclusions.

**Section 2b** (14 HIGH confidence): User reviewed all 14. Results: 13 keep, 1 business. HIGH confidence was 100% accurate on person records.

**Major conclusion**: Algorithm should auto-accept best match at MEDIUM or HIGH confidence. Even at MEDIUM level, 19/22 person-record matches (86%) were correct. At HIGH, 13/13 (100%). This means Phase 3.3 can auto-accept algorithmic matches without per-record user review.

**Updated metrics** (after all corrections):
- True matches: 182 (was 151)
- Program correctly found: 166 (was 134)
- Program missed: 16 (was 17, MOTT correction)
- False positives: 10 (was 42)
- **Recall: 91.2%** (was 88.7%)
- **Precision: 94.3%** (was 76.1%)

**User annotations file**: `servers/Results/phonebook match - Sheet1.csv` (user's review with k/n/g/b codes)

#### P-2: Non-Human Detection Finalized

**Simplified architecture**: Three separate term lists (BUSINESS_TERMS, GOVERNMENT_TERMS, NONPROFIT_TERMS) merged into single `NON_HUMAN_TERMS` set. Regex pattern array eliminated entirely — single words moved to terms set, multi-word phrases moved to `KNOWN_NONHUMAN_NAMES`. Sub-classification (business vs government vs nonprofit) dropped as unnecessary complexity.

**Detection structure** (5 priorities, one return type):
1. Dash-prefix pattern (structural) → NONHUMAN
2. Possessive apostrophe-s on any name part (straight or curly) → NONHUMAN
3. Known non-human names (multi-word, checked against space-normalized input) → NONHUMAN
4. Single-word term check against NON_HUMAN_TERMS → NONHUMAN
5. Parser flags fallback (isBusiness, entityType, caseType) → NONHUMAN

**Fixes applied**:
- FORD removed from car dealer detection entirely (too common as surname)
- PARISH removed from terms (legitimate surname)
- Word boundaries added to remaining car brand pattern
- New terms added: ASSOCIATES, SERVICE, CENTER, SYSTEMS, SOURCE, DAUGHTER
- New terms added (former govt/nonprofit): VICTIMS, VIOLENCE
- Possessive apostrophe-s rule added (catches "PASQUALE'S", "O'NEIL'S" etc.)
- F.I.S.H added to KNOWN_NONHUMAN_NAMES (acronym detection without "FISH" in terms)
- Multi-word entries added to known names: BLOCK ISLAND, SEE AD, SEE ADS, TAKE-OUT, TAKE OUT
- Curly apostrophe variants added to known names
- Space normalization before known-name matching (collapses multi-space to single)

**Final accuracy** (against corrected user annotations):
- True positives: 143, True negatives: 555
- False negatives: 2 (BASIN NEW, ROCK M — names with no detectable business indicators; handled by explicit user declaration in PhonebookBrowser)
- False positives: 0
- **Detection rate: 98.6%** (143/145)
- **False positive rate: 0.0%** (0/555)

**9 user annotation corrections**: Records 116, 220, 658, 791, 851, 872, 873, 1045, 1125 reclassified from PERSON_NOMATCH to non-human (Phase 1 was correct, original user annotations were wrong).

**5 BUSINESS_MATCHED records confirmed as persons**: Records 190, 313, 315, 512, 871 — people associated with business entities. Their names are person names; Phase 1 correctly identifies them as persons.

**Design principle confirmed**: Algorithmic detection handles 98.6% of cases; the PhonebookBrowser maintenance tool (Phase 7) handles the remaining 1.4% via explicit user declaration. Neither needs to be perfect because they complement each other.

#### Prerequisites Status: COMPLETE

Both P-1 and P-2 are complete. Next action: Phase 1 implementation (SupplementalDataDatabase base class).

### Deferred Items

- **Couples processing** — deferred until individual name variation assignment working
- **VA Post-Process Button** — Originally Phase 8 of StreetName architecture; only needed when VA data is re-downloaded (infrequent)

### Structural Findings (Session 117)

**IndividualName** (aliasClasses.js:912): Has firstName, lastName, otherNames, title, suffix components. Extends ComplexIdentifiers → Aliased (primaryAlias + alternatives). Database entries in IndividualNameDatabase have homonyms/candidates/synonyms via AliasedTermDatabase.

**NonHumanName** (aliasClasses.js:677): Extends SimpleIdentifiers → Aliased. ALREADY HAS alias infrastructure (primaryAlias + alternatives from Aliased base class). No new structure needed for business name variations.

**Class hierarchy for names:**
```
Aliased (primaryAlias + alternatives)
├── SimpleIdentifiers
│   └── NonHumanName — used by Business, LegalConstruct, NonHuman entities
└── ComplexIdentifiers
    └── IndividualName — used by Individual entities (has firstName/lastName/etc.)
```

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

**Status: USER_VERIFIED_COMPLETE (February 2, 2026)**

**Test tool:** `scripts/diagnostics/entitySourceAnalysis.js` — functions: `analyzeBloomerangFile()`, `analyzeVisionAppraisalFile()`, `compareAnalysisResults()`, `trackDatabaseUsage()`

**Test methodology:** Compare BYPASS=TRUE (no lookup) vs BYPASS=FALSE (lookup active) across both VA and Bloomerang entity creation. Verify all 2108 IndividualNameDatabase entries used, shared object identity correct.

**Result (Session 89):** All 2108 database entries used (0 unused, 389 used multiple times). Bloomerang: 1361 from DB (100%). VisionAppraisal: 1266 from DB (100%), including 838 household members correctly resolved.

---

## APPENDIX A: COMPARISON TO ORIGINAL PLAN

The original Section 4 focused on StreetName database enrichment (wrong focus). Revised February 3, 2026 to focus on **entity-to-EntityGroup matching** — matching phonebook/email data against existing EntityGroups to augment them with phone numbers and email addresses.

---

## CRITICAL ISSUE: individualNames Always Empty (Session 115) — RESOLVED (Session 116)

**Status**: RESOLVED — entity rebuild verified, individualNames: 2111, unrecognizedIndividualNames: 1

### Root Cause

`buildMemberCollections()` classified every name as unrecognized because `_isNameFromDatabase()` (entityGroup.js) checks for the `'INDIVIDUAL_NAME_DATABASE_BUILDER'` marker on `name.primaryAlias.sourceMap`. That marker only exists when `resolveIndividualName()` successfully looks up a database entry during entity creation.

**The problem**: `window.BYPASS_INDIVIDUALNAME_LOOKUP` defaulted to `true` (bypass ON = lookup OFF), a leftover from when the database was first being built. All entities were created with fresh IndividualName objects lacking the marker.

### Fix (Session 115, verified Session 116)

Changed `CODE_DEFAULT` from `true` to `false` in `individualNameDatabase.js`, plus 4 call sites changed from `=== false` to `!== true` (bloomerang.js x3, processAllVisionAppraisalRecords.js x1). IndividualName lookup is now ON by default. Full entity rebuild from CSVs executed Session 116.

**Serialization note**: The marker (stored in a Map on `sourceMap`) survives the full serialize/deserialize pipeline — verified through entity save → load → group build → group save → group load.

### Architectural Note (Session 115) — IMPLEMENTED (Session 116)

Phase 2 uses USER ANNOTATIONS as the exclusion list (not Phase 1 algorithm output). The exclusion set is built from three paths:
1. Standalone sections: businesses, governmentEntities, nonprofitEntities, legalEntities
2. matchAssociations with `designation === 'B-1'` (explicitly declared business)
3. matchAssociations with `matchEntityType === 'Business'` or `matchEntityType === 'NonHuman'` (de facto business)
LegalConstruct and AggregateHousehold are NOT excluded (those contain real person names).

### Phase 2 Heuristic Improvements (Session 116)

| Enhancement | Description |
|---|---|
| Nickname prefix rule | If shorter word (3+ chars, has vowels+consonants) is exact start of longer word, score = 0.845 (threshold). Either direction. E.g. FRED→FREDERIC |
| Possessive stripping | `stripPossessive()` removes trailing 'S/\u2019S from words >= 4 chars. Applied to both phonebook and entity name words |
| Raw-name word extraction | For unmatched records, build name words from `rec.name.raw` instead of parser field assignments. All non-lastName words become potential firstName candidates |
| Expanded exclusion set | Three-path exclusion from user annotations (see Architectural Note above) |
| MANAGEMENT business term | Added to PHONEBOOK_BUSINESS_TERMS for Phase 1 detection |

### Phase 2 Validation Results (Sessions 116-117)

| Metric | Session 116 | Session 117 (after & fix) |
|---|---|---|
| Exclusion set size | 139 | 139 |
| Recall | 88.5% (146/165) | 88.7% (134/151)* |
| Precision | 61.1% (146/239) | 76.1% (134/176) |

*Session 117 corrected the recall denominator from 165→151 (annotation-based exclusion, not Phase 1). The & token filter removed 23 false matches and 1 true positive.

**Remaining**: 17 Section 1 records + 14 Section 2b records to review (prerequisites P-1/P-2).

---

## DOCUMENT END

**Document Version**: 5.2
**Last Updated**: February 25, 2026 (Session 118: document cleanup, Section 4/5 architectural annotations added per database model revision)
