import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireBabyAccess, AuthRequest } from '../middleware/auth.js'
import { getTenantId } from '../lib/tenant-context.js'

const router = Router({ mergeParams: true })

const schema = z.object({
  date:   z.string().datetime(),
  doctor: z.string().optional(),
  type:   z.enum(['WELL_VISIT', 'SICK_VISIT', 'SPECIALIST', 'OTHER']).default('WELL_VISIT'),
  notes:  z.string().optional(),
})

router.get('/', requireAuth, requireBabyAccess(), async (req, res) => {
  const records = await prisma.appointment.findMany({
    where: { babyId: req.params.babyId },
    orderBy: { date: 'desc' },
    include: {
      user: { select: { id: true, name: true } },
      vaccines: { select: { id: true, vaccineName: true, doseNumber: true } },
    },
  })
  res.json(records)
})

router.post('/', requireAuth, requireBabyAccess(), async (req, res) => {
  const result = schema.safeParse(req.body)
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return }
  const record = await prisma.appointment.create({
    data: { ...result.data, date: new Date(result.data.date), babyId: req.params.babyId, loggedBy: (req as AuthRequest).userId, tenantId: getTenantId()! },
    include: {
      user: { select: { id: true, name: true } },
      vaccines: { select: { id: true, vaccineName: true, doseNumber: true } },
    },
  })
  res.status(201).json(record)
})

router.patch('/:recordId', requireAuth, requireBabyAccess(), async (req, res) => {
  const result = schema.partial().safeParse(req.body)
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return }
  const existing = await prisma.appointment.findFirst({ where: { id: req.params.recordId, babyId: req.params.babyId } })
  if (!existing) { res.status(404).json({ error: 'Not found' }); return }
  const data = result.data
  const record = await prisma.appointment.update({
    where: { id: req.params.recordId },
    data: { ...data, ...(data.date ? { date: new Date(data.date) } : {}) },
    include: {
      user: { select: { id: true, name: true } },
      vaccines: { select: { id: true, vaccineName: true, doseNumber: true } },
    },
  })
  res.json(record)
})

router.delete('/:recordId', requireAuth, requireBabyAccess(), async (req, res) => {
  const existing = await prisma.appointment.findFirst({ where: { id: req.params.recordId, babyId: req.params.babyId } })
  if (!existing) { res.status(404).json({ error: 'Not found' }); return }
  await prisma.appointment.delete({ where: { id: req.params.recordId } })
  res.status(204).send()
})

export default router
