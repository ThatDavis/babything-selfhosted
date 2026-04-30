import Stripe from 'stripe'

const secretKey = process.env.STRIPE_SECRET_KEY

export const stripe = secretKey
  ? new Stripe(secretKey, { apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion })
  : null

export function assertStripe(): Stripe {
  if (!stripe) throw new Error('Stripe is not configured')
  return stripe
}
