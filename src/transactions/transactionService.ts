import type { CategoryRepository } from "../categories/categoryRepository"
import { notFoundError, validationError } from "../errors/appError"
import type { Logger } from "../logging/logger"
import { assertTransactionAmount } from "../domain/money"
import { assertDateOnly, type DateOnly } from "../domain/periods"
import type { TransactionType } from "../domain/transactions"
import type {
  CreateTransactionInput,
  ListTransactionsInput,
  TransactionRepository,
  UpdateTransactionInput,
} from "./transactionRepository"

/** Coordinates transaction rules and persistence without depending on HTTP or Prisma. */
export class TransactionService {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly categories: CategoryRepository,
    private readonly logger: Logger,
  ) {}

  async create(userId: string, input: CreateTransactionInput) {
    this.validateInput(input)
    await this.requireCategory(userId, input.categoryId)
    const transaction = await this.transactions.create(userId, input)
    this.logger.info("Transaction created", { userId, transactionId: transaction.id, type: transaction.type })
    return transaction
  }

  async findById(userId: string, id: string) {
    const transaction = await this.transactions.findById(userId, id)
    if (!transaction) throw notFoundError("Transaction")
    return transaction
  }

  async list(userId: string, start: DateOnly, end: DateOnly) {
    try {
      assertDateOnly(start)
      assertDateOnly(end)
    } catch (error) {
      throw validationError(error instanceof Error ? error.message : "Invalid date range")
    }
    if (start > end) throw validationError("Start date must not be after end date")
    return this.transactions.listByDateRange(userId, start, end)
  }

  async listPage(userId: string, input: ListTransactionsInput) {
    try {
      if (input.from) assertDateOnly(input.from)
      if (input.to) assertDateOnly(input.to)
    } catch (error) {
      throw validationError(error instanceof Error ? error.message : "Invalid date range")
    }
    if (input.from && input.to && input.from > input.to) {
      throw validationError("Start date must not be after end date")
    }
    return this.transactions.listPage(userId, input)
  }

  async update(userId: string, id: string, input: UpdateTransactionInput) {
    await this.findById(userId, id)
    this.validateInput(input)
    if (input.categoryId !== undefined) await this.requireCategory(userId, input.categoryId)

    const transaction = await this.transactions.update(userId, id, input)
    this.logger.info("Transaction updated", { userId, transactionId: transaction.id })
    return transaction
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.findById(userId, id)
    await this.transactions.delete(userId, id)
    this.logger.info("Transaction deleted", { userId, transactionId: id })
  }

  private validateInput(input: {
    type?: TransactionType
    amount?: number
    date?: DateOnly
    categoryId?: string
  }): void {
    try {
      if (input.type !== undefined && input.type !== "income" && input.type !== "expense") {
        throw new Error("Transaction type must be income or expense")
      }
      if (input.amount !== undefined) assertTransactionAmount(input.amount)
      if (input.date !== undefined) assertDateOnly(input.date)
      if (input.categoryId !== undefined && !input.categoryId.trim()) {
        throw new Error("Category ID is required")
      }
    } catch (error) {
      throw validationError(error instanceof Error ? error.message : "Invalid transaction")
    }
  }

  private async requireCategory(userId: string, categoryId: string): Promise<void> {
    if (!(await this.categories.findById(userId, categoryId))) throw validationError("Category does not exist")
  }
}
