import type { Prisma } from "../../generated/prisma/client"
import type { DateOnly } from "../domain/periods"
import type { Transaction, TransactionType } from "../domain/transactions"

export type TransactionRecord = Prisma.TransactionGetPayload<{
  include: { category: true }
}>

/** Converts a persisted Prisma record into the database-independent domain shape. */
export function toDomainTransaction(record: TransactionRecord): Transaction {
  const transaction: Transaction = {
    id: record.id,
    type: record.type.toLowerCase() as TransactionType,
    amount: record.amount,
    date: record.date.toISOString().slice(0, 10) as DateOnly,
    categoryId: record.categoryId,
    categoryName: record.category.name,
  }

  if (record.description !== null) transaction.description = record.description

  return transaction
}
