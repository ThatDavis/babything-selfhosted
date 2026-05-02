import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import AffiliateScript from '../components/AffiliateScript'

const AFFILIATE_SIGNUP_URL = import.meta.env.VITE_AFFILIATE_SIGNUP_URL
const GITHUB_REPO_URL = import.meta.env.VITE_GITHUB_REPO_URL ?? 'https://github.com/ThatDavis/babything-selfhosted'
const DONATION_URL = import.meta.env.VITE_DONATION_URL

export default function LandingPage() {
  const navigate = useNavigate()
  const [annual, setAnnual] = useState(false)

  const [showSignIn, setShowSignIn] = useState(false)
  const [signInEmail, setSignInEmail] = useState('')
  const [signInLoading, setSignInLoading] = useState(false)
  const [signInError, setSignInError] = useState('')

  async function handleSignIn(e: FormEvent) {
    e.preventDefault()
    setSignInLoading(true)
    setSignInError('')
    try {
      const { subdomain } = await api.lookupTenant({ email: signInEmail })
      window.location.href = `https://${subdomain}.babything.app/login?email=${encodeURIComponent(signInEmail)}`
    } catch (err) {
      setSignInError(err instanceof Error ? err.message : 'Failed to find account')
    } finally {
      setSignInLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AffiliateScript />

      <header className="bg-white border-b border-stone-100">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-serif text-brand-600">Babything</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSignIn(true)} className="btn-ghost text-sm">Sign in</button>
            <button onClick={() => navigate('/signup')} className="btn-primary text-sm">Start free trial</button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-6 py-16 space-y-16">
        <section className="text-center space-y-6">
          <div className="text-5xl mb-2">🌿</div>
          <h2 className="text-4xl font-serif text-stone-800">Track everything about your baby.</h2>
          <p className="text-lg text-stone-500 max-w-2xl mx-auto">
            Feedings, diapers, sleep, growth, vaccines, medications, and milestones — all in one place.
            Share with caregivers in real time.
          </p>
          <button onClick={() => navigate('/signup')} className="btn-primary text-lg">
            Start your 14-day free trial
          </button>
        </section>

        <section className="grid md:grid-cols-3 gap-6">
          {[
            { icon: '⚡', title: 'Real-time sync', desc: 'All caregivers see updates instantly.' },
            { icon: '📄', title: 'PDF reports', desc: 'Branded summaries for pediatrician visits.' },
            { icon: '📥', title: 'CSV export', desc: 'Download all your data at any time.' },
            { icon: '💉', title: 'Vaccine tracking', desc: 'CDC schedule with due/overdue status.' },
            { icon: '🔒', title: 'Privacy first', desc: 'Your data stays on your subdomain, isolated.' },
            { icon: '📱', title: 'PWA ready', desc: 'Install on your phone like a native app.' },
          ].map(f => (
            <div key={f.title} className="card">
              <div className="text-2xl mb-2">{f.icon}</div>
              <h3 className="font-semibold text-stone-700">{f.title}</h3>
              <p className="text-sm text-stone-500 mt-1">{f.desc}</p>
            </div>
          ))}
        </section>

        <section className="text-center space-y-6">
          <h2 className="text-3xl font-serif text-stone-800">Simple pricing</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Cloud */}
            <div className="card">
              <div className="text-2xl mb-2">☁️</div>
              <h3 className="font-semibold text-stone-700 mb-2">Cloud</h3>
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className={`text-sm font-medium ${!annual ? 'text-stone-800' : 'text-stone-400'}`}>Monthly</span>
                <button
                  onClick={() => setAnnual(!annual)}
                  className="relative w-12 h-6 rounded-full bg-brand-200 transition-colors"
                  aria-label="Toggle annual billing"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-brand-600 transition-transform ${annual ? 'translate-x-6' : ''}`}
                  />
                </button>
                <span className={`text-sm font-medium ${annual ? 'text-stone-800' : 'text-stone-400'}`}>Annual</span>
              </div>

              {annual ? (
                <>
                  <p className="text-4xl font-serif text-brand-600">$77<span className="text-lg text-stone-500 font-normal">/yr</span></p>
                  <p className="text-sm text-green-600 mt-1 font-medium">~20% savings vs monthly</p>
                </>
              ) : (
                <>
                  <p className="text-4xl font-serif text-brand-600">$8<span className="text-lg text-stone-500 font-normal">/mo</span></p>
                  <p className="text-sm text-stone-500 mt-1">or $77/yr (~20% savings)</p>
                </>
              )}

              <ul className="text-sm text-stone-600 space-y-2 mt-4 text-left">
                <li>✓ Unlimited babies & caregivers</li>
                <li>✓ All tracking features</li>
                <li>✓ Automatic SSL & backups</li>
                <li>✓ Platform-managed email & sign-in</li>
                <li>✓ Private subdomain</li>
              </ul>
              <button onClick={() => navigate(`/signup?period=${annual ? 'annual' : 'monthly'}`)} className="btn-primary w-full mt-6">
                Start free trial
              </button>
            </div>

            {/* Self-hosted */}
            <div className="card">
              <div className="text-2xl mb-2">🏠</div>
              <h3 className="font-semibold text-stone-700 mb-2">Self-hosted</h3>
              <p className="text-4xl font-serif text-brand-600">Free</p>
              <p className="text-sm text-stone-500 mt-1">Run on your own hardware</p>

              <ul className="text-sm text-stone-600 space-y-2 mt-4 text-left">
                <li>✓ All tracking features</li>
                <li>✓ Unlimited babies & caregivers</li>
                <li>✓ Docker-based deployment</li>
                <li>✓ Own your data</li>
                <li>✓ Optional donation</li>
              </ul>
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost w-full text-center block mt-6"
              >
                View on GitHub →
              </a>
              {DONATION_URL && (
                <a
                  href={DONATION_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand-600 hover:text-brand-700 mt-3 inline-block"
                >
                  Support the project 🌱
                </a>
              )}
            </div>
          </div>
        </section>

        {AFFILIATE_SIGNUP_URL && (
          <section className="text-center space-y-4">
            <h2 className="text-2xl font-serif text-stone-800">Partner with us</h2>
            <p className="text-stone-500 max-w-xl mx-auto">
              Are you a blogger, pediatrician, or doula? Earn 20% recurring commission for every family you refer to Babything.
            </p>
            <a href={AFFILIATE_SIGNUP_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost inline-block">
              Become an affiliate →
            </a>
          </section>
        )}
      </main>

      <footer className="border-t border-stone-100 py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-stone-400">
          <p>© {new Date().getFullYear()} Babything</p>
          <div className="flex gap-6">
            {AFFILIATE_SIGNUP_URL && (
              <a href={AFFILIATE_SIGNUP_URL} target="_blank" rel="noopener noreferrer" className="hover:text-stone-600 transition-colors">
                Affiliates
              </a>
            )}
          </div>
        </div>
      </footer>

      {/* Sign-in modal */}
      {showSignIn && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-6 z-50" onClick={() => setShowSignIn(false)}>
          <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-serif text-stone-800">Sign in</h3>
            <p className="text-sm text-stone-500 mt-1">Enter your email and we'll send you to your subdomain.</p>
            {signInError && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg mt-3">{signInError}</p>}
            <form onSubmit={handleSignIn} className="mt-4 space-y-3">
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={signInEmail}
                onChange={e => setSignInEmail(e.target.value)}
                required
              />
              <button type="submit" disabled={signInLoading} className="btn-primary w-full">
                {signInLoading ? 'Looking up…' : 'Continue'}
              </button>
              <button type="button" onClick={() => setShowSignIn(false)} className="btn-ghost w-full text-sm">
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
