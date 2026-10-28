import type { FastifyInstance } from "fastify";

import { appConfig } from "../packages/configs/app.config.js";

// Every versioned route lives in one encapsulated plugin registered under a prefix,
// e.g. /api/v1/... . Root-level routes that shouldn't be versioned (/, /health) stay
// outside this group — see routes.ts.
//
// Adding a new module: register another plugin inside the callback below
// (`v1.register(modulePlugin, { prefix: "/module" })`) or add routes with `v1.get(...)`.
// A future v2 becomes a second `app.register(..., { prefix })`, registered independently —
// existing v1 routes and clients are unaffected.
export const registerApiRoutes = async (app: FastifyInstance): Promise<void> => {
	await app.register(
		async (v1) => {
			v1.get(
				"/",
				{
					schema: {
						tags: ["API"],
						summary: "API version info",
						description: "Confirms the API is reachable and reports its version.",
						response: {
							200: { description: "API is reachable" },
						},
					},
				},
				async () => ({
					version: appConfig.app.apiVersion,
					message: "Cloak Shield API",
				}),
			);
		},
		{ prefix: appConfig.api.base },
	);
};
