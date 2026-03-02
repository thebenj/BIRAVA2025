# Save Infrastructure Lessons — UI Workflow Packaging

## Purpose

This document captures operational lessons from Sessions 127–131 that must inform the design of button-driven save/file-out/verify workflows. These lessons apply to the IndividualNameDatabase, PhonebookDatabase, and any future database using the three-layer persistence pattern (bulk file, individual files, index).

Referenced from: `reference_phonebookDatabasePlan.md` (Phases 6–7)

---

## Current Workflow vs Target Workflow

### Current (console-driven, Session 131)

1. Load 4 databases (3 UI buttons, 1 console command)
2. Run processing (console: `processPhase4NameVariations(db)`)
3. Read console output to verify results
4. Save (console: `saveModifiedIndividualNames(...)`)
5. File out in repeated batches (console, run 6 times: `fileOutIndividualNames(...)`)
6. Consistency check (UI button)

### Target (button-driven)

One button or a small sequence of buttons that: loads prerequisites, runs processing, displays verification, saves with backup, files out all entries automatically with retry, and runs consistency check — without requiring console commands or manual re-runs.

---

## Lesson 1: File-Out Must Auto-Continue

**Problem:** `fileOutIndividualNames()` processes one batch of 400 entries and stops. The user must re-run the same command 6 times for 2109 entries.

**Root cause:** The batch limit (400) was designed to prevent overwhelming Google Drive's API, but there's no loop to process subsequent batches automatically.

**Requirement for UI:** A "File Out" button must loop through all batches internally, with progress display, until all entries are processed or a fatal error occurs. The user should press the button once.

---

## Lesson 2: File-Out Must Auto-Retry on Cascading Timeouts

**Problem:** After ~400–600 sustained writes at ~4 req/sec, Google Drive API stops responding — all subsequent requests in the batch time out (30s each). This is NOT random isolated timeouts; it's a cascading failure where every request in a row fails.

**Evidence:** Session 131 — batch 2 hit 7 consecutive timeouts starting mid-batch. The failed entries all succeeded on the next run, confirming the failures are transient.

**Root cause:** Likely Google server-side rate throttling that manifests as unresponsive connections rather than proper 429/503 error codes.

**Requirement for UI:**
- Detect cascading failure (e.g., 3+ consecutive timeouts)
- Pause for a backoff period (30–60 seconds)
- Retry the failed batch
- Only escalate to error after multiple retry cycles fail
- Do NOT require user to manually re-run

---

## Lesson 3: Progress Must Survive Browser Refresh

**Problem:** `fileOutIndividualNames()` stores progress in localStorage under key `birava_individualName_fileout_progress`. This is cleared on hard refresh (Ctrl+Shift+R), losing all batch tracking.

**Workaround (current):** After refresh, count files in Google Drive folder to estimate actual progress.

**Requirement for UI:** Progress should be reconstructable from Drive state (compare folder file count to bulk entry count), not solely dependent on localStorage. The system should detect the discrepancy on startup and offer to resume.

---

## Lesson 4: Pre-Save Verification Must Be Visible

**Problem:** Before saving, the user needs to confirm the data is correct. Currently this relies on reading console output (`printStats()`, modified key count).

**What Session 131 showed:** The pre-save stats (2109 entries, 762 homonyms, 663 modified) were critical for the user to verify before committing. Without them, a bad save could go unnoticed.

**Requirement for UI:** Display entry count, variation count, homonym count, and modified entry count prominently in the UI before the save button becomes active. Consider a confirmation step.

---

## Lesson 5: Destructive Operations Must Look Different

**Problem:** The "Build Run/Resume" button in the IndividualName Browser looked like a routine "resume work" button but could trigger a full rebuild that overwrites the bulk file. Session 130 corruption was caused by this.

**Fix applied (Session 131):** `isFirstRun()` now checks Drive for existing bulk data. `saveIndividualNameDatabaseBulk()` auto-backs up before overwriting.

**Requirement for UI:** Buttons that can destroy data should be visually distinct (color, confirmation dialog) from buttons that are routine operations. A "Build from scratch" action should never be reachable through the same button as "Resume file-out."

---

## Lesson 6: Auto-Backup Before Bulk Overwrite Is Non-Negotiable

**Problem:** Before Session 131, `saveIndividualNameDatabaseBulk()` would overwrite the bulk file with no backup. If the save contained bad data (as in Session 130's rebuild), the only recovery was from a manually-maintained DEV copy.

**Fix applied:** Auto-backup is now called before every bulk save in `saveIndividualNameDatabaseBulk()`.

**Requirement for all databases:** This pattern must be standard in `SupplementalDataDatabase.saveToBulk()` (base class) so every subclass inherits it. Currently it's only in the IndividualNameDatabase save manager.

---

## Lesson 7: Consistency Check Is the Healing Mechanism

**Problem:** Timeouts during file-out can create duplicate files on Drive (request times out but the file was actually created server-side). Session 131 saw index grow to 2133 entries for 2109 actual bulk entries (24 orphans).

**How it's handled:** The consistency check detects duplicates, deletes extras (keeping newest), rebuilds the index from folder contents, and reports whether all three layers match.

**Requirement:** Consistency check must be a first-class feature of any database using three-layer persistence, run automatically after file-out completes. It's not a diagnostic — it's a healing step.

---

## Lesson 8: localStorage Key Names Must Be Discoverable

**Problem:** When trying to clear file-out progress, the wrong localStorage key was used (`fileOutProgress` instead of actual `birava_individualName_fileout_progress`). This wasted a debugging cycle.

**Requirement:** Each database's localStorage keys should be:
- Defined as named constants (already done: `FILEOUT_PROGRESS_KEY`)
- Accessible from console for debugging (e.g., `window.FILEOUT_PROGRESS_KEY` or a `resetProgress()` function)
- Prefixed consistently (e.g., `birava_{databaseName}_{operation}`)

---

## Implementation Priority

When building the Phase 6/7 UI workflow:

1. **Critical (prevents data loss):** Auto-backup (Lesson 6), destructive operation safety (Lesson 5)
2. **High (prevents manual re-runs):** Auto-continue (Lesson 1), auto-retry (Lesson 2)
3. **Medium (improves reliability):** Progress reconstruction (Lesson 3), consistency as healing (Lesson 7)
4. **Nice-to-have (improves UX):** Pre-save display (Lesson 4), discoverable keys (Lesson 8)
