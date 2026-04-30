import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'
import type { SleepEvent } from '../lib/api'
import { formatDuration } from '../lib/auth'

interface Props {
  babyId: string
  activeSleep: SleepEvent | null
  onClose: () => void
  onLogged: () => void
}

type SleepType = 'NAP' | 'NIGHT'
type Location = 'crib' | 'bassinet' | 'arms' | 'stroller' | 'other'

export default function SleepSheet({ babyId, activeSleep, onClose, onLogged }: Props) {
  const [type, setType] = useState<SleepType>('NAP')
  const [location, setLocation] = useState<Location | null>(null)
  const [notes, setNotes] = useState('')
  const [elapsed, setElapsed] = useState(activeSleep ? Date.now() - new Date(activeSleep.startedAt).getTime() : 0)
  const [saving, setSaving] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (activeSleep) {
      intervalRef.current = setInterval(() => {
        setElapsed(Date.now() - new Date(activeSleep.startedAt).getTime())
      }, 1000)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [activeSleep])

  async function startSleep() {
    setSaving(true)
    try {
      await api.sleep.create(babyId, {
        type,
        location: location ?? undefined,
        startedAt: new Date().toISOString(),
        notes: notes || undefined,
      })
      onLogged()
    } finally {
      setSaving(false)
    }
  }

  async function endSleep() {
    if (!activeSleep) return
    setSaving(true)
    try {
      await api.sleep.update(babyId, activeSleep.id, { endedAt: new Date().toISOString() })
      onLogged()
    } finally {
      setSaving(false)
    }
  }

  if (activeSleep) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Sleep in progress</h2>
          <button onClick={onClose} className="text-stone-400 text-2xl leading-none">&times;</button>
        </div>
        <div className="flex flex-col items-center gap-3 py-4">
          <span className="text-5xl">😴</span>
          <p className="text-4xl font-mono font-bold text-indigo-500">{formatDuration(elapsed)}</p>
          <p className="text-sm text-stone-500">Started {new Date(activeSleep.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <button className="btn-primary w-full bg-indigo-500 hover:bg-indigo-600" onClick={endSleep} disabled={saving}>
          {saving ? 'Saving…' : 'Wake up — end sleep'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Log sleep</h2>
        <button onClick={onClose} className="text-stone-400 text-2xl leading-none">&times;</button>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Type</p>
        <div className="grid grid-cols-2 gap-2 bg-stone-100 p-1 rounded-2xl">
          {(['NAP', 'NIGHT'] as SleepType[]).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`py-2 rounded-xl text-sm font-semibold transition-colors ${type === t ? 'bg-white shadow-sm' : 'text-stone-500'}`}
            >
              {t === 'NAP' ? '☀️ Nap' : '🌙 Night'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Location <span className="text-stone-400 font-normal">(optional)</span></p>
        <div className="flex gap-2 flex-wrap">
          {(['crib', 'bassinet', 'arms', 'stroller', 'other'] as Location[]).map(l => (
            <button
              key={l}
              onClick={() => setLocation(location === l ? null : l)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${location === l ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-stone-200 text-stone-600'}`}
            >
              {l.charAt(0).toUpperCase() + l.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Notes <span className="text-stone-400 font-normal">(optional)</span></label>
        <input className="input" type="text" placeholder="Any notes…" value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      <button className="btn-primary w-full" onClick={startSleep} disabled={saving}>
        {saving ? 'Saving…' : '😴 Start sleep timer'}
      </button>
    </div>
  )
}
