import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import type { AdminUser, AdminBaby } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useUnits } from '../contexts/UnitsContext'
import type { UnitSystem } from '../lib/units'

type Section = 'general' | 'users' | 'dev'

const isDev = import.meta.env.DEV

export default function AdminSettings() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [section, setSection] = useState<Section>('general')

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
        <h1 className="text-xl font-serif text-brand-600">Admin Settings</h1>
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <div className="flex gap-2 border-b border-stone-200 pb-2 flex-wrap">
          {([
            'general',
            'users',
            ...(isDev ? ['dev'] : []),
          ] as Section[]).map(s => (
            <button key={s} onClick={() => setSection(s)}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium capitalize transition-colors ${section === s ? 'bg-white border border-b-white border-stone-200 -mb-px text-brand-600' : 'text-stone-500 hover:text-stone-700'}`}>
              {s === 'general' ? 'General' : s === 'users' ? 'Users' : 'Developer'}
            </button>
          ))}
        </div>

        {section === 'general' && <GeneralSection />}
        {section === 'users' && <UsersSection />}
        {section === 'dev' && <DevSection />}
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
