import { Elysia, t } from "elysia"
import type { DateOnly } from "../domain/periods"
import type { InsightService } from "./insightService"

/** Exposes computed monthly facts while leaving all calculations in the insight engine. */
export function createInsightRoutes(service: InsightService) {
  return new Elysia({ prefix: "/insights" }).get(
    "/monthly",
    ({ query }) => service.monthly(query.month, query.asOf as DateOnly),
    { query: t.Object({ month: t.String(), asOf: t.String() }) },
  )
}
