const reqBase = "http://127.0.0.99:3000";
//        const reqURL = "/Streets.aspx?Letter=B";

const reqURL = "/Streets.aspx";
//        const reqURL = "/huh";

const parameters = {
    "streetFile": "1lsrd0alv9O01M_qlsiym3cB0TRIdgXI9",
    "parcelDataFile": "1LbdOEWWiW-RO42V2qDy7r5I4e9y58TLW",
    "pidFilesParents": "1bviROzYio7618V13zHpCbYNEcOV2p3mo",
//    "pidFilesParents": "15vpT-gCfNzCGDXCBlf82elrZ3Ndt9tpU",
    "errorFile": "1szPM2Kw4ceGCaRlm_SB6_rhNfsety1vJ",
    "legacy": "1f-Ex3PpuddkHKzuJ_yjWJ-8pItnV-ouf",
    "legacyB": "1UqGlYgygQNJJIyo-fkIa2Qa_cxS-Ebv7",
    "lastDone": "1DWLBAoZ4uefp-IAhmOGATPqbOJ6X1UZ9",
    "listOfPIDFileDirFiles": "1dZJPaGTvY-6muO48pp65ilIkXxz486Mo",
    "everyThingWithID": "1ayejMSapX22_1KYZX4jiTGqtCcvnWOtc",
    "everyThingWithIDB": "1V7BOvd84KbiRYeOn6ok_vbL6GTPcfcuN"
}


async function axiosAway(pExtension) {
    let resp = axios.get(pExtension).then(response => {
        return response;
    }).catch(error => {
        return error;
    });
    //            return resp.json();
    //            let retVal = resp.text()
    return resp;
}

let streetStarts = [];
async function firstButterClick(evt) {
    //                Promise.resolve(uploadWithFetch(passObj, dataPassed)).then((val) => {

    let aaRes = await axiosAway(reqBase + reqURL)

    //                let huh = this.document.getElementById("ressieH").innerHTML;
    let captVal = aaRes.data
    let parser = new DOMParser();
    let docCR = parser.parseFromString(captVal, "text/html");
    let strBase = docCR.getElementsByClassName("buttonMe")[0].childNodes;
    for (let cB = 0; cB < strBase.length; cB++) {
        let disOne = strBase.item(cB);
        if (disOne.tagName === 'A') {
            let temp = {};
            temp.name = disOne.innerHTML;
            temp.href = disOne.href;
            let levSReqURL = temp.href;
            streetStarts.push(temp);
        }
    }
    let yyy = 5;

};


var streetSave = [];
var streetData = [];
var parcelData = [];

async function secondButterClick() {
    let promCapt = [];
    for (let cC = 0; cC < streetStarts.length; cC++) {
        let disser = streetStarts[cC].href;
        let splitRes = disser.split("/");
        let resURLL = splitRes[splitRes.length - 1];
        let fullURL = reqBase + '/' + resURLL;
        promCapt.push(await axios.get(fullURL).then(response => {
            return response;
        }));
    }
    //    let resps = await Promise.all(promCapt)

    for (let cD = 0; cD < promCapt.length; cD++) {
        //        this.document.getElementById("ressieH").innerHTML = promCapt[cD].data;
        let captVal = promCapt[cD].data
        let parser = new DOMParser();
        let docCR = parser.parseFromString(captVal, "text/html");


        //            let streets = this.document.getElementsByClassName("fixedButton");
        let streets = docCR.getElementsByClassName("fixedButton")
        for (let cA = 0; cA < streets.length; cA++) {
            let disItem = streets.item(cA);
            let temp = {};
            if (disItem.tagName === "LI") {
                temp.name = disItem.firstChild.innerHTML;
                temp.href = disItem.firstChild.href;
                streetData.push(temp);
            }

        }
    }
    let actStreetNames = streetData.map(ite => Object.values(ite)[0])

    let gone = await updateFile(parameters.streetFile, actStreetNames, true)
    /*
        let jarr = JSON.stringify(actStreetNames);
        const urlToGo = window.URL.createObjectURL(new Blob([jarr]));
        const fauxLinkObj = this.document.createElement('a');
        fauxLinkObj.href = urlToGo;
        fauxLinkObj.setAttribute('download', 'streetData.txt');
        document.body.appendChild(fauxLinkObj);
        fauxLinkObj.click();
        */
}

async function firstTwoClick() {
    let firster = await firstButterClick()
    console.log("onedone")
    let seconder = await secondButterClick()
    console.log("twodone")
}

async function firstThreeClick() {
    let firster = await firstButterClick()
    console.log("onedone")
    let seconder = await secondButterClick()
    console.log("twodone")
    let thirder = await thirdButterClick()
    console.log("threedone")

}

async function AllClick() {
    let firster = await firstButterClick()
    console.log("onedone")
    let seconder = await secondButterClick()
    console.log("twodone")
    let thirder = await thirdButterClick()
    console.log("threedone")
    let fourther = await fourthButterClick()
    console.log("fourthDone")

}


async function thirdButterClick() {
    //            this.document.getElementById("ressieH").innerHTML = streetData.reduce((cug, itg, ing, arrg) => cug += itg.name + ",", "")
    let promCaptB = [];
    for (let cD = 0; cD < streetData.length; cD++) {
        let disser = streetData[cD].href;
        let splitRes = disser.split("/");
        let resURLL = splitRes[splitRes.length - 1];
        let fullURL = reqBase + '/' + resURLL;
        promCaptB.push(await axios.get(fullURL).then(response => {
            return response;
        }));
    }
    for (let cE = 0; cE < promCaptB.length; cE++) {
        let captVal = promCaptB[cE].data
        let parser = new DOMParser();
        let docCR = parser.parseFromString(captVal, "text/html");

        //        this.document.getElementById("ressieH").innerHTML = promCaptB[cE].data;
        let uiWid = docCR.getElementsByClassName("ui-widget");
        if (uiWid.length > 0) {
            let uiWC = docCR.getElementsByClassName("ui-widget").item(0).childNodes;
            if (uiWC.length > 5) {
                let uiLister = uiWC.item(5).childNodes;
                if (uiLister.length > 3) {
                    let addressList = uiLister.item(3).childNodes;
                    for (let cA = 0; cA < addressList.length; cA++) {
                        let disItem = addressList.item(cA);
                        //                                    let temp = {};
                        if (disItem.tagName === "LI") {
                            let hrefT = disItem.firstChild.href;
                            if (hrefT) {
                                if (hrefT.indexOf("Parcel.aspx?pid=") > -1) {
                                    let putter = (new RegExp("pid=(\\d*)")).exec(disItem.firstChild.href)[1];
                                    parcelData.push(putter);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    parcelData = parcelData.filter((item,
        index, arr) => arr.indexOf(item) === index);
    let gone = await updateFile(parameters.parcelDataFile, parcelData, true)
    /*
    let jarr = JSON.stringify(parcelData);
        const urlToGo = window.URL.createObjectURL(new Blob([jarr]));
        const fauxLinkObj = this.document.createElement('a');
        fauxLinkObj.href = urlToGo;
        fauxLinkObj.setAttribute('download', 'parcelData.txt');
        document.body.appendChild(fauxLinkObj);
        fauxLinkObj.click();*/
    //            Parcel.aspx ? pid = 419
}
var errors = [];
async function fourthButterClick(pParcelData) {
    let bigFile = []
    wParcelData = pParcelData || parcelData
    let owners = "";
    for (let cN = 0; cN < wParcelData.length; cN++) {
        let disser = wParcelData[cN];
        let fullURLX = reqBase + '/Parcel.aspx?pid=' + disser;
        let failed = false;
        let disPlat = await fetch(fullURLX).then(response => {
            return response.text();
        }).catch(async (error) => {
            failed = true;
            console.log(error);
            errors.push([cN, disser]);
            let gone = await updateFile(parameters.errorFile, errors, true)
        }
        );
        if (!failed) {
            disPlat = disPlat.replaceAll(/http:\/\/images.vgsi.com\/.+\.jpg/g, "");
            disPlat = disPlat.replaceAll(/http:\/\/images.vgsi.com\/.+\.JPG/g, "");
            let stringed = await (async (resp, pEnv) => {
                let parser = new DOMParser();
                let docCR = parser.parseFromString(resp, "text/html");

                /*pEnv.document.getElementById("ressieH").innerHTML = resp;
                let ownName = ((pEnv.document.getElementById("MainContent_lblOwner"))
                    ? pEnv.document.getElementById("MainContent_lblOwner").innerHTML.replaceAll("<br>", "::#^#::").replaceAll("&amp;", "&").replaceAll(",", ":^#^:")
                    : "");
                let cownName = ((pEnv.document.getElementById("MainContent_lblCoOwner"))
                    ? pEnv.document.getElementById("MainContent_lblCoOwner").innerHTML.replaceAll("<br>", "::#^#::").replaceAll("&amp;", "&").replaceAll(",", ":^#^:")
                    : "");
                let addr = ((pEnv.document.getElementById("MainContent_lblAddr1"))
                    ? pEnv.document.getElementById("MainContent_lblAddr1").innerHTML.replaceAll("<br>", "::#^#::").replaceAll("&amp;", "&").replaceAll(",", ":^#^:")
                    : "");
                let location = ((pEnv.document.getElementById("MainContent_lblLocation"))
                    ? pEnv.document.getElementById("MainContent_lblLocation").innerHTML.replaceAll("<br>", "::#^#::").replaceAll(",", ":^#^:")
                    : "");
                let zone = ((pEnv.document.getElementById("MainContent_lblZone"))
                    ? pEnv.document.getElementById("MainContent_lblZone").innerHTML
                    : "");
                let use = ((pEnv.document.getElementById("MainContent_lblUseCode"))
                    ? pEnv.document.getElementById("MainContent_lblUseCode").innerHTML.replaceAll("<br>", "::#^#::")
                    : "");
                let nei = ((pEnv.document.getElementById("MainContent_lblNbhd"))
                    ? pEnv.document.getElementById("MainContent_lblNbhd").innerHTML
                    : "");
                let lastSD = ((pEnv.document.getElementById("MainContent_lblSaleDate"))
                    ? pEnv.document.getElementById("MainContent_lblSaleDate").innerHTML
                    : "");
                let pid = ((pEnv.document.getElementById("MainContent_lblPid"))
                    ? pEnv.document.getElementById("MainContent_lblPid").innerHTML
                    : "");
                owners += ownName + "," + cownName + "," + addr + "," + location + ',' + zone + ',' + use + ',' + nei + ',' + lastSD + ',' + pid + "\r\n";
                */
                //                docCR.getElementById("ressieH").innerHTML = resp;
                let ownName = ((docCR.getElementById("MainContent_lblOwner"))
                    ? docCR.getElementById("MainContent_lblOwner").innerHTML.replaceAll("<br>", "::#^#::").replaceAll("&amp;", "&").replaceAll(",", ":^#^:")
                    : "");
                let cownName = ((docCR.getElementById("MainContent_lblCoOwner"))
                    ? docCR.getElementById("MainContent_lblCoOwner").innerHTML.replaceAll("<br>", "::#^#::").replaceAll("&amp;", "&").replaceAll(",", ":^#^:")
                    : "");
                let addr = ((docCR.getElementById("MainContent_lblAddr1"))
                    ? docCR.getElementById("MainContent_lblAddr1").innerHTML.replaceAll("<br>", "::#^#::").replaceAll("&amp;", "&").replaceAll(",", ":^#^:")
                    : "");
                let location = ((docCR.getElementById("MainContent_lblLocation"))
                    ? docCR.getElementById("MainContent_lblLocation").innerHTML.replaceAll("<br>", "::#^#::").replaceAll(",", ":^#^:")
                    : "");
                let zone = ((docCR.getElementById("MainContent_lblZone"))
                    ? docCR.getElementById("MainContent_lblZone").innerHTML
                    : "");
                let use = ((docCR.getElementById("MainContent_lblUseCode"))
                    ? docCR.getElementById("MainContent_lblUseCode").innerHTML.replaceAll("<br>", "::#^#::")
                    : "");
                let nei = ((docCR.getElementById("MainContent_lblNbhd"))
                    ? docCR.getElementById("MainContent_lblNbhd").innerHTML
                    : "");
                let lastSD = ((docCR.getElementById("MainContent_lblSaleDate"))
                    ? docCR.getElementById("MainContent_lblSaleDate").innerHTML
                    : "");
                let platNumb = ((docCR.getElementById("MainContent_lblMblu"))
                    ? docCR.getElementById("MainContent_lblMblu").innerHTML
                    : "");
                let pid = ((docCR.getElementById("MainContent_lblPid"))
                    ? docCR.getElementById("MainContent_lblPid").innerHTML
                    : "");
                let disOwn = ownName + "," + cownName + "," + addr + "," + location + ',' + zone + ',' + use + ',' + nei + ',' + lastSD + ',' + platNumb + ',' + pid
                owners += disOwn + "\r\n";
                let disOne = await saveAsJSON(disOwn, pid, parameters.pidFilesParents, true)
                let goneB = await updateFile(parameters.lastDone, pid, true)
                bigFile.push(disOwn + "," + disOne.id)
                let goneC = await updateFile(
                    (((typeof pParcelData === 'undefined') || (pParcelData === null)) ? parameters.everyThingWithID :
                        parameters.everyThingWithIDB)
                    , bigFile, true)
                let goneA = await updateFile(
                    (((typeof pParcelData === 'undefined') || (pParcelData === null)) ? parameters.legacy :
                        parameters.legacyB), owners, true)

                //                owners += ownName + "," + cownName + "," + addr + "," + location + ',' + zone + ',' + use + ',' + nei + ',' + lastSD + ',' + pid + "\r\n";
            })(disPlat, this);
        }
    }

    if (Array.isArray(pParcelData)) {
        return bigFile;
    }

    /*
        const urlToGoA = window.URL.createObjectURL(new Blob([owners]));
        const fauxLinkObjA = this.document.createElement('a');
        fauxLinkObjA.href = urlToGoA;
        //            let fNam = 'owners' + ('0000' + cOO.toString()).slice(-4) + '.csv'
        fauxLinkObjA.setAttribute('download', 'owners.csv');
        document.body.appendChild(fauxLinkObjA);
        fauxLinkObjA.click();
        let errorStr = JSON.stringify(errors);
        const urlToGoER = window.URL.createObjectURL(new Blob([errorStr], { type: 'application/json' }));
        const fauxLinkObjER = this.document.createElement('a');
        fauxLinkObjER.href = urlToGoER;
        fauxLinkObjER.setAttribute('download', "errors.txt");
        document.body.appendChild(fauxLinkObjER);
        fauxLinkObjER.click();
        */
}
async function test() {
    let res = await fetchTry("/Streets.aspx")
    let xx = 5;
}

