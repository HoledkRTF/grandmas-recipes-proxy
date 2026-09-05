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
	
	// Show frame immediately, rely on internal loading state
	setTimeout(() => {
		document.getElementById("loading").style.display = "none";
		frame.frame.style.display = "block";
	}, 1500); // Give it a tiny bit of time to init
	
	frame.go(url);
}

// Auto-start on load
document.addEventListener("DOMContentLoaded", () => {
    initProxy();
});
