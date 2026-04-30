import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { UnifiedEvent } from '../lib/api'

interface Props {
  babyId: string
  refresh: number
}

function eventIcon(e: UnifiedEvent) {
  if (e.eventType === 'feeding') return e.type === 'BREAST' ? '🤱' : '🍼'
  if (e.eventType === 'diaper') return '👶'
  return '😴'
}

function eventLabel(e: UnifiedEvent): string {
  if (e.eventType === 'feeding') {
    const type = String(e.type)
    if (type === 'BREAST') return `Breast · ${e.side ?? ''} ${e.durationMin ? `${e.durationMin}m` : ''}`.trim()
    return `Bottle · ${e.amount ? `${e.amount}ml` : ''} ${e.milkType ?? ''}`.trim()
  }
  if (e.eventType === 'diaper') {
    return `${String(e.type).toLowerCase()} ${e.color ? `· ${e.color}` : ''}`.trim()
  }
  const end = e.endedAt ? new Date(String(e.endedAt)) : null
  const start = new Date(e.startedAt as string)
  const dur = end ? Math.round((end.getTime() - start.getTime()) / 60000) : null
  return `${String(e.type).toLowerCase()} ${dur ? `· ${dur}m` : '· ongoing'}`.trim()
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDay(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function ActivityFeed({ babyId, refresh }: Props) {
  const [events, setEvents] = useState<UnifiedEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.events.list(babyId)
      .then(setEvents)
      .finally(() => setLoading(false))
  }, [babyId, refresh])

  if (loading) return <div className="py-6 text-center text-stone-400 text-sm">Loading…</div>
  if (events.length === 0) return <div className="py-6 text-center text-stone-400 text-sm">No events logged yet.</div>

  let lastDay = ''

  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-stone-500 mb-2">Recent activity</h3>
      {events.map(e => {
        const day = formatDay(e.occurredAt)
        const showDay = day !== lastDay
        lastDay = day
        return (
          <div key={e.id}>
            {showDay && <p className="text-xs text-stone-400 font-medium pt-2 pb-1">{day}</p>}
            <div className="flex items-center gap-3 py-2 px-3 rounded-2xl hover:bg-stone-100 transition-colors">
              <span className="text-xl w-7 text-center">{eventIcon(e)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium capitalize truncate">{eventLabel(e)}</p>
                {Boolean(e.notes) && <p className="text-xs text-stone-400 truncate">{String(e.notes)}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-stone-400">{formatTime(e.occurredAt)}</p>
                <p className="text-xs text-stone-300">{(e.user as { name: string }).name}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
