export type AppConfig = {
  port: number
  logLevel: string
  nodeEnv: "development" | "test" | "production"
}

/** Reads and validates process configuration once during application startup. */
export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const port = Number(environment.PORT ?? 3000)
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535")
  }

  const nodeEnv = environment.NODE_ENV ?? "development"
  if (nodeEnv !== "development" && nodeEnv !== "test" && nodeEnv !== "production") {
    throw new Error("NODE_ENV must be development, test, or production")
  }

  return { port, logLevel: environment.LOG_LEVEL ?? "info", nodeEnv }
}
