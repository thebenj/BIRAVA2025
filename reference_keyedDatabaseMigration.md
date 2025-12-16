# Keyed Database Migration Plan

**Created:** December 14, 2025
**Purpose:** Document the migration from Legacy Unified Database to Keyed Database architecture

---

## Terminology

### Legacy Unified Database (`workingLoadedEntities`)

The original data structure that holds VisionAppraisal and Bloomerang data in SEPARATE structures:

```javascript
workingLoadedEntities = {
    visionAppraisal: {
        entities: [...],           // Array of VisionAppraisal entities
        metadata: {...},
        loaded: true/false
    },
    bloomerang: {
        individuals: {
            entities: {...},       // Object keyed by storage key
            metadata: {...}
        },
        households: {
            entities: {...},
            metadata: {...}
        },
        nonhuman: {
            entities: {...},
            metadata: {...}
        },
        loaded: true/false
    },
    status: 'loaded' | 'not_loaded' | 'error',
    entityIndex: {...}             // Redundant index built separately
}
```

**Characteristics:**
- Data accessed by navigating different paths depending on source
- VisionAppraisal: `workingLoadedEntities.visionAppraisal.entities[index]`
- Bloomerang: `workingLoadedEntities.bloomerang.individuals.entities[key]`
- Created by "Load All Entities Into Memory" button
- Requires source-specific code to access data

### Keyed Database (`unifiedEntityDatabase`)

The target data structure where ALL entities (both sources) are stored together in a single flat keyed structure:

```javascript
unifiedEntityDatabase = {
    metadata: {
        createdAt: "2025-12-14T...",
        version: "1.0",
        sources: {
            visionAppraisal: { count: 2317, originalCount: 2317 },
            bloomerang: { count: 1780, originalCount: 1780 }
        },
        entityTypes: {
            Individual: 363,
            AggregateHousehold: 931,
            Business: 211,
            LegalConstruct: 812
        },
        totalEntities: 4097
    },
    entities: {
        "visionAppraisal:FireNumber:1510": Entity,
        "visionAppraisal:FireNumber:222": Entity,
        "bloomerang:12345:SimpleIdentifiers:PO Box 123...:head": Entity,
        // ... all entities in one flat structure
    }
}
```

**Characteristics:**
- Single flat structure, source-agnostic access
- Access any entity: `unifiedEntityDatabase.entities[key]`
- Key format includes source prefix: `visionAppraisal:...` or `bloomerang:...`
- Saved to Google Drive via "Record Unified Database" button
- Loaded from Google Drive via "Load Unified Database" button
- Uniform access pattern regardless of source

---

## Migration Goal

**FROM:** Functions that read from the Legacy Unified Database (navigating separate VisionAppraisal/Bloomerang structures)

**TO:** Functions that read from the Keyed Database (single keyed structure, source-agnostic access)

---

## Current State (Pre-Migration)

### Data Flow Options

**Option A: Load from Source Files**
```
Source Files → workingEntityLoader.js → Legacy Unified Database
                                      → (manual) Record button → Keyed Database
```

**Option B: Load from Disk**
```
Google Drive → loadUnifiedDatabase() → Keyed Database
```

### Problem

Many core application functions still have fallback code that reads from the Legacy Unified Database. When the Keyed Database is loaded from disk (Option B), some functions work correctly via the compatibility layer, but others fall back to the Legacy structure (which is empty), causing failures.

Additionally, a duplicate `getAllSelectedEntities()` function in unifiedDatabasePersistence.js overwrites the browser's version and returns incomplete entityWrapper objects, breaking View Details and other features.

---

## Migration Phases

### Phase 1: Remove Competing Function

**File:** `scripts/unifiedDatabasePersistence.js`

**Current State:**
- Lines 688-711: Defines `getAllSelectedEntities()` that returns INCOMPLETE entityWrappers
- Line 739: Exports to `window.getAllSelectedEntities`, overwriting browser's version

**entityWrapper comparison:**

| Property | Browser Version | Persistence Version |
|----------|-----------------|---------------------|
| source | ✅ 'VisionAppraisal' or 'Bloomerang' | ✅ Same |
| sourceKey | ✅ 'visionappraisal' or 'bloomerang' | ❌ MISSING |
| entityType | ✅ 'Individual', 'AggregateHousehold', etc. | ❌ MISSING |
| index | ✅ Unified key | ❌ MISSING |
| key | ✅ Full unified key | ✅ Same |
| entity | ✅ Entity object | ✅ Same |

**Action:** DELETE lines 688-711 and line 739

**Result:** Browser's `getAllSelectedEntities()` becomes the only version. It already uses the Keyed Database via compatibility layer.

**Migration Impact:** Unblocks View Details button. Does not directly migrate toward Keyed Database but removes a blocker.

**MANDATORY TESTING AFTER PHASE 1:**
```
1. Refresh browser
2. Click "📂 Load Unified Database" button
3. Wait for "Show All" to populate
4. Click on any entity row to select it
5. Click "View Details" button
6. EXPECTED: Details window opens WITHOUT error
7. VERIFY: Entity type badge displays correctly (not "undefined")
```

---

### Phase 2: Remove Legacy Fallbacks from unifiedEntityBrowser.js

**File:** `scripts/unifiedEntityBrowser.js`

#### 2A: getAllSelectedEntities()

**Current State (lines 279-385):**
```javascript
function getAllSelectedEntities() {
    // Path A: Keyed Database (lines 281-309)
    if (typeof getFilteredEntities === 'function' && typeof isEntityDatabaseLoaded === 'function') {
        // Uses compatibility layer → Keyed Database
        // Returns COMPLETE entityWrappers
    }

    // Path B: Legacy Fallback (lines 311-385)
    // Navigates workingLoadedEntities.visionAppraisal and workingLoadedEntities.bloomerang
    // This is 70+ lines of legacy code
}
```

**Action:** DELETE lines 311-385 (the entire legacy fallback section)

**Result:** Function ONLY works with Keyed Database. Returns error if Keyed Database not loaded.

#### 2B: generateUnifiedStats()

**Current State (around lines 3190-3265):**
```javascript
function generateUnifiedStats() {
    // Path A: Keyed Database (lines ~3200-3223)
    if (isEntityDatabaseLoaded()) {
        // Uses unifiedEntityDatabase.metadata
    }

    // Path B: Legacy Fallback (lines 3224-3265)
    } else if (window.workingLoadedEntities && workingLoadedEntities.status === 'loaded') {
        // Navigates legacy structure
    }
}
```

**Action:** DELETE lines 3224-3265 (the legacy fallback section)

**Result:** Stats generation ONLY works with Keyed Database.

**Migration Impact:** Browser functions now REQUIRE Keyed Database. Enforces migration.

**MANDATORY TESTING AFTER PHASE 2:**
```
1. Refresh browser
2. Click "📂 Load Unified Database" button
3. Wait for load to complete
4. Click "Show All" button - VERIFY: Entities display correctly
5. Change Data Source dropdown to "VisionAppraisal" - VERIFY: Only VA entities shown
6. Change Data Source dropdown to "Bloomerang" - VERIFY: Only Bloomerang entities shown
7. Change Entity Type dropdown to "Individual" - VERIFY: Only Individuals shown
8. Click "View Stats" button - VERIFY: Stats popup displays correctly with counts
9. Search for a known entity name - VERIFY: Search results display
10. Select an entity and click "View Details" - VERIFY: Still works
```

---

### Phase 3: Remove Legacy Fallback from universalEntityMatcher.js

**File:** `scripts/matching/universalEntityMatcher.js`

**Current State (lines 680-706):**
```javascript
function getAllEntities() {
    // Path A: Keyed Database (lines 682-684)
    if (typeof getAllEntitiesArray === 'function') {
        return getAllEntitiesArray();  // Uses compatibility layer
    }

    // Path B: Legacy Fallback (lines 686-706)
    const entities = [];
    if (window.workingLoadedEntities?.visionAppraisal?.entities) {
        // Navigate legacy structure...
    }
    if (window.workingLoadedEntities?.bloomerang) {
        // Navigate legacy structure...
    }
    return entities;
}
```

**Action:** DELETE lines 686-706 (the legacy fallback)

**Result:** Entity matcher ONLY works with Keyed Database.

**Migration Impact:** Matching operations require Keyed Database.

**MANDATORY TESTING AFTER PHASE 3:**
```
1. Refresh browser
2. Click "📂 Load Unified Database" button
3. Wait for load to complete
4. Click "Show All" and select any Individual entity
5. Click "Analyze Matches" button
6. EXPECTED: Match analysis window opens with comparison results
7. VERIFY: Matches display with scores
8. Click "Reconcile" on any match
9. EXPECTED: Reconciliation modal opens with detailed breakdown
```

---

### Phase 4: Migrate entityRenderer.js

**File:** `scripts/entityRenderer.js`

**Current State (lines 1289-1326):**
```javascript
function findHouseholdMembersFallback(householdLocationId) {
    // Search VisionAppraisal individuals (lines 1289-1306)
    if (workingLoadedEntities.visionAppraisal.loaded && workingLoadedEntities.visionAppraisal.entities) {
        workingLoadedEntities.visionAppraisal.entities.forEach((entity, index) => {
            // ...
        });
    }

    // Search Bloomerang individuals (lines 1309-1326)
    if (workingLoadedEntities.bloomerang && workingLoadedEntities.bloomerang.loaded &&
        workingLoadedEntities.bloomerang.individuals && workingLoadedEntities.bloomerang.individuals.entities) {
        Object.entries(workingLoadedEntities.bloomerang.individuals.entities).forEach(([key, entity]) => {
            // ...
        });
    }
}
```

**Action:** REWRITE to use Keyed Database:
```javascript
function findHouseholdMembersFallback(householdLocationId) {
    const members = [];

    // Use compatibility layer to get all Individual entities
    const individuals = getFilteredEntities('all', 'Individual');

    for (const [key, entity] of Object.entries(individuals)) {
        const individualLocationId = getEntityLocationIdentifier(entity);
        if (individualLocationId && householdLocationId === individualLocationId) {
            const isVisionAppraisal = key.startsWith('visionAppraisal:');
            members.push({
                source: isVisionAppraisal ? 'VisionAppraisal' : 'Bloomerang',
                sourceKey: isVisionAppraisal ? 'visionappraisal' : 'bloomerang',
                entityType: 'Individual',
                index: key,
                key: key,
                entity: entity
            });
        }
    }

    return { members: members, foundViaFallback: members.length > 0 };
}
```

**Migration Impact:** Household member search uses Keyed Database.

**MANDATORY TESTING AFTER PHASE 4:**
```
1. Refresh browser
2. Click "📂 Load Unified Database" button
3. Wait for load to complete
4. Click "Show All"
5. Filter to Entity Type = "AggregateHousehold"
6. Select any AggregateHousehold entity
7. Click "View Details" button
8. EXPECTED: Details window opens
9. VERIFY: "Household Members" section displays correctly (if household has members)
10. VERIFY: Individual members listed with their details
```

---

### Phase 5: Migrate loadAllEntitiesButton.js

**File:** `scripts/loadAllEntitiesButton.js`

#### 5A: Entity Counting (lines 134-138)

**Current State:**
```javascript
const vaCount = workingLoadedEntities.visionAppraisal.entities?.length || 0;
const bloomerangCount =
    (workingLoadedEntities.bloomerang.individuals?.metadata?.totalEntities || 0) +
    (workingLoadedEntities.bloomerang.households?.metadata?.totalEntities || 0) +
    (workingLoadedEntities.bloomerang.nonhuman?.metadata?.totalEntities || 0);
```

**Action:** REWRITE to use Keyed Database metadata:
```javascript
const stats = unifiedEntityDatabase?.metadata;
const vaCount = stats?.sources?.visionAppraisal?.count || 0;
const bloomerangCount = stats?.sources?.bloomerang?.count || 0;
```

#### 5B: buildEntityLookupIndex() (lines 367-420)

**Current State:** Builds `workingLoadedEntities.entityIndex` by iterating through Legacy structure.

**Action:** DELETE the entire function.

**Rationale:** The Keyed Database IS the index. Entities are accessed directly by key: `unifiedEntityDatabase.entities[key]`. A separate index is redundant.

**Migration Impact:** Entity lookup and counting use Keyed Database.

**MANDATORY TESTING AFTER PHASE 5:**
```
1. Refresh browser
2. Click "Load All Entities Into Memory" button (NOT the disk load button)
3. Wait for loading to complete
4. EXPECTED: Console shows correct entity counts (VisionAppraisal: ~2317, Bloomerang: ~1780)
5. EXPECTED: No errors about entityIndex or buildEntityLookupIndex
6. Click "Show All" - VERIFY: Entities display
7. Click "View Stats" - VERIFY: Counts match what was loaded
```

---

### Phase 6: Wire the Load Flow

**Current State:**
- "Load All Entities Into Memory" creates Legacy Unified Database only
- User must manually click "Record Unified Database" to create Keyed Database in memory
- OR user clicks "Load Unified Database" to load from disk

**Action:** Modify "Load All Entities Into Memory" button handler to automatically call `buildUnifiedEntityDatabase()` after loading from source files.

**Location:** `index.html` or `loadAllEntitiesButton.js` - wherever the button handler is defined

**Result:** Loading from source files automatically populates the Keyed Database.

**Migration Impact:** Seamless transition - users always have Keyed Database available after loading.

**MANDATORY TESTING AFTER PHASE 6 (FINAL INTEGRATION TEST):**
```
TEST A: Load from Source Files
1. Refresh browser (clear any cached data)
2. Click "Load All Entities Into Memory" button
3. Wait for loading to complete
4. DO NOT click "Record Unified Database"
5. Click "Show All" - VERIFY: Entities display immediately
6. Click "View Stats" - VERIFY: Stats display correctly
7. Select entity and click "View Details" - VERIFY: Works
8. Select Individual and click "Analyze Matches" - VERIFY: Works
9. EXPECTED: Full functionality without manual "Record" step

TEST B: Load from Disk (regression test)
1. Refresh browser
2. Click "📂 Load Unified Database" button
3. Repeat steps 5-8 above
4. EXPECTED: Full functionality from disk-loaded database

TEST C: Both Paths Equivalent
1. Compare entity counts from Test A and Test B
2. EXPECTED: Same counts, same functionality
```

---

## Post-Migration Data Flow

**Option A: Fresh Load from Source Files**
```
Source Files → workingEntityLoader.js → Legacy Unified Database (temporary)
             → buildUnifiedEntityDatabase() → Keyed Database (canonical)
             → All Application Functions
```

**Option B: Load from Disk**
```
Google Drive → loadUnifiedDatabase() → Keyed Database (canonical)
             → All Application Functions
```

**Key Point:** The Legacy Unified Database becomes a temporary intermediate structure used ONLY during fresh loads from source files. All application functions read from the Keyed Database.

---

## Files Changed Summary

| Phase | File | Lines | Action |
|-------|------|-------|--------|
| 1 | unifiedDatabasePersistence.js | 688-711, 739 | DELETE |
| 2A | unifiedEntityBrowser.js | 311-385 | DELETE |
| 2B | unifiedEntityBrowser.js | 3224-3265 | DELETE |
| 3 | universalEntityMatcher.js | 686-706 | DELETE |
| 4 | entityRenderer.js | 1289-1326 | REWRITE |
| 5A | loadAllEntitiesButton.js | 134-138 | REWRITE |
| 5B | loadAllEntitiesButton.js | 367-420 | DELETE |
| 6 | index.html or loadAllEntitiesButton.js | button handler | MODIFY |

---

## Compatibility Layer Functions

These functions in `unifiedDatabasePersistence.js` bridge the gap and should be KEPT:

| Function | Purpose |
|----------|---------|
| `getEntityDatabase()` | Returns `unifiedEntityDatabase.entities` |
| `getFilteredEntities(source, type)` | Returns filtered subset of entities |
| `isEntityDatabaseLoaded()` | Returns true if Keyed Database is loaded |
| `getAllEntitiesArray()` | Returns all entities as array |
| `getEntitiesBySource(source)` | Returns entities filtered by source |
| `getEntitiesByType(type)` | Returns entities filtered by type |
| `hasLoadedData()` | Returns true if any data is available |
| `getUnifiedStatsData()` | Returns statistics object |

These functions work with the Keyed Database and provide a clean API for other modules.

---

## Testing Summary

**CRITICAL: Each phase MUST be tested before proceeding to the next phase.**

Detailed test instructions are included in each phase section above. Here's a quick reference:

| Phase | Primary Test Focus | Key Verification |
|-------|-------------------|------------------|
| 1 | View Details button | Opens without "undefined" error |
| 2 | Browser functions | Show All, filters, stats, search |
| 3 | Analyze Matches | Match analysis window works |
| 4 | Household members | Members display in detail view |
| 5 | Source file loading | Counts correct, no index errors |
| 6 | Full integration | Both load paths work identically |

**DO NOT PROCEED TO NEXT PHASE IF CURRENT PHASE TESTS FAIL.**

---

## Rollback Plan

If issues are discovered:

1. **Phase 1:** Re-add the deleted function (but fix it to include all entityWrapper properties)
2. **Phases 2-3:** Re-add fallback code (but this masks the underlying migration need)
3. **Phases 4-5:** Revert to legacy code

The safest approach is to proceed phase by phase, testing after each phase before continuing.

---

## Future Cleanup (After Migration Stable)

Once migration is complete and stable:

1. **Category 2 files (analysis/diagnostic):** Update to use Keyed Database or retire
2. **Category 3 files (tests):** Update to use Keyed Database
3. **Remove `workingLoadedEntities` structure:** Once nothing references it directly
4. **Simplify workingEntityLoader.js:** May be able to load directly into Keyed Database format

---

## Migration Status Summary

| Phase | Description | Status | Verified Date |
|-------|-------------|--------|---------------|
| 1 | Remove competing getAllSelectedEntities() from persistence | USER_VERIFIED_WORKING | Dec 14, 2025 |
| 2 | Remove legacy fallbacks from unifiedEntityBrowser.js | USER_VERIFIED_WORKING | Dec 14, 2025 |
| 3 | Remove legacy fallback from universalEntityMatcher.js | USER_VERIFIED_WORKING | Dec 14, 2025 |
| 4 | Migrate entityRenderer.js to use Keyed Database | USER_VERIFIED_WORKING | Dec 14, 2025 |
| 5 | Migrate loadAllEntitiesButton.js | USER_VERIFIED_WORKING | Dec 15, 2025 |
| 6 | Wire load flow to auto-build Keyed Database | USER_VERIFIED_WORKING | Dec 15, 2025 |

**Migration Complete**: All phases verified working as of December 15, 2025.

**Note**: Key preservation work (reference_keyPreservationPlan.md) was completed on Dec 15 to ensure database keys travel through the entire flow from findBestMatches() to reconcileMatch().

---

## Document Version

**Version:** 2.0
**Last Updated:** December 15, 2025
