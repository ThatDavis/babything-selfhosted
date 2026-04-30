import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useUnits } from '../../contexts/UnitsContext';
import { displayWeight, displayLength, weightToGrams, lengthToCm, weightLabel, lengthLabel, headCircLabel, weightStep, lengthStep, weightPlaceholder, lengthPlaceholder, headCircPlaceholder, } from '../../lib/units';
export default function HealthTab({ babyId }) {
    const { unitSystem } = useUnits();
    const [growth, setGrowth] = useState([]);
    const [meds, setMeds] = useState([]);
    const [tab, setTab] = useState('growth');
    const [showGrowthForm, setShowGrowthForm] = useState(false);
    const [showMedForm, setShowMedForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const reload = async () => {
        const [g, m] = await Promise.all([api.growth.list(babyId), api.medications.list(babyId)]);
        setGrowth(g);
        setMeds(m);
        setLoading(false);
    };
    useEffect(() => { reload(); }, [babyId]);
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "grid grid-cols-2 gap-1 bg-stone-100 p-1 rounded-2xl", children: ['growth', 'medications'].map(t => (_jsx("button", { onClick: () => setTab(t), className: `py-2 rounded-xl text-sm font-semibold capitalize transition-colors ${tab === t ? 'bg-white shadow-sm' : 'text-stone-500'}`, children: t === 'growth' ? '📏 Growth' : '💊 Medications' }, t))) }), loading ? _jsx("p", { className: "text-center text-stone-400 text-sm py-4", children: "Loading\u2026" }) : tab === 'growth' ? (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("p", { className: "text-xs text-stone-400", children: [growth.length, " record", growth.length !== 1 ? 's' : ''] }), _jsx("button", { onClick: () => setShowGrowthForm(true), className: "btn-primary px-3 py-1.5 text-xs", children: "+ Add measurement" })] }), growth.length === 0 && _jsx("p", { className: "text-center text-stone-400 text-sm py-6", children: "No measurements yet." }), growth.map(g => (_jsxs("div", { className: "card flex justify-between items-center", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-sm font-semibold", children: [g.weight != null && _jsxs("span", { children: [displayWeight(g.weight, unitSystem), " "] }), g.length != null && _jsxs("span", { children: [displayLength(g.length, unitSystem), " "] }), g.headCirc != null && _jsxs("span", { children: ["HC ", displayLength(g.headCirc, unitSystem)] })] }), _jsxs("p", { className: "text-xs text-stone-400", children: [new Date(g.measuredAt).toLocaleDateString([], { dateStyle: 'medium' }), " \u00B7 ", g.user.name] }), g.notes && _jsx("p", { className: "text-xs text-stone-400", children: g.notes })] }), _jsx("button", { onClick: async () => { await api.growth.delete(babyId, g.id); reload(); }, className: "text-xs text-stone-300 hover:text-red-400 ml-2", children: "\u2715" })] }, g.id)))] })) : (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("p", { className: "text-xs text-stone-400", children: [meds.length, " record", meds.length !== 1 ? 's' : ''] }), _jsx("button", { onClick: () => setShowMedForm(true), className: "btn-primary px-3 py-1.5 text-xs", children: "+ Log medication" })] }), meds.length === 0 && _jsx("p", { className: "text-center text-stone-400 text-sm py-6", children: "No medications logged yet." }), meds.map(m => (_jsxs("div", { className: "card flex justify-between items-center", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-sm font-semibold", children: [m.name, " ", _jsxs("span", { className: "font-normal text-stone-500", children: [m.dose, " ", m.unit] })] }), _jsxs("p", { className: "text-xs text-stone-400", children: [new Date(m.occurredAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }), " \u00B7 ", m.user.name] }), m.notes && _jsx("p", { className: "text-xs text-stone-400", children: m.notes })] }), _jsx("button", { onClick: async () => { await api.medications.delete(babyId, m.id); reload(); }, className: "text-xs text-stone-300 hover:text-red-400 ml-2", children: "\u2715" })] }, m.id)))] })), showGrowthForm && _jsx(GrowthSheet, { babyId: babyId, onClose: () => setShowGrowthForm(false), onSaved: () => { setShowGrowthForm(false); reload(); } }), showMedForm && _jsx(MedSheet, { babyId: babyId, onClose: () => setShowMedForm(false), onSaved: () => { setShowMedForm(false); reload(); } })] }));
}
function GrowthSheet({ babyId, onClose, onSaved }) {
    const { unitSystem } = useUnits();
    const [weight, setWeight] = useState('');
    const [length, setLength] = useState('');
    const [headCirc, setHeadCirc] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    async function save() {
        setSaving(true);
        await api.growth.create(babyId, {
            weight: weight ? weightToGrams(parseFloat(weight), unitSystem) : undefined,
            length: length ? lengthToCm(parseFloat(length), unitSystem) : undefined,
            headCirc: headCirc ? lengthToCm(parseFloat(headCirc), unitSystem) : undefined,
            measuredAt: new Date().toISOString(),
            notes: notes || undefined,
        });
        onSaved();
    }
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "sheet-overlay", onClick: onClose }), _jsxs("div", { className: "sheet space-y-4", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("h2", { className: "text-lg font-bold", children: "Add measurement" }), _jsx("button", { onClick: onClose, className: "text-stone-400 text-2xl leading-none", children: "\u00D7" })] }), _jsxs("div", { className: "grid grid-cols-3 gap-2", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium mb-1 block", children: weightLabel(unitSystem) }), _jsx("input", { className: "input", type: "number", step: weightStep(unitSystem), placeholder: weightPlaceholder(unitSystem), value: weight, onChange: e => setWeight(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium mb-1 block", children: lengthLabel(unitSystem) }), _jsx("input", { className: "input", type: "number", step: lengthStep(unitSystem), placeholder: lengthPlaceholder(unitSystem), value: length, onChange: e => setLength(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium mb-1 block", children: headCircLabel(unitSystem) }), _jsx("input", { className: "input", type: "number", step: lengthStep(unitSystem), placeholder: headCircPlaceholder(unitSystem), value: headCirc, onChange: e => setHeadCirc(e.target.value) })] })] }), _jsxs("div", { children: [_jsxs("label", { className: "text-sm font-medium mb-1 block", children: ["Notes ", _jsx("span", { className: "text-stone-400 font-normal", children: "(opt)" })] }), _jsx("input", { className: "input", placeholder: "Any notes\u2026", value: notes, onChange: e => setNotes(e.target.value) })] }), _jsx("button", { className: "btn-primary w-full", onClick: save, disabled: saving || (!weight && !length && !headCirc), children: saving ? 'Saving…' : 'Save measurement' })] })] }));
}
function MedSheet({ babyId, onClose, onSaved }) {
    const [name, setName] = useState('');
    const [dose, setDose] = useState('');
    const [unit, setUnit] = useState('ml');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const COMMON_MEDS = ['Vitamin D', 'Tylenol', 'Ibuprofen', 'Gripe water', 'Iron'];
    async function save() {
        if (!name || !dose)
            return;
        setSaving(true);
        await api.medications.create(babyId, { name, dose: parseFloat(dose), unit, occurredAt: new Date().toISOString(), notes: notes || undefined });
        onSaved();
    }
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "sheet-overlay", onClick: onClose }), _jsxs("div", { className: "sheet space-y-4", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("h2", { className: "text-lg font-bold", children: "Log medication" }), _jsx("button", { onClick: onClose, className: "text-stone-400 text-2xl leading-none", children: "\u00D7" })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium mb-2", children: "Common" }), _jsx("div", { className: "flex flex-wrap gap-1.5 mb-2", children: COMMON_MEDS.map(m => (_jsx("button", { onClick: () => setName(m), className: `px-3 py-1 rounded-xl text-xs font-medium border transition-colors ${name === m ? 'bg-brand-500 text-white border-brand-500' : 'border-stone-200 text-stone-600'}`, children: m }, m))) }), _jsx("input", { className: "input", placeholder: "Or type medication name", value: name, onChange: e => setName(e.target.value) })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { children: [_jsx("label", { className: "text-sm font-medium mb-1 block", children: "Dose" }), _jsx("input", { className: "input", type: "number", step: "0.1", placeholder: "amount", value: dose, onChange: e => setDose(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm font-medium mb-1 block", children: "Unit" }), _jsx("select", { className: "input", value: unit, onChange: e => setUnit(e.target.value), children: ['ml', 'mg', 'drops', 'other'].map(u => _jsx("option", { value: u, children: u }, u)) })] })] }), _jsxs("div", { children: [_jsxs("label", { className: "text-sm font-medium mb-1 block", children: ["Notes ", _jsx("span", { className: "text-stone-400 font-normal", children: "(opt)" })] }), _jsx("input", { className: "input", placeholder: "Any notes\u2026", value: notes, onChange: e => setNotes(e.target.value) })] }), _jsx("button", { className: "btn-primary w-full", onClick: save, disabled: saving || !name || !dose, children: saving ? 'Saving…' : 'Save medication' })] })] }));
}
