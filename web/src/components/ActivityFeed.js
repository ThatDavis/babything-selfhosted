import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
function eventIcon(e) {
    if (e.eventType === 'feeding')
        return e.type === 'BREAST' ? '🤱' : '🍼';
    if (e.eventType === 'diaper')
        return '👶';
    return '😴';
}
function eventLabel(e) {
    if (e.eventType === 'feeding') {
        const type = String(e.type);
        if (type === 'BREAST')
            return `Breast · ${e.side ?? ''} ${e.durationMin ? `${e.durationMin}m` : ''}`.trim();
        return `Bottle · ${e.amount ? `${e.amount}ml` : ''} ${e.milkType ?? ''}`.trim();
    }
    if (e.eventType === 'diaper') {
        return `${String(e.type).toLowerCase()} ${e.color ? `· ${e.color}` : ''}`.trim();
    }
    const end = e.endedAt ? new Date(String(e.endedAt)) : null;
    const start = new Date(e.startedAt);
    const dur = end ? Math.round((end.getTime() - start.getTime()) / 60000) : null;
    return `${String(e.type).toLowerCase()} ${dur ? `· ${dur}m` : '· ongoing'}`.trim();
}
function formatTime(dateStr) {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function formatDay(dateStr) {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString())
        return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString())
        return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}
export default function ActivityFeed({ babyId, refresh }) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        setLoading(true);
        api.events.list(babyId)
            .then(setEvents)
            .finally(() => setLoading(false));
    }, [babyId, refresh]);
    if (loading)
        return _jsx("div", { className: "py-6 text-center text-stone-400 text-sm", children: "Loading\u2026" });
    if (events.length === 0)
        return _jsx("div", { className: "py-6 text-center text-stone-400 text-sm", children: "No events logged yet." });
    let lastDay = '';
    return (_jsxs("div", { className: "space-y-1", children: [_jsx("h3", { className: "text-sm font-semibold text-stone-500 mb-2", children: "Recent activity" }), events.map(e => {
                const day = formatDay(e.occurredAt);
                const showDay = day !== lastDay;
                lastDay = day;
                return (_jsxs("div", { children: [showDay && _jsx("p", { className: "text-xs text-stone-400 font-medium pt-2 pb-1", children: day }), _jsxs("div", { className: "flex items-center gap-3 py-2 px-3 rounded-2xl hover:bg-stone-100 transition-colors", children: [_jsx("span", { className: "text-xl w-7 text-center", children: eventIcon(e) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm font-medium capitalize truncate", children: eventLabel(e) }), Boolean(e.notes) && _jsx("p", { className: "text-xs text-stone-400 truncate", children: String(e.notes) })] }), _jsxs("div", { className: "text-right shrink-0", children: [_jsx("p", { className: "text-xs text-stone-400", children: formatTime(e.occurredAt) }), _jsx("p", { className: "text-xs text-stone-300", children: e.user.name })] })] })] }, e.id));
            })] }));
}
