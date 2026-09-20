import { describe, expect, test } from "bun:test"
import { createApp } from "../src/app"
import type { AuthService } from "../src/auth/authService"
import type { Category, CategoryRepository } from "../src/categories/categoryRepository"
import type { DateOnly } from "../src/domain/periods"
import type { Transaction } from "../src/domain/transactions"
import type { Logger } from "../src/logging/logger"
import type {
  CreateTransactionInput,
  TransactionRepository,
  UpdateTransactionInput,
} from "../src/transactions/transactionRepository"

const silentLogger: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
}

class MemoryCategoryRepository implements CategoryRepository {
  constructor(private readonly categories: Category[]) {}
  async list(_userId: string) { return [...this.categories].sort((a, b) => a.name.localeCompare(b.name)) }
  async findById(_userId: string, id: string) { return this.categories.find((category) => category.id === id) ?? null }
}

class MemoryTransactionRepository implements TransactionRepository {
  private nextId = 1
  constructor(
    private readonly categories: Category[],
    private records: Transaction[] = [],
  ) {}

  async create(_userId: string, input: CreateTransactionInput) {
    const category = this.categories.find((item) => item.id === input.categoryId)!
    const transaction: Transaction = {
      id: String(this.nextId++),
      ...input,
      categoryName: category.name,
    }
    this.records.push(transaction)
    return transaction
  }

  async findById(_userId: string, id: string) { return this.records.find((item) => item.id === id) ?? null }

  async listByDateRange(_userId: string, start: DateOnly, end: DateOnly) {
    return this.records.filter((item) => item.date >= start && item.date <= end)
  }

  async listPage(_userId: string, input: Parameters<TransactionRepository["listPage"]>[1]) {
    const filtered = this.records.filter((item) =>
      (!input.from || item.date >= input.from)
      && (!input.to || item.date <= input.to)
      && (!input.categoryId || item.categoryId === input.categoryId)
      && (!input.type || item.type === input.type)
      && (!input.search || item.description?.toLowerCase().includes(input.search.toLowerCase())),
    )
    const start = (input.page - 1) * input.pageSize
    return {
      items: filtered.slice(start, start + input.pageSize),
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        totalItems: filtered.length,
        totalPages: Math.ceil(filtered.length / input.pageSize),
      },
    }
  }

  async update(_userId: string, id: string, input: UpdateTransactionInput) {
    const index = this.records.findIndex((item) => item.id === id)
    const existing = this.records[index]!
    const category = input.categoryId
      ? this.categories.find((item) => item.id === input.categoryId)!
      : null
    const description = input.description === null ? undefined : input.description ?? existing.description
    const updated: Transaction = {
      ...existing,
      ...input,
      description,
      categoryName: category?.name ?? existing.categoryName,
    }
    this.records[index] = updated
    return updated
  }

  async delete(_userId: string, id: string) { this.records = this.records.filter((item) => item.id !== id) }
}

const authenticatedUser = { id: "user-1", email: "user@example.com", displayName: null }
const fakeAuth = {
  authenticate: async () => authenticatedUser,
  register: async () => { throw new Error("Not implemented in unit app") },
  login: async () => { throw new Error("Not implemented in unit app") },
  logout: async () => {},
} as unknown as AuthService

function testApp(initialTransactions: Transaction[] = [], enableOpenApi = false) {
  const categories = [
    { id: "food", name: "Food" },
    { id: "salary", name: "Salary" },
  ]
  return createApp({
    transactions: new MemoryTransactionRepository(categories, initialTransactions),
    categories: new MemoryCategoryRepository(categories),
    logger: silentLogger,
    auth: fakeAuth,
    enableOpenApi,
  })
}

describe("Moneo API", () => {
  test("exposes documented routes only when development documentation is enabled", async () => {
    const developmentApp = testApp([], true)
    const documentResponse = await developmentApp.handle(
      new Request("http://localhost/docs/json"),
    )
    const document = (await documentResponse.json()) as {
      info: { title: string }
      paths: Record<string, unknown>
    }

    expect(documentResponse.status).toBe(200)
    expect(document.info.title).toBe("Moneo API")
    expect(Object.keys(document.paths)).toEqual(
      expect.arrayContaining(["/health", "/categories/", "/transactions/", "/insights/monthly"]),
    )

    const uiResponse = await developmentApp.handle(new Request("http://localhost/docs"))
    expect(uiResponse.status).toBe(200)
    const ui = await uiResponse.text()
    expect(ui).toContain('id="api-reference"')
    expect(ui).toContain("@scalar/api-reference")
    expect(ui).not.toContain("SwaggerUIBundle")

    const productionResponse = await testApp().handle(new Request("http://localhost/docs/json"))
    expect(productionResponse.status).toBe(404)
  })

  test("reports health and preserves a supplied request ID", async () => {
    const response = await testApp().handle(
      new Request("http://localhost/health", { headers: { "x-request-id": "request-123" } }),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("x-request-id")).toBe("request-123")
    expect(await response.json()).toEqual({ status: "ok" })
  })

  test("creates and retrieves a manually entered transaction", async () => {
    const app = testApp()
    const createResponse = await app.handle(
      new Request("http://localhost/transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "expense",
          amount: 12_500,
          date: "2026-09-06",
          categoryId: "food",
          description: "Groceries",
        }),
      }),
    )

    expect(createResponse.status).toBe(201)
    const created = (await createResponse.json()) as Transaction
    const getResponse = await app.handle(new Request(`http://localhost/transactions/${created.id}`))
    expect(await getResponse.json()).toEqual(created)
  })

  test("lists categories and returns a safe not-found response", async () => {
    const app = testApp()
    const categoriesResponse = await app.handle(new Request("http://localhost/categories"))
    expect(await categoriesResponse.json()).toEqual([
      { id: "food", name: "Food" },
      { id: "salary", name: "Salary" },
    ])

    const missingResponse = await app.handle(
      new Request("http://localhost/transactions/missing"),
    )
    const missingBody = (await missingResponse.json()) as { error: { code: string } }
    expect(missingResponse.status).toBe(404)
    expect(missingBody.error.code).toBe("NOT_FOUND")
  })

  test("returns a consistent validation error without exposing request data", async () => {
    const response = await testApp().handle(
      new Request("http://localhost/transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "expense", amount: 0, date: "bad", categoryId: "food" }),
      }),
    )
    const body = (await response.json()) as { error: { code: string; requestId: string } }

    expect(response.status).toBe(400)
    expect(body.error.code).toBe("VALIDATION_ERROR")
    expect(response.headers.get("x-request-id")).toBe(body.error.requestId)
  })

  test("returns first-month facts, daily pace, categories, and projection without comparison", async () => {
    const response = await testApp([
      {
        id: "income-1",
        type: "income",
        amount: 300_000,
        date: "2026-09-01",
        categoryId: "salary",
        categoryName: "Salary",
      },
      {
        id: "expense-1",
        type: "expense",
        amount: 60_000,
        date: "2026-09-03",
        categoryId: "food",
        categoryName: "Food",
      },
    ]).handle(new Request("http://localhost/insights/monthly?month=2026-09&asOf=2026-09-06"))
    const body = (await response.json()) as {
      facts: {
        historyStatus: string
        comparison: unknown
        summary: { spent: number }
        projection: { spent: number }
        categories: Array<{ name: string }>
        dailySpending: Array<{ cumulativeSpent: number }>
      }
      insights: Array<{ id: string }>
    }
    const { facts } = body

    expect(response.status).toBe(200)
    expect(facts.historyStatus).toBe("unavailable")
    expect(facts.comparison).toBeNull()
    expect(facts.summary.spent).toBe(60_000)
    expect(facts.projection.spent).toBe(300_000)
    expect(facts.categories[0]?.name).toBe("Food")
    expect(facts.dailySpending).toHaveLength(6)
    expect(facts.dailySpending[5]?.cumulativeSpent).toBe(60_000)
    expect(body.insights.some((insight) => insight.id === "baseline-no-history")).toBe(true)
  })
})
