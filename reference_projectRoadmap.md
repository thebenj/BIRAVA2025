# BIRAVA2025 Project Roadmap

## Document Purpose
This document provides a high-level outline of the project's future direction. It is NOT detailed enough to work from directly - each step requires specific discussion before implementation begins.

**Last Updated:** December 19, 2025

---

## Status Overview

| Step | Description | Status |
|------|-------------|--------|
| 1 | Five-Step Process Architecture | PLANNING (conceptual) |
| 2 | Two Levels of Match Recognition | IMPLEMENTED (isTrueMatch, isNearMatch in unifiedEntityBrowser.js) |
| 3 | Unified Database Persistence | USER_VERIFIED_WORKING |
| 4 | Grouped Datasets (EntityGroup Database) | USER_VERIFIED_WORKING (browser complete, persistence READY_FOR_VERIFICATION) |
| 5 | Custom BIRA Mailing Reports | PLANNING |
| 6 | PropertyValue SimpleIdentifier | CODED - awaiting testing with new VA download |
| 7 | Code Generalization for New Data Sources | PLANNING |
| 8 | Clean Up Steps | PLANNING (added VA refresh impact analysis) |

---

## 1. Five-Step Process Architecture

Organize and express the codebase around a clear five-step data processing pipeline:

### Step 1: Raw Data Download (Existing)
- Code that downloads data and creates raw data files
- Currently only relevant to VisionAppraisal source

### Step 2: Entity Creation (Existing)
- Code and buttons that load existing data from source files into entities
- Record entities to files

### Step 3: Unified Database Loading (Existing)
- Code and buttons that load entities into unified (cross-source), indexed/keyed database

### Step 4: Grouped Data Sets (To Be Coded)
- Code and buttons that load unified, keyed database
- Creates entityGroup database (grouped data sets)

### Step 5: Reports (To Be Coded)
- Code and buttons that run reports
- Each report has browser display and CSV output

---

## 2. Two Levels of Match Recognition

### 2.1 True Match Criteria

#### Data Informing Criteria
- User has analysis spreadsheet with data to inform true match parameters

#### Configuration Requirements
- Parameters of true match criteria stored in config

#### Entity Properties for Match Recording
New properties to add to entities:
1. Status as founding entity of a group
2. Founding member key (if not founding member)
3. Other members of match group
4. Toggle parameter to control whether matching properties are recorded when matching code runs

#### Implementation
- Implement and test base code for true match detection
- Code unified entity browser to show true matches

### 2.2 Near Match Criteria

#### Definition
- True match threshold minus 3 percentage points on every matching parameter
- Exception: contact is a deduction of 2 percentage points
- Full detail to be stored in config

#### Implementation
- Avoid redundant code relative to true match criteria
- Follow same implementation and testing pattern as true match

---

## 3. Unified Database Persistence - USER_VERIFIED_WORKING

**Status**: Completed December 14-15, 2025
**Reference**: reference_keyedDatabaseMigration.md, reference_keyPreservationPlan.md

### 3.1 Prerequisites - RESOLVED
- Data integrity errors resolved (NonHumanName class added for Business/LegalConstruct entities)
- DUPLICATE key errors resolved via accountNumber addition to Bloomerang keys

### 3.2 Implementation - COMPLETE
- Keyed Database architecture implemented in unifiedDatabasePersistence.js
- Serialization/deserialization working correctly
- Key preservation ensures database keys travel through all flows

### 3.3 New Buttons - IMPLEMENTED
Two buttons added:

1. **"Record Unified Database"** - Saves in-memory database to Google Drive
2. **"Load Unified Database"** - Loads database from Google Drive

### 3.4 Requirements - VERIFIED
- Unified browser viewing tools function identically whether unified database is:
  - Newly created in memory via "Load All Entities Into Memory", OR
  - Loaded from disk via "Load Unified Database"
- All phases of Keyed Database migration complete (see reference_keyedDatabaseMigration.md)

---

## 4. Grouped Datasets (EntityGroup Database)

**Status**: USER_VERIFIED_WORKING (December 16, 2025) - Browser complete, persistence READY_FOR_VERIFICATION

### 4.0 Implementation Summary

#### Files Created
- `scripts/objectStructure/entityGroup.js` - EntityGroup and EntityGroupDatabase classes
- `scripts/matching/entityGroupBuilder.js` - 5-phase construction algorithm + persistence functions
- `scripts/entityGroupBrowser.js` - Browser tool with View Details capabilities + save button handlers

#### Test Results (December 16 session - Full Database)
| Metric | Value |
|--------|-------|
| Total Groups | 2291 |
| Multi-member Groups | 785 |
| Single-member Groups | 1506 |
| Prospects (no Bloomerang member) | 1316 |
| Existing Donors (has Bloomerang member) | 975 |
| Entities Assigned | 4097 |
| Near Misses Recorded | 202 |

#### Test Results (December 16 session - Sample Run)
| Metric | Value |
|--------|-------|
| Sample Size | 800 entities |
| Groups Built | 645 |
| Database File Size | 1.88 MB |
| Reference File Size | 37.8 KB |
| Database File ID | 1NRKzen-IjQcc950cCGPr96g8V15mEW74 |
| Reference File ID | 1nTFLPY5gKeCwWy9RA8H014f2R7y88n33 |

#### Completed Features
- ✅ Browser/viewing tools: USER_VERIFIED_WORKING (scripts/entityGroupBrowser.js)
  - Load EntityGroup database from Google Drive
  - Build New button (constructs from loaded entities)
  - Filter/Sort/Search functionality
  - View Group Details modal with View Details buttons for:
    - Founding member (Entity Browser style)
    - Each group member (Entity Browser style)
    - Each near miss (Entity Browser style)
    - Consensus entity (Drill-Down property explorer style)
  - Group Stats modal
  - Export to CSV
- ✅ Stratified sampling for fast testing (200 entity sample in ~30 seconds vs 20+ minutes full run)
- ✅ Google Drive persistence: READY_FOR_VERIFICATION
  - Reference file companion (lightweight group membership lookup)
  - Two input boxes: Database File ID, Reference File ID
  - "Save to File IDs" button (updates existing files)
  - "Save as New Files" button (creates new files, reports IDs)
  - buildEntityGroupDatabase() auto-saves both to NEW files

#### Pending Features
- CSV output enhancement (more detailed/formatted export)
- Alias consensus integration testing (code written, not yet verified)

### 4.0.1 Persistence Architecture (December 16, 2025)

#### Reference File Structure
```json
{
  "metadata": {
    "timestamp": "2025-12-16T22:01:49.000Z",
    "totalGroups": 645,
    "totalMembers": 801
  },
  "groups": {
    "0||bloomerang:12345:...": ["visionAppraisal:FireNumber:1510"],
    "1||bloomerang:67890:...": [],
    ...
  }
}
```

Key format: `{groupIndex}||{foundingMemberKey}` (|| separator unlikely in entity keys)
Value: Array of additional member keys (excluding founding member)

#### Persistence Functions (entityGroupBuilder.js)
| Function | Purpose |
|----------|---------|
| `buildEntityGroupReferenceFile(groupDb)` | Creates reference file object |
| `saveEntityGroupDatabase(groupDb, fileId)` | Updates existing database file |
| `saveEntityGroupDatabaseToNewFile(groupDb)` | Creates new database file |
| `saveEntityGroupReference(refData, fileId)` | Updates existing reference file |
| `saveEntityGroupReferenceToNewFile(refData)` | Creates new reference file |
| `saveEntityGroupDatabaseAndReference(groupDb, dbId, refId)` | Updates both existing files |
| `saveEntityGroupDatabaseAndReferenceToNewFiles(groupDb)` | Creates both new files |

#### Browser Save Buttons (entityGroupBrowser.js)
| Button | Function | Behavior |
|--------|----------|----------|
| "Save to File IDs" | `saveEntityGroupToExistingFiles()` | Updates files at IDs in input boxes |
| "Save as New Files" | `saveEntityGroupToNewFiles()` | Creates new files, updates input boxes, reports IDs |

#### Design Rationale
- Future feature: Edit group membership (add/remove members)
- Need to save edited databases without overwriting clean originals
- Two file IDs (database + reference) kept in sync
- "Save as New Files" creates fresh copies for edited versions

#### Technical Note
EntityGroupDatabase stores `groups` as an **object** keyed by index (not array).
Use `Object.values(groupDb.groups)` to iterate over groups.

### 4.1 Core Principles

#### Key-Based References
- When referencing other entities, hold keys (not full objects)
- Stored on Google Drive after creation
- Must serialize/deserialize based on keys
- Uses keyed dataset from memory or disk depending on load state

### 4.2 Object Architecture

#### EntityGroup Object
New object class with the following structure:

#### Consensus Entity
- When group has only one member: no consensus entity
- When consensus entity exists:
  - Holds value for any property where at least one group member has a value
  - Property types are existing entity types (Individual, AggregateHousehold, etc.)
  - Primary alias value: highest total similarity score when compared to primary alias of that property across other group members
  - Secondary aliases: layered in three categories by correlation criteria (per aliased classes architecture), third layer is uncorrelated from within set

#### Founding Member
- Referenced by key
- When only one member: that member is founding member
- Determination is byproduct of construction order, not object function
- Default value: null

#### Near Misses
- EntityGroup holds references to near misses
- Near misses NOT used in determining consensus entity values
- Recorded for reference purposes only

#### Bloomerang Flag
- Variable indicating if any members are sourced from Bloomerang
- Important for determining prospect vs existing donor status

### 4.3 EntityGroup Construction Procedure

#### Configuration
- Order of construction recorded as configuration item
- When new data sources added: mandatory to declare processing order
- Ordering logic constructed to anticipate new data sources

#### Index Assignment
- Each group assigned simple index based on construction order

#### Construction Order

**Phase 1: Bloomerang Households**
- Every Bloomerang household becomes founding entity of an entityGroup
- Once assigned to entityGroup, entity unavailable for other groups (one entity per group)
- When household is true match of another household: individuals in that household excluded from other entity groups
- Near misses NOT eliminated from database for further matching
- Note: Because households with individuals match by matching individuals, recursive paths to follow individual matches should not be needed - but must robustly verify this assumption

**Phase 2: VisionAppraisal Households**
- Every VisionAppraisal household not associated in Phase 1 becomes founding member of entityGroup
- When individuals of household are standalone entities (as with Bloomerang):
  - Individual no longer available for other entities
  - Individual remains held by founding member

**Phase 3: Remaining Bloomerang Individuals**
- Generate entity groups from remaining Bloomerang individuals

**Phase 4: Remaining VisionAppraisal Individuals**
- Generate entity groups from remaining VisionAppraisal individuals

**Phase 5: Remaining Entity Types**
- Bloomerang first, VisionAppraisal following
- Generate entity groups from remaining entities

### 4.4 Access Tools

#### Browser Tool - USER_VERIFIED_WORKING
**File**: `scripts/entityGroupBrowser.js`

Features implemented:
- Window listing all entity groups with founding member name/address
- Filter by: all, multi-member, single-member, prospects, donors, near misses
- Sort by: index, member count, name
- Search by name, address, or member keys
- View Group Details modal showing:
  - Founding member with View Details button
  - All group members with individual View Details buttons
  - Near misses with View buttons
  - Consensus entity with Drill-Down View Details button
- Group Stats modal (totals, composition, phase breakdown)
- Export to CSV
- File ID persistence in localStorage

Two View Details button styles:
1. **Entity Browser style** (renderEntityDetailsWindow): Used for founding member, members, near misses - shows same view as Entity Browser's View Details
2. **Drill-Down style** (basicEntityDetailsView): Used for consensus entity - interactive property explorer with Expand buttons for nested objects

#### CSV Output
When entityGroup database generated, spin off one CSV per construction step:
- Row 1: Founding entity details (name, contact info, individual names and their contact info)
- First column: base group index
- Subsequent rows: items in group (same index)
- Near misses shown after true matches (same index)

---

## 5. Custom BIRA Mailing Reports

### 5.1 Prospect List Report
- Based on entityGroups that do not involve Bloomerang entities
- "Involves Bloomerang" determined by the Bloomerang flag on entityGroup
- Example edge case: VisionAppraisal household where one individual establishes true match with Bloomerang individual - this brings the Bloomerang entity into the group, making it NOT a prospect

### 5.2 Focus
- Reports focus on consensus item rather than founding member

---

## 6. PropertyValue SimpleIdentifier

### 6.1 Implementation - CODED (Dec 19, 2025)
- Add PropertyValue simpleIdentifier property to OtherInfo object
- Ensure VisionAppraisal download provides data

**Status**: Code changes implemented, awaiting testing with new VisionAppraisal data download

**Files Modified**:
- `scripts/baseCode.js` - Added DOM extraction for `MainContent_lblGenAssessment` and `MainContent_lblGenAppraisal`
- `scripts/dataSources/visionAppraisal.js` - Added `assessmentValue` and `appraisalValue` field parsing
- `scripts/objectStructure/contactInfo.js` - Added properties and getters/setters to OtherInfo class
- `scripts/dataSources/visionAppraisalNameParser.js` - Added OtherInfo population in entity creation functions

**Backward Compatible**: Yes - old CSV files without new fields will result in null values (safe default)

### 6.2 Testing Required
- Re-download VisionAppraisal PID files using Button 4 to generate CSVs with new fields
- Load VisionAppraisal entities and verify `entity.otherInfo.assessmentValue` and `appraisalValue` are populated
- Save unified database and reload to verify serialization/deserialization works

### 6.3 Generalization
- Flow inclusion through code
- Refine code to make such field additions a more generalized process

---

## 7. Code Generalization for New Data Sources

### 7.1 Goals
- Improve modularization and parameterization
- Easily implement new data sources beyond VisionAppraisal and Bloomerang

### 7.2 Implementation
- Record information regarding different data sources in centralized configuration files
- Review and restructure code accordingly

---

## 8. Clean Up Steps

### 8.1 Prerequisites
- Research duping entire Visual Studio project
- Proceed with cleanup on fresh, functional copy of code

### 8.2 Cleanup Elements
1. Generalize for new sources (identify where only Vision and Bloomerang are considered)
2. Write user guide
3. Remove obsolete code
4. Find better modularization and reduce bloat

### 8.3 VisionAppraisal Data Refresh Impact Analysis
**Priority**: Analyze before next full VisionAppraisal download

When re-downloading VisionAppraisal PID files, the following impacts need to be understood:

1. **New CSV Format**: Files will now have 13 fields (previously 11) - `assessmentValue` and `appraisalValue` appended
2. **Entity Key Stability**: Determine if re-downloading data affects entity keys used in:
   - Unified database references
   - EntityGroup membership
   - Match Override rules (FORCE_MATCH/FORCE_EXCLUDE sheets reference entity keys)
3. **Incremental vs Full Refresh**: Define process for:
   - Adding new PIDs (properties that didn't exist before)
   - Updating existing PIDs (owner changes, value changes)
   - Handling removed PIDs (properties no longer in VisionAppraisal)
4. **Downstream Cascade**: Document what needs to be rebuilt after VisionAppraisal refresh:
   - VisionAppraisal entities
   - Unified database
   - EntityGroup database
   - Match override rule validation (check for orphaned keys)

### 8.4 Property Data Additions Testing
**Status**: PENDING - awaiting VisionAppraisal data refresh

Test items for Step 6 PropertyValue implementation:
1. Download fresh VisionAppraisal PID files using Button 4
2. Verify CSV files contain assessment and appraisal values in fields[11] and fields[12]
3. Load VisionAppraisal entities into memory
4. Verify `entity.otherInfo.assessmentValue` and `entity.otherInfo.appraisalValue` are populated
5. Save unified database to Google Drive
6. Reload unified database and verify property values persist correctly
7. Verify old entities (from before refresh) handle null values gracefully

---

## Implementation Notes

- Each step in this outline requires specific discussion before work begins
- This document serves as strategic planning reference, not implementation specification
- Detailed implementation plans will be developed step-by-step with user collaboration
