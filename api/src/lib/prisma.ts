import { PrismaClient } from '@prisma/client'
import { tenantPrismaMiddleware } from './tenant-prisma-middleware.js'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient()
  client.$use(tenantPrismaMiddleware())
  return client
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
