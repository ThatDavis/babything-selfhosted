import { Server } from 'socket.io'
import { Server as HttpServer } from 'http'
import jwt from 'jsonwebtoken'
import { prisma } from './prisma.js'
import { runWithTenantAsync, type TenantInfo } from './tenant-context.js'

let _io: Server | null = null

function parseCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined
  const match = header.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[1]) : undefined
}

async function resolveSocketTenant(): Promise<TenantInfo> {
  let tenant = await prisma.tenant.findUnique({ where: { id: 'default' } })
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { id: 'default', subdomain: 'default', status: 'ACTIVE', plan: 'SELFHOSTED' },
    })
  }
  return tenant
}

export function initSocket(httpServer: HttpServer) {
  _io = new Server(httpServer, {
    cors: { origin: process.env.APP_URL ?? false, methods: ['GET', 'POST'] },
    path: '/socket.io',
  })

  _io.use(async (socket, next) => {
    try {
      const token = parseCookie(socket.handshake.headers.cookie, 'session') ?? (socket.handshake.auth?.token as string | undefined)
      if (!token) return next(new Error('Unauthorized'))
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string }
      socket.data.userId = payload.sub

      const tenant = await resolveSocketTenant()
      socket.data.tenantId = tenant.id
      socket.data.tenant = tenant

      next()
    } catch (err) {
      next(err as Error)
    }
  })

  _io.on('connection', socket => {
    socket.on('join:baby', async (babyId: string) => {
      const tenantId = socket.data.tenantId as string
      await runWithTenantAsync({ tenantId }, async () => {
        const membership = await prisma.babyCaregiver.findUnique({
          where: { babyId_userId: { babyId, userId: socket.data.userId } },
        })
        if (membership?.acceptedAt) socket.join(`baby:${babyId}`)
      })
    })

    socket.on('leave:baby', (babyId: string) => {
      socket.leave(`baby:${babyId}`)
    })
  })

  return _io
}

export function getIO(): Server {
  if (!_io) throw new Error('Socket.io not initialized')
  return _io
}

export function emitBabyEvent(babyId: string, event: string, data: unknown) {
  if (_io) _io.to(`baby:${babyId}`).emit(event, data)
}
