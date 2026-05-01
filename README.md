# babything

A newborn tracking app for families and caregivers. Log feedings, diapers, sleep, growth, medications, vaccines, and milestones. Share access with partners, grandparents, or anyone helping care for the baby.

**Two deployment modes:**
- **Self-hosted** — Run on your own hardware with Docker (single family)
- **Cloud / SaaS** — Multi-tenant subscription hosting with Stripe billing, custom subdomains, and automated SSL

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
- **Baby monitor** — live RTSP camera stream (video or audio-only background mode, picture-in-picture)
- **Multi-caregiver** — invite others by email; owner/caregiver roles
- **Real-time sync** — changes appear instantly on all open devices
- **Metric or imperial** — switch units globally from admin settings
- **PWA** — installable on iOS and Android as a home-screen app
- **OAuth** — optionally configure any OAuth2 provider, or use the dedicated Google sign-in

---

## Requirements

- Docker and Docker Compose
- A machine on your local network (Raspberry Pi, NAS, old laptop, VPS — anything works)

---

## Setup

**1. Clone the repo**
```bash
git clone https://github.com/yourname/babything.git
cd babything
```

**2. Create your `.env` file**
```bash
cp .env.example .env
```

Edit `.env` and set the required values:

```env
# Database
POSTGRES_USER=babything
POSTGRES_PASSWORD=change-this-password
POSTGRES_DB=babything

# Auth — generate two long random strings
JWT_SECRET=change-this-to-a-long-random-string
INVITE_SECRET=change-this-too

# Public URL of your instance (used in invite, reset emails, and OAuth callbacks)
APP_URL=http://your-server-ip-or-domain

# Port nginx listens on
PORT=80

# Encryption key for sensitive data at rest (SMTP passwords, OAuth secrets)
# Generate with: openssl rand -base64 32
ENCRYPTION_KEY=

# Baby monitor — RTSP URL of your camera (leave blank to disable)
CAMERA_RTSP_URL=

# Optional: Google OAuth sign-in
# Create credentials at https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

**3. Start**
```bash
docker compose up -d
```

**4. Create the first admin account**

Open `http://your-server` in a browser. The first person to register automatically becomes the admin.

---

## Adding babies and caregivers

1. After logging in, click **+ Add baby** and enter the baby's name, date of birth, and sex.
2. To share access, open **Baby Settings** (gear icon) → **Caregivers** → **Invite by email**.
3. The invitee receives an email with a link. They sign in or create an account and the baby is added to their account automatically.

---

## Admin settings

Go to **Admin Settings** (shield icon in the sidebar, visible to admins only).

| Tab | What it does |
|-----|-------------|
| **General** | Switch between metric (kg, cm) and imperial (lbs, oz, in) |
| **Monitor** | Enable the baby monitor tab and view your configured RTSP URL |
| **SMTP Email** | Configure outbound email for invites, password resets, and PDF reports |
| **OAuth Providers** | Add any OAuth2 provider (Google, Authentik, etc.) |
| **Users** | View all users, toggle admin, assign or remove baby access, delete accounts |
| **Developer** | Seed a test baby with 3 months of realistic sample data |

---

## Baby monitor

The monitor streams a live RTSP camera feed to all caregivers in the browser.

**Setup:**

1. Get the RTSP URL from your camera.
   - **UniFi Protect**: open the camera in Protect → Settings → General → enable RTSP → copy the URL
   - **Direct IP cameras**: usually `rtsp://[camera-ip]/s0`

2. Add it to `.env`:
   ```env
   CAMERA_RTSP_URL=rtsp://192.168.1.1:7447/your-stream-token
   ```

3. Restart the mediamtx container:
   ```bash
   docker compose restart mediamtx
   ```

4. In the app, go to **Admin Settings → Monitor** and enable the Monitor tab.

The **Monitor** tab then appears for all caregivers. Switch to **Audio only** mode to keep the audio stream playing in a background browser tab — useful as a nightstand monitor.

> **Note:** The stream connects to the camera on-demand (when someone opens the tab) and disconnects 10 seconds after the last viewer leaves. First load takes about 6 seconds while the stream buffers.

---

## PDF reports

Open **Baby Settings** → **Pediatric Report**. Choose a date range and which sections to include, then either download the PDF or email it directly to a doctor's address.

Email delivery requires SMTP to be configured under **Admin Settings → SMTP Email**.

---

## Updating

```bash
docker compose pull        # pull any updated base images
docker compose build       # rebuild api and web
docker compose up -d       # restart with new images (migrations run automatically)
```

---

## Reverse proxy

If you're putting babything behind an existing nginx, Caddy, or Traefik instance, set your upstream to port `80` (or whatever `PORT` is set to) and make sure WebSocket proxying is enabled for the `/socket.io/` path. `APP_URL` should be set to the public URL users reach the app at.

---

## Cloud / SaaS

Babything also runs as a multi-tenant SaaS with:
- Custom subdomains (`yourfamily.babything.app`)
- Stripe subscription billing (monthly & annual plans)
- Automated SSL via Let's Encrypt
- Referral program ("give a week, get a week")
- Affiliate program integration

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for full cloud deployment instructions.

---

## Tech stack

| Layer | What |
|-------|------|
| API | Node.js, Express, TypeScript, Prisma |
| Database | PostgreSQL (app), SQLite (provisioning) |
| Frontend | React, Vite, Tailwind CSS |
| Real-time | Socket.io |
| Media | mediamtx (RTSP → HLS) |
| Reverse proxy | Nginx (self-hosted), Traefik (cloud) |
| Deployment | Docker Compose |
