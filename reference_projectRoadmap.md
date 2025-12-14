# BIRAVA2025 Project Roadmap

## Document Purpose
This document provides a high-level outline of the project's future direction. It is NOT detailed enough to work from directly - each step requires specific discussion before implementation begins.

**Last Updated:** December 13, 2025

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

## 3. Unified Database Persistence

### 3.1 Prerequisites
- Resolve outstanding data integrity errors currently reported on unified browser load
- (Note: These are errors beyond the DUPLICATE key errors already addressed)

### 3.2 Implementation
- Implement and test base code
- Ensure serialization/deserialization based on proper principles

### 3.3 New Buttons
Add two buttons next to existing entity load buttons:

1. **Record unified database** - Save currently in-memory database to disk
2. **Load and record entities** - Load entities from source files AND record unified database

### 3.4 Requirements
- Unified browser viewing tools must function identically whether unified database is:
  - Newly created in memory, OR
  - Loaded from disk

---

## 4. Grouped Datasets (EntityGroup Database)

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

#### Browser Tool
- Window listing all entity groups (similar to unified entity browser primary window)
- Detailed view (similar to unified entity browser detail view)

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

### 6.1 Implementation
- Add PropertyValue simpleIdentifier property to OtherInfo object
- Ensure VisionAppraisal download provides data

### 6.2 Generalization
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

---

## Implementation Notes

- Each step in this outline requires specific discussion before work begins
- This document serves as strategic planning reference, not implementation specification
- Detailed implementation plans will be developed step-by-step with user collaboration
