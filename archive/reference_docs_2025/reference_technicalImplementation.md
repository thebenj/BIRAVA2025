# Technical Implementation Reference

**Purpose**: Detailed system architecture, data structures, and technical analysis framework

## Current System Analysis

### VisionAppraisal Data Processing Architecture
**Primary Files**:
1. **configurableVisionAppraisalNameParser.js**: Production parser with 34-case coverage
   - Configuration-driven architecture with case definitions
   - Entity creation methods (Individual, AggregateHousehold, Business, LegalConstruct)
   - Complete parsing logic for name field processing

2. **visionAppraisal.js**: Data source plugin
   - Raw data loading via API endpoints
   - Field parsing and extraction (MBLU, addresses, Fire Numbers)
   - Data structure transformation and cleaning

3. **visionAppraisalParser.js**: Supporting utilities
   - MBLU parsing functions
   - Address cleaning and parsing
   - Name processing utilities

**Current Entity Fields Captured**:
```javascript
// Based on visionAppraisal.js parseRecords method:
{
    sourceIndex, ownerName, ownerName2, ownerAddress, propertyLocation,
    userCode, neighborhood, date, mblu, pid, googleFileId,
    map, block, lot, unit, unitCut,  // Expanded MBLU fields
    street, city, state, zip,        // Expanded address fields
    processedOwnerName,              // Processed name result
    fireNumber, hasFireNumber, source
}
```

### Bloomerang Data Processing Architecture
**Primary Files**:
1. **bloomerang.js**: Complete entity creation system
   - `readBloomerangWithEntities()`: Production-ready function
   - 30-field CSV processing with full data capture
   - Entity object creation with AttributedTerm provenance
   - Collection system and serialization methods

**Current Entity Fields Captured**:
```javascript
// Based on 30-field enhanced structure:
{
    // Core Identity (1-6)
    name, firstName, middleName, lastName, email, accountNumber,
    // Transaction Data (7-8)
    transactionAmount, transactionDate,
    // Address Structure (9-25) - Four complete address sets
    primaryAddress, homeAddress, vacationAddress, workAddress,
    // Block Island Specific (26-30)
    fireNumber, biStreet, biPoBox, householdName, isHeadOfHousehold
}
```

## Critical Analysis Questions

### Data Completeness Assessment
1. **VisionAppraisal**: Are all available CSV fields being captured in entity objects?
2. **Bloomerang**: Are all 30 fields properly preserved through entity creation?
3. **Cross-System**: Which data points are unique to each system?

### Data Correctness Assessment
1. **AttributedTerm Usage**: Are both systems using consistent provenance tracking?
2. **Entity Creation**: Are entity objects created using identical patterns?
3. **Data Transformation**: Are parsing and cleaning methods equivalent?
4. **Loss Points**: Where might data be lost or incorrectly transformed?

### Standard Compliance Assessment
1. **Consistency**: Do both processes follow the same architectural patterns?
2. **Validation**: Are data quality checks equivalent between systems?
3. **Error Handling**: Are edge cases handled consistently?

## Application Infrastructure

### Server Architecture
The application runs **two servers simultaneously**:

1. **HTTP Server (Port 1337)** - Main web application
   - URL: `http://127.0.0.1:1337/`
   - Serves: index.html and static files (scripts/, etc.)
   - **This is the URL users should access in their browser**

2. **Express API Server (Port 3000)** - API endpoints only
   - URL: `http://127.0.0.99:3000/`
   - Serves: API routes including /csv-file endpoint
   - Used internally by the frontend for API calls

### File Structure
```
BIRAVA2025/
   servers/
      server.js           # Main server (both HTTP and Express)
      Results/
          All Data.csv    # Bloomerang CSV input file (enhanced 30-field structure)
   scripts/
      baseCode.js         # VisionAppraisal functions (button-operated)
      bloomerang.js       # Bloomerang CSV processing ✅ PRODUCTION READY
      entityBrowser.js    # Entity Browser Tool (web interface for collections)
      phonebook.js        # Phonebook processing (console-operated)
      utils.js            # Shared utilities (modularized - see below)
      core/               # ✅ Core processing modules
          visionAppraisalProcessing.js  # VisionAppraisal utilities
          googleDriveAPI.js             # Google Drive operations
      address/            # ✅ Address processing modules
          addressProcessing.js          # Address processing & Block Island logic
      testing/            # ✅ Testing infrastructure modules
          addressTesting.js             # Address testing suite
      data/               # ✅ Data loading modules
          sampleDataLoader.js           # Phase 3 data loading functions
      performance/        # ✅ Performance optimization modules
          optimizedProcessing.js        # High-performance parcel processing
      objectStructure/    # Entity resolution class system
          aliasClasses.js      # ✅ AttributedTerm & subclasses (NEW: FireNumberTerm, etc.)
          contactInfo.js       # ContactInfo class with communications hierarchy
          entityClasses.js     # Entity base class and subclasses
      integration/        # Multi-source matching system
          testPlugin.js        # ✅ Fire Number analysis (FIXED: object-oriented matching)
          matchingEngine.js    # Multi-stage matching algorithms
          contactDiscovery.js  # Business workflow orchestration
   index.html              # Main application interface
```

### Current Operational Status

**✅ PRODUCTION READY: Bloomerang Processing**
- **Function**: `readBloomerangWithEntities(saveToGoogleDrive, batchId)`
- **Status**: 100% success rate (1,362/1,362 records)
- **Households**: 426 households created with proper relationships
- **Data Capture**: All 30 CSV fields processed and stored
- **Collections**: 3 searchable collection files with Entity Browser integration

**✅ PRODUCTION READY: Object-Oriented Entity System**
- **AttributedTerm Subclasses**: FireNumberTerm, AccountNumberTerm, EmailTerm
- **toString() Methods**: All classes display properly (no more [object Object])
- **Object Matching**: Replaces problematic toString().match() approaches
- **Fire Number Analysis**: Working with 29% match rate validation

**✅ PRODUCTION READY: VisionAppraisal Integration**
- **Data Loading**: 1,576 records with 70.2% Fire Number coverage
- **Field Processing**: Complete MBLU parsing and address extraction
- **Integration Ready**: Compatible with Bloomerang entity matching