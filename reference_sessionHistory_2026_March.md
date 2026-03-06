# Session History - March 2026

## Purpose
This document contains detailed session-by-session work logs offloaded from CLAUDE.md to maintain conciseness. CLAUDE.md references this document for historical context when needed.

## Reading Instructions
- Sessions are in reverse chronological order (most recent first)
- Each session includes: date, status, what was done, files modified
- For completed/verified features, this is the authoritative record

---

## Session 138 - Phase 5.1 Coded+Tested: phonebookStep1() orchestrator complete (March 2, 2026)

**Status**: CODED_NOT_TESTED (inaugural run) — Phase 5.1 Step 1 orchestrator coded and tested on incremental path. Not yet saved to Drive.

### What was done

**Continuation of Session 137** (ran out of context, resumed). Completed remaining Phase 5.1 helpers and the phonebookStep1() orchestrator.

### Code Changes

**phonebookEntityMatcher.js** — all new functions:
- `transferPhonebookNameAlias(entity, entityKey, phonebookNameStr, phoneNumber, indNameDb)` — thin wrapper calling existing Phase 4 functions: extractIndividualNameFromEntity(), indNameDb.get()/lookup(), addPhonebookAliasToIndividualName(). Returns {action, detail}.
- `shouldSkipPhonebookRecord(entry, entityDb)` — incremental skip optimization. Validates existing matchAssociations by checking entityKey existence in entity DB. Clears stale associations. **Bug found and fixed**: synthetic individual keys (`:individual:N`) don't exist as top-level entries — added parent key resolution (extract parent key before `:individual:`, check that instead). Diagnostic confirmed: 312 synthetic keys with valid parents, only 2 truly stale.
- `phonebookStep1(phonebookDb, entityDb, indNameDb)` — full orchestrator. Iterates person-classified entries, applies skip optimization, runs entity-level matching + classification, writes progressive matchAssociations (entityKey populated, groupIndex null), transfers phone + name aliases on match. Returns comprehensive stats object.

### Bug: Synthetic Individual Key Resolution in shouldSkipPhonebookRecord()

Initial version checked `entityDb.entities[assoc.entityKey]` directly. Synthetic keys like `visionAppraisal:FireNumber:1510:individual:0` don't exist as top-level entries — only parent key `visionAppraisal:FireNumber:1510` does. First run wrongly classified 312 valid associations as "stale" and cleared them. PhonebookDatabase reloaded from Drive (undamaged). Fix: when direct lookup fails and key contains `:individual:`, extract parent key and check that. Re-run after fix confirmed: 832 skipped (up from 571), 2 truly stale cleared, 287 processed.

### Testing Results

- transferPhonebookNameAlias: 3/3 passed (alias added, alias already existed, no IndividualName found)
- shouldSkipPhonebookRecord: 3/3 passed (valid association skips, no association doesn't skip, stale association cleared)
- phonebookStep1() full run (after fix): 1119 person entries, 832 skipped, 287 processed, 2 full matches, 0 name, 0 address, 285 no classified match, 2 phone transfers (island), 2 name aliases added, 0 errors
- Note: 832 skipped = records with valid existing matchAssociations from prior pipeline runs (loaded from Drive). The 287 processed are genuinely unmatched at entity level. Only 2 new entity-level matches found among them — the rest (285) are candidates for Step 3 group-level matching.

### Important Context for Next Session

- PhonebookDatabase was NOT saved to Drive after the Step 1 run (user agreed — only 2 new associations, not worth the save risk during testing)
- The run tested the **incremental skip path**, not the inaugural build. On an inaugural run, no records have existing matchAssociations, so all 1119 person records would be processed.
- User inclusions/exclusions (Phase 5.1 steps 3-4 in plan) not yet implemented — may defer to Phase 7 (PhonebookBrowser)
- Next: Phase 5.2 (entity key format) then Phase 5.3 (post-group integration)

### Files Modified
- scripts/matching/phonebookEntityMatcher.js (3 new functions + bug fix)

---

## Session 137 - Phase 5.1 Start: Helpers + Architectural Decision on Entity Creation (March 2, 2026)

**Status**: IN_PROGRESS — Phase 5.1 helpers coded, orchestrator pending (continued in Session 138)

### Key Architectural Decision: No Entity Creation in Step 1

Extensive discussion led to the decision to defer ALL phonebook entity creation from Step 1 (pre-group) to Step 3 (post-group). Rationale:

1. **Cross-entity matching gap**: Group-level matching can find matches that entity-level cannot. When name evidence exists on entity A and address evidence on entity B (same group), group-level combines them and applies the lower 0.80 name+address threshold. Entity-level treats them as separate name-only (0.845 threshold) and address-only matches. Records in the 0.80-0.845 gap would fail entity-level but succeed group-level.

2. **Duplicate prevention**: If Step 1 creates entities for "unmatched" records that later match at group level, we'd have duplicate entities — the new one AND the existing one that matched. Preventing this would require modifying the entity group builder with phonebook-aware filters.

3. **Architectural consistency**: The entity group builder should receive unchanged inputs. Phonebook entities should go through the same create→match→group process that VA/Bloomerang entities follow. In the VA/Bloomerang process, when an entity passes group matching, the entity is ADDED as a group member (key stored in memberKeys[]). Collections are built AFTER all grouping in a single pass. Phonebook Step 3 emulates this.

4. **Two fates for phonebook individuals**: (a) Info transferred to existing matched entity (name alias + phone) — can happen at Step 1 or Step 3; (b) New entity created from phonebook data — happens only at Step 3, after legacy group creation.

### Code Changes

**supplementalDataDatabase.js**:
- `addMatchAssociation()` validation relaxed: now requires at least one of `groupIndex` OR `entityKey` (was: `groupIndex` required). Supports progressive matchAssociation model where Step 1 writes entityKey with null groupIndex.

**phonebookEntityMatcher.js**:
- `transferPhonebookPhone(phoneNumberStr, targetEntity)` — new helper function. Creates PhoneTerm with PHONEBOOK_DATABASE source, wraps in SimpleIdentifiers (matching existing entity structure). Three outcomes: 'confirmed' (existing phone replaced with phonebook-sourced version), 'added-island' (new island phone), 'added-additional' (new non-island phone). Duplicate detection via normalized 10-digit comparison across islandPhone, phone, and additionalPhones[].
- Key discovery during testing: phone fields on entities are SimpleIdentifiers wrapping PhoneTerm as .primaryAlias — not raw PhoneTerm objects. Initial version had incorrect instanceof checks; fixed after diagnostic investigation.

### Documentation Updates
- reference_phonebookDatabasePlan.md: Phase 5.1 updated (no entity creation), Phase 5.3 reordered (5.3b creates entities BEFORE 5.3c group matching), Phase 6 pipeline sequence updated, testing strategy updated.
- CLAUDE.md: Current work context + status tracker updated.
- MEMORY.md: Two-Step Integration section revised, user preferences added (test instructions, data structure assumptions).

### Files Modified
- scripts/databases/supplementalDataDatabase.js (addMatchAssociation validation)
- scripts/matching/phonebookEntityMatcher.js (transferPhonebookPhone helper)
- reference_phonebookDatabasePlan.md (plan revisions)
- CLAUDE.md (status updates)
- MEMORY.md (architectural decision + user preferences)

### Testing Results
- addMatchAssociation: 3/3 passed (groupIndex present, entityKey-only, neither rejected)
- transferPhonebookPhone: 3/3 passed (confirmed existing phone with source replacement, added new island phone, added non-island as additional)

---

## Session 136 - Phase 4.6 Completion: classifyEntityMatchResult() + Plan Audit (March 2, 2026)

### Status: Phase 4.6 CODED & TESTED. Plan Phases 5+6 audited and revised (count-based → nature-based, progressive matchAssociation).

### What was done

**1. Built classifyEntityMatchResult() in phonebookEntityMatcher.js**

- Entity-level counterpart to group-level `classifyPhonebookMatch()` in phonebookMatcher.js.
- Replicates all 5 classification rules: streetOnly rejection, variable name thresholds (PHONEBOOK_CLASSIFICATION_THRESHOLDS: nameWithAddress=0.80, nameWithCollision=0.845, nameAlone=0.845), address-alone requires fireNumber/PO box, full-kills-partials, Couple Condition 2.
- Helper `_checkEntityCoupleCondition2()` — AggH-only couple check using `source` field as discriminator (not matchedGroupNameKey).
- Rewrote `batchEntityMatch()` to run classification and report classified results vs raw hits.

**2. Testing results**

- Test A (Aldo Leone, fire#335): fullMatches:1, nameMatches:0, addressMatches:0 — correct full match.
- Test B (T. ROBINSON, OCEAN AVE — streetOnly synthetic): 69 raw entity hits → 0 classified — streetOnly rejection confirmed.
- Test C (full batch, 305 person records with no prior group-level match): 273 with raw hits, 0 classified. Expected — these records also failed group-level matching (more context).

**3. Critical architectural lesson: count-based vs nature-based thinking**

User identified fundamental confusion in plan documentation and my reasoning: referring to record categories by count ("the 285", "the 108", "the 817") instead of by nature (what matching outcome they represent). Count-based thinking:
- Makes the plan appear to depend on inaugural build knowledge
- Creates false impression that inaugural and incremental builds require different logic
- Loses the actual meaning of each category

Correct framing: categories are discovered through matching, described by nature:
- "Person record with full match to person entity" (not "the 817")
- "Person record with address-only match to non-person entity" (not "the 108")
- "Person record with no classified entity-level match" (not "the 285")

**4. Progressive matchAssociation model clarified**

No separate "Step 1 results structure" — matchAssociation records are progressively filled:
- Step 1 writes: entityKey, matchType, matchSource, bestNameScore, isCollision, isCoupleCondition2 — groupIndex left null
- Step 3 fills in: groupIndex (by looking up which group the matched entity belongs to)
- For records unmatched at entity level: Step 3 runs group-level matching, fills in both entityKey and groupIndex

**5. Inaugural vs incremental: same pipeline logic**

Trivial difference — only skip optimization. If a record already has a matchAssociation with a valid entityKey (and that entity still exists), skip re-matching. On inaugural run, nothing to skip.

**6. Plan Phases 5+6 audit and revision**

8 issues identified and corrected in reference_phonebookDatabasePlan.md:
1. Count-based case references → nature-based descriptions throughout
2. Fate accounting table → reframed as "Inaugural Build Results (Historical Reference)"
3. "Step 1 results structure" → progressive matchAssociation model
4. Phase 4.6 status → CODED & TESTED with test results
5. "Why two steps" rationale → information-availability-based explanation
6. Inaugural vs incremental → clarified as same logic with skip optimization
7. "817-equivalent cases" → "records that received a classified entity-level match in Step 1"
8. Testing strategy → nature-based checks instead of count-specific assertions

**7. Couple Condition 2 understanding**

CC2 is a match-PROMOTION rule (relaxes thresholds when both couple members match different names), NOT a false-positive-prevention rule. At entity level, limited to AggregateHouseholds with populated individuals[]. Without group knowledge, we simply don't apply cross-entity CC2 — entity-level is more conservative. Step 3 catches those cases later.

### Files Modified

| File | Changes |
|------|---------|
| scripts/matching/phonebookEntityMatcher.js | Added classifyEntityMatchResult(), _checkEntityCoupleCondition2(), rewrote batchEntityMatch() with classification |
| reference_phonebookDatabasePlan.md | Phase 4.6 status → CODED & TESTED. Phases 5+6: 8 audit corrections (count→nature, progressive matchAssociation, etc.) |

### Next Session

Begin Phase 5.1 implementation: pre-group phonebook entity matching. First step is designing the `phonebookStep1()` orchestrator that processes all person-classified records through entity-level matching and writes progressive matchAssociations.

---

## Session 135 - Phase 4.6 Entity-Level Matching: Build + Test + Classification Insight (March 2, 2026)

### Status: Phase 4.6 helpers 1-3 coded & tested. classifyEntityMatchResult() identified as required 4th component. Plan updated.

### What was done

**1. Built entity-level lookup helpers (phonebookEntityMatcher.js — new file)**

- `lookupNameOnEntity(phonebookNames, entity)` — compares phonebook names against Individual.name or AggregateHousehold.individuals[].name. Threshold 0.80. Tested: Aldo Leone on FireNumber:335 (score 1.000), Carolyn Benjamin as Individual (score 1.000), empty individuals[] on AggH returns empty (correct).
- `lookupAddressOnEntity(record, entity)` — compares phonebook address against entity's BI addresses (primary + secondary). Includes `_isBlockIslandAddress()` gate replicating exact entityGroup.js logic (lines 371-373).
- `lookupPOBoxOnEntity(record, entity)` — compares phonebook PO box. Coded, not tested with real PO box data.

**2. BI address false positive discovered and fixed**

- Initial lookupAddressOnEntity() had no Block Island filter. `testEntityMatch('Aldo', 'Leone', '335')` returned 6 hits including bloomerang entity at 335 Warhurst Ave, Swansea MA.
- Added `_isBlockIslandAddress()` gate matching exact entityGroup.js logic: `isBlockIslandAddress?.term === 'true' || === true || zipCode?.term === '02807'`. User caught that initial implementation used a proxy truthy check instead of the actual code — fixed to match exactly.
- After fix: 2 correct hits only.

**3. Orchestrator and batch diagnostic**

- `matchPhonebookRecordToEntities(record, entities)` — iterates all entities, collects raw hits grouped by entity key. Tested with synthetic records.
- `batchEntityMatch(db, limit)` — runs PhonebookDatabase unmatched entries through entity matcher. Revealed massive streetOnly false positives: T. ROBINSON on OCEAN matched 66 entities, ROBIN MCMANUS on CORN NECK matched 339 entities.

**4. Classification insight — critical plan revision**

- User feedback: "You are not studying the legacy code closely enough. We put a lot of work into developing the entity level matches WITHIN THE CONTEXT OF ENTITY GROUP CODE."
- Deep study of `classifyPhonebookMatch()` revealed 5 classification rules that entity-level code must replicate: (1) streetOnly rejection, (2) variable name thresholds via PHONEBOOK_CLASSIFICATION_THRESHOLDS, (3) address-alone requires fireNumber/PO box, (4) full matches kill partials, (5) Couple Condition 2.
- Plan updated: `classifyEntityMatchResult()` added as 4th required Phase 4.6 component.

**5. Key architectural lesson**

Group-level collections (group.blockIslandAddresses, group.individualNames) contain only qualifying items by construction — filters are built into collection assembly. Entity-level code must explicitly replicate those filters. The `_isBlockIslandAddress()` gate and `classifyEntityMatchResult()` are how entity-level code achieves the same filtering that group-level code gets for free.

### Files Created

| File | Purpose |
|------|---------|
| scripts/matching/phonebookEntityMatcher.js | Entity-level lookup helpers, orchestrator, diagnostics (Phase 4.6) |

### Files Modified

| File | Changes |
|------|---------|
| index.html | Added script tag for phonebookEntityMatcher.js (after phonebookAnnotationResolver.js) |
| reference_phonebookDatabasePlan.md | Phase 4.6 expanded: added classifyEntityMatchResult() as 4th component, status annotations, lesson learned. Phase 5.1 updated to reference classified matches. |

### Next Session

Build `classifyEntityMatchResult()` in phonebookEntityMatcher.js — the entity-level classification function that mirrors `classifyPhonebookMatch()` using `PHONEBOOK_CLASSIFICATION_THRESHOLDS`. Then re-run `batchEntityMatch()` with classification to verify streetOnly false positives are eliminated.

---

## Session 134 - Phase 4.5 Re-run + Phonebook Fate Accounting + Phase 5 Redesign (March 1, 2026)

### Status: Phase 4.5 re-run 35/35. Phonebook fate fully accounted. Phases 5+6 redesigned as two-step pipeline. Audit Report plan created.

### What was done

**1. Phase 4.5 re-run with ERRONEOUS fix**: 35/35 households processed (up from 34/35 Session 132), 54 individuals created, 48 new IndividualName entries. Saved to Drive: 2157 entries, 3002 variations.

**2. Comprehensive phonebook fate accounting**: Every phonebook association categorized:
- 817 resolved to IndividualName (Phases 4.1/4.4/4.5)
- 108 matched to NonHumanName entity (100 LegalConstruct + 8 Business)
- 285 person unmatched (no associations)
- 120 non-person classified
- 2 Bloomerang key missing

**3. Phases 5+6 completely redesigned**: Old Phase 5 (phone assignment) and Phase 6 (post-group integration) replaced by two-step pipeline:
- Step 1 (pre-group): Match phonebook → entities. Create phonebook-sourced Individuals for 108 and 285 cases. Transfer phone/contact info.
- Entity group creation runs UNCHANGED.
- Step 3 (post-group): Slot matched phonebook entities into groups (BEFORE re-matching unmatched). Re-match unmatched against enriched groups. Create single-entity groups for still-unmatched. Apply name aliases.

**4. Audit Report plan created**: reference_auditReportPlan.md — system-wide data quality audit (future scope, not current work).

### Files Modified

| File | Changes |
|------|---------|
| reference_phonebookDatabasePlan.md | Phases 5+6 redesigned, fate accounting table, two-step pipeline design |
| reference_auditReportPlan.md | New file — audit report plan |

### Next Session

Build Phase 4.6 entity-level phonebook matching helpers.

---

## Sessions 135–138 — Summary (history entries not written at end of sessions)

**Session 135**: Phase 4.6 — `classifyEntityMatchResult()` built in phonebookEntityMatcher.js. Eliminates streetOnly false positives (Test B: 69 raw → 0 classified). Full batch on unmatched records: 0 classified (expected). Collection pre-filtering trap lesson learned: entity-level code must explicitly add filters that group-level collections provide for free.

**Session 136**: Phase 4.1–4.6 all coded and tested. IndividualNameDatabase on Drive: 2157 entries, 3002 variations, 762 homonyms, all consistent. Phase 4.5 re-run: 35/35 households, 54 individuals, 48 new entries, 6 data quality issues (management tool corrections). Nature-based categories lesson: describe records by nature, not count.

**Session 137**: Phase 5.1 in progress. Architectural decision: entity creation deferred from Step 1 to Step 3. Reasons: (1) group-level matching finds cross-entity matches (0.80 name+address threshold vs 0.845 name-alone), (2) creating entities before groups produces duplicates, (3) avoids modifying existing entity group builder. Two-step progressive matchAssociation model solidified. `transferPhonebookPhone()` coded.

**Session 138**: Phase 5.1 `phonebookStep1()` fully coded+tested. All helpers: `transferPhonebookPhone()`, `transferPhonebookNameAlias()`, `shouldSkipPhonebookRecord()`. Bug found+fixed: `shouldSkipPhonebookRecord()` didn't resolve synthetic `:individual:N` keys — 312 valid associations wrongly cleared as stale. Fix: parent key resolution. Test run (incremental path): 832 skipped, 287 processed, 2 full matches, 285 unmatched. PhonebookDatabase NOT saved to Drive (testing only).

---

## Session 142 — Phases 5.3c-5.3f + Phase 6 pipeline integration coded+tested (March 5, 2026)

### Status: All Step 3 sub-phases coded+tested. Phase 6 pipeline wired into buildEntityGroupDatabase(). Full automated build tested.

### What was done

**1. Code review of Sessions 140-141** — independent review identified matchType naming inconsistency: Step 1 wrote `'name'`/`'address'` while original pipeline wrote `'name-only'`/`'address-only'`. Fixed by standardizing Step 1 to original convention. Cat2=0 confirmed expected (Step 1 produced 0 address matches).

**2. Phase 5.3c-couple — Forced couple placement**: `placeCouplePhonebookEntities()` places newly-created couple member entities into same group as matched sibling. Test: 1 placement (TED from phone 4014663001 into group 1156). 0 errors.

**3. Phase 5.3c/d/e — Group matching + single-entity groups + aliases**: `_findGroupMatchForEntity()` compares one entity against all group members using `universalCompareTo()`+`isTrueMatch()`. `matchPhonebookEntitiesToGroups()` orchestrates: AH entities first (household stays together), then individuals, then single-entity groups for unmatched.

**4. Unmatched couple household fix**: Initial design broke unmatched couples apart into singles pool. Diagnostic showed 0/135 former-couple entities matched as individuals, and all 45 couples were scattered across 3 separate groups. Fixed: unmatched couples get one household group with all 3 entities together.

**5. Phase 5.3c/d/e test results**: 55 couple groups + 230 singles. AH matched: 11, individuals matched: 34. Total placed in existing groups: 67. Household groups created: 44. Single-entity groups: 196. Name aliases: 31. Phone transfers: 45. 0 errors. 88.3 seconds.

**6. Phase 5.3f — Individual discovery**: `tagIndividualDiscovery()` + `processIndividualDiscovery()` — 35/35 households, 54 individuals. Same results as prior testing. Confirmed working within full pipeline sequence.

**7. Phase 6 — Pipeline integration**: All phonebook functions standardized: `entityDb` wrapper parameter → `.entities` plain object (matching entity group builder convention). Affected: `phonebookStep1`, `createPhonebookEntities`, `placeCouplePhonebookEntities`, `matchPhonebookEntitiesToGroups`, `shouldSkipPhonebookRecord`, `identifyUnmatchedCoupleMember`. `buildEntityGroupDatabase()` in entityGroupBuilder.js modified: loads PhonebookDatabase + IndividualNameDatabase from Drive, runs Step 1 before group phases, runs Step 3 (5.3a-5.3f) after member collections and before CollectiveContactInfo, rebuilds all member collections post-phonebook. Full automated build tested.

### Files Modified

| File | Changes |
|------|---------|
| scripts/matching/phonebookEntityMatcher.js | matchType fix ('name'→'name-only', 'address'→'address-only'). `placeCouplePhonebookEntities()` new. `_findGroupMatchForEntity()` new. `matchPhonebookEntitiesToGroups()` new. Unmatched couple household fix. All 6 functions: entityDb parameter → entities. |
| scripts/matching/entityGroupBuilder.js | `buildEntityGroupDatabase()`: loads PhonebookDb + IndNameDb, Step 1 pre-group, Step 3 post-group (5.3a-5.3f), post-phonebook collection rebuild. |
| CLAUDE.md | Updated to Phase 6 status |
| reference_phonebookDatabasePlan.md | 5.3 and Phase 6 marked CODED+TESTED |

---

## Session 140+141 — Phase 5.3b coded+tested, Step 1 consumedMembers tracking added (March 5, 2026)

### Status: Phase 5.3b entity creation coded and tested. Step 1 modified to track per-member match status for couples. Category 2 showing 0 (not yet investigated). Ready for next phase.

### What was done

**1. Phase 5.3b — Entity creation for unmatched records (Sessions 140-141)**:

Session 140 (ran out of context): Plan created and approved. All 5.3b functions coded: `createPhonebookIndividual()`, `createPhonebookHousehold()`, `identifyUnmatchedCoupleMember()`, `createPhonebookEntities()`, `_registerPhonebookName()`. Three categories: Cat1 (completely unmatched), Cat2 (address-only to non-person), Cat3 (couple with partial match).

First test: `Cannot read properties of undefined (reading 'firstName')` on ~16 records. Bad fix applied (guard to skip entries with no name data) — violated ROOT_CAUSE_DEBUGGING_RULE. Reverted. Diagnostic showed error was in `identifyUnmatchedCoupleMember()` calling `createPhonebookNameObjects({firstName, lastName})` instead of `createPhonebookNameObjects({name: {firstName, lastName}})`. Fixed.

Second test: 95 tie warnings from `identifyUnmatchedCoupleMember()`. All Category 3 entries were ties (0 non-ties), meaning the re-comparison approach to determine which couple member was consumed fundamentally couldn't work. Score distribution: 63 at 1.000 (both members on same AH), 24 at 0.000, 8 at other scores. Root cause identified: Step 1 didn't record which couple member(s) produced the name hits.

**2. Step 1 consumedMembers tracking (Session 141)**:

User chose to modify `phonebookStep1()` to add per-member tracking rather than trying to reconstruct this information after the fact.

- New helper `_computeConsumedMembers(nameHits, record)` — partitions nameHits by `hit.phonebookName.firstName` to determine per-member best scores. Returns `[{firstName, bestScore}, {firstName, bestScore}]`.
- `phonebookStep1()` modified: for couple records, full and name matchAssociations now include `consumedMembers` field computed from classified match nameHits.
- `identifyUnmatchedCoupleMember()` rewritten: reads `consumedMembers` from matchAssociations instead of re-comparing names against entities. Member with bestScore > 0 = consumed. Pre-existing associations (original pipeline, no consumedMembers) → both members accounted for (the couple was already matched).
- Error guards added: Case 2d (neither consumed despite person matches with consumedMembers data) logs console.error. Case 4 (mix of Step 1 and pre-existing associations) logs console.error.

**3. Test results after consumedMembers fix**:

Step 1: Same as before (832 skipped, 287 processed, 2 full matches, 285 unmatched).
5.3a fillGroupIndex: Same (2 filled, 925 already had).
5.3b: Cat1=285 (55 couples), Cat2=0, Cat3=1, 0 errors, 0 key collisions, 0 tie warnings.
- Entities: 341 individuals + 55 households = 396 total
- IndNameDb: 329 new entries, 0 aliases
- Diagnostic confirmed: 1 couple Step1 association with consumedMembers, 0 without
- The 1 Cat3 case: phone 4014663001 (Janet & TED), Janet bestScore=1.0, TED bestScore=0 → Individual created for TED

### Key insights from this session

- `createPhonebookNameObjects()` expects `{name: {firstName, lastName}}` (record with nested .name), NOT flat `{firstName, lastName}`. This caused the firstName error.
- Step 1 must record per-member match data at match time. Trying to reconstruct it later by re-comparing names fails because both couple members often match the same AggregateHousehold equally (producing ties).
- When impossible states occur (Case 2d, Case 4), throw loud errors — don't silently handle them.
- Pre-existing associations (from original pipeline) mean the couple was already matched. Both members are accounted for. This is not a "fallback" — it's the correct, simple behavior.

### Open items

- **Category 2 showing 0**: Expected some address-only-to-non-person records, got 0. Not yet investigated.
- **Phase 5.3c-couple**: Couple-aware forced group placement (place TED in Janet's group). Not started.
- **Phase 5.3c**: Group matching for new entities. Not started.
- **Phase 5.3d**: Single-entity groups for still-unmatched. Not started.

### Files Modified

| File | Changes |
|------|---------|
| scripts/matching/phonebookEntityMatcher.js | `createPhonebookIndividual()`, `createPhonebookHousehold()`, `identifyUnmatchedCoupleMember()`, `createPhonebookEntities()`, `_registerPhonebookName()` (Phase 5.3b). `_computeConsumedMembers()` (new helper). `phonebookStep1()` modified for consumedMembers tracking on couple matches. |

---

## Session 139 — Phase 5.2 coded+tested, Phase 5.3a coded+tested (March 3, 2026)

### Status: Phase 5.2 `buildPhonebookEntityKey()` coded+tested. Phase 5.3a `fillGroupIndex()` coded+tested. Session crashed during end-of-session documentation.

### What was done

**1. Phase 5.2 — Entity key format design + implementation**:
- Detailed specification discussion with user about key format, couple handling, AH creation
- User specified three new rules: (a) both couple members unmatched → 2 Individuals + 1 AH following Bloomerang model, (b) both matched → audit flag for same-phone different-group, (c) one matched/one not → force-place unmatched in matched member's group
- Key format: `phonebook:<phone>:SimpleIdentifiers:<disambiguator>:<headStatus>` following Bloomerang structural pattern
- AH uses lastName (household identity), individuals use firstName, head/member/na convention
- User correction: AH key uses lastName not firstName (household name = last name)
- `buildPhonebookEntityKey()` function written in phonebookEntityMatcher.js (lines 950-1022)
- Tested: 6/6 pass (single person, couple AH, couple head, couple member, no firstName, collision detection)

**2. Phase 5.3a — Fill in groupIndex on Step 1 matchAssociations**:
- `buildEntityKeyToGroupIndexMap()` — builds reverse map (entity key → group index) in O(n) over all groups
- `lookupGroupIndex()` — handles direct keys and synthetic `:individual:N` resolution
- `fillGroupIndex()` — 5.3a orchestrator, uses `for...of phonebookDb` (correct class iterator)
- All three functions in phonebookEntityMatcher.js (lines 1024-1150)
- Tested after loading all databases + running Step 1:
  - Reverse map: 4106 entity keys
  - 927 matchAssociations processed, 2 filled (new Step 1 matches), 925 already had groupIndex
  - 0 not found, 0 errors

**3. Plan documentation updated before crash**:
- reference_phonebookDatabasePlan.md Phase 5.2: revised key format table with 6 scenarios
- reference_phonebookDatabasePlan.md Phase 5.3b: couple handling spec (both unmatched → AH + 2 individuals)
- reference_phonebookDatabasePlan.md Phase 5.3c-couple: couple-aware forced group placement spec
- reference_phonebookDatabasePlan.md Phase 5.3-audit: cross-group audit category spec
- reference_auditReportPlan.md: new category #3 (same-phone entities in different groups)

**4. Session crashed**: "Prompt is too long" twice when attempting CLAUDE.md + session history updates. All code + plan documentation was saved before crash.

### Files Modified

| File | Changes |
|------|---------|
| scripts/matching/phonebookEntityMatcher.js | `buildPhonebookEntityKey()` (Phase 5.2), `buildEntityKeyToGroupIndexMap()` + `lookupGroupIndex()` + `fillGroupIndex()` (Phase 5.3a) |
| reference_phonebookDatabasePlan.md | Phase 5.2 key format table, Phase 5.3b couple handling, Phase 5.3c-couple forced placement, Phase 5.3-audit audit category |
| reference_auditReportPlan.md | New audit category #3: same-phone entities in different groups |

### Next Session

Phase 5.3b — Create phonebook-sourced entities for unmatched records. This is the largest sub-step: entity construction (IndividualName, ContactInfo, Address), couple handling (AH + 2 Individuals when both unmatched), IndividualNameDatabase lookup during entity creation.
