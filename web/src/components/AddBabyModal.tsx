import { useState, FormEvent } from 'react'
import { api, ApiError } from '../lib/api'
import type { Baby } from '../lib/api'

interface Props {
  onClose: () => void
  onCreated: (baby: Baby) => void
}

export default function AddBabyModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [sex, setSex] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (new Date(dob) > new Date()) { setError("Date of birth can't be in the future"); return }
    setSaving(true)
    try {
      const baby = await api.babies.create({
        name,
        dob: new Date(dob).toISOString(),
        sex: sex || undefined,
      })
      onCreated(baby)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="sheet">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Add baby</h2>
          <button onClick={onClose} className="text-stone-400 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input className="input" type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Baby's name" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date of birth</label>
            <input className="input" type="date" required value={dob} onChange={e => setDob(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Sex <span className="text-stone-400 font-normal">(optional)</span></label>
            <select className="input" value={sex} onChange={e => setSex(e.target.value)}>
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <button className="btn-primary w-full" type="submit" disabled={saving}>
            {saving ? 'Adding…' : 'Add baby'}
          </button>
        </form>
      </div>
    </>
  )
}
