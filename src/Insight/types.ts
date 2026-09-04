import type { DateOnly, Month } from "../domain/periods"

export type Period = {
  month: Month
  throughDay: number
  daysElapsed: number
  daysInMonth: number
  isComplete: boolean
}

export type Summary = {
  income: number
  spent: number
  net: number
  averageDailySpend: number
}

export type Projection = {
  spent: number
  net: number
}

export type ValueComparison = {
  current: number
  previous: number
  absoluteChange: number
  percentageChange: number | null
}

export type CategoryFacts = {
  categoryId: string
  name: string
  spent: number
  percentageOfSpending: number | null
  percentageOfIncome: number | null
  comparison: ValueComparison | null
}

export type PreviousPeriodComparison = {
  month: Month
  throughDay: number
  income: ValueComparison
  spent: ValueComparison
  net: ValueComparison
}

export type IncomeChangeDriver = {
  kind: "income_change"
  absoluteChange: number
  impactOnNet: number
}

export type CategorySpendingChangeDriver = {
  kind: "category_spending_change"
  categoryId: string
  categoryName: string
  absoluteChange: number
  impactOnNet: number
}

export type FinancialDriver = IncomeChangeDriver | CategorySpendingChangeDriver

export type Facts = {
  asOf: DateOnly
  period: Period
  summary: Summary
  projection: Projection | null
  categories: CategoryFacts[]
  comparison: PreviousPeriodComparison | null
  drivers: FinancialDriver[]
}
