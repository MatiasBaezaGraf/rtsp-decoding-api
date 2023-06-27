const express = require("express");
const app = express();
const cors = require("cors");

app.use(cors());
app.use(express.json());

const {
	startProcess,
	stopProcess,
	stopAll,
	verifyProcess,
} = require("./middlewares/handleProcesses");

// Start the streaming conversion and publishing process
app.post("/startProcess", startProcess);

// Stop the streaming conversion and publishing process
app.post("/stopProcess", stopProcess);

// Kill every process running on the server. This is called if the front app is not correctly closed
app.post("/stopAll", stopAll);

// Check if a process with the given ID is running
app.post("/process", verifyProcess);

app.get("/status", (req, res) => {
	res.status(200).send("Server is running");
});

app.listen(3000, () => {
	console.log("Server running on port 3000!");
});
