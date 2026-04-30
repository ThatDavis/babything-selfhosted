import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { assertStripe } from '../lib/stripe.js'
import { pushTenantToMainApp } from '../lib/main-app.js'

const router = Router()

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  subdomain: z.string().min(3).regex(/^[a-z0-9-]+$/),
})

router.post('/', async (req, res) => {
  const result = createSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() })
    return
  }

  const { email, name, subdomain } = result.data

  const existing = await prisma.tenantSubscription.findUnique({
    where: { subdomain },
  })
  if (existing) {
    res.status(409).json({ error: 'Subdomain already taken' })
    return
  }

  let stripeCustomerId: string | undefined
  let stripeSubscriptionId: string | undefined
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

  try {
    const stripe = assertStripe()

    const customer = await stripe.customers.create({
      email,
      name,
      metadata: { subdomain },
    })
    stripeCustomerId = customer.id

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      trial_end: Math.floor(trialEndsAt.getTime() / 1000),
      items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
        },
      ],
      metadata: { subdomain },
    })
    stripeSubscriptionId = subscription.id
  } catch (err) {
    console.error('Stripe error:', err)
    res.status(500).json({ error: 'Billing setup failed' })
    return
  }

  const customerRecord = await prisma.customer.create({
    data: {
      email,
      name,
      stripeCustomerId: stripeCustomerId!,
    },
  })

  const tenantSub = await prisma.tenantSubscription.create({
    data: {
      subdomain,
      customerId: customerRecord.id,
      status: 'TRIAL',
      trialEndsAt,
      stripeSubscriptionId,
      currentPeriodStart: new Date(),
      currentPeriodEnd: trialEndsAt,
    },
  })

  try {
    await pushTenantToMainApp({
      subdomain,
      status: 'TRIAL',
      trialEndsAt,
      plan: 'FLAT_RATE',
    })
  } catch (err) {
    console.error('Failed to push tenant to main app:', err)
    // Continue — the tenant exists in provisioning; main app sync can be retried
  }

  res.status(201).json({
    tenant: tenantSub,
    customer: customerRecord,
    trialEndsAt,
  })
})

router.get('/:subdomain', async (req, res) => {
  const tenant = await prisma.tenantSubscription.findUnique({
    where: { subdomain: req.params.subdomain },
    include: { customer: true },
  })
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' })
    return
  }
  res.json(tenant)
})

export default router
