---
name: security-review
description: Perform a comprehensive security and privacy review of the Babything codebase. Use when the user asks about security audits, privacy improvements, WebRTC/streaming security, vulnerability assessments, data protection, or any request to review, harden, or evaluate the security posture of the application. Also use before releasing major features that touch auth, streaming, payments, or personal data.
---

# Security & Privacy Review

Systematically audit the Babything codebase for security flaws and privacy improvements. Prioritize findings by risk to end users — especially camera/streaming data, personal health data, and child information.

## Severity Levels

- **Critical**: Data breach, unauthorized camera access, privilege escalation, secret exposure
- **High**: Missing auth checks, tenant isolation bypass, insecure defaults, XSS/CSRF vectors
- **Medium**: Defense-in-depth gaps, logging issues, configuration weaknesses, information disclosure
- **Low**: Best-practice deviations, hygiene issues, documentation gaps

## Workflow

### Step 1 — Scope the review

Determine which areas the user cares about:
- **Full audit**: All areas below
- **Streaming focus**: WebRTC, TURN, agent auth, monitor routes
- **Auth focus**: Login, sessions, OAuth, password reset, admin/operator RBAC
- **Data privacy focus**: Encryption, tenant isolation, data retention, PII handling
- **Infra focus**: Docker, nginx, TLS, mTLS, secrets management

If the user does not specify, default to **full audit** but prioritize streaming and auth.

### Step 2 — Read relevant references

Load the reference files that match the scope:
- WebRTC/streaming → `references/webrtc-security.md`
- Auth & sessions → `references/auth-security.md`
- Data privacy & encryption → `references/data-privacy.md`
- Infrastructure → `references/infrastructure-security.md`

Read all references for a full audit.

### Step 3 — Explore the codebase

Use `Agent` with `subagent_type="explore"` to investigate each area. Run explorations in parallel. For each area, search for:
- Implementation of the controls listed in the reference
- Gaps or deviations from the checklist
- Any new code not covered by the reference patterns

Key files to always check:
- `api/src/middleware/*.ts` — auth, tenant, internal, admin, operator
- `api/src/routes/monitor.ts` — WebRTC signaling
- `api/src/routes/auth.ts` — authentication flows
- `api/src/lib/crypto.ts` — encryption
- `api/src/index.ts` — middleware stack, rate limiting, error handling
- `nginx/nginx.cloud.conf` — headers, routing, TLS
- `docker-compose.cloud.yml` — container security, secrets, networks
- `web/src/lib/api.ts` and `web/src/lib/socket.ts` — client-side security
- `.env.example` — secrets and configuration surface

### Step 4 — Analyze findings

For each finding, determine:
1. **What** is the issue (specific file/line if possible)
2. **Why** it matters (attack scenario or privacy impact)
3. **Severity** (Critical / High / Medium / Low)
4. **Fix** — minimal, concrete change or configuration adjustment
5. **Effort** — rough size (1-line config, small refactor, architectural change)

Group findings by severity. Within each severity, order by user impact.

### Step 5 — Report

Produce a structured report:

```markdown
# Security Review — <Scope>

## Executive Summary
2-3 sentences on overall posture and top 3 concerns.

## Critical Findings
| # | Issue | Location | Fix |
|---|---|---|---|

## High Findings
...

## Medium Findings
...

## Low Findings
...

## Positive Controls (what's working well)
- Bullet list of security measures already in place

## Recommendations Roadmap
1. **Immediate** (this session): Critical + easy High
2. **This week**: Remaining High + impactful Medium
3. **This month**: Defense-in-depth Medium + Low
4. **Ongoing**: Monitoring, dependency updates, periodic re-audit
```

### Step 6 — Offer to fix

After presenting the report, ask the user which findings to address. Offer to:
- Fix critical/high issues immediately
- Create a tracking issue or update PROGRESS.md
- Implement defense-in-depth improvements

## Rules

- Never assume security is "fine because it hasn't been attacked."
- For WebRTC specifically: the camera is in someone's home with a baby — treat any unauthorized access as Critical.
- Prefer invisible improvements (headers, defaults, automatic behavior) over user-facing security friction.
- If a finding requires architectural tradeoffs, explain both options before implementing.
- Do not modify the `.env` file or expose real secrets during the review.
- After fixing, verify the fix and update this skill's references if patterns change.
