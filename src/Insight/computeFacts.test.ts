import { test, expect } from "bun:test"
import { computeFacts } from "./computeFacts"
import type { Transaction } from "./types"

const transactions: Transaction[] = [
    { amount: 1000, category: "Salary", type: "income", date: "2026-07-01" },
    { amount: 500, category: "Groceries", type: "expense", date: "2026-07-15" },
    { amount: 300, category: "Utilities", type: "expense", date: "2026-07-20" }
]

test("totalSpent sums only expenses", () => {
  const facts = computeFacts(transactions, "2026-07", new Date("2026-07-21"))

  expect(facts.totalSpent).toBe(800)
})

test("income sums only income transactions", () => {
  const facts = computeFacts(transactions, "2026-07", new Date("2026-07-21"))

  expect(facts.income).toBe(1000)
})

test("balance is income minus totalSpent", () => {
    const facts = computeFacts(transactions, "2026-07", new Date("2026-07-21"))

    expect(facts.balance).toBe(200)
})

test("daysElapsed is the day of the month of today", () => {
    const facts = computeFacts(transactions, "2026-07", new Date("2026-07-21"))

    expect(facts.daysElapsed).toBe(21)
})

test("avgDailySpend is totalSpent divided by daysElapsed", () => {
    const facts = computeFacts(transactions, "2026-07", new Date("2026-07-21"))

    expect(facts.avgDailySpend).toBe(800 / 21)
})

test("daysInMonth is total days in the month", () => {
  const facts = computeFacts(transactions, "2026-07", new Date("2026-07-21"))

  expect(facts.daysInMonth).toBe(31)
})

test ("projectedBalance is balance minus avgDailySpend times remaining days in month", () => {
    const facts = computeFacts(transactions, "2026-07", new Date("2026-07-21"))

    expect(facts.projectedBalance).toBe(200 - (800 / 21) * (31 - 21))
})

test("byCategory contains correct spent amounts", () => {
    const facts = computeFacts(transactions, "2026-07", new Date("2026-07-21"))

    expect(facts.byCategory).toEqual([
        { name: "Groceries", spent: 500, pctOfIncome: 50, deltaVsLastMonth: null },
        { name: "Utilities", spent: 300, pctOfIncome: 30, deltaVsLastMonth: null }
    ])
})