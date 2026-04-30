const colors = {
  amber:  'bg-amber-50  border-amber-100  text-amber-700',
  teal:   'bg-teal-50   border-teal-100   text-teal-700',
  indigo: 'bg-indigo-50 border-indigo-100 text-indigo-700',
  stone:  'bg-stone-50  border-stone-100  text-stone-600',
}

interface Props {
  label: string
  value: string
  sub?: string
  color: keyof typeof colors
}

export default function AtAGlanceCard({ label, value, sub, color }: Props) {
  return (
    <div className={`rounded-2xl border p-3 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-sm font-bold leading-tight">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5 truncate">{sub}</p>}
    </div>
  )
}
