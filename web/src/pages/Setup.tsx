import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'

type Step = 'account' | 'baby' | 'done'

export default function Setup() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('account')

  // Account fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Baby fields
  const [babyName, setBabyName] = useState('')
  const [dob, setDob] = useState('')
  const [sex, setSex] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function createAccount(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { user } = await api.auth.register({ name, email, password })
      login(user)
      setStep('baby')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function createBaby(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (new Date(dob) > new Date()) { setError("Date of birth can't be in the future"); return }
    setLoading(true)
    try {
      await api.babies.create({ name: babyName, dob: new Date(dob).toISOString(), sex: sex || undefined })
      setStep('done')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const steps: Step[] = ['account', 'baby', 'done']
  const stepIdx = steps.indexOf(step)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-brand-50 to-stone-50">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <h1 className="text-3xl font-serif text-center mb-1 text-brand-600">babything</h1>
        <p className="text-center text-stone-500 mb-8 text-sm">First-time setup</p>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.filter(s => s !== 'done').map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${i <= stepIdx - (step === 'done' ? 0 : 0) || step === 'done' || (step === 'baby' && i === 0) ? 'bg-brand-500 text-white' : 'bg-stone-200 text-stone-500'}`}>
                {i + 1}
              </div>
              {i < steps.filter(s => s !== 'done').length - 1 && (
                <div className={`h-0.5 w-8 rounded transition-colors ${step === 'baby' || step === 'done' ? 'bg-brand-400' : 'bg-stone-200'}`} />
              )}
            </div>
          ))}
        </div>

        {step === 'account' && (
          <form onSubmit={createAccount} className="card space-y-4">
            <div>
              <h2 className="text-lg font-serif mb-1">Create your account</h2>
              <p className="text-sm text-stone-500">You'll be the owner and can invite caregivers later.</p>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div>
              <label className="block text-sm font-medium mb-1">Your name</label>
              <input className="input" type="text" autoComplete="name" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alex" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input className="input" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password <span className="text-stone-400 font-normal">(8+ chars)</span></label>
              <input className="input" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button className="btn-primary w-full" type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Continue →'}
            </button>
          </form>
        )}

        {step === 'baby' && (
          <form onSubmit={createBaby} className="card space-y-4">
            <div>
              <h2 className="text-lg font-serif mb-1">Add your baby</h2>
              <p className="text-sm text-stone-500">You can add more babies and caregivers from the app.</p>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div>
              <label className="block text-sm font-medium mb-1">Baby's name</label>
              <input className="input" type="text" required value={babyName} onChange={e => setBabyName(e.target.value)} placeholder="e.g. Olivia" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date of birth</label>
              <input className="input" type="date" required value={dob} onChange={e => setDob(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sex <span className="text-stone-400 font-normal">(optional)</span></label>
              <select className="input" value={sex} onChange={e => setSex(e.target.value)}>
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button className="btn-primary w-full" type="submit" disabled={loading}>
              {loading ? 'Adding…' : 'Continue →'}
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="card text-center space-y-4">
            <div className="text-5xl">🎉</div>
            <h2 className="text-xl font-serif">You're all set!</h2>
            <p className="text-stone-500 text-sm">
              Start logging feedings, diapers, and sleep. Invite your partner from the settings menu once you're in.
            </p>
            <button className="btn-primary w-full" onClick={() => navigate('/')}>
              Go to app →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
