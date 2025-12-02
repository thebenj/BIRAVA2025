# VisionAppraisal Entity Object Structures Reference

**Documentation Date**: November 15, 2025
**Context**: Comprehensive analysis of deserialized VisionAppraisal entity objects from enhanced browser tool development
**Data Source**: 2,317 processed VisionAppraisal entities with recursive serialization (`__type` preservation)

## 🏗️ **Overview**

This document describes the complete object structures that result from deserializing VisionAppraisal entities. All objects include `__type` properties for class identification, enabling proper method access and object-oriented programming.

---

## 🏠 **Entity Types Hierarchy**

### **Distribution (2,317 total entities)**
- **AggregateHousehold**: 931 entities (40.2%)
- **LegalConstruct**: 812 entities (35.1%)
- **Individual**: 363 entities (15.7%)
- **Business**: 211 entities (9.1%)

### **Common Base Structure (All Entity Types)**
```javascript
{
    __type: "EntityTypeName",           // Class identifier for deserialization
    locationIdentifier: "1510",         // Fire Number (string or number)
    name: NameObject,                   // See Name Structures section
    accountNumber: AttributedTermObject, // Account number with source tracking
    contactInfo: ContactInfoObject,     // See Contact Information section
    otherInfo: null | Object,          // Additional entity information
    legacyInfo: null | Object,         // Legacy processing information
    label: null | string,              // Entity label
    number: null | string,             // Entity number
    pid: "1760",                       // Property ID (string)
    mblu: AttributedTermObject,        // Map/Block/Lot/Unit information
    fireNumber: string | number,       // Fire Number
    googleFileId: string,              // Source file identifier
    source: "VisionAppraisal",         // Data source
    entityType: string                 // Entity type classification
}
```

---

## 👥 **Name Structures**

### **AttributedTerm Names (Households, Businesses, Legal Constructs)**
```javascript
{
    __type: "AttributedTerm",
    term: "LOPES HELDER & MARIA FATIMA",    // Display name
    fieldName: null,                        // Source field name
    sourceMap: MapObject                    // Source tracking information
}
```

### **IndividualName Structure (Individual Entities)**
```javascript
{
    __type: "IndividualName",
    primaryAlias: AttributedTermObject,     // Primary name alias
    alternatives: Object,                   // Alternative names
    title: "",                             // Title (Dr., Mr., etc.)
    firstName: "JONATHAN",                 // First name
    otherNames: Array,                     // Middle names, etc.
    lastName: "LASTNAME",                  // Last name
    suffix: "",                           // Suffix (Jr., Sr., etc.)
    completeName: "JONATHAN LASTNAME",     // Full assembled name
    termOfAddress: ""                     // Preferred address term
}
```

**Name Extraction Pattern**:
```javascript
function extractName(entity) {
    // AttributedTerm names
    if (entity.name.term) return entity.name.term;

    // IndividualName structures
    if (entity.name.completeName) return entity.name.completeName;

    // Build from parts
    const parts = [];
    if (entity.name.firstName) parts.push(entity.name.firstName);
    if (entity.name.lastName) parts.push(entity.name.lastName);
    return parts.join(' ');
}
```

---

## 📧 **Contact Information Structure**

### **ContactInfo Object (All Entities)**
```javascript
{
    __type: "ContactInfo",
    email: null,                           // Email address (typically null)
    phone: null,                           // Phone number (typically null)
    poBox: null,                          // PO Box information (typically null)
    primaryAddress: AddressObject,         // Primary address (complex object)
    secondaryAddress: [AddressObject, ...] // Array of secondary addresses
}
```

### **Address Object Structure**
```javascript
{
    __type: "Address",
    primaryAlias: AttributedTermObject,    // Primary address display
    alternatives: Object,                  // Alternative address formats
    originalAddress: AttributedTermObject, // Original raw address
    streetNumber: AttributedTermObject,    // Street number
    streetName: AttributedTermObject,      // Street name
    streetType: AttributedTermObject,      // Street type (St, Ave, etc.)
    city: AttributedTermObject,           // City (Block Island, etc.)
    state: AttributedTermObject,          // State (RI, CT, etc.)
    zipCode: AttributedTermObject,        // ZIP code
    secUnitType: string,                  // Secondary unit type
    secUnitNum: string,                   // Secondary unit number
    isBlockIslandAddress: boolean,        // Block Island detection flag
    cityNormalized: boolean,              // City normalization flag
    processingSource: string,             // Processing source identifier
    processingTimestamp: string           // Processing timestamp
}
```

### **Address Text Extraction Pattern**
```javascript
function extractAddressText(address) {
    let lines = [];

    // Street address
    if (address.primaryAlias?.term) {
        lines.push(cleanVisionAppraisalTags(address.primaryAlias.term));
    }

    // City, State, ZIP
    const cityStateZip = [];
    if (address.city?.term) cityStateZip.push(address.city.term);
    if (address.state?.term) cityStateZip.push(address.state.term);
    if (address.zipCode?.term) cityStateZip.push(address.zipCode.term);

    if (cityStateZip.length > 0) {
        lines.push(cityStateZip.join(', '));
    }

    return lines;
}
```

---

## 🏘️ **Entity-Specific Structures**

### **AggregateHousehold (40.2% of entities)**
```javascript
{
    // ... base structure
    __type: "AggregateHousehold",
    individuals: [                         // Array of household members
        {
            name: AttributedTermObject,     // Individual member name
            // ... other individual properties
        }
    ]
}
```

### **Individual (15.7% of entities)**
```javascript
{
    // ... base structure
    __type: "Individual",
    name: IndividualNameObject            // Uses IndividualName structure
    // individuals: undefined             // No individuals array
}
```

### **Business (9.1% of entities)**
```javascript
{
    // ... base structure
    __type: "Business",
    name: AttributedTermObject,           // Business name
    label: string,                       // Business label
    number: string                       // Business number
}
```

### **LegalConstruct (35.1% of entities)**
```javascript
{
    // ... base structure
    __type: "LegalConstruct",
    name: AttributedTermObject,          // Legal entity name (trust, etc.)
    label: string,                      // Legal construct label
    number: string                      // Legal construct number
}
```

---

## 🔧 **Supporting Object Types**

### **AttributedTerm Object**
```javascript
{
    __type: "AttributedTerm",
    term: "15/  /  103/  /",            // The actual value/text
    fieldName: null,                    // Source field name
    sourceMap: MapObject                // Source tracking information
}
```

**Usage Pattern**: Core building block for all text values with source tracking
- Names, addresses, MBLU codes, account numbers, etc.
- Always access via `.term` property for display text

### **Map Object (Source Tracking)**
```javascript
{
    __type: "Map",
    __data: [                           // Key-value pairs array
        ["sourceKey", "sourceValue"],
        // ... more tracking data
    ]
}
```

**Purpose**: Tracks data lineage and source information throughout processing pipeline

---

## 🏷️ **Identifier Structures**

### **MBLU (Map/Block/Lot/Unit)**
```javascript
mblu: {
    __type: "AttributedTerm",
    term: "15/  /  103/  /",           // Slash-delimited format
    fieldName: null,
    sourceMap: MapObject
}
```

### **Account Number**
```javascript
accountNumber: {
    __type: "AttributedTerm",
    term: "12345",                     // Account number string
    fieldName: null,
    sourceMap: MapObject
}
```

### **Simple Identifiers**
- **pid**: `"1760"` (string)
- **locationIdentifier**: `"1510"` (string/number, Fire Number)
- **fireNumber**: `1510` (number/string)
- **googleFileId**: `"file_id_string"`
- **source**: `"VisionAppraisal"`

---

## 🧹 **Data Cleaning Requirements**

### **VisionAppraisal Tag Removal**
Raw data contains encoding tags that must be cleaned:

```javascript
function cleanVisionAppraisalTags(text) {
    if (!text || typeof text !== 'string') return 'Not Available';

    return text
        .replace(/::#\^#::/g, ', ')      // City separator
        .replace(/:\^#\^:/g, ' ')        // State separator
        .replace(/\^#\^/g, ' ')          // General separator
        .replace(/\s+/g, ' ')            // Multiple spaces
        .replace(/,\s*,/g, ',')          // Double commas
        .replace(/^\s*,\s*|\s*,\s*$/g, '') // Leading/trailing commas
        .trim();
}
```

**Examples**:
- `"34 WHEELER ROAD::#^#::LITCHFIELD:^#^: CT 06759"`
- → `"34 WHEELER ROAD, LITCHFIELD CT 06759"`

---

## 📊 **Object Access Patterns**

### **Safe Property Access**
```javascript
// Handle potential AttributedTerm objects or simple values
function getDisplayText(obj) {
    if (obj?.term) return obj.term;           // AttributedTerm
    if (typeof obj === 'string') return obj;  // Simple string
    if (obj?.toString) return obj.toString(); // Object with toString
    return 'Not Available';                   // Fallback
}
```

### **Array Handling**
```javascript
// Secondary addresses are arrays
if (entity.contactInfo?.secondaryAddress && Array.isArray(entity.contactInfo.secondaryAddress)) {
    entity.contactInfo.secondaryAddress.forEach((address, index) => {
        // Each address is a full Address object (same structure as primary)
        processAddress(address);
    });
}

// Household individuals are arrays
if (entity.individuals && Array.isArray(entity.individuals)) {
    entity.individuals.forEach(individual => {
        // Each individual has name property (AttributedTerm)
        console.log(individual.name?.term);
    });
}
```

### **Class Method Access**
With `__type` preservation, objects retain their class methods:
```javascript
// These work after deserialization
entity.toString()                    // Entity class methods
entity.name.match(pattern)          // AttributedTerm methods
address.isBlockIslandAddress        // Address properties
```

---

## 🔄 **Deserialization Process**

### **Class Registry Dependencies**
Objects require proper class constructors to be loaded before deserialization:
```javascript
// Required script loading order
1. './scripts/objectStructure/aliasClasses.js'      // AttributedTerm, etc.
2. './scripts/objectStructure/entityClasses.js'     // Entity classes
3. './scripts/utils/classSerializationUtils.js'     // Deserialization utils
4. Data loading with deserializeWithTypes()
```

### **Object Restoration**
```javascript
// Automatic class restoration from __type properties
const entity = deserializeWithTypes(jsonString);
console.log(entity.constructor.name);  // "AggregateHousehold"
console.log(entity.__type);           // "AggregateHousehold"
console.log(entity.name.constructor.name); // "AttributedTerm"
```

---

## 📋 **Common Patterns & Gotchas**

### **Name Extraction**
- **AggregateHousehold/Business/LegalConstruct**: Use `entity.name.term`
- **Individual**: Use `entity.name.completeName` or build from `firstName`/`lastName`
- **Always check `__type`** to determine extraction method

### **Address Processing**
- **Primary Address**: Single Address object
- **Secondary Addresses**: Array of Address objects (same structure as primary)
- **Text Extraction**: Always use `.term` property from AttributedTerm components
- **VisionAppraisal Tags**: Must be cleaned from display text

### **Null/Undefined Handling**
- `otherInfo`: Usually `null`
- `legacyInfo`: Usually `null`
- `email/phone/poBox`: Usually `null`
- `label/number`: Often `null`
- Always provide fallbacks for missing data

### **Type Checking**
```javascript
// Safe type checking
if (entity.__type === 'Individual') {
    // Handle IndividualName structure
} else if (entity.name?.term) {
    // Handle AttributedTerm name
}

// Array checking
if (Array.isArray(entity.individuals)) {
    // Process household members
}
```

---

## 🎯 **Development Guidelines**

### **Object Display**
1. **Always clean VisionAppraisal tags** before displaying text
2. **Handle both AttributedTerm and simple values** in text extraction
3. **Provide meaningful fallbacks** for missing/null data
4. **Use proper class methods** when available after deserialization

### **Data Access Safety**
1. **Optional chaining**: Use `?.` for nested property access
2. **Type validation**: Check `__type` before assuming structure
3. **Array validation**: Use `Array.isArray()` before iteration
4. **Null checking**: Always handle potential null values

### **Performance Considerations**
1. **Lazy loading**: Don't process all fields unless needed for display
2. **Caching**: Store cleaned/processed text to avoid repeated processing
3. **Batch operations**: Process similar entities together when possible

---

## 🏠 **Bloomerang Household Membership Pattern**

### **additionalData.householdData Structure**

Bloomerang Individual entities have household membership data stored in `additionalData.householdData`:

```javascript
{
    // ... entity properties ...
    "additionalData": {
        "transactionData": { /* ... */ },
        "metadata": { /* ... */ },
        "addresses": { /* ... */ },
        "blockIslandData": { /* ... */ },
        "householdData": {
            "isInHousehold": "TRUE",                    // String "TRUE" or "FALSE"
            "householdName": "Robert & Carolyn Benjamin", // Household name for lookup
            "isHeadOfHousehold": "FALSE"               // String "TRUE" or "FALSE"
        }
    }
}
```

### **Usage for Household Member Lookup**

**Correct Pattern** (use for Bloomerang):
```javascript
function findBloomerangHouseholdMembers(householdName) {
    const members = [];
    const individuals = workingLoadedEntities.bloomerang.individuals.entities;

    for (const key in individuals) {
        const individual = individuals[key];
        const householdData = individual.additionalData?.householdData;

        if (householdData?.isInHousehold === "TRUE" &&
            householdData?.householdName === householdName) {
            members.push(individual);
        }
    }

    return members;
}
```

**Incorrect Pattern** (produces false positives):
```javascript
// DON'T DO THIS - imprecise location/address search produces wrong matches
function findHouseholdMembersByLocation(locationId) {
    // This will match unrelated individuals with similar addresses
}
```

### **Key Points**
- `isInHousehold`: String value "TRUE" or "FALSE" (not boolean)
- `householdName`: Exact string match for household membership lookup
- `isHeadOfHousehold`: String value indicating head of household status
- **Always use exact householdName match** - not address/location proximity search

---

## 📋 **Known Data Issues**

### **VisionAppraisal AggregateHousehold.individuals Arrays**

**Problem**: Many VisionAppraisal AggregateHousehold entities have empty `individuals` arrays.

**Root Cause**: ConfigurableVisionAppraisalNameParser case handlers pass `[]` to `createAggregateHousehold()`.

**Affected Cases**: Lines 270, 482, 498, 546, 585, 602, 619, 636, 762 (9+ cases)

**Working Cases**: Lines 133, 254, 409 (properly create Individual entities)

**Reference**: See `reference_householdIndividualsPopulation.md` for implementation plan.

**Impact**: Unified browser cannot display household members from individuals array; must rely on parser fix.

---

**Status**: ✅ **UPDATED** - Now includes Bloomerang householdData pattern and known data issues
**Usage**: Reference for all future entity processing, display, and analysis work
**Coverage**: Based on analysis of 2,317 VisionAppraisal + 1,788 Bloomerang entities (4,105 total)
**Last Updated**: November 30, 2025