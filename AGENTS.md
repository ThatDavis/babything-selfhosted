# Agent Instructions — Babything

> Context for AI agents working on the Babything codebase.
> Human contributors: see `README.md` for setup and contribution guidelines.

---

## Project Overview

Babything is a newborn tracking app for families and caregivers.

**This repository (`babything-selfhosted`) is the free self-hosted version.** Run it on your own hardware with Docker — no subscription, no cloud, your data stays with you.

For the cloud/SaaS version with Stripe billing and custom subdomains, see the [`babything-cloud`](https://github.com/ThatDavis/babything-cloud) repository.

Shared feature changes flow from the cloud repo (upstream) to this repo via git merge. When syncing, resolve conflicts in mode-specific files (`api/src/lib/mode.ts`, `api/src/index.ts`, `web/src/pages/AdminSettings.tsx`, `docker-compose.yml`, `.env.example`, docs) in favor of self-hosted.

Key docs to check before making changes:
- **`REQUIREMENTS.md`** — Feature specs and user flows
- **`SUBSCRIPTION_ROADMAP.md`** — Cloud architecture, business model, and long-term roadmap
- **`PROGRESS.md`** — Current build status, completed phases, what's next
- **`STANDARDS.md`** — Coding standards and conventions
- **`DEVELOPMENT.md`** — Git workflow and deployment procedures

---

## Development Workflow

All agents working on this project follow this git discipline. It should be mostly invisible to the user — they should not be interrupted with commit announcements unless they explicitly ask for a status update.

### Silent auto-commits
- After every 1–3 files changed, or after completing a logical sub-task, stage and commit automatically.
- Do **not** announce these micro-commits to the user.
- Use conventional commit format: `type(scope): description` (e.g., `fix(api): correct tenant lookup logic`, `feat(ui): add pricing toggle`).
- If a remote exists, push the branch after each commit so the PR stays up to date.

### Branching for larger work
Before starting any feature or refactor, assess size:
- **Large**: touches >3 files, introduces new API routes, database changes, new pages/components, or is expected to take more than one focused session → create a feature branch first: `git checkout -b feature/short-descriptive-name`
- **Small**: typo fixes, copy changes, single-file tweaks, or simple config updates → work directly on the current branch
- When a feature branch is complete, **open a Pull Request** for human review. Never merge directly to `main` locally. Provide a clear PR description covering:
  - What changed and why
  - Which files were touched
  - Any testing performed
  - Link to relevant plan.md / PROGRESS.md items

### Plan maintenance
- `PROGRESS.md` must be updated after every work session: mark completed items, add newly discovered tasks, update the `Last updated:` date.
- If a phase is fully complete, move its items to the `## Completed` section with the completion date.
- New bugs or requirements discovered during work should be added to the appropriate phase immediately.

---

## How to help

- Always write code that a non-technical person can understand and maintain
- Prefer simple and working over clever and fragile
- Make minimal edits — change only the lines that need changing. Use `StrReplaceFile` for surgical edits rather than rewriting whole files
- Explain tradeoffs in plain English before making significant technical decisions
- When requirements are ambiguous, check `REQUIREMENTS.md` for the user flow and edge cases
- Keep `PROGRESS.md` and `SUBSCRIPTION_ROADMAP.md` updated as features are completed

---

## Architecture Notes

### Dual-repo architecture
Babything is split into two repositories:
- **`babything-cloud`** (upstream) — Multi-tenant SaaS. Subdomain routing, Stripe billing, operator dashboard, landing page, provisioning service.
- **`babything-selfhosted`** (this repo) — Single-tenant self-hosted. RTSP baby monitor, configurable SMTP, generic OAuth providers.

Shared code (core API routes, frontend pages, Prisma schema) is kept in sync via fork-and-merge from the cloud repo (upstream) to this repo.

**When working on this repo:** You are building self-hosted-only features or syncing shared features from upstream. Do not add cloud-only code paths (Stripe, tenant subdomain resolution, operator dashboard, Resend email). Those belong in the cloud repo.

### Service layout
| Service | Path | Port | Purpose |
|---------|------|------|---------|
| Main API | `api/` | 3001 | Users, babies, events, auth, real-time sync |
| Web app | `web/` | 80 | React frontend (self-hosted + cloud) |
| Landing | `platform/landing/` | 80 | Marketing site + customer dashboard |
| Provisioning | `platform/provisioning/` | 3002 | Stripe billing, tenant lifecycle |
| Nginx | `nginx/` | 80 | Reverse proxy, SSL, subdomain routing |

### Email delivery

The mailer supports two SMTP providers in priority order:

1. **Env-based SMTP** — `SMTP_HOST` env var set → uses `nodemailer`
   - `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`

2. **DB-based SMTP** — configured via Admin Settings → SMTP tab
   - Stored in `SmtpConfig` table
   - Falls back to this when env SMTP is not configured

If no provider is configured, transactional emails silently fail (best-effort) except for report emails which require a configured provider.

### Email templates
Transactional emails use hardcoded default templates in `api/src/lib/mailer.ts`.

- **Template names:** `welcome`, `invite`, `password_reset`, `report`
- **Variable syntax:** `{{variableName}}` — plain string substitution in `api/src/lib/mailer.ts`
- **Adding a new email type:**
  1. Add a `sendXEmail` function in `api/src/lib/mailer.ts` using `sendEmail`
  2. Add a default template in the fallback object
  3. Update `PROGRESS.md`



### Key files for common tasks
- Tenant resolution: `api/src/middleware/tenant.ts`
- Auth & JWT: `api/src/middleware/auth.ts`
- Admin routes: `api/src/routes/admin.ts`
- Prisma schema: `api/prisma/schema.prisma`
- Email sending & templates: `api/src/lib/mailer.ts`
 