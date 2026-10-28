import type { IncomingMessage, ServerResponse } from "node:http";

import type { FastifyInstance } from "fastify";

// Vercel function entry. Every request is routed here (see vercel.json); the Fastify app is
// built once per warm instance and reused, so cold starts pay the boot cost only once.
let appPromise: Promise<FastifyInstance> | undefined;

const getApp = (): Promise<FastifyInstance> => {
	appPromise ??= import("../src/app/main.js").then(async ({ createApp }) => {
		const app = await createApp();
		await app.ready();
		return app;
	});
	return appPromise;
};

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
	try {
		const app = await getApp();
		app.server.emit("request", req, res);
	} catch (thrown: unknown) {
		appPromise = undefined; // let the next request retry instead of caching the failure
		const message = thrown instanceof Error ? thrown.message : String(thrown);

		// biome-ignore lint/suspicious/noConsole: startup failure must reach Vercel's function logs
		console.error("[startup failed]", message);

		res.statusCode = 500;
		res.setHeader("content-type", "application/json; charset=utf-8");
		res.end(JSON.stringify({ success: false, message: "Server failed to start" }));
	}
}
