# Babything Self-Hosted — Deployment Guide

> **Version:** Phase 5 (Growth & Hardening)  
> **Deployment:** Self-hosted (single-tenant)

---

## Architecture Overview

Babything Self-Hosted is a full-stack baby tracking application that runs on your own hardware:

- **Stack:** Docker Compose with 6 services
- **Entrypoint:** nginx reverse proxy on port 80
- **Database:** PostgreSQL 16
- **Cache:** Redis 7
- **Streaming:** MediaMTX (RTSP → HLS baby monitor)
- **Best for:** Families who want to self-host on their own hardware

### Service Map

```
┌─────────────────┐     ┌─────────────┐     ┌──────────────────┐
│   Client        │────▶│   nginx     │────▶│   web (React)    │
│   (Browser/PAW) │     │   :80       │     │   :80            │
└─────────────────┘     └─────────────┘     └──────────────────┘
                              │
                              ├──▶ api:3001  (REST + WebSocket)
                              └──▶ mediamtx:8888  (/hls/*)

api:3001 ──▶ postgres:5432
api:3001 ──▶ redis:6379
```

---

## Prerequisites

- Docker & Docker Compose
- A Linux server or NAS with at least 2GB RAM
- (Optional) A domain or local DNS entry pointing to your server
- (Optional) An RTSP-enabled camera for the monitor feature

---

## Deployment

### Step 1: Clone & Configure

```bash
git clone https://github.com/ThatDavis/babything-selfhosted.git
cd babything-selfhosted
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

# Redis
REDIS_PASSWORD=$(openssl rand -base64 24)

# App URL (used for OAuth redirects and email links)
APP_URL=https://babything.local  # or your domain

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

## Environment Variables

### Required

| Variable | Purpose | Example |
|----------|---------|---------|
| `POSTGRES_USER` | PostgreSQL username | `babything` |
| `POSTGRES_PASSWORD` | PostgreSQL password | *(random)* |
| `POSTGRES_DB` | PostgreSQL database name | `babything` |
| `JWT_SECRET` | JWT signing secret (≥32 chars) | *(random)* |
| `INVITE_SECRET` | Invite token secret (≥32 chars) | *(random)* |
| `REDIS_PASSWORD` | Redis AUTH password | *(random)* |
| `APP_URL` | Canonical public URL | `https://babything.local` |

### Optional

| Variable | Purpose | Default |
|----------|---------|---------|
| `ENCRYPTION_KEY` | AES-256-GCM key for sensitive data | *(empty)* |
| `GOOGLE_CLIENT_ID` | Google OAuth app ID | *(empty)* |
| `GOOGLE_CLIENT_SECRET` | Google OAuth app secret | *(empty)* |
| `CAMERA_RTSP_URL` | RTSP camera URL for monitor | *(empty)* |
| `SMTP_HOST` | SMTP server host | *(empty)* |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_SECURE` | Use TLS for SMTP | `false` |
| `SMTP_USER` | SMTP username | *(empty)* |
| `SMTP_PASS` | SMTP password | *(empty)* |
| `SMTP_FROM_EMAIL` | From email address | `hello@babything.app` |
| `SMTP_FROM_NAME` | From display name | `Babything` |
| `TRUSTED_PROXIES` | Comma-separated proxy IPs or CIDR ranges | *(empty)* |
| `PORT` | Host port for nginx | `80` |

---

## Build Pipeline

Images are built automatically via GitHub Actions and pushed to GitHub Container Registry (GHCR). On every push to `main` or a `v*` tag, the workflow builds and tags:

- `ghcr.io/thatdavis/babything-selfhosted-api`
- `ghcr.io/thatdavis/babything-selfhosted-web`

Tags applied:
- `latest` — always points to the latest `main` branch build
- `main` — the branch name
- `v1.2.3` — semver for releases
- `abc1234` — short SHA for precise pinning

### Pulling Images on a Server

The server must authenticate with GHCR:

```bash
# Create a Personal Access Token (classic) with `read:packages` scope
# Then log in on the server:
echo $GHCR_TOKEN | docker login ghcr.io -u ThatDavis --password-stdin
```

Then update your `docker-compose.yml` to use pre-built images instead of `build:`:

```yaml
api:
  image: ghcr.io/thatdavis/babything-selfhosted-api:latest
  # remove build: section

web:
  image: ghcr.io/thatdavis/babything-selfhosted-web:latest
  # remove build: section
```

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

#### Monitor Tab
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

#### Monitor Settings
- Toggle the Monitor tab visibility.
- View the configured RTSP stream URL.

#### SMTP Email
- Configure outbound email server.
- Test email sender.
- Password is encrypted at rest with AES-256-GCM.

#### OAuth Providers
- Add, edit, and delete generic OAuth 2.0 / OpenID Connect providers.
- Client secrets are encrypted at rest.

#### User Management
- View all users with baby access mapping.
- Toggle admin status (with safeguards against deleting the last admin).
- Delete users.
- Manually grant/revoke baby access with role selection (Owner / Caregiver).

#### Developer Tools (Dev Mode Only)
- **Seed Data:** Generate 3 months of realistic demo data for testing.

---

## Post-Deploy Checklist

- [ ] `.env` secrets are strong and unique
- [ ] First-time setup wizard completed
- [ ] SMTP configured and test email sent
- [ ] (Optional) Google OAuth configured
- [ ] (Optional) RTSP camera URL configured and monitor working
- [ ] Backup script scheduled via cron
- [ ] HTTPS configured (via reverse proxy or nginx TLS)

---

## Known Issues & Fixes

### Monitor Not Available in Cloud

**Issue:** This self-hosted repository includes the RTSP → HLS baby monitor. The cloud/SaaS version does not include camera streaming.

**Status:** By design. The cloud version may add Monitor v2 using WebRTC in a future release. For now, self-hosted users get the full monitor feature.
