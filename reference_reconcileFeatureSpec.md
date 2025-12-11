# Reconcile Feature Specification

## Document Purpose
This specification captures the requirements and architecture for the Reconcile button feature in the Analyze Matches window. Created to preserve knowledge across sessions after code was reverted due to syntax errors.

## Feature Overview

### User Story
When viewing match analysis results for an entity, each match row should have a "Reconcile" button that displays a complete breakdown of how the similarity score was calculated between the base entity and the target entity on that row.

### Example Use Case
- Base entity: VisionAppraisal Individual "LESLIE J PARSONS" (va_2079, Fire Number 222)
- Target entity: VisionAppraisal Business "BLOCK ISLAND UTILITY DISTRICT" (va_306, Fire Number 8)
- Similarity: 63.7%
- The Reconcile button should explain exactly how 63.7% was calculated

---

## Architecture Decisions

### 1. Entity Lookup Architecture
**Principle**: Single canonical lookup path using `source + locationIdentifier`

**Implementation** (in `loadAllEntitiesButton.js`):
- `buildEntityLookupIndex()` - Called at load time, builds `workingLoadedEntities.entityIndex`
- Index key format: `{source}:{locationId}` (e.g., "visionAppraisal:222", "bloomerang:1917")
- `getEntityBySourceAndLocationId(source, locationId)` - O(1) lookup function
- `getLocationIdentifierValue(entity)` - Helper to extract locationId from entity

**CRITICAL**: No fallbacks, no searching, no guessing. If lookup fails, it's an error.

**FORBIDDEN PATTERNS**:
- `targetStorageKey || targetKey` (guessing between keys)
- Searching through entities to find a match
- Multiple key types with fallback logic

### 2. Single Source of Truth for Comparisons
**Principle**: `universalCompareTo` performs ALL calculations; reconciliation only DISPLAYS results

**Implementation**:
- `universalCompareTo(baseEntity, targetEntity)` returns enriched results
- `performDetailedReconciliation()` calls `universalCompareTo` and formats the display
- Reconciliation does NOT recalculate - it extracts from comparison results

### 3. Enriched Comparison Returns
The comparison functions return detailed sub-component information:

**`contactInfoWeightedComparison`** (in utils.js) returns:
```javascript
{
  overallSimilarity: 0.85,
  components: { ... },
  addressMatch: {
    baseAddress: Address,      // Actual Address object used
    targetAddress: Address,    // Actual Address object matched
    similarity: 0.905,
    direction: 'base-to-target' // or 'target-to-base'
  }
}
```

**`entityWeightedComparison`** (in utils.js) returns:
```javascript
{
  overallSimilarity: 0.637,
  components: { ... },
  subordinateDetails: {
    name: { similarity, weight, contribution, ... },
    contactInfo: {
      similarity, weight, contribution,
      addressMatch: { baseAddress, targetAddress, similarity }
    }
  }
}
```

### 4. Household-to-Household Comparison
**Principle**: When comparing AggregateHousehold entities, the comparison finds the best-matching individual pair

**Implementation**:
- `universalCompareTo` for household-to-household returns:
  - `matchedIndividual1` - Individual from base household
  - `matchedIndividual2` - Individual from target household
  - `matchedIndividualIndex1` - Index in base.individuals array
  - `matchedIndividualIndex2` - Index in target.individuals array
- Reconciliation display shows WHICH individuals were matched

---

## UI Specification

### Reconcile Button
- Location: Each match row in the Analyze Matches window
- Style: Purple theme (to distinguish from blue View button)
- OnClick: `reconcileMatch(baseEntityInfo, targetKey, targetSource)`

### Reconciliation Modal
Displays:
1. **Header**: Both entity names, types, sources, keys
2. **Final Score**: Large, prominent display of overall similarity
3. **Name Comparison Section**:
   - Both name strings side-by-side
   - Name similarity score
   - Comparison method (same-type compareTo vs cross-type levenshtein)
   - Sub-components if available (lastName, firstName, etc.)
4. **ContactInfo Comparison Section**:
   - Addresses that were matched (actual Address objects)
   - Address similarity score
   - Sub-components (streetNumber, streetName, city, state, zip)
5. **Formula Section**:
   - Shows exact calculation: `Name × weight + ContactInfo × weight = Total`

---

## Functions to Implement in unifiedEntityBrowser.js

### reconcileMatch(baseEntityInfo, targetKey, targetSource)
Entry point called by button onclick.
1. Look up base entity using `getEntityBySourceAndLocationId()`
2. Look up target entity using `getEntityBySourceAndLocationId()`
3. Call `performDetailedReconciliation(baseEntity, targetEntity)`
4. Display modal with results

### performDetailedReconciliation(baseEntity, targetEntity)
**CRITICAL**: Does NOT recalculate. Calls universalCompareTo and extracts information.

1. Call `universalCompareTo(baseEntity, targetEntity)`
2. Extract from result:
   - Overall score
   - Name comparison details (from `details.components.name` or `subordinateDetails.name`)
   - ContactInfo comparison details (from `details.components.contactInfo` or `subordinateDetails.contactInfo`)
   - Matched addresses (from `addressMatch`)
   - For households: matched individuals (from `matchedIndividual1`, `matchedIndividual2`)
3. Return structured object for display

### displayReconciliationModal(reconciliationData)
Creates and displays the modal with the reconciliation breakdown.

---

## Files Modified

### loadAllEntitiesButton.js
**Status**: Changes should still be in place (not reverted)
- `buildEntityLookupIndex()` - builds entityIndex
- `getEntityBySourceAndLocationId()` - lookup function
- `getLocationIdentifierValue()` - helper

### utils.js
**Status**: Changes should still be in place (not reverted)
- `contactInfoWeightedComparison` - returns `addressMatch`
- `entityWeightedComparison` - returns `subordinateDetails`

### unifiedEntityBrowser.js
**Status**: REVERTED - needs re-implementation
- `reconcileMatch()` - needs to be added
- `performDetailedReconciliation()` - needs to be added
- `displayReconciliationModal()` - needs to be added
- Reconcile button in `generateUniversalMatcherResultsHtml()` - needs to be added

### universalEntityMatcher.js
**Status**: Changes should still be in place
- `targetKey` documented as locationIdentifier value
- `targetSource` included in match results
- Removed `getEntityStorageKey()` and `targetStorageKey`

---

## Verification Checklist Before Implementation

### Verified December 7, 2025:

1. [x] `buildEntityLookupIndex` exists in loadAllEntitiesButton.js
   - Line 189: function definition
   - Line 154: called at end of loadAllEntitiesIntoMemory()
   - Line 306: exported to window.buildEntityLookupIndex

2. [x] `getEntityBySourceAndLocationId` exists in loadAllEntitiesButton.js
   - Line 261: function definition
   - Line 304: exported to window.getEntityBySourceAndLocationId

3. [x] `addressMatch` is returned by contactInfoWeightedComparison in utils.js
   - Line 1084: `const addressMatch = {`
   - Line 1095: `addressMatch: addressMatch` in return object

4. [x] `subordinateDetails` is returned by entityWeightedComparison in utils.js
   - Line 1307: `subordinateDetails: {` in return object

5. [x] `targetSource` is included in match results from universalEntityMatcher.js
   - Line 389: `const targetSource = getEntitySource(targetEntity);`
   - Line 405: `targetSource,` included in result object

6. [ ] Test that entityIndex is built when clicking "Load All Entities Into Memory"
   - NOT YET TESTED - requires browser test

---

## Critical Lesson Learned

**The Syntax Error Problem**:
When adding JavaScript code inside a template literal's `<script>` block, using `${...}` interpolations can cause parsing issues. The original code had a `<script>` block with NO interpolations - adding them broke parsing.

**Solution for re-implementation**:
- Do NOT use `${function()}` interpolations inside `<script>` blocks in template literals
- Either: Use the existing pattern of pre-serializing data with `escapedJson` (like `generateEntityExplorerScripts` does)
- Or: Keep the script block completely static and pass data via a different mechanism

---

## Session Recovery Notes

Created: December 7, 2025
Context: Code was reverted after syntax errors caused by autocompact mid-edit
This document preserves the architecture decisions and requirements for future sessions
