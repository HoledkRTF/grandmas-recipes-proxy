"use strict";

const error = document.getElementById("sj-error");

const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

const hardcoded_auth = "627b310f25b01fef273fe12963c2c73a805d6ce0";
const hardcoded_ct0 = "33d2d6a03a4d25786d15841355e8d12e26a64a30938c0634682d6f2fa7a36ca12be7106f05ccb58abf26df5d7e49a85570e2aaf2ae9dca30a0001186241294a3d5b7a88cfff2482cf2bbbdb28023f667";

async function initProxy() {
	try {
		await navigator.serviceWorker.register('/sw.js', {
			scope: __uv$config.prefix
		});
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

	const iframe = document.createElement("iframe");
	iframe.id = "sj-frame";
	iframe.style.display = "none";
	document.body.appendChild(iframe);

	const authToken = hardcoded_auth;
	const ct0 = hardcoded_ct0;

	// Load proxy URL
	const proxyUrl = __uv$config.prefix + __uv$config.encodeUrl(url);

	iframe.addEventListener('load', function onFirstLoad() {
		iframe.removeEventListener('load', onFirstLoad);
		try {
			const win = iframe.contentWindow;
			const script = win.document.createElement('script');
			script.textContent = `
				document.cookie = "auth_token=${authToken}; path=/";
				if ("${ct0}") document.cookie = "ct0=${ct0}; path=/";
			`;
			win.document.body.appendChild(script);
		} catch (e) {
			console.warn('Cookie injection failed:', e);
		}
		
		// Reload to apply injected cookies
		setTimeout(() => {
			iframe.src = proxyUrl;
			iframe.addEventListener('load', function onSecondLoad() {
				iframe.removeEventListener('load', onSecondLoad);
				document.getElementById("loading").style.display = "none";
				iframe.style.display = "block";
			});
		}, 500);
	});

	iframe.src = proxyUrl;
}

// Auto-start on load
document.addEventListener("DOMContentLoaded", () => {
	setTimeout(initProxy, 100);
});
