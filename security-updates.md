# Security Updates Plan

> Generated for **babything** — self-hosted newborn tracker
> Scope: API, Web, Nginx, Docker Compose, MediaMTX

---

## Test Plan

Priority order: **Critical → High → Medium → Low**

### Critical

| # | Flaw | Test Method | Tool / Technique | Success Criteria |
|---|------|-------------|------------------|------------------|
| C1 | CORS wildcard with credentials | **Manual** — Host a local HTML page on a different origin that fetches `/api/babies` with `credentials: 'include'` | Custom HTML/JS (`fetch` from `http://evil.local` to target) | **Vuln:** Request succeeds with baby data. **Fixed:** Browser blocks with CORS error. |
| C2 | PostgreSQL exposed port | **Network scan** — Check if 5432 is reachable from another host on the network / from internet | `nmap -p 5432 <host>` or `nc -vz <host> 5432` from external machine | **Vuln:** Port open and PostgreSQL handshake responds. **Fixed:** Connection refused/timeout. |
| C3 | HLS stream unauthenticated | **Manual** — Open `/hls/cam/index.m3u8` (or mediamtx stream path) in VLC/curl without logging in | `curl -I http://<host>/hls/cam/index.m3u8` or open in browser incognito | **Vuln:** Returns 200 with playlist/TS segments. **Fixed:** Returns 401/403 or no path. |
| C4 | OAuth token in URL | **Manual / Code review** — Trigger OAuth flow and inspect callback URL | Browser DevTools Network tab, check `Location` header on callback | **Vuln:** Token appears in query string. **Fixed:** Token exchanged via secure cookie or POST body. |

### High

| # | Flaw | Test Method | Tool / Technique | Success Criteria |
|---|------|-------------|------------------|------------------|
| H1 | No rate limiting on auth | **Automated** — Brute-force login/register with common passwords | `hydra`, `ffuf`, or custom script firing 50+ requests rapidly | **Vuln:** All requests return 200/401 with no slowdown or block. **Fixed:** Returns 429 after threshold. |
| H2 | Socket.io CORS wildcard | **Manual** — Connect Socket.io client from arbitrary origin | Node script or browser console on different domain | **Vuln:** Connection accepted and `join:baby` works with valid token. **Fixed:** Connection rejected due to origin mismatch. |
| H3 | Plaintext secrets in DB | **Code review + DB query** — Inspect SMTP/OAuth rows | `psql` → `SELECT password FROM "SmtpConfig";` or Prisma query | **Vuln:** Password readable as plain string. **Fixed:** Value is encrypted ciphertext or hashed. |
| H4 | Weak default JWT secrets | **Config review + Token forgery** — Check `.env` and try signing a token with default secret | `jwt.io` or `jsonwebtoken` script with `dev-secret-change-me` | **Vuln:** Token generated with default secret is accepted by API. **Fixed:** API rejects default-secret tokens; env validation enforces strong secrets. |
| H5 | No HTTPS/TLS | **Network inspection** — Check protocol and certificate on all endpoints | Browser padlock icon, `curl -v https://<host>` (should fail), `curl -v http://<host>` | **Vuln:** HTTP 200, no redirect, no cert. **Fixed:** HTTPS only (or 301 redirect to HTTPS behind reverse proxy). |

### Medium

| # | Flaw | Test Method | Tool / Technique | Success Criteria |
|---|------|-------------|------------------|------------------|
| M1 | Missing security headers | **Automated scan** — Check response headers on main pages and API | `curl -I http://<host>` and `curl -I http://<host>/api/health` | **Vuln:** No `X-Frame-Options`, `CSP`, `HSTS`, etc. **Fixed:** Headers present. |
| M2 | Trust proxy misconfiguration | **Manual** — Spoof `X-Forwarded-For` and observe if API trusts it | `curl -H "X-Forwarded-For: 1.2.3.4" http://<host>/api/health` (check logs if IP is used) | **Vuln:** App uses spoofed IP for any logic/rate-limiting. **Fixed:** Only trusted proxy IPs are respected. |
| M3 | No body size limit | **Manual** — Send a huge JSON payload to an endpoint | `curl -X POST -d "@huge.json" http://<host>/api/auth/login` (huge.json > 10MB) | **Vuln:** Request accepted, memory spikes. **Fixed:** Returns `413 Payload Too Large`. |
| M4 | SMTP password returned to frontend | **Manual** — Log in as admin, open Admin → SMTP, check network tab | Browser DevTools → Network → `GET /admin/smtp` response | **Vuln:** Password field present in JSON. **Fixed:** Password redacted/masked or omitted. |
| M5 | Dev seed in production | **Manual** — As admin, navigate to Admin → Developer and click "Create test baby" | UI click-test | **Vuln:** Endpoint succeeds and creates data. **Fixed:** Endpoint returns 404/403 or is disabled when `NODE_ENV=production`. |

### Low

| # | Flaw | Test Method | Tool / Technique | Success Criteria |
|---|------|-------------|------------------|------------------|
| L1 | Password reset email disclosure | **Manual** — Request reset for known email, then GET the reset token URL | `curl http://<host>/api/auth/reset-password/<valid-token>` | **Vuln:** Returns email address. **Fixed:** Returns only `{ valid: true }`. |
| L2 | Missing audit logging | **Code review + Log inspection** — Check API logs for auth/admin events | `docker logs babything-api-1` after login/admin action | **Vuln:** No structured log entries for security events. **Fixed:** Logs contain actor, action, outcome, timestamp. |
| L3 | Admin self-deletion safeguard gap | **Manual** — As admin, try to delete own account via Admin → Users | UI click-test | **Vuln:** Can delete self (leaving system admin-less). **Fixed:** UI/API blocks self-deletion consistently. |

---

## Fix Plan

### Critical Fixes

| # | Fix Approach | Files to Change | Effort | Validation | Prevention |
|---|-------------|-----------------|--------|------------|------------|
| C1 | Restrict CORS to `APP_URL` only; remove wildcard fallback. Reject requests with mismatched Origin header when credentials are used. | `api/src/index.ts` | **Quick** (15 min) | Run C1 test from external origin; expect CORS block. | Add CORS validation to code review checklist. |
| C2 | Remove `5432:5432` host mapping from `docker-compose.yml`. Containers communicate via Docker network; no host exposure needed. | `docker-compose.yml` | **Quick** (5 min) | Run C2 nmap from external host; expect closed. | Document that DB is internal-only in README. |
| C3 | Add nginx auth subrequest or IP whitelist in front of `/hls/`. Alternatively, proxy through API with JWT validation before mediamtx. | `nginx/nginx.conf`, optionally new API route | **Medium** (2-4 hrs) | Run C3 curl without auth; expect 401/403. | Add stream-auth tests to CI. |
| C4 | Exchange OAuth code for token server-side, then set JWT as an `HttpOnly` cookie or redirect with a short-lived nonce (not the token itself). | `api/src/routes/auth.ts` | **Medium** (3-6 hrs) | Run C4 OAuth flow; token must not appear in URL. | Code review all redirect flows for token leakage. |

### High Fixes

| # | Fix Approach | Files to Change | Effort | Validation | Prevention |
|---|-------------|-----------------|--------|------------|------------|
| H1 | Add rate-limiting middleware on auth routes. Suggest `express-rate-limit` with memory store (or Redis for multi-instance). Limit login/register to 5 attempts per 15 min per IP. | `api/src/index.ts`, `api/src/routes/auth.ts` | **Quick** (1-2 hrs) | Run H1 brute-force script; expect 429 after threshold. | Include rate-limit config in all future API projects. |
| H2 | Set Socket.io CORS `origin` to the exact `APP_URL` (or array of allowed origins). Do not use `*`. | `api/src/lib/socket.ts` | **Quick** (15 min) | Run H2 cross-origin connection test; expect rejection. | Centralize allowed-origins config. |
| H3 | Encrypt SMTP password and OAuth client secrets at rest. Use `crypto` (AES-256-GCM) with a master key from env (`MASTER_KEY` or `ENCRYPTION_KEY`). Decrypt only at runtime. | `api/src/routes/admin.ts`, `api/src/lib/mailer.ts`, `api/src/routes/auth.ts`, schema if needed | **Medium** (4-6 hrs) | Run H3 DB query; expect ciphertext, not plaintext. | Never store credentials plaintext; enforce in PR reviews. |
| H4 | Add startup validation: require `JWT_SECRET` and `INVITE_SECRET` to be ≥32 random chars. Reject weak defaults. Document strong generation in README. | `api/src/index.ts` (startup check) | **Quick** (30 min) | Run H4 with default secret; API should fail to start or reject tokens. | Add env validation to all new projects. |
| H5 | Terminate TLS at nginx (or external reverse proxy). Add `listen 443 ssl` with certificates. Redirect HTTP → HTTPS. If behind external proxy, document that proxy must handle TLS. | `nginx/nginx.conf`, `docker-compose.yml` (cert volumes) | **Medium** (2-4 hrs) | Run H5; expect HTTPS 200 and HSTS header. | Mandate TLS for all deployments. |

### Medium Fixes

| # | Fix Approach | Files to Change | Effort | Validation | Prevention |
|---|-------------|-----------------|--------|------------|------------|
| M1 | Add security headers in nginx: `X-Frame-Options DENY`, `X-Content-Type-Options nosniff`, `Referrer-Policy strict-origin-when-cross-origin`, `Content-Security-Policy` (restrict scripts/sources). Add HSTS if HTTPS enabled. | `nginx/nginx.conf` | **Quick** (30 min) | Run M1 curl; headers present in all responses. | Nginx config template with security headers by default. |
| M2 | Validate `trust proxy` — only trust internal Docker IPs (`127.0.0.1`, `10.0.0.0/8`, `172.16.0.0/12`). Or read `TRUSTED_PROXIES` from env. | `api/src/index.ts` | **Quick** (30 min) | Run M2 with spoofed header; app ignores untrusted proxy. | Document proxy setup requirements. |
| M3 | Set `express.json({ limit: '100kb' })` (or reasonable limit). Add `express.urlencoded({ limit: '100kb' })` if used. | `api/src/index.ts` | **Quick** (10 min) | Run M3 with huge payload; expect 413. | Default Express middleware config with limits. |
| M4 | Redact `password` field from `GET /admin/smtp` response. Frontend should treat it as write-only; don't populate the input with the real password. | `api/src/routes/admin.ts`, `web/src/pages/AdminSettings.tsx` | **Quick** (30 min) | Run M4; password absent from API response. | Review all API responses for sensitive field leakage. |
| M5 | Gate `/admin/seed` on `NODE_ENV !== 'production'`. Return 404 or 403 in production. Add warning banner in UI when not in production. | `api/src/routes/admin.ts`, `web/src/pages/AdminSettings.tsx` | **Quick** (30 min) | Run M5 in prod mode; expect 404/403. | Never ship dev endpoints in production builds. |

### Low Fixes

| # | Fix Approach | Files to Change | Effort | Validation | Prevention |
|---|-------------|-----------------|--------|------------|------------|
| L1 | Remove email from `GET /auth/reset-password/:token` response. Return only `{ valid: true }`. | `api/src/routes/auth.ts` | **Quick** (10 min) | Run L1; email not in response. | Review auth endpoints for info disclosure. |
| L2 | Add structured audit logging middleware. Log: login success/fail, password reset, invite accept, admin actions (user delete, role change, OAuth/SMTP updates). Write to stdout for Docker log aggregation. | New `api/src/lib/audit.ts`, hooks in routes | **Medium** (3-4 hrs) | Run L2; logs contain security events. | Require audit logging for auth/admin paths in all projects. |
| L3 | Ensure admin cannot delete self. `requireAdmin` middleware or route handler should check `req.params.id !== req.userId` and return 400. | `api/src/routes/admin.ts` | **Quick** (10 min) | Run L3; self-deletion blocked. | Add business-rule validation tests for destructive actions. |

---

## Implementation Roadmap (Suggested Order)

### Week 1 — Lock the Perimeter
1. [ ] **C2**: Close PostgreSQL port
2. [ ] **C1**: Fix CORS wildcard
3. [ ] **H2**: Fix Socket.io CORS
4. [ ] **H1**: Add rate limiting
5. [ ] **M3**: Add body size limits
6. [ ] **M1**: Add security headers

### Week 2 — Protect Data & Auth
7. [ ] **H4**: Enforce strong JWT secrets
8. [ ] **H3**: Encrypt secrets at rest
9. [ ] **C4**: Fix OAuth token-in-URL
10. [ ] **M4**: Redact SMTP password from API
11. [ ] **M5**: Disable seed in production

### Week 3 — Harden Infrastructure
12. [ ] **C3**: Authenticate HLS stream
13. [ ] **H5**: Enforce HTTPS/TLS
14. [ ] **M2**: Validate trust proxy
15. [ ] **L1**: Remove email from reset response
16. [ ] **L3**: Block admin self-deletion

### Week 4 — Monitoring & Maintenance
17. [ ] **L2**: Add audit logging
18. [ ] Run full test plan again to verify all fixes
19. [ ] Document security runbook for future deployments

---

## Quick Reference: Commands

```bash
# Test CORS from another origin
curl -H "Origin: http://evil.local" \
     -H "Authorization: Bearer <token>" \
     -I http://<host>/api/babies

# Check if PostgreSQL is exposed
nmap -p 5432 <host>

# Check HLS stream without auth
curl -I http://<host>/hls/cam/index.m3u8

# Check security headers
curl -I http://<host>
curl -I http://<host>/api/health

# Check rate limiting (fire 10 rapid requests)
for i in {1..10}; do
  curl -s -o /dev/null -w "%{http_code}" \
    -X POST -H "Content-Type: application/json" \
    -d '{"email":"a@b.com","password":"wrong"}' \
    http://<host>/api/auth/login
done

# Check DB plaintext secrets
docker exec -it babything-postgres-1 psql -U babything -c \
  'SELECT password FROM "SmtpConfig" LIMIT 1;'
```
