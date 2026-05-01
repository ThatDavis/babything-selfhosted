---
name: feature-workflow
description: Manage the full lifecycle of a feature branch — from creation to merge.
---

Manage the full lifecycle of a feature branch — from creation to merge.

---

## `/start-feature` — Create a new feature branch

Before writing any code:

1. Check the current git branch. If not on `main`, warn the user and ask if they want to switch.
2. Check for uncommitted changes. If any exist, show `git status --short` and refuse to proceed until they are committed or stashed.
3. Pull the latest `main` from origin.
4. Ask the user for a short feature name (e.g. "csv-export", "tenant-middleware").
5. Sanitize the name: lowercase, replace spaces with hyphens, remove special characters.
6. Create and check out `feature/<sanitized-name>`.
7. If the feature involves `plan.md` items, update the relevant checkboxes to `[in_progress]` or add a note.
8. Summarize what was done and list the next steps (make changes, commit often, run `/finish-feature` when done).

Never start coding before the branch is created.

---

## `/finish-feature` — Merge the current feature branch into `main`

1. Check the current branch. If on `main`, error out — this must be run from a feature branch.
2. Check for uncommitted changes. If any exist, show `git status --short` and refuse to proceed.
3. Show a summary of commits on this branch with `git log --oneline main..HEAD`.
4. Ask the user to confirm they are ready to merge.
5. Switch to `main` and pull latest from origin.
6. Perform a **squash merge** of the feature branch into `main`:
   ```bash
   git merge --squash <branch-name>
   ```
7. Prompt the user for a final commit message. Default to something like:
   ```
   feat(scope): description of the feature
   ```
   Include a body if the feature is complex.
8. Commit the squash merge.
9. Show the last 3 commits on `main`.
10. Ask if they want to push `main` to origin.
11. Ask if they want to delete the local feature branch.
12. Update `plan.md` if relevant items were completed (mark checkboxes `[x]`).

Rules:
- Always use squash merge for features. This keeps `main` history clean.
- Never force push `main`.
- If merge conflicts occur, stop and ask the user how to resolve them.
