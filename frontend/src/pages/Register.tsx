import { useState, useEffect, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { registerStudent, getErrorMessage } from '@/services/api'

export default function Register() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    class_level: '',
    gender: ''
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
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

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return 'Password must be at least 8 characters long.'
    if (!/[A-Z]/.test(pwd)) return 'Password must contain at least one uppercase letter.'
    if (/\d/.test(pwd) === false) return 'Password must contain at least one number.'
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return 'Password must contain at least one special character.'
    return null
  }

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email) ? null : 'Invalid email format.'
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    
    // Validation
    if (!formData.full_name || !formData.email || !formData.password || !formData.confirm_password || !formData.class_level || !formData.gender) {
      setError('All fields are required.')
      return
    }

    const emailErr = validateEmail(formData.email)
    if (emailErr) {
      setError(emailErr)
      return
    }

    const pwdErr = validatePassword(formData.password)
    if (pwdErr) {
      setError(pwdErr)
      return
    }

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    setColdStart(false)
    try {
      await registerStudent({
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        class_level: formData.class_level,
        gender: formData.gender
      })
      setSuccess(true)
    } catch (err) {
      setError(getErrorMessage(err, 'register'))
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-950 py-12 bg-cover bg-center"
      style={{ backgroundImage: 'url(/lab-bg.jpg)' }}
    >
      {/* ── Dark Overlay to maintain contrast ── */}
      <div className="absolute inset-0 bg-slate-950/80 mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/90" />

      {/* ── Register card ── */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {success ? (
          <Card className="rounded-xl border border-slate-200 bg-white shadow-xl p-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-2 animate-bounce">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Registration Successful!</h2>
              <p className="text-slate-500">Your student account has been created successfully.</p>
              <Button asChild className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white rounded-md shadow-sm">
                <Link to="/login">Go to Login</Link>
              </Button>
            </div>
          </Card>
        ) : (
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
                Create Account
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Loreto High School — Student Portal
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700" htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  required
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 text-sm shadow-sm outline-none transition-all focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700" htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@loreto.edu.ng"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 text-sm shadow-sm outline-none transition-all focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700" htmlFor="class_level">Class</Label>
                  <select
                    id="class_level"
                    name="class_level"
                    required
                    value={formData.class_level}
                    onChange={handleChange}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-slate-900 text-sm shadow-sm outline-none transition-all focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20"
                  >
                    <option value="" disabled>Select Class</option>
                    <option value="JSS1">JSS1</option>
                    <option value="JSS2">JSS2</option>
                    <option value="JSS3">JSS3</option>
                    <option value="SS1">SS1</option>
                    <option value="SS2">SS2</option>
                    <option value="SS3">SS3</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700" htmlFor="gender">Gender</Label>
                  <select
                    id="gender"
                    name="gender"
                    required
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-slate-900 text-sm shadow-sm outline-none transition-all focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20"
                  >
                    <option value="" disabled>Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700" htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 text-sm shadow-sm outline-none transition-all focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700" htmlFor="confirm_password">Confirm Password</Label>
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.confirm_password}
                  onChange={handleChange}
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
                  <span>Server is waking up — this may take up to a minute on first use. Please wait…</span>
                </div>
              )}

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-md py-2 px-4 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm h-auto"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2 py-1">
                    <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    {coldStart ? 'Connecting to server…' : 'Creating account…'}
                  </span>
                ) : <span className="py-1">Sign up</span>}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-slate-900 hover:underline transition-all">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
