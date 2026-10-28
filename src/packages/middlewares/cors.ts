import cors, { type FastifyCorsOptions } from "@fastify/cors";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

import { envAppConfig } from "../env/app.env";
import { envClientConfig } from "../env/client.env";

/**
 * CORS plugin
 * ------------------------------------------------------------
 * - Supports explicitly allowlisted client origins.
 * - Enables credentials for cookie-based authentication.
 * - Supports CSRF protection headers.
 * - Handles preflight OPTIONS requests.
 * - Registers early through Fastify's plugin lifecycle.
 * - Can be disabled through ENABLE_CORS.
 */

const corsPlugin = fp<FastifyCorsOptions>(
	async (fastify: FastifyInstance) => {
		if (!envAppConfig.ENABLE_CORS) {
			fastify.log.info("CORS is disabled.");
			return;
		}

		await fastify.register(cors, {
			// Allow only configured client origins.
			origin: envClientConfig.CLIENT_ORIGINS,

			// Required for cookie-based authentication and CSRF protection.
			credentials: true,

			// Supported HTTP methods.
			methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

			// Headers clients are allowed to send.
			allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token"],

			// Headers browser clients can access in responses.
			exposedHeaders: ["Content-Length", "Content-Type"],

			// Cache successful preflight responses for 10 minutes.
			maxAge: 600,

			// Do not pass OPTIONS requests to route handlers.
			preflightContinue: false,

			// Respond to successful preflight requests with 204.
			optionsSuccessStatus: 204,
		});

		fastify.log.info("CORS is enabled.");
	},
	{
		name: "cors",
	},
);

export default corsPlugin;
