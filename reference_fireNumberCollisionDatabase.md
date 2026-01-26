# Fire Number Collision Database - Implementation Reference

## Overview
System to capture, store, and manage PID/fire number collisions where multiple VisionAppraisal PIDs share the same fire number (same physical property, different owners/parcels).

## Google Sheet
- **File ID**: `1exdeASVuntM6b_nyJUNUO0_EqRX8Jjz0`
- **Tab**: CollisionData

### Sheet Format
| Column | Field | Description |
|--------|-------|-------------|
| A | FireNumber | Base fire number (no suffix) - e.g., "72", "1510" |
| B | EntityKeys | Pipe-delimited entity keys |
| C | PIDs | Pipe-delimited PIDs |
| D | EntityCount | Number of entities at this fire number |
| E | LastUpdated | ISO timestamp |
| F | ManuallyAdded | "true" if manually created |

## In-Memory Data Structure

```javascript
fireNumberCollisionDatabase = {
    byFireNumber: Map<string, CollisionRecord>,  // Primary index
    byEntityKey: Map<string, string>,            // Secondary index: key -> fireNumber
    metadata: {
        loaded: boolean,
        lastLoadTime: Date,
        sourceFileId: string,
        hasUnsavedChanges: boolean,
        initializationMode: string
    }
}

CollisionRecord = {
    fireNumber: string,
    entityKeys: string[],
    pids: string[],
    lastUpdated: string,
    manuallyAdded: boolean
}
```

## Initialization Modes

Called at start of any process that writes to the database:

| Mode | Action |
|------|--------|
| **REINITIALIZE** | Clear all data, repopulate from scratch |
| **CLEAR_KEYS** | Keep fire number records, clear entityKeys/pids arrays, then repopulate |
| **INCREMENTAL** | Keep existing data, only add new keys not already present |

## Files

| File | Purpose |
|------|---------|
| `scripts/fireNumberCollisionDatabase.js` | Core database management |
| `scripts/fireNumberCollisionBrowser.js` | Browser UI |
| `scripts/dataSources/fireNumberCollisionHandler.js` | Modified to capture collisions |

## Key Functions

### fireNumberCollisionDatabase.js
- `promptCollisionDatabaseMode()` - Show initialization mode dialog
- `initializeCollisionDatabase(mode)` - Initialize with selected mode
- `loadFromGoogleSheets()` - Load from sheet
- `saveToGoogleSheets()` - Save to sheet
- `registerCollision(fireNumber, entityKeys, pids)` - Add/update collision
- `getByFireNumber(fireNumber)` - Lookup by fire number
- `getByEntityKey(entityKey)` - Lookup by entity key
- `addEntityKeyManually(fireNumber, entityKey, pid)` - Manual addition
- `getAllCollisions()` - Get all records
- `getStats()` - Summary statistics

### fireNumberCollisionBrowser.js
- Search by fire number or entity key
- Display collision records with entity counts
- Manual add/remove entity keys
- Save/load integration

## Collision Capture Point

In `fireNumberCollisionHandler.js` at line ~494 (after collision detected):

```javascript
// Collision detected - existing entities found for this fire number
const existingEntities = getAllEntitiesForFireNumber(baseFireNumber);

// >>> CAPTURE POINT: Register collision to database <<<
if (typeof registerFireNumberCollision === 'function') {
    const existingKeys = existingEntities.map(e => getEntityKey(e.entity));
    const newKey = getEntityKey(newEntity);
    const existingPids = existingEntities.map(e => extractPidFromEntity(e.entity));
    const newPid = extractPidFromEntity(newEntity);

    registerFireNumberCollision(baseFireNumber, [...existingKeys, newKey], [...existingPids, newPid]);
}
```

## Future Use

After implementation, entity grouping process will reference this database to:
1. Identify entities at known collision fire numbers
2. Prevent false groupings between entities at same physical location but different owners
3. Use the entity keys to apply special handling during matching

## Implementation Status

- [x] Create fireNumberCollisionDatabase.js (tested, working)
- [x] Create fireNumberCollisionBrowser.js (tested, working)
- [x] Modify fireNumberCollisionHandler.js to capture collisions (tested, working)
- [x] Add browser section to index.html (tested, working)
- [x] Auto-save at end of VA processing (tested, working)
- [x] Test initialization modes (REINITIALIZE tested)
- [ ] Test browser search/edit functionality
- [ ] Test CLEAR_KEYS and INCREMENTAL modes

## Testing Instructions

### Step 1: Load Browser and Verify UI
1. Start server: `cd BIRAVA2025 && node servers/server.js`
2. Open http://127.0.0.1:1337/
3. Scroll to "Fire Number Collision Browser" section
4. Click "Load Collision Database" - should show "Loaded 0 collision records" (file is empty/uninitialized)

### Step 2: Process VisionAppraisal Data to Populate Database
1. In the application, click "Create Entities from Processed Data" (button b)
2. When processing starts, the initialization mode dialog will appear - select one of:
   - **Reinitialize**: Start fresh (use this for first run)
   - **Clear Keys**: Keep fire numbers but clear entity keys
   - **Incremental**: Add only new keys to existing records
3. As collisions are detected during processing, they will be captured automatically
4. At end of processing, collision database auto-saves to Google Drive (no manual save needed)

### Step 3: Verify Browser Functionality
1. Search by fire number (e.g., "72")
2. Search by entity key (e.g., "visionAppraisal:FireNumber")
3. Select a record to view details
4. Test manual add/remove of entity keys

## Session 54 Notes (2026-01-24)
- Initial implementation coded
- Changed from Google Sheets to Google Drive JSON file storage
- JSON structure uses proper arrays (not pipe-delimited strings)
- File ID: 1exdeASVuntM6b_nyJUNUO0_EqRX8Jjz0
- Browser UI added to index.html
- Collision capture added to fireNumberCollisionHandler.js at line ~494
- Added auto-save at end of processAllVisionAppraisalRecordsWithAddresses()
- Tested: 20 collision records captured and saved successfully
