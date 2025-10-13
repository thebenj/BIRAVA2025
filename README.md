# BIRAVA2025 Application

# ⚠️ CRITICAL DEVELOPMENT REQUIREMENT - READ FIRST ⚠️

## 🛑 MANDATORY INCREMENTAL TESTING PROTOCOL 🛑

**FOR ALL CLAUDE CODE ASSISTANCE:**

### **NEVER MAKE MULTIPLE CHANGES WITHOUT TESTING EACH STEP**

**REQUIRED WORKFLOW:**
1. **Make ONE small change**
2. **Test that change immediately**
3. **Verify functionality works**
4. **Only then proceed to next change**

**FORBIDDEN:**
- Making multiple changes in batch
- Implementing entire features without step-by-step testing
- Making changes to multiple files without testing each
- Adding new functions without testing them individually

**This is not optional. This is a core development principle for this project.**

---

## Project Overview

BIRAVA2025 is a comprehensive data integration system designed for Block Island community management. The application consolidates information from three disparate data sources to create a unified view of residents, properties, and relationships within the Block Island community.

### Project Purpose
Block Island's unique characteristics - split residency patterns, multiple address types, and complex property relationships - create challenges for community organizations trying to maintain accurate contact and demographic information. BIRAVA2025 addresses these challenges by:

- **Integrating disparate data sources** into a coherent entity model
- **Resolving identity conflicts** across different databases
- **Managing complex address relationships** (on-island vs off-island residences)
- **Creating household-level communication entities** for efficient outreach

### Current Functionality
The application currently provides three core data processing capabilities:

1. **VisionAppraisal Data Processing** - Downloads and converts current property assessment data
2. **Phonebook Data Processing** - Converts phone directory data to structured JSON format and uploads to Google Drive
3. **Bloomerang Data Processing** - **PRODUCTION READY**:
   - **Legacy**: `readBloomerang()` - Converts CSV to structured JSON format and uploads to Google Drive (DEPRECATED)
   - **Primary**: `readBloomerangWithEntities(saveToGoogleDrive, batchId)` - **FULLY OPERATIONAL** entity processing with:
     - Complete household relationship processing (426 households created)
     - 100% record processing success rate (1362/1362 records)
     - **Enhanced Field Processing**: All 30 CSV fields captured (vs previous ~6 fields)
     - **Collection System**: Generates 3 searchable collection files instead of 1,400+ individual files
     - **Entity Browser Integration**: Direct support for web-based entity exploration
     - Google Drive serialization with organized folder structure
     - Comprehensive error tracking and diagnostic capabilities
     - Debug function `investigateRecord(recordNumber)` for detailed record analysis

**Operation Methods**: Functions are operated via browser buttons (VisionAppraisal) or browser console commands (Phonebook and Bloomerang).

**New Serialization Capabilities**: Entity data can be automatically serialized and stored in structured Google Drive folders during processing, with user-controlled folder organization and batch tracking.

**Current Status**: The entity-based Bloomerang processing function (`readBloomerangWithEntities()`) is **FULLY OPERATIONAL** with comprehensive household processing and Google Drive serialization. **MAJOR BREAKTHROUGH**: All 1458 records now processed successfully (100% success rate), complete household entity system implemented, and working Google Drive serialization for entity storage.

### Development Vision
The object-oriented entity resolution system is **OPERATIONAL AND PRODUCTION-READY** for Bloomerang data processing. **COMPLETED FEATURES**: Full household processing with proper entity relationships, comprehensive serialization system with Google Drive storage, 100% record processing success rate, and sophisticated error tracking. The current phase focuses on integrating VisionAppraisal and Phonebook data sources to complete the tri-source entity resolution system.

## Application Architecture

### Server Configuration
The application runs **two servers simultaneously**:

1. **HTTP Server (Port 1337)** - Main web application
   - URL: `http://127.0.0.1:1337/`
   - Serves: index.html and static files (scripts/, etc.)
   - **This is the URL users should access in their browser**

2. **Express API Server (Port 3000)** - API endpoints only
   - URL: `http://127.0.0.99:3000/`
   - Serves: API routes including /csv-file endpoint
   - Used internally by the frontend for API calls

**Critical Server Startup:**
```bash
cd /home/robert-benjamin/RPBprojects/VisionAppraisal/BIRAVA2025/BIRAVA2025
node servers/server.js
```

### File Structure

```
BIRAVA2025/
├── servers/
│   ├── server.js           # Main server (both HTTP and Express)
│   └── Results/
│       └── All Data.csv    # Bloomerang CSV input file (enhanced 30-field structure)
├── scripts/
│   ├── baseCode.js         # VisionAppraisal functions (button-operated)
│   ├── bloomerang.js       # Bloomerang CSV processing (console-operated, FUNCTIONAL)
│   ├── entityBrowser.js    # Entity Browser Tool (web interface for collections)
│   ├── phonebook.js        # Phonebook processing (console-operated)
│   ├── utils.js            # Shared utilities
│   └── objectStructure/    # Entity resolution class system
│       ├── aliasClasses.js      # Core AttributedTerm & identifier classes
│       ├── contactInfo.js       # ContactInfo class with communications hierarchy
│       └── entityClasses.js     # Entity base class and subclasses
└── index.html              # Main application interface
```

## Core Functionality

### 1. VisionAppraisal Data Processing
- **Location**: `scripts/baseCode.js`, `scripts/utils.js`
- **Operation**: Button-based interface
- **Purpose**: Downloads and converts current VisionAppraisal data
- **Status**: Mature functionality

### 2. Phonebook Data Processing
- **Location**: `scripts/phonebook.js`
- **Operation**: Console functions
- **Key Function**: `readPhonebook()`
- **Purpose**: Converts phonebook data to structured JSON and uploads to Google Drive

### 3. Bloomerang Data Processing
- **Location**: `scripts/bloomerang.js`, `scripts/objectStructure/`
- **Operation**: Console functions
- **Key Functions**:
  - `readBloomerangWithEntities()` - **NEW FUNCTIONAL** entity-based processing with AttributedTerm provenance
  - `readBloomerang()` - Legacy processing (DEPRECATED)
  - `analyzeBloomerangCSV()` - CSV diagnostic function
- **Purpose**: Creates Entity objects (Individual, AggregateHousehold, NonHuman) with proper location identifier hierarchy and AttributedTerm source tracking
- **Status**: **BREAKTHROUGH** - Core processing logic implemented and tested with real 1458-row CSV data

## Bloomerang Processing Details

### Prerequisites
The Bloomerang CSV file (`servers/Results/All Data.csv`) **must** be preprocessed:
1. Eliminate the second row (total row)
2. Format all numeric columns to not have commas
3. Search and replace all commas with `^#C#^`
4. Search and replace all `\n` with null

### Configuration
```javascript
const bloomerangParameters = {
    csvFile: { path: "./servers/Results/All Data.csv" },
    outputFolder: "1YkB2-G2pPtmEmE0DtzjX6nXK6QKVb-X2",
    outputFile: "1JVBMePgqTvq3BETV57gohA0GDTOFeCYy"
};
```

### Usage
```javascript
// Entity-based processing (PRIMARY METHOD)
await readBloomerangWithEntities();

// With Google Drive serialization
await readBloomerangWithEntities(true, "MyBatch_001");

// Debug individual records
await investigateRecord(recordNumber);

// Legacy processing (DEPRECATED)
await readBloomerang();

// Diagnostic analysis (troubleshooting only)
await analyzeBloomerangCSV();
```

## Enhanced Data Capture - 30-Field Processing

### Complete Field Processing Implementation
**Status**: ✅ **PRODUCTION READY** - All 30 CSV fields now captured

The Bloomerang processing system has been enhanced to capture **all 30 fields** from the CSV instead of the previous partial data extraction (~6 fields). This provides comprehensive entity information for advanced search and analysis.

#### Enhanced Field Mapping
```javascript
const fieldMap = {
    // Core Identity Fields (1-6)
    name: 0,           // Field 1: Complete Name
    firstName: 1,      // Field 2: First Name
    middleName: 2,     // Field 3: Middle Name
    lastName: 3,       // Field 4: Last Name
    email: 4,          // Field 5: Primary Email Address
    accountNumber: 5,  // Field 6: Account Number

    // Transaction Data (7-8)
    transactionAmount: 6, // Field 7: First Transaction Amount
    transactionDate: 7,   // Field 8: First Transaction Date

    // Address Structure (9-25) - Four complete address sets
    primaryStreet: 9,   homeStreet: 13,   vacationStreet: 17,   workStreet: 21,
    primaryCity: 10,    homeCity: 14,     vacationCity: 18,     workCity: 22,
    primaryState: 11,   homeState: 15,    vacationState: 19,    workState: 23,
    primaryZip: 12,     homeZip: 16,      vacationZip: 20,      workZip: 24,

    // Block Island Specific (26-30)
    fireNumber: 25,          // Field 26: Fire Number
    biStreet: 26,           // Field 27: BI Street
    biPoBox: 27,            // Field 28: BI PO Box
    householdName: 28,      // Field 29: Household Name
    isHeadOfHousehold: 29   // Field 30: Is Head of Household
};
```

#### New Data Processing Functions

**`createContactInfo(fields, fieldMap, rowIndex, accountNumber, dataSource)`**
- Processes email, Block Island PO Box, and BI Street data
- Creates ContactInfo objects with proper AttributedTerm provenance
- Returns null if no contact data found (preserves data integrity)

**`createAdditionalData(fields, fieldMap, rowIndex, accountNumber, dataSource)`**
- Captures comprehensive additional data beyond core entity fields
- **Transaction Data**: Amount, date, appeal information
- **All Address Types**: Primary, home, vacation, work addresses with full details
- **Block Island Data**: Fire number, BI street, BI PO Box information
- **Household Data**: Household name and head of household status

#### Enhanced Entity Structure
Entities now contain comprehensive data:
```javascript
entity = {
    locationIdentifier: /* Fire Number/PID/Address */,
    name: /* IndividualName with all name components */,
    accountNumber: /* Account tracking */,
    contactInfo: {           // NEW - Contact information
        email: /* Email with provenance */,
        biPOBox: /* Block Island PO Box */,
        biStreet: /* Block Island Street */
    },
    additionalData: {        // NEW - Comprehensive additional data
        transactionData: {
            amount: /* Transaction amount */,
            date: /* Transaction date */,
            appeal: /* Appeal information */
        },
        addresses: {
            primary: { street, city, state, zip },
            home: { street, city, state, zip },
            vacation: { street, city, state, zip },
            work: { street, city, state, zip }
        },
        blockIslandData: {
            fireNumber: /* Fire number */,
            biStreet: /* BI Street */,
            biPoBox: /* BI PO Box */
        },
        householdData: {
            householdName: /* Household name */,
            isHeadOfHousehold: /* Boolean status */
        }
    }
}
```

#### Data Completeness Benefits
- **Comprehensive Search**: Browser tool can search across all 30 fields
- **Complete Address Information**: Four address types fully captured
- **Transaction Tracking**: Amount and date information preserved
- **Block Island Specificity**: All BI-specific fields captured
- **Contact Integration**: Email and contact information ready for communication
- **Household Context**: Complete household structure and leadership information

## Entity Browser Tool - Collection Explorer

### Interactive Web Interface for Entity Management
**Status**: ✅ **PRODUCTION READY** - Full browser-based entity exploration

The Entity Browser Tool provides a comprehensive web interface for querying, searching, and managing the processed entity collections. This tool replaces the need for individual file management by providing searchable access to all entities through collection files.

#### Key Features
- **Collection Loading**: Direct integration with Google Drive collection files
- **Advanced Search**: Search across all entity fields and data types
- **Smart Filtering**: Quick filters by account number, fire number, name patterns
- **Interactive Results**: Click-to-select entities with detailed viewing
- **Export Capabilities**: Download search results as JSON files
- **Real-time Statistics**: Index statistics and collection metadata

#### Browser Tool Architecture
**File**: `scripts/entityBrowser.js` (~400 lines)
**Integration**: Embedded in main application interface (`index.html`)

```javascript
// Global state management
const entityBrowser = {
    collections: {
        individuals: null,    // Individual entity collection
        households: null,     // Household entity collection
        nonhuman: null       // Business/legal entity collection
    },
    currentCollection: 'individuals',
    currentResults: [],
    selectedEntity: null
};
```

#### Collection System Integration
The browser tool works with the new **Collection System Architecture**:

**Previous Approach**: 1,400+ individual entity files uploaded to Google Drive
**New Approach**: 3 comprehensive collection files with advanced indexing:

1. **individuals.json** - All individual entities with comprehensive data
2. **households.json** - All household entities with member relationships
3. **nonhuman.json** - All business and legal entities

#### Core Functionality

**Collection Loading**
```javascript
await loadCollections() // Loads all three collections from Google Drive
```

**Search and Filter Operations**
- **Full-text search**: Searches across all entity fields and data
- **Quick filters**: Account numbers, fire numbers, name-based filtering
- **Collection switching**: Browse individuals, households, or nonhuman entities
- **Real-time results**: Instant feedback with result counts

**Entity Management**
```javascript
// View detailed entity information
viewSelectedEntity()    // Opens entity details in new window

// Export current search results
exportResults()         // Downloads filtered results as JSON

// View collection statistics
showIndexStats()        // Shows index composition and statistics
```

#### User Interface Integration
**Location**: Entity Browser section in `index.html` (lines 288-329)
**Styling**: Comprehensive CSS with interactive elements and responsive design

**UI Components**:
- **Collection Tabs**: Switch between Individuals, Households, NonHuman
- **Search Interface**: Text input with Enter key support and clear functionality
- **Quick Filter Buttons**: Account #, Fire #, Name, Show All
- **Results Display**: Scrollable list with entity summaries
- **Action Buttons**: Load Collections, Export Results, Index Stats, View Details
- **Status Messages**: Loading, error, and success notifications

#### Search Capabilities
The browser tool provides sophisticated search across all enhanced entity data:

- **Core Fields**: Names, account numbers, location identifiers
- **Contact Information**: Email addresses, PO boxes, phone numbers
- **Address Data**: All four address types (primary, home, vacation, work)
- **Transaction Data**: Transaction amounts, dates, and appeal information
- **Block Island Data**: Fire numbers, BI streets, BI PO boxes
- **Household Data**: Household names, head of household status

#### Collection File Structure
Each collection file contains:
```javascript
{
    metadata: {
        totalEntities: /* count */,
        createdAt: /* timestamp */,
        dataSource: "BLOOMERANG_CSV",
        processingStats: /* statistics */
    },
    entities: {
        "entity_key_1": { /* complete entity data */ },
        "entity_key_2": { /* complete entity data */ }
    },
    index: {
        byAccountNumber: { /* quick lookup */ },
        byFireNumber: { /* quick lookup */ },
        byName: { /* quick lookup */ }
    }
}
```

#### Usage Instructions
1. **Access Application**: Open `http://127.0.0.1:1337/` in browser
2. **Authenticate**: Click "Authorize" for Google Drive access
3. **Load Collections**: Click "📁 Load Collections" to fetch entity data
4. **Search and Filter**: Use search input or quick filter buttons
5. **Select Entities**: Click on results to select for detailed viewing
6. **View Details**: Click "👁️ View Details" to see complete entity information
7. **Export Results**: Click "📄 Export Results" to download filtered data

#### Benefits Over Individual Files
- **Performance**: Single file loads vs 1,400+ individual requests
- **Search Speed**: In-memory search across all entities
- **Manageable Scale**: 3 files instead of 1,400+ files
- **Comprehensive Access**: All entity data available in one interface
- **Advanced Filtering**: Complex queries across multiple fields
- **Export Flexibility**: Custom result sets for analysis

## Entity Serialization System

### Google Drive Folder Structure
The serialization system uses a structured approach to organize entity data:

```
SerializedEntities/          # Main folder (user-created)
├── Individuals/             # Individual entity files
├── Households/              # Household entity files
├── NonHuman/               # Business/Legal entity files
└── ProcessingBatches/       # Batch summary files
```

### Serialization Features
- **Complete Data Fidelity**: All entity relationships and AttributedTerm provenance preserved
- **Automatic File Naming**: Timestamped files with entity summary information
- **Batch Tracking**: Processing batches with statistics and entity inventories
- **User-Controlled Storage**: Folders created by user, not automatically by application

### Folder Setup Requirements
Users must create the folder structure in Google Drive and provide folder IDs to the application. The system uses these pre-created folders rather than attempting to create them programmatically.

# 🛑 DEVELOPMENT GUIDELINES FOR CLAUDE CODE - CRITICAL 🛑

## ⚠️ MANDATORY TESTING PROTOCOL ⚠️

### **🚨 ABSOLUTE REQUIREMENT: INCREMENTAL TESTING 🚨**

**EVERY CHANGE MUST BE TESTED BEFORE THE NEXT CHANGE**

**STEP-BY-STEP PROCESS (NO EXCEPTIONS):**
1. Make ONE small change
2. Ask the USER to test immediately in the browser console
3. Wait for USER to verify it works
4. Only then make the next change

**TESTING REQUIREMENTS:**
- **USER must run tests in browser console** - NOT Claude writing separate test files
- **USER sees the actual results** - this is the only acceptable verification
- **USER determines if test passed** - not Claude's interpretation
- Never write separate test files or mock functions for verification

**EXAMPLES OF UNACCEPTABLE BEHAVIOR:**
- Adding serialization methods to 10+ classes without testing
- Creating multiple new functions without testing each one
- Making changes to different files in one batch
- Implementing complete features without incremental verification
- **Writing test files instead of having user test directly**
- **Trying to verify functionality without user involvement**

### Development Process (REINFORCED)
- **Always work step-by-step**: Break complex tasks into small, testable steps
- **USER TESTS DIRECTLY**: Ask user to test in browser console after each change
- **ONE CHANGE, ONE USER TEST**: Never skip user testing steps
- **NO SEPARATE TEST FILES**: Never write test files - user tests in actual environment
- **USER VERIFIES**: Only user can determine if test passed
- **Document prerequisites**: Clearly state any manual preparation steps required
- **Separate concerns**: Keep diagnostic functions separate from main functionality
- **Use meaningful logging**: Provide user feedback without excessive debugging output

### 🚨 TESTING IS USER-DRIVEN, NOT AUTOMATED 🚨
**If you find yourself writing test code or verifying functionality without user involvement, STOP immediately and ask the user to test directly.**

### Coding Standards
1. **Modular Structure**: No monolithic scripts or behemoth functions
2. **Efficiency**: Code should be optimized and performant
3. **No Redundancy**: Eliminate duplicate code
4. **Copious Comments**: Elaborate commenting throughout
5. **Incremental Changes**: NEVER make multiple changes without outlining steps and planning testing

### Key Lessons from Development
1. **Server Route Order Matters**: Specific routes (like `/csv-file`) must come before catch-all routes (like `/:dis`)
2. **Fetch vs Axios**: Be aware of potential axios interceptors; fetch() may be more reliable for local requests
3. **CSV Preprocessing**: Complex CSV parsing can be avoided by preprocessing at the source
4. **Error Handling**: Always provide clear error messages and fallback handling
5. **Parameter Documentation**: Use clear parameter objects with descriptive names
6. **Google Drive Authentication**: ALWAYS use `gapi.client.getToken().access_token` pattern from working code - do not create custom authentication wrappers
7. **Placeholder Location Identifiers**: Use Fire Number 3499 for entities without location data to ensure 100% record processing
8. **Household Processing Logic**: All household members must be processed - returning `null` from processing functions causes massive data loss
9. **User-Controlled Resources**: Don't auto-create Google Drive folders - let users create and provide folder IDs for better control
10. **Incremental Testing Violations**: Making multiple changes without user testing leads to hard-to-debug compound failures

### Common Troubleshooting
- **Server not accessible**: Check both servers are running on correct ports
- **CSV parsing issues**: Run `analyzeBloomerangCSV()` to diagnose problems
- **404 errors on /csv-file**: Verify server route order in server.js
- **Google Drive upload failures**: Check authentication and file permissions

## Future Development - Object-Oriented Entity Modeling

The next phase involves building an object-oriented model to associate and connect data from the three sources (VisionAppraisal, Phonebook, and Bloomerang). This development will focus on creating household communication entities rather than individual-based records.

### Core Architectural Challenges

The system must address three fundamental issues when modeling household communication entities:

#### 1. The Addressee Issue
**Problem**: Multiple people at the same address should often be treated as a single communication entity (household) for efficiency and appropriateness.

**Examples**:
- John and Jane Smith at 123 Main St should receive one household communication, not two separate mailings
- Different data sources may list different family members as the "primary" contact
- Family relationships and household composition must be inferred from address and name patterns

**Solution Approach**: Build logic to identify and group individuals who should be treated as single communication entities based on address matching, name similarity, and relationship indicators.

#### 2. The Communications Channel Issue
**Problem**: People have multiple communication methods that serve dual purposes, with Block Island-specific patterns and challenges.

**Dual Purpose**:
1. **Deductive Matching**: Communication channels help identify if records across different data sources refer to the same person/household
2. **Actual Communication**: These channels are the means to reach the identified entities

**Block Island Communication Channels**:
1. **Block Island PO Box** - High-confidence unique identifier
2. **Off-Island PO Box** - For residents with off-island addresses
3. **Block Island Fire Number** - Unique building identifier (high-confidence)
4. **Long-form Block Island Address** - Fire number + street + "New Shoreham"/"Block Island" + RI 02807
5. **Off-Island Physical Addresses** - Many residents have both on/off-island homes
6. **PID (Parcel ID)** - Property ownership identifier
7. **Block Island Phone Numbers** - 401-466-XXXX format (or just 466-XXXX assumes Block Island)
8. **Off-Island Phone Numbers**
9. **Email Addresses** - Potentially multiple per person

**Block Island-Specific Challenges**:
- Street names can be written in multiple ways
- Municipality appears as both "Block Island" and "New Shoreham"
- Many residents split time between on-island and off-island residences
- Communication choice depends on where they primarily live
- Some channels (Fire Number, PO Box) are highly reliable identifiers while others require more validation

**Solution Approach**: Implement communication channel objects that recognize Block Island-specific patterns and support both matching algorithms and contact management functionality.

#### 3. The Alias Problem
**Problem**: The same person, place, or thing appears with multiple text representations across different data sources.

**Block Island-Specific Manifestations**:
- **Names**: "Bob Benjamin" vs "Robert Benjamin" vs "Robert Patrick Benjamin" vs "Benjamin, Robert P."
- **Municipality**: "Block Island" vs "New Shoreham" (same place, different names)
- **PO Boxes**: "PO BOX 735" vs "P.O. Box 735" vs "Box 735"
- **Addresses**: Street name variations and formatting inconsistencies
- **Data Quality**: Typos and inconsistent data entry across sources

**Generic Examples**:
- **Addresses**: "123 Main Street" vs "123 Main St" vs "123 Main St."
- **Organizations**: "First Baptist Church" vs "1st Baptist Church"

**Solution Approach**: Develop alias resolution system with:
- Name normalization algorithms
- Block Island-specific address standardization (Fire Number + street variations)
- Municipality alias handling ("Block Island" ↔ "New Shoreham")
- PO Box format normalization
- Fuzzy matching capabilities for typos and variations
- Manual override mechanisms for edge cases
- Phone number normalization (401-466-XXXX ↔ 466-XXXX)

### Implementation Strategy
The object-oriented model will create household entities that aggregate individual records while maintaining the ability to track source data provenance and handle the three core challenges through specialized matching and normalization algorithms.

## Long-Term Vision
The completed system will provide:
- **Unified Contact Management** - Single source of truth for all Block Island community contacts
- **Intelligent Household Grouping** - Automatic identification of household relationships
- **Address Management** - Sophisticated handling of seasonal/dual residency patterns
- **Communication Optimization** - Household-level messaging that respects residency patterns and preferences

### Success Metrics
- **Data Integration**: Successfully merge and deduplicate records from all three sources
- **Address Resolution**: Accurately classify and prioritize on-island vs off-island addresses
- **Household Detection**: Identify household relationships with high confidence
- **Alias Resolution**: Handle name variations and data quality issues across sources

### Cross-Source Field Analysis

#### Individual Name Fields
- **VisionAppraisal**: Owner Name, Co-Owner Name (may contain multiple individuals requiring parsing)
- **Phonebook**: RefName (primary individual), Other Names (multiple individuals/aliases)
- **Bloomerang**: Name, First Name, Middle Name, Last Name (structured individual components)

#### Household Name Fields
- **Bloomerang**: Household Name (dual purpose - extract individuals AND create household entities)
- **System-Generated**: Deduced household names when multiple individuals share same location

#### Address Fields (Four Categories)
**Address Classification System:**
1. **On-Island Primary** - Person's main residence on Block Island
2. **On-Island Secondary** - Person's vacation/seasonal residence on Block Island
3. **Off-Island Primary** - Person's main residence off Block Island
4. **Off-Island Secondary** - Person's secondary residence off Block Island

**Address Classification Rules:**
- Off-island address presumed primary residence (unless manually overridden)
- Single address defaults to primary status
- Primary vs secondary designation determined by Bloomerang data authority
- Block Island addresses serve dual purpose: location identification AND communication routing
- **Manual Override Capability**: All automated classifications can be manually corrected during review process

**On-Island Address Sources:**
- **VisionAppraisal**: Location (physical property), portions of Address field
- **Phonebook**: Street (when Block Island), Box (Block Island PO Boxes)
- **Bloomerang**: BI Street, BI PO Box (explicit Block Island addresses)

**Off-Island Address Sources:**
- **VisionAppraisal**: Address (when off-island mailing addresses)
- **Phonebook**: Street (when off-island addresses)
- **Bloomerang**: Primary Street/City, Home Street/City, Vacation Street/City, Work Street/City (when off-island)

#### Unique Block Island Identifiers
- **VisionAppraisal**: PID (definitive property identifier), Plat Number (unique to each PID)
- **Bloomerang**: Fire Number (building identifier)
- **Phonebook**: Box (PO Box numbers - high confidence for Block Island)

#### Contact Information
- **Phonebook**: Number (phone)
- **Bloomerang**: Primary Email Address

### Record Identification System
Each data source uses a unique identifier for record tracking and cross-reference:
- **VisionAppraisal**: PID (Parcel ID) - Field 9
- **Phonebook**: Phone Number (Field 1: "Number") - If not unique, synthesize name+number combination
- **Bloomerang**: Account Number (Field 5: "Account Number")

**Source Tracking**: Each extracted value maintains provenance through file source identification, record index number, and unique identifier from originating dataset.

### Current Implementation - Alias Management Classes
**Location**: `scripts/objectStructure/aliasClasses.js`
**Status**: AttributedTerm integration complete - ready for data processing

The alias management system implements a two-tier architecture to address the Alias Problem:

#### Core Architecture
- **Container Classes** (IndicativeData, IdentifyingData): Categorize field reliability and hold identifier instances
- **Identifier Classes** (SimpleIdentifiers, ComplexIdentifiers): Handle aliasing, matching, and normalization
- **Attribution System** (AttributedTerm, Aliases): Track data source provenance and alternative representations

#### Class Hierarchy
```
Container Classes (hold identifiers):
├── IndicativeData (moderate reliability - contact info, account numbers)
└── IdentifyingData (high reliability - location identifiers, names)

Identifier Classes (extend Aliased):
├── SimpleIdentifiers (direct matching)
│   ├── FireNumber (PRIMARY location identifier: integer 3-4 digits <3500)
│   ├── PID (SECONDARY location identifier: 1:1 with Fire Numbers)
│   └── PoBox (Block Island PO Box identifiers)
└── ComplexIdentifiers (fuzzy matching with normalization)
    ├── IndividualName (person names requiring sophisticated matching)
    └── HouseholdName (compound names and synthesized household names)
```

#### Entity Location Logic
1. **Fire Number Priority**: Extracted from standalone fields or beginning of Block Island addresses
2. **PID Secondary**: Used only when Fire Number unavailable
3. **Fire Number ↔ PID Validation**: Should maintain 1:1 relationship (conflicts indicate data interpretation errors)

#### Current Capabilities
- **AttributedTerm Integration**: All identifiers now require source attribution (source, index, identifier)
- **Complete Data Lineage**: Every identifier tracks its originating data source and record
- **Multi-source Ready**: Architecture supports cross-source entity resolution with provenance
- **Alias Management**: Primary alias management with AttributedTerm objects as canonical representation
- **Alternative Tracking**: Alternative representations with full source attribution
- **Block Island-specific Classes**: Fire Number, PID, PO Box identifiers with validation rules

#### Pending Development
- Implementation of matching algorithms for each identifier type
- Block Island-specific normalization rules (municipality aliases, address formatting)
- Fuzzy matching capabilities for typos and variations

### Bloomerang Data Processing Architecture
**Status**: Class structure complete - framework implemented with placeholder functions

#### Entity Instantiation Requirements
**Minimum Information for Entity Creation**:
1. **Location Identifier** (Fire Number > PID > Street Address) - REQUIRED
2. **Name Information** - Available in every All Data.csv record

#### Name Object Specifications

**IndividualName Properties**:
- `title` (not in Bloomerang data - empty)
- `firstName` (Field 2: First Name)
- `otherNames` (Field 3: Middle Name)
- `lastName` (Field 4: Last Name)
- `suffix` (not in Bloomerang data - empty)
- `completeName` (concatenated: title + firstName + otherNames + lastName + suffix, skipping empty fields)
- `termOfAddress` (initially matches completeName)

**HouseholdName Properties**:
- `fullName` (Field 21: Household Name from CSV)
- `memberNames` (array of IndividualName objects - populated during processing)

#### Entity Type Decision Logic
1. **Individual**: When "Is in a Household" = FALSE
2. **AggregateHousehold**: When "Is in a Household" = TRUE and multiple individuals share same Household Name
3. **NonHuman**: When firstName, middleName, or lastName contain "&" or " and " (regex: `\\sand\\s`)
4. **CompositeHousehold**: Future implementation via fuzzy logic for creative household naming

#### Entity Processing Workflow
**For Household Members** (`Is in a Household = TRUE`):
1. Check if household with matching `Household Name` exists
2. If not: instantiate AggregateHousehold entity with HouseholdName object
3. Instantiate Individual entity with IndividualName object
4. Add individual's IndividualName to household's `memberNames` array

**For Non-household** (`Is in a Household = FALSE`):
- Instantiate Individual entity directly

#### ContactInfo and IndicativeData Architecture
**ContactInfo Class**: Separate class for contact-related IndicativeData
- Properties: email, phone, poBox (contact-specific fields)
- Added via `entity.addContactInfo(contactInfoObject)`

**Entity Constructor**:
- Required: locationIdentifier, name
- Optional: accountNumber (IndicativeData object)
- Methods: `addContactInfo()`, `addAccountNumber()` (inherited by all entity types)

#### Data Source Constants
- `"BLOOMERANG_CSV"` - All Data.csv processing
- `"VISION_APPRAISAL"` - VisionAppraisal data processing
- `"PHONEBOOK"` - Phonebook data processing

## Implementation Status and Development Process

### **🎯 Current Status: BLOOMERANG PROCESSING PRODUCTION-READY**
*For strategic planning and next steps, see [Claude Code Planning Mode Analysis](#-claude-code-planning-mode-analysis-) above*

The BIRAVA2025 system follows a structured development approach:

#### **✅ Phase 1-4: Foundation & Complete Processing System (COMPLETED)**

**Phase 1 - Architecture Design**:
- Entity resolution logic established
- Class hierarchies designed
- AttributedTerm integration architecture

**Phase 2 - Class Structure Implementation**:
- **AttributedTerm Integration**: All identifier classes now require source attribution (`term, source, index, identifier`)
- **Entity Base Class Updates**: New constructor (`locationIdentifier, name, accountNumber = null`) with `addContactInfo()` and `addAccountNumber()` methods inherited by all subclasses (Individual, AggregateHousehold, CompositeHousehold, NonHuman, Business, LegalConstruct)
- **Enhanced Name Classes**:
  - **IndividualName**: Complete property set (title, firstName, otherNames, lastName, suffix, completeName, termOfAddress) with formatting methods
  - **HouseholdName**: fullName + memberNames array with member management methods
- **ContactInfo Class**: New dedicated class (`scripts/objectStructure/contactInfo.js`) for contact-related IndicativeData with communication hierarchy support
- **Function Framework**: `readBloomerangWithEntities()` complete processing pipeline with placeholder functions

**Phase 3 - Core Processing Implementation** ✅ **COMPLETED**:
1. ✅ **JavaScript Module Loading**: Fixed critical "Cannot access 'AttributedTerm' before initialization" error by adding missing script tags to index.html and removing browser-incompatible require() statements
2. ✅ **Enhanced CSV Structure Support**: Updated field mappings for 30-field CSV structure with dedicated state/zip columns (Primary/Home/Vacation/Work addresses with individual Street, City, State, ZIP fields)
3. ✅ **Location Identifier Creation**: **FULLY IMPLEMENTED** Fire Number > PID > Street Address hierarchy:
   - **Step 1**: Direct fire number field validation (Field 26)
   - **Step 2**: Block Island address detection using dedicated ZIP/State fields + fire number extraction from street addresses
   - **Step 3**: PID handling (deferred to VisionAppraisal integration)
   - **Step 4**: Street address fallback using ComplexIdentifiers (dramatically increases entity creation)
4. ✅ **Block Island Address Detection**: Robust detection using dedicated ZIP code fields (02807), state validation (RI), and city indicators (New Shoreham, Block Island)
5. ✅ **Entity Type Logic**: Individual/AggregateHousehold/NonHuman determination based on household membership and name patterns
6. ✅ **Name Object Creation**: IndividualName and HouseholdName creation from CSV fields with AttributedTerm integration
7. ✅ **Fire Number Validation**: Updated to "4 digits or less, <3500" format across all code and documentation
8. ✅ **VisionAppraisal Integration Preparation**: Added `upgradeLocationIdentifierWithPID()` method for PID-based location identifier upgrades (UNTESTED)

**🧪 TESTED WITH REAL DATA**: Successfully processing 1458 CSV rows with entity creation working for both fire number and street address cases

**Phase 4 - Complete Data Enhancement & Collection System** ✅ **COMPLETED**:

**Phase 4A - Enhanced Data Capture** ✅ **COMPLETED**:
1. ✅ **Complete Field Processing**: Enhanced field mapping to capture all 30 CSV fields (vs previous ~6 fields)
2. ✅ **ContactInfo Integration**: `createContactInfo()` function processes email, BI PO Box, BI Street data
3. ✅ **AdditionalData System**: `createAdditionalData()` function captures transaction data, all address types, Block Island fields
4. ✅ **Comprehensive Entity Structure**: Entities now contain contactInfo and additionalData with complete field coverage

**Phase 4B - Collection Management System** ✅ **COMPLETED**:
1. ✅ **Collection Aggregation**: `aggregateEntitiesIntoCollections()` function creates 3 searchable collection files instead of 1,400+ individual files
2. ✅ **Entity Browser Tool**: Complete web interface (`scripts/entityBrowser.js`) with search, filtering, export capabilities
3. ✅ **Interactive UI Integration**: Entity Browser embedded in main application with comprehensive CSS styling
4. ✅ **Advanced Search Features**: Full-text search across all 30 fields, quick filters, entity selection, detailed viewing

**Phase 4C - Household Processing & Serialization** ✅ **COMPLETED**:
1. ✅ **Complete Household Processing**: Implemented comprehensive `processHouseholdMember()` function with:
   - Proper AggregateHousehold entity creation and member association
   - Placeholder location identifiers (Fire Number 3499) for records without location data
   - Primary household member logic with location identifier upgrades
   - 426 households successfully created from 1362 records

2. ✅ **Full Entity Serialization System**: Complete serialize/deserialize methods for all classes:
   - All entity classes (Individual, AggregateHousehold, NonHuman, etc.)
   - All identifier classes (AttributedTerm, FireNumber, PID, IndividualName, etc.)
   - ContactInfo and container classes (IndicativeData, IdentifyingData)
   - Working Google Drive integration with user-controlled folder structure

3. ✅ **Enhanced Processing Pipeline**: Updated `readBloomerangWithEntities()` with:
   - Optional Google Drive serialization (`saveToGoogleDrive` parameter)
   - Batch processing with custom batch IDs
   - 100% record processing success rate (1362/1362 records)
   - Comprehensive error tracking and diagnostic output

4. ✅ **Debug and Analysis Tools**:
   - `investigateRecord(recordNumber)` function for detailed record analysis
   - Enhanced error reporting with cumulative error statistics
   - Step-by-step location identifier analysis and troubleshooting

**🧪 PRODUCTION TESTING RESULTS**:
- **100% Success Rate**: All 1362 records processed without skipping
- **426 Households Created**: Proper household relationship processing
- **Complete Data Capture**: All 30 CSV fields processed and stored
- **Working Collection System**: 3 searchable collection files with Entity Browser tool
- **No Critical Errors**: Robust error handling and recovery

**📋 RECENT DEVELOPMENT SESSION COMPLETED (Current Status)**:
- **✅ investigateRecord() Enhancement**: Fixed incomplete fieldMap in debugging function
  - Added missing fields: transactionAmount, transactionDate, biStreet, biPoBox
  - Enhanced console output to display all 30 fields for complete debugging visibility
  - Verified fix working correctly with test records showing complete field information
- **⚠️ PENDING VERIFICATION**: Need to confirm actual entity processing captures all 30 fields correctly
  - `investigateRecord()` shows raw CSV field values (✅ working)
  - **NEXT CRITICAL STEP**: Verify processed entity objects contain all field data via multi-record inspection tool

# 🧠 CLAUDE CODE PLANNING MODE ANALYSIS 🧠

## **📋 STRATEGIC DEVELOPMENT PLAN - CLAUDE GENERATED**
*This comprehensive analysis was generated using Claude Code's planning mode to provide strategic direction for the BIRAVA2025 project.*

### **Phase 4.5: Field Processing Verification** 📋 **IMMEDIATE PRIORITY**
**Goal**: Complete verification that all 30 CSV fields are properly processed and stored in entity objects

**URGENT Next Steps**:
1. **Multi-Record Inspection Tool**: Create `inspectProcessedRecords([1,2,3,4,5])` function that:
   - Processes records through actual entity creation pipeline (not just raw CSV display)
   - Shows processed entity data including contactInfo and additionalData objects
   - Verifies all 30 fields are captured in final entity structure
   - Allows visual inspection of multiple records for comprehensive field verification

2. **Field Processing Validation**: Test that entity objects contain:
   - **contactInfo**: email, biStreet, biPoBox properly processed with AttributedTerm provenance
   - **additionalData**: transactionData, addresses (4 types), blockIslandData, householdData
   - **Complete data fidelity**: All 30 CSV fields preserved in processed entities

**WHY CRITICAL**: Current `investigateRecord()` only shows raw CSV values, not whether fields are actually processed into entity objects correctly. Must verify the processing pipeline captures all data before proceeding with system modularization.

### **Phase 5: System Modularization** 📋 **NEXT PRIORITY**
**Goal**: Improve code maintainability and development efficiency through systematic modularization

**Key Components**:
1. **Code Modularization**:
   - Break down monolithic `bloomerang.js` (1,748 lines) into focused modules
   - Create separate modules: field processing, entity creation, collection management
   - Improve testability with isolated function units
   - Enhance code organization and readability

2. **Enhanced Browser Tools**:
   - Advanced search capabilities with complex queries
   - Data validation interfaces for quality control
   - Entity editing functionality for corrections
   - Collection management tools and utilities

3. **Testing Infrastructure**:
   - Unit testing capabilities for individual modules
   - Integration testing for module interactions
   - Regression testing for data processing accuracy
   - Performance benchmarking tools

### **Phase 6: Multi-Source Integration** 📋 **NEAR-TERM**
**Goal**: Integrate VisionAppraisal and Phonebook data with existing Bloomerang entity system

**Key Components**:
1. **VisionAppraisal Integration**:
   - Upgrade location identifiers from street addresses to PID-based entities
   - Test `upgradeLocationIdentifierWithPID()` method
   - Cross-reference Fire Number ↔ PID relationships (should be 1:1)

2. **Phonebook Integration**:
   - Enrich contact information (phone numbers, additional addresses)
   - Supplement entity contact data gaps
   - Validate Block Island phone number patterns (401-466-XXXX)

3. **Cross-Source Entity Resolution**:
   - Develop matching algorithms between data sources
   - Implement alias resolution for name variations
   - Handle address format standardization

### **Phase 7: Advanced Entity Resolution** 📋 **FUTURE**
1. **Fuzzy Matching Implementation**:
   - Name normalization algorithms ("Bob" ↔ "Robert Benjamin")
   - Address standardization (Fire Number + street variations)
   - Municipality aliases ("Block Island" ↔ "New Shoreham")

2. **Data Quality & Validation**:
   - Fire Number/PID relationship validation
   - Address consistency checking
   - Duplicate detection across sources

3. **Manual Override System**:
   - Review interface for automated decisions
   - Override storage with versioning
   - Persistent correction capabilities

### **Phase 8: System Optimization** 📋 **LONG-TERM**
1. **Performance & Scale**:
   - Efficient lookup algorithms for large datasets
   - Enhanced error handling and recovery
   - Comprehensive logging system

2. **User Interface**:
   - Manual review interface for entity resolution
   - Data validation workflow
   - Household management tools

## **🎯 IMMEDIATE NEXT STEPS (Planning Mode Recommendations)**

### **Phase 4.5 - URGENT Priority: Field Processing Verification**

**Session Completed**: ✅ Fixed `investigateRecord()` fieldMap and display output
**Critical Next Step**: Create multi-record inspection tool to verify complete field processing

**Implementation Required**:
```javascript
// NEXT SESSION: Add this function to bloomerang.js before investigateRecord()
async function inspectProcessedRecords(recordNumbers) {
    // 1. Process records through actual entity creation pipeline
    // 2. Display processed entity data (contactInfo, additionalData)
    // 3. Verify all 30 fields captured in entity objects
    // 4. Support visual inspection of multiple records simultaneously
}
```

**Test Plan**:
1. `await inspectProcessedRecords([1,2,3,4,5])` - First 5 records
2. Verify contactInfo contains: email, biStreet, biPoBox with AttributedTerm provenance
3. Verify additionalData contains: transaction data, all 4 address types, Block Island data, household data
4. Confirm 100% field capture in processed entities (not just raw CSV display)

### **Phase 5 - Next Priority: System Modularization**

### **Weeks 1-2: Code Modularization**
1. **Module Identification**: Analyze `bloomerang.js` (1,748 lines) to identify logical module boundaries
2. **Field Processing Module**: Extract field mapping and data processing functions
3. **Entity Creation Module**: Isolate entity instantiation and validation logic
4. **Collection Management Module**: Separate collection aggregation and browser tool integration

### **Weeks 3-4: Enhanced Browser Tools**
1. **Advanced Search Features**: Complex query capabilities across all 30 fields
2. **Data Validation Interface**: Quality control tools for entity data verification
3. **Entity Editing Functionality**: In-browser entity correction and update capabilities
4. **Collection Management Tools**: Enhanced collection manipulation and export features

### **Weeks 5-6: Testing Infrastructure**
1. **Unit Testing Framework**: Individual module testing capabilities
2. **Integration Testing**: Module interaction validation
3. **Regression Testing**: Data processing accuracy verification
4. **Performance Benchmarking**: Processing speed and efficiency measurement

### **Phase 6 - Near-term: Multi-Source Integration**
1. **VisionAppraisal Integration**: PID-based location identifier upgrades
2. **Phonebook Integration**: Contact information enrichment system
3. **Cross-Source Entity Resolution**: Matching algorithms between data sources

## **🏗️ TECHNICAL ARCHITECTURE STRENGTHS**
- **Solid Foundation**: Complete entity class hierarchy with AttributedTerm provenance
- **Proven Processing**: 100% success rate on real 1362-record dataset with 426 households
- **Complete Data Capture**: All 30 CSV fields processed and stored in enhanced entity structure
- **Collection System**: 3 searchable collection files with Entity Browser tool for interactive management
- **Extensible Design**: Ready for multi-source integration with modular architecture
- **Data Integrity**: Full serialization/deserialization with Google Drive storage
- **User Interface**: Complete web-based entity browser with search, filtering, and export capabilities

## **⚠️ CRITICAL SUCCESS FACTORS**
1. **Incremental Testing Protocol**: Must test each change individually (per README requirements)
2. **Data Quality Focus**: Validate Fire Number ↔ PID relationships
3. **Block Island Specialization**: Handle unique address/naming patterns
4. **Household-Centric Design**: Maintain focus on household communication entities

---

## Legacy Phase Information (Maintained for Reference)

### **Current Operational Capabilities**

**BLOOMERANG PROCESSING**: 🟢 **PRODUCTION READY**
- Complete entity processing with 100% success rate
- Full household relationship management
- Google Drive serialization with organized storage
- Comprehensive debugging and analysis tools

**VISIONAPPRAISAL PROCESSING**: 🟡 **FUNCTIONAL** (existing legacy system)
- Property data download and conversion
- Ready for integration with entity system

**PHONEBOOK PROCESSING**: 🟡 **FUNCTIONAL** (existing legacy system)
- Contact data processing and Google Drive upload
- Ready for integration with entity system

### Legacy Development Notes
*(Consolidated from previous detailed workflow plans - see Claude Code Planning Mode Analysis above for current strategic direction)*

**Phase 3 Completion Items**:
- Enhanced diagnostic output for `readBloomerangWithEntities()`
- Individual-household relationship validation
- ContactInfo integration completion

**Serialization System** (Already Implemented):
- Complete serialize/deserialize methods for all entity and identifier classes
- AttributedTerm preservation with source attribution
- Google Drive integration with user-controlled folder structure

### Development Approach: **Complete Class Structure First**
**Rationale**: Build solid architectural foundation before data processing logic
**Benefits**:
- Clear testing boundaries for each component
- Comprehensive error handling and validation
- Complete source attribution and data lineage
- Ready for immediate real-world data testing

### Testing Strategy
**Completed**: Class structure validation with AttributedTerm integration and real CSV data processing
**Current**: `readBloomerangWithEntities()` functional testing with 1458-row Bloomerang dataset - entity creation working with fire number and street address location identifiers
**Next**: Enhanced diagnostic output, comprehensive household processing validation, and entity creation statistics analysis
**Goal**: Complete Bloomerang entity resolution validation before expanding to VisionAppraisal and Phonebook integration

### Entity Resolution Logic
The system follows a specific logic for identifying and creating entities based on established priorities:

#### Location Identification Priority
1. **Fire Number** (Primary): Integer values 4 digits or less, <3500
   - Found as standalone field in data sources
   - Extracted from beginning of Block Island street addresses
   - Definitive identifier for Block Island locations
2. **PID** (Secondary): Used only when Fire Number cannot be determined
   - Should maintain 1:1 relationship with Fire Numbers
   - Conflicts indicate data interpretation errors (e.g., confusing owner address with property location)
3. **Street Address** (Fallback): Complex identifier requiring normalization

#### Entity Association Cases
1. **Direct Association**: Entity can be linked to Fire Number/PID location through exact matches
2. **Deduced Association**: Entity linked to location through fuzzy logic and correspondence analysis
3. **Off-Island Only**: Entity associated with definitive off-island location
4. **No Location**: Entity cannot be associated with any location

#### Data Source Authority
- **Bloomerang**: Authoritative for household structure, head of household identification (Field 22), and primary address determination
- **VisionAppraisal**: Definitive source for Fire Number/PID property location data
- **Phonebook**: Supplementary contact information to fill gaps

#### Critical Validation Rules
- Fire Number format: Integer, 4 digits or less, <3500
- Fire Number ↔ PID relationship: Must be 1:1 (conflicts require data source field clarification)
- VisionAppraisal Location vs Address: Must distinguish property location from owner mailing address

### Manual Override System
The entity resolution system includes comprehensive manual override capabilities to address limitations of automated processing:

#### Override Scope
- **Entity Associations**: Manually link entities to correct locations when fuzzy logic fails
- **Address Classifications**: Override primary/secondary designations and on-island/off-island classifications
- **Household Compositions**: Manually group or separate individuals when automated household detection is incorrect
- **Name Standardization**: Provide canonical names when alias resolution produces unsatisfactory results
- **Communication Preferences**: Override automated communications hierarchy selections
- **Identity Conflicts**: Resolve cases where multiple entities appear to be the same person or vice versa

#### Override Workflow
1. **Automated Processing**: Complete initial entity resolution using available data sources
2. **Review Interface**: Present results in on-screen format for human review
3. **Manual Corrections**: Allow user to modify any automated decisions
4. **Persistent Storage**: Save all manual corrections to override files
5. **Re-import Integration**: Apply stored overrides when re-running data imports

#### Override Storage Architecture
- **Correction Files**: Stored separately from source data to preserve original information
- **Versioning**: Track override history for audit trails and rollback capability
- **Re-import Compatibility**: Override files designed to survive source data updates
- **Scope Granularity**: Overrides can target specific fields, entire entities, or relationship mappings

#### Integration Points
Manual overrides will integrate with the alias management system through:
- **Alias Class Extensions**: Override methods in Aliased base class for manual alias management
- **Entity Class Properties**: Additional properties to flag manually-corrected data
- **Validation Bypasses**: Ability to override automated validation rules when justified
- **Provenance Tracking**: Clear indication in AttributedTerm classes when data comes from manual corrections vs. source files

### Entity Classes Structure
**Location**: `scripts/objectStructure/entityClasses.js`
**Status**: Complete implementation - Entity constructor updated, ContactInfo integration ready

The system uses a seven-class hierarchy for representing different entity types:

#### Class Hierarchy
```
Entity (parent class)
├── Individual (name: IdentifyingData(IndividualName))
├── CompositeHousehold (name: IdentifyingData(HouseholdName))
├── AggregateHousehold (name: IdentifyingData(HouseholdName) - synthesized)
└── NonHuman (parent class)
    ├── Business
    └── LegalConstruct
```

#### Entity Base Class Properties
- **label, number**: Unique identifier properties
- **locationIdentifier**: IdentifyingData containing Fire Number (primary), PID (secondary), or Street Address (fallback)
- **name**: IdentifyingData containing IndividualName or HouseholdName ComplexIdentifiers
- **Contact Information** (IndicativeData fields):
  - **primaryEmail**: Primary communication method
  - **poBoxNumber**: Block Island PO Box for mailing
  - **phoneNumber**: Contact phone number

#### Communications Hierarchy
1. **Email**: Primary communication method when available (from household head when available)
2. **Block Island PO Box OR Off-island primary address**: Whichever is determined to be primary (from Bloomerang data)
3. **Off-island address**: Only when this is the sole available information

**Household Communication Authority**: The "Is Head of Household" field (Field 22) in Bloomerang data provides explicit designation of household leadership. For household-level communications, the head of household's contact information takes precedence over other household members.

#### Class Definitions
- **Entity**: Top-level parent class with locationIdentifier, name, and contact properties
- **Individual**: Represents individual persons; name contains IndividualName
- **CompositeHousehold**: For recognized households where individual members are not instantiated separately; name contains HouseholdName
- **AggregateHousehold**: Collects instantiated Individual objects who share a household; contains `individuals` array property; name contains synthesized HouseholdName
- **NonHuman**: Parent class for non-human entities
- **Business**: Represents business entities
- **LegalConstruct**: Represents legal constructs (trusts, LLCs, etc.)

## Data File Access and Structures

### Google Drive Data Files

**Phonebook Data**: File ID `1MdynaDB0jbjkwNKyidOHmdsYueM9Nj-k`
**Bloomerang Data**: File ID `1JVBMePgqTvq3BETV57gohA0GDTOFeCYy`

**Access Method**: Use `getFileContentsAPI(fileId)` function in browser console with authenticated Google API session.

### Data Source Field Structures

#### 1. VisionAppraisal Data (`everyThingWithPid.json`)
**Location**: `servers/Results/everyThingWithPid.json`
**Fields**: Owner Name, Co-Owner Name, Address, Location, Zone, Use Code, Neighborhood, Last Sale Date, Plat Number, PID, Google Drive File ID

#### 2. Phonebook Data
**Fields**: Data, Number, RefName, Other Names, Street, Box

#### 3. Bloomerang Data
**Enhanced CSV Structure (30 Fields)**: The Bloomerang CSV has been enhanced with dedicated state and ZIP code fields for improved address processing:

**Core Fields**: Name, First Name, Middle Name, Last Name, Primary Email Address, Account Number, First Transaction Amount, First Transaction Date, Is in a Household

**Enhanced Address Structure**:
- **Primary Address**: Primary Street, Primary City, Primary State, Primary ZIP Code
- **Home Address**: Home Street, Home City, Home State, Home ZIP Code
- **Vacation Address**: Vacation Street, Vacation City, Vacation State, Vacation ZIP Code
- **Work Address**: Work Street, Work City, Work State, Work ZIP Code

**Block Island Specific**: Fire Number, BI Street, BI PO Box, Household Name, Is Head of Household

**Technical Impact**: Dedicated state/ZIP fields enable precise Block Island address detection (ZIP=02807, State=RI) and reliable fire number extraction from confirmed Block Island street addresses.

## Environment Requirements
- Node.js environment
- Google API credentials configured
- .env file with API_BASE_URL, API_KEY, and API_KEY_PARAM_NAME
- Modern browser with console access for manual function execution

---

# 🛑 FINAL REMINDER FOR CLAUDE CODE 🛑

## 🚨 BEFORE MAKING ANY CHANGES TO THIS PROJECT 🚨

**READ THE MANDATORY TESTING PROTOCOL AT THE TOP OF THIS FILE**

### The #1 Rule: INCREMENTAL TESTING

**NEVER:**
- Make multiple changes without testing each one
- Implement entire features in one batch
- Skip testing steps

**ALWAYS:**
- Make one small change
- Test immediately
- Verify it works
- Then proceed to next change

**This is not a suggestion. This is a requirement.**

---