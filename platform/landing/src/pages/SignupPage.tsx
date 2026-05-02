import { useState, FormEvent, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, Plan } from '../lib/api'

function formatPrice(cents: number) {
  const dollars = cents / 100
  return dollars % 1 === 0 ? `$${dollars.toFixed(0)}` : `$${dollars.toFixed(2)}`
}

function calcSavingsPercent(monthlyPrice: number, annualPrice: number) {
  const fullAnnual = monthlyPrice * 12
  if (fullAnnual <= 0) return 0
  return Math.round((1 - annualPrice / fullAnnual) * 100)
}

export default function SignupPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [billingPeriod, setBillingPeriod] = useState<'MONTHLY' | 'ANNUAL'>(
    params.get('period') === 'annual' ? 'ANNUAL' : 'MONTHLY'
  )
  const [discountCode, setDiscountCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [plans, setPlans] = useState<Plan[]>([])
  const [plansLoading, setPlansLoading] = useState(true)

  const plan = plans[0]

  useEffect(() => {
    api.getPlans()
      .then(d => setPlans(d.plans.filter(p => p.isActive)))
      .catch(() => {})
      .finally(() => setPlansLoading(false))
  }, [])

  const RESERVED_SUBDOMAINS = new Set([
    'operator', 'www', 'api', 'mail', 'admin', 'support', 'help', 'billing',
    'provisioning', 'landing', 'web', 'app', 'status', 'blog', 'docs', 'static',
    'cdn', 'staging', 'dev', 'test', 'demo', 'api-v1', 'api-v2', 'socket',
    'ws', 'health', 'metrics', 'grafana', 'prometheus', 'registry', 'git',
  ])
  const [result, setResult] = useState<{
    subdomain: string
    trialEndsAt: string
    discount: { type: string; value: number; code: string } | null
  } | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (RESERVED_SUBDOMAINS.has(subdomain)) {
      setError('This subdomain is reserved. Please choose another.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.provision({
        email,
        name,
        subdomain,
        billingPeriod,
        discountCode: discountCode || undefined,
      })
      setResult({
        subdomain: res.tenant.subdomain,
        trialEndsAt: res.trialEndsAt,
        discount: res.discount,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="card max-w-md w-full text-center space-y-4">
          <h2 className="text-2xl font-serif text-stone-800">You're all set!</h2>
          <p className="text-stone-600">
            Your family subdomain is <strong className="text-brand-600">{result.subdomain}.babything.app</strong>
          </p>
          <p className="text-sm text-stone-500">
            Your free trial ends on {new Date(result.trialEndsAt).toLocaleDateString()}.
          </p>
          {result.discount && (
            <p className="text-sm text-green-600 font-medium">
              🎉 Discount applied: {result.discount.code} —
              {result.discount.type === 'FREE_TIME'
                ? ` ${result.discount.value} days free`
                : ` ${result.discount.value}% off`}
            </p>
          )}
          <a href={`https://${result.subdomain}.babything.app?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`} className="btn-primary w-full inline-block">
            Go to your subdomain
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <form onSubmit={submit} className="card max-w-md w-full space-y-4">
        <h2 className="text-2xl font-bold text-stone-800">Start your free trial</h2>
        <p className="text-sm text-stone-500">No credit card required. 14 days free.</p>
        {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="flex items-center justify-center gap-3 py-2">
          <span className={`text-sm font-medium ${billingPeriod === 'MONTHLY' ? 'text-stone-800' : 'text-stone-400'}`}>Monthly</span>
          <button
            type="button"
            onClick={() => setBillingPeriod(p => p === 'MONTHLY' ? 'ANNUAL' : 'MONTHLY')}
            className="relative w-12 h-6 rounded-full bg-brand-200 transition-colors"
            aria-label="Toggle annual billing"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-brand-600 transition-transform ${billingPeriod === 'ANNUAL' ? 'translate-x-6' : ''}`}
            />
          </button>
          <span className={`text-sm font-medium ${billingPeriod === 'ANNUAL' ? 'text-stone-800' : 'text-stone-400'}`}>Annual</span>
        </div>

        <div className="text-center">
          {plansLoading ? (
            <p className="text-sm text-stone-400">Loading…</p>
          ) : plan ? (
            <>
              <p className="text-2xl font-bold text-brand-600">
                {billingPeriod === 'ANNUAL' ? `${formatPrice(plan.annualPrice)}/yr` : `${formatPrice(plan.monthlyPrice)}/mo`}
              </p>
              {billingPeriod === 'ANNUAL' && calcSavingsPercent(plan.monthlyPrice, plan.annualPrice) > 0 && (
                <p className="text-xs text-green-600 font-medium">
                  ~{calcSavingsPercent(plan.monthlyPrice, plan.annualPrice)}% savings
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-stone-400">Plans unavailable</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Your name</label>
          <input type="text" className="input" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Subdomain</label>
          <div className="flex">
            <input
              type="text"
              className="input rounded-r-none"
              value={subdomain}
              onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="smith"
              minLength={3}
              required
            />
            <span className="px-4 py-3 bg-stone-100 border border-l-0 border-stone-200 rounded-r-xl text-sm text-stone-500">.babything.app</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Discount code <span className="text-stone-400 font-normal">(optional)</span></label>
          <input
            type="text"
            className="input"
            value={discountCode}
            onChange={e => setDiscountCode(e.target.value.toUpperCase().trim())}
            placeholder="SIXMONTHS"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Creating…' : `Create my subdomain`}
        </button>
        <button type="button" onClick={() => navigate('/')} className="btn-ghost w-full text-sm">
          ← Back
        </button>
      </form>
    </div>
  )
}
