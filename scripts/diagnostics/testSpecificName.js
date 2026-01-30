// Test script to trace case detection for specific name
// Run in browser console after loading the app

async function loadDependencies() {
    const scripts = [
        './scripts/validation/case31Validator.js'
    ];

    for (const script of scripts) {
        const existing = document.querySelector(`script[src="${script}"]`);
        if (existing) {
            console.log(`Already loaded: ${script}`);
            continue;
        }

        await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = script;
            s.onload = () => {
                console.log(`Loaded: ${script}`);
                resolve();
            };
            s.onerror = () => {
                console.error(`Failed to load: ${script}`);
                reject(new Error(`Failed to load script: ${script}`));
            };
            document.head.appendChild(s);
        });
    }

    // Wait for scripts to settle
    await new Promise(resolve => setTimeout(resolve, 500));
}

function testSpecificNameCaseDetection(testName) {
    console.log('=== TESTING SPECIFIC NAME CASE DETECTION ===');
    console.log(`Testing: "${testName}"`);
    console.log('');

    // Step 1: Standardize the name (same as detectCase)
    let name = testName.trim().toUpperCase();
    name = name.replace(/\s*,\s*/g, ', ');
    name = name.replace(/,\s*$/, ',');
    console.log(`Standardized name: "${name}"`);

    // Step 2: Check Business Terms Master List
    const isMasterMatch = Case31Validator.isBusinessTermsMasterMatch(name);
    console.log(`Business Terms Master Match: ${isMasterMatch}`);

    // Step 3: Parse words
    const words = Case31Validator.parseWords(name);
    console.log(`Words (${words.length}):`, words);

    // Step 4: Check each word for business terms
    console.log('\nBusiness term check for each word:');
    words.forEach((word, idx) => {
        const isBusiness = Case31Validator.isBusinessTermWord(word);
        console.log(`  [${idx}] "${word}" -> isBusinessTermWord: ${isBusiness}`);

        // Also check if any business term is a substring
        const wordUpper = word.toUpperCase();
        Case31Validator.businessTerms.forEach(term => {
            if (wordUpper.includes(term)) {
                console.log(`      Contains business term: "${term}"`);
            }
        });
    });

    // Step 5: Overall business terms check
    const hasBusinessTerms = Case31Validator.hasBusinessTerms(words);
    console.log(`\nOverall hasBusinessTerms: ${hasBusinessTerms}`);

    // Step 6: Punctuation analysis
    const punctuationInfo = Case31Validator.analyzePunctuation(words);
    console.log('\nPunctuation analysis:', punctuationInfo);

    // Step 7: Detect case
    const detectedCase = Case31Validator.detectCase(testName);
    console.log(`\n=== DETECTED CASE: ${detectedCase} ===`);

    // Step 8: What entity type would this create?
    const caseEntityTypes = {
        'case0': 'Business',
        'case1': 'Individual',
        'case2': 'Individual',
        'case3': 'Individual',
        'case4': 'Business',
        'case4N': 'Business',
        'case5': 'Individual',
        'case6': 'Individual',
        'case7': 'Individual',
        'case8': 'Individual',
        'case9': 'Individual',
        'case10': 'Individual',
        'case11': 'AggregateHousehold',
        'case12': 'Business',
        'case13': 'Business/LegalConstruct',
        'case14': 'Business',
        'case15a': 'AggregateHousehold',
        'case15b': 'AggregateHousehold',
        'case16': 'AggregateHousehold',
        'case17': 'AggregateHousehold',
        'case18': 'Individual',
        'case19': 'Business/LegalConstruct',
        'case20': 'Business/LegalConstruct',
        'case21': 'Business/LegalConstruct',
        'case21N': 'Business',
        'case22': 'Business',
        'case23': 'Business',
        'case24': 'Business',
        'case25': 'AggregateHousehold',
        'case26': 'AggregateHousehold',
        'case27': 'AggregateHousehold',
        'case28': 'AggregateHousehold',
        'case29': 'AggregateHousehold',
        'case30': 'AggregateHousehold',
        'case31': 'Business/LegalConstruct',
        'case32': 'AggregateHousehold',
        'case33': 'Individual',
        'case34': 'LegalConstruct'
    };

    const entityType = caseEntityTypes[detectedCase] || 'Unknown';
    console.log(`Entity type that would be created: ${entityType}`);

    return {
        testName,
        standardizedName: name,
        words,
        wordCount: words.length,
        isMasterMatch,
        hasBusinessTerms,
        punctuationInfo,
        detectedCase,
        entityType
    };
}

// Main execution
async function runTests() {
    await loadDependencies();

    // Test the problematic name
    console.log('\n========================================');
    console.log('Testing the problematic name from research:');
    console.log('========================================\n');
    const result = testSpecificNameCaseDetection('TRIMS RIDGE HOMEOWNERS ASSOC, C/O BOB KOOPMAN');

    console.log('\n========================================');
    console.log('For comparison, testing a name in the master list:');
    console.log('========================================\n');
    testSpecificNameCaseDetection('SHEEPS MEADOW HOMEOWNERS ASSOC');

    console.log('\n========================================');
    console.log('Also testing with full ASSOCIATION:');
    console.log('========================================\n');
    testSpecificNameCaseDetection('TRIMS RIDGE HOMEOWNERS ASSOCIATION, C/O BOB KOOPMAN');

    return result;
}

runTests();
