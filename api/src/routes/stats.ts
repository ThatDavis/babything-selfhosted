import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireBabyAccess } from '../middleware/auth.js'

const router = Router({ mergeParams: true })

router.get('/', requireAuth, requireBabyAccess(), async (req, res) => {
  const babyId = req.params.babyId
  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const last7d  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000)

  const [feedings24h, diapers7d, sleep7d, growthAll] = await Promise.all([
    prisma.feedingEvent.findMany({
      where: { babyId, startedAt: { gte: last24h } },
      select: { startedAt: true, type: true },
      orderBy: { startedAt: 'asc' },
    }),
    prisma.diaperEvent.findMany({
      where: { babyId, occurredAt: { gte: last7d } },
      select: { occurredAt: true, type: true },
      orderBy: { occurredAt: 'asc' },
    }),
    prisma.sleepEvent.findMany({
      where: { babyId, startedAt: { gte: last7d } },
      select: { startedAt: true, endedAt: true, type: true },
      orderBy: { startedAt: 'asc' },
    }),
    prisma.growthRecord.findMany({
      where: { babyId },
      select: { measuredAt: true, weight: true, length: true, headCirc: true },
      orderBy: { measuredAt: 'asc' },
    }),
  ])

  res.json({ feedings24h, diapers7d, sleep7d, growthAll })
})

export default router
