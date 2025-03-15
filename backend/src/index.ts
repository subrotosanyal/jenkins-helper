import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// Updated /api/trigger endpoint to handle dynamic settings and parameters
app.post('/api/trigger', async (req, res) => {
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
    const response = await fetch(url, {
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
  } catch (error) {
    res.status(500).json({ error: (error as Error).toString() });
  }
});

// Endpoint to fetch queue item JSON given a queue URL
app.get('/api/queue', async (req, res) => {
  const { queueUrl, username, apiToken } = req.query;
  if (!queueUrl || !username || !apiToken) {
    return res.status(400).json({ error: 'Missing required query parameters' });
  }
  try {
    const url = `${queueUrl}/api/json`;
    const response = await fetch(url, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${username}:${apiToken}`).toString('base64')
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: (error as Error).toString() });
  }
});

// Endpoint to fetch job logs by job ID
app.get('/api/logs/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const { username, apiToken } = req.query;
  if (!username || !apiToken) {
    return res.status(400).json({ error: 'Missing credentials in query parameters' });
  }
  // Construct Jenkins job log URL (adjust if your job URL pattern differs)
  const logUrl = `https://jenkins.mycareimw.com/job/imw-client-setup/${jobId}/logText/progressiveText?start=0`;
  try {
    const response = await fetch(logUrl, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${username}:${apiToken}`).toString('base64')
      }
    });
    const logText = await response.text();
    res.send(logText);
  } catch (error) {
    res.status(500).json({ error: (error as Error).toString() });
  }
});

// Serve static files (React frontend build)
app.use(express.static(path.join(__dirname, '../static')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../static', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
