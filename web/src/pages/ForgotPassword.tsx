import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../lib/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await api.auth.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-brand-50 to-stone-50">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-serif text-center mb-2 text-brand-600">babything</h1>
        <p className="text-center text-stone-500 mb-8">Reset your password</p>

        {sent ? (
          <div className="card text-center space-y-3">
            <p className="text-2xl">📬</p>
            <p className="font-medium">Check your email</p>
            <p className="text-stone-500 text-sm">If an account exists for {email}, we sent a reset link. It expires in 1 hour.</p>
            <Link to="/login" className="block text-brand-600 text-sm font-medium mt-2">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-4">
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <div>
              <label className="block text-sm font-medium mb-1">Email address</label>
              <input className="input" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <button className="btn-primary w-full" type="submit" disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <p className="text-center text-sm text-stone-400">
              <Link to="/login" className="text-brand-600 font-medium">Back to sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
