// Vercel entrypoint for Fastify. Zero-config detection needs src/index.ts to import
// `fastify` and default-export the instance. `app.listen()` is not used here.
// See: https://vercel.com/docs/frameworks/backend/fastify

import Fastify, { type FastifyInstance } from "fastify";

// Dynamic import with a RELATIVE path: the `@/*` alias is a tsconfig/bundler feature, and
// runtime `import()` specifiers aren't rewritten on Vercel. Wrapped in try/catch so a bad
// env var returns a JSON 500 instead of crashing the process (opaque
// FUNCTION_INVOCATION_FAILED).
const buildApp = async (): Promise<FastifyInstance> => {
	try {
		const { createApp } = await import("./app/main");
		const app = await createApp();
		// Boots every plugin now, so a plugin/registration error is caught below
		// instead of surfacing on the first request.
		await app.ready();
		return app;
	} catch (thrown: unknown) {
		const message = thrown instanceof Error ? thrown.message : String(thrown);

		// biome-ignore lint/suspicious/noConsole: startup failure must reach Vercel's function logs
		console.error("[startup failed]", message);

		const errorApp = Fastify();
		errorApp.all("*", async (_request, reply) =>
			reply
				.code(500)
				.send({ success: false, message: "Server failed to start", error: message }),
		);
		await errorApp.ready();
		return errorApp;
	}
};

const app = await buildApp();

export default app;
