# Browser Archive - December 2025

**Archived:** December 27, 2025
**Reason:** Superseded by unifiedEntityBrowser.js

## Files

### entityBrowser.js
- **Original Purpose:** Bloomerang-only entity browser ("Entity Browser - Collection Explorer")
- **Why Archived:** All features superseded by unifiedEntityBrowser.js which provides:
  - Multi-source support (VisionAppraisal, Bloomerang, or both)
  - Entity type filtering
  - Match analysis and reconciliation
  - Superior HTML entity rendering
- **Key Function:** Contains `loadCurrentBloomerangFileIds()` which is no longer used by production workflow

### dataSourceManager.js
- **Original Purpose:** Data source abstraction layer created during unified browser transition
- **Why Archived:** Never integrated into production workflow. The unified browser uses workingEntityLoader.js and loadAllEntitiesButton.js instead.
- **Reference:** See reference_unifiedBrowserTransition.md for historical context

### visionAppraisalBrowser.js
- **Original Purpose:** VisionAppraisal-only entity browser ("VisionAppraisal Entity Browser - Property Data Explorer")
- **Why Archived:** Confirmed dead code via diagnostic testing (Dec 27, 2025). No functions called during normal app usage. All functionality superseded by unifiedEntityBrowser.js + entityRenderer.js.
- **Note:** Contains diagnostic console.log statements added during verification testing
- **Historical:** Used deprecated entity.label/entity.number properties (always null, displayed as "Not Available")
