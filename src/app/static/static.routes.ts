import type { FastifyInstance } from "fastify";

import { getHTML, getStaticAsset } from "../../packages/utils/static-files";

const STATIC_PAGES = new Map<string, string>([
	["/", "html/index.html"],
	["/home", "html/index.html"],
	["/docs", "html/docs.html"],
]);

// `hide: true` keeps these routes out of the OpenAPI spec. @fastify/swagger documents
// every route by default, so the HTML pages and assets must opt out explicitly.
const hiddenFromSpec = { schema: { hide: true } };

export const registerStaticRoutes = (app: FastifyInstance): void => {
	// HTML pages
	for (const [route, file] of STATIC_PAGES) {
		app.get(route, hiddenFromSpec, async (_request, reply) => {
			const html = await getHTML(file);

			if (!html) return reply.code(404).type("text/plain; charset=utf-8").send("Not Found");

			return reply.type("text/html; charset=utf-8").send(html);
		});
	}

	// Static assets
	app.get<{ Params: { "*": string } }>("/assets/*", hiddenFromSpec, async (request, reply) => {
		const asset = await getStaticAsset(request.params["*"]);

		if (!asset) return reply.code(404).type("text/plain; charset=utf-8").send("Not Found");

		// Files are not fingerprinted, so `immutable` would pin stale copies for a year
		// after a deploy. Switch to long-lived caching once asset names carry a hash.
		return reply
			.header("cache-control", "public, max-age=3600")
			.type(asset.contentType)
			.send(asset.body);
	});
};
