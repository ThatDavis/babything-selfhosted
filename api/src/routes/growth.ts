import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireBabyAccess, AuthRequest } from '../middleware/auth.js'

const router = Router({ mergeParams: true })

const schema = z.object({
  weight:     z.number().positive().optional(),
  length:     z.number().positive().optional(),
  headCirc:   z.number().positive().optional(),
  measuredAt: z.string().datetime(),
  notes:      z.string().optional(),
})

router.get('/', requireAuth, requireBabyAccess(), async (req, res) => {
  const records = await prisma.growthRecord.findMany({
    where: { babyId: req.params.babyId },
    orderBy: { measuredAt: 'desc' },
    include: { user: { select: { id: true, name: true } } },
  })
  res.json(records)
})

router.post('/', requireAuth, requireBabyAccess(), async (req, res) => {
  const result = schema.safeParse(req.body)
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return }
  const record = await prisma.growthRecord.create({
    data: { ...result.data, measuredAt: new Date(result.data.measuredAt), babyId: req.params.babyId, loggedBy: (req as AuthRequest).userId },
    include: { user: { select: { id: true, name: true } } },
  })
  res.status(201).json(record)
})

router.patch('/:recordId', requireAuth, requireBabyAccess(), async (req, res) => {
  const result = schema.partial().safeParse(req.body)
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return }
  const existing = await prisma.growthRecord.findFirst({ where: { id: req.params.recordId, babyId: req.params.babyId } })
  if (!existing) { res.status(404).json({ error: 'Not found' }); return }
  const data = result.data
  const record = await prisma.growthRecord.update({
    where: { id: req.params.recordId },
    data: { ...data, ...(data.measuredAt ? { measuredAt: new Date(data.measuredAt) } : {}) },
    include: { user: { select: { id: true, name: true } } },
  })
  res.json(record)
})

router.delete('/:recordId', requireAuth, requireBabyAccess(), async (req, res) => {
  const existing = await prisma.growthRecord.findFirst({ where: { id: req.params.recordId, babyId: req.params.babyId } })
  if (!existing) { res.status(404).json({ error: 'Not found' }); return }
  await prisma.growthRecord.delete({ where: { id: req.params.recordId } })
  res.status(204).send()
})

export default router
