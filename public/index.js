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

function hasTokens() {
	return !!window.TWITTER_AUTH || !!localStorage.getItem('tw_auth');
}

function showTokenForm() {
	document.querySelector('.spinner').style.display = 'none';
	document.getElementById('loading-text').textContent = 'Paste your Twitter cookies to get started';
	document.getElementById('loading-sub').textContent = 'DevTools → Application → Cookies → x.com';
	document.getElementById('token-form').style.display = 'block';
}

function saveTokens() {
	const auth = document.getElementById('input-auth').value.trim();
	const ct0 = document.getElementById('input-ct0').value.trim();
	if (!auth) return;
	localStorage.setItem('tw_auth', auth);
	localStorage.setItem('tw_ct0', ct0);
	document.getElementById('token-form').style.display = 'none';
	document.querySelector('.spinner').style.display = 'block';
	document.getElementById('loading-text').textContent = 'Heating up the oven...';
	document.getElementById('loading-sub').textContent = '(Render free tier cold-start may take up to 30s)';
	initProxy();
}

// Make saveTokens available to onclick
window.saveTokens = saveTokens;

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

	const url = "https://x.com";

	let wispUrl =
		(location.protocol === "https:" ? "wss" : "ws") +
		"://" +
		location.host +
		"/wisp/";
	if ((await connection.getTransport()) !== "/epoxy/index.mjs") {
		await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
	}
	const frame = scramjet.createFrame();
	frame.frame.id = "sj-frame";
	document.body.appendChild(frame.frame);

	const authToken = window.TWITTER_AUTH || localStorage.getItem('tw_auth');
	const ct0 = window.TWITTER_CT0 || localStorage.getItem('tw_ct0');

	if (authToken) {
		// First load: let Scramjet initialize with x.com, then inject cookies and reload
		frame.frame.addEventListener('load', function onFirstLoad() {
			frame.frame.removeEventListener('load', onFirstLoad);
			try {
				const win = frame.frame.contentWindow;
				win.eval('document.cookie = "auth_token=' + authToken + '; path=/; domain=.x.com; max-age=31536000";');
				if (ct0) {
					win.eval('document.cookie = "ct0=' + ct0 + '; path=/; domain=.x.com; max-age=31536000";');
				}
			} catch (e) {
				console.warn('Cookie injection via eval failed:', e);
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
	} else {
		// No tokens - show frame immediately (login page)
		setTimeout(() => {
			document.getElementById("loading").style.display = "none";
			frame.frame.style.display = "block";
		}, 1500);
		frame.go(url);
	}
}

// Auto-start on load
document.addEventListener("DOMContentLoaded", () => {
	if (hasTokens()) {
		initProxy();
	} else {
		showTokenForm();
	}
});
