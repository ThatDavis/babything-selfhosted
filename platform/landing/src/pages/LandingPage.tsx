import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-stone-100">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-brand-600">Babything</h1>
          <button onClick={() => navigate('/signup')} className="btn-primary text-sm">Start free trial</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 space-y-16">
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
            <p className="text-4xl font-bold text-brand-600">$8<span className="text-lg text-stone-500 font-normal">/mo</span></p>
            <p className="text-sm text-stone-500 mt-1">or $77/yr (~20% savings)</p>
            <ul className="text-sm text-stone-600 space-y-2 mt-4 text-left">
              <li>✓ Unlimited babies & caregivers</li>
              <li>✓ All tracking features</li>
              <li>✓ Automatic SSL & backups</li>
              <li>✓ Platform-managed email & sign-in</li>
              <li>✓ Private subdomain</li>
            </ul>
            <button onClick={() => navigate('/signup')} className="btn-primary w-full mt-6">Start free trial</button>
          </div>
        </section>
      </main>
    </div>
  )
}
