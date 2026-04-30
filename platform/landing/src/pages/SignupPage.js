import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
export default function SignupPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [subdomain, setSubdomain] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    async function submit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await api.provision({ email, name, subdomain });
            setResult({ subdomain: res.tenant.subdomain, trialEndsAt: res.trialEndsAt });
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Signup failed');
        }
        finally {
            setLoading(false);
        }
    }
    if (result) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center px-6", children: _jsxs("div", { className: "card max-w-md w-full text-center space-y-4", children: [_jsx("h2", { className: "text-2xl font-bold text-stone-800", children: "You're all set!" }), _jsxs("p", { className: "text-stone-600", children: ["Your family subdomain is ", _jsxs("strong", { className: "text-brand-600", children: [result.subdomain, ".babything.app"] })] }), _jsxs("p", { className: "text-sm text-stone-500", children: ["Your 14-day free trial ends on ", new Date(result.trialEndsAt).toLocaleDateString(), "."] }), _jsx("a", { href: `https://${result.subdomain}.babything.app`, className: "btn-primary w-full inline-block", children: "Go to your subdomain" })] }) }));
    }
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center px-6", children: _jsxs("form", { onSubmit: submit, className: "card max-w-md w-full space-y-4", children: [_jsx("h2", { className: "text-2xl font-bold text-stone-800", children: "Start your free trial" }), _jsx("p", { className: "text-sm text-stone-500", children: "No credit card required. 14 days free." }), error && _jsx("p", { className: "text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg", children: error }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Email" }), _jsx("input", { type: "email", className: "input", value: email, onChange: e => setEmail(e.target.value), required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Your name" }), _jsx("input", { type: "text", className: "input", value: name, onChange: e => setName(e.target.value), required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Subdomain" }), _jsxs("div", { className: "flex", children: [_jsx("input", { type: "text", className: "input rounded-r-none", value: subdomain, onChange: e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')), placeholder: "smith", minLength: 3, required: true }), _jsx("span", { className: "px-4 py-3 bg-stone-100 border border-l-0 border-stone-200 rounded-r-xl text-sm text-stone-500", children: ".babything.app" })] })] }), _jsx("button", { type: "submit", disabled: loading, className: "btn-primary w-full", children: loading ? 'Creating…' : 'Create my subdomain' }), _jsx("button", { type: "button", onClick: () => navigate('/'), className: "btn-ghost w-full text-sm", children: "\u2190 Back" })] }) }));
}
