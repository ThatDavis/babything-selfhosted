import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
export default function AccountPage() {
    const [params] = useSearchParams();
    const subdomain = params.get('subdomain') ?? '';
    const [tenant, setTenant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        if (!subdomain) {
            setLoading(false);
            return;
        }
        api.tenantStatus(subdomain)
            .then(t => setTenant({ status: t.status, trialEndsAt: t.trialEndsAt }))
            .catch(err => setError(err instanceof Error ? err.message : 'Failed to load'))
            .finally(() => setLoading(false));
    }, [subdomain]);
    if (loading)
        return _jsx("div", { className: "min-h-screen flex items-center justify-center", children: _jsx("div", { className: "w-8 h-8 border-4 border-brand-400 border-t-transparent rounded-full animate-spin" }) });
    if (!subdomain || error)
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center px-6", children: _jsx("div", { className: "card max-w-md w-full text-center", children: _jsx("p", { className: "text-red-500", children: error || 'No subdomain provided.' }) }) }));
    return (_jsx("div", { className: "min-h-screen px-6 py-12", children: _jsxs("div", { className: "max-w-md mx-auto card space-y-6", children: [_jsx("h1", { className: "text-2xl font-bold text-stone-800", children: "Account" }), _jsxs("div", { className: "space-y-2 text-sm", children: [_jsxs("p", { children: [_jsx("span", { className: "text-stone-500", children: "Subdomain:" }), " ", _jsxs("strong", { children: [subdomain, ".babything.app"] })] }), _jsxs("p", { children: [_jsx("span", { className: "text-stone-500", children: "Status:" }), " ", _jsx("span", { className: `font-semibold ${tenant?.status === 'ACTIVE' ? 'text-green-600' : tenant?.status === 'SUSPENDED' ? 'text-red-500' : 'text-amber-500'}`, children: tenant?.status })] }), tenant?.trialEndsAt && (_jsxs("p", { children: [_jsx("span", { className: "text-stone-500", children: "Trial ends:" }), " ", new Date(tenant.trialEndsAt).toLocaleDateString()] }))] }), _jsxs("div", { className: "pt-4 border-t border-stone-100 space-y-3", children: [_jsx("button", { className: "btn-primary w-full text-sm", onClick: () => alert('Stripe Customer Portal coming soon'), children: "Update payment method" }), _jsx("button", { className: "btn-ghost w-full text-sm border border-stone-200", onClick: () => alert('Cancellation coming soon'), children: "Cancel subscription" })] })] }) }));
}
