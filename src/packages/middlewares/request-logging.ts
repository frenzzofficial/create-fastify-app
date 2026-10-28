import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

import { envAppConfig } from "../env/app.env.js";
import { logger } from "../utils/logger.js";

/**
 * Request logging
 * ------------------------------------------------------------
 * Logs one line per completed request: method, path, status and duration.
 *
 * Duration comes from Fastify's built-in `reply.elapsedTime` (measured from when the
 * request was received), so no request decoration or `onRequest` hook is needed.
 *
 * Register early so rejected requests are logged too.
 */
const requestLoggingPlugin: FastifyPluginAsync = async (fastify) => {
	if (!envAppConfig.ENABLE_REQUEST_LOGGING) {
		fastify.log.info("Request logging is disabled.");
		return;
	}

	// Lets clients and support tickets quote an id that matches the log line.
	fastify.addHook("onSend", async (request, reply, payload) => {
		reply.header("x-request-id", request.id);
		return payload;
	});

	fastify.addHook("onResponse", async (request, reply) => {
		const fields = {
			requestId: request.id,
			method: request.method,
			path: request.routeOptions.url ?? request.url.split("?")[0],
			status: reply.statusCode,
			durationMs: Math.round(reply.elapsedTime),
		};

		if (reply.statusCode >= 500) {
			logger.error("request", fields);
		} else {
			logger.info("request", fields);
		}
	});

	fastify.log.info("Request logging is enabled.");
};

export default fp(requestLoggingPlugin, { name: "request-logging" });
