import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma.js'
import { runWithTenantAsync, type TenantInfo } from '../lib/tenant-context.js'

const DEFAULT_TENANT_ID = 'default'

async function resolveDefaultTenant(): Promise<TenantInfo> {
  let tenant = await prisma.tenant.findUnique({ where: { id: DEFAULT_TENANT_ID } })
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        id: DEFAULT_TENANT_ID,
        subdomain: 'default',
        status: 'ACTIVE',
        plan: 'SELFHOSTED',
      },
    })
  }
  return tenant
}

export async function tenantResolver(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/health') return next()
  if (req.path.startsWith('/auth/oauth/')) return next()

  try {
    const tenant = await resolveDefaultTenant()
    return runWithTenantAsync({ tenantId: tenant.id, tenant }, next)
  } catch (err) {
    next(err)
  }
}
