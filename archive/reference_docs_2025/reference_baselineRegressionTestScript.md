# BIRAVA2025 Baseline Regression Test Script

**Version:** 1.0
**Created:** December 24, 2025
**Purpose:** Step-by-step test script to verify all production functionality works correctly

---

## PRE-TEST: Data Protection Setup

### Step 0.1: Record Production File IDs

Before running any tests that save data, record your production Google Drive file IDs.

**Open browser Developer Tools (F12) → Console tab**

Run these commands and record the values:

```javascript
// Record these values BEFORE testing
console.log("=== PRODUCTION FILE IDS - RECORD THESE ===");
console.log("Unified Database File ID:", localStorage.getItem('birava_unifiedDatabaseFileId'));
console.log("EntityGroup Database File ID:", localStorage.getItem('birava_entityGroupFileId'));
console.log("EntityGroup Reference File ID:", localStorage.getItem('birava_entityGroupReferenceFileId'));
```

**Record values here:**
- Unified Database File ID: `_______________________________`
- EntityGroup Database File ID: `_______________________________`
- EntityGroup Reference File ID: `_______________________________`

---

## QUICK TEST (5 minutes)

### Test 1: Server Start

**Actions:**
1. Verify server is running at http://127.0.0.1:1337/
2. Page should load without errors
3. Open Developer Tools (F12) → Console tab
4. Check for any red error messages during page load

**Expected Results:**
- [ ] Page loads completely
- [ ] No JavaScript errors in console
- [ ] All script files load successfully

**Actual Results:**
- Page loaded: [ ] YES / [ ] NO
- Console errors: [ ] NONE / [ ] ERRORS (describe below)
- Notes: _______________________________________________

---

### Test 2: UI Structure

**Actions:**
1. Look at the main page layout
2. Click on "Phase A: Rebuild from Source" header to expand/collapse
3. Click on "Phase B: Work with Saved Data" header to expand/collapse
4. Check "Extra Tools" section (should be collapsed by default)

**Expected Results:**
- [ ] Phase A section visible with steps A0-A6
- [ ] Phase B section visible with steps B1-B3
- [ ] Extra Tools section collapsed by default
- [ ] All sections expand/collapse correctly
- [ ] Unified Entity Browser visible
- [ ] EntityGroup Browser visible

**Actual Results:**
- Phase A visible and collapsible: [ ] YES / [ ] NO
- Phase B visible and collapsible: [ ] YES / [ ] NO
- Extra Tools collapsed by default: [ ] YES / [ ] NO
- Browsers render correctly: [ ] YES / [ ] NO
- Notes: _______________________________________________

---

### Test 3: Load Unified Database (Phase B, Step B1)

**Actions:**
1. Locate the "Phase B: Work with Saved Data" section
2. Find Step B1 "Load Saved Unified Database"
3. Ensure the file ID input field has a value (or enter your production file ID)
4. Click the "Load Unified Database" button (folder icon)
5. Watch the console for loading messages

**Expected Results:**
- [ ] Loading indicator appears
- [ ] Console shows entity count message
- [ ] Entity count displayed in UI (expect ~4,200 entities)
- [ ] No console errors

**Actual Results:**
- Entity count loaded: __________ entities
- Console errors: [ ] NONE / [ ] ERRORS (describe below)
- Notes: _______________________________________________

---

## STANDARD TEST (15 minutes)

### Test 4: EntityGroup Building (Phase B, Step B2)

**Pre-requisite:** Unified database must be loaded (Test 3). If you reloaded the page, re-run Test 3 first.

**Actions:**
1. Scroll down to the EntityGroup Browser section
2. Check the "Load override rules" checkbox
3. **FOR QUICK TESTING:** Enter `200` in the "Sample size" input (leave blank for full build)
4. Click the "Build New" button (hammer icon)
5. Watch the console for phase progression

**Sample Size Options:**
- **Blank or empty:** Full build (~25 minutes, ~2,100 groups)
- **200:** Quick test build (~1-2 minutes, ~100 groups) - recommended for regression testing
- **500:** Medium test build (~5 minutes)

**Expected Results:**
- [ ] Console shows "Loading match override rules..."
- [ ] If sample mode: Console shows "[SAMPLE MODE] Using stratified sample..."
- [ ] Phase 1: VisionAppraisal Households completes
- [ ] Phase 2: VisionAppraisal Individuals completes
- [ ] Phase 3: VisionAppraisal Other Types completes
- [ ] Phase 4: Bloomerang Households completes
- [ ] Phase 5: Bloomerang Individuals completes
- [ ] Phase 6: Bloomerang Other Types completes
- [ ] Group count displayed (sample mode: ~100 groups, full: ~2,100 groups)
- [ ] No console errors

**Actual Results:**
- Override rules loaded: [ ] YES / [ ] NO
- All 6 phases completed: [ ] YES / [ ] NO
- Group count: __________ groups
- Console errors: [ ] NONE / [ ] ERRORS (describe below)
- Notes: _______________________________________________

---

### Test 5: Unified Entity Browser

**Pre-requisite:** Unified database must be loaded (Test 3). Click "Load All Data Sources" button if browser shows no entities.

**Actions:**
1. Locate the "Unified Entity Browser" section
2. In the search box, type a known fire number (e.g., "1510")
3. Press Enter or click Search
4. Test the "Data Source" filter dropdown (try: All, VisionAppraisal, Bloomerang)
5. Test the "Entity Type" filter dropdown
6. Click on an entity in the results list, then click "View Details" button
7. **Explore the popup window:** Check that entity information displays correctly, explore any buttons/links in the popup (e.g., expand sections, view raw data)
8. Close the popup, select an entity, then click "Analyze Matches" button
9. **Explore the match analysis popup:** Verify match scores display, explore comparison breakdowns

**Expected Results:**
- [ ] Search returns matching entities
- [ ] Data Source filter changes displayed results
- [ ] Entity Type filter changes displayed results
- [ ] Clicking "View Details" opens popup with entity details
- [ ] Entity details popup displays correctly (name, addresses, contact info, etc.)
- [ ] Buttons/controls within the popup function correctly
- [ ] "Analyze Matches" opens match analysis popup
- [ ] Match analysis shows comparison scores and breakdowns

**Actual Results:**
- Search works: [ ] YES / [ ] NO
- Filters work: [ ] YES / [ ] NO
- View Details popup works: [ ] YES / [ ] NO
- Popup buttons/controls work: [ ] YES / [ ] NO
- Analyze Matches works: [ ] YES / [ ] NO
- Notes: _______________________________________________

---

### Test 6: EntityGroup Browser

**Pre-requisite:** EntityGroups must be built or loaded (Test 4).

**Actions:**
1. In the EntityGroup Browser section, observe the results list showing groups
2. Use the Filter dropdown to try different filters (All Groups, Multi-Member Only, Prospects, etc.)
3. Use the Sort dropdown to change sorting (Group Index, Member Count)
4. Use up/down arrow keys or scroll to navigate through the group list
5. Click on a group in the list to select it
6. Click "View Group Details" button to see full group information
7. **Explore the Group Details popup:**
   - Check member list displays with entity details
   - Check consensus entity section (if multi-member group)
   - Check near-misses section (if any)
   - Try clicking on individual member entries to view their details
   - Try "Compare" buttons between members (if available)
8. Try the search box - enter a name or address fragment and click Search

**Expected Results:**
- [ ] Groups list displays with founding member info
- [ ] Filter dropdown changes displayed groups
- [ ] Sort dropdown reorders groups
- [ ] Clicking a group selects/highlights it
- [ ] "View Group Details" opens detailed group popup
- [ ] Group popup shows members, consensus entity, near-misses
- [ ] Buttons within group popup function correctly (view member, compare, etc.)
- [ ] Search filters groups by name/address

**Actual Results:**
- Groups list displays: [ ] YES / [ ] NO
- Filters work: [ ] YES / [ ] NO
- Sort works: [ ] YES / [ ] NO
- View Group Details popup works: [ ] YES / [ ] NO
- Popup buttons/controls work: [ ] YES / [ ] NO
- Search works: [ ] YES / [ ] NO
- Notes: _______________________________________________

---

### Test 7: Match Override Verification

**Pre-requisite:** EntityGroups must be built with "Load override rules" checked (Test 4).

**Actions:**
1. Open Developer Tools Console (F12)
2. Type: `window.matchOverrideManager.getSummary()` and press Enter
3. Verify the summary shows rule counts

**Expected Results:**
- [ ] matchOverrideManager object exists and has getSummary() method
- [ ] forceMatchCount shows number of force-match rules (expect ~5)
- [ ] forceExcludeCount shows number of force-exclude rules (expect ~53)
- [ ] mutualExclusionSets shows MUTUAL rows were expanded (expect ~2)

**Actual Results:**
- forceMatch count: __________ rules
- forceExclude count: __________ rules
- mutualExclusionSets: __________ sets
- Notes: _______________________________________________

---

## FULL TEST (30 minutes)

### Test 8: Save/Load Cycle - Unified Database

**DATA PROTECTION WARNING:** The "Record Unified Database" button OVERWRITES the file ID in the input box. To protect production data, we use a dedicated test file.

**Test File ID for Unified Database:** `1a1pTRw7AXK_QPU26AsGPcb3UG2BskP8c`

**Actions:**
1. **Record your production file ID** from the input box (should be `1Z2V4Pi8KoxUR9B47KffEQI6gCs7rOS2Y`)
2. Make sure unified database is loaded in memory (Test 3)
3. **Replace the file ID** in BOTH input boxes (Phase A and Phase B) with the TEST file ID: `1a1pTRw7AXK_QPU26AsGPcb3UG2BskP8c`
4. Click "Record Unified Database" button (💾 save icon)
5. Wait for save to complete - verify console shows save to the TEST file ID
6. Reload the page (F5)
7. The TEST file ID should still be in the input box (verify it's the test ID, not production)
8. Click "Load Unified Database"
9. Verify entity count matches original (4,099)
10. **RESTORE production file ID** in BOTH input boxes: `1Z2V4Pi8KoxUR9B47KffEQI6gCs7rOS2Y`

**Expected Results:**
- [ ] Save completes without error to TEST file
- [ ] Console shows save to `1a1pTRw7AXK_QPU26AsGPcb3UG2BskP8c` (not production ID)
- [ ] After reload and load from TEST file: entity count matches original (4,099)
- [ ] Production file ID restored after test

**Actual Results:**
- Save completed to TEST file: [ ] YES / [ ] NO
- Original entity count: __________
- Reloaded entity count: __________
- Counts match: [ ] YES / [ ] NO
- Production ID restored: [ ] YES / [ ] NO
- Notes: _______________________________________________

---

### Test 9: Save/Load Cycle - EntityGroup Database

**DATA PROTECTION WARNING:** There are TWO save buttons:
- "💾 Save to File IDs" - OVERWRITES existing files (dangerous for production)
- "📄 Save as New Files" - Creates NEW files (safe for testing)

**Use "Save as New Files" for this test to avoid overwriting production data.**

**Pre-requisite:** EntityGroups must be built (Test 4) or loaded. Unified database must be loaded.

**Actions:**
1. Note the current group count from the EntityGroup Browser status
2. Click "📄 Save as New Files" button (NOT "Save to File IDs")
3. Wait for save to complete
4. **Note the NEW file IDs** shown in console (these are TEST files)
5. Reload the page (F5)
6. Load the unified database first (required before loading groups)
7. Enter the NEW TEST EntityGroup file ID in the EntityGroup file ID input
8. Enter the NEW TEST Reference file ID in the Reference file ID input
9. Click "📂 Load EntityGroups" button
10. Verify group count matches original
11. **RESTORE production file IDs** in both EntityGroup input boxes:
    - EntityGroup: `120z4Q_JVWjSij2BOyv93s_XnJ-SLqR1N`
    - Reference: `10LPpCPBWkc8ZQDqCake-0QenVWjCRpdd`

**Expected Results:**
- [ ] "Save as New Files" creates new files (not overwriting production)
- [ ] New file IDs displayed in console
- [ ] After reload and load from TEST files: group count matches original
- [ ] Production file IDs restored after test

**Actual Results:**
- TEST EntityGroup File ID: `_______________________________`
- TEST Reference File ID: `_______________________________`
- Original group count: __________
- Reloaded group count: __________
- Counts match: [ ] YES / [ ] NO
- Production IDs restored: [ ] YES / [ ] NO
- Notes: _______________________________________________

---

### Test 10: CSV Export - Prospects + Donors

**Actions:**
1. With EntityGroup database built (from Test 4)
2. Click "Export Prospects + Donors CSV" button
3. File should download automatically
4. Open the downloaded CSV file

**Expected Results:**
- [ ] CSV file downloads
- [ ] File has header row
- [ ] Data rows present
- [ ] Currency values formatted correctly (no parsing issues)

**Actual Results:**
- CSV downloaded: [ ] YES / [ ] NO
- Row count (approximate): __________
- Currency formatting correct: [ ] YES / [ ] NO
- Notes: _______________________________________________

---

### Test 11: Lightweight Export

**Actions:**
1. With EntityGroup database built
2. Click "Export Lightweight JSON" button
3. File should download automatically
4. Open the JSON file in a text editor

**Expected Results:**
- [ ] JSON file downloads
- [ ] Contains "metadata" object
- [ ] Contains "groups" array
- [ ] Groups have embedded entity data

**Actual Results:**
- JSON downloaded: [ ] YES / [ ] NO
- Has metadata: [ ] YES / [ ] NO
- Has groups array: [ ] YES / [ ] NO
- Notes: _______________________________________________

---

### Test 12: Assessment Value Report

**Actions:**
1. With EntityGroup database built
2. Click "Generate Assessment Value Report" button
3. Report should display (new window or in-page)

**Expected Results:**
- [ ] Report generates without error
- [ ] Assessment values displayed
- [ ] Report is readable and formatted

**Actual Results:**
- Report generated: [ ] YES / [ ] NO
- Assessment values present: [ ] YES / [ ] NO
- Notes: _______________________________________________

---

## POST-TEST: Restore Production File IDs

### Step 0.2: Restore Production File IDs

**CRITICAL:** After testing, restore your production file IDs in localStorage.

**Open browser Developer Tools (F12) → Console tab**

Run these commands with YOUR production values (from Step 0.1):

```javascript
// REPLACE these with your actual production file IDs from Step 0.1
localStorage.setItem('birava_unifiedDatabaseFileId', 'YOUR_PRODUCTION_UNIFIED_ID');
localStorage.setItem('birava_entityGroupFileId', 'YOUR_PRODUCTION_ENTITYGROUP_ID');
localStorage.setItem('birava_entityGroupReferenceFileId', 'YOUR_PRODUCTION_REFERENCE_ID');

// Verify restoration
console.log("=== RESTORED PRODUCTION FILE IDS ===");
console.log("Unified Database File ID:", localStorage.getItem('birava_unifiedDatabaseFileId'));
console.log("EntityGroup Database File ID:", localStorage.getItem('birava_entityGroupFileId'));
console.log("EntityGroup Reference File ID:", localStorage.getItem('birava_entityGroupReferenceFileId'));
```

**Verification:**
- [ ] All three file IDs restored to production values
- [ ] Values match what was recorded in Step 0.1

---

## TEST SUMMARY

**Date:** _______________
**Tester:** _______________

### Quick Test Results (Tests 1-3)
- [ ] PASS - All tests passed
- [ ] FAIL - Issues found (see notes)

### Standard Test Results (Tests 4-7)
- [ ] PASS - All tests passed
- [ ] FAIL - Issues found (see notes)

### Full Test Results (Tests 8-12)
- [ ] PASS - All tests passed
- [ ] FAIL - Issues found (see notes)

### Overall Baseline Status
- [ ] BASELINE ESTABLISHED - All tests pass, ready for Phase 1 cleanup
- [ ] ISSUES FOUND - Must resolve before proceeding

### Key Metrics (Baseline Values)
- Unified Database entity count: __________
- EntityGroup count: __________
- ForceMatch rules: __________
- ForceExclude rules: __________

### Notes / Issues Found
_______________________________________________
_______________________________________________
_______________________________________________

---

## Cleanup: Test Files Created

During Full Test, these TEST files were created in Google Drive. They can be deleted after testing:

- [ ] TEST Unified Database: `_______________________________`
- [ ] TEST EntityGroup Database: `_______________________________`
- [ ] TEST Reference File: `_______________________________`

**To delete:** Go to Google Drive and remove these files, or leave them (they won't affect production).
