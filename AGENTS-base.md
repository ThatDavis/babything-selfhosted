## Development Workflow

All agents working on this project follow this git discipline. It should be mostly invisible to the user — they should not be interrupted with commit announcements unless they explicitly ask for a status update.

### Silent auto-commits
- After every 1–3 files changed, or after completing a logical sub-task, stage and commit automatically.
- Do **not** announce these micro-commits to the user.
- Use conventional commit format: `type(scope): description` (e.g. `fix(api): correct location lookup logic`, `refactor(ui): simplify destination display`).
- If a remote exists, push the branch after each commit so the PR stays up to date.

### Branching for larger work
Before starting any feature or refactor, assess size:
- **Large**: touches >3 files, introduces new API routes, database changes, new pages/components, or is expected to take more than one focused session → create a feature branch first: `git checkout -b feature/short-descriptive-name`
- **Small**: typo fixes, copy changes, single-file tweaks, or simple config updates → work directly on the current branch
- When a feature branch is complete, **open a Pull Request** for human review. Never merge directly to `main` locally. Provide a clear PR description covering:
  - What changed and why
  - Which files were touched
  - Any testing performed
  - Link to relevant plan.md items

### Plan maintenance
- `plan.md` must be updated after every work session: mark completed items, add newly discovered tasks, update the `Last updated:` date.
- If a phase is fully complete, move its items to the `## Completed` section with the completion date.
- New bugs or requirements discovered during work should be added to the appropriate phase immediately.

## How to help
- Always write code that a non-technical person can understand and maintain
- Prefer simple and working over clever and fragile
- Make minimal edits — change only the lines that need changing. Use `StrReplaceFile` for surgical edits rather than rewriting whole files
- Explain tradeoffs in plain English before making significant technical decisions
- When requirements are ambiguous, check requirements.md for the user flow and edge cases
- Keep plan.md updated as features are completed — mark items done, move to Completed section
- The Graph API app registration uses **client credentials flow** — never use delegated/user auth for background jobs or Entra group changes
- All email goes through Graph API Mail.Send, not SMTP
- Signed approval tokens must be single-use and checked for expiry before honoring
- The nightly cron job must log every action to the audit log, including failures