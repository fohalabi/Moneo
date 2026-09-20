import { Prisma, TransactionType as PrismaTransactionType, type PrismaClient } from "../../generated/prisma/client"
import { assertTransactionAmount } from "../domain/money"
import { assertDateOnly, type DateOnly } from "../domain/periods"
import type { TransactionType } from "../domain/transactions"
import { prisma } from "../database/prisma"
import { toDomainTransaction } from "./transactionMapper"
import type {
  CreateTransactionInput,
  ListTransactionsInput,
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

  async create(userId: string, input: CreateTransactionInput) {
    validateCreateInput(input)

    const record = await this.client.transaction.create({
      data: {
        type: toPrismaTransactionType(input.type),
        amount: input.amount,
        date: toDatabaseDate(input.date),
        categoryId: input.categoryId,
        description: input.description,
        userId,
      },
      include: { category: true },
    })

    return toDomainTransaction(record)
  }

  async findById(userId: string, id: string) {
    const record = await this.client.transaction.findFirst({
      where: { id, userId },
      include: { category: true },
    })

    return record ? toDomainTransaction(record) : null
  }

  async listByDateRange(userId: string, start: DateOnly, end: DateOnly) {
    assertDateOnly(start)
    assertDateOnly(end)
    if (start > end) throw new Error("Start date must not be after end date")

    const records = await this.client.transaction.findMany({
      where: { userId, date: { gte: toDatabaseDate(start), lte: toDatabaseDate(end) } },
      include: { category: true },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    })

    return records.map(toDomainTransaction)
  }

  async listPage(userId: string, input: ListTransactionsInput) {
    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(input.from || input.to ? {
        date: {
          ...(input.from ? { gte: toDatabaseDate(input.from) } : {}),
          ...(input.to ? { lte: toDatabaseDate(input.to) } : {}),
        },
      } : {}),
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      ...(input.type ? { type: toPrismaTransactionType(input.type) } : {}),
      ...(input.search ? { description: { contains: input.search, mode: "insensitive" } } : {}),
    }
    const [records, totalItems] = await this.client.$transaction([
      this.client.transaction.findMany({
        where,
        include: { category: true },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      this.client.transaction.count({ where }),
    ])
    return {
      items: records.map(toDomainTransaction),
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / input.pageSize),
      },
    }
  }

  async update(userId: string, id: string, input: UpdateTransactionInput) {
    if (input.type !== undefined && input.type !== "income" && input.type !== "expense") {
      throw new Error("Transaction type must be income or expense")
    }
    if (input.amount !== undefined) assertTransactionAmount(input.amount)
    if (input.date !== undefined) assertDateOnly(input.date)
    if (input.categoryId !== undefined && !input.categoryId.trim()) {
      throw new Error("Category ID is required")
    }

    const owned = await this.client.transaction.findFirst({ where: { id, userId }, select: { id: true } })
    if (!owned) throw new Error("Transaction was not found")
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

  async delete(userId: string, id: string): Promise<void> {
    await this.client.transaction.deleteMany({ where: { id, userId } })
  }
}
