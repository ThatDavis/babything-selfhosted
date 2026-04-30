import { Router, Request } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
import { sendTestEmail } from '../lib/mailer.js'
import { AuthRequest } from '../middleware/auth.js'
import { encryptOptional, decryptOptional } from '../lib/crypto.js'
import { audit } from '../lib/audit.js'

const router = Router()
const guard = [requireAuth, requireAdmin]

// ── System Settings ───────────────────────────────────────
const settingsSchema = z.object({
  unitSystem:    z.enum(['metric', 'imperial']).optional(),
  streamEnabled: z.boolean().optional(),
})

function withStreamUrl(s: object) {
  return { ...s, streamUrl: process.env.CAMERA_RTSP_URL ?? '' }
}

router.get('/settings', requireAuth, async (_req, res) => {
  const settings = await prisma.systemSettings.findFirst()
  res.json(withStreamUrl(settings ?? { id: 'default', unitSystem: 'metric', streamEnabled: false }))
})

router.put('/settings', ...guard, async (req, res) => {
  const result = settingsSchema.safeParse(req.body)
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return }
  const settings = await prisma.systemSettings.upsert({
    where: { id: 'default' },
    update: result.data,
    create: { id: 'default', unitSystem: 'metric', streamEnabled: false, ...result.data },
  })
  res.json(withStreamUrl(settings))
})

// ── SMTP ──────────────────────────────────────────────────
const smtpSchema = z.object({
  host:      z.string().min(1),
  port:      z.number().int().default(587),
  secure:    z.boolean().default(false),
  user:      z.string().min(1),
  password:  z.string().optional(),
  fromEmail: z.string().email(),
  fromName:  z.string().default('Babything'),
  enabled:   z.boolean().default(true),
})

router.get('/smtp', ...guard, async (_req, res) => {
  const config = await prisma.smtpConfig.findFirst()
  if (!config) { res.json(null); return }
  // Redact password from API responses (M4)
  const { password: _password, ...rest } = config
  res.json(rest)
})

router.put('/smtp', ...guard, async (req, res) => {
  const result = smtpSchema.safeParse(req.body)
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return }
  const existing = await prisma.smtpConfig.findFirst()
  const { password: rawPassword, ...restData } = result.data

  let encryptedPassword: string
  if (existing && !rawPassword) {
    encryptedPassword = existing.password
  } else if (!existing && !rawPassword) {
    res.status(400).json({ error: 'Password is required when creating SMTP config' }); return
  } else {
    encryptedPassword = encryptOptional(rawPassword!)
  }

  const data = { ...restData, password: encryptedPassword }
  const config = existing
    ? await prisma.smtpConfig.update({ where: { id: existing.id }, data })
    : await prisma.smtpConfig.create({ data })
  const { password: _password, ...rest } = config
  audit(req, 'admin_smtp_updated', 'success', { actor: (req as AuthRequest).userId, details: { host: config.host, fromEmail: config.fromEmail } })
  res.json(rest)
})

router.post('/smtp/test', ...guard, async (req, res) => {
  const { email } = req.body as { email: string }
  if (!email) { res.status(400).json({ error: 'email required' }); return }
  try {
    await sendTestEmail(email)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// ── OAuth Providers ───────────────────────────────────────
const oauthSchema = z.object({
  name:             z.string().min(1),
  label:            z.string().min(1),
  clientId:         z.string().min(1),
  clientSecret:     z.string().optional(),
  authorizationUrl: z.string().url(),
  tokenUrl:         z.string().url(),
  userInfoUrl:      z.string().url(),
  scope:            z.string().default('openid email profile'),
  enabled:          z.boolean().default(true),
})

router.get('/oauth-providers', ...guard, async (_req, res) => {
  const providers = await prisma.oAuthProvider.findMany({ orderBy: { createdAt: 'asc' } })
  // Redact client secrets from API responses
  res.json(providers.map(p => {
    const { clientSecret: _cs, ...rest } = p
    return rest
  }))
})

router.post('/oauth-providers', ...guard, async (req, res) => {
  const result = oauthSchema.safeParse(req.body)
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return }
  if (!result.data.clientSecret) {
    res.status(400).json({ error: 'Client secret is required' }); return
  }
  const data = { ...result.data, clientSecret: encryptOptional(result.data.clientSecret) }
  const provider = await prisma.oAuthProvider.create({ data })
  const { clientSecret: _cs, ...rest } = provider
  audit(req, 'admin_oauth_provider_created', 'success', { actor: (req as AuthRequest).userId, details: { name: provider.name, label: provider.label } })
  res.status(201).json(rest)
})

router.put('/oauth-providers/:id', ...guard, async (req, res) => {
  const result = oauthSchema.partial().safeParse(req.body)
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return }
  const existing = await prisma.oAuthProvider.findUnique({ where: { id: req.params.id } })
  if (!existing) { res.status(404).json({ error: 'Provider not found' }); return }
  const data = { ...result.data }
  // If clientSecret is empty on update, keep existing encrypted value
  if (!data.clientSecret) {
    data.clientSecret = existing.clientSecret
  } else {
    data.clientSecret = encryptOptional(data.clientSecret)
  }
  const provider = await prisma.oAuthProvider.update({ where: { id: req.params.id }, data })
  const { clientSecret: _cs, ...rest } = provider
  audit(req, 'admin_oauth_provider_updated', 'success', { actor: (req as AuthRequest).userId, target: req.params.id, details: { name: provider.name } })
  res.json(rest)
})

router.delete('/oauth-providers/:id', ...guard, async (req, res) => {
  await prisma.oAuthProvider.delete({ where: { id: req.params.id } })
  audit(req, 'admin_oauth_provider_deleted', 'success', { actor: (req as AuthRequest).userId, target: req.params.id })
  res.status(204).send()
})

// ── Users ─────────────────────────────────────────────────
router.get('/users', ...guard, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true, email: true, name: true, isAdmin: true, oauthProvider: true, createdAt: true,
      babies: { select: { role: true, baby: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: 'asc' },
  })
  res.json(users.map(u => ({
    ...u,
    babies: u.babies.map(b => ({ babyId: b.baby.id, babyName: b.baby.name, role: b.role })),
  })))
})

router.patch('/users/:id', ...guard, async (req, res) => {
  const { isAdmin } = req.body as { isAdmin: boolean }
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { isAdmin }, select: { id: true, email: true, name: true, isAdmin: true } })
  audit(req, 'admin_role_changed', 'success', { actor: (req as AuthRequest).userId, target: req.params.id, details: { isAdmin } })
  res.json(user)
})

router.delete('/users/:id', ...guard, async (req: Request, res) => {
  const me = (req as AuthRequest).userId
  if (req.params.id === me) { res.status(400).json({ error: 'Cannot delete your own account' }); return }
  // Prevent deleting the last admin
  const target = await prisma.user.findUnique({ where: { id: req.params.id } })
  if (target?.isAdmin) {
    const adminCount = await prisma.user.count({ where: { isAdmin: true } })
    if (adminCount <= 1) {
      res.status(400).json({ error: 'Cannot delete the only admin' }); return
    }
  }
  await prisma.user.delete({ where: { id: req.params.id } })
  audit(req, 'admin_user_deleted', 'success', { actor: me, target: req.params.id, details: { email: target?.email } })
  res.status(204).send()
})

// ── Babies (admin view) ───────────────────────────────────
router.get('/babies', ...guard, async (_req, res) => {
  const babies = await prisma.baby.findMany({
    select: { id: true, name: true, dob: true },
    orderBy: { name: 'asc' },
  })
  res.json(babies)
})

router.post('/users/:id/babies', ...guard, async (req, res) => {
  const { babyId, role } = req.body as { babyId: string; role?: string }
  if (!babyId) { res.status(400).json({ error: 'babyId required' }); return }
  const caregiverRole = (role === 'OWNER' ? 'OWNER' : 'CAREGIVER') as 'OWNER' | 'CAREGIVER'
  const existing = await prisma.babyCaregiver.findUnique({ where: { babyId_userId: { babyId, userId: req.params.id } } })
  if (existing) { res.status(409).json({ error: 'User already has access to this baby' }); return }
  const record = await prisma.babyCaregiver.create({
    data: { babyId, userId: req.params.id, role: caregiverRole, acceptedAt: new Date() },
  })
  res.status(201).json(record)
})

router.delete('/users/:id/babies/:babyId', ...guard, async (req, res) => {
  await prisma.babyCaregiver.delete({ where: { babyId_userId: { babyId: req.params.babyId, userId: req.params.id } } })
  res.status(204).send()
})

// ── Dev seed ──────────────────────────────────────────────
router.post('/seed', ...guard, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found' })
    return
  }
  const userId = (req as AuthRequest).userId
  audit(req, 'admin_seed_used', 'success', { actor: userId })

  const now = new Date()
  const dob = new Date(now.getTime() - 90 * 86400000) // ~3 months old

  function daysAgo(n: number, hour = 12, minute = 0) {
    const d = new Date(now)
    d.setDate(d.getDate() - n)
    d.setHours(hour, minute, 0, 0)
    return d
  }

  const baby = await prisma.baby.create({
    data: {
      name: 'Test Baby',
      dob,
      sex: 'F',
      caregivers: { create: { userId, role: 'OWNER', acceptedAt: now } },
    },
  })
  const bid = baby.id

  // Growth – every ~3 weeks from birth
  await prisma.growthRecord.createMany({ data: [
    { babyId: bid, loggedBy: userId, measuredAt: daysAgo(90), weight: 3.4,  length: 50.5, headCirc: 34.2 },
    { babyId: bid, loggedBy: userId, measuredAt: daysAgo(69), weight: 4.6,  length: 54.0, headCirc: 37.1 },
    { babyId: bid, loggedBy: userId, measuredAt: daysAgo(48), weight: 5.5,  length: 57.2, headCirc: 39.0 },
    { babyId: bid, loggedBy: userId, measuredAt: daysAgo(27), weight: 6.1,  length: 59.8, headCirc: 40.3 },
    { babyId: bid, loggedBy: userId, measuredAt: daysAgo(6),  weight: 6.8,  length: 62.0, headCirc: 41.2 },
  ]})

  // Feedings – past 3 days, every 2-3 hours
  const feedingRows = []
  for (let day = 3; day >= 1; day--) {
    const hours = [0, 2, 5, 7, 10, 13, 16, 19, 22]
    for (const hour of hours) {
      const isBreast = hour % 2 === 0
      feedingRows.push({
        babyId: bid, loggedBy: userId,
        type: (isBreast ? 'BREAST' : 'BOTTLE') as 'BREAST' | 'BOTTLE',
        side: isBreast ? (hour % 4 === 0 ? 'left' : 'right') : undefined,
        durationMin: isBreast ? 15 + Math.floor(Math.random() * 10) : undefined,
        amount: isBreast ? undefined : 90 + Math.floor(Math.random() * 30),
        milkType: isBreast ? undefined : 'formula',
        startedAt: daysAgo(day, hour, 0),
        endedAt: daysAgo(day, hour, isBreast ? 18 : 20),
      })
    }
  }
  await prisma.feedingEvent.createMany({ data: feedingRows })

  // Diapers – past 3 days
  const diaperRows = []
  const diaperTypes: Array<'WET' | 'DIRTY' | 'BOTH'> = ['WET', 'WET', 'DIRTY', 'BOTH', 'WET', 'WET', 'WET']
  for (let day = 3; day >= 1; day--) {
    const hours = [1, 4, 7, 10, 13, 16, 20]
    for (let i = 0; i < hours.length; i++) {
      diaperRows.push({
        babyId: bid, loggedBy: userId,
        type: diaperTypes[i],
        color: diaperTypes[i] === 'WET' ? undefined : 'yellow',
        occurredAt: daysAgo(day, hours[i]),
      })
    }
  }
  await prisma.diaperEvent.createMany({ data: diaperRows })

  // Sleep – past 3 days: overnight + 3 naps
  const sleepRows: any[] = []
  for (let day = 3; day >= 1; day--) {
    // Night sleep
    sleepRows.push({ babyId: bid, loggedBy: userId, type: 'NIGHT', location: 'bassinet', startedAt: daysAgo(day + 1, 21), endedAt: daysAgo(day, 5, 30) })
    // Naps
    sleepRows.push({ babyId: bid, loggedBy: userId, type: 'NAP', location: 'crib', startedAt: daysAgo(day, 9, 0), endedAt: daysAgo(day, 10, 20) })
    sleepRows.push({ babyId: bid, loggedBy: userId, type: 'NAP', location: 'crib', startedAt: daysAgo(day, 13, 0), endedAt: daysAgo(day, 14, 45) })
    sleepRows.push({ babyId: bid, loggedBy: userId, type: 'NAP', startedAt: daysAgo(day, 17, 0), endedAt: daysAgo(day, 17, 40) })
  }
  await prisma.sleepEvent.createMany({ data: sleepRows })

  // Medications
  await prisma.medicationEvent.createMany({ data: [
    { babyId: bid, loggedBy: userId, name: 'Acetaminophen (Tylenol)', dose: 2.5, unit: 'mL', occurredAt: daysAgo(62, 15), notes: 'After 2-month vaccines' },
    { babyId: bid, loggedBy: userId, name: 'Acetaminophen (Tylenol)', dose: 2.5, unit: 'mL', occurredAt: daysAgo(62, 21), notes: 'Follow-up dose' },
    { babyId: bid, loggedBy: userId, name: 'Vitamin D drops', dose: 1.0, unit: 'mL', occurredAt: daysAgo(10, 8) },
    { babyId: bid, loggedBy: userId, name: 'Vitamin D drops', dose: 1.0, unit: 'mL', occurredAt: daysAgo(3, 8) },
  ]})

  // Milestones
  await prisma.milestone.createMany({ data: [
    { babyId: bid, loggedBy: userId, title: 'First smile', occurredAt: daysAgo(60), description: 'Smiled at mom during morning feed!' },
    { babyId: bid, loggedBy: userId, title: 'Tracks objects', occurredAt: daysAgo(50), description: 'Following a toy with eyes' },
    { babyId: bid, loggedBy: userId, title: 'First laugh', occurredAt: daysAgo(30), description: 'Laughed when tickled on the tummy' },
    { babyId: bid, loggedBy: userId, title: 'Holds head up', occurredAt: daysAgo(20), description: 'Great head control during tummy time' },
  ]})

  // Appointments
  const appt1 = await prisma.appointment.create({ data: {
    babyId: bid, loggedBy: userId,
    type: 'WELL_VISIT',
    date: daysAgo(89),
    doctor: 'Dr. Sarah Chen',
    notes: 'Newborn visit. Weight and height in normal range. Reviewed feeding schedule.',
  }})
  const appt2 = await prisma.appointment.create({ data: {
    babyId: bid, loggedBy: userId,
    type: 'WELL_VISIT',
    date: daysAgo(62),
    doctor: 'Dr. Sarah Chen',
    notes: '2-month well-child. Vaccines administered. Reviewed sleep schedule.',
  }})
  await prisma.appointment.create({ data: {
    babyId: bid, loggedBy: userId,
    type: 'SICK_VISIT',
    date: daysAgo(15),
    doctor: 'Dr. Marcus Webb',
    notes: 'Mild congestion. No fever. Saline drops recommended.',
  }})

  // Vaccines
  await prisma.vaccineRecord.createMany({ data: [
    { babyId: bid, loggedBy: userId, vaccineName: 'Hepatitis B (HepB)', doseNumber: 1, administeredAt: daysAgo(90), appointmentId: appt1.id, notes: 'Birth dose' },
    { babyId: bid, loggedBy: userId, vaccineName: 'DTaP', doseNumber: 1, lotNumber: 'A4821B', administeredAt: daysAgo(62), appointmentId: appt2.id },
    { babyId: bid, loggedBy: userId, vaccineName: 'IPV', doseNumber: 1, lotNumber: 'C1193D', administeredAt: daysAgo(62), appointmentId: appt2.id },
    { babyId: bid, loggedBy: userId, vaccineName: 'Hib', doseNumber: 1, lotNumber: 'H2240E', administeredAt: daysAgo(62), appointmentId: appt2.id },
    { babyId: bid, loggedBy: userId, vaccineName: 'PCV15 (Pneumococcal)', doseNumber: 1, lotNumber: 'P9934F', administeredAt: daysAgo(62), appointmentId: appt2.id },
    { babyId: bid, loggedBy: userId, vaccineName: 'RV (Rotavirus)', doseNumber: 1, administeredAt: daysAgo(62), appointmentId: appt2.id, notes: 'Oral dose' },
    { babyId: bid, loggedBy: userId, vaccineName: 'Hepatitis B (HepB)', doseNumber: 2, lotNumber: 'B3319C', administeredAt: daysAgo(62), appointmentId: appt2.id },
  ]})

  res.status(201).json({ ok: true, babyId: bid, babyName: baby.name })
})

export default router
