# Current Work In Progress - Nested Project Layers

**Created**: December 7, 2025
**Last Updated**: December 22, 2025
**Purpose**: Track the layered/nested projects currently in progress to prevent context loss during AI session transitions

---

## Active Project Stack (Current Focus)

```
LAYER 1: EntityGroup Database with Match Override System
    Status: USER_VERIFIED_WORKING
    Files: entityGroup.js, entityGroupBuilder.js, matchOverrideManager.js
    Browser: entityGroupBrowser.js
         |
         v
LAYER 2: Household Cross-Reference Keys (Step 9)
    Status: CODED_NOT_TESTED
    Purpose: Auto-include household members when any member joins a group
    Properties: parentKey, siblingKeys, entityGroupIndex
         |
         v
LAYER 3: Match Override System (Phases A-E Complete)
    Status: USER_VERIFIED_WORKING
    Features: FORCE_MATCH, FORCE_EXCLUDE, MUTUAL rows, One-to-Many expansion
    Google Sheets integration with UI checkbox
         |
         v
LAYER 4: Lightweight Exporter v2.0
    Status: USER_VERIFIED_WORKING
    Purpose: Export EntityGroups for Google Apps Script
    Output: foundingMember + members + consensusEntity per group
         |
         v
LAYER 5: Assessment Value Report
    Status: CODED_NOT_TESTED
    Features: Subdivision values, Checksum verification
```

---

## Current Status Summary

### Session 14 (Dec 22) - Household Cross-Reference Keys

**Purpose**: Enable automatic inclusion of household members when any member joins an EntityGroup.

**New Properties in HouseholdInformation**:
- `parentKey`: Database key of the household entity this individual belongs to
- `siblingKeys`: Array of database keys for other individuals in the same household
- `entityGroupIndex`: Index of the EntityGroup (placeholder for future use)

**Implementation**:
| Source | Approach | Status |
|--------|----------|--------|
| VisionAppraisal | Second-pass in buildUnifiedEntityDatabase() | USER_VERIFIED_WORKING |
| Bloomerang | Second-pass after all entities added | CODED_NOT_TESTED |

**Step 9 Household Pulling**:
- New function: `collectHouseholdRelatedKeys()` in entityGroupBuilder.js
- Modified: `buildGroupForFounder()` returns `householdPulled` array
- Phase order swap: Phase 1 is now VisionAppraisal Households, Phase 2 is Bloomerang Households

**Key Lesson Learned**: Database keys generated via `generateUnifiedEntityKey()` differ from entity keys via `generateEntityKey()`. Must use actual database keys for cross-references.

---

### Match Override System (Sessions 6-9, Dec 18-19)

**Status**: ALL_PHASES_USER_VERIFIED_WORKING

| Phase | Description | Status |
|-------|-------------|--------|
| A | Data structures, 8-step helpers | USER_VERIFIED_WORKING |
| B | Exclusion integration | USER_VERIFIED_WORKING |
| C | Force-match integration | USER_VERIFIED_WORKING |
| D | Google Sheets integration | USER_VERIFIED_WORKING |
| E | UI checkbox integration | USER_VERIFIED_WORKING |

**Google Sheets**:
- FORCE_MATCH: `1WWq8rgVyIKgf3qhVpl5mBiVQllljum0JVm2e_h-WZo8`
- FORCE_EXCLUDE: `1nZIqcBa3LW1DcUKXVr1jNCGsZqq6JLTaxJSpXSZyulk`

**Row Formats**:
- Regular: `RuleID | Key1 | Key2 | OnConflict | Reason | Status`
- MUTUAL: `RuleID | MUTUAL | key1::^::key2::^::key3 | (ignored) | (ignored) | Status`
- One-to-Many: `RuleID | Key1 | keyA::^::keyB::^::keyC | OnConflict | Reason | Status`

**Override Algorithm (Steps 0-8)** in buildGroupForFounder:
0. Remove natural matches excluded with founder
1. Find natural matches from algorithmic comparison
2. Resolve exclusions among natural matches
3. Generate founder forced matches
3.5. Check founder-forced for contradictions
4. Resolve exclusions among founder forced
5. Check founder forced vs natural matches
6. Generate forced matches from surviving natural matches
7. Check forced-from-naturals vs founder forced
7.5. Check forcedFromNaturals for exclusions with founder
8. Resolve exclusions among forced-from-naturals

**Step 9 Household Pulling** (runs after override steps):
- Collects parent households and siblings for all group members
- Implemented in collectHouseholdRelatedKeys()

---

### Lightweight Exporter v2.0 (Session 12, Dec 21)

**Status**: USER_VERIFIED_WORKING

**File**: scripts/export/lightweightExporter.js

**Design Principles**:
1. Generic property iteration (no hardcoded property catalogs)
2. Exclusions-only specification
3. Self-contained output (embedded entity data)

**Output per Group**:
- `foundingMember`: Reduced entity object
- `members`: Array of reduced entity objects
- `consensusEntity`: Reduced consensus entity

**Key Functions**:
- `exportLightweightEntityGroupDatabase(db, entityDatabase)`
- `downloadLightweightExport(db, filename, entityDatabase)`
- `previewGroupTransformation(group, entityDatabase)`

---

### Assessment Value Report (Session 13, Dec 21)

**Status**: CODED_NOT_TESTED

**Subdivision Values Fix**:
- Problem: Fire number collision entities merged into otherInfo.subdivision had values not counted
- Fix: generateAssessmentValueReport() now iterates through subdivision entries

**Checksum Verification**:
- `calculateRawAssessmentChecksum()`: Loads raw VA data, sums all assessment values
- `verifyAssessmentChecksum()`: Compares raw total vs report total
- UI button: "✓ Verify Checksum" next to Assessment Value Report button

---

## Completed Foundational Work

### EntityGroup System - USER_VERIFIED_WORKING
- Core implementation: 2291 groups, 785 multi-member, 4097 entities assigned
- Browser tool with filtering, sorting, searching
- Persistence with reference file companion
- CSV export (54-column format)

### Same-Location Entity Comparison - USER_VERIFIED_WORKING
- Entities with same-base fire numbers (72J vs 72W) use secondary addresses only
- Fix in universalCompareTo() checks same-location FIRST before routing

### Keyed Database Migration - USER_VERIFIED_WORKING
- All 6 migration phases complete

### Key Preservation - USER_VERIFIED_WORKING
- Database keys flow through entire system

### Comparison Architecture - USER_VERIFIED_WORKING
- All 4 phases working
- Name comparison rule for different missing fields

---

## 5-Phase Group Construction Order

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | VisionAppraisal Households | Primary |
| 2 | Bloomerang Households | Secondary |
| 3 | VisionAppraisal Individuals | Tertiary |
| 4 | Bloomerang Individuals | Quaternary |
| 5 | Remaining Unassigned | Final |

---

## Critical Lessons (Extended)

1. **Template Literals**: Do NOT use ${...} interpolations inside `<script>` blocks
2. **Key Changes**: When adding new key components, ADD to existing format, do NOT replace
3. **Fire Number Collision**: Must use secondary addresses only (same primary address)
4. **Same-Location Entities**: Entities with same-base fire numbers need special comparison
5. **OAuth Token Expiration**: Long operations must save promptly (tokens expire after 1 hour)
6. **Code Path Verification**: Use diagnostic console.logs before making changes
7. **Multiple Comparison Entry Points**: Changes may be needed in both paths
8. **Address Pool Exclusion**: contactInfoWeightedComparison excludes addresses after claimed
9. **Type Checking for LocationIdentifier**: extractFireNumberFromEntity() must verify constructor.name
10. **Database Key Generation**: NEVER generate keys twice - use actual existing keys for cross-references
11. **Saved vs Memory**: Always rebuild EntityGroup database to test code changes; loaded files reflect OLD code

---

## Key File Locations

| Purpose | File |
|---------|------|
| EntityGroup class | scripts/objectStructure/entityGroup.js |
| Group builder | scripts/matching/entityGroupBuilder.js |
| Override manager | scripts/matching/matchOverrideManager.js |
| Browser tool | scripts/entityGroupBrowser.js |
| Lightweight exporter | scripts/export/lightweightExporter.js |
| Household info | scripts/objectStructure/householdInformation.js |
| Production process | reference_productionProcess.md |
| Session history | reference_sessionHistory.md |

---

**Document Version**: 5.1
**Last Updated**: December 22, 2025
