import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
function GoogleIcon() {
    return (_jsxs("svg", { className: "w-5 h-5", viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg", children: [_jsx("path", { d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z", fill: "#4285F4" }), _jsx("path", { d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z", fill: "#34A853" }), _jsx("path", { d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z", fill: "#FBBC05" }), _jsx("path", { d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z", fill: "#EA4335" })] }));
}
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
    const [googleEnabled, setGoogleEnabled] = useState(false);
    useEffect(() => {
        api.auth.config().then(c => setGoogleEnabled(c.googleEnabled)).catch(() => { });
    }, []);
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
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-brand-50 to-stone-50", children: _jsxs("div", { className: "w-full max-w-sm", children: [_jsx("h1", { className: "text-3xl font-bold text-center mb-2 text-brand-600", children: "babything" }), _jsx("p", { className: "text-center text-stone-500 mb-8", children: "Create your account" }), googleEnabled && (_jsxs("div", { className: "space-y-2 mb-4", children: [_jsxs("button", { onClick: () => { window.location.href = '/api/auth/oauth/google/start'; }, className: "w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors shadow-sm", children: [_jsx(GoogleIcon, {}), "Sign up with Google"] }), _jsxs("div", { className: "flex items-center gap-3 my-4", children: [_jsx("div", { className: "flex-1 h-px bg-stone-200" }), _jsx("span", { className: "text-xs text-stone-400", children: "or" }), _jsx("div", { className: "flex-1 h-px bg-stone-200" })] })] })), _jsxs("form", { onSubmit: handleSubmit, className: "card space-y-4", children: [error && _jsx("p", { className: "text-red-500 text-sm text-center", children: error }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Name" }), _jsx("input", { className: "input", type: "text", autoComplete: "name", required: true, value: name, onChange: e => setName(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Email" }), _jsx("input", { className: "input", type: "email", autoComplete: "email", required: true, value: email, onChange: e => setEmail(e.target.value) })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium mb-1", children: ["Password ", _jsx("span", { className: "text-stone-400 font-normal", children: "(8+ chars)" })] }), _jsx("input", { className: "input", type: "password", autoComplete: "new-password", minLength: 8, required: true, value: password, onChange: e => setPassword(e.target.value) })] }), _jsx("button", { className: "btn-primary w-full", type: "submit", disabled: loading, children: loading ? 'Creating account…' : 'Create account' })] }), _jsxs("p", { className: "text-center text-sm text-stone-500 mt-6", children: ["Already have an account? ", _jsx(Link, { to: redirectTo !== '/' ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login', className: "text-brand-600 font-medium", children: "Sign in" })] })] }) }));
}
