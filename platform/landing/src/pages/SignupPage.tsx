import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export default function SignupPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ subdomain: string; trialEndsAt: string } | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api.provision({ email, name, subdomain })
      setResult({ subdomain: res.tenant.subdomain, trialEndsAt: res.trialEndsAt })
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
          <h2 className="text-2xl font-bold text-stone-800">You're all set!</h2>
          <p className="text-stone-600">
            Your family subdomain is <strong className="text-brand-600">{result.subdomain}.babything.app</strong>
          </p>
          <p className="text-sm text-stone-500">
            Your 14-day free trial ends on {new Date(result.trialEndsAt).toLocaleDateString()}.
          </p>
          <a href={`https://${result.subdomain}.babything.app`} className="btn-primary w-full inline-block">
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
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Creating…' : 'Create my subdomain'}
        </button>
        <button type="button" onClick={() => navigate('/')} className="btn-ghost w-full text-sm">
          ← Back
        </button>
      </form>
    </div>
  )
}
