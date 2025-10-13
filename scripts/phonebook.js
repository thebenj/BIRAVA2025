// phonebook.js
const phonebookParameters = {
    spreadSheet: {
        ID: "1f0TTc0luRg_5siEEKUCVD9e8-k-OfHi4IQlX-SdIcBI",
        sheet: "Sheet2"
    },
    outputSheet: "1MdynaDB0jbjkwNKyidOHmdsYueM9Nj-k"
}

async function readPhonebook() {
    let params = {
        spreadsheetId: phonebookParameters.spreadSheet.ID,
        range: phonebookParameters.spreadSheet.sheet,
        valueRenderOption: 'UNFORMATTED_VALUE',
    };
    let request = gapi.client.sheets.spreadsheets.values.get(params);
    return request.then(function (response) {
        const values = response.result.values;
        if (!values || values.length === 0) {
            console.log('No data found in spreadsheet');
            return [];
        }

        const headers = values[0];
        const dataRows = values.slice(1);

        // Create array starting with headers as first row
        const jsonData = [headers];

        // Add data rows
        dataRows.forEach(row => {
            const rowData = [];
            for (let i = 0; i < headers.length; i++) {
                rowData.push(row[i] || '');
            }
            jsonData.push(rowData);
        });

        // Save to Google Drive as JSON file
        savePhonebookToGoogleDrive(jsonData);

        return jsonData;
    }, function (reason) {
        console.error('error: ' + reason.result.error.message);
    });
}

async function savePhonebookToGoogleDrive(data) {
    const fileId = phonebookParameters.outputSheet;
    const jsonContent = JSON.stringify(data, null, 2);

    try {
        const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
            method: 'PATCH',
            headers: new Headers({
                'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                'Content-Type': 'application/json'
            }),
            body: jsonContent
        });

        if (response.ok) {
            console.log('Phonebook data updated in Google Drive file ID:', fileId);
        } else {
            console.error('Error updating Google Drive file:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('Error updating file:', error);
    }
}