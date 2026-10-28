import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

/**
 * Not-found handler
 * ------------------------------------------------------------
 * Explicit JSON 404 for anything no route matched, so it has the same
 * shape as every other error response.
 *
 * Wrapped in `fp` so it applies to the root instance. Without it, Fastify
 * would scope the handler to this plugin's (empty) encapsulation context.
 */
const notFoundPlugin: FastifyPluginAsync = async (fastify) => {
	fastify.setNotFoundHandler((request, reply) => {
		const path = request.url.split("?")[0];

		return reply.code(404).send({
			success: false,
			message: `Route not found: ${request.method} ${path}`,
		});
	});
};

export default fp(notFoundPlugin, { name: "not-found" });
