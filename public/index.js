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

// Check URL params for tokens (one-time save)
const params = new URLSearchParams(location.search);
if (params.get('auth_token')) {
	localStorage.setItem('tw_auth', params.get('auth_token'));
	localStorage.setItem('tw_ct0', params.get('ct0') || '');
}

const hardcoded_auth = "627b310f25b01fef273fe12963c2c73a805d6ce0";
const hardcoded_ct0 = "33d2d6a03a4d25786d15841355e8d12e26a64a30938c0634682d6f2fa7a36ca12be7106f05ccb58abf26df5d7e49a85570e2aaf2ae9dca30a0001186241294a3d5b7a88cfff2482cf2bbbdb28023f667";

function hasTokens() {
	return true;
}

function showTokenForm() {
	// Not needed anymore
}

function saveTokens() {
	// Not needed anymore
}

async function initProxy() {
	try {
		await registerSW();
	} catch (err) {
		document.querySelector('.spinner').style.display = 'none';
		error.innerHTML = `
			<strong>Failed to register service worker.</strong><br><br>
			If you're using an in-app browser (like Telegram or Instagram), this won't work.<br>
			Please tap the compass icon to open this link directly in <strong>Safari</strong>.<br><br>
			<small>${err.toString()}</small>
		`;
		throw err;
	}

	const url = "https://x.com/";

	let wispUrl =
		(location.protocol === "https:" ? "wss" : "ws") +
		"://" +
		location.host +
		"/wisp/";
	if ((await connection.getTransport()) !== "/libcurl/index.mjs") {
		await connection.setTransport("/libcurl/index.mjs", [{ wisp: wispUrl }]);
	}
	const frame = scramjet.createFrame();
	frame.frame.id = "sj-frame";
	document.body.appendChild(frame.frame);

	const authToken = hardcoded_auth;
	const ct0 = hardcoded_ct0;

	// First load: let Scramjet initialize with x.com, then inject cookies and reload
	frame.frame.addEventListener('load', function onFirstLoad() {
		frame.frame.removeEventListener('load', onFirstLoad);
		try {
			const win = frame.frame.contentWindow;
			const script = win.document.createElement('script');
			script.textContent = `
				document.cookie = "auth_token=${authToken}";
				if ("${ct0}") document.cookie = "ct0=${ct0}";
			`;
			win.document.body.appendChild(script);
		} catch (e) {
			console.warn('Cookie injection failed:', e);
		}
		// Reload to pick up the injected cookies
		setTimeout(() => {
			frame.go(url);
			// Now show the frame on second load
			frame.frame.addEventListener('load', function onSecondLoad() {
				frame.frame.removeEventListener('load', onSecondLoad);
				document.getElementById("loading").style.display = "none";
				frame.frame.style.display = "block";
			});
		}, 500);
	});
	frame.go(url);
}

// Auto-start on load
document.addEventListener("DOMContentLoaded", () => {
	// Wait a tiny bit for the service worker to install/activate from scramjet.init()
	setTimeout(initProxy, 1500);
});
