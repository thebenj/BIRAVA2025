# Bloomerang Household Member Population Investigation

**Created**: January 7, 2026
**Session**: 28
**Status**: INVESTIGATION COMPLETE - All issues resolved, diagnostics removed
**Priority**: CLOSED

---

## PROBLEM STATEMENT

### Problem 1: Missing Household Member - RESOLVED

**Original Symptom**: The Bloomerang household entity for "Michael & M. Allison Anderson" contained only Mary Allison Anderson in its `individuals[]` array. Michael Anderson was missing.

**Root Cause Identified**: CSV parsing bug. The transaction amount field (column G, field 6) contains quoted currency values with embedded commas like `"$1,500.00"`. The simple `line.split(',')` parser was not handling quoted CSV fields, causing the comma in `"$1,500.00"` to split into two fields:
- Field 6: `"$1`
- Field 7: `500.00 "`

This shifted all subsequent fields by one position, so Michael's row had:
- Field 8 (should be `isInHousehold`): `"12/30/2013"` (transaction date)
- Field 28 (should be `householdName`): empty

Result: Michael was incorrectly classified as `Individual` (not household member) because `isInHousehold` read `"12/30/2013"` instead of `"TRUE"`.

**Fix Applied**: Added targeted pre-processing in CSV parsing to handle quoted currency amounts:
```javascript
// Fix quoted currency amounts: replace "$X,XXX.XX" pattern (remove comma inside quotes)
const fixedLine = line.replace(/"(\$[\d,]+\.\d{2})\s*"/g, (match, amount) => {
    return amount.replace(/,/g, '');
});
```

**Files Modified**:
- `scripts/bloomerang.js` line 236-239 (main processing function)
- `scripts/bloomerang.js` line 462-465 (duplicate processing function)

**Verification**: After fix, diagnostic output shows:
- Michael Anderson now has `isInHousehold: true`
- Michael has `householdIdentifier: 1637AH`
- Michael has `parentKey` set to household key
- Michael and Mary both have correct `siblingKeys` pointing to each other
- Household now has key `1637AH` (Michael's account, as head of household)

### Problem 2: Location Information Mismatch - RESOLVED

**Observed Symptom**: During previous investigation of household pulling functionality, user noticed discrepancies between:
- Location information stored in the `AggregateHousehold` entity's description of household members
- Location information stored in the actual `Individual` member entities

**Investigation Findings**:
- Diagnostic comparison of `household.individuals[]` vs top-level Individual entities showed **NO data mismatches**
- 428 households checked, 768 nested individuals compared - all data consistent
- The nested individuals in `household.individuals[]` are separate object copies (due to serialization/deserialization), but their data matches the top-level entities
- Root cause of original concern was likely the CSV parsing bug (Problem 1) which has been fixed

**Architectural Enhancement Implemented**:
Added `individualKeys[]` property to AggregateHousehold entities. This provides key-based navigation from households to their members:
- `household.individualKeys`: Array of database keys for member individuals
- Symmetric with existing `individual.parentKey` (points to household)
- Enables navigation without relying on potentially stale nested object copies

**Files Modified**:
- `scripts/unifiedDatabasePersistence.js`: Added fourth pass in `buildUnifiedEntityDatabase()` to populate `individualKeys[]`

**Status**: RESOLVED - No data integrity issues found, architecture improved with `individualKeys[]`

---

## DIAGNOSTIC LOGGING - REMOVED

**All diagnostic logging has been removed** as of January 7, 2026 after successful investigation completion.

### Previously In Place (Now Removed):

**Pattern 1 - ANDERSON DIAG**: Logs for Anderson household tracking
```
[ANDERSON DIAG]
```

**Pattern 2 - MICHAEL DIAG**: Logs specifically for Michael Anderson (account 1637)
```
[MICHAEL DIAG]
```

**Pattern 3 - DIAGNOSTIC**: General diagnostic logging
```
[DIAGNOSTIC]
```

### Files with Diagnostic Logging:

| File | Function | Line Numbers | Diagnostic Type | What It Logs |
|------|----------|--------------|-----------------|--------------|
| `scripts/bloomerang.js` | `determineEntityType()` | 1087-1096, 1113-1118 | MICHAEL DIAG | Entity type determination for account 1637 |
| `scripts/bloomerang.js` | `processHouseholdMember()` | 1324-1431 | ANDERSON DIAG | Household creation/member addition |
| `scripts/bloomerang.js` | `aggregateEntitiesIntoCollections()` | 1910-1920 | ANDERSON DIAG | Final household state before serialization |
| `scripts/unifiedDatabasePersistence.js` | `buildUnifiedEntityDatabase()` | 272-288 | ANDERSON DIAG | First pass - household key mapping |
| `scripts/unifiedDatabasePersistence.js` | `buildUnifiedEntityDatabase()` | 323-341 | ANDERSON DIAG | Second pass - individual to household mapping |
| `scripts/unifiedDatabasePersistence.js` | `buildUnifiedEntityDatabase()` | 371-381 | ANDERSON DIAG | Third pass - parentKey/siblingKeys assignment |

### To Remove Diagnostics (When Ready):

**Option 1 - Grep and manual removal**:
```bash
grep -n "ANDERSON DIAG\|MICHAEL DIAG\|\[DIAGNOSTIC\]" scripts/bloomerang.js scripts/unifiedDatabasePersistence.js
```

**Option 2 - Specific blocks to remove**:

In `bloomerang.js`:
1. Lines 1087-1096 (determineEntityType MICHAEL DIAG block 1)
2. Lines 1113-1118 (determineEntityType MICHAEL DIAG block 2)
3. Lines 1324-1329 + 1335-1341 + 1354-1360 + 1362, 1370 + 1394-1397, 1412 (processHouseholdMember ANDERSON DIAG)
4. Lines 1910-1920 (aggregateEntitiesIntoCollections ANDERSON DIAG)

In `unifiedDatabasePersistence.js`:
1. Lines 272-288 (first pass ANDERSON DIAG)
2. Lines 323-341 (second pass ANDERSON DIAG)
3. Lines 371-381 (third pass ANDERSON DIAG)

---

## ARCHITECTURE UNDERSTANDING

### Complete Bloomerang Processing Pipeline

#### Stage 1: CSV Processing (bloomerang.js)

**Entry Point**: `readBloomerangWithEntities(true)` triggered by "Process Bloomerang CSV" button

**File**: `scripts/bloomerang.js`

**Data Source**: `servers/Results/All Data.csv` (30 fields per row)

**CSV Parsing** (lines 232-247):
```javascript
// Parse CSV rows
// Pre-process: Fix quoted currency amounts in column G (field 6) that contain commas
// e.g., "$1,500.00" becomes "$1500.00" to prevent comma-split issues
const rows = lines.slice(1).map((line, index) => {
    // Fix quoted currency amounts: replace "$X,XXX.XX" pattern (remove comma inside quotes)
    const fixedLine = line.replace(/"(\$[\d,]+\.\d{2})\s*"/g, (match, amount) => {
        return amount.replace(/,/g, '');
    });
    const fields = fixedLine.split(',').map(field => field.replace(/\^#C#\^/g, ',').trim());
    // ...
});
```

**Critical Variable**: `households` is a `Map<string, {household: AggregateHousehold, accountNumber: string}>` keyed by household NAME (field 29).

#### Stage 2: Row-to-Entity Processing

**Function**: `processRowToEntity()` (lines 718-826)

**Field Map** (lines 727-758):
```javascript
const fieldMap = {
    name: 0,           // Field 1: Name
    firstName: 1,      // Field 2: First Name
    middleName: 2,     // Field 3: Middle Name
    lastName: 3,       // Field 4: Last Name
    email: 4,          // Field 5: Primary Email Address
    accountNumber: 5,  // Field 6: Account Number
    transactionAmount: 6, // Field 7: First Transaction Amount  ← THE PROBLEMATIC FIELD
    transactionDate: 7,   // Field 8: First Transaction Date
    isInHousehold: 8,  // Field 9: Is in a Household
    // ... fields 10-25 ...
    householdName: 28, // Field 29: Household Name
    isHeadOfHousehold: 29 // Field 30: Is Head of Household
};
```

#### Stage 3: Household Member Processing

**Function**: `processHouseholdMember()` (lines 1295-1431)

**Key behavior**:
- If `households.has(householdName)` → add individual to existing household
- Else → create new household with FIRST member's account number + "AH"

#### Stage 4: Collection Aggregation

**Function**: `aggregateEntitiesIntoCollections()` (lines 1866-1955)

#### Stage 5: Unified Database Building

**Function**: `buildUnifiedEntityDatabase()` in `scripts/unifiedDatabasePersistence.js` (lines 129-390)

**Three passes**:
1. First pass: Build `householdIdentifierToKey` map (householdId → database key)
2. Second pass: Build `householdIdentifierToIndividualKeys` (householdId → array of individual keys)
3. Third pass: Set `parentKey` and `siblingKeys` on each individual

---

## DIAGNOSTIC OUTPUT SHOWING FIX WORKED

### Before Fix (Problem):
```
[MICHAEL DIAG] determineEntityType called:
  accountNumber: 1637
  firstName: "Michael", middleName: "", lastName: "Anderson"
  isInHousehold (field 8): "12/30/2013"     ← WRONG - should be "TRUE"
  householdName (field 28): ""               ← WRONG - should be "Michael & M. Allison Anderson"
[MICHAEL DIAG] Will return: Individual       ← WRONG - should be AggregateHousehold
```

### After Fix (Working):
```
[ANDERSON DIAG] buildUnifiedEntityDatabase SECOND PASS - Individual found:
  Database key: bloomerang:1637:SimpleIdentifiers:65 Essex Rd, Summit, NJ, 07901:head
  Individual name: "Michael Anderson"
  isInHousehold: true                        ← CORRECT
  householdInformation.householdName: "Michael & M. Allison Anderson"  ← CORRECT
  householdInformation.householdIdentifier: 1637AH
  Maps to household key: bloomerang:1637AH:SimpleIdentifiers:65 Essex Rd, Summit, NJ, 07901:na

[ANDERSON DIAG] buildUnifiedEntityDatabase THIRD PASS - Setting references:
  Individual key: bloomerang:1637:SimpleIdentifiers:65 Essex Rd, Summit, NJ, 07901:head
  Individual name: "Michael Anderson"
  parentKey SET TO: bloomerang:1637AH:SimpleIdentifiers:65 Essex Rd, Summit, NJ, 07901:na
  siblingKeys SET TO: bloomerang:976:SimpleIdentifiers:55 Essex Rd, Summit, NJ, 07901:member
```

---

## RELATED DOCUMENTATION

- **Primary System Docs**: `reference_systemDocumentation.md` - Section 3.1 (Six-Phase Construction), Section 3.2 (Nine-Step Algorithm)
- **Bloomerang Entity Generation**: `archive/reference_docs_2025/reference_bloomerangEntityGeneration.md`
- **Household Population Issue (VisionAppraisal)**: `archive/reference_docs_2025/reference_householdIndividualsPopulation.md`
- **Session 27 Household Pulling Fix**: `CLAUDE.md` - session27_work.household_pulling_bugfix

---

## SESSION HISTORY

### Session 28 (January 7, 2026)

**Phase 1 - Investigation Setup**:
- User reported two issues with Bloomerang household processing
- Performed comprehensive code review of entire pipeline
- Created this reference document for continuity
- Added diagnostic logging to actual processing code (per user preference over standalone script)

**Phase 2 - Diagnostics Revealed Root Cause**:
- First diagnostic run showed Michael Anderson being classified as `Individual` (not household member)
- Field 8 showed `"12/30/2013"` instead of `"TRUE"`
- Added raw CSV dump diagnostic for account 1637
- Raw dump revealed: `[6]: ""$1"` and `[7]: "500.00 ""` - field split in middle of currency amount!

**Phase 3 - Fix Implementation**:
- Identified root cause: simple `split(',')` doesn't handle quoted CSV fields
- User preferred targeted fix over general CSV parser (knowing exactly where problem occurs)
- Added regex pre-processing to remove commas from quoted currency amounts before split
- Applied fix to both CSV parsing locations in bloomerang.js (lines 236 and 462)

**Phase 4 - Verification**:
- Reprocessed Bloomerang CSV
- Built unified database
- Diagnostic output confirmed Michael Anderson now correctly processed
- Both household members have correct parentKey and siblingKeys
- Household key changed from `976AH` to `1637AH` (Michael is head of household, processed first)

### Next Steps
1. User to verify fix in actual usage (run EntityGroup build, check reports)
2. Investigate Problem 2 (location information mismatch) if still relevant
3. Remove diagnostic logging when both problems are resolved

---

## KEY LEARNINGS

1. **CSV parsing gotcha**: Simple `split(',')` fails on standard CSV with quoted fields containing commas
2. **Targeted fixes over general solutions**: When the problem is well-understood (specific field, specific format), a targeted regex is safer than a general CSV parser that might have unintended consequences
3. **Diagnostic logging approach**: Adding logs to actual processing code (vs standalone script) provides better insight into real data flow
4. **Field offset bugs are insidious**: A parsing error that shifts fields by 1 can cause data to appear to exist but be wrong, making the bug hard to spot
