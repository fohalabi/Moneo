import type { PrismaClient } from "../../generated/prisma/client"
import { prisma } from "../database/prisma"
import type { CategoryRepository } from "./categoryRepository"

/** Reads categories from Prisma without exposing generated database types to callers. */
export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  list() {
    return this.client.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })
  }

  findById(id: string) {
    return this.client.category.findUnique({
      where: { id },
      select: { id: true, name: true },
    })
  }
}
