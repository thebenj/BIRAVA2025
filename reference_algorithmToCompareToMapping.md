# Algorithm Insights to Weighted Comparison Architecture Mapping

**Purpose**: Design a weighted comparison system using base class properties and enhanced genericObjectCompareTo that integrates proven nameMatchingAnalysis.js algorithm insights

**Status**: 🏗️ **ARCHITECTURE DESIGN** - Weighted comparison system using inheritance and shared utilities

**Scope**: Integration of successful matching patterns into extensible base class architecture with configurable weights

---

## **Current Algorithm Analysis Summary**

### **Proven Successful Patterns from nameMatchingAnalysis.js**

**Component Weighting (Individual Names)**:
```javascript
// Current proven weights from nameMatchingAnalysis
const matchingConfig = {
    lastNameWeight: 0.5,        // Most important component
    firstNameWeight: 0.4,       // Secondary importance
    otherNamesWeight: 0.1,      // Least important
}
```

**Performance Benchmarks Achieved**:
- **945K+ comparisons per second** - validates efficiency of approach
- **Scalable to 1600+ entities** - real-world dataset compatibility
- **Configurable algorithm parameters** - proven flexibility

---

## **Weighted Comparison Architecture Design**

### **1. Base Class Properties Architecture**

**New Properties Added via Inheritance** (AttributedTerm, Aliased, Entity, Info classes):
```javascript
// Base class enhancement - added to multiple parent classes
class AttributedTerm {
    constructor(term, source, index, identifier, fieldName = null) {
        // ... existing constructor code ...

        // Weighted comparison architecture properties
        this.comparisonWeights = null;                    // Object: {propName: weight, ...}
        this.comparisonCalculator = defaultWeightedComparison; // Function for weighted calculation
    }
}

class Aliased {
    constructor(primaryAlias) {
        // ... existing constructor code ...

        // Weighted comparison architecture properties
        this.comparisonWeights = null;                    // Object: {propName: weight, ...}
        this.comparisonCalculator = defaultWeightedComparison; // Function for weighted calculation
    }
}

class Entity {
    constructor() {
        // ... existing constructor code ...

        // Weighted comparison architecture properties
        this.comparisonWeights = null;                    // Object: {propName: weight, ...}
        this.comparisonCalculator = defaultWeightedComparison; // Function for weighted calculation
    }
}
```

### **2. Shared Utility Function**

**defaultWeightedComparison - Shared utility using 'this' context**:
```javascript
/**
 * Default weighted comparison calculator
 * Used by genericObjectCompareTo when comparisonWeights are configured
 * Operates in 'this' context of the calling object
 * @param {Object} otherObject - Object to compare against
 * @returns {number} Comparison result from -1 to 1, rounded to 10th place, or null for fallback
 */
function defaultWeightedComparison(otherObject) {
    // Check if weights are configured
    if (!this.comparisonWeights) {
        return null; // Fall back to standard property-by-property comparison
    }

    let totalWeightedScore = 0;
    let totalWeight = 0;

    // Iterate through configured weights only (exclusion approach)
    for (let propName in this.comparisonWeights) {
        const weight = this.comparisonWeights[propName];
        const thisValue = this[propName];
        const otherValue = otherObject[propName];

        // Skip if either value is missing (exclusion approach for robustness)
        if (!thisValue || !otherValue) {
            continue;
        }

        // Calculate property similarity score
        let propScore = 0;
        if (typeof thisValue.compareTo === 'function') {
            const compareResult = thisValue.compareTo(otherValue);
            // Convert compareTo result to similarity score (0 = perfect match)
            propScore = compareResult === 0 ? 1.0 : 0.0;
        } else {
            // Direct comparison fallback for primitive values
            propScore = thisValue === otherValue ? 1.0 : 0.0;
        }

        totalWeightedScore += propScore * weight;
        totalWeight += weight;
    }

    // Calculate final weighted similarity
    const similarity = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

    // Convert to compareTo convention (-1 to 1 range, rounded to 10th place)
    const compareToResult = (similarity * 2) - 1; // Convert 0-1 to -1 to +1
    return Math.round(compareToResult * 10) / 10;
}
```

### **3. Enhanced genericObjectCompareTo**

**Modified genericObjectCompareTo using weighted calculation**:
```javascript
/**
 * Enhanced genericObjectCompareTo with weighted comparison support
 * Checks for comparisonCalculator function before falling back to property-by-property
 */
function genericObjectCompareTo(obj1, obj2, excludedProperties) {
    // Basic null/undefined checks
    if (!obj1 && !obj2) return 0; // Both null = match
    if (!obj1 || !obj2) return 1; // One null, one not = no match

    // Different types should throw error - invalid comparison
    if (obj1.constructor !== obj2.constructor) {
        throw new Error('Cannot compare objects of different types: ' +
                       obj1.constructor.name + ' vs ' + obj2.constructor.name);
    }

    // NEW: Check if object has weighted comparison capability
    if (obj1.comparisonCalculator && typeof obj1.comparisonCalculator === 'function') {
        const weightedResult = obj1.comparisonCalculator.call(obj1, obj2);
        if (weightedResult !== null) {
            return weightedResult; // Return weighted comparison result (already rounded)
        }
    }

    // Fall back to existing property-by-property comparison
    // ... existing genericObjectCompareTo logic continues unchanged ...
}
```

---

## **IndividualName Implementation**

### **IndividualName Weighted Configuration**

**Configure IndividualName with proven algorithm weights**:
```javascript
/**
 * IndividualName weighted comparison initialization
 * Sets proven weights from nameMatchingAnalysis insights
 */
IndividualName.prototype.initializeWeightedComparison = function() {
    // Set proven weights from nameMatchingAnalysis
    this.comparisonWeights = {
        lastName: 0.5,      // Most important component (proven)
        firstName: 0.4,     // Secondary importance (proven)
        otherNames: 0.1     // Least important (proven)
    };

    // comparisonCalculator already set to defaultWeightedComparison in constructor
};

// Modify IndividualName constructor to initialize weights
const originalIndividualNameConstructor = IndividualName;
IndividualName = function(...args) {
    originalIndividualNameConstructor.apply(this, args);
    this.initializeWeightedComparison();
};
IndividualName.prototype = originalIndividualNameConstructor.prototype;
```

**Usage - No changes to calling code**:
```javascript
// Existing code works unchanged - now uses weighted comparison automatically
const name1 = new IndividualName(primaryAlias, title, firstName, otherNames, lastName, suffix);
const name2 = new IndividualName(primaryAlias2, title2, firstName2, otherNames2, lastName2, suffix2);

const result = name1.compareTo(name2); // Now uses weighted algorithm insights
// Returns: -1 to 1, rounded to 10th place, using lastName:0.5, firstName:0.4, otherNames:0.1 weights
```

---

## **Entity-Level Implementation**

### **Entity Type Configurations**

**Individual Entity Configuration**:
```javascript
Individual.prototype.initializeWeightedComparison = function() {
    // Individual-specific weights emphasizing name matching
    this.comparisonWeights = {
        locationIdentifier: 0.2,
        contactInfo: 0.5,        // High weight - contains names
        otherInfo: 0.2,
        legacyInfo: 0.1
    };
};
```

**AggregateHousehold Entity Configuration**:
```javascript
AggregateHousehold.prototype.initializeWeightedComparison = function() {
    // Household-specific weights emphasizing location
    this.comparisonWeights = {
        locationIdentifier: 0.4,  // Higher for address-based matching
        contactInfo: 0.4,
        otherInfo: 0.15,
        legacyInfo: 0.05
    };
};
```

---

## **Architecture Benefits**

### **Advantages of This Approach**

✅ **Preserves genericObjectCompareTo elegance** - Dynamic property discovery maintained
✅ **Configurable weighting** - No hardcoded comparison logic
✅ **Inheritance-based** - Properties added to base classes, inherited by all subclasses
✅ **Backward compatible** - Existing code works unchanged
✅ **Extensible** - New properties automatically included when weights added
✅ **Performance maintained** - Lightweight function calls, efficient calculation
✅ **Consistent architecture** - Same pattern across all entity types

### **Critical Success Factors**

✅ **Algorithm insights preserved** - Uses proven 0.5/0.4/0.1 weights from nameMatchingAnalysis
✅ **Property exclusion approach** - Missing properties excluded (robust handling)
✅ **Rounded to 10th place** - Results consistent with specification
✅ **Shared utility pattern** - Single function serves all classes via 'this' context

---

## **Implementation Priority**

### **Phase 1: Base Class Properties**
1. Add comparisonWeights and comparisonCalculator properties to AttributedTerm
2. Add comparisonWeights and comparisonCalculator properties to Aliased
3. Add comparisonWeights and comparisonCalculator properties to Entity
4. Create defaultWeightedComparison shared utility function

### **Phase 2: genericObjectCompareTo Enhancement**
1. Modify genericObjectCompareTo to check for comparisonCalculator
2. Test fallback behavior when comparisonWeights is null

### **Phase 3: IndividualName Configuration**
1. Configure IndividualName with proven weights
2. Parallel test against nameMatchingAnalysis results
3. Validate identical results and performance

**Target Outcome**: IndividualName comparisons use proven algorithm insights while maintaining all the architectural benefits of genericObjectCompareTo.

---

**Last Updated**: November 26, 2025
**Status**: Architecture design complete, ready for implementation
**Next Action**: Begin base class property implementation