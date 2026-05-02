# Agent Instructions — Babything

> Context for AI agents working on the Babything codebase.
> Human contributors: see `README.md` for setup and contribution guidelines.

---

## Project Overview

Babything is a newborn tracking app for families and caregivers.

**This repository (`babything-cloud`) is the cloud/SaaS version.** It is a multi-tenant subscription service with Stripe billing, custom subdomains, and platform-managed infrastructure.

For the free self-hosted version, see the [`babything-selfhosted`](https://github.com/ThatDavis/babything-selfhosted) repository.

Shared feature changes flow from this repo (upstream) to the self-hosted fork via git merge. When adding a shared feature, implement it here first, then sync it downstream.

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
- **`babything-cloud`** (this repo) — Multi-tenant SaaS. Subdomain routing, Stripe billing, operator dashboard, landing page, provisioning service.
- **`babything-selfhosted`** — Single-tenant self-hosted. RTSP baby monitor, configurable SMTP, generic OAuth providers.

Shared code (core API routes, frontend pages, Prisma schema) lives in both repos and is kept in sync via fork-and-merge from this repo (upstream) to the self-hosted fork.

**When working on this repo:** You are building cloud-only features. Do not add self-hosted-only code paths (monitor, SMTP UI, generic OAuth providers). Those belong in the self-hosted fork.

### Service layout
| Service | Path | Port | Purpose |
|---------|------|------|---------|
| Main API | `api/` | 3001 | Users, babies, events, auth, real-time sync |
| Web app | `web/` | 80 | React frontend (self-hosted + cloud) |
| Landing | `platform/landing/` | 80 | Marketing site + customer dashboard |
| Provisioning | `platform/provisioning/` | 3002 | Stripe billing, tenant lifecycle |
| Nginx | `nginx/` | 80 | Reverse proxy, SSL, subdomain routing |

### Email delivery

The mailer supports two providers in priority order:

1. **Resend API** — `RESEND_API_KEY` env var set → uses Resend SDK
   - Primary provider for cloud deployments
   - `FROM_EMAIL` and `FROM_NAME` env vars control sender identity

2. **Env-based SMTP** — `SMTP_HOST` env var set → uses `nodemailer`
   - Fallback when Resend is not configured
   - `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`

If no provider is configured, transactional emails silently fail (best-effort) except for report emails which require a configured provider.

### Email templates
All transactional emails are driven by the `EmailTemplate` table (`api/prisma/schema.prisma`).

- **Template names:** `welcome`, `invite`, `password_reset`, `report`
- **Variable syntax:** `{{variableName}}` — plain string substitution in `api/src/lib/mailer.ts`
- **Fallback behavior:** If no custom template exists in the DB, the mailer falls back to hardcoded defaults
- **Operator editing:** Global admins can edit templates via the **Email Templates** tab in the operator dashboard (`platform/operator/src/pages/DashboardPage.tsx`)
- **Adding a new email type:**
  1. Add a `sendXEmail` function in `api/src/lib/mailer.ts` using `sendEmail`
  2. Add the template name + variables to the built-in list in `TemplatesTab`
  3. Add a default template in the fallback object
  4. Update `PROGRESS.md` and `SUBSCRIPTION_ROADMAP.md`

### Operator dashboard permissions
Sections (tabs) in the operator dashboard are config-driven via `api/src/lib/operator-permissions.ts`.

- **Config:** `SECTION_PERMISSIONS` maps section IDs (`tenants`, `audit`, `operators`, `discounts`, `templates`) to arrays of allowed `OperatorRole`
- **Global admin bypass:** `GLOBAL_ADMIN` always has access to all sections regardless of the config
- **Unassigned sections:** If a section is not in the map or has an empty roles array, it is inaccessible to everyone except `GLOBAL_ADMIN`
- **Frontend:** Tabs are rendered based on the `permissions` array returned by `GET /operator/auth/permissions`. The auth context in `platform/operator/src/App.tsx` fetches this on login.
- **Backend:** API routes still use `requireOperatorRole()` middleware for action-level enforcement.
- **Adding a new section:**
  1. Add the section + roles to `SECTION_PERMISSIONS` in `api/src/lib/operator-permissions.ts`
  2. Add the tab button in `DashboardPage.tsx` gated by `permissions.includes('sectionId')`
  3. Add the tab content rendering block
  4. Protect backend routes with `requireOperatorRole(...)`
  5. Update `PROGRESS.md` and `SUBSCRIPTION_ROADMAP.md`

### Key files for common tasks
- Tenant resolution: `api/src/middleware/tenant.ts`
- Auth & JWT: `api/src/middleware/auth.ts`
- Admin routes: `api/src/routes/admin.ts`
- Internal API (provisioning ↔ main app): `api/src/routes/internal.ts`
- Prisma schema: `api/prisma/schema.prisma`
- Landing API client: `platform/landing/src/lib/api.ts`
- Email sending & templates: `api/src/lib/mailer.ts`
 