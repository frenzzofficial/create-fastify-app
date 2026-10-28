import Fastify, { type FastifyInstance, LogController } from "fastify";
import { envAppConfig } from "../packages/env/app.env";
import bodyLimit from "../packages/middlewares/body-limit";
import compression from "../packages/middlewares/compression";
import cookie from "../packages/middlewares/cookie";
import cors from "../packages/middlewares/cors";
import csrfProtection from "../packages/middlewares/csrf";
import errorHandler from "../packages/middlewares/error-handler";
import helmetPlugin from "../packages/middlewares/helmet";
import notFound from "../packages/middlewares/not-found";
import rateLimiter from "../packages/middlewares/rate-limiter";
import requestLogging from "../packages/middlewares/request-logging";
import securityHeaders from "../packages/middlewares/security-headers";
import { registerBootstrap } from "./routes";

export const createApp = async (): Promise<FastifyInstance> => {
	const app = Fastify({
		logger: { level: envAppConfig.LOG_LEVEL },
		// Requests are logged by the request-logging plugin; skip Fastify's own two lines.
		// (`logController` replaces the deprecated `disableRequestLogging`; needs fastify >= 5.12.)
		logController: new LogController({ disableRequestLogging: true }),
		// Parser-level limit — the real backstop behind the Content-Length check in body-limit.
		bodyLimit: envAppConfig.BODY_LIMIT_BYTES,
		// On Vercel the platform overwrites x-forwarded-for, so `request.ip` can trust it.
		// Without this every client shares the proxy's IP (and one rate-limit bucket).
		trustProxy: process.env.VERCEL !== undefined,
	});

	// Order matters: hooks only apply to routes registered AFTER the plugin, and run in
	// registration order. Every `await` finishes loading a plugin before the next one starts.

	// 1. Logging and headers first, so every response is covered, including rejections.
	await app.register(requestLogging);
	await app.register(securityHeaders);

	// 2. Guards that apply to every request, before any route runs. CORS comes before the
	//    rate limiter and CSRF so preflight (OPTIONS) requests are answered before them.
	await app.register(cors);
	await app.register(compression);
	await app.register(bodyLimit);
	await app.register(cookie); // must precede csrf, which reads cookies
	await app.register(helmetPlugin);
	await app.register(rateLimiter);
	await app.register(csrfProtection);

	// 3. Error and not-found handlers before the routes, so every route inherits them.
	await app.register(errorHandler);
	await app.register(notFound);

	// 4. Routes. OpenAPI first (see routes.ts), then health, static and the versioned API.
	await registerBootstrap(app);

	return app;
};
