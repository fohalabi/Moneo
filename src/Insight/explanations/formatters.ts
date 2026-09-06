import type { InsightFormattingOptions } from "./types"

export const defaultFormatting: InsightFormattingOptions = {
  currency: "NGN",
  locale: "en-NG",
}

/** Formats integer minor units for display without changing the underlying financial facts. */
export function formatMoney(
  amountInMinorUnits: number,
  options: InsightFormattingOptions = defaultFormatting,
): string {
  return new Intl.NumberFormat(options.locale, {
    style: "currency",
    currency: options.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amountInMinorUnits / 100)
}

/** Formats a calculated percentage to at most one decimal place. */
export function formatPercentage(value: number, locale = defaultFormatting.locale): string {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)}%`
}

/** Converts the engine's YYYY-MM key into a readable month label. */
export function formatMonth(month: string, locale = defaultFormatting.locale): string {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00.000Z`))
}
