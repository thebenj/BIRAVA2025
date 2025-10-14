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

#### **Step 6: "Process Bloomerang CSV" Button**
- **Function**: Loads and processes `All Data.csv` from `/servers/Results/`
- **Process**:
  - Reads all 30 CSV fields (vs. previous 6-field limitation)
  - Creates Individual entities with complete contact information
  - Creates AggregateHousehold entities with proper relationships
  - Processes Fire Numbers, addresses, account numbers
  - Handles household head relationships and duplicate detection
- **Saves to Google Drive**:
  - Individual collection files
  - Household collection files
  - NonHuman entity files
- **Result**: ~1,362 Individual entities, ~426 Households with full relationship data

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
Bloomerang CSV → "Process Bloomerang CSV" → Individual/Household Entities (~1,362)
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

## **Error Prevention Guidelines**
- **Each VisionAppraisal button depends on the previous one** - don't skip steps
- **Fourth button behavior changes between runs** - first run creates File A, second run creates File B
- **"Merge and Go Again" takes hours** - don't interrupt the process (processes ~2,317 records individually)
- **Check record counts** after each major step to verify completeness
- **Bloomerang CSV must be properly preprocessed** - commas replaced with `^#C#^`
- **Google authentication must remain active** throughout all processing
- **Final processing creates the specific file referenced in CLAUDE.md** - this enables the sophisticated name matching work

## **Expected Results**
After completing this entire pipeline:
- **VisionAppraisal_ProcessedData.json**: 2,317 enhanced property records ready for name matching
- **Bloomerang Collections**: 1,362 Individual entities with full relationship data
- **Integration Ready**: Both datasets prepared for the multi-stage matching pipeline described in CLAUDE.md
- **Pattern Analysis**: Complete hierarchical name pattern classification available
- **Business Intelligence**: Word frequency databases and business entity filters ready for use

This complete pipeline transforms raw data from both sources into the sophisticated processed datasets that power the advanced name matching and contact discovery system.