# Babything — Deployment Guide & Feature Walkthrough

> **Version:** Phase 5 (Growth & Hardening)  
> **Deployments:** Self-hosted (single-tenant) & Cloud (multi-tenant SaaS)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Self-Hosted Deployment](#self-hosted-deployment)
3. [Cloud Deployment](#cloud-deployment)
4. [Environment Variables](#environment-variables)
5. [Feature Walkthrough](#feature-walkthrough)
   - [End-User Features](#end-user-features)
   - [Admin Features](#admin-features)
   - [Operator / SaaS Features](#operator--saas-features)
6. [Post-Deploy Checklist](#post-deploy-checklist)
7. [Known Issues & Fixes](#known-issues--fixes)

---

## Architecture Overview

Babything is a full-stack baby tracking application with two deployment modes:

### Self-Hosted (Single-Tenant)
- **Stack:** Docker Compose with 8 services
- **Entrypoint:** nginx reverse proxy on port 80
- **Database:** PostgreSQL 16 (app data) + SQLite (provisioning/billing data)
- **Cache:** Redis 7
- **Streaming:** MediaMTX (RTSP → HLS baby monitor)
- **Best for:** Families who want to self-host on their own hardware

### Cloud (Multi-Tenant SaaS)
- **Stack:** Docker Compose with 7 services (no MediaMTX, no nginx)
- **Entrypoint:** Traefik reverse proxy with Let's Encrypt SSL on ports 80/443
- **Database:** PostgreSQL 16 + SQLite (provisioning)
- **Cache:** Redis 7
- **SSL:** Automatic wildcard certificates via ACME TLS challenge
- **Best for:** Running babything.app as a subscription SaaS

### Service Map

```
┌─────────────────┐     ┌─────────────┐     ┌──────────────────┐
│   Client        │────▶│   nginx     │────▶│   web (React)    │
│   (Browser/PAW) │     │   :80       │     │   :80            │
└─────────────────┘     └─────────────┘     └──────────────────┘
                              │
                              ├──▶ api:3001  (REST + WebSocket)
                              ├──▶ mediamtx:8888  (/hls/*)
                              └──▶ landing:80  (marketing site)

api:3001 ──▶ postgres:5432
api:3001 ──▶ redis:6379

landing:80 ──▶ provisioning:3002
provisioning:3002 ──▶ api:3001  (internal API, mTLS in cloud)
```

---

## Self-Hosted Deployment

### Prerequisites

- Docker & Docker Compose
- A Linux server or NAS with at least 2GB RAM
- (Optional) A domain or local DNS entry pointing to your server
- (Optional) An RTSP-enabled camera for the monitor feature

### Step 1: Clone & Configure

```bash
git clone https://github.com/ThatDavis/babything-cloud.git
cd babything-cloud
cp .env.example .env
```

Edit `.env` and set the required secrets:

```bash
# Database
POSTGRES_USER=babything
POSTGRES_PASSWORD=$(openssl rand -base64 24)
POSTGRES_DB=babything

# Auth secrets (min 32 chars)
JWT_SECRET=$(openssl rand -base64 48)
INVITE_SECRET=$(openssl rand -base64 48)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Internal API key (for provisioning → main app communication)
INTERNAL_API_KEY=$(openssl rand -base64 48)

# Redis
REDIS_PASSWORD=$(openssl rand -base64 24)

# App URL (used for OAuth redirects and email links)
APP_URL=https://babything.local  # or your domain

# Deployment mode
DEPLOYMENT_MODE=selfhosted

# Camera (optional — for baby monitor)
# CAMERA_RTSP_URL=rtsp://192.168.1.100:7447/abc123
```

### Step 2: Build & Start

```bash
docker compose up -d --build
```

Services will start in dependency order. The API will automatically run Prisma migrations on boot.

### Step 3: First-Time Setup

Open `http://your-server/` in a browser. You'll see the setup wizard:
1. Create your admin account
2. Add your first baby
3. Start tracking

### Step 4: Enable Optional Features

**Baby Monitor (requires RTSP camera):**
1. Go to Admin Settings → Monitor
2. Toggle "Show Monitor tab"
3. Enter your camera's RTSP URL in `.env` as `CAMERA_RTSP_URL`
4. Restart the stack: `docker compose up -d`

**Email (SMTP):**
1. Go to Admin Settings → SMTP Email
2. Configure your SMTP server (Gmail, Mailgun, etc.)
3. Send a test email to verify

**Google OAuth:**
1. Create credentials at https://console.cloud.google.com/apis/credentials
2. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env`
3. Restart the stack

**Custom OAuth:**
1. Go to Admin Settings → OAuth Providers
2. Add any OpenID Connect provider (Authentik, Keycloak, etc.)

### Step 5: Backups

The `scripts/backup` script performs nightly PostgreSQL dumps to S3:

```bash
# Configure AWS CLI first: aws configure
./scripts/backup s3://my-backup-bucket/babything/
```

Backups older than 30 days are automatically deleted.

---

## Build Pipeline

Images are built automatically via GitHub Actions and pushed to GitHub Container Registry (GHCR). On every push to `main` or a `v*` tag, the workflow builds and tags:

- `ghcr.io/thatdavis/babything-cloud-api`
- `ghcr.io/thatdavis/babything-cloud-web`
- `ghcr.io/thatdavis/babything-cloud-landing`
- `ghcr.io/thatdavis/babything-cloud-provisioning`

Tags applied:
- `latest` — always points to the latest `main` branch build
- `main` — the branch name
- `v1.2.3` — semver for releases
- `abc1234` — short SHA for precise pinning

### Repository Variables

Set these in your GitHub repo under **Settings → Secrets and variables → Actions → Variables**:

| Variable | Purpose |
|----------|---------|
| `VITE_AFFILIATE_SCRIPT_URL` | Affiliate tracking script URL (baked into landing image) |
| `VITE_AFFILIATE_SIGNUP_URL` | Affiliate signup page URL (baked into landing image) |

### Pulling Images on a Server

The cloud compose file references pre-built images by default. The server must authenticate with GHCR:

```bash
# Create a Personal Access Token (classic) with `read:packages` scope
# Then log in on the server:
echo $GHCR_TOKEN | docker login ghcr.io -u ThatDavis --password-stdin
```

---

## Cloud Deployment

### Prerequisites

- A Linux server (VPS) with at least 2GB RAM
- A domain name with DNS pointed to your server
- Docker & Docker Compose
- Stripe account with Products & Prices configured

### Step 1: DNS Setup

Create these DNS A records pointing to your server IP:

```
example.com          A  <server-ip>
*.example.com        A  <server-ip>
operator.example.com A  <server-ip>
```

The wildcard (`*`) is required for tenant subdomains.

### Step 2: Generate mTLS Certificates

```bash
./scripts/generate-mtls-certs
```

This creates `certs/` with:
- `ca.crt` / `ca.key` — Certificate Authority
- `api-server.crt` / `api-server.key` — API server certificate
- `provisioning-client.crt` / `provisioning-client.key` — Provisioning client certificate

### Step 3: Configure Environment

```bash
cp .env.example .env
```

Required variables for cloud mode:

```bash
# Database
POSTGRES_USER=babything
POSTGRES_PASSWORD=$(openssl rand -base64 24)
POSTGRES_DB=babything

# Auth secrets
JWT_SECRET=$(openssl rand -base64 48)
INVITE_SECRET=$(openssl rand -base64 48)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Redis
REDIS_PASSWORD=$(openssl rand -base64 24)

# Stripe (required for cloud)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...        # Monthly plan
STRIPE_ANNUAL_PRICE_ID=price_... # Annual plan

# Domain & SSL
ROOT_DOMAIN=example.com
ACME_EMAIL=admin@example.com

# App URL
APP_URL=https://example.com

# Deployment mode
DEPLOYMENT_MODE=cloud

# Google OAuth (recommended for cloud)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Affiliate (optional)
# VITE_AFFILIATE_SCRIPT_URL=https://rwdl.net/...
# VITE_AFFILIATE_SIGNUP_URL=https://example.getrewardful.com/...
```

### Step 4: Pull Images & Start

```bash
# Pull latest images and recreate containers
docker compose -f docker-compose.cloud.yml pull
docker compose -f docker-compose.cloud.yml up -d

# Or pin to a specific release:
# IMAGE_TAG=v1.2.3 docker compose -f docker-compose.cloud.yml pull
# IMAGE_TAG=v1.2.3 docker compose -f docker-compose.cloud.yml up -d
```

### Step 5: Configure Stripe Webhook

In your Stripe Dashboard, create a webhook endpoint:

```
URL: https://example.com/api/provisioning/webhooks/stripe
Events:
  - checkout.session.completed
  - invoice.paid
  - invoice.payment_failed
  - customer.subscription.deleted
  - customer.subscription.updated
```

Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET` in `.env` and restart.

### Step 6: Verify

- Landing page: `https://example.com`
- Operator dashboard: `https://operator.example.com`
- Tenant subdomain: `https://smith.example.com`

### Cloud-Specific Notes

- **mTLS:** Internal service communication between provisioning and API uses mutual TLS on port 3003. The shared `INTERNAL_API_KEY` is still accepted as a fallback.
- **Tenant Isolation:** Each tenant's data is isolated via PostgreSQL RLS policies and `tenantId` filtering in all queries.
- **No Monitor:** The cloud stack does not include MediaMTX. Monitor v2 (WebRTC) is planned for a future release.
- **No SMTP:** Email is platform-managed in cloud mode. Per-tenant SMTP configuration is hidden.

---

## Environment Variables

### Required (All Deployments)

| Variable | Purpose | Example |
|----------|---------|---------|
| `POSTGRES_USER` | PostgreSQL username | `babything` |
| `POSTGRES_PASSWORD` | PostgreSQL password | *(random)* |
| `POSTGRES_DB` | PostgreSQL database name | `babything` |
| `JWT_SECRET` | JWT signing secret (≥32 chars) | *(random)* |
| `INVITE_SECRET` | Invite token secret (≥32 chars) | *(random)* |
| `REDIS_PASSWORD` | Redis AUTH password | *(random)* |
| `DEPLOYMENT_MODE` | Runtime mode | `selfhosted` or `cloud` |
| `APP_URL` | Canonical public URL | `https://babything.app` |

### Required (Cloud Only)

| Variable | Purpose | Example |
|----------|---------|---------|
| `STRIPE_SECRET_KEY` | Stripe API key | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification | `whsec_...` |
| `STRIPE_PRICE_ID` | Monthly plan price ID | `price_...` |
| `STRIPE_ANNUAL_PRICE_ID` | Annual plan price ID | `price_...` |
| `ROOT_DOMAIN` | Root domain for Traefik | `babything.app` |
| `ACME_EMAIL` | Let's Encrypt contact email | `admin@babything.app` |

### Optional

| Variable | Purpose | Default |
|----------|---------|---------|
| `ENCRYPTION_KEY` | AES-256-GCM key for sensitive data | *(empty)* |
| `GOOGLE_CLIENT_ID` | Google OAuth app ID | *(empty)* |
| `GOOGLE_CLIENT_SECRET` | Google OAuth app secret | *(empty)* |
| `INTERNAL_API_KEY` | Shared secret for service-to-service calls | *(empty)* |
| `TRUSTED_PROXIES` | Comma-separated proxy IPs | *(empty)* |
| `CAMERA_RTSP_URL` | RTSP camera URL for monitor | *(empty)* |
| `VITE_AFFILIATE_SCRIPT_URL` | Affiliate tracking script | *(empty)* |
| `VITE_AFFILIATE_SIGNUP_URL` | Affiliate signup page | *(empty)* |
| `IMAGE_TAG` | Image tag to deploy (`latest`, `v1.2.3`, SHA) | `latest` |
| `DOCKER_SOCK` | Host Docker socket path | `/var/run/docker.sock` |

### mTLS (Cloud Only, Auto-Configured)

| Variable | Purpose | Default |
|----------|---------|---------|
| `MTLS_ENABLED` | Enable mTLS | `false` |
| `MTLS_PORT` | mTLS server port | `3003` |
| `TLS_CERT_PATH` | Server certificate path | `/certs/api-server.crt` |
| `TLS_KEY_PATH` | Server private key path | `/certs/api-server.key` |
| `TLS_CA_PATH` | CA certificate path | `/certs/ca.crt` |

---

## Feature Walkthrough

### End-User Features

#### Baby Management
- **Add Baby:** Create a baby profile with name, date of birth, and optional sex.
- **Switch Babies:** Quick-switch between multiple babies via a horizontal pill selector (mobile) or sidebar list (desktop).
- **Baby Settings:** View caregivers, invite new caregivers by email, remove caregivers, generate pediatric PDF reports, export data as CSV/ZIP, or delete the baby.

#### Activity Logging
All logs use mobile-optimized bottom sheet modals:

- **Feedings:** Log breast (with side selector and live timer) or bottle (with milk type and amount in ml).
- **Diapers:** Log wet, dirty, both, or dry. Optional color picker.
- **Sleep:** Start/stop sleep timer. Tracks naps vs night sleep and location.

#### Dashboard (Home Tab)
- **At-a-Glance Cards:** Last feeding, last diaper, current sleep status with elapsed time.
- **Quick Log Buttons:** One-tap access to feeding, diaper, and sleep sheets.
- **Activity Feed:** Reverse-chronological unified timeline grouped by day.
- **Charts:** Feedings per hour (24h), diapers per day (7d), sleep hours per day (7d), weight trend (all time).

#### Health Tab
- **Growth:** Track weight, length, and head circumference with unit-aware inputs.
- **Medications:** Log medications with dose, unit, and quick-select chips for common meds.

#### Vaccines Tab
- **Schedule:** CDC recommended schedule computed from baby's DOB with due/overdue/complete status.
- **Appointments:** Track well visits, sick visits, specialists with date, doctor, and linked vaccines.

#### Milestones Tab
- Log milestones with title, description, and date.
- Quick-select chips for common milestones (first smile, rolls over, etc.).

#### Real-Time Sync
- Cross-device sync via Socket.io.
- All caregivers see updates instantly when any caregiver logs an event.
- Events are scoped to baby rooms for efficient broadcasting.

#### Monitor Tab (Self-Hosted Only)
- HLS.js video player for RTSP camera streams.
- Video and audio-only modes.
- Picture-in-Picture support.
- Auto-retry on connection errors.

#### PWA
- Installable as a standalone web app on mobile homescreens.
- Optimized viewport, touch feedback, and tap-highlight removal.
- Theme color matches brand.

### Admin Features

Accessible at `/admin` by users with `isAdmin = true`.

#### General Settings
- Toggle unit system (metric / imperial).

#### Monitor Settings (Self-Hosted Only)
- Toggle the Monitor tab visibility.
- View the configured RTSP stream URL.

#### SMTP Email (Self-Hosted Only)
- Configure outbound email server.
- Test email sender.
- Password is encrypted at rest with AES-256-GCM.

#### OAuth Providers (Self-Hosted Only)
- Add, edit, and delete generic OAuth 2.0 / OpenID Connect providers.
- Client secrets are encrypted at rest.

#### User Management
- View all users with baby access mapping.
- Toggle admin status (with safeguards against deleting the last admin).
- Delete users.
- Manually grant/revoke baby access with role selection (Owner / Caregiver).

#### Developer Tools (Dev Mode Only)
- **Seed Data:** Generate 3 months of realistic demo data for testing.

### Operator / SaaS Features (Cloud Only)

#### Landing Page
- Marketing site with feature grid, pricing toggle (monthly/annual), and affiliate partner section.
- Google OAuth sign-in button (if configured).

#### Signup Flow
- 14-day free trial (21 days with referral code).
- Subdomain selection (e.g., `smith.babything.app`).
- Monthly / annual billing period toggle.
- Optional referral code input.

#### Customer Dashboard (Account Page)
- View subscription status, billing period, and trial end date.
- **Manage Subscription:** Redirects to Stripe Customer Portal for payment method updates and plan changes.
- **Cancel Subscription:** Immediate cancellation with confirmation.
- **Referral Program:** Copy your referral link, see how many friends have joined.
- Both referrer and referee get an extra week free.

#### Stripe Integration
- Automatic subscription lifecycle management.
- Webhook handling for payments, failures, and cancellations.
- Annual plan promotion with ~20% savings.

#### mTLS Security
- Service-to-service communication uses mutual TLS with client certificate verification.
- Provisioning service presents a certificate signed by the internal CA.
- API validates the certificate CN is `provisioning`.

#### Affiliate Program
- Lightweight integration with third-party platforms (Rewardful, Tolt).
- Tracking script loads on the landing page.
- Affiliate signup link in footer and partner section.

#### Operator Dashboard
- `GET /admin/tenants` lists all tenants with user and baby counts.
- Data export/import for tenant migration (self-hosted → cloud).

---

## Post-Deploy Checklist

### Self-Hosted

- [ ] `.env` secrets are strong and unique
- [ ] First-time setup wizard completed
- [ ] SMTP configured and test email sent
- [ ] (Optional) Google OAuth configured
- [ ] (Optional) RTSP camera URL configured and monitor working
- [ ] Backup script scheduled via cron
- [ ] HTTPS configured (via reverse proxy or nginx TLS)

### Cloud

- [ ] `.env` secrets are strong and unique
- [ ] DNS A and wildcard records propagated
- [ ] mTLS certificates generated (`./scripts/generate-mtls-certs`)
- [ ] Stripe webhook endpoint configured and verified
- [ ] Stripe prices created (monthly + annual)
- [ ] Google OAuth configured (recommended)
- [ ] Let's Encrypt certificates issued successfully
- [ ] Test signup flow end-to-end
- [ ] Test referral code flow
- [ ] Backup script scheduled via cron
- [ ] Operator dashboard accessible at `operator.{ROOT_DOMAIN}`

---

## Known Issues & Fixes

### Cloud Routing Conflict

**Issue:** The `api` and `web` Traefik routers in `docker-compose.cloud.yml` share identical `HostRegexp` rules. This causes unpredictable routing.

**Fix:** Add path-based differentiation. Update the `api` router to include a `PathPrefix` condition, or use Traefik priorities:

```yaml
# Option A: Add /api prefix to API routes and route accordingly
labels:
  - "traefik.http.routers.api.rule=HostRegexp(`{subdomain:[a-z0-9-]+}.${ROOT_DOMAIN}`) || Host(`${ROOT_DOMAIN}`) && PathPrefix(`/api`)"
  - "traefik.http.routers.web.rule=HostRegexp(`{subdomain:[a-z0-9-]+}.${ROOT_DOMAIN}`) || Host(`${ROOT_DOMAIN}`)"
```

> **Note:** This requires the web SPA to proxy `/api` requests to the API service, or the API to be accessible under `/api`. The self-hosted nginx config already handles this pattern.

### Missing Traefik Auth Middleware

**Issue:** The `auth@file` middleware referenced by the Traefik dashboard router does not exist in the repository.

**Fix:** Either:
1. Mount a Traefik dynamic config file with a basic auth middleware.
2. Remove the middleware reference to expose the dashboard (not recommended for production).

Example dynamic config (`traefik/dynamic.yml`):
```yaml
http:
  middlewares:
    auth:
      basicAuth:
        users:
          - "admin:$apr1$H6uskkkW$IgXLP6ewTrSuBkTrqE8wj/"
```

Then mount it in `docker-compose.cloud.yml`:
```yaml
traefik:
  volumes:
    - ./traefik/dynamic.yml:/etc/traefik/dynamic.yml:ro
```

### No Custom Networks

**Issue:** All services share the default bridge network.

**Fix:** Define explicit networks for better isolation:
```yaml
networks:
  frontend:
  backend:

services:
  api:
    networks: [backend, frontend]
  web:
    networks: [frontend]
  postgres:
    networks: [backend]
```

### Monitor Not Available in Cloud

**Issue:** The cloud stack does not include MediaMTX or camera streaming.

**Status:** By design. Monitor v2 using WebRTC is planned for a future release. Self-hosted users can use the existing RTSP → HLS monitor.
