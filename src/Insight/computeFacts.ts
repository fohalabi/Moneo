import type { DateOnly } from "../domain/periods"
import { comparisonDay, daysInMonth, previousMonth } from "../domain/periods"
import type { Transaction } from "../domain/transactions"
import { validateTransaction } from "../domain/transactions"
import { compareValues } from "./compareValues"
import { computeDrivers } from "./computeDrivers"
import { dateInMonth, resolvePeriod, selectTransactionsBetween } from "./selectPeriodTransactions"
import type {
  CategoryFacts,
  Facts,
  PreviousPeriodComparison,
  Projection,
  Summary,
} from "./types"

type CategoryTotal = { categoryId: string; name: string; spent: number }

/** Calculates the core cash-flow totals for one already-selected transaction period. */
function computeSummary(transactions: Transaction[], daysElapsed: number): Summary {
  let income = 0
  let spent = 0

  for (const transaction of transactions) {
    if (transaction.type === "income") income += transaction.amount
    else spent += transaction.amount
  }

  return { income, spent, net: income - spent, averageDailySpend: spent / daysElapsed }
}

/** Groups expense transactions by stable category ID and preserves their display names. */
function categoryTotals(transactions: Transaction[]): Map<string, CategoryTotal> {
  const totals = new Map<string, CategoryTotal>()

  for (const transaction of transactions) {
    if (transaction.type !== "expense") continue

    const current = totals.get(transaction.categoryId)
    totals.set(transaction.categoryId, {
      categoryId: transaction.categoryId,
      name: transaction.categoryName,
      spent: (current?.spent ?? 0) + transaction.amount,
    })
  }

  return totals
}

/** Produces current category facts and, when available, same-period category comparisons. */
function computeCategoryFacts(
  currentTransactions: Transaction[],
  previousTransactions: Transaction[] | null,
  summary: Summary,
): CategoryFacts[] {
  const current = categoryTotals(currentTransactions)
  const previous = previousTransactions === null ? null : categoryTotals(previousTransactions)
  const categoryIds = new Set([...current.keys(), ...(previous?.keys() ?? [])])

  return [...categoryIds]
    .map((categoryId): CategoryFacts => {
      const currentCategory = current.get(categoryId)
      const previousCategory = previous?.get(categoryId)
      const spent = currentCategory?.spent ?? 0

      return {
        categoryId,
        name: currentCategory?.name ?? previousCategory!.name,
        spent,
        percentageOfSpending: summary.spent === 0 ? null : (spent / summary.spent) * 100,
        percentageOfIncome: summary.income === 0 ? null : (spent / summary.income) * 100,
        comparison: previous === null ? null : compareValues(spent, previousCategory?.spent ?? 0),
      }
    })
    .sort((left, right) => right.spent - left.spent || left.name.localeCompare(right.name))
}

/** Computes all deterministic facts for a month using only transactions supplied by the caller. */
export function computeFacts(
  transactions: Transaction[],
  month: string,
  asOf: DateOnly,
): Facts {
  for (const transaction of transactions) validateTransaction(transaction)

  const period = resolvePeriod(month, asOf)
  const currentTransactions = selectTransactionsBetween(
    transactions,
    dateInMonth(period.month, 1),
    dateInMonth(period.month, period.throughDay),
  )
  const summary = computeSummary(currentTransactions, period.daysElapsed)

  const priorMonth = previousMonth(period.month)
  const priorThroughDay = comparisonDay(period.month, period.throughDay)
  const previousMonthTransactions = selectTransactionsBetween(
    transactions,
    dateInMonth(priorMonth, 1),
    dateInMonth(priorMonth, daysInMonth(priorMonth)),
  )
  const previousTransactions = selectTransactionsBetween(
    transactions,
    dateInMonth(priorMonth, 1),
    dateInMonth(priorMonth, priorThroughDay),
  )
  const hasPreviousData = previousMonthTransactions.length > 0
  const previousSummary = hasPreviousData
    ? computeSummary(previousTransactions, priorThroughDay)
    : null
  const categories = computeCategoryFacts(
    currentTransactions,
    hasPreviousData ? previousTransactions : null,
    summary,
  )

  const comparison: PreviousPeriodComparison | null = previousSummary
    ? {
        month: priorMonth,
        throughDay: priorThroughDay,
        income: compareValues(summary.income, previousSummary.income),
        spent: compareValues(summary.spent, previousSummary.spent),
        net: compareValues(summary.net, previousSummary.net),
      }
    : null

  const projection: Projection | null = period.isComplete
    ? null
    : {
        spent: summary.averageDailySpend * period.daysInMonth,
        net: summary.income - summary.averageDailySpend * period.daysInMonth,
      }

  return {
    asOf,
    period,
    summary,
    projection,
    categories,
    comparison,
    drivers: previousSummary ? computeDrivers(summary, previousSummary, categories) : [],
  }
}
