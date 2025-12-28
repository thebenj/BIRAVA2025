# Key Preservation Plan: Fix Entity Lookup in Reconcile Flow

## Problem Statement

When the Reconcile button is clicked, entity lookup fails because the code **regenerates** entity keys from properties instead of **preserving** the actual database keys through the data flow.

### Example Failure
- Entity stored in database as: `visionAppraisal:FireNumber:1510`
- `getEntityKeyInfo()` regenerates key as: `visionAppraisal:PID:203` (based on entity.pid property)
- Lookup tries to find `visionAppraisal:PID:203` → fails
- Error: "Base entity not found. Key: PID:203"

### Root Cause
The database key is **computed** from entity properties by `getEntityKeyInfo()` - it is NOT stored in the entity object or passed through the flow. This means any mismatch between how the entity was originally keyed and how `getEntityKeyInfo()` reconstructs the key will cause lookup failure.

---

## Current Code Flow (With Problems Identified)

```
Step 1: User clicks "Analyze Matches"
        ↓
Step 2: findBestMatches() in universalEntityMatcher.js
        - Iterates through ALL entities in database
        - For each entity, calls getEntityKeyInfo(entity) ← REGENERATES KEY
        - Stores regenerated key info in match object
        ↓
Step 3: Match results displayed in popup window
        - Reconcile button onclick embeds: targetKeyType, targetKeyValue
        - These come from regenerated keys, NOT database keys
        ↓
Step 4: User clicks Reconcile
        ↓
Step 5: getVisionAppraisalEntity(targetKeyType, targetKeyValue)
        - Tries to find entity using regenerated key
        - FAILS if regenerated key differs from actual database key
```

**The fundamental flaw**: At Step 2, we have ACCESS to the actual database key (we're iterating the database!), but we throw it away and regenerate a key from the entity's properties.

---

## Correct Architecture

The database key should **travel with the entity** through the entire flow:

```
Step 1: User clicks "Analyze Matches"
        ↓
Step 2: findBestMatches() iterates database
        - PRESERVE actual database key for each entity
        - Pass [key, entity] pairs or store key in match object
        ↓
Step 3: Match results displayed
        - Reconcile button embeds: actualDatabaseKey
        ↓
Step 4: User clicks Reconcile
        ↓
Step 5: Direct lookup using actualDatabaseKey
        - db[actualDatabaseKey] → guaranteed to work
```

---

## Incremental Implementation Plan

### Phase A: Add Key to Match Object (universalEntityMatcher.js)

**Goal**: When building match results, include the actual database key.

**Current code** (lines ~354-368):
```javascript
matches.push({
    targetEntity,
    targetKey: targetKeyInfo.value,        // ← regenerated
    targetKeyType: targetKeyInfo.type,     // ← regenerated
    // ...
});
```

**Change needed**: Add `targetDatabaseKey` field with the actual key from iteration.

**Challenge**: `findBestMatches()` currently receives entities without their keys. It calls `getAllEntities()` which returns entity objects only.

**Sub-steps**:
1. Modify the entity iteration to use `getAllEntitiesWithKeys()` (already exists in unifiedDatabasePersistence.js)
2. Pass the actual database key through the comparison loop
3. Store it in the match object as `targetDatabaseKey`

---

### Phase B: Pass Database Key Through Reconcile Button (unifiedEntityBrowser.js)

**Goal**: The Reconcile button should embed the actual database key.

**Current code** (lines ~2081-2091):
```javascript
onclick="doReconcile(
    '${baseSource}', '${baseKeyType}', '${baseKeyValue}', ...
    '${match.targetSource}', '${match.targetKeyType}', '${match.targetKey}', ...
)"
```

**Change needed**: Add `targetDatabaseKey` parameter:
```javascript
onclick="doReconcile(
    '${baseDatabaseKey}',
    '${match.targetDatabaseKey}',
    // keep other params for display purposes
)"
```

**Sub-steps**:
1. Update `doReconcile()` function signature to accept database keys
2. Update `reconcileMatch()` to receive and use database keys
3. Keep existing parameters for display/logging purposes

---

### Phase C: Use Database Key for Lookup (loadAllEntitiesButton.js)

**Goal**: Entity lookup uses the preserved database key directly.

**Current code**:
```javascript
function getVisionAppraisalEntity(locationType, locationValue) {
    const key = `visionAppraisal:${locationType}:${locationValue}`;
    // complex fallback logic...
}
```

**New approach**: Add a simple direct lookup function:
```javascript
function getEntityByDatabaseKey(databaseKey) {
    const db = window.unifiedEntityDatabase?.entities;
    return db ? db[databaseKey] : null;
}
```

**Sub-steps**:
1. Add `getEntityByDatabaseKey()` function
2. Update `reconcileMatch()` to call this function first
3. Keep existing functions as fallback for backward compatibility

---

### Phase D: Handle Base Entity Key (for the selected entity)

**Goal**: The base entity (the one user selected) also needs its database key preserved.

**Current situation**: When user selects an entity in unified browser, we have access to its key. When "Analyze Matches" is clicked, we pass the entity object but lose the key.

**Change needed**:
1. Store selected entity's database key in `unifiedBrowser.selectedEntityKey`
2. Pass this to `findBestMatches()`
3. Include in match results for the base entity side

---

## Detailed File Changes

### File 1: unifiedDatabasePersistence.js
- **Function exists**: `getAllEntitiesWithKeys()` - returns `[key, entity]` pairs
- **Status**: Already coded, may need verification

### File 2: universalEntityMatcher.js
- **Change**: `findBestMatches()` to use `getAllEntitiesWithKeys()`
- **Change**: Store `targetDatabaseKey` in match object
- **Change**: Store `baseDatabaseKey` in results

### File 3: unifiedEntityBrowser.js
- **Change**: Track `selectedEntityKey` when entity is selected
- **Change**: Pass database keys to `doReconcile()`
- **Change**: Update `reconcileMatch()` to use database keys

### File 4: loadAllEntitiesButton.js
- **Add**: `getEntityByDatabaseKey(key)` function
- **Keep**: Existing lookup functions for backward compatibility

---

## Testing Protocol

After each phase, test:
1. Refresh browser
2. Click "Load Unified Database"
3. Select an entity
4. Click "Analyze Matches"
5. Click "Reconcile" on any match
6. Verify: No "Base entity not found" error

### Edge Cases to Eventually Test
- VisionAppraisal entity keyed by FireNumber
- VisionAppraisal entity keyed by PID
- Bloomerang entity (different key format)
- Cross-source reconciliation (VA to Bloomerang)

---

## Implementation Order

| Order | Phase | Description | Risk Level |
|-------|-------|-------------|------------|
| 1 | A1 | Verify getAllEntitiesWithKeys() works | Low |
| 2 | A2 | Modify findBestMatches() to use it | Medium |
| 3 | A3 | Add targetDatabaseKey to match object | Low |
| 4 | B1 | Add baseDatabaseKey tracking | Low |
| 5 | B2 | Update doReconcile() parameters | Medium |
| 6 | C1 | Add getEntityByDatabaseKey() | Low |
| 7 | C2 | Update reconcileMatch() to use it | Medium |
| 8 | Cleanup | Remove PID fallback hack | Low |

---

## Rollback Strategy

If any phase breaks functionality:
1. Each phase should be a single, reversible change
2. Keep existing lookup functions until new approach is verified
3. The PID fallback (current hack) remains as safety net until Phase C2 is verified

---

## Status Tracking

| Phase | Status | Tested | Notes |
|-------|--------|--------|-------|
| A1 | COMPLETE | YES | getAllEntitiesWithKeys() verified working |
| A2 | COMPLETE | YES | findBestMatches() uses getAllEntitiesWithKeys() |
| A3 | COMPLETE | YES | targetDatabaseKey added to match objects |
| B1 | COMPLETE | YES | doReconcile() accepts database key params |
| B2 | COMPLETE | YES | reconcileOnclick passes targetDatabaseKey |
| B3 | COMPLETE | YES | reconcileMatch() uses direct key lookup first |
| C | COMPLETE | YES | Track baseDatabaseKey through flow |
| Cleanup | COMPLETE | YES | Remove PID fallback hack |
| D | COMPLETE | YES | Self-comparison uses database keys directly |

**Dec 15, 2025 - ALL PHASES COMPLETE**:
- Both base and target entities looked up via direct database key
- Self-comparison uses database key comparison instead of regenerating keys
- PID fallback hack removed from getVisionAppraisalEntity()
- getEntityKeyInfo() only used for display purposes, not for lookup

---

## Questions Resolved

1. **getAllEntitiesWithKeys() verification**: YES - exists in unifiedDatabasePersistence.js, returns [key, entity] pairs
2. **Base entity key source**: RESOLVED - entityWrapper.key contains database key, passed via options.baseDatabaseKey
3. **Backward compatibility**: YES - legacy lookup remains as fallback (but no longer used in normal flow)

---

## Document History

- Created: December 15, 2025
- Purpose: Plan incremental fix for entity key preservation
- Related: reference_keyedDatabaseMigration.md
