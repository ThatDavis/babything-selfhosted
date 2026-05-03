import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import SignupPage from './pages/SignupPage'
import AccountPage from './pages/AccountPage'
import TermsPage from './pages/TermsPage'
import GdprPage from './pages/GdprPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/gdpr" element={<GdprPage />} />
    </Routes>
  )
}
