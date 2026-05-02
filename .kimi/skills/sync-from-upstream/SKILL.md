---
name: sync-from-upstream
description: Sync shared feature changes from the cloud repo (upstream) into the self-hosted fork.
---

Sync shared feature changes from `babything-cloud` (upstream) into `babything-selfhosted`.

This skill handles the fork-and-merge workflow. It is run from the **self-hosted fork** working directory.

## Prerequisites

- You are in the `babything-selfhosted` repo
- `git remote -v` shows `upstream` pointing to the cloud repo
- Working tree is clean (no uncommitted changes)

## Quick Command

```bash
git fetch upstream && git merge upstream/main
```

## Step-by-Step Workflow

### 1. Check working tree

```bash
git status
```

If there are uncommitted changes, commit or stash them first.

### 2. Fetch and merge upstream

```bash
git fetch upstream
git merge upstream/main
```

### 3. Resolve merge conflicts

These files diverge permanently and will conflict on most merges:

| File | Resolution |
|------|------------|
| `api/src/lib/mode.ts` | Keep self-hosted hardcoding: `isCloud = false`, `isSelfHosted = true` |
| `api/src/index.ts` | Keep self-hosted route imports (no `internalRouter`, no operator routes). Keep mTLS block removed. Accept new shared route imports if upstream added any. |
| `web/src/pages/AdminSettings.tsx` | Keep self-hosted tab list (stream, smtp, oauth, dev always visible). Accept new shared admin sections if upstream added any. |
| `docker-compose.yml` | Keep self-hosted service list (no provisioning/landing/operator). Accept new env vars for shared services if upstream added any. |
| `.env.example` | Keep self-hosted variable list. Accept new shared env vars if upstream added any. |
| `README.md` / `DEPLOYMENT.md` / `AGENTS.md` | Keep self-hosted docs. Do not accept cloud-only deployment instructions. |

**Cloud-only files deleted in self-hosted** (e.g., `platform/landing/*`, `platform/provisioning/*`, `platform/operator/*`, `api/src/routes/internal.ts`, `api/src/routes/operator-*.ts`, etc.):
- If upstream modified them: resolve by keeping the deletion (`git rm <file>`)
- If upstream added **new** cloud-only files: delete them after merge

### 4. Review new upstream files

After resolving conflicts, check if upstream added files that should not exist in self-hosted:

```bash
git diff --name-status upstream/main...HEAD | grep "^A"
```

Delete any cloud-only files that were added (new landing pages, new operator routes, etc.).

### 5. Verify build

```bash
cd api && npx tsc --noEmit
cd ../web && npx tsc --noEmit
```

Fix any type errors caused by divergent code paths.

### 6. Test the happy path

```bash
docker compose up -d --build
```

Verify:
- API `/health` responds
- First-run wizard loads
- Admin Settings shows Monitor, SMTP, OAuth, Dev tabs

### 7. Commit the merge

```bash
git add -A
git commit -m "merge(upstream): sync shared features from babything-cloud"
```

## Common Scenarios

### Upstream added a new shared API route

1. The new route file merges cleanly (it lives in `api/src/routes/`)
2. `api/src/index.ts` will conflict because upstream imported and mounted the new route
3. Resolution: accept the new import and mount statement in `api/src/index.ts`, keeping all other self-hosted deletions

### Upstream modified a cloud-only file that self-hosted deleted

Git will report: `deleted by us` / `modified by them`

Resolution:
```bash
git rm <file>
```

### Upstream added a new cloud-only model to Prisma schema

The schema merges cleanly because both repos keep the unified schema. The self-hosted fork simply will not use the new cloud-only table. No action needed.

### Upstream added a new field to a shared Prisma model

The schema merges cleanly. Both repos get the new field. No action needed.

## Troubleshooting

**Merge aborts with "refusing to merge unrelated histories"**
```bash
git merge upstream/main --allow-unrelated-histories
```

**Too many conflicts to handle manually**
Consider using a merge tool:
```bash
git mergetool
```

**Want to see what upstream changed before merging**
```bash
git log HEAD..upstream/main --oneline
```
