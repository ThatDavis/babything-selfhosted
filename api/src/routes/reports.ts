import { Router } from 'express'
import { z } from 'zod'
import archiver from 'archiver'
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

// ── CSV Export ────────────────────────────────────────────────────────────────

function escapeCsv(value: unknown): string {
  const str = String(value ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsv(rows: Record<string, unknown>[], headers: { key: string; label: string }[]): string {
  const lines = [headers.map(h => escapeCsv(h.label)).join(',')]
  for (const row of rows) {
    lines.push(headers.map(h => escapeCsv(row[h.key])).join(','))
  }
  return lines.join('\n')
}

function parseDateRange(fromStr: string | undefined, toStr: string | undefined) {
  const from = fromStr ? new Date(fromStr + 'T00:00:00.000Z') : undefined
  const to = toStr ? new Date(toStr + 'T23:59:59.999Z') : undefined
  return { from, to }
}

function dateFilter(from?: Date, to?: Date) {
  const filter: any = {}
  if (from) filter.gte = from
  if (to) filter.lte = to
  return Object.keys(filter).length ? filter : undefined
}

router.get('/export', requireAuth, requireBabyAccess(), async (req, res) => {
  const babyId = req.params.babyId
  const { from, to } = parseDateRange(req.query.from as string | undefined, req.query.to as string | undefined)
  const df = dateFilter(from, to)

  const baby = await prisma.baby.findUniqueOrThrow({ where: { id: babyId } })

  const [
    feedings,
    diapers,
    sleep,
    growth,
    medications,
    milestones,
    appointments,
    vaccines,
  ] = await Promise.all([
    prisma.feedingEvent.findMany({
      where: { babyId, ...(df ? { startedAt: df } : {}) },
      orderBy: { startedAt: 'asc' },
      include: { user: { select: { name: true } } },
    }),
    prisma.diaperEvent.findMany({
      where: { babyId, ...(df ? { occurredAt: df } : {}) },
      orderBy: { occurredAt: 'asc' },
      include: { user: { select: { name: true } } },
    }),
    prisma.sleepEvent.findMany({
      where: { babyId, ...(df ? { startedAt: df } : {}) },
      orderBy: { startedAt: 'asc' },
      include: { user: { select: { name: true } } },
    }),
    prisma.growthRecord.findMany({
      where: { babyId, ...(df ? { measuredAt: df } : {}) },
      orderBy: { measuredAt: 'asc' },
      include: { user: { select: { name: true } } },
    }),
    prisma.medicationEvent.findMany({
      where: { babyId, ...(df ? { occurredAt: df } : {}) },
      orderBy: { occurredAt: 'asc' },
      include: { user: { select: { name: true } } },
    }),
    prisma.milestone.findMany({
      where: { babyId, ...(df ? { occurredAt: df } : {}) },
      orderBy: { occurredAt: 'asc' },
      include: { user: { select: { name: true } } },
    }),
    prisma.appointment.findMany({
      where: { babyId, ...(df ? { date: df } : {}) },
      orderBy: { date: 'asc' },
      include: { user: { select: { name: true } }, vaccines: { select: { vaccineName: true, doseNumber: true } } },
    }),
    prisma.vaccineRecord.findMany({
      where: { babyId, ...(df ? { administeredAt: df } : {}) },
      orderBy: { administeredAt: 'asc' },
      include: { user: { select: { name: true } }, appointment: { select: { date: true, doctor: true } } },
    }),
  ])

  const files: { name: string; content: string }[] = []

  if (feedings.length) {
    files.push({
      name: 'feedings.csv',
      content: toCsv(
        feedings.map(f => ({
          id: f.id,
          type: f.type,
          side: f.side ?? '',
          durationMin: f.durationMin ?? '',
          amount: f.amount ?? '',
          milkType: f.milkType ?? '',
          startedAt: f.startedAt.toISOString(),
          endedAt: f.endedAt?.toISOString() ?? '',
          notes: f.notes ?? '',
          loggedBy: f.user.name,
        })),
        [
          { key: 'id', label: 'ID' },
          { key: 'type', label: 'Type' },
          { key: 'side', label: 'Side' },
          { key: 'durationMin', label: 'Duration (min)' },
          { key: 'amount', label: 'Amount' },
          { key: 'milkType', label: 'Milk Type' },
          { key: 'startedAt', label: 'Started At' },
          { key: 'endedAt', label: 'Ended At' },
          { key: 'notes', label: 'Notes' },
          { key: 'loggedBy', label: 'Logged By' },
        ]
      ),
    })
  }

  if (diapers.length) {
    files.push({
      name: 'diapers.csv',
      content: toCsv(
        diapers.map(d => ({
          id: d.id,
          type: d.type,
          color: d.color ?? '',
          occurredAt: d.occurredAt.toISOString(),
          notes: d.notes ?? '',
          loggedBy: d.user.name,
        })),
        [
          { key: 'id', label: 'ID' },
          { key: 'type', label: 'Type' },
          { key: 'color', label: 'Color' },
          { key: 'occurredAt', label: 'Occurred At' },
          { key: 'notes', label: 'Notes' },
          { key: 'loggedBy', label: 'Logged By' },
        ]
      ),
    })
  }

  if (sleep.length) {
    files.push({
      name: 'sleep.csv',
      content: toCsv(
        sleep.map(s => ({
          id: s.id,
          type: s.type,
          location: s.location ?? '',
          startedAt: s.startedAt.toISOString(),
          endedAt: s.endedAt?.toISOString() ?? '',
          notes: s.notes ?? '',
          loggedBy: s.user.name,
        })),
        [
          { key: 'id', label: 'ID' },
          { key: 'type', label: 'Type' },
          { key: 'location', label: 'Location' },
          { key: 'startedAt', label: 'Started At' },
          { key: 'endedAt', label: 'Ended At' },
          { key: 'notes', label: 'Notes' },
          { key: 'loggedBy', label: 'Logged By' },
        ]
      ),
    })
  }

  if (growth.length) {
    files.push({
      name: 'growth.csv',
      content: toCsv(
        growth.map(g => ({
          id: g.id,
          weight: g.weight ?? '',
          length: g.length ?? '',
          headCirc: g.headCirc ?? '',
          measuredAt: g.measuredAt.toISOString(),
          notes: g.notes ?? '',
          loggedBy: g.user.name,
        })),
        [
          { key: 'id', label: 'ID' },
          { key: 'weight', label: 'Weight' },
          { key: 'length', label: 'Length' },
          { key: 'headCirc', label: 'Head Circumference' },
          { key: 'measuredAt', label: 'Measured At' },
          { key: 'notes', label: 'Notes' },
          { key: 'loggedBy', label: 'Logged By' },
        ]
      ),
    })
  }

  if (medications.length) {
    files.push({
      name: 'medications.csv',
      content: toCsv(
        medications.map(m => ({
          id: m.id,
          name: m.name,
          dose: m.dose,
          unit: m.unit,
          occurredAt: m.occurredAt.toISOString(),
          notes: m.notes ?? '',
          loggedBy: m.user.name,
        })),
        [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Name' },
          { key: 'dose', label: 'Dose' },
          { key: 'unit', label: 'Unit' },
          { key: 'occurredAt', label: 'Occurred At' },
          { key: 'notes', label: 'Notes' },
          { key: 'loggedBy', label: 'Logged By' },
        ]
      ),
    })
  }

  if (milestones.length) {
    files.push({
      name: 'milestones.csv',
      content: toCsv(
        milestones.map(m => ({
          id: m.id,
          title: m.title,
          description: m.description ?? '',
          occurredAt: m.occurredAt.toISOString(),
          loggedBy: m.user.name,
        })),
        [
          { key: 'id', label: 'ID' },
          { key: 'title', label: 'Title' },
          { key: 'description', label: 'Description' },
          { key: 'occurredAt', label: 'Occurred At' },
          { key: 'loggedBy', label: 'Logged By' },
        ]
      ),
    })
  }

  if (appointments.length) {
    files.push({
      name: 'appointments.csv',
      content: toCsv(
        appointments.map(a => ({
          id: a.id,
          date: a.date.toISOString(),
          doctor: a.doctor ?? '',
          type: a.type,
          notes: a.notes ?? '',
          vaccines: a.vaccines.map(v => `${v.vaccineName}${v.doseNumber ? ` #${v.doseNumber}` : ''}`).join('; '),
          loggedBy: a.user.name,
        })),
        [
          { key: 'id', label: 'ID' },
          { key: 'date', label: 'Date' },
          { key: 'doctor', label: 'Doctor' },
          { key: 'type', label: 'Type' },
          { key: 'notes', label: 'Notes' },
          { key: 'vaccines', label: 'Vaccines Given' },
          { key: 'loggedBy', label: 'Logged By' },
        ]
      ),
    })
  }

  if (vaccines.length) {
    files.push({
      name: 'vaccines.csv',
      content: toCsv(
        vaccines.map(v => ({
          id: v.id,
          vaccineName: v.vaccineName,
          doseNumber: v.doseNumber ?? '',
          lotNumber: v.lotNumber ?? '',
          administeredAt: v.administeredAt.toISOString(),
          appointmentDate: v.appointment?.date?.toISOString() ?? '',
          appointmentDoctor: v.appointment?.doctor ?? '',
          notes: v.notes ?? '',
          loggedBy: v.user.name,
        })),
        [
          { key: 'id', label: 'ID' },
          { key: 'vaccineName', label: 'Vaccine' },
          { key: 'doseNumber', label: 'Dose #' },
          { key: 'lotNumber', label: 'Lot Number' },
          { key: 'administeredAt', label: 'Administered At' },
          { key: 'appointmentDate', label: 'Appointment Date' },
          { key: 'appointmentDoctor', label: 'Appointment Doctor' },
          { key: 'notes', label: 'Notes' },
          { key: 'loggedBy', label: 'Logged By' },
        ]
      ),
    })
  }

  // If no data at all, include a README explaining the empty export
  if (files.length === 0) {
    files.push({
      name: 'README.txt',
      content: `No records found for ${baby.name} in the selected date range.\n\nDate range: ${from?.toISOString().split('T')[0] ?? 'all time'} to ${to?.toISOString().split('T')[0] ?? 'all time'}`,
    })
  }

  const archive = archiver('zip', { zlib: { level: 9 } })
  const filename = `${baby.name.replace(/\s+/g, '_')}_export_${new Date().toISOString().split('T')[0]}.zip`

  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  archive.pipe(res)

  for (const file of files) {
    archive.append(file.content, { name: file.name })
  }

  await archive.finalize()
})

export default router
