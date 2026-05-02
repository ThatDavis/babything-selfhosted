import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../App'
import { api, Tenant, AuditLog, Operator, Stats } from '../lib/api'

type Tab = 'tenants' | 'audit' | 'operators'

export default function DashboardPage() {
  const { operator, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('tenants')
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    api.getStats().then(d => setStats(d.stats)).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-brand-600">Babything Operator</h1>
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
            <TabButton active={activeTab === 'tenants'} onClick={() => setActiveTab('tenants')}>Tenants</TabButton>
            <TabButton active={activeTab === 'audit'} onClick={() => setActiveTab('audit')}>Audit Logs</TabButton>
            {operator?.role === 'GLOBAL_ADMIN' && (
              <TabButton active={activeTab === 'operators'} onClick={() => setActiveTab('operators')}>Operators</TabButton>
            )}
          </nav>
        </div>

        {activeTab === 'tenants' && <TenantsTab />}
        {activeTab === 'audit' && <AuditTab />}
        {activeTab === 'operators' && <OperatorsTab />}
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
