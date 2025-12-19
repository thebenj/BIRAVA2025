# Session History Reference

**Purpose**: Archive of completed session work. Consult when checking what was already tried/fixed.
**Last Updated**: December 18, 2025

---

## December 18, 2025 - Same-Location Fix in universalCompareTo (Session 3)

### Same-Location Grouping Bug FIX
**Status**: IMPLEMENTED_READY_FOR_VERIFICATION

**Problem Discovered**: VisionAppraisal entities at same physical location (72A, 72B, 72C at 72 West Side Road) were incorrectly grouped together in EntityGroups. Example: EntityGroup #677 had 14 VA entities at fire# 72 with different suffixes.

**Root Cause Identified**: `universalCompareTo()` routed to specialized comparison functions (compareHouseholdToHousehold, compareIndividualToHousehold, etc.) which iterated over embedded individuals. These embedded individuals lacked fire numbers, so `areSameLocationEntities()` returned false.

**Fix Implemented** (scripts/matching/universalEntityMatcher.js):
- Added `extractNameFromEntity()` helper (lines 268-277)
- Added `extractContactInfoFromEntity()` helper (lines 284-293)
- Added `compareSameLocationEntities()` function (lines 303-366)
- Modified `universalCompareTo()` to check same-location FIRST, BEFORE routing (lines 378-400)

**Key Insight**: Fire number context must be captured at the TOP of `universalCompareTo()` before it's lost in routing to specialized functions.

**Test Results** (Sampled Database Build ~1500 entities):
- Fire# 72 groups found: 13
- Problem groups (multiple different suffixed VA fire#s): 0
- Output: "✓ SUCCESS: No VisionAppraisal same-location grouping bugs detected!"

**Next Step**: Run full database build for final verification, then proceed to CSV export.

**Reference**: reference_sameLocationFix.md

---

## December 17, 2025 - Bug Fixes, Same-Location Comparison, and ContactInfo Investigation

### ContactInfo Secondary Address Comparison Issue (USER_VERIFIED_RESOLVED)
**Test Case**: `visionAppraisal:PID:364` vs `visionAppraisal:PID:363`
- Both entities share IDENTICAL secondary addresses (PO BOX 5, Block Island, RI, 02807)
- But contactInfo.compareTo() returns only 0.5 similarity

**Root Cause Identified**:
The `findBestAddressMatch()` function matched ci1's primary ("MITCHELL") against ci2's secondary ("PO BOX 5") with score 0.5. This "claimed" ci2's PO BOX 5, excluding it from the secondary comparison pool. Since ci2 only had one secondary, `otherSecondaries` became empty, so the identical secondary addresses were never compared.

**Code Path Traced**:
```
universalCompareTo(e1, e2)
  → compareIndividualToEntityDirect() [universalEntityMatcher.js]
    → individual.contactInfo.compareTo(entity.contactInfo)
      → contactInfoWeightedComparison() [utils.js]
        → findBestAddressMatch() [claims ci2's secondary as "primary best match"]
        → Secondary comparison skipped (otherSecondaries empty)
```

**Fix Required**: One of four options documented in `reference_contactInfoComparisonIssue.md`:
- Option A: Compare secondary-to-secondary FIRST
- Option B: Don't exclude from secondary pool if match was cross-category
- Option C: Score primary and secondary independently
- Option D: Allow address reuse with diminished weight

**Related Fix Applied**: Fixed `extractFireNumberFromEntity()` to check `constructor.name === 'FireNumber'` - was returning PID values for PID-keyed entities.

**Reference**: `reference_contactInfoComparisonIssue.md` (comprehensive documentation)

---

### Same-Location Entity Comparison (NEW FEATURE)
**Problem**: Entities with suffixed fire numbers (e.g., 72J vs 72W) were getting inflated contactInfo similarity (~87%) because they share the same Block Island primary address.

**Root Cause**: Different owners at the same physical location have identical primary addresses. Comparing primary addresses adds no useful signal.

**Solution**: When two entities have fire numbers with the same base but different suffixes, use secondary addresses only for contactInfo comparison.

**Files Modified**:
- `scripts/utils.js`:
  - Added `extractFireNumberFromEntity()` - Gets fire number from entity
  - Added `hasFireNumberSuffix()` - Detects suffix (e.g., "72J" → true)
  - Added `getBaseFireNumber()` - Strips suffix (e.g., "72J" → "72")
  - Added `areSameLocationEntities()` - Returns true for same-base, different-suffix fire numbers
  - Added `compareSecondaryAddressesOnly()` - Compares only secondary addresses
  - Modified `entityWeightedComparison()` - Uses secondary-only when same location detected
- `scripts/matching/universalEntityMatcher.js`:
  - Modified `compareIndividualToEntityDirect()` - Added same-location check before contactInfo comparison

**Lesson Learned**: When debugging comparison issues, use diagnostic console.logs to verify which code path is actually being executed before making changes.

### Bug Fixes (Earlier in Session)
| Bug | Root Cause | Fix |
|-----|-----------|-----|
| OAuth token expiration | Build New didn't auto-save, tokens expired after 1 hour | Changed saveToGoogleDrive to true in entityGroupBrowser.js |
| PO Box vs street address matching 100% | Both store unit numbers in secUnitNum field | Added check in addressWeightedComparison - if one is PO Box and one isn't, compare only city/state/zip |
| Fire numbers 72J vs 72W getting 67% match | Fire numbers compared via Levenshtein | Added getExactStreetNumberMatch() - returns 1 for exact, 0 otherwise |
| unifiedEntityDatabase was null | buildUnifiedEntityDatabase() return value was discarded | Assigned return value to window.unifiedEntityDatabase |
| Reconcile modal View Details failed | Used legacy key lookup instead of database keys | Rewrote to use database key lookup |

### Debug Cleanup
- Removed 7 DEBUG console.log statements from workingEntityLoader.js
- Removed TESTING NOTE console.log from loadAllEntitiesButton.js
- Removed duplicate logging from loadAllEntitiesButton.js (caller logged same message as callee)

---

## December 16, 2025 - EntityGroup Browser and Persistence

### Part 4: EntityGroup Persistence with Reference Files
**Files Modified**: entityGroupBuilder.js, entityGroupBrowser.js, index.html

**New Functions**:
- `buildEntityGroupReferenceFile(groupDb)` - Creates lightweight companion file
- `saveEntityGroupDatabaseToNewFile()` - Creates new database file on Drive
- `saveEntityGroupReferenceToNewFile()` - Creates new reference file on Drive
- `saveEntityGroupDatabaseAndReference()` - Updates both existing files
- `saveEntityGroupDatabaseAndReferenceToNewFiles()` - Creates both new files

**UI Changes**:
- Added Reference File ID input box
- Added "Save to File IDs" button
- Added "Save as New Files" button

**Bug Fix**: "TypeError: groupDb.groups is not iterable" - EntityGroupDatabase stores groups as OBJECT not array, use Object.values()

**Test Results** (sampleSize: 800):
- Database file: 1.88 MB, Reference file: 37.8 KB
- Groups built: 645, Entities assigned: 801

### Part 3: EntityGroup Browser View Details Enhancement
- Added View Details button for founding member (Entity Browser style)
- Added View Details buttons for each group member (Entity Browser style)
- Added View buttons for each near miss (Entity Browser style)
- Added View Details (Drill-Down) button for consensus entity (basicEntityDetailsView)
- Fixed search crash when address was object instead of string

### Part 2: Alias Consensus Integration
**Files Modified**: aliasClasses.js, entityGroup.js

**New Methods in Aliased class**:
- `Aliased.createConsensus()` - Static factory for consensus Aliased objects
- `Aliased.mergeAlternatives()` - Instance method to merge alternatives
- `Aliased._mergeSourceAlternatives()` - Private helper

**Threshold Mapping**: Uses MATCH_CRITERIA from unifiedEntityBrowser.js

### Part 1: EntityGroup Implementation
**Files Created**:
- `scripts/objectStructure/entityGroup.js` - EntityGroup and EntityGroupDatabase classes
- `scripts/matching/entityGroupBuilder.js` - 5-phase construction algorithm

**Test Results** (full database):
| Metric | Value |
|--------|-------|
| Total Groups | 2291 |
| Multi-member Groups | 785 |
| Single-member Groups | 1506 |
| Prospects | 1316 |
| Existing Donors | 975 |
| Entities Assigned | 4097 |
| Near Misses | 202 |

---

## December 15, 2025 - Key Preservation Fix

### Problem
"Error - Base entity not found. Key - PID:203" when clicking Reconcile

### Root Cause
Code regenerated entity keys from properties instead of using actual database keys. Entities stored by FireNumber (visionAppraisal:FireNumber:1510) but Reconcile code reconstructed key using PID.

### Solution
Database keys now preserved through entire flow:
- `findBestMatches()` uses `getAllEntitiesWithKeys()` to get [key, entity] pairs
- Match objects include `targetDatabaseKey`
- `doReconcile()` and `reconcileMatch()` accept and use database keys for direct lookup
- Self-comparison uses database key comparison (not regenerated keys)

### Key Principle
Database keys generated ONLY during database building. Once loaded, keys travel with entities through all flows. `getEntityKeyInfo()` used ONLY for display, not lookup.

---

## December 14-15, 2025 - Keyed Database Migration

### Migration Phases (ALL COMPLETE)
| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Remove competing getAllSelectedEntities() from persistence module | COMPLETE |
| 2 | Remove legacy fallbacks from unifiedEntityBrowser.js | COMPLETE |
| 3 | Remove legacy fallback from universalEntityMatcher.js | COMPLETE |
| 4 | Migrate entityRenderer.js to use Keyed Database | COMPLETE |
| 5 | Migrate loadAllEntitiesButton.js | COMPLETE |
| 6 | Wire load flow to auto-build Keyed Database | COMPLETE |

**Reference**: reference_keyedDatabaseMigration.md, reference_keyPreservationPlan.md

---

## December 14, 2025 - NonHumanName and Email Matching

### NonHumanName Implementation
- Created NonHumanName class for Business/LegalConstruct entity names
- Handles entities without individual name structure

### Email Matching Improvement
- Split local part (0.8 weight, fuzzy Levenshtein) + domain (0.2 weight, exact match)
- Addresses issue where similar emails with different domains scored too high

---

## December 8, 2025 - Fire Number Collision Handler

### Implementation
Located in: `scripts/dataSources/fireNumberCollisionHandler.js`

### Stats
- Merged same owner: 8
- Suffixed different owner: 59
- Unique entities in output: 2309

### Key Design Decision
Cannot use full universalCompareTo - entities have same primary address. Must use NAME ONLY + SECONDARY ADDRESS ONLY comparison.

---

## Earlier Sessions (Summary)

| Date | Feature | Status |
|------|---------|--------|
| Dec 7 | Entity key uniqueness fix | USER_VERIFIED_WORKING |
| Dec 6 | View button entity lookup (storage key architecture) | RESOLVED |
| Dec 5 | Cross-type name comparison | RESOLVED |
| Dec 3 | HouseholdInformation | USER_VERIFIED_WORKING |
| Dec 1 | All 4 phases compareTo | ALL_TESTED_WORKING |
| Nov 30 | Serialization architecture | RESOLVED |
| Nov 30 | Empty name records | RESOLVED |

---

## Critical Lessons Archive

1. **Template Literals**: Do NOT use ${...} interpolations inside `<script>` blocks
2. **Key Changes**: When adding new key components, ADD to existing format, do NOT replace elements
3. **Source Identification**: Use sourceMap-based test, NOT accountNumber property
4. **Fire Number Collision**: Cannot use full universalCompareTo - must use secondary addresses only
5. **OAuth Token Expiration**: Google OAuth tokens expire after 1 hour - long operations must save promptly
6. **Function Return Values**: Always assign return values (e.g., buildUnifiedEntityDatabase())
7. **Code Path Verification**: Use diagnostic console.logs to verify which code path is being executed before making changes
8. **Multiple Comparison Entry Points**: `entityWeightedComparison` and `compareIndividualToEntityDirect` are both active - changes may need to be made in both places
9. **Address Pool Exclusion**: `contactInfoWeightedComparison` excludes addresses from secondary pool after they're "claimed" by primary matching - can cause identical secondaries to never be compared
10. **Type Checking for LocationIdentifier**: `extractFireNumberFromEntity()` must verify `constructor.name === 'FireNumber'` before returning value - PID-keyed entities would otherwise return PID as fire number
