# Authentication & Authorization Security Checklist

Reference for auditing auth flows, session management, and access control in Babything.

## Architecture Recap

- **Users**: JWT in HttpOnly cookie (`session`), 24h expiry, tenant-scoped
- **Operators**: JWT in HttpOnly cookie (`operator_session`), 8h expiry, global
- **Agents**: JWT in query param, 30-day expiry, monitor-scoped
- **OAuth**: Google OAuth + generic providers, state param is JWT signed with `INVITE_SECRET`
- **Internal API**: mTLS (preferred) or `x-internal-key` header fallback

---

## Checklist

### JWT & Sessions

- [ ] `JWT_SECRET` is ≥32 characters and truly random (not a dictionary word or pattern)
- [ ] `INVITE_SECRET` is different from `JWT_SECRET`
- [ ] Operator JWTs use a different secret from user JWTs (or at minimum different `aud`/`iss`)
- [ ] JWTs have appropriate expiry (users: 24h, operators: 8h, agents: as short as feasible)
- [ ] JWT payload does not contain sensitive data (password hashes, secrets)
- [ ] JWT `sub` claim is unambiguous (userId vs operatorId vs agent)
- [ ] Refresh token rotation is implemented (if using refresh tokens)
- [ ] Tokens are invalidated on logout (server-side blocklist or cookie clearance)

### Cookies

- [ ] `httpOnly: true` on all auth cookies
- [ ] `secure: true` in production (HTTPS only)
- [ ] `sameSite: 'strict'` or `'lax'` — verify `'lax'` is sufficient for OAuth flows
- [ ] `domain` is restricted (not `.babything.app` allowing sub-subdomain cookie leakage)
- [ ] Cookie names are not predictable / do not reveal framework
- [ ] Session cookies have reasonable maxAge

### Password Security

- [ ] Passwords hashed with bcrypt, argon2, or scrypt (currently bcrypt cost 12)
- [ ] Minimum password length enforced (currently 8)
- [ ] Password reset tokens are cryptographically random, single-use, time-bound
- [ ] Password reset endpoint does not enumerate users (returns generic message)
- [ ] Old passwords cannot be immediately reused
- [ ] No plaintext password logging

### OAuth

- [ ] OAuth `state` parameter is verified on callback
- [ ] OAuth `state` is single-use and time-bound
- [ ] OAuth client secrets are encrypted at rest
- [ ] CSRF protection on OAuth start endpoint
- [ ] Account linking requires verification (prevent pre-hijacking)
- [ ] OAuth callback validates `code` with PKCE if applicable

### Multi-Factor Authentication

- [ ] (If implemented) TOTP secrets are encrypted at rest
- [ ] Backup codes are single-use and hashed
- [ ] MFA is enforced for admin/operator accounts

### Authorization & RBAC

- [ ] Tenant isolation is enforced at the database layer (not just middleware)
- [ ] `update`, `delete`, `upsert` Prisma queries are tenant-scoped or use RLS
- [ ] Admin routes check `isAdmin` boolean
- [ ] Operator routes check role against permission matrix
- [ ] Baby access is verified before returning baby data
- [ ] Users cannot access other users' data within the same tenant
- [ ] Cross-tenant access returns 404, not 403 (information hiding)
- [ ] Suspended tenants cannot perform mutating operations

### Rate Limiting & Brute Force

- [ ] Login endpoint rate-limited (currently 10/15min)
- [ ] Registration endpoint rate-limited
- [ ] Password reset endpoint rate-limited
- [ ] OAuth endpoints rate-limited
- [ ] Admin/operator login endpoints rate-limited
- [ ] Failed login attempts are logged (without logging the password)
- [ ] Account lockout after repeated failures (or exponential backoff)

### Session Management

- [ ] Concurrent session limit per user
- [ ] Session invalidation on password change
- [ ] Session invalidation on suspicious activity
- [ ] Idle session timeout
- [ ] Admin can force-logout users

---

## Known Patterns in This Codebase

- Shared `JWT_SECRET` for users and operators (differentiated by cookie name, not secret)
- Prisma middleware auto-injects `tenantId` for most queries, but NOT `update`, `delete`, `upsert`
- `sameSite: 'lax'` used for OAuth compatibility
- Rate limiter: `express-rate-limit`, 10 requests per 15 minutes on auth endpoints
- Trust proxy conditional on `TRUSTED_PROXIES` env var
