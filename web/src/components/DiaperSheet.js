import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { api } from '../lib/api';
const typeLabels = { WET: '💧 Wet', DIRTY: '💩 Dirty', BOTH: '💩💧 Both', DRY: '✓ Dry' };
const colorDots = { yellow: 'bg-yellow-300', green: 'bg-green-400', brown: 'bg-amber-700', black: 'bg-stone-800', other: 'bg-stone-300' };
export default function DiaperSheet({ babyId, onClose, onLogged }) {
    const [type, setType] = useState('WET');
    const [color, setColor] = useState(null);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    async function save() {
        setSaving(true);
        try {
            await api.diapers.create(babyId, {
                type,
                color: color ?? undefined,
                occurredAt: new Date().toISOString(),
                notes: notes || undefined,
            });
            onLogged();
        }
        finally {
            setSaving(false);
        }
    }
    return (_jsxs("div", { className: "space-y-5", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-lg font-bold", children: "Log diaper" }), _jsx("button", { onClick: onClose, className: "text-stone-400 text-2xl leading-none", children: "\u00D7" })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium mb-2", children: "Type" }), _jsx("div", { className: "grid grid-cols-2 gap-2", children: Object.keys(typeLabels).map(t => (_jsx("button", { onClick: () => setType(t), className: `py-3 rounded-2xl text-sm font-semibold border transition-colors ${type === t ? 'bg-brand-500 text-white border-brand-500' : 'border-stone-200 text-stone-600'}`, children: typeLabels[t] }, t))) })] }), type !== 'DRY' && (_jsxs("div", { children: [_jsxs("p", { className: "text-sm font-medium mb-2", children: ["Color ", _jsx("span", { className: "text-stone-400 font-normal", children: "(optional)" })] }), _jsx("div", { className: "flex gap-2 flex-wrap", children: Object.keys(colorDots).map(c => (_jsxs("button", { onClick: () => setColor(color === c ? null : c), className: `flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${color === c ? 'border-brand-400 bg-brand-50' : 'border-stone-200'}`, children: [_jsx("span", { className: `w-3 h-3 rounded-full ${colorDots[c]}` }), c.charAt(0).toUpperCase() + c.slice(1)] }, c))) })] })), _jsxs("div", { children: [_jsxs("label", { className: "text-sm font-medium mb-1 block", children: ["Notes ", _jsx("span", { className: "text-stone-400 font-normal", children: "(optional)" })] }), _jsx("input", { className: "input", type: "text", placeholder: "Any notes\u2026", value: notes, onChange: e => setNotes(e.target.value) })] }), _jsx("button", { className: "btn-primary w-full", onClick: save, disabled: saving, children: saving ? 'Saving…' : 'Save diaper' })] }));
}
