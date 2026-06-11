import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? 'file:./prisma/data/dev.db',
})

const prisma = new PrismaClient({ adapter })

async function main() {
  // Noch kein Seed nötig — Stile werden über die App angelegt.
  console.log('🌱 Nothing to seed yet.')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
