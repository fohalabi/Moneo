import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { randomUUID } from "node:crypto"
import { prisma } from "../../src/database/prisma"
import { AuthService } from "../../src/auth/authService"
import type { Logger } from "../../src/logging/logger"
import { PrismaTransactionRepository } from "../../src/transactions/prismaTransactionRepository"

const testId = randomUUID()
const categoryId = `repository-test-${testId}`
const categoryName = `Repository test ${testId}`
const userId = `repository-user-${testId}`
const repository = new PrismaTransactionRepository(prisma)
const silentLogger: Logger = { debug() {}, info() {}, warn() {}, error() {} }

beforeAll(async () => {
  await prisma.user.create({
    data: { id: userId, email: `${testId}@example.com`, passwordHash: "not-used-in-repository-test" },
  })
  await prisma.category.create({ data: { id: categoryId, name: categoryName, userId } })
})

afterAll(async () => {
  await prisma.transaction.deleteMany({ where: { categoryId } })
  await prisma.category.deleteMany({ where: { id: categoryId } })
  await prisma.user.deleteMany({ where: { id: userId } })
  await prisma.$disconnect()
})

describe("PrismaTransactionRepository", () => {
  test("creates, reads, lists, updates, and deletes a transaction", async () => {
    const created = await repository.create(userId, {
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
    expect(await repository.findById(userId, created.id)).toEqual(created)

    const inRange = await repository.listByDateRange(userId, "2026-09-04", "2026-09-04")
    expect(inRange).toContainEqual(created)

    const updated = await repository.update(userId, created.id, {
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

    await repository.delete(userId, created.id)
    expect(await repository.findById(userId, created.id)).toBeNull()
  })

  test("rejects an inverted date range before querying PostgreSQL", async () => {
    await expect(repository.listByDateRange(userId, "2026-09-05", "2026-09-04")).rejects.toThrow(
      "Start date must not be after end date",
    )
  })

  test("does not expose transactions across users", async () => {
    const otherUser = await prisma.user.create({
      data: { email: `${randomUUID()}@example.com`, passwordHash: "not-used" },
    })
    try {
      const created = await repository.create(userId, {
        type: "expense",
        amount: 2_000,
        date: "2026-09-04",
        categoryId,
      })
      expect(await repository.findById(otherUser.id, created.id)).toBeNull()
      await expect(repository.create(otherUser.id, {
        type: "expense",
        amount: 2_000,
        date: "2026-09-04",
        categoryId,
      })).rejects.toBeDefined()
    } finally {
      await prisma.user.delete({ where: { id: otherUser.id } })
    }
  })

  test("registers a user with categories and manages a revocable session", async () => {
    const auth = new AuthService(silentLogger, prisma)
    const email = `${randomUUID()}@example.com`
    const result = await auth.register(email, "strong-password", "Test User")
    try {
      expect(result.user.email).toBe(email)
      expect(await prisma.category.count({ where: { userId: result.user.id } })).toBe(15)
      expect(await auth.authenticate(result.token)).toEqual(result.user)
      await auth.logout(result.token)
      await expect(auth.authenticate(result.token)).rejects.toMatchObject({ code: "UNAUTHORIZED" })
    } finally {
      await prisma.user.delete({ where: { id: result.user.id } })
    }
  })
})
