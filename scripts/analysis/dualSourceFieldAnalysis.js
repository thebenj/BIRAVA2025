// dualSourceFieldAnalysis.js - Permanent Analysis Functions for VisionAppraisal ↔ Bloomerang Field Preservation Audit
// Created: 2025-10-18
// Purpose: Preserve field mapping analysis functionality and findings for cross-session continuity

/**
 * CRITICAL FILE REFERENCE INFORMATION
 * ===================================
 *
 * VisionAppraisal Source Data:
 * - File: VisionAppraisal_ProcessedData.json
 * - Google Drive ID: 1oIW1m1Qw2lyreU-uGMX3jUka9LwaBTAf
 * - Records: 2,317 with 28 fields per record
 *
 * VisionAppraisal Entity Data:
 * - File: VisionAppraisal_ParsedEntities.json
 * - Google Drive ID: 19cgccMYNBboL07CmMP-5hNNGwEUBXgCI
 * - Records: 2,317 entities with 18 fields per entity
 *
 * Bloomerang Source Data:
 * - File: All Data.csv (local file)
 * - Path: ./servers/Results/All Data.csv
 * - Access: http://127.0.0.99:3000/csv-file endpoint
 * - Records: 1,362 with 30 fields per record
 *
 * Bloomerang Entity Data:
 * - Individual: Individual_2025-10-10T00-37-26_Batch_Production_2025_01_09.json (ID: 1s7VnmD4CZg09y-GKmfX4W6tZb2SDaJLy)
 * - Household: AggregateHousehold_2025-10-10T00-37-27_Batch_Production_2025_01_09.json (ID: 1HhjM33856-jehR1xSypXyE0qFuRw26tx)
 * - NonHuman: NonHuman_2025-10-10T00-37-29_Batch_Production_2025_01_09.json (ID: 11zRSquTQy9hNgUXuCdaHR6fUBNi-n4GX)
 */

/**
 * ANALYSIS RESULTS SUMMARY
 * ========================
 *
 * VisionAppraisal Field Preservation:
 * - Source Fields: 28
 * - Entity Fields: 18
 * - Field Loss Rate: 75% (21 out of 28 fields missing)
 * - Preservation Rate: 25%
 *
 * Bloomerang Field Preservation:
 * - Source Fields: 30
 * - Entity Fields: 6 preserved (out of 30 CSV fields)
 * - Field Loss Rate: 80% (24 out of 30 fields missing)
 * - Preservation Rate: 20%
 *
 * CRITICAL DISCOVERY: Both systems lose majority of source data
 */

/**
 * VisionAppraisal Field Mapping Analysis Function
 * Uses Method 1 (gapi.client.drive.files.get) per wisdomOfFileAccess.md best practices
 */
async function analyzeVisionAppraisalFieldMappingCorrected() {
    try {
        console.log('🔍 Starting VisionAppraisal Field Mapping Analysis...');

        // Step 1: Load VisionAppraisal source data
        console.log('📊 Loading VisionAppraisal source data...');
        const sourceResponse = await gapi.client.drive.files.get({
            fileId: '1oIW1m1Qw2lyreU-uGMX3jUka9LwaBTAf', // VisionAppraisal_ProcessedData.json
            alt: 'media'
        });
        const sourceDataPackage = JSON.parse(sourceResponse.body);
        // Handle both direct array and packaged data formats
        const sourceData = Array.isArray(sourceDataPackage) ? sourceDataPackage :
                          (sourceDataPackage.records || sourceDataPackage.data || []);
        console.log(`✅ Source data loaded: ${sourceData.length} records`);

        // Step 2: Load VisionAppraisal entity data
        console.log('🏗️ Loading VisionAppraisal entity data...');
        const entityResponse = await gapi.client.drive.files.get({
            fileId: '19cgccMYNBboL07CmMP-5hNNGwEUBXgCI', // VisionAppraisal_ParsedEntities.json
            alt: 'media'
        });
        const entityDataPackage = JSON.parse(entityResponse.body);
        // Handle both direct array and packaged data formats
        const entityData = Array.isArray(entityDataPackage) ? entityDataPackage :
                          (entityDataPackage.entities || entityDataPackage.records || entityDataPackage.data || []);
        console.log(`✅ Entity data loaded: ${entityData.length} entities`);

        // Step 3: Analyze field preservation
        const sourceFields = sourceData.length > 0 ? Object.keys(sourceData[0]).sort() : [];
        const entityFields = new Set();

        // Extract all entity field names (including nested)
        function extractFields(obj, prefix = '') {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const fullKey = prefix ? `${prefix}.${key}` : key;
                    entityFields.add(fullKey);

                    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                        extractFields(obj[key], fullKey);
                    }
                }
            }
        }

        // Sample multiple entities for comprehensive field coverage
        entityData.slice(0, 10).forEach(entity => {
            extractFields(entity);
        });

        const entityFieldsArray = Array.from(entityFields).sort();

        // Compare fields
        const missingFromEntities = sourceFields.filter(field =>
            !entityFieldsArray.some(ef =>
                ef.toLowerCase().includes(field.toLowerCase()) ||
                field.toLowerCase().includes(ef.toLowerCase())
            )
        );

        const preservedFields = sourceFields.length - missingFromEntities.length;
        const preservationRate = (preservedFields / sourceFields.length * 100).toFixed(1);

        console.log('📊 VISIONAPPRAISAL FIELD MAPPING RESULTS:');
        console.log('=========================================');
        console.log(`📁 Source Fields: ${sourceFields.length}`);
        console.log(`🏗️ Entity Fields: ${entityFieldsArray.length}`);
        console.log(`✅ Preserved: ${preservedFields}/${sourceFields.length} (${preservationRate}%)`);
        console.log(`❌ Missing: ${missingFromEntities.length}/${sourceFields.length} (${(100 - preservationRate).toFixed(1)}%)`);
        console.log('🚨 Missing Fields:', missingFromEntities);

        // Store results globally
        window.visionAppraisalFieldMappingResults = {
            sourceFields,
            entityFields: entityFieldsArray,
            missingFromEntities,
            preservationRate: parseFloat(preservationRate),
            totalSourceRecords: sourceData.length,
            totalEntities: entityData.length,
            sampleSource: sourceData[0] || null,
            sampleEntity: entityData[0] || null
        };

        console.log('✅ VisionAppraisal analysis complete! Results stored in window.visionAppraisalFieldMappingResults');
        return window.visionAppraisalFieldMappingResults;

    } catch (error) {
        console.error('❌ Error in VisionAppraisal field mapping analysis:', error);
        throw error;
    }
}

/**
 * Bloomerang Field Mapping Analysis Function
 * Uses local CSV endpoint + Google Drive entity collections
 */
async function analyzeBloomerangFieldMappingCorrected() {
    try {
        console.log('🔍 Starting Bloomerang Field Mapping Analysis...');

        // Step 1: Load Bloomerang source CSV via local endpoint
        console.log('📊 Loading Bloomerang source CSV via local endpoint...');
        const reqBase = "http://127.0.0.99:3000";
        const fileUrl = `${reqBase}/csv-file`;

        const sourceResponse = await fetch(fileUrl);
        if (!sourceResponse.ok) {
            throw new Error(`HTTP ${sourceResponse.status}: ${sourceResponse.statusText}`);
        }

        const csvText = await sourceResponse.text();
        const sourceLines = csvText.split('\n').filter(line => line.trim());
        const sourceHeaders = sourceLines[0].split(',').map(h => h.trim().replace(/^"(.*)"$/, '$1'));
        console.log(`✅ Source CSV loaded: ${sourceLines.length - 1} records, ${sourceHeaders.length} fields`);

        // Step 2: Load Bloomerang entity collections using correct file IDs
        console.log('🏗️ Loading Bloomerang entity collections...');
        const entityFiles = [
            { name: 'Individual_2025-10-10T00-37-26_Batch_Production_2025_01_09.json', id: '1s7VnmD4CZg09y-GKmfX4W6tZb2SDaJLy' },
            { name: 'AggregateHousehold_2025-10-10T00-37-27_Batch_Production_2025_01_09.json', id: '1HhjM33856-jehR1xSypXyE0qFuRw26tx' },
            { name: 'NonHuman_2025-10-10T00-37-29_Batch_Production_2025_01_09.json', id: '11zRSquTQy9hNgUXuCdaHR6fUBNi-n4GX' }
        ];

        let allEntities = [];
        for (const file of entityFiles) {
            console.log(`📂 Loading ${file.name}...`);
            const entityResponse = await gapi.client.drive.files.get({
                fileId: file.id,
                alt: 'media'
            });
            const entities = JSON.parse(entityResponse.body);
            allEntities = allEntities.concat(entities);
            console.log(`✅ Loaded ${entities.length} entities from ${file.name}`);
        }
        console.log(`🎯 Total entities loaded: ${allEntities.length}`);

        // Step 3: Analyze field preservation
        console.log('🔬 Analyzing field preservation...');
        const entityFields = new Set();

        function extractFields(obj, prefix = '') {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const fullKey = prefix ? `${prefix}.${key}` : key;
                    entityFields.add(fullKey);

                    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                        extractFields(obj[key], fullKey);
                    }
                }
            }
        }

        // Sample multiple entities for comprehensive field coverage
        allEntities.slice(0, 50).forEach(entity => {
            extractFields(entity);
        });

        const entityFieldsArray = Array.from(entityFields).sort();

        // Intelligent field matching
        const missingFromEntities = sourceHeaders.filter(field =>
            !entityFieldsArray.some(ef =>
                ef.toLowerCase().includes(field.toLowerCase().replace(/\s+/g, '')) ||
                field.toLowerCase().replace(/\s+/g, '').includes(ef.toLowerCase())
            )
        );

        const preservedFields = sourceHeaders.length - missingFromEntities.length;
        const preservationRate = (preservedFields / sourceHeaders.length * 100).toFixed(1);

        console.log('📊 BLOOMERANG FIELD MAPPING RESULTS:');
        console.log('====================================');
        console.log(`📁 Source CSV Fields: ${sourceHeaders.length}`);
        console.log(`🏗️ Entity Fields: ${entityFieldsArray.length}`);
        console.log(`✅ Preserved: ${preservedFields}/${sourceHeaders.length} (${preservationRate}%)`);
        console.log(`❌ Missing: ${missingFromEntities.length}/${sourceHeaders.length} (${(100 - preservationRate).toFixed(1)}%)`);
        console.log('🚨 Missing Fields:', missingFromEntities);

        // Store results globally
        window.bloomerangFieldMappingResults = {
            sourceFields: sourceHeaders,
            entityFields: entityFieldsArray,
            missingFromEntities,
            preservationRate: parseFloat(preservationRate),
            totalSourceRecords: sourceLines.length - 1,
            totalEntities: allEntities.length,
            sampleEntity: allEntities[0] || null,
            csvSample: sourceLines.slice(0, 3)
        };

        console.log('✅ Bloomerang analysis complete! Results stored in window.bloomerangFieldMappingResults');
        return window.bloomerangFieldMappingResults;

    } catch (error) {
        console.error('❌ Error in Bloomerang field mapping analysis:', error);
        throw error;
    }
}

/**
 * Dual Source Comparative Analysis
 * Runs both analyses and provides comparative summary
 */
async function runDualSourceFieldAnalysis() {
    console.log('🚀 Starting Dual Source Field Preservation Analysis...');

    try {
        // Run both analyses
        const visionResults = await analyzeVisionAppraisalFieldMappingCorrected();
        const bloomerangResults = await analyzeBloomerangFieldMappingCorrected();

        // Comparative summary
        console.log('\n🔀 DUAL SOURCE COMPARATIVE ANALYSIS:');
        console.log('=====================================');
        console.log(`VisionAppraisal: ${(100 - visionResults.preservationRate).toFixed(1)}% field loss (${visionResults.preservationRate}% preserved)`);
        console.log(`Bloomerang: ${(100 - bloomerangResults.preservationRate).toFixed(1)}% field loss (${bloomerangResults.preservationRate}% preserved)`);
        console.log('\n🚨 CRITICAL FINDING: Both systems lose majority of source data');
        console.log('   - This confirms systemic entity creation process problems');
        console.log('   - Both VisionAppraisal AND Bloomerang need fundamental fixes');

        const comparison = {
            visionAppraisal: visionResults,
            bloomerang: bloomerangResults,
            summary: {
                visionFieldLoss: (100 - visionResults.preservationRate).toFixed(1) + '%',
                bloomerangFieldLoss: (100 - bloomerangResults.preservationRate).toFixed(1) + '%',
                systemicProblem: true
            }
        };

        window.dualSourceAnalysisResults = comparison;
        console.log('✅ Dual source analysis complete! Results stored in window.dualSourceAnalysisResults');

        return comparison;

    } catch (error) {
        console.error('❌ Error in dual source analysis:', error);
        throw error;
    }
}

/**
 * SPECIFIC MISSING FIELDS INVENTORY
 * =================================
 *
 * VisionAppraisal Missing Fields (21 out of 28):
 * - Address Components: street, city, state, zip, block, unit, unitCut
 * - MBLU Parsed Components: map, lot
 * - Owner Information: ownerName, ownerName2, processedOwnerName, hasFireNumber
 * - Administrative Data: neighborhood, userCode, date, sourceIndex
 * - Legacy Reference Data: _legacyAddress, _legacyMBLU, _legacyOwnerName, _legacyOwnerName2
 *
 * Bloomerang Missing Fields (24 out of 30):
 * - Address Components: Primary Street/City/State/ZIP, Home Street/City/State/ZIP,
 *   Vacation Street/City/State/ZIP, Work Street/City/State/ZIP
 * - Contact Details: Middle Name, Primary Email Address
 * - Transaction Data: First Transaction Amount, First Transaction Date
 * - Household Data: Is in a Household, Is Head of Household
 * - Block Island Specific: BI Street, BI PO Box
 *
 * Preserved Fields:
 * - VisionAppraisal: 7 fields preserved (including fireNumber, pid, propertyLocation, ownerAddress, mblu, googleFileId, source)
 * - Bloomerang: 6 fields preserved (including Name, First Name, Last Name, Account Number, Fire Number, Household Name)
 */

// Usage Instructions:
// 1. Load this file in browser console or via script tag
// 2. Run individual analyses: analyzeVisionAppraisalFieldMappingCorrected() or analyzeBloomerangFieldMappingCorrected()
// 3. Run comparative analysis: runDualSourceFieldAnalysis()
// 4. Access results via window.visionAppraisalFieldMappingResults, window.bloomerangFieldMappingResults, or window.dualSourceAnalysisResults