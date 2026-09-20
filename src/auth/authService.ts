import { createHash, randomBytes } from "node:crypto"
import type { PrismaClient } from "../../generated/prisma/client"
import { defaultCategoryNames } from "../categories/defaultCategories"
import { prisma } from "../database/prisma"
import { unauthorizedError, validationError } from "../errors/appError"
import type { Logger } from "../logging/logger"

const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1_000

export type AuthenticatedUser = { id: string; email: string; displayName: string | null }
export type AuthResult = { user: AuthenticatedUser; token: string; expiresAt: Date }

/** Hashes opaque session tokens so a database leak cannot expose active credentials. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/** Normalizes and validates the small credential surface supported by V1. */
function credentials(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase()
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) throw validationError("A valid email is required")
  if (password.length < 8) throw validationError("Password must contain at least 8 characters")
  return { email: normalizedEmail, password }
}

/** Owns registration, password verification, and revocable database sessions. */
export class AuthService {
  constructor(
    private readonly logger: Logger,
    private readonly client: PrismaClient = prisma,
  ) {}

  async register(email: string, password: string, displayName?: string): Promise<AuthResult> {
    const input = credentials(email, password)
    const passwordHash = await Bun.password.hash(input.password)
    const name = displayName?.trim() || null
    if (name && name.length > 100) throw validationError("Display name must not exceed 100 characters")

    const user = await this.client.$transaction(async (database) => {
      const created = await database.user.create({
        data: { email: input.email, passwordHash, displayName: name },
        select: { id: true, email: true, displayName: true },
      })
      await database.category.createMany({
        data: defaultCategoryNames.map((categoryName) => ({ name: categoryName, userId: created.id })),
      })
      return created
    })

    this.logger.info("User registered", { userId: user.id })
    return this.createSession(user)
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const input = credentials(email, password)
    const record = await this.client.user.findUnique({ where: { email: input.email } })
    if (!record || !(await Bun.password.verify(input.password, record.passwordHash))) {
      throw unauthorizedError("Email or password is incorrect")
    }

    const user = { id: record.id, email: record.email, displayName: record.displayName }
    this.logger.info("User logged in", { userId: user.id })
    return this.createSession(user)
  }

  async authenticate(token: string | undefined): Promise<AuthenticatedUser> {
    if (!token) throw unauthorizedError()
    const session = await this.client.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: { select: { id: true, email: true, displayName: true } } },
    })
    if (!session || session.expiresAt <= new Date()) {
      if (session) await this.client.session.delete({ where: { id: session.id } })
      throw unauthorizedError("Session is missing or expired")
    }
    return session.user
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) return
    await this.client.session.deleteMany({ where: { tokenHash: hashToken(token) } })
  }

  private async createSession(user: AuthenticatedUser): Promise<AuthResult> {
    const token = randomBytes(32).toString("base64url")
    const expiresAt = new Date(Date.now() + sessionLifetimeMs)
    await this.client.session.create({ data: { tokenHash: hashToken(token), userId: user.id, expiresAt } })
    return { user, token, expiresAt }
  }
}
