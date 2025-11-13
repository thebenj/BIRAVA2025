# Integration Workflow Reference

**Purpose**: Complete step-by-step workflow for VisionAppraisal ↔ Bloomerang integration process, documenting all phases from raw data acquisition through entity consolidation with specific button actions and code execution steps.

## Complete VisionAppraisal ↔ Bloomerang Integration Process

### Phase 0: Raw Data Acquisition

**Step 0A: VisionAppraisal Raw Data Collection**
- **Action**: Press **"First Button"** - executes `firstButterClick()`
- **Purpose**: Scrapes street index from VisionAppraisal website
- **Result**: Populates `streetStarts` array with street URLs

**Step 0B: Street Data Collection**
- **Action**: Press **"Second Button"** - executes `secondButterClick()`
- **Purpose**: Scrapes individual street pages to get parcel lists
- **Result**: Populates `streetData` array with property parcels

**Step 0C: Parcel Data Collection**
- **Action**: Press **"Third Button"** - executes `thirdButterClick()`
- **Purpose**: Scrapes parcel pages to get property details
- **Result**: Populates `parcelData` array with property information

**Step 0D: Detailed Property Data**
- **Action**: Press **"Fourth Button"** - executes `fourthButterClick()`
- **Purpose**: Scrapes detailed property information including owner data
- **Result**: Creates complete raw VisionAppraisal dataset

**Combined Action**: Press **"All Button"** - executes all four steps sequentially (`AllClick()`)

### Phase 0B: Bloomerang Raw Data
- **Requirement**: Bloomerang CSV file must be uploaded to `servers/Results/All Data.csv`
- **No button required**: File-based input system

### Phase 1: Data Source Processing (Ready to Execute)

**Step 1A: Process Bloomerang Data**
- **Action**: Press **"Process Bloomerang CSV"** button in HTML interface
- **Code**: Executes `readBloomerang()` function from `bloomerang.js`
- **Input**: Uses CSV file from `servers/Results/All Data.csv`
- **Result**: Creates entity objects with 100% success rate (1,362 records → 426 households)
- **Output**: Bloomerang entities stored in Google Drive with complete AttributedTerm provenance

**Step 1B: Process VisionAppraisal Data**
- **Action**: Press **"Process and Save VisionAppraisal"** button in HTML interface
- **Code**: Executes `processAndSaveVisionAppraisal()` function from `baseCode.js`
- **Input**: Uses raw data collected in Phase 0
- **Result**: Uses ConfigurableVisionAppraisalNameParser (34-case coverage, 100% success rate on 2,317 records)
- **Output**: VisionAppraisal entities stored in Google Drive (File ID: `19cgccMYNBboL07CmMP-5hNNGwEUBXgCI`)

### Phase 2: Integration Analysis (Current Priority)

**Step 2A: Fire Number → PID Relationship Analysis**
- **Action**: Run browser console command from `integration/testPlugin.js`
- **Code**: Execute `analyzeFireNumberToPIDRelationships()` function
- **Purpose**: Analyze 17 Fire Numbers that map to multiple PIDs to determine owner clustering patterns
- **Resources**: Custom Levenshtein algorithm, business entity database (904 terms), VisionAppraisal tag cleaning

**Step 2B: Multi-Stage Matching Pipeline**
- **Action**: Execute `integration/matchingEngine.js` functions via console or integration buttons
- **Code**: `MatchingEngine.runMultiStageMatcher()`
- **Process**:
  1. **Stage 1**: Fire Number matching (expected ~29% match rate)
  2. **Stage 2**: Name similarity matching using Levenshtein algorithm
  3. **Stage 3**: Address pattern matching with Block Island street database
  4. **Stage 4**: Heuristic/composite matching for remaining cases

### Phase 3: Entity Consolidation (Implementation Ready)

**Step 3A: Address Processing Integration**
- **Code Location**: `scripts/address/addressProcessing.js` functions ready
- **Implementation**: Use `processAddress()` and `createAddressFromParsedData()` in Entity constructors
- **Purpose**: Create proper Address objects from raw address strings for both data sources

**Step 3B: Matched Entity Consolidation**
- **Code Pattern**: Create consolidated Entity objects that merge data from both sources
- **Attribution**: Maintain complete AttributedTerm provenance for each data element
- **Structure**: Same entity classes used by both sources (Individual, Business, AggregateHousehold, LegalConstruct)

### Phase 4: Quality Assurance & Verification

**Step 4A: Testing and Validation**
- **Action**: Execute `integration/testPlugin.js` comprehensive test suite
- **Code**: Multiple validation functions for data quality and matching accuracy
- **Purpose**: Verify integration results and identify any data quality issues

**Step 4B: Entity Browser Review**
- **Action**: Use Entity Browser interface (buttons: "Load Collections", search/filter functions)
- **Code**: `entityBrowser.js` provides interactive browsing of processed entities
- **Purpose**: Manual review of consolidated entities and verification of matching results

## Current Implementation Status

**✅ Ready to Execute**:
- Phase 0: VisionAppraisal raw data acquisition (Four-button workflow in baseCode.js)
- Phase 0B: Bloomerang CSV file upload system
- Phase 1: Both data source processing pipelines are production-ready
- Phase 2A: Fire Number analysis function exists and needs execution
- Phase 4: Testing and browsing infrastructure complete

**🚧 Needs Implementation**:
- Phase 2B: Multi-stage matching pipeline exists but needs execution workflow
- Phase 3A: Address processing exists but needs integration into Entity constructors
- Phase 3B: Entity consolidation logic needs development

**Critical Next Step**: Execute Fire Number → PID analysis to determine owner clustering rules, which will inform the matching strategy for the multi-stage pipeline.

## Data Flow Architecture

**Raw Data Sources**:
1. **VisionAppraisal**: Web scraping via four-button workflow → raw property/owner data
2. **Bloomerang**: CSV file upload → donor/contact data

**Processing Pipeline**:
1. **Entity Creation**: Both sources converted to same entity class structure
2. **Matching Engine**: Multi-stage matching to identify same properties/owners across sources
3. **Consolidation**: Merge matching entities while maintaining source attribution
4. **Verification**: Testing and manual review of consolidated results

**Final Output**: Single comprehensive database of Block Island properties and owners with data from both sources properly attributed and consolidated.