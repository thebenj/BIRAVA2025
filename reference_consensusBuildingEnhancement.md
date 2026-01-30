# Consensus Building Enhancement Project

## Project Overview

**Goal**: Transform the consensus building process from a simple data merger into a sophisticated tool that:
1. Identifies distinct individuals within entity groups that constitute households
2. Creates enhanced AggregateHousehold consensus entities that properly subsume all member information
3. Creates Individual entities that use Aliased term features to capture all representations of each person

**Priority**: This project precedes Task 3 (Phonebook Integration)

**Status**: IN_PROGRESS (Phase 1 Complete)

---

## Project Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | Extraction - Standalone Consensus Building | USER_VERIFIED_COMPLETE |
| 2 | Research - Individual Identification Parameters | PLANNED |
| 3 | Implementation - Enhanced Consensus Builder | PLANNED |

---

## Phase 1: Extraction - Standalone Consensus Building

### 1.1 Objective
Extract consensus building to run independently from a new button, enabling iteration on the consensus algorithm without full EntityGroup rebuilds.

### 1.2 Current State
- Consensus building is loosely coupled (optional step at end of build process)
- `entityGroupDatabase.buildAllConsensusEntities(entityDb)` method exists
- Only needs unified entity database to run
- ~10-15 lines to add a button handler

### 1.3 Implementation Tasks

#### Task 1.3.1: Add "Rebuild Consensus" Button to UI
**File:** `BIRAVA2025/index.html`

Add button in EntityGroup Browser control section (near line 1061):
```html
<button id="entityGroupRebuildConsensusBtn" class="action-button"
        style="background-color: #e91e63; padding: 10px 16px; font-weight: 600;">
    🔄 Rebuild Consensus
</button>
```

#### Task 1.3.2: Add Click Handler
**File:** `BIRAVA2025/scripts/entityGroupBrowser.js`

Add event listener in initialization section (near line 145):
```javascript
const rebuildConsensusBtn = document.getElementById('entityGroupRebuildConsensusBtn');
if (rebuildConsensusBtn) {
    rebuildConsensusBtn.addEventListener('click', rebuildConsensusEntities);
}
```

#### Task 1.3.3: Implement Handler Function
**File:** `BIRAVA2025/scripts/entityGroupBrowser.js`

```javascript
async function rebuildConsensusEntities() {
    // Check prerequisites
    if (!entityGroupBrowser.loadedDatabase) {
        showEntityGroupStatus('No EntityGroup database loaded. Load one first.', 'error');
        return;
    }

    if (!window.unifiedEntityDatabase?.entities) {
        showEntityGroupStatus('Unified entity database not loaded. Load it first.', 'error');
        return;
    }

    const btn = document.getElementById('entityGroupRebuildConsensusBtn');
    const originalText = btn?.innerHTML;

    try {
        if (btn) btn.innerHTML = '⏳ Rebuilding...';
        showEntityGroupStatus('Rebuilding consensus entities...', 'loading');

        entityGroupBrowser.loadedDatabase.buildAllConsensusEntities(
            window.unifiedEntityDatabase.entities
        );

        const multiMemberCount = entityGroupBrowser.loadedDatabase.stats?.multiMemberGroups ||
            Object.values(entityGroupBrowser.loadedDatabase.groups)
                .filter(g => g.memberKeys?.length > 1).length;

        showEntityGroupStatus(
            `Rebuilt consensus entities for ${multiMemberCount} multi-member groups. Save to preserve.`,
            'success'
        );
    } catch (error) {
        console.error('Error rebuilding consensus:', error);
        showEntityGroupStatus(`Error: ${error.message}`, 'error');
    } finally {
        if (btn) btn.innerHTML = originalText;
    }
}
```

### 1.4 Downstream Consumer Compatibility

The following tools consume consensusEntity and MUST continue to work:

| Consumer | File | Critical Properties Used |
|----------|------|-------------------------|
| CSV Export (prospects/donors) | csvReports.js | name, contactInfo, otherInfo |
| Mail Merge Export | csvReports.js | name.primaryAlias.term, contactInfo.primaryAddress |
| Assessment Report | csvReports.js | otherInfo.assessmentValue/appraisalValue |
| Lightweight JSON Export | lightweightExporter.js | All properties (generic reduction) |
| Browser Display | entityGroupBrowser.js | name, contactInfo.primaryAddress, locationIdentifier |
| Google Apps Script | EntityGroupLookup.gs | Same as CSV Export |

**Compatibility Requirement**: Phase 3 implementation MUST produce consensusEntity with same property structure to avoid breaking these consumers.

### 1.4.1 Downstream Calls with Auto-Rebuild (ensureConsensusBuilt)

The following entry points call `ensureConsensusBuilt()` to auto-build consensus if not yet built. **These may need modification if Phase 3 adds parameters to the consensus building function.**

| Function | File | Line | Purpose |
|----------|------|------|---------|
| `downloadCSVExport()` | csvReports.js | ~579 | Prospects + Donors export |
| `downloadAssessmentValueReport()` | csvReports.js | ~999 | Assessment Value Report |
| `exportMultiVAPropertyReport()` | csvReports.js | ~1220 | Multi-VA Property Report |
| `runProspectMailMergeExport()` | csvReports.js | ~2118 | Prospect Mail Merge |
| `downloadLightweightExport()` | lightweightExporter.js | ~347 | Lightweight JSON Export |

**Helper function location**: `ensureConsensusBuilt()` is defined in `entityGroupBrowser.js` at ~line 651.

### 1.5 Files to Modify (Phase 1)
1. `BIRAVA2025/index.html` - Add button (~3 lines)
2. `BIRAVA2025/scripts/entityGroupBrowser.js` - Add handler (~35 lines)

### 1.6 Verification (Phase 1)
1. Start server: `cd BIRAVA2025 && node servers/server.js`
2. Open http://127.0.0.1:1337/
3. Load EntityGroup database from file ID
4. Load Unified database
5. Click "🔄 Rebuild Consensus" button
6. Verify status message shows success
7. Export CSV and verify consensus rows are correct
8. Save EntityGroups and reload to verify persistence

### 1.7 Actual Implementation (Session 66 - 2026-01-28)

Phase 1 was implemented as a **full migration**, not just duplication:

**Key Changes:**
1. **Build New no longer builds consensus** - `buildConsensus` default changed to `false` in entityGroupBuilder.js
2. **Standalone button added** - "Rebuild Consensus" button in new "Individual and AggregateHousehold Creation" UI section
3. **Downstream auto-rebuild** - Export functions call `ensureConsensusBuilt()` which auto-builds if `consensusBuiltTimestamp` is null
4. **Metadata tracking** - `consensusBuiltTimestamp` added to EntityGroupDatabase (constructor, serialize, deserialize)

**Files Modified:**
| File | Changes |
|------|---------|
| index.html | UI reorganization: new "Individual and AggregateHousehold Creation" box, new "TOOLS" phase-section |
| entityGroupBuilder.js | Changed `buildConsensus` default to `false` |
| entityGroupBrowser.js | Removed explicit `buildConsensus: true`, added `rebuildConsensusEntities()`, `ensureConsensusBuilt()`, `consensusBuiltTimestamp` setting |
| entityGroup.js | Added `consensusBuiltTimestamp` to constructor, serialize(), deserialize() |
| csvReports.js | Added `ensureConsensusBuilt()` calls to 4 export entry points |
| lightweightExporter.js | Added `ensureConsensusBuilt()` call |

**Verified Working:** Build New → no consensus built → CSV export → auto-rebuild triggered → export succeeds

---

## Phase 2: Research - Individual Identification Parameters

### 2.1 Objective
Understand the data landscape to establish parameters for identifying distinct individuals within entity groups.

### 2.2 Current Individual Handling (Baseline)

**Current Implementation** (entityGroup.js lines 622-654):
- Deduplication is **name-based only** (85% similarity threshold)
- Does NOT consider: contact info, account numbers, location identifiers
- VisionAppraisal individuals are NOT standalone keyed entities (exist only in individuals[] array)
- Bloomerang individuals ARE keyed entities with individualKeys[] for lookup
- Information lost: provenance tracking, non-name differentiation

**Current _deduplicateIndividuals() Logic**:
```javascript
const NAME_SIMILARITY_THRESHOLD = 0.85;
for (const individual of individuals) {
    for (const existing of unique) {
        const similarity = individual.name.compareTo(existing.name);
        if (similarity >= NAME_SIMILARITY_THRESHOLD) {
            isDuplicate = true; // SKIP this individual
        }
    }
}
```

**Problems with Current Approach**:
1. Two different people with similar names get merged
2. Same person with different name spellings might not merge
3. No use of contact info, addresses, or other identifying data
4. No provenance tracking - can't tell which source contributed which data

### 2.3 Research Questions

#### RQ1: What data distinguishes individuals across sources?
- How often do VisionAppraisal and Bloomerang have the same individual?
- What fields overlap? (name, address, phone, email)
- What fields are source-specific? (accountNumber for Bloomerang, fireNumber for VA)

#### RQ2: What patterns indicate same vs different individuals?
- Same name + same address = likely same person
- Same name + different address = could be same or different
- Different name + same household = different individuals
- How do we handle married couples with different last names?

#### RQ3: How should VisionAppraisal individuals be handled?
- Currently not keyed entities - should they become keyed?
- How to track them through the consensus process?
- What identifier should they use? (household key + name hash?)

#### RQ4: What Aliased features should capture individual variations?
- primaryAlias: Best representation of the individual's name
- homonyms: Same person, same spelling from different sources
- synonyms: Same person, different spelling (nicknames, misspellings)
- candidates: Uncertain matches needing human review

### 2.4 Research Tasks

#### Task 2.4.1: Analyze Multi-Member EntityGroups
Generate statistics on current multi-member groups:
- How many groups have 2, 3, 4+ members?
- How many individuals are in each consensus?
- What's the distribution of VA-only vs Bloomerang-only vs mixed groups?

#### Task 2.4.2: Sample Individual Overlap Analysis
For a sample of multi-member groups:
- Manually identify which individuals are the same vs different
- Document patterns that distinguish them
- Identify false positives in current deduplication

#### Task 2.4.3: Contact Info Correlation Study
Analyze how contact info correlates across individuals:
- Do matched individuals share addresses?
- Do matched individuals share phone/email?
- What contact info patterns indicate household membership?

#### Task 2.4.4: Define Individual Identification Algorithm
Based on research findings:
- Define weighted scoring for individual matching
- Establish thresholds for same/different/uncertain
- Design provenance tracking structure

### 2.5 Research Outputs
- Document findings in this reference file (update Phase 2 section)
- Individual identification parameters (thresholds, weights)
- Algorithm design for Phase 3 implementation

### 2.6 Research Findings (Session 67)

#### Finding 1: Organization Names Appearing as Individuals

**Observation**: Research output showed organization names like "TRIMS RIDGE HOMEOWNERS ASSOC, C/O BOB KOOPMAN" appearing in the individuals[] array.

**Root Cause Investigation**:
1. Used testSpecificName.js diagnostic to trace case detection
2. Found that "ASSOC" was NOT detected as a business term
3. The businessTerms list only contained "ASSOCIATION" (full word)
4. Substring check looks for business terms INSIDE words, not abbreviations
5. Result: "TRIMS RIDGE HOMEOWNERS ASSOC" → case30 → AggregateHousehold (not Business)

**Fix Applied**: Added missing business term abbreviations to Case31Validator.businessTerms:
- ASSOC (Association)
- HOA (Homeowners Association)
- IRT (Irrevocable Trust)
- IRTRUST
- QPRT (Qualified Personal Residence Trust)
- REVOCABLE
- TRUSTS
- TRUSTEES

**Location**: scripts/validation/case31Validator.js lines 8-14

#### Finding 2: Research Tool Enhancement

**individualIdentificationResearch.js CSV Export Format**:
- Changed from one-row-per-comparison to group-per-section format
- Header row: GroupIndex | AllKeyNames | KeyNameCount | Pair1Names | Score | Pair2Names | Score | ...
- Data rows: Cluster members listed under each pair's columns
- Sorting: Primary by cluster count (descending), secondary by max cluster size

**testSpecificName.js Diagnostic**:
- New diagnostic tool to trace case detection for specific names
- Shows: standardized name, word parsing, business term checks per word, punctuation analysis, detected case, expected entity type
- Location: scripts/diagnostics/testSpecificName.js

#### Remaining Research Questions
- Continue analyzing research output for additional patterns
- Identify false positives/negatives in individual clustering
- Document contact info correlation patterns
- Define individual identification algorithm for Phase 3

---

## Phase 3: Implementation - Enhanced Consensus Builder

### 3.1 Objective
Implement a revised consensus builder that:
1. Creates output compatible with legacy reporting/analytic tools
2. Creates proper AggregateHousehold based on each household EntityGroup
3. Creates Individuals using Aliased term features to capture all representations

### 3.2 Design Requirements

#### DR1: Backward Compatibility
The enhanced consensusEntity MUST maintain this structure for legacy consumers:
```javascript
consensusEntity = {
    name: Aliased,                    // HouseholdName with primaryAlias.term
    locationIdentifier: Aliased,       // FireNumber or ComplexIdentifier
    contactInfo: ContactInfo,          // With email, phone, poBox, primaryAddress, secondaryAddress
    otherInfo: OtherInfo,              // With assessmentValue, appraisalValue, subdivision
    legacyInfo: LegacyInfo,            // With ownerName, neighborhood, etc.
    individuals: Individual[],         // Array of Individual entities
    accountNumber: SimpleIdentifier,   // From Bloomerang member
    type: "AggregateHousehold"
}
```

#### DR2: Enhanced Individual Representation
Each Individual in consensus.individuals[] should use Aliased features:
```javascript
individual.name = {
    primaryAlias: AttributedTerm,      // Best representation
    alternatives: {
        homonyms: AttributedTerm[],    // Same spelling, different sources
        synonyms: AttributedTerm[],    // Different spelling, same person
        candidates: AttributedTerm[]   // Uncertain matches
    }
}
```

#### DR3: Provenance Tracking
Track which source contributed which data:
```javascript
individual.constructedFrom = [
    { sourceKey: "visionAppraisal:FireNumber:123", contribution: "name" },
    { sourceKey: "bloomerang:456:...", contribution: "contactInfo" }
]
```

### 3.3 Implementation Tasks

#### Task 3.3.1: Create Enhanced Individual Identification
**File:** `BIRAVA2025/scripts/objectStructure/entityGroup.js`

Replace `_deduplicateIndividuals()` with `_identifyDistinctIndividuals()`:
- Use weighted scoring (name + contact info + location)
- Return Individual objects with Aliased name structures
- Track provenance of each data element

#### Task 3.3.2: Enhance _synthesizeConsensus()
**File:** `BIRAVA2025/scripts/objectStructure/entityGroup.js`

Update to:
- Call new `_identifyDistinctIndividuals()` instead of `_deduplicateIndividuals()`
- Build consensus.individuals with enhanced Individual objects
- Maintain all existing property structures for backward compatibility

#### Task 3.3.3: Update Serialization
**File:** `BIRAVA2025/scripts/utils/classSerializationUtils.js`

Ensure enhanced Individual objects serialize/deserialize correctly:
- Name with alternatives structure
- constructedFrom provenance array

#### Task 3.3.4: Add Diagnostic Output
Create diagnostic tools to verify enhanced consensus:
- Compare old vs new consensus output
- Validate backward compatibility
- Report on individual identification accuracy

### 3.4 Files to Modify (Phase 3)
1. `BIRAVA2025/scripts/objectStructure/entityGroup.js` - Enhanced consensus logic
2. `BIRAVA2025/scripts/utils/classSerializationUtils.js` - Serialization updates (if needed)
3. Possibly: `BIRAVA2025/scripts/objectStructure/aliasClasses.js` - If Individual name needs new structure

### 3.5 Verification (Phase 3)
1. Run "🔄 Rebuild Consensus" with enhanced logic
2. Export CSV - verify all columns populate correctly
3. Export Lightweight JSON - verify structure correct
4. View in Browser - verify display works
5. Compare sample groups against manual analysis from Phase 2
6. Run full regression test suite

---

## Appendix A: Downstream Consumer Details

### CSV Export Column Dependencies

| Column | Property Path | Required Format |
|--------|--------------|-----------------|
| MailName | name.primaryAlias.term | String |
| MailAddr1 | contactInfo.primaryAddress components | String |
| Email | contactInfo.email.primaryAlias.term | String |
| Phone | contactInfo.phone.primaryAlias.term | String |
| EntityType | type or __type | "AggregateHousehold" |

### Lightweight Export Behavior
- Generic reduction iterates all properties
- Strips alternatives, sourceMap, comparisonWeights
- Will automatically adapt to new structure if Aliased chains preserved

### Browser Display Patterns
- Uses `name?.primaryAlias?.term` or `name?.term` fallback
- Uses `contactInfo?.primaryAddress?.primaryAlias?.term`
- Uses `locationIdentifier?.primaryAlias?.term`

---

## Appendix B: Current Consensus Building Code Locations

| Function | File | Line | Purpose |
|----------|------|------|---------|
| buildConsensusEntity() | entityGroup.js | 120 | EntityGroup method - entry point |
| _synthesizeConsensus() | entityGroup.js | 149 | Creates AggregateHousehold consensus |
| _deduplicateIndividuals() | entityGroup.js | 622 | Name-based dedup (to be replaced) |
| _createAliasedConsensus() | entityGroup.js | ~280 | Merges Aliased properties |
| _buildContactInfoConsensus() | entityGroup.js | ~350 | Merges ContactInfo |
| _buildOtherInfoConsensus() | entityGroup.js | ~450 | Merges OtherInfo |
| buildAllConsensusEntities() | entityGroup.js | 946 | EntityGroupDatabase method - iterates groups |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-28 | Initial project plan created |

