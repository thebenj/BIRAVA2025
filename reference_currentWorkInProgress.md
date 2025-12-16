# Current Work In Progress - Nested Project Layers

**Created**: December 7, 2025
**Last Updated**: December 16, 2025
**Purpose**: Track the layered/nested projects currently in progress to prevent context loss during AI session transitions

---

## Active Project Stack (Outermost to Innermost)

```
LAYER 1: EntityGroup Database (Step 4 of Roadmap)
    Status: CODED_READY_FOR_USER_VERIFICATION
    Files: scripts/objectStructure/entityGroup.js, scripts/matching/entityGroupBuilder.js
    Reference: reference_projectRoadmap.md Section 4
         |
         v
LAYER 2: Analyze Matches UI (6-feature enhancement)
    Status: USER_VERIFIED_WORKING (True Match / Near Match checkboxes verified)
    Reference: reference_analyzeMatchesUI.md
         |
         v
LAYER 3: Reconcile Button Feature
    Status: USER_VERIFIED_WORKING (Name breakdown displays correctly)
    Reference: reference_reconcileFeatureSpec.md
         |
         v
LAYER 4: Entity Key Uniqueness Fix
    Status: USER_VERIFIED_WORKING
    Reference: reference_entityKeyUniqueness.md
         |
         v
LAYER 5: Detailed compareTo Parameter Flow
    Status: STEPS 1-5 USER_VERIFIED_WORKING, Step 6 (CSS) pending (minor)
    Reference: reference_compareToDirectImplementationPlan.md
         |
         v
LAYER 6: compareTo Architecture (4 phases)
    Status: ALL 4 PHASES TESTED WORKING
    Reference: reference_compareToDirectImplementationPlan.md
         |
         v
LAYER 7: Fire Number Collision Handler
    Status: USER_VERIFIED_WORKING (ENABLED)
    Disable flag: COLLISION_HANDLER_DISABLED = false
    Reference: reference_fireNumberCollisionPlan.md
```

---

## Current Status Summary

**LAYER 1 ENTITYGROUP DATABASE: CODED_READY_FOR_USER_VERIFICATION**

### Test Results (December 16, 2025)
| Metric | Value |
|--------|-------|
| Total Groups | 2291 |
| Multi-member Groups | 785 |
| Single-member Groups | 1506 |
| Prospects | 1316 |
| Existing Donors | 975 |
| Entities Assigned | 4097 |
| Near Misses | 202 |

### Files Created
- `scripts/objectStructure/entityGroup.js` - EntityGroup and EntityGroupDatabase classes
- `scripts/matching/entityGroupBuilder.js` - 5-phase construction algorithm

### Files Modified
- `index.html` - Added script includes
- `scripts/unifiedEntityBrowser.js` - Exported isTrueMatch, isNearMatch, MATCH_CRITERIA

### 5-Phase Construction Algorithm
1. **Phase 1**: Bloomerang Households (426 found)
2. **Phase 2**: VisionAppraisal Households (1406 processed)
3. **Phase 3**: Bloomerang Individuals (remaining after Phase 1)
4. **Phase 4**: VisionAppraisal Individuals (remaining after Phase 2)
5. **Phase 5**: Remaining entity types (Business, LegalConstruct)

### Pending Features
- Browser/viewing tools for EntityGroups
- CSV output for EntityGroups
- Google Drive persistence (save/load)
- Consensus entity synthesis (_synthesizeConsensus is placeholder)

---

## Completed Foundational Work

### Keyed Database Migration (Dec 14-15, 2025) - USER_VERIFIED_WORKING
- All 6 migration phases complete
- Reference: reference_keyedDatabaseMigration.md

### Key Preservation (Dec 15, 2025) - USER_VERIFIED_WORKING
- Database keys flow through entire system (findBestMatches → reconcileMatch)
- Reference: reference_keyPreservationPlan.md

### True Match / Near Match Criteria (Dec 15-16, 2025) - USER_VERIFIED_WORKING
- isTrueMatch() and isNearMatch() functions in unifiedEntityBrowser.js
- MATCH_CRITERIA configuration exported for use by EntityGroup construction
- Checkboxes in Analyze Matches UI auto-detect match status

### NonHumanName Implementation (Dec 14, 2025) - USER_VERIFIED_WORKING
- NonHumanName class for Business/LegalConstruct entities

### Email Matching Improvement (Dec 14, 2025) - USER_VERIFIED_WORKING
- Split local part (0.8 fuzzy) + domain (0.2 exact)

### Fire Number Collision Handler (Dec 8, 2025) - USER_VERIFIED_WORKING
- Stats: {merged: 8, suffixed: 59, unique_output: 2309}
- COLLISION_HANDLER_DISABLED = false (ENABLED)

---

## Layer 2: Analyze Matches UI Enhancement

### Six Features
| # | Feature | Status |
|---|---------|--------|
| 1 | View Details button on each row | USER_VERIFIED_WORKING |
| 2 | Complete name + one-line address display | USER_VERIFIED_WORKING |
| 3 | Top Matches summary section | USER_VERIFIED_WORKING |
| 4 | 98th percentile in filter row | USER_VERIFIED_WORKING |
| 5 | CSV export option | CODED_NOT_TESTED |
| 6 | True Match / Near Match checkboxes | USER_VERIFIED_WORKING |

---

## Layer 3: Reconcile Button Feature

### Status: USER_VERIFIED_WORKING
- Name Component Breakdown table displays correctly
- Shows weights, similarities, and contributions for each component
- View Details buttons added to both Base Entity and Target Entity cards

### Critical Lesson
Do NOT use ${...} interpolations inside `<script>` blocks in template literals.

---

## Layer 4: Entity Key Uniqueness

### Status: USER_VERIFIED_WORKING

### Key Formats
- **Bloomerang**: `bloomerang:<accountNumber>:<locationType>:<locationValue>:<headStatus>`
- **VisionAppraisal**: `visionAppraisal:<locationType>:<locationValue>`

---

## Layer 5: Detailed compareTo Parameter Flow

### Status: STEPS 1-5 USER_VERIFIED_WORKING

### Solution
Updated entire call chain to pass detailed parameter:
```
compareTo(other, detailed=false)
  → genericObjectCompareTo(obj1, obj2, excludedProperties, detailed=false)
    → comparisonCalculator.call(obj1, obj2, detailed)
```

### Remaining
- Step 6: Add CSS styling for reconciliation display (minor polish)

---

## Layer 6: compareTo Architecture

### Status: ALL 4 PHASES TESTED WORKING
- Phase 1: IndividualName - TESTED WORKING
- Phase 2: Address - TESTED WORKING
- Phase 3: ContactInfo - TESTED WORKING
- Phase 4: Entity - TESTED WORKING

See: reference_compareToDirectImplementationPlan.md

---

## Layer 7: Fire Number Collision Handler

### Status: USER_VERIFIED_WORKING (December 8, 2025)
- Located in: scripts/dataSources/fireNumberCollisionHandler.js
- COLLISION_HANDLER_DISABLED = false (ENABLED)
- Uses crossTypeNameComparison from utils.js

### Test Stats
- Merged same owner: 8
- Suffixed different owner: 59
- Unique entities in output: 2309

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

## Critical Lessons Preserved

1. **Template Literals**: Do NOT use ${...} interpolations inside `<script>` blocks
2. **Key Changes**: When adding new key components, ADD to existing format, do NOT replace elements
3. **Source Identification**: Use sourceMap-based test (locationIdentifier.primaryAlias.sourceMap contains 'bloomerang'), NOT accountNumber property
4. **Fire Number Collision**: Cannot use full universalCompareTo - entities have same primary address; must use NAME ONLY + SECONDARY ADDRESS ONLY comparison
5. **Key Preservation**: Database keys generated ONLY during database building; once loaded, keys travel with entities through all flows

---

**Document Version**: 2.0
**Last Updated**: December 16, 2025
