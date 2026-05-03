# 🔐 Security Remediation Plan — Babything Cloud

**Created:** 2026-05-02  
**Based on:** `security_findings.md` (commit `c1441c7`)  
**Status tracking:** `[ ]` = Not started / `[~]` = In progress / `[x]` = Complete

> Update this file after each work session. Mark items done, add notes, and move blocked items with reasons.

---

## Phase 1 — Immediate (Fix This Session)

Small, surgical fixes with no architectural changes. Each is 1–3 files.

| ID | Finding | Files to Touch | Change | Status |
|----|---------|----------------|--------|--------|
| C1 | Admin export leaks `passwordHash` | `api/src/routes/admin.ts:376` | Add `select` to `prisma.user.findMany` excluding `passwordHash` and other sensitive fields | `[ ]` |
| C7 | `encryptOptional` plaintext fallback | `api/src/lib/crypto.ts` | Make `encrypt()` throw unconditionally. Change `encryptOptional`/`decryptOptional` to throw in production (`NODE_ENV === 'production'`), return plaintext only in dev. | `[ ]` |
| C5 | Agent WebSocket broken in cloud | `nginx/nginx.cloud.conf` | Add `location /monitor/agent` block with WebSocket upgrade headers proxying to API upstream | `[ ]` |
| H4 | No global Express error handler | `api/src/index.ts` | Add `app.use((err, req, res, next) => { ... })` at end of middleware stack. Return generic `"Internal server error"` in production, log full error server-side. | `[ ]` |
| H9 | `InviteToken` FK blocks deletion | `api/prisma/schema.prisma:113` | Add `onDelete: Cascade` to `InviteToken.creator` → `User` relation. Run `prisma migrate dev`. | `[ ]` |

**Phase 1 notes:**

- 

---

## Phase 2 — This Week

Auth and streaming hardening. Some items require new code paths but no data migrations.

| ID | Finding | Files to Touch | Change | Status |
|----|---------|----------------|--------|--------|
| C3 | Shared `JWT_SECRET` users/operators | `api/src/middleware/auth.ts`, `operator-auth.ts`, `api/src/routes/operator-auth.ts`, `api/.env.example` | Add `OPERATOR_JWT_SECRET` env var. Sign operator tokens with it. Verify `aud: 'operator'` claim in operator middleware. Update `.env.example` and boot validation. | `[ ]` |
| C4 | Generic OAuth missing `state` validation | `api/src/routes/auth.ts:398-463` | Store `state` in Redis (key: `oauth:state:<nanoid>`, TTL 10m) or signed cookie. Validate on callback, delete after use. Reject if missing or mismatch. | `[ ]` |
| C6 | Any user can start watch session | `api/src/routes/monitor.ts:104`, `api/src/middleware/auth.ts` | Add `requireBabyAccess` or check `BabyCaregiver` with `acceptedAt` before allowing `/monitor/watch`. | `[ ]` |
| C8 | OAuth pre-hijacking via auto-linking | `api/src/routes/auth.ts:449-452` | Before linking OAuth to existing local account, require password re-auth or send email verification. If user exists with matching email, redirect to "link account" flow instead of auto-linking. | `[ ]` |
| H1 | 30-day agent token with no revocation | `api/src/routes/monitor.ts:60-66`, `api/src/routes/monitor.ts` (WS handler) | Reduce `expiresIn` to `'24h'`. Add Redis blocklist: on token generation, store `jti` in Redis with TTL matching expiry. On agent WS connect, check blocklist. Add `POST /monitor/token/revoke` endpoint. | `[ ]` |
| H3 | Watch session memory leak / no cleanup | `api/src/routes/monitor.ts:104-124`, `186-189`, `343-352` | Add `lastActivity` timestamp to watch sessions. Use `setInterval` to prune stale sessions (not just on creation). On `req.on('close')`, delete the watch session from `watches` Map. On agent disconnect, delete all watch sessions for that tenant. Cap `resolvers` array size. | `[ ]` |
| C2 | CA private key in runtime containers | `docker-compose.cloud.yml:79,133` | Change volume mounts from `./certs:/certs:ro` to explicit file mounts: `./certs/api-server.crt:/certs/api-server.crt:ro`, etc. Only mount `ca.crt`, never `ca.key`, into runtime containers. | `[ ]` |
| H10 | Agent disconnect leaves dangling watches | `api/src/routes/monitor.ts:343-352` | In `cleanup()` function, iterate `watches` Map and delete entries where `watch.tenantId === agent.tenantId`. Resolve any pending resolvers first. | `[ ]` |

**Phase 2 notes:**

- 

---

## Phase 3 — This Month (Defense-in-Depth)

Bigger changes: middleware updates, nginx hardening, backup encryption, infrastructure improvements.

| ID | Finding | Files to Touch | Change | Status |
|----|---------|----------------|--------|--------|
| H2 | Prisma `update`/`delete`/`upsert` tenant bypass | `api/src/lib/tenant-prisma-middleware.ts:87-90` | Remove the `if (model === 'update' ... ) return` skip. Add tenant scoping for `update`, `delete`, `upsert`. Test all admin/operator routes that use these operations to ensure they still work. | `[ ]` |
| H5/M8 | Static TURN credentials exposed | `api/src/routes/monitor.ts:88-101`, `docker-compose.cloud.yml` (coturn) | Generate ephemeral TURN credentials using shared-secret HMAC: `username = <timestamp>:<tenantId>`, `credential = HMAC(key, username)`. Configure coturn with `static-auth-secret`. Only return time-limited creds in `/monitor/config`. | `[ ]` |
| H6 | No server-side session invalidation | `api/src/routes/auth.ts:185-192`, `api/src/routes/auth.ts:241-244` | Maintain Redis set `token:blocklist:<jti>` with TTL = token remaining expiry. Check blocklist in `requireAuth`. On logout and password change, add token `jti` to blocklist. | `[ ]` |
| H7 | Backups unencrypted | `scripts/backup` | Add `gpg --symmetric --cipher-algo AES256 --compress-algo 1` before S3 upload. Prompt for passphrase or read from `BACKUP_ENCRYPTION_KEY` env var. Add `trap` to clean up `/tmp` files on exit. | `[ ]` |
| H8 | No audit logging for stream access | `api/src/routes/monitor.ts:52-66`, `104-124`, `273-292`, `343-352` | Add `audit()` calls for: token generated, agent connected, agent disconnected, watch session created. Include IP and userId in details. | `[ ]` |
| M1 | Missing security headers | `nginx/nginx.cloud.conf`, `web/nginx.conf`, `platform/landing/nginx.conf`, `platform/operator/nginx.conf` | Add `add_header Content-Security-Policy "default-src 'self'; ...";`, `add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";`, `add_header Permissions-Policy "camera=(), microphone=(), geolocation=()";`. Add `server_tokens off;` to all nginx configs. | `[ ]` |
| M2 | Containers run as root | All `Dockerfile`s | Add `RUN adduser -D -u 1000 appuser` and `USER appuser` (or `USER node`/`USER nginx` where applicable). Ensure file permissions allow reading. | `[ ]` |
| M3/M4 | Rate limiting gaps | `api/src/index.ts` | Add a general API rate limiter (e.g., 100 req/min per IP) and apply `authLimiter` to generic OAuth routes `/auth/oauth/:name/start` and `/auth/oauth/:name/callback`. Add specific limiter for `/monitor/*` endpoints. | `[ ]` |
| M10 | No dependency security scanning | `.github/workflows/build.yml`, `.github/dependabot.yml` | Add `npm audit` step to CI (fail on high/critical). Create `.github/dependabot.yml` for weekly dependency updates. | `[ ]` |
| M11 | mTLS certs valid 10 years | `scripts/generate-mtls-certs:16` | Change `DAYS=3650` to `DAYS=365`. Document rotation procedure in `DEPLOYMENT.md`. | `[ ]` |
| M12 | SHA-256 used as KDF | `api/src/lib/crypto.ts:14` | Replace `crypto.createHash('sha256')` with `crypto.pbkdf2Sync(raw, salt, 100000, 32, 'sha256')` or `crypto.hkdfSync('sha256', raw, salt, 'babything-enc', 32)`. Requires migration of existing encrypted values or dual-read support. | `[ ]` |
| M14 | MonitorTab doesn't cleanup on unmount | `web/src/pages/tabs/MonitorTab.tsx` | Add `useEffect` cleanup: close `RTCPeerConnection`, clear `icePollRef` interval, abort pending fetches. | `[ ]` |
| M15 | Watch session pruning deficient | `api/src/routes/monitor.ts` | Same as H3 — use `setInterval` for periodic cleanup and `lastActivity` tracking. | `[ ]` |
| M17 | Missing tenant check on agent signaling | `api/src/routes/monitor.ts:323-334` | Add `if (watch.tenantId !== agent.tenantId) return` before processing `answer` and `ice` messages from agent. | `[ ]` |
| M18 | Agent token displayed unmasked in UI | `web/src/pages/tabs/MonitorTab.tsx:235-236` | Mask token display with `••••••••` and add a "Show token" toggle that reveals it temporarily. | `[ ]` |
| M19 | `STRIPE_BYPASS` no prod safeguard | `platform/provisioning/src/routes/tenants.ts:29` | Add runtime check: if `NODE_ENV === 'production' && STRIPE_BYPASS` is set, throw an error or log a critical warning and refuse to start. | `[ ]` |
| M20 | Trust proxy unsafe default | `api/src/index.ts:52-55` | Change default behavior: if `TRUSTED_PROXIES` is unset in production, trust only `loopback` instead of potentially all proxies. | `[ ]` |

**Phase 3 notes:**

- 

---

## Phase 4 — Ongoing / Process

| Task | Description | Status |
|------|-------------|--------|
| Document data classification | Add section to `REQUIREMENTS.md` or `STANDARDS.md` classifying baby data, health data, camera streams, PII | `[ ]` |
| Add `security.txt` | Create `platform/landing/public/.well-known/security.txt` with contact info and disclosure policy | `[ ]` |
| Quarterly security re-audit | Re-run `security-review` skill every 3 months or after major feature releases | `[ ]` |
| Dependency update automation | Monitor Dependabot PRs, review `npm audit` output weekly | `[ ]` |
| Backup restore testing | Document and execute a test restore from S3 backup monthly | `[ ]` |
| Secret rotation policy | Document rotation schedule for JWT_SECRET, INVITE_SECRET, ENCRYPTION_KEY, mTLS certs | `[ ]` |
| Incident response runbook | Document steps for suspected breach: revoke tokens, rotate secrets, notify users | `[ ]` |

**Phase 4 notes:**

- 

---

## Progress Summary

| Phase | Total Items | Not Started | In Progress | Complete |
|-------|-------------|-------------|-------------|----------|
| 1 — Immediate | 5 | 5 | 0 | 0 |
| 2 — This Week | 8 | 8 | 0 | 0 |
| 3 — This Month | 20 | 20 | 0 | 0 |
| 4 — Ongoing | 7 | 7 | 0 | 0 |
| **Total** | **40** | **40** | **0** | **0** |

---

## Decision Log

Record any architectural tradeoffs or decisions made during remediation:

| Date | Decision | Rationale |
|------|----------|-----------|
| | | |

---

*Last updated: 2026-05-02*
