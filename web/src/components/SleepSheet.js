import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { formatDuration } from '../lib/auth';
export default function SleepSheet({ babyId, activeSleep, onClose, onLogged }) {
    const [type, setType] = useState('NAP');
    const [location, setLocation] = useState(null);
    const [notes, setNotes] = useState('');
    const [elapsed, setElapsed] = useState(activeSleep ? Date.now() - new Date(activeSleep.startedAt).getTime() : 0);
    const [saving, setSaving] = useState(false);
    const intervalRef = useRef(null);
    useEffect(() => {
        if (activeSleep) {
            intervalRef.current = setInterval(() => {
                setElapsed(Date.now() - new Date(activeSleep.startedAt).getTime());
            }, 1000);
        }
        return () => { if (intervalRef.current)
            clearInterval(intervalRef.current); };
    }, [activeSleep]);
    async function startSleep() {
        setSaving(true);
        try {
            await api.sleep.create(babyId, {
                type,
                location: location ?? undefined,
                startedAt: new Date().toISOString(),
                notes: notes || undefined,
            });
            onLogged();
        }
        finally {
            setSaving(false);
        }
    }
    async function endSleep() {
        if (!activeSleep)
            return;
        setSaving(true);
        try {
            await api.sleep.update(babyId, activeSleep.id, { endedAt: new Date().toISOString() });
            onLogged();
        }
        finally {
            setSaving(false);
        }
    }
    if (activeSleep) {
        return (_jsxs("div", { className: "space-y-5", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-lg font-bold", children: "Sleep in progress" }), _jsx("button", { onClick: onClose, className: "text-stone-400 text-2xl leading-none", children: "\u00D7" })] }), _jsxs("div", { className: "flex flex-col items-center gap-3 py-4", children: [_jsx("span", { className: "text-5xl", children: "\uD83D\uDE34" }), _jsx("p", { className: "text-4xl font-mono font-bold text-indigo-500", children: formatDuration(elapsed) }), _jsxs("p", { className: "text-sm text-stone-500", children: ["Started ", new Date(activeSleep.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })] })] }), _jsx("button", { className: "btn-primary w-full bg-indigo-500 hover:bg-indigo-600", onClick: endSleep, disabled: saving, children: saving ? 'Saving…' : 'Wake up — end sleep' })] }));
    }
    return (_jsxs("div", { className: "space-y-5", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-lg font-bold", children: "Log sleep" }), _jsx("button", { onClick: onClose, className: "text-stone-400 text-2xl leading-none", children: "\u00D7" })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium mb-2", children: "Type" }), _jsx("div", { className: "grid grid-cols-2 gap-2 bg-stone-100 p-1 rounded-2xl", children: ['NAP', 'NIGHT'].map(t => (_jsx("button", { onClick: () => setType(t), className: `py-2 rounded-xl text-sm font-semibold transition-colors ${type === t ? 'bg-white shadow-sm' : 'text-stone-500'}`, children: t === 'NAP' ? '☀️ Nap' : '🌙 Night' }, t))) })] }), _jsxs("div", { children: [_jsxs("p", { className: "text-sm font-medium mb-2", children: ["Location ", _jsx("span", { className: "text-stone-400 font-normal", children: "(optional)" })] }), _jsx("div", { className: "flex gap-2 flex-wrap", children: ['crib', 'bassinet', 'arms', 'stroller', 'other'].map(l => (_jsx("button", { onClick: () => setLocation(location === l ? null : l), className: `px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${location === l ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-stone-200 text-stone-600'}`, children: l.charAt(0).toUpperCase() + l.slice(1) }, l))) })] }), _jsxs("div", { children: [_jsxs("label", { className: "text-sm font-medium mb-1 block", children: ["Notes ", _jsx("span", { className: "text-stone-400 font-normal", children: "(optional)" })] }), _jsx("input", { className: "input", type: "text", placeholder: "Any notes\u2026", value: notes, onChange: e => setNotes(e.target.value) })] }), _jsx("button", { className: "btn-primary w-full", onClick: startSleep, disabled: saving, children: saving ? 'Saving…' : '😴 Start sleep timer' })] }));
}
