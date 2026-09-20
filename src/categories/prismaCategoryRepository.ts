import type { PrismaClient } from "../../generated/prisma/client"
import { prisma } from "../database/prisma"
import type { CategoryRepository } from "./categoryRepository"

/** Reads categories from Prisma without exposing generated database types to callers. */
export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  list(userId: string) {
    return this.client.category.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })
  }

  findById(userId: string, id: string) {
    return this.client.category.findFirst({
      where: { id, userId },
      select: { id: true, name: true },
    })
  }
}
