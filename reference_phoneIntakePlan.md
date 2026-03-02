# Phone Number Intake from Bloomerang CSV — Implementation Plan

## Status: ALL STEPS USER VERIFIED
## Date: 2026-02-18
## Version: 2.1

---

## CSV Preprocessing (Manual Steps)

Before processing, "All Data.csv" requires 4 manual steps:
1. **Eliminate total row** (row 2)
2. **Format all numeric columns** to not have commas or $ signs
3. **Search and replace** all commas with `^#C#^`
4. **Eliminate all `\n` characters** (regex newlines embedded in fields)

File must be saved as "All Data.csv" in `servers/Results/`.

---

## Overview

The new `All Data.csv` has four phone columns appended at positions 30-33:
- **Field 31** (index 30): Primary Phone Number — 91 rows populated
- **Field 32** (index 31): Home Phone Number — 87 rows populated
- **Field 33** (index 32): Work Phone Number — 1 row populated
- **Field 34** (index 33): Mobile Phone Number — 4 rows populated

Total rows: 1367. Rows with any phone data: 91.
Phone format: `(301) 518-9098` — parentheses, dashes, spaces, no commas (CSV-safe).

The goal is to ingest these phone numbers through the existing entity/EntityGroup pipeline so they arrive at `CollectivePhone` (which is already fully built and waiting for data).

---

## Phone Normalization Rules

All phone numbers are normalized before any categorization or deduplication:

1. **Strip all non-digit characters** — `(301) 518-9098` → `3015189098`
2. **Remove leading country code** — 11 digits starting with `1` → drop the `1`
3. **7-digit with 466 exchange** — `466-1234` → prepend `401` → `4014661234`
4. **7-digit without 466 exchange** — `518-9098` → prepend `000` → `0005189098`

After normalization, all numbers are 10 digits. This enables reliable deduplication.

---

## Phone Categorization Rules

After normalizing all four CSV phone values and removing duplicates:

1. **Island phone** — Any phone with 466 exchange (normalized digits [3:6] === '466', i.e., area code 401 + exchange 466). If multiple distinct Island numbers exist, one is placed here (arbitrary), the rest go to the A/B/C/D slots. If no Island number exists, this slot is null.

2. **Phone A, B, C, D** — All remaining non-Island phones (plus any excess Island phones beyond the first), filled in priority order:
   - **Primary** fills first available slot
   - **Mobile** fills next available slot
   - **Home** fills next available slot
   - **Work** fills next available slot

   A number already placed in the Island slot is NOT repeated in A/B/C/D.

---

## Existing Infrastructure Audit

### Already Built (no changes needed):
| Component | Location | Status |
|---|---|---|
| `ContactInfo.phone` property | contactInfo.js:105 | Slot exists, typed as SimpleIdentifiers |
| `ContactInfo.setPhone()` | contactInfo.js:144 | Setter ready |
| `CollectivePhone` class | contactInfo.js:745-858 | Full subclass with normalize, deduplicate, equivalence, populateFromMembers |
| `CollectivePhone.normalizePhone()` | contactInfo.js:758 | Strips non-digits, handles country code |
| `CollectivePhone.phonesAreEquivalent()` | contactInfo.js:781 | Handles 7-digit vs 10-digit BI equivalence |
| Override browser phone display | contactPreferenceOverrideBrowser.js:511 | `collectivePhone` in types array |
| Entity renderer phone display | entityRenderer.js:937-944 | Renders `contactInfo.phone` |
| CSV export phone extraction | csvReports.js:272-278 | `getEntityPhone()` reads `contactInfo.phone` |

### Needs Building:
| Component | What's Missing |
|---|---|
| `PhoneTerm` class | No subclass of AttributedTerm for phone (email has `EmailTerm`) |
| `ContactInfo.islandPhone` property | No slot for the Island phone |
| `ContactInfo.additionalPhones` property | No array for Phones B, C, D |
| fieldMap phone entries | Three fieldMaps lack indices 30-33 |
| Phone intake in `createContactInfoEnhanced()` | No code reads phone columns from CSV |
| Phone normalization + dedup + categorization logic | Intake pipeline for 4 → 5 categorized phones |
| `EntityGroup.buildCollectiveContactInfo()` update | Currently only collects `contactInfo.phone`, needs to also collect `islandPhone` and `additionalPhones` |

---

## Implementation Steps

### Step 1: Verify clean import with new CSV (full pipeline)
**Goal:** Confirm the existing 30-field processing works with the 34-field CSV (extra fields ignored) through the ENTIRE pipeline.
**Files:** None — testing only.

**Action:** Run the full processing pipeline with the new All Data.csv and verify each stage:

**1a. Bloomerang CSV Processing:**
- Load Bloomerang data using the new All Data.csv
- Verify processing completes without errors
- Verify entity count matches expectations (~1367 rows → entities created)
- Console check: no errors or warnings related to field count

**1b. Unified Entity Database:**
- Build the unified entity database (VisionAppraisal + Bloomerang)
- Verify total entity count matches previous runs
- Spot-check a known Bloomerang entity to confirm all existing fields (name, address, email) are intact

**1c. EntityGroup Building with Consensus:**
- Build EntityGroup database with consensus construction enabled
- Verify group count is consistent (~1875 groups)
- Verify consensus entities are constructed without errors
- Spot-check a group to confirm consensus entity has expected data

**1d. EntityGroup Collections:**
- Verify all 6 collection properties are populated (memberKeys, nearMissKeys, etc.)
- Run a spot-check on a known group

**1e. CollectiveContactInfo Construction:**
- Verify `collectiveMailingAddress`, `collectivePOBox`, `collectiveEmail` populate as before
- Run existing email count check:
```js
const groups = Object.values(entityGroupBrowser.loadedDatabase.groups);
const withEmail = groups.filter(g => g.collectiveEmail?.hasContact?.());
console.log('Groups with collectiveEmail:', withEmail.length);
// Expected: ~546 (same as before)
```

**Success criteria:** All counts match previous runs. No new errors. The extra 4 columns cause zero disruption.

---

### Step 2: Create `PhoneTerm` class
**Goal:** Create an AttributedTerm subclass for phone numbers with normalization and Block Island awareness.
**File:** `scripts/objectStructure/aliasClasses.js`

**What to build:**
- `class PhoneTerm extends AttributedTerm` — modeled after EmailTerm (aliasClasses.js:1398-1500)
- Constructor: `constructor(term, source, index, identifier)` — same signature as EmailTerm

**Methods:**

- `normalizePhone()` — instance method returning 10-digit normalized string:
  1. Strip all non-digit characters
  2. If 11 digits starting with '1', remove the leading '1'
  3. If 7 digits and starts with '466', prepend '401'
  4. If 7 digits and does NOT start with '466', prepend '000'
  5. Return the 10-digit result

- `isIslandNumber()` — returns true if normalized form has '466' as exchange (digits [3:6])

- `isValidPhone()` — validates: non-empty, contains at least 7 digits after stripping non-digits

- `compareTo(other)` — normalization-aware comparison:
  - If both PhoneTerm: normalize both, exact match → 1.0, else 0.0 (phones match or they don't)
  - If other is not PhoneTerm: fall back to `super.compareTo(other)`

**Registration required (3 locations):**
1. `aliasClasses.js` window export: `window.PhoneTerm = PhoneTerm;` (after line 1938)
2. `classSerializationUtils.js` CLASS_REGISTRY: `'PhoneTerm': typeof PhoneTerm !== 'undefined' ? PhoneTerm : null,` (after line 35)
3. `index.html` — verify aliasClasses.js is loaded before classSerializationUtils.js (it already is)

**Test:** In browser console:
```js
// 10-digit number
const pt1 = new PhoneTerm('(401) 466-1234', 'TEST', 0, 'T1');
console.log(pt1.normalizePhone()); // '4014661234'
console.log(pt1.isIslandNumber()); // true
console.log(pt1.isValidPhone());   // true

// 7-digit Island number — should prepend 401
const pt2 = new PhoneTerm('466-1234', 'TEST', 0, 'T2');
console.log(pt2.normalizePhone()); // '4014661234'
console.log(pt2.isIslandNumber()); // true

// 7-digit non-Island — should prepend 000
const pt3 = new PhoneTerm('518-9098', 'TEST', 0, 'T3');
console.log(pt3.normalizePhone()); // '0005189098'
console.log(pt3.isIslandNumber()); // false

// Comparison: same number different formats
console.log(pt1.compareTo(pt2));   // 1.0 (both normalize to 4014661234)
console.log(pt1.compareTo(pt3));   // 0.0 (different numbers)

// 11-digit with country code
const pt4 = new PhoneTerm('1-401-466-1234', 'TEST', 0, 'T4');
console.log(pt4.normalizePhone()); // '4014661234'
```

---

### Step 3: Add phone fields to fieldMap, normalization, deduplication, and categorization
**Goal:** Read all four phone columns, normalize, deduplicate, categorize into Island + A/B/C/D, and store on the entity.
**Files:** `scripts/bloomerang.js`, `scripts/objectStructure/contactInfo.js`

**3a. Add to ContactInfo** (contactInfo.js):
```js
this.islandPhone = null;        // SimpleIdentifiers for 466-exchange phone
// this.phone already exists     // SimpleIdentifiers for Phone A (best non-island)
this.additionalPhones = [];     // Array<SimpleIdentifiers> for Phones B, C, D
```
Add setter methods: `setIslandPhone()`, `addAdditionalPhone()`.

**3b. Add to all three fieldMaps** in bloomerang.js (lines 858, 1756, 2825):
```
primaryPhone: 30,    // Field 31: Primary Phone Number
homePhone: 31,       // Field 32: Home Phone Number
workPhone: 32,       // Field 33: Work Phone Number
mobilePhone: 33      // Field 34: Mobile Phone Number
```

**3c. Add phone processing function** in bloomerang.js:

`function processPhoneFields(fields, fieldMap, dataSource, rowIndex, accountNumber)`:

1. **Collect** all four raw phone values (primary, home, work, mobile)
2. **Filter** out empty/whitespace-only values
3. **Create PhoneTerm** for each non-empty value
4. **Normalize** each using `phoneTerm.normalizePhone()`
5. **Deduplicate** — remove entries whose normalized form matches an already-seen normalized form
6. **Categorize:**
   - Scan deduplicated list for Island numbers (`isIslandNumber()`)
   - First Island number → `islandPhone` slot; remove from remaining pool
   - Any additional Island numbers go back into the remaining pool
   - Fill Phone A from remaining pool using priority order: primary > mobile > home > work
   - Fill Phone B from remaining pool (same priority, skip already-assigned)
   - Fill Phone C, then Phone D
7. **Return** `{ islandPhone, phoneA, phoneB, phoneC, phoneD }` — each is a SimpleIdentifiers(PhoneTerm) or null

**3d. Wire into `createContactInfoEnhanced()`** (after email block ~line 2355):
```js
const phones = processPhoneFields(fields, fieldMap, dataSource, rowIndex, accountNumber);
if (phones.islandPhone) {
    contactInfo.islandPhone = phones.islandPhone;
    hasContactData = true;
}
if (phones.phoneA) {
    contactInfo.phone = phones.phoneA;  // backward compat: Phone A uses existing slot
    hasContactData = true;
}
// Phones B, C, D into additionalPhones array
for (const extra of [phones.phoneB, phones.phoneC, phones.phoneD]) {
    if (extra) contactInfo.additionalPhones.push(extra);
}
if (contactInfo.additionalPhones.length > 0) hasContactData = true;
```

**Test:** Process Bloomerang CSV, then run:
```js
const entities = Object.values(window.unifiedEntityDatabase.entities);
const withAnyPhone = entities.filter(e =>
    e.contactInfo?.phone || e.contactInfo?.islandPhone || e.contactInfo?.additionalPhones?.length > 0);
console.log('Entities with any phone:', withAnyPhone.length);
// Expected: ~91

const withIsland = entities.filter(e => e.contactInfo?.islandPhone);
console.log('Entities with island phone:', withIsland.length);

// Inspect a sample entity with phone data
const sample = withAnyPhone[0];
console.log('Island:', sample.contactInfo.islandPhone?.primaryAlias?.term);
console.log('Phone A:', sample.contactInfo.phone?.primaryAlias?.term);
console.log('Additional:', sample.contactInfo.additionalPhones?.map(p => p.primaryAlias.term));
```

---

### Step 4: Update EntityGroup to collect all phones
**Goal:** Modify `buildCollectiveContactInfo()` to collect `islandPhone`, `phone`, AND `additionalPhones` from each member entity, so CollectivePhone receives the full set.
**File:** `scripts/objectStructure/entityGroup.js`

**Change** in `buildCollectiveContactInfo()` (lines 180-184):
```js
if (entity.contactInfo) {
    // Phone: collect ALL phone slots
    if (entity.contactInfo.islandPhone) {
        allPhones.push(entity.contactInfo.islandPhone);
    }
    if (entity.contactInfo.phone) {
        allPhones.push(entity.contactInfo.phone);
    }
    if (entity.contactInfo.additionalPhones) {
        for (const p of entity.contactInfo.additionalPhones) {
            if (p) allPhones.push(p);
        }
    }
    // ... existing poBox and email collection unchanged
}
```

CollectivePhone.populateFromMembers() already handles deduplication via `phonesAreEquivalent()`, so duplicates across group members are handled automatically.

**Test:** Build EntityGroup database, then run:
```js
const groups = Object.values(entityGroupBrowser.loadedDatabase.groups);
const withPhone = groups.filter(g => g.collectivePhone?.hasContact?.());
console.log('Groups with collectivePhone:', withPhone.length);
// Should be > 0 (was 0 before)
const sample = withPhone[0];
console.log('Preferred phone:', sample.collectivePhone.getPreferredTerm());
console.log('Alternatives:', sample.collectivePhone.alternatives.length);
console.log('Preferred is Island?:', new PhoneTerm(sample.collectivePhone.getPreferredTerm(), 'T', 0, 'T').isIslandNumber());
```

---

### Step 5: Verify end-to-end display and export
**Goal:** Confirm phone data appears in all existing display/export points.
**Files:** None — all display code is already built. This is verification.

**Verify in:**
1. **Entity renderer** (entityRenderer.js:937-944) — select an entity with phone data in the Unified Entity Browser, confirm "Phone" row appears in contact info (this reads `contactInfo.phone` — Phone A)
2. **Override browser** (contactPreferenceOverrideBrowser.js:511) — select a group with phone data, confirm "Phone" section appears in Contact Preferences panel with preferred/alternatives
3. **CSV export** (csvReports.js:272-278) — export a CSV report, confirm phone column is populated
4. **Object explorer** — Explore Group on a group with phone, drill into collectivePhone to verify structure

---

### Step 6: Verify serialization round-trip
**Goal:** Confirm PhoneTerm survives serialize/deserialize (save to Google Drive and reload).
**Files:** None — generic serialization handles this as long as PhoneTerm is in CLASS_REGISTRY.

**Test:**
1. Save entity database to Google Drive
2. Reload from saved file
3. Check that phone data still exists and PhoneTerm class is preserved:
```js
const entity = getEntityByKey('some-key-with-phone');
console.log(entity.contactInfo.phone?.primaryAlias instanceof PhoneTerm);   // true
console.log(entity.contactInfo.islandPhone?.primaryAlias instanceof PhoneTerm); // true (if has island phone)
console.log(entity.contactInfo.phone?.primaryAlias?.term);
```

---

## Summary of Files Modified

| File | Changes |
|---|---|
| `scripts/objectStructure/aliasClasses.js` | Add `PhoneTerm` class (~50 lines) + window export |
| `scripts/utils/classSerializationUtils.js` | Add `PhoneTerm` to CLASS_REGISTRY (1 line) |
| `scripts/objectStructure/contactInfo.js` | Add `islandPhone`, `additionalPhones` properties + setters (~10 lines) |
| `scripts/bloomerang.js` | Add phone fields to 3 fieldMaps + `processPhoneFields()` function + wire into `createContactInfoEnhanced()` (~50 lines) |
| `scripts/objectStructure/entityGroup.js` | Update `buildCollectiveContactInfo()` to collect all phone slots (~8 lines) |

**Total new code:** ~120 lines.

**Files NOT modified** (already handle phone):
- entityRenderer.js — already renders `contactInfo.phone`
- csvReports.js — already exports `contactInfo.phone`
- contactPreferenceOverrideBrowser.js — already displays `collectivePhone`

---

## Risk Assessment

- **Low risk:** Extra CSV fields already proven harmless (same comma-split parser, fieldMap-based access)
- **Low risk:** PhoneTerm follows exact same pattern as EmailTerm
- **Low risk:** New ContactInfo properties (`islandPhone`, `additionalPhones`) are additive — existing code reading `contactInfo.phone` is unaffected
- **Low risk:** EntityGroup collector change is additive — just pushes more items into allPhones array
- **Zero risk to downstream:** CollectivePhone.populateFromMembers() already handles deduplication
- **Key validation:** Step 1 (full pipeline verification) must pass before any code changes
