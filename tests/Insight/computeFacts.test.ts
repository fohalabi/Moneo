import { describe, expect, test } from "bun:test"
import { computeFacts } from "../../src/Insight/computeFacts"
import type { DateOnly } from "../../src/domain/periods"
import type { Transaction } from "../../src/domain/transactions"

function transaction(
  id: string,
  type: "income" | "expense",
  amount: number,
  date: DateOnly,
  categoryId: string,
  categoryName: string,
): Transaction {
  return { id, type, amount, date, categoryId, categoryName }
}

describe("current period facts", () => {
  test("calculates totals, category shares, and a live projection", () => {
    const transactions = [
      transaction("1", "income", 300_000, "2026-09-01", "salary", "Salary"),
      transaction("2", "expense", 60_000, "2026-09-03", "food", "Food"),
      transaction("3", "expense", 30_000, "2026-09-10", "transport", "Transport"),
    ]

    const facts = computeFacts(transactions, "2026-09", "2026-09-15")

    expect(facts.summary).toEqual({
      income: 300_000,
      spent: 90_000,
      net: 210_000,
      averageDailySpend: 6_000,
    })
    expect(facts.projection).toEqual({ spent: 180_000, net: 120_000 })
    expect(facts.categories.map(({ comparison, ...category }) => category)).toEqual([
      {
        categoryId: "food",
        name: "Food",
        spent: 60_000,
        percentageOfSpending: 100 * (2 / 3),
        percentageOfIncome: 20,
      },
      {
        categoryId: "transport",
        name: "Transport",
        spent: 30_000,
        percentageOfSpending: (30_000 / 90_000) * 100,
        percentageOfIncome: 10,
      },
    ])
    expect(facts.categories.every((category) => category.comparison === null)).toBe(true)
  })

  test("ignores other months and transactions after the as-of date", () => {
    const transactions = [
      transaction("1", "expense", 10_000, "2026-08-31", "food", "Food"),
      transaction("2", "expense", 20_000, "2026-09-10", "food", "Food"),
      transaction("3", "expense", 40_000, "2026-09-16", "food", "Food"),
      transaction("4", "expense", 80_000, "2026-10-01", "food", "Food"),
    ]

    expect(computeFacts(transactions, "2026-09", "2026-09-15").summary.spent).toBe(20_000)
  })

  test("returns safe empty-period values", () => {
    const facts = computeFacts([], "2026-09", "2026-09-15")

    expect(facts.summary).toEqual({ income: 0, spent: 0, net: 0, averageDailySpend: 0 })
    expect(facts.categories).toEqual([])
    expect(facts.comparison).toBeNull()
    expect(facts.drivers).toEqual([])
  })

  test("does not project a completed historical month", () => {
    const facts = computeFacts([], "2026-08", "2026-09-15")

    expect(facts.period.isComplete).toBe(true)
    expect(facts.period.throughDay).toBe(31)
    expect(facts.projection).toBeNull()
  })

  test("rejects a selected month after the as-of date", () => {
    expect(() => computeFacts([], "2026-10", "2026-09-15")).toThrow(
      "Selected month cannot be after the as-of date",
    )
  })

  test("sorts equal category totals alphabetically for stable output", () => {
    const transactions = [
      transaction("1", "expense", 1_000, "2026-09-01", "transport", "Transport"),
      transaction("2", "expense", 1_000, "2026-09-02", "food", "Food"),
    ]

    const facts = computeFacts(transactions, "2026-09", "2026-09-15")

    expect(facts.categories.map((category) => category.name)).toEqual(["Food", "Transport"])
  })
})

describe("same-point previous-month comparison", () => {
  test("compares totals and categories through the equivalent day", () => {
    const transactions = [
      transaction("1", "income", 300_000, "2026-08-01", "salary", "Salary"),
      transaction("2", "expense", 30_000, "2026-08-05", "food", "Food"),
      transaction("3", "expense", 20_000, "2026-08-15", "transport", "Transport"),
      transaction("4", "expense", 999_000, "2026-08-16", "food", "Food"),
      transaction("5", "income", 290_000, "2026-09-01", "salary", "Salary"),
      transaction("6", "expense", 50_000, "2026-09-05", "food", "Food"),
      transaction("7", "expense", 5_000, "2026-09-12", "fun", "Fun"),
    ]

    const facts = computeFacts(transactions, "2026-09", "2026-09-15")

    expect(facts.comparison).toEqual({
      month: "2026-08",
      throughDay: 15,
      income: {
        current: 290_000,
        previous: 300_000,
        absoluteChange: -10_000,
        percentageChange: -100 / 30,
      },
      spent: {
        current: 55_000,
        previous: 50_000,
        absoluteChange: 5_000,
        percentageChange: 10,
      },
      net: {
        current: 235_000,
        previous: 250_000,
        absoluteChange: -15_000,
        percentageChange: -6,
      },
    })
    expect(facts.categories.map((category) => [category.name, category.spent])).toEqual([
      ["Food", 50_000],
      ["Fun", 5_000],
      ["Transport", 0],
    ])
  })

  test("uses null percentage change for a zero previous value", () => {
    const transactions = [
      transaction("1", "income", 1_000, "2026-08-01", "salary", "Salary"),
      transaction("2", "expense", 200, "2026-09-01", "food", "Food"),
    ]

    const facts = computeFacts(transactions, "2026-09", "2026-09-15")

    expect(facts.comparison?.spent.percentageChange).toBeNull()
    expect(facts.categories[0]?.comparison?.percentageChange).toBeNull()
  })

  test("compares against zero when known previous-month data begins after the equivalent day", () => {
    const transactions = [
      transaction("1", "expense", 500, "2026-08-20", "food", "Food"),
      transaction("2", "expense", 200, "2026-09-10", "food", "Food"),
    ]

    const facts = computeFacts(transactions, "2026-09", "2026-09-15")

    expect(facts.comparison?.spent).toEqual({
      current: 200,
      previous: 0,
      absoluteChange: 200,
      percentageChange: null,
    })
  })

  test("clamps a March comparison to the final day of February", () => {
    const transactions = [
      transaction("1", "expense", 100, "2026-02-28", "food", "Food"),
      transaction("2", "expense", 200, "2026-03-31", "food", "Food"),
    ]

    const facts = computeFacts(transactions, "2026-03", "2026-03-31")

    expect(facts.comparison?.month).toBe("2026-02")
    expect(facts.comparison?.throughDay).toBe(28)
  })

  test("compares January with December of the previous year", () => {
    const transactions = [
      transaction("1", "expense", 100, "2025-12-05", "food", "Food"),
      transaction("2", "expense", 150, "2026-01-05", "food", "Food"),
    ]

    const facts = computeFacts(transactions, "2026-01", "2026-01-10")

    expect(facts.comparison?.month).toBe("2025-12")
    expect(facts.comparison?.spent.absoluteChange).toBe(50)
  })
})

describe("financial drivers", () => {
  test("ranks changes by their absolute effect on net", () => {
    const transactions = [
      transaction("1", "income", 300_000, "2026-08-01", "salary", "Salary"),
      transaction("2", "expense", 20_000, "2026-08-02", "food", "Food"),
      transaction("3", "expense", 20_000, "2026-08-03", "transport", "Transport"),
      transaction("4", "income", 290_000, "2026-09-01", "salary", "Salary"),
      transaction("5", "expense", 50_000, "2026-09-02", "food", "Food"),
      transaction("6", "expense", 15_000, "2026-09-03", "transport", "Transport"),
    ]

    const facts = computeFacts(transactions, "2026-09", "2026-09-15")

    expect(facts.drivers).toEqual([
      {
        kind: "category_spending_change",
        categoryId: "food",
        categoryName: "Food",
        absoluteChange: 30_000,
        impactOnNet: -30_000,
      },
      { kind: "income_change", absoluteChange: -10_000, impactOnNet: -10_000 },
      {
        kind: "category_spending_change",
        categoryId: "transport",
        categoryName: "Transport",
        absoluteChange: -5_000,
        impactOnNet: 5_000,
      },
    ])
  })
})
