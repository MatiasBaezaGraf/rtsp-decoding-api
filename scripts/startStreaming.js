const Stream = require("node-rtsp-stream-jsmpeg");

const options = {
	name: "streamName",
	url: "rtsp://zephyr.rtsp.stream/pattern?streamKey=ecfdd285f363bec34f3c1419b442ba6b",
	wsPort: 3333,
};

let stream = new Stream(options);
stream.start();
