import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import type { MilestoneRecord } from '../../lib/api'

interface Props { babyId: string }

const COMMON = ['First smile', 'First laugh', 'Holds head up', 'Rolls over', 'Sits unassisted', 'First tooth', 'First word', 'First steps', 'Sleeps through the night']

export default function MilestonesTab({ babyId }: Props) {
  const [milestones, setMilestones] = useState<MilestoneRecord[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const reload = async () => {
    const m = await api.milestones.list(babyId)
    setMilestones(m); setLoading(false)
  }
  useEffect(() => { reload() }, [babyId])

  if (loading) return <p className="text-center text-stone-400 text-sm py-4">Loading…</p>

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-stone-400">{milestones.length} milestone{milestones.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setShowForm(true)} className="btn-primary px-3 py-1.5 text-xs">+ Add milestone</button>
      </div>

      {milestones.length === 0 && (
        <div className="text-center py-10">
          <p className="text-3xl mb-2">⭐</p>
          <p className="text-stone-400 text-sm">No milestones logged yet.</p>
        </div>
      )}

      {milestones.map(m => (
        <div key={m.id} className="card flex justify-between items-start">
          <div>
            <p className="font-semibold text-sm">⭐ {m.title}</p>
            {m.description && <p className="text-xs text-stone-500 mt-0.5">{m.description}</p>}
            <p className="text-xs text-stone-400 mt-1">
              {new Date(m.occurredAt).toLocaleDateString([], { dateStyle: 'long' })} · {m.user.name}
            </p>
          </div>
          <button onClick={async () => { await api.milestones.delete(babyId, m.id); reload() }}
            className="text-xs text-stone-300 hover:text-red-400 ml-2 shrink-0">✕</button>
        </div>
      ))}

      {showForm && <MilestoneSheet babyId={babyId} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); reload() }} />}
    </div>
  )
}

function MilestoneSheet({ babyId, onClose, onSaved }: { babyId: string; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!title) return
    setSaving(true)
    await api.milestones.create(babyId, { title, description: description || undefined, occurredAt: new Date(date).toISOString() })
    onSaved()
  }

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="sheet space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">Add milestone</h2>
          <button onClick={onClose} className="text-stone-400 text-2xl leading-none">&times;</button>
        </div>
        <div>
          <p className="text-sm font-medium mb-2">Common milestones</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {COMMON.map(c => (
              <button key={c} onClick={() => setTitle(c)}
                className={`px-3 py-1 rounded-xl text-xs font-medium border transition-colors ${title === c ? 'bg-brand-500 text-white border-brand-500' : 'border-stone-200 text-stone-600'}`}>
                {c}
              </button>
            ))}
          </div>
          <input className="input" placeholder="Or type a custom milestone" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Description <span className="text-stone-400 font-normal">(opt)</span></label>
          <input className="input" placeholder="Any details…" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Date</label>
          <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <button className="btn-primary w-full" onClick={save} disabled={saving || !title}>
          {saving ? 'Saving…' : 'Save milestone'}
        </button>
      </div>
    </>
  )
}
