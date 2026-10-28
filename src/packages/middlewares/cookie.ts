import cookie, { type FastifyCookieOptions } from "@fastify/cookie";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

import { envAuthConfig } from "../env/auth.env.js";

/**
 * Cookie plugin
 * ------------------------------------------------------------
 * - Registers @fastify/cookie with a dedicated signing secret.
 * - Secure defaults for every cookie set via `reply.setCookie`.
 * - `maxAge` is NOT defaulted here: pass it per cookie from the matching TTL, e.g.
 *   `reply.setCookie("refresh", token, { maxAge: envAuthConfig.AUTH_REFRESH_TOKEN_TTL })`.
 */
const cookiePlugin: FastifyPluginAsync = async (fastify) => {
	const sameSite = envAuthConfig.AUTH_COOKIE_SAMESITE;

	// SameSite=none is rejected by browsers without Secure, so it forces Secure on.
	const secure =
		sameSite === "none" ||
		(envAuthConfig.COOKIE_SECURE ?? envAuthConfig.NODE_ENV === "production");

	await fastify.register(cookie, {
		secret: envAuthConfig.AUTH_COOKIE_SECRET,
		parseOptions: {
			path: "/",
			httpOnly: true,
			secure,
			sameSite,
			...(envAuthConfig.AUTH_COOKIE_DOMAIN
				? { domain: envAuthConfig.AUTH_COOKIE_DOMAIN }
				: {}),
		},
	} satisfies FastifyCookieOptions);

	fastify.log.info({ secure, sameSite }, "Cookie plugin registered.");
};

export default fp(cookiePlugin, { name: "cookie" });
