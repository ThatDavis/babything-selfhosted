const BASE = import.meta.env.VITE_API_URL ?? '/api'

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
  if (res.status === 204) return undefined as T
  return res.json()
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export const api = {
  auth: {
    setup: () => request<{ needed: boolean }>('/auth/setup'),
    register: (body: { email: string; password: string; name: string }) =>
      request<{ user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: { email: string; password: string }) =>
      request<{ user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
    me: () => request<User>('/auth/me'),
    invite: (body: { babyId: string; email: string; role?: string }) =>
      request<{ inviteToken: string; expiresAt: string }>('/auth/invite', { method: 'POST', body: JSON.stringify(body) }),
    getInvite: (token: string) =>
      request<{ babyId: string; babyName: string; email: string; role: string }>(`/auth/invite/${token}`),
    acceptInvite: (token: string) =>
      request<{ babyId: string }>(`/auth/invite/${token}/accept`, { method: 'POST' }),
    forgotPassword: (email: string) =>
      request<{ ok: boolean }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    checkResetToken: (token: string) =>
      request<{ valid: boolean; email: string }>(`/auth/reset-password/${token}`),
    resetPassword: (token: string, password: string) =>
      request<{ ok: boolean }>(`/auth/reset-password/${token}`, { method: 'POST', body: JSON.stringify({ password }) }),
    oauthProviders: () => request<OAuthProvider[]>('/auth/oauth-providers'),
  },
  admin: {
    getSmtp: () => request<SmtpConfig | null>('/admin/smtp'),
    saveSmtp: (body: Partial<SmtpConfig>) =>
      request<SmtpConfig>('/admin/smtp', { method: 'PUT', body: JSON.stringify(body) }),
    testSmtp: (email: string) =>
      request<{ ok: boolean }>('/admin/smtp/test', { method: 'POST', body: JSON.stringify({ email }) }),
    getOAuthProviders: () => request<OAuthProvider[]>('/admin/oauth-providers'),
    createOAuthProvider: (body: Omit<OAuthProvider, 'id' | 'createdAt'>) =>
      request<OAuthProvider>('/admin/oauth-providers', { method: 'POST', body: JSON.stringify(body) }),
    updateOAuthProvider: (id: string, body: Partial<Omit<OAuthProvider, 'id' | 'createdAt'>>) =>
      request<OAuthProvider>(`/admin/oauth-providers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteOAuthProvider: (id: string) =>
      request<void>(`/admin/oauth-providers/${id}`, { method: 'DELETE' }),
    getUsers: () => request<AdminUser[]>('/admin/users'),
    setAdmin: (id: string, isAdmin: boolean) =>
      request<AdminUser>(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ isAdmin }) }),
    deleteUser: (id: string) => request<void>(`/admin/users/${id}`, { method: 'DELETE' }),
    getBabies: () => request<AdminBaby[]>('/admin/babies'),
    assignBaby: (userId: string, babyId: string, role: string) =>
      request<void>(`/admin/users/${userId}/babies`, { method: 'POST', body: JSON.stringify({ babyId, role }) }),
    removeBaby: (userId: string, babyId: string) =>
      request<void>(`/admin/users/${userId}/babies/${babyId}`, { method: 'DELETE' }),
    seedTestData: () =>
      request<{ ok: boolean; babyId: string; babyName: string }>('/admin/seed', { method: 'POST' }),
  },
  babies: {
    list: () => request<(Baby & { role: string })[]>('/babies'),
    create: (body: { name: string; dob: string; sex?: string }) =>
      request<Baby>('/babies', { method: 'POST', body: JSON.stringify(body) }),
    get: (id: string) => request<Baby & { caregivers: BabyCaregiver[] }>(`/babies/${id}`),
    update: (id: string, body: Partial<{ name: string; dob: string; sex: string }>) =>
      request<Baby>(`/babies/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    dashboard: (id: string) => request<Dashboard>(`/babies/${id}/dashboard`),
    delete: (id: string) => request<void>(`/babies/${id}`, { method: 'DELETE' }),
    removeCaregiver: (babyId: string, userId: string) =>
      request<void>(`/babies/${babyId}/caregivers/${userId}`, { method: 'DELETE' }),
  },
  feedings: {
    list: (babyId: string, cursor?: string) =>
      request<Paginated<FeedingEvent>>(`/babies/${babyId}/feedings${cursor ? `?cursor=${cursor}` : ''}`),
    create: (babyId: string, body: FeedingInput) =>
      request<FeedingEvent>(`/babies/${babyId}/feedings`, { method: 'POST', body: JSON.stringify(body) }),
    update: (babyId: string, id: string, body: Partial<FeedingInput>) =>
      request<FeedingEvent>(`/babies/${babyId}/feedings/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (babyId: string, id: string) =>
      request<void>(`/babies/${babyId}/feedings/${id}`, { method: 'DELETE' }),
  },
  diapers: {
    list: (babyId: string, cursor?: string) =>
      request<Paginated<DiaperEvent>>(`/babies/${babyId}/diapers${cursor ? `?cursor=${cursor}` : ''}`),
    create: (babyId: string, body: DiaperInput) =>
      request<DiaperEvent>(`/babies/${babyId}/diapers`, { method: 'POST', body: JSON.stringify(body) }),
    update: (babyId: string, id: string, body: Partial<DiaperInput>) =>
      request<DiaperEvent>(`/babies/${babyId}/diapers/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (babyId: string, id: string) =>
      request<void>(`/babies/${babyId}/diapers/${id}`, { method: 'DELETE' }),
  },
  sleep: {
    list: (babyId: string, cursor?: string) =>
      request<Paginated<SleepEvent>>(`/babies/${babyId}/sleep${cursor ? `?cursor=${cursor}` : ''}`),
    create: (babyId: string, body: SleepInput) =>
      request<SleepEvent>(`/babies/${babyId}/sleep`, { method: 'POST', body: JSON.stringify(body) }),
    update: (babyId: string, id: string, body: Partial<SleepInput>) =>
      request<SleepEvent>(`/babies/${babyId}/sleep/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (babyId: string, id: string) =>
      request<void>(`/babies/${babyId}/sleep/${id}`, { method: 'DELETE' }),
  },
  events: {
    list: (babyId: string, before?: string) =>
      request<UnifiedEvent[]>(`/babies/${babyId}/events${before ? `?before=${before}` : ''}`),
  },
  growth: {
    list: (babyId: string) => request<GrowthRecord[]>(`/babies/${babyId}/growth`),
    create: (babyId: string, body: GrowthInput) =>
      request<GrowthRecord>(`/babies/${babyId}/growth`, { method: 'POST', body: JSON.stringify(body) }),
    delete: (babyId: string, id: string) => request<void>(`/babies/${babyId}/growth/${id}`, { method: 'DELETE' }),
  },
  medications: {
    list: (babyId: string) => request<MedicationRecord[]>(`/babies/${babyId}/medications`),
    create: (babyId: string, body: MedicationInput) =>
      request<MedicationRecord>(`/babies/${babyId}/medications`, { method: 'POST', body: JSON.stringify(body) }),
    delete: (babyId: string, id: string) => request<void>(`/babies/${babyId}/medications/${id}`, { method: 'DELETE' }),
  },
  milestones: {
    list: (babyId: string) => request<MilestoneRecord[]>(`/babies/${babyId}/milestones`),
    create: (babyId: string, body: MilestoneInput) =>
      request<MilestoneRecord>(`/babies/${babyId}/milestones`, { method: 'POST', body: JSON.stringify(body) }),
    delete: (babyId: string, id: string) => request<void>(`/babies/${babyId}/milestones/${id}`, { method: 'DELETE' }),
  },
  appointments: {
    list: (babyId: string) => request<AppointmentRecord[]>(`/babies/${babyId}/appointments`),
    create: (babyId: string, body: AppointmentInput) =>
      request<AppointmentRecord>(`/babies/${babyId}/appointments`, { method: 'POST', body: JSON.stringify(body) }),
    delete: (babyId: string, id: string) => request<void>(`/babies/${babyId}/appointments/${id}`, { method: 'DELETE' }),
  },
  vaccines: {
    list: (babyId: string) => request<VaccineRecord[]>(`/babies/${babyId}/vaccines`),
    create: (babyId: string, body: VaccineInput) =>
      request<VaccineRecord>(`/babies/${babyId}/vaccines`, { method: 'POST', body: JSON.stringify(body) }),
    delete: (babyId: string, id: string) => request<void>(`/babies/${babyId}/vaccines/${id}`, { method: 'DELETE' }),
  },
  settings: {
    get: () => request<AppSettings>('/admin/settings'),
    save: (body: Partial<Pick<AppSettings, 'unitSystem' | 'streamEnabled'>>) =>
      request<AppSettings>('/admin/settings', { method: 'PUT', body: JSON.stringify(body) }),
  },
  stats: {
    get: (babyId: string) => request<Stats>(`/babies/${babyId}/stats`),
  },
  reports: {
    download: async (babyId: string, opts: { since?: string; sections?: string[] }) => {
      const params = new URLSearchParams()
      if (opts.since) params.set('since', opts.since)
      if (opts.sections?.length) params.set('sections', opts.sections.join(','))
      const res = await fetch(`/api/babies/${babyId}/report?${params}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new ApiError(res.status, 'Failed to generate report')
      return res.blob()
    },
    email: (babyId: string, body: { to: string; since?: string; sections?: string[] }) =>
      request<{ ok: boolean }>(`/babies/${babyId}/report/email`, { method: 'POST', body: JSON.stringify(body) }),
  },
}

export interface User { id: string; email: string; name: string; isAdmin?: boolean }
export interface Baby { id: string; name: string; dob: string; sex?: string; createdAt: string }
export interface OAuthProvider { id: string; name: string; label: string; clientId: string; clientSecret?: string; authorizationUrl: string; tokenUrl: string; userInfoUrl: string; scope: string; enabled: boolean; createdAt: string }
export interface SmtpConfig { id: string; host: string; port: number; secure: boolean; user: string; password?: string; fromEmail: string; fromName: string; enabled: boolean }
export interface AdminUser { id: string; email: string; name: string; isAdmin: boolean; oauthProvider?: string | null; createdAt: string; babies: { babyId: string; babyName: string; role: string }[] }
export interface AdminBaby { id: string; name: string; dob: string }
export interface AppSettings { id: string; unitSystem: string; streamEnabled: boolean; streamUrl: string }
export interface BabyCaregiver { userId: string; role: string; user: { id: string; name: string; email: string } }
export interface Dashboard {
  lastFeeding: FeedingEvent | null
  lastDiaper: DiaperEvent | null
  activeSleep: SleepEvent | null
  lastSleep: SleepEvent | null
}
export interface Paginated<T> { items: T[]; hasMore: boolean; nextCursor: string | null }
export interface FeedingEvent { id: string; type: string; side?: string; durationMin?: number; amount?: number; milkType?: string; startedAt: string; endedAt?: string; notes?: string; user: { id: string; name: string } }
export interface DiaperEvent { id: string; type: string; color?: string; occurredAt: string; notes?: string; user: { id: string; name: string } }
export interface SleepEvent { id: string; type: string; location?: string; startedAt: string; endedAt?: string; notes?: string; user: { id: string; name: string } }
export interface GrowthRecord { id: string; weight?: number; length?: number; headCirc?: number; measuredAt: string; notes?: string; user: { id: string; name: string } }
export interface MedicationRecord { id: string; name: string; dose: number; unit: string; occurredAt: string; notes?: string; user: { id: string; name: string } }
export interface MilestoneRecord { id: string; title: string; description?: string; occurredAt: string; user: { id: string; name: string } }
export interface AppointmentRecord { id: string; date: string; doctor?: string; type: string; notes?: string; vaccines: { id: string; vaccineName: string; doseNumber: number | null }[]; user: { id: string; name: string } }
export interface VaccineRecord { id: string; vaccineName: string; doseNumber?: number; lotNumber?: string; administeredAt: string; notes?: string; appointment?: { id: string; date: string; doctor?: string } | null; user: { id: string; name: string } }
export interface Stats {
  feedings24h: { startedAt: string; type: string }[]
  diapers7d: { occurredAt: string; type: string }[]
  sleep7d: { startedAt: string; endedAt: string | null; type: string }[]
  growthAll: { measuredAt: string; weight: number | null; length: number | null; headCirc: number | null }[]
}
export interface UnifiedEvent { id: string; eventType: 'feeding' | 'diaper' | 'sleep'; occurredAt: string; [key: string]: unknown }
export interface FeedingInput { type: string; side?: string; durationMin?: number; amount?: number; milkType?: string; startedAt: string; endedAt?: string; notes?: string }
export interface DiaperInput { type: string; color?: string; occurredAt: string; notes?: string }
export interface SleepInput { type: string; location?: string; startedAt: string; endedAt?: string | null; notes?: string }
export interface GrowthInput { weight?: number; length?: number; headCirc?: number; measuredAt: string; notes?: string }
export interface MedicationInput { name: string; dose: number; unit: string; occurredAt: string; notes?: string }
export interface MilestoneInput { title: string; description?: string; occurredAt: string }
export interface AppointmentInput { date: string; doctor?: string; type: string; notes?: string }
export interface VaccineInput { vaccineName: string; doseNumber?: number; lotNumber?: string; administeredAt: string; appointmentId?: string; notes?: string }
