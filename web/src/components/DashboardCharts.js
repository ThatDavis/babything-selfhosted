import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '../lib/api';
import { useUnits } from '../contexts/UnitsContext';
import { displayWeight } from '../lib/units';
function dayLabel(iso) {
    return new Date(iso).toLocaleDateString([], { weekday: 'short' });
}
export default function DashboardCharts({ babyId }) {
    const [stats, setStats] = useState(null);
    const { unitSystem } = useUnits();
    useEffect(() => {
        api.stats.get(babyId).then(setStats);
    }, [babyId]);
    if (!stats)
        return _jsx("div", { className: "py-8 text-center text-stone-400 text-sm", children: "Loading charts\u2026" });
    // Feed timeline — hourly buckets for last 24h
    const feedBuckets = {};
    for (let h = 0; h < 24; h++)
        feedBuckets[h] = 0;
    stats.feedings24h.forEach(f => { feedBuckets[new Date(f.startedAt).getHours()]++; });
    const feedData = Object.entries(feedBuckets).map(([h, count]) => ({ hour: `${h}:00`, count }));
    // Diaper daily counts for last 7 days
    const diaperBuckets = {};
    for (let d = 6; d >= 0; d--) {
        const day = new Date();
        day.setDate(day.getDate() - d);
        diaperBuckets[day.toDateString()] = 0;
    }
    stats.diapers7d.forEach(d => { const k = new Date(d.occurredAt).toDateString(); if (k in diaperBuckets)
        diaperBuckets[k]++; });
    const diaperData = Object.entries(diaperBuckets).map(([d, count]) => ({ day: dayLabel(new Date(d).toISOString()), count }));
    // Sleep hours per day for last 7 days
    const sleepHours = {};
    for (let d = 6; d >= 0; d--) {
        const day = new Date();
        day.setDate(day.getDate() - d);
        sleepHours[day.toDateString()] = 0;
    }
    stats.sleep7d.forEach(s => {
        if (!s.endedAt)
            return;
        const hours = (new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 3600000;
        const k = new Date(s.startedAt).toDateString();
        if (k in sleepHours)
            sleepHours[k] = +(sleepHours[k] + hours).toFixed(1);
    });
    const sleepData = Object.entries(sleepHours).map(([d, hours]) => ({ day: dayLabel(new Date(d).toISOString()), hours }));
    // Weight trend
    const weightUnit = unitSystem === 'imperial' ? 'lbs' : 'kg';
    const weightData = stats.growthAll
        .filter(g => g.weight !== null)
        .map(g => {
        const val = unitSystem === 'imperial'
            ? +(g.weight / 453.592).toFixed(2)
            : +(g.weight / 1000).toFixed(2);
        return { date: new Date(g.measuredAt).toLocaleDateString([], { month: 'short', day: 'numeric' }), [weightUnit]: val };
    });
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(ChartCard, { title: "Feeds \u2014 last 24h", children: stats.feedings24h.length === 0
                    ? _jsx(Empty, {})
                    : _jsx(ResponsiveContainer, { width: "100%", height: 140, children: _jsxs(BarChart, { data: feedData, margin: { top: 4, right: 4, left: -20, bottom: 0 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#f0f0f0" }), _jsx(XAxis, { dataKey: "hour", tick: { fontSize: 10 }, interval: 3 }), _jsx(YAxis, { tick: { fontSize: 10 }, allowDecimals: false }), _jsx(Tooltip, {}), _jsx(Bar, { dataKey: "count", fill: "#f87c72", radius: [4, 4, 0, 0] })] }) }) }), _jsx(ChartCard, { title: "Diapers \u2014 last 7 days", children: stats.diapers7d.length === 0
                    ? _jsx(Empty, {})
                    : _jsx(ResponsiveContainer, { width: "100%", height: 140, children: _jsxs(BarChart, { data: diaperData, margin: { top: 4, right: 4, left: -20, bottom: 0 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#f0f0f0" }), _jsx(XAxis, { dataKey: "day", tick: { fontSize: 11 } }), _jsx(YAxis, { tick: { fontSize: 10 }, allowDecimals: false }), _jsx(Tooltip, {}), _jsx(Bar, { dataKey: "count", fill: "#2dd4bf", radius: [4, 4, 0, 0] })] }) }) }), _jsx(ChartCard, { title: "Sleep hours \u2014 last 7 days", children: stats.sleep7d.length === 0
                    ? _jsx(Empty, {})
                    : _jsx(ResponsiveContainer, { width: "100%", height: 140, children: _jsxs(BarChart, { data: sleepData, margin: { top: 4, right: 4, left: -20, bottom: 0 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#f0f0f0" }), _jsx(XAxis, { dataKey: "day", tick: { fontSize: 11 } }), _jsx(YAxis, { tick: { fontSize: 10 } }), _jsx(Tooltip, { formatter: (v) => [`${v}h`, 'Sleep'] }), _jsx(Bar, { dataKey: "hours", fill: "#818cf8", radius: [4, 4, 0, 0] })] }) }) }), weightData.length > 0 && (_jsx(ChartCard, { title: `Weight trend (${weightUnit})`, children: _jsx(ResponsiveContainer, { width: "100%", height: 140, children: _jsxs(LineChart, { data: weightData, margin: { top: 4, right: 4, left: -20, bottom: 0 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#f0f0f0" }), _jsx(XAxis, { dataKey: "date", tick: { fontSize: 10 } }), _jsx(YAxis, { tick: { fontSize: 10 }, domain: ['auto', 'auto'] }), _jsx(Tooltip, { formatter: (v) => [displayWeight(unitSystem === 'imperial' ? v * 453.592 : v * 1000, unitSystem), 'Weight'] }), _jsx(Line, { type: "monotone", dataKey: weightUnit, stroke: "#f87c72", strokeWidth: 2, dot: { r: 4, fill: '#f87c72' } })] }) }) }))] }));
}
function ChartCard({ title, children }) {
    return (_jsxs("div", { className: "card", children: [_jsx("p", { className: "text-sm font-semibold text-stone-500 mb-3", children: title }), children] }));
}
function Empty() {
    return _jsx("p", { className: "text-xs text-stone-400 text-center py-4", children: "No data yet" });
}
