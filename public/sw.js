importScripts('/uv/uv.bundle.js');
importScripts('/uv.config.js');
importScripts('/uv/uv.sw.js');

const uv = new UVServiceWorker();
uv.bareClient = new BareMux.BareClient();
self.addEventListener('install', event => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', event => {
    let url = event.request.url;

    // Twitter uses x-safari-https:// to break out of PWA/proxy contexts on iOS.
    // Rewrite to plain https and redirect so UV handles it normally.
    if (url.includes('x-safari-http')) {
        let newUrl = url.replace(/x-safari-https/g, 'https').replace(/x-safari-http(?!s)/g, 'http');
        event.respondWith(Response.redirect(newUrl, 302));
        return;
    }

    event.respondWith(
        (async () => {
            if (uv.route(event)) {
                let response = await uv.fetch(event);
                
                // The top-level window enforces COEP to unlock SharedArrayBuffer for video streaming.
                // We MUST inject COEP into the proxied iframe response, otherwise the browser blocks it.
                let headers = new Headers(response.headers);
                headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
                
                return new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: headers
                });
            }
            return await fetch(event.request);
        })()
    );
});
