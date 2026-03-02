# Session History - February 2026

## Purpose
This document contains detailed session-by-session work logs offloaded from CLAUDE.md to maintain conciseness. CLAUDE.md references this document for historical context when needed.

## Reading Instructions
- Sessions are in reverse chronological order (most recent first)
- Each session includes: date, status, what was done, files modified
- For completed/verified features, this is the authoritative record

---

## Session 133 - Data Quality Management Rule + ERRONEOUS Tag Fix (March 1, 2026)

### Status: ERRONEOUS tag fix coded and tested (4/4 pass). All 6 data quality issues resolved as management tool cases. Phase 4.5 re-run needed.

### What Was Done

**1. DATA_QUALITY_MANAGEMENT_RULE (permanent):**
- Added to CLAUDE.md as permanent rule (same tier as ROOT_CAUSE_DEBUGGING_RULE)
- 5 core principles: detection in production, management tools, exception processes, workflow preservation, dataset trajectory
- PROJECT_COMPLETION_GATE: cannot declare complete without all 5 capabilities

**2. Completion Gates added to reference_phonebookDatabasePlan.md:**
- Gate 1: Production data quality detection code
- Gate 2: Database management tools for user corrections
- Gate 3: Exception processes accessing stored corrections in production
- Gate 4: Workflow preservation (corrections survive rebuilds)
- Gate 5: Documentation (systems, user, UI)
- Gates mapped to existing phases (6, 7, 8)

**3. Issue 6 (LEEDER FireNumber:1531) root cause analysis:**
- Hypothesis: nonhuman classification → ruled out (classified as "person" in resolved rules)
- Root cause: "LEEDER, FRED C III" — suffix "III" inflates word count from 3→4
- Case31Validator detects case16 (4-word household) instead of case5 (3-word individual)
- case16 processor creates AggregateHousehold with empty individuals[] and no firstName
- extractNameComponentsFromEntity fallback sets only lastName, firstName stays null
- collectNamesForHousehold gate `firstName && lastName` fails → 0 names → SKIP
- Confirmed by console diagnostic: case16, AggregateHousehold, firstName null, fails gate
- Comparison: "LEEDER, Fred C" (without III) detects correctly as case5

**4. ERRONEOUS name tagging fix:**
- User decision: do NOT fix Case31 parser. Tag the error for management tool correction.
- Two edits in phonebookNameProcessing.js:
  - getDistinctPersonNames(): added entityType passthrough from record.name
  - collectNamesForHousehold(): new detection block before firstName gate
- Detection: entityType === 'AggregateHousehold' && !firstName && lastName
- Action: generate synthetic firstName = "ERRONEOUS" + 3 random vowels + 4 random consonants
- Sets isCouple = false, logs console.warn, name flows through normal individual creation
- Tested 4/4: entityType propagation, tagging fires, normal names unaffected, end-to-end with real parser

**5. Data quality issues decision (all 6):**
- User directive: ALL 6 issues handled via detection + management tools, NOT algorithmic fixes
- Issues 1-5 (VON ARX, BUDA, WILKES, O'SHEA, KIVLEHAN): no code changes, future management tool corrections
- Issue 6 (LEEDER): ERRONEOUS tag applied so it's no longer skipped, corrected via management tools

### Code Changes
- `scripts/matching/phonebookNameProcessing.js`: 2 edits (entityType field + erroneous tag block)

### Documentation Changes
- CLAUDE.md: DATA_QUALITY_MANAGEMENT_RULE section, updated CURRENT_WORK_CONTEXT + STATUS_TRACKER
- reference_phonebookDatabasePlan.md: Completion Gates section (5 gates + phase mapping table)
- MEMORY.md: Data Quality Management persistent memory entry

---

## Session 132 - Phase 4.5 Individual Discovery: Plan + Code (March 1, 2026)

### Status: Coded and tested. 34/35 households processed, 53 individuals created. 6 data quality issues identified for review. Results in memory only (not saved to Drive).

### What Was Done

**1. Phase 4.5 Planning:**
- Read reference_phonebookDatabasePlan.md, reference_systemDocumentation_executiveSummary.md, reference_entityGroupCollections.md
- Studied VA AggregateHousehold creation in visionAppraisalNameParser.js (createIndividual, createAggregateHousehold)
- Studied entityClasses.js (Entity, Individual, AggregateHousehold constructors), contactInfo.js, householdInformation.js
- Provided thorough description of objects in individuals[] and their relationship to AggregateHousehold
- Answered 5 clarifying questions with user:
  - Q1: 5 address cases defined by user (street only→nothing, existing fire#→nothing, existing PO box→nothing, new fire#+street→create BI, new PO box→create BI)
  - Q2: Copy VA properties (pid, fireNumber, mblu, googleFileId, source, assessment values)
  - Q3: Yes copy assessment/appraisal values
  - Q4: Use IndividualNameDatabase wherever possible
  - Q5: Collect distinct names using same comparison standard as buildMemberCollections()

**2. Phonebook Name Reconciliation Investigation:**
- Traced Phase 4.1 code: extractIndividualNameFromEntity() returns null for empty AggH → these 39 cases entirely skipped
- Verified NO cross-entry name reconciliation in any pipeline phase (each record processed individually)
- User confirmed using buildMemberCollections thresholds: homonym >= 0.875, synonym >= 0.845

**3. Created reference_phase4_5_individualDiscoveryPlan.md:**
- 12-section detailed plan (498 lines)
- Covers: consistency requirements, name reconciliation standard, 5 address cases, phone storage, ContactInfo cloning, individual creation steps, data flow, implementation structure, reporting, scope boundaries, prerequisites, open items
- User reviewed and approved without corrections

**4. Phase 4.5 Implementation (5 functions in phonebookNameProcessing.js):**
- `collectNamesForHousehold(entryRefs)` — collects person names, splits couples, deduplicates by exact key
- `reconcileNames(nameObjects)` — builds anchor set using IndividualName.compareTo() four-score, same thresholds as _tryMatchToExistingName()
- `createIndividualForHousehold(anchor, household, idx, allPhoneNumbers)` — creates Individual consistent with VA pattern, clones ContactInfo, copies all VA properties, adds HouseholdInformation
- `createBlockIslandAddress(params)` + `checkAndAddNewAddresses(household, entryRefs)` — implements 5 address cases, creates BI addresses for Cases 4-5
- `processIndividualDiscovery(phonebookDb, options)` — top-level orchestrator, groups tagged associations by entityKey, processes each household

**5. Code Review — Three Bugs Caught and Fixed:**
- **Double-address bug**: New addresses added to household before clone, then explicitly added to individuals again → removed explicit addition, clone handles it
- **Async add() on IndividualNameDatabase**: add() persists to Drive → changed to direct entries.set() for memory-only operation (save bulk later)
- **Missing variation cache rebuild**: Added indNameDb._buildVariationCache() after processing

**6. Documentation Updates:**
- Updated CLAUDE.md: CURRENT_WORK_CONTEXT, CURRENT_STATUS_TRACKER, REFERENCE_NAVIGATION, SESSION_METADATA
- Added Section 13 (Testing Plan) to reference_phase4_5_individualDiscoveryPlan.md
- Updated reference_phonebookDatabasePlan.md Phase 4.5 status

### Key Design Decisions
- Name reconciliation uses same standard as EntityGroup._tryMatchToExistingName() — not a new standard
- ContactInfo deep cloned via serializeWithTypes/deserializeWithTypes — avoids object reference issues
- New addresses added to household BEFORE creating individuals, so the clone picks them up automatically
- IndividualNameDatabase modified in memory only (entries.set()), save bulk separately after verification
- All phone numbers stored on ALL individuals (user directive)

### Files Modified
| File | Changes |
|------|---------|
| `scripts/matching/phonebookNameProcessing.js` | Added ~755 lines: 5 new functions for Phase 4.5 (lines 756-1510) |
| `reference_phase4_5_individualDiscoveryPlan.md` | Created (498 lines) → Added Section 13 (testing plan) |
| `reference_phonebookDatabasePlan.md` | Updated Phase 4.5 status from PENDING to CODED |
| `reference_sessionHistory_2026_February.md` | Added Session 132 |
| `CLAUDE.md` | Updated context, status, navigation, metadata to v227.0 |

**7. Browser Test Run:**
- Loaded all prerequisites: Entity DB, EntityGroup DB, StreetName DB, IndividualName DB (DEV), PhonebookDB
- Ran `tagIndividualDiscovery(db, window.unifiedEntityDatabase.entities)` — 39 associations tagged
- Ran `processIndividualDiscovery(db)` — completed without errors

**8. Test Results:**
- 39 tagged associations → 35 unique households (multiple associations per household)
- 34/35 processed, 1 SKIP (LEEDER FireNumber:1531 — 0 parseable names from phonebook)
- 53 individuals created, 0 names reconciled (all distinct)
- 11 new addresses (Cases 4-5), 37 phone numbers distributed
- 47 new IndividualName DB entries (memory only, not saved)
- IndividualNameDatabase in memory: 2156 entries, 3001 variations (was 2109/2954)
- 0 errors

**9. Data Quality Issues Identified (phonebook source data, NOT code bugs):**

| # | FireNumber | Household | Issue | Details |
|---|-----------|-----------|-------|---------|
| 1 | 1050 | VON ARX | Name prefix split wrong | "ARX, VON" and "ANNIE VON" — VON treated as first/last name instead of prefix |
| 2 | 469 | BUDA | Names concatenated | "LINDA MORANBUDA" — should be "MORAN-BUDA" (hyphenated) |
| 3 | 1762 | WILKES | Wrong person at address | "L SHEEHAN" created as head — different person at same address |
| 4 | 1521 | O'SHEA | Wrong person at address | "FRANCIS COLEMAN" — different person at same address |
| 5 | 203 | KIVLEHAN | Maiden name used | "ROSALIE O'BRIEN" — maiden/middle name, married name is KIVLEHAN |
| 6 | 1531 | LEEDER | No parseable names | Skipped — phonebook has 0 names that could be parsed |

These are all phonebook source data quality issues. The code correctly processed what it was given — the input data is the problem.

### Session Statistics
- Lines of new code: ~755 (phonebookNameProcessing.js)
- Bugs caught in review: 3
- User questions answered: 5
- Documentation sections created: 13 (plan) + 1 (testing)
- Test run: 34/35 processed, 53 individuals, 6 data quality issues

---

## Session 131 - DB Recovery + Safety Fixes + Phase 4 Re-run (February 28, 2026)

### Status: All done. Phase 4 re-run saved and consistent. Next: Phase 4.5.

### What Was Done

**1. Completed DB Recovery (from Session 130):**
- Fixed gapi.client.drive calls in file-out hot path (root cause of ~2 batch failures)
- Full content comparison: 2109/2109 exact match between bulk and individual files
- Consistency check passed: 2109/2109/2109

**2. Safety Code Changes (coded and verified):**
- **A1**: Auto-backup before bulk save
- **A2**: `backupBulkFile()` gapi → raw fetch
- **A3**: `loadIndividualNameDatabaseFromBulk()` gapi → raw fetch
- **A4**: `isFirstRun()` async — checks Drive for existing bulk before allowing rebuild
- **A5**: `handleBuildRunResume()` awaits isFirstRun()
- **A6**: Pre-save stats logging in `saveModifiedIndividualNames()`
- All verified working: consistency check passed, `isFirstRun()` returns false, `backupBulkFile()` succeeds

**3. Phase 4 Re-run:**
- Loaded all 4 prerequisites (EntityGroupDB 1877, UnifiedEntityDB 4106, IndividualNameDB 2109, PhonebookDB 1239)
- Ran `processPhase4NameVariations(db)`: 1194 person aliases + 19 nonhuman, 382 couples → 755 names, 0 errors
- Saved with auto-backup, filed out all 2109 entries (some cascading timeouts mid-run, all recovered on retry)
- Final consistency check: 2109/2109/2109 consistent. Index rebuilt from 2133 → 2109 (24 orphans from timeouts cleaned)

**4. Documentation:**
- Created `reference_saveInfrastructureLessons.md` — 8 lessons for UI workflow packaging
- Created `reference_supplementalDatabaseReuseLessons.md` — 8 lessons + checklist for next database
- Updated `reference_phonebookDatabasePlan.md` — Phase 4 status updated, history trimmed, lesson docs referenced

### Files Modified

| File | Changes |
|------|---------|
| `scripts/databases/individualNameDatabaseSaveManager.js` | 8 gapi→fetch conversions, auto-backup, isFirstRun async+bulk check |
| `scripts/individualNameBrowser.js` | `await isFirstRun()` in handleBuildRunResume |
| `scripts/matching/phonebookNameProcessing.js` | Pre-save stats logging |

### IndividualNameDatabase State
2109 entries, 2954 variations, 762 homonyms. Bulk/folder/index all consistent.

### Next Steps
1. Phase 4.5: instantiate individuals in empty AggH (39 cases)
2. Phase 4.6: entity-direct fallback
3. Phase 4.7: J.P. TANGEN match quality review
4. Phase 5: phone number assignment

---

## Session 130 - Phase 4.4 Couples Implemented + IndividualNameDatabase Corruption Recovery (February 28, 2026)

### Status: Phase 4.4 code implemented and tested. IndividualNameDatabase corrupted during save attempt, recovery in progress (bulk restored from DEV, file-out partially done, index/consistency check pending).

### Context

Continued from Session 129. Implemented Phase 4.4 (couples handling), then attempted to save the updated IndividualNameDatabase to Google Drive. The save process went wrong when the Build/Resume button triggered a full rebuild instead of file-out, corrupting the main bulk file. Remainder of session was recovery work.

### Phase 4.4: Couples Handling Implementation

**Design**: Extract inner loop into helper `processOneNameAgainstAssociations()`, call it for both individual and couple paths. For couples (`isCouple: true`), split `{firstName, secondName, lastName}` into two individual names: `firstName lastName` and `secondName lastName`.

**Code changes to phonebookNameProcessing.js:**
- Added `processOneNameAgainstAssociations()` helper function (~40 lines)
- Refactored `processPersonNameVariations()` to use the helper
- Added couple splitting logic: person1 = firstName+lastName, person2 = secondName+lastName
- Changed stats from flat variables to a `stats` object
- Updated return value: `couplesSkipped` → `couplesProcessed`, `coupleNamesProcessed`, `individualsProcessed`
- Updated orchestrator summary logging in phonebookPipeline.js

**Test results:**
- First run: 382 couples → 755 individual names, 1194 aliases added, 0 errors
- Idempotency test: 0 added, 1325 already existed — confirmed idempotent

### IndividualNameDatabase Corruption

**How it happened:**
1. `saveModifiedIndividualNames()` returned "No modified entries" because `results` held the second (idempotency) run
2. Used `saveIndividualNameDatabaseBulk()` directly — saved 2109 entries to bulk file (correct)
3. Tried to file out individual files via UI "Build Run/Resume" button
4. Session guard blocked ("Cross Check not run this session")
5. After resetting localStorage progress, Build/Resume triggered a **FULL REBUILD** instead of file-out
6. Rebuild overwrote main bulk with 2107 entries and only 6 homonyms (destroying all accumulated alias data)

**Investigation:**
- Main bulk: corrupted (2107 entries, 6 homonyms) — modified today
- Backup bulk: 2105 entries, 261 homonyms — from Feb 3, 4:23 PM
- DEV bulk: 2109 entries, 256 homonyms — from Feb 3, 5:42 PM
- Individual files: ALL from Feb 3 (2110 files) or Feb 28 (400 files from rebuild)
- ZERO days of manual alias editing between Feb 3 and today
- All extra aliases (762 homonyms in Phase 4 run vs 256 in DEV) came from Phase 4 phonebook runs, which are repeatable

**Key discovery:** Loading from bulk requires `deserializeWithTypes(entryData.object)` as a direct function call (line 250 of individualNameDatabaseSaveManager.js), NOT as a JSON.parse reviver. Multiple wrong deserialization approaches were tried before reading the actual code.

### Recovery Plan (Approach 1 — Restore from DEV bulk)

| Step | Description | Status |
|------|-------------|--------|
| 1 | Load DEV bulk into memory, verify 2109/256 | Done — verified |
| 2 | Save to main bulk, verify | Done — verified 2109/256 |
| 3 | Clean orphan files, move to deletedNames | Done — 340 duplicates + 2 orphans moved, 2108 files remain |
| 4 | File out to individual files in batches | In progress — ~1550 done, auth failures mid-batch |
| 5 | Rebuild index from folder | Pending |
| 6 | Final consistency check | Pending |

**File-out progress:**
- Batches 1-4: ~1550 entries filed out successfully
- Auth failed mid-batch with 401 Unauthorized (NOT token expiry — under 30 minutes)
- localStorage progress lost on browser refresh
- Reloaded bulk, confirmed 2109/256 still intact
- Need to count folder files to determine actual progress before resuming

### Errors and Lessons

1. **Build/Resume button danger**: When localStorage progress is reset, the button interprets "no progress" as "first time build" and runs `buildIndividualNameDatabase()` instead of `fileOutIndividualNames()`. This overwrites the bulk file.
2. **fileOutIndividualNames localStorage progress lost on refresh**: Cannot determine resume point after browser restart without counting folder files.
3. **Auth failures can occur in under 30 minutes**: 401 Unauthorized was observed well before the 1-hour token expiry. Root cause unknown — NOT token expiry.
4. **Read code before guessing deserialization**: Multiple wrong approaches were tried before reading the actual `loadIndividualNameDatabaseFromBulk()` source code.
5. **Wrong file name guesses**: Guessed Google Drive file names instead of querying API. Always use `fetch` to get actual file metadata.
6. **Wrong backup copy folder**: Copied from reference doc folder instead of working folder.

### User Feedback

- "You are screwing up left right and center" — stop guessing, read code
- "STOP GUESSING STOP HURRYING SLOW DOWN" — verify before acting
- "You are again leaping to conclusions" — re: wrongly diagnosing 401 as token expiry
- Priority is recovering the database, NOT saving new phonebook aliases
- Phase 4 aliases are regenerable — the base database is what matters

### Files Modified
| File | Changes |
|------|---------|
| `scripts/matching/phonebookNameProcessing.js` | Phase 4.4 couple handling: `processOneNameAgainstAssociations()` helper, couple splitting, stats object refactor |
| Google Drive: main bulk file | Restored from DEV bulk (2109 entries, 256 homonyms) |
| Google Drive: individual files folder | ~340 orphans moved to deletedNames, ~1550 entries filed out |

### State at Session End
- Main bulk: 2109/256 (restored from DEV, verified)
- Individual files: partially filed out (~1550 of 2109, need folder count to confirm)
- Index: not yet rebuilt
- Phase 4.4 code: in phonebookNameProcessing.js but aliases NOT in database (bulk was restored to pre-Phase4 DEV state)
- Next session: count folder files → finish file-out → rebuild index → consistency check → re-run Phase 4

---

## Session 129 - Phase 3 Revision Verified: individualDiscovery Tagging + Synthetic Key Validation (February 28, 2026)

### Status: Phase 3 revision verified. Synthetic key resolution validated (322/322). individualDiscovery tagging implemented and tested (39 tagged). Full Phase 3 accounting established.

### Context

Session 128 implemented Phase 4 code fixes but they were not witnessed/verified by the user. This session verified those fixes, validated synthetic key resolution, implemented the Phase 3 revision (individualDiscovery tagging), and established a complete Phase 3 accounting.

### Verification of Session 128 Fixes

User had not witnessed Session 128's testing. Code inspection confirmed the fixes exist in phonebookNameProcessing.js:
- `extractNumericScore()` helper at lines 44-50
- `resolveEntityForAssociation()` synthetic key handling at lines 116-166

Full pipeline was rebuilt from scratch to verify in fresh environment.

### Synthetic Key Validation

Designed and ran diagnostic to validate all synthetic keys in PhonebookDatabase resolve against entity database:
- **322 total synthetic keys** (with `:individual:N` suffix)
- **320 resolved successfully** on first test
- **2 failed**: Bloomerang space-discrepancy in CSV-derived addresses
  - `bloomerang:1106AH` — `Dr.Dune` vs `Dr. Dune` (space after period)
  - `bloomerang:1743AH` — `LaneApt` vs `Lane Apt` (space before Apt)
- **Root cause**: Bloomerang CSV address data has inconsistent spacing that propagates through key generation
- **Fix**: User manually edited the 2 PhonebookDatabase individual files on Google Drive to remove erroneous spaces, matching the entity DB format
- **Final result: 322/322 resolve** — user verified

### Phase 3 Revision: individualDiscovery Tagging

**Initial wrong approach (reverted):** Added tagging inside the address-only matchAssociation creation block of `populatePrimaryMatches()`. Diagnostic showed 0 tagged — the empty-individuals AggH cases are NOT address-only matches. They are 32 user-annotated + 7 heuristic.

**Key insight from user:** The individualDiscovery tag is about the DESTINATION (AggregateHousehold with empty individuals[]), not the match route. It must be match-type agnostic.

**Correct implementation:** Added `tagIndividualDiscovery(db, entityDb)` as a post-processing function at the end of phonebookPipeline.js. Scans ALL matchAssociations regardless of matchType, checks if the resolved entity is an AggregateHousehold with empty `.individuals[]`, and tags with `individualDiscovery: true`.

**Result: 39 associations tagged** — user verified.

### Full Phase 3 Accounting

Complete breakdown of all 947 matchAssociations:
| Category | Count |
|----------|-------|
| Direct entity key (resolved) | 623 |
| Synthetic key (resolved via `:individual:N` split) | 320 |
| Direct key not found | 2 |
| Synthetic key parent not found | 2 |
| **Total associations** | **947** |
| Empty-individuals AggH tagged | 39 |

**4 failed key resolutions:**
- `bloomerang:1106AH` — space discrepancy (fixed on Drive, persists in code pipeline)
- `bloomerang:1743AH` — space discrepancy (fixed on Drive, persists in code pipeline)
- `bloomerang:13:SimpleIdentifiers:...` (ELLIOT NERENBERG) — key not in entity DB
- `bloomerang:161:SimpleIdentifiers:...` — newly discovered, key not in entity DB

### Count Discrepancy: 115 vs 39

Session 128 documented 115 empty-individuals AggH. Fresh rebuild found 39. The 115 came from the persisted PhonebookDatabase built in Session 127 (possibly with different entity group state). Accepted 39 as the current accurate count from a clean pipeline rebuild.

### User Feedback and Lessons

Strong corrective feedback during this session:
1. **Don't assume code paths — verify**: Assumed empty-individuals cases would be address-only matches. They're not.
2. **Don't guess — run diagnostics**: When 324 "entity not found" appeared, guessing "most are synthetic keys" was rejected. User demanded verification.
3. **Empty-individuals AggH are the FEATURE TARGET, not failures**: These are cases Phase 4.5 is being built to handle. They were never expected to resolve in Phase 4.
4. **Tag is destination-based, not route-based**: individualDiscovery applies regardless of how the match was made (address, heuristic, annotation, etc.)
5. **Read documentation before searching code**: User corrected multiple instances of searching code when documentation had the answer.

### Files Modified
| File | Changes |
|------|---------|
| `scripts/matching/phonebookPipeline.js` | Added `tagIndividualDiscovery(db, entityDb)` post-processing function (~25 lines) |
| `reference_phonebookDatabasePlan.md` | Phase 3 Revision updated (pending → coded/tested, corrected approach) |
| `reference_sessionHistory_2026_February.md` | Added Session 129 |
| `CLAUDE.md` | Updated work context, status tracker, version 223.0, 2 new lessons learned |
| `memory/MEMORY.md` | Updated Phase 4 fixes verified, empty-individuals count corrected to 39, added individualDiscovery lesson |

---

## Session 128 - Phase 4 Testing: Bugs Fixed, Structural Issues Diagnosed (February 27, 2026)

### Status: Phase 4 partially working. Three bugs fixed. Two structural data issues diagnosed and design decisions made.

### Context

Phase 3 was verified in Session 127. This session tested Phase 4 name variation processing (phonebookNameProcessing.js) for the first time. Testing revealed code bugs, led to deep investigation of entity key structures, and uncovered an unanticipated benefit of phonebook data.

### Bug 1: compareTo Type Mismatch (379 errors → 0)

First test run produced 379 errors: "Cannot compare objects of different types: IndividualName vs String". Root cause: `numericCompareTo()` delegates to `genericObjectCompareTo()` (utils.js:2095) which checks `obj1.constructor === obj2.constructor`. IndividualName.compareTo() (aliasClasses.js:1002) accepts strings, but numericCompareTo() does not.

**Fix:** Added `extractNumericScore()` helper function in phonebookNameProcessing.js. Changed 3 call sites from `numericCompareTo(string)` to `extractNumericScore(obj.compareTo(string))`.

### Bug 2: Synthetic Key Resolution (307 → 116 failures)

307 "no entity resolution" failures. Root cause: IndividualNameDatabase builder (individualNameDatabaseBuilder.js:305) creates synthetic keys `${memberKey}:individual:${index}` for individuals within AggregateHouseholds. These keys don't exist as real keys in unifiedEntityDatabase.

**Fix:** Added synthetic key detection in `resolveEntityForAssociation()` — detects `:individual:N` pattern, splits to parent key, looks up parent entity, indexes into `parent.individuals[N]`. Recovered 191 cases (307 → 116).

### Bug 3 (non-bug): Bloomerang Synthetic Keys

Bloomerang AggregateHousehold individuals have their own real entity keys but the IndividualNameDatabase builder applies `:individual:N` suffix to them anyway.

**Decision:** Keep builder behavior as-is. Rationale: (1) changing risks downstream breakage, (2) the suffix may be used in downstream code, (3) it adds information (marks individual as household member), (4) Phase 4's resolution handles it correctly. All 153 non-couple Bloomerang+VA synthetic keys resolve successfully.

### Diagnostic: 116 Remaining Failures Classified

Detailed diagnostic classified all 116 "no entity resolution" failures:

**312 total synthetic entityKeys in PhonebookDatabase:**
- 159 from couple entries (Phase 4 skips these)
- 153 from non-couple entries — ALL 153 resolve successfully, 0 fail
- User noticed the ~2:1 ratio matching individuals-per-household, leading to correct diagnosis

**116 failures are NOT synthetic key failures. They are:**
- 115 VA AggregateHouseholds where entity exists but `.individuals[]` is empty (length 0)
- 1 Bloomerang key not found in unifiedEntityDatabase (ELLIOT NERENBERG)

### Key Discovery: Phonebook Reveals Unparsed Household Members

The 115 VA AggregateHouseholds have HouseholdNames containing multiple people (e.g., "HIZA, CHRISTOPHER J, HIZA, CRYSTAL M") but the VisionAppraisal parsing could not separate them into Individual objects. The phonebook algorithm matched to these households by address and carries clean individual names.

**This is an unanticipated benefit:** phonebook data can identify individuals that name parsing failed to extract. User directed that this capability should be implemented across Phase 3 (tagging) and Phase 4 (instantiation).

### Design Decisions Made

1. **Phase 3 revision:** Tag matchAssociations with `individualDiscovery: true` when matched entity is AggregateHousehold with empty individuals. Lightweight metadata addition.
2. **Phase 4 instantiation:** Create Individual objects within empty-individuals AggregateHouseholds using phonebook-derived names. Address-match alone is sufficient trust.
3. **Bloomerang builder:** Keep synthetic key assignment. Phase 4 adapts.
4. **Couples:** Will be implemented (no longer deferred). Split into two individual names.
5. **Entity-direct fallback:** When IndividualName not in database, fall back to entity's IndividualName directly.

### Pending Items for Next Session

1. Phase 3 revision: add individualDiscovery tagging to pipeline
2. Phase 4.5: implement individual instantiation in empty AggH households
3. Phase 4.4: implement couples handling
4. 1 Bloomerang key not found (ELLIOT NERENBERG) — investigate
5. J.P. TANGEN cross-person alias — investigate match quality
6. Entity-direct fallback for IndividualNames not in database

### Files Modified
| File | Changes |
|------|---------|
| `scripts/matching/phonebookNameProcessing.js` | Added extractNumericScore() helper; fixed 3 compareTo call sites; added synthetic key resolution in resolveEntityForAssociation() |
| `reference_phonebookDatabasePlan.md` | Phase 4 updated with testing results, new subsections 4.4-4.7, Phase 3 revision section |
| `reference_sessionHistory_2026_February.md` | Added Session 128 |
| `CLAUDE.md` | Updated work context, status, lessons learned |

### Lessons Learned
- `numericCompareTo()` and `genericObjectCompareTo()` enforce constructor type match — cannot compare IndividualName to String. Use the class's own `compareTo()` method which may accept strings.
- IndividualNameDatabase synthetic keys (`${key}:individual:N`) propagate through the entire pipeline from builder → database → matching → matchAssociations. Phase 4 must resolve them back to real entities.
- Some VA AggregateHouseholds have empty `.individuals[]` arrays — name parsing could not separate the owner names. This is a known data characteristic, not a bug.
- Diagnostic-driven investigation is essential: initial speculation about causes was wrong (lazy "bloomerang not in DB" guess); systematic classification of all 116 failures revealed the true root cause.
- User directive: take one step at a time, discuss changes, test incrementally. Do not charge ahead fixing multiple issues simultaneously.

---

## Session 127 - Phase 3 Clean Rebuild: Verified Inaugural PhonebookDatabase (February 27, 2026)

### Status: Phase 3 fully verified. Ready for Phase 4 testing.

### Context

Session 126 diagnosed the unreliable prior database and established a clean rebuild plan. This session executed that plan end-to-end and thoroughly verified the results.

### Annotation Resolution (Step 3.2)

Wrote `scripts/matching/phonebookAnnotationResolver.js` (359 lines):
- `resolveAnnotationKeys()` — one-time resolution translating 165 user annotations (name + group index) to entityKeys
- `loadResolvedPhonebookRules()` — persistent loader for subsequent pipeline runs
- Resolution: 167 inclusions (58 exact, 109 group-shifted, 0 failed), 10 exclusions (10 exact, 0 failed)
- Output saved permanently to `servers/progress/resolved_phonebook_rules.json`
- Classification fix: `_classifyAnnotation()` checks entityType/matchEntityType in addition to unreliable isBusiness flag

### Pipeline Execution (Step 3.3)

All stats matched Session 123 validation targets exactly:
- 1239 total entries (1113 person, 126 nonhuman)
- 853 matched, 386 unmatched
- 143 manual inclusions, 9 manual exclusions
- 97 nonhuman classified, 26 heuristic matches
- 772/772 entityKeys (zero null)

### Google Drive Persistence (Step 3.4)

Bulk file saved (2544.3 KB). Individual file-out hit gapi auth corruption at ~954 files — same failure point as prior sessions.

**Root cause diagnosed:** `gapi.client.drive.files.*` uses internal auth plumbing that silently corrupts after OAuth token expiry. Calls hang without rejecting. `gapi.client.getToken()` reports fresh token but all gapi API calls return 401.

**Fix:** Replaced ALL 7 `gapi.client.drive.files.*` calls in `supplementalDataDatabase.js` with raw `fetch()` using explicit `Bearer ${gapi.client.getToken().access_token}` headers. Also consolidated `_createObjectFile` from 2 API calls (gapi create + fetch PATCH) to 1 (multipart POST). Added `mergeIndexFileIds()` method for incremental file-out after bulk load.

After fix: remaining 321 entries filed out successfully (0 failures). 39 orphaned empty-shell files from prior session cleaned up.

### Validation (Step 3.5)

**Internal consistency:** Full content verification — 1239/1239 exact match between bulk file and individual files on Google Drive.

**Old-vs-new comparison** (old bulk file `1nSX8OBnc_ievf4NPsAMO04rm7oQZ09nC`):
- Same entries: 1239/1239, perfect overlap
- Same group associations: 1239/1239
- Null entityKeys: old 0, new 0
- EntityKey quality: 549 same, 398 differ (Levenshtein guesses → authoritative keys)
- Classification changes: 7 total (6 correct nonhuman→person, 1 WATER COMPANY fixed)

### Classification Fix

Phone `4014663232` ("WATER COMPANY") was classified as "person" because annotation had `isBusiness: false` despite `entityType: "Business"` and `matchEntityType: "Business"`. Fixed in resolver (`_classifyAnnotation()`) and corrected in database. Bulk + individual file re-saved.

### Files Created
| File | Purpose |
|------|---------|
| `scripts/matching/phonebookAnnotationResolver.js` | One-time annotation resolution (name→entityKey) + persistent loader |
| `servers/progress/resolved_phonebook_rules.json` | 167 resolved inclusions + 10 resolved exclusions (permanent) |

### Files Modified
| File | Changes |
|------|---------|
| `scripts/databases/supplementalDataDatabase.js` | Replaced 7 gapi.client.drive calls with raw fetch; added mergeIndexFileIds(); _createObjectFile now single multipart request |
| `scripts/matching/phonebookPipeline.js` | Updated comments/error messages to reference phonebookAnnotationResolver.js |
| `index.html` | Added script tag for phonebookAnnotationResolver.js |
| `reference_phonebookDatabasePlan.md` | Phase 3 marked verified, updated code/file inventory |
| `CLAUDE.md` | Updated work context, status tracker, lessons learned, session metadata |

### Lessons Learned
- `gapi.client.drive.files.*` is unreliable for bulk operations — silent auth corruption after token expiry. Use raw `fetch()` with explicit Bearer tokens for ALL Google Drive API calls.
- When verifying database persistence, check three levels: fileId existence (index), file readability (content), and content correctness (bulk vs individual). Index claims can be phantom.
- Multipart upload (metadata + content in single request) halves API calls vs create-then-patch pattern.
- Annotation source data flags (like `isBusiness`) may be incorrect — cross-reference against multiple fields.

### Next Session

Test Phase 4 (name variation processing). Code exists in `phonebookNameProcessing.js` (662 lines, 12 functions), written but never tested.

---

## Session 126 - Diagnostic Session: Clean Rebuild Plan and Code Restructuring (February 27, 2026)

### Status: Diagnostic and restructuring complete. Ready for clean Phase 3 rebuild next session.

### Context

Session 125 was disorganized and damaging — it applied Levenshtein-guessed entityKeys to the Google Drive database rather than re-running the pipeline with correct code. This session stepped back to diagnose the full scope of problems and establish a clean path forward.

### Diagnosis

The inaugural PhonebookDatabase (built Sessions 123-125) has fundamental problems:
1. **747 of 947 entityKeys are Levenshtein guesses**, not authoritative. The original Phase 3 build (Session 123) never captured entityKeys for full/name-only matches. Code to capture them was written in Session 124 but the database was never rebuilt. Session 125 backfilled by guessing rather than re-running the pipeline.
2. **The annotation resolution script was deleted** (Session 123 Phase 3.5). This script translated user annotations (entity names + group indices) into entity keys. Its output existed only as `window.resolvedPhonebookRules` — a transient browser variable. When the script was deleted, the ability to re-run Phase 3.3 was lost.
3. **The plan document accumulated patches** from multiple crisis sessions rather than reflecting clean architecture.

### Two-Goal Framework (Agreed)

**Goal 1 (one-time):** Build inaugural PhonebookDatabase from user annotations + algorithmic matching. Includes a one-time annotation resolution step (translating names to entity keys).

**Goal 2 (repeatable):** Build permanent code that supports three input channels:
- Algorithmic matches (re-derivable)
- User-declared inclusions (permanent human knowledge)
- User-declared exclusions (permanent human knowledge)

All three channels stored as permanent database data, not transient variables.

### Code Restructuring

Split `phonebookMatcher.js` (3,071 lines, 55 functions) into 4 focused files:

| New File | Lines | Contents |
|----------|-------|----------|
| `scripts/matching/phonebookMatcher.js` | 773 | Core matching + classification (13 functions) |
| `scripts/matching/phonebookDetection.js` | 676 | Non-human detection + heuristic matching (14 functions) |
| `scripts/matching/phonebookPipeline.js` | 1,024 | EntityKey extraction + pipeline orchestration (11 functions) |
| `scripts/matching/phonebookNameProcessing.js` | 662 | Phase 4 name variation processing (12 functions) |

Verified: all 49 regular functions + 1 async function + 4 constants accounted for, zero differences from original. Load order dependency: B (detection) must load before C (pipeline). All others independent.

### Other Changes

- **New Google Drive IDs** for clean rebuild (set in phonebookDatabase.js:26-29). Old IDs preserved as comments for validation comparison.
- **Deleted 4 Session 125 backfill scripts** from scripts/diagnostics/ (addressOnlyMatchDiagnostic.js, backfillAddressOnlyEntityKeys.js, backfillNameMatchEntityKeys.js, verifyEntityKeys.js)
- **Updated index.html** — single script tag replaced with 4 in correct load order
- **Rewrote reference_phonebookDatabasePlan.md** — two-goal architecture, three input channels, clean Phase 3 plan, updated file summary, removed stale content
- **Updated CLAUDE.md** — current work context, code locations, status tracker, session metadata

### Source Data Inventory (Verified)

User's human knowledge exists in two files, both preserved:
1. `servers/progress/user_phonebook_annotations_2026-02-22.json` — 165 inclusions (name + group index, NO entityKey), 125 nonhuman declarations, 410 confirmed no-match
2. `servers/Results/phonebook match - Sheet1.csv` — P-1 review with 10 exclusions (n/g/b codes in column 1)

The 10 exclusions were traced back to the CSV: 6 wrong-match (n), 2 government (g), 2 business (b). This data had previously been consumed only by the deleted resolution script.

### Rebuild Plan (5 Steps)

1. **Write annotation resolution code** — resolve 165 inclusions + 10 exclusions from name+groupIndex to entityKey. Save output permanently (not as window variable). This is the step that went wrong before.
2. **Run repeatable pipeline** — parse → match → classify → populatePrimaryMatches(db, entityDb). Produces ~733 primary matches with authoritative entityKeys.
3. **Process no-match records** — ingest, apply inclusions, apply exclusions, classify nonhumans, apply heuristic matches.
4. **Persist to new Google Drive** resources.
5. **Validate against Session 123 stats** — compare entry counts, classifications, match sources.

### Files Modified
- `scripts/matching/phonebookMatcher.js` — replaced with Group A only (773 lines)
- `scripts/matching/phonebookDetection.js` — NEW (Group B, 676 lines)
- `scripts/matching/phonebookPipeline.js` — NEW (Group C, 1,024 lines)
- `scripts/matching/phonebookNameProcessing.js` — NEW (Group D, 662 lines)
- `scripts/databases/phonebookDatabase.js` — new Google Drive IDs
- `index.html` — 4 script tags replacing 1
- `reference_phonebookDatabasePlan.md` — rewritten for clean architecture
- `CLAUDE.md` — updated work context, code locations, status tracker
- Deleted: 4 diagnostic scripts from scripts/diagnostics/
- Preserved: `phonebookMatcher_ORIGINAL_BACKUP.js` (can delete once comfortable)

### Lessons Learned
- One-time artifacts (annotation resolution) must produce PERMANENT output, not transient variables. If the output is consumed once and the code deleted, you cannot rebuild.
- Guessing (Levenshtein backfill) is worse than honest nulls — it turns a diagnosable gap into actively misleading data.
- Files over ~1,000 lines cause operational problems for AI sessions — splitting is a prerequisite for reliable work, not a nice-to-have.
- Plan documents must clearly separate one-time operations from repeatable processes, or the one-time artifacts get treated as disposable when they contain irreplaceable data.

---

## Session 125 - EntityKey Backfill: Partial Success, Needs Authoritative Re-derivation (February 27, 2026)

### Status: EntityKey backfill applied but QUESTIONABLE for full/name-only matches. Needs review next session.

### What Was Done

**Code changes to phonebookMatcher.js (permanent, on disk):**
1. `extractEntityKeyFromAddressHits()` — new helper (~line 1451). For address-only matches, searches group members for matching fire number or PO box. Uses Levenshtein name similarity as tiebreaker when multiple members match.
2. `populatePrimaryMatches()` — address-only match block now calls `extractEntityKeyFromAddressHits(am, am.group, entityDb, pbNameStr)` instead of hardcoding `entityKey: null`.
3. `resolveEntityForAssociation()` — removed the fallback to `findBestIndividualNameInGroup()`. Null entityKey now logs error and returns null.
4. `findBestIndividualNameInGroup()` — deleted entirely.

**Phase 3.2 rebuild test (validated forward-looking code):**
- Ran full Phase 3.2 pipeline: processPhonebookFile() → matchAllPhonebookRecords() → classifyAllPhonebookMatches() → populatePrimaryMatches(db, entityDb)
- Result: 772/772 entity keys resolved, zero nulls
- This confirms the FORWARD-LOOKING code is correct for future rebuilds
- Phase 3.3 (processNoMatchRecords) failed because console_resolveAnnotationKeys.js was deleted in Session 123 Phase 3.5
- Decision: Do NOT rebuild full dataset. Patch existing saved database instead.

**Address-only entityKey backfill (25 items — HIGH CONFIDENCE):**
- Diagnostic study first: 25 address-only matches total (24 PO box, 1 fire number)
- Backfill searched group members for matching fire number/PO box
- 25/25 patched, 0 failed
- These are high confidence because fire number and PO box are exact-match lookups

**Full/name-only entityKey backfill (747 items — QUESTIONABLE CONFIDENCE):**
- 400 full + 347 name-only matchAssociations had null entityKeys (from original Session 123 build before extractEntityKeyFromNameHits existed)
- Backfill used best Levenshtein match of phonebook name against group member entity names
- 747/747 patched (206 single-member groups trivially correct, 541 multi-member groups used best-match tiebreaker)
- **PROBLEM**: This is a GUESS, not the authoritative answer. The authoritative entityKey comes from which entity's IndividualName actually matched during the original matchPhonebookRecordToGroups() run. That information was in the transient nameHits objects but was never saved. The backfill just picks the best-scoring member, which may be wrong for multi-member groups with similar names.

### Current State of Google Drive PhonebookDatabase
- 1239 entries, 947 matchAssociations, ALL have non-null entityKeys
- Breakdown: full:has=400, name-only:has=347, address-only:has=25, user-annotated:has=149, heuristic-high:has=15, heuristic-medium:has=11
- The 149 user-annotated entityKeys are UNTOUCHED — they came from the resolution script resolving actual user annotations
- The 26 heuristic entityKeys are UNTOUCHED — set by the heuristic matching code
- The 25 address-only entityKeys are high confidence (exact fire#/PO box match)
- The 747 full/name-only entityKeys are QUESTIONABLE — best Levenshtein guess, not authoritative

### CRITICAL QUESTION FOR NEXT SESSION
The 747 full/name-only entityKeys were derived by guessing (best Levenshtein match in group). The AUTHORITATIVE way to get them is to re-run the matching pipeline (parse → match → classify → populatePrimaryMatches with entityDb). This does NOT require the resolution script — only Phase 3.2 needs re-running. The approach would be:
1. Run Phase 3.1 steps (parse, match, classify) to regenerate nameHits
2. Run populatePrimaryMatches(freshDb, entityDb) to get authoritative entityKeys from nameHits
3. Copy those entityKeys onto the corresponding matchAssociations in the existing saved database
4. Leave the Phase 3.3 data (user-annotated, heuristic) untouched

Alternatively: the Levenshtein-guessed keys may be good enough for most cases (especially single-member groups = 206 trivially correct). The user should decide whether the 541 multi-member group cases need authoritative re-derivation.

### Diagnostic Scripts Created (temporary, in scripts/diagnostics/, NOT in index.html)
- `addressOnlyMatchDiagnostic.js` — studied the 25 address-only matches
- `backfillAddressOnlyEntityKeys.js` — patched 25 address-only entityKeys
- `backfillNameMatchEntityKeys.js` — patched 747 full/name-only entityKeys (questionable)
- `verifyEntityKeys.js` — verification script (written but not yet run)

### Files Modified
- `scripts/matching/phonebookMatcher.js` — extractEntityKeyFromAddressHits(), populatePrimaryMatches() fix, resolveEntityForAssociation() rewrite, findBestIndividualNameInGroup() deleted
- `scripts/diagnostics/` — 4 new temporary diagnostic files

### Lessons Learned
- After browser refresh, NO databases are in memory. Class definitions load from script tags but instances must be explicitly loaded.
- PhonebookDatabase is a console local variable (`const db`), not stored on a window global.
- The original Phase 3 build (Session 123) never captured entityKeys on full/name-only matches — that code was added in Session 124 but the database was never rebuilt.
- The console_resolveAnnotationKeys.js script was deleted in Session 123 Phase 3.5 but is still needed for full Phase 3 rebuilds (processNoMatchRecords depends on window.resolvedPhonebookRules).
- Backfilling entityKeys by guessing (best name match in group) is NOT the same as capturing them authoritatively at match time from nameHits.

### User Frustration Points
- Session was disorganized. AI jumped to fixes without proper study, gave imprecise instructions, lost track of the full scope of the entityKey problem (initially thought it was 25 items, turned out to be 772).
- AI should have recognized from the start that ALL entityKeys were null from the original build, not just address-only.
- AI should provide complete, precise testing instructions — not vague steps that assume memory state.

---

## Session 124 - Phase 4 Coded, Entity Key Provenance Principle Established (February 26, 2026)

### Status: Phase 4 code written but NOT tested; architectural fixes needed before testing

### Phase 3 Verification
User verified Phase 3 completion:
- Stats confirmed correct (1239 entries, 1113 person, 126 nonhuman, 853 matched, 386 unmatched)
- Google Drive round-trip tested: `const db = new PhonebookDatabase(); await db.loadFromBulk();` → `db.printStats();` — all stats matched exactly
- Spot-check confirmed real data loaded (Key: 2032334889, Classification: person, Raw records: 1, Match associations: 1)
- **Phase 3 is user-verified.**

### Phase 4 Plan and Implementation
Entered plan mode. Explored alias infrastructure (IndividualNameDatabase, Aliased class hierarchy), matchAssociation shapes, and entity group member access patterns. Produced plan for 12 modular functions.

**Phase 4 functions written** (phonebookMatcher.js after ~line 2215):
1. `getDistinctPersonNames(entry)` — like PhonebookEntry.getDistinctNames() but preserves isCouple flag
2. `constructPhonebookNameString(nameObj)` — `[firstName, secondName, lastName].filter(Boolean).join(' ').toUpperCase()`
3. `resolveEntityForAssociation(assoc, phonebookNameStr, groupDb, entityDb)` — uses entityKey directly
4. `extractIndividualNameFromEntity(entity, entityKey, phonebookNameStr)` — handles Individual and AggregateHousehold
5. `findBestIndividualNameInGroup(phonebookNameStr, group, entityDb)` — fallback (TO BE REPLACED WITH ERROR)
6. `categorizePhonebookNameScore(score)` — 'homonyms' if >= 0.875, else 'candidates'
7. `createPhonebookAliasAttributedTerm(nameString, phoneNumber, category)`
8. `addPhonebookAliasToIndividualName(indNameDbEntry, nameString, phoneNumber)` — checks getAllTermValues() for duplicates
9. `processPersonNameVariations(phonebookDb, groupDb, entityDb, indNameDb)` — main person orchestrator
10. `generateNewIndividualNameReport(entries)` — groups by last name for review
11. `processNonHumanNameVariations(phonebookDb, groupDb, entityDb)` — handles nonhuman aliases
12. `processPhase4NameVariations(phonebookDb, options)` — top-level orchestrator
13. `saveModifiedIndividualNames(indNameDb, modifiedPrimaryKeys)` — uses saveIndividualNameDatabaseBulk() to avoid _saveIndex corruption

### Critical Discovery: Entity Key Provenance Principle
During pre-test review, user identified a fundamental architectural flaw:

**Problem**: `populatePrimaryMatches()` created matchAssociations with only `groupIndex`, no `entityKey`. Phase 4 was designed to reconstruct entity identity within groups — an unnecessary workaround for data that should have been captured upstream.

**User's architectural principle** (two parts):
1. It is impossible to know an entity group association without knowing an entity association
2. Whenever an association is established, the entityKey that drove it MUST be preserved

**Root cause**: During CSV annotation creation (Session 114), entity keys were not included in the CSV. Backfilling corrected that case, but the code continued as if entityKey might be unavailable.

### Fixes Applied This Session
- **Added `extractEntityKeyFromNameHits()`** (~line 1432 in phonebookMatcher.js): Extracts entity key from name hits via two strategies — (1) sourceMap lookup on IndividualName's primaryAlias, (2) object identity match against group member entities
- **Modified `populatePrimaryMatches(db, entityDb)`**: Now takes entityDb parameter and records entityKey on all primary matchAssociations (fullMatches and nameMatches)
- **Simplified Phase 4**: Removed threshold-based within-group matching. `resolveEntityForAssociation()` uses entityKey directly.

### Known Issues Remaining (for next session)
1. **Address-only matches**: `entityKey: null` in populatePrimaryMatches — violates provenance principle. Need to derive from fire number → `visionAppraisal:FireNumber:XXXX`
2. **findBestIndividualNameInGroup() fallback**: Should be replaced with error throw (null entityKey = bug, not normal case)
3. **Phase 3 rebuild required**: Must re-run full pipeline with entityKey-aware populatePrimaryMatches(db, entityDb) and persist to Google Drive
4. **Phase 4 testing**: Deferred until after fixes and rebuild

### Documentation Updates
- `reference_phonebookDatabasePlan.md`: Added "Architectural Principle: Entity Key Provenance" section. Rewrote Phases 4, 5, and 6 to use entityKey directly instead of within-group matching
- `CLAUDE.md`: Updated CURRENT_WORK_CONTEXT, added entityKey_provenance_principle to CRITICAL_LESSONS, updated CURRENT_STATUS_TRACKER

### Save Strategy Discovery
Found that `saveObject()` calls `_saveIndex()` which would corrupt the Drive index when IndividualNameDatabase is loaded from bulk (fileIds are null). Changed Phase 4 save strategy to use `saveIndividualNameDatabaseBulk()` instead of per-entry `saveObject()`.

### Files Modified
- `scripts/matching/phonebookMatcher.js` — added extractEntityKeyFromNameHits(), modified populatePrimaryMatches() to record entityKey, added 13 Phase 4 functions (~lines 2215-2960)
- `reference_phonebookDatabasePlan.md` — added Entity Key Provenance principle, rewrote Phases 4/5/6
- `CLAUDE.md` — updated work context, technical patterns, status tracker

### Lessons Learned
- entityKey_provenance_principle: Every matchAssociation MUST record the entityKey. Null entityKey is a BUG. It is impossible to know an entity group association without knowing the entity that drove it.
- _saveIndex corruption risk: When databases are loaded from bulk, fileIds are null. saveObject() → _saveIndex() would overwrite valid Drive index with nulls. Use bulk save instead.
- Within-group threshold matching is unnecessary: If a record is matched to a group, the best-scoring member IS the target regardless of absolute score.

### Next Steps (Next Session)
1. Fix address-only matches entityKey extraction in populatePrimaryMatches()
2. Remove findBestIndividualNameInGroup() fallback → replace with error throw
3. Rebuild Phase 3 (re-run full pipeline with entityKey-aware code)
4. Save rebuilt database to Google Drive
5. Test Phase 4 on rebuilt database

---

## Session 123 - Phase 3 Completed: Resolution Script, Pipeline Test, Inaugural Persistence (February 26, 2026)

### Status: Phase 3 (all sub-phases 3.1-3.5) ready for user verification

### Resolution Script Rewrite (Phase 3.3 pre-step)
Rewrote `console_resolveAnnotationKeys.js` entity lookup to bypass group indices entirely:
- **Old approach**: `findEntityKeyInGroup(groupIndex, name)` — searched within a single annotated group
- **New approach**: `findEntityKeyByName(targetEntityName, annotatedGroupIndex)` — searches ALL entities in `entityDb` globally by name
- Exact match (single): direct return with current group via `findGroupByEntityKey()`
- Exact match (multiple): disambiguate using annotated group index as proximity hint (±10)
- Fuzzy match: substring containment + Levenshtein similarity (threshold ≥0.80)
- Annotated group index used only for logging/disambiguation, never for primary lookup

**Also fixed**: 2 annotation entries with `matchTarget: "both"` use different field naming (`match1EntityName`/`match2EntityName` instead of `matchEntityName`). Added matchTargets expansion logic to handle both formats.

**Result**: 166 inclusions resolved (0 failed), 9 exclusions resolved (0 failed). Previously was 58/165 (106 failed).

### Phase 3.3 Pipeline Test
Full prerequisite chain executed in browser console:
1. `processPhonebookFile()` — parsed phonebook
2. `matchAllPhonebookRecords(groupDb, entityDb)` — matched records to entity groups
3. `classifyAllPhonebookMatches(window.phonebookMatchResults)` — classified matches
4. `populatePrimaryMatches(db)` — populated primary matches (Phase 3.2)
5. `processNoMatchRecords(db)` — ran all 8 modular functions (Phase 3.3)

**Pipeline results**:
- 699 no-match records ingested
- 143 manual inclusions applied (from resolved annotations)
- 9 manual exclusions applied
- 97 non-human records classified (algorithmic)
- 26 heuristic matches accepted (MEDIUM+ confidence)
- 285 unmatched persons (placeholder — deferred)
- **1239 total DB entries** (540 primary + 699 no-match pipeline)

### Phase 3.4 Persist Inaugural Dataset
**Bulk file**: Saved successfully (2486 KB, 1239 entries) to Google Drive file ID `1nSX8OBnc_ievf4NPsAMO04rm7oQZ09nC`

**Individual file creation (fileOutEntries)**:
- First run: Created 900 files, then stalled (page became unresponsive after user re-authorized OAuth mid-operation)
- Recovery: Force-closed tab, reopened, loaded from bulk file, listed actual Drive folder contents (954 files already created), built name→fileId map from folder listing, patched fileIds onto bulk-loaded entries, rebuilt index from actual state
- Second run: `fileOutEntries({ parallelism: 3, indexSaveInterval: 50 })` — filed remaining 285 entries, 0 failures

**Google Drive resources** (set in phonebookDatabase.js:26-29):
- Index File ID: `1_JduEoBt95fyqSFDUPWHlUzA3F0P1fWz`
- Object Folder ID: `1kPhC9hReeSNDH4pwHdD2uZ1b9r95Y8kf`
- Deleted Folder ID: `1YhqPWIAQEozfGLV2Zhp0PLnL0afl_bvf`
- Bulk File ID: `1nSX8OBnc_ievf4NPsAMO04rm7oQZ09nC`

**Verification**: 1239/1239 entries have fileIds. Classification: 1113 person, 126 nonhuman. Match status: 853 matched, 386 unmatched.

### Phase 3.5 Delete Temporary Scripts
Deleted 6 temporary console scripts:
1. `servers/Results/console_session114_analysis.js`
2. `servers/Results/console_session114_saveAnnotations.js`
3. `servers/Results/console_session116_validation.js`
4. `servers/Results/console_nonhumanAnalysis.js`
5. `servers/Results/console_noMatchAnalysis.js`
6. `servers/Results/console_resolveAnnotationKeys.js` (marked "Delete after inaugural dataset creation" in own header)

Preserved: `servers/progress/user_phonebook_annotations_2026-02-22.json` (historical reference per plan)

### Files Modified
- `servers/Results/console_resolveAnnotationKeys.js` — rewrote entity lookup (then deleted in Phase 3.5)
- `scripts/databases/phonebookDatabase.js` — set 4 Google Drive file IDs (lines 26-29)
- Deleted 6 temporary console scripts (Phase 3.5)

### Lessons Learned
- `SupplementalDataDatabase.entries` is a `Map`, not a plain object — use `db.entries.size` and `db.entries.forEach()`, not `Object.values(db.entries)`
- OAuth re-authorization during long-running Drive operations can cause stalls — complete Drive operations before token expiry or save progress frequently
- Recovery from stalled fileOutEntries: load from bulk, cross-reference with Drive folder listing, patch fileIds, rebuild index, resume

### Next Steps
- Phase 4: Name Variation Processing (per reference_phonebookDatabasePlan.md)

---

## Session 122 - Phase 3.3 Modular Redesign Coded (February 26, 2026)

### Status: Phase 3.3 modular functions coded, ready for testing

### Architectural Discussion: Direction (a) vs (b)
Before coding, user initiated a research discussion about whether the matching process should be:
- **(a) Group-driven**: Each entity group searches for matching phone/email records
- **(b) Source-driven**: Each phone/email record searches for matching entity groups

Analysis examined three scenarios:
1. **Entity groups changed**: Direction (a) preferable — fresh matching against new structure, all issues attributable to entity group changes
2. **Only supplemental source changed**: Direction (b) preferable — process only the delta, issues clearly attributable to source changes
3. **Multiple sources changed simultaneously**: Direction (b) preferable — each source processes independently, issues remain isolated

**Decision**: Continue with direction (b). Key rationale: issue isolation when multiple data sources change simultaneously.

**Additional decisions from discussion**:
- Phase 6 must include re-matching for unmatched records (not just application of stored associations)
- Each supplemental source (phone, future email) runs its own matching process independently
- Unmatched person phonebook records will create new standalone entity groups (coded LAST after modules 1-4 verified — workflow implications may prompt reconsideration)

### Phase 3.3 Implementation

**Resolution script fix**: Removed non-human phone extraction from console_resolveAnnotationKeys.js (lines 228-251 and references in output object). Non-human classification is now a separate concern handled by hardcoded phone list in phonebookMatcher.js.

**Monolith replaced with 8 modular functions** (phonebookMatcher.js:1572+):
1. `verifyEntityKey()` — shared utility, uses findGroupByEntityKey (fixes getGroupForEntity bug)
2. `ANNOTATED_NONHUMAN_PHONES` / `HARDCODED_NONHUMAN_PHONES` — 111 user-declared phones
3. `ingestNoMatchRecords(db)` — adds all no-match records to DB as 'unclassified'
4. `applyManualInclusions(db)` — resolved annotation inclusions, verifies entity keys
5. `applyManualExclusions(db)` — resolved annotation exclusions, sets classification + exclusion
6. `classifyNonHumanRecords(db)` — hardcoded phones + detectNonHumanType() algorithmic
7. `applyHeuristicMatches(db)` — builds frequency table + entity list, auto-accepts MEDIUM+
8. `handleUnmatchedPersons(db)` — placeholder (logs count only)
9. `processNoMatchRecords(db)` — orchestrator calling all modules in sequence

All functions are top-level (global scope), callable individually from browser console for incremental testing.

### Files Modified
- `scripts/matching/phonebookMatcher.js` — replaced monolithic populateNoMatchRecords() (lines 1572-1901) with modular functions
- `servers/Results/console_resolveAnnotationKeys.js` — removed non-human phone extraction section
- `reference_phonebookDatabasePlan.md` — updated Phase 3.3 unmatched persons spec (Session 122 decision)

### Phase 3.3 Testing — Partial

**Phase 3.2 re-verified**: Loaded entity DB + entity group DB, ran processPhonebookFile(), matchAllPhonebookRecords(), classifyAllPhonebookMatches(window.phonebookMatchResults). Results: 684 entries, 671 person + 13 nonhuman — matches Session 121 results.

**Resolution script failure**: Ran console_resolveAnnotationKeys.js. Results:
- Match associations: Resolved 58, **Failed 106**, MOTT skipped 1
- Exclusions: Resolved 9, Failed 0
- Total inclusions stored: 58 (expected ~164)
- Total exclusions stored: 9

**Root cause investigation**: User correctly flagged that jumping to "group indices shifted" was premature.
Systematic diagnosis followed:

1. **Hypothesis 1 (getEntityNameStr silent failure)**: Eliminated — group 901 has 2 members, both returned valid names ("STATE OF RI AIRPORT"). Function works.
2. **Cross-reference pattern from errors**: Multiple failed annotations reference entities that appear as "best" matches in OTHER failed groups at offset -2 (LITTLEFIELD annotated 1313 found in 1311, PETTI annotated 1201 found in 1199, MCCABE annotated 977 found in 975, etc.).
3. **Definitive diagnostic**: "BI HISTORICAL SOCIETY" exists in entityDb (keys: `visionAppraisal:PID:579` and `visionAppraisal:FireNumber:18`). `findGroupByEntityKey('visionAppraisal:FireNumber:18')` returned group **899**. Annotation said group **901**. Confirmed: offset of -2.
4. **Group 903 check**: Contains 3 members all named "STATE OF RHODE ISLAND" — not "STATE OF RI AIRPORT" as annotated.

**Verified root cause**: Entity group indices shifted by -2 in the 900+ range since annotations were made on Feb 22. User has no recollection of rebuilding the entity group database, making this unexpected. The 58 successes are likely from groups below the shift point (indices still match), while 106 failures are from groups above it.

**Fix approach agreed upon** (user-suggested, better than original design):
Instead of searching within annotated group then falling back to global search, bypass group indices entirely:
1. Search ALL entities in `entityDb` by name (exact, substring, Levenshtein) → get entity key
2. Use `findGroupByEntityKey(entityKey)` → get current group index
3. Annotated `matchGroupIndex` used only for logging, not lookup

This approach is more robust because it relies only on entity names (present in annotations) and entity keys (stable identifiers), never on group indices for the actual lookup.

**Also noted**: Entity group database has a reference file (buildEntityGroupReferenceFile in entityGroupBuilder.js:1184) saved to Google Drive with every build. Maps `{index}||{foundingMemberKey}` → additional member keys. Could help investigate the index shift but doesn't change the fix approach.

**Note**: The modular functions in phonebookMatcher.js have NOT been tested yet — they depend on the resolution script producing correct output first.

### Next Steps
- Rewrite resolution script's findEntityKeyInGroup() to search entityDb globally by name, then findGroupByEntityKey()
- Re-run resolution script, verify 164+ inclusions resolve
- Then test Phase 3.3 modules in sequence

---

## Session 121 - Phase 3.2 Verified, Phase 3.3 Design (February 26, 2026)

### Status: Phase 3.2 user-verified; Phase 3.3 partially coded, requires modular redesign

### Phase 3.2 Testing — USER VERIFIED
- Tested populatePrimaryMatches() in browser
- Test sequence: load entity DB + entity group DB → purple button (processPhonebookFile) → matchAllPhonebookRecords(entityGroupBrowser.loadedDatabase, window.unifiedEntityDatabase) → classifyAllPhonebookMatches() → const db = new PhonebookDatabase(); populatePrimaryMatches(db); → db.printStats()
- Results: 731 primary-matched records processed, 684 unique phone entries, 671 person + 13 nonhuman
- User confirmed results correct

### Phase 3.3 Implementation — Three Blocking Issues Identified

#### Blocking Issue 1: Entity Group Index Instability (RESOLVED in design)
- **Problem**: Entity group indices are sequential integers from `createGroup()` via `this.nextIndex++`. They shift if entity database, matching thresholds, or FORCE rules change. Using them as stable identifiers gives false accuracy.
- **Resolution**: Three-piece key architecture: phone number (stable DB key) + entity key (stable authoritative reference, e.g. "visionAppraisal:FireNumber:1510") + group index (cached, verified at runtime).
- **Runtime verification**: Look up entity key via `findGroupByEntityKey()` (entityGroup.js:1376). If in different group → warn, use current group. If not found → error, skip rule.
- **One-time resolution script**: `console_resolveAnnotationKeys.js` created to resolve annotation names to entity keys. This runs once during inaugural dataset creation, NOT on every database update.

#### Blocking Issue 2: Non-Human Phone List Mixed Into Resolution Script (NEEDS FIX)
- **Problem**: Resolution script's purpose is to resolve entity keys for inclusion/exclusion rules. Non-human phone classification has nothing to do with entity keys — separate concern conflated into resolution script.
- **Current state**: Resolution script extracts `nonHumanPhones` array from annotation file's businesses/governmentEntities/nonprofitEntities/legalEntities sections. populateNoMatchRecords() consumes this via `window.resolvedPhonebookRules.nonHumanPhones`.
- **Needed**: Remove non-human phone list from resolution script. Handle non-human classification through its own appropriate mechanism (hardcoded by phone number for user-declared, algorithmic via detectNonHumanType() for the rest).

#### Blocking Issue 3: Monolithic Function Design (NEEDS REDESIGN)
- **Problem**: populateNoMatchRecords() is a single monolithic function handling 6 different concerns in a priority waterfall: manual inclusions, user-declared non-human, exclusions, algorithmic non-human detection, heuristic matching, unmatched person handling.
- **Needed**: Modular redesign — separate functions for separate concerns, each sourcing its own data appropriately.
- **Also noted**: "Unmatched person" handling (Priority 6) needs further discussion with user about consequences — deferred, not to be addressed during redesign.

#### Additional issue found during documentation: Wrong method name
- Code at phonebookMatcher.js:1639 calls `groupDb.getGroupForEntity(entityKey)` — this method does NOT exist.
- Correct method: `groupDb.findGroupByEntityKey(entityKey)` (entityGroup.js:1376, returns EntityGroup or null).
- Must fix during redesign. Note: returned object is EntityGroup (has `.index` property), not a group index directly.

### Key User Directives (Session 121)
- **No popup prompts**: "I do not want you to use this multiple choice popup prompt format with me any longer."
- **Hardcode manual decisions**: Manual indications hardcoded by phone number for stability, regression protection, preservation of established information.
- **Annotation files not permanent**: Rules extracted and stored on PhonebookDatabase. Ongoing process should not parse annotation files.
- **Modular code preferred**: populateNoMatchRecords must not be a monolithic function.

### Files Created
- `servers/Results/console_resolveAnnotationKeys.js` — one-time resolution script (temporary, delete Phase 3.5)

### Files Modified
- `scripts/matching/phonebookMatcher.js` — added populateNoMatchRecords() (lines 1603-1899). NEEDS MODULAR REDESIGN before testing.

### Current State of populateNoMatchRecords() (to be replaced)
The monolithic version exists at phonebookMatcher.js:1603-1899. It consumes `window.resolvedPhonebookRules` (from resolution script). Key components that ARE correct and should survive redesign:
- **verifyEntityKey()** inner function (lines 1638-1650) — correct approach but uses wrong method name (getGroupForEntity → findGroupByEntityKey)
- **inclusionByPhone Map** (lines 1653-1686) — phone → Array of verified inclusions
- **exclusionByPhone Map** (lines 1688-1712) — phone → verified exclusion
- **heuristic matching integration** (lines 1854-1873) — uses heuristicMatchRecord + classifyHeuristicConfidence, auto-accepts MEDIUM+HIGH
- **Summary statistics** (lines 1883-1897) — useful for verification

### What Modular Redesign Must Address
1. Remove non-human phone list dependency on resolution script
2. Split 6-priority waterfall into separate callable functions
3. Fix getGroupForEntity → findGroupByEntityKey
4. Each module sources its own data (not one giant prerequisites check)
5. Address user's deferred concern about "unmatched person" consequences (separate conversation)

---

## Sessions 119-120 - Phases 1-3.2 Implementation (February 26, 2026)

### Status: Phase 1+2 user-tested; Phase 3.1 user-verified; Phase 3.2 user-verified (Session 121)

### Phase 1: SupplementalDataDatabase Base Class (Session 119)
- Created `scripts/databases/supplementalDataDatabase.js`
- SupplementalDataEntry: entryKey, classification, matchAssociations[], exclusions[], userDeclarations, sourceMetadata
- SupplementalDataDatabase: Map-based entries, three-layer Google Drive persistence (bulk, individual, index), safe index update pattern
- Methods: addEntry, get, has, update, delete, load (bulk/index), save (bulk/individual/index)
- `_saveIndex()` refuses when loaded from bulk (corruption prevention); `_safeUpdateIndex()` for targeted changes
- Registered SupplementalDataEntry + SupplementalDataDatabase in CLASS_REGISTRY
- Added `<script>` tag in index.html (loads BEFORE phonebookDatabase.js)
- User tested in browser: instantiation, addEntry, get, has, size, getStats all verified

### Phase 2: PhonebookDatabase (Session 119)
- Created `scripts/databases/phonebookDatabase.js`
- PhonebookEntry extends SupplementalDataEntry: phoneNumber, rawRecords[], isIslandNumber, nameVariations[]
- PhonebookDatabase extends SupplementalDataDatabase: phone-specific key normalization, addRecord (create or append to existing)
- `normalizePhoneNumber()` standalone function (mirrors PhoneTerm.normalizePhone): strip non-digits, remove country code, expand 7-digit
- `isIslandPhoneNumber()`: checks 401-466 exchange
- Convenience queries: getIslandEntries, getOffIslandEntries, getSharedNumberEntries, searchByName
- printStats override with phone-specific metrics
- Google Drive file IDs all null (to be created Phase 3.4)
- Registered PhonebookEntry + PhonebookDatabase in CLASS_REGISTRY
- Added `<script>` tag in index.html
- User tested in browser: createEntryFromRecord, addRecord, phone grouping, getStats all verified

### Phase 3.1: Code Harvest (Sessions 119-120)
- Harvested permanent code from temporary console scripts into phonebookMatcher.js (~660 new lines)
- **NON_HUMAN_TERMS** (211 terms): Merged single Set — legal, lodging, food, retail, trades, government, nonprofit
- **KNOWN_NONHUMAN_NAMES** (27 entries): Multi-word phrases for substring matching
- **detectNonHumanType(record)**: 5-priority detection (dash-prefix, possessive 'S, known names, term match, parser flags) → 'NONHUMAN' or null
- **Helper functions**: areNamesProximate, isInitial, stripPossessive
- **Entity extractors**: getEntityNameStr, getEntityFireNum, getEntityStreet, getEntityPOBox
- **buildLastNameFrequencyTable(groupDb)**: Counts distinct name entries per uppercase last name
- **nameRarityScore(lastName, frequencyTable)**: 0 (common) to 1.0 (rare)
- **buildNonHumanEntityList(groupDb, entityDb)**: Extracts non-human entities with pre-extracted name words
- **heuristicMatchRecord(record, nonHumanEntities, frequencyTable)**: Word-by-word Levenshtein + nickname prefix + initial safety + enhanced composite scoring (rarity amplifier, proximity bonus, lastName penalty)
- **classifyHeuristicConfidence(match)**: HIGH (lastName+firstName, enhanced≥3.0), MEDIUM (lastName+evidence, enhanced≥2.0), or null
- **heuristicMatchAllNoMatchRecords(records, groupDb, entityDb)**: Batch function with progress logging
- User tested all functions in browser console — all passed

#### Levenshtein Duplicate Bug (Critical — found and fixed)
- **Problem**: Harvested a standard `levenshteinSimilarity(a, b)` from console script that SHADOWED the existing production function in utils.js (line 224). Since phonebookMatcher.js loads AFTER utils.js, the simpler version would overwrite the vowel-aware production version globally, degrading ALL name comparison throughout the app.
- **Root cause**: Console script was standalone and defined its own function. During harvest, should have recognized levenshteinSimilarity already exists in the loaded environment.
- **Fix**: Removed duplicate function, replaced with comment pointing to utils.js
- **Score impact**: Production vowel-aware version uses variable substitution costs (vowel-vowel ~0.079, consonant-consonant 1.0, vowel-consonant ~0.632). Generally produces HIGHER scores for name variations, so thresholds calibrated against standard Levenshtein remain safe.
- **Retest**: `levenshteinSimilarity('SMITH', 'SMYTH') > 0.8` confirmed vowel-aware version active (standard gives exactly 0.8)
- **Lesson**: Already in CLAUDE.md as pattern — when harvesting console script code to permanent files, check for name collisions with functions already in the loaded environment

### Phase 3.2: populatePrimaryMatches() (Session 120)
- Written in phonebookMatcher.js (~120 lines)
- Iterates window.phonebookClassifiedResults, processes records with any match (full, name, or address)
- Uses detectNonHumanType() for classification (person vs nonhuman)
- Creates/appends PhonebookEntry via db.addRecord()
- Adds matchAssociations with matchSource 'primary-matcher' and matchType (full/name-only/address-only)
- Deduplicates associations: if shared phone already has association to same group, skips
- Tracks and logs: primaryCount, noMatchCount, noPhoneCount, sharedPhoneRecords, nonHumanDetected, assocAdded, assocDeduped
- **STATUS**: coded_not_tested — user deferred testing to next session

### Files Created
- `scripts/databases/supplementalDataDatabase.js` (SupplementalDataEntry + SupplementalDataDatabase)
- `scripts/databases/phonebookDatabase.js` (PhonebookEntry + PhonebookDatabase + normalizePhoneNumber + isIslandPhoneNumber)

### Files Modified
- `scripts/matching/phonebookMatcher.js`: ~780 new lines (Phase 3.1 harvest + Phase 3.2 populatePrimaryMatches)
- `scripts/utils/classSerializationUtils.js`: 4 new CLASS_REGISTRY entries (SupplementalDataEntry, SupplementalDataDatabase, PhonebookEntry, PhonebookDatabase)
- `index.html`: 2 new `<script>` tags for supplementalDataDatabase.js and phonebookDatabase.js

### Key Lessons
- **Script load order shadowing**: Functions defined later in script loading order shadow earlier ones with same name. Critical for avoiding the levenshtein collision. When harvesting console scripts into permanent code, always check for existing functions with same name in the loaded environment.

---

## Session 118 - Prerequisites P-1 and P-2 Complete (February 25, 2026)

### Status: Both prerequisites complete; Phase 1 implementation ready

### P-1: Heuristic Calibration Finalized
- User reviewed validation report in spreadsheet, annotated with k/n/g/b codes
- Input file: `servers/Results/phonebook match - Sheet1.csv`
- Section 2a (28 MEDIUM confidence): 19 keep, 6 reject, 2 government, 1 business
- Section 2b (14 HIGH confidence): 13 keep, 1 business
- Section 1 (17 user-matched): Authoritative, one MOTT correction (record 1398 removed)
- 32 new authoritative matches added to match set
- 10 explicit exclusions (first phonebook exclusions ever declared)
- **Major conclusion**: Auto-accept best algorithmic match at MEDIUM or HIGH confidence
- Updated metrics: recall 91.2% (166/182), precision 94.3% (166/176)

### P-2: Non-Human Detection Validated and Simplified
- Python simulation of Phase 1 detection against all 700 no-match records
- Cross-referenced user annotations (ground truth) against programmatic detection
- Initial results: 124/139 detected (89.2%), 13 false positives (2.3%)

#### Bug found: FORD regex substring match
- `/SUBARU|TOYOTA|HONDA|FORD|CHEVROLET/i` matched "FORD" inside BRADFORD, SANFORD, HARTFORD
- Fix: FORD removed entirely (too common as surname), word boundaries added to remaining brands

#### Simplification decisions (user-directed):
- Three term lists (BUSINESS_TERMS, GOVERNMENT_TERMS, NONPROFIT_TERMS) merged → single `NON_HUMAN_TERMS`
- Regex pattern array eliminated entirely — single words to terms list, multi-word phrases to KNOWN_NONHUMAN_NAMES
- Sub-classification (business vs government vs nonprofit) dropped — single NONHUMAN return type
- Sub-category labels in presentation were just formatting, not code structure
- Space normalization added: collapse multiple spaces to one before known-name matching

#### Term list changes:
- Removed: FORD (surname), PARISH (surname)
- Added to NON_HUMAN_TERMS: ASSOCIATES, SERVICE, CENTER, SYSTEMS, SOURCE, DAUGHTER, VICTIMS, VIOLENCE, NAVIGATION, ENGINEERING, INTERSTATE, SUBARU, TOYOTA, HONDA, CHEVROLET, HIDEOUT, HIDEAWAY, TAKEOUT, BI, COTTAGE
- Added to KNOWN_NONHUMAN_NAMES: F.I.S.H, BLOCK ISLAND, SEE AD, SEE ADS, TAKE-OUT, TAKE OUT, curly apostrophe variants
- New detection: possessive apostrophe-s on any name part (straight or curly) → NONHUMAN

#### Final accuracy:
- True positives: 143, True negatives: 555, False negatives: 2, False positives: 0
- Detection rate: 98.6% (143/145), False positive rate: 0.0% (0/555)
- 2 remaining misses (618 BASIN NEW, 1250 ROCK M): handled by explicit user declaration in PhonebookBrowser
- Design principle: algorithmic detection (98.6%) + maintenance tool declarations (1.4%) = complete

#### User annotation corrections:
- 9 records reclassified from PERSON_NOMATCH to non-human (Phase 1 was correct, original annotations wrong): 116, 220, 658, 791, 851, 872, 873, 1045, 1125
- 5 BUSINESS_MATCHED records confirmed as persons (190, 313, 315, 512, 871)

### Documentation Updates
- reference_phonebookIntegration.md → v5.2 (P-1/P-2 results, updated metrics, detection rules)
- reference_phonebookDatabasePlan.md → updated (prerequisites complete, Phase 3.1/3.3 revised, classification simplified, exclusion mechanism, test environment step)
- CLAUDE.md → v213.0 (prerequisites complete, Phase 1 next)

### Files Created/Modified
- `servers/Results/phonebook match - Sheet1.csv` (user's annotated review — input)
- `servers/Results/phase1_detection_disagreements.csv` (2 remaining disagreements — output)

### Key Lessons
- FORD regex substring match: same pattern as CLAUDE.md's `substring_matching_word_boundaries` lesson
- Person-named business associates (CRANE, GILL, MCCOMBE, TWEEDY) cannot be detected by name-based algorithms — require explicit declaration
- Possessive apostrophe-s is a reliable business name indicator in phonebook data
- Python analysis code was disposable — validated term lists and logic, not part of app codebase
- phonebookMatcher.js (permanent JS) has no non-human detection yet — will be added in Phase 3.1

---

## Session 117 - Architectural Revision + Heuristic Fixes (February 24, 2026)

### Status: Full-arc plan revised; validation script fixed; & token filtering implemented

**Session Goal:** Fix validation script exclusion bugs, filter `&` from word matching, and revise the full-arc phonebook integration plan based on user's architectural decisions.

### Validation Script Fixes (console_session116_validation.js)

1. **Annotation-based exclusion**: Added `annotationExclusionSet` built from user annotations (businesses, governmentEntities, nonprofitEntities, legalEntities arrays + B-1/Business/NonHuman matchAssociations). Non-person records now excluded from validation sections.
2. **User match map filtering**: Removed B-1/Business/NonHuman entries from `userMatchMap` so they don't count as person matches.
3. **Corrected recall denominator**: Changed `totalUserMatches` from `userAnnotations.matchAssociations.length` (165, unfiltered) to `Object.keys(userMatchMap).length` (151, filtered).

### & Token Fix (console_session114_analysis.js)

**Problem**: `&` was being treated as a name word. When phonebook raw names contained `&` (e.g., "PETERSEN, NEIL & BEVERLY"), it matched `&` in entity names (present in almost all AggregateHousehold names), inflating scores AND falsely setting `firstNameMatchedAny = true`. This caused many non-matching records to qualify for MEDIUM/HIGH confidence.

**Fix**: Added `/[A-Z]/i.test(w)` filter to all three word-list construction points:
- Line 532: entity name words
- Line 578: phonebook raw name words
- Line 582: phonebook lastName words

Words must contain at least one letter — `&`, `-`, `+`, standalone punctuation/numbers all filtered out.

### Results After Fixes

| Metric | Before & fix | After & fix | Change |
|---|---|---|---|
| Program matches | 199 | 176 | -23 |
| Overlap (both) | 135 | 134 | -1 |
| Recall | 89.4% (135/151) | 88.7% (134/151) | -0.7% |
| Precision | 67.8% (135/199) | 76.1% (134/176) | +8.3% |
| Section 2a (prog MEDIUM, user didn't) | 43 | 28 | -15 |
| Section 2b (prog HIGH, user didn't) | 21 | 14 | -7 |

The & fix removed 23 false program matches while losing only 1 true positive. Precision improved dramatically.

### Architectural Revision — Full-Arc Plan

User provided 7 authoritative statements that revised the phonebook integration architecture from runtime augmentation to persistent database with automatic integration. Key decisions documented in dialog:

1. **SupplementalDataDatabase** base class → PhonebookDatabase subclass. Future EmailDatabase extends same base.
2. **All records** in database (persons + businesses + government + nonprofit + legal), keyed by normalized phone number.
3. **Two deliverables**: phone number assignment + name variation assignment (using existing alias infrastructure).
4. **IndividualName** has firstName/lastName/otherNames components (verified in code). Name variations stored as full-name alias strings.
5. **NonHumanName** already has alias infrastructure (SimpleIdentifiers → Aliased). No new structure needed for business names.
6. **New IndividualName entries** created when needed, with user approval phase before inaugural process is complete.
7. **733 primary-matched records** auto-accepted without user review.
8. **Couples** deferred until individual processing complete.
9. **Error reporting over fallbacks** — avoid phone-specific fallbacks that would cause issues adapting for email.

Revised plan: 8 phases (SupplementalDataDatabase → PhonebookDatabase → Inaugural Dataset → Name Variations → Phone Assignment → Automatic Integration → Maintenance Tool → Future Updates). Prerequisites: finalize heuristic calibration (P-1) and business detection review (P-2).

### Files Modified

| File | Changes |
|---|---|
| `servers/Results/console_session114_analysis.js` | Added `/[A-Z]/i` filter to 3 word-list constructions (lines 532, 578, 582) |
| `servers/Results/console_session116_validation.js` | Added annotation exclusion set, filtered userMatchMap, corrected totalUserMatches |
| `reference_phonebookIntegration.md` | Updated to v5.0 — architectural revision replacing Phases C/D/E with 8 new phases |

### Key Lessons

- **`&` as word token**: Punctuation surrounded by spaces must be filtered from word lists. The `&` was inflating scores AND falsely setting firstNameMatched for hundreds of records.
- **Validation script must use same exclusion logic as analysis script**: The validation script was written separately and omitted the annotation-based exclusion, causing businesses to appear in all sections.
- **Complete testing steps**: When providing testing instructions, trace the full prerequisite chain (hard refresh → load databases → parse phonebook → match → classify → analysis → validation). Incomplete steps waste user time and prevent result interpretation.

### Next Steps (Session 118)

1. **P-1**: Review Section 1 remaining 17 records + Section 2b 14 records
2. **P-2**: Business detection review
3. Begin Phase 1 (SupplementalDataDatabase) or Phase 3 code harvesting

---

## Session 116 - Phase 2 Heuristic Iteration + Validation (February 23, 2026)

### Status: Validation results strong (88.5% recall); heuristic iteration continues

**Session Goal:** Complete the bypass fix verification, fix the frequency table, iterate Phase 2 matching heuristics, and build validation tooling.

### Entity Rebuild Verification (carried from Session 115)

1. **Found secondary BYPASS override**: `index.html` DOMContentLoaded handler (line 2063) set `window.BYPASS_INDIVIDUALNAME_LOOKUP = true`, overriding the `CODE_DEFAULT = false` fix from Session 115. Changed to `false`.
2. **Verified fix**: After entity rebuild, `name.primaryAlias.sourceMap` contains `Map(1) {'INDIVIDUAL_NAME_DATABASE_BUILDER' => {…}}` — markers now present.
3. **Entity group results**: individualNames: 2111, unrecognizedIndividualNames: 1 (CARLOS SALINAS — BLOOMERANG_CSV marker only, not in IndividualNameDatabase). Fix working correctly.

### Frequency Table Fix

Changed Part 1 of `console_session114_analysis.js` to iterate BOTH `group.individualNames` and `group.unrecognizedIndividualNames`. Result: 1139 distinct last names (was 0).

### Phase 2 Exclusion List — User Annotations

Changed `isPerson` from `!phase1Type` to `!annotationExclusionSet.has(idx)`. The exclusion set is built from user annotations file, NOT from Phase 1 algorithm output. Initially only included 4 standalone sections (businesses, governmentEntities, nonprofitEntities, legalEntities = 125 records).

**Bug found and fixed**: User's `matchAssociations` also contain non-person records (matched to Business/NonHuman entities) — these were missed by the initial exclusion set. Root cause: misunderstanding of the annotation data structure — I only read the standalone sections, not examining matchAssociations for entity type.

**Expanded exclusion set** (3 paths):
1. Standalone sections: businesses (89), governmentEntities (31), nonprofitEntities (4), legalEntities (1)
2. `B-1` designation in matchAssociations: explicitly declared business (7 records)
3. `matchEntityType === 'Business' || matchEntityType === 'NonHuman'` in matchAssociations: de facto business (adds 7 more)

Total exclusion set: 139 (was 125). LegalConstruct and AggregateHousehold matches are NOT excluded — those are person names found inside trusts/households.

### Heuristic Improvements

Four changes to Phase 2 matching in `console_session114_analysis.js`:

**1. Nickname prefix matching**: When Levenshtein similarity < 0.845 threshold, check if the shorter word (3+ chars, has consonants and vowels) is the exact beginning of the longer word. If so, score = 0.845 (threshold). Works either direction. Example: FRED→FREDERIC, ANN→ANNETTE. Tagged `[nick]` in detail output.

**2. Bypass parser firstName field designation**: Build `pbNameWords` from `rec.name.raw` instead of parser field assignments. All words NOT in `pbLastNameWords` become potential firstName candidates (`pbOtherWords`). Any non-lastName word that matches sets `firstNameMatchedAny = true`. Rationale: parser designations unreliable for these records that already failed primary matching.

**3. Possessive stripping**: `stripPossessive()` helper removes trailing `'S` or `'S` from words (4+ chars, result 2+ chars). Applied to phonebook words, lastName words, and entity name words during construction. Example: BROWN'S→BROWN.

**4. MANAGEMENT added to business terms**: Phase 1 detection improvement.

### Validation Report

Created `console_session116_validation.js` — cross-references user annotations against Phase 2 program matches. Sections:
- Section 1: User matched, program did NOT
- Section 2a/2b: Program matched (MEDIUM/HIGH), user did NOT
- Section 3a/3b: Both matched (MEDIUM/HIGH)
- Recall and precision statistics

### Results Comparison

| Metric | Session 114 | Session 116 | Change |
|---|---|---|---|
| Exclusion set | 125 | 139 | +14 |
| HIGH confidence | 85 | 135 | +50 |
| MEDIUM confidence | 28 | 64 | +36 |
| Section 1 (user only) | 62 | 19 | -43 |
| Both matched (3a+3b) | ~103 | 146 | +43 |
| **Recall** | ~62% | **88.5%** | +26 pts |
| Precision | — | 61.1% | first measurement |

### IndividualNameDatabase Auto-Load

- Added auto-load to `processPhonebookFile()` in `phonebookParser.js` — checks if database loaded, calls `loadIndividualNameDatabaseFromBulk()` if not
- Added "Load Name Database" button to top of Individual Name Browser section in `index.html`

### Phonebook Parser Name Fields

Confirmed: name field designations (firstName, lastName, secondName) result from case31 logic. Flow: `parsePhonebookLine()` → `PhonebookLineClassifier.classifyLine()` extracts nameString → `parsePhonebookNameWithCase31()` → `Case31Validator.detectCase()` → `VisionAppraisalNameParser.caseDefinitions[caseType].processor()` → `extractNameComponentsFromEntity()`.

### User Designation System Clarification

The `matchAssociations` have 5 designation values:
- `"1"` (148): match to entity group's first match
- `"2"` (8): match to second match
- `"1,2"` (1) and `"1-2"` (1): match to both
- `"B-1"` (7): explicitly declared business match

NonHuman entity class: parent of Business and LegalConstruct. Only 5 bare NonHuman entities in entire database — special cases from VisionAppraisal parser. All definitionally non-person.

### Files Modified

| File | Changes |
|---|---|
| `index.html` | BYPASS_INDIVIDUALNAME_LOOKUP default changed to false (line 2063); "Load Name Database" button added |
| `scripts/phonebookParser.js` | Auto-load IndividualNameDatabase in processPhonebookFile() |
| `servers/Results/console_session114_analysis.js` | Frequency table fix; user annotations exclusion set (expanded with matchAssociations); nickname prefix matching; raw name word extraction; possessive stripping; MANAGEMENT business term |
| `servers/Results/console_session116_validation.js` | NEW — validation report comparing user matches vs program matches |

### Key Lessons

- **Check ALL initialization paths**: index.html DOMContentLoaded can override JS file defaults
- **Study annotation data structure fully**: matchAssociations contain non-person records (Business/NonHuman entity types) that must be included in exclusion set
- **Provide complete testing instructions**: `matchAllPhonebookRecords(entityGroupBrowser.loadedDatabase, window.unifiedEntityDatabase)` requires explicit arguments — don't assume defaults
- **phonebook parser field designations are unreliable**: For records that already failed primary matching, bypass parser firstName/secondName and use raw name words instead

### Next Steps (Session 117)

1. Review Section 1 remaining 19 records (user matched, program still can't find)
2. Review Section 2b 22 records (HIGH confidence program found, user didn't annotate)
3. Continue heuristic iteration
4. Eventually proceed to Phase C (Assignment Implementation)

---

## Session 115 - IndividualNames Bypass Fix (February 22, 2026)

### Status: Bypass fix coded in 4 files/5 sites; entity rebuild needed to take effect

**Session Goal:** Diagnose the frequency table bug (0 distinct last names), which led to discovery and fix of a systemic issue where `individualNames` was empty in ALL 1879 EntityGroups.

### Investigation Path

1. **Diagnostic round 1**: Added logging to Part 1 of `console_session114_analysis.js` to inspect `group.individualNames` structure. Result: 1879 groups, 0 with any `individualNames` entries, 0 total entries.

2. **Diagnostic round 2**: Standalone console diagnostic inspecting group structure. Result: All 2367 individual names were in `unrecognizedIndividualNames`, 0 in `individualNames`. Groups also had `blockIslandAddresses` (2392 entries in 1513 groups).

3. **Code analysis**: `buildMemberCollections()` in `entityGroup.js` sorts names using `_isNameFromDatabase()`, which checks for `INDIVIDUAL_NAME_DATABASE_BUILDER` marker in `name.primaryAlias.sourceMap`. No names had this marker.

4. **Pipeline trace**: `resolveIndividualName()` in `utils.js` calls `lookupExisting()` on `window.individualNameDatabase`. That function has a `BYPASS_INDIVIDUALNAME_LOOKUP` flag with `CODE_DEFAULT = true` — meaning lookup was bypassed by default, so entities built from CSVs never received the marker.

5. **Entity builder analysis**: Both `bloomerang.js` and `processAllVisionAppraisalRecords.js` check the bypass flag with `=== false`, meaning lookup only happens if explicitly enabled. Since nobody set it to `false`, lookup never happened.

### Root Cause

`BYPASS_INDIVIDUALNAME_LOOKUP` in `individualNameDatabase.js:122` had `CODE_DEFAULT = true`, meaning the IndividualNameDatabase lookup was OFF by default. This was a mistake — now that the database is built, it should be the production standard. Entity builders checked `=== false` (only enable if explicitly set), compounding the issue.

### Architectural Correction (User)

Phase 2 of phonebook analysis should use **user annotations** as the exclusion list (not Phase 1 algorithm output). Phase 1 is the production algorithm for future phonebook updates, with manual override inclusion/exclusion for corrections.

### What Was Fixed

**4 files, 5 sites changed:**

| File | Line | Change |
|---|---|---|
| `scripts/databases/individualNameDatabase.js` | 122 | `CODE_DEFAULT` from `true` to `false` |
| `scripts/bloomerang.js` | 217 | `=== false` → `!== true` |
| `scripts/bloomerang.js` | 518 | `=== false` → `!== true` |
| `scripts/bloomerang.js` | 2873 | `=== false` → `!== true` |
| `scripts/dataSources/processAllVisionAppraisalRecords.js` | 106 | `=== false` → `!== true` |

### Audit Performed

- **Unintended consequences**: None. `resolveIndividualName()` guards with `if (window.individualNameDatabase)` so lookup is safe when database isn't loaded. Entity builders proactively load the database.
- **Serialization survival**: Maps serialize via `{ type: 'Map', __data: [...] }` and deserialize via `new Map(value.__data)`. The `INDIVIDUAL_NAME_DATABASE_BUILDER` marker in `sourceMap` (a Map) survives the full pipeline: entity build → save → load → group build → group save → load.

### Why Not Detected Earlier

- The phonebook matcher (`lookupNamesInGroup`) correctly searches BOTH `individualNames` and `unrecognizedIndividualNames`, so phonebook matching worked fine.
- No other code path depended on the recognized/unrecognized distinction until the frequency table tried to use only `individualNames`.
- The bypass flag was set during early development when the IndividualNameDatabase didn't exist yet, and was never changed once the database was built.

### Files Modified

- `scripts/databases/individualNameDatabase.js` — Changed CODE_DEFAULT from true to false
- `scripts/bloomerang.js` — Changed 3 bypass checks from `=== false` to `!== true`
- `scripts/dataSources/processAllVisionAppraisalRecords.js` — Changed 1 bypass check from `=== false` to `!== true`
- `servers/Results/console_session114_analysis.js` — Diagnostic code added (still present, to be cleaned up)
- `BIRAVA2025/reference_phonebookIntegration.md` — Updated to v4.0 with root cause analysis and recovery plan

### Next Steps (Session 116)

1. **Rebuild entities from CSVs**: With lookup now ON by default, both VisionAppraisal and Bloomerang entity builders will auto-load IndividualNameDatabase and stamp names with markers
2. **Save entities to Google Drive**
3. **Rebuild entity groups**: `buildMemberCollections()` will correctly sort names into `individualNames` vs `unrecognizedIndividualNames`
4. **Run group structure diagnostic**: Verify `individualNames` has entries
5. **Save entity groups to Google Drive**
6. **Fix frequency table**: Update Part 1 of `console_session114_analysis.js` to iterate BOTH collections, remove diagnostic code
7. **Adjust Phase 2**: Use user annotations as exclusion list
8. **Resume phonebook analysis**: Validate Phase 1 and Phase 2 accuracy, iterate heuristics, proceed to Phase C

---

## Session 114 - Two-Phase Analysis Rewrite + Annotation Save (February 22, 2026)

### Status: Script rewritten with correct architecture; last-name frequency bug undiagnosed

**Session Goal:** Rewrite the Session 114 analysis script with correct two-phase architecture based on user's completed annotation review and architectural correction.

### User's Completed Annotation Review

User reviewed and annotated all 700 no-match phonebook records from Session 113's `console_nonhumanAnalysis.js` output. Results saved permanently:

- **File**: `servers/progress/user_phonebook_annotations_2026-02-22.json`
- **Script**: `servers/Results/console_session114_saveAnnotations.js` (browser file picker → JSON save)
- **Annotations**: 165 matches (148→Match1, 8→Match2, 7 B-1, 2 both), 89 businesses, 31 government, 4 nonprofit, 1 legal, 410 confirmed no-match
- **Match entity types**: 97 LegalConstruct, 54 AggregateHousehold, 11 Business, 1 NonHuman

### User's Designation System (from annotated CSV)

- **B** = business (not a match, just classification)
- **B-1** = business that belongs in Match1's entity group (trailing backtick is typo — ignore)
- **1** = belongs in Match1's entity group
- **2** = belongs in Match2's entity group
- **1,2** or **1-2** = belongs with both matches (which should be same group)
- **L** = legal entity (non-human classification, not match indication)
- **G** or **g** = government entity (non-human classification)
- **NP** = nonprofit entity (non-human classification)
- **Blank** = no match

### User's Matching Heuristics (points a-g)

These rules guide all algorithm development:
1. Last name match is mandatory minimum — match cannot happen without it
2. First+last names proximate in entity string = stronger signal (adjacent, separated only by space/comma)
3. Last-name frequency table as island knowledge tool — rare names (ENXUTO) much stronger signal than common names (LITTLEFIELD)
4. Initials are dangerous — single letter only counts if phonebook lastName matches one word of a two-word group and adjacent word starts with the initial
5. Couples can be treated differently but no hard rule defined
6. Don't count a total if there are no perfect matches in it
7. Build POSITIVE match rules only, not disqualifying rules
8. Off-island addresses never match, never stored as entities/groups
9. All development based on user's designations as the knowledge base

### Critical Architectural Correction

User corrected a fundamental error in the first attempt:

- **WRONG approach**: Scanning all entity groups comparing phonebook names against `group.individualNames{}` and `unrecognizedIndividualNames{}` collections. These 700 records ALREADY FAILED that exact comparison in the established matcher.
- **CORRECT approach**: Compare phonebook names word-by-word against **full name strings of non-human entities** (LegalConstructs, AggregateHouseholds, Businesses, etc.) — exactly what `console_nonhumanAnalysis.js` (Session 113) does. These non-human entities have person names embedded in strings like "CHADWICK, LAURA & GLENN TRUSTEES, CHADWICK FAMILY LV TRUST".

User also corrected phase ordering:
- **Phase 1**: Non-human detection (remove businesses/government/nonprofits from pool FIRST so they don't clutter Phase 2)
- **Phase 2**: Enhanced non-human entity string matching

### What Was Done

#### 1. Saved User's Permanent Annotations

Created and ran `console_session114_saveAnnotations.js`:
- Uses browser file picker to load the annotated CSV
- Parses all designations into structured JSON
- Saves via `saveToDisk()` to `servers/progress/user_phonebook_annotations_2026-02-22.json`
- These associations are PERMANENT — will be imported into override/exclusion system

#### 2. Rewrote `console_session114_analysis.js` (v2)

Complete rewrite with correct two-phase architecture:

**Phase 1: Non-human detection** — Augmented term lists derived from user's 125 non-person annotations:
- `PHONEBOOK_BUSINESS_TERMS` (~100 terms, expanded from case31Validator's 27)
- `GOVERNMENT_TERMS` (~30 terms for town roles)
- `NONPROFIT_TERMS` (~15 terms)
- `NONHUMAN_FULL_NAME_PATTERNS` (regex patterns: dash-prefix, "SEE AD", "BLOCK ISLAND", car dealers, etc.)
- `KNOWN_BUSINESS_NAMES` (~20 specific names without generic terms)
- `detectNonHumanType()` function with priority: dash-prefix → known names → patterns → govt terms → nonprofit terms → business terms → parser flag

**Phase 2: Enhanced non-human entity string matching** — Based on Session 113's `console_nonhumanAnalysis.js`:
- Pre-builds non-human entity list (Business, NonHuman, LegalConstruct, AggregateHousehold, CompositeHousehold)
- Word-by-word Levenshtein matching (same core as original)
- **Enhancements**: lastName mandatory check, rarity multiplier, proximity bonus, safe initial handling
- Both base composite (original formula) and enhanced composite shown in output
- Top 2 matches per record

**Part 1: Last-name frequency table** — Counts from `group.individualNames` for rarity scoring

**Output**: CSV sorted with Phase 1 detected records at top, then person records by enhanced composite descending

#### 3. First Test Run Results

Phase 1 detection and Phase 2 matching ran successfully:
- Phase 1: Detected businesses/government/nonprofits (counts not recorded — need to rerun)
- Phase 2: Scanned 2316 non-human entities, found 85 high confidence + 24 medium confidence matches
- **BUG**: Part 1 last-name frequency table produced 0 distinct last names

### Open Bug: Last-Name Frequency Table Returns 0

**Symptom**: `Distinct last names: 0` in output

**What we know**:
- `group.individualNames` IS populated — proven by `matchAllPhonebookRecords()` producing valid match/no-match classifications using the same data in the same browser session
- The access pattern `nameObj.lastName` may be incorrect for whatever object type is stored as values in `individualNames`
- Root cause NOT YET DIAGNOSED — needs diagnostic logging next session to inspect what `individualNames` entries actually look like (keys, value types, property names)

**Impact on this run**: All rarity scores defaulted to 1.0 (freq=0 = "not in database"). Enhanced composite scores are uniformly inflated by 1.3×. Base composite scores and Phase 1 detection are unaffected.

### Files Modified

- `servers/Results/console_session114_analysis.js` — TEMPORARY console script, rewritten v2 with two-phase architecture
- `servers/Results/console_session114_saveAnnotations.js` — TEMPORARY console script for saving user annotations

### Files Created

- `servers/progress/user_phonebook_annotations_2026-02-22.json` — PERMANENT user annotations (165 matches, 89 businesses, 31 government, 4 nonprofit, 1 legal, 410 no-match)
- `servers/progress/session114_analysis_v2_2026-02-22.csv` — Analysis output from first test run

### Temporary Scripts to Preserve

| Script | Session | Purpose | Delete When |
|---|---|---|---|
| `servers/Results/console_noMatchAnalysis.js` | 112 | Threshold-free name scan of 700 records | Analysis complete |
| `servers/Results/console_nonhumanAnalysis.js` | 113 | Original nonhuman entity composite analysis (correct architecture) | Analysis complete |
| `servers/Results/console_session114_analysis.js` | 114 | Two-phase analysis with enhanced matching (v2 rewrite) | Analysis complete |
| `servers/Results/console_session114_saveAnnotations.js` | 114 | Save user annotations to JSON | Migration to override system complete |

### Next Steps (Session 115)

1. **Diagnose frequency table bug**: Add diagnostic logging to inspect `group.individualNames` entries — what are the keys, what type are the values, do they have `.lastName`?
2. **Re-run with working frequency table**: Rarity scoring will then properly differentiate common vs rare names
3. **Validate Phase 1 accuracy**: Compare detection results against user's 125 non-person annotations (89B + 31G + 4NP + 1L)
4. **Validate Phase 2 accuracy**: Compare match results against user's 165 match designations — does the correct group appear as Match1 or Match2?
5. **Iterate on heuristics** based on validation results
6. Continue to Phase C (Assignment Implementation)

---

## Session 113 - Non-Human Entity Analysis for 700 No-Match Review (February 22, 2026)

### Status: Analysis script written; user manual review pending

**Session Goal:** Build tooling for user to manually review and annotate the 700 no-match phonebook records, focusing on identifying businesses/legal entities and matches to non-human entities in EntityGroups.

### Key Insight

Many of the 700 no-match records are businesses or legal entities (LLC, Trust, Inc, etc.) that genuinely have no match in Bloomerang (donor database) or VisionAppraisal (property owner database). The parser only flags 19 of 1433 records as `isBusiness=true` — a significant undercount. The 700 no-match count is not alarming; it reflects real businesses that simply aren't in the comparison databases.

### What Was Done

#### Phase 1: Initial Analysis Script (first version — superseded)

Created `servers/Results/console_nonhumanAnalysis.js` with two comparison approaches:
1. **LEVENSHTEIN** — full-string Levenshtein comparison of phonebook name to entity name
2. **COMPOSITE** — word-by-word matching above 0.845 threshold + fire number (+1) + PO box (+1) + street Levenshtein

Multi-row format (RECORD header + detail rows). User reviewed output and determined:
- COMPOSITE approach is the one to focus on and refine
- LEVENSHTEIN full-string comparison not useful for business names
- Need to separate parser-detected businesses for easier review

#### Phase 2: Business Detection Research

Studied `Case31Validator` system in `scripts/validation/case31Validator.js`:
- 34+ case types for name classification
- Business detection via `businessTerms` list (27 terms: LLC, INC, CORP, TRUST, etc.)
- `businessTermsMaster` list (29 complete business names for Case 0)
- Business cases: 0, 4, 4N, 12, 13, 14, 19, 20, 21N, 31
- Only 19 flagged `isBusiness=true` because many businesses don't contain these specific terms

#### Phase 3: User's 4-Step Plan

User outlined approach:
1. Build code that breaks out existing identified businesses → **DONE** (Section column in CSV)
2. Simplify CSV (eliminate Levenshtein, flatten for review) → **DONE** (rewritten script)
3. User reviews all 700 records manually (annotate: businesses, matches, no-matches) → **NEXT**
4. Analyze annotations to suggest thresholds and rules for automation → **PENDING**

#### Phase 4: Rewritten Analysis Script (final version)

Completely rewrote `console_nonhumanAnalysis.js` with plan-mode-approved design:

**Format**: Flat one-row-per-record CSV (35 columns):
- Phonebook record data (Section, RecordIndex, LineNumber, LastName, FirstName, SecondName, CaseType, EntityType)
- Address & contact (Street, FireNumber, Box, Phone, IsValidBIStreet, IsOffIsland)
- Parser flags (IsBusiness, IsCouple)
- Best composite match (Match1_EntityName, Match1_EntityType, Match1_GroupIndex, Match1_Composite, Match1_WordScore, Match1_WordCount, Match1_AddrScore, Match1_Detail)
- Second-best composite match (Match2_* same 8 columns)
- User annotation columns (UserIsBusiness, UserMatchGroup, UserNotes) — empty for manual review

**Section assignment**: BUSINESS if `isBusiness===true` OR `entityType==='Business'` OR `entityType==='LegalConstruct'` OR `caseType==='case0'`

**Sort order**: BUSINESS section first (by composite score descending), then NON-BUSINESS (by composite score descending)

**COMPOSITE scoring**: For each phonebook word, find best Levenshtein match among entity name words. If >= 0.845, add to wordMatchTotal. Then add +1 for fire number match, +1 for PO box match, + Levenshtein(street names).

**Non-human entity types scanned**: Business, NonHuman, LegalConstruct, AggregateHousehold, CompositeHousehold

**Output**: `servers/progress/phonebook_nonhuman_analysis_YYYY-MM-DD.csv`

### Files Modified

- `servers/Results/console_nonhumanAnalysis.js` — TEMPORARY console script (paste into browser console). Created then rewritten. **Delete when analysis is complete.**

### Files NOT Modified (no permanent app code changed this session)

### Temporary Scripts to Preserve

| Script | Session | Purpose | Delete When |
|---|---|---|---|
| `servers/Results/console_noMatchAnalysis.js` | 112 | Threshold-free name scan of 700 records | Analysis complete |
| `servers/Results/console_nonhumanAnalysis.js` | 113 | Nonhuman entity composite analysis of 700 records | Analysis complete |

### Next Steps (Session 114)

1. User runs `console_nonhumanAnalysis.js` in browser console, reviews CSV in spreadsheet
2. User annotates all 700 records: UserIsBusiness (Y/N), UserMatchGroup (group index), UserNotes
3. Analyze annotations to derive thresholds and rules for automated business detection and nonhuman matching
4. Consider augmenting Case31Validator with additional business detection patterns based on annotation data
5. Continue to Phase C (Assignment Implementation)

---

## Session 112 - Match Classification + No-Match Analysis (February 22, 2026)

### Status: Classification coded and tested; no-match analysis in progress

**Session Goal:** Analyze 141 no-hit records, disposition remaining Cat 2 items, implement Section 4.7 match classification, and generate CSV for threshold analysis of 700 no-match records.

### What Was Done

#### Analysis of 141 No-Hit Records
User reviewed the 141 records with zero raw hits. Concluded: "I see no patterns in this data that indicates that these items should be finding an entity match." No further action needed.

#### Category 2 Disposition
3 remaining unvalidated streets: (Plant), Block Island, Attorneys-at-Law. User chose: "leave unvalidated." No code changes.

#### Section 4.7 Match Classification (phonebookMatcher.js)

Implemented and tested match classification system. Key design decisions:

**Adapted thresholds** (from MATCH_CRITERIA four-condition system):
- Name + address (no collision): name >= 0.80 (Condition 2 auto-passes since binary address = 1.0 > 0.85)
- Name + address (collision): name >= 0.845 (Condition 4, nameAlone)
- Name only: name >= 0.845 (Condition 4)
- Address only: requires "strong address evidence" (fire number or PO box, NOT streetOnly)

**Address-only rule fix:** First run produced 59,655 address-only group matches due to streetOnly fan-out (e.g., 218 groups for Corn Neck Rd). Fixed by requiring `hasStrongAddressEvidence = hasFireNumberHit || hasPoBox` for address-only classification. streetOnly can still contribute to Full Matches via name corroboration.

**Stats double-counting fix:** Records with both name-only and address-only matches to different groups were counted in both categories. Fixed with mutually exclusive `bothPartialRecords` category and sum verification.

**Classification results:**

| Category | Records |
|---|---|
| Full match | 392 |
| Name-only | 315 |
| Address-only | 17 (26 group-level) |
| Name + address partial | 9 |
| No match | 700 |
| **Total** | **1433** |
| Couple condition 2 | 82 (subset of full) |

**6 verification tests all passed** (inspectClassifiedMatch on specific record types + priority rule + raw-hits-but-classified-none count).

#### No-Match CSV Analysis (console command)

Wrote a console-paste script (no permanent code in app) to generate CSV of 700 no-match records. Key design: re-scans all 1879 groups with NO name threshold to find closest matches (the 0.80 matcher threshold had filtered them out, leaving empty arrays). Format: RECORD header row followed by NAME/ADDRESS/POBOX/BOTH detail rows showing best matches with scores. Saves to `servers/progress/` via `saveToDisk()`.

### Files Modified

- `scripts/matching/phonebookMatcher.js` — Added classification thresholds, `classifyPhonebookMatch()`, `checkCoupleCondition2()`, `classifyAllPhonebookMatches()`, `inspectClassifiedMatch()`. Removed temporary `downloadNoMatchAnalysis()` function (replaced by console command).
- `reference_phonebookIntegration.md` — Updated Next Steps (items 7-9 done), Phase B task statuses, added Section 4.7 implementation details.

### Next Steps (Session 113)

1. User analyzes no-match CSV to evaluate whether thresholds should be adjusted
2. Continue with Phase C (Assignment Implementation) based on analysis results

---

## Session 111 - First Full Matcher Run with Expanded Database (February 21, 2026)

### Status: Matcher baseline established — ready for analysis and next steps

**Session Goal:** Re-test phonebook parser and run matcher with all Session 108-110 fixes in place (expanded 152-entry street database, PO box parser fix, off-island detector fix, Normal business in Special::^::Cases).

### What Was Done

#### Parser Re-test (confirmed Session 110 fixes)

| Metric | Session 110 | Session 111 | Change | Explanation |
|---|---|---|---|---|
| Off-island | 41 | 43 | +2 | West Kingstown + Warwick now detected |
| Validated BI streets | 1301 | 1309 | +8 | "Normal business" (8 records) now validates via Special::^::Cases |
| Unvalidated streets | ~6 | 3 | -3 | Off-island + Normal business removals |
| Box numbers | 819 | 819 | — | Stable |

Full parser stats: 1433 records parsed, 50 skipped, 1431 with phone, 465 couples, 19 businesses, 152 street database entries.

#### First Phonebook Matcher Run

Ran `matchAllPhonebookRecords()` against 1879 EntityGroups (206.6s runtime):

| Metric | Count | % of 1433 |
|---|---|---|
| Address hits | 1203 | 84% |
| Name hits | 832 | 58% |
| Name+address same group | 366 | 26% |
| PO box hits | 130 | 9% |
| No hits at all | 141 | 10% |
| Collision flag | 0 | 0% |

This is the **first matcher baseline** with the expanded street database. The 366 name+address same-group matches are the highest-confidence set for integration.

### Files Modified

None — this was a testing/verification session only.

### Next Steps (Session 112)

1. Analyze the 141 no-hit records — are they off-island, businesses, or gaps?
2. Disposition remaining Category 2 items: (Plant), Block Island, Attorneys-at-Law
3. Evaluate match quality and begin Section 4.7 (match classification)

---

## Session 110 - PO Box Parser Fix + Off-Island Detector Fix (February 21, 2026)

### Status: Coded and tested — ready for user verification

**Session Goal:** Fix Category 1 (PO boxes in street field) and off-island false positives for Connecticut Ave., then clean up remaining unvalidated items. Session was interrupted by autocompact/tool corruption; recovery session completed the pending cleanup and documentation.

### What Was Done

#### PO Box Parser Fix (phonebookParser.js)

**Problem:** 43 box-only phonebook records had "Box NNN" placed in the `street` field instead of `address.box`. Root cause: JavaScript falsy-value trap — empty string `""` is falsy, so `"" || "Box 1001"` evaluates to `"Box 1001"`.

**Changes:**
1. **extractBox() regex tightened** — Removed P.O. pattern entirely (phonebook data never contains P.O. variations). Simplified from loop over two patterns to single regex. Tightened capture group from `[A-Z0-9-]+` to `(\d+|[A-Za-z]\d?)` — one or more digits, or a single letter optionally followed by a single digit (e.g., D2). Prevents matching "Box and", "Box Elder", etc.
2. **Fixed `||` fallback bug in 6 LineType processors** — All instances of `data.afterBox || data.afterSeparator` changed to `data.hasBoxAfterSep ? (data.afterBox || null) : data.afterSeparator`:
   - LineType3 (town field)
   - LineType4 (street field)
   - LineType7 (street and town fields)
   - LineType8 (street field)
   - LineType12 (street field)

**Architectural decision:** User chose Approach 1 (single record with both street and box preserved) over Approach 2 (two separate records). Both `street` and `box` fields are populated on the same record when both exist in the source data.

**Test results:**
- 0 records with "Box NNN" in street field (was 43+)
- 819 total records with box populated
- 752 street+box records (no regression)
- 67 box-only records initially

#### Off-Island Detector Fix for Connecticut Ave. (phonebookParser.js)

**Problem:** 32 Connecticut Ave. records flagged as off-island because "Connecticut" (a state name) appeared in the `offIslandLocations` array. Two bugs:
1. No check for whether the off-island term is followed by a street type (Ave., Rd., etc.)
2. "CT" in the off-island list matched as substring inside "CONNECTICUT" at index 5

**Fix — two-part modification to `isOffIslandLocation()`:**
1. **Street type disqualification:** When an off-island term is found, extract the next word. If it's a known street type abbreviation or full form (via `StreetTypeAbbreviationManager`), return false — it's a street name, not an off-island location.
2. **Word boundary check:** Verify characters before and after the matched term are not letters, preventing "CT" from matching inside "CONNECTICUT".

**Debugging journey:** Initial fix attempt failed because `StreetTypeAbbreviationManager` wasn't loaded. Second attempt still showed same results — diagnosed via diagnostic logging which revealed the "CT" substring bug inside "CONNECTICUT". The `.some()` short-circuited on the "CT" match (which incorrectly returned true) before reaching the "Connecticut" match (which correctly returned false).

**Test results after fix:**
- Off-island: 73 → 41 (32 Connecticut Ave. records now correctly on-island)
- Validated BI streets: 1269 → 1301
- Box-only: 67 → 47 (20 Connecticut Ave. records with boxes no longer box-only)

#### Cleanup (Recovery Session)

1. **Removed diagnostic logging** from `isOffIslandLocation()` — `debugConnecticut` variable and all `[DIAG isOffIsland]` console.log calls
2. **Added "West Kingstown" and "Warwick"** to `offIslandLocations` array — these were genuinely off-island entries missed by the detector. "West Kingstown" is a spelling variant of "West Kingston" (already in list).
3. **Added "NORMAL BUSINESS"** as candidate on `Special::^::Cases` — covers 7 phonebook records with "Normal business" as street value

#### Bug Fix: Special::^::Cases Aliases Prototype (Recovery Session)

When adding NORMAL BUSINESS, discovered `entry.alternatives.add is not a function`. Root cause investigation:
- `CLASS_REGISTRY.Aliases` was properly registered (not null)
- But `entry.alternatives instanceof Aliases` was `false` — plain `Object` prototype
- The stored Google Drive data had no `type: 'Aliases'` marker on the `alternatives` property
- **Root cause**: Session 108 console script created the Special::^::Cases entry with `alternatives` as a plain object `{homonyms: [], synonyms: [], candidates: []}` instead of `new Aliases()`. Without the `Aliases` constructor, `serializeWithTypes()` saw `constructor === Object` and skipped the type marker. This persisted on every load/save cycle.
- **Scope**: Isolated to 1 of 152 entries (only this console-created entry affected)
- **Fix**: Reconstituted `Aliases` prototype via `Object.create(Aliases.prototype)`, copied the three arrays, replaced `entry.object.alternatives`, saved. Type marker now written correctly.

#### Bug Fix: saveObject() Variation Cache Rebuild (Recovery Session)

After saving NORMAL BUSINESS, `db.has('NORMAL BUSINESS')` returned `false`. Root cause: `saveObject()` didn't call `_buildVariationCache()` after saving. The `add()` method does (line 430), but `saveObject()` did not.
- **Fix**: Added optional `{ rebuildCache = false }` parameter to `saveObject()`. Default is `false` to preserve existing behavior for bulk operations. Callers that modify candidates/homonyms opt in with `db.saveObject(key, { rebuildCache: true })`. Bulk operations save without rebuilding, then call `db._buildVariationCache()` once at the end.

#### Remaining Unvalidated (13 → ~6 after fixes)

After the PO box fix (Cat 1 resolved), off-island fix, and Normal business addition:
- "(Plant)" x 1 — BI Power Co, Category 2 candidate for Special::^::Cases
- "Block Island" x 1 — just the island name, Category 2
- "Attorneys-at-Law" x 1 — business descriptor, Category 2
- "West Kingstown" x 1 — now caught by off-island detector (added to list)
- "Warwick" x 1 — now caught by off-island detector (added to list)

### Key Lessons

- **JavaScript falsy-value trap with `||`**: Empty string `""` is falsy. `"" || "fallback"` evaluates to `"fallback"`. Use explicit boolean checks: `condition ? (value || null) : alternative`
- **Substring matching pitfalls**: Short terms like "CT" can match inside longer words like "CONNECTICUT". Always add word boundary checks for substring-based detection.
- **Always diagnose before fixing**: Two failed fix attempts occurred because of guessing instead of adding diagnostic logging first. Diagnostics immediately revealed the real bug ("CT" at index 5 inside "CONNECTICUT").
- **Console-created DB entries may lack prototypes**: Objects created via console scripts may have plain-object sub-properties instead of proper class instances. `serializeWithTypes()` only writes type markers when `constructor !== Object`. Verify with `instanceof` after loading.
- **New parameters must default to preserve existing behavior**: Adding `rebuildCache = true` as default would silently change behavior for all existing callers. Safe default is always the one that matches pre-change behavior.

### Files Modified

| File | Changes |
|---|---|
| scripts/phonebookParser.js | extractBox() regex tightened; 6 LineType `\|\|` fallback fixes; isOffIslandLocation() word boundary + street type check; diagnostic logging removed; "West Kingstown" and "Warwick" added to offIslandLocations |
| scripts/databases/aliasedTermDatabase.js | `saveObject()` now accepts `{ rebuildCache }` option (default false) |
| CLAUDE.md | Updated to v205.0 Session 110 status |
| reference_sessionHistory_2026_February.md | Added Session 110 entry |
| reference_unvalidatedStreetGroupings.md | Cat 1 RESOLVED, Cat 2 updated |
| reference_phonebookIntegration.md | Status updated |

### Google Drive Changes

| Change | Details |
|---|---|
| Special::^::Cases entry | "NORMAL BUSINESS" added as candidate; Aliases prototype reconstituted; `type: 'Aliases'` marker now written |
| Database totals | 152 entries, 286 variations |

### Next Steps (Session 111)

1. Re-test phonebook matcher with expanded 152-entry database + all parser fixes
2. Disposition remaining Category 2 items: (Plant), Block Island, Attorneys-at-Law
3. Continue to Section 4.7 (match classification)

---

## Session 109 - Street Database Expansion: 123 → 152 Entries (February 20, 2026)

### Status: Coded and saved to Google Drive — ready for user verification

**Session Goal:** Execute the Category 3 street database expansion from reference_unvalidatedStreetGroupings.md — map 56 unvalidated phonebook street variations to existing DB entries or create new entries. Also trimmed CLAUDE.md from 479 to 422 lines.

### What Was Done

#### CLAUDE.md Trimming (479 → 422 lines)

1. **Migrated session accomplishment records** — Removed redundant session 108 blow-by-blow from CURRENT_WORK_CONTEXT, standalone completed_collectiveContactInfo block, and completed_tasks block (all duplicated in STATUS_TRACKER or reference docs)
2. **Trimmed MAINTENANCE_PROTOCOL** — Removed MANDATORY_OFFLOADING_RULES (15 lines), added one-line summary
3. **Removed duplicates** — Eliminated `multiple_comparison_paths` from CRITICAL_LESSONS (duplicated by MANDATORY_COMPARETO_ARCHITECTURE)
4. **Shortened verbose entries** — `_saveIndex_corruption` and `bloomerang_csv_preprocessing` reduced to pointers to their reference docs
5. **Removed transitional warning** — `flat_file_fully_retired` no longer needed

#### Street Database Expansion

**Phase 1: Mapping Variations to Existing Entries**

Ran top-3 similarity comparison of all 56 Category 3 variations against the 123-entry database. User provided designations for each variation:
- 14 variations mapped to 6 existing entries
- 42 variations designated as "None" (need new entries)

Added 17 candidates to existing entries (14 base + 3 apostrophe doubles):

| Existing Entry | Candidates Added |
|---|---|
| DUNN TOWN | DUNN RD., DUNN RD, DUNN'S CART WAY, DUNN\u2019S CART WAY, DUNN'S CARTWAY, DUNN\u2019S CARTWAY |
| SOUTH WEST PT | SOUTHWEST POINT RD., SOUTHWEST PT. RD., SOUTHWEST POINT, SW POINT RD |
| MILL POND LANE | MILL POND RD. |
| WEST SIDE | W SIDE RD. |
| LEE'S RIDGE | LEE'S RIDGE RD., LEE\u2019S RIDGE RD., LEES RIDGE RD. |
| CORMORANT COVE | CORMORANT PT. |
| BEACON HILL | BEACON HL RD. |

**Phase 2: Creating New Entries**

User provided grouping designations for the 42 "None" variations — some standalone, some reciprocal pairs, some multi-variation groups. Created 29 new StreetName entries:

- **20 standalone entries** (1 variation each): WEST LANE, SHEFFIELD FARM, OLD HARBOR, TURKEY HOLLOW, HULL LANE, OLD HARBOR MEADOW, SOUTH SHORE CLIFFS, ROSLYN RD., SCHOONER POINT, JANE LANE, CLAYHEAD TRAIL, PARSONAGE, NEW HARBOR, RODMAN POND LANE, GOOSE SWAMP LANE, FOUNTAIN SQUARE, RED GATE FARM, HARBOR POND, TURNIP FARM, BRIDGEGATE SQUARE
- **5 reciprocal pairs** (primary + 1 homonym each): SHEEP'S MEADOW/SHEEP\u2019S MEADOW, AMBROSE LANE/AMBROSE LN, WHALE SWAMP RD./INDIAN HEAD NECK RD. (separate entries), PHEASANT TRAIL/PHEASANT TRL., BRIDGEGATE SQ. mapped to BRIDGEGATE SQUARE
- **1 apostrophe-doubled pair**: ANDY'S WAY/ANDY\u2019S WAY
- **3 multi-variation groups**:
  - TRIM'S RIDGE (homonyms: TRIM\u2019S RIDGE, TRIMS RIDGE; candidate: TRIMS RDG)
  - EBBETT'S HOLLOW (homonyms: EBBETT\u2019S HOLLOW, EBBET'S HOLLOW, EBBET\u2019S HOLLOW)
  - CAT ROCK COVE RD. (homonyms: CAT ROCK COVE; candidate: CAT ROCK RD.)

**Final State:** 152 entries, 285 variations in cache, all saved to Google Drive (individual files + index)

#### Technical Approach

- Console scripts presented for copy/paste (not saved to codebase)
- Used `StreetName.compareTo()` with `StreetTypeAbbreviationManager.expandStreetName()` for similarity
- Alias categorization: similarity >= 0.875 → homonym, < 0.875 → candidate
- `AttributedTerm(str, 'phonebook', 0, identifier, 'homonyms'|'candidates')` constructor
- `db.add(streetName)` for new entries, `db.saveObject(primaryKey)` for existing
- 400ms delay between Google Drive writes to respect rate limits
- Curly apostrophe (U+2019) and straight apostrophe (U+0027) both stored as aliases

### Key Discoveries

- `db.lookup()` with 0.80 threshold returned 0 matches for all 56 variations — the abbreviation expansion in `compareTo()` helps with similarity scoring but the gap between phonebook variations and DB primaries is too wide for even 0.80 threshold
- User-guided designation process (mapping each variation manually) was more reliable than automated threshold-based mapping
- Fresh unvalidated streets report showed 166 records/102 streets (vs 190/109 in reference doc). Discrepancy accounted for by Special::^::Cases entries (6 streets/~20 records) + Old Harbor (4 records)

### Files Modified

| File | Changes |
|---|---|
| CLAUDE.md | Trimmed 479→422 lines; updated to v204.0 with Session 109 status |
| reference_individualNameDatabase.md | Added _saveIndex corruption detail (offloaded from CLAUDE.md) |
| reference_phoneIntakePlan.md | Added CSV Preprocessing section (offloaded from CLAUDE.md) |

### Google Drive Changes

| Change | Count |
|---|---|
| Existing entries updated with new candidates | 6 entries (17 candidates total) |
| New StreetName entries created | 29 |
| Database total | 152 entries, 285 variations |
| Index file | Updated with all 152 entries |

### Next Steps (Session 110)

1. Fix parser PO box detection (Category 1 — 39 unique, ~46 records where "Box NNN" is in street field)
2. Re-test matcher with expanded 152-entry database
3. Continue to task 4.7 (match classification)

---

## Session 108 - Flat File Retirement, Synonym Fix, Street Expansion Prep (February 20, 2026)

### Status: Documentation updated — ready for Session 109 street expansion work

**Session Goal:** Address street database gaps from Phase B testing — fix infrastructure issues, categorize unvalidated streets, prepare for database expansion.

### What Was Done

1. **Retired window.blockIslandStreets flat Set** — Converted ALL remaining code from the backward-compatibility flat Set to `window.streetNameDatabase` (AliasedTermDatabase). Files converted:
   - `phonebookParser.js` — `ensurePhonebookStreetsLoaded()`, `findBIStreetMatch()`, `scanForStreetInText()`, stats line
   - `utils.js` — `isBlockIslandStreet()`
   - `addressProcessing.js` — `findBlockIslandStreetMatch()`, `createBlockIslandAddress()`, `enhanceAddressWithBlockIslandLogic()`, `loadBlockIslandStreetsFromDrive()` (removed Set-building code)
   - `streetNameBrowser.js` — Removed bridge code that built flat Set from `_variationCache`
   - `streetArchitectureBaseline.js` — 4 usage sites converted

2. **Fixed synonym exclusion bug in `_buildVariationCache()`** (aliasedTermDatabase.js) — Synonyms (unverified staging area) were incorrectly included in the variation cache, causing `has()` and `lookup()` to treat synonym matches as valid Island streets. Fixed to only include primaries + homonyms + candidates. This is a critical architectural fix — synonyms must NEVER participate in matching.

3. **Created Special::^::Cases StreetName entry** — New database entry with intentionally unmatchable primary alias `Special::^::Cases`. Candidates: TOWN HALL, STATE AIRPORT, (SEE NEW SHOREHAM, TOWN OF), OLD HARBOR DOCK, JOB'S HILL/TOWN HALL, (FREIGHT/B.I.). These are BI locations recognized as Island streets for phonebook matching but excluded from entity comparisons.

4. **Re-categorized unvalidated streets** — After synonym fix and flat file retirement, re-ran analysis: 190 unvalidated records, 109 unique streets (vs. 186/107 before). Created reference_unvalidatedStreetGroupings.md with three categories:
   - **Category 1**: PO Boxes in street field (39 unique, ~46 records) — parser fix needed
   - **Category 2**: Not streets/businesses/off-island (~12 unique, ~32 records) — Special::^::Cases or exclusion
   - **Category 3**: Real BI streets to add (~37 unique canonical names, ~112 records) — database expansion

5. **Researched flat file history** — Traced the original StreetName migration (Phases 0-6) to understand why the flat Set still existed. Found it was a backward-compatibility bridge created during Phase 3 that should have been retired when all consumers migrated. No code loads from the original flat JSON file anymore.

6. **User specifications for alias addition** — Rules established for next session:
   - Store in UPPERCASE
   - Follow existing conventions (no apostrophe stripping or abbreviation expansion)
   - Use similarity calculation: >=0.875 → homonym, else → candidate
   - Exclude "West Lane Box1641"
   - Preliminary step: map each variation to its existing DB entry via `db.lookup()` before adding

### Files Modified

| File | Changes |
|------|---------|
| scripts/databases/aliasedTermDatabase.js | Fixed `_buildVariationCache()` to exclude synonyms |
| scripts/phonebookParser.js | Converted 4 functions from flat Set to streetNameDatabase |
| scripts/utils.js | Converted `isBlockIslandStreet()` |
| scripts/address/addressProcessing.js | Converted 4 functions, removed Set-building code |
| scripts/streetNameBrowser.js | Removed bridge code |
| scripts/diagnostics/streetArchitectureBaseline.js | Converted 4 usage sites |
| reference_phonebookIntegration.md | Updated to v3.4 — Session 108 work documented |

### Files Created

| File | Purpose |
|------|---------|
| reference_unvalidatedStreetGroupings.md | Categorized analysis of 190 unvalidated phonebook records |

### Key Discoveries

- `_buildVariationCache()` was including synonyms — design docs and code comments clearly state synonyms are unverified. This bug meant `db.has()` returned true for synonym-only matches.
- The flat Set (`window.blockIslandStreets`) was redundant — derived from `_variationCache.keys()` at load time, never from a separate file. Had staleness problem if streets added during session.
- Curly/smart apostrophes (U+2019) vs straight apostrophes (U+0027) affect 7 streets — need both forms as aliases.
- StreetNameDatabase: 123 entries (122 original + Special::^::Cases)
- Parser test results after all changes: 1136 validated, 190 unvalidated (of 1433 records)

### Next Steps (Session 109)

1. Write code to map each Category 3 variation against database via `db.lookup()` — find existing entry or flag as new
2. Add variations as aliases (homonym or candidate based on similarity score)
3. Create new StreetName entries for truly new streets
4. Fix parser PO box detection (Category 1)
5. Re-test matcher

---

## Session 107 - Phase B Matcher Testing + Street Database Gap Analysis (February 19, 2026)

### Status: Testing in progress — street database gaps identified, next steps defined

**Session Goal:** Test the phonebook matcher (coded Session 106), verify address matching, identify and categorize unmatched streets.

### What Was Done

1. **Reverted failed cache-based fixes** — Two attempts to resolve phonebook `streetNormalized` (variation names like "CORN NECK RD") to canonical primary alias terms (like "CORN NECK ROAD") via `_variationCache` lookups failed. The root cause was NOT a matcher comparison issue — it was streets failing the `isValidBIStreet` gate in the parser.

2. **Ran first matcher test** — 1433 records, ~200 seconds, all 1879 groups. Results: 832 name hits, 121 address hits, 129 PO box hits, 25 name+address same group, 0 collisions, 552 no hits.

3. **Discovered phonebook data rarely contains fire numbers** — Only 2 of 1433 records have extractable fire numbers. Street fields are typically just names ("Corn Neck Rd.") without house numbers. Street-name-only matching is the dominant address path.

4. **Analyzed unmatched streets** — 231 records (108 unique street values) fail `isValidBIStreet`. Categorized into 4 groups:
   - **Category 1** (19 unique, 57 records): Clearly variations of existing DB entries — apostrophe encoding (curly vs straight) and abbreviation gaps (Pt→Point, W→West, Hl→Hill)
   - **Category 2** (~38 unique, ~100 records): Likely real BI streets not in the database (West Lane, Lewis Farm Rd., Dickens Farm Rd., etc.)
   - **Category 3** (11 unique, 32 records): Not streets/not BI (Town Hall, Normal business, off-island cities, business designations)
   - **Category 4** (39 unique, 42 records): PO boxes in street field — parser needs to detect "Box NNN" and route to `address.box`

5. **Guiding principle established**: Expand database contents rather than build complex parser normalization. Category 1 → add variations to existing StreetName entries. Category 2 → add new streets. Category 4 → parser fix for box detection.

### Files Modified
- `scripts/phonebookParser.js` — Added then reverted `resolveToCanonicalStreetName()` (cache lookup didn't work)
- `scripts/matching/phonebookMatcher.js` — Added then reverted variation cache resolution in `lookupAddressInGroup()`
- `reference_phonebookIntegration.md` — v3.3: Added Phase B Testing Results section with gap analysis

### Files Created (Session 106, carried forward)
- `scripts/matching/phonebookMatcher.js` — Core matching logic (lookupNamesInGroup, lookupAddressInGroup, lookupPOBoxInGroup, matchPhonebookRecordToGroups, matchAllPhonebookRecords, inspectPhonebookMatch)

### Next Steps
1. Expand street database: add Category 1 variations to existing entries, add Category 2 as new streets
2. Fix parser to detect PO boxes in street field (Category 4)
3. Re-run matcher test to verify improved address hit count
4. Continue to task 4.7 (match classification)

---

## Session 106 - Phase B Design + Matcher Implementation (February 18-19, 2026)

### Status: Coded — matcher and parser changes implemented

**Session Goal:** Design and implement Phase B phonebook matching (Task 4.5).

### What Was Done

1. **Fixed buildMemberCollections() gating** — Was inside `buildAllConsensusEntities()` (gated behind `buildConsensus: false`). Moved to unconditional step in build flow. Also removed `hasMultipleMembers()` guard so all 1879 groups get collections.

2. **Designed Phase B matching** — Documented in reference_phonebookIntegration.md v3.2: core function design, iteration pattern, name/address/PO box lookup, fire number uniqueness principle, collision handling.

3. **Added fire number extraction to parser** — `extractAddressWithFireNumber()` in phonebookParser.js extracts fire number fields (fireNumber, fireNumberRaw, hasCollisionSuffix, streetWithoutFireNumber) during parsing. CSV export updated with 4 new columns.

4. **Created phonebookMatcher.js** — New file with complete matching logic: name lookup (individualNames + unrecognizedIndividualNames, 0.80 threshold), address lookup (fire number + street-only paths), PO box lookup, batch function with progress logging and summary stats.

5. **Added script tag** to index.html for phonebookMatcher.js.

### Files Modified
- `scripts/matching/entityGroupBuilder.js` — Moved buildMemberCollections out of consensus gate, removed hasMultipleMembers guard
- `scripts/objectStructure/entityGroup.js` — Removed redundant buildMemberCollections from buildAllConsensusEntities
- `scripts/phonebookParser.js` — Added extractAddressWithFireNumber(), updated record construction and CSV export
- `index.html` — Added phonebookMatcher.js script tag
- `reference_phonebookIntegration.md` — v3.2: Phase B Design Decisions section

### Files Created
- `scripts/matching/phonebookMatcher.js` — Core matching logic (NEW)

---

## Session 105 - Confirm-Only Email/Phone Gates + PhoneTerm Validation (February 18, 2026)

### Status: Coded and tested — ready for user verification

**Session Goal:** Change contactInfoWeightedComparison so email and phone only boost scores on perfect matches, never penalize on mismatches. Fix PhoneTerm.compareTo to reject blank/short numbers.

### What Was Done

1. **Confirm-only gate design** — Email and phone should only contribute their weighted value when a perfect match is found (email > 0.99, phone === 1.0). Non-matches are excluded from the calculation (same as if no data existed for that component), rather than penalizing. Rationale: people use different emails/phone numbers in different contexts — a mismatch is neutral, not negative.

2. **PhoneTerm.compareTo 10-digit validation** — Original code returned 1.0 when both terms were null/empty (blank-as-match). Fixed to normalize first, then require both results to be exactly 10 digits. Blanks, empty strings, short numbers all return 0.0.

3. **Deserialization debugging detour** — Initial testing showed entity groups dropping from 1879 to 1471. Extensive isolation testing (commenting out email, phone, reverting weights, reverting PhoneTerm.compareTo) showed none of our changes in contactInfoWeightedComparison were responsible. Diagnostics confirmed: email and phone data are NEVER present in contactInfoWeightedComparison comparisons (hasEmailData=0, hasPhoneData=0 across 1.86M calls). Root cause: we assumed only entity group rebuild was needed to test, but structural changes to ContactInfo (new islandPhone/additionalPhones fields from Session 103) and new PhoneTerm class required a full rebuild from the beginning for proper deserialization.

4. **Incremental retesting after full rebuild** — All changes retested one step at a time from 1880 baseline:
   - Step 2: Weight change (0.60/0.20/0.20) — no change (1880)
   - Step 3: Phone active with phoneConfirmed gate — no change (1880)
   - Step 4: Email emailConfirmed gate — 1880 → 1879
   - Step 5: PhoneTerm.compareTo 10-digit validation — no change (1879)

### Critical Lesson Learned
**Structural changes to entity classes (new fields, new class types) require a full rebuild from the beginning.** Reloading saved entity data and rebuilding only entity groups is NOT sufficient — the generic deserialization (Object.create + property copy) may not properly reconstitute objects when class structure has changed. Add to CRITICAL_TECHNICAL_PATTERNS.

### Files Modified
- `scripts/utils.js` — contactInfoWeightedComparison: emailConfirmed/phoneConfirmed gates, confirm-only comment, JSDoc update
- `scripts/objectStructure/aliasClasses.js` — PhoneTerm.compareTo: 10-digit normalization validation replaces blank-as-match logic

### Entity Group Count: 1879

---

## Session 104 - Phonebook Matching Algorithm Design (February 18, 2026)

### Status: Design complete (Phase A tasks 4.1–4.4), ready for Phase B implementation

**Session Goal:** Design the matching algorithm for Task 3 Section 4 — matching phonebook records against EntityGroups to assign phone numbers and integrate contact data.

### Design Decisions Made

1. **4.1 — Phonebook data structure analysis**: Two subsystems exist — `phonebook.js` (Google Sheets dump) and `phonebookParser.js` (1,473-line modular parser for PhoneBookBase.txt). The parser produces structured records with name/address/phone fields but does NOT create Entity objects or match against EntityGroups. ~1,482 lines, ~2 records have fire numbers, virtually all are street-name-only.

2. **4.2 — Matching algorithm design**: Full design agreed upon (see below). 4.3 and 4.4 already addressed by phone intake work.

### Matching Algorithm — Key Design Points

**Address matching logic**:
- Gate: street must be a verified BI street for any street-based matching
- If verified BI street + fire number → match on fire number (unique on island)
- If verified BI street + no fire number → match on street name
- PO Box checked separately in `blockIslandPOBoxes{}`; when record has both street and box, check both collections
- Existing Address.compareTo() with 0.85/0.15 fire-number/street weighting applies as-is — the 0.15 max for street-only matches is intentional protection

**Name matching logic**:
- Create temporary IndividualName(s) from phonebook record
- Compare against all names in EntityGroup members using `safeNumericCompare` (collapses four-score)
- For couples: create TWO IndividualNames, match independently

**Overall scoring**:
- nameScore = best name score across all group members
- contactInfoScore = best contactInfo score across all group members (address + phone + email with renormalization)
- overallScore = entityWeightedComparison(bestNameScore, bestContactInfoScore)
- Apply four-condition MATCH_CRITERIA to determine trueMatch/nearMatch

**Individual match criteria**: Standard four-condition MATCH_CRITERIA test

**Couple match criteria**:
- Condition 1: Either member passes individually
- Condition 2: Both members' nameAlone > nearMatch threshold (0.845), each matched to DIFFERENT names in group, AND contactInfoAlone > nearMatch threshold (0.85)

**If matched — integration**:
- Name: Apply `_tryMatchToExistingName` logic (homonym ≥0.875, candidate ≥0.845, else unrecognized)
- Phone: Check if already exists in group's phone collections; add if not
- Address: Check if matches/aliases existing address in collections; integrate using same alias threshold logic

**If never matched**: Create new EntityGroup, log potential IndividualName entry

### contactInfoWeightedComparison Weight Change (decided and coded this session)

Phone comparison added to `contactInfoWeightedComparison()` in utils.js:
- Primary involved: address 0.60, email 0.20, phone 0.20 (was: address 0.75, email 0.25)
- Secondary only: address 0.48148, email 0.25926, phone 0.25926 (was: address 0.65, email 0.35)
- Missing components renormalize as before (weightedSum / totalWeight)

### Implementation Details

1. **`findBestPhoneMatch(contactInfoA, contactInfoB)` helper** — Added after `getEmailString()` in utils.js. Gathers PhoneTerms from all phone slots (phone, islandPhone, additionalPhones) on both ContactInfo objects, does all-pairs `PhoneTerm.compareTo()`, returns `{bestScore, hasData, matchedPhoneA, matchedPhoneB}`. Follows `findBestAddressMatch()` pattern — keeps collection logic in the helper, not in the main comparison function.

2. **Step 3b in `contactInfoWeightedComparison()`** — Single-line call: `findBestPhoneMatch(thisCI, otherCI)`. Result feeds into `hasPhoneData` flag and `phoneSimilarity` score.

3. **Weight update** — `baseWeights` object expanded from `{address, email}` to `{address, email, phone}`. Phone added to `weightedSum`/`totalWeight` conditional block.

4. **Detailed breakdown** — Phone component added to detailed return object with `matchedPhoneA.term`/`matchedPhoneB.term` values.

### Files Modified
- `scripts/utils.js` — `findBestPhoneMatch()` helper (line ~1285), `contactInfoWeightedComparison()` Step 3b + weights + detailed breakdown
- `scripts/objectStructure/contactInfo.js` — Updated comment "phone has no weight" → documents new phone weights

---

## Session 103 - Phone Intake from Bloomerang CSV (February 18, 2026)

### Status: USER_VERIFIED_COMPLETE — All 6 steps verified

**Session Goal:** Integrate phone number data from new Bloomerang CSV columns into the entity/EntityGroup pipeline

### What Was Done

1. **Override database investigation** — User reported inconsistent displays in override browser for Group 52. Diagnostic console commands revealed both override database (empty) and entity group database (algorithmic preference) were correct. The "two sources" were actually two different fields by design: founding member location address vs collectiveMailingAddress. No bug — false alarm from memory.

2. **Explore Group auto-expand** — Fixed the object explorer modal to auto-expand the root node on open, eliminating the useless extra click on "EntityGroup (18 props)". Two lines added to entityGroupBrowser.js.

3. **Bloomerang preprocessing documentation** — Updated index.html Step A5 box and CLAUDE.md CRITICAL_LESSONS with 4-step preprocessing requirements: eliminate total row, format numeric columns (no commas or $ signs), replace commas with ^#C#^, eliminate all \n characters.

4. **Phone Intake Plan** — Researched entire pipeline end-to-end (EmailTerm as model, ContactInfo, EntityGroup.buildCollectiveContactInfo, CollectivePhone, entity renderer, CSV export). Created reference_phoneIntakePlan.md v2.0 with user feedback: Island/A/B/C/D categorization, normalization rules (7-digit padding), dedup before categorization.

5. **Step 1: Clean import verification** — New 34-column All Data.csv processed through full pipeline (Bloomerang processing, unified database, EntityGroup build with consensus, collections, CollectiveContactInfo). All counts matched, zero disruption from extra columns.

6. **Step 2: PhoneTerm class** — Created in aliasClasses.js. normalizePhone() (strip non-digits, country code removal, 7-digit padding: 466→prepend 401, other→prepend 000), isIslandNumber() (checks area code 401 AND exchange 466), isValidPhone(), compareTo(). Registered in window exports and CLASS_REGISTRY.

7. **Step 3: Phone intake pipeline** — Added phone fields to all 3 fieldMaps in bloomerang.js (indices 30-33). Created processPhoneFields() function: collects 4 raw values, creates PhoneTerms, normalizes, deduplicates, extracts first Island number, fills A/B/C/D by priority (primary > mobile > home > work). Added islandPhone and additionalPhones properties to ContactInfo. Wired into createContactInfoEnhanced().

8. **Bug fix: isIslandNumber()** — Initial check only verified exchange=466, missed area code. (904) 466-5723 (Florida) was misidentified as Island. Fixed to require area code 401 AND exchange 466. Dropped from 21 to 19 island phones (correct).

9. **Step 4: EntityGroup collector** — Updated buildCollectiveContactInfo() in entityGroup.js to collect islandPhone, phone, and additionalPhones from each member entity.

10. **Steps 5-6: Display/export and serialization** — User verified phone data appears in entity renderer, override browser Contact Preferences panel, and survives serialization round-trip.

### Files Modified
- `scripts/objectStructure/aliasClasses.js` — PhoneTerm class + window export
- `scripts/utils/classSerializationUtils.js` — PhoneTerm in CLASS_REGISTRY
- `scripts/objectStructure/contactInfo.js` — islandPhone, additionalPhones properties + setters
- `scripts/bloomerang.js` — 3 fieldMaps + processPhoneFields() + wiring in createContactInfoEnhanced()
- `scripts/objectStructure/entityGroup.js` — collect all phone slots in buildCollectiveContactInfo()
- `scripts/entityGroupBrowser.js` — auto-expand root node in object explorer
- `index.html` — Bloomerang preprocessing instructions in Step A5

### Results
- 93 entities with phone data, 19 with island phones
- 69 EntityGroups with collectivePhone populated
- ~120 lines of new code across 5 files

### Notes
- Future task: consolidate 3 duplicate fieldMaps in bloomerang.js into shared constant

---

## Session 101 - CollectiveContactInfo Phases 1-3 Complete (February 17, 2026)

### Status: USER_VERIFIED_COMPLETE — Phases 1-3 all verified, Phase 4-5 next session

**Session Goal:** Verify CC-13/CC-14 (serialization round-trip), CC-9/CC-10 (multi-member group population), complete Phases 1-3

### What Was Done

1. **PO Box primaryAlias investigation** — User reported raw VisionAppraisal delimiters (`::#^#::`, `:^#^:`) in secondary address primaryAlias.term. Created `scripts/diagnostics/secondaryAddressDiagnostic.js` with 5 diagnostic functions. Found: parsed components (city, state, secUnitNum) ARE correct (serialization migration worked), but primaryAlias.term holds raw uncleaned string from Address.fromProcessedAddress(). This is cosmetic — comparison code uses parsed components, not primaryAlias.
2. **CC-13/CC-14 serialization round-trip** — Group 117 (8 members, 3 collective types: CollectiveMailingAddress, CollectivePOBox, CollectiveEmail). Fresh build → save → hard refresh → reload → identical diagnostic output. All class identities, nested objects, arrays, and data values preserved. USER_VERIFIED.
3. **CC-9 multi-member group population** — Verified preferred selections match member data frequency: PO BOX 1257 preferred (5 member contributions), 9 alternatives complete, email/poBox correct. USER_VERIFIED.
4. **CC-10 consensus comparison** — Consensus entity (from loaded file) chose same values: primaryAddress=PO Box 1257, poBox=1257. Matches CollectiveContactInfo preferred. USER_VERIFIED.
5. **Documentation updates** — reference_collectiveContactInfo.md v3.3, CLAUDE.md v197.0, session history

### Files Created
- `scripts/diagnostics/secondaryAddressDiagnostic.js` — 5 diagnostic functions (diagnoseSecondaryAddress, dumpAddressDetail, findPOBoxAddresses, diagnoseCollectiveContactInfo, findRichestCollectiveGroups)

### Key Findings
- Address.fromProcessedAddress() (aliasClasses.js:1636) sets primaryAlias from processedAddress.original (raw uncleaned string) — cosmetic issue, not functional
- All 1235 PO Box addresses have raw delimiters in primaryAlias — all VisionAppraisal, all secondary addresses
- addressWeightedComparison uses parsed components (secUnitType, secUnitNum, city, state, zip), NOT primaryAlias
- entityRenderer.js has secondaryAddresses (plural) vs secondaryAddress (singular) mismatch — secondary addresses never display in renderer
- PoBox class (aliasClasses.js:741) is dead code — never instantiated
- contactInfo.poBox is Bloomerang-only (bare box number as SimpleIdentifiers)
- collectivePhone: 0 groups populated (no phone data in system yet — Section 4 will add this)

### Next Session
- CollectiveContactInfo Phase 4-5 (CC-15 through CC-21): Override Infrastructure and UI

---

## Session 100 - Serialization Migration Executed (February 17, 2026)

### Status: CODED AND TESTED — Awaiting user verification

**Session Goal:** Execute serialization migration plan (reference_serializationMigrationPlan.md) — remove all ~34 custom deserialize/fromSerializedData methods, unblock CC-13/CC-14

### What Was Done

**Prerequisites:**
- Reverted 3 Session 98 diagnostic traces (entityClasses.js, addressProcessing.js, entityGroup.js)

**Batch 1:** Removed `Aliased.fromSerializedData()` from aliasClasses.js — single highest-impact change, makes all 12+ Aliased subclasses use generic fallback
- Test: Address round-trip — all 10 checks passed

**Batch 2:** Removed 15 dead methods from aliasClasses.js (ensureDeserialized, Aliased.deserialize, SimpleIdentifiers.deserialize, NonHumanName.deserialize, IndicativeData.deserialize + _deserializeIdentifier, IdentifyingData.deserialize, FireNumber.deserialize, PoBox.deserialize, PID.deserialize, StreetName.deserialize, ComplexIdentifiers.deserialize, IndividualName.deserialize, HouseholdName.deserialize, Address.deserialize)
- Test: Address round-trip — all checks passed

**Batch 3:** Removed 10 methods from contactInfo.js (Info.deserializeByType, Info.deserializeBase, Info.fromSerializedData, ContactInfo.deserialize/fromSerializedData, OtherInfo.fromSerializedData, HouseholdOtherInfo.deserialize/fromSerializedData, LegacyInfo.deserialize/fromSerializedData)
- Test: ContactInfo + full entity round-trip — all 6 checks passed

**Batch 4:** Removed 9 methods from entityClasses.js (Entity.deserialize/fromSerializedData/deserializeAny, Individual.deserialize, CompositeHousehold.deserialize, AggregateHousehold.deserialize, NonHuman.deserialize, Business.deserialize, LegalConstruct.deserialize)
- Test: Individual/NonHuman/Business round-trip — all 8 checks passed (after correcting test script that assumed IdentifyingData wrapper)

**Batch 5:** Removed 5 methods from householdInformation.js (HouseholdInformation.deserialize/fromSerializedData, ParentDescription.fromSerializedData, ParticipantDescription.fromSerializedData, ComparisonParticipants.fromSerializedData)
- Test: Cumulative Individual round-trip — all 4 checks passed

**Batch 6:** Removed CollectiveContactInfo.fromSerializedData() from contactInfo.js
- Test: CollectiveMailingAddress round-trip — all 5 checks passed

**Batch 7:** Updated comments in classSerializationUtils.js (PREFERRED→OVERRIDE, FALLBACK→STANDARD); updated addressTesting.js and testAttributedTermSubclasses.js to use generic round-trip
- Test: Comprehensive save/load round-trip — 1874 groups saved, reloaded after hard refresh, CollectiveMailingAddress with full Address data (city: Block Island, state: RI, zip: 02807) all class identities preserved

**Batch 8:** Updated CLAUDE.md and documentation

### Files Modified
| File | Changes |
|------|---------|
| scripts/objectStructure/aliasClasses.js | Removed fromSerializedData, ensureDeserialized, 14 deserialize methods |
| scripts/objectStructure/contactInfo.js | Removed deserializeByType, deserializeBase, 9 other methods |
| scripts/objectStructure/entityClasses.js | Reverted diagnostics, removed 9 deserialize methods |
| scripts/objectStructure/householdInformation.js | Removed 5 methods |
| scripts/address/addressProcessing.js | Reverted PO BOX PARSE TRACE diagnostic |
| scripts/objectStructure/entityGroup.js | Reverted Group 76 diagnostic |
| scripts/utils/classSerializationUtils.js | Updated comments |
| scripts/testing/addressTesting.js | Updated test to use generic round-trip |
| scripts/testAttributedTermSubclasses.js | Updated 3 tests to use generic round-trip |
| CLAUDE.md | Version 195.0 |

### Key Discovery
- Batch 4 test initially showed `name.identifier instanceof IndividualName` as false — diagnostic revealed entities store `name` directly as IndividualName (no IdentifyingData wrapper), confirming test script error not deserialization regression

---

## Session 99 - Serialization Migration Plan Created (February 17, 2026)

### Status: Plan created, execution deferred to Session 100

**Session Goal:** Audit serialization philosophy issue discovered in Session 98, create migration plan

### What Was Done
- Corrected wrong conclusion from aborted post-Session-98 session (custom methods are NOT "by design")
- Confirmed generic deserializeWithTypes() fallback handles all classes via JSON.parse reviver bottom-up processing
- Created reference_serializationMigrationPlan.md: 8 batches with incremental testing

---

## Session 98 - CollectiveContactInfo Build Verification + Serialization Discovery (February 17, 2026)

### Status: IN PROGRESS — Serialization philosophy issue discovered, blocking CC-13/CC-14

**Session Goal:** Verify CollectiveContactInfo build pipeline (CC-11), register CLASS_REGISTRY (CC-12), begin serialization round-trip testing (CC-13/CC-14)

### What Was Done

**1. CC-11 Build Pipeline Verified:**
- User ran fresh entity group build — CollectiveContactInfo populated for all 1875 groups
- Build log confirms: "Built CollectiveContactInfo for 1875 groups"
- CC-11 status: ready_for_testing (build runs, but serialization round-trip not yet confirmed)

**2. CC-12 CLASS_REGISTRY Registration:**
- Registered 5 CollectiveContactInfo classes in classSerializationUtils.js CLASS_REGISTRY
- Classes: CollectiveContactInfo, CollectiveMailingAddress, CollectivePhone, CollectivePOBox, CollectiveEmail

**3. PO Box Investigation → Serialization Discovery:**
- Investigated why PO-Box-only VisionAppraisal addresses (e.g., "PO BOX 835") appeared as flat strings in loaded entities rather than properly parsed Address objects
- Key findings from diagnostic-driven investigation:
  - **Address parsing is correct at construction time** — parseAddress extracts sec_unit_type, sec_unit_num, city, state, zip correctly
  - **Address object fields are properly populated** at build time (secUnitType="PO BOX", secUnitNum="835", etc.)
  - **contactInfo.poBox is NEVER populated for VisionAppraisal entities** — only Bloomerang entities set it (from dedicated CSV field). This is a pre-existing gap, not a regression.
  - **The data is flattened during serialization/deserialization round-trip** — when entities are saved to and loaded from Google Drive, properly constructed Address objects lose their parsed field data

**4. Serialization Philosophy Inconsistency Discovered:**
- `Address.deserialize()` at aliasClasses.js:2182-2241 is a **custom deserialization method** that manually enumerates properties and calls `ensureDeserialized()`
- This is **INCONSISTENT** with the project's serialization philosophy: "Generic fallback in deserializeWithTypes() (Object.create + property copy) handles all classes. Do NOT write custom deserialize()/fromSerializedData() methods."
- The codebase has **TWO competing deserialization systems**:
  1. Generic `deserializeWithTypes()` in classSerializationUtils.js (project-endorsed)
  2. Class-specific `Info.deserializeByType()` in contactInfo.js (lines 98-137) that calls custom `deserialize()`/`fromSerializedData()` methods
- `ContactInfo.deserialize()` (contactInfo.js:172-177) uses `Info.deserializeByType()` for primaryAddress and secondaryAddress, routing through the custom `Address.deserialize()` rather than the generic fallback
- **This is the root cause** of the Address field flattening — the custom path handles serialization differently than the generic system

**5. User Decision:**
- Stop investigating the PO Box case specifically — the root issue is the broader serialization/deserialization architecture
- Next session should revisit serialization philosophy before continuing CollectiveContactInfo work
- CC-13/CC-14 (serialization round-trip testing) is blocked until the two competing systems are reconciled

### Diagnostics to Revert (3 files)

| File | Location | What to Remove |
|------|----------|----------------|
| scripts/objectStructure/entityClasses.js | ~lines 218-282 | PO BOX 835 `_diagPOBox` variable and all associated console.log statements (Address object field logging) |
| scripts/address/addressProcessing.js | In parseAddressPhase(), after line 1194 | PO BOX PARSE TRACE diagnostic (tests for /PO\s*BOX\s*835\b/i, logs finalAddressString, parsed result, validation check) |
| scripts/objectStructure/entityGroup.js | ~lines 198-235 | Group 76 diagnostic logging in buildCollectiveContactInfo() (logs all collected items and types before/after populateFromMembers) |

### Files Changed

| File | Changes |
|------|---------|
| scripts/objectStructure/entityClasses.js | Added PO BOX 835 diagnostic (TO REVERT) |
| scripts/address/addressProcessing.js | Added PO BOX PARSE TRACE diagnostic (TO REVERT) |
| scripts/utils/classSerializationUtils.js | CC-12: 5 CollectiveContactInfo classes in CLASS_REGISTRY |

### Key Discovery

The codebase has two competing deserialization systems. `ContactInfo.deserialize()` routes Address deserialization through a custom `Address.deserialize()` method (aliasClasses.js:2182-2241) instead of the generic `deserializeWithTypes()` fallback. This custom method is the likely cause of Address objects losing parsed field data during save/load round-trips. Session 97 removed 6 custom deserialize methods from AttributedTerm hierarchy but missed Address.deserialize() because it's called through a different code path (Info.deserializeByType in contactInfo.js, not directly by classSerializationUtils.js).

### Next Session

1. Revert 3 diagnostic additions (see table above)
2. Revisit serialization/deserialization philosophy — audit the two competing systems, determine if Address.deserialize() should be removed
3. After serialization is addressed, return to CollectiveContactInfo CC-13/CC-14
4. Then proceed to Section 4 phonebook integration

---

## Session 97 - CollectiveContactInfo Implementation (February 16, 2026)

### Status: IN PROGRESS — Phases 1-2 coded, ready for testing

**Session Goal:** Implement populateFromMembers() rewrites (CC-2 through CC-5), integrate into EntityGroup and build pipeline

### What Was Done

**1. Downstream Impact Verification:**
- Verified bloomerang.js EmailTerm change (Session 96, lines 2293/2352) is safe downstream
- All downstream code uses duck-typing (term property access), never instanceof checks on the term class
- Confirmed entity matching (contactInfoWeightedComparison) uses getEmailString(), never calls compareTo()

**2. Pre-existing Bug Fix — bloomerang.js Data Integrity Check (lines 2998-3005):**
- `inspectProcessedRecords()` had check: `constructor.name === 'AttributedTerm'`
- Was checking the SimpleIdentifiers **wrapper** (always false), not the **term inside**
- Fixed to: `instanceof AttributedTerm` on `.primaryAlias` — matches AttributedTerm and all subclasses
- Diagnostic-only function, no processing impact

**3. populateFromMembers() Rewrites (CC-2 through CC-5):**
- **CC-2 CollectiveMailingAddress**: Full two-tier rewrite — cluster by Address.compareTo() synonym threshold, Aliased.createConsensus() per cluster, largest cluster → preferred
- **CC-3 CollectivePhone**: Full two-tier rewrite — group by phonesAreEquivalent(), 10-digit=primary/7-digit=homonym, frequency ranking with source priority tie-break
- **CC-4 CollectivePOBox**: Fixed `===` to case-insensitive `.toLowerCase()` comparison
- **CC-5 CollectiveEmail**: Full two-tier rewrite — cluster by EmailTerm.compareTo() synonym threshold, Aliased.createConsensus() per cluster, source priority tie-break

**4. Serialization Architecture Discovery — Removed 6 Redundant Methods:**
- EmailTerm.deserialize() crashed on entity load: treated sourceMap as array, but serialization stores as Map
- Root cause investigation revealed: generic fallback in classSerializationUtils.js (Object.create + property copy) handles ALL class deserialization automatically
- Custom deserialize()/fromSerializedData() methods were redundant and bug-prone
- Removed from: AttributedTerm (2 methods), FireNumberTerm, AccountNumberTerm, EmailTerm, Aliases (dead code)
- FireNumberTerm and AccountNumberTerm had same latent array-vs-Map bug
- **USER TESTED OK** — all entity loading works correctly with generic fallback

**5. CC-7 — EntityGroup Constructor Properties:**
- Added four null properties: collectiveMailingAddress, collectivePhone, collectivePOBox, collectiveEmail
- Placed after member collection properties in constructor

**6. CC-8 — buildCollectiveContactInfo() Method:**
- New method on EntityGroup, collects all addresses/phones/POBoxes/emails from member entities
- Creates subclass instances and calls populateFromMembers() for each non-empty collection
- Reuses existing _getMemberEntities(), _collectAddressesFromEntity(), _buildAliasThresholds()

**7. CC-6 Skipped:**
- User agreed unit testing in isolation adds little value; testing via actual build is more meaningful

**8. Manual Testing via UI Button (temporary):**
- Added temporary button "Build Contact Info" — built for 1874 groups
- Verified results: Address with preferred + 2 alternatives, Email with EmailTerm, POBox with preferred
- Phone undefined as expected (no phone data in system yet)
- Button removed after verification

**9. CC-11 — Build Pipeline Integration:**
- Added to entityGroupBuilder.js inside `if (config.buildConsensus)` block (initial placement)
- **Diagnosed null results**: `config.buildConsensus` defaults to `false` (line 48) — entire block skipped
- **Fixed**: Moved CollectiveContactInfo build OUTSIDE the consensus gate — runs independently on every build
- CollectiveContactInfo aggregates raw member data, does NOT depend on consensus entities

### Critical Lesson Learned

**entityGroupBrowser.loadedDatabase** is THE canonical way to access the entity group database in the browser. `window.entityGroupDatabase` is only set during fresh builds (line 165 of entityGroupBuilder.js) and is NOT the variable used by the browser/UI. This was a recurring source of errors during this session.

### Files Changed

| File | Changes |
|------|---------|
| scripts/objectStructure/contactInfo.js | CC-2 through CC-5 populateFromMembers() rewrites |
| scripts/objectStructure/aliasClasses.js | Removed 5 custom serialization methods (AttributedTerm×2, FireNumberTerm, AccountNumberTerm, EmailTerm, Aliases) |
| scripts/objectStructure/entityGroup.js | CC-7: four new constructor properties; CC-8: buildCollectiveContactInfo() method |
| scripts/matching/entityGroupBuilder.js | CC-11: CollectiveContactInfo in pipeline, moved outside consensus gate |
| scripts/bloomerang.js | Fixed data integrity check (instanceof on .primaryAlias) |

### Unresolved at Session End

- **CC-9/CC-10**: Need to verify population for multi-member groups and compare to consensus entity values
- **CC-11 untested**: The buildConsensus:false fix was the last change — needs user to run fresh build and verify
- **CC-12**: CollectiveContactInfo classes not yet registered in CLASS_REGISTRY (needed for save/load)
- **CC-13/CC-14**: Serialization round-trip testing (generic fallback should work, but untested for these new classes)

### Next Session

1. User runs fresh entity group build, verifies CollectiveContactInfo populates (CC-11 test)
2. Register 5 classes in CLASS_REGISTRY (CC-12)
3. Verify serialization round-trip (CC-13/CC-14) — generic fallback expected to work
4. CC-9/CC-10 testing for multi-member groups

---

## Session 95 - CollectiveContactInfo Architecture (February 16, 2026)

### Status: PLANNING COMPLETE — Approved, ready for implementation

**Session Goal:** Architectural alignment on EntityGroups and design of CollectiveContactInfo

### What Was Done

**1. Architectural Alignment Discussion:**
- Reviewed EntityGroups from three perspectives: workflow role, structure, and user goals
- Established that an EntityGroup is a **Contact Unit** — the system's inference about a coherent group of people/properties for communication
- Evaluated four options for EntityGroup's class relationship to Entity:
  1. EntityGroup as child of Entity (rejected — different kinds of things)
  2. Alter Entity to accommodate EntityGroup (rejected — damages working abstraction)
  3. New common parent (rejected — paper-thin shared interface)
  4. **Standalone class with compositional relationship** (chosen — entities are evidence, contact units are inferences)

**2. CollectiveContactInfo Class Design:**
- New class hierarchy replacing the contact-related purpose of the consensus entity
- Parent class CollectiveContactInfo with four subclasses: CollectiveMailingAddress, CollectivePhone, CollectivePOBox, CollectiveEmail
- Each has `preferred` (chosen best) + `alternatives` (other known options) — uses "preferred" not "primary" to avoid naming confusion
- Subclasses override `populateFromMembers()` with type-specific comparison logic
- Adapts existing consensus-building logic from `_buildContactInfoConsensus()` and `_createAliasedConsensus()`

**3. Contact Preference Override System Design:**
- Manual overrides allow users to change the algorithmically-selected preferred contact
- Stability problem: EntityGroup indices are process-fragile (change on rebuild)
- Solution: anchor overrides to stable entity keys (e.g., `visionAppraisal:FireNumber:1510`)
- Override follows its anchor entity to whatever group it ends up in after rebuild
- Storage: Google Drive JSON file (consistent with fire number collision database pattern)

**4. Override UI Requirements Specified:**
- Anchor key selection: user chooses which entity key to anchor override to
- Anchor key awareness: UI shows which keys already used as anchors for this group
- Three key selection options: unused key, reuse existing key, or reassign all existing overrides to new key

**5. Reference Document Created:**
- `reference_collectiveContactInfo.md` v1.0 — full architecture, class design, implementation tasks (CC-1 through CC-21)

### Files Created/Changed

| File | Changes |
|------|---------|
| reference_collectiveContactInfo.md | NEW — CollectiveContactInfo architecture and implementation plan |
| CLAUDE.md | Updated to v190.0 — new prerequisite step before Section 4 |
| reference_sessionHistory_2026_February.md | Added Session 95 log |

### Key Architectural Decisions

- EntityGroup = Contact Unit (standalone class, compositional relationship to Entity)
- CollectiveContactInfo replaces contact-related purpose of consensus entity
- "preferred" not "primary" for naming
- Override anchored to entity keys for rebuild stability
- Consensus entity NOT retired yet — stays in place until CollectiveContactInfo proven stable

### Next Session

Begin implementation: Phase 1 (CC-1 through CC-6) — define CollectiveContactInfo parent class and four subclasses in contactInfo.js

---

## Session 94 - Section 4 Plan Revision (February 3, 2026)

### Status: PLANNING COMPLETE

**Session Goal:** Review and revise Section 4 plan for phonebook integration

### What Was Done

**1. Plan Review Dialog:**
- Original Section 4 focused on StreetName database enrichment (wrong focus)
- User clarified actual goals: match phonebook/email entities to EntityGroups, augment with phone/email data
- Detailed specifications developed through dialog

**2. Key Architectural Decisions:**
- Processing happens AFTER EntityGroup construction, via UI buttons
- Data-driven matching algorithm (adapts to available fields - phonebook has name+address, email has name only)
- Match types: Full (name+address), Name-only, Address-only
- Full matches supersede partial matches
- Multiple matches allowed; code acts on all relevant matches

**3. Phone Number Specifications:**
- Phone numbers use Aliased pattern (primary + candidates)
- New numbers added as candidates
- AggregateHousehold propagation: bidirectional with loop prevention
- Entity type filtering: only assign to entities matching source entity type

**4. reference_phonebookIntegration.md Rewritten (v3.0):**
- Sections 1-6 completely rewritten for new focus
- Section 7 (IndividualName lookup) preserved - USER_VERIFIED_COMPLETE
- 26 implementation tasks across 5 phases (A-E) with integrated incremental testing
- Full specification of match types, priority rules, assignment logic, household propagation

### Files Changed

| File | Changes |
|------|---------|
| reference_phonebookIntegration.md | Complete rewrite to v3.0 - new goal, new tasks, full specifications |
| CLAUDE.md | Updated to v189.0 - reflects revised plan, renamed to "Supplemental Data Integration" |

### Specifications Documented

- Match type definitions (Full, Name-only, Address-only, No match)
- Priority rules (full supersedes partial)
- Phone number Aliased structure and matching rules
- Assignment logic for each match type
- Entity type filtering
- AggregateHousehold bidirectional propagation with loop prevention
- Unmatched entity handling (create new EntityGroup)
- IndividualName database policy (log suggestions only, no modifications)

### Next Session

Begin Section 4 Phase A - Foundation (tasks 4.1-4.4):
- 4.1: Analyze phonebook data structure
- 4.2: Design matching algorithm
- 4.3: Design phone number Aliased structure
- 4.4: Test phone Aliased structure

---

## Session 93 - Collections Report + Delete Button (February 3, 2026)

### Status: USER_VERIFIED_COMPLETE

**Session Goal:** Add Collections Report CSV and Delete button for IndividualName Browser

### What Was Done

**1. Collections Report CSV Feature:**
- Created new CSV report that shows EntityGroup collection contents
- Button added to CSV Reports panel (purple "Collections Report" button)
- Auto-loads unified database and EntityGroup database if not already loaded
- Headers: GroupIndex, RowType, RowNum, Name, NameKey, UnrecogName, FireNum, Street, City, State, Zip, UnrecogBIAddr, OffIslandAddr, POBox
- Each multi-member group: 1 consensus row + N collection rows
- Reuses consensus columns for collection data where similar (Name for individualNames, address columns for blockIslandAddresses)

**2. Business Terms Update:**
- Added LLP to BusinessTermsMaster - Nonnames.csv (was missing, only LLC was present)

**3. Bypass Check Fix:**
- Fixed lookupExisting() in individualNameDatabase.js
- Problem: Database loaded check happened BEFORE bypass check, causing error even when bypass was ON
- Fix: Moved bypass check FIRST - if bypassing, return null immediately without checking database

**4. Delete Selected Button for IndividualName Browser:**
- Added "Delete Selected" button to Selected Name Details panel
- Button only enabled when:
  - Browser loaded from DEV bulk (not original)
  - An item is currently selected
- Shows confirmation dialog with item details (name, key, alias count, file ID)
- On confirm: moves file to Deleted folder, removes from in-memory database, refreshes display

### Files Changed

| File | Changes |
|------|---------|
| scripts/export/csvReports.js | Added Collections Report functions (lines 2878-3190) |
| index.html | Added Collections Report button, Delete Selected button |
| scripts/individualNameBrowser.js | Added delete functionality (updateDeleteButtonState, handleDeleteSelectedIndividualName, showDeleteConfirmationDialog) |
| scripts/databases/individualNameDatabase.js | Fixed bypass check order in lookupExisting() |
| servers/Results/BusinessTermsMaster - Nonnames.csv | Added LLP |
| reference_entityGroupCollections.md | Updated status to USER_VERIFIED_COMPLETE |

### Code Locations

- Collections Report: `scripts/export/csvReports.js` lines 2878-3190
- Delete Button: `scripts/individualNameBrowser.js` lines 3611-3770
- Bypass Fix: `scripts/databases/individualNameDatabase.js` lookupExisting() method

### Next Session

Begin Section 4 (Phonebook/Street Integration) from reference_phonebookIntegration.md

---

## Session 102 — February 17, 2026

### Focus: CollectiveContactInfo Phases 4-5 (Override Infrastructure/UI)

### Summary

Implemented the full contact preference override system — database layer, UI browser, build pipeline integration, and save workflow. Iterative testing with user led to several UX refinements.

### Key Decisions

1. **Override UI in Database Maintenance box** — two-panel layout (left: search/results, right: group details/override creation) with indigo (#3949ab) accent color
2. **Anchor key presentation** — radio button list with abbreviated keys (VA:1510, BL:12345), entity names, and ★ in-use badges
3. **Confirm Override / Save workflow** — "Confirm Override" applies in memory only; popup asks "save now or continue"; "Save All Changes" panel appears for deferred saves
4. **Override DB auto-load** — triggered by EntityGroup load/build in entityGroupBrowser.js (not at page init, avoiding gapi timing issues)
5. **applyOverride saves algorithmic state** — `_algorithmicPreferred` and `_algorithmicAlternatives` saved before override; `clearOverride()` restores from saved state (avoids re-running `populateFromMembers()` which requires thresholds)

### Bugs Found & Fixed

- **clearOverride() crash**: `CollectiveMailingAddress.populateFromMembers()` requires thresholds but `clearOverride()` called it with null. Fixed by saving/restoring algorithmic state instead.
- **Override not persisting after reload**: Save only saved override DB, not EntityGroup DB. Fixed `saveOverrideBrowserDatabase()` to save both.
- **gapi timing on auto-load**: Auto-loading override DB at DOMContentLoaded fired before Google API initialized. Fixed by moving load trigger to EntityGroup load/build completion.
- **UX: File ID box and Load button confusing**: Removed both; override DB loads automatically when needed.

### Files Created

| File | Purpose |
|------|---------|
| scripts/contactPreferenceOverrideManager.js | Database CRUD layer for override records (Google Drive JSON) |
| scripts/contactPreferenceOverrideBrowser.js | UI browser with search, display, override creation, save workflow |

### Files Modified

| File | Changes |
|------|---------|
| index.html | Added override browser HTML section in Database Maintenance box; added script tags and init call |
| scripts/objectStructure/entityGroup.js | Added `_applyContactPreferenceOverrides()` method in `buildCollectiveContactInfo()` |
| scripts/objectStructure/contactInfo.js | Fixed `applyOverride()` to save algorithmic state; fixed `clearOverride()` to restore from saved state |
| scripts/entityGroupBrowser.js | Added `loadOverrideBrowserDatabase()` hooks after EntityGroup load and build |
| reference_collectiveContactInfo.md | Updated to v4.0 — Phases 4-5 coded and tested |

### Code Locations

- Override manager: `scripts/contactPreferenceOverrideManager.js`
- Override browser: `scripts/contactPreferenceOverrideBrowser.js`
- Build pipeline integration: `scripts/objectStructure/entityGroup.js` `_applyContactPreferenceOverrides()`
- applyOverride/clearOverride fix: `scripts/objectStructure/contactInfo.js`
- Auto-load hooks: `scripts/entityGroupBrowser.js` lines ~356 and ~531

### Next Session

Begin Task 3 Section 4 (Phonebook/Email Integration) from reference_phonebookIntegration.md

---
