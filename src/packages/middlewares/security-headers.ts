import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

import { envAppConfig } from "../env/app.env.js";

/**
 * Security headers
 * ------------------------------------------------------------
 * Standard security response headers (CSP, X-Frame-Options, HSTS, Referrer-Policy,
 * Permissions-Policy, ...). This is a JSON API, so the CSP is locked down to
 * "nothing is allowed to load".
 *
 * Swagger UI: @fastify/swagger-ui serves its own JS/CSS from the same origin, which
 * `'self'` already covers. The HTML landing/docs pages load Google Fonts, hence the two
 * font origins below; remove them if you self-host the fonts.
 *
 * Hand-written, no dependency. Sent from `onSend` rather than `onRequest`, so every
 * response gets the headers (404s and errors included) regardless of plugin
 * registration order.
 */
const HSTS_MAX_AGE_SECONDS = 15_552_000; // 180 days

const CSP = [
	"default-src 'none'",
	"script-src 'self' 'unsafe-inline'",
	"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
	"img-src 'self' data: blob:",
	"font-src 'self' https://fonts.gstatic.com",
	"connect-src 'self'",
	"frame-src 'none'",
	"object-src 'none'",
	"base-uri 'none'",
].join("; ");

const PERMISSIONS_POLICY = [
	"camera=()",
	"microphone=()",
	"geolocation=()",
	"interest-cohort=()",
].join(", ");

const securityHeadersPlugin: FastifyPluginAsync = async (fastify) => {
	if (!envAppConfig.ENABLE_SECURITY_HEADERS) {
		fastify.log.info("Security headers are disabled.");
		return;
	}

	// Built once; the values never change per request.
	const headers: Record<string, string> = {
		"x-frame-options": "DENY",
		"x-xss-protection": "1; mode=block",
		"x-content-type-options": "nosniff",
		"referrer-policy": "no-referrer",
		"x-dns-prefetch-control": "off",
		"cross-origin-resource-policy": "same-origin",
		"cross-origin-opener-policy": "same-origin",
		"content-security-policy": CSP,
		"permissions-policy": PERMISSIONS_POLICY,
	};

	if (envAppConfig.NODE_ENV === "production") {
		headers["strict-transport-security"] = `max-age=${HSTS_MAX_AGE_SECONDS}; includeSubDomains`;
	}

	fastify.addHook("onSend", async (_request, reply, payload) => {
		reply.headers(headers);
		return payload;
	});

	fastify.log.info("Security headers are enabled.");
};

export default fp(securityHeadersPlugin, { name: "security-headers" });
