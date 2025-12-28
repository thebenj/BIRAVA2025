// Test script to compare detectCase vs detectCaseRetVal methods
// Run this in browser console after loading case31Validator.js

console.log('🚀 Starting detectCase vs detectCaseRetVal comparison test...');

// Load the Case31Validator and run comparison
if (typeof Case31Validator !== 'undefined') {
    const results = Case31Validator.compareDetectCaseMethods();

    console.log('\n🎯 Test Complete!');
    console.log(`Final Results: ${results.matches} matches, ${results.mismatches} mismatches`);
    console.log(`Success Rate: ${results.successRate.toFixed(1)}%`);

    if (results.successRate === 100) {
        console.log('✅ PERFECT MATCH: Both methods produce identical results!');
    } else {
        console.log('❌ DIFFERENCES FOUND: Methods produce different results');
        console.log('Check the detailed output above for specific mismatches');
    }
} else {
    console.error('❌ Case31Validator not loaded. Please load the validator first:');
    console.log('Run: const script = document.createElement("script"); script.src = "./scripts/validation/case31Validator.js"; document.head.appendChild(script);');
}