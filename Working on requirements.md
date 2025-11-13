# Working on Requirements - Clarification Session Results

## **SESSION CONTEXT**
Date: Current session working through 23 requirements for VisionAppraisal ↔ Bloomerang Entity Data Audit
Status: Implementation approved - proceeding with comprehensive plan execution
Implementation Plan: 8-phase systematic approach to enhanced entity architecture

## **CLARIFICATION 1: LocationIdentifier Architecture - RESOLVED ✅**

### **The Issue**:
Requirements 2 vs 5 seemed contradictory about LocationIdentifier structure

### **User's Clarifying Context**:
The user provided crucial context about the overall workflow that resolved the confusion:
- **Three-step process**: 1) Bloomerang data → entities, 2) VisionAppraisal data → entities, 3) Matching/merging entities
- **Different processing rules** for different steps, but unified storage architecture
- **Hierarchy for merged entities**: Most preferred location identifier wins

### **Rich Discussion Context**:
User explained: *"Reconciling these points involves providing you information about the overall plan that you may not have connected to these issues... Think of three tasks 1) Using Bloomerang data to create entities. 2) Using VisionAppraisal Data to create entities. 3) Comparing the Bloomerang entities and the VisionAppraisal entities to discover where they actually refer to the same entities and should be merged."*

Key insight: *"There is a hierarchy amongst the possible sources of data. The most preferred location identifier is the fire number, the next most preferred location identifier is a PID, the next most preferred location identifier is a name."*

### **Resolution**:
- LocationIdentifier holds **exactly ONE piece of information** (not multiple)
- Selection by hierarchy: Fire Number > PID > Name
- Processing rules:
  - Bloomerang Entity: Fire Number OR Name (Fire Number preferred)
  - VisionAppraisal Entity: Always PID (per Requirement 5)
  - Merged Entity: Highest preference available from either source
- Structure: Single-value container supporting FireNumber SimpleIdentifier, PID SimpleIdentifier, or Name ComplexIdentifier

### **Architectural Impact**:
This clarification resolved a fundamental misunderstanding about whether LocationIdentifier was a container vs. single value, enabling proper implementation of the entity identification system.

## **CLARIFICATION 2: Address Processing Architecture - RESOLVED ✅**

### **The Issue**:
6 address-related requirements (10,11,14,16,17,18) - separate systems or unified?

### **User's Clarifying Context**:
The user emphasized the importance of avoiding redundant code and processing efficiency:

*"I do not know what you mean by 'ONE comprehensive address parsing system'. I think you might be over complicating this. Avoid redundant code. When multiple requirements tell you to do the same thing (in this case analyze address data) do not create separate systems to handle them. Use the same logic to handle the same task wherever it occurs."*

Key principle: *"Each raw address field should be processed exactly once, and during that processing, all of the address components that we care about should be extracted."*

### **Resolution**:
- **One Core Methodology**: Single address parsing function used by all requirements
- **Process Once**: Each raw address field processed exactly once to generate all components
- **Unified ComplexIdentifier**: One class handles all address types (no subclasses)
- **Implementation Order**: Requirements 10/16 establish core → Requirements 11/14/17/18 use components
- **Research Approach**: Find existing parsing libraries, adapt for Block Island + entity structure needs

## **CLARIFICATION 3: Identifier/AttributedTerm Architecture - RESOLVED ✅**

### **The Issue**:
Confusion about relationships between AttributedTerm, Aliased, and Identifier classes

### **User's Guidance**:
The user directed me to verify the architecture against existing code comments:

*"Point 1) When raw data is read from source data files, it creates AttributedTerms. Point 2) AttributedTerms are put into Identifier classes (which are the same as 'Aliased' classes). Point 3) Identifier classes (which are also aliases) are put in IndicativeData and IdentifyingData classes (which are both container classes). Point 4) IndicativeData and IdentifyingData classes are put into Entity properties."*

The user emphasized checking existing code: *"This is consistent with the comments in the code that is already written. You should read the code comments and verify this."*

Regarding fieldName placement: *"The fieldName should be a property of the AttributedTerm class, not higher level classes."*

### **Resolution** (Verified against existing code comments):
- **Data Flow**: Raw Data → AttributedTerm → SimpleIdentifier/ComplexIdentifier → Entity properties
- **Class Relationships**:
  - "Identifier classes" = "Aliased classes" = SimpleIdentifier/ComplexIdentifier
  - SimpleIdentifier/ComplexIdentifier extend Aliased
  - Aliased holds AttributedTerm in primaryAlias, AttributedTerms in alternatives
- **Entity Integration**: Entity properties hold Identifier objects (in container classes)
- **fieldName Location**: Goes on AttributedTerm class (Requirement 4 revision)
- **alternatives Usage**: For matching phase when reconciling entities from different sources

## **CLARIFICATION 4: Implementation Scope and System Boundaries - RESOLVED ✅**

### **The Issue**:
Uncertainty about full scope of work across different system boundaries

### **User's Context and Direction**:
The user provided comprehensive scope clarification when asked about implementation expectations:

*"1) I do not know the answer because I do not know what is available. I will rely on you to research what is available, and choose an approach that is best. This could be integrating an existing library, adapting an existing library, or creating custom solutions."*

*"2) I expect you to create unit tests and integration tests as appropriate to verify that your implementation works correctly. I also expect a one-time implementation that allows me to verify that the implementation is complete."*

*"3) No special performance requirements. The number of entities and records we are working with (1,400+ entities) is small by modern standards."*

*"4) We are augmenting existing entity creation processes. We are not developing matching algorithms in this implementation. Where entity creation already works, we will overwrite the previous results with the enhanced results."*

### **Resolution**:
- **Algorithm Development**: Research first, then choose approach (library integration/adaptation/custom)
- **Testing Requirements**: Unit tests + integration tests + one-time completeness verification
- **Performance**: No capacity constraints with current record volumes (1,400+ entities)
- **Integration Scope**: Augment existing entity creation, no matching algorithms, overwrite previous results
- **Boundary**: Enhanced entity architecture + complete field preservation + research-based parsing

## **THREE-STEP WORKFLOW CONTEXT**
1. **Bloomerang data → entities**
2. **VisionAppraisal data → entities**
3. **Compare/merge entities (matching step)**

Requirements address all three steps, with hierarchy preferences for merged entities.

## **IMPLEMENTATION STATUS**
- **Phase 1**: Foundation & Verification - IN PROGRESS
- **Total Requirements**: 23 captured and clarified
- **Success Criteria**: 100% field preservation across 58 source fields
- **Integration Goal**: Enhanced entities support Fire Number matching and contact discovery workflows

---

**Document Purpose**: Preserve critical clarification results for seamless project continuation across sessions and ensure architectural decisions are not lost during implementation phases.