import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AffiliateScript from '../components/AffiliateScript'

const AFFILIATE_SIGNUP_URL = import.meta.env.VITE_AFFILIATE_SIGNUP_URL

export default function LandingPage() {
  const navigate = useNavigate()
  const [annual, setAnnual] = useState(false)

  return (
    <div className="min-h-screen flex flex-col">
      <AffiliateScript />

      <header className="bg-white border-b border-stone-100">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-brand-600">Babything</h1>
          <button onClick={() => navigate('/signup')} className="btn-primary text-sm">Start free trial</button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-6 py-16 space-y-16">
        <section className="text-center space-y-6">
          <h2 className="text-4xl font-bold text-stone-800">Track everything about your baby.</h2>
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
            { title: 'Real-time sync', desc: 'All caregivers see updates instantly.' },
            { title: 'PDF reports', desc: 'Branded summaries for pediatrician visits.' },
            { title: 'CSV export', desc: 'Download all your data at any time.' },
            { title: 'Vaccine tracking', desc: 'CDC schedule with due/overdue status.' },
            { title: 'Privacy first', desc: 'Your data stays on your subdomain, isolated.' },
            { title: 'PWA ready', desc: 'Install on your phone like a native app.' },
          ].map(f => (
            <div key={f.title} className="card">
              <h3 className="font-semibold text-stone-700">{f.title}</h3>
              <p className="text-sm text-stone-500 mt-1">{f.desc}</p>
            </div>
          ))}
        </section>

        <section className="text-center space-y-6">
          <h2 className="text-3xl font-bold text-stone-800">Simple pricing</h2>
          <div className="card max-w-sm mx-auto">
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
                <p className="text-4xl font-bold text-brand-600">$77<span className="text-lg text-stone-500 font-normal">/yr</span></p>
                <p className="text-sm text-green-600 mt-1 font-medium">~20% savings vs monthly</p>
              </>
            ) : (
              <>
                <p className="text-4xl font-bold text-brand-600">$8<span className="text-lg text-stone-500 font-normal">/mo</span></p>
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
        </section>

        {AFFILIATE_SIGNUP_URL && (
          <section className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-stone-800">Partner with us</h2>
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
            <a href="/account" className="hover:text-stone-600 transition-colors">Account</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
