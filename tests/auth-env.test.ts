import { describe, expect, test } from "bun:test";

import { parseAuthEnv } from "../src/packages/env/auth.env.js";
import { parseDurationSeconds } from "../src/packages/utils/duration.js";

const strong = (seed: string): string => seed.repeat(40).slice(0, 40);

const production = {
	NODE_ENV: "production",
	AUTH_COOKIE_SECRET: strong("c"),
	AUTH_ACCESS_TOKEN_SECRET: strong("a"),
	AUTH_REFRESH_TOKEN_SECRET: strong("r"),
};

describe("auth env", () => {
	test("development works with no variables set", () => {
		expect(parseAuthEnv({}).AUTH_ACCESS_TOKEN_TTL).toBe(900);
	});

	test("production rejects the development fallback secrets", () => {
		expect(() => parseAuthEnv({ NODE_ENV: "production" })).toThrow(/Development fallback/);
	});

	test("production accepts three distinct strong secrets", () => {
		expect(parseAuthEnv(production).NODE_ENV).toBe("production");
	});

	test("production rejects short secrets", () => {
		expect(() =>
			parseAuthEnv({ ...production, AUTH_COOKIE_SECRET: "short-but-16-chars" }),
		).toThrow(/at least 32/);
	});

	test("production rejects reused secrets", () => {
		expect(() =>
			parseAuthEnv({
				...production,
				AUTH_REFRESH_TOKEN_SECRET: production.AUTH_ACCESS_TOKEN_SECRET,
			}),
		).toThrow(/must all be different/);
	});

	test("SameSite=none cannot be combined with COOKIE_SECURE=false", () => {
		expect(() =>
			parseAuthEnv({ ...production, AUTH_COOKIE_SAMESITE: "none", COOKIE_SECURE: "false" }),
		).toThrow(/COOKIE_SECURE/);
	});
});

describe("durations", () => {
	test("parses s/m/h/d and rejects everything else", () => {
		expect(parseDurationSeconds("30s")).toBe(30);
		expect(parseDurationSeconds("15m")).toBe(900);
		expect(parseDurationSeconds("12h")).toBe(43_200);
		expect(parseDurationSeconds("30d")).toBe(2_592_000);
		expect(parseDurationSeconds("1w")).toBeUndefined();
		expect(parseDurationSeconds("15")).toBeUndefined();
		expect(parseDurationSeconds("-5m")).toBeUndefined();
	});
});
