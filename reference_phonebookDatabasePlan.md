# Phonebook Integration — Full Arc Plan

## Two Goals

This project serves two distinct goals that must not be conflated:

**Goal 1 (One-time): Build an inaugural PhonebookDatabase** from existing phonebook data, user annotations, and algorithmic matching. This is a one-time construction that includes a translation step (resolving user annotations that reference entities by name into entity keys).

**Goal 2 (Repeatable): Build permanent code** that can re-derive phonebook-to-entity associations whenever entity groups are rebuilt from new source data or new phonebook data arrives. This process must work without one-time artifacts. It must support three input channels: algorithmic matching, user-declared inclusions, and user-declared exclusions.

The inaugural build (Goal 1) exercises the repeatable code (Goal 2) plus a one-time annotation resolution step. Once the inaugural database is built, the annotation resolution is never needed again — the resolved data lives permanently in the database.

---

## Architectural Principles

### Three Input Channels

The PhonebookDatabase records associations from three distinct sources. All three are **permanent, first-class data** stored directly in the database:

1. **Algorithmic matches** — the matching code compares phonebook records against entity groups and finds matches automatically. These are re-derivable on any rebuild.

2. **User-declared inclusions** — manual declarations that a phone number belongs to a specific entity. These override algorithm misses and represent expensive human knowledge that cannot be re-derived.

3. **User-declared exclusions** — manual declarations that a specific algorithmic match is wrong. These prevent the algorithm from making a known-incorrect association.

On a rebuild (Goal 2), the process is: run the algorithm, then apply stored inclusions (override misses), then apply stored exclusions (prevent false matches). User declarations are read FROM the database, not from transient variables or external scripts.

### Entity Key Provenance

**Every match association MUST record the entityKey that drove it.** It is impossible to know an entity group association without knowing which entity within the group was matched. A null entityKey is a bug, not a normal case.

**EntityKey sources by match type:**
- **Full match (name + address)**: extracted from nameHits via `extractEntityKeyFromNameHits()` in phonebookPipeline.js
- **Name-only match**: same as full match
- **Address-only match**: extracted from fire number/PO box via `extractEntityKeyFromAddressHits()` in phonebookPipeline.js
- **Heuristic match**: recorded directly by the heuristic matcher
- **Manual inclusion**: from user annotations (resolved during inaugural build)

**Defensive rule**: If entityKey resolution fails, the code must throw an error — not silently fall back to within-group search.

---

## Prerequisites — COMPLETE (Session 118)

- **P-1: Heuristic Calibration** — Auto-accept MEDIUM/HIGH confidence. Recall 91.2%, precision 94.3%.
- **P-2: Non-Human Detection** — Detection rate 98.6%, false positive rate 0%.

---

## Key Design Decisions

1. **PhonebookDatabase** as subclass of **SupplementalDataDatabase** (new base class). EmailDatabase will extend the same base later.
2. **All records** in the database — keyed by normalized phone number.
3. **Two deliverables** per matched record: phone number assignment + name variation assignment.
4. **Name variations** use existing alias infrastructure: IndividualName aliases for persons, NonHumanName alternatives for businesses.
5. **733 primary-matched records** auto-accepted without user review.
6. **Couples** handled after individuals are fully working.
7. **Error reporting over fallbacks** — no silent within-group search when entityKey is missing.
8. **Documentation** written to support later email source adaptation.

---

## Resolved Design Issues

- **Phone storage**: Numbers on entity ContactInfo directly; PhonebookDatabase stores association metadata only. CollectivePhone aggregates automatically.
- **Integration timing**: Runs during buildEntityGroupDatabase(), after buildMemberCollections(), before buildCollectiveContactInfo(). Unconditional (not gated behind buildConsensus).
- **Spec-plan misalignment**: Sections 4–5 in reference_phonebookIntegration.md use old runtime augmentation model; database model (Phase 3 match, Phase 6 apply) is correct.

---

## Phases 1-2: Database Infrastructure — COMPLETE

### Phase 1: SupplementalDataDatabase Base Class — COMPLETE
- **File**: `scripts/databases/supplementalDataDatabase.js` (1,239 lines)
- Three-layer persistence: bulk file, individual files, index file
- Google Drive integration, safe index update pattern
- Registered in CLASS_REGISTRY

### Phase 2: PhonebookDatabase — COMPLETE
- **File**: `scripts/databases/phonebookDatabase.js` (467 lines)
- Extends SupplementalDataDatabase with phone-specific normalization
- Entry structure: phoneNumber, rawRecords[], classification, matchAssociations[], exclusions[], userDeclarations, isIslandNumber, sourceMetadata
- Google Drive resources created and registered

---

## Phase 3: Inaugural Dataset — USER VERIFIED (Session 127)

1239 entries built, verified, and persisted to Google Drive. All validation targets matched. 1239/1239 bulk-to-individual exact match.

**Google Drive resources:** Index `1XsNlKJzASCk5CvZpt5IYNTSwqiWoZdjm`, Folder `1IYfQMgX6wf6GVHC7DRHNux6cz8orL_QM`, Deleted `1AGGOKozMdffjH6cp6g3nfyijLGq5X93P`, Bulk `1T9ni8lCuhMnuZ8LxusLv4VNCwmlriTMs`

**Sub-phases (all complete):**
- **3.1 Code Harvesting** — Matching code split into 4 files (phonebookMatcher, phonebookDetection, phonebookPipeline, phonebookNameProcessing)
- **3.2 Annotation Resolution** — 167 inclusions + 10 exclusions resolved. Output: `servers/progress/resolved_phonebook_rules.json`. File: `phonebookAnnotationResolver.js`
- **3.3 Repeatable Pipeline** — Reproduced all stats exactly. 772/772 entityKeys (zero null)
- **3.4 Persist to Drive** — gapi corruption discovered and fixed (→ raw fetch). See `reference_supplementalDatabaseReuseLessons.md` Lesson 1
- **3.5 Validation** — 398 improved entityKeys (Levenshtein guesses → authoritative), 7 classification fixes

---

## Phase 4: Name Variation Processing — 4.1–4.5 DONE, 4.6 PENDING

**Goal**: Apply phonebook name forms as aliases on IndividualName entries and NonHumanName entities.

**File**: `scripts/matching/phonebookNameProcessing.js` (~1510 lines, 17 functions)

### Current State (Session 134)

Phase 4.1–4.4 run and saved. Phase 4.5 re-run with ERRONEOUS fix: 35/35. IndividualNameDatabase on Drive: 2157 entries, 3002 variations, 762 homonyms. All three persistence layers consistent (bulk/folder/index = 2157).

**Session 131 run results (Phases 4.1–4.4):**
- Person aliases added: 1194 (591 individual names + 382 couples → 755 names)
- NonHuman aliases added: 19
- Already existed (skipped): 131
- No entity resolution: 110 (investigated Session 134, see Phase 4.6)
- Modified IndividualName entries: 663
- Errors: 0

**Session 134 re-run results (Phase 4.5):**
- Households processed: 35/35 (ERRONEOUS fix resolved LEEDER case)
- Individuals created: 54
- New IndividualName DB entries: 48
- New addresses added: 11
- Phone numbers distributed: 38

### 4.1 Individual Name Variation Assignment — DONE
Processes person-classified phonebook records: resolves entityKey (handles synthetic `:individual:N` keys), looks up IndividualName in database, adds phonebook name as alias (homonym if score >= 0.875, candidate otherwise).

### 4.2 Proposed New IndividualName Report — DONE (0 new entries needed)

### 4.3 NonHuman Name Variation Assignment — DONE (19/19)

### 4.4 Couples Handling — DONE (Session 130, re-run Session 131)
`processOneNameAgainstAssociations()` helper splits couple names into firstName+lastName and secondName+lastName. 382 couples → 755 names, 1194 aliases, idempotent.

### 4.5 Individual Discovery in Unparsed AggregateHouseholds — DONE (Session 134)
39 AggregateHouseholds have empty `.individuals[]` but phonebook data matched by address provides clean individual names. Tagged via `tagIndividualDiscovery()` post-processing pass in phonebookPipeline.js (destination-based: empty AggH, not route-based). Breakdown: 32 user-annotated + 7 heuristic.

**Detailed plan**: `reference_phase4_5_individualDiscoveryPlan.md`

**Implementation (5 functions in phonebookNameProcessing.js, lines 756-1510):**
1. `collectNamesForHousehold()` — collects names from phonebook entries, splits couples, deduplicates
2. `reconcileNames()` — pairwise comparison using same standard as _tryMatchToExistingName()
3. `createIndividualForHousehold()` — creates Individual consistent with VA creation pattern
4. `checkAndAddNewAddresses()` + `createBlockIslandAddress()` — implements 5 address cases
5. `processIndividualDiscovery()` — top-level orchestrator

**Test results (Session 134):** 35/35 households processed, 54 individuals created, 0 errors. Saved to Drive: 2157 entries, 3002 variations. Consistency check passed.

**6 data quality issues** — all handled via management tools per DATA_QUALITY_MANAGEMENT_RULE:
1. FireNumber:1050 (VON ARX): VON prefix split → management tool correction
2. FireNumber:469 (BUDA): MORANBUDA concatenation → management tool correction
3. FireNumber:1762 (WILKES): L SHEEHAN different person → management tool correction
4. FireNumber:1521 (O'SHEA): FRANCIS COLEMAN different person → management tool correction
5. FireNumber:203 (KIVLEHAN): O'BRIEN maiden name → management tool correction
6. FireNumber:1531 (LEEDER): ERRONEOUS tag applied (coded+tested) → management tool correction

**CRITICAL**: `tagIndividualDiscovery()` tags are NOT persisted to Drive. Must re-run after loading PhonebookDatabase from bulk.

### 4.6 Entity-Level Phonebook Matching Helpers — PENDING

**Goal**: Build entity-level comparison helpers that Step 1 (pre-group matching) needs. These are modular functions that can be called by any orchestrator.

**Rationale**: The current matching code (phonebookMatcher.js) compares phonebook records against EntityGroup **collections** (group.individualNames, group.blockIslandAddresses). Step 1 needs to compare against **individual entities** in the unified entity database. The comparison logic (name scoring, address matching) is the same — only the iteration target differs. Shared Layer 1 helpers (createPhonebookNameObjects, bestScoreFromFourScore) are already isolated and reusable.

**New helpers needed:**

1. **`lookupNameOnEntity(phonebookNames, entity)`** — Compare phonebook name objects against a single entity's IndividualName (or individuals[] array for AggregateHouseholds). Returns name hits with scores, analogous to `lookupNamesInGroup()` but operating on entity.name / entity.individuals[].name instead of group collections.

2. **`lookupAddressOnEntity(record, entity)`** — Compare phonebook address against a single entity's address. Extract fire number from entity's Address object and compare to phonebook record's fire number. Returns address hits, analogous to `lookupAddressInGroup()` but operating on entity.contactInfo.address instead of group.blockIslandAddresses.

3. **`lookupPOBoxOnEntity(record, entity)`** — Compare phonebook PO box against entity's PO box. Analogous to `lookupPOBoxInGroup()`.

**File**: New file `scripts/matching/phonebookEntityMatcher.js` — keeps entity-level matching separate from group-level matching (modular, not monolithic).

### Phase 3 Revision — DONE (Session 129)
`tagIndividualDiscovery(db, entityDb)` in phonebookPipeline.js — post-processing pass tagging matchAssociations where destination is AggH with empty individuals. 39 tagged from fresh rebuild.

### Old 4.7 (J.P. TANGEN Match Quality Review) — MOVED TO AUDIT REPORT
Cross-person false alias from matchAssociation pointing to wrong entity. Now tracked as a future Audit Report category in `reference_auditReportPlan.md`.

### Known Data Issues
- 2 Bloomerang keys not found in unifiedEntityDatabase (minor edge cases, confirmed Session 134)

---

## Phase 5: Two-Step Phonebook Integration (REVISED Session 134)

> **Architectural revision**: Phases 5 and 6 were completely redesigned in Session 134 based on a comprehensive accounting of all phonebook record fates. The old Phase 5 (phone number assignment as a separate step) and old Phase 6 (post-group-only integration) are replaced by a two-step pipeline that handles ALL phonebook cases including 108 non-person-entity matches and 285 unmatched person records.

### Background: Complete Phonebook Fate Accounting (Session 134)

Every phonebook association was categorized:

| Category | Count | Handling |
|----------|-------|----------|
| Non-person classified | 120 | Phase 4.3 (nonhuman aliases) — DONE |
| Person, unmatched (no associations) | 285 | **Step 1 + Step 3** — create entities, match to groups |
| Person, resolved to IndividualName | 817 | Phase 4.1/4.4/4.5 (aliases) — DONE |
| Person, matched to NonHumanName entity | 108 | **Step 1 + Step 3** — create entities, add to groups |
| Person, Bloomerang key missing | 2 | Known edge cases |

The 108 are person-classified phonebook records matched by address to properties owned by trusts, QPRTs, legal constructs, and businesses (100 LegalConstruct + 8 Business, all with NonHumanName). The 285 are person-classified records with no match at all.

### Pipeline Design: Two-Step Phonebook Processing

The phonebook integration is split into two steps around entity group creation:

```
Unified Entity DB created
        ↓
   STEP 1: Pre-group phonebook entity matching
        ↓
   Entity Group Creation (unchanged code, unchanged inputs)
        ↓
   STEP 3: Post-group phonebook integration
        ↓
   Save entity groups + IndividualNameDatabase
```

**Why two steps**: Some phonebook matches require entity-group-level context (a phonebook name matches one entity while the address matches a different entity in the same group). These cross-entity matches can only be found after groups exist. But the 108 and 285 cases can be identified before groups exist and benefit from early entity creation.

**Critical constraint**: Entity group creation runs with UNCHANGED code AND UNCHANGED inputs. Phonebook-sourced entities are NOT added to the unified entity database before group creation. They are slotted into groups afterward.

### 5.1 Step 1: Pre-Group Phonebook Entity Matching — PENDING

**Goal**: Match phonebook records against individual entities in the unified entity database. Identify which records need new entities created. Create those entities. Transfer phone/contact info immediately on match.

**When it runs**: After unified entity database creation, before entity group creation.

**Process**:
1. Load PhonebookDatabase from Drive
2. For each person-classified phonebook record, compare against all entities using Phase 4.6 helpers
3. Record results in a Step 1 results structure:
   - **Matched to person entity** (entityKey populated): Record match. Transfer phone number and contact info to the matched entity. Name alias processing deferred to Step 3 (needs IndividualNameDatabase context).
   - **Matched to non-person entity** (the 108): Record match. Create a new phonebook-sourced Individual entity. Transfer phone/contact info to BOTH the matched non-person entity AND the new Individual.
   - **Unmatched** (the 285): Record as unmatched. Create a new phonebook-sourced Individual entity with phone/contact info.

**Entity creation from phonebook data**: Each new Individual is constructed with:
- **IndividualName**: Built from phonebook name fields (firstName, lastName). Couples produce two Individuals sharing a phone number.
- **ContactInfo**: PhoneTerm from the phonebook phone number.
- **Address**: Full Block Island address from the phonebook record (these are BI phonebook entries, so addresses are BI unless specifically flagged otherwise).

**Phone/contact info transfer**: Happens immediately on match recognition, not deferred. When a phonebook record matches an entity, the phone number is applied to that entity's ContactInfo (creates PhoneTerm, applies as islandPhone or additionalPhone). For the 108, both the matched non-person entity and the new Individual receive the phone.

**Output**: A Step 1 results structure recording:
- Which phonebook records matched which entities
- Which new phonebook-sourced entities were created
- Which records remain unmatched (for Step 3)

### 5.2 Phonebook Entity Key Format — PENDING

**Pattern**: `phonebook:<phoneNumber>:<disambiguator>`

Following the rationale of existing key conventions:
- **VisionAppraisal**: Property-centric → keyed by location (fire number)
- **Bloomerang**: Account-centric → keyed by account number
- **Phonebook**: Phone-centric → keyed by phone number

**Disambiguator logic** (emulating Bloomerang's approach to households):
- Single person: `phonebook:<phoneNumber>:<firstName>` (e.g., `phonebook:4014665859:ROBERT`)
- Couple, person 1: `phonebook:<phoneNumber>:<firstName>` (e.g., `phonebook:4014665859:ROBERT`)
- Couple, person 2: `phonebook:<phoneNumber>:<secondName>` (e.g., `phonebook:4014665859:MARGARET`)
- If firstName unavailable: `phonebook:<phoneNumber>:na`
- AggregateHousehold (if couples warrant): `phonebook:<phoneNumber>AH:<disambiguator>`

**Key generation**: New function in `unifiedDatabasePersistence.js` alongside existing VA and Bloomerang generators, or in the new `phonebookEntityMatcher.js`.

### 5.3 Step 3: Post-Group Phonebook Integration — PENDING

**Goal**: After entity groups are built, slot phonebook-sourced entities into groups, match remaining unmatched records, and apply name aliases for group-level matches.

**When it runs**: After entity group creation, before saving.

**Process (ordered — each sub-step feeds the next)**:

**5.3a — Slot matched phonebook entities into existing groups**:
For each phonebook entity created in Step 1 that matched an existing entity: look up which group the matched entity belongs to. Add the phonebook entity to that group as a new member. (Every entity is in a group — including single-member groups — so this always succeeds.)

**5.3b — Match previously-unmatched records against enriched groups**:
The 285 unmatched records could not be matched to individual entities in Step 1. Now that groups exist (and are enriched with the Step 1 entities from 5.3a), re-attempt matching using the existing group-level matcher (phonebookMatcher.js — `lookupNamesInGroup`, `lookupAddressInGroup`, etc.). This captures cross-entity matches that entity-level matching cannot find. Records that match: slot their phonebook-sourced Individual into the matched group.

**5.3c — Create new single-entity groups for still-unmatched**:
Records that still don't match after 5.3b: their phonebook-sourced Individual (created in Step 1) becomes a new single-entity EntityGroup. These represent people who exist in the phonebook but have no corresponding entity in VA or Bloomerang data.

**5.3d — Apply name aliases and phone numbers for group-level matches**:
For records that were matched in Step 1 to person entities (the 817-equivalent cases that matched at entity level), apply name aliases via the existing Phase 4 logic (IndividualNameDatabase lookup, add as homonym or candidate). For records matched in 5.3b (group-level matches), apply the same. Phone/contact info was already transferred in Step 1, so this step focuses on name alias processing.

**5.3e — Phase 4.5 Individual Discovery (existing)**:
Run `tagIndividualDiscovery()` and `processIndividualDiscovery()` as before. These handle AggregateHouseholds with empty individuals[] — a different case from the 108/285. No overlap expected (108 are NonHumanName entities, Phase 4.5 handles AggH with HouseholdName).

### 5.4 Testing Strategy

**Key principle**: Group creation is unchanged, but downstream group membership changes. Testing must anticipate and validate these changes rather than treating them as regressions.

**Test approach**:
1. Run Step 1 against current data. Verify it identifies the 108 non-person matches and 285 unmatched.
2. Verify entity creation produces well-formed Individuals with correct keys, names, addresses, phones.
3. Run entity group creation. Verify identical results to current (same code, same inputs).
4. Run Step 3. Verify 108 entities are slotted into correct groups. Verify some 285 match enriched groups. Verify remaining 285 get new single-entity groups.
5. Verify final entity group count = original count + new single-entity groups created.
6. Verify IndividualNameDatabase correctly receives entries for new phonebook-sourced names.
7. Run consistency checks on all saved data.

---

## Phase 6: Automated Pipeline Integration (REVISED Session 134)

**Goal**: Wire the two-step phonebook integration into the automated rebuild pipeline so it runs on every entity group build.

### 6.1 Pipeline Sequence

The full automated pipeline becomes:

```
1. Build entities from VA CSV + Bloomerang CSV
2. Build unified entity database
3. Load PhonebookDatabase from Drive
4. STEP 1: Pre-group phonebook entity matching (Phase 5.1)
   - Match phonebook → entities
   - Create phonebook-sourced entities for 108/285 cases
   - Transfer phone/contact info on match
5. Build entity groups (unchanged algorithm)
6. STEP 3: Post-group phonebook integration (Phase 5.3)
   - 5.3a: Slot matched phonebook entities into groups
   - 5.3b: Match unmatched records against enriched groups
   - 5.3c: Create single-entity groups for still-unmatched
   - 5.3d: Apply name aliases
   - 5.3e: Phase 4.5 individual discovery
7. Save entity groups to Drive
8. Save IndividualNameDatabase to Drive
```

### 6.2 Integration Functions

- **`phonebookStep1(phonebookDb, entityDb)`** — orchestrates pre-group matching and entity creation. Returns Step 1 results structure.
- **`phonebookStep3(phonebookDb, groupDb, entityDb, indNameDb, step1Results)`** — orchestrates post-group integration. Consumes Step 1 results.
- Both called from the main pipeline (or from `buildEntityGroupDatabase()` if wired in directly).

### 6.3 Production Detection (Completion Gate 1)

Every pipeline run produces a structured data quality report. Detection logic from Phase 4.5 (ERRONEOUS tags, name parsing anomalies) remains in production code. New detection categories added as discovered during testing. See Completion Gates section.

---

## Phase 7: Maintenance Tool (PhonebookBrowser)

**Goal**: Browser-based maintenance following IndividualNameBrowser/StreetNameBrowser patterns.

### 7.1 PhonebookBrowser UI
- **File**: `scripts/phonebookBrowser.js` (new) + HTML section in index.html
- Search by phone number, name, or entity group
- View/edit record details, classification, match associations
- **User inclusion workflow**: declare matches the algorithm missed
- **User exclusion workflow**: declare algorithmic matches that are wrong
- **Classification override**: declare records as nonhuman
- All user declarations stored permanently in the database

### 7.2 Session Guard + Incremental Operations
- Following established patterns

---

## Phase 8: Future Update Workflow

**Goal**: Process new phonebook data when available.

### 8.1 Incremental Update Process
1. Re-parse new phonebook source file
2. Compare against existing entries by phone number
3. New records → run classification + matching, create entries
4. Changed records → update, flag affected associations
5. Deleted records → mark inactive (preserve history)
6. **Preserved**: all user declarations from prior updates
7. **Highlighted**: changed algorithmic associations → user review

---

## Completion Gates — Data Quality Management (Session 133 Directive)

**Governing rule**: CLAUDE.md `DATA_QUALITY_MANAGEMENT_RULE` (permanent, highest priority).

The Phonebook Integration project CANNOT be declared complete without satisfying ALL of the following gates. These are not optional enhancements — they are core requirements equal in priority to the matching algorithms themselves.

### Gate 1: Production Data Quality Detection

The detection logic that identified the 6 Phase 4.5 data quality issues (VON prefix splitting, name concatenation, different-person-at-address, maiden vs married names, unparseable records) MUST remain as production detection code — not one-time diagnostics that get discarded after testing.

**Requirement**: Every pipeline run produces a structured data quality report categorizing detected anomalies. The detection code lives in the permanent codebase, runs on every build/update, and is maintained as new anomaly patterns are discovered.

**Categories to detect (initial, will grow)**:
- Name parsing anomalies (prefix splitting errors, concatenated names)
- Identity mismatches (different person at same address vs. household member)
- Name form discrepancies (maiden name vs. married name)
- Unparseable records (no extractable names)

### Gate 2: Database Management Tools for User Corrections

The PhonebookBrowser (Phase 7) must go beyond view/edit of individual records. It must be a powerful data management tool that lets the user:
- Review detected data quality issues
- Apply corrections (fix names, reclassify records, split/merge entries)
- Declare exceptions (this anomaly is actually correct, don't flag it again)
- All corrections stored permanently in the database, not in transient variables or console sessions

### Gate 3: Exception Processes in Production

Production pipeline code MUST read stored corrections from the database and apply them as exceptions during processing. Flow:
1. Detection identifies anomaly → flags it
2. User reviews in management tool → applies correction or declares acceptable
3. Next pipeline run reads the stored correction → applies it automatically
4. Corrected items are NOT re-flagged (the correction is permanent)

This means the three-channel architecture (algorithmic + inclusions + exclusions) extends to data quality: algorithmic detection + user corrections + user acceptances.

### Gate 4: Workflow Preservation

Database management activity must be tracked with the same rigor as entity matching:
- Every correction has provenance (who, when, what was changed, why)
- Corrections survive database rebuilds (they are stored IN the database, not derived)
- The workflow for reviewing/correcting is documented in user documentation
- The UI makes the workflow discoverable — users don't need to know console commands

### Gate 5: Documentation

- Systems documentation updated with data quality detection and correction architecture
- User documentation describes the review/correct/accept workflow
- UI surfaces the workflow (not hidden behind console commands)
- Reference docs capture the anomaly categories and how each is handled

### How These Gates Map to Phases

| Gate | Primary Phase | Notes |
|------|--------------|-------|
| Gate 1 (Detection) | Phase 5 + Phase 6 | Detection logic in Step 1/Step 3 pipeline code, runs every build |
| Gate 2 (Management Tools) | Phase 7 | PhonebookBrowser must include correction capabilities |
| Gate 3 (Exception Processes) | Phase 6 + Phase 7 | Pipeline reads corrections; browser stores them |
| Gate 4 (Workflow) | Phase 7 + Phase 8 | Corrections survive rebuilds and updates |
| Gate 5 (Documentation) | All phases | Incremental, but required before project completion |

---

## Source Data Inventory

### Permanent Input Files (user's human knowledge)
| File | Contents | Status |
|------|----------|--------|
| `servers/progress/user_phonebook_annotations_2026-02-22.json` | 700 no-match record annotations: 165 inclusions, 125 nonhuman, 410 no-match | PRESERVED |
| `servers/Results/phonebook match - Sheet1.csv` | P-1 review: 32 keeps + 10 exclusions (n/g/b codes) | PRESERVED |
| `servers/progress/resolved_phonebook_rules.json` | 167 resolved inclusions + 10 resolved exclusions (with entityKeys) | CREATED Session 127 |

### Code Files
| File | Lines | Purpose |
|------|-------|---------|
| `scripts/databases/supplementalDataDatabase.js` | ~1,280 | Base class — persistence infrastructure (all raw fetch, no gapi) |
| `scripts/databases/phonebookDatabase.js` | 467 | PhonebookDatabase + PhonebookEntry classes |
| `scripts/matching/phonebookMatcher.js` | 773 | Core matching + classification |
| `scripts/matching/phonebookDetection.js` | 676 | Non-human detection + heuristic matching |
| `scripts/matching/phonebookPipeline.js` | 1,024 | EntityKey extraction + pipeline orchestration |
| `scripts/matching/phonebookNameProcessing.js` | 662 | Phase 4 name variation processing |
| `scripts/matching/phonebookAnnotationResolver.js` | 359 | One-time annotation resolution (name→entityKey) |

### Deleted Files
5 temporary console scripts (Session 123, harvested to permanent code), annotation resolver script (Session 123, deleted prematurely — lesson captured in `reference_supplementalDatabaseReuseLessons.md` Lesson 6), 4 backfill scripts (Session 126).

---

## Relationship to Email Processing

This architecture is designed for reuse. When email processing begins:
1. `EmailDatabase` extends `SupplementalDataDatabase` (same base class)
2. Common functionality migrates UP from PhonebookDatabase
3. Same three-channel architecture (algorithmic + inclusions + exclusions)
4. Same maintenance tool patterns, integration hooks, update workflow

**Critical:** Before building the next database, read `reference_supplementalDatabaseReuseLessons.md` — captures operational lessons (gapi ban, cascading timeouts, auto-backup, rebuild protection, consistency healing) that the class design alone doesn't address.

## Operational Lessons (cross-references)

- **Save/file-out/verify workflow packaging:** `reference_saveInfrastructureLessons.md` — 8 lessons for building button-driven UI (Phases 6–7)
- **Reuse for next data source:** `reference_supplementalDatabaseReuseLessons.md` — 8 lessons + checklist for EmailDatabase or similar
