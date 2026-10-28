import type { FastifyInstance } from "fastify";

import openApi from "../packages/middlewares/openapi.js";
import { registerHealthRoutes } from "./health/health.routes.js";
import { registerApiRoutes } from "./register-api-routes.js";
import { registerStaticRoutes } from "./static/static.routes.js";

// This file (and register-api-routes.ts) lives under src/app, not src/packages — it's
// composition/wiring (deciding WHICH routes exist and in what order), the same job as
// main.ts, not a standalone feature. Route MODULES (health/, static/) also live under
// src/app for the same reason: they're specific to this one app, not reusable
// infrastructure. src/packages stays for cross-cutting code with no opinion about which
// routes exist — middlewares, config, env, shared utils — which is what
// `bun run arch`'s "packages-must-not-import-app" rule enforces: packages/* must never
// import from app/*, only the reverse.
export const registerBootstrap = async (app: FastifyInstance): Promise<void> => {
	// ── OpenAPI docs — MUST be registered before the routes it documents: unlike the
	// @fastify/swagger only sees routes added after it.
	await app.register(openApi);

	// ── Health check ──────────────────────────────────────────────────────────────
	registerHealthRoutes(app);

	// ── Static Routes (HTML, assets) ──────────────────────────────────────────────
	registerStaticRoutes(app);

	// ── Versioned API routes ──────────────────────────────────────────────────────
	await registerApiRoutes(app);
};
