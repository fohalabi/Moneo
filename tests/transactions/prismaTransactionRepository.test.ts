import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { randomUUID } from "node:crypto"
import { prisma } from "../../src/database/prisma"
import { PrismaTransactionRepository } from "../../src/transactions/prismaTransactionRepository"

const testId = randomUUID()
const categoryId = `repository-test-${testId}`
const categoryName = `Repository test ${testId}`
const repository = new PrismaTransactionRepository(prisma)

beforeAll(async () => {
  await prisma.category.create({ data: { id: categoryId, name: categoryName } })
})

afterAll(async () => {
  await prisma.transaction.deleteMany({ where: { categoryId } })
  await prisma.category.deleteMany({ where: { id: categoryId } })
  await prisma.$disconnect()
})

describe("PrismaTransactionRepository", () => {
  test("creates, reads, lists, updates, and deletes a transaction", async () => {
    const created = await repository.create({
      type: "expense",
      amount: 12_500,
      date: "2026-09-04",
      categoryId,
      description: "Repository integration test",
    })

    expect(created).toMatchObject({
      type: "expense",
      amount: 12_500,
      date: "2026-09-04",
      categoryId,
      categoryName,
      description: "Repository integration test",
    })
    expect(await repository.findById(created.id)).toEqual(created)

    const inRange = await repository.listByDateRange("2026-09-04", "2026-09-04")
    expect(inRange).toContainEqual(created)

    const updated = await repository.update(created.id, {
      type: "income",
      amount: 15_000,
      date: "2026-09-05",
      description: null,
    })
    expect(updated).toMatchObject({
      id: created.id,
      type: "income",
      amount: 15_000,
      date: "2026-09-05",
      categoryId,
      categoryName,
    })
    expect(updated.description).toBeUndefined()

    await repository.delete(created.id)
    expect(await repository.findById(created.id)).toBeNull()
  })

  test("rejects an inverted date range before querying PostgreSQL", async () => {
    await expect(repository.listByDateRange("2026-09-05", "2026-09-04")).rejects.toThrow(
      "Start date must not be after end date",
    )
  })
})
