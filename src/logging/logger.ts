export type LogContext = Record<string, unknown>

export interface Logger {
  debug(message: string, context?: LogContext): void
  info(message: string, context?: LogContext): void
  warn(message: string, context?: LogContext): void
  error(message: string, error?: unknown, context?: LogContext): void
}

type LogLevel = "debug" | "info" | "warn" | "error"

const priorities: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 }

/** Writes structured JSON events to stdout/stderr for local and hosted log collectors. */
export function createLogger(minimumLevel: LogLevel = "info"): Logger {
  function write(level: LogLevel, message: string, context: LogContext = {}, error?: unknown) {
    if (priorities[level] < priorities[minimumLevel]) return

    const entry: LogContext = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    }

    if (error instanceof Error) {
      entry.error = { name: error.name, message: error.message, stack: error.stack }
    } else if (error !== undefined) {
      entry.error = String(error)
    }

    const output = JSON.stringify(entry)
    if (level === "error") console.error(output)
    else if (level === "warn") console.warn(output)
    else console.log(output)
  }

  return {
    debug: (message, context) => write("debug", message, context),
    info: (message, context) => write("info", message, context),
    warn: (message, context) => write("warn", message, context),
    error: (message, error, context) => write("error", message, context, error),
  }
}

/** Creates the application logger from a validated log-level string. */
export function loggerFromEnvironment(level = process.env.LOG_LEVEL): Logger {
  const normalized = level?.toLowerCase()
  if (normalized && normalized in priorities) return createLogger(normalized as LogLevel)
  return createLogger("info")
}
