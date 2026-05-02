# Babything — Subscription Service Roadmap

> How to evolve from a free self-hosted project into a dual-revenue product:
> **free open-source self-hosting** + **subscription cloud hosting**.
>
> This roadmap reflects the architecture decisions made during planning.
> It favors pragmatic, low-complexity choices that a solo operator can ship
> and maintain.

---

## Executive Summary

Babything stays **open core and free for self-hosters**. Revenue comes
exclusively from a **subscription cloud offering** built on the same codebase.

The cloud version is a **true multi-tenant SaaS** running on a shared
infrastructure stack. Each family gets their own subdomain (`smith.babything.app`)
and isolated data enforced by **PostgreSQL Row-Level Security (RLS)**.

A lightweight **provisioning service** handles Stripe billing and tenant
lifecycle, communicating with the main app via an internal API.

---

## Business Model

### 1. Self-Hosted (Free / Donation)

| Attribute | Detail |
|-----------|--------|
| **Price** | Free. Optional donation / "pay what you want" |
| **Includes** | Full source code, all features, run on your own hardware |
| **Requirements** | Docker on a local machine, NAS, Raspberry Pi, or VPS |
| **Support** | Community (Discord/forum) + documentation |

**Value proposition:** Own your data completely. No subscription. Run it forever.
Self-hosters become advocates who recommend the cloud offering to
non-technical friends and family.

### 2. Cloud Hosting (Subscription)

| Plan | Monthly | Annual | Savings |
|------|---------|--------|---------|
| **Flat Rate** | $8/mo | $77/yr | ~20% |

**Includes:**
- Private subdomain (`yourfamily.babything.app`)
- All tracking features (feedings, diapers, sleep, growth, meds, vaccines, milestones, appointments, PDF reports)
- Unlimited babies and caregivers
- Automatic SSL, backups, and updates
- Platform-managed Google OAuth sign-in
- Email delivery (invites, password resets, reports) handled by us

**Not included in v1:**
- Baby monitor (RTSP streaming requires local network camera access)
- Per-tenant custom SMTP or OAuth providers

### 3. Trial Strategy

- **14-day free trial**, no credit card required.
- Full read/write access during trial.
- On expiry: tenant enters **read-only mode** (view and export data, no new logs).
- **30-day retention** after expiry, then automatic hard deletion.
- Daily reminder emails on day 7 and day 13.

---

## Architecture Overview

### Single Codebase, Dual Mode

The existing `api/` and `web/` support both deployment modes via an environment
variable:

```env
DEPLOYMENT_MODE=selfhosted   # or "cloud"
```

- **Self-hosted mode:** Behaves exactly as it does today. First registered user
  becomes admin. Global `SystemSettings`, `SmtpConfig`, `OAuthProvider` tables.
- **Cloud mode:** Multi-tenant. Subdomain-based tenant resolution. Per-tenant
  settings. Platform-managed email and OAuth. No monitor tab. No SMTP config UI.

### High-Level Cloud Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Your VPS / Server                       │
│                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │   Traefik   │────►│  Main App   │────►│  Postgres   │   │
│  │  (reverse)  │     │  (api+web)  │     │  (tenants)  │   │
│  │   + HTTPS   │     └──────┬──────┘     └─────────────┘   │
│  └─────────────┘            │                               │
│                             ▼                               │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │  Landing    │────►│Provisioning │────►│  Postgres   │   │
│  │  + Customer │     │  Service    │     │(billing)    │   │
│  │  Dashboard  │     └──────┬──────┘     └─────────────┘   │
│  └─────────────┘            │                               │
│                             ▼                               │
│  ┌─────────────┐     ┌─────────────┐                        │
│  │   Redis     │◄────│   Stripe    │                        │
│  │   (cache)   │     │  (billing)  │                        │
│  └─────────────┘     └─────────────┘                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Service Responsibilities

| Service | Owns | Stack |
|---------|------|-------|
| **Main App** (`api` + `web`) | Runtime: users, babies, events, real-time sync, PDF reports, email delivery (cloud), Google OAuth callback handling | Node.js + Express + Prisma + React + Vite |
| **Provisioning Service** | Stripe webhooks, tenant lifecycle, subscription state, customer record, pushing tenant creation/status to main app | Node.js + Express + Prisma + SQLite (or shared Postgres) |
| **Landing + Customer Dashboard** | Marketing site, pricing, trial signup, Stripe Checkout, subscription management (update card, cancel, export data) | React / Next.js or Astro |
| **Nginx** | Edge router: wildcard SSL (`*.babything.app`), subdomain → main app container, path-based routing for landing/provisioning | Docker container |
| **Redis** | Tenant status cache (subdomain → status, TTL 5 min) | Docker container |
| **Postgres** | Two logical databases: `babything` (tenant data) and `provisioning` (billing/customers) | Single server instance |

---

## Multi-Tenant Data Model

### New / Modified Prisma Models (Main App)

```prisma
model Tenant {
  id          String   @id @default(cuid())
  subdomain   String   @unique
  status      String   @default("TRIAL") // TRIAL | ACTIVE | SUSPENDED
  trialEndsAt DateTime?
  plan        String   @default("FLAT_RATE")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users    User[]
  settings SystemSettings?
  babies   Baby[]
}

model User {
  id            String   @id @default(cuid())
  email         String   @unique        // globally unique across all tenants
  passwordHash  String?
  name          String
  isAdmin       Boolean  @default(false)
  tenantId      String
  tenant        Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  oauthProvider String?
  oauthId       String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  babies        BabyCaregiver[]
  feedings      FeedingEvent[]
  // ... (all existing relations)

  @@unique([oauthProvider, oauthId])
}

model SystemSettings {
  id            String   @id @default(cuid())
  tenantId      String   @unique
  tenant        Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  unitSystem    String   @default("metric")
  streamEnabled Boolean  @default(false) // always false in cloud mode
  updatedAt     DateTime @updatedAt
}

// SmtpConfig: REMOVED in cloud mode (platform handles email)
// OAuthProvider: kept for self-hosted; cloud uses platform-managed Google OAuth
```

All existing event tables (`FeedingEvent`, `DiaperEvent`, `SleepEvent`, etc.)
receive a `tenantId` column and RLS policies scoped by it.

### Provisioning Service DB (separate logical database)

```prisma
model Customer {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String?
  stripeCustomerId String @unique
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  tenants TenantSubscription[]
}

model TenantSubscription {
  id                   String   @id @default(cuid())
  subdomain            String   @unique
  customerId           String
  customer             Customer @relation(fields: [customerId], references: [id])
  status               String   @default("TRIAL") // TRIAL | ACTIVE | PAST_DUE | CANCELED | SUSPENDED
  trialEndsAt          DateTime?
  stripeSubscriptionId String?  @unique
  currentPeriodStart   DateTime?
  currentPeriodEnd     DateTime?
  canceledAt           DateTime?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}
```

---

## Internal API Contract

### Provisioning Service → Main App (Pushes)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/internal/tenants` | Create a new tenant record in the main app |
| `PATCH` | `/internal/tenants/:subdomain` | Update tenant status (e.g., trial → active, active → suspended) |
| `DELETE` | `/internal/tenants/:subdomain` | Hard-delete tenant and all data (GDPR / post-retention) |

**Auth:** `X-Internal-Key: <shared-secret>` header. Provisioned via env var.

### Main App → Provisioning Service (Pulls)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/internal/tenants/:subdomain` | Fetch tenant status, trial dates, plan info |

**Auth:** Same `X-Internal-Key` header.

**Caching:** Results cached in Redis with a **5-minute TTL**. On cache miss, hit
provisioning service. If provisioning is down and cache is cold, allow requests
with a **1-hour grace period** before blocking.

---

## Phase-by-Phase Implementation

### Phase 0 — Foundation (Before Code)

- [x] Register `babything.app` (or similar)
- [x] Set up Stripe account with Product + Price ($8/mo, $77/yr)
- [x] Set up Google Cloud project for OAuth (platform-managed)
- [ ] Provision VPS (recommendation: Hetzner CX42 — 4 vCPU, 16GB RAM, ~$18/mo)
- [ ] Set up Resend or Postmark account for transactional email
- [ ] Write Privacy Policy and Terms of Service (GDPR / COPPA compliant)

---

### Phase 1 — Multi-Tenant Core (Weeks 1–3)

**Goal:** The existing codebase runs in both `selfhosted` and `cloud` modes.

- [ ] **Schema migration**
  - Add `Tenant` model.
  - Add `tenantId` to `User`, `Baby`, and all event tables.
  - Refactor `SystemSettings` to be per-tenant (`tenantId` + relation).
  - Remove `SmtpConfig` usage in cloud mode (hide UI, skip queries).
- [ ] **RLS setup**
  - Add `tenant_id` columns to all tenant-scoped tables.
  - Create RLS policies: `USING (tenant_id = current_setting('app.current_tenant_id')::text)`.
  - Build Prisma middleware or transaction wrapper to set `app.current_tenant_id`
    before each query (required because Prisma + RLS needs explicit session var
    setting).
- [ ] **Tenant resolution middleware**
  - Extract subdomain from `Host` header.
  - Look up tenant status in Redis cache → provisioning service on miss.
  - Attach `tenantId` to the request context for downstream use.
  - If tenant is `SUSPENDED`, block write operations (return `402` or `403`).
- [ ] **Mode switching**
  - `DEPLOYMENT_MODE=selfhosted`: current behavior preserved.
  - `DEPLOYMENT_MODE=cloud`: tenant middleware active, per-tenant settings,
    no SMTP config, no monitor tab, no developer seed tab.
- [ ] **Auth updates**
  - Global email uniqueness (`User.email @unique`).
  - Registration scoped to tenant (user created with `tenantId`).
  - First user in a tenant becomes admin (same rule, just tenant-scoped).
- [ ] **Admin Settings updates for cloud**
  - Hide Monitor, SMTP, Developer tabs.
  - Keep General (units, now per-tenant), Users (tenant-scoped).
  - OAuth tab: hide in cloud (Google is platform-managed).

**Deliverable:** `DEPLOYMENT_MODE=cloud` boots up, resolves subdomains, and
enforces tenant isolation via RLS.

---

### Phase 2 — Provisioning Service & Stripe (Weeks 4–5)

**Goal:** Automated tenant creation and billing lifecycle.

- [ ] **Build provisioning service** (`platform/provisioning/`)
  - Prisma schema with `Customer` and `TenantSubscription`.
  - `POST /tenants` — validate subdomain, create customer + subscription
    record, push to main app via `POST /internal/tenants`.
  - Stripe webhook handlers:
    - `checkout.session.completed` → activate tenant, push status update.
    - `invoice.paid` → ensure tenant active.
    - `invoice.payment_failed` → grace period, then suspend.
    - `customer.subscription.deleted` → suspend tenant, schedule deletion.
- [ ] **Main app internal endpoints**
  - `POST /internal/tenants` — create `Tenant` record.
  - `PATCH /internal/tenants/:subdomain` — update status.
  - Protected by `X-Internal-Key`.
- [ ] **Redis cache integration**
  - Cache tenant status lookups.
  - 5-minute TTL, stale-while-revalidate behavior.
- [ ] **Email automation**
  - Welcome email on tenant creation.
  - Trial ending reminder (24h before expiry).
  - Suspension notice + export instructions.
  - Deletion warning (7 days before wipe).

**Deliverable:** A Stripe Checkout completion automatically spins up a working
tenant subdomain.

---

### Phase 3 — Landing Page & Customer Dashboard (Weeks 6–7)

**Goal:** Visitors can sign up, start a trial, and manage their subscription
without touching anything.

- [ ] **Landing page** (`landing/` or `platform/landing/`)
  - Pricing, features, privacy messaging.
  - "Start Free Trial" CTA.
- [ ] **Signup flow**
  1. User enters email, name, preferred subdomain.
  2. Provisioning service validates subdomain availability.
  3. Stripe Checkout session created (trial, no charge today).
  4. On success, provisioning creates tenant + pushes to main app.
  5. User receives email with their subdomain link.
  6. User visits subdomain, completes registration, adds baby.
- [ ] **Customer dashboard** (`babything.app/account`)
  - View subscription status, next billing date.
  - Update payment method (Stripe Customer Portal).
  - Cancel subscription (triggers suspension + retention timer).
  - Request data export (JSON bundle).
  - Delete account (hard delete after confirmation).
- [ ] **Google OAuth cloud integration**
  - Platform-managed Google OAuth app.
  - Sign-in flow from any subdomain.
  - Signed JWT `state` param encodes tenant subdomain for callback routing.
  - Callback at `babything.app/api/auth/oauth/google/callback` routes user
    back to their subdomain with session token.

**Deliverable:** Fully automated customer acquisition. Zero manual provisioning.

---

### Phase 4 — Migration Path & Operations (Weeks 8–9)

**Goal:** Self-hosters can move to cloud. The operator can monitor and maintain
all tenants.

- [ ] **Export format (self-hosted → cloud)**
  - `POST /admin/export` in self-hosted mode generates a JSON bundle:
    - Tenant metadata, users, babies, all events, settings.
  - Cloud main app accepts `POST /admin/import` with the same bundle,
    creating all records under the cloud tenant.
- [ ] **Import UI**
  - Cloud Admin Settings → "Import from Self-Hosted" accepts file upload.
  - Validates and imports. Idempotent (skips existing records by ID).
- [~] **Operator dashboard** (API complete, UI in progress)
  - `GET /admin/tenants` returns all tenants with status, trial dates, user/baby counts.
  - v2: Full UI with operator roles, audit logging, suspend/activate actions.
  - See `PROGRESS.md` Phase 5 for operator dashboard v2 plan.
- [ ] **Automated backups**
  - Nightly `pg_dump` of main app DB to S3-compatible storage.
  - 30-day retention.
- [ ] **Rolling updates**
  - CI/CD builds new `api` + `web` images.
  - Script pulls new images and restarts cloud containers.
  - Health check after restart.

**Deliverable:** A self-hosted family can pack up their data and move to cloud
in under 5 minutes.

---

### Phase 5 — Growth & Hardening (Months 3–6)

- [x] **Security upgrades**
  - ~~Replace shared API key with mTLS between provisioning service and main app.~~ ✅ Done
  - Security audit of RLS policies and internal endpoints.
- [x] **Annual plan promotion**
  - ~20% discount to improve cash flow and reduce churn. ✅ Done
- [x] **Referral program**
  - "Give a week, get a week" — referrer and referee both get trial extension. ✅ Done
- [ ] **Operator Dashboard v2** (see PROGRESS.md)
  - Operator role & permission system
  - Audit logging
  - Cross-tenant management UI
  - Suspend/activate tenants, extend trials
- [ ] **Feature: Monitor v2 for cloud**
  - WebRTC or WebSocket-based camera streaming that works without exposing
    local RTSP to the internet (e.g., a lightweight companion app or WebRTC
    bridge). Optional add-on pricing.
- [ ] **Feature: Custom OAuth (enterprise)**
  - Allow cloud tenants to configure their own OAuth providers (SAML, Authentik,
    Okta). Higher-tier pricing.
- [x] **Affiliate program**
  - Mommy bloggers, pediatrician offices, doulas.
  - 20% recurring commission via Rewardful or Tolt. ✅ Done
- [ ] **Multi-region**
  - If EU customer base grows, deploy EU VPS with region routing.

---

## File Structure (Target)

```
babything/
├── api/                        # Main app (self-hosted + cloud)
│   ├── prisma/
│   │   └── schema.prisma       # Tenant + per-tenant settings + all existing models
│   ├── src/
│   │   ├── index.ts            # Mode switch: cloud vs selfhosted
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── tenant.ts       # NEW: subdomain resolution, RLS context
│   │   │   └── internal.ts     # NEW: X-Internal-Key validation
│   │   ├── routes/
│   │   │   ├── auth.ts         # Google OAuth callback routing
│   │   │   ├── internal.ts     # NEW: /internal/tenants endpoints
│   │   │   └── ...             # All existing routes (now tenant-scoped)
│   │   └── lib/
│   │       ├── redis.ts        # NEW: Redis client + tenant cache helpers
│   │       ├── provision.ts    # NEW: provisioning service API client
│   │       └── mailer.ts       # Cloud: Resend/Postmark; Self-hosted: SMTP
│   └── ...
├── web/                        # Frontend (self-hosted + cloud)
│   └── src/
│       └── pages/
│           └── AdminSettings.tsx   # Conditionally hides tabs in cloud mode
├── platform/
│   ├── provisioning/           # NEW: Provisioning service
│   │   ├── prisma/
│   │   │   └── schema.prisma   # Customer + TenantSubscription
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── stripe.ts       # Webhook handlers
│   │   │   └── tenants.ts      # Tenant lifecycle + push to main app
│   │   └── Dockerfile
│   └── landing/                # NEW: Marketing + customer dashboard
│       ├── src/
│       │   ├── pages/
│       │   │   ├── index.tsx       # Landing / pricing
│       │   │   ├── signup.tsx      # Trial signup
│       │   │   └── account.tsx     # Subscription management
│       └── Dockerfile
├── docker-compose.yml          # Self-host template
├── docker-compose.cloud.yml    # Cloud stack (Nginx, API, Web, Redis, Postgres, Provisioning, Landing)
└── SUBSCRIPTION_ROADMAP.md     # This file
```

---

## Financial Projections

### Unit Economics

| Metric | Value |
|--------|-------|
| Avg revenue per user | $8/mo (blended monthly + annual) |
| Cost per user | ~$0.10–$0.30/mo (at 50–200 tenants) |
| Gross margin | ~95%+ at scale |

### Infrastructure Costs

| Item | Monthly Cost |
|------|-------------|
| Hetzner CX42 (4c/16GB/160GB) | ~$18 |
| S3 backups (Backblaze B2) | ~$1–$5 |
| Domain + email | ~$2 |
| Resend/Postmark (transactional email) | ~$0 (free tier covers early scale) |
| **Total** | **~$25** |

### Break-Even

| Subscribers | Monthly Revenue | Monthly Cost | Monthly Profit |
|-------------|----------------|--------------|----------------|
| 4 | $32 | $25 | $7 |
| 10 | $80 | $28 | $52 |
| 50 | $400 | $40 | $360 |
| 100 | $800 | $60 | $740 |
| 500 | $4,000 | $150 | $3,850 |

A single VPS comfortably handles 50–100 tenants. Scale horizontally by adding
VPS instances and routing subdomains via DNS.

---

## Security Notes

### Current (v1)
- Shared API key (`X-Internal-Key`) between provisioning and main app.
- Redis on Docker internal network with `requirepass`.
- Provisioning service bound to Docker internal network only.
- RLS policies prevent cross-tenant data leakage even if a `WHERE` clause is
  forgotten.

### Future (Phase 5)
- Migrate internal API auth to **mTLS** (mutual TLS certificates).
- Regular dependency audits (`npm audit`).
- Automated security scanning on CI builds.

---

## Key Principles

1. **Open core builds trust.** Self-hosters are your best marketers.
2. **Privacy is the product.** RLS + isolated tenant records is a competitive
   advantage over pooled baby-tracking apps.
3. **Data portability is non-negotiable.** Parents must be able to export
   everything and leave at any time.
4. **Automate before you scale.** Every manual step in tenant provisioning
   becomes a bottleneck.
5. **Single codebase, mode switch.** One repo, one test suite, one deployment
   pipeline. The `DEPLOYMENT_MODE` flag is your friend.

---

## Quick-Start Checklist

If you want to launch fast:

- [ ] Register `babything.app`
- [ ] Stripe account + products
- [ ] Google Cloud OAuth app (platform-managed)
- [ ] VPS with Docker + Traefik
- [ ] Phase 1: schema migration + tenant middleware + RLS
- [ ] Phase 2: provisioning service + Stripe webhooks
- [ ] Phase 3: landing page + signup flow
- [ ] Privacy Policy + Terms of Service
- [ ] Launch on Hacker News, Reddit (r/selfhosted, r/parenting), Product Hunt

---

*Last updated: 2026-05-02*  
*Status: Phases 1–4 complete. Phase 5 in progress.*
