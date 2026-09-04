import { prisma } from "../src/database/prisma"

const categories = [
    { id: "food", name: "Food" },
    { id: "transport", name: "Transport" },
    { id: "housing", name: "Housing" },
    { id: "utilities", name: "Utilities" },
    { id: "health", name: "Health" },
    { id: "insurance", name: "Insurance" },
    { id: "entertainment", name: "Entertainment" },
    { id: "education", name: "Education" },
    { id: "shopping", name: "Shopping" },
    { id: "salary", name: "Salary" },
    { id: "freelance", name: "Freelance" },
    {id: "investments", name: "Investments" },
    {id: "gifts", name: "Gifts" },
    {id: "travel", name: "Travel" },
    {id: "other", name: "Other" },
]

async function seed(): Promise<void> {
    for (const category of categories) {
        await prisma.category.upsert({
            where: { id: category.id },
            update: { name: category.name },
            create: category,
        })
    }
}

try {
    await seed()
    console.log("Default categories created")
} finally {
    await prisma.$disconnect()
}