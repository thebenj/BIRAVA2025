# VisionAppraisal Tag Preprocessing Implementation Plan

**Created**: 2025-11-16
**Last Updated**: 2025-11-18
**Status**: Completed - Implementation finished
**Purpose**: Implementation plan for VisionAppraisal tag preprocessing to fix address parsing corruption
**Current Implementation**: See reference_sessionTechnicalKnowledge.md for actual implementation details including recipient details extraction
**Pipeline Step**: Address Processing Enhancement - Step 1C Entity Creation Improvement

## **Context Understanding:**
- **Current Issue**: VisionAppraisal addresses contain tags (`:^#^:` and `::#^#::`) that are passed raw to parseAddress.parseLocation(), causing parsing corruption
- **Validated Solution**: COMMA_NEWLINE strategy (`:^#^:` → `,`, `::#^#::` → `\n`) produces clean parsing with 100% street type extraction
- **Integration Points**: 3 locations in production code call processAddress() with VisionAppraisal data
- **Current Pipeline**: Raw data → Processed data → Entities with addresses (Step 1C uses processAllVisionAppraisalRecordsWithAddresses())

## **Experimental Validation Results:**
- **COMMA_NEWLINE Strategy Performance**: 100% street type extraction, 80% city extraction
- **Current BROKEN baseline**: City corruption ("FLOOR##NEW YORK"), sec_unit_type confusion
- **Space strategies**: Field contamination (street becomes "3RD AVE  11TH")
- **Comma strategies**: Clean field separation, proper secondary unit parsing

## **Integration Points Identified:**
1. **visionAppraisalNameParser.js:899** - `processAddress(record.propertyLocation, 'VisionAppraisal', 'propertyLocation')`
2. **visionAppraisalNameParser.js:911** - `processAddress(record.ownerAddress, 'VisionAppraisal', 'ownerAddress')`
3. **entityClasses.js:156** - `processAddress(addressText, 'VisionAppraisal', fieldName)`

## **Phase 1: Create Tag Preprocessing Foundation**
1. **Build tag conversion utility in addressProcessing.js**
   - Add `cleanVisionAppraisalTags(addressString)` function above processAddress()
   - Implement COMMA_NEWLINE strategy: `:^#^:` → `,`, `::#^#::` → `\n`
   - Add comprehensive unit tests with console validation
   - Test with sample tagged addresses before integration

## **Phase 2: Strategic Integration Point**
2. **Modify processAddress() function for VisionAppraisal source detection**
   - Add conditional preprocessing when sourceType === 'VisionAppraisal'
   - Apply cleanVisionAppraisalTags() before parseAddress.parseLocation() call
   - Preserve original tagged addressString in processedAddress.originalAddress
   - Add feature flag for easy rollback during testing

## **Phase 3: Incremental Validation**
3. **Test with existing pipeline using processAllVisionAppraisalRecordsWithAddresses()**
   - Run Step 1C with preprocessing enabled on small subset first
   - Compare address parsing quality before/after using Entity Browser
   - Verify no regression in existing fields (streetNumber, streetName, etc.)
   - Validate that originalAddress field still contains tags for analysis

## **Phase 4: Street Type Analysis Validation**
4. **Re-run street type pattern analysis with improved addresses**
   - Execute analyzeStreetTypePatternsCorrect() on preprocessed entities
   - Compare end-word vs non-end-word percentages (expect improvement from current 59.6%/39.3%)
   - Validate NECK → Nck and other problematic transformations are resolved
   - Document parsing quality improvements

## **Phase 5: Full Production Integration**
5. **Deploy to complete VisionAppraisal processing pipeline**
   - Remove feature flag and enable preprocessing by default
   - Re-process all 2,317 VisionAppraisal records through Step 1C
   - Update entities in Google Drive (File ID: 19cgccMYNBboL07CmMP-5hNNGwEUBXgCI)
   - Verify integration with existing Block Island address processing system

## **Phase 6: Return to Main Plan Objectives**
6. **Resume Fire Number → PID relationship analysis with improved data**
   - Proceed with Level 1 analysis using higher-quality address parsing
   - Enhanced address data should improve name/address comparison accuracy
   - Continue toward main VisionAppraisal ↔ Bloomerang integration goal

## **Expected Outcomes:**
- Significantly improved address parsing quality for all VisionAppraisal addresses
- Better street type extraction supporting Block Island-specific rules
- Enhanced data quality for Fire Number → PID relationship analysis
- Preservation of original tagged data for continued analysis capabilities
- Foundation for completing main integration objectives

## **Critical Implementation Notes:**
- **Mandatory Testing Protocol**: ONE change → immediate test → verify → proceed
- **Tag Semantics Preservation**: `:^#^:` (line break substitute) vs `::#^#::` (field delimiter) semantic meaning preserved
- **Backward Compatibility**: Original tagged addresses preserved in originalAddress field
- **Integration Points**: All 3 processAddress() calls with 'VisionAppraisal' sourceType will be enhanced

## **Reference Dependencies:**
- **Experimental Results**: parseAddressTagExperiment.js results showing COMMA_NEWLINE superiority
- **Current Pipeline**: reference_integrationWorkflow.md Step 1C entity creation process
- **Address Processing**: scripts/address/addressProcessing.js processAddress() function
- **Tag Creation Logic**: scripts/core/visionAppraisalProcessing.js lines 205-207