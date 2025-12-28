# OtherInfo Systematic Review - FINDINGS

## Purpose
Systematically catalog every location in code where `otherInfo` is initialized, modified, or accessed, organized by entity type. This review informs the proper design for adding assessment/appraisal values to entities.

**Review Date**: December 20, 2025
**Status**: ANALYSIS COMPLETE - RECOMMENDATIONS PENDING USER REVIEW

---

## Phase 1: OtherInfo Class Structure

### 1.1 OtherInfo Properties
**File**: `scripts/objectStructure/contactInfo.js` (lines 420-533)

| Property | Type | Purpose | Default | Source Relevance |
|----------|------|---------|---------|------------------|
| householdInformation | HouseholdInformation | Tracks household membership and role | HouseholdInformation.createDefault() | Both VA and Bloomerang |
| subdivision | Object {pid: entity} | PIDs at same fire number with same owner | null | VisionAppraisal only |
| assessmentValue | string | VisionAppraisal assessment value | null | VisionAppraisal only |
| appraisalValue | string | VisionAppraisal appraisal value | null | VisionAppraisal only |

### 1.2 OtherInfo Subclasses
- **HouseholdOtherInfo** (lines 540-566) - extends OtherInfo
  - Currently has NO additional properties (empty constructor just calls super())
  - Appears to be a placeholder for future household-specific data
  - NOT currently used anywhere in entity creation code

### 1.3 Serialization
- Uses `Info.deserializeBase()` which iterates over all properties generically
- Properties `assessmentValue` and `appraisalValue` handled by the generic "else" branch (lines 169-170)
- OtherInfo is registered in CLASS_REGISTRY (`scripts/utils/classSerializationUtils.js` line 53)

---

## Phase 2: Entity Type Hierarchy

```
Entity (base class)
├── Individual
├── AggregateHousehold (contains individuals[] array)
└── NonHuman
    ├── Business
    └── LegalConstruct
```

**Key Relationships**:
- `AggregateHousehold.individuals[]` contains Individual entities
- Each Individual within a household needs `otherInfo.householdInformation`
- The AggregateHousehold entity itself does NOT need householdInformation

---

## Phase 3: OtherInfo Usage by Data Source

### 3.1 VisionAppraisal Entity Creation

**File**: `scripts/dataSources/visionAppraisalNameParser.js`

#### 3.1.1 createIndividual() (lines 993-1048)
- Creates Individual entity
- **OtherInfo created IF**: `record.assessmentValue || record.appraisalValue`
- **Properties set**: assessmentValue, appraisalValue
- **addOtherInfo called**: Once (line 1016)

#### 3.1.2 createAggregateHousehold() (lines 1050-1102)
**TWO separate OtherInfo creation points**:

1. **For each individual IN the household** (lines 1074-1081):
   - Creates NEW OtherInfo
   - Sets householdInformation via `HouseholdInformation.fromVisionAppraisalData()`
   - Calls `individual.addOtherInfo(otherInfo)` - **THIS REPLACES any existing OtherInfo**

2. **For the household entity itself** (lines 1094-1098):
   - Creates NEW OtherInfo IF assessmentValue or appraisalValue exists
   - Sets assessmentValue, appraisalValue
   - Calls `household.addOtherInfo(householdOtherInfo)`

#### 3.1.3 createBusiness() (lines 1110-1141)
- **OtherInfo created IF**: `record.assessmentValue || record.appraisalValue`
- **Properties set**: assessmentValue, appraisalValue
- **addOtherInfo called**: Once (line 1137)

#### 3.1.4 createLegalConstruct() (lines 1143-1174)
- **OtherInfo created IF**: `record.assessmentValue || record.appraisalValue`
- **Properties set**: assessmentValue, appraisalValue
- **addOtherInfo called**: Once (line 1170)

### 3.2 Bloomerang Entity Creation

**File**: `scripts/bloomerang.js`

#### 3.2.1 Individual entities (lines 804-809)
- **OtherInfo created IF**: `entity.constructor.name === 'Individual'` AND `entity.additionalData.householdData` exists
- **Properties set**: householdInformation (from additionalData.householdData)
- **addOtherInfo called**: Once (line 808)

#### 3.2.2 AggregateHousehold entities
- Created via `processHouseholdMember()` (lines 1258-1350)
- Household entity itself: **NO OtherInfo is created**
- Individual members: OtherInfo created in the main entity processing loop (see 3.2.1)

#### 3.2.3 NonHuman (Business/LegalConstruct)
- **NO OtherInfo created** for Bloomerang NonHuman entities

---

## Phase 4: Post-Creation OtherInfo Modifications

### 4.1 Fire Number Collision Handler
**File**: `scripts/dataSources/fireNumberCollisionHandler.js` (lines 505-508)

When merging entities with same fire number and owner:
```javascript
if (!matchedEntity.otherInfo) {
    matchedEntity.otherInfo = new OtherInfo();
}
matchedEntity.otherInfo.addSubdivisionEntry(newPid, newEntity);
```
- Creates OtherInfo if it doesn't exist
- Adds subdivision entries to track merged PIDs

### 4.2 EntityGroup Consensus Building
**File**: `scripts/objectStructure/entityGroup.js` (lines 167, 186)

- Collects otherInfo from all group members
- Builds consensus OtherInfo via `_buildOtherInfoConsensus()`
- Used for consensus entity, not modifying original entities

---

## Phase 5: OtherInfo Read Access Patterns

### 5.1 householdInformation Access

**CRITICAL FINDING**: 5 locations access `entity.contactInfo?.householdInformation` but householdInformation is stored in `entity.otherInfo.householdInformation`. These appear to be bugs:

| File | Line | Code |
|------|------|------|
| unifiedDatabasePersistence.js | 98 | `entity.contactInfo?.householdInformation` |
| loadAllEntitiesButton.js | 245 | `entity.contactInfo?.householdInformation` |
| loadAllEntitiesButton.js | 328 | `entity.contactInfo?.householdInformation` |
| entityAnalysisToGoogleDrive.js | 257 | `entity.contactInfo?.householdInformation` |
| universalEntityMatcher.js | 899 | `entity.contactInfo?.householdInformation` |

**Correct access pattern**: `entity.otherInfo?.householdInformation`

### 5.2 subdivision Access
- Only accessed in fireNumberCollisionHandler.js
- Used for tracking merged PIDs

### 5.3 assessmentValue/appraisalValue Access
- **Currently NO read access** in the codebase
- Values are written but never read
- Future use will need accessor patterns

---

## Phase 6: Analysis and Recommendations

### 6.1 Entity Type Requirements Matrix

| Entity Type | Source | householdInformation | subdivision | assessmentValue | appraisalValue |
|-------------|--------|---------------------|-------------|-----------------|----------------|
| Individual (standalone) | VA | NO | Possible* | YES | YES |
| Individual (in household) | VA | YES | Possible* | YES | YES |
| AggregateHousehold | VA | NO | Possible* | YES | YES |
| Business | VA | NO | Possible* | YES | YES |
| LegalConstruct | VA | NO | Possible* | YES | YES |
| Individual | Bloomerang | YES | NO | NO | NO |
| AggregateHousehold | Bloomerang | NO | NO | NO | NO |
| NonHuman | Bloomerang | NO | NO | NO | NO |

*Possible via fire number collision handler merging

### 6.2 Identified Bugs

#### BUG 1: OtherInfo Overwrite for Household Individuals (CRITICAL)
**Location**: `visionAppraisalNameParser.js` lines 1074-1081

**Problem Flow**:
1. `createIndividual()` is called, creates OtherInfo with assessmentValue/appraisalValue (line 1016)
2. Individual is passed to `createAggregateHousehold()`
3. Loop at line 1074 creates NEW OtherInfo with householdInformation
4. `individual.addOtherInfo(otherInfo)` at line 1081 **REPLACES** the first OtherInfo
5. **Result**: assessmentValue and appraisalValue are LOST for individuals within households

#### BUG 2: Wrong Property Path for householdInformation Access
**Locations**: 5 files (see Phase 5.1)

**Problem**: Code accesses `entity.contactInfo?.householdInformation` but the property is stored at `entity.otherInfo.householdInformation`

**Impact**: householdInformation lookups always return undefined/null

### 6.3 Root Cause Analysis

The fundamental issue is that the code treats OtherInfo as a **single-purpose container** (via `addOtherInfo()` replacement) but OtherInfo actually holds **multiple independent pieces of data**:
- householdInformation (for individuals in households)
- subdivision (for merged fire number entities)
- assessmentValue/appraisalValue (for property values)

These are **independent data dimensions** that can coexist on the same entity.

### 6.4 Recommended Fix Approach

**Principle**: Each OtherInfo property represents a distinct data dimension. Entity creation code should set properties on a SINGLE OtherInfo instance rather than creating multiple instances.

#### Fix 1: VisionAppraisal Individual Creation
In `createIndividual()`, create OtherInfo unconditionally and set all relevant properties:

```javascript
createIndividual(individualName, record, index) {
    // ... existing code ...

    // Create OtherInfo - will hold property values
    // householdInformation will be added later if this individual joins a household
    const individual = new Individual(...);

    // Always create OtherInfo for VisionAppraisal entities
    const individualOtherInfo = new OtherInfo();
    if (record.assessmentValue) {
        individualOtherInfo.setAssessmentValue(record.assessmentValue);
    }
    if (record.appraisalValue) {
        individualOtherInfo.setAppraisalValue(record.appraisalValue);
    }
    individual.addOtherInfo(individualOtherInfo);

    return individual;
}
```

#### Fix 2: VisionAppraisal Household Individual Processing
In `createAggregateHousehold()`, UPDATE existing OtherInfo rather than replacing:

```javascript
individuals.forEach((individual, idx) => {
    // Get or create OtherInfo
    if (!individual.otherInfo) {
        individual.otherInfo = new OtherInfo();
    }
    // Set householdInformation on existing OtherInfo (preserves assessmentValue/appraisalValue)
    individual.otherInfo.householdInformation = HouseholdInformation.fromVisionAppraisalData(
        householdIdentifierStr,
        householdNameStr,
        idx === 0
    );
    household.individuals.push(individual);
});
```

#### Fix 3: Correct householdInformation Access Path
Change all 5 instances from:
```javascript
entity.contactInfo?.householdInformation
```
To:
```javascript
entity.otherInfo?.householdInformation
```

### 6.5 Implementation Order

1. **Fix Bug 2 first** (wrong access path) - This is a simple search-and-replace that won't affect data
2. **Fix Bug 1** (OtherInfo overwrite) - Requires careful code changes in visionAppraisalNameParser.js
3. **Test** with sample data to verify:
   - Household individuals retain assessmentValue/appraisalValue
   - Household individuals have correct householdInformation
   - Standalone individuals have correct data
   - householdInformation lookups work correctly

### 6.6 Future Considerations

1. **Consider making addOtherInfo() merge rather than replace** - But only AFTER understanding all current usage patterns
2. **HouseholdOtherInfo class is unused** - Could be removed or repurposed
3. **assessmentValue/appraisalValue have no consumers** - Add accessor code when needed

---

## Implementation Status

### Bug 2 Fix: CODED AND VERIFIED (December 20, 2025)
Changed `entity.contactInfo?.householdInformation` to `entity.otherInfo?.householdInformation` in 5 files:

| File | Line | Status |
|------|------|--------|
| unifiedDatabasePersistence.js | 98 | FIXED |
| loadAllEntitiesButton.js | 245 | FIXED |
| loadAllEntitiesButton.js | 328 | FIXED |
| entityAnalysisToGoogleDrive.js | 257 | FIXED |
| universalEntityMatcher.js | 899 | FIXED |

**Verification**: User confirmed `otherInfo.householdInformation` is properly populated for Bloomerang individuals in households with correct `isHeadOfHousehold` values.

### Bug 1 Fix: CODED - AWAITING DATA FOR TESTING (December 20, 2025)
Modified `createAggregateHousehold()` in `visionAppraisalNameParser.js` (lines 1074-1094):
- Changed from creating NEW OtherInfo to UPDATING existing OtherInfo
- Now preserves assessmentValue/appraisalValue when adding householdInformation
- Added diagnostic logging that will confirm fix when new VA data is downloaded

**Testing Required**: Re-download VisionAppraisal PID files (Button 4) to get CSVs with assessment values, then verify:
- Console shows `[OTHERINFO] Preserved assessment/appraisal values for household individual:` messages
- Household individuals have BOTH householdInformation AND assessmentValue/appraisalValue in their otherInfo

---

## Files Modified

| File | Changes |
|------|---------|
| scripts/unifiedDatabasePersistence.js | Bug 2 fix (line 98) |
| scripts/loadAllEntitiesButton.js | Bug 2 fix (lines 245, 328) |
| scripts/matching/entityAnalysisToGoogleDrive.js | Bug 2 fix (line 257) |
| scripts/matching/universalEntityMatcher.js | Bug 2 fix (line 899) |
| scripts/dataSources/visionAppraisalNameParser.js | Bug 1 fix (lines 1074-1094) |

## Next Steps

1. ~~Review this analysis with user~~ DONE
2. ~~Get approval on recommended fix approach~~ DONE
3. ~~Implement fixes in order specified in 6.5~~ DONE
4. Re-download VisionAppraisal data to test Bug 1 fix
5. Remove diagnostic logging after verification
6. Update CLAUDE.md with completed work
