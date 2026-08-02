# Expense Insight Engine

A personal finance tool that doesn't just track spending — it tells you what your spending *means*, in plain, blunt English.

Your bank tells you what happened. This tells you what to do about it.

## What it does

Instead of a scrolling list of transactions, it computes the numbers that matter and turns them into sharp, honest insights:

- "You spent ₦38,000 on food this month — 25% of your income."
- "Transport is up 40% versus last month."
- "At this rate, you'll end the month with ₦15,000."
- "Why am I broke? You spent ₦22,000 more eating out than last month."

## Core principle

**Facts are computed in code. The LLM only phrases them.**

The math is the source of truth. The model never invents a figure — it receives a clean facts object and turns it into words. This is what keeps the insights correct instead of hallucinated.

## Architecture

```
Routes  →  Services  →  Repository  →  DB
                ↓
          Insight Engine  →  LLM Adapter
```

| Layer | Responsibility |
|-------|----------------|
| **Routes** | HTTP endpoints. No logic. |
| **Services** | Orchestration (e.g. "get insights for this month"). |
| **Repository** | All database access lives here. |
| **Insight Engine** | Pure functions: transactions in, facts out. No DB, no API. Fully testable. |
| **LLM Adapter** | One module that calls the Anthropic API. Swappable. |

### Design rules

1. **Facts computed in code, never by the LLM.** Correctness guarantee.
2. **The LLM call is non-fatal.** If the API is down, the app still returns the raw facts. The roast is an enhancement, not a dependency.
3. **The Insight Engine is pure.** Zero dependencies, so it never breaks when the DB or model changes.

## The contract

The heart of the system. Everything plugs into this one function.

```typescript
type Transaction = {
  amount: number
  category: string
  type: "income" | "expense"
  date: string        // ISO
}

type Facts = {
  month: string
  income: number
  totalSpent: number
  balance: number
  avgDailySpend: number
  projectedBalance: number      // run-rate to month end
  daysElapsed: number
  daysInMonth: number
  topCategory: string
  byCategory: {
    name: string
    spent: number
    pctOfIncome: number
    deltaVsLastMonth: number | null   // null when no prior month
  }[]
}

computeFacts(allTransactions: Transaction[], month: string): Facts
```

Notes:

- Pure function. Slices current vs previous month internally.
- `deltaVsLastMonth` is `null` in the first month — comparison insights are skipped, everything else still fires.
- `projectedBalance` recalculates from *today*, so checking on any day shows your trajectory, not just a month-end report.

## Tech stack

- **TypeScript** on **Bun / Elysia** — backend
- **PostgreSQL + Prisma** — storage
- **Anthropic API** — the insight phrasing, called directly from the backend

No separate Python service. The "LLM part" is just an HTTP call.

## Cost

- **Anthropic API** — pay per use, pennies at personal scale
- **Deployment** — optional; runs locally for free

## Status

v1 in design. Scope: single user, monthly window with live run-rate, template + LLM insights.

### Roadmap

- [ ] Insight Engine (`computeFacts`) + unit tests
- [ ] Repository + Prisma schema
- [ ] Services + routes
- [ ] LLM adapter (non-fatal)
- [ ] Free-text questions ("why am I broke?")
- [ ] Recurring-charge detection
- [ ] Custom categories / budgets