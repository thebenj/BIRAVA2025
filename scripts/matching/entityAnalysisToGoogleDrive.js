/**
 * entityAnalysisToGoogleDrive.js
 *
 * Purpose: Memory-efficient entity analysis that writes results directly to Google Drive
 * Each entity is processed in isolation with results immediately uploaded, ensuring
 * no memory accumulation between entity analyses.
 *
 * Key design principles:
 * - One entity processed at a time in complete isolation
 * - Results written to Google Drive immediately after each entity
 * - Strict variable scoping - nothing persists between entities
 * - Each output file contains ALL matches for ONE base entity (all target types combined)
 *
 * Output folder: Google Drive folder ID 11TfolzKvPT6roicAoRgkP4bCQxsrfW1T
 * File naming: <entityKey>_matches_<timestamp>.csv
 *   - entityKey has ":" replaced with "-" for Google Drive compatibility
 *   - Single file per entity contains matches to all target types (Individual, AggregateHousehold, Business, LegalConstruct)
 *
 * Usage:
 *   fetch('./scripts/matching/entityAnalysisToGoogleDrive.js').then(r => r.text()).then(eval)
 *   await runEntityAnalysisToGoogleDrive();
 */

// Target folder ID for output files
const ANALYSIS_OUTPUT_FOLDER_ID = '11TfolzKvPT6roicAoRgkP4bCQxsrfW1T';

// Local output directory for summary files (relative to server root)
const LOCAL_SUMMARY_DIR = './servers/Results';

// Custom error class for authentication failures
class AuthenticationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AuthenticationError';
        this.isAuthError = true;
    }
}

// Track refresh attempts to prevent infinite loops
let tokenRefreshAttempted = false;

/**
 * Attempt to silently refresh the Google OAuth token
 * Uses the existing handleAuthClick() from googleLinks.js
 *
 * @returns {Promise<boolean>} True if refresh succeeded
 */
async function attemptTokenRefresh() {
    return new Promise((resolve) => {
        console.log('🔄 Attempting token refresh...');

        // Check if tokenClient exists (from googleLinks.js)
        if (!window.tokenClient) {
            console.error('❌ tokenClient not available - cannot refresh');
            resolve(false);
            return;
        }

        // Set up the callback to resolve our promise
        const originalCallback = tokenClient.callback;
        tokenClient.callback = async (resp) => {
            if (resp.error !== undefined) {
                console.error('❌ Token refresh failed:', resp.error);
                tokenClient.callback = originalCallback;
                resolve(false);
                return;
            }

            // Save token to localStorage (matches handleAuthClick behavior)
            const currentToken = gapi.client.getToken();
            if (currentToken) {
                localStorage.setItem('google_auth_token', JSON.stringify(currentToken));
                console.log('✅ Token refreshed and saved to localStorage');
            }

            // Restore original callback
            tokenClient.callback = originalCallback;
            resolve(true);
        };

        // Request new token silently (prompt: '' skips the dialog)
        try {
            tokenClient.requestAccessToken({ prompt: '' });
        } catch (err) {
            console.error('❌ Token request failed:', err);
            tokenClient.callback = originalCallback;
            resolve(false);
        }
    });
}

// ============================================================================
// GOOGLE DRIVE FILE UPLOAD
// ============================================================================

/**
 * Upload CSV content to Google Drive as a new file
 * Uses the production-proven multipart upload pattern from bloomerang.js
 * On 401 errors, attempts automatic token refresh and retry
 *
 * @param {string} filename - Name for the file (without extension)
 * @param {string} csvContent - CSV content to upload
 * @param {string} folderId - Google Drive folder ID to place file in
 * @param {boolean} isRetry - Internal flag to prevent infinite retry loops
 * @returns {Promise<string>} Created file ID
 * @throws {AuthenticationError} On 401 authentication failures after retry
 */
async function uploadCsvToGoogleDrive(filename, csvContent, folderId, isRetry = false) {
    const fileMetadata = {
        name: filename + '.csv',
        mimeType: 'text/csv',
        parents: [folderId]
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
    form.append('file', new Blob([csvContent], { type: 'text/csv' }));

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
        method: 'POST',
        headers: new Headers({
            'Authorization': `Bearer ${gapi.client.getToken().access_token}`
        }),
        body: form
    });

    if (response.ok) {
        const result = await response.json();
        return result.id;
    } else {
        const errorText = await response.text();

        // Detect authentication errors (401)
        if (response.status === 401) {
            // If this isn't already a retry, attempt to refresh the token and try again
            if (!isRetry) {
                console.log(`⚠️ Upload got 401 for ${filename}.csv - attempting token refresh...`);
                const refreshed = await attemptTokenRefresh();

                if (refreshed) {
                    console.log(`🔄 Token refreshed, retrying upload for ${filename}.csv...`);
                    // Retry the upload with the new token
                    return await uploadCsvToGoogleDrive(filename, csvContent, folderId, true);
                }
            }

            // Refresh failed or this was already a retry - throw auth error
            throw new AuthenticationError(`Authentication expired (401): ${errorText}`);
        }

        throw new Error(`Failed to upload file: ${response.status} ${errorText}`);
    }
}

// ============================================================================
// LOCAL FILE SAVE (for summary) - Browser Download
// ============================================================================

/**
 * Save summary CSV via browser download
 * Triggers the browser's download dialog to save locally
 *
 * @param {string} filename - Name for the file (without extension)
 * @param {string} csvContent - CSV content to save
 * @returns {string} Download confirmation message
 */
function saveSummaryLocally(filename, csvContent) {
    const fullFilename = filename + '.csv';

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fullFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return `[Downloaded: ${fullFilename}]`;
}

// ============================================================================
// ENTITY KEY UTILITIES
// ============================================================================

/**
 * Build entity key for filename - replaces ":" with "-" for Google Drive compatibility
 * Uses the existing key format from loadAllEntitiesButton.js
 *
 * @param {Object} keyInfo - Key info from getEntityKeyInfo()
 * @returns {string} Google Drive compatible key string
 */
function buildFilenameKey(keyInfo) {
    let key;
    if (keyInfo.source === 'bloomerang') {
        key = `bloomerang-${keyInfo.accountNumber}-${keyInfo.type}-${keyInfo.value}-${keyInfo.headStatus}`;
    } else {
        key = `visionAppraisal-${keyInfo.type}-${keyInfo.value}`;
    }
    // Replace any remaining colons and sanitize for filename
    return key.replace(/:/g, '-').replace(/[/\\?%*|"<>]/g, '_');
}

/**
 * Get entity key info - uses the pattern from universalEntityMatcher.js
 * @param {Entity} entity
 * @returns {Object} { type, value, accountNumber, headStatus, source }
 */
function getEntityKeyInfoLocal(entity) {
    // Get locationIdentifier info
    let type = 'Unknown';
    let value = 'unknown';

    if (entity.locationIdentifier) {
        const locId = entity.locationIdentifier;
        type = locId.constructor?.name || 'Unknown';

        if (locId.primaryAlias?.term) {
            value = String(locId.primaryAlias.term);
        } else if (locId.toString && typeof locId.toString === 'function') {
            value = locId.toString();
        }
    }

    // Check if this is a Bloomerang entity by examining the locationIdentifier sourceMap
    let accountNumber = null;
    let headStatus = null;
    let source = 'visionAppraisal';

    const sourceMap = entity.locationIdentifier?.primaryAlias?.sourceMap;
    let isBloomerang = false;
    if (sourceMap) {
        if (sourceMap instanceof Map) {
            for (const key of sourceMap.keys()) {
                if (String(key).toLowerCase().includes('bloomerang')) {
                    isBloomerang = true;
                    break;
                }
            }
        } else if (sourceMap.__data) {
            isBloomerang = sourceMap.__data.some(entry => String(entry[0]).toLowerCase().includes('bloomerang'));
        }
    }

    if (isBloomerang) {
        source = 'bloomerang';
        if (entity.accountNumber?.primaryAlias?.term) {
            accountNumber = String(entity.accountNumber.primaryAlias.term);
        } else if (entity.accountNumber?.term) {
            accountNumber = String(entity.accountNumber.term);
        }

        headStatus = 'na';
        const entityType = entity.constructor?.name;
        if (entityType === 'Individual') {
            const householdInfo = entity.contactInfo?.householdInformation;
            if (householdInfo && householdInfo.isInHousehold) {
                headStatus = householdInfo.isHeadOfHousehold ? 'head' : 'member';
            }
        }
    }

    return { type, value, accountNumber, headStatus, source };
}

/**
 * Get display name for an entity
 * @param {Entity} entity
 * @returns {string}
 */
function getEntityDisplayNameLocal(entity) {
    if (entity.name) {
        if (entity.name.toString && typeof entity.name.toString === 'function') {
            const nameStr = entity.name.toString();
            if (nameStr && nameStr !== '[object Object]') {
                return nameStr;
            }
        }
        if (entity.name.primaryAlias?.term) {
            return String(entity.name.primaryAlias.term);
        }
        if (entity.name.fullHouseholdName) {
            return entity.name.fullHouseholdName;
        }
    }
    return entity.constructor.name;
}

// ============================================================================
// SINGLE ENTITY ANALYSIS (ISOLATED)
// ============================================================================

/**
 * Analyze a single entity against all other entities
 * This function is completely isolated - all variables are local and will be GC'd after return
 *
 * @param {Entity} baseEntity - The entity to analyze
 * @param {Array<Entity>} allEntities - All entities to compare against
 * @param {Object} config - Configuration settings
 * @returns {Object} Results grouped by target type, each with CSV content
 */
function analyzeOneEntity(baseEntity, allEntities, config) {
    const baseKeyInfo = getEntityKeyInfoLocal(baseEntity);
    const baseType = baseEntity.constructor.name;
    const baseName = getEntityDisplayNameLocal(baseEntity);

    // Results grouped by target entity type
    const resultsByType = {
        Individual: [],
        AggregateHousehold: [],
        Business: [],
        LegalConstruct: []
    };

    // Compare against all target entities
    for (let i = 0; i < allEntities.length; i++) {
        const targetEntity = allEntities[i];
        const targetKeyInfo = getEntityKeyInfoLocal(targetEntity);
        const targetType = targetEntity.constructor.name;

        // Skip self-comparison
        const isSameEntity = (baseKeyInfo.source === targetKeyInfo.source) && (
            (baseKeyInfo.source === 'bloomerang' && baseKeyInfo.accountNumber === targetKeyInfo.accountNumber) ||
            (baseKeyInfo.source === 'visionAppraisal' && baseKeyInfo.type === targetKeyInfo.type && baseKeyInfo.value === targetKeyInfo.value)
        );
        if (isSameEntity) continue;

        // Perform comparison using existing universalCompareTo
        const comparison = universalCompareTo(baseEntity, targetEntity);

        // Store only primitive data needed for CSV - no object references
        if (resultsByType[targetType]) {
            resultsByType[targetType].push({
                targetKey: targetKeyInfo.value,
                targetAccountNumber: targetKeyInfo.accountNumber || '',
                targetSource: targetKeyInfo.source,
                targetType,
                targetName: getEntityDisplayNameLocal(targetEntity),
                score: comparison.score,
                matchedIndividualName: comparison.matchedIndividual ? getEntityDisplayNameLocal(comparison.matchedIndividual) : '',
                matchedIndividualIndex: comparison.matchedIndividualIndex ?? '',
                comparisonType: comparison.comparisonType,
                nameScore: comparison.details?.components?.name?.similarity ?? null,
                contactInfoScore: comparison.details?.components?.contactInfo?.similarity ?? null
            });
        }
    }

    // Process each type and collect ALL matches into a single combined CSV
    const headers = [
        'baseType', 'baseKey', 'baseAccountNumber', 'baseSource', 'baseName',
        'targetType', 'targetKey', 'targetAccountNumber', 'targetSource', 'targetName',
        'rank', 'score', 'comparisonType',
        'matchedIndividualName', 'matchedIndividualIndex',
        'nameScore', 'contactInfoScore',
        'typeTotal', 'type98thPercentile', 'effectiveCutoff', 'selectionMethod'
    ];

    // Collect all matches across all target types
    const allMatchRows = [];
    let totalMatchCount = 0;

    for (const targetType of Object.keys(resultsByType)) {
        const typeResults = resultsByType[targetType];
        if (typeResults.length === 0) continue;

        // Sort by score descending
        typeResults.sort((a, b) => b.score - a.score);

        // Calculate 98th percentile
        const percentileIndex = Math.floor(typeResults.length * (1 - config.percentileThreshold / 100));
        const percentile98Value = typeResults[percentileIndex]?.score || 0;

        // Determine minimum score and cutoff based on comparison type
        const isIndividualToIndividual = baseType === 'Individual' && targetType === 'Individual';
        const isIndividualToHousehold =
            (baseType === 'Individual' && targetType === 'AggregateHousehold') ||
            (baseType === 'AggregateHousehold' && targetType === 'Individual');

        let minimumScore = config.minimumScoreDefault;
        if (isIndividualToIndividual) {
            minimumScore = config.individualToIndividual.minimumScore;
        } else if (isIndividualToHousehold) {
            minimumScore = config.individualToHousehold.minimumScore;
        }

        let effectiveCutoff, selectionMethod, primaryMatches;

        if (isIndividualToIndividual) {
            effectiveCutoff = Math.max(percentile98Value, config.individualToIndividual.minimumCutoff);
            primaryMatches = typeResults.filter(r => r.score >= effectiveCutoff && r.score >= minimumScore);
            selectionMethod = percentile98Value >= config.individualToIndividual.minimumCutoff
                ? `98th_percentile (${percentile98Value.toFixed(4)})`
                : `floor_cutoff (${config.individualToIndividual.minimumCutoff})`;
        } else {
            const above98th = typeResults.filter(r => r.score >= percentile98Value);
            if (above98th.length >= config.minimumGroupSize) {
                primaryMatches = above98th.filter(r => r.score >= minimumScore);
                selectionMethod = '98th_percentile';
            } else {
                primaryMatches = typeResults.slice(0, config.minimumGroupSize).filter(r => r.score >= minimumScore);
                selectionMethod = 'top_N';
            }
            effectiveCutoff = percentile98Value;
        }

        // Name score override matches
        const getUniqueKey = (r) => r.targetSource === 'bloomerang'
            ? `${r.targetSource}:${r.targetAccountNumber}`
            : `${r.targetSource}:${r.targetKey}`;
        const primaryKeys = new Set(primaryMatches.map(getUniqueKey));

        const nameOverrideMatches = typeResults.filter(r =>
            !primaryKeys.has(getUniqueKey(r)) &&
            r.nameScore !== null &&
            r.nameScore >= config.nameScoreOverride &&
            r.score >= minimumScore
        );

        const bestMatches = [...primaryMatches, ...nameOverrideMatches];

        // Add matches to combined list (with per-type rank)
        bestMatches.forEach((match, rank) => {
            allMatchRows.push({
                baseType,
                baseKey: baseKeyInfo.value,
                baseAccountNumber: baseKeyInfo.accountNumber || '',
                baseSource: baseKeyInfo.source,
                baseName,
                targetType: match.targetType,
                targetKey: match.targetKey,
                targetAccountNumber: match.targetAccountNumber,
                targetSource: match.targetSource,
                targetName: match.targetName,
                rank: rank + 1,  // Rank within this target type
                score: match.score.toFixed(6),
                comparisonType: match.comparisonType,
                matchedIndividualName: match.matchedIndividualName,
                matchedIndividualIndex: match.matchedIndividualIndex,
                nameScore: match.nameScore?.toFixed(4) || '',
                contactInfoScore: match.contactInfoScore?.toFixed(4) || '',
                typeTotal: typeResults.length,
                type98thPercentile: percentile98Value.toFixed(4),
                effectiveCutoff: effectiveCutoff.toFixed(4),
                selectionMethod
            });
        });

        totalMatchCount += bestMatches.length;

        // Clear the type results array to help GC
        typeResults.length = 0;
    }

    // If no matches at all, return null
    if (allMatchRows.length === 0) {
        return {
            baseKeyInfo,
            baseName,
            csvContent: null,
            matchCount: 0
        };
    }

    // Build single combined CSV
    const csvLines = [headers.join(',')];
    allMatchRows.forEach(row => {
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

    return {
        baseKeyInfo,
        baseName,
        csvContent: csvLines.join('\n'),
        matchCount: totalMatchCount
    };
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

/**
 * Run the full entity analysis, writing results directly to Google Drive
 * Processes one entity at a time in complete isolation
 *
 * @param {Object} options - Configuration options
 * @param {number} options.startIndex - Start from this entity index (default: 0)
 * @param {number} options.limit - Maximum entities to process (default: all)
 * @param {number} options.delayBetweenEntities - Ms delay between entities (default: 50)
 * @returns {Promise<Object>} Summary of results
 */
async function runEntityAnalysisToGoogleDrive(options = {}) {
    const config = {
        percentileThreshold: 98,
        minimumGroupSize: 10,
        minimumScoreDefault: 0.31,
        nameScoreOverride: 0.985,
        individualToIndividual: {
            minimumCutoff: 0.75,
            minimumScore: 0.50
        },
        individualToHousehold: {
            minimumScore: 0.50
        },
        ...options
    };

    const startIndex = options.startIndex || 0;
    const limit = options.limit || null;
    const delayBetweenEntities = options.delayBetweenEntities ?? 50;

    // Verify entities are loaded
    if (!window.workingLoadedEntities || workingLoadedEntities.status !== 'loaded') {
        console.error('ERROR: Please load entities first using "Load All Entities Into Memory" button');
        return null;
    }

    // Verify Google Drive authentication
    if (!gapi?.client?.getToken()?.access_token) {
        console.error('ERROR: Google Drive not authenticated. Please sign in first.');
        return null;
    }

    // Get all entities once
    const allEntities = getAllEntities();
    const totalEntities = limit ? Math.min(allEntities.length, startIndex + limit) : allEntities.length;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    console.log('=== ENTITY ANALYSIS TO GOOGLE DRIVE ===');
    console.log(`Total entities: ${allEntities.length}`);
    console.log(`Processing: ${startIndex} to ${totalEntities - 1} (${totalEntities - startIndex} entities)`);
    console.log(`Output folder: ${ANALYSIS_OUTPUT_FOLDER_ID}`);
    console.log(`Timestamp: ${timestamp}`);
    console.log('========================================');

    let filesCreated = 0;
    let entitiesProcessed = 0;
    let errors = [];
    let lastSuccessfulEntityIndex = startIndex - 1;
    let authFailure = false;

    // Track all uploaded files for summary CSV
    const uploadedFiles = [];

    const startTime = performance.now();

    // Main processing loop
    mainLoop:
    for (let i = startIndex; i < totalEntities; i++) {
        const entityStartTime = performance.now();

        try {
            // Process ONE entity in isolation
            const results = analyzeOneEntity(allEntities[i], allEntities, config);

            if (results && results.csvContent) {
                const filenameKey = buildFilenameKey(results.baseKeyInfo);
                const filename = `${filenameKey}_matches_${timestamp}`;

                try {
                    const fileId = await uploadCsvToGoogleDrive(
                        filename,
                        results.csvContent,
                        ANALYSIS_OUTPUT_FOLDER_ID
                    );
                    filesCreated++;

                    // Track this upload for summary
                    uploadedFiles.push({
                        filename: filename + '.csv',
                        fileId: fileId,
                        entityKey: filenameKey,
                        entitySource: results.baseKeyInfo.source === 'bloomerang' ? 'Bloomerang' : 'VisionAppraisal',
                        entityName: results.baseName,
                        matchCount: results.matchCount
                    });

                    console.log(`  [${i}] Uploaded: ${filename}.csv (${results.matchCount} matches) - ID: ${fileId}`);

                } catch (uploadError) {
                    // Check if this is an authentication error
                    if (uploadError.isAuthError || uploadError.message.includes('401')) {
                        console.error(`\n🔴 AUTHENTICATION EXPIRED at entity ${i}`);
                        console.error(`   Last successful entity: ${lastSuccessfulEntityIndex}`);
                        console.error(`   To resume, run: await runEntityAnalysisToGoogleDrive({ startIndex: ${i} })`);
                        authFailure = true;
                        errors.push({
                            entity: i,
                            error: 'AUTH_EXPIRED: ' + uploadError.message,
                            isAuthError: true
                        });
                        break mainLoop; // Exit the loop
                    }

                    errors.push({ entity: i, error: uploadError.message });
                    console.error(`  [${i}] Upload failed for ${filename}: ${uploadError.message}`);
                }
            }

            // Only count as successful if we didn't break due to auth failure
            if (!authFailure) {
                lastSuccessfulEntityIndex = i;
                entitiesProcessed++;
            }

            const entityTime = ((performance.now() - entityStartTime) / 1000).toFixed(2);
            if (i % 10 === 0 || i === totalEntities - 1) {
                const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
                const avgTime = (elapsed / (entitiesProcessed || 1)).toFixed(2);
                const remaining = ((totalEntities - i - 1) * avgTime).toFixed(0);
                console.log(`Progress: ${i + 1}/${totalEntities} (${elapsed}s elapsed, ~${remaining}s remaining)`);
            }

        } catch (entityError) {
            errors.push({ entity: i, error: entityError.message });
            console.error(`[${i}] Entity processing error: ${entityError.message}`);
        }

        // Delay between entities to allow GC
        if (delayBetweenEntities > 0 && i < totalEntities - 1) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenEntities));
        }
    }

    const totalTime = ((performance.now() - startTime) / 1000).toFixed(1);

    // =========================================================================
    // SAVE SUMMARY CSV LOCALLY (always - more reliable than Google Drive)
    // =========================================================================
    console.log('\n📋 Saving summary CSV locally...');

    const summaryFilename = `ANALYSIS_SUMMARY_${timestamp}`;
    const completionStatus = authFailure ? 'INTERRUPTED_AUTH_FAILURE' : 'COMPLETED';
    const resumeIndex = authFailure ? lastSuccessfulEntityIndex + 1 : null;

    const summaryCsvContent = createSummaryCsv(uploadedFiles, {
        timestamp,
        entitiesProcessed,
        totalTime,
        errorCount: errors.length,
        completionStatus,
        resumeIndex,
        totalEntities: totalEntities - startIndex
    });

    let summaryPath = null;
    try {
        summaryPath = saveSummaryLocally(summaryFilename, summaryCsvContent);
        console.log(`✅ Summary saved: ${summaryPath}`);
    } catch (summaryError) {
        console.error(`❌ Failed to save summary: ${summaryError.message}`);
    }

    // Print final status
    if (authFailure) {
        console.log('\n🔴 === ANALYSIS INTERRUPTED (AUTH EXPIRED) ===');
        console.log(`Entities processed before failure: ${entitiesProcessed}`);
        console.log(`Files created: ${filesCreated}`);
        console.log(`Last successful entity index: ${lastSuccessfulEntityIndex}`);
        console.log(`\n▶️  TO RESUME, RUN:`);
        console.log(`   await runEntityAnalysisToGoogleDrive({ startIndex: ${lastSuccessfulEntityIndex + 1} })`);
        console.log('================================================');
    } else {
        console.log('\n=== ANALYSIS COMPLETE ===');
        console.log(`Entities processed: ${entitiesProcessed}`);
        console.log(`Files created: ${filesCreated}`);
        console.log(`Errors: ${errors.length}`);
        console.log(`Total time: ${totalTime}s`);
        console.log('=========================');
    }

    return {
        entitiesProcessed,
        filesCreated,
        summaryPath,
        uploadedFiles,
        errors,
        totalTime: parseFloat(totalTime),
        timestamp,
        completionStatus,
        resumeIndex,
        lastSuccessfulEntityIndex
    };
}

/**
 * Create summary CSV content from uploaded files list
 * @param {Array} uploadedFiles - Array of uploaded file records
 * @param {Object} metadata - Run metadata (timestamp, counts, etc.)
 * @returns {string} CSV content
 */
function createSummaryCsv(uploadedFiles, metadata) {
    const headers = ['filename', 'googleFileId', 'entityKey', 'entitySource', 'entityName', 'matchCount'];

    const csvLines = [headers.join(',')];

    uploadedFiles.forEach(file => {
        const values = headers.map(h => {
            const val = file[h] ?? '';
            const strVal = String(val);
            // Escape CSV special characters
            if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
                return `"${strVal.replace(/"/g, '""')}"`;
            }
            return strVal;
        });
        csvLines.push(values.join(','));
    });

    // Add metadata section at the end
    csvLines.push('');
    csvLines.push('--- ANALYSIS METADATA ---');
    csvLines.push(`Timestamp,${metadata.timestamp}`);
    csvLines.push(`Completion Status,${metadata.completionStatus || 'COMPLETED'}`);
    csvLines.push(`Entities Processed,${metadata.entitiesProcessed}`);
    csvLines.push(`Total Entities Requested,${metadata.totalEntities || 'unknown'}`);
    csvLines.push(`Total Files Created,${uploadedFiles.length}`);
    csvLines.push(`Total Time (seconds),${metadata.totalTime}`);
    csvLines.push(`Errors,${metadata.errorCount}`);

    // Add resume information if interrupted
    if (metadata.resumeIndex !== null && metadata.resumeIndex !== undefined) {
        csvLines.push('');
        csvLines.push('--- RESUME INFORMATION ---');
        csvLines.push(`Resume From Entity Index,${metadata.resumeIndex}`);
        csvLines.push(`Resume Command,await runEntityAnalysisToGoogleDrive({ startIndex: ${metadata.resumeIndex} })`);
    }

    return csvLines.join('\n');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

console.log('Entity Analysis to Google Drive module loaded');
console.log('');
console.log('Usage:');
console.log('  await runEntityAnalysisToGoogleDrive()');
console.log('');
console.log('Options:');
console.log('  startIndex: Start from entity N (default: 0)');
console.log('  limit: Process only N entities (default: all)');
console.log('  delayBetweenEntities: Ms delay between entities (default: 50)');
console.log('');
console.log('Examples:');
console.log('  // Process all entities:');
console.log('  await runEntityAnalysisToGoogleDrive()');
console.log('');
console.log('  // Test with first 5 entities:');
console.log('  await runEntityAnalysisToGoogleDrive({ limit: 5 })');
console.log('');
console.log('  // Resume from entity 100:');
console.log('  await runEntityAnalysisToGoogleDrive({ startIndex: 100 })');
console.log('');
console.log(`Output folder ID: ${ANALYSIS_OUTPUT_FOLDER_ID}`);

// Export to window
window.runEntityAnalysisToGoogleDrive = runEntityAnalysisToGoogleDrive;
window.analyzeOneEntity = analyzeOneEntity;
window.uploadCsvToGoogleDrive = uploadCsvToGoogleDrive;
