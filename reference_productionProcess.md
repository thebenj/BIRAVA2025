# Production Process - Entity Database Rebuild

## Purpose
This document describes the complete steps to rebuild the entity database from fresh VisionAppraisal and Bloomerang data.

**Last Updated**: December 20, 2025

---

## Prerequisites

- Google Drive authentication active
- Access to VisionAppraisal website
- Fresh `all data.csv` export from Bloomerang (for Step 5)

---

## Step 0: Run First Three Buttons (Prepare PID List)

**Buttons**: "First Button" → "Second Button" → "Third Button"

**What it does**: Prepares the list of PIDs to download from VisionAppraisal website

**PID Folder ID Location**: `parameters.pidFilesParents` in `scripts/baseCode.js`
- Current value: `1qgnE1FW3F6UG7YS4vfGBm9KzX8TDuBCl`

---

## Step 1: Download PIDs from VisionAppraisal Website

**Button**: "Fourth Button" (Button 4)

**What it does**:
- Scrapes VisionAppraisal website for each PID
- Extracts data including assessment/appraisal values from `MainContent_lblGenAssessment` and `MainContent_lblGenAppraisal`
- Saves individual JSON files to Google Drive folder

**Output**: Individual PID files saved to folder ID `parameters.pidFilesParents`

---

## Step 2: Analyze and Clean Up PID Duplicates

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

## Step 3: Refresh Local PID Data from Google Drive

**Button**: "📥 Refresh Local PID Data from Google Drive"

**Function**: `generateFreshEveryThingWithPid()`

**What it does**:
- Reads all PID files from Google Drive folder
- Consolidates them into one JSON array

**Output**: Updates local `servers/Results/everyThingWithPid.json`

---

## Step 4: Create VisionAppraisal Entities

**Button**: "🏗️ Create Entities from Processed Data"

**Function**: `runEntityProcessing()` → `processAllVisionAppraisalRecordsWithAddresses()`

**What it does**:
- Parses the CSV data from everyThingWithPid.json
- Creates Individual/AggregateHousehold/Business/LegalConstruct entities
- Populates `otherInfo` with assessment/appraisal values

**Output**: Entities in `window.workingLoadedEntities.visionAppraisal.entities`

---

## Step 5: Prepare Bloomerang Data

**Action**: Export `all data.csv` from Bloomerang application

**Button**: "Process Bloomerang CSV"

**What it does**:
- Parses Bloomerang CSV file
- Creates Individual/AggregateHousehold entities with householdInformation

**Output**: Bloomerang entities ready for unified database

---

## Step 6: Load All Entities Into Unified Database

**Button**: "Load All Entities Into Memory"

**What it does**:
- Loads VisionAppraisal entities + Bloomerang entities
- Builds unified keyed database with keys in format:
  - VisionAppraisal: `visionAppraisal:FireNumber:<number>`
  - Bloomerang: `bloomerang:<accountNumber>:<locationType>:<locationValue>:<headStatus>`

**Output**: `window.unifiedEntityDatabase.entities`

---

## Step 7: Build EntityGroup Database (optional)

**Button**: "Build New" in EntityGroup Browser

**What it does**:
- Matches entities across sources using 5-phase algorithm
- Creates groups with consensus entities
- Records near misses

**Output**: `window.entityGroupDatabase.groups`

---

## Verification Commands

After each stage, you can verify data flow with these console commands:

**Stage 3 - Local file has assessment values:**
```bash
head -c 500 servers/Results/everyThingWithPid.json
# Look for values like "$454,500,$454,500" at end of records
```

**Stage 4 - VisionAppraisal entities:**
```javascript
const vaEntities = window.workingLoadedEntities?.visionAppraisal?.entities?.slice(0, 5) || [];
vaEntities.forEach(e => console.log(e.name?.toString(), '| assessment:', e.otherInfo?.assessmentValue, '| appraisal:', e.otherInfo?.appraisalValue));
```

**Stage 6 - Unified Database:**
```javascript
const entities = Object.values(window.unifiedEntityDatabase?.entities || {}).slice(0, 10);
entities.forEach(e => console.log(e.name?.toString(), '| assessment:', e.otherInfo?.assessmentValue, '| appraisal:', e.otherInfo?.appraisalValue));
```

**Stage 7 - EntityGroup consensus entities:**
```javascript
const groups = Object.values(window.entityGroupDatabase?.groups || {}).slice(0, 5);
groups.forEach(g => console.log('Group', g.index, '| consensus assessment:', g.consensusEntity?.otherInfo?.assessmentValue, '| appraisal:', g.consensusEntity?.otherInfo?.appraisalValue));
```

---

## Key Configuration Files

| Setting | Location | Current Value |
|---------|----------|---------------|
| PID Folder ID | `parameters.pidFilesParents` in `scripts/baseCode.js` | `1qgnE1FW3F6UG7YS4vfGBm9KzX8TDuBCl` |
| Duplicates Folder ID | `CLEANUP_DATA_SOURCES.DUPLICATES_FOLDER` in `verification.js` | `1UOIQ1_2TcAldgA-d8GqBel3csnzyqFwy` |

**Single Source of Truth**: All files (`verification.js`, `cleanup.js`, `verification_es5.js`) reference `parameters.pidFilesParents` for the PID folder ID, ensuring consistency.

---

## Related Documentation

- [reference_otherInfoReviewPlan.md](reference_otherInfoReviewPlan.md) - OtherInfo property analysis and bug fixes
- [reference_projectRoadmap.md](reference_projectRoadmap.md) - Overall project roadmap
- [reference_keyedDatabaseMigration.md](reference_keyedDatabaseMigration.md) - Keyed database architecture
