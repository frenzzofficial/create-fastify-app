import type { FastifyRequest } from "fastify";
import type { ZodType } from "zod";

import { AppError } from "./errors.js";

type RequestPart = "body" | "query" | "params";

// Zod validation as a Fastify `preHandler`. On success the parsed (coerced, stripped)
// value replaces the raw one; on failure a 422 AppError goes through the shared error handler.
export const validate =
	<T>(part: RequestPart, schema: ZodType<T>) =>
	async (request: FastifyRequest): Promise<void> => {
		const result = schema.safeParse(request[part]);

		if (!result.success) {
			const detail = result.error.issues
				.map((issue) => `${issue.path.map(String).join(".") || part}: ${issue.message}`)
				.join("; ");
			throw AppError.unprocessable(detail);
		}

		request[part] = result.data;
	};
