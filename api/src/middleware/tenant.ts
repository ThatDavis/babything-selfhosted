import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma.js'
import { isSelfHosted } from '../lib/mode.js'
import { runWithTenantAsync, type TenantInfo } from '../lib/tenant-context.js'
import { extractSubdomain } from '../lib/subdomain.js'

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

  try {
    if (isSelfHosted()) {
      const tenant = await resolveDefaultTenant()
      return runWithTenantAsync({ tenantId: tenant.id, tenant }, next)
    }

    const host = req.headers.host ?? ''
    const subdomain = extractSubdomain(host)

    if (!subdomain) {
      res.status(404).json({ error: 'Tenant not found' })
      return
    }

    const tenant = await prisma.tenant.findUnique({ where: { subdomain } })

    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' })
      return
    }

    if (tenant.status === 'SUSPENDED') {
      const isWrite = req.method !== 'GET' && req.method !== 'HEAD'
      if (isWrite) {
        res.status(403).json({ error: 'Subscription suspended. Please renew to continue.' })
        return
      }
    }

    return runWithTenantAsync({ tenantId: tenant.id, tenant }, next)
  } catch (err) {
    next(err)
  }
}
