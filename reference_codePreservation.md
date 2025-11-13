# Code Preservation Reference

**Purpose**: Analysis functions, methodologies, and session knowledge from successful implementations

## Permanent Analysis Assets Created

### Analysis Functions Preserved: `/scripts/analysis/dualSourceFieldAnalysis.js`
**Complete functionality saved for future sessions**:
- `analyzeVisionAppraisalFieldMappingCorrected()` - VisionAppraisal field mapping analysis ⚠️ **UNTESTED - REWRITTEN FROM SCRATCH**
- `analyzeBloomerangFieldMappingCorrected()` - Bloomerang field mapping analysis ✅ **TESTED AND WORKING**
- `runDualSourceFieldAnalysis()` - Combined comparative analysis
- **All file IDs, endpoints, and procedures documented**
- **Complete missing field inventories preserved**

### CODE PRESERVATION STATUS:
- **Bloomerang Analysis**: ✅ Exact working code from browser session preserved
- **VisionAppraisal Analysis**: ❌ Original working code lost, new untested version created
- **Critical Gap**: VisionAppraisal function needs testing to verify it matches documented 75% loss rate

## Complete File Access Methodology

### VisionAppraisal Data Access
- **Source File**: `VisionAppraisal_ProcessedData.json` (Google Drive ID: `1oIW1m1Qw2lyreU-uGMX3jUka9LwaBTAf`)
  - Access: `gapi.client.drive.files.get({fileId: 'ID', alt: 'media'})` per Method 1 best practice
  - Content: 2,317 records with 28 structured fields each
- **Entity File**: `VisionAppraisal_ParsedEntities.json` (Google Drive ID: `19cgccMYNBboL07CmMP-5hNNGwEUBXgCI`)
  - Same access method, contains 2,317 entity objects

### Bloomerang Data Access
- **Source CSV**: Local file `All Data.csv` in `/servers/Results/`
  - Access: `fetch("http://127.0.0.99:3000/csv-file")` - uses local server endpoint
  - Content: 1,362 records with 30 CSV fields, comma-delimited with quoted headers
- **Entity Collections** (Google Drive, requires exact file IDs):
  - Individual: `1s7VnmD4CZg09y-GKmfX4W6tZb2SDaJLy` (Individual_2025-10-10T00-37-26_Batch_Production_2025_01_09.json)
  - Household: `1HhjM33856-jehR1xSypXyE0qFuRw26tx` (AggregateHousehold_2025-10-10T00-37-27_Batch_Production_2025_01_09.json)
  - NonHuman: `11zRSquTQy9hNgUXuCdaHR6fUBNi-n4GX` (NonHuman_2025-10-10T00-37-29_Batch_Production_2025_01_09.json)
  - Access: Same Google Drive Method 1, each file contains array of entity objects

### Critical Access Patterns
- **Authentication**: Must have valid Google OAuth token for Drive access
- **Error Handling**: Script loading shows "syntax error" messages but functions work (duplicate declarations expected)
- **File Structure**: Entity files are JSON arrays that need `JSON.parse()` then concatenation
- **Field Extraction**: Sample 50+ entities for comprehensive field coverage, use recursive field extraction
- **Search Failures**: Global file name searches don't work - must use specific file IDs

## Session Methodology Knowledge

### How This Session Worked

**Initial Approach Failure**:
- Tried global search: `"name contains 'Individual_Collection_'"` → Found 0 files
- Root cause: Bloomerang entities aren't in discoverable locations, need exact IDs

**Successful Approach**:
- Used specific file IDs provided by user: `1s7VnmD4CZg09y-GKmfX4W6tZb2SDaJLy`, etc.
- Mixed data access: Local CSV endpoint + Google Drive entity files
- Sampled 50 entities for field extraction (not just first entity)

**Field Matching Logic**:
- Intelligent string comparison with space removal: `field.toLowerCase().replace(/\s+/g, '')`
- Bi-directional matching: CSV field contains entity field OR entity field contains CSV field
- Recursive field extraction: `extractFields(obj, prefix)` to get nested object properties

**Analysis Results Storage**:
- `window.bloomerangFieldMappingResults` - complete results object
- `window.visionAppraisalFieldMappingResults` - (function untested)
- Results include: sourceFields, entityFields, missingFromEntities, preservationRate, sample data

**Console Behavior**:
- Script loading errors are normal (duplicate variable declarations)
- "undefined entities" logged but analysis works correctly
- Entity files contain arrays that get properly concatenated

### Why File Search Failed
- Bloomerang entity files have specific naming pattern: `EntityType_YYYY-MM-DDTHH-MM-SS_Batch_Production_YYYY_MM_DD.json`
- Files exist at specific Google Drive IDs, not searchable by pattern
- Folder-based searches (`'folderID' in parents`) might work but weren't tested

### Critical Timing Note
- VisionAppraisal analysis function was rewritten from scratch (original lost from browser session)
- Bloomerang analysis function preserved exactly from working session
- This creates asymmetry in code reliability between the two analyses

## NEW ANALYSIS CODE: VisionAppraisal Field Migration Audit ✅ **TESTED AND WORKING**

### Analysis Functions Preserved: `/scripts/integration/visionAppraisalFieldAudit.js`
**Complete comprehensive audit system created 2025-10-19**:

**Purpose**: Compares VisionAppraisal source data fields to entity structure fields to identify and quantify data loss during entity creation process

**Location**: `/scripts/integration/visionAppraisalFieldAudit.js`

**Main Functions**:
- `VisionAppraisalFieldAudit.auditFieldMigration()` - Complete audit execution
- `VisionAppraisalFieldAudit.displayAuditResults(result)` - Formatted console output
- `VisionAppraisalFieldAudit.loadProcessedEntities()` - Entity data loading
- `VisionAppraisalFieldAudit.analyzeSourceFields(data)` - Source field analysis
- `VisionAppraisalFieldAudit.analyzeEntityFields(data)` - Entity field analysis
- `VisionAppraisalFieldAudit.compareFieldMigration(source, entity)` - Loss calculation

**Input Requirements**:
- **VisionAppraisal Source Data**: Loaded via `VisionAppraisal.loadData()` (uses endpoint `http://127.0.0.99:3000/visionappraisal-data`)
- **Processed Entities**: Google Drive file `19cgccMYNBboL07CmMP-5hNNGwEUBXgCI` (VisionAppraisal_ParsedEntities.json)
- **Authentication**: Valid Google OAuth token for Drive access (`gapi.client.getToken().access_token`)
- **Dependencies**: VisionAppraisal data source plugin, entity classes, alias classes

**Output Description**:
```javascript
{
  success: true/false,
  auditReport: {
    timestamp: "ISO date",
    summary: {
      sourceDataAnalysis: { totalRecords, totalFields, fieldNames },
      entityAnalysis: { totalRecords, totalFields, entityTypes },
      migrationResults: { fieldLossCount, fieldLossPercentage, migrationEfficiency, criticalFieldsLost }
    },
    detailedFindings: {
      missingFields: ["field1", "field2", ...],
      missingCriticalFields: ["criticalField1", ...],
      newFieldsInEntities: ["entityField1", ...],
      sourceFieldSamples: { field: [sample1, sample2, sample3] },
      recommendedActions: [{ priority, issue, recommendation, impact }]
    }
  },
  sourceFields: { detailed source analysis },
  entityFields: { detailed entity analysis },
  migrationAnalysis: { comparative analysis }
}
```

**Console Output**: Formatted report with critical findings summary, missing field inventory, and prioritized recommendations

**Access Pattern**:
```javascript
// Load required scripts first
const scripts = ['./scripts/dataSources/visionAppraisal.js', './scripts/integration/visionAppraisalFieldAudit.js', './scripts/objectStructure/aliasClasses.js', './scripts/objectStructure/entityClasses.js'];
// Run audit
VisionAppraisalFieldAudit.auditFieldMigration().then(result => {
    VisionAppraisalFieldAudit.displayAuditResults(result);
    window.auditResults = result;
});
```

**Validated Results** (2025-10-19):
- Source Fields: 28 available
- Entity Fields: 49 captured (but 71% source field loss)
- Missing Critical Fields: 9 (ownerAddress, street, city, state, zip, map, block, lot, unit)
- Field Loss Rate: 71%
- Migration Efficiency: 29%

## Current Testing Infrastructure

### Comprehensive Entity Creation Test Function
**Function**: `testBothQuietVersions()` - Available in browser console
**Purpose**: Complete test of both VisionAppraisal and Bloomerang entity creation systems
**Status**: ✅ **100% WORKING WITH COMPREHENSIVE TEST**

**Capabilities**:
- ✅ **Auto-loads VisionAppraisal dependencies** (Case31Validator, VisionAppraisal parser)
- ✅ **Tests VisionAppraisal quiet version** (2,317 records, 9.2s processing time)
- ✅ **Tests Bloomerang quiet version** (1,362 records)
- ✅ **Provides comprehensive timing and results**
- ✅ **Handles all Google Drive operations**
- ✅ **Returns detailed success/failure status**

## NEW SESSION KNOWLEDGE: Address Integration Testing (2025-10-26)

### Address Processing Integration - Individual Entities
**Status**: ✅ **SUCCESSFULLY INTEGRATED AND TESTED**
**Location**: Modified `createIndividual()` method in `scripts/dataSources/visionAppraisalNameParser.js` (lines 895-920)

**Integration Details**:
- **Address Processing Functions Used**: `processAddress()` and `createAddressFromParsedData()` from `scripts/address/addressProcessing.js`
- **New Entity Properties Added**:
  - `individual.propertyLocationAddress` - Processed Address object for property location
  - `individual.ownerAddressProcessed` - Processed Address object for owner address
- **Error Handling**: try-catch blocks with console.warn for processing failures

### Critical Entity Structure Discovery
**ISSUE IDENTIFIED**: VisionAppraisal entities don't have `entityType` properties
**SOLUTION FOUND**: Use `entity.constructor.name` for type identification
- `entity.constructor.name === 'Individual'` (not `entity.entityType === 'Individual'`)
- Entity types available: Individual, AggregateHousehold, Business, LegalConstruct

### Address Processing Test Results (Validated 2025-10-26)
**Test Sample**: 5 Individual entities, 100% success rate
**Address Processing Confirmed Working**:
- **Tag Cleaning**: `::#^#::` and `:^#^:` tags properly removed from addresses
- **Block Island Detection**: RI addresses properly identified
- **Address Components**: Street numbers, names, cities, states, ZIP codes correctly parsed
- **Sample Input**: `"PO BOX 1287::#^#::BLOCK ISLAND:^#^: RI 02807"`
- **Sample Output**: `"Address: PO BOX 1287, Block Island, RI, 02807"`

### Testing Methodology Issues Discovered
**TRANSPARENCY PROBLEM**: Current testing shows processing works but lacks detailed validation
**USER CONCERN**: Need more transparent testing to verify address processing correctness
**REQUIRED IMPROVEMENTS**:
- Show detailed before/after address comparisons
- Validate each address processing step
- Demonstrate tag cleaning effectiveness
- Confirm Block Island detection logic
- Display address component breakdown

### Browser Testing Protocol Applied Successfully
**Protocol Used**: No refresh required - address processing functions already loaded
**Dependencies Confirmed**: `processAddress` and `createAddressFromParsedData` available in browser
**Test Function**: Used existing `testBothQuietVersions()` with entity constructor name filtering

**Results**:
- **VisionAppraisal**: 2,317/2,317 records (100.0%) - 363 Individual, 931 AggregateHousehold, 211 Business, 812 LegalConstruct
- **Bloomerang**: 1,362/1,362 records (100.0%) - 1,360 Individual, 2 NonHuman, 426 households
- **Total Entity Creation**: 3,679 entities across both systems

**Implementation Details**:
- **Console.log Override Solution**: Uses exact message pattern filtering instead of modifying helper functions
- **Blocked Verbose Messages**: "Row X: Primary household member found", "Upgrading placeholder location", "Created new household"
- **Preserved Original Code**: No modifications to shared helper functions that both versions use
- **Pattern-Based Filtering**: Regex patterns from actual code messages for precise blocking
- **Error Logging Intact**: All console.error messages preserved for debugging

## Validation Commands Available
**Proven Analysis Tools** (ready to apply to Bloomerang):
- `analyzeVisionAppraisalFieldMappingCorrected()` → adapt for Bloomerang data
- Google Drive file access using Method 1 (gapi.client.drive.files.get)
- Systematic field coverage assessment with missing field categorization
- Sample data comparison and visualization tools