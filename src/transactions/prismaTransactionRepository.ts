import { TransactionType as PrismaTransactionType, type PrismaClient } from "../../generated/prisma/client"
import { assertTransactionAmount } from "../domain/money"
import { assertDateOnly, type DateOnly } from "../domain/periods"
import type { TransactionType } from "../domain/transactions"
import { prisma } from "../database/prisma"
import { toDomainTransaction } from "./transactionMapper"
import type {
  CreateTransactionInput,
  TransactionRepository,
  UpdateTransactionInput,
} from "./transactionRepository"

/** Converts a date-only domain value to the UTC date expected by Prisma's PostgreSQL adapter. */
function toDatabaseDate(date: DateOnly): Date {
  return new Date(`${date}T00:00:00.000Z`)
}

/** Maps the domain transaction direction to the generated Prisma enum. */
function toPrismaTransactionType(type: TransactionType): PrismaTransactionType {
  return type === "income" ? PrismaTransactionType.INCOME : PrismaTransactionType.EXPENSE
}

/** Validates repository input before it can reach the database. */
function validateCreateInput(input: CreateTransactionInput): void {
  if (input.type !== "income" && input.type !== "expense") {
    throw new Error("Transaction type must be income or expense")
  }
  assertTransactionAmount(input.amount)
  assertDateOnly(input.date)
  if (!input.categoryId.trim()) throw new Error("Category ID is required")
}

/** Stores transactions with their category so returned records satisfy the domain contract. */
export class PrismaTransactionRepository implements TransactionRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  async create(input: CreateTransactionInput) {
    validateCreateInput(input)

    const record = await this.client.transaction.create({
      data: {
        type: toPrismaTransactionType(input.type),
        amount: input.amount,
        date: toDatabaseDate(input.date),
        categoryId: input.categoryId,
        description: input.description,
      },
      include: { category: true },
    })

    return toDomainTransaction(record)
  }

  async findById(id: string) {
    const record = await this.client.transaction.findUnique({
      where: { id },
      include: { category: true },
    })

    return record ? toDomainTransaction(record) : null
  }

  async listByDateRange(start: DateOnly, end: DateOnly) {
    assertDateOnly(start)
    assertDateOnly(end)
    if (start > end) throw new Error("Start date must not be after end date")

    const records = await this.client.transaction.findMany({
      where: { date: { gte: toDatabaseDate(start), lte: toDatabaseDate(end) } },
      include: { category: true },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    })

    return records.map(toDomainTransaction)
  }

  async update(id: string, input: UpdateTransactionInput) {
    if (input.type !== undefined && input.type !== "income" && input.type !== "expense") {
      throw new Error("Transaction type must be income or expense")
    }
    if (input.amount !== undefined) assertTransactionAmount(input.amount)
    if (input.date !== undefined) assertDateOnly(input.date)
    if (input.categoryId !== undefined && !input.categoryId.trim()) {
      throw new Error("Category ID is required")
    }

    const record = await this.client.transaction.update({
      where: { id },
      data: {
        type: input.type === undefined ? undefined : toPrismaTransactionType(input.type),
        amount: input.amount,
        date: input.date === undefined ? undefined : toDatabaseDate(input.date),
        categoryId: input.categoryId,
        description: input.description,
      },
      include: { category: true },
    })

    return toDomainTransaction(record)
  }

  async delete(id: string): Promise<void> {
    await this.client.transaction.delete({ where: { id } })
  }
}
