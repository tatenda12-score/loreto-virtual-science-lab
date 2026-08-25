import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { registerStudent } from '@/services/api'
import { AxiosError } from 'axios'

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

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return 'Password must be at least 8 characters long.'
    if (!/[A-Z]/.test(pwd)) return 'Password must contain at least one uppercase letter.'
    if (!/\d/.test(pwd)) return 'Password must contain at least one number.'
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
      if (err instanceof AxiosError && err.response) {
        if (err.response.status === 409 || err.response.data?.detail?.includes('already registered')) {
          setError('This email is already registered.')
        } else if (typeof err.response.data?.detail === 'string') {
          setError(err.response.data.detail)
        } else if (Array.isArray(err.response.data?.detail)) {
           setError(err.response.data.detail[0]?.msg || 'Validation error')
        } else {
          setError('Registration failed. Please try again.')
        }
      } else {
        setError('Unable to connect. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-950 py-12">
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

      {/* ── Register card ── */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {success ? (
          <Card className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-8"
                style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)' }}>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-2 animate-bounce">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Registration Successful!</h2>
              <p className="text-slate-400">Your student account has been created successfully.</p>
              <Button asChild className="w-full mt-6" style={{
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                boxShadow: '0 4px 15px rgba(22, 163, 74, 0.4)'
              }}>
                <Link to="/login">Go to Login</Link>
              </Button>
            </div>
          </Card>
        ) : (
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
                Create Account
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Loreto High School — Student Portal
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-300" htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  required
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 text-sm outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-300" htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@loreto.edu.ng"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 text-sm outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-300" htmlFor="class_level">Class</Label>
                  <select
                    id="class_level"
                    name="class_level"
                    required
                    value={formData.class_level}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white text-sm outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 [&>option]:bg-slate-900"
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
                  <Label className="text-sm font-medium text-slate-300" htmlFor="gender">Gender</Label>
                  <select
                    id="gender"
                    name="gender"
                    required
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white text-sm outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 [&>option]:bg-slate-900"
                  >
                    <option value="" disabled>Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-300" htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 text-sm outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-300" htmlFor="confirm_password">Confirm Password</Label>
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.confirm_password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 text-sm outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg py-2.5 px-4 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed border-0"
                style={{
                  background: loading
                    ? 'linear-gradient(135deg, #5b21b6, #1e40af)'
                    : 'linear-gradient(135deg, #7c3aed, #2563eb)',
                  boxShadow: '0 4px 15px rgba(124, 58, 237, 0.4)',
                  height: 'auto'
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2 py-1">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Creating account…
                  </span>
                ) : <span className="py-1">Sign up</span>}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-400">
                Already have an account?{' '}
                <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
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
