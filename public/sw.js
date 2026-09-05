importScripts("/scram/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

async function handleRequest(event) {
	await scramjet.loadConfig();
	if (scramjet.route(event)) {
		return scramjet.fetch(event);
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
