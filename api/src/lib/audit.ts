import { Request } from 'express'

type AuditEvent =
  | 'login_success'
  | 'login_failure'
  | 'register'
  | 'logout'
  | 'password_reset_requested'
  | 'password_reset_completed'
  | 'invite_sent'
  | 'invite_accepted'
  | 'oauth_login'
  | 'admin_user_deleted'
  | 'admin_role_changed'
  | 'admin_smtp_updated'
  | 'admin_oauth_provider_created'
  | 'admin_oauth_provider_updated'
  | 'admin_oauth_provider_deleted'
  | 'admin_seed_used'

interface AuditPayload {
  event: AuditEvent
  actor?: string
  target?: string
  ip?: string
  outcome: 'success' | 'failure'
  details?: Record<string, unknown>
  timestamp: string
}

export function audit(req: Request | undefined, event: AuditEvent, outcome: 'success' | 'failure', opts?: { actor?: string; target?: string; details?: Record<string, unknown> }) {
  const payload: AuditPayload = {
    event,
    actor: opts?.actor,
    target: opts?.target,
    ip: req?.ip ?? req?.socket?.remoteAddress,
    outcome,
    details: opts?.details,
    timestamp: new Date().toISOString(),
  }
  // Strip undefined keys for cleaner JSON
  const clean = Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined))
  console.log(JSON.stringify(clean))
}
