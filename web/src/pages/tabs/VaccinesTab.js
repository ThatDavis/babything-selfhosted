import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { computeSchedule } from '../../lib/vaccineSchedule';
const statusColor = {
    complete: 'bg-green-100 text-green-700 border-green-200',
    due: 'bg-amber-100 text-amber-700 border-amber-200',
    overdue: 'bg-red-100   text-red-700   border-red-200',
    upcoming: 'bg-stone-100 text-stone-500 border-stone-200',
};
const statusLabel = {
    complete: '✓ Done',
    due: '! Due now',
    overdue: '!! Overdue',
    upcoming: 'Upcoming',
};
const APPOINTMENT_TYPES = ['WELL_VISIT', 'SICK_VISIT', 'SPECIALIST', 'OTHER'];
const APPT_LABELS = { WELL_VISIT: 'Well visit', SICK_VISIT: 'Sick visit', SPECIALIST: 'Specialist', OTHER: 'Other' };
export default function VaccinesTab({ babyId, babyDob }) {
    const [vaccines, setVaccines] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [tab, setTab] = useState('schedule');
    const [showLogVaccine, setShowLogVaccine] = useState(false);
    const [showAddAppt, setShowAddAppt] = useState(false);
    const [loading, setLoading] = useState(true);
    const reload = async () => {
        const [v, a] = await Promise.all([api.vaccines.list(babyId), api.appointments.list(babyId)]);
        setVaccines(v);
        setAppointments(a);
        setLoading(false);
    };
    useEffect(() => { reload(); }, [babyId]);
    const schedule = computeSchedule(babyDob, vaccines.map(v => ({ vaccineName: v.vaccineName, doseNumber: v.doseNumber ?? null })));
    const due = schedule.filter(s => s.status === 'due' || s.status === 'overdue');
    return (_jsxs("div", { className: "space-y-4", children: [due.length > 0 && (_jsxs("div", { className: "bg-amber-50 border border-amber-200 rounded-2xl p-3", children: [_jsx("p", { className: "text-sm font-semibold text-amber-700 mb-1", children: "Vaccines due" }), due.map(d => (_jsxs("p", { className: "text-xs text-amber-600", children: [d.status === 'overdue' ? '!!' : '!', " ", d.vaccine, " dose ", d.dose, " \u2014 ", d.ageLabel] }, `${d.vaccine}-${d.dose}`)))] })), _jsx("div", { className: "grid grid-cols-2 gap-1 bg-stone-100 p-1 rounded-2xl", children: ['schedule', 'appointments'].map(t => (_jsx("button", { onClick: () => setTab(t), className: `py-2 rounded-xl text-sm font-semibold capitalize transition-colors ${tab === t ? 'bg-white shadow-sm' : 'text-stone-500'}`, children: t === 'schedule' ? '💉 Schedule' : '📅 Appointments' }, t))) }), loading ? _jsx("p", { className: "text-center text-stone-400 text-sm py-4", children: "Loading\u2026" }) : tab === 'schedule' ? (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("p", { className: "text-xs text-stone-400", children: "CDC recommended schedule" }), _jsx("button", { onClick: () => setShowLogVaccine(true), className: "btn-primary px-3 py-1.5 text-xs", children: "+ Log vaccine" })] }), schedule.map(entry => (_jsxs("div", { className: `flex items-center justify-between px-3 py-2.5 rounded-2xl border ${statusColor[entry.status]}`, children: [_jsxs("div", { children: [_jsxs("p", { className: "text-sm font-semibold", children: [entry.vaccine, " ", _jsxs("span", { className: "font-normal opacity-70", children: ["dose ", entry.dose] })] }), _jsx("p", { className: "text-xs opacity-70", children: entry.ageLabel })] }), _jsx("span", { className: "text-xs font-semibold", children: statusLabel[entry.status] })] }, `${entry.vaccine}-${entry.dose}`))), vaccines.filter(v => !schedule.some(s => s.vaccine.toLowerCase() === v.vaccineName.toLowerCase() && s.dose === v.doseNumber)).map(v => (_jsxs("div", { className: `flex items-center justify-between px-3 py-2.5 rounded-2xl border ${statusColor.complete}`, children: [_jsxs("div", { children: [_jsxs("p", { className: "text-sm font-semibold", children: [v.vaccineName, " ", v.doseNumber ? `dose ${v.doseNumber}` : ''] }), _jsxs("p", { className: "text-xs opacity-70", children: ["Custom \u00B7 ", new Date(v.administeredAt).toLocaleDateString()] })] }), _jsx("span", { className: "text-xs font-semibold", children: "\u2713 Done" })] }, v.id)))] })) : (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("p", { className: "text-xs text-stone-400", children: [appointments.length, " appointment", appointments.length !== 1 ? 's' : ''] }), _jsx("button", { onClick: () => setShowAddAppt(true), className: "btn-primary px-3 py-1.5 text-xs", children: "+ Add appointment" })] }), appointments.length === 0 && _jsx("p", { className: "text-center text-stone-400 text-sm py-6", children: "No appointments logged yet." }), appointments.map(a => (_jsxs("div", { className: "card", children: [_jsxs("div", { className: "flex justify-between items-start", children: [_jsxs("div", { children: [_jsx("p", { className: "font-semibold text-sm", children: APPT_LABELS[a.type] }), _jsxs("p", { className: "text-xs text-stone-500", children: [new Date(a.date).toLocaleDateString([], { dateStyle: 'medium' }), " ", a.doctor ? `· ${a.doctor}` : ''] })] }), _jsx("button", { onClick: async () => { await api.appointments.delete(babyId, a.id); reload(); }, className: "text-xs text-stone-300 hover:text-red-400", children: "\u2715" })] }), a.vaccines.length > 0 && (_jsx("div", { className: "mt-2 flex flex-wrap gap-1", children: a.vaccines.map(v => (_jsxs("span", { className: "text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full", children: [v.vaccineName, " #", v.doseNumber] }, v.id))) })), a.notes && _jsx("p", { className: "text-xs text-stone-400 mt-1", children: a.notes })] }, a.id)))] })), showLogVaccine && _jsx(LogVaccineSheet, { babyId: babyId, appointments: appointments, onClose: () => setShowLogVaccine(false), onSaved: () => { setShowLogVaccine(false); reload(); } }), showAddAppt && _jsx(AddAppointmentSheet, { babyId: babyId, onClose: () => setShowAddAppt(false), onSaved: () => { setShowAddAppt(false); reload(); } })] }));
}
function LogVaccineSheet({ babyId, appointments, onClose, onSaved }) {
    const [name, setName] = useState('');
    const [dose, setDose] = useState('');
    const [lot, setLot] = useState('');
    const [apptId, setApptId] = useState('');
    const [saving, setSaving] = useState(false);
    const COMMON = ['HepB', 'DTaP', 'Hib', 'IPV', 'PCV', 'RV', 'Flu', 'MMR', 'Varicella', 'HepA'];
    async function save() {
        if (!name)
            return;
        setSaving(true);
        await api.vaccines.create(babyId, {
            vaccineName: name,
            doseNumber: dose ? parseInt(dose) : undefined,
            lotNumber: lot || undefined,
            administeredAt: new Date().toISOString(),
            appointmentId: apptId || undefined,
        });
        onSaved();
    }
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "sheet-overlay", onClick: onClose }), _jsxs("div", { className: "sheet space-y-4", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("h2", { className: "text-lg font-bold", children: "Log vaccine" }), _jsx("button", { onClick: onClose, className: "text-stone-400 text-2xl leading-none", children: "\u00D7" })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium mb-2", children: "Vaccine" }), _jsx("div", { className: "flex flex-wrap gap-1.5 mb-2", children: COMMON.map(v => (_jsx("button", { onClick: () => setName(v), className: `px-3 py-1 rounded-xl text-xs font-medium border transition-colors ${name === v ? 'bg-brand-500 text-white border-brand-500' : 'border-stone-200 text-stone-600'}`, children: v }, v))) }), _jsx("input", { className: "input", placeholder: "Or type custom vaccine name", value: name, onChange: e => setName(e.target.value) })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { children: [_jsx("label", { className: "text-sm font-medium mb-1 block", children: "Dose #" }), _jsx("input", { className: "input", type: "number", min: "1", placeholder: "e.g. 1", value: dose, onChange: e => setDose(e.target.value) })] }), _jsxs("div", { children: [_jsxs("label", { className: "text-sm font-medium mb-1 block", children: ["Lot # ", _jsx("span", { className: "text-stone-400 font-normal", children: "(opt)" })] }), _jsx("input", { className: "input", placeholder: "optional", value: lot, onChange: e => setLot(e.target.value) })] })] }), appointments.length > 0 && (_jsxs("div", { children: [_jsxs("label", { className: "text-sm font-medium mb-1 block", children: ["Link to appointment ", _jsx("span", { className: "text-stone-400 font-normal", children: "(opt)" })] }), _jsxs("select", { className: "input", value: apptId, onChange: e => setApptId(e.target.value), children: [_jsx("option", { value: "", children: "None" }), appointments.map(a => (_jsxs("option", { value: a.id, children: [new Date(a.date).toLocaleDateString([], { dateStyle: 'medium' }), " ", a.doctor ? `· ${a.doctor}` : ''] }, a.id)))] })] })), _jsx("button", { className: "btn-primary w-full", onClick: save, disabled: saving || !name, children: saving ? 'Saving…' : 'Save vaccine' })] })] }));
}
function AddAppointmentSheet({ babyId, onClose, onSaved }) {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [doctor, setDoctor] = useState('');
    const [type, setType] = useState('WELL_VISIT');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    async function save() {
        if (!date)
            return;
        setSaving(true);
        const dt = time ? new Date(`${date}T${time}`) : new Date(date);
        await api.appointments.create(babyId, { date: dt.toISOString(), doctor: doctor || undefined, type, notes: notes || undefined });
        onSaved();
    }
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "sheet-overlay", onClick: onClose }), _jsxs("div", { className: "sheet space-y-4", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("h2", { className: "text-lg font-bold", children: "Add appointment" }), _jsx("button", { onClick: onClose, className: "text-stone-400 text-2xl leading-none", children: "\u00D7" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { children: [_jsx("label", { className: "text-sm font-medium mb-1 block", children: "Date" }), _jsx("input", { className: "input", type: "date", required: true, value: date, onChange: e => setDate(e.target.value) })] }), _jsxs("div", { children: [_jsxs("label", { className: "text-sm font-medium mb-1 block", children: ["Time ", _jsx("span", { className: "text-stone-400 font-normal", children: "(opt)" })] }), _jsx("input", { className: "input", type: "time", value: time, onChange: e => setTime(e.target.value) })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm font-medium mb-1 block", children: "Type" }), _jsx("select", { className: "input", value: type, onChange: e => setType(e.target.value), children: APPOINTMENT_TYPES.map(t => _jsx("option", { value: t, children: APPT_LABELS[t] }, t)) })] }), _jsxs("div", { children: [_jsxs("label", { className: "text-sm font-medium mb-1 block", children: ["Doctor / clinic ", _jsx("span", { className: "text-stone-400 font-normal", children: "(opt)" })] }), _jsx("input", { className: "input", placeholder: "e.g. Dr. Smith", value: doctor, onChange: e => setDoctor(e.target.value) })] }), _jsxs("div", { children: [_jsxs("label", { className: "text-sm font-medium mb-1 block", children: ["Notes ", _jsx("span", { className: "text-stone-400 font-normal", children: "(opt)" })] }), _jsx("input", { className: "input", placeholder: "Any notes\u2026", value: notes, onChange: e => setNotes(e.target.value) })] }), _jsx("button", { className: "btn-primary w-full", onClick: save, disabled: saving || !date, children: saving ? 'Saving…' : 'Save appointment' })] })] }));
}
