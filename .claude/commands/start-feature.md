Start a new feature branch following the project's git workflow.

Before writing any code:

1. Check the current git branch. If not on `main`, warn the user and ask if they want to switch.
2. Check for uncommitted changes. If any exist, show `git status --short` and refuse to proceed until they are committed or stashed.
3. Pull the latest `main` from origin.
4. Ask the user for a short feature name (e.g., "csv-export", "tenant-middleware").
5. Sanitize the name: lowercase, replace spaces with hyphens, remove special characters.
6. Create and check out `feature/<sanitized-name>`.
7. If the feature involves PROGRESS.md items, update the relevant checkboxes to `[in_progress]` or add a note.
8. Summarize what was done and list the next steps (make changes, commit often, run `./scripts/finish-feature` when done).

Never start coding before the branch is created.
