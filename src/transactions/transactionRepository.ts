import type { Money } from "../domain/money"
import type { DateOnly } from "../domain/periods"
import type { Transaction, TransactionType } from "../domain/transactions"

export type CreateTransactionInput = {
  type: TransactionType
  amount: Money
  date: DateOnly
  categoryId: string
  description?: string
}

export type UpdateTransactionInput = Partial<Omit<CreateTransactionInput, "description">> & {
  description?: string | null
}

/** Defines the persistence operations required by transaction services and insights. */
export interface TransactionRepository {
  create(input: CreateTransactionInput): Promise<Transaction>
  findById(id: string): Promise<Transaction | null>
  listByDateRange(start: DateOnly, end: DateOnly): Promise<Transaction[]>
  update(id: string, input: UpdateTransactionInput): Promise<Transaction>
  delete(id: string): Promise<void>
}
