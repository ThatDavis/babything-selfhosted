import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { assertStripe } from '../lib/stripe.js'
import { updateTenantInMainApp } from '../lib/main-app.js'

const router = Router()

// Create a Stripe Customer Portal session for managing subscriptions
router.post('/portal-session', async (req, res) => {
  if (process.env.STRIPE_BYPASS === 'true') {
    res.status(400).json({ error: 'Billing is disabled in bypass mode' })
    return
  }

  const { subdomain } = req.body
  if (!subdomain || typeof subdomain !== 'string') {
    res.status(400).json({ error: 'subdomain is required' })
    return
  }

  const tenant = await prisma.tenantSubscription.findUnique({
    where: { subdomain },
    include: { customer: true },
  })
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' })
    return
  }

  const stripe = assertStripe()
  const session = await stripe.billingPortal.sessions.create({
    customer: tenant.customer.stripeCustomerId,
    return_url: `${req.headers.origin ?? 'https://' + subdomain + '.babything.app'}/account?subdomain=${subdomain}`,
  })

  res.json({ url: session.url })
})

// Cancel subscription immediately (sets to cancel at period end)
router.post('/cancel', async (req, res) => {
  if (process.env.STRIPE_BYPASS === 'true') {
    res.status(400).json({ error: 'Billing is disabled in bypass mode' })
    return
  }

  const { subdomain } = req.body
  if (!subdomain || typeof subdomain !== 'string') {
    res.status(400).json({ error: 'subdomain is required' })
    return
  }

  const tenant = await prisma.tenantSubscription.findUnique({
    where: { subdomain },
  })
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' })
    return
  }
  if (!tenant.stripeSubscriptionId) {
    res.status(400).json({ error: 'No active subscription' })
    return
  }

  const stripe = assertStripe()
  await stripe.subscriptions.cancel(tenant.stripeSubscriptionId)

  await prisma.tenantSubscription.update({
    where: { id: tenant.id },
    data: { status: 'SUSPENDED', canceledAt: new Date() },
  })
  await updateTenantInMainApp(subdomain, { status: 'SUSPENDED' }).catch(() => {})

  res.json({ status: 'SUSPENDED' })
})

export default router
