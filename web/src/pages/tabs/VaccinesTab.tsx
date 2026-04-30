import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import type { VaccineRecord, AppointmentRecord } from '../../lib/api'
import { computeSchedule } from '../../lib/vaccineSchedule'
import type { VaccineStatus } from '../../lib/vaccineSchedule'

interface Props { babyId: string; babyDob: string }

const statusColor: Record<VaccineStatus, string> = {
  complete: 'bg-green-100 text-green-700 border-green-200',
  due:      'bg-amber-100 text-amber-700 border-amber-200',
  overdue:  'bg-red-100   text-red-700   border-red-200',
  upcoming: 'bg-stone-100 text-stone-500 border-stone-200',
}
const statusLabel: Record<VaccineStatus, string> = {
  complete: '✓ Done',
  due:      '! Due now',
  overdue:  '!! Overdue',
  upcoming: 'Upcoming',
}

const APPOINTMENT_TYPES = ['WELL_VISIT', 'SICK_VISIT', 'SPECIALIST', 'OTHER']
const APPT_LABELS: Record<string, string> = { WELL_VISIT: 'Well visit', SICK_VISIT: 'Sick visit', SPECIALIST: 'Specialist', OTHER: 'Other' }

export default function VaccinesTab({ babyId, babyDob }: Props) {
  const [vaccines, setVaccines] = useState<VaccineRecord[]>([])
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([])
  const [tab, setTab] = useState<'schedule' | 'appointments'>('schedule')
  const [showLogVaccine, setShowLogVaccine] = useState(false)
  const [showAddAppt, setShowAddAppt] = useState(false)
  const [loading, setLoading] = useState(true)

  const reload = async () => {
    const [v, a] = await Promise.all([api.vaccines.list(babyId), api.appointments.list(babyId)])
    setVaccines(v); setAppointments(a); setLoading(false)
  }
  useEffect(() => { reload() }, [babyId])

  const schedule = computeSchedule(babyDob, vaccines.map(v => ({ vaccineName: v.vaccineName, doseNumber: v.doseNumber ?? null })))
  const due = schedule.filter(s => s.status === 'due' || s.status === 'overdue')

  return (
    <div className="space-y-4">
      {/* Due alert */}
      {due.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
          <p className="text-sm font-semibold text-amber-700 mb-1">Vaccines due</p>
          {due.map(d => (
            <p key={`${d.vaccine}-${d.dose}`} className="text-xs text-amber-600">
              {d.status === 'overdue' ? '!!' : '!'} {d.vaccine} dose {d.dose} — {d.ageLabel}
            </p>
          ))}
        </div>
      )}

      {/* Tab switcher */}
      <div className="grid grid-cols-2 gap-1 bg-stone-100 p-1 rounded-2xl">
        {(['schedule', 'appointments'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`py-2 rounded-xl text-sm font-semibold capitalize transition-colors ${tab === t ? 'bg-white shadow-sm' : 'text-stone-500'}`}>
            {t === 'schedule' ? '💉 Schedule' : '📅 Appointments'}
          </button>
        ))}
      </div>

      {loading ? <p className="text-center text-stone-400 text-sm py-4">Loading…</p> : tab === 'schedule' ? (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-xs text-stone-400">CDC recommended schedule</p>
            <button onClick={() => setShowLogVaccine(true)} className="btn-primary px-3 py-1.5 text-xs">+ Log vaccine</button>
          </div>
          {schedule.map(entry => (
            <div key={`${entry.vaccine}-${entry.dose}`}
              className={`flex items-center justify-between px-3 py-2.5 rounded-2xl border ${statusColor[entry.status]}`}>
              <div>
                <p className="text-sm font-semibold">{entry.vaccine} <span className="font-normal opacity-70">dose {entry.dose}</span></p>
                <p className="text-xs opacity-70">{entry.ageLabel}</p>
              </div>
              <span className="text-xs font-semibold">{statusLabel[entry.status]}</span>
            </div>
          ))}
          {vaccines.filter(v => !schedule.some(s => s.vaccine.toLowerCase() === v.vaccineName.toLowerCase() && s.dose === v.doseNumber)).map(v => (
            <div key={v.id} className={`flex items-center justify-between px-3 py-2.5 rounded-2xl border ${statusColor.complete}`}>
              <div>
                <p className="text-sm font-semibold">{v.vaccineName} {v.doseNumber ? `dose ${v.doseNumber}` : ''}</p>
                <p className="text-xs opacity-70">Custom · {new Date(v.administeredAt).toLocaleDateString()}</p>
              </div>
              <span className="text-xs font-semibold">✓ Done</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-xs text-stone-400">{appointments.length} appointment{appointments.length !== 1 ? 's' : ''}</p>
            <button onClick={() => setShowAddAppt(true)} className="btn-primary px-3 py-1.5 text-xs">+ Add appointment</button>
          </div>
          {appointments.length === 0 && <p className="text-center text-stone-400 text-sm py-6">No appointments logged yet.</p>}
          {appointments.map(a => (
            <div key={a.id} className="card">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-sm">{APPT_LABELS[a.type]}</p>
                  <p className="text-xs text-stone-500">{new Date(a.date).toLocaleDateString([], { dateStyle: 'medium' })} {a.doctor ? `· ${a.doctor}` : ''}</p>
                </div>
                <button onClick={async () => { await api.appointments.delete(babyId, a.id); reload() }}
                  className="text-xs text-stone-300 hover:text-red-400">✕</button>
              </div>
              {a.vaccines.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {a.vaccines.map(v => (
                    <span key={v.id} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                      {v.vaccineName} #{v.doseNumber}
                    </span>
                  ))}
                </div>
              )}
              {a.notes && <p className="text-xs text-stone-400 mt-1">{a.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {showLogVaccine && <LogVaccineSheet babyId={babyId} appointments={appointments} onClose={() => setShowLogVaccine(false)} onSaved={() => { setShowLogVaccine(false); reload() }} />}
      {showAddAppt && <AddAppointmentSheet babyId={babyId} onClose={() => setShowAddAppt(false)} onSaved={() => { setShowAddAppt(false); reload() }} />}
    </div>
  )
}

function LogVaccineSheet({ babyId, appointments, onClose, onSaved }: { babyId: string; appointments: AppointmentRecord[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [dose, setDose] = useState('')
  const [lot, setLot] = useState('')
  const [apptId, setApptId] = useState('')
  const [saving, setSaving] = useState(false)

  const COMMON = ['HepB', 'DTaP', 'Hib', 'IPV', 'PCV', 'RV', 'Flu', 'MMR', 'Varicella', 'HepA']

  async function save() {
    if (!name) return
    setSaving(true)
    await api.vaccines.create(babyId, {
      vaccineName: name,
      doseNumber: dose ? parseInt(dose) : undefined,
      lotNumber: lot || undefined,
      administeredAt: new Date().toISOString(),
      appointmentId: apptId || undefined,
    })
    onSaved()
  }

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="sheet space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">Log vaccine</h2>
          <button onClick={onClose} className="text-stone-400 text-2xl leading-none">&times;</button>
        </div>
        <div>
          <p className="text-sm font-medium mb-2">Vaccine</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {COMMON.map(v => (
              <button key={v} onClick={() => setName(v)}
                className={`px-3 py-1 rounded-xl text-xs font-medium border transition-colors ${name === v ? 'bg-brand-500 text-white border-brand-500' : 'border-stone-200 text-stone-600'}`}>
                {v}
              </button>
            ))}
          </div>
          <input className="input" placeholder="Or type custom vaccine name" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Dose #</label>
            <input className="input" type="number" min="1" placeholder="e.g. 1" value={dose} onChange={e => setDose(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Lot # <span className="text-stone-400 font-normal">(opt)</span></label>
            <input className="input" placeholder="optional" value={lot} onChange={e => setLot(e.target.value)} />
          </div>
        </div>
        {appointments.length > 0 && (
          <div>
            <label className="text-sm font-medium mb-1 block">Link to appointment <span className="text-stone-400 font-normal">(opt)</span></label>
            <select className="input" value={apptId} onChange={e => setApptId(e.target.value)}>
              <option value="">None</option>
              {appointments.map(a => (
                <option key={a.id} value={a.id}>{new Date(a.date).toLocaleDateString([], { dateStyle: 'medium' })} {a.doctor ? `· ${a.doctor}` : ''}</option>
              ))}
            </select>
          </div>
        )}
        <button className="btn-primary w-full" onClick={save} disabled={saving || !name}>
          {saving ? 'Saving…' : 'Save vaccine'}
        </button>
      </div>
    </>
  )
}

function AddAppointmentSheet({ babyId, onClose, onSaved }: { babyId: string; onClose: () => void; onSaved: () => void }) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [doctor, setDoctor] = useState('')
  const [type, setType] = useState('WELL_VISIT')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!date) return
    setSaving(true)
    const dt = time ? new Date(`${date}T${time}`) : new Date(date)
    await api.appointments.create(babyId, { date: dt.toISOString(), doctor: doctor || undefined, type, notes: notes || undefined })
    onSaved()
  }

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="sheet space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">Add appointment</h2>
          <button onClick={onClose} className="text-stone-400 text-2xl leading-none">&times;</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Date</label>
            <input className="input" type="date" required value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Time <span className="text-stone-400 font-normal">(opt)</span></label>
            <input className="input" type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Type</label>
          <select className="input" value={type} onChange={e => setType(e.target.value)}>
            {APPOINTMENT_TYPES.map(t => <option key={t} value={t}>{APPT_LABELS[t]}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Doctor / clinic <span className="text-stone-400 font-normal">(opt)</span></label>
          <input className="input" placeholder="e.g. Dr. Smith" value={doctor} onChange={e => setDoctor(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Notes <span className="text-stone-400 font-normal">(opt)</span></label>
          <input className="input" placeholder="Any notes…" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <button className="btn-primary w-full" onClick={save} disabled={saving || !date}>
          {saving ? 'Saving…' : 'Save appointment'}
        </button>
      </div>
    </>
  )
}
