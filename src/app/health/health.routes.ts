import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { appConfig } from "../../packages/configs/app.config.js";
import { ok } from "../../packages/utils/response.js";
import { getHealthStatus } from "./health.service.js";

const handleHealthCheck = async (_request: FastifyRequest, reply: FastifyReply) => {
	const health = await getHealthStatus();
	// 503 when the DB is unreachable — this is what actually lets load
	// balancers / uptime monitors distinguish "app is up" from "app is up
	// but can't serve real requests," which a static 200 never could.
	return ok(reply, health, health.status === "ok" ? 200 : 503);
};

// Documented through the route `schema`, which @fastify/swagger turns into the OpenAPI spec.
const healthRouteSchema = {
	tags: ["Health"],
	summary: "Health check",
	description: "Reports service status, uptime and database connectivity.",
	response: {
		200: { description: "Service and database are healthy" },
		503: { description: "Database unreachable" },
	},
};

export const registerHealthRoutes = (app: FastifyInstance): void => {
	app.get("/health", { schema: healthRouteSchema }, handleHealthCheck);
	app.get(`${appConfig.app.apiPrefix}/health`, { schema: healthRouteSchema }, handleHealthCheck);
};
