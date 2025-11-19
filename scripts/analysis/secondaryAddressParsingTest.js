// Secondary Address Parsing Test - Process All Records and Save to CSV
// Tests all secondary address terms through Individual constructor and saves results to CSV

async function runSecondaryAddressParsingTest() {
    console.log('🔍 Running secondary address parsing test on all records...');

    try {
        // Load all secondary address terms
        const response = await fetch('http://127.0.0.99:3000/csv-file?file=secondaryAddress_originalAddress_terms (1).json');
        const secondaryTerms = await response.json();

        console.log(`📊 Loaded ${secondaryTerms.length} secondary address terms`);
        console.log('⚙️ Processing all records (no detailed output)...');

        // Process ALL terms through Individual constructor
        const results = [];
        let processed = 0;

        secondaryTerms.forEach((item, index) => {
            try {
                // Create Individual with secondary address as ownerAddress:
                // constructor(locationIdentifier, name, propertyLocation = null, ownerAddress = null, accountNumber = null)
                const individual = new Individual(
                    String(index),        // locationIdentifier (string)
                    'Test Name',          // name
                    null,                 // propertyLocation (null)
                    item.term,            // ownerAddress (the secondary address term we're testing)
                    'TEST123'             // accountNumber
                );

                // Extract secondary address fields from secondaryAddress array
                const secondaryAddresses = individual.contactInfo?.secondaryAddress;
                if (Array.isArray(secondaryAddresses) && secondaryAddresses.length > 0) {
                    // Use the first secondary address
                    const secondaryAddr = secondaryAddresses[0];

                    results.push({
                        entityIndex: item.entityIndex || index,
                        entityType: item.entityType || 'Unknown',
                        addressIndex: item.addressIndex || 0,
                        original: item.term,
                        streetNumber: secondaryAddr.streetNumber?.term || secondaryAddr.streetNumber || 'NOT PARSED',
                        streetName: secondaryAddr.streetName?.term || secondaryAddr.streetName || 'NOT PARSED',
                        streetType: secondaryAddr.streetType?.term || secondaryAddr.streetType || 'NOT PARSED',
                        secUnitType: secondaryAddr.secUnitType?.term || secondaryAddr.secUnitType || 'NOT PARSED',
                        secUnitNum: secondaryAddr.secUnitNum?.term || secondaryAddr.secUnitNum || 'NOT PARSED',
                        city: secondaryAddr.city?.term || secondaryAddr.city || 'NOT PARSED',
                        state: secondaryAddr.state?.term || secondaryAddr.state || 'NOT PARSED',
                        zip: secondaryAddr.zipCode?.term || secondaryAddr.zipCode || 'NOT PARSED',
                        originalTerm: secondaryAddr.originalAddress?.term || 'NOT FOUND'
                    });
                } else {
                    results.push({
                        entityIndex: item.entityIndex || index,
                        entityType: item.entityType || 'Unknown',
                        addressIndex: item.addressIndex || 0,
                        original: item.term,
                        streetNumber: 'NO SECONDARY ADDRESS',
                        streetName: 'NO SECONDARY ADDRESS',
                        streetType: 'NO SECONDARY ADDRESS',
                        secUnitType: 'NO SECONDARY ADDRESS',
                        secUnitNum: 'NO SECONDARY ADDRESS',
                        city: 'NO SECONDARY ADDRESS',
                        state: 'NO SECONDARY ADDRESS',
                        zip: 'NO SECONDARY ADDRESS',
                        originalTerm: 'NO SECONDARY ADDRESS'
                    });
                }

                processed++;
                if (processed % 500 === 0) {
                    console.log(`⚙️ Processed ${processed}/${secondaryTerms.length} records...`);
                }

            } catch (err) {
                console.error(`❌ Error processing record ${index}:`, err);
                results.push({
                    entityIndex: item.entityIndex || index,
                    entityType: item.entityType || 'Unknown',
                    addressIndex: item.addressIndex || 0,
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
        const csvHeader = 'entityIndex,entityType,addressIndex,original,streetNumber,streetName,streetType,secUnitType,secUnitNum,city,state,zip,originalTerm\n';
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
                escapeCSV(row.addressIndex),
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
                filename: 'secondaryAddressParsingTest_results.csv',
                data: csvContent
            })
        });

        if (saveResponse.ok) {
            console.log('💾 Results saved to secondaryAddressParsingTest_results.csv');
        } else {
            console.error('❌ Failed to save CSV file');
        }

        // Return summary
        return {
            totalProcessed: results.length,
            successfulParses: results.filter(r => r.streetNumber !== 'NOT PARSED' && r.streetNumber !== 'NO SECONDARY ADDRESS' && r.streetNumber !== 'ERROR').length,
            errors: results.filter(r => r.streetNumber === 'ERROR').length,
            noSecondaryAddress: results.filter(r => r.streetNumber === 'NO SECONDARY ADDRESS').length,
            taggedAddresses: results.filter(r => r.original.includes('::#^#::') || r.original.includes(':^#^:')).length
        };

    } catch (error) {
        console.error('❌ Error running secondary address parsing test:', error);
        throw error;
    }
}

// Export for browser use
if (typeof window !== 'undefined') {
    window.runSecondaryAddressParsingTest = runSecondaryAddressParsingTest;
    console.log('🚀 Secondary Address Parsing Test loaded');
    console.log('Run: runSecondaryAddressParsingTest()');
}