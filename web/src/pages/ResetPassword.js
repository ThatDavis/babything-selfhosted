import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
export default function ResetPassword() {
    const { token } = useParams();
    const [email, setEmail] = useState('');
    const [valid, setValid] = useState(null);
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        if (!token) {
            setValid(false);
            return;
        }
        api.auth.checkResetToken(token)
            .then(r => { setValid(r.valid); setEmail(r.email); })
            .catch(() => setValid(false));
    }, [token]);
    async function handleSubmit(e) {
        e.preventDefault();
        if (password !== confirm) {
            setError('Passwords do not match');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await api.auth.resetPassword(token, password);
            setDone(true);
        }
        catch (err) {
            setError(err instanceof ApiError ? err.message : 'Something went wrong');
        }
        finally {
            setLoading(false);
        }
    }
    if (valid === null) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center", children: _jsx("div", { className: "w-8 h-8 border-4 border-brand-400 border-t-transparent rounded-full animate-spin" }) }));
    }
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-brand-50 to-stone-50", children: _jsxs("div", { className: "w-full max-w-sm", children: [_jsx("h1", { className: "text-3xl font-bold text-center mb-2 text-brand-600", children: "babything" }), _jsx("p", { className: "text-center text-stone-500 mb-8", children: "Set a new password" }), !valid ? (_jsxs("div", { className: "card text-center space-y-3", children: [_jsx("p", { className: "text-2xl", children: "\u26D4" }), _jsx("p", { className: "font-medium", children: "Link expired or invalid" }), _jsx("p", { className: "text-stone-500 text-sm", children: "This reset link has expired or already been used." }), _jsx(Link, { to: "/forgot-password", className: "block text-brand-600 text-sm font-medium", children: "Request a new link" })] })) : done ? (_jsxs("div", { className: "card text-center space-y-3", children: [_jsx("p", { className: "text-2xl", children: "\u2705" }), _jsx("p", { className: "font-medium", children: "Password updated" }), _jsx("p", { className: "text-stone-500 text-sm", children: "Your password has been changed. You can now sign in." }), _jsx(Link, { to: "/login", className: "block text-brand-600 text-sm font-medium", children: "Sign in" })] })) : (_jsxs("form", { onSubmit: handleSubmit, className: "card space-y-4", children: [email && _jsxs("p", { className: "text-sm text-stone-500 text-center", children: ["Resetting password for ", _jsx("strong", { children: email })] }), error && _jsx("p", { className: "text-red-500 text-sm text-center", children: error }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "New password" }), _jsx("input", { className: "input", type: "password", autoComplete: "new-password", minLength: 8, required: true, value: password, onChange: e => setPassword(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Confirm password" }), _jsx("input", { className: "input", type: "password", autoComplete: "new-password", required: true, value: confirm, onChange: e => setConfirm(e.target.value) })] }), _jsx("button", { className: "btn-primary w-full", type: "submit", disabled: loading, children: loading ? 'Saving…' : 'Set new password' })] }))] }) }));
}
