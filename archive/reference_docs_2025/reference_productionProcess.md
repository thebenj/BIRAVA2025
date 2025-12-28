# Production Process - Entity Database Rebuild

## Purpose
This document describes the complete steps to rebuild the entity database from fresh VisionAppraisal and Bloomerang data.

**Last Updated**: December 24, 2025

---

## Prerequisites

- Google Drive authentication active
- Access to VisionAppraisal website
- Fresh `all data.csv` export from Bloomerang (for Step A5)

---

## Browser UI Organization

The browser interface is organized into two collapsible phases:

- **Phase A: Rebuild from Source** - Steps A0-A6 for processing raw VA and Bloomerang data
- **Phase B: Work with Saved Data** - Steps B1-B3 for loading saved databases and generating reports

---

# Phase A: Rebuild from Source

## Step A0: Run First Three Buttons (Prepare PID List)

**Buttons**: "First Button" → "Second Button" → "Third Button"

**What it does**: Prepares the list of PIDs to download from VisionAppraisal website

**PID Folder ID Location**: `parameters.pidFilesParents` in `scripts/baseCode.js`
- Current value: `1qgnE1FW3F6UG7YS4vfGBm9KzX8TDuBCl`

---

## Step A1: Download PIDs from VisionAppraisal Website

**Button**: "Fourth Button" (Button 4)

**What it does**:
- Scrapes VisionAppraisal website for each PID
- Extracts data including assessment/appraisal values from `MainContent_lblGenAssessment` and `MainContent_lblGenAppraisal`
- Saves individual JSON files to Google Drive folder

**Output**: Individual PID files saved to folder ID `parameters.pidFilesParents`

**Note**: The "Go Again" button retries failed PIDs from the previous run. VisionAppraisal scraping always has some failures, so multiple runs are typically needed.

---

## Step A2: Analyze and Clean Up PID Duplicates

**Button**: "Analyze PID Duplicates" (safe - analysis only)

**What it does**: Scans PID folder, identifies duplicate files by name, reports findings

**Button**: "Run PID Deduplication" (moves older duplicates)

**What it does**:
- Keeps newest version of each PID file
- Moves older duplicates to duplicates folder

**Folder IDs**:
- Source: `CLEANUP_DATA_SOURCES.PIDS_FOLDER` → references `parameters.pidFilesParents`
- Duplicates destination: `CLEANUP_DATA_SOURCES.DUPLICATES_FOLDER` (`1UOIQ1_2TcAldgA-d8GqBel3csnzyqFwy`)

---

## Step A3: Refresh Local PID Data from Google Drive

**Button**: "Refresh Local PID Data from Google Drive"

**Function**: `generateFreshEveryThingWithPid()`

**What it does**:
- Reads all PID files from Google Drive folder
- Consolidates them into one JSON array

**Output**: Updates local `servers/Results/everyThingWithPid.json`

---

## Step A4: Create VisionAppraisal Entities

**Step A4a - Process Raw Data**

**Button**: "Process & Save VisionAppraisal Data"

**What it does**:
- Processes raw PID data into structured format
- Saves intermediate results

**Step A4b - Create Entities**

**Button**: "Create Entities from Processed Data"

**Function**: `runEntityProcessing()` → `processAllVisionAppraisalRecordsWithAddresses()`

**What it does**:
- Parses the CSV data from everyThingWithPid.json
- Creates Individual/AggregateHousehold/Business/LegalConstruct entities
- Populates `otherInfo` with assessment/appraisal values

**Output**: Entities in `window.workingLoadedEntities.visionAppraisal.entities`

---

## Step A5: Prepare Bloomerang Data

**Action**: Export `all data.csv` from Bloomerang application

**Button**: "Process Bloomerang CSV"

**What it does**:
- Parses Bloomerang CSV file
- Creates Individual/AggregateHousehold entities with householdInformation
- Establishes household cross-references (parentKey, siblingKeys)

**Output**: Bloomerang entities ready for unified database

---

## Step A6: Load All Entities Into Unified Database

**Button**: "Load All Entities Into Memory"

**What it does**:
- Loads VisionAppraisal entities + Bloomerang entities
- Builds unified keyed database with keys in format:
  - VisionAppraisal: `visionAppraisal:FireNumber:<number>`
  - Bloomerang: `bloomerang:<accountNumber>:<locationType>:<locationValue>:<headStatus>`

**Output**: `window.unifiedEntityDatabase.entities`

**Button**: "Record Unified Database" (optional)

**What it does**: Saves the unified database to Google Drive for later loading in Phase B

---

# Phase B: Work with Saved Data

## Step B1: Load Saved Unified Database

**Button**: "Load Unified Database"

**Input**: Google Drive File ID of previously saved unified database

**What it does**: Loads a previously saved unified database, skipping Phase A entirely

**Output**: `window.unifiedEntityDatabase.entities`

---

## Step B2: Build EntityGroup Database

**Button**: "Build New" in EntityGroup Browser

**Checkbox**: "Load override rules" - loads match override rules from Google Sheets before building

**What it does**:
- Matches entities across sources using **6-phase algorithm**
- Creates groups with consensus entities
- Records near misses
- Applies match override rules if enabled

### 6-Phase Construction Algorithm

The EntityGroup database is built in 6 phases, processing VisionAppraisal first, then Bloomerang:

| Phase | Source | Entity Types |
|-------|--------|--------------|
| Phase 1 | VisionAppraisal | AggregateHousehold |
| Phase 2 | VisionAppraisal | Individual |
| Phase 3 | VisionAppraisal | Business, LegalConstruct, Other |
| Phase 4 | Bloomerang | AggregateHousehold |
| Phase 5 | Bloomerang | Individual |
| Phase 6 | Bloomerang | Business, LegalConstruct, Other |

### 9-Step Group Building Algorithm

Within each phase, entities are processed using a 9-step algorithm:

1. **Step 0**: Check FORCE_EXCLUDE rules - skip if entity is excluded from all groups
2. **Step 1**: Check FORCE_MATCH rules - add to anchor's group if rule exists
3. **Step 2**: Check for existing group membership (entity already placed)
4. **Step 3**: Find best matching existing group
5. **Step 4**: Evaluate match quality against threshold
6. **Step 5**: Create new group if no good match found
7. **Step 6**: Add to existing group if match exceeds threshold
8. **Step 7**: Record near misses for borderline matches
9. **Step 8**: Update consensus entity for the group
10. **Step 9**: Household pulling - pull remaining household members into matched groups

**Output**: `window.entityGroupDatabase.groups`

---

## Step B3: Generate Reports and Exports

### Match Override System

**Google Sheets Integration**: The system loads override rules from two Google Sheets:

| Sheet | Purpose | Sheet ID |
|-------|---------|----------|
| FORCE_MATCH | Ensure entities end up in same group | `1WWq8rgVyIKgf3qhVpl5mBiVQllljum0JVm2e_h-WZo8` |
| FORCE_EXCLUDE | Prevent entities from being in same group | `1nZIqcBa3LW1DcUKXVr1jNCGsZqq6JLTaxJSpXSZyulk` |

**Rule Types**:
- **FORCE_MATCH**: Anchor/dependent model - dependent entity joins anchor's group
- **FORCE_EXCLUDE**: Defective/other model - defective entity cannot join other's group
- **MUTUAL**: Shorthand for multiple related keys in one row (key1::^::key2::^::key3)
- **One-to-Many**: Single key matched to multiple keys (keyA::^::keyB::^::keyC)

### Export Options

**CSV Export** (EntityGroup Browser)
- **Button**: "Export CSV"
- **Output**: CSV file with entity data for external analysis
- **Specification**: See `reference_csvExportSpecification.md`

**Lightweight JSON Export**
- **Button**: "Export Lightweight JSON"
- **Function**: `exportLightweightJSON()` in `scripts/export/lightweightExporter.js`
- **Output**: Self-contained JSON with embedded entity data (v2.0 format)
- **Purpose**: For Google Apps Script consumption

**Assessment Value Report**
- **Button**: "Assessment Value Report"
- **Output**: Report of assessment/appraisal values by entity group

---

## Verification Commands

After each stage, you can verify data flow with these console commands:

**Stage A3 - Local file has assessment values:**
```bash
head -c 500 servers/Results/everyThingWithPid.json
# Look for values like "$454,500,$454,500" at end of records
```

**Stage A4 - VisionAppraisal entities:**
```javascript
const vaEntities = window.workingLoadedEntities?.visionAppraisal?.entities?.slice(0, 5) || [];
vaEntities.forEach(e => console.log(e.name?.toString(), '| assessment:', e.otherInfo?.assessmentValue, '| appraisal:', e.otherInfo?.appraisalValue));
```

**Stage A6/B1 - Unified Database:**
```javascript
const entities = Object.values(window.unifiedEntityDatabase?.entities || {}).slice(0, 10);
entities.forEach(e => console.log(e.name?.toString(), '| assessment:', e.otherInfo?.assessmentValue, '| appraisal:', e.otherInfo?.appraisalValue));
```

**Stage B2 - EntityGroup consensus entities:**
```javascript
const groups = Object.values(window.entityGroupDatabase?.groups || {}).slice(0, 5);
groups.forEach(g => console.log('Group', g.index, '| consensus assessment:', g.consensusEntity?.otherInfo?.assessmentValue, '| appraisal:', g.consensusEntity?.otherInfo?.appraisalValue));
```

**Match Override Rules loaded:**
```javascript
console.log('FORCE_MATCH rules:', window.matchOverrideManager?.forceMatchRules?.size || 0);
console.log('FORCE_EXCLUDE rules:', window.matchOverrideManager?.forceExcludeRules?.size || 0);
```

---

## Key Configuration Files

| Setting | Location | Current Value |
|---------|----------|---------------|
| PID Folder ID | `parameters.pidFilesParents` in `scripts/baseCode.js` | `1qgnE1FW3F6UG7YS4vfGBm9KzX8TDuBCl` |
| Duplicates Folder ID | `CLEANUP_DATA_SOURCES.DUPLICATES_FOLDER` in `verification.js` | `1UOIQ1_2TcAldgA-d8GqBel3csnzyqFwy` |
| FORCE_MATCH Sheet ID | `MATCH_OVERRIDE_CONFIG` in `matchOverrideManager.js` | `1WWq8rgVyIKgf3qhVpl5mBiVQllljum0JVm2e_h-WZo8` |
| FORCE_EXCLUDE Sheet ID | `MATCH_OVERRIDE_CONFIG` in `matchOverrideManager.js` | `1nZIqcBa3LW1DcUKXVr1jNCGsZqq6JLTaxJSpXSZyulk` |

**Single Source of Truth**: All files (`verification.js`, `cleanup.js`, `verification_es5.js`) reference `parameters.pidFilesParents` for the PID folder ID, ensuring consistency.

---

## Related Documentation

- [reference_codeCleanupPlan.md](reference_codeCleanupPlan.md) - Code cleanup plan with regression testing
- [reference_matchOverrideSystem.md](reference_matchOverrideSystem.md) - Match override system specification
- [reference_csvExportSpecification.md](reference_csvExportSpecification.md) - CSV export format specification
- [reference_otherInfoReviewPlan.md](reference_otherInfoReviewPlan.md) - OtherInfo property analysis and bug fixes
- [reference_projectRoadmap.md](reference_projectRoadmap.md) - Overall project roadmap
- [reference_keyedDatabaseMigration.md](reference_keyedDatabaseMigration.md) - Keyed database architecture
