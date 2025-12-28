//lifted from MailChimpRe on 2/23/23

var serializingTag = "!^!Serialized!^!"

function preSerializeInstantiate(pInstan, dontKeepFunctions) {
    let serializeInstantiate = (pInstance, pSimple = true) => {
        let aSimple = pSimple;
        let typer = typeof pInstance
        switch (typer) {
            case 'undefined':
                return [false, [serializingTag + "undefined", "undefined"]];
            case 'object':
                if (Array.isArray(pInstance)) {
                    let obj = serializeInstantiate({ ...pInstance }, aSimple)
                    return [(obj[0] && aSimple), Object.entries(obj[1]).map(ite => ite[1])]
                } else {
                    if (pInstance instanceof Map) {
                        return [false, [serializingTag + "Map", Array.from(pInstance.entries())]];
                    } else {
                        if (pInstance instanceof Set) {
                            return [false, [serializingTag + "Set", [...pInstance]]];
                        } else {
                            if (pInstance === null) {
                                return [false, [serializingTag + "null", "null"]]
                            } else {
                                let retVal = {}
                                let target = retVal;
                                let caser = ((Object.getPrototypeOf(pInstance).hasOwnProperty("constructor")
                                    && (Object.getPrototypeOf(pInstance).constructor.name !== "Object")))
                                if (caser) {
                                    retVal = {
                                        "constructorFunction": Object.getPrototypeOf(pInstance).constructor.name
                                        , "properties": {}
                                    }
                                    target = retVal.properties
                                }
                                for (let prop in pInstance) {
                                    let ran = serializeInstantiate(pInstance[prop], aSimple)
                                    aSimple = aSimple && ran[0]
                                    target[prop] = ran[1]
                                }
                                return [(aSimple && (!caser)), retVal]
                            }
                        }
                    }
                }
            case 'bigint':
                return [false, [serializingTag + "BigInt", pInstance.toString()]];
            case 'symbol':
                return [false, [serializingTag + "Symbol", Object.prototype.toString.call(pInstance)]];
            case 'function':
                return (dontKeepFunctions) ?
                    [true, null]
                    : [false, [serializingTag + "Function", pInstance.toString()]];
            default:
                return [(true && aSimple), pInstance];
        }
    }
    let res = serializeInstantiate(pInstan)
    return ((res[0]) ? null : res[1])
}





function oneToOne(pArgs) {
    let bad = ((typeof pArgs === "undefined") || (pArgs === null) || (typeof pArgs !== 'object'))
    if (!bad && (Array.isArray(pArgs) && (!Array.isArray(pArgs[0])))) {
        //is empty, default, not empty and arg first index, otherwise value
        this.firstArrayLabel = ((pArgs.length === 0) ? "" : pArgs[0]);
        //undefined or not an array, blank otherwise first index
        this.secondArrayLabel = ((pArgs.length < 2) ? "" : pArgs[1]);
        //undefined and not arrray or defined and array, but to short, or is an array but array is not array empty
        this.firstArray = (((pArgs.length < 3) || (!Array.isArray(pArgs[2]))) ? [] : pArgs[2]);
        this.secondArray = (((pArgs.length < 4) || (!Array.isArray(pArgs[3]))) ? [] : pArgs[3]);
        this._length = this.firstArray.length
        this.zippedPairFtoS = []
        this.zippedPairStoF = []
    } else {
        if (!bad && (typeof pArgs === 'object')) {
            this.firstArrayLabel = (((typeof pArgs.firstArrayLabel !== 'undefined') && (pArgs.firstArrayLabel !== null)) ? pArgs.firstArrayLabel : "")
            this.secondArrayLabel = (((typeof pArgs.secondArrayLabel !== 'undefined') && (pArgs.secondArrayLabel !== null)) ? pArgs.secondArrayLabel : "")
            this.firstArray = (((typeof pArgs.firstArray !== 'undefined') &&
                (pArgs.firstArray !== null) && (Array.isArray(pArgs.firstArray))) ? pArgs.firstArray : [])
            this.secondArray = (((typeof pArgs.secondArray !== 'undefined') &&
                (pArgs.secondArray !== null) && (Array.isArray(pArgs.secondArray))) ? pArgs.secondArray : [])
            this._length = this.firstArray.length
            this.zippedPairFtoS = (((typeof pArgs.zippedPairFtoS !== 'undefined') &&
                (pArgs.zippedPairFtoS !== null) && (Array.isArray(pArgs.zippedPairFtoS))) ? pArgs.zippedPairFtoS : [])
            this.zippedPairStoF = (((typeof pArgs.zippedPairStoF !== 'undefined') &&
                (pArgs.zippedPairStoF !== null) && (Array.isArray(pArgs.zippedPairStoF))) ? pArgs.zippedPairStoF : [])
        } else {
            //is empty, default, not empty and arg first index, otherwise value
            this.firstArrayLabel = "";
            //undefined or not an array, blank otherwise first index
            this.secondArrayLabel = ""
            //undefined and not arrray or defined and array, but to short, or is an array but array is not array empty
            this.firstArray = []
            this.secondArray = []
            this._length = 0
            this.zippedPairFtoS = []
            this.zippedPairStoF = []
        }
    }
}
oneToOne.prototype.constructor = oneToOne
oneToOne.prototype.getLength = function () { return this._length }
oneToOne.prototype.addPair = function (pA, pB) {
    if ((typeof pB === 'undefined') && (Array.isArray(pA))) {
        this.firstArray.push(pA[0]);
        this.secondArray.push(pA[1])
    } else {
        this.firstArray.push(pA); this.secondArray.push(pB)
    }
    this._length = this.firstArray.length
    return Number(this._length - 1)
}
//rewrite
oneToOne.prototype.addPairDesignated = function (pA, pB) {
    if ((Array.isArray(pA)) && (Array.isArray(pB))) {
        if ((((typeof pA[0] === "number") && (pA[0] === 0)) && ((typeof pB[0] === "number") && (pB[0] === 1))) ||
            ((pA[0] === this.firstArrayLabel) && (pB[0] === this.secondArrayLabel))) {
            this._length = this.firstArray.length
            return this.addPair([pA[1], pB[1]])
        }
        if ((((typeof pA[0] === "number") && (pA[0] === 1)) && ((typeof pB[0] === "number") && (pB[0] === 0))) ||
            ((pA[0] === this.secondArrayLabel) && (pB[0] === this.firstArrayLabel))) {
            this._length = this.firstArray.length
            return this.addPair([pB[1], pA[1]])
        }
    } else {
        return -1;
    }
}
oneToOne.prototype.getFirstArrayIndex = function (pV) {
    if ((this.firstArray.length === this.secondArray.length)
        && (this.firstArray.length == this._length)
        && (this.firstArray.length > 0)) {
        return this.firstArray.indexOf(pV);
    }
    return -1
}
oneToOne.prototype.getSecondArrayIndex = function (pV) {
    if ((this.firstArray.length === this.secondArray.length)
        && (this.secondArray.length == this._length)
        && (this.secondArray.length > 0)) {
        return this.secondArray.indexOf(pV);
    }
    return -1
}
oneToOne.prototype.getByFirstArray = function (pV) {
    let ind = this.getFirstArrayIndex(pV)
    return ((ind === -1) ? [] : [pV, this.secondArray[ind]])
}
oneToOne.prototype.getBySecondArray = function (pV) {
    let ind = this.getSecondArrayIndex(pV)
    return ((ind === -1) ? [] : [this.firstArray[ind], pV])
}
oneToOne.prototype.addOrUpdate = function (pA, pB) {
    let makeClonedRes = (pGet, pGive) => {
        let pR = placementResults.get(pGet.toString()).clone()
        //        let pR = placementResults.get(pGet).clone()
        pR["indices"] = ((pGive !== null) ? pGive : pGet)
        return pR;
    }
    let indA = this.getFirstArrayIndex(pA)
    let indB = this.getSecondArrayIndex(pB)
    if ((indA === -1) && (indB === -1)) {
        let rowTo = this.addPair(pA, pB)
        return makeClonedRes([indA, indB], [rowTo, rowTo])
    } else {
        if ((indA > -1) && (indB === -1)) {
            return makeClonedRes([-20, -10], null)
        } else {
            if ((indA === -1) && (indB > -1)) {
                return makeClonedRes([-10, -20], null)
            } else {
                if ((indA > -1) && (indB > -1) && (indA === indB)) {
                    return makeClonedRes([-2, -2], null)
                } else {
                    return makeClonedRes([-20, -30], null)
                }
            }
        }
    }
}
oneToOne.prototype.getAsDesignated = function (pInd, pVal) {
    if (((typeof pInd === "number") && (pInd = 0)) ||
        ((typeof pInd !== "number") && (pInd === this.firstArrayLabel))) {
        return this.getByFirstArray(pVal)
    }
    if (((typeof pInd === "number") && (pInd = 1)) ||
        ((typeof pInd !== "number") && (pInd === this.secondArrayLabel))) {
        return this.getBySecondArray(pVal)
    }
    return []
}
oneToOne.prototype.getZippedPairFtoS = function () {
    if (this.zippedPairFtoS.length === 0) {
        this.zippedPairFtoS = this.firstArray.map((ite, ine) => [ite, this.secondArray[ine]])
    }
    return this.zippedPairFtoS
}
oneToOne.prototype.getZippedPairStoF = function () {
    if (this.zippedPairStoF.length === 0) {
        this.zippedPairStoF = this.secondArray.map((ite, ine) => [ite, this.firstArray[ine]])
    }
    return this.zippedPairStoF
}
oneToOne.prototype.clean = function () {
    this.firstArray.forEach((itw, ifw) => {
        if (((itw === null) || (itw === "")) && ((this.secondArray[ifw] === null) || (this.secondArray[ifw] === ""))) {
            this.firstArray.splice(ifw, 1);
            this.secondArray.splice(ifw, 1);
        }
    })
}
