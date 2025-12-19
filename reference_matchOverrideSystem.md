# Manual Match Override System Specification

**Created**: December 18, 2025
**Status**: DESIGN_AGREED
**Purpose**: Define the architecture for recording and applying forced matches and exclusions to correct algorithmic matching errors in EntityGroup construction

---

## Overview

### Problem Statement
The algorithmic EntityGroup matching system sometimes produces incorrect results:
- **False positives**: Unrelated entities grouped together (often due to bad name parsing)
- **False negatives**: Related entities in separate groups (often due to name variations)

### Solution
A Google Sheets-based rule system that allows manual specification of:
- **FORCE_MATCH rules**: Ensure specific entity pairs end up in the same group
- **FORCE_EXCLUDE rules**: Prevent specific entity pairs from being in the same group

### Key Design Principles
1. **Key stability**: Entity keys are stable within data refreshes (entities can come/go between refreshes)
2. **Phase-aware execution**: Rules respect the 5-phase construction order
3. **Founding member semantics**: Force matches preserve natural founding member determination
4. **Defective entity model**: Exclusions recognize that false matches often stem from one "defective" entity

---

## Google Sheets Structure

### FORCE_MATCH Sheet

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| RuleID | String | Auto | Unique identifier (auto-generated) |
| RuleType | String | Auto | Always "FORCE_MATCH" |
| EntityKey1 | String | Yes | First entity's database key |
| EntityKey2 | String | Yes | Second entity's database key |
| AnchorOverride | String | No | Optional: force specific entity as anchor |
| Reason | String | No | Human-readable explanation |
| Status | String | Auto | ACTIVE, APPLIED, ORPHANED, ERROR |

**Example Rows:**
```
| RuleID | RuleType    | EntityKey1                           | EntityKey2                    | AnchorOverride | Reason                      | Status |
|--------|-------------|--------------------------------------|-------------------------------|----------------|-----------------------------|--------|
| FM-001 | FORCE_MATCH | bloomerang:12345:...:head            | visionAppraisal:FireNumber:72 |                | Same person, name variation | ACTIVE |
| FM-002 | FORCE_MATCH | visionAppraisal:FireNumber:100       | bloomerang:67890:...:head     | bloomerang:... | Bloomerang has better data  | ACTIVE |
```

### FORCE_EXCLUDE Sheet

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| RuleID | String | Auto | Unique identifier (auto-generated) |
| RuleType | String | Auto | Always "FORCE_EXCLUDE" |
| DefectiveKey | String | Yes | Entity with bad data causing false matches |
| OtherKey | String | Yes | Entity that should NOT match the defective one |
| OnConflict | String | No | DEFECTIVE_YIELDS (default), OTHER_YIELDS, USE_SIMILARITY |
| Reason | String | No | Human-readable explanation |
| Status | String | Auto | ACTIVE, APPLIED, ORPHANED, ERROR |

**Example Rows:**
```
| RuleID | RuleType      | DefectiveKey                   | OtherKey                        | OnConflict       | Reason                        | Status |
|--------|---------------|--------------------------------|---------------------------------|------------------|-------------------------------|--------|
| FE-001 | FORCE_EXCLUDE | visionAppraisal:FireNumber:72A | visionAppraisal:FireNumber:72B  | DEFECTIVE_YIELDS | Different owners, same loc    | ACTIVE |
| FE-002 | FORCE_EXCLUDE | bloomerang:11111:...:head      | visionAppraisal:FireNumber:200  | USE_SIMILARITY   | Ambiguous - let scores decide | ACTIVE |
```

---

## Anchor/Dependent Model (FORCE_MATCH)

### Terminology
- **Anchor**: The entity that "owns" the group - forms the group when its phase runs
- **Dependent**: The entity that joins the anchor's group

### Anchor Determination
1. **If AnchorOverride specified**: Use the specified entity as anchor
2. **Otherwise, use phase order**:
   - Phase 1: Bloomerang Households (earliest)
   - Phase 2: VisionAppraisal Households
   - Phase 3: VisionAppraisal Individuals
   - Phase 4: Bloomerang Individuals
   - Phase 5: Other Types (latest)
   - Entity with earlier phase becomes anchor

### Scheduled Formation
Force-match pairs are NOT executed at Phase 0. Instead:
1. Before construction begins, analyze all FORCE_MATCH rules
2. Determine anchor for each pair
3. Schedule the dependent to join when the anchor's phase runs
4. When anchor forms/joins a group, dependent is added immediately after

**Rationale**: Preserves founding member semantics - the anchor may still find algorithmic matches first, becoming a founding member naturally.

---

## Defective/Other Model (FORCE_EXCLUDE)

### Terminology
- **DefectiveKey**: Entity with problematic data (bad name parse, misleading info) that causes false positives
- **OtherKey**: The entity that should NOT be grouped with the defective one

### OnConflict Resolution

When both entities want to join the same group:

| OnConflict Value | Behavior |
|------------------|----------|
| `DEFECTIVE_YIELDS` (default) | Defective entity is blocked; Other entity joins |
| `OTHER_YIELDS` | Other entity is blocked; Defective entity joins |
| `USE_SIMILARITY` | Compare similarity scores to founding member; lower score is blocked (tie: DefectiveKey loses) |

### Conflict Resolution Timing (CRITICAL)

**Key Insight**: Exclusion conflicts are resolved using an 8-step batch algorithm that respects a priority hierarchy: **founder force-matches beat natural matches beat non-founder force-matches**.

### The 8-Step Group Building Algorithm

When founding member F starts a new group:

#### Step 1: Find Natural Matches
`findMatchesForEntity(F)` returns natural matches from algorithmic comparison.

#### Step 2: Resolve Exclusions Among Natural Matches
- Check all pairs of natural matches for exclusion rules
- **Priority check**: If either entity is ALSO in founder's force-match list, that one wins automatically
- Otherwise: Apply OnConflict rules (DEFECTIVE_YIELDS, OTHER_YIELDS, USE_SIMILARITY)
- Losers are removed from natural matches (stay in pool for future groups)

#### Step 3: Generate Founder Forced Matches
- Get F's force-match list from override rules
- Don't add any that already exist in natural matches list

#### Step 4: Resolve Exclusions Among Founder Forced Matches (Stupid Case)
- User may have forced two entities that exclude each other
- Both are same tier (founder-forced), so apply OnConflict rules
- Loser is removed (stays in pool)

#### Step 5: Check Founder Forced Matches Against Natural Matches
- Compare each founder forced match against each surviving natural match
- **Founder forced matches have precedence** - natural match gets booted if exclusion exists
- Booted natural matches stay in pool; their force-matches are NOT collected in Step 6

#### Step 6: Generate Forced Matches From Natural Matches
- Collect force-matches from surviving natural matches only
- Don't add any already in the lists

#### Step 7: Check Forced-From-Naturals Against Founder Forced Matches
- **Founder forced matches win every time**
- Loser from forced-from-naturals is removed (stays in pool)

#### Step 8: Resolve Exclusions Among Forced-From-Naturals
- Check remaining forced-from-naturals against each other
- Apply OnConflict rules (same tier)
- Losers removed (stay in pool)

#### Final Group
F + surviving natural matches + founder forced matches + surviving forced-from-naturals

---

### Priority Hierarchy Summary

| Comparison | Winner |
|------------|--------|
| Founder-forced vs Founder-forced | OnConflict rules |
| Founder-forced vs Natural match | Founder-forced wins |
| Founder-forced vs Forced-from-natural | Founder-forced wins |
| Natural match vs Natural match | OnConflict rules (unless one is also founder-forced) |
| Natural match vs Forced-from-natural | OnConflict rules |
| Forced-from-natural vs Forced-from-natural | OnConflict rules |

---

### Important Behaviors

**Losers stay in pool**: Entities removed due to exclusion conflicts are NOT permanently excluded. They remain in the unassigned pool and may:
- Join a different group later
- Form their own group as a founding member
- End up as a singleton group

**Lineage is lost**: If a natural match is booted (e.g., in Step 5), any force-matches that would have come from that entity are never collected. The booted entity's "lineage" is lost for this group.

**Founding Member Exception**: If the defective entity IS the founding member F, it cannot yield (it owns the group). The other entity is blocked from THIS group with a warning.

---

## Implementation Architecture

### Data Flow

```
┌─────────────────────┐
│  Google Sheets API  │
│  (Load Rules)       │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Validation Step    │
│  - Key existence    │
│  - Rule consistency │
│  - Conflict detect  │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Rule Processing    │
│  - Parse anchors    │
│  - Build schedules  │
│  - Build exclusion  │
│    lookup map       │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│  5-Phase EntityGroup Construction                       │
│                                                         │
│  Phase 1: Bloomerang Households                         │
│    └─ Apply scheduled force-matches for Phase 1 anchors │
│    └─ Check exclusions in findMatchesForEntity()        │
│                                                         │
│  Phase 2: VisionAppraisal Households                    │
│    └─ Apply scheduled force-matches for Phase 2 anchors │
│    └─ Check exclusions in findMatchesForEntity()        │
│                                                         │
│  ... (Phases 3-5 similar) ...                           │
└─────────────────────────────────────────────────────────┘
```

### Key Interception Point

**buildGroupForFounder() - 8-Step Algorithm Implementation**
```javascript
// In entityGroupBuilder.js - called when F becomes a founding member
function buildGroupForFounder(founderKey, founderEntity, groupDb, entityDb, overrideManager) {

    // Step 1: Find natural matches
    let { trueMatches: naturalMatches, nearMisses } = findMatchesForEntity(founderKey, founderEntity, groupDb, entityDb);

    // Step 2: Resolve exclusions among natural matches
    // Priority: if one is also founder-forced, it wins
    const founderForceList = overrideManager.getForceMatchesFor(founderKey);
    naturalMatches = resolveExclusionsWithPriority(
        naturalMatches,
        founderForceList,  // priority list
        overrideManager
    );

    // Step 3: Generate founder forced matches (excluding those already in naturalMatches)
    const founderForced = founderForceList.filter(key =>
        !naturalMatches.some(m => m.key === key) &&
        !groupDb.assignedEntityKeys.has(key)
    );

    // Step 4: Resolve exclusions among founder forced matches (stupid case)
    const survivingFounderForced = resolveExclusionsOnConflict(founderForced, overrideManager);

    // Step 5: Check founder forced vs natural matches (founder forced wins)
    naturalMatches = removeExcludedBy(naturalMatches, survivingFounderForced, overrideManager);

    // Step 6: Generate forced matches from surviving natural matches
    let forcedFromNaturals = [];
    for (const match of naturalMatches) {
        const forced = overrideManager.getForceMatchesFor(match.key);
        for (const key of forced) {
            if (!naturalMatches.some(m => m.key === key) &&
                !survivingFounderForced.includes(key) &&
                !forcedFromNaturals.includes(key) &&
                !groupDb.assignedEntityKeys.has(key)) {
                forcedFromNaturals.push(key);
            }
        }
    }

    // Step 7: Check forced-from-naturals vs founder forced (founder wins)
    forcedFromNaturals = removeExcludedBy(forcedFromNaturals, survivingFounderForced, overrideManager);

    // Step 8: Resolve exclusions among forced-from-naturals
    forcedFromNaturals = resolveExclusionsOnConflict(forcedFromNaturals, overrideManager);

    // Final group assembly
    return {
        founder: founderKey,
        naturalMatches: naturalMatches,
        founderForced: survivingFounderForced,
        forcedFromNaturals: forcedFromNaturals,
        nearMisses: nearMisses
    };
}
```

### Data Structures

```javascript
// Force-Match Schedule
const forceMatchSchedule = {
    // Keyed by anchor entity key
    "bloomerang:12345:...:head": {
        dependents: ["visionAppraisal:FireNumber:72"],
        anchorPhase: 1,
        ruleId: "FM-001"
    }
};

// Exclusion Lookup (bidirectional)
const exclusionLookup = {
    // Keyed by entity key, value is Set of excluded partner keys with metadata
    "visionAppraisal:FireNumber:72A": new Map([
        ["visionAppraisal:FireNumber:72B", {
            defectiveKey: "visionAppraisal:FireNumber:72A",
            onConflict: "DEFECTIVE_YIELDS",
            ruleId: "FE-001"
        }]
    ]),
    "visionAppraisal:FireNumber:72B": new Map([
        ["visionAppraisal:FireNumber:72A", {
            defectiveKey: "visionAppraisal:FireNumber:72A",
            onConflict: "DEFECTIVE_YIELDS",
            ruleId: "FE-001"
        }]
    ])
};
```

---

## Status Management

### Rule Statuses

| Status | Meaning |
|--------|---------|
| `ACTIVE` | Rule is loaded and ready to apply |
| `APPLIED` | Rule was successfully applied during construction |
| `ORPHANED` | One or both entity keys not found in database |
| `ERROR` | Rule has invalid data or conflicts with other rules |

### Status Updates
- Status is updated in Google Sheet after each build
- ORPHANED rules are preserved (entity may return in next data refresh)
- ERROR rules require manual review and correction

---

## Validation Rules

### Pre-Construction Validation

1. **Key Existence**: Both keys must exist in unifiedEntityDatabase
2. **No Self-Reference**: EntityKey1 ≠ EntityKey2, DefectiveKey ≠ OtherKey
3. **No Circular Force-Match**: If A→B and B→C, cannot have C→A
4. **No Contradictions**: Cannot have FORCE_MATCH(A,B) and FORCE_EXCLUDE(A,B)
5. **Valid OnConflict**: Must be DEFECTIVE_YIELDS, OTHER_YIELDS, or USE_SIMILARITY

### Warning Conditions (Non-Blocking)

1. **Multi-hop chains**: A→B→C creates implicit A→C relationship
2. **Transitive exclusions**: May need additional rules for completeness
3. **Large force-match clusters**: More than 5 entities in single cluster

---

## Logging and Reporting

### Build Log Entries

```
[OVERRIDE] Loaded 15 FORCE_MATCH rules, 8 FORCE_EXCLUDE rules
[OVERRIDE] Validation: 2 rules ORPHANED (keys not found)
[OVERRIDE] Phase 1: Applied FM-001 (bloomerang:12345 + visionAppraisal:72)
[OVERRIDE] Phase 2: Exclusion FE-001 blocked visionAppraisal:72A from group 15
[OVERRIDE] Phase 3: Conflict! FE-002 USE_SIMILARITY: bloomerang:11111 (0.72) blocked, visionAppraisal:200 (0.85) joined
[OVERRIDE] Build complete: 12 FORCE_MATCH applied, 6 FORCE_EXCLUDE applied, 2 ORPHANED, 3 warnings
```

### Summary Report

After construction, generate summary:
- Rules applied successfully
- Rules orphaned (with missing keys)
- Conflicts encountered and resolutions
- Warnings for review

---

## Future Enhancements (Not in Initial Implementation)

1. **Batch exclusion**: Exclude entity from ALL groups (truly defective entity)
2. **Temporary rules**: Expiration dates for testing
3. **Rule inheritance**: Apply rules to entity + all its aliases
4. **UI for rule management**: Browser-based rule editor instead of raw Sheets
5. **Undo/history**: Track rule changes over time

---

## Example Walkthrough

**Setup:**
- F founds group
- Natural matches from algorithm: [A, B, C, D]
- F forces: [E, G, H, I]
- A forces: [J, K]
- B forces: [L, M]
- C forces: [O, P]
- D forces: [Q]

**Exclusions:** E↔J, K↔M, G↔D, C↔D, H↔I

### Step-by-Step Execution

| Step | Action | Result |
|------|--------|--------|
| 1 | Find natural matches | [A, B, C, D] |
| 2 | C↔D exclusion: neither in F's force list → OnConflict → C wins | [A, B, C] (D booted, Q lost) |
| 3 | Generate founder forced | [E, G, H, I] |
| 4 | H↔I exclusion (stupid case) → OnConflict → H wins | [E, G, H] (I booted) |
| 5 | Check [E,G,H] vs [A,B,C]: no exclusions | [A, B, C] unchanged |
| 6 | Collect from A,B,C: A→[J,K], B→[L,M], C→[O,P] | [J, K, L, M, O, P] |
| 7 | E↔J exclusion → E (founder-forced) wins | [K, L, M, O, P] (J booted) |
| 8 | K↔M exclusion → OnConflict → K wins | [K, L, O, P] (M booted) |

**Final Group:** F + [A, B, C] + [E, G, H] + [K, L, O, P]

---

**Document Version**: 2.0
**Status**: DESIGN_AGREED - 8-step algorithm finalized
**Updated**: December 18, 2025 (Session 6)
