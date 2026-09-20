import { defaultCategoryNames } from "../src/categories/defaultCategories"
import { prisma } from "../src/database/prisma"

/** Creates an optional local user without putting development credentials in source control. */
async function seed(): Promise<void> {
  const email = process.env.SEED_USER_EMAIL?.trim().toLowerCase()
  const password = process.env.SEED_USER_PASSWORD
  if (!email || !password) {
    console.log("Seed skipped: set SEED_USER_EMAIL and SEED_USER_PASSWORD to create a local user")
    return
  }
  if (password.length < 8) throw new Error("SEED_USER_PASSWORD must contain at least 8 characters")

  const passwordHash = await Bun.password.hash(password)
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash, displayName: "Development User" },
    select: { id: true },
  })

  for (const name of defaultCategoryNames) {
    await prisma.category.upsert({
      where: { userId_name: { userId: user.id, name } },
      update: {},
      create: { userId: user.id, name },
    })
  }
  console.log(`Development user and ${defaultCategoryNames.length} categories seeded`)
}

try {
  await seed()
} finally {
  await prisma.$disconnect()
}
