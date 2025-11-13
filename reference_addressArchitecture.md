# Address Architecture Implementation Reference

**Purpose**: Technical implementation details for Address ComplexIdentifier subclass and address processing system

**Status**: ✅ **IMPLEMENTATION COMPLETE** - Address class and test infrastructure ready, awaiting function integration

**Cross-references**: Used by diversContent.md current session accomplishments

---

## **Address Class Technical Specification**

### **Class Hierarchy**
```javascript
ComplexIdentifiers (base class)
  ↳ Address (subclass) - 13+ AttributedTerm properties
```

### **Address Properties with Data Lineage**
**Original Data Preservation**:
- `originalAddress` - AttributedTerm for full unparsed address string

**Parsed Components** (from parse-address library):
- `streetNumber` - AttributedTerm for "123"
- `streetName` - AttributedTerm for "Main"
- `streetType` - AttributedTerm for "St"
- `city` - AttributedTerm for "Block Island"
- `state` - AttributedTerm for "RI"
- `zipCode` - AttributedTerm for "02807"

**Special Address Components**:
- `secUnitType` - AttributedTerm for "PO Box", "Apt", etc.
- `secUnitNum` - AttributedTerm for unit numbers

**Block Island Metadata**:
- `isBlockIslandAddress` - AttributedTerm for boolean flag
- `cityNormalized` - AttributedTerm for normalization flag

**Processing Metadata**:
- `processingSource` - AttributedTerm for "VisionAppraisal", "Bloomerang"
- `processingTimestamp` - AttributedTerm for processing datetime

### **Key Methods Implemented**
- `getFireNumber()` - **Option B approach**: Method-based access, returns `streetNumber` AttributedTerm for Block Island addresses
- `hasFireNumber()` - Boolean check for fire number availability
- `getAddressSummary()` - Complete address summary for display/debugging
- `getStreetDisplay()` - Formatted street address string
- `toString()` - Human-readable address representation
- `serialize()`/`deserialize()` - Full JSON serialization with type handling
- `Address.fromProcessedAddress(processedData, fieldName)` - Static factory method

### **Cross-Referencing Architecture**
**Same AttributedTerm Object Shared Between**:
- `address.streetNumber` (in Address ComplexIdentifier)
- `entity.locationIdentifier` (if using FireNumber SimpleIdentifier)
- **Benefit**: Single source of truth for fire number data with complete lineage

---

## **Test Infrastructure Specification**

### **Persistent Test Functions (Moved to scripts/testing/addressTesting.js)**

**⚠️ LOCATION UPDATE**: These functions were moved from utils.js during modularization

**Primary Functions**:
1. `createAddressFromParsedData(processedAddress, fieldName)` - Convert processAddress() output to Address instance
2. `validateAddressProcessing(address, originalProcessed)` - 6-step validation system
3. `addressProcessingTests(testAddresses, verbose)` - Comprehensive test suite for regression testing
4. `quickAddressTest(addressString, source, field)` - Quick development testing

### **Validation System (6 Tests)**
1. ✅ Address instance created successfully
2. ✅ Original address preserved correctly
3. ✅ Block Island detection accuracy
4. ✅ Fire number detection (for BI addresses)
5. ✅ Serialization/deserialization integrity
6. ✅ Address component extraction completeness

### **Test Suite Features**
- **Default Test Cases**: 6 comprehensive address scenarios including BI/non-BI, PO Box, ZIP+4
- **Scalable Design**: Easily configurable from 50-record samples to full datasets
- **Comprehensive Metrics**: Success rates, BI detection, fire numbers found, component extraction accuracy
- **Detailed Results**: Full validation results with error details for debugging

---

## **Parse-Address Library Integration**

### **Installation & Browser Compatibility**
- ✅ **npm install parse-address** - Library installed locally
- ✅ **Browser Copy**: `parse-address.min.js` copied to scripts/ directory for browser access
- ✅ **CDN Fallback**: Tested and working with local server delivery

### **Block Island Normalization Logic**
```javascript
function normalizeBlockIslandCity(parsedAddress) {
    if (parsedAddress && parsedAddress.city) {
        const city = parsedAddress.city.toLowerCase();
        if (city === 'block island' || city === 'new shoreham') {
            parsedAddress.city = 'Block Island';
            parsedAddress.cityNormalized = true;
            parsedAddress.cityPostal = 'Block Island';
            parsedAddress.cityMunicipal = 'New Shoreham';
        }
    }
    return parsedAddress;
}
```

### **Unified Address Processing Pipeline**
```javascript
processAddress(addressString, sourceType, fieldName)
  ↓ (parse-address library + Block Island normalization)
createAddressFromParsedData(processedAddress, fieldName)
  ↓ (Address.fromProcessedAddress static method)
Address ComplexIdentifier instance (with full AttributedTerm integration)
```

---

## **File Modifications Made This Session**

### **aliasClasses.js Updates**
- ✅ **Address class added**: Lines 1199-1490 (292 lines of code)
- ✅ **Export updates**: Address added to module.exports and window globals
- ✅ **Deserializer update**: Address case added to _deserializeIdentifier method

### **Testing Module Updates**
**⚠️ LOCATION UPDATE**: Test functions moved from utils.js to scripts/testing/addressTesting.js during modularization
- ✅ **Test functions added**: Complete testing infrastructure (344 lines of code)
- ✅ **Protocol 2 compliance**: Permanent test functions for regression testing
- ✅ **Scalable architecture**: Functions designed for sample → full dataset scaling

### **parse-address.min.js**
- ✅ **Browser copy created**: Copied from node_modules to scripts/ directory
- ✅ **Local server delivery**: Working via http://127.0.0.1:1337/scripts/parse-address.min.js

---

## **Architectural Decisions Confirmed**

### **Fire Number Access Strategy**
✅ **Option B Selected**: Method-based access (`getFireNumber()`) rather than redundant property
- **Rationale**: Single source of truth, prevents data inconsistency, clear semantic meaning
- **Implementation**: Returns same AttributedTerm object as streetNumber for Block Island addresses

### **Data Lineage Strategy**
✅ **Complete AttributedTerm Integration**: Every address component stored as AttributedTerm
- **Rationale**: Full source attribution (term, source, fieldName, identifier) for audit trails
- **Implementation**: 13+ properties, each containing AttributedTerm with proper data lineage

### **Cross-System Referencing**
✅ **Shared AttributedTerm Objects**: Same object referenced by Address and FireNumber identifiers
- **Rationale**: Single source of truth, consistent data across entity relationships
- **Implementation**: Process records completely, create shared AttributedTerm references

---

## **Known Issues & Blockers**

### **✅ RESOLVED: Functions Now Available**
**Previous Issue**: `processAddress()` and `normalizeBlockIslandCity()` functions existed in console testing only
**Resolution**: ✅ **COMPLETE** - Functions moved to `scripts/address/addressProcessing.js` during modularization
**Status**: Address processing pipeline fully functional in modular architecture

### **Browser Script Loading**
**Issue**: Script redeclaration errors when loading multiple times in same session
**Impact**: Development testing workflow interrupted
**Solution**: Browser refresh or careful script loading management

---

## **✅ COMPLETED PRIORITIES**

1. **✅ Function Integration**: processAddress() functions moved to `scripts/address/addressProcessing.js`
2. **✅ End-to-End Testing**: Complete address processing pipeline tested and validated
3. **✅ Real Data Loading**: Phase 3 completed with VisionAppraisal & Bloomerang samples
4. **✅ Cross-Referencing Validation**: Address ↔ FireNumber AttributedTerm sharing validated

**Current Status**: All address architecture objectives achieved through modular implementation

---

**Last Updated**: Address architecture implementation session completion
**File Location**: `/BIRAVA2025/reference_addressArchitecture.md`
**Referenced By**: diversContent.md current session accomplishments