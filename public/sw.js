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
	if (url.includes('x-safari-https')) {
		let newUrl = url.replace('x-safari-https%3A', 'https%3A').replace('x-safari-https:', 'https:');
		const newReq = new Request(newUrl, {
			method: event.request.method,
			headers: event.request.headers,
			body: event.request.body,
			mode: event.request.mode,
			credentials: event.request.credentials,
			cache: event.request.cache,
			redirect: event.request.redirect,
			referrer: event.request.referrer,
			integrity: event.request.integrity
		});
		const proxyEvent = new Proxy(event, {
			get(target, prop) {
				if (prop === 'request') return newReq;
				if (typeof target[prop] === 'function') return target[prop].bind(target);
				return target[prop];
			}
		});
		event.respondWith(handleRequest(proxyEvent));
		return;
	}
	
	event.respondWith(handleRequest(event));
});
