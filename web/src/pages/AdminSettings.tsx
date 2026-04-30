import { useState, useEffect, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import type { OAuthProvider, AdminUser, AdminBaby } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useUnits } from '../contexts/UnitsContext'
import type { UnitSystem } from '../lib/units'

type Section = 'general' | 'stream' | 'smtp' | 'oauth' | 'users' | 'dev'

const isDev = import.meta.env.DEV

export default function AdminSettings() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [section, setSection] = useState<Section>('general')
  const [isCloud, setIsCloud] = useState(false)

  useEffect(() => {
    api.auth.config().then(c => setIsCloud(c.deploymentMode === 'cloud')).catch(() => {})
  }, [])

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-stone-500">Access denied.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-100 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="text-stone-400 hover:text-stone-600">← Back</button>
        <h1 className="text-xl font-bold text-brand-600">Admin Settings</h1>
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <div className="flex gap-2 border-b border-stone-200 pb-2 flex-wrap">
          {([
            'general',
            ...(isCloud ? [] : ['stream', 'smtp', 'oauth']),
            'users',
            ...(isDev && !isCloud ? ['dev'] : []),
          ] as Section[]).map(s => (
            <button key={s} onClick={() => setSection(s)}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium capitalize transition-colors ${section === s ? 'bg-white border border-b-white border-stone-200 -mb-px text-brand-600' : 'text-stone-500 hover:text-stone-700'}`}>
              {s === 'general' ? 'General' : s === 'stream' ? 'Monitor' : s === 'smtp' ? 'SMTP Email' : s === 'oauth' ? 'OAuth Providers' : s === 'users' ? 'Users' : 'Developer'}
            </button>
          ))}
        </div>

        {section === 'general' && <GeneralSection />}
        {section === 'stream' && !isCloud && <StreamSection />}
        {section === 'smtp' && !isCloud && <SmtpSection />}
        {section === 'oauth' && !isCloud && <OAuthSection />}
        {section === 'users' && <UsersSection />}
        {section === 'dev' && !isCloud && <DevSection />}
      </div>
    </div>
  )
}

function GeneralSection() {
  const { unitSystem, setUnitSystem } = useUnits()
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function save(system: UnitSystem) {
    setSaving(true); setMsg(null)
    try {
      await api.settings.save({ unitSystem: system })
      setUnitSystem(system)
      setMsg({ ok: true, text: 'Saved.' })
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Save failed' })
    } finally { setSaving(false) }
  }

  return (
    <div className="card space-y-5">
      <h2 className="font-semibold text-stone-700">General Settings</h2>
      {msg && <p className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
      <div>
        <p className="text-sm font-medium mb-3">Unit system</p>
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          {(['metric', 'imperial'] as UnitSystem[]).map(s => (
            <button key={s} onClick={() => save(s)} disabled={saving}
              className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-colors ${unitSystem === s ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-stone-200 text-stone-600 hover:border-stone-300'}`}>
              {s === 'metric' ? '🌍 Metric' : '🇺🇸 Imperial'}
              <p className="text-xs font-normal mt-0.5 opacity-70">{s === 'metric' ? 'kg, cm' : 'lbs, oz, in'}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function StreamSection() {
  const { streamEnabled, setStreamEnabled } = useUnits()
  const [streamUrl, setStreamUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    api.settings.get().then(s => setStreamUrl(s.streamUrl)).catch(() => {})
  }, [])

  async function toggle(enabled: boolean) {
    setSaving(true); setMsg(null)
    try {
      await api.settings.save({ streamEnabled: enabled })
      setStreamEnabled(enabled)
      setMsg({ ok: true, text: 'Saved.' })
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Save failed' })
    } finally { setSaving(false) }
  }

  return (
    <div className="card space-y-5">
      <h2 className="font-semibold text-stone-700">Baby Monitor</h2>
      {msg && <p className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Show Monitor tab</p>
          <p className="text-xs text-stone-400 mt-0.5">Displays the live camera feed to all caregivers</p>
        </div>
        <button onClick={() => toggle(!streamEnabled)} disabled={saving}
          className={`relative w-11 h-6 rounded-full transition-colors ${streamEnabled ? 'bg-brand-500' : 'bg-stone-300'}`}>
          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${streamEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      <div className="p-4 bg-stone-50 rounded-xl space-y-3 text-sm">
        <p className="font-medium text-stone-700">RTSP stream URL</p>
        <div className="font-mono text-xs bg-white border border-stone-200 rounded-lg px-3 py-2 break-all text-stone-600 min-h-[2rem]">
          {streamUrl || <span className="text-stone-400 italic">Not configured — set CAMERA_RTSP_URL in .env</span>}
        </div>
        <p className="text-xs text-stone-400 leading-relaxed">
          The stream URL is set via <code className="bg-stone-200 px-1 rounded">CAMERA_RTSP_URL</code> in your <code className="bg-stone-200 px-1 rounded">.env</code> file.
          Restart the stack after changing it (<code className="bg-stone-200 px-1 rounded">docker compose restart mediamtx</code>).
        </p>
        <div className="text-xs text-stone-400 leading-relaxed space-y-1 pt-1 border-t border-stone-200">
          <p className="font-medium text-stone-500">UniFi Protect setup:</p>
          <ol className="list-decimal list-inside space-y-0.5 ml-1">
            <li>Open UniFi Protect → select your G4 Instant → Settings → General</li>
            <li>Enable <strong>RTSP stream</strong> and copy the URL</li>
            <li>Paste it as <code className="bg-stone-200 px-1 rounded">CAMERA_RTSP_URL</code> in <code className="bg-stone-200 px-1 rounded">.env</code></li>
          </ol>
        </div>
      </div>
    </div>
  )
}

function SmtpSection() {
  const { user } = useAuth()
  const [form, setForm] = useState({ host: '', port: 587, secure: false, user: '', password: '', fromEmail: '', fromName: 'Babything', enabled: true })
  const [testEmail, setTestEmail] = useState(user?.email ?? '')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    api.admin.getSmtp().then(cfg => {
      if (cfg) setForm({ host: cfg.host, port: cfg.port, secure: cfg.secure, user: cfg.user, password: '', fromEmail: cfg.fromEmail, fromName: cfg.fromName, enabled: cfg.enabled })
    }).catch(() => {})
  }, [])

  async function save(e: FormEvent) {
    e.preventDefault()
    setSaving(true); setMsg(null)
    try {
      await api.admin.saveSmtp(form)
      setMsg({ ok: true, text: 'Saved.' })
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Save failed' })
    } finally { setSaving(false) }
  }

  async function test() {
    setTesting(true); setMsg(null)
    try {
      await api.admin.testSmtp(testEmail)
      setMsg({ ok: true, text: `Test email sent to ${testEmail}` })
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Test failed' })
    } finally { setTesting(false) }
  }

  const set = (k: keyof typeof form, v: string | number | boolean) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={save} className="card space-y-4">
      <h2 className="font-semibold text-stone-700">SMTP Configuration</h2>
      {msg && <p className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-sm font-medium mb-1">Host</label>
          <input className="input" value={form.host} onChange={e => set('host', e.target.value)} placeholder="smtp.example.com" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Port</label>
          <input className="input" type="number" value={form.port} onChange={e => set('port', Number(e.target.value))} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Username</label>
          <input className="input" value={form.user} onChange={e => set('user', e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input className="input" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Leave blank to keep existing" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">From Email</label>
          <input className="input" type="email" value={form.fromEmail} onChange={e => set('fromEmail', e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">From Name</label>
          <input className="input" value={form.fromName} onChange={e => set('fromName', e.target.value)} required />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={form.secure} onChange={e => set('secure', e.target.checked)} className="rounded" />
          Use TLS (port 465)
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={form.enabled} onChange={e => set('enabled', e.target.checked)} className="rounded" />
          Enabled
        </label>
      </div>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-100">
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        <div className="flex gap-2 items-center ml-auto">
          <input className="input w-48" type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="test@example.com" />
          <button type="button" onClick={test} className="btn-ghost border border-stone-200" disabled={testing}>{testing ? 'Sending…' : 'Send test'}</button>
        </div>
      </div>
    </form>
  )
}

function OAuthSection() {
  const [providers, setProviders] = useState<OAuthProvider[]>([])
  const [editing, setEditing] = useState<OAuthProvider | null>(null)
  const [adding, setAdding] = useState(false)

  const reload = () => api.admin.getOAuthProviders().then(setProviders).catch(() => {})
  useEffect(() => { reload() }, [])

  async function remove(id: string) {
    if (!confirm('Delete this provider?')) return
    await api.admin.deleteOAuthProvider(id).catch(() => {})
    reload()
  }

  if (editing) return <OAuthForm provider={editing} onDone={() => { setEditing(null); reload() }} />
  if (adding) return <OAuthForm onDone={() => { setAdding(false); reload() }} />

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-stone-700">OAuth Providers</h2>
        <button className="btn-primary text-sm" onClick={() => setAdding(true)}>+ Add provider</button>
      </div>
      {providers.length === 0 && <p className="text-stone-400 text-sm">No providers configured.</p>}
      <div className="space-y-2">
        {providers.map(p => (
          <div key={p.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
            <div>
              <p className="font-medium text-sm">{p.label} <span className="text-stone-400 font-normal">({p.name})</span></p>
              <p className="text-xs text-stone-400">{p.enabled ? 'Enabled' : 'Disabled'} · scope: {p.scope}</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-ghost text-sm border border-stone-200" onClick={() => setEditing(p)}>Edit</button>
              <button className="btn-ghost text-sm text-red-500 border border-red-100" onClick={() => remove(p.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function OAuthForm({ provider, onDone }: { provider?: OAuthProvider; onDone: () => void }) {
  const blank = { name: '', label: '', clientId: '', clientSecret: '', authorizationUrl: '', tokenUrl: '', userInfoUrl: '', scope: 'openid email profile', enabled: true }
  const [form, setForm] = useState(provider ? { name: provider.name, label: provider.label, clientId: provider.clientId, clientSecret: '', authorizationUrl: provider.authorizationUrl, tokenUrl: provider.tokenUrl, userInfoUrl: provider.userInfoUrl, scope: provider.scope, enabled: provider.enabled } : blank)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof typeof form, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  async function save(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      if (provider) await api.admin.updateOAuthProvider(provider.id, form)
      else await api.admin.createOAuthProvider(form)
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="card space-y-4">
      <h2 className="font-semibold text-stone-700">{provider ? 'Edit' : 'Add'} OAuth Provider</h2>
      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Name (slug)</label>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="google" required disabled={!!provider} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Label</label>
          <input className="input" value={form.label} onChange={e => set('label', e.target.value)} placeholder="Sign in with Google" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Client ID</label>
          <input className="input" value={form.clientId} onChange={e => set('clientId', e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Client Secret</label>
          <input className="input" value={form.clientSecret} onChange={e => set('clientSecret', e.target.value)} placeholder={provider ? 'Leave blank to keep existing' : ''} required={!provider} />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">Authorization URL</label>
          <input className="input" type="url" value={form.authorizationUrl} onChange={e => set('authorizationUrl', e.target.value)} placeholder="https://accounts.google.com/o/oauth2/v2/auth" required />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">Token URL</label>
          <input className="input" type="url" value={form.tokenUrl} onChange={e => set('tokenUrl', e.target.value)} placeholder="https://oauth2.googleapis.com/token" required />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">User Info URL</label>
          <input className="input" type="url" value={form.userInfoUrl} onChange={e => set('userInfoUrl', e.target.value)} placeholder="https://openidconnect.googleapis.com/v1/userinfo" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Scope</label>
          <input className="input" value={form.scope} onChange={e => set('scope', e.target.value)} required />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.enabled} onChange={e => set('enabled', e.target.checked)} className="rounded" />
            Enabled
          </label>
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t border-stone-100">
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        <button type="button" className="btn-ghost border border-stone-200" onClick={onDone}>Cancel</button>
      </div>
    </form>
  )
}

function UsersSection() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [allBabies, setAllBabies] = useState<AdminBaby[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  const reload = () => Promise.all([
    api.admin.getUsers().then(setUsers),
    api.admin.getBabies().then(setAllBabies),
  ]).catch(() => {})

  useEffect(() => { reload() }, [])

  async function toggleAdmin(u: AdminUser) {
    if (u.id === me?.id) return
    await api.admin.setAdmin(u.id, !u.isAdmin).catch(() => {})
    reload()
  }

  async function deleteUser(u: AdminUser) {
    if (!confirm(`Delete "${u.name}" (${u.email})? This cannot be undone.`)) return
    try {
      await api.admin.deleteUser(u.id)
      reload()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Delete failed')
    }
  }

  return (
    <div className="card space-y-3">
      <h2 className="font-semibold text-stone-700">Users</h2>
      {users.length === 0 && <p className="text-sm text-stone-400">No users found.</p>}
      {users.map(u => (
        <div key={u.id} className="border border-stone-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-3 bg-stone-50">
            <button className="flex-1 text-left" onClick={() => setExpanded(expanded === u.id ? null : u.id)}>
              <p className="font-medium text-sm">{u.name} <span className="text-stone-400 font-normal">{u.email}</span></p>
              <p className="text-xs text-stone-400">
                {u.oauthProvider ? `OAuth: ${u.oauthProvider}` : 'Password'}
                {' · '}Joined {new Date(u.createdAt).toLocaleDateString()}
                {' · '}{u.babies.length} {u.babies.length === 1 ? 'baby' : 'babies'}
              </p>
            </button>
            <div className="flex items-center gap-2 ml-3 shrink-0">
              <button onClick={() => toggleAdmin(u)} disabled={u.id === me?.id}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${u.isAdmin ? 'bg-brand-100 text-brand-700 hover:bg-brand-200' : 'bg-stone-200 text-stone-600 hover:bg-stone-300'} disabled:opacity-40 disabled:cursor-not-allowed`}>
                {u.isAdmin ? 'Admin' : 'User'}
              </button>
              <button onClick={() => setExpanded(expanded === u.id ? null : u.id)}
                className="text-stone-400 text-sm w-6 text-center">
                {expanded === u.id ? '▲' : '▼'}
              </button>
            </div>
          </div>

          {expanded === u.id && (
            <div className="p-3 space-y-3 border-t border-stone-200 bg-white">
              <UserBabyManager u={u} allBabies={allBabies} onChanged={reload} />
              {u.id !== me?.id && (
                <div className="pt-2 border-t border-stone-100">
                  <button onClick={() => deleteUser(u)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
                    Delete user account
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function UserBabyManager({ u, allBabies, onChanged }: { u: AdminUser; allBabies: AdminBaby[]; onChanged: () => void }) {
  const [selectedBaby, setSelectedBaby] = useState('')
  const [role, setRole] = useState('CAREGIVER')
  const [working, setWorking] = useState(false)

  const assignedIds = new Set(u.babies.map(b => b.babyId))
  const available = allBabies.filter(b => !assignedIds.has(b.id))

  async function assign() {
    if (!selectedBaby) return
    setWorking(true)
    try {
      await api.admin.assignBaby(u.id, selectedBaby, role)
      setSelectedBaby('')
      onChanged()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to assign')
    } finally { setWorking(false) }
  }

  async function remove(babyId: string, babyName: string) {
    if (!confirm(`Remove ${u.name} from "${babyName}"?`)) return
    setWorking(true)
    try {
      await api.admin.removeBaby(u.id, babyId)
      onChanged()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to remove')
    } finally { setWorking(false) }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Baby access</p>
      {u.babies.length === 0
        ? <p className="text-xs text-stone-400">No babies assigned.</p>
        : u.babies.map(b => (
          <div key={b.babyId} className="flex items-center justify-between py-1">
            <span className="text-sm">{b.babyName} <span className="text-xs text-stone-400">{b.role}</span></span>
            <button onClick={() => remove(b.babyId, b.babyName)} disabled={working}
              className="text-xs text-stone-300 hover:text-red-400 transition-colors">Remove</button>
          </div>
        ))
      }
      {available.length > 0 && (
        <div className="flex gap-2 pt-1">
          <select className="input text-sm flex-1" value={selectedBaby} onChange={e => setSelectedBaby(e.target.value)}>
            <option value="">Add to baby…</option>
            {available.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select className="input text-sm w-32" value={role} onChange={e => setRole(e.target.value)}>
            <option value="CAREGIVER">Caregiver</option>
            <option value="OWNER">Owner</option>
          </select>
          <button onClick={assign} disabled={!selectedBaby || working} className="btn-primary text-sm px-3">Add</button>
        </div>
      )}
    </div>
  )
}

function DevSection() {
  const [seeding, setSeeding] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  async function seed() {
    if (!confirm('Create a "Test Baby" with 3 months of sample data? This cannot be undone.')) return
    setSeeding(true); setResult(null)
    try {
      const r = await api.admin.seedTestData()
      setResult({ ok: true, text: `Created "${r.babyName}" with feedings, diapers, sleep, growth, vaccines, medications, appointments, and milestones. Reload the home page to see it.` })
    } catch (err) {
      setResult({ ok: false, text: err instanceof ApiError ? err.message : 'Seed failed.' })
    } finally { setSeeding(false) }
  }

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="font-semibold text-stone-700">Developer Tools</h2>
        <p className="text-xs text-stone-400 mt-1">These options are intended for testing only and should not be used in production.</p>
      </div>

      {result && (
        <p className={`text-sm px-3 py-2 rounded-xl ${result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {result.text}
        </p>
      )}

      <div className="p-4 border border-dashed border-stone-300 rounded-xl space-y-2">
        <p className="text-sm font-medium text-stone-700">Seed test data</p>
        <p className="text-xs text-stone-400">
          Creates a baby named "Test Baby" (female, ~3 months old) and populates it with realistic sample data:
          3 days of feedings, diapers, and sleep; growth measurements across 3 months; vaccines and appointments;
          medications and milestones.
        </p>
        <button onClick={seed} disabled={seeding} className="btn-primary text-sm mt-1">
          {seeding ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creating…
            </span>
          ) : 'Create test baby'}
        </button>
      </div>
    </div>
  )
}
