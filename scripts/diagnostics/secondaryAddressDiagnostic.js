/**
 * secondaryAddressDiagnostic.js - Dump actual secondary address structure for entity
 *
 * Usage: Run in browser console after database is loaded:
 *   diagnoseSecondaryAddress('visionAppraisal:FireNumber:1013')
 *   findPOBoxAddresses()
 */

function diagnoseSecondaryAddress(entityKey) {
    console.log('=== SECONDARY ADDRESS DIAGNOSTIC ===');
    console.log(`Target entity key: ${entityKey}`);

    // Step 1: Find entity in unified database
    const db = window.unifiedEntityDatabase;
    if (!db || !db.entities) {
        console.log('ERROR: unifiedEntityDatabase not loaded');
        return;
    }

    const entity = db.entities[entityKey];
    if (!entity) {
        console.log(`ERROR: Entity not found for key: ${entityKey}`);
        console.log('Available keys containing "1013":', Object.keys(db.entities).filter(k => k.includes('1013')));
        return;
    }

    console.log('Entity found:', entity.constructor?.name || typeof entity);
    console.log('Entity name:', entity.name?.toString?.() || entity.name);

    // Step 2: Check contactInfo
    if (!entity.contactInfo) {
        console.log('ERROR: entity.contactInfo is null/undefined');
        return;
    }

    console.log('\n--- ContactInfo ---');
    console.log('contactInfo constructor:', entity.contactInfo.constructor?.name);
    console.log('contactInfo own properties:', Object.keys(entity.contactInfo));

    // Step 3: Check secondaryAddress (singular - the actual property name)
    console.log('\n--- secondaryAddress (singular) ---');
    console.log('typeof contactInfo.secondaryAddress:', typeof entity.contactInfo.secondaryAddress);
    console.log('Is array?', Array.isArray(entity.contactInfo.secondaryAddress));
    console.log('Value:', entity.contactInfo.secondaryAddress);

    // Step 4: Check secondaryAddresses (plural - what renderer looks for)
    console.log('\n--- secondaryAddresses (plural) ---');
    console.log('typeof contactInfo.secondaryAddresses:', typeof entity.contactInfo.secondaryAddresses);
    console.log('Value:', entity.contactInfo.secondaryAddresses);

    // Step 5: If secondaryAddress exists, dump every element in detail
    const secAddr = entity.contactInfo.secondaryAddress;
    if (secAddr && Array.isArray(secAddr) && secAddr.length > 0) {
        console.log(`\n--- ${secAddr.length} Secondary Address(es) Found ---`);
        secAddr.forEach((addr, i) => {
            dumpAddressDetail(addr, `Secondary Address [${i}]`);
        });
    } else {
        console.log('\n*** No secondary addresses in array (empty or missing) ***');
    }

    // Step 5b: Also dump primary address for comparison
    if (entity.contactInfo.primaryAddress) {
        dumpAddressDetail(entity.contactInfo.primaryAddress, 'Primary Address');
    }

    // Step 6: Check poBox on contactInfo
    if (entity.contactInfo.poBox) {
        console.log('\n--- contactInfo.poBox ---');
        console.log('  typeof:', typeof entity.contactInfo.poBox);
        console.log('  constructor:', entity.contactInfo.poBox?.constructor?.name);
        if (entity.contactInfo.poBox.primaryAlias) {
            console.log('  primaryAlias.term:', entity.contactInfo.poBox.primaryAlias.term);
        }
        if (entity.contactInfo.poBox.term) {
            console.log('  term:', entity.contactInfo.poBox.term);
        }
    }

    console.log('\n=== END DIAGNOSTIC ===');
}

/**
 * Dump detailed info for a single Address object
 */
function dumpAddressDetail(addr, label) {
    console.log(`\n=== ${label} ===`);
    console.log('  constructor:', addr.constructor?.name || typeof addr);
    console.log('  typeof:', typeof addr);

    if (typeof addr === 'string') {
        console.log('  *** THIS IS A RAW STRING, NOT AN ADDRESS OBJECT ***');
        console.log('  string value:', addr);
        return;
    }

    if (typeof addr !== 'object' || addr === null) {
        console.log('  *** UNEXPECTED TYPE ***');
        console.log('  value:', addr);
        return;
    }

    // Check primaryAlias
    if (addr.primaryAlias) {
        console.log('  primaryAlias.term:', addr.primaryAlias.term);
    }

    // Check originalAddress
    if (addr.originalAddress) {
        console.log('  originalAddress.term:', addr.originalAddress.term);
    }

    // Check parsed components
    console.log('  streetNumber:', addr.streetNumber?.term ?? '(null)');
    console.log('  streetName:', addr.streetName?.term ?? '(null)');
    console.log('  streetType:', addr.streetType?.term ?? '(null)');
    console.log('  secUnitType:', addr.secUnitType?.term ?? '(null)');
    console.log('  secUnitNum:', addr.secUnitNum?.term ?? '(null)');
    console.log('  city:', addr.city?.term ?? '(null)');
    console.log('  state:', addr.state?.term ?? '(null)');
    console.log('  zipCode:', addr.zipCode?.term ?? '(null)');
    console.log('  isBlockIslandAddress:', addr.isBlockIslandAddress?.term ?? '(null)');
    console.log('  processingSource:', addr.processingSource?.term ?? '(null)');

    if (typeof addr.toString === 'function') {
        console.log('  toString():', addr.toString());
    }
}

/**
 * Scan the entire entity database and find all addresses where secUnitType contains "PO"
 * so we can compare primaryAlias across PO Box addresses from different sources/paths.
 */
function findPOBoxAddresses() {
    console.log('=== SCANNING FOR ALL PO BOX ADDRESSES ===');

    const db = window.unifiedEntityDatabase;
    if (!db || !db.entities) {
        console.log('ERROR: unifiedEntityDatabase not loaded');
        return;
    }

    const results = [];

    for (const [key, entity] of Object.entries(db.entities)) {
        if (!entity.contactInfo) continue;

        // Check primary address
        const primary = entity.contactInfo.primaryAddress;
        if (primary && primary.secUnitType && /PO/i.test(primary.secUnitType.term)) {
            results.push({
                entityKey: key,
                location: 'primaryAddress',
                source: primary.processingSource?.term ?? 'unknown',
                primaryAliasTerm: primary.primaryAlias?.term,
                originalAddressTerm: primary.originalAddress?.term,
                secUnitType: primary.secUnitType?.term,
                secUnitNum: primary.secUnitNum?.term,
                city: primary.city?.term,
                state: primary.state?.term,
                zip: primary.zipCode?.term
            });
        }

        // Check secondary addresses
        const secondaries = entity.contactInfo.secondaryAddress;
        if (secondaries && Array.isArray(secondaries)) {
            secondaries.forEach((addr, i) => {
                if (addr && addr.secUnitType && /PO/i.test(addr.secUnitType.term)) {
                    results.push({
                        entityKey: key,
                        location: `secondaryAddress[${i}]`,
                        source: addr.processingSource?.term ?? 'unknown',
                        primaryAliasTerm: addr.primaryAlias?.term,
                        originalAddressTerm: addr.originalAddress?.term,
                        secUnitType: addr.secUnitType?.term,
                        secUnitNum: addr.secUnitNum?.term,
                        city: addr.city?.term,
                        state: addr.state?.term,
                        zip: addr.zipCode?.term
                    });
                }
            });
        }
    }

    console.log(`Found ${results.length} PO Box addresses across all entities:`);
    console.table(results);
    return results;
}

/**
 * Find the EntityGroup containing a given entity key and dump all CollectiveContactInfo.
 * Requires EntityGroup database to be loaded (fresh build or loaded from file).
 */
function diagnoseCollectiveContactInfo(entityKey) {
    console.log('=== COLLECTIVE CONTACT INFO DIAGNOSTIC ===');
    console.log(`Looking for group containing: ${entityKey}`);

    const egDb = window.entityGroupBrowser?.loadedDatabase;
    if (!egDb || !egDb.groups) {
        console.log('ERROR: EntityGroup database not loaded. Do a fresh build or load from file first.');
        return;
    }

    // Find the group — EntityGroup stores entity database keys in memberKeys array
    let foundGroup = null;
    let foundGroupKey = null;
    for (const groupKey of Object.keys(egDb.groups)) {
        const group = egDb.groups[groupKey];
        if (group.memberKeys && group.memberKeys.includes(entityKey)) {
            foundGroup = group;
            foundGroupKey = groupKey;
            break;
        }
    }

    if (!foundGroup) {
        console.log('ERROR: Entity not found in any EntityGroup');
        return;
    }

    console.log(`Found in group: ${foundGroupKey}`);
    console.log('Group memberKeys:', foundGroup.memberKeys);

    // Dump each member's address info for context
    // Need to look up each member entity from the unified database
    const entityDb = window.unifiedEntityDatabase;
    console.log('\n--- Member Address Summary ---');
    for (const memberKey of foundGroup.memberKeys) {
        const member = entityDb?.entities?.[memberKey];
        console.log(`\n  Member: ${memberKey}`);
        if (!member) { console.log('    (not found in entity database)'); continue; }
        console.log(`    Name: ${member.name?.toString?.() || 'unknown'}`);
        const ci = member.contactInfo;
        if (!ci) { console.log('    contactInfo: null'); continue; }

        if (ci.primaryAddress) {
            console.log(`    primaryAddress.primaryAlias.term: ${ci.primaryAddress.primaryAlias?.term}`);
            console.log(`    primaryAddress toString: ${ci.primaryAddress.toString?.()}`);
        }
        if (ci.secondaryAddress && ci.secondaryAddress.length > 0) {
            ci.secondaryAddress.forEach((addr, i) => {
                console.log(`    secondaryAddress[${i}].primaryAlias.term: ${addr.primaryAlias?.term}`);
                console.log(`    secondaryAddress[${i}] toString: ${addr.toString?.()}`);
                console.log(`    secondaryAddress[${i}] secUnitType: ${addr.secUnitType?.term ?? '(null)'}, secUnitNum: ${addr.secUnitNum?.term ?? '(null)'}`);
                console.log(`    secondaryAddress[${i}] city: ${addr.city?.term ?? '(null)'}, state: ${addr.state?.term ?? '(null)'}, zip: ${addr.zipCode?.term ?? '(null)'}`);
            });
        }
        if (ci.poBox) {
            console.log(`    poBox: ${ci.poBox.primaryAlias?.term ?? ci.poBox.term ?? ci.poBox}`);
        }
        if (ci.email && ci.email.length > 0) {
            ci.email.forEach((e, i) => console.log(`    email[${i}]: ${e.term ?? e}`));
        }
        if (ci.phone && ci.phone.length > 0) {
            ci.phone.forEach((p, i) => console.log(`    phone[${i}]: ${p.term ?? p}`));
        }
    }

    // Now dump all four CollectiveContactInfo properties
    const collectiveProps = ['collectiveMailingAddress', 'collectivePhone', 'collectivePOBox', 'collectiveEmail'];

    for (const propName of collectiveProps) {
        console.log(`\n--- ${propName} ---`);
        const cci = foundGroup[propName];
        if (!cci) {
            console.log('  (null/undefined)');
            continue;
        }

        console.log(`  constructor: ${cci.constructor?.name}`);
        console.log(`  Own properties: ${Object.keys(cci)}`);

        // Preferred
        if (cci.preferred !== undefined) {
            console.log(`  preferred: ${cci.preferred}`);
            if (cci.preferred && typeof cci.preferred === 'object') {
                console.log(`    preferred.constructor: ${cci.preferred.constructor?.name}`);
                console.log(`    preferred.primaryAlias.term: ${cci.preferred.primaryAlias?.term}`);
                if (typeof cci.preferred.toString === 'function') {
                    console.log(`    preferred.toString(): ${cci.preferred.toString()}`);
                }
                // If it's an Address, dump parsed components
                if (cci.preferred.city !== undefined) {
                    console.log(`    preferred.streetNumber: ${cci.preferred.streetNumber?.term ?? '(null)'}`);
                    console.log(`    preferred.streetName: ${cci.preferred.streetName?.term ?? '(null)'}`);
                    console.log(`    preferred.secUnitType: ${cci.preferred.secUnitType?.term ?? '(null)'}`);
                    console.log(`    preferred.secUnitNum: ${cci.preferred.secUnitNum?.term ?? '(null)'}`);
                    console.log(`    preferred.city: ${cci.preferred.city?.term ?? '(null)'}`);
                    console.log(`    preferred.state: ${cci.preferred.state?.term ?? '(null)'}`);
                    console.log(`    preferred.zipCode: ${cci.preferred.zipCode?.term ?? '(null)'}`);
                }
                // If it has a term property (AttributedTerm-like)
                if (cci.preferred.term !== undefined) {
                    console.log(`    preferred.term: ${cci.preferred.term}`);
                }
            }
        }

        // Alternatives
        if (cci.alternatives !== undefined) {
            console.log(`  alternatives: ${Array.isArray(cci.alternatives) ? cci.alternatives.length + ' items' : cci.alternatives}`);
            if (Array.isArray(cci.alternatives)) {
                cci.alternatives.forEach((alt, i) => {
                    if (alt && typeof alt === 'object') {
                        console.log(`    [${i}] constructor: ${alt.constructor?.name}, primaryAlias.term: ${alt.primaryAlias?.term ?? '(none)'}, term: ${alt.term ?? '(none)'}`);
                        if (typeof alt.toString === 'function') {
                            console.log(`    [${i}] toString(): ${alt.toString()}`);
                        }
                    } else {
                        console.log(`    [${i}]: ${alt}`);
                    }
                });
            }
        }

        // MemberContributions
        if (cci.memberContributions !== undefined) {
            console.log(`  memberContributions:`);
            if (cci.memberContributions instanceof Map) {
                for (const [mk, mv] of cci.memberContributions) {
                    console.log(`    ${mk}: ${JSON.stringify(mv)}`);
                }
            } else if (typeof cci.memberContributions === 'object') {
                for (const [mk, mv] of Object.entries(cci.memberContributions)) {
                    console.log(`    ${mk}: ${JSON.stringify(mv)}`);
                }
            }
        }
    }

    console.log('\n=== END COLLECTIVE CONTACT INFO DIAGNOSTIC ===');
}

/**
 * Scan all EntityGroups and report which CollectiveContactInfo types are populated.
 * Finds groups with the richest coverage for round-trip testing.
 */
function findRichestCollectiveGroups() {
    console.log('=== SCANNING FOR RICHEST COLLECTIVE CONTACT INFO GROUPS ===');

    const egDb = window.entityGroupBrowser?.loadedDatabase;
    if (!egDb || !egDb.groups) {
        console.log('ERROR: EntityGroup database not loaded.');
        return;
    }

    const props = ['collectiveMailingAddress', 'collectivePhone', 'collectivePOBox', 'collectiveEmail'];
    const totals = { collectiveMailingAddress: 0, collectivePhone: 0, collectivePOBox: 0, collectiveEmail: 0 };
    const richGroups = [];

    for (const [groupKey, group] of Object.entries(egDb.groups)) {
        let count = 0;
        const has = {};
        for (const prop of props) {
            if (group[prop]) {
                count++;
                has[prop] = true;
                totals[prop]++;
            }
        }
        if (count >= 2) {
            richGroups.push({ groupKey, count, has: Object.keys(has).join(', '), memberCount: group.memberKeys?.length || 0 });
        }
    }

    console.log('\nPopulation totals across all groups:');
    for (const [prop, total] of Object.entries(totals)) {
        console.log(`  ${prop}: ${total} groups`);
    }

    console.log(`\nGroups with 2+ collective types populated: ${richGroups.length}`);
    richGroups.sort((a, b) => b.count - a.count);
    console.table(richGroups.slice(0, 20));

    return richGroups;
}

console.log('secondaryAddressDiagnostic.js loaded.');
console.log('  Run: diagnoseSecondaryAddress("visionAppraisal:FireNumber:1013")');
console.log('  Run: findPOBoxAddresses()');
console.log('  Run: diagnoseCollectiveContactInfo("visionAppraisal:FireNumber:1013")');
console.log('  Run: findRichestCollectiveGroups()');
