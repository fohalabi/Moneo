type BannerColor = "green" | "skyBlue" | "magenta" | "white"

const colors: Record<BannerColor, string> = {
  green: "\u001b[32m",
  skyBlue: "\u001b[96m",
  magenta: "\u001b[35m",
  white: "\u001b[37m",
}

const reset = "\u001b[0m"

/** Prints one colored console line for the human-readable startup banner. */
function print(message: string, color: BannerColor): void {
  console.log(`${colors[color]}${message}${reset}`)
}

/** Shows a concise readiness banner only after the HTTP server has started listening. */
export function printStartupBanner(port: number): void {
  print("┌─────────────────────────────────────────────────────────────┐", "green")
  print("│ ✅ Routes configured!                                      │", "green")
  print("└─────────────────────────────────────────────────────────────┘", "green")
  print("⚡️🚀 Moneo Backend::Started", "skyBlue")
  print(`⚡️🚀 Moneo Backend::Running on port ${port}`, "skyBlue")
  print("", "white")
  print("┌─────────────────────────────────────────────────────────────┐", "magenta")
  print("│                    🎉 READY TO SERVE 🎉                     │", "magenta")
  print("└─────────────────────────────────────────────────────────────┘", "magenta")
}
