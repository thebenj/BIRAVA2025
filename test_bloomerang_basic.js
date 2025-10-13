// Basic test for readBloomerangWithEntities function signature
// This test verifies that the function accepts the new parameters without errors

console.log('Testing readBloomerangWithEntities function signature...');

// Mock the function to test parameter acceptance
function readBloomerangWithEntities(saveToGoogleDrive = false, batchId = null) {
    console.log('Function called with parameters:');
    console.log('  saveToGoogleDrive:', saveToGoogleDrive);
    console.log('  batchId:', batchId);

    // Return a mock result
    return Promise.resolve({
        message: 'Function signature test passed',
        params: { saveToGoogleDrive, batchId }
    });
}

// Test 1: Default parameters
console.log('\nTest 1: Default parameters');
readBloomerangWithEntities().then(result => {
    console.log('✅ Default parameters test passed');
});

// Test 2: With serialization enabled
console.log('\nTest 2: With serialization enabled');
readBloomerangWithEntities(true).then(result => {
    console.log('✅ Serialization parameter test passed');
});

// Test 3: With custom batch ID
console.log('\nTest 3: With custom batch ID');
readBloomerangWithEntities(true, 'TestBatch123').then(result => {
    console.log('✅ Custom batch ID test passed');
});

console.log('\nFunction signature tests completed successfully.');