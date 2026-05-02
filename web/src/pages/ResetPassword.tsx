import { useState, useEffect, FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, ApiError } from '../lib/api'

export default function ResetPassword() {
  const { token } = useParams<{ token: string }>()
  const [email, setEmail] = useState('')
  const [valid, setValid] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) { setValid(false); return }
    api.auth.checkResetToken(token)
      .then(r => { setValid(r.valid); setEmail(r.email) })
      .catch(() => setValid(false))
  }, [token])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true); setError('')
    try {
      await api.auth.resetPassword(token!, password)
      setDone(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally { setLoading(false) }
  }

  if (valid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-brand-50 to-stone-50">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-serif text-center mb-2 text-brand-600">babything</h1>
        <p className="text-center text-stone-500 mb-8">Set a new password</p>

        {!valid ? (
          <div className="card text-center space-y-3">
            <p className="text-2xl">⛔</p>
            <p className="font-medium">Link expired or invalid</p>
            <p className="text-stone-500 text-sm">This reset link has expired or already been used.</p>
            <Link to="/forgot-password" className="block text-brand-600 text-sm font-medium">Request a new link</Link>
          </div>
        ) : done ? (
          <div className="card text-center space-y-3">
            <p className="text-2xl">✅</p>
            <p className="font-medium">Password updated</p>
            <p className="text-stone-500 text-sm">Your password has been changed. You can now sign in.</p>
            <Link to="/login" className="block text-brand-600 text-sm font-medium">Sign in</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-4">
            {email && <p className="text-sm text-stone-500 text-center">Resetting password for <strong>{email}</strong></p>}
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <div>
              <label className="block text-sm font-medium mb-1">New password</label>
              <input className="input" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Confirm password</label>
              <input className="input" type="password" autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} />
            </div>
            <button className="btn-primary w-full" type="submit" disabled={loading}>
              {loading ? 'Saving…' : 'Set new password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
