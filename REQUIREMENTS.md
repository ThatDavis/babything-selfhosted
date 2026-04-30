# Babything — Requirements

> This document defines what Babything is and what it does.
> For the technical architecture and implementation plan, see `SUBSCRIPTION_ROADMAP.md`.
> For development workflow standards, see `DEVELOPMENT.md`.

---

## Overview

Babything is a **newborn tracking application** for families and caregivers. It
tracks feedings, diapers, sleep, growth, medications, vaccines, appointments,
and milestones. Multiple caregivers can collaborate in real time.

The product is offered in two forms:

1. **Self-Hosted** — Free, open-source, runs on your own hardware (Docker).
2. **Cloud** — Subscription hosting ($8/mo or $77/yr) at `yourfamily.babything.app`.
   We handle servers, backups, SSL, and updates.

Both share the same codebase and feature set. The only difference is who runs
the server.

---

## Core Features

### Tracking Events

| Event | Fields |
|-------|--------|
| **Feedings** | Type (`breast` / `bottle`), side, duration, amount, milk type, start/end times, notes |
| **Diapers** | Type (`wet` / `dirty` / `both` / `dry`), color, time, notes |
| **Sleep** | Type (`nap` / `night`), location, start/end times, notes |
| **Growth** | Weight, length, head circumference, measured time, notes |
| **Medications** | Name, dose, unit, time, notes |
| **Milestones** | Title, description, time, notes |
| **Appointments** | Date, doctor, type (`well-visit` / `sick-visit` / `specialist` / `other`), notes |
| **Vaccines** | Name, dose number, lot number, administered time, linked appointment, notes |

### Dashboard & Reports

- At-a-glance cards: time since last feed, last diaper, current sleep status
- Charts: feed timeline (24h), diaper frequency (7d), sleep hours (7d), weight trend
- Recent activity feed, filterable by event type
- **PDF pediatric report** — branded summary for doctors
- **CSV export** — ZIP of all event data, filterable by date range

### Collaboration

- Multi-caregiver access per baby
- Invite by email link
- Real-time sync via WebSocket (all caregivers see updates instantly)
- Owner / Caregiver roles

### Authentication

- Email + password (bcrypt, JWT)
- Platform-managed Google OAuth (cloud)
- Configurable OAuth2 providers (self-hosted)

### Other

- Metric or imperial units (user preference)
- PWA support (installable on iOS/Android home screen)
- Baby monitor — live RTSP camera stream (self-hosted only)

---

## Cloud Offering (Subscription)

### Pricing

| Plan | Monthly | Annual | Savings |
|------|---------|--------|---------|
| Flat Rate | $8/mo | $77/yr | ~20% |

### What's Included

- Private subdomain (`yourfamily.babything.app`)
- All tracking features
- Unlimited babies and caregivers
- Automatic SSL, backups, and updates
- Platform-managed Google sign-in
- Email delivery handled by us
- 14-day free trial (no credit card)

### Tenant Lifecycle

1. User signs up on landing page (email + subdomain preference)
2. Provisioning service creates tenant and pushes to main app
3. Stripe Checkout handles billing
4. Tenant status: `TRIAL` → `ACTIVE` → `SUSPENDED` (read-only) → `DELETED` (30 days later)

### Architecture

- **True multi-tenant SaaS** — one app, shared PostgreSQL with RLS
- **Subdomain routing** — `tenant.babything.app`
- **Per-tenant data isolation** — PostgreSQL Row-Level Security
- **Provisioning service** — handles Stripe webhooks, tenant lifecycle
- **Redis cache** — tenant status lookups between services

---

## Data Model

See `api/prisma/schema.prisma` for the canonical schema.

Key entities:

```
Tenant          — id, subdomain, status, trialEndsAt
User            — id, email, passwordHash, name, tenantId, isAdmin
Baby            — id, name, dob, sex, tenantId
BabyCaregiver   — babyId, userId, role, invitedAt, acceptedAt
FeedingEvent    — id, babyId, tenantId, type, side, durationMin, amount, milkType, startedAt, endedAt, notes
DiaperEvent     — id, babyId, tenantId, type, color, occurredAt, notes
SleepEvent      — id, babyId, tenantId, type, location, startedAt, endedAt, notes
GrowthRecord    — id, babyId, tenantId, weight, length, headCirc, measuredAt, notes
MedicationEvent — id, babyId, tenantId, name, dose, unit, occurredAt, notes
Milestone       — id, babyId, tenantId, title, description, occurredAt, notes
Appointment     — id, babyId, tenantId, date, doctor, type, notes
VaccineRecord   — id, babyId, tenantId, vaccineName, doseNumber, lotNumber, administeredAt, notes
```

*(Self-hosted mode omits `Tenant` and `tenantId`; settings are global per instance.)*

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| API | Node.js + Express + TypeScript + Prisma |
| Database | PostgreSQL |
| Frontend | React + Vite + Tailwind CSS |
| Real-time | Socket.io |
| Containerization | Docker + Docker Compose |
| Reverse proxy (self-hosted) | Nginx |
| Reverse proxy (cloud) | Traefik (wildcard SSL) |
| Cache | Redis |
| Billing | Stripe |
| Email (cloud) | Resend / Postmark |
| Email (self-hosted) | SMTP (user-configured) |

---

## Phased Roadmap

### Phase 1 — Core MVP ✓
Docker setup, auth, baby profiles, feedings/diapers/sleep logging, mobile UI.

### Phase 2 — Full Tracking + Dashboard ✓
Growth, medications, milestones, appointments, vaccines, charts, unit preferences.

### Phase 3 — Polish & Sharing ✓
PWA, real-time sync, CSV export, email via SMTP.

### Phase 4 — Cloud Infrastructure
Multi-tenant schema, RLS, tenant middleware, subdomain routing, provisioning service,
Stripe integration, landing page, customer dashboard.

### Phase 5 — Growth & Hardening
Security upgrades (mTLS), annual plans, referral program, affiliate program,
monitor v2 for cloud, multi-region support.

---

## Non-Goals

- Native iOS/Android apps (PWA covers mobile)
- Medical advice or percentile charts (growth tracking only)
- Public-facing baby pages / social sharing
- Photo uploads for milestones (deferred indefinitely)
- Apple Sign-In (deferred to post-launch)
