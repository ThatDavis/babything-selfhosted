import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const colors = {
    amber: 'bg-amber-50  border-amber-100  text-amber-700',
    teal: 'bg-teal-50   border-teal-100   text-teal-700',
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-700',
    stone: 'bg-stone-50  border-stone-100  text-stone-600',
};
export default function AtAGlanceCard({ label, value, sub, color }) {
    return (_jsxs("div", { className: `rounded-2xl border p-3 ${colors[color]}`, children: [_jsx("p", { className: "text-xs font-medium opacity-70 mb-1", children: label }), _jsx("p", { className: "text-sm font-bold leading-tight", children: value }), sub && _jsx("p", { className: "text-xs opacity-60 mt-0.5 truncate", children: sub })] }));
}
