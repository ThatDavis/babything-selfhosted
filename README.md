# babything-cloud

A newborn tracking app for families and caregivers. Log feedings, diapers, sleep, growth, medications, vaccines, and milestones. Share access with partners, grandparents, or anyone helping care for the baby.

**This is the cloud/SaaS repository.** For the free self-hosted version, see [`babything-selfhosted`](https://github.com/ThatDavis/babything-selfhosted).

---

## Features

- **Feeding** — breast (with timer and side) or bottle (amount, milk type)
- **Diapers** — wet, dirty, both, or dry; color and notes
- **Sleep** — naps and overnight sleep with location and duration
- **Growth** — weight, length, and head circumference with trend charts
- **Medications** — dose tracking with common medication shortcuts
- **Vaccines** — full immunization record linked to appointments
- **Appointments** — doctor visits with notes and attached vaccines
- **Milestones** — custom milestone log with dates and descriptions
- **Activity feed** — unified timeline of all recent events
- **Dashboard charts** — feedings, diapers, sleep, and weight trend over time
- **PDF reports** — branded summary you can download or email directly to a pediatrician
- **CSV export** — download a ZIP of all event data, filterable by date range
- **Multi-caregiver** — invite others by email; owner/caregiver roles
- **Real-time sync** — changes appear instantly on all open devices
- **Metric or imperial** — switch units globally from admin settings
- **PWA** — installable on iOS and Android as a home-screen app
- **Google OAuth** — platform-managed sign-in

---

## Cloud / SaaS

Babything runs as a multi-tenant SaaS with:
- Custom subdomains (`yourfamily.babything.app`)
- Stripe subscription billing (monthly & annual plans)
- 14-day free trial (no credit card required)
- Automated SSL via external reverse proxy
- Platform-managed email delivery (Resend)
- Referral program ("give a week, get a week")
- Affiliate program integration

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for full cloud deployment instructions.

---

## Self-Hosted

Want to run Babything on your own hardware for free? Use the [`babything-selfhosted`](https://github.com/ThatDavis/babything-selfhosted) repository.

---

## Tech stack

| Layer | What |
|-------|------|
| API | Node.js, Express, TypeScript, Prisma |
| Database | PostgreSQL (app), SQLite (provisioning) |
| Frontend | React, Vite, Tailwind CSS |
| Real-time | Socket.io |
| Reverse proxy | Nginx (behind external TLS proxy) |
| Deployment | Docker Compose |
