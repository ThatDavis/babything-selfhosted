const MAIN_APP_URL = process.env.MAIN_APP_URL ?? 'http://localhost:3001'
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY!

export async function pushTenantToMainApp(tenant: {
  subdomain: string
  status: string
  trialEndsAt?: Date | null
  plan: string
}) {
  const res = await fetch(`${MAIN_APP_URL}/internal/tenants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Key': INTERNAL_API_KEY,
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
  const res = await fetch(`${MAIN_APP_URL}/internal/tenants/${subdomain}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Key': INTERNAL_API_KEY,
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
  const res = await fetch(`${MAIN_APP_URL}/internal/tenants/${subdomain}`, {
    method: 'DELETE',
    headers: { 'X-Internal-Key': INTERNAL_API_KEY },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(`Failed to delete tenant: ${res.status} ${body.error ?? ''}`)
  }
}
