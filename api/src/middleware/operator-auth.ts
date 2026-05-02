import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { OperatorRole } from '@prisma/client'

export interface OperatorAuthRequest extends Request {
  operatorId: string
  operatorRole: OperatorRole
}

function extractToken(req: Request): string | null {
  const cookieToken = (req as any).cookies?.operator_session
  if (cookieToken) return cookieToken

  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) return header.slice(7)

  return null
}

export function requireOperatorAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req)
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string; role: OperatorRole }
    ;(req as OperatorAuthRequest).operatorId = payload.sub
    ;(req as OperatorAuthRequest).operatorRole = payload.role
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

export function requireOperatorRole(...roles: OperatorRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const operatorRole = (req as OperatorAuthRequest).operatorRole
    if (!roles.includes(operatorRole)) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }
    next()
  }
}
