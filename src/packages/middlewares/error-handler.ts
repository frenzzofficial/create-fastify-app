import type { FastifyError, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

import { AppError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

type ErrorBody = {
	success: false;
	message: string;
};

const body = (message: string): ErrorBody => ({
	success: false,
	message,
});

// Single place for application error handling.
//
// AppError is the only error type thrown from services.
// Operational errors are safe to return to clients.
// Unexpected errors are logged and return a generic 500 response.

const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
	fastify.setErrorHandler((error: FastifyError, _request, reply) => {
		if (error instanceof AppError) {
			if (!error.isOperational) {
				logger.error("non-operational error", {
					message: error.message,
					stack: error.stack,
				});
			}

			// Non-operational errors can carry internal detail (query text, paths, ...).
			// Log it, but never send it to the client.
			return reply
				.status(error.statusCode)
				.send(body(error.isOperational ? error.message : "Internal server error"));
		}

		// Fastify's built-in parser uses this code for malformed JSON.
		if (error.code === "FST_ERR_CTP_INVALID_JSON_BODY") {
			return reply.status(400).send(body("Invalid request body"));
		}

		// Handle other client errors, including validation failures.
		const statusCode = error.statusCode;

		if (statusCode !== undefined && statusCode >= 400 && statusCode < 500) {
			return reply.status(statusCode).send(body(error.message || "Request failed"));
		}

		// Unexpected errors and server-side framework failures.
		logger.error("unhandled error", {
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});

		return reply.status(500).send(body("Internal server error"));
	});
};

export default fp(errorHandlerPlugin, {
	name: "error-handler",
});
