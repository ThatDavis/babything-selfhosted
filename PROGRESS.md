# Babything — Build Progress

> What has been built and what's next.
>
> - Feature specs: `REQUIREMENTS.md`
> - Architecture & subscription plan: `SUBSCRIPTION_ROADMAP.md`
> - Git workflow: `DEVELOPMENT.md`

---

## Current Status

**Phase 5 — Growth & Hardening (In Progress)**

Building advanced features and hardening the platform.

**Current feature:** mTLS between services

---

## Completed Phases

### Phase 1 — Core MVP ✓

- [x] Docker Compose setup (Postgres + API + Nginx + Web)
- [x] Auth: register, login, JWT middleware, invite links
- [x] Baby profiles with caregiver roles (Owner / Caregiver)
- [x] Event logging: feedings, diapers, sleep
- [x] At-a-glance dashboard cards
- [x] Mobile-first UI with quick-log bottom sheets
- [x] Responsive desktop layout (sidebar + pill nav)
- [x] First-run setup wizard

### Phase 2 — Full Tracking + Dashboard ✓

- [x] Growth, medications, milestones, appointments, vaccines
- [x] CDC vaccination schedule with due/overdue/complete status
- [x] Dashboard charts (recharts): feeds 24h, diapers 7d, sleep 7d, weight trend
- [x] Recent activity feed with filtering
- [x] Unit preference toggle (metric / imperial)
- [x] PDF pediatric report generation

### Phase 3 — Polish & Sharing ✓

- [x] PWA manifest + icons
- [x] Real-time sync via Socket.io
- [x] CSV export (ZIP with one CSV per event type, date range filter)
- [x] Email via SMTP (Nodemailer) — invites, password resets, reports
- [x] OAuth — Google (dedicated Passport.js strategy)
- [ ] ~~OAuth — Apple~~ — Deferred to post-launch
- [ ] ~~Photo uploads for milestones~~ — Out of scope

---

## Phase 4 — Cloud Infrastructure (In Progress)

### Schema & Multi-Tenancy

- [x] Add `Tenant` model to Prisma schema
- [x] Add `tenantId` to `User`, `Baby`, and all event tables
- [x] Refactor `SystemSettings` to be per-tenant
- [x] Implement PostgreSQL RLS policies for tenant isolation
- [x] Add tenant resolution middleware (subdomain → tenant lookup)

### Mode Switch

- [x] `DEPLOYMENT_MODE=selfhosted|cloud` environment variable
- [x] Self-hosted mode: preserves current behavior (global settings)
- [x] Cloud mode: tenant-scoped queries, no SMTP config, no monitor tab

### Provisioning Service

- [x] Provisioning service scaffold (`platform/provisioning/`)
- [x] Prisma schema: `Customer`, `TenantSubscription`
- [x] Stripe webhook handlers: checkout, invoice, cancellation
- [x] Internal API: push tenant creation/status to main app
- [x] Redis cache for tenant status lookups

### Landing & Customer Dashboard

- [x] Landing page with pricing
- [x] Signup flow: email → subdomain → provision
- [x] Customer dashboard: manage subscription, update payment, cancel, export data
- [x] Platform-managed Google OAuth with subdomain callback routing

### Operations

- [x] Traefik reverse proxy with wildcard SSL
- [x] Automated nightly backups (pg_dump to S3)
- [~] Operator dashboard for monitoring tenants — API exists (`GET /admin/tenants`), UI needed
- [x] Self-hosted → cloud data migration (JSON bundle import)

---

## Phase 5 — Growth & Hardening (Planned)

- [x] Replace shared API key with mTLS between services
- [x] Annual plan promotion
- [x] Referral program
- [x] Affiliate program
- [x] Replace Traefik with external reverse proxy support
  - [x] Remove Traefik from docker-compose.cloud.yml
  - [x] Add explicit Docker networks (frontend/backend)
  - [x] Create cloud nginx config with subdomain + path routing
  - [x] Fix api/web routing conflict (path-prefix API routes)
  - [x] Update .env.example (remove ACME/Traefik vars, add proxy vars)
  - [x] Update DEPLOYMENT.md with new cloud deploy instructions
  - [x] Update REQUIREMENTS.md tech stack
- [ ] Operator Dashboard v2 (cross-tenant management UI)
  - [ ] Operator role & permission system (separate from tenant admin)
  - [ ] Audit log schema & middleware (who did what, when)
  - [ ] Dashboard UI: tenant table with status, trials, user/baby counts
  - [ ] Management actions: suspend/activate tenant, extend trial
  - [ ] Security: strong auth, rate limiting, IP allowlist option
- [ ] Monitor v2 for cloud (WebRTC)
- [ ] Multi-region deployment

---

## Quick Stats

| Phase | Status | Completed | Remaining |
|-------|--------|-----------|-----------|
| Phase 1 — Core MVP | ✅ Complete | 8/8 | 0 |
| Phase 2 — Full Tracking | ✅ Complete | 7/7 | 0 |
| Phase 3 — Polish | ✅ Complete | 5/5 | 0 |
| Phase 4 — Cloud | ✅ Complete | 13/13 | 0 |
| Phase 5 — Growth | 🔵 In Progress | 0/9 | 9 |

---

## How to Resume

1. Read `REQUIREMENTS.md` for feature specs
2. Read `SUBSCRIPTION_ROADMAP.md` for cloud architecture decisions
3. Read `DEVELOPMENT.md` for git workflow standards
4. Check git log for recent commits
5. Pick up from the first unchecked item above
