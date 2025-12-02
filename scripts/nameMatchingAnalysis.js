/**
 * Name Matching Analysis for BIRAVA2025 - Refined Algorithm
 * Step 1: Sophisticated name-to-name matching between VisionAppraisal and Bloomerang Individual entities
 *
 * Purpose: Fix Fire Number → PID relationship analysis blocked by naive string comparison
 * Approach: Use existing structured entity data with configurable weighted scoring
 */

// Configurable parameters for experimentation
const matchingConfig = {
    // Component weighting for Individual entities
    lastNameWeight: 0.5,
    firstNameWeight: 0.4,
    otherNamesWeight: 0.1,

    // Final scoring weights - structured data available
    structuredComponentWeight: 0.8,  // Component analysis weight
    structuredStringSimilarityWeight: 0.2,  // String similarity weight

    // Final scoring weights - limited structured data
    unstructuredStringWeight: 0.8,
    unstructuredComponentWeight: 0.2,

    // Match threshold
    matchThreshold: 0.8,

    // Confidence levels
    structuredDataConfidence: 0.9,
    unstructuredDataConfidence: 0.6
};

/**
 * Update matching configuration parameters
 * @param {Object} newConfig - Updated configuration parameters
 */
function updateMatchingConfig(newConfig) {
    Object.assign(matchingConfig, newConfig);
    console.log('Updated matching config:', matchingConfig);
}

/**
 * Core name comparison function - uses existing entity structure directly
 * @param {string|Object} name1 - VisionAppraisal name (Individual object or string)
 * @param {string|Object} name2 - Bloomerang name (Individual object or string)
 * @returns {Object} Similarity analysis with score, confidence, and details
 */
function compareNames(name1, name2) {
    try {
        // Extract clean name data directly from entity structures
        const data1 = extractNameData(name1);
        const data2 = extractNameData(name2);

        if (!data1.displayName || !data2.displayName) {
            return {
                score: 0,
                confidence: 0,
                match: false,
                reason: 'One or both names could not be extracted',
                details: { data1, data2 }
            };
        }

        // Check for exact matches first
        if (data1.displayName === data2.displayName) {
            return {
                score: 1.0,
                confidence: 1.0,
                match: true,
                reason: 'Exact display name match',
                details: { data1, data2 }
            };
        }

        // Component-based comparison for Individual entities
        const componentScore = compareNameComponents(data1, data2);

        // String similarity comparison
        const stringSimilarity = calculateStringSimilarity(data1.displayName, data2.displayName);

        // Calculate final weighted score
        const finalScore = calculateFinalScore(componentScore, stringSimilarity, data1, data2);

        return {
            score: finalScore.score,
            confidence: finalScore.confidence,
            match: finalScore.score >= matchingConfig.matchThreshold,
            reason: finalScore.reason,
            details: {
                data1,
                data2,
                componentScore,
                stringSimilarity,
                finalScore
            }
        };

    } catch (error) {
        return {
            score: 0,
            confidence: 0,
            match: false,
            reason: `Error in name comparison: ${error.message}`,
            details: { error: error.message }
        };
    }
}

/**
 * Extract name data directly from entity structures - no unnecessary parsing
 * @param {string|Object} name - Name from entity
 * @returns {Object} Extracted name data
 */
function extractNameData(name) {
    // Handle VisionAppraisal Individual name object (has entityType property)
    if (typeof name === 'object' && name.entityType === 'Individual') {
        return {
            displayName: name.completeName || `${name.firstName || ''} ${name.lastName || ''}`.trim(),
            firstName: name.firstName || '',
            lastName: name.lastName || '',
            otherNames: name.otherNames || '',
            title: name.title || '',
            suffix: name.suffix || '',
            isStructured: true,
            sourceType: 'VisionAppraisal Individual'
        };
    }
    // Handle simple string names (other entity types)
    else if (typeof name === 'string') {
        return {
            displayName: name,
            isStructured: false,
            sourceType: 'String name'
        };
    }
    // Handle other object structures
    else if (typeof name === 'object' && name.completeName) {
        return {
            displayName: name.completeName,
            isStructured: false,
            sourceType: 'Object with completeName'
        };
    }
    else {
        return {
            displayName: null,
            isStructured: false,
            sourceType: 'Unknown'
        };
    }
}

/**
 * Compare name components for Individual entities with structured data
 * @param {Object} data1 - Name data 1
 * @param {Object} data2 - Name data 2
 * @returns {Object} Component comparison results
 */
function compareNameComponents(data1, data2) {
    // Only meaningful if both have structured data
    if (!data1.isStructured || !data2.isStructured) {
        return {
            componentScores: {},
            weightedScore: 0,
            hasStructuredData: false,
            reason: 'No structured component data available'
        };
    }

    // Compare individual components
    const scores = {
        firstName: compareComponent(data1.firstName, data2.firstName),
        lastName: compareComponent(data1.lastName, data2.lastName),
        otherNames: compareComponent(data1.otherNames, data2.otherNames)
    };

    // Calculate weighted score using configurable weights
    const weightedScore = (
        (scores.lastName * matchingConfig.lastNameWeight) +
        (scores.firstName * matchingConfig.firstNameWeight) +
        (scores.otherNames * matchingConfig.otherNamesWeight)
    );

    return {
        componentScores: scores,
        weightedScore: Math.round(weightedScore * 100) / 100,
        hasStructuredData: true,
        reason: 'Structured component analysis'
    };
}

/**
 * Compare individual name components
 * @param {string} comp1 - Component 1
 * @param {string} comp2 - Component 2
 * @returns {number} Similarity score 0-1
 */
function compareComponent(comp1, comp2) {
    if (!comp1 && !comp2) return 1.0;  // Both empty = perfect match
    if (!comp1 || !comp2) return 0.0;  // One empty = no match

    const c1 = comp1.toUpperCase().trim();
    const c2 = comp2.toUpperCase().trim();

    if (c1 === c2) return 1.0;  // Exact match

    // Check for substring matches (handles initials, shortened names)
    if (c1.includes(c2) || c2.includes(c1)) return 0.7;

    // Basic word overlap for compound names
    const words1 = c1.split(/\s+/);
    const words2 = c2.split(/\s+/);
    const overlap = words1.filter(w => words2.includes(w)).length;
    const maxWords = Math.max(words1.length, words2.length);

    return maxWords > 0 ? overlap / maxWords : 0.0;
}

/**
 * Calculate string similarity between full names
 * @param {string} str1 - Name string 1
 * @param {string} str2 - Name string 2
 * @returns {number} Similarity score 0-1
 */
function calculateStringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;

    const s1 = str1.toUpperCase().trim();
    const s2 = str2.toUpperCase().trim();

    if (s1 === s2) return 1.0;

    // Check substring matches
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;

    // Word-based overlap analysis
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    const overlap = words1.filter(w => words2.includes(w) && w.length > 1).length;
    const maxWords = Math.max(words1.length, words2.length);

    return maxWords > 0 ? overlap / maxWords : 0.0;
}

/**
 * Calculate final weighted score using configurable parameters
 * @param {Object} componentScore - Component comparison results
 * @param {number} stringSimilarity - String similarity score
 * @param {Object} data1 - Name data 1
 * @param {Object} data2 - Name data 2
 * @returns {Object} Final score with confidence and reason
 */
function calculateFinalScore(componentScore, stringSimilarity, data1, data2) {
    let finalScore;
    let confidence;
    let reason;

    // Use configurable weights based on data structure availability
    if (componentScore.hasStructuredData) {
        finalScore = (
            (componentScore.weightedScore * matchingConfig.structuredComponentWeight) +
            (stringSimilarity * matchingConfig.structuredStringSimilarityWeight)
        );
        confidence = matchingConfig.structuredDataConfidence;
        reason = `Component-based analysis (${Math.round(matchingConfig.structuredComponentWeight * 100)}% components, ${Math.round(matchingConfig.structuredStringSimilarityWeight * 100)}% string)`;
    } else {
        finalScore = (
            (stringSimilarity * matchingConfig.unstructuredStringWeight) +
            (componentScore.weightedScore * matchingConfig.unstructuredComponentWeight)
        );
        confidence = matchingConfig.unstructuredDataConfidence;
        reason = `String-based analysis (${Math.round(matchingConfig.unstructuredStringWeight * 100)}% string, ${Math.round(matchingConfig.unstructuredComponentWeight * 100)}% components)`;
    }

    return {
        score: Math.round(finalScore * 100) / 100,
        confidence: confidence,
        reason
    };
}

/**
 * Generate random non-overlapping samples from an array
 * @param {Array} array - Source array to sample from
 * @param {number} outerSampleSize - Size of outer sample
 * @param {number} innerSampleSize - Size of inner sample
 * @returns {Object} Object with outerSample and innerSample arrays
 */
function getRandomNonOverlappingSamples(array, outerSampleSize, innerSampleSize) {
    if (outerSampleSize + innerSampleSize > array.length) {
        throw new Error(`Combined sample size (${outerSampleSize + innerSampleSize}) exceeds array length (${array.length})`);
    }

    // Create array of indices
    const allIndices = Array.from({length: array.length}, (_, i) => i);

    // Shuffle indices using Fisher-Yates algorithm
    for (let i = allIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allIndices[i], allIndices[j]] = [allIndices[j], allIndices[i]];
    }

    // Take non-overlapping samples
    const outerIndices = allIndices.slice(0, outerSampleSize);
    const innerIndices = allIndices.slice(outerSampleSize, outerSampleSize + innerSampleSize);

    return {
        outerSample: outerIndices.map(i => ({ index: i, item: array[i] })),
        innerSample: innerIndices.map(i => ({ index: i, item: array[i] }))
    };
}

/**
 * Test name comparison with real entity data using combined dataset
 * @param {number} outerSampleSize - Number of entities for outer loop
 * @param {number} innerSampleSize - Number of entities for inner loop
 * @returns {Object} Test results
 */
function testNameComparison(outerSampleSize = 5, innerSampleSize = 5) {
    console.log(`🧪 Testing Name Comparison System (${outerSampleSize} x ${innerSampleSize})...`);
    console.log('Config:', matchingConfig);

    // Check if entities are loaded
    if (!window.workingLoadedEntities || workingLoadedEntities.status !== 'loaded') {
        console.error('❌ Entities not loaded. Run loadAllEntitiesIntoMemory() first.');
        return null;
    }

    const testResults = {
        config: {...matchingConfig},
        outerSamples: [],
        innerSamples: [],
        comparisons: [],
        summary: {
            totalComparisons: 0,
            highScoreMatches: 0,
            exactMatches: 0,
            outerSampleSize,
            innerSampleSize
        }
    };

    // Combine all Individual entities from both data sources
    const combinedIndividuals = [];

    // Add VisionAppraisal Individual entities
    // Use constructor.name for deserialized class instances (type property is intentionally excluded during deserialization)
    const vaIndividuals = workingLoadedEntities.visionAppraisal.entities
        .filter(e => (e.constructor?.name || e.type) === 'Individual');

    vaIndividuals.forEach((entity, i) => {
        const name = extractNameWorking(entity);
        combinedIndividuals.push({
            source: 'VisionAppraisal',
            sourceIndex: i,
            pid: entity.pid,
            name: name,
            displayName: name.completeName || 'No completeName',
            entity: entity
        });
    });

    // Add Bloomerang Individual entities
    if (workingLoadedEntities.bloomerang.individuals) {
        const bloomerangEntries = Object.entries(workingLoadedEntities.bloomerang.individuals.entities);
        bloomerangEntries.forEach(([id, entity], i) => {
            const name = extractNameWorking(entity);
            combinedIndividuals.push({
                source: 'Bloomerang',
                sourceIndex: i,
                id: id,
                name: name,
                displayName: name.completeName || 'ERROR: No completeName',
                entity: entity
            });
        });
    }

    console.log(`📊 Combined dataset: ${combinedIndividuals.length} Individual entities (${vaIndividuals.length} VisionAppraisal + ${Object.keys(workingLoadedEntities.bloomerang.individuals?.entities || {}).length} Bloomerang)`);

    // Use full combined dataset (duplicates are legitimate)
    const workingDataset = combinedIndividuals.map((entity, index) => ({...entity, combinedIndex: index}));
    const totalEntities = workingDataset.length;

    // Get random sample for outer loop only
    if (outerSampleSize >= totalEntities) {
        console.error(`❌ Outer sample size (${outerSampleSize}) must be less than total entities (${totalEntities})`);
        return null;
    }

    // Randomly select outer sample from deduplicated dataset
    const shuffledIndices = Array.from({length: totalEntities}, (_, i) => i);
    for (let i = shuffledIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
    }

    const outerIndices = shuffledIndices.slice(0, outerSampleSize);

    testResults.outerSamples = outerIndices.map(index => ({
        combinedIndex: index,
        source: workingDataset[index].source,
        sourceIndex: workingDataset[index].sourceIndex,
        pid: workingDataset[index].pid,
        id: workingDataset[index].id,
        name: workingDataset[index].name,
        displayName: workingDataset[index].displayName
    }));

    // Inner sample is ALL entities (we'll skip self-comparison in the loop)
    testResults.innerSamples = workingDataset.map((entity, index) => ({
        combinedIndex: index,
        source: entity.source,
        sourceIndex: entity.sourceIndex,
        pid: entity.pid,
        id: entity.id,
        name: entity.name,
        displayName: entity.displayName
    }));

    console.log(`📊 Comparison setup: ${outerSampleSize} outer samples vs ${testResults.innerSamples.length} inner samples (with self-comparison skip)`);

    // Test all combinations (outer x inner) with self-comparison skip
    testResults.outerSamples.forEach(outerSample => {
        testResults.innerSamples.forEach(innerSample => {
            // Skip self-comparison
            if (outerSample.combinedIndex === innerSample.combinedIndex) {
                return;
            }

            const comparison = compareNames(outerSample.name, innerSample.name);

            testResults.comparisons.push({
                outerIndex: outerSample.combinedIndex,
                innerIndex: innerSample.combinedIndex,
                outerSource: outerSample.source,
                innerSource: innerSample.source,
                outerPid: outerSample.pid,
                outerBloomId: outerSample.id,
                innerPid: innerSample.pid,
                innerBloomId: innerSample.id,
                outerName: outerSample.displayName,
                innerName: innerSample.displayName,
                ...comparison
            });

            testResults.summary.totalComparisons++;
            if (comparison.score >= 0.7) testResults.summary.highScoreMatches++;
            if (comparison.score === 1.0) testResults.summary.exactMatches++;
        });
    });

    // Display results
    console.log('📊 Test Results Summary:');
    console.log(`Total comparisons: ${testResults.summary.totalComparisons}`);
    console.log(`High-score matches (≥70%): ${testResults.summary.highScoreMatches}`);
    console.log(`Exact matches: ${testResults.summary.exactMatches}`);

    // Show top matches
    const topMatches = testResults.comparisons
        .filter(c => c.score >= 0.5)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

    if (topMatches.length > 0) {
        console.log('\n🎯 Top scoring matches:');
        topMatches.forEach(match => {
            console.log(`${match.score}: "${match.vaName}" vs "${match.bloomName}" - ${match.reason}`);
        });
    }

    return testResults;
}

/**
 * Score Distribution Study - Compare random sample against entire dataset
 * @param {number} sampleSize - Number of random records to analyze (default 10)
 * @param {boolean} includeDetailedComparisons - Whether to include detailed comparison rows (default true)
 * @returns {Object} Study results with CSV download
 */
function scoreDistributionStudy(sampleSize = 10, includeDetailedComparisons = true) {
    console.log(`📊 Starting Score Distribution Study (${sampleSize} records vs entire dataset)...`);

    // Check if entities are loaded
    if (!window.workingLoadedEntities || workingLoadedEntities.status !== 'loaded') {
        console.error('❌ Entities not loaded. Run loadAllEntitiesIntoMemory() first.');
        return null;
    }

    // Combine all Individual entities from both data sources
    const combinedIndividuals = [];

    // Add VisionAppraisal Individual entities
    // Use constructor.name for deserialized class instances (type property is intentionally excluded during deserialization)
    const vaIndividuals = workingLoadedEntities.visionAppraisal.entities
        .filter(e => (e.constructor?.name || e.type) === 'Individual');

    vaIndividuals.forEach((entity, i) => {
        const name = extractNameWorking(entity);
        combinedIndividuals.push({
            source: 'VisionAppraisal',
            sourceIndex: i,
            pid: entity.pid,
            name: name,
            displayName: name.completeName || 'No completeName',
            entity: entity
        });
    });

    // Add Bloomerang Individual entities
    if (workingLoadedEntities.bloomerang.individuals) {
        const bloomerangEntries = Object.entries(workingLoadedEntities.bloomerang.individuals.entities);
        bloomerangEntries.forEach(([id, entity], i) => {
            const name = extractNameWorking(entity);
            combinedIndividuals.push({
                source: 'Bloomerang',
                sourceIndex: i,
                id: id,
                name: name,
                displayName: name.completeName || 'ERROR: No completeName',
                entity: entity
            });
        });
    }

    const totalEntities = combinedIndividuals.length;
    console.log(`📊 Dataset: ${totalEntities} Individual entities`);

    if (sampleSize >= totalEntities) {
        console.error(`❌ Sample size (${sampleSize}) must be less than total entities (${totalEntities})`);
        return null;
    }

    // Get random sample
    const shuffledIndices = Array.from({length: totalEntities}, (_, i) => i);
    for (let i = shuffledIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
    }

    const sampleIndices = shuffledIndices.slice(0, sampleSize);
    const targetEntities = sampleIndices.map(i => combinedIndividuals[i]);

    console.log(`🎯 Selected ${sampleSize} random entities for analysis`);

    // Prepare CSV data structure
    const csvData = [];
    const studyResults = {
        totalEntities,
        sampleSize,
        targetEntities: [],
        distributionAnalysis: []
    };

    // Analyze each target entity against the entire dataset
    targetEntities.forEach((targetEntity, targetIndex) => {
        const scores = [];
        const comparisons = [];
        const targetCombinedIndex = sampleIndices[targetIndex];

        // Compare against entire dataset (excluding self)
        combinedIndividuals.forEach((compareEntity, compareIndex) => {
            // Skip self-comparison using original dataset index
            if (compareIndex === targetCombinedIndex) return;

            const comparison = compareNames(targetEntity.name, compareEntity.name);
            scores.push(comparison.score);

            // Store detailed comparison for CSV
            comparisons.push({
                targetIndex: targetIndex + 1,
                targetSource: targetEntity.source,
                targetPid: targetEntity.pid || '',
                targetBloomId: targetEntity.id || '',
                targetName: targetEntity.displayName,
                compareSource: compareEntity.source,
                comparePid: compareEntity.pid || '',
                compareBloomId: compareEntity.id || '',
                compareName: compareEntity.displayName,
                score: comparison.score,
                confidence: comparison.confidence,
                match: comparison.match,
                reason: comparison.reason
            });
        });

        // Calculate distribution statistics
        scores.sort((a, b) => b - a);

        // Calculate 98th percentile
        const percentile98Index = Math.floor(scores.length * 0.02); // Top 2% (98th percentile)
        const percentile98Score = scores[percentile98Index] || 0;

        // Create proper score distribution buckets (5% increments, mutually exclusive ranges)
        const distribution = {
            targetIndex: targetIndex + 1,
            targetName: targetEntity.displayName,
            targetSource: targetEntity.source,
            totalComparisons: scores.length,
            maxScore: Math.max(...scores),
            minScore: Math.min(...scores),
            meanScore: scores.reduce((a, b) => a + b, 0) / scores.length,
            medianScore: scores[Math.floor(scores.length / 2)],
            percentile98Score: percentile98Score,
            // 5% increment distribution buckets (mutually exclusive ranges)
            scores95to100: scores.filter(s => s >= 0.95).length,
            scores90to94: scores.filter(s => s >= 0.90 && s < 0.95).length,
            scores85to89: scores.filter(s => s >= 0.85 && s < 0.90).length,
            scores80to84: scores.filter(s => s >= 0.80 && s < 0.85).length,
            scores75to79: scores.filter(s => s >= 0.75 && s < 0.80).length,
            scores70to74: scores.filter(s => s >= 0.70 && s < 0.75).length,
            scores65to69: scores.filter(s => s >= 0.65 && s < 0.70).length,
            scores60to64: scores.filter(s => s >= 0.60 && s < 0.65).length,
            scores55to59: scores.filter(s => s >= 0.55 && s < 0.60).length,
            scores50to54: scores.filter(s => s >= 0.50 && s < 0.55).length,
            scores45to49: scores.filter(s => s >= 0.45 && s < 0.50).length,
            scores40to44: scores.filter(s => s >= 0.40 && s < 0.45).length,
            scores35to39: scores.filter(s => s >= 0.35 && s < 0.40).length,
            scores30to34: scores.filter(s => s >= 0.30 && s < 0.35).length,
            scores25to29: scores.filter(s => s >= 0.25 && s < 0.30).length,
            scores20to24: scores.filter(s => s >= 0.20 && s < 0.25).length,
            scores15to19: scores.filter(s => s >= 0.15 && s < 0.20).length,
            scores10to14: scores.filter(s => s >= 0.10 && s < 0.15).length,
            scores05to09: scores.filter(s => s >= 0.05 && s < 0.10).length,
            scores00to04: scores.filter(s => s >= 0.00 && s < 0.05).length,
            topMatches: comparisons
                .sort((a, b) => b.score - a.score)
                .slice(0, 10)
                .map(c => `${c.score.toFixed(3)} - "${c.compareName}" (${c.compareSource})`)
                .join(' | ')
        };

        // Calculate distribution total for verification
        const distributionTotal = distribution.scores95to100 + distribution.scores90to94 + distribution.scores85to89 +
                                  distribution.scores80to84 + distribution.scores75to79 + distribution.scores70to74 +
                                  distribution.scores65to69 + distribution.scores60to64 + distribution.scores55to59 +
                                  distribution.scores50to54 + distribution.scores45to49 + distribution.scores40to44 +
                                  distribution.scores35to39 + distribution.scores30to34 + distribution.scores25to29 +
                                  distribution.scores20to24 + distribution.scores15to19 + distribution.scores10to14 +
                                  distribution.scores05to09 + distribution.scores00to04;

        // Add distributionTotal to the distribution object for later verification
        distribution.distributionTotal = distributionTotal;

        studyResults.targetEntities.push(targetEntity);
        studyResults.distributionAnalysis.push(distribution);

        // Add distribution summary to CSV
        csvData.push([
            `TARGET ${targetIndex + 1}`,
            targetEntity.displayName,
            targetEntity.source,
            targetEntity.pid || '',
            targetEntity.id || '',
            scores.length,
            distribution.maxScore.toFixed(4),
            distribution.meanScore.toFixed(4),
            distribution.medianScore.toFixed(4),
            distribution.percentile98Score.toFixed(4),
            distribution.scores95to100,
            distribution.scores90to94,
            distribution.scores85to89,
            distribution.scores80to84,
            distribution.scores75to79,
            distribution.scores70to74,
            distribution.scores65to69,
            distribution.scores60to64,
            distribution.scores55to59,
            distribution.scores50to54,
            distribution.scores45to49,
            distribution.scores40to44,
            distribution.scores35to39,
            distribution.scores30to34,
            distribution.scores25to29,
            distribution.scores20to24,
            distribution.scores15to19,
            distribution.scores10to14,
            distribution.scores05to09,
            distribution.scores00to04,
            distributionTotal,
            distribution.topMatches
        ]);

        // Conditionally add detailed comparisons
        if (includeDetailedComparisons) {
            csvData.push(['']); // Blank row separator
            csvData.push([
                'Detail Comparisons',
                'Compare Name',
                'Compare Source',
                'Compare PID',
                'Compare Bloom ID',
                'Score',
                'Confidence',
                'Match',
                'Reason'
            ]);

            comparisons
                .sort((a, b) => b.score - a.score)
                .slice(0, 20) // Top 20 matches for each target
                .forEach(comp => {
                    csvData.push([
                        '',
                        comp.compareName,
                        comp.compareSource,
                        comp.comparePid,
                        comp.compareBloomId,
                        comp.score.toFixed(4),
                        comp.confidence.toFixed(4),
                        comp.match,
                        comp.reason
                    ]);
                });

            csvData.push(['']); // Blank row separator
        }
    });

    // Generate CSV content
    const csvHeaders = [
        'Target Entity',
        'Target Name',
        'Target Source',
        'Target PID',
        'Target Bloom ID',
        'Total Comparisons',
        'Max Score',
        'Mean Score',
        'Median Score',
        '98th Percentile Score',
        'Scores 95-100%',
        'Scores 90-94%',
        'Scores 85-89%',
        'Scores 80-84%',
        'Scores 75-79%',
        'Scores 70-74%',
        'Scores 65-69%',
        'Scores 60-64%',
        'Scores 55-59%',
        'Scores 50-54%',
        'Scores 45-49%',
        'Scores 40-44%',
        'Scores 35-39%',
        'Scores 30-34%',
        'Scores 25-29%',
        'Scores 20-24%',
        'Scores 15-19%',
        'Scores 10-14%',
        'Scores 5-9%',
        'Scores 0-4%',
        'Distribution Total',
        'Top 10 Matches'
    ];

    const csvContent = [csvHeaders, ...csvData]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    // Download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const detailSuffix = includeDetailedComparisons ? '_detailed' : '_summary';
    a.download = `score_distribution_study_${sampleSize}_entities${detailSuffix}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Calculate and verify grand totals
    const grandTotalComparisons = studyResults.distributionAnalysis.reduce((sum, dist) => sum + dist.totalComparisons, 0);
    const grandTotalDistribution = studyResults.distributionAnalysis.reduce((sum, dist) => sum + dist.distributionTotal, 0);
    const expectedGrandTotal = sampleSize * (totalEntities - 1);

    console.log('✅ Score Distribution Study complete');
    console.log('🔍 VERIFICATION TOTALS:');
    console.log(`   Expected total comparisons: ${expectedGrandTotal.toLocaleString()}`);
    console.log(`   Actual total comparisons: ${grandTotalComparisons.toLocaleString()}`);
    console.log(`   Distribution buckets total: ${grandTotalDistribution.toLocaleString()}`);
    console.log(`   Verification: ${grandTotalComparisons === expectedGrandTotal && grandTotalComparisons === grandTotalDistribution ? '✅ PASSED' : '❌ FAILED'}`);

    const outputType = includeDetailedComparisons ? 'detailed analysis' : 'summary only';
    console.log(`📁 CSV file downloaded with ${outputType} (${sampleSize} entities analyzed)`);

    return studyResults;
}

/**
 * Performance Testing - Test different sample sizes to estimate runtime
 * @param {Array} testSizes - Array of sample sizes to test [5, 10, 25, 50]
 * @returns {Object} Performance analysis with time estimates
 */
function performanceTest(testSizes = [5, 10, 25, 50]) {
    console.log(`⏱️  Starting Performance Test for sample sizes: ${testSizes.join(', ')}`);

    if (!window.workingLoadedEntities || workingLoadedEntities.status !== 'loaded') {
        console.error('❌ Entities not loaded. Run loadAllEntitiesIntoMemory() first.');
        return null;
    }

    // Get combined dataset size
    const combinedIndividuals = [];

    // Add VisionAppraisal Individual entities
    // Use constructor.name for deserialized class instances (type property is intentionally excluded during deserialization)
    const vaIndividuals = workingLoadedEntities.visionAppraisal.entities
        .filter(e => (e.constructor?.name || e.type) === 'Individual');
    vaIndividuals.forEach((entity, i) => {
        const name = extractNameWorking(entity);
        combinedIndividuals.push({
            source: 'VisionAppraisal',
            name: name,
            displayName: name.completeName || 'No completeName'
        });
    });

    // Add Bloomerang Individual entities
    if (workingLoadedEntities.bloomerang.individuals) {
        const bloomerangEntries = Object.entries(workingLoadedEntities.bloomerang.individuals.entities);
        bloomerangEntries.forEach(([id, entity]) => {
            const name = extractNameWorking(entity);
            combinedIndividuals.push({
                source: 'Bloomerang',
                name: name,
                displayName: typeof name === 'string' ? name : name.completeName || 'No name'
            });
        });
    }

    const totalEntities = combinedIndividuals.length;
    console.log(`📊 Dataset: ${totalEntities} Individual entities`);

    const results = {
        totalEntities,
        testResults: [],
        projections: {}
    };

    // Test each sample size
    for (let sampleSize of testSizes) {
        if (sampleSize >= totalEntities) {
            console.log(`⚠️  Skipping sample size ${sampleSize} (>= dataset size)`);
            continue;
        }

        console.log(`\n🔍 Testing sample size: ${sampleSize}`);
        const startTime = performance.now();

        // Get random sample
        const shuffledIndices = Array.from({length: totalEntities}, (_, i) => i);
        for (let i = shuffledIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
        }

        const sampleIndices = shuffledIndices.slice(0, sampleSize);
        let comparisonCount = 0;

        // Run comparisons with timing
        sampleIndices.forEach(outerIndex => {
            const targetEntity = combinedIndividuals[outerIndex];

            combinedIndividuals.forEach((compareEntity, compareIndex) => {
                // Skip self-comparison
                if (compareIndex === outerIndex) return;

                // Do the actual comparison (this is what takes time)
                compareNames(targetEntity.name, compareEntity.name);
                comparisonCount++;
            });
        });

        const endTime = performance.now();
        const duration = endTime - startTime;
        const comparisonsPerSecond = comparisonCount / (duration / 1000);
        const expectedComparisons = sampleSize * (totalEntities - 1);

        const testResult = {
            sampleSize,
            actualComparisons: comparisonCount,
            expectedComparisons,
            durationMs: Math.round(duration),
            durationSeconds: Math.round(duration / 1000),
            comparisonsPerSecond: Math.round(comparisonsPerSecond),
            comparisonsPerMs: comparisonCount / duration
        };

        results.testResults.push(testResult);

        console.log(`✅ Sample ${sampleSize}: ${comparisonCount} comparisons in ${testResult.durationSeconds}s (${testResult.comparisonsPerSecond} comp/sec)`);
    }

    // Calculate projections for larger sample sizes
    if (results.testResults.length > 0) {
        // Use the largest test for projection baseline
        const baselineTest = results.testResults[results.testResults.length - 1];
        const avgComparisonsPerMs = baselineTest.comparisonsPerMs;

        console.log(`\n📈 PROJECTIONS (based on ${baselineTest.comparisonsPerSecond} comparisons/second):`);

        const projectionSizes = [100, 200, 500, 1000, 1500, 2000];

        projectionSizes.forEach(size => {
            if (size >= totalEntities) return;

            const projectedComparisons = size * (totalEntities - 1);
            const projectedTimeMs = projectedComparisons / avgComparisonsPerMs;
            const projectedTimeMinutes = projectedTimeMs / (1000 * 60);
            const projectedTimeHours = projectedTimeMinutes / 60;

            results.projections[size] = {
                sampleSize: size,
                projectedComparisons,
                projectedTimeMinutes: Math.round(projectedTimeMinutes),
                projectedTimeHours: Math.round(projectedTimeHours * 100) / 100,
                feasibleFor1Hour: projectedTimeHours <= 1
            };

            const timeStr = projectedTimeHours >= 1
                ? `${results.projections[size].projectedTimeHours}h`
                : `${results.projections[size].projectedTimeMinutes}m`;

            const feasible = projectedTimeHours <= 1 ? "✅ FEASIBLE" : "❌ TOO LONG";

            console.log(`  Size ${size}: ${projectedComparisons.toLocaleString()} comparisons → ~${timeStr} ${feasible}`);
        });

        // Find maximum feasible size for 1 hour
        const feasibleSizes = Object.values(results.projections).filter(p => p.feasibleFor1Hour);
        if (feasibleSizes.length > 0) {
            const maxFeasible = Math.max(...feasibleSizes.map(p => p.sampleSize));
            console.log(`\n🎯 RECOMMENDATION: Maximum sample size for <1 hour: ${maxFeasible}`);
            results.recommendedMaxSize = maxFeasible;
        }
    }

    console.log(`\n📊 Performance test complete. Use results to choose optimal sample size.`);
    return results;
}

/**
 * Detailed Score Analysis - Reconstruct and explain any comparison calculation
 * @param {string} name1 - First name to compare (display name)
 * @param {string} name2 - Second name to compare (display name)
 * @returns {Object} Detailed breakdown of score calculation
 */
function explainScoreCalculation(name1, name2) {
    console.log(`\n🔍 DETAILED SCORE ANALYSIS`);
    console.log(`Name 1: "${name1}"`);
    console.log(`Name 2: "${name2}"`);
    console.log(`Config: ${JSON.stringify(matchingConfig, null, 2)}`);
    console.log(`\n=== STEP 1: EXTRACT NAME DATA ===`);

    // We need to find the actual entities to get proper structured data
    if (!window.workingLoadedEntities || workingLoadedEntities.status !== 'loaded') {
        console.error('❌ Entities not loaded. Run loadAllEntitiesIntoMemory() first.');
        return null;
    }

    // Find matching entities by display name
    let entity1 = null, entity2 = null;
    let entity1Source = '', entity2Source = '';

    // Search VisionAppraisal entities
    // Use constructor.name for deserialized class instances (type property is intentionally excluded during deserialization)
    const vaIndividuals = workingLoadedEntities.visionAppraisal.entities
        .filter(e => (e.constructor?.name || e.type) === 'Individual');

    for (let entity of vaIndividuals) {
        const name = extractNameWorking(entity);
        const displayName = name.completeName || 'No completeName';
        if (displayName === name1) {
            entity1 = entity;
            entity1Source = 'VisionAppraisal';
            break;
        }
        if (displayName === name2) {
            entity2 = entity;
            entity2Source = 'VisionAppraisal';
            break;
        }
    }

    // Search Bloomerang entities
    if (workingLoadedEntities.bloomerang.individuals) {
        const bloomerangEntries = Object.entries(workingLoadedEntities.bloomerang.individuals.entities);
        for (let [id, entity] of bloomerangEntries) {
            const name = extractNameWorking(entity);
            const displayName = name.completeName || 'ERROR: No completeName';
            if (displayName === name1 && !entity1) {
                entity1 = entity;
                entity1Source = 'Bloomerang';
            }
            if (displayName === name2 && !entity2) {
                entity2 = entity;
                entity2Source = 'Bloomerang';
            }
        }
    }

    if (!entity1 || !entity2) {
        console.error(`❌ Could not find entities for "${name1}" and/or "${name2}"`);
        return null;
    }

    console.log(`✅ Found Entity 1: ${entity1Source}`);
    console.log(`✅ Found Entity 2: ${entity2Source}`);

    // Extract name data with full detail logging
    const data1 = extractNameData(extractNameWorking(entity1));
    const data2 = extractNameData(extractNameWorking(entity2));

    console.log(`\nEntity 1 Data:`, data1);
    console.log(`Entity 2 Data:`, data2);

    console.log(`\n=== STEP 2: COMPONENT COMPARISON ===`);

    // Detailed component comparison
    if (!data1.isStructured || !data2.isStructured) {
        console.log(`❌ Missing structured data - cannot do component analysis`);
        console.log(`Data1 structured: ${data1.isStructured}, Data2 structured: ${data2.isStructured}`);

        // Fall back to string comparison only
        const stringSimilarity = calculateStringSimilarity(data1.displayName, data2.displayName);
        console.log(`\n=== STEP 3: STRING SIMILARITY ONLY ===`);
        console.log(`String 1: "${data1.displayName}"`);
        console.log(`String 2: "${data2.displayName}"`);
        console.log(`String similarity score: ${stringSimilarity}`);

        const finalScore = stringSimilarity * matchingConfig.unstructuredStringWeight;
        console.log(`\n=== FINAL SCORE ===`);
        console.log(`Final score: ${stringSimilarity} × ${matchingConfig.unstructuredStringWeight} = ${finalScore}`);

        return {
            name1, name2,
            data1, data2,
            componentScore: null,
            stringSimilarity,
            finalScore,
            explanation: 'String-only comparison (no structured data)'
        };
    }

    // Component analysis with full details
    console.log(`\n--- Component Analysis ---`);

    console.log(`First Name Comparison:`);
    console.log(`  "${data1.firstName}" vs "${data2.firstName}"`);
    const firstNameScore = compareComponent(data1.firstName, data2.firstName);
    console.log(`  Score: ${firstNameScore}`);

    console.log(`Last Name Comparison:`);
    console.log(`  "${data1.lastName}" vs "${data2.lastName}"`);
    const lastNameScore = compareComponent(data1.lastName, data2.lastName);
    console.log(`  Score: ${lastNameScore}`);

    console.log(`Other Names Comparison:`);
    console.log(`  "${data1.otherNames}" vs "${data2.otherNames}"`);
    const otherNamesScore = compareComponent(data1.otherNames, data2.otherNames);
    console.log(`  Score: ${otherNamesScore}`);

    // Weighted component score
    const componentWeightedScore = (
        (lastNameScore * matchingConfig.lastNameWeight) +
        (firstNameScore * matchingConfig.firstNameWeight) +
        (otherNamesScore * matchingConfig.otherNamesWeight)
    );

    console.log(`\nWeighted Component Score:`);
    console.log(`  (${lastNameScore} × ${matchingConfig.lastNameWeight}) + (${firstNameScore} × ${matchingConfig.firstNameWeight}) + (${otherNamesScore} × ${matchingConfig.otherNamesWeight})`);
    console.log(`  = ${componentWeightedScore}`);

    console.log(`\n=== STEP 3: STRING SIMILARITY ===`);
    const stringSimilarity = calculateStringSimilarity(data1.displayName, data2.displayName);
    console.log(`Full name string similarity: ${stringSimilarity}`);

    console.log(`\n=== STEP 4: FINAL WEIGHTED SCORE ===`);
    const finalScore = (
        (componentWeightedScore * matchingConfig.structuredComponentWeight) +
        (stringSimilarity * matchingConfig.structuredStringSimilarityWeight)
    );

    console.log(`Final weighted score:`);
    console.log(`  (${componentWeightedScore} × ${matchingConfig.structuredComponentWeight}) + (${stringSimilarity} × ${matchingConfig.structuredStringSimilarityWeight})`);
    console.log(`  = ${finalScore}`);

    console.log(`\n=== SUMMARY ===`);
    console.log(`✅ Component Score: ${componentWeightedScore}`);
    console.log(`✅ String Score: ${stringSimilarity}`);
    console.log(`✅ Final Score: ${finalScore}`);

    return {
        name1, name2,
        entity1Source, entity2Source,
        data1, data2,
        componentScores: {
            firstName: firstNameScore,
            lastName: lastNameScore,
            otherNames: otherNamesScore
        },
        componentWeightedScore,
        stringSimilarity,
        finalScore,
        explanation: 'Complete component and string analysis'
    };
}

// Export functions
if (typeof window !== 'undefined') {
    window.compareNames = compareNames;
    window.updateMatchingConfig = updateMatchingConfig;
    window.testNameComparison = testNameComparison;
    window.scoreDistributionStudy = scoreDistributionStudy;
    window.performanceTest = performanceTest;
    window.explainScoreCalculation = explainScoreCalculation;
    window.getRandomNonOverlappingSamples = getRandomNonOverlappingSamples;
    window.matchingConfig = matchingConfig;
}

console.log('🔍 Name Matching Analysis (Refined) ready');
console.log('💡 Usage: testNameComparison(outerSize, innerSize) - e.g. testNameComparison(10, 15)');
console.log('💡 Study: scoreDistributionStudy(sampleSize, includeDetails) - e.g. scoreDistributionStudy(1000, false)');
console.log('💡 Performance: performanceTest([5,10,25,50]) - test runtime for different sample sizes');
console.log('💡 Explain: explainScoreCalculation("Name 1", "Name 2") - detailed score breakdown');
console.log('💡 Config: updateMatchingConfig({matchThreshold: 0.7}) to adjust parameters');