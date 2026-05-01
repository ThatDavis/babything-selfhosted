import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

const router = Router()

// Get referral stats for a tenant
router.get('/:subdomain', async (req, res) => {
  const { subdomain } = req.params
  const tenant = await prisma.tenantSubscription.findUnique({
    where: { subdomain },
  })
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' })
    return
  }

  const referrals = await prisma.referral.findMany({
    where: { referrerSubdomain: subdomain },
    orderBy: { createdAt: 'desc' },
  })

  res.json({
    referralCode: tenant.referralCode,
    totalReferrals: referrals.length,
    referrals: referrals.map(r => ({
      refereeSubdomain: r.refereeSubdomain,
      status: r.status,
      createdAt: r.createdAt,
    })),
  })
})

export default router
