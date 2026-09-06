export type InsightKind =
  | "overview"
  | "baseline"
  | "comparison"
  | "driver"
  | "category"
  | "spending_pace"
  | "projection"

export type InsightTone = "neutral" | "positive" | "warning"

export type Insight = {
  id: string
  kind: InsightKind
  tone: InsightTone
  title: string
  message: string
}

export type InsightFormattingOptions = {
  currency: string
  locale: string
}
