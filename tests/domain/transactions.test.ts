import { describe, expect, test } from "bun:test"
import type { Transaction } from "../../src/domain/transactions"
import { validateTransaction } from "../../src/domain/transactions"

const validTransaction: Transaction = {
  id: "txn_1",
  type: "expense",
  amount: 125050,
  date: "2026-09-02",
  categoryId: "food",
  categoryName: "Food",
  description: "Groceries",
}

describe("transaction rules", () => {
  test("accepts a complete transaction using integer minor units", () => {
    expect(() => validateTransaction(validTransaction)).not.toThrow()
  })

  test("rejects fractional, zero, and negative amounts", () => {
    for (const amount of [12.5, 0, -100]) {
      expect(() => validateTransaction({ ...validTransaction, amount })).toThrow(
        "positive safe integer",
      )
    }
  })

  test("requires stable category identity and a readable name", () => {
    expect(() => validateTransaction({ ...validTransaction, categoryId: "" })).toThrow(
      "Category ID",
    )
    expect(() => validateTransaction({ ...validTransaction, categoryName: " " })).toThrow(
      "Category name",
    )
  })
})
