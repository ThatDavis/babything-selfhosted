import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import type { GrowthRecord, MedicationRecord } from '../../lib/api'
import { useUnits } from '../../contexts/UnitsContext'
import {
  displayWeight, displayLength,
  weightToGrams, lengthToCm,
  weightLabel, lengthLabel, headCircLabel,
  weightStep, lengthStep,
  weightPlaceholder, lengthPlaceholder, headCircPlaceholder,
} from '../../lib/units'

interface Props { babyId: string }

export default function HealthTab({ babyId }: Props) {
  const { unitSystem } = useUnits()
  const [growth, setGrowth] = useState<GrowthRecord[]>([])
  const [meds, setMeds] = useState<MedicationRecord[]>([])
  const [tab, setTab] = useState<'growth' | 'medications'>('growth')
  const [showGrowthForm, setShowGrowthForm] = useState(false)
  const [showMedForm, setShowMedForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const reload = async () => {
    const [g, m] = await Promise.all([api.growth.list(babyId), api.medications.list(babyId)])
    setGrowth(g); setMeds(m); setLoading(false)
  }
  useEffect(() => { reload() }, [babyId])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 bg-stone-100 p-1 rounded-2xl">
        {(['growth', 'medications'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`py-2 rounded-xl text-sm font-semibold capitalize transition-colors ${tab === t ? 'bg-white shadow-sm' : 'text-stone-500'}`}>
            {t === 'growth' ? '📏 Growth' : '💊 Medications'}
          </button>
        ))}
      </div>

      {loading ? <p className="text-center text-stone-400 text-sm py-4">Loading…</p> : tab === 'growth' ? (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-xs text-stone-400">{growth.length} record{growth.length !== 1 ? 's' : ''}</p>
            <button onClick={() => setShowGrowthForm(true)} className="btn-primary px-3 py-1.5 text-xs">+ Add measurement</button>
          </div>
          {growth.length === 0 && <p className="text-center text-stone-400 text-sm py-6">No measurements yet.</p>}
          {growth.map(g => (
            <div key={g.id} className="card flex justify-between items-center">
              <div>
                <p className="text-sm font-semibold">
                  {g.weight != null && <span>{displayWeight(g.weight, unitSystem)} </span>}
                  {g.length != null && <span>{displayLength(g.length, unitSystem)} </span>}
                  {g.headCirc != null && <span>HC {displayLength(g.headCirc, unitSystem)}</span>}
                </p>
                <p className="text-xs text-stone-400">{new Date(g.measuredAt).toLocaleDateString([], { dateStyle: 'medium' })} · {g.user.name}</p>
                {g.notes && <p className="text-xs text-stone-400">{g.notes}</p>}
              </div>
              <button onClick={async () => { await api.growth.delete(babyId, g.id); reload() }}
                className="text-xs text-stone-300 hover:text-red-400 ml-2">✕</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-xs text-stone-400">{meds.length} record{meds.length !== 1 ? 's' : ''}</p>
            <button onClick={() => setShowMedForm(true)} className="btn-primary px-3 py-1.5 text-xs">+ Log medication</button>
          </div>
          {meds.length === 0 && <p className="text-center text-stone-400 text-sm py-6">No medications logged yet.</p>}
          {meds.map(m => (
            <div key={m.id} className="card flex justify-between items-center">
              <div>
                <p className="text-sm font-semibold">{m.name} <span className="font-normal text-stone-500">{m.dose} {m.unit}</span></p>
                <p className="text-xs text-stone-400">{new Date(m.occurredAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} · {m.user.name}</p>
                {m.notes && <p className="text-xs text-stone-400">{m.notes}</p>}
              </div>
              <button onClick={async () => { await api.medications.delete(babyId, m.id); reload() }}
                className="text-xs text-stone-300 hover:text-red-400 ml-2">✕</button>
            </div>
          ))}
        </div>
      )}

      {showGrowthForm && <GrowthSheet babyId={babyId} onClose={() => setShowGrowthForm(false)} onSaved={() => { setShowGrowthForm(false); reload() }} />}
      {showMedForm && <MedSheet babyId={babyId} onClose={() => setShowMedForm(false)} onSaved={() => { setShowMedForm(false); reload() }} />}
    </div>
  )
}

function GrowthSheet({ babyId, onClose, onSaved }: { babyId: string; onClose: () => void; onSaved: () => void }) {
  const { unitSystem } = useUnits()
  const [weight, setWeight] = useState('')
  const [length, setLength] = useState('')
  const [headCirc, setHeadCirc] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await api.growth.create(babyId, {
      weight:   weight   ? weightToGrams(parseFloat(weight), unitSystem)   : undefined,
      length:   length   ? lengthToCm(parseFloat(length), unitSystem)      : undefined,
      headCirc: headCirc ? lengthToCm(parseFloat(headCirc), unitSystem)    : undefined,
      measuredAt: new Date().toISOString(),
      notes: notes || undefined,
    })
    onSaved()
  }

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="sheet space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">Add measurement</h2>
          <button onClick={onClose} className="text-stone-400 text-2xl leading-none">&times;</button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs font-medium mb-1 block">{weightLabel(unitSystem)}</label>
            <input className="input" type="number" step={weightStep(unitSystem)} placeholder={weightPlaceholder(unitSystem)} value={weight} onChange={e => setWeight(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">{lengthLabel(unitSystem)}</label>
            <input className="input" type="number" step={lengthStep(unitSystem)} placeholder={lengthPlaceholder(unitSystem)} value={length} onChange={e => setLength(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">{headCircLabel(unitSystem)}</label>
            <input className="input" type="number" step={lengthStep(unitSystem)} placeholder={headCircPlaceholder(unitSystem)} value={headCirc} onChange={e => setHeadCirc(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Notes <span className="text-stone-400 font-normal">(opt)</span></label>
          <input className="input" placeholder="Any notes…" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <button className="btn-primary w-full" onClick={save} disabled={saving || (!weight && !length && !headCirc)}>
          {saving ? 'Saving…' : 'Save measurement'}
        </button>
      </div>
    </>
  )
}

function MedSheet({ babyId, onClose, onSaved }: { babyId: string; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [dose, setDose] = useState('')
  const [unit, setUnit] = useState('ml')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const COMMON_MEDS = ['Vitamin D', 'Tylenol', 'Ibuprofen', 'Gripe water', 'Iron']

  async function save() {
    if (!name || !dose) return
    setSaving(true)
    await api.medications.create(babyId, { name, dose: parseFloat(dose), unit, occurredAt: new Date().toISOString(), notes: notes || undefined })
    onSaved()
  }

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="sheet space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">Log medication</h2>
          <button onClick={onClose} className="text-stone-400 text-2xl leading-none">&times;</button>
        </div>
        <div>
          <p className="text-sm font-medium mb-2">Common</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {COMMON_MEDS.map(m => (
              <button key={m} onClick={() => setName(m)}
                className={`px-3 py-1 rounded-xl text-xs font-medium border transition-colors ${name === m ? 'bg-brand-500 text-white border-brand-500' : 'border-stone-200 text-stone-600'}`}>
                {m}
              </button>
            ))}
          </div>
          <input className="input" placeholder="Or type medication name" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Dose</label>
            <input className="input" type="number" step="0.1" placeholder="amount" value={dose} onChange={e => setDose(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Unit</label>
            <select className="input" value={unit} onChange={e => setUnit(e.target.value)}>
              {['ml', 'mg', 'drops', 'other'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Notes <span className="text-stone-400 font-normal">(opt)</span></label>
          <input className="input" placeholder="Any notes…" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <button className="btn-primary w-full" onClick={save} disabled={saving || !name || !dose}>
          {saving ? 'Saving…' : 'Save medication'}
        </button>
      </div>
    </>
  )
}
