import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireBabyAccess, AuthRequest } from '../middleware/auth.js'

const router = Router({ mergeParams: true })

const schema = z.object({
  vaccineName:    z.string().min(1),
  doseNumber:     z.number().int().positive().optional(),
  lotNumber:      z.string().optional(),
  administeredAt: z.string().datetime(),
  appointmentId:  z.string().optional(),
  notes:          z.string().optional(),
})

router.get('/', requireAuth, requireBabyAccess(), async (req, res) => {
  const records = await prisma.vaccineRecord.findMany({
    where: { babyId: req.params.babyId },
    orderBy: { administeredAt: 'desc' },
    include: {
      user: { select: { id: true, name: true } },
      appointment: { select: { id: true, date: true, doctor: true } },
    },
  })
  res.json(records)
})

router.post('/', requireAuth, requireBabyAccess(), async (req, res) => {
  const result = schema.safeParse(req.body)
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return }
  const record = await prisma.vaccineRecord.create({
    data: { ...result.data, administeredAt: new Date(result.data.administeredAt), babyId: req.params.babyId, loggedBy: (req as AuthRequest).userId },
    include: {
      user: { select: { id: true, name: true } },
      appointment: { select: { id: true, date: true, doctor: true } },
    },
  })
  res.status(201).json(record)
})

router.patch('/:recordId', requireAuth, requireBabyAccess(), async (req, res) => {
  const result = schema.partial().safeParse(req.body)
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return }
  const existing = await prisma.vaccineRecord.findFirst({ where: { id: req.params.recordId, babyId: req.params.babyId } })
  if (!existing) { res.status(404).json({ error: 'Not found' }); return }
  const data = result.data
  const record = await prisma.vaccineRecord.update({
    where: { id: req.params.recordId },
    data: { ...data, ...(data.administeredAt ? { administeredAt: new Date(data.administeredAt) } : {}) },
    include: {
      user: { select: { id: true, name: true } },
      appointment: { select: { id: true, date: true, doctor: true } },
    },
  })
  res.json(record)
})

router.delete('/:recordId', requireAuth, requireBabyAccess(), async (req, res) => {
  const existing = await prisma.vaccineRecord.findFirst({ where: { id: req.params.recordId, babyId: req.params.babyId } })
  if (!existing) { res.status(404).json({ error: 'Not found' }); return }
  await prisma.vaccineRecord.delete({ where: { id: req.params.recordId } })
  res.status(204).send()
})

export default router
