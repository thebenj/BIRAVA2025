async function goAgain() {
    //the original list of all parcels
    let fcA = await getFileContentsAPI(parameters.parcelDataFile)
    let origParcelData = JSON.parse(fcA.body)
    //the files that were recorded
    let foundFiles = await getFilesList(parameters.pidFilesParents)
    let pids = []
    let ids = []
    foundFiles.forEach(ite => {
        pids.push(ite[0]);
        ids.push(ite[1])
    })
    let remainingParcelData = origParcelData.filter(ite => (pids.indexOf(ite) === -1))
    //this will return the incremental records
    if (remainingParcelData.length > 0) {
        let bigFile = await fourthButterClick(remainingParcelData)
    }
}

async function mergeTheTwo() {
    let fc = await getFileContentsAPI(parameters.everyThingWithID)
    let fcB = await getFileContentsAPI(parameters.everyThingWithIDB)
    let fileToUpdate = JSON.parse(fc.body)
    let fileToUpdateB = JSON.parse(fcB.body)
    fileToUpdate = fileToUpdate.concat(fileToUpdateB)
    let goneB = await updateFile(parameters.everyThingWithID, fileToUpdate, true)
    goAgain()
}


async function getFilesList(pDrive) {

    let foundFiles = []
    let response = {};
    let myNextPageToken = ""
    do {
        try {
            response = await gapi.client.drive.files.list({
                'pageSize': 1000,
                'pageToken': myNextPageToken || "",
                'fields': "nextPageToken, files(id, name)",
                'q': "'" + pDrive + "' in parents"
            })
        } catch (err) {
            myNextPageToken = "";
        }
        const files = response.result.files;

        if (!files || files.length == 0) {
            myNextPageToken = "";
        } else {
            foundFiles = foundFiles.concat(files.map((str) => [str.name.substring(0, str.name.indexOf(".")), str.id]))
            myNextPageToken = JSON.parse(response.body).nextPageToken
        }
    } while ((!(typeof myNextPageToken === "undefined")) && (myNextPageToken !== null) && (myNextPageToken !== ""));

    return foundFiles;

}

async function makeOneToOneFile() {
    //the original list of all parcels
    let foundFiles = await getFilesList(parameters.pidFilesParents)
    let pids = []
    let ids = []
    foundFiles.forEach(ite => {
        pids.push(ite[0]);
        ids.push(ite[1])
    })
    let onToOn = new oneToOne([fileNumberWord, "PID", ids, pids])
    let makeOnToOne = await writeIndexOfFiles(parameters.listOfPIDFileDirFiles, onToOn, true)
}