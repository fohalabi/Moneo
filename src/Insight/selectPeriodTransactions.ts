import type { DateOnly, Month } from "../domain/periods"
import { assertDateOnly, daysInMonth, parseMonth } from "../domain/periods"
import type { Transaction } from "../domain/transactions"
import type { Period } from "./types"

/** Resolves whether a selected month is in progress or already complete at `asOf`. */
export function resolvePeriod(month: string, asOf: string): Period {
  parseMonth(month)
  assertDateOnly(asOf)

  const asOfMonth = asOf.slice(0, 7)
  if (month > asOfMonth) throw new Error("Selected month cannot be after the as-of date")

  const totalDays = daysInMonth(month)
  const isComplete = month < asOfMonth || Number(asOf.slice(8, 10)) === totalDays
  const throughDay = month === asOfMonth ? Number(asOf.slice(8, 10)) : totalDays

  return {
    month: month as Month,
    throughDay,
    daysElapsed: throughDay,
    daysInMonth: totalDays,
    isComplete,
  }
}

/** Selects transactions in an inclusive date-only range without timezone conversion. */
export function selectTransactionsBetween(
  transactions: Transaction[],
  start: DateOnly,
  end: DateOnly,
): Transaction[] {
  return transactions.filter((transaction) => transaction.date >= start && transaction.date <= end)
}

/** Builds a valid date-only value from a known-valid month and calendar day. */
export function dateInMonth(month: Month, day: number): DateOnly {
  return `${month}-${String(day).padStart(2, "0")}` as DateOnly
}
