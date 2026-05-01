---
name: add-feature
description: Help the user add a new feature to the project — from planning through implementation. The feature name or description may be passed as an argument.
---

Help the user add a new feature to the project — from planning through implementation. The feature name or description may be passed as an argument: $ARGUMENTS

## Step 0 — Assess size and branch if needed

Before writing any code, determine whether this feature is **large**:
- Will it touch more than 3 files?
- Does it introduce new API routes, database changes, or major UI components?
- Will it take more than one focused session to complete?

If **large**: create a feature branch immediately: `git checkout -b feature/<short-descriptive-name>`. Tell the user: "This looks like a larger feature, so I've created a branch to work on it safely."

If **small**: work directly on the current branch.

## Step 1 — Understand the feature

If `$ARGUMENTS` is empty, ask the user: "What feature would you like to add? Describe it in plain English."

Otherwise, use `$ARGUMENTS` as the feature description. Ask 1–2 clarifying questions if anything is ambiguous:
- Who uses this feature?
- What should happen when it works correctly?

Keep questions minimal — don't over-interrogate.

## Step 2 — Check for conflicts or dependencies

Read `plan.md` and `requirements.md`. Confirm:
- This feature doesn't contradict existing requirements
- Any prerequisites are already complete (if not, flag them)

## Step 3 — Update `plan.md`

Add the new feature to the most appropriate phase in `plan.md`. Break it into 2–4 sub-tasks if it's complex. Update the `Last updated:` date and add a note to `## Notes` about why this was added.

Example sub-tasks format:
```
## Phase 2 — Core Features
- [ ] [New feature name]
  - [ ] Sub-task 1
  - [ ] Sub-task 2
```

## Step 4 — Implement the feature

Build the feature now, following these principles:
- Write simple, readable code
- Prefer working over clever
- Make minimal edits — change only the lines that need changing. Use `StrReplaceFile` for surgical edits rather than rewriting whole files
- Test the happy path and at least one error case before declaring done
- If a UI is involved, verify it visually before finishing
- **Commit silently and incrementally** — after each significant sub-task or logical chunk of work, stage and commit automatically per the `Development Workflow` in `AGENTS.md`. Do not announce these micro-commits to the user.

## Step 5 — Update plan and save

1. Run `/update-plan` logic: mark the new feature's sub-tasks complete as they are done.
2. Run `/save-progress` logic: commit any remaining uncommitted changes with a clear message. This is the user-visible checkpoint.
   - If you already committed incrementally during Step 4, this may just be a small final commit or nothing at all.
3. If a feature branch was created in Step 0, push it to the remote and **open a Pull Request** for human review. Do not merge locally.
   - PR title: same as the feature name or final commit message
   - PR description: summarize what changed, why, which files were touched, and any testing done
   - Provide the user with the branch name and a link (or instructions) to open the PR in their git web interface

## Step 6 — Confirm with the user

Tell the user:
- What was built
- How to try it / see it
- What's next on the plan
