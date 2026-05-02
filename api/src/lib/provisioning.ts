const PROVISIONING_URL = process.env.PROVISIONING_URL ?? 'http://localhost:3002'
const internalApiKey = process.env.INTERNAL_API_KEY

interface FetchResponse {
  ok: boolean
  status: number
  json(): Promise<any>
  text(): Promise<string>
}

async function provisioningFetch(
  path: string,
  options: { method: string; headers?: Record<string, string>; body?: string }
): Promise<FetchResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  if (internalApiKey) {
    headers['x-internal-key'] = internalApiKey
  }

  const res = await fetch(`${PROVISIONING_URL}${path}`, {
    ...options,
    headers,
  } as any)

  return res as unknown as FetchResponse
}

export async function deleteTenantInProvisioning(subdomain: string) {
  const res = await provisioningFetch(`/tenants/${subdomain}`, {
    method: 'DELETE',
  })
  if (!res.ok && res.status !== 404) {
    const body = await res.text().catch(() => '')
    throw new Error(`Provisioning delete failed: ${res.status} ${body}`)
  }
}
