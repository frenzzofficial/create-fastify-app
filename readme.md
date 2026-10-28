# create-fastify-app

A production-minded Fastify 5 + TypeScript backend template for [Bun](https://bun.com), deployable
to Vercel. Every cross-cutting concern is a small, individually switchable Fastify plugin, and the
whole thing is held to strict quality gates (100% type coverage, architecture rules, secret scanning).

## Quick start

```bash
bun install
cp .env.example .env
bun run dev          # http://localhost:7164
```

| URL          | What                                 |
| ------------ | ------------------------------------ |
| `/`, `/docs` | Landing and documentation pages      |
| `/health`    | Health check (503 when degraded)     |
| `/api/v1`    | Versioned API root                   |
| `/openapi`   | Swagger UI (spec at `/openapi/json`) |

## Scripts

| Script                  | Purpose                                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| `dev` / `start`         | Run `src/app/server.ts` (watch mode / plain)                                                               |
| `ci`                    | Every gate, read-only. Same as CI: typecheck, lint, type-coverage, knip, arch, spell, secrets, test, build |
| `verify`                | Local pre-PR check (auto-fixes lint first)                                                                 |
| `typecheck`, `lint`     | `tsc --noEmit`, Biome                                                                                      |
| `type-coverage`         | Fails below 100% typed expressions (`--strict`)                                                            |
| `knip`                  | Unused files, exports and dependencies                                                                     |
| `arch`                  | dependency-cruiser layer rules (see below)                                                                 |
| `test`, `test:coverage` | `bun test`                                                                                                 |

Commits are checked by Husky: Biome and `tsc` on staged files, secretlint, and Conventional Commits.

## Project layout

```
api/
  index.ts              Vercel function: builds the app once per warm instance, JSON 500 if startup fails
src/
  app/                  This app's wiring and routes
    main.ts             createApp(): Fastify options + plugin order
    routes.ts           Which routes exist (OpenAPI first, then health, static, API)
    server.ts           Local server with graceful shutdown (never used on Vercel)
    health/  static/    Route modules
  packages/             Reusable infrastructure; must never import from app/
    env/                Zod-validated environment, one file per concern
    configs/            Derived, typed configuration
    middlewares/        Fastify plugins (one per concern, each behind an ENABLE_* flag)
    utils/ schema/      Errors, logger, env parsing, static files, shared schemas
  assets/html/          Static pages served by the app
tests/
```

`bun run arch` enforces the layering: `packages` never imports `app`; `env` only depends on other
`env` files plus `parse-env` and `duration`; `configs` and `utils` never import middlewares; no cycles.

## Request lifecycle

Plugins register in this order (`src/app/main.ts`). Order matters: hooks apply to routes registered
after them.

1. `request-logging` – one JSON line per request, with a request id (also sent as `x-request-id`)
2. `security-headers` – CSP, HSTS (production), frame/referrer/permissions policies, on every response
3. `cors` – before rate limiting and CSRF so preflight requests are answered first
4. `compression` – gzip, 1 KiB threshold
5. `body-limit` – rejects oversized `Content-Length` before parsing
6. `cookie` – signed cookies with secure defaults
7. `rate-limiter` – fixed window per client IP, in memory (see Deployment)
8. `csrf` – double-submit cookie (off by default)
9. `error-handler`, `not-found` – one JSON error shape for everything
10. Routes

Errors have a single shape: `{ "success": false, "message": "..." }`. Throw `AppError` from services;
non-operational errors (`AppError.internal`) are logged and returned as a generic 500.

## Configuration

All variables are validated at startup and fail with a readable list of problems. See
[`.env.example`](.env.example) for the full list. In production these are required, must be at least
32 characters and must all differ: `APP_SECRET`, `AUTH_COOKIE_SECRET`, `AUTH_ACCESS_TOKEN_SECRET`,
`AUTH_REFRESH_TOKEN_SECRET`.

```bash
bun -e "console.log(require('node:crypto').randomBytes(48).toString('base64'))"
```

Feature flags: `ENABLE_CORS`, `ENABLE_COMPRESSION`, `ENABLE_RATE_LIMIT`, `ENABLE_REQUEST_LOGGING`,
`ENABLE_SECURITY_HEADERS`, `ENABLE_CSRF_PROTECTION`, `ENABLE_SWAGGER`.

## Adding an endpoint

Routes live in an encapsulated plugin under the version prefix (`src/app/register-api-routes.ts`):

```ts
v1.get("/things", { schema: { tags: ["API"], summary: "List things" } }, async () => ({
	items: [],
}));
```

`@fastify/swagger` documents every route that has a `schema`; use `schema: { hide: true }` to opt out.

## Deployment (Vercel)

`vercel.json` routes every request to `api/index.ts`, a Vercel function that builds the Fastify app
once per warm instance and hands requests to it. It runs on Vercel's Node.js runtime (no `bunVersion`).

- Relative imports must carry a `.js` extension (`from "./routes.js"`): Vercel compiles each file to
  plain ESM and Node cannot resolve imports that lack one. Biome enforces this
  (`useImportExtensions`); `bun run lint:fix` fixes violations.
- Set the four production secrets in the Vercel project (`APP_SECRET`, `AUTH_COOKIE_SECRET`,
  `AUTH_ACCESS_TOKEN_SECRET`, `AUTH_REFRESH_TOKEN_SECRET`), then redeploy. A bad environment returns a
  JSON 500 and logs `[startup failed]` with the reasons.
- `trustProxy` is enabled automatically on Vercel so rate limiting sees real client IPs; set
  `TRUST_PROXY=true` elsewhere only behind a proxy you control. Response compression defaults to off
  on Vercel (the edge already compresses).
- The rate limiter keeps its counters in memory, per instance. On serverless it is best-effort; use a
  shared store (e.g. Redis) or the platform firewall for hard limits.
