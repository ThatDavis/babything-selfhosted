import { useState, FormEvent } from 'react'
import { api, ApiError } from '../lib/api'

const ALL_SECTIONS = [
  { id: 'growth',       label: 'Growth measurements' },
  { id: 'vaccines',     label: 'Vaccine history' },
  { id: 'medications',  label: 'Medications' },
  { id: 'appointments', label: 'Appointments' },
  { id: 'feedings',     label: 'Feeding summary (14d)' },
  { id: 'sleep',        label: 'Sleep summary (14d)' },
]

interface Props {
  babyId: string
  babyName: string
  onClose: () => void
}

export default function ReportModal({ babyId, babyName, onClose }: Props) {
  const [since, setSince] = useState('')
  const [sections, setSections] = useState<string[]>(ALL_SECTIONS.map(s => s.id))
  const [emailTo, setEmailTo] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  function toggleSection(id: string) {
    setSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  function buildOpts() {
    return {
      ...(since ? { since: new Date(since).toISOString() } : {}),
      sections,
    }
  }

  async function download() {
    if (sections.length === 0) { setMsg({ ok: false, text: 'Select at least one section.' }); return }
    setDownloading(true); setMsg(null)
    try {
      const blob = await api.reports.download(babyId, buildOpts())
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${babyName.replace(/\s+/g, '_')}_report_${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      setMsg({ ok: true, text: 'PDF downloaded.' })
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Download failed.' })
    } finally { setDownloading(false) }
  }

  async function sendEmail(e: FormEvent) {
    e.preventDefault()
    if (!emailTo) return
    if (sections.length === 0) { setMsg({ ok: false, text: 'Select at least one section.' }); return }
    setEmailing(true); setMsg(null)
    try {
      await api.reports.email(babyId, { to: emailTo, ...buildOpts() })
      setMsg({ ok: true, text: `Report sent to ${emailTo}.` })
      setEmailTo('')
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Email failed.' })
    } finally { setEmailing(false) }
  }

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="sheet space-y-5 overflow-y-auto max-h-[85vh]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Pediatric Report — {babyName}</h2>
          <button onClick={onClose} className="text-stone-400 text-2xl leading-none">&times;</button>
        </div>

        {msg && (
          <p className={`text-sm px-3 py-2 rounded-xl ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {msg.text}
          </p>
        )}

        {/* Date range */}
        <div>
          <label className="block text-sm font-semibold text-stone-500 mb-2">Include records from</label>
          <div className="flex gap-2 items-center">
            <input
              type="date"
              className="input flex-1"
              value={since}
              onChange={e => setSince(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
            {since && (
              <button onClick={() => setSince('')} className="text-stone-400 text-sm hover:text-stone-600">
                Clear (all time)
              </button>
            )}
          </div>
          {!since && <p className="text-xs text-stone-400 mt-1">No date selected — all records will be included.</p>}
        </div>

        {/* Sections */}
        <div>
          <label className="block text-sm font-semibold text-stone-500 mb-2">Sections to include</label>
          <div className="space-y-2">
            {ALL_SECTIONS.map(s => (
              <label key={s.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded text-brand-500"
                  checked={sections.includes(s.id)}
                  onChange={() => toggleSection(s.id)}
                />
                <span className="text-sm text-stone-700">{s.label}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setSections(ALL_SECTIONS.map(s => s.id))} className="text-xs text-brand-600 hover:underline">Select all</button>
            <button onClick={() => setSections([])} className="text-xs text-stone-400 hover:underline">Clear all</button>
          </div>
        </div>

        {/* Download */}
        <div className="border-t border-stone-100 pt-4">
          <button
            onClick={download}
            disabled={downloading || sections.length === 0}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {downloading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating PDF…
              </>
            ) : (
              '↓  Download PDF'
            )}
          </button>
        </div>

        {/* Email */}
        <form onSubmit={sendEmail} className="border-t border-stone-100 pt-4 space-y-2">
          <p className="text-sm font-semibold text-stone-500">Or send directly to a provider</p>
          <div className="flex gap-2">
            <input
              type="email"
              className="input flex-1"
              placeholder="doctor@clinic.com"
              value={emailTo}
              onChange={e => setEmailTo(e.target.value)}
            />
            <button
              type="submit"
              disabled={emailing || !emailTo || sections.length === 0}
              className="btn-primary px-4"
            >
              {emailing ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin block" />
              ) : (
                'Send'
              )}
            </button>
          </div>
          <p className="text-xs text-stone-400">Requires SMTP to be configured in Admin Settings.</p>
        </form>
      </div>
    </>
  )
}
