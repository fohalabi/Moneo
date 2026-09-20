import { Elysia, t } from "elysia"
import { sessionToken } from "../auth/authRoutes"
import type { AuthService } from "../auth/authService"
import type { DateOnly } from "../domain/periods"
import type { CreateTransactionInput, UpdateTransactionInput } from "./transactionRepository"
import type { TransactionService } from "./transactionService"

const transactionBody = t.Object({
  type: t.Union([t.Literal("income"), t.Literal("expense")], {
    description: "Whether money entered or left the user's finances",
  }),
  amount: t.Integer({ minimum: 1, description: "Positive amount in minor units, such as kobo" }),
  date: t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "Transaction date in YYYY-MM-DD format" }),
  categoryId: t.String({ minLength: 1, description: "Stable category ID from GET /categories" }),
  description: t.Optional(t.String({ description: "Optional private transaction note" })),
}, { description: "A manually entered income or expense transaction" })

/** Defines the V1 manual transaction CRUD endpoints. */
export function createTransactionRoutes(service: TransactionService, auth: AuthService) {
  return new Elysia({ prefix: "/transactions" })
    .post(
      "/",
      async ({ body, request, set }) => {
        const user = await auth.authenticate(sessionToken(request))
        const transaction = await service.create(user.id, body as CreateTransactionInput)
        set.status = 201
        return transaction
      },
      {
        body: transactionBody,
        detail: {
          tags: ["Transactions"],
          summary: "Create a transaction",
          description: "Records one manually entered income or expense transaction.",
        },
      },
    )
    .get(
      "/",
      async ({ query, request }) => {
        const user = await auth.authenticate(sessionToken(request))
        return service.listPage(user.id, {
          from: query.from as DateOnly | undefined,
          to: query.to as DateOnly | undefined,
          categoryId: query.categoryId,
          type: query.type,
          search: query.search?.trim() || undefined,
          page: query.page ?? 1,
          pageSize: query.pageSize ?? 50,
        })
      },
      {
        query: t.Object({
          from: t.Optional(t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "Inclusive start date" })),
          to: t.Optional(t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "Inclusive end date" })),
          categoryId: t.Optional(t.String({ minLength: 1 })),
          type: t.Optional(t.Union([t.Literal("income"), t.Literal("expense")])),
          search: t.Optional(t.String({ maxLength: 200 })),
          page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
          pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 50 })),
        }),
        detail: {
          tags: ["Transactions"],
          summary: "List and filter transactions",
          description: "Returns newest transactions first with bounded pagination.",
        },
      },
    )
    .get("/:id", async ({ params, request }) => {
      const user = await auth.authenticate(sessionToken(request))
      return service.findById(user.id, params.id)
    }, {
      params: t.Object({ id: t.String({ minLength: 1, description: "Transaction ID" }) }),
      detail: { tags: ["Transactions"], summary: "Get a transaction" },
    })
    .patch(
      "/:id",
      async ({ params, body, request }) => {
        const user = await auth.authenticate(sessionToken(request))
        return service.update(user.id, params.id, body as UpdateTransactionInput)
      },
      {
        params: t.Object({ id: t.String({ minLength: 1 }) }),
        body: t.Partial(
          t.Object({
            type: t.Union([t.Literal("income"), t.Literal("expense")]),
            amount: t.Integer({ minimum: 1 }),
            date: t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
            categoryId: t.String({ minLength: 1 }),
            description: t.Union([t.String(), t.Null()]),
          }),
        ),
        detail: {
          tags: ["Transactions"],
          summary: "Update a transaction",
          description: "Updates only the supplied transaction fields. Set description to null to clear it.",
        },
      },
    )
    .delete("/:id", async ({ params, request, set }) => {
      const user = await auth.authenticate(sessionToken(request))
      await service.delete(user.id, params.id)
      set.status = 204
    }, {
      params: t.Object({ id: t.String({ minLength: 1, description: "Transaction ID" }) }),
      detail: { tags: ["Transactions"], summary: "Delete a transaction" },
    })
}
