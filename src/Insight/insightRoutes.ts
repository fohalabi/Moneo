import { Elysia, t } from "elysia"
import { sessionToken } from "../auth/authRoutes"
import type { AuthService } from "../auth/authService"
import type { DateOnly } from "../domain/periods"
import type { InsightService } from "./insightService"

/** Exposes computed monthly facts while leaving all calculations in the insight engine. */
export function createInsightRoutes(service: InsightService, auth: AuthService) {
  return new Elysia({ prefix: "/insights" }).get(
    "/monthly",
    async ({ query, request }) => {
      const user = await auth.authenticate(sessionToken(request))
      return service.monthly(user.id, query.month, query.asOf as DateOnly)
    },
    {
      query: t.Object({
        month: t.String({ pattern: "^\\d{4}-(0[1-9]|1[0-2])$", description: "Month in YYYY-MM format" }),
        asOf: t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "Inclusive date in YYYY-MM-DD format" }),
      }),
      detail: {
        tags: ["Insights"],
        summary: "Get monthly financial insights",
        description: "Returns raw calculated facts and deterministic explanations through the requested date.",
      },
    },
  )
}
