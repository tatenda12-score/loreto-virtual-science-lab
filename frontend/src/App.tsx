/**
 * src/App.tsx
 * -----------
 * Root application component.
 *
 * Routing strategy
 * ----------------
 *   /           → redirect based on auth state
 *   /login      → public (redirects away if already logged in)
 *   /student    → protected (student role)
 *   /teacher    → protected (teacher | admin role)
 *   *           → fallback redirect to /login
 *
 * The AuthProvider is mounted here so all routes have access to
 * useAuth() without additional wrapping.
 */

import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import Login            from '@/pages/Login'
import StudentDashboard from '@/pages/StudentDashboard'
import TeacherDashboard from '@/pages/TeacherDashboard'

// ── Loading spinner ──────────────────────────────────────────────────────────
function FullPageSpinner() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
        <p className="text-slate-400 text-sm">Loading Virtual Science Lab…</p>
      </div>
    </div>
  )
}

// ── Protected route — redirects unauthenticated or unauthorized users ───────
interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: Array<'student' | 'teacher' | 'admin'>
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageSpinner />
  if (!user)   return <Navigate to="/login" state={{ from: location }} replace />

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Role mismatch: redirect user to their authorized home dashboard
    const dest = user.role === 'student' ? '/student' : '/teacher'
    return <Navigate to={dest} replace />
  }

  return <>{children}</>
}

// ── Auth route — redirects away if already logged in ─────────────────────────
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) return <FullPageSpinner />
  if (user) {
    // Role-based redirect from login page
    const dest = user.role === 'student' ? '/student' : '/teacher'
    return <Navigate to={dest} replace />
  }
  return <>{children}</>
}

// ── Root redirect — determine where / should send the user ───────────────────
function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (!user)   return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'student' ? '/student' : '/teacher'} replace />
}

// ── App routes (inside AuthProvider) ─────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={
          <AuthRoute>
            <Login />
          </AuthRoute>
        }
      />

      {/* Protected — student only */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      {/* Protected — teacher / admin */}
      <Route
        path="/teacher"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />

      {/* Root → smart redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

// ── Root export ───────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
