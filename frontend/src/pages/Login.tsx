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
 *  - Smart error handling: distinguishes network errors, cold starts, auth failures
 *  - Cold-start awareness: shows "server waking up" message for Render free-tier
 */

import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getErrorMessage } from '@/services/api'

export default function Login() {
  const { login } = useAuth()
  const navigate   = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [coldStart, setColdStart] = useState(false)

  // Show cold-start message after 5 seconds of loading
  useEffect(() => {
    if (!loading) {
      setColdStart(false)
      return
    }
    const timer = setTimeout(() => setColdStart(true), 5000)
    return () => clearTimeout(timer)
  }, [loading])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    setColdStart(false)
    try {
      const profile = await login(email.trim(), password)
      const destination = profile.role === 'student' ? '/student' : profile.role === 'admin' ? '/admin' : '/teacher'
      navigate(destination, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'login'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-950 bg-cover bg-center"
      style={{ backgroundImage: 'url(/lab-bg.jpg)' }}
    >
      {/* ── Dark Overlay to maintain glassmorphism contrast ── */}
      <div className="absolute inset-0 bg-slate-950/80 mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/90" />

      {/* ── Animated gradient orbs ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none mix-blend-screen">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-30 blur-3xl animate-pulse"
             style={{ background: 'radial-gradient(circle, #7c3aed, #4f46e5)' }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse"
             style={{ background: 'radial-gradient(circle, #0891b2, #0e7490)', animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full opacity-10 blur-3xl animate-pulse"
             style={{ background: 'radial-gradient(circle, #16a34a, #15803d)', animationDelay: '2s' }} />
      </div>

      {/* ── Login card ── */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="rounded-xl border border-slate-200 bg-white shadow-xl p-8">

          {/* Logo + heading */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-4 bg-slate-900 text-white">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Virtual Science Lab
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Loreto High School
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700" htmlFor="email">
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
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 text-sm shadow-sm outline-none transition-all focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700" htmlFor="password">
                  Password
                </label>
                <Link to="#" className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 text-sm shadow-sm outline-none transition-all focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20"
              />
            </div>

            {/* Cold-start awareness banner */}
            {loading && coldStart && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 flex items-center gap-3">
                <svg className="w-5 h-5 shrink-0 animate-spin text-amber-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <span>Server is waking up from sleep mode — this may take up to a minute on first use. Please wait…</span>
              </div>
            )}

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full rounded-md py-2 px-4 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  {coldStart ? 'Connecting to server…' : 'Signing in…'}
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          {/* Register link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              New student?{' '}
              <Link to="/register" className="font-semibold text-slate-900 hover:underline transition-all">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
