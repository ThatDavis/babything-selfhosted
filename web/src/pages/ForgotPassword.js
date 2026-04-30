import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.auth.forgotPassword(email);
            setSent(true);
        }
        catch (err) {
            setError(err instanceof ApiError ? err.message : 'Something went wrong');
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-brand-50 to-stone-50", children: _jsxs("div", { className: "w-full max-w-sm", children: [_jsx("h1", { className: "text-3xl font-bold text-center mb-2 text-brand-600", children: "babything" }), _jsx("p", { className: "text-center text-stone-500 mb-8", children: "Reset your password" }), sent ? (_jsxs("div", { className: "card text-center space-y-3", children: [_jsx("p", { className: "text-2xl", children: "\uD83D\uDCEC" }), _jsx("p", { className: "font-medium", children: "Check your email" }), _jsxs("p", { className: "text-stone-500 text-sm", children: ["If an account exists for ", email, ", we sent a reset link. It expires in 1 hour."] }), _jsx(Link, { to: "/login", className: "block text-brand-600 text-sm font-medium mt-2", children: "Back to sign in" })] })) : (_jsxs("form", { onSubmit: handleSubmit, className: "card space-y-4", children: [error && _jsx("p", { className: "text-red-500 text-sm text-center", children: error }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Email address" }), _jsx("input", { className: "input", type: "email", autoComplete: "email", required: true, value: email, onChange: e => setEmail(e.target.value) })] }), _jsx("button", { className: "btn-primary w-full", type: "submit", disabled: loading, children: loading ? 'Sending…' : 'Send reset link' }), _jsx("p", { className: "text-center text-sm text-stone-400", children: _jsx(Link, { to: "/login", className: "text-brand-600 font-medium", children: "Back to sign in" }) })] }))] }) }));
}
