// =============================================================================
// Phase 1 Testing: IndividualName.compareTo with Vowel-Weighted Levenshtein
// Run in browser console after loading entities
// =============================================================================

/**
 * Test the levenshteinDistance function with known cases
 */
function testLevenshteinDistance() {
    console.log('=== Testing levenshteinDistance ===\n');

    const testCases = [
        // Identical strings
        { s1: 'SMITH', s2: 'SMITH', expected: 0, desc: 'Identical strings' },

        // Vowel swap (should have low distance)
        { s1: 'SMITH', s2: 'SMYTH', desc: 'Vowel swap (I→Y) - should be low' },
        { s1: 'JOHN', s2: 'JEAN', desc: 'Vowel swap (O→E) - should be low' },

        // Consonant swap (should have high distance)
        { s1: 'SMITH', s2: 'SMOTH', desc: 'Vowel swap (I→O) - should be low' },
        { s1: 'SMITH', s2: 'SNITH', desc: 'Consonant swap (M→N) - should be high' },

        // Different lengths
        { s1: 'ROBERT', s2: 'ROB', desc: 'Substring' },
        { s1: 'KATHERINE', s2: 'KATE', desc: 'Nickname variant' },

        // Completely different
        { s1: 'SMITH', s2: 'JONES', desc: 'Completely different' }
    ];

    testCases.forEach(test => {
        const distance = levenshteinDistance(test.s1, test.s2);
        const maxLen = Math.max(test.s1.length, test.s2.length);
        const similarity = maxLen > 0 ? (1 - distance / maxLen) : 1;

        console.log(`${test.desc}:`);
        console.log(`  "${test.s1}" vs "${test.s2}"`);
        console.log(`  Distance: ${distance.toFixed(3)}, Similarity: ${(similarity * 100).toFixed(1)}%`);
        if (test.expected !== undefined) {
            console.log(`  Expected distance: ${test.expected}, ${distance === test.expected ? '✅ PASS' : '❌ FAIL'}`);
        }
        console.log('');
    });
}

/**
 * Test levenshteinSimilarity helper function
 */
function testLevenshteinSimilarity() {
    console.log('=== Testing levenshteinSimilarity ===\n');

    const testCases = [
        { s1: 'SMITH', s2: 'SMITH', desc: 'Identical' },
        { s1: 'SMITH', s2: 'SMYTH', desc: 'Similar (vowel swap)' },
        { s1: 'SMITH', s2: 'JONES', desc: 'Different' },
        { s1: '', s2: '', desc: 'Both empty' },
        { s1: 'SMITH', s2: '', desc: 'One empty' },
    ];

    testCases.forEach(test => {
        const similarity = levenshteinSimilarity(test.s1, test.s2);
        console.log(`${test.desc}: "${test.s1}" vs "${test.s2}" = ${(similarity * 100).toFixed(1)}%`);
    });
    console.log('');
}

/**
 * Test IndividualName.compareTo with sample name pairs
 */
function testIndividualNameCompareTo() {
    console.log('=== Testing IndividualName.compareTo ===\n');

    // Check if IndividualName class is available
    if (typeof IndividualName === 'undefined') {
        console.error('❌ IndividualName class not loaded. Make sure aliasClasses.js is loaded.');
        return;
    }

    // Create test IndividualName objects
    const createName = (first, last, middle = '') => {
        const primaryAlias = new AttributedTerm(`${first} ${last}`, 'TEST', 0, 'test');
        return new IndividualName(primaryAlias, '', first, middle, last, '');
    };

    const testCases = [
        // Identical names
        { name1: createName('JOHN', 'SMITH'), name2: createName('JOHN', 'SMITH'), desc: 'Identical names' },

        // Similar first name
        { name1: createName('JOHN', 'SMITH'), name2: createName('JON', 'SMITH'), desc: 'Similar first (JOHN vs JON)' },

        // Similar last name (vowel variation)
        { name1: createName('JOHN', 'SMITH'), name2: createName('JOHN', 'SMYTH'), desc: 'Similar last (SMITH vs SMYTH)' },

        // Different names
        { name1: createName('JOHN', 'SMITH'), name2: createName('JANE', 'JONES'), desc: 'Different names' },

        // Same last, different first
        { name1: createName('ROBERT', 'SMITH'), name2: createName('RICHARD', 'SMITH'), desc: 'Same last, different first' },

        // With middle names
        { name1: createName('JOHN', 'SMITH', 'MICHAEL'), name2: createName('JOHN', 'SMITH', 'MIKE'), desc: 'With middle names' },
    ];

    console.log('IndividualName has comparisonWeights:', testCases[0].name1.comparisonWeights);
    console.log('');

    testCases.forEach(test => {
        const result = test.name1.compareTo(test.name2);
        console.log(`${test.desc}:`);
        console.log(`  ${test.name1.firstName} ${test.name1.lastName} vs ${test.name2.firstName} ${test.name2.lastName}`);
        console.log(`  compareTo result: ${result} (${typeof result})`);
        if (typeof result === 'number' && result >= 0 && result <= 1) {
            console.log(`  Similarity: ${(result * 100).toFixed(1)}%`);
        }
        console.log('');
    });
}

/**
 * Test with real entities from loaded data
 */
function testWithRealEntities(sampleSize = 5) {
    console.log('=== Testing with Real Loaded Entities ===\n');

    if (typeof workingLoadedEntities === 'undefined' || !workingLoadedEntities.bloomerang) {
        console.error('❌ No entities loaded. Click "🚀 Load All Entities Into Memory" first.');
        return;
    }

    const individuals = workingLoadedEntities.bloomerang.individuals;
    if (!individuals || !individuals.entities) {
        console.error('❌ No individual entities found in loaded data.');
        return;
    }

    const entityKeys = Object.keys(individuals.entities);
    console.log(`Total Individual entities: ${entityKeys.length}`);
    console.log(`Testing first ${sampleSize} entities against each other...\n`);

    const sampleKeys = entityKeys.slice(0, sampleSize);
    const sampleEntities = sampleKeys.map(k => individuals.entities[k]);

    // Compare each pair
    for (let i = 0; i < sampleEntities.length; i++) {
        for (let j = i + 1; j < sampleEntities.length; j++) {
            const e1 = sampleEntities[i];
            const e2 = sampleEntities[j];

            if (!e1.name || !e2.name) {
                console.log(`Skipping: Entity missing name`);
                continue;
            }

            const name1 = e1.name;
            const name2 = e2.name;

            // Get display names
            const displayName1 = `${name1.firstName || ''} ${name1.lastName || ''}`.trim();
            const displayName2 = `${name2.firstName || ''} ${name2.lastName || ''}`.trim();

            try {
                const result = name1.compareTo(name2);
                console.log(`"${displayName1}" vs "${displayName2}": ${result} (${(result * 100).toFixed(1)}%)`);
            } catch (err) {
                console.error(`Error comparing "${displayName1}" vs "${displayName2}":`, err.message);
            }
        }
    }
}

/**
 * Run all Phase 1 tests
 */
function runPhase1Tests() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     PHASE 1: IndividualName compareTo Testing              ║');
    console.log('║     Vowel-Weighted Levenshtein Implementation              ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    testLevenshteinDistance();
    testLevenshteinSimilarity();
    testIndividualNameCompareTo();
    testWithRealEntities(5);

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    Tests Complete                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
}

// Export for browser
if (typeof window !== 'undefined') {
    window.testLevenshteinDistance = testLevenshteinDistance;
    window.testLevenshteinSimilarity = testLevenshteinSimilarity;
    window.testIndividualNameCompareTo = testIndividualNameCompareTo;
    window.testWithRealEntities = testWithRealEntities;
    window.runPhase1Tests = runPhase1Tests;
}

console.log('Phase 1 test functions loaded. Run runPhase1Tests() to execute all tests.');
