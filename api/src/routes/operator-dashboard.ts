import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireOperatorAuth, requireOperatorRole, OperatorAuthRequest } from '../middleware/operator-auth.js'
import { logOperatorAction } from '../lib/operator-audit.js'

const router = Router()

// ── List all tenants (helpdesk+) ───────────────────────────
router.get('/tenants', requireOperatorAuth, requireOperatorRole('HELPDESK', 'ACCOUNTING', 'GLOBAL_ADMIN'), async (req, res) => {
  const { status, search, page = '1', limit = '50' } = req.query as Record<string, string>
  const pageNum = Math.max(1, parseInt(page) || 1)
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50))
  const skip = (pageNum - 1) * limitNum

  const where: any = {}
  if (status) where.status = status
  if (search) {
    where.subdomain = { contains: search, mode: 'insensitive' }
  }

  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
      include: {
        _count: { select: { users: true, babies: true } },
      },
    }),
    prisma.tenant.count({ where }),
  ])

  res.json({
    tenants: tenants.map(t => ({
      id: t.id,
      subdomain: t.subdomain,
      status: t.status,
      trialEndsAt: t.trialEndsAt,
      plan: t.plan,
      billingPeriod: t.billingPeriod,
      referralCode: t.referralCode,
      userCount: t._count.users,
      babyCount: t._count.babies,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  })
})

// ── Get single tenant details (helpdesk+) ──────────────────
router.get('/tenants/:subdomain', requireOperatorAuth, requireOperatorRole('HELPDESK', 'ACCOUNTING', 'GLOBAL_ADMIN'), async (req, res) => {
  const { subdomain } = req.params

  const tenant = await prisma.tenant.findUnique({
    where: { subdomain },
    include: {
      users: { select: { id: true, email: true, name: true, isAdmin: true, createdAt: true } },
      babies: { select: { id: true, name: true, dob: true, createdAt: true } },
      _count: { select: { users: true, babies: true } },
    },
  })

  if (!tenant) { res.status(404).json({ error: 'Tenant not found' }); return }

  res.json({
    tenant: {
      id: tenant.id,
      subdomain: tenant.subdomain,
      status: tenant.status,
      trialEndsAt: tenant.trialEndsAt,
      plan: tenant.plan,
      billingPeriod: tenant.billingPeriod,
      referralCode: tenant.referralCode,
      users: tenant.users,
      babies: tenant.babies,
      userCount: tenant._count.users,
      babyCount: tenant._count.babies,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    },
  })
})

// ── Suspend tenant (global_admin only) ─────────────────────
router.post('/tenants/:subdomain/suspend', requireOperatorAuth, requireOperatorRole('GLOBAL_ADMIN'), async (req, res) => {
  const { subdomain } = req.params
  const tenant = await prisma.tenant.findUnique({ where: { subdomain } })
  if (!tenant) { res.status(404).json({ error: 'Tenant not found' }); return }

  const updated = await prisma.tenant.update({
    where: { subdomain },
    data: { status: 'SUSPENDED' },
  })

  const actorId = (req as OperatorAuthRequest).operatorId
  await logOperatorAction({
    operatorId: actorId,
    action: 'suspend_tenant',
    targetType: 'tenant',
    targetId: tenant.id,
    oldValue: { status: tenant.status },
    newValue: { status: updated.status },
    ipAddress: req.ip ?? req.socket?.remoteAddress,
  })

  res.json({ tenant: updated })
})

// ── Activate tenant (global_admin only) ────────────────────
router.post('/tenants/:subdomain/activate', requireOperatorAuth, requireOperatorRole('GLOBAL_ADMIN'), async (req, res) => {
  const { subdomain } = req.params
  const tenant = await prisma.tenant.findUnique({ where: { subdomain } })
  if (!tenant) { res.status(404).json({ error: 'Tenant not found' }); return }

  const updated = await prisma.tenant.update({
    where: { subdomain },
    data: { status: 'ACTIVE' },
  })

  const actorId = (req as OperatorAuthRequest).operatorId
  await logOperatorAction({
    operatorId: actorId,
    action: 'activate_tenant',
    targetType: 'tenant',
    targetId: tenant.id,
    oldValue: { status: tenant.status },
    newValue: { status: updated.status },
    ipAddress: req.ip ?? req.socket?.remoteAddress,
  })

  res.json({ tenant: updated })
})

// ── Extend trial (accounting+ only) ────────────────────────
const extendTrialSchema = z.object({
  days: z.number().int().min(1).max(90),
})

router.post('/tenants/:subdomain/extend-trial', requireOperatorAuth, requireOperatorRole('ACCOUNTING', 'GLOBAL_ADMIN'), async (req, res) => {
  const { subdomain } = req.params
  const result = extendTrialSchema.safeParse(req.body)
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return }

  const tenant = await prisma.tenant.findUnique({ where: { subdomain } })
  if (!tenant) { res.status(404).json({ error: 'Tenant not found' }); return }

  const currentTrialEnd = tenant.trialEndsAt ?? new Date()
  const newTrialEnd = new Date(currentTrialEnd)
  newTrialEnd.setDate(newTrialEnd.getDate() + result.data.days)

  const updated = await prisma.tenant.update({
    where: { subdomain },
    data: { trialEndsAt: newTrialEnd },
  })

  const actorId = (req as OperatorAuthRequest).operatorId
  await logOperatorAction({
    operatorId: actorId,
    action: 'extend_trial',
    targetType: 'tenant',
    targetId: tenant.id,
    oldValue: { trialEndsAt: tenant.trialEndsAt },
    newValue: { trialEndsAt: updated.trialEndsAt, daysAdded: result.data.days },
    ipAddress: req.ip ?? req.socket?.remoteAddress,
  })

  res.json({ tenant: updated })
})

// ── Delete tenant (global_admin only) ──────────────────────
router.delete('/tenants/:subdomain', requireOperatorAuth, requireOperatorRole('GLOBAL_ADMIN'), async (req, res) => {
  const { subdomain } = req.params
  const tenant = await prisma.tenant.findUnique({ where: { subdomain } })
  if (!tenant) { res.status(404).json({ error: 'Tenant not found' }); return }

  await prisma.tenant.delete({ where: { subdomain } })

  const actorId = (req as OperatorAuthRequest).operatorId
  await logOperatorAction({
    operatorId: actorId,
    action: 'delete_tenant',
    targetType: 'tenant',
    targetId: tenant.id,
    oldValue: { subdomain: tenant.subdomain, status: tenant.status },
    ipAddress: req.ip ?? req.socket?.remoteAddress,
  })

  res.json({ ok: true })
})

// ── Audit log (global_admin only) ──────────────────────────
router.get('/audit-logs', requireOperatorAuth, requireOperatorRole('GLOBAL_ADMIN'), async (req, res) => {
  const { operatorId, targetType, targetId, page = '1', limit = '50' } = req.query as Record<string, string>
  const pageNum = Math.max(1, parseInt(page) || 1)
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50))
  const skip = (pageNum - 1) * limitNum

  const where: any = {}
  if (operatorId) where.operatorId = operatorId
  if (targetType) where.targetType = targetType
  if (targetId) where.targetId = targetId

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
      include: {
        operator: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ])

  res.json({
    logs: logs.map(l => ({
      id: l.id,
      operator: l.operator,
      action: l.action,
      targetType: l.targetType,
      targetId: l.targetId,
      oldValue: l.oldValue ? JSON.parse(l.oldValue) : null,
      newValue: l.newValue ? JSON.parse(l.newValue) : null,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt,
    })),
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  })
})

// ── Dashboard stats (helpdesk+) ────────────────────────────
router.get('/stats', requireOperatorAuth, requireOperatorRole('HELPDESK', 'ACCOUNTING', 'GLOBAL_ADMIN'), async (_req, res) => {
  const [
    totalTenants,
    trialTenants,
    activeTenants,
    suspendedTenants,
    totalUsers,
    totalBabies,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: 'TRIAL' } }),
    prisma.tenant.count({ where: { status: 'ACTIVE' } }),
    prisma.tenant.count({ where: { status: 'SUSPENDED' } }),
    prisma.user.count(),
    prisma.baby.count(),
  ])

  // Tenants created in last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentSignups = await prisma.tenant.count({
    where: { createdAt: { gte: thirtyDaysAgo } },
  })

  // Trials expiring in next 7 days
  const sevenDaysFromNow = new Date()
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

  const expiringTrials = await prisma.tenant.count({
    where: {
      status: 'TRIAL',
      trialEndsAt: { lte: sevenDaysFromNow, gte: new Date() },
    },
  })

  res.json({
    stats: {
      totalTenants,
      trialTenants,
      activeTenants,
      suspendedTenants,
      totalUsers,
      totalBabies,
      recentSignups,
      expiringTrials,
    },
  })
})

export default router
