import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
export default function AcceptInvite() {
    const { token } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [info, setInfo] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    useEffect(() => {
        api.auth.getInvite(token)
            .then(d => setInfo({ babyName: d.babyName, role: d.role }))
            .catch(err => setError(err instanceof ApiError ? err.message : 'Invalid invite'))
            .finally(() => setLoading(false));
    }, [token]);
    async function accept() {
        setAccepting(true);
        try {
            const { babyId } = await api.auth.acceptInvite(token);
            navigate(`/?baby=${babyId}`);
        }
        catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not accept invite');
            setAccepting(false);
        }
    }
    if (loading)
        return _jsx("div", { className: "min-h-screen flex items-center justify-center", children: _jsx("div", { className: "w-8 h-8 border-4 border-brand-400 border-t-transparent rounded-full animate-spin" }) });
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-brand-50 to-stone-50", children: _jsxs("div", { className: "w-full max-w-sm", children: [_jsx("h1", { className: "text-3xl font-bold text-center mb-8 text-brand-600", children: "babything" }), _jsx("div", { className: "card text-center space-y-4", children: error ? (_jsx("p", { className: "text-red-500", children: error })) : (_jsxs(_Fragment, { children: [_jsxs("p", { className: "text-lg font-semibold", children: ["You've been invited to care for ", _jsx("span", { className: "text-brand-600", children: info?.babyName })] }), _jsxs("p", { className: "text-stone-500 text-sm", children: ["Role: ", info?.role] }), user ? (_jsx("button", { className: "btn-primary w-full", onClick: accept, disabled: accepting, children: accepting ? 'Accepting…' : 'Accept invite' })) : (_jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-stone-500 text-sm", children: "Sign in or create an account to accept this invite." }), _jsx(Link, { to: `/login?redirect=/invite/${token}`, className: "btn-primary w-full block", children: "Sign in" }), _jsx(Link, { to: `/register?redirect=/invite/${token}`, className: "btn-ghost w-full block", children: "Create account" })] }))] })) })] }) }));
}
