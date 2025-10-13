var retryErrors = [403, 404, 401]
var failedDialogTag = "FAILED"
var tryLimit = 3
var runningFromBrowser = true
var fileNumberWord = "File Number"

//from MailChimpRe on 2/23/2023 with the above lines added
function testGet() {
    let xxx = getFiledContentsAndID("1QqLHHmQdahnzqdiFMr-qodADsphreUXg", true)
    console.log(xxx)

}

//takes spreadsheet data and outputs it
async function setRangeRestValues(pSSId, pSht, pRangeArray, pValues) {
    let params = {
        'spreadsheetId': pSSId,
        // The ranges to retrieve from the spreadsheet.
        'range': ((pRangeArray.length === 0) ? pSht : pSht + "!" + aOneNotation(pRangeArray)),
        'valueInputOption': 'RAW',
        'includeValuesInResponse': false
    };
    var valueRangeBody = {
        "values": pValues
    };

    let request = gapi.client.sheets.spreadsheets.values.update(params, valueRangeBody);
    return request.then(function (response) {
        // TODO: Change code below to process the `response` object:
        return response.result.values;
    }, function (reason) {
        console.error('error: ' + reason.result.error.message);
    });

}


//get a range of data from a spreadsheet
//uses aOneNotation that takes an range array of numbers and makes it Aone notation
async function getRangeRestValues(pSSId, pSht, pRangeArray) {
    let params = {
        spreadsheetId: pSSId,
        // The ranges to retrieve from the spreadsheet.
        range: ((pRangeArray.length === 0) ? pSht : pSht + "!" + aOneNotation(pRangeArray)),
        valueRenderOption: 'UNFORMATTED_VALUE',
    };
    let request = gapi.client.sheets.spreadsheets.values.get(params);
    return request.then(function (response) {
        // TODO: Change code below to process the `response` object:
        return response.result.values;
    }, function (reason) {
        console.error('error: ' + reason.result.error.message);
    });

}

//passed object is not json
async function updateFile(pID, pObj, pAPIOrNot) {
    if (pAPIOrNot) {

        //taking object and Id
        async function whilePostFileUpd(pPData, pPType, pPID) {
            let resIsNotGood = true;
            let postRes = null
            //just keep trying
            let tries = 0
            while (resIsNotGood && (tries <= tryLimit)) {
                postRes = await updateContentOther(pPData, pPType, pPID)
                resIsNotGood = ((typeof postRes === "string") && (postRes === failedDialogTag))
                if (tries > 2) {
                    let xxx = 5;
                }
                tries++
            }
            return postRes
        }

        async function updateContentOther(pData, pType, pID) {
            let accessToken = gapi.auth.getToken().access_token; // Here gapi is used for retrieving the access token.
            return await fetch('https://www.googleapis.com/upload/drive/v3/files/' + pID + '?uploadType=media', {
                method: 'PATCH',
                headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
                body: JSON.stringify(pData)
            }).then((res) => {
                let retVal = null
                if (retryErrors.indexOf(res.status) > -1) {
                    retVal = failedDialogTag
                } else {
                    retVal = res.json()
                }
                return retVal;
            }).then(function (val) {
                return val;
            }).catch(err =>
                console.log(pID + " " + err));
        }
        //post while file takes obj and id
        return await whilePostFileUpd(pObj, 'application/json', pID)
    } else {
        return Drive.Files.update({
            'mimeType': 'application/json'
        }, pID,
            Utilities.newBlob(JSON.stringify(pObj), "application/vnd.google-apps.script+json")
        )
    }
}


async function getBackAFileViaConstructor(pFileID) {
    if (!initialized) { initializeMatching() }
    //    let xA = findTypeObject("Individual", ["name"])
    //    let xB = findTypeObject("InHHDiffNamesObj", ["function", "name"])
    //get failslist
    let got = await getFileContentsAPI(pFileID)
    let jsonV = JSON.parse(got.body)
    if (Object.hasOwn(jsonV, "constructorFunction")) {
        return applyToConstructor(
            findTypeObject(jsonV.constructorFunction, ["function", "name"]).function,
            jsonV.properties)
    } else {
        return jsonV;
    }
    //make array of file names and file contents
    //resave the files

}



//not parsed
async function getFileContents(pID, pAPIOrNot) {
    if (pAPIOrNot) {
        let retVal = await getFileContentsAPI(pID)
        return ((retVal) ? retVal.body : null)
    } else {
        return JSON.parse(Drive.Files.get(pID, { 'alt': 'media' }).toString())
    }
}

async function getFileContentsAPI(pID) {
    return await gapi.client.drive.files.get({
        'fileId': pID,
        'alt': 'media'
    })
}

async function saveAsJSON(pObj, fileName, parentFileID, pAPIOrNot) {
    if (pAPIOrNot) {

        async function whilePostFile(pFileName, ppPObj, pPType, pParentFileID, pExt) {
            let resIsNotGood = true;
            let postRes = null
            let tries = 0
            while (resIsNotGood && (tries <= tryLimit)) {
                postRes = await postFile(pFileName, ppPObj, pPType, pParentFileID, pExt)
                resIsNotGood = ((typeof postRes === "string") && (postRes === failedDialogTag))
                if (tries > 2) {
                    let xxx = 5;
                }
                tries++
            }
            return postRes
        }

        async function postFile(pName, pData, pType, pID, ext) {
            let metadata = {
                'name': (pName + ext), // Filename at Google Drive
                'mimeType': pType,
                'parents': [pID]// mimeType at Google Drive
            };

            let accessToken = gapi.auth.getToken().access_token; // Here gapi is used for retrieving the access token.
            let form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', new Blob([JSON.stringify(pData)], { type: pType }));

            let resOFetch = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
                method: 'POST',
                headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
                body: form
            }).then((res) => {
                let retVal = null
                if (retryErrors.indexOf(res.status) > -1) {
                    retVal = failedDialogTag
                } else {
                    retVal = res.json()
                }
                return retVal;
            }).then(function (val) {
                return val;
            }).catch(err =>
                console.log(pName + " " + err));
            return resOFetch
        }
        return await whilePostFile(fileName, pObj, 'application / json', parentFileID, '.json')

    } else {
        return Drive.Files.insert({
            title: fileName + '.json',
            mimeType: 'application/json',
            'parents': [{ "id": parentFileID }]
        }, Utilities.newBlob(JSON.stringify(pObj), "application/vnd.google-apps.script+json"));
    }
}


async function writeIndexOfFiles(pTargFile, pObj, dontKeepFunctions) {
    let prepped = preSerializeInstantiate(pObj, dontKeepFunctions)
    return await updateFile(pTargFile, prepped, runningFromBrowser)
}

async function resurrectIndex(pFileID) {
    //    let got = await getFileContentsAPI(((doingMC) ? indexFileMC : indexFileQB))
    let got = await getFileContentsAPI(pFileID)
    if (got.body === '') { return null } else {
        let jsOfGot = JSON.parse(got.body)
        return applyToConstructor(
            oneToOne, [jsOfGot.properties.firstArrayLabel,
            jsOfGot.properties.secondArrayLabel,
            jsOfGot.properties.firstArray,
            jsOfGot.properties.secondArray,
            jsOfGot._length,
            jsOfGot.zippedPairFtoS,
            jsOfGot.zippedPairStoF])
    }
}


async function resurrectDataFromFile(pTargFile, pAPIorNot) {
    let cont = await getFileContents(pTargFile, pAPIorNot)
    return JSON.parse(cont)
}

async function resurrectFails() {
    let fileID = ((doingMC) ? mcFails : qbFails)
    //get failslist
    let got = await getFileContentsAPI(fileID)
    let jsonV = JSON.parse(got.body)
    //make array of file names and file contents
    let proced = jsonV.filter(itf => itf.indexOf(savingTag) > -1).map(itl => {
        let redu = itl.substring(savingTag.length, itl.length)
        let spot = redu.indexOf("\",{\"")
        return [redu.substring(2, spot), JSON.parse("[" + redu.substring(spot + 2, redu.length))]
    })
    //resave the files
    let allRes = await Promise.all(proced.map(async (ite) => {
        //At this point we have the four objects
        let fileInfo = await saveAsJSON(ite[1][0],
            ite[0], ite[1][2], true)
        return [fileInfo.id, ite[0]]
    }))
    //record the index
    baseOutPair = await resurrectIndex(((doingMC) ? sourceDescriptions.get("MailChimp").targFile : sourceDescriptions.get("QuickBooks").targFile))
    //    index[0] = index[0].filter(ite => ite[0]).concat(allRes)
    //    index[1] = index[1].filter(ite => ite[1]).concat(allRes.map(ith => [ith[1], ith[0]]))
    allRes.forEach(ite => baseOutPair.addPair(ite))
    await writeIndexOfFiles(((doingMC) ? sourceDescriptions.get("MailChimp").targFile : sourceDescriptions.get("QuickBooks").targFile), baseOutPair)

}

async function resurrectMap(pFileID) {
    let got = await getFileContents(pFileID, true)
    if (got) {
        let jsOfGot = JSON.parse(got.body)
        return applyToConstructor(
            oneToOne, [jsOfGot.properties.firstArrayLabel,
            jsOfGot.properties.secondArrayLabel,
            jsOfGot.properties.firstArray,
            jsOfGot.properties.secondArray])
    } else {
        return new oneToOne()
            ;
    }
}


async function cleanIndex(pFileId) {
    let baseOutPair = await resurrectIndex(pFileId)
    //    index[0] = index[0].filter(ite=>ite[0])
    //    index[1] = index[1].filter(ite=> ite[1])
    await writeIndexOfFiles(((doingMC) ? sourceDescriptions.get("MailChimp").targFile : sourceDescriptions.get("QuickBooks").targFile), baseOutPair)
}


function rpbAddElement(pObj, pLab, pChain) {
    let derDiv = document.createElement("div")
    derDiv.setAttribute("id", pLab + "_holder:^:" + pChain)
    pObj.appendChild(derDiv)
    let objHead = document.createElement("p")
    objHead.setAttribute("id", pLab + "_pText:^:" + pChain)
    objHead.innerHTML = pLab
    derDiv.appendChild(objHead)
    return derDiv
}

function rpbAddElementInput(pObj, pLab, pVal, pNameChain, pOrgObj) {
    let labbie = document.createElement("label")
    let inp = document.createElement("input")
    inp.setAttribute("type", "text")
    inp.setAttribute("name", pLab + ":^:" + pNameChain)
    inp.setAttribute("id", pLab + ":^:" + pNameChain)
    inp.setAttribute("value", pVal)
    inp.addEventListener('change', (event) => {
        if (Array.isArray(pOrgObj)) {
            pOrgObj = inp.value.split(",,")
        } else {
            pOrgObj[pLab] = inp.value
        }
    });
    if ((pVal !== null) && (typeof pVal !== "undefined") && (typeof pVal === "string")) {
        inp.setAttribute("size", pVal.length)
    }
    pObj.appendChild(labbie)
    labbie.innerHTML = pLab
    labbie.setAttribute("for", inp.name)
    labbie.setAttribute("id", "lab" + ":^:" + pLab + ":^:" + pNameChain)
    pObj.appendChild(inp)
}

function makeRPBForm(pObj, pParent, pNameChain) {
    let isPrim = (pVal) => {
        return ((pVal === null) ||
            (typeof pVal === "undefined") || ((typeof pVal !== 'object') && (typeof pVal !== 'function')))
    }
    let isAllPrim = (pArr) => { return pArr.reduce((cue, ite) => cue = cue && isPrim(ite), true) }

    for (let prop in pObj) {
        let val = pObj[prop]
        let disDiv = document.createElement("div")
        disDiv.setAttribute("id", prop + "_div" + ":^:" + pNameChain)
        if (isPrim(val)) {
            //a label and an input, on change we change object
            rpbAddElementInput(disDiv, prop, val, disDiv.id, pObj)
            pParent.appendChild(disDiv)
        } else {
            if (Array.isArray(val)) {
                if (isAllPrim(val)) {
                    rpbAddElementInput(disDiv, prop,
                        val.filter(ity => (typeof ity !== 'function')).reduce((cug, itg, ing, arrg) =>
                            cug += itg + ((ing < arrg.length - 1) ? ",," : ""), ""),
                        "array:^:" + disDiv.id, val)
                } else {
                    val.filter(ity => (typeof ity !== 'function')).forEach((itf, inf) => {
                        if (isPrim(itf)) {
                            rpbAddElementInput(disDiv, inf, itf, disDiv.id, val)
                        } else {
                            let pLab = (((typeof itf.type !== "undefined") && (itf.type !== null)) ?
                                itf.type : typeof itf)
                            let holder = rpbAddElement(disDiv, pLab, disDiv.id)
                            makeRPBForm(itf, holder, holder.id)
                        }
                    })
                }
                pParent.appendChild(disDiv)
            } else {
                if (typeof val !== 'function') {
                    let holder = rpbAddElement(disDiv, prop, disDiv.id)
                    if (typeof val === 'object') {
                        makeRPBForm(val, holder, holder.id)
                    }
                    pParent.appendChild(holder)
                }
            }
        }
    }
}




async function processChangesFuncA() {
    let x = await updateFile(pairToCompare[0][0], preSerializeInstantiate(pairToCompare[0][1]), true);
}

async function processChangesFuncB() {
    let x = await updateFile(pairToCompare[1][0], preSerializeInstantiate(pairToCompare[1][1]), true);
}


