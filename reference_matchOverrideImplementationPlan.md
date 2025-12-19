# Match Override System - Incremental Implementation Plan

**Created**: December 18, 2025
**Reference**: reference_matchOverrideSystem.md (design specification)
**Approach**: Incremental implementation with testing at each milestone
**Last Updated**: December 18, 2025 (Session 7)

---

## Implementation Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase A | ✅ USER_VERIFIED_WORKING | Data structures, 8-step helper methods |
| Phase B | 🔄 READY_FOR_TESTING | buildGroupForFounder() wired into all 5 phases |
| Phase C | ⏳ PENDING | Force-match testing |
| Phase D | ⏳ PENDING | Google Sheets integration |
| Phase E | ⏳ PENDING | UI integration |

---

## Implementation Phases

### Phase A: Foundation - Data Structures and Manual Testing ✅ COMPLETE
**Goal**: Build core data structures and test with hardcoded rules
**Status**: USER_VERIFIED_WORKING (Dec 18, Session 6)

#### Step A1: Create Override Data Structures
**File**: `scripts/matching/matchOverrideManager.js` (new file)

```javascript
// Create new file with:
// - ForceMatchRule class
// - ForceExcludeRule class
// - MatchOverrideManager class (holds all rules, provides lookup methods)
// - Helper functions: isExcludedPair(), getForceMatchSchedule()
```

**Testing A1**:
- Unit test: Create rules programmatically
- Unit test: Lookup functions return correct results
- Unit test: Bidirectional exclusion lookup works

#### Step A2: Hardcoded Test Rules
**File**: `scripts/matching/matchOverrideManager.js`

```javascript
// Add function to load hardcoded test rules:
function loadTestRules() {
    return {
        forceMatches: [
            // Add 2-3 known entity pairs that SHOULD match but don't
        ],
        forceExcludes: [
            // Add 2-3 known entity pairs that SHOULDN'T match but do
        ]
    };
}
```

**Testing A2**:
- Identify real entity pairs from current database for testing
- Document expected behavior for each test rule
- No integration yet - just data structure verification

---

### Phase B: Exclusion Integration 🔄 READY_FOR_TESTING
**Goal**: Wire 8-step algorithm into entityGroupBuilder.js
**Status**: READY_FOR_TESTING (Dec 18, Session 7)

**Implementation Summary**:
- Created `buildGroupForFounder()` function in entityGroupBuilder.js (lines 619-703)
- Modified all 5 phase execution functions to use buildGroupForFounder()
- All phases now track `forcedAdded` count and handle `founderForced` + `forcedFromNaturals` arrays
- Backward compatible: when no rules loaded, `hasOverrides=false` skips Steps 2-8

**Test Command**:
```javascript
window.matchOverrideManager.loadRules({
    forceMatches: [],
    forceExcludes: [
        { ruleId: 'FE-TEST-001', defectiveKey: 'visionAppraisal:FireNumber:72A',
          otherKey: 'visionAppraisal:FireNumber:72B', onConflict: 'DEFECTIVE_YIELDS', reason: 'Test' }
    ]
});
await buildEntityGroupDatabase({ sampleSize: 1500, saveToGoogleDrive: false })
```

**Original Plan (preserved for reference)**:

#### Step B1: Add Exclusion Check to findMatchesForEntity()
**File**: `scripts/matching/entityGroupBuilder.js`

**Changes**:
1. Import/load MatchOverrideManager
2. Add exclusion check in findMatchesForEntity() loop
3. Add logging for exclusion applications

```javascript
// In findMatchesForEntity(), add after "skip already assigned" check:
if (window.matchOverrideManager?.isExcludedPair(baseKey, candidateKey)) {
    console.log(`[OVERRIDE] Exclusion applied: ${baseKey} ↔ ${candidateKey}`);
    continue;
}
```

**Testing B1**:
- Build database with hardcoded exclusion rule
- Verify excluded pair ends up in SEPARATE groups
- Verify log message appears
- Verify non-excluded pairs still group normally

#### Step B2: OnConflict Resolution Logic
**File**: `scripts/matching/matchOverrideManager.js`

**Add**:
- `resolveConflict(defectiveKey, otherKey, foundingMemberKey, groupDb, entityDb)` function
- USE_SIMILARITY scoring logic
- Returns: { allowedKey, blockedKey, resolution }

**Testing B2**:
- Unit test: DEFECTIVE_YIELDS returns correct result
- Unit test: OTHER_YIELDS returns correct result
- Unit test: USE_SIMILARITY compares scores correctly
- Unit test: Tie-breaker favors OtherKey

#### Step B3: Batch Conflict Resolution in findMatchesForEntity()
**File**: `scripts/matching/entityGroupBuilder.js`

**Changes**:
- After collecting all trueMatches, call `resolveExclusionConflicts(foundingKey, trueMatches)`
- This checks all pairs of matches for exclusion rules
- Losers are removed from match list (but stay in pool for future groups)
- Log conflicts and resolutions

**Key Insight**: Resolution happens BEFORE entities are added to the group, during match collection. This ensures OnConflict settings work correctly regardless of processing order.

```javascript
function findMatchesForEntity(baseKey, baseEntity, groupDb, entityDb) {
    let trueMatches = [];
    // ... collect all potential matches ...

    // BATCH CONFLICT RESOLUTION - resolve exclusions before finalizing
    trueMatches = resolveExclusionConflicts(baseKey, trueMatches, entityDb);

    return { trueMatches, nearMisses };
}
```

**Testing B3**:
- Create scenario where both DefectiveKey and OtherKey match same founding member
- Verify DEFECTIVE_YIELDS removes correct entity from match list
- Verify USE_SIMILARITY compares scores and removes lower scorer
- Verify loser stays in pool (appears in later group or as singleton)
- Verify founding member exception (if defective IS founding member, other is excluded)

---

### Phase C: Force-Match Integration
**Goal**: Implement scheduled force-match application

#### Step C1: Anchor Determination Logic
**File**: `scripts/matching/matchOverrideManager.js`

**Add**:
- `determineAnchor(key1, key2, entityDb)` function
- Phase lookup for entity types
- AnchorOverride handling

```javascript
function determineAnchor(key1, key2, anchorOverride, entityDb) {
    if (anchorOverride) {
        return anchorOverride === key1
            ? { anchor: key1, dependent: key2 }
            : { anchor: key2, dependent: key1 };
    }

    const phase1 = getPhaseForEntity(entityDb.entities[key1]);
    const phase2 = getPhaseForEntity(entityDb.entities[key2]);

    return phase1 <= phase2
        ? { anchor: key1, dependent: key2 }
        : { anchor: key2, dependent: key1 };
}
```

**Testing C1**:
- Unit test: Bloomerang Household (phase 1) beats VA Individual (phase 3)
- Unit test: AnchorOverride is respected
- Unit test: Same-phase entities have deterministic ordering

#### Step C2: Force-Match Schedule Building
**File**: `scripts/matching/matchOverrideManager.js`

**Add**:
- `buildForceMatchSchedule(forceMatchRules, entityDb)` function
- Returns map of anchor → [dependents] by phase

**Testing C2**:
- Build schedule from test rules
- Verify anchors grouped by phase
- Verify dependents associated with correct anchors

#### Step C3: Apply Force-Matches at Phase Start
**File**: `scripts/matching/entityGroupBuilder.js`

**Changes**:
- Add `applyScheduledForceMatches(phaseNumber, groupDb, entityDb)` call at start of each phase
- Function checks if anchor already in a group → add dependent
- Function checks if anchor not yet grouped → will be handled when anchor forms group

```javascript
function applyScheduledForceMatches(phaseNumber, groupDb, entityDb) {
    const schedule = window.matchOverrideManager?.getScheduleForPhase(phaseNumber);
    if (!schedule) return;

    for (const [anchorKey, dependents] of schedule) {
        // Find anchor's group (if any)
        const anchorGroup = groupDb.findGroupContaining(anchorKey);

        if (anchorGroup) {
            // Anchor already in group - add dependents
            for (const depKey of dependents) {
                if (!groupDb.assignedEntityKeys.has(depKey)) {
                    groupDb.addMemberToGroup(anchorGroup.index, depKey);
                    console.log(`[OVERRIDE] Force-match applied: ${depKey} → group ${anchorGroup.index}`);
                }
            }
        }
        // If anchor not in group yet, it will form one and we handle it then
    }
}
```

**Testing C3**:
- Force-match two entities that algorithm separates
- Verify they end up in SAME group
- Verify anchor is founding member (or joins existing group)
- Verify dependent is added as member

#### Step C4: Handle Anchor Group Formation
**File**: `scripts/matching/entityGroupBuilder.js`

**Changes**:
- When entity creates new group, check if it's an anchor with pending dependents
- Immediately add dependents after group creation

**Testing C4**:
- Test case where anchor creates new group
- Verify dependent added immediately
- Test case where anchor joins existing group
- Verify dependent also added

---

### Phase D: Google Sheets Integration
**Goal**: Load rules from Google Sheets instead of hardcoded

#### Step D1: Define Sheet Structure
**Google Sheets**: Create actual sheets with proper columns

- FORCE_MATCH: RuleID, RuleType, EntityKey1, EntityKey2, AnchorOverride, Reason, Status
- FORCE_EXCLUDE: RuleID, RuleType, DefectiveKey, OtherKey, OnConflict, Reason, Status

**Testing D1**:
- Create sheets in Google Drive
- Add sample rules manually
- Verify sheet access works

#### Step D2: Load Rules from Sheets
**File**: `scripts/matching/matchOverrideManager.js`

**Add**:
- `loadRulesFromGoogleSheets(forceMatchSheetId, forceExcludeSheetId)` async function
- Parse sheet data into rule objects
- Handle missing/invalid data gracefully

**Testing D2**:
- Load rules from actual sheets
- Verify rules parse correctly
- Verify invalid rows generate warnings (not errors)

#### Step D3: Validation and Status Updates
**File**: `scripts/matching/matchOverrideManager.js`

**Add**:
- `validateRules(entityDb)` function - checks key existence, conflicts
- `updateRuleStatuses(results)` function - writes back to sheets
- ORPHANED detection for missing keys

**Testing D3**:
- Add rule with non-existent key
- Verify marked ORPHANED
- Run build, verify APPLIED status set for working rules

---

### Phase E: UI Integration
**Goal**: Add controls to EntityGroup Browser

#### Step E1: Load Override Rules Button
**File**: `scripts/entityGroupBrowser.js`

**Add**:
- "Load Override Rules" button
- Displays rule count and any validation warnings
- Stores rules in window.matchOverrideManager

**Testing E1**:
- Click button, verify rules load
- Verify count displayed correctly
- Verify warnings shown for invalid rules

#### Step E2: Override Status in Build Output
**File**: `scripts/entityGroupBrowser.js`

**Changes**:
- After build completes, show override summary:
  - Force-matches applied
  - Exclusions applied
  - Conflicts resolved
  - Orphaned rules

**Testing E2**:
- Run full build with rules loaded
- Verify summary shows accurate counts
- Verify conflicts logged with details

#### Step E3: Rule Status Sheet Update
**File**: `scripts/entityGroupBrowser.js`

**Add**:
- After build, update Status column in Google Sheets
- Option to "Update Rule Statuses" button

**Testing E3**:
- Run build
- Check Google Sheets for updated statuses
- Verify APPLIED/ORPHANED correctly set

---

## Testing Milestones Summary

| Milestone | Description | Verification |
|-----------|-------------|--------------|
| A-Complete | Data structures work | Unit tests pass |
| B-Complete | Exclusions prevent grouping | Known pair in separate groups |
| C-Complete | Force-matches combine groups | Known pair in same group |
| D-Complete | Rules load from Sheets | Real rules applied correctly |
| E-Complete | Full UI integration | Build + status update works |

---

## Test Case Inventory

### Exclusion Test Cases
1. **Basic exclusion**: Two entities that algorithm would match → end up separate
2. **DEFECTIVE_YIELDS**: Both want same group → defective blocked
3. **USE_SIMILARITY**: Both want same group → lower score blocked
4. **Founding member protection**: Defective is founding → other blocked (with warning)

### Force-Match Test Cases
1. **Basic force-match**: Two entities algorithm separates → end up together
2. **Anchor forms group**: Anchor creates new group → dependent added
3. **Anchor joins group**: Anchor added to existing → dependent follows
4. **Phase ordering**: Earlier phase entity is anchor
5. **AnchorOverride**: Override respected regardless of phase

### Edge Case Test Cases
1. **Orphaned rule**: Key doesn't exist → rule marked ORPHANED, no error
2. **Contradictory rules**: FORCE_MATCH and FORCE_EXCLUDE same pair → ERROR
3. **Chain force-match**: A→B and B→C → all three in same group
4. **Multi-exclusion**: A excluded from B and C → A alone or different group

---

## File Summary

| File | Changes |
|------|---------|
| `scripts/matching/matchOverrideManager.js` | NEW - All override logic |
| `scripts/matching/entityGroupBuilder.js` | Add exclusion checks, force-match application |
| `scripts/entityGroupBrowser.js` | Add UI controls, status display |
| Google Sheets | FORCE_MATCH and FORCE_EXCLUDE sheets |

---

## Risk Mitigation

1. **Incremental approach**: Each phase independently testable
2. **Hardcoded rules first**: Validate logic before Sheets integration
3. **Logging throughout**: Every override action logged for debugging
4. **No kick-outs**: Stability guaranteed - existing assignments preserved
5. **Graceful degradation**: Missing rules or Sheets errors don't break build

---

**Document Version**: 2.0
**Status**: PHASE_B_READY_FOR_TESTING
**Updated**: December 18, 2025 (Session 7)
**Progress**: Phase A complete, Phase B implemented and ready for testing
