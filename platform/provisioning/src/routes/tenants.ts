import { Router } from 'express'
import { z } from 'zod'
import Stripe from 'stripe'
import { prisma } from '../lib/prisma.js'
import { assertStripe } from '../lib/stripe.js'
import { pushTenantToMainApp, validateDiscountCode, useDiscountCode } from '../lib/main-app.js'

const router = Router()

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  subdomain: z.string().min(3).regex(/^[a-z0-9-]+$/),
  billingPeriod: z.enum(['MONTHLY', 'ANNUAL']).default('MONTHLY'),
  discountCode: z.string().optional(),
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

router.post('/', async (req, res) => {
  const result = createSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() })
    return
  }

  const { email, name, subdomain, billingPeriod, discountCode } = result.data

  const existing = await prisma.tenantSubscription.findUnique({
    where: { subdomain },
  })
  if (existing) {
    res.status(409).json({ error: 'Subdomain already taken' })
    return
  }

  // Validate discount code if provided
  let discount: Awaited<ReturnType<typeof validateDiscountCode>> | null = null
  if (discountCode) {
    try {
      discount = await validateDiscountCode(discountCode, billingPeriod)
    } catch (err: any) {
      res.status(400).json({ error: err.message })
      return
    }
  }

  let stripeCustomerId: string | undefined
  let stripeSubscriptionId: string | undefined
  let trialEndsAt: Date
  let stripeCouponId: string | undefined

  if (discount && discount.type === 'FREE_TIME') {
    trialEndsAt = new Date(Date.now() + discount.value * 24 * 60 * 60 * 1000)
  } else {
    trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  }

  if (!bypassStripe) {
    try {
      const stripe = assertStripe()

      const customer = await stripe.customers.create({
        email,
        name,
        metadata: { subdomain },
      })
      stripeCustomerId = customer.id

      const subscriptionCreateParams: Stripe.SubscriptionCreateParams = {
        customer: customer.id,
        trial_end: Math.floor(trialEndsAt.getTime() / 1000),
        items: [
          {
            price: getStripePriceId(billingPeriod),
          },
        ],
        metadata: { subdomain },
      }

      // Apply percentage discount via Stripe coupon
      if (discount && discount.type === 'PERCENTAGE') {
        const coupon = await stripe.coupons.create({
          percent_off: discount.value,
          duration: 'forever',
          metadata: { subdomain, code: discount.code },
        })
        stripeCouponId = coupon.id
        subscriptionCreateParams.coupon = coupon.id
      }

      const subscription = await stripe.subscriptions.create(subscriptionCreateParams)
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
    },
  })

  // Record discount code usage after successful creation
  if (discount) {
    try {
      await useDiscountCode(discount.code)
    } catch (err) {
      console.error('Failed to record discount code usage:', err)
      // Non-fatal: the tenant is already created
    }
  }

  try {
    await pushTenantToMainApp({
      subdomain,
      status: 'TRIAL',
      trialEndsAt,
      plan: 'FLAT_RATE',
      billingPeriod,
    })
  } catch (err) {
    console.error('Failed to push tenant to main app:', err)
    // Continue — the tenant exists in provisioning; main app sync can be retried
  }

  res.status(201).json({
    tenant: tenantSub,
    customer: customerRecord,
    trialEndsAt,
    discount: discount
      ? { type: discount.type, value: discount.value, code: discount.code }
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
