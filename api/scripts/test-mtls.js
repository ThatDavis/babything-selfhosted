#!/usr/bin/env node
/**
 * mTLS integration test for internal service communication.
 * Runs a minimal Express app with the production mTLS middleware
 * and verifies handshake + authorization rules.
 */

const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')
const express = require('express')
const { execSync } = require('child_process')

const CERTS_DIR = path.resolve(__dirname, '..', '..', 'certs')

// Enable mTLS for tests 1-5
process.env.MTLS_ENABLED = 'true'
process.env.MTLS_PORT = '13003'

const app = express()
app.use(express.json())

// Import the production middleware (compiled dist)
const { requireInternalKey } = require('../dist/middleware/internal.js')

app.get('/health', (_req, res) => res.json({ ok: true }))
app.post('/internal/tenants', requireInternalKey, (_req, res) => res.json({ created: true }))

const PORT_HTTP = 13001
const PORT_MTLS = 13003

const httpServer = app.listen(PORT_HTTP, () => {
  console.log(`HTTP server on :${PORT_HTTP}`)
})

const tlsOptions = {
  cert: fs.readFileSync(path.join(CERTS_DIR, 'api-server.crt')),
  key: fs.readFileSync(path.join(CERTS_DIR, 'api-server.key')),
  ca: fs.readFileSync(path.join(CERTS_DIR, 'ca.crt')),
  requestCert: true,
  rejectUnauthorized: true,
}

const mtlsServer = https.createServer(tlsOptions, app)
mtlsServer.listen(PORT_MTLS, () => {
  console.log(`mTLS server on :${PORT_MTLS}`)
})

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => resolve({ status: res.statusCode, data }))
    })
    req.on('error', (err) => resolve({ status: 0, error: err.message }))
    if (options.body) req.write(options.body)
    req.end()
  })
}

async function runTests() {
  await new Promise((r) => setTimeout(r, 500))
  let passed = 0
  let failed = 0

  // 1. No client cert -> TLS handshake failure
  {
    const res = await request(`https://localhost:${PORT_MTLS}/internal/tenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      ca: fs.readFileSync(path.join(CERTS_DIR, 'ca.crt')),
    })
    if (res.status === 0) {
      console.log('1. PASS — no client cert rejected at TLS layer')
      passed++
    } else {
      console.log('1. FAIL — expected TLS rejection, got', res.status)
      failed++
    }
  }

  // 2. Wrong client cert (self-signed) -> TLS handshake failure
  {
    const tmpKey = path.join(CERTS_DIR, 'tmp-test.key')
    const tmpCrt = path.join(CERTS_DIR, 'tmp-test.crt')
    execSync(
      `openssl req -x509 -newkey rsa:2048 -keyout "${tmpKey}" -out "${tmpCrt}" -days 1 -nodes -subj "/CN=evil"`,
      { stdio: 'ignore' }
    )
    const res = await request(`https://localhost:${PORT_MTLS}/internal/tenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      ca: fs.readFileSync(path.join(CERTS_DIR, 'ca.crt')),
      cert: fs.readFileSync(tmpCrt),
      key: fs.readFileSync(tmpKey),
    })
    fs.unlinkSync(tmpKey)
    fs.unlinkSync(tmpCrt)
    if (res.status === 0) {
      console.log('2. PASS — untrusted client cert rejected at TLS layer')
      passed++
    } else {
      console.log('2. FAIL — expected TLS rejection, got', res.status)
      failed++
    }
  }

  // 3. Valid provisioning client cert -> success (200 or similar, not 401/403)
  {
    const res = await request(`https://localhost:${PORT_MTLS}/internal/tenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subdomain: 'test', status: 'ACTIVE', plan: 'PRO' }),
      ca: fs.readFileSync(path.join(CERTS_DIR, 'ca.crt')),
      cert: fs.readFileSync(path.join(CERTS_DIR, 'provisioning-client.crt')),
      key: fs.readFileSync(path.join(CERTS_DIR, 'provisioning-client.key')),
    })
    if (res.status !== 401 && res.status !== 403) {
      console.log('3. PASS — valid client cert accepted (status:', res.status + ')')
      passed++
    } else {
      console.log('3. FAIL — valid client cert rejected with', res.status)
      failed++
    }
  }

  // 4. Internal route on HTTP port rejected when mTLS enabled
  {
    const res = await new Promise((resolve) => {
      const req = http.request(`http://localhost:${PORT_HTTP}/internal/tenants`, { method: 'POST' }, (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => resolve({ status: res.statusCode, data }))
      })
      req.on('error', (err) => resolve({ status: 0, error: err.message }))
      req.end()
    })
    if (res.status === 403) {
      console.log('4. PASS — internal route on HTTP port rejected with 403')
      passed++
    } else {
      console.log('4. FAIL — expected 403 on HTTP port, got', res.status)
      failed++
    }
  }

  // 5. Health check on HTTP port still works
  {
    const res = await new Promise((resolve) => {
      const req = http.request(`http://localhost:${PORT_HTTP}/health`, (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => resolve({ status: res.statusCode, data }))
      })
      req.on('error', (err) => resolve({ status: 0, error: err.message }))
      req.end()
    })
    if (res.status === 200) {
      console.log('5. PASS — health check on HTTP port works')
      passed++
    } else {
      console.log('5. FAIL — expected 200 on health, got', res.status)
      failed++
    }
  }

  // 6. Backward compatibility: X-Internal-Key works when MTLS_ENABLED is not set
  {
    process.env.MTLS_ENABLED = 'false'
    process.env.INTERNAL_API_KEY = 'test-secret-key'
    const res = await new Promise((resolve) => {
      const req = http.request(
        `http://localhost:${PORT_HTTP}/internal/tenants`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Key': 'test-secret-key',
          },
        },
        (res) => {
          let data = ''
          res.on('data', (chunk) => (data += chunk))
          res.on('end', () => resolve({ status: res.statusCode, data }))
        }
      )
      req.on('error', (err) => resolve({ status: 0, error: err.message }))
      req.end()
    })
    if (res.status !== 401 && res.status !== 403) {
      console.log('6. PASS — X-Internal-Key fallback works (status:', res.status + ')')
      passed++
    } else {
      console.log('6. FAIL — X-Internal-Key fallback rejected with', res.status)
      failed++
    }
    delete process.env.MTLS_ENABLED
    delete process.env.INTERNAL_API_KEY
  }

  httpServer.close()
  mtlsServer.close()

  console.log('')
  console.log(`Results: ${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}

runTests()
