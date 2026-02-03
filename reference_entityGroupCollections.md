# EntityGroup Member Collections

**Document Purpose**: Plan and specification for adding six new collection properties to EntityGroup class, enabling aggregation of unique identifiers from member entities.

**Document Status**: USER_VERIFIED_COMPLETE

**Last Updated**: February 3, 2026 (Session 93)

**Predecessor**: This work precedes Section 4 (Phonebook/Street Integration) of reference_phonebookIntegration.md

---

## QUICK START

### Project Goal
Add six new properties to EntityGroup that collect unique identifiers (IndividualNames, Addresses, PO Boxes) from all member entities, enabling data from multiple sources to be aggregated at the group level.

### Why This Precedes Phonebook Integration
The phonebook integration (Section 4 of reference_phonebookIntegration.md) will add street variations to the StreetName database. Before that, we need EntityGroups to properly track and aggregate address data. These collections provide the infrastructure for that work.

---

## SECTION 1: SIX NEW PROPERTIES

| # | Property | Key Format | Contents |
|---|----------|------------|----------|
| 1 | `individualNames` | IndividualNameDatabase key | IndividualName objects found in database |
| 2 | `unrecognizedIndividualNames` | primaryAlias.term (normalized) | IndividualName objects NOT matched to database entries |
| 3 | `blockIslandPOBoxes` | PO Box identifier (e.g., "123", "A") | POBox objects (exact keying) |
| 4 | `blockIslandAddresses` | `{fireNumber}:{streetNameDbKey}` | Address objects with recognized BI streets |
| 5 | `unrecognizedBIAddresses` | `{fireNumber} {streetName} {streetType}` | BI addresses NOT matched to recognized addresses |
| 6 | `offIslandAddresses` | N/A (array) | Non-Block Island Address objects (with alias structure) |

**Source:** All member entities only (excluding consensusEntity, excluding nearMisses)

---

## SECTION 2: DEDUPLICATION STRATEGIES

| Property | Strategy | Thresholds |
|----------|----------|------------|
| `individualNames` | Natural deduplication by database key | N/A |
| `unrecognizedIndividualNames` | Alias structure - compare to `individualNames` first | `getIndividualNameHomonymThreshold()` / `getIndividualNameSynonymThreshold()` |
| `blockIslandPOBoxes` | Exact keying (PO Box numbers are exact) | N/A |
| `blockIslandAddresses` | Natural deduplication by composite key | N/A |
| `unrecognizedBIAddresses` | Alias structure - compare to `blockIslandAddresses` first | `MATCH_CRITERIA.trueMatch.contactInfoAlone` / `.nearMatch.contactInfoAlone` |
| `offIslandAddresses` | Alias structure with deduplication | `MATCH_CRITERIA.trueMatch.contactInfoAlone` / `.nearMatch.contactInfoAlone` |

### Threshold Values (from MATCH_CRITERIA - never hardcode)

| Type | Homonym Threshold | Synonym Threshold |
|------|-------------------|-------------------|
| IndividualName | 0.875 (`trueMatch.nameAlone`) | 0.845 (`nearMatch.nameAlone`) |
| Address | 0.87 (`trueMatch.contactInfoAlone`) | 0.85 (`nearMatch.contactInfoAlone`) |

---

## SECTION 3: PROCESSING ORDER (Critical)

### 3A: IndividualNames Processing

**Pass 1:** Collect all IndividualNames found in IndividualNameDatabase into `individualNames`

**Pass 2:** For each unrecognized name, compare to entries in `individualNames`:
- **Homonym threshold met (≥0.875):** Add to that individualName's `alternatives.homonyms` (memory-resident only) → NOT recorded elsewhere
- **Synonym threshold met (≥0.845):** Add to that individualName's `alternatives.candidates` (promoted because same EntityGroup provides corroborating evidence) → NOT recorded elsewhere
- **No match:** Record in `unrecognizedIndividualNames`

### 3B: BI Addresses Processing

**Pass 1:** Collect all addresses with recognized streets into `blockIslandAddresses`

**Pass 2:** For each unrecognized BI address, compare to entries in `blockIslandAddresses`:
- **Homonym threshold met (≥0.87):** Add to that address's `alternatives.homonyms` → NOT recorded elsewhere
- **Synonym threshold met (≥0.85):** Add to that address's `alternatives.candidates` → NOT recorded elsewhere
- **No match:** Record in `unrecognizedBIAddresses` with console.log warning

### 3C: Off-Island Addresses Processing

Collect all, then apply alias structure deduplication:
- Build primary collection
- For each subsequent address, compare to existing
- Homonyms added to existing address's `alternatives.homonyms`
- Synonyms added to existing address's `alternatives.candidates`

---

## SECTION 4: KEY DESIGN DECISIONS

### 4A: Alias Promotion Rule
When an unrecognized item matches an existing item at the **synonym** threshold, it is added to `alternatives.candidates` (not `alternatives.synonyms`). Rationale: Being in the same EntityGroup provides corroborating evidence that promotes synonym-level matches to candidate status.

### 4B: Memory-Only Changes
All alias additions (`alternatives.homonyms`, `alternatives.candidates`) are memory-resident only. Google Drive files for IndividualNameDatabase and StreetNameDatabase entries are NOT modified.

### 4C: No Hardcoded Thresholds
All thresholds reference `MATCH_CRITERIA` or existing helper functions:
- `getIndividualNameHomonymThreshold()` from individualNameDatabaseBuilder.js
- `getIndividualNameSynonymThreshold()` from individualNameDatabaseBuilder.js
- `window.MATCH_CRITERIA.trueMatch.contactInfoAlone`
- `window.MATCH_CRITERIA.nearMatch.contactInfoAlone`

### 4D: PO Boxes Use Exact Keying
PO Box identifiers (which can include letters, e.g., "123", "A", "456B") are exact. No alias structure is needed - same key = same PO Box.

### 4E: Collection-Only Tracking
Changes to `alternatives` are tracked in the collection context only. Source objects in the unified entity database are not modified.

---

## SECTION 5: ADDRESS COMPARISON LOGIC

### 5A: Address.compareTo() Routing

```
addressWeightedComparison routes based on address types:

1. One PO Box, one NOT PO Box → Compare city/state/zip only
2. Both PO Boxes → comparePOBoxAddresses()
3. Both Block Island → compareBlockIslandAddresses()
4. Otherwise → compareGeneralStreetAddresses()
```

### 5B: Block Island Address Comparison

When both addresses are Block Island (zip 02807 or recognized street + BI city):

| Component | Weight | Method |
|-----------|--------|--------|
| streetNumber (fire number) | **0.85** | Exact match (1 or 0) |
| streetName | **0.15** | `biStreetName.compareTo()` if available, else Levenshtein |

**Result:** `0.85 × streetNumSim + 0.15 × streetNameSim`

### 5C: Off-Island Address Comparison

**With zip code:**
| Component | Weight |
|-----------|--------|
| streetNumber | 0.30 |
| streetName | 0.20 |
| zipCode | **0.40** |
| state | 0.10 |

**Without zip code:**
| Component | Weight |
|-----------|--------|
| streetNumber | 0.30 |
| streetName | 0.20 |
| city | 0.25 |
| state | 0.25 |

### 5D: PO Box Comparison

**With zip present:**
- zipSim < 0.74 → Return 0
- zipSim === 1.0 → Return secUnitNum similarity
- 0.74 ≤ zipSim < 1.0 → Weighted: `0.3×zip + 0.3×secUnitNum + 0.2×city + 0.2×state`

---

## SECTION 6: ARCHITECTURE

### 6A: Skip Single-Member Groups

**Decision (Session 90):** `buildMemberCollections()` only runs for multi-member groups.

**Rationale:**
- Single-member groups have nothing to aggregate - all data is in the one entity
- Running for singles would just copy data into a different structure with no benefit
- Matches `buildConsensusEntity()` pattern which also skips singles

### 6B: Separate Function with Shared Helpers (Option 2)

**Decision (Session 90):** Keep `buildMemberCollections()` as a separate method from `buildConsensusEntity()`.

**Rationale:**
- Clear separation of concerns (synthesis vs aggregation)
- Each method testable in isolation
- Can evolve independently
- Method names accurately describe what they do

**Shared Helper:** `_getMemberEntities(entityDatabase)` retrieves member entity objects - used by both methods.

### 6C: Execution Sequence

```javascript
buildAllConsensusEntities(entityDatabase) {
    for (const group of this.getAllGroups()) {
        if (group.hasMultipleMembers()) {
            group.buildConsensusEntity(entityDatabase);
            group.buildMemberCollections(entityDatabase);  // Only multi-member
        }
    }
}
```

---

## SECTION 7: IMPLEMENTATION TASKS

| # | Task | Status |
|---|------|--------|
| 7.1 | Add six new properties to EntityGroup constructor | CODED |
| 7.2 | Create `_getMemberEntities()` shared helper method | CODED |
| 7.3 | Refactor `buildConsensusEntity()` to use `_getMemberEntities()` | CODED |
| 7.4 | Create `_collectNamesFromEntity()` helper | CODED |
| 7.5 | Create `_collectAddressesFromEntity()` helper | CODED |
| 7.6 | Create `_collectPOBoxFromEntity()` helper | CODED |
| 7.7 | Create `_tryMatchToExistingName()` helper | CODED |
| 7.8 | Create `_tryMatchToExistingBIAddress()` helper | CODED |
| 7.9 | Create `_deduplicateWithAliasStructure()` helper | CODED |
| 7.10 | Create main `buildMemberCollections()` method | CODED |
| 7.11 | Add `getKeyForName()` to IndividualNameDatabase | NOT_NEEDED |
| 7.12 | Update `buildAllConsensusEntities()` to call new method | CODED |
| 7.13 | Test serialization/deserialization preserves new properties | IN_PROGRESS |
| 7.14 | Final testing and verification | IN_PROGRESS |

**Serialization Note:** Uses serializeWithTypes/deserializeWithTypes. Added EntityGroup and EntityGroupDatabase to CLASS_REGISTRY.

**Architecture Decision (Session 90):** Skip single-member groups; use Option 2 (separate functions with shared helpers).

### 7A: Session 91 Implementation Progress

**Key Fixes Made (Session 91):**
- Changed `_collectNamesFromEntity` to check `entity.name` directly (not `entity.name.identifier`)
- Added EntityGroup/EntityGroupDatabase to CLASS_REGISTRY for serialization
- Removed explicit serialize/deserialize methods (use automatic serializeWithTypes)

### 7B: Session 92 - All 6 Collections Working

**Collections Status (All Working):**
| Collection | Groups | Items | Status |
|------------|--------|-------|--------|
| individualNames | 750 | 1344 | WORKING |
| unrecognizedIndividualNames | 0 | 0 | WORKING (expected - all matched via Section 7) |
| blockIslandPOBoxes | 163 | 166 | WORKING |
| blockIslandAddresses | 739 | 1603 | WORKING |
| unrecognizedBIAddresses | reduced | reduced | WORKING (PO Boxes now excluded) |
| offIslandAddresses | 580 | 733 | WORKING |

**Key Fixes Made (Session 92):**
1. `_isNameFromDatabase()` - Fixed to use `sourceMap.has()` instead of checking `__data` (sourceMap is a live Map, not serialized)
2. First→Best match conversion - `_tryMatchToExistingName()`, `_tryMatchToExistingBIAddress()`, `_deduplicateWithAliasStructure()` now find best match, not first match
3. `safeNumericCompare()` - Updated to handle IndividualName's four-score return by extracting `Math.max(primary, homonym, candidate)`
4. Type mismatch handling - `safeNumericCompare()` returns null for cross-type comparisons (e.g., IndividualName vs HouseholdName)
5. `levenshteinSimilarity()` - Added string conversion for non-string inputs (FireNumber terms)
6. PO Box classification - Address classifier now skips PO Box addresses (handled separately in blockIslandPOBoxes)
7. Removed all diagnostic logs

### 7C: Session 93 - Collections Report Added

**Collections Report CSV** (Session 93):
- New button "Collections Report" in CSV Reports panel (purple, index.html)
- Function `runCollectionsReport()` auto-loads databases if needed
- Function `downloadCollectionsReport()` generates the CSV
- Headers: GroupIndex, RowType, RowNum, Name, NameKey, UnrecogName, FireNum, Street, City, State, Zip, UnrecogBIAddr, OffIslandAddr, POBox
- Each multi-member group gets: 1 consensus row + N collection rows (N = max collection size)
- Collection data reuses consensus columns where appropriate (Name column for individualNames, address columns for blockIslandAddresses)
- Code location: scripts/export/csvReports.js lines 2878-3190

**Other Session 93 Fixes:**
- Added LLP to BusinessTermsMaster - Nonnames.csv (was missing)
- Fixed lookupExisting() in individualNameDatabase.js - bypass check now comes BEFORE database loaded check
- Added Delete Selected button to IndividualName Browser (only works when loaded from DEV bulk)

---

## SECTION 8: FILES TO MODIFY

1. **scripts/objectStructure/entityGroup.js** - Main changes
   - Constructor: Add six new properties
   - Refactor: `buildConsensusEntity()` to use shared `_getMemberEntities()` helper
   - New method: `buildMemberCollections(entityDatabase)`
   - New shared helper: `_getMemberEntities(entityDatabase)` - used by both methods
   - New helpers: `_collectNamesFromEntity()`, `_collectAddressesFromEntity()`, `_collectPOBoxFromEntity()`, `_tryMatchToExistingName()`, `_tryMatchToExistingBIAddress()`, `_deduplicateWithAliasStructure()`, `_isBlockIslandPOBox()`
   - Update: `buildAllConsensusEntities()` in EntityGroupDatabase
   - Verify: Serialization/deserialization preserves new properties (no code changes needed)

2. **scripts/databases/individualNameDatabase.js**
   - New method: `getKeyForName(individualName)`

---

## SECTION 9: VERIFICATION PLAN

1. **Unit test:** Build EntityGroupDatabase, verify collections populated correctly
2. **Alias verification:** Check that unrecognized items matching existing items appear in `alternatives.homonyms` / `alternatives.candidates`
3. **Console check:** Verify unrecognized BI addresses produce console.log warnings
4. **Threshold check:** Verify thresholds reference MATCH_CRITERIA, not hardcoded values
5. **Serialization test:** Save and reload EntityGroupDatabase, verify collections survive round-trip
6. **Count verification:** Total items across collections should account for all addresses/names from member entities

---

## SECTION 10: CODE SNIPPETS

### 10A: Constructor Additions

```javascript
// Member collections (populated by buildMemberCollections)
this.individualNames = {};              // Key: IndividualNameDatabase key
this.unrecognizedIndividualNames = {};  // Key: normalized primaryAlias.term
this.blockIslandPOBoxes = {};           // Key: PO Box identifier
this.blockIslandAddresses = {};         // Key: {fireNumber}:{streetNameDbKey}
this.unrecognizedBIAddresses = {};      // Key: full address string
this.offIslandAddresses = [];           // Array of Address objects
```

### 10B: getKeyForName Helper (IndividualNameDatabase)

```javascript
getKeyForName(individualName) {
    if (!individualName?.primaryAlias?.term) return null;
    const normalized = this._normalizeKey(individualName.primaryAlias.term);
    if (this.entries.has(normalized)) {
        return normalized;
    }
    const cachedKey = this._variationCache.get(normalized);
    return cachedKey || null;
}
```

### 10C: Name Matching Logic

```javascript
_tryMatchToExistingName(name, homonymThreshold, synonymThreshold) {
    for (const [key, existingName] of Object.entries(this.individualNames)) {
        const scores = name.compareTo(existingName);
        const maxScore = Math.max(scores.primary, scores.homonym, scores.synonym, scores.candidate);

        if (maxScore >= homonymThreshold) {
            if (!existingName.alternatives.homonyms) existingName.alternatives.homonyms = [];
            existingName.alternatives.homonyms.push(name);
            return true;
        } else if (maxScore >= synonymThreshold) {
            if (!existingName.alternatives.candidates) existingName.alternatives.candidates = [];
            existingName.alternatives.candidates.push(name);
            return true;
        }
    }
    return false;
}
```

---

## DOCUMENT END

**Document Version**: 1.0
**Created**: February 2, 2026
**Plan File**: /home/robert-benjamin/.claude/plans/velvety-growing-gosling.md
