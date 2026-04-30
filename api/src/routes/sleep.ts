import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireBabyAccess, AuthRequest } from '../middleware/auth.js'
import { emitBabyEvent } from '../lib/socket.js'
import { getTenantId } from '../lib/tenant-context.js'

const router = Router({ mergeParams: true })

const schema = z.object({
  type: z.enum(['NAP', 'NIGHT']),
  location: z.enum(['crib', 'bassinet', 'arms', 'stroller', 'other']).optional(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional().nullable(),
  notes: z.string().optional(),
})

router.get('/', requireAuth, requireBabyAccess(), async (req, res) => {
  const { babyId } = req.params
  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const cursor = req.query.cursor as string | undefined

  const events = await prisma.sleepEvent.findMany({
    where: { babyId },
    orderBy: { startedAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { user: { select: { id: true, name: true } } },
  })

  const hasMore = events.length > limit
  res.json({ items: events.slice(0, limit), hasMore, nextCursor: hasMore ? events[limit - 1].id : null })
})

router.post('/', requireAuth, requireBabyAccess(), async (req, res) => {
  const result = schema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() })
    return
  }
  const { babyId } = req.params
  const loggedBy = (req as AuthRequest).userId

  const event = await prisma.sleepEvent.create({
    data: {
      ...result.data,
      startedAt: new Date(result.data.startedAt),
      endedAt: result.data.endedAt ? new Date(result.data.endedAt) : undefined,
      babyId,
      loggedBy,
      tenantId: getTenantId()!,
    },
    include: { user: { select: { id: true, name: true } } },
  })
  emitBabyEvent(babyId, 'sleep:created', event)
  res.status(201).json(event)
})

router.patch('/:eventId', requireAuth, requireBabyAccess(), async (req, res) => {
  const result = schema.partial().safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() })
    return
  }
  const { babyId, eventId } = req.params
  const userId = (req as AuthRequest).userId

  const existing = await prisma.sleepEvent.findFirst({ where: { id: eventId, babyId } })
  if (!existing) { res.status(404).json({ error: 'Not found' }); return }

  const membership = await prisma.babyCaregiver.findUnique({
    where: { babyId_userId: { babyId, userId } },
  })
  if (existing.loggedBy !== userId && membership?.role !== 'OWNER') {
    res.status(403).json({ error: 'Forbidden' }); return
  }

  const data = result.data
  const event = await prisma.sleepEvent.update({
    where: { id: eventId },
    data: {
      ...data,
      ...(data.startedAt ? { startedAt: new Date(data.startedAt) } : {}),
      ...(data.endedAt !== undefined ? { endedAt: data.endedAt ? new Date(data.endedAt) : null } : {}),
    },
    include: { user: { select: { id: true, name: true } } },
  })
  emitBabyEvent(babyId, 'sleep:updated', event)
  res.json(event)
})

router.delete('/:eventId', requireAuth, requireBabyAccess(), async (req, res) => {
  const { babyId, eventId } = req.params
  const userId = (req as AuthRequest).userId

  const existing = await prisma.sleepEvent.findFirst({ where: { id: eventId, babyId } })
  if (!existing) { res.status(404).json({ error: 'Not found' }); return }

  const membership = await prisma.babyCaregiver.findUnique({
    where: { babyId_userId: { babyId, userId } },
  })
  if (existing.loggedBy !== userId && membership?.role !== 'OWNER') {
    res.status(403).json({ error: 'Forbidden' }); return
  }

  await prisma.sleepEvent.delete({ where: { id: eventId } })
  emitBabyEvent(babyId, 'sleep:deleted', { id: eventId })
  res.status(204).send()
})

export default router
