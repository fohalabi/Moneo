export type Month = `${number}-${string}`
export type DateOnly = `${number}-${string}-${string}`

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/
const DATE_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

/** Parses a month once so every calculation uses the same strict YYYY-MM rules. */
export function parseMonth(month: string): { year: number; monthNumber: number } {
  const match = MONTH_PATTERN.exec(month)
  if (!match) throw new Error(`Invalid month: ${month}`)

  return { year: Number(match[1]), monthNumber: Number(match[2]) }
}

/** Returns the number of calendar days in a month, including leap-year handling. */
export function daysInMonth(month: string): number {
  const { year, monthNumber } = parseMonth(month)
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
}

/** Validates a date-only value and rejects impossible dates such as 2026-02-30. */
export function assertDateOnly(date: string): asserts date is DateOnly {
  const match = DATE_PATTERN.exec(date)
  if (!match) throw new Error(`Invalid transaction date: ${date}`)

  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  const day = Number(match[3])
  const parsed = new Date(Date.UTC(year, monthIndex, day))

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== monthIndex ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`Invalid transaction date: ${date}`)
  }
}

/** Finds the immediately previous calendar month, including January rollover. */
export function previousMonth(month: string): Month {
  const { year, monthNumber } = parseMonth(month)
  const date = new Date(Date.UTC(year, monthNumber - 2, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}

/** Clamps a comparison day when the previous month has fewer calendar days. */
export function comparisonDay(month: string, throughDay: number): number {
  if (!Number.isInteger(throughDay) || throughDay < 1 || throughDay > daysInMonth(month)) {
    throw new Error(`Invalid day ${throughDay} for ${month}`)
  }

  return Math.min(throughDay, daysInMonth(previousMonth(month)))
}
