# Name Matching System Reference Documentation

**Purpose**: Comprehensive documentation of the sophisticated name matching logic built for VisionAppraisal ↔ Bloomerang entity integration

**Status**: 🚧 **DRAFT** - Documenting existing implemented code and architectural patterns

**Cross-references**: Supports reference_integrationWorkflow.md Phase 2B, blocked by structural issues per CLAUDE.md

---

## **System Architecture Overview**

### **Multi-Layer Name Matching Approach**

The name matching system implements a sophisticated multi-algorithm approach designed for Block Island property owner matching across VisionAppraisal and Bloomerang datasets.

**Core Design Principles**:
1. **Configurable Weighted Scoring** - Adjustable parameters for different matching scenarios
2. **Multi-Algorithm Composite** - Multiple algorithms combined for robust matching
3. **Business Entity Awareness** - Specialized handling of trusts, LLCs, and institutions
4. **Confidence Classification** - Clear confidence levels for match quality assessment
5. **Fallback Handling** - Works with both structured and unstructured name data

---

## **Component 1: Core Name Matching Algorithm**

**File Location**: `scripts/nameMatchingAnalysis.js`

### **Primary Function: compareNames(name1, name2)**

**Purpose**: Sophisticated name-to-name comparison between VisionAppraisal and Bloomerang Individual entities

**Input Parameters**:
- `name1` - VisionAppraisal name (Individual object or string)
- `name2` - Bloomerang name (Individual object or string)

**Return Structure**:
```javascript
{
    score: number,           // 0-1 similarity score
    confidence: number,      // 0-1 confidence level
    match: boolean,          // true if score >= threshold
    reason: string,          // explanation of matching logic
    details: object          // detailed breakdown for debugging
}
```

### **Configurable Scoring Parameters**

**Component Weights (Individual Entities)**:
```javascript
lastNameWeight: 0.5        // 50% weight for last name matching
firstNameWeight: 0.4       // 40% weight for first name matching
otherNamesWeight: 0.1      // 10% weight for middle/other names
```

**Final Scoring Weights (Structured Data Available)**:
```javascript
structuredComponentWeight: 0.8           // 80% component analysis
structuredStringSimilarityWeight: 0.2    // 20% string similarity
```

**Final Scoring Weights (Limited Structured Data)**:
```javascript
unstructuredStringWeight: 0.8            // 80% string similarity
unstructuredComponentWeight: 0.2         // 20% component analysis
```

**Match Threshold**: `0.8` (80% similarity required for positive match)

**Confidence Levels**:
```javascript
structuredDataConfidence: 0.9    // High confidence with parsed names
unstructuredDataConfidence: 0.6  // Lower confidence with string-only names
```

### **Dual-Path Analysis Logic**

**Path 1: Component-Based Matching (Preferred)**
- Used when both names have structured data (firstName, lastName, otherNames)
- Compares individual name components with weighted scoring
- Handles substring matches for nicknames and abbreviations
- Accounts for compound names and word overlap

**Path 2: String-Based Matching (Fallback)**
- Used when structured data unavailable
- Full name string similarity comparison
- Word-based overlap analysis
- Normalization and cleaning applied

### **Name Extraction Hierarchy**

**Priority Order for Name Data Extraction**:
1. `entity.name.identifier.primaryAlias.term` (full structure)
2. `entity.name.identifier.term` (simplified structure)
3. `entity.name` (direct string)
4. `entity.name.term` (AttributedTerm)

---

## **Component 2: Pre-Analysis Name Pattern Discovery**

**File Location**: `scripts/matching/nameAnalysisForMatching.js`

### **Purpose**: Understand name structures before implementing matching

**Key Functions**:
- `analyzeVisionAppraisalEntityNames()` - Extract name patterns from VA entities
- `analyzeBloomerangEntityNames()` - Extract name patterns from Bloomerang entities
- `compareEntityNamePatterns()` - Cross-dataset pattern comparison

### **Pattern Detection Categories**

**Detected Name Patterns**:
```javascript
comma_separated         // "SMITH, JOHN" format
ampersand_multiple     // "JOHN & MARY SMITH" format
trust_entity           // Names containing "TRUST"
business_entity        // Names with LLC, CORP, INC
lastname_firstname     // "LASTNAME, FIRSTNAME" pattern
firstname_lastname     // "FIRSTNAME LASTNAME" pattern
```

**Sample Size**: Analyzes first 50 Individual entities per dataset

---

## **Component 3: Advanced Composite Similarity Calculator**

**File Location**: `scripts/nameMatching/compositeSimilarity.js`

### **Multi-Algorithm Approach**

**Algorithm Combination**:
1. **Custom Weighted Levenshtein** (Primary - 80% weight)
2. **Jaro-Winkler** (Secondary - 15% weight)
3. **Metaphone** (Tertiary - 5% weight)

### **Custom Weighted Levenshtein Implementation**

**Special Features**:
- **Vowel weighting**: Different costs for vowel vs consonant substitutions
- **English language optimization**: Designed for English name variations
- **Custom substitution costs**: Intelligent character replacement costs

**Vowel/Consonant Logic**:
```javascript
vowels: ["a", "e", "i", "o", "u", "y"]
consonants: ["b", "c", "d", "f", "g", "h", "j", "k", "l", "m", "n", "p", "q", "r", "s", "t", "v", "w", "x", "z"]

// Vowel-to-vowel substitution cost: (6 * 5) / (20 * 19)
// Consonant-to-consonant substitution cost: 1
// Mixed substitution cost: (6 + 6) / 19
```

### **Confidence Classification**

**Confidence Thresholds**:
```javascript
score >= 0.9    // "high" confidence
score >= 0.7    // "medium" confidence
score >= 0.5    // "low" confidence
score < 0.5     // "very_low" confidence
```

### **Name Normalization Process**

**Normalization Steps**:
1. Trim whitespace
2. Convert to uppercase
3. Multiple spaces → single space
4. Remove all characters except letters, numbers, spaces, &, comma, dash

---

## **Component 4: Business Entity Filtering System**

**File Location**: `scripts/nameMatching/businessEntityFilter.js`

### **Two-Tier Filtering Approach**

**Tier 1: Complete Entity Exclusion**
- **Purpose**: Remove institutional/governmental entities from name matching
- **Data Source**: CSV file with 904 entities (`/servers/Results/BusinessTermsMaster - NonNameFullNamesx.csv`)
- **Examples**: "TOWN OF NEW SHOREHAM", "BLUE COVE ASSOCIATION"

**Tier 2: Business Term Stripping**
- **Purpose**: Clean personal names by removing business suffixes
- **Data Source**: CSV file with business terms (`/servers/Results/BusinessTermsMaster - Nonnames.csv`)
- **Examples**: Remove "TRUST", "LLC", "CORP", "TRUSTEE"

### **Classification Logic**

**Function: classifyAndCleanName(name)**

**Return Structure**:
```javascript
{
    type: 'business_entity' | 'individual',
    cleanedName: string,
    originalName: string,
    shouldExcludeFromMatching: boolean
}
```

**Processing Rules**:
1. Check complete exclusion list first
2. If not excluded, strip business terms
3. If nothing remains after stripping → business entity
4. Otherwise → individual (use cleaned name for matching)

---

## **Component 5: Multi-Stage Matching Pipeline**

**File Location**: `scripts/integration/matchingEngine.js`

### **3-Stage Pipeline Architecture**

**Stage 1: Fire Number Direct Matching**
- Build VisionAppraisal Fire Number index
- Handle single vs multi-unit properties
- Identify owner clustering requirements
- Expected match rate: ~29%

**Stage 2: Name Similarity Matching**
- **Clear matches** (≥85% similarity) - auto-accept
- **Near matches** (50-84% similarity) - manual review required
- Uses composite similarity scoring system
- Processes records unmatched from Stage 1

**Stage 3: Address Pattern Matching**
- Block Island specific address standardization
- Currently planned but not implemented
- Fallback for remaining unmatched records

### **Match Classification**

**Clear Matches (Auto-Accept)**:
- Fire Number direct matches (single property per Fire Number)
- Name similarity ≥85%
- High confidence, no human review needed

**Near Matches (Manual Review)**:
- Multi-unit properties (multiple PIDs per Fire Number)
- Name similarity 50-84%
- Requires human verification

**No Matches**:
- No Fire Number match
- Name similarity <50%
- No viable address patterns

---

## **Integration with Entity Structure**

### **Name Data Extraction Dependencies**

**Current Blocking Issue**: `extractNameWorking()` function compatibility
- **Expected Structure**: `entity.name.term`
- **Actual Structure**: May vary based on entity generation process
- **Blocker**: Testing requires entity loading infrastructure

### **Entity Type Support**

**Supported Entity Types**:
- **Individual entities**: Full component-based matching
- **AggregateHousehold entities**: String-based matching
- **Business entities**: Filtered through business entity system
- **LegalConstruct entities**: Specialized handling required

---

## **Testing and Validation Framework**

### **Built-in Test Functions**

**Core Testing**: `testNameComparison(sampleSize)`
- Tests with loaded VisionAppraisal and Bloomerang entities
- Configurable sample size for testing
- Comprehensive results analysis

**Business Entity Testing**: `testBusinessEntityFilter()`
- Validates business entity detection
- Tests term stripping logic
- Sample data classification verification

**Composite Algorithm Testing**: `testCompositeSimilarity()`
- Multi-algorithm comparison testing
- Real name pair evaluation
- Algorithm weight validation

### **Performance Metrics**

**Measured Outputs**:
- Total comparisons performed
- High-score matches (≥70%)
- Exact matches (100%)
- Top scoring matches with reasons
- Algorithm breakdown analysis

---

## **Configuration and Tuning**

### **Runtime Configuration Updates**

**Function**: `updateMatchingConfig(newConfig)`

**Adjustable Parameters**:
```javascript
// Component weights
lastNameWeight, firstNameWeight, otherNamesWeight

// Scoring weights
structuredComponentWeight, structuredStringSimilarityWeight
unstructuredStringWeight, unstructuredComponentWeight

// Thresholds
matchThreshold

// Confidence levels
structuredDataConfidence, unstructuredDataConfidence
```

**Example Configuration Update**:
```javascript
updateMatchingConfig({
    matchThreshold: 0.7,        // Lower threshold for more matches
    lastNameWeight: 0.6,        // Increase last name importance
    firstNameWeight: 0.3        // Decrease first name importance
});
```

---

## **Known Limitations and Current Status**

### **Implemented Components** ✅
- Core name comparison algorithm with configurable weights
- Multi-algorithm composite similarity calculation
- Business entity filtering with two-tier approach
- Name pattern analysis and discovery tools
- Multi-stage matching pipeline architecture
- Comprehensive testing framework

### **Blocking Issues** ❌
- `extractNameWorking()` function structural compatibility
- Integration with loaded entity data structures
- End-to-end testing with real datasets
- Cross-dataset name extraction standardization

### **Missing Implementation** 🚧
- Address pattern matching (Stage 3)
- Jaro-Winkler algorithm integration (placeholder)
- Metaphone algorithm integration (placeholder)
- Production testing with full datasets

---

## **Future Development Roadmap**

### **Immediate Next Steps**
1. **Resolve structural blocking issues** - Fix entity data extraction compatibility
2. **Complete algorithm integration** - Implement Jaro-Winkler and Metaphone
3. **End-to-end testing** - Test with full VisionAppraisal and Bloomerang datasets
4. **Performance optimization** - Tune algorithms based on real data performance

### **Advanced Features**
1. **Machine learning integration** - Train models on validated matches
2. **Phonetic matching enhancement** - Advanced phonetic similarity algorithms
3. **Cultural name pattern support** - Handle diverse name formats
4. **Real-time configuration** - Dynamic parameter adjustment during matching

---

## **Code Integration Points**

### **Required Dependencies**
- `scripts/matchingTools.js` - Custom Levenshtein algorithm
- Entity loading infrastructure (workingLoadedEntities)
- Business entity CSV files in `/servers/Results/`
- VisionAppraisal tag cleaning functions

### **Integration Functions**
```javascript
// Browser console usage
window.compareNames(name1, name2)
window.updateMatchingConfig(config)
window.testNameComparison(sampleSize)
window.MatchingEngine.runMultiStageMatcher(sourceRecords, targetRecords)
```

### **File Dependencies**
- `nameMatchingAnalysis.js` - Core matching logic
- `compositeSimilarity.js` - Multi-algorithm scoring
- `businessEntityFilter.js` - Business entity handling
- `nameAnalysisForMatching.js` - Pattern discovery
- `matchingEngine.js` - Pipeline orchestration

---

**Last Updated**: November 24, 2025
**Documentation Status**: Draft based on implemented code analysis
**Next Review**: After structural blocking issues resolution