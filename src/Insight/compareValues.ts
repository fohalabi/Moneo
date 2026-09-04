import type { ValueComparison } from "./types"

/** Compares two values while leaving percentage change undefined for a zero baseline. */
export function compareValues(current: number, previous: number): ValueComparison {
  const absoluteChange = current - previous

  return {
    current,
    previous,
    absoluteChange,
    percentageChange: previous === 0 ? null : (absoluteChange / previous) * 100,
  }
}
