import { describe, expect, test } from "bun:test"
import {
  assertDateOnly,
  comparisonDay,
  daysInMonth,
  parseMonth,
  previousMonth,
} from "./periods"

describe("monthly period rules", () => {
  test("accepts a valid month and rejects malformed months", () => {
    expect(parseMonth("2026-09")).toEqual({ year: 2026, monthNumber: 9 })
    expect(() => parseMonth("2026-9")).toThrow("Invalid month")
    expect(() => parseMonth("2026-13")).toThrow("Invalid month")
  })

  test("handles leap years", () => {
    expect(daysInMonth("2024-02")).toBe(29)
    expect(daysInMonth("2026-02")).toBe(28)
  })

  test("rejects impossible calendar dates", () => {
    expect(() => assertDateOnly("2026-02-30")).toThrow("Invalid transaction date")
    expect(() => assertDateOnly("2026-02-28")).not.toThrow()
  })

  test("rolls January back to December", () => {
    expect(previousMonth("2026-01")).toBe("2025-12")
  })

  test("clamps same-point comparisons to the previous month's final day", () => {
    expect(comparisonDay("2026-03", 31)).toBe(28)
    expect(comparisonDay("2024-03", 31)).toBe(29)
    expect(comparisonDay("2026-09", 15)).toBe(15)
  })
})
