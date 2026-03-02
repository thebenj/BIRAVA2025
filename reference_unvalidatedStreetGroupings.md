# Unvalidated Phonebook Streets — Categorized Groupings

**Purpose**: Working document for deciding how to handle the 190 phonebook records (109 unique streets) that fail the `isValidBIStreet` gate after the synonym exclusion fix.

**Generated**: February 20, 2026 (Session 108)
**Updated**: February 21, 2026 (Session 111 — confirmed 3 unvalidated remaining after all fixes)

**Data source**: `processPhonebookFile()` → `analyzeUnvalidatedStreets()` console output

**Category Status**: Cat 1 (PO Boxes) **RESOLVED** (Session 110) — Cat 2 (Special Cases) PARTIALLY RESOLVED (3 pending: (Plant), Block Island, Attorneys-at-Law) — Cat 3 (Real Streets) **RESOLVED**

---

## CATEGORY 1: PO Boxes in Street Field (39 unique, ~46 records) — RESOLVED (Session 110)

**Resolution:** Fixed `extractBox()` regex (tightened capture group to `(\d+|[A-Za-z]\d?)`) and fixed JavaScript falsy-value `||` fallback bug in 6 LineType processors. All Box NNN values now route to `address.box`. Test result: 0 records with "Box NNN" in street field.

| Street Value | Records |
|---|---|
| Box 1366 | 3 |
| Box 1331 | 2 |
| Box 1454 | 2 |
| Box 1018 | 2 |
| Box 358 | 1 |
| Box 949 | 1 |
| Box 357 | 1 |
| Box 781 | 1 |
| Box 518 | 1 |
| Box 369 | 1 |
| Box 580 | 1 |
| Box 136 | 1 |
| Box 1557 | 1 |
| Box 205 | 1 |
| Box 534 | 1 |
| Box 937 | 1 |
| Box 1857 | 1 |
| Box D2 | 1 |
| Box 126 | 1 |
| Box 1015 | 1 |
| Box 118 | 1 |
| Box 234 | 1 |
| Box 595 | 1 |
| Box 392 | 1 |
| Box 935 | 1 |
| Box 292 | 1 |
| Box 769 | 1 |
| Box 1208 | 1 |
| Box 1844 | 1 |
| Box 1001 | 1 |
| Box 411 | 1 |
| Box 998 | 1 |
| Box 41 | 1 |
| Box 364 | 1 |
| Box 871 | 1 |
| Box 897 | 1 |
| Box 1112 | 1 |
| Box 1675 | 1 |
| Box 186 | 1 |

---

## CATEGORY 2: Not Streets / Businesses / Off-Island (~12 unique, ~32 records) — PARTIALLY RESOLVED

Candidates for `Special::^::Cases` entry, off-island detection, or exclusion.

| Entry | Records | Notes | Disposition |
|---|---|---|---|
| Town Hall | 14 | BI location at Job's Hill | **RESOLVED** — Special::^::Cases candidate (Session 108) |
| Normal business | 8 | Parsing artifact — not a real address | **RESOLVED** — Special::^::Cases candidate (Session 110) |
| State Airport | 2 | BI location | **RESOLVED** — Special::^::Cases candidate (Session 108) |
| (Plant) | 1 | BI Power Co plant | PENDING — user decision needed |
| (See New Shoreham, Town of) | 1 | Cross-reference, not an address | **RESOLVED** — Special::^::Cases candidate (Session 108) |
| Block Island | 1 | Just the island name | PENDING — user decision needed |
| Old Harbor Dock | 1 | BI location | **RESOLVED** — Special::^::Cases candidate (Session 108) |
| Job's Hill/Town Hall | 1 | BI location (compound) | **RESOLVED** — Special::^::Cases candidate (Session 108) |
| Attorneys-at-Law | 1 | Business descriptor, not an address | PENDING — user decision needed |
| (Freight/B.I.) | 1 | Interstate Navigation freight | **RESOLVED** — Special::^::Cases candidate (Session 108) |
| West Kingstown | 1 | Off-island (misspelling of "West Kingston") | **RESOLVED** — added to offIslandLocations (Session 110) |
| Warwick | 1 | Off-island | **RESOLVED** — added to offIslandLocations (Session 110) |

---

## CATEGORY 3: Real BI Streets to Add (~37 unique canonical names, ~112 records) — RESOLVED (Session 109)

**Status**: All 56 variations resolved. 17 candidates added to 6 existing entries; 29 new StreetName entries created. Database expanded from 123 to 152 entries (285 variations in cache). See reference_sessionHistory_2026_February.md Session 109 for full details.

These are real Block Island streets not currently in the StreetNameDatabase. Grouped by likely canonical name, with all observed phonebook variations listed.

### High-frequency (5+ records)

| Canonical Name (to add) | Unmatched Variations | Total Records | Notes |
|---|---|---|---|
| SOUTHWEST POINT ROAD | Southwest Point Rd. (6), Southwest Pt. Rd. (4), Southwest Point (2), Sw Point Rd (1) | 13 | Multiple abbreviation forms |
| WEST LANE | West Lane (11), West Lane Box1641 (1) | 12 | Box1641 entry is a parsing issue |
| DUNN ROAD | Dunn Rd. (7), Dunn Rd (2) | 9 | |
| TRIM'S RIDGE | Trim's Ridge (2+2 curly apostrophe groups), Trims Rdg (1), Trims Ridge (1) | 6 | Curly apostrophe + abbreviation |
| SHEEP'S MEADOW | Sheep's Meadow (3+2 curly apostrophe groups) | 5 | Curly apostrophe |
| AMBROSE LANE | Ambrose Lane (4), Ambrose Ln (1) | 5 | |

### Medium-frequency (3-4 records)

| Canonical Name (to add) | Unmatched Variations | Total Records | Notes |
|---|---|---|---|
| SHEFFIELD FARM | Sheffield Farm (4) | 4 | |
| OLD HARBOR | Old Harbor (4) | 4 | |
| MILL POND ROAD | Mill Pond Rd. (3) | 3 | New after synonym fix |
| TURKEY HOLLOW | Turkey Hollow (3) | 3 | |
| WEST SIDE ROAD | W Side Rd. (3) | 3 | May already exist — "W" abbreviation not matching |
| WHALE SWAMP ROAD | Whale Swamp Rd. (3) | 3 | |
| INDIAN HEAD NECK ROAD | Indian Head Neck Rd. (3) | 3 | |
| LEE'S RIDGE ROAD | Lee's Ridge Rd. (2), Lees Ridge Rd. (1) | 3 | Curly apostrophe + missing apostrophe |
| EBBETT'S HOLLOW | Ebbett's Hollow (1+1 curly apostrophe), Ebbet's Hollow (1) | 3 | Curly apostrophe + spelling variation |
| CAT ROCK COVE ROAD | Cat Rock Cove Rd. (1), Cat Rock Cove (1), Cat Rock Rd. (1) | 3 | Multiple truncations |

### Low-frequency (2 records)

| Canonical Name (to add) | Unmatched Variations | Total Records | Notes |
|---|---|---|---|
| HULL LANE | Hull Lane (2) | 2 | |
| OLD HARBOR MEADOW | Old Harbor Meadow (2) | 2 | |
| SOUTH SHORE CLIFFS | South Shore Cliffs (2) | 2 | |
| ROSLYN ROAD | Roslyn Rd. (2) | 2 | |
| DUNN'S CART WAY | Dunn's Cart Way (1), Dunn's Cartway (1) | 2 | Curly apostrophe + space variation |
| SCHOONER POINT | Schooner Pt. (1), Schooner Point (1) | 2 | |
| JOB'S HILL ROAD | Jobs Hill Rd. (1), Job's Hill Rd. (1) | 2 | Curly apostrophe + missing apostrophe |
| PHEASANT TRAIL | Pheasant Trl. (1), Pheasant Trail (1) | 2 | |
| BRIDGEGATE SQUARE | Bridgegate Square (1), Bridgegate Sq. (1) | 2 | |

### Single-record streets

| Canonical Name (to add) | Variation | Notes |
|---|---|---|
| BEACON HILL ROAD | Beacon Hl Rd. (1) | New after synonym fix |
| CORMORANT POINT | Cormorant Pt. (1) | |
| JANE LANE | Jane Lane (1) | |
| CLAYHEAD TRAIL | Clayhead Trail (1) | |
| PARSONAGE | Parsonage (1) | |
| NEW HARBOR | New Harbor (1) | |
| RODMAN POND LANE | Rodman Pond Lane (1) | |
| GOOSE SWAMP LANE | Goose Swamp Lane (1) | |
| FOUNTAIN SQUARE | Fountain Square (1) | |
| RED GATE FARM | Red Gate Farm (1) | |
| HARBOR POND | Harbor Pond (1) | |
| TURNIP FARM | Turnip Farm (1) | |
| ANDY'S WAY | Andy's Way (1) | Curly apostrophe |

---

## RECURRING PATTERN: Curly/Smart Apostrophes

The phonebook uses curly/smart apostrophes (U+2019 `'`) while the database uses straight apostrophes (U+0027 `'`). This affects multiple streets:

| Street | Affected variations |
|---|---|
| SHEEP'S MEADOW | Sheep's (curly) |
| TRIM'S RIDGE | Trim's (curly) |
| LEE'S RIDGE ROAD | Lee's (curly) |
| EBBETT'S HOLLOW | Ebbett's (curly) |
| DUNN'S CART WAY | Dunn's (curly) |
| JOB'S HILL ROAD | Job's (curly) |
| ANDY'S WAY | Andy's (curly) |

**Resolution options:**
1. Add both curly and straight apostrophe forms as homonyms for each affected street
2. Add apostrophe normalization (curly → straight) in the matching code before `db.has()` check
3. Both (belt and suspenders)

---

## NOTES

- "West Lane, Box1641" is a parsing issue where the box number was not separated from the street. May need parser fix.
- "W Side Rd." — WEST SIDE ROAD may already exist in the database. The "W" abbreviation may not be stored as a homonym. Check before adding as new entry.
- Some "canonical names" suggested above may need user verification against actual BI street naming conventions.
- Category 2 items marked "Special::^::Cases candidate?" await user decision on which locations to include.

---

**Document Version**: 3.1
**Related**: reference_phonebookIntegration.md (v3.7, Session 111)
