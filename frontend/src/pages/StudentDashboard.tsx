/**
 * src/pages/StudentDashboard.tsx
 * --------------------------------
 * Student dashboard — now with dynamic experiment rendering.
 *
 * Selecting the Ohm's Law experiment opens a full-screen modal containing
 * the interactive OhmsLawSimulation component. Other experiments fall back
 * to the generic JSON-observation modal.
 */

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchExperiments,
  fetchMySubmissions,
  createSubmission,
  type Experiment,
  type Submission,
} from '@/services/api'
import OhmsLawSimulation from '@/components/experiments/OhmsLawSimulation'

// ── Helpers ─────────────────────────────────────────────────────────────────
const SUBJECT_COLORS: Record<string, string> = {
  Physics:   'from-violet-600 to-indigo-600',
  Chemistry: 'from-cyan-500  to-teal-600',
  Biology:   'from-emerald-500 to-green-600',
}

const SUBJECT_ICONS: Record<string, string> = {
  Physics:   '⚡',
  Chemistry: '🧪',
  Biology:   '🌿',
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft:     { label: 'Draft',     cls: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  submitted: { label: 'Submitted', cls: 'bg-amber-500/20  text-amber-300  border-amber-500/30' },
  graded:    { label: 'Graded',    cls: 'bg-green-500/20  text-green-300  border-green-500/30' },
}

const DIFF_BADGE: Record<string, string> = {
  Beginner:     'bg-green-500/20 text-green-300',
  Intermediate: 'bg-amber-500/20 text-amber-300',
  Advanced:     'bg-red-500/20   text-red-300',
}

/** Returns true if the experiment should use the interactive simulation */
function isOhmsLaw(exp: Experiment) {
  return exp.subject === 'Physics' && exp.title.toLowerCase().includes("ohm")
}

// ── Toast component ──────────────────────────────────────────────────────────
function Toast({
  message,
  type = 'success',
  onClose,
}: {
  message: string
  type?: 'success' | 'error'
  onClose: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 4500)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div
      className={`fixed bottom-6 right-6 z-[9999] max-w-sm rounded-xl border px-5 py-4 shadow-2xl flex items-start gap-3 animate-in slide-in-from-bottom-4 ${
        type === 'success'
          ? 'border-green-500/30 bg-slate-900 text-green-300'
          : 'border-red-500/30   bg-slate-900 text-red-300'
      }`}
      style={{ backdropFilter: 'blur(12px)' }}
    >
      <span className="text-xl shrink-0">{type === 'success' ? '🎉' : '❌'}</span>
      <div className="flex-1">
        <p className="text-sm font-semibold">{type === 'success' ? 'Submission received!' : 'Error'}</p>
        <p className="text-xs text-slate-400 mt-0.5">{message}</p>
      </div>
      <button onClick={onClose} className="text-slate-500 hover:text-white text-lg leading-none shrink-0">×</button>
    </div>
  )
}

// ── Experiment Modal (generic JSON fallback) ─────────────────────────────────
function GenericSubmitModal({
  experiment,
  onClose,
  onSuccess,
}: {
  experiment: Experiment
  onClose: () => void
  onSuccess: (sub: Submission) => void
}) {
  const [obsInput,    setObsInput]    = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError(null)
    try {
      let obs: Record<string, unknown> = {}
      if (obsInput.trim()) obs = JSON.parse(obsInput)
      const newSub = await createSubmission(experiment.id, obs)
      onSuccess(newSub)
    } catch {
      setSubmitError('Failed to submit. Check your JSON format or try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-white">{experiment.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{experiment.subject} · {experiment.difficulty}</p>
          </div>
          <button id="close-generic-modal" onClick={onClose}
                  className="text-slate-400 hover:text-white transition-colors text-xl leading-none">×</button>
        </div>
        <p className="text-sm text-slate-300 mb-4">{experiment.description}</p>

        {experiment.instructions && experiment.instructions.length > 0 && (
          <div className="mb-4 rounded-lg bg-slate-800 p-3 max-h-36 overflow-y-auto">
            <p className="text-xs text-slate-400 font-medium mb-2 uppercase tracking-wide">Steps</p>
            {experiment.instructions.map((step: Record<string, unknown>, i: number) => (
              <p key={i} className="text-xs text-slate-300 mb-1">
                <span className="text-violet-400 font-medium">{i + 1}.</span>{' '}
                {String(step['action'] ?? '')}
              </p>
            ))}
          </div>
        )}

        <div className="mb-4">
          <label className="text-xs text-slate-400 font-medium block mb-1.5">
            Recorded Observations (JSON)
          </label>
          <textarea
            id="generic-observations-input"
            rows={4}
            value={obsInput}
            onChange={(e) => setObsInput(e.target.value)}
            placeholder='{"measurement": 0.0}'
            className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white font-mono placeholder-slate-600 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 resize-none"
          />
          {submitError && <p className="mt-1.5 text-xs text-red-400">{submitError}</p>}
        </div>

        <div className="flex gap-3">
          <button id="cancel-generic-submit" onClick={onClose}
                  className="flex-1 rounded-lg py-2 text-sm border border-white/10 text-slate-300 hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <button id="confirm-generic-submit" onClick={handleSubmit} disabled={submitting}
                  className="flex-1 rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-60 transition-all"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}>
            {submitting ? 'Submitting…' : 'Submit Lab Report'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Ohm's Law full-screen modal ───────────────────────────────────────────────
function OhmsLawModal({
  experiment,
  onClose,
  onSuccess,
}: {
  experiment: Experiment
  onClose: () => void
  onSuccess: (score: number | null) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col"
         style={{ background: 'rgba(2,6,23,0.95)', backdropFilter: 'blur(16px)' }}>
      {/* Modal header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
               style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}>⚡</div>
          <div>
            <h2 className="text-base font-bold text-white">{experiment.title}</h2>
            <p className="text-xs text-slate-400">{experiment.subject} · {experiment.difficulty} · Interactive Simulation</p>
          </div>
        </div>
        <button
          id="close-ohms-modal"
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 border border-white/10 text-slate-300 hover:bg-white/5 transition-colors text-sm"
        >
          ✕ Close
        </button>
      </div>

      {/* Simulation workspace */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Instructions banner */}
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 mb-5">
          <p className="text-xs text-violet-300 font-medium mb-1">📋 Lab Instructions</p>
          <p className="text-xs text-slate-400">{experiment.description}</p>
        </div>

        <OhmsLawSimulation
          experimentId={experiment.id}
          onSubmitSuccess={(score) => {
            onSuccess(score)
            // Don't close modal immediately — let student see feedback
          }}
        />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Dashboard
// ═══════════════════════════════════════════════════════════════════════════════
export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loadingExp,  setLoadingExp]  = useState(true)
  const [loadingSub,  setLoadingSub]  = useState(true)

  // Modal state
  const [activeExp,   setActiveExp]   = useState<Experiment | null>(null)
  const [modalType,   setModalType]   = useState<'ohms' | 'generic' | null>(null)

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // ── Guards ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (user && user.role !== 'student') navigate('/teacher', { replace: true })
  }, [user, navigate])

  // ── Data fetching ─────────────────────────────────────────────────────────
  const refreshSubmissions = useCallback(() => {
    setLoadingSub(true)
    fetchMySubmissions()
      .then(setSubmissions)
      .finally(() => setLoadingSub(false))
  }, [])

  useEffect(() => {
    fetchExperiments()
      .then(setExperiments)
      .finally(() => setLoadingExp(false))

    refreshSubmissions()
  }, [refreshSubmissions])

  // ── Open experiment ───────────────────────────────────────────────────────
  function openExperiment(exp: Experiment) {
    setActiveExp(exp)
    setModalType(isOhmsLaw(exp) ? 'ohms' : 'generic')
  }

  function closeModal() {
    setActiveExp(null)
    setModalType(null)
  }

  // ── On submission success ─────────────────────────────────────────────────
  function handleOhmsSuccess(score: number | null) {
    refreshSubmissions()
    setToast({
      message: score !== null
        ? `Auto-graded score: ${score}/100. Great work!`
        : 'Submission received. Awaiting grading.',
      type: 'success',
    })
  }

  function handleGenericSuccess(sub: Submission) {
    setSubmissions((prev) => [sub, ...prev])
    closeModal()
    setToast({
      message: sub.calculated_score !== null
        ? `Submitted! Auto-score: ${sub.calculated_score}/100`
        : 'Submission received!',
      type: 'success',
    })
  }

  // ── Derived stats ─────────────────────────────────────────────────────────
  const gradedSubs = submissions.filter((s) => s.status === 'graded')
  const avgScore   = gradedSubs.length
    ? Math.round(gradedSubs.reduce((a, s) => a + (s.calculated_score ?? 0), 0) / gradedSubs.length)
    : null

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* ── Toast ── */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* ── Modals ── */}
      {activeExp && modalType === 'ohms' && (
        <OhmsLawModal
          experiment={activeExp}
          onClose={closeModal}
          onSuccess={handleOhmsSuccess}
        />
      )}
      {activeExp && modalType === 'generic' && (
        <GenericSubmitModal
          experiment={activeExp}
          onClose={closeModal}
          onSuccess={handleGenericSuccess}
        />
      )}

      {/* ── Top nav ── */}
      <nav className="border-b border-white/5 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                 style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)' }}>🔬</div>
            <span className="font-semibold text-white">Virtual Science Lab</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400 hidden sm:block">{user?.email}</span>
            <button id="student-logout" onClick={logout}
                    className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* ── Welcome banner ── */}
        <div className="rounded-2xl p-6 relative overflow-hidden"
             style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #0c1445 50%, #041822 100%)' }}>
          <div className="absolute inset-0 opacity-20"
               style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #7c3aed 0%, transparent 60%)' }} />
          <div className="relative z-10">
            <p className="text-slate-400 text-sm mb-1">Welcome back,</p>
            <h1 className="text-2xl font-bold text-white">{user?.full_name ?? 'Student'}</h1>
            <p className="text-slate-400 text-sm mt-0.5">Class: {user?.class_level ?? '—'}</p>
            <div className="flex gap-4 mt-5 flex-wrap">
              {[
                { value: experiments.length, label: 'Available',   color: 'text-white'       },
                { value: submissions.length, label: 'Submissions', color: 'text-white'       },
                { value: gradedSubs.length,  label: 'Graded',      color: 'text-white'       },
                {
                  value: avgScore !== null ? `${avgScore}%` : '—',
                  label: 'Avg Score',
                  color: avgScore !== null && avgScore >= 70 ? 'text-emerald-400' : 'text-amber-400',
                },
              ].map(({ value, label, color }) => (
                <div key={label} className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 min-w-[90px]">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Experiments grid ── */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Available Experiments</h2>
          {loadingExp ? (
            <div className="text-slate-400 text-sm">Loading experiments…</div>
          ) : experiments.length === 0 ? (
            <div className="text-slate-500 text-sm">No experiments available yet.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {experiments.map((exp) => {
                const ohms = isOhmsLaw(exp)
                return (
                  <div
                    key={exp.id}
                    className="rounded-2xl border border-white/10 bg-slate-900 overflow-hidden hover:border-white/20 transition-all group cursor-pointer relative"
                    onClick={() => openExperiment(exp)}
                  >
                    {/* Interactive badge */}
                    {ohms && (
                      <div className="absolute top-3 right-3 z-10 text-xs px-2 py-0.5 rounded-full font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        ⚡ Interactive
                      </div>
                    )}
                    <div className={`h-1.5 w-full bg-gradient-to-r ${SUBJECT_COLORS[exp.subject] ?? 'from-slate-600 to-slate-700'}`} />
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-2xl">{SUBJECT_ICONS[exp.subject] ?? '🔬'}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFF_BADGE[exp.difficulty] ?? ''}`}>
                          {exp.difficulty}
                        </span>
                      </div>
                      <h3 className="font-semibold text-white text-sm leading-snug mb-1 group-hover:text-violet-300 transition-colors">
                        {exp.title}
                      </h3>
                      <p className="text-xs text-slate-400 mb-4 line-clamp-2">{exp.description}</p>
                      <button
                        id={`launch-exp-${exp.id}`}
                        className={`w-full rounded-lg py-1.5 text-xs font-medium transition-colors ${
                          ohms
                            ? 'border border-violet-500/30 text-violet-300 hover:bg-violet-500/10'
                            : 'border border-white/10 text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        {ohms ? '⚡ Launch Simulation →' : 'Launch Experiment →'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Submissions table ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">My Submissions</h2>
            <button
              onClick={refreshSubmissions}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 transition-colors"
            >
              ↻ Refresh
            </button>
          </div>

          {loadingSub ? (
            <div className="text-slate-400 text-sm">Loading submissions…</div>
          ) : submissions.length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-slate-900 p-8 text-center text-slate-500 text-sm">
              No submissions yet. Launch an experiment above to get started.
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Experiment</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Score</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Feedback</th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-slate-950">
                  {submissions.map((sub) => {
                    const badge = STATUS_BADGE[sub.status]
                    const exp   = experiments.find((e) => e.id === sub.experiment_id)
                    return (
                      <tr key={sub.id} className="hover:bg-white/2 transition-colors">
                        <td className="px-4 py-3 text-white font-medium">
                          {exp?.title ?? `Experiment #${sub.experiment_id}`}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {sub.calculated_score !== null
                            ? <span className={sub.calculated_score >= 70 ? 'text-green-400' : 'text-amber-400'}>
                                {sub.calculated_score}/100
                              </span>
                            : <span className="text-slate-500">—</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-400 hidden md:table-cell max-w-xs truncate">
                          {sub.teacher_feedback ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 hidden lg:table-cell text-xs">
                          {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
