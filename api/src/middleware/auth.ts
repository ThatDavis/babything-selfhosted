import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  userId: string
}

function extractToken(req: Request): string | null {
  // Prefer HttpOnly cookie; fall back to Authorization header for API flexibility
  const cookieToken = (req as any).cookies?.session
  if (cookieToken) return cookieToken

  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) return header.slice(7)

  return null
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req)
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string }
    ;(req as AuthRequest).userId = payload.sub
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

export function requireBabyAccess(role?: 'OWNER') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { prisma } = await import('../lib/prisma.js')
    const userId = (req as AuthRequest).userId
    const babyId = req.params.babyId ?? req.params.id

    const membership = await prisma.babyCaregiver.findUnique({
      where: { babyId_userId: { babyId, userId } },
    })

    if (!membership || !membership.acceptedAt) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    if (role === 'OWNER' && membership.role !== 'OWNER') {
      res.status(403).json({ error: 'Owner only' })
      return
    }
    next()
  }
}
