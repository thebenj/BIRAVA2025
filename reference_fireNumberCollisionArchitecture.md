# Fire Number / PID Collision Architecture - Complete Reference

**Created**: January 24, 2026
**Purpose**: Comprehensive documentation of all systems that identify, record, and react to PID/fire number collisions

---

## 1. THE PROBLEM DOMAIN

### Fire Number vs PID Relationship
- **Fire Number** = building/location identifier (assigned by fire department)
- **PID** = individual parcel identifier (tax system)
- **NOT 1:1** — 17+ fire numbers map to multiple PIDs
- Multiple PIDs at same fire number can be:
  - **Same owner** (owns multiple parcels at same property)
  - **Different owners** (condos, subdivisions)

### Example: Fire Number 72
Fire number 72 has 33+ entity keys representing different owners at the same physical location (condos at 72 West Side Road). These become: 72, 72A, 72B, 72C... through 72AF.

---

## 2. SYSTEMS THAT IDENTIFY & RECORD COLLISIONS

### A. Fire Number Collision Handler (In-Memory Registry)

**File:** `scripts/dataSources/fireNumberCollisionHandler.js`

**When:** During VA entity creation (button b: "Create Entities from Processed Data")

**Flow:**
```
For each VA record:
  1. Extract fire number from propertyLocation
  2. Is this fire number already used?
     NO  → REGISTER (first use)
     YES → COLLISION DETECTED
           → Compare with existing entity(ies)
           → Same owner?
              YES → MERGE (add PID to otherInfo.subdivision)
              NO  → CREATE_WITH_SUFFIX (72 → 72A, 72B, etc.)
```

**Same-Owner Detection Thresholds:**
- Overall similarity > 92% OR
- Name similarity > 95% OR
- ContactInfo (secondary only) > 95%

**Key Functions:**
| Function | Purpose |
|----------|---------|
| `initializeRegistry()` | Clears at start of processing |
| `isFireNumberUsed(fireNumber)` | Checks registry |
| `handleFireNumberCollision(newEntity, fireNumber)` | Main decision point |
| `compareForFireNumberCollision()` | Uses compareSecondaryAddressesOnly() |
| `getNextAvailableSuffix()` | Returns A, B, C... AA, AB, etc. |
| `getAllEntitiesForFireNumber()` | Gets all entities at a base fire number |

### B. Fire Number Collision Database (Persistent Storage)

**File:** `scripts/fireNumberCollisionDatabase.js`

**When:** Also during VA entity creation, triggered when collisions detected

**Purpose:** Persist collision data to Google Drive for later use by matching system

**Google Drive File ID:** `1exdeASVuntM6b_nyJUNUO0_EqRX8Jjz0`

**Data Structure:**
```javascript
fireNumberCollisionDatabase = {
  byFireNumber: Map<fireNumber, {
    fireNumber: "72",
    entityKeys: ["visionAppraisal:FireNumber:72", "visionAppraisal:FireNumber:72A", ...],
    pids: ["183948", "183949", ...],
    lastUpdated: ISO timestamp,
    manuallyAdded: boolean
  }>,
  byEntityKey: Map<entityKey, fireNumber>,  // reverse lookup
  metadata: {
    loaded: boolean,
    initializationMode: string,
    hasUnsavedChanges: boolean
  }
}
```

**Key Functions:**
| Function | Purpose |
|----------|---------|
| `promptFireNumberCollisionDatabaseMode()` | Shows initialization dialog |
| `initializeFireNumberCollisionDatabase(mode)` | Initialize with REINITIALIZE/CLEAR_KEYS/INCREMENTAL |
| `registerFireNumberCollision(fireNumber, entityKeys, pids)` | Add/update collision record |
| `getCollisionByFireNumber(fireNumber)` | Lookup by fire number |
| `getFireNumberForEntityKey(entityKey)` | Reverse lookup |
| `isEntityInCollision(entityKey)` | Check if entity is in a collision |
| `saveFireNumberCollisionDatabaseToFile()` | Save to Google Drive |
| `loadFireNumberCollisionDatabaseFromFile()` | Load from Google Drive |

**Initialization Modes:**
| Mode | Action |
|------|--------|
| REINITIALIZE | Clear all data, repopulate from scratch |
| CLEAR_KEYS | Keep fire number records, clear entityKeys/pids arrays |
| INCREMENTAL | Keep existing data, only add new keys not already present |

---

## 3. DATA STRUCTURES CREATED BY COLLISION HANDLING

### A. Suffixed Fire Numbers (Different Owners)
When different owners detected at same fire number:
- First entity: `visionAppraisal:FireNumber:72`
- Second entity: `visionAppraisal:FireNumber:72A`
- Third entity: `visionAppraisal:FireNumber:72B`
- etc.

### B. Subdivision Property (Same Owner)
When same owner detected, merged PIDs stored in `otherInfo.subdivision`:
```javascript
entity.otherInfo.subdivision = {
  "183949": { /* serialized entity data */ },
  "183950": { /* serialized entity data */ }
}
```

---

## 4. SYSTEMS THAT REACT TO COLLISION STRUCTURES

### A. areSameLocationEntities() Detection

**File:** `scripts/utils.js` ~line 2580

**Purpose:** Detect when two entities are at the same physical location (different owners at same property)

**Detection Logic:**
```javascript
function areSameLocationEntities(entity1, entity2) {
  // Both must have fire numbers
  // Fire numbers must share same BASE but have different FULL values
  // e.g., 72J vs 72W → same base (72), different full → TRUE
  // e.g., 72 vs 100 → different base → FALSE
}
```

**Limitation:** Only detects SUFFIXED fire numbers. Does NOT detect when comparing against an entity with base fire number (72 vs 72A returns FALSE).

### B. Same-Location Handling in universalCompareTo()

**File:** `scripts/matching/universalEntityMatcher.js`

**The Fix (implemented December 2025):**
```javascript
function universalCompareTo(entity1, entity2) {
  // Check FIRST, BEFORE routing to specialized comparisons
  if (areSameLocationEntities(entity1, entity2)) {
    // Use compareSecondaryAddressesOnly() for contactInfo
    // This prevents false matches on primary address (which would be 1.0)
    return compareSameLocationEntities(entity1, entity2);
  }

  // Normal routing to specialized functions...
}
```

**Why This Matters:**
- Without this fix: 72A and 72B entities have contactInfo=1.0 (same primary address) → incorrectly grouped
- With this fix: contactInfo uses secondary addresses only → different owners stay separate

### C. compareSecondaryAddressesOnly()

**File:** `scripts/utils.js`

**Called When:**
1. During fire number collision resolution (same owner detection)
2. During entity matching when `areSameLocationEntities()` returns true

**Behavior:**
- Ignores primary addresses entirely
- Only compares secondary addresses
- If neither has secondary addresses → returns 0

---

## 5. THE GAP: Collision Database NOT YET INTEGRATED INTO MATCHING

The collision database captures which fire numbers have collisions, but **the matching system doesn't query it yet**.

### Current State
- `areSameLocationEntities()` only detects suffixed fire numbers (72A vs 72B)
- It does NOT detect when both entities are at a fire number with KNOWN collisions
- The collision database knows "fire number 72 has 33 entities" but this info isn't used during matching

### Intended Future Use
From the collision database documentation:
1. Identify entities at known collision fire numbers
2. Prevent false groupings between entities at same physical location but different owners
3. Use the entity keys to apply special handling during matching

### Integration Points to Consider
1. **Bloomerang entities with unsuffixed fire numbers** — A Bloomerang entity with fire number "72" should be recognized as being at a collision fire number
2. **Enhanced areSameLocationEntities()** — Could query collision database to detect collision situations beyond just suffix comparison
3. **Match criteria adjustment** — Entities at collision fire numbers might need different thresholds

---

## 6. VISUAL FLOW DIAGRAM

```
VA PROCESSING (fireNumberCollisionHandler.js)
                    │
                    ▼
         ┌──────────────────────┐
         │ Fire Number Collision│
         │      Detection       │
         └──────────┬───────────┘
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
    Same Owner?          Different Owner?
          │                   │
          ▼                   ▼
    MERGE into          CREATE_WITH_SUFFIX
    existing entity     (72 → 72A, 72B)
    (subdivision)             │
          │                   │
          └───────┬───────────┘
                  ▼
         ┌──────────────────────┐
         │ Collision Database   │───────────┐
         │ (records all keys)   │           │
         └──────────────────────┘           │
                                            │ NOT YET
                                            │ CONNECTED
                                            ▼
ENTITY MATCHING (universalEntityMatcher.js)
                    │
                    ▼
         ┌──────────────────────┐
         │ areSameLocationEntities() │
         │ (checks for suffixed     │
         │  fire numbers only)      │
         └──────────┬───────────┘
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
    Same Location?       Normal Comparison
    (72A vs 72B)              │
          │                   │
          ▼                   ▼
    compareSecondary     Standard contactInfo
    AddressesOnly()      comparison
```

---

## 7. CODE LOCATIONS

| Component | File | Key Lines/Functions |
|-----------|------|---------------------|
| Collision Handler | scripts/dataSources/fireNumberCollisionHandler.js | handleFireNumberCollision() ~456 |
| Collision Database | scripts/fireNumberCollisionDatabase.js | registerFireNumberCollision() ~332 |
| Collision Browser | scripts/fireNumberCollisionBrowser.js | UI for viewing/editing |
| Same-Location Detection | scripts/utils.js | areSameLocationEntities() ~2580 |
| Secondary Address Compare | scripts/utils.js | compareSecondaryAddressesOnly() |
| Entity Matching | scripts/matching/universalEntityMatcher.js | universalCompareTo() |
| VA Processing | scripts/dataSources/processAllVisionAppraisalRecords.js | Calls handleFireNumberCollision ~183 |

---

## 8. RELATED DOCUMENTATION

| Document | Purpose |
|----------|---------|
| reference_fireNumberCollisionDatabase.md | Implementation details for persistent database |
| reference_sameLocationFix.md (archived) | Original fix for same-location entity comparison |
| reference_fireNumberCollisionPlan.md (archived) | Original collision handler design |
| reference_systemDocumentation.md Section 1.3 | Fire Number / PID relationship overview |

---

## 9. COLLISION DATABASE MATCHING INTEGRATION PLAN

### 9.1 Specification

**Definition - Fire Number Collision Address:**
An address is a "fire number collision address" when ALL of these are true:
- It is a Block Island address
- It has a fire number
- That fire number exists in the fire number collision database

### 9.2 Address Comparison Cases

| Case | Condition | Action |
|------|-----------|--------|
| **a** | Neither address is a collision address | No change to existing behavior |
| **b** | One is a collision address, other is not | No change to existing behavior |
| **c** | Both are collision addresses, different fire numbers | No change to existing behavior |
| **d** | Both are VA entities, both primary addresses are collision addresses with SAME fire number | Treat as EXCLUDED (do not group) |
| **e** | Not any other case, but both addresses are collision addresses with SAME fire number | Calculate address similarity with blank fire numbers (temporary, don't modify records) |

### 9.3 Case d) Rationale

When two VisionAppraisal entities both have their primary/location address at a collision fire number AND they share the same fire number:
- Their relationship was already assessed during collision detection (fireNumberCollisionHandler.js)
- They were either MERGED (same owner) or given SUFFIXES (different owners)
- If they exist as separate entities now, they are DIFFERENT OWNERS and should NOT be grouped
- Implementation: Treat this as an implicit FORCE_EXCLUDE (like exclusion rules from spreadsheet)

### 9.4 Case e) Rationale

For all other situations where both addresses are collision addresses with the same fire number:
- Could be Bloomerang vs Bloomerang, Bloomerang vs VA, or secondary address comparisons
- The fire number alone shouldn't drive matching (it's a known collision point)
- Implementation: Compare addresses as if fire numbers were blank (don't let fire number similarity inflate the score)

---

## 10. IMPLEMENTATION STEPS

### Step 1: Create isFireNumberCollisionAddress() Helper

**File:** `scripts/fireNumberCollisionDatabase.js`

**Function:**
```javascript
function isFireNumberCollisionAddress(address) {
    // Returns true if:
    // 1. address.isBlockIslandAddress is true
    // 2. address has a fire number (address.fireNumber or address.hasFireNumber)
    // 3. That fire number exists in fireNumberCollisionDatabase.byFireNumber
}
```

**Test:**
- Call with address at fire number 72 → should return true
- Call with address at fire number 500 (not in collision DB) → should return false
- Call with non-Block Island address → should return false

---

### Step 2: Create getAddressFireNumber() Helper

**File:** `scripts/fireNumberCollisionDatabase.js`

**Function:**
```javascript
function getAddressFireNumber(address) {
    // Extract fire number from address
    // Handle both suffixed (72A) and base (72) fire numbers
    // Return the BASE fire number (strip suffix) for collision lookup
}
```

**Test:**
- Address with fireNumber "72A" → returns "72"
- Address with fireNumber "72" → returns "72"

---

### Step 3: Create detectCollisionCase() Function

**File:** `scripts/fireNumberCollisionDatabase.js`

**Function:**
```javascript
function detectCollisionCase(address1, address2, entity1, entity2) {
    // Returns: 'a', 'b', 'c', 'd', or 'e'

    const isCollision1 = isFireNumberCollisionAddress(address1);
    const isCollision2 = isFireNumberCollisionAddress(address2);

    // Case a: Neither is collision address
    if (!isCollision1 && !isCollision2) return 'a';

    // Case b: Only one is collision address
    if (!isCollision1 || !isCollision2) return 'b';

    // Both are collision addresses - check fire numbers
    const fn1 = getAddressFireNumber(address1);
    const fn2 = getAddressFireNumber(address2);

    // Case c: Different fire numbers
    if (fn1 !== fn2) return 'c';

    // Same fire number - check for case d
    // Case d: Both VA entities with primary addresses at same collision fire number
    const isVA1 = entity1?.source === 'VisionAppraisal';
    const isVA2 = entity2?.source === 'VisionAppraisal';
    const isPrimary1 = /* check if address1 is entity1's primary address */;
    const isPrimary2 = /* check if address2 is entity2's primary address */;

    if (isVA1 && isVA2 && isPrimary1 && isPrimary2) return 'd';

    // Case e: All other cases with same collision fire number
    return 'e';
}
```

**Test:**
- Two VA entities at 72A and 72B (primary addresses) → 'd'
- VA entity at 72 vs Bloomerang at 72 → 'e'
- Two addresses at 72 vs 100 (both collision) → 'c'
- Address at 72 vs address at 500 (not collision) → 'b'

---

### Step 4: Integrate Case d) into Entity Grouping

**File:** `scripts/matching/entityGroupBuilder.js` or `universalEntityMatcher.js`

**Location:** Where exclusion checks are performed

**Logic:**
```javascript
// When evaluating whether two entities should be grouped:
if (detectCollisionCase(primaryAddr1, primaryAddr2, entity1, entity2) === 'd') {
    // Treat as excluded - these entities should not be grouped
    return { excluded: true, reason: 'fire_number_collision_same_location' };
}
```

**Test:**
- Build EntityGroups with two VA entities at 72A and 72B → should NOT be grouped
- Verify existing exclusion behavior still works

---

### Step 5: Integrate Case e) into Address Comparison

**File:** `scripts/utils.js` or `scripts/objectStructure/contactInfo.js`

**Location:** Address.compareTo() or addressWeightedComparison()

**Logic:**
```javascript
// When comparing two addresses:
const collisionCase = detectCollisionCase(address1, address2, entity1, entity2);
if (collisionCase === 'e') {
    // Compare as if fire numbers were blank
    // Create temporary comparison context without fire number contribution
    return compareAddressesWithoutFireNumber(address1, address2);
}
```

**Test:**
- Compare two addresses at fire number 72 (case e) → fire number should not contribute to score
- Compare two addresses at different locations → normal comparison (fire number contributes)

---

### Step 6: Integration Testing

**Full Test Sequence:**
1. Load collision database from Google Drive
2. Build EntityGroup database with override rules
3. Verify:
   - VA entities at same collision fire number are NOT grouped (case d)
   - Bloomerang entity at collision fire number compared to VA doesn't get inflated score (case e)
   - Non-collision entities still match normally (cases a, b, c)
4. Compare group counts to baseline

---

## 11. IMPLEMENTATION STATUS

| Component | Status |
|-----------|--------|
| Fire Number Collision Handler | ✅ Working |
| Suffix Assignment (72A, 72B) | ✅ Working |
| Same-Owner Merge (subdivision) | ✅ Working |
| Collision Database Capture | ✅ Working |
| Collision Database Auto-Save | ✅ Working |
| Collision Browser UI | ✅ Working |
| areSameLocationEntities() | ✅ Working (suffixed only) |
| compareSecondaryAddressesOnly() | ✅ Working |
| **Step 1: isFireNumberCollisionAddress()** | ✅ Working |
| **Step 2: getAddressFireNumber()** | ✅ Working |
| **Step 3: detectCollisionCase()** | ✅ Working |
| **Step 4: Case d) exclusion integration** | ✅ Working |
| **Step 5: Case e) address comparison** | ✅ Working (sets streetNumSim=0 for collision addresses) |
| **Step 6: Integration testing** | ✅ USER VERIFIED WORKING |

### Step 6 User Verification Results (Session 56)

**Baseline Comparison Test:**
Compared current groups against baseline (1976 groups, Jan 9 2026) using `compareGroupings()`:

| Metric | Before Collision Fix | After Collision Fix |
|--------|---------------------|---------------------|
| New Merges | 798 pairs | 725 pairs |
| New Splits | N/A | 168 pairs |
| Fire# 72 collision merges | Dominant | **ELIMINATED** |

**Key Verification:** Fire number 72 collision cases are no longer being merged:
- `72B + bloomerang:1285:FireNumber:72` - NO LONGER MERGED ✅
- `72C + bloomerang:1121:FireNumber:72` - NO LONGER MERGED ✅
- `72E + bloomerang:1725:FireNumber:72` - NO LONGER MERGED ✅
- `72F + bloomerang:77:FireNumber:72` - NO LONGER MERGED ✅

**Diagnostic code cleanup:** Remove from:
- `entityGroup.js` (~lines 787, 817)
- `entityGroupBuilder.js` (~line 1099)

---

**Document Version**: 2.3
**Last Updated**: January 25, 2026 (Session 56 - USER VERIFIED)
