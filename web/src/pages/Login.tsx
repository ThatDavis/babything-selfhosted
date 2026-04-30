import { useState, useEffect, FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import type { OAuthProvider } from '../lib/api'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthProviders, setOauthProviders] = useState<OAuthProvider[]>([])

  useEffect(() => {
    api.auth.oauthProviders().then(setOauthProviders).catch(() => {})
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
        const { user } = await api.auth.login({ email, password })
        login(user)
        navigate(redirectTo, { replace: true })
      } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function startOAuth(name: string) {
    window.location.href = `/api/auth/oauth/${name}/start`
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-brand-50 to-stone-50">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-2 text-brand-600">babything</h1>
        <p className="text-center text-stone-500 mb-8">Track your newborn together</p>

        {oauthProviders.length > 0 && (
          <div className="space-y-2 mb-4">
            {oauthProviders.map(p => (
              <button key={p.id} onClick={() => startOAuth(p.name)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors shadow-sm">
                {p.label}
              </button>
            ))}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-stone-200" />
              <span className="text-xs text-stone-400">or</span>
              <div className="flex-1 h-px bg-stone-200" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input className="input" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input className="input" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-xs text-stone-400 hover:text-brand-600 transition-colors">Forgot password?</Link>
          </div>
          <button className="btn-primary w-full" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-stone-500 mt-6">
          No account? <Link to={redirectTo !== '/' ? `/register?redirect=${encodeURIComponent(redirectTo)}` : '/register'} className="text-brand-600 font-medium">Create one</Link>
        </p>
      </div>
    </div>
  )
}
