// =============================================================================
// compareTo Study - Score Distribution Analysis using compareTo methods
// Parameterized to support IndividualName, ContactInfo, or Entity comparison
// Uses vowel-weighted Levenshtein algorithm throughout the compareTo hierarchy
// Generates CSV output with 98th percentile analysis
// =============================================================================

/**
 * Extract string value from AttributedTerm or return string directly
 * Address fields may be AttributedTerm objects with .term property containing the actual value
 * @param {AttributedTerm|string|null} val - Value to extract from
 * @returns {string} The string value or empty string
 */
function extractTermValue(val) {
    if (!val) return '';
    // AttributedTerm has .term property
    if (val.term !== undefined) return String(val.term);
    // Already a string
    return String(val);
}

// =============================================================================
// DETAILED CALCULATION BREAKDOWN - Shows how similarity score is computed
// =============================================================================

/**
 * Calculate detailed breakdown of entity comparison
 * Shows each component's raw similarity, effective weight, and contribution
 * @param {Entity} entity1 - First entity
 * @param {Entity} entity2 - Second entity
 * @returns {Object} Breakdown with components and totals
 */
function getEntityComparisonBreakdown(entity1, entity2) {
    const baseWeights = entity1.comparisonWeights || {
        name: 0.5,
        contactInfo: 0.3,
        otherInfo: 0.15,
        legacyInfo: 0.05
    };

    const breakdown = {
        components: [],
        totalWeight: 0,
        weightedSum: 0,
        finalScore: 0,
        note: ''
    };

    // First pass: calculate raw similarities for name and contactInfo
    let nameSimilarity = null;
    let contactInfoSimilarity = null;

    const hasName = entity1.name && entity2.name && typeof entity1.name.compareTo === 'function';
    if (hasName) {
        nameSimilarity = entity1.name.compareTo(entity2.name);
    }

    const hasContactInfo = entity1.contactInfo && entity2.contactInfo &&
                           typeof entity1.contactInfo.compareTo === 'function';
    if (hasContactInfo) {
        contactInfoSimilarity = entity1.contactInfo.compareTo(entity2.contactInfo);
    }

    // Apply weight boost logic (same as entityWeightedComparison):
    // - If one of name/contactInfo is 100% and other isn't: +12% to the perfect one
    // - If one is >95% (but <100%) and other is <95%: +6% to the high one
    // Boost is taken proportionally from other categories
    let weights = { ...baseWeights };
    let boostAmount = 0;
    let boostTarget = null;

    if (nameSimilarity !== null && contactInfoSimilarity !== null) {
        // Check for 100% perfect match boost (12%)
        if (nameSimilarity === 1.0 && contactInfoSimilarity !== 1.0) {
            boostAmount = 0.12;
            boostTarget = 'name';
            breakdown.note = 'Perfect name match: +12% weight boost';
        } else if (contactInfoSimilarity === 1.0 && nameSimilarity !== 1.0) {
            boostAmount = 0.12;
            boostTarget = 'contactInfo';
            breakdown.note = 'Perfect contactInfo match: +12% weight boost';
        }
        // Check for >95% high match boost (6%) - only if no perfect match boost applied
        else if (nameSimilarity > 0.95 && contactInfoSimilarity <= 0.95) {
            boostAmount = 0.06;
            boostTarget = 'name';
            breakdown.note = 'High name match (>95%): +6% weight boost';
        } else if (contactInfoSimilarity > 0.95 && nameSimilarity <= 0.95) {
            boostAmount = 0.06;
            boostTarget = 'contactInfo';
            breakdown.note = 'High contactInfo match (>95%): +6% weight boost';
        }
    }

    // Apply boost by redistributing from other categories proportionally
    if (boostAmount > 0 && boostTarget) {
        const otherCategory = boostTarget === 'name' ? 'contactInfo' : 'name';
        const nonBoostCategories = ['otherInfo', 'legacyInfo', otherCategory];
        const totalNonBoostWeight = nonBoostCategories.reduce((sum, cat) => sum + weights[cat], 0);

        if (totalNonBoostWeight > 0) {
            nonBoostCategories.forEach(cat => {
                const proportion = weights[cat] / totalNonBoostWeight;
                weights[cat] -= boostAmount * proportion;
            });
            weights[boostTarget] += boostAmount;
        }
    }

    // Second pass: build breakdown with adjusted weights
    if (hasName) {
        const contribution = weights.name * nameSimilarity;
        breakdown.components.push({
            name: 'name',
            rawSimilarity: nameSimilarity,
            configuredWeight: baseWeights.name,
            adjustedWeight: weights.name,
            contribution: contribution
        });
        breakdown.totalWeight += weights.name;
        breakdown.weightedSum += contribution;
    }

    if (hasContactInfo) {
        const contribution = weights.contactInfo * contactInfoSimilarity;
        breakdown.components.push({
            name: 'contactInfo',
            rawSimilarity: contactInfoSimilarity,
            configuredWeight: baseWeights.contactInfo,
            adjustedWeight: weights.contactInfo,
            contribution: contribution
        });
        breakdown.totalWeight += weights.contactInfo;
        breakdown.weightedSum += contribution;
    }

    // OtherInfo comparison
    const hasOtherInfo = entity1.otherInfo && entity2.otherInfo &&
                         typeof entity1.otherInfo.compareTo === 'function';
    if (hasOtherInfo) {
        const similarity = entity1.otherInfo.compareTo(entity2.otherInfo);
        const contribution = weights.otherInfo * similarity;
        breakdown.components.push({
            name: 'otherInfo',
            rawSimilarity: similarity,
            configuredWeight: baseWeights.otherInfo,
            adjustedWeight: weights.otherInfo,
            contribution: contribution
        });
        breakdown.totalWeight += weights.otherInfo;
        breakdown.weightedSum += contribution;
    }

    // LegacyInfo comparison
    const hasLegacyInfo = entity1.legacyInfo && entity2.legacyInfo &&
                          typeof entity1.legacyInfo.compareTo === 'function';
    if (hasLegacyInfo) {
        const similarity = entity1.legacyInfo.compareTo(entity2.legacyInfo);
        const contribution = weights.legacyInfo * similarity;
        breakdown.components.push({
            name: 'legacyInfo',
            rawSimilarity: similarity,
            configuredWeight: baseWeights.legacyInfo,
            adjustedWeight: weights.legacyInfo,
            contribution: contribution
        });
        breakdown.totalWeight += weights.legacyInfo;
        breakdown.weightedSum += contribution;
    }

    // Calculate normalized effective weights and final score
    if (breakdown.totalWeight > 0) {
        breakdown.components.forEach(comp => {
            comp.effectiveWeight = comp.adjustedWeight / breakdown.totalWeight;
            comp.normalizedContribution = comp.rawSimilarity * comp.effectiveWeight;
        });
        breakdown.finalScore = Math.round((breakdown.weightedSum / breakdown.totalWeight) * 100) / 100;
    }

    return breakdown;
}

/**
 * Calculate detailed breakdown of name comparison
 * Shows lastName, firstName, otherNames similarities and contributions
 * @param {IndividualName} name1 - First name
 * @param {IndividualName} name2 - Second name
 * @returns {Object} Breakdown with components and totals
 */
function getNameComparisonBreakdown(name1, name2) {
    const weights = name1.comparisonWeights || { lastName: 0.5, firstName: 0.4, otherNames: 0.1 };

    const breakdown = {
        components: [],
        totalWeight: 0,
        weightedSum: 0,
        finalScore: 0
    };

    // Use levenshteinSimilarity if available, otherwise estimate
    const getSimilarity = (s1, s2) => {
        if (!s1 && !s2) return 1.0;  // Both empty = match
        if (!s1 || !s2) return 0;     // One empty = no match
        if (typeof window.levenshteinSimilarity === 'function') {
            return window.levenshteinSimilarity(s1, s2);
        }
        // Fallback: exact match check
        return s1.toLowerCase() === s2.toLowerCase() ? 1.0 : 0;
    };

    // lastName
    const lastName1 = name1.lastName || '';
    const lastName2 = name2.lastName || '';
    if (lastName1 || lastName2) {
        const similarity = getSimilarity(lastName1, lastName2);
        const contribution = weights.lastName * similarity;
        breakdown.components.push({
            name: 'lastName',
            value1: lastName1,
            value2: lastName2,
            rawSimilarity: similarity,
            configuredWeight: weights.lastName,
            contribution: contribution
        });
        breakdown.totalWeight += weights.lastName;
        breakdown.weightedSum += contribution;
    }

    // firstName
    const firstName1 = name1.firstName || '';
    const firstName2 = name2.firstName || '';
    if (firstName1 || firstName2) {
        const similarity = getSimilarity(firstName1, firstName2);
        const contribution = weights.firstName * similarity;
        breakdown.components.push({
            name: 'firstName',
            value1: firstName1,
            value2: firstName2,
            rawSimilarity: similarity,
            configuredWeight: weights.firstName,
            contribution: contribution
        });
        breakdown.totalWeight += weights.firstName;
        breakdown.weightedSum += contribution;
    }

    // otherNames
    const otherNames1 = name1.otherNames || '';
    const otherNames2 = name2.otherNames || '';
    if (otherNames1 || otherNames2) {
        const similarity = getSimilarity(otherNames1, otherNames2);
        const contribution = weights.otherNames * similarity;
        breakdown.components.push({
            name: 'otherNames',
            value1: otherNames1,
            value2: otherNames2,
            rawSimilarity: similarity,
            configuredWeight: weights.otherNames,
            contribution: contribution
        });
        breakdown.totalWeight += weights.otherNames;
        breakdown.weightedSum += contribution;
    }

    // Calculate normalized effective weights and final score
    if (breakdown.totalWeight > 0) {
        breakdown.components.forEach(comp => {
            comp.effectiveWeight = comp.configuredWeight / breakdown.totalWeight;
            comp.normalizedContribution = comp.rawSimilarity * comp.effectiveWeight;
        });
        breakdown.finalScore = Math.round((breakdown.weightedSum / breakdown.totalWeight) * 100) / 100;
    }

    return breakdown;
}

/**
 * Calculate detailed breakdown of contactInfo comparison
 * Shows primaryAddress, secondaryAddress, email similarities and contributions
 * @param {ContactInfo} ci1 - First contactInfo
 * @param {ContactInfo} ci2 - Second contactInfo
 * @returns {Object} Breakdown with components and totals
 */
function getContactInfoComparisonBreakdown(ci1, ci2) {
    const breakdown = {
        components: [],
        totalWeight: 0,
        weightedSum: 0,
        finalScore: 0,
        note: ''
    };

    // Check for primary address comparison
    const hasPrimary1 = ci1.primaryAddress && typeof ci1.primaryAddress.compareTo === 'function';
    const hasPrimary2 = ci2.primaryAddress && typeof ci2.primaryAddress.compareTo === 'function';

    if (hasPrimary1 && hasPrimary2) {
        const similarity = ci1.primaryAddress.compareTo(ci2.primaryAddress);
        breakdown.components.push({
            name: 'primaryAddress',
            rawSimilarity: similarity,
            configuredWeight: 0.6,
            contribution: 0.6 * similarity
        });
        breakdown.totalWeight += 0.6;
        breakdown.weightedSum += 0.6 * similarity;

        // Check for perfect match override
        if (similarity === 1.0) {
            breakdown.note = 'Perfect primary address match - override applied (0.9 weight)';
        }
    }

    // Secondary address (simplified - just check if exists)
    const hasSecondary1 = ci1.secondaryAddresses && ci1.secondaryAddresses.length > 0;
    const hasSecondary2 = ci2.secondaryAddresses && ci2.secondaryAddresses.length > 0;
    if (hasSecondary1 || hasSecondary2) {
        // Approximate - actual algorithm is more complex
        breakdown.components.push({
            name: 'secondaryAddress',
            rawSimilarity: 0,
            configuredWeight: 0.2,
            contribution: 0,
            note: 'Secondary address comparison (complex algorithm)'
        });
        breakdown.totalWeight += 0.2;
    }

    // Email
    const email1 = ci1.email;
    const email2 = ci2.email;
    if (email1 || email2) {
        let similarity = 0;
        if (email1 && email2) {
            const e1 = typeof email1 === 'string' ? email1 : (email1.term || '');
            const e2 = typeof email2 === 'string' ? email2 : (email2.term || '');
            if (typeof window.levenshteinSimilarity === 'function') {
                similarity = window.levenshteinSimilarity(e1, e2);
            } else {
                similarity = e1.toLowerCase() === e2.toLowerCase() ? 1.0 : 0;
            }
        }
        breakdown.components.push({
            name: 'email',
            rawSimilarity: similarity,
            configuredWeight: 0.2,
            contribution: 0.2 * similarity
        });
        breakdown.totalWeight += 0.2;
        breakdown.weightedSum += 0.2 * similarity;
    }

    // Calculate final score
    if (breakdown.totalWeight > 0) {
        breakdown.components.forEach(comp => {
            comp.effectiveWeight = comp.configuredWeight / breakdown.totalWeight;
            comp.normalizedContribution = comp.rawSimilarity * comp.effectiveWeight;
        });
        breakdown.finalScore = Math.round((breakdown.weightedSum / breakdown.totalWeight) * 100) / 100;
    }

    return breakdown;
}

/**
 * Get comparison breakdown based on comparison type
 * @param {string} comparisonType - 'name', 'contactInfo', or 'entity'
 * @param {Object} comparable1 - First comparable object
 * @param {Object} comparable2 - Second comparable object
 * @param {Object} entity1 - Full entity (for entity comparison)
 * @param {Object} entity2 - Full entity (for entity comparison)
 * @returns {Object} Breakdown object
 */
function getComparisonBreakdown(comparisonType, comparable1, comparable2, entity1, entity2) {
    switch (comparisonType) {
        case 'entity':
            return getEntityComparisonBreakdown(entity1, entity2);
        case 'name':
            return getNameComparisonBreakdown(comparable1, comparable2);
        case 'contactInfo':
            return getContactInfoComparisonBreakdown(comparable1, comparable2);
        default:
            return { components: [], finalScore: 0 };
    }
}

/**
 * Format breakdown for CSV columns
 * Returns array of values for the breakdown columns
 * @param {Object} breakdown - Breakdown object from getComparisonBreakdown
 * @param {string} comparisonType - Type of comparison
 * @returns {Array} Array of column values
 */
function formatBreakdownForCSV(breakdown, comparisonType) {
    const columns = [];

    // For each possible component, output: rawSimilarity, effectiveWeight, contribution
    // Entity: name, contactInfo, otherInfo, legacyInfo (uses adjustedWeight for boost)
    // Name: lastName, firstName, otherNames
    // ContactInfo: primaryAddress, secondaryAddress, email

    const componentOrder = {
        'entity': ['name', 'contactInfo', 'otherInfo', 'legacyInfo'],
        'name': ['lastName', 'firstName', 'otherNames'],
        'contactInfo': ['primaryAddress', 'secondaryAddress', 'email']
    };

    const order = componentOrder[comparisonType] || [];

    order.forEach(compName => {
        const comp = breakdown.components.find(c => c.name === compName);
        if (comp) {
            columns.push((comp.rawSimilarity * 100).toFixed(1) + '%');
            // Use adjustedWeight for entity (boost logic), effectiveWeight for others
            const weight = comp.adjustedWeight !== undefined ? comp.adjustedWeight : comp.effectiveWeight;
            columns.push((weight * 100).toFixed(1) + '%');
            columns.push((comp.normalizedContribution * 100).toFixed(1) + '%');
        } else {
            columns.push('N/A');
            columns.push('N/A');
            columns.push('N/A');
        }
    });

    // Add note if present
    columns.push(breakdown.note || '');

    return columns;
}

/**
 * Get CSV headers for breakdown columns based on comparison type
 * @param {string} comparisonType - Type of comparison
 * @returns {Array} Array of header strings
 */
function getBreakdownHeaders(comparisonType) {
    const componentOrder = {
        'entity': ['name', 'contactInfo', 'otherInfo', 'legacyInfo'],
        'name': ['lastName', 'firstName', 'otherNames'],
        'contactInfo': ['primaryAddress', 'secondaryAddress', 'email']
    };

    const order = componentOrder[comparisonType] || [];
    const headers = [];

    order.forEach(compName => {
        headers.push(`Best Match ${compName} Similarity`);
        headers.push(`Best Match ${compName} Eff Weight`);
        headers.push(`Best Match ${compName} Contribution`);
    });

    headers.push('Best Match Notes');

    return headers;
}

// =============================================================================
// COMPARISON CONFIGURATION - Defines how each comparison type works
// =============================================================================
const COMPARISON_CONFIGS = {
    name: {
        label: 'IndividualName',
        description: 'Name similarity using vowel-weighted Levenshtein',
        getComparable: (entity) => entity.name,
        hasComparable: (entity) => entity.name && typeof entity.name.compareTo === 'function',
        getDisplayName: (entity) => {
            if (entity.name?.completeName) return entity.name.completeName;
            const first = entity.name?.firstName || '';
            const last = entity.name?.lastName || '';
            return `${first} ${last}`.trim() || '[No Name]';
        },
        algorithm: 'IndividualName.compareTo() with vowel-weighted Levenshtein',
        weights: { lastName: 0.5, firstName: 0.4, otherNames: 0.1 }
    },
    contactInfo: {
        label: 'ContactInfo',
        description: 'Contact info similarity (addresses + email)',
        getComparable: (entity) => entity.contactInfo,
        hasComparable: (entity) => entity.contactInfo && typeof entity.contactInfo.compareTo === 'function',
        getDisplayName: (entity) => {
            // Show primary address summary for display
            // Note: Address fields may be AttributedTerm objects - extract .term values
            const ci = entity.contactInfo;
            if (!ci) return '[No ContactInfo]';
            const addr = ci.primaryAddress;
            if (!addr) return '[No Address]';
            const streetNum = extractTermValue(addr.streetNumber);
            const streetName = extractTermValue(addr.streetName);
            const secUnit = extractTermValue(addr.secUnitNum);
            const cityVal = extractTermValue(addr.city);
            const street = streetNum && streetName
                ? `${streetNum} ${streetName}`
                : secUnit ? `PO Box ${secUnit}` : '';
            return `${street}, ${cityVal}`.replace(/^, |, $/g, '') || '[Empty Address]';
        },
        algorithm: 'ContactInfo.compareTo() with address matching and perfect match override',
        weights: { primaryAddress: 0.6, secondaryAddress: 0.2, email: 0.2 }
    },
    entity: {
        label: 'Entity',
        description: 'Full entity similarity (name + contactInfo + otherInfo)',
        getComparable: (entity) => entity,
        hasComparable: (entity) => typeof entity.compareTo === 'function',
        getDisplayName: (entity) => {
            // Combine name and address for display
            // Note: Address fields may be AttributedTerm objects - extract .term values
            const namePart = entity.name?.completeName ||
                `${entity.name?.firstName || ''} ${entity.name?.lastName || ''}`.trim() || '';
            const addr = entity.contactInfo?.primaryAddress;
            const addrPart = addr ? extractTermValue(addr.city) : '';
            return namePart + (addrPart ? ` (${addrPart})` : '') || '[Unknown Entity]';
        },
        algorithm: 'Entity.compareTo() with full hierarchy comparison',
        weights: { name: 0.5, contactInfo: 0.3, otherInfo: 0.15, legacyInfo: 0.05 }
    }
};

/**
 * Run a comprehensive compareTo study on loaded Individual entities
 * Parameterized to compare by name, contactInfo, or full entity
 *
 * @param {number} sampleSize - Number of entities to analyze (default: all entities)
 * @param {boolean} includeDetailedComparisons - Include detailed comparison rows (default: false for performance)
 * @param {string} comparisonType - Type of comparison: 'name', 'contactInfo', or 'entity' (default: 'name')
 * @returns {Object} Study results with CSV download
 */
function compareToStudy(sampleSize = null, includeDetailedComparisons = false, comparisonType = 'name') {
    // Validate comparison type
    const config = COMPARISON_CONFIGS[comparisonType];
    if (!config) {
        console.error(`❌ Invalid comparison type: "${comparisonType}". Valid types: ${Object.keys(COMPARISON_CONFIGS).join(', ')}`);
        return null;
    }

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log(`║     compareTo Study - ${config.label.padEnd(35)}║`);
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`📋 ${config.description}`);
    console.log(`🔧 Algorithm: ${config.algorithm}\n`);

    // Check if entities are loaded
    if (!window.workingLoadedEntities || workingLoadedEntities.status !== 'loaded') {
        console.error('❌ Entities not loaded. Click "🚀 Load All Entities Into Memory" first.');
        return null;
    }

    // Collect all Individual entities that have the required comparable property
    const individuals = [];

    // Add Bloomerang Individual entities
    if (workingLoadedEntities.bloomerang && workingLoadedEntities.bloomerang.individuals) {
        const bloomerangEntries = Object.entries(workingLoadedEntities.bloomerang.individuals.entities);
        bloomerangEntries.forEach(([id, entity]) => {
            if (config.hasComparable(entity)) {
                individuals.push({
                    source: 'Bloomerang',
                    id: id,
                    comparable: config.getComparable(entity),
                    displayName: config.getDisplayName(entity),
                    entity: entity
                });
            }
        });
    }

    // Add VisionAppraisal Individual entities
    if (workingLoadedEntities.visionAppraisal && workingLoadedEntities.visionAppraisal.entities) {
        workingLoadedEntities.visionAppraisal.entities.forEach((entity, index) => {
            if ((entity.constructor?.name === 'Individual') && config.hasComparable(entity)) {
                individuals.push({
                    source: 'VisionAppraisal',
                    index: index,
                    pid: entity.pid || '',
                    comparable: config.getComparable(entity),
                    displayName: config.getDisplayName(entity),
                    entity: entity
                });
            }
        });
    }

    const totalEntities = individuals.length;
    console.log(`📊 Total Individual entities with ${config.label}: ${totalEntities}`);

    if (totalEntities === 0) {
        console.error(`❌ No Individual entities with compareTo-capable ${config.label} found.`);
        return null;
    }

    // Determine sample size
    const actualSampleSize = sampleSize ? Math.min(sampleSize, totalEntities) : totalEntities;
    console.log(`🎯 Analyzing ${actualSampleSize} entities against entire dataset`);
    console.log(`⏱️ Expected comparisons: ${(actualSampleSize * (totalEntities - 1)).toLocaleString()}`);

    // Get sample indices
    let sampleIndices;
    if (sampleSize && sampleSize < totalEntities) {
        // Random sample
        const shuffledIndices = Array.from({length: totalEntities}, (_, i) => i);
        for (let i = shuffledIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
        }
        sampleIndices = shuffledIndices.slice(0, sampleSize);
    } else {
        // All entities
        sampleIndices = Array.from({length: totalEntities}, (_, i) => i);
    }

    const targetEntities = sampleIndices.map(i => individuals[i]);

    // Prepare results structure
    const studyResults = {
        totalEntities,
        sampleSize: actualSampleSize,
        timestamp: new Date().toISOString(),
        comparisonType: comparisonType,
        algorithm: config.algorithm,
        weights: config.weights,
        targetAnalysis: [],
        globalStats: {
            totalComparisons: 0,
            perfectMatches: 0,  // 100% scores
            highMatches: 0,     // >= 90%
            mediumMatches: 0,   // >= 70%
            lowMatches: 0       // < 70%
        }
    };

    const csvData = [];
    const startTime = performance.now();
    let progressInterval = Math.max(1, Math.floor(actualSampleSize / 10));

    // Analyze each target entity
    targetEntities.forEach((targetEntity, targetIndex) => {
        const targetOriginalIndex = sampleIndices[targetIndex];
        const scores = [];
        const comparisons = [];
        let bestMatch = null;
        let bestScore = -1;

        // Compare against all entities (excluding self)
        individuals.forEach((compareEntity, compareIndex) => {
            if (compareIndex === targetOriginalIndex) return; // Skip self

            try {
                const score = targetEntity.comparable.compareTo(compareEntity.comparable);
                scores.push(score);

                // Track for detailed output
                const comparison = {
                    compareName: compareEntity.displayName,
                    compareSource: compareEntity.source,
                    comparePid: compareEntity.pid || '',
                    compareId: compareEntity.id || '',
                    score: score,
                    compareEntity: compareEntity  // Keep reference for breakdown
                };
                comparisons.push(comparison);

                // Track best match
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = comparison;
                }

                // Update global stats
                studyResults.globalStats.totalComparisons++;
                if (score === 1.0) studyResults.globalStats.perfectMatches++;
                else if (score >= 0.9) studyResults.globalStats.highMatches++;
                else if (score >= 0.7) studyResults.globalStats.mediumMatches++;
                else studyResults.globalStats.lowMatches++;

            } catch (err) {
                console.warn(`⚠️ Error comparing "${targetEntity.displayName}" vs "${compareEntity.displayName}":`, err.message);
            }
        });

        // Calculate breakdown for best match
        let bestMatchBreakdown = { components: [], note: '' };
        if (bestMatch) {
            bestMatchBreakdown = getComparisonBreakdown(
                comparisonType,
                targetEntity.comparable,
                bestMatch.compareEntity.comparable,
                targetEntity.entity,
                bestMatch.compareEntity.entity
            );
        }

        // Sort scores descending for percentile calculation
        scores.sort((a, b) => b - a);

        // Calculate 98th percentile using user's requirement:
        // "98th percentile, unless that number is less than 10, then the top 10"
        const percentile98Index = Math.floor(scores.length * 0.02); // Top 2%
        const percentile98Count = Math.max(percentile98Index, 1); // At least 1
        const topCount = Math.max(percentile98Count, 10); // At least 10
        const percentile98Score = scores[percentile98Index] || 0;

        // Count perfect matches (100%)
        const perfectMatchCount = scores.filter(s => s === 1.0).length;

        // User requirement: "when 98th percentile includes some perfect matches make a list
        // that is the top X where X is the number that were in the 98th percentile plus
        // the number of 100% matches that were found."
        let topMatchCount = topCount;
        if (perfectMatchCount > 0 && percentile98Score === 1.0) {
            // Perfect matches are in 98th percentile - extend list
            topMatchCount = percentile98Count + perfectMatchCount;
        }

        // Create distribution analysis
        const distribution = {
            targetIndex: targetIndex + 1,
            targetName: targetEntity.displayName,
            targetSource: targetEntity.source,
            targetPid: targetEntity.pid || '',
            targetId: targetEntity.id || '',
            totalComparisons: scores.length,
            maxScore: scores.length > 0 ? Math.max(...scores) : 0,
            minScore: scores.length > 0 ? Math.min(...scores) : 0,
            meanScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
            medianScore: scores.length > 0 ? scores[Math.floor(scores.length / 2)] : 0,
            percentile98Score: percentile98Score,
            perfectMatchCount: perfectMatchCount,
            topMatchCount: topMatchCount,
            // 5% increment distribution buckets
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
            // Top matches with user's 98th percentile logic
            topMatches: comparisons
                .sort((a, b) => b.score - a.score)
                .slice(0, topMatchCount)
                .map(c => `${(c.score * 100).toFixed(1)}% - "${c.compareName}" (${c.compareSource})`)
                .join(' | ')
        };

        // Verify distribution total
        distribution.distributionTotal = distribution.scores95to100 + distribution.scores90to94 +
            distribution.scores85to89 + distribution.scores80to84 + distribution.scores75to79 +
            distribution.scores70to74 + distribution.scores65to69 + distribution.scores60to64 +
            distribution.scores55to59 + distribution.scores50to54 + distribution.scores45to49 +
            distribution.scores40to44 + distribution.scores35to39 + distribution.scores30to34 +
            distribution.scores25to29 + distribution.scores20to24 + distribution.scores15to19 +
            distribution.scores10to14 + distribution.scores05to09 + distribution.scores00to04;

        studyResults.targetAnalysis.push(distribution);

        // Get breakdown columns for best match
        const breakdownColumns = formatBreakdownForCSV(bestMatchBreakdown, comparisonType);

        // Add to CSV data
        csvData.push([
            `TARGET ${targetIndex + 1}`,
            distribution.targetName,
            distribution.targetSource,
            distribution.targetPid,
            distribution.targetId,
            distribution.totalComparisons,
            (distribution.maxScore * 100).toFixed(1) + '%',
            (distribution.meanScore * 100).toFixed(1) + '%',
            (distribution.medianScore * 100).toFixed(1) + '%',
            (distribution.percentile98Score * 100).toFixed(1) + '%',
            distribution.perfectMatchCount,
            distribution.topMatchCount,
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
            distribution.distributionTotal,
            distribution.topMatches,
            bestMatch ? bestMatch.compareName : '',
            bestMatch ? (bestMatch.score * 100).toFixed(1) + '%' : '',
            ...breakdownColumns
        ]);

        // Optional detailed comparisons
        if (includeDetailedComparisons) {
            csvData.push(['']); // Separator
            csvData.push(['Detail Comparisons', 'Compare Name', 'Compare Source', 'Compare PID/ID', 'Score']);
            comparisons
                .sort((a, b) => b.score - a.score)
                .slice(0, topMatchCount)
                .forEach(comp => {
                    csvData.push(['', comp.compareName, comp.compareSource, comp.comparePid || comp.compareId, (comp.score * 100).toFixed(1) + '%']);
                });
            csvData.push(['']); // Separator
        }

        // Progress reporting
        if ((targetIndex + 1) % progressInterval === 0 || targetIndex === actualSampleSize - 1) {
            const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
            const percent = ((targetIndex + 1) / actualSampleSize * 100).toFixed(0);
            console.log(`⏳ Progress: ${targetIndex + 1}/${actualSampleSize} (${percent}%) - ${elapsed}s elapsed`);
        }
    });

    const totalTime = ((performance.now() - startTime) / 1000).toFixed(2);

    // Generate CSV headers including breakdown columns
    const breakdownHeaders = getBreakdownHeaders(comparisonType);
    const csvHeaders = [
        'Target Entity',
        'Target Name',
        'Source',
        'PID',
        'Bloom ID',
        'Total Comparisons',
        'Max Score',
        'Mean Score',
        'Median Score',
        '98th Percentile',
        'Perfect Matches (100%)',
        'Top Match Count',
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
        'Top Matches (98th percentile logic)',
        'Best Match Name',
        'Best Match Score',
        ...breakdownHeaders
    ];

    const csvContent = [csvHeaders, ...csvData]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    a.download = `compareTo_${comparisonType}_study_${actualSampleSize}_entities_${timestamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    Study Complete                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`\n📊 Summary:`);
    console.log(`   Entities analyzed: ${actualSampleSize}`);
    console.log(`   Total comparisons: ${studyResults.globalStats.totalComparisons.toLocaleString()}`);
    console.log(`   Perfect matches (100%): ${studyResults.globalStats.perfectMatches.toLocaleString()}`);
    console.log(`   High matches (≥90%): ${studyResults.globalStats.highMatches.toLocaleString()}`);
    console.log(`   Medium matches (≥70%): ${studyResults.globalStats.mediumMatches.toLocaleString()}`);
    console.log(`   Low matches (<70%): ${studyResults.globalStats.lowMatches.toLocaleString()}`);
    console.log(`   Time elapsed: ${totalTime}s`);
    console.log(`   Rate: ${Math.round(studyResults.globalStats.totalComparisons / parseFloat(totalTime)).toLocaleString()} comparisons/sec`);
    console.log(`\n📁 CSV file downloaded: compareTo_${comparisonType}_study_${actualSampleSize}_entities_${timestamp}.csv`);

    return studyResults;
}

/**
 * Quick study with small sample for testing
 * @param {number} sampleSize - Number of entities to test (default: 10)
 * @param {string} comparisonType - Type of comparison: 'name', 'contactInfo', or 'entity' (default: 'name')
 */
function quickCompareToStudy(sampleSize = 10, comparisonType = 'name') {
    return compareToStudy(sampleSize, false, comparisonType);
}

/**
 * Full study on all entities (may take a while!)
 * @param {string} comparisonType - Type of comparison: 'name', 'contactInfo', or 'entity' (default: 'name')
 */
function fullCompareToStudy(comparisonType = 'name') {
    console.log('⚠️ Running full study on all entities. This may take several minutes...');
    return compareToStudy(null, false, comparisonType);
}

/**
 * Convenience functions for specific comparison types
 */
function nameCompareToStudy(sampleSize = null) {
    return compareToStudy(sampleSize, false, 'name');
}

function contactInfoCompareToStudy(sampleSize = null) {
    return compareToStudy(sampleSize, false, 'contactInfo');
}

function entityCompareToStudy(sampleSize = null) {
    return compareToStudy(sampleSize, false, 'entity');
}

// Export for browser
if (typeof window !== 'undefined') {
    window.compareToStudy = compareToStudy;
    window.quickCompareToStudy = quickCompareToStudy;
    window.fullCompareToStudy = fullCompareToStudy;
    window.nameCompareToStudy = nameCompareToStudy;
    window.contactInfoCompareToStudy = contactInfoCompareToStudy;
    window.entityCompareToStudy = entityCompareToStudy;
    window.COMPARISON_CONFIGS = COMPARISON_CONFIGS;
}

console.log('compareTo Study functions loaded:');
console.log('  Parameterized (type = "name", "contactInfo", or "entity"):');
console.log('  - compareToStudy(100, false, "contactInfo")  : Study with specified type');
console.log('  - quickCompareToStudy(10, "contactInfo")     : Quick test with type');
console.log('  - fullCompareToStudy("contactInfo")          : Full study with type');
console.log('  Convenience shortcuts:');
console.log('  - nameCompareToStudy(100)        : IndividualName comparison');
console.log('  - contactInfoCompareToStudy(100) : ContactInfo comparison');
console.log('  - entityCompareToStudy(100)      : Entity comparison (requires Phase 4)');
