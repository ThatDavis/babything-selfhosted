import tls from 'tls'
import { Request, Response, NextFunction } from 'express'

export function requireInternalKey(req: Request, res: Response, next: NextFunction) {
  const mtlsEnabled = process.env.MTLS_ENABLED === 'true'

  if (mtlsEnabled) {
    // Ensure the request arrived on the mTLS port, not the public HTTP port
    const mtlsPort = Number(process.env.MTLS_PORT ?? 3003)
    if (req.socket.localPort !== mtlsPort) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    const socket = req.socket as tls.TLSSocket
    const cert = socket.getPeerCertificate?.()
    if (!cert || !cert.subject) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    // Only the provisioning service is allowed to call internal routes
    if (cert.subject.CN !== 'provisioning') {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    next()
    return
  }

  // Fallback: shared API key for self-hosted or during transition
  const key = req.headers['x-internal-key']
  if (!key || key !== process.env.INTERNAL_API_KEY) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}
