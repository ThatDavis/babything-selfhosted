import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireBabyAccess } from '../middleware/auth.js'
import { generateReport } from '../lib/pdf.js'
import { sendReportEmail } from '../lib/mailer.js'

const router = Router({ mergeParams: true })

const SECTIONS = ['growth', 'vaccines', 'medications', 'appointments', 'feedings', 'sleep'] as const
const DEFAULT_SECTIONS = [...SECTIONS]

const emailSchema = z.object({
  to: z.string().email(),
  since: z.string().datetime().optional(),
  sections: z.array(z.enum(SECTIONS)).default(DEFAULT_SECTIONS),
})

async function buildReportData(babyId: string, since: Date | null, sections: string[]) {
  const baby = await prisma.baby.findUniqueOrThrow({ where: { id: babyId } })

  const sinceFilter = since ? { gte: since } : undefined

  const [growth, vaccines, medications, appointments] = await Promise.all([
    sections.includes('growth')
      ? prisma.growthRecord.findMany({
          where: { babyId, ...(sinceFilter ? { measuredAt: sinceFilter } : {}) },
          orderBy: { measuredAt: 'asc' },
        })
      : [],
    sections.includes('vaccines')
      ? prisma.vaccineRecord.findMany({
          where: { babyId, ...(sinceFilter ? { administeredAt: sinceFilter } : {}) },
          orderBy: { administeredAt: 'asc' },
        })
      : [],
    sections.includes('medications')
      ? prisma.medicationEvent.findMany({
          where: { babyId, ...(sinceFilter ? { occurredAt: sinceFilter } : {}) },
          orderBy: { occurredAt: 'asc' },
        })
      : [],
    sections.includes('appointments')
      ? prisma.appointment.findMany({
          where: {
            babyId,
            ...(since ? { date: { gte: since.toISOString().split('T')[0] } } : {}),
          },
          orderBy: { date: 'asc' },
          include: { vaccines: { select: { vaccineName: true, doseNumber: true } } },
        })
      : [],
  ])

  // Feeding summary – always last 14 days regardless of since filter
  let feedingSummary = null
  if (sections.includes('feedings')) {
    const days = 14
    const cutoff = new Date(Date.now() - days * 86400000)
    const feedings = await prisma.feedingEvent.findMany({
      where: { babyId, startedAt: { gte: cutoff } },
      select: { type: true },
    })
    if (feedings.length > 0) {
      const breast = feedings.filter(f => f.type === 'BREAST').length
      feedingSummary = {
        totalFeeds: feedings.length,
        breastFeeds: breast,
        bottleFeeds: feedings.length - breast,
        avgPerDay: feedings.length / days,
        days,
      }
    }
  }

  // Sleep summary – always last 14 days
  let sleepSummary = null
  if (sections.includes('sleep')) {
    const days = 14
    const cutoff = new Date(Date.now() - days * 86400000)
    const sleepEvents = await prisma.sleepEvent.findMany({
      where: { babyId, startedAt: { gte: cutoff }, endedAt: { not: null } },
      select: { type: true, startedAt: true, endedAt: true },
    })
    if (sleepEvents.length > 0) {
      const totalHours = sleepEvents.reduce((acc, s) => {
        const ms = (s.endedAt!.getTime() - s.startedAt.getTime())
        return acc + ms / 3600000
      }, 0)
      const naps = sleepEvents.filter(s => s.type === 'NAP').length
      sleepSummary = {
        avgHoursPerDay: totalHours / days,
        avgNapsPerDay: naps / days,
        days,
      }
    }
  }

  return {
    baby: { name: baby.name, dob: baby.dob, sex: baby.sex },
    growth,
    vaccines,
    medications,
    appointments,
    feedings: feedingSummary,
    sleep: sleepSummary,
  }
}

async function getUnitSystem(): Promise<'metric' | 'imperial'> {
  const s = await prisma.systemSettings.findFirst()
  return (s?.unitSystem ?? 'metric') as 'metric' | 'imperial'
}

// ── Download PDF ──────────────────────────────────────────────────────────────
router.get('/report', requireAuth, requireBabyAccess(), async (req, res) => {
  const since = req.query.since ? new Date(req.query.since as string) : null
  const sectionsParam = req.query.sections as string | undefined
  const sections = sectionsParam ? sectionsParam.split(',').filter(s => SECTIONS.includes(s as any)) : DEFAULT_SECTIONS

  const [data, unitSystem] = await Promise.all([
    buildReportData(req.params.babyId, since, sections),
    getUnitSystem(),
  ])
  const opts = { sections, since, generatedAt: new Date(), unitSystem }
  const pdf = await generateReport(data, opts)

  const filename = `${data.baby.name.replace(/\s+/g, '_')}_report_${new Date().toISOString().split('T')[0]}.pdf`
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('Content-Length', pdf.length)
  res.send(pdf)
})

// ── Email PDF ─────────────────────────────────────────────────────────────────
router.post('/report/email', requireAuth, requireBabyAccess(), async (req, res) => {
  const result = emailSchema.safeParse(req.body)
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return }

  const { to, since: sinceStr, sections } = result.data
  const since = sinceStr ? new Date(sinceStr) : null

  const [data, unitSystem] = await Promise.all([
    buildReportData(req.params.babyId, since, sections),
    getUnitSystem(),
  ])
  const opts = { sections, since, generatedAt: new Date(), unitSystem }
  const pdf = await generateReport(data, opts)

  const filename = `${data.baby.name.replace(/\s+/g, '_')}_report_${new Date().toISOString().split('T')[0]}.pdf`
  await sendReportEmail(to, data.baby.name, pdf, filename)

  res.json({ ok: true })
})

export default router
