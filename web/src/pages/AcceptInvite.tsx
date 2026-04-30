import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [info, setInfo] = useState<{ babyName: string; role: string } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    api.auth.getInvite(token!)
      .then(d => setInfo({ babyName: d.babyName, role: d.role }))
      .catch(err => setError(err instanceof ApiError ? err.message : 'Invalid invite'))
      .finally(() => setLoading(false))
  }, [token])

  async function accept() {
    setAccepting(true)
    try {
      const { babyId } = await api.auth.acceptInvite(token!)
      navigate(`/?baby=${babyId}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not accept invite')
      setAccepting(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-400 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-brand-50 to-stone-50">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-8 text-brand-600">babything</h1>
        <div className="card text-center space-y-4">
          {error ? (
            <p className="text-red-500">{error}</p>
          ) : (
            <>
              <p className="text-lg font-semibold">You've been invited to care for <span className="text-brand-600">{info?.babyName}</span></p>
              <p className="text-stone-500 text-sm">Role: {info?.role}</p>
              {user ? (
                <button className="btn-primary w-full" onClick={accept} disabled={accepting}>
                  {accepting ? 'Accepting…' : 'Accept invite'}
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-stone-500 text-sm">Sign in or create an account to accept this invite.</p>
                  <Link to={`/login?redirect=/invite/${token}`} className="btn-primary w-full block">Sign in</Link>
                  <Link to={`/register?redirect=/invite/${token}`} className="btn-ghost w-full block">Create account</Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
