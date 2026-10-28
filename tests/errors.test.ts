import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { FastifyInstance } from "fastify";

import { createApp } from "../src/app/main.js";
import { AppError } from "../src/packages/utils/errors.js";

type ErrorBody = { success: boolean; message: string };

let app: FastifyInstance;

beforeAll(async () => {
	app = await createApp();
	app.get("/internal", { schema: { hide: true } }, async () => {
		throw AppError.internal("db password is hunter2");
	});
	app.get("/plain", { schema: { hide: true } }, async () => {
		throw new Error("secret stack detail");
	});
	app.post("/json", { schema: { hide: true } }, async (request) => request.body);
	await app.ready();
});

afterAll(async () => {
	await app.close();
});

describe("error responses", () => {
	test("non-operational AppError never leaks its message", async () => {
		const res = await app.inject("/internal");
		expect(res.statusCode).toBe(500);
		expect(res.json<ErrorBody>().message).toBe("Internal server error");
		expect(res.body).not.toContain("hunter2");
	});

	test("unexpected Error becomes a generic 500", async () => {
		const res = await app.inject("/plain");
		expect(res.statusCode).toBe(500);
		expect(res.body).not.toContain("secret stack detail");
	});

	test("malformed JSON is a 400 with the standard shape", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/json",
			headers: { "content-type": "application/json" },
			payload: "{bad",
		});
		expect(res.statusCode).toBe(400);
		expect(res.json<ErrorBody>()).toEqual({ success: false, message: "Invalid request body" });
	});
});

describe("request id", () => {
	test("every response carries a unique x-request-id", async () => {
		const a = await app.inject("/api/v1");
		const b = await app.inject("/nope");
		const idA = a.headers["x-request-id"];
		expect(typeof idA).toBe("string");
		expect(idA).toMatch(/^[0-9a-f-]{36}$/);
		expect(b.headers["x-request-id"]).not.toBe(idA);
	});
});

describe("rate limiting", () => {
	test("returns the standard 429 once the window is exhausted", async () => {
		const limit = 100; // RATE_LIMIT_MAX_REQUESTS default
		let last = await app.inject({ url: "/api/v1", remoteAddress: "203.0.113.7" });
		for (let i = 0; i < limit; i++) {
			last = await app.inject({ url: "/api/v1", remoteAddress: "203.0.113.7" });
		}
		expect(last.statusCode).toBe(429);
		expect(last.json<ErrorBody>().success).toBe(false);
		expect(last.headers["retry-after"]).toBeDefined();
	});
});

describe("security headers", () => {
	test("CSP allows the Google Fonts the HTML pages use, and nothing else external", async () => {
		const csp = (await app.inject("/")).headers["content-security-policy"];
		expect(csp).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com");
		expect(csp).toContain("font-src 'self' https://fonts.gstatic.com");
		expect(csp).toContain("default-src 'none'");
	});

	test("headers are not duplicated (helmet is gone)", async () => {
		const res = await app.inject("/");
		expect(res.headers["x-frame-options"]).toBe("DENY");
		expect(res.headers["cross-origin-embedder-policy"]).toBeUndefined();
	});
});
