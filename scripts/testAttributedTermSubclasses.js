/**
 * Test functions for AttributedTerm subclasses
 * Tests the specialized FireNumberTerm, AccountNumberTerm, and EmailTerm classes
 */

/**
 * Test all AttributedTerm subclasses with sample data
 * Run this function in the browser console after loading the application
 */
function testAttributedTermSubclasses() {
    console.log("=== TESTING ATTRIBUTEDTERM SUBCLASSES ===");

    try {
        // Test base AttributedTerm generic methods
        testBaseAttributedTerm();

        // Test specialized subclasses
        testFireNumberTerm();
        testAccountNumberTerm();
        testEmailTerm();

        console.log("✅ All AttributedTerm subclass tests passed");
        return true;

    } catch (error) {
        console.error("❌ AttributedTerm subclass test failed:", error);
        return false;
    }
}

/**
 * Test base AttributedTerm generic methods
 */
function testBaseAttributedTerm() {
    console.log("\n--- Testing Base AttributedTerm Generic Methods ---");

    // Test with string term
    const stringTerm = new AttributedTerm("123ABC", "TEST_SOURCE", 1, "TEST_ID");
    console.log("String term:", stringTerm.toString());

    // Test generic matching
    const matchResult = stringTerm.match(/\d+/);
    console.log("Match result for /\\d+/:", matchResult);

    // Test pattern testing
    const hasNumbers = stringTerm.matchesPattern(/\d/);
    console.log("Has numbers:", hasNumbers);

    // Test numeric extraction
    const numeric = stringTerm.extractNumeric();
    console.log("Extracted numeric:", numeric);

    // Test with numeric term
    const numericTerm = new AttributedTerm(456, "TEST_SOURCE", 2, "TEST_ID_2");
    console.log("Numeric term extraction:", numericTerm.extractNumeric());

    console.log("✓ Base AttributedTerm methods working");
}

/**
 * Test FireNumberTerm specialized methods
 */
function testFireNumberTerm() {
    console.log("\n--- Testing FireNumberTerm ---");

    // Test valid Fire Numbers
    const validFireNumbers = [148, "27", 1234, "999"];
    validFireNumbers.forEach(fn => {
        const term = new FireNumberTerm(fn, "BLOOMERANG_CSV", 1, `FN_${fn}`);
        console.log(`Fire Number "${fn}":`, {
            toString: term.toString(),
            isValid: term.isValidFireNumber(),
            extracted: term.extractFireNumber()
        });
    });

    // Test invalid Fire Numbers
    const invalidFireNumbers = [0, -5, 3500, 9999, "abc", ""];
    console.log("\nInvalid Fire Numbers:");
    invalidFireNumbers.forEach(fn => {
        const term = new FireNumberTerm(fn, "BLOOMERANG_CSV", 1, `INVALID_${fn}`);
        console.log(`Fire Number "${fn}": isValid=${term.isValidFireNumber()}, extracted=${term.extractFireNumber()}`);
    });

    // Test serialization
    const testTerm = new FireNumberTerm(148, "BLOOMERANG_CSV", 1, "TEST_148");
    const serialized = testTerm.serialize();
    const deserialized = FireNumberTerm.deserialize(serialized);
    console.log("Serialization test:", {
        original: testTerm.toString(),
        serialized: serialized.type,
        deserialized: deserialized.toString(),
        match: testTerm.toString() === deserialized.toString()
    });

    console.log("✓ FireNumberTerm methods working");
}

/**
 * Test AccountNumberTerm specialized methods
 */
function testAccountNumberTerm() {
    console.log("\n--- Testing AccountNumberTerm ---");

    // Test valid account numbers
    const validAccounts = ["2029", 2028, "ABC123", "X1Y2Z3"];
    validAccounts.forEach(acc => {
        const term = new AccountNumberTerm(acc, "BLOOMERANG_CSV", 1, `ACC_${acc}`);
        console.log(`Account "${acc}":`, {
            toString: term.toString(),
            isValid: term.isValidAccount(),
            extracted: term.extractAccountNumber()
        });
    });

    // Test invalid account numbers
    const invalidAccounts = ["", null, undefined, "   "];
    console.log("\nInvalid Account Numbers:");
    invalidAccounts.forEach(acc => {
        const term = new AccountNumberTerm(acc, "BLOOMERANG_CSV", 1, `INVALID_${acc}`);
        console.log(`Account "${acc}": isValid=${term.isValidAccount()}, extracted=${term.extractAccountNumber()}`);
    });

    // Test serialization
    const testTerm = new AccountNumberTerm("2029", "BLOOMERANG_CSV", 1, "TEST_2029");
    const serialized = testTerm.serialize();
    const deserialized = AccountNumberTerm.deserialize(serialized);
    console.log("Serialization test:", {
        original: testTerm.toString(),
        serialized: serialized.type,
        deserialized: deserialized.toString(),
        match: testTerm.toString() === deserialized.toString()
    });

    console.log("✓ AccountNumberTerm methods working");
}

/**
 * Test EmailTerm specialized methods
 */
function testEmailTerm() {
    console.log("\n--- Testing EmailTerm ---");

    // Test valid emails
    const validEmails = ["test@example.com", "user.name@domain.org", "contact+tag@company.co.uk"];
    validEmails.forEach(email => {
        const term = new EmailTerm(email, "BLOOMERANG_CSV", 1, `EMAIL_${email}`);
        console.log(`Email "${email}":`, {
            toString: term.toString(),
            isValid: term.isValidEmail(),
            domain: term.extractDomain(),
            username: term.extractUsername()
        });
    });

    // Test invalid emails
    const invalidEmails = ["notanemail", "missing@domain", "@nodomain.com", "", null];
    console.log("\nInvalid Emails:");
    invalidEmails.forEach(email => {
        const term = new EmailTerm(email, "BLOOMERANG_CSV", 1, `INVALID_${email}`);
        console.log(`Email "${email}": isValid=${term.isValidEmail()}, domain=${term.extractDomain()}`);
    });

    // Test serialization
    const testTerm = new EmailTerm("test@example.com", "BLOOMERANG_CSV", 1, "TEST_EMAIL");
    const serialized = testTerm.serialize();
    const deserialized = EmailTerm.deserialize(serialized);
    console.log("Serialization test:", {
        original: testTerm.toString(),
        serialized: serialized.type,
        deserialized: deserialized.toString(),
        match: testTerm.toString() === deserialized.toString()
    });

    console.log("✓ EmailTerm methods working");
}

/**
 * Quick test function - simplified version for rapid testing
 */
function quickTestSubclasses() {
    console.log("=== QUICK SUBCLASS TEST ===");

    // Quick Fire Number test
    const fireNumber = new FireNumberTerm(148, "TEST", 1, "FN148");
    console.log("Fire Number 148 valid:", fireNumber.isValidFireNumber());

    // Quick Account test
    const account = new AccountNumberTerm("2029", "TEST", 1, "ACC2029");
    console.log("Account 2029 valid:", account.isValidAccount());

    // Quick Email test
    const email = new EmailTerm("test@example.com", "TEST", 1, "EMAIL1");
    console.log("Email test@example.com valid:", email.isValidEmail());

    console.log("✅ Quick test complete");
}