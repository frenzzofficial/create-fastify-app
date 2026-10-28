import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { createApp } from "../src/app/main.js";
import { validate } from "../src/packages/utils/validate.js";

type Body = { success: boolean; message?: string };

const signup = z.object({ email: z.email(), age: z.coerce.number().int().min(18) });

let app: FastifyInstance;

beforeAll(async () => {
	app = await createApp();
	app.post(
		"/signup",
		{ schema: { hide: true }, preHandler: validate("body", signup) },
		async (request) => ({ success: true, body: request.body }),
	);
	await app.ready();
});

afterAll(async () => {
	await app.close();
});

describe("validate()", () => {
	test("invalid input is a 422 in the standard error shape", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/signup",
			payload: { email: "nope", age: "12" },
		});
		expect(res.statusCode).toBe(422);
		const body = res.json<Body>();
		expect(body.success).toBe(false);
		expect(body.message).toContain("email");
		expect(body.message).toContain("age");
	});

	test("valid input is coerced and passed on", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/signup",
			payload: { email: "a@b.co", age: "30" },
		});
		expect(res.statusCode).toBe(200);
		expect(res.json<{ body: { age: number } }>().body.age).toBe(30);
	});
});
