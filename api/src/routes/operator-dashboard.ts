import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireOperatorAuth, requireOperatorRole, OperatorAuthRequest } from '../middleware/operator-auth.js'
import { logOperatorAction } from '../lib/operator-audit.js'
import { deleteTenantInProvisioning } from '../lib/provisioning.js'
import { sendTemplateTestEmail, defaultEmailTemplates } from '../lib/mailer.js'

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
  await deleteTenantInProvisioning(subdomain).catch((err) => {
    console.error('Failed to delete tenant in provisioning:', err)
  })

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

// ── Discount codes (accounting+) ───────────────────────────
router.get('/discount-codes', requireOperatorAuth, requireOperatorRole('ACCOUNTING', 'GLOBAL_ADMIN'), async (_req, res) => {
  const codes = await prisma.discountCode.findMany({
    orderBy: { createdAt: 'desc' },
  })
  res.json({ codes })
})

const createDiscountCodeSchema = z.object({
  code: z.string().min(1).max(50),
  type: z.enum(['FREE_TIME', 'PERCENTAGE']),
  value: z.number().int().min(1),
  maxUses: z.number().int().min(1).optional(),
  validUntil: z.string().datetime().optional(),
  appliesTo: z.enum(['ANY', 'ANNUAL', 'MONTHLY']).default('ANY'),
})

router.post('/discount-codes', requireOperatorAuth, requireOperatorRole('ACCOUNTING', 'GLOBAL_ADMIN'), async (req, res) => {
  const result = createDiscountCodeSchema.safeParse(req.body)
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return }

  const existing = await prisma.discountCode.findUnique({
    where: { code: result.data.code },
  })
  if (existing) { res.status(409).json({ error: 'Code already exists' }); return }

  const code = await prisma.discountCode.create({
    data: {
      code: result.data.code.toUpperCase(),
      type: result.data.type,
      value: result.data.value,
      maxUses: result.data.maxUses,
      validUntil: result.data.validUntil ? new Date(result.data.validUntil) : null,
      appliesTo: result.data.appliesTo,
    },
  })

  const actorId = (req as OperatorAuthRequest).operatorId
  await logOperatorAction({
    operatorId: actorId,
    action: 'create_discount_code',
    targetType: 'discount_code',
    targetId: code.id,
    newValue: { code: code.code, type: code.type, value: code.value },
    ipAddress: req.ip ?? req.socket?.remoteAddress,
  })

  res.status(201).json({ code })
})

router.delete('/discount-codes/:id', requireOperatorAuth, requireOperatorRole('GLOBAL_ADMIN'), async (req, res) => {
  const { id } = req.params
  const code = await prisma.discountCode.findUnique({ where: { id } })
  if (!code) { res.status(404).json({ error: 'Discount code not found' }); return }

  await prisma.discountCode.delete({ where: { id } })

  const actorId = (req as OperatorAuthRequest).operatorId
  await logOperatorAction({
    operatorId: actorId,
    action: 'delete_discount_code',
    targetType: 'discount_code',
    targetId: code.id,
    oldValue: { code: code.code, type: code.type, value: code.value },
    ipAddress: req.ip ?? req.socket?.remoteAddress,
  })

  res.json({ ok: true })
})

// ── Email templates (global_admin only) ────────────────────
router.get('/email-templates', requireOperatorAuth, requireOperatorRole('GLOBAL_ADMIN'), async (_req, res) => {
  const templates = await prisma.emailTemplate.findMany({
    orderBy: { name: 'asc' },
  })
  res.json({ templates })
})

router.get('/email-templates/:name', requireOperatorAuth, requireOperatorRole('GLOBAL_ADMIN'), async (req, res) => {
  const template = await prisma.emailTemplate.findUnique({
    where: { name: req.params.name },
  })
  if (template) {
    res.json({ template })
    return
  }

  const defaults = defaultEmailTemplates[req.params.name]
  if (!defaults) { res.status(404).json({ error: 'Template not found' }); return }

  res.json({
    template: {
      id: '',
      name: req.params.name,
      subject: defaults.subject,
      htmlBody: defaults.html,
      createdAt: '',
      updatedAt: '',
    },
  })
})

const emailTemplateSchema = z.object({
  name: z.string().min(1).max(50),
  subject: z.string().min(1).max(200),
  htmlBody: z.string().min(1),
})

router.post('/email-templates', requireOperatorAuth, requireOperatorRole('GLOBAL_ADMIN'), async (req, res) => {
  const result = emailTemplateSchema.safeParse(req.body)
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return }

  const template = await prisma.emailTemplate.upsert({
    where: { name: result.data.name },
    update: {
      subject: result.data.subject,
      htmlBody: result.data.htmlBody,
    },
    create: {
      name: result.data.name,
      subject: result.data.subject,
      htmlBody: result.data.htmlBody,
    },
  })

  const actorId = (req as OperatorAuthRequest).operatorId
  await logOperatorAction({
    operatorId: actorId,
    action: 'update_email_template',
    targetType: 'email_template',
    targetId: template.id,
    newValue: { name: template.name, subject: template.subject },
    ipAddress: req.ip ?? req.socket?.remoteAddress,
  })

  res.json({ template })
})

router.delete('/email-templates/:id', requireOperatorAuth, requireOperatorRole('GLOBAL_ADMIN'), async (req, res) => {
  const { id } = req.params
  const template = await prisma.emailTemplate.findUnique({ where: { id } })
  if (!template) { res.status(404).json({ error: 'Template not found' }); return }

  await prisma.emailTemplate.delete({ where: { id } })

  const actorId = (req as OperatorAuthRequest).operatorId
  await logOperatorAction({
    operatorId: actorId,
    action: 'delete_email_template',
    targetType: 'email_template',
    targetId: template.id,
    oldValue: { name: template.name, subject: template.subject },
    ipAddress: req.ip ?? req.socket?.remoteAddress,
  })

  res.json({ ok: true })
})

// ── Send test email for a template (global_admin only) ─────
const testEmailSchema = z.object({
  to: z.string().email(),
})

const sampleTemplateVars: Record<string, Record<string, string>> = {
  welcome: { name: 'Alex', appUrl: 'https://demo.babything.app' },
  invite: { inviterName: 'Jordan', babyName: 'Milo', inviteUrl: 'https://demo.babything.app/invite/abc123' },
  password_reset: { name: 'Alex', resetUrl: 'https://demo.babything.app/reset?token=abc123' },
  report: { babyName: 'Milo' },
}

router.post('/email-templates/:name/test', requireOperatorAuth, requireOperatorRole('GLOBAL_ADMIN'), async (req, res) => {
  const result = testEmailSchema.safeParse(req.body)
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return }

  const { name } = req.params
  const { to } = result.data

  const vars = sampleTemplateVars[name]
  if (!vars) { res.status(400).json({ error: 'Unknown template name' }); return }

  try {
    await sendTemplateTestEmail(to, name, vars)
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Failed to send test email' })
    return
  }

  const actorId = (req as OperatorAuthRequest).operatorId
  await logOperatorAction({
    operatorId: actorId,
    action: 'send_test_email',
    targetType: 'email_template',
    targetId: name,
    newValue: { to, templateName: name },
    ipAddress: req.ip ?? req.socket?.remoteAddress,
  })

  res.json({ ok: true })
})

// ── Reset templates to defaults (global_admin only) ────────
router.post('/email-templates/seed', requireOperatorAuth, requireOperatorRole('GLOBAL_ADMIN'), async (req, res) => {
  for (const [name, { subject, html }] of Object.entries(defaultEmailTemplates)) {
    await prisma.emailTemplate.upsert({
      where: { name },
      update: { subject, htmlBody: html },
      create: { name, subject, htmlBody: html },
    })
  }

  const actorId = (req as OperatorAuthRequest).operatorId
  await logOperatorAction({
    operatorId: actorId,
    action: 'seed_email_templates',
    targetType: 'email_template',
    targetId: 'all',
    newValue: { templates: Object.keys(defaultEmailTemplates) },
    ipAddress: req.ip ?? req.socket?.remoteAddress,
  })

  res.json({ ok: true })
})

// ── Plans (accounting+) ────────────────────────────────────
router.get('/plans', requireOperatorAuth, requireOperatorRole('ACCOUNTING', 'GLOBAL_ADMIN'), async (_req, res) => {
  const plans = await prisma.plan.findMany({
    orderBy: { sortOrder: 'asc' },
  })
  res.json({ plans })
})

const createPlanSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  monthlyPrice: z.number().int().min(0),
  annualPrice: z.number().int().min(0).optional(),
  annualDiscountPercent: z.number().int().min(0).max(100).optional(),
  stripeMonthlyPriceId: z.string().max(100).optional(),
  stripeAnnualPriceId: z.string().max(100).optional(),
  features: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})

router.post('/plans', requireOperatorAuth, requireOperatorRole('ACCOUNTING', 'GLOBAL_ADMIN'), async (req, res) => {
  const result = createPlanSchema.safeParse(req.body)
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return }

  const existing = await prisma.plan.findUnique({
    where: { name: result.data.name },
  })
  if (existing) { res.status(409).json({ error: 'Plan name already exists' }); return }

  let annualPrice = result.data.annualPrice ?? 0
  let annualDiscountPercent = result.data.annualDiscountPercent ?? null

  if (annualDiscountPercent != null) {
    annualPrice = Math.round(result.data.monthlyPrice * 12 * (100 - annualDiscountPercent) / 100)
  } else if (!result.data.annualPrice) {
    annualPrice = Math.round(result.data.monthlyPrice * 12)
  }

  const plan = await prisma.plan.create({
    data: {
      name: result.data.name,
      description: result.data.description,
      monthlyPrice: result.data.monthlyPrice,
      annualPrice,
      annualDiscountPercent,
      stripeMonthlyPriceId: result.data.stripeMonthlyPriceId,
      stripeAnnualPriceId: result.data.stripeAnnualPriceId,
      features: result.data.features,
      isActive: result.data.isActive,
      sortOrder: result.data.sortOrder,
    },
  })

  const actorId = (req as OperatorAuthRequest).operatorId
  await logOperatorAction({
    operatorId: actorId,
    action: 'create_plan',
    targetType: 'plan',
    targetId: plan.id,
    newValue: { name: plan.name, monthlyPrice: plan.monthlyPrice, annualPrice: plan.annualPrice },
    ipAddress: req.ip ?? req.socket?.remoteAddress,
  })

  res.status(201).json({ plan })
})

const updatePlanSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(500).optional(),
  monthlyPrice: z.number().int().min(0).optional(),
  annualPrice: z.number().int().min(0).optional(),
  annualDiscountPercent: z.number().int().min(0).max(100).optional(),
  stripeMonthlyPriceId: z.string().max(100).optional(),
  stripeAnnualPriceId: z.string().max(100).optional(),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

router.patch('/plans/:id', requireOperatorAuth, requireOperatorRole('ACCOUNTING', 'GLOBAL_ADMIN'), async (req, res) => {
  const result = updatePlanSchema.safeParse(req.body)
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return }

  const plan = await prisma.plan.findUnique({ where: { id: req.params.id } })
  if (!plan) { res.status(404).json({ error: 'Plan not found' }); return }

  const data: any = { ...result.data }
  const monthlyPrice = data.monthlyPrice ?? plan.monthlyPrice

  if (data.annualDiscountPercent != null) {
    data.annualPrice = Math.round(monthlyPrice * 12 * (100 - data.annualDiscountPercent) / 100)
  } else if (data.annualPrice == null && plan.annualDiscountPercent != null) {
    // If neither annualPrice nor annualDiscountPercent is provided, but the plan previously
    // had a discount, recalculate based on the new monthly price
    data.annualPrice = Math.round(monthlyPrice * 12 * (100 - plan.annualDiscountPercent) / 100)
  }

  const updated = await prisma.plan.update({
    where: { id: req.params.id },
    data,
  })

  const actorId = (req as OperatorAuthRequest).operatorId
  await logOperatorAction({
    operatorId: actorId,
    action: 'update_plan',
    targetType: 'plan',
    targetId: plan.id,
    oldValue: { name: plan.name, monthlyPrice: plan.monthlyPrice, annualPrice: plan.annualPrice },
    newValue: { name: updated.name, monthlyPrice: updated.monthlyPrice, annualPrice: updated.annualPrice },
    ipAddress: req.ip ?? req.socket?.remoteAddress,
  })

  res.json({ plan: updated })
})

router.delete('/plans/:id', requireOperatorAuth, requireOperatorRole('GLOBAL_ADMIN'), async (req, res) => {
  const plan = await prisma.plan.findUnique({ where: { id: req.params.id } })
  if (!plan) { res.status(404).json({ error: 'Plan not found' }); return }

  await prisma.plan.delete({ where: { id: req.params.id } })

  const actorId = (req as OperatorAuthRequest).operatorId
  await logOperatorAction({
    operatorId: actorId,
    action: 'delete_plan',
    targetType: 'plan',
    targetId: plan.id,
    oldValue: { name: plan.name },
    ipAddress: req.ip ?? req.socket?.remoteAddress,
  })

  res.json({ ok: true })
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
