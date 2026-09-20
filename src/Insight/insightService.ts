import { validationError } from "../errors/appError"
import type { Logger } from "../logging/logger"
import type { DateOnly } from "../domain/periods"
import { previousMonth } from "../domain/periods"
import type { TransactionRepository } from "../transactions/transactionRepository"
import { computeFacts } from "./computeFacts"
import { buildInsights } from "./explanations/buildInsights"
import { dateInMonth, resolvePeriod } from "./selectPeriodTransactions"

/** Loads the minimum two-month window needed by the pure monthly insight engine. */
export class InsightService {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly logger: Logger,
  ) {}

  async monthly(userId: string, month: string, asOf: DateOnly) {
    let period
    try {
      period = resolvePeriod(month, asOf)
    } catch (error) {
      throw validationError(error instanceof Error ? error.message : "Invalid insight period")
    }

    const transactions = await this.transactions.listByDateRange(
      userId,
      dateInMonth(previousMonth(period.month), 1),
      dateInMonth(period.month, period.throughDay),
    )
    const facts = computeFacts(transactions, month, asOf)
    this.logger.info("Monthly insights calculated", {
      month,
      asOf,
      userId,
      historyStatus: facts.historyStatus,
    })
    return { facts, insights: buildInsights(facts) }
  }
}
