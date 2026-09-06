import { Elysia, t } from "elysia"
import type { DateOnly } from "../domain/periods"
import type { CreateTransactionInput, UpdateTransactionInput } from "./transactionRepository"
import type { TransactionService } from "./transactionService"

const transactionBody = t.Object({
  type: t.Union([t.Literal("income"), t.Literal("expense")]),
  amount: t.Integer({ minimum: 1 }),
  date: t.String(),
  categoryId: t.String({ minLength: 1 }),
  description: t.Optional(t.String()),
})

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
      { body: transactionBody },
    )
    .get(
      "/",
      ({ query }) => service.list(query.from as DateOnly, query.to as DateOnly),
      { query: t.Object({ from: t.String(), to: t.String() }) },
    )
    .get("/:id", ({ params }) => service.findById(params.id), {
      params: t.Object({ id: t.String({ minLength: 1 }) }),
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
            date: t.String(),
            categoryId: t.String({ minLength: 1 }),
            description: t.Union([t.String(), t.Null()]),
          }),
        ),
      },
    )
    .delete("/:id", async ({ params, set }) => {
      await service.delete(params.id)
      set.status = 204
    }, { params: t.Object({ id: t.String({ minLength: 1 }) }) })
}
