const express = require("express");
const app = express();
const { spawn } = require("child_process");
const { v4: uuidv4 } = require("uuid");
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
		response = `El puerto ${port} esta en uso`;
		console.log(response);
		res.status(400).send(response);
		return;
	}

	const allowedPorts = ["3333", "3335", "3337"];

	if (!allowedPorts.includes(port)) {
		response = `El puerto ${port} no esta permitido. Los puertos 3333, 3335 y 3337 son los unicos permitidos`;
		console.log(response);
		res.status(401).send(response);
		return;
	}

	const processId = uuidv4();

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
		//console.error(`Process ${processId} output (err): ${data}`);

		if (
			data.includes("The name does not resolve for the supplied parameters")
		) {
			console.log("Terminating process");
			childProcess.kill("SIGTERM");
		} else if (data.includes("No such file or directory")) {
			console.log("Terminating process");
			childProcess.kill("SIGTERM");
		}
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

//Check if a process with the given ID is running
app.post("/process", (req, res) => {
	const processId = req.body.processId;

	if (activeProcesses[processId]) {
		res.status(200).send("Process is running");
	} else {
		res.status(404).send("Process not found. Closing connection");
	}
});

app.get("/status", (req, res) => {
	res.status(200).send("Server is running");
});

app.listen(3000, function () {
	console.log("Server running on port 3000!");
});
