import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useUnits } from '../contexts/UnitsContext';
const isDev = import.meta.env.DEV;
export default function AdminSettings() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [section, setSection] = useState('general');
    if (!user?.isAdmin) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center", children: _jsx("p", { className: "text-stone-500", children: "Access denied." }) }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-stone-50", children: [_jsxs("header", { className: "bg-white border-b border-stone-100 px-6 py-4 flex items-center gap-4", children: [_jsx("button", { onClick: () => navigate('/'), className: "text-stone-400 hover:text-stone-600", children: "\u2190 Back" }), _jsx("h1", { className: "text-xl font-bold text-brand-600", children: "Admin Settings" })] }), _jsxs("div", { className: "max-w-3xl mx-auto p-6 space-y-4", children: [_jsx("div", { className: "flex gap-2 border-b border-stone-200 pb-2 flex-wrap", children: ['general', 'stream', 'smtp', 'oauth', 'users', ...(isDev ? ['dev'] : [])].map(s => (_jsx("button", { onClick: () => setSection(s), className: `px-4 py-2 rounded-t-lg text-sm font-medium capitalize transition-colors ${section === s ? 'bg-white border border-b-white border-stone-200 -mb-px text-brand-600' : 'text-stone-500 hover:text-stone-700'}`, children: s === 'general' ? 'General' : s === 'stream' ? 'Monitor' : s === 'smtp' ? 'SMTP Email' : s === 'oauth' ? 'OAuth Providers' : s === 'users' ? 'Users' : 'Developer' }, s))) }), section === 'general' && _jsx(GeneralSection, {}), section === 'stream' && _jsx(StreamSection, {}), section === 'smtp' && _jsx(SmtpSection, {}), section === 'oauth' && _jsx(OAuthSection, {}), section === 'users' && _jsx(UsersSection, {}), section === 'dev' && _jsx(DevSection, {})] })] }));
}
function GeneralSection() {
    const { unitSystem, setUnitSystem } = useUnits();
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null);
    async function save(system) {
        setSaving(true);
        setMsg(null);
        try {
            await api.settings.save({ unitSystem: system });
            setUnitSystem(system);
            setMsg({ ok: true, text: 'Saved.' });
        }
        catch (err) {
            setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Save failed' });
        }
        finally {
            setSaving(false);
        }
    }
    return (_jsxs("div", { className: "card space-y-5", children: [_jsx("h2", { className: "font-semibold text-stone-700", children: "General Settings" }), msg && _jsx("p", { className: `text-sm ${msg.ok ? 'text-green-600' : 'text-red-500'}`, children: msg.text }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium mb-3", children: "Unit system" }), _jsx("div", { className: "grid grid-cols-2 gap-3 max-w-sm", children: ['metric', 'imperial'].map(s => (_jsxs("button", { onClick: () => save(s), disabled: saving, className: `py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-colors ${unitSystem === s ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-stone-200 text-stone-600 hover:border-stone-300'}`, children: [s === 'metric' ? '🌍 Metric' : '🇺🇸 Imperial', _jsx("p", { className: "text-xs font-normal mt-0.5 opacity-70", children: s === 'metric' ? 'kg, cm' : 'lbs, oz, in' })] }, s))) })] })] }));
}
function StreamSection() {
    const { streamEnabled, setStreamEnabled } = useUnits();
    const [streamUrl, setStreamUrl] = useState('');
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null);
    useEffect(() => {
        api.settings.get().then(s => setStreamUrl(s.streamUrl)).catch(() => { });
    }, []);
    async function toggle(enabled) {
        setSaving(true);
        setMsg(null);
        try {
            await api.settings.save({ streamEnabled: enabled });
            setStreamEnabled(enabled);
            setMsg({ ok: true, text: 'Saved.' });
        }
        catch (err) {
            setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Save failed' });
        }
        finally {
            setSaving(false);
        }
    }
    return (_jsxs("div", { className: "card space-y-5", children: [_jsx("h2", { className: "font-semibold text-stone-700", children: "Baby Monitor" }), msg && _jsx("p", { className: `text-sm ${msg.ok ? 'text-green-600' : 'text-red-500'}`, children: msg.text }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium", children: "Show Monitor tab" }), _jsx("p", { className: "text-xs text-stone-400 mt-0.5", children: "Displays the live camera feed to all caregivers" })] }), _jsx("button", { onClick: () => toggle(!streamEnabled), disabled: saving, className: `relative w-11 h-6 rounded-full transition-colors ${streamEnabled ? 'bg-brand-500' : 'bg-stone-300'}`, children: _jsx("span", { className: `absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${streamEnabled ? 'translate-x-6' : 'translate-x-1'}` }) })] }), _jsxs("div", { className: "p-4 bg-stone-50 rounded-xl space-y-3 text-sm", children: [_jsx("p", { className: "font-medium text-stone-700", children: "RTSP stream URL" }), _jsx("div", { className: "font-mono text-xs bg-white border border-stone-200 rounded-lg px-3 py-2 break-all text-stone-600 min-h-[2rem]", children: streamUrl || _jsx("span", { className: "text-stone-400 italic", children: "Not configured \u2014 set CAMERA_RTSP_URL in .env" }) }), _jsxs("p", { className: "text-xs text-stone-400 leading-relaxed", children: ["The stream URL is set via ", _jsx("code", { className: "bg-stone-200 px-1 rounded", children: "CAMERA_RTSP_URL" }), " in your ", _jsx("code", { className: "bg-stone-200 px-1 rounded", children: ".env" }), " file. Restart the stack after changing it (", _jsx("code", { className: "bg-stone-200 px-1 rounded", children: "docker compose restart mediamtx" }), ")."] }), _jsxs("div", { className: "text-xs text-stone-400 leading-relaxed space-y-1 pt-1 border-t border-stone-200", children: [_jsx("p", { className: "font-medium text-stone-500", children: "UniFi Protect setup:" }), _jsxs("ol", { className: "list-decimal list-inside space-y-0.5 ml-1", children: [_jsx("li", { children: "Open UniFi Protect \u2192 select your G4 Instant \u2192 Settings \u2192 General" }), _jsxs("li", { children: ["Enable ", _jsx("strong", { children: "RTSP stream" }), " and copy the URL"] }), _jsxs("li", { children: ["Paste it as ", _jsx("code", { className: "bg-stone-200 px-1 rounded", children: "CAMERA_RTSP_URL" }), " in ", _jsx("code", { className: "bg-stone-200 px-1 rounded", children: ".env" })] })] })] })] })] }));
}
function SmtpSection() {
    const { user } = useAuth();
    const [form, setForm] = useState({ host: '', port: 587, secure: false, user: '', password: '', fromEmail: '', fromName: 'Babything', enabled: true });
    const [testEmail, setTestEmail] = useState(user?.email ?? '');
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [msg, setMsg] = useState(null);
    useEffect(() => {
        api.admin.getSmtp().then(cfg => {
            if (cfg)
                setForm({ host: cfg.host, port: cfg.port, secure: cfg.secure, user: cfg.user, password: '', fromEmail: cfg.fromEmail, fromName: cfg.fromName, enabled: cfg.enabled });
        }).catch(() => { });
    }, []);
    async function save(e) {
        e.preventDefault();
        setSaving(true);
        setMsg(null);
        try {
            await api.admin.saveSmtp(form);
            setMsg({ ok: true, text: 'Saved.' });
        }
        catch (err) {
            setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Save failed' });
        }
        finally {
            setSaving(false);
        }
    }
    async function test() {
        setTesting(true);
        setMsg(null);
        try {
            await api.admin.testSmtp(testEmail);
            setMsg({ ok: true, text: `Test email sent to ${testEmail}` });
        }
        catch (err) {
            setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Test failed' });
        }
        finally {
            setTesting(false);
        }
    }
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
    return (_jsxs("form", { onSubmit: save, className: "card space-y-4", children: [_jsx("h2", { className: "font-semibold text-stone-700", children: "SMTP Configuration" }), msg && _jsx("p", { className: `text-sm ${msg.ok ? 'text-green-600' : 'text-red-500'}`, children: msg.text }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { className: "col-span-2 sm:col-span-1", children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Host" }), _jsx("input", { className: "input", value: form.host, onChange: e => set('host', e.target.value), placeholder: "smtp.example.com", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Port" }), _jsx("input", { className: "input", type: "number", value: form.port, onChange: e => set('port', Number(e.target.value)), required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Username" }), _jsx("input", { className: "input", value: form.user, onChange: e => set('user', e.target.value), required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Password" }), _jsx("input", { className: "input", type: "password", value: form.password, onChange: e => set('password', e.target.value), placeholder: "Leave blank to keep existing" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "From Email" }), _jsx("input", { className: "input", type: "email", value: form.fromEmail, onChange: e => set('fromEmail', e.target.value), required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "From Name" }), _jsx("input", { className: "input", value: form.fromName, onChange: e => set('fromName', e.target.value), required: true })] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("label", { className: "flex items-center gap-2 text-sm cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: form.secure, onChange: e => set('secure', e.target.checked), className: "rounded" }), "Use TLS (port 465)"] }), _jsxs("label", { className: "flex items-center gap-2 text-sm cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: form.enabled, onChange: e => set('enabled', e.target.checked), className: "rounded" }), "Enabled"] })] }), _jsxs("div", { className: "flex flex-wrap gap-2 pt-2 border-t border-stone-100", children: [_jsx("button", { type: "submit", className: "btn-primary", disabled: saving, children: saving ? 'Saving…' : 'Save' }), _jsxs("div", { className: "flex gap-2 items-center ml-auto", children: [_jsx("input", { className: "input w-48", type: "email", value: testEmail, onChange: e => setTestEmail(e.target.value), placeholder: "test@example.com" }), _jsx("button", { type: "button", onClick: test, className: "btn-ghost border border-stone-200", disabled: testing, children: testing ? 'Sending…' : 'Send test' })] })] })] }));
}
function OAuthSection() {
    const [providers, setProviders] = useState([]);
    const [editing, setEditing] = useState(null);
    const [adding, setAdding] = useState(false);
    const reload = () => api.admin.getOAuthProviders().then(setProviders).catch(() => { });
    useEffect(() => { reload(); }, []);
    async function remove(id) {
        if (!confirm('Delete this provider?'))
            return;
        await api.admin.deleteOAuthProvider(id).catch(() => { });
        reload();
    }
    if (editing)
        return _jsx(OAuthForm, { provider: editing, onDone: () => { setEditing(null); reload(); } });
    if (adding)
        return _jsx(OAuthForm, { onDone: () => { setAdding(false); reload(); } });
    return (_jsxs("div", { className: "card space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "font-semibold text-stone-700", children: "OAuth Providers" }), _jsx("button", { className: "btn-primary text-sm", onClick: () => setAdding(true), children: "+ Add provider" })] }), providers.length === 0 && _jsx("p", { className: "text-stone-400 text-sm", children: "No providers configured." }), _jsx("div", { className: "space-y-2", children: providers.map(p => (_jsxs("div", { className: "flex items-center justify-between p-3 bg-stone-50 rounded-xl", children: [_jsxs("div", { children: [_jsxs("p", { className: "font-medium text-sm", children: [p.label, " ", _jsxs("span", { className: "text-stone-400 font-normal", children: ["(", p.name, ")"] })] }), _jsxs("p", { className: "text-xs text-stone-400", children: [p.enabled ? 'Enabled' : 'Disabled', " \u00B7 scope: ", p.scope] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { className: "btn-ghost text-sm border border-stone-200", onClick: () => setEditing(p), children: "Edit" }), _jsx("button", { className: "btn-ghost text-sm text-red-500 border border-red-100", onClick: () => remove(p.id), children: "Delete" })] })] }, p.id))) })] }));
}
function OAuthForm({ provider, onDone }) {
    const blank = { name: '', label: '', clientId: '', clientSecret: '', authorizationUrl: '', tokenUrl: '', userInfoUrl: '', scope: 'openid email profile', enabled: true };
    const [form, setForm] = useState(provider ? { name: provider.name, label: provider.label, clientId: provider.clientId, clientSecret: '', authorizationUrl: provider.authorizationUrl, tokenUrl: provider.tokenUrl, userInfoUrl: provider.userInfoUrl, scope: provider.scope, enabled: provider.enabled } : blank);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
    async function save(e) {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            if (provider)
                await api.admin.updateOAuthProvider(provider.id, form);
            else
                await api.admin.createOAuthProvider(form);
            onDone();
        }
        catch (err) {
            setError(err instanceof ApiError ? err.message : 'Save failed');
            setSaving(false);
        }
    }
    return (_jsxs("form", { onSubmit: save, className: "card space-y-4", children: [_jsxs("h2", { className: "font-semibold text-stone-700", children: [provider ? 'Edit' : 'Add', " OAuth Provider"] }), error && _jsx("p", { className: "text-red-500 text-sm", children: error }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Name (slug)" }), _jsx("input", { className: "input", value: form.name, onChange: e => set('name', e.target.value), placeholder: "google", required: true, disabled: !!provider })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Label" }), _jsx("input", { className: "input", value: form.label, onChange: e => set('label', e.target.value), placeholder: "Sign in with Google", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Client ID" }), _jsx("input", { className: "input", value: form.clientId, onChange: e => set('clientId', e.target.value), required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Client Secret" }), _jsx("input", { className: "input", value: form.clientSecret, onChange: e => set('clientSecret', e.target.value), placeholder: provider ? 'Leave blank to keep existing' : '', required: !provider })] }), _jsxs("div", { className: "col-span-2", children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Authorization URL" }), _jsx("input", { className: "input", type: "url", value: form.authorizationUrl, onChange: e => set('authorizationUrl', e.target.value), placeholder: "https://accounts.google.com/o/oauth2/v2/auth", required: true })] }), _jsxs("div", { className: "col-span-2", children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Token URL" }), _jsx("input", { className: "input", type: "url", value: form.tokenUrl, onChange: e => set('tokenUrl', e.target.value), placeholder: "https://oauth2.googleapis.com/token", required: true })] }), _jsxs("div", { className: "col-span-2", children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "User Info URL" }), _jsx("input", { className: "input", type: "url", value: form.userInfoUrl, onChange: e => set('userInfoUrl', e.target.value), placeholder: "https://openidconnect.googleapis.com/v1/userinfo", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Scope" }), _jsx("input", { className: "input", value: form.scope, onChange: e => set('scope', e.target.value), required: true })] }), _jsx("div", { className: "flex items-end pb-1", children: _jsxs("label", { className: "flex items-center gap-2 text-sm cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: form.enabled, onChange: e => set('enabled', e.target.checked), className: "rounded" }), "Enabled"] }) })] }), _jsxs("div", { className: "flex gap-2 pt-2 border-t border-stone-100", children: [_jsx("button", { type: "submit", className: "btn-primary", disabled: saving, children: saving ? 'Saving…' : 'Save' }), _jsx("button", { type: "button", className: "btn-ghost border border-stone-200", onClick: onDone, children: "Cancel" })] })] }));
}
function UsersSection() {
    const { user: me } = useAuth();
    const [users, setUsers] = useState([]);
    const [allBabies, setAllBabies] = useState([]);
    const [expanded, setExpanded] = useState(null);
    const reload = () => Promise.all([
        api.admin.getUsers().then(setUsers),
        api.admin.getBabies().then(setAllBabies),
    ]).catch(() => { });
    useEffect(() => { reload(); }, []);
    async function toggleAdmin(u) {
        if (u.id === me?.id)
            return;
        await api.admin.setAdmin(u.id, !u.isAdmin).catch(() => { });
        reload();
    }
    async function deleteUser(u) {
        if (!confirm(`Delete "${u.name}" (${u.email})? This cannot be undone.`))
            return;
        try {
            await api.admin.deleteUser(u.id);
            reload();
        }
        catch (err) {
            alert(err instanceof ApiError ? err.message : 'Delete failed');
        }
    }
    return (_jsxs("div", { className: "card space-y-3", children: [_jsx("h2", { className: "font-semibold text-stone-700", children: "Users" }), users.length === 0 && _jsx("p", { className: "text-sm text-stone-400", children: "No users found." }), users.map(u => (_jsxs("div", { className: "border border-stone-200 rounded-xl overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between p-3 bg-stone-50", children: [_jsxs("button", { className: "flex-1 text-left", onClick: () => setExpanded(expanded === u.id ? null : u.id), children: [_jsxs("p", { className: "font-medium text-sm", children: [u.name, " ", _jsx("span", { className: "text-stone-400 font-normal", children: u.email })] }), _jsxs("p", { className: "text-xs text-stone-400", children: [u.oauthProvider ? `OAuth: ${u.oauthProvider}` : 'Password', ' · ', "Joined ", new Date(u.createdAt).toLocaleDateString(), ' · ', u.babies.length, " ", u.babies.length === 1 ? 'baby' : 'babies'] })] }), _jsxs("div", { className: "flex items-center gap-2 ml-3 shrink-0", children: [_jsx("button", { onClick: () => toggleAdmin(u), disabled: u.id === me?.id, className: `text-xs px-3 py-1 rounded-full font-medium transition-colors ${u.isAdmin ? 'bg-brand-100 text-brand-700 hover:bg-brand-200' : 'bg-stone-200 text-stone-600 hover:bg-stone-300'} disabled:opacity-40 disabled:cursor-not-allowed`, children: u.isAdmin ? 'Admin' : 'User' }), _jsx("button", { onClick: () => setExpanded(expanded === u.id ? null : u.id), className: "text-stone-400 text-sm w-6 text-center", children: expanded === u.id ? '▲' : '▼' })] })] }), expanded === u.id && (_jsxs("div", { className: "p-3 space-y-3 border-t border-stone-200 bg-white", children: [_jsx(UserBabyManager, { u: u, allBabies: allBabies, onChanged: reload }), u.id !== me?.id && (_jsx("div", { className: "pt-2 border-t border-stone-100", children: _jsx("button", { onClick: () => deleteUser(u), className: "text-xs text-red-500 hover:text-red-700 font-medium transition-colors", children: "Delete user account" }) }))] }))] }, u.id)))] }));
}
function UserBabyManager({ u, allBabies, onChanged }) {
    const [selectedBaby, setSelectedBaby] = useState('');
    const [role, setRole] = useState('CAREGIVER');
    const [working, setWorking] = useState(false);
    const assignedIds = new Set(u.babies.map(b => b.babyId));
    const available = allBabies.filter(b => !assignedIds.has(b.id));
    async function assign() {
        if (!selectedBaby)
            return;
        setWorking(true);
        try {
            await api.admin.assignBaby(u.id, selectedBaby, role);
            setSelectedBaby('');
            onChanged();
        }
        catch (err) {
            alert(err instanceof ApiError ? err.message : 'Failed to assign');
        }
        finally {
            setWorking(false);
        }
    }
    async function remove(babyId, babyName) {
        if (!confirm(`Remove ${u.name} from "${babyName}"?`))
            return;
        setWorking(true);
        try {
            await api.admin.removeBaby(u.id, babyId);
            onChanged();
        }
        catch (err) {
            alert(err instanceof ApiError ? err.message : 'Failed to remove');
        }
        finally {
            setWorking(false);
        }
    }
    return (_jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-xs font-semibold text-stone-500 uppercase tracking-wide", children: "Baby access" }), u.babies.length === 0
                ? _jsx("p", { className: "text-xs text-stone-400", children: "No babies assigned." })
                : u.babies.map(b => (_jsxs("div", { className: "flex items-center justify-between py-1", children: [_jsxs("span", { className: "text-sm", children: [b.babyName, " ", _jsx("span", { className: "text-xs text-stone-400", children: b.role })] }), _jsx("button", { onClick: () => remove(b.babyId, b.babyName), disabled: working, className: "text-xs text-stone-300 hover:text-red-400 transition-colors", children: "Remove" })] }, b.babyId))), available.length > 0 && (_jsxs("div", { className: "flex gap-2 pt-1", children: [_jsxs("select", { className: "input text-sm flex-1", value: selectedBaby, onChange: e => setSelectedBaby(e.target.value), children: [_jsx("option", { value: "", children: "Add to baby\u2026" }), available.map(b => _jsx("option", { value: b.id, children: b.name }, b.id))] }), _jsxs("select", { className: "input text-sm w-32", value: role, onChange: e => setRole(e.target.value), children: [_jsx("option", { value: "CAREGIVER", children: "Caregiver" }), _jsx("option", { value: "OWNER", children: "Owner" })] }), _jsx("button", { onClick: assign, disabled: !selectedBaby || working, className: "btn-primary text-sm px-3", children: "Add" })] }))] }));
}
function DevSection() {
    const [seeding, setSeeding] = useState(false);
    const [result, setResult] = useState(null);
    async function seed() {
        if (!confirm('Create a "Test Baby" with 3 months of sample data? This cannot be undone.'))
            return;
        setSeeding(true);
        setResult(null);
        try {
            const r = await api.admin.seedTestData();
            setResult({ ok: true, text: `Created "${r.babyName}" with feedings, diapers, sleep, growth, vaccines, medications, appointments, and milestones. Reload the home page to see it.` });
        }
        catch (err) {
            setResult({ ok: false, text: err instanceof ApiError ? err.message : 'Seed failed.' });
        }
        finally {
            setSeeding(false);
        }
    }
    return (_jsxs("div", { className: "card space-y-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "font-semibold text-stone-700", children: "Developer Tools" }), _jsx("p", { className: "text-xs text-stone-400 mt-1", children: "These options are intended for testing only and should not be used in production." })] }), result && (_jsx("p", { className: `text-sm px-3 py-2 rounded-xl ${result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`, children: result.text })), _jsxs("div", { className: "p-4 border border-dashed border-stone-300 rounded-xl space-y-2", children: [_jsx("p", { className: "text-sm font-medium text-stone-700", children: "Seed test data" }), _jsx("p", { className: "text-xs text-stone-400", children: "Creates a baby named \"Test Baby\" (female, ~3 months old) and populates it with realistic sample data: 3 days of feedings, diapers, and sleep; growth measurements across 3 months; vaccines and appointments; medications and milestones." }), _jsx("button", { onClick: seed, disabled: seeding, className: "btn-primary text-sm mt-1", children: seeding ? (_jsxs("span", { className: "flex items-center gap-2", children: [_jsx("span", { className: "w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" }), "Creating\u2026"] })) : 'Create test baby' })] })] }));
}
