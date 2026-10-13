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
import { getErrorMessage, fetchSecurityQuestions, resetPasswordWithSecurityQuestions } from '@/services/api'

export default function Login() {
  const { login } = useAuth()
  const navigate   = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [coldStart, setColdStart] = useState(false)

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [fpEmail, setFpEmail] = useState('')
  const [fpStep, setFpStep] = useState<'email' | 'questions'>('email')
  const [fpQuestions, setFpQuestions] = useState<string[]>([])
  const [fpAnswers, setFpAnswers] = useState<string[]>(['', ''])
  const [fpNewPassword, setFpNewPassword] = useState('')
  const [fpLoading, setFpLoading] = useState(false)
  const [fpError, setFpError] = useState<string | null>(null)
  const [fpSuccess, setFpSuccess] = useState<string | null>(null)

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

  async function handleFindAccount(e: FormEvent) {
    e.preventDefault()
    setFpError(null)
    setFpSuccess(null)
    setFpLoading(true)
    try {
      const res = await fetchSecurityQuestions(fpEmail.trim())
      setFpQuestions(res.questions)
      setFpAnswers(new Array(res.questions.length).fill(''))
      setFpStep('questions')
    } catch (err: any) {
      setFpError(err?.response?.data?.detail || 'Account not found or no security questions configured.')
    } finally {
      setFpLoading(false)
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault()
    setFpError(null)
    setFpSuccess(null)
    if (fpNewPassword.length < 6) {
      setFpError('New password must be at least 6 characters.')
      return
    }
    for (let i = 0; i < fpQuestions.length; i++) {
      if (!fpAnswers[i]?.trim()) {
        setFpError('Please answer all security questions.')
        return
      }
    }
    setFpLoading(true)
    try {
      const res = await resetPasswordWithSecurityQuestions({
        email: fpEmail.trim(),
        answers: fpAnswers.map(a => a.trim()),
        new_password: fpNewPassword,
      })
      setFpSuccess(res.message || 'Password reset successfully! You can now log in.')
      setPassword(fpNewPassword)
      setEmail(fpEmail.trim())
      setTimeout(() => {
        closeForgotModal()
      }, 2000)
    } catch (err: any) {
      setFpError(err?.response?.data?.detail || 'Failed to reset password. Please check your answers.')
    } finally {
      setFpLoading(false)
    }
  }

  function closeForgotModal() {
    setShowForgotModal(false)
    setFpStep('email')
    setFpQuestions([])
    setFpAnswers(['', ''])
    setFpNewPassword('')
    setFpError(null)
    setFpSuccess(null)
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-950 bg-cover bg-center"
      style={{ backgroundImage: 'url(/loreto-school-bg.jpg)' }}
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
      <div className="relative z-10 w-full max-w-md mx-4 perspective-1000">
        <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-8 transform transition-all hover:scale-[1.02] hover:rotate-1 duration-500 relative overflow-hidden">
          {/* 3D highlights */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-black/20 to-transparent"></div>
          <div className="absolute top-0 bottom-0 left-0 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

          {/* Logo + heading */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-4 bg-slate-900 text-white">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-lg">
              Virtual Science Lab
            </h1>
            <p className="text-sm text-slate-300 mt-2 font-bold tracking-wide drop-shadow uppercase">
              Loreto High School
            </p>
            <p className="text-xs text-slate-400 mt-1 font-medium tracking-wider drop-shadow italic">
              Brothers of the Sacred Heart
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-100 drop-shadow-sm" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="text"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin.co.zw or you@loreto.co.zw"
                className="w-full rounded-xl border border-white/20 bg-black/20 px-4 py-3 text-white placeholder-slate-400 text-sm shadow-inner outline-none transition-all focus:border-blue-400 focus:bg-black/40 focus:ring-2 focus:ring-blue-400/50 backdrop-blur-sm"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-100 drop-shadow-sm" htmlFor="password">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setFpEmail(email || '')
                    setShowForgotModal(true)
                  }}
                  className="text-xs font-medium text-blue-300 hover:text-blue-200 transition-colors drop-shadow-sm"
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/20 bg-black/20 px-4 py-3 text-white placeholder-slate-400 text-sm shadow-inner outline-none transition-all focus:border-blue-400 focus:bg-black/40 focus:ring-2 focus:ring-blue-400/50 backdrop-blur-sm"
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
              className="w-full rounded-xl py-3 px-4 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_10px_20px_rgba(37,99,235,0.3)] hover:shadow-[0_15px_25px_rgba(37,99,235,0.5)] transform hover:-translate-y-1 active:translate-y-0"
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
          <div className="mt-6 text-center relative z-10">
            <p className="text-sm text-slate-300 drop-shadow-sm">
              New student?{' '}
              <Link to="/register" className="font-bold text-blue-300 hover:text-blue-200 hover:underline transition-all">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* ── Forgot Password Modal ── */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/20 bg-slate-900/90 p-6 md:p-8 shadow-2xl backdrop-blur-xl text-white">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-lg">
                  🔑
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Reset Password</h2>
                  <p className="text-xs text-slate-400">Answer your security questions to recover access</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeForgotModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Error & Success banners */}
            {fpError && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs">
                {fpError}
              </div>
            )}
            {fpSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-semibold">
                ✓ {fpSuccess}
              </div>
            )}

            {/* Step 1: Enter email */}
            {fpStep === 'email' && (
              <form onSubmit={handleFindAccount} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Account Email Address
                  </label>
                  <input
                    type="text"
                    required
                    value={fpEmail}
                    onChange={(e) => setFpEmail(e.target.value)}
                    placeholder="student@loreto.co.zw or your email"
                    className="w-full rounded-xl border border-white/20 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    We'll look up your account's designated security questions.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeForgotModal}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={fpLoading || !fpEmail.trim()}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white shadow-lg transition-all"
                  >
                    {fpLoading ? 'Finding account…' : 'Continue →'}
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Answer questions & New password */}
            {fpStep === 'questions' && (
              <form onSubmit={handleResetPassword} className="mt-5 space-y-4">
                <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs text-blue-200">
                  Account: <span className="font-semibold text-white">{fpEmail}</span>
                </div>

                {fpQuestions.map((q, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-200">
                      Question {idx + 1}: <span className="text-blue-300 font-normal">{q}</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fpAnswers[idx] || ''}
                      onChange={(e) => {
                        const newAns = [...fpAnswers]
                        newAns[idx] = e.target.value
                        setFpAnswers(newAns)
                      }}
                      placeholder="Your secret answer"
                      className="w-full rounded-xl border border-white/20 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                ))}

                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  <label className="block text-xs font-semibold text-slate-200">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={fpNewPassword}
                    onChange={(e) => setFpNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    className="w-full rounded-xl border border-white/20 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  />
                </div>

                <div className="flex justify-between items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFpStep('email')
                      setFpError(null)
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/10"
                  >
                    ← Back
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={closeForgotModal}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/10"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={fpLoading || !fpNewPassword}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-lg transition-all"
                    >
                      {fpLoading ? 'Resetting…' : 'Reset Password & Sign In'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
