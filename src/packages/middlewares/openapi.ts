import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

import { envAppConfig } from "../env/app.env";
import { envPublicConfig } from "../env/public.env";

/**
 * OpenAPI docs
 * ------------------------------------------------------------
 * Generates the spec from route `schema` objects and serves Swagger UI at /openapi
 * (spec at /openapi/json). Register BEFORE the routes it should document.
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

	await fastify.register(swaggerUi, {
		routePrefix: "/openapi",
		uiConfig: {
			// Keeps operations collapsed by default so the page is scannable.
			docExpansion: "list",
			persistAuthorization: true,
			// Skips the call to validator.swagger.io for an internal docs page.
			validatorUrl: "none",
		},
	});

	fastify.log.info("OpenAPI docs are enabled at /openapi.");
};

export default fp(openApiPlugin, { name: "openapi" });
