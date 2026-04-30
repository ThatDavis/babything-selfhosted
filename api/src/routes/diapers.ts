import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireBabyAccess, AuthRequest } from '../middleware/auth.js'
import { emitBabyEvent } from '../lib/socket.js'
import { getTenantId } from '../lib/tenant-context.js'

const router = Router({ mergeParams: true })

const schema = z.object({
  type: z.enum(['WET', 'DIRTY', 'BOTH', 'DRY']),
  color: z.enum(['yellow', 'green', 'brown', 'black', 'other']).optional(),
  occurredAt: z.string().datetime(),
  notes: z.string().optional(),
})

router.get('/', requireAuth, requireBabyAccess(), async (req, res) => {
  const { babyId } = req.params
  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const cursor = req.query.cursor as string | undefined

  const diapers = await prisma.diaperEvent.findMany({
    where: { babyId },
    orderBy: { occurredAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { user: { select: { id: true, name: true } } },
  })

  const hasMore = diapers.length > limit
  res.json({ items: diapers.slice(0, limit), hasMore, nextCursor: hasMore ? diapers[limit - 1].id : null })
})

router.post('/', requireAuth, requireBabyAccess(), async (req, res) => {
  const result = schema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() })
    return
  }
  const { babyId } = req.params
  const loggedBy = (req as AuthRequest).userId

  const diaper = await prisma.diaperEvent.create({
    data: { ...result.data, occurredAt: new Date(result.data.occurredAt), babyId, loggedBy, tenantId: getTenantId()! },
    include: { user: { select: { id: true, name: true } } },
  })
  emitBabyEvent(babyId, 'diaper:created', diaper)
  res.status(201).json(diaper)
})

router.patch('/:eventId', requireAuth, requireBabyAccess(), async (req, res) => {
  const result = schema.partial().safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() })
    return
  }
  const { babyId, eventId } = req.params
  const userId = (req as AuthRequest).userId

  const existing = await prisma.diaperEvent.findFirst({ where: { id: eventId, babyId } })
  if (!existing) { res.status(404).json({ error: 'Not found' }); return }

  const membership = await prisma.babyCaregiver.findUnique({
    where: { babyId_userId: { babyId, userId } },
  })
  if (existing.loggedBy !== userId && membership?.role !== 'OWNER') {
    res.status(403).json({ error: 'Forbidden' }); return
  }

  const data = result.data
  const diaper = await prisma.diaperEvent.update({
    where: { id: eventId },
    data: { ...data, ...(data.occurredAt ? { occurredAt: new Date(data.occurredAt) } : {}) },
    include: { user: { select: { id: true, name: true } } },
  })
  emitBabyEvent(babyId, 'diaper:updated', diaper)
  res.json(diaper)
})

router.delete('/:eventId', requireAuth, requireBabyAccess(), async (req, res) => {
  const { babyId, eventId } = req.params
  const userId = (req as AuthRequest).userId

  const existing = await prisma.diaperEvent.findFirst({ where: { id: eventId, babyId } })
  if (!existing) { res.status(404).json({ error: 'Not found' }); return }

  const membership = await prisma.babyCaregiver.findUnique({
    where: { babyId_userId: { babyId, userId } },
  })
  if (existing.loggedBy !== userId && membership?.role !== 'OWNER') {
    res.status(403).json({ error: 'Forbidden' }); return
  }

  await prisma.diaperEvent.delete({ where: { id: eventId } })
  emitBabyEvent(babyId, 'diaper:deleted', { id: eventId })
  res.status(204).send()
})

export default router
