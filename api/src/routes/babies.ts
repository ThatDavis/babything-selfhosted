import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireBabyAccess, AuthRequest } from '../middleware/auth.js'

const router = Router()

const createSchema = z.object({
  name: z.string().min(1),
  dob: z.string().datetime(),
  sex: z.enum(['male', 'female', 'other']).optional(),
})

const updateSchema = createSchema.partial()

router.get('/', requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId
  const memberships = await prisma.babyCaregiver.findMany({
    where: { userId, acceptedAt: { not: null } },
    include: { baby: true },
    orderBy: { baby: { createdAt: 'asc' } },
  })
  res.json(memberships.map(m => ({ ...m.baby, role: m.role })))
})

router.post('/', requireAuth, async (req, res) => {
  const result = createSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() })
    return
  }
  const userId = (req as AuthRequest).userId

  const baby = await prisma.baby.create({
    data: {
      ...result.data,
      dob: new Date(result.data.dob),
      caregivers: {
        create: { userId, role: 'OWNER', acceptedAt: new Date() },
      },
    },
  })
  res.status(201).json({ ...baby, role: 'OWNER' })
})

router.get('/:id', requireAuth, requireBabyAccess(), async (req, res) => {
  const baby = await prisma.baby.findUnique({
    where: { id: req.params.id },
    include: {
      caregivers: {
        where: { acceptedAt: { not: null } },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  })
  res.json(baby)
})

router.patch('/:id', requireAuth, requireBabyAccess('OWNER'), async (req, res) => {
  const result = updateSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() })
    return
  }
  const data = result.data
  const baby = await prisma.baby.update({
    where: { id: req.params.id },
    data: { ...data, ...(data.dob ? { dob: new Date(data.dob) } : {}) },
  })
  res.json(baby)
})

router.delete('/:id', requireAuth, requireBabyAccess('OWNER'), async (req, res) => {
  await prisma.baby.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

router.delete('/:babyId/caregivers/:userId', requireAuth, requireBabyAccess('OWNER'), async (req, res) => {
  const selfId = (req as AuthRequest).userId
  if (req.params.userId === selfId) {
    res.status(400).json({ error: 'Cannot remove yourself' })
    return
  }
  await prisma.babyCaregiver.delete({
    where: { babyId_userId: { babyId: req.params.babyId, userId: req.params.userId } },
  })
  res.status(204).send()
})

router.get('/:id/dashboard', requireAuth, requireBabyAccess(), async (req, res) => {
  const babyId = req.params.id

  const [lastFeeding, lastDiaper, activeSleep, lastSleep] = await Promise.all([
    prisma.feedingEvent.findFirst({
      where: { babyId },
      orderBy: { startedAt: 'desc' },
      select: { id: true, type: true, side: true, amount: true, milkType: true, startedAt: true, endedAt: true },
    }),
    prisma.diaperEvent.findFirst({
      where: { babyId },
      orderBy: { occurredAt: 'desc' },
      select: { id: true, type: true, color: true, occurredAt: true },
    }),
    prisma.sleepEvent.findFirst({
      where: { babyId, endedAt: null },
      orderBy: { startedAt: 'desc' },
      select: { id: true, type: true, startedAt: true },
    }),
    prisma.sleepEvent.findFirst({
      where: { babyId, endedAt: { not: null } },
      orderBy: { endedAt: 'desc' },
      select: { id: true, type: true, startedAt: true, endedAt: true },
    }),
  ])

  res.json({ lastFeeding, lastDiaper, activeSleep, lastSleep })
})

export default router
