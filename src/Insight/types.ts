export type Transaction = {
  amount: number
  category: string
  type: "income" | "expense"
  date: string  
}

export type CategoryFacts = {
    name: string
    spent: number
    pctOfIncome: number
    deltaVsLastMonth: number | null   
}

export type Facts = {
  month: string
  income: number
  totalSpent: number
  balance: number
  avgDailySpend: number
  projectedBalance: number      
  daysElapsed: number
  daysInMonth: number
  topCategory: string
  byCategory: CategoryFacts[]
}