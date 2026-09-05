import { createServer } from "node:http";
import { fileURLToPath } from "url";
import { dirname } from "node:path";
import { createRequire } from "node:module";
import { hostname } from "node:os";
import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCookie from "@fastify/cookie";

import { scramjetPath } from "@mercuryworkshop/scramjet/path";
const epoxyPath = fileURLToPath(new URL("../node_modules/@mercuryworkshop/epoxy-transport/dist/", import.meta.url));
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

const publicPath = fileURLToPath(new URL("../public/", import.meta.url));

// Wisp Configuration: Refer to the documentation at https://www.npmjs.com/package/@mercuryworkshop/wisp-js

logging.set_level(logging.NONE);
Object.assign(wisp.options, {
	allow_udp_streams: false,
	hostname_blacklist: [/example\.com/],
	dns_servers: ["1.1.1.3", "1.0.0.3"],
});

const fastify = Fastify({
	serverFactory: (handler) => {
		return createServer()
			.on("request", (req, res) => {
				res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
				res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
				handler(req, res);
			})
			.on("upgrade", (req, socket, head) => {
				if (req.url.endsWith("/wisp/")) wisp.routeRequest(req, socket, head);
				else socket.end();
			});
	},
});

fastify.register(fastifyCookie);

const GOON_KEY = process.env.GOON_KEY || "grandma123";
const TWITTER_AUTH = process.env.TWITTER_AUTH || "";
const TWITTER_CT0 = process.env.TWITTER_CT0 || "";

fastify.get('/config.js', (req, reply) => {
	reply.type('application/javascript').send(`
		window.TWITTER_AUTH = "${TWITTER_AUTH}";
		window.TWITTER_CT0 = "${TWITTER_CT0}";
	`);
});

fastify.addHook('onRequest', (req, reply, done) => {
	if (req.query && req.query.key === GOON_KEY) {
		reply.setCookie('goon_auth', GOON_KEY, { path: '/', maxAge: 2592000, httpOnly: true });
		reply.redirect('/');
		return;
	}
	
	if (req.cookies && req.cookies.goon_auth === GOON_KEY) {
		done();
	} else {
		reply.code(403).send(""); // Blank page for unauthorized
	}
});

fastify.register(fastifyStatic, {
	root: publicPath,
	decorateReply: true,
});

fastify.register(fastifyStatic, {
	root: scramjetPath,
	prefix: "/scram/",
	decorateReply: false,
});

fastify.register(fastifyStatic, {
	root: epoxyPath,
	prefix: "/epoxy/",
	decorateReply: false,
});

fastify.register(fastifyStatic, {
	root: baremuxPath,
	prefix: "/baremux/",
	decorateReply: false,
});

fastify.setNotFoundHandler((res, reply) => {
	return reply.code(404).type("text/html").sendFile("404.html");
});

fastify.server.on("listening", () => {
	const address = fastify.server.address();

	// by default we are listening on 0.0.0.0 (every interface)
	// we just need to list a few
	console.log("Listening on:");
	console.log(`\thttp://localhost:${address.port}`);
	console.log(`\thttp://${hostname()}:${address.port}`);
	console.log(
		`\thttp://${
			address.family === "IPv6" ? `[${address.address}]` : address.address
		}:${address.port}`
	);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
	console.log("SIGTERM signal received: closing HTTP server");
	fastify.close();
	process.exit(0);
}

let port = parseInt(process.env.PORT || "");

if (isNaN(port)) port = 8080;

fastify.listen({
	port: port,
	host: "0.0.0.0",
});
