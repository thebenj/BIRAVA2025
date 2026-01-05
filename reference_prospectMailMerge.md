# Prospect Mail Merge Export Specification

## Overview

The Prospect Mail Merge export generates a CSV spreadsheet for direct mail campaigns targeting property owners who are not yet donors (not in Bloomerang).

**Function:** `downloadProspectMailMerge(options)`
**Location:** `scripts/entityGroupBrowser.js`
**Output:** `prospect_mailmerge_YYYY-MM-DD.csv`

## Architecture

The mail merge export builds on the existing `exportEntityGroupsToCSV()` infrastructure:
- Uses a 62-column CSV format (expanded from 54 to add SecAddr1 component columns)
- Reuses helper functions: `generateCSVRow()`, `formatFullAddress()`, `cleanVATags()`, etc.
- Has its own row generation function `generateMailMergeGroupRows()` for different row rules
- Uses existing comparison infrastructure (`universalCompareTo()`) for consolidation decisions

## Exclusion Rules (Challenge 1)

EntityGroups are excluded if ANY of the following apply:

### 1. Has Bloomerang Member
- Groups with `hasBloomerangMember === true` are excluded
- These are existing donors, not prospects

### 2. Group Size Exceeds Maximum
- Groups with more than `maxGroupSize` members are excluded
- Default: 23 members
- Parameter: `options.maxGroupSize`
- Rationale: Very large groups often represent data quality issues

### 3. Excluded Mailing Address
- Groups where the founding member's first secondary address matches an excluded address
- Excluded addresses loaded from Google Sheet: `1SznUWxOrYZAHx_PdEI1jLWTB-n85optL_TET3BNRbvc`
- First column of sheet contains addresses to exclude
- Address comparison uses `formatFullAddress()` for consistent formatting
- Addresses normalized for comparison: lowercase, trimmed, whitespace collapsed

**Key Implementation Detail:**
The first secondary address is the preferred mailing address. The exclusion list contains addresses we should not mail to.

## Row Rules (Challenge 2)

### Single-Member Groups (memberCount === 1)
- Only founding member row is output
- No consensus row (would be redundant)

### Multi-Member Groups - ContactInfo Connected
A multi-member group is "contactInfo-connected" when all members can be reached from any starting member via a chain of pairwise contactInfo comparisons that exceed the true match threshold.

**Connectivity Test:**
- Uses `universalCompareTo()` (same comparison used in entity group building)
- Extracts `contactInfoScore` from `comparison.details.components.contactInfo.similarity`
- Threshold: `MATCH_CRITERIA.trueMatch.contactInfoAlone` (0.87)
- Uses flood-fill algorithm: start from first member, find all reachable members via edges where contactInfoScore > 0.87
- Group passes if all members are reachable (connected component includes everyone)

**When contactInfo-connected:**
- Output a single **consolidated** row (rowType = 'consolidated')
- Key column contains 'CONSOLIDATED_GROUP'
- **All content except name:** From consensus entity
- **Name selection logic:**
  1. If exactly one member is type "Individual" → use that Individual's name
  2. If exactly two members are type "Individual" AND their names pass the true match threshold (nameAlone > 0.875 via `universalCompareTo()`) → use the first Individual's name
  3. Otherwise → use consensus entity's name

### Multi-Member Groups - Not ContactInfo Connected
When members are NOT all connected via contactInfo threshold:
- Consensus row (synthesized best data)
- Founding member row
- Additional member rows

### All Groups
- No nearmiss rows (excluded from mail merge)

## Sorting

Groups are sorted in this order:

### Primary Sort: Founding Member Entity Type
Custom order (not alphabetical):
1. Individual
2. AggregateHousehold
3. LegalConstruct
4. Business

Unknown types sort to the end.

### Secondary Sort: Member Count (Descending)
Within each type group, larger groups appear first.

## Column Format (62 Columns)

Expanded from the standard 54-column format to add SecAddr1 component columns for debugging address data.

### Section 1: Identification & Mail Merge Core (columns 0-9)
`RowType`, `GroupIndex`, `Key`, `MailName`, `MailAddr1`, `MailAddr2`, `MailCity`, `MailState`, `MailZip`, `Email`

### Section 2: Additional Contact Info (columns 10-23)
- `Phone` (10)
- `POBox` (11)
- SecAddr1 components (12-20):
  - `SecAddr1_primaryAlias` - full formatted address term (for verification)
  - `SecAddr1_streetNumber`
  - `SecAddr1_streetName`
  - `SecAddr1_streetType`
  - `SecAddr1_city`
  - `SecAddr1_state`
  - `SecAddr1_zipCode`
  - `SecAddr1_secUnitType`
  - `SecAddr1_secUnitNum`
- `SecAddr2` (21) - formatted string
- `SecAddr3` (22) - formatted string
- `SecAddrMore` (23) - pipe-delimited overflow

### Section 3: Entity Metadata (columns 24-25)
`EntityType`, `Source`

### Sections 4-6: Alternatives (columns 26-61)
Name, Address, and Email alternatives (homonyms, synonyms, candidates) - 12 columns each.

## Functions

### `downloadProspectMailMerge(options)`
Main entry point. Async function that:
1. Validates databases are loaded
2. Loads excluded addresses from Google Sheet
3. Calls `exportProspectMailMerge()`
4. Downloads the CSV file
5. Displays statistics

**Options:**
- `maxGroupSize` (number, default: 23) - Maximum group members to include

### `exportProspectMailMerge(groupDatabase, options)`
Core export logic. Returns `{csv, stats}`.

**Stats returned:**
- `totalGroups` - All groups in database
- `totalProspectGroups` - Groups without Bloomerang members
- `excludedForSize` - Groups excluded for exceeding maxGroupSize
- `excludedForAddress` - Groups excluded for matching excluded address list
- `maxGroupSize` - The maxGroupSize parameter used
- `eligibleGroups` - Final count of groups in export
- `collapsedGroups` - Multi-member groups collapsed due to contactInfo connectivity
- `rowCount` - Total rows in CSV

### `generateMailMergeGroupRows(group, entityDb)`
Generates CSV rows for a single group with mail merge rules.

**Returns:** `{ rows: Array<Array<string>>, collapsed: boolean }`

**Logic:**
- Single-member: founding row only, `collapsed: false`
- Multi-member contactInfo-connected: single consolidated row, `collapsed: true`
- Multi-member not connected: consensus + founding + member rows, `collapsed: false`
- Never includes nearmiss rows

### `isGroupContactInfoConnected(group, entityDb)`
Checks if all members of a group are connected via contactInfo similarity using flood-fill.

**Parameters:**
- `group` - EntityGroup object with memberKeys
- `entityDb` - Entity database with .entities property

**Returns:** `boolean` - true if all members reachable via contactInfo > 0.87 edges

**Implementation:**
- Uses `universalCompareTo()` (same as entity group building)
- Extracts `contactInfoScore` from comparison details
- Flood-fill from first member, early exit when all reached

### `getCollapsedRowNameEntity(group, entityDb)`
Determines which entity's name to use for a collapsed row.

**Rules:**
1. Exactly one Individual member → return that Individual
2. Exactly two Individual members with names passing threshold (nameAlone > 0.875) → return first Individual
3. All other cases → return consensus entity

**Uses:** `universalCompareTo()` to get name score for rule 2

### `extractSecAddr1Components(entity)`
Extracts the 9 component columns for the first secondary address directly from Address object properties.

**Returns:** Array of 9 strings: `[primaryAlias, streetNumber, streetName, streetType, city, state, zipCode, secUnitType, secUnitNum]`

### `loadMailMergeExcludedAddresses()`
Loads excluded addresses from Google Sheet into `mailMergeExcludedAddresses` Set.

### `getFirstSecondaryAddress(entity, debug)`
Extracts first secondary address using `formatFullAddress()` for consistent formatting.

### `isAddressExcluded(entity)`
Checks if entity's first secondary address is in the excluded set.

### `getFoundingMemberType(group, entityDb)`
Returns entity type of founding member for sorting.

## Google Sheet Integration

**Excluded Addresses Sheet ID:** `1SznUWxOrYZAHx_PdEI1jLWTB-n85optL_TET3BNRbvc`

- First column (A) contains addresses to exclude
- Addresses are normalized before comparison
- Sheet is loaded fresh each time export runs

## Usage

```javascript
// Basic usage with defaults (maxGroupSize: 23)
await downloadProspectMailMerge()

// Custom max group size
await downloadProspectMailMerge({ maxGroupSize: 10 })
```

## Project Status

**STATUS: ON HOLD** - Pending resolution of secondary address parsing issue.

### Blocking Issue (Discovered Session 22)

The contactInfo-connected consolidation feature does not work as intended due to a **secondary address parsing issue**:

1. VisionAppraisal secondary addresses have `primaryAlias.term` containing the full formatted address string (e.g., `13 TOP PASTURE ROAD::#^#::WASHINGTON DEPOT:^#^: CT 06794`)

2. However, the parsed component properties are malformed:
   - `streetName` contains concatenated street + city with artifacts (e.g., `TOP PASTURE ROAD\nWASHINGTON DEPOT#`)
   - `city`: undefined
   - `state`: undefined
   - `zipCode`: correctly parsed

3. `Address.compareTo()` compares parsed components, NOT the `primaryAlias.term` string

4. Result: Two addresses with **identical** `primaryAlias.term` strings return a comparison score of **0** because the parsed components don't match properly

**Impact**: Groups that should consolidate (identical secondary mailing addresses) are not being consolidated because the address comparison fails.

**Next Steps**: New subproject to investigate when/how secondary addresses are being compared - whether using parsed components vs unparsed strings, and why VisionAppraisal secondary addresses have malformed component parsing.

## Development History

### Session 22 (January 4, 2026)
- Challenge 2 enhancement: ContactInfo-connected consolidation
  - Multi-member groups where all members are connected via contactInfo similarity now output single consolidated row
  - Uses existing `universalCompareTo()` infrastructure (same as entity group building)
  - Threshold: `MATCH_CRITERIA.trueMatch.contactInfoAlone` (0.87)
  - Flood-fill algorithm for connectivity testing
  - Name selection: single Individual, or two Individuals with matching names (> 0.875), else consensus
  - New row type 'consolidated' with Key = 'CONSOLIDATED_GROUP'
  - Helper functions: `isGroupContactInfoConnected()`, `getCollapsedRowNameEntity()`
  - New stat: `collapsedGroups`
- CSV format expanded from 54 to 62 columns
  - SecAddr1 expanded to 9 component columns for debugging address data issues
  - New function: `extractSecAddr1Components()`
- **BLOCKING ISSUE DISCOVERED**: Secondary address comparison returns 0 for identical addresses due to malformed component parsing (see Project Status above)

### Session 21 (December 28, 2025)
- Initial implementation based on existing CSV export
- Challenge 1: Exclusion rules
  - Max group size parameter
  - Excluded addresses from Google Sheet
- Challenge 2 (partial): Row rules
  - No nearmiss rows
  - Single-member groups: founding only (no consensus)
- Sorting: Type order (Individual, AggregateHousehold, LegalConstruct, Business), then member count descending
- Bug fix: Address comparison was using raw VA-tagged strings; fixed to use `formatFullAddress()` for consistency

## Related Files

- `scripts/entityGroupBrowser.js` - Main implementation
- `scripts/matching/universalEntityMatcher.js` - `universalCompareTo()` used for contactInfo/name comparison
- `scripts/unifiedEntityBrowser.js` - `MATCH_CRITERIA` thresholds
- `archive/reference_docs_2025/reference_csvExportSpecification.md` - Original 54-column CSV spec
