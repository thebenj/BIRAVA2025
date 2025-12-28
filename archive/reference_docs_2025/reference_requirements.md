# Requirements Reference Document

**Purpose**: Preserve critical user requirements for VisionAppraisal ↔ Bloomerang entity data audit project

**Status**: ✅ **ALL 23 REQUIREMENTS COMPLETE** - Comprehensive entity architecture requirements documented with architectural clarifications resolved

---

## REQUIREMENT 1: Add otherInfo Property to Entity Class

**Add otherInfo Property to Entity Class**
- **Property**: Add `otherInfo` property to entity class (alongside existing `locationIdentifier` and `contactInfo`)
- **Subclasses**: Create two subclasses:
  - `houseHoldOtherInfo`
  - `individualOtherInfo`
- **Purpose**: Capture information that is neither location nor contactInfo
- **Rationale**: Different types of otherInformation may be needed for individuals vs households
- **Implementation Impact**:
  - Update entity class and all subclasses
  - Modify serialization/deserialization processes to include new property
  - Functions similar to contactInfo architecture
- **Documentation**: Code comments must state purpose as capturing non-location, non-contactInfo data

---

## REQUIREMENT 2: Update ContactInfo and LocationIdentifier to Use Proper Identifier Classes

**ContactInfo Property Changes**:
- **email**: Should hold aliased class (simpleIdentifier or complexIdentifier)
- **phone**: Should hold aliased class (simpleIdentifier or complexIdentifier)
- **poBox**: Should hold aliased class (simpleIdentifier or complexIdentifier)
- **primaryAddress**: Should hold aliased class (simpleIdentifier or complexIdentifier)
- **secondaryAddress**: Should hold aliased class (simpleIdentifier or complexIdentifier)

**LocationIdentifier Property Changes**:
- **Current**: Holds an "Identifying data object"
- **Required**: Should hold proper identifier objects:
  - **FireNumber**: simpleIdentifier object
  - **PIDs**: simpleIdentifier object
  - **Name**: complexIdentifier object

**Implementation Impact**:
- Modify ContactInfo class to use proper identifier classes instead of current structure
- Modify LocationIdentifier class to use simpleIdentifier/complexIdentifier objects
- Update serialization/deserialization for both classes
- Ensure consistency with existing identifier class architecture

---

## REQUIREMENT 3: Establish Proper Relationship Between AttributedTerm Classes and Identifier Classes

**Current AttributedTerm Subclasses**:
- FireNumberTerm
- AccountNumberTerm
- EmailTerm

**Current Identifier Subclasses**:
- **SimpleIdentifiers**: PID, FireNumber, POBox
- **ComplexIdentifiers**: IndividualName, HouseHoldName

**Required Relationship Structure**:
- **primaryAlias**: Should be AttributedTerm type (e.g., FireNumber SimpleIdentifier should have FireNumberTerm as primaryAlias)
- **alternatives property**: Alias object arrays should contain AttributedTerm objects (e.g., FireNumber alternatives should contain FireNumberTerm objects)

**Specific Examples**:
- FireNumber SimpleIdentifier → primaryAlias = FireNumberTerm, alternatives arrays = FireNumberTerm objects
- PID SimpleIdentifier → primaryAlias = [appropriate AttributedTerm], alternatives = [AttributedTerm objects]
- IndividualName ComplexIdentifier → primaryAlias = [appropriate AttributedTerm], alternatives = [AttributedTerm objects]

**Current Architecture Issues to Investigate**:
- **locationIdentifier property**: Currently may be wrongly holding AttributedTerm objects instead of SimpleIdentifier/ComplexIdentifier
- **ContactInfo properties**: Should hold SimpleIdentifiers/ComplexIdentifiers (not AttributedTerms)
- **otherInfo properties**: Should hold SimpleIdentifiers/ComplexIdentifiers (not AttributedTerms)

**Verification Required**: Check if current code incorrectly places AttributedTerm objects directly in entity properties instead of using proper Identifier class hierarchy

---


---

## REQUIREMENT 4: Add fieldName Property to Aliased Structure

**Property Addition**:
- **Add fieldName property** to the Aliased structure
- **Purpose**: Specify the entity property name where the aliased term's data will be stored

**fieldName Definition**:
- **Contains**: The name of the field that the term will populate in the entity structure
- **Example**: An aliased object holding data for the email property of contactInfo will have `fieldName = "email"`
- **Source**: Derived from the target entity property name, not the source data label

**Important Distinction**:
- **Source data label**: Field name in original data source (may vary)
- **fieldName property**: Target property name in entity structure (consistent)
- **Relationship**: Source labels often match fieldName but may differ
- **Priority**: fieldName determined by entity architecture, not source field naming

**Implementation Impact**:
- Modify Aliased class to include fieldName property
- Update all aliased term creation to specify appropriate fieldName
- Ensure serialization/deserialization includes fieldName property
- Use fieldName for entity property mapping during data processing

---

## REQUIREMENT 5: VisionAppraisal LocationIdentifier Simplified Rule

**LocationIdentifier Determination**:
- **Rule**: The locationIdentifier for entities created from VisionAppraisal data will **always be the PID** for the record that the entity's data came from
- **Implementation**: Every VisionAppraisal-sourced entity uses PID SimpleIdentifier as locationIdentifier

**Major Rule Change**:
- **Previous Rule**: Hierarchical determination based on Fire Number analysis (single PID vs multi-PID, same owner vs different owner)
- **New Rule**: Simple, consistent PID-based locationIdentifier for all VisionAppraisal entities
- **Rationale**: Eliminates complexity and processing dependencies

**Process Implications Eliminated**:
- **No longer needed**: Owner comparison analysis for multi-PID Fire Numbers
- **No longer needed**: "Same owner" vs "different owner" determination logic
- **No longer needed**: Fire Number → PID relationship analysis before entity processing
- **Roadblock removed**: Matching algorithms no longer prerequisite for VisionAppraisal entity creation

**Plan Impact**:
- **Major revision required**: Current plan in claude.md based on hierarchical Fire Number analysis approach
- **Simplified workflow**: VisionAppraisal entity processing can proceed independently of matching systems
- **Processing order**: VisionAppraisal entities can be created before developing matching algorithms

**Implementation Requirements**:
- All VisionAppraisal entities use PID SimpleIdentifier for locationIdentifier
- Fire Number data (when present) stored in appropriate entity property (not locationIdentifier)
- Update entity creation logic to use consistent PID-based approach

---

## REQUIREMENT 6: Rename HouseholdName fullName Property

**Property Name Change**:
- **Current**: HouseholdName class has `fullName` property
- **Required**: Change `fullName` to `fullHouseholdName`
- **Scope**: Update HouseholdName class definition

**Code Reference Updates**:
- **Requirement**: Update ALL code that references Household entity's fullName property
- **Search scope**: Any code accessing HouseholdName.fullName must be updated to HouseholdName.fullHouseholdName
- **Consistency**: Ensure all references use new property name

**Implementation Impact**:
- Modify HouseholdName class property definition
- Update all code referencing fullName on Household entities
- Update serialization/deserialization for HouseholdName objects
- Verify no broken references remain after change

---

## REQUIREMENT 7: Verify/Fix Bloomerang Middle Name Preservation

**Issue Context**:
- **Recent Report Claim**: Bloomerang "Middle Name" data not being preserved
- **Expected Behavior**: Bloomerang "Middle Name" should be preserved in `otherNames` property of IndividualName ComplexIdentifier
- **User Assessment**: Report analysis may be incorrect

**Verification Required**:
- **Check Current Implementation**: Determine if Bloomerang Middle Name data IS actually being stored in IndividualName.otherNames
- **Analysis Options**:
  - **If NOT happening**: Code must be fixed to properly store Middle Name in otherNames
  - **If already happening**: Report analysis was wrong, no code changes required

**Implementation Scope**:
- Examine current Bloomerang processing code
- Verify IndividualName ComplexIdentifier creation logic
- Confirm otherNames property population from Middle Name field
- Update code only if Middle Name preservation is actually broken

**Data Flow Verification**:
- **Source**: Bloomerang CSV "Middle Name" field
- **Target**: IndividualName ComplexIdentifier otherNames property
- **Requirement**: Ensure complete data preservation pathway exists

---

## REQUIREMENT 8: Specify fieldName Properties for Existing Preserved Bloomerang Fields

**Context**:
- **Six Bloomerang fields** are already being preserved in entities
- **Need**: Specify the fieldName property for AttributedTerm class for each field
- **Implementation**: Update existing code to include proper fieldName values

**fieldName Specifications**:
1. **Name** → fieldName = `"completeName"`
2. **First Name** → fieldName = `"firstName"`
3. **Last Name** → fieldName = `"lastName"`
4. **Account Number** → fieldName = `"accountNumber"`
5. **Fire Number** → fieldName = `"fireNumber"`
6. **Household Name** → fieldName = `"fullHouseholdName"`

**Implementation Requirements**:
- Update AttributedTerm creation for these 6 fields to include specified fieldName values
- Ensure fieldName property is set correctly during entity processing
- Verify fieldName consistency with target entity property names
- Apply fieldName specifications to existing preserved field processing logic

**Note**: This requirement works in conjunction with Requirement 4 (Add fieldName Property to Aliased Structure) to specify exact fieldName values for currently preserved fields.

---

## REQUIREMENT 9: Specify Storage and fieldName for Missing Preserved Bloomerang Fields

**Context**:
- **Bloomerang fields** identified as not currently preserved in entity objects
- **Need**: Specify entity storage location and AttributedTerm fieldName property for each

**Field Specifications**:

1. **"Primary Email Address"**
   - **Entity Storage**: ContactInfo object → email property
   - **Identifier Type**: SimpleIdentifier
   - **AttributedTerm fieldName**: `"email"`

2. **"First Transaction Amount"**
   - **Entity Storage**: otherInfo object → firstTransactionAmount property
   - **Identifier Type**: SimpleIdentifier
   - **AttributedTerm fieldName**: `"firstTransactionAmount"`

3. **"First Transaction Date"**
   - **Entity Storage**: otherInfo object → firstTransactionDate property
   - **Identifier Type**: SimpleIdentifier
   - **AttributedTerm fieldName**: `"firstTransactionDate"`

4. **"Is in a Household"**
   - **Entity Storage**: otherInfo object → inAHousehold property
   - **Identifier Type**: SimpleIdentifier
   - **AttributedTerm fieldName**: `"inAHousehold"`

5. **"Is in a Head of Household"**
   - **Entity Storage**: otherInfo object → householdHead property
   - **Identifier Type**: SimpleIdentifier
   - **AttributedTerm fieldName**: `"householdHead"`

**Implementation Requirements**:
- Add code to preserve these 5 Bloomerang fields in specified entity locations
- Create AttributedTerm objects with specified fieldName values
- Ensure ContactInfo.email and otherInfo properties are properly populated
- Update entity processing to handle these previously missing fields

---

## REQUIREMENT 10: Develop Address Parsing Algorithm for Multiple Data Sources

**Objective**:
- **Code and test** an algorithm to parse address data from multiple sources into ComplexIdentifier subcomponents
- **Research**: Consult state-of-the-art address parsing methodologies from external sources

**Source Fields to Parse**:

**Bloomerang Address Fields**:
- "Primary Street/City/State/ZIP"
- "Home Street/City/State/ZIP"
- "Vacation Street/City/State/ZIP"
- "Work Street/City/State/ZIP"

**VisionAppraisal Address Fields**:
- "ownerAddress"
- "propertyLocation"

**Parsing Requirements**:
- **Output**: ComplexIdentifier objects holding address subcomponents
- **Basic Subcomponents**: Street, City, State, ZIP
- **Advanced Parsing**: Consider parsing "Street" into further subcomponents (street number, name, unit, etc.)
- **Research Component**: Investigate current best practices for address parsing algorithms

**Implementation Scope**:
- Create comprehensive address parsing algorithm
- Handle multiple address formats from different data sources
- Test algorithm with real Bloomerang and VisionAppraisal address data
- Ensure ComplexIdentifier structure supports all parsed subcomponents
- Document parsing methodology and accuracy results

**Technical Considerations**:
- Address format variations across data sources
- Block Island specific address patterns
- Street address subordinate data extraction (unit numbers, apartment designations, etc.)
- State-of-the-art parsing techniques research and implementation

---

## REQUIREMENT 11: BI PO Box Processing and Full Address Generation

**BI PO Box SimpleIdentifier**:
- **Data Source**: Bloomerang "BI PO Box" field
- **Storage**: SimpleIdentifier structure
- **AttributedTerm fieldName**: `"poBox"`
- **Entity Reference**: ContactInfo.poBox property points to this SimpleIdentifier

**Full PO Box Address Generation**:
- **Check Requirement**: Code must verify if a complete PO Box-based address already exists
- **Generation Logic**: If no full PO Box address exists, create one using format:
  - **Format**: `"PO Box X, New Shoreham, RI 02807"`
  - **Variable**: X = value from "BI PO Box" field
- **Address Processing**: Generated PO Box address must be parsed as a standard address using the address parsing algorithm

**Implementation Requirements**:
- Store "BI PO Box" data in SimpleIdentifier with proper fieldName
- Implement logic to detect existing full PO Box addresses
- Generate standardized PO Box address when none exists
- Apply address parsing algorithm to generated PO Box addresses
- Ensure ContactInfo.poBox property correctly references the SimpleIdentifier

**Integration Notes**:
- Works with Requirement 10 (address parsing algorithm) for processing generated addresses
- Follows SimpleIdentifier pattern established in other requirements
- Ensures consistent Block Island PO Box address format

---

## REQUIREMENT 12: Restructure secondaryAddress Property to Array

**Property Structure Change**:
- **Current**: secondaryAddress property holds single address item
- **Required**: Change secondaryAddress to be an array of address items
- **Type**: Array structure to support multiple secondary addresses

**Code Update Requirements**:
- **Modify Property Definition**: Update secondaryAddress property definition to array type
- **Update All References**: Edit ALL code that references secondaryAddress property to handle array structure
- **Array Operations**: Ensure code properly handles array access, iteration, and modification
- **Backward Compatibility**: Consider migration of existing single address data to array format

**Implementation Impact**:
- Update ContactInfo class definition for secondaryAddress property
- Modify entity processing code to populate array instead of single value
- Update serialization/deserialization to handle array structure
- Review and update all functions that read from or write to secondaryAddress
- Ensure proper array handling in address parsing and processing logic

**Technical Considerations**:
- Array initialization and validation
- Proper iteration patterns for multiple secondary addresses
- Consistent array handling across all secondary address operations

---

## REQUIREMENT 13: Update All Code Comments for Post-Requirements State

**Comment Review Requirement**:
- **Scope**: ALL code comments throughout the codebase
- **Objective**: Ensure comments accurately document the code state AFTER all requirements are fulfilled
- **Critical Check**: Verify comments do not contradict the post-requirements code implementation

**Review Criteria**:
- **Accuracy**: Comments must reflect the actual code behavior after requirements implementation
- **Consistency**: Comments must align with new architecture (otherInfo, fieldName properties, array structures, etc.)
- **Completeness**: Comments should document new functionality introduced by requirements
- **Contradiction Check**: Remove or update any comments that contradict the new implementation

**Specific Areas for Comment Updates**:
- otherInfo property documentation (Requirement 1)
- ContactInfo/LocationIdentifier identifier class usage (Requirement 2)
- AttributedTerm relationships and fieldName properties (Requirements 3, 4, 8)
- VisionAppraisal PID-based locationIdentifier logic (Requirement 5)
- HouseholdName fullHouseholdName property (Requirement 6)
- Address parsing algorithm documentation (Requirement 10)
- secondaryAddress array structure (Requirement 12)

**Implementation Process**:
- Systematic review of all source files
- Update comments to match post-implementation state
- Remove outdated or contradictory documentation
- Add comments for new functionality where needed

---

## REQUIREMENT 14: BI Street Processing and Full Address Generation

**BI Street SimpleIdentifier**:
- **Data Source**: Bloomerang "BI Street" field
- **Storage**: SimpleIdentifier structure in otherInfo
- **AttributedTerm fieldName**: `"BI Street"`
- **Location**: otherInfo property of entity

**Fire Number Detection and Address Generation**:
- **Check Logic**: If "BI Street" field starts with a number (indicating Fire Number)
- **Verification**: Code must check if a complete Block Island address using "BI Street" data already exists
- **Generation Logic**: If no matching Block Island address exists, create one using format:
  - **Format**: `"[BI Street data], Block Island, RI 02807"`
  - **Variable**: Actual BI Street data from the record replaces placeholder
- **Address Processing**: Generated Block Island address must be parsed using the address parsing algorithm

**Implementation Requirements**:
- Store "BI Street" data in SimpleIdentifier within otherInfo with proper fieldName
- Implement Fire Number detection logic (numeric prefix check)
- Implement logic to detect existing Block Island addresses containing the street data
- Generate standardized Block Island address when none exists
- Apply address parsing algorithm to generated addresses

**Integration Notes**:
- Works with Requirement 10 (address parsing algorithm) for processing generated addresses
- Similar pattern to Requirement 11 (BI PO Box) but for street addresses
- Ensures consistent Block Island street address format

---

## REQUIREMENT 15: VisionAppraisal Fire Number Treatment in otherInfo

**Fire Number Storage for VisionAppraisal Data**:
- **Entity Storage**: otherInfo property of the entity
- **Identifier Type**: SimpleIdentifier
- **AttributedTerm fieldName**: `"fireNumber"`
- **Consistency**: Same treatment as Bloomerang Fire Number data

**Implementation Requirements**:
- **Structure Alignment**: VisionAppraisal Fire Number uses identical SimpleIdentifier and AttributedTerm structures as Bloomerang Fire Number
- **Storage Location**: VisionAppraisal Fire Number stored in otherInfo (NOT in locationIdentifier per Requirement 5)
- **Data Processing**: Apply same Fire Number validation and processing logic used for Bloomerang data
- **AttributedTerm Creation**: Create AttributedTerm with fieldName = "fireNumber" for VisionAppraisal Fire Number data

**Cross-Source Consistency**:
- **Bloomerang Fire Number**: otherInfo → fireNumber SimpleIdentifier → AttributedTerm with fieldName "fireNumber"
- **VisionAppraisal Fire Number**: otherInfo → fireNumber SimpleIdentifier → AttributedTerm with fieldName "fireNumber"
- **Identical Structure**: Both sources use same entity property, identifier type, and AttributedTerm configuration

**Integration Notes**:
- Works with Requirement 5 (PID as locationIdentifier) - Fire Number is NOT the locationIdentifier for VisionAppraisal
- Enables cross-source Fire Number matching using consistent data structures
- Maintains architectural consistency between Bloomerang and VisionAppraisal Fire Number handling

---

## REQUIREMENT 16: Standardize Address Parsing Consistency and Best Practices

**Current Address Parsing State**:
- **Existing Code**: VisionAppraisal owner address parsing into Street, City, State, ZIP components
- **Code Location**: Created by Claude in VisionAppraisal processing functions
- **Current Output**: Parsed address components stored in structured format

**Consistency Requirement**:
- **Standardization**: All address parsing code in the application must be consistent with determined best practices
- **Scope**: Applies to existing VisionAppraisal owner address parsing AND future address parsing implementations
- **Reference**: Connects with Requirement 10 (Develop Address Parsing Algorithm for Multiple Data Sources)

**Best Practice Determination Process**:
- **Research Component**: Investigate state-of-the-art address parsing methodologies (as mentioned in Requirement 10)
- **Evaluation**: Compare current VisionAppraisal parsing approach against best practices
- **Standardization**: Establish single address parsing standard for entire application
- **Implementation**: Update existing code and create new parsing using consistent methodology

**Street Component Sub-parsing Consideration**:
- **Optional Enhancement**: Consider parsing "Street" information into further subcomponents
- **Potential Sub-components**: Street number, street name, unit/apartment designation, etc.
- **Status**: Point for consideration, not mandatory requirement
- **Decision**: Evaluate during best practice research whether street sub-parsing adds value

**Implementation Requirements**:
- **Audit Current Code**: Review existing VisionAppraisal address parsing implementation
- **Research Best Practices**: Investigate current state-of-the-art address parsing methodologies
- **Establish Standard**: Define consistent address parsing approach for entire application
- **Update Existing Code**: Modify current VisionAppraisal parsing to match established standard
- **Future Consistency**: Ensure all new address parsing follows the established standard

**Integration Notes**:
- Works with Requirement 10 (comprehensive address parsing algorithm development)
- Ensures consistency between VisionAppraisal and Bloomerang address parsing
- Establishes foundation for reliable cross-source address matching

---

## REQUIREMENT 17: VisionAppraisal Address Field Assignments to ContactInfo

**VisionAppraisal Address Field Mapping**:

**ownerAddress → primaryAddress**:
- **Source Field**: VisionAppraisal "ownerAddress" field
- **Entity Storage**: ContactInfo → primaryAddress property
- **Identifier Type**: ComplexIdentifier (address components)
- **Processing**: Apply standardized address parsing (per Requirement 16)
- **Purpose**: Owner's mailing/contact address serves as primary address for the entity

**propertyLocation → secondaryAddress**:
- **Source Field**: VisionAppraisal "propertyLocation" field
- **Entity Storage**: ContactInfo → secondaryAddress array
- **Identifier Type**: ComplexIdentifier (address components)
- **Processing**: Apply standardized address parsing (per Requirement 16)
- **Purpose**: Block Island property location serves as secondary address information

**Implementation Requirements**:
- **Address Processing**: Both fields must use consistent address parsing algorithm (Requirement 16)
- **ComplexIdentifier Creation**: Create ComplexIdentifier objects for both parsed addresses
- **Array Handling**: propertyLocation adds to secondaryAddress array (per Requirement 12)
- **Source Attribution**: Maintain data lineage showing VisionAppraisal as source for both addresses

**Architectural Integration**:
- **primaryAddress**: Single address (owner's mailing address)
- **secondaryAddress**: Array structure (property location as one element)
- **Consistency**: Both use same ComplexIdentifier structure and parsing methodology
- **ContactInfo Structure**: Follows established ContactInfo property architecture

**Business Logic**:
- **Owner-Centric**: Primary address represents where to contact the property owner
- **Property Reference**: Secondary address provides Block Island property location
- **Dual Address System**: Enables both owner contact and property identification

---

## REQUIREMENT 18: Create blockIslandAddress Class with Categorized Address Arrays

**blockIslandAddress Class Structure**:
- **Purpose**: Comprehensive Block Island address categorization and reference system
- **Storage Location**: otherInfo property of entity
- **Architecture**: Class with three array properties for different address types

**Array Property Specifications**:

**1. bIFireNumberAddresses Array**:
- **Content**: Pointers to Block Island addresses containing Fire Numbers
- **Detection**: Use existing Fire Number recognition code within Block Island addresses
- **Source**: Any address from either data source (VisionAppraisal or Bloomerang) that meets criteria
- **Purpose**: Track all Fire Number-based Block Island addresses associated with the entity

**2. bIPOBox Array**:
- **Content**: Pointers to Block Island addresses containing PO Box elements (but no Fire Numbers)
- **Detection**: Use existing PO Box recognition code within Block Island addresses
- **Exclusion**: Must NOT contain Fire Numbers (Fire Number addresses go to bIFireNumberAddresses)
- **Source**: Any address from either data source that meets criteria
- **Purpose**: Track all PO Box-based Block Island addresses associated with the entity

**3. bIOtherAddresses Array**:
- **Content**: Pointers to Block Island addresses that don't contain Fire Numbers or PO Box elements
- **Detection**: Block Island addresses that fail Fire Number and PO Box recognition
- **Fallback Category**: Catch-all for other Block Island address types
- **Source**: Any address from either data source that meets criteria
- **Purpose**: Ensure no Block Island addresses are uncategorized

**Implementation Requirements**:

**Address Detection Infrastructure**:
- **Block Island Recognition**: Use existing code that identifies Block Island addresses
- **Fire Number Detection**: Use existing code that finds Fire Numbers within Block Island addresses
- **PO Box Detection**: Use existing code that recognizes PO Box elements in addresses
- **Classification Logic**: Implement hierarchical categorization (Fire Number → PO Box → Other)

**Entity Integration**:
- **Current Coverage**: Address properties in ContactInfo (primaryAddress, secondaryAddress arrays)
- **Future Expansion**: Capture ALL Block Island addresses regardless of entity property location
- **Comprehensive Tracking**: As address handling expands, ensure all Block Island addresses are captured

**Pointer Management**:
- **Reference System**: Arrays contain pointers to existing address objects (not duplicates)
- **Single Source**: Each address pointed to from only one appropriate array
- **Hierarchical Priority**: Fire Number takes precedence over PO Box, PO Box over Other

**Technical Architecture**:
- **Class Location**: Create blockIslandAddress class in appropriate class structure
- **Array Initialization**: Initialize all three arrays during entity creation
- **Population Logic**: Scan all entity addresses and populate arrays based on detection results
- **Data Integrity**: Ensure no Block Island address is missed or double-categorized

**Business Logic**:
- **Comprehensive Coverage**: All Block Island addresses associated with an entity are categorized
- **Type-Based Organization**: Enables different processing logic for Fire Number vs PO Box vs Other addresses
- **Integration Support**: Facilitates Fire Number-based matching and address analysis

---

## REQUIREMENT 19: MBLU Data Storage in ComplexIdentifier within otherInfo

**MBLU Data Structure**:
- **Data Source**: VisionAppraisal MBLU field (Map-Block-Lot-Unit property identifier)
- **Current Parsing**: Existing code parses MBLU into components (map, block, lot, unit, unitCut, _legacy)
- **Entity Storage**: otherInfo → mBLU property
- **Identifier Type**: ComplexIdentifier structure

**ComplexIdentifier Implementation**:
- **Structure**: Single ComplexIdentifier holding both raw MBLU and parsed components
- **Raw Data**: Complete original MBLU string preserved
- **Parsed Components**: Individual MBLU elements (map, block, lot, unit, unitCut) as separate components
- **AttributedTerm Usage**: Follow established pattern for capturing complex structured data

**Storage Specification**:
- **Property Name**: `mBLU` (within otherInfo)
- **Data Type**: ComplexIdentifier object
- **Content**: MBLU raw data and all parsed components
- **Architecture**: Consistent with other ComplexIdentifier usage patterns in the system

**Implementation Requirements**:
- **Use Existing Parser**: Leverage current MBLU parsing code in VisionAppraisalParser.parseMBLU()
- **ComplexIdentifier Creation**: Create ComplexIdentifier object containing:
  - Original MBLU string
  - Parsed map component
  - Parsed block component
  - Parsed lot component
  - Parsed unit component
  - Parsed unitCut component
- **AttributedTerm Integration**: Apply standard AttributedTerm structure with appropriate fieldName
- **Data Preservation**: Maintain complete data lineage and source attribution

**Technical Integration**:
- **Parser Integration**: Use existing `VisionAppraisalParser.parseMBLU()` function
- **Entity Architecture**: Follows otherInfo property patterns established in other requirements
- **ComplexIdentifier Pattern**: Consistent with address and name ComplexIdentifier usage
- **AttributedTerm Compliance**: Maintains architectural consistency with other structured data

**Business Logic**:
- **Property Identification**: MBLU serves as VisionAppraisal property identifier system
- **Component Access**: Individual MBLU components available for matching and analysis
- **Data Integrity**: Both raw and parsed data preserved for validation and debugging

---

## REQUIREMENT 20: Create Info Base Class for ContactInfo and OtherInfo Inheritance

**Info Class Architecture**:
- **New Base Class**: Create "Info" class as parent class
- **Inheritance Structure**:
  - **ContactInfo class** extends Info class
  - **OtherInfo class** (specified in Requirement 1) extends Info class
- **Common Foundation**: Shared functionality and properties in base Info class

**Implementation Requirements**:
- **Create Info Base Class**: Define new Info class with common properties and methods
- **Modify ContactInfo**: Update ContactInfo class to extend Info instead of being standalone
- **Modify OtherInfo**: Ensure OtherInfo class (from Requirement 1) extends Info class
- **Inheritance Compliance**: Both subclasses inherit all base Info functionality

**Architectural Benefits**:
- **Code Reuse**: Common functionality shared between ContactInfo and OtherInfo
- **Consistency**: Standardized approach for information storage classes
- **Extensibility**: Additional Info-based classes can be created using same pattern
- **Maintainability**: Shared functionality maintained in single base class

**Technical Implementation**:
- **Class Hierarchy**: Info (base) → ContactInfo, OtherInfo (subclasses)
- **Method Inheritance**: Subclasses inherit and can override base Info methods
- **Property Structure**: Common properties defined in Info, specific properties in subclasses
- **Serialization**: Ensure inheritance structure properly handles serialization/deserialization

**Integration Notes**:
- **Works with Requirement 1**: OtherInfo class creation includes extending Info base class
- **ContactInfo Compatibility**: Existing ContactInfo functionality preserved through inheritance
- **Entity Architecture**: Both otherInfo and contactInfo properties reference Info-based objects
- **Future Extensions**: Additional information classes can extend Info base class as needed

---

## REQUIREMENT 21: Create LegacyInfo Class for VisionAppraisal Record Data Preservation

**LegacyInfo Class Architecture**:
- **New Class**: Create "LegacyInfo" class extending the Info base class
- **Purpose**: Preserve VisionAppraisal data fields strictly as a matter of record
- **Inheritance**: LegacyInfo extends Info class (consistent with ContactInfo and OtherInfo pattern)
- **Data Storage**: Properties hold SimpleIdentifier instantiations using Aliased class structures

**VisionAppraisal Fields for LegacyInfo Storage**:

1. **ownerName**
   - **Storage**: LegacyInfo → ownerName property
   - **Type**: SimpleIdentifier
   - **Purpose**: Preserve original VisionAppraisal owner name data

2. **ownerName2**
   - **Storage**: LegacyInfo → ownerName2 property
   - **Type**: SimpleIdentifier
   - **Purpose**: Preserve original VisionAppraisal secondary owner name data

3. **neighborhood**
   - **Storage**: LegacyInfo → neighborhood property
   - **Type**: SimpleIdentifier
   - **Purpose**: Preserve VisionAppraisal neighborhood designation

4. **userCode**
   - **Storage**: LegacyInfo → userCode property
   - **Type**: SimpleIdentifier
   - **Purpose**: Preserve VisionAppraisal user code information

5. **date**
   - **Storage**: LegacyInfo → date property
   - **Type**: SimpleIdentifier
   - **Purpose**: Preserve VisionAppraisal date information

6. **sourceIndex**
   - **Storage**: LegacyInfo → sourceIndex property
   - **Type**: SimpleIdentifier
   - **Purpose**: Preserve VisionAppraisal source index data

**Implementation Requirements**:
- **Class Creation**: Create LegacyInfo class extending Info base class
- **Property Structure**: Each VisionAppraisal field becomes a LegacyInfo property
- **SimpleIdentifier Usage**: All properties hold SimpleIdentifier objects with Aliased structure
- **AttributedTerm Integration**: Apply standard AttributedTerm pattern with appropriate fieldName values
- **Data Preservation**: Maintain complete data lineage for all legacy fields

**Entity Integration**:
- **Entity Property**: Add legacyInfo property to entity class (alongside locationIdentifier, contactInfo, otherInfo)
- **VisionAppraisal Processing**: Create LegacyInfo object for each VisionAppraisal entity
- **Record Keeping**: Pure preservation without processing or enhancement
- **Source Attribution**: Maintain clear attribution to VisionAppraisal source

**Architectural Consistency**:
- **Info Inheritance**: Follows same pattern as ContactInfo and OtherInfo classes
- **Aliased Structure**: Consistent with established SimpleIdentifier and AttributedTerm architecture
- **Entity Architecture**: Extends entity class with additional information category
- **Data Lineage**: Maintains complete provenance tracking for legacy data

**Business Logic**:
- **Record Preservation**: Data held purely for historical/reference purposes
- **Original Format**: Preserve data in original VisionAppraisal format and structure
- **Documentation**: Clear separation between active data (contactInfo, otherInfo) and legacy data (legacyInfo)
- **Future Reference**: Enable access to original source data for validation or analysis

**Technical Implementation**:
- **Class Hierarchy**: Info (base) → LegacyInfo (subclass)
- **Property Initialization**: Initialize all 6 properties during LegacyInfo creation
- **SimpleIdentifier Pattern**: Follow established pattern for SimpleIdentifier creation with AttributedTerm
- **Serialization**: Ensure inheritance and SimpleIdentifier structures handle serialization properly

---

## REQUIREMENT 22: Parse processedOwnerName into IndividualName or HouseholdName Classes

**Processing Requirement**:
- **Source Field**: VisionAppraisal "processedOwnerName" field
- **Target Classes**: Parse into either IndividualName class OR HouseholdName class
- **Parsing Logic**: Determine appropriate class based on name structure and content
- **Algorithm Implementation**: Requires parsing algorithms to populate class properties correctly

**Implementation Dependencies**:
- **Check for Existing Algorithms**: Verify if parsing algorithms already exist for this processing
- **Research Requirement**: If no existing algorithms found, research name parsing methodologies
- **Algorithm Development**: Write parsing algorithms if none exist
- **Testing Requirement**: Test algorithms to ensure correct classification and property population

**Class Population Requirements**:
- **IndividualName Class**: Populate all relevant properties (firstName, lastName, otherNames, etc.)
- **HouseholdName Class**: Populate all relevant properties according to household name patterns
- **Decision Logic**: Implement logic to determine which class is appropriate for each processedOwnerName

**Integration Notes**:
- **Classification Logic**: Must correctly distinguish between individual names and household names
- **Property Mapping**: Ensure all parsed components are correctly assigned to class properties
- **Data Preservation**: Maintain complete data lineage from processedOwnerName to final class structure

**Potential Conflict/Redundancy Investigation**:
- **Status**: User has requested investigation of potential conflicts with other requirements
- **Question**: Determine if this requirement conflicts or duplicates functionality specified elsewhere
- **Resolution**: Address any identified conflicts or redundancies during implementation planning phase

---

## REQUIREMENT 23: Non-Transfer Fields and Data Completeness Verification

**Non-Transfer VisionAppraisal Fields**:
The following VisionAppraisal data fields will **NOT** be transferred to entities as content:

1. **hasFireNumber**
   - **Status**: No entity content transfer
   - **Exception**: May be referenced during parsing of other fields
   - **Usage**: Processing aid only, not stored in final entity structure

2. **_legacyAddress**
   - **Status**: No entity content transfer
   - **Purpose**: Legacy field excluded from entity architecture

3. **_legacyMBLU**
   - **Status**: No entity content transfer
   - **Purpose**: Legacy field excluded from entity architecture

4. **_legacyOwnerName**
   - **Status**: No entity content transfer
   - **Purpose**: Legacy field excluded from entity architecture

5. **_legacyOwnerName2**
   - **Status**: No entity content transfer
   - **Purpose**: Legacy field excluded from entity architecture

**Data Completeness Verification Requirement**:
- **Critical Check**: Before implementing any of the 23 requirements, verify that these requirements have specified the handling of ALL data fields from both source files
- **VisionAppraisal Coverage**: Ensure all VisionAppraisal source fields are addressed (either for entity transfer or explicitly excluded)
- **Bloomerang Coverage**: Ensure all Bloomerang source fields are addressed (either for entity transfer or explicitly excluded)
- **Completeness Standard**: No source data field should be unspecified or unaddressed

**Implementation Verification Process**:
- **Pre-Implementation Audit**: Complete audit of all source fields against requirements specifications
- **Gap Identification**: Identify any fields not covered by the 23 requirements
- **Resolution Requirement**: Address any gaps before beginning implementation
- **Documentation**: Maintain complete mapping of source fields to requirement specifications

**Field Processing Exceptions**:
- **hasFireNumber**: Special case - may be used as processing reference during parsing but not stored in entities
- **Legacy Fields**: All _legacy* fields explicitly excluded from entity architecture
- **Processing vs Storage**: Clear distinction between fields used during processing and fields stored in final entities

---

## PENDING REQUIREMENTS

**Next Session Priority**: Complete field mapping specification
- **VisionAppraisal**: Specify how each of the 28 source fields should be stored in entity classes
- **Bloomerang**: Specify how each of the 30 source fields should be stored in entity classes
- **Integration**: Define complete entity architecture with all requirements implemented

**Session Context**: User had to end session before completing field mapping requirements but emphasized these specifications are critical and must not be lost in future continuity document updates.