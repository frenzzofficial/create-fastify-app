import rateLimit, { type RateLimitPluginOptions } from "@fastify/rate-limit";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

import { envAppConfig } from "../env/app.env";
import { AppError } from "../utils/errors";

const windowMs = envAppConfig.RATE_LIMIT_WINDOW_MS;
const max = envAppConfig.RATE_LIMIT_MAX_REQUESTS;

/**
 * Rate limiter
 * ------------------------------------------------------------
 * - Fixed-window rate limiting.
 * - IP-based client identification.
 * - Configurable request window and request limit.
 * - Standard rate-limit headers.
 * - Consistent JSON error responses.
 * - Environment-controlled activation.
 */

const rateLimitPlugin: FastifyPluginAsync = async (fastify) => {
	if (!envAppConfig.ENABLE_RATE_LIMIT) {
		fastify.log.info("Rate limiting is disabled.");
		return;
	}

	await fastify.register(rateLimit, {
		// Maximum requests allowed during the configured time window.
		max,

		// Duration of the rate-limit window, in milliseconds.
		timeWindow: windowMs,

		// Use the client's IP address as the rate-limit key.
		keyGenerator: (request) => request.ip,

		// @fastify/rate-limit throws whatever this returns, so return an AppError (status 429):
		// a plain object has no statusCode and would be turned into a 500 by the error handler.
		errorResponseBuilder: (_request, context) =>
			AppError.tooManyRequests(`Too many requests, retry in ${context.after}`),

		// Include standard rate-limit response headers.
		addHeaders: {
			"x-ratelimit-limit": true,
			"x-ratelimit-remaining": true,
			"x-ratelimit-reset": true,
			"retry-after": true,
		},
	} satisfies RateLimitPluginOptions);

	fastify.log.info(
		{
			windowMs,
			max,
		},
		"Rate limiting is enabled.",
	);
};

export default fp(rateLimitPlugin, {
	name: "rate-limit",
});
