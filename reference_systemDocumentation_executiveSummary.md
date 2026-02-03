# BIRAVA2025 System Documentation - Executive Summary

## AI Reading Instructions
```yaml
purpose: Condensed reference derived from reference_systemDocumentation.md
usage_trigger: Read this BEFORE searching code when asked about system functionality
when_to_read_full_doc: When this summary lacks needed detail
full_doc_location: reference_systemDocumentation.md (1200+ lines)
```

---

## 1. System Purpose

BIRAVA2025 integrates **VisionAppraisal** (Block Island property tax data, ~2317 entities) with **Bloomerang** (donor/contact database, ~1780 entities) to: (1) discover NEW contacts (VA owners not in Bloomerang), (2) enrich existing Bloomerang contacts with property data, (3) avoid duplicate outreach by matching across sources. The system builds **EntityGroups** representing matched real-world persons/households.

---

## 2. Class Hierarchies

### Entity Classes
```
Entity (base)
  ├── Individual
  ├── CompositeHousehold
  ├── AggregateHousehold (has individuals[] array)
  └── NonHuman              ← Can be instantiated directly (Bloomerang organizations)
        ├── Business        ← VisionAppraisal businesses
        └── LegalConstruct  ← VisionAppraisal trusts, estates, etc.
```
**Location:** `scripts/objectStructure/entityClasses.js`

### Name Classes
| Entity Type | Name Class |
|-------------|------------|
| Individual | IndividualName |
| AggregateHousehold | HouseholdName |
| Business/LegalConstruct | NonHumanName |

**Location:** `scripts/objectStructure/aliasClasses.js`

### Info Classes
```
Info (base)
  ├── ContactInfo (email, phone, addresses)
  ├── OtherInfo (fireNumber, accountNumber, assessment values)
  │     └── HouseholdOtherInfo
  └── LegacyInfo (VisionAppraisal raw fields)
```
**Location:** `scripts/objectStructure/contactInfo.js`

### Identifier Classes (Aliased Pattern)
```
Aliased (base)
  ├── SimpleIdentifiers (PID, FireNumber, POBox, StreetName)
  └── ComplexIdentifiers (IndividualName, HouseholdName, Address)
```
**Location:** `scripts/objectStructure/aliasClasses.js`

---

## 3. Database Structures

### Unified Entity Database
```javascript
unifiedEntityDatabase = {
  metadata: { totalEntities, sources: {visionAppraisal, bloomerang} },
  entities: { [key]: Entity }
}
```
**Access Pattern:** `unifiedEntityDatabase.entities[key]`

**Key Formats:**
- VisionAppraisal: `visionAppraisal:FireNumber:<number>`
- Bloomerang: `bloomerang:<accountNumber>:<locationType>:<locationValue>:<headStatus>`

### EntityGroup Database
```javascript
entityGroupDatabase = {
  metadata: { totalGroups },
  groups: { [index]: EntityGroup }  // OBJECT not Array - use Object.values()
}
```

**EntityGroup Properties:** `index, foundingMemberKey, memberKeys[], nearMissKeys[], consensusEntity, hasBloomerangMember, isProspect, isExistingDonor`

**EntityGroup Collection Properties (February 2026):** `individualNames{}, unrecognizedIndividualNames{}, blockIslandPOBoxes{}, blockIslandAddresses{}, unrecognizedBIAddresses{}, offIslandAddresses[]`

**Key Method:** `buildMemberCollections(entityDatabase)` - Aggregates unique identifiers from member entities (multi-member groups only)

### AliasedTermDatabase (January 2026)
```javascript
AliasedTermDatabase = {
  entries: Map<string, {object, fileId}>,
  folderFileId, databaseFileId, objectType,
  _variationCache: Map<string, string>
}
```
**Key Methods:** `loadFromDrive()`, `lookup(term)`, `add(object)`, `remove(primaryKey)`, `changePrimaryAlias()`

**Location:** `scripts/databases/aliasedTermDatabase.js`

### StreetNameDatabase (January 2026)
Extends AliasedTermDatabase for Block Island street names.

**Location:** `scripts/databases/streetNameDatabase.js`

**Global Access:** `window.streetNameDatabase`

### IndividualNameDatabase (January 2026)
Extends AliasedTermDatabase for individual names with alias support. Enables matching across name variations (e.g., "JOHN SMITH" ↔ "JOHNNY SMITH").

**Key Methods:** `lookupExisting(name)`, `lookupName(name, threshold)`, `findByLastName(lastName)`, `findByPattern(pattern)`

**Location:** `scripts/databases/individualNameDatabase.js`

**Global Access:** `window.individualNameDatabase`

**Reference Document:** `reference_individualNameDatabase.md`

### Fire Number Collision Database (January 2026)
```javascript
fireNumberCollisionDatabase = {
  byFireNumber: Map<fireNumber, {fireNumber, entityKeys[], pids[], lastUpdated}>,
  byEntityKey: Map<entityKey, fireNumber>
}
```
**Key Functions:** `isFireNumberCollisionAddress()`, `detectCollisionCase()`, `getCollisionByFireNumber()`

**Location:** `scripts/fireNumberCollisionDatabase.js`

**Global Access:** `window.fireNumberCollisionDatabase`

---

## 4. Core Algorithms

### 6-Phase EntityGroup Construction
| Phase | Source | Entity Types |
|-------|--------|--------------|
| 1 | VisionAppraisal | AggregateHousehold |
| 2 | VisionAppraisal | Individual |
| 3 | VisionAppraisal | Business, LegalConstruct, Other |
| 4 | Bloomerang | AggregateHousehold |
| 5 | Bloomerang | Individual |
| 6 | Bloomerang | Business, LegalConstruct, Other |

**Rationale:** VisionAppraisal first because property data is authoritative for Block Island addresses.

**Location:** `scripts/matching/entityGroupBuilder.js`

### 9-Step Group Building Algorithm
| Step | Action |
|------|--------|
| 0 | Remove natural matches excluded with founder |
| 1 | Find natural matches via algorithmic comparison |
| 2 | Resolve exclusions among natural matches |
| 3 | Generate founder forced matches from override rules |
| 3.5 | Check for contradictory founder force-match + exclusion |
| 4 | Resolve exclusions among founder forced matches |
| 5 | Check founder forced vs natural matches (founder forced wins) |
| 6 | Generate forced matches from natural matches |
| 7 | Check forced-from-naturals vs founder forced |
| 7.5 | Check forced-from-naturals for founder exclusions |
| 8 | Resolve exclusions among forced-from-naturals |
| 9 | Household pulling |

### Match Override System
| Type | Purpose | Model |
|------|---------|-------|
| FORCE_MATCH | Ensure entities in same group | Anchor/Dependent |
| FORCE_EXCLUDE | Prevent entities from grouping | Defective/Other |

**Location:** `scripts/matching/matchOverrideManager.js`

### Comparison Architecture
Entity comparisons flow through TWO separate code paths:
1. `entity.compareTo()` → `entityWeightedComparison` (in utils.js)
2. `universalCompareTo()` → `compareIndividualToEntityDirect` (in universalEntityMatcher.js)

**CRITICAL:** Changes affecting comparison logic may need to be applied to BOTH paths.

### IndividualName Four-Score Comparison (February 2026)
- `IndividualName.compareTo()` returns `{primary, homonym, synonym, candidate}` for database lookup
- `Aliased.numericCompareTo()` returns single weighted score (0-1) for entity matching
- `safeNumericCompare()` helper handles polymorphic comparison calls
- `lookupExisting()` in IndividualNameDatabase uses four-score comparison (threshold: any category >= 0.99)
- `resolveIndividualName()` in utils.js provides standard lookup-or-create pattern

### Weighted Comparison Calculators
| Calculator | Purpose |
|------------|---------|
| defaultWeightedComparison | General comparison |
| addressWeightedComparison | Address comparison |
| contactInfoWeightedComparison | ContactInfo comparison |
| entityWeightedComparison | Full entity comparison |
| householdInformationWeightedComparison | HouseholdInformation comparison |

**Location:** `scripts/utils.js` COMPARISON_CALCULATOR_REGISTRY

### Same-Location Entity Handling
**Problem:** Entities at same physical location (condos) incorrectly grouped.

**Solution:** When `areSameLocationEntities()` returns true, use `compareSecondaryAddressesOnly()` instead of full contactInfo comparison.

**Detection:** Fire numbers share same base but have different full values (e.g., 72J vs 72W).

### Fire Number Collision Cases
| Case | Condition | Action |
|------|-----------|--------|
| a | Neither is collision address | Normal comparison |
| b | One collision, other not | Normal comparison |
| c | Both collision, different fire numbers | Normal comparison |
| d | Both VA, same collision fire number | EXCLUDE - do not group |
| e | Both collision, same fire number (other) | Compare with fireNumber similarity = 0 |

---

## 5. Address Processing

### Block Island Logic
- **Rule 1:** If source is VisionAppraisal and city/state missing → auto-complete with Block Island, RI, 02807
- **Rule 2:** If city missing but street matches BI streets database → auto-complete

### Two-File Street Architecture
| File | Purpose | Google Drive ID |
|------|---------|-----------------|
| VA Processing Street File | Chunking for VA download | `1lsrd0alv9O01M_qlsiym3cB0TRIdgXI9` |
| StreetName Alias Database | Entity recognition with alias support | Folder `1rHhgyxbiPOSw314kpo2MsFgSRQg5zQkC` |

**Rule:** The VA Processing Street File is NEVER modified by the alias system.

**Location:** `scripts/address/addressProcessing.js`

---

## 6. Google Drive File IDs

### Production Databases
| File | ID |
|------|-----|
| Unified Database | `1Z2V4Pi8KoxUR9B47KffEQI6gCs7rOS2Y` |
| EntityGroup Database | `120z4Q_JVWjSij2BOyv93s_XnJ-SLqR1N` |
| EntityGroup Reference | `10LPpCPBWkc8ZQDqCake-0QenVWjCRpdd` |

### Street Name System
| File | ID |
|------|-----|
| StreetName Index | `1QXYBgemrQuFy_wyX1hb_4eLhb7B66J1S` |
| StreetName Objects Folder | `1rHhgyxbiPOSw314kpo2MsFgSRQg5zQkC` |
| StreetName Deleted Folder | `1J7YFTy9zUW_SP1hbOeenTM2LhNmbgOUj` |
| VA Processing Streets | `1lsrd0alv9O01M_qlsiym3cB0TRIdgXI9` |

### Override Rules (Google Sheets)
| Sheet | ID |
|-------|-----|
| FORCE_MATCH | `1WWq8rgVyIKgf3qhVpl5mBiVQllljum0JVm2e_h-WZo8` |
| FORCE_EXCLUDE | `1nZIqcBa3LW1DcUKXVr1jNCGsZqq6JLTaxJSpXSZyulk` |

### Other
| File | ID |
|------|-----|
| Fire Number Collision DB | `1exdeASVuntM6b_nyJUNUO0_EqRX8Jjz0` |
| PID Files Folder | `1qgnE1FW3F6UG7YS4vfGBm9KzX8TDuBCl` |

---

## 7. Critical Files Reference

### Tier 1: Core Infrastructure
| File | Purpose |
|------|---------|
| `index.html` | Main UI, all buttons, script loading |
| `scripts/baseCode.js` | VA scraping (Buttons 1-4) |
| `scripts/googleLinks.js` | Google API authentication |
| `scripts/fileLogistics.js` | File I/O operations |

### Tier 2: Entity System
| File | Purpose |
|------|---------|
| `scripts/objectStructure/entityClasses.js` | Entity, Individual, AggregateHousehold, Business, LegalConstruct |
| `scripts/objectStructure/contactInfo.js` | ContactInfo, Address classes |
| `scripts/objectStructure/aliasClasses.js` | IndividualName, AttributedTerm, StreetName |
| `scripts/objectStructure/householdInformation.js` | HouseholdInformation class |
| `scripts/objectStructure/entityGroup.js` | EntityGroup, EntityGroupDatabase |
| `scripts/utils/classSerializationUtils.js` | Serialization/deserialization |

### Tier 3: Data Processing
| File | Purpose |
|------|---------|
| `scripts/dataSources/visionAppraisal.js` | VA data loading |
| `scripts/dataSources/processAllVisionAppraisalRecords.js` | Entity creation from VA |
| `scripts/dataSources/visionAppraisalNameParser.js` | Name parsing |
| `scripts/dataSources/fireNumberCollisionHandler.js` | Fire number collision detection |
| `scripts/bloomerang.js` | Bloomerang CSV processing |
| `verification.js` | `generateFreshEveryThingWithPid()` |

### Tier 4: Matching & Grouping
| File | Purpose |
|------|---------|
| `scripts/matching/entityGroupBuilder.js` | 6-phase, 9-step algorithm |
| `scripts/matching/matchOverrideManager.js` | Override rules from Google Sheets |
| `scripts/matching/universalEntityMatcher.js` | Entity comparison |
| `scripts/utils.js` | Comparison calculators |
| `scripts/fireNumberCollisionDatabase.js` | Collision tracking |

### Tier 5: Browsers & Export
| File | Purpose |
|------|---------|
| `scripts/unifiedEntityBrowser.js` | Unified Entity Browser |
| `scripts/entityGroupBrowser.js` | EntityGroup Browser + CSV Reports + Collections Report |
| `scripts/export/csvReports.js` | CSV export functions including Collections Report |
| `scripts/entityRenderer.js` | Entity details popup windows |
| `scripts/export/lightweightExporter.js` | Lightweight JSON export |
| `scripts/streetNameBrowser.js` | StreetName alias management |
| `scripts/fireNumberCollisionBrowser.js` | Collision data browser |

### Tier 6: Alias Database Infrastructure
| File | Purpose |
|------|---------|
| `scripts/databases/aliasedTermDatabase.js` | Parent class for aliased object databases |
| `scripts/databases/streetNameDatabase.js` | StreetName individual-file database |
| `scripts/databases/individualNameDatabase.js` | IndividualName individual-file database |
| `scripts/databases/individualNameDatabaseBuilder.js` | Builds IndividualNameDatabase from EntityGroups |
| `scripts/databases/individualNameDatabaseSaveManager.js` | Persistence layer for IndividualNameDatabase |
| `scripts/individualNameBrowser.js` | IndividualName alias management UI |
| `scripts/streetTypeAbbreviations.js` | Street type abbreviation management |
| `scripts/streetNameDatabaseConverter.js` | Migration tool |

---

## 8. Critical Lessons Learned

| Lesson | Detail |
|--------|--------|
| Template literals | Do NOT use `${...}` inside `<script>` blocks |
| OAuth expiration | Tokens expire after 1 hour - save promptly |
| Function returns | Always assign return values |
| Saved vs memory | Rebuild EntityGroup database to test code changes |
| Key generation | NEVER generate keys twice - use existing keys |
| EntityGroup iteration | `groups` is Object, use `Object.values()` |
| Same-location check | Must happen BEFORE entity type routing |
| Cross-references | Use actual database keys, not regenerated keys |

---

## 9. Server & Startup

```bash
cd BIRAVA2025 && node servers/server.js
```
**URL:** http://127.0.0.1:1337/

---

**Document Version:** 2.2
**Created:** January 28, 2026
**Updated:** February 3, 2026
**Source Document:** reference_systemDocumentation.md v2.2

**Version 2.2 Changes (February 2026):**
- EntityGroup collection properties (6 new properties for aggregating member data)
- IndividualName four-score comparison architecture
- Collections Report CSV export
