import { Link } from 'react-router-dom'

export default function GdprPage() {
  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <header className="bg-white border-b border-stone-100">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-serif text-brand-600">Babything</Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-serif text-stone-800 mb-2">GDPR Compliance</h1>
        <p className="text-sm text-stone-400 mb-8">Last updated: May 2, 2026</p>

        <div className="space-y-8 text-stone-600">
          <section>
            <h2 className="text-lg font-semibold text-stone-700 mb-2">Data Controller</h2>
            <p className="text-sm leading-relaxed">
              Babything operates as the data controller for cloud-hosted accounts. For self-hosted instances, you are the data controller and we do not process your data.
            </p>
            <p className="text-sm leading-relaxed mt-2">
              Contact: <a href="mailto:hello@babything.app" className="text-brand-600 hover:underline">hello@babything.app</a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-700 mb-2">What Data We Collect</h2>
            <p className="text-sm leading-relaxed">
              We collect only the data necessary to provide the Babything service:
            </p>
            <ul className="text-sm leading-relaxed mt-2 space-y-1 list-disc list-inside">
              <li>Account information: name, email address</li>
              <li>Baby profiles: name, date of birth, sex</li>
              <li>Tracking data: feedings, diapers, sleep, growth, vaccines, medications, milestones, appointments — entered by you</li>
              <li>Billing information: handled exclusively by Stripe; we do not store payment details</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-700 mb-2">Legal Basis for Processing</h2>
            <p className="text-sm leading-relaxed">
              We process your data on the basis of <strong>contractual necessity</strong> — we need this information to provide the Babything service to you. We do not process your data for any other purpose.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-700 mb-2">Data Retention</h2>
            <p className="text-sm leading-relaxed">
              We retain your data only for as long as your account is active. When you delete your account, all personal data is permanently removed from our active systems within 30 days. Backup retention may extend up to 30 days before automatic purging.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-700 mb-2">Your Rights</h2>
            <p className="text-sm leading-relaxed">
              Under GDPR, you have the following rights:
            </p>
            <ul className="text-sm leading-relaxed mt-2 space-y-1 list-disc list-inside">
              <li><strong>Right to access</strong> — Request a copy of all data we hold about you</li>
              <li><strong>Right to rectification</strong> — Correct inaccurate or incomplete data</li>
              <li><strong>Right to erasure</strong> — Delete your account and all associated data</li>
              <li><strong>Right to data portability</strong> — Export your data in CSV format at any time</li>
              <li><strong>Right to restrict processing</strong> — Temporarily limit how we use your data</li>
              <li><strong>Right to object</strong> — Object to data processing (though this may require account closure)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-700 mb-2">How to Exercise Your Rights</h2>
            <p className="text-sm leading-relaxed">
              Most requests can be handled directly through the app: use <strong>Settings → Export Data</strong> for data portability, or <strong>Account → Delete Account</strong> for erasure. For other requests, email us at <a href="mailto:hello@babything.app" className="text-brand-600 hover:underline">hello@babything.app</a> and we will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-700 mb-2">Security Measures</h2>
            <p className="text-sm leading-relaxed">
              We use industry-standard security practices: encrypted data transmission (TLS), encrypted data at rest, tenant isolation via PostgreSQL row-level security, and regular security updates. Access to production data is strictly limited and logged.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-700 mb-2">Data Processors</h2>
            <p className="text-sm leading-relaxed">
              We use the following subprocessors to provide the cloud service:
            </p>
            <ul className="text-sm leading-relaxed mt-2 space-y-1 list-disc list-inside">
              <li><strong>Stripe</strong> — Payment processing (billing data only)</li>
              <li><strong>Hetzner / Cloudflare</strong> — Infrastructure and CDN (EU-based where possible)</li>
            </ul>
            <p className="text-sm leading-relaxed mt-2">
              We do not share your tracking data or personal information with any other third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-stone-700 mb-2">Complaints</h2>
            <p className="text-sm leading-relaxed">
              If you believe we are not handling your data in accordance with GDPR, you have the right to lodge a complaint with your local supervisory authority. We encourage you to contact us first at <a href="mailto:hello@babything.app" className="text-brand-600 hover:underline">hello@babything.app</a> so we can resolve any issue directly.
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
