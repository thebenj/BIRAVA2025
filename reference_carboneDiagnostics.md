# Carbone Household Diagnostic Logging Reference

**Created**: January 5, 2026
**Purpose**: Track all diagnostic logging insertions for the Carbone household investigation
**Status**: ACTIVE - Remove after investigation complete

---

## Tracked Keys

```javascript
const CARBONE_DIAG_KEYS = new Set([
    'bloomerang:328:SimpleIdentifiers:PO Box 395, Block Island, RI, 02807:member',   // Frank
    'bloomerang:1674:SimpleIdentifiers:PO Box 395, Block Island, RI, 02807:head',    // Carolyn
    'bloomerang:1674AH:SimpleIdentifiers:PO Box 395, Block Island, RI, 02807:na'     // Household
]);
```

---

## File 1: scripts/matching/entityGroupBuilder.js

### Insertion 1: Diagnostic Constants and Helper Functions
**Location**: Lines 26-42 (after ENTITYGROUP_DATABASE_FILE_ID declaration)
**Type**: NEW CODE BLOCK

```javascript
// =============================================================================
// DIAGNOSTIC LOGGING FOR CARBONE HOUSEHOLD INVESTIGATION
// =============================================================================
// These keys are being investigated for household pulling behavior
const CARBONE_DIAG_KEYS = new Set([
    'bloomerang:328:SimpleIdentifiers:PO Box 395, Block Island, RI, 02807:member',   // Frank
    'bloomerang:1674:SimpleIdentifiers:PO Box 395, Block Island, RI, 02807:head',    // Carolyn
    'bloomerang:1674AH:SimpleIdentifiers:PO Box 395, Block Island, RI, 02807:na'     // Household
]);

function isDiagKey(key) {
    return CARBONE_DIAG_KEYS.has(key);
}

function diagLog(message) {
    console.log(`[CARBONE DIAG] ${message}`);
}
```

**To Revert**: Delete lines 26-42

---

### Insertion 2: Phase 4 (Bloomerang Households) - Processing Loop
**Location**: Inside `executePhase1_BloomerangHouseholds()`, at start of for loop
**Original Code**:
```javascript
    for (const [key, entity] of bloomerangHouseholds) {
        // Skip if already assigned
        if (groupDb.isEntityAssigned(key)) {
            continue;
        }

        // Create new group with this household as founding member
        const group = groupDb.createGroup(key, phase);
        if (!group) continue;

        group.updateBloomerangFlag(true);  // Bloomerang entity
        groupsCreated++;

        // Use 9-step algorithm to build group membership
        const groupMembers = buildGroupForFounder(key, entity, groupDb, entityDb);
```

**Modified Code**: Has extensive diagnostic logging added (approximately 40 lines of diagnostic code)

**To Revert**: Replace the modified for loop start with the original code above

---

### Insertion 3: Phase 4 - After Group Building
**Location**: Inside `executePhase1_BloomerangHouseholds()`, after near misses loop, before closing brace
**Type**: NEW CODE BLOCK (inserted before `}` that closes the for loop)

```javascript
        // DIAGNOSTIC: Show final group state and check assignment status of Carbone keys
        if (isDiagKey(key)) {
            diagLog(`  AFTER BUILDING GROUP #${group.index}:`);
            diagLog(`    Final memberKeys: [${group.memberKeys.join(', ')}]`);
            diagLog(`  Checking assignment status of all Carbone keys:`);
            for (const diagKey of CARBONE_DIAG_KEYS) {
                diagLog(`    ${diagKey.substring(0,50)}... isAssigned=${groupDb.isEntityAssigned(diagKey)}`);
            }
        }
```

**To Revert**: Delete this block

---

### Insertion 4: Phase 5 (Bloomerang Individuals) - Complete Function Replacement
**Location**: `executePhase3_BloomerangIndividuals()` function
**Type**: EXTENSIVE MODIFICATIONS throughout function

The entire function has diagnostic logging added. Key additions:
- Status check at start of phase
- Logging when Carolyn/Frank are processed
- Logging of householdInformation
- Logging of buildGroupForFounder results
- Logging of natural match and household-pulled additions
- Final group state logging

**To Revert**: Replace entire function with original version (see git history or backup)

---

### Insertion 5: collectHouseholdRelatedKeys() Function
**Location**: `collectHouseholdRelatedKeys()` function (around lines 894-1037)
**Type**: EXTENSIVE MODIFICATIONS throughout function

Key additions:
- `isDiag` flag at function start
- Logging of alreadyInGroup set
- Modified `tryAddKey()` with detailed rejection/acceptance logging
- Modified `extractHouseholdKeys()` with household info logging
- Final householdPulled result logging

**To Revert**: Replace entire function with original version

---

### Insertion 6: markHouseholdIndividualsAsAssigned() Function
**Location**: `markHouseholdIndividualsAsAssigned()` function (around lines 1126-1194)
**Type**: EXTENSIVE MODIFICATIONS throughout function

Key additions:
- `isDiag` flag at function start
- Early return logging
- Account number regex logging
- Logging of each entity marked as assigned
- Final check of whether Carbone keys match pattern

**To Revert**: Replace entire function with original version

---

## File 2: scripts/unifiedDatabasePersistence.js

### Insertion 7: Diagnostic Constants and Helper Functions
**Location**: Lines 247-258 (after "Setting Bloomerang parentKey and siblingKeys..." console.log)
**Type**: NEW CODE BLOCK

```javascript
    // DIAGNOSTIC: Carbone household investigation
    const CARBONE_DIAG_KEYS = new Set([
        'bloomerang:328:SimpleIdentifiers:PO Box 395, Block Island, RI, 02807:member',   // Frank
        'bloomerang:1674:SimpleIdentifiers:PO Box 395, Block Island, RI, 02807:head',    // Carolyn
        'bloomerang:1674AH:SimpleIdentifiers:PO Box 395, Block Island, RI, 02807:na'     // Household
    ]);
    function isDiagKey(key) {
        return CARBONE_DIAG_KEYS.has(key);
    }
    function diagLog(msg) {
        console.log(`[CARBONE DIAG - UNIFIED DB] ${msg}`);
    }
```

**To Revert**: Delete lines 247-258

---

### Insertion 8: First Pass (Households) - Diagnostic Logging
**Location**: Inside first pass for loop, after householdId extraction
**Type**: NEW CODE BLOCK (approximately 20 lines)

Logs:
- Household key and accountNumber values
- Extracted householdId
- Embedded individuals and their accountNumber/householdIdentifier

Also added after the loop:
```javascript
    // DIAGNOSTIC: Log all household IDs found
    diagLog(`FIRST PASS COMPLETE - householdIdentifierToKey:`);
    for (const [hid, hkey] of householdIdentifierToKey) {
        if (isDiagKey(hkey) || hid === '1674' || hid === '1674AH' || hid === '328') {
            diagLog(`  "${hid}" -> ${hkey}`);
        }
    }
```

**To Revert**: Remove all diagnostic blocks from first pass

---

### Insertion 9: Second Pass (Individuals) - Diagnostic Logging
**Location**: Inside second pass for loop
**Type**: EXTENSIVE MODIFICATIONS

Logs:
- Individual key, name, accountNumber
- householdInformation details
- Determined householdId and source
- Whether matching household was found
- Addition to maps

Also added after the loop:
```javascript
    // DIAGNOSTIC: Log all individuals mapped to households
    diagLog(`SECOND PASS COMPLETE - householdIdentifierToIndividualKeys:`);
    for (const [hid, keys] of householdIdentifierToIndividualKeys) {
        const hasDiagKey = keys.some(k => isDiagKey(k));
        if (hasDiagKey || hid === '1674' || hid === '1674AH' || hid === '328') {
            diagLog(`  "${hid}" -> [${keys.join(', ')}]`);
        }
    }
```

**To Revert**: Remove all diagnostic blocks from second pass

---

### Insertion 10: Third Pass (Setting Keys) - Diagnostic Logging
**Location**: Inside third pass for loop and after
**Type**: EXTENSIVE MODIFICATIONS

Logs:
- Processing of each individual
- parentKey lookup and setting
- siblingKeys calculation and setting
- Final state of all Carbone entities

**To Revert**: Remove all diagnostic blocks from third pass

---

## Quick Revert Instructions

### Option 1: Git Revert (Recommended)
```bash
git checkout HEAD -- scripts/matching/entityGroupBuilder.js
git checkout HEAD -- scripts/unifiedDatabasePersistence.js
```

### Option 2: Manual Revert
1. **entityGroupBuilder.js**:
   - Delete lines 26-42 (CARBONE_DIAG_KEYS and helper functions)
   - Restore original `executePhase1_BloomerangHouseholds()` for loop
   - Restore original `executePhase3_BloomerangIndividuals()` function
   - Restore original `collectHouseholdRelatedKeys()` function
   - Restore original `markHouseholdIndividualsAsAssigned()` function

2. **unifiedDatabasePersistence.js**:
   - Delete lines 247-258 (CARBONE_DIAG_KEYS and helper functions)
   - Remove all `diagLog()` calls and `isDiagKey()` checks from the three passes
   - Remove the "PASS COMPLETE" logging blocks after each pass

---

## Console Output Markers

All diagnostic output can be filtered by these prefixes:
- `[CARBONE DIAG]` - EntityGroup building diagnostics
- `[CARBONE DIAG - UNIFIED DB]` - Unified database building diagnostics

---

## Expected Output Sequence

1. **During Unified Database Build**:
   - FIRST PASS - household identification
   - FIRST PASS COMPLETE - household map summary
   - SECOND PASS - individual identification (Carolyn, Frank)
   - SECOND PASS COMPLETE - individual map summary
   - THIRD PASS - setting parentKey/siblingKeys
   - THIRD PASS COMPLETE - final state

2. **During EntityGroup Build**:
   - PHASE 5 START - status check
   - PHASE 4 PROCESSING - household 1674AH becomes founder
   - collectHouseholdRelatedKeys - what gets pulled
   - markHouseholdIndividualsAsAssigned - what gets marked
   - AFTER BUILDING GROUP - final state
   - PHASE 5 PROCESSING - Carolyn and/or Frank (if not skipped)

---

## BUG FIX IMPLEMENTED

### Root Cause
When a Bloomerang AggregateHousehold is pulled into a group (e.g., via FORCE_MATCH), its individual members were NOT being pulled along with it. This caused households and their members to end up in separate EntityGroups.

The bug had two components:
1. `extractHouseholdKeys()` checked embedded individuals for `siblingKeys`, but embedded individuals don't have `siblingKeys` set (only standalone entities do)
2. `markHouseholdIndividualsAsAssigned()` used regex `/bloomerang:(\d+):/` which extracted "1674" from "1674AH" and only matched `bloomerang:1674:*` (catching Carolyn but missing Frank with `bloomerang:328:*`)

### Fix Applied
Modified `extractHouseholdKeys()` in `collectHouseholdRelatedKeys()` to scan the database for individuals whose `parentKey` points to the household entity:

**Location**: Lines 1075-1099 in `scripts/matching/entityGroupBuilder.js`

```javascript
// FIX: For Bloomerang households, embedded individuals don't have siblingKeys set.
// We need to find standalone individual entities whose parentKey points to this household.
// This ensures that when a household is pulled, its individual members are also pulled.
if (entityKey && isBloomerangKey(entityKey)) {
    for (const [candidateKey, candidateEntity] of Object.entries(entityDb)) {
        if (!candidateKey.startsWith('bloomerang:')) continue;
        if (candidateEntity.constructor?.name !== 'Individual') continue;

        const candidateParentKey = candidateEntity.otherInfo?.householdInformation?.parentKey;
        if (candidateParentKey === entityKey) {
            tryAddKey(candidateKey, `${entityLabel}.householdMember(parentKey)`);
        }
    }
}
```

**Also Updated**: Function signature changed to accept `entityKey` parameter, and all 4 call sites updated to pass the key:
- `extractHouseholdKeys(founderEntity, 'founder', founderKey)`
- `extractHouseholdKeys(entity, ..., match.key)`
- `extractHouseholdKeys(entity, ..., key)` (founderForced loop)
- `extractHouseholdKeys(entity, ..., key)` (forcedFromNaturals loop)

### Expected Behavior After Fix
When a Bloomerang household is pulled into a group:
1. The household entity is added to the group
2. The new code scans for all Bloomerang Individual entities whose `parentKey === householdKey`
3. All matching individuals are added to `householdPulled` and joined to the group

---

## Investigation Questions to Answer

1. What `householdId` is extracted for the household 1674AH?
2. What `householdId` is determined for Carolyn (1674) and Frank (328)?
3. Do Carolyn and Frank have matching householdIds to the household?
4. Are `parentKey` and `siblingKeys` being set correctly on standalone entities?
5. Do embedded individuals in household have `siblingKeys` set?
6. What happens in `markHouseholdIndividualsAsAssigned` - does the regex match Frank's key?
7. Are Carolyn/Frank being marked as assigned after Phase 4?
8. If not marked, do they create their own groups in Phase 5?
