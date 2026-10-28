import helmet, { type FastifyHelmetOptions } from "@fastify/helmet";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const helmetPlugin: FastifyPluginAsync = fp(
	async (fastify) => {
		fastify.register(helmet, {
			contentSecurityPolicy: {
				directives: {
					defaultSrc: ["'self'"],
					styleSrc: ["'self'", "'unsafe-inline'"],
					scriptSrc: ["'self'"],
					imgSrc: ["'self'", "data:", "https:"],
				},
			},
			referrerPolicy: { policy: "no-referrer" },
			crossOriginEmbedderPolicy: true,
			crossOriginResourcePolicy: { policy: "same-origin" },
			frameguard: { action: "deny" },
			permittedCrossDomainPolicies: { permittedPolicies: "none" },
			hidePoweredBy: true,
		} as FastifyHelmetOptions);
	},
	{
		name: "helmet",
	},
);

export default helmetPlugin;
