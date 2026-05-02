import { useEffect, useState } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { api } from '../lib/api'
import type { Stats } from '../lib/api'
import { useUnits } from '../contexts/UnitsContext'
import { displayWeight } from '../lib/units'

interface Props { babyId: string }

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: 'short' })
}

export default function DashboardCharts({ babyId }: Props) {
  const [stats, setStats] = useState<Stats | null>(null)
  const { unitSystem } = useUnits()

  useEffect(() => {
    api.stats.get(babyId).then(setStats)
  }, [babyId])

  if (!stats) return <div className="py-8 text-center text-stone-400 text-sm">Loading charts…</div>

  // Feed timeline — hourly buckets for last 24h
  const feedBuckets: Record<number, number> = {}
  for (let h = 0; h < 24; h++) feedBuckets[h] = 0
  stats.feedings24h.forEach(f => { feedBuckets[new Date(f.startedAt).getHours()]++ })
  const feedData = Object.entries(feedBuckets).map(([h, count]) => ({ hour: `${h}:00`, count }))

  // Diaper daily counts for last 7 days
  const diaperBuckets: Record<string, number> = {}
  for (let d = 6; d >= 0; d--) {
    const day = new Date()
    day.setDate(day.getDate() - d)
    diaperBuckets[day.toDateString()] = 0
  }
  stats.diapers7d.forEach(d => { const k = new Date(d.occurredAt).toDateString(); if (k in diaperBuckets) diaperBuckets[k]++ })
  const diaperData = Object.entries(diaperBuckets).map(([d, count]) => ({ day: dayLabel(new Date(d).toISOString()), count }))

  // Sleep hours per day for last 7 days
  const sleepHours: Record<string, number> = {}
  for (let d = 6; d >= 0; d--) {
    const day = new Date()
    day.setDate(day.getDate() - d)
    sleepHours[day.toDateString()] = 0
  }
  stats.sleep7d.forEach(s => {
    if (!s.endedAt) return
    const hours = (new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 3600000
    const k = new Date(s.startedAt).toDateString()
    if (k in sleepHours) sleepHours[k] = +(sleepHours[k] + hours).toFixed(1)
  })
  const sleepData = Object.entries(sleepHours).map(([d, hours]) => ({ day: dayLabel(new Date(d).toISOString()), hours }))

  // Weight trend
  const weightUnit = unitSystem === 'imperial' ? 'lbs' : 'kg'
  const weightData = stats.growthAll
    .filter(g => g.weight !== null)
    .map(g => {
      const val = unitSystem === 'imperial'
        ? +(g.weight! / 453.592).toFixed(2)
        : +(g.weight! / 1000).toFixed(2)
      return { date: new Date(g.measuredAt).toLocaleDateString([], { month: 'short', day: 'numeric' }), [weightUnit]: val }
    })

  return (
    <div className="space-y-6">
      <ChartCard title="Feeds — last 24h">
        {stats.feedings24h.length === 0
          ? <Empty />
          : <ResponsiveContainer width="100%" height={140}>
              <BarChart data={feedData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#6f9682" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
        }
      </ChartCard>

      <ChartCard title="Diapers — last 7 days">
        {stats.diapers7d.length === 0
          ? <Empty />
          : <ResponsiveContainer width="100%" height={140}>
              <BarChart data={diaperData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#7daea8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
        }
      </ChartCard>

      <ChartCard title="Sleep hours — last 7 days">
        {stats.sleep7d.length === 0
          ? <Empty />
          : <ResponsiveContainer width="100%" height={140}>
              <BarChart data={sleepData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [`${v}h`, 'Sleep']} />
                <Bar dataKey="hours" fill="#8a9ab0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
        }
      </ChartCard>

      {weightData.length > 0 && (
        <ChartCard title={`Weight trend (${weightUnit})`}>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={weightData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
              <Tooltip formatter={(v: number) => [displayWeight(unitSystem === 'imperial' ? v * 453.592 : v * 1000, unitSystem), 'Weight']} />
              <Line type="monotone" dataKey={weightUnit} stroke="#6f9682" strokeWidth={2} dot={{ r: 4, fill: '#6f9682' }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <p className="text-sm font-semibold text-stone-500 mb-3">{title}</p>
      {children}
    </div>
  )
}

function Empty() {
  return <p className="text-xs text-stone-400 text-center py-4">No data yet</p>
}
