Commit the current changes following the project's conventional commit standards.

1. Show `git status --short` so the user sees what will be committed.
2. If there are no changes, say so and exit.
3. Stage changes with `git add -A` (or let the user specify which files if they want).
4. Determine the commit type and scope based on the files changed:
   - `feat` — new functionality, routes, components
   - `fix` — bug fixes, corrections
   - `docs` — README, comments, markdown files
   - `style` — CSS, formatting, lint fixes
   - `refactor` — restructuring code without changing behavior
   - `test` — adding or updating tests
   - `chore` — dependencies, config, build tooling
   - Scope should be `api`, `web`, `db`, `auth`, `ui`, or the relevant subsystem.
5. Write a concise commit message in Conventional Commits format:
   ```
   type(scope): short description in imperative mood
   ```
   Example: `feat(api): add CSV export endpoint with ZIP generation`
6. If the change is large or complex, add a body explaining the "why" and any trade-offs.
7. Run `git commit` with the composed message.
8. Show the last 3 commits with `git log --oneline -3`.

Rules:
- Keep commits atomic — one logical change per commit.
- The description should complete: "This commit will…"
- Never use vague messages like "update", "fix stuff", or "wip".
