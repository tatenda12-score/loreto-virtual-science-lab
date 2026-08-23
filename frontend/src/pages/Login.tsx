/**
 * src/pages/Login.tsx
 * -------------------
 * Login page for the Virtual Science Laboratory System.
 *
 * Features
 * --------
 *  - Email + password form with client-side validation
 *  - Submits via the auth context login() which calls the FastAPI backend
 *  - Role-based redirect: admin/teacher → /teacher, student → /student
 *  - Loading state and error display
 *  - Premium glassmorphism UI with animated lab gradient background
 */

import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate   = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const profile = await login(email.trim(), password)
      const destination = profile.role === 'student' ? '/student' : '/teacher'
      navigate(destination, { replace: true })
    } catch {
      setError('Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-950">

      {/* ── Animated gradient orbs ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-30 blur-3xl animate-pulse"
             style={{ background: 'radial-gradient(circle, #7c3aed, #4f46e5)' }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse"
             style={{ background: 'radial-gradient(circle, #0891b2, #0e7490)', animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full opacity-10 blur-3xl animate-pulse"
             style={{ background: 'radial-gradient(circle, #16a34a, #15803d)', animationDelay: '2s' }} />
      </div>

      {/* ── Grid pattern overlay ── */}
      <div className="absolute inset-0 opacity-5"
           style={{
             backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
             backgroundSize: '40px 40px',
           }} />

      {/* ── Login card ── */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-8"
             style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)' }}>

          {/* Logo + heading */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                 style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)' }}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Virtual Science Lab
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Loreto High School — Sign in to continue
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@loreto.edu.ng"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 text-sm outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 text-sm outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full rounded-lg py-2.5 px-4 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: loading
                  ? 'linear-gradient(135deg, #5b21b6, #1e40af)'
                  : 'linear-gradient(135deg, #7c3aed, #2563eb)',
                boxShadow: '0 4px 15px rgba(124, 58, 237, 0.4)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-6 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
            <p className="text-xs text-cyan-400 font-medium mb-1">Demo credentials</p>
            <p className="text-xs text-slate-400">Teacher: <span className="text-slate-300">teacher@loreto.edu.ng</span></p>
            <p className="text-xs text-slate-400">Student: <span className="text-slate-300">student1@loreto.edu.ng</span></p>
            <p className="text-xs text-slate-400">Password: <span className="text-slate-300">Demo123!</span></p>
          </div>
        </div>
      </div>
    </div>
  )
}
