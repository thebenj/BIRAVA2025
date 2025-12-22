# Session History Reference

**Purpose**: Archive of completed session work. Consult when checking what was already tried/fixed.
**Last Updated**: December 22, 2025

---

## December 22, 2025 - Session 14: Household Cross-Reference Keys + Step 9

### Household Cross-Reference Keys Implementation
**Status**: CODED_NOT_TESTED

**Purpose**: Enable automatic inclusion of household members when any member joins an EntityGroup.

**New Properties Added to HouseholdInformation** (scripts/objectStructure/householdInformation.js):
- `parentKey`: Database key of the household entity this individual belongs to
- `siblingKeys`: Array of database keys for other individuals in the same household
- `entityGroupIndex`: Index of the EntityGroup (placeholder for future use)

**Bloomerang parentKey/siblingKeys Implementation**:
- Location: scripts/unifiedDatabasePersistence.js (buildUnifiedEntityDatabase)
- Approach: Second-pass after all entities are added - uses actual database keys
- Avoids duplicate key generation issue discovered during testing

**FAILED APPROACH** (documented for reference):
- Original code in bloomerang.js used `generateEntityKey()` which produces keys like `uuid_xxxx` or `account_xxxx`
- But actual database keys use `generateUnifiedEntityKey()` format: `bloomerang:2029AH:FireNumber:3499:na`
- Keys didn't match, so Step 9 found 0 entities to pull

**VisionAppraisal parentKey Implementation**:
- Status: USER_VERIFIED_WORKING
- Location: scripts/unifiedDatabasePersistence.js (lines 163-173)
- VA individuals are embedded in households, only parentKey is useful (no siblingKeys)

### Step 9 Household Pulling
**Status**: CODED_NOT_TESTED

**New Function** `collectHouseholdRelatedKeys()` (entityGroupBuilder.js lines 732-840):
- Collects parent households and siblings for all group members
- Only pulls entities that exist and are not already assigned

**Modified Function** `buildGroupForFounder()`:
- Now returns `householdPulled` array in addition to existing arrays
- Both code paths (with/without overrides) run Step 9

**Phase Order Change**:
- Phase 1 changed from Bloomerang Households to VisionAppraisal Households
- Phase 2 changed from VisionAppraisal Households to Bloomerang Households

---

## December 21, 2025 - Sessions 12-13

### Session 13: Assessment Value Report Enhancements
**Status**: CODED_NOT_TESTED

**Subdivision Values Fix**:
- Problem: Fire number collision entities merged into otherInfo.subdivision had assessment values not counted
- Fix: generateAssessmentValueReport() now iterates through subdivision entries

**Checksum Verification**:
- New functions: calculateRawAssessmentChecksum(), verifyAssessmentChecksum()
- UI button: "✓ Verify Checksum" added next to Assessment Value Report button
- Location: scripts/entityGroupBrowser.js (lines 2332-2481)

**One-to-Many Exclusion Expansion**:
- Status: USER_VERIFIED_WORKING
- Purpose: Single row can exclude one key from multiple others
- Format: `RuleID | Key1 | keyA::^::keyB::^::keyC | OnConflict | Reason | Status`
- Location: scripts/matching/matchOverrideManager.js

### Session 12: MUTUAL Rows Feature + Lightweight Exporter v2.0

**MUTUAL Rows Feature**:
- Status: USER_VERIFIED_WORKING
- Purpose: Specify sets of mutually related keys in single spreadsheet row
- Format: `RuleID | MUTUAL | key1::^::key2::^::key3 | (ignored) | (ignored) | Status`
- Data structures: mutualExclusionSets, mutualInclusionSets with index maps

**Lightweight Exporter v2.0**:
- Status: USER_VERIFIED_WORKING
- Complete rewrite with generic property iteration
- Exports foundingMember + members array + consensusEntity per group
- Self-contained output (no external lookups needed)
- File: scripts/export/lightweightExporter.js

---

## December 20, 2025 - Sessions 10-11

### Session 10: CSV Currency Parsing Fix + Production Process
**CSV Currency Parsing**:
- Status: USER_VERIFIED_WORKING
- Problem: "$454,500" truncated because naive split(',') broke on currency commas
- Fix: Added parseCSVWithCurrencyValues() in visionAppraisal.js

**OtherInfo Display Issue**:
- Status: USER_VERIFIED_WORKING
- Root cause: Wrong file ID in input field loading stale database
- Lesson: Verify correct file is being loaded when data appears missing

**Production Process Documentation**:
- Created reference_productionProcess.md with complete 8-step rebuild process

### Session 11: Original Lightweight Exporter
- Status: SUPERSEDED_BY_V2
- Had hardcoded property catalogs and only exported consensusEntity

---

## December 19, 2025 - Sessions 8-9

### Session 9: Founder Exclusion Bug Fix
**Status**: CODED_NOT_TESTED

**Problem**: Exclusions with founder were not enforced because founder is not in naturalMatches array.

**Solution**: Added new algorithm steps:
- Step 0: Remove natural matches excluded with founder
- Step 3.5: Check founder-forced for contradictions
- Step 7.5: Check forcedFromNaturals for exclusions with founder

**New Helper Methods** (matchOverrideManager.js):
- removeExcludedWithFounder(entities, founderKey)
- removeExcludedKeysWithFounder(keys, founderKey)
- removeContradictoryFounderForced(keys, founderKey)

### Session 8: Match Override System Phases B-E
**Status**: ALL_PHASES_USER_VERIFIED_WORKING

**Phase B (Exclusions)**:
- Test: Loaded FE-TEST-001 between two entities
- Evidence: Console log showed exclusion applied, group counts changed

**Phase C (Force-Matches)**:
- Test: Force-matched two singleton entities
- Evidence: Both ended up in same group

**Phase D (Google Sheets)**:
- Loaded 3 FORCE_MATCH and 2 FORCE_EXCLUDE rules from sheets
- Sheet IDs documented in TERMINOLOGY section

**Phase E (UI Integration)**:
- Added checkbox "Load override rules" next to Build New button

---

## December 18, 2025 - Sessions 2-6

### Session 6: Phase A Implementation
**Status**: USER_VERIFIED_WORKING

**Created**: scripts/matching/matchOverrideManager.js
- ForceMatchRule class with validate(), involvesKey(), getPartnerKey()
- ForceExcludeRule class with validate(), matchesPair(), determineLoser()
- MatchOverrideManager class with 8-step algorithm helper methods

**Test Results**: All 24 tests passed in browser console

### Session 5: Match Override System Design
**Status**: DESIGN_AGREED

**Deliverables**:
- reference_matchOverrideSystem.md: Complete design specification
- reference_matchOverrideImplementationPlan.md: 5-phase implementation plan

**Key Decisions**:
- FORCE_MATCH: Anchor/dependent model with phase-based anchor determination
- FORCE_EXCLUDE: Defective/other model with OnConflict options
- Founding member exception: Cannot yield if founding member

### Session 4: Name Comparison Rule
**Status**: USER_VERIFIED_WORKING

**Rule**: When comparing IndividualNames with 2 of 3 fields but missing DIFFERENT fields, do not normalize weights.
**Location**: scripts/utils.js defaultWeightedComparison() (lines 623-651)

**Diagnostic Cleanup**: Removed debug logs from universalEntityMatcher.js, entityGroupBuilder.js, unifiedEntityBrowser.js

### Session 3: Same-Location Entity Grouping Fix
**Status**: USER_VERIFIED_WORKING

**Problem**: VisionAppraisal entities at same location (72A, 72B, 72C) incorrectly grouped together.

**Fix** (scripts/matching/universalEntityMatcher.js):
- Added extractNameFromEntity() helper
- Added extractContactInfoFromEntity() helper
- Added compareSameLocationEntities() function
- Modified universalCompareTo() to check same-location FIRST

**Reference**: reference_sameLocationFix.md

### Session 2: Utils Syntax Fix + Alternatives Deduplication
- Fixed utils.js syntax error (nested block comment with JSDoc)
- Added Alternatives.deduplicate() method in aliasClasses.js
- Added ROOT_CAUSE_DEBUGGING_RULE to CLAUDE.md

### Session 1: Deep Consensus Building
- Implemented deep consensus building for EntityGroup consensus entities
- Removed minimum threshold for candidate category
- Full database test passed (The Nature Conservancy 116 members)

---

## December 17, 2025 - ContactInfo Fixes

### ContactInfo Secondary Address Comparison Issue
**Status**: USER_VERIFIED_RESOLVED

**Problem**: Identical secondary addresses returned only 0.5 similarity due to address pool exclusion.

**Root Cause**: findBestAddressMatch() "claimed" addresses, excluding them from secondary comparison pool.

**Fixes Applied**:
- Threshold-based secondary address exclusion
- Dynamic weighting logic
- Phase order swap (VisionAppraisal Individuals before Bloomerang)

### Same-Location Entity Comparison (Initial)
**Problem**: Entities with suffixed fire numbers (72J vs 72W) got inflated similarity.

**Solution**: Use secondary addresses only when entities have same-base fire numbers.

**Files Modified**:
- scripts/utils.js: Detection and comparison functions
- scripts/matching/universalEntityMatcher.js: Added same-location check

---

## December 16, 2025 - EntityGroup Browser and Persistence

### Part 4: EntityGroup Persistence
- buildEntityGroupReferenceFile() creates lightweight companion file
- saveEntityGroupDatabaseToNewFile() and saveEntityGroupReferenceToNewFile()
- Bug Fix: "TypeError: groupDb.groups is not iterable" - use Object.values()

### Part 3: Browser View Details Enhancement
- Added View Details buttons for founding member, members, near misses
- Fixed search crash when address was object instead of string

### Part 2: Alias Consensus Integration
- Aliased.createConsensus() static factory
- Aliased.mergeAlternatives() instance method

### Part 1: EntityGroup Implementation
- Created scripts/objectStructure/entityGroup.js
- Created scripts/matching/entityGroupBuilder.js
- Full database test: 2291 groups, 785 multi-member, 4097 entities assigned

---

## December 15, 2025 - Key Preservation Fix

**Problem**: "Error - Base entity not found. Key - PID:203" when clicking Reconcile

**Root Cause**: Code regenerated entity keys from properties instead of using actual database keys.

**Solution**: Database keys now preserved through entire flow:
- findBestMatches() uses getAllEntitiesWithKeys()
- Match objects include targetDatabaseKey
- doReconcile() accepts and uses database keys for direct lookup

**Key Principle**: Database keys generated ONLY during database building. Once loaded, keys travel with entities through all flows.

---

## December 14-15, 2025 - Keyed Database Migration

### All 6 Migration Phases Complete
| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Remove competing getAllSelectedEntities() | COMPLETE |
| 2 | Remove legacy fallbacks from browser | COMPLETE |
| 3 | Remove legacy fallback from matcher | COMPLETE |
| 4 | Migrate entityRenderer.js | COMPLETE |
| 5 | Migrate loadAllEntitiesButton.js | COMPLETE |
| 6 | Wire load flow to auto-build | COMPLETE |

---

## December 14, 2025 - NonHumanName and Email Matching

- Created NonHumanName class for Business/LegalConstruct entities
- Email matching: Split local part (0.8, fuzzy) + domain (0.2, exact)

---

## December 8, 2025 - Fire Number Collision Handler

**Location**: scripts/dataSources/fireNumberCollisionHandler.js

**Stats**: Merged same owner: 8, Suffixed different owner: 59, Unique output: 2309

**Key Decision**: Must use NAME ONLY + SECONDARY ADDRESS ONLY comparison (same primary address).

---

## Earlier Sessions Summary

| Date | Feature | Status |
|------|---------|--------|
| Dec 7 | Entity key uniqueness fix | USER_VERIFIED_WORKING |
| Dec 6 | View button entity lookup | RESOLVED |
| Dec 5 | Cross-type name comparison | RESOLVED |
| Dec 3 | HouseholdInformation | USER_VERIFIED_WORKING |
| Dec 1 | All 4 phases compareTo | ALL_TESTED_WORKING |
| Nov 30 | Serialization architecture | RESOLVED |

---

## Critical Lessons Archive

1. **Template Literals**: Do NOT use ${...} interpolations inside `<script>` blocks
2. **Key Changes**: When adding new key components, ADD to existing format, do NOT replace elements
3. **Source Identification**: Use sourceMap-based test, NOT accountNumber property
4. **Fire Number Collision**: Cannot use full universalCompareTo - must use secondary addresses only
5. **OAuth Token Expiration**: Google OAuth tokens expire after 1 hour - long operations must save promptly
6. **Function Return Values**: Always assign return values (e.g., buildUnifiedEntityDatabase())
7. **Code Path Verification**: Use diagnostic console.logs to verify which code path is being executed before making changes
8. **Multiple Comparison Entry Points**: `entityWeightedComparison` and `compareIndividualToEntityDirect` are both active
9. **Address Pool Exclusion**: contactInfoWeightedComparison excludes addresses from secondary pool after claimed
10. **Type Checking for LocationIdentifier**: extractFireNumberFromEntity() must verify constructor.name === 'FireNumber'
11. **Database Key Generation**: NEVER generate keys twice - set cross-references after database is built using actual existing keys
12. **Saved vs Memory**: Always rebuild EntityGroup database to test code changes; loaded files reflect OLD code
