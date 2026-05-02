import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma.js'
import { runWithTenantAsync, type TenantInfo } from '../lib/tenant-context.js'
import { extractSubdomain } from '../lib/subdomain.js'
import { getCachedTenant, setCachedTenant } from '../lib/redis.js'

export async function tenantResolver(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/health') return next()
  if (req.path.startsWith('/internal/')) return next()
  if (req.path.startsWith('/auth/oauth/')) return next()

  try {
    const host = req.headers.host ?? ''
    const subdomain = extractSubdomain(host)

    if (!subdomain) {
      res.status(404).json({ error: 'Tenant not found' })
      return
    }

    let tenant = await getCachedTenant(subdomain) as TenantInfo | null
    if (!tenant) {
      tenant = await prisma.tenant.findUnique({ where: { subdomain } })
      if (tenant) {
        await setCachedTenant(subdomain, tenant)
      }
    }

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
