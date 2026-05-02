import https from 'https'
import fs from 'fs'

const MAIN_APP_URL = process.env.MAIN_APP_URL ?? 'http://localhost:3001'
const mtlsEnabled = process.env.MTLS_ENABLED === 'true'
const internalApiKey = process.env.INTERNAL_API_KEY

const tlsCert = mtlsEnabled
  ? fs.readFileSync(process.env.TLS_CERT_PATH ?? '/certs/provisioning-client.crt')
  : undefined
const tlsKey = mtlsEnabled
  ? fs.readFileSync(process.env.TLS_KEY_PATH ?? '/certs/provisioning-client.key')
  : undefined
const tlsCa = mtlsEnabled
  ? fs.readFileSync(process.env.TLS_CA_PATH ?? '/certs/ca.crt')
  : undefined

interface FetchResponse {
  ok: boolean
  status: number
  json(): Promise<any>
  text(): Promise<string>
}

function mtlsFetch(
  url: string,
  options: { method: string; headers?: Record<string, string>; body?: string }
): Promise<FetchResponse> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: options.method,
        headers: options.headers,
        cert: tlsCert,
        key: tlsKey,
        ca: tlsCa,
        rejectUnauthorized: true,
      },
      (res) => {
        let data = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          resolve({
            ok: res.statusCode! >= 200 && res.statusCode! < 300,
            status: res.statusCode!,
            json: () => Promise.resolve(JSON.parse(data)),
            text: () => Promise.resolve(data),
          })
        })
      }
    )
    req.on('error', reject)
    if (options.body) req.write(options.body)
    req.end()
  })
}

function internalFetch(
  url: string,
  options: { method: string; headers?: Record<string, string>; body?: string }
): Promise<FetchResponse> {
  const headers: Record<string, string> = {
    ...options.headers,
  }
  if (!mtlsEnabled && internalApiKey) {
    headers['x-internal-key'] = internalApiKey
  }
  const opts = { ...options, headers }
  if (!mtlsEnabled) {
    return fetch(url, opts as any) as Promise<FetchResponse>
  }
  return mtlsFetch(url, opts)
}

export async function pushTenantToMainApp(tenant: {
  subdomain: string
  status: string
  trialEndsAt?: Date | null
  plan: string
  billingPeriod?: string
  referralCode?: string
}) {
  const res = await internalFetch(`${MAIN_APP_URL}/internal/tenants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tenant),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(`Failed to push tenant: ${res.status} ${body.error ?? ''}`)
  }
  return res.json()
}

export async function updateTenantInMainApp(
  subdomain: string,
  data: Partial<{ status: string; trialEndsAt: Date | null; plan: string }>
) {
  const res = await internalFetch(`${MAIN_APP_URL}/internal/tenants/${subdomain}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(`Failed to update tenant: ${res.status} ${body.error ?? ''}`)
  }
  return res.json()
}

export async function deleteTenantInMainApp(subdomain: string) {
  const res = await internalFetch(`${MAIN_APP_URL}/internal/tenants/${subdomain}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(`Failed to delete tenant: ${res.status} ${body.error ?? ''}`)
  }
}

export async function validateDiscountCode(code: string, billingPeriod?: string) {
  const res = await internalFetch(`${MAIN_APP_URL}/internal/discount-codes/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, billingPeriod }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? 'Invalid discount code')
  }
  return res.json() as Promise<{
    valid: boolean
    code: string
    type: 'FREE_TIME' | 'PERCENTAGE'
    value: number
    appliesTo: string
  }>
}

export async function useDiscountCode(code: string) {
  const res = await internalFetch(`${MAIN_APP_URL}/internal/discount-codes/use`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? 'Failed to record discount code usage')
  }
  return res.json() as Promise<{ ok: boolean }>
}
