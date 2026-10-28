import type { FastifyReply } from "fastify";

export const ok = <T>(reply: FastifyReply, data: T, status = 200) =>
	reply.code(status).send({ success: true, data });
