import { useState, useEffect, useRef } from 'react'
import { api, ApiError } from '../lib/api'
import { formatDuration } from '../lib/auth'

interface Props {
  babyId: string
  onClose: () => void
  onLogged: () => void
}

type FeedType = 'BREAST' | 'BOTTLE'
type Side = 'left' | 'right' | 'both'
type MilkType = 'breastmilk' | 'formula' | 'other'

export default function FeedSheet({ babyId, onClose, onLogged }: Props) {
  const [type, setType] = useState<FeedType>('BREAST')
  const [side, setSide] = useState<Side>('left')
  const [milkType, setMilkType] = useState<MilkType>('breastmilk')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [timerRunning, setTimerRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [startedAt] = useState(() => new Date())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1000), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [timerRunning])

  async function save() {
    setSaving(true)
    setError('')
    const endedAt = new Date()
    // Only record durationMin if at least 1 full minute elapsed; avoids sending 0 (invalid)
    const durationMin = elapsed >= 60000 ? Math.round(elapsed / 60000) : undefined
    try {
      await api.feedings.create(babyId, {
        type,
        side: type === 'BREAST' ? side : undefined,
        durationMin,
        amount: type === 'BOTTLE' && amount ? parseFloat(amount) : undefined,
        milkType: type === 'BOTTLE' ? milkType : undefined,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        notes: notes || undefined,
      })
      onLogged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save feeding')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Log feeding</h2>
        <button onClick={onClose} className="text-stone-400 text-2xl leading-none">&times;</button>
      </div>

      {/* Type toggle */}
      <div className="grid grid-cols-2 gap-2 bg-stone-100 p-1 rounded-2xl">
        {(['BREAST', 'BOTTLE'] as FeedType[]).map(t => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`py-2 rounded-xl text-sm font-semibold transition-colors ${type === t ? 'bg-white shadow-sm' : 'text-stone-500'}`}
          >
            {t === 'BREAST' ? '🤱 Breast' : '🍼 Bottle'}
          </button>
        ))}
      </div>

      {type === 'BREAST' ? (
        <>
          <div>
            <p className="text-sm font-medium mb-2">Side</p>
            <div className="flex gap-2">
              {(['left', 'right', 'both'] as Side[]).map(s => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${side === s ? 'bg-brand-500 text-white border-brand-500' : 'border-stone-200 text-stone-600'}`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <p className="text-4xl font-mono font-bold text-brand-500">{formatDuration(elapsed)}</p>
            <button
              onClick={() => setTimerRunning(r => !r)}
              className={`px-8 py-3 rounded-2xl font-semibold text-sm ${timerRunning ? 'bg-stone-200 text-stone-700' : 'bg-brand-500 text-white'}`}
            >
              {elapsed === 0 ? 'Start timer' : timerRunning ? 'Pause' : 'Resume'}
            </button>
          </div>
        </>
      ) : (
        <>
          <div>
            <p className="text-sm font-medium mb-2">Milk type</p>
            <div className="flex gap-2">
              {(['breastmilk', 'formula', 'other'] as MilkType[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMilkType(m)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${milkType === m ? 'bg-brand-500 text-white border-brand-500' : 'border-stone-200 text-stone-600'}`}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Amount (ml)</label>
            <input
              className="input"
              type="number"
              inputMode="decimal"
              placeholder="e.g. 90"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
        </>
      )}

      <div>
        <label className="text-sm font-medium mb-1 block">Notes <span className="text-stone-400 font-normal">(optional)</span></label>
        <input className="input" type="text" placeholder="Any notes…" value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button className="btn-primary w-full" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save feeding'}
      </button>
    </div>
  )
}
