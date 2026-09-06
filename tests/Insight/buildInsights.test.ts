import { describe, expect, test } from "bun:test"
import type { DateOnly } from "../../src/domain/periods"
import type { Transaction } from "../../src/domain/transactions"
import { computeFacts } from "../../src/Insight/computeFacts"
import { buildInsights } from "../../src/Insight/explanations/buildInsights"
import { formatMoney } from "../../src/Insight/explanations/formatters"

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

describe("insight explanations", () => {
  test("formats integer minor units as naira", () => {
    expect(formatMoney(125_050)).toBe("₦1,250.5")
  })

  test("builds useful first-month insights without inventing a comparison", () => {
    const facts = computeFacts(
      [
        transaction("1", "income", 300_000, "2026-09-01", "salary", "Salary"),
        transaction("2", "expense", 60_000, "2026-09-03", "food", "Food"),
        transaction("3", "expense", 30_000, "2026-09-12", "transport", "Transport"),
      ],
      "2026-09",
      "2026-09-15",
    )

    const insights = buildInsights(facts)

    expect(insights.map((insight) => insight.id)).toEqual([
      "overview-current",
      "baseline-no-history",
      "category-top-food",
      "spending-pace-recent",
      "projection-month-end",
    ])
    expect(insights.find((insight) => insight.id === "baseline-no-history")?.message).toContain(
      "No previous-month data",
    )
    expect(insights.find((insight) => insight.id === "category-top-food")?.message).toContain(
      "66.7% of your spending",
    )
    expect(insights.some((insight) => insight.kind === "comparison")).toBe(false)
  })

  test("explains month-over-month changes using ranked computed drivers", () => {
    const facts = computeFacts(
      [
        transaction("1", "income", 300_000, "2026-08-01", "salary", "Salary"),
        transaction("2", "expense", 20_000, "2026-08-03", "food", "Food"),
        transaction("3", "income", 290_000, "2026-09-01", "salary", "Salary"),
        transaction("4", "expense", 50_000, "2026-09-03", "food", "Food"),
      ],
      "2026-09",
      "2026-09-15",
    )

    const insights = buildInsights(facts)
    const spending = insights.find((insight) => insight.id === "comparison-spending")
    const driver = insights.find((insight) => insight.id.startsWith("driver-category-food"))

    expect(spending?.tone).toBe("warning")
    expect(spending?.message).toContain("August 2026")
    expect(driver?.message).toContain("more on Food")
    expect(insights.some((insight) => insight.id === "baseline-no-history")).toBe(false)
  })

  test("uses an absolute amount without a misleading percentage when the baseline is zero", () => {
    const facts = computeFacts(
      [
        transaction("1", "income", 100_000, "2026-08-01", "salary", "Salary"),
        transaction("2", "expense", 25_000, "2026-09-03", "food", "Food"),
      ],
      "2026-09",
      "2026-09-15",
    )

    const message = buildInsights(facts).find(
      (insight) => insight.id === "comparison-spending",
    )?.message

    expect(message).toBe("You spent ₦250 more than at this point in August 2026.")
  })

  test("marks a negative month-end projection as a warning", () => {
    const facts = computeFacts(
      [
        transaction("1", "income", 100_000, "2026-09-01", "salary", "Salary"),
        transaction("2", "expense", 90_000, "2026-09-03", "food", "Food"),
      ],
      "2026-09",
      "2026-09-10",
    )

    expect(buildInsights(facts).find((insight) => insight.id === "projection-month-end")?.tone).toBe(
      "warning",
    )
  })

  test("recognizes lower spending as a positive change", () => {
    const facts = computeFacts(
      [
        transaction("1", "expense", 50_000, "2026-08-03", "food", "Food"),
        transaction("2", "expense", 20_000, "2026-09-03", "food", "Food"),
      ],
      "2026-09",
      "2026-09-15",
    )

    const spending = buildInsights(facts).find(
      (insight) => insight.id === "comparison-spending",
    )

    expect(spending?.tone).toBe("positive")
    expect(spending?.message).toContain("less")
  })

  test("returns a calm baseline response for an empty month", () => {
    const insights = buildInsights(computeFacts([], "2026-09", "2026-09-06"))

    expect(insights[0]).toMatchObject({ id: "overview-empty", tone: "neutral" })
    expect(insights.map((insight) => insight.id)).toEqual([
      "overview-empty",
      "baseline-no-history",
    ])
  })
})
