# AttributedTerm Constructor Fix - Change Patterns Log

## Overview
This file documents all the find/replace patterns used to fix AttributedTerm constructor calls from 2-parameter to 4-parameter format throughout visionAppraisalNameParser.js.

**Target Pattern**: `new AttributedTerm(term, 'VISION_APPRAISAL', index, record.pid)`

## Method Signature Updates

### 1. Main Method Signatures
```javascript
// Pattern: Add index parameter to main parsing methods
OLD: parseRecordToEntity(record) {
NEW: parseRecordToEntity(record, index) {

OLD: routeToParser(detectedCase, record) {
NEW: routeToParser(detectedCase, record, index) {

OLD: parseIndividualCase(detectedCase, ownerName, record) {
NEW: parseIndividualCase(detectedCase, ownerName, record, index) {

OLD: parseHouseholdCase(detectedCase, ownerName, record) {
NEW: parseHouseholdCase(detectedCase, ownerName, record, index) {

OLD: parseBusinessCase(detectedCase, ownerName, record) {
NEW: parseBusinessCase(detectedCase, ownerName, record, index) {

OLD: parseCase32HouseholdName(ownerName, record) {
NEW: parseCase32HouseholdName(ownerName, record, index) {

OLD: parseCase33IndividualName(ownerName, record) {
NEW: parseCase33IndividualName(ownerName, record, index) {
```

### 2. Individual Case Method Signatures
```javascript
// Pattern: Add index parameter to all parseCase methods
OLD: parseCase1(words, record) {
NEW: parseCase1(words, record, index) {

OLD: parseCase3(words, record) {
NEW: parseCase3(words, record, index) {

OLD: parseCase8(words, record) {
NEW: parseCase8(words, record, index) {

OLD: parseCase9(words, record) {
NEW: parseCase9(words, record, index) {

OLD: parseCase10(words, record) {
NEW: parseCase10(words, record, index) {

OLD: parseCase18(words, record) {
NEW: parseCase18(words, record, index) {

OLD: parseCase5(words, record) {
NEW: parseCase5(words, record, index) {

OLD: parseCase15a(words, record) {
NEW: parseCase15a(words, record, index) {

OLD: parseCase15b(words, record) {
NEW: parseCase15b(words, record, index) {

OLD: parseCase16(words, record) {
NEW: parseCase16(words, record, index) {

OLD: parseCase17(words, record) {
NEW: parseCase17(words, record, index) {

OLD: parseCase25(words, record) {
NEW: parseCase25(words, record, index) {

OLD: parseCase26(words, record) {
NEW: parseCase26(words, record, index) {

OLD: parseCase27(words, record) {
NEW: parseCase27(words, record, index) {

OLD: parseCase28(words, record) {
NEW: parseCase28(words, record, index) {

OLD: parseCase29(words, record) {
NEW: parseCase29(words, record, index) {

OLD: parseCase30(words, record) {
NEW: parseCase30(words, record, index) {

OLD: parseCase0(ownerName, record) {
NEW: parseCase0(ownerName, record, index) {

OLD: parseCase4(ownerName, record) {
NEW: parseCase4(ownerName, record, index) {

OLD: parseCase4N(ownerName, record) {
NEW: parseCase4N(ownerName, record, index) {

OLD: parseCase7(ownerName, record) {
NEW: parseCase7(ownerName, record, index) {

OLD: parseCase11(ownerName, record) {
NEW: parseCase11(ownerName, record, index) {

OLD: parseCase13(ownerName, record) {
NEW: parseCase13(ownerName, record, index) {

OLD: parseCase14(ownerName, record) {
NEW: parseCase14(ownerName, record, index) {

OLD: parseCase19(ownerName, record) {
NEW: parseCase19(ownerName, record, index) {

OLD: parseCase20(ownerName, record) {
NEW: parseCase20(ownerName, record, index) {

OLD: parseCase20N(ownerName, record) {
NEW: parseCase20N(ownerName, record, index) {

OLD: parseCase21(ownerName, record) {
NEW: parseCase21(ownerName, record, index) {

OLD: parseCase21N(ownerName, record) {
NEW: parseCase21N(ownerName, record, index) {

OLD: parseCase22(ownerName, record) {
NEW: parseCase22(ownerName, record, index) {

OLD: parseCase23(ownerName, record) {
NEW: parseCase23(ownerName, record, index) {

OLD: parseCase24(ownerName, record) {
NEW: parseCase24(ownerName, record, index) {

OLD: parseCase31(ownerName, record) {
NEW: parseCase31(ownerName, record, index) {

OLD: parseCase34(ownerName, record) {
NEW: parseCase34(ownerName, record, index) {
```

### 3. Helper Method Signatures
```javascript
// Pattern: Add index parameter to helper methods
OLD: createIndividual(individualName, record) {
NEW: createIndividual(individualName, record, index) {

OLD: createAggregateHousehold(householdName, individuals, record) {
NEW: createAggregateHousehold(householdName, individuals, record, index) {

OLD: createNonHuman(businessName, record) {
NEW: createNonHuman(businessName, record, index) {

OLD: createBusiness(businessName, record) {
NEW: createBusiness(businessName, record, index) {

OLD: createLegalConstruct(businessName, record) {
NEW: createLegalConstruct(businessName, record, index) {
```

## Method Call Updates

### 1. Main Method Calls
```javascript
// Pattern: Add index parameter to main method calls
OLD: this.parseRecordToEntity(record);
NEW: this.parseRecordToEntity(record, -1); // Test case, no index

OLD: this.parseRecordToEntity(record);
NEW: this.parseRecordToEntity(record, i); // Production call with loop index

OLD: this.routeToParser(detectedCase, record);
NEW: this.routeToParser(detectedCase, record, index);
```

### 2. Routing Method Calls
```javascript
// Pattern: Add index parameter to routing calls
OLD: this.parseIndividualCase(detectedCase, ownerName, record);
NEW: this.parseIndividualCase(detectedCase, ownerName, record, index);

OLD: this.parseHouseholdCase(detectedCase, ownerName, record);
NEW: this.parseHouseholdCase(detectedCase, ownerName, record, index);

OLD: this.parseBusinessCase(detectedCase, ownerName, record);
NEW: this.parseBusinessCase(detectedCase, ownerName, record, index);

OLD: this.parseCase32HouseholdName(ownerName, record);
NEW: this.parseCase32HouseholdName(ownerName, record, index);

OLD: this.parseCase33IndividualName(ownerName, record);
NEW: this.parseCase33IndividualName(ownerName, record, index);
```

### 3. Individual Case Method Calls
```javascript
// Pattern: Add index parameter to all case parsing calls
OLD: return this.parseCase1(words, record);
NEW: return this.parseCase1(words, record, index);

// Similar pattern applied to all parseCase1 through parseCase34 calls
// Each call had ", index" appended
```

### 4. Helper Method Calls - Individual Patterns
```javascript
// Pattern: Helper method calls with different parameter patterns
OLD: return this.createIndividual(individualName, record);
NEW: return this.createIndividual(individualName, record, index);

OLD: const individual = this.createIndividual(individualName, record);
NEW: const individual = this.createIndividual(individualName, record, index);

OLD: const individual1 = this.createIndividual(individual1Name, record);
NEW: const individual1 = this.createIndividual(individual1Name, record, index);

OLD: const individual2 = this.createIndividual(individual2Name, record);
NEW: const individual2 = this.createIndividual(individual2Name, record, index);

OLD: const individual1 = this.createIndividual(individualName1, record);
NEW: const individual1 = this.createIndividual(individualName1, record, index);

OLD: const individual2 = this.createIndividual(individualName2, record);
NEW: const individual2 = this.createIndividual(individualName2, record, index);

// All other createIndividual patterns with various variable names
OLD: this.createIndividual(individualName1, record);
NEW: this.createIndividual(individualName1, record, index);

OLD: this.createIndividual(individualName2, record);
NEW: this.createIndividual(individualName2, record, index);
```

### 5. Helper Method Calls - Household Patterns
```javascript
// Pattern: Household creation calls
OLD: return this.createAggregateHousehold(householdName, [individual], record);
NEW: return this.createAggregateHousehold(householdName, [individual], record, index);

OLD: return this.createAggregateHousehold(householdName, [individual1, individual2], record);
NEW: return this.createAggregateHousehold(householdName, [individual1, individual2], record, index);

OLD: return this.createAggregateHousehold(householdName, [], record);
NEW: return this.createAggregateHousehold(householdName, [], record, index);

OLD: return this.createAggregateHousehold(householdName, individuals, record);
NEW: return this.createAggregateHousehold(householdName, individuals, record, index);
```

### 6. Helper Method Calls - Business Patterns
```javascript
// Pattern: Business entity creation calls
OLD: this.createBusiness(businessName, record);
NEW: this.createBusiness(businessName, record, index);

OLD: this.createLegalConstruct(businessName, record);
NEW: this.createLegalConstruct(businessName, record, index);

OLD: this.createNonHuman(businessName, record);
NEW: this.createNonHuman(businessName, record, index);

OLD: this.createNonHuman(nonHumanName, record);
NEW: this.createNonHuman(nonHumanName, record, index);
```

## AttributedTerm Constructor Updates

### 1. Name AttributedTerm Patterns
```javascript
// Pattern: Name-related AttributedTerm constructors
OLD: new AttributedTerm(fullName, 'VISION_APPRAISAL'),
NEW: new AttributedTerm(fullName, 'VISION_APPRAISAL', index, record.pid),

OLD: new AttributedTerm(`${firstName1} ${sharedLastName}`, 'VISION_APPRAISAL'),
NEW: new AttributedTerm(`${firstName1} ${sharedLastName}`, 'VISION_APPRAISAL', index, record.pid),

OLD: new AttributedTerm(`${firstName2} ${sharedLastName}`, 'VISION_APPRAISAL'),
NEW: new AttributedTerm(`${firstName2} ${sharedLastName}`, 'VISION_APPRAISAL', index, record.pid),

OLD: new AttributedTerm(`${firstName1} ${lastName1}`, 'VISION_APPRAISAL'),
NEW: new AttributedTerm(`${firstName1} ${lastName1}`, 'VISION_APPRAISAL', index, record.pid),

OLD: new AttributedTerm(`${firstName2} ${lastName2}`, 'VISION_APPRAISAL'),
NEW: new AttributedTerm(`${firstName2} ${lastName2}`, 'VISION_APPRAISAL', index, record.pid),

OLD: new AttributedTerm(fullName1, 'VISION_APPRAISAL'),
NEW: new AttributedTerm(fullName1, 'VISION_APPRAISAL', index, record.pid),

OLD: new AttributedTerm(fullName2, 'VISION_APPRAISAL'),
NEW: new AttributedTerm(fullName2, 'VISION_APPRAISAL', index, record.pid),
```

### 2. Household Name Patterns
```javascript
// Pattern: Household name AttributedTerm constructors
OLD: const householdName = new AttributedTerm(fullName, 'VISION_APPRAISAL');
NEW: const householdName = new AttributedTerm(fullName, 'VISION_APPRAISAL', index, record.pid);

OLD: const householdName = new AttributedTerm(`${sharedLastName} HOUSEHOLD`, 'VISION_APPRAISAL');
NEW: const householdName = new AttributedTerm(`${sharedLastName} HOUSEHOLD`, 'VISION_APPRAISAL', index, record.pid);

OLD: const householdName = new AttributedTerm(`${lastName1}-${lastName2} HOUSEHOLD`, 'VISION_APPRAISAL');
NEW: const householdName = new AttributedTerm(`${lastName1}-${lastName2} HOUSEHOLD`, 'VISION_APPRAISAL', index, record.pid);

OLD: const householdName = new AttributedTerm(ownerName, 'VISION_APPRAISAL');
NEW: const householdName = new AttributedTerm(ownerName, 'VISION_APPRAISAL', index, record.pid);

OLD: const householdName = new AttributedTerm(ownerName, 'VISION_APPRAISAL');
NEW: const householdName = new AttributedTerm(ownerName, 'VISION_APPRAISAL', index, record.pid);
```

### 3. Business Name Patterns
```javascript
// Pattern: Business name AttributedTerm constructors
OLD: const businessName = new AttributedTerm(ownerName.trim(), 'VISION_APPRAISAL');
NEW: const businessName = new AttributedTerm(ownerName.trim(), 'VISION_APPRAISAL', index, record.pid);

OLD: const businessName = new AttributedTerm(cleanedName, 'VISION_APPRAISAL');
NEW: const businessName = new AttributedTerm(cleanedName, 'VISION_APPRAISAL', index, record.pid);

OLD: const businessName = new AttributedTerm(ownerName, 'VISION_APPRAISAL');
NEW: const businessName = new AttributedTerm(ownerName, 'VISION_APPRAISAL', index, record.pid);

OLD: const nonHumanName = new AttributedTerm(ownerName.trim(), 'VISION_APPRAISAL');
NEW: const nonHumanName = new AttributedTerm(ownerName.trim(), 'VISION_APPRAISAL', index, record.pid);
```

### 4. Variable Assignment Patterns
```javascript
// Pattern: Direct variable assignment with AttributedTerm
OLD: new AttributedTerm(ownerName, 'VISION_APPRAISAL'),
NEW: new AttributedTerm(ownerName, 'VISION_APPRAISAL', index, record.pid),
```

### 5. Property AttributedTerm Patterns (in Helper Methods)
```javascript
// Pattern: Property-related AttributedTerm constructors in createXXX methods
OLD: individual.propertyLocation = new AttributedTerm(record.propertyLocation || '', 'VISION_APPRAISAL');
NEW: individual.propertyLocation = new AttributedTerm(record.propertyLocation || '', 'VISION_APPRAISAL', index, record.pid);

OLD: individual.ownerAddress = new AttributedTerm(record.ownerAddress || '', 'VISION_APPRAISAL');
NEW: individual.ownerAddress = new AttributedTerm(record.ownerAddress || '', 'VISION_APPRAISAL', index, record.pid);

OLD: individual.mblu = new AttributedTerm(record.mblu || '', 'VISION_APPRAISAL');
NEW: individual.mblu = new AttributedTerm(record.mblu || '', 'VISION_APPRAISAL', index, record.pid);

OLD: household.propertyLocation = new AttributedTerm(record.propertyLocation || '', 'VISION_APPRAISAL');
NEW: household.propertyLocation = new AttributedTerm(record.propertyLocation || '', 'VISION_APPRAISAL', index, record.pid);

OLD: household.ownerAddress = new AttributedTerm(record.ownerAddress || '', 'VISION_APPRAISAL');
NEW: household.ownerAddress = new AttributedTerm(record.ownerAddress || '', 'VISION_APPRAISAL', index, record.pid);

OLD: household.mblu = new AttributedTerm(record.mblu || '', 'VISION_APPRAISAL');
NEW: household.mblu = new AttributedTerm(record.mblu || '', 'VISION_APPRAISAL', index, record.pid);

OLD: nonHuman.propertyLocation = new AttributedTerm(record.propertyLocation || '', 'VISION_APPRAISAL');
NEW: nonHuman.propertyLocation = new AttributedTerm(record.propertyLocation || '', 'VISION_APPRAISAL', index, record.pid);

OLD: nonHuman.ownerAddress = new AttributedTerm(record.ownerAddress || '', 'VISION_APPRAISAL');
NEW: nonHuman.ownerAddress = new AttributedTerm(record.ownerAddress || '', 'VISION_APPRAISAL', index, record.pid);

OLD: nonHuman.mblu = new AttributedTerm(record.mblu || '', 'VISION_APPRAISAL');
NEW: nonHuman.mblu = new AttributedTerm(record.mblu || '', 'VISION_APPRAISAL', index, record.pid);

OLD: business.propertyLocation = new AttributedTerm(record.propertyLocation || '', 'VISION_APPRAISAL');
NEW: business.propertyLocation = new AttributedTerm(record.propertyLocation || '', 'VISION_APPRAISAL', index, record.pid);

OLD: business.ownerAddress = new AttributedTerm(record.ownerAddress || '', 'VISION_APPRAISAL');
NEW: business.ownerAddress = new AttributedTerm(record.ownerAddress || '', 'VISION_APPRAISAL', index, record.pid);

OLD: business.mblu = new AttributedTerm(record.mblu || '', 'VISION_APPRAISAL');
NEW: business.mblu = new AttributedTerm(record.mblu || '', 'VISION_APPRAISAL', index, record.pid);

OLD: legalConstruct.propertyLocation = new AttributedTerm(record.propertyLocation || '', 'VISION_APPRAISAL');
NEW: legalConstruct.propertyLocation = new AttributedTerm(record.propertyLocation || '', 'VISION_APPRAISAL', index, record.pid);

OLD: legalConstruct.ownerAddress = new AttributedTerm(record.ownerAddress || '', 'VISION_APPRAISAL');
NEW: legalConstruct.ownerAddress = new AttributedTerm(record.ownerAddress || '', 'VISION_APPRAISAL', index, record.pid);

OLD: legalConstruct.mblu = new AttributedTerm(record.mblu || '', 'VISION_APPRAISAL');
NEW: legalConstruct.mblu = new AttributedTerm(record.mblu || '', 'VISION_APPRAISAL', index, record.pid);
```

## Summary Statistics
- **Total AttributedTerm constructors updated**: 76
- **Method signatures updated**: ~35 parseCase methods + 5 helper methods + 5 main methods = 45 total
- **Method calls updated**: ~100+ individual calls throughout the file
- **Files affected**: 1 (visionAppraisalNameParser.js)

## Potential Error Sources
1. **Missing IndividualName class**: Some diagnostic errors suggest IndividualName might not be available
2. **Missing dependencies**: Scripts loading but with "already declared" errors
3. **Scope issues**: The massive duplication means any single error propagates everywhere
4. **Constructor parameter mismatches**: If AttributedTerm class doesn't accept 4 parameters

## Next Steps for Fixing
1. Fix the root cause error (likely missing class/dependency)
2. If needed, reverse all patterns using this log
3. Implement architectural refactor to eliminate code duplication
4. Re-apply AttributedTerm fixes to refactored, non-duplicated code