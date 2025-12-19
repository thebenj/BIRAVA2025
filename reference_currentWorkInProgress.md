# Current Work In Progress - Nested Project Layers

**Created**: December 7, 2025
**Last Updated**: December 18, 2025
**Purpose**: Track the layered/nested projects currently in progress to prevent context loss during AI session transitions

---

## Active Project Stack (Outermost to Innermost)

```
LAYER 1: EntityGroup Database (Step 4 of Roadmap)
    Status: USER_VERIFIED_WORKING (browser + persistence)
    Files: scripts/objectStructure/entityGroup.js, scripts/matching/entityGroupBuilder.js
    Browser: scripts/entityGroupBrowser.js
    Reference: reference_projectRoadmap.md Section 4
         |
         v
LAYER 2: Analyze Matches UI (6-feature enhancement)
    Status: USER_VERIFIED_WORKING
    Reference: reference_analyzeMatchesUI.md
         |
         v
LAYER 3: Reconcile Button Feature
    Status: USER_VERIFIED_WORKING
    Reference: reference_reconcileFeatureSpec.md
         |
         v
LAYER 4: Entity Key Uniqueness Fix
    Status: USER_VERIFIED_WORKING
    Reference: reference_entityKeyUniqueness.md
         |
         v
LAYER 5: Detailed compareTo Parameter Flow
    Status: USER_VERIFIED_WORKING (Step 6 CSS minor)
    Reference: reference_compareToDirectImplementationPlan.md
         |
         v
LAYER 6: compareTo Architecture (4 phases)
    Status: USER_VERIFIED_WORKING
    Reference: reference_compareToDirectImplementationPlan.md
         |
         v
LAYER 7: Fire Number Collision Handler
    Status: USER_VERIFIED_WORKING (ENABLED)
    Reference: reference_fireNumberCollisionPlan.md
```

---

## Current Status Summary

**ALL FOUNDATIONAL LAYERS: USER_VERIFIED_WORKING**

### EntityGroup System (Layer 1)

#### Core Implementation - USER_VERIFIED_WORKING
| Metric | Value |
|--------|-------|
| Total Groups | 2291 |
| Multi-member Groups | 785 |
| Single-member Groups | 1506 |
| Prospects | 1316 |
| Existing Donors | 975 |
| Entities Assigned | 4097 |
| Near Misses | 202 |

#### Browser Tool - USER_VERIFIED_WORKING
File: `scripts/entityGroupBrowser.js`

Features:
- Load EntityGroup database from Google Drive
- Build New button (constructs from loaded entities, auto-saves to Google Drive)
- Filter (all, multi-member, single-member, prospects, donors, near misses)
- Sort (index, member count, name)
- Search (name, address, member keys)
- View Group Details modal with View Details buttons for all entities
- Group Stats modal
- Export to CSV
- File ID persistence in localStorage

#### Persistence - USER_VERIFIED_WORKING
- Reference file companion (lightweight group membership lookup)
- Two input boxes: Database File ID, Reference File ID
- "Save to File IDs" button
- "Save as New Files" button
- buildEntityGroupDatabase() auto-saves both files to NEW locations

#### Pending Features
- CSV output enhancement (more detailed format)
- Alias consensus integration testing

---

## Same-Location Entity Comparison (Dec 17-18, 2025)

**Purpose**: Prevent inflated contactInfo similarity for entities at same physical location.

**Trigger Condition**: Two Block Island entities with suffixed fire numbers sharing same base (e.g., 72J vs 72W).

**Behavior**: When detected, uses `compareSecondaryAddressesOnly()` instead of full contactInfo comparison.

**Status**: FIX_IMPLEMENTED_READY_FOR_VERIFICATION (Dec 18, 2025)

### Dec 17 - Initial Implementation
**Files Affected**:
- `scripts/utils.js` - Detection functions and entityWeightedComparison modification
- `scripts/matching/universalEntityMatcher.js` - compareIndividualToEntityDirect modification

### Dec 18 - universalCompareTo Fix (Session 3)
**Problem Discovered**: Household comparison functions lost fire number context when iterating over embedded individuals.

**Root Cause**: `universalCompareTo()` routed to specialized functions (compareHouseholdToHousehold, etc.) which compared embedded individuals that lacked fire numbers.

**Fix Implemented**: Added same-location check at TOP of `universalCompareTo()` BEFORE routing:
- Added `extractNameFromEntity()` helper (lines 268-277)
- Added `extractContactInfoFromEntity()` helper (lines 284-293)
- Added `compareSameLocationEntities()` function (lines 303-366)
- Modified `universalCompareTo()` to check same-location FIRST (lines 378-400)

**Test Results**: Sampled database build showed 0 problem groups for fire# 72 entities.

**Reference**: reference_sameLocationFix.md for full specification

---

## Completed Foundational Work

### Keyed Database Migration - USER_VERIFIED_WORKING
- All 6 migration phases complete
- Reference: reference_keyedDatabaseMigration.md

### Key Preservation - USER_VERIFIED_WORKING
- Database keys flow through entire system
- Reference: reference_keyPreservationPlan.md

### Comparison Architecture - USER_VERIFIED_WORKING
- All 4 phases of compareTo architecture working
- Detailed parameter flow working
- Reference: reference_compareToDirectImplementationPlan.md

---

## Match Configuration (Current)

```yaml
percentileThreshold: 98
minimumGroupSize: 10
minimumScoreDefault: 0.31
nameScoreOverride: 0.985
individualToIndividual_minimumCutoff: 0.75

selection_rule: "98th percentile OR top 10; include all 100% matches beyond that count"
```

---

## Critical Lessons

1. **Template Literals**: Do NOT use ${...} interpolations inside `<script>` blocks
2. **Key Changes**: When adding new key components, ADD to existing format, do NOT replace
3. **Fire Number Collision**: Must use secondary addresses only (same primary address)
4. **Same-Location Entities**: Entities with same-base fire numbers need special comparison
5. **OAuth Token Expiration**: Long operations must save promptly (tokens expire after 1 hour)
6. **Code Path Verification**: Use diagnostic console.logs before making changes
7. **Multiple Comparison Entry Points**: Changes may be needed in both `entityWeightedComparison` and `compareIndividualToEntityDirect`

---

**Document Version**: 4.0
**Last Updated**: December 18, 2025
