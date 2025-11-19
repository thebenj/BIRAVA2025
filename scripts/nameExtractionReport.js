/**
 * Name Extraction Report for BIRAVA2025
 * Extracts and reports all names from loaded entities to prove entity access is working
 */

/**
 * Generate comprehensive name report from loaded entities
 * @returns {Object} Report with all extracted names
 */
function generateNameReport() {
    console.log('📋 Generating Name Extraction Report...');

    const report = {
        visionAppraisal: {
            individuals: [],
            households: [],
            businesses: [],
            legalConstructs: [],
            other: []
        },
        bloomerang: {
            individuals: [],
            households: [],
            nonhuman: []
        },
        summary: {
            totalVisionAppraisal: 0,
            totalBloomerang: 0,
            grandTotal: 0
        }
    };

    // Check if entities are loaded
    if (loadedEntities.status !== 'loaded') {
        console.error('❌ Entities not loaded. Call loadAllEntities() first.');
        return report;
    }

    // Extract VisionAppraisal names
    if (loadedEntities.visionAppraisal.loaded && loadedEntities.visionAppraisal.entities) {
        console.log('📊 Extracting VisionAppraisal names...');

        loadedEntities.visionAppraisal.entities.forEach((entity, index) => {
            const name = extractEntityName(entity);
            const entityType = entity.constructor?.name || 'Unknown';

            const nameEntry = {
                name: name,
                type: entityType,
                index: index
            };

            // Categorize by entity type
            switch (entityType) {
                case 'Individual':
                    report.visionAppraisal.individuals.push(nameEntry);
                    break;
                case 'CompositeHousehold':
                case 'AggregateHousehold':
                    report.visionAppraisal.households.push(nameEntry);
                    break;
                case 'Business':
                    report.visionAppraisal.businesses.push(nameEntry);
                    break;
                case 'LegalConstruct':
                    report.visionAppraisal.legalConstructs.push(nameEntry);
                    break;
                default:
                    report.visionAppraisal.other.push(nameEntry);
            }

            report.summary.totalVisionAppraisal++;
        });
    }

    // Extract Bloomerang names
    if (loadedEntities.bloomerang.loaded) {
        console.log('👥 Extracting Bloomerang names...');

        // Individuals
        if (loadedEntities.bloomerang.individuals) {
            Object.entries(loadedEntities.bloomerang.individuals.entities).forEach(([id, entity]) => {
                const name = extractEntityName(entity);
                report.bloomerang.individuals.push({
                    name: name,
                    id: id,
                    type: 'Individual'
                });
                report.summary.totalBloomerang++;
            });
        }

        // Households
        if (loadedEntities.bloomerang.households) {
            Object.entries(loadedEntities.bloomerang.households.entities).forEach(([id, entity]) => {
                const name = extractEntityName(entity);
                report.bloomerang.households.push({
                    name: name,
                    id: id,
                    type: 'Household'
                });
                report.summary.totalBloomerang++;
            });
        }

        // NonHuman
        if (loadedEntities.bloomerang.nonhuman) {
            Object.entries(loadedEntities.bloomerang.nonhuman.entities).forEach(([id, entity]) => {
                const name = extractEntityName(entity);
                report.bloomerang.nonhuman.push({
                    name: name,
                    id: id,
                    type: 'NonHuman'
                });
                report.summary.totalBloomerang++;
            });
        }
    }

    report.summary.grandTotal = report.summary.totalVisionAppraisal + report.summary.totalBloomerang;

    console.log('✅ Name extraction complete!');
    return report;
}

/**
 * Extract name from entity using proper access pattern
 * @param {Object} entity - Entity object
 * @returns {string} Extracted name or error message
 */
function extractEntityName(entity) {
    try {
        // Try standard path: entity.name.identifier.primaryAlias.term
        if (entity.name && entity.name.identifier && entity.name.identifier.primaryAlias) {
            return entity.name.identifier.primaryAlias.term;
        }

        // Try direct access if it's a plain object
        if (entity.name && typeof entity.name === 'string') {
            return entity.name;
        }

        // Try other possible paths
        if (entity.name && entity.name.primaryAlias && entity.name.primaryAlias.term) {
            return entity.name.primaryAlias.term;
        }

        return '[No name found]';

    } catch (error) {
        return `[Name extraction error: ${error.message}]`;
    }
}

/**
 * Display formatted name report to console
 * @param {Object} report - Report from generateNameReport()
 */
function displayNameReport(report) {
    console.log('📋 ========== NAME EXTRACTION REPORT ==========');
    console.log('');

    // VisionAppraisal Section
    console.log('📊 VISIONAPPRAISAL ENTITIES:');
    console.log('----------------------------------------');

    if (report.visionAppraisal.individuals.length > 0) {
        console.log(`👤 Individuals (${report.visionAppraisal.individuals.length}):`);
        report.visionAppraisal.individuals.slice(0, 10).forEach(entry => {
            console.log(`  • ${entry.name} (Index: ${entry.index})`);
        });
        if (report.visionAppraisal.individuals.length > 10) {
            console.log(`  ... and ${report.visionAppraisal.individuals.length - 10} more`);
        }
        console.log('');
    }

    if (report.visionAppraisal.households.length > 0) {
        console.log(`🏠 Households (${report.visionAppraisal.households.length}):`);
        report.visionAppraisal.households.slice(0, 10).forEach(entry => {
            console.log(`  • ${entry.name} (Index: ${entry.index})`);
        });
        if (report.visionAppraisal.households.length > 10) {
            console.log(`  ... and ${report.visionAppraisal.households.length - 10} more`);
        }
        console.log('');
    }

    if (report.visionAppraisal.businesses.length > 0) {
        console.log(`🏢 Businesses (${report.visionAppraisal.businesses.length}):`);
        report.visionAppraisal.businesses.slice(0, 10).forEach(entry => {
            console.log(`  • ${entry.name} (Index: ${entry.index})`);
        });
        if (report.visionAppraisal.businesses.length > 10) {
            console.log(`  ... and ${report.visionAppraisal.businesses.length - 10} more`);
        }
        console.log('');
    }

    if (report.visionAppraisal.legalConstructs.length > 0) {
        console.log(`⚖️ Legal Constructs (${report.visionAppraisal.legalConstructs.length}):`);
        report.visionAppraisal.legalConstructs.slice(0, 10).forEach(entry => {
            console.log(`  • ${entry.name} (Index: ${entry.index})`);
        });
        if (report.visionAppraisal.legalConstructs.length > 10) {
            console.log(`  ... and ${report.visionAppraisal.legalConstructs.length - 10} more`);
        }
        console.log('');
    }

    // Bloomerang Section
    console.log('👥 BLOOMERANG ENTITIES:');
    console.log('----------------------------------------');

    if (report.bloomerang.individuals.length > 0) {
        console.log(`👤 Individuals (${report.bloomerang.individuals.length}):`);
        report.bloomerang.individuals.slice(0, 10).forEach(entry => {
            console.log(`  • ${entry.name} (ID: ${entry.id})`);
        });
        if (report.bloomerang.individuals.length > 10) {
            console.log(`  ... and ${report.bloomerang.individuals.length - 10} more`);
        }
        console.log('');
    }

    if (report.bloomerang.households.length > 0) {
        console.log(`🏠 Households (${report.bloomerang.households.length}):`);
        report.bloomerang.households.slice(0, 10).forEach(entry => {
            console.log(`  • ${entry.name} (ID: ${entry.id})`);
        });
        if (report.bloomerang.households.length > 10) {
            console.log(`  ... and ${report.bloomerang.households.length - 10} more`);
        }
        console.log('');
    }

    if (report.bloomerang.nonhuman.length > 0) {
        console.log(`🏢 NonHuman (${report.bloomerang.nonhuman.length}):`);
        report.bloomerang.nonhuman.slice(0, 10).forEach(entry => {
            console.log(`  • ${entry.name} (ID: ${entry.id})`);
        });
        if (report.bloomerang.nonhuman.length > 10) {
            console.log(`  ... and ${report.bloomerang.nonhuman.length - 10} more`);
        }
        console.log('');
    }

    // Summary
    console.log('📊 SUMMARY:');
    console.log('----------------------------------------');
    console.log(`VisionAppraisal Entities: ${report.summary.totalVisionAppraisal}`);
    console.log(`Bloomerang Entities: ${report.summary.totalBloomerang}`);
    console.log(`Grand Total: ${report.summary.grandTotal}`);
    console.log('');
    console.log('✅ Name extraction report complete!');
}

/**
 * Run complete name extraction test
 */
async function runNameExtractionTest() {
    console.log('🧪 Running Name Extraction Test...');

    // Generate the report
    const report = generateNameReport();

    // Display formatted results
    displayNameReport(report);

    return report;
}

// Export functions
if (typeof window !== 'undefined') {
    window.generateNameReport = generateNameReport;
    window.displayNameReport = displayNameReport;
    window.runNameExtractionTest = runNameExtractionTest;
    window.extractEntityName = extractEntityName;
}

console.log('📋 Name Extraction Report ready - call runNameExtractionTest() after loading entities');