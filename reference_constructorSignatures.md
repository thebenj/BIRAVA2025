# Constructor Signatures Reference

## Entity System Constructors

### Primary Entity Classes (`entityClasses.js`)

All entity classes now support address processing through standardized constructor parameters.

**Base Entity Class:**
```javascript
Entity(locationIdentifier, name, propertyLocation = null, ownerAddress = null, accountNumber = null)
```
- `locationIdentifier`: Fire Number (preferred), PID (secondary), or ComplexIdentifier (fallback)
- `name`: IdentifyingData containing IndividualName or HouseholdName
- `propertyLocation`: Raw address string for property location (VisionAppraisal) or null
- `ownerAddress`: Raw address string for owner mailing address (VisionAppraisal) or null
- `accountNumber`: Account number (Bloomerang) or null

**Entity Subclasses:** All inherit the same 5-parameter signature:
```javascript
Individual(locationIdentifier, name, propertyLocation = null, ownerAddress = null, accountNumber = null)
CompositeHousehold(locationIdentifier, name, propertyLocation = null, ownerAddress = null, accountNumber = null)
AggregateHousehold(locationIdentifier, name, propertyLocation = null, ownerAddress = null, accountNumber = null)
NonHuman(locationIdentifier, name, propertyLocation = null, ownerAddress = null, accountNumber = null)
Business(locationIdentifier, name, propertyLocation = null, ownerAddress = null, accountNumber = null)
LegalConstruct(locationIdentifier, name, propertyLocation = null, ownerAddress = null, accountNumber = null)
```

**Usage Notes:**
- VisionAppraisal entities: Pass `record.propertyLocation` and `record.ownerAddress` for address processing
- Bloomerang entities: Pass `null, null` for address parameters since address data is in different fields
- Deserialize methods: Pass `null, null` for address parameters (address processing not yet implemented in constructors)

### Information Container Classes (`contactInfo.js`)

**Base Information Class:**
```javascript
Info()  // No parameters - base initialization only
```

**Contact Information:**
```javascript
ContactInfo()  // No parameters - initializes communication hierarchy structure
```
- Contains `primaryAddress`, `secondaryAddress[]`, `phoneNumbers[]`, `emailAddresses[]`
- Implements communications priority: Email > (BI PO Box OR Off-island primary) > Off-island only

**Other Information:**
```javascript
OtherInfo()          // Base class for non-contact data
HouseholdOtherInfo() // Household-specific other information
IndividualOtherInfo() // Individual-specific other information
```

**Legacy Information:**
```javascript
LegacyInfo()  // VisionAppraisal legacy data fields using SimpleIdentifier architecture
```

### Identifier System Classes (`aliasClasses.js`)

**Foundation Classes:**
```javascript
AttributedTerm(term, source, index, identifier, fieldName = null)
```
- Core data attribution system with complete source tracking
- `term`: The actual data value
- `source`: Data source identifier ('VISION_APPRAISAL', 'BLOOMERANG', etc.)
- `index`: Record position in source dataset
- `identifier`: Unique record identifier (PID, accountNumber, etc.)
- `fieldName`: Optional field name for data lineage

```javascript
Aliases()          // Collection of AttributedTerm homonyms
Aliased(primaryAlias)  // Base class for entities with primary/alternate representations
```

**Data Classification:**
```javascript
IndicativeData(identifier)   // Non-definitive data (addresses, phone numbers, etc.)
IdentifyingData(identifier)  // Definitive data (names, account numbers, etc.)
```

**Simple Identifiers:**
```javascript
SimpleIdentifiers(primaryAlias)  // Base for single-value identifiers
FireNumber(primaryAlias)        // Block Island fire numbers (<3500)
PoBox(primaryAlias)            // PO Box numbers
PID(primaryAlias)              // VisionAppraisal parcel identifiers
```

**Complex Identifiers:**
```javascript
ComplexIdentifiers(primaryAlias)  // Base for multi-component identifiers

IndividualName(primaryAlias, title = "", firstName = "", otherNames = "", lastName = "", suffix = "")
// Personal name parsing with component separation

HouseholdName(primaryAlias, fullHouseholdName = "")
// Household name representation

Address(primaryAlias, streetNumber = "", streetName = "", streetType = "", city = "", state = "", zipCode = "", isBlockIslandAddress = null, hasFireNumber = null, fireNumber = null)
// Address parsing with Block Island-specific logic and fire number detection
```

## Constructor Call Patterns

### VisionAppraisal Entity Creation
```javascript
// Configurable parser pattern
const individual = new Individual(
    locationIdentifier,
    individualName,
    record.propertyLocation,  // Raw address string
    record.ownerAddress,      // Raw address string
    null                      // No account number
);
```

### Bloomerang Entity Creation
```javascript
// Bloomerang parser pattern
const individual = new Individual(
    locationIdentifier,
    individualName,
    null,                     // No property location
    null,                     // No owner address
    createAccountNumberIndicativeData(accountNumber, rowIndex, dataSource)
);
```

### Entity Deserialization
```javascript
// Deserialize pattern (temporary until address processing implemented)
const individual = new Individual(
    baseEntity.locationIdentifier,
    baseEntity.name,
    null,                     // Address processing not implemented yet
    null,                     // Address processing not implemented yet
    baseEntity.accountNumber
);
```

## Address Processing Integration Status

- **Constructor Parameters**: ✅ All entity constructors accept address parameters
- **VisionAppraisal Integration**: ✅ Configurable parser passes raw address data
- **Bloomerang Integration**: ✅ Updated to pass null for address parameters
- **Address Processing Logic**: ⏳ To be implemented in Entity constructor
- **ContactInfo Creation**: ⏳ To be implemented using existing address processing functions

## Next Implementation Steps

1. Add quiet mode support to ConfigurableVisionAppraisalNameParser
2. Create unified test function for both VisionAppraisal and Bloomerang processing
3. Implement address processing in Entity constructor using functions from `scripts/address/addressProcessing.js`
4. Process VisionAppraisal entity types: Individual → Business → LegalConstruct → AggregateHousehold
5. Process Bloomerang entity address fields type by type