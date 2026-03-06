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

## Phase 4: Name Variation Processing — 4.1–4.5 DONE, 4.6 CODED & TESTED

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

### 4.6 Entity-Level Phonebook Matching Helpers — CODED & TESTED (Sessions 135-136)

**Goal**: Build entity-level comparison helpers that Step 1 (pre-group matching) needs. These are modular functions that can be called by any orchestrator.

**Rationale**: The current matching code (phonebookMatcher.js) compares phonebook records against EntityGroup **collections** (group.individualNames, group.blockIslandAddresses). Step 1 needs to compare against **individual entities** in the unified entity database. The comparison logic (name scoring, address matching) is the same — only the iteration target differs. Shared Layer 1 helpers (createPhonebookNameObjects, bestScoreFromFourScore) are already isolated and reusable.

**File**: `scripts/matching/phonebookEntityMatcher.js` — keeps entity-level matching separate from group-level matching (modular, not monolithic).

**Components:**

1. **`lookupNameOnEntity(phonebookNames, entity)`** — CODED & TESTED. Compare phonebook name objects against a single entity's IndividualName (or individuals[] array for AggregateHouseholds). Returns name hits with scores, analogous to `lookupNamesInGroup()` but operating on entity.name / entity.individuals[].name instead of group collections.

2. **`lookupAddressOnEntity(record, entity)`** — CODED & TESTED. Compare phonebook address against a single entity's Block Island addresses (primary + secondary). Includes `_isBlockIslandAddress()` gate that replicates exact entityGroup.js buildMemberCollections() BI detection logic (lines 371-373): `isBlockIslandAddress?.term === 'true' || === true || zipCode?.term === '02807'`. Without this gate, off-island entities with matching fire numbers (e.g., 335 Warhurst Ave, Swansea) produce false positives.

3. **`lookupPOBoxOnEntity(record, entity)`** — CODED, NOT TESTED WITH REAL PO BOX DATA. Compare phonebook PO box against entity's PO box.

4. **`classifyEntityMatchResult(matchResult)`** — CODED & TESTED (Session 136). Entity-level counterpart to `classifyPhonebookMatch()` in phonebookMatcher.js. Applies the same classification rules to entity-level hits. Without this, raw hits are dominated by streetOnly false positives (batch testing: 339 entities for Corn Neck Road, 84 for Spring Street). The classification rules replicated:

   - **streetOnly rejection**: streetOnly address matches cannot stand alone. Need name corroboration (→ full match) or fireNumber/PO box (→ address-only match). This is the primary filter that prevents address-only explosion.
   - **Variable name thresholds**: Uses `PHONEBOOK_CLASSIFICATION_THRESHOLDS` from phonebookMatcher.js: nameWithAddress=0.80 (non-collision), nameWithCollision=0.845, nameAlone=0.845.
   - **Address-alone requires strong evidence**: Only fireNumber or PO box matches qualify. streetOnly never qualifies as standalone. Collision addresses also rejected without name.
   - **Full matches kill all partials**: If any entity has a full match (name+address above threshold), discard all name-only and address-only matches for the entire record.
   - **Couple Condition 2**: Both couple members match different names on the same entity with scores >= 0.845. Only applies to AggregateHouseholds with populated individuals[]. At entity level, "different names" means different individuals within the same household, identified by source string (not matchedGroupNameKey). Helper: `_checkEntityCoupleCondition2()`.

   **Key difference from group-level**: Entity hits are already grouped by entity key (from `matchPhonebookRecordToEntities()`), so no grouping step is needed. Each entity's hit combination is classified independently.

   **Session 136 test results**:
   - Test A (Aldo Leone, fire#335): fullMatches:1, nameMatches:0, addressMatches:0 — correct full match.
   - Test B (T. ROBINSON, OCEAN AVE — streetOnly): 69 raw entity hits → 0 classified — streetOnly rejection confirmed.
   - Batch test (305 person records with no prior group-level match): 273 with raw hits, 0 classified matches. Expected — these records failed group-level matching (more context), so they also fail entity-level matching (less context).

**Orchestration:**

5. **`matchPhonebookRecordToEntities(record, entities)`** — CODED & TESTED. Iterates all entities, runs three lookup helpers, returns raw hits grouped by entity key. Feeds into `classifyEntityMatchResult()`.

**Diagnostics (all coded):**
- `testEntityMatch(firstName, lastName, fireNumber, poBox)` — synthetic record against all entities
- `testEntityNameLookup(entityKey, firstName, lastName)` — single entity name comparison
- `inspectEntityAddress(entityKey)` — entity address structure dump
- `batchEntityMatch(db, limit)` — PhonebookDatabase entries through entity matcher with classification. Reports raw hits vs classified matches per record.

**Critical lesson learned (Session 135)**: Group-level collections (group.blockIslandAddresses, group.individualNames) contain only qualifying items by construction — the filters are built into collection assembly. Entity-level code must explicitly replicate those filters. The `_isBlockIslandAddress()` gate and the classification rules are how entity-level code achieves the same filtering that group-level code gets for free from collection construction.

### Phase 3 Revision — DONE (Session 129)
`tagIndividualDiscovery(db, entityDb)` in phonebookPipeline.js — post-processing pass tagging matchAssociations where destination is AggH with empty individuals. 39 tagged from fresh rebuild.

### Old 4.7 (J.P. TANGEN Match Quality Review) — MOVED TO AUDIT REPORT
Cross-person false alias from matchAssociation pointing to wrong entity. Now tracked as a future Audit Report category in `reference_auditReportPlan.md`.

### Known Data Issues
- 2 Bloomerang keys not found in unifiedEntityDatabase (minor edge cases, confirmed Session 134)

---

## Phase 5: Two-Step Phonebook Integration (REVISED Session 134)

> **Architectural revision**: Phases 5 and 6 were completely redesigned in Session 134 based on a comprehensive accounting of all phonebook record fates. The old Phase 5 (phone number assignment as a separate step) and old Phase 6 (post-group-only integration) are replaced by a two-step pipeline that handles ALL phonebook cases.

### Background: Record Categories by Nature

The pipeline categorizes each person-classified phonebook record by the **outcome of entity-level matching** — not by pre-assigned labels. Each record's category is discovered through matching, not known in advance. The categories are:

| Category (by nature) | Handling |
|----------------------|----------|
| Non-person classified | Phase 4.3 (nonhuman aliases) — DONE |
| Person, full match to person entity | **Step 1** — record matchAssociation, transfer phone + name alias to matched entity. No new entity created. |
| Person, address-only match to non-person entity | **Step 1** matchAssociation + phone transfer. **Step 3** creates phonebook-sourced Individual, runs group matching. |
| Person, name-only match | **Step 1** matchAssociation (weaker evidence). **Step 3** may confirm via group-level matching. |
| Person, address-only match to person entity | **Step 1** matchAssociation + phone transfer. |
| Person, no classified entity-level match | **Step 3** — create phonebook-sourced Individual, run group matching (emulating VA/Bloomerang process). |
| Person, Bloomerang key missing | Known edge cases (2 in inaugural build) |

**Inaugural Build Results (Historical Reference)**: In the Session 134 inaugural build, these categories had counts: 120 non-person, 817 person-matched, 108 non-person-entity address matches (100 LegalConstruct + 8 Business), 285 unmatched person, 2 Bloomerang edge cases. These counts are specific to that dataset — the pipeline logic does not depend on them.

**How the pipeline discovers categories**: For each person-classified phonebook record, Step 1 runs entity-level matching (`matchPhonebookRecordToEntities()` → `classifyEntityMatchResult()`). The classification outcome determines which category the record falls into. Records that receive a classified match get a matchAssociation immediately, with phone and name alias transfer to the matched entity. Records with no classified match receive no matchAssociation at Step 1 — they proceed to Step 3 for group-level matching after entity group creation. **No entities are created in Step 1** — entity creation for all unmatched records is deferred to Step 3 to avoid requiring modifications to the legacy entity group builder.

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

**Why two steps**: The information available differs at each stage. Step 1 has entities but no groups — it determines which entity each phonebook record corresponds to, records matchAssociations, and transfers phone/name info to matched entities. Step 3 has groups — it fills in groupIndex, creates phonebook-sourced entities for unmatched records, and runs those entities through group matching emulating the VA/Bloomerang process. Cross-entity matches (name on entity A + address on entity B in same group) require group context that doesn't exist in Step 1 — this is why entity creation is deferred to Step 3 rather than creating entities that might be duplicates of matches found later.

**Inaugural vs incremental**: The pipeline logic is identical for both. The only difference is skip optimization: if a record already has a matchAssociation with a valid entityKey (and that entity still exists in the current unified DB), skip re-matching. On an inaugural run, no records have stored matches, so every record runs through matching. On an incremental run after source data changes, records whose matched entities no longer exist get re-matched; new records get matched for the first time; unchanged records are skipped.

**Critical constraint**: Entity group creation runs with UNCHANGED code AND UNCHANGED inputs. No phonebook-sourced entities are created before group creation. Step 1 only writes matchAssociations and transfers information to existing entities. Phonebook-sourced entities are created in Step 3 and then matched to groups afterward.

### 5.1 Step 1: Pre-Group Phonebook Entity Matching — PENDING

**Goal**: Match phonebook records against individual entities in the unified entity database. Record matchAssociations progressively. Transfer phone/contact info and name aliases immediately on match. **No entity creation in Step 1** — deferred to Step 3 to keep entity group creation inputs unchanged.

**When it runs**: After unified entity database creation, before entity group creation.

**Progressive matchAssociation model**: There is no separate "Step 1 results structure." The matchAssociation record on each PhonebookDatabase entry is the single record that accumulates information through the pipeline:
- **Step 1 writes**: `entityKey`, `matchType`, `matchSource`, `bestNameScore`, `isCollision`, `isCoupleCondition2` — **`groupIndex` left null** (groups don't exist yet)
- **Step 3 fills in**: `groupIndex` (by looking up which group the matched entity belongs to)
- **For records unmatched at entity level**: Step 3 runs group-level matching and fills in both `entityKey` and `groupIndex`

**Process**:
1. Load PhonebookDatabase from Drive
2. For each person-classified phonebook record:
   a. **Skip optimization**: If record already has a matchAssociation with a valid entityKey (and that entity still exists in the current unified DB), skip re-matching (incremental optimization).
   b. Run entity-level matching: `matchPhonebookRecordToEntities()` → `classifyEntityMatchResult()`. Only classified full/name/address matches proceed — raw hits are not actionable.
   c. Based on classification outcome:
      - **Full match to person entity**: Write matchAssociation (`entityKey`, `matchType='full'`, `groupIndex=null`). Transfer phone number via `transferPhonebookPhone()`. Apply name alias to matched entity's IndividualName.
      - **Address-only match to non-person entity**: Write matchAssociation (`matchType='address'`). Transfer phone to matched non-person entity. Entity creation deferred to Step 3.
      - **Name-only match**: Write matchAssociation (`matchType='name'`). Weaker evidence — may benefit from group-level confirmation in Step 3.
      - **Address-only match to person entity**: Write matchAssociation (`matchType='address'`). Transfer phone to matched entity.
      - **No classified match**: No matchAssociation written. No entity created. Record proceeds to Step 3 for group-level matching.
3. Apply user inclusions (override algorithm misses — read from PhonebookDatabase)
4. Apply user exclusions (prevent known false matches — read from PhonebookDatabase)

**No entity creation in Step 1**: All phonebook-sourced entity creation is deferred to Step 3 (after legacy entity group creation). This architectural decision ensures the entity group builder receives unchanged inputs, avoiding the need to modify existing group creation code with phonebook-aware filters. See Session 137 discussion for full rationale.

**Phone/contact info transfer**: Happens immediately on match recognition via `transferPhonebookPhone()`. When a phonebook record matches an entity, the phone number is applied to that entity's ContactInfo as a SimpleIdentifiers-wrapped PhoneTerm. If the phone already exists on the entity, the existing record is replaced with a PHONEBOOK_DATABASE-sourced version (confirmation, not duplication). Source attribution: `PhoneTerm(phoneStr, 'PHONEBOOK_DATABASE', phoneStr, 'phonebookStep1')`.

**Name alias transfer**: When a phonebook record's name matches an entity, the phonebook name is applied as an alias to the matched entity's IndividualName via IndividualNameDatabase lookup. This happens at Step 1 for entity-level matches and at Step 3 for group-level matches.

### 5.2 Phonebook Entity Key Format — CODED & TESTED (Session 139)

**Pattern**: `phonebook:<phoneNumber>:SimpleIdentifiers:<disambiguator>:<headStatus>`

Following the rationale of existing key conventions:
- **VisionAppraisal**: Property-centric → `visionAppraisal:<locationType>:<locationValue>`
- **Bloomerang**: Account-centric → `bloomerang:<accountNumber>:<locationType>:<locationValue>:<headStatus>`
- **Phonebook**: Phone-centric → `phonebook:<phoneNumber>:SimpleIdentifiers:<disambiguator>:<headStatus>`

Phonebook keys follow Bloomerang's structural pattern. The `SimpleIdentifiers` slot corresponds to the locationIdentifier class type (phonebook entities use SimpleIdentifiers, not FireNumber). The disambiguator slot uses firstName (where Bloomerang uses address) — address is not needed for phonebook key uniqueness since the phone number is already globally unique. The headStatus slot uses the same `head`/`member`/`na` convention as Bloomerang.

**Key format by scenario:**

| Scenario | Key | Example |
|----------|-----|---------|
| Single person | `phonebook:<phone>:SimpleIdentifiers:<firstName>:na` | `phonebook:4014665859:SimpleIdentifiers:ROBERT:na` |
| Couple, both unmatched — AH | `phonebook:<phone>AH:SimpleIdentifiers:<lastName>:na` | `phonebook:4014665859AH:SimpleIdentifiers:SMITH:na` |
| Couple, both unmatched — head (person 1) | `phonebook:<phone>:SimpleIdentifiers:<headFirstName>:head` | `phonebook:4014665859:SimpleIdentifiers:ROBERT:head` |
| Couple, both unmatched — member (person 2) | `phonebook:<phone>:SimpleIdentifiers:<memberFirstName>:member` | `phonebook:4014665859:SimpleIdentifiers:MARGARET:member` |
| Couple, one unmatched — standalone individual | `phonebook:<phone>:SimpleIdentifiers:<firstName>:na` | `phonebook:4014665859:SimpleIdentifiers:MARGARET:na` |
| No firstName available | `phonebook:<phone>:SimpleIdentifiers:na:na` | `phonebook:4014665859:SimpleIdentifiers:na:na` |

**Head assignment**: For couples, the first individual in the phonebook record (`firstName`) is arbitrarily designated head; the second (`secondName`) is member. This mirrors Bloomerang's arbitrary head/member designation.

**AH creation rule**: An AggregateHousehold entity is created only when BOTH members of a phonebook couple are unmatched after Step 1 entity-level matching. When only one member is unmatched, that member is created as a standalone Individual (headStatus `na`) — see Phase 5.3 couple-aware group placement for how that individual is placed.

**Collision detection**: The key generation function must check for key collisions. If a generated key already exists, throw an error, skip the colliding record, and continue processing. Collisions should not occur in practice.

**Key generation**: New function `buildPhonebookEntityKey()` in `phonebookEntityMatcher.js`, near the Step 1/Step 3 infrastructure helpers.

### 5.3 Step 3: Post-Group Phonebook Integration — CODED+TESTED (Session 142)

**Goal**: After entity groups are built, fill in groupIndex on Step 1 matchAssociations, create phonebook-sourced entities for unmatched records, run those entities through group matching (emulating the VA/Bloomerang entity-to-group process), and apply name aliases.

**When it runs**: After entity group creation, before saving.

**Architectural principle**: Phonebook entity creation and group matching in Step 3 emulates the existing VA/Bloomerang process for consistency. New phonebook entities are created first, then matched against existing groups using standard MATCH_CRITERIA thresholds — the same path Bloomerang entities follow. During entity creation, names are looked up in IndividualNameDatabase (same as VA/Bloomerang entity construction). Recognized names get the database's IndividualName object with the phonebook name added as an alias. This gives phonebook entities the same "smart comparison" advantage that VA/Bloomerang entities have. See Session 137 discussion for full rationale.

**Process (ordered — each sub-step feeds the next)**:

**5.3a — Fill in groupIndex on Step 1 matchAssociations**:
For each phonebook entry whose matchAssociation has an entityKey but no groupIndex: look up which group the matched entity belongs to. Fill in the `groupIndex` on the matchAssociation. (Every entity is in a group — including single-member groups — so this always succeeds.) No entity creation here — Step 1 only wrote matchAssociations and transferred info to existing entities.

**5.3b — Create phonebook-sourced entities for unmatched records**:
For records with no matchAssociation after Step 1 (no entity-level match found), AND for address-only-to-non-person records (which need a new person entity): create phonebook-sourced entities. During creation:
- Build IndividualName from phonebook name fields (firstName, lastName).
- Look up name in IndividualNameDatabase. If recognized, use the database's IndividualName object with phonebook name added as alias.
- Build ContactInfo with PhoneTerm from phonebook phone number.
- Build Address from phonebook record's Block Island address.
- Entity key format: `phonebook:<phoneNumber>:SimpleIdentifiers:<disambiguator>:<headStatus>` (see Phase 5.2).
These entities exist but are NOT yet in any group.

**Couple handling in entity creation** (follows Bloomerang household model):
- **Both couple members unmatched**: Create two Individual entities (head + member) AND one AggregateHousehold entity that holds them, following the same pattern Bloomerang uses for households. Head is arbitrarily person 1 (firstName), member is person 2 (secondName). Three keys generated (see Phase 5.2 table).
- **One couple member unmatched, one matched**: Create one standalone Individual entity (headStatus `na`) for the unmatched member only. No AH created. See 5.3c-couple for forced group placement.
- **Both couple members matched**: No entity creation. Both were consumed by existing entities in Step 1. See 5.3-audit for cross-group audit category.

**5.3c-couple — Couple-aware forced group placement** (Session 139 specification):
When a phonebook couple record has one member matched in Step 1 and the other unmatched (newly created in 5.3b as a standalone Individual), the unmatched member MUST be placed in the same entity group as the matched member. This is a deterministic placement — we know exactly where the entity belongs — so it happens BEFORE general similarity matching. This requires:
1. Identify that the newly-created entity came from a couple record where the other member was consumed.
2. Find which entity the consumed member matched to (from Step 1 matchAssociation).
3. Find which entity group that matched entity belongs to. Note: the matched entity may be directly in a group, OR it may be an individual held in the `.individuals[]` array of a VA AggregateHousehold — in which case the AH's group must be found.
4. Place the newly-created entity in that group.
This ensures couple members from the same phonebook record end up in the same entity group regardless of whether similarity thresholds would have found the match. The exact implementation approach for steps 1–4 needs further design.

**5.3c — Run remaining phonebook entities through group matching**:
Match phonebook entities that were NOT placed by 5.3c-couple against existing groups, emulating the VA/Bloomerang entity-to-group matching process. Use standard MATCH_CRITERIA thresholds (same as entityGroupBuilder phases). Entities whose names were resolved via IndividualNameDatabase benefit from richer name comparison (known homonyms/variations). Matched entities: add as group member via `addMemberToGroup()`, write/update matchAssociation (both `entityKey` and `groupIndex`), transfer phone/contact info to matched group members as appropriate.

**5.3d — Create single-entity groups for still-unmatched**:
Phonebook entities that don't match any group after 5.3c-couple/5.3c: create new single-entity EntityGroup for each. These represent people who exist in the phonebook but have no corresponding entity in VA or Bloomerang data. Write matchAssociation with both `entityKey` and `groupIndex`.

**5.3-audit — Couple cross-group audit category** (Session 139 specification):
When both members of a phonebook couple were matched to existing entities in Step 1 (both consumed, no entity creation needed), the audit system should flag cases where entities sharing the same phone number end up in different entity groups. This is a new audit category for `reference_auditReportPlan.md`: "Entities with same phonebook phone number in different entity groups." This is an analysis flag (not an error) — it may reveal legitimate cases or grouping problems worth reviewing.

**5.3e — Apply name aliases for group-level matches**:
For records matched in 5.3c (group-level matches), apply name aliases via IndividualNameDatabase lookup (add as homonym or candidate). Note: Step 1 already applied name aliases for entity-level matches, so this step handles only the group-level matches. Phone/contact info was already transferred in Step 1 for entity-level matches.

**5.3f — Phase 4.5 Individual Discovery (existing)**:
Run `tagIndividualDiscovery()` and `processIndividualDiscovery()` as before. These handle AggregateHouseholds with empty individuals[] — a different case from address-only-to-non-person-entity or no-match records. No overlap expected (address-only-to-non-person matches involve NonHumanName entities, Phase 4.5 handles AggH with HouseholdName).

### 5.4 Testing Strategy

**Key principle**: Group creation is unchanged, but downstream group membership changes. Testing must anticipate and validate these changes rather than treating them as regressions.

**Test approach**:
1. Run Step 1 against current data. Verify each person-classified record is categorized by nature: full match to person entity, address-only match to non-person entity, name-only match, address-only match to person entity, or no classified match. Verify counts are reasonable (compare against inaugural build historical reference as a sanity check, not as exact targets).
2. Verify matchAssociations are written correctly: entityKey populated for matched records, groupIndex null (to be filled in Step 3). Verify no entities were created in Step 1.
3. Verify phone transfer occurred for matched entities (source attribution shows PHONEBOOK_DATABASE). Verify name aliases applied for entity-level matches.
4. Run entity group creation. Verify identical results to current (same code, same inputs — no phonebook entities in the input).
5. Run Step 3. Verify groupIndex is filled in for entity-level-matched records. Verify phonebook-sourced entities created with IndividualNameDatabase lookup. Verify some phonebook entities match existing groups via standard thresholds. Verify remaining unmatched get new single-entity groups.
6. Verify final entity group count = original count + new single-entity groups created.
7. Verify IndividualNameDatabase correctly receives entries for new phonebook-sourced names.
8. Run consistency checks on all saved data.

---

## Phase 6: Automated Pipeline Integration — CODED+TESTED (Session 142)

**Goal**: Wire the two-step phonebook integration into the automated rebuild pipeline so it runs on every entity group build.

### 6.1 Pipeline Sequence

The full automated pipeline becomes:

```
1. Build entities from VA CSV + Bloomerang CSV
2. Build unified entity database
3. Load PhonebookDatabase from Drive
4. STEP 1: Pre-group phonebook entity matching (Phase 5.1)
   - Match phonebook → entities, write matchAssociations (entityKey, groupIndex=null)
   - Transfer phone/contact info and name aliases on match
   - NO entity creation (deferred to Step 3)
5. Build entity groups (unchanged algorithm, unchanged inputs)
6. STEP 3: Post-group phonebook integration (Phase 5.3)
   - 5.3a: Fill in groupIndex on Step 1 matchAssociations
   - 5.3b: Create phonebook-sourced entities for unmatched records (with IndividualNameDatabase lookup)
   - 5.3c-couple: Deterministic couple-aware forced group placement
   - 5.3c: Run remaining phonebook entities through group matching (emulating VA/Bloomerang process)
   - 5.3d: Create single-entity groups for still-unmatched
   - 5.3e: Apply name aliases for group-level matches
   - 5.3f: Phase 4.5 individual discovery
7. Save entity groups to Drive
8. Save IndividualNameDatabase to Drive
```

### 6.2 Integration Functions

- **`phonebookStep1(phonebookDb, entityDb)`** — orchestrates pre-group matching. Writes matchAssociations on PhonebookDatabase entries (entityKey populated, groupIndex null). Transfers phone and name aliases to matched entities. No entity creation.
- **`phonebookStep3(phonebookDb, groupDb, entityDb, indNameDb)`** — orchestrates post-group integration. Fills in groupIndex on Step 1 matchAssociations. Creates phonebook-sourced entities for unmatched records (with IndividualNameDatabase lookup). Runs new entities through group matching emulating VA/Bloomerang process. Creates single-entity groups for still-unmatched.
- Both called from the main pipeline (or from `buildEntityGroupDatabase()` if wired in directly). No separate "results structure" is passed between steps — the PhonebookDatabase entries ARE the shared state.

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
| `scripts/matching/phonebookEntityMatcher.js` | ~596 | Entity-level matching helpers + classification (Phase 4.6) |

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
