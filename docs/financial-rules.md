# Moneo V1 Financial Rules

This document defines what Moneo's numbers mean. The insight engine and its tests
must follow these rules; changing a rule should require changing this document and
the related tests together.

## 1. V1 boundaries

V1 is a single-user, single-currency expense tracker. Transactions are entered
manually. CSV/Excel imports, bank connections, transfers, refunds, debt, account
balances, budgets, and recurring-payment detection are deliberately deferred.

The purpose of V1 is to reliably answer:

- How much came in and went out?
- What categories consumed the money?
- How does this month compare with the same point last month?
- What changed enough to explain the difference?
- If the current spending pace continues, where could the month end?

## 2. Money

- Store money as integer minor units, such as kobo, never floating-point naira.
- Display formatting belongs outside the insight engine.
- Every transaction amount must be greater than zero.
- `income` adds money and `expense` removes money. The type determines direction.
- V1 supports one configured currency. Currency conversion is not performed.

Example: `₦1,250.50` is stored as `125050` kobo.

## 3. Transactions

A transaction contains:

- a stable ID;
- `income` or `expense` type;
- an integer amount in minor units;
- a calendar date in `YYYY-MM-DD` form;
- a stable category ID and display name;
- an optional description.

Editing or deleting an incorrect manual transaction is the V1 correction process.
Refund modelling will be introduced only when its reporting behaviour is defined.

## 4. Dates and monthly periods

- A transaction belongs to the calendar month written in its transaction date.
- Date-only values are interpreted as calendar dates, not local timestamps.
- A requested month uses `YYYY-MM` form.
- Month-to-date includes day 1 through the selected `asOf` date, inclusive.
- Future-dated transactions are excluded from month-to-date results.
- A historical completed month includes every day in that month.
- The caller supplies `asOf`; the engine does not read the system clock. This makes
  results reproducible and easy to test.

## 5. Core calculations

For the selected period:

- `income = sum(income transactions)`
- `spent = sum(expense transactions)`
- `net = income - spent`
- `averageDailySpend = spent / elapsed calendar days`
- `projectedSpending = averageDailySpend * days in selected month`
- `projectedNet = income - projectedSpending`

Projection is a simple run-rate estimate, not a promise or financial advice. It is
available only for the current, partially completed month. A completed month uses
its actual values and does not need a projection.

Category spending is calculated from expenses only. Each category reports its
amount, percentage of total spending, and percentage of income. When the relevant
denominator is zero, the percentage is `null` rather than an invented value.

## 6. Comparisons

The primary comparison is current month-to-date versus the equivalent portion of
the immediately previous month.

Example: September 1-15 compares with August 1-15. If the selected day does not
exist in the previous month, comparison ends on that month's final day.

For every comparable metric:

- `absoluteChange = current - previous`
- `percentageChange = absoluteChange / previous * 100`
- percentage change is `null` when the previous value is zero;
- missing comparison data is `null`, never zero.

No prior transactions means “no comparison available,” not “100% improvement.”
The engine may also compare complete historical months when both months contain
provided data.

## 7. Explaining “why”

Moneo explains changes using calculated drivers, not guesses. Category expense
changes are ranked by their absolute contribution to the total spending change.
Income change is reported separately so lower income is not mislabelled as higher
spending.

Example: if net is ₦30,000 worse, food spending rose ₦20,000, transport rose
₦5,000, and income fell ₦5,000, those three facts explain the difference.

An LLM may later phrase these structured facts, but it must never calculate or
alter amounts, rankings, percentages, comparisons, or projections.

## 8. Rounding and presentation

- Calculations retain full precision internally where division is required.
- API values that represent stored money remain integer minor units.
- Presentation rounds percentages to at most one decimal place and money to the
  currency's supported minor unit.
- Sorting must be deterministic: amount descending, then category name ascending.

## 9. Known non-goals

Moneo V1 reports cash flow from the transactions supplied to it. Its `net` value is
not a bank balance, net worth, profit, or accounting statement. It cannot know about
cash, fees, debts, or accounts the user has not entered.

## 10. Phase 0 acceptance rules

Phase 1 should not begin until tests can express these cases:

- empty and income-only months;
- expense-only months;
- first month without comparison history;
- same-point-last-month comparison;
- January/December rollover and leap-year February;
- a previous month shorter than the selected month;
- previous value of zero;
- future-dated transactions;
- stable category ordering and multiple transactions per category.
