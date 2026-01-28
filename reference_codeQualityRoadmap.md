# Code Quality Improvement Roadmap

**Purpose**: Track planned code organization and maintainability improvements
**Status**: IN PROGRESS
**Last Updated**: January 27, 2026

---

## Task CQ-1: Extract Inline Script Handlers from index.html

**Status**: USER_VERIFIED_COMPLETE

### Summary

Four workflow button handlers were extracted from inline `<script>` tags in index.html to external file `scripts/ui/workflowHandlers.js`.

### Migrated Functions

| Function | New Location |
|----------|--------------|
| `processAndSaveVisionAppraisal()` | scripts/ui/workflowHandlers.js |
| `runEntityProcessing()` | scripts/ui/workflowHandlers.js |
| `recordUnifiedDatabase()` | scripts/ui/workflowHandlers.js |
| `loadUnifiedDatabaseFromDrive()` | scripts/ui/workflowHandlers.js |

Also migrated:
- `UNIFIED_DB_FILE_ID_KEY` (constant)
- `saveUnifiedDatabaseFileId()` (helper)
- `getUnifiedDatabaseFileId()` (helper)

### Implementation Approach

Used incremental migration with parallel operation period:
1. Created external file with duplicate `_ext` functions
2. Verified external functions worked identically
3. Migrated one function at a time with testing after each
4. Removed inline versions only after external versions verified

### Result

All 4 workflow buttons work correctly. Code searches now find these functions in `.js` files.

---

## Future Tasks

(Add additional code quality tasks here as identified)

---

## Version History

| Date | Change |
|------|--------|
| 2026-01-27 | Created document with Task CQ-1 (inline script extraction) |
| 2026-01-27 | Task CQ-1 completed - all functions migrated to scripts/ui/workflowHandlers.js |
