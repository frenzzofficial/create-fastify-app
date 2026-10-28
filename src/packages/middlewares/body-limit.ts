import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

import { envAppConfig } from "../env/app.env.js";
import { AppError } from "../utils/errors.js";

/**
 * Body size limit
 * ------------------------------------------------------------
 * Rejects requests whose declared Content-Length exceeds the
 * configured limit before Fastify parses the request body.
 *
 * Requests without Content-Length are allowed through.
 * Fastify's parser-level body limit handles actual body size.
 */

const bodyLimitPlugin: FastifyPluginAsync = async (fastify) => {
	fastify.addHook("onRequest", async (request) => {
		const contentLength = request.headers["content-length"];

		if (contentLength === undefined) {
			return;
		}

		// Content-Length should be a single numeric header value.
		if (typeof contentLength !== "string" || !/^\d+$/.test(contentLength)) {
			throw AppError.badRequest("Invalid Content-Length header");
		}

		const size = Number(contentLength);
		const limit = envAppConfig.BODY_LIMIT_BYTES;

		if (size > limit) {
			throw AppError.payloadTooLarge(
				`Request body too large: ${size} bytes exceeds the ${limit} byte limit`,
			);
		}
	});
};

export default fp(bodyLimitPlugin, {
	name: "body-limit",
});
