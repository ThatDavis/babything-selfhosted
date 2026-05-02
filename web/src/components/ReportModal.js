import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { api, ApiError } from '../lib/api';
const ALL_SECTIONS = [
    { id: 'growth', label: 'Growth measurements' },
    { id: 'vaccines', label: 'Vaccine history' },
    { id: 'medications', label: 'Medications' },
    { id: 'appointments', label: 'Appointments' },
    { id: 'feedings', label: 'Feeding summary (14d)' },
    { id: 'sleep', label: 'Sleep summary (14d)' },
];
export default function ReportModal({ babyId, babyName, onClose }) {
    const [since, setSince] = useState('');
    const [sections, setSections] = useState(ALL_SECTIONS.map(s => s.id));
    const [emailTo, setEmailTo] = useState('');
    const [downloading, setDownloading] = useState(false);
    const [emailing, setEmailing] = useState(false);
    const [msg, setMsg] = useState(null);
    function toggleSection(id) {
        setSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    }
    function buildOpts() {
        return {
            ...(since ? { since: new Date(since).toISOString() } : {}),
            sections,
        };
    }
    async function download() {
        if (sections.length === 0) {
            setMsg({ ok: false, text: 'Select at least one section.' });
            return;
        }
        setDownloading(true);
        setMsg(null);
        try {
            const blob = await api.reports.download(babyId, buildOpts());
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${babyName.replace(/\s+/g, '_')}_report_${new Date().toISOString().split('T')[0]}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            setMsg({ ok: true, text: 'PDF downloaded.' });
        }
        catch (err) {
            setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Download failed.' });
        }
        finally {
            setDownloading(false);
        }
    }
    async function sendEmail(e) {
        e.preventDefault();
        if (!emailTo)
            return;
        if (sections.length === 0) {
            setMsg({ ok: false, text: 'Select at least one section.' });
            return;
        }
        setEmailing(true);
        setMsg(null);
        try {
            await api.reports.email(babyId, { to: emailTo, ...buildOpts() });
            setMsg({ ok: true, text: `Report sent to ${emailTo}.` });
            setEmailTo('');
        }
        catch (err) {
            setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Email failed.' });
        }
        finally {
            setEmailing(false);
        }
    }
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "sheet-overlay", onClick: onClose }), _jsxs("div", { className: "sheet space-y-5 overflow-y-auto max-h-[85vh]", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("h2", { className: "text-lg font-bold", children: ["Pediatric Report \u2014 ", babyName] }), _jsx("button", { onClick: onClose, className: "text-stone-400 text-2xl leading-none", children: "\u00D7" })] }), msg && (_jsx("p", { className: `text-sm px-3 py-2 rounded-xl ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`, children: msg.text })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold text-stone-500 mb-2", children: "Include records from" }), _jsxs("div", { className: "flex gap-2 items-center", children: [_jsx("input", { type: "date", className: "input flex-1", value: since, onChange: e => setSince(e.target.value), max: new Date().toISOString().split('T')[0] }), since && (_jsx("button", { onClick: () => setSince(''), className: "text-stone-400 text-sm hover:text-stone-600", children: "Clear (all time)" }))] }), !since && _jsx("p", { className: "text-xs text-stone-400 mt-1", children: "No date selected \u2014 all records will be included." })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold text-stone-500 mb-2", children: "Sections to include" }), _jsx("div", { className: "space-y-2", children: ALL_SECTIONS.map(s => (_jsxs("label", { className: "flex items-center gap-3 cursor-pointer", children: [_jsx("input", { type: "checkbox", className: "rounded text-brand-500", checked: sections.includes(s.id), onChange: () => toggleSection(s.id) }), _jsx("span", { className: "text-sm text-stone-700", children: s.label })] }, s.id))) }), _jsxs("div", { className: "flex gap-3 mt-2", children: [_jsx("button", { onClick: () => setSections(ALL_SECTIONS.map(s => s.id)), className: "text-xs text-brand-600 hover:underline", children: "Select all" }), _jsx("button", { onClick: () => setSections([]), className: "text-xs text-stone-400 hover:underline", children: "Clear all" })] })] }), _jsx("div", { className: "border-t border-stone-100 pt-4", children: _jsx("button", { onClick: download, disabled: downloading || sections.length === 0, className: "btn-primary w-full flex items-center justify-center gap-2", children: downloading ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" }), "Generating PDF\u2026"] })) : ('↓  Download PDF') }) }), _jsxs("form", { onSubmit: sendEmail, className: "border-t border-stone-100 pt-4 space-y-2", children: [_jsx("p", { className: "text-sm font-semibold text-stone-500", children: "Or send directly to a provider" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "email", className: "input flex-1", placeholder: "doctor@clinic.com", value: emailTo, onChange: e => setEmailTo(e.target.value) }), _jsx("button", { type: "submit", disabled: emailing || !emailTo || sections.length === 0, className: "btn-primary px-4", children: emailing ? (_jsx("span", { className: "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin block" })) : ('Send') })] }), _jsx("p", { className: "text-xs text-stone-400", children: "Requires SMTP to be configured in Admin Settings." })] })] })] }));
}
