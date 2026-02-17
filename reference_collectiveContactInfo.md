# CollectiveContactInfo Architecture

**Document Purpose**: Design and implementation plan for the CollectiveContactInfo class hierarchy, which gives EntityGroups (as Contact Units) a first-class structure for managing contact pathways.

**Document Status**: PHASES 1-3 USER_VERIFIED_COMPLETE — Phases 4-5 CODED_AND_USER_TESTED (Session 102)

**Last Updated**: February 17, 2026

---

## SECTION 1: CONCEPTUAL FOUNDATION

### EntityGroup as Contact Unit

Through architectural discussion (Session 95), we established that an EntityGroup is a **Contact Unit** — the system's best understanding of a coherent group of people and properties that should be treated as a single target for communication.

Key definitions:
- **Entity** = a piece of evidence (what a data source told us)
- **Contact Unit (EntityGroup)** = an inference (what we concluded from all the evidence)
- The relationship is **compositional, not hierarchical** — EntityGroup references entities by key, it does not extend Entity

EntityGroup remains a standalone class (Option 4 from the architectural discussion). It is not a child of Entity, Entity is not altered to accommodate it, and no shared parent is created. The two serve fundamentally different roles at different levels of abstraction.

### Why CollectiveContactInfo

Currently, contact information for an EntityGroup is scattered across:
1. Individual member entities' ContactInfo objects
2. The consensus entity's synthesized ContactInfo
3. The member collections (blockIslandAddresses, blockIslandPOBoxes, etc.)

The consensus entity was a valuable exercise that forced development of cross-entity synthesis logic, but it is architecturally awkward — a fake AggregateHousehold pretending to be a source record. CollectiveContactInfo replaces the contact-related purpose of the consensus entity with a purpose-built structure that directly answers: **"what are all the ways to reach this contact unit, and which is preferred?"**

### Relationship to ContactInfo

ContactInfo (on Entity) models **one source record's contact data** — a single primary address, a single email, etc. CollectiveContactInfo models **a contact unit's full inventory of contact pathways** — all known addresses, phones, emails, and PO boxes from all member entities and supplemental sources, with a preferred option selected for each modality.

The two classes are independent. ContactInfo stays on Entity. CollectiveContactInfo lives on EntityGroup. They do not share a parent class.

### Naming Convention

The property name for the selected best contact option is **`preferred`** (not "primary") to avoid confusion with `primaryAlias` and `primaryAddress` terminology used throughout the Entity/ContactInfo classes.

---

## SECTION 2: CLASS DESIGN

### CollectiveContactInfo (Parent Class)

**Location**: `scripts/objectStructure/contactInfo.js` (after ContactInfo class)

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `preferred` | Aliased (or subclass) | The chosen best contact option for this modality |
| `alternatives` | Array of Aliased | Other known contact options |
| `preferredSource` | String | `'algorithmic'` or `'manual'` — how preferred was selected |
| `overrideAnchorKey` | String or null | Entity key anchoring a manual override |

**Methods:**
| Method | Description |
|--------|-------------|
| `setPreferred(aliasedObject)` | Set the preferred contact option |
| `addAlternative(aliasedObject)` | Add to alternatives (if not duplicate of preferred) |
| `hasContact()` | Returns true if preferred is non-null |
| `getAllOptions()` | Returns [preferred, ...alternatives] |
| `getPreferredTerm()` | Returns preferred.primaryAlias.term or null |
| `populateFromMembers(memberItems, thresholds)` | Core: select best as preferred, categorize rest as alternatives |
| `applyOverride(newPreferred, anchorKey)` | Move current preferred to alternatives, install override |
| `clearOverride()` | Revert to algorithmic selection |
| `fromSerializedData(data)` | Static: deserialize from JSON |

### Four Subclasses — populateFromMembers() Specification

Each subclass overrides `populateFromMembers()` with type-specific logic. All types use a two-tier framework, though tiers manifest differently per type:
- **Tier 1 (Alias Preservation):** Variant representations of the same contact preserved in the Aliased structure (primaryAlias + homonyms/synonyms/candidates)
- **Tier 2 (Preferred vs Alternatives):** Genuinely different contacts ranked — most-corroborated becomes preferred, rest become alternatives

**CollectiveMailingAddress extends CollectiveContactInfo** — TWO-TIER
- preferred/alternatives: Address objects
- Tier 1: Cluster addresses by synonym threshold using Address.compareTo(); within each cluster, call Aliased.createConsensus() to preserve variations as aliases (homonyms/synonyms/candidates)
- Tier 2: Largest cluster's consensus → preferred; remaining clusters → alternatives
- Requires thresholds.contactInfo (homonym: 0.87, synonym: 0.85) — throw if missing, no fallbacks
- Reuses: Aliased.createConsensus(), Address.compareTo(), _buildAliasThresholds()

**CollectivePhone extends CollectiveContactInfo** — TWO-TIER
- preferred/alternatives: SimpleIdentifiers for phone
- Tier 1: When 7-digit and 10-digit versions of same number are found (e.g., "466-1234" and "401-466-1234"), the 10-digit version becomes primaryAlias, the 7-digit version becomes a homonym on the representative
- Tier 2: Different phone numbers ranked by frequency, tie-break by source priority (Bloomerang > Phonebook > other)
- Uses normalizePhone() and phonesAreEquivalent() static helpers for grouping

**CollectivePOBox extends CollectiveContactInfo** — ONE-TIER
- preferred/alternatives: SimpleIdentifiers for PO Box
- Case-insensitive string matching (Block Island has single-letter PO Box numbers)
- No alias preservation — PO Boxes either match or they don't
- Frequency-based preferred/alternatives selection

**CollectiveEmail extends CollectiveContactInfo** — TWO-TIER
- preferred/alternatives: SimpleIdentifiers for email (primaryAlias is EmailTerm)
- Tier 1: Cluster emails by synonym threshold using EmailTerm.compareTo() (domain-aware: exact domain match + fuzzy local part); within each cluster, call Aliased.createConsensus()
- Tier 2: Largest cluster's consensus → preferred; remaining → alternatives; tie-break by source priority
- **Prerequisite:** EmailTerm.compareTo() must be implemented, and bloomerang.js must construct EmailTerm instead of AttributedTerm

### EmailTerm.compareTo() Prerequisite

**Problem:** Email SimpleIdentifiers currently use plain AttributedTerm as primaryAlias. AttributedTerm.compareTo() uses raw levenshteinSimilarity on the full email string, giving misleadingly high scores when domains match (e.g., john@blockislandresort.com vs mary@blockislandresort.com → ~0.85+).

**Solution:** EmailTerm (aliasClasses.js:1816) already has extractDomain() and extractUsername() but no compareTo(). Add EmailTerm.compareTo() with domain-aware logic adapted from contactInfoWeightedComparison() (utils.js:1395-1424):
- Domain: exact match (case-insensitive) → 1.0 or 0.0
- Local part: levenshteinSimilarity() (fuzzy, case-insensitive)
- Combined: (localSimilarity × 0.8) + (domainSimilarity × 0.2)

**Also required:** Change bloomerang.js email construction (lines 2292 and 2351) from `new AttributedTerm()` to `new EmailTerm()`. Entity matching (contactInfoWeightedComparison) is unaffected — it extracts strings via getEmailString(), never calls compareTo().

---

## SECTION 3: ENTITYGROUP INTEGRATION

### New Properties on EntityGroup

Added to the constructor in `scripts/objectStructure/entityGroup.js`:

```
this.collectiveMailingAddress = null;  // CollectiveMailingAddress instance
this.collectivePhone = null;           // CollectivePhone instance
this.collectivePOBox = null;           // CollectivePOBox instance
this.collectiveEmail = null;           // CollectiveEmail instance
```

### buildCollectiveContactInfo() Method

New method on EntityGroup that populates all four subclasses from member entities.

**Algorithm:**
1. Get member entities via `_getMemberEntities(entityDatabase)` (existing, line 292)
2. Collect mailing addresses from all members via `_collectAddressesFromEntity()` (existing, line 333)
3. Collect PO boxes from all members via `_collectPOBoxFromEntity()` (existing, line 360)
4. Collect phones from all members (new: extract from `entity.contactInfo.phone`)
5. Collect emails from all members (new: extract from `entity.contactInfo.email`)
6. Build thresholds via `_buildAliasThresholds()` (existing, line 609)
7. For each contact type: create subclass instance, call `populateFromMembers()`
8. Check contact preference override database; apply any overrides found for member keys

**Key reuse of existing code:**
- `_getMemberEntities()` — entityGroup.js line 292
- `_collectAddressesFromEntity()` — entityGroup.js line 333
- `_collectPOBoxFromEntity()` — entityGroup.js line 360
- `_buildAliasThresholds()` — entityGroup.js line 609
- `Aliased.createConsensus()` — aliasClasses.js line 556 (consensus-building pattern for addresses and emails)
- `Address.compareTo()` — aliasClasses.js (returns numeric similarity 0-1)
- `EmailTerm.compareTo()` — aliasClasses.js (NEW — domain-aware comparison)
- `EmailTerm.extractDomain()` / `extractUsername()` — aliasClasses.js line 1816 (existing, currently unused)
- `CollectivePhone.normalizePhone()` / `phonesAreEquivalent()` — contactInfo.js (existing static helpers)

### Build Pipeline Integration

In `scripts/matching/entityGroupBuilder.js`, `buildCollectiveContactInfo()` runs for all groups **independently of the consensus gate** (`config.buildConsensus`). It runs after phase construction and stats update, before the Google Drive save. This is correct because CollectiveContactInfo aggregates raw member contact data and does not depend on consensus entities.

### Serialization

Register in CLASS_REGISTRY (`scripts/utils/classSerializationUtils.js`):
- `CollectiveContactInfo`
- `CollectiveMailingAddress`
- `CollectivePhone`
- `CollectivePOBox`
- `CollectiveEmail`

**Important discovery (Session 97):** The generic fallback in `deserializeWithTypes()` (Object.create + property copy) handles all application classes automatically. Custom `deserialize()` / `fromSerializedData()` methods are **unnecessary and bug-prone** — six such methods were removed from the AttributedTerm hierarchy during Session 97. The CollectiveContactInfo classes should rely on the generic fallback; they only need CLASS_REGISTRY registration (CC-12), not custom deserialization methods.

**Serialization philosophy issue (Session 98, RESOLVED Session 100):** Two competing deserialization systems were identified. Resolved by removing ~34 custom deserialize/fromSerializedData methods (Session 100 serialization migration). All classes now use the generic `deserializeWithTypes()` fallback. See reference_serializationMigrationPlan.md for details. CC-13/CC-14 round-trip verified Session 101.

---

## SECTION 4: CONTACT PREFERENCE OVERRIDE SYSTEM

### The Stability Problem

EntityGroup indices are process-fragile — they change when EntityGroups are rebuilt from updated source data. Overrides cannot be keyed by EntityGroup index.

Entity keys (e.g., `visionAppraisal:FireNumber:1510`, `bloomerang:12345:...`) ARE stable across rebuilds.

### Solution: Anchor Overrides to Entity Keys

Each override is stored with an **anchor entity key**. The meaning: *"In whatever EntityGroup contains this entity, apply this contact preference."*

**Override record structure:**
```
{
  anchorEntityKey: "visionAppraisal:FireNumber:1510",
  contactType: "mailingAddress",  // or "phone", "email", "poBox"
  preferredValue: <serialized contact>,
  dateSet: "2026-02-16"
}
```

**During buildCollectiveContactInfo():** After algorithmic selection, check if any member entity key appears in the override database. If so, apply the override (move algorithmic preferred to alternatives, install override value).

**Edge case:** Two member entities with conflicting overrides in same group → most recent override wins, conflict logged.

**If anchor entity disappears** (deleted from source): override becomes orphaned, flagged for cleanup.

### Storage

Google Drive JSON file, consistent with the fire number collision database pattern. Loaded into memory at startup, saved on modification. Supports create, delete, and reassign-anchor-key operations.

### UI Implementation (Session 102)

The UI for managing contact preference overrides must support:

1. **Display** current preferred and alternatives for each contact type
2. **Override creation**: user selects a different contact as preferred
3. **Anchor key selection**: user must choose which entity key to anchor the override to
4. **Anchor key awareness**: UI shows which keys in this group are already used as override anchors
5. **Three key selection options:**
   - Pick an unused key for this override
   - Pick an already-in-use key (reuse for this override too)
   - Pick any key and impose it on ALL existing overrides for this group (reassign all existing anchor keys to the chosen key)
6. **Override clearing**: revert to algorithmic selection

---

## SECTION 5: IMPLEMENTATION TASKS

### Phase 1: Class Structure and populateFromMembers()

| # | Task | Description | Status |
|---|------|-------------|--------|
| CC-1 | Define CollectiveContactInfo parent class | Properties, methods, serialization support | CODED (Session 96) |
| CC-1a | Implement EmailTerm.compareTo() | Domain-aware comparison: exact domain + fuzzy local | CODED (Session 96) |
| CC-1b | Change bloomerang.js email construction | AttributedTerm → EmailTerm (lines 2292, 2351) | CODED (Session 96) |
| CC-2 | Define CollectiveMailingAddress subclass | Two-tier: cluster by synonym + createConsensus per cluster | CODED (Session 97) |
| CC-3 | Define CollectivePhone subclass | Two-tier: alias (7-digit=homonym of 10-digit) + frequency/source | CODED (Session 97) |
| CC-4 | Define CollectivePOBox subclass | One-tier: case-insensitive match, frequency-based | CODED (Session 97) |
| CC-5 | Define CollectiveEmail subclass | Two-tier: cluster by synonym + createConsensus (uses EmailTerm) | CODED (Session 97) |
| CC-5a | Dead candidate: 0.5 threshold removal | Removed from 6 locations in entityGroup.js and aliasClasses.js | DONE (Session 96) |
| CC-6 | **Test:** Verify class hierarchy | Skipped — testing via actual build more meaningful | SKIPPED |

### Phase 2: Population Logic (Steps 4-6)

| # | Task | Description | Status |
|---|------|-------------|--------|
| CC-7 | Add four CollectiveContactInfo properties to EntityGroup | Constructor changes | CODED (Session 97) |
| CC-8 | Implement buildCollectiveContactInfo() | Adapt consensus logic for new structure | CODED (Session 97) |
| CC-9 | **Test:** Verify population for multi-member groups | Group 117 (8 members): preferred PO BOX 1257 correct (5 member contributions), 9 alternatives complete, email/poBox verified | USER_VERIFIED (Session 101) |
| CC-10 | **Test:** Compare to consensus entity values | Consensus entity address=PO Box 1257, poBox=1257 — matches CollectiveContactInfo preferred | USER_VERIFIED (Session 101) |
| CC-11 | Integrate into build pipeline | Runs independently of consensus gate | CODED (Session 97) — build verified Session 98 (1875 groups) |

### Phase 3: Serialization (Step 5)

| # | Task | Description | Status |
|---|------|-------------|--------|
| CC-12 | Register classes in CLASS_REGISTRY | Five new entries in classSerializationUtils.js | CODED (Session 98) |
| CC-13 | Verify generic fallback handles deserialization | No custom fromSerializedData needed (serialization migration Session 100) | USER_VERIFIED (Session 101) |
| CC-14 | **Test:** Serialization round-trip | Group 117: all 3 CollectiveContactInfo types survive save→reload with class identity + data intact | USER_VERIFIED (Session 101) |

### Phase 4: Override Infrastructure

| # | Task | Description | Status |
|---|------|-------------|--------|
| CC-15 | Design override database structure | Google Drive JSON file, entity-key-anchored records | CODED (Session 102) |
| CC-16 | Implement override load/save | On-demand loading triggered by EntityGroup load/build; saves both override DB + EntityGroup DB | CODED (Session 102) |
| CC-17 | Implement override application in buildCollectiveContactInfo() | _applyContactPreferenceOverrides() checks overrides after algorithmic selection | CODED (Session 102) |
| CC-18 | Implement anchor key reassignment | reassignAllGroupOverrides() changes anchor key for all group overrides | CODED (Session 102) |

### Phase 5: Override UI

| # | Task | Description | Status |
|---|------|-------------|--------|
| CC-19 | Design override management UI | Two-panel layout in Database Maintenance box (indigo accent); search groups or view existing overrides | CODED (Session 102) |
| CC-20 | Implement anchor key awareness display | Radio button list with abbreviated keys (VA:1510, BL:12345), entity names, ★ in-use badges | CODED (Session 102) |
| CC-21 | Implement three key selection options | Unused key, reuse in-use key, reassign-all-anchors button | CODED (Session 102) |
| CC-22 | Confirm Override / Save workflow | "Confirm Override" applies in memory; popup asks save now (both DBs) or continue; "Save All Changes" panel for deferred saves | CODED (Session 102) |
| CC-23 | Override database auto-load | Triggered by EntityGroup load/build in entityGroupBrowser.js (no manual load button) | CODED (Session 102) |
| CC-24 | applyOverride/clearOverride fix | Save algorithmic state before override; clearOverride restores from saved state (no re-run of populateFromMembers) | CODED (Session 102) |
| CC-25 | **Test:** Round-trip override create/save/reload | Override created, saved (both DBs), reloaded — override persists with correct preferred and MANUAL badge | USER_VERIFIED (Session 102) |

---

## SECTION 6: WHAT THIS DOES NOT CHANGE

- **Consensus entity remains** (may be retired in a future task)
- **Member collections remain** (serve matching/lookup for phonebook integration)
- **No changes to EntityGroup browser or CSV reports** (future integration)
- **Phonebook integration (Section 4 of reference_phonebookIntegration.md) proceeds after Phases 4-5**, with CollectiveContactInfo as the target structure for incoming phone numbers and emails

---

## SECTION 7: FUTURE CONSIDERATIONS

### Consensus Entity Retirement
Once CollectiveContactInfo is proven stable and all downstream consumers (CSV reports, EntityGroup browser, mail merge) are updated to use it, the consensus entity can be retired. This is not part of the current plan.

### EntityGroup Merging
During the architectural discussion, we identified that new evidence from supplemental sources (phonebook, email, election registration) could reveal that two separate EntityGroups are actually the same contact unit. Building a capacity to merge contact units is on the project roadmap but is not a current priority.

---

## DOCUMENT END

**Document Version**: 4.0
**Last Updated**: February 17, 2026
**Session**: 102 — Phases 4-5 coded and user-tested (CC-15 through CC-25). Override infrastructure, UI, save workflow, and round-trip persistence all verified. Next: Phonebook/Email Integration (reference_phonebookIntegration.md).
