# Bloomerang Entity Generation Process Reference

**Created**: 2025-11-19
**Last Updated**: 2025-11-19
**Version**: 1.0
**Purpose**: Complete documentation of Bloomerang entity creation process and name structure modifications
**Scope**: Production entity generation, dual-field infrastructure, and integration compatibility

## **OVERVIEW**

This document provides comprehensive details about the Bloomerang entity generation process discovered and modified during the tempName migration work. It covers the complete flow from CSV processing to entity creation, including the critical name structure changes made for VisionAppraisal integration compatibility.

---

# **PRODUCTION ENTITY GENERATION FLOW**

## **Button-Triggered Process**

**HTML Button**: `<button class="optBut" onclick="readBloomerangWithEntities(true)">Process Bloomerang CSV</button>`
**Function Called**: `readBloomerangWithEntities(true)` in `scripts/bloomerang.js`
**Parameters**:
- `saveToGoogleDrive = true` (saves to Google Drive collections)
- `batchId = undefined` (auto-generated timestamp)

## **Complete Process Flow**

### **Step 1: CSV Data Acquisition**
- **Source**: `servers/Results/All Data.csv` (30-field enhanced structure)
- **Method**: HTTP fetch from `http://127.0.0.99:3000/csv-file`
- **Processing**: Handles `:^#C#^` comma encoding and field parsing

### **Step 2: Row Processing Pipeline**
**Main Loop**: `for (const row of rows)` - processes each CSV row
**Function**: `processRowToEntity(row, dataSource, households)`

#### **2A: Location Identifier Creation**
- **Function**: `createLocationIdentifier(fields, fieldMap, rowIndex, accountNumber, dataSource)`
- **Hierarchy**: Fire Number > PID > Street Address
- **Fire Number Field**: Index 25 (Field 26: Fire Number)
- **Result**: LocationIdentifier object or null (uses placeholder if needed)

#### **2B: Entity Type Determination**
- **Function**: `determineEntityType(fields, fieldMap)`
- **Logic**:
  - If `isInHousehold` (field 8) = "Yes" → `AggregateHousehold`
  - If contains business terms → `NonHuman`
  - Default → `Individual`

#### **2C: CRITICAL - Name Object Creation**
**Original Structure** (Bloomerang-style):
```javascript
const nameObjects = await createNameObjects(fields, fieldMap, rowIndex, accountNumber, dataSource, entityType);
// Returns: { individualName: IdentifyingData(IndividualName), householdName: IdentifyingData(HouseholdName) }
```

**Modified Structure** (VisionAppraisal compatibility):
```javascript
const tempNameObjects = await createTempNameObjects(fields, fieldMap, rowIndex, accountNumber, dataSource, entityType);
// Returns: { individualName: IndividualName (direct object) }
```

**Key Change Made**: `createNameObjects()` now returns `individualNameTemp: individualName` (direct IndividualName object)

#### **2D: Entity Constructor Calls**

**Before Change**:
```javascript
entity = new Individual(finalLocationIdentifier, nameObjects.individualName, null, null, accountNumber);
// nameObjects.individualName = IdentifyingData wrapper
```

**After Change**:
```javascript
entity = new Individual(finalLocationIdentifier, nameObjects.individualNameTemp, null, null, accountNumber);
// nameObjects.individualNameTemp = direct IndividualName object
```

### **Step 3: Additional Data Processing**
- **ContactInfo**: `createContactInfo(fields, fieldMap, rowIndex, accountNumber, dataSource)`
- **Additional Data**: `createAdditionalData(fields, fieldMap, rowIndex, accountNumber, dataSource)`
- **Dual Name Assignment**: `entity.tempName = tempNameObjects.individualName`

### **Step 4: Collection Aggregation**
- **Function**: `aggregateEntitiesIntoCollections(entities, households, [])`
- **Output**: 3 collections (Individuals, Households, NonHuman)
- **Architecture**: Replaces 1,400+ individual files with 3 collection files

### **Step 5: Google Drive Serialization**
- **Individual Collection**: Uploaded to Google Drive with file ID
- **Household Collection**: Uploaded to Google Drive with file ID
- **NonHuman Collection**: Uploaded to Google Drive with file ID
- **Config File**: `BloomerangEntityBrowserConfig_[timestamp]` contains all file IDs

---

# **CRITICAL NAME STRUCTURE MODIFICATIONS**

## **The Problem We Solved**

**Issue**: Bloomerang entities used complex IdentifyingData wrapper structure incompatible with VisionAppraisal entities
- **Bloomerang**: `entity.name.identifier.completeName`
- **VisionAppraisal**: `entity.name.completeName`

## **The Solution Implemented**

### **1. Modified createNameObjects() Function**

**Location**: `scripts/bloomerang.js:1086-1123`

**Original Return**:
```javascript
return {
    individualName: individualNameIdentifyingData,     // IdentifyingData wrapper
    householdName: householdNameIdentifyingData
};
```

**Modified Return**:
```javascript
return {
    individualName: individualNameIdentifyingData,     // Original (backward compatibility)
    householdName: householdNameIdentifyingData,
    individualNameTemp: individualName                 // NEW: Direct IndividualName object
};
```

### **2. Updated Entity Constructor Usage**

**Changed Line**: `scripts/bloomerang.js:778`

**Before**: `new Individual(finalLocationIdentifier, nameObjects.individualName, ...)`
**After**: `new Individual(finalLocationIdentifier, nameObjects.individualNameTemp, ...)`

### **3. Dual-Field Infrastructure**

**Result**: All Bloomerang entities now have BOTH name structures:
- `entity.name` - Original complex IdentifyingData wrapper (backward compatibility)
- `entity.tempName` - VisionAppraisal-style direct IndividualName object (integration compatibility)

---

# **INTEGRATION IMPACT**

## **What This Enables**

1. **Cross-Dataset Compatibility**: Integration scripts can now work with both Bloomerang and VisionAppraisal entities
2. **Name Extraction Consistency**: `extractNameWorking()` functions can be unified across datasets
3. **Migration Path**: Gradual transition from complex to simple name structures

## **Scripts Affected**

**Scripts Using Bloomerang `.name` Field** (need migration):
- `entityBrowser.js` - Entity display and browsing
- `integration/contactDiscovery.js` - Business workflow orchestration
- `integration/matchingEngine.js` - Multi-stage matching pipeline
- `workingEntityLoader.js` - Name extraction utilities

## **Load All Entities Integration**

**Process**: "Load All Entities Into Memory" button now supports configurable config file IDs
- **Input Box**: Added to Entity Reconstruction section for config file ID
- **Parameter Flow**: `loadAllEntitiesIntoMemory()` → `loadBloomerangCollectionsWorking(configFileId)`
- **Backward Compatible**: Falls back to folder search if no file ID provided

---

# **TECHNICAL DETAILS**

## **Entity Creation Statistics**
- **Success Rate**: 100% (1,362/1,362 records)
- **Households Created**: 426 households with proper relationships
- **Data Capture**: All 30 CSV fields processed and stored
- **Entity Distribution**: Individual, AggregateHousehold, NonHuman types

## **Name Object Structure**

**IndividualName Object Properties**:
```javascript
{
    term: AttributedTerm,        // Complete name with source attribution
    title: string,               // Title (empty for Bloomerang)
    firstName: string,           // First name from CSV
    otherNames: string,          // Middle name from CSV
    lastName: string,            // Last name from CSV
    suffix: string,              // Suffix (empty for Bloomerang)
    completeName: string         // Computed full name
}
```

**IdentifyingData Wrapper Structure**:
```javascript
{
    identifier: IndividualName,  // Contains the IndividualName object
    // ... additional IdentifyingData properties
}
```

## **File Locations**

**Primary Function**: `readBloomerangWithEntities()` - `scripts/bloomerang.js:163-362`
**Name Creation**: `createNameObjects()` - `scripts/bloomerang.js:1086-1123`
**Entity Processing**: `processRowToEntity()` - `scripts/bloomerang.js:719-808`
**Integration Point**: Individual constructor call - `scripts/bloomerang.js:778`

---

# **NEXT STEPS & IMPLICATIONS**

## **Required Script Migrations**

1. **Priority 1**: `workingEntityLoader.js` - Foundation name extraction utility
2. **Priority 2**: `entityBrowser.js` - User-facing entity display interface
3. **Priority 3**: `integration/matchingEngine.js` - Core integration functionality
4. **Priority 4**: `integration/contactDiscovery.js` - Business workflow (experimental)

## **Migration Approach**

**Testing Protocol**:
1. Test existing script with original `name` structure
2. Modify to use `tempName` structure
3. Compare outputs for identical functionality
4. Implement fixes for any breakage

**Success Criteria**: Scripts work identically with both name structures, enabling gradual transition from Bloomerang-style to VisionAppraisal-style name access patterns.

## **Long-term Architecture**

**Goal**: All entities (Bloomerang and VisionAppraisal) use consistent direct name object structure
**Path**: Gradual migration of all scripts from complex wrappers to direct objects
**Benefit**: Unified integration code that works seamlessly with both data sources