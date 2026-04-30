import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireBabyAccess, AuthRequest } from '../middleware/auth.js'
import { getTenantId } from '../lib/tenant-context.js'

const router = Router({ mergeParams: true })

const schema = z.object({
  name:       z.string().min(1),
  dose:       z.number().positive(),
  unit:       z.enum(['ml', 'mg', 'drops', 'other']),
  occurredAt: z.string().datetime(),
  notes:      z.string().optional(),
})

router.get('/', requireAuth, requireBabyAccess(), async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 30, 100)
  const records = await prisma.medicationEvent.findMany({
    where: { babyId: req.params.babyId },
    orderBy: { occurredAt: 'desc' },
    take: limit,
    include: { user: { select: { id: true, name: true } } },
  })
  res.json(records)
})

router.post('/', requireAuth, requireBabyAccess(), async (req, res) => {
  const result = schema.safeParse(req.body)
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return }
  const record = await prisma.medicationEvent.create({
    data: { ...result.data, occurredAt: new Date(result.data.occurredAt), babyId: req.params.babyId, loggedBy: (req as AuthRequest).userId, tenantId: getTenantId()! },
    include: { user: { select: { id: true, name: true } } },
  })
  res.status(201).json(record)
})

router.patch('/:recordId', requireAuth, requireBabyAccess(), async (req, res) => {
  const result = schema.partial().safeParse(req.body)
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return }
  const existing = await prisma.medicationEvent.findFirst({ where: { id: req.params.recordId, babyId: req.params.babyId } })
  if (!existing) { res.status(404).json({ error: 'Not found' }); return }
  const data = result.data
  const record = await prisma.medicationEvent.update({
    where: { id: req.params.recordId },
    data: { ...data, ...(data.occurredAt ? { occurredAt: new Date(data.occurredAt) } : {}) },
    include: { user: { select: { id: true, name: true } } },
  })
  res.json(record)
})

router.delete('/:recordId', requireAuth, requireBabyAccess(), async (req, res) => {
  const existing = await prisma.medicationEvent.findFirst({ where: { id: req.params.recordId, babyId: req.params.babyId } })
  if (!existing) { res.status(404).json({ error: 'Not found' }); return }
  await prisma.medicationEvent.delete({ where: { id: req.params.recordId } })
  res.status(204).send()
})

export default router
