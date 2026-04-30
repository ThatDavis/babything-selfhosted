Finish the current feature branch and merge it into `main`.

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
12. Update PROGRESS.md if relevant items were completed (mark checkboxes `[x]`).

Rules:
- Always use squash merge for features. This keeps `main` history clean.
- Never force push `main`.
- If merge conflicts occur, stop and ask the user how to resolve them.
