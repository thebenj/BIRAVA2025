# BIRAVA2025 Code Cleanup Plan

**Created:** December 23, 2025
**Rollback Point:** `v1.0.0-stable-dec-23-2025`
**Approach:** Phased cleanup with regression testing at each step

---

## Core Principles

1. **Phase 0 First:** Analyze and document the Production Process to establish what we cannot break
2. **Delete vs Archive:** Every removal step begins with explicit delete-vs-archive decision
3. **Regression Testing:** Every significant change has defined regression tests before and verification after

---

## PHASE 0: Production Process Analysis & Regression Baseline

**Goal:** Establish what critical functionality must not break

### 0.1 Document the Production Process

Review and document the complete production workflow:

1. **Data Loading Pipeline**
   - VisionAppraisal data loading (source, parsing, entity creation)
   - Bloomerang data loading (source, parsing, entity creation)
   - Unified database construction
   - Google Drive save/load cycle

2. **EntityGroup Construction Pipeline**
   - 6-phase construction algorithm
   - 9-step group building per founder
   - Match override system integration
   - Household pulling (Step 9)

3. **Export Pipeline**
   - CSV export (prospects/donors)
   - Lightweight exporter for Google Apps Script
   - Assessment Value Report

4. **Critical User Workflows**
   - Load Unified Database button
   - Build EntityGroup Database button
   - Entity Browser search and display
   - EntityGroup Browser navigation
   - Match Override loading

### 0.2 Identify Critical Files

Document which files are essential to production:

**Must Not Break:**
- `scripts/unifiedDatabasePersistence.js` - Database save/load
- `scripts/matching/entityGroupBuilder.js` - Group construction
- `scripts/matching/universalEntityMatcher.js` - Entity comparison
- `scripts/matching/matchOverrideManager.js` - Override rules
- `scripts/objectStructure/*.js` - Core data classes
- `scripts/utils.js` - Comparison calculators
- `scripts/export/lightweightExporter.js` - Export functionality
- `scripts/entityGroupBrowser.js` - CSV export, Assessment Report

### 0.3 Define Master Regression Test Suite

Create a documented regression test checklist:

```
MASTER REGRESSION TEST SUITE v1.0
=================================
Last Updated: December 24, 2025

QUICK TEST (5 minutes) - Run after minor changes
------------------------------------------------
[ ] 1. SERVER START
    - Start server: cd BIRAVA2025 && node servers/server.js
    - Access http://127.0.0.1:1337/ - page loads without errors
    - Console shows no script loading errors

[ ] 2. UI STRUCTURE
    - Phase A section visible and expandable/collapsible
    - Phase B section visible and expandable/collapsible
    - Extra Tools section collapsed by default
    - All browsers render correctly

[ ] 3. LOAD UNIFIED DATABASE (Phase B, Step 1)
    - Click "📂 Load Unified Database"
    - Verify entity count displayed (expect ~4000+ entities)
    - Console shows "Loaded X entities" message
    - No console errors

STANDARD TEST (15 minutes) - Run after significant changes
----------------------------------------------------------
[ ] 4. ENTITYGROUP BUILDING (Phase B, Step 2)
    - Check "Load override rules" checkbox
    - Click "🔨 Build New" button
    - Verify 6 phases complete in console:
      * Phase 1: VisionAppraisal Households
      * Phase 2: VisionAppraisal Individuals
      * Phase 3: VisionAppraisal Other Types
      * Phase 4: Bloomerang Households
      * Phase 5: Bloomerang Individuals
      * Phase 6: Bloomerang Other Types
    - Verify group count displayed
    - No console errors

[ ] 5. UNIFIED ENTITY BROWSER
    - Search for a known entity (e.g., fire number "1510")
    - Verify entity details display correctly
    - Test Data Source filter (All, VisionAppraisal, Bloomerang)
    - Test Entity Type filter
    - Click on an entity - verify details panel shows

[ ] 6. ENTITYGROUP BROWSER
    - Navigate groups using Previous/Next buttons
    - Verify member list displays with all members
    - Verify consensus entity displays
    - Verify near-miss list displays (if any)
    - Test "Go to Group" input field

[ ] 7. MATCH OVERRIDE VERIFICATION
    - In console: window.matchOverrideRules
    - Verify forceMatch and forceExclude arrays populated
    - Verify MUTUAL rows expanded correctly

FULL TEST (30 minutes) - Run before/after cleanup phases
--------------------------------------------------------
[ ] 8. SAVE/LOAD CYCLE - UNIFIED DATABASE
    - After loading, click "💾 Record Unified Database"
    - Note the file ID from console
    - Reload page (F5)
    - Enter file ID and click "📂 Load Unified Database"
    - Verify entity count matches original

[ ] 9. SAVE/LOAD CYCLE - ENTITYGROUP DATABASE
    - After building groups, click "💾 Save" in EntityGroup Browser
    - Note the file ID from console
    - Reload page (F5)
    - Load unified database first
    - Click "📂 Load" in EntityGroup Browser
    - Verify group count matches original

[ ] 10. CSV EXPORT - PROSPECTS + DONORS
    - Click "📊 Export Prospects + Donors CSV"
    - Verify CSV file downloads
    - Open CSV and verify:
      * Header row present
      * Data rows have expected columns
      * Currency values formatted correctly (no "$" parsing issues)

[ ] 11. LIGHTWEIGHT EXPORT
    - Click "📦 Export Lightweight JSON"
    - Verify JSON file downloads
    - Open JSON and verify structure:
      * metadata object present
      * groups array with embedded entity data

[ ] 12. ASSESSMENT VALUE REPORT
    - Click "📋 Generate Assessment Value Report"
    - Verify report displays in new window/tab
    - Verify assessment values appear correctly

OPTIONAL TESTS (as needed)
--------------------------
[ ] 13. ENTITY COMPARISON TOOL
    - Select two entities in browser
    - Click "Compare Selected"
    - Verify comparison results display
    - Verify score breakdown shown

[ ] 14. SAME-LOCATION HANDLING
    - Find entities with suffixed fire numbers (e.g., 72J vs 72W)
    - Verify they use secondary address comparison
    - Verify they don't auto-merge based on primary address

[ ] 15. PHASE A BUTTONS (only if testing rebuild)
    - DO NOT RUN unless specifically testing rebuild
    - These modify source data

EXPECTED VALUES (baseline from Dec 24, 2025)
--------------------------------------------
- Unified Database: ~4,200 entities
- EntityGroups: ~2,100 groups (varies with override rules)
- VisionAppraisal entities: ~2,300
- Bloomerang entities: ~1,900
```

### 0.4 Create reference_productionProcess.md

Document the production process in a reference file for future sessions.

### Phase 0 Deliverables

- [ ] Production process documentation
- [ ] Critical files list
- [ ] Master regression test suite
- [ ] Baseline regression test run (all tests pass)

---

## PHASE 1: File/Folder Cleanup (SAFE - No Code Changes)

**Risk:** Very Low | **Impact:** ~500KB disk space, cleaner structure

### Pre-Phase Regression Test
Run full regression suite and confirm baseline.

### 1.1 CLAUDE.md Backup Files

**Decision: Delete vs Archive?**
- These are point-in-time snapshots with no unique content
- **Recommendation: DELETE** (git history preserves all versions)

**Root `/BIRAVA2025/` folder:**
- `CLAUDE_BACKUP_20251012_150224.md`
- `CLAUDE_BACKUP_PRE_RESTRUCTURE_20251207.md`
- `CLAUDE (Copy).md` through `CLAUDE (Copy 7).md`

**Subfolder `/BIRAVA2025/BIRAVA2025/`:**
- `CLAUDE_BACKUP.md`, `CLAUDE_BACKUP_20251012_150140.md`
- `CLAUDE (Copy).md`, `CLAUDE (Copy 2).md`, `CLAUDE (Copy 4).md`
- `CLAUDE-new-version-backup.md`, `CLAUDE-original-version-backup.md`
- `CLAUDE_archived.md`, `OldClaude.md`, `realClaude.md`

**KEEP:** Only `/BIRAVA2025/CLAUDE.md` (canonical version)

### 1.2 Obsolete Folder

**Decision: Delete vs Archive?**
- Files are clearly marked obsolete with "obs" prefix
- Date from Sep-Dec 2024, superseded by current implementations
- **Recommendation: ARCHIVE** to `/archive/obsolete_2024/`

**Folder:** `/BIRAVA2025/BIRAVA2025/obsolete/`
- `obsBaseCode.js`, `obsFileLogistics.js`, `obsgoogeLinks.js`
- `obsoneToOneEntity.js`, `obsutils.js`
- `visionAppraisalNameParser.js.obsolete`

### 1.3 Incomplete Server Stub

**Decision: Delete vs Archive?**
- `serverW.js` is incomplete stub (no express import)
- **Recommendation: DELETE** (no useful content)

### 1.4 Root-Level Test Files

**Decision: Delete vs Archive?**
- These are development utilities, not production code
- **Recommendation: MOVE** to `/scripts/testing/`

Files to move:
- `cleanup.js`, `testPhase2D.js`, `testDetectCaseMethods.js`
- `loadPhase2DDependencies.js`, `retryVisionAppraisalSave.js`
- `detectCaseRetVal_REFERENCE.js`, `updated_entity_property_comparison.js`

**KEEP in place:** `verification.js` (loaded in index.html)

### 1.5 Documentation Reorganization

**Create structure:**
```
/docs/
  /reference/    - active reference files
  /archive/      - outdated planning documents
```

**Move to `/docs/reference/`:** Active reference_*.md files
**Move to `/docs/archive/`:** Outdated analysis_*.md and planning files

### 1.6 Integration Folder

**Decision: Delete vs Archive?**
- Contains experimental code that may have reference value
- **Recommendation: ARCHIVE** with documentation

**Steps:**
1. Create `README_ARCHIVE.md` documenting each file's purpose
2. Move entire folder to `/archive/integration/`

### Post-Phase Regression Test
Run full regression suite - all tests must pass.

### Phase 1 Commit
```
Phase 1: File/folder cleanup - archive obsolete, organize docs
```

---

## PHASE 2: Deprecated Function Cleanup (LOW-MEDIUM RISK)

**Risk:** Low-Medium | **Impact:** ~300 lines, cleaner API

### Pre-Phase Regression Test
Run full regression suite and confirm baseline.

### 2.1 readBloomerang() Deprecation

**Pre-step:** Define specific regression test
- Load Bloomerang data via UI
- Verify all Bloomerang entities appear in unified database

**Decision: Delete vs Archive?**
- Function body has useful reference code
- **Recommendation: KEEP with deprecation warning** (callers will be archived anyway)

**Action:**
1. Verify callers are in archived integration/ folder
2. Add prominent deprecation warning if not already present

**Post-step:** Run Bloomerang loading regression test

### 2.2 Deprecated Lookup Functions

**Pre-step:** Define specific regression test
- Search for entity by key in browser
- Verify entity lookup works

**Decision: Delete vs Archive?**
- Functions marked deprecated, replacement exists
- **Recommendation: DELETE** after verifying no active callers

**File:** `/scripts/loadAllEntitiesButton.js`
- `getEntityBySourceTypeAndValue()` (line 455)
- `getEntityBySourceAndLocationId()` (line 472)

**Post-step:** Run entity lookup regression test

### 2.3 entity.label and entity.number

**Pre-step:** Define specific regression test
- Open VisionAppraisal browser
- Verify entity labels display correctly

**Decision: Delete vs Archive?**
- Properties are placeholders, need to identify replacement
- **Recommendation: INVESTIGATE first** - determine what should replace these

**Action:**
1. Identify what these properties should reference
2. Update visionAppraisalBrowser.js references
3. Remove deprecated properties

**Post-step:** Run VisionAppraisal browser regression test

### 2.4 Key Generation Consolidation

**Pre-step:** Define specific regression test
- Build EntityGroup database
- Verify no key format mismatches in logs
- Save and reload - verify key integrity

**Decision: Delete vs Archive?**
- Old key format causes bugs (documented in CLAUDE.md)
- **Recommendation: DELETE** old function after migration

**Action:**
1. Audit all uses of generateEntityKey()
2. Migrate to generateUnifiedEntityKey()
3. Remove old function

**Post-step:** Run full EntityGroup build and save/load cycle

### Post-Phase Regression Test
Run full regression suite - all tests must pass.

### Phase 2 Commit
```
Phase 2: Remove deprecated functions, consolidate key generation
```

---

## PHASE 3: Orphaned Code Removal (MEDIUM RISK)

**Risk:** Medium | **Impact:** ~1200 lines removal

### Pre-Phase Regression Test
Run full regression suite and confirm baseline.

### 3.1 legacySerialize() Methods

**Pre-step:** Define specific regression test
- Save unified database to Google Drive
- Reload page and load from Google Drive
- Verify entity count and data integrity
- Save EntityGroup database
- Reload and verify group count

**Decision: Delete vs Archive?**
- Methods explicitly marked "not called"
- **Recommendation: DELETE** after verification

**Verification before removal:**
1. Add console.log to each legacySerialize method
2. Run full save/load cycle
3. Confirm no calls occur
4. Remove all 28 legacySerialize methods

**Post-step:** Run save/load regression tests

### 3.2 entity.legacyInfo Property

**Pre-step:** Define specific regression test
- Build EntityGroup database
- Verify comparison scores are correct
- Verify consensus building works

**Decision: Delete vs Archive?**
- Property defined but never populated
- **Recommendation: DELETE** all references

**Action:**
1. Grep codebase for `.legacyInfo` usage
2. Verify no data source populates this
3. Remove property and all references (~50 locations)

**Post-step:** Run EntityGroup building and comparison regression tests

### 3.3 nameAnalysisForMatching.js

**Decision: Delete vs Archive?**
- 328 lines of analysis code, not loaded in production
- **Recommendation: ARCHIVE** to `/archive/matching/`

### 3.4 CompositeHousehold Class

**Pre-step:** Define specific regression test
- Load saved database with any CompositeHousehold entities
- Verify deserialization works

**Decision: Delete vs Archive?**
- Class defined but never instantiated
- **Recommendation: KEEP in serialization registry** for backward compatibility
- **ARCHIVE the class definition** with comment explaining why

### 3.5 Test/Analysis Scripts

**Decision: Delete vs Archive?**
- Development utilities with potential reference value
- **Recommendation: MOVE** to `/scripts/testing/` or `/archive/analysis/`

### Post-Phase Regression Test
Run full regression suite - all tests must pass.

### Phase 3 Commit
```
Phase 3: Remove orphaned code (legacySerialize, legacyInfo, unused classes)
```

---

## PHASE 4: Browser File Consolidation (MEDIUM-HIGH RISK)

**Risk:** Medium-High | **Impact:** ~2000 lines potential removal

### Pre-Phase Regression Test
Run full regression suite and confirm baseline.

### 4.1 entityBrowser.js Assessment

**Pre-step:** Define specific regression test
- Test all entityBrowser.js UI features
- Document each function's purpose

**Decision: Delete vs Archive?**
- Need to verify unifiedEntityBrowser.js covers all features
- **Recommendation: ARCHIVE** if superseded, after feature verification

**Action:**
1. List all functions in entityBrowser.js
2. Verify each has equivalent in unifiedEntityBrowser.js
3. If fully superseded: archive file, update index.html
4. If unique features: integrate first, then archive

**Post-step:** Run entity browser regression tests

### 4.2 visionAppraisalBrowser.js Assessment

**Pre-step:** Define specific regression test
- Test all VisionAppraisal-specific browser features
- Document unique functionality

**Decision: Delete vs Archive?**
- Uses deprecated properties, may be redundant
- **Recommendation: Determine after Phase 2.3** completes

### 4.3 extractNameFromEntity() Consolidation

**Pre-step:** Define specific regression test
- Run name extraction on sample entities
- Verify name comparison works correctly

**Decision: Delete vs Archive?**
- Duplicate function, keep more robust version
- **Recommendation: ARCHIVE** the file containing duplicate (nameAnalysisForMatching.js already being archived)

### Post-Phase Regression Test
Run full regression suite - all tests must pass.

### Phase 4 Commit
```
Phase 4: Consolidate browser files, remove redundant implementations
```

---

## NOT IN SCOPE (Deferred)

Per user decision:
- **Monolithic file refactoring** - Skip for now
- **Dual comparison path consolidation** - Intentional architecture
- **phonebook.js** - Keep (next major development step)

---

## Archive Structure

```
/archive/
  /obsolete_2024/     - Files from obsolete/ folder
  /integration/       - Experimental integration code
  /matching/          - Unused matching algorithms
  /analysis/          - One-off analysis scripts
  /browser/           - Superseded browser implementations
```

Each archive folder should contain a `README.md` explaining:
- What the code was for
- Why it was archived
- Date archived

---

## Critical Files (Do Not Break)

### Tier 1: Core Infrastructure (Breaking = System Unusable)

| File | Purpose | Why Critical |
|------|---------|--------------|
| `index.html` | Main UI | Entry point, all buttons, script loading |
| `scripts/baseCode.js` | VA scraping (Buttons 1-4) | Data acquisition from VisionAppraisal |
| `scripts/googleLinks.js` | Google API authentication | All Drive operations |
| `scripts/fileLogistics.js` | File I/O operations | Save/load functionality |

### Tier 2: Entity System (Breaking = No Entity Processing)

| File | Purpose | Why Critical |
|------|---------|--------------|
| `scripts/objectStructure/entityClasses.js` | Entity, Individual, AggregateHousehold, Business, LegalConstruct | Core data model |
| `scripts/objectStructure/contactInfo.js` | ContactInfo, Address classes | Entity addresses |
| `scripts/objectStructure/aliasClasses.js` | IndividualName, AttributedTerm | Name handling |
| `scripts/objectStructure/householdInformation.js` | HouseholdInformation class | Bloomerang households |
| `scripts/objectStructure/entityGroup.js` | EntityGroup, EntityGroupDatabase | Grouping system |
| `scripts/utils/classSerializationUtils.js` | Serialization/deserialization | Save/load entities with types |

### Tier 3: Data Processing (Breaking = Can't Process Source Data)

| File | Purpose | Why Critical |
|------|---------|--------------|
| `scripts/dataSources/visionAppraisal.js` | VA data loading | VisionAppraisal entity source |
| `scripts/dataSources/processAllVisionAppraisalRecords.js` | Entity creation from VA | Step A4(b) |
| `scripts/dataSources/visionAppraisalNameParser.js` | Name parsing | Entity name extraction |
| `scripts/bloomerang.js` | Bloomerang CSV processing | Step A5 |
| `verification.js` | `generateFreshEveryThingWithPid()` | Step A3 |

### Tier 4: Matching & Grouping (Breaking = Can't Build EntityGroups)

| File | Purpose | Why Critical |
|------|---------|--------------|
| `scripts/matching/entityGroupBuilder.js` | 6-phase, 9-step algorithm | Builds EntityGroups |
| `scripts/matching/matchOverrideManager.js` | Override rules from Google Sheets | FORCE_MATCH/FORCE_EXCLUDE |
| `scripts/matching/universalEntityMatcher.js` | Entity comparison | Match scoring |
| `scripts/utils.js` | Comparison calculators, utilities | Core comparison logic |

### Tier 5: Browsers & Export (Breaking = Can't View/Export Data)

| File | Purpose | Why Critical |
|------|---------|--------------|
| `scripts/unifiedEntityBrowser.js` | Unified Entity Browser | View entities, analyze matches |
| `scripts/entityGroupBrowser.js` | EntityGroup Browser + CSV Reports | View groups, export |
| `scripts/entityRenderer.js` | Entity details popup windows | View Details, match comparisons |
| `scripts/export/lightweightExporter.js` | Lightweight JSON export | Google Apps Script integration |
| `scripts/dataSourceManager.js` | Data source management | Load unified database |

### Tier 6: Supporting (Important but Not Blocking)

| File | Purpose | Notes |
|------|---------|-------|
| `scripts/core/visionAppraisalProcessing.js` | `goAgain()` function | Retry failed downloads |
| `scripts/address/addressProcessing.js` | Address parsing | Used by entity creation |
| `scripts/dataSources/fireNumberCollisionHandler.js` | Fire number conflicts | Edge case handling |
| `scripts/validation/case31Validator.js` | Address validation | Quality checks |

### Files Safe to Modify/Remove (Not in Production Path)

- `obsolete/` folder contents
- `scripts/entityBrowser.js` (legacy, replaced by unified browser)
- `scripts/visionAppraisalBrowser.js` (legacy)
- Test files in `scripts/testing/`
- Analysis files in `scripts/integration/` (except if actively loaded)

---

## Rollback Commands

**Single file:**
```bash
git checkout v1.0.0-stable-dec-23-2025 -- path/to/file
```

**Complete rollback:**
```bash
git checkout v1.0.0-stable-dec-23-2025
```

---

## Execution Strategy

1. **Phase 0 FIRST** - Establish regression baseline before any changes
2. Run regression tests BEFORE and AFTER each phase
3. Commit after each phase with descriptive message
4. Explicit delete-vs-archive decision for every removal
5. If any regression test fails, rollback that phase before proceeding
