import type { CategoryFacts, FinancialDriver, Summary } from "./types"

/** Ranks the income and category changes that had the largest effect on net cash flow. */
export function computeDrivers(
  current: Summary,
  previous: Summary,
  categories: CategoryFacts[],
): FinancialDriver[] {
  const drivers: FinancialDriver[] = []
  const incomeChange = current.income - previous.income

  if (incomeChange !== 0) {
    drivers.push({ kind: "income_change", absoluteChange: incomeChange, impactOnNet: incomeChange })
  }

  for (const category of categories) {
    const spendingChange = category.comparison?.absoluteChange ?? 0
    if (spendingChange !== 0) {
      drivers.push({
        kind: "category_spending_change",
        categoryId: category.categoryId,
        categoryName: category.name,
        absoluteChange: spendingChange,
        impactOnNet: -spendingChange,
      })
    }
  }

  return drivers.sort((left, right) => {
    const byImpact = Math.abs(right.impactOnNet) - Math.abs(left.impactOnNet)
    if (byImpact !== 0) return byImpact

    const leftName = left.kind === "income_change" ? "Income" : left.categoryName
    const rightName = right.kind === "income_change" ? "Income" : right.categoryName
    return leftName.localeCompare(rightName)
  })
}
