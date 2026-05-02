import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { prisma } from '../lib/prisma.js'
import { requireAuth, AuthRequest } from '../middleware/auth.js'
import { sendInviteEmail, sendPasswordResetEmail, sendWelcomeEmail } from '../lib/mailer.js'
import { decryptOptional } from '../lib/crypto.js'
import { audit } from '../lib/audit.js'
import { getTenantId } from '../lib/tenant-context.js'
import { extractSubdomain } from '../lib/subdomain.js'

const router = Router()

// ── Passport serialization (stateless JWT; sessions not used) ──
passport.serializeUser((user: any, done) => done(null, user.id))
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } })
    done(null, user)
  } catch (err) {
    done(err, null)
  }
})

// ── Google OAuth strategy (dedicated, env-driven) ───────────────
const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

if (googleClientId && googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: `${process.env.APP_URL ?? 'http://localhost'}/api/auth/oauth/google/callback`,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        const email = profile.emails?.[0]?.value
        const name = profile.displayName || email || 'User'
        const oauthId = profile.id

        if (!email) {
          return done(null, false, { message: 'Email not provided by Google' })
        }

        try {
          let user = await prisma.user.findFirst({
            where: { oauthProvider: 'google', oauthId },
          })

          if (!user) {
            user = await prisma.user.findUnique({ where: { email } })
            if (user) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: { oauthProvider: 'google', oauthId },
              })
            } else {
              const tenantId = getTenantId()
              if (tenantId) {
                const count = await prisma.user.count()
                user = await prisma.user.create({
                  data: { email, name, oauthProvider: 'google', oauthId, isAdmin: count === 0, tenantId },
                })
              } else {
                // Cloud callback without tenant context - return candidate for downstream handling
                return done(null, { _candidate: true, email, name, oauthId, oauthProvider: 'google' } as any)
              }
            }
          }

          done(null, user)
        } catch (err) {
          done(err, false)
        }
      }
    )
  )
}

function extractToken(req: Request): string | null {
  const cookieToken = (req as any).cookies?.session
  if (cookieToken) return cookieToken
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) return header.slice(7)
  return null
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const inviteSchema = z.object({
  babyId: z.string(),
  email: z.string().email(),
  role: z.enum(['OWNER', 'CAREGIVER']).default('CAREGIVER'),
})

function signToken(userId: string) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET!, { expiresIn: '24h' })
}

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  domain: process.env.COOKIE_DOMAIN,
}

// ── Setup check ──────────────────────────────────────────
router.get('/setup', async (_req, res) => {
  const count = await prisma.user.count()
  res.json({ needed: count === 0 })
})

// ── Register ─────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const result = registerSchema.safeParse(req.body)
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return }
  const { email, password, name } = result.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) { res.status(409).json({ error: 'Email already registered' }); return }

  const count = await prisma.user.count()
  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({ data: { email, passwordHash, name, isAdmin: count === 0, tenantId: getTenantId()! } })
  const token = signToken(user.id)
  res.cookie('session', token, COOKIE_OPTS)
  audit(req, 'register', 'success', { actor: user.id, details: { email: user.email, isAdmin: user.isAdmin } })

  // Send welcome email (best-effort)
  try {
    const appUrl = process.env.APP_URL ?? 'http://localhost'
    await sendWelcomeEmail(user.email, user.name, appUrl)
  } catch {
    // Email sending is best-effort
  }

  res.status(201).json({ user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin } })
})

// ── Login ────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const result = loginSchema.safeParse(req.body)
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return }
  const { email, password } = result.data

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    audit(req, 'login_failure', 'failure', { details: { email } })
    res.status(401).json({ error: 'Invalid credentials' }); return
  }
  const token = signToken(user.id)
  res.cookie('session', token, COOKIE_OPTS)
  audit(req, 'login_success', 'success', { actor: user.id, details: { email: user.email } })
  res.json({ user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin } })
})

// ── Stream auth check (used by nginx auth_request for /hls/) ──
router.get('/stream', async (req, res) => {
  const token = extractToken(req)
  if (!token) { res.status(401).send('Unauthorized'); return }
  try {
    jwt.verify(token, process.env.JWT_SECRET!)
    res.status(200).send('OK')
  } catch {
    res.status(401).send('Invalid token')
  }
})

// ── Logout ───────────────────────────────────────────────
router.post('/logout', async (req, res) => {
  const userId = extractToken(req)
    ? (jwt.verify(extractToken(req)!, process.env.JWT_SECRET!) as { sub: string }).sub
    : undefined
  res.clearCookie('session', COOKIE_OPTS)
  audit(req, 'logout', 'success', { actor: userId })
  res.json({ ok: true })
})

// ── Me ───────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: (req as AuthRequest).userId },
    select: { id: true, email: true, name: true, isAdmin: true, createdAt: true },
  })
  res.json(user)
})

// ── Forgot password ──────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body as { email: string }
  const user = await prisma.user.findUnique({ where: { email } })
  // Always respond 200 to avoid user enumeration
  if (!user) { res.json({ ok: true }); return }

  const token = nanoid(48)
  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt: new Date(Date.now() + 3600_000), tenantId: getTenantId()! },
  })
  const url = `${process.env.APP_URL ?? 'http://localhost'}/reset-password/${token}`
  await sendPasswordResetEmail(user.email, user.name, url)
  audit(req, 'password_reset_requested', 'success', { actor: user.id, details: { email: user.email } })
  res.json({ ok: true })
})

// ── Reset password ───────────────────────────────────────
router.get('/reset-password/:token', async (req, res) => {
  const record = await prisma.passwordResetToken.findUnique({ where: { token: req.params.token } })
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    res.status(410).json({ error: 'Token is invalid or expired' }); return
  }
  res.json({ valid: true })
})

router.post('/reset-password/:token', async (req, res) => {
  const { password } = req.body as { password: string }
  if (!password || password.length < 8) { res.status(400).json({ error: 'Password must be at least 8 characters' }); return }
  const record = await prisma.passwordResetToken.findUnique({ where: { token: req.params.token } })
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    res.status(410).json({ error: 'Token is invalid or expired' }); return
  }
  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { token: req.params.token }, data: { usedAt: new Date() } }),
  ])
  audit(req, 'password_reset_completed', 'success', { actor: record.userId })
  res.json({ ok: true })
})

// ── Invites ──────────────────────────────────────────────
router.post('/invite', requireAuth, async (req, res) => {
  const result = inviteSchema.safeParse(req.body)
  if (!result.success) { res.status(400).json({ error: result.error.flatten() }); return }
  const { babyId, email, role } = result.data
  const userId = (req as AuthRequest).userId

  const membership = await prisma.babyCaregiver.findUnique({ where: { babyId_userId: { babyId, userId } } })
  if (!membership || membership.role !== 'OWNER') { res.status(403).json({ error: 'Only owners can invite caregivers' }); return }

  const token = nanoid(32)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await prisma.inviteToken.create({ data: { token, babyId, email, role, createdBy: userId, expiresAt, tenantId: getTenantId()! } })

  const inviteUrl = `${process.env.APP_URL ?? 'http://localhost'}/invite/${token}`
  const [inviter, baby] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.baby.findUnique({ where: { id: babyId }, select: { name: true } }),
  ])
  try {
    await sendInviteEmail(email, baby?.name ?? 'your baby', inviter?.name ?? 'Someone', inviteUrl)
  } catch {
    // Email sending is best-effort; the invite link is always returned
  }

  audit(req, 'invite_sent', 'success', { actor: userId, target: email, details: { babyId, role } })
  res.json({ inviteToken: token, expiresAt, inviteUrl })
})

router.post('/invite/:token/accept', requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId
  const invite = await prisma.inviteToken.findUnique({ where: { token: req.params.token } })
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) { res.status(410).json({ error: 'Invite is invalid or expired' }); return }
  const existing = await prisma.babyCaregiver.findUnique({ where: { babyId_userId: { babyId: invite.babyId, userId } } })
  if (existing) { res.status(409).json({ error: 'Already a caregiver for this baby' }); return }
  await prisma.$transaction([
    prisma.babyCaregiver.create({ data: { babyId: invite.babyId, userId, role: invite.role, acceptedAt: new Date(), tenantId: getTenantId()! } }),
    prisma.inviteToken.update({ where: { token: invite.token }, data: { usedAt: new Date() } }),
  ])
  audit(req, 'invite_accepted', 'success', { actor: userId, details: { babyId: invite.babyId, role: invite.role } })
  res.json({ babyId: invite.babyId })
})

router.get('/invite/:token', async (req, res) => {
  const invite = await prisma.inviteToken.findUnique({
    where: { token: req.params.token },
    include: { baby: { select: { id: true, name: true } } },
  })
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) { res.status(410).json({ error: 'Invite is invalid or expired' }); return }
  res.json({ babyId: invite.babyId, babyName: invite.baby.name, email: invite.email, role: invite.role })
})

// ── Auth config (public) ─────────────────────────────────
router.get('/config', async (_req, res) => {
  res.json({
    googleEnabled: !!process.env.GOOGLE_CLIENT_ID,
    deploymentMode: 'cloud',
    cookieDomain: process.env.COOKIE_DOMAIN ?? null,
  })
})

// ── Google OAuth (dedicated Passport.js strategy) ──────────
router.get('/oauth/google/start', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    res.status(404).json({ error: 'Google OAuth not configured' })
    return
  }
  const host = req.headers.host ?? ''
  const subdomain = extractSubdomain(host)
  if (!subdomain) {
    res.status(400).json({ error: 'Tenant subdomain required' })
    return
  }
  const state = jwt.sign({ subdomain }, process.env.INVITE_SECRET!, { expiresIn: '10m' })
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
    state,
  })(req, res, next)
})

router.get('/oauth/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, async (err: any, user: any, info: any) => {
    if (err) {
      console.error('Google OAuth error:', err, info)
      res.redirect('/login?error=oauth')
      return
    }

    let redirectUrl = '/'

    if (user?._candidate) {
      const state = req.query.state as string
      if (!state) { res.redirect('/login?error=missing_state'); return }
      try {
        const payload = jwt.verify(state, process.env.INVITE_SECRET!) as { subdomain: string }
        const tenant = await prisma.tenant.findUnique({ where: { subdomain: payload.subdomain } })
        if (!tenant) { res.redirect('/login?error=invalid_tenant'); return }

        let existingUser = await prisma.user.findFirst({ where: { email: user.email } })
        if (existingUser && existingUser.tenantId !== tenant.id) {
          res.redirect('/login?error=email_used_in_other_tenant')
          return
        }

        if (!existingUser) {
          const count = await prisma.user.count({ where: { tenantId: tenant.id } })
          existingUser = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name,
              oauthProvider: user.oauthProvider,
              oauthId: user.oauthId,
              isAdmin: count === 0,
              tenantId: tenant.id,
            }
          })
        }

        user = existingUser
        redirectUrl = `https://${payload.subdomain}.babything.app/`
      } catch (e) {
        console.error('OAuth callback error:', e)
        res.redirect('/login?error=oauth')
        return
      }
    } else if (!user) {
      res.redirect('/login?error=oauth')
      return
    }

    const token = signToken(user.id)
    res.cookie('session', token, COOKIE_OPTS)
    audit(req, 'oauth_login', 'success', { actor: user.id, details: { provider: 'google' } })
    res.redirect(redirectUrl)
  })(req, res, next)
})

// ── OAuth: list enabled providers (public) ───────────────
router.get('/oauth-providers', async (_req, res) => {
  const providers = await prisma.oAuthProvider.findMany({
    where: { enabled: true },
    select: { id: true, name: true, label: true },
  })
  res.json(providers)
})

// ── OAuth: start flow ─────────────────────────────────────
router.get('/oauth/:name/start', async (req, res: Response) => {
  const provider = await prisma.oAuthProvider.findUnique({ where: { name: req.params.name, enabled: true } })
  if (!provider) { res.status(404).json({ error: 'Provider not found' }); return }

  const params = new URLSearchParams({
    client_id: provider.clientId,
    redirect_uri: `${process.env.APP_URL ?? 'http://localhost'}/api/auth/oauth/${provider.name}/callback`,
    response_type: 'code',
    scope: provider.scope,
    state: nanoid(16),
  })
  res.redirect(`${provider.authorizationUrl}?${params}`)
})

// ── OAuth: callback ───────────────────────────────────────
router.get('/oauth/:name/callback', async (req: Request, res: Response) => {
  const { code } = req.query as { code: string }
  if (!code) { res.status(400).send('Missing code'); return }

  const provider = await prisma.oAuthProvider.findUnique({ where: { name: req.params.name, enabled: true } })
  if (!provider) { res.status(404).send('Provider not found'); return }

  // Exchange code for token
  const tokenRes = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: provider.clientId,
      client_secret: decryptOptional(provider.clientSecret),
      redirect_uri: `${process.env.APP_URL ?? 'http://localhost'}/api/auth/oauth/${provider.name}/callback`,
    }),
  })
  const tokenData = await tokenRes.json() as { access_token?: string; error?: string }
  if (!tokenData.access_token) { res.status(400).send('Token exchange failed'); return }

  // Fetch user info
  const userRes = await fetch(provider.userInfoUrl, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  const userInfo = await userRes.json() as { sub?: string; id?: string; email?: string; name?: string; preferred_username?: string }
  const oauthId = userInfo.sub ?? userInfo.id
  const email = userInfo.email
  const name = userInfo.name ?? userInfo.preferred_username ?? email ?? 'User'

  if (!oauthId || !email) { res.status(400).send('Provider did not return email'); return }

  // Find or create user
  let user = await prisma.user.findFirst({ where: { oauthProvider: provider.name, oauthId } })
  if (!user) {
    user = await prisma.user.findUnique({ where: { email } })
    if (user) {
      await prisma.user.update({ where: { id: user.id }, data: { oauthProvider: provider.name, oauthId } })
    } else {
      const count = await prisma.user.count()
      user = await prisma.user.create({ data: { email, name, oauthProvider: provider.name, oauthId, isAdmin: count === 0, tenantId: getTenantId()! } })
    }
  }

  const token = signToken(user.id)
  res.cookie('session', token, COOKIE_OPTS)
  audit(req, 'oauth_login', 'success', { actor: user.id, details: { provider: provider.name } })
  res.redirect('/')
})

export default router
