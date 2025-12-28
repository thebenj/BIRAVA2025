# Analysis Results Reference

**Purpose**: HISTORICAL field analysis findings from early project phases - Contains OBSOLETE analysis resolved by enhanced entity architecture

**🚨 STATUS: MOSTLY OBSOLETE** - Entity structure issues identified here were resolved through Requirements 1-23 implementation

## Phase 1 Results: VisionAppraisal Process Analysis

### Critical Findings Summary **[HISTORICAL - RESOLVED]**
**Data Completeness Crisis Discovered** *(NOTE: Since resolved by enhanced entity architecture)*:
- **Source Data**: 2,317 records with 28 rich fields per record
- **Entity Data**: 2,317 entities with only 18 fields per entity
- **Field Loss Rate**: **75% of source data lost** (21 out of 28 fields missing from entities) *(FIXED by Requirements 1-23)*
- **Data Structure**: Source has structured parsed fields, entities have minimal AttributedTerm objects *(ENHANCED with Info classes)*

### Detailed Analysis Results
**Source File Analyzed**: `VisionAppraisal_ProcessedData.json` (Google ID: 1oIW1m1Qw2lyreU-uGMX3jUka9LwaBTAf)
- **Record Count**: 2,317 records
- **Field Count**: 28 fields per record
- **Data Quality**: Rich structured data with parsed MBLU, addresses, names
- **Processing Date**: 2025-10-14T22:12:55.119Z
- **Fire Number Coverage**: 1,689 with Fire Numbers, 628 without

**Entity File Analyzed**: `VisionAppraisal_ParsedEntities.json` (Google ID: 19cgccMYNBboL07CmMP-5hNNGwEUBXgCI)
- **Entity Count**: 2,317 entities (1:1 mapping maintained)
- **Field Count**: Only 18 fields per entity (36% retention rate)
- **Entity Types**: All entities incorrectly classified as `{Object: 2317}` - type detection failed
- **AttributedTerm Usage**: Partial implementation (only 4 fields use AttributedTerm structure)

### Critical Missing Fields Inventory
**Address Components Lost (7 fields)**:
- `street`, `city`, `state`, `zip`, `block`, `unit`, `unitCut` ❌

**MBLU Parsed Components Lost (2 fields)**:
- `map`, `lot` ❌ (raw `mblu` string preserved but parsed components lost)

**Owner Information Lost (4 fields)**:
- `ownerName`, `ownerName2`, `processedOwnerName`, `hasFireNumber` ❌

**Administrative Data Lost (4 fields)**:
- `neighborhood`, `userCode`, `date`, `sourceIndex` ❌

**Legacy Reference Data Lost (4 fields)**:
- `_legacyAddress`, `_legacyMBLU`, `_legacyOwnerName`, `_legacyOwnerName2` ❌

## Phase 2 Results: Bloomerang Field Preservation Analysis

**Analysis Executed**: 2025-10-18 using correct entity file IDs
- **Bloomerang Source Data**: 1,362 records with 30 CSV fields
- **Bloomerang Entity Files**: Successfully loaded all 3 collections
  - Individual: `Individual_2025-10-10T00-37-26_Batch_Production_2025_01_09.json` (ID: `1s7VnmD4CZg09y-GKmfX4W6tZb2SDaJLy`)
  - Household: `AggregateHousehold_2025-10-10T00-37-27_Batch_Production_2025_01_09.json` (ID: `1HhjM33856-jehR1xSypXyE0qFuRw26tx`)
  - NonHuman: `NonHuman_2025-10-10T00-37-29_Batch_Production_2025_01_09.json` (ID: `11zRSquTQy9hNgUXuCdaHR6fUBNi-n4GX`)

### Detailed Dual-Source Analysis Results

**VisionAppraisal Field Analysis**:
- **Source Data**: 2,317 records, 28 fields per record
- **Entity Data**: 2,317 entities, 18 fields per entity (but 74,208+ total entity fields detected in structure)
- **Field Loss**: 75% (21 out of 28 source fields missing from entities)
- **Missing Fields**: street, city, state, zip, block, unit, unitCut, map, lot, ownerName, ownerName2, processedOwnerName, hasFireNumber, neighborhood, userCode, date, sourceIndex, _legacyAddress, _legacyMBLU, _legacyOwnerName, _legacyOwnerName2
- **Preserved Fields**: fireNumber, pid, propertyLocation, ownerAddress, mblu, googleFileId, source

**Bloomerang Field Analysis**:
- **Source Data**: 1,362 records, 30 CSV fields
- **Entity Data**: Large entity collection (74,208 entity fields detected across 3 files)
- **Field Loss**: 80% (24 out of 30 CSV fields missing from entities)
- **Missing Fields**: Middle Name, Primary Email Address, First Transaction Amount, First Transaction Date, Is in a Household, Primary Street/City/State/ZIP, Home Street/City/State/ZIP, Vacation Street/City/State/ZIP, Work Street/City/State/ZIP, BI Street, BI PO Box, Is Head of Household
- **Preserved Fields**: Name, First Name, Last Name, Account Number, Fire Number, Household Name

**Entity Loading Behavior**: Console shows "undefined entities" but analysis works correctly - entities are arrays that get concatenated

## Business Impact Assessment
**Completeness Failure**: VisionAppraisal → entity process loses critical property data including:
- **Address information** needed for matching and geocoding
- **Parsed MBLU components** required for property identification
- **Owner name variants** essential for name matching algorithms
- **Administrative metadata** needed for data lineage and debugging

**Correctness Issues Identified**:
- Entity type classification completely broken (all entities show as generic "Object")
- AttributedTerm usage inconsistent (only 4 of 18 fields use proper structure)
- Data transformation loses structured parsing in favor of raw strings

## Analysis Methodology Notes
**Process Used**:
1. **Best Practice Method 1** applied (gapi.client.drive.files.get) per wisdomOfFileAccess.md guidance
2. **Dual structure analysis** - compared serialization code expectations vs. actual data
3. **Systematic field mapping** - automated comparison between source and entity field sets
4. **Sample data comparison** - detailed examination of individual record transformation

**Tools Developed**:
- `analyzeVisionAppraisalFieldMappingCorrected()` - production-ready analysis function
- Automated missing field detection and categorization
- Sample data visualization for transformation verification
- Global data storage system for further analysis (`window.fieldMappingResults`)