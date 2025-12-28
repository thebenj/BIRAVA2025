# Block Island Address Processing Migration Plan - Approved

**Plan Status**: Approved - Ready for Implementation
**Session Date**: November 12, 2025
**Context**: Migration from single-variable dual-purpose logic to two-variable, two-path system

## Overview
Migrate from single-variable dual-purpose logic to two-variable, two-path system for Block Island address processing with proper Address class integration and console output management.

## New Variable Design
- `isBlockIslandAddress`: true when address IS a Block Island address (pure identification)
- `needsBlockIslandForcing`: true when address IS Block Island AND needs completion (missing city/state/zip)

## Two Processing Paths
- **Path A**: Block Island addresses → specialized instantiation with database street matching
- **Path B**: Non-Block Island addresses → current processing logic

---

## Phase 0: Console Output Management

### Step 0.1: Audit and Reduce Legacy Console Logs
**Location**: `addressProcessing.js` throughout
**Action**: Remove/comment out diagnostic console.logs not needed for current development
**Specific Lines**: Lines 76, 89, 90, 164, 167 and similar diagnostic messages
**Testing**: Verify functionality unchanged, output significantly reduced

### Step 0.2: Implement Quiet Mode Support
**Location**: `processAddress()` function signature (line 75)
**Change**: Add `quietMode = false` parameter: `function processAddress(addressString, sourceType = 'unknown', fieldName = null, quietMode = false)`
**Integration**: Pass quietMode through to `VisionAppraisal.loadProcessedDataFromGoogleDrive()` and entity processing
**Testing**: Verify quiet mode suppresses all non-essential output

---

## Phase 1: Introduce New Variables and Enhanced Detection

### Step 1.1: Add New Variables to createProcessedAddressObject()
**Location**: Lines 68-70 in `createProcessedAddressObject()`
**Change**: Add alongside existing `isBlockIslandAddress`:
```javascript
needsBlockIslandForcing: false,
blockIslandDetectionMethod: null  // Track how it was detected
```
**Testing**: Verify existing functionality unchanged

### Step 1.2: Create Comprehensive Block Island Detection Function
**Location**: New function after `createProcessedAddressObject()`
**Function**: `detectBlockIslandAddress(parsed, addressString, sourceType, fieldName)`
**Logic**:
- ZIP detection: `parsed.zip === '02807'`
- City detection: `parsed.city === 'Block Island' || parsed.city === 'New Shoreham'`
- Street database matching: use existing street database logic from precheck
- VisionAppraisal property assumption: `sourceType === 'VisionAppraisal' && fieldName === 'propertyLocation'`
- Return: `{isBI: boolean, needsForcing: boolean, method: string, matchedStreet: string|null}`

**Testing**: Test with known Block Island and non-Block Island addresses

### Step 1.3: Replace Current Detection Logic
**Location**: Lines 155-160 (after normalizeBlockIslandCity)
**Change**: Replace `createProcessedAddressObject()` call with detection-enhanced version using new function
**Testing**: Verify new variables set correctly for all address types

---

## Phase 2: Fix VisionAppraisal Owner Address Logic

### Step 2.1: Remove Owner Address Auto-Forcing
**Location**: `enhanceAddressWithBlockIslandLogic()` Rule 1 (lines 226-244)
**Change**: Modify condition to only apply to propertyLocation:
```javascript
if (sourceType === 'VisionAppraisal' && fieldName === 'propertyLocation' && needsBlockIslandForcing)
```
**Testing**: Verify VisionAppraisal owner addresses not auto-forced

### Step 2.2: Add Owner Address Evidence-Based Detection
**Location**: Within new detection function (Phase 1.2)
**Logic**: Owner addresses require actual evidence (zip/city/street match), no assumptions
**Testing**: Test with real VisionAppraisal data - property vs owner addresses

---

## Phase 3: Implement Two-Path Processing

### Step 3.1: Create Block Island Address Builder Function
**Location**: New function in `addressProcessing.js`
**Function**: `createBlockIslandAddress(parsed, originalString, sourceType, fieldName, matchedStreet)`
**Implementation**:
- `originalAddress`: originalString
- `streetNumber`: parsed.number
- `streetName`: matchedStreet from database (longest match, trimmed)
- `streetType`: parsed.type (analyze cases in Phase 5)
- Force completion: `city: 'Block Island', state: 'RI', zip: '02807'`
- Set flags: `isBlockIslandAddress: true, cityNormalized: true`
- Metadata: `processedAt`, `sourceType`, `blockIslandReason`

**Testing**: Test street name preservation, compare with current logic

### Step 3.2: Add Path Decision Logic
**Location**: Replace current `enhanceAddressWithBlockIslandLogic()` call (line 165)
**Logic**:
```javascript
if (detectionResult.isBI) {
    return createBlockIslandAddress(parsed, addressString, sourceType, fieldName, detectionResult.matchedStreet);
} else {
    // Path B: Continue with existing non-BI logic
    return createProcessedAddressObject(normalized, addressString, sourceType, fieldName);
}
```

**Testing**: Verify both paths execute correctly

---

## Phase 4: Address Class Integration

### Step 4.1: Analyze Address.fromProcessedAddress() Requirements
**Location**: `scripts/objectStructure/aliasClasses.js` around line 1295
**Action**: Review what properties Address class expects from processedAddress objects
**Ensure**: New Block Island path provides all required properties

### Step 4.2: Update Address Class Constructor
**Location**: Address class `fromProcessedAddress()` method
**Change**: Handle new variable structure and ensure proper AttributedTerm creation
**Testing**: Create Address objects from both Path A and Path B results

### Step 4.3: Test Entity Integration
**Location**: `entityClasses.js` `_processTextToAddress()` method
**Testing**: Ensure entity constructors work with new Address objects from both paths

---

## Phase 5: PO Box and Street Type Analysis

### Step 5.1: Analyze PO Box Handling
**Method**: Test parse-address library behavior with PO Box addresses from real VisionAppraisal data
**Goal**: Understand how `parseAddress.parseLocation()` handles PO Boxes
**Action**: Create diagnostic test to catalog PO Box parsing results
**Plan Adjustment**: Based on results, add PO Box handling to appropriate path

### Step 5.2: Catalog Street Type Cases
**Method**: Run diagnostic on real VisionAppraisal data to catalog `parsed.type` variations
**Goal**: Understand all street type values and decide handling strategy
**Action**: Create comprehensive street type analysis before finalizing Block Island path logic

---

## Phase 6: Remove Duplicate Logic and Cleanup

### Step 6.1: Remove enhanceAddressWithBlockIslandLogic()
**Location**: Lines 224-287
**Change**: Function becomes obsolete as logic moves to detection and path functions
**Testing**: Ensure all enhancement logic preserved in new functions

### Step 6.2: Remove Unused Precheck Variables
**Location**: Lines 132-147
**Change**: Remove `blockIslandPrecheckResult` as logic integrated into detection function
**Testing**: Verify street matching still works

### Step 6.3: Clean Up Variable Names
**Change**: Remove old dual-purpose `isBlockIslandAddress` from intermediate processing
**Keep**: Final `isBlockIslandAddress` in Address objects for pure identification

---

## Phase 7: Error Handling and Edge Cases

### Step 7.1: Add Fallback Logic
**Cases**:
- `window.blockIslandStreets` not loaded: default to zip/city detection only
- Parse failure: return null with appropriate error logging
- Invalid input: proper validation and error messages

### Step 7.2: Add Comprehensive Testing
**Test Scenarios**:
- Addresses with missing components
- Malformed addresses
- Edge cases from real data
- Performance with large datasets

---

## Testing Strategy
- **Phase Testing**: Each phase tested independently before proceeding
- **Real Data Validation**: Use actual VisionAppraisal records throughout
- **Regression Testing**: Ensure existing functionality preserved
- **Performance Testing**: Verify processing speed maintained
- **Console Output Testing**: Verify quiet mode and reduced diagnostics work

## Validation Checkpoints
- Console output significantly reduced in normal operation
- Quiet mode suppresses all non-essential output
- Block Island addresses correctly identified via new variables
- VisionAppraisal owner addresses not auto-forced to Block Island
- Both processing paths work with Address class integration
- PO Box handling properly analyzed and implemented
- Street type analysis informs final implementation
- All error scenarios handled gracefully

## Implementation Notes
- Each step must be tested before proceeding
- Real VisionAppraisal data used for validation at each phase
- Console output management implemented first to improve development experience
- Address class integration cannot be skipped - essential for entity system
- PO Box and street type analysis must inform implementation, not be assumed

This plan addresses all identified issues including Address class integration, console output management, proper error handling, and evidence-based detection while maintaining the principle of small, testable incremental changes.