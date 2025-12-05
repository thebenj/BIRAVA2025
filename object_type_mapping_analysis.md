# **Current State Entity Structure Mapping - PHASE 1.1 Results**
**Created**: 2025-11-19
**Purpose**: Comprehensive mapping of object types held by each property of each Entity subclass

## **🎯 RESEARCH METHODOLOGY**

**Sources Analyzed**:
1. **CLAUDE.md** - Current status and entity structure documentation
2. **reference_constructorSignatures.md** - Constructor signatures and expected object types
3. **reference_entityObjectStructures.md** - Real entity structure analysis from 2,317 entities
4. **scripts/objectStructure/entityClasses.js** - Entity class definitions and architecture
5. **scripts/objectStructure/aliasClasses.js** - Object type class definitions
6. **scripts/objectStructure/contactInfo.js** - ContactInfo structure definitions

## **📋 COMPLETE ENTITY PROPERTY OBJECT TYPE MAPPING**

### **BASE ENTITY CLASS PROPERTIES**

| Property | Expected Object Type (Architecture) | VisionAppraisal Actual | Bloomerang Actual | Consistency |
|----------|-------------------------------------|-------------------------|-------------------|-------------|
| **locationIdentifier** | `IdentifyingData(FireNumber/PID/ComplexIdentifier)` | Raw `number` (1510, 1742, 631) | `IdentifyingData` wrapper | ❌ **INCONSISTENT** |
| **name** | `IdentifyingData(IndividualName/HouseholdName)` | Direct `AttributedTerm`/`IndividualName` | `IdentifyingData` wrapper | ❌ **INCONSISTENT** |
| **accountNumber** | `IndicativeData(SimpleIdentifiers)` or `null` | `AttributedTerm` or `false` | `IdentifyingData` wrapper | ❌ **INCONSISTENT** |
| **contactInfo** | `ContactInfo` or `null` | `ContactInfo` object with addresses | `false`/`true` (boolean) | ⚠️ **PARTIALLY INCONSISTENT** |
| **otherInfo** | `OtherInfo` or `null` | `null` | `null` | ✅ **CONSISTENT** |
| **legacyInfo** | `LegacyInfo` or `null` | `null` | `null` | ✅ **CONSISTENT** |

### **ENTITY SUBCLASS SPECIFIC PROPERTIES**

#### **Individual Entities**
| Property | Expected Object Type | VisionAppraisal Actual | Bloomerang Actual | Consistency |
|----------|----------------------|-------------------------|-------------------|-------------|
| **name** | `IdentifyingData(IndividualName)` | Direct `IndividualName` | `IdentifyingData(IndividualName)` | ❌ **WRAPPER INCONSISTENT** |
| **name.firstName** | `string` via IndividualName | `"JONATHAN"` (direct) | `"Joe"` (via identifier) | ✅ **VALUE CONSISTENT** |
| **name.lastName** | `string` via IndividualName | `"LASTNAME"` (direct) | `"LastName"` (via identifier) | ✅ **VALUE CONSISTENT** |
| **name.completeName** | `string` via IndividualName | `"JONATHAN LASTNAME"` (direct) | Available via identifier | ✅ **VALUE CONSISTENT** |

#### **AggregateHousehold Entities**
| Property | Expected Object Type | VisionAppraisal Actual | Bloomerang Actual | Consistency |
|----------|----------------------|-------------------------|-------------------|-------------|
| **name** | `IdentifyingData(HouseholdName)` | Direct `AttributedTerm` | `IdentifyingData` wrapper | ❌ **INCONSISTENT** |
| **name.term** | `string` via AttributedTerm | `"LOPES HELDER & MARIA FATIMA"` (direct) | Not accessible | ❌ **ACCESS INCONSISTENT** |
| **individuals** | `Array<Individual>` | Array with name objects | Not applicable | N/A |

#### **Business Entities**
| Property | Expected Object Type | VisionAppraisal Actual | Bloomerang Actual | Consistency |
|----------|----------------------|-------------------------|-------------------|-------------|
| **name** | `IdentifyingData(AttributedTerm)` | Direct `AttributedTerm` | `IdentifyingData` wrapper | ❌ **INCONSISTENT** |
| **name.term** | `string` via AttributedTerm | `"MCM INTERNATIONAL INC"` (direct) | Not accessible | ❌ **ACCESS INCONSISTENT** |

#### **LegalConstruct Entities**
| Property | Expected Object Type | VisionAppraisal Actual | Bloomerang Actual | Consistency |
|----------|----------------------|-------------------------|-------------------|-------------|
| **name** | `IdentifyingData(AttributedTerm)` | Direct `AttributedTerm` | `IdentifyingData` wrapper | ❌ **INCONSISTENT** |
| **name.term** | `string` via AttributedTerm | `"BLANE, CHRISTOPHER LV TRUST..."` (direct) | Not accessible | ❌ **ACCESS INCONSISTENT** |

## **📊 PROPERTY-SPECIFIC OBJECT TYPE TABLES**

### **locationIdentifier Property**
| Entity Subclass | VisionAppraisal Object Type | Bloomerang Object Type |
|-----------------|----------------------------|------------------------|
| **Individual** | Raw `number` (e.g., 1510) | `IdentifyingData` wrapper object |
| **AggregateHousehold** | Raw `number` (e.g., 1742) | `IdentifyingData` wrapper object |
| **Business** | Raw `number` (e.g., 631) | `IdentifyingData` wrapper object |
| **LegalConstruct** | Raw `number` | `IdentifyingData` wrapper object |
| **CompositeHousehold** | Raw `number` | `IdentifyingData` wrapper object |
| **NonHuman** | Raw `number` | `IdentifyingData` wrapper object |

### **name Property**
| Entity Subclass | VisionAppraisal Object Type | Bloomerang Object Type |
|-----------------|----------------------------|------------------------|
| **Individual** | Direct `IndividualName` object | `IdentifyingData(IndividualName)` |
| **AggregateHousehold** | Direct `AttributedTerm` object | `IdentifyingData(IndividualName)` |
| **Business** | Direct `AttributedTerm` object | `IdentifyingData(IndividualName)` |
| **LegalConstruct** | Direct `AttributedTerm` object | `IdentifyingData(IndividualName)` |
| **CompositeHousehold** | Direct `AttributedTerm` object | `IdentifyingData(IndividualName)` |
| **NonHuman** | Direct `AttributedTerm` object | `IdentifyingData(IndividualName)` |

### **accountNumber Property**
| Entity Subclass | VisionAppraisal Object Type | Bloomerang Object Type |
|-----------------|----------------------------|------------------------|
| **Individual** | `false` (boolean) | `IdentifyingData(SimpleIdentifier)` |
| **AggregateHousehold** | `false` (boolean) | `IdentifyingData(SimpleIdentifier)` |
| **Business** | `false` (boolean) | `IdentifyingData(SimpleIdentifier)` |
| **LegalConstruct** | `false` (boolean) | `IdentifyingData(SimpleIdentifier)` |
| **CompositeHousehold** | `false` (boolean) | `IdentifyingData(SimpleIdentifier)` |
| **NonHuman** | `false` (boolean) | `IdentifyingData(SimpleIdentifier)` |

### **contactInfo Property**
| Entity Subclass | VisionAppraisal Object Type | Bloomerang Object Type |
|-----------------|----------------------------|------------------------|
| **Individual** | `ContactInfo` object with addresses | `false` (boolean) or `true` |
| **AggregateHousehold** | `ContactInfo` object with addresses | `false` (boolean) or `true` |
| **Business** | `ContactInfo` object with addresses | `false` (boolean) or `true` |
| **LegalConstruct** | `ContactInfo` object with addresses | `false` (boolean) or `true` |
| **CompositeHousehold** | `ContactInfo` object with addresses | `false` (boolean) or `true` |
| **NonHuman** | `ContactInfo` object with addresses | `false` (boolean) or `true` |

### **otherInfo Property**
| Entity Subclass | VisionAppraisal Object Type | Bloomerang Object Type |
|-----------------|----------------------------|------------------------|
| **Individual** | `null` | `null` |
| **AggregateHousehold** | `null` | `null` |
| **Business** | `null` | `null` |
| **LegalConstruct** | `null` | `null` |
| **CompositeHousehold** | `null` | `null` |
| **NonHuman** | `null` | `null` |

### **legacyInfo Property**
| Entity Subclass | VisionAppraisal Object Type | Bloomerang Object Type |
|-----------------|----------------------------|------------------------|
| **Individual** | `null` | `null` |
| **AggregateHousehold** | `null` | `null` |
| **Business** | `null` | `null` |
| **LegalConstruct** | `null` | `null` |
| **CompositeHousehold** | `null` | `null` |
| **NonHuman** | `null` | `null` |

## **🔍 DETAILED OBJECT TYPE ANALYSIS**

### **Name Property Object Types**

#### **VisionAppraisal Name Structures**:
```javascript
// Individual entities:
entity.name = {
    __type: "IndividualName",
    primaryAlias: AttributedTerm,
    alternatives: Object,
    title: "",
    firstName: "JONATHAN",      // Direct string access
    lastName: "LASTNAME",       // Direct string access
    completeName: "JONATHAN LASTNAME"
}

// Non-Individual entities:
entity.name = {
    __type: "AttributedTerm",
    term: "LOPES HELDER & MARIA FATIMA",  // Direct string access
    fieldName: null,
    sourceMap: MapObject
}
```

#### **Bloomerang Name Structures**:
```javascript
// ALL entity types:
entity.name = {
    type: "IdentifyingData",              // Wrapper container
    identifier: {
        type: "IndividualName",
        primaryAlias: {...},
        firstName: "Joe",                 // Access via identifier
        lastName: "LastName",             // Access via identifier
        completeName: "Joe LastName"
    }
}
```

### **LocationIdentifier Property Object Types**

#### **VisionAppraisal LocationIdentifier**:
```javascript
entity.locationIdentifier = 1510         // Raw number (Fire Number)
// Type: number
// Keys: [] (primitive)
// Access: entity.locationIdentifier.toString() works directly
```

#### **Bloomerang LocationIdentifier**:
```javascript
entity.locationIdentifier = {
    type: "IdentifyingData",              // Wrapper container
    identifier: {
        // Contains identifier object structure
    }
}
// Type: object
// Keys: ['type', 'identifier']
// Access: entity.locationIdentifier.identifier required
```

### **ContactInfo Property Object Types**

#### **VisionAppraisal ContactInfo**:
```javascript
entity.contactInfo = {
    __type: "ContactInfo",
    email: null,
    phone: null,
    poBox: null,
    primaryAddress: {                     // Address object
        __type: "Address",
        primaryAlias: AttributedTerm,
        streetNumber: AttributedTerm,
        streetName: AttributedTerm,
        city: AttributedTerm,
        state: AttributedTerm,
        // ... complex address structure
    },
    secondaryAddress: [AddressObject, ...]
}
```

#### **Bloomerang ContactInfo**:
```javascript
entity.contactInfo = false               // Boolean value
// OR
entity.contactInfo = true                // Boolean value (some entities)
```

### **AccountNumber Property Object Types**

#### **VisionAppraisal AccountNumber**:
```javascript
entity.accountNumber = false             // Boolean (not used)
```

#### **Bloomerang AccountNumber**:
```javascript
entity.accountNumber = {
    type: "IdentifyingData",              // Wrapper container
    identifier: {
        type: "SimpleIdentifier",
        primaryAlias: {
            term: "2029"                  // Actual account number
        }
    }
}
```

## **🚨 ARCHITECTURAL VIOLATIONS IDENTIFIED**

### **1. VisionAppraisal Violates Its Own Architecture**

**Expected Architecture** (from entityClasses.js line 27):
```javascript
// Entity name property should contain IdentifyingData with ComplexIdentifiers
this.name = name; // Expected: IdentifyingData containing IndividualName or HouseholdName
```

**Actual VisionAppraisal Implementation**:
```javascript
// Direct object assignment, bypassing IdentifyingData wrapper
entity.name = new IndividualName(...)     // Should be: new IdentifyingData(new IndividualName(...))
entity.name = new AttributedTerm(...)     // Should be: new IdentifyingData(new AttributedTerm(...))
```

### **2. LocationIdentifier Architecture Violation**

**Expected Architecture** (from entityClasses.js line 21):
```javascript
// Type: IdentifyingData containing Fire Number, PID, or ComplexIdentifiers
this.locationIdentifier = locationIdentifier;
```

**Actual VisionAppraisal Implementation**:
```javascript
entity.locationIdentifier = 1510          // Raw number - no wrapper
```

**Correct Bloomerang Implementation**:
```javascript
entity.locationIdentifier = new IdentifyingData(new FireNumber(...))
```

### **3. Mixed Type System Consequences**

**Property Access Incompatibility**:
```javascript
// VisionAppraisal access patterns:
entity.name.firstName                     // Works for Individual
entity.name.term                         // Works for other entities
entity.locationIdentifier.toString()     // Works (primitive)

// Bloomerang access patterns:
entity.name.identifier.firstName         // Required wrapper access
entity.name.identifier.term              // Required wrapper access
entity.locationIdentifier.identifier     // Required wrapper access

// Universal access FAILS:
function getName(entity) {
    if (entity.name.firstName) return entity.name.firstName;  // Only works for VA
    if (entity.name.identifier.firstName) return entity.name.identifier.firstName;  // Only works for Bloomerang
}
```

## **📊 CONSISTENCY ANALYSIS SUMMARY**

### **Properties by Consistency Level**:

**✅ Fully Consistent Properties**: 2
- `otherInfo` (both null)
- `legacyInfo` (both null)

**⚠️ Partially Consistent Properties**: 1
- `contactInfo` (different object types but both indicate presence/absence)

**❌ Completely Inconsistent Properties**: 3
- `name` (direct objects vs IdentifyingData wrapper)
- `locationIdentifier` (raw number vs IdentifyingData wrapper)
- `accountNumber` (boolean vs IdentifyingData wrapper)

### **Entity Types by Impact**:

**High Impact (Name Access Broken)**: 4 entity types
- `Individual` (firstName/lastName access inconsistent)
- `AggregateHousehold` (term access inconsistent)
- `Business` (term access inconsistent)
- `LegalConstruct` (term access inconsistent)

**Medium Impact (ID Access Broken)**: All entity types
- `locationIdentifier` access patterns completely different

**Low Impact**: All entity types
- `accountNumber` inconsistent but not critical for core functionality

## **🔧 ROOT CAUSE ANALYSIS**

### **Parser-Level Inconsistency**

**VisionAppraisal Entity Creation** bypasses architectural wrapper requirements:
```javascript
// From visionAppraisalNameParser.js (inferred):
const individual = new Individual(
    locationIdentifier,           // Raw value, not wrapped
    individualName,              // Direct object, not wrapped
    propertyLocation,
    ownerAddress,
    null
);
```

**Bloomerang Entity Creation** follows architectural requirements:
```javascript
// From bloomerang.js (inferred):
const individual = new Individual(
    new IdentifyingData(fireNumber),        // Properly wrapped
    new IdentifyingData(individualName),    // Properly wrapped
    null,
    null,
    new IdentifyingData(accountNumber)      // Properly wrapped
);
```

### **Serialization Impact**

**Class Preservation**: Both approaches preserve __type information
**Access Patterns**: Inconsistent due to wrapper/non-wrapper differences
**Compatibility**: Mixed structures coexist but require dual access logic

## **📋 IMPLICATIONS FOR ENTITY STRUCTURE STANDARDIZATION**

### **Required Changes for Universal Compatibility**:

1. **VisionAppraisal Parser Updates**:
   - Wrap `locationIdentifier` in `IdentifyingData`
   - Wrap `name` objects in `IdentifyingData`
   - Wrap `accountNumber` in `IndicativeData` when applicable

2. **Universal Access Function Updates**:
   - Create wrapper-aware name extraction
   - Create wrapper-aware location identifier extraction
   - Create wrapper-aware account number extraction

3. **Browser Compatibility Updates**:
   - Update VisionAppraisal browser to handle wrappers
   - Ensure Bloomerang browser continues working
   - Create universal entity display functions

### **Backward Compatibility Requirements**:
- Support mixed entity structures during transition
- Provide migration path for existing Google Drive entities
- Maintain current browser functionality throughout migration

**Status**: Phase 1.1 Complete - Comprehensive object type mapping completed with detailed architectural violation analysis and standardization requirements identified