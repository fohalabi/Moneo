export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR"

/** Represents an expected application failure that is safe to translate into an HTTP response. */
export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = "AppError"
  }
}

export function validationError(message: string, details?: unknown): AppError {
  return new AppError("VALIDATION_ERROR", message, 400, details)
}

export function notFoundError(resource: string): AppError {
  return new AppError("NOT_FOUND", `${resource} was not found`, 404)
}
