import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { api, ApiError } from '../lib/api';
import { formatDuration } from '../lib/auth';
export default function FeedSheet({ babyId, onClose, onLogged }) {
    const [type, setType] = useState('BREAST');
    const [side, setSide] = useState('left');
    const [milkType, setMilkType] = useState('breastmilk');
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [timerRunning, setTimerRunning] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [startedAt] = useState(() => new Date());
    const intervalRef = useRef(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        if (timerRunning) {
            intervalRef.current = setInterval(() => setElapsed(e => e + 1000), 1000);
        }
        else {
            if (intervalRef.current)
                clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current)
            clearInterval(intervalRef.current); };
    }, [timerRunning]);
    async function save() {
        setSaving(true);
        setError('');
        const endedAt = new Date();
        // Only record durationMin if at least 1 full minute elapsed; avoids sending 0 (invalid)
        const durationMin = elapsed >= 60000 ? Math.round(elapsed / 60000) : undefined;
        try {
            await api.feedings.create(babyId, {
                type,
                side: type === 'BREAST' ? side : undefined,
                durationMin,
                amount: type === 'BOTTLE' && amount ? parseFloat(amount) : undefined,
                milkType: type === 'BOTTLE' ? milkType : undefined,
                startedAt: startedAt.toISOString(),
                endedAt: endedAt.toISOString(),
                notes: notes || undefined,
            });
            onLogged();
        }
        catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to save feeding');
        }
        finally {
            setSaving(false);
        }
    }
    return (_jsxs("div", { className: "space-y-5", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-lg font-bold", children: "Log feeding" }), _jsx("button", { onClick: onClose, className: "text-stone-400 text-2xl leading-none", children: "\u00D7" })] }), _jsx("div", { className: "grid grid-cols-2 gap-2 bg-stone-100 p-1 rounded-2xl", children: ['BREAST', 'BOTTLE'].map(t => (_jsx("button", { onClick: () => setType(t), className: `py-2 rounded-xl text-sm font-semibold transition-colors ${type === t ? 'bg-white shadow-sm' : 'text-stone-500'}`, children: t === 'BREAST' ? '🤱 Breast' : '🍼 Bottle' }, t))) }), type === 'BREAST' ? (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium mb-2", children: "Side" }), _jsx("div", { className: "flex gap-2", children: ['left', 'right', 'both'].map(s => (_jsx("button", { onClick: () => setSide(s), className: `flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${side === s ? 'bg-brand-500 text-white border-brand-500' : 'border-stone-200 text-stone-600'}`, children: s.charAt(0).toUpperCase() + s.slice(1) }, s))) })] }), _jsxs("div", { className: "flex flex-col items-center gap-3", children: [_jsx("p", { className: "text-4xl font-mono font-bold text-brand-500", children: formatDuration(elapsed) }), _jsx("button", { onClick: () => setTimerRunning(r => !r), className: `px-8 py-3 rounded-2xl font-semibold text-sm ${timerRunning ? 'bg-stone-200 text-stone-700' : 'bg-brand-500 text-white'}`, children: elapsed === 0 ? 'Start timer' : timerRunning ? 'Pause' : 'Resume' })] })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium mb-2", children: "Milk type" }), _jsx("div", { className: "flex gap-2", children: ['breastmilk', 'formula', 'other'].map(m => (_jsx("button", { onClick: () => setMilkType(m), className: `flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${milkType === m ? 'bg-brand-500 text-white border-brand-500' : 'border-stone-200 text-stone-600'}`, children: m.charAt(0).toUpperCase() + m.slice(1) }, m))) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm font-medium mb-1 block", children: "Amount (ml)" }), _jsx("input", { className: "input", type: "number", inputMode: "decimal", placeholder: "e.g. 90", value: amount, onChange: e => setAmount(e.target.value) })] })] })), _jsxs("div", { children: [_jsxs("label", { className: "text-sm font-medium mb-1 block", children: ["Notes ", _jsx("span", { className: "text-stone-400 font-normal", children: "(optional)" })] }), _jsx("input", { className: "input", type: "text", placeholder: "Any notes\u2026", value: notes, onChange: e => setNotes(e.target.value) })] }), error && _jsx("p", { className: "text-red-500 text-sm", children: error }), _jsx("button", { className: "btn-primary w-full", onClick: save, disabled: saving, children: saving ? 'Saving…' : 'Save feeding' })] }));
}
