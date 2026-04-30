import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect } from 'react';
import FeedSheet from './FeedSheet';
import DiaperSheet from './DiaperSheet';
import SleepSheet from './SleepSheet';
export default function QuickLogSheet({ type, babyId, activeSleep, onClose, onLogged }) {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape')
            onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "sheet-overlay", onClick: onClose }), _jsxs("div", { className: "sheet", children: [type === 'feed' && _jsx(FeedSheet, { babyId: babyId, onClose: onClose, onLogged: onLogged }), type === 'diaper' && _jsx(DiaperSheet, { babyId: babyId, onClose: onClose, onLogged: onLogged }), type === 'sleep' && _jsx(SleepSheet, { babyId: babyId, activeSleep: activeSleep, onClose: onClose, onLogged: onLogged })] })] }));
}
