import React, { useState, useEffect, useRef } from 'react';
import {
  ChakraProvider,
  Box,
  Heading,
  Input,
  Button,
  FormControl,
  FormLabel,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  VStack,
  Spinner,
  useToast
} from '@chakra-ui/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { okaidia } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Define an interface for your parameter objects
interface JenkinsParam {
  key: string;
  defaultValue: string;
}

function App() {
  // Credentials
  const [username, setUsername] = useState(localStorage.getItem('jenkinsUsername') || '');
  const [apiToken, setApiToken] = useState(localStorage.getItem('jenkinsApiToken') || '');
  
  // Settings for Jenkins instance & job
  const [jenkinsUrl, setJenkinsUrl] = useState(localStorage.getItem('jenkinsUrl') || 'jenkins.mycareimw.com');
  const [jenkinsJobName, setJenkinsJobName] = useState(localStorage.getItem('jenkinsJobName') || 'imw-client-setup');
  
  // Dynamic parameters configuration (default parameters)
  const defaultParams: JenkinsParam[] = [
    { key: 'CLIENT_NAME', defaultValue: '' },
    { key: 'BRANCH_NAME', defaultValue: 'origin/IMW-uat-changes' }
  ];
  const storedParams = localStorage.getItem('jenkinsParams');
  const [jenkinsParams, setJenkinsParams] = useState<JenkinsParam[]>(
    storedParams ? JSON.parse(storedParams) : defaultParams
  );
  
  // Trigger form input values (object mapping parameter key to user-entered value)
  const [triggerParams, setTriggerParams] = useState<{ [key: string]: string }>(() => {
    const init: { [key: string]: string } = {};
    jenkinsParams.forEach((p: JenkinsParam) => { init[p.key] = p.defaultValue; });
    return init;
  });
  
  // Job queue & log info
  const [queueUrl, setQueueUrl] = useState('');
  const [jobId, setJobId] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [logs, setLogs] = useState('');
  
  // Loading flag for waiting on job start
  const [isQueueLoading, setIsQueueLoading] = useState(false);
  
  const toast = useToast();
  const logIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const queuePollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Persist settings/credentials in localStorage
  useEffect(() => {
    localStorage.setItem('jenkinsUsername', username);
  }, [username]);
  useEffect(() => {
    localStorage.setItem('jenkinsApiToken', apiToken);
  }, [apiToken]);
  useEffect(() => {
    localStorage.setItem('jenkinsUrl', jenkinsUrl);
  }, [jenkinsUrl]);
  useEffect(() => {
    localStorage.setItem('jenkinsJobName', jenkinsJobName);
  }, [jenkinsJobName]);
  useEffect(() => {
    localStorage.setItem('jenkinsParams', JSON.stringify(jenkinsParams));
  }, [jenkinsParams]);
  
  // If jenkinsParams change, update triggerParams to ensure every key is present
  useEffect(() => {
    const newTriggerParams = { ...triggerParams };
    jenkinsParams.forEach((param: JenkinsParam) => {
      if (!(param.key in newTriggerParams)) {
        newTriggerParams[param.key] = param.defaultValue;
      }
    });
    setTriggerParams(newTriggerParams);
  }, [jenkinsParams]);
  
  // Poll the Jenkins queue API until the job starts (executable is available)
  const pollQueue = async (queueUrl: string) => {
    try {
      const res = await fetch(
        `/api/queue?queueUrl=${encodeURIComponent(queueUrl)}&username=${encodeURIComponent(username)}&apiToken=${encodeURIComponent(apiToken)}`
      );
      const data = await res.json();
      if (data.executable) {
        const job = data.executable;
        setJobId(job.number);
        setJobUrl(job.url);
        setIsQueueLoading(false);
        toast({
          title: "Job Started",
          description: `Job ID: ${job.number}`,
          status: "success",
          duration: 3000
        });
        if (queuePollIntervalRef.current) {
          clearInterval(queuePollIntervalRef.current);
        }
        pollLogs(job.number);
      }
    } catch (error: any) {
      console.error("Error polling queue:", error);
    }
  };
  
  // Trigger the Jenkins job using the settings and parameters
  const handleTrigger = async () => {
    // Check required parameters (if default is empty, user must enter a value)
    for (const param of jenkinsParams) {
      if (param.defaultValue === '' && (!triggerParams[param.key] || triggerParams[param.key].trim() === '')) {
        toast({
          title: "Missing parameter",
          description: `Please provide a value for ${param.key}`,
          status: "warning",
          duration: 3000
        });
        return;
      }
    }
    if (!username || !apiToken || !jenkinsUrl || !jenkinsJobName) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required settings.",
        status: "warning",
        duration: 3000
      });
      return;
    }
    setJobId('');
    setJobUrl('');
    setIsQueueLoading(true);
    try {
      const response = await fetch('/api/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          parameters: triggerParams, 
          jenkinsUrl, 
          jenkinsJobName, 
          username, 
          apiToken 
        })
      });
      const data = await response.json();
      if (data.error) {
        toast({ title: "Error", description: data.error, status: "error", duration: 3000 });
        setIsQueueLoading(false);
      } else {
        setQueueUrl(data.queueUrl);
        toast({
          title: "Job Queued",
          description: `Queue URL: ${data.queueUrl}`,
          status: "success",
          duration: 3000
        });
        // Poll the queue every 3 seconds to check for job start
        queuePollIntervalRef.current = setInterval(() => {
          pollQueue(data.queueUrl);
        }, 3000);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.toString(), status: "error", duration: 3000 });
      setIsQueueLoading(false);
    }
  };
  
  // Poll logs every 5 seconds
  const pollLogs = async (jobId: number) => {
    const fetchLogs = async () => {
      try {
        const res = await fetch(
          `/api/logs/${jobId}?username=${encodeURIComponent(username)}&apiToken=${encodeURIComponent(apiToken)}`
        );
        const logText = await res.text();
        setLogs(logText);
      } catch (error: any) {
        console.error("Error fetching logs:", error);
      }
    };
    await fetchLogs();
    logIntervalRef.current = setInterval(fetchLogs, 5000);
  };
  
  // Cleanup intervals on component unmount
  useEffect(() => {
    return () => {
      if (logIntervalRef.current) clearInterval(logIntervalRef.current);
      if (queuePollIntervalRef.current) clearInterval(queuePollIntervalRef.current);
    };
  }, []);
  
  // Handle input changes in the trigger tab for dynamic parameters
  const handleParamChange = (key: string, value: string) => {
    setTriggerParams(prev => ({ ...prev, [key]: value }));
  };
  
  // Settings: add a new parameter definition
  const addParameter = () => {
    const newKey = prompt("Enter parameter key:");
    if (newKey) {
      setJenkinsParams([...jenkinsParams, { key: newKey, defaultValue: '' }]);
    }
  };
  
  // Settings: remove a parameter definition
  const removeParameter = (key: string) => {
    setJenkinsParams(jenkinsParams.filter(p => p.key !== key));
    setTriggerParams(prev => {
      const newParams = { ...prev };
      delete newParams[key];
      return newParams;
    });
  };
  
  // Save settings (persisted automatically; this just shows a toast)
  const handleSaveSettings = () => {
    toast({ title: "Settings Saved", status: "success", duration: 2000 });
  };
  
  // Manually fetch logs (if needed in the View Job Logs tab)
  const handleFetchLogs = async () => {
    if (!jobId || !username || !apiToken) {
      toast({
        title: "Missing fields",
        description: "Please provide Job ID, username, and API token.",
        status: "warning",
        duration: 3000
      });
      return;
    }
    try {
      const response = await fetch(
        `/api/logs/${jobId}?username=${encodeURIComponent(username)}&apiToken=${encodeURIComponent(apiToken)}`
      );
      const logText = await response.text();
      setLogs(logText);
    } catch (error: any) {
      toast({ title: "Error", description: error.toString(), status: "error", duration: 3000 });
    }
  };
  
  return (
    <ChakraProvider>
      <Box p={4}>
        <Heading mb={4}>Build Helper</Heading>
        <Tabs variant="enclosed">
          <TabList>
            <Tab>Trigger Job</Tab>
            <Tab>View Job Logs</Tab>
            <Tab>Settings</Tab>
          </TabList>
          <TabPanels>
            {/* Trigger Job Tab */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                {jenkinsParams.map((param: JenkinsParam) => (
                  <FormControl id={param.key} key={param.key} isRequired={param.defaultValue === ''}>
                    <FormLabel>{param.key}</FormLabel>
                    <Input
                      value={triggerParams[param.key] || ''}
                      onChange={(e) => handleParamChange(param.key, e.target.value)}
                      placeholder={param.defaultValue || `Enter ${param.key}`}
                    />
                  </FormControl>
                ))}
                <Button colorScheme="blue" onClick={handleTrigger}>Trigger Job</Button>
                {queueUrl && (
                  <Box>
                    <strong>Queue URL:</strong> {queueUrl}
                  </Box>
                )}
                {isQueueLoading && (
                  <Box display="flex" alignItems="center">
                    <Spinner mr={2} />
                    <span>Fetching job details...</span>
                  </Box>
                )}
                {jobId && (
                  <Box>
                    <strong>Job ID:</strong> {jobId}
                  </Box>
                )}
              </VStack>
            </TabPanel>
            {/* View Job Logs Tab */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <FormControl id="jobId" isRequired>
                  <FormLabel>Job ID</FormLabel>
                  <Input
                    value={jobId}
                    onChange={(e) => setJobId(e.target.value)}
                    placeholder="Enter job ID"
                  />
                </FormControl>
                <Button colorScheme="blue" onClick={handleFetchLogs}>Fetch Logs</Button>
                <FormLabel>Logs</FormLabel>
                <Box maxH="300px" overflow="auto" border="1px" borderColor="gray.200" p={2}>
                  <SyntaxHighlighter language="text" style={okaidia}>
                    {logs}
                  </SyntaxHighlighter>
                </Box>
              </VStack>
            </TabPanel>
            {/* Settings Tab */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <FormControl id="jenkinsUrl" isRequired>
                  <FormLabel>Jenkins URL</FormLabel>
                  <Input
                    value={jenkinsUrl}
                    onChange={(e) => setJenkinsUrl(e.target.value)}
                    placeholder="jenkins.mycareimw.com"
                  />
                </FormControl>
                <FormControl id="jenkinsJobName" isRequired>
                  <FormLabel>Jenkins Job Name</FormLabel>
                  <Input
                    value={jenkinsJobName}
                    onChange={(e) => setJenkinsJobName(e.target.value)}
                    placeholder="imw-client-setup"
                  />
                </FormControl>
                <Heading size="md">Parameters</Heading>
                {jenkinsParams.map((param: JenkinsParam, index) => (
                  <Box key={index} display="flex" alignItems="center">
                    <FormControl id={`param-key-${index}`} mr={2}>
                      <FormLabel>Key</FormLabel>
                      <Input
                        value={param.key}
                        onChange={(e) => {
                          const newParams = [...jenkinsParams];
                          newParams[index].key = e.target.value;
                          setJenkinsParams(newParams);
                        }}
                      />
                    </FormControl>
                    <FormControl id={`param-default-${index}`} mr={2}>
                      <FormLabel>Default Value</FormLabel>
                      <Input
                        value={param.defaultValue}
                        onChange={(e) => {
                          const newParams = [...jenkinsParams];
                          newParams[index].defaultValue = e.target.value;
                          setJenkinsParams(newParams);
                        }}
                      />
                    </FormControl>
                    <Button colorScheme="red" onClick={() => removeParameter(param.key)}>Remove</Button>
                  </Box>
                ))}
                <Button colorScheme="blue" onClick={addParameter}>Add Parameter</Button>
                <Heading size="md">Credentials</Heading>
                <FormControl id="username" isRequired>
                  <FormLabel>Jenkins Username</FormLabel>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter Jenkins username"
                  />
                </FormControl>
                <FormControl id="apiToken" isRequired>
                  <FormLabel>API Token / Password</FormLabel>
                  <Input
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    placeholder="Enter API token or password"
                  />
                </FormControl>
                <Button colorScheme="blue" onClick={handleSaveSettings}>Save Settings</Button>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </ChakraProvider>
  );
}

export default App;
