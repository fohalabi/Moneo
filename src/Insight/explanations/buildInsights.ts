import type { Facts, FinancialDriver, ValueComparison } from "../types"
import { defaultFormatting, formatMoney, formatMonth, formatPercentage } from "./formatters"
import type { Insight, InsightFormattingOptions } from "./types"

/** Describes a signed net value without implying that it is an account balance. */
function describeNet(net: number, options: InsightFormattingOptions): string {
  if (net > 0) return `a positive net cash flow of ${formatMoney(net, options)}`
  if (net < 0) return `a negative net cash flow of ${formatMoney(Math.abs(net), options)}`
  return "a net cash flow of zero"
}

/** Builds a spending comparison message while handling a zero prior value honestly. */
function spendingComparisonMessage(
  comparison: ValueComparison,
  previousMonth: string,
  options: InsightFormattingOptions,
): string {
  if (comparison.absoluteChange === 0) {
    return `You spent the same amount as at this point in ${previousMonth}.`
  }

  const direction = comparison.absoluteChange > 0 ? "more" : "less"
  const amount = formatMoney(Math.abs(comparison.absoluteChange), options)
  const percentage = comparison.percentageChange === null
    ? ""
    : ` (${formatPercentage(Math.abs(comparison.percentageChange), options.locale)})`
  return `You spent ${amount} ${direction}${percentage} than at this point in ${previousMonth}.`
}

/** Converts one ranked financial driver into a traceable explanation. */
function driverInsight(
  driver: FinancialDriver,
  index: number,
  options: InsightFormattingOptions,
): Insight {
  if (driver.kind === "income_change") {
    const increased = driver.absoluteChange > 0
    return {
      id: `driver-income-${index + 1}`,
      kind: "driver",
      tone: increased ? "positive" : "warning",
      title: increased ? "Higher income helped" : "Lower income affected your position",
      message: `Income was ${formatMoney(Math.abs(driver.absoluteChange), options)} ${
        increased ? "higher" : "lower"
      } than at the same point last month.`,
    }
  }

  const increased = driver.absoluteChange > 0
  return {
    id: `driver-category-${driver.categoryId}-${index + 1}`,
    kind: "driver",
    tone: increased ? "warning" : "positive",
    title: `${driver.categoryName} spending ${increased ? "increased" : "decreased"}`,
    message: `You spent ${formatMoney(Math.abs(driver.absoluteChange), options)} ${
      increased ? "more" : "less"
    } on ${driver.categoryName} than at the same point last month.`,
  }
}

/** Produces stable, deterministic explanations using only already-computed facts. */
export function buildInsights(
  facts: Facts,
  options: InsightFormattingOptions = defaultFormatting,
): Insight[] {
  const insights: Insight[] = []
  const { summary, period } = facts

  if (summary.income === 0 && summary.spent === 0) {
    insights.push({
      id: "overview-empty",
      kind: "overview",
      tone: "neutral",
      title: "No activity recorded",
      message: `No income or expenses have been recorded through day ${period.throughDay}.`,
    })
  } else {
    insights.push({
      id: "overview-current",
      kind: "overview",
      tone: summary.net < 0 ? "warning" : "neutral",
      title: "Your month so far",
      message: `Through day ${period.throughDay}, you recorded ${formatMoney(
        summary.income,
        options,
      )} in income and spent ${formatMoney(summary.spent, options)}, leaving ${describeNet(
        summary.net,
        options,
      )}.`,
    })
  }

  if (facts.historyStatus === "unavailable") {
    insights.push({
      id: "baseline-no-history",
      kind: "baseline",
      tone: "neutral",
      title: "Building your baseline",
      message: "No previous-month data is available yet. This month can become your baseline for future comparisons.",
    })
  } else if (facts.comparison) {
    insights.push({
      id: "comparison-spending",
      kind: "comparison",
      tone:
        facts.comparison.spent.absoluteChange > 0
          ? "warning"
          : facts.comparison.spent.absoluteChange < 0
            ? "positive"
            : "neutral",
      title: "Spending versus last month",
      message: spendingComparisonMessage(
        facts.comparison.spent,
        formatMonth(facts.comparison.month, options.locale),
        options,
      ),
    })

    const netChange = facts.comparison.net.absoluteChange
    insights.push({
      id: "comparison-net",
      kind: "comparison",
      tone: netChange > 0 ? "positive" : netChange < 0 ? "warning" : "neutral",
      title: netChange > 0 ? "Your position improved" : netChange < 0 ? "Your position declined" : "Your position is unchanged",
      message:
        netChange === 0
          ? "Your net cash flow matches the same point last month."
          : `Your net cash flow is ${formatMoney(Math.abs(netChange), options)} ${
              netChange > 0 ? "better" : "worse"
            } than at the same point last month.`,
    })

    insights.push(...facts.drivers.slice(0, 3).map((driver, index) => driverInsight(driver, index, options)))
  }

  const topCategory = facts.categories.find((category) => category.spent > 0)
  if (topCategory) {
    const share = topCategory.percentageOfSpending
    insights.push({
      id: `category-top-${topCategory.categoryId}`,
      kind: "category",
      tone: "neutral",
      title: `${topCategory.name} is your largest category`,
      message: `${topCategory.name} accounts for ${formatMoney(topCategory.spent, options)}${
        share === null ? "" : `, or ${formatPercentage(share, options.locale)} of your spending`
      }.`,
    })
  }

  const recentTrend = facts.recentSpendingTrend?.comparison
  if (recentTrend && recentTrend.absoluteChange !== 0) {
    const increased = recentTrend.absoluteChange > 0
    insights.push({
      id: "spending-pace-recent",
      kind: "spending_pace",
      tone: increased ? "warning" : "positive",
      title: `Your recent spending pace ${increased ? "increased" : "slowed"}`,
      message: `You spent ${formatMoney(Math.abs(recentTrend.absoluteChange), options)} ${
        increased ? "more" : "less"
      } in the latest seven days than in the preceding seven days.`,
    })
  }

  if (facts.projection && (summary.income !== 0 || summary.spent !== 0)) {
    insights.push({
      id: "projection-month-end",
      kind: "projection",
      tone: facts.projection.net < 0 ? "warning" : "neutral",
      title: "Current month-end projection",
      message: `At your current average of ${formatMoney(
        summary.averageDailySpend,
        options,
      )} per day, projected spending is ${formatMoney(
        facts.projection.spent,
        options,
      )}, leaving ${describeNet(facts.projection.net, options)} by month-end.`,
    })
  }

  return insights
}
