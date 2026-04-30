import { useState } from 'react'
import { api } from '../lib/api'

interface Props {
  babyId: string
  onClose: () => void
  onLogged: () => void
}

type DiaperType = 'WET' | 'DIRTY' | 'BOTH' | 'DRY'
type Color = 'yellow' | 'green' | 'brown' | 'black' | 'other'

const typeLabels: Record<DiaperType, string> = { WET: '💧 Wet', DIRTY: '💩 Dirty', BOTH: '💩💧 Both', DRY: '✓ Dry' }
const colorDots: Record<Color, string> = { yellow: 'bg-yellow-300', green: 'bg-green-400', brown: 'bg-amber-700', black: 'bg-stone-800', other: 'bg-stone-300' }

export default function DiaperSheet({ babyId, onClose, onLogged }: Props) {
  const [type, setType] = useState<DiaperType>('WET')
  const [color, setColor] = useState<Color | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await api.diapers.create(babyId, {
        type,
        color: color ?? undefined,
        occurredAt: new Date().toISOString(),
        notes: notes || undefined,
      })
      onLogged()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Log diaper</h2>
        <button onClick={onClose} className="text-stone-400 text-2xl leading-none">&times;</button>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Type</p>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(typeLabels) as DiaperType[]).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`py-3 rounded-2xl text-sm font-semibold border transition-colors ${type === t ? 'bg-brand-500 text-white border-brand-500' : 'border-stone-200 text-stone-600'}`}
            >
              {typeLabels[t]}
            </button>
          ))}
        </div>
      </div>

      {type !== 'DRY' && (
        <div>
          <p className="text-sm font-medium mb-2">Color <span className="text-stone-400 font-normal">(optional)</span></p>
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(colorDots) as Color[]).map(c => (
              <button
                key={c}
                onClick={() => setColor(color === c ? null : c)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${color === c ? 'border-brand-400 bg-brand-50' : 'border-stone-200'}`}
              >
                <span className={`w-3 h-3 rounded-full ${colorDots[c]}`} />
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="text-sm font-medium mb-1 block">Notes <span className="text-stone-400 font-normal">(optional)</span></label>
        <input className="input" type="text" placeholder="Any notes…" value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      <button className="btn-primary w-full" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save diaper'}
      </button>
    </div>
  )
}
