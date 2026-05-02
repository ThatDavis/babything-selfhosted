const BASE = import.meta.env.VITE_API_URL ?? '/api'

export interface Operator {
  id: string
  email: string
  name: string
  role: 'HELPDESK' | 'ACCOUNTING' | 'GLOBAL_ADMIN'
}

export interface Tenant {
  id: string
  subdomain: string
  status: 'TRIAL' | 'ACTIVE' | 'SUSPENDED'
  trialEndsAt: string | null
  plan: string
  billingPeriod: string
  referralCode: string | null
  userCount: number
  babyCount: number
  createdAt: string
  updatedAt: string
}

export interface AuditLog {
  id: string
  operator: { id: string; name: string; email: string }
  action: string
  targetType: string | null
  targetId: string | null
  oldValue: any
  newValue: any
  ipAddress: string | null
  createdAt: string
}

export interface Stats {
  totalTenants: number
  trialTenants: number
  activeTenants: number
  suspendedTenants: number
  totalUsers: number
  totalBabies: number
  recentSignups: number
  expiringTrials: number
}

export interface DiscountCode {
  id: string
  code: string
  type: 'FREE_TIME' | 'PERCENTAGE'
  value: number
  maxUses: number | null
  usedCount: number
  validFrom: string
  validUntil: string | null
  appliesTo: 'ANY' | 'ANNUAL' | 'MONTHLY'
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  htmlBody: string
  createdAt: string
  updatedAt: string
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body.error ?? 'Request failed')
  }
  return res.json()
}

export const api = {
  login: (email: string, password: string) =>
    request<{ operator: Operator }>('/operator/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ ok: boolean }>('/operator/auth/logout', { method: 'POST' }),
  me: () => request<{ operator: Operator }>('/operator/auth/me'),
  getPermissions: () => request<{ sections: string[] }>('/operator/auth/permissions'),

  getStats: () => request<{ stats: Stats }>('/operator/dashboard/stats'),
  getTenants: (params?: { status?: string; search?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.status) qs.set('status', params.status)
    if (params?.search) qs.set('search', params.search)
    if (params?.page) qs.set('page', String(params.page))
    if (params?.limit) qs.set('limit', String(params.limit))
    return request<{ tenants: Tenant[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(`/operator/dashboard/tenants?${qs}`)
  },
  getTenant: (subdomain: string) =>
    request<{ tenant: Tenant & { users: any[]; babies: any[] } }>(`/operator/dashboard/tenants/${subdomain}`),
  suspendTenant: (subdomain: string) =>
    request<{ tenant: Tenant }>(`/operator/dashboard/tenants/${subdomain}/suspend`, { method: 'POST' }),
  activateTenant: (subdomain: string) =>
    request<{ tenant: Tenant }>(`/operator/dashboard/tenants/${subdomain}/activate`, { method: 'POST' }),
  extendTrial: (subdomain: string, days: number) =>
    request<{ tenant: Tenant }>(`/operator/dashboard/tenants/${subdomain}/extend-trial`, {
      method: 'POST',
      body: JSON.stringify({ days }),
    }),
  deleteTenant: (subdomain: string) =>
    request<{ ok: boolean }>(`/operator/dashboard/tenants/${subdomain}`, { method: 'DELETE' }),

  getAuditLogs: (params?: { page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.page) qs.set('page', String(params.page))
    if (params?.limit) qs.set('limit', String(params.limit))
    return request<{ logs: AuditLog[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(`/operator/dashboard/audit-logs?${qs}`)
  },

  getOperators: () => request<{ operators: Operator[] }>('/operator'),
  createOperator: (body: { email: string; name: string; password: string; role: string }) =>
    request<{ operator: Operator }>('/operator', { method: 'POST', body: JSON.stringify(body) }),
  updateOperator: (id: string, body: Partial<{ name: string; role: string; isActive: boolean }>) =>
    request<{ operator: Operator }>(`/operator/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteOperator: (id: string) =>
    request<{ ok: boolean }>(`/operator/${id}`, { method: 'DELETE' }),

  getDiscountCodes: () => request<{ codes: DiscountCode[] }>('/operator/dashboard/discount-codes'),
  createDiscountCode: (body: { code: string; type: 'FREE_TIME' | 'PERCENTAGE'; value: number; maxUses?: number; validUntil?: string; appliesTo?: 'ANY' | 'ANNUAL' | 'MONTHLY' }) =>
    request<{ code: DiscountCode }>('/operator/dashboard/discount-codes', { method: 'POST', body: JSON.stringify(body) }),
  deleteDiscountCode: (id: string) =>
    request<{ ok: boolean }>(`/operator/dashboard/discount-codes/${id}`, { method: 'DELETE' }),

  getEmailTemplates: () => request<{ templates: EmailTemplate[] }>('/operator/dashboard/email-templates'),
  getEmailTemplate: (name: string) => request<{ template: EmailTemplate }>(`/operator/dashboard/email-templates/${name}`),
  saveEmailTemplate: (body: { name: string; subject: string; htmlBody: string }) =>
    request<{ template: EmailTemplate }>('/operator/dashboard/email-templates', { method: 'POST', body: JSON.stringify(body) }),
  deleteEmailTemplate: (id: string) =>
    request<{ ok: boolean }>(`/operator/dashboard/email-templates/${id}`, { method: 'DELETE' }),
  sendTestEmail: (name: string, to: string) =>
    request<{ ok: boolean }>(`/operator/dashboard/email-templates/${name}/test`, { method: 'POST', body: JSON.stringify({ to }) }),
}
