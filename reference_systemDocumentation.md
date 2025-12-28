# BIRAVA2025 System Documentation

**Purpose**: Comprehensive technical guide to the BIRAVA2025 entity matching and contact discovery system

**Last Updated**: December 26, 2025

---

## Table of Contents

1. [Project Overview & Goals](#1-project-overview--goals)
2. [Architecture](#2-architecture)
   - 2.1 Entity Class Hierarchy
   - 2.2 Info Class Hierarchy
   - 2.3 Identifier Architecture
   - 2.4 Serialization System
   - 2.5 Constructor Signatures
   - 2.6 Database Structures
3. [Core Algorithms](#3-core-algorithms)
4. [Data Specifications](#4-data-specifications)
5. [Production Operations](#5-production-operations)
6. [Development Principles](#6-development-principles)
7. [Google Apps Script Integration](#7-google-apps-script-integration)
8. [Critical Files Reference](#8-critical-files-reference)

---

# 1. Project Overview & Goals

## 1.1 Business Purpose

BIRAVA2025 is a contact discovery and data enrichment system for Block Island, Rhode Island. The system integrates property ownership data with donor/contact information to support community outreach.

### Primary Objectives

1. **Contact Discovery**: Find NEW potential contacts (VisionAppraisal property owners NOT in Bloomerang)
2. **Data Enrichment**: Enhance existing Bloomerang contacts with VisionAppraisal property ownership data
3. **Avoid Duplication**: Recognize when Bloomerang individuals/households match VisionAppraisal property owners

### Strategic Context

- **VisionAppraisal**: Contains ALL Block Island property owners (~2,317 entities)
- **Bloomerang**: Contains existing donor/contact database (~1,780 entities including individuals, households, and organizations)
- **Integration Goal**: Comprehensive Block Island community outreach while avoiding redundant contacts

## 1.2 Data Sources

### VisionAppraisal

Property tax assessment data for Block Island properties.

**Key Fields**:
- PID (Property ID) - Unique parcel identifier
- Fire Number - Building/location identifier (not 1:1 with PIDs)
- MBLU - Map/Block/Lot/Unit property identifier
- Owner Name(s) - Property owner information
- Owner Address - Mailing address for owner
- Property Location - Physical address on Block Island
- Assessment/Appraisal Values - Property valuations

**Entity Types Created**:
- Individual (15.7%)
- AggregateHousehold (40.2%)
- Business (9.1%)
- LegalConstruct (35.1% - trusts, estates, etc.)

### Bloomerang

Donor management system containing contact and transaction data.

**Key Fields** (30 total):
- Core Identity: name, firstName, middleName, lastName, email, accountNumber
- Transaction Data: transactionAmount, transactionDate
- Address Structure: Four complete address sets (primary, home, vacation, work)
- Block Island Specific: fireNumber, biStreet, biPoBox, householdName, isHeadOfHousehold

**Entity Types Created**:
- Individual (standalone and household members)
- AggregateHousehold (with linked individuals)
- NonHuman entities (organizations)

## 1.3 Fire Number / PID Relationship

A critical domain concept for understanding Block Island property data:

- **Fire Number**: Building/location identifier assigned by fire department
- **PID**: Individual parcel identifier in tax system
- **Relationship**: NOT 1:1 - 17 fire numbers map to multiple PIDs
- **Implication**: Multiple PIDs at same Fire Number may be same owner (different parcels) or different owners (condos, subdivisions)

**Same-Location Entities**: Two entities with suffixed fire numbers sharing the same base (e.g., 72J vs 72W) are different owners at the same physical property. Their primary addresses match trivially, so comparison uses secondary addresses instead.

---

# 2. Architecture

## 2.1 Entity Class Hierarchy

All entities inherit from a common Entity base class.

```
Entity (base)
  ├── Individual
  ├── AggregateHousehold
  ├── Business
  └── LegalConstruct
```

### Entity Base Properties

| Property | Type | Description |
|----------|------|-------------|
| locationIdentifier | String | Fire number or PID |
| name | Name class | Entity name (type varies by entity type) |
| contactInfo | ContactInfo | Email, phone, addresses |
| otherInfo | OtherInfo | Non-contact information |
| legacyInfo | LegacyInfo | VisionAppraisal legacy fields |
| source | String | "VisionAppraisal" or "Bloomerang" |

### Name Classes

| Entity Type | Name Class | Key Properties |
|-------------|------------|----------------|
| Individual | IndividualName | firstName, lastName, otherNames, completeName |
| AggregateHousehold | HouseholdName | fullHouseholdName, primaryAlias |
| Business | NonHumanName | primaryAlias, term |
| LegalConstruct | NonHumanName | primaryAlias, term |

### AggregateHousehold Special Properties

- `individuals`: Array of Individual entities belonging to household
- Household members have `householdInformation` linking back to parent

## 2.2 Info Class Hierarchy

Information classes extend a common Info base class.

```
Info (base)
  ├── ContactInfo
  ├── OtherInfo
  │     ├── HouseholdOtherInfo
  │     └── IndividualOtherInfo
  └── LegacyInfo
```

### ContactInfo Properties

| Property | Type | Description |
|----------|------|-------------|
| email | Aliased/SimpleIdentifier | Email address |
| phone | Aliased/SimpleIdentifier | Phone number |
| poBox | Aliased/SimpleIdentifier | PO Box |
| primaryAddress | Address | Primary mailing address |
| secondaryAddress | Array[Address] | Additional addresses |

### OtherInfo Properties

| Property | Type | Description |
|----------|------|-------------|
| fireNumber | SimpleIdentifier | Fire number |
| accountNumber | SimpleIdentifier | Bloomerang account number |
| assessmentValue | SimpleIdentifier | Property assessment value |
| appraisalValue | SimpleIdentifier | Property appraisal value |
| mBLU | ComplexIdentifier | Map/Block/Lot/Unit |

### LegacyInfo Properties (VisionAppraisal only)

Preserves original VisionAppraisal fields for reference:
- ownerName, ownerName2, neighborhood, userCode, date, sourceIndex

## 2.3 Identifier Architecture

### Aliased Classes (Identifier Pattern)

```
Aliased (base)
  ├── SimpleIdentifiers
  │     ├── PID
  │     ├── FireNumber
  │     └── POBox
  └── ComplexIdentifiers
        ├── IndividualName
        ├── HouseholdName
        ├── NonHumanName
        └── Address
```

### AttributedTerm

The fundamental building block for all text values with source tracking:

```javascript
{
    __type: "AttributedTerm",
    term: "John Smith",           // The actual value
    fieldName: "completeName",    // Source field name
    sourceMap: Map                // Source tracking information
}
```

## 2.4 Serialization System

### Recursive Type Preservation

Standard JSON serialization loses class constructor information. BIRAVA2025 uses a custom recursive serialization system that preserves class types via `__type` properties.

**Serialization**: `serializeWithTypes(obj)` - Adds `__type` to all class instances
**Deserialization**: `deserializeWithTypes(jsonString)` - Restores proper class constructors

### CLASS_REGISTRY

Maps class names to constructors for deserialization:

```javascript
CLASS_REGISTRY = {
    'Entity': Entity,
    'Individual': Individual,
    'AggregateHousehold': AggregateHousehold,
    'Business': Business,
    'LegalConstruct': LegalConstruct,
    'AttributedTerm': AttributedTerm,
    'ContactInfo': ContactInfo,
    'Address': Address,
    'IndividualName': IndividualName,
    'HouseholdName': HouseholdName,
    'NonHumanName': NonHumanName,
    // ... additional classes
}
```

**Location**: `scripts/utils/classSerializationUtils.js`

### Dynamic Type Dispatch

For polymorphic deserialization (e.g., addresses that may be Address or Aliased):

```javascript
Info.deserializeByType(data)  // Uses CLASS_REGISTRY to dispatch to correct class
```

## 2.5 Constructor Signatures

### Entity Constructors

All entity classes share a standardized 5-parameter constructor signature:

```javascript
Entity(locationIdentifier, name, propertyLocation = null, ownerAddress = null, accountNumber = null)
```

**Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| locationIdentifier | FireNumber/PID/ComplexIdentifier | Fire Number (preferred), PID (secondary), or ComplexIdentifier (fallback) |
| name | IdentifyingData | Contains IndividualName or HouseholdName |
| propertyLocation | String | Raw address string for property location (VisionAppraisal) or null |
| ownerAddress | String | Raw address string for owner mailing address (VisionAppraisal) or null |
| accountNumber | SimpleIdentifier | Account number (Bloomerang) or null |

**Entity Subclasses** (all inherit same signature):
```javascript
Individual(locationIdentifier, name, propertyLocation, ownerAddress, accountNumber)
AggregateHousehold(locationIdentifier, name, propertyLocation, ownerAddress, accountNumber)
Business(locationIdentifier, name, propertyLocation, ownerAddress, accountNumber)
LegalConstruct(locationIdentifier, name, propertyLocation, ownerAddress, accountNumber)
```

### Info Constructors

```javascript
Info()          // Base class - no parameters
ContactInfo()   // Initializes communication hierarchy structure
OtherInfo()     // Base class for non-contact data
LegacyInfo()    // VisionAppraisal legacy data fields
```

### Identifier Constructors

**AttributedTerm** (foundation for all text values):
```javascript
AttributedTerm(term, source, index, identifier, fieldName = null)
```
- `term`: The actual data value
- `source`: Data source identifier ('VISION_APPRAISAL', 'BLOOMERANG')
- `index`: Record position in source dataset
- `identifier`: Unique record identifier (PID, accountNumber)
- `fieldName`: Optional field name for data lineage

**Simple Identifiers**:
```javascript
SimpleIdentifiers(primaryAlias)   // Base for single-value identifiers
FireNumber(primaryAlias)          // Block Island fire numbers (<3500)
PoBox(primaryAlias)               // PO Box numbers
PID(primaryAlias)                 // VisionAppraisal parcel identifiers
```

**Complex Identifiers**:
```javascript
IndividualName(primaryAlias, title, firstName, otherNames, lastName, suffix)
HouseholdName(primaryAlias, fullHouseholdName)
Address(primaryAlias, streetNumber, streetName, streetType, city, state, zipCode, isBlockIslandAddress, hasFireNumber, fireNumber)
```

### Constructor Call Patterns by Source

**VisionAppraisal Entity Creation**:
```javascript
const individual = new Individual(
    locationIdentifier,
    individualName,
    record.propertyLocation,  // Raw address string
    record.ownerAddress,      // Raw address string
    null                      // No account number
);
```

**Bloomerang Entity Creation**:
```javascript
const individual = new Individual(
    locationIdentifier,
    individualName,
    null,                     // No property location
    null,                     // No owner address
    accountNumberIndicativeData
);
```

**Entity Deserialization**:
```javascript
const individual = new Individual(
    baseEntity.locationIdentifier,
    baseEntity.name,
    null,    // Address processing happens during creation, not deserialization
    null,
    baseEntity.accountNumber
);
```

## 2.6 Database Structures

### Unified Entity Database

Single flat structure containing ALL entities from both sources:

```javascript
unifiedEntityDatabase = {
    metadata: {
        createdAt: "2025-12-14T...",
        totalEntities: 4097,
        sources: {
            visionAppraisal: { count: 2317 },
            bloomerang: { count: 1780 }
        },
        entityTypes: { Individual: 363, AggregateHousehold: 931, ... }
    },
    entities: {
        "visionAppraisal:FireNumber:1510": Entity,
        "bloomerang:12345:SimpleIdentifiers:...:head": Entity,
        // ... all entities by key
    }
}
```

**Access Pattern**: `unifiedEntityDatabase.entities[key]`

### Entity Key Formats

| Source | Format | Example |
|--------|--------|---------|
| VisionAppraisal | `visionAppraisal:FireNumber:<number>` | `visionAppraisal:FireNumber:1510` |
| Bloomerang | `bloomerang:<accountNumber>:<locationType>:<locationValue>:<headStatus>` | `bloomerang:12345:SimpleIdentifiers:PO Box 123:head` |

### EntityGroup Database

Collection of matched entity groups:

```javascript
entityGroupDatabase = {
    metadata: { totalGroups: 1972, ... },
    groups: {
        0: EntityGroup,
        1: EntityGroup,
        // ... groups keyed by index
    }
}
```

**CRITICAL**: `groups` is an Object (hash map), NOT an Array. Use `Object.values(db.groups)` to iterate.

### EntityGroup Structure

```javascript
EntityGroup = {
    index: number,                    // Group index
    foundingMemberKey: string,        // Key of founding entity
    memberKeys: string[],             // Keys of all members (including founder)
    nearMissKeys: string[],           // Keys of near-miss entities
    consensusEntity: Entity,          // Synthesized best data from members
    hasBloomerangMember: boolean,     // True if any member from Bloomerang
    isProspect: boolean,              // True if NO Bloomerang members (new prospect)
    isExistingDonor: boolean          // True if HAS Bloomerang members
}
```

---

# 3. Core Algorithms

## 3.1 Six-Phase EntityGroup Construction

EntityGroups are built in 6 phases, processing VisionAppraisal first, then Bloomerang:

| Phase | Source | Entity Types |
|-------|--------|--------------|
| 1 | VisionAppraisal | AggregateHousehold |
| 2 | VisionAppraisal | Individual |
| 3 | VisionAppraisal | Business, LegalConstruct, Other |
| 4 | Bloomerang | AggregateHousehold |
| 5 | Bloomerang | Individual |
| 6 | Bloomerang | Business, LegalConstruct, Other |

**Rationale**: VisionAppraisal first because property data is the authoritative source for Block Island addresses.

**Location**: `scripts/matching/entityGroupBuilder.js`

## 3.2 Nine-Step Group Building Algorithm

Within each phase, entities are processed using a 9-step algorithm:

| Step | Action |
|------|--------|
| 0 | Remove natural matches excluded with founder (founder always wins) |
| 1 | Find natural matches via algorithmic comparison |
| 2 | Resolve exclusions among natural matches |
| 3 | Generate founder forced matches from override rules |
| 3.5 | Check for contradictory founder force-match + exclusion |
| 4 | Resolve exclusions among founder forced matches |
| 5 | Check founder forced vs natural matches (founder forced wins) |
| 6 | Generate forced matches from natural matches |
| 7 | Check forced-from-naturals vs founder forced |
| 7.5 | Check forced-from-naturals for founder exclusions |
| 8 | Resolve exclusions among forced-from-naturals |
| 9 | Household pulling - pull remaining household members into matched groups |

**Final Group**: Founder + surviving natural matches + founder forced + surviving forced-from-naturals

## 3.3 Match Override System

Google Sheets-based rules to correct algorithmic matching errors.

### Rule Types

| Type | Purpose | Model |
|------|---------|-------|
| FORCE_MATCH | Ensure entities end up in same group | Anchor/Dependent |
| FORCE_EXCLUDE | Prevent entities from being in same group | Defective/Other |
| MUTUAL | Shorthand for multiple related keys | `key1::^::key2::^::key3` |

### Google Sheets

| Sheet | Sheet ID |
|-------|----------|
| FORCE_MATCH | `1WWq8rgVyIKgf3qhVpl5mBiVQllljum0JVm2e_h-WZo8` |
| FORCE_EXCLUDE | `1nZIqcBa3LW1DcUKXVr1jNCGsZqq6JLTaxJSpXSZyulk` |

### Priority Hierarchy

| Comparison | Winner |
|------------|--------|
| Founder vs Any entity | Founder ALWAYS wins |
| Founder-forced vs Natural match | Founder-forced wins |
| Same tier conflicts | OnConflict rules apply |

### OnConflict Values

| Value | Behavior |
|-------|----------|
| DEFECTIVE_YIELDS | Defective entity blocked; other joins |
| OTHER_YIELDS | Other entity blocked; defective joins |
| USE_SIMILARITY | Higher similarity score wins |

**Location**: `scripts/matching/matchOverrideManager.js`

## 3.4 Comparison Architecture

### compareTo Interface

Every application class implements a `compareTo` method:

```javascript
entity.compareTo(otherEntity, options)  // Returns comparison result
```

### Multiple Entry Points

Entity comparisons flow through TWO separate code paths:

1. `entity.compareTo()` → `entityWeightedComparison` (in utils.js)
2. `universalCompareTo()` → `compareIndividualToEntityDirect` (in universalEntityMatcher.js)

**CRITICAL**: Changes affecting comparison logic may need to be applied to BOTH paths.

### Weighted Comparison Calculators

**Location**: `scripts/utils.js` COMPARISON_CALCULATOR_REGISTRY

| Calculator | Purpose |
|------------|---------|
| defaultWeightedComparison | General comparison |
| addressWeightedComparison | Address comparison |
| contactInfoWeightedComparison | ContactInfo comparison |
| entityWeightedComparison | Full entity comparison |

### Same-Location Entity Handling

**Problem**: VisionAppraisal entities at the same physical location (e.g., condos at 72 West Side Road with fire numbers 72A, 72B, 72C) were incorrectly grouped together because their primary addresses match.

**Solution**: When `areSameLocationEntities(entity1, entity2)` returns true:
- Use `compareSecondaryAddressesOnly()` instead of full contactInfo comparison
- Check is performed at TOP of `universalCompareTo()` BEFORE routing to specialized functions
- Applies to ALL entity type combinations (Individual, AggregateHousehold, etc.)

**Detection Logic**: Two entities are "same-location" when:
- Both have fire numbers
- Fire numbers share the same base but have different full values (e.g., 72J vs 72W)

**Impact**: Entities at same location must match by name AND secondary addresses, not just primary address

## 3.5 Name Matching

### Multi-Algorithm Composite Scoring

| Algorithm | Weight | Purpose |
|-----------|--------|---------|
| Custom Weighted Levenshtein | 80% | Primary - vowel/consonant weighting |
| Jaro-Winkler | 15% | Name-specific matching |
| Metaphone | 5% | Phonetic similarity |

### Component Weights (Individual Names)

| Component | Weight |
|-----------|--------|
| lastName | 50% |
| firstName | 40% |
| otherNames | 10% |

### Business Entity Filtering

**Tier 1**: Complete exclusion of institutional entities (904 terms)
**Tier 2**: Strip business suffixes (TRUST, LLC, CORP, etc.)

**Data Source**: `/servers/Results/BusinessTermsMaster - *.csv`

**Location**: `scripts/nameMatching/businessEntityFilter.js`

## 3.6 Address Processing

### Block Island Logic

**Rule 1 - VisionAppraisal Auto-Completion**:
If source is VisionAppraisal and city/state missing → auto-complete with Block Island, RI, 02807

**Rule 2 - Street Name Matching**:
If city missing but street name matches Block Island streets database → auto-complete

**Street Database**: 217 Block Island streets (Google Drive ID: `1lsrd0alv9O01M_qlsiym3cB0TRIdgXI9`)

### Address Class Properties

| Property | Description |
|----------|-------------|
| originalAddress | Full unparsed address string |
| streetNumber | Parsed street number |
| streetName | Parsed street name |
| streetType | St, Ave, Rd, etc. |
| city | City (normalized for Block Island) |
| state | State |
| zipCode | ZIP code |
| isBlockIslandAddress | Boolean flag |

**Location**: `scripts/address/addressProcessing.js`

---

# 4. Data Specifications

## 4.1 Entity Key Formats

### VisionAppraisal Keys

```
visionAppraisal:FireNumber:<fire_number>
```

Example: `visionAppraisal:FireNumber:1510`

### Bloomerang Keys

```
bloomerang:<accountNumber>:<locationType>:<locationValue>:<headStatus>
```

Example: `bloomerang:12345:SimpleIdentifiers:PO Box 123:head`

**Head Status Values**: `head` (head of household or standalone) or `member` (household member)

## 4.2 CSV Export Format

**Files**: `prospects.csv`, `donors.csv`

**Total Columns**: 54

### Row Types per EntityGroup

| RowType | Description |
|---------|-------------|
| consensus | Synthesized best information |
| founding | The founding member entity |
| member | Other member entities |
| nearmiss | Near miss entities (optional) |

### Column Sections

1. **Identification & Mail Merge** (10 cols): RowType, GroupIndex, Key, MailName, MailAddr1-2, MailCity, MailState, MailZip, Email
2. **Additional Contact** (6 cols): Phone, POBox, SecAddr1-3, SecAddrMore
3. **Entity Metadata** (2 cols): EntityType, Source
4. **Name Alternatives** (12 cols): Homonyms, Synonyms, Candidates
5. **Address Alternatives** (12 cols): Homonyms, Synonyms, Candidates
6. **Email Alternatives** (12 cols): Homonyms, Synonyms, Candidates

**Full Specification**: See `reference_csvExportSpecification.md`

## 4.3 Lightweight JSON Export

Self-contained JSON with embedded entity data for Google Apps Script consumption.

**Version**: 2.0
**Purpose**: External consumption without needing full database

**Location**: `scripts/export/lightweightExporter.js`

## 4.4 Google Drive File IDs

### Production Files

| File | ID |
|------|-----|
| Unified Database | `1Z2V4Pi8KoxUR9B47KffEQI6gCs7rOS2Y` |
| EntityGroup Database | `120z4Q_JVWjSij2BOyv93s_XnJ-SLqR1N` |
| EntityGroup Reference | `10LPpCPBWkc8ZQDqCake-0QenVWjCRpdd` |

### Test Files

| File | ID |
|------|-----|
| Unified Database (test) | `1a1pTRw7AXK_QPU26AsGPcb3UG2BskP8c` |

### Configuration Files

| File | ID |
|------|-----|
| PID Files Folder | `1qgnE1FW3F6UG7YS4vfGBm9KzX8TDuBCl` |
| Block Island Streets | `1lsrd0alv9O01M_qlsiym3cB0TRIdgXI9` |

---

# 5. Production Operations

## 5.1 Phase A: Rebuild from Source

Complete rebuild from fresh VisionAppraisal and Bloomerang data.

### Step A0: Prepare PID List

**Buttons**: First → Second → Third
**Action**: Prepares list of PIDs to download from VisionAppraisal website

### Step A1: Download PIDs

**Button**: Fourth Button (Button 4)
**Action**: Scrapes VisionAppraisal website for each PID, saves JSON files to Google Drive

**Note**: "Go Again" button retries failed PIDs. Multiple runs typically needed.

### Step A2: Analyze/Clean Duplicates

**Button**: "Analyze PID Duplicates" (safe analysis)
**Button**: "Run PID Deduplication" (moves older duplicates)

### Step A3: Refresh Local PID Data

**Button**: "Refresh Local PID Data from Google Drive"
**Function**: `generateFreshEveryThingWithPid()`
**Output**: Updates `servers/Results/everyThingWithPid.json`

### Step A4: Create VisionAppraisal Entities

**Step A4a**: "Process & Save VisionAppraisal Data"
**Step A4b**: "Create Entities from Processed Data"
**Output**: Entities in `window.workingLoadedEntities.visionAppraisal.entities`

### Step A5: Prepare Bloomerang Data

**Action**: Export `all data.csv` from Bloomerang application
**Button**: "Process Bloomerang CSV"
**Output**: Bloomerang entities ready for unified database

### Step A6: Load All Entities

**Button**: "Load All Entities Into Memory"
**Output**: `window.unifiedEntityDatabase.entities`

**Optional**: "Record Unified Database" saves to Google Drive

## 5.2 Phase B: Work with Saved Data

Load previously saved databases (skip Phase A).

### Step B1: Load Saved Unified Database

**Button**: "Load Unified Database"
**Input**: Google Drive File ID
**Output**: `window.unifiedEntityDatabase.entities`

### Step B2: Build EntityGroup Database

**Button**: "Build New" in EntityGroup Browser
**Checkbox**: "Load override rules" - loads match override rules from Google Sheets
**Output**: `window.entityGroupDatabase.groups`

### Step B3: Generate Reports

**Button**: "Export CSV" - CSV export per specification
**Button**: "Export Lightweight JSON" - Self-contained JSON for external use
**Button**: "Assessment Value Report" - Property value analysis

## 5.3 Verification Commands

### After A3 - Local file has assessment values:
```bash
head -c 500 servers/Results/everyThingWithPid.json
```

### After A6/B1 - Unified Database:
```javascript
Object.keys(window.unifiedEntityDatabase?.entities || {}).length
```

### After B2 - EntityGroup Database:
```javascript
Object.keys(window.entityGroupDatabase?.groups || {}).length
```

### Match Override Rules loaded:
```javascript
console.log('FORCE_MATCH:', window.matchOverrideManager?.forceMatchRules?.size || 0);
console.log('FORCE_EXCLUDE:', window.matchOverrideManager?.forceExcludeRules?.size || 0);
```

## 5.4 Baseline Regression Test

### Quick Tests (1-3)

| Test | Description | Expected |
|------|-------------|----------|
| 1 | Server starts | http://127.0.0.1:1337/ loads |
| 2 | UI structure | Phase A/B sections visible |
| 3 | Load unified DB | 4099 entities loaded |

### Standard Tests (4-7)

| Test | Description | Expected |
|------|-------------|----------|
| 4 | EntityGroup build | Sample mode completes |
| 5 | Unified Entity Browser | Displays entities |
| 6 | EntityGroup Browser | Displays groups |
| 7 | Match override verification | 5/53/2 rules loaded |

### Full Tests (8-12)

| Test | Description | Expected |
|------|-------------|----------|
| 8 | Unified DB save/load | Round-trip works |
| 9 | EntityGroup save/load | Round-trip works |
| 10 | CSV export | File generated |
| 11 | Lightweight export | JSON generated |
| 12 | Assessment report | Report displays |

**Full Script**: See `reference_baselineRegressionTestScript.md`

---

# 6. Development Principles

## 6.1 Incremental Testing Protocol

**NEVER MAKE MULTIPLE CHANGES WITHOUT TESTING EACH STEP**

### Required Workflow

1. Make ONE small change (single function, single file)
2. Test that change immediately
3. Verify functionality works
4. Only then proceed to next change

### Testing Execution

- All testing performed by user in browser console
- Claude provides complete single-command test sequences
- User executes tests and reports results

### Error Response

1. Immediately stop further development
2. Analyze the specific error
3. Fix with minimal, targeted change
4. Test the fix before continuing

## 6.2 Root Cause Debugging Rule

**NEVER APPLY EXPEDIENT FIXES THAT MASK ERRORS**

### Prohibited Behaviors

- Adding guards like `if (typeof X !== 'undefined')` to skip broken functionality
- Making code silently skip operations that should work
- Suppressing errors without understanding their cause
- Making changes based on guesses

### Mandatory Process

1. **Diagnose**: Add diagnostic console.log statements
2. **Verify**: Run code and observe diagnostic output
3. **Analyze**: Study output to identify TRUE root cause
4. **Fix**: Make targeted changes addressing root cause
5. **Confirm**: Verify fix resolves issue without masking problems

### Self-Check Before Any Fix

1. Do I UNDERSTAND why this error is occurring?
2. Will this fix ADDRESS the root cause or HIDE the symptom?
3. Have I VERIFIED my hypothesis with diagnostic output?
4. Would this code WORK CORRECTLY if underlying system were healthy?

**If any answer is NO**: STOP and add more diagnostics.

## 6.3 Code Path Verification

### Multiple Entry Points Exist

Always verify which code path is executing before making changes. Use diagnostic console.logs.

**Example**: Entity comparisons have TWO paths (entityWeightedComparison AND compareIndividualToEntityDirect). Changes may need to apply to BOTH.

## 6.4 Key Preservation Principle

**Architectural Rule**: Database keys must TRAVEL WITH entities through the entire data flow. Never regenerate keys from entity properties.

**Problem This Solves**: Entity lookup fails when code regenerates keys from properties instead of preserving actual database keys.

**Example Failure**:
- Entity stored as: `visionAppraisal:FireNumber:1510`
- Code regenerates: `visionAppraisal:PID:203` (based on entity.pid property)
- Lookup fails because keys don't match

**Correct Pattern**:
```javascript
// BAD: Regenerating key
const key = generateKeyFromEntity(entity);  // May differ from database key

// GOOD: Preserving actual key
const [actualKey, entity] = getAllEntitiesWithKeys()[index];  // Use actual key
```

**Implementation**: `getAllEntitiesWithKeys()` returns `[key, entity]` pairs to preserve actual database keys through all operations.

## 6.5 Critical Lessons Learned

| Lesson | Detail |
|--------|--------|
| Template literals | Do NOT use `${...}` inside `<script>` blocks |
| OAuth expiration | Tokens expire after 1 hour - save promptly |
| Function returns | Always assign return values |
| Saved vs memory | Rebuild EntityGroup database to test code changes |
| Key generation | NEVER generate keys twice - use existing keys |
| EntityGroup iteration | `groups` is Object, use `Object.values()` |
| Same-location check | Must happen BEFORE entity type routing |
| Cross-references | Use actual database keys, not regenerated keys |

---

# 7. Google Apps Script Integration

## 7.1 Overview

EntityGroup data can be looked up from within Google Sheets using Google Apps Script. This enables investigation of specific entities without running the full browser application.

## 7.2 50MB File Limit Solution

Google Apps Script's `getBlob().getDataAsString()` has a **50 MB file size limit**. The unified entity database (~91 MB) exceeds this.

**Solution**: 3-way database split:

| File | Contents | Typical Size |
|------|----------|--------------|
| VisionAppraisal Part 1 | FireNumber < 800 | ~25 MB |
| VisionAppraisal Part 2 | FireNumber >= 800 | ~25 MB |
| Bloomerang | All Bloomerang entities | ~40 MB |

**Browser Button**: "Split Database for Apps Script" creates these files

## 7.3 Apps Script Functions

**File**: `googleAppsScripts/EntityGroupLookup.gs`

| Menu Function | Description |
|---------------|-------------|
| Initialize All Databases | Loads all 4 files, builds lookup index |
| Lookup Selected Key | Looks up entity in selected cell |
| Lookup All Keys (Column A) | Batch processes all keys |
| Write CSV Headers | Writes 54 column headers |

**Custom Function**:
```
=LOOKUP_ENTITY_GROUP("visionAppraisal:FireNumber:123")
```

Returns all 54-column CSV rows for groups containing that entity.

---

# 8. Critical Files Reference

## 8.1 Tier 1: Core Infrastructure

Breaking these = System Unusable

| File | Purpose |
|------|---------|
| `index.html` | Main UI, all buttons, script loading |
| `scripts/baseCode.js` | VA scraping (Buttons 1-4) |
| `scripts/googleLinks.js` | Google API authentication |
| `scripts/fileLogistics.js` | File I/O operations |

## 8.2 Tier 2: Entity System

Breaking these = No Entity Processing

| File | Purpose |
|------|---------|
| `scripts/objectStructure/entityClasses.js` | Entity, Individual, AggregateHousehold, Business, LegalConstruct |
| `scripts/objectStructure/contactInfo.js` | ContactInfo, Address classes |
| `scripts/objectStructure/aliasClasses.js` | IndividualName, AttributedTerm |
| `scripts/objectStructure/householdInformation.js` | HouseholdInformation class |
| `scripts/objectStructure/entityGroup.js` | EntityGroup, EntityGroupDatabase |
| `scripts/utils/classSerializationUtils.js` | Serialization/deserialization |

## 8.3 Tier 3: Data Processing

Breaking these = Can't Process Source Data

| File | Purpose |
|------|---------|
| `scripts/dataSources/visionAppraisal.js` | VA data loading |
| `scripts/dataSources/processAllVisionAppraisalRecords.js` | Entity creation from VA |
| `scripts/dataSources/visionAppraisalNameParser.js` | Name parsing |
| `scripts/bloomerang.js` | Bloomerang CSV processing |
| `verification.js` | `generateFreshEveryThingWithPid()` |

## 8.4 Tier 4: Matching & Grouping

Breaking these = Can't Build EntityGroups

| File | Purpose |
|------|---------|
| `scripts/matching/entityGroupBuilder.js` | 6-phase, 9-step algorithm |
| `scripts/matching/matchOverrideManager.js` | Override rules from Google Sheets |
| `scripts/matching/universalEntityMatcher.js` | Entity comparison |
| `scripts/utils.js` | Comparison calculators |

## 8.5 Tier 5: Browsers & Export

Breaking these = Can't View/Export Data

| File | Purpose |
|------|---------|
| `scripts/unifiedEntityBrowser.js` | Unified Entity Browser |
| `scripts/entityGroupBrowser.js` | EntityGroup Browser + CSV Reports |
| `scripts/entityRenderer.js` | Entity details popup windows |
| `scripts/export/lightweightExporter.js` | Lightweight JSON export |
| `scripts/dataSourceManager.js` | Data source management |

---

# Appendix: File Locations

## Core Scripts

| File | Purpose |
|------|---------|
| `scripts/objectStructure/entityClasses.js` | Entity class definitions |
| `scripts/objectStructure/aliasClasses.js` | Identifier classes |
| `scripts/objectStructure/contactInfo.js` | ContactInfo, OtherInfo, LegacyInfo |
| `scripts/objectStructure/entityGroup.js` | EntityGroup, EntityGroupDatabase |
| `scripts/matching/entityGroupBuilder.js` | 6-phase construction |
| `scripts/matching/matchOverrideManager.js` | Override rules |
| `scripts/matching/universalEntityMatcher.js` | Entity comparison |
| `scripts/utils/classSerializationUtils.js` | Serialization |
| `scripts/address/addressProcessing.js` | Address parsing |
| `scripts/entityGroupBrowser.js` | Browser UI + exports |
| `scripts/unifiedEntityBrowser.js` | Entity browser |

## Configuration

| File | Purpose |
|------|---------|
| `scripts/baseCode.js` | Parameters including PID folder ID |
| `index.html` | Main UI with Phase A/B structure |

## Server

| Command | Action |
|---------|--------|
| `cd BIRAVA2025 && node servers/server.js` | Start server |
| URL | `http://127.0.0.1:1337/` |

---

**Document Version**: 1.0
**Created**: December 26, 2025
