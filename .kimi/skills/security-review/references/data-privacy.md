# Data Privacy & Encryption Checklist

Reference for auditing how Babything handles personal data, PII, health data, and encryption.

## Architecture Recap

- Data types: user profiles, baby profiles, feeding/diaper/sleep/health events, camera streams
- Encryption at rest: AES-256-GCM for SMTP passwords and OAuth client secrets
- Database: PostgreSQL (cloud), SQLite (provisioning)
- Redis: session/cache data with password auth
- Backups: `scripts/backup` dumps database

---

## Checklist

### Data Classification

- [ ] Baby photos/videos are classified as sensitive personal data
- [ ] Health events (feeding, medications, symptoms) are health data
- [ ] Camera streams are highest-sensitivity (real-time, in-home)
- [ ] Email addresses and names are PII
- [ ] Data classification is documented and informs handling decisions

### Encryption at Rest

- [ ] Database encryption is enabled (PostgreSQL TDE or volume encryption)
- [ ] Backup files are encrypted
- [ ] `ENCRYPTION_KEY` is strong, rotated, and stored separately from app
- [ ] Encrypted fields use authenticated encryption (AES-GCM, not CBC)
- [ ] Graceful degradation does not apply in production (no plaintext fallback)
- [ ] Key derivation uses a proper KDF (not just SHA-256 unless length is fixed)

### Encryption in Transit

- [ ] All external traffic is TLS 1.2+ (no TLS 1.0/1.1)
- [ ] Internal service communication uses mTLS where sensitive
- [ ] Certificate pinning or strict validation for internal certs
- [ ] HSTS header enabled
- [ ] No mixed content (HTTP resources on HTTPS pages)

### Data Minimization

- [ ] Only necessary fields are collected
- [ ] Camera footage is not recorded/stored server-side (verify)
- [ ] Logs do not contain PII, passwords, tokens, or stream content
- [ ] Error messages do not leak stack traces or internal paths in production
- [ ] API responses only include fields the client needs

### Data Retention & Deletion

- [ ] User data deletion removes all associated records (cascade delete verified)
- [ ] Deleted data is actually purged (not just soft-deleted indefinitely)
- [ ] Event logs have a retention policy
- [ ] Audit logs have a retention policy
- [ ] Backup retention is defined and aligned with deletion requests
- [ ] Tenant deletion purges all tenant data

### Access Logging

- [ ] Sensitive operations are audited (admin actions, password changes, stream access)
- [ ] Audit logs include who, what, when, and from where (IP)
- [ ] Audit logs are tamper-resistant (append-only, separate storage)
- [ ] Stream access is logged (who watched, when, for how long)

### Third-Party Data Sharing

- [ ] No camera data is sent to third parties
- [ ] Analytics do not include PII
- [ ] Error reporting (Sentry/etc.) scrubs PII and secrets
- [ ] OAuth providers only receive necessary scopes
- [ ] Stripe integration uses minimal customer data

### Self-Hosted Mode Considerations

- [ ] First-user admin creation is secured (no default credentials)
- [ ] Self-hosted instances generate unique secrets on first run
- [ ] Self-hosted backups are encrypted by default
- [ ] Self-hosted users are warned about unencrypted HTTP

---

## Known Patterns in This Codebase

- AES-256-GCM in `api/src/lib/crypto.ts` with SHA-256 key derivation
- `encryptOptional`/`decryptOptional` return plaintext if `ENCRYPTION_KEY` is unset (dev fallback)
- `PasswordResetToken` table stores tokens; used tokens marked with `usedAt`
- `AuditLog` table records operator actions with before/after values
- Backup script at `scripts/backup` — verify encryption
- No server-side recording of camera streams (P2P only)
