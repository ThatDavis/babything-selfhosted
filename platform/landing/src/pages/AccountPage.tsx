import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'

export default function AccountPage() {
  const [params] = useSearchParams()
  const subdomain = params.get('subdomain') ?? ''
  const [tenant, setTenant] = useState<{
    status: string
    trialEndsAt: string | null
    billingPeriod: string | null
  } | null>(null)
  const [referralStats, setReferralStats] = useState<{
    referralCode: string | null
    totalReferrals: number
    referrals: { refereeSubdomain: string; status: string; createdAt: string }[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!subdomain) { setLoading(false); return }
    Promise.all([
      api.tenantStatus(subdomain),
      api.referralStats(subdomain),
    ])
      .then(([t, r]) => {
        setTenant({ status: t.status, trialEndsAt: t.trialEndsAt, billingPeriod: t.billingPeriod })
        setReferralStats(r)
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [subdomain])

  async function openPortal() {
    setActionLoading(true)
    try {
      const { url } = await api.portalSession(subdomain)
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open billing portal')
    } finally {
      setActionLoading(false)
    }
  }

  async function cancel() {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access at the end of your billing period.')) return
    setActionLoading(true)
    try {
      const { status } = await api.cancelSubscription(subdomain)
      setTenant(prev => prev ? { ...prev, status } : prev)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel')
    } finally {
      setActionLoading(false)
    }
  }

  function copyReferralLink() {
    if (!referralStats?.referralCode) return
    const link = `${window.location.origin}/signup?ref=${referralStats.referralCode}`
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-400 border-t-transparent rounded-full animate-spin" /></div>
  if (!subdomain || error) return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="card max-w-md w-full text-center">
        <p className="text-red-500">{error || 'No subdomain provided.'}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="max-w-md mx-auto card space-y-6">
        <h1 className="text-2xl font-bold text-stone-800">Account</h1>
        <div className="space-y-2 text-sm">
          <p><span className="text-stone-500">Subdomain:</span> <strong>{subdomain}.babything.app</strong></p>
          <p><span className="text-stone-500">Status:</span> <span className={`font-semibold ${tenant?.status === 'ACTIVE' ? 'text-green-600' : tenant?.status === 'SUSPENDED' ? 'text-red-500' : 'text-amber-500'}`}>{tenant?.status}</span></p>
          {tenant?.billingPeriod && (
            <p><span className="text-stone-500">Billing:</span> {tenant.billingPeriod === 'ANNUAL' ? '$77/yr (Annual)' : '$8/mo (Monthly)'}</p>
          )}
          {tenant?.trialEndsAt && (
            <p><span className="text-stone-500">Trial ends:</span> {new Date(tenant.trialEndsAt).toLocaleDateString()}</p>
          )}
        </div>

        {referralStats?.referralCode && (
          <div className="pt-4 border-t border-stone-100 space-y-3">
            <h3 className="font-semibold text-stone-700">Referral program</h3>
            <p className="text-sm text-stone-500">Share your link and you both get an extra week free.</p>
            <div className="flex gap-2">
              <input
                readOnly
                className="input flex-1 text-sm bg-stone-50"
                value={`${window.location.origin}/signup?ref=${referralStats.referralCode}`}
              />
              <button onClick={copyReferralLink} className="btn-primary text-sm whitespace-nowrap">
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>
            {referralStats.totalReferrals > 0 && (
              <p className="text-sm text-green-600 font-medium">
                {referralStats.totalReferrals} referral{referralStats.totalReferrals === 1 ? '' : 's'} joined
              </p>
            )}
          </div>
        )}

        <div className="pt-4 border-t border-stone-100 space-y-3">
          <button
            className="btn-primary w-full text-sm"
            onClick={openPortal}
            disabled={actionLoading || tenant?.status === 'SUSPENDED'}
          >
            {actionLoading ? 'Loading…' : 'Manage subscription'}
          </button>
          <button
            className="btn-ghost w-full text-sm border border-stone-200"
            onClick={cancel}
            disabled={actionLoading || tenant?.status === 'SUSPENDED'}
          >
            Cancel subscription
          </button>
        </div>
      </div>
    </div>
  )
}
