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

export default {
	async fetch(request: Request): Promise<Response> {
		const app = await appPromise;
		const url = new URL(request.url);
		const hasBody = request.method !== "GET" && request.method !== "HEAD";

		const res = await app.inject({
			method: request.method as "GET",
			url: url.pathname + url.search,
			headers: Object.fromEntries(request.headers),
			payload: hasBody ? Buffer.from(await request.arrayBuffer()) : undefined,
		});

		const headers = new Headers();
		for (const [key, value] of Object.entries(res.headers)) {
			if (value === undefined) {
				continue;
			}
			if (Array.isArray(value)) {
				for (const item of value) {
					headers.append(key, item);
				}
			} else {
				headers.set(key, String(value));
			}
		}

		return new Response(res.rawPayload, { status: res.statusCode, headers });
	},
};
