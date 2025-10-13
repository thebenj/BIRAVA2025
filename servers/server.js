'use strict';

const express = require('express');
const https = require('https');
const app = express();
const portNext = 3000;
//const request = require("request");
const axios = require("axios");
const cors = require('cors');
require('dotenv').config();
const accExt = {
    'css': 'text/css',
    'html': 'text/html',
    'js': 'text/js',
    'md': 'text/plain'
}
const excExt = ['ico']


app.use(cors({
    origin: "*"
}))

app.use(express.json()); // Add JSON parsing middleware

const fs = require('fs');
const path = require('path');

const agent = new https.Agent({
    rejectUnauthorized: false
});

// Create progress directory if it doesn't exist
const progressDir = path.join(__dirname, 'progress');
if (!fs.existsSync(progressDir)) {
    fs.mkdirSync(progressDir, { recursive: true });
}

// Route to serve CSV file for bloomerang.js - MUST be before /:dis catch-all route
app.get('/csv-file', (req, res) => {
    const filePath = path.join(__dirname, 'Results', 'All Data.csv');
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error sending CSV file:', err);
            res.status(404).json({ error: 'CSV file not found' });
        }
    });
});

// Route to serve VisionAppraisal JSON file for integration testing - MUST be before /:dis catch-all route
app.get('/visionappraisal-data', (req, res) => {
    const filePath = path.join(__dirname, 'Results', 'everyThingWithPid.json');
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error sending VisionAppraisal JSON file:', err);
            res.status(404).json({ error: 'VisionAppraisal JSON file not found' });
        }
    });
});

app.get('/:dis', (req, res) => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    let newEndpoint = process.env.API_BASE_URL + "/" + req.params.dis + "?";
    let qVals = Object.entries(req.query);
    let resEP = Object.entries(req.query).reduce((cum, ite, ine, ina) =>
        cum += ite[0] + "=" + ite[1] + (((ine < ina.length - 1) && (ina.length > 1)) ? "," : "")
        , newEndpoint)
    //    console.log("here!!" + resEP);
    let params = {};
    if (!!process.env.API_KEY_PARAM_NAME && !!process.env.API_KEY) {
        params[process.env.API_KEY_PARAM_NAME] = process.env.API_KEY;
    }
    axios({ method: 'get', url: resEP, params: params, headers: { 'content-type': 'text/html' }, httpsAgent: agent }).then(response => {
        //res.download("/ressie.html");
        res.send(response.data);
    }).catch(error => {
        res.json(error);
    })
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';

})

// API endpoint to save progress data
app.post('/api/save-progress', (req, res) => {
    try {
        const { filename, data } = req.body;
        if (!filename || data === undefined) {
            return res.status(400).json({ error: 'Missing filename or data' });
        }

        const filePath = path.join(progressDir, filename);

        // For CSV files, write raw string data; for others, use JSON format
        if (filename.endsWith('.csv')) {
            fs.writeFileSync(filePath, data);
        } else {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        }

        console.log(`Saved progress to ${filename}: ${Array.isArray(data) ? data.length + ' items' : 'data'}`);
        res.json({ success: true, message: 'Progress saved' });
    } catch (error) {
        console.error('Error saving progress:', error);
        res.status(500).json({ error: 'Failed to save progress' });
    }
});

// API endpoint to load progress data
app.get('/api/load-progress', (req, res) => {
    try {
        const { filename } = req.query;
        if (!filename) {
            return res.status(400).json({ error: 'Missing filename' });
        }

        const filePath = path.join(progressDir, filename);
        if (!fs.existsSync(filePath)) {
            return res.json(null); // File doesn't exist, return null
        }

        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log(`Loaded progress from ${filename}: ${Array.isArray(data) ? data.length + ' items' : 'data'}`);
        res.json(data);
    } catch (error) {
        console.error('Error loading progress:', error);
        res.status(500).json({ error: 'Failed to load progress' });
    }
});

app.listen(portNext, '127.0.0.99', function () {
    console.log(`Example app listening on port ${portNext}!`)
});




var http = require('http');
var port = process.env.PORT || 1337;

const hostname = '127.0.0.1';

const serverResponse = (req, res) => {
    if (req.url === "/") {
        require('fs').promises.readFile("./index.html", (err, data) => {
            if (err) console.log('Could not read index.html file: ${err}')
        }).then(contents => {
            res.setHeader("Content-Type", "text/html");
            res.writeHead(200);
            res.end(contents);
        }).catch(err => {
            res.writeHead(500);
            res.end(err);
            return;
        });
    } else {
        let ext = req.url.slice(-3);
        ext = (ext[0] === '.') ? ext.slice(-2) : ext
        if (accExt.hasOwnProperty(ext)) {
            require('fs').promises.readFile("." + req.url, (err, data) => {
                if (err) console.log('Could not read index.html file: ${err}')
            }).then(contents => {
                res.setHeader("Content-Type", accExt[ext]);
                res.writeHead(200);
                res.end(contents);
            }).catch(err => {
                res.writeHead(500);
                res.end(err);
                return;
            });
        } else {
            if (excExt.indexOf(ext) > -1) {
                console.log(req.url)
            } else {
                console.log("Not addressed extension")
            }

        }
    };
}


http.createServer(serverResponse).listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});



