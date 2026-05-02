---
name: fix-bug
description: Investigate, diagnose, and fix bugs or errors in the codebase. Use when the user reports a bug, crash, error message, unexpected behavior, 500/502/404 responses, test failures, or any issue where something is not working correctly. Also use for regression fixes or when investigating why a feature stopped working.
---

Investigate and fix bugs methodically without making premature assumptions.

## Step 0 — Branch setup

1. Check the current branch. If on `main`, create a bug-fix branch immediately:
   ```bash
   git checkout -b fix/<short-descriptive-name>
   ```
   If already on a feature branch, ask the user whether to branch from here or switch to `main` first.
2. If there are uncommitted changes, show `git status --short` and ask the user to commit or stash before proceeding.

## Step 1 — Gather data (no assumptions)

Do not guess the root cause yet. Collect information from the user and the system:

1. **What exactly failed?** Ask the user to share:
   - The full error message or stack trace
   - The URL, endpoint, or file where it happened
   - Steps to reproduce
   - Browser console / network tab screenshots if applicable
   - When it started failing (recent deploy? code change?)
2. **What should happen instead?** Clarify the expected behavior.
3. **Check environment:** Is this local dev, staging, or production?
4. **Check logs:** If the user has not provided logs, ask for:
   - Container logs (`docker logs <container>`)
   - Server logs
   - Recent CI/CD failures
   - Application error logs

If the user provides an image or screenshot, read it carefully and extract all relevant text.

## Step 2 — Explore and form hypotheses

Once data is collected, investigate the codebase to generate 2–4 possible causes. For each hypothesis, explain:
- What evidence supports it
- What evidence contradicts it
- What file(s) would need to change

Present these options to the user clearly:
```
Option A: [short description]
  Evidence for: ...
  Evidence against: ...
  Likely fix: ...

Option B: [short description]
  ...
```

If only one hypothesis is plausible after investigation, still frame it as "the most likely cause" rather than a certainty.

## Step 3 — Ask before fixing

Ask the user which hypothesis to pursue, or if they want to gather more data first.

Do not write any code until the user confirms which path to take.

## Step 4 — Implement the fix

1. Make the minimal change required to fix the bug. Change only the lines that need changing.
2. Add or update tests to cover the fix.
3. Verify the fix:
   - Run relevant tests
   - Reproduce the original failure and confirm it is resolved
   - Check that related functionality still works
4. Commit incrementally with clear messages (e.g., `fix(api): handle null billingPeriod in tenant query`).

## Step 5 — Open a Pull Request

1. Push the branch to origin.
2. Open a PR against `main`:
   - Title: `fix(scope): description`
   - Body:
     - What bug was fixed
     - Root cause
     - How the fix was verified
     - Any follow-up needed
3. Provide the PR URL to the user.

Do not merge the PR without user approval.
