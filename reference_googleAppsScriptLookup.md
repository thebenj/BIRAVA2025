# Google Apps Script EntityGroup Lookup - Complete Documentation

**Created**: December 19, 2025
**Last Updated**: December 19, 2025
**Status**: WORKING - 3-way split implemented, Apps Script functional

---

## Overview

This system enables looking up EntityGroup data from within Google Sheets using Google Apps Script. Given an entity key, it outputs the full 54-column CSV report rows for all EntityGroups containing that entity.

**Primary Use Case**: Investigate specific entities or groups without running the full browser application.

---

## Architecture

### Problem Solved: Google Apps Script 50MB File Limit

Google Apps Script's `getBlob().getDataAsString()` has a **50 MB file size limit**.

The unified entity database is **~91 MB**, exceeding this limit.

### Solution: 3-Way Database Split

The unified database is split into three files, each under 50MB:

| File | Contents | Typical Size |
|------|----------|--------------|
| VisionAppraisal Part 1 | FireNumber < 800 | ~25 MB |
| VisionAppraisal Part 2 | FireNumber >= 800 | ~25 MB |
| Bloomerang | All Bloomerang entities | ~40 MB |

---

## Browser-Side Components

### Source Splitter Script
**File**: `scripts/unifiedDatabaseSourceSplitter.js`
**Loaded via**: `index.html` (script tag after unifiedDatabasePersistence.js)

**Key Functions**:
- `splitUnifiedDatabaseThreeWay()` - Main function: splits into 3 files and saves to Google Drive
- `splitDatabaseBySourceThreeWay()` - In-memory 3-way split only
- `splitUnifiedDatabaseBySource()` - Original 2-way split (deprecated for Apps Script use)

### UI Button
**Location**: index.html, in the "Unified Entity Database Management" section

**Button**: "Split Database for Apps Script" (green)
- Checks unified database is loaded
- Confirms with user before proceeding
- Splits database 3-way by fire number threshold (800)
- Saves all 3 files to Google Drive
- Displays file IDs in alert and console
- Stores file IDs in localStorage

**Handler Function**: `splitDatabaseForAppsScript()` in index.html

### localStorage Keys
After running the split:
```javascript
localStorage.getItem('splitDb_visionAppraisal1_fileId')  // VA Part 1
localStorage.getItem('splitDb_visionAppraisal2_fileId')  // VA Part 2
localStorage.getItem('splitDb_bloomerang_fileId')        // Bloomerang
```

---

## Google Apps Script Component

### File Location
**File**: `googleAppsScripts/EntityGroupLookup.gs`

### Purpose
Runs inside Google Sheets to look up entities by key and output their group membership data in 54-column CSV format.

### Configuration
```javascript
const CONFIG = {
  VISION_APPRAISAL_1_FILE_ID: '',  // FireNumber < 800
  VISION_APPRAISAL_2_FILE_ID: '',  // FireNumber >= 800
  BLOOMERANG_FILE_ID: '',          // Bloomerang entities
  ENTITYGROUP_DATABASE_FILE_ID: '', // EntityGroup database
  ENTITYGROUP_REFERENCE_FILE_ID: '' // Optional lightweight reference
};
```

### Menu Functions (Entity Lookup menu)
| Function | Description |
|----------|-------------|
| Initialize All Databases | Loads all 4 files, builds lookup index |
| Lookup Selected Key | Looks up entity in selected cell, outputs rows |
| Lookup All Keys (Column A) | Batch processes all keys in column A |
| Write CSV Headers | Writes 54 column headers starting at C1 |
| Clear Output | Clears all output columns (C onwards) |
| Show Database Status | Shows load status and configuration |

### Custom Function
```
=LOOKUP_ENTITY_GROUP("visionAppraisal:FireNumber:123")
```
Returns all CSV rows for the group(s) containing that entity. Output spans multiple rows automatically.

### Output Format
- **Column A**: Input entity key
- **Column B**: Empty (spacer)
- **Columns C-BD**: 54-column CSV data per `reference_csvExportSpecification.md`

### Row Types Output
For each matching group:
1. `consensus` - Synthesized group data with alternatives
2. `founding` - Founding member entity data
3. `member` - Other member entities (one row each)
4. `nearmiss` - Near miss entities (one row each)

---

## Setup Instructions

### Step 1: Generate Split Files (Browser)
1. Open the BIRAVA2025 browser application
2. Click "Load Unified Database" to load the full database
3. Click "Split Database for Apps Script" (green button)
4. Note the 3 file IDs displayed in the alert

### Step 2: Configure Apps Script
1. Create a new Google Sheet
2. Go to **Extensions > Apps Script**
3. Paste the contents of `googleAppsScripts/EntityGroupLookup.gs`
4. Update the `CONFIG` object with your file IDs:
   - `VISION_APPRAISAL_1_FILE_ID`
   - `VISION_APPRAISAL_2_FILE_ID`
   - `BLOOMERANG_FILE_ID`
   - `ENTITYGROUP_DATABASE_FILE_ID` (from entityGroupBrowser localStorage)
5. Save the script

### Step 3: Initialize and Use
1. Reload the Google Sheet
2. Use menu: **Entity Lookup > Initialize All Databases** (takes ~30-60 seconds)
3. Enter entity keys in column A
4. Use menu: **Entity Lookup > Lookup Selected Key** or **Lookup All Keys**

---

## Technical Details

### Lookup Index Structure
The Apps Script builds an in-memory index mapping entity keys to group indices:
```javascript
entityToGroupIndex[entityKey] = [
  { groupIndex: 0, role: 'founding' },
  { groupIndex: 5, role: 'member' }
]
```

### Deserialization
The script handles the browser's `serializeWithTypes()` format:
- Unwraps `__type` / `__data` wrappers
- Converts serialized Maps to plain objects
- Preserves `__type` on entities for type detection

### CSV Generation
Ported directly from `scripts/entityGroupBrowser.js` (lines 1398-1949):
- `generateCSVRow()` - Creates single 54-element array
- `generateEntityGroupRows()` - Creates all rows for a group
- `generateRowsForEntityKey()` - Entry point for lookups

---

## Debugging

### debugLookup() Function
Run from Apps Script editor to diagnose issues:
```
View > Logs (or Ctrl+Enter)
```

Shows:
- Database load status
- Sample key lookup
- Group structure details
- Member entity lookup results
- Generated row counts

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "File exceeds maximum file size" | Single file > 50MB | Use 3-way split |
| Member lookup returns NULL | Entity file not loaded | Check file IDs, re-run split |
| Only 1 row output | Missing entity data | Check all 3 entity files loaded |
| NOT_FOUND for valid key | Index not built | Run Initialize All Databases |

---

## File Reference

### Browser Files
| File | Purpose |
|------|---------|
| `scripts/unifiedDatabaseSourceSplitter.js` | Split database into files |
| `index.html` | UI button and handler |

### Apps Script Files
| File | Purpose |
|------|---------|
| `googleAppsScripts/EntityGroupLookup.gs` | Complete Apps Script |

### Related Reference Documents
| File | Purpose |
|------|---------|
| `reference_csvExportSpecification.md` | 54-column format specification |
| `scripts/entityGroupBrowser.js` | Source of CSV generation logic |

---

## Maintenance Notes

### When to Re-run Split
- After rebuilding the unified entity database
- After significant entity data changes
- If Apps Script reports missing entities

### File ID Management
File IDs are stored in browser localStorage but must be manually copied to the Apps Script CONFIG. Consider keeping a record of current IDs.

### EntityGroup Database Dependency
The Apps Script requires both:
1. Entity databases (3 split files) - for entity details
2. EntityGroup database - for group membership

Both must be current and consistent for accurate lookups.

---

**Document Version**: 3.0
**Status**: WORKING - Full 3-way split and Apps Script implementation complete
