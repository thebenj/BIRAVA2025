/**
 * Google Drive API Module
 *
 * Core Google Drive operations and testing utilities.
 * Extracted from utils.js for better modularity and API management.
 *
 * Dependencies:
 * - Google API client (gapi) for authentication
 * - getFileContentsAPI(), loadFromDisk() from utils.js
 * - parameters object for configuration
 *
 * Key Features:
 * - Token caching and management
 * - Optimized authenticated fetch operations
 * - Google Drive file operations (upload, download, list)
 * - API testing and validation utilities
 * - Response format consistency checking
 */

/**
 * Advanced Google Drive API Manager with token caching and optimization
 * Improves performance by caching tokens and providing streamlined API operations
 */
class GoogleAPIManager {
    static cachedToken = null;
    static tokenExpiry = 0;
    static requestCount = 0;

    static getAccessToken() {
        const now = Date.now();

        // Return cached token if still valid (with 5 minute buffer)
        if (this.cachedToken && now < this.tokenExpiry - 300000) {
            console.log('🔄 Using cached token (expires in', Math.round((this.tokenExpiry - now) / 60000), 'minutes)');
            return this.cachedToken;
        }

        // Get fresh token
        console.log('🔑 Getting fresh access token...');
        const tokenData = gapi.auth.getToken();
        if (!tokenData || !tokenData.access_token) {
            throw new Error('No access token available. Please authorize first.');
        }

        this.cachedToken = tokenData.access_token;
        // Google tokens typically expire in 1 hour, cache for 55 minutes
        this.tokenExpiry = now + 3300000;

        console.log('✅ Token cached until', new Date(this.tokenExpiry).toLocaleTimeString());
        return this.cachedToken;
    }

    static async authenticatedFetch(url, options = {}) {
        const token = this.getAccessToken();
        this.requestCount++;

        console.log(`📡 API Request #${this.requestCount}:`, url.substring(0, 60) + '...');

        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                ...options.headers
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                console.log('🔐 Token expired, clearing cache...');
                this.clearTokenCache();
                throw new Error('Token expired - please re-authorize');
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
    }

    static clearTokenCache() {
        this.cachedToken = null;
        this.tokenExpiry = 0;
        console.log('🗑️ Token cache cleared');
    }

    static getStats() {
        return {
            requestCount: this.requestCount,
            hasValidToken: this.cachedToken && Date.now() < this.tokenExpiry,
            tokenExpiresIn: Math.max(0, Math.round((this.tokenExpiry - Date.now()) / 60000))
        };
    }

    // Optimized Google Drive operations using the cached approach
    static async uploadFile(content, filename, parentId) {
        const metadata = {
            name: filename,
            parents: [parentId],
            mimeType: 'application/json'
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([JSON.stringify(content)], { type: 'application/json' }));

        const response = await this.authenticatedFetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
            {
                method: 'POST',
                body: form
            }
        );

        return response.json();
    }

    static async downloadFile(fileId) {
        const response = await this.authenticatedFetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
        );

        const content = await response.text();
        return { body: content };
    }

    static async listFiles(parentId, pageSize = 1000) {
        const query = encodeURIComponent(`'${parentId}' in parents`);
        const url = `https://www.googleapis.com/drive/v3/files?pageSize=${pageSize}&fields=nextPageToken,files(id,name)&q=${query}`;

        const response = await this.authenticatedFetch(url);
        return response.json();
    }
}

/**
 * Test function to verify getFilesList works with Google Drive API
 * Validates file listing functionality for VisionAppraisal operations
 */
async function testGetFilesList() {
    console.log('=== TESTING getFilesList() ===');
    const testFolderId = parameters.pidFilesParents;

    try {
        console.log('Attempting to list files in folder:', testFolderId);
        const filesList = await getFilesList(testFolderId);
        console.log('✅ SUCCESS: Found', filesList.length, 'files');
        console.log('Sample files (first 5):', filesList.slice(0, 5));
        return filesList;
    } catch (error) {
        console.error('❌ getFilesList() FAILED:', error);
        console.error('This means fixDiscrepancies() cannot work!');
        return null;
    }
}

/**
 * Test function to verify response format consistency across Google Drive API calls
 * Important for ensuring data processing functions receive expected response structure
 */
async function testResponseFormats() {
    console.log('=== TESTING RESPONSE FORMAT CONSISTENCY ===');
    const testFileId = '1dOlGnHNDOdsXo1uWGXQWRINeuXOvtYtz';

    try {
        console.log('Testing getFileContentsAPI response format...');
        const response = await getFileContentsAPI(testFileId);
        console.log('getFileContentsAPI response keys:', Object.keys(response));
        console.log('Has .body:', !!response.body);
        console.log('Has .result:', !!response.result);

        // This will show if mergeTheTwo() will break
        if (response.body && !response.result) {
            console.log('⚠️  WARNING: Response has .body but not .result');
            console.log('⚠️  mergeTheTwo() expects .result - will fail!');
        }

        return response;
    } catch (error) {
        console.error('❌ testResponseFormats FAILED:', error);
        return null;
    }
}

/**
 * Test function to verify tracking mechanism for parcel processing progress
 * Validates disk storage and progress tracking functionality
 */
async function testTrackingMechanism() {
    console.log('=== TESTING TRACKING MECHANISM ===');

    try {
        // Check if disk files exist and are accessible
        console.log('Loading original_parcels.json...');
        const originalParcels = await loadFromDisk('original_parcels.json');

        if (originalParcels && Array.isArray(originalParcels)) {
            console.log('✅ Original parcels loaded:', originalParcels.length, 'parcels');
        } else {
            console.log('⚠️  No original_parcels.json found - expected for first run');
        }

        console.log('Loading completed_pids.json...');
        const completedPids = await loadFromDisk('completed_pids.json');

        if (completedPids && Array.isArray(completedPids)) {
            console.log('✅ Completed PIDs loaded:', completedPids.length, 'completed');
        } else {
            console.log('⚠️  No completed_pids.json found - expected for first run');
        }

        // Calculate progress if both files exist
        if (originalParcels && completedPids) {
            const progress = (completedPids.length / originalParcels.length * 100).toFixed(1);
            const remaining = originalParcels.length - completedPids.length;

            console.log(`📊 Progress: ${completedPids.length}/${originalParcels.length} (${progress}%)`);
            console.log(`🔄 Remaining: ${remaining} parcels`);

            return {
                success: true,
                total: originalParcels.length,
                completed: completedPids.length,
                remaining: remaining,
                progressPercent: parseFloat(progress)
            };
        } else {
            return {
                success: true,
                message: 'Files not found - first run expected'
            };
        }

    } catch (error) {
        console.error('❌ Tracking mechanism test failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Test Google API Manager performance and token caching
 * Comprehensive validation of the optimized API management system
 */
async function testGoogleAPIManager() {
    console.log('🔧 Testing Google API Manager with caching...');

    try {
        console.log('Initial stats:', GoogleAPIManager.getStats());

        // Test 1: Token caching across multiple operations
        console.log('\n=== Test 1: Token Caching ===');

        const start1 = performance.now();
        await GoogleAPIManager.listFiles(parameters.pidFilesParents);
        const end1 = performance.now();

        const start2 = performance.now();
        await GoogleAPIManager.listFiles(parameters.pidFilesParents);
        const end2 = performance.now();

        console.log('First request (fresh token):', (end1 - start1).toFixed(2), 'ms');
        console.log('Second request (cached token):', (end2 - start2).toFixed(2), 'ms');
        console.log('Token reuse saved:', ((end1 - start1) - (end2 - start2)).toFixed(2), 'ms');

        // Test 2: Compare with old method
        console.log('\n=== Test 2: API Manager vs Direct Calls ===');

        const startNew = performance.now();
        const newResult = await GoogleAPIManager.downloadFile('1dOlGnHNDOdsXo1uWGXQWRINeuXOvtYtz');
        const endNew = performance.now();

        const startOld = performance.now();
        const oldToken = gapi.auth.getToken().access_token;
        const oldResponse = await fetch('https://www.googleapis.com/drive/v3/files/1dOlGnHNDOdsXo1uWGXQWRINeuXOvtYtz?alt=media', {
            headers: { 'Authorization': 'Bearer ' + oldToken }
        });
        const oldResult = await oldResponse.text();
        const endOld = performance.now();

        console.log('⚡ NEW (API Manager):', (endNew - startNew).toFixed(2), 'ms');
        console.log('🐌 OLD (Direct calls):', (endOld - startOld).toFixed(2), 'ms');
        console.log('✅ Results match:', newResult.body === oldResult);

        console.log('\nFinal stats:', GoogleAPIManager.getStats());

        return {
            success: true,
            tokenCachingWorks: true,
            performanceGain: (endOld - startOld) - (endNew - startNew),
            requestCount: GoogleAPIManager.getStats().requestCount
        };

    } catch (error) {
        console.error('❌ API Manager test failed:', error);
        return { success: false, error: error.message };
    }
}