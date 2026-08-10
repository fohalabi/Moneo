import type { Transaction, Facts, CategoryFacts } from "./types"

function sumByType(
    transactions: Transaction[],
    type: "income" | "expense"
): number {
    return transactions
        .filter((t) => t.type === type)
        .reduce((sum, t) => sum + t.amount, 0)
}

export function computeFacts(
  transactions: Transaction[],
  month: string,
  today: Date,
): Facts {
  // filter to expenses only, sum their amounts
  const totalSpent = sumByType(transactions, "expense")
  const income = sumByType(transactions, "income")
  const balance = income - totalSpent
  const daysElapsed = today.getDate()
  const avgDailySpend = totalSpent / daysElapsed
  const [year, monthNum] = month.split("-").map(Number)

  if (year === undefined || monthNum === undefined) {
    throw new Error(`Invalid month format: ${month}`)
  }
  const daysInMonth = new Date(year, monthNum, 0).getDate()
  const projectedBalance = balance - avgDailySpend * (daysInMonth - daysElapsed)
  const expenses = transactions.filter((t) => t.type === "expense")

  const map = new Map<string, number>()

  for (const t of expenses) {
    const current = map.get(t.category) ?? 0
    map.set(t.category, current + t.amount)
  }

  const byCategory: CategoryFacts[] = [...map].map(([name, spent]) => ({
    name,
    spent,
    pctOfIncome: 0,
    deltaVsLastMonth: null,
  }))

  const withPct = byCategory.map((c) => ({
    ...c,
    pctOfIncome: income === 0 ? 0 : (c.spent / income) * 100,
  }))

  return {
    month,
    totalSpent,
    income,
    balance,
    daysElapsed,
    avgDailySpend,
    daysInMonth,
    projectedBalance,
    byCategory: withPct,
    // TS will complain other fields are missing — ignore for now,
    // or return a partial while learning
  } as Facts
}