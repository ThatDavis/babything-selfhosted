# Development Workflow

> Standardized git practices for the Babything project.

---

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code. Always deployable. |
| `feature/*` | New features, enhancements. |
| `hotfix/*` | Urgent production fixes. |

**Rules:**
- Never commit directly to `main`.
- All work happens on feature or hotfix branches.
- Keep branches focused — one feature per branch.

---

## Starting Work

### New Feature

```bash
./scripts/start-feature <feature-name>
```

This:
1. Ensures you're on a clean `main`
2. Pulls latest from origin
3. Creates and checks out `feature/<name>`

### Hotfix (urgent production fix)

```bash
./scripts/hotfix <description>
```

This creates `hotfix/<description>` from latest `main`.

---

## Committing

### Using the helper

```bash
./scripts/commit
```

This interactively guides you through:
- Selecting commit type (`feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`)
- Entering scope (e.g., `api`, `web`, `auth`)
- Writing a short description
- Staging and committing

### Commit Standards

Follow **Conventional Commits**:

```
type(scope): short description

[optional body]
```

**Types:**
- `feat` — new feature
- `fix` — bug fix
- `docs` — documentation changes
- `style` — formatting, semicolons, etc.
- `refactor` — code change that neither fixes a bug nor adds a feature
- `test` — adding or updating tests
- `chore` — build process, dependencies, tooling

**Rules:**
- Keep commits small and atomic. One logical change per commit.
- The description should complete this sentence: "This commit will…"
- Bad: `update` — Good: `feat(csv): add date range filter to export endpoint`

---

## Finishing Work

### Feature Completion

```bash
./scripts/finish-feature
```

This:
1. Shows commits on your feature branch
2. Squash merges into `main` (clean history)
3. Prompts for a final commit message
4. Pushes `main` to origin
5. Deletes the local feature branch

**Why squash?** Features often have many small commits (`wip`, `fix typo`, `review feedback`). Squashing keeps `main` clean and readable.

### Hotfix Completion

```bash
./scripts/finish-hotfix
```

This uses a **regular merge** (`--no-ff`) instead of squash. Hotfixes are usually single commits, and preserving them in history makes it easy to cherry-pick or reference later.

---

## Quick Reference

| Task | Command |
|------|---------|
| Start feature | `./scripts/start-feature csv-export` |
| Commit changes | `./scripts/commit` |
| Finish feature | `./scripts/finish-feature` |
| Start hotfix | `./scripts/hotfix fix-login-bug` |
| Finish hotfix | `./scripts/finish-hotfix` |

---

## Manual Workflow (if scripts fail)

```bash
# Start feature
git checkout main
git pull origin main
git checkout -b feature/my-feature

# Commit
git add -A
git commit -m "feat(api): add export endpoint"

# Finish feature
git checkout main
git pull origin main
git merge --squash feature/my-feature
git commit -m "feat: add CSV export"
git push origin main
git branch -D feature/my-feature
```

---

## Cloud Development Notes

When working on the multi-tenant cloud architecture, follow the same branch rules but scope your commits:

- `feat(tenant): add RLS middleware`
- `feat(provision): create Stripe webhook handler`
- `feat(landing): add pricing page`

This makes it easy to see which part of the system changed at a glance.
