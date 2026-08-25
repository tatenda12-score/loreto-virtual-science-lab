/**
 * src/App.tsx
 * -----------
 * Root application component.
 *
 * Routing strategy
 * ----------------
 *   /           → redirect based on auth state
 *   /login      → public (redirects away if already logged in)
 *   /register   → public (redirects away if already logged in)
 *   /student    → protected (student role)
 *   /teacher    → protected (teacher role only)
 *   /admin      → protected (admin role only)
 *   *           → fallback redirect to /login
 *
 * The AuthProvider is mounted here so all routes have access to
 * useAuth() without additional wrapping.
 */

import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import Login            from '@/pages/Login'
import Register         from '@/pages/Register'
import StudentDashboard from '@/pages/StudentDashboard'
import TeacherDashboard from '@/pages/TeacherDashboard'
import AdminDashboard   from '@/pages/AdminDashboard'

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
    const dest = user.role === 'student' ? '/student' : user.role === 'admin' ? '/admin' : '/teacher'
    return <Navigate to={dest} replace />
  }

  return <>{children}</>
}

// ── Auth route — redirects away if already logged in ─────────────────────────
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) return <FullPageSpinner />
  if (user) {
    // Role-based redirect from login/register page
    const dest = user.role === 'student' ? '/student' : user.role === 'admin' ? '/admin' : '/teacher'
    return <Navigate to={dest} replace />
  }
  return <>{children}</>
}

// ── Root redirect — determine where / should send the user ───────────────────
function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (!user)   return <Navigate to="/login" replace />
  const dest = user.role === 'student' ? '/student' : user.role === 'admin' ? '/admin' : '/teacher'
  return <Navigate to={dest} replace />
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

      <Route
        path="/register"
        element={
          <AuthRoute>
            <Register />
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

      {/* Protected — teacher only */}
      <Route
        path="/teacher"
        element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />

      {/* Protected — admin only */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
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
