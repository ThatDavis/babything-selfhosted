import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectTo = searchParams.get('redirect') ?? '/';
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [oauthProviders, setOauthProviders] = useState([]);
    useEffect(() => {
        api.auth.oauthProviders().then(setOauthProviders).catch(() => { });
    }, []);
    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { user } = await api.auth.login({ email, password });
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
    function startOAuth(name) {
        window.location.href = `/api/auth/oauth/${name}/start`;
    }
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-brand-50 to-stone-50", children: _jsxs("div", { className: "w-full max-w-sm", children: [_jsx("h1", { className: "text-3xl font-bold text-center mb-2 text-brand-600", children: "babything" }), _jsx("p", { className: "text-center text-stone-500 mb-8", children: "Track your newborn together" }), oauthProviders.length > 0 && (_jsxs("div", { className: "space-y-2 mb-4", children: [oauthProviders.map(p => (_jsx("button", { onClick: () => startOAuth(p.name), className: "w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors shadow-sm", children: p.label }, p.id))), _jsxs("div", { className: "flex items-center gap-3 my-4", children: [_jsx("div", { className: "flex-1 h-px bg-stone-200" }), _jsx("span", { className: "text-xs text-stone-400", children: "or" }), _jsx("div", { className: "flex-1 h-px bg-stone-200" })] })] })), _jsxs("form", { onSubmit: handleSubmit, className: "card space-y-4", children: [error && _jsx("p", { className: "text-red-500 text-sm text-center", children: error }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Email" }), _jsx("input", { className: "input", type: "email", autoComplete: "email", required: true, value: email, onChange: e => setEmail(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Password" }), _jsx("input", { className: "input", type: "password", autoComplete: "current-password", required: true, value: password, onChange: e => setPassword(e.target.value) })] }), _jsx("div", { className: "flex justify-end", children: _jsx(Link, { to: "/forgot-password", className: "text-xs text-stone-400 hover:text-brand-600 transition-colors", children: "Forgot password?" }) }), _jsx("button", { className: "btn-primary w-full", type: "submit", disabled: loading, children: loading ? 'Signing in…' : 'Sign in' })] }), _jsxs("p", { className: "text-center text-sm text-stone-500 mt-6", children: ["No account? ", _jsx(Link, { to: redirectTo !== '/' ? `/register?redirect=${encodeURIComponent(redirectTo)}` : '/register', className: "text-brand-600 font-medium", children: "Create one" })] })] }) }));
}
