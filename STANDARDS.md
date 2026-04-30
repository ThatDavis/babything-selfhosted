# Security Standards & Patterns

> Reference for future app development. These are industry-standard controls, not project-specific hacks.

---

## 1. Session Management: HttpOnly Cookies

**Rule:** Never store session tokens in `localStorage` or return them in URLs.

**Why:**
- `localStorage` is accessible to any XSS payload.
- URL tokens leak to browser history, server logs, and `Referer` headers.

**Pattern:**
```ts
// Server sets cookie after login/OAuth
res.cookie('session', jwt, {
  httpOnly: true,        // JavaScript cannot read this
  secure: true,          // HTTPS only in production
  sameSite: 'lax',       // CSRF protection
  maxAge: 24 * 60 * 60 * 1000,
})

// Client sends cookie automatically on every request
fetch('/api/protected', { credentials: 'include' })

// Server middleware reads cookie first, falls back to header for API flexibility
const token = req.cookies.session ?? req.headers.authorization?.slice(7)
```

**Fallback rule:** If you must support `localStorage` (e.g., mobile WebView constraints), treat it as a temporary bridge, not the primary store.

---

## 2. CORS: Whitelist, Never Wildcard with Credentials

**Rule:** `Access-Control-Allow-Origin: *` + `credentials: true` is a critical vulnerability.

**Pattern:**
```ts
const allowed = process.env.CORS_ORIGIN
if (allowed) {
  app.use(cors({ origin: allowed, credentials: true }))
}
```

**Check:** If `CORS_ORIGIN` is unset, default to **no CORS** (same-origin only). Never default to `*`.

---

## 3. Rate Limiting on Auth Endpoints

**Rule:** Login, register, forgot-password, and reset-password must have rate limits.

**Pattern:**
```ts
import rateLimit from 'express-rate-limit'

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/auth/login', authLimiter)
app.use('/auth/register', authLimiter)
```

**Why:** Prevents brute-force, credential stuffing, and enumeration attacks.

---

## 4. Request Body Limits

**Rule:** Always cap JSON body size.

**Pattern:**
```ts
app.use(express.json({ limit: '100kb' }))
```

**Why:** Uncapped parsers allow memory-exhaustion DoS.

---

## 5. Encrypt Sensitive Data at Rest

**Rule:** Any credential stored in the database (SMTP password, OAuth client secret, API keys) must be encrypted, not just hashed.

**Pattern:**
```ts
import crypto from 'crypto'

// AES-256-GCM with a random IV per record
function encrypt(plaintext: string, key: Buffer): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${encrypted.toString('base64')}:${tag.toString('base64')}`
}
```

**Key management:** Derive a 32-byte key from an env var (`ENCRYPTION_KEY`) using SHA-256. Store the env var in a secrets manager, never in Git.

---

## 6. Redact Secrets from API Responses

**Rule:** `GET` endpoints must never return passwords, secrets, or private keys.

**Pattern:**
```ts
router.get('/smtp-config', async (req, res) => {
  const config = await db.smtp.findFirst()
  const { password, ...safe } = config
  res.json(safe)
})
```

**UX:** Front-end forms should show an empty password field with placeholder "Leave blank to keep existing." The back-end preserves the old encrypted value when the field is empty on update.

---

## 7. Startup Secret Validation

**Rule:** The app must refuse to start if secrets are weak or missing.

**Pattern:**
```ts
function validateSecrets() {
  const jwt = process.env.JWT_SECRET
  if (!jwt || jwt.length < 32) {
    console.error('FATAL: JWT_SECRET must be ≥32 chars')
    process.exit(1)
  }
}
validateSecrets()
```

---

## 8. HTTPS & Security Headers

**Rule:** Production traffic must be TLS-terminated. Add baseline security headers.

**Nginx pattern:**
```nginx
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

**When TLS is enabled, also add:**
```nginx
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

---

## 9. Database Exposure

**Rule:** Do not expose database ports to the host unless explicitly needed for local development.

**Docker pattern:**
```yaml
services:
  postgres:
    # ports:
    #   - "5432:5432"   # <-- keep commented out
```

Containers communicate over the internal Docker network by default.

---

## 10. Dev Endpoints in Production

**Rule:** Seed, debug, and diagnostic endpoints must be disabled in production.

**Pattern:**
```ts
router.post('/seed', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' })
  }
  // ... seed logic
})
```

---

## 11. Input Validation

**Rule:** Validate every input at the API boundary. Never trust the client.

**Pattern:**
```ts
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const result = schema.safeParse(req.body)
if (!result.success) {
  return res.status(400).json({ error: result.error.flatten() })
}
```

---

## 12. Audit Logging

**Rule:** Log security-relevant events: login success/failure, password changes, admin actions, permission changes.

**Pattern:**
```ts
console.log(JSON.stringify({
  event: 'login',
  userId: user.id,
  ip: req.ip,
  outcome: 'success',
  timestamp: new Date().toISOString(),
}))
```

Send to stdout so Docker log drivers can aggregate them.

---

## 13. Dependency Hygiene

**Rule:** Pin dependencies, audit regularly, and minimize supply-chain surface area.

**Checklist:**
- [ ] Use lockfiles (`package-lock.json`, `Cargo.lock`, etc.)
- [ ] Run `npm audit` / `cargo audit` in CI
- [ ] Review new dependencies before adding them
- [ ] Use `distroless` or `alpine` Docker base images where possible

---

## 14. Principle of Least Privilege

**Rule:** Every component should have the minimum permissions it needs.

**Examples:**
- Database user should not have `SUPERUSER` or `CREATEDB`.
- File uploads should be stored outside the web root.
- Container processes should run as non-root (`USER node` in Dockerfile).

---

## Quick Checklist for New Projects

- [ ] Auth tokens in `HttpOnly` cookies, not `localStorage` or URLs
- [ ] CORS origin whitelist, no `*` with credentials
- [ ] Rate limiting on all auth endpoints
- [ ] Body size limits on all parsers
- [ ] Secrets encrypted at rest (AES-256-GCM)
- [ ] Secrets redacted from API GET responses
- [ ] Startup validation for `JWT_SECRET`, `ENCRYPTION_KEY`, etc.
- [ ] Security headers on all responses
- [ ] HTTPS in production
- [ ] DB ports not exposed to host
- [ ] Dev endpoints gated by environment
- [ ] Input validation with Zod / Joi / similar
- [ ] Audit logging for auth and admin actions
- [ ] Dependency lockfiles and automated auditing
