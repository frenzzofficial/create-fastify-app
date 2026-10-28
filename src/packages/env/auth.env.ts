import { z } from "zod";

import { durationSeconds } from "../utils/duration.js";
import { parseEnv } from "../utils/parse-env.js";

// Development-only fallbacks.
// Production must provide distinct, strong secrets.
const DEV_COOKIE_SECRET = "dev-only-cookie-secret-change-me-0123456789";

const DEV_ACCESS_SECRET = "dev-only-access-secret-change-me-0123456789";

const DEV_REFRESH_SECRET = "dev-only-refresh-secret-change-me-012345678";

const MIN_SECRET_LENGTH = 32;

const authEnvSchema = z
	.object({
		NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

		COOKIE_SECURE: z.stringbool().optional(),

		AUTH_COOKIE_SECRET: z.string().min(16).default(DEV_COOKIE_SECRET),

		AUTH_ACCESS_TOKEN_SECRET: z.string().min(16).default(DEV_ACCESS_SECRET),

		AUTH_REFRESH_TOKEN_SECRET: z.string().min(16).default(DEV_REFRESH_SECRET),

		// Token lifetimes.
		AUTH_ACCESS_TOKEN_TTL: durationSeconds("AUTH_ACCESS_TOKEN_TTL").prefault("15m"),

		AUTH_REFRESH_TOKEN_TTL: durationSeconds("AUTH_REFRESH_TOKEN_TTL").prefault("30d"),

		AUTH_SHORT_SESSION_TTL: durationSeconds("AUTH_SHORT_SESSION_TTL").prefault("1d"),

		// Allows concurrent refresh requests a short grace period.
		AUTH_REFRESH_REUSE_GRACE: durationSeconds("AUTH_REFRESH_REUSE_GRACE").prefault("10s"),

		// Login security.
		AUTH_MAX_FAILED_LOGINS: z.coerce.number().int().positive().default(5),

		AUTH_LOCKOUT_DURATION: durationSeconds("AUTH_LOCKOUT_DURATION").prefault("15m"),

		AUTH_MAX_SESSIONS_PER_USER: z.coerce.number().int().positive().default(10),

		// Cookie configuration.
		AUTH_COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),

		AUTH_COOKIE_DOMAIN: z.string().trim().min(1).optional(),

		// Account verification.
		AUTH_REQUIRE_EMAIL_VERIFICATION: z.stringbool().default(false),

		// Recent authentication requirement.
		AUTH_REAUTH_WINDOW: durationSeconds("AUTH_REAUTH_WINDOW").prefault("10m"),

		// New-device notifications.
		AUTH_NEW_DEVICE_WINDOW: durationSeconds("AUTH_NEW_DEVICE_WINDOW").prefault("90d"),

		AUTH_VERIFY_TOKEN_TTL: durationSeconds("AUTH_VERIFY_TOKEN_TTL").prefault("24h"),

		AUTH_RESET_TOKEN_TTL: durationSeconds("AUTH_RESET_TOKEN_TTL").prefault("1h"),
	})
	.superRefine((env, ctx) => {
		if (env.NODE_ENV !== "production") {
			return;
		}

		const checkSecret = (
			key: "AUTH_ACCESS_TOKEN_SECRET" | "AUTH_REFRESH_TOKEN_SECRET" | "AUTH_COOKIE_SECRET",
			value: string,
			developmentSecret: string,
		) => {
			if (value.length < MIN_SECRET_LENGTH) {
				ctx.addIssue({
					code: "custom",
					path: [key],
					message: `Must contain at least ${MIN_SECRET_LENGTH} characters in production`,
				});
			}

			if (value === developmentSecret) {
				ctx.addIssue({
					code: "custom",
					path: [key],
					message: "Development fallback secrets are not allowed in production",
				});
			}
		};

		checkSecret("AUTH_ACCESS_TOKEN_SECRET", env.AUTH_ACCESS_TOKEN_SECRET, DEV_ACCESS_SECRET);

		checkSecret("AUTH_REFRESH_TOKEN_SECRET", env.AUTH_REFRESH_TOKEN_SECRET, DEV_REFRESH_SECRET);

		checkSecret("AUTH_COOKIE_SECRET", env.AUTH_COOKIE_SECRET, DEV_COOKIE_SECRET);

		const secrets = [
			env.AUTH_ACCESS_TOKEN_SECRET,
			env.AUTH_REFRESH_TOKEN_SECRET,
			env.AUTH_COOKIE_SECRET,
		];

		if (new Set(secrets).size !== secrets.length) {
			ctx.addIssue({
				code: "custom",
				path: ["AUTH_COOKIE_SECRET"],
				message: "Access, refresh and cookie secrets must all be different",
			});
		}

		if (env.AUTH_COOKIE_SAMESITE === "none" && env.COOKIE_SECURE === false) {
			ctx.addIssue({
				code: "custom",
				path: ["COOKIE_SECURE"],
				message: "COOKIE_SECURE must not be false when AUTH_COOKIE_SAMESITE is none",
			});
		}
	});

export const parseAuthEnv = (source: Record<string, string | undefined> = process.env) =>
	parseEnv(authEnvSchema, "Auth", source);

export const envAuthConfig = Object.freeze(parseAuthEnv());

export type EnvAuthConfig = typeof envAuthConfig;
