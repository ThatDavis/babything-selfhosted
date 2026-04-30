import { useState } from 'react'
import { api, ApiError } from '../lib/api'
import type { Baby, BabyCaregiver } from '../lib/api'
import { useAuth } from '../lib/auth'
import ReportModal from './ReportModal'

interface Props {
  baby: Baby & { role: string }
  caregivers: BabyCaregiver[]
  onClose: () => void
  onDeleted: () => void
  onCaregiversChanged: () => void
}

export default function BabySettings({ baby, caregivers, onClose, onDeleted, onCaregiversChanged }: Props) {
  const { user } = useAuth()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportMsg, setExportMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const isOwner = baby.role === 'OWNER'

  async function generateInvite() {
    if (!inviteEmail) return
    setError('')
    setLoading(true)
    try {
      const { inviteToken } = await api.auth.invite({ babyId: baby.id, email: inviteEmail })
      const url = `${window.location.origin}/invite/${inviteToken}`
      setInviteLink(url)
      setInviteEmail('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to generate invite')
    } finally {
      setLoading(false)
    }
  }

  async function removeCaregiver(userId: string) {
    await api.babies.removeCaregiver(baby.id, userId)
    onCaregiversChanged()
  }

  async function deleteBaby() {
    setDeleting(true)
    try {
      await api.babies.delete(baby.id)
      onDeleted()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete baby')
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="sheet space-y-5 overflow-y-auto max-h-[80vh]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{baby.name} — Settings</h2>
          <button onClick={onClose} className="text-stone-400 text-2xl leading-none">&times;</button>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {/* Caregivers */}
        <div>
          <h3 className="text-sm font-semibold text-stone-500 mb-2">Caregivers</h3>
          <div className="space-y-2">
            {caregivers.map(c => (
              <div key={c.userId} className="flex items-center justify-between py-2 px-3 rounded-2xl bg-stone-50">
                <div>
                  <p className="text-sm font-medium">{c.user.name} {c.userId === user?.id && <span className="text-stone-400">(you)</span>}</p>
                  <p className="text-xs text-stone-400">{c.user.email} · {c.role}</p>
                </div>
                {isOwner && c.userId !== user?.id && (
                  <button onClick={() => removeCaregiver(c.userId)} className="text-xs text-red-400 hover:text-red-600 font-medium">Remove</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Invite */}
        {isOwner && (
          <div>
            <h3 className="text-sm font-semibold text-stone-500 mb-2">Invite caregiver</h3>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                type="email"
                placeholder="partner@email.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
              />
              <button className="btn-primary px-4 py-2 text-sm" onClick={generateInvite} disabled={loading || !inviteEmail}>
                {loading ? '…' : 'Invite'}
              </button>
            </div>
            {inviteLink && (
              <div className="mt-2 p-3 bg-stone-50 rounded-xl">
                <p className="text-xs text-stone-500 mb-1">Share this link (expires in 7 days):</p>
                <p className="text-xs font-mono break-all text-brand-600">{inviteLink}</p>
                <button
                  className="text-xs text-stone-400 mt-1 hover:text-stone-600"
                  onClick={() => { navigator.clipboard.writeText(inviteLink); }}
                >
                  Copy to clipboard
                </button>
              </div>
            )}
          </div>
        )}

        {/* Pediatric Report */}
        <div className="border-t border-stone-100 pt-4">
          <h3 className="text-sm font-semibold text-stone-500 mb-2">Pediatric Report</h3>
          <p className="text-xs text-stone-400 mb-3">Generate a formatted PDF for sharing with {baby.name}'s doctor — includes growth, vaccines, medications, and more.</p>
          <button onClick={() => setShowReport(true)} className="btn-primary w-full text-sm">
            Generate report…
          </button>
        </div>

        {/* CSV Export */}
        <div className="border-t border-stone-100 pt-4">
          <h3 className="text-sm font-semibold text-stone-500 mb-2">Export Data</h3>
          <p className="text-xs text-stone-400 mb-3">Download a ZIP of all tracking data for {baby.name} as CSV files.</p>

          {exportMsg && (
            <p className={`text-sm px-3 py-2 rounded-xl mb-3 ${exportMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {exportMsg.text}
            </p>
          )}

          <div className="space-y-2 mb-3">
            <div className="flex gap-2 items-center">
              <label className="text-xs text-stone-500 w-10">From</label>
              <input
                type="date"
                className="input flex-1 text-sm"
                value={exportFrom}
                onChange={e => setExportFrom(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="flex gap-2 items-center">
              <label className="text-xs text-stone-500 w-10">To</label>
              <input
                type="date"
                className="input flex-1 text-sm"
                value={exportTo}
                onChange={e => setExportTo(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            {!exportFrom && !exportTo && (
              <p className="text-xs text-stone-400">No dates selected — all records will be exported.</p>
            )}
          </div>

          <button
            onClick={async () => {
              setExporting(true)
              setExportMsg(null)
              try {
                const blob = await api.reports.export(baby.id, { from: exportFrom || undefined, to: exportTo || undefined })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${baby.name.replace(/\s+/g, '_')}_export_${new Date().toISOString().split('T')[0]}.zip`
                a.click()
                URL.revokeObjectURL(url)
                setExportMsg({ ok: true, text: 'Export downloaded.' })
              } catch (err) {
                setExportMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Export failed.' })
              } finally {
                setExporting(false)
              }
            }}
            disabled={exporting}
            className="btn-primary w-full text-sm flex items-center justify-center gap-2"
          >
            {exporting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Exporting…
              </>
            ) : (
              '↓  Download CSV Export'
            )}
          </button>
        </div>

        {/* Delete baby */}
        {isOwner && (
          <div className="border-t border-stone-100 pt-4">
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="text-sm text-red-400 hover:text-red-600 font-medium">
                Delete {baby.name}…
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-red-600 font-medium">This will permanently delete all data for {baby.name}. Are you sure?</p>
                <div className="flex gap-2">
                  <button onClick={deleteBaby} disabled={deleting} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold">
                    {deleting ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2 rounded-xl bg-stone-100 text-stone-600 text-sm font-semibold">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {showReport && (
        <ReportModal babyId={baby.id} babyName={baby.name} onClose={() => setShowReport(false)} />
      )}
    </>
  )
}
