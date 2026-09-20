import { Elysia } from "elysia"
import type { CategoryRepository } from "./categoryRepository"

/** Exposes the category list used by manual transaction entry. */
export function createCategoryRoutes(categories: CategoryRepository) {
  return new Elysia({ prefix: "/categories" }).get("/", () => categories.list(), {
    detail: {
      tags: ["Categories"],
      summary: "List transaction categories",
      description: "Returns the stable category IDs used when creating or updating transactions.",
    },
  })
}
