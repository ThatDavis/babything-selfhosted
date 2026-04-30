import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { Baby, BabyCaregiver, Dashboard } from '../lib/api'
import { useAuth, timeSince } from '../lib/auth'
import { getSocket, joinBaby, leaveBaby } from '../lib/socket'
import AtAGlanceCard from '../components/AtAGlanceCard'
import QuickLogSheet from '../components/QuickLogSheet'
import ActivityFeed from '../components/ActivityFeed'
import AddBabyModal from '../components/AddBabyModal'
import BabySettings from '../components/BabySettings'
import DashboardCharts from '../components/DashboardCharts'
import VaccinesTab from './tabs/VaccinesTab'
import HealthTab from './tabs/HealthTab'
import MilestonesTab from './tabs/MilestonesTab'
import MonitorTab from './tabs/MonitorTab'
import { useUnits } from '../contexts/UnitsContext'

type Sheet = 'feed' | 'diaper' | 'sleep' | null
type Tab = 'home' | 'health' | 'vaccines' | 'milestones' | 'monitor'

export default function Home() {
  const { user, logout } = useAuth()
  const { streamEnabled } = useUnits()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [babies, setBabies] = useState<(Baby & { role: string })[]>([])
  const [activeBabyId, setActiveBabyId] = useState<string | null>(searchParams.get('baby'))
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [caregivers, setCaregivers] = useState<BabyCaregiver[]>([])
  const [sheet, setSheet] = useState<Sheet>(null)
  const [tab, setTab] = useState<Tab>('home')
  const [showAddBaby, setShowAddBaby] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [feedRefresh, setFeedRefresh] = useState(0)
  const prevBabyId = useRef<string | null>(null)

  const activeBaby = babies.find(b => b.id === activeBabyId) ?? null

  const NAV: { id: Tab; icon: string; label: string }[] = [
    { id: 'home',       icon: '🏠', label: 'Home' },
    { id: 'health',     icon: '📏', label: 'Health' },
    { id: 'vaccines',   icon: '💉', label: 'Vaccines' },
    { id: 'milestones', icon: '⭐', label: 'Milestones' },
    ...(streamEnabled ? [{ id: 'monitor' as Tab, icon: '📷', label: 'Monitor' }] : []),
  ]

  const loadBabies = useCallback(async () => {
    const list = await api.babies.list()
    setBabies(list)
    if (!activeBabyId && list.length > 0) setActiveBabyId(list[0].id)
  }, [activeBabyId])

  const loadDashboard = useCallback(async () => {
    if (!activeBabyId) return
    const [d, detail] = await Promise.all([
      api.babies.dashboard(activeBabyId),
      api.babies.get(activeBabyId),
    ])
    setDashboard(d)
    setCaregivers(detail.caregivers)
  }, [activeBabyId])

  useEffect(() => { loadBabies() }, [loadBabies])
  useEffect(() => { loadDashboard() }, [loadDashboard])
  useEffect(() => {
    if (activeBabyId) setSearchParams({ baby: activeBabyId }, { replace: true })
  }, [activeBabyId, setSearchParams])

  // Socket.io: join/leave baby room and listen for real-time updates
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !activeBabyId) return

    if (prevBabyId.current && prevBabyId.current !== activeBabyId) {
      leaveBaby(prevBabyId.current)
    }
    prevBabyId.current = activeBabyId
    joinBaby(activeBabyId)

    const refresh = () => {
      loadDashboard()
      setFeedRefresh(r => r + 1)
    }

    socket.on('feeding:created', refresh)
    socket.on('feeding:updated', refresh)
    socket.on('feeding:deleted', refresh)
    socket.on('diaper:created', refresh)
    socket.on('diaper:updated', refresh)
    socket.on('diaper:deleted', refresh)
    socket.on('sleep:created', refresh)
    socket.on('sleep:updated', refresh)
    socket.on('sleep:deleted', refresh)

    return () => {
      socket.off('feeding:created', refresh)
      socket.off('feeding:updated', refresh)
      socket.off('feeding:deleted', refresh)
      socket.off('diaper:created', refresh)
      socket.off('diaper:updated', refresh)
      socket.off('diaper:deleted', refresh)
      socket.off('sleep:created', refresh)
      socket.off('sleep:updated', refresh)
      socket.off('sleep:deleted', refresh)
    }
  }, [activeBabyId, loadDashboard])

  function onLogged() {
    setSheet(null)
    setFeedRefresh(r => r + 1)
    loadDashboard()
  }

  function onBabyDeleted() {
    setShowSettings(false)
    const remaining = babies.filter(b => b.id !== activeBabyId)
    setBabies(remaining)
    setActiveBabyId(remaining[0]?.id ?? null)
    setDashboard(null)
  }

  const sleepLabel = dashboard?.activeSleep
    ? `Sleeping · ${timeSince(dashboard.activeSleep.startedAt)}`
    : dashboard?.lastSleep
      ? `Woke up · ${timeSince(dashboard.lastSleep.endedAt ?? undefined)}`
      : null

  if (babies.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-6">
        <div className="text-center">
          <p className="text-2xl font-bold mb-2">Welcome, {user?.name}!</p>
          <p className="text-stone-500">Add your first baby to get started.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddBaby(true)}>Add baby</button>
        <button className="btn-ghost text-stone-400 text-sm" onClick={logout}>Sign out</button>
        {showAddBaby && (
          <AddBabyModal
            onClose={() => setShowAddBaby(false)}
            onCreated={b => { setBabies([{ ...b, role: 'OWNER' }]); setActiveBabyId(b.id); setShowAddBaby(false) }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-stone-100 p-4 shrink-0">
        <h1 className="text-xl font-bold text-brand-600 mb-6">babything</h1>

        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Babies</p>
        <div className="space-y-1 mb-6">
          {babies.map(b => (
            <button key={b.id} onClick={() => { setActiveBabyId(b.id); setTab('home') }}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${b.id === activeBabyId ? 'bg-brand-50 text-brand-700' : 'text-stone-600 hover:bg-stone-50'}`}>
              {b.name}
            </button>
          ))}
          <button onClick={() => setShowAddBaby(true)}
            className="w-full text-left px-3 py-2 rounded-xl text-sm text-stone-400 hover:bg-stone-50 transition-colors">
            + Add baby
          </button>
        </div>

        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Sections</p>
        <div className="space-y-1 mb-6">
          {NAV.map(n => (
            <button key={n.id} onClick={() => setTab(n.id)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${tab === n.id ? 'bg-brand-50 text-brand-700' : 'text-stone-600 hover:bg-stone-50'}`}>
              {n.icon} {n.label}
            </button>
          ))}
        </div>

        <div className="mt-auto space-y-1">
          {activeBaby && (
            <button onClick={() => setShowSettings(true)}
              className="w-full text-left px-3 py-2 rounded-xl text-sm text-stone-500 hover:bg-stone-50 transition-colors">
              ⚙ Settings
            </button>
          )}
          {user?.isAdmin && (
            <button onClick={() => navigate('/admin')}
              className="w-full text-left px-3 py-2 rounded-xl text-sm text-stone-500 hover:bg-stone-50 transition-colors">
              🛡 Admin
            </button>
          )}
          <button onClick={logout}
            className="w-full text-left px-3 py-2 rounded-xl text-sm text-stone-400 hover:bg-stone-50 transition-colors">
            Sign out
          </button>
          <p className="px-3 pt-2 text-xs text-stone-300">{user?.name}</p>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 pt-4 pb-2 bg-white border-b border-stone-100">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {babies.map(b => (
              <button key={b.id} onClick={() => { setActiveBabyId(b.id); setTab('home') }}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${b.id === activeBabyId ? 'bg-brand-500 text-white' : 'bg-stone-100 text-stone-600'}`}>
                {b.name}
              </button>
            ))}
            <button onClick={() => setShowAddBaby(true)} className="p-1.5 rounded-full bg-stone-100 text-stone-400 text-lg leading-none">+</button>
          </div>
          <div className="flex items-center gap-2 ml-2 shrink-0">
            {activeBaby && <button onClick={() => setShowSettings(true)} className="text-stone-400">⚙</button>}
          </div>
        </header>

        {/* Desktop header */}
        {activeBaby && (
          <div className="hidden md:flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-white">
            <h2 className="text-xl font-bold">{activeBaby.name} <span className="text-stone-400 font-normal text-base">— {NAV.find(n => n.id === tab)?.label}</span></h2>
            <button onClick={() => setShowSettings(true)} className="btn-ghost text-sm text-stone-500">⚙ Settings</button>
          </div>
        )}

        {/* Tab content */}
        {activeBaby && (
          <main className="flex-1 px-4 md:px-6 py-4 pb-24 md:pb-6 overflow-y-auto">
            {tab === 'home' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <AtAGlanceCard label="Last feed" value={timeSince(dashboard?.lastFeeding?.startedAt)}
                    sub={dashboard?.lastFeeding ? `${dashboard.lastFeeding.type === 'BREAST' ? '🤱' : '🍼'} ${dashboard.lastFeeding.side ?? dashboard.lastFeeding.amount ?? ''}` : undefined}
                    color="amber" />
                  <AtAGlanceCard label="Last diaper" value={timeSince(dashboard?.lastDiaper?.occurredAt)}
                    sub={dashboard?.lastDiaper?.type} color="teal" />
                  <AtAGlanceCard label="Sleep" value={dashboard?.activeSleep ? 'Asleep' : 'Awake'}
                    sub={sleepLabel ?? undefined} color={dashboard?.activeSleep ? 'indigo' : 'stone'} />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(['feed', 'diaper', 'sleep'] as const).map(type => (
                    <button key={type} onClick={() => setSheet(type)}
                      className="card flex flex-col items-center py-4 gap-1 active:scale-95 transition-transform">
                      <span className="text-2xl">{type === 'feed' ? '🤱' : type === 'diaper' ? '👶' : '😴'}</span>
                      <span className="text-xs font-semibold text-stone-500 capitalize">Log {type}</span>
                    </button>
                  ))}
                </div>

                <ActivityFeed babyId={activeBaby.id} refresh={feedRefresh} />

                <div className="pt-2">
                  <p className="text-sm font-semibold text-stone-500 mb-3">Charts</p>
                  <DashboardCharts babyId={activeBaby.id} />
                </div>
              </div>
            )}

            {tab === 'health' && <HealthTab babyId={activeBaby.id} />}
            {tab === 'vaccines' && <VaccinesTab babyId={activeBaby.id} babyDob={activeBaby.dob} />}
            {tab === 'milestones' && <MilestonesTab babyId={activeBaby.id} />}
            {tab === 'monitor' && <MonitorTab />}
          </main>
        )}

        {/* Mobile bottom tab bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 flex">
          {NAV.map(n => (
            <button key={n.id} onClick={() => setTab(n.id)}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors ${tab === n.id ? 'text-brand-600' : 'text-stone-400'}`}>
              <span className="text-lg">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Sheets / modals */}
      {sheet && activeBaby && (
        <QuickLogSheet type={sheet} babyId={activeBaby.id} activeSleep={dashboard?.activeSleep ?? null}
          onClose={() => setSheet(null)} onLogged={onLogged} />
      )}
      {showAddBaby && (
        <AddBabyModal onClose={() => setShowAddBaby(false)}
          onCreated={b => { setBabies(prev => [...prev, { ...b, role: 'OWNER' }]); setActiveBabyId(b.id); setShowAddBaby(false) }} />
      )}
      {showSettings && activeBaby && (
        <BabySettings baby={activeBaby} caregivers={caregivers} onClose={() => setShowSettings(false)}
          onDeleted={onBabyDeleted} onCaregiversChanged={() => { setShowSettings(false); loadDashboard() }} />
      )}
    </div>
  )
}
