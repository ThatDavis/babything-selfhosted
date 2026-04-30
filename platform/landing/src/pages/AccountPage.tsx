import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'

export default function AccountPage() {
  const [params] = useSearchParams()
  const subdomain = params.get('subdomain') ?? ''
  const [tenant, setTenant] = useState<{ status: string; trialEndsAt: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!subdomain) { setLoading(false); return }
    api.tenantStatus(subdomain)
      .then(t => setTenant({ status: t.status, trialEndsAt: t.trialEndsAt }))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [subdomain])

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
          {tenant?.trialEndsAt && (
            <p><span className="text-stone-500">Trial ends:</span> {new Date(tenant.trialEndsAt).toLocaleDateString()}</p>
          )}
        </div>
        <div className="pt-4 border-t border-stone-100 space-y-3">
          <button className="btn-primary w-full text-sm" onClick={() => alert('Stripe Customer Portal coming soon')}>
            Update payment method
          </button>
          <button className="btn-ghost w-full text-sm border border-stone-200" onClick={() => alert('Cancellation coming soon')}>
            Cancel subscription
          </button>
        </div>
      </div>
    </div>
  )
}
