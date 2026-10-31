import type { IncomingMessage, ServerResponse } from "node:http";
import Fastify, { type FastifyInstance } from "fastify";
import { createApp } from "./app/main.js";

const buildApp = async (): Promise<FastifyInstance> => {
	try {
		const app = await createApp();
		await app.ready();
		return app;
	} catch (thrown: unknown) {
		const message = thrown instanceof Error ? thrown.message : String(thrown);

		const errorApp = Fastify();
		errorApp.all("*", async (_request, reply) =>
			reply.code(500).send({
				success: false,
				message: "Server failed to start",
				...(process.env.NODE_ENV === "production" ? {} : { error: message }),
			}),
		);
		await errorApp.ready();
		return errorApp;
	}
};

const appPromise = buildApp();

// Plain Node handler: hands the request straight to Fastify's http server, so
// `app.inject()` (and its light-my-request dependency) is never loaded at runtime.
export default async function handler(request: IncomingMessage, response: ServerResponse) {
	const app = await appPromise;
	app.server.emit("request", request, response);
}
