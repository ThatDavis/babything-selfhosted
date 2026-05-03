# 🔒 Security Review — Babything Cloud

**Date:** 2026-05-02  
**Scope:** Full audit — WebRTC streaming, authentication, data privacy, infrastructure  
**Commit:** `c1441c7`  
**Auditor:** Kimi Code CLI (`security-review` skill)

---

## Executive Summary

The codebase has **solid security foundations** (mTLS internal comms, AES-256-GCM encryption, bcrypt cost 12, HttpOnly cookies, tenant read-isolation) but has **8 critical gaps** that need immediate attention. The most severe are: an admin export that leaks every user's password hash, a broken agent WebSocket in cloud deployment, shared JWT secrets allowing cross-role forgery, and missing CSRF protection on generic OAuth. The streaming subsystem has significant authz and lifecycle gaps that could lead to unauthorized camera access or memory exhaustion.

---

## Critical Findings

| # | Issue | Location | Why It Matters | Fix |
|---|-------|----------|----------------|-----|
| **C1** | **Admin export leaks `passwordHash` for all users** | `api/src/routes/admin.ts:376` | Any admin can dump bcrypt hashes for every user in the tenant. Hash cracking is feasible with weak passwords. | Add `select: { id, email, name, isAdmin, createdAt }` to the `findMany` query. |
| **C2** | **CA private key mounted into runtime containers** | `docker-compose.cloud.yml:79,133` | `ca.key` is in the `./certs` volume mounted into API and provisioning containers. Runtime only needs `ca.crt`. | Mount only the specific cert files needed, not the entire `certs/` directory. |
| **C3** | **Shared `JWT_SECRET` between users and operators** | `api/src/middleware/auth.ts:26`, `operator-auth.ts:27` | Both user and operator JWTs use the same secret and same CUID namespace for `sub`. An operator token could authenticate as a user if IDs collide. | Use separate `OPERATOR_JWT_SECRET` env var, or add `aud: 'user'` / `aud: 'operator'` claims and verify them. |
| **C4** | **Generic OAuth has no `state` validation (CSRF)** | `api/src/routes/auth.ts:398-463` | `state` is generated with `nanoid(16)` but **never stored or verified** on callback. Attacker can force-login victim to attacker-controlled OAuth account. | Store state in Redis or a signed cookie, validate it in callback. |
| **C5** | **Agent WebSocket broken in cloud deployment** | `nginx/nginx.cloud.conf` | `/monitor/agent` has no WebSocket upgrade headers in nginx. It falls through to the web SPA container. The entire monitor feature cannot work in cloud mode. | Add a `location /monitor/agent` block with `proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";` routing to the API. |
| **C6** | **Any authenticated tenant user can start a watch session** | `api/src/routes/monitor.ts:104` | `/monitor/watch` only checks `requireAuth`. No `requireBabyAccess` or admin check. A caregiver for baby A can watch baby B's camera. | Add `requireBabyAccess` or at minimum verify the user has `acceptedAt` caregiver relationship with at least one baby in the tenant. |
| **C7** | **`encryptOptional` stores secrets plaintext if key missing** | `api/src/lib/crypto.ts:56-67` | If `ENCRYPTION_KEY` is unset (ops mistake), OAuth client secrets and SMTP passwords are stored **plaintext** in the database. No `NODE_ENV` guard. | Make `encrypt()` throw unconditionally. Remove `encryptOptional`/`decryptOptional` or make them throw in production. |
| **C8** | **OAuth account linking without verification (pre-hijacking)** | `api/src/routes/auth.ts:449-452` | If a user signs up with email+password, an attacker can later OAuth-login with the same email and auto-takeover the account. | Require password re-authentication or email verification before linking an OAuth identity to an existing local account. |

---

## High Findings

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| **H1** | **Agent tokens valid for 30 days with no revocation** | `api/src/routes/monitor.ts:63` | Reduce to 24h. Add a JWT blocklist (Redis) or switch to short-lived tokens + refresh. |
| **H2** | **Prisma `update`/`delete`/`upsert` bypass tenant middleware** | `api/src/lib/tenant-prisma-middleware.ts:87-90` | Add tenant scoping to these operations, or add explicit `tenantId` to every `where` clause in routes using them. |
| **H3** | **Watch sessions never destroyed; unbounded memory growth** | `api/src/routes/monitor.ts:115-122`, `186-189` | `watches` Map is only pruned on new creation, uses `createdAt` not last activity, and `req.on('close')` never deletes the entry. Add a `lastActivity` timestamp, periodic cleanup, and explicit `DELETE /watch/:id` endpoint. |
| **H4** | **No global Express error handler** | `api/src/index.ts` | Unhandled errors fall through to Express default behavior. Some routes return `err.message` directly. Add `app.use((err, req, res, next) => ...)` that returns generic messages in production. |
| **H5** | **Static TURN credentials shared with all authenticated users** | `api/src/routes/monitor.ts:95-98` | `GET /monitor/config` returns the same `TURN_USERNAME`/`TURN_CREDENTIAL` to every user. If TURN is shared across tenants, users can relay other tenants' media. | Generate ephemeral TURN credentials (time-limited HMAC) or scope per-tenant. |
| **H6** | **No server-side session invalidation on logout** | `api/src/routes/auth.ts:185-192` | Logout only clears the cookie. The JWT remains valid until expiry (24h). | Maintain a Redis blocklist of `jti` or token hashes, or switch to session IDs. |
| **H7** | **Backups are unencrypted** | `scripts/backup:21` | `pg_dump \| gzip` uploaded directly to S3. No encryption. | Add `gpg --symmetric --cipher-algo AES256` or similar before upload. |
| **H8** | **No audit logging for stream/monitor access** | `api/src/routes/monitor.ts` (passim) | Token generation, watch session creation, and stream viewing are invisible in audit logs. | Add `audit()` calls to token generation, watch creation, and agent connect/disconnect. |
| **H9** | **`InviteToken` missing `onDelete: Cascade` blocks clean deletion** | `api/prisma/schema.prisma:113` | Deleting a user who created invite tokens fails with FK constraint. Can corrupt tenant deletion. | Add `onDelete: Cascade` to the `creator` relation in `InviteToken`. |
| **H10** | **Agent disconnect doesn't invalidate watch sessions** | `api/src/routes/monitor.ts:343-352` | Cleanup only removes agent from `agents`/`tenantAgents` maps. Active watch sessions in `watches` Map are left dangling. | Iterate and delete/mark watch sessions associated with the disconnected agent's tenant. |

---

## Medium Findings

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| **M1** | **No security headers (CSP, HSTS, Permissions-Policy)** | `nginx/nginx.cloud.conf`, `web/nginx.conf`, `platform/*/nginx.conf` | Add `Content-Security-Policy`, `Strict-Transport-Security`, `Permissions-Policy`. Add `server_tokens off;`. |
| **M2** | **Containers run as root** | All `Dockerfile`s | Add `USER node` or `USER nginx` directives. |
| **M3** | **No rate limiting on monitor endpoints** | `api/src/index.ts` | Only auth endpoints have `express-rate-limit`. Add a general API rate limiter or scope one to `/monitor/*`. |
| **M4** | **No rate limiting on generic OAuth endpoints** | `api/src/index.ts:92` | `/auth/oauth/:name/start` and callbacks are unrate-limited. | Add `authLimiter` to generic OAuth routes. |
| **M5** | **No account lockout after repeated failures** | — | Brute force possible even with rate limiting (distributed attacks). | Add incremental lockout after N failed attempts, stored in Redis. |
| **M6** | **No concurrent session limit per user** | — | A stolen password allows unlimited parallel sessions. | Track active sessions in Redis; limit to N per user. |
| **M7** | **Session not invalidated on password change** | `api/src/routes/auth.ts:241-244` | Password reset updates hash but existing JWTs remain valid. | Add all existing user tokens to blocklist on password change. |
| **M8** | **TURN credentials exposed to all authenticated users** | `api/src/routes/monitor.ts:88-101` | Same as H5 — any logged-in user gets TURN creds. | Ephemeral credentials or per-tenant TURN isolation. |
| **M9** | **Redis tenant cache unencrypted** | `api/src/lib/redis.ts:20` | Tenant data stored in Redis as plaintext JSON. | Encrypt sensitive fields before Redis storage, or accept the risk (Redis is backend-network only). |
| **M10** | **No Dependabot / `npm audit` in CI** | `.github/workflows/` | Add `npm audit` step to CI and create `.github/dependabot.yml`. |
| **M11** | **mTLS certificates valid for 10 years** | `scripts/generate-mtls-certs:16` | `DAYS=3650`. Reduce to 365 or less. |
| **M12** | **SHA-256 used as "KDF" instead of PBKDF2/HKDF** | `api/src/lib/crypto.ts:14` | `crypto.createHash('sha256')` is not a key derivation function. Use `crypto.pbkdf2Sync` or `crypto.hkdfSync`. |
| **M13** | **Unbounded `resolvers` array growth (DoS)** | `api/src/routes/monitor.ts:186,254` | Each long-poll pushes a `resolve` function. No max size. | Cap `resolvers.length` and reject new long-polls when full. |
| **M14** | **Browser tab close doesn't cleanup peer connection** | `web/src/pages/tabs/MonitorTab.tsx` | No `useEffect` cleanup for `RTCPeerConnection` or `icePollRef` interval on unmount. | Add cleanup function in `useEffect` return. |
| **M15** | **Watch session pruning only on new creation, uses `createdAt`** | `api/src/routes/monitor.ts:115-122` | Old sessions never prune if no one creates new ones. Use `lastActivity` and run cleanup on a timer. | Add `setInterval` cleanup or track `lastActivity`. |
| **M16** | **SDP/ICE candidates not filtered (private IP leak)** | `api/src/routes/monitor.ts` | No inspection or filtering of SDP or ICE candidates. Browser SDP may contain `192.168.x.x` host candidates. | Add server-side candidate filtering or rely on `relay` ICE preference. |
| **M17** | **Missing tenant check on agent-side signaling** | `api/src/routes/monitor.ts:323-334` | Agent sends `answer`/`ice` without verifying `watch.tenantId === agent.tenantId`. Defense-in-depth gap. | Add explicit tenantId equality check. |
| **M18** | **Agent token displayed in DOM without masking** | `web/src/pages/tabs/MonitorTab.tsx:235-236` | Full JWT in `<code>` element. Browser extensions / XSS can capture it. | Mask with `••••` and add a "reveal" toggle. |
| **M19** | **`STRIPE_BYPASS` has no production safeguard** | `platform/provisioning/src/routes/tenants.ts:29` | Env var skips all payment processing. No runtime check preventing it in production. | Add `if (process.env.NODE_ENV === 'production' && process.env.STRIPE_BYPASS) { throw ... }`. |
| **M20** | **Trust proxy conditional — unset = trust all** | `api/src/index.ts:52-55` | If `TRUSTED_PROXIES` is unset, Express may trust all proxies. IP-based rate limiting and audit logs could be spoofed. | Default to trusting only loopback when unset in production. |

---

## Low Findings

| # | Issue | Fix |
|---|-------|-----|
| **L1** | Predictable cookie names (`session`, `operator_session`) | Rename to something less fingerprintable, e.g. `bt_sid`, `bt_oid`. |
| **L2** | No `security.txt` or responsible disclosure contact | Add `.well-known/security.txt` to landing site. |
| **L3** | No password history (user can reset to same password) | Track last N password hashes, reject reuse. |
| **L4** | No refresh token mechanism | Users re-authenticate every 24h. Consider refresh tokens for better UX. |
| **L5** | Backup temp files left in `/tmp` on interruption | `scripts/backup` writes `/tmp/babything_backup_*.sql.gz`. Use `trap` to clean up on exit. |
| **L6** | No self-hosted HTTP security warning | Add a banner or log warning when `NODE_ENV=production` and requests are HTTP. |
| **L7** | Content-Disposition header injection in reports | `api/src/routes/reports.ts:129` — baby name embedded in filename with minimal sanitization. Use a stricter allowlist. |

---

## Positive Controls (What's Working Well)

- ✅ **mTLS internal communication** with CN validation (`provisioning`) and port restriction
- ✅ **AES-256-GCM** for OAuth client secrets and SMTP passwords at rest
- ✅ **bcrypt cost factor 12** for password hashing
- ✅ **HttpOnly + Secure cookies** for session transport
- ✅ **Tenant read-isolation** via Prisma middleware for `find*`, `create`, `updateMany`, `deleteMany`
- ✅ **Password reset tokens**: `nanoid(48)`, 1-hour expiry, single-use with `usedAt`
- ✅ **Cross-tenant access returns 404** (information hiding, not 403)
- ✅ **Suspended tenant mutation blocking** — GET/HEAD allowed, POST/PUT/PATCH/DELETE blocked
- ✅ **Role-based operator permissions** with `SECTION_PERMISSIONS` matrix
- ✅ **No server-side camera recording** — WebRTC is pure P2P, server only relays signaling
- ✅ **JWT_SECRET / INVITE_SECRET length validation** at boot (≥32 chars, hard exit if missing)
- ✅ **Database and Redis not exposed to host** — only accessible within Docker `backend` network
- ✅ **Basic auth endpoint rate limiting** (10 req / 15 min)
- ✅ **OAuth client secrets encrypted at rest** before DB storage
- ✅ **Debug seed endpoint blocked in production**

---

*This audit is based on static code analysis and does not include runtime penetration testing. Findings should be validated in a staging environment before production deployment.*
