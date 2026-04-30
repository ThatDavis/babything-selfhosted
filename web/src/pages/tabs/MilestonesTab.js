import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
const COMMON = ['First smile', 'First laugh', 'Holds head up', 'Rolls over', 'Sits unassisted', 'First tooth', 'First word', 'First steps', 'Sleeps through the night'];
export default function MilestonesTab({ babyId }) {
    const [milestones, setMilestones] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const reload = async () => {
        const m = await api.milestones.list(babyId);
        setMilestones(m);
        setLoading(false);
    };
    useEffect(() => { reload(); }, [babyId]);
    if (loading)
        return _jsx("p", { className: "text-center text-stone-400 text-sm py-4", children: "Loading\u2026" });
    return (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("p", { className: "text-xs text-stone-400", children: [milestones.length, " milestone", milestones.length !== 1 ? 's' : ''] }), _jsx("button", { onClick: () => setShowForm(true), className: "btn-primary px-3 py-1.5 text-xs", children: "+ Add milestone" })] }), milestones.length === 0 && (_jsxs("div", { className: "text-center py-10", children: [_jsx("p", { className: "text-3xl mb-2", children: "\u2B50" }), _jsx("p", { className: "text-stone-400 text-sm", children: "No milestones logged yet." })] })), milestones.map(m => (_jsxs("div", { className: "card flex justify-between items-start", children: [_jsxs("div", { children: [_jsxs("p", { className: "font-semibold text-sm", children: ["\u2B50 ", m.title] }), m.description && _jsx("p", { className: "text-xs text-stone-500 mt-0.5", children: m.description }), _jsxs("p", { className: "text-xs text-stone-400 mt-1", children: [new Date(m.occurredAt).toLocaleDateString([], { dateStyle: 'long' }), " \u00B7 ", m.user.name] })] }), _jsx("button", { onClick: async () => { await api.milestones.delete(babyId, m.id); reload(); }, className: "text-xs text-stone-300 hover:text-red-400 ml-2 shrink-0", children: "\u2715" })] }, m.id))), showForm && _jsx(MilestoneSheet, { babyId: babyId, onClose: () => setShowForm(false), onSaved: () => { setShowForm(false); reload(); } })] }));
}
function MilestoneSheet({ babyId, onClose, onSaved }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [saving, setSaving] = useState(false);
    async function save() {
        if (!title)
            return;
        setSaving(true);
        await api.milestones.create(babyId, { title, description: description || undefined, occurredAt: new Date(date).toISOString() });
        onSaved();
    }
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "sheet-overlay", onClick: onClose }), _jsxs("div", { className: "sheet space-y-4", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("h2", { className: "text-lg font-bold", children: "Add milestone" }), _jsx("button", { onClick: onClose, className: "text-stone-400 text-2xl leading-none", children: "\u00D7" })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium mb-2", children: "Common milestones" }), _jsx("div", { className: "flex flex-wrap gap-1.5 mb-2", children: COMMON.map(c => (_jsx("button", { onClick: () => setTitle(c), className: `px-3 py-1 rounded-xl text-xs font-medium border transition-colors ${title === c ? 'bg-brand-500 text-white border-brand-500' : 'border-stone-200 text-stone-600'}`, children: c }, c))) }), _jsx("input", { className: "input", placeholder: "Or type a custom milestone", value: title, onChange: e => setTitle(e.target.value) })] }), _jsxs("div", { children: [_jsxs("label", { className: "text-sm font-medium mb-1 block", children: ["Description ", _jsx("span", { className: "text-stone-400 font-normal", children: "(opt)" })] }), _jsx("input", { className: "input", placeholder: "Any details\u2026", value: description, onChange: e => setDescription(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm font-medium mb-1 block", children: "Date" }), _jsx("input", { className: "input", type: "date", value: date, onChange: e => setDate(e.target.value) })] }), _jsx("button", { className: "btn-primary w-full", onClick: save, disabled: saving || !title, children: saving ? 'Saving…' : 'Save milestone' })] })] }));
}
