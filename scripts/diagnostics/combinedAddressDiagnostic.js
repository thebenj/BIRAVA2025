/**
 * DIAGNOSTIC SCRIPT: Combined Address Detection and Splitting
 *
 * Purpose: Dry-run analysis of VisionAppraisal owner addresses to identify
 * cases where a single address field contains both a PO Box and a street address.
 *
 * Usage (from browser console after loading VisionAppraisal data):
 *   await runCombinedAddressDiagnostic();
 *
 * Or to test specific addresses:
 *   testAddressSplitting("PO BOX 735:^#^:247 MILL POND LANE:^#^:BLOCK ISLAND , RI 02807");
 */

(function() {
    'use strict';

    // ============================================================================
    // DETECTION PATTERNS
    // ============================================================================

    const PO_BOX_PATTERNS = [
        /^P\.?\s*O\.?\s*BOX\s+[A-Z0-9]+/i,  // PO BOX 123, P.O. BOX 123, P O BOX 123, PO BOX D2, PO BOX I
        /^POST\s*OFFICE\s*BOX\s+[A-Z0-9]+/i, // POST OFFICE BOX 123
        /^PO\s*BO\s*X\s*[A-Z0-9]+/i,        // PO BO X302 (typo in source data)
        /^BOX\s+[A-Z0-9]+/i                  // BOX 123 (less common)
    ];

    const STREET_ADDRESS_PATTERN = /^\d+\s+[A-Z]/i;  // Starts with number followed by letter (e.g., "247 MILL POND")

    /**
     * Clean VisionAppraisal tags from a string for pattern matching
     * @param {string} str - String potentially containing tags
     * @returns {string} Cleaned string
     */
    function cleanTagsForMatching(str) {
        if (!str) return '';
        return str
            .replace(/:\^#\^:/g, ', ')      // :^#^: → comma+space
            .replace(/::#\^#::/g, ', ')     // ::#^#:: → comma+space
            .trim();
    }

    /**
     * Check if a line looks like a PO Box address
     */
    function isPOBoxLine(line) {
        const cleaned = cleanTagsForMatching(line);
        return PO_BOX_PATTERNS.some(pattern => pattern.test(cleaned));
    }

    /**
     * Check if a line looks like a street address (starts with a number)
     */
    function isStreetAddressLine(line) {
        const cleaned = cleanTagsForMatching(line);
        return STREET_ADDRESS_PATTERN.test(cleaned);
    }

    /**
     * Check if a line looks like city/state/zip
     */
    function isCityStateZipLine(line) {
        const cleaned = cleanTagsForMatching(line);
        // Pattern: ends with state abbreviation and/or zip code
        return /\b[A-Z]{2}\s*\d{5}(-\d{4})?$/.test(cleaned) ||
               /,\s*[A-Z]{2}\s*\d{5}/.test(cleaned) ||
               /\b(BLOCK ISLAND|NEW SHOREHAM)\s*,?\s*RI/i.test(cleaned);
    }

    // ============================================================================
    // ADDRESS SPLITTING LOGIC
    // ============================================================================

    /**
     * Analyze an address string and determine if it should be split
     * @param {string} rawAddress - Raw address with VisionAppraisal tags
     * @returns {Object} Analysis result
     */
    function analyzeAddress(rawAddress) {
        const result = {
            original: rawAddress,
            shouldSplit: false,
            reason: null,
            lines: [],
            lineAnalysis: [],
            poBoxLine: null,
            streetLine: null,
            cityStateZipLine: null,
            splitAddresses: null
        };

        if (!rawAddress || typeof rawAddress !== 'string') {
            result.reason = 'Empty or invalid address';
            return result;
        }

        // Split on VisionAppraisal tags to get original lines
        // :^#^: is line break within a field
        // ::#^#:: is field delimiter (less common in owner addresses)
        const lines = rawAddress
            .split(/::#\^#::|:\^#\^:/)
            .map(l => l.trim())
            .filter(l => l.length > 0);

        result.lines = lines;

        // Analyze each line
        for (const line of lines) {
            const analysis = {
                text: line,
                isPOBox: isPOBoxLine(line),
                isStreetAddress: isStreetAddressLine(line),
                isCityStateZip: isCityStateZipLine(line)
            };
            result.lineAnalysis.push(analysis);

            if (analysis.isPOBox) result.poBoxLine = line;
            if (analysis.isStreetAddress && !analysis.isPOBox) result.streetLine = line;
            if (analysis.isCityStateZip) result.cityStateZipLine = line;
        }

        // Determine if this is a combined address that should be split
        if (result.poBoxLine && result.streetLine) {
            result.shouldSplit = true;
            result.reason = 'Contains both PO Box and street address';

            // Build split addresses
            result.splitAddresses = buildSplitAddresses(result);
        } else if (result.poBoxLine && !result.streetLine) {
            result.reason = 'PO Box only - no split needed';
        } else if (result.streetLine && !result.poBoxLine) {
            result.reason = 'Street address only - no split needed';
        } else if (lines.length === 1) {
            result.reason = 'Single line address - no split needed';
        } else {
            result.reason = 'Multi-line but no clear PO Box + Street pattern detected';
        }

        return result;
    }

    /**
     * Build two separate address strings from a combined address
     *
     * APPROACH: Work with the ORIGINAL string directly.
     * - Version 1 (PO Box only): Remove the street address segment from original
     * - Version 2 (Street only): Remove the PO Box segment from original
     * - Clean up any resulting double delimiters or empty segments
     *
     * @param {Object} analysis - Result from analyzeAddress
     * @returns {Object} Two address strings
     */
    function buildSplitAddresses(analysis) {
        const { original, poBoxLine, streetLine } = analysis;

        // VisionAppraisal uses TWO different delimiter patterns:
        // ::#^#:: - field delimiter (more common in this data)
        // :^#^:   - line break within field
        const DELIMITERS = ['::#^#::', ':^#^:'];

        // Version 1: Remove street address from original string
        // This leaves: PO Box + city/state/zip
        let poBoxVersion = original;
        if (streetLine) {
            // Remove the street line text from the original
            poBoxVersion = poBoxVersion.replace(streetLine, '');
        }
        // Clean up: remove empty segments for BOTH delimiter types
        for (const delim of DELIMITERS) {
            poBoxVersion = cleanupEmptySegments(poBoxVersion, delim);
        }

        // Version 2: Remove PO Box from original string
        // This leaves: street address + city/state/zip
        let streetVersion = original;
        if (poBoxLine) {
            // Remove the PO Box line text from the original
            streetVersion = streetVersion.replace(poBoxLine, '');
        }
        // Clean up: remove empty segments for BOTH delimiter types
        for (const delim of DELIMITERS) {
            streetVersion = cleanupEmptySegments(streetVersion, delim);
        }

        return {
            poBoxAddress: poBoxVersion,
            streetAddress: streetVersion,
            // For diagnostic display, show what was removed
            removedForPOBox: streetLine,
            removedForStreet: poBoxLine
        };
    }

    /**
     * Clean up empty segments resulting from text removal
     * - Remove double delimiters (delimiter immediately followed by delimiter)
     * - Remove leading delimiter
     * - Remove trailing delimiter
     * - Trim whitespace around delimiters
     *
     * @param {string} str - String with potential empty segments
     * @param {string} delimiter - The delimiter to check for
     * @returns {string} Cleaned string
     */
    function cleanupEmptySegments(str, delimiter) {
        if (!str) return '';

        let result = str;

        // Handle whitespace around where text was removed
        // Pattern: delimiter + whitespace only + delimiter → single delimiter
        const delimEscaped = delimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const doubleDelimPattern = new RegExp(delimEscaped + '\\s*' + delimEscaped, 'g');

        // Keep replacing until no more double delimiters
        let previousResult;
        do {
            previousResult = result;
            result = result.replace(doubleDelimPattern, delimiter);
        } while (result !== previousResult);

        // Remove leading delimiter (with optional whitespace)
        const leadingPattern = new RegExp('^\\s*' + delimEscaped + '\\s*');
        result = result.replace(leadingPattern, '');

        // Remove trailing delimiter (with optional whitespace)
        const trailingPattern = new RegExp('\\s*' + delimEscaped + '\\s*$');
        result = result.replace(trailingPattern, '');

        // Final trim
        result = result.trim();

        return result;
    }

    // ============================================================================
    // DIAGNOSTIC FUNCTIONS
    // ============================================================================

    /**
     * Test a single address and log detailed analysis
     */
    function testAddressSplitting(rawAddress) {
        console.log('\n' + '='.repeat(80));
        console.log('ADDRESS SPLITTING DIAGNOSTIC');
        console.log('='.repeat(80));

        const analysis = analyzeAddress(rawAddress);

        console.log('\n📥 ORIGINAL ADDRESS:');
        console.log(`   "${rawAddress}"`);

        console.log('\n📋 PARSED LINES:');
        analysis.lines.forEach((line, i) => {
            console.log(`   Line ${i + 1}: "${line}"`);
        });

        console.log('\n🔍 LINE ANALYSIS:');
        analysis.lineAnalysis.forEach((la, i) => {
            const flags = [];
            if (la.isPOBox) flags.push('📬 PO Box');
            if (la.isStreetAddress) flags.push('🏠 Street');
            if (la.isCityStateZip) flags.push('📍 City/State/Zip');
            console.log(`   Line ${i + 1}: ${flags.length > 0 ? flags.join(', ') : '(no pattern match)'}`);
        });

        console.log('\n📊 DETECTION RESULT:');
        console.log(`   Should Split: ${analysis.shouldSplit ? '✅ YES' : '❌ NO'}`);
        console.log(`   Reason: ${analysis.reason}`);

        if (analysis.splitAddresses) {
            console.log('\n✂️ SPLIT RESULT (using original string approach):');
            console.log(`   PO Box version:   "${analysis.splitAddresses.poBoxAddress}"`);
            console.log(`     (removed: "${analysis.splitAddresses.removedForPOBox}")`);
            console.log(`   Street version:   "${analysis.splitAddresses.streetAddress}"`);
            console.log(`     (removed: "${analysis.splitAddresses.removedForStreet}")`);
        }

        console.log('\n' + '='.repeat(80));

        return analysis;
    }

    /**
     * Run diagnostic on all VisionAppraisal records
     * Requires VisionAppraisal data to be loaded first
     */
    async function runCombinedAddressDiagnostic() {
        console.log('\n' + '█'.repeat(80));
        console.log('COMBINED ADDRESS DIAGNOSTIC - FULL SCAN');
        console.log('█'.repeat(80));

        // Load VisionAppraisal data
        console.log('\n📚 Loading VisionAppraisal records...');

        let records;
        try {
            const response = await VisionAppraisal.loadProcessedDataFromGoogleDrive();
            if (!response.success) {
                console.error('❌ Failed to load VisionAppraisal data:', response.error);
                return;
            }
            records = response.data;
            console.log(`✅ Loaded ${records.length} records`);
        } catch (error) {
            console.error('❌ Error loading data:', error);
            return;
        }

        // Analyze all owner addresses
        const results = {
            total: 0,
            withOwnerAddress: 0,
            shouldSplit: [],
            poBoxOnly: [],
            streetOnly: [],
            noPattern: [],
            errors: []
        };

        console.log('\n🔍 Analyzing owner addresses...\n');

        for (const record of records) {
            results.total++;

            const ownerAddress = record.ownerAddress;
            if (!ownerAddress) continue;

            results.withOwnerAddress++;

            try {
                const analysis = analyzeAddress(ownerAddress);
                analysis.fireNumber = record.fireNumber || 'N/A';
                analysis.owner = record.owner || 'Unknown';

                if (analysis.shouldSplit) {
                    results.shouldSplit.push(analysis);
                } else if (analysis.poBoxLine && !analysis.streetLine) {
                    results.poBoxOnly.push(analysis);
                } else if (analysis.streetLine && !analysis.poBoxLine) {
                    results.streetOnly.push(analysis);
                } else {
                    results.noPattern.push(analysis);
                }
            } catch (error) {
                results.errors.push({ record, error: error.message });
            }
        }

        // Summary
        console.log('\n' + '─'.repeat(80));
        console.log('📊 SUMMARY');
        console.log('─'.repeat(80));
        console.log(`   Total records:           ${results.total}`);
        console.log(`   With owner address:      ${results.withOwnerAddress}`);
        console.log(`   ✂️  Should split:          ${results.shouldSplit.length}`);
        console.log(`   📬 PO Box only:           ${results.poBoxOnly.length}`);
        console.log(`   🏠 Street only:           ${results.streetOnly.length}`);
        console.log(`   ❓ No clear pattern:      ${results.noPattern.length}`);
        console.log(`   ❌ Errors:                ${results.errors.length}`);

        // Detail on addresses that should be split
        if (results.shouldSplit.length > 0) {
            console.log('\n' + '─'.repeat(80));
            console.log('✂️ ADDRESSES THAT WOULD BE SPLIT');
            console.log('─'.repeat(80));

            for (const analysis of results.shouldSplit) {
                console.log(`\n🔥 Fire #${analysis.fireNumber} - ${analysis.owner}`);
                console.log(`   Original:      "${analysis.original}"`);
                console.log(`   → PO Box ver:  "${analysis.splitAddresses.poBoxAddress}"`);
                console.log(`   → Street ver:  "${analysis.splitAddresses.streetAddress}"`);
            }
        }

        // Show some of the "no pattern" cases for review
        if (results.noPattern.length > 0) {
            console.log('\n' + '─'.repeat(80));
            console.log('❓ SAMPLE OF "NO CLEAR PATTERN" CASES (first 10)');
            console.log('─'.repeat(80));

            for (const analysis of results.noPattern.slice(0, 10)) {
                console.log(`\n🔥 Fire #${analysis.fireNumber}`);
                console.log(`   Original: "${analysis.original}"`);
                console.log(`   Lines: ${analysis.lines.length}`);
                console.log(`   Reason: ${analysis.reason}`);
            }
        }

        console.log('\n' + '█'.repeat(80));
        console.log('DIAGNOSTIC COMPLETE');
        console.log('█'.repeat(80));

        // Return results for further inspection
        window.combinedAddressDiagnosticResults = results;
        console.log('\n💡 Results stored in: window.combinedAddressDiagnosticResults');

        return results;
    }

    // ============================================================================
    // EXPORT FOR CONSOLE ACCESS
    // ============================================================================

    window.testAddressSplitting = testAddressSplitting;
    window.analyzeAddress = analyzeAddress;
    window.runCombinedAddressDiagnostic = runCombinedAddressDiagnostic;
    window.ping = function() { console.log('pong'); };

    console.log('✅ Combined Address Diagnostic loaded (v4 - handles both ::#^#:: and :^#^: delimiters)');
    console.log('   Run: await runCombinedAddressDiagnostic()');
    console.log('   Or test single: testAddressSplitting("PO BOX 735:^#^:247 MILL POND LANE:^#^:BLOCK ISLAND , RI 02807")');

})();
