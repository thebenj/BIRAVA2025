// VisionAppraisal Data Parser Functions
// Functions for parsing and cleaning VisionAppraisal data fields
//
// Context: VisionAppraisal CSV data contains encoded tags to handle commas and line breaks:
// - :^#^: represents commas that were removed to prevent CSV parsing issues
// - ::#^#:: represents line breaks that were converted to prevent CSV parsing issues
//
// This parser cleans these tags and expands structured fields like MBLU into components

const VisionAppraisalParser = {

    /**
     * Parse MBLU field into component parts
     *
     * MBLU (Map-Block-Lot-Unit) is a slash-delimited property identifier used by VisionAppraisal
     * Format: "MAP/BLOCK/LOT/UNIT/UNITCUT" where some fields may be empty
     *
     * Input examples:
     * - "06/  /  072/  01/" → Map: "06", Block: "", Lot: "072", Unit: "01", UnitCut: ""
     * - "19/ / 009/ 02 /" → Map: "19", Block: "", Lot: "009", Unit: "02", UnitCut: ""
     *
     * Output: { map, block, lot, unit, unitCut, _legacy }
     */
    parseMBLU(mbluString) {
        if (!mbluString || typeof mbluString !== 'string') {
            return {
                map: '',
                block: '',
                lot: '',
                unit: '',
                unitCut: '',
                _legacy: mbluString || ''
            };
        }

        // Clean and split by forward slashes
        const parts = mbluString.trim().split('/');

        // Initialize result object with legacy field
        const result = {
            map: '',
            block: '',
            lot: '',
            unit: '',
            unitCut: '',
            _legacy: mbluString
        };

        // Parse based on the slash-separated structure
        // Expected patterns: "MAP/  /  LOT/  UNIT/" or "MAP/ / LOT/ UNIT /"
        if (parts.length >= 2) {
            // Map is first part
            result.map = parts[0].trim();

            // Block is second part (often empty with spaces)
            result.block = parts[1].trim();

            if (parts.length >= 3) {
                // Lot is third part
                result.lot = parts[2].trim();

                if (parts.length >= 4) {
                    // Unit is fourth part
                    result.unit = parts[3].trim();

                    if (parts.length >= 5) {
                        // Unit Cut is fifth part (if it exists)
                        result.unitCut = parts[4].trim();
                    }
                }
            }
        }

        return result;
    },

    /**
     * Parse owner address field with tag cleanup
     *
     * VisionAppraisal addresses contain encoded tags that need cleaning:
     * - ::#^#:: represents line breaks (separates street from city/state/zip)
     * - :^#^: represents commas within address components
     *
     * Input examples:
     * - "29 CEDAR STREET::#^#::EAST GREENWICH:^#^: RI 02818"
     * - "PO BOX 1934::#^#::BLOCK ISLAND:^#^: RI 02807"
     *
     * Output: { street, city, state, zip, _legacy }
     * - street: Everything before first ::#^#::
     * - city/state/zip: Parsed from everything after ::#^#:: with comma tags removed
     */
    parseAddress(addressString) {
        if (!addressString || typeof addressString !== 'string') {
            return {
                street: '',
                city: '',
                state: '',
                zip: '',
                _legacy: addressString || ''
            };
        }

        const result = {
            street: '',
            city: '',
            state: '',
            zip: '',
            _legacy: addressString
        };

        // Split by line break marker (::#^#::)
        const lineParts = addressString.split('::#^#::');

        if (lineParts.length >= 1) {
            result.street = lineParts[0].trim();
        }

        if (lineParts.length >= 2) {
            // Process the city/state/zip portion
            // Remove comma markers (:^#^:) and parse
            const cityStateZip = lineParts[1].replace(/:?\^#\^:/g, '').trim();

            // Split by spaces to extract state and ZIP
            const parts = cityStateZip.split(/\s+/);

            if (parts.length >= 3) {
                // Last part is ZIP, second to last is state, rest is city
                result.zip = parts[parts.length - 1];
                result.state = parts[parts.length - 2];
                result.city = parts.slice(0, -2).join(' ');
            } else if (parts.length === 2) {
                // Only state and ZIP
                result.state = parts[0];
                result.zip = parts[1];
            } else if (parts.length === 1) {
                // Only one part, assume it's city
                result.city = parts[0];
            }
        }

        return result;
    },

    /**
     * Process and concatenate owner name fields with smart spacing
     *
     * VisionAppraisal owner names are split across two fields and contain comma tags.
     * This function cleans the tags and intelligently concatenates the names.
     *
     * Tag cleaning:
     * - :^#^: → , (comma with no space before)
     * - ::#^#:: → (space)
     *
     * Input examples:
     * - name1: "HARBOR POND:^#^: J & L LLC", name2: "JANE & LOWELL ROSMAN"
     * - name1: "O;NEIL:^#^: ERIN", name2: ""
     *
     * Output: { name, _legacy1, _legacy2 }
     * - name: Cleaned and concatenated owner name
     * - _legacy1, _legacy2: Original unprocessed values for reference
     */
    processOwnerNames(name1, name2) {
        const result = {
            name: '',
            _legacy1: name1 || '',
            _legacy2: name2 || ''
        };

        // Clean individual names by replacing tags
        const cleanName1 = this.cleanNameTags(name1 || '');
        const cleanName2 = this.cleanNameTags(name2 || '');

        // Smart concatenation logic
        if (cleanName1 && cleanName2) {
            // Both names exist - add comma and space between them (no space before comma)
            result.name = `${cleanName1}, ${cleanName2}`;
        } else if (cleanName1) {
            result.name = cleanName1;
        } else if (cleanName2) {
            result.name = cleanName2;
        }

        return result;
    },

    /**
     * Clean name tags and replace with appropriate characters
     */
    cleanNameTags(nameString) {
        if (!nameString || typeof nameString !== 'string') {
            return '';
        }

        let cleaned = nameString
            // Replace comma tags with commas
            .replace(/:?\^#\^:/g, ',')
            // Replace line break tags with spaces
            .replace(/::#\^#::/g, ' ')
            // Clean up multiple spaces
            .replace(/\s+/g, ' ')
            .trim();

        return cleaned;
    },

    /**
     * Determine if a space should be added between two name parts
     * Uses fuzzy logic to decide based on content patterns
     */
    shouldAddSpace(name1, name2) {
        // Always add space if either ends/starts with specific patterns
        const name1Trimmed = name1.trim();
        const name2Trimmed = name2.trim();

        // Add space if name1 doesn't end with punctuation/comma
        if (!name1Trimmed.match(/[,.]$/)) {
            return true;
        }

        // Add space if name2 starts with a capital letter (likely separate word)
        if (name2Trimmed.match(/^[A-Z]/)) {
            return true;
        }

        // Default: add space for safety
        return true;
    },

    /**
     * Test function to validate MBLU parsing
     */
    testMBLU() {
        const testCases = [
            "06/  /  072/  01/",
            "19/ / 009/ 02 /",
            "15/  /  067/  /",
            "05/  /  120/01 /"
        ];

        console.log("=== MBLU Parser Tests ===");
        testCases.forEach((test, index) => {
            const result = this.parseMBLU(test);
            console.log(`Test ${index + 1}: "${test}"`);
            console.log(`  Map: "${result.map}", Block: "${result.block}", Lot: "${result.lot}", Unit: "${result.unit}", UnitCut: "${result.unitCut}"`);
            console.log('');
        });
    },

    /**
     * Test function to validate address parsing
     */
    testAddress() {
        const testCases = [
            "29 CEDAR STREET::#^#::EAST GREENWICH:^#^: RI 02818",
            "PO BOX 1934::#^#::BLOCK ISLAND:^#^: RI 02807",
            "300 MAYAPPLE RD::#^#::STAMFORD:^#^: CT 06903"
        ];

        console.log("=== Address Parser Tests ===");
        testCases.forEach((test, index) => {
            const result = this.parseAddress(test);
            console.log(`Test ${index + 1}: "${test}"`);
            console.log(`  Street: "${result.street}"`);
            console.log(`  City: "${result.city}"`);
            console.log(`  State: "${result.state}"`);
            console.log(`  ZIP: "${result.zip}"`);
            console.log('');
        });
    },

    /**
     * Test function to validate owner name processing
     */
    testOwnerNames() {
        const testCases = [
            ["LEGAULT NICOLE & WEST LISA", ""],
            ["O;NEIL:^#^: ERIN", ""],
            ["SABBIA:^#^: BERIT M:^#^: TRUSTEE 2019 REV TRUST", ""],
            ["HARBOR POND:^#^: J & L LLC", "JANE & LOWELL ROSMAN"]
        ];

        console.log("=== Owner Name Parser Tests ===");
        testCases.forEach((test, index) => {
            const result = this.processOwnerNames(test[0], test[1]);
            console.log(`Test ${index + 1}: "${test[0]}" + "${test[1]}"`);
            console.log(`  Result: "${result.name}"`);
            console.log('');
        });
    }
};

// Make available globally for testing
if (typeof window !== 'undefined') {
    window.VisionAppraisalParser = VisionAppraisalParser;
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VisionAppraisalParser;
}