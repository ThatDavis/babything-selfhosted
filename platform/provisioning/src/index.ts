import express from 'express'
import tenantsRouter from './routes/tenants.js'
import webhooksRouter from './routes/webhooks.js'
import billingRouter from './routes/billing.js'
import referralsRouter from './routes/referrals.js'
import plansRouter from './routes/plans.js'

const app = express()

// Stripe webhooks need the raw body for signature verification
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }), webhooksRouter)

// Everything else uses JSON
app.use(express.json({ limit: '100kb' }))

app.use('/tenants', tenantsRouter)
app.use('/billing', billingRouter)
app.use('/referrals', referralsRouter)
app.use('/plans', plansRouter)

app.get('/health', (_req, res) => res.json({ ok: true }))

const port = Number(process.env.PORT ?? 3002)
app.listen(port, () => console.log(`provisioning listening on :${port}`))
