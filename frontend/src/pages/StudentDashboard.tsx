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
import { SimulationRegistry } from '@/components/experiments/SimulationRegistry'

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
  draft:     { label: 'Draft',     cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  submitted: { label: 'Submitted', cls: 'bg-amber-50  text-amber-700  border-amber-200' },
  graded:    { label: 'Graded',    cls: 'bg-green-50  text-green-700  border-green-200' },
}

const DIFF_BADGE: Record<string, string> = {
  Beginner:     'bg-green-50 text-green-700',
  Intermediate: 'bg-amber-50 text-amber-700',
  Advanced:     'bg-red-50   text-red-700',
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
      className={`fixed bottom-6 right-6 z-[9999] max-w-sm rounded-lg border px-5 py-4 shadow-lg flex items-start gap-3 animate-in slide-in-from-bottom-4 bg-white ${
        type === 'success'
          ? 'border-green-200 text-green-800'
          : 'border-red-200 text-red-800'
      }`}
    >
      <span className="text-xl shrink-0">{type === 'success' ? '🎉' : '❌'}</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-900">{type === 'success' ? 'Submission received!' : 'Error'}</p>
        <p className="text-xs text-slate-600 mt-0.5">{message}</p>
      </div>
      <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg leading-none shrink-0">×</button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-900">{experiment.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{experiment.subject} · {experiment.difficulty}</p>
          </div>
          <button id="close-generic-modal" onClick={onClose}
                  className="text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none">×</button>
        </div>
        <p className="text-sm text-slate-600 mb-4">{experiment.description}</p>

        {experiment.instructions && experiment.instructions.length > 0 && (
          <div className="mb-4 rounded-md bg-slate-50 border border-slate-100 p-3 max-h-36 overflow-y-auto">
            <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wide">Steps</p>
            {experiment.instructions.map((step: Record<string, unknown>, i: number) => (
              <p key={i} className="text-xs text-slate-700 mb-1">
                <span className="text-blue-600 font-medium">{i + 1}.</span>{' '}
                {String(step['action'] ?? '')}
              </p>
            ))}
          </div>
        )}

        <div className="mb-4">
          <label className="text-xs text-slate-700 font-medium block mb-1.5">
            Recorded Observations (JSON)
          </label>
          <textarea
            id="generic-observations-input"
            rows={4}
            value={obsInput}
            onChange={(e) => setObsInput(e.target.value)}
            placeholder='{"measurement": 0.0}'
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 font-mono placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none shadow-sm"
          />
          {submitError && <p className="mt-1.5 text-xs text-red-600">{submitError}</p>}
        </div>

        <div className="flex gap-3">
          <button id="cancel-generic-submit" onClick={onClose}
                  className="flex-1 rounded-md py-2 text-sm border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
            Cancel
          </button>
          <button id="confirm-generic-submit" onClick={handleSubmit} disabled={submitting}
                  className="flex-1 rounded-md py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm">
            {submitting ? 'Submitting...' : 'Submit Lab Report'}
          </button>
        </div>
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
  }

  function closeModal() {
    setActiveExp(null)
  }

  // ── On submission success ─────────────────────────────────────────────────
  function handleSimulationSuccess(score: number | null) {
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
      message: sub.automatic_score !== null
        ? `Submitted! Auto-score: ${sub.automatic_score}/100`
        : 'Submission received!',
      type: 'success',
    })
  }

  // ── Derived stats ─────────────────────────────────────────────────────────
  const gradedSubs = submissions.filter((s) => s.status === 'graded')
  const avgScore   = gradedSubs.length
    ? Math.round(gradedSubs.reduce((a, s) => a + (s.automatic_score ?? 0), 0) / gradedSubs.length)
    : null

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* ── Toast ── */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* ── Modals ── */}
      {activeExp && (() => {
        const SimulationComponent = SimulationRegistry[activeExp.simulation_type]
        if (SimulationComponent) {
          return (
            <SimulationComponent
              experiment={activeExp}
              onClose={closeModal}
              onSuccess={handleSimulationSuccess}
            />
          )
        }
        return (
          <GenericSubmitModal
            experiment={activeExp}
            onClose={closeModal}
            onSuccess={handleGenericSuccess}
          />
        )
      })()}

      {/* ── Top nav ── */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md flex items-center justify-center text-sm bg-slate-900 text-white">🔬</div>
            <span className="font-semibold text-slate-900">Virtual Science Lab</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600 hidden sm:block">{user?.email}</span>
            <button id="student-logout" onClick={logout}
                    className="text-xs px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* ── Welcome banner ── */}
        <div className="rounded-xl p-6 bg-white border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-slate-500 text-sm mb-1">Student Dashboard</p>
              <h1 className="text-2xl font-bold text-slate-900">{user?.full_name ?? 'Student'}</h1>
              <p className="text-slate-600 text-sm mt-0.5">Class: {user?.class_level ?? '—'}</p>
            </div>
            
            <div className="flex gap-4 flex-wrap">
              {[
                { value: experiments.length, label: 'Available',   color: 'text-slate-900'       },
                { value: submissions.length, label: 'Submissions', color: 'text-slate-900'       },
                { value: gradedSubs.length,  label: 'Graded',      color: 'text-slate-900'       },
                {
                  value: avgScore !== null ? `${avgScore}%` : '—',
                  label: 'Avg Score',
                  color: avgScore !== null && avgScore >= 70 ? 'text-green-600' : 'text-amber-600',
                },
              ].map(({ value, label, color }) => (
                <div key={label} className="min-w-[90px]">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wide font-medium">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Experiments grid ── */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Available Experiments</h2>
          {loadingExp ? (
            <div className="text-slate-500 text-sm">Loading experiments...</div>
          ) : experiments.length === 0 ? (
            <div className="text-slate-500 text-sm">No experiments available yet.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {experiments.map((exp) => {
                const isInteractive = SimulationRegistry[exp.simulation_type] !== undefined;
                return (
                  <div
                    key={exp.id}
                    className="rounded-xl border border-slate-200 bg-white overflow-hidden hover:shadow-md transition-shadow group cursor-pointer relative flex flex-col"
                    onClick={() => openExperiment(exp)}
                  >
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-2xl">{SUBJECT_ICONS[exp.subject] ?? '🔬'}</span>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFF_BADGE[exp.difficulty] ?? ''}`}>
                            {exp.difficulty}
                          </span>
                          {isInteractive && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
                              Interactive
                            </span>
                          )}
                        </div>
                      </div>
                      <h3 className="font-semibold text-slate-900 text-sm leading-snug mb-1 group-hover:text-blue-600 transition-colors">
                        {exp.title}
                      </h3>
                      {exp.topic && (
                        <p className="text-xs text-slate-500 mb-2 font-medium">{exp.topic}</p>
                      )}
                      <p className="text-xs text-slate-600 mb-4 line-clamp-2 flex-1">{exp.description}</p>
                      <button
                        id={`launch-exp-${exp.id}`}
                        className={`w-full rounded-md py-1.5 text-xs font-semibold transition-colors mt-auto ${
                          isInteractive
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-sm'
                        }`}
                      >
                        {isInteractive ? 'Launch Simulation →' : 'Launch Experiment →'}
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
            <h2 className="text-lg font-semibold text-slate-900">My Submissions</h2>
            <button
              onClick={refreshSubmissions}
              className="text-xs px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm bg-white"
            >
              ↻ Refresh
            </button>
          </div>

          {loadingSub ? (
            <div className="text-slate-500 text-sm">Loading submissions...</div>
          ) : submissions.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 text-sm shadow-sm">
              No submissions yet. Launch an experiment above to get started.
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Experiment</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Score</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell font-medium">Feedback</th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {submissions.map((sub) => {
                    const badge = STATUS_BADGE[sub.status]
                    const exp   = experiments.find((e) => e.id === sub.experiment_id)
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-900 font-medium">
                          {exp?.title ?? `Experiment #${sub.experiment_id}`}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium">
                          {sub.automatic_score !== null
                            ? <span className={sub.automatic_score >= 70 ? 'text-green-600' : 'text-amber-600'}>
                                {sub.automatic_score}/100
                              </span>
                            : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-600 hidden md:table-cell max-w-xs truncate">
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
