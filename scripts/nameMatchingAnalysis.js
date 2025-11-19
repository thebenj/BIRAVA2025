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
 * Test name comparison with real entity data
 * @param {number} sampleSize - Number of entities to test from each source
 * @returns {Object} Test results
 */
function testNameComparison(sampleSize = 5) {
    console.log('🧪 Testing Name Comparison System...');
    console.log('Config:', matchingConfig);

    // Check if entities are loaded
    if (!window.workingLoadedEntities || workingLoadedEntities.status !== 'loaded') {
        console.error('❌ Entities not loaded. Run loadAllEntitiesIntoMemory() first.');
        return null;
    }

    const testResults = {
        config: {...matchingConfig},
        visionAppraisalSamples: [],
        bloomerangSamples: [],
        comparisons: [],
        summary: {
            totalComparisons: 0,
            highScoreMatches: 0,
            exactMatches: 0
        }
    };

    // Get sample VisionAppraisal Individual entities
    const vaIndividuals = workingLoadedEntities.visionAppraisal.entities
        .filter(e => e.__type === 'Individual')
        .slice(0, sampleSize);

    vaIndividuals.forEach((entity, i) => {
        const name = extractNameWorking(entity);
        testResults.visionAppraisalSamples.push({
            index: i,
            pid: entity.pid,
            name: name,
            displayName: name.completeName || 'No completeName'
        });
    });

    // Get sample Bloomerang Individual entities
    if (workingLoadedEntities.bloomerang.individuals) {
        const bloomerangIndividuals = Object.entries(workingLoadedEntities.bloomerang.individuals.entities)
            .slice(0, sampleSize);

        bloomerangIndividuals.forEach(([id, entity], i) => {
            const name = extractNameWorking(entity);
            testResults.bloomerangSamples.push({
                index: i,
                id: id,
                name: name,
                displayName: typeof name === 'string' ? name : name.completeName || 'No name'
            });
        });
    }

    // Test all combinations
    testResults.visionAppraisalSamples.forEach(vaSample => {
        testResults.bloomerangSamples.forEach(bloomSample => {
            const comparison = compareNames(vaSample.name, bloomSample.name);

            testResults.comparisons.push({
                vaPid: vaSample.pid,
                bloomId: bloomSample.id,
                vaName: vaSample.displayName,
                bloomName: bloomSample.displayName,
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

// Export functions
if (typeof window !== 'undefined') {
    window.compareNames = compareNames;
    window.updateMatchingConfig = updateMatchingConfig;
    window.testNameComparison = testNameComparison;
    window.matchingConfig = matchingConfig;
}

console.log('🔍 Name Matching Analysis (Refined) ready');
console.log('💡 Usage: testNameComparison(5) to test with sample data');
console.log('💡 Config: updateMatchingConfig({matchThreshold: 0.7}) to adjust parameters');