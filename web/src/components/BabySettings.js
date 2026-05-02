import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import ReportModal from './ReportModal';
export default function BabySettings({ baby, caregivers, onClose, onDeleted, onCaregiversChanged }) {
    const { user } = useAuth();
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteLink, setInviteLink] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [exportFrom, setExportFrom] = useState('');
    const [exportTo, setExportTo] = useState('');
    const [exporting, setExporting] = useState(false);
    const [exportMsg, setExportMsg] = useState(null);
    const isOwner = baby.role === 'OWNER';
    async function generateInvite() {
        if (!inviteEmail)
            return;
        setError('');
        setLoading(true);
        try {
            const { inviteToken } = await api.auth.invite({ babyId: baby.id, email: inviteEmail });
            const url = `${window.location.origin}/invite/${inviteToken}`;
            setInviteLink(url);
            setInviteEmail('');
        }
        catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to generate invite');
        }
        finally {
            setLoading(false);
        }
    }
    async function removeCaregiver(userId) {
        await api.babies.removeCaregiver(baby.id, userId);
        onCaregiversChanged();
    }
    async function deleteBaby() {
        setDeleting(true);
        try {
            await api.babies.delete(baby.id);
            onDeleted();
        }
        catch (err) {
            setError(err instanceof ApiError ? err.message : 'Failed to delete baby');
            setDeleting(false);
        }
    }
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "sheet-overlay", onClick: onClose }), _jsxs("div", { className: "sheet space-y-5 overflow-y-auto max-h-[80vh]", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("h2", { className: "text-lg font-bold", children: [baby.name, " \u2014 Settings"] }), _jsx("button", { onClick: onClose, className: "text-stone-400 text-2xl leading-none", children: "\u00D7" })] }), error && _jsx("p", { className: "text-red-500 text-sm", children: error }), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-semibold text-stone-500 mb-2", children: "Caregivers" }), _jsx("div", { className: "space-y-2", children: caregivers.map(c => (_jsxs("div", { className: "flex items-center justify-between py-2 px-3 rounded-2xl bg-stone-50", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-sm font-medium", children: [c.user.name, " ", c.userId === user?.id && _jsx("span", { className: "text-stone-400", children: "(you)" })] }), _jsxs("p", { className: "text-xs text-stone-400", children: [c.user.email, " \u00B7 ", c.role] })] }), isOwner && c.userId !== user?.id && (_jsx("button", { onClick: () => removeCaregiver(c.userId), className: "text-xs text-red-400 hover:text-red-600 font-medium", children: "Remove" }))] }, c.userId))) })] }), isOwner && (_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-semibold text-stone-500 mb-2", children: "Invite caregiver" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { className: "input flex-1", type: "email", placeholder: "partner@email.com", value: inviteEmail, onChange: e => setInviteEmail(e.target.value) }), _jsx("button", { className: "btn-primary px-4 py-2 text-sm", onClick: generateInvite, disabled: loading || !inviteEmail, children: loading ? '…' : 'Invite' })] }), inviteLink && (_jsxs("div", { className: "mt-2 p-3 bg-stone-50 rounded-xl", children: [_jsx("p", { className: "text-xs text-stone-500 mb-1", children: "Share this link (expires in 7 days):" }), _jsx("p", { className: "text-xs font-mono break-all text-brand-600", children: inviteLink }), _jsx("button", { className: "text-xs text-stone-400 mt-1 hover:text-stone-600", onClick: () => { navigator.clipboard.writeText(inviteLink); }, children: "Copy to clipboard" })] }))] })), _jsxs("div", { className: "border-t border-stone-100 pt-4", children: [_jsx("h3", { className: "text-sm font-semibold text-stone-500 mb-2", children: "Pediatric Report" }), _jsxs("p", { className: "text-xs text-stone-400 mb-3", children: ["Generate a formatted PDF for sharing with ", baby.name, "'s doctor \u2014 includes growth, vaccines, medications, and more."] }), _jsx("button", { onClick: () => setShowReport(true), className: "btn-primary w-full text-sm", children: "Generate report\u2026" })] }), _jsxs("div", { className: "border-t border-stone-100 pt-4", children: [_jsx("h3", { className: "text-sm font-semibold text-stone-500 mb-2", children: "Export Data" }), _jsxs("p", { className: "text-xs text-stone-400 mb-3", children: ["Download a ZIP of all tracking data for ", baby.name, " as CSV files."] }), exportMsg && (_jsx("p", { className: `text-sm px-3 py-2 rounded-xl mb-3 ${exportMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`, children: exportMsg.text })), _jsxs("div", { className: "space-y-2 mb-3", children: [_jsxs("div", { className: "flex gap-2 items-center", children: [_jsx("label", { className: "text-xs text-stone-500 w-10", children: "From" }), _jsx("input", { type: "date", className: "input flex-1 text-sm", value: exportFrom, onChange: e => setExportFrom(e.target.value), max: new Date().toISOString().split('T')[0] })] }), _jsxs("div", { className: "flex gap-2 items-center", children: [_jsx("label", { className: "text-xs text-stone-500 w-10", children: "To" }), _jsx("input", { type: "date", className: "input flex-1 text-sm", value: exportTo, onChange: e => setExportTo(e.target.value), max: new Date().toISOString().split('T')[0] })] }), !exportFrom && !exportTo && (_jsx("p", { className: "text-xs text-stone-400", children: "No dates selected \u2014 all records will be exported." }))] }), _jsx("button", { onClick: async () => {
                                    setExporting(true);
                                    setExportMsg(null);
                                    try {
                                        const blob = await api.reports.export(baby.id, { from: exportFrom || undefined, to: exportTo || undefined });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `${baby.name.replace(/\s+/g, '_')}_export_${new Date().toISOString().split('T')[0]}.zip`;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                        setExportMsg({ ok: true, text: 'Export downloaded.' });
                                    }
                                    catch (err) {
                                        setExportMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Export failed.' });
                                    }
                                    finally {
                                        setExporting(false);
                                    }
                                }, disabled: exporting, className: "btn-primary w-full text-sm flex items-center justify-center gap-2", children: exporting ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" }), "Exporting\u2026"] })) : ('↓  Download CSV Export') })] }), isOwner && (_jsx("div", { className: "border-t border-stone-100 pt-4", children: !confirmDelete ? (_jsxs("button", { onClick: () => setConfirmDelete(true), className: "text-sm text-red-400 hover:text-red-600 font-medium", children: ["Delete ", baby.name, "\u2026"] })) : (_jsxs("div", { className: "space-y-2", children: [_jsxs("p", { className: "text-sm text-red-600 font-medium", children: ["This will permanently delete all data for ", baby.name, ". Are you sure?"] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: deleteBaby, disabled: deleting, className: "flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold", children: deleting ? 'Deleting…' : 'Yes, delete' }), _jsx("button", { onClick: () => setConfirmDelete(false), className: "flex-1 py-2 rounded-xl bg-stone-100 text-stone-600 text-sm font-semibold", children: "Cancel" })] })] })) }))] }), showReport && (_jsx(ReportModal, { babyId: baby.id, babyName: baby.name, onClose: () => setShowReport(false) }))] }));
}
