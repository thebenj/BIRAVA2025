
const CLIENT_ID = '1016133287090-otp06g980ed3l4ecgeb89t7vkkc5bd8o.apps.googleusercontent.com';
const API_KEY = 'AIzaSyBTL0SLt99l4hTA91A2XnF0FZk4SpV3B_0';

// Discovery doc URLs for APIs used by the quickstart
const DISCOVERY_DOCS = [
    'https://sheets.googleapis.com/$discovery/rest?version=v4',
    'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
]

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets";


let tokenClient;
let gapiInited = false;
let gisInited = false;


document.getElementById('authorize_button').style.visibility = 'hidden';
document.getElementById('signout_button').style.visibility = 'hidden';

/**
 * Callback after api.js is loaded.
 */
function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

/**
 * Callback after the API client is loaded. Loads the
 * discovery doc to initialize the API.
 */
async function initializeGapiClient() {
    console.log('Initializing GAPI client with discovery docs...');

    try {
        // TEMP test: remove apiKey to see if discovery loads at all
        await gapi.client.init({
            discoveryDocs: DISCOVERY_DOCS
        });

        console.log('GAPI client initialized successfully');
        console.log('Checking if APIs are available...');
        console.log('gapi.client.drive:', typeof gapi.client.drive);
        console.log('gapi.client.sheets:', typeof gapi.client.sheets);

        gapiInited = true;
    } catch (error) {
        // Show the full error object to debug
        console.error('Full error object:', error);
        console.error('Error properties:', Object.keys(error));
        console.error('First property value:', error[Object.keys(error)[0]]);
        console.error('Error message:', error?.message);
        console.error('Error status:', error?.status);
        console.error('Error result:', error?.result);
        console.error('Error details:', error?.result?.error);
        gapiInited = false;
    }

    // Check for saved token on page load
    const savedToken = localStorage.getItem('google_auth_token');
    if (savedToken) {
        try {
            const tokenData = JSON.parse(savedToken);
            gapi.client.setToken(tokenData);
            updateAuthUI(true);
            console.log('Restored authentication from localStorage');
        } catch (e) {
            console.log('Invalid saved token, clearing localStorage');
            localStorage.removeItem('google_auth_token');
        }
    }

    maybeEnableButtons();
}

function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
    });
    gisInited = true;
    maybeEnableButtons();
}


/**
 * Updates the authentication UI based on login status
 */
function updateAuthUI(isSignedIn) {
    if (isSignedIn) {
        document.getElementById('signout_button').style.visibility = 'visible';
        document.getElementById('authorize_button').innerText = 'Refresh';
    } else {
        document.getElementById('authorize_button').innerText = 'Authorize';
        document.getElementById('signout_button').style.visibility = 'hidden';
    }
}

/**
 * Enables user interaction after all libraries are loaded.
 */
function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        document.getElementById('authorize_button').style.visibility = 'visible';
    }
}

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            throw (resp);
        }

        // Save token to localStorage for persistence
        const currentToken = gapi.client.getToken();
        if (currentToken) {
            localStorage.setItem('google_auth_token', JSON.stringify(currentToken));
            console.log('Authentication token saved to localStorage');
        }

        updateAuthUI(true);
        //        await listFiles();
    };

    if (gapi.client.getToken() === null) {
        // Prompt the user to select a Google Account and ask for consent to share their data
        // when establishing a new session.
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        // Skip display of account chooser and consent dialog for an existing session.
        tokenClient.requestAccessToken({ prompt: '' });
    }
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');

        // Clear saved token from localStorage
        localStorage.removeItem('google_auth_token');
        console.log('Authentication token removed from localStorage');

        updateAuthUI(false);
    }
}

async function listFiles() {
    let response;
    try {
        response = await gapi.client.drive.files.list({
            'pageSize': 10,
            'fields': 'files(id, name)',
        });
    } catch (err) {
        document.getElementById('content').innerText = err.message;
        return;
    }
    const files = response.result.files;
    if (!files || files.length == 0) {
        document.getElementById('content').innerText = 'No files found.';
        return;
    }
    // Flatten to string to display
    const output = files.reduce(
        (str, file) => `${str}${file.name} (${file.id}\n`,
        'Files:\n');
    document.getElementById('content').innerText = output;
}



