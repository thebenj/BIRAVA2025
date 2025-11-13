# Address Processing Module - Technical Reference

## Architecture Overview

The address processing system (`scripts/address/addressProcessing.js`) is designed for **Block Island-specific address processing** with these core features:
- Block Island city normalization ("New Shoreham" ↔ "Block Island")
- Enhanced Block Island address completion using dual logic rules
- Street name preservation (prevents parse-address library abbreviations)
- Complete data lineage through AttributedTerm integration

## Dependencies
- **parse-address library**: External library for address parsing (must be globally available)
- **Address class**: From `aliasClasses.js` for creating Address ComplexIdentifiers
- **Google Drive API**: For loading Block Island streets database

## Core Functions

### 1. normalizeBlockIslandCity(parsedAddress)
**Purpose**: Standardizes Block Island city name variations

**Process**:
- Detects "block island" or "new shoreham" (case-insensitive)
- Sets canonical form as "Block Island" (postal name)
- Stores both forms: `cityPostal: 'Block Island'`, `cityMunicipal: 'New Shoreham'`
- Adds `cityNormalized: true` flag

### 2. createProcessedAddressObject(normalized, originalString, sourceType, fieldName)
**Purpose**: Creates standardized address objects with comprehensive metadata

**Returns structured object with**:
- **Original data**: `original`, `sourceType`, `fieldName`
- **Parsed components**: `number`, `street`, `type` (St, Ave, Rd)
- **Block Island city handling**: `city`, `cityPostal`, `cityMunicipal`, `cityNormalized`
- **Geographic data**: `state`, `zip`
- **Special units**: `secUnitType`, `secUnitNum` (apartments, PO boxes)
- **Metadata**: `processedAt` timestamp, `isBlockIslandAddress` boolean

**Block Island Detection Logic**: Address is Block Island if:
- ZIP code is '02807' OR
- City is 'Block Island' OR
- City is 'New Shoreham'

### 3. processAddress(addressString, sourceType, fieldName) - MAIN FUNCTION
**Purpose**: Unified address processing pipeline handling special cases and standard parsing

**Processing Flow**:

**Step 1**: Input validation
- Checks for valid string input
- Verifies parse-address library availability

**Step 2**: Special case handling
- **BI PO Box** (fieldName === 'BI PO Box'):
  - Takes PO Box number, generates full address: `PO Box ${num}, New Shoreham, RI 02807`
  - Forces `isBlockIslandAddress: true`
  - Adds `blockIslandReason: 'BI PO Box generated address'`

- **BI Street** (fieldName === 'BI Street'):
  - Detects fire numbers (addresses starting with digits: `/^\d+/`)
  - Generates full address: `${streetData}, Block Island, RI 02807`
  - Forces `isBlockIslandAddress: true`
  - Adds `blockIslandReason: 'BI Street generated address with Fire Number'`

**Step 3**: Standard parsing
- Uses `parseAddress.parseLocation()` to parse the address
- Validates parsing success (must have city, zip, or street)
- Applies Block Island city normalization

**Step 4**: Enhancement
- Calls `enhanceAddressWithBlockIslandLogic()` for advanced processing

### 4. enhanceAddressWithBlockIslandLogic(processedAddress, sourceType, fieldName)
**Purpose**: Applies Block Island-specific completion logic and street name preservation

**Rule 1 - VisionAppraisal Property Locations**:
- **Trigger**: `sourceType === 'VisionAppraisal'` AND missing city/state
- **Action**: Forces Block Island completion (`city: 'Block Island'`, `state: 'RI'`, `zip: '02807'`)
- **Street Preservation**: Uses regex `/(\d+)\s+(.*?)(?:\s*::#\^#::|$)/i` to extract original street name
- **Purpose**: Prevents parse-address from abbreviating Block Island street names

**Rule 2 - Street Name Database Matching**:
- **Trigger**: Missing city AND `window.blockIslandStreets` available AND has street name
- **Process**: Creates comprehensive street check variations:
  - Direct match: "CORN NECK"
  - Off-road variation: "OFF CORN NECK"
  - Space normalized: removes extra spaces
  - Numbered variations (if address has number): "123 CORN NECK", "123 OFF CORN NECK"
- **Action**: If any variation matches database, forces Block Island completion
- **Street Preservation**: Same regex-based original name extraction as Rule 1

### 5. loadBlockIslandStreetsFromDrive()
**Purpose**: Loads Block Island street names database from Google Drive

**Process**:
- Fetches from Google Drive file ID: `1lsrd0alv9O01M_qlsiym3cB0TRIdgXI9`
- Parses JSON content
- Creates `window.blockIslandStreets` Set with uppercase, trimmed street names
- Returns the Set for use by enhancement logic

### 6. createAddressFromParsedData(processedAddress, fieldName)
**Purpose**: Converts processed address data to Address ComplexIdentifier object

**Process**:
- Validates processed address has required `original` field
- Calls `Address.fromProcessedAddress()` to create Address instance
- Provides error handling with detailed logging

## Data Flow

```
Raw Address String
    ↓
processAddress()
    ↓
Special Case Check (BI PO Box, BI Street)
    ↓
Standard parse-address parsing
    ↓
normalizeBlockIslandCity()
    ↓
createProcessedAddressObject()
    ↓
enhanceAddressWithBlockIslandLogic()
    ↓
Enhanced Address Object
    ↓
createAddressFromParsedData() [optional]
    ↓
Address ComplexIdentifier
```

## Block Island Specializations

The system is heavily optimized for Block Island addresses with:
- **Dual city names**: New Shoreham (municipal) vs Block Island (postal)
- **Fire number integration**: Detects fire numbers in BI Street fields
- **Street name preservation**: Prevents abbreviation of Block Island street names
- **Database-driven completion**: Uses comprehensive street name database for address completion
- **VisionAppraisal property assumption**: Assumes VisionAppraisal property locations are Block Island

## Integration with Entity System

The address processing functions are designed to integrate with the entity constructor system:
- `processAddress()` processes raw address strings from entity constructor parameters
- `createAddressFromParsedData()` creates Address ComplexIdentifiers for entity ContactInfo
- System supports VisionAppraisal property/owner address distinction
- Block Island logic ensures accurate address completion for local properties

This creates a robust address processing system specifically designed for Block Island real estate data integration.