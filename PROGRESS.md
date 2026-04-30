# Babything — Build Progress

> Reference `REQUIREMENTS.md` for full feature specs and data model.
> Update this file at the end of every session or after completing a task.

---

## Current Status: Phase 3 — In Progress

**Last updated:** 2026-04-27  
**Current task:** Starting Phase 3 scaffolding

---

## Confirmed Decisions

- **Frontend:** React + Vite + TailwindCSS
- **Backend:** Node.js + Express (or Fastify — decide at scaffold)
- **ORM:** Prisma
- **DB:** PostgreSQL
- **Real-time:** Socket.io (Phase 3)
- **Auth:** Email/password + JWT v1, OAuth v2
- **Container:** Docker Compose (Node + Postgres + Nginx)
- **Units:** User preference toggle (metric/imperial) — implement in Phase 2
- **Feed timer:** Two caregivers can log simultaneously (no blocking)

## Confirmed Decisions (continued)

- Framework: Express
- Port config: frontend :5173 (Vite dev), backend :3001, Nginx :80 (prod)
- Auth: 24h JWT in localStorage (single token, no refresh — fine for private use)

---

## Phase 1 — Core MVP

### Tasks

- [x] Repo structure & Docker Compose scaffold
  - [x] `docker-compose.yml` (postgres, api, nginx, frontend)
  - [x] `Dockerfile` for api
  - [x] `Dockerfile` for frontend (prod build served by Nginx)
  - [x] Nginx config (reverse proxy + SPA fallback)
  - [x] `.env.example`
  - [x] `.gitignore`
- [x] Database — Prisma schema
  - [x] `User` model
  - [x] `Baby` model
  - [x] `BabyCaregiver` join model (roles: OWNER | CAREGIVER)
  - [x] `FeedingEvent` model
  - [x] `DiaperEvent` model
  - [x] `SleepEvent` model
  - [x] `InviteToken` model
  - [ ] Initial migration (run `npx prisma migrate dev` locally to generate)
- [x] Backend — Auth
  - [x] POST `/auth/register`
  - [x] POST `/auth/login`
  - [x] GET `/auth/me`
  - [x] JWT middleware
  - [x] POST `/auth/invite` — generate invite token (Owner only)
  - [x] GET `/auth/invite/:token` — inspect invite
  - [x] POST `/auth/invite/:token/accept` — accept invite
- [x] Backend — Babies
  - [x] POST `/babies`
  - [x] GET `/babies`
  - [x] GET `/babies/:id` (with caregivers)
  - [x] PATCH `/babies/:id` (Owner only)
  - [x] DELETE `/babies/:babyId/caregivers/:userId` (Owner only)
  - [x] GET `/babies/:id/dashboard`
- [x] Backend — Events (per baby, auth-gated)
  - [x] Feedings: full CRUD with caregiver-scoped delete
  - [x] Diapers: full CRUD with caregiver-scoped delete
  - [x] Sleep: full CRUD with caregiver-scoped delete
  - [x] GET `/babies/:id/events` — unified recent activity feed
- [x] Frontend — Auth screens
  - [x] Register page
  - [x] Login page
  - [x] Accept invite page
- [x] Frontend — Baby selection
  - [x] Baby pill switcher in header
  - [x] Add baby bottom sheet
- [x] Frontend — Mobile home (at-a-glance + quick-log)
  - [x] At-a-glance cards (last feed, last diaper, sleep status)
  - [x] Quick-log buttons → bottom sheet per type
  - [x] Feed bottom sheet (breast/bottle, side, timer, amount)
  - [x] Diaper bottom sheet (type, color)
  - [x] Sleep bottom sheet (start timer / end active sleep)
- [x] Frontend — Recent activity feed (grouped by day, caregiver name)
- [ ] Frontend — Responsive desktop layout (sidebar nav)

- [x] DELETE `/babies/:id` (Owner only — cascades all events)
- [x] BabySettings sheet — invite generation, caregiver list/remove, delete baby with confirm
- [x] Responsive desktop sidebar layout (persistent sidebar on md+, pill nav on mobile)
- [x] First-run setup wizard (3 steps: account → baby → done; gated by `/auth/setup`)
- [x] Friendly inline DOB validation (removed native `max` tooltip)

### Phase 1 — COMPLETE ✓

## Updated Plan

After completing Phase 3, the project will move to the **Subscription Service** architecture (see `SUBSCRIPTION_ROADMAP.md`):
1. Finish remaining Phase 3 features (PWA, real-time sync, CSV export, Google OAuth, SMTP email)
2. Multi-tenant cloud migration (schema, RLS, tenant middleware, provisioning service)
3. Launch cloud beta → public launch

### Out of Scope
- Photo uploads for milestones — removed from plan
- OAuth — Apple — deferred to post-launch

---

## Phase 2 — Full Tracking + Dashboard — COMPLETE ✓

- [x] Prisma models: `GrowthRecord`, `MedicationEvent`, `Milestone`, `Appointment`, `VaccineRecord`
- [x] Backend CRUD for growth, medications, milestones, appointments, vaccines
- [x] Stats endpoint for chart data (feedings 24h, diapers/sleep/growth 7d)
- [x] Health tab — growth measurements + medication log with common-item shortcuts
- [x] Vaccines tab — CDC schedule with complete/due/overdue/upcoming status, appointment log, vaccine linking
- [x] Milestones tab — milestone log with common milestone shortcuts
- [x] Dashboard charts — feeds/24h bar, diapers/7d bar, sleep hours/7d bar, weight trend line (recharts)
- [x] Bottom tab bar (mobile) + sidebar section links (desktop)

---

## Phase 3 — Polish & Sharing

### Tasks

- [x] PWA manifest + icons (installable on home screen)
- [x] Real-time sync via Socket.io (push event changes to all caregivers in the same baby room)
- [x] CSV export (per event type or full export, date range picker)
- [ ] OAuth — Google (Passport.js local → Google strategy)
- [ ] OAuth — Apple
- [ ] ~~Photo uploads for milestones~~ — Out of scope for now
- [x] Email via SMTP (Nodemailer) — invite links and password reset

---

## Project Structure (target)

```
babything/
├── docker-compose.yml
├── .env.example
├── nginx/
│   └── nginx.conf
├── api/
│   ├── Dockerfile
│   ├── package.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── src/
│       ├── index.ts
│       ├── routes/
│       │   ├── auth.ts
│       │   ├── babies.ts
│       │   ├── feedings.ts
│       │   ├── diapers.ts
│       │   └── sleep.ts
│       ├── middleware/
│       │   └── auth.ts
│       └── lib/
│           └── prisma.ts
└── web/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── pages/
        │   ├── Login.tsx
        │   ├── Register.tsx
        │   ├── Home.tsx        ← mobile dashboard
        │   └── Dashboard.tsx   ← desktop dashboard
        ├── components/
        │   ├── AtAGlanceCard.tsx
        │   ├── QuickLogSheet.tsx
        │   ├── FeedSheet.tsx
        │   ├── DiaperSheet.tsx
        │   ├── SleepSheet.tsx
        │   └── ActivityFeed.tsx
        └── lib/
            ├── api.ts
            └── auth.ts
```

---

## How to Resume

1. Read `REQUIREMENTS.md` for full feature specs
2. Read this file for current task and decisions
3. Check git log for what's been committed
4. Pick up from the first unchecked item in the current phase
