/**
 * Test suite for permutationBasedNameComparison function
 * Tests all cases (a-j) as specified in the requirements
 *
 * Terminology:
 * - Short word: Name word with <= 2 characters
 * - Long word: Name word containing a space
 * - Unique pairwise comparison: Optimal pairing of words between two comparators
 *
 * Usage:
 *   fetch('./scripts/testing/testPermutationNameComparison.js').then(r => r.text()).then(eval);
 *   runPermutationTests();
 */

/**
 * Create a mock IndividualName-like object for testing
 */
function createMockName(firstName, lastName, otherNames = '') {
    return {
        firstName: firstName,
        lastName: lastName,
        otherNames: otherNames,
        comparisonWeights: { lastName: 0.5, firstName: 0.4, otherNames: 0.1 }
    };
}

/**
 * Run all permutation-based name comparison tests
 */
function runPermutationTests() {
    console.log('='.repeat(80));
    console.log('PERMUTATION-BASED NAME COMPARISON TEST SUITE');
    console.log('='.repeat(80));

    let passed = 0;
    let failed = 0;

    const runTest = (testName, name1, name2, expectedBehavior, minScore = null, maxScore = null) => {
        const score = permutationBasedNameComparison(name1, name2);
        let testPassed = true;
        let failReason = '';

        if (minScore !== null && score < minScore) {
            testPassed = false;
            failReason = `Score ${score.toFixed(4)} below minimum ${minScore}`;
        }
        if (maxScore !== null && score > maxScore) {
            testPassed = false;
            failReason = `Score ${score.toFixed(4)} above maximum ${maxScore}`;
        }

        if (testPassed) {
            console.log(`✅ ${testName}: ${score.toFixed(4)}`);
            passed++;
        } else {
            console.log(`❌ ${testName}: ${score.toFixed(4)} - ${failReason}`);
            console.log(`   Name1: "${name1.firstName}" "${name1.lastName}" "${name1.otherNames}"`);
            console.log(`   Name2: "${name2.firstName}" "${name2.lastName}" "${name2.otherNames}"`);
            failed++;
        }

        return { testName, score, testPassed, expectedBehavior };
    };

    // =========================================================================
    // CASE A: Neither comparator has a short word or a long word
    // With -0.04 final adjustment, perfect match = 0.96
    // =========================================================================
    console.log('\n--- CASE A: Neither has short or long words ---');

    runTest('A1: Identical names',
        createMockName('John', 'Smith'),
        createMockName('John', 'Smith'),
        'Best pairwise 100% - 0.04 = 96%', 0.95, 0.97);

    runTest('A2: Same words, different fields',
        createMockName('Smith', 'John'),
        createMockName('John', 'Smith'),
        'Permutation finds optimal pairing - 0.04', 0.95, 0.97);

    runTest('A3: Similar names',
        createMockName('John', 'Smith'),
        createMockName('Jon', 'Smyth'),
        'Should score moderately high after -0.04', 0.65, 0.95);

    runTest('A4: Different names',
        createMockName('John', 'Smith'),
        createMockName('Mary', 'Jones'),
        'Should score low after -0.04', 0.0, 0.45);

    runTest('A5: Three words each, same words different order',
        createMockName('John', 'Smith', 'William'),
        createMockName('William', 'John', 'Smith'),
        'Permutation finds perfect match - 0.04', 0.95, 0.97);

    // =========================================================================
    // CASE B: One comparator has ONE short word, other has neither special case
    // Haircut factor applies: 1 word vs 2 words = (1-(1-1/2)^2) = 0.75
    // Then -0.04 final adjustment
    // =========================================================================
    console.log('\n--- CASE B: One has short word, other has neither ---');

    runTest('B1: First has initial "J", second has "John"',
        createMockName('J', 'Smith'),
        createMockName('John', 'Smith'),
        'Haircut: 1*0.75 - 0.04 = 0.71', 0.70, 0.73);

    runTest('B2: Second has initial',
        createMockName('John', 'Smith'),
        createMockName('J', 'Smith'),
        'Haircut: 1*0.75 - 0.04 = 0.71', 0.70, 0.73);

    runTest('B3: Short word in otherNames field',
        createMockName('John', 'Smith', 'W'),
        createMockName('John', 'Smith', 'William'),
        '2 words vs 3 words: haircut (1-(1-2/3)^2)=0.889, then -0.04 = 0.849', 0.84, 0.86);

    // =========================================================================
    // CASE C: One comparator has a long word, other has neither special case
    // After split, word counts may differ - haircut applies
    // Then -0.04 final adjustment
    // =========================================================================
    console.log('\n--- CASE C: One has long word, other has neither ---');

    runTest('C1: "Mary Ann" vs "Mary" and "Ann"',
        createMockName('Mary Ann', 'Smith'),
        createMockName('Mary', 'Smith', 'Ann'),
        '3 words each after split, perfect - 0.04 = 0.96', 0.95, 0.97);

    runTest('C2: "De La Cruz" split matching',
        createMockName('John', 'De La Cruz'),
        createMockName('John', 'Cruz', 'De'),
        'Actually Case F: "De" is short word (2 chars), 4 vs 2 words, haircut 0.75, -0.04 = 0.71', 0.70, 0.73);

    runTest('C3: Hyphenated name (punctuation stripped)',
        createMockName('Mary-Anne', 'Smith'),
        createMockName('MaryAnne', 'Smith'),
        'Punctuation stripped, equal counts - 0.04 = 0.96', 0.95, 0.97);

    // =========================================================================
    // CASE D: Both have ONE short word each, neither has long word
    // 10% short + 90% remaining (with haircut if counts differ)
    // Then -0.04 final adjustment
    // =========================================================================
    console.log('\n--- CASE D: Both have one short word, neither has long ---');

    runTest('D1: Both have same initial',
        createMockName('J', 'Smith'),
        createMockName('J', 'Smith'),
        '10%(100%) + 90%(100%) = 1.0, then -0.04 = 0.96', 0.95, 0.97);

    runTest('D2: Different initials, same last',
        createMockName('J', 'Smith'),
        createMockName('M', 'Smith'),
        '10%(0%) + 90%(100% - 0.04) - 0.04', 0.78, 0.88);

    runTest('D3: Same initials, different last',
        createMockName('J', 'Smith'),
        createMockName('J', 'Jones'),
        '10%(100%) + 90%(low) - 0.04', 0.10, 0.35);

    // =========================================================================
    // CASE E: One has short+long, other has short only
    // 10% short + 90% case c logic (with haircut)
    // Then -0.04 final adjustment
    // =========================================================================
    console.log('\n--- CASE E: One has short+long, other has short only ---');

    runTest('E1: Short+long vs short only',
        createMockName('J', 'Mary Ann'),
        createMockName('M', 'Ann', 'Mary'),
        '10% short (0%) + 90% case c (haircut + match) - 0.04', 0.40, 0.92);

    // =========================================================================
    // CASE F: One has long only, other has short only
    // Ignore short, split long, compare remaining (with haircut)
    // Then -0.04 final adjustment
    // =========================================================================
    console.log('\n--- CASE F: One has long only, other has short only ---');

    runTest('F1: Long word vs short word',
        createMockName('Mary Ann', 'Smith'),
        createMockName('J', 'Smith'),
        '1 word vs 3 words: haircut (1-(1-1/3)^2)=0.556, then -0.04', 0.50, 0.56);

    // =========================================================================
    // CASE G: Both have long words, neither has short
    // Split both, compare (with haircut if counts differ)
    // Then -0.04 final adjustment
    // =========================================================================
    console.log('\n--- CASE G: Both have long words, neither has short ---');

    runTest('G1: Both have compound names',
        createMockName('Mary Ann', 'De La Cruz'),
        createMockName('Mary Ann', 'De La Cruz'),
        'Both split to 5 words, perfect - 0.04 = 0.96', 0.95, 0.97);

    runTest('G2: Compound names in different order',
        createMockName('Mary Ann', 'Smith'),
        createMockName('Ann Mary', 'Smith'),
        'Both split to 3 words, permute finds match - 0.04 = 0.96', 0.95, 0.97);

    // =========================================================================
    // CASE H: One has short+long, other has long only
    // Ignore short, split both longs, compare (with haircut)
    // Then -0.04 final adjustment
    // =========================================================================
    console.log('\n--- CASE H: One has short+long, other has long only ---');

    runTest('H1: Short+long vs long only',
        createMockName('J', 'Mary Ann'),
        createMockName('Mary Ann', 'Smith'),
        '2 words vs 3 words: haircut (1-(1-2/3)^2)=0.889, then -0.04', 0.50, 0.90);

    // =========================================================================
    // CASE I: One has short+long, other has neither
    // Ignore short, split long, compare (with haircut)
    // Then -0.04 final adjustment
    // =========================================================================
    console.log('\n--- CASE I: One has short+long, other has neither ---');

    runTest('I1: Short+long vs regular',
        createMockName('J', 'Mary Ann'),
        createMockName('Mary', 'Ann'),
        '2 words each after processing, perfect - 0.04 = 0.96', 0.95, 0.97);

    // =========================================================================
    // CASE J: Both have short+long
    // 10% short + 90% case g logic (with haircut)
    // Then -0.04 final adjustment
    // =========================================================================
    console.log('\n--- CASE J: Both have short+long ---');

    runTest('J1: Both have short and long',
        createMockName('J', 'Mary Ann'),
        createMockName('M', 'Ann Mary'),
        '10% short (0%) + 90% (2 words each, permute) - 0.04', 0.75, 0.92);

    runTest('J2: Same short, same long different order',
        createMockName('J', 'Mary Ann'),
        createMockName('J', 'Ann Mary'),
        '10%(100%) + 90%(100%) = 1.0, then -0.04 = 0.96', 0.95, 0.97);

    // =========================================================================
    // MULTIPLE SHORT WORDS - Should ignore short word handling
    // Haircut applies if counts differ, then -0.04
    // =========================================================================
    console.log('\n--- MULTIPLE SHORT WORDS: Ignore short word handling ---');

    runTest('Multi-short 1: Both have multiple shorts',
        createMockName('J', 'W', 'Smith'),
        createMockName('M', 'K', 'Smith'),
        'All 3 words compared, low similarity - 0.04', 0.0, 0.50);

    runTest('Multi-short 2: One has multiple shorts',
        createMockName('J', 'W'),
        createMockName('John', 'Williams'),
        '2 words each, low similarity - 0.04', 0.0, 0.30);

    // =========================================================================
    // EDGE CASES
    // With haircut and -0.04 adjustment
    // =========================================================================
    console.log('\n--- EDGE CASES ---');

    runTest('Edge 1: Empty first name',
        createMockName('', 'Smith'),
        createMockName('John', 'Smith'),
        '1 word vs 2 words: haircut (1-(1-1/2)^2)=0.75, then -0.04', 0.70, 0.73);

    runTest('Edge 2: Single character from split (should be ignored)',
        createMockName('A B', 'Smith'),
        createMockName('Smith', 'Jones'),
        'After filtering single chars: 1 word vs 2 words with haircut - 0.04', 0.0, 0.75);

    runTest('Edge 3: Numbers in names',
        createMockName('John3', 'Smith'),
        createMockName('John3', 'Smith'),
        'Perfect match - 0.04 = 0.96', 0.95, 0.97);

    // =========================================================================
    // INTEGRATION TESTS - Compare with weighted calculation
    // =========================================================================
    console.log('\n--- INTEGRATION: Comparing weighted vs permutation ---');

    // Test where permutation should beat weighted
    const intName1 = createMockName('Smith', 'John');  // Swapped
    const intName2 = createMockName('John', 'Smith');  // Normal

    const weightedScore = calculateWeightedScore(intName1, intName2);
    const permutationScore = permutationBasedNameComparison(intName1, intName2);

    console.log(`\nSwapped name test (Smith John vs John Smith):`);
    console.log(`  Weighted score: ${weightedScore.toFixed(4)}`);
    console.log(`  Permutation score: ${permutationScore.toFixed(4)}`);
    console.log(`  Final (max): ${Math.max(weightedScore, permutationScore).toFixed(4)}`);

    if (permutationScore > weightedScore) {
        console.log('  ✅ Permutation correctly beats weighted for swapped names');
        passed++;
    } else {
        console.log('  ❌ Permutation should beat weighted for swapped names');
        failed++;
    }

    // =========================================================================
    // SUMMARY
    // =========================================================================
    console.log('\n' + '='.repeat(80));
    console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(80));

    return { passed, failed };
}

/**
 * Helper to calculate weighted score for comparison
 */
function calculateWeightedScore(name1, name2) {
    const weights = { lastName: 0.5, firstName: 0.4, otherNames: 0.1 };
    let totalScore = 0;
    let totalWeight = 0;

    for (const prop of ['lastName', 'firstName', 'otherNames']) {
        const val1 = name1[prop] || '';
        const val2 = name2[prop] || '';
        if (val1 && val2) {
            totalScore += levenshteinSimilarity(val1, val2) * weights[prop];
            totalWeight += weights[prop];
        }
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
}

/**
 * Quick test of specific names for debugging
 */
function testSpecificNames(firstName1, lastName1, otherNames1, firstName2, lastName2, otherNames2) {
    const name1 = createMockName(firstName1, lastName1, otherNames1 || '');
    const name2 = createMockName(firstName2, lastName2, otherNames2 || '');

    console.log('\n--- Specific Name Comparison ---');
    console.log(`Name 1: "${firstName1}" "${lastName1}" "${otherNames1 || ''}"`);
    console.log(`Name 2: "${firstName2}" "${lastName2}" "${otherNames2 || ''}"`);

    const weighted = calculateWeightedScore(name1, name2);
    const permutation = permutationBasedNameComparison(name1, name2);
    const final = Math.max(weighted, permutation);

    console.log(`Weighted score: ${weighted.toFixed(4)}`);
    console.log(`Permutation score: ${permutation.toFixed(4)}`);
    console.log(`Final score (max): ${final.toFixed(4)}`);

    return { weighted, permutation, final };
}

// Make functions available globally
if (typeof window !== 'undefined') {
    window.runPermutationTests = runPermutationTests;
    window.testSpecificNames = testSpecificNames;
    window.createMockName = createMockName;
}

console.log('Permutation name comparison tests loaded.');
console.log('Run: runPermutationTests()');
console.log('Or: testSpecificNames("John", "Smith", "", "Smith", "John", "")');
