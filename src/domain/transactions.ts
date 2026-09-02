import { assertTransactionAmount, type Money } from "./money"
import { assertDateOnly, type DateOnly } from "./periods"

export type TransactionType = "income" | "expense"

export type Transaction = {
  id: string
  type: TransactionType
  amount: Money
  date: DateOnly
  categoryId: string
  categoryName: string
  description?: string
}

/** Validates domain invariants at the boundary before a transaction reaches storage. */
export function validateTransaction(transaction: Transaction): void {
  if (!transaction.id.trim()) throw new Error("Transaction ID is required")
  if (transaction.type !== "income" && transaction.type !== "expense") {
    throw new Error("Transaction type must be income or expense")
  }

  assertTransactionAmount(transaction.amount)
  assertDateOnly(transaction.date)

  if (!transaction.categoryId.trim()) throw new Error("Category ID is required")
  if (!transaction.categoryName.trim()) throw new Error("Category name is required")
}
