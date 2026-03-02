# Phase 4.5: Individual Discovery in Empty AggregateHouseholds

**Document Purpose**: Detailed implementation plan for Phase 4.5 of the Phonebook/Email Integration project.
**Document Status**: TESTED_WITH_ISSUES — Code tested Session 132. 34/35 processed, 53 individuals. 6 data quality issues pending review. Results in memory only.
**Created**: March 1, 2026 (Session 132)
**Parent Plan**: reference_phonebookDatabasePlan.md (Phase 4.5)

---

## QUICK START

**Goal**: For 39 VA AggregateHouseholds that have empty `individuals[]` arrays, use phonebook data to identify the household members and instantiate them as Individual objects — producing results consistent with how the VA name parser originally creates individuals within households.

**Why these 39 exist**: The VA name parser couldn't separate the names in the owner field (e.g., unparseable format), so it created AggregateHouseholds with HouseholdNames but empty `individuals[]` arrays. The phonebook provides clean, parseable names for the people at these addresses.

**Tagged by**: `tagIndividualDiscovery()` in phonebookPipeline.js (post-processing pass). 39 matchAssociations tagged: 32 user-annotated + 7 heuristic.

---

## SECTION 1: CONSISTENCY REQUIREMENT — WHAT AN INDIVIDUAL INSIDE AN AGGREGATEHOUSEHOLD LOOKS LIKE

The primary goal is **structural consistency**. New individuals must hold information identically to how existing VA individuals hold information within their parent AggregateHouseholds.

### 1A: The Objects in `individuals[]`

Each element in `AggregateHousehold.individuals[]` is an `Individual` entity (extends Entity) with these properties:

| Property | Type | Description |
|----------|------|-------------|
| `locationIdentifier` | FireNumber or PID | **SAME** as parent household's |
| `name` | IndividualName | **DIFFERENT** — individual's own name (the only distinguishing property) |
| `contactInfo` | ContactInfo | **STRUCTURALLY IDENTICAL** to household's — independently constructed from same data |
| `pid` | string | **SAME** as household's |
| `fireNumber` | string | **SAME** as household's |
| `mblu` | AttributedTerm | **SAME** values as household's (separate object instance) |
| `googleFileId` | string | **SAME** as household's |
| `source` | string | **SAME** as household's ('VISION_APPRAISAL') |
| `otherInfo` | OtherInfo | **SAME** assessment/appraisal values **PLUS** HouseholdInformation (additional) |
| `comparisonWeights` | object | Individual-specific: {name: 0.5, contactInfo: 0.3, otherInfo: 0.15, legacyInfo: 0.05} |

### 1B: How Individual Information Relates to the AggregateHousehold

In the original VA creation path (visionAppraisalNameParser.js, lines 1173-1287):
- Both household and individuals are constructed from the **same VA record**
- Both receive the **same** `record.propertyLocation` and `record.ownerAddress` text strings, which the Entity constructor independently parses into ContactInfo with Address objects
- Both receive the **same** pid, fireNumber, mblu, googleFileId, source
- Both receive the **same** assessmentValue and appraisalValue in OtherInfo
- The **only differences** are:
  1. `name`: Household gets HouseholdName, each Individual gets their own IndividualName
  2. `otherInfo.householdInformation`: Each Individual gets a HouseholdInformation object recording their relationship to the household (the household itself does not)
  3. `comparisonWeights`: Individual weights name at 0.5, Household weights name at 0.4

### 1C: HouseholdInformation on Each Individual

Created via `HouseholdInformation.fromVisionAppraisalData(householdIdentifier, householdName, isHead)`:

| Property | Value |
|----------|-------|
| `isInHousehold` | true |
| `householdName` | The household's full name string (e.g., "KASTNER, JONATHAN & SANDRA") |
| `isHeadOfHousehold` | true for first individual, false for subsequent |
| `householdIdentifier` | Fire number string (or pid if no fire number) |
| `parentKey` | Set later during database construction (e.g., "visionAppraisal:FireNumber:1510") |

### 1D: VA Individuals Do Not Exist Independently

VA individuals in a household are NOT separate entries in `unifiedEntityDatabase.entities{}`. They exist **exclusively** within `household.individuals[]`. They have no independent database key. (Confirmed by AggregateHousehold class comments, entityClasses.js line 575, and unifiedDatabasePersistence.js code.)

---

## SECTION 2: NAME RECONCILIATION STANDARD

### 2A: The Problem

Multiple phonebook entries (different phone numbers) may point to the same empty AggregateHousehold. Their names have **never been reconciled** against each other — Phase 4.1 skipped these 39 cases entirely because `extractIndividualNameFromEntity()` found no IndividualName to work with (empty individuals[] and HouseholdName, not IndividualName). No other pipeline phase performs cross-entry name comparison.

We must determine which phonebook names represent the same person and which are distinct individuals.

### 2B: The Standard — Same as buildMemberCollections()

Use the same comparison approach as `EntityGroup._tryMatchToExistingName()` (entityGroup.js, lines 526-566):

1. Compare using `IndividualName.compareTo()` which returns `{primary, homonym, synonym, candidate}` four-score
2. Take `Math.max()` of all four scores
3. Find the **best** match (not first match)
4. Apply thresholds from existing helper functions (NEVER hardcode):
   - **Homonym threshold** `>= getIndividualNameHomonymThreshold()` (0.875, from `MATCH_CRITERIA.trueMatch.nameAlone`): Same person — name variation stored as homonym alias
   - **Synonym threshold** `>= getIndividualNameSynonymThreshold()` (0.845, from `MATCH_CRITERIA.nearMatch.nameAlone`): Same person — name variation stored as candidate alias (promoted because same household = corroborating evidence, per the Alias Promotion Rule in reference_entityGroupCollections.md Section 4A)
   - **Below synonym threshold**: Distinct individual — create separate Individual

### 2C: Reconciliation Algorithm

Build a set of "anchor" names incrementally (emulating the two-pass approach in buildMemberCollections, adapted because no names are in the database yet):

```
anchors = []  // Each anchor: { primaryName, aliases[], phoneNumbers[] }

For each phonebook-derived name for this household:
  1. Compare against all existing anchors using the standard above
  2. If best match >= synonym threshold:
     → Consolidate: add this name as alias on the matched anchor
     → Add this name's phone number(s) to the anchor's phone list
  3. If no match above threshold:
     → Create new anchor with this name as primary
     → Record this name's phone number(s)
```

After reconciliation, each anchor represents one distinct Individual to create.

### 2D: Which Name Becomes Primary Alias

When two names consolidate, the **first-encountered** name becomes the primary alias (consistent with how buildMemberCollections uses the first recognized name as the anchor). The consolidated name becomes a homonym or candidate alias depending on score.

**IndividualNameDatabase check**: Before finalizing the primary, call `resolveIndividualName()` (utils.js, line 3213) to check if this name already exists in the IndividualNameDatabase. If found, use the existing entry — this ensures singleton pattern.

---

## SECTION 3: ADDRESS HANDLING — FIVE CASES

The phonebook may provide address data that supplements or duplicates the household's existing addresses.

### 3A: Cases (defined by user)

| Case | Phonebook Has | Action |
|------|--------------|--------|
| 1 | Street name only (no fire number, no PO box) | Do nothing |
| 2 | Fire number that already exists in household's VA address data | Do nothing |
| 3 | PO box that already exists in household's VA address data | Do nothing |
| 4 | Fire number + street combination NOT in household's VA data | Create complete BI address using streetNameDatabase + fire number. Add to secondary address array of BOTH the household AND each individual |
| 5 | PO box NOT in household's VA data | Create complete BI address using PO box. Add to secondary address array of BOTH the household AND each individual |

### 3B: Checking "Already Exists"

For fire numbers (Cases 2 vs 4): Check household's `contactInfo.primaryAddress` and all `contactInfo.secondaryAddress[]` entries for a matching `streetNumber.term`.

For PO boxes (Cases 3 vs 5): Check household's `contactInfo.poBox` and secondary addresses for PO box matches.

### 3C: Creating Complete BI Addresses

For Case 4 (fire number + street):
- Look up street in `window.streetNameDatabase` to get canonical street name
- Create Address object with: fire number, canonical street name, Block Island, RI, 02807
- Add to household's `contactInfo.secondaryAddress[]`
- Add to each individual's `contactInfo.secondaryAddress[]`

For Case 5 (PO box):
- Create Address object with: PO box number, Block Island, RI, 02807
- Add to household's `contactInfo.secondaryAddress[]`
- Add to each individual's `contactInfo.secondaryAddress[]`

---

## SECTION 4: PHONE NUMBER STORAGE

**Rule**: All phone numbers from all phonebook entries pointing to this household are stored on ALL individuals created.

Each phonebook entry that has a `matchAssociation` tagged with `individualDiscovery` provides a phone number (the entry's key). Collect all such phone numbers for a given household.

**Storage mechanism**: ContactInfo has `islandPhone` (one) and `additionalPhones[]` (array). PhoneTerm extends AttributedTerm for phone numbers. Use the same infrastructure as the Phone Intake system (reference_phoneIntakePlan.md).

For each individual:
- Determine if phone is island (401-466 exchange) or non-island
- First island phone → `contactInfo.setIslandPhone()`
- Additional phones → `contactInfo.addAdditionalPhone()`
- Source attribution: 'PHONEBOOK_DATABASE'

**Note**: This overlaps with Phase 5 (Phone Number Assignment). Phase 4.5 stores phones on the newly-created individuals. Phase 5 handles the general case of assigning phonebook phones to all matched entities. Phase 4.5's phone storage should be consistent with whatever mechanism Phase 5 uses, so we should use the same PhoneTerm creation pattern.

---

## SECTION 5: CONTACTINFO CLONING

### 5A: The Need

The original VA code creates both household and individuals from the same raw text, resulting in independently constructed but structurally identical ContactInfo. For Phase 4.5, we don't have the original text — we have the household's already-constructed ContactInfo.

### 5B: Approach — Serialize/Deserialize Deep Copy

Use the existing serialization infrastructure for deep cloning:

```javascript
var contactInfoJson = serializeWithTypes(household.contactInfo);
var clonedContactInfo = deserializeWithTypes(contactInfoJson);
```

This produces a structurally identical but independent ContactInfo with all nested Address objects, using infrastructure that already handles all class types. Each Individual gets its own deep copy.

### 5C: After Cloning — Apply New Addresses and Phones

After cloning the base ContactInfo from the household:
1. Add any new addresses from phonebook data (Section 3, Cases 4-5)
2. Add phone numbers (Section 4)

Both additions also go on the household's ContactInfo (for addresses) — phones go on individuals only per Phase 4.5 scope.

---

## SECTION 6: INDIVIDUAL CREATION — STEP BY STEP

For each distinct person identified through name reconciliation (Section 2):

### Step 1: Create IndividualName

```javascript
var fullName = constructPhonebookNameString(nameObj);  // e.g., "JONATHAN KASTNER"
var individualName = new IndividualName(
    new AttributedTerm(fullName, 'PHONEBOOK_DATABASE', phoneNumber, 'individualDiscovery'),
    '',                    // title
    nameObj.firstName,     // firstName
    '',                    // otherNames (phonebook doesn't provide middle names)
    nameObj.lastName,      // lastName
    ''                     // suffix
);
```

### Step 2: Resolve Against IndividualNameDatabase

```javascript
var nameToUse = resolveIndividualName(fullName, function() { return individualName; });
```

If an existing entry is found, use it (singleton pattern). If not, use the newly created one.

### Step 3: Create Individual Entity

```javascript
var individual = new Individual(
    household.locationIdentifier,  // SAME fire number / PID
    nameToUse,                     // IndividualName
    null,                          // propertyLocation (null — we'll clone ContactInfo instead)
    null,                          // ownerAddress (null — same reason)
    null                           // accountNumber
);
```

### Step 4: Clone Household's ContactInfo

```javascript
var contactInfoJson = serializeWithTypes(household.contactInfo);
individual.contactInfo = deserializeWithTypes(contactInfoJson);
```

### Step 5: Add New Addresses from Phonebook (Cases 4-5)

If phonebook provides new address data not in household, add to both `individual.contactInfo.secondaryAddress[]` and `household.contactInfo.secondaryAddress[]`.

### Step 6: Add Phone Numbers

Add all collected phone numbers to the individual's ContactInfo.

### Step 7: Copy VA-Specific Properties

```javascript
individual.pid = household.pid;
individual.fireNumber = household.fireNumber;
individual.mblu = new AttributedTerm(
    household.mblu?.term || '', 'VISION_APPRAISAL',
    household.mblu?.index || 0, household.mblu?.identifier || household.pid
);
individual.googleFileId = household.googleFileId || '';
individual.source = household.source || 'VISION_APPRAISAL';
```

### Step 8: Set OtherInfo with Assessment Values + HouseholdInformation

```javascript
var otherInfo = new OtherInfo();

// Copy assessment/appraisal values from household
if (household.otherInfo) {
    if (household.otherInfo.assessmentValue) {
        otherInfo.setAssessmentValue(household.otherInfo.assessmentValue);
    }
    if (household.otherInfo.appraisalValue) {
        otherInfo.setAppraisalValue(household.otherInfo.appraisalValue);
    }
}

// Add HouseholdInformation
var householdIdentifierStr = household.fireNumber
    ? String(household.fireNumber)
    : (household.pid || '');
var householdNameStr = household.name?.primaryAlias?.term
    || household.name?.fullHouseholdName
    || '';

otherInfo.householdInformation = HouseholdInformation.fromVisionAppraisalData(
    householdIdentifierStr,
    householdNameStr,
    idx === 0  // first individual is head of household
);

individual.otherInfo = otherInfo;
// (or use individual.addOtherInfo if that's the proper API)
```

### Step 9: Push to Household

```javascript
household.individuals.push(individual);
```

### Step 10: Register in IndividualNameDatabase

If the name was newly created (not found by `resolveIndividualName`), add it to the IndividualNameDatabase. Also add any alias variations that were consolidated during reconciliation.

---

## SECTION 7: DATA FLOW — WHAT WE HAVE TO WORK WITH

### 7A: Tagged matchAssociations

From `tagIndividualDiscovery()` (phonebookPipeline.js, lines 1034-1060):

Each tagged matchAssociation has:
- `entityKey` — key of the AggregateHousehold in unifiedEntityDatabase.entities
- `groupIndex` — index of the EntityGroup
- `matchSource` — 'primary-matcher', 'algorithmic', or from annotations
- `matchType` — 'full', 'name-only', 'address-only', 'heuristic-medium', 'heuristic-high'
- `individualDiscovery` — true (the tag)

### 7B: PhonebookEntry Data

Each tagged matchAssociation lives on a PhonebookEntry which provides:
- **Phone number**: the entry's key (normalized 10-digit)
- **rawRecords[]**: parsed phonebook lines, each containing:
  - `record.name.firstName` — first name
  - `record.name.lastName` — last name
  - `record.name.secondName` — second first name (couples only, null otherwise)
  - `record.name.isCouple` — boolean
  - `record.address.fireNumber` — fire number if present
  - `record.address.street` — street name if present
  - `record.address.streetNormalized` — canonical street name
  - `record.address.box` — PO box number if present

### 7C: Existing Helper Functions to Reuse

| Function | Location | Purpose |
|----------|----------|---------|
| `getDistinctPersonNames(entry)` | phonebookNameProcessing.js:59 | Dedup rawRecords within one PhonebookEntry |
| `constructPhonebookNameString(nameObj)` | phonebookNameProcessing.js:92 | Build "FIRSTNAME LASTNAME" uppercase string |
| `extractNumericScore(compareResult)` | phonebookNameProcessing.js:44 | Extract numeric score from compareTo() result |
| `resolveIndividualName(term, fallback)` | utils.js:3213 | Check IndividualNameDatabase for existing match |
| `getIndividualNameHomonymThreshold()` | individualNameDatabaseBuilder.js:39 | 0.875 threshold (via window global) |
| `getIndividualNameSynonymThreshold()` | individualNameDatabaseBuilder.js:51 | 0.845 threshold (via window global) |
| `HouseholdInformation.fromVisionAppraisalData()` | householdInformation.js:261 | Create HouseholdInformation for VA individuals |
| `serializeWithTypes()` / `deserializeWithTypes()` | classSerializationUtils.js | Deep copy via serialization |
| `addPhonebookAliasToIndividualName()` | phonebookNameProcessing.js:260 | Add alias to IndividualName DB entry |
| `categorizePhonebookNameScore()` | phonebookNameProcessing.js:222 | Categorize as homonym or candidate |
| `normalizePhoneNumber()` | phonebookDatabase.js | Normalize phone to 10 digits |

### 7D: Reference Code Patterns (emulate, not copy)

| Pattern | Location | What to emulate |
|---------|----------|-----------------|
| `createIndividual()` | visionAppraisalNameParser.js:1173 | Individual creation with VA-specific properties |
| `createAggregateHousehold()` | visionAppraisalNameParser.js:1233 | HouseholdInformation setup, individuals[] population |
| `_tryMatchToExistingName()` | entityGroup.js:526 | Name reconciliation with threshold logic |
| `buildMemberCollections()` Pass 1-2 | entityGroup.js:293 | Two-pass recognized/unrecognized pattern |

---

## SECTION 8: IMPLEMENTATION STRUCTURE

### 8A: File Location

New code goes in `scripts/matching/phonebookNameProcessing.js` — consistent with Phase 4.1-4.4.

### 8B: New Functions

1. **`processIndividualDiscovery(phonebookDb, options)`** — Top-level orchestrator
   - Validates prerequisites (same pattern as `processPhase4NameVariations`)
   - Collects tagged matchAssociations, groups by entityKey
   - Calls per-household processing
   - Reports results

2. **`collectNamesForHousehold(entries)`** — Given all PhonebookEntries for one household:
   - Calls `getDistinctPersonNames()` on each entry
   - Splits couples into individual name components
   - Returns array of `{firstName, lastName, phoneNumbers[]}` objects

3. **`reconcileNames(nameObjects)`** — Name reconciliation per Section 2:
   - Creates temporary IndividualName objects for comparison
   - Builds anchor set incrementally using threshold comparisons
   - Returns array of consolidated anchors: `{primaryName, aliasForms[], phoneNumbers[]}`
   - Uses `getIndividualNameHomonymThreshold()` and `getIndividualNameSynonymThreshold()` from window globals

4. **`createIndividualForHousehold(nameAnchor, household, idx, allPhoneNumbers)`** — Creates one Individual:
   - Creates/resolves IndividualName via `resolveIndividualName()`
   - Creates Individual entity with household's locationIdentifier
   - Clones household's ContactInfo via serialize/deserialize
   - Copies VA-specific properties from household
   - Sets OtherInfo with assessment values + HouseholdInformation
   - Adds phone numbers to ContactInfo
   - Returns Individual

5. **`checkAndAddNewAddresses(household, entries)`** — Address handling per Section 3:
   - Checks phonebook address data against household's existing addresses
   - Creates and adds new addresses for Cases 4-5
   - Returns list of new addresses added (to also add to individuals)

### 8C: Execution Sequence

```
processIndividualDiscovery(phonebookDb)
  │
  ├─ Group tagged matchAssociations by entityKey
  │
  ├─ For each empty AggregateHousehold:
  │    │
  │    ├─ collectNamesForHousehold(entries)
  │    │    └─ getDistinctPersonNames() per entry
  │    │    └─ split couples
  │    │    └─ attach phone numbers
  │    │
  │    ├─ reconcileNames(nameObjects)
  │    │    └─ create temp IndividualNames
  │    │    └─ pairwise comparison with thresholds
  │    │    └─ consolidate matches
  │    │
  │    ├─ checkAndAddNewAddresses(household, entries)
  │    │    └─ Cases 1-5 evaluation
  │    │    └─ Create and add new addresses to household
  │    │
  │    ├─ For each distinct anchor:
  │    │    └─ createIndividualForHousehold(anchor, household, idx, allPhones)
  │    │    └─ household.individuals.push(individual)
  │    │
  │    └─ Register new names in IndividualNameDatabase
  │         └─ Add alias variations from reconciliation
  │
  └─ Report: households populated, individuals created, names registered, new addresses, errors
```

---

## SECTION 9: REPORTING AND DIAGNOSTICS

### 9A: Expected Output

Console log with:
- Total households processed (should be 39)
- Total individuals created
- Couples found (where two names consolidated to one = reconciliation; where two names created = couple)
- New addresses added (Cases 4-5)
- Phone numbers assigned
- New IndividualNameDatabase entries created
- Alias variations added to existing entries
- Any errors

### 9B: Per-Household Detail

For each household, log:
- Entity key and household name
- Phonebook entries contributing names (phone numbers)
- Raw names collected
- Reconciliation results (which names consolidated, which are distinct)
- Individuals created with their primary names

---

## SECTION 10: WHAT PHASE 4.5 DOES NOT DO

- Does NOT modify the unifiedEntityDatabase key structure (individuals remain only in household.individuals[])
- Does NOT rebuild entity groups — operates on already-loaded entities in memory
- Does NOT persist changes to Google Drive — that's done separately after verification
- Does NOT handle Phase 4.6 (entity-direct fallback for names not in IndividualNameDatabase)
- Does NOT handle Phase 5 (general phone number assignment to all entities)
- Does NOT handle Phase 4.7 (J.P. TANGEN match quality review)

---

## SECTION 11: PREREQUISITES FOR RUNNING

Same as Phase 4.1-4.4:
1. PhonebookDatabase loaded (`var db = new PhonebookDatabase(); await db.loadFromBulk();`)
2. Entity group database loaded (via EntityGroup Browser)
3. Unified entity database loaded
4. IndividualNameDatabase loaded (via "Load Name Database" button)
5. `tagIndividualDiscovery()` has been run (happens during pipeline)

---

## SECTION 12: OPEN ITEMS

1. **PhoneTerm creation details**: Exact AttributedTerm parameters for phonebook-sourced phones. Should be consistent with Phase 5. Minor implementation detail.
2. **Address creation for Cases 4-5**: Exact Address constructor call for creating complete BI addresses from fire number + street or PO box. Need to check existing address creation patterns (e.g., `Address.fromProcessedAddress()` or direct construction).
3. **IndividualNameDatabase registration**: When a Phase 4.5 name is truly new (not in database), we need to add it. This may create entries that Phase 4.2 reported as "0 new entries needed" — that count was from Phase 4.1's perspective (which skipped these 39 cases). The actual count for Phase 4.5 is TBD from the data.
4. **Verification plan**: After implementation, user verification needed before marking complete (per COMPLETION_VERIFICATION_RULE).

---

## SECTION 13: TESTING PLAN — STEP-BY-STEP AFTER BROWSER REFRESH

After a hard refresh (Ctrl+Shift+R), the browser has ONLY class definitions from script tags. No database instances exist in memory. Every prerequisite must be explicitly loaded before running `processIndividualDiscovery()`.

### Step 1: Verify Server and Navigate

```
Server: cd /home/robert-benjamin/RPBprojects/VisionAppraisal/BIRAVA2025/BIRAVA2025 && node servers/server.js
URL: http://127.0.0.1:1337/
```

If the server is already running, skip starting it.

### Step 2: Hard Refresh to Pick Up New Code

Press **Ctrl+Shift+R** in the browser.

This ensures the newly-written Phase 4.5 code in `phonebookNameProcessing.js` (lines 756-1510) is loaded. Without hard refresh, the browser may serve a cached version of the file that does NOT contain the Phase 4.5 functions.

**Verify**: In the browser console, type:
```javascript
typeof processIndividualDiscovery
```
Expected: `"function"`. If it returns `"undefined"`, the hard refresh did not work — try clearing the cache completely.

### Step 3: Google OAuth Authorization

If the authorize button is visible and shows "Authorize", click it to authenticate with Google.

**Verify**: The authorize button text changes to indicate successful auth. OAuth tokens expire after 1 hour — if a subsequent step fails with auth errors, re-authorize.

### Step 4: Load Unified Entity Database

In the **EntityGroup Browser** panel, click the **"Load Unified DB"** button.

Wait for the console message indicating the database loaded.

**Verify**:
```javascript
window.unifiedEntityDatabase && Object.keys(window.unifiedEntityDatabase.entities).length
```
Expected: A number > 0 (should be ~4106 entities).

### Step 5: Load EntityGroup Database

In the **EntityGroup Browser** panel, click the **"Load"** button (loads the EntityGroup database from Google Drive).

Wait for the console message indicating the database loaded.

**Verify**:
```javascript
entityGroupBrowser.loadedDatabase && Object.keys(entityGroupBrowser.loadedDatabase.groups).length
```
Expected: A number > 0 (should be ~1877 groups).

**Why this is needed**: The EntityGroup Browser initialization ensures `MATCH_CRITERIA` is available (defined in `unifiedEntityBrowser.js`, exported to `window.MATCH_CRITERIA`). The threshold functions `getIndividualNameHomonymThreshold()` and `getIndividualNameSynonymThreshold()` depend on `MATCH_CRITERIA` being defined.

### Step 6: Load StreetName Database

In the **StreetName Browser** panel, click the **"Load Database"** button.

Wait for it to complete.

**Verify**:
```javascript
window.streetNameDatabase && typeof window.streetNameDatabase.lookup === 'function'
```
Expected: `true`.

**Why this is needed**: `checkAndAddNewAddresses()` (Cases 4-5) uses `window.streetNameDatabase.lookup()` to get canonical street names when creating new BI addresses. The code has null guards and will still work without the street database, but canonical names won't be resolved — which could create inconsistent address objects.

### Step 7: Load IndividualNameDatabase

In the **IndividualName Browser** panel, click the **"Load Database"** button, then select **"DEV"** (the version with Phase 4.1-4.4 modifications).

Wait for it to complete.

**Verify**:
```javascript
window.individualNameDatabase && window.individualNameDatabase.entries.size
```
Expected: `2109` (the current count after Phase 4.1-4.4).

**Also verify threshold functions**:
```javascript
getIndividualNameHomonymThreshold()  // Expected: 0.875
getIndividualNameSynonymThreshold()  // Expected: 0.845
```
If either throws "MATCH_CRITERIA not loaded", go back to Step 5 and ensure the EntityGroup Database was loaded.

### Step 8: Load PhonebookDatabase from Bulk

In the browser console:
```javascript
var db = new PhonebookDatabase();
await db.loadFromBulk();
```

**Verify**:
```javascript
db.size
```
Expected: `1239`.

### Step 9: Run tagIndividualDiscovery

The `individualDiscovery` tags are a **runtime annotation** — they are NOT persisted to Google Drive. They must be re-applied every time the PhonebookDatabase is loaded from bulk.

In the browser console:
```javascript
tagIndividualDiscovery(db, window.unifiedEntityDatabase.entities);
```

**Expected console output**:
```
--- Tag Individual Discovery ---
Associations scanned: [some number]
Tagged individualDiscovery: 39
```

The number 39 is the expected tagged count. If it differs significantly, investigate before proceeding.

### Step 10: Run processIndividualDiscovery

In the browser console:
```javascript
var result = processIndividualDiscovery(db);
```

**Watch the console output** for:
- Per-household details (entity key, household name, phonebook entries, raw names, reconciliation, individuals created)
- The summary at the end

**Expected summary fields**:
- `Households processed: 39 / 39` (or close — some may be skipped if no valid names)
- `Individuals created:` should be > 0
- `Errors: 0` (ideally)

**Capture the full `result` object**:
```javascript
console.log(JSON.stringify(result, null, 2));
```

### Step 11: Spot-Check Individual Households

Pick 2-3 entity keys from the console output and verify the individuals were created correctly:

```javascript
// Replace with an actual entityKey from the console output
var ek = 'visionAppraisal:FireNumber:XXXX';
var household = window.unifiedEntityDatabase.entities[ek];

console.log('Household name:', household.name.primaryAlias.term);
console.log('Individuals count:', household.individuals.length);

household.individuals.forEach(function(ind, i) {
    console.log('--- Individual ' + i + ' ---');
    console.log('  Name:', ind.name.primaryAlias.term);
    console.log('  locationIdentifier:', ind.locationIdentifier?.term);
    console.log('  pid:', ind.pid);
    console.log('  fireNumber:', ind.fireNumber);
    console.log('  source:', ind.source);
    console.log('  contactInfo present:', !!ind.contactInfo);
    console.log('  primaryAddress:', ind.contactInfo?.primaryAddress?.originalAddress?.term);
    console.log('  islandPhone:', ind.contactInfo?.islandPhone?.term);
    console.log('  additionalPhones:', (ind.contactInfo?.additionalPhones || []).map(function(p) { return p.term; }));
    console.log('  otherInfo:', !!ind.otherInfo);
    console.log('  assessmentValue:', ind.otherInfo?.assessmentValue || ind.otherInfo?.getAssessmentValue?.());
    console.log('  householdInfo:', ind.otherInfo?.householdInformation?.householdName, 'isHead:', ind.otherInfo?.householdInformation?.isHeadOfHousehold);
});
```

### Step 12: Verify Structural Consistency

Compare a newly-created individual against an existing VA household's individual (one that was created by the original VA name parser) to verify structural consistency:

```javascript
// Find a VA household that already has individuals (not one of the 39)
var existingHousehold = null;
var existingKey = null;
for (var key in window.unifiedEntityDatabase.entities) {
    var ent = window.unifiedEntityDatabase.entities[key];
    if (ent.constructor.name === 'AggregateHousehold' &&
        ent.individuals && ent.individuals.length > 0 &&
        ent.source === 'VISION_APPRAISAL') {
        existingHousehold = ent;
        existingKey = key;
        break;
    }
}

if (existingHousehold) {
    var existingInd = existingHousehold.individuals[0];
    console.log('=== REFERENCE (existing VA individual) ===');
    console.log('Name type:', existingInd.name.constructor.name);
    console.log('Has locationIdentifier:', !!existingInd.locationIdentifier);
    console.log('Has pid:', !!existingInd.pid);
    console.log('Has fireNumber:', !!existingInd.fireNumber);
    console.log('Has mblu:', !!existingInd.mblu);
    console.log('Has source:', existingInd.source);
    console.log('Has contactInfo:', !!existingInd.contactInfo);
    console.log('Has otherInfo:', !!existingInd.otherInfo);
    console.log('Has householdInfo:', !!existingInd.otherInfo?.householdInformation);
    console.log('comparisonWeights:', JSON.stringify(existingInd.comparisonWeights));
}
```

Then run the same checks on one of the newly-created individuals to compare side by side.

### Step 13: Check IndividualNameDatabase Modifications

```javascript
// Check if new entries were added
console.log('IndividualName DB entries:', window.individualNameDatabase.entries.size);
// Should be >= 2109 (2109 was pre-Phase-4.5 count)
// The difference is the number of new names Phase 4.5 registered
```

If `result.newIndNameEntries > 0`, these are memory-only and NOT yet saved to Google Drive. **Do NOT save yet** — wait until all verification is complete and user approves.

### Step 14: Known Things to Watch For

1. **"Phase 4.5: entityKey not found in database"** warnings — indicates a matchAssociation points to an entity that doesn't exist in the loaded database. Should be rare (2 known Bloomerang edge cases).

2. **"SKIP: No valid names found"** — a household had tagged matchAssociations but the phonebook entries had no parseable person names. Log and move on.

3. **Errors about threshold functions** — means Step 5 (EntityGroup database) or the `unifiedEntityBrowser.js` script wasn't loaded properly.

4. **Address creation without canonical street names** — if Step 6 (StreetName Database) was skipped, new addresses will use the raw phonebook street name instead of the canonical database form.

5. **Phone number format** — all phone numbers should be 10-digit normalized strings (e.g., "4014661234"). PhoneTerm stores the raw string.

### Step 15: After Successful Test — Save (if needed)

If the test is successful and user approves:
```javascript
// Only if result.newIndNameEntries > 0 or result.aliasesAdded > 0:
await saveModifiedIndividualNames(window.individualNameDatabase, new Set(["phase4.5"]));
```

The unified entity database changes (new individuals in household.individuals[]) are **in-memory only**. They will persist if the unified database is saved, or will be re-created the next time the full pipeline is run. For now, the test only needs to verify correctness.

---

## DOCUMENT END

**Document Version**: 1.1
**Created**: March 1, 2026
**Updated**: March 1, 2026 (Session 132 — added Section 13 testing plan)
**Session**: 132
