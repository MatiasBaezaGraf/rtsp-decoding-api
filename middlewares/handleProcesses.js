const { v4: uuidv4 } = require("uuid");
const { spawn } = require("child_process");

const activeProcesses = {}; // Object to store active processes
const pids = []; // Array to store the pids of the active processes

const startProcess = (req, res) => {
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
	// Store the pid in the pids array
	pids.push(childProcess.pid);

	// Handle process events
	childProcess.stdout.on("data", (data) => {
		//If the client disconnects without closing the process (closes browser), kill
		//it to avoid memory leaks and free the port for future use
		if (data.includes("Disconnected WebSocket (0 total)")) {
			console.log("Terminating process");
			childProcess.kill("SIGTERM");
		}

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
		// Remove the pid from the pids array
		pids.splice(pids.indexOf(childProcess.pid), 1);
	});

	res.status(200).send({
		processId: processId,
		port: port,
	});
};

const stopProcess = (req, res) => {
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
};

const stopAll = (req, res) => {
	console.log("Stopping all processes");

	pids.forEach((pid) => {
		console.log(`Killing process ${pid}`);
		process.kill(pid, "SIGTERM");
	});

	res.status(200).send("All processes stopped");
};

const verifyProcess = (req, res) => {
	console.log("Checking process");
	const processId = req.body.processId;

	console.log(processId);

	if (activeProcesses[processId]) {
		res.status(200).send("Process is running");
	} else {
		res.status(404).send(`Process ${processId} not found. Closing connection`);
	}
};

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

module.exports = { startProcess, stopProcess, stopAll, verifyProcess };
