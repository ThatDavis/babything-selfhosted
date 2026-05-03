import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import { getTenantId } from '../lib/tenant-context.js'
import { requireAuth } from '../middleware/auth.js'
import type { Response } from 'express'
import type { AuthRequest } from '../middleware/auth.js'
import type { Server as HttpServer } from 'http'
import WebSocket from 'ws'

/* ── In-memory state ───────────────────────────────────────── */

interface AgentSocket {
  ws: WebSocket
  tenantId: string
  sessionId: string
  connectedAt: Date
}

interface WatchSession {
  watchId: string
  tenantId: string
  offer?: string
  answer?: string
  browserIce: RTCIceCandidateInit[]
  agentIce: RTCIceCandidateInit[]
  createdAt: Date
  resolvers: Array<(value: unknown) => void>
}

const agents = new Map<string, AgentSocket>() // sessionId -> agent
const tenantAgents = new Map<string, string>() // tenantId -> sessionId
const watches = new Map<string, WatchSession>() // watchId -> session

/* ── Express router (browser-facing HTTP) ──────────────────── */

const router = Router()

/** POST /monitor/token — Generate a 30-day agent token (admin only) */
router.post('/token', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } })
  if (!user?.isAdmin) {
    res.status(403).json({ error: 'Admin required' })
    return
  }
  const tenantId = getTenantId()!
  const token = jwt.sign(
    { sub: 'agent', tenantId, scope: 'monitor' },
    process.env.JWT_SECRET!,
    { expiresIn: '30d' }
  )
  res.json({ token })
})

/** GET /monitor/status — Is an agent connected for this tenant? */
router.get('/status', requireAuth, async (_req: AuthRequest, res: Response) => {
  const tenantId = getTenantId()!
  const sessionId = tenantAgents.get(tenantId)
  if (!sessionId) {
    res.json({ connected: false })
    return
  }
  const agent = agents.get(sessionId)
  if (!agent) {
    res.json({ connected: false })
    return
  }
  res.json({
    connected: true,
    connectedAt: agent.connectedAt.toISOString(),
  })
})

/** GET /monitor/config — ICE servers for browser PeerConnection */
router.get('/config', requireAuth, async (_req: AuthRequest, res: Response) => {
  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
  ]
  const turnUrl = process.env.TURN_URL
  if (turnUrl) {
    iceServers.push({
      urls: turnUrl,
      username: process.env.TURN_USERNAME ?? '',
      credential: process.env.TURN_CREDENTIAL ?? '',
    })
  }
  res.json({ iceServers })
})

/** POST /monitor/watch — Start a new watch session */
router.post('/watch', requireAuth, async (_req: AuthRequest, res: Response) => {
  const tenantId = getTenantId()!
  const watchId = crypto.randomUUID()
  watches.set(watchId, {
    watchId,
    tenantId,
    browserIce: [],
    agentIce: [],
    createdAt: new Date(),
    resolvers: [],
  })
  // Prune old sessions
  const cutoff = Date.now() - 5 * 60 * 1000
  for (const [id, w] of watches) {
    if (w.createdAt.getTime() < cutoff) {
      for (const r of w.resolvers) r(null)
      watches.delete(id)
    }
  }
  res.json({ watchId })
})

/** POST /monitor/watch/:watchId/offer — Browser sends SDP offer */
router.post('/watch/:watchId/offer', requireAuth, async (req: AuthRequest, res: Response) => {
  const { watchId } = req.params
  const { sdp } = req.body
  const tenantId = getTenantId()!

  const watch = watches.get(watchId)
  if (!watch || watch.tenantId !== tenantId) {
    res.status(404).json({ error: 'Watch session not found' })
    return
  }
  watch.offer = sdp

  // Forward to agent
  const sessionId = tenantAgents.get(tenantId)
  if (sessionId) {
    const agent = agents.get(sessionId)
    if (agent?.ws.readyState === WebSocket.OPEN) {
      agent.ws.send(JSON.stringify({ type: 'offer', watchId, sdp }))
    }
  }
  res.json({ ok: true })
})

/** GET /monitor/watch/:watchId/answer — Browser long-polls for agent answer */
router.get('/watch/:watchId/answer', requireAuth, async (req: AuthRequest, res: Response) => {
  const { watchId } = req.params
  const tenantId = getTenantId()!

  const watch = watches.get(watchId)
  if (!watch || watch.tenantId !== tenantId) {
    res.status(404).json({ error: 'Watch session not found' })
    return
  }
  if (watch.answer) {
    res.json({ sdp: watch.answer })
    return
  }

  // Long-poll: wait up to 10 s
  let resolved = false
  const timeout = setTimeout(() => {
    if (resolved) return
    resolved = true
    // Remove self from resolvers
    watch.resolvers = watch.resolvers.filter(r => r !== resolve)
    res.status(204).send()
  }, 10000)

  function resolve(value: unknown) {
    if (resolved) return
    resolved = true
    clearTimeout(timeout)
    watch.resolvers = watch.resolvers.filter(r => r !== resolve)
    if (value && typeof value === 'string') {
      res.json({ sdp: value })
    } else {
      res.status(204).send()
    }
  }

  watch.resolvers.push(resolve)
  req.on('close', () => {
    if (!resolved) resolve(null)
  })
})

/** POST /monitor/watch/:watchId/ice — Browser sends ICE candidate */
router.post('/watch/:watchId/ice', requireAuth, async (req: AuthRequest, res: Response) => {
  const { watchId } = req.params
  const { candidate } = req.body
  const tenantId = getTenantId()!

  const watch = watches.get(watchId)
  if (!watch || watch.tenantId !== tenantId) {
    res.status(404).json({ error: 'Watch session not found' })
    return
  }
  watch.browserIce.push(candidate)

  // Forward to agent
  const sessionId = tenantAgents.get(tenantId)
  if (sessionId) {
    const agent = agents.get(sessionId)
    if (agent?.ws.readyState === WebSocket.OPEN) {
      agent.ws.send(JSON.stringify({ type: 'ice', watchId, candidate }))
    }
  }
  res.json({ ok: true })
})

/** GET /monitor/watch/:watchId/ice — Browser polls for agent ICE candidates */
router.get('/watch/:watchId/ice', requireAuth, async (req: AuthRequest, res: Response) => {
  const { watchId } = req.params
  const tenantId = getTenantId()!

  const watch = watches.get(watchId)
  if (!watch || watch.tenantId !== tenantId) {
    res.status(404).json({ error: 'Watch session not found' })
    return
  }
  if (watch.agentIce.length > 0) {
    const candidates = [...watch.agentIce]
    watch.agentIce = []
    res.json({ candidates })
    return
  }

  // Long-poll
  let resolved = false
  const timeout = setTimeout(() => {
    if (resolved) return
    resolved = true
    watch.resolvers = watch.resolvers.filter(r => r !== resolve)
    res.json({ candidates: [] })
  }, 10000)

  function resolve(value: unknown) {
    if (resolved) return
    resolved = true
    clearTimeout(timeout)
    watch.resolvers = watch.resolvers.filter(r => r !== resolve)
    if (value && Array.isArray(value)) {
      res.json({ candidates: value })
    } else {
      res.json({ candidates: [] })
    }
  }

  watch.resolvers.push(resolve)
  req.on('close', () => {
    if (!resolved) resolve(null)
  })
})

/* ── WebSocket server (agent-facing) ───────────────────────── */

export function setupAgentWebSocket(httpServer: HttpServer) {
  const wss = new WebSocket.Server({ noServer: true })

  httpServer.on('upgrade', (request, socket, head) => {
    if (request.url?.startsWith('/monitor/agent')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request)
      })
    }
  })

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url ?? '', `http://${req.headers.host}`)
    const token = url.searchParams.get('token')

    if (!token) {
      ws.close(4001, 'Token required')
      return
    }

    let payload: { sub: string; tenantId: string; scope: string }
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string; tenantId: string; scope: string }
      if (payload.sub !== 'agent' || payload.scope !== 'monitor') {
        ws.close(4002, 'Invalid token')
        return
      }
    } catch {
      ws.close(4003, 'Invalid token')
      return
    }

    const tenantId = payload.tenantId
    const sessionId = crypto.randomUUID()

    // Register agent
    const agent: AgentSocket = { ws, tenantId, sessionId, connectedAt: new Date() }
    agents.set(sessionId, agent)

    // Evict previous session for this tenant
    const oldSessionId = tenantAgents.get(tenantId)
    if (oldSessionId && oldSessionId !== sessionId) {
      const old = agents.get(oldSessionId)
      if (old) {
        try { old.ws.close() } catch {}
        agents.delete(oldSessionId)
      }
    }
    tenantAgents.set(tenantId, sessionId)

    // Upsert DB record (fire-and-forget)
    prisma.monitorAgent.upsert({
      where: { tenantId },
      update: { sessionId, status: 'CONNECTED', lastPingAt: new Date() },
      create: { tenantId, sessionId, status: 'CONNECTED' },
    }).catch(() => {})

    // Handle messages from agent
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'answer' && msg.watchId && msg.sdp) {
          const watch = watches.get(msg.watchId)
          if (watch) {
            watch.answer = msg.sdp
            for (const r of watch.resolvers) r(msg.sdp)
          }
        } else if (msg.type === 'ice' && msg.watchId && msg.candidate) {
          const watch = watches.get(msg.watchId)
          if (watch) {
            watch.agentIce.push(msg.candidate)
            for (const r of watch.resolvers) r(watch.agentIce)
          }
        } else if (msg.type === 'pong') {
          // keep-alive acknowledged
        }
      } catch {
        // ignore malformed messages
      }
    })

    const cleanup = () => {
      agents.delete(sessionId)
      if (tenantAgents.get(tenantId) === sessionId) {
        tenantAgents.delete(tenantId)
      }
      prisma.monitorAgent.updateMany({
        where: { sessionId },
        data: { status: 'DISCONNECTED' },
      }).catch(() => {})
    }

    ws.on('close', cleanup)
    ws.on('error', cleanup)

    // Ping every 30 s
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)

    ws.on('close', () => clearInterval(pingInterval))

    // Welcome
    ws.send(JSON.stringify({ type: 'connected', sessionId }))
  })
}

export default router
