// VisionAppraisal Data Source Plugin
// Implements standard data source interface for the plugin architecture

const VisionAppraisal = {
    // Data source metadata
    name: 'VisionAppraisal',
    fields: [
        'ownerName', 'ownerName2', 'ownerAddress', 'propertyLocation',
        'userCode', 'neighborhood', 'date', 'mblu', 'pid', 'googleFileId',
        // Expanded fields
        'map', 'block', 'lot', 'unit', 'unitCut',
        'street', 'city', 'state', 'zip',
        'processedOwnerName',
        // Legacy fields for reference
        '_legacyOwnerName', '_legacyOwnerName2', '_legacyAddress', '_legacyMBLU'
    ],
    matchingKeys: ['fireNumber'],

    // Load and parse VisionAppraisal data
    async loadData() {
        try {
            console.log("=== LOADING VISIONAPPRAISAL DATA ===");

            const response = await fetch('http://127.0.0.99:3000/visionappraisal-data');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const rawData = await response.text();
            const dataArray = JSON.parse(rawData);
            console.log(`Loaded ${dataArray.length} VisionAppraisal records`);

            // Parse and structure the data
            const structuredData = this.parseRecords(dataArray);
            console.log(`Processed ${structuredData.length} records:`);
            console.log(`- ${structuredData.filter(r => r.fireNumber).length} with valid Fire Numbers`);
            console.log(`- ${structuredData.filter(r => !r.fireNumber).length} without Fire Numbers`);

            return structuredData;

        } catch (error) {
            console.error("Error loading VisionAppraisal data:", error);
            throw error;
        }
    },

    // Parse raw records into structured format
    parseRecords(dataArray) {
        return dataArray.map((record, index) => {
            // Split CSV string into fields (like original working code)
            const fields = record.split(',');

            // Debug first few records
            if (index < 3) {
                console.log(`Raw record ${index}:`, record);
                console.log(`  Parsed fields length: ${fields.length}`);
                console.log(`  Corrected PID field[9]: "${fields[9]}", GoogleFileId field[10]: "${fields[10]}"`);
            }

            // Extract raw fields with correct mapping
            const ownerName = fields[0] || '';          // Field[0]: Owner Name (with tags)
            const ownerName2 = fields[1] || '';         // Field[1]: Owner Name 2 (with tags)
            const ownerAddress = fields[2] || '';       // Field[2]: Owner Address (with tags)
            const propertyLocation = fields[3] || '';   // Field[3]: Property Location
            const userCode = fields[5] || '';           // Field[5]: User Code (was incorrectly called PID)
            const neighborhood = fields[6] || '';       // Field[6]: Neighborhood (was incorrectly called userCode)
            const date = fields[7] || '';               // Field[7]: Date
            const mblu = fields[8] || '';               // Field[8]: MBLU (to be expanded)
            const pid = fields[9] || '';                // Field[9]: ACTUAL PID (was incorrectly mapped)
            const googleFileId = fields[10] || '';      // Field[10]: Google File ID (was incorrectly called PID)

            // Use parser functions to expand and clean data (access from window object)
            const mbluParsed = window.VisionAppraisalParser ? window.VisionAppraisalParser.parseMBLU(mblu) : {
                map: '', block: '', lot: '', unit: '', unitCut: '', _legacy: mblu
            };

            const addressParsed = window.VisionAppraisalParser ? window.VisionAppraisalParser.parseAddress(ownerAddress) : {
                street: '', city: '', state: '', zip: '', _legacy: ownerAddress
            };

            const namesParsed = window.VisionAppraisalParser ? window.VisionAppraisalParser.processOwnerNames(ownerName, ownerName2) : {
                name: ownerName, _legacy1: ownerName, _legacy2: ownerName2
            };

            // Extract Fire Number from property location
            const fireNumber = this.extractFireNumber(propertyLocation);

            return {
                sourceIndex: index,

                // Original fields (cleaned up)
                ownerName: ownerName.trim(),
                ownerName2: ownerName2.trim(),
                ownerAddress: ownerAddress.trim(),
                propertyLocation: propertyLocation.trim(),
                userCode: userCode.trim(),
                neighborhood: neighborhood.trim(),
                date: date.trim(),
                mblu: mblu.trim(),
                pid: pid.trim(),              // CORRECTED: Now using field[9]
                googleFileId: googleFileId.trim(),

                // Expanded MBLU fields
                map: mbluParsed.map,
                block: mbluParsed.block,
                lot: mbluParsed.lot,
                unit: mbluParsed.unit,
                unitCut: mbluParsed.unitCut,

                // Expanded address fields
                street: addressParsed.street,
                city: addressParsed.city,
                state: addressParsed.state,
                zip: addressParsed.zip,

                // Processed owner name
                processedOwnerName: namesParsed.name,

                // Legacy fields for reference
                _legacyOwnerName: ownerName,
                _legacyOwnerName2: ownerName2,
                _legacyAddress: ownerAddress,
                _legacyMBLU: mblu,

                // Derived fields
                fireNumber: fireNumber,
                hasFireNumber: !!fireNumber,
                source: 'VisionAppraisal'
            };
        });
    },

    // Extract Fire Number from property location string
    extractFireNumber(propertyLocation) {
        if (!propertyLocation || typeof propertyLocation !== 'string') {
            return null;
        }

        // Extract Fire Number from property location (numbers at start)
        const fireNumberMatch = propertyLocation.match(/^\s*(\d+)/);
        const fireNumber = fireNumberMatch ? parseInt(fireNumberMatch[1]) : null;

        // Only include valid fire numbers (4 digits or less, <3500 per CLAUDE.md)
        const isValidFireNumber = fireNumber && fireNumber < 3500;

        return isValidFireNumber ? fireNumber : null;
    },

    // Get records by Fire Number (for fast lookup)
    buildFireNumberIndex(data) {
        const index = {};
        data.forEach(record => {
            if (record.fireNumber) {
                if (!index[record.fireNumber]) {
                    index[record.fireNumber] = [];
                }
                index[record.fireNumber].push(record);
            }
        });
        return index;
    },

    // Analyze data for enrichment potential
    async analyzeForEnrichment() {
        const data = await this.loadData();

        const stats = {
            totalRecords: data.length,
            withFireNumbers: data.filter(r => r.fireNumber).length,
            withoutFireNumbers: data.filter(r => !r.fireNumber).length,
            uniqueFireNumbers: new Set(data.map(r => r.fireNumber).filter(Boolean)).size,
            ownerPatterns: this.analyzeOwnerPatterns(data)
        };

        console.log("VisionAppraisal Analysis:", stats);
        return { data, stats };
    },

    // Analyze owner name patterns
    analyzeOwnerPatterns(data) {
        const patterns = {
            individuals: 0,
            jointOwnership: 0,
            trusts: 0,
            llcs: 0,
            corporations: 0
        };

        data.forEach(record => {
            const name = record.ownerName.toUpperCase();
            if (name.includes('TRUST')) {
                patterns.trusts++;
            } else if (name.includes('LLC')) {
                patterns.llcs++;
            } else if (name.includes(' INC') || name.includes(' CORP')) {
                patterns.corporations++;
            } else if (name.includes(' & ') || name.includes(' AND ')) {
                patterns.jointOwnership++;
            } else {
                patterns.individuals++;
            }
        });

        return patterns;
    }
};

// Make available globally for testing
if (typeof window !== 'undefined') {
    window.VisionAppraisal = VisionAppraisal;
}