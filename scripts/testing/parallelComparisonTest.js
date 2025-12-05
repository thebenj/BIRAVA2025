/**
 * Parallel Comparison Testing with CSV Generation
 *
 * PURPOSE: Validate weighted comparison architecture against proven nameMatchingAnalysis.js
 *
 * This script performs Option D testing:
 * 1. Runs BOTH old compareNames() and new compareTo() systems in parallel
 * 2. Validates results match between systems
 * 3. Benchmarks performance of both approaches
 * 4. Generates CSV file matching old process format with parallel comparison columns
 * 5. Documents full reconciliation results
 *
 * REQUIREMENTS:
 * - Entities must be loaded (workingLoadedEntities)
 * - nameMatchingAnalysis.js must be available (for compareNames function)
 * - Weighted comparison architecture must be working (compareTo method)
 */

/**
 * Main parallel comparison test function
 * @param {number} sampleSize - Number of target entities to test (default: 10, max: 1360 for full dataset)
 * @param {boolean} includeDetailedComparisons - Include top 20 matches per target in CSV (default: true)
 * @returns {Object} Test results with CSV download
 */
async function parallelComparisonTest(sampleSize = 10, includeDetailedComparisons = true) {
    console.log('🔬 === PARALLEL COMPARISON TEST ===');
    console.log(`📊 Testing ${sampleSize} entities against full dataset`);
    console.log(`📝 Detailed comparisons: ${includeDetailedComparisons ? 'YES' : 'NO'}`);
    console.log();

    // Step 1: Verify prerequisites
    console.log('Step 1: Verifying prerequisites...');

    if (!window.workingLoadedEntities || workingLoadedEntities.status !== 'loaded') {
        console.error('❌ Entities not loaded. Run loadAllEntitiesIntoMemory() first.');
        return null;
    }

    if (typeof compareNames !== 'function') {
        console.error('❌ compareNames() not available. Load nameMatchingAnalysis.js first.');
        return null;
    }

    // Extract all individual entities
    const bloomerangIndividuals = Object.values(workingLoadedEntities.bloomerang.individuals.entities || {});

    if (bloomerangIndividuals.length === 0) {
        console.error('❌ No Bloomerang individual entities found.');
        return null;
    }

    console.log(`✅ Found ${bloomerangIndividuals.length} individual entities`);

    // Verify compareTo method is available
    const testEntity = bloomerangIndividuals[0];
    if (typeof testEntity.name?.compareTo !== 'function') {
        console.error('❌ compareTo() method not available on IndividualName. Weighted comparison architecture not working.');
        console.error('   Entity name type:', testEntity.name?.constructor?.name);
        return null;
    }

    console.log('✅ compareTo() method available');
    console.log('✅ compareNames() function available');
    console.log();

    // Step 2: Select target entities for testing
    console.log('Step 2: Selecting target entities...');

    const actualSampleSize = Math.min(sampleSize, bloomerangIndividuals.length);
    const targetEntities = [];
    const usedIndices = new Set();

    while (targetEntities.length < actualSampleSize) {
        const randomIndex = Math.floor(Math.random() * bloomerangIndividuals.length);
        if (!usedIndices.has(randomIndex)) {
            usedIndices.add(randomIndex);
            const entity = bloomerangIndividuals[randomIndex];

            // Extract display name for logging
            let displayName = 'Unknown';
            if (entity.name?.completeName) {
                displayName = entity.name.completeName;
            } else if (entity.name?.firstName && entity.name?.lastName) {
                displayName = `${entity.name.firstName} ${entity.name.lastName}`;
            }

            targetEntities.push({
                entity,
                displayName,
                source: 'Bloomerang',
                id: entity.accountNumber?.term || '',
                index: randomIndex
            });
        }
    }

    console.log(`✅ Selected ${actualSampleSize} random target entities`);
    console.log();

    // Step 3: Run parallel comparisons
    console.log('Step 3: Running parallel comparisons...');
    console.log(`   ${actualSampleSize} targets × ${bloomerangIndividuals.length} comparisons = ${actualSampleSize * bloomerangIndividuals.length} total comparisons`);
    console.log();

    const csvData = [];
    const testResults = {
        sampleSize: actualSampleSize,
        totalEntities: bloomerangIndividuals.length,
        totalComparisons: 0,
        oldSystemTime: 0,
        newSystemTime: 0,
        targets: []
    };

    // Process each target entity
    for (let targetIdx = 0; targetIdx < targetEntities.length; targetIdx++) {
        const target = targetEntities[targetIdx];

        console.log(`Processing target ${targetIdx + 1}/${targetEntities.length}: ${target.displayName}`);

        const oldScores = [];
        const newScores = [];
        const detailedComparisons = [];

        // Time old system
        const oldStartTime = performance.now();

        // Compare against all entities using OLD system (compareNames)
        for (let i = 0; i < bloomerangIndividuals.length; i++) {
            const compareEntity = bloomerangIndividuals[i];

            // Skip self-comparison
            if (compareEntity === target.entity) continue;

            const oldResult = compareNames(target.entity.name, compareEntity.name);
            oldScores.push(oldResult.score);

            // Store for detailed comparison
            let compareName = 'Unknown';
            if (compareEntity.name?.completeName) {
                compareName = compareEntity.name.completeName;
            } else if (compareEntity.name?.firstName && compareEntity.name?.lastName) {
                compareName = `${compareEntity.name.firstName} ${compareEntity.name.lastName}`;
            }

            detailedComparisons.push({
                compareName,
                compareSource: 'Bloomerang',
                compareId: compareEntity.accountNumber?.term || '',
                oldScore: oldResult.score,
                oldConfidence: oldResult.confidence,
                oldMatch: oldResult.match,
                oldReason: oldResult.reason,
                newScore: null, // Will fill in next loop
                newResult: null
            });
        }

        const oldEndTime = performance.now();
        const oldSystemTime = oldEndTime - oldStartTime;

        // Time new system
        const newStartTime = performance.now();

        // Compare against all entities using NEW system (compareTo)
        let comparisonIndex = 0;
        for (let i = 0; i < bloomerangIndividuals.length; i++) {
            const compareEntity = bloomerangIndividuals[i];

            // Skip self-comparison
            if (compareEntity === target.entity) continue;

            // Call new weighted compareTo method
            const newResult = target.entity.name.compareTo(compareEntity.name);

            // Convert compareTo result (-1 to 1) to similarity score (0 to 1)
            const newScore = (newResult + 1) / 2;

            newScores.push(newScore);

            // Update detailed comparison with new score
            detailedComparisons[comparisonIndex].newScore = newScore;
            detailedComparisons[comparisonIndex].newResult = newResult;

            comparisonIndex++;
        }

        const newEndTime = performance.now();
        const newSystemTime = newEndTime - newStartTime;

        testResults.oldSystemTime += oldSystemTime;
        testResults.newSystemTime += newSystemTime;
        testResults.totalComparisons += oldScores.length;

        // Calculate distribution statistics for OLD system
        const oldStats = calculateDistributionStats(oldScores);

        // Calculate distribution statistics for NEW system
        const newStats = calculateDistributionStats(newScores);

        // Calculate correlation between old and new scores
        const correlation = calculateCorrelation(oldScores, newScores);

        // Store target results
        const targetResult = {
            targetName: target.displayName,
            targetSource: target.source,
            targetId: target.id,
            comparisons: oldScores.length,
            oldStats,
            newStats,
            correlation,
            oldSystemTime,
            newSystemTime,
            speedup: oldSystemTime / newSystemTime
        };

        testResults.targets.push(targetResult);

        // Add to CSV - Summary row
        csvData.push([
            `TARGET ${targetIdx + 1}`,
            target.displayName,
            target.source,
            target.id,
            oldScores.length,
            oldStats.max.toFixed(4),
            newStats.max.toFixed(4),
            oldStats.mean.toFixed(4),
            newStats.mean.toFixed(4),
            oldStats.median.toFixed(4),
            newStats.median.toFixed(4),
            oldStats.percentile98.toFixed(4),
            newStats.percentile98.toFixed(4),
            oldStats.buckets['95-100'],
            newStats.buckets['95-100'],
            oldStats.buckets['90-94'],
            newStats.buckets['90-94'],
            oldStats.buckets['85-89'],
            newStats.buckets['85-89'],
            correlation.toFixed(4),
            (oldSystemTime / newSystemTime).toFixed(2) + 'x'
        ]);

        // Add detailed comparisons if requested
        if (includeDetailedComparisons) {
            csvData.push(['']); // Blank separator
            csvData.push([
                'Detail',
                'Compare Name',
                'Compare Source',
                'Compare ID',
                'Old Score',
                'New Score',
                'Diff',
                'Old Match',
                'Old Reason'
            ]);

            // Sort by old score and show top 20
            detailedComparisons
                .sort((a, b) => b.oldScore - a.oldScore)
                .slice(0, 20)
                .forEach(comp => {
                    const scoreDiff = Math.abs(comp.oldScore - comp.newScore);
                    csvData.push([
                        '',
                        comp.compareName,
                        comp.compareSource,
                        comp.compareId,
                        comp.oldScore.toFixed(4),
                        comp.newScore.toFixed(4),
                        scoreDiff.toFixed(4),
                        comp.oldMatch,
                        comp.oldReason
                    ]);
                });

            csvData.push(['']); // Blank separator
        }

        console.log(`   Old: ${oldSystemTime.toFixed(2)}ms | New: ${newSystemTime.toFixed(2)}ms | Speedup: ${(oldSystemTime / newSystemTime).toFixed(2)}x`);
        console.log(`   Correlation: ${correlation.toFixed(4)} | Max diff: ${Math.abs(oldStats.max - newStats.max).toFixed(4)}`);
    }

    console.log();
    console.log('Step 4: Generating CSV file...');

    // Generate CSV with headers
    const csvHeaders = [
        'Target',
        'Target Name',
        'Target Source',
        'Target ID',
        'Total Comparisons',
        'Max Score (Old)',
        'Max Score (New)',
        'Mean (Old)',
        'Mean (New)',
        'Median (Old)',
        'Median (New)',
        '98th %ile (Old)',
        '98th %ile (New)',
        '95-100 (Old)',
        '95-100 (New)',
        '90-94 (Old)',
        '90-94 (New)',
        '85-89 (Old)',
        '85-89 (New)',
        'Correlation',
        'Speedup'
    ];

    const csvContent = [csvHeaders, ...csvData]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const detailSuffix = includeDetailedComparisons ? '_detailed' : '_summary';
    a.download = `parallel_comparison_test_${actualSampleSize}_entities${detailSuffix}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('✅ CSV file downloaded');
    console.log();

    // Step 5: Performance summary
    console.log('Step 5: Performance Summary');
    console.log('==========================================');
    console.log(`Total comparisons: ${testResults.totalComparisons.toLocaleString()}`);
    console.log();
    console.log('OLD SYSTEM (compareNames):');
    console.log(`  Total time: ${testResults.oldSystemTime.toFixed(2)}ms`);
    console.log(`  Comparisons/sec: ${Math.round((testResults.totalComparisons / testResults.oldSystemTime) * 1000).toLocaleString()}`);
    console.log();
    console.log('NEW SYSTEM (compareTo):');
    console.log(`  Total time: ${testResults.newSystemTime.toFixed(2)}ms`);
    console.log(`  Comparisons/sec: ${Math.round((testResults.totalComparisons / testResults.newSystemTime) * 1000).toLocaleString()}`);
    console.log(`  Target: 945,000+ comparisons/sec`);
    console.log();
    console.log('SPEEDUP:');
    console.log(`  ${(testResults.oldSystemTime / testResults.newSystemTime).toFixed(2)}x faster`);
    console.log();

    // Average correlation
    const avgCorrelation = testResults.targets.reduce((sum, t) => sum + t.correlation, 0) / testResults.targets.length;
    console.log(`Average correlation: ${avgCorrelation.toFixed(4)}`);
    console.log(`Status: ${avgCorrelation > 0.95 ? '✅ EXCELLENT' : avgCorrelation > 0.85 ? '⚠️  ACCEPTABLE' : '❌ NEEDS REVIEW'}`);
    console.log();
    console.log('🎉 Parallel comparison test complete!');

    return testResults;
}

/**
 * Calculate distribution statistics for a set of scores
 * @param {Array<number>} scores - Array of similarity scores (0-1)
 * @returns {Object} Statistics object
 */
function calculateDistributionStats(scores) {
    const sorted = [...scores].sort((a, b) => b - a);

    const stats = {
        max: Math.max(...scores),
        min: Math.min(...scores),
        mean: scores.reduce((sum, s) => sum + s, 0) / scores.length,
        median: sorted[Math.floor(sorted.length / 2)],
        percentile98: sorted[Math.floor(sorted.length * 0.02)],
        buckets: {
            '95-100': 0,
            '90-94': 0,
            '85-89': 0,
            '80-84': 0,
            '75-79': 0,
            'below-75': 0
        }
    };

    // Calculate buckets
    scores.forEach(score => {
        const pct = score * 100;
        if (pct >= 95) stats.buckets['95-100']++;
        else if (pct >= 90) stats.buckets['90-94']++;
        else if (pct >= 85) stats.buckets['85-89']++;
        else if (pct >= 80) stats.buckets['80-84']++;
        else if (pct >= 75) stats.buckets['75-79']++;
        else stats.buckets['below-75']++;
    });

    return stats;
}

/**
 * Calculate correlation coefficient between two score arrays
 * @param {Array<number>} scores1 - First score array
 * @param {Array<number>} scores2 - Second score array
 * @returns {number} Pearson correlation coefficient
 */
function calculateCorrelation(scores1, scores2) {
    const n = scores1.length;
    const mean1 = scores1.reduce((sum, s) => sum + s, 0) / n;
    const mean2 = scores2.reduce((sum, s) => sum + s, 0) / n;

    let numerator = 0;
    let denom1 = 0;
    let denom2 = 0;

    for (let i = 0; i < n; i++) {
        const diff1 = scores1[i] - mean1;
        const diff2 = scores2[i] - mean2;
        numerator += diff1 * diff2;
        denom1 += diff1 * diff1;
        denom2 += diff2 * diff2;
    }

    return numerator / Math.sqrt(denom1 * denom2);
}

// Export for browser use
if (typeof window !== 'undefined') {
    window.parallelComparisonTest = parallelComparisonTest;
    console.log('✅ Parallel Comparison Test loaded');
    console.log('📖 Usage: parallelComparisonTest(sampleSize, includeDetailedComparisons)');
    console.log('   Example: parallelComparisonTest(10, true) - Test 10 entities with details');
    console.log('   Example: parallelComparisonTest(100, false) - Test 100 entities, summary only');
    console.log('   Example: parallelComparisonTest(1360, true) - FULL dataset test (may take several minutes)');
}
