import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireOperatorAuth, requireOperatorRole, OperatorAuthRequest } from '../middleware/operator-auth.js'
import { logOperatorAction } from '../lib/operator-audit.js'

const router = Router()

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(12),
  role: z.enum(['HELPDESK', 'ACCOUNTING', 'GLOBAL_ADMIN']),
})

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['HELPDESK', 'ACCOUNTING', 'GLOBAL_ADMIN']).optional(),
  isActive: z.boolean().optional(),
})

// ── List all operators ─────────────────────────────────────
router.get('/', requireOperatorAuth, requireOperatorRole('GLOBAL_ADMIN'), async (_req, res) => {
  const operators = await prisma.operator.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
  })
  res.json({ operators })
})

// ── Create operator ────────────────────────────────────────
router.post('/', requireOperatorAuth, requireOperatorRole('GLOBAL_ADMIN'), async (req, res) => {
  const result = createSchema.safeParse(req.body)
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return }
  const { email, name, password, role } = result.data

  const existing = await prisma.operator.findUnique({ where: { email } })
  if (existing) { res.status(409).json({ error: 'Email already in use' }); return }

  const passwordHash = await bcrypt.hash(password, 12)
  const operator = await prisma.operator.create({
    data: { email, name, passwordHash, role },
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
  })

  const actorId = (req as OperatorAuthRequest).operatorId
  await logOperatorAction({
    operatorId: actorId,
    action: 'create_operator',
    targetType: 'operator',
    targetId: operator.id,
    newValue: { email: operator.email, name: operator.name, role: operator.role },
    ipAddress: req.ip ?? req.socket?.remoteAddress,
  })

  res.status(201).json({ operator })
})

// ── Update operator ────────────────────────────────────────
router.patch('/:id', requireOperatorAuth, requireOperatorRole('GLOBAL_ADMIN'), async (req, res) => {
  const { id } = req.params
  const result = updateSchema.safeParse(req.body)
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return }

  const existing = await prisma.operator.findUnique({ where: { id } })
  if (!existing) { res.status(404).json({ error: 'Operator not found' }); return }

  const operator = await prisma.operator.update({
    where: { id },
    data: result.data,
    select: { id: true, email: true, name: true, role: true, isActive: true, updatedAt: true },
  })

  const actorId = (req as OperatorAuthRequest).operatorId
  await logOperatorAction({
    operatorId: actorId,
    action: 'update_operator',
    targetType: 'operator',
    targetId: id,
    oldValue: { name: existing.name, role: existing.role, isActive: existing.isActive },
    newValue: result.data,
    ipAddress: req.ip ?? req.socket?.remoteAddress,
  })

  res.json({ operator })
})

// ── Delete operator ────────────────────────────────────────
router.delete('/:id', requireOperatorAuth, requireOperatorRole('GLOBAL_ADMIN'), async (req, res) => {
  const { id } = req.params
  const actorId = (req as OperatorAuthRequest).operatorId

  if (id === actorId) {
    res.status(400).json({ error: 'Cannot delete yourself' })
    return
  }

  const existing = await prisma.operator.findUnique({ where: { id } })
  if (!existing) { res.status(404).json({ error: 'Operator not found' }); return }

  await prisma.operator.delete({ where: { id } })

  await logOperatorAction({
    operatorId: actorId,
    action: 'delete_operator',
    targetType: 'operator',
    targetId: id,
    oldValue: { email: existing.email, name: existing.name, role: existing.role },
    ipAddress: req.ip ?? req.socket?.remoteAddress,
  })

  res.json({ ok: true })
})

export default router
