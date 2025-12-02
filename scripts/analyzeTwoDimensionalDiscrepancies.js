/**
 * Two-Dimensional Entity Structure Analysis Code
 * Developed in previous session to analyze entity structure discrepancies
 * between VisionAppraisal and Bloomerang entity creation patterns
 */

// Load entities and perform two-dimensional analysis
Promise.all([
    new Promise(resolve => { const s = document.createElement('script'); s.src = './scripts/loadAllEntitiesButton.js'; s.onload = resolve;
document.head.appendChild(s); })
]).then(() => {
    console.log('🔍 PHASE 0.2: Two-Dimensional Type Discrepancy Analysis');
    console.log('================================================================');

    // Check if entities are already loaded
    if (window.workingLoadedEntities && workingLoadedEntities.status === 'loaded') {
        console.log('✅ Entities already loaded, starting analysis');
        analyzeTwoDimensionalDiscrepancies();
    } else if (typeof loadAllEntitiesIntoMemory === 'function') {
        console.log('🔄 Loading entities...');
        loadAllEntitiesIntoMemory();
        setTimeout(() => {
            if (window.workingLoadedEntities && workingLoadedEntities.status === 'loaded') {
                analyzeTwoDimensionalDiscrepancies();
            } else {
                console.error('❌ Entity loading failed');
            }
        }, 15000);
    }
});

function analyzeTwoDimensionalDiscrepancies() {
    console.log('\n🔬 ANALYZING ACTUAL ENTITY STRUCTURES');
    console.log('=====================================');

    // Dimension 1: Property Analysis
    console.log('\n📊 DIMENSION 1: PROPERTY STRUCTURE ANALYSIS');

    // Get samples from each source
    const vaSamples = workingLoadedEntities.visionAppraisal.entities.slice(0, 3);
    const bloomSamples = Object.values(workingLoadedEntities.bloomerang.individuals.entities).slice(0, 3);

    console.log('\n🏢 VisionAppraisal Entity Property Structures:');
    vaSamples.forEach((entity, i) => {
        console.log(`\n--- VA Entity ${i+1} (${entity.type}) ---`);
        console.log('PID:', entity.pid);
        console.log('entity.name structure:');
        console.log('  Type:', typeof entity.name);
        console.log('  Keys:', entity.name ? Object.keys(entity.name) : 'null');
        console.log('  Direct access - entity.name.firstName:', entity.name?.firstName);
        console.log('  Direct access - entity.name.term:', entity.name?.term);
        console.log('  Wrapper access - entity.name.identifier:', entity.name?.identifier);

        console.log('entity.locationIdentifier structure:');
        console.log('  Type:', typeof entity.locationIdentifier);
        console.log('  Keys:', entity.locationIdentifier ? Object.keys(entity.locationIdentifier) : 'null');
        console.log('  Direct access test:', entity.locationIdentifier?.toString());

        console.log('entity.contactInfo structure:');
        console.log('  Type:', typeof entity.contactInfo);
        console.log('  Exists:', !!entity.contactInfo);

        console.log('entity.accountNumber structure:');
        console.log('  Type:', typeof entity.accountNumber);
        console.log('  Exists:', !!entity.accountNumber);
    });

    console.log('\n🏠 Bloomerang Entity Property Structures:');
    bloomSamples.forEach((entity, i) => {
        console.log(`\n--- Bloomerang Entity ${i+1} (${entity.type}) ---`);
        console.log('Account:', entity.accountNumber?.identifier?.primaryAlias?.term);
        console.log('entity.name structure:');
        console.log('  Type:', typeof entity.name);
        console.log('  Keys:', entity.name ? Object.keys(entity.name) : 'null');
        console.log('  Direct access - entity.name.firstName:', entity.name?.firstName);
        console.log('  Direct access - entity.name.term:', entity.name?.term);
        console.log('  Wrapper access - entity.name.identifier:', entity.name?.identifier);
        console.log('  Wrapper access - entity.name.identifier.firstName:', entity.name?.identifier?.firstName);

        console.log('entity.locationIdentifier structure:');
        console.log('  Type:', typeof entity.locationIdentifier);
        console.log('  Keys:', entity.locationIdentifier ? Object.keys(entity.locationIdentifier) : 'null');

        console.log('entity.contactInfo structure:');
        console.log('  Type:', typeof entity.contactInfo);
        console.log('  Exists:', !!entity.contactInfo);

        console.log('entity.accountNumber structure:');
        console.log('  Type:', typeof entity.accountNumber);
        console.log('  Keys:', entity.accountNumber ? Object.keys(entity.accountNumber) : 'null');
    });

    // Dimension 2: Entity Type Analysis
    console.log('\n📊 DIMENSION 2: ENTITY TYPE ANALYSIS');

    console.log('\n🏢 VisionAppraisal Entity Types:');
    const vaTypeCounts = {};
    workingLoadedEntities.visionAppraisal.entities.forEach(entity => {
        const type = entity.type || 'Unknown';
        vaTypeCounts[type] = (vaTypeCounts[type] || 0) + 1;
    });
    Object.entries(vaTypeCounts).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} entities`);

        // Sample one entity of this type
        const sample = workingLoadedEntities.visionAppraisal.entities.find(e => e.type === type);
        if (sample) {
            console.log(`    Sample name access: entity.name?.firstName = "${sample.name?.firstName}"`);
            console.log(`    Sample name access: entity.name?.term = "${sample.name?.term}"`);
            console.log(`    Sample name access: entity.name?.identifier = ${!!sample.name?.identifier}`);
        }
    });

    console.log('\n🏠 Bloomerang Entity Types:');
    const bloomTypeCounts = {};

Object.values(workingLoadedEntities.bloomerang.individuals.entities).forEach(entity =>
 {
        const type = entity.type || 'Unknown';
        bloomTypeCounts[type] = (bloomTypeCounts[type] || 0) + 1;
    });
    Object.entries(bloomTypeCounts).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} entities`);

        // Sample one entity of this type
        const sample =
Object.values(workingLoadedEntities.bloomerang.individuals.entities).find(e => e.type === type);
        if (sample) {
            console.log(`    Sample name access: entity.name?.firstName = "${sample.name?.firstName}"`);
            console.log(`    Sample name access: entity.name?.term = "${sample.name?.term}"`);
            console.log(`    Sample name access: entity.name?.identifier = ${!!sample.name?.identifier}`);
            console.log(`    Sample wrapper access: entity.name?.identifier?.firstName= "${sample.name?.identifier?.firstName}"`);
        }
    });

    console.log('\n✅ Two-Dimensional Analysis Complete');
    console.log('🔍 Results saved to browser console for documentation');
}