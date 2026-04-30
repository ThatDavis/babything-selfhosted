import http from 'http'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import passport from 'passport'
import { initSocket } from './lib/socket.js'
import authRouter from './routes/auth.js'
import adminRouter from './routes/admin.js'
import babiesRouter from './routes/babies.js'
import feedingsRouter from './routes/feedings.js'
import diapersRouter from './routes/diapers.js'
import sleepRouter from './routes/sleep.js'
import eventsRouter from './routes/events.js'
import growthRouter from './routes/growth.js'
import medicationsRouter from './routes/medications.js'
import milestonesRouter from './routes/milestones.js'
import appointmentsRouter from './routes/appointments.js'
import vaccinesRouter from './routes/vaccines.js'
import statsRouter from './routes/stats.js'
import reportsRouter from './routes/reports.js'

// Validate secrets before booting
function validateSecrets() {
  const jwt = process.env.JWT_SECRET
  const invite = process.env.INVITE_SECRET
  const minLen = 32
  if (!jwt || jwt.length < minLen) {
    console.error(`FATAL: JWT_SECRET must be at least ${minLen} characters. Current length: ${jwt?.length ?? 0}`)
    process.exit(1)
  }
  if (!invite || invite.length < minLen) {
    console.error(`FATAL: INVITE_SECRET must be at least ${minLen} characters. Current length: ${invite?.length ?? 0}`)
    process.exit(1)
  }
}
validateSecrets()

const app = express()
const httpServer = http.createServer(app)
initSocket(httpServer)

// Trust proxy only when explicitly configured (e.g., behind nginx)
const trustedProxies = process.env.TRUSTED_PROXIES
if (trustedProxies) {
  app.set('trust proxy', trustedProxies.split(',').map(s => s.trim()))
}
app.use(cookieParser(process.env.JWT_SECRET))
app.use(passport.initialize())

// CORS: only allow configured origin; never default to wildcard
// credentials: true is required for cookies to be sent cross-origin
const corsOrigin = process.env.CORS_ORIGIN
if (corsOrigin) {
  app.use(cors({ origin: corsOrigin, credentials: true }))
}

app.use(express.json({ limit: '100kb' }))

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
})

app.use('/auth/login', authLimiter)
app.use('/auth/register', authLimiter)
app.use('/auth/forgot-password', authLimiter)
app.use('/auth/reset-password', authLimiter)
app.use('/auth/oauth/google/start', authLimiter)

app.use('/auth', authRouter)
app.use('/admin', adminRouter)
app.use('/babies', babiesRouter)
app.use('/babies/:babyId/feedings', feedingsRouter)
app.use('/babies/:babyId/diapers', diapersRouter)
app.use('/babies/:babyId/sleep', sleepRouter)
app.use('/babies/:babyId/events', eventsRouter)
app.use('/babies/:babyId/growth', growthRouter)
app.use('/babies/:babyId/medications', medicationsRouter)
app.use('/babies/:babyId/milestones', milestonesRouter)
app.use('/babies/:babyId/appointments', appointmentsRouter)
app.use('/babies/:babyId/vaccines', vaccinesRouter)
app.use('/babies/:babyId/stats', statsRouter)
app.use('/babies/:babyId', reportsRouter)

app.get('/health', (_req, res) => res.json({ ok: true }))

const port = Number(process.env.PORT ?? 3001)
httpServer.listen(port, () => console.log(`api listening on :${port}`))
