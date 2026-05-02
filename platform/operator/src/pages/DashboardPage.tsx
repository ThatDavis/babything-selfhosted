import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../App'
import { api, Tenant, AuditLog, Operator, Stats, DiscountCode, EmailTemplate, Plan } from '../lib/api'

const ALL_TABS = ['tenants', 'audit', 'operators', 'discounts', 'templates', 'plans'] as const
type Tab = typeof ALL_TABS[number]

export default function DashboardPage() {
  const { operator, logout, permissions } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('tenants')
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    api.getStats().then(d => setStats(d.stats)).catch(() => {})
  }, [])

  // If current tab is not in permissions, switch to first available
  useEffect(() => {
    if (permissions.length > 0 && !permissions.includes(activeTab)) {
      const first = ALL_TABS.find(t => permissions.includes(t))
      if (first) setActiveTab(first)
    }
  }, [permissions, activeTab])

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-serif text-brand-600">Babything Operator</h1>
              <span className="badge-gray capitalize">{operator?.role.toLowerCase().replace('_', ' ')}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-stone-500">{operator?.name}</span>
              <button onClick={logout} className="btn-secondary text-xs">Logout</button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Tenants" value={stats.totalTenants} />
            <StatCard label="Active" value={stats.activeTenants} color="green" />
            <StatCard label="Trial" value={stats.trialTenants} color="yellow" />
            <StatCard label="Suspended" value={stats.suspendedTenants} color="red" />
            <StatCard label="Total Users" value={stats.totalUsers} />
            <StatCard label="Total Babies" value={stats.totalBabies} />
            <StatCard label="New (30d)" value={stats.recentSignups} />
            <StatCard label="Expiring (7d)" value={stats.expiringTrials} color="yellow" />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-stone-200 mb-6">
          <nav className="flex gap-6">
            {permissions.includes('tenants') && (
              <TabButton active={activeTab === 'tenants'} onClick={() => setActiveTab('tenants')}>Tenants</TabButton>
            )}
            {permissions.includes('audit') && (
              <TabButton active={activeTab === 'audit'} onClick={() => setActiveTab('audit')}>Audit Logs</TabButton>
            )}
            {permissions.includes('operators') && (
              <TabButton active={activeTab === 'operators'} onClick={() => setActiveTab('operators')}>Operators</TabButton>
            )}
            {permissions.includes('discounts') && (
              <TabButton active={activeTab === 'discounts'} onClick={() => setActiveTab('discounts')}>Discount Codes</TabButton>
            )}
            {permissions.includes('templates') && (
              <TabButton active={activeTab === 'templates'} onClick={() => setActiveTab('templates')}>Email Templates</TabButton>
            )}
            {permissions.includes('plans') && (
              <TabButton active={activeTab === 'plans'} onClick={() => setActiveTab('plans')}>Pricing</TabButton>
            )}
          </nav>
        </div>

        {activeTab === 'tenants' && <TenantsTab />}
        {activeTab === 'audit' && <AuditTab />}
        {activeTab === 'operators' && <OperatorsTab />}
        {activeTab === 'discounts' && <DiscountsTab />}
        {activeTab === 'templates' && <TemplatesTab />}
        {activeTab === 'plans' && <PlansTab />}
      </div>
    </div>
  )
}

// ── Discount Codes Tab ─────────────────────────────────────
function DiscountsTab() {
  const [codes, setCodes] = useState<DiscountCode[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    code: '',
    type: 'FREE_TIME' as 'FREE_TIME' | 'PERCENTAGE',
    value: 180,
    maxUses: '',
    validUntil: '',
    appliesTo: 'ANY' as 'ANY' | 'ANNUAL' | 'MONTHLY',
  })
  const [error, setError] = useState('')

  async function fetchCodes() {
    const d = await api.getDiscountCodes()
    setCodes(d.codes)
  }

  useEffect(() => {
    fetchCodes()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const body: any = {
        code: form.code,
        type: form.type,
        value: form.value,
        appliesTo: form.appliesTo,
      }
      if (form.maxUses) body.maxUses = parseInt(form.maxUses)
      if (form.validUntil) body.validUntil = new Date(form.validUntil).toISOString()
      await api.createDiscountCode(body)
      setShowForm(false)
      setForm({ code: '', type: 'FREE_TIME', value: 180, maxUses: '', validUntil: '', appliesTo: 'ANY' })
      fetchCodes()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleDelete(id: string, code: string) {
    if (!confirm(`Delete discount code "${code}"?`)) return
    await api.deleteDiscountCode(id)
    fetchCodes()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Discount Codes</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary">Add Code</button>
      </div>

      {showForm && (
        <div className="card mb-4">
          <h3 className="font-semibold mb-3">New Discount Code</h3>
          {error && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Code (e.g. SIXMONTHS)" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className="input" required />
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))} className="input">
              <option value="FREE_TIME">Free time (days)</option>
              <option value="PERCENTAGE">Percentage off (%)</option>
            </select>
            <input placeholder="Value (days or %)" type="number" min={1} value={form.value} onChange={e => setForm(f => ({ ...f, value: parseInt(e.target.value) || 0 }))} className="input" required />
            <select value={form.appliesTo} onChange={e => setForm(f => ({ ...f, appliesTo: e.target.value as any }))} className="input">
              <option value="ANY">Any billing period</option>
              <option value="ANNUAL">Annual only</option>
              <option value="MONTHLY">Monthly only</option>
            </select>
            <input placeholder="Max uses (optional)" type="number" min={1} value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} className="input" />
            <input placeholder="Valid until (optional)" type="date" value={form.validUntil} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} className="input" />
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" className="btn-primary">Create</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
        <table className="min-w-full divide-y divide-stone-200">
          <thead className="bg-stone-50">
            <tr>
              <th className="table-header">Code</th>
              <th className="table-header">Type</th>
              <th className="table-header">Value</th>
              <th className="table-header">Uses</th>
              <th className="table-header">Applies To</th>
              <th className="table-header">Status</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {codes.map(dc => (
              <tr key={dc.id} className="hover:bg-stone-50">
                <td className="table-cell font-medium">{dc.code}</td>
                <td className="table-cell">{dc.type === 'FREE_TIME' ? 'Free time' : 'Percentage'}</td>
                <td className="table-cell">{dc.type === 'FREE_TIME' ? `${dc.value} days` : `${dc.value}%`}</td>
                <td className="table-cell">{dc.usedCount}{dc.maxUses !== null ? ` / ${dc.maxUses}` : ''}</td>
                <td className="table-cell">{dc.appliesTo}</td>
                <td className="table-cell">
                  {dc.isActive ? <span className="badge-green">Active</span> : <span className="badge-gray">Inactive</span>}
                </td>
                <td className="table-cell">
                  <button onClick={() => handleDelete(dc.id, dc.code)} className="text-xs text-red-600 hover:text-red-700">Delete</button>
                </td>
              </tr>
            ))}
            {codes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-stone-500">No discount codes yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color?: 'green' | 'yellow' | 'red' }) {
  const colorClass = color === 'green' ? 'text-green-600' : color === 'yellow' ? 'text-yellow-600' : color === 'red' ? 'text-red-600' : 'text-stone-800'
  return (
    <div className="card p-4">
      <p className="text-xs text-stone-500 font-medium uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colorClass}`}>{value}</p>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
        active ? 'border-brand-600 text-brand-600' : 'border-transparent text-stone-500 hover:text-stone-700'
      }`}
    >
      {children}
    </button>
  )
}

// ── Tenants Tab ────────────────────────────────────────────
function TenantsTab() {
  const { operator } = useAuth()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)

  const canManage = operator?.role === 'GLOBAL_ADMIN' || operator?.role === 'ACCOUNTING'
  const isGlobalAdmin = operator?.role === 'GLOBAL_ADMIN'

  const fetchTenants = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.getTenants({ search, status: statusFilter, page, limit: 20 })
      setTenants(data.tenants)
      setTotalPages(data.pagination.totalPages)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, page])

  useEffect(() => {
    fetchTenants()
  }, [fetchTenants])

  async function handleSuspend(subdomain: string) {
    if (!confirm(`Suspend tenant "${subdomain}"?`)) return
    await api.suspendTenant(subdomain)
    fetchTenants()
  }

  async function handleActivate(subdomain: string) {
    if (!confirm(`Activate tenant "${subdomain}"?`)) return
    await api.activateTenant(subdomain)
    fetchTenants()
  }

  async function handleExtendTrial(subdomain: string) {
    const days = prompt('Extend trial by how many days?', '7')
    if (!days) return
    await api.extendTrial(subdomain, parseInt(days))
    fetchTenants()
  }

  async function handleDelete(subdomain: string) {
    if (!confirm(`DELETE tenant "${subdomain}" and all its data? This cannot be undone.`)) return
    await api.deleteTenant(subdomain)
    fetchTenants()
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search subdomains..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="input sm:w-64"
        />
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="input sm:w-40"
        >
          <option value="">All statuses</option>
          <option value="TRIAL">Trial</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200">
            <thead className="bg-stone-50">
              <tr>
                <th className="table-header">Subdomain</th>
                <th className="table-header">Status</th>
                <th className="table-header">Trial Ends</th>
                <th className="table-header">Plan</th>
                <th className="table-header">Users</th>
                <th className="table-header">Babies</th>
                <th className="table-header">Created</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {tenants.map(t => (
                <tr key={t.id} className="hover:bg-stone-50">
                  <td className="table-cell font-medium">{t.subdomain}</td>
                  <td className="table-cell">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="table-cell">{t.trialEndsAt ? new Date(t.trialEndsAt).toLocaleDateString() : '—'}</td>
                  <td className="table-cell">{t.plan} / {t.billingPeriod}</td>
                  <td className="table-cell">{t.userCount}</td>
                  <td className="table-cell">{t.babyCount}</td>
                  <td className="table-cell">{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelectedTenant(t)} className="text-xs text-brand-600 hover:text-brand-700">Details</button>
                      {canManage && t.status === 'TRIAL' && (
                        <button onClick={() => handleExtendTrial(t.subdomain)} className="text-xs text-brand-600 hover:text-brand-700">Extend</button>
                      )}
                      {isGlobalAdmin && t.status !== 'SUSPENDED' && (
                        <button onClick={() => handleSuspend(t.subdomain)} className="text-xs text-yellow-600 hover:text-yellow-700">Suspend</button>
                      )}
                      {isGlobalAdmin && t.status === 'SUSPENDED' && (
                        <button onClick={() => handleActivate(t.subdomain)} className="text-xs text-green-600 hover:text-green-700">Activate</button>
                      )}
                      {isGlobalAdmin && (
                        <button onClick={() => handleDelete(t.subdomain)} className="text-xs text-red-600 hover:text-red-700">Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-stone-500">No tenants found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-stone-200">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="btn-secondary text-xs"
          >
            Previous
          </button>
          <span className="text-sm text-stone-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="btn-secondary text-xs"
          >
            Next
          </button>
        </div>
      </div>

      {/* Tenant Detail Modal */}
      {selectedTenant && (
        <TenantDetailModal tenant={selectedTenant} onClose={() => setSelectedTenant(null)} />
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'ACTIVE') return <span className="badge-green">Active</span>
  if (status === 'TRIAL') return <span className="badge-yellow">Trial</span>
  if (status === 'SUSPENDED') return <span className="badge-red">Suspended</span>
  return <span className="badge-gray">{status}</span>
}

function TenantDetailModal({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const [details, setDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getTenant(tenant.subdomain)
      .then(d => setDetails(d.tenant))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tenant.subdomain])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-lg w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">{tenant.subdomain}</h2>
            <button onClick={onClose} className="text-stone-400 hover:text-stone-600">✕</button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-stone-500">Loading...</div>
          ) : details ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-stone-500">Status:</span> <StatusBadge status={details.status} /></div>
                <div><span className="text-stone-500">Plan:</span> {details.plan}</div>
                <div><span className="text-stone-500">Trial ends:</span> {details.trialEndsAt ? new Date(details.trialEndsAt).toLocaleDateString() : '—'}</div>
                <div><span className="text-stone-500">Referral:</span> {details.referralCode ?? '—'}</div>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2">Users ({details.users.length})</h3>
                <div className="space-y-1">
                  {details.users.map((u: any) => (
                    <div key={u.id} className="text-sm flex justify-between">
                      <span>{u.name}</span>
                      <span className="text-stone-500">{u.email}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2">Babies ({details.babies.length})</h3>
                <div className="space-y-1">
                  {details.babies.map((b: any) => (
                    <div key={b.id} className="text-sm flex justify-between">
                      <span>{b.name}</span>
                      <span className="text-stone-500">{new Date(b.dob).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-stone-500">Failed to load details.</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Audit Tab ──────────────────────────────────────────────
function AuditTab() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.getAuditLogs({ page, limit: 20 })
      .then(d => { setLogs(d.logs); setTotalPages(d.pagination.totalPages) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page])

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200">
            <thead className="bg-stone-50">
              <tr>
                <th className="table-header">Time</th>
                <th className="table-header">Operator</th>
                <th className="table-header">Action</th>
                <th className="table-header">Target</th>
                <th className="table-header">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {logs.map(l => (
                <tr key={l.id} className="hover:bg-stone-50">
                  <td className="table-cell">{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="table-cell">{l.operator.name}</td>
                  <td className="table-cell font-medium">{l.action}</td>
                  <td className="table-cell">{l.targetType ? `${l.targetType}:${l.targetId}` : '—'}</td>
                  <td className="table-cell text-stone-500">{l.ipAddress ?? '—'}</td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-stone-500">No audit logs yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-stone-200">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary text-xs">Previous</button>
          <span className="text-sm text-stone-500">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-secondary text-xs">Next</button>
        </div>
      </div>
    </div>
  )
}

// ── Email Templates Tab ────────────────────────────────────
function TemplatesTab() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [editing, setEditing] = useState<EmailTemplate | null>(null)
  const [form, setForm] = useState({ name: '', subject: '', htmlBody: '' })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [testLoading, setTestLoading] = useState(false)
  const [testMessage, setTestMessage] = useState('')
  const [testError, setTestError] = useState('')

  const builtInTemplates = [
    { name: 'welcome', label: 'Welcome (registration)', vars: 'name, appUrl' },
    { name: 'invite', label: 'Invite caregiver', vars: 'inviterName, babyName, inviteUrl' },
    { name: 'password_reset', label: 'Password reset', vars: 'name, resetUrl' },
    { name: 'report', label: 'PDF report', vars: 'babyName' },
  ]

  async function fetchTemplates() {
    const d = await api.getEmailTemplates()
    setTemplates(d.templates)
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function startEdit(name: string) {
    setError('')
    setMessage('')
    setTestMessage('')
    setTestError('')
    setTestEmail('')
    try {
      const { template } = await api.getEmailTemplate(name)
      setEditing(template.id ? template : null)
      setForm({ name: template.name, subject: template.subject, htmlBody: template.htmlBody })
    } catch {
      setEditing(null)
      setForm({ name, subject: '', htmlBody: '' })
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      await api.saveEmailTemplate(form)
      setMessage('Template saved.')
      fetchTemplates()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete custom template for "${name}"? The default template will be used instead.`)) return
    await api.deleteEmailTemplate(id)
    fetchTemplates()
    if (editing?.id === id) {
      setEditing(null)
      setForm({ name: '', subject: '', htmlBody: '' })
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Email Templates</h2>
        <button
          onClick={async () => {
            if (!confirm('Reset all email templates to default content? Any customizations will be overwritten.')) return
            setError('')
            setMessage('')
            try {
              await api.seedEmailTemplates()
              setMessage('All templates reset to defaults.')
              fetchTemplates()
            } catch (err: any) {
              setError(err.message)
            }
          }}
          className="btn-secondary text-xs"
        >
          Reset to Defaults
        </button>
      </div>

      {message && <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template list */}
        <div className="card">
          <h3 className="font-semibold mb-3">Available Templates</h3>
          <div className="space-y-2">
            {builtInTemplates.map(bt => {
              const custom = templates.find(t => t.name === bt.name)
              return (
                <div key={bt.name} className={`flex items-center justify-between p-3 rounded-lg border ${custom ? 'border-brand-200 bg-brand-50' : 'border-stone-200 bg-white'}`}>
                  <div>
                    <p className="font-medium text-sm">{bt.label}</p>
                    <p className="text-xs text-stone-500">Variables: {bt.vars}</p>
                    {custom && <span className="text-xs text-brand-600 font-medium">Customized</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => startEdit(bt.name)} className="btn-secondary text-xs">
                      {custom ? 'Edit' : 'Customize'}
                    </button>
                    {custom && (
                      <button onClick={() => handleDelete(custom.id, bt.name)} className="text-xs text-red-600 hover:text-red-700">Reset</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-stone-500 mt-4">
            Use <code className="bg-stone-100 px-1 rounded">{'{{variableName}}'}</code> syntax to insert dynamic values.
            If no custom template exists, the hardcoded default is used.
          </p>
        </div>

        {/* Editor */}
        {form.name && (
          <div className="card">
            <h3 className="font-semibold mb-3">
              {editing ? 'Edit' : 'Customize'} {builtInTemplates.find(b => b.name === form.name)?.label ?? form.name}
            </h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <input
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">HTML Body</label>
                <textarea
                  value={form.htmlBody}
                  onChange={e => setForm(f => ({ ...f, htmlBody: e.target.value }))}
                  className="input font-mono text-sm"
                  rows={12}
                  required
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary">Save Template</button>
                <button type="button" onClick={() => { setEditing(null); setForm({ name: '', subject: '', htmlBody: '' }); setError(''); setMessage(''); setTestMessage(''); setTestError(''); setTestEmail('') }} className="btn-secondary">Cancel</button>
              </div>
            </form>

            {/* Test email */}
            <div className="mt-6 pt-6 border-t border-stone-200">
              <h4 className="text-sm font-medium mb-2">Send Test Email</h4>
              <p className="text-xs text-stone-500 mb-3">
                Sends this template with sample variables to review formatting.
              </p>
              {testMessage && <div className="mb-3 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{testMessage}</div>}
              {testError && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{testError}</div>}
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  className="input flex-1"
                />
                <button
                  onClick={async () => {
                    setTestError('')
                    setTestMessage('')
                    if (!testEmail) { setTestError('Enter an email address'); return }
                    setTestLoading(true)
                    try {
                      await api.sendTestEmail(form.name, testEmail)
                      setTestMessage('Test email sent.')
                      setTestEmail('')
                    } catch (err: any) {
                      setTestError(err.message)
                    } finally {
                      setTestLoading(false)
                    }
                  }}
                  disabled={testLoading}
                  className="btn-secondary"
                >
                  {testLoading ? 'Sending...' : 'Send Test'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Plans Tab ──────────────────────────────────────────────
function PlansTab() {
  const { operator } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    monthlyPrice: 800,
    annualPrice: 7700,
    annualDiscountPercent: null as number | null,
    stripeMonthlyPriceId: '',
    stripeAnnualPriceId: '',
    features: '',
    isActive: true,
    sortOrder: 0,
  })
  // Raw string inputs for price fields so typing isn't interrupted by formatting
  const [monthlyInput, setMonthlyInput] = useState('8.00')
  const [annualInput, setAnnualInput] = useState('77.00')
  const [discountInput, setDiscountInput] = useState('')
  const [annualMode, setAnnualMode] = useState<'fixed' | 'discount'>('fixed')
  const [error, setError] = useState('')

  const isGlobalAdmin = operator?.role === 'GLOBAL_ADMIN'

  async function fetchPlans() {
    const d = await api.getPlans()
    setPlans(d.plans)
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  function centsToDollars(cents: number) {
    return (cents / 100).toFixed(2)
  }

  function dollarsToCents(val: string) {
    return Math.round(parseFloat(val) * 100) || 0
  }

  function calcAnnualFromDiscount(monthlyCents: number, discount: number) {
    return Math.round(monthlyCents * 12 * (100 - discount) / 100)
  }

  function syncAnnualPrice(monthlyCents: number, discount: number | null) {
    if (annualMode === 'discount' && discount != null) {
      const annualCents = calcAnnualFromDiscount(monthlyCents, discount)
      setForm(f => ({ ...f, annualPrice: annualCents }))
      setAnnualInput(centsToDollars(annualCents))
    }
  }

  function startEdit(plan: Plan) {
    setEditingId(plan.id)
    const mode = plan.annualDiscountPercent != null ? 'discount' : 'fixed'
    setAnnualMode(mode)
    setForm({
      name: plan.name,
      description: plan.description ?? '',
      monthlyPrice: plan.monthlyPrice,
      annualPrice: plan.annualPrice,
      annualDiscountPercent: plan.annualDiscountPercent,
      stripeMonthlyPriceId: plan.stripeMonthlyPriceId ?? '',
      stripeAnnualPriceId: plan.stripeAnnualPriceId ?? '',
      features: plan.features.join(', '),
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
    })
    setMonthlyInput(centsToDollars(plan.monthlyPrice))
    setAnnualInput(centsToDollars(plan.annualPrice))
    setDiscountInput(plan.annualDiscountPercent?.toString() ?? '')
    setShowForm(true)
    setError('')
  }

  function resetForm() {
    setEditingId(null)
    setAnnualMode('fixed')
    setForm({
      name: '',
      description: '',
      monthlyPrice: 800,
      annualPrice: 7700,
      annualDiscountPercent: null,
      stripeMonthlyPriceId: '',
      stripeAnnualPriceId: '',
      features: '',
      isActive: true,
      sortOrder: 0,
    })
    setMonthlyInput('8.00')
    setAnnualInput('77.00')
    setDiscountInput('')
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const monthlyCents = dollarsToCents(monthlyInput)
    let annualCents: number
    let discount: number | null = null

    if (annualMode === 'discount') {
      discount = parseInt(discountInput) || 0
      annualCents = calcAnnualFromDiscount(monthlyCents, discount)
    } else {
      annualCents = dollarsToCents(annualInput)
    }

    const body: any = {
      name: form.name,
      description: form.description || undefined,
      monthlyPrice: monthlyCents,
      annualPrice: annualCents,
      stripeMonthlyPriceId: form.stripeMonthlyPriceId || undefined,
      stripeAnnualPriceId: form.stripeAnnualPriceId || undefined,
      features: form.features.split(',').map(f => f.trim()).filter(Boolean),
      isActive: form.isActive,
      sortOrder: form.sortOrder,
    }

    if (annualMode === 'discount') {
      body.annualDiscountPercent = discount
    } else {
      body.annualDiscountPercent = null
    }

    try {
      if (editingId) {
        await api.updatePlan(editingId, body)
      } else {
        await api.createPlan(body)
      }
      setShowForm(false)
      resetForm()
      fetchPlans()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete plan "${name}"? This cannot be undone.`)) return
    await api.deletePlan(id)
    fetchPlans()
  }

  function formatPrice(cents: number) {
    const dollars = cents / 100
    return dollars % 1 === 0 ? `$${dollars.toFixed(0)}` : `$${dollars.toFixed(2)}`
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Pricing Plans</h2>
        <button onClick={() => { setShowForm(true); resetForm() }} className="btn-primary">Add Plan</button>
      </div>

      {showForm && (
        <div className="card mb-4">
          <h3 className="font-semibold mb-3">{editingId ? 'Edit Plan' : 'New Plan'}</h3>
          {error && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Plan name (e.g. Flat Rate)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" required />
            <input placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input" />

            {/* Monthly price */}
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Monthly price ($)</label>
              <input
                type="number" min={0} step="0.01"
                value={monthlyInput}
                onChange={e => setMonthlyInput(e.target.value)}
                onBlur={e => {
                  const cents = dollarsToCents(e.target.value)
                  setForm(f => ({ ...f, monthlyPrice: cents }))
                  setMonthlyInput(centsToDollars(cents))
                  if (annualMode === 'discount') {
                    syncAnnualPrice(cents, form.annualDiscountPercent)
                  }
                }}
                className="input" required
              />
            </div>

            {/* Annual pricing mode toggle */}
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Annual pricing</label>
              <div className="flex rounded-lg border border-stone-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAnnualMode('fixed')}
                  className={`flex-1 px-3 py-2 text-sm ${annualMode === 'fixed' ? 'bg-brand-50 text-brand-700 font-medium' : 'bg-white text-stone-600'}`}
                >
                  Fixed price
                </button>
                <button
                  type="button"
                  onClick={() => setAnnualMode('discount')}
                  className={`flex-1 px-3 py-2 text-sm ${annualMode === 'discount' ? 'bg-brand-50 text-brand-700 font-medium' : 'bg-white text-stone-600'}`}
                >
                  Discount %
                </button>
              </div>
            </div>

            {/* Annual price input (fixed mode) */}
            {annualMode === 'fixed' && (
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Annual price ($)</label>
                <input
                  type="number" min={0} step="0.01"
                  value={annualInput}
                  onChange={e => setAnnualInput(e.target.value)}
                  onBlur={e => {
                    const cents = dollarsToCents(e.target.value)
                    setForm(f => ({ ...f, annualPrice: cents }))
                    setAnnualInput(centsToDollars(cents))
                  }}
                  className="input" required
                />
              </div>
            )}

            {/* Discount % input (discount mode) */}
            {annualMode === 'discount' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Annual discount (%)</label>
                  <input
                    type="number" min={0} max={100} step="1"
                    value={discountInput}
                    onChange={e => {
                      setDiscountInput(e.target.value)
                      const discount = parseInt(e.target.value) || 0
                      const annualCents = calcAnnualFromDiscount(form.monthlyPrice, discount)
                      setForm(f => ({ ...f, annualPrice: annualCents, annualDiscountPercent: discount }))
                      setAnnualInput(centsToDollars(annualCents))
                    }}
                    className="input" required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Calculated annual price</label>
                  <div className="input bg-stone-50 text-stone-600">
                    {formatPrice(form.annualPrice)}
                  </div>
                </div>
              </>
            )}

            <input placeholder="Stripe monthly price ID" value={form.stripeMonthlyPriceId} onChange={e => setForm(f => ({ ...f, stripeMonthlyPriceId: e.target.value }))} className="input" />
            <input placeholder="Stripe annual price ID" value={form.stripeAnnualPriceId} onChange={e => setForm(f => ({ ...f, stripeAnnualPriceId: e.target.value }))} className="input" />
            <input placeholder="Features (comma-separated)" value={form.features} onChange={e => setForm(f => ({ ...f, features: e.target.value }))} className="input" />
            <input placeholder="Sort order" type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} className="input" />
            <label className="flex items-center gap-2 sm:col-span-2">
              <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
              <span className="text-sm">Active</span>
            </label>
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" className="btn-primary">{editingId ? 'Update' : 'Create'}</button>
              <button type="button" onClick={() => { setShowForm(false); resetForm() }} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
        <table className="min-w-full divide-y divide-stone-200">
          <thead className="bg-stone-50">
            <tr>
              <th className="table-header">Name</th>
              <th className="table-header">Monthly</th>
              <th className="table-header">Annual</th>
              <th className="table-header">Discount</th>
              <th className="table-header">Stripe IDs</th>
              <th className="table-header">Status</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {plans.map(p => (
              <tr key={p.id} className="hover:bg-stone-50">
                <td className="table-cell">
                  <div className="font-medium">{p.name}</div>
                  {p.description && <div className="text-xs text-stone-500">{p.description}</div>}
                </td>
                <td className="table-cell">{formatPrice(p.monthlyPrice)}</td>
                <td className="table-cell">{formatPrice(p.annualPrice)}</td>
                <td className="table-cell">
                  {p.annualDiscountPercent != null ? (
                    <span className="text-green-600 font-medium">{p.annualDiscountPercent}% off</span>
                  ) : (
                    <span className="text-stone-400">—</span>
                  )}
                </td>
                <td className="table-cell text-xs text-stone-500">
                  <div>M: {p.stripeMonthlyPriceId ?? '—'}</div>
                  <div>A: {p.stripeAnnualPriceId ?? '—'}</div>
                </td>
                <td className="table-cell">
                  {p.isActive ? <span className="badge-green">Active</span> : <span className="badge-gray">Inactive</span>}
                </td>
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    <button onClick={() => startEdit(p)} className="text-xs text-brand-600 hover:text-brand-700">Edit</button>
                    {isGlobalAdmin && (
                      <button onClick={() => handleDelete(p.id, p.name)} className="text-xs text-red-600 hover:text-red-700">Delete</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {plans.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-stone-500">No pricing plans yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Operators Tab ──────────────────────────────────────────
function OperatorsTab() {
  const [operators, setOperators] = useState<Operator[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'HELPDESK' })
  const [error, setError] = useState('')

  async function fetchOperators() {
    const d = await api.getOperators()
    setOperators(d.operators)
  }

  useEffect(() => {
    fetchOperators()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await api.createOperator(form)
      setShowForm(false)
      setForm({ email: '', name: '', password: '', role: 'HELPDESK' })
      fetchOperators()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this operator?')) return
    await api.deleteOperator(id)
    fetchOperators()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Operators</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary">Add Operator</button>
      </div>

      {showForm && (
        <div className="card mb-4">
          <h3 className="font-semibold mb-3">New Operator</h3>
          {error && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input" required />
            <input placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" required />
            <input placeholder="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="input" required />
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="input">
              <option value="HELPDESK">Helpdesk</option>
              <option value="ACCOUNTING">Accounting</option>
              <option value="GLOBAL_ADMIN">Global Admin</option>
            </select>
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" className="btn-primary">Create</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
        <table className="min-w-full divide-y divide-stone-200">
          <thead className="bg-stone-50">
            <tr>
              <th className="table-header">Name</th>
              <th className="table-header">Email</th>
              <th className="table-header">Role</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {operators.map(op => (
              <tr key={op.id} className="hover:bg-stone-50">
                <td className="table-cell font-medium">{op.name}</td>
                <td className="table-cell">{op.email}</td>
                <td className="table-cell"><span className="badge-gray">{op.role}</span></td>
                <td className="table-cell">
                  <button onClick={() => handleDelete(op.id)} className="text-xs text-red-600 hover:text-red-700">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
