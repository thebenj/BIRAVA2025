# Plan: Migrate All Classes to Generic deserializeWithTypes() Fallback

## Context

The codebase has two competing deserialization systems:

1. **Generic fallback** in `deserializeWithTypes()` (classSerializationUtils.js:225-247): `Object.create(Class.prototype)` + property copy. No property enumeration. Works because JSON.parse reviver processes bottom-up — nested objects are already class instances when the parent is processed.

2. **Custom methods**: ~34 `deserialize()` / `fromSerializedData()` methods across 4 files that manually enumerate properties and reconstruct nested types. These are redundant with the reviver's bottom-up processing.

The project philosophy (CLAUDE.md) endorses System 1. Session 97 proved it works by removing 6 methods from the AttributedTerm hierarchy. This plan extends that to ALL remaining classes.

**Why the generic fallback works for everything**: The reviver processes the deepest nested objects first. By the time it reaches (say) an Address, all nested AttributedTerm/StreetName/Aliases objects are already class instances. The generic fallback just copies these ready-made instances onto `Object.create(Address.prototype)`. No need to know property names or types. `comparisonCalculator` function references are restored from `comparisonCalculatorName` by special handling already in the generic path (line 237).

---

## Prerequisites: Revert Session 98 Diagnostics

Remove 3 diagnostic traces added during the PO Box investigation:

| File | What to remove | Location |
|------|---------------|----------|
| `scripts/objectStructure/entityClasses.js` | PO BOX 835 `_diagPOBox` trace | ~lines 218-282 |
| `scripts/address/addressProcessing.js` | PO BOX PARSE TRACE in `parseAddressPhase()` | after line 1194 |
| `scripts/objectStructure/entityGroup.js` | Group 76 diagnostic in `buildCollectiveContactInfo()` | ~lines 198-235 |

---

## Batch 1: Remove Aliased.fromSerializedData()

**File**: `scripts/objectStructure/aliasClasses.js`

**Remove**: `Aliased.fromSerializedData()` (lines 457-468)

**Effect**: All 12+ Aliased subclasses (SimpleIdentifiers, NonHumanName, IndicativeData, IdentifyingData, FireNumber, PoBox, PID, StreetName, ComplexIdentifiers, IndividualName, HouseholdName, Address) stop routing through custom `deserialize()` methods and instead use the generic fallback. This is the single highest-impact change.

**Why it's safe**: `deserializeWithTypes()` checks `fromSerializedData` first (line 221). With it removed from Aliased, none of these subclasses have their own, so the generic fallback runs. All custom `deserialize()` methods in the Aliased hierarchy become dead code (never called from the reviver). The `Info.deserializeByType()` path has an `instanceof` check (contactInfo.js:108-110) that returns already-revived objects as-is.

### Test 1A: Console round-trip for Aliased hierarchy classes

**Browser state**: Hard refresh (Ctrl+Shift+R) to load new code.

**Load data**: Expand "PHASE B" section. Enter the Unified Database File ID. Click **"📂 Load Unified Database"**. Wait for the green success message.

**Do NOT** build entity groups, load entity groups, or click anything else. The unified database in memory is sufficient.

**Run in browser console** (F12 → Console tab):
```javascript
// Find an entity with a full address
const entities = Object.values(window.unifiedEntityDatabase.entities);
const entity = entities.find(e =>
    e.contactInfo &&
    e.contactInfo.primaryAddress &&
    e.contactInfo.primaryAddress.biStreetName
);

if (!entity) { console.error('No entity with address found'); }
else {
    // Round-trip the entity's address
    const addr = entity.contactInfo.primaryAddress;
    const serialized = serializeWithTypes(addr);
    const restored = deserializeWithTypes(serialized);

    console.log('=== BATCH 1 ADDRESS TEST ===');
    console.log('Address class:', restored instanceof Address);
    console.log('primaryAlias class:', restored.primaryAlias instanceof AttributedTerm);
    console.log('biStreetName class:', restored.biStreetName instanceof StreetName);
    console.log('alternatives class:', restored.alternatives instanceof Aliases);
    console.log('streetNumber class:', restored.streetNumber instanceof AttributedTerm);
    console.log('city class:', restored.city instanceof AttributedTerm);
    console.log('state class:', restored.state instanceof AttributedTerm);
    console.log('zipCode class:', restored.zipCode instanceof AttributedTerm);
    console.log('calculator restored:', typeof restored.comparisonCalculator === 'function');
    console.log('calculatorName:', restored.comparisonCalculatorName);

    // Round-trip an IndividualName
    const nameEntity = entities.find(e => e.name && e.name.identifier instanceof IndividualName);
    if (nameEntity) {
        const name = nameEntity.name.identifier;
        const nameSerialized = serializeWithTypes(name);
        const nameRestored = deserializeWithTypes(nameSerialized);
        console.log('=== BATCH 1 INDIVIDUALNAME TEST ===');
        console.log('IndividualName class:', nameRestored instanceof IndividualName);
        console.log('primaryAlias class:', nameRestored.primaryAlias instanceof AttributedTerm);
    }

    // Round-trip a FireNumber
    const fnEntity = entities.find(e => e.locationIdentifier && e.locationIdentifier.identifier instanceof FireNumber);
    if (fnEntity) {
        const fn = fnEntity.locationIdentifier.identifier;
        const fnSerialized = serializeWithTypes(fn);
        const fnRestored = deserializeWithTypes(fnSerialized);
        console.log('=== BATCH 1 FIRENUMBER TEST ===');
        console.log('FireNumber class:', fnRestored instanceof FireNumber);
    }
}
```

**Expected**: ALL lines print `true`. If any print `false`, STOP and diagnose.

---

## Batch 2: Remove dead Aliased hierarchy code

**File**: `scripts/objectStructure/aliasClasses.js`

After Batch 1 verified the generic fallback works, remove the now-dead code:

| What | Lines (approx) |
|------|----------------|
| `ensureDeserialized()` helper | 34-43 |
| `Aliased.deserialize()` | 435-455 |
| `SimpleIdentifiers.deserialize()` | 738-751 |
| `NonHumanName.deserialize()` | 767-784 |
| `IndicativeData.deserialize()` | 797-805 |
| `IndicativeData._deserializeIdentifier()` | 814-846 |
| `IdentifyingData.deserialize()` | 873-889 |
| `FireNumber.deserialize()` | 909-927 |
| `PoBox.deserialize()` | 937-953 |
| `PID.deserialize()` | 967-983 |
| `StreetName.deserialize()` | 1112-1131 |
| `ComplexIdentifiers.deserialize()` | 1140-1217 |
| `IndividualName.deserialize()` | 1231-1299 |
| `HouseholdName.deserialize()` | 1603-1593 |
| `Address.deserialize()` | 2182-2241 |

Also remove the JSDoc comment blocks above each method.

**This is dead code removal with no behavioral change** — Batch 1 already stopped these from being called.

### Test 2A: Quick verification

**Browser state**: Hard refresh (Ctrl+Shift+R).

**Load data**: Same as Test 1A — expand "PHASE B", enter Unified Database File ID, click **"📂 Load Unified Database"**, wait for green success.

**Run in browser console**: Same test script as Test 1A. All lines should still print `true`.

---

## Batch 3: Remove Info hierarchy custom methods

**File**: `scripts/objectStructure/contactInfo.js`

Remove these methods:

| What | Lines (approx) |
|------|----------------|
| `Info.deserializeByType()` | 98-137 |
| `Info.deserializeBase()` | 146-187 |
| `Info.fromSerializedData()` | 196-199 |
| `ContactInfo.deserialize()` | 406-408 |
| `ContactInfo.fromSerializedData()` | 417-420 |
| `OtherInfo.fromSerializedData()` | 537-540 |
| `HouseholdOtherInfo.deserialize()` | 561-563 |
| `HouseholdOtherInfo.fromSerializedData()` | 571-573 |
| `LegacyInfo.deserialize()` | 669-671 |
| `LegacyInfo.fromSerializedData()` | 679-681 |

**Effect**: All Info subclasses use the generic fallback. Nested addresses are already class instances from the reviver's bottom-up processing, so they're just copied as-is.

### Test 3A: Console round-trip for ContactInfo

**Browser state**: Hard refresh (Ctrl+Shift+R).

**Load data**: Same — expand "PHASE B", click **"📂 Load Unified Database"**, wait for green success.

**Run in browser console**:
```javascript
const entities = Object.values(window.unifiedEntityDatabase.entities);
const entity = entities.find(e => e.contactInfo instanceof ContactInfo);

const ci = entity.contactInfo;
const serialized = serializeWithTypes(ci);
const restored = deserializeWithTypes(serialized);

console.log('=== BATCH 3 CONTACTINFO TEST ===');
console.log('ContactInfo class:', restored instanceof ContactInfo);
console.log('primaryAddress class:', restored.primaryAddress instanceof Address);
console.log('primaryAddress.biStreetName:', restored.primaryAddress?.biStreetName instanceof StreetName);
console.log('calculator restored:', typeof restored.comparisonCalculator === 'function');

// Check secondary addresses if present
if (restored.secondaryAddresses && restored.secondaryAddresses.length > 0) {
    const sec = restored.secondaryAddresses[0];
    console.log('secondaryAddress class:', sec instanceof Address);
}

// Test full entity round-trip (ContactInfo inside Entity)
const fullSerialized = serializeWithTypes(entity);
const fullRestored = deserializeWithTypes(fullSerialized);
console.log('Full entity ContactInfo:', fullRestored.contactInfo instanceof ContactInfo);
console.log('Full entity Address:', fullRestored.contactInfo.primaryAddress instanceof Address);
```

**Expected**: ALL lines print `true`.

---

## Batch 4: Remove Entity hierarchy custom methods

**File**: `scripts/objectStructure/entityClasses.js`

Remove these methods:

| What | Lines (approx) |
|------|----------------|
| `Entity.deserialize()` | 547-593 |
| `Entity.fromSerializedData()` | 600-604 |
| `Entity.deserializeAny()` | 629-652 |
| `Individual.deserialize()` | 693-720 |
| `CompositeHousehold.deserialize()` | 749-776 |
| `AggregateHousehold.deserialize()` | 845-872 |
| `NonHuman.deserialize()` | 1027-1054 |
| `Business.deserialize()` | 1081-1108 |
| `LegalConstruct.deserialize()` | 1135-1162 |

### Test 4A: Console round-trip for Entity hierarchy

**Browser state**: Hard refresh (Ctrl+Shift+R).

**Load data**: Same — expand "PHASE B", click **"📂 Load Unified Database"**, wait for green success.

**Run in browser console**:
```javascript
const entities = Object.values(window.unifiedEntityDatabase.entities);

// Test Individual
const individual = entities.find(e => e instanceof Individual);
if (individual) {
    const s = serializeWithTypes(individual);
    const r = deserializeWithTypes(s);
    console.log('=== BATCH 4 INDIVIDUAL TEST ===');
    console.log('Individual class:', r instanceof Individual);
    console.log('Entity class:', r instanceof Entity);
    console.log('contactInfo class:', r.contactInfo instanceof ContactInfo);
    console.log('name.identifier class:', r.name?.identifier instanceof IndividualName);
    console.log('locationIdentifier:', r.locationIdentifier?.identifier instanceof FireNumber || r.locationIdentifier?.identifier instanceof SimpleIdentifiers);
}

// Test NonHuman or Business if present
const nonHuman = entities.find(e => e instanceof NonHuman);
if (nonHuman) {
    const s = serializeWithTypes(nonHuman);
    const r = deserializeWithTypes(s);
    console.log('=== BATCH 4 NONHUMAN TEST ===');
    console.log('NonHuman class:', r instanceof NonHuman);
}

const business = entities.find(e => e instanceof Business);
if (business) {
    const s = serializeWithTypes(business);
    const r = deserializeWithTypes(s);
    console.log('=== BATCH 4 BUSINESS TEST ===');
    console.log('Business class:', r instanceof Business);
}
```

**Expected**: ALL lines print `true`.

---

## Batch 5: Remove HouseholdInformation custom methods

**File**: `scripts/objectStructure/householdInformation.js`

Remove these methods:

| What | Lines (approx) |
|------|----------------|
| `HouseholdInformation.deserialize()` | 227-245 |
| `HouseholdInformation.fromSerializedData()` | 277-279 |
| `ParentDescription.fromSerializedData()` | 360-368 |
| `ParticipantDescription.fromSerializedData()` | 429-437 |
| `ComparisonParticipants.fromSerializedData()` | 463-469 |

### Test 5A: Console round-trip for HouseholdInformation

**Browser state**: Hard refresh (Ctrl+Shift+R).

**Load data**: Same — expand "PHASE B", click **"📂 Load Unified Database"**, wait for green success. Then also need EntityGroups for HouseholdInformation data.

**Additional load step**: Expand "Entity Browsers" section. In the EntityGroup Browser panel, enter the EntityGroup Database File ID and Reference File ID. Click **"📂 Load EntityGroups"**. Wait for the load complete message.

**Run in browser console**:
```javascript
// Find a group with householdInformation
const groups = Object.values(entityGroupBrowser.loadedDatabase.groups);
const groupWithHH = groups.find(g => {
    const keys = g.members || [];
    return keys.some(k => {
        const ent = window.unifiedEntityDatabase.entities[k];
        return ent && ent.contactInfo && ent.contactInfo.householdInformation;
    });
});

if (groupWithHH) {
    const key = groupWithHH.members.find(k => {
        const ent = window.unifiedEntityDatabase.entities[k];
        return ent && ent.contactInfo && ent.contactInfo.householdInformation;
    });
    const entity = window.unifiedEntityDatabase.entities[key];
    const hh = entity.contactInfo.householdInformation;
    const s = serializeWithTypes(hh);
    const r = deserializeWithTypes(s);
    console.log('=== BATCH 5 HOUSEHOLDINFORMATION TEST ===');
    console.log('HouseholdInformation class:', r instanceof HouseholdInformation);
} else {
    console.log('No HouseholdInformation found — skip this test');
}
```

**Expected**: `true` or "skip" message.

---

## Batch 6: Remove CollectiveContactInfo.fromSerializedData()

**File**: `scripts/objectStructure/contactInfo.js`

Remove: `CollectiveContactInfo.fromSerializedData()` (lines 818-843)

### Test 6A: Console round-trip for CollectiveContactInfo

**Browser state**: Hard refresh (Ctrl+Shift+R).

**Load data**: Expand "PHASE B", click **"📂 Load Unified Database"**, wait for green success. Then expand "Entity Browsers". In EntityGroup Browser, leave sample size blank (full build). Click **"🔨 Build New"**. Wait for completion message (this takes time — watch for "Build complete" in the status area).

**Why fresh build instead of load**: CollectiveContactInfo is populated during fresh builds. Loading from a file saved with old code would use old serialization — we need to test with newly-built objects.

**Run in browser console**:
```javascript
const groups = Object.values(entityGroupBrowser.loadedDatabase.groups);
const groupWithCCI = groups.find(g => g.collectiveMailingAddress && g.collectiveMailingAddress.preferred);

if (groupWithCCI) {
    const cci = groupWithCCI.collectiveMailingAddress;
    const s = serializeWithTypes(cci);
    const r = deserializeWithTypes(s);
    console.log('=== BATCH 6 COLLECTIVECONTACTINFO TEST ===');
    console.log('CollectiveMailingAddress class:', r instanceof CollectiveMailingAddress);
    console.log('CollectiveContactInfo class:', r instanceof CollectiveContactInfo);
    console.log('preferred is Address:', r.preferred instanceof Address);
    if (r.preferred && r.preferred.biStreetName) {
        console.log('preferred.biStreetName:', r.preferred.biStreetName instanceof StreetName);
    }
} else {
    console.log('No CollectiveContactInfo found');
}
```

**Expected**: ALL lines print `true`.

---

## Batch 7: Update comments + comprehensive save/load round-trip

**File**: `scripts/utils/classSerializationUtils.js`

Update the misleading comments at lines 219-226:

**Current**:
```javascript
// PREFERRED: Use fromSerializedData if available (constructor-based deserialization)
// This ensures constructor initialization logic runs
...
// FALLBACK: Create instance without calling constructor (legacy approach)
// NOTE: This means constructor initialization code does NOT run
```

**New**:
```javascript
// OVERRIDE: If a class defines fromSerializedData, use it (rare — most classes should NOT)
// The generic path below is the project standard for all classes.
...
// STANDARD: Create instance and copy properties — the project-endorsed approach
// All nested objects are already class instances (reviver processes bottom-up)
```

Also update the `ensureDeserialized` comment block at top of aliasClasses.js (now removed).

Also update test files that call `.deserialize()` directly:
- `scripts/testing/addressTesting.js:96` — change to use `serializeWithTypes`/`deserializeWithTypes`
- `scripts/testAttributedTermSubclasses.js:88,127,167` — these call `.deserialize()` on AttributedTerm subclasses which were already removed in Session 97; verify if these tests are still functional

### Test 7A: Full save/load round-trip

This is the comprehensive end-to-end test.

**Browser state**: Hard refresh (Ctrl+Shift+R).

**Step 1 — Load unified database**: Expand "PHASE B". Enter Unified Database File ID. Click **"📂 Load Unified Database"**. Wait for green success message.

**Step 2 — Fresh build**: Expand "Entity Browsers". In EntityGroup Browser, leave sample size blank. Click **"🔨 Build New"**. Wait for "Build complete" (watch status area — this takes time for 1875 groups).

**Step 3 — Save**: Click **"📄 Save as New Files"**. Wait for the save to complete. **Write down the two new File IDs** that are reported in the status area.

**Step 4 — Hard refresh**: Press Ctrl+Shift+R. This clears all in-memory data. The page reloads fresh.

**Step 5 — Reload unified database**: Expand "PHASE B". Enter Unified Database File ID. Click **"📂 Load Unified Database"**. Wait for green success.

**Step 6 — Load saved entity groups**: Expand "Entity Browsers". In EntityGroup Browser, enter the File IDs you wrote down in Step 3. Click **"📂 Load EntityGroups"**. Wait for load complete message.

**Step 7 — Verify in console**:
```javascript
const groups = Object.values(entityGroupBrowser.loadedDatabase.groups);
console.log('Groups loaded:', groups.length);

// Check EntityGroup class
console.log('EntityGroup class:', groups[0] instanceof EntityGroup);

// Check CollectiveContactInfo survived round-trip
const withAddr = groups.find(g => g.collectiveMailingAddress && g.collectiveMailingAddress.preferred);
if (withAddr) {
    const addr = withAddr.collectiveMailingAddress.preferred;
    console.log('=== ROUND-TRIP VERIFICATION ===');
    console.log('CollectiveMailingAddress class:', withAddr.collectiveMailingAddress instanceof CollectiveMailingAddress);
    console.log('Address class:', addr instanceof Address);
    console.log('primaryAlias:', addr.primaryAlias instanceof AttributedTerm);
    console.log('biStreetName:', addr.biStreetName instanceof StreetName);
    console.log('city:', addr.city instanceof AttributedTerm);
    console.log('state:', addr.state instanceof AttributedTerm);
    console.log('zipCode:', addr.zipCode instanceof AttributedTerm);
    console.log('calculator:', typeof addr.comparisonCalculator === 'function');

    // Verify actual DATA survived (not just class tags)
    console.log('city value:', addr.city?.term);
    console.log('state value:', addr.state?.term);
    console.log('zip value:', addr.zipCode?.term);
}

// Check a CollectivePhone if present
const withPhone = groups.find(g => g.collectivePhone && g.collectivePhone.preferred);
if (withPhone) {
    console.log('CollectivePhone class:', withPhone.collectivePhone instanceof CollectivePhone);
}
```

**Step 8 — Visual verification**: Click on a multi-member group in the browser. Verify the group detail view shows addresses with parsed components (street, city, state, zip) rather than raw unparsed strings.

**Expected**: ALL console lines print `true` or valid values. Visual display shows parsed addresses.

---

## Batch 8: CLAUDE.md and documentation updates

- Update CLAUDE.md: remove `two_deserialization_systems` from CRITICAL_LESSONS, update `generic_serialization_only` lesson
- Update `reference_collectiveContactInfo.md`: mark CC-13/CC-14 status
- Remove `diagnostics_to_revert` section from CLAUDE.md (already reverted in prerequisites)
- Update session history

---

## Files Modified (Summary)

| File | Batches | Changes |
|------|---------|---------|
| `scripts/objectStructure/aliasClasses.js` | 1, 2 | Remove `fromSerializedData`, `ensureDeserialized`, 14 `deserialize()` methods |
| `scripts/objectStructure/contactInfo.js` | 3, 6 | Remove `deserializeByType`, `deserializeBase`, 8 methods |
| `scripts/objectStructure/entityClasses.js` | 4 | Remove `fromSerializedData`, `deserializeAny`, 7 `deserialize()` methods |
| `scripts/objectStructure/householdInformation.js` | 5 | Remove 5 methods |
| `scripts/utils/classSerializationUtils.js` | 7 | Update comments only |
| `scripts/objectStructure/entityClasses.js` | Prereq | Revert diagnostic |
| `scripts/address/addressProcessing.js` | Prereq | Revert diagnostic |
| `scripts/objectStructure/entityGroup.js` | Prereq | Revert diagnostic |
| `scripts/testing/addressTesting.js` | 7 | Update test to use generic round-trip |
| `scripts/testAttributedTermSubclasses.js` | 7 | Verify/update tests |
| `CLAUDE.md` | 8 | Documentation update |

## Total methods removed: ~34
## Total files with behavioral changes: 4 (aliasClasses, contactInfo, entityClasses, householdInformation)
