import path from 'path'
import { createClient } from '@libsql/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { PrismaClient } from '@prisma/client'

// Prisma resuelve file:./X relativo a prisma/ (donde está schema.prisma).
// libSQL resuelve relativo al CWD. Normalizamos a ruta absoluta.
function toLibSqlUrl(prismaUrl: string): string {
  const match = prismaUrl.match(/^file:(.+)$/)
  if (!match) return prismaUrl
  const filePath = match[1]
  if (path.isAbsolute(filePath)) return prismaUrl
  const absolute = path.resolve(process.cwd(), 'prisma', filePath)
  return `file:${absolute}`
}

function createPrismaClient(): PrismaClient {
  const url = toLibSqlUrl(process.env.DATABASE_URL ?? 'file:./dev.db')
  const encryptionKey = process.env.DB_ENCRYPTION_KEY || undefined
  const libsql = createClient({ url, encryptionKey })
  const adapter = new PrismaLibSQL(libsql)
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }
export const prisma = globalForPrisma.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
