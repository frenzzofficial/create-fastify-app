import swagger from "@fastify/swagger";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

import { envAppConfig } from "../env/app.env.js";
import { envPublicConfig } from "../env/public.env.js";

/**
 * OpenAPI docs
 * ------------------------------------------------------------
 * Generates the spec from route `schema` objects and serves the spec at /openapi/json. Register BEFORE the routes it should document.
 *
 * Routes that aren't part of the JSON API (HTML pages, assets) opt out with
 * `schema: { hide: true }`.
 */
const openApiPlugin: FastifyPluginAsync = async (fastify) => {
	if (!envAppConfig.ENABLE_SWAGGER) {
		fastify.log.info("OpenAPI docs are disabled.");
		return;
	}

	await fastify.register(swagger, {
		openapi: {
			info: {
				title: envPublicConfig.APP_NAME,
				version: envPublicConfig.APP_VERSION,
				description: envPublicConfig.APP_DESCRIPTION,
			},
			tags: [
				{ name: "Health", description: "Service and database health checks" },
				{ name: "API", description: "Versioned API endpoints" },
			],
		},
	});

	// Spec only (no Swagger UI): the UI's static-file dependency is ESM-only and breaks on
	// Vercel's CommonJS function wrapper.
	fastify.get("/openapi/json", { schema: { hide: true } }, async () => fastify.swagger());

	fastify.log.info("OpenAPI docs are enabled at /openapi/json.");
};

export default fp(openApiPlugin, { name: "openapi" });
