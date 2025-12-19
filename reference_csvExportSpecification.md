# EntityGroup CSV Export Specification

**Created**: December 18, 2025
**Purpose**: Define the format for exporting EntityGroup data to CSV for data quality review and mail merge list generation

---

## Overview

### Output Files
- **prospects.csv**: EntityGroups where `isProspect === true`
- **donors.csv**: EntityGroups where `isExistingDonor === true`

### Row Structure per EntityGroup
Each EntityGroup produces multiple rows in sequence:
1. `consensus` - Synthesized best information from all members
2. `founding` - The founding member entity
3. `member` - Other member entities (0 or more rows)
4. `nearmiss` - Near miss entities (0 or more rows, parameterized toggle)

### Design Principles
- **Field alignment**: All rows have identical column structure for easy viewing in spreadsheets
- **Mail merge optimization**: Core mailing fields grouped early in columns
- **Data quality review**: Alternatives columns at end for reviewing variations
- **Near miss toggle**: Parameterized for easy on/off switching

---

## Complete Column Layout

### Section 1: Identification & Mail Merge Core (10 columns)
| # | Column | Description |
|---|--------|-------------|
| 1 | RowType | `consensus`, `founding`, `member`, or `nearmiss` |
| 2 | GroupIndex | Group number (consensus and founding only, empty for member/nearmiss) |
| 3 | Key | Database key (empty for consensus, populated for all others) |
| 4 | MailName | Assembled name for mailing |
| 5 | MailAddr1 | Primary address line 1 (street) |
| 6 | MailAddr2 | Primary address line 2 (unit/apt) |
| 7 | MailCity | City |
| 8 | MailState | State |
| 9 | MailZip | Zip code |
| 10 | Email | Primary email address |

### Section 2: Additional Contact Info (6 columns)
| # | Column | Description |
|---|--------|-------------|
| 11 | Phone | Phone number |
| 12 | POBox | PO Box if present |
| 13 | SecAddr1 | Secondary address 1 (full address string) |
| 14 | SecAddr2 | Secondary address 2 |
| 15 | SecAddr3 | Secondary address 3 |
| 16 | SecAddrMore | Pipe-delimited remaining secondary addresses |

### Section 3: Entity Metadata (2 columns)
| # | Column | Description |
|---|--------|-------------|
| 17 | EntityType | Individual, AggregateHousehold, Business, LegalConstruct |
| 18 | Source | visionAppraisal, bloomerang, both, or "consensus" for consensus row |

### Section 4: Name Alternatives (12 columns)
| # | Column | Description |
|---|--------|-------------|
| 19 | NameHom1 | Name homonym 1 |
| 20 | NameHom2 | Name homonym 2 |
| 21 | NameHom3 | Name homonym 3 |
| 22 | NameHomMore | Pipe-delimited remaining name homonyms |
| 23 | NameSyn1 | Name synonym 1 |
| 24 | NameSyn2 | Name synonym 2 |
| 25 | NameSyn3 | Name synonym 3 |
| 26 | NameSynMore | Pipe-delimited remaining name synonyms |
| 27 | NameCand1 | Name candidate 1 |
| 28 | NameCand2 | Name candidate 2 |
| 29 | NameCand3 | Name candidate 3 |
| 30 | NameCandMore | Pipe-delimited remaining name candidates |

### Section 5: Address Alternatives (12 columns)
| # | Column | Description |
|---|--------|-------------|
| 31 | AddrHom1 | Address homonym 1 |
| 32 | AddrHom2 | Address homonym 2 |
| 33 | AddrHom3 | Address homonym 3 |
| 34 | AddrHomMore | Pipe-delimited remaining address homonyms |
| 35 | AddrSyn1 | Address synonym 1 |
| 36 | AddrSyn2 | Address synonym 2 |
| 37 | AddrSyn3 | Address synonym 3 |
| 38 | AddrSynMore | Pipe-delimited remaining address synonyms |
| 39 | AddrCand1 | Address candidate 1 |
| 40 | AddrCand2 | Address candidate 2 |
| 41 | AddrCand3 | Address candidate 3 |
| 42 | AddrCandMore | Pipe-delimited remaining address candidates |

### Section 6: Email Alternatives (12 columns)
| # | Column | Description |
|---|--------|-------------|
| 43 | EmailHom1 | Email homonym 1 |
| 44 | EmailHom2 | Email homonym 2 |
| 45 | EmailHom3 | Email homonym 3 |
| 46 | EmailHomMore | Pipe-delimited remaining email homonyms |
| 47 | EmailSyn1 | Email synonym 1 |
| 48 | EmailSyn2 | Email synonym 2 |
| 49 | EmailSyn3 | Email synonym 3 |
| 50 | EmailSynMore | Pipe-delimited remaining email synonyms |
| 51 | EmailCand1 | Email candidate 1 |
| 52 | EmailCand2 | Email candidate 2 |
| 53 | EmailCand3 | Email candidate 3 |
| 54 | EmailCandMore | Pipe-delimited remaining email candidates |

**Total: 54 columns**

---

## Row Population Rules

### Field Population by Row Type

| Field | consensus | founding | member | nearmiss |
|-------|-----------|----------|--------|----------|
| RowType | "consensus" | "founding" | "member" | "nearmiss" |
| GroupIndex | group index | group index | empty | empty |
| Key | empty | entity key | entity key | entity key |
| Mail fields | from consensus entity | from entity | from entity | from entity |
| SecAddr 1-3 | deduplicated list | entity's list (first 3) | entity's list (first 3) | entity's list (first 3) |
| SecAddrMore | pipe-delimited overflow | pipe-delimited overflow | pipe-delimited overflow | pipe-delimited overflow |
| EntityType | consensus type | entity type | entity type | entity type |
| Source | "consensus" | entity source | entity source | entity source |
| All alternatives | populated | empty | empty | empty |

### Name Assembly Rules
- **Individual**: `firstName lastName` (fall back to `completeName` if parts unavailable)
- **AggregateHousehold**: Household name term
- **Business**: NonHumanName term (no assembly)
- **LegalConstruct**: NonHumanName term (no assembly)

### Secondary Address Handling
- **Consensus row**: Shows deduplicated secondary addresses from consensus building
- **Other rows**: Shows entity's own secondary addresses
- **Format**: First 3 in separate columns, remaining pipe-delimited in "More" column

### Alternatives Handling
- **Consensus row only**: Populated from consensus entity's Aliased objects
- **Other rows**: Columns present but empty (maintains alignment)
- **Format**: First 3 in separate columns, remaining pipe-delimited in "More" column

---

## Function Signature

```javascript
exportEntityGroupsToCSV(groupDatabase, options = {})
```

### Options Object
```javascript
{
  includeNearMisses: true,    // Include nearmiss rows (default: true for data quality review)
  prospectsFileId: null,      // Google Drive file ID for prospects (null = create new file)
  donorsFileId: null          // Google Drive file ID for donors (null = create new file)
}
```

### Return Value
```javascript
{
  prospectsFileId: string,    // Google Drive file ID for prospects CSV
  donorsFileId: string,       // Google Drive file ID for donors CSV
  stats: {
    prospectGroups: number,
    prospectRows: number,
    donorGroups: number,
    donorRows: number
  }
}
```

---

## Example Output

```csv
RowType,GroupIndex,Key,MailName,MailAddr1,MailAddr2,MailCity,MailState,MailZip,Email,Phone,POBox,SecAddr1,SecAddr2,SecAddr3,SecAddrMore,EntityType,Source,NameHom1,NameHom2,NameHom3,NameHomMore,...
consensus,1,,John Smith,123 Main St,,Block Island,RI,02807,john@email.com,555-1234,,456 Oak Ave Block Island RI 02807,,,Individual,consensus,Jon Smith,J Smith,Johnny Smith,John A Smith|John B Smith,...
founding,1,visionAppraisal:FireNumber:1234,John Smith,123 Main St,,Block Island,RI,02807,john@email.com,555-1234,,456 Oak Ave Block Island RI 02807,,,Individual,visionAppraisal,,,,,...
member,,bloomerang:5678:...,Jon Smith,123 Main Street,,Block Island,RI,02807,jon@email.com,,,789 Pine St Block Island RI 02807,,,Individual,bloomerang,,,,,...
nearmiss,,visionAppraisal:FireNumber:9999,Jane Smith,123 Main St,,Block Island,RI,02807,jane@email.com,555-5678,,,,,,Individual,visionAppraisal,,,,,...
consensus,2,,Acme Corporation,500 Business Park Dr,Suite 100,Providence,RI,02903,info@acme.com,401-555-0000,,,,,Business,consensus,Acme Corp,ACME Inc,,,...
founding,2,bloomerang:1111:...,Acme Corporation,500 Business Park Dr,Suite 100,Providence,RI,02903,info@acme.com,401-555-0000,,,,,Business,bloomerang,,,,,...
```

---

## Implementation Notes

### Location
Function should be added to: `scripts/entityGroupBrowser.js` (alongside existing export functionality)

### Dependencies
- EntityGroupDatabase with populated consensus entities
- Google Drive API for file creation/update
- Existing CSV generation utilities

### UI Integration
- Add "Export to CSV" button in EntityGroup Browser
- Options dialog for:
  - Include near misses checkbox
  - File ID inputs for updating existing files vs creating new

---

**Document Version**: 1.0
**Status**: SPECIFICATION_COMPLETE
