// Address Terms Extraction Script
// Run this in browser console after loading the application and authenticating with Google Drive

async function extractAddressTermsFromEntities() {
    console.log('🔍 Starting address term extraction from VisionAppraisal entities...');

    try {
        // Load entity data from Google Drive File ID: 19cgccMYNBboL07CmMP-5hNNGwEUBXgCI
        console.log('📥 Loading VisionAppraisal entities from Google Drive...');
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/19cgccMYNBboL07CmMP-5hNNGwEUBXgCI?alt=media`, {
            headers: { 'Authorization': `Bearer ${gapi.client.getToken().access_token}` }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch entities: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const entities = data.entities || [];

        console.log(`📊 Loaded ${entities.length} entities`);

        // Extract primaryAddress originalAddress terms
        const primaryAddressTerms = [];
        const secondaryAddressTerms = [];
        let primaryCount = 0;
        let secondaryCount = 0;

        console.log('🔄 Processing entities for address terms...');

        entities.forEach((entity, index) => {
            try {
                // Extract primary address original term
                const contactInfo = entity.contactInfo;
                if (contactInfo && contactInfo.primaryAddress && contactInfo.primaryAddress.originalAddress) {
                    const primaryAddr = contactInfo.primaryAddress.originalAddress;
                    if (primaryAddr.term) {
                        primaryAddressTerms.push({
                            entityIndex: index,
                            entityType: entity.type || 'Unknown',
                            PID: entity.PID,
                            term: primaryAddr.term
                        });
                        primaryCount++;
                    }
                }

                // Extract secondary address original terms (FIXED: singular 'secondaryAddress')
                if (contactInfo && contactInfo.secondaryAddress && Array.isArray(contactInfo.secondaryAddress)) {
                    contactInfo.secondaryAddress.forEach((addr, addrIndex) => {
                        if (addr && addr.originalAddress && addr.originalAddress.term) {
                            secondaryAddressTerms.push({
                                entityIndex: index,
                                entityType: entity.type || 'Unknown',
                                PID: entity.PID,
                                addressIndex: addrIndex,
                                term: addr.originalAddress.term
                            });
                            secondaryCount++;
                        }
                    });
                }
            } catch (err) {
                console.warn(`⚠️ Error processing entity ${index}:`, err);
            }
        });

        console.log(`✅ Found ${primaryAddressTerms.length} primary address terms`);
        console.log(`✅ Found ${secondaryAddressTerms.length} secondary address terms`);

        // Show sample data
        if (primaryAddressTerms.length > 0) {
            console.log('📋 Sample primary address terms:');
            console.log(primaryAddressTerms.slice(0, 5));
        }

        if (secondaryAddressTerms.length > 0) {
            console.log('📋 Sample secondary address terms:');
            console.log(secondaryAddressTerms.slice(0, 5));
        }

        // Create downloadable files
        const primaryData = JSON.stringify(primaryAddressTerms, null, 2);
        const secondaryData = JSON.stringify(secondaryAddressTerms, null, 2);

        // Download primary address terms file
        const primaryBlob = new Blob([primaryData], { type: 'application/json' });
        const primaryUrl = URL.createObjectURL(primaryBlob);
        const primaryLink = document.createElement('a');
        primaryLink.href = primaryUrl;
        primaryLink.download = 'primaryAddress_originalAddress_terms.json';
        primaryLink.style.display = 'none';
        document.body.appendChild(primaryLink);
        primaryLink.click();
        document.body.removeChild(primaryLink);
        URL.revokeObjectURL(primaryUrl);

        // Download secondary address terms file
        const secondaryBlob = new Blob([secondaryData], { type: 'application/json' });
        const secondaryUrl = URL.createObjectURL(secondaryBlob);
        const secondaryLink = document.createElement('a');
        secondaryLink.href = secondaryUrl;
        secondaryLink.download = 'secondaryAddress_originalAddress_terms.json';
        secondaryLink.style.display = 'none';
        document.body.appendChild(secondaryLink);
        secondaryLink.click();
        document.body.removeChild(secondaryLink);
        URL.revokeObjectURL(secondaryUrl);

        console.log('💾 Files downloaded successfully!');
        console.log('- primaryAddress_originalAddress_terms.json');
        console.log('- secondaryAddress_originalAddress_terms.json');

        return {
            totalEntities: entities.length,
            primaryCount: primaryAddressTerms.length,
            secondaryCount: secondaryAddressTerms.length,
            primaryTerms: primaryAddressTerms,
            secondaryTerms: secondaryAddressTerms
        };

    } catch (error) {
        console.error('❌ Error extracting address terms:', error);
        throw error;
    }
}

// Auto-execute if running in browser
if (typeof window !== 'undefined') {
    console.log('🚀 Address Terms Extraction Script Loaded');
    console.log('Run: extractAddressTermsFromEntities()');
}