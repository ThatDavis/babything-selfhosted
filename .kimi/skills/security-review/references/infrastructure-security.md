# Infrastructure & Deployment Security Checklist

Reference for auditing Docker, nginx, TLS, secrets management, and operational security.

## Architecture Recap

- Cloud deployment: Docker Compose with nginx reverse proxy
- TLS termination at nginx/Cloudflare; internal mTLS on port 3003
- Services: nginx, web SPA, API, provisioning, postgres, redis, coturn
- Networks: `frontend` (public-facing), `backend` (internal only)

---

## Checklist

### Docker & Containers

- [ ] Containers run as non-root user
- [ ] Read-only root filesystem where possible
- [ ] No unnecessary capabilities (`CAP_SYS_ADMIN`, etc.)
- [ ] Secrets not passed as environment variables (use Docker Secrets or mounted files)
- [ ] No sensitive data baked into images
- [ ] Base images are minimal and regularly updated
- [ ] Health checks are defined
- [ ] Resource limits (CPU/memory) are set
- [ ] Container escape mitigations (AppArmor/Seccomp profiles)

### Networking

- [ ] Database is not exposed to host or internet
- [ ] Redis is not exposed to host or internet
- [ ] Internal services communicate on isolated network
- [ ] TURN server ports are restricted to necessary range
- [ ] No unnecessary port mappings
- [ ] Firewall rules restrict source IPs where possible
- [ ] Internal API (mTLS port 3003) is not exposed externally

### Nginx / Reverse Proxy

- [ ] Security headers on all responses:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Content-Security-Policy` (non-trivial for SPAs, but at least frame-ancestors)
  - `Strict-Transport-Security` (HSTS)
  - `Permissions-Policy` (disable unused features)
- [ ] No server version disclosure
- [ ] Request size limits
- [ ] Timeout values configured
- [ ] Rate limiting at edge
- [ ] WebSocket upgrade only on expected paths
- [ ] Proper `X-Forwarded-*` handling with trusted proxy list

### TLS / Certificates

- [ ] TLS 1.2+ only
- [ ] Strong cipher suites (no RC4, 3DES, export ciphers)
- [ ] HSTS with preload
- [ ] Certificate auto-renewal
- [ ] mTLS certificates have reasonable validity period
- [ ] CA private key is stored securely (offline or HSM)
- [ ] Certificate revocation is possible

### Secrets Management

- [ ] `.env` file is not committed to git (verified by `.gitignore`)
- [ ] `.env` file has restrictive permissions (600)
- [ ] Secrets are rotated regularly
- [ ] No secrets in logs, error messages, or stack traces
- [ ] No secrets in Docker image layers
- [ ] Different secrets per environment (dev/staging/prod)
- [ ] Production secrets are not derivable from dev secrets

### Error Handling & Information Disclosure

- [ ] Production error responses are generic (no stack traces)
- [ ] 404/403/500 responses do not reveal framework or version
- [ ] Debug endpoints are disabled in production
- [ ] Health check endpoint does not expose sensitive info
- [ ] API error messages are informative but not revealing

### Dependency Security

- [ ] `npm audit` or equivalent run regularly
- [ ] Dependabot or similar enabled
- [ ] Lockfiles committed and verified
- [ ] No known CVEs in dependencies
- [ ] Prisma engine is from trusted source

### Operational Security

- [ ] Logs are shipped to secure, tamper-resistant storage
- [ ] Log retention policy exists
- [ ] Alerts on suspicious patterns (multiple failed logins, unusual access)
- [ ] Database backups are encrypted and tested
- [ ] Disaster recovery plan exists
- [ ] Penetration testing or automated security scanning scheduled

---

## Known Patterns in This Codebase

- Docker Compose: `frontend` and `backend` networks
- Postgres and Redis have no port mapping to host
- mTLS certs mounted read-only (`:ro`)
- `nginx.cloud.conf` has `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`
- No CSP or HSTS header currently
- No non-root user in Dockerfiles
- Secrets passed via environment variables
- `api/src/index.ts` has no global Express error handler
