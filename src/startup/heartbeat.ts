import type { Logger } from "../logging/logger"

const DEFAULT_INTERVAL_MS = 60_000

/** Emits a debug heartbeat and returns a cleanup function for graceful shutdown. */
export function startHeartbeat(
  logger: Logger,
  port: number,
  intervalMs = DEFAULT_INTERVAL_MS,
): () => void {
  const startedAt = Date.now()
  const timer = setInterval(() => {
    const memory = process.memoryUsage()
    logger.debug("Backend heartbeat", {
      status: "running",
      port,
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1_000),
      memoryMb: Math.round((memory.rss / 1024 / 1024) * 10) / 10,
    })
  }, intervalMs)

  // A diagnostic timer should never be the reason the backend process stays alive.
  timer.unref()
  return () => clearInterval(timer)
}
