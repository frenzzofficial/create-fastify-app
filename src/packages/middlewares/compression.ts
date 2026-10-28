import compress, { type FastifyCompressOptions } from "@fastify/compress";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

import { envAppConfig } from "../env/app.env.js";

const MIN_BYTES_TO_COMPRESS = 1024;

const COMPRESSIBLE_TYPE = /^(application\/(?:json|javascript|xml|x-www-form-urlencoded)|text\/)/i;

/**
 * Compression plugin
 * ------------------------------------------------------------
 * - Environment-controlled activation.
 * - gzip only, for responses of at least 1 KiB.
 * - Compresses text and JSON responses.
 * - Clients that don't accept gzip get the uncompressed response.
 *
 * Note: Disable compression when the deployment platform (e.g. Vercel)
 * already compresses responses.
 */
const compressionPlugin: FastifyPluginAsync = async (fastify) => {
	if (!envAppConfig.ENABLE_COMPRESSION) {
		fastify.log.info("Response compression is disabled.");
		return;
	}

	await fastify.register(compress, {
		global: true,
		encodings: ["gzip"],
		threshold: MIN_BYTES_TO_COMPRESS,
		customTypes: COMPRESSIBLE_TYPE,
	} satisfies FastifyCompressOptions);

	fastify.log.info(
		{ threshold: MIN_BYTES_TO_COMPRESS, encodings: ["gzip"] },
		"Response compression is enabled.",
	);
};

export default fp(compressionPlugin, { name: "compression" });
