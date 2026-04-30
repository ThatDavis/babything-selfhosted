import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from './auth.js'

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = (req as AuthRequest).userId
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } })
  if (!user?.isAdmin) { res.status(403).json({ error: 'Admin only' }); return }
  next()
}
