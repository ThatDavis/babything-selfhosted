import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireInternalKey } from '../middleware/internal.js'

const router = Router()

const RESERVED_SUBDOMAINS = new Set([
  'operator', 'www', 'api', 'mail', 'admin', 'support', 'help', 'billing',
  'provisioning', 'landing', 'web', 'app', 'status', 'blog', 'docs', 'static',
  'cdn', 'staging', 'dev', 'test', 'demo', 'api-v1', 'api-v2', 'socket',
  'ws', 'health', 'metrics', 'grafana', 'prometheus', 'registry', 'git',
])

// ── Create tenant (called by provisioning service) ─────────
const createTenantSchema = z.object({
  subdomain: z.string().min(1),
  status: z.enum(['TRIAL', 'ACTIVE', 'SUSPENDED']).default('TRIAL'),
  trialEndsAt: z.string().datetime().optional().nullable(),
  plan: z.string().default('FLAT_RATE'),
  billingPeriod: z.enum(['MONTHLY', 'ANNUAL']).default('MONTHLY'),
  referralCode: z.string().optional(),
})

router.post('/tenants', requireInternalKey, async (req, res) => {
  const result = createTenantSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() })
    return
  }

  if (RESERVED_SUBDOMAINS.has(result.data.subdomain)) {
    res.status(409).json({ error: 'Subdomain is reserved' })
    return
  }

  const existing = await prisma.tenant.findUnique({
    where: { subdomain: result.data.subdomain },
  })
  if (existing) {
    res.status(409).json({ error: 'Subdomain already taken' })
    return
  }

  const tenant = await prisma.tenant.create({
    data: {
      subdomain: result.data.subdomain,
      status: result.data.status,
      trialEndsAt: result.data.trialEndsAt ? new Date(result.data.trialEndsAt) : null,
      plan: result.data.plan,
      billingPeriod: result.data.billingPeriod,
      referralCode: result.data.referralCode,
    },
  })

  // Ensure a SystemSettings row exists for the new tenant
  await prisma.systemSettings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: { tenantId: tenant.id, unitSystem: 'metric', streamEnabled: false },
  })

  res.status(201).json(tenant)
})

// ── Update tenant status ────────────────────────────────────
const patchTenantSchema = z.object({
  status: z.enum(['TRIAL', 'ACTIVE', 'SUSPENDED']).optional(),
  trialEndsAt: z.string().datetime().optional().nullable(),
  plan: z.string().optional(),
  billingPeriod: z.enum(['MONTHLY', 'ANNUAL']).optional(),
  referralCode: z.string().optional(),
})

router.patch('/tenants/:subdomain', requireInternalKey, async (req, res) => {
  const result = patchTenantSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() })
    return
  }

  const data: Record<string, unknown> = {}
  if (result.data.status !== undefined) data.status = result.data.status
  if (result.data.trialEndsAt !== undefined) {
    data.trialEndsAt = result.data.trialEndsAt ? new Date(result.data.trialEndsAt) : null
  }
  if (result.data.plan !== undefined) data.plan = result.data.plan
  if (result.data.billingPeriod !== undefined) data.billingPeriod = result.data.billingPeriod
  if (result.data.referralCode !== undefined) data.referralCode = result.data.referralCode

  const tenant = await prisma.tenant.update({
    where: { subdomain: req.params.subdomain },
    data,
  })

  res.json(tenant)
})

// ── Delete tenant (hard delete, GDPR/post-retention) ────────
router.delete('/tenants/:subdomain', requireInternalKey, async (req, res) => {
  await prisma.tenant.delete({ where: { subdomain: req.params.subdomain } })
  res.status(204).send()
})

// ── Get tenant (used by provisioning service or main app) ───
router.get('/tenants/:subdomain', requireInternalKey, async (req, res) => {
  const tenant = await prisma.tenant.findUnique({
    where: { subdomain: req.params.subdomain },
  })
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' })
    return
  }
  res.json(tenant)
})

// ── Validate discount code (called by provisioning service) ─
const validateDiscountCodeSchema = z.object({
  code: z.string().min(1),
  billingPeriod: z.enum(['MONTHLY', 'ANNUAL']).optional(),
})

router.post('/discount-codes/validate', requireInternalKey, async (req, res) => {
  const result = validateDiscountCodeSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() })
    return
  }

  const { code, billingPeriod } = result.data

  const discountCode = await prisma.discountCode.findUnique({
    where: { code: code.toUpperCase() },
  })

  if (!discountCode || !discountCode.isActive) {
    res.status(404).json({ error: 'Invalid discount code' })
    return
  }

  if (discountCode.validUntil && new Date() > discountCode.validUntil) {
    res.status(400).json({ error: 'Discount code has expired' })
    return
  }

  if (discountCode.maxUses !== null && discountCode.usedCount >= discountCode.maxUses) {
    res.status(400).json({ error: 'Discount code usage limit reached' })
    return
  }

  if (billingPeriod && discountCode.appliesTo !== 'ANY' && discountCode.appliesTo !== billingPeriod) {
    res.status(400).json({ error: `Discount code not valid for ${billingPeriod.toLowerCase()} billing` })
    return
  }

  res.json({
    valid: true,
    code: discountCode.code,
    type: discountCode.type,
    value: discountCode.value,
    appliesTo: discountCode.appliesTo,
  })
})

// ── Record discount code usage (called by provisioning service)
router.post('/discount-codes/use', requireInternalKey, async (req, res) => {
  const result = z.object({ code: z.string().min(1) }).safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() })
    return
  }

  const discountCode = await prisma.discountCode.findUnique({
    where: { code: result.data.code.toUpperCase() },
  })

  if (!discountCode) {
    res.status(404).json({ error: 'Discount code not found' })
    return
  }

  await prisma.discountCode.update({
    where: { id: discountCode.id },
    data: { usedCount: { increment: 1 } },
  })

  res.json({ ok: true })
})

export default router
