import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Bookmarks from './pages/Bookmarks'
import Categories from './pages/Categories'
import Tags from './pages/Tags'
import Tokens from './pages/Tokens'
import ChromeExt from './pages/ChromeExt'
import IOSGuide from './pages/iOSGuide'
import HarmonyOSGuide from './pages/HarmonyOSGuide'
import Settings from './pages/Settings'
import Calendars from './pages/Calendars'
import Contacts from './pages/Contacts'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/bookmarks" element={<Bookmarks />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/tags" element={<Tags />} />
        <Route path="/tokens" element={<Tokens />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/chrome-ext" element={<ChromeExt />} />
        <Route path="/ios-guide" element={<IOSGuide />} />
        <Route path="/harmonyos-guide" element={<HarmonyOSGuide />} />
        <Route path="/calendars" element={<Calendars />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
