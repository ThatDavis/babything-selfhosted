import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireBabyAccess, AuthRequest } from '../middleware/auth.js'
import { emitBabyEvent } from '../lib/socket.js'

const router = Router({ mergeParams: true })

const schema = z.object({
  type: z.enum(['BREAST', 'BOTTLE']),
  side: z.enum(['left', 'right', 'both']).optional(),
  durationMin: z.number().int().positive().optional(),
  amount: z.number().positive().optional(),
  milkType: z.enum(['breastmilk', 'formula', 'other']).optional(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  notes: z.string().optional(),
})

router.get('/', requireAuth, requireBabyAccess(), async (req, res) => {
  const { babyId } = req.params
  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const cursor = req.query.cursor as string | undefined

  const feedings = await prisma.feedingEvent.findMany({
    where: { babyId },
    orderBy: { startedAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { user: { select: { id: true, name: true } } },
  })

  const hasMore = feedings.length > limit
  res.json({ items: feedings.slice(0, limit), hasMore, nextCursor: hasMore ? feedings[limit - 1].id : null })
})

router.post('/', requireAuth, requireBabyAccess(), async (req, res) => {
  const result = schema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() })
    return
  }
  const { babyId } = req.params
  const loggedBy = (req as AuthRequest).userId

  const feeding = await prisma.feedingEvent.create({
    data: {
      ...result.data,
      startedAt: new Date(result.data.startedAt),
      endedAt: result.data.endedAt ? new Date(result.data.endedAt) : undefined,
      babyId,
      loggedBy,
    },
    include: { user: { select: { id: true, name: true } } },
  })
  emitBabyEvent(babyId, 'feeding:created', feeding)
  res.status(201).json(feeding)
})

router.patch('/:eventId', requireAuth, requireBabyAccess(), async (req, res) => {
  const result = schema.partial().safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() })
    return
  }
  const { babyId, eventId } = req.params
  const userId = (req as AuthRequest).userId

  const existing = await prisma.feedingEvent.findFirst({ where: { id: eventId, babyId } })
  if (!existing) { res.status(404).json({ error: 'Not found' }); return }

  const membership = await prisma.babyCaregiver.findUnique({
    where: { babyId_userId: { babyId, userId } },
  })
  if (existing.loggedBy !== userId && membership?.role !== 'OWNER') {
    res.status(403).json({ error: 'Forbidden' }); return
  }

  const data = result.data
  const feeding = await prisma.feedingEvent.update({
    where: { id: eventId },
    data: {
      ...data,
      ...(data.startedAt ? { startedAt: new Date(data.startedAt) } : {}),
      ...(data.endedAt ? { endedAt: new Date(data.endedAt) } : {}),
    },
    include: { user: { select: { id: true, name: true } } },
  })
  emitBabyEvent(babyId, 'feeding:updated', feeding)
  res.json(feeding)
})

router.delete('/:eventId', requireAuth, requireBabyAccess(), async (req, res) => {
  const { babyId, eventId } = req.params
  const userId = (req as AuthRequest).userId

  const existing = await prisma.feedingEvent.findFirst({ where: { id: eventId, babyId } })
  if (!existing) { res.status(404).json({ error: 'Not found' }); return }

  const membership = await prisma.babyCaregiver.findUnique({
    where: { babyId_userId: { babyId, userId } },
  })
  if (existing.loggedBy !== userId && membership?.role !== 'OWNER') {
    res.status(403).json({ error: 'Forbidden' }); return
  }

  await prisma.feedingEvent.delete({ where: { id: eventId } })
  emitBabyEvent(babyId, 'feeding:deleted', { id: eventId })
  res.status(204).send()
})

export default router
