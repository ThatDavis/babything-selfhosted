import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { api, ApiError } from '../lib/api';
export default function AddBabyModal({ onClose, onCreated }) {
    const [name, setName] = useState('');
    const [dob, setDob] = useState('');
    const [sex, setSex] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        if (new Date(dob) > new Date()) {
            setError("Date of birth can't be in the future");
            return;
        }
        setSaving(true);
        try {
            const baby = await api.babies.create({
                name,
                dob: new Date(dob).toISOString(),
                sex: sex || undefined,
            });
            onCreated(baby);
        }
        catch (err) {
            setError(err instanceof ApiError ? err.message : 'Something went wrong');
            setSaving(false);
        }
    }
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "sheet-overlay", onClick: onClose }), _jsxs("div", { className: "sheet", children: [_jsxs("div", { className: "flex items-center justify-between mb-5", children: [_jsx("h2", { className: "text-lg font-bold", children: "Add baby" }), _jsx("button", { onClick: onClose, className: "text-stone-400 text-2xl leading-none", children: "\u00D7" })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [error && _jsx("p", { className: "text-red-500 text-sm", children: error }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Name" }), _jsx("input", { className: "input", type: "text", required: true, value: name, onChange: e => setName(e.target.value), placeholder: "Baby's name" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Date of birth" }), _jsx("input", { className: "input", type: "date", required: true, value: dob, onChange: e => setDob(e.target.value) })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium mb-1", children: ["Sex ", _jsx("span", { className: "text-stone-400 font-normal", children: "(optional)" })] }), _jsxs("select", { className: "input", value: sex, onChange: e => setSex(e.target.value), children: [_jsx("option", { value: "", children: "Prefer not to say" }), _jsx("option", { value: "male", children: "Male" }), _jsx("option", { value: "female", children: "Female" }), _jsx("option", { value: "other", children: "Other" })] })] }), _jsx("button", { className: "btn-primary w-full", type: "submit", disabled: saving, children: saving ? 'Adding…' : 'Add baby' })] })] })] }));
}
