# Current Work In Progress - Nested Project Layers

**Created**: December 7, 2025
**Last Updated**: December 7, 2025 (status correction)
**Purpose**: Track the layered/nested projects currently in progress to prevent context loss during AI session transitions

---

## Active Project Stack (Outermost to Innermost)

```
LAYER 1: Analyze Matches UI (6-feature enhancement)
    Status: CODED_READY_FOR_TESTING
    Reference: reference_analyzeMatchesUI.md
         |
         v
LAYER 2: Reconcile Button Feature
    Status: USER_VERIFIED_WORKING (Name breakdown displays correctly)
    Reference: reference_reconcileFeatureSpec.md
         |
         v
LAYER 3: Entity Key Uniqueness Fix
    Status: USER_VERIFIED_WORKING
    Note: Remaining DUPLICATE errors are PID/FireNumber issue (separate concern)
    Reference: reference_entityKeyUniqueness.md
         |
         v
LAYER 4: Detailed compareTo Parameter Flow
    Status: STEPS 1-5 USER_VERIFIED_WORKING, Step 6 (CSS) pending
    Purpose: compareTo(other, true) returns breakdown objects
    Reference: reference_compareToDirectImplementationPlan.md (end of doc)
         |
         v
LAYER 5: compareTo Architecture (4 phases)
    Status: ALL 4 PHASES TESTED WORKING
    Phase 1: IndividualName - TESTED WORKING
    Phase 2: Address - TESTED WORKING
    Phase 3: ContactInfo - TESTED WORKING (10/11 tests)
    Phase 4: Entity - TESTED WORKING (10/10 tests)
    Reference: reference_compareToDirectImplementationPlan.md
         |
         v
LAYER 6: Fire Number Collision Handler
    Status: CODED BUT DISABLED (deferred)
    Disable flag: COLLISION_HANDLER_DISABLED = true in fireNumberCollisionHandler.js
    Note: Cross-type comparison solved in universalEntityMatcher, can port back when needed
    Reference: reference_fireNumberCollisionPlan.md
```

---

## Current Status Summary

**LAYER 2 RECONCILE FEATURE: USER_VERIFIED_WORKING**
- Name Component Breakdown table displays correctly (lastName, firstName, otherNames)
- Shows weights, similarities, and contributions for each component

**Next Steps**:
1. ~~Test Reconcile button in Match Analysis window~~ DONE
2. ~~Enhance displayReconciliationModal to show detailed breakdown (Step 5)~~ DONE
3. Add CSS styling for reconciliation display (Step 6) - MINOR
4. Test full Analyze Matches UI features (Layer 1)

**Deferred**:
- Fire number collision handler re-enablement
- PID/FireNumber duplicate resolution

---

## Layer 1: Analyze Matches UI Enhancement

### Six Features Implemented
| # | Feature | Status |
|---|---------|--------|
| 1 | View Details button on each row | CODED |
| 2 | Complete name + one-line address display | CODED |
| 3 | Top Matches summary section | CODED |
| 4 | 98th percentile in filter row | CODED |
| 5 | CSV export option | CODED |
| 6 | "True Match?" checkbox placeholder | CODED |

### Files Modified
- scripts/unifiedEntityBrowser.js (main implementation)

### Testing Instructions
1. Refresh browser (code files changed)
2. Load entities - click "Load All Entities Into Memory"
3. Select an entity in unified entity browser
4. Click "Analyze Matches" button
5. Verify all 6 features work

---

## Layer 2: Reconcile Button Feature

### Purpose
Display detailed breakdown of how similarity score was calculated between two entities.

### Architecture Decisions
1. **Entity Lookup**: Single canonical path using source + locationIdentifier
2. **Single Source of Truth**: universalCompareTo performs ALL calculations
3. **Enriched Returns**: compareTo(other, true) returns breakdown objects

### Functions to Implement (in unifiedEntityBrowser.js)
- reconcileMatch(baseEntityInfo, targetKey, targetSource, ...)
- performDetailedReconciliation(baseEntity, targetEntity)
- displayReconciliationModal(reconciliationData)

### Critical Lesson
Do NOT use ${...} interpolations inside `<script>` blocks in template literals - causes parsing issues.

---

## Layer 3: Entity Key Uniqueness

### Status: USER_VERIFIED_WORKING

### Problem (Resolved)
```
DUPLICATE locationIdentifier in Bloomerang: SimpleIdentifiers:PO Box 1382, Block Island, RI, 02807:na
{existing: Individual, duplicate: AggregateHousehold}
```

### Root Cause (Fixed)
Bloomerang Individuals and AggregateHouseholds can share same locationIdentifier (address).
Previous key format `source:type:value:headStatus` still collides because standalone Individuals and AggregateHouseholds both get headStatus='na'.

### Solution Implemented
**Bloomerang key format**: `bloomerang:<accountNumber>:<locationType>:<locationValue>:<headStatus>`
**VisionAppraisal key format**: `visionAppraisal:<locationType>:<locationValue>`

### Files Modified
- scripts/loadAllEntitiesButton.js: New key functions, updated index building
- scripts/matching/universalEntityMatcher.js: Updated getEntityKeyInfo, findBestMatches
- scripts/unifiedEntityBrowser.js: Updated reconcile functions with 10 parameters

### Note on Remaining Duplicates
Some DUPLICATE errors may still appear - these are due to the PID/FireNumber relationship complexity, which is a separate issue that does not block current work.

---

## Layer 4: Detailed compareTo Parameter Flow

### Problem Solved
`detailed=true` parameter was not reaching comparison calculator functions.

### Solution
Updated entire call chain to pass detailed parameter:
```
compareTo(other, detailed=false)
  → genericObjectCompareTo(obj1, obj2, excludedProperties, detailed=false)
    → comparisonCalculator.call(obj1, obj2, detailed)
```

### Files Modified (December 7, 2025)
- scripts/utils.js: genericObjectCompareTo, address helpers, contactInfoWeightedComparison
- scripts/objectStructure/aliasClasses.js: Aliased.compareTo
- scripts/objectStructure/contactInfo.js: Info.compareTo fallback
- scripts/objectStructure/entityClasses.js: Entity.compareTo fallback

### Completed Work (December 7, 2025)
- Step 5: USER_VERIFIED_WORKING - Component Breakdown table displays correctly
  - Fix: Added `subordinateDetails: result.subordinateDetails` to Entity.compareTo return in entityClasses.js (line 325)
  - Display shows lastName (50% weight), firstName (40% weight), otherNames (10% weight)

### Remaining Work
- Step 6: Add CSS styling for reconciliation display (minor polish)

---

## Layer 5: compareTo Architecture

See: reference_compareToDirectImplementationPlan.md for full details.

### Key Facts
- All 4 phases tested working
- Uses vowel-weighted Levenshtein from matchingTools.js
- Calculator registry pattern for serialization safety
- Weight boost: +12% for 100% name match, +6% for >95% name match

---

## Layer 6: Fire Number Collision Handler

See: reference_fireNumberCollisionPlan.md for full plan.

### Current State
- CODED in scripts/dataSources/fireNumberCollisionHandler.js
- DISABLED via flag: `COLLISION_HANDLER_DISABLED = true`
- Was blocked by cross-type comparison error
- Cross-type solution NOW EXISTS in universalEntityMatcher.js (extractNameString, crossTypeNameComparison)

### To Re-enable
1. Port crossTypeNameComparison approach from universalEntityMatcher.js
2. Set COLLISION_HANDLER_DISABLED = false
3. Run full integration test

---

## Match Configuration (Current)

```yaml
percentileThreshold: 98
minimumGroupSize: 10
minimumScoreDefault: 0.31
nameScoreOverride: 0.985  # Applies to ALL comparison types

individualToIndividual:
  minimumCutoff: 0.91  # Floor cutoff - MAX(98th percentile, this value)
  minimumScore: 0.50

individualToHousehold:
  minimumScore: 0.50
```

### Best Match Selection Logic
- 98th percentile OR top 10 (whichever is more)
- Name score >98.5% included if score >= minimum
- Perfect matches always included beyond 98th percentile count

---

## Critical Session Lesson (December 7, 2025)

**User feedback during implementation:**
> "you are returning account number INSTEAD? I wanted account number ADDED to the key"
> "What happened to the head of household element in the key? I explicitly said not to remove that"

**Lesson learned**: When adding new key components, ADD them to existing format, do NOT replace existing elements. Preserve ALL existing key elements AND add new ones.

---

## Files Modified This Session (December 7, 2025)

### Entity Key Uniqueness
- loadAllEntitiesButton.js: isBloomerangEntity, getBloomerangAccountNumber, getEntityKeyInfo, buildEntityIndexKey, etc.
- universalEntityMatcher.js: getEntityKeyInfo returns accountNumber and headStatus
- unifiedEntityBrowser.js: reconcileMatch accepts 10 parameters, doReconcile passes all 10

### Detailed Parameter Flow
- utils.js: genericObjectCompareTo 4th param, address helper detailed params
- aliasClasses.js: Aliased.compareTo passes detailed
- contactInfo.js: Info.compareTo fallback passes detailed
- entityClasses.js: Entity.compareTo fallback passes detailed

### Step 5 Fix (December 7, 2025)
- entityClasses.js: Added `subordinateDetails: result.subordinateDetails` to Entity.compareTo return object (line 325)
- Root cause: Calculator returned subordinateDetails but Entity.compareTo was stripping it

---

**Document Version**: 1.1
**Last Updated**: December 7, 2025 (Step 5 completed)
