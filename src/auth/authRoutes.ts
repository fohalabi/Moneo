import { Elysia, t } from "elysia"
import type { AuthService } from "./authService"

export const sessionCookieName = "moneo_session"

/** Reads one cookie without trusting or decoding unrelated request headers. */
export function sessionToken(request: Request): string | undefined {
  const cookie = request.headers.get("cookie")
  if (!cookie) return undefined
  for (const part of cookie.split(";")) {
    const [name, ...value] = part.trim().split("=")
    if (name === sessionCookieName) return decodeURIComponent(value.join("="))
  }
  return undefined
}

function sessionCookie(token: string, expiresAt: Date, secure: boolean): string {
  return `${sessionCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Expires=${expiresAt.toUTCString()}${secure ? "; Secure" : ""}`
}

function expiredSessionCookie(secure: boolean): string {
  return `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`
}

const credentialsBody = t.Object({
  email: t.String({ minLength: 3, maxLength: 320 }),
  password: t.String({ minLength: 8, maxLength: 200 }),
})

/** Exposes cookie-based authentication without returning raw session tokens in JSON. */
export function createAuthRoutes(service: AuthService, secureCookies: boolean) {
  return new Elysia({ prefix: "/auth" })
    .post("/register", async ({ body, set }) => {
      const result = await service.register(body.email, body.password, body.displayName)
      set.status = 201
      set.headers["set-cookie"] = sessionCookie(result.token, result.expiresAt, secureCookies)
      return { user: result.user }
    }, {
      body: t.Intersect([credentialsBody, t.Object({ displayName: t.Optional(t.String({ maxLength: 100 })) })]),
      detail: { tags: ["Authentication"], summary: "Register a user" },
    })
    .post("/login", async ({ body, set }) => {
      const result = await service.login(body.email, body.password)
      set.headers["set-cookie"] = sessionCookie(result.token, result.expiresAt, secureCookies)
      return { user: result.user }
    }, {
      body: credentialsBody,
      detail: { tags: ["Authentication"], summary: "Log in" },
    })
    .post("/logout", async ({ request, set }) => {
      await service.logout(sessionToken(request))
      set.headers["set-cookie"] = expiredSessionCookie(secureCookies)
      set.status = 204
    }, { detail: { tags: ["Authentication"], summary: "Log out" } })
    .get("/me", async ({ request }) => ({ user: await service.authenticate(sessionToken(request)) }), {
      detail: { tags: ["Authentication"], summary: "Get the current user" },
    })
}
