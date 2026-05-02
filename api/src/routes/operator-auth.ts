import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireOperatorAuth, OperatorAuthRequest } from '../middleware/operator-auth.js'
import { logOperatorAction } from '../lib/operator-audit.js'
import { getAccessibleSections } from '../lib/operator-permissions.js'

const router = Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

function signOperatorToken(operatorId: string, role: string) {
  return jwt.sign({ sub: operatorId, role }, process.env.JWT_SECRET!, { expiresIn: '8h' })
}

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 8 * 60 * 60 * 1000, // 8 hours
  domain: process.env.COOKIE_DOMAIN,
}

// ── Operator Login ─────────────────────────────────────────
router.post('/login', async (req, res) => {
  const result = loginSchema.safeParse(req.body)
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return }
  const { email, password } = result.data

  const operator = await prisma.operator.findUnique({ where: { email } })
  if (!operator?.isActive || !operator.passwordHash || !(await bcrypt.compare(password, operator.passwordHash))) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  await prisma.operator.update({
    where: { id: operator.id },
    data: { lastLoginAt: new Date() },
  })

  const token = signOperatorToken(operator.id, operator.role)
  res.cookie('operator_session', token, COOKIE_OPTS)

  await logOperatorAction({
    operatorId: operator.id,
    action: 'login',
    ipAddress: req.ip ?? req.socket?.remoteAddress,
  })

  res.json({
    operator: {
      id: operator.id,
      email: operator.email,
      name: operator.name,
      role: operator.role,
    },
  })
})

// ── Operator Logout ────────────────────────────────────────
router.post('/logout', requireOperatorAuth, async (req, res) => {
  const operatorId = (req as OperatorAuthRequest).operatorId
  res.clearCookie('operator_session', { ...COOKIE_OPTS, maxAge: 0 })

  await logOperatorAction({
    operatorId,
    action: 'logout',
    ipAddress: req.ip ?? req.socket?.remoteAddress,
  })

  res.json({ ok: true })
})

// ── Get permissions for current operator ───────────────────
router.get('/permissions', requireOperatorAuth, async (req, res) => {
  const role = (req as OperatorAuthRequest).operatorRole
  res.json({ sections: getAccessibleSections(role) })
})

// ── Get Current Operator ───────────────────────────────────
router.get('/me', requireOperatorAuth, async (req, res) => {
  const operatorId = (req as OperatorAuthRequest).operatorId
  const operator = await prisma.operator.findUnique({
    where: { id: operatorId },
    select: { id: true, email: true, name: true, role: true, lastLoginAt: true, createdAt: true },
  })
  if (!operator) { res.status(404).json({ error: 'Operator not found' }); return }
  res.json({ operator })
})

export default router
