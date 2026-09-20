import { randomUUID } from "node:crypto"
import { openapi } from "@elysia/openapi"
import { ScalarRender } from "@elysia/openapi/scalar"
import { Elysia } from "elysia"
import { createAuthRoutes } from "./auth/authRoutes"
import type { AuthService } from "./auth/authService"
import type { CategoryRepository } from "./categories/categoryRepository"
import { createCategoryRoutes } from "./categories/categoryRoutes"
import { toErrorResponse } from "./errors/errorHandler"
import { payloadTooLargeError } from "./errors/appError"
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
  auth: AuthService
  enableOpenApi?: boolean
  secureCookies?: boolean
  readiness?: () => Promise<void>
}

const apiInfo = {
  title: "Moneo API",
  version: "1.0.0",
  description: "Personal cash-flow tracking, monthly analysis, and deterministic financial insights.",
}

/** Renders Scalar explicitly so the docs UI does not depend on the plugin's provider selection. */
function scalarDocsResponse(): Response {
  return new Response(
    ScalarRender(apiInfo, {
      url: "/docs/json",
      cdn: "https://cdn.jsdelivr.net/npm/@scalar/api-reference@latest/dist/browser/standalone.min.js",
      layout: "modern",
      _integration: "elysiajs",
    }),
    { headers: { "content-type": "text/html; charset=utf-8" } },
  )
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
export function createApp({
  transactions,
  categories,
  logger,
  auth,
  enableOpenApi = false,
  secureCookies = false,
  readiness = async () => {},
}: AppDependencies) {
  const transactionService = new TransactionService(transactions, categories, logger)
  const insightService = new InsightService(transactions, logger)
  const app = new Elysia()

  if (enableOpenApi) {
    app.use(
      openapi({
        path: "/docs",
        provider: null,
        documentation: {
          info: apiInfo,
          tags: [
            { name: "System", description: "Backend health and readiness" },
            { name: "Authentication", description: "Registration and cookie sessions" },
            { name: "Categories", description: "Transaction categories" },
            { name: "Transactions", description: "Manual income and expense records" },
            { name: "Insights", description: "Monthly facts and financial explanations" },
          ],
          components: {
            securitySchemes: {
              sessionCookie: { type: "apiKey", in: "cookie", name: "moneo_session" },
            },
          },
        },
      }),
    )
    app.get("/docs", scalarDocsResponse, { detail: { hide: true } })
  }

  return app
    .onBeforeHandle(({ request }) => {
      const contentLength = Number(request.headers.get("content-length") ?? 0)
      if (Number.isFinite(contentLength) && contentLength > 1_000_000) throw payloadTooLargeError()
    })
    .onAfterHandle(({ set }) => {
      set.headers["x-content-type-options"] = "nosniff"
      set.headers["x-frame-options"] = "DENY"
      set.headers["referrer-policy"] = "no-referrer"
    })
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
    .get("/health", () => ({ status: "ok" }), {
      detail: { tags: ["System"], summary: "Check API health" },
    })
    .get("/ready", async () => {
      await readiness()
      return { status: "ready" }
    }, { detail: { tags: ["System"], summary: "Check API and database readiness" } })
    .use(createAuthRoutes(auth, secureCookies))
    .use(createCategoryRoutes(categories, auth))
    .use(createTransactionRoutes(transactionService, auth))
    .use(createInsightRoutes(insightService, auth))
}
