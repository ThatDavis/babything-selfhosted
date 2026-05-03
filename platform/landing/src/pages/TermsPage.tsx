import { Link } from 'react-router-dom'

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <header className="bg-white border-b border-stone-100">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-serif text-brand-600">Babything</Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-serif text-stone-800 mb-2">Terms of Service</h1>
        <p className="text-sm text-stone-400 mb-8">Last updated: May 2, 2026</p>

        <div className="space-y-8 text-stone-600">
          <section>
            <h2 className="text-lg font-semibold text-stone-700 mb-2">1. What Babything Is</h2>
            <p className="text-sm leading-relaxed">
              Babything is a newborn tracking application that helps families log feedings, diapers, sleep, growth, vaccines, medications, and milestones. We offer a cloud-hosted subscription service and a free, open-source self-hosted version.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-700 mb-2">2. Your Data Is Yours</h2>
            <p className="text-sm leading-relaxed">
              We do not sell, rent, share, or otherwise monetize your data. We do not use your data to train AI models, build advertising profiles, or share it with third parties. The only thing we do with your data is store it securely so you can access it through the Babything app.
            </p>
            <p className="text-sm leading-relaxed mt-2">
              If you use the self-hosted version, your data never leaves your own server. If you use the cloud version, your data is stored on our servers solely for the purpose of providing the service to you.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-700 mb-2">3. Account Termination & Data Deletion</h2>
            <p className="text-sm leading-relaxed">
              You can delete your account and all associated data at any time. When you delete your account, we permanently remove your data from our active systems. Backups may retain data for up to 30 days, after which it is permanently purged.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-700 mb-2">4. What We Expect From You</h2>
            <p className="text-sm leading-relaxed">
              Do not use Babything for anything illegal or abusive. Do not attempt to access other users' accounts or data. We reserve the right to suspend or terminate accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-700 mb-2">5. Limitations</h2>
            <p className="text-sm leading-relaxed">
              Babything is provided as-is. While we work hard to keep the service reliable and secure, we cannot guarantee uninterrupted availability. We are not liable for any loss of data — we recommend exporting your data periodically using the built-in CSV export feature.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-700 mb-2">6. Changes to These Terms</h2>
            <p className="text-sm leading-relaxed">
              We may update these terms from time to time. If we make material changes, we will notify you via email or through the app. Continued use of Babything after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-700 mb-2">7. Contact</h2>
            <p className="text-sm leading-relaxed">
              Questions about these terms? Contact us at <a href="mailto:hello@babything.app" className="text-brand-600 hover:underline">hello@babything.app</a>.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-stone-100 py-8">
        <div className="max-w-5xl mx-auto px-6 text-sm text-stone-400">
          <p>© {new Date().getFullYear()} Babything</p>
        </div>
      </footer>
    </div>
  )
}
