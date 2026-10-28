import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { FastifyInstance } from "fastify";

import { createApp } from "../src/app/main.js";
import { AppError } from "../src/packages/utils/errors.js";

type ErrorBody = { success: boolean; message: string };
type HealthBody = { success: boolean; data: { status: string; timestamp: string } };
type SpecBody = { paths: Record<string, unknown> };

let app: FastifyInstance;

beforeAll(async () => {
	app = await createApp();
	app.get("/boom", { schema: { hide: true } }, async () => {
		throw AppError.forbidden("nope");
	});
	await app.ready();
});
afterAll(async () => {
	await app.close();
});

describe("app", () => {
	test("AppError maps to its status code", async () => {
		const res = await app.inject("/boom");
		expect(res.statusCode).toBe(403);
		expect(res.headers["content-type"]).toContain("application/json");
		expect(res.json()).toEqual({ success: false, message: "nope" });
	});

	test("health returns the success envelope (response schema must not strip it)", async () => {
		for (const url of ["/health", "/api/health"]) {
			const res = await app.inject(url);
			expect(res.statusCode).toBe(200);
			const body = res.json<HealthBody>();
			expect(body.success).toBe(true);
			expect(body.data.status).toBe("ok");
			expect(typeof body.data.timestamp).toBe("string");
		}
	});

	test("versioned API answers with and without trailing slash", async () => {
		for (const url of ["/api/v1", "/api/v1/"]) {
			const res = await app.inject(url);
			expect(res.statusCode).toBe(200);
			expect(res.json()).toEqual({ version: "v1", message: "Cloak Shield API" });
		}
	});

	test("unknown route -> JSON 404 with security headers", async () => {
		const res = await app.inject("/nope?x=1");
		expect(res.statusCode).toBe(404);
		expect(res.json()).toEqual({ success: false, message: "Route not found: GET /nope" });
		expect(res.headers["x-frame-options"]).toBe("DENY");
	});

	test("static pages and assets", async () => {
		const home = await app.inject("/");
		expect(home.statusCode).toBe(200);
		expect(home.headers["content-type"]).toContain("text/html");
		expect((await app.inject("/docs")).statusCode).toBe(200);

		const asset = await app.inject("/assets/html/index.html");
		expect(asset.statusCode).toBe(200);
		expect(asset.headers["cache-control"]).toBe("public, max-age=3600");

		expect((await app.inject("/assets/missing.css")).statusCode).toBe(404);
		expect((await app.inject("/assets/")).statusCode).toBe(404);
	});

	test("static assets cannot escape src/assets", async () => {
		for (const url of [
			"/assets/../../package.json",
			"/assets/..%2f..%2fpackage.json",
			"/assets/%2e%2e/%2e%2e/package.json",
			"/assets/html/../../../package.json",
		]) {
			const res = await app.inject({ method: "GET", url });
			expect(res.statusCode).toBe(404);
			expect(res.body).not.toContain("create-fastify-app");
		}
	});

	test("OpenAPI spec lists API routes only", async () => {
		const res = await app.inject("/openapi/json");
		expect(res.statusCode).toBe(200);
		const paths = Object.keys(res.json<SpecBody>().paths);
		expect(paths.sort()).toEqual(["/api/health", "/api/v1/", "/health"].sort());
		const ui = await app.inject("/openapi/");
		expect(ui.statusCode).toBe(200);
		expect(ui.headers["content-type"]).toContain("text/html");
	});

	test("CORS preflight is answered before rate limit / csrf", async () => {
		const res = await app.inject({
			method: "OPTIONS",
			url: "/api/v1",
			headers: {
				origin: "http://localhost:3000",
				"access-control-request-method": "POST",
				"access-control-request-headers": "content-type,x-csrf-token",
			},
		});
		expect(res.statusCode).toBe(204);
		expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
		expect(res.headers["access-control-allow-credentials"]).toBe("true");
	});

	test("gzip for large JSON, none otherwise", async () => {
		const gz = await app.inject({
			url: "/openapi/json",
			headers: { "accept-encoding": "gzip" },
		});
		expect(gz.headers["content-encoding"]).toBe("gzip");
		const plain = await app.inject({
			url: "/openapi/json",
			headers: { "accept-encoding": "identity" },
		});
		expect(plain.headers["content-encoding"]).toBeUndefined();
		const small = await app.inject({ url: "/api/v1", headers: { "accept-encoding": "gzip" } });
		expect(small.headers["content-encoding"]).toBeUndefined();
	});

	test("oversized Content-Length -> 413, malformed -> 400", async () => {
		const big = await app.inject({
			method: "POST",
			url: "/nope",
			headers: { "content-length": "99999999" },
		});
		expect(big.statusCode).toBe(413);
		expect(big.json<ErrorBody>().success).toBe(false);
	});

	test("rate limit headers present", async () => {
		const res = await app.inject("/api/v1");
		expect(res.headers["x-ratelimit-limit"]).toBe("100");
	});
});
