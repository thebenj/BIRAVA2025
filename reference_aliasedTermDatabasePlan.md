# Aliased Term Database Architecture Plan

**Document Purpose**: Implementation plan for creating a general-purpose AliasedTermDatabase class with StreetNameDatabase as the first concrete implementation.

**Created**: January 26, 2026
**Status**: Phases 1-6 USER_VERIFIED_WORKING
**Last Updated**: January 27, 2026

---

## 1. EXECUTIVE SUMMARY

### What We're Building

A general-purpose database system for managing collections of `Aliased` objects (objects with a primaryAlias AttributedTerm and alternatives). Each object is stored as an individual Google Drive file, enabling:

- Asynchronous updates from different data sources
- Manual editing and maintenance
- Stable file IDs that persist across primary alias changes
- Fine-grained version control per object

### First Implementation: StreetNameDatabase

The StreetName collection will be the first to use this architecture, replacing the current single-file `window.blockIslandStreetDatabase`.

### Future Applications

This pattern will later be applied to:
- Name databases (IndividualName variations)
- Address databases
- Other Aliased object collections

---

## 2. STORAGE ARCHITECTURE

### Google Drive Structure

```
StreetName Database
├── Index File: 1QXYBgemrQuFy_wyX1hb_4eLhb7B66J1S
│   └── Contains: { primaryAlias → fileId } mappings + metadata
│
└── Object Folder: 1rHhgyxbiPOSw314kpo2MsFgSRQg5zQkC
    ├── [fileId1].json → StreetName object for "CORN NECK ROAD"
    ├── [fileId2].json → StreetName object for "OLD TOWN ROAD"
    ├── [fileId3].json → StreetName object for "BEACH AVENUE"
    └── ... (116 files total)
```

### Index File Format

```json
{
  "__format": "AliasedTermDatabaseIndex",
  "__version": "1.0",
  "__created": "2026-01-26T...",
  "__lastModified": "2026-01-26T...",
  "__objectType": "StreetName",
  "__folderFileId": "1rHhgyxbiPOSw314kpo2MsFgSRQg5zQkC",
  "__objectCount": 116,

  "entries": {
    "CORN NECK ROAD": {
      "fileId": "abc123...",
      "created": "2026-01-26T...",
      "lastModified": "2026-01-26T..."
    },
    "OLD TOWN ROAD": {
      "fileId": "def456...",
      "created": "2026-01-26T...",
      "lastModified": "2026-01-26T..."
    }
  }
}
```

### Individual Object File Format

Uses `serializeWithTypes()` output - the `__type` markers enable automatic recursive deserialization:

```json
{
  "__type": "StreetName",
  "primaryAlias": {
    "__type": "AttributedTerm",
    "term": "CORN NECK ROAD",
    "fieldName": "canonicalStreetName",
    "sourceMap": {
      "__type": "Map",
      "__data": [["BI_STREET_DATABASE", {"index": 0, "identifier": "canonical"}]]
    }
  },
  "alternatives": {
    "__type": "Aliases",
    "homonyms": [
      {
        "__type": "AttributedTerm",
        "term": "CORN NECK RD",
        "fieldName": "streetVariation",
        "sourceMap": { ... }
      }
    ],
    "synonyms": [],
    "candidates": []
  }
}
```

When loaded with `deserializeWithTypes()`, this automatically reconstructs a fully functional StreetName instance.

---

## 3. CLASS HIERARCHY

```
AliasedTermDatabase (abstract parent class)
│
├── Properties:
│   ├── entries: Map<string, {object: Aliased, fileId: string}>
│   │   └── Key: primaryAlias.term (uppercase, trimmed)
│   ├── folderFileId: string
│   ├── databaseFileId: string
│   ├── objectType: string (e.g., "StreetName")
│   ├── version: string
│   ├── created: string (ISO timestamp)
│   ├── lastModified: string (ISO timestamp)
│   └── _variationCache: Map<string, string> (variation → primaryKey, built on load)
│
├── Core Methods:
│   ├── async loadFromDrive()
│   ├── async save()
│   ├── async saveObject(primaryKey)
│   ├── lookup(term, threshold = 0.80) → Aliased | null
│   ├── has(term) → boolean
│   ├── get(primaryKey) → Aliased | null
│   ├── getFileId(primaryKey) → string | null
│   ├── async add(object) → string (returns fileId)
│   ├── async remove(primaryKey) → boolean
│   └── async changePrimaryAlias(oldPrimary, newPrimary, moveOldTo = 'homonyms')
│
├── Internal Methods:
│   ├── _buildVariationCache()
│   ├── _normalizeKey(term) → string
│   ├── _generateFileName(primaryKey) → string
│   ├── async _createObjectFile(object) → string (fileId)
│   ├── async _updateObjectFile(fileId, object)
│   ├── async _moveToDeleted(fileId)
│   └── async _saveIndex()
│
└── Serialization:
    └── Uses serializeWithTypes() / deserializeWithTypes() from classSerializationUtils.js
        (NO custom serialize/deserialize methods - system handles automatically)

StreetNameDatabase extends AliasedTermDatabase
│
├── Constructor:
│   └── Sets objectType = "StreetName"
│
└── Street-Specific Methods (if any needed):
    └── (none currently identified - parent class handles all operations)
```

---

## 4. IN-MEMORY STRUCTURE

After `loadFromDrive()`, the database contains:

```javascript
streetNameDatabase = {
  // Configuration
  folderFileId: "1rHhgyxbiPOSw314kpo2MsFgSRQg5zQkC",
  databaseFileId: "1QXYBgemrQuFy_wyX1hb_4eLhb7B66J1S",
  objectType: "StreetName",

  // Data
  entries: Map {
    "CORN NECK ROAD" => { object: StreetName, fileId: "abc123..." },
    "OLD TOWN ROAD" => { object: StreetName, fileId: "def456..." },
    // ... 116 entries
  },

  // Computed cache (rebuilt on load, not stored)
  _variationCache: Map {
    "CORN NECK ROAD" => "CORN NECK ROAD",
    "CORN NECK RD" => "CORN NECK ROAD",
    "CORN NECK" => "CORN NECK ROAD",
    // ... all variations point to their primary
  }
}
```

---

## 5. KEY OPERATIONS

### 5.1 Loading (Eager)

```javascript
async loadFromDrive() {
  // 1. Load index file
  const indexData = await fetchFromDrive(this.databaseFileId);

  // 2. For each entry in index, load the object file
  for (const [primaryKey, entry] of Object.entries(indexData.entries)) {
    const objectData = await fetchFromDrive(entry.fileId);
    const object = this._deserializeObject(objectData.object);
    this.entries.set(primaryKey, { object, fileId: entry.fileId });
  }

  // 3. Build variation cache
  this._buildVariationCache();
}
```

### 5.2 Lookup (with variation matching)

```javascript
lookup(term, threshold = 0.80) {
  const normalized = this._normalizeKey(term);

  // Fast path: exact match in variation cache
  if (this._variationCache.has(normalized)) {
    const primaryKey = this._variationCache.get(normalized);
    return this.entries.get(primaryKey)?.object || null;
  }

  // Slow path: similarity matching using compareTo()
  let bestMatch = null;
  let bestScore = threshold;

  for (const [primaryKey, entry] of this.entries) {
    const scores = entry.object.compareTo(term);
    const maxScore = Math.max(
      scores.primary,
      scores.homonym > 0 ? scores.homonym : 0,
      scores.candidate > 0 ? scores.candidate : 0
      // Note: synonyms excluded (unverified)
    );
    if (maxScore > bestScore) {
      bestScore = maxScore;
      bestMatch = entry.object;
    }
  }

  return bestMatch;
}
```

### 5.3 Change Primary Alias

```javascript
async changePrimaryAlias(oldPrimary, newPrimary, moveOldTo = 'homonyms') {
  const normalizedOld = this._normalizeKey(oldPrimary);
  const normalizedNew = this._normalizeKey(newPrimary);

  // 1. Get the entry
  const entry = this.entries.get(normalizedOld);
  if (!entry) throw new Error(`Primary alias not found: ${oldPrimary}`);

  // 2. Check new primary doesn't already exist
  if (this.entries.has(normalizedNew)) {
    throw new Error(`Primary alias already exists: ${newPrimary}`);
  }

  // 3. Update the object's primaryAlias
  const oldPrimaryAlias = entry.object.primaryAlias;
  entry.object.primaryAlias = new AttributedTerm(
    newPrimary,
    'MANUAL_EDIT',
    -1,
    'primaryAliasChange',
    oldPrimaryAlias.fieldName
  );

  // 4. Move old primary to alternatives (default: homonyms)
  if (moveOldTo && moveOldTo !== 'discard') {
    entry.object.alternatives.add(oldPrimaryAlias, moveOldTo);
  }

  // 5. Update the index (remove old key, add new key)
  this.entries.delete(normalizedOld);
  this.entries.set(normalizedNew, entry);

  // 6. Rebuild variation cache
  this._buildVariationCache();

  // 7. Save the object file (same fileId)
  await this._updateObjectFile(entry.fileId, entry.object);

  // 8. Save the index
  await this._saveIndex();

  return entry.fileId;
}
```

---

## 6. IMPLEMENTATION PHASES

### Phase 1: Create Base Classes ✅ WORKING
**Files created:**
- `scripts/databases/aliasedTermDatabase.js` - Parent class (~620 lines)

**Completed:**
1. ✅ Defined AliasedTermDatabase class with all properties and methods
2. ✅ Implemented Google Drive file operations (create, read, update, delete)
3. ✅ Implemented index management
4. ✅ Implemented variation cache building
5. ✅ Implemented lookup with similarity fallback
6. ✅ Added to index.html script tags
7. ✅ Added to CLASS_REGISTRY in classSerializationUtils.js

### Phase 2: Create StreetNameDatabase ✅ WORKING
**Files created:**
- `scripts/databases/streetNameDatabase.js` - StreetName implementation (~730 lines)

**Completed:**
1. ✅ Extended AliasedTermDatabase with StreetName-specific config
2. ✅ Pre-configured Google Drive IDs
3. ✅ Added street-specific methods (lookupStreet, findByPattern, getAllStreetNames, isKnownStreet)
4. ✅ Created global instance `window.streetNameDatabase`
5. ✅ Added convenience loader `loadStreetNameDatabase()`

### Phase 3: Migration Tool ✅ WORKING
**Completed:**
1. ✅ Created `previewStreetNameMigration()` - preview without changes
2. ✅ Created `migrateStreetNameDatabase()` - creates individual files
3. ✅ Created `verifyStreetNameMigration()` - compares legacy vs new
4. ✅ **Migration ran successfully: 122 streets migrated, 0 failed**

### Phase 4: Parallel Operation ✅ WORKING
**Completed:**
1. ✅ Created `window.streetNameDatabase` (new system)
2. ✅ Kept `window.blockIslandStreetDatabase` operational (old system)
3. ✅ Added `enableParallelOperation()`, `disableParallelOperation()`
4. ✅ Added `parallelLookup()`, `runFullParallelComparison()`
5. ✅ Added `getParallelOperationReport()`, `clearParallelStats()`
6. ✅ **Parallel test: 225 lookups, 225 matches, 0 discrepancies, 100% match rate**

### Phase 5: Update Street Name Browser ✅ WORKING
**Status:** Fully integrated with new StreetNameDatabase

**Completed:**
1. ✅ Browser switched from legacy `blockIslandStreetDatabase` to new `streetNameDatabase`
2. ✅ Change Primary Alias with category selection popup (homonyms/candidates/synonyms/discard)
3. ✅ Delete Alias feature with [X] buttons next to each alias
4. ✅ All changes auto-save to Google Drive (no manual Save button needed)
5. ✅ Parallel loading implemented (batches of 15, ~5-10x faster)
6. ✅ Removed obsolete UI (File ID input, Save Changes button)
7. ✅ Fixed bug: new primary properly removed from alternatives when promoted
8. ✅ Clean alias display (no source info clutter)

### Phase 6: Full Migration ✅ USER_VERIFIED_WORKING
**Status:** Complete - all code paths tested and verified

**Completed:**
1. ✅ Updated aliasClasses.js: biStreetName lookup uses window.streetNameDatabase
2. ✅ Updated addressProcessing.js: loadBlockIslandStreetsFromDrive() loads individual-file database
3. ✅ Backward compatibility: window.blockIslandStreetDatabase aliased to new database
4. ✅ Migration/parallel tools restored (preserved for VA reconciliation workflow template)
5. ✅ Loading optimization: skips reload if already loaded
6. ✅ Browser state sync: ensureBrowserDatabaseSynced() helper added
7. ✅ All loading paths verified: entity→bloomerang, bloomerang→entity, browser→other

**Files Changed:**
- `scripts/objectStructure/aliasClasses.js` - biStreetName lookup (lines ~1873-1913)
- `scripts/address/addressProcessing.js` - loadBlockIslandStreetsFromDrive() function

**Step A0 Impact Analysis:**
The VA download process (Step A0 buttons) is NOT affected because:
- Second Button writes to VA Processing Street File (1lsrd0alv9O01M_qlsiym3cB0TRIdgXI9)
- Phase 6 changes affect StreetName Alias Database loading (separate file)
- These are two distinct files per the two-file architecture (see reference_streetNameAliasArchitecture.md Section 2)

**VA Reconciliation Workflow (Future):**
Migration tools preserved as template for future VA reconciliation:
- When VA is next downloaded, compare new streets against current database
- Add new streets, flag removed streets
- See reference_streetNameAliasArchitecture.md Section 14 "VA Post-Process Button"

---

## 7. BACKWARD COMPATIBILITY

During transition (Phases 4-5):

```javascript
// Old system (keep working)
window.blockIslandStreetDatabase.lookup('CORN NECK RD')

// New system (run in parallel)
window.streetNameDatabase.lookup('CORN NECK RD')

// Comparison logging
function lookupWithComparison(term) {
  const oldResult = window.blockIslandStreetDatabase?.lookup(term);
  const newResult = window.streetNameDatabase?.lookup(term);

  if (oldResult?.primaryAlias?.term !== newResult?.primaryAlias?.term) {
    console.warn(`[MIGRATION] Lookup mismatch for "${term}":`,
      { old: oldResult?.primaryAlias?.term, new: newResult?.primaryAlias?.term });
  }

  return newResult || oldResult;
}
```

---

## 8. BROWSER SUPPORT FOR CHANGE PRIMARY ALIAS

Add to Street Name Browser UI:

```
┌─────────────────────────────────────────────────────┐
│ Change Primary Alias                                │
├─────────────────────────────────────────────────────┤
│ Current Primary: [CORN NECK RD          ]           │
│ New Primary:     [________________________]         │
│                                                     │
│ Move old primary to:                                │
│ ○ Homonyms (default)                                │
│ ○ Synonyms                                          │
│ ○ Candidates                                        │
│ ○ Discard                                           │
│                                                     │
│ [Change Primary Alias]                              │
└─────────────────────────────────────────────────────┘
```

---

## 9. FILE LOCATIONS

| File | Purpose |
|------|---------|
| `scripts/databases/aliasedTermDatabase.js` | Parent class (NEW) |
| `scripts/databases/streetNameDatabase.js` | StreetName implementation (NEW) |
| `scripts/streetNameBrowser.js` | Browser UI (UPDATE) |
| `scripts/address/addressProcessing.js` | biStreetName lookup (UPDATE) |
| `scripts/streetNameDatabaseConverter.js` | Migration tool (UPDATE) |

---

## 10. SERIALIZATION REQUIREMENTS

**CRITICAL**: The AliasedTermDatabase and all subclasses MUST follow the existing serialization architecture established in `scripts/utils/classSerializationUtils.js`.

### Principles

1. **No Explicit Property Specification**: Serialization must NOT require listing class properties explicitly. The system automatically serializes all properties.

2. **Recursive Deserialization**: When an object contains nested class instances (e.g., StreetName containing AttributedTerm objects in primaryAlias and alternatives), deserialization automatically reconstructs the full object hierarchy.

3. **Type Preservation**: All class instances are tagged with `__type` property during serialization, enabling automatic restoration.

### Implementation Requirements

1. **Add to CLASS_REGISTRY** (in `classSerializationUtils.js`):
   ```javascript
   'AliasedTermDatabase': typeof AliasedTermDatabase !== 'undefined' ? AliasedTermDatabase : null,
   'StreetNameDatabase': typeof StreetNameDatabase !== 'undefined' ? StreetNameDatabase : null,
   ```

2. **Use Standard Functions**:
   - Serialization: `serializeWithTypes(object)` - NOT `JSON.stringify()`
   - Deserialization: `deserializeWithTypes(jsonString)` - NOT `JSON.parse()`

3. **Individual Object Files**: Each StreetName file uses `serializeWithTypes()` to preserve the full StreetName object hierarchy including:
   - `primaryAlias` (AttributedTerm)
   - `alternatives.homonyms` (Array of AttributedTerm)
   - `alternatives.synonyms` (Array of AttributedTerm)
   - `alternatives.candidates` (Array of AttributedTerm)

4. **Index File**: The index file stores metadata and mappings only (not full objects), so standard JSON is acceptable. But entries that reference class types should still use `__type` markers for consistency.

### Example: Stored StreetName File

```json
{
  "__type": "StreetName",
  "primaryAlias": {
    "__type": "AttributedTerm",
    "term": "CORN NECK ROAD",
    "fieldName": "canonicalStreetName",
    "sourceMap": { ... }
  },
  "alternatives": {
    "__type": "Aliases",
    "homonyms": [
      {
        "__type": "AttributedTerm",
        "term": "CORN NECK RD",
        ...
      }
    ],
    "synonyms": [],
    "candidates": []
  }
}
```

When loaded with `deserializeWithTypes()`, this automatically becomes a fully functional StreetName instance with all methods available.

---

## 11. RESOLVED DESIGN QUESTIONS

1. **File naming**: Files will be named by their primaryAlias (human-readable in Google Drive)
   - Example: `CORN_NECK_ROAD.json`
   - Spaces replaced with underscores, special characters URL-encoded

2. **Concurrent edits**: No protection needed. Each save overwrites. Users deal with any conflicts.
   - Rationale: This is a rare edge case not worth the complexity

3. **Deletion behavior**: Move deleted files to a "deleted" folder (recoverable)
   - Deleted folder ID: `1J7YFTy9zUW_SP1hbOeenTM2LhNmbgOUj`

---

## 12. GOOGLE DRIVE REFERENCES (COMPLETE)

| Resource | File ID |
|----------|---------|
| StreetName Database Index | `1QXYBgemrQuFy_wyX1hb_4eLhb7B66J1S` |
| StreetName Object Folder | `1rHhgyxbiPOSw314kpo2MsFgSRQg5zQkC` |
| Deleted Objects Folder | `1J7YFTy9zUW_SP1hbOeenTM2LhNmbgOUj` |
| Current Single-File DB | `1quMdB4qAcnR4oaepSbZEmVWUqYO5_nxK` (to be deprecated) |

---

## 13. PHASE 6 IMPLEMENTATION DETAILS

### Files Changed

| File | Change |
|------|--------|
| `scripts/objectStructure/aliasClasses.js` | biStreetName lookup now uses `window.streetNameDatabase` |
| `scripts/address/addressProcessing.js` | `loadBlockIslandStreetsFromDrive()` loads new individual-file database |

### Backward Compatibility

- `window.blockIslandStreetDatabase` aliased to `window.streetNameDatabase`
- Legacy code referencing old variable continues to work

### Migration Tools

Migration functions restored and preserved as template for future VA reconciliation workflow.

### Step A0 Impact

**NOT AFFECTED** - VA download process uses separate VA Processing Street File (`1lsrd0alv9O01M_qlsiym3cB0TRIdgXI9`). The StreetName alias database is independent.

### Phase Status Summary

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | WORKING | AliasedTermDatabase base class created |
| 2 | WORKING | StreetNameDatabase class created |
| 3 | WORKING | Migration ran (122 streets migrated, 0 failed) |
| 4 | WORKING | Parallel operation verified |
| 5 | WORKING | Browser fully integrated with new database |
| 6 | USER_VERIFIED_WORKING | Full migration complete, loading optimization added |

---

## DOCUMENT END

**Status**: Phases 1-6 USER_VERIFIED_WORKING

**Current State**: Task 2 COMPLETE - all phases verified working
- Phase 6 verified: Entity building, Bloomerang processing, browser all work correctly
- Loading optimization: Database only loads once per session regardless of entry point
- Browser sync: Automatically recognizes database loaded by other processes
- Step A0: NOT affected (uses separate VA Processing Street File)

**Next Step**: Task 3 (Phonebook Integration & VA Reconciliation)
