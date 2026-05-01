const BASE = import.meta.env.VITE_API_URL ?? '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? 'Request failed')
  }
  return res.json()
}

export const api = {
  provision: (body: { email: string; name: string; subdomain: string; billingPeriod: 'MONTHLY' | 'ANNUAL'; referralCode?: string }) =>
    request<{ tenant: { subdomain: string; status: string }; trialEndsAt: string; referralReward: { referrerSubdomain: string; referrerTrialExtended: boolean } | null }>('/tenants', { method: 'POST', body: JSON.stringify(body) }),
  tenantStatus: (subdomain: string) =>
    request<{ subdomain: string; status: string; trialEndsAt: string | null; stripeSubscriptionId: string | null; billingPeriod: string | null; referralCode: string | null }>(`/tenants/${subdomain}`),
  portalSession: (subdomain: string) =>
    request<{ url: string }>('/billing/portal-session', { method: 'POST', body: JSON.stringify({ subdomain }) }),
  cancelSubscription: (subdomain: string) =>
    request<{ status: string }>('/billing/cancel', { method: 'POST', body: JSON.stringify({ subdomain }) }),
  referralStats: (subdomain: string) =>
    request<{ referralCode: string | null; totalReferrals: number; referrals: { refereeSubdomain: string; status: string; createdAt: string }[] }>(`/referrals/${subdomain}`),
}
