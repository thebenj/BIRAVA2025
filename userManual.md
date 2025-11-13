# Complete BIRAVA2025 Data Processing Manual

## **Overview**: Complete Dual-Source Data Pipeline

This manual covers the **COMPLETE processing sequence** for both VisionAppraisal and Bloomerang data sources that feed into the name matching system described in CLAUDE.md.

### **Prerequisites**

#### **VisionAppraisal**: No External Files Needed
- **Website Access**: `https://gis.vgsi.com/newshorehamri` (configured in `.env`)
- **Google Drive Authentication**: For saving processed results
- **Internet Connection**: For web scraping operations

#### **Bloomerang**: CSV Export Required
- **Export CSV**: Export from Bloomerang with all 30 fields
- **Preprocess**:
  - Remove totals row
  - Replace commas with `^#C#^`
  - Format numbers properly
- **Save As**: `All Data.csv` in `/servers/Results/` directory

---

## **COMPLETE PROCESSING SEQUENCE**

### **Phase 1: Application Setup**
1. **Start Servers**: `node servers/server.js`
   - HTTP Server: `http://127.0.0.1:1337/` (user interface)
   - Express API Server: `127.0.0.99:3000` (proxy for VisionAppraisal website)

2. **Open Browser**: Navigate to `http://127.0.0.1:1337/`
3. **Authorize Google**: Click "Authorize" button, complete OAuth

### **Phase 2: VisionAppraisal Data Acquisition (Website Scraping)**

#### **Step 1: First Button - Extract Street Directory**
- **Function**: Scrapes `Streets.aspx` from VisionAppraisal website
- **Process**:
  - Fetches street directory page from `https://gis.vgsi.com/newshorehamri`
  - Extracts all street links and names
  - Stores street data in memory for next step
- **Result**: List of all Block Island streets with their VisionAppraisal URLs

#### **Step 2: Second Button - Extract Street Details**
- **Function**: Processes each street page for parcel links
- **Process**:
  - Visits each street URL from Step 1
  - Extracts all property/parcel links from each street
  - Builds comprehensive list of all properties
- **Saves to Google Drive**: Street names list (for reference)
- **Result**: Complete inventory of all Block Island properties with URLs

#### **Step 3: Third Button - Extract Parcel IDs**
- **Function**: Extracts PID (Property ID) numbers from parcel pages
- **Process**:
  - Visits each property URL from Step 2
  - Extracts the unique PID number from each property page
  - Creates deduplicated list of all PIDs
- **Saves to Google Drive**: Parcel data list
- **Saves to Local Disk**: `original_parcels.json` (for resume capability)
- **Result**: List of all unique Property ID numbers (PIDs)

#### **Step 4: Fourth Button - Extract Complete Property Data**
- **Function**: Scrapes detailed property information for each PID
- **Process**:
  - Visits `Parcel.aspx?pid=[NUMBER]` for each PID
  - Extracts: Owner Name, Co-owner, Address, Property Location, Zone, Use Code, etc.
  - Processes in batches of 8 for efficiency
  - **CRITICAL**: Saves to different Google Drive files on different runs
- **First Run Saves to**: `parameters.everyThingWithID` (File A) - Main data file
- **Second Run Saves to**: `parameters.everyThingWithIDB` (File B) - Additional data file
- **Individual Files**: Each property also saved as individual JSON file
- **Progress Tracking**: Maintains `completed_pids.json` for resume capability
- **Result**: Complete property database with all details

#### **Step 5: "Merge and Go Again" Button - Data Consolidation**
- **Function**: Combines File A + File B into single merged dataset
- **Process**:
  - Loads both `everyThingWithID` and `everyThingWithIDB` from Google Drive
  - Concatenates the arrays (File A + File B = Complete Dataset)
  - Saves merged result back to `everyThingWithID`
  - Triggers additional processing cycle
- **⚠️ WARNING**: This runs a very long process (processes each PID individually again)
- **Result**: Single file with ALL VisionAppraisal records (typically ~2,317 records)

### **Phase 3: Bloomerang Data Processing**

#### **Step 6A: Basic Bloomerang Processing (Testing/Development)**
- **Function**: `readBloomerang()` - Basic CSV processing without entity serialization
- **Usage**: For testing CSV parsing and basic data validation
- **Process**:
  - Reads `All Data.csv` from `/servers/Results/`
  - Basic CSV parsing with comma restoration (`^#C#^` → `,`)
  - Saves raw processed data to Google Drive
- **Result**: Raw CSV data stored for further processing

#### **Step 6B: Production Entity Collection Creation** ⭐ **PRODUCTION METHOD**
- **Function**: `readBloomerangWithEntities(saveToGoogleDrive, batchId)`
- **Usage**: **CRITICAL FOR CREATING TIMESTAMPED COLLECTION FILES**

**⚠️ IMPORTANT**: This is the process that creates the three timestamped Google Drive files:
- `Individual_2025-10-10T00-37-26_Batch_Production_2025_01_09.json`
- `AggregateHousehold_2025-10-10T00-37-27_Batch_Production_2025_01_09.json`
- `NonHuman_2025-10-10T00-37-29_Batch_Production_2025_01_09.json`

**Production Command Example**:
```javascript
// Browser console command for production entity collection creation
readBloomerangWithEntities(true, "Production_2025_01_09");
```

**Parameter Details**:
- **`saveToGoogleDrive`**: `true` = Creates timestamped collection files, `false` = Processing only
- **`batchId`**: Custom identifier for organizing processing runs (appears in filename)
  - Format: `"Production_YYYY_MM_DD"` or `"Development_SessionName"`
  - Example: `"Production_2025_01_09"`, `"Development_FireNumberTesting"`

**Complete Processing Sequence**:
1. **CSV Processing**:
   - Reads all 30 CSV fields (enhanced from previous 6-field limitation)
   - Processes ~1,362 records with 100% success rate

2. **Entity Creation**:
   - **Individual entities**: People not in households (~936 entities)
   - **AggregateHousehold entities**: Multi-person households (~426 households)
   - **NonHuman entities**: Organizations, trusts, businesses
   - **Complete contact information**: Fire Numbers, addresses, account numbers
   - **Household relationships**: Head-of-household detection and member associations

3. **Collection Serialization** (when `saveToGoogleDrive = true`):
   - **Individual Collection**: Serialized to `folderIds.individuals` (`1qY7u1N9VaXd6xK-FVagaXm5vEckZPqZ7`)
   - **Household Collection**: Serialized to `folderIds.households` (`17-5HMMss762EW_6d1qgbzrAHEz_zVCs8`)
   - **NonHuman Collection**: Serialized to `folderIds.nonHuman` (`1VdhjD3W2-oHXUntLqV4iMUZhO04OqQHt`)

**Collection File Structure**:
```json
{
  "metadata": {
    "batchId": "Production_2025_01_09",
    "created": "2025-10-10T00:37:26.000Z",
    "totalEntities": 936,
    "entityType": "Individual",
    "version": "1.0"
  },
  "entities": {
    "entity_key_1": { /* serialized entity data */ },
    "entity_key_2": { /* serialized entity data */ }
  },
  "indexes": {
    "byName": { /* searchable name index */ },
    "byLocation": { /* searchable location index */ }
  }
}
```

**Result**: Complete entity collections with:
- **Searchable indexes** for efficient entity lookup
- **Full data preservation** (all 30 CSV fields retained)
- **Proper AttributedTerm provenance** tracking data sources
- **Entity relationships** (household members, contact information)
- **Production-ready format** for name matching and integration work

### **Phase 4: Enhanced Processing for Name Matching**

#### **Step 7: "🔄 Process & Save VisionAppraisal Data" Button**
- **Function**: Creates the final processed dataset for name matching
- **Loads**: Merged VisionAppraisal data from server endpoint (all 2,317 records)
- **Processing**:
  - Parses MBLU fields → map/block/lot/unit components
  - Cleans name tags (`:^#^:` → commas, `::#^#::` → spaces)
  - Creates `processedOwnerName` field
  - Extracts and validates Fire Numbers
  - Parses addresses into street/city/state/zip
  - Adds processing metadata
- **Saves to Google Drive**:
  - **File ID**: `1oIW1m1Qw2lyreU-uGMX3jUka9LwaBTAf`
  - **Name**: `VisionAppraisal_ProcessedData.json`
  - **Structure**: `{metadata: {...}, records: [...]}`
- **Result**: **FINAL PROCESSED FILE** ready for CLAUDE.md name matching work

---

## **Complete Data Flow Summary**
```
VisionAppraisal Website → Street Directory → Property Pages → PID Extraction
                                                                    ↓
Fourth Button Run #1 → everyThingWithID (File A) ← SERVER SERVES THIS
                                                                    ↓
Fourth Button Run #2 → everyThingWithIDB (File B) ← ADDITIONAL DATA
                                                                    ↓
"Merge and Go Again" → Combined Dataset → everyThingWithID (Merged ~2,317)
                                                                    ↓
                                      PARALLEL PROCESSING
                                                                    ↓
Bloomerang CSV → readBloomerangWithEntities(true, batchId) → TIMESTAMPED COLLECTIONS
                                                                    ↓
                                        THREE COLLECTION FILES:
                              Individual_TIMESTAMP_Batch_BATCHID.json
                         AggregateHousehold_TIMESTAMP_Batch_BATCHID.json
                              NonHuman_TIMESTAMP_Batch_BATCHID.json
                                                                    ↓
Both Datasets Ready → "Process & Save VisionAppraisal" → Final Enhanced Dataset
                                                                    ↓
                              READY FOR CLAUDE.MD NAME MATCHING WORK
```

## **Phase 5: Ready for CLAUDE.md Name Matching Work**

Both datasets now prepared with:
- **VisionAppraisal**: 2,317 processed property records with clean names, parsed addresses, validated Fire Numbers
- **Bloomerang**: 1,362 Individual entities with complete 30-field data and household relationships
- **Pattern Analysis Tools**: Name pattern analyzer, business entity filters, custom Levenshtein algorithm
- **Google Drive Integration**: All processed data accessible for sophisticated matching algorithms
- **Next Step**: Begin CLAUDE.md "START HERE NEXT SESSION" work for pattern-aware name matching

---

## **Critical Order Requirements**
1. **VisionAppraisal must be processed FIRST**: First → Second → Third → Fourth (twice) → Merge
2. **Fourth button must be run TWICE** to create both File A and File B
3. **Must run "Merge and Go Again"** to combine both files into complete dataset
4. **Bloomerang processing can run in parallel** after VisionAppraisal merge is complete
5. **Final "Process & Save VisionAppraisal"** creates the enhanced file used in CLAUDE.md

## **Production Best Practices for Entity Collection Creation**

### **Batch ID Naming Conventions**
- **Production Runs**: `"Production_YYYY_MM_DD"` (e.g., `"Production_2025_01_09"`)
- **Development Runs**: `"Development_SessionName"` (e.g., `"Development_FireNumberTesting"`)
- **Testing Runs**: `"Test_Purpose"` (e.g., `"Test_CSVValidation"`)

### **Creating Production Entity Collections**
1. **Verify Prerequisites**:
   - `All Data.csv` properly preprocessed (commas → `^#C#^`)
   - Google authentication active
   - Server running (`node servers/server.js`)

2. **Production Command**:
   ```javascript
   // Browser console - Creates timestamped collection files
   readBloomerangWithEntities(true, "Production_2025_01_15");
   ```

3. **Verify Results**:
   - Check console for entity counts (~936 Individual, ~426 AggregateHousehold)
   - Confirm three timestamped files created in Google Drive
   - Record Google Drive file IDs for future reference

### **Google Drive File Management**
- **Individual Collection Folder**: `1qY7u1N9VaXd6xK-FVagaXm5vEckZPqZ7`
- **Household Collection Folder**: `17-5HMMss762EW_6d1qgbzrAHEz_zVCs8`
- **NonHuman Collection Folder**: `1VdhjD3W2-oHXUntLqV4iMUZhO04OqQHt`
- **File Naming**: `{EntityType}_{ISO-Timestamp}_Batch_{BatchId}.json`

## **Error Prevention Guidelines**
- **Each VisionAppraisal button depends on the previous one** - don't skip steps
- **Fourth button behavior changes between runs** - first run creates File A, second run creates File B
- **"Merge and Go Again" takes hours** - don't interrupt the process (processes ~2,317 records individually)
- **Check record counts** after each major step to verify completeness
- **Bloomerang CSV must be properly preprocessed** - commas replaced with `^#C#^`
- **Google authentication must remain active** throughout all processing
- **Entity collection creation requires explicit parameters** - don't forget `saveToGoogleDrive=true`
- **Batch IDs become part of filenames** - use consistent naming conventions
- **Final processing creates the specific file referenced in CLAUDE.md** - this enables the sophisticated name matching work

## **Expected Results**
After completing this entire pipeline:

### **VisionAppraisal Processing Results**
- **VisionAppraisal_ProcessedData.json**: 2,317 enhanced property records ready for name matching
- **File ID**: `1oIW1m1Qw2lyreU-uGMX3jUka9LwaBTAf`
- **Enhanced Fields**: Parsed MBLU, cleaned addresses, validated Fire Numbers

### **Bloomerang Entity Collection Results**
- **Individual Collection**: `Individual_TIMESTAMP_Batch_BATCHID.json` (~936 entities)
  - **Sample File ID**: `1s7VnmD4CZg09y-GKmfX4W6tZb2SDaJLy`
  - **Contains**: People not in households with complete contact information

- **Household Collection**: `AggregateHousehold_TIMESTAMP_Batch_BATCHID.json` (~426 entities)
  - **Sample File ID**: `1HhjM33856-jehR1xSypXyE0qFuRw26tx`
  - **Contains**: Multi-person households with member relationships

- **NonHuman Collection**: `NonHuman_TIMESTAMP_Batch_BATCHID.json` (variable count)
  - **Sample File ID**: `1HhjM33856-jehR1xSypXyE0qFuRw26tx` (shared with households)
  - **Contains**: Organizations, trusts, businesses

### **Integration Readiness**
- **Both Datasets**: Prepared for multi-stage matching pipeline described in CLAUDE.md
- **Entity Collections**: Include searchable indexes for efficient lookup
- **AttributedTerm Provenance**: Complete data lineage tracking for quality assurance
- **Pattern Analysis**: Complete hierarchical name pattern classification available
- **Business Intelligence**: Word frequency databases and business entity filters ready for use

### **Production File Organization**
```
Google Drive Structure:
├── Individual Collection Folder (1qY7u1N9VaXd6xK-FVagaXm5vEckZPqZ7)
│   └── Individual_2025-10-10T00-37-26_Batch_Production_2025_01_09.json
├── Household Collection Folder (17-5HMMss762EW_6d1qgbzrAHEz_zVCs8)
│   └── AggregateHousehold_2025-10-10T00-37-27_Batch_Production_2025_01_09.json
└── NonHuman Collection Folder (1VdhjD3W2-oHXUntLqV4iMUZhO04OqQHt)
    └── NonHuman_2025-10-10T00-37-29_Batch_Production_2025_01_09.json
```

This complete pipeline transforms raw data from both sources into sophisticated processed datasets with timestamped entity collections that power the advanced name matching and contact discovery system.

---

# Adding New Cases to ConfigurableVisionAppraisalNameParser

## Overview

The ConfigurableVisionAppraisalNameParser uses a modular, configuration-driven architecture that makes adding new parsing cases straightforward. New cases require only configuration updates - no modification of the core parser engine.

## Step-by-Step Process for Adding a New Case

### Step 1: Define the Case Logic

1. **Identify the Pattern**: Determine what conditions should trigger your new case (word count, punctuation, business terms, etc.)

2. **Add Case Definition**: Open `/scripts/dataSources/configurableVisionAppraisalNameParser.js` and add your new case to the `caseDefinitions` object:

```javascript
caseYourNewCase: {
    priority: [number], // Lower numbers = higher priority
    entityType: 'Individual|AggregateHousehold|Business|LegalConstruct|NonHuman',
    logicalTest: function(data) {
        return data.wordCount === [number] &&
               data.hasBusinessTerms === [true/false] &&
               data.punctuationInfo.[condition];
    },
    processor: function(words, record, index) {
        // Your parsing logic here
        // Create appropriate entity and return it
        return this.createIndividual(individualName, record, index);
    }
}
```

3. **Available Test Data Properties**:
   - `data.wordCount` - Number of words
   - `data.hasBusinessTerms` - Boolean for business entity detection
   - `data.punctuationInfo.hasCommas` - Has comma punctuation
   - `data.punctuationInfo.hasAmpersand` - Has ampersand (&)
   - `data.punctuationInfo.hasMajorPunctuation` - Has significant punctuation
   - `data.firstWordEndsComma` - First word ends with comma
   - `data.lastWordEndsComma` - Last word ends with comma
   - Many other pattern detection properties

### Step 2: Implement the Processor Function

**For Individual Cases**:
```javascript
processor: function(words, record, index) {
    const firstName = words[0].replace(/[,;]$/, '').trim();
    const lastName = words[1].replace(/[,;]$/, '').trim();
    const fullName = `${lastName}, ${firstName}`;

    const individualName = new IndividualName(
        new AttributedTerm(fullName, 'VISION_APPRAISAL', index, record.pid),
        "", // title
        firstName, // firstName
        "", // otherNames
        lastName, // lastName
        "" // suffix
    );

    return this.createIndividual(individualName, record, index);
}
```

**For Household Cases**:
```javascript
processor: function(words, record, index) {
    const fullName = words.join(' ');
    const householdName = new AttributedTerm(fullName, 'VISION_APPRAISAL', index, record.pid);
    return this.createAggregateHousehold(householdName, [], record, index);
}
```

**For Business Cases**:
```javascript
processor: function(words, record, index) {
    const ownerName = words.join(' ');
    return this.createBusinessEntity(ownerName, record, index);
}
```

### Step 3: Test the New Case

1. **Load Dependencies and Test**: Run this command in browser console:

```javascript
// Complete test with new case
const scripts = [
    './scripts/objectStructure/aliasClasses.js',
    './scripts/objectStructure/entityClasses.js',
    './scripts/dataSources/visionAppraisal.js',
    './scripts/validation/case31Validator.js',
    './scripts/dataSources/visionAppraisalNameParser.js',
    './scripts/dataSources/configurableVisionAppraisalNameParser.js',
    './testPhase2D.js',
    './tests/testPipelineComparison.js'
];

let i = 0;
function loadNext() {
    if (i < scripts.length) {
        const script = document.createElement('script');
        script.src = scripts[i];
        script.onload = () => {
            console.log(`✅ ${scripts[i]} loaded`);
            i++;
            if (i === scripts.length) {
                console.log('🚀 Running pipeline comparison test...');
                setTimeout(() => testPipelineComparison(), 1000);
            } else {
                loadNext();
            }
        };
        document.head.appendChild(script);
    }
}
loadNext();
```

2. **Verify Results**: The test should show:
   - ✅ Both parsers complete successfully
   - ✅ Success rates remain at 100%
   - ✅ Entity distributions are identical or improved
   - ✅ "PERFECT PIPELINE MATCH!" confirmation

### Step 4: Validate Case Priority

If your new case conflicts with existing cases:

1. **Adjust Priority**: Lower priority numbers are evaluated first
2. **Refine Logic**: Make logical tests more specific to avoid conflicts
3. **Test Again**: Repeat Step 3 to ensure no regressions

## Testing Best Practices

### Incremental Testing Protocol

**CRITICAL**: Always test after each change - never make multiple changes without testing.

1. **Make ONE change** (add one case)
2. **Test immediately** using the pipeline comparison
3. **Verify success** before proceeding
4. **Fix any issues** before adding more cases

### Expected Test Results

**Successful Case Addition**:
- No syntax errors during script loading
- Pipeline comparison completes without errors
- Both parsers show identical results
- "PERFECT PIPELINE MATCH!" confirmation appears

**Failed Case Addition**:
- Syntax errors in console
- Pipeline comparison fails or shows mismatched results
- Different entity counts between parsers

## Troubleshooting Common Issues

### Syntax Errors
- Check for missing commas between case definitions
- Verify proper JavaScript syntax in logical tests and processors
- Ensure all parentheses and brackets are properly closed

### Logic Conflicts
- New case may be captured by existing cases with higher priority
- Adjust priority numbers or refine logical test conditions
- Test with specific name patterns that should trigger your case

### Entity Creation Issues
- Use the helper methods: `createIndividual`, `createAggregateHousehold`, `createBusinessEntity`
- Always include the `record` and `index` parameters
- Ensure AttributedTerm constructors use 4-parameter format: `(term, 'VISION_APPRAISAL', index, record.pid)`

## Case Definition Reference

The configuration-driven architecture allows complete modularity - each case is self-contained with its detection logic and processing behavior. This makes the system highly maintainable and allows for easy extension without risking existing functionality.