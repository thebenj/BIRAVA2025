# VisionAppraisal Household Individuals Population Problem

**Created**: November 30, 2025
**Context**: Discovered during unified entity browser testing after serialization architecture fixes
**Priority**: HIGH - Blocks proper household member display in unified browser

---

## PROBLEM STATEMENT

VisionAppraisal `AggregateHousehold` entities have **empty `individuals` arrays** in the serialized data stored on Google Drive. This is NOT a serialization/deserialization bug - the arrays are empty at the point of entity creation.

### Root Cause Identified

The `ConfigurableVisionAppraisalNameParser` in `scripts/dataSources/configurableVisionAppraisalNameParser.js` contains 34 case handlers for parsing different name patterns. **Many of these case handlers call `createAggregateHousehold()` with an empty array `[]` for individuals** because the logic to parse individual names from complex patterns was never fully implemented.

### Evidence from Code Analysis

Cases that pass **empty individuals arrays**:
- Line 270 (Case 30): `return this.createAggregateHousehold(householdName, [], record, index);`
- Line 482: `return this.createAggregateHousehold(householdName, [], record, index);`
- Line 498 (Case 17): `return this.createAggregateHousehold(householdName, [], record, index);`
- Line 546 (Case 16): `return this.createAggregateHousehold(householdName, [], record, index);`
- Line 585 (Case 26): `return this.createAggregateHousehold(householdName, [], record, index);`
- Line 602 (Case 27): `return this.createAggregateHousehold(householdName, [], record, index);`
- Line 619 (Case 28): `return this.createAggregateHousehold(householdName, [], record, index);`
- Line 636 (Case 29): `return this.createAggregateHousehold(householdName, [], record, index);`
- Line 762 (Case 11): `return this.createAggregateHousehold(householdName, [], record, index);`

Cases that **properly create individuals**:
- Line 133 (Case 5): Creates single individual - `[individual]`
- Line 254: Creates individuals array from parsed names
- Line 409: Creates two individuals - `[individual1, individual2]`

### Verification

Console test confirmed the issue:
```javascript
const households = vaEntities.filter(e => e.constructor.name === 'AggregateHousehold');
// Total AggregateHouseholds: 926
// Sample individuals array: []
// Sample individuals length: 0
```

Raw JSON on disk for Benjamin household:
```json
"individuals": [],
```

---

## CONTEXT IN LARGER PROJECT

### How This Issue Was Discovered

1. Serialization architecture was unified (VisionAppraisal and Bloomerang both use `serializeWithTypes`)
2. Entity loading was fixed and verified working (2317 VisionAppraisal + 1788 Bloomerang = 4105 total)
3. Unified entity browser was tested
4. Household detail view showed wrong individuals (fallback search matched by location/address incorrectly)
5. Investigation revealed `individuals` array was empty in deserialized entities
6. Checked serialized file on disk - `individuals` array is empty at source
7. Traced to parser code - many case handlers never populate individuals

### Related Serialization Work (Now Verified Working)

This session also fixed multiple serialization issues:
- `AggregateHousehold.deserialize` - handles already-transformed individuals from JSON reviver
- `Info.deserializeBase` - removed incorrect IndicativeData wrapping
- `Entity.deserialize` - removed IdentifyingData/IndicativeData wrappers
- Entity type detection - fixed to use `constructor.name` instead of `.type`
- All 4105 entities now load successfully

---

## RESOLUTION APPROACH

### Option 1: Fix VisionAppraisal Parser (SELECTED)

Modify `configurableVisionAppraisalNameParser.js` to:
1. Parse individual names from the `owner1` field for each case
2. Create `Individual` entity objects for each parsed name
3. Pass the individuals array to `createAggregateHousehold()`

This is the correct architectural approach - the data should be populated at creation time.

### Option 2: Unified Browser Workaround (NOT SELECTED)

The `findHouseholdMembers()` function in `entityRenderer.js` was attempting a fallback search by location ID and address. This was:
- Producing incorrect matches (e.g., matching unrelated individuals with similar addresses)
- Architecturally wrong - relationships should be stored, not inferred

### Bloomerang Household Members

Bloomerang has a different but correct pattern:
- Individuals have `householdData.householdName` property
- Individuals have `householdData.isInHousehold` = "TRUE"
- Lookup should match by household name, not imprecise search

This should also be fixed in the unified browser to use explicit data, not search.

---

## IMPLEMENTATION PLAN

### Phase 1: Analyze Name Patterns

1. Review each case handler in configurableVisionAppraisalNameParser.js
2. Document the name pattern each case handles
3. Determine how to extract individual names from each pattern

### Phase 2: Implement Individual Parsing

For each case that currently passes `[]`:
1. Parse the `owner1` field to extract individual name(s)
2. Create `Individual` entities with proper `IndividualName` structures
3. Pass to `createAggregateHousehold()`

### Phase 3: Reprocess VisionAppraisal Data

1. Run `processAllVisionAppraisalRecordsWithAddresses()`
2. This will create new entity file with populated individuals arrays
3. Verify in unified browser

### Phase 4: Fix Unified Browser for Bloomerang

Update `findHouseholdMembers()` to:
1. First check `household.individuals` array (for VisionAppraisal)
2. For Bloomerang, search individuals by `householdData.householdName` match
3. Remove the imprecise location/address fallback search

---

## FILES INVOLVED

### Parser (needs modification)
- `scripts/dataSources/configurableVisionAppraisalNameParser.js` - Main parser with case handlers

### Reference Parser
- `scripts/dataSources/visionAppraisalNameParser.js` - Older parser, some cases properly implemented

### Entity Classes (verified working)
- `scripts/objectStructure/entityClasses.js` - AggregateHousehold.individuals properly serializes/deserializes

### Unified Browser (needs modification for Bloomerang)
- `scripts/entityRenderer.js` - findHouseholdMembers() function

---

## SUCCESS CRITERIA

1. VisionAppraisal AggregateHousehold entities have populated `individuals` arrays
2. Unified browser shows correct household members for VisionAppraisal records
3. Unified browser shows correct household members for Bloomerang records (using householdData)
4. No false positive matches from imprecise location/address searching
