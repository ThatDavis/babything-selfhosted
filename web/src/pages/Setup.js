import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
export default function Setup() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState('account');
    // Account fields
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    // Baby fields
    const [babyName, setBabyName] = useState('');
    const [dob, setDob] = useState('');
    const [sex, setSex] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    async function createAccount(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { user } = await api.auth.register({ name, email, password });
            login(user);
            setStep('baby');
        }
        catch (err) {
            setError(err instanceof ApiError ? err.message : 'Something went wrong');
        }
        finally {
            setLoading(false);
        }
    }
    async function createBaby(e) {
        e.preventDefault();
        setError('');
        if (new Date(dob) > new Date()) {
            setError("Date of birth can't be in the future");
            return;
        }
        setLoading(true);
        try {
            await api.babies.create({ name: babyName, dob: new Date(dob).toISOString(), sex: sex || undefined });
            setStep('done');
        }
        catch (err) {
            setError(err instanceof ApiError ? err.message : 'Something went wrong');
        }
        finally {
            setLoading(false);
        }
    }
    const steps = ['account', 'baby', 'done'];
    const stepIdx = steps.indexOf(step);
    return (_jsx("div", { className: "min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-brand-50 to-stone-50", children: _jsxs("div", { className: "w-full max-w-sm", children: [_jsx("h1", { className: "text-3xl font-bold text-center mb-1 text-brand-600", children: "babything" }), _jsx("p", { className: "text-center text-stone-500 mb-8 text-sm", children: "First-time setup" }), _jsx("div", { className: "flex items-center justify-center gap-2 mb-8", children: steps.filter(s => s !== 'done').map((s, i) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: `w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${i <= stepIdx - (step === 'done' ? 0 : 0) || step === 'done' || (step === 'baby' && i === 0) ? 'bg-brand-500 text-white' : 'bg-stone-200 text-stone-500'}`, children: i + 1 }), i < steps.filter(s => s !== 'done').length - 1 && (_jsx("div", { className: `h-0.5 w-8 rounded transition-colors ${step === 'baby' || step === 'done' ? 'bg-brand-400' : 'bg-stone-200'}` }))] }, s))) }), step === 'account' && (_jsxs("form", { onSubmit: createAccount, className: "card space-y-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-bold mb-1", children: "Create your account" }), _jsx("p", { className: "text-sm text-stone-500", children: "You'll be the owner and can invite caregivers later." })] }), error && _jsx("p", { className: "text-red-500 text-sm", children: error }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Your name" }), _jsx("input", { className: "input", type: "text", autoComplete: "name", required: true, value: name, onChange: e => setName(e.target.value), placeholder: "e.g. Alex" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Email" }), _jsx("input", { className: "input", type: "email", autoComplete: "email", required: true, value: email, onChange: e => setEmail(e.target.value) })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium mb-1", children: ["Password ", _jsx("span", { className: "text-stone-400 font-normal", children: "(8+ chars)" })] }), _jsx("input", { className: "input", type: "password", autoComplete: "new-password", minLength: 8, required: true, value: password, onChange: e => setPassword(e.target.value) })] }), _jsx("button", { className: "btn-primary w-full", type: "submit", disabled: loading, children: loading ? 'Creating…' : 'Continue →' })] })), step === 'baby' && (_jsxs("form", { onSubmit: createBaby, className: "card space-y-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-bold mb-1", children: "Add your baby" }), _jsx("p", { className: "text-sm text-stone-500", children: "You can add more babies and caregivers from the app." })] }), error && _jsx("p", { className: "text-red-500 text-sm", children: error }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Baby's name" }), _jsx("input", { className: "input", type: "text", required: true, value: babyName, onChange: e => setBabyName(e.target.value), placeholder: "e.g. Olivia" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Date of birth" }), _jsx("input", { className: "input", type: "date", required: true, value: dob, onChange: e => setDob(e.target.value) })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium mb-1", children: ["Sex ", _jsx("span", { className: "text-stone-400 font-normal", children: "(optional)" })] }), _jsxs("select", { className: "input", value: sex, onChange: e => setSex(e.target.value), children: [_jsx("option", { value: "", children: "Prefer not to say" }), _jsx("option", { value: "male", children: "Male" }), _jsx("option", { value: "female", children: "Female" }), _jsx("option", { value: "other", children: "Other" })] })] }), _jsx("button", { className: "btn-primary w-full", type: "submit", disabled: loading, children: loading ? 'Adding…' : 'Continue →' })] })), step === 'done' && (_jsxs("div", { className: "card text-center space-y-4", children: [_jsx("div", { className: "text-5xl", children: "\uD83C\uDF89" }), _jsx("h2", { className: "text-xl font-bold", children: "You're all set!" }), _jsx("p", { className: "text-stone-500 text-sm", children: "Start logging feedings, diapers, and sleep. Invite your partner from the settings menu once you're in." }), _jsx("button", { className: "btn-primary w-full", onClick: () => navigate('/'), children: "Go to app \u2192" })] }))] }) }));
}
