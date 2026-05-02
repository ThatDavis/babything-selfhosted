import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthContext } from './lib/auth'
import type { User } from './lib/api'
import { api } from './lib/api'
import { connectSocket, disconnectSocket } from './lib/socket'
import { UnitsProvider } from './contexts/UnitsContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import AcceptInvite from './pages/AcceptInvite'
import Setup from './pages/Setup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import AdminSettings from './pages/AdminSettings'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [setupNeeded, setSetupNeeded] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        const { needed } = await api.auth.setup()
        setSetupNeeded(needed)
        if (needed) return

        try {
          const u = await api.auth.me()
          setUser(u)
          connectSocket()
        } catch {
          setUser(null)
        }
      } catch {
        setSetupNeeded(false)
      } finally {
        setLoading(false)
      }
    }
    init()
    return () => { disconnectSocket() }
  }, [])

  function login(u: User) {
    setUser(u)
    setSetupNeeded(false)
    connectSocket()
  }

  function logout() {
    api.auth.logout().catch(() => {})
    setUser(null)
    disconnectSocket()
  }

  const spinner = <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-400 border-t-transparent rounded-full animate-spin" /></div>

  if (loading || setupNeeded === null) return spinner

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <UnitsProvider>
      <BrowserRouter>
        <Routes>
          {setupNeeded ? (
            <Route path="*" element={<Setup />} />
          ) : (
            <>
              <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
              <Route path="/register" element={!user ? <Register /> : <Navigate to="/" replace />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              <Route path="/invite/:token" element={<AcceptInvite />} />
              <Route path="/admin" element={user ? <AdminSettings /> : <Navigate to="/login" replace />} />
              <Route path="/*" element={user ? <Home /> : <Navigate to="/login" replace />} />
            </>
          )}
        </Routes>
      </BrowserRouter>
      </UnitsProvider>
    </AuthContext.Provider>
  )
}
