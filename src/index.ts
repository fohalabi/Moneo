import { createApp } from "./app"
import { PrismaCategoryRepository } from "./categories/prismaCategoryRepository"
import { loadConfig } from "./config/env"
import { prisma } from "./database/prisma"
import { loggerFromEnvironment } from "./logging/logger"
import { startHeartbeat } from "./startup/heartbeat"
import { printStartupBanner } from "./startup/startupBanner"
import { PrismaTransactionRepository } from "./transactions/prismaTransactionRepository"

const config = loadConfig()
const logger = loggerFromEnvironment(config.logLevel)
const app = createApp({
  transactions: new PrismaTransactionRepository(prisma),
  categories: new PrismaCategoryRepository(prisma),
  logger,
})

app.listen(config.port)
printStartupBanner(config.port)
logger.info("Moneo API started", { port: config.port })
const stopHeartbeat = startHeartbeat(logger, config.port)

/** Stops HTTP and database resources cleanly during local shutdown or deployment. */
async function shutdown(signal: string): Promise<void> {
  logger.info("Moneo API stopping", { signal })
  stopHeartbeat()
  app.server?.stop()
  await prisma.$disconnect()
  process.exit(0)
}

process.once("SIGINT", () => void shutdown("SIGINT"))
process.once("SIGTERM", () => void shutdown("SIGTERM"))
