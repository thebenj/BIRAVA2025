/**
 * Debug Name Matching Algorithm - Correct Test Approach
 * Tests 5 VA + 5 Bloomerang entities against ALL entities in both datasets
 */

async function runNameMatchingTest() {
    console.log('🧪 DEBUGGING AND TESTING NAME MATCHING ALGORITHM');
    console.log('=================================================');

    // Wait for entities to be loaded
    if (!window.workingLoadedEntities || workingLoadedEntities.status !== 'loaded') {
        console.log('🔄 Loading entities first...');
        if (typeof loadAllEntitiesIntoMemory === 'function') {
            loadAllEntitiesIntoMemory();

            // Wait for loading to complete
            return new Promise(resolve => {
                const checkLoaded = () => {
                    if (window.workingLoadedEntities && workingLoadedEntities.status === 'loaded') {
                        console.log('✅ Entities loaded, starting test');
                        runTest();
                        resolve();
                    } else {
                        setTimeout(checkLoaded, 1000);
                    }
                };
                setTimeout(checkLoaded, 2000);
            });
        } else {
            console.error('❌ loadAllEntitiesIntoMemory not available');
            return;
        }
    } else {
        console.log('✅ Entities already loaded, starting test');
        runTest();
    }
}

function runTest() {
    console.log('🔍 DEBUGGING NAME EXTRACTION:');

    // Debug Bloomerang name extraction
    const bloomEntries = Object.entries(workingLoadedEntities.bloomerang.individuals.entities).slice(0, 3);
    console.log('\n📝 Bloomerang Individual Structure Analysis:');

    bloomEntries.forEach(([id, entity], i) => {
        console.log(`\n--- Bloomerang Entity ${i+1} (${id}) ---`);
        console.log('Entity type:', entity.type || 'unknown');
        console.log('Entity keys:', Object.keys(entity));
        console.log('Name property:', entity.name);
        if (entity.name) {
            console.log('Name keys:', Object.keys(entity.name));
            if (entity.name.identifier) {
                console.log('Name identifier:', entity.name.identifier);
                if (entity.name.identifier.primaryAlias) {
                    console.log('Primary alias:', entity.name.identifier.primaryAlias);
                }
            }
        }

        const extractedName = extractNameWorking(entity);
        console.log('Extracted name result:', extractedName);
    });

    // Now run the correct test approach
    console.log('\n🧪 RUNNING CORRECT MATCHING TEST:');
    console.log('Testing 5 VA + 5 Bloomerang entities against ALL entities in both datasets');

    // Get 5 random test subjects from each source
    const vaTestSubjects = workingLoadedEntities.visionAppraisal.entities
        .filter(e => e.type === 'Individual')
        .sort(() => 0.5 - Math.random())
        .slice(0, 5);

    const bloomTestSubjects = Object.entries(workingLoadedEntities.bloomerang.individuals.entities)
        .sort(() => 0.5 - Math.random())
        .slice(0, 5);

    // Get ALL entities for comparison
    const allVAEntities = workingLoadedEntities.visionAppraisal.entities.filter(e => e.type === 'Individual');
    const allBloomEntities = Object.entries(workingLoadedEntities.bloomerang.individuals.entities);

    console.log(`\n📊 Test Setup:`);
    console.log(`- VA test subjects: 5`);
    console.log(`- Bloomerang test subjects: 5`);
    console.log(`- Total VA entities to search: ${allVAEntities.length}`);
    console.log(`- Total Bloomerang entities to search: ${allBloomEntities.length}`);

    // Test each VA subject
    console.log('\n🎯 TESTING VA SUBJECTS:');
    vaTestSubjects.forEach((subject, i) => {
        const subjectName = extractNameWorking(subject);
        console.log(`\n--- VA Subject ${i+1}: PID ${subject.pid} ---`);
        console.log(`Name: "${subjectName.completeName || 'No completeName'}"`);

        // Find best matches in ALL entities (both VA and Bloomerang)
        let bestMatches = [];

        // Search VA entities
        allVAEntities.forEach(entity => {
            if (entity.pid !== subject.pid) { // Don't match against self
                const entityName = extractNameWorking(entity);
                const comparison = compareNames(subjectName, entityName);
                if (comparison.score >= 0.5) {
                    bestMatches.push({
                        score: comparison.score,
                        source: 'VisionAppraisal',
                        id: entity.pid,
                        name: entityName.completeName || 'No completeName',
                        match: comparison.match
                    });
                }
            }
        });

        // Search Bloomerang entities (if name extraction works)
        allBloomEntities.forEach(([id, entity]) => {
            const entityName = extractNameWorking(entity);
            if (entityName && typeof entityName === 'object' && entityName.completeName) {
                const comparison = compareNames(subjectName, entityName);
                if (comparison.score >= 0.5) {
                    bestMatches.push({
                        score: comparison.score,
                        source: 'Bloomerang',
                        id: id,
                        name: entityName.completeName,
                        match: comparison.match
                    });
                }
            }
        });

        // Show top 3 matches
        bestMatches.sort((a, b) => b.score - a.score);
        const top3 = bestMatches.slice(0, 3);

        console.log(`Found ${bestMatches.length} matches ≥50%, top 3:`);
        top3.forEach((match, idx) => {
            console.log(`  ${idx+1}. ${match.score.toFixed(2)} - ${match.source} ${match.id}: "${match.name}" ${match.match ? '✅' : '❌'}`);
        });
    });

    console.log('\n🏠 TESTING BLOOMERANG SUBJECTS:');
    bloomTestSubjects.forEach(([subjectId, subject], i) => {
        const subjectName = extractNameWorking(subject);
        console.log(`\n--- Bloomerang Subject ${i+1}: Account ${subjectId} ---`);

        if (!subjectName || typeof subjectName !== 'object' || !subjectName.completeName) {
            console.log('❌ Cannot extract name from this Bloomerang entity');
            return;
        }

        console.log(`Name: "${subjectName.completeName}"`);

        // Find best matches in ALL entities (both VA and Bloomerang)
        let bestMatches = [];

        // Search VA entities
        allVAEntities.forEach(entity => {
            const entityName = extractNameWorking(entity);
            const comparison = compareNames(subjectName, entityName);
            if (comparison.score >= 0.5) {
                bestMatches.push({
                    score: comparison.score,
                    source: 'VisionAppraisal',
                    id: entity.pid,
                    name: entityName.completeName || 'No completeName',
                    match: comparison.match
                });
            }
        });

        // Search other Bloomerang entities
        allBloomEntities.forEach(([id, entity]) => {
            if (id !== subjectId) { // Don't match against self
                const entityName = extractNameWorking(entity);
                if (entityName && typeof entityName === 'object' && entityName.completeName) {
                    const comparison = compareNames(subjectName, entityName);
                    if (comparison.score >= 0.5) {
                        bestMatches.push({
                            score: comparison.score,
                            source: 'Bloomerang',
                            id: id,
                            name: entityName.completeName,
                            match: comparison.match
                        });
                    }
                }
            }
        });

        // Show top 3 matches
        bestMatches.sort((a, b) => b.score - a.score);
        const top3 = bestMatches.slice(0, 3);

        console.log(`Found ${bestMatches.length} matches ≥50%, top 3:`);
        top3.forEach((match, idx) => {
            console.log(`  ${idx+1}. ${match.score.toFixed(2)} - ${match.source} ${match.id}: "${match.name}" ${match.match ? '✅' : '❌'}`);
        });
    });

    console.log('\n✅ Name matching test completed!');
}

// Make function available globally
if (typeof window !== 'undefined') {
    window.runNameMatchingTest = runNameMatchingTest;
}

console.log('🔧 Name Matching Debug Test loaded - call runNameMatchingTest()');