/**
 * testAddressInheritance.js
 *
 * Purpose: Verify whether individuals in AggregateHousehold entities
 * inherit/contain the addresses from their parent household.
 *
 * Hypothesis to test: Every individual in an array contains all addresses
 * held by its parent entity.
 *
 * Usage: Load entities first, then run:
 *   fetch('./scripts/testing/testAddressInheritance.js').then(r => r.text()).then(eval)
 */

(function testAddressInheritance() {
    console.log('=== ADDRESS INHERITANCE TEST ===\n');

    if (!window.workingLoadedEntities || workingLoadedEntities.status !== 'loaded') {
        console.error('ERROR: Please load entities first using the "Load All Entities Into Memory" button');
        return;
    }

    const results = {
        totalHouseholdsWithIndividuals: 0,
        householdsWhereAllIndividualsHaveParentAddresses: 0,
        householdsWhereNotAllIndividualsHaveParentAddresses: 0,
        householdsWhereParentHasNoAddresses: 0,
        individualsMissingParentAddresses: [],
        sampleComparisons: []
    };

    // Helper: Get all addresses from a ContactInfo as a Set of comparable strings
    function getAddressSet(contactInfo) {
        const addressSet = new Set();
        if (!contactInfo) return addressSet;

        if (contactInfo.primaryAddress) {
            addressSet.add(addressToString(contactInfo.primaryAddress));
        }

        if (contactInfo.secondaryAddresses && Array.isArray(contactInfo.secondaryAddresses)) {
            contactInfo.secondaryAddresses.forEach(addr => {
                if (addr) addressSet.add(addressToString(addr));
            });
        }

        return addressSet;
    }

    // Helper: Convert address to comparable string
    function addressToString(addr) {
        if (!addr) return '';
        // Use key fields to create a comparable string
        const parts = [
            addr.streetNumber || '',
            addr.streetName || '',
            addr.city || '',
            addr.state || '',
            addr.zipCode || ''
        ].map(p => String(p).trim().toLowerCase());
        return parts.join('|');
    }

    // Helper: Check if setA contains all elements of setB
    function containsAll(setA, setB) {
        for (const elem of setB) {
            if (!setA.has(elem)) return false;
        }
        return true;
    }

    // Process VisionAppraisal entities
    console.log('Checking VisionAppraisal AggregateHouseholds...\n');

    if (workingLoadedEntities.visionAppraisal?.entities) {
        Object.values(workingLoadedEntities.visionAppraisal.entities).forEach(entity => {
            if (entity.constructor.name === 'AggregateHousehold' &&
                entity.individuals &&
                entity.individuals.length > 0) {

                results.totalHouseholdsWithIndividuals++;

                const parentAddresses = getAddressSet(entity.contactInfo);

                if (parentAddresses.size === 0) {
                    results.householdsWhereParentHasNoAddresses++;
                    return; // Skip - can't test inheritance if parent has no addresses
                }

                let allIndividualsHaveParentAddresses = true;

                entity.individuals.forEach((individual, idx) => {
                    const individualAddresses = getAddressSet(individual.contactInfo);

                    if (!containsAll(individualAddresses, parentAddresses)) {
                        allIndividualsHaveParentAddresses = false;

                        // Find which parent addresses are missing
                        const missingAddresses = [];
                        for (const parentAddr of parentAddresses) {
                            if (!individualAddresses.has(parentAddr)) {
                                missingAddresses.push(parentAddr);
                            }
                        }

                        results.individualsMissingParentAddresses.push({
                            source: 'VisionAppraisal',
                            householdKey: entity.locationIdentifier?.toString() || 'unknown',
                            individualIndex: idx,
                            individualName: individual.name?.toString() || 'unknown',
                            parentAddressCount: parentAddresses.size,
                            individualAddressCount: individualAddresses.size,
                            missingCount: missingAddresses.length
                        });
                    }
                });

                if (allIndividualsHaveParentAddresses) {
                    results.householdsWhereAllIndividualsHaveParentAddresses++;
                } else {
                    results.householdsWhereNotAllIndividualsHaveParentAddresses++;
                }

                // Capture sample for first few households
                if (results.sampleComparisons.length < 5) {
                    results.sampleComparisons.push({
                        source: 'VisionAppraisal',
                        householdKey: entity.locationIdentifier?.toString() || 'unknown',
                        parentAddressCount: parentAddresses.size,
                        parentAddresses: Array.from(parentAddresses),
                        individuals: entity.individuals.map((ind, idx) => ({
                            index: idx,
                            name: ind.name?.toString() || 'unknown',
                            addressCount: getAddressSet(ind.contactInfo).size,
                            addresses: Array.from(getAddressSet(ind.contactInfo))
                        }))
                    });
                }
            }
        });
    }

    // Process Bloomerang entities
    console.log('Checking Bloomerang AggregateHouseholds...\n');

    if (workingLoadedEntities.bloomerang?.households?.entities) {
        Object.values(workingLoadedEntities.bloomerang.households.entities).forEach(entity => {
            if (entity.individuals && entity.individuals.length > 0) {

                results.totalHouseholdsWithIndividuals++;

                const parentAddresses = getAddressSet(entity.contactInfo);

                if (parentAddresses.size === 0) {
                    results.householdsWhereParentHasNoAddresses++;
                    return;
                }

                let allIndividualsHaveParentAddresses = true;

                entity.individuals.forEach((individual, idx) => {
                    const individualAddresses = getAddressSet(individual.contactInfo);

                    if (!containsAll(individualAddresses, parentAddresses)) {
                        allIndividualsHaveParentAddresses = false;

                        const missingAddresses = [];
                        for (const parentAddr of parentAddresses) {
                            if (!individualAddresses.has(parentAddr)) {
                                missingAddresses.push(parentAddr);
                            }
                        }

                        results.individualsMissingParentAddresses.push({
                            source: 'Bloomerang',
                            householdKey: entity.locationIdentifier?.toString() || 'unknown',
                            individualIndex: idx,
                            individualName: individual.name?.toString() || 'unknown',
                            parentAddressCount: parentAddresses.size,
                            individualAddressCount: individualAddresses.size,
                            missingCount: missingAddresses.length
                        });
                    }
                });

                if (allIndividualsHaveParentAddresses) {
                    results.householdsWhereAllIndividualsHaveParentAddresses++;
                } else {
                    results.householdsWhereNotAllIndividualsHaveParentAddresses++;
                }

                // Capture sample
                if (results.sampleComparisons.length < 10) {
                    results.sampleComparisons.push({
                        source: 'Bloomerang',
                        householdKey: entity.locationIdentifier?.toString() || 'unknown',
                        parentAddressCount: parentAddresses.size,
                        parentAddresses: Array.from(parentAddresses),
                        individuals: entity.individuals.map((ind, idx) => ({
                            index: idx,
                            name: ind.name?.toString() || 'unknown',
                            addressCount: getAddressSet(ind.contactInfo).size,
                            addresses: Array.from(getAddressSet(ind.contactInfo))
                        }))
                    });
                }
            }
        });
    }

    // Print results
    console.log('=== RESULTS ===\n');
    console.log(`Total households with individuals: ${results.totalHouseholdsWithIndividuals}`);
    console.log(`Households where parent has no addresses: ${results.householdsWhereParentHasNoAddresses}`);
    console.log(`Households where ALL individuals contain parent addresses: ${results.householdsWhereAllIndividualsHaveParentAddresses}`);
    console.log(`Households where NOT all individuals contain parent addresses: ${results.householdsWhereNotAllIndividualsHaveParentAddresses}`);

    const testableHouseholds = results.totalHouseholdsWithIndividuals - results.householdsWhereParentHasNoAddresses;
    if (testableHouseholds > 0) {
        const inheritanceRate = (results.householdsWhereAllIndividualsHaveParentAddresses / testableHouseholds * 100).toFixed(1);
        console.log(`\nAddress inheritance rate: ${inheritanceRate}%`);
    }

    if (results.individualsMissingParentAddresses.length > 0) {
        console.log(`\nIndividuals missing parent addresses (first 10):`);
        results.individualsMissingParentAddresses.slice(0, 10).forEach(item => {
            console.log(`  - ${item.source}: ${item.individualName} (idx ${item.individualIndex}) missing ${item.missingCount} of ${item.parentAddressCount} parent addresses`);
        });
    }

    console.log('\n=== SAMPLE COMPARISONS ===\n');
    results.sampleComparisons.forEach((sample, i) => {
        console.log(`Sample ${i + 1} (${sample.source}):`);
        console.log(`  Household: ${sample.householdKey}`);
        console.log(`  Parent addresses (${sample.parentAddressCount}): ${sample.parentAddresses.join('; ')}`);
        sample.individuals.forEach(ind => {
            console.log(`  Individual ${ind.index} (${ind.name}): ${ind.addressCount} addresses`);
            if (ind.addresses.length > 0) {
                ind.addresses.forEach(a => console.log(`    - ${a}`));
            }
        });
        console.log('');
    });

    // Conclusion
    console.log('=== HYPOTHESIS EVALUATION ===\n');
    if (results.householdsWhereNotAllIndividualsHaveParentAddresses === 0 && testableHouseholds > 0) {
        console.log('✅ HYPOTHESIS CONFIRMED: All individuals contain all parent addresses.');
        console.log('   Implication: When comparing, we only need individual addresses (parent addresses already included).');
    } else if (results.householdsWhereNotAllIndividualsHaveParentAddresses > 0) {
        console.log('❌ HYPOTHESIS NOT CONFIRMED: Some individuals are missing parent addresses.');
        console.log('   Implication: When comparing to individuals in arrays, we should also consider parent entity addresses.');
    } else {
        console.log('⚠️ INSUFFICIENT DATA: No testable households found (all parents have 0 addresses).');
    }

    // Store results globally for further inspection
    window.addressInheritanceTestResults = results;
    console.log('\nFull results stored in: window.addressInheritanceTestResults');

    return results;
})();
