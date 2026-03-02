# Supplemental Database Reuse Lessons — Building the Next Data Source

## Purpose

This document captures architectural and operational lessons from building the PhonebookDatabase (Sessions 117–131) that apply to any future supplemental data source (e.g., EmailDatabase). The SupplementalDataDatabase base class was designed for reuse, but the implementation experience revealed issues that the class design alone doesn't address.

Referenced from: `reference_phonebookDatabasePlan.md` ("Relationship to Email Processing" section)

---

## Architecture Recap

The SupplementalDataDatabase pattern:
- **Three-layer persistence**: bulk file (single JSON on Drive), individual files (one per entry in Drive folder), index file (maps primaryKey → fileId)
- **Three input channels**: algorithmic matches, user-declared inclusions, user-declared exclusions
- **Two goals**: one-time inaugural build (with annotation resolution) + repeatable rebuild code

---

## Lesson 1: Use Raw fetch() From Day One — Never gapi.client.drive

**What happened:** The gapi.client.drive library's internal auth state corrupts silently under sustained API traffic. Calls hang without rejecting — no error, no timeout, just silence. This caused:
- Session 127: PhonebookDatabase file-out hung at ~954 files. Fixed by replacing all 7 gapi calls in supplementalDataDatabase.js with raw fetch.
- Session 131: IndividualNameDatabase file-out failed after ~2 batches (~800 operations). Fixed by replacing 8 gapi calls in individualNameDatabaseSaveManager.js.

**Rule:** Every Google Drive API call in any new database code must use:
```javascript
const response = await fetchWithTimeout(url, {
    method: 'GET', // or POST, PATCH, DELETE
    headers: new Headers({
        'Authorization': `Bearer ${gapi.client.getToken().access_token}`
    })
}, timeoutMs);
```

Never `gapi.client.drive.files.*`. This is documented as a banned pattern in CLAUDE.md.

---

## Lesson 2: Cascading Timeouts Are Structural, Not Random

**What happened:** Even after converting to raw fetch, sustained writes at ~4 req/sec to Google Drive trigger cascading failures after ~400–600 operations. All subsequent requests in the batch time out. They succeed on retry in a new batch.

**Implication:** Any database with >400 entries will hit this during file-out. The code must handle it — not by increasing timeout, but by detecting the cascade pattern (3+ consecutive timeouts), backing off, and retrying.

**Design for the next database:**
- Build backoff + auto-retry into the file-out loop from the start
- Don't treat batch-of-400 as a user-facing interaction — loop internally
- See `reference_saveInfrastructureLessons.md` for detailed UI requirements

---

## Lesson 3: Auto-Backup Before Bulk Overwrite Should Be in the Base Class

**What happened:** Session 130 — the IndividualName Browser "Build/Resume" button triggered a full rebuild that overwrote the bulk file with fresh (incomplete) data. Recovery required restoring from a manually-maintained DEV backup.

**Current state:** Auto-backup was added to `saveIndividualNameDatabaseBulk()` in Session 131, but only for IndividualNameDatabase. `SupplementalDataDatabase.saveToBulk()` does NOT have auto-backup.

**Recommendation:** Move auto-backup into `SupplementalDataDatabase.saveToBulk()` so PhonebookDatabase, future EmailDatabase, and any other subclass gets it automatically. The backup copies the existing bulk file to a timestamped backup file before overwriting.

---

## Lesson 4: Destructive Rebuild Protection Should Be in the Base Class

**What happened:** `isFirstRun()` checked only localStorage to decide whether to build from scratch. When localStorage was cleared (Reset button), it returned true, triggering a rebuild that overwrote good data on Drive.

**Fix applied:** `isFirstRun()` now checks Drive for existing bulk file metadata (size > 1000 bytes) before allowing a fresh build.

**Recommendation:** Any database with a "build from scratch" capability needs the same guard. The check pattern (does a non-trivial bulk file exist on Drive?) is generic and belongs in the base class or as a standard utility.

---

## Lesson 5: Consistency Check Is Essential, Not Optional

**What happened:** After file-out, the index had 2133 entries for 2109 actual files — 24 orphans from timed-out requests that actually succeeded server-side. The consistency check detected this, deleted duplicates, rebuilt the index, and verified all three layers matched.

**Implication:** Any database using three-layer persistence MUST have a consistency check that:
1. Loads the bulk file (counts entries)
2. Lists the folder contents (counts files, detects duplicates)
3. Deduplicates (keeps newest, deletes extras)
4. Loads the index (counts entries)
5. Rebuilds index from folder if sizes don't match
6. Reports whether all three layers are consistent

`SupplementalDataDatabase` already has folder management. A generic `consistencyCheck()` could be added to the base class.

---

## Lesson 6: The One-Time vs Repeatable Distinction Is Critical

**What happened:** Session 123 — a console script that performed one-time annotation resolution (translating user-provided entity names to entity keys) was deleted before its output was durably saved. Session 125–126 spent multiple sessions trying to backfill the lost data with unreliable heuristics.

**Rule for the next database:**
- Identify one-time operations early (e.g., resolving user annotations by name to entity keys)
- Ensure one-time output is saved to a permanent file BEFORE deleting the script
- Repeatable operations (algorithmic matching) can be re-run anytime
- Never treat one-time output as transient
- Guessing (backfill) is worse than honest nulls

---

## Lesson 7: serializeWithTypes() Output Is a String in Bulk

**What happened:** During content verification (Session 131), the comparison script compared `JSON.stringify(bulkObject)` to `JSON.stringify(fileObject)` — but `bulkObject` in the parsed bulk JSON is already a string (the output of `serializeWithTypes()`), while `fileObject` was a parsed object. All 2109 entries showed as "mismatched" due to comparing different types.

**Rule:** When the bulk JSON is parsed, each entry's `.object` field is a string (the serialized form). Individual files on Drive contain the same string directly. Content comparison must be string-to-string: `bulkEntry.object === fileText`.

---

## Lesson 8: Test Counts from Persisted vs Fresh Rebuild May Differ

**What happened:** Session 128 diagnosed 115 AggregateHouseholds with empty individuals from a persisted database. Session 129 fresh rebuild found only 39. The difference: the persisted database was from an older build with different entity data.

**Rule:** Always note whether a count came from a persisted database or a fresh rebuild. When counts differ, the fresh rebuild is authoritative.

---

## Checklist for Next Supplemental Database

When building EmailDatabase (or any other):

- [ ] All Google Drive calls use raw fetch with explicit Bearer token
- [ ] File-out has backoff + auto-retry for cascading timeouts
- [ ] Auto-backup before bulk overwrite (ideally in base class)
- [ ] Rebuild protection checks Drive before allowing fresh build
- [ ] Consistency check available as healing mechanism
- [ ] One-time operations identified and output saved before any scripts deleted
- [ ] Content comparison uses correct types (string-to-string for bulk vs individual)
- [ ] Counts annotated with source (persisted vs fresh rebuild)
- [ ] localStorage keys are named constants, prefixed consistently
- [ ] Progress survives or is reconstructable after browser refresh
