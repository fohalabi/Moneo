import type { Transaction, Facts } from "./types"

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
  const daysInMonth = new Date(year, monthNum, 0).getDate()
  const projectedBalance = balance - avgDailySpend * (daysInMonth - daysElapsed)

  return {
    month,
    totalSpent,
    income,
    balance,
    daysElapsed,
    avgDailySpend,
    daysInMonth,
    projectedBalance,
    // TS will complain other fields are missing — ignore for now,
    // or return a partial while learning
  } as Facts
}