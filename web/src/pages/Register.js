import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
export default function Register() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectTo = searchParams.get('redirect') ?? '/';
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { user } = await api.auth.register({ name, email, password });
            login(user);
            navigate(redirectTo, { replace: true });
        }
        catch (err) {
            setError(err instanceof ApiError ? err.message : 'Something went wrong');
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-brand-50 to-stone-50", children: _jsxs("div", { className: "w-full max-w-sm", children: [_jsx("h1", { className: "text-3xl font-bold text-center mb-2 text-brand-600", children: "babything" }), _jsx("p", { className: "text-center text-stone-500 mb-8", children: "Create your account" }), _jsxs("form", { onSubmit: handleSubmit, className: "card space-y-4", children: [error && _jsx("p", { className: "text-red-500 text-sm text-center", children: error }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Name" }), _jsx("input", { className: "input", type: "text", autoComplete: "name", required: true, value: name, onChange: e => setName(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Email" }), _jsx("input", { className: "input", type: "email", autoComplete: "email", required: true, value: email, onChange: e => setEmail(e.target.value) })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium mb-1", children: ["Password ", _jsx("span", { className: "text-stone-400 font-normal", children: "(8+ chars)" })] }), _jsx("input", { className: "input", type: "password", autoComplete: "new-password", minLength: 8, required: true, value: password, onChange: e => setPassword(e.target.value) })] }), _jsx("button", { className: "btn-primary w-full", type: "submit", disabled: loading, children: loading ? 'Creating account…' : 'Create account' })] }), _jsxs("p", { className: "text-center text-sm text-stone-500 mt-6", children: ["Already have an account? ", _jsx(Link, { to: redirectTo !== '/' ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login', className: "text-brand-600 font-medium", children: "Sign in" })] })] }) }));
}
