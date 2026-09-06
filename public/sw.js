importScripts("/scram/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

async function handleRequest(event) {
	await scramjet.loadConfig();
	if (scramjet.route(event)) {
		let response = await scramjet.fetch(event);
		
		// Create new headers, stripping restrictive policies that break video blobs
		let headers = new Headers(response.headers);
		headers.delete('cross-origin-resource-policy');
		headers.delete('cross-origin-embedder-policy');
		headers.delete('cross-origin-opener-policy');
		headers.delete('x-frame-options');
		headers.delete('content-security-policy'); // Might also break blob streams

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: headers
		});
	}
	return fetch(event.request);
}

self.addEventListener('install', event => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
	let url = event.request.url;

	// Twitter uses x-safari-https:// to break out of PWA/proxy contexts on iOS.
	// Rewrite to plain https and redirect so Scramjet handles it normally.
	if (url.includes('x-safari-http')) {
		let newUrl = url.replace(/x-safari-https/g, 'https').replace(/x-safari-http(?!s)/g, 'http');
		event.respondWith(Response.redirect(newUrl, 302));
		return;
	}

	event.respondWith(handleRequest(event));
});
