// AppError is the ONLY error type thrown from services.
//
// isOperational = true  → Safe, user-facing error.
// isOperational = false → Unexpected/programming error; log and return 500.

export class AppError extends Error {
	readonly statusCode: number;
	readonly isOperational: boolean;

	constructor(message: string, statusCode: number, isOperational = true) {
		super(message);

		this.name = "AppError";
		this.statusCode = statusCode;
		this.isOperational = isOperational;

		// Restore prototype chain when extending built-in Error.
		Object.setPrototypeOf(this, new.target.prototype);

		// Preserve useful stack traces in supported JavaScript runtimes.
		Error.captureStackTrace?.(this, new.target);
	}

	// ── Static factories ──────────────────────────────────────

	static unauthorized(message = "Unauthorized"): AppError {
		return new AppError(message, 401);
	}

	static forbidden(message = "Forbidden"): AppError {
		return new AppError(message, 403);
	}

	static notFound(message = "Not found"): AppError {
		return new AppError(message, 404);
	}

	static conflict(message = "Conflict"): AppError {
		return new AppError(message, 409);
	}

	static badRequest(message = "Bad request"): AppError {
		return new AppError(message, 400);
	}

	static unprocessable(message = "Validation failed"): AppError {
		return new AppError(message, 422);
	}

	static tooManyRequests(message = "Too many requests, please try again later"): AppError {
		return new AppError(message, 429);
	}

	static payloadTooLarge(message = "Request body too large"): AppError {
		return new AppError(message, 413);
	}

	static internal(message = "Internal server error"): AppError {
		return new AppError(message, 500, false);
	}
}
