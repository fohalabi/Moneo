import type { CategoryRepository } from "../categories/categoryRepository"
import { notFoundError, validationError } from "../errors/appError"
import type { Logger } from "../logging/logger"
import { assertTransactionAmount } from "../domain/money"
import { assertDateOnly, type DateOnly } from "../domain/periods"
import type { TransactionType } from "../domain/transactions"
import type {
  CreateTransactionInput,
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

  async create(input: CreateTransactionInput) {
    this.validateInput(input)
    await this.requireCategory(input.categoryId)
    const transaction = await this.transactions.create(input)
    this.logger.info("Transaction created", { transactionId: transaction.id, type: transaction.type })
    return transaction
  }

  async findById(id: string) {
    const transaction = await this.transactions.findById(id)
    if (!transaction) throw notFoundError("Transaction")
    return transaction
  }

  async list(start: DateOnly, end: DateOnly) {
    try {
      assertDateOnly(start)
      assertDateOnly(end)
    } catch (error) {
      throw validationError(error instanceof Error ? error.message : "Invalid date range")
    }
    if (start > end) throw validationError("Start date must not be after end date")
    return this.transactions.listByDateRange(start, end)
  }

  async update(id: string, input: UpdateTransactionInput) {
    await this.findById(id)
    this.validateInput(input)
    if (input.categoryId !== undefined) await this.requireCategory(input.categoryId)

    const transaction = await this.transactions.update(id, input)
    this.logger.info("Transaction updated", { transactionId: transaction.id })
    return transaction
  }

  async delete(id: string): Promise<void> {
    await this.findById(id)
    await this.transactions.delete(id)
    this.logger.info("Transaction deleted", { transactionId: id })
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

  private async requireCategory(categoryId: string): Promise<void> {
    if (!(await this.categories.findById(categoryId))) throw validationError("Category does not exist")
  }
}
