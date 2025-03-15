"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use(express_1.default.json());
app.use((0, cors_1.default)());
// Updated /api/trigger endpoint to handle dynamic settings and parameters
app.post('/api/trigger', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { parameters, jenkinsUrl, jenkinsJobName, username, apiToken } = req.body;
    if (!parameters || !jenkinsUrl || !jenkinsJobName || !username || !apiToken) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }
    // Construct the query string from the dynamic parameters
    const params = new URLSearchParams();
    for (const key in parameters) {
        params.append(key, parameters[key]);
    }
    // Build the URL using the provided settings
    const url = `https://${jenkinsUrl}/job/${jenkinsJobName}/buildWithParameters?${params.toString()}`;
    try {
        const response = yield (0, node_fetch_1.default)(url, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${username}:${apiToken}`).toString('base64')
            }
        });
        const location = response.headers.get('location');
        if (!location) {
            return res.status(500).json({ error: 'No location header found in Jenkins response' });
        }
        res.json({ queueUrl: location });
    }
    catch (error) {
        res.status(500).json({ error: error.toString() });
    }
}));
// Endpoint to fetch queue item JSON given a queue URL
app.get('/api/queue', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { queueUrl, username, apiToken } = req.query;
    if (!queueUrl || !username || !apiToken) {
        return res.status(400).json({ error: 'Missing required query parameters' });
    }
    try {
        const url = `${queueUrl}/api/json`;
        const response = yield (0, node_fetch_1.default)(url, {
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${username}:${apiToken}`).toString('base64')
            }
        });
        const data = yield response.json();
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.toString() });
    }
}));
// Endpoint to fetch job logs by job ID
app.get('/api/logs/:jobId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { jobId } = req.params;
    const { username, apiToken } = req.query;
    if (!username || !apiToken) {
        return res.status(400).json({ error: 'Missing credentials in query parameters' });
    }
    // Construct Jenkins job log URL (adjust if your job URL pattern differs)
    const logUrl = `https://jenkins.mycareimw.com/job/imw-client-setup/${jobId}/logText/progressiveText?start=0`;
    try {
        const response = yield (0, node_fetch_1.default)(logUrl, {
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${username}:${apiToken}`).toString('base64')
            }
        });
        const logText = yield response.text();
        res.send(logText);
    }
    catch (error) {
        res.status(500).json({ error: error.toString() });
    }
}));
// Serve static files (React frontend build)
app.use(express_1.default.static(path_1.default.join(__dirname, '../static')));
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../static', 'index.html'));
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
