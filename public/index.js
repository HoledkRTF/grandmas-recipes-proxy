"use strict";

const error = document.getElementById("sj-error");
const { ScramjetController } = $scramjetLoadController();

const scramjet = new ScramjetController({
	files: {
		wasm: "/scram/scramjet.wasm.wasm",
		all: "/scram/scramjet.all.js",
		sync: "/scram/scramjet.sync.js",
	},
});

scramjet.init();

const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

async function initProxy() {
	try {
		await registerSW();
	} catch (err) {
		error.textContent = "Failed to register service worker. " + err.toString();
		throw err;
	}

	const url = "https://x.com";

	let wispUrl =
		(location.protocol === "https:" ? "wss" : "ws") +
		"://" +
		location.host +
		"/wisp/";
	if ((await connection.getTransport()) !== "/libcurl/index.mjs") {
		await connection.setTransport("/libcurl/index.mjs", [
			{ websocket: wispUrl },
		]);
	}
	const frame = scramjet.createFrame();
	frame.frame.id = "sj-frame";
	document.body.appendChild(frame.frame);
	
	// Once the frame loads the target, show it and hide the loading screen
	frame.frame.onload = () => {
		document.getElementById("loading").style.display = "none";
		frame.frame.style.display = "block";
	};
	
	frame.go(url);
}

// Auto-start on load
document.addEventListener("DOMContentLoaded", () => {
    initProxy();
});
