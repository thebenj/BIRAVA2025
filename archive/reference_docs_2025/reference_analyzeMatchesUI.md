# Analyze Matches UI Enhancement Reference Documentation

**Purpose**: Comprehensive documentation of the six-feature enhancement to the match analysis presentation in the Unified Entity Browser

**Status**: CODED_NOT_TESTED - Implementation complete, pending browser verification

**Last Updated**: December 6, 2025

**File Modified**: scripts/unifiedEntityBrowser.js

---

## **Feature Summary**

Six features implemented to enhance the "Analyze Matches" presentation:

| # | Feature | Status | Line Reference |
|---|---------|--------|----------------|
| 1 | View Details button on each row | Coded | Line 2448 |
| 2 | Complete name + one-line address display | Coded | Lines 2435-2441 |
| 3 | Top Matches summary section | Coded | Lines 2287-2288 |
| 4 | 98th percentile in filter row | Coded | Lines 2270-2282 |
| 5 | CSV export option | Coded | Lines 1742-1800, 2283 |
| 6 | "True Match?" checkbox placeholder | Coded | Lines 2442-2445 |

---

## **Implementation Details**

### **Feature 1: View Details Button**

**Purpose**: Allow viewing entity details exactly as the unified browser's View Details button

**Implementation**:
- Button in each match row: `<button class="view-btn" onclick="viewMatchEntityDetails('${match.targetSource}', '${match.targetKey}')">View</button>`
- Function `viewMatchEntityDetails(source, key)` at line 1715
- Uses `window.opener` pattern to access parent window's `workingLoadedEntities` and `EntityRenderer`

**Cross-Window Communication Pattern**:
```javascript
function viewMatchEntityDetails(source, key) {
    if (window.opener && window.opener.workingLoadedEntities) {
        const loaded = window.opener.workingLoadedEntities;
        let entity = null;
        // Navigate through source structure to find entity
        if (source === 'visionAppraisal') {
            entity = loaded.visionAppraisal?.entities?.[key];
        } else if (source === 'bloomerang') {
            // Check individuals, households, nonhuman
            entity = loaded.bloomerang?.individuals?.entities?.[key] ||
                     loaded.bloomerang?.households?.entities?.[key] ||
                     loaded.bloomerang?.nonhuman?.entities?.[key];
        }
        if (entity && window.opener.EntityRenderer) {
            window.opener.EntityRenderer.showEntityDetails(entity, key);
        }
    }
}
```

---

### **Feature 2: Complete Name and One-Line Address**

**Purpose**: Display entity name (3rd column) and address (4th column) in each match row

**New Helper Functions**:

#### `extractOneLineAddress(entity)` - Line 2152
Extracts a one-line address from entity's contactInfo.primaryAddress:
```javascript
function extractOneLineAddress(entity) {
    if (!entity) return '';
    const contactInfo = entity.contactInfo;
    if (!contactInfo) return '';
    const address = contactInfo.primaryAddress;
    if (!address) return '';

    const parts = [];
    // Handle AttributedTerm or string values
    const streetNum = address.streetNumber?.term || address.streetNumber || '';
    const streetName = address.streetName?.term || address.streetName || '';
    if (streetNum || streetName) {
        parts.push(`${streetNum} ${streetName}`.trim());
    }

    const city = address.city?.term || address.city || '';
    const state = address.state?.term || address.state || '';
    const zip = address.zipCode?.term || address.zipCode || '';
    if (city || state || zip) {
        let cityStateZip = city;
        if (state) cityStateZip += (cityStateZip ? ', ' : '') + state;
        if (zip) cityStateZip += ' ' + zip;
        parts.push(cityStateZip.trim());
    }

    let result = parts.join(', ');
    // Clean VisionAppraisal tags
    result = result.replace(/::#\^#::/g, ', ').replace(/:\^#\^:/g, ' ').replace(/\^#\^/g, ' ');
    result = result.replace(/\s+/g, ' ').trim();
    return result;
}
```

#### `getMatchEntityDisplayName(entity)` - Line 2191
Extracts display name from various entity/name structures:
```javascript
function getMatchEntityDisplayName(entity) {
    if (!entity) return '';

    // Try entity.name first (most common)
    const name = entity.name;
    if (name) {
        // IndividualName pattern
        if (name.completeName) return name.completeName;
        if (name.firstName || name.lastName) {
            const parts = [name.firstName, name.lastName].filter(p => p);
            return parts.join(' ');
        }
        // HouseholdName pattern
        if (name.householdName) return name.householdName;
        // AttributedTerm pattern
        if (name.term) return name.term;
        // SimpleIdentifiers pattern
        if (name.primaryAlias?.term) return name.primaryAlias.term;
        // String
        if (typeof name === 'string') return name;
    }

    // Fallback to contactInfo.name
    const contactName = entity.contactInfo?.name;
    if (contactName) {
        // Same extraction patterns...
    }

    return '';
}
```

**Grid Layout**: CSS Grid with 7 columns
```css
.match-row {
    display: grid;
    grid-template-columns: 70px 100px 1fr 1fr 120px auto auto;
    /* score-badge, source-badge, name, address, checkbox, reason(optional), actions */
    align-items: center;
    gap: 12px;
}
```

---

### **Feature 3: Top Matches Summary Section**

**Purpose**: Highlight top 2 matches from each entity type + top 6 overall not already included

**Implementation**: `generateTopMatchesSection(matchesByType, allMatches)` - Line 2348

**Algorithm**:
1. Collect top 2 from each entity type (Individual, AggregateHousehold, Business, LegalConstruct)
2. Track included keys in a Set to avoid duplicates
3. Sort ALL matches by score descending
4. Add up to 6 more top matches not already included
5. Generate styled section with orange gradient header

**Key Code**:
```javascript
function generateTopMatchesSection(matchesByType, allMatches) {
    const includedKeys = new Set();
    const topMatches = [];

    // Get top 2 from each type
    for (const [type, typeData] of Object.entries(matchesByType)) {
        const matches = typeData?.bestMatches || [];
        const top2 = matches.slice(0, 2);
        top2.forEach(match => {
            const key = `${match.targetSource}_${match.targetKey}`;
            if (!includedKeys.has(key)) {
                includedKeys.add(key);
                topMatches.push({ ...match, type, selectionReason: `Top from ${type}` });
            }
        });
    }

    // Add top 6 overall not already included
    const sortedAll = [...allMatches].sort((a, b) => (b.score || 0) - (a.score || 0));
    let addedFromOverall = 0;
    for (const match of sortedAll) {
        if (addedFromOverall >= 6) break;
        const key = `${match.targetSource}_${match.targetKey}`;
        if (!includedKeys.has(key)) {
            includedKeys.add(key);
            topMatches.push({ ...match, selectionReason: 'Top Overall' });
            addedFromOverall++;
        }
    }
    // ... generate HTML
}
```

**Styling**:
```css
.top-matches-section {
    border: 2px solid #f39c12;
    margin-bottom: 20px;
}
.top-matches-header {
    background: linear-gradient(135deg, #f39c12, #e67e22);
}
```

---

### **Feature 4: 98th Percentile Display**

**Purpose**: Show overall 98th percentile score in the filter row for reference

**Implementation**:
- `calculateOverall98thPercentile(matchesByType)` - Line 2320
- Displayed in filter section at line 2282

**Algorithm**:
```javascript
function calculateOverall98thPercentile(matchesByType) {
    const allScores = [];
    for (const [type, typeData] of Object.entries(matchesByType)) {
        const matches = typeData?.bestMatches || [];
        matches.forEach(match => {
            if (typeof match.score === 'number') {
                allScores.push(match.score);
            }
        });
    }
    if (allScores.length === 0) return 0;
    allScores.sort((a, b) => a - b);
    const percentileIndex = Math.floor(allScores.length * 0.98);
    return allScores[Math.min(percentileIndex, allScores.length - 1)] || 0;
}
```

**Display HTML**:
```html
<span class="percentile-display">98th Percentile: ${(overall98thPercentile * 100).toFixed(1)}%</span>
```

---

### **Feature 5: CSV Export**

**Purpose**: Export all matches to CSV for spreadsheet analysis

**Implementation**:
- Button in filter section: `<button class="export-csv-btn" onclick="exportMatchesToCSV()">Export CSV</button>`
- `exportMatchesToCSV()` function at line 1742
- `serializeMatchResultsForWindow(results, baseEntityInfo)` prepares data - Line 2498

**CSV Columns**:
| Column | Description |
|--------|-------------|
| Type | Entity type (Individual, Business, etc.) |
| Score | Overall similarity score |
| Name Score | Name component similarity (if available) |
| Target Source | visionAppraisal or bloomerang |
| Target Key | Entity key |
| Entity Name | Display name from target entity |
| Entity Address | One-line address from target entity |
| True Match | Placeholder column (empty) |

**Key Code**:
```javascript
function exportMatchesToCSV() {
    const results = window._matchResults;
    const baseInfo = window._baseEntityInfo;

    let csv = 'Type,Score,Name Score,Target Source,Target Key,Entity Name,Entity Address,True Match\n';

    for (const [type, typeData] of Object.entries(results)) {
        const matches = typeData?.bestMatches || [];
        matches.forEach(match => {
            const nameScore = match.details?.components?.name?.similarity || '';
            const row = [
                type,
                (match.score || 0).toFixed(4),
                nameScore ? nameScore.toFixed(4) : '',
                match.targetSource || '',
                match.targetKey || '',
                escapeCSV(match.entityName || ''),
                escapeCSV(match.entityAddress || ''),
                '' // True Match placeholder
            ];
            csv += row.join(',') + '\n';
        });
    }

    // Download using Blob/URL pattern
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `match_analysis_${baseInfo?.entityKey || 'unknown'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
```

---

### **Feature 6: True Match Checkbox**

**Purpose**: Placeholder checkbox for future functionality to mark confirmed matches

**Implementation**: In `generateMatchRowHtml()` at lines 2442-2445

**HTML**:
```html
<label class="true-match-checkbox">
    <input type="checkbox" class="true-match-input" data-match-key="${match.targetKey}">
    True Match?
</label>
```

**Styling**:
```css
.true-match-checkbox {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    color: #666;
    cursor: pointer;
    white-space: nowrap;
}
.true-match-input {
    cursor: pointer;
}
```

**Future Integration Notes**:
- Checkbox state can be collected via: `document.querySelectorAll('.true-match-input:checked')`
- Each checkbox has `data-match-key` attribute for entity identification
- CSV export includes empty "True Match" column for manual population

---

## **CSS Styles Added**

All new styles added within the `generateUniversalMatcherResultsHtml` function's style block:

```css
/* 98th Percentile Display */
.percentile-display {
    margin-left: 15px;
    padding: 5px 12px;
    background: #e8f4f8;
    border-radius: 4px;
    font-weight: 600;
    color: #2c3e50;
}

/* Export Button */
.export-csv-btn {
    margin-left: 15px;
    padding: 5px 12px;
    background: #27ae60;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
}
.export-csv-btn:hover { background: #219a52; }

/* Top Matches Section */
.top-matches-section {
    border: 2px solid #f39c12;
    margin-bottom: 20px;
}
.top-matches-header {
    background: linear-gradient(135deg, #f39c12, #e67e22);
}

/* Match Row Grid Layout */
.match-row {
    padding: 12px 15px;
    border-bottom: 1px solid #eee;
    display: grid;
    grid-template-columns: 70px 100px 1fr 1fr 120px auto auto;
    align-items: center;
    gap: 12px;
}

/* Match Row Cells */
.match-source-badge {
    padding: 4px 8px;
    border-radius: 3px;
    font-size: 11px;
    background: #ecf0f1;
    text-align: center;
}

.match-name-cell {
    font-weight: 600;
    color: #2c3e50;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.match-address-cell {
    font-size: 12px;
    color: #666;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.match-address-cell .no-address {
    color: #999;
    font-style: italic;
}

/* Selection Reason Badge */
.selection-reason {
    padding: 3px 8px;
    background: #fff3cd;
    border-radius: 3px;
    font-size: 10px;
    color: #856404;
    white-space: nowrap;
}

/* Match Actions */
.match-actions {
    display: flex;
    gap: 8px;
}
```

---

## **Testing Instructions**

### Pre-Test Setup
1. **Refresh browser** to load updated code
2. **Load entities** - click "Load All Entities Into Memory" button
3. **Select an entity** in the unified entity browser
4. **Click "Analyze Matches"** button

### Feature Verification Checklist
- [ ] **View button**: Click should open entity details in parent window
- [ ] **Name display**: Entity name shown in 3rd column
- [ ] **Address display**: One-line address shown in 4th column (or "No address")
- [ ] **Top Matches section**: Orange-bordered section at top showing highlights
- [ ] **98th percentile**: Displayed in filter row next to filter buttons
- [ ] **Export CSV button**: Click should download CSV file
- [ ] **True Match checkbox**: Checkbox present in each row (5th column)

### Known CSS Note
There are two `.match-row` CSS definitions in the style block:
- Line 1964: `display: flex` (original)
- Line 2067: `display: grid` (new - should override due to CSS cascade)

If grid layout doesn't apply, may need to remove the earlier flex-based definition.

---

## **Data Flow**

```
User clicks "Analyze Matches"
    |
    v
analyzeSelectedEntityMatches()
    |
    v
findBestMatches(baseEntity, {...}) [universalEntityMatcher.js]
    |
    v
Returns: {bestMatchesByType: {...}, baseEntityInfo: {...}}
    |
    v
displayMatchAnalysisResults(results)
    |
    v
generateUniversalMatcherResultsHtml(results)
    |
    +-- calculateOverall98thPercentile()
    +-- generateTopMatchesSection()
    +-- generateMatchRowHtml() for each match
    |       +-- extractOneLineAddress()
    |       +-- getMatchEntityDisplayName()
    |
    v
New window opens with formatted HTML
    |
    v
Window has access to:
    - window._matchResults (serialized results)
    - window._baseEntityInfo (base entity info)
    - viewMatchEntityDetails() function
    - exportMatchesToCSV() function
    - filterByScore() function
```

---

## **VisionAppraisal Tag Cleaning**

Address extraction cleans VisionAppraisal-specific formatting tags:

| Tag | Replacement | Purpose |
|-----|-------------|---------|
| `::#^#::` | `, ` (comma space) | Address component separator |
| `:^#^:` | ` ` (space) | Word separator |
| `^#^` | ` ` (space) | Word separator |

---

## **Related Files**

| File | Purpose |
|------|---------|
| scripts/unifiedEntityBrowser.js | Main implementation file |
| scripts/matching/universalEntityMatcher.js | Match finding logic |
| scripts/entityRenderer.js | Entity details modal |

---

**Document Version**: 1.0
**Created**: December 6, 2025
