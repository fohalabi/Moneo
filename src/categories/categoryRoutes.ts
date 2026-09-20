import { Elysia } from "elysia"
import { sessionToken } from "../auth/authRoutes"
import type { AuthService } from "../auth/authService"
import type { CategoryRepository } from "./categoryRepository"

/** Exposes the category list used by manual transaction entry. */
export function createCategoryRoutes(categories: CategoryRepository, auth: AuthService) {
  return new Elysia({ prefix: "/categories" }).get("/", async ({ request }) => {
    const user = await auth.authenticate(sessionToken(request))
    return categories.list(user.id)
  }, {
    detail: {
      tags: ["Categories"],
      summary: "List transaction categories",
      description: "Returns the stable category IDs used when creating or updating transactions.",
    },
  })
}
