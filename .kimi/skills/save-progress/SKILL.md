---
name: save-progress
description: Save the current state of the project using git. User-visible checkpoint for explicit saves, end of session, or task switches.
---

Save the current state of the project using git. This is the **user-visible** save command — use it when the user explicitly asks to save, at the end of a session, or before switching tasks.

> **Note:** Small auto-commits happen silently during normal work per the `Development Workflow` in `AGENTS.md`. This command is for explicit checkpoints and final saves.

## When to run `/save-progress`
- When the user explicitly says "save" or "commit"
- At the end of a work session
- Before switching to a different task
- Before running risky commands (migrations, dependency updates)
- After completing a major milestone (even if auto-commits already happened)

## Best practices
- **Commit incrementally** — a commit should represent one logical change. Don't batch unrelated changes into a single giant commit.
- **Write clear commit messages** — describe *what* changed and *why* in plain English. Avoid messages like "fix" or "update".
- **Use Conventional Commits** when appropriate:
  - `feat` — new functionality, routes, components
  - `fix` — bug fixes, corrections
  - `docs` — README, comments, markdown files
  - `style` — CSS, formatting, lint fixes
  - `refactor` — restructuring code without changing behavior
  - `test` — adding or updating tests
  - `chore` — dependencies, config, build tooling
  - Scope should be `api`, `web`, `db`, `auth`, `ui`, or the relevant subsystem.
- **Never commit secrets** — ensure `.env`, `orgs.config.json`, and any decrypted secrets are in `.gitignore` before saving.
- **Push if a remote exists** — don't leave work unsaved on the remote for long.

## Steps

### Step 1 — Check what changed

Run `git status` and `git diff --stat HEAD 2>/dev/null || git diff --stat` to see what files have changed.

If there are no changes to save, tell the user "Nothing new to save — your project is already up to date." and stop.

### Step 2 — Generate a commit message

Read the changed files and the existing `plan.md` (if it exists) to understand what work was done. Write a short commit message (1–2 sentences) that describes what changed and why. Avoid technical jargon.

Good examples:
- `feat(auth): add user login page and basic form validation`
- `fix(api): correct bug where submitted forms were not saving`
- `chore(db): set up initial project structure and database connection`

The description should complete the sentence: "This commit will…"

### Step 3 — Stage and commit

1. Stage all tracked and untracked files (excluding anything in `.gitignore`): `git add -A`
2. Commit with the generated message
3. If the user has a remote configured (`git remote -v`), push to it automatically.
   - If on a feature branch and push fails due to no upstream, run `git push --set-upstream origin <branch-name>`.
   - If on `main` (or `master`) and push fails, run `git push --set-upstream origin main` (or `master`).

### Step 4 — Confirm

Tell the user in plain English:
- What was saved (list the key files)
- The commit message used
- Whether it was pushed to the remote or just saved locally (and if local only, remind them it's safe on their machine but not backed up online yet)

If there is no remote configured, gently mention: "Your progress is saved locally. To back it up online (e.g. GitHub), let me know and I can help you set that up."
