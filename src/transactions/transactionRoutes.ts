import { Elysia, t } from "elysia"
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
export function createTransactionRoutes(service: TransactionService) {
  return new Elysia({ prefix: "/transactions" })
    .post(
      "/",
      async ({ body, set }) => {
        const transaction = await service.create(body as CreateTransactionInput)
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
      ({ query }) => service.list(query.from as DateOnly, query.to as DateOnly),
      {
        query: t.Object({
          from: t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "Inclusive start date" }),
          to: t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "Inclusive end date" }),
        }),
        detail: {
          tags: ["Transactions"],
          summary: "List transactions by date range",
        },
      },
    )
    .get("/:id", ({ params }) => service.findById(params.id), {
      params: t.Object({ id: t.String({ minLength: 1, description: "Transaction ID" }) }),
      detail: { tags: ["Transactions"], summary: "Get a transaction" },
    })
    .patch(
      "/:id",
      ({ params, body }) => service.update(params.id, body as UpdateTransactionInput),
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
    .delete("/:id", async ({ params, set }) => {
      await service.delete(params.id)
      set.status = 204
    }, {
      params: t.Object({ id: t.String({ minLength: 1, description: "Transaction ID" }) }),
      detail: { tags: ["Transactions"], summary: "Delete a transaction" },
    })
}
