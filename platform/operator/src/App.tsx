import { useState, useEffect, createContext, useContext } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { api, Operator } from './lib/api'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'

interface AuthContextType {
  operator: Operator | null
  setOperator: (op: Operator | null) => void
  logout: () => Promise<void>
  permissions: string[]
}

export const AuthContext = createContext<AuthContextType>({
  operator: null,
  setOperator: () => {},
  logout: async () => {},
  permissions: [],
})

export function useAuth() {
  return useContext(AuthContext)
}

export default function App() {
  const [operator, setOperator] = useState<Operator | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.me()
      .then(data => {
        setOperator(data.operator)
        return api.getPermissions()
      })
      .then(p => setPermissions(p.sections))
      .catch(() => {
        setOperator(null)
        setPermissions([])
      })
      .finally(() => setLoading(false))
  }, [])

  const logout = async () => {
    await api.logout()
    setOperator(null)
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ operator, setOperator, logout, permissions }}>
      <Routes>
        <Route path="/login" element={operator ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/*" element={operator ? <DashboardPage /> : <Navigate to="/login" />} />
      </Routes>
    </AuthContext.Provider>
  )
}
