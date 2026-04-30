import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireBabyAccess } from '../middleware/auth.js'

const router = Router({ mergeParams: true })

router.get('/', requireAuth, requireBabyAccess(), async (req, res) => {
  const { babyId } = req.params
  const limit = Math.min(Number(req.query.limit) || 30, 100)
  const before = req.query.before ? new Date(req.query.before as string) : new Date()

  const userSelect = { id: true, name: true }

  const [feedings, diapers, sleepEvents] = await Promise.all([
    prisma.feedingEvent.findMany({
      where: { babyId, startedAt: { lt: before } },
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: { user: { select: userSelect } },
    }),
    prisma.diaperEvent.findMany({
      where: { babyId, occurredAt: { lt: before } },
      orderBy: { occurredAt: 'desc' },
      take: limit,
      include: { user: { select: userSelect } },
    }),
    prisma.sleepEvent.findMany({
      where: { babyId, startedAt: { lt: before } },
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: { user: { select: userSelect } },
    }),
  ])

  const unified = [
    ...feedings.map(e => ({ ...e, eventType: 'feeding' as const, occurredAt: e.startedAt })),
    ...diapers.map(e => ({ ...e, eventType: 'diaper' as const })),
    ...sleepEvents.map(e => ({ ...e, eventType: 'sleep' as const, occurredAt: e.startedAt })),
  ]
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, limit)

  res.json(unified)
})

export default router
