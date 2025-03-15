# Jenkins Job Trigger

This is a Dockerized application with a Node.js/TypeScript backend and a React frontend (using Chakra UI) that allows you to trigger a Jenkins job with dynamic parameters, monitor its status, and view real-time logs with syntax highlighting.

## Features

- **Dynamic Jenkins Settings:** Configure the Jenkins URL, job name, and parameters.  
  _Defaults:_  
  - Jenkins URL: `jenkins.mycareimw.com`  
  - Job Name: `imw-client-setup`  
  - Parameters:  
    - `CLIENT_NAME` (required)  
    - `BRANCH_NAME` (default: `origin/IMW-uat-changes`)
- **Trigger Job:** Submit a job trigger request with custom parameters.
- **Real-Time Monitoring:** Polls the Jenkins queue until the job starts and displays the job ID.  
  Once started, logs are auto-refreshed every 5 seconds.
- **Syntax Highlighting:** Job logs are rendered with syntax highlighting using `react-syntax-highlighter`.
- **CORS Proxy:** The backend acts as a proxy to bypass CORS issues when communicating with Jenkins.

## Prerequisites

- Docker and Docker Compose

## Running the Application

1. **Build and start the application:**

   ```bash
   docker-compose up --build
2. **Access the application**

- Open your browser and navigate to http://localhost.

3. **Usage**

- Settings Tab:
Configure the Jenkins URL, job name, and parameters (with the ability to add or remove parameters). Also enter your Jenkins credentials (username and API token).
- Trigger Job Tab:
Fill in the parameter values and click "Trigger Job". A loading indicator will appear until the job ID is fetched and displayed.
- View Job Logs Tab:
Once the job is triggered, real-time logs will be displayed with syntax highlighting. Logs auto-refresh every 5 seconds.
