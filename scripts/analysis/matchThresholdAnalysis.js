/**
 * matchThresholdAnalysis.js
 *
 * Purpose: Analyze comparison results to determine optimal thresholds for:
 * 1. Minimum score (below which we're certain there's no match)
 * 2. High confidence match score (very high likelihood of true match)
 * 3. Component-based rules that indicate likely matches
 *
 * This script analyzes the output from analyzeAllIndividuals() and provides
 * data-driven recommendations with validation methods.
 *
 * Usage:
 *   // First, run the analysis to collect data:
 *   fetch('./scripts/matching/universalEntityMatcher.js').then(r => r.text()).then(eval)
 *   analyzeAllIndividuals(null, { download: false });  // or with a limit for testing
 *
 *   // Then run this analysis:
 *   fetch('./scripts/analysis/matchThresholdAnalysis.js').then(r => r.text()).then(eval)
 */

(function runMatchThresholdAnalysis() {
    console.log('=== MATCH THRESHOLD ANALYSIS ===\n');

    if (!window.lastAnalysisResults || window.lastAnalysisResults.length === 0) {
        console.error('ERROR: No analysis results found. Run analyzeAllIndividuals() first.');
        return null;
    }

    const results = window.lastAnalysisResults;
    console.log(`Analyzing ${results.length} base entity comparisons...\n`);

    // ========================================================================
    // PHASE 1: Collect all comparisons by type
    // ========================================================================

    const comparisonsByType = {};
    const allComparisons = [];

    results.forEach(result => {
        if (!result || !result.bestMatchesByType) return;

        Object.keys(result.bestMatchesByType).forEach(targetType => {
            const typeData = result.bestMatchesByType[targetType];
            const comparisonType = `${result.baseEntity.type}-to-${targetType}`;

            if (!comparisonsByType[comparisonType]) {
                comparisonsByType[comparisonType] = {
                    scores: [],
                    comparisons: [],
                    nameScores: [],
                    contactInfoScores: []
                };
            }

            // Add ALL scores (not just best matches) for distribution analysis
            if (typeData.allScores) {
                comparisonsByType[comparisonType].scores.push(...typeData.allScores);
            }

            // Add detailed comparisons from best matches
            typeData.bestMatches?.forEach(match => {
                const comp = {
                    baseKey: result.baseEntity.key,
                    baseName: result.baseEntity.name,
                    baseSource: result.baseEntity.source,
                    targetKey: match.targetKey,
                    targetName: getEntityDisplayName(match.targetEntity),
                    targetSource: match.targetSource,
                    score: match.score,
                    nameScore: match.details?.components?.name?.similarity,
                    contactInfoScore: match.details?.components?.contactInfo?.similarity,
                    matchedIndividualName: match.matchedIndividual ?
                        getEntityDisplayName(match.matchedIndividual) : null,
                    comparisonType: match.comparisonType
                };

                comparisonsByType[comparisonType].comparisons.push(comp);
                allComparisons.push(comp);

                if (comp.nameScore !== undefined) {
                    comparisonsByType[comparisonType].nameScores.push(comp.nameScore);
                }
                if (comp.contactInfoScore !== undefined) {
                    comparisonsByType[comparisonType].contactInfoScores.push(comp.contactInfoScore);
                }
            });
        });
    });

    // ========================================================================
    // PHASE 2: Statistical Analysis by Comparison Type
    // ========================================================================

    console.log('=== SCORE DISTRIBUTIONS BY COMPARISON TYPE ===\n');

    const typeAnalysis = {};

    Object.keys(comparisonsByType).forEach(compType => {
        const data = comparisonsByType[compType];
        const scores = data.scores.sort((a, b) => a - b);

        if (scores.length === 0) {
            typeAnalysis[compType] = { noData: true };
            return;
        }

        const stats = calculateStatistics(scores);
        const distribution = calculateDistribution(scores);

        // Analyze gaps in the score distribution (potential natural boundaries)
        const gaps = findSignificantGaps(scores);

        // Analyze high-scoring comparisons
        const highScorers = data.comparisons.filter(c => c.score >= 0.8);
        const perfectMatches = data.comparisons.filter(c => c.score >= 0.99);

        typeAnalysis[compType] = {
            count: scores.length,
            stats,
            distribution,
            gaps,
            highScorerCount: highScorers.length,
            perfectMatchCount: perfectMatches.length,
            sampleHighScorers: highScorers.slice(0, 5),
            samplePerfectMatches: perfectMatches.slice(0, 5),
            nameScoreStats: data.nameScores.length > 0 ? calculateStatistics(data.nameScores) : null,
            contactInfoScoreStats: data.contactInfoScores.length > 0 ? calculateStatistics(data.contactInfoScores) : null
        };

        console.log(`${compType}:`);
        console.log(`  Total comparisons: ${scores.length}`);
        console.log(`  Mean: ${stats.mean.toFixed(4)}, Median: ${stats.median.toFixed(4)}, StdDev: ${stats.stdDev.toFixed(4)}`);
        console.log(`  Min: ${stats.min.toFixed(4)}, Max: ${stats.max.toFixed(4)}`);
        console.log(`  Percentiles: 25th=${stats.p25.toFixed(4)}, 75th=${stats.p75.toFixed(4)}, 90th=${stats.p90.toFixed(4)}, 95th=${stats.p95.toFixed(4)}, 99th=${stats.p99.toFixed(4)}`);
        console.log(`  High scorers (>=0.8): ${highScorers.length}, Perfect matches (>=0.99): ${perfectMatches.length}`);
        if (gaps.length > 0) {
            console.log(`  Significant gaps found at: ${gaps.slice(0, 3).map(g => g.lowerBound.toFixed(3) + '-' + g.upperBound.toFixed(3)).join(', ')}`);
        }
        console.log('');
    });

    // ========================================================================
    // PHASE 3: Determine Threshold Recommendations
    // ========================================================================

    console.log('=== THRESHOLD RECOMMENDATIONS ===\n');

    const recommendations = {};

    Object.keys(typeAnalysis).forEach(compType => {
        const analysis = typeAnalysis[compType];
        if (analysis.noData) {
            recommendations[compType] = { noData: true };
            return;
        }

        const stats = analysis.stats;
        const gaps = analysis.gaps;

        // MINIMUM SCORE (below which definitely no match)
        // Strategy: Use the point where 95% of scores fall below, or a gap if one exists below median
        let minimumScore;
        let minimumScoreRationale;

        // Look for a natural gap in the lower part of the distribution
        const lowerGap = gaps.find(g => g.lowerBound < stats.median && g.gapSize > 0.05);
        if (lowerGap) {
            minimumScore = lowerGap.upperBound;
            minimumScoreRationale = `Natural gap found at ${lowerGap.lowerBound.toFixed(3)}-${lowerGap.upperBound.toFixed(3)}`;
        } else {
            // Use statistical approach: mean - 2*stdDev, but not below 0.1
            minimumScore = Math.max(0.1, stats.mean - 2 * stats.stdDev);
            minimumScoreRationale = `Statistical: mean - 2*stdDev = ${minimumScore.toFixed(4)}`;
        }

        // HIGH CONFIDENCE MATCH SCORE
        // Strategy: Look for where scores cluster near the top, or use 95th percentile
        let highConfidenceScore;
        let highConfidenceRationale;

        // Look for a gap in the upper distribution separating "definite matches" from "possible matches"
        const upperGap = gaps.find(g => g.lowerBound > stats.p75 && g.gapSize > 0.03);
        if (upperGap) {
            highConfidenceScore = upperGap.upperBound;
            highConfidenceRationale = `Natural gap found at ${upperGap.lowerBound.toFixed(3)}-${upperGap.upperBound.toFixed(3)}`;
        } else if (stats.max >= 0.95 && analysis.perfectMatchCount > 0) {
            // If we have perfect matches, use a high threshold
            highConfidenceScore = Math.max(0.90, stats.p95);
            highConfidenceRationale = `High threshold based on ${analysis.perfectMatchCount} perfect matches`;
        } else {
            highConfidenceScore = stats.p90;
            highConfidenceRationale = `90th percentile = ${stats.p90.toFixed(4)}`;
        }

        recommendations[compType] = {
            minimumScore: parseFloat(minimumScore.toFixed(4)),
            minimumScoreRationale,
            highConfidenceScore: parseFloat(highConfidenceScore.toFixed(4)),
            highConfidenceRationale,
            stats: {
                mean: stats.mean,
                stdDev: stats.stdDev,
                p90: stats.p90,
                p95: stats.p95,
                p99: stats.p99
            }
        };

        console.log(`${compType}:`);
        console.log(`  MINIMUM SCORE (no match below): ${minimumScore.toFixed(4)}`);
        console.log(`    Rationale: ${minimumScoreRationale}`);
        console.log(`  HIGH CONFIDENCE SCORE (very likely match above): ${highConfidenceScore.toFixed(4)}`);
        console.log(`    Rationale: ${highConfidenceRationale}`);
        console.log('');
    });

    // ========================================================================
    // PHASE 4: Component-Based Rules Analysis
    // ========================================================================

    console.log('=== COMPONENT-BASED RULE ANALYSIS ===\n');

    // Analyze correlation between overall score and component scores
    const componentRules = analyzeComponentPatterns(allComparisons);

    console.log('Analyzing patterns in high-scoring matches...\n');

    // Find patterns where specific component combinations indicate matches
    const highScoreComparisons = allComparisons.filter(c => c.score >= 0.85);
    const veryHighScoreComparisons = allComparisons.filter(c => c.score >= 0.95);

    if (highScoreComparisons.length > 0) {
        console.log(`High-scoring comparisons (>=0.85): ${highScoreComparisons.length}`);

        // Analyze what component scores typically look like for high overall scores
        const highScoreNameStats = calculateStatistics(
            highScoreComparisons.filter(c => c.nameScore !== undefined).map(c => c.nameScore)
        );
        const highScoreContactStats = calculateStatistics(
            highScoreComparisons.filter(c => c.contactInfoScore !== undefined).map(c => c.contactInfoScore)
        );

        if (highScoreNameStats.count > 0) {
            console.log(`  Name scores in high matches: mean=${highScoreNameStats.mean.toFixed(4)}, min=${highScoreNameStats.min.toFixed(4)}`);
        }
        if (highScoreContactStats.count > 0) {
            console.log(`  ContactInfo scores in high matches: mean=${highScoreContactStats.mean.toFixed(4)}, min=${highScoreContactStats.min.toFixed(4)}`);
        }
    }

    // Propose component-based rules
    const proposedRules = [];

    // Rule 1: Both name and contactInfo are very high
    const rule1Matches = allComparisons.filter(c =>
        c.nameScore !== undefined && c.contactInfoScore !== undefined &&
        c.nameScore >= 0.90 && c.contactInfoScore >= 0.80
    );
    if (rule1Matches.length > 0) {
        proposedRules.push({
            name: 'Strong Name + Good Address',
            condition: 'nameScore >= 0.90 AND contactInfoScore >= 0.80',
            matchCount: rule1Matches.length,
            avgOverallScore: rule1Matches.reduce((s, c) => s + c.score, 0) / rule1Matches.length,
            samples: rule1Matches.slice(0, 3)
        });
    }

    // Rule 2: Perfect name match regardless of address
    const rule2Matches = allComparisons.filter(c =>
        c.nameScore !== undefined && c.nameScore >= 0.98
    );
    if (rule2Matches.length > 0) {
        proposedRules.push({
            name: 'Near-Perfect Name Match',
            condition: 'nameScore >= 0.98',
            matchCount: rule2Matches.length,
            avgOverallScore: rule2Matches.reduce((s, c) => s + c.score, 0) / rule2Matches.length,
            samples: rule2Matches.slice(0, 3)
        });
    }

    // Rule 3: Good name with perfect address match
    const rule3Matches = allComparisons.filter(c =>
        c.nameScore !== undefined && c.contactInfoScore !== undefined &&
        c.nameScore >= 0.75 && c.contactInfoScore >= 0.95
    );
    if (rule3Matches.length > 0) {
        proposedRules.push({
            name: 'Good Name + Excellent Address',
            condition: 'nameScore >= 0.75 AND contactInfoScore >= 0.95',
            matchCount: rule3Matches.length,
            avgOverallScore: rule3Matches.reduce((s, c) => s + c.score, 0) / rule3Matches.length,
            samples: rule3Matches.slice(0, 3)
        });
    }

    // Rule 4: Overall score alone is very high
    const rule4Matches = allComparisons.filter(c => c.score >= 0.92);
    if (rule4Matches.length > 0) {
        proposedRules.push({
            name: 'Very High Overall Score',
            condition: 'score >= 0.92',
            matchCount: rule4Matches.length,
            avgOverallScore: 0.92, // By definition
            samples: rule4Matches.slice(0, 3)
        });
    }

    console.log('\nPROPOSED COMPONENT-BASED RULES:\n');
    proposedRules.forEach((rule, idx) => {
        console.log(`Rule ${idx + 1}: ${rule.name}`);
        console.log(`  Condition: ${rule.condition}`);
        console.log(`  Matches found: ${rule.matchCount}`);
        console.log(`  Average overall score: ${rule.avgOverallScore.toFixed(4)}`);
        if (rule.samples.length > 0) {
            console.log(`  Sample matches:`);
            rule.samples.forEach(s => {
                console.log(`    - ${s.baseName} ↔ ${s.targetName}: score=${s.score.toFixed(4)}, name=${s.nameScore?.toFixed(4) || 'N/A'}, contact=${s.contactInfoScore?.toFixed(4) || 'N/A'}`);
            });
        }
        console.log('');
    });

    // ========================================================================
    // PHASE 5: Create Validation Dataset
    // ========================================================================

    console.log('=== VALIDATION DATASET ===\n');

    // Create a validation dataset of comparisons that fall into different categories
    const validationDataset = {
        definiteMatches: [], // Very high scores, likely true matches
        probableMatches: [], // High scores, probably matches
        uncertain: [],       // Middle scores, need human review
        definiteNonMatches: [] // Very low scores, definitely not matches
    };

    allComparisons.forEach(comp => {
        if (comp.score >= 0.95) {
            validationDataset.definiteMatches.push(comp);
        } else if (comp.score >= 0.80) {
            validationDataset.probableMatches.push(comp);
        } else if (comp.score >= 0.50) {
            validationDataset.uncertain.push(comp);
        } else {
            validationDataset.definiteNonMatches.push(comp);
        }
    });

    console.log('Validation dataset created:');
    console.log(`  Definite matches (>=0.95): ${validationDataset.definiteMatches.length}`);
    console.log(`  Probable matches (0.80-0.95): ${validationDataset.probableMatches.length}`);
    console.log(`  Uncertain (0.50-0.80): ${validationDataset.uncertain.length}`);
    console.log(`  Definite non-matches (<0.50): ${validationDataset.definiteNonMatches.length}`);

    // ========================================================================
    // PHASE 6: Generate Summary and Store Results
    // ========================================================================

    const analysisResults = {
        metadata: {
            timestamp: new Date().toISOString(),
            baseEntitiesAnalyzed: results.length,
            totalComparisons: allComparisons.length
        },
        typeAnalysis,
        recommendations,
        proposedRules,
        validationDataset,
        // Summary recommendations
        summary: {
            overallMinimumScore: calculateOverallMinimum(recommendations),
            overallHighConfidenceScore: calculateOverallHighConfidence(recommendations),
            recommendedRules: proposedRules.filter(r => r.matchCount >= 5)
        }
    };

    console.log('\n=== SUMMARY RECOMMENDATIONS ===\n');
    console.log(`Overall Minimum Score (no match below): ${analysisResults.summary.overallMinimumScore.toFixed(4)}`);
    console.log(`Overall High Confidence Score (likely match above): ${analysisResults.summary.overallHighConfidenceScore.toFixed(4)}`);
    console.log(`Recommended Rules: ${analysisResults.summary.recommendedRules.length}`);

    // Store results globally
    window.matchThresholdAnalysis = analysisResults;
    console.log('\nFull analysis stored in window.matchThresholdAnalysis');

    // Create downloadable validation CSV
    console.log('\nTo download validation dataset for manual review:');
    console.log('  downloadValidationCSV()');

    return analysisResults;
})();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateStatistics(arr) {
    if (!arr || arr.length === 0) {
        return { count: 0, mean: 0, median: 0, stdDev: 0, min: 0, max: 0, p25: 0, p75: 0, p90: 0, p95: 0, p99: 0 };
    }

    const sorted = [...arr].sort((a, b) => a - b);
    const n = sorted.length;
    const mean = arr.reduce((s, v) => s + v, 0) / n;
    const variance = arr.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    return {
        count: n,
        mean,
        median: sorted[Math.floor(n / 2)],
        stdDev,
        min: sorted[0],
        max: sorted[n - 1],
        p25: sorted[Math.floor(n * 0.25)],
        p75: sorted[Math.floor(n * 0.75)],
        p90: sorted[Math.floor(n * 0.90)],
        p95: sorted[Math.floor(n * 0.95)],
        p99: sorted[Math.floor(n * 0.99)]
    };
}

function calculateDistribution(scores) {
    const buckets = {};
    for (let i = 0; i <= 10; i++) {
        const lower = i / 10;
        const upper = (i + 1) / 10;
        const label = `${(lower * 100).toFixed(0)}-${(upper * 100).toFixed(0)}%`;
        buckets[label] = scores.filter(s => s >= lower && s < upper).length;
    }
    return buckets;
}

function findSignificantGaps(scores) {
    if (scores.length < 10) return [];

    const gaps = [];
    const sorted = [...scores].sort((a, b) => a - b);

    // Calculate typical gap size
    const avgGap = (sorted[sorted.length - 1] - sorted[0]) / sorted.length;

    for (let i = 1; i < sorted.length; i++) {
        const gap = sorted[i] - sorted[i - 1];
        // A significant gap is at least 5x the average gap
        if (gap > avgGap * 5 && gap > 0.02) {
            gaps.push({
                lowerBound: sorted[i - 1],
                upperBound: sorted[i],
                gapSize: gap,
                percentileLocation: (i / sorted.length) * 100
            });
        }
    }

    return gaps.sort((a, b) => b.gapSize - a.gapSize);
}

function analyzeComponentPatterns(comparisons) {
    // Find comparisons where we have both name and contactInfo scores
    const withBothScores = comparisons.filter(c =>
        c.nameScore !== undefined && c.contactInfoScore !== undefined
    );

    if (withBothScores.length === 0) return { noData: true };

    // Calculate correlation between components and overall score
    const overallScores = withBothScores.map(c => c.score);
    const nameScores = withBothScores.map(c => c.nameScore);
    const contactScores = withBothScores.map(c => c.contactInfoScore);

    return {
        sampleSize: withBothScores.length,
        nameCorrelation: calculateCorrelation(overallScores, nameScores),
        contactCorrelation: calculateCorrelation(overallScores, contactScores)
    };
}

function calculateCorrelation(x, y) {
    const n = x.length;
    const meanX = x.reduce((s, v) => s + v, 0) / n;
    const meanY = y.reduce((s, v) => s + v, 0) / n;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
        const dx = x[i] - meanX;
        const dy = y[i] - meanY;
        numerator += dx * dy;
        denomX += dx * dx;
        denomY += dy * dy;
    }

    const denominator = Math.sqrt(denomX) * Math.sqrt(denomY);
    return denominator === 0 ? 0 : numerator / denominator;
}

function calculateOverallMinimum(recommendations) {
    const mins = Object.values(recommendations)
        .filter(r => !r.noData && r.minimumScore !== undefined)
        .map(r => r.minimumScore);
    return mins.length > 0 ? Math.min(...mins) : 0.1;
}

function calculateOverallHighConfidence(recommendations) {
    const highs = Object.values(recommendations)
        .filter(r => !r.noData && r.highConfidenceScore !== undefined)
        .map(r => r.highConfidenceScore);
    return highs.length > 0 ? Math.max(...highs) : 0.9;
}

function getEntityDisplayName(entity) {
    if (!entity) return '';
    if (entity.name) {
        if (entity.name.toString) return entity.name.toString();
        if (entity.name.firstName || entity.name.lastName) {
            return `${entity.name.firstName || ''} ${entity.name.lastName || ''}`.trim();
        }
        if (entity.name.fullHouseholdName) return entity.name.fullHouseholdName;
    }
    return 'unknown';
}

// ============================================================================
// VALIDATION EXPORT FUNCTIONS
// ============================================================================

function downloadValidationCSV() {
    if (!window.matchThresholdAnalysis) {
        console.error('No analysis results. Run the analysis first.');
        return;
    }

    const dataset = window.matchThresholdAnalysis.validationDataset;
    const headers = [
        'category', 'baseName', 'baseKey', 'baseSource',
        'targetName', 'targetKey', 'targetSource',
        'score', 'nameScore', 'contactInfoScore', 'comparisonType',
        'matchedIndividualName', 'humanVerified', 'isActualMatch'
    ];

    const rows = [];

    // Add samples from each category
    const addSamples = (category, items, limit = 50) => {
        items.slice(0, limit).forEach(c => {
            rows.push({
                category,
                baseName: c.baseName,
                baseKey: c.baseKey,
                baseSource: c.baseSource,
                targetName: c.targetName,
                targetKey: c.targetKey,
                targetSource: c.targetSource,
                score: c.score?.toFixed(6) || '',
                nameScore: c.nameScore?.toFixed(6) || '',
                contactInfoScore: c.contactInfoScore?.toFixed(6) || '',
                comparisonType: c.comparisonType || '',
                matchedIndividualName: c.matchedIndividualName || '',
                humanVerified: '',  // To be filled in manually
                isActualMatch: ''   // To be filled in manually
            });
        });
    };

    addSamples('definite_match', dataset.definiteMatches, 50);
    addSamples('probable_match', dataset.probableMatches, 50);
    addSamples('uncertain', dataset.uncertain, 100);
    addSamples('definite_non_match', dataset.definiteNonMatches, 50);

    // Build CSV
    const csvLines = [headers.join(',')];
    rows.forEach(row => {
        const values = headers.map(h => {
            const val = row[h] ?? '';
            const strVal = String(val);
            if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
                return `"${strVal.replace(/"/g, '""')}"`;
            }
            return strVal;
        });
        csvLines.push(values.join(','));
    });

    const csvContent = csvLines.join('\n');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `validation_dataset_${timestamp}.csv`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`Downloaded: ${filename}`);
    console.log('Fill in humanVerified and isActualMatch columns, then use validateThresholds() to refine recommendations.');
}

window.downloadValidationCSV = downloadValidationCSV;

// ============================================================================
// THRESHOLD REFINEMENT BASED ON VALIDATED DATA
// ============================================================================

/**
 * After manually reviewing the validation CSV, load the results and refine thresholds
 * @param {Array} validatedData - Array of objects with isActualMatch field filled in
 */
function refineThresholdsFromValidation(validatedData) {
    console.log('=== REFINING THRESHOLDS FROM VALIDATION ===\n');

    const trueMatches = validatedData.filter(d => d.isActualMatch === 'true' || d.isActualMatch === true);
    const falseMatches = validatedData.filter(d => d.isActualMatch === 'false' || d.isActualMatch === false);

    if (trueMatches.length === 0 || falseMatches.length === 0) {
        console.error('Need both true and false matches in validation data');
        return;
    }

    const trueMatchScores = trueMatches.map(d => parseFloat(d.score)).sort((a, b) => a - b);
    const falseMatchScores = falseMatches.map(d => parseFloat(d.score)).sort((a, b) => a - b);

    console.log(`True matches: ${trueMatches.length}, False matches: ${falseMatches.length}`);

    // Find optimal minimum score: highest score among false matches
    const refinedMinimum = Math.max(...falseMatchScores);

    // Find optimal high confidence: lowest score among true matches
    const refinedHighConfidence = Math.min(...trueMatchScores);

    console.log(`\nREFINED THRESHOLDS:`);
    console.log(`  Minimum score (max of false matches): ${refinedMinimum.toFixed(4)}`);
    console.log(`  High confidence (min of true matches): ${refinedHighConfidence.toFixed(4)}`);

    // Check for overlap (problematic zone)
    if (refinedMinimum >= refinedHighConfidence) {
        console.log(`\n  WARNING: Overlap detected! There is no clear threshold.`);
        console.log(`  False matches extend up to ${refinedMinimum.toFixed(4)}`);
        console.log(`  True matches start at ${refinedHighConfidence.toFixed(4)}`);
        console.log(`  Consider using component-based rules for the overlap zone.`);
    }

    return {
        refinedMinimum,
        refinedHighConfidence,
        trueMatchStats: calculateStatistics(trueMatchScores),
        falseMatchStats: calculateStatistics(falseMatchScores)
    };
}

window.refineThresholdsFromValidation = refineThresholdsFromValidation;
