# Phase 5 Entity Rebuild Plan

**Purpose**: Detailed plan for ensuring Phase A workflow produces entities with biStreetName populated, enabling Phase 5 comparison testing.

**Created**: January 22, 2026
**Status**: READY_FOR_IMPLEMENTATION

---

## Executive Summary

Phase 5 Step 2 code is written in `utils.js` (compareBlockIslandAddresses), but testing is blocked because loaded entities lack `biStreetName`. This plan documents the required code change and testing steps to produce entities with biStreetName properly populated.

---

## Root Cause Analysis (Verified Session 44)

### The Problem
When "Load All Data Sources" loads entities from Google Drive, the addresses do not have `biStreetName` populated.

### Verification Evidence
Log file diagnostic showed:
```javascript
const biAddress = testEntity?.contactInfo?.addresses?.find(a => a.biStreetName);
console.log('biStreetName present:', !!biAddress?.biStreetName);  // OUTPUT: false
```

### Why This Happens

1. **biStreetName is populated during entity CREATION** (in `Address.fromProcessedAddress()` at aliasClasses.js:1864-1887), NOT during deserialization

2. **The condition for population** requires `window.blockIslandStreetDatabase` to be loaded:
   ```javascript
   if (processedAddress.isBlockIslandAddress &&
       window.blockIslandStreetDatabase &&
       typeof window.blockIslandStreetDatabase.lookup === 'function')
   ```

3. **Deserialization just restores what was saved** - Address.deserialize() does not attempt to populate biStreetName

4. **The saved entity files were created before biStreetName infrastructure was functional**

---

## Current State Analysis

| Component | Status | Location |
|-----------|--------|----------|
| `loadBlockIslandStreetsFromDrive()` | Working | addressProcessing.js:681 |
| `Address.fromProcessedAddress()` biStreetName code | Working | aliasClasses.js:1864-1887 |
| VA processing loads StreetName DB | Working | processAllVisionAppraisalRecords.js:67-78 |
| Bloomerang processing loads StreetName DB | **MISSING** | bloomerang.js |

### The Gap
`readBloomerangWithEntities()` and `readBloomerangWithEntitiesQuiet()` do NOT call `loadBlockIslandStreetsFromDrive()`. This means Bloomerang entities will not have biStreetName populated.

---

## Required Code Change

### File: bloomerang.js

### Functions to Modify:
1. `readBloomerangWithEntities()` (line 211)
2. `readBloomerangWithEntitiesQuiet()` (line 441)

### Change Details

Insert after the CSV parsing section (around line 267 for readBloomerangWithEntities, equivalent location for Quiet version), BEFORE entity processing begins:

```javascript
// Load Block Island streets database for address processing (biStreetName population)
console.log('\n🗺️ Loading Block Island streets database...');
if (typeof loadBlockIslandStreetsFromDrive !== 'undefined') {
    try {
        const streets = await loadBlockIslandStreetsFromDrive();
        console.log(`✅ Loaded ${streets.size} Block Island streets for address processing`);
    } catch (error) {
        console.warn(`⚠️ Failed to load Block Island streets: ${error.message}`);
    }
} else {
    console.warn('⚠️ loadBlockIslandStreetsFromDrive function not available');
}
```

This matches the pattern used in processAllVisionAppraisalRecords.js:67-78.

---

## Testing Plan

### Test 1: Verify StreetName Database Loads (Pre-flight)

```javascript
// Hard refresh, then in console:
await loadBlockIslandStreetsFromDrive();
console.log('Database loaded:', !!window.blockIslandStreetDatabase);
console.log('Lookup test:', window.blockIslandStreetDatabase?.lookup('CORN NECK ROAD')?.primaryAlias?.term);
```

**Expected:**
- Database loaded: true
- Lookup test: "CORN NECK ROAD"

---

### Test 2: Create VisionAppraisal Entities and Verify biStreetName

After running "Process & Save VisionAppraisal Data" then "Create Entities from Processed Data":

```javascript
const vaEntities = window.workingLoadedEntities?.visionAppraisal?.entities;
let withBiStreet = 0, withoutBiStreet = 0, notBI = 0;
for (const entity of vaEntities || []) {
    const addr = entity?.contactInfo?.primaryAddress;
    if (addr?.isBlockIslandAddress?.term === true || addr?.isBlockIslandAddress?.term === 'true') {
        if (addr?.biStreetName) withBiStreet++;
        else withoutBiStreet++;
    } else {
        notBI++;
    }
}
console.log('VA entities:', vaEntities?.length);
console.log('BI addresses with biStreetName:', withBiStreet);
console.log('BI addresses WITHOUT biStreetName:', withoutBiStreet);
console.log('Non-BI addresses:', notBI);
```

**Expected:** Most BI addresses should have biStreetName. Some may not if street lookup fails (edge cases).

---

### Test 3: Create Bloomerang Entities and Verify biStreetName (After Code Change)

After running "Process Bloomerang CSV":

```javascript
const bloomIndiv = window.workingLoadedEntities?.bloomerang?.individuals?.entities;
const bloomHH = window.workingLoadedEntities?.bloomerang?.households?.entities;
function countBiStreetName(entities) {
    let withBi = 0, withoutBi = 0, notBI = 0;
    for (const entity of entities || []) {
        const addr = entity?.contactInfo?.primaryAddress;
        const isBI = addr?.isBlockIslandAddress?.term === true || addr?.isBlockIslandAddress?.term === 'true';
        if (isBI) {
            if (addr?.biStreetName) withBi++;
            else withoutBi++;
        } else {
            notBI++;
        }
    }
    return { withBi, withoutBi, notBI };
}
console.log('Bloomerang Individuals:', countBiStreetName(bloomIndiv));
console.log('Bloomerang Households:', countBiStreetName(bloomHH));
```

**Expected:** Most BI addresses should have biStreetName.

---

### Test 4: Save and Reload Entities (Serialization Round-Trip)

1. After creating entities (Tests 2 & 3), save them to Google Drive
2. Hard refresh browser
3. Load entities using "Load All Data Sources"
4. Verify biStreetName is preserved:

```javascript
const entities = Object.values(window.unifiedEntityDatabase?.entities || {});
let withBi = 0, withoutBi = 0;
for (const entity of entities) {
    const addr = entity?.contactInfo?.primaryAddress;
    const isBI = addr?.isBlockIslandAddress?.term === true || addr?.isBlockIslandAddress?.term === 'true';
    if (isBI) {
        if (addr?.biStreetName) withBi++;
        else withoutBi++;
    }
}
console.log('Loaded entities - BI with biStreetName:', withBi);
console.log('Loaded entities - BI without biStreetName:', withoutBi);
```

**Expected:** Numbers should match what was saved (biStreetName preserved through serialization).

---

### Test 5: Phase 5 Comparison Logic Works

After loading entities with biStreetName:

```javascript
// Get two BI entities and compare their addresses
const entities = Object.values(window.unifiedEntityDatabase?.entities || {});
const biEntities = entities.filter(e => e?.contactInfo?.primaryAddress?.biStreetName);
if (biEntities.length >= 2) {
    const addr1 = biEntities[0].contactInfo.primaryAddress;
    const addr2 = biEntities[1].contactInfo.primaryAddress;
    console.log('addr1 street:', addr1.biStreetName?.primaryAlias?.term);
    console.log('addr2 street:', addr2.biStreetName?.primaryAlias?.term);
    console.log('Same object?:', addr1.biStreetName === addr2.biStreetName);
    if (addr1.biStreetName !== addr2.biStreetName) {
        const scores = addr1.biStreetName.compareTo(addr2.biStreetName);
        console.log('compareTo scores:', scores);
    }
}
```

**Expected:** compareTo returns four-score object.

---

## Execution Order

1. **Make code change** - Add `loadBlockIslandStreetsFromDrive()` to Bloomerang processing (bloomerang.js)
2. **Hard refresh browser**
3. **Run Test 1** - Verify database loads
4. **Run Phase A workflow:**
   - Process VA data → Create VA entities → Run Test 2
   - Process Bloomerang CSV → Run Test 3
5. **Save entities to Google Drive**
6. **Hard refresh and run Test 4** - Verify round-trip
7. **Run Test 5** - Verify Phase 5 comparison works
8. **Mark Phase 5 Step 2 as ready for user verification**

---

## Success Criteria

- All BI addresses from VA entities have biStreetName populated
- All BI addresses from Bloomerang entities have biStreetName populated
- biStreetName survives serialization round-trip
- Phase 5 comparison logic can use biStreetName for alias-aware matching

---

## Related Documents

- **Parent architecture**: reference_streetNameAliasArchitecture.md
- **Phase 5 comparison design**: reference_phase5_streetNameComparison.md
- **System documentation**: reference_systemDocumentation.md (Section 5.1 Phase A workflow)

---

## Document History

- v1.0 (2026-01-22): Initial creation from Session 44 analysis
