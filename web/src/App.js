import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './lib/auth';
import { api } from './lib/api';
import { connectSocket, disconnectSocket } from './lib/socket';
import { UnitsProvider } from './contexts/UnitsContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import AcceptInvite from './pages/AcceptInvite';
import Setup from './pages/Setup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AdminSettings from './pages/AdminSettings';
export default function App() {
    const [user, setUser] = useState(null);
    const [setupNeeded, setSetupNeeded] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const init = async () => {
            const { needed } = await api.auth.setup();
            setSetupNeeded(needed);
            if (needed) {
                setLoading(false);
                return;
            }
            try {
                const u = await api.auth.me();
                setUser(u);
                connectSocket();
            }
            catch {
                setUser(null);
            }
            finally {
                setLoading(false);
            }
        };
        init();
        return () => { disconnectSocket(); };
    }, []);
    function login(u) {
        setUser(u);
        setSetupNeeded(false);
        connectSocket();
    }
    function logout() {
        api.auth.logout().catch(() => { });
        setUser(null);
        disconnectSocket();
    }
    const spinner = _jsx("div", { className: "min-h-screen flex items-center justify-center", children: _jsx("div", { className: "w-8 h-8 border-4 border-brand-400 border-t-transparent rounded-full animate-spin" }) });
    if (loading || setupNeeded === null)
        return spinner;
    return (_jsx(AuthContext.Provider, { value: { user, login, logout }, children: _jsx(UnitsProvider, { children: _jsx(BrowserRouter, { children: _jsx(Routes, { children: setupNeeded ? (_jsx(Route, { path: "*", element: _jsx(Setup, {}) })) : (_jsxs(_Fragment, { children: [_jsx(Route, { path: "/login", element: !user ? _jsx(Login, {}) : _jsx(Navigate, { to: "/", replace: true }) }), _jsx(Route, { path: "/register", element: !user ? _jsx(Register, {}) : _jsx(Navigate, { to: "/", replace: true }) }), _jsx(Route, { path: "/forgot-password", element: _jsx(ForgotPassword, {}) }), _jsx(Route, { path: "/reset-password/:token", element: _jsx(ResetPassword, {}) }), _jsx(Route, { path: "/invite/:token", element: _jsx(AcceptInvite, {}) }), _jsx(Route, { path: "/admin", element: user ? _jsx(AdminSettings, {}) : _jsx(Navigate, { to: "/login", replace: true }) }), _jsx(Route, { path: "/*", element: user ? _jsx(Home, {}) : _jsx(Navigate, { to: "/login", replace: true }) })] })) }) }) }) }));
}
