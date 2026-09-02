/** Money is stored as integer minor units (for example, kobo) to avoid rounding drift. */
export type Money = number

/** Rejects values that cannot be stored as a valid positive transaction amount. */
export function assertTransactionAmount(amount: number): asserts amount is Money {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("Transaction amount must be a positive safe integer in minor units")
  }
}
