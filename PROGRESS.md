# Babything — Build Progress

> What has been built and what's next.
>
> Last updated: 2026-05-02
>
> - Feature specs: `REQUIREMENTS.md`
> - Architecture & subscription plan: `SUBSCRIPTION_ROADMAP.md`
> - Git workflow: `DEVELOPMENT.md`

---

## Current Status

**Phase 5 — Growth & Hardening (In Progress)**

Building advanced features and hardening the platform.

**Current feature:** Monitor v2 for cloud (WebRTC)

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

## Phase 4 — Cloud Infrastructure ✅ Complete

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
- [x] Self-hosted → cloud data migration (JSON bundle import)

---

## Phase 5 — Growth & Hardening (In Progress)

- [x] Replace shared API key with mTLS between services
- [x] Annual plan promotion
- [x] ~~Referral program~~ → Replaced by discount codes
- [x] Discount code system
  - [x] `DiscountCode` model: `FREE_TIME` and `PERCENTAGE` types
  - [x] Operator dashboard: create, list, delete discount codes
  - [x] Landing signup: discount code input with validation
  - [x] Provisioning service: validate via internal API, apply to Stripe subscription
  - [x] Sample codes: `SIXMONTHS` (180 days free), `YEARLY20` (20% off annual)
- [x] Affiliate program
- [x] Replace Traefik with external reverse proxy support
  - [x] Remove Traefik from docker-compose.cloud.yml
  - [x] Add explicit Docker networks (frontend/backend)
  - [x] Create cloud nginx config with subdomain + path routing
  - [x] Fix api/web routing conflict (path-prefix API routes)
  - [x] Update .env.example (remove ACME/Traefik vars, add proxy vars)
  - [x] Update DEPLOYMENT.md with new cloud deploy instructions
  - [x] Update REQUIREMENTS.md tech stack
- [x] Operator Dashboard v2 (cross-tenant management UI)
  - [x] Operator schema: `Operator` table with roles (`helpdesk`, `accounting`, `global_admin`)
  - [x] Operator auth: separate login/logout, JWT middleware, `requireOperatorAuth`
  - [x] Audit log schema & middleware (`AuditLog` table: operatorId, action, target, oldValue, newValue)
  - [x] Dashboard UI: tenant table with status, trials, user/baby counts
  - [x] Role-based access control on API routes
    - `helpdesk`: read-only tenant list & details
    - `accounting`: extend trials, modify billing status
    - `global_admin`: all actions + manage operators + view audit logs
  - [x] Management actions: suspend/activate tenant, extend trial, delete tenant
  - [~] Security: rate limiting on operator endpoints (via existing authLimiter), optional IP allowlist — TBD
- [x] Landing page sign-in: email-to-subdomain lookup + modal + remove footer Account link
- [x] Fix tenant deletion to clean up provisioning DB (free subdomain + email for reuse)
- [x] Email templates + welcome email
  - [x] `EmailTemplate` model with `name`, `subject`, `htmlBody`
  - [x] Mailer uses DB templates with `{{variable}}` substitution, falls back to hardcoded defaults
  - [x] Welcome email sent on user registration
  - [x] Operator dashboard: edit/reset templates for welcome, invite, password reset, report
- [x] Operator section permissions
  - [x] `SECTION_PERMISSIONS` config maps each dashboard section to allowed roles
  - [x] `GET /operator/auth/permissions` returns accessible sections for current operator
  - [x] Frontend renders tabs based on permissions; global_admin bypasses all checks
  - [x] Unassigned sections are inaccessible to everyone except global_admin
- [x] Cloud email delivery (Resend)
  - [x] Mailer uses Resend API when `RESEND_API_KEY` is set
  - [x] Falls back to SMTP config for self-hosted mode
  - [x] `FROM_EMAIL` and `FROM_NAME` env vars for sender identity
- [x] Email template test send
  - [x] API endpoint: `POST /operator/dashboard/email-templates/:name/test`
  - [x] Operator dashboard: test email input + send button in Templates tab
- [x] Nordic theming refresh
  - [x] Landing page: serif fonts, emojis, sage palette
  - [x] Web app: sage brand palette, serif headings
  - [x] Update chart colors to match new palette
- [x] Operator pricing control
  - [x] `Plan` model: name, description, monthly/annual prices, Stripe price IDs, features, active flag
  - [x] Operator dashboard: Pricing tab with CRUD for plans
  - [x] `ACCOUNTING` role has full access (create, update, delete) by default
  - [x] Internal API: `/internal/plans` for provisioning service to read dynamic price IDs
  - [x] Provisioning service fetches Stripe price IDs from plan catalog, falls back to env vars
  - [x] Landing page sync: fetch active plans from public API instead of hardcoded prices (PR #18)
- [x] Repo split: cloud vs self-hosted
  - [x] Harden `babything-cloud` repo — remove self-hosted artifacts, hardcode cloud mode
  - [x] Create `babything-selfhosted` fork — strip cloud-only code, hardcode self-hosted mode
  - [x] Fork-and-sync workflow documented with upstream remote
  - [x] Self-hosted fork gets dedicated GHCR image builds (`babything-selfhosted-api`, `-web`)
- [x] Caregiver invite emails — frontend confirmation
  - [x] API returns `emailSent` status in invite response
  - [x] BabySettings shows "Invite sent to {email} ✓" when email delivers
  - [x] Falls back to manual link copy when email isn't configured
- [x] Landing page values section
  - [x] "Built for families, not for data" section with privacy + sustainability messaging
  - [x] Self-hosted card now mentions Raspberry Pi
  - [x] Privacy first feature card updated copy
- [x] Legal pages
  - [x] Terms of Service page (`/terms`) — privacy-focused, data deletion policy
  - [x] GDPR Compliance page (`/gdpr`) — rights, retention, processors, complaints
  - [x] Footer links on landing page
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
| Phase 5 — Growth | 🔵 In Progress | 17/19 | 2 |

---

## How to Resume

1. Read `REQUIREMENTS.md` for feature specs
2. Read `SUBSCRIPTION_ROADMAP.md` for cloud architecture decisions
3. Read `DEVELOPMENT.md` for git workflow standards
4. Check git log for recent commits
5. Pick up from the first unchecked item above
