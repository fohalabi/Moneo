import { randomUUID } from "node:crypto"
import { Elysia } from "elysia"
import type { CategoryRepository } from "./categories/categoryRepository"
import { createCategoryRoutes } from "./categories/categoryRoutes"
import { toErrorResponse } from "./errors/errorHandler"
import { createInsightRoutes } from "./Insight/insightRoutes"
import { InsightService } from "./Insight/insightService"
import type { Logger } from "./logging/logger"
import { createTransactionRoutes } from "./transactions/transactionRoutes"
import type { TransactionRepository } from "./transactions/transactionRepository"
import { TransactionService } from "./transactions/transactionService"

export type AppDependencies = {
  transactions: TransactionRepository
  categories: CategoryRepository
  logger: Logger
}

/** Extracts a log-safe path without allowing malformed lifecycle input to break the app. */
function requestPath(request: Request): string {
  try {
    return new URL(request.url).pathname
  } catch {
    return "unknown"
  }
}

/** Composes the HTTP application without listening, allowing fast in-process route tests. */
export function createApp({ transactions, categories, logger }: AppDependencies) {
  const transactionService = new TransactionService(transactions, categories, logger)
  const insightService = new InsightService(transactions, logger)

  return new Elysia()
    .derive(({ request, set }) => {
      const suppliedRequestId = request.headers.get("x-request-id")
      const requestId = suppliedRequestId?.slice(0, 100) || randomUUID()
      set.headers["x-request-id"] = requestId
      return { requestId, requestStartedAt: performance.now(), requestPath: requestPath(request) }
    })
    .onError(({ code, error, requestId, request, set }) => {
      const effectiveRequestId = requestId ?? randomUUID()
      set.headers["x-request-id"] = effectiveRequestId
      const response = toErrorResponse(error, String(code), effectiveRequestId)
      set.status = response.status

      const context = {
        requestId: effectiveRequestId,
        method: request.method,
        path: requestPath(request),
      }
      if (response.expected) logger.warn("Request failed", { ...context, errorCode: response.body.error.code })
      else logger.error("Unexpected request failure", error, context)

      return response.body
    })
    .onAfterResponse(({ request, requestId, requestStartedAt, requestPath, set }) => {
      logger.info("Request completed", {
        requestId,
        method: request.method,
        path: requestPath,
        status: set.status ?? 200,
        durationMs: Math.round((performance.now() - requestStartedAt) * 100) / 100,
      })
    })
    .get("/health", () => ({ status: "ok" }))
    .use(createCategoryRoutes(categories))
    .use(createTransactionRoutes(transactionService))
    .use(createInsightRoutes(insightService))
}
