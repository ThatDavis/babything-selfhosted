# Babything — Newborn Tracker Requirements

## Overview

A self-hosted, mobile-first web application for tracking newborn care events in real time across multiple caregivers. Supports multiple babies, quick-tap mobile logging, and a richer desktop dashboard with charts and history.

---

## Users & Authentication

### v1
- Email + password authentication (bcrypt, JWT sessions)
- Invite-based caregiver access per baby (invite by email link)
- Roles per baby: **Owner** (can manage caregivers, delete baby) | **Caregiver** (can log and view)
- Session persists on mobile (long-lived refresh tokens)

### Future (v2)
- OAuth providers: Google, Apple
- Optional MFA

---

## Baby Profiles

- Multiple babies per account
- Baby fields: name, date of birth, sex (optional), photo (optional)
- Each baby has its own set of caregivers
- Dashboard and log views are scoped per selected baby

---

## Tracking — Event Types

### 1. Feedings
| Field | Details |
|---|---|
| Type | `breast` \| `bottle` |
| **Breast** side | `left` \| `right` \| `both` |
| **Breast** duration | minutes (timer or manual entry) |
| **Bottle** amount | ml or oz (user preference) |
| **Bottle** milk type | `breastmilk` \| `formula` \| `other` |
| Started at | datetime |
| Ended at | datetime (or derived from duration) |
| Notes | optional free text |
| Logged by | caregiver |

### 2. Diaper Changes
| Field | Details |
|---|---|
| Type | `wet` \| `dirty` \| `both` \| `dry` |
| Color | `yellow` \| `green` \| `brown` \| `black (meconium)` \| `other` |
| Notes | optional free text |
| Occurred at | datetime |
| Logged by | caregiver |

### 3. Sleep
| Field | Details |
|---|---|
| Type | `nap` \| `night` |
| Started at | datetime |
| Ended at | datetime (nullable — supports in-progress sleep) |
| Location | optional: `crib`, `bassinet`, `arms`, `stroller`, `other` |
| Notes | optional free text |
| Logged by | caregiver |

### 4. Weight & Growth
| Field | Details |
|---|---|
| Weight | grams or lbs/oz (user preference) |
| Length | cm or inches (optional) |
| Head circumference | cm or inches (optional) |
| Measured at | datetime |
| Notes | optional free text |
| Logged by | caregiver |

### 5. Medications & Vitamins
| Field | Details |
|---|---|
| Name | free text (e.g., "Vitamin D", "Tylenol") |
| Dose | numeric |
| Unit | `ml` \| `mg` \| `drops` \| `other` |
| Occurred at | datetime |
| Notes | optional free text |
| Logged by | caregiver |

### 6. Milestones & Notes
| Field | Details |
|---|---|
| Title | short label (e.g., "First smile") |
| Description | optional rich text |
| Photo | optional image upload (v2) |
| Occurred at | datetime |
| Logged by | caregiver |

### 7. Doctor Appointments
| Field | Details |
|---|---|
| Date & time | datetime |
| Doctor / clinic | free text |
| Type | `well-visit` \| `sick-visit` \| `specialist` \| `other` |
| Notes | optional free text |
| Logged by | caregiver |

### 8. Vaccines
| Field | Details |
|---|---|
| Vaccine name | free text or selected from standard schedule |
| Dose number | e.g. 1, 2, 3 |
| Lot number | optional free text |
| Administered at | datetime |
| Appointment | optional link to a doctor appointment |
| Notes | optional free text |
| Logged by | caregiver |

#### Standard Vaccination Schedule
Built-in CDC schedule shown as a timeline relative to baby's DOB. Displays:
- Which vaccines are **due** (upcoming within 4 weeks)
- Which are **overdue** (past due date, not yet logged)
- Which are **complete** (logged against the baby)

Schedule milestones (approximate ages):
| Age | Vaccines |
|---|---|
| Birth | HepB #1 |
| 1–2 months | HepB #2 |
| 2 months | DTaP #1, Hib #1, IPV #1, PCV #1, RV #1 |
| 4 months | DTaP #2, Hib #2, IPV #2, PCV #2, RV #2 |
| 6 months | DTaP #3, Hib #3, IPV #3, PCV #3, HepB #3, Flu #1 |
| 12–15 months | MMR #1, Varicella #1, HepA #1, Hib #4, PCV #4 |
| 15–18 months | DTaP #4 |
| 18–24 months | HepA #2 |
| 4–6 years | DTaP #5, MMR #2, Varicella #2, IPV #4 |

Custom vaccines (outside the standard schedule) can also be logged freely.

---

## Real-Time Sync

- **Ideal:** WebSocket broadcast (Socket.io or native WS) — push event updates to all connected caregivers for the same baby in real time
- **Fallback:** Server-Sent Events or polling (30s interval) if WS is unavailable
- No conflict resolution needed — last write wins per event record

---

## Dashboard (Desktop Primary, Mobile Summary)

### At-a-Glance Cards (mobile + desktop)
- Time since last feed (with feed type)
- Time since last diaper change (with type)
- Current sleep status — asleep/awake + duration
- Next suggested feed window (based on average interval, configurable)

### Charts & History (desktop, collapsible on mobile)
- **Feed timeline** — hourly bar chart for last 24h, toggleable to 7-day
- **Sleep pattern** — daily sleep blocks over last 7 days (visual Gantt-style)
- **Diaper frequency** — daily count chart, last 7 days
- **Weight trend** — line graph over all recorded measurements
- **Daily totals** — feeds, diapers, total sleep hours for selected day

### Recent Activity Feed
- Chronological log of all events, all caregivers, for the selected baby
- Filterable by event type
- Editable / deletable by the caregiver who logged it (Owners can edit any)

---

## Mobile UI

- Large tap targets for all primary actions
- Home screen shows at-a-glance cards + quick-log buttons
- Quick-log: one tap opens a minimal bottom sheet — sensible defaults, confirm with one more tap
- Built-in feed timer (start/stop with elapsed display)
- Built-in sleep timer (start/stop)
- Swipe to switch between babies

---

## Desktop UI

- Sidebar navigation: Dashboard | Log | Growth | Milestones | Settings
- Full form controls with all optional fields visible
- Dashboard with all charts rendered
- Caregiver management panel (Owner only)
- Export log to CSV (per event type, date range)

---

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js (LTS) |
| Framework | Express or Fastify |
| Database | PostgreSQL |
| ORM | Prisma |
| Real-time | Socket.io |
| Frontend | React (Vite) + TailwindCSS |
| Auth | Passport.js (local strategy v1, OAuth v2) |
| Containerization | Docker + Docker Compose |
| Reverse proxy | Nginx (in compose) |

---

## Data Model (high level)

```
User           — id, email, password_hash, name, unit_preference, created_at
Baby           — id, name, dob, sex, photo_url, created_at
BabyCaregiver  — baby_id, user_id, role, invited_at, accepted_at
FeedingEvent   — id, baby_id, logged_by, type, side, duration_min, amount, milk_type, started_at, ended_at, notes
DiaperEvent    — id, baby_id, logged_by, type, color, occurred_at, notes
SleepEvent     — id, baby_id, logged_by, type, location, started_at, ended_at, notes
GrowthRecord   — id, baby_id, logged_by, weight, length, head_circ, measured_at, notes
MedicationEvent— id, baby_id, logged_by, name, dose, unit, occurred_at, notes
Milestone      — id, baby_id, logged_by, title, description, photo_url, occurred_at
Appointment    — id, baby_id, logged_by, date, doctor, type, notes
VaccineRecord  — id, baby_id, logged_by, vaccine_name, dose_number, lot_number, administered_at, appointment_id?, notes
```

---

## Phased Roadmap

### Phase 1 — Core (MVP)
- Docker Compose setup (Node + Postgres + Nginx)
- Auth (email/password, JWT, invite links)
- Baby profiles (multi-baby)
- Log: Feedings, Diapers, Sleep (with timers)
- At-a-glance dashboard cards
- Mobile-first UI

### Phase 2 — Full Tracking + Dashboard
- Log: Growth, Medications, Milestones
- All dashboard charts
- Recent activity feed with filter/edit/delete
- Unit preference (metric/imperial)

### Phase 3 — Polish & Sharing
- Real-time sync via WebSockets
- CSV export
- OAuth (Google, Apple)
- Photo uploads for milestones
- PWA support (installable on home screen, offline at-a-glance)

---

## Non-Goals (explicit out of scope)

- Native iOS/Android apps (PWA covers mobile)
- Medical advice or percentile charts (growth tracking only)
- Billing or multi-tenant SaaS features
- Public-facing baby pages / social sharing
