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

export type ListTransactionsInput = {
  from?: DateOnly
  to?: DateOnly
  categoryId?: string
  type?: TransactionType
  search?: string
  page: number
  pageSize: number
}

export type TransactionPage = {
  items: Transaction[]
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number }
}

/** Defines the persistence operations required by transaction services and insights. */
export interface TransactionRepository {
  create(userId: string, input: CreateTransactionInput): Promise<Transaction>
  findById(userId: string, id: string): Promise<Transaction | null>
  listByDateRange(userId: string, start: DateOnly, end: DateOnly): Promise<Transaction[]>
  listPage(userId: string, input: ListTransactionsInput): Promise<TransactionPage>
  update(userId: string, id: string, input: UpdateTransactionInput): Promise<Transaction>
  delete(userId: string, id: string): Promise<void>
}
