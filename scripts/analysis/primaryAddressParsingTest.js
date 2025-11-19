// Primary Address Parsing Test - Process All Records and Save to CSV
// Tests all primary address terms through Individual constructor and saves results to CSV

async function runPrimaryAddressParsingTest() {
    console.log('🔍 Running primary address parsing test on all records...');

    try {
        // Load all primary address terms
        const response = await fetch('http://127.0.0.99:3000/csv-file?file=primaryAddress_originalAddress_terms (1).json');
        const primaryTerms = await response.json();

        console.log(`📊 Loaded ${primaryTerms.length} primary address terms`);
        console.log('⚙️ Processing all records (no detailed output)...');

        // Process ALL terms through Individual constructor
        const results = [];
        let processed = 0;

        primaryTerms.forEach((item, index) => {
            try {
                // Create Individual with correct parameter order:
                // constructor(locationIdentifier, name, propertyLocation = null, ownerAddress = null, accountNumber = null)
                const individual = new Individual(
                    String(index),        // locationIdentifier (string)
                    'Test Name',          // name
                    item.term,            // propertyLocation (the term we're testing)
                    null,                 // ownerAddress (null)
                    'TEST123'             // accountNumber
                );

                // Extract primary address fields
                const primaryAddr = individual.contactInfo?.primaryAddress;
                if (primaryAddr) {
                    results.push({
                        entityIndex: item.entityIndex || index,
                        entityType: item.entityType || 'Unknown',
                        original: item.term,
                        streetNumber: primaryAddr.streetNumber?.term || primaryAddr.streetNumber || 'NOT PARSED',
                        streetName: primaryAddr.streetName?.term || primaryAddr.streetName || 'NOT PARSED',
                        streetType: primaryAddr.streetType?.term || primaryAddr.streetType || 'NOT PARSED',
                        secUnitType: primaryAddr.secUnitType?.term || primaryAddr.secUnitType || 'NOT PARSED',
                        secUnitNum: primaryAddr.secUnitNum?.term || primaryAddr.secUnitNum || 'NOT PARSED',
                        city: primaryAddr.city?.term || primaryAddr.city || 'NOT PARSED',
                        state: primaryAddr.state?.term || primaryAddr.state || 'NOT PARSED',
                        zip: primaryAddr.zipCode?.term || primaryAddr.zipCode || 'NOT PARSED',
                        originalTerm: primaryAddr.originalAddress?.term || 'NOT FOUND'
                    });
                } else {
                    results.push({
                        entityIndex: item.entityIndex || index,
                        entityType: item.entityType || 'Unknown',
                        original: item.term,
                        streetNumber: 'NO PRIMARY ADDRESS',
                        streetName: 'NO PRIMARY ADDRESS',
                        streetType: 'NO PRIMARY ADDRESS',
                        secUnitType: 'NO PRIMARY ADDRESS',
                        secUnitNum: 'NO PRIMARY ADDRESS',
                        city: 'NO PRIMARY ADDRESS',
                        state: 'NO PRIMARY ADDRESS',
                        zip: 'NO PRIMARY ADDRESS',
                        originalTerm: 'NO PRIMARY ADDRESS'
                    });
                }

                processed++;
                if (processed % 500 === 0) {
                    console.log(`⚙️ Processed ${processed}/${primaryTerms.length} records...`);
                }

            } catch (err) {
                console.error(`❌ Error processing record ${index}:`, err);
                results.push({
                    entityIndex: item.entityIndex || index,
                    entityType: item.entityType || 'Unknown',
                    original: item.term,
                    streetNumber: 'ERROR',
                    streetName: 'ERROR',
                    streetType: 'ERROR',
                    secUnitType: 'ERROR',
                    secUnitNum: 'ERROR',
                    city: 'ERROR',
                    state: 'ERROR',
                    zip: 'ERROR',
                    originalTerm: 'ERROR'
                });
            }
        });

        console.log(`✅ Processing complete: ${results.length} results`);

        // Convert results to CSV format
        const csvHeader = 'entityIndex,entityType,original,streetNumber,streetName,streetType,secUnitType,secUnitNum,city,state,zip,originalTerm\n';
        const csvRows = results.map(row => {
            // Escape commas and quotes in CSV values
            const escapeCSV = (value) => {
                if (typeof value !== 'string') value = String(value);
                if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                    return '"' + value.replace(/"/g, '""') + '"';
                }
                return value;
            };

            return [
                escapeCSV(row.entityIndex),
                escapeCSV(row.entityType),
                escapeCSV(row.original),
                escapeCSV(row.streetNumber),
                escapeCSV(row.streetName),
                escapeCSV(row.streetType),
                escapeCSV(row.secUnitType),
                escapeCSV(row.secUnitNum),
                escapeCSV(row.city),
                escapeCSV(row.state),
                escapeCSV(row.zip),
                escapeCSV(row.originalTerm)
            ].join(',');
        }).join('\n');

        const csvContent = csvHeader + csvRows;

        // Save CSV to disk via server endpoint
        const saveResponse = await fetch('http://127.0.0.99:3000/api/save-progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filename: 'primaryAddressParsingTest_results.csv',
                data: csvContent
            })
        });

        if (saveResponse.ok) {
            console.log('💾 Results saved to primaryAddressParsingTest_results.csv');
        } else {
            console.error('❌ Failed to save CSV file');
        }

        // Return summary
        return {
            totalProcessed: results.length,
            successfulParses: results.filter(r => r.streetNumber !== 'NOT PARSED' && r.streetNumber !== 'NO PRIMARY ADDRESS' && r.streetNumber !== 'ERROR').length,
            errors: results.filter(r => r.streetNumber === 'ERROR').length,
            noPrimaryAddress: results.filter(r => r.streetNumber === 'NO PRIMARY ADDRESS').length
        };

    } catch (error) {
        console.error('❌ Error running primary address parsing test:', error);
        throw error;
    }
}

// Export for browser use
if (typeof window !== 'undefined') {
    window.runPrimaryAddressParsingTest = runPrimaryAddressParsingTest;
    console.log('🚀 Primary Address Parsing Test loaded');
    console.log('Run: runPrimaryAddressParsingTest()');
}