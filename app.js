const express = require("express");
const app = express();
const { spawn } = require("child_process");
const cors = require("cors");

app.use(cors());
app.use(express.json());

let processCounter = 0; // Counter for assigning unique IDs to processes
const activeProcesses = {}; // Object to store active processes

// Extract the ports from the active processes
const checkProcesses = () => {
	const searchString = "wsPort:";
	const desiredLength = 5;

	const processes = JSON.stringify(activeProcesses);

	let startIndex = 0;
	let extractedStrings = [];

	while (startIndex !== -1) {
		startIndex = processes.indexOf(searchString, startIndex);

		if (startIndex !== -1) {
			const endIndex = startIndex + searchString.length + desiredLength;
			const extractedString = processes.substring(
				startIndex + searchString.length + 1,
				endIndex
			);
			extractedStrings.push(extractedString);
			startIndex = endIndex;
		}
	}

	return extractedStrings;
};

// Function to get the lowest available process ID
const getLowestAvailableProcessId = () => {
	const usedProcessIds = Object.keys(activeProcesses).map(Number);
	let processId = 1;

	while (usedProcessIds.includes(processId)) {
		processId++;
	}

	return processId;
};

// Start the streaming conversion and publishing process
app.post("/startProcess", (req, res) => {
	const rtspStream = req.body.stream;
	const port = req.body.port;

	// Check if the stream is provided
	if (rtspStream == "") {
		response = "No stream provided";
		console.log(response);
		res.status(400).send(response);
		return;
	}

	// Check if the port is provided
	if (port == "") {
		response = "No port provided";
		console.log(response);
		res.status(400).send(response);
		return;
	}

	// Get the ports from the active processes
	const usedPorts = checkProcesses();

	//Check if the port is already in use
	if (usedPorts.includes(port.toString())) {
		response = `Port ${port} is already in use`;
		console.log(response);
		res.status(400).send(response);
		return;
	}

	const allowedPorts = ["3333", "3335", "3337"];

	if (!allowedPorts.includes(port)) {
		response = `Port ${port} is not allowed. Only ports between 3333, 3335 and 3337 are allowed`;
		console.log(response);
		res.status(401).send(response);
		return;
	}

	const processId = getLowestAvailableProcessId(); // Generate unique process ID

	// Spawn a new process
	const childProcess = spawn("node", [
		"-e",
		`
    const Stream = require("node-rtsp-stream-jsmpeg");
    const options = {
      name: "${processId}",
      url: "${rtspStream}",
      wsPort: ${port},
    };
    let stream = new Stream(options);
    stream.start();
  `,
	]);

	// Store the child process in the activeProcesses object
	activeProcesses[processId] = childProcess;

	// Handle process events
	childProcess.stdout.on("data", (data) => {
		console.log(`Process ${processId} output: ${data}`);
	});

	childProcess.stderr.on("data", (data) => {
		console.error(`Process ${processId} output (err): ${data}`);
	});

	childProcess.on("close", (code) => {
		console.log(`Process ${processId} exited with code ${code}`);
		// Remove the process from the activeProcesses object
		delete activeProcesses[processId];
	});

	res.status(200).send({
		processId: processId,
		port: port,
	});
});

app.post("/stopProcess", (req, res) => {
	const processId = req.body.processId;

	if (!processId) {
		res.status(400).send("No process ID provided");
		return;
	}

	const childProcess = activeProcesses[processId];

	if (childProcess) {
		// Send the SIGTERM signal to the child process
		//process.kill(childProcess.pid, "SIGTERM");
		childProcess.kill("SIGTERM");
		res.status(200).send(`Process ${processId} stopped`);
	} else {
		res.status(404).send(`Process ${processId} not found`);
	}
});

app.get("/status", (req, res) => {
	res.status(200).send("Server is running");
});

app.listen(3000, function () {
	console.log("Server running on port 3000!");
});
