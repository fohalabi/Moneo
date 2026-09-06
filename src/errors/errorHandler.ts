import { AppError } from "./appError"

export type ErrorResponse = {
  status: number
  body: {
    error: {
      code: string
      message: string
      requestId: string
      details?: unknown
    }
  }
  expected: boolean
}

/** Converts framework, application, and database failures into a safe public response. */
export function toErrorResponse(error: unknown, frameworkCode: string, requestId: string): ErrorResponse {
  if (error instanceof AppError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message,
          requestId,
          ...(error.details === undefined ? {} : { details: error.details }),
        },
      },
      expected: true,
    }
  }

  if (frameworkCode === "VALIDATION" || frameworkCode === "PARSE") {
    return {
      status: 400,
      body: {
        error: {
          code: "VALIDATION_ERROR",
          message: "The request contains invalid data",
          requestId,
        },
      },
      expected: true,
    }
  }

  if (frameworkCode === "NOT_FOUND") {
    return {
      status: 404,
      body: { error: { code: "NOT_FOUND", message: "Route was not found", requestId } },
      expected: true,
    }
  }

  const databaseCode =
    typeof error === "object" && error !== null && "code" in error ? String(error.code) : null
  if (databaseCode === "P2002") {
    return {
      status: 409,
      body: { error: { code: "CONFLICT", message: "The record already exists", requestId } },
      expected: true,
    }
  }
  if (databaseCode === "P2003") {
    return {
      status: 400,
      body: {
        error: { code: "VALIDATION_ERROR", message: "A related record is invalid", requestId },
      },
      expected: true,
    }
  }
  if (databaseCode === "P2025") {
    return {
      status: 404,
      body: { error: { code: "NOT_FOUND", message: "Record was not found", requestId } },
      expected: true,
    }
  }

  return {
    status: 500,
    body: {
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred", requestId },
    },
    expected: false,
  }
}
