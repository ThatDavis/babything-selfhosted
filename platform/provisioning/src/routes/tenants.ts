import { Router } from 'express'
import { z } from 'zod'
import crypto from 'crypto'
import { prisma } from '../lib/prisma.js'
import { assertStripe } from '../lib/stripe.js'
import { pushTenantToMainApp } from '../lib/main-app.js'

const router = Router()

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  subdomain: z.string().min(3).regex(/^[a-z0-9-]+$/),
  billingPeriod: z.enum(['MONTHLY', 'ANNUAL']).default('MONTHLY'),
  referralCode: z.string().optional(),
})

const bypassStripe = process.env.STRIPE_BYPASS === 'true'

function getStripePriceId(billingPeriod: string): string {
  if (billingPeriod === 'ANNUAL') {
    const id = process.env.STRIPE_ANNUAL_PRICE_ID
    if (!id) throw new Error('STRIPE_ANNUAL_PRICE_ID not configured')
    return id
  }
  const id = process.env.STRIPE_PRICE_ID
  if (!id) throw new Error('STRIPE_PRICE_ID not configured')
  return id
}

function generateReferralCode(subdomain: string): string {
  const suffix = crypto.randomBytes(3).toString('hex')
  return `${subdomain}-${suffix}`
}

async function applyReferralReward(referralCode: string, refereeSubdomain: string) {
  const referrer = await prisma.tenantSubscription.findUnique({
    where: { referralCode },
  })
  if (!referrer) return null

  // Extend referee trial by 7 days (applied during creation)
  // Extend referrer trial by 7 days if still in trial
  const extraDays = 7 * 24 * 60 * 60 * 1000
  let referrerTrialExtended = false

  if (referrer.status === 'TRIAL' && referrer.trialEndsAt) {
    const newTrialEnd = new Date(referrer.trialEndsAt.getTime() + extraDays)
    if (!bypassStripe) {
      try {
        const stripe = assertStripe()
        if (referrer.stripeSubscriptionId) {
          await stripe.subscriptions.update(referrer.stripeSubscriptionId, {
            trial_end: Math.floor(newTrialEnd.getTime() / 1000),
          })
        }
      } catch (err) {
        console.error('Failed to extend referrer trial in Stripe:', err)
      }
    }
    await prisma.tenantSubscription.update({
      where: { id: referrer.id },
      data: { trialEndsAt: newTrialEnd },
    })
    referrerTrialExtended = true
  }

  const referral = await prisma.referral.create({
    data: {
      referrerSubdomain: referrer.subdomain,
      refereeSubdomain,
      code: referralCode,
      status: 'REWARDED',
      rewardAppliedAt: new Date(),
    },
  })

  return { referral, referrerTrialExtended }
}

router.post('/', async (req, res) => {
  const result = createSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() })
    return
  }

  const { email, name, subdomain, billingPeriod, referralCode } = result.data

  const existing = await prisma.tenantSubscription.findUnique({
    where: { subdomain },
  })
  if (existing) {
    res.status(409).json({ error: 'Subdomain already taken' })
    return
  }

  // Validate referral code if provided
  let referralReward: Awaited<ReturnType<typeof applyReferralReward>> = null
  if (referralCode) {
    const referrer = await prisma.tenantSubscription.findUnique({
      where: { referralCode },
    })
    if (!referrer) {
      res.status(400).json({ error: 'Invalid referral code' })
      return
    }
    if (referrer.subdomain === subdomain) {
      res.status(400).json({ error: 'Cannot refer yourself' })
      return
    }
  }

  let stripeCustomerId: string | undefined
  let stripeSubscriptionId: string | undefined
  const baseTrialMs = 14 * 24 * 60 * 60 * 1000
  const referralBonusMs = referralCode ? 7 * 24 * 60 * 60 * 1000 : 0
  const trialEndsAt = new Date(Date.now() + baseTrialMs + referralBonusMs)
  const newReferralCode = generateReferralCode(subdomain)

  if (!bypassStripe) {
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
            price: getStripePriceId(billingPeriod),
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
  } else {
    stripeCustomerId = `cus_bypass_${subdomain}`
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
      billingPeriod,
      referralCode: newReferralCode,
    },
  })

  // Apply referral reward after creating the referee tenant
  if (referralCode) {
    referralReward = await applyReferralReward(referralCode, subdomain)
  }

  try {
    await pushTenantToMainApp({
      subdomain,
      status: 'TRIAL',
      trialEndsAt,
      plan: 'FLAT_RATE',
      billingPeriod,
      referralCode: newReferralCode,
    })
  } catch (err) {
    console.error('Failed to push tenant to main app:', err)
    // Continue — the tenant exists in provisioning; main app sync can be retried
  }

  res.status(201).json({
    tenant: tenantSub,
    customer: customerRecord,
    trialEndsAt,
    referralReward: referralReward
      ? { referrerSubdomain: referralReward.referral.referrerSubdomain, referrerTrialExtended: referralReward.referrerTrialExtended }
      : null,
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
