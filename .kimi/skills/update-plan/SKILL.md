---
name: update-plan
description: Review the current state of the project and update plan.md to reflect progress.
---

Review the current state of the project and update `plan.md` to reflect progress. Be thorough but keep the plan readable and useful.

> **Note:** This logic should run automatically after every work session (feature, bugfix, or refactor) per the `Development Workflow` in `AGENTS.md`. It does not need to be announced as a separate step unless the user explicitly asks for a plan review.

## Step 1 — Read current state

Read the following:
- `plan.md` (the existing plan)
- `requirements.md` (what the project is supposed to do)
- Recent git log: `git log --oneline -20 2>/dev/null`
- Any source files that have been created or changed recently

## Step 2 — Identify what's complete

Based on what you read in the codebase and git history, determine which plan items have been implemented. An item is complete when the code for it exists and is reasonably working — not just started.

## Step 3 — Update `plan.md`

Make the following changes to `plan.md`:

1. Move completed items from their phase checkboxes to the `## Completed` section, with the date completed (use today's date if unknown): `- [x] Item name — completed [date]`
2. Mark any items that are partially done with a note: `- [ ] Item name *(in progress)*`
3. If new tasks have emerged from the work done (bugs found, new requirements, dependencies discovered), add them to the appropriate phase.
4. Update the `Last updated:` date at the top of the file.
5. Add a brief note to the `## Notes` section summarizing what phase the project is in and any important decisions made.

## Step 4 — Summarize for the user (only if explicitly asked)

If the user triggered `/update-plan` directly, tell them in plain English:
- What items were marked as complete
- What's next on the plan
- How far along the project is overall (e.g. "You've finished Phase 1 and are about halfway through Phase 2")
- Any blockers or things to watch out for

Keep the tone encouraging and clear. Avoid technical jargon.
