import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

import { envAppConfig } from "../env/app.env";
import { AppError } from "../utils/errors";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const generateToken = (): string => {
	const bytes = crypto.getRandomValues(new Uint8Array(32));

	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

/**
 * CSRF protection
 * ------------------------------------------------------------
 * Double-submit cookie pattern.
 *
 * - Issues a CSRF cookie when one does not exist.
 * - Requires x-csrf-token on unsafe requests.
 * - Skips CSRF validation for Authorization-based requests.
 * - Supports environment-based activation.
 * - Uses Fastify's onRequest lifecycle hook.
 */

const csrfPlugin: FastifyPluginAsync = async (fastify) => {
	if (!envAppConfig.ENABLE_CSRF_PROTECTION) {
		fastify.log.info("CSRF protection is disabled.");
		return;
	}

	fastify.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
		let token = request.cookies[CSRF_COOKIE_NAME];

		if (!token) {
			token = generateToken();

			reply.setCookie(CSRF_COOKIE_NAME, token, {
				// Must be readable by client JS so it can be echoed back in the header.
				// SameSite / Secure / Domain come from the cookie plugin defaults.
				httpOnly: false,
			});
		}

		const isSafeMethod = SAFE_METHODS.has(request.method);
		const hasAuthorization = Boolean(request.headers.authorization);

		if (isSafeMethod || hasAuthorization) {
			return;
		}

		const headerToken = request.headers[CSRF_HEADER_NAME];

		if (typeof headerToken !== "string" || !headerToken || headerToken !== token) {
			throw AppError.forbidden("Invalid or missing CSRF token");
		}
	});

	fastify.log.info("CSRF protection is enabled.");
};

export default fp(csrfPlugin, {
	name: "csrf-protection",
	dependencies: ["@fastify/cookie"],
});
