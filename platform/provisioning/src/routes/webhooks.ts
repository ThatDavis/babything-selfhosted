import { Router } from 'express'
import type { Request, Response } from 'express'
import type Stripe from 'stripe'
import { prisma } from '../lib/prisma.js'
import { assertStripe } from '../lib/stripe.js'
import { updateTenantInMainApp } from '../lib/main-app.js'

const router = Router()
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

function verifyEvent(req: Request) {
  if (!endpointSecret) throw new Error('Webhook secret not configured')
  const sig = req.headers['stripe-signature'] as string
  return assertStripe().webhooks.constructEvent(req.body, sig, endpointSecret)
}

router.post('/stripe', async (req: Request, res: Response) => {
  let event: Stripe.Event
  try {
    event = verifyEvent(req)
  } catch (err) {
    res.status(400).send(`Webhook Error: ${(err as Error).message}`)
    return
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const subdomain = session.metadata?.subdomain
      if (subdomain) {
        await prisma.tenantSubscription.updateMany({
          where: { subdomain },
          data: { status: 'ACTIVE' },
        })
        await updateTenantInMainApp(subdomain, { status: 'ACTIVE' }).catch(() => {})
      }
      break
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      const subId = invoice.subscription as string | undefined
      if (subId) {
        const tenant = await prisma.tenantSubscription.findUnique({
          where: { stripeSubscriptionId: subId },
        })
        if (tenant) {
          await prisma.tenantSubscription.update({
            where: { id: tenant.id },
            data: { status: 'ACTIVE' },
          })
          await updateTenantInMainApp(tenant.subdomain, { status: 'ACTIVE' }).catch(() => {})
        }
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const subId = invoice.subscription as string | undefined
      if (subId) {
        const tenant = await prisma.tenantSubscription.findUnique({
          where: { stripeSubscriptionId: subId },
        })
        if (tenant) {
          await prisma.tenantSubscription.update({
            where: { id: tenant.id },
            data: { status: 'PAST_DUE' },
          })
          await updateTenantInMainApp(tenant.subdomain, { status: 'ACTIVE' }).catch(() => {})
        }
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const subId = subscription.id
      const tenant = await prisma.tenantSubscription.findUnique({
        where: { stripeSubscriptionId: subId },
      })
      if (tenant) {
        await prisma.tenantSubscription.update({
          where: { id: tenant.id },
          data: { status: 'SUSPENDED', canceledAt: new Date() },
        })
        await updateTenantInMainApp(tenant.subdomain, { status: 'SUSPENDED' }).catch(() => {})
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const subId = subscription.id
      const tenant = await prisma.tenantSubscription.findUnique({
        where: { stripeSubscriptionId: subId },
      })
      if (tenant) {
        const status = subscription.status === 'active' ? 'ACTIVE'
          : subscription.status === 'canceled' ? 'SUSPENDED'
          : subscription.status === 'past_due' ? 'PAST_DUE'
          : tenant.status

        const item = subscription.items.data[0]
        const priceId = item?.price?.id
        const newBillingPeriod = priceId === process.env.STRIPE_ANNUAL_PRICE_ID ? 'ANNUAL'
          : priceId === process.env.STRIPE_PRICE_ID ? 'MONTHLY'
          : tenant.billingPeriod

        const needsUpdate = status !== tenant.status
          || newBillingPeriod !== tenant.billingPeriod
          || subscription.current_period_start
          || subscription.current_period_end

        if (needsUpdate) {
          await prisma.tenantSubscription.update({
            where: { id: tenant.id },
            data: {
              status,
              billingPeriod: newBillingPeriod,
              currentPeriodStart: subscription.current_period_start
                ? new Date(subscription.current_period_start * 1000)
                : tenant.currentPeriodStart,
              currentPeriodEnd: subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000)
                : tenant.currentPeriodEnd,
            },
          })
          const updates: Record<string, unknown> = {}
          if (status !== tenant.status) updates.status = status
          if (newBillingPeriod !== tenant.billingPeriod) updates.billingPeriod = newBillingPeriod
          if (Object.keys(updates).length > 0) {
            await updateTenantInMainApp(tenant.subdomain, updates).catch(() => {})
          }
        }
      }
      break
    }
  }

  res.json({ received: true })
})

export default router
