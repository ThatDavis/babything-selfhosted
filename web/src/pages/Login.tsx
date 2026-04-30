import { useState, useEffect, FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import type { OAuthProvider } from '../lib/api'
import { useAuth } from '../lib/auth'

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const urlError = searchParams.get('error')
  const [error, setError] = useState(urlError === 'oauth' ? 'Google sign-in failed. Please try again.' : '')
  const [loading, setLoading] = useState(false)
  const [oauthProviders, setOauthProviders] = useState<OAuthProvider[]>([])
  const [googleEnabled, setGoogleEnabled] = useState(false)

  useEffect(() => {
    api.auth.oauthProviders().then(setOauthProviders).catch(() => {})
    api.auth.config().then(c => setGoogleEnabled(c.googleEnabled)).catch(() => {})
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

        {(googleEnabled || oauthProviders.length > 0) && (
          <div className="space-y-2 mb-4">
            {googleEnabled && (
              <button onClick={() => { window.location.href = '/api/auth/oauth/google/start' }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors shadow-sm">
                <GoogleIcon />
                Sign in with Google
              </button>
            )}
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
